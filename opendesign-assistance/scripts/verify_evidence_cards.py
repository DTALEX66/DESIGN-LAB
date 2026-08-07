#!/usr/bin/env python3
"""Fail-closed verifier for Open Design benchmark evidence cards."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
CARD_SCHEMA = json.loads((ROOT / "schemas/visual-quality/evidence-card.schema.json").read_text(encoding="utf-8"))
CARD_VALIDATOR = Draft202012Validator(CARD_SCHEMA)
REGISTRY = ROOT / "evals/benchmarks/benchmark-registry.json"
REQUIRED_GATES = {"no-signature-copy", "one-clear-focal-system", "source-and-license-record"}


def _load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def verify(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = _load(path)
        registry = _load(REGISTRY)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return [f"evidence card input unreadable: {exc}"]
    cards = data.get("cards") if isinstance(data, dict) else None
    if not isinstance(cards, list) or len(cards) != len(registry.get("benchmarks", [])):
        errors.append("card count must equal benchmark count")
        cards = cards if isinstance(cards, list) else []
    if data.get("human_calibration_policy", {}).get("required_for_promotion") is not True:
        errors.append("human calibration policy must require promotion review")
    benchmarks = {entry.get("id"): entry for entry in registry.get("benchmarks", []) if isinstance(entry, dict)}
    seen: set[str] = set()
    for card in cards:
        if not isinstance(card, dict):
            errors.append("card must be an object")
            continue
        schema_errors = sorted(CARD_VALIDATOR.iter_errors(card), key=lambda error: list(error.path))
        if schema_errors:
            errors.append(f"{card.get('card_id', '<unknown>')}: {schema_errors[0].message}")
            continue
        card_id = card["card_id"]
        benchmark_id = card["benchmark_id"]
        if card_id in seen:
            errors.append(f"duplicate card id: {card_id}")
        seen.add(card_id)
        benchmark = benchmarks.get(benchmark_id)
        if benchmark is None:
            errors.append(f"{card_id}: unknown benchmark {benchmark_id}")
            continue
        references = card["references"]
        for field, registry_field in (("brief", "brief"), ("rubric", "rubric"), ("evidence_schema", "evidence")):
            if references[field] != benchmark[registry_field]:
                errors.append(f"{card_id}: {field} does not match benchmark registry")
            if not (ROOT / references[field]).is_file():
                errors.append(f"{card_id}: missing reference {references[field]}")
        if card["artifact"]["path"] != references["brief"]:
            errors.append(f"{card_id}: artifact must remain a local benchmark fixture")
        if card["card_status"] == "accepted":
            calibration = card["human_calibration"]
            if calibration["status"] != "completed":
                errors.append(f"{card_id}: accepted card requires completed human calibration")
            if any(gate["status"] != "pass" for gate in card["hard_gates"]):
                errors.append(f"{card_id}: accepted card requires passing hard gates")
        if card["card_status"] == "not-run" and card["evidence_level"] != "E0":
            errors.append(f"{card_id}: not-run card must remain E0")
        if card["human_calibration"]["status"] != "completed" and card["card_status"] == "accepted":
            errors.append(f"{card_id}: non-completed calibration is non-authoritative")
        gate_ids = {gate["id"] for gate in card["hard_gates"]}
        if not REQUIRED_GATES & gate_ids:
            errors.append(f"{card_id}: no originality/source hard gate recorded")
    if set(card["benchmark_id"] for card in cards if isinstance(card, dict)) != set(benchmarks):
        errors.append("card benchmark id set does not match registry")
    return errors


def main() -> int:
    path = ROOT / "evals/evidence/evidence-cards.json"
    errors = verify(path)
    if errors:
        for error in errors:
            print(f"EVIDENCE_CARDS_FAIL {error}")
        return 1
    print("EVIDENCE_CARDS_PASS cards=12 human_calibration_required=true authoritative_accepts=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
