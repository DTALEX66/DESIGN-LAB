# SPDX-License-Identifier: MIT
"""DL-TP-R2-018: Operation / Attempt state machine.

One logical Operation has multiple JobAttempts. Retry keeps operation /
idempotency key stable; each attempt has unique attempt_no. After DISPATCHING
without a receipt -> OUTCOME_UNKNOWN -> RECONCILING. A2/A3 unresolved unknown
never auto-retries.
"""
from __future__ import annotations

VALID = {
    "operation": ("PENDING", "DISPATCHING", "OUTCOME_UNKNOWN", "RECONCILING", "SUCCEEDED", "COMPENSATING", "PAUSED_NEEDS_USER", "CANCELLED", "FAILED"),
    "attempt": ("PENDING", "RUNNING", "RECEIPTED", "FAILED", "TIMED_OUT"),
}
RISK_A2_A3 = {"A2", "A3"}


class OperationCoordinator:
    def __init__(self) -> None:
        self.state = "PENDING"

    def dispatch(self) -> None:
        self.state = "DISPATCHING"

    def receipt_missing_after_dispatch(self, risk: str) -> str:
        self.state = "OUTCOME_UNKNOWN"
        if risk in RISK_A2_A3:
            return "RECONCILING_NO_AUTO_RETRY"
        return "RECONCILING"

    def reconcile(self, proof: str) -> None:
        if proof == "effect_not_started" or proof == "verified_idempotent":
            self.state = "SUCCEEDED"
        elif proof == "document_reverted":
            self.state = "COMPENSATING"
        elif proof == "needs_user":
            self.state = "PAUSED_NEEDS_USER"
        else:
            raise ValueError(f"unresolvable proof: {proof}")

    def cancel(self, acked: bool) -> None:
        if not acked:
            raise RuntimeError("cancel requires adapter ack before reconciliation")
        self.state = "RECONCILING"

