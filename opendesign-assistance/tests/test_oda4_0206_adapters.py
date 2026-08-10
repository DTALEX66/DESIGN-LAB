"""ODA4-0206 / V42-0107: adapter neutrality, evidence-gated status, fallback/unsupported tests."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
REGISTRY = REPO / "opendesign-assistance" / "adapters" / "adapter-registry.json"
SCHEMA = REPO / "opendesign-assistance" / "schemas" / "adapter-contract.schema.json"

VALID_STATUSES = {"declared", "structural", "runtime", "missing", "unsupported"}


class AdapterRegistryTest(unittest.TestCase):
    def test_no_available_status_without_runtime_evidence(self):
        """V42-0107: no adapter may claim 'available'; runtime requires evidence."""
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            self.assertNotEqual(ad["status"], "available", f"{ad['tool']} still says available")
            if ad["status"] in ("declared", "structural"):
                evidence = ad.get("evidence", {})
                self.assertLessEqual(
                    evidence.get("level", "E5"),
                    "E1",
                    f"{ad['tool']} declared/structural status must not claim above E1",
                )
                self.assertEqual(evidence.get("task_ids"), [], f"{ad['tool']} declared but has runtime tasks")

    def test_missing_capabilities_not_presented_as_available(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            if ad["status"] == "missing":
                for cap in ad["capabilities"]:
                    self.assertFalse(cap["supported"], f"{ad['tool']} {cap['name']} supported but missing")
            else:
                for cap in ad["capabilities"]:
                    if cap["supported"]:
                        self.assertIn(ad["status"], ("declared", "structural", "runtime"),
                                      f"{ad['tool']} {cap['name']} supported but status {ad['status']}")

    def test_large_tools_process_isolated(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            if "Blender" in ad["tool"] or "FFmpeg" in ad["tool"]:
                self.assertEqual(ad["mode"], "process-isolated")
                self.assertEqual(ad["status"], "missing")  # honest: not proven

    def test_fallback_defined_for_missing(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            if ad["status"] == "missing":
                self.assertTrue(ad.get("fallback"), f"{ad['tool']} missing but no fallback")

    def test_primary_runtime_is_open_design(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.assertEqual(data["primaryRuntime"], "Open Design")

    def test_every_adapter_has_evidence_block(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            self.assertIn("evidence", ad, f"{ad['tool']} missing evidence block")
            ev = ad["evidence"]
            self.assertIn("level", ev)
            self.assertIn("task_ids", ev)
            self.assertIn("artifact_paths", ev)

    def test_registry_schema_validates(self):
        """Registry must conform to adapter-contract schema v2 (V42-0107)."""
        import jsonschema  # available via requirements.txt? only if installed
        schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            jsonschema.validate(instance=ad, schema=schema)


if __name__ == "__main__":
    unittest.main(verbosity=2)
