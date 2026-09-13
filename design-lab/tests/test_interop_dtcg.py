# SPDX-License-Identifier: MIT
"""DL-P0-110: DTCG token document contract, alias semantics and round trip (E1 structural)."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from design_lab.interop import InteropError  # noqa: E402
from design_lab.interop import dtcg  # noqa: E402

SCHEMA_PATH = ROOT / "design-lab/schemas/interop-dtcg-document.schema.json"


def rich_document() -> dict:
    """Nested groups, $type inheritance, aliases and six composite/scalar types."""
    return {
        "$schema": "https://design-tokens.bit.dev/schema.json",
        "$description": "DL-P0-110 rich fixture",
        "$extensions": {"com.example.fixture": {"name": "rich"}},
        "color": {
            "$type": "color",
            "$description": "palette",
            "brand": {
                "$root": {"$value": "#0E1116"},
                "primary": {"$value": "#2563EB", "$description": "primary brand"},
                "on-primary": {"$value": "#FFFFFF"},
            },
            "semantic": {
                "$type": "color",
                "danger": {"$value": "{color.brand.primary}"},
                "danger-deep": {"$value": "{color.semantic.danger}"},
            },
            "p3": {"$value": {"colorSpace": "display-p3", "components": [0.2, 0.4, 0.9],
                              "alpha": 1, "hex": "#3366E6"}},
        },
        "scale": {
            "$type": "dimension",
            "space": {
                "1": {"$value": "4px"},
                "2": {"$value": {"value": 0.5, "unit": "rem"}},
                "3": {"$value": "{scale.space.1}"},
            },
        },
        "font": {"$type": "fontFamily", "ui": {"$value": ["Inter", "system-ui"]}},
        "weight": {"$type": "fontWeight",
                   "bold": {"$type": "fontWeight", "$value": 700},
                   "book": {"$value": "book"}},
        "count": {"$type": "number", "columns": {"$value": 12}},
        "motion": {
            "duration": {"$type": "duration", "fast": {"$value": "120ms"}},
            "ease": {"$type": "cubicBezier", "standard": {"$value": [0.4, 0.0, 0.2, 1.0]}},
            "transition": {
                "$type": "transition",
                "base": {"$value": {"duration": "{motion.duration.fast}",
                                    "delay": {"value": 0, "unit": "ms"},
                                    "timingFunction": "{motion.ease.standard}"}},
            },
        },
        "text": {
            "$type": "typography",
            "body": {"$value": {"fontFamily": "{font.ui}", "fontSize": "{scale.space.2}",
                                "fontWeight": "{weight.book}", "lineHeight": 1.5}},
        },
        "elevation": {
            "$type": "shadow",
            "low": {"$value": {"color": "{color.brand.primary}", "offsetX": "0px", "offsetY": "1px",
                               "blur": "2px", "spread": "0px"}},
            "stacked": {"$value": [
                {"color": "#00000033", "offsetX": "0px", "offsetY": "1px", "blur": "2px", "spread": "0px"},
                {"color": "#00000022", "offsetX": "0px", "offsetY": "4px", "blur": "8px", "spread": "1px"},
            ]},
        },
        "outline": {"$type": "border", "thin": {"$value": {"color": "{color.brand.primary}",
                                                           "width": "1px", "style": "solid"}}},
        "wash": {"$type": "gradient", "hero": {"$value": [
            {"color": "#000000", "position": 0.0},
            {"color": "{color.brand.primary}", "position": 1.0},
        ]}},
        "stroke": {"$type": "strokeStyle", "dashed": {"$value": {"dashArray": ["4px", "2px"],
                                                                 "lineCap": "round"}}},
    }


class DtcgFixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        parent = ROOT / ".project-local/task-runtime/interop-dtcg-tests"
        parent.mkdir(parents=True, exist_ok=True)
        cls._temp = tempfile.TemporaryDirectory(dir=parent)
        cls.addClassCleanup(cls._temp.cleanup)
        cls.workdir = Path(cls._temp.name)


class DtcgValidateTest(DtcgFixture):
    def test_schema_is_repo_owned_draft_2020_12(self):
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
        self.assertEqual(schema["$id"],
                         "https://dtalex66.local/schemas/interop-dtcg-document.schema.json")
        self.assertEqual(dtcg.SCHEMA_VERSION, "2025.10")

    def test_rich_document_reports_types_and_aliases(self):
        report = dtcg.validate_document(rich_document())
        self.assertEqual(report["schemaVersion"], "2025.10")
        self.assertEqual(report["token_count"], 22)
        self.assertEqual(report["alias_tokens"], 8)
        self.assertEqual(report["root_tokens"], ["color.brand"])
        for type_name in ("color", "dimension", "duration", "fontFamily", "fontWeight", "number",
                          "cubicBezier", "strokeStyle", "typography", "shadow", "border",
                          "transition", "gradient"):
            self.assertIn(type_name, report["types"], type_name)
        self.assertEqual(report["legacy_types"], [])
        self.assertEqual(report["typography_letterSpacing"], "optional")

    def test_document_can_be_written_and_reloaded_unchanged(self):
        target = self.workdir / "design-tokens.dtcg.json"
        target.write_text(json.dumps(rich_document(), ensure_ascii=False, indent=2), encoding="utf-8")
        reloaded = json.loads(target.read_text(encoding="utf-8"))
        self.assertEqual(dtcg.validate_document(reloaded)["token_count"], 22)

    def test_type_inheritance_reaches_nested_groups(self):
        flat = dtcg.flatten(rich_document())
        self.assertEqual(flat["color.semantic.danger-deep"]["$type"], "color")
        self.assertEqual(flat["scale.space.3"]["$type"], "dimension")
        self.assertEqual(flat["motion.transition.base"]["type_source"], "inherited")
        self.assertEqual(flat["scale.space.1"]["type_source"], "inherited")
        self.assertEqual(flat["color.p3"]["type_source"], "inherited")
        self.assertEqual(flat["weight.bold"]["type_source"], "explicit")
        self.assertEqual(flat["weight.book"]["type_source"], "inherited")

    def test_root_token_flattens_onto_group_path(self):
        flat = dtcg.flatten(rich_document())
        self.assertTrue(flat["color.brand"]["is_root"])
        self.assertEqual(flat["color.brand"]["$value"], "#0E1116")

    def test_alias_chain_is_recorded(self):
        flat = dtcg.flatten(rich_document())
        self.assertEqual(flat["color.semantic.danger-deep"]["alias_chain"],
                         ["color.semantic.danger", "color.brand.primary"])
        self.assertEqual(flat["color.semantic.danger"]["$value"], "#2563EB")
        self.assertEqual(flat["color.brand.primary"]["alias_chain"], [])
        self.assertEqual(flat["motion.transition.base"]["$value"]["duration"], "120ms")
        self.assertEqual(flat["motion.transition.base"]["$value"]["timingFunction"],
                         [0.4, 0.0, 0.2, 1.0])

    def test_unresolvable_alias_fails_closed(self):
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document({"a": {"$type": "color", "$value": "{a.missing}"}})
        self.assertIn("does not resolve", str(caught.exception))

    def test_alias_cycle_fails_closed_with_the_cycle_path(self):
        document = {"a": {"$type": "color", "$value": "{b}"},
                    "b": {"$type": "color", "$value": "{c}"},
                    "c": {"$type": "color", "$value": "{a}"}}
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document(document)
        self.assertIn("alias cycle", str(caught.exception))
        self.assertIn("a -> b -> c -> a", str(caught.exception))

    def test_self_referencing_alias_fails_closed(self):
        with self.assertRaises(InteropError):
            dtcg.validate_document({"a": {"$type": "color", "$value": "{a}"}})

    def test_missing_and_unknown_types_fail_closed(self):
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document({"a": {"$value": "#fff"}})
        self.assertIn("no $type", str(caught.exception))
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document({"a": {"$type": "colour", "$value": "#fff"}})
        self.assertIn("unknown $type", str(caught.exception))

    def test_legacy_types_need_explicit_opt_in(self):
        document = {"theme": {"$type": "string", "$value": "dark"},
                    "flag": {"$type": "boolean", "$value": True}}
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document(document)
        self.assertIn("non-DTCG type", str(caught.exception))
        report = dtcg.validate_document(document, allow_legacy_types=True)
        self.assertEqual(report["legacy_types"], ["boolean", "string"])

    def test_composite_member_rules_fail_closed(self):
        cases = {
            "typography missing fontWeight": {"t": {"$type": "typography", "$value": {
                "fontFamily": "Inter", "fontSize": "16px", "lineHeight": 1.2}}},
            "shadow missing blur": {"s": {"$type": "shadow", "$value": {
                "color": "#000", "offsetX": "0px", "offsetY": "1px", "spread": "0px"}}},
            "gradient single stop": {"g": {"$type": "gradient", "$value": [
                {"color": "#000", "position": 0}]}},
            "cubicBezier length": {"c": {"$type": "cubicBezier", "$value": [0, 0, 1]}},
            "border bad style": {"b": {"$type": "border", "$value": {
                "color": "#000", "width": "1px", "style": "wavy"}}},
            "dimension unit": {"d": {"$type": "dimension", "$value": "4furlongs"}},
            "fontWeight range": {"w": {"$type": "fontWeight", "$value": 1200}},
            "color junk string": {"c": {"$type": "color", "$value": "red; drop table"}},
        }
        for label, document in cases.items():
            with self.subTest(label):
                with self.assertRaises(InteropError):
                    dtcg.validate_document(document)

    def test_structural_schema_rejects_unknown_reserved_member(self):
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document({"a": {"$type": "color", "$value": "#fff", "$bogus": 1}})
        self.assertIn("interop-dtcg-document.schema.json", str(caught.exception))

    def test_token_without_value_is_not_a_token(self):
        with self.assertRaises(InteropError):
            dtcg.validate_document({"a": {"$type": "color"}})

    def test_groups_only_document_has_no_tokens(self):
        with self.assertRaises(InteropError) as caught:
            dtcg.validate_document({"a": {"b": {"$type": "color"}}})
        self.assertIn("declares no tokens", str(caught.exception))


class DtcgRoundTripTest(DtcgFixture):
    def test_roundtrip_is_lossless_for_the_rich_fixture(self):
        document = rich_document()
        rebuilt = dtcg.roundtrip(document)
        self.assertEqual(rebuilt, document)
        self.assertEqual(json.dumps(rebuilt, sort_keys=True), json.dumps(document, sort_keys=True))

    def test_roundtrip_restores_aliases_not_resolved_values(self):
        rebuilt = dtcg.roundtrip(rich_document())
        self.assertEqual(rebuilt["color"]["semantic"]["danger"]["$value"], "{color.brand.primary}")
        self.assertEqual(rebuilt["color"]["semantic"]["$type"], "color")
        self.assertNotIn("$type", rebuilt["color"]["brand"]["primary"])
        self.assertEqual(rebuilt["color"]["brand"]["$root"]["$value"], "#0E1116")

    def test_roundtrip_keeps_a_group_type_every_child_overrides(self):
        document = {"g": {"$type": "number", "a": {"$type": "number", "$value": 1},
                          "b": {"$type": "number", "$value": 2}}}
        self.assertEqual(dtcg.roundtrip(document), document)

    def test_roundtrip_keeps_group_and_document_metadata(self):
        rebuilt = dtcg.roundtrip(rich_document())
        self.assertEqual(rebuilt["$extensions"], {"com.example.fixture": {"name": "rich"}})
        self.assertEqual(rebuilt["color"]["$description"], "palette")

    def test_to_document_without_meta_emits_explicit_types(self):
        flat = {"color.brand": {"$type": "color", "$value": "#2563EB"}}
        self.assertEqual(dtcg.to_document(flat),
                         {"color": {"brand": {"$type": "color", "$value": "#2563EB"}}})

    def test_meta_key_is_reserved_and_cannot_be_a_token_path(self):
        flat = dtcg.flatten(rich_document())
        self.assertIn("$meta", flat)
        self.assertTrue(all(not key.startswith("$") for key in flat if key != "$meta"))
        self.assertEqual(sorted(flat["$meta"]),
                         ["document", "groups", "legacy_types", "order", "report", "schemaVersion"])

    def test_roundtrip_of_the_repository_dtcg_artifacts(self):
        systems = ROOT / "design-lab/design-systems"
        names = ("anomaly-monitor-dark", "uiux-commercial-light")
        checked = 0
        for name in names:
            source = systems / name / "design-tokens.dtcg.json"
            if not source.is_file():
                continue
            document = json.loads(source.read_text(encoding="utf-8"))
            with self.subTest(name):
                with self.assertRaises(InteropError):
                    dtcg.validate_document(document)
                report = dtcg.validate_document(document, allow_legacy_types=True)
                self.assertIn("string", report["legacy_types"])
                self.assertEqual(dtcg.roundtrip(document, allow_legacy_types=True), document)
            checked += 1
        self.assertGreater(checked, 0, "expected the in-repo DTCG artifacts to exist")


class DtcgCssProjectionTest(DtcgFixture):
    def test_projection_is_labelled_and_deterministic(self):
        first = dtcg.to_css_variables(rich_document())
        second = dtcg.to_css_variables(rich_document())
        self.assertEqual(first, second)
        self.assertEqual(first["projection"], "css-custom-properties")
        self.assertFalse(first["source_of_truth"])
        self.assertIn("source of truth", first["note"])

    def test_scalar_types_project_and_composites_are_omitted(self):
        projection = dtcg.to_css_variables(rich_document(), prefix="--dl")
        variables = projection["variables"]
        self.assertEqual(variables["--dl-color-brand-primary"], "#2563EB")
        self.assertEqual(variables["--dl-scale-space-2"], "0.5rem")
        self.assertEqual(variables["--dl-motion-ease-standard"], "cubic-bezier(0.4, 0, 0.2, 1)")
        self.assertEqual(variables["--dl-color-p3"], "#3366E6")
        self.assertEqual(variables["--dl-count-columns"], "12")
        for path in ("text.body", "elevation.low", "outline.thin", "wash.hero", "stroke.dashed",
                     "motion.transition.base"):
            self.assertIn(path, projection["omitted"], path)

    def test_name_collision_and_bad_prefix_fail_closed(self):
        with self.assertRaises(InteropError):
            dtcg.to_css_variables(rich_document(), prefix="dl")
        document = {"a-b": {"$type": "number", "$value": 1},
                    "a.b": {"$type": "number", "$value": 2}}
        with self.assertRaises(InteropError) as caught:
            dtcg.to_css_variables(document)
        self.assertIn("both project to CSS variable", str(caught.exception))

    def test_projection_reflects_resolved_alias_values(self):
        projection = dtcg.to_css_variables(rich_document())
        self.assertEqual(projection["variables"]["--dl-color-semantic-danger-deep"], "#2563EB")


if __name__ == "__main__":
    unittest.main(verbosity=2)
