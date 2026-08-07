"""ODA4-0204: Domain Pack Spec V2 validator tests (positive + negative fixtures)."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import importlib.util

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "opendesign-assistance" / "scripts" / "verify_domain_pack_v2.py"


def load_mod():
    spec = importlib.util.spec_from_file_location("vdp2", SCRIPT)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def make_pack(base: Path, complete: bool, prompt_only: bool = False) -> Path:
    pack = base / "uiux-design"
    pack.mkdir(parents=True, exist_ok=True)
    required = {
        "schemas/brief.schema.json": "{}",
        "scenario.md": "# scenario",
        "profile.json": "{}",
        "rubric.json": "{}",
        "preflight.json": "{}",
        "handoff-contract.json": "{}",
        "sources.json": "{}",
    }
    (pack / "benchmarks").mkdir(exist_ok=True)
    (pack / "evidence").mkdir(exist_ok=True)
    (pack / "schemas").mkdir(exist_ok=True)
    (pack / "benchmarks" / "case1.json").write_text("{}", encoding="utf-8")
    (pack / "evidence" / "card1.json").write_text("{}", encoding="utf-8")
    for rel, content in required.items():
        (pack / rel).write_text(content, encoding="utf-8")
    manifest = {
        "schema_version": "open-design-assistance/domain-pack/v2",
        "pack_id": "uiux-design",
        "version": "0.1.0",
        "display_name": "UI/UX Design",
        "domain": "ui-ux",
        "size_bytes_budget": 5_242_880,
        "dependencies": [],
        "files": {
            "manifest": "manifest.json",
            "brief_schema": "schemas/brief.schema.json",
            "scenario": "scenario.md",
            "profile": "profile.json",
            "rubric": "rubric.json",
            "preflight": "preflight.json",
            "handoff_contract": "handoff-contract.json",
            "source_mapping": "sources.json",
            "benchmark_cases": "benchmarks/",
            "evidence_cards": "evidence/",
        },
    }
    if prompt_only:
        manifest["files"] = {"manifest": "manifest.json"}  # incomplete -> should fail
    (pack / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return pack


class DomainPackV2Test(unittest.TestCase):
    def test_complete_pack_passes(self):
        mod = load_mod()
        with tempfile.TemporaryDirectory() as td:
            pack = make_pack(Path(td), complete=True)
            ok, errors = mod.validate(pack)
            self.assertTrue(ok, f"errors: {errors}")

    def test_prompt_only_pack_fails(self):
        mod = load_mod()
        with tempfile.TemporaryDirectory() as td:
            pack = make_pack(Path(td), complete=False, prompt_only=True)
            ok, errors = mod.validate(pack)
            self.assertFalse(ok, "prompt-only pack must fail")
            self.assertTrue(any("manifest missing files" in e or "missing required element" in e for e in errors))

    def test_missing_element_fails(self):
        mod = load_mod()
        with tempfile.TemporaryDirectory() as td:
            pack = make_pack(Path(td), complete=True)
            (pack / "rubric.json").unlink()
            ok, errors = mod.validate(pack)
            self.assertFalse(ok)
            self.assertTrue(any("rubric" in e for e in errors), f"errors: {errors}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
