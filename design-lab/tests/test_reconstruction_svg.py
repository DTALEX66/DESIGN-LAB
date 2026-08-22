# SPDX-License-Identifier: MIT
"""Deterministic and adversarial SVG reconstruction tests."""
from __future__ import annotations

import copy
import os
import shutil
import subprocess
import sys
import unittest
import uuid
from pathlib import Path
from unittest import mock

DESIGN_LAB = Path(__file__).resolve().parents[1]
PROJECT_ROOT = DESIGN_LAB.parent
FIXTURE = DESIGN_LAB / "tests" / "fixtures" / "reconstruction" / "flat-64.png"
if str(DESIGN_LAB) not in sys.path:
    sys.path.insert(0, str(DESIGN_LAB))

from reconstruction.svg import serialize_svg  # noqa: E402
from reconstruction.svg_safety import UnsafeSVGError, sanitize_svg  # noqa: E402


def base_layer(layer_id: str, node_type: str, z_order: int = 0) -> dict:
    return {
        "id": layer_id,
        "type": node_type,
        "name": layer_id,
        "opacity": 1.0,
        "bounds": {"x": 0, "y": 0, "width": 64, "height": 64},
        "inferred": False,
        "zOrder": z_order,
        "visible": True,
        "locked": False,
        "blendMode": "normal",
    }


def style() -> dict:
    return {
        "fill": "#336699",
        "stroke": "#000000",
        "strokeWidth": 1,
        "fillRule": "nonzero",
        "lineCap": "round",
        "lineJoin": "bevel",
    }


def rectangle_layer(layer_id: str = "rectangle", z_order: int = 0) -> dict:
    layer = base_layer(layer_id, "primitive", z_order)
    layer.update(
        {
            "primitive": {
                "kind": "rect",
                "parameters": {"x1": 4, "y1": 5, "x2": 60, "y2": 59, "rx": 2, "ry": 3},
            },
            "style": style(),
            "masks": [],
        }
    )
    return layer


def path_layer(layer_id: str = "path", z_order: int = 0) -> dict:
    layer = base_layer(layer_id, "path", z_order)
    layer.update(
        {
            "geometry": {"pathData": "M1 1 C 10 5 20 30 63 63 Z", "closed": True},
            "style": style(),
            "masks": [],
        }
    )
    return layer


def text_layer(layer_id: str = "text", z_order: int = 0) -> dict:
    layer = base_layer(layer_id, "text", z_order)
    layer["bounds"] = {"x": 2, "y": 3, "width": 50, "height": 20}
    layer["text"] = {
        "content": "A < B & C",
        "disposition": "live",
        "fontCandidates": [
            {"family": "Arial", "weight": 400, "style": "normal", "confidence": 1.0}
        ],
        "outlineFallback": {"available": False, "pathData": None},
    }
    return layer


def raster_layer(path: str, layer_id: str = "raster", z_order: int = 0) -> dict:
    layer = base_layer(layer_id, "raster", z_order)
    layer["raster"] = {
        "path": path,
        "crop": {"x": 0, "y": 0, "width": 64, "height": 64},
        "alpha": 1.0,
        "sourceMappings": [],
    }
    return layer


def rir(*layers: dict) -> dict:
    return {
        "schemaVersion": "design-lab/reconstruction-ir/v1",
        "canvas": {"width": 64, "height": 64, "colorSpace": "srgb"},
        "layers": list(layers),
    }


class ReconstructionSVGTests(unittest.TestCase):
    def setUp(self) -> None:
        self.scratch = (
            PROJECT_ROOT
            / ".hermes"
            / "task-runtime"
            / "reconstruction-svg-tests"
            / f"{os.getpid()}-{uuid.uuid4().hex}"
        )
        self.scratch.mkdir(parents=True)

    def tearDown(self) -> None:
        if self.scratch.exists():
            shutil.rmtree(self.scratch)

    def test_primitive_serializes_with_exact_viewbox_and_canonical_bytes(self) -> None:
        value = rir(rectangle_layer())
        first = serialize_svg(value, PROJECT_ROOT)
        second = serialize_svg(copy.deepcopy(value), PROJECT_ROOT)
        self.assertEqual(first, second)
        self.assertIn(b'viewBox="0 0 64 64"', first)
        self.assertIn(b"<rect", first)
        self.assertEqual(first, sanitize_svg(first))

    def test_every_supported_node_type_serializes_in_stable_z_order(self) -> None:
        group = base_layer("group", "group", 1)
        group["children"] = [rectangle_layer("child", 0)]
        outlined = text_layer("outlined", 2)
        outlined["text"] = {
            "content": "ignored",
            "disposition": "outlined",
            "fontCandidates": [],
            "outlineFallback": {"available": True, "pathData": "M1 1L10 1L10 10Z"},
        }
        value = rir(
            raster_layer("design-lab/tests/fixtures/reconstruction/flat-64.png", z_order=4),
            text_layer(z_order=3),
            outlined,
            path_layer(z_order=0),
            group,
        )
        svg = serialize_svg(value, PROJECT_ROOT)
        self.assertIn(b"<path", svg)
        self.assertIn(b"<g", svg)
        self.assertIn(b"<rect", svg)
        self.assertIn(b"<text", svg)
        self.assertIn(b"data:image/png;base64,", svg)
        self.assertLess(svg.index(b"<path"), svg.index(b"<g"))
        self.assertLess(svg.index(b"<text"), svg.index(b"<image"))

    def test_every_primitive_kind_serializes_including_reverse_line(self) -> None:
        ellipse = rectangle_layer("ellipse", 0)
        ellipse["primitive"] = {
            "kind": "ellipse",
            "parameters": {"x1": 2, "y1": 4, "x2": 30, "y2": 40},
        }
        line = rectangle_layer("line", 1)
        line["primitive"] = {
            "kind": "line",
            "parameters": {"x1": 60, "y1": 50, "x2": 3, "y2": 2},
        }
        polygon = rectangle_layer("polygon", 2)
        polygon["primitive"] = {
            "kind": "polygon",
            "parameters": {
                "points": [{"x": 1, "y": 1}, {"x": 63, "y": 1}, {"x": 32, "y": 63}]
            },
        }
        svg = serialize_svg(rir(ellipse, line, polygon), PROJECT_ROOT)
        self.assertIn(b"<ellipse", svg)
        self.assertIn(b"<line", svg)
        self.assertIn(b"<polygon", svg)

    def test_mapping_insertion_order_does_not_change_serialization(self) -> None:
        first = rir(rectangle_layer())
        source = first["layers"][0]
        reordered = {
            "layers": [
                {
                    "masks": [],
                    "style": dict(reversed(list(source["style"].items()))),
                    "primitive": {
                        "parameters": dict(
                            reversed(list(source["primitive"]["parameters"].items()))
                        ),
                        "kind": "rect",
                    },
                    **{
                        key: source[key]
                        for key in reversed(list(base_layer("rectangle", "primitive").keys()))
                    },
                }
            ],
            "canvas": {"colorSpace": "srgb", "height": 64, "width": 64},
            "schemaVersion": "design-lab/reconstruction-ir/v1",
        }
        self.assertEqual(
            serialize_svg(first, PROJECT_ROOT),
            serialize_svg(reordered, PROJECT_ROOT),
        )

    def test_script_events_unknowns_and_external_resources_are_rejected(self) -> None:
        root = b'<svg width="64" height="64" viewBox="0 0 64 64"'
        payloads = (
            (root + b"><script/></svg>", "forbidden element"),
            (root + b' onload="x()"/>', "event attribute"),
            (root + b' xmlns:x="urn:evil" x:onload="x()"/>', "namespace"),
            (root + b"><foreignObject/></svg>", "forbidden element"),
            (root + b'><animate attributeName="x"/></svg>', "forbidden element"),
            (root + b'><filter id="f"/></svg>', "forbidden element"),
            (root + b' unexpected="1"/>', "attribute"),
            (root + b' xmlns:e="urn:evil"/>', "unknown namespace declaration"),
            (root + b' xmlns:e="urn:evil"><e:path/></svg>', "namespace"),
            (root + b'><image x="0" y="0" width="1" height="1" href="https://example.test/x.png"/></svg>', "embedded PNG"),
            (root + b'><image x="0" y="0" width="1" height="1" href="file:///C:/x.png"/></svg>', "embedded PNG"),
            (root + b'><image x="0" y="0" width="1" height="1" href="\\\\server\\share\\x.png"/></svg>', "embedded PNG"),
            (root + b'><path d="M0 0" style="fill:url(https://example.test/x)"/></svg>', "URL or script"),
            (root + b'><path d="M0 0" fill="url(https://example.test/x)"/></svg>', "URL"),
            (root + b' xmlns:xlink="http://www.w3.org/1999/xlink"><image x="0" y="0" width="1" height="1" xlink:href="x"/></svg>', "xlink"),
            (root + b"><!-- hidden --></svg>", "comments"),
        )
        for payload, reason in payloads:
            with self.subTest(payload=payload), self.assertRaisesRegex(UnsafeSVGError, reason):
                sanitize_svg(payload)

    def test_dtd_entities_and_malformed_xml_fail_before_any_file_read(self) -> None:
        payloads = (
            b'<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///C:/secret">]><svg>&xxe;</svg>',
            b'<!DOCTYPE svg [<!ENTITY lol "lol">]><svg>&lol;</svg>',
            b"<svg><path></svg>",
        )
        for payload in payloads:
            with self.subTest(payload=payload), mock.patch(
                "pathlib.Path.open", side_effect=AssertionError("asset read attempted")
            ) as opened:
                with self.assertRaises(UnsafeSVGError):
                    sanitize_svg(payload)
                opened.assert_not_called()

    def test_data_uri_must_be_strict_base64_and_decoded_png(self) -> None:
        root = b'<svg width="64" height="64" viewBox="0 0 64 64">'
        image = b'<image x="0" y="0" width="1" height="1" href="'
        payloads = (
            (root + image + b'data:image/jpeg;base64,AA=="/></svg>', "embedded PNG"),
            (root + image + b'data:image/png;base64,not base64"/></svg>', "base64"),
            (root + image + b'data:image/png;base64,dGV4dA=="/></svg>', "not a PNG"),
            (root + image + b'../x.png"/></svg>', "embedded PNG"),
        )
        for payload, reason in payloads:
            with self.subTest(payload=payload), self.assertRaisesRegex(UnsafeSVGError, reason):
                sanitize_svg(payload)

    def test_non_finite_out_of_canvas_and_path_complexity_fail_closed(self) -> None:
        payloads = (
            b'<svg width="64" height="64" viewBox="0 0 64 64"><rect x="NaN" y="0" width="1" height="1"/></svg>',
            b'<svg width="64" height="64" viewBox="0 0 64 64"><path d="M0 0L65 1"/></svg>',
            b'<svg width="64" height="64" viewBox="0 0 64 64"><polygon points="0,0 1,Infinity 2,2"/></svg>',
        )
        for payload in payloads:
            with self.subTest(payload=payload), self.assertRaises(UnsafeSVGError):
                sanitize_svg(payload)

        too_complex = path_layer()
        too_complex["geometry"]["pathData"] = "M0 0 " + "L1 1 " * 100_001
        with self.assertRaises(UnsafeSVGError):
            serialize_svg(rir(too_complex), PROJECT_ROOT)

    def test_malformed_path_and_canvas_geometry_fail_for_their_exact_reason(self) -> None:
        root = '<svg width="64" height="64" viewBox="0 0 64 64">{}</svg>'
        cases = (
            (root.format('<path d="L1 1"/>').encode(), "start with moveto"),
            (root.format('<path d="M0 0 C 1 2 3"/>').encode(), "incomplete"),
            (root.format('<path d="M0 0 B 1 1"/>').encode(), "unsupported syntax"),
            (root.format('<rect x="60" y="0" width="5" height="1"/>').encode(), "exceeds"),
            (root.format('<line x1="0" y1="0" x2="65" y2="1"/>').encode(), "exceeds"),
        )
        for payload, reason in cases:
            with self.subTest(payload=payload), self.assertRaisesRegex(UnsafeSVGError, reason):
                sanitize_svg(payload)

    def test_unsupported_hybrid_text_and_non_exact_crop_are_not_silently_flattened(self) -> None:
        hybrid = text_layer()
        hybrid["text"]["disposition"] = "hybrid"
        hybrid["text"]["outlineFallback"] = {
            "available": True,
            "pathData": "M1 1L10 1L10 10Z",
        }
        with self.assertRaisesRegex(UnsafeSVGError, "hybrid"):
            serialize_svg(rir(hybrid), PROJECT_ROOT)

        raster = raster_layer("design-lab/tests/fixtures/reconstruction/flat-64.png")
        raster["raster"]["crop"]["width"] = 63
        with self.assertRaisesRegex(UnsafeSVGError, "crop"):
            serialize_svg(rir(raster), PROJECT_ROOT)

    def test_svg_and_rir_nesting_depth_have_explicit_ceilings(self) -> None:
        nested_svg = (
            b'<svg width="64" height="64" viewBox="0 0 64 64">'
            + b"<g>" * 130
            + b"</g>" * 130
            + b"</svg>"
        )
        with self.assertRaisesRegex(UnsafeSVGError, "nesting depth"):
            sanitize_svg(nested_svg)

        child = rectangle_layer("leaf")
        for index in range(130):
            group = base_layer(f"group-{index}", "group")
            group["children"] = [child]
            child = group
        with self.assertRaisesRegex(UnsafeSVGError, "nesting depth"):
            serialize_svg(rir(child), PROJECT_ROOT)

    def test_invalid_model_output_is_rejected_before_asset_read(self) -> None:
        invalid = raster_layer("../outside.png")
        with mock.patch("pathlib.Path.open") as opened:
            with self.assertRaises(ValueError):
                serialize_svg(rir(invalid), PROJECT_ROOT)
            opened.assert_not_called()

        unsupported_mask = path_layer()
        unsupported_mask["masks"] = [
            {
                "id": "mask-1",
                "pathData": "M0 0H64V64H0Z",
                "operation": "exclude",
                "opacity": 1.0,
            }
        ]
        with self.assertRaisesRegex(UnsafeSVGError, "mask"):
            serialize_svg(rir(unsupported_mask), PROJECT_ROOT)

    def test_asset_root_escape_non_png_and_reparse_asset_fail_closed(self) -> None:
        text_asset = self.scratch / "not-png.png"
        text_asset.write_bytes(b"not a png")
        relative_text = text_asset.relative_to(PROJECT_ROOT).as_posix()
        with self.assertRaisesRegex(UnsafeSVGError, "PNG"):
            serialize_svg(rir(raster_layer(relative_text)), PROJECT_ROOT)

        outside = self.scratch / "outside"
        outside.mkdir()
        (outside / "asset.png").write_bytes(FIXTURE.read_bytes())
        asset_root = self.scratch / "asset-root"
        asset_root.mkdir()
        link = asset_root / "linked"
        if os.name == "nt":
            completed = subprocess.run(
                ["cmd.exe", "/d", "/c", "mklink", "/J", str(link), str(outside)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            if completed.returncode != 0:
                self.skipTest(f"junction unavailable: {completed.stdout}{completed.stderr}")
        else:
            link.symlink_to(outside, target_is_directory=True)
        try:
            project_relative = (link / "asset.png").relative_to(PROJECT_ROOT).as_posix()
            with self.assertRaisesRegex(UnsafeSVGError, "reparse|symlink"):
                serialize_svg(rir(raster_layer(project_relative)), PROJECT_ROOT)
        finally:
            if os.name == "nt" and link.exists():
                os.rmdir(link)
            elif link.is_symlink():
                link.unlink()

    def test_canonical_sanitization_sorts_attributes(self) -> None:
        first = sanitize_svg(
            b'<svg viewBox="0 0 64 64" height="64" width="64"><rect y="2" x="1" height="4" width="3" fill="#fff"/></svg>'
        )
        second = sanitize_svg(
            b'<svg width="64" height="64" viewBox="0 0 64 64"><rect fill="#fff" width="3" height="4" x="1" y="2"/></svg>'
        )
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main(verbosity=2)
