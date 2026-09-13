#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-H000 — run a test suite and bind the result to an exact subject.

"1351 OK" is not evidence unless the reader can tell *what* was tested. This
runner records, for every run:

* the subject: commit sha, worktree digest, worktree clean flag;
* what ran: order, seed, pattern, selected modules, repeat count;
* the result: tests run, failures, errors, skipped, exit code, duration;
* the environment fingerprint.

It writes `.project-local/task-artifacts/test-run/last-run.json`, which is exactly
the record `design_lab.governance.reporting.test_run_binding()` reads, so a
regenerated projection can carry the run id instead of a null.

The order and seed replicate `design-lab/scripts/run_test_isolation.py` so an
isolation gate and a bound run describe the same work.

Usage:
    python scripts/run_bound_test_suite.py --order forward
    python scripts/run_bound_test_suite.py --order reverse
    python scripts/run_bound_test_suite.py --order random --seed 42
    python scripts/run_bound_test_suite.py --modules test_asset_store --repeat 20
    python scripts/run_bound_test_suite.py --pattern 'test_creative_*.py'
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import random
import subprocess
import sys
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
TESTS = REPO / "design-lab/tests"
RECORD_DIR = REPO / ".project-local/task-artifacts/test-run"
RECORD = RECORD_DIR / "last-run.json"
HISTORY = RECORD_DIR / "history.jsonl"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-H000"
sys.path.insert(0, str(REPO / "src"))


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def worktree_digest() -> str:
    porcelain = git("status", "--porcelain=v1")
    return "sha256:" + hashlib.sha256((git("rev-parse", "HEAD") + "\n" + porcelain).encode()).hexdigest()


def discover(pattern: str):
    return unittest.defaultTestLoader.discover(start_dir=str(TESTS), pattern=pattern,
                                               top_level_dir=str(TESTS))


def flatten(suite) -> list:
    tests = []
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            tests.extend(flatten(item))
        else:
            tests.append(item)
    return tests


def order_tests(tests: list, order: str, seed: int) -> list:
    if order == "forward":
        return tests
    if order == "reverse":
        return list(reversed(tests))
    shuffled = list(tests)
    random.Random(seed).shuffle(shuffled)
    return shuffled


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", choices=("forward", "reverse", "random"), default="forward")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--pattern", default="test_*.py")
    parser.add_argument("--modules", action="append", default=None)
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--label")
    args = parser.parse_args(argv)

    started = datetime.now(timezone.utc)
    clock = time.monotonic()
    tests = flatten(discover(args.pattern))
    if args.modules:
        wanted = set(args.modules)
        tests = [t for t in tests if any(name in type(t).__module__ for name in wanted)
                 or any(name in str(t) for name in wanted)]
    if not tests:
        print("BOUND_TEST_RUN=FAIL no tests selected")
        return 2
    selected = []
    for _ in range(max(1, args.repeat)):
        selected.extend(order_tests(tests, args.order, args.seed))

    suite = unittest.TestSuite(selected)
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    duration = round(time.monotonic() - clock, 3)
    run_id = (f"testrun-{started.strftime('%Y%m%dT%H%M%SZ')}-{args.order}"
              f"{'' if not args.modules else '-repeat'}-{worktree_digest()[7:19]}")
    record = {
        "schemaVersion": "design-lab/bound-test-run/v1",
        "task_key": TASK_KEY,
        "run_id": run_id,
        "command": " ".join(["python", "scripts/run_bound_test_suite.py", *sys.argv[1:]]),
        "started_at": started.isoformat(timespec="seconds"),
        "finished_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "duration_seconds": duration,
        "result": "OK" if result.wasSuccessful() else "FAILED",
        "exit_code": 0 if result.wasSuccessful() else 1,
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "skipped": len(result.skipped),
        "order": args.order,
        "seed": args.seed if args.order == "random" else None,
        "pattern": args.pattern,
        "modules": args.modules,
        "repeat": args.repeat,
        "selected_cases": len(selected),
        "subject": {"commit_sha": git("rev-parse", "HEAD"),
                    "worktree_digest": worktree_digest(),
                    "worktree_clean": git("status", "--porcelain=v1") == "",
                    "branch": git("rev-parse", "--abbrev-ref", "HEAD")},
        "environment_fingerprint": {"python": platform.python_version(),
                                    "platform": platform.platform(),
                                    "machine": platform.machine()},
        "what_this_proves": "the named tests passed in this order on this exact subject; it proves "
                            "nothing about a different commit or a dirty tree that has moved on",
        "failures_detail": [str(test) for test, _ in result.failures][:20],
        "errors_detail": [str(test) for test, _ in result.errors][:20],
    }
    RECORD_DIR.mkdir(parents=True, exist_ok=True)
    RECORD.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n",
                      encoding="utf-8", newline="\n")
    with HISTORY.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps({k: record[k] for k in
                                 ("run_id", "result", "tests_run", "failures", "errors", "skipped",
                                  "order", "seed", "pattern", "modules", "repeat", "duration_seconds",
                                  "finished_at")}, ensure_ascii=False) + "\n")
    print(f"BOUND_TEST_RUN={record['result']} run_id={run_id} tests={result.testsRun} "
          f"failures={record['failures']} errors={record['errors']} skipped={record['skipped']} "
          f"order={args.order} subject={record['subject']['commit_sha'][:12]} "
          f"clean={record['subject']['worktree_clean']} in {duration}s")
    return record["exit_code"]


if __name__ == "__main__":
    raise SystemExit(main())
