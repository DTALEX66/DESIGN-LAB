#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Root Python test entrypoint for DESIGN-LAB (ODA4-0103).

Discovers and runs every `test_*.py` unittest module under
`design-lab/tests/`. Exits non-zero if any test fails.

Usage:
    python scripts/run_python_tests.py
"""
from __future__ import annotations

import sys
# Suppress repository bytecode before importing the local environment helper.
if __name__ == '__main__':
    sys.dont_write_bytecode = True
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_DIR = ROOT / "design-lab" / "tests"
sys.path.insert(0, str(ROOT / 'src'))
from design_lab.runtime.paths import PathPolicyError
from design_lab.runtime.test_environment import project_test_environment


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
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
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
