#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Enforce the no-skip policy for the Workbench browser E2E on CI.

`test_workbench_design_layer_e2e.py` is PROBE-driven: when the toolchain
(node + a resolvable `playwright` + a matching Chromium) is present it drives
the real browser against the live loopback service; when it is absent it
HONESTLY SKIPS. On a clean GitHub runner nothing is pre-installed, so a naive
run would skip and be silently treated as a pass.

This gate makes that impossible in the dedicated `workbench-browser-e2e` CI
job: the job installs the pinned `playwright` (workspace dependency) and its
matching Chromium first, and this script REQUIRES the browser test to actually
RUN and PASS — a skip or failure exits non-zero, turning the CI job red.

Deterministic and stdlib-only (drives the existing unittest shell in-process).
"""
from __future__ import annotations

import importlib
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEST_MODULE = "test_workbench_design_layer_e2e"


def main() -> int:
    # The shell test's `E2E_NODE_MODULES` must name the directory that CONTAINS
    # node_modules/. In this workspace the pinned `playwright` dependency is
    # installed per-package, so that directory is apps/workbench (it resolves
    # `apps/workbench/node_modules/playwright`). The matching Chromium is
    # provisioned by the CI job's `playwright install`.
    os.environ.setdefault("E2E_NODE_MODULES", str(ROOT / "apps" / "workbench"))

    sys.path.insert(0, str(ROOT / "src"))
    sys.path.insert(0, str(ROOT / "design-lab" / "tests"))

    module = importlib.import_module(TEST_MODULE)
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(module)

    result = unittest.TextTestRunner(verbosity=2).run(suite)

    ran = result.testsRun
    skipped = len(result.skipped)
    failed = len(result.failures) + len(result.errors)
    print(f"BROWSER_E2E ran={ran} skipped={skipped} failed={failed}")
    if ran == 0:
        print("BROWSER_E2E_NO_TESTS: nothing was discovered; fail-closed.")
        return 1
    if skipped:
        for test, reason in result.skipped:
            print(f"BROWSER_E2E_NO_SKIP_VIOLATION: skipped {test} -> {reason}")
        print("The no-skip policy requires the toolchain to be present and the "
              "test to run. Install the pinned playwright + Chromium and re-run.")
        return 1
    if failed:
        print("BROWSER_E2E FAILED: see the traceback above.")
        return 1
    print("BROWSER_E2E: PASS (ran, no-skip, no-skip policy satisfied)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
