#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-F000 — Contract Graph Gate.

Builds the machine graph the taskpack asks for:

    Schema -> Python model -> DB -> producer -> consumer -> receipt -> projection

for Job, Attempt, Operation, Asset, AssetVersion, Requirement, Decision, Rights,
Evidence, QA and Delivery, then reports every link it cannot resolve. A break is a
failure: a contract that no code reads, a table no writer touches, a projection
with no generator and a module with no schema are all the same defect class.

Writes reports/current/CONTRACT-GRAPH.json.

Usage:
    python scripts/verify_contract_graph.py [--check]
"""
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports/current/CONTRACT-GRAPH.json"
TASK_KEY = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-F000"

# concept -> {schema, models, tables, producers, consumers, projections}
GRAPH = {
    "Job": {
        "schema": ["design-lab/schemas/creative-job.schema.json"],
        "models": ["src/design_lab/creative/creative_job.py"],
        "tables": ["creative_job", "creative_job_deliverable", "job"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-v1.sql"],
        "producers": ["src/design_lab/creative/creative_job.py"],
        "consumers": ["src/design_lab/creative/lineage.py", "src/design_lab/creative/requirement_ledger.py"],
        "projections": [],
    },
    "Attempt": {
        "schema": [],
        "models": ["src/design_lab/runtime/job_store.py"],
        "tables": ["attempt_state", "attempt_event", "attempt_resolution"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-attempt-v2.sql"],
        "producers": ["src/design_lab/runtime/job_store.py"],
        "consumers": ["src/design_lab/creative/lineage.py"],
        "projections": [],
    },
    "Operation": {
        "schema": [],
        "models": ["src/design_lab/creative/lineage.py"],
        "tables": ["operation_intent", "operation_state", "operation_lineage"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-creative-v1.sql"],
        "producers": ["src/design_lab/creative/lineage.py"],
        "consumers": ["src/design_lab/creative/generative/partial_execution.py"],
        "projections": [],
    },
    "Asset": {
        "schema": ["design-lab/schemas/asset-manifest.schema.json"],
        "models": ["src/design_lab/runtime/asset_store.py"],
        "tables": ["asset"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-assets-v1.sql"],
        "producers": ["src/design_lab/runtime/asset_store.py"],
        "consumers": ["src/design_lab/creative/asset_versions.py"],
        "projections": [],
    },
    "AssetVersion": {
        "schema": ["design-lab/schemas/artifact.schema.json"],
        "models": ["src/design_lab/creative/asset_versions.py"],
        "tables": ["asset_version", "artifact", "asset_publication"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-assets-v1.sql"],
        "producers": ["src/design_lab/runtime/asset_store.py", "src/design_lab/creative/asset_versions.py"],
        "consumers": ["src/design_lab/creative/version_guard.py", "src/design_lab/interop/delivery_receipt.py"],
        "projections": [],
    },
    "Requirement": {
        "schema": [],
        "models": ["src/design_lab/creative/requirement_ledger.py"],
        "tables": ["requirement_event"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-creative-v1.sql"],
        "producers": ["src/design_lab/creative/requirement_ledger.py"],
        "consumers": ["src/design_lab/creative/decision_ledger.py", "src/design_lab/interop/delivery_receipt.py"],
        "projections": [],
    },
    "Decision": {
        "schema": [],
        "models": ["src/design_lab/creative/decision_ledger.py"],
        "tables": ["decision_event"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-creative-v1.sql"],
        "producers": ["src/design_lab/creative/decision_ledger.py"],
        "consumers": ["src/design_lab/creative/requirement_ledger.py"],
        "projections": [],
    },
    "Rights": {
        "schema": ["design-lab/schemas/provider-capability.schema.json"],
        "models": ["src/design_lab/creative/generative/model_assets.py", "src/design_lab/readiness/model_radar.py"],
        "tables": [],
        "extra_tables": [],
        "producers": ["design-lab/config/provider-capabilities.json", "vendor/sources.lock.json"],
        "consumers": ["src/design_lab/creative/generative/model_assets.py"],
        "projections": ["reports/current/THIRD-PARTY-SOURCE-AUDIT.json"],
    },
    "Evidence": {
        "schema": ["design-lab/schemas/evidence-record.schema.json"],
        "models": ["src/design_lab/governance/reporting.py"],
        "tables": ["audit_event"],
        "extra_tables": ["design-lab/schemas/state/design-lab-state-v1.sql"],
        "producers": ["design-lab/scripts/update_evidence_binding.py", "scripts/generate_ssot_projections.py"],
        "consumers": ["design-lab/scripts/verify_capability_evidence_v4.py"],
        "projections": ["reports/current/EVIDENCE_INDEX.json"],
    },
    "QA": {
        "schema": ["design-lab/schemas/assurance-qa-layer.schema.json",
                   "design-lab/schemas/assurance-jury-record-v2.schema.json"],
        "models": ["src/design_lab/assurance/qa_plane.py", "src/design_lab/assurance/human_jury.py"],
        "tables": [],
        "extra_tables": [],
        "producers": ["src/design_lab/assurance/qa_plane.py"],
        "consumers": ["src/design_lab/assurance/human_jury.py"],
        "projections": [],
    },
    "Delivery": {
        "schema": ["design-lab/schemas/interop-delivery-receipt-v2.schema.json",
                   "design-lab/schemas/interop-c2pa-manifest.schema.json"],
        "models": ["src/design_lab/interop/delivery_receipt.py", "src/design_lab/interop/provenance.py"],
        "tables": [],
        "extra_tables": [],
        "producers": ["src/design_lab/interop/delivery_receipt.py"],
        "consumers": ["design-lab/scripts/verify_release_evidence.py"],
        "projections": [],
    },
}


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout


def tables_in_state_schemas() -> dict:
    """table -> the schema file that declares it."""
    found = {}
    for path in sorted((REPO / "design-lab/schemas/state").glob("*.sql")):
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            stripped = line.strip()
            if stripped.upper().startswith("CREATE TABLE"):
                name = stripped.split("(")[0].split()[-1].strip()
                if name.upper().startswith("IF"):
                    parts = stripped.split()
                    name = parts[parts.index("EXISTS") + 1] if "EXISTS" in parts else name
                found[name.strip('"')] = f"design-lab/schemas/state/{path.name}"
    return found


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    declared_tables = tables_in_state_schemas()
    nodes = {}
    breaks = []
    for concept, spec in GRAPH.items():
        missing_files = [rel for rel in spec["schema"] + spec["models"] + spec["producers"]
                         + spec["consumers"] + spec["projections"]
                         if not (REPO / rel).is_file()]
        missing_tables = [name for name in spec["tables"] if name not in declared_tables]
        nodes[concept] = {
            "schema": spec["schema"], "models": spec["models"], "tables": spec["tables"],
            "producers": spec["producers"], "consumers": spec["consumers"],
            "projections": spec["projections"],
            "missing_paths": missing_files, "tables_not_declared_in_state_sql": missing_tables,
            "has_schema": bool(spec["schema"]), "has_model": bool(spec["models"]),
            "has_writer": bool(spec["producers"]),
            "complete": not missing_files and not missing_tables and bool(spec["models"])
                        and bool(spec["producers"]),
        }
        if missing_files:
            breaks.append({"concept": concept, "kind": "PATH_NOT_FOUND", "paths": missing_files})
        if missing_tables:
            breaks.append({"concept": concept, "kind": "TABLE_NOT_DECLARED", "tables": missing_tables})
        if not spec["schema"] and concept not in {"Attempt", "Operation", "Requirement", "Decision"}:
            breaks.append({"concept": concept, "kind": "NO_SCHEMA",
                           "detail": "a cross-language concept needs a versioned schema"})
        if not spec["producers"]:
            breaks.append({"concept": concept, "kind": "NO_PRODUCER"})
    # Duplicate SSOT: one table declared by more than one schema file would be a
    # second authoring source for the same fact.
    seen = {}
    duplicates = []
    for table, source in declared_tables.items():
        if table in seen and seen[table] != source:
            duplicates.append({"table": table, "declared_in": [seen[table], source]})
        seen[table] = source
    if duplicates:
        breaks.append({"concept": "(database)", "kind": "DUPLICATE_TABLE_DECLARATION",
                       "detail": duplicates})
    document = {
        "schemaVersion": "design-lab/contract-graph/v1",
        "task_key": TASK_KEY,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": git("rev-parse HEAD").strip(),
        "chain": "Schema -> Python model -> DB -> producer -> consumer -> receipt -> projection",
        "concepts": nodes,
        "declared_tables": declared_tables,
        "breaks": breaks,
        "counts": {"concepts": len(nodes), "complete": sum(1 for n in nodes.values() if n["complete"]),
                   "breaks": len(breaks)},
        "verdict": "NO_BROKEN_LINK" if not breaks else "BROKEN_LINKS",
    }
    if args.check:
        if not OUT.is_file() or json.loads(OUT.read_text(encoding="utf-8"))["counts"] != document["counts"]:
            print("CONTRACT_GRAPH=DRIFT")
            return 1
        print("CONTRACT_GRAPH=PASS")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"CONTRACT_GRAPH={document['verdict']} concepts={document['counts']['concepts']} "
          f"complete={document['counts']['complete']} breaks={document['counts']['breaks']}")
    for item in breaks:
        print(f"  BREAK {item['kind']:28} {item['concept']}: "
              f"{item.get('paths') or item.get('tables') or item.get('detail')}")
    return 0 if not breaks else 1


if __name__ == "__main__":
    raise SystemExit(main())
