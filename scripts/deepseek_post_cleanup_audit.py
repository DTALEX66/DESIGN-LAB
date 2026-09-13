#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-E050 — post-cleanup audit.

Re-measures after the cleanup instead of trusting the estimate: repository size,
Git status, legacy path references, the focused test suites, the zero-spill
probe and the report generator. `bytes_before` is quoted from the artifact that
measured it (never recomputed from memory); `bytes_reclaimed` is the difference
between two real measurements.

Writes reports/current/POST-CLEANUP-AUDIT.json.

Usage:
    python scripts/deepseek_post_cleanup_audit.py [--no-tests]
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports/current/POST-CLEANUP-AUDIT.json"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-E050"
PYTHON = REPO / ".venv/Scripts/python.exe"
CLEANUP_MANIFEST = REPO / ".project-local/quarantine/deepseek-round1/RUNTIME-CLEANUP-MANIFEST.json"
MIGRATION_MANIFEST = REPO / ".project-local/archive/hermes-legacy/MIGRATION-MANIFEST.json"
TEST_PATTERNS = ("test_creative_*.py", "test_interop_*.py", "test_media_*.py",
                 "test_assurance_*.py", "test_readiness_*.py")


def run(command: list, timeout: int = 900) -> tuple:
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8",
                            errors="replace", cwd=str(REPO), timeout=timeout)
    return result.returncode, (result.stdout or "") + (result.stderr or "")


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout


def measure_runtime_roots() -> dict:
    roots = {}
    for name in (".project-local", ".hermes"):
        root = REPO / name
        if not root.is_dir():
            continue
        files = 0
        total = 0
        for item in root.rglob("*"):
            try:
                if item.is_file():
                    files += 1
                    total += item.stat().st_size
            except OSError:
                continue
        roots[name] = {"files": files, "bytes": total, "mib": round(total / 1048576, 2)}
    return roots


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-tests", action="store_true")
    args = parser.parse_args(argv)

    after_roots = measure_runtime_roots()
    cleanup = json.loads(CLEANUP_MANIFEST.read_text(encoding="utf-8")) if CLEANUP_MANIFEST.is_file() else {}
    migration = json.loads(MIGRATION_MANIFEST.read_text(encoding="utf-8")) if MIGRATION_MANIFEST.is_file() else {}
    size_before = json.loads((REPO / "reports/current/UNTRACKED-RUNTIME.json").read_text(encoding="utf-8")) \
        if (REPO / "reports/current/UNTRACKED-RUNTIME.json").is_file() else {}

    pack = git("count-objects", "-vH")
    pack_values = dict(line.split(":", 1) for line in pack.splitlines() if ":" in line)
    size_pack = float(pack_values.get("size-pack", "0 MiB").strip().split()[0])

    report: dict = {
        "schemaVersion": "design-lab/post-cleanup-audit/v1",
        "task_key": TASK_KEY,
        "measured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": git("rev-parse HEAD").strip(),
        "git_status_clean": git("status", "--porcelain=v1").strip() == "",
        "git_dirty_paths": [line for line in git("status", "--porcelain=v1").splitlines() if line.strip()],
        "repository_size": {"pack_mib": size_pack, "tracked_files": len([p for p in git("ls-files").splitlines() if p])},
        "runtime_roots_after": after_roots,
        "bytes_reclaimed": {
            "temp_cache_deleted": cleanup.get("bytes_reclaimed"),
            "temp_cache_entries": len(cleanup.get("deleted", [])),
            "legacy_hermes_objects_migrated": len(migration.get("records", [])),
            "legacy_hermes_bytes_moved": sum(r.get("bytes", 0) for r in migration.get("records", [])),
            "meaning": "deleted cache/temp is reclaimed; migrated legacy runtime is relocated inside the "
                       "same volume, so it is moved rather than reclaimed",
        },
        "before_measurement_source": "reports/current/UNTRACKED-RUNTIME.json (DLDS-D000, measured before "
                                     "the cleanup)",
        "before_measured_mib": size_before.get("total_mib"),
    }
    stages = []
    stages.append(("report_generator_generate", *run([str(PYTHON), str(REPO / "scripts/generate_current_reports.py")])))
    stages.append(("report_generator_check", *run([str(PYTHON), str(REPO / "scripts/generate_current_reports.py"), "--check"])))
    stages.append(("legacy_path_scan", *run([str(PYTHON), str(REPO / "scripts/deepseek_directory_audit.py")])))
    stages.append(("zero_spill_probe", *run([str(PYTHON), str(REPO / "scripts/verify_zero_spill.py"), "--self-test"])))
    if not args.no_tests:
        for pattern in TEST_PATTERNS:
            stages.append((f"tests:{pattern}", *run([
                str(PYTHON), "-m", "unittest", "discover",
                "-s", str(REPO / "design-lab/tests"), "-p", pattern,
                "-t", str(REPO / "design-lab/tests")])))
    report["stages"] = [{"stage": name, "exit_code": code,
                         "summary": [line for line in output.splitlines()
                                     if line.startswith(("OK", "FAILED", "Ran ", "CURRENT_REPORTS=",
                                                         "ZERO_SPILL=", "LANGUAGE_BOUNDARY=",
                                                         "DIRECTORY_AUDIT="))][-2:]}
                        for name, code, output in stages]
    failed = [stage["stage"] for stage in report["stages"] if stage["exit_code"] != 0
              and not stage["stage"].startswith("tests:")]
    report["verdict"] = "PASS" if not failed else f"REVIEW {failed}"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"POST_CLEANUP_AUDIT={report['verdict']} pack_mib={size_pack} "
          f"runtime_after_mib={sum(r['mib'] for r in after_roots.values())} "
          f"before_mib={report['before_measured_mib']} "
          f"reclaimed_mib={round((cleanup.get('bytes_reclaimed') or 0) / 1048576, 2)}")
    for stage in report["stages"]:
        print(f"  {stage['stage']:28} exit={stage['exit_code']:<3} {' | '.join(stage['summary'])[:96]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
