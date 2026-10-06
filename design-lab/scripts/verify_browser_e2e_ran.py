#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Enforce the no-skip policy for the Workbench browser E2E on CI.

`test_workbench_design_layer_e2e.py` and `test_workbench_overflow_gate.py` are
PROBE-driven: when the toolchain (node + a resolvable `playwright` + a matching
Chromium) is present they drive the real browser against the live loopback
service; when it is absent they HONESTLY SKIP. On a clean GitHub runner nothing
is pre-installed, so a naive run would skip and be silently treated as a pass.

This gate makes that impossible in the dedicated `workbench-browser-e2e` CI
job: the job installs the pinned `playwright` (workspace dependency) and its
matching Chromium first, and this script REQUIRES every browser test to actually
RUN and PASS — a skip or failure in ANY module exits non-zero, turning the CI
job red.

Deterministic and stdlib-only (drives the existing unittest shell in-process).
"""
from __future__ import annotations

import importlib
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Both browser gates ride the same required CI job. `test_workbench_overflow_gate`
# is the rendered-geometry gate (nothing clipped / unreachable / sub-11px); it was
# falsified against the pre-fix checkout before being wired in, so it can go red.
TEST_MODULES = (
    "test_workbench_design_layer_e2e",
    "test_workbench_overflow_gate",
)


def main() -> int:
    # The shell test's `E2E_NODE_MODULES` must name the directory that CONTAINS
    # node_modules/. In this workspace the pinned `playwright` dependency is
    # installed per-package, so that directory is apps/workbench (it resolves
    # `apps/workbench/node_modules/playwright`). The matching Chromium is
    # provisioned by the CI job's `playwright install`.
    os.environ.setdefault("E2E_NODE_MODULES", str(ROOT / "apps" / "workbench"))

    sys.path.insert(0, str(ROOT / "src"))
    sys.path.insert(0, str(ROOT / "design-lab" / "tests"))

    loader = unittest.TestLoader()
    ran = skipped = failed = 0
    skip_reasons = []
    for name in TEST_MODULES:
        module = importlib.import_module(name)
        result = unittest.TextTestRunner(verbosity=2).run(
            loader.loadTestsFromModule(module))
        module_tests = result.testsRun
        module_skips = len(result.skipped)
        module_fails = len(result.failures) + len(result.errors)
        print(f"BROWSER_E2E[{name}] ran={module_tests} skipped={module_skips} "
              f"failed={module_fails}")
        if module_tests == 0:
            print(f"BROWSER_E2E_NO_TESTS: nothing was discovered in {name}; fail-closed.")
            return 1
        ran += module_tests
        skipped += module_skips
        failed += module_fails
        skip_reasons.extend((test, reason) for test, reason in result.skipped)

    print(f"BROWSER_E2E ran={ran} skipped={skipped} failed={failed}")
    if skipped:
        for test, reason in skip_reasons:
            print(f"BROWSER_E2E_NO_SKIP_VIOLATION: skipped {test} -> {reason}")
        print("The no-skip policy requires the toolchain to be present and every "
              "browser gate to run. Install the pinned playwright + Chromium and re-run.")
        return 1
    if failed:
        print("BROWSER_E2E FAILED: see the traceback above.")
        return 1
    print("BROWSER_E2E: PASS (ran, no-skip, no-skip policy satisfied)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
