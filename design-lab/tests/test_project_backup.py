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
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'src'))

from design_lab.runtime.project_backup import (  # noqa: E402
    BackupError, create_backup, restore_backup, verify_backup)


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
        for entry in verify_backup(self.archive)['members']:
            original = hashlib.sha256(self.local.joinpath(
                *entry['path'].split('/')).read_bytes()).hexdigest()
            restored = hashlib.sha256(target.joinpath(
                *entry['path'].split('/')).read_bytes()).hexdigest()
            self.assertEqual(original, restored, entry['path'])

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
