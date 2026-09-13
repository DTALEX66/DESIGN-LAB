#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-D030 — clean regenerable runtime cache and temp, under the taskpack's rules.

The taskpack (section 32 / DLDS-I000) allows an automatic delete only for
recreatable cache, temp, duplicate generated output and a confirmed obsolete
runtime copy, and requires a hash, a confirmed replacement, no active references,
a delete manifest and an immediate restore path. Everything else needs owner
approval.

This script therefore splits the ignored runtime tree into exactly two classes:

* **TEMP_CACHE** — ``**/tmp/**``, ``**/__pycache__/**``, ``.pytest_cache/**``,
  ``**/pip-cache/**``. These hold no evidence: they are rebuildable by running the
  same command again. Deleted with a manifest that records path, bytes and file
  count, and the recreation command.
* **EVIDENCE_BEARING** — everything else, including qualification virtual
  environments and run directories that tracked documents and the task ledger
  reference. Reported with exact sizes as ``OWNER_DELETE_APPROVAL_REQUIRED``.

It never touches anything outside the ignored runtime roots and never follows a
link out of them.

Usage:
    python scripts/deepseek_runtime_cleanup.py --plan
    python scripts/deepseek_runtime_cleanup.py --apply
    python scripts/deepseek_runtime_cleanup.py --restore
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ROOTS = (".project-local", ".hermes")
MANIFEST = REPO / ".project-local/quarantine/deepseek-round1/RUNTIME-CLEANUP-MANIFEST.json"
OUT = REPO / "reports/current/RUNTIME-CLEANUP-PLAN.json"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-D030"
TEMP_MARKERS = ("/tmp/", "/__pycache__/", "/pip-cache/", "/.cache/")
TEMP_PREFIXES = (".pytest_cache/",)
RECREATION = {
    "__pycache__": "python regenerates it on the next import",
    "tmp": "the producing command recreates its temp directory",
    ".pytest_cache": "the next pytest run recreates it",
    "pip-cache": "the next pip/uv install re-downloads the wheels",
    ".cache": "the next tool invocation recreates it",
}


def classify(rel: str) -> tuple:
    posix = rel.replace("\\", "/") + ("" if rel.endswith("/") else "")
    if any(prefix in posix for prefix in TEMP_PREFIXES) or any(marker in "/" + posix for marker in TEMP_MARKERS):
        for marker in ("__pycache__", "pip-cache", ".pytest_cache", "tmp", ".cache"):
            if marker in posix:
                return "TEMP_CACHE", RECREATION.get(marker, "recreated by the producing command")
        return "TEMP_CACHE", "recreated by the producing command"
    return "EVIDENCE_BEARING", "referenced as run output or evidence; owner approval required"


def measure(path: Path) -> tuple:
    files = 0
    total = 0
    digest = hashlib.sha256()
    for item in sorted(path.rglob("*")):
        try:
            if not item.is_file():
                continue
            size = item.stat().st_size
        except OSError:
            continue
        files += 1
        total += size
        digest.update(str(item.relative_to(path)).encode("utf-8"))
        digest.update(str(size).encode("utf-8"))
    return files, total, "sha256:" + digest.hexdigest()


def collect() -> tuple:
    deletable, protected = [], []
    for root_name in ROOTS:
        root = REPO / root_name
        if not root.is_dir():
            continue
        for path in sorted(root.iterdir()):
            if not path.is_dir():
                continue
            if path.name in {"__pycache__", "tmp", ".pytest_cache", "pip-cache", ".cache"}:
                files, size, digest = measure(path)
                kind, reason = classify(f"{root_name}/{path.name}")
                deletable.append({"path": str(path.relative_to(REPO)).replace("\\", "/"),
                                  "classification": kind, "files": files, "bytes": size,
                                  "digest": digest, "reason": reason})
                continue
            for child in sorted(path.rglob("*")):
                if not child.is_dir():
                    continue
                name = child.name
                if name not in {"__pycache__", "tmp", ".pytest_cache", "pip-cache", ".cache"}:
                    continue
                files, size, digest = measure(child)
                kind, reason = classify(str(child.relative_to(REPO)))
                deletable.append({"path": str(child.relative_to(REPO)).replace("\\", "/"),
                                  "classification": kind, "files": files, "bytes": size,
                                  "digest": digest, "reason": reason})
            files, size, digest = measure(path)
            protected.append({"path": str(path.relative_to(REPO)).replace("\\", "/"),
                              "classification": "EVIDENCE_BEARING", "files": files, "bytes": size,
                              "digest": digest,
                              "reason": "tracked documents, the task ledger or qualification "
                                        "fixtures reference this run directory"})
    # A deletable nested inside a protected run directory is still deletable; a
    # protected entry that fully contains a deletable is reported as-is.
    deletable = [d for d in deletable if d["files"] > 0]
    return deletable, protected


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan", action="store_true")
    group.add_argument("--apply", action="store_true")
    group.add_argument("--restore", action="store_true")
    args = parser.parse_args(argv)
    deletable, protected = collect()
    deletable_bytes = sum(d["bytes"] for d in deletable)
    protected_bytes = sum(p["bytes"] for p in protected)
    document = {
        "schemaVersion": "design-lab/runtime-cleanup-plan/v1",
        "task_key": TASK_KEY,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "temp_cache": {"entries": len(deletable), "bytes": deletable_bytes,
                       "mib": round(deletable_bytes / 1048576, 2), "members": deletable},
        "evidence_bearing": {"entries": len(protected), "bytes": protected_bytes,
                             "mib": round(protected_bytes / 1048576, 2),
                             "members": protected[:40],
                             "verdict": "OWNER_DELETE_APPROVAL_REQUIRED"},
    }
    if args.plan:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n",
                       encoding="utf-8", newline="\n")
        print(f"RUNTIME_CLEANUP=PLAN temp_cache={len(deletable)} entries "
              f"{deletable_bytes / 1048576:.1f} MiB | evidence_bearing={len(protected)} entries "
              f"{protected_bytes / 1048576:.1f} MiB (owner approval)")
        for entry in sorted(deletable, key=lambda e: -e["bytes"])[:10]:
            print(f"  {entry['bytes'] / 1048576:9.2f} MiB  {entry['path']}")
        return 0
    if args.restore:
        if not MANIFEST.is_file():
            print("RESTORE=FAIL no manifest: nothing was deleted by this tool")
            return 1
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        print(f"RESTORE: {len(manifest['deleted'])} entries were cache/temp; recreate them by "
              f"re-running the producing commands ({manifest['recreation']}). No file copy can "
              "restore a cache, which is why only cache/temp is deleted here.")
        return 0
    # apply
    for entry in deletable:
        target = REPO / entry["path"]
        if target.is_dir():
            shutil.rmtree(target, ignore_errors=False)
            print(f"deleted {entry['path']} ({entry['bytes'] / 1048576:.2f} MiB, "
                  f"{entry['files']} files)")
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({
        "schemaVersion": "design-lab/runtime-cleanup-manifest/v1",
        "task_key": TASK_KEY,
        "deleted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "policy": "only recreatable cache/temp; evidence-bearing runs are untouched",
        "recreation": {k: v for k, v in RECREATION.items()},
        "deleted": deletable,
        "bytes_reclaimed": deletable_bytes,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"RUNTIME_CLEANUP=APPLIED reclaimed={deletable_bytes / 1048576:.1f} MiB "
          f"entries={len(deletable)} manifest={MANIFEST.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
