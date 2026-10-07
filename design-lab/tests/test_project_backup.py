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
