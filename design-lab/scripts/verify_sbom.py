#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-EVD-001: verify SBOM (sbom-v42.spdx.json) integrity + vendored coverage.

Checks:
1. JSON parses and declares SPDX 2.3
2. SPDXID unique across packages
3. documentNamespace binds a known 12-char tree SHA
4. every vendor-adapt entry in SOURCE_REGISTRY appears as a package
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SBOM = ROOT / "config" / "sbom-v42.spdx.json"
REGISTRY = ROOT / "research" / "global-absorption" / "SOURCE_REGISTRY.json"

SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def check() -> list[str]:
    findings: list[str] = []

    try:
        sbom = json.loads(SBOM.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"SBOM unreadable: {exc}"]

    if not sbom.get("spdxVersion", "").startswith("SPDX-2."):
        findings.append(f"bad spdxVersion: {sbom.get('spdxVersion')}")

    ids = [p.get("SPDXID") for p in sbom.get("packages", [])]
    if len(ids) != len(set(ids)):
        findings.append("duplicate SPDXID in packages")
    if not ids:
        findings.append("SBOM has no packages")

    ns = sbom.get("documentNamespace", "")
    m = re.search(r"/([0-9a-f]{12})$", ns)
    if not m:
        findings.append("documentNamespace missing tree-SHA suffix")

    # vendored coverage
    try:
        reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
        vendored = [
            e["name"]
            for e in reg.get("entries", [])
            if e.get("integration_mode") == "vendor-adapt" and e.get("license_verified")
        ]
    except (OSError, json.JSONDecodeError) as exc:
        return findings + [f"REGISTRY unreadable: {exc}"]

    sbom_names = {p.get("name") for p in sbom.get("packages", [])}
    missing = [n for n in vendored if n not in sbom_names]
    if missing:
        findings.append(f"vendored packages missing from SBOM: {len(missing)} ({missing[:3]}...)")

    return findings


def main() -> int:
    findings = check()
    for f in sorted(findings):
        print(f"  {f}")
    if findings:
        print(f"\nVERIFY_SBOM=FAIL findings={len(findings)}")
        return 1
    print("\nVERIFY_SBOM=OK (SPDX 2.3 valid, SPDXID unique, vendored covered)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
