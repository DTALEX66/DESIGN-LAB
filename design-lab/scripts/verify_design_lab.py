#!/usr/bin/env python3
"""DESIGN-LAB canonical verifier entry (DL-MIG-011).

Aggregates the DESIGN-LAB verification chain under one entrypoint:
product manifest, runtime contracts, visual scoring, release evidence,
source registry, v2 protocols and v21 visual quality.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    "verify_identity_gate.py",
    "verify_product_manifest_v3.py",
    "verify_runtime_contracts_v3.py",
    "verify_visual_scoring_v3.py",
    "verify_release_evidence.py",
    "verify_source_registry_v2.py",
    "verify_v2_protocols.py",
    "verify_visual_quality_v21.py",
]


def main() -> int:
    root = Path(__file__).resolve().parent
    results: list[tuple[str, int]] = []
    for name in SCRIPTS:
        script = root / name
        if not script.exists():
            print(f"SKIP {name} (missing)")
            continue
        print(f"\n===== {name} =====")
        r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
        tail = r.stdout.strip().splitlines()
        summary = next((line for line in reversed(tail) if line.startswith(("VERIFY_", "PASS", "FAIL"))), "")
        print(summary)
        results.append((name, r.returncode))
        if r.returncode != 0 and r.stderr.strip():
            print(r.stderr.strip()[-500:])

    failed = [name for name, code in results if code != 0]
    print(f"\nVERIFY_DESIGN_LAB={'OK' if not failed else 'FAIL'} total={len(results)} failed={len(failed)}")
    for name, code in results:
        print(f"  {'PASS' if code == 0 else 'FAIL'} {name}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
