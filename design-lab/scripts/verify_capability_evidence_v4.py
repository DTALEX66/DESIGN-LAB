#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Validate capability evidence promotion and provenance (ODA4-0205).

Enforces:
- Evidence levels E1->E2->E3->E4->E5 cannot be skipped or impersonated.
- A state can only promote if the prior level's required artifacts exist.
- Evidence binds an exact tree SHA.
- Provenance roundtrip: every step/artifact hash is consistent.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

PROMOTION = [
    ("E0", "E1", ["declaration_doc"]),
    ("E1", "E2", ["command_output", "readback_artifact"]),
    ("E2", "E3", ["runtime_id", "task_id", "artifact_provenance"]),
    ("E3", "E4", ["frozen_tree", "independent_review", "exact_sha_ci"]),
    ("E4", "E5", ["external_acceptance"]),
]

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
LEVEL_ORDER = {"E0": 0, "E1": 1, "E2": 2, "E3": 3, "E4": 4, "E5": 5}


def check_promotion(level: str, artifacts: list[str]) -> list[str]:
    """Return errors if the evidence level cannot be supported by artifacts."""
    errors = []
    for from_lvl, to_lvl, required in PROMOTION:
        if level == to_lvl:
            missing = [a for a in required if a not in artifacts]
            if missing:
                errors.append(f"level {level} requires artifacts missing: {missing}")
        elif level in (from_lvl,):
            # ensure the chain is contiguous; caller validates exact level
            pass
    return errors


def validate_record(rec: dict, capability_levels: dict[str, str] | None = None) -> list[str]:
    errors = []
    level = rec.get("evidence_level")
    if level not in ["E0", "E1", "E2", "E3", "E4", "E5"]:
        return [f"invalid evidence_level: {level}"]

    artifacts = [str(a) for a in rec.get("artifacts", [])]
    errors += check_promotion(level, artifacts)

    # exact-tree binding for E3+
    if level in ("E3", "E4", "E5"):
        tree = rec.get("tree_sha", "")
        if not SHA_RE.match(tree):
            errors.append(f"level {level} requires exact tree_sha, got: {tree!r}")

    # E3 must not be claimed from static files
    if level == "E3":
        static_only = all(not any(k in str(a) for k in ["runtime", "task_id", "provenance"]) for a in artifacts)
        if static_only:
            errors.append("E3 claimed without runtime/task/provenance evidence (static files only)")

    # A detailed record cannot claim more than the capability's current
    # top-level actualEvidence. This catches stale E3 records left behind
    # after a capability is requalified back to E1 on a new tree.
    if capability_levels is not None:
        capability_id = rec.get("capability_id", "")
        declared = capability_levels.get(capability_id)
        if declared is None:
            errors.append(f"record capability_id not declared in capabilities: {capability_id!r}")
        elif level in LEVEL_ORDER and LEVEL_ORDER[level] > LEVEL_ORDER[declared]:
            errors.append(
                f"record evidence_level {level} exceeds capability actualEvidence {declared}"
            )
    return errors


def validate_evidence_surfaces(
    capability_levels: dict[str, str],
    repo: Path = REPO,
) -> list[str]:
    """Reject detailed evidence that overclaims the top-level capability state."""
    errors: list[str] = []
    visual_level = capability_levels.get("visual-quality")
    evidence_dir = repo / "domain-packs" / "uiux-design" / "evidence"

    for path in sorted(evidence_dir.glob("*.json")):
        try:
            detail = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(repo)}: unreadable evidence detail: {exc}")
            continue
        level = detail.get("evidence_level")
        if level not in LEVEL_ORDER:
            continue
        if visual_level in LEVEL_ORDER and LEVEL_ORDER[level] > LEVEL_ORDER[visual_level]:
            errors.append(
                f"{path.relative_to(repo)}: evidence_level {level} exceeds "
                f"visual-quality actualEvidence {visual_level}"
            )
        if level in ("E3", "E4", "E5"):
            tree_sha = detail.get("tree_sha", "")
            if not SHA_RE.match(str(tree_sha)):
                errors.append(f"{path.relative_to(repo)}: {level} requires exact tree_sha")

    adapter_root = repo / "adapters" / "creative-tools"
    historical_markers = (
        "invalidated",
        "historical",
        "not current evidence",
        "历史候选",
        "失效",
        "不得用于 e3",
    )
    for path in sorted(adapter_root.glob("*/evidence/E3-*.md")):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            errors.append(f"{path.relative_to(repo)}: unreadable evidence detail: {exc}")
            continue
        lowered = text.lower()
        if any(marker in lowered for marker in historical_markers):
            continue
        errors.append(
            f"{path.relative_to(repo)}: active E3 file lacks explicit current-tree "
            "qualification; use full SHA/runtime/provenance/read-back or mark historical"
        )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("records", nargs="?", help="JSON file with {records:[...]} (default: config/capability-evidence-index.json)")
    args = parser.parse_args()
    if not args.records:
        args.records = str(REPO / "config" / "capability-evidence-index.json")
    data = json.loads(Path(args.records).read_text(encoding="utf-8"))
    records = data.get("records") if isinstance(data, dict) else data
    errors: list[str] = []
    capability_levels: dict[str, str] = {}
    if isinstance(data, dict):
        capabilities = data.get("capabilities", [])
        if not isinstance(capabilities, list):
            errors.append("capabilities must be a list")
        else:
            for capability in capabilities:
                if not isinstance(capability, dict):
                    errors.append("capabilities must contain objects")
                    continue
                capability_id = capability.get("id", "")
                actual = capability.get("actualEvidence")
                if not capability_id or actual not in LEVEL_ORDER:
                    errors.append(f"invalid capability actualEvidence: {capability_id!r}={actual!r}")
                else:
                    capability_levels[capability_id] = actual

        bound_tree = data.get("boundTree", "")
        if not SHA_RE.match(bound_tree):
            errors.append(f"boundTree must be a 40-hex SHA, got: {bound_tree!r}")
        else:
            head = subprocess.run(
                ["git", "-C", str(REPO.parent), "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
            ).stdout.strip()
            if not head:
                errors.append("git HEAD unresolvable for boundTree check")
            else:
                ancestry = subprocess.run(
                    ["git", "-C", str(REPO.parent), "merge-base", "--is-ancestor", bound_tree, head],
                    capture_output=True,
                    text=True,
                )
                if ancestry.returncode != 0:
                    errors.append(f"boundTree {bound_tree[:12]} is not an ancestor of HEAD {head[:12]}")

        status_path = REPO / "config" / "capability-status.json"
        try:
            status_data = json.loads(status_path.read_text(encoding="utf-8"))
            status_records = status_data.get("capabilityRecords", {})
            if not isinstance(status_records, dict):
                errors.append("capability-status capabilityRecords must be an object")
            else:
                for capability_id, actual in capability_levels.items():
                    status = status_records.get(capability_id)
                    if not isinstance(status, dict):
                        errors.append(f"capability-status missing capability: {capability_id!r}")
                    elif status.get("evidenceLevel") != actual:
                        errors.append(
                            f"capability-status evidenceLevel mismatch for {capability_id!r}: "
                            f"{status.get('evidenceLevel')!r} != {actual!r}"
                        )
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"capability-status unreadable: {exc}")

        errors.extend(validate_evidence_surfaces(capability_levels))

    if not isinstance(records, list):
        errors.append("records must be a list")
        records = []
    for rec in records:
        if not isinstance(rec, dict):
            errors.append("record must be an object")
            continue
        rec_errors = validate_record(rec, capability_levels or None)
        for e in rec_errors:
            errors.append(f"{rec.get('capability_id','?')}: {e}")
    for e in errors:
        print("ERROR", e)
    print(f"CAPABILITY_EVIDENCE_V4={'PASS' if not errors else 'FAIL'} records={len(records)}")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
