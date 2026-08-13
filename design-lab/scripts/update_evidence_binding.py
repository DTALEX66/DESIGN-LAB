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


def main() -> int:
    check_only = "--check" in sys.argv
    head = git_head()
    if not head:
        print("UPDATE_EVIDENCE_BINDING=FAIL (git HEAD unresolvable)")
        return 1

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

    if check_only:
        print(f"UPDATE_EVIDENCE_BINDING=STALE current={current[:12]} head={head[:12]} (re-run without --check)")
        return 1

    index["boundTree"] = head
    INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    n_cards = len(cards.get("cards", []))
    print(f"UPDATE_EVIDENCE_BINDING=OK boundTree {current[:12]} -> {head[:12]} (cards={n_cards})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
