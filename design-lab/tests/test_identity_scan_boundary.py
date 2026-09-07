# SPDX-License-Identifier: MIT
"""The identity gate inspects active source, never ignored runtime/private data."""
import importlib.util
import os
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


class IdentityScanBoundaryTests(unittest.TestCase):
    def setUp(self):
        path = ROOT/'design-lab/scripts/verify_identity_gate.py'
        spec = importlib.util.spec_from_file_location('identity_boundary_fixture', path)
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)
        parent = ROOT/'.project-local/task-runtime/identity-boundary-tests'
        parent.mkdir(parents=True, exist_ok=True)
        temp = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.module.ROOT = self.root

    def write(self, relative, raw):
        path = self.root/relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)

    def test_runtime_database_does_not_fail_source_identity_gate(self):
        self.write('.project-local/task-runtime/fixture.db', b'\xff\x00SQLite fixture')
        self.write('src/good.py', b'# SPDX-License-Identifier: MIT\n')
        self.assertEqual(self.module.scan(), [])

    def test_runtime_tree_is_pruned_before_enumeration(self):
        self.write('.project-local/task-runtime/fixture.json', b'{}')
        code = """
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location('probe', sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
m.ROOT = pathlib.Path(sys.argv[2])
visited = []
def audit(event, args):
    if event == 'os.scandir':
        visited.append(str(args[0]))
sys.addaudithook(audit)
m.scan()
print(json.dumps(visited))
"""
        result = subprocess.run([sys.executable, '-B', '-c', code, str(ROOT/'design-lab/scripts/verify_identity_gate.py'), str(self.root)],
                                capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stderr)
        visited = json.loads(result.stdout)
        self.assertTrue(visited)
        self.assertFalse(any(Path(p).is_relative_to(self.root/'.project-local') for p in visited), visited)

    def test_private_synthetic_files_are_not_opened(self):
        # Dedicated sentinels, not user credentials or real private runtime state.
        for relative in ('.env', 'auth.json', '.codex/config.toml', '.openhuman/memory.json'):
            self.write(relative, b'\xff private fixture')
        self.assertEqual(self.module.scan(), [])

    def test_active_violation_and_unreadable_source_still_fail(self):
        self.write('src/identity.txt', b'Open Design Assistance is the product')
        self.write('src/unreadable.py', b'\xff\x00')
        hits = self.module.scan()
        self.assertEqual(len(hits), 2)
        self.assertTrue(any('src/identity.txt' in h for h in hits))
        self.assertTrue(any('src/unreadable.py: unreadable' in h for h in hits))

    def test_active_workflow_is_checked_but_archived_names_and_ignore_rules_are_not_branding(self):
        self.write('.github/workflows/active.yml', b'name: Open Design Assistance')
        self.write('.github/workflows-archive/old.yml', b'name: Open Design Assistance')
        self.write('.gitignore', b'opendesign-assistance/generated/\n')
        hits = self.module.scan()
        self.assertEqual(len(hits), 1, hits)
        self.assertTrue(hits[0].startswith('.github/workflows/active.yml:'))


if __name__ == '__main__':
    unittest.main()
