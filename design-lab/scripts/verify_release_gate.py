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
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
RELEASE_GATE_DIR = ROOT / "design-lab" / "config" / "release-gate"
LEVEL_ORDER = {f"E{i}": i for i in range(6)}


def git(*args: str) -> tuple[int, str]:
    r = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True)
    return r.returncode, (r.stdout or r.stderr).strip()


def capability_floor_findings(path: Path) -> list[str]:
    """Require every declared capability floor before release can be enabled."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return [f"CAPABILITY-EVIDENCE-INDEX-UNREADABLE ({exc})"]

    capabilities = data.get("capabilities") if isinstance(data, dict) else None
    if not isinstance(capabilities, list):
        return ["CAPABILITY-EVIDENCE-INDEX-INVALID (capabilities must be a list)"]

    findings: list[str] = []
    for capability in capabilities:
        if not isinstance(capability, dict):
            findings.append("CAPABILITY-EVIDENCE-INDEX-INVALID (capability must be an object)")
            continue
        capability_id = capability.get("id", "<unknown>")
        minimum = capability.get("minimumRequiredEvidence")
        actual = capability.get("actualEvidence")
        if minimum not in LEVEL_ORDER or actual not in LEVEL_ORDER:
            findings.append(
                f"CAPABILITY-EVIDENCE-INVALID {capability_id} minimum={minimum!r} actual={actual!r}"
            )
        elif LEVEL_ORDER[actual] < LEVEL_ORDER[minimum]:
            findings.append(
                f"EVIDENCE-BELOW-MINIMUM {capability_id} actual={actual} minimum={minimum}"
            )
    return findings


def evidence_card_findings(path: Path) -> list[str]:
    """Prevent a human acceptance marker from bypassing unrun evidence cards."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return [f"EVIDENCE-CARDS-UNREADABLE ({exc})"]

    cards = data.get("cards") if isinstance(data, dict) else None
    if not isinstance(cards, list) or not cards:
        return ["EVIDENCE-CARDS-INVALID (cards must be a non-empty list)"]

    accepted = 0
    for card in cards:
        if not isinstance(card, dict):
            continue
        calibration = card.get("human_calibration")
        if card.get("card_status") == "accepted" and isinstance(calibration, dict) and calibration.get("status") == "completed":
            accepted += 1
    if accepted != len(cards):
        return [f"EVIDENCE-CARDS-PENDING accepted={accepted}/{len(cards)}"]
    return []


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

    # 5. enable state: capability floors + evidence cards + human acceptance
    findings.extend(
        capability_floor_findings(ROOT / "design-lab" / "config" / "capability-evidence-index.json")
    )
    findings.extend(evidence_card_findings(ROOT / "design-lab" / "evals" / "evidence" / "evidence-cards.json"))

    # A human acceptance marker is necessary but not sufficient. It must not
    # bypass the machine-readable E-level and card checks above.
    #    require an explicit acceptance marker; generic "通过/PASS" words
    #    in evidence-discipline prose must NOT count (false positive guard)
    evals_readme = ROOT / "design-lab" / "evals" / "README.md"
    human_done = False
    if evals_readme.exists():
        text = evals_readme.read_text(encoding="utf-8")
        human_done = bool(re.search(r"DL-REL-001\s*[:：]\s*(ACCEPTED|验收通过|DONE)", text, re.IGNORECASE))
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
