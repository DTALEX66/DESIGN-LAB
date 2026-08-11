# SPDX-License-Identifier: MIT
"""ODA4-0203/0204 / V42-0203/0204: user modes and four-object model contracts.

V42-0203: Guided/Copilot/Director/Method/Production modes over a single engine.
V42-0204: Project/Knowledge/Evidence/Artifact object model with lifecycle,
versioning, rights and references — schema-validated (E2).
"""
from __future__ import annotations

import json
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ASSISTANCE = REPO / "opendesign-assistance"

USER_MODES = ASSISTANCE / "profiles" / "user-modes.json"
USER_MODES_SCHEMA = ASSISTANCE / "schemas" / "user-modes.schema.json"
OBJECT_MODEL = ASSISTANCE / "config" / "object-model.json"
OBJECT_MODEL_SCHEMA = ASSISTANCE / "schemas" / "object-model.schema.json"

EXPECTED_MODES = {"guided", "copilot", "director", "method", "production"}
EXPECTED_OBJECTS = {"project", "knowledge", "evidence", "artifact"}


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _validate(schema: Path, instance: Path) -> list[str]:
    import jsonschema

    sch = _load(schema)
    inst = _load(instance)
    errors: list[str] = []
    for err in sorted(jsonschema.Draft202012Validator(sch).iter_errors(inst), key=lambda e: list(e.path)):
        errors.append(f"{'/'.join(str(p) for p in err.path)}: {err.message}")
    return errors


class UserModesTest(unittest.TestCase):
    def test_five_modes_complete(self):
        data = _load(USER_MODES)
        ids = {m["id"] for m in data["modes"]}
        self.assertEqual(ids, EXPECTED_MODES)

    def test_modes_against_doc(self):
        doc = (REPO / "project-memory" / "USER_MODES_V42.md").read_text(encoding="utf-8")
        for mid in EXPECTED_MODES:
            self.assertIn(mid, doc, f"USER_MODES_V42.md must mention mode {mid}")

    def test_no_second_product_shell(self):
        doc = (REPO / "project-memory" / "USER_MODES_V42.md").read_text(encoding="utf-8")
        self.assertIn("不创建多套产品", doc)

    def test_schema_validates(self):
        errs = _validate(USER_MODES_SCHEMA, USER_MODES)
        self.assertEqual(errs, [])


class ObjectModelTest(unittest.TestCase):
    def test_four_objects_complete(self):
        data = _load(OBJECT_MODEL)
        ids = {o["id"] for o in data["objects"]}
        self.assertEqual(ids, EXPECTED_OBJECTS)

    def test_lifecycle_versioning_rights_references_present(self):
        for obj in _load(OBJECT_MODEL)["objects"]:
            self.assertIn("lifecycle", obj, obj["id"])
            self.assertIn("versioning", obj, obj["id"])
            self.assertIn("rights", obj, obj["id"])
            self.assertIn("references", obj, obj["id"])
            self.assertIn("stages", obj["lifecycle"], obj["id"])
            self.assertIn("terminalStates", obj["lifecycle"], obj["id"])

    def test_immutable_objects_are_immutable(self):
        data = _load(OBJECT_MODEL)
        for obj in data["objects"]:
            if obj["id"] in ("knowledge", "evidence", "artifact"):
                self.assertTrue(obj["versioning"]["immutable"], f"{obj['id']} must be immutable")

    def test_rights_review_required_for_external_knowledge(self):
        data = _load(OBJECT_MODEL)
        for obj in data["objects"]:
            if obj["id"] in ("knowledge", "artifact"):
                self.assertEqual(obj["rights"]["licenseStatus"], "review-required", obj["id"])
                self.assertTrue(obj["rights"]["requiresReview"], obj["id"])

    def test_references_resolvable(self):
        data = _load(OBJECT_MODEL)
        ids = {o["id"] for o in data["objects"]}
        for obj in data["objects"]:
            for ref in obj["references"]["outgoing"]:
                self.assertIn(ref["target"], ids, f"{obj['id']} -> {ref['target']}")

    def test_schema_validates(self):
        errs = _validate(OBJECT_MODEL_SCHEMA, OBJECT_MODEL)
        self.assertEqual(errs, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
