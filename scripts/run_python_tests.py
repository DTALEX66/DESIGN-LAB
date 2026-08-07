#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Root Python test entrypoint for OPEN-DESIGN-Assistance (ODA4-0103).

Discovers and runs every `test_*.py` unittest module under
`opendesign-assistance/tests/`. Exits non-zero if any test fails.

Usage:
    python scripts/run_python_tests.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_DIR = ROOT / "opendesign-assistance" / "tests"


def main() -> int:
    if not TEST_DIR.exists():
        print(f"test dir not found: {TEST_DIR}")
        return 1
    suite = unittest.defaultTestLoader.discover(
        start_dir=str(TEST_DIR),
        pattern="test_*.py",
        top_level_dir=str(TEST_DIR),
    )
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
