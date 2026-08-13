#!/usr/bin/env python3
"""DL-CI-001: Identity-boundary gate.

Fail-closed: active product paths must not contain the legacy identity
(OPEN-DESIGN-Assistance / design-lab / Open Design Assistance)
unless in an explicit allowlist (history, host adapters, source references).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Legacy identity patterns
LEGACY = [
    r"OPEN[- ]DESIGN[- ]Assistance",
    r"opendesign[-_]assistance",
    r"Open Design Assistance",
]

# Allowlisted roots (history + host adapter projection + source refs)
ALLOW_ROOT_PREFIXES = (
    "project-memory/history/",
    "reports/history/",
    "minigame-runtime/docs/history/",
    "design-lab/adapters/hosts/open-design/",
)

# Files that may legitimately reference the legacy name
ALLOW_FILES_SUFFIX = (
    "DL-MIG-000-baseline.md",
    "migration",
    "MIGRATION",
)


def scan() -> list[str]:
    hits: list[str] = []
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT).as_posix()
        if any(rel.startswith(prefix) for prefix in ALLOW_ROOT_PREFIXES):
            continue
        if any(rel.endswith(sfx) for sfx in ALLOW_FILES_SUFFIX):
            continue
        if rel == "design-lab/scripts/verify_identity_gate.py":
            continue  # self (pattern definitions)
        # Host-adapter projection scripts keep legacy-derived filenames (F1 allowance)
        if rel in (
            "design-lab/scripts/verify_open_design_assistance.py",
            "design-lab/scripts/generate_open_design_indexes.py",
            "design-lab/scripts/scaffold_open_design_plugin.py",
            "design-lab/scripts/install_op_expert_suite.py",
            "design-lab/scripts/doctor_open_design_windows.py",
        ):
            continue
        if "/.git/" in rel or rel.startswith(".git") or ".hermes" in rel:
            continue
        if "node_modules" in rel or "__pycache__" in rel or ".pytest_cache" in rel:
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except Exception:
            continue
        # Exempt lines that declare the legacy name retired (prohibition/history context)
        exempt_lines = []
        for line in text.splitlines():
            if any(w in line for w in ["退出活动", "历史归档", "不再作为活动", "仅允许出现在", "retired"]):
                exempt_lines.append(line)
        for exempt in exempt_lines:
            text = text.replace(exempt, "")
        for pattern in LEGACY:
            if re.search(pattern, text, re.IGNORECASE):
                hits.append(f"{rel}: {pattern}")
                break
    return hits


def main() -> int:
    hits = scan()
    if hits:
        print(f"IDENTITY_GATE=FAIL total={len(hits)}")
        for h in hits[:30]:
            print(f"  {h}")
        return 1
    print("IDENTITY_GATE=OK total=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
