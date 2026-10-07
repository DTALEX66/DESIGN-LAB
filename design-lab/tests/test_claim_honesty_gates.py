# SPDX-License-Identifier: MIT
"""Run the honesty gates that existed but were never invoked.

Discovered while wiring the Workbench UI audit into CI: `scripts/verify_no_overclaim.py`,
`scripts/verify_evidence_levels.py` and `scripts/verify_supply_chain.py` all pass, all
guard claims rather than counts, and none of them is named in any workflow or test --
CI lists its gates one step at a time, so a script nobody writes a step for simply never
runs. `test_gate_reachability.py` keeps that from recurring.

Each assertion requires the verdict token in the output, not just exit 0: a gate that
prints nothing and exits 0 has not examined anything.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

GATES = (
    ("scripts/verify_no_overclaim.py", "NO_OVERCLAIM=PASS"),
    ("scripts/verify_evidence_levels.py", "EVIDENCE_LEVELS=PASS"),
    ("scripts/verify_supply_chain.py", "SUPPLY_CHAIN=PASS"),
)


class ClaimHonestyGateTests(unittest.TestCase):
    def run_gate(self, relative: str, token: str) -> str:
        script = ROOT / relative
        self.assertTrue(script.is_file(), f'gate missing: {relative}')
        proc = subprocess.run([sys.executable, '-X', 'utf8', '-B', str(script)],
                              cwd=str(ROOT), capture_output=True, text=True,
                              encoding='utf-8', errors='replace', timeout=900)
        output = (proc.stdout or '') + (proc.stderr or '')
        self.assertEqual(proc.returncode, 0, f'{relative} exited {proc.returncode}:\n{output[-800:]}')
        self.assertIn(token, output,
                      f'{relative} exited 0 without emitting {token!r}; output was:\n{output[-800:]}')
        return output

    def test_no_overclaim_passes_and_reports_what_it_examined(self) -> None:
        output = self.run_gate(*GATES[0])
        counts = re.search(r"claims=(\d+).*?unsupported=(\d+)", output, re.S)
        self.assertIsNotNone(counts,
                             f'no_overclaim passed without reporting its counts: {output[:240]}')
        self.assertGreater(int(counts.group(1)), 0,
                           'the gate examined zero claims, so its PASS covers nothing')
        self.assertEqual(int(counts.group(2)), 0,
                         'the gate passed while unsupported claims were present')

    def test_evidence_levels_keeps_historical_evidence_honest(self) -> None:
        self.run_gate(*GATES[1])

    def test_supply_chain_lock_is_consistent(self) -> None:
        self.run_gate(*GATES[2])

    def test_supply_chain_sees_the_derived_revision_record(self) -> None:
        """The join, asserted.

        `revision_coverage` read only the lock and reported 0 while PR #242's derived
        record held 37 revisions. A gate that under-reports its own coverage is worse
        than no gate, because the number is what people trust.
        """
        report = ROOT / "reports" / "current" / "SUPPLY-CHAIN-REPORT.json"
        self.assertTrue(report.is_file(), "the gate ran but wrote no report to inspect")
        check = json.loads(report.read_text(encoding="utf-8"))["checks"]["G000_sources_lock"]
        self.assertGreater(check["revision_coverage"], 0,
                           "revision_coverage is zero again: the lock and the derived "
                           "revision record have stopped being read together")
        self.assertEqual(check["revision_record_ids_not_in_lock"], [],
                         "the revision record describes sources the lock no longer has")
        self.assertEqual(check["absorb_without_revision"], [],
                         "an ABSORB source appears in neither the resolved nor the "
                         "unresolved revision list -- that is a hole in the record")
        # Recorded §9 gaps, not failures: source known, revision pending. Pinning the set
        # means a third one cannot join silently.
        self.assertEqual(sorted(check["absorb_unresolved"]),
                         ["ai-product-os-frontend", "front-end-design-checklist"],
                         "the set of absorbed-without-revision sources changed; either "
                         "close the gap or record why the expectation moved")
        # Measured 2026-10-07: none of the nine is resolvable offline. Two have a repo
        # URL in the lock notes but no commit anywhere in their SOURCE.md / skills-lock.json,
        # and the only 40-hex strings in those directories are truncated SHA-256 content
        # hashes -- which the revision regex would accept as a commit. Seven have no URL
        # at all, so a human has to identify the upstream before any lookup is possible.
        self.assertEqual(sorted(check["revision_unresolved_with_url"]),
                         ["ai-product-os-frontend", "front-end-design-checklist"])
        self.assertEqual(len(check["revision_unresolved_without_url"]), 7)
        self.assertEqual(check["revision_record"]["resolved"]
                         + len(check["revision_unresolved_with_url"])
                         + len(check["revision_unresolved_without_url"]),
                         check["entries"],
                         "resolved + unresolved no longer accounts for every lock entry")


if __name__ == '__main__':
    unittest.main()
