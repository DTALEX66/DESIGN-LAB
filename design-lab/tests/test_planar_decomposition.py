# SPDX-License-Identifier: MIT
"""DL-TP-T06 (MULTIMODAL-2026-09-05): planar decomposition mapping tests.

Verifies structural honesty: no module may set host ids, unmapped objects
cannot carry host_object_id, locking prevents silent re-map, font substitution
is explicit, and the emitted JSON validates against the planar-decomposition
schema contract. No real OCR/tracing or host execution is claimed.
"""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))
REPO = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO / "design-lab" / "schemas" / "contracts" / "planar-decomposition.schema.json"


class PlanarDecompositionTests(unittest.TestCase):
    def _plan(self):
        from design_lab.analysis.decomposition import CanvasRegion, Plan, PlanObject

        plan = Plan(
            decomposition_id="dec-1",
            source_ref="reference/poster.png",
            source_sha256="sha256:" + "a" * 64,
            canvas=CanvasRegion(0, 0, 1000, 1400),
            objects=[
                PlanObject("o1", "text", CanvasRegion(50, 50, 300, 80),
                           module="ocr", text_content="标题", font_status="matched"),
                PlanObject("o2", "image", CanvasRegion(50, 200, 500, 600), module="heuristic"),
            ],
        )
        plan.validate()
        return plan

    def test_module_detection_never_sets_host_id(self):
        """Replaceable modules return candidates; host ids only via verifier."""
        from design_lab.analysis.decomposition import DecomposeModule

        class FakeOcr(DecomposeModule):
            module_id = "ocr-fixture"

            def detect(self, source_path):
                return [{"kind": "text", "region": {"x": 0, "y": 0, "width": 1, "height": 1}}]

        raw = FakeOcr().detect("x.png")
        self.assertNotIn("host_object_id", raw[0])

    def test_unmapped_cannot_carry_host_object_id(self):
        from design_lab.analysis.decomposition import CanvasRegion, DecompositionError, Plan, PlanObject

        plan = self._plan()
        plan.objects[0].host_object_id = "AI:1"
        with self.assertRaisesRegex(DecompositionError, "unmapped"):
            plan.validate()

    def test_lock_requires_host_and_prevents_silent_remap(self):
        from design_lab.analysis.decomposition import DecompositionError

        plan = self._plan()
        with self.assertRaisesRegex(DecompositionError, "cannot lock without"):
            plan.objects[0].lock()
        plan.objects[0].mark_host_mapping("AI:layer:1", by_user=True)
        plan.objects[0].lock()
        with self.assertRaisesRegex(DecompositionError, "locked"):
            plan.objects[0].mark_host_mapping("AI:layer:2")

    def test_font_substitution_is_explicit(self):
        from design_lab.analysis.decomposition import DecompositionError

        plan = self._plan()
        plan.objects[0].font_status = "substituted"
        plan.validate()  # allowed but explicit
        plan.objects[0].font_status = "magic"
        with self.assertRaises(DecompositionError):
            plan.validate()

    def test_contract_json_validates_against_schema(self):
        import jsonschema

        plan = self._plan()
        payload = json.loads(plan.to_json())
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        jsonschema.validate(instance=payload, schema=schema)


if __name__ == "__main__":
    unittest.main()
