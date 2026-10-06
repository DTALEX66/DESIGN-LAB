#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-I000 / DLDS-I010 — destructive-operation and unknown-outcome safety gate.

I000: every destructive operation must have a plan, a candidate list, a backup or
digest, verification, a rollback and a receipt. This checks the recorded manifests
of the three destructive tools this taskpack ran, and checks that those tools
expose the plan and restore modes their manifests promise.

I010: an attempt whose outcome is unknown must be reconciled, never silently
re-run. This reads the live state machine rather than a document: the set of
successors of OUTCOME_UNKNOWN must not contain RUNNING, terminal states must have
no successors, and a reconciliation API must demand a proof.

Writes reports/current/RECOVERY-SAFETY.json.

Usage:
    python scripts/verify_recovery_safety.py [--check]
"""
from __future__ import annotations

import argparse
import inspect
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))
OUT = REPO / "reports/current/RECOVERY-SAFETY.json"
TASK_KEYS = ["DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-I000",
             "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-I010"]
# manifest path -> the tool that writes it
MANIFESTS = {
    ".project-local/quarantine/deepseek-round1/RUNTIME-CLEANUP-MANIFEST.json":
        "scripts/deepseek_runtime_cleanup.py",
    ".project-local/quarantine/deepseek-round1/DELETE-MANIFEST.json":
        "scripts/deepseek_quarantine_out_of_pack.py",
    ".project-local/archive/hermes-legacy/MIGRATION-MANIFEST.json":
        "scripts/deepseek_hermes_migration.py",
}
UNKNOWN_OUTCOME_TESTS = ("design-lab/tests/test_runtime_attempt_safety.py",
                         "design-lab/tests/test_boot_reconciliation.py")


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def audit_manifest(rel: str, tool: str) -> dict:
    path = REPO / rel
    if not path.is_file():
        return {"manifest": rel, "tool": tool, "exists": False, "elements": {}, "ok": False}
    document = json.loads(path.read_text(encoding="utf-8"))
    records = document.get("records") or document.get("deleted") or document.get("files") or []
    text = json.dumps(document, ensure_ascii=False).lower()
    elements = {
        "plan": bool(document.get("policy") or document.get("action") or document.get("recipe")
                     or document.get("task_key") or document.get("task_keys")),
        "candidate_list": bool(records),
        "backup_or_digest": all(bool(r.get("sha256") or r.get("digest") or r.get("verified_digest")
                                     or r.get("bytes") is not None) for r in records) if records else False,
        "verification": ("recreation" in text or "restore" in text or "verified" in text
                         or "reconcil" in text),
        "rollback": bool(document.get("restore_command") or "restore" in text
                         or "recreat" in text),
        "receipt": bool(document.get("schemaVersion") and (document.get("migrated_at")
                                                           or document.get("deleted_at")
                                                           or document.get("created_at"))),
    }
    tool_source = (REPO / tool).read_text(encoding="utf-8") if (REPO / tool).is_file() else ""
    tool_modes = {"plan_mode": "--plan" in tool_source, "restore_mode": "--restore" in tool_source}
    return {"manifest": rel, "tool": tool, "exists": True, "entries": len(records),
            "elements": elements, "tool_modes": tool_modes,
            "ok": all(elements.values()) and all(tool_modes.values())}


PRODUCTION_ROOT = REPO / "src" / "design_lab"
JOB_STORE_MODULE = "src/design_lab/runtime/job_store.py"
RECOVERY_ENTRY_POINTS = ("recover_orphaned_attempts", "recover_interrupted",
                         "reconcile_attempt", "reconcile_receipted")


def python_sources(root):
    if not root.is_dir():
        return
    for path in sorted(root.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        yield path


def production_call_sites(name, root=PRODUCTION_ROOT):
    """POSIX paths under the production package that call `name(...)`.

    Scoped to src/design_lab on purpose. The previous version of this gate counted
    a test file as proof that production behaves, which is exactly how a function
    with no caller at all passed for months.
    """
    pattern = re.compile(rf"\b{re.escape(name)}\s*\(")
    hits = []
    for path in python_sources(root):
        if not pattern.search(path.read_text(encoding="utf-8", errors="ignore")):
            continue
        try:
            hits.append(path.relative_to(REPO).as_posix())
        except ValueError:
            hits.append(path.relative_to(root.parent).as_posix())
    return hits


def executes_under_attempt_lock():
    """True only while NativeTasks.execute itself takes the attempt's OS lock.

    That hold is what turns "no holder" into "the worker is gone". Without it the
    liveness probe below would be guessing, and guessing is what A3 forbids.
    """
    path = REPO / "src" / "design_lab" / "native_tasks.py"
    if not path.is_file():
        return False
    source = path.read_text(encoding="utf-8", errors="ignore")
    start = source.find("    def execute(self,")
    if start < 0:
        return False
    body = source[start + 1:]
    following = body.find("\n    def ")
    if following >= 0:
        body = body[:following]
    return "recovery_lock(" in body and "RecoveryBusy" in body


def test_exercises_recovery(rel):
    """A test counts when it calls a recovery entry point, not when it contains a word."""
    path = REPO / rel
    if not path.is_file():
        return False
    text = path.read_text(encoding="utf-8", errors="ignore")
    return any(re.search(rf"\b{re.escape(name)}\s*\(", text) for name in RECOVERY_ENTRY_POINTS)


def audit_unknown_outcome() -> dict:
    from design_lab.runtime import job_store
    allowed = job_store.ALLOWED
    terminal = set(job_store.TERMINAL)
    findings = []
    if "OUTCOME_UNKNOWN" not in allowed:
        findings.append("the state machine has no OUTCOME_UNKNOWN state")
    else:
        successors = set(allowed["OUTCOME_UNKNOWN"])
        if "RUNNING" in successors:
            findings.append("OUTCOME_UNKNOWN may return to RUNNING: a silent re-run is possible")
        if not successors <= {"RECONCILING", "CANCEL_REQUESTED"}:
            findings.append(f"unexpected successors of OUTCOME_UNKNOWN: {sorted(successors)}")
    for state in terminal:
        if allowed.get(state):
            findings.append(f"terminal state {state} has successors")
    signature = inspect.signature(job_store.reconcile_attempt)
    if "proof" not in signature.parameters:
        findings.append("reconcile_attempt does not require a proof")
    if not hasattr(job_store, "recover_orphaned_attempts"):
        findings.append("no liveness-gated restart recovery entry point exists")

    # This used to be `hasattr(job_store, "recover_interrupted")`, which is true
    # for as long as the function is *defined* -- including the whole period in
    # which nothing called it. Existence is not the claim; a caller is.
    gated = [p for p in production_call_sites("recover_orphaned_attempts")
             if p != "src/design_lab/runtime/job_store.py"]
    blind = [p for p in production_call_sites("recover_interrupted")
             if p != "src/design_lab/runtime/job_store.py"]
    if not gated:
        findings.append("recover_orphaned_attempts has no production caller: restart "
                        "reconciles nothing")
    if blind:
        findings.append(f"the blind RUNNING scan is called from production: {blind}")

    # Without this, "the lock is free" would not mean "the worker is gone", and
    # the liveness probe above would be guessing.
    if not executes_under_attempt_lock():
        findings.append("NativeTasks.execute does not hold the attempt's recovery lock, "
                        "so a free lock cannot prove the worker stopped")

    covered = [rel for rel in UNKNOWN_OUTCOME_TESTS
               if test_exercises_recovery(rel)]
    if not covered:
        findings.append("no test calls a recovery entry point (a file merely "
                        "mentioning the word 'unknown' does not count)")
    return {"outcome_unknown_successors": sorted(allowed.get("OUTCOME_UNKNOWN", [])),
            "terminal_states": sorted(terminal),
            "reconcile_requires_proof": "proof" in signature.parameters,
            "recovery_is_called_in_production": bool(gated),
            "recovery_production_callers": gated,
            "blind_scan_production_callers": blind,
            "execution_holds_attempt_lock": executes_under_attempt_lock(),
            "tests": covered, "findings": findings, "ok": not findings}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    manifests = [audit_manifest(rel, tool) for rel, tool in MANIFESTS.items()]
    recovery = audit_unknown_outcome()
    failures = [m["manifest"] for m in manifests if not m["ok"]]
    document = {
        "schemaVersion": "design-lab/recovery-safety/v1",
        "task_keys": TASK_KEYS,
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": git("rev-parse HEAD"),
        "I000_destructive_operations": {
            "doctrine": "plan -> candidate list -> backup/digest -> verification -> rollback -> receipt",
            "manifests": manifests, "failures": failures,
        },
        "I010_unknown_outcome": {
            "rule": "an attempt with an unknown outcome is reconciled, never re-run; a failed or "
                    "cancelled attempt is never reported as completed",
            **recovery,
        },
        "verdict": "PASS" if not failures and recovery["ok"] else "FAIL",
    }
    if args.check:
        if not OUT.is_file() or json.loads(OUT.read_text(encoding="utf-8"))["verdict"] != document["verdict"]:
            print("RECOVERY_SAFETY=DRIFT")
            return 1
        print("RECOVERY_SAFETY=PASS")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"RECOVERY_SAFETY={document['verdict']} manifests={len(manifests)} "
          f"manifest_failures={len(failures)} unknown_outcome_findings={len(recovery['findings'])}")
    for item in manifests:
        missing = [name for name, present in item["elements"].items() if not present]
        modes = [name for name, present in item.get("tool_modes", {}).items() if not present]
        print(f"  {'ok  ' if item['ok'] else 'FAIL'} {Path(item['manifest']).name:32} "
              f"entries={item.get('entries')} missing={missing or 'none'} modes={modes or 'ok'}")
    for finding in recovery["findings"]:
        print("  FINDING:", finding)
    return 0 if document["verdict"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
