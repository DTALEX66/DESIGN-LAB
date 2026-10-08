#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Every tracked projection that can be re-checked must agree with its own record, on a clone.

Why this gate exists. Each generator that writes a tracked projection also has a read-only
``--check`` form, and nothing ran all of them together. Two defects came out of that in
2026-10-09: ``deepseek_language_inventory.py --check`` compared the committed per-language file
counts against the live tree, so it had been red for weeks and nobody saw it (no workflow step, no
aggregate entry, no test, and its name matches no reachability pattern -- a permanently failing gate
that is also an orphan), and three further checks pass on the machine that generated their record
and fail on a clean checkout, which means their green proves nothing about the repository.

So this gate runs each entry's own read-only form and reports the verdict lines, and the entry list
is exactly the set measured to pass in **both** trees. Two of those three have since been fixed and
moved into ENTRIES: RECOVERY-SAFETY on 2026-10-09, by archiving its destructive-operation receipts
under reports/history/destructive-receipts-2026-09-13 so the verdict reads versioned bytes instead
of this machine's gitignored ``.project-local``. SPILL-CENSUS and DEEPSEEK-FINAL-TEST-GATE remain
declared below with the reason and what would let them in; they are not silently dropped, and a
third cannot join without an entry here plus a stated reason for any removal. (Dated correction: the
first version of this docstring said "four excluded entries" while the table held three -- a number
written from a remembered list rather than from the bytes, which is the same class of defect the
gate exists to catch.)

Read-only by construction: only the ``--check``/``--self-test`` argv appears in ENTRIES, and
``test_projection_freshness.py`` refuses an entry whose argument list is empty (that is the writer
form -- the defect fixed one commit before this gate existed).
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

# (record, generator, argv). The argv must be a read-only form; see the module docstring.
ENTRIES = [
    ("reports/current/FOUNDATION-AUDIT.json", "scripts/deepseek_foundation_audit.py", ["--check"]),
    ("reports/current/LANGUAGE-INVENTORY.json", "scripts/deepseek_language_inventory.py",
     ["--check"]),
    ("reports/current/DEEPSEEK-REGISTRY-SSOT.json", "scripts/deepseek_registry_ssot.py",
     ["--check"]),
    ("design-lab/config/rights-registry.json", "scripts/generate_rights_registry.py", ["--check"]),
    ("reports/current/REPO-CLASSIFICATION.json", "scripts/classify_repo.py", ["--check"]),
    ("reports/current/CONTRACT-GRAPH.json", "scripts/verify_contract_graph.py", ["--check"]),
    ("reports/current/EVIDENCE-LEVEL-AUDIT.json", "scripts/verify_evidence_levels.py",
     ["--check"]),
    ("reports/current/LANGUAGE-BOUNDARY-SCAN.json", "scripts/verify_language_boundary.py",
     ["--check"]),
    ("reports/current/NO-OVERCLAIM-AUDIT.json", "scripts/verify_no_overclaim.py", ["--check"]),
    ("reports/current/SUPPLY-CHAIN-REPORT.json", "scripts/verify_supply_chain.py", ["--check"]),
    ("reports/current/MACHINE_INVENTORY.json", "scripts/generate_machine_inventory.py",
     ["--check"]),
    # Left the register below on 2026-10-09: the three destructive-operation receipts it audits
    # are archived under reports/history/destructive-receipts-2026-09-13, so the verdict no longer
    # depends on this machine's gitignored .project-local copies.
    ("reports/current/RECOVERY-SAFETY.json", "scripts/verify_recovery_safety.py", ["--check"]),
]

# Excluded, each with the measured reason. These stay visible here precisely so that "the gate is
# green" never reads as "every projection was verified". The set only shrinks by fixing a check;
# test_projection_freshness.py names the members, so one cannot join silently.
EXCLUDED = {
    "reports/current/SPILL-CENSUS.json":
        "scripts/deepseek_spill_census.py --check passes in the tree that generated the record and "
        "reports DRIFT in a clean checkout of the same commit, so its verdict is a statement about "
        "this disk; it must be made to answer from tracked state before it can be verified here",
    "reports/current/DEEPSEEK-FINAL-TEST-GATE.json":
        "scripts/deepseek_test_gate_report.py --check reads "
        ".project-local/task-artifacts/test-run/history.jsonl, which is gitignored, so on a clone "
        "it says 'results changed since generation'; the authority chain handles that by running "
        "the bound suite instead, which is an execution and not a check",
}

READ_ONLY_FLAGS = ("--check", "--self-test")


def porcelain() -> str:
    """The tracked working-tree state, used to catch a `--check` that is secretly a writer."""
    result = subprocess.run(["git", "status", "--porcelain"], cwd=str(REPO), capture_output=True,
                            text=True, encoding="utf-8", errors="replace")
    return result.stdout


def run_entry(generator: str, argv: list[str]) -> tuple[int, str]:
    result = subprocess.run([sys.executable, "-B", str(REPO / generator), *argv],
                            capture_output=True, text=True, encoding="utf-8", errors="replace",
                            cwd=str(REPO), timeout=1800)
    lines = [line for line in (result.stdout or "").strip().splitlines() if line.strip()]
    tail = lines[-1] if lines else (result.stderr or "").strip()[-160:]
    return result.returncode, tail


def run_entry_read_only(generator: str, argv: list[str]) -> tuple[int, str, list[str]]:
    """Run an entry's check and report which tracked paths it dirtied.

    Added because a record turned up re-bound once during development and no child could be
    blamed by inspection. A check that writes is worse than no check: it can never disagree with
    the record, because it just rewrote it. So the claim is tested per child instead of trusted.
    """
    before = porcelain()
    code, tail = run_entry(generator, argv)
    after = porcelain()
    if before == after:
        return code, tail, []
    dirty = sorted(set(line for line in after.splitlines() if line.strip())
                   - set(line for line in before.splitlines() if line.strip()))
    return code, tail, [line.split(None, 1)[-1] for line in dirty]


def check() -> tuple[list[str], list[str], list[str], int]:
    """Return (failures, excluded reasons, checked records, records missing on disk)."""
    failures: list[str] = []
    missing: list[str] = []
    checked: list[str] = []
    for record, generator, argv in ENTRIES:
        # `argv and ...` was the first version of this line, and it let the writer form through:
        # an empty argument list short-circuits the test to false, so the one case this guard
        # exists for was the case it never checked. My own planted-entry test caught it.
        if not argv or argv[0] not in READ_ONLY_FLAGS:
            failures.append(f"FRESHNESS-WRITER-INVOKED {generator} would be run with {argv}, "
                            "which is not a read-only form")
            continue
        if not (REPO / record).is_file():
            missing.append(record)
            failures.append(f"FRESHNESS-RECORD-MISSING {record} is declared checked but the "
                            "tracked projection is not in this checkout")
            continue
        code, tail, dirty = run_entry_read_only(generator, argv)
        for path in dirty:
            failures.append(f"FRESHNESS-CHECK-WROTE {generator} {' '.join(argv)} modified "
                            f"{path}, so its agreement with the record proves nothing -- it "
                            "rewrote the thing it was comparing against")
        if code != 0:
            failures.append(f"FRESHNESS-DRIFT {record} -- {generator} {' '.join(argv)} exited "
                            f"{code}: {tail}")
        checked.append(record)
    return failures, [f"{key}: {value}" for key, value in sorted(EXCLUDED.items())], checked, missing


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--list", action="store_true", help="print the entries and exclusions")
    args = parser.parse_args(argv)
    failures, exclusions, checked, _missing = check()
    for failure in failures:
        print("VERIFY_PROJECTION_FRESHNESS=FAIL " + failure)
    for line in exclusions:
        print("VERIFY_PROJECTION_FRESHNESS=NOTICE excluded " + line)
    if args.list:
        for record, generator, gate_args in ENTRIES:
            print(f"  ENTRY {record} <- {generator} {' '.join(gate_args)}")
    print(f"VERIFY_PROJECTION_FRESHNESS={'OK' if not failures else 'FAIL'} "
          f"records={len(ENTRIES)} verified={len(checked)} excluded={len(EXCLUDED)} "
          f"findings={len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
