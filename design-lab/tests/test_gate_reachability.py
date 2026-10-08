# SPDX-License-Identifier: MIT
"""No verification script may be orphaned without a recorded reason.

`canonical-verify.yml` enumerates its gates one step per script -- there is no glob and no
manifest -- so a `verify_*.py` that nobody adds a step for never runs, and nothing anywhere
says so. That is how `scripts/audit_workbench_ui.py` came to report twelve live Workbench
violations (including a 23px-tall sole mobile navigation control) while every required CI
context was green.

This test is the anti-recurrence gate: the set of unreachable verifiers must equal the
explicit exemption list below, in both directions. A new orphan fails, and so does an
exemption that has gone stale -- either because the script was wired in, or because it was
deleted while its excuse stayed behind.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Scripts that are legitimately not CI-invoked, each with the reason.
MANUAL_GATES = {
    "verify_fresh_clone.py":
        "clones the whole repository (~236 MiB pack) into an ignored directory; it is a "
        "local clean-room check and CI already proves a clean wheel install separately",
    "verify_clean_tree.py":
        "judges the working tree's uncommitted state, which is vacuous in CI where the "
        "checkout is clean by construction",
    "verify_r5_intake.py":
        "verifies intake of the superseded DL-TP-20260908-R5 taskpack; historical, not a "
        "current gate",
    "capture_workbench_screenshots.mjs":
        "capture tool driven through scripts/capture_workbench_screenshots.py by a human "
        "or by the browser gates",
    "deepseek_content_audit.py": "one-off historical audit run",
    "deepseek_directory_audit.py": "one-off historical audit run",
    # `deepseek_foundation_audit.py` was exempted as a one-off. It is no longer one-off:
    # design-lab/scripts/verify_projection_freshness.py invokes its --check as an entry, and this
    # test's stale-exemption rule is what surfaced that -- an exemption kept after the script
    # became reachable is a register that no longer describes the repository.
    "deepseek_post_cleanup_audit.py": "one-off historical audit run",
    "deepseek_size_audit.py": "one-off historical audit run",
}

CANDIDATE = re.compile(r"(verify|audit|check|no_overclaim|clean_tree)")


def script_candidates() -> dict[str, Path]:
    found: dict[str, Path] = {}
    for directory in ("scripts", "design-lab/scripts"):
        for path in (ROOT / directory).glob("*.py"):
            if CANDIDATE.search(path.name):
                found[path.name] = path
    for path in (ROOT / "design-lab/tests/e2e").glob("*.mjs"):
        found[path.name] = path
    return found


def reachable_names(candidates: dict[str, Path]) -> set[str]:
    """Fixed point over 'who names whom', starting from CI's own entry points.

    This module is excluded from the scan: it lists every manual gate by name in its own
    exemption table, so counting it as a caller would make those gates reachable by
    virtue of being exempted -- which the stale-exemption assertion duly caught on the
    first run.
    """
    self_name = Path(__file__).name
    sources: dict[str, str] = {}
    for pattern in (".github/workflows/*.yml", "design-lab/tests/*.py",
                    "design-lab/tests/e2e/*.mjs", "scripts/*.py", "design-lab/scripts/*.py"):
        for path in ROOT.glob(pattern):
            if path.name == self_name:
                continue
            try:
                sources[path.name] = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
    workflows = [name for name in sources if (ROOT / ".github/workflows" / name).is_file()]
    # Every test module is run by scripts/run_python_tests.py, so a test naming a script
    # makes that script reachable.
    runners = set(workflows) | {name for name in sources if name.startswith("test_")}
    live = {name for name in candidates if any(name in sources.get(r, "") for r in runners)}
    frontier = set(live)
    while True:
        nxt = set()
        for src in frontier:
            text = sources.get(src, "")
            for cand in candidates:
                if cand not in live and cand in text:
                    nxt.add(cand)
        if not nxt:
            return live
        live |= nxt
        frontier = nxt


class GateReachabilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.candidates = script_candidates()
        self.reachable = reachable_names(self.candidates)
        self.orphaned = sorted(set(self.candidates) - self.reachable)

    def test_the_scan_itself_sees_a_meaningful_population(self) -> None:
        # Positive control: if the glob or the reachability walk silently broke, the
        # equality assertions below would pass against empty sets.
        self.assertGreater(len(self.candidates), 60,
                           f"only {len(self.candidates)} candidates found -- the scanner broke")
        self.assertGreater(len(self.reachable), 50,
                           f"only {len(self.reachable)} reachable -- the walker broke")

    def test_every_orphaned_gate_is_exempted_with_a_reason(self) -> None:
        unexplained = [name for name in self.orphaned if name not in MANUAL_GATES]
        self.assertEqual(unexplained, [],
                         f"{len(unexplained)} verifier(s) are named by no workflow and no test, "
                         f"so they never run: {unexplained}. Wire them in (a test module that "
                         "shells out is the route that avoids editing the SHA-pinned "
                         "canonical-verify.yml) or record why they are manual.")

    def test_no_exemption_has_gone_stale(self) -> None:
        stale = sorted(name for name in MANUAL_GATES if name not in set(self.candidates))
        self.assertEqual(stale, [], f"exemptions for scripts that no longer exist: {stale}")
        wired = sorted(name for name in MANUAL_GATES if name in self.reachable)
        self.assertEqual(wired, [], f"exempted but actually reachable now: {wired}")

    def test_each_exemption_states_a_reason(self) -> None:
        for name, reason in MANUAL_GATES.items():
            self.assertGreater(len(reason), 20, f"{name} has a placeholder exemption")


if __name__ == '__main__':
    unittest.main()
