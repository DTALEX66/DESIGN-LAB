# SPDX-License-Identifier: MIT
"""Evidence artefact presence gate tests.

Distinguishes the two kinds of artefact path: a tracked file that has gone is a
hard break, while a `.project-local/` runtime path is expected to be absent on a
clean checkout and may only ever warn. The gate has to keep that difference or it
is either useless (always green) or noise (always red).
"""
from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MODULE = REPO / 'design-lab' / 'scripts' / 'verify_evidence_artifact_presence.py'
LEDGER = REPO / 'design-lab' / 'config' / 'task-ledger-r3.json'

spec = importlib.util.spec_from_file_location('evidence_artifact_presence', MODULE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def _ledger() -> dict:
    return json.loads(LEDGER.read_text(encoding='utf-8'))


class EvidenceArtifactPresenceTests(unittest.TestCase):
    def test_tracked_artefacts_of_the_real_ledger_all_read_back(self):
        result = gate.evaluate(REPO, _ledger())
        self.assertEqual(result['broken'], [],
                         'every tracked evidence artefact must still exist')
        # Known decay, asserted rather than hidden. Each entry is a record whose
        # artefact bytes legitimately moved after the observation, and the list is
        # exact so the NEXT unannounced move still goes red:
        #   * build/main.js -- a 2026-09-27 record used a mutable build output as
        #     its artefact, so the bundle has since moved on;
        #   * test_project_backup.py -- the 2026-10-06 M1 runtime-slice record
        #     asserted the backup test file's bytes; commit 701ace9c replaced the
        #     raw file copy with a snapshot plus a writer barrier, so those bytes
        #     are now older than the code they describe. That record is not
        #     rewritten: it stays as the historical observation, and the newer
        #     evidence record carries the current binding.
        # Compared sorted: the gate emits in ledger-record order, which is an
        # artefact of which record was appended first and carries no meaning here.
        # The set itself stays exact -- an unlisted fourth move still fails.
        # Written as two locals rather than one nested expression, because the
        # nested form is how I committed a syntax error here once already.
        observed = sorted((record, why) for _, record, why in result['drifted'])
        expected = sorted([
            ('apps/workbench/build/main.js', 'HASH_MOVED_SINCE_OBSERVATION'),
            # The 2026-10-06 M1 runtime-slice record bound these two test files by
            # hash; both were legitimately rewritten since (the backup snapshot, then
            # the launcher's token path). The record is not rewritten -- it stays as
            # the observation it was, and newer records carry the current binding.
            ('design-lab/tests/test_project_backup.py', 'HASH_MOVED_SINCE_OBSERVATION'),
            ('design-lab/tests/test_workbench_launch.py', 'HASH_MOVED_SINCE_OBSERVATION'),
        ])
        self.assertEqual(observed, expected)

    def test_missing_tracked_artefact_is_a_hard_break_not_a_warning(self):
        ledger = copy.deepcopy(_ledger())
        target = next(e for e in ledger['evidence']
                      if any(not a['path'].startswith('.project-local')
                             for a in e['artifacts']))
        target['artifacts'] = [{'path': 'docs/this-evidence-file-does-not-exist.md',
                                'sha256': '0' * 64}]
        result = gate.evaluate(REPO, ledger)
        self.assertEqual([entry[2] for entry in result['broken']], ['NOT-IN-GIT-INDEX'])

    def test_changed_artefact_bytes_count_as_drift_not_destruction(self):
        ledger = copy.deepcopy(_ledger())
        for receipt in ledger['evidence']:
            for artifact in receipt['artifacts']:
                if not artifact['path'].startswith('.project-local'):
                    artifact['sha256'] = 'f' * 64
                    result = gate.evaluate(REPO, ledger)
                    self.assertIn((receipt['id'], artifact['path'],
                                   'HASH_MOVED_SINCE_OBSERVATION'), result['drifted'])
                    self.assertEqual(result['broken'], [])
                    return
        self.fail('no tracked artefact found to tamper with')

    def test_runtime_paths_only_warn(self):
        ledger = copy.deepcopy(_ledger())
        ledger['evidence'] = [{
            'id': 'synthetic', 'task_ids': ['DL-R5-001'], 'kind': 'local_test',
            'outcome': 'PASS', 'subject_sha': '0' * 40, 'binding': 'COMMIT',
            'observed_at': '2026-10-06T00:00:00Z', 'software': {}, 'subject_files': {},
            'artifacts': [{'path': '.project-local/never/existed.json',
                           'sha256': '0' * 64}],
            'note': 'synthetic',
        }]
        result = gate.evaluate(REPO, ledger)
        self.assertEqual(result['broken'], [])
        self.assertEqual(len(result['runtime_missing']), 1)


if __name__ == '__main__':
    unittest.main()
