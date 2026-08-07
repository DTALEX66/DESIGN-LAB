"""ODA4-0206: adapter neutrality + fallback/unsupported tests."""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
REGISTRY = REPO / "opendesign-assistance" / "adapters" / "adapter-registry.json"


class AdapterRegistryTest(unittest.TestCase):
    def test_missing_capabilities_not_presented_as_available(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            if ad["status"] == "available":
                for cap in ad["capabilities"]:
                    self.assertTrue(cap["supported"], f"{ad['tool']} {cap['name']} unsupported but available")

    def test_large_tools_process_isolated(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            if "Blender" in ad["tool"] or "FFmpeg" in ad["tool"]:
                self.assertEqual(ad["mode"], "process-isolated")
                self.assertNotEqual(ad["status"], "available")  # honest: not proven

    def test_fallback_defined_for_missing(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for ad in data["adapters"]:
            if ad["status"] == "missing":
                self.assertTrue(ad.get("fallback"), f"{ad['tool']} missing but no fallback")

    def test_primary_runtime_is_open_design(self):
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.assertEqual(data["primaryRuntime"], "Open Design")


if __name__ == "__main__":
    unittest.main(verbosity=2)
