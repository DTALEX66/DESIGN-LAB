#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-C000 — language inventory for the whole repository.

Counts tracked files and lines per language, records which directories own each
language, what runtime role it plays, and which build system and dependency
manager actually govern it. The role table is the one the authority taskpack
freezes in section 16; the facts are measured, not asserted.

Writes reports/current/LANGUAGE-INVENTORY.json.

Usage:
    python scripts/deepseek_language_inventory.py [--check]
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports/current/LANGUAGE-INVENTORY.json"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-C000"

# extension -> (language, runtime role)
LANGUAGES = {
    ".py": ("Python", "orchestration, runtime/state, QA, provider logic, reconstruction, "
                      "analysis, CLI and tooling"),
    ".ts": ("TypeScript", "workbench UI, OpenDesign/web integration, MCP client, IPC/web frontend"),
    ".js": ("JavaScript", "host-native extension (Adobe UXP/JSX) or browser-served front end"),
    ".jsx": ("JavaScript (JSX)", "Adobe host-native extension script"),
    ".mjs": ("JavaScript (ESM)", "host-native extension or browser module"),
    ".cjs": ("JavaScript (CommonJS)", "fixture tooling"),
    ".json": ("JSON", "machine-readable configuration and projections"),
    ".sql": ("SQL", "local state schema"),
    ".html": ("HTML", "front-end document"),
    ".css": ("CSS", "front-end styling"),
    ".md": ("Markdown", "documentation"),
    ".yaml": ("YAML", "governance and CI configuration"),
    ".yml": ("YAML", "governance and CI configuration"),
    ".toml": ("TOML", "Python project configuration"),
    ".ps1": ("PowerShell", "thin launcher"),
    ".sh": ("Shell", "thin launcher"),
    ".csv": ("CSV", "evidence data"),
    ".svg": ("SVG", "vector fixture"),
}
CODE_LANGUAGES = {"Python", "TypeScript", "JavaScript", "JavaScript (JSX)",
                  "JavaScript (ESM)", "JavaScript (CommonJS)", "SQL", "HTML", "CSS"}
SCHEMA_LANGUAGES = {"JSON"}

# The taskpack's own build/dependency facts: one entry per language, stated so a
# reader cannot confuse "a file exists" with "a toolchain is declared".
TOOLCHAIN = {
    "Python": {
        "build_system": "hatchling (pyproject.toml [build-system])",
        "dependency_manager": "uv (uv.lock, CI runs 'uv sync --locked')",
        "declared_dependencies": "pyproject.toml [project].dependencies",
        "minimum_python": ">=3.11 (pyproject requires-python)",
        "test_runner": "unittest via scripts/run_python_tests.py (pytest config exists but pytest "
                       "is not installed and the suite is unittest-based)",
        "linter": "ruff DECLARED as the target; not configured and not installed yet",
    },
    "TypeScript": {
        "build_system": "NONE in the product: apps/workbench/main.ts is served as source",
        "dependency_manager": "NONE: there is no root package.json and no lockfile",
        "test_runner": "none",
        "linter": "none",
    },
    "JavaScript": {
        "build_system": "none: host-native scripts are loaded by the host",
        "dependency_manager": "n/a",
        "test_runner": "n/a",
        "linter": "n/a",
    },
}


def tracked() -> list:
    return [line for line in subprocess.run(["git", "-C", str(REPO), "ls-files"], capture_output=True,
                                            text=True, encoding="utf-8").stdout.splitlines()
            if line.strip()]


def count_lines(path: Path) -> tuple:
    try:
        if path.stat().st_size > 4_000_000:
            return 0, 0
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return 0, 0
    lines = text.splitlines()
    blank = sum(1 for line in lines if not line.strip())
    return len(lines), len(lines) - blank


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    files = tracked()
    stats = {}
    unmapped = []
    for rel in files:
        path = REPO / rel
        suffix = path.suffix.lower()
        if suffix not in LANGUAGES:
            unmapped.append(rel)
            continue
        language = LANGUAGES[suffix][0]
        entry = stats.setdefault(language, {"files": 0, "lines": 0, "code_lines": 0,
                                            "bytes": 0, "by_area": {}})
        lines, code = count_lines(path)
        size = path.stat().st_size if path.is_file() else 0
        area = rel.split("/")[0]
        entry["files"] += 1
        entry["lines"] += lines
        entry["code_lines"] += code
        entry["bytes"] += size
        bucket = entry["by_area"].setdefault(area, {"files": 0, "lines": 0})
        bucket["files"] += 1
        bucket["lines"] += lines
    languages = []
    for language, entry in sorted(stats.items(), key=lambda kv: -kv[1]["files"]):
        toolchain = TOOLCHAIN.get(language, {})
        languages.append({
            "language": language,
            "file_count": entry["files"],
            "loc_total": entry["lines"],
            "loc_nonblank": entry["code_lines"],
            "bytes": entry["bytes"],
            "owner_directories": sorted(entry["by_area"], key=lambda a: -entry["by_area"][a]["files"]),
            "by_area": entry["by_area"],
            "runtime_role": next(role for ext, (name, role) in LANGUAGES.items() if name == language),
            "build_system": toolchain.get("build_system", "not declared"),
            "dependency_manager": toolchain.get("dependency_manager", "not declared"),
            "test_runner": toolchain.get("test_runner", "not declared"),
            "linter": toolchain.get("linter", "not declared"),
        })
    code_totals = {row["language"]: row["loc_nonblank"] for row in languages
                   if row["language"] in CODE_LANGUAGES}
    document = {
        "schemaVersion": "design-lab/language-inventory/v1",
        "task_key": TASK_KEY,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"],
                                      capture_output=True, text=True,
                                      encoding="utf-8").stdout.strip(),
        "tracked_files_total": len(files),
        "languages": languages,
        "code_languages": sorted(code_totals),
        "code_nonblank_lines": code_totals,
        "unmapped_extension_files": len(unmapped),
        "unmapped_sample": unmapped[:20],
        "policy": {
            "primary_languages": ["Python", "TypeScript", "JavaScript (host-native)", "JSON/JSON Schema"],
            "contract_language": "JSON Schema 2020-12 is the cross-language contract truth",
            "rust": "NOT_PRIMARY: allowed only with benchmark evidence, an ADR and a named bottleneck",
            "forbidden_without_adr": ["C#", "Go", "Java", "Kotlin", "C++",
                                      "a second Python runtime architecture",
                                      "a second Node backend"],
        },
    }
    if args.check:
        if not OUT.is_file():
            print("LANGUAGE_INVENTORY=FAIL missing")
            return 1
        current = json.loads(OUT.read_text(encoding="utf-8"))
        same = [(row["language"], row["file_count"]) for row in current["languages"]] == \
               [(row["language"], row["file_count"]) for row in languages]
        print("LANGUAGE_INVENTORY=" + ("PASS" if same else "DRIFT"))
        return 0 if same else 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8", newline="\n")
    print(f"LANGUAGE_INVENTORY=WRITTEN {OUT.relative_to(REPO)} "
          f"languages={len(languages)} tracked={len(files)} unmapped={len(unmapped)}")
    for row in languages[:12]:
        print(f"  {row['language']:22} files={row['file_count']:5} nonblank={row['loc_nonblank']:7} "
              f"areas={len(row['owner_directories'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
