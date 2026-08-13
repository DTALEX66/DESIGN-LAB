#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Release evidence SHA readback + validation (ODA4-0107).

Validates a release-evidence record: local branch/HEAD/tree, remote SHA
readback, and CI binding. Rejects claims where the recorded CI/head differs
from the actual current tree (a prior green CI on another SHA is NOT evidence).

Usage:
    python design-lab/scripts/verify_release_evidence.py [evidence.json]
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def git(args: list[str]) -> str:
    r = subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("evidence", nargs="?", help="release-evidence JSON file; omit to print schema usage")
    args = parser.parse_args()

    if not args.evidence:
        print("USAGE: verify_release_evidence.py <release-evidence.json>")
        print("Recorded head/tree must match the live checkout; remote readback is required.")
        return 0

    ev = json.loads(Path(args.evidence).read_text(encoding="utf-8"))

    # Local facts
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"])
    head = git(["rev-parse", "HEAD"])
    tree = git(["rev-parse", "HEAD^{tree}"])
    worktree = git(["status", "--porcelain"])

    print(f"local branch={branch}")
    print(f"local head={head}")
    print(f"local tree={tree}")
    print(f"worktree={'clean' if not worktree else 'dirty'}")

    failures = []
    if ev.get("branch") != branch:
        failures.append(f"branch mismatch: recorded {ev.get('branch')} != live {branch}")
    if ev.get("head_sha") != head:
        failures.append(f"head mismatch: recorded {ev.get('head_sha')} != live {head}")
    if ev.get("tree_sha") != tree:
        failures.append(f"tree mismatch: recorded {ev.get('tree_sha')} != live {tree}")
    if ev.get("worktree") != ("clean" if not worktree else "dirty"):
        failures.append("worktree status mismatch")

    # CI binding: a green CI recorded against a DIFFERENT head is not evidence.
    ci_head = ((ev.get("ci") or {}).get("head_sha") or "").lower()
    if ci_head and ci_head != ev.get("head_sha", "").lower():
        failures.append("CI head_sha != evidence head_sha (prior green CI reused illegally)")

    # Remote readback
    remote = (ev.get("read_back") or {}).get("remote_sha")
    if remote:
        try:
            origin_head = git(["rev-parse", f"origin/{ev.get('read_back', {}).get('remote_branch', 'main')}"])
            print(f"remote {ev.get('read_back', {}).get('remote_branch')}={origin_head}")
            if origin_head != remote:
                failures.append(f"remote readback mismatch: recorded {remote} != origin {origin_head}")
            else:
                print("remote readback verified")
        except RuntimeError as e:
            failures.append(f"remote readback unavailable: {e}")
    else:
        failures.append("no remote readback provided (cannot verify release)")

    if failures:
        print("\nRELEASE_EVIDENCE=FAIL")
        for f in failures:
            print(" -", f)
        return 1

    print("\nRELEASE_EVIDENCE=OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
