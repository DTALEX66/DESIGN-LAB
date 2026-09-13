#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-E000 — spill data census.

Scope rules from the authority taskpack (section 27), applied literally:

* the DESIGN-LAB repository and ``.project-local`` may be inspected;
* agent homes (``~/.hermes``, ``~/.codex``, ``~/.dsh``) may be inspected **at
  path and metadata level only**, and only for entries that are identifiably
  DESIGN-LAB owned;
* private chat content, credentials, unrelated sessions and sibling projects are
  NOT read — this script never opens a file outside the repository tree;
* ``E:\\`` is never touched.

For every discovered object it records owner, size, hash (repository objects
only), source path, proposed target path, whether it is recreatable, and the
delete policy that applies.

Writes reports/current/SPILL-CENSUS.json.

Usage:
    python scripts/deepseek_spill_census.py [--check]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports/current/SPILL-CENSUS.json"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-E000"
HOME = Path(os.environ.get("USERPROFILE", Path.home()))
# Agent homes are visited at path level only. Native state is never read.
AGENT_HOMES = {".hermes": "Hermes", ".codex": "Codex", ".dsh": "DSH"}
# Repository-side legacy roots that DESIGN-LAB itself used to write.
REPO_LEGACY_ROOTS = (".hermes/task-runtime", ".hermes/task-artifacts", ".hermes/task-runs")
# Names that belong to the agent, not to DESIGN-LAB, and are never touched.
AGENT_NATIVE_NAMES = {"sessions", "session", "memories", "memory", "credentials", "credentials.yaml",
                      ".credentials.yaml", ".env", "config.yaml", "settings.yaml", "auth.json",
                      "attachments", "browser", "log", "logs", "archived_sessions", "profiles",
                      "storages", "task-board", "desktop-plugins", "skin-center", "computer-use",
                      "dictation-history", "generated_images", "marketplaces", "automations",
                      "skill-call-index.json"}
DESIGN_LAB_MARKERS = ("design-lab", "design_lab", "designlab")


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout


def measure(path: Path) -> tuple:
    files = 0
    total = 0
    digest = hashlib.sha256()
    for item in sorted(path.rglob("*")):
        try:
            if not item.is_file():
                continue
            stat = item.stat()
        except OSError:
            continue
        files += 1
        total += stat.st_size
        digest.update(str(item.relative_to(path)).encode("utf-8"))
        digest.update(str(stat.st_size).encode("utf-8"))
    return files, total, "sha256:" + digest.hexdigest()


def classify(rel: str) -> tuple:
    lowered = rel.lower()
    if "task-artifacts" in lowered or "evidence" in lowered or "task-artifacts" in lowered:
        return "EVIDENCE", "evidence output written by a DESIGN-LAB run"
    if "task-runtime" in lowered or "/runs/" in lowered or "runs/" in lowered:
        return "RUNTIME_STATE", "runtime working data written by a DESIGN-LAB run"
    if "cache" in lowered:
        return "CACHE", "recreatable cache"
    if "tmp" in lowered or "temp" in lowered:
        return "TEMP", "recreatable temporary data"
    if lowered.endswith((".pack", ".whl", ".tar.gz")):
        return "THIRD_PARTY", "third-party distribution material"
    return "UNKNOWN", "no path rule matched; classify before any action"


def repo_legacy_census() -> list:
    objects = []
    for rel_root in REPO_LEGACY_ROOTS:
        root = REPO / rel_root
        if not root.is_dir():
            continue
        for child in sorted(root.iterdir()):
            if not child.is_dir():
                continue
            kind, reason = classify(f"{rel_root}/{child.name}")
            files, size, digest = measure(child)
            empty = files == 0
            if empty:
                reason = (f"{reason}; empty legacy directory left by an older test-isolation era "
                          f"(the namespace now resolves under .project-local)")
            # Keep the runtime/artifact split in the target path: both trees have
            # a child called "reconstruction", and a collision would merge two
            # different datasets.
            bucket = "runtime" if "task-runtime" in rel_root else "artifacts"
            objects.append({
                "owner": "DESIGN-LAB",
                "classification": kind,
                "reason": reason,
                "empty": empty,
                "source_path": str(child.relative_to(REPO)).replace("\\", "/"),
                "target_path": f".project-local/archive/hermes-legacy/{bucket}/{child.name}",
                "files": files,
                "bytes": size,
                "digest": digest,
                "recreatable": kind in {"CACHE", "TEMP"} or empty,
                "delete_policy": ("REMOVE_EMPTY_LEGACY_DIRECTORY" if empty else
                                  "AUTO_WITH_MANIFEST" if kind in {"CACHE", "TEMP", "RUNTIME_STATE",
                                                                   "EVIDENCE"}
                                  else "OWNER_DELETE_APPROVAL_REQUIRED"),
            })
    # Anything at the .hermes root that is not one of the DESIGN-LAB legacy roots.
    root = REPO / ".hermes"
    if root.is_dir():
        for child in sorted(root.iterdir()):
            name = child.name
            if f".hermes/{name}" in REPO_LEGACY_ROOTS or name in {"task-runtime", "task-artifacts"}:
                continue
            size = child.stat().st_size if child.is_file() else measure(child)[1]
            objects.append({
                "owner": "UNPROVEN",
                "classification": "UNKNOWN",
                "reason": "not provably written by DESIGN-LAB; an agent-native artifact must not be "
                          "moved or deleted by this project",
                "source_path": f".hermes/{name}",
                "target_path": None,
                "files": 1 if child.is_file() else measure(child)[0],
                "bytes": size,
                "digest": None,
                "recreatable": False,
                "delete_policy": "DO_NOT_TOUCH",
            })
    return objects


def agent_home_discovery() -> dict:
    """Path-level only: list entries whose NAME identifies them as DESIGN-LAB owned."""
    discovery = {}
    for dirname, product in AGENT_HOMES.items():
        root = HOME / dirname
        entry = {"path": str(root), "exists": root.is_dir(), "product": product,
                 "content_read": False, "native_entries_seen": 0,
                 "design_lab_owned": [], "scope_note": "native sessions, memory, credentials and "
                                                       "unrelated projects are out of scope and unread"}
        if root.is_dir():
            try:
                for child in sorted(root.iterdir()):
                    entry["native_entries_seen"] += 1
                    if child.name in AGENT_NATIVE_NAMES:
                        continue
                    if any(marker in child.name.lower() for marker in DESIGN_LAB_MARKERS):
                        size = child.stat().st_size if child.is_file() else measure(child)[1]
                        entry["design_lab_owned"].append({
                            "name": child.name,
                            "kind": "file" if child.is_file() else "dir",
                            "bytes": size,
                        })
            except OSError as exc:
                entry["error"] = str(exc)
        discovery[dirname] = entry
    return discovery


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    objects = repo_legacy_census()
    homes = agent_home_discovery()
    totals = {}
    for item in objects:
        totals[item["classification"]] = totals.get(item["classification"], 0) + item["bytes"]
    document = {
        "schemaVersion": "design-lab/spill-census/v1",
        "task_key": TASK_KEY,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": git("rev-parse HEAD").strip(),
        "scope": {
            "inspected": ["DESIGN-LAB repository", "DESIGN-LAB .project-local", "agent homes at "
                          "path/metadata level"],
            "not_read": ["private chat content", "credentials", "unrelated agent sessions",
                         "sibling projects", "user personal asset libraries"],
            "never_touched": ["E:\\"],
            "shared_inputs": "declared in .project/paths.json (model-library, design-assets, "
                             "os-toolchain, design-toolchain) and NOT versioned by DESIGN-LAB, so "
                             "they are out of scope for this census",
        },
        "repository_legacy_objects": objects,
        "repository_totals_bytes": totals,
        "repository_total_mib": round(sum(totals.values()) / 1048576, 2),
        "agent_homes": homes,
        "design_lab_owned_in_agent_homes": {name: home["design_lab_owned"]
                                            for name, home in homes.items()
                                            if home["design_lab_owned"]},
        "verdict": "CENSUS_COMPLETE",
        "note": "Only the repository-side objects carry an owner of DESIGN-LAB. Nothing in an agent "
                "home is claimed by this project at this stage.",
    }
    if args.check:
        if not OUT.is_file() or json.loads(OUT.read_text(encoding="utf-8"))["repository_totals_bytes"] != totals:
            print("SPILL_CENSUS=DRIFT")
            return 1
        print("SPILL_CENSUS=PASS")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8", newline="\n")
    print(f"SPILL_CENSUS=WRITTEN {OUT.relative_to(REPO)} objects={len(objects)} "
          f"total={document['repository_total_mib']} MiB")
    for item in objects:
        print(f"  {item['classification']:14} {item['bytes'] / 1048576:7.2f} MiB "
              f"{item['source_path']} -> {item['target_path'] or 'DO_NOT_TOUCH'} "
              f"[{item['delete_policy']}]")
    for name, home in homes.items():
        if home["exists"]:
            print(f"  agent home {name}: entries={home['native_entries_seen']} "
                  f"design-lab-owned={len(home['design_lab_owned'])} (content unread)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
