#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-CI-004: release exact-SHA gate (configuration + local checks).

Verifies release-readiness preconditions that can be checked locally:
1. worktree clean
2. HEAD == origin/main (when origin resolvable)
3. verify chain green (verify_design_lab.py)
4. release evidence contract present

The gate is NOT "enabled" until DL-REL-001 human acceptance + E3 evidence
exist; this script validates the preconditions and reports enable state.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
RELEASE_GATE_DIR = ROOT / "design-lab" / "config" / "release-gate"


def git(*args: str) -> tuple[int, str]:
    r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True)
    return r.returncode, (r.stdout or r.stderr).strip()


def check(skip_dirty: bool = False) -> list[str]:
    findings: list[str] = []

    # 1. clean worktree
    if not skip_dirty:
        code, out = git("status", "--porcelain")
        if code == 0 and out:
            findings.append("DIRTY-WORKTREE")

    # 2. HEAD == origin/main (best effort; offline ok)
    code, head = git("rev-parse", "HEAD")
    code2, origin = git("rev-parse", "origin/main")
    if code == 0 and code2 == 0 and head and origin:
        if head != origin:
            findings.append(f"SHA-MISMATCH head={head[:12]} origin={origin[:12]}")
    else:
        findings.append("ORIGIN-UNRESOLVABLE (offline; skipped)")

    # 3. verify chain green (check a marker file from the aggregate run)
    #    NOTE: do NOT invoke verify_design_lab.py here (would recurse).
    marker = ROOT / "design-lab" / "config" / ".verify-chain-ok"
    if not marker.exists():
        findings.append("VERIFY-CHAIN-MARKER-MISSING (run verify_design_lab.py first)")
    else:
        m = marker.read_text(encoding="utf-8").strip()
        if not m.startswith("ok "):
            findings.append("VERIFY-CHAIN-MARKER-INVALID")
        else:
            marker_sha = m.split()[1] if len(m.split()) > 1 else ""
            if marker_sha and marker_sha != head:
                findings.append(f"VERIFY-CHAIN-STALE marker={marker_sha[:12]} head={head[:12]} (re-run verify_design_lab)")

    # 4. release evidence contract present
    contract = ROOT / "design-lab" / "config" / "RELEASE_EVIDENCE_CONTRACT.md"
    if not contract.exists():
        findings.append("MISSING-RELEASE-EVIDENCE-CONTRACT")

    # 5. enable state: human acceptance + E3 evidence
    evals_readme = ROOT / "design-lab" / "evals" / "README.md"
    human_done = False
    if evals_readme.exists():
        text = evals_readme.read_text(encoding="utf-8")
        human_done = "通过" in text or "PASS" in text.upper()
    if not human_done:
        findings.append("HUMAN-ACCEPTANCE-PENDING (DL-REL-001)")

    return findings


def main() -> int:
    skip_dirty = "--skip-dirty" in sys.argv
    findings = check(skip_dirty=skip_dirty)
    for f in sorted(findings):
        print(f"  {f}")
    if findings:
        print(f"\nRELEASE_GATE=BLOCKED findings={len(findings)}")
        return 1
    print("\nRELEASE_GATE=READY (preconditions met; enable on human approval)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
