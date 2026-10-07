# SPDX-License-Identifier: MIT
"""Backup/restore contract tests, including the CLI path (E2 controlled runtime).

A restore is only worth anything if it refuses to write where it should not and
if it re-reads what it wrote. These cover both, plus a real subprocess round trip
through `design-lab ... backup` / `restore`.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
from contextlib import closing
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tempfile
import types
import unittest
import zipfile

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'src'))

from design_lab.runtime.project_backup import (  # noqa: E402
    MANIFEST_NAME, BackupError, create_backup, restore_backup, state_schema_version,
    verify_backup)


def _sha(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _rewrite_manifest(archive, destination, *, drop=()):
    """Re-pack a real archive with keys removed from its manifest.

    Used to make an archive that looks like it came from an older build, rather
    than asserting against a hand-written one that no build ever produced.
    """
    with zipfile.ZipFile(archive) as source:
        manifest = json.loads(source.read(MANIFEST_NAME).decode('utf-8'))
        blobs = [(info.filename, source.read(info.filename))
                 for info in source.infolist() if info.filename != MANIFEST_NAME]
    for key in drop:
        manifest.pop(key, None)
    with zipfile.ZipFile(destination, 'w') as out:
        for name, payload in blobs:
            out.writestr(name, payload)
        out.writestr(MANIFEST_NAME, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return manifest


def _synthetic_archive(destination, members):
    """Write an archive whose manifest lists `members` = {stored name: bytes}."""
    with zipfile.ZipFile(destination, 'w') as out:
        out.writestr(MANIFEST_NAME, json.dumps({
            'schemaVersion': 'design-lab/project-backup/v1',
            'createdAt': '2026-10-06T00:00:00Z', 'designLabVersion': 'test',
            'projectLocalRootName': 'x', 'fileCount': len(members),
            'totalBytes': sum(len(p) for p in members.values()),
            'members': [{'path': name, 'bytes': len(payload),
                         'sha256': _sha(payload)} for name, payload in members.items()],
        }, indent=2) + '\n')
        for name, payload in members.items():
            out.writestr(name, payload)


def _state_root(parent: Path) -> Path:
    local = parent / '.project-local'
    (local / 'projects' / 'p1' / 'assets' / 'versions' / 'v1').mkdir(parents=True)
    (local / 'projects' / 'p1' / 'assets' / 'versions' / 'v1' / 'native.psd').write_bytes(
        b'PSD-bytes-not-a-real-one' * 7)
    (local / 'projects' / 'p1' / 'state-marker.json').write_text(
        json.dumps({'id': 'p1', 'name': 'Backup Probe'}), encoding='utf-8')
    (local / 'task-runtime' / 'service').mkdir(parents=True)
    import sqlite3
    connection = sqlite3.connect(local / 'task-runtime' / 'service' / 'state.db')
    connection.execute('PRAGMA user_version = 7')
    connection.execute('CREATE TABLE marker (id text primary key, name text)')
    connection.execute("INSERT INTO marker VALUES ('p1', 'Backup Probe')")
    connection.commit()
    connection.close()
    return local


class ProjectBackupTests(unittest.TestCase):
    def setUp(self):
        self.base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        self.local = _state_root(self.base)
        self.archive = self.base / 'backup.zip'

    def test_backup_lists_every_state_file_and_verifies(self):
        manifest = create_backup(self.local, self.archive)
        self.assertEqual(manifest['fileCount'], 3)
        self.assertEqual(manifest['schemaVersion'], 'design-lab/project-backup/v1')
        checked = verify_backup(self.archive)
        self.assertEqual(checked['fileCount'], 3)
        self.assertGreater(checked['totalBytes'], 0)

    def test_restore_round_trip_reproduces_every_hash(self):
        create_backup(self.local, self.archive)
        target = self.base / 'restored'
        receipt = restore_backup(self.archive, target)
        self.assertTrue(receipt['verified'])
        self.assertEqual(receipt['restored'], 3)
        with zipfile.ZipFile(self.archive) as archive:
            for entry in verify_backup(self.archive)['members']:
                archived = hashlib.sha256(archive.read(entry['path'])).hexdigest()
                restored = hashlib.sha256(target.joinpath(
                    *entry['path'].split('/')).read_bytes()).hexdigest()
                self.assertEqual(archived, restored, entry['path'])
                if entry['path'] != 'task-runtime/service/state.db':
                    # Every other member is a byte copy of the live file, so the
                    # archive-restored-source chain has to close for it.
                    source = hashlib.sha256(self.local.joinpath(
                        *entry['path'].split('/')).read_bytes()).hexdigest()
                    self.assertEqual(source, restored, entry['path'])
        # The database is deliberately not a byte copy: it comes out of SQLite's
        # backup API, whose header (change counter) differs from the live file.
        # What must survive is the database as an answerable database, so that is
        # what is read back here instead of a hash of bytes that were never equal.
        with closing(sqlite3.connect(target / 'task-runtime/service/state.db')) as conn:
            self.assertEqual(conn.execute('PRAGMA user_version').fetchone()[0], 7)
            self.assertEqual([row[0] for row in conn.execute('SELECT name FROM marker')],
                             ['Backup Probe'])

    def test_wal_commits_are_in_the_database_snapshot(self):
        """Committed-in-WAL rows survive, which a raw file copy would drop.

        The connection is left open across the backup on purpose: SQLite
        checkpoints and removes the WAL when the last connection closes, so a
        test that closed first would pass even with a byte-for-byte copy.
        """
        with closing(sqlite3.connect(self.local / 'task-runtime' / 'service' / 'state.db')) as conn:
            conn.execute('PRAGMA journal_mode=WAL')
            conn.execute("INSERT INTO marker VALUES ('wal', 'Committed in WAL')")
            conn.commit()
            self.assertTrue((self.local / 'task-runtime' / 'service' / 'state.db-wal').is_file(),
                            'the fixture must leave the commit in the WAL, not in state.db')
            create_backup(self.local, self.archive)
        target = self.base / 'wal-restored'
        restore_backup(self.archive, target)
        with closing(sqlite3.connect(target / 'task-runtime' / 'service' / 'state.db')) as restored:
            self.assertEqual(
                restored.execute("SELECT name FROM marker WHERE id='wal'").fetchone(),
                ('Committed in WAL',))
        # The sidecars are folded into the snapshot, not archived beside it: a
        # restored state.db plus an older -wal would replay stale frames over it.
        self.assertFalse((target / 'task-runtime' / 'service' / 'state.db-wal').is_file())
        self.assertFalse((target / 'task-runtime' / 'service' / 'state.db-shm').is_file())

    def test_backup_inside_its_own_members_is_refused(self):
        """An archive written under a member is enumerated as a member of itself."""
        with self.assertRaisesRegex(BackupError, 'outside the backed-up members'):
            create_backup(self.local, self.local / 'projects' / 'backup.zip')

    def test_interrupted_write_leaves_the_previous_archive_byte_for_byte(self):
        from unittest.mock import patch
        from design_lab.runtime import project_backup
        create_backup(self.local, self.archive)
        previous = self.archive.read_bytes()

        def interrupt(*args, **kwargs):
            raise OSError('synthetic interrupted write')

        with patch.object(project_backup, '_database_snapshot', side_effect=interrupt):
            with self.assertRaises(OSError):
                create_backup(self.local, self.archive)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_unsnapshottable_database_produces_no_archive(self):
        broken = _state_root(self.base / 'broken-local')
        (broken / 'task-runtime' / 'service' / 'state.db').write_bytes(b'not a database')
        destination = self.base / 'broken.zip'
        with self.assertRaisesRegex(BackupError, 'cannot be snapshotted'):
            create_backup(broken, destination)
        self.assertFalse(destination.exists(),
                         'a half-built archive is worse than no archive')

    def test_restore_install_failure_rolls_back_previous_files(self):
        from unittest.mock import patch
        from design_lab.runtime import project_backup
        create_backup(self.local, self.archive)
        target = self.base / 'occupied-rollback'
        old = target / 'projects' / 'p1' / 'assets' / 'versions' / 'v1' / 'native.psd'
        old.parent.mkdir(parents=True)
        old.write_bytes(b'previous asset')
        real_replace = os.replace

        def interrupted(source, destination):
            if 'staged' in Path(source).parts and Path(destination).name == 'state.db':
                raise OSError('synthetic interrupted restore')
            return real_replace(source, destination)

        with patch.object(project_backup, 'os', types.SimpleNamespace(replace=interrupted)):
            with self.assertRaisesRegex(OSError, 'interrupted'):
                restore_backup(self.archive, target, force=True)
        self.assertEqual(old.read_bytes(), b'previous asset',
                         'a file that was replaced before the failure must come back')
        self.assertFalse((target / 'projects' / 'p1' / 'state-marker.json').exists(),
                         'a file installed before the failure must be withdrawn')
        self.assertFalse((target / 'task-runtime' / 'service' / 'state.db').exists())

    def test_backslash_member_cannot_escape_the_target(self):
        """PurePosixPath does not split on backslash, so the raw string is checked.

        Measured rather than assumed, in three parts, because the obvious demo
        hides the defect: Python's own zipfile rewrites `\\` to `/` when it stores
        a name, so a hand-built archive cannot carry the escape -- an archive from
        any other tool can. The guard is the only thing refusing it, so the guard
        and the sink are both asserted here, not just the end-to-end refusal.
        """
        from design_lab.runtime.project_backup import _safe_relative
        escaping = 'projects\\..\\..\\escaped.txt'
        with self.assertRaisesRegex(BackupError, 'traversal'):
            _safe_relative(escaping)
        # The sink: had the string been accepted, joining it would leave the root.
        # One posix part containing no '..' is two directories up on Windows.
        root = self.base / 'sink-root'
        joined = root.joinpath(*PurePosixPath(escaping).parts)
        self.assertEqual(len(PurePosixPath(escaping).parts), 1)
        self.assertFalse(joined.resolve().is_relative_to(root.resolve()),
                         'a single accepted part still resolves outside the root')
        create_backup(self.local, self.archive)
        evil = self.base / 'backslash.zip'
        _synthetic_archive(evil, {'projects\\..\\escaped.txt': b'evil'})
        with self.assertRaisesRegex(BackupError, 'traversal'):
            restore_backup(evil, self.base / 'bs-target')
        self.assertFalse((self.base / 'escaped.txt').exists())

    def test_state_schema_version_reads_a_hash_in_the_path(self):
        """A '#' in the runtime root is a URI fragment, not a filename character.

        `f'file:{path}?mode=ro'` truncates there and answers the PRAGMA from some
        other file: measured on this machine it reported version 0 for a database
        whose real version was 7, which would have steered the compatibility gate
        with a wrong number instead of failing.
        """
        local = _state_root(self.base / 'shaped#root')
        self.assertEqual(state_schema_version(local), 7)

    def test_linked_backup_member_is_refused(self):
        try:
            target = self.base / 'linked-member-target'
            target.write_bytes(b'outside the archive')
            link = self.local / 'projects' / 'linked.psd'
            link.symlink_to(target)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f'ENVIRONMENT_FAIL: native symlink creation unavailable: {exc}')
        with self.assertRaisesRegex(BackupError, 'linked backup member refused'):
            create_backup(self.local, self.archive)

    def test_tampered_member_is_refused(self):
        create_backup(self.local, self.archive)
        evil = self.base / 'evil.zip'
        with zipfile.ZipFile(self.archive) as source, zipfile.ZipFile(evil, 'w') as out:
            for item in source.infolist():
                payload = source.read(item.filename)
                if item.filename.endswith('native.psd'):
                    payload = b'tampered'
                out.writestr(item, payload)
        with self.assertRaisesRegex(BackupError, 'hash mismatch'):
            verify_backup(evil)
        with self.assertRaisesRegex(BackupError, 'hash mismatch'):
            restore_backup(evil, self.base / 'never-written')
        self.assertFalse((self.base / 'never-written' / 'projects').exists())

    def test_traversal_member_in_manifest_cannot_escape_the_target(self):
        create_backup(self.local, self.archive)
        evil = self.base / 'traversal.zip'
        with zipfile.ZipFile(evil, 'w') as out:
            out.writestr('backup-manifest.json', json.dumps({
                'schemaVersion': 'design-lab/project-backup/v1',
                'createdAt': '2026-10-06T00:00:00Z', 'designLabVersion': 'test',
                'projectLocalRootName': 'x', 'fileCount': 1, 'totalBytes': 4,
                'members': [{'path': '../escaped.txt', 'bytes': 4,
                             'sha256': hashlib.sha256(b'evil').hexdigest()}],
            }))
            out.writestr('escaped.txt', b'evil')
        with self.assertRaisesRegex(BackupError, 'traversal'):
            restore_backup(evil, self.base / 'target')
        self.assertFalse((self.base / 'escaped.txt').exists())

    def test_non_empty_target_needs_explicit_overwrite(self):
        create_backup(self.local, self.archive)
        target = self.base / 'occupied'
        (target / 'projects').mkdir(parents=True)
        (target / 'projects' / 'existing.json').write_text('{}', encoding='utf-8')
        with self.assertRaisesRegex(BackupError, 'not empty'):
            restore_backup(self.archive, target)
        receipt = restore_backup(self.archive, target, force=True)
        self.assertEqual(receipt['restored'], 3)

    def test_archive_records_the_state_schema_version(self):
        manifest = create_backup(self.local, self.archive)
        self.assertEqual(manifest['stateSchemaVersion'], 7)

    def test_state_schema_mismatch_refuses_restore_unless_overridden(self):
        create_backup(self.local, self.archive)
        with self.assertRaisesRegex(BackupError, 'STATE_SCHEMA_MISMATCH:archive=7:local=8'):
            restore_backup(self.archive, self.base / 'blocked',
                           local_state_schema_version=8)
        receipt = restore_backup(self.archive, self.base / 'allowed',
                                 local_state_schema_version=8, allow_upgrade=True)
        self.assertEqual(receipt['restored'], 3)
        self.assertFalse(receipt['compatibility']['compatible'])

    def test_unreadable_database_reports_no_version_instead_of_passing(self):
        from design_lab.runtime.project_backup import state_schema_version
        broken = self.base / 'broken-local'
        (broken / 'task-runtime' / 'service').mkdir(parents=True)
        (broken / 'task-runtime' / 'service' / 'state.db').write_bytes(b'not a database')
        self.assertIsNone(state_schema_version(broken))


class RelocationTests(unittest.TestCase):
    """Restoring into a different root has to point the index at the moved bytes.

    The 2026-10-06 loss was an index that no longer matched the files; a restore
    that rewrites paths without checking them, or checks them and still claims
    success, recreates that failure in a new shape.
    """

    def setUp(self):
        self.base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        self.local = _state_root(self.base)
        self.archive = self.base / 'backup.zip'
        self.db = self.local / 'task-runtime' / 'service' / 'state.db'

    def _artifact_row(self, stored_path, artifact_id='a1'):
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute('CREATE TABLE IF NOT EXISTS artifact ('
                         'artifact_id TEXT PRIMARY KEY, version_id TEXT, path TEXT NOT NULL,'
                         ' sha256 TEXT, byte_size INTEGER, role TEXT NOT NULL)')
            conn.execute('INSERT INTO artifact (artifact_id, version_id, path, role)'
                         ' VALUES (?,?,?,?)', (artifact_id, 'v1', str(stored_path), 'deliverable'))
            conn.commit()

    def _row_path(self, database):
        with closing(sqlite3.connect(database)) as conn:
            return conn.execute('SELECT path FROM artifact').fetchone()[0]

    def test_relocated_artifact_index_reads_the_restored_bytes(self):
        original = self.local / 'projects/p1/assets/versions/v1/native.psd'
        self._artifact_row(original)
        create_backup(self.local, self.archive)
        target = self.base / 'moved'
        receipt = restore_backup(self.archive, target)
        self.assertEqual(receipt['relocatedArtifactPaths'], 1)
        self.assertEqual(receipt['nativeExecutionRecovery'], 'REPLAN_REQUIRED_AFTER_RELOCATION')
        relocated = Path(self._row_path(target / 'task-runtime/service/state.db'))
        self.assertTrue(relocated.is_relative_to(target), str(relocated))
        self.assertTrue(relocated.is_file(), 'the index must point at a file that exists')
        self.assertEqual(relocated.read_bytes(), original.read_bytes())

    def test_restoring_into_the_original_root_relocates_nothing(self):
        original = self.local / 'projects/p1/assets/versions/v1/native.psd'
        self._artifact_row(original)
        create_backup(self.local, self.archive)
        receipt = restore_backup(self.archive, self.local, force=True)
        self.assertEqual(receipt['relocatedArtifactPaths'], 0)
        self.assertEqual(receipt['nativeExecutionRecovery'], 'UNCHANGED')
        self.assertEqual(Path(self._row_path(self.db)), original)

    def test_relative_artifact_paths_travel_unchanged(self):
        self._artifact_row('projects/p1/assets/versions/v1/native.psd')
        create_backup(self.local, self.archive)
        target = self.base / 'relative'
        receipt = restore_backup(self.archive, target)
        self.assertEqual(receipt['relocatedArtifactPaths'], 0)
        self.assertEqual(self._row_path(target / 'task-runtime/service/state.db'),
                         'projects/p1/assets/versions/v1/native.psd')

    def test_artifact_row_naming_unarchived_bytes_refuses_the_restore(self):
        """A database that indexes a file the archive does not carry is not restorable."""
        loose = self.local / 'task-artifacts' / 'loose.psd'
        loose.parent.mkdir(parents=True)
        loose.write_bytes(b'outside every member')
        self._artifact_row(loose)
        create_backup(self.local, self.archive)
        with self.assertRaisesRegex(BackupError, 'restored artifact is absent'):
            restore_backup(self.archive, self.base / 'moved')

    def test_artifact_row_outside_the_archived_root_refuses_the_restore(self):
        foreign = self.base / 'somewhere-else.psd'
        foreign.write_bytes(b'not under the local root')
        self._artifact_row(foreign)
        create_backup(self.local, self.archive)
        with self.assertRaisesRegex(BackupError, 'outside the archived local root'):
            restore_backup(self.archive, self.base / 'moved')

    def test_legacy_archive_without_a_source_root_refuses_a_cross_root_restore(self):
        """An older archive records no origin, so a moved restore cannot be proven."""
        original = self.local / 'projects/p1/assets/versions/v1/native.psd'
        self._artifact_row(original)
        create_backup(self.local, self.archive)
        legacy = self.base / 'legacy.zip'
        _rewrite_manifest(self.archive, legacy, drop=('sourceLocalRoot',))
        self.assertNotIn('sourceLocalRoot', verify_backup(legacy))
        with self.assertRaisesRegex(BackupError, 'records no source root'):
            restore_backup(legacy, self.base / 'moved')

    def test_legacy_archive_still_restores_where_it_was_made(self):
        original = self.local / 'projects/p1/assets/versions/v1/native.psd'
        self._artifact_row(original)
        create_backup(self.local, self.archive)
        legacy = self.base / 'legacy-local.zip'
        _rewrite_manifest(self.archive, legacy, drop=('sourceLocalRoot',))
        receipt = restore_backup(legacy, self.local, force=True)
        self.assertEqual(receipt['relocatedArtifactPaths'], 0)

    def test_real_image_import_survives_project_relocation(self):
        """The whole product path, not the archive plumbing: import → back up → move."""
        import base64
        import io
        from unittest.mock import patch
        from PIL import Image
        from design_lab.image_assets import ImageAssets
        from design_lab.service import ProjectService
        with patch.dict(os.environ):
            os.environ.pop('PROJECT_LOCAL_ROOT', None)
            owner = self.base / 'source-owner'
            owner.mkdir()
            (owner / 'AGENTS.md').write_text('# synthetic backup fixture', encoding='utf-8')
            service = ProjectService(owner)
            project = service.create_project('Image restore fixture')['id']
            stream = io.BytesIO()
            Image.new('RGB', (12, 8), 'green').save(stream, format='PNG')
            encoded = base64.b64encode(stream.getvalue()).decode()
            ImageAssets(service).import_image(project, encoded, 'backup-image')

            create_backup(owner / '.project-local', self.archive)
            recovered_owner = self.base / 'recovered-owner'
            recovered_owner.mkdir()
            (recovered_owner / 'AGENTS.md').write_text('# synthetic restored fixture',
                                                       encoding='utf-8')
            restore_backup(self.archive, recovered_owner / '.project-local')

            images = ImageAssets(ProjectService(recovered_owner))
            assets = images.list(project)
            self.assertEqual(len(assets), 1)
            self.assertEqual(images.content(project, assets[0]['id'])['content_base64'], encoded)


def _tracked_ddl(table):
    """Pull one CREATE TABLE statement out of the place the product declares it.

    The barrier reads the product's own tables, so the fixtures must create those
    exact tables. Re-declaring columns here would let a test pass against a schema
    the product never writes. Two of them (the host guard, the recovery protocol)
    are declared inside native_tasks.py rather than a .sql file, so both sources
    are searched and an unfound table fails the test instead of being invented.
    """
    sources = sorted((REPO / 'design-lab/schemas/state').glob('*.sql')) + [
        REPO / 'src/design_lab/native_tasks.py']
    for path in sources:
        match = re.search(rf"CREATE TABLE (?:IF NOT EXISTS )?{table}\b.*?\n\s*\);",
                          path.read_text(encoding='utf-8'), re.S)
        if match:
            return match.group(0)
    raise AssertionError(f'{table} is not declared by any tracked schema or DDL string')


ACTIVITY_TABLES = ('asset', 'asset_version', 'artifact', 'asset_writer_lock',
                   'asset_publication', 'attempt_state', 'native_host_guard_v1')


def _activity_root(parent: Path) -> Path:
    """A state root whose database carries the tables production writes through."""
    local = _state_root(parent)
    conn = sqlite3.connect(local / 'task-runtime/service/state.db')
    try:
        conn.execute('CREATE TABLE project (project_id TEXT PRIMARY KEY,'
                     ' display_name TEXT NOT NULL, created_at TEXT NOT NULL)')
        for table in ACTIVITY_TABLES:
            conn.execute(_tracked_ddl(table))
        conn.execute('INSERT INTO project VALUES ("p1","Activity Probe","2026-10-08T00:00:00Z")')
        conn.execute('INSERT INTO asset VALUES ("a1","p1","psd","2026-10-08T00:00:00Z")')
        conn.commit()
    finally:
        conn.close()
    return local


def _insert_artifact(local: Path, stored_path, digest):
    with closing(sqlite3.connect(local / 'task-runtime/service/state.db')) as conn:
        conn.execute('INSERT INTO asset_version (version_id, asset_id, version_no,'
                     ' content_sha256, state, created_at)'
                     ' VALUES ("v1","a1",1,?,"ACTIVE","2026-10-08T00:00:00Z")',
                     (digest or 'sha256:' + 'a' * 64,))
        conn.execute('INSERT INTO artifact (artifact_id, version_id, path, sha256,'
                     ' byte_size, role) VALUES ("art1","v1",?,?,10,"deliverable")',
                     (str(stored_path), digest))
        conn.commit()


def _publication_row(local: Path, publication_id, state, holder='attempt-1'):
    root = local / 'projects/p1/assets'
    with closing(sqlite3.connect(local / 'task-runtime/service/state.db')) as conn:
        conn.execute('INSERT INTO asset_publication VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                     (publication_id, 'a1', str(root), str(root / 'staging'),
                      str(root / 'versions'), str(root / 'quarantine'),
                      'sha256:' + 'b' * 64, holder, 1, state, None,
                      '2026-10-08T00:00:00Z'))
        conn.commit()


class WriteCoordinationTests(unittest.TestCase):
    """A backup is cross-file consistent only if no writer moved during the window.

    The barrier reads what production itself records: the per-asset writer lease,
    the publication journal, the host guard and the attempt row. Fixtures go
    through those real writers (`asset_store.acquire_writer`, `publish_version` and
    its crash seam) rather than hand-inserted rows, so the test proves the product's
    own state is what the gate looks at.
    """

    def setUp(self):
        self.base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        self.local = _activity_root(self.base)
        self.db = self.local / 'task-runtime/service/state.db'
        self.archive = self.base / 'backup.zip'

    def _publish_lease(self, resource='asset:a1', holder='attempt-1', lease=60):
        from design_lab.runtime import asset_store as assets
        with closing(sqlite3.connect(self.db)) as conn:
            self.assertTrue(assets.acquire_writer(conn, resource, holder,
                                                 lease_seconds=lease))
            conn.commit()
            return assets.writer_token(conn, resource, holder)

    def test_backup_refuses_while_a_real_lease_is_held(self):
        self._publish_lease()
        with self.assertRaisesRegex(BackupError, 'LIVE_WRITER_LOCK'):
            create_backup(self.local, self.archive)
        self.assertFalse(self.archive.exists(),
                         'a refused backup must not leave an archive behind')

    def test_a_lease_that_expired_is_not_counted_as_live(self):
        """An expired lease fences its holder out of every remaining DB step."""
        from unittest.mock import patch
        from design_lab.runtime import asset_store
        self._publish_lease()
        with patch.object(asset_store, '_clock',
                          return_value=asset_store._clock() + 120):
            manifest = create_backup(self.local, self.archive)
        self.assertEqual(manifest['productionQuiescence']['state'], 'PROVED_QUIESCENT')

    def test_a_legacy_held_lease_without_expiry_blocks(self):
        """`acquire_writer` refuses to treat a missing expiry as executable.

        The row is inserted directly because no current writer creates it: it is
        the pre-expiry-schema shape the store still honours, and a barrier that
        ignored it would back up over a lease the product itself respects.
        """
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("INSERT INTO asset_writer_lock (resource_key, holder_attempt_id,"
                         " generation, state, acquired_at, expires_at)"
                         " VALUES ('asset:a1','attempt-legacy',1,'HELD',"
                         "'2026-10-08T00:00:00Z',NULL)")
            conn.commit()
        with self.assertRaisesRegex(BackupError, 'LIVE_WRITER_LOCK'):
            create_backup(self.local, self.archive)

    def test_backup_refuses_over_a_prepared_publication(self):
        """Crash the real publisher between stage and commit, then try to back up.

        The lease is released explicitly afterwards, because that is what the
        caller does and not the publisher: `publish_version` never calls
        `release_writer` (image_assets.py:131 owns the `finally`). Releasing it
        here isolates the journal -- otherwise the lease alone blocks the backup
        and this test would prove nothing about PREPARED rows.
        """
        from unittest.mock import patch
        from design_lab.runtime import asset_store as assets
        generation = self._publish_lease(holder='attempt-9')
        source = self.base / 'incoming.psd'
        source.write_bytes(b'publication in flight')
        digest = 'sha256:' + hashlib.sha256(source.read_bytes()).hexdigest()
        root = self.local / 'projects/p1/assets'
        with closing(sqlite3.connect(self.db)) as conn:
            with patch.object(assets, '_after_stage',
                              side_effect=OSError('stopped between stage and commit')):
                with self.assertRaises(OSError):
                    assets.publish_version(conn, 'a1', source, store_root=root,
                                          artifact_name='native.psd',
                                          expected_sha256=digest,
                                          holder_attempt_id='attempt-9',
                                          generation=generation)
            assets.release_writer(conn, 'asset:a1', 'attempt-9', generation=generation)
            conn.commit()
            prepared = conn.execute("SELECT COUNT(*) FROM asset_publication"
                                    " WHERE state='PREPARED'").fetchone()[0]
        self.assertEqual(prepared, 1, 'the fixture must leave exactly one half-made publication')
        with self.assertRaisesRegex(BackupError, 'PREPARED_PUBLICATION'):
            create_backup(self.local, self.archive)

    def test_a_publication_that_completes_inside_the_window_is_detected(self):
        """The blind spot: nothing is live in either read, yet a row appeared."""
        from unittest.mock import patch
        from design_lab.runtime import project_backup
        create_backup(self.local, self.archive)
        original = project_backup._database_snapshot
        moved = []

        def publish_during_snapshot(source, scratch):
            payload = original(source, scratch)
            _publication_row(self.local, 'pub-fast', 'COMMITTED')
            moved.append(True)
            return payload

        second = self.base / 'second.zip'
        with patch.object(project_backup, '_database_snapshot',
                          side_effect=publish_during_snapshot):
            with self.assertRaisesRegex(BackupError, 'moved during the backup window'):
                create_backup(self.local, second)
        self.assertTrue(moved, 'the fixture must actually have written inside the window')
        self.assertFalse(second.exists(), 'a window that moved must not produce an archive')

    def test_host_guard_and_running_attempt_both_block(self):
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute('INSERT INTO attempt_state VALUES (?,?,?,?,?,?,?)',
                         ('at-1', 'job-1', 1, 'RUNNING', '2026-10-08T00:00:00Z', None, None))
            conn.commit()
        with self.assertRaisesRegex(BackupError, 'NON_TERMINAL_ATTEMPT'):
            create_backup(self.local, self.archive)
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("DELETE FROM attempt_state WHERE attempt_id='at-1'")
            conn.execute('INSERT INTO attempt_state VALUES (?,?,?,?,?,?,?)',
                         ('at-2', 'job-2', 1, 'RECEIPTED', '2026-10-08T00:00:00Z',
                          '2026-10-08T00:00:01Z', None))
            conn.execute('INSERT INTO native_host_guard_v1 VALUES (?,?,?)',
                         ('illustrator', 'at-2', '2026-10-08T00:00:00Z'))
            conn.commit()
        with self.assertRaisesRegex(BackupError, 'HOST_GUARD'):
            create_backup(self.local, self.archive)

    def test_quiet_root_records_the_proof_and_restore_echoes_it(self):
        manifest = create_backup(self.local, self.archive)
        proof = manifest['productionQuiescence']
        self.assertEqual(proof['state'], 'PROVED_QUIESCENT')
        self.assertIn('asset_writer_lock', proof['tablesObserved'])
        self.assertEqual(proof['countersBefore'], proof['countersAfter'])
        receipt = restore_backup(self.archive, self.base / 'restored')
        self.assertEqual(receipt['productionQuiescence'], 'PROVED_QUIESCENT')

    def test_a_root_that_cannot_observe_writers_says_so_and_stays_said(self):
        """The plain fixture database has no writer tables: that is not "quiet"."""
        plain = _state_root(self.base / 'plain')
        manifest = create_backup(plain, self.base / 'plain.zip')
        self.assertEqual(manifest['productionQuiescence']['state'], 'WRITES_NOT_OBSERVABLE')
        self.assertEqual(manifest['productionQuiescence']['tablesObserved'], [])
        receipt = restore_backup(self.base / 'plain.zip', self.base / 'plain-restored')
        self.assertEqual(receipt['productionQuiescence'], 'WRITES_NOT_OBSERVABLE',
                         'a restore may not upgrade an unproven backup into a proof')

    def test_a_root_with_no_database_reports_no_database(self):
        bare = self.base / 'bare'
        (bare / 'projects').mkdir(parents=True)
        (bare / 'projects' / 'note.txt').write_text('no state db yet', encoding='utf-8')
        (bare / 'task-runtime' / 'service').mkdir(parents=True)
        manifest = create_backup(bare, self.base / 'bare.zip')
        self.assertEqual(manifest['productionQuiescence']['state'], 'NO_STATE_DATABASE')

    def test_restore_proves_the_index_against_the_archived_bytes(self):
        asset = self.local / 'projects/p1/assets/versions/v1/native.psd'
        digest = hashlib.sha256(asset.read_bytes()).hexdigest()
        _insert_artifact(self.local, str(asset), digest)
        create_backup(self.local, self.archive)
        receipt = restore_backup(self.archive, self.base / 'proven')
        self.assertEqual(receipt['artifactsHashVerified'], 1)
        self.assertEqual(receipt['artifactsUnverifiable'], 0)

    def test_restore_refuses_an_index_that_lies_about_the_bytes(self):
        asset = self.local / 'projects/p1/assets/versions/v1/native.psd'
        _insert_artifact(self.local, str(asset), '0' * 64)
        create_backup(self.local, self.archive)
        with self.assertRaisesRegex(BackupError, 'hash does not match the index'):
            restore_backup(self.archive, self.base / 'refused')

    def test_a_row_without_a_digest_is_counted_not_passed(self):
        asset = self.local / 'projects/p1/assets/versions/v1/native.psd'
        _insert_artifact(self.local, str(asset), None)
        create_backup(self.local, self.archive)
        receipt = restore_backup(self.archive, self.base / 'partial')
        self.assertEqual(receipt['artifactsHashVerified'], 0)
        self.assertEqual(receipt['artifactsUnverifiable'], 1)


class BackupCliTests(unittest.TestCase):
    def test_cli_backup_then_restore_into_a_fresh_root(self):
        base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        project = base / 'project'
        project.mkdir()
        (project / 'AGENTS.md').write_text('# backup probe project', encoding='utf-8')
        local = _state_root(project)
        env = {**os.environ, 'PYTHONPATH': str(REPO / 'src'),
               'PROJECT_LOCAL_ROOT': str(local)}
        archive = base / 'cli-backup.zip'
        created = subprocess.run(
            [sys.executable, '-B', '-m', 'design_lab', '--project', str(project),
             'backup', '--out', str(archive)],
            capture_output=True, text=True, encoding='utf-8', errors='replace',
            env=env, timeout=180)
        self.assertEqual(created.returncode, 0, created.stderr)
        record = json.loads(created.stdout)
        self.assertEqual(record['status'], 'BACKUP_CREATED')
        self.assertEqual(record['fileCount'], 3)
        self.assertRegex(record['sha256'], r'^[0-9a-f]{64}$')

        restored = subprocess.run(
            [sys.executable, '-B', '-m', 'design_lab', '--project', str(project),
             'restore', '--from', str(archive), '--into', str(base / 'recovered')],
            capture_output=True, text=True, encoding='utf-8', errors='replace',
            env=env, timeout=180)
        self.assertEqual(restored.returncode, 0, restored.stderr)
        receipt = json.loads(restored.stdout)
        self.assertEqual(receipt['status'], 'RESTORE_VERIFIED')
        self.assertEqual(receipt['restored'], 3)
        self.assertTrue(receipt['compatibility']['compatible'],
                        'a backup taken by this build must restore into this build')
        self.assertEqual(receipt['compatibility']['archiveStateSchemaVersion'], 7)
        self.assertTrue((base / 'recovered' / 'task-runtime' / 'service'
                         / 'state.db').is_file())


if __name__ == '__main__':
    unittest.main()
