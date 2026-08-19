# SPDX-License-Identifier: MIT
"""DL-CORE-001: object-model schema round-trip tests.

Validates that every core object in object-model.json:
1. has a resolvable schemaRef (schema file exists),
2. the schema parses as valid JSON Schema,
3. a minimal fixture instance round-trips (validates against the schema).

Requires: jsonschema (declared in requirements.txt).
"""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

try:
    import jsonschema
except ImportError:
    jsonschema = None  # type: ignore

OBJECT_MODEL = ROOT / "design-lab" / "config" / "object-model.json"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


@unittest.skipIf(jsonschema is None, "jsonschema not installed")
class ObjectModelRoundTripTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = load_json(OBJECT_MODEL)
        cls.objects = cls.model["objects"]
        cls.schemas_dir = ROOT / "design-lab" / "schemas"

    def test_all_objects_have_resolvable_schema_ref(self):
        missing = []
        for obj in self.objects:
            ref = obj.get("schemaRef", "")
            schema_path = self.schemas_dir / Path(ref).name
            if not schema_path.exists():
                missing.append(f"{obj['id']} -> {ref}")
        self.assertEqual(missing, [], f"missing schemas: {missing}")

    def test_all_schemas_parse_as_valid_json_schema(self):
        bad = []
        for obj in self.objects:
            ref = obj.get("schemaRef", "")
            schema_path = self.schemas_dir / Path(ref).name
            if not schema_path.exists():
                continue
            try:
                schema = load_json(schema_path)
                jsonschema.Draft202012Validator.check_schema(schema)
            except Exception as exc:
                bad.append(f"{obj['id']}: {exc}")
        self.assertEqual(bad, [], f"invalid schemas: {bad}")

    def _build_minimal(self, schema: dict, depth: int = 0) -> dict:
        """Build a minimal valid instance from schema constraints."""
        if depth > 3:
            return {}
        instance = {}
        required = schema.get("required", [])
        for req in required:
            prop = schema.get("properties", {}).get(req, {})
            instance[req] = self._value_for(prop, depth, key=req)
        return instance

    def _value_for(self, prop: dict, depth: int, key: str = "") -> object:
        if "const" in prop:
            return prop["const"]
        if "enum" in prop:
            return prop["enum"][0]
        t = prop.get("type")
        if t == "array":
            items = prop.get("items", {})
            min_items = prop.get("minItems", 0)
            return [self._value_for(items, depth + 1)] * max(1, min_items)
        if t == "object":
            return self._build_minimal(prop, depth + 1)
        if t == "integer" or t == "number":
            return 1
        if t == "boolean":
            return True
        # contentHash-style fields require sha256:<64hex>; others use test-value
        if key in ("contentHash", "content_hash", "content_hash64"):
            return "sha256:" + "0" * 64
        return "test-value"

    def test_minimal_fixture_round_trips(self):
        """A minimal fixture instance must validate against each schema."""
        failures = []
        for obj in self.objects:
            ref = obj.get("schemaRef", "")
            schema_path = self.schemas_dir / Path(ref).name
            if not schema_path.exists():
                failures.append(f"{obj['id']}: schema missing")
                continue
            schema = load_json(schema_path)
            instance = self._build_minimal(schema)
            try:
                jsonschema.validate(instance, schema)
            except jsonschema.ValidationError as exc:
                failures.append(f"{obj['id']}: {exc.message[:120]}")
        self.assertEqual(failures, [], f"round-trip failures: {failures}")

    def test_object_count(self):
        self.assertGreaterEqual(len(self.objects), 11, "taskpack requires >= 11 core objects")


if __name__ == "__main__":
    unittest.main()
