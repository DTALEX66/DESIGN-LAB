#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-EVD-001: rebind capability-evidence-index.boundTree to current HEAD.

Keeps the evidence tree binding exact-SHA fresh after every merge.
Usage: python update_evidence_binding.py [--check]
  --check : verify binding matches HEAD without writing
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
INDEX = ROOT / "design-lab" / "config" / "capability-evidence-index.json"
CARDS = ROOT / "design-lab" / "evals" / "evidence" / "evidence-cards.json"


def git_head() -> str:
    r = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"],
                       capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def check() -> list[str]:
    findings: list[str] = []
    head = git_head()
    if not head:
        return ["git HEAD unresolvable"]

    try:
        index = json.loads(INDEX.read_text(encoding="utf-8"))
        cards = json.loads(CARDS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"unreadable: {exc}"]

    current = index.get("boundTree", "")

    # Accept boundTree == HEAD or HEAD^ (squash-merge semantics: a rebind
    # merged as the parent of HEAD is still "the last verified tree").
    # Anything older is a real staleness.
    acceptable = {head}
    r = subprocess.run(["git", "-C", str(ROOT), "rev-parse", head + "^"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        acceptable.add(r.stdout.strip())

    if current in acceptable:
        print(f"UPDATE_EVIDENCE_BINDING=OK (bound {current[:12]})")
        return findings

    findings.append(f"STALE current={current[:12]} head={head[:12]} (re-run without --check)")
    return findings


def main() -> int:
    check_only = "--check" in sys.argv
    head = git_head()
    if not head:
        print("UPDATE_EVIDENCE_BINDING=FAIL (git HEAD unresolvable)")
        return 1

    if check_only:
        findings = check()
        for f in findings:
            print(f"UPDATE_EVIDENCE_BINDING={f}")
        return 1 if findings else 0

    try:
        index = json.loads(INDEX.read_text(encoding="utf-8"))
        cards = json.loads(CARDS.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"UPDATE_EVIDENCE_BINDING=FAIL ({exc})")
        return 1

    current = index.get("boundTree", "")
    if current == head:
        print(f"UPDATE_EVIDENCE_BINDING=OK (already bound to {head[:12]})")
        return 0

    index["boundTree"] = head
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    n_cards = len(cards.get("cards", []))
    print(f"UPDATE_EVIDENCE_BINDING=OK boundTree {current[:12]} -> {head[:12]} (cards={n_cards})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
