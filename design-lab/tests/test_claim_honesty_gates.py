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


if __name__ == '__main__':
    unittest.main()
