#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Generate every indexed current report; --check is a read-only drift gate."""
from __future__ import annotations

import argparse
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))
from design_lab.governance.reporting import generate


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    try:
        failures = generate(REPO, check=args.check)
    except (OSError, ValueError) as exc:
        print(f"CURRENT_REPORTS=FAIL {exc}")
        return 1
    if failures:
        print("CURRENT_REPORTS=DRIFT " + ", ".join(failures))
        return 1
    print("CURRENT_REPORTS=PASS mode=" + ("check" if args.check else "generate"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
