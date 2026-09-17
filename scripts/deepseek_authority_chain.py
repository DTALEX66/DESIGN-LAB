#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-A010 authority chain reconciliation.

Reads every taskpack, ledger and governance manifest in the repository, hashes
them and classifies them into exactly one authority class. The classification is
derived from evidence inside the files (a SUPERSEDED/HISTORICAL marker) and from
their path, never from memory or a chat summary.

Writes reports/current/DEEPSEEK-AUTHORITY-CHAIN.json.

Usage:
    python scripts/deepseek_authority_chain.py            # write the artifact
    python scripts/deepseek_authority_chain.py --check    # verify, no write
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUTPUT = "reports/current/DEEPSEEK-AUTHORITY-CHAIN.json"
AUTHORITY_PACK = "docs/taskpacks/DESIGN-LAB-DEEPSEEK-AUTHORITY-TASKPACK-2026-09-14.md"
AUTHORITY_ID = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1"
R5_PACK = "docs/history/taskpacks/r5-20260908/tasks.json"
LEDGER = "design-lab/config/task-ledger-r3.json"
AUTHORITY_LEDGER = "reports/current/DEEPSEEK-AUTHORITY-LEDGER-2026-09-14.json"

# Files that are the live source for the R5 product ledger. They are not
# superseded by the DeepSeek authority pack: that pack is DeepSeek-scoped.
ACTIVE_PRODUCT = {
    "docs/history/taskpacks/r5-20260908/tasks.json": "R5 task source (frozen; ledger authoring input)",
    "docs/history/taskpacks/r5-20260908/02-TASKS.md": "R5 Chinese task cards (generated reading copy)",
    "docs/history/taskpacks/r5-20260908/04-REPOSITORY-LANGUAGE.md": "R5 language governance source",
    "docs/history/taskpacks/r5-20260908/03-EXECUTOR-HANDOFF.md": "R5 executor handoff",
    "docs/history/taskpacks/r5-20260908/01-AUDIT-BASELINE.md": "R5 audit baseline",
    "design-lab/config/task-ledger-r3.json": "R5 task status authoring source (schema design-lab/task-ledger/r5-v1)",
    ".project/manifest.yaml": "project manifest (see drift note)",
    ".project/paths.json": "path declaration truth",
    "AGENTS.md": "root execution rules",
}
GOVERNANCE = {".project/manifest.yaml", ".project/paths.json", "AGENTS.md"}
SUPERSEDED_MARKER = re.compile(r"SUPERSEDED|HISTORICAL", re.I)
SCAN_DIRS = ("docs/taskpacks", "docs/history/taskpacks", "docs/history/cross-project", ".project")
SCAN_SUFFIXES = (".md", ".json", ".yaml", ".yml")


def sha256_file(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def head_text(path: Path, limit: int = 900) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except OSError:
        return ""


def candidates() -> list:
    found = []
    for directory in SCAN_DIRS:
        base = REPO / directory
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_file() and path.suffix.lower() in SCAN_SUFFIXES:
                rel = path.relative_to(REPO).as_posix()
                if "taskpack" in rel.lower() or "ledger" in rel.lower() or path.name == "manifest.yaml":
                    found.append(rel)
    for extra in (R5_PACK, LEDGER, AUTHORITY_LEDGER, AUTHORITY_PACK, "AGENTS.md"):
        if (REPO / extra).is_file() and extra not in found:
            found.append(extra)
    return sorted(set(found))


def classify(rel: str, head: str) -> tuple:
    """Return (authority_class, basis). Order matters: the R5 pack lives under
    docs/history/ by design and is an active product pack, not history."""
    if rel == AUTHORITY_PACK:
        return "CURRENT_DEEPSEEK_AUTHORITY", "the landed authority taskpack of this run"
    if rel == AUTHORITY_LEDGER:
        return "CURRENT_DEEPSEEK_AUTHORITY", "machine ledger for the authority taskpack (58 tasks)"
    if rel in ACTIVE_PRODUCT:
        if rel in GOVERNANCE:
            return "GOVERNANCE_TRUTH", ACTIVE_PRODUCT[rel]
        return "ACTIVE_PRODUCT_PACK", ACTIVE_PRODUCT[rel]
    if rel.startswith("docs/history/taskpacks/r5-20260908/"):
        return "ACTIVE_PRODUCT_PACK", "part of the frozen current R5 product pack"
    if SUPERSEDED_MARKER.search(head):
        return "HISTORICAL", "the file itself carries a SUPERSEDED/HISTORICAL marker"
    if rel.startswith("docs/history/"):
        return "HISTORICAL", "frozen historical path (docs/history/)"
    if rel.startswith("docs/taskpacks/"):
        return "REFERENCE", "older taskpack retained for reference; not a current dispatch entry"
    return "REFERENCE", "no superseding marker found; retained for reference"


def ledger_summary(rel: str) -> dict:
    """Structured summary for machine ledgers; markdown/YAML get none."""
    path = REPO / rel
    if not path.is_file() or path.suffix.lower() != ".json":
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeError, json.JSONDecodeError):
        return {"parse": "FAILED"}
    if not isinstance(data, dict):
        return {"kind": "non-object-json"}
    if isinstance(data.get("taskpack"), dict) and isinstance(data.get("tasks"), list):
        return {"kind": "authority-ledger", "taskpack": data["taskpack"].get("taskpack_id"),
                "tasks": len(data["tasks"])}
    if isinstance(data.get("tasks"), list):
        ids = [t.get("id") for t in data["tasks"] if isinstance(t, dict)]
        return {"kind": "task-ledger", "taskpack": data.get("taskpack") or data.get("id"),
                "schemaVersion": data.get("schemaVersion"), "tasks": len(ids),
                "evidence_receipts": len(data.get("evidence", []))}
    return {"kind": "unknown-json", "keys": sorted(data)[:8]}


def git(*args: str) -> str:
    result = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    return result.stdout.strip()


def build() -> dict:
    entries = []
    for rel in candidates():
        path = REPO / rel
        authority_class, basis = classify(rel, head_text(path))
        entry = {"path": rel, "bytes": path.stat().st_size, "sha256": sha256_file(path),
                 "authority_class": authority_class, "basis": basis}
        if rel == AUTHORITY_LEDGER:
            entry["mutable_state"] = ("the ledger is rewritten at the close of every task, so "
                                      "its bytes and digest are generation-time")
        summary = ledger_summary(rel)
        if summary:
            entry["ledger"] = summary
        entries.append(entry)

    manifest = (REPO / ".project/manifest.yaml").read_text(encoding="utf-8")
    pack_line = re.search(r"^taskpack:\s*(\S+)", manifest, re.M)
    drift = []
    if pack_line and pack_line.group(1) != "DL-TP-20260908-R5":
        drift.append({
            "path": ".project/manifest.yaml",
            "field": "taskpack",
            "recorded": pack_line.group(1),
            "current_authority": "DL-TP-20260908-R5 (product) / " + AUTHORITY_ID + " (DeepSeek execution)",
            "action": "reconcile in DLDS-B040/B010; not silently rewritten by A010",
        })
    r5 = json.loads((REPO / R5_PACK).read_text(encoding="utf-8"))
    authority_ledger = json.loads((REPO / AUTHORITY_LEDGER).read_text(encoding="utf-8"))

    return {
        "schemaVersion": "design-lab/deepseek-authority-chain/v1",
        "task_key": AUTHORITY_ID + "::DLDS-A010",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject": {"base_sha": git("rev-parse", "HEAD"), "branch": git("rev-parse", "--abbrev-ref", "HEAD"),
                    "worktree_clean": git("status", "--porcelain=v1") == ""},
        "current_authority": {
            "deepseek_execution": {
                "taskpack_id": AUTHORITY_ID,
                "path": AUTHORITY_PACK,
                "sha256": sha256_file(REPO / AUTHORITY_PACK),
                "ledger": AUTHORITY_LEDGER,
                "ledger_tasks": authority_ledger["task_count"],
                "scope": "repository convergence, cleanup, spill recovery, language governance, "
                         "structural closeout, Codex preparation",
            },
            "product_task_ledger": {
                "taskpack_id": r5["id"],
                "path": R5_PACK,
                "sha256": sha256_file(REPO / R5_PACK),
                "ledger": LEDGER,
                "tasks": len(r5["tasks"]),
                "note": "unchanged by the authority pack; its host/deferred work belongs to Codex",
            },
            "single_deepseek_current_pack": True,
        },
        "non_authoritative_sources": ["CHAT SUMMARY", "MEMORY SUMMARY", "COMPRESSED CONTEXT",
                                      "HANDOFF SUMMARY"],
        "stop_line": {
            "handoff": "docs/handoffs/SESSION-RESTART-2026-09-12.md",
            "handoff_sha256": sha256_file(REPO / "docs/handoffs/SESSION-RESTART-2026-09-12.md"),
            "state": "EXPLICIT_SCOPE_SUPERSESSION",
            "superseded_scope": "only the DeepSeek tasks listed in " + AUTHORITY_ID,
            "still_frozen": ["Real Host", "Design validation", "GPU inference", "Human Gate"],
        },
        "codex_deferred": [
            {"domain": "Adobe", "pack_sections": [58], "state": "DEFERRED_TO_CODEX"},
            {"domain": "OpenDesign", "pack_sections": [59], "state": "DEFERRED_TO_CODEX"},
            {"domain": "MiniMax Design", "pack_sections": [60], "state": "DEFERRED_TO_CODEX"},
            {"domain": "ComfyUI", "pack_sections": [61], "state": "DEFERRED_TO_CODEX"},
            {"domain": "Penpot", "pack_sections": [62], "state": "DEFERRED_TO_CODEX"},
            {"domain": "Blender / 3D", "pack_sections": [63], "state": "DEFERRED_TO_CODEX"},
            {"domain": "Design quality / Human Jury", "pack_sections": [64], "state": "DEFERRED_TO_CODEX_HUMAN"},
            {"domain": "Audio / Video real execution", "pack_sections": [65], "state": "DEFERRED_TO_CODEX"},
        ],
        "drift_findings": drift,
        "classification_counts": {name: sum(1 for e in entries if e["authority_class"] == name)
                                  for name in sorted({e["authority_class"] for e in entries})},
        "entries": entries,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    document = build()
    text = json.dumps(document, indent=2, ensure_ascii=False) + "\n"
    path = REPO / OUTPUT
    if args.check:
        if not path.is_file():
            print(f"AUTHORITY_CHAIN=FAIL missing {OUTPUT}")
            return 1
        stored = json.loads(path.read_text(encoding="utf-8"))
        # The classification is the claim this artifact makes; the bytes/digest of the
        # authority ledger are not, because that file is rewritten every time a task
        # closes. Comparing entries verbatim (the earlier behaviour) made the artifact
        # fail its own check the moment any task completed, which is noise, not a gate.
        def projection(entries):
            return {e["path"]: {k: v for k, v in e.items()
                                if not (e.get("mutable_state") and k in {"bytes", "sha256"})}
                    for e in entries}

        stored_entries, fresh_entries = projection(stored["entries"]), projection(document["entries"])
        changed = sorted(p for p in set(stored_entries) | set(fresh_entries)
                         if stored_entries.get(p) != fresh_entries.get(p))
        if changed:
            print(f"AUTHORITY_CHAIN=DRIFT entries changed since generation: {changed[:10]}")
            return 1
        ledger = next((e for e in stored["entries"] if e.get("mutable_state")), None)
        if ledger:
            print(f"AUTHORITY_CHAIN=PASS (classification matches for {len(stored_entries)} "
                  f"entries; mutable ledger digest recorded at generation was "
                  f"{ledger['sha256'][:19]}… and is not a stability claim)")
            return 0
        print(f"AUTHORITY_CHAIN=PASS (classification matches for {len(stored_entries)} entries)")
        return 0
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    counts = document["classification_counts"]
    print(f"AUTHORITY_CHAIN=WRITTEN {OUTPUT} entries={len(document['entries'])} "
          + " ".join(f"{k}={v}" for k, v in counts.items()))
    if document["drift_findings"]:
        print(f"DRIFT_FINDINGS={len(document['drift_findings'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
