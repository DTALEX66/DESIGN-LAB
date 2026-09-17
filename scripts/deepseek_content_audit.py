#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-D010 / DLDS-D040 — third-party source audit and duplicate content audit.

D010: every third-party project that lives in this repository must be either a
minimal absorption with a stated licence or a lock reference with a canonical
URL, revision, hash, licence and disposition. This checks the lock against
reality: an entry whose path no longer exists is a stale claim, and an absorbed
tree that has no lock entry is an unaudited claim.

D040: duplicate content costs bytes and creates two places to update. Duplicates
are reported with their exact digests and a classification; nothing is deleted
here, because removing a referenced evidence path is a contract change.

Writes:
    reports/current/THIRD-PARTY-SOURCE-AUDIT.json
    reports/current/DUPLICATE-CONTENT-AUDIT.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports/current"
LOCK = "vendor/sources.lock.json"
TASK_KEYS = ["DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-D010",
             "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-D040"]
LICENCE_NAMES = {"LICENSE", "LICENSE.md", "LICENSE.txt", "NOTICE", "COPYING", "SOURCE.md"}
MIN_DUPLICATE_BYTES = 65536


def tracked() -> list:
    return [line for line in subprocess.run(["git", "-C", str(REPO), "ls-files"], capture_output=True,
                                            text=True, encoding="utf-8").stdout.splitlines()
            if line.strip()]


def third_party_audit(files: list) -> dict:
    lock_path = REPO / LOCK
    lock = json.loads(lock_path.read_text(encoding="utf-8")) if lock_path.is_file() else {}
    entries = []
    for source in lock.get("sources", []):
        path = source.get("path", "")
        target = REPO / path
        tracked_here = sum(1 for f in files if f == path or f.startswith(path.rstrip("/") + "/"))
        on_disk = target.exists()
        disposition = source.get("disposition")
        if tracked_here:
            status = "PRESENT"
        elif on_disk:
            status = "FULL_COPY_IN_IGNORED_CACHE"
        elif disposition == "LOCK_REFERENCE":
            # LOCK_REFERENCE means the full copy was deliberately removed and only
            # the reference remains (verify_knowledge_lifecycle.py documents this).
            status = "CORRECT_LOCK_REFERENCE"
        else:
            status = "MISSING_ABSORBED_TREE"
        entries.append({
            "id": source.get("id"),
            "path": path,
            "disposition": disposition,
            "license": source.get("license"),
            "declared_files": source.get("files"),
            "tracked_files_now": tracked_here,
            "on_disk": on_disk,
            "status": status,
            "has_revision": bool(source.get("commit") or source.get("revision") or source.get("hash")
                                 or source.get("pinnedRevision")),
            "has_url": bool(source.get("canonicalUrl") or source.get("canonical_url")
                            or source.get("url")),
            "canonical_url": source.get("canonicalUrl") or source.get("canonical_url") or source.get("url"),
            "provenance_source": source.get("provenanceSource"),
        })
    present = [e for e in entries if e["status"] == "PRESENT"]
    cached = [e for e in entries if e["status"] == "FULL_COPY_IN_IGNORED_CACHE"]
    references = [e for e in entries if e["status"] == "CORRECT_LOCK_REFERENCE"]
    missing = [e for e in entries if e["status"] == "MISSING_ABSORBED_TREE"]
    unidentified = [e for e in entries if not e["has_revision"] or not e["has_url"]]
    # Absorbed trees: a directory that carries its own licence/attribution file.
    markers = defaultdict(list)
    for rel in files:
        if Path(rel).name in LICENCE_NAMES and "/" in rel:
            markers[str(Path(rel).parent).replace("\\", "/")].append(Path(rel).name)
    locked_dirs = {e["path"].rstrip("/") for e in entries}
    absorbed = []
    for directory, names in sorted(markers.items()):
        absorbed.append({
            "directory": directory,
            "markers": sorted(names),
            "tracked_files": sum(1 for f in files if f.startswith(directory + "/")),
            "covered_by_lock": any(directory == locked or directory.startswith(locked + "/") or
                                   locked.startswith(directory + "/") for locked in locked_dirs),
        })
    uncovered = [a for a in absorbed if not a["covered_by_lock"]]
    return {
        "schemaVersion": "design-lab/third-party-source-audit/v1",
        "task_key": TASK_KEYS[0],
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "lock": {"path": LOCK, "exists": lock_path.is_file(),
                 "schemaVersion": lock.get("schemaVersion"), "entries": len(entries)},
        "entries": entries,
        "counts": {"entries": len(entries), "present": len(present),
                   "full_copy_in_ignored_cache": len(cached),
                   "correct_lock_reference": len(references),
                   "missing_absorbed_tree": len(missing),
                   "with_canonical_url": sum(1 for e in entries if e["has_url"]),
                   "without_canonical_url": sum(1 for e in entries if not e["has_url"]),
                   "with_pinned_revision": sum(1 for e in entries if e["has_revision"]),
                   "without_pinned_revision": sum(1 for e in entries if not e["has_revision"]),
                   "without_revision_or_url": len(unidentified),
                   "absorbed_trees_with_own_licence": len(absorbed),
                   "absorbed_trees_not_in_lock": len(uncovered)},
        "findings": {
            "without_canonical_url": [e["id"] for e in entries if not e["has_url"]],
            "without_pinned_revision": [e["id"] for e in entries if not e["has_revision"]],
            "missing_absorbed_trees": [{"id": e["id"], "path": e["path"]} for e in missing],
            "absorbed_trees_outside_lock": [a["directory"] for a in uncovered],
        },
        "verdict": ("NO_FULL_THIRD_PARTY_SOURCE_TREES_TRACKED" if not uncovered and not missing
                    else "REVIEW_ABSORBED_TREES_OUTSIDE_LOCK"),
        "note": "LOCK_REFERENCE with no in-repo copy is the intended state, not a stale claim: the "
                "full copy was removed and only the reference remains. A CONDITIONAL_POC or "
                "ABSORB_MINIMAL entry whose path is gone would be a real defect.",
    }


def duplicate_audit(files: list) -> dict:
    groups = defaultdict(list)
    for rel in files:
        path = REPO / rel
        try:
            size = path.stat().st_size
            if size < MIN_DUPLICATE_BYTES:
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
        except OSError:
            continue
        groups[digest].append({"path": rel, "bytes": size})
    duplicates = []
    for digest, members in groups.items():
        if len(members) < 2:
            continue
        directories = {str(Path(m["path"]).parent) for m in members}
        fixtures = all(m["path"].startswith(("fixtures/", "reports/history/")) for m in members)
        duplicates.append({
            "sha256": digest,
            "bytes_each": members[0]["bytes"],
            "wasted_bytes": members[0]["bytes"] * (len(members) - 1),
            "members": [m["path"] for m in members],
            "directories": sorted(directories),
            "classification": ("FIXTURE_OR_HISTORICAL_DUPLICATE" if fixtures
                               else "EVIDENCE_DUPLICATE_ACROSS_ADAPTER_DIRS"),
            "recommendation": ("keep: the copy is part of a self-contained fixture or a differently "
                               "named historical record" if fixtures else
                               "consolidate only by editing the owning adapter manifest in the same "
                               "change; an evidence path is a contract, not a file layout"),
        })
    duplicates.sort(key=lambda d: -d["wasted_bytes"])
    return {
        "schemaVersion": "design-lab/duplicate-content-audit/v1",
        "task_key": TASK_KEYS[1],
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "threshold_bytes": MIN_DUPLICATE_BYTES,
        "groups": duplicates,
        "counts": {"groups": len(duplicates),
                   "wasted_bytes": sum(d["wasted_bytes"] for d in duplicates),
                   "wasted_mib": round(sum(d["wasted_bytes"] for d in duplicates) / 1048576, 3)},
        "policy": "duplicate removal is a contract change whenever a manifest references the path; "
                  "this audit reports, it does not delete",
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    files = tracked()
    third = third_party_audit(files)
    duplicates = duplicate_audit(files)
    if args.check:
        drift = []
        for name, payload in (("THIRD-PARTY-SOURCE-AUDIT.json", third),
                              ("DUPLICATE-CONTENT-AUDIT.json", duplicates)):
            path = OUT / name
            if not path.is_file() or json.loads(path.read_text(encoding="utf-8"))["counts"] != payload["counts"]:
                drift.append(name)
        print("CONTENT_AUDIT=" + ("PASS" if not drift else f"DRIFT {drift}"))
        return 0 if not drift else 1
    OUT.mkdir(parents=True, exist_ok=True)
    for name, payload in (("THIRD-PARTY-SOURCE-AUDIT.json", third),
                          ("DUPLICATE-CONTENT-AUDIT.json", duplicates)):
        (OUT / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                                encoding="utf-8", newline="\n")
        print(f"wrote reports/current/{name}")
    print("third-party:", third["counts"], "|", third["verdict"])
    print("duplicates:", duplicates["counts"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
