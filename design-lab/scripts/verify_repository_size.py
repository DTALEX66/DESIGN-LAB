#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Validate that repository-size governance remains observational and bounded."""
from __future__ import annotations

import json
import sys
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "config" / "repository-size-report.json"


def main() -> int:
    try:
        report = json.loads(PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"REPOSITORY_SIZE=FAIL reason={exc}")
        return 1
    errors = []
    if report.get("historyRewriteAuthorized") is not False:
        errors.append("history rewrite must remain unauthorized")
    if report.get("warningMiB") != 224.0 or report.get("limitMiB") != 256.0:
        errors.append("budget thresholds changed")
    if report.get("status") not in {"OK", "WARNING", "OVER_LIMIT"}:
        errors.append("invalid budget status")
    for error in errors:
        print(f"FAIL {error}")
    print(f"REPOSITORY_SIZE={'PASS' if not errors else 'FAIL'} status={report.get('status')}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
