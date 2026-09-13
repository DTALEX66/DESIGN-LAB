#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-E010 — zero-spill future gate.

A DESIGN-LAB task may write only inside the repository's tracked/authorized tree,
inside ``.project-local``, or inside an explicitly declared external cache. A file
that appears anywhere else is `SPILL_DETECTED`.

The gate works by snapshot and diff, because "we did not spill" is only provable
by comparing the file system before and after the work:

    python scripts/verify_zero_spill.py --snapshot before
    <run the DESIGN-LAB task>
    python scripts/verify_zero_spill.py --diff before

Agent homes are observed at path level only. Their contents are never read, and
entries the agent owns (sessions, memory, credentials) are excluded from the
comparison by name so that the harness's own bookkeeping is not reported as a
DESIGN-LAB spill.

Usage:
    python scripts/verify_zero_spill.py --snapshot ID
    python scripts/verify_zero_spill.py --diff ID
    python scripts/verify_zero_spill.py --self-test
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SNAPSHOT_DIR = REPO / ".project-local/task-artifacts/zero-spill"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-E010"
HOME = Path(os.environ.get("USERPROFILE", Path.home()))
# Roots whose changes are allowed for a DESIGN-LAB task.
ALLOWED_ROOTS = (REPO, REPO / ".project-local")
# Observed but not allowed to change.
WATCHED_AGENT_HOMES = {".hermes": "Hermes", ".codex": "Codex", ".dsh": "DSH"}
AGENT_NATIVE_NAMES = {"sessions", "archived_sessions", "memories", "memory", "log", "logs", "tmp",
                      ".tmp", "cache", "browser", "attachments", "task-board", "storages",
                      "generated_images", "computer-use", "marketplaces", "automations",
                      "dictation-history", "profiles", "plugins", "desktop-plugins", "skin-center",
                      "sandbox", ".sandbox", ".sandbox-bin", ".sandbox-secrets", "agent-presets",
                      ".agent-presets"}
SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache"}
MAX_ENTRIES = 200_000


def scan(root: Path, *, depth: int = 3) -> dict:
    """Path-level inventory: relative path -> (size, mtime). Never reads content."""
    entries = {}
    if not root.is_dir():
        return entries
    base_depth = len(root.parts)
    for current, dirs, files in os.walk(root):
        current_path = Path(current)
        if len(current_path.parts) - base_depth >= depth:
            dirs[:] = []
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files + dirs:
            path = current_path / name
            try:
                stat = path.stat()
            except OSError:
                continue
            entries[str(path)] = [stat.st_size, int(stat.st_mtime)]
            if len(entries) > MAX_ENTRIES:
                return entries
    return entries


def snapshot(snapshot_id: str) -> int:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    document = {
        "schemaVersion": "design-lab/zero-spill-snapshot/v1",
        "task_key": TASK_KEY,
        "snapshot_id": snapshot_id,
        "taken_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"],
                                      capture_output=True, text=True,
                                      encoding="utf-8").stdout.strip(),
        "repo": scan(REPO, depth=8),
        "agent_homes": {name: scan(HOME / name, depth=2) for name in WATCHED_AGENT_HOMES},
    }
    path = SNAPSHOT_DIR / f"{snapshot_id}.json"
    path.write_text(json.dumps(document, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"ZERO_SPILL_SNAPSHOT={snapshot_id} repo_entries={len(document['repo'])} "
          f"agent_entries={sum(len(v) for v in document['agent_homes'].values())} "
          f"file={path.relative_to(REPO)}")
    return 0


def allowed(path: str) -> bool:
    candidate = Path(path)
    for root in ALLOWED_ROOTS:
        try:
            candidate.relative_to(root)
            return True
        except ValueError:
            continue
    return False


def diff(snapshot_id: str) -> int:
    path = SNAPSHOT_DIR / f"{snapshot_id}.json"
    if not path.is_file():
        print(f"ZERO_SPILL=FAIL missing snapshot {snapshot_id}")
        return 1
    before = json.loads(path.read_text(encoding="utf-8"))
    subject_sha = subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"], capture_output=True,
                                 text=True, encoding="utf-8").stdout.strip()
    report = {"schemaVersion": "design-lab/zero-spill-diff/v1", "task_key": TASK_KEY,
              "snapshot_id": snapshot_id, "compared_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "snapshot_sha": before["subject_sha"], "current_sha": subject_sha,
              "same_subject": before["subject_sha"] == subject_sha,
              "roots": {}}
    spill = []
    for label, root in (("repo", REPO), *((f"agent:{name}", HOME / name)
                                          for name in WATCHED_AGENT_HOMES)):
        if label == "repo":
            current = scan(root, depth=8)
            previous = before["repo"]
            exempt = False
        else:
            name = label.split(":", 1)[1]
            current = scan(root, depth=2)
            previous = before["agent_homes"].get(name, {})
            exempt = True
        new = sorted(set(current) - set(previous))
        removed = sorted(set(previous) - set(current))
        changed = sorted(p for p in set(current) & set(previous) if current[p] != previous[p])
        root_spill = []
        for candidate in new:
            if label == "repo" and allowed(candidate):
                continue
            if exempt and Path(candidate).name in AGENT_NATIVE_NAMES:
                continue
            root_spill.append(candidate)
        report["roots"][label] = {"new": len(new), "removed": len(removed), "changed": len(changed),
                                  "spill": root_spill[:50], "exempt": exempt}
        spill.extend(root_spill)
    report["spill_total"] = len(spill)
    report["verdict"] = "NO_SPILL_DETECTED" if not spill else "SPILL_DETECTED"
    report["meaning"] = ("paths outside the repository, .project-local and the declared external "
                         "caches; agent-native bookkeeping names are excluded")
    (SNAPSHOT_DIR / f"{snapshot_id}-diff.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"ZERO_SPILL={report['verdict']} spill={len(spill)} "
          f"repo_new={report['roots']['repo']['new']} repo_changed={report['roots']['repo']['changed']}")
    for item in spill[:10]:
        print("  SPILL:", item)
    return 0 if not spill else 1


def self_test() -> int:
    """Run a real read-only DESIGN-LAB command between two snapshots."""
    before_id = "self-test-before"
    if snapshot(before_id) != 0:
        return 1
    command = [str(REPO / ".venv/Scripts/python.exe"),
               str(REPO / "scripts/generate_current_reports.py"), "--check"]
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8",
                            cwd=str(REPO), timeout=300)
    print(f"  task under test: {' '.join(Path(part).name for part in command)} "
          f"exit={result.returncode}")
    return diff(before_id)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--snapshot")
    group.add_argument("--diff")
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    return snapshot(args.snapshot) if args.snapshot else diff(args.diff)


if __name__ == "__main__":
    raise SystemExit(main())
