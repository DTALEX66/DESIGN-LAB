# SPDX-License-Identifier: MIT
"""The ledger contract gate must catch the defects that froze the projections.

`main` carried two contract violations for six days (an evidence record with no
retained artefact, and completion states with no reassessment) while every CI
job stayed green, because nothing validated the ledger itself. These tests pin
both rules so the new gate cannot degrade into a no-op.
"""
from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'src'))

from design_lab.governance import reporting
from design_lab.governance.reporting import LEDGER, Reader, validate_ledger_contract


class TaskLedgerContractGateTests(unittest.TestCase):
    def test_repo_ledger_satisfies_its_own_contract(self):
        validate_ledger_contract(REPO)

    def test_evidence_record_without_retained_artefact_is_rejected(self):
        reader = Reader(REPO)
        ledger = copy.deepcopy(reader.json(LEDGER))
        ledger['evidence'][-1]['artifacts'] = []
        with self.assertRaisesRegex(Exception, 'artifacts'):
            reporting._validate(reader, ledger)

    def test_completion_state_without_reassessment_is_rejected(self):
        reader = Reader(REPO)
        ledger = copy.deepcopy(reader.json(LEDGER))
        for task in ledger['tasks']:
            if any(axis['state'] in {'PASS', 'IMPLEMENTED_LOCAL'}
                   for axis in task['axes'].values()):
                task['reassessment'] = 'PENDING_EVIDENCE_REVIEW'
                break
        else:
            self.fail('no task carries a completion state to test')
        with self.assertRaisesRegex(Exception, 'reassessment'):
            reporting._validate(reader, ledger)


if __name__ == '__main__':
    unittest.main()
