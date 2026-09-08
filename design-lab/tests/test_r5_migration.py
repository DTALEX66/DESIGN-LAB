# SPDX-License-Identifier: MIT
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
sys.path.insert(0, str(ROOT / 'src'))
import prepare_r5_ledger as migration


class R5MigrationTests(unittest.TestCase):
    def setUp(self):
        self.previous = (ROOT / 'design-lab/config/task-ledger-r3.json').read_bytes()
        self.source = (ROOT / 'docs/history/taskpacks/r5-20260908/tasks.json').read_bytes()

    def build(self, previous=None, source=None):
        return migration.prepare(ROOT, self.previous if previous is None else previous,
                                 self.source if source is None else source,
                                 updated_at='2026-09-09T00:00:00Z')

    def test_preserves_entire_predecessor_without_mutating_active_file(self):
        candidate = self.build()
        self.assertEqual(candidate['predecessor']['ledger'], json.loads(self.previous))
        self.assertEqual(candidate['predecessor']['sha256'], hashlib.sha256(self.previous).hexdigest())
        self.assertEqual((ROOT / 'design-lab/config/task-ledger-r3.json').read_bytes(), self.previous)
        self.assertEqual(self.build(), candidate)

    def test_all_definitions_and_conditions_survive_without_pass_transfer(self):
        candidate = self.build()
        self.assertEqual(len(candidate['tasks']), 28)
        self.assertEqual(candidate['evidence'], [])
        for original, task in zip(json.loads(self.source)['tasks'], candidate['tasks']):
            self.assertEqual(task['definition'], original)
            self.assertEqual(task['id'], original['id'])
            self.assertEqual(task['depends_on'], original['depends_on'])
            for axis in task['axes'].values():
                self.assertEqual(axis, {'state': 'PARTIAL', 'evidence': []})

    def test_mapping_covers_all_old_tasks_without_erasing_split_work(self):
        tasks = {t['id']: t for t in self.build()['tasks']}
        mapped = {old for task in tasks.values() for old in task['predecessor_task_ids']}
        self.assertEqual(mapped, {f'R3-{i:02d}' for i in range(1, 25)})
        self.assertEqual(tasks['DL-R5-001']['predecessor_task_ids'], ['R3-01', 'R3-03'])
        self.assertEqual(tasks['DL-R5-025']['predecessor_task_ids'], ['R3-16', 'R3-20'])
        self.assertEqual(tasks['DL-R5-028']['predecessor_task_ids'], [])

    def test_modified_source_and_invalid_predecessor_are_rejected(self):
        with self.assertRaises(ValueError):
            self.build(source=self.source + b' ')
        previous = json.loads(self.previous)
        previous['tasks'].pop()
        with self.assertRaises(ValueError):
            self.build(previous=json.dumps(previous).encode())

    def test_duplicate_predecessor_keys_and_bad_timestamp_are_rejected(self):
        with self.assertRaises(ValueError):
            self.build(previous=b'{"tasks":[],"tasks":[]}')
        for invalid in ('not-a-date', '2026-09-09T00:00:00', '2026-02-30T00:00:00Z'):
            with self.subTest(timestamp=invalid), self.assertRaises(ValueError):
                migration.prepare(ROOT, self.previous, self.source, updated_at=invalid)


if __name__ == '__main__':
    unittest.main()
