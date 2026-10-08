# SPDX-License-Identifier: MIT
"""DESIGN.md §4's debt stock must be the number a rule produces, not a hand count.

The contract's own存量 line was hand-counted (`18 / 360 / 9`, recorded in
`docs/audits/DESIGNLAB-LAUNCH-REVIEW-PREFLIGHT-2026-10-08.md` §36.4) and no rule reproduces
it. The external design-review plugin, run for the first time on 2026-10-09, produced a third
set of numbers (`44 / 602 / 26`) over the same bytes, because it counts matches inside
comments and treats every literal colour as major. A contract that is about to become an
acceptance standard cannot carry an unrestorable figure, so the measurement lives in
`scripts/design_debt_baseline.py` and this test keeps the prose and the measurement equal.
"""
from __future__ import annotations

import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "design_debt_baseline.py"

sys.path.insert(0, str(ROOT))

from scripts.design_debt_baseline import (PX, SCOPE, contract_statement, measure,  # noqa: E402
                                          strip_comments)


def naive_px_count() -> int:
    """The same regex with no comment stripping and no token-declaration skip."""
    total = 0
    for rel in SCOPE:
        text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        total += sum(len(PX.findall(line)) for line in text.splitlines())
    return total


class DesignDebtBaselineTests(unittest.TestCase):
    def runScript(self, *flags: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, str(SCRIPT), *flags], cwd=str(ROOT),
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace")

    def test_the_contract_states_the_measured_stock(self) -> None:
        result = self.runScript("--check")
        self.assertEqual(result.returncode, 0,
                         "DESIGN.md §4 no longer states what the measurer reports:\n"
                         + result.stdout + result.stderr)
        self.assertIn("DESIGN_DEBT_BASELINE=PASS", result.stdout)

    def test_the_measurement_is_a_population_not_a_zero(self) -> None:
        # Positive control: a broken scope or regex would satisfy the equality check
        # against a document that says zero. The real stock is large.
        values = measure()
        self.assertGreater(values["literalPx"], 200, values)
        self.assertGreater(values["literalColors"], 10, values)
        self.assertGreaterEqual(values["shadowDeclarations"], 10, values)

    def test_comments_and_token_declarations_actually_leave_the_count(self) -> None:
        """The exclusions must be doing work, not decorating the same number.

        Without this, the rule could silently degrade into "count every match" -- which
        is what the external tool does -- and the contract would still read PASS.
        """
        blanked = strip_comments("/* sizing is 13px and #316CFF */\n.a{width:13px}\n"
                                 "// a note about 21px\n")
        self.assertNotIn("13px and", blanked)
        self.assertNotIn("21px", blanked)
        self.assertIn(".a{width:13px}", blanked)
        self.assertLess(measure()["literalPx"], naive_px_count(),
                        "the stated exclusions remove nothing, so the measured stock is "
                        "the raw match count")

    def test_drift_is_caught(self) -> None:
        wrong = measure()
        wrong["literalPx"] += 1
        stated, _ = contract_statement(wrong)
        self.assertFalse(stated,
                         "the check passes even when the document disagrees by one px")


if __name__ == "__main__":
    unittest.main()
