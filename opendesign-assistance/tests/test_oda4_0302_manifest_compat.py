"""ODA4-0302: plugin/bundle manifest compatibility gate."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OFFICIAL_SCHEMA = "https://open-design.ai/schemas/plugin.v1.json"


class ManifestCompatibilityTest(unittest.TestCase):
    def setUp(self):
        self.manifests = (
            list((REPO / "opendesign-assistance" / "plugins").glob("*/open-design.json"))
            + list((REPO / "opendesign-assistance" / "bundles").glob("*/open-design.json"))
        )

    def test_all_manifests_valid_json_and_official_schema(self):
        self.assertTrue(len(self.manifests) >= 3, "expected at least 3 bundles/plugins")
        for m in self.manifests:
            d = json.loads(m.read_text(encoding="utf-8"))
            self.assertTrue(d["$schema"].startswith(OFFICIAL_SCHEMA), f"{m} wrong schema")
            self.assertTrue(d.get("license"), f"{m} missing license")
            self.assertTrue(d.get("name"), f"{m} missing name")
            self.assertTrue(d.get("version"), f"{m} missing version")

    def test_three_public_bundles_present(self):
        bundle_names = {m.parent.name for m in (REPO / "opendesign-assistance" / "bundles").glob("*/open-design.json")}
        self.assertIn("commercial-design-core", bundle_names)
        self.assertIn("visual-quality-core", bundle_names)
        self.assertIn("production-handoff", bundle_names)

    def test_no_fabricated_cli_parsed_from_manifest(self):
        # Manifests must not embed invented CLI arg strings; daemon CLI is
        # verified live in ODA4-0303, not declared here.
        for m in self.manifests:
            text = m.read_text(encoding="utf-8")
            self.assertNotIn("--daemon", text)
            self.assertNotIn("cli_args", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
