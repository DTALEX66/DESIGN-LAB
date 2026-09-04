# SPDX-License-Identifier: MIT
"""DL-TP-R2-018: Operation coordinator state tests."""
from __future__ import annotations
import sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / 'src'
sys.path.insert(0, str(SRC))


class OperationCoordinatorTests(unittest.TestCase):
    def test_unknown_a3_no_auto_retry(self):
        from design_lab.runtime.operation_coordinator import OperationCoordinator
        c = OperationCoordinator()
        c.dispatch()
        r = c.receipt_missing_after_dispatch("A3")
        self.assertEqual(r, "RECONCILING_NO_AUTO_RETRY")
        self.assertEqual(c.state, "OUTCOME_UNKNOWN")

    def test_reconcile_effect_not_started_succeeds(self):
        from design_lab.runtime.operation_coordinator import OperationCoordinator
        c = OperationCoordinator()
        c.dispatch()
        c.receipt_missing_after_dispatch("A1")
        c.reconcile("effect_not_started")
        self.assertEqual(c.state, "SUCCEEDED")

    def test_reconcile_document_reverted_compensates(self):
        from design_lab.runtime.operation_coordinator import OperationCoordinator
        c = OperationCoordinator()
        c.dispatch()
        c.receipt_missing_after_dispatch("A2")
        c.reconcile("document_reverted")
        self.assertEqual(c.state, "COMPENSATING")

    def test_cancel_requires_ack(self):
        from design_lab.runtime.operation_coordinator import OperationCoordinator
        c = OperationCoordinator()
        with self.assertRaises(RuntimeError):
            c.cancel(acked=False)


if __name__ == '__main__':
    unittest.main()
