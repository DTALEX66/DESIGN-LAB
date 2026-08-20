#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-KNW-100/110: verify temporary knowledge governance foundations."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "knowledge/staging/README.md",
    "knowledge/TEMPORARY_AUTHORITY_POLICY.md",
    "knowledge/KNOWLEDGE_LIFECYCLE.md",
    "knowledge/schemas/knowledge-record.schema.json",
    "knowledge/schemas/knowledge-migration-manifest.schema.json",
    "config/knowledge-role-classification.json",
)
REQUIRED_POLICY = ("temporary-design-lab", "ArcheAxis-Knowledge-OS", "migrationStatus: deferred")


def main() -> int:
    errors: list[str] = []
    for relative in REQUIRED:
        path = ROOT / relative
        if not path.is_file():
            errors.append(f"missing {relative}")
    policy = ROOT / "knowledge/TEMPORARY_AUTHORITY_POLICY.md"
    if policy.is_file():
        body = policy.read_text(encoding="utf-8")
        for marker in REQUIRED_POLICY:
            if marker not in body:
                errors.append(f"policy missing {marker}")
    for relative in REQUIRED[-2:]:
        try:
            json.loads((ROOT / relative).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"invalid schema {relative}: {exc}")
    classification = ROOT / "config/knowledge-role-classification.json"
    if classification.is_file():
        try:
            data = json.loads(classification.read_text(encoding="utf-8"))
            if data.get("authorityStatus") != "temporary-design-lab":
                errors.append("classification authorityStatus must be temporary-design-lab")
            if data.get("migrationStatus") != "deferred":
                errors.append("classification migrationStatus must be deferred")
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"invalid classification: {exc}")
    for error in errors:
        print(f"FAIL {error}")
    print(f"KNOWLEDGE_LIFECYCLE={'PASS' if not errors else 'FAIL'} findings={len(errors)}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
