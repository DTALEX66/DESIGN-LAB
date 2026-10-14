#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Root Python test entrypoint for DESIGN-LAB (ODA4-0103).

Discovers and runs every `test_*.py` unittest module under
`design-lab/tests/`. Exits non-zero if any test fails.

Also writes a per-test timing record into this run's project-local directory, because the next
decision about this suite is a sharding decision and it cannot be made from a total. Measured
2026-10-13/14 on the same 3011 tests: 557.124s in one run, 990.101s in an earlier failing run.
A 433s spread with no per-test number behind it is exactly the situation where the tempting move
-- "parallelise it" -- is a guess. This records what actually ran, so the split can be chosen from
data: test id, module, class, wall time, outcome and skip reason.

Unittest stays the executor. Moving to pytest-xdist here would add an unrelated migration to a
batch whose subject is feedback time.

Usage:
    python scripts/run_python_tests.py
"""
from __future__ import annotations

import json
import os
import sys
# Suppress repository bytecode before importing the local environment helper.
if __name__ == '__main__':
    sys.dont_write_bytecode = True
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_DIR = ROOT / "design-lab" / "tests"
sys.path.insert(0, str(ROOT / 'src'))
from design_lab.runtime.paths import PathPolicyError
from design_lab.runtime.test_environment import project_test_environment


class _TimingResult(unittest.TextTestResult):
    """Per-test wall time, outcome and skip reason; what the run reports is unchanged.

    Timing is taken in `stopTest`, which runs after the outcome method and after tearDown, so a
    row's `seconds` is setup + call + teardown. That is the coarse figure a sharding decision
    needs; attributing the three phases separately would mean wrapping every TestCase, which is a
    larger change than this batch is for.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.records: list[dict[str, object]] = []
        self._started: dict[str, float] = {}
        self._status: dict[str, str] = {}
        self._reason: dict[str, str] = {}

    def startTest(self, test) -> None:  # noqa: N802 (unittest's spelling)
        self._started[test.id()] = time.perf_counter()
        super().startTest(test)

    def _mark(self, test, status: str, reason: str | None = None) -> None:
        self._status[test.id()] = status
        if reason:
            self._reason[test.id()] = reason

    def addSuccess(self, test) -> None:  # noqa: N802
        self._mark(test, 'PASS')
        super().addSuccess(test)

    def addFailure(self, test, err) -> None:  # noqa: N802
        self._mark(test, 'FAIL')
        super().addFailure(test, err)

    def addError(self, test, err) -> None:  # noqa: N802
        self._mark(test, 'ERROR')
        super().addError(test, err)

    def addSkip(self, test, reason) -> None:  # noqa: N802
        # A skipped browser wrapper is not a passed browser check, so the reason travels with the
        # row instead of the row being counted as a pass.
        self._mark(test, 'SKIP', reason)
        super().addSkip(test, reason)

    def addExpectedFailure(self, test, err) -> None:  # noqa: N802
        self._mark(test, 'EXPECTED_FAILURE')
        super().addExpectedFailure(test, err)

    def addUnexpectedSuccess(self, test) -> None:  # noqa: N802
        # Kept apart from PASS on purpose: an xfail that starts passing is a result change, and
        # folding it into the pass count is how it stops being visible.
        self._mark(test, 'UNEXPECTED_SUCCESS')
        super().addUnexpectedSuccess(test)

    def addSubTest(self, test, subtest, err) -> None:  # noqa: N802
        if err is not None:
            self._mark(test, 'FAIL', f'subtest failed: {subtest.id()}')
        super().addSubTest(test, subtest, err)

    def stopTest(self, test) -> None:  # noqa: N802
        identifier = test.id()
        started = self._started.pop(identifier, None)
        self.records.append({
            'id': identifier,
            'module': type(test).__module__,
            'class': type(test).__name__,
            'method': getattr(test, '_testMethodName', None),
            'status': self._status.pop(identifier, 'PASS'),
            'seconds': None if started is None else round(time.perf_counter() - started, 6),
            'skip_reason': self._reason.pop(identifier, None),
        })
        super().stopTest(test)


def _timing_document(result: _TimingResult, wall_seconds: float) -> dict:
    by_module: dict[str, dict[str, object]] = {}
    for row in result.records:
        bucket = by_module.setdefault(str(row['module']),
                                      {'tests': 0, 'seconds': 0.0, 'failures': 0, 'skipped': 0})
        bucket['tests'] = int(bucket['tests']) + 1
        bucket['seconds'] = round(float(bucket['seconds']) + float(row['seconds'] or 0.0), 6)
        if row['status'] in ('FAIL', 'ERROR', 'UNEXPECTED_SUCCESS'):
            bucket['failures'] = int(bucket['failures']) + 1
        if row['status'] == 'SKIP':
            bucket['skipped'] = int(bucket['skipped']) + 1
    return {
        'schemaVersion': 'design-lab/python-test-timing/v1',
        'tests': len(result.records),
        'wall_seconds': round(wall_seconds, 6),
        'sum_test_seconds': round(sum(float(r['seconds'] or 0.0) for r in result.records), 6),
        'outcomes': {status: sum(1 for r in result.records if r['status'] == status)
                     for status in sorted({str(r['status']) for r in result.records})},
        'by_module': dict(sorted(by_module.items(),
                                 key=lambda item: float(item[1]['seconds']), reverse=True)),
        'records': sorted(result.records, key=lambda r: float(r['seconds'] or 0.0), reverse=True),
        'meaning': 'per-test wall time for this run on this machine; a sharding decision reads '
                   'by_module, and no row here is a stability claim about another host',
    }


def _write_timing(document: dict) -> Path | None:
    """Write into this run's own project-local directory, the one the environment just made."""
    temp = os.environ.get('TEMP')
    if not temp:
        return None
    try:
        target = Path(temp).parent / 'python-tests-timing.json'
        target.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n',
                          encoding='utf-8', newline='\n')
    except OSError as exc:
        print(f'PYTHON_TESTS_TIMING_UNWRITTEN {type(exc).__name__}: {exc}')
        return None
    return target


def _run() -> int:
    if not TEST_DIR.exists():
        print(f"test dir not found: {TEST_DIR}")
        return 1
    suite = unittest.defaultTestLoader.discover(
        start_dir=str(TEST_DIR),
        pattern="test_*.py",
        top_level_dir=str(TEST_DIR),
    )
    if suite.countTestCases() == 0:
        print('TEST_SELECTION_EMPTY: no test cases discovered')
        return 2
    runner = unittest.TextTestRunner(verbosity=1, resultclass=_TimingResult)
    started = time.perf_counter()
    result = runner.run(suite)
    wall = time.perf_counter() - started

    document = _timing_document(result, wall)
    written = _write_timing(document)
    print(f"PYTHON_TESTS_TIMING={'WROTE ' + str(written) if written else 'NOT_WRITTEN'} "
          f"tests={document['tests']} wall_seconds={document['wall_seconds']} "
          f"outcomes={document['outcomes']}")
    for row in document['records'][:10]:
        print(f"PYTHON_TESTS_SLOW {row['seconds']:>9.3f}s {row['status']:<10} {row['id']}")
    for module, bucket in list(document['by_module'].items())[:10]:
        print(f"PYTHON_TESTS_MODULE {float(bucket['seconds']):>9.3f}s "
              f"tests={bucket['tests']} failures={bucket['failures']} {module}")
    return 0 if result.wasSuccessful() else 1


def main() -> int:
    try:
        with project_test_environment('python-tests'):
            return _run()
    except (PathPolicyError, OSError) as exc:
        print(f'TEST_ENVIRONMENT_FAIL: {exc}')
        return 2


if __name__ == "__main__":
    sys.exit(main())
