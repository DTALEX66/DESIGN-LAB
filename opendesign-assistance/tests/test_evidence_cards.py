# SPDX-License-Identifier: MIT
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "verify_evidence_cards.py"
REGISTRY = ROOT / "evals" / "evidence" / "evidence-cards.json"


def load_module():
    spec = importlib.util.spec_from_file_location("verify_evidence_cards", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class EvidenceCardTests(unittest.TestCase):
    def test_all_benchmarks_have_non_authoritative_cards(self):
        module = load_module()
        errors = module.verify(REGISTRY)
        self.assertEqual(errors, [])
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.assertEqual(len(data["cards"]), 12)
        self.assertTrue(all(card["card_status"] == "not-run" for card in data["cards"]))

    def test_accepted_card_requires_completed_human_calibration(self):
        module = load_module()
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        data["cards"][0]["card_status"] = "accepted"
        data["cards"][0]["human_calibration"]["status"] = "pending"
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / "evidence-cards.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            errors = module.verify(path)
        self.assertTrue(any("human calibration" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
