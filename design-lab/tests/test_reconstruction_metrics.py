# SPDX-License-Identifier: MIT
"""Deterministic renderer and fidelity-gate regression tests."""
from __future__ import annotations

import dataclasses
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "design-lab"))

from reconstruction.metrics import (  # noqa: E402
    FidelityError,
    compare_images,
    pixelmatch_masks,
)
from reconstruction.render import (  # noqa: E402
    RenderError,
    load_render_profile,
    render_svg,
)
from reconstruction.svg import serialize_svg  # noqa: E402

REGISTRY = REPO_ROOT / "design-lab" / "config" / "reconstruction-tools.json"
REAL_RESVG = Path(
    r"D:\All projects\Design External Configuration\toolchains\resvg\v0.47.0\resvg.exe"
)
EXPECTED_RESVG_SHA256 = (
    "433a7c744cff561ed64fcf73c7c04e239d7a07ae5f0aadbf1ba8471d63707402"
)
FLAT_FIXTURE = REPO_ROOT / "design-lab" / "tests" / "fixtures" / "reconstruction" / "flat-64.png"


def _rgba(width: int, height: int, value=(0, 0, 0, 255)) -> np.ndarray:
    pixels = np.empty((height, width, 4), dtype=np.uint8)
    pixels[:, :] = value
    return pixels


def _save_rgba(path: Path, pixels: np.ndarray) -> None:
    Image.fromarray(pixels, mode="RGBA").save(path, format="PNG", optimize=False)


def _official_yiq_delta(gray_delta: int) -> float:
    """Literal v7.2.0 opaque-gray formula, independent of production code."""

    dr = dg = db = float(gray_delta)
    y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223
    i = dr * 0.59597799 - dg * 0.27417610 - db * 0.32180189
    q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694
    return 0.5053 * y * y + 0.299 * i * i + 0.1957 * q * q


class ReconstructionMetricTests(unittest.TestCase):
    def setUp(self) -> None:
        safe_name = "".join(c if c.isalnum() else "-" for c in self._testMethodName)
        self.run_root = (
            REPO_ROOT
            / ".hermes"
            / "task-runtime"
            / "reconstruction"
            / f"c4-{os.getpid()}-{safe_name}"
        )
        if self.run_root.exists():
            shutil.rmtree(self.run_root)
        self.run_root.mkdir(parents=True)
        self.addCleanup(shutil.rmtree, self.run_root, True)
        self.profile = load_render_profile(128, 128, REAL_RESVG)

    def compare(
        self,
        reference: np.ndarray,
        actual: np.ndarray,
        *,
        profile=None,
        diff_name: str = "diff.png",
    ):
        reference_path = self.run_root / "reference.png"
        actual_path = self.run_root / "actual.png"
        _save_rgba(reference_path, reference)
        _save_rgba(actual_path, actual)
        active_profile = profile or dataclasses.replace(
            self.profile,
            width=reference.shape[1],
            height=reference.shape[0],
        )
        return compare_images(
            reference_path,
            actual_path,
            profile=active_profile,
            diff_output_path=self.run_root / diff_name,
        )

    def test_registry_and_profile_pin_every_fixed_gate_owner(self) -> None:
        registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.assertEqual(registry["schemaVersion"], "design-lab/reconstruction-tools/v1")

        resvg = registry["renderers"]["resvgWindows"]
        self.assertEqual(resvg["repository"], "linebender/resvg")
        self.assertEqual(resvg["version"], "0.47.0")
        self.assertEqual(resvg["asset"], "resvg-win64.zip")
        self.assertEqual(
            resvg["url"],
            "https://github.com/linebender/resvg/releases/download/v0.47.0/resvg-win64.zip",
        )
        self.assertEqual(
            resvg["archiveSha256"],
            "5684e59ceaa53ce720b49efb441b0918ae99d04e8ce3f6f753664524592d67f1",
        )
        self.assertEqual(resvg["executableSha256"], EXPECTED_RESVG_SHA256)
        self.assertEqual(resvg["license"], "Apache-2.0 OR MIT")
        self.assertEqual(
            resvg["storageClass"], "Design External Configuration/toolchain"
        )
        self.assertEqual(registry["upstreamStable"]["version"], "0.48.1")
        self.assertEqual(
            registry["upstreamStable"]["windowsX86_64OfficialBinary"],
            "WINDOWS_X86_64_OFFICIAL_BINARY_UNAVAILABLE",
        )

        pixelmatch = registry["metrics"]["pixelmatch"]
        self.assertEqual(pixelmatch["package"], "mapbox/pixelmatch")
        self.assertEqual(pixelmatch["version"], "7.2.0")
        self.assertEqual(pixelmatch["algorithm"], "YIQ-v7.2.0")
        self.assertEqual(pixelmatch["license"], "ISC")
        self.assertEqual(
            pixelmatch["source"],
            "https://raw.githubusercontent.com/mapbox/pixelmatch/v7.2.0/index.js",
        )
        self.assertNotIn("OKLab", json.dumps(pixelmatch))
        self.assertNotIn("HyAB", json.dumps(pixelmatch))

        profile = load_render_profile(64, 96, REAL_RESVG)
        self.assertEqual(profile.profile_id, "design-lab/render-profile/v1")
        self.assertEqual((profile.width, profile.height), (64, 96))
        self.assertEqual(profile.color_space, "sRGB IEC61966-2.1")
        self.assertEqual(profile.rgba_background, (255, 255, 255, 255))
        self.assertEqual(profile.renderer_id, "linebender/resvg")
        self.assertEqual(profile.renderer_version, "0.47.0")
        self.assertEqual(profile.renderer_sha256, EXPECTED_RESVG_SHA256)
        self.assertEqual(profile.pixelmatch_version, "7.2.0")
        self.assertEqual(profile.pixel_threshold, 0.1)
        self.assertTrue(profile.anti_alias_detection)
        self.assertEqual(profile.match_minimum, 0.995)
        self.assertEqual(profile.ssim_minimum, 0.995)
        self.assertEqual(profile.mae_limit_version, "uncalibrated-v1")
        self.assertIsNone(profile.mae_limit)
        self.assertEqual(profile.edge_metric, "sobel-rgb-l1/v1")
        self.assertEqual(profile.dense_connectivity, 8)
        self.assertEqual(profile.dense_bbox_exclusive_limit, 32)
        self.assertEqual(profile.dense_density_minimum, 0.25)

    def test_identical_images_pass_and_promote_only_to_deterministic_status(self) -> None:
        pixels = _rgba(64, 64, (17, 34, 51, 127))
        metrics = self.compare(pixels, pixels)
        self.assertEqual(metrics.match_ratio, 1.0)
        self.assertEqual(metrics.ssim, 1.0)
        self.assertEqual(metrics.mean_rgba_error, 0.0)
        self.assertEqual(metrics.alpha_mean_error, 0.0)
        self.assertEqual(metrics.edge_error, 0.0)
        self.assertEqual(metrics.mismatch_count, 0)
        self.assertEqual(metrics.mismatch_mask, bytes(64 * 64))
        self.assertTrue(metrics.passed)
        self.assertEqual(metrics.lifecycle_status, "PIXEL_VERIFIED_DETERMINISTIC")
        self.assertNotIn("ILLUSTRATOR", metrics.lifecycle_status)
        self.assertEqual(metrics.failure_reasons, ())

    def test_two_argument_compare_interface_uses_fixed_repository_profile(self) -> None:
        metrics = compare_images(FLAT_FIXTURE, FLAT_FIXTURE)
        self.assertTrue(metrics.passed)
        self.assertEqual(metrics.profile_id, "design-lab/render-profile/v1")
        self.assertEqual(metrics.match_ratio, 1.0)
        self.assertIsNone(metrics.diff_path)

    def test_pixelmatch_v7_2_literal_yiq_threshold_boundary(self) -> None:
        official_limit = 35215 * 0.1 * 0.1
        self.assertLessEqual(_official_yiq_delta(26), official_limit)
        self.assertGreater(_official_yiq_delta(27), official_limit)

        reference = _rgba(64, 64)
        below = reference.copy()
        below[32, 32, :3] = 26
        above = reference.copy()
        above[32, 32, :3] = 27

        below_metrics = self.compare(reference, below, diff_name="below.png")
        above_metrics = self.compare(reference, above, diff_name="above.png")
        self.assertEqual(below_metrics.mismatch_count, 0)
        self.assertEqual(above_metrics.mismatch_count, 1)
        mask = np.frombuffer(above_metrics.mismatch_mask, dtype=np.uint8).reshape(64, 64)
        self.assertEqual(int(mask[32, 32]), 1)
        self.assertEqual(int(mask.sum()), 1)

    def test_pixelmatch_v7_2_literal_antialias_vector_is_excluded(self) -> None:
        # The center is between a three-pixel dark plateau and a three-pixel light
        # plateau. The official v7.2.0 intensity-slope detector classifies it AA.
        reference = _rgba(5, 5, (255, 255, 255, 255))
        reference[0:3, 0:2, :3] = 0
        reference[2, 2, :3] = 128
        actual = reference.copy()
        actual[2, 2, :3] = 255

        metrics = self.compare(reference, actual)
        mismatch = np.frombuffer(metrics.mismatch_mask, dtype=np.uint8).reshape(5, 5)
        excluded = np.frombuffer(metrics.excluded_aa_mask, dtype=np.uint8).reshape(5, 5)
        self.assertEqual(metrics.mismatch_count, 0)
        self.assertEqual(metrics.excluded_aa_count, 1)
        self.assertEqual(int(mismatch[2, 2]), 0)
        self.assertEqual(int(excluded[2, 2]), 1)

        included_mask, included_excluded = pixelmatch_masks(
            reference, actual, threshold=0.1, include_aa=True
        )
        self.assertEqual(int(included_mask.sum()), 1)
        self.assertEqual(int(included_excluded.sum()), 0)

    def test_ssim_uses_background_composite_but_mae_retains_original_rgba(self) -> None:
        reference = _rgba(64, 64, (255, 0, 0, 0))
        actual = _rgba(64, 64, (0, 0, 255, 0))
        metrics = self.compare(reference, actual)
        self.assertEqual(metrics.match_ratio, 1.0)
        self.assertEqual(metrics.ssim, 1.0)
        self.assertEqual(metrics.mean_rgba_error, 0.5)
        self.assertEqual(metrics.alpha_mean_error, 0.0)
        self.assertTrue(metrics.passed)

    def test_recorded_nonwhite_background_is_owned_and_used_by_profile(self) -> None:
        profile = load_render_profile(
            64,
            64,
            REAL_RESVG,
            rgba_background=(12, 34, 56, 255),
        )
        reference = _rgba(64, 64, (255, 0, 0, 0))
        actual = _rgba(64, 64, (0, 0, 255, 0))
        metrics = self.compare(reference, actual, profile=profile)
        self.assertEqual(profile.rgba_background, (12, 34, 56, 255))
        self.assertEqual(metrics.match_ratio, 1.0)
        self.assertEqual(metrics.ssim, 1.0)
        self.assertEqual(metrics.pixelmatch_version, "7.2.0")
        self.assertEqual(metrics.pixel_threshold, 0.1)
        self.assertTrue(metrics.anti_alias_detection)
        self.assertEqual(metrics.match_minimum, 0.995)
        self.assertEqual(metrics.ssim_minimum, 0.995)
        self.assertEqual(metrics.mae_limit_version, "uncalibrated-v1")
        self.assertIsNone(metrics.mae_limit)
        self.assertEqual(metrics.edge_metric, "sobel-rgb-l1/v1")

    def test_mae_is_informative_when_null_and_required_when_calibrated(self) -> None:
        reference = _rgba(64, 64, (255, 0, 0, 0))
        actual = _rgba(64, 64, (0, 0, 255, 0))
        informative = self.compare(reference, actual)
        self.assertNotIn("MAE_LIMIT_EXCEEDED", informative.failure_reasons)

        calibrated = dataclasses.replace(
            self.profile,
            width=64,
            height=64,
            mae_limit_version="golden-corpus-v1",
            mae_limit=0.49,
        )
        required = self.compare(reference, actual, profile=calibrated, diff_name="mae.png")
        self.assertFalse(required.passed)
        self.assertIn("MAE_LIMIT_EXCEEDED", required.failure_reasons)

    def test_dense_component_rule_has_literal_32_33_and_sparse_boundaries(self) -> None:
        reference = _rgba(128, 128)

        square32 = reference.copy()
        square32[10:42, 10:42, :3] = 255
        metrics32 = self.compare(reference, square32, diff_name="dense32.png")
        self.assertEqual(metrics32.components[0].bounds, (10, 10, 32, 32))
        self.assertEqual(metrics32.components[0].density, 1.0)
        self.assertEqual(metrics32.max_diff_window, 1024)
        self.assertEqual(metrics32.dense_regions, ())
        self.assertNotIn("DENSE_DIFF_REGION", metrics32.failure_reasons)

        square33 = reference.copy()
        square33[10:43, 10:43, :3] = 255
        metrics33 = self.compare(reference, square33, diff_name="dense33.png")
        self.assertEqual(metrics33.components[0].bounds, (10, 10, 33, 33))
        self.assertEqual(metrics33.components[0].density, 1.0)
        self.assertEqual(metrics33.max_diff_window, 1024)
        self.assertEqual(metrics33.dense_regions, metrics33.components)
        self.assertIn("DENSE_DIFF_REGION", metrics33.failure_reasons)
        self.assertFalse(metrics33.passed)

        sparse = reference.copy()
        sparse[10, 10, :3] = 255
        sparse[43, 43, :3] = 255
        sparse[76, 76, :3] = 255
        metrics_sparse = self.compare(reference, sparse, diff_name="sparse.png")
        self.assertEqual(len(metrics_sparse.components), 3)
        self.assertTrue(all(component.bounds == (c, c, 1, 1) for component, c in zip(metrics_sparse.components, (10, 43, 76))))
        self.assertEqual(metrics_sparse.dense_regions, ())
        self.assertNotIn("DENSE_DIFF_REGION", metrics_sparse.failure_reasons)

    def test_diff_heatmap_bytes_hash_and_mask_evidence_are_deterministic(self) -> None:
        reference = _rgba(64, 64)
        actual = reference.copy()
        actual[12:16, 20:24, :3] = (255, 0, 0)
        first = self.compare(reference, actual, diff_name="diff-first.png")
        second = self.compare(reference, actual, diff_name="diff-second.png")
        self.assertEqual(first.diff_sha256, second.diff_sha256)
        self.assertEqual(first.diff_path.read_bytes(), second.diff_path.read_bytes())
        self.assertEqual(first.diff_sha256, hashlib.sha256(first.diff_path.read_bytes()).hexdigest())
        self.assertEqual(first.mismatch_mask_sha256, hashlib.sha256(first.mismatch_mask).hexdigest())
        self.assertEqual(len(first.mismatch_mask), 64 * 64)
        with Image.open(first.diff_path) as diff:
            self.assertEqual(diff.mode, "RGBA")
            self.assertEqual(diff.size, (64, 64))

    def test_dimensions_profile_and_nonfinite_metrics_fail_closed(self) -> None:
        reference = _rgba(64, 64)
        actual = _rgba(65, 64)
        with self.assertRaisesRegex(FidelityError, "dimensions"):
            self.compare(reference, actual)

        wrong_profile = dataclasses.replace(self.profile, width=63, height=64)
        with self.assertRaisesRegex(FidelityError, "profile dimensions"):
            self.compare(reference, reference, profile=wrong_profile)

        import reconstruction.metrics as metrics_module

        with mock.patch.object(metrics_module, "structural_similarity", return_value=math.nan):
            with self.assertRaisesRegex(FidelityError, "non-finite"):
                self.compare(reference, reference.copy(), diff_name="nan.png")

    def test_diff_output_rejects_outside_and_reparse_paths(self) -> None:
        reference = _rgba(64, 64)
        reference_path = self.run_root / "reference.png"
        actual_path = self.run_root / "actual.png"
        _save_rgba(reference_path, reference)
        _save_rgba(actual_path, reference)
        profile = dataclasses.replace(self.profile, width=64, height=64)
        with self.assertRaisesRegex(FidelityError, "canonical run root"):
            compare_images(
                reference_path,
                actual_path,
                profile=profile,
                diff_output_path=REPO_ROOT / ".hermes" / "outside-diff.png",
            )

        target = self.run_root / "plain-target"
        target.mkdir()
        link = self.run_root / "linked"
        if os.name == "nt":
            completed = subprocess.run(
                ["cmd.exe", "/d", "/c", "mklink", "/J", str(link), str(target)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            if completed.returncode != 0:
                self.skipTest("junction creation unavailable")
        else:
            link.symlink_to(target, target_is_directory=True)
        try:
            with self.assertRaisesRegex(FidelityError, "reparse|symlink"):
                compare_images(
                    reference_path,
                    actual_path,
                    profile=profile,
                    diff_output_path=link / "diff.png",
                )
        finally:
            if os.name == "nt" and link.exists():
                os.rmdir(link)
            elif link.is_symlink():
                link.unlink()

    def test_renderer_rejects_unpinned_binary_without_touching_output(self) -> None:
        svg = self.run_root / "source.svg"
        svg.write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="0" y="0" width="64" height="64" fill="#123456"/></svg>',
            encoding="utf-8",
        )
        output = self.run_root / "preview.png"
        output.write_bytes(b"sentinel")
        impostor = self.run_root / "resvg.exe"
        impostor.write_bytes(b"not the pinned binary")
        profile = load_render_profile(64, 64, impostor)
        with self.assertRaisesRegex(RenderError, "SHA-256"):
            render_svg(svg, output, profile)
        self.assertEqual(output.read_bytes(), b"sentinel")

    @unittest.skipUnless(REAL_RESVG.is_file(), "pinned external resvg is not installed")
    def test_real_resvg_64_roundtrip_uses_explicit_authorized_binary(self) -> None:
        self.assertEqual(hashlib.sha256(REAL_RESVG.read_bytes()).hexdigest(), EXPECTED_RESVG_SHA256)
        svg = self.run_root / "source.svg"
        layers = []
        for index, (x, y, fill) in enumerate(
            (
                (0, 0, "#142850ff"),
                (32, 0, "#e64632ff"),
                (0, 32, "#28be6ec0"),
                (32, 32, "#f5d23c40"),
            )
        ):
            layers.append(
                {
                    "id": f"quadrant-{index}",
                    "type": "primitive",
                    "name": f"quadrant-{index}",
                    "opacity": 1.0,
                    "bounds": {"x": x, "y": y, "width": 32, "height": 32},
                    "inferred": False,
                    "zOrder": index,
                    "visible": True,
                    "locked": False,
                    "blendMode": "normal",
                    "primitive": {
                        "kind": "rect",
                        "parameters": {"x1": x, "y1": y, "x2": x + 32, "y2": y + 32},
                    },
                    "style": {
                        "fill": fill,
                        "stroke": None,
                        "strokeWidth": 0,
                        "fillRule": "nonzero",
                        "lineCap": "butt",
                        "lineJoin": "miter",
                    },
                    "masks": [],
                }
            )
        rir = {
            "schemaVersion": "design-lab/reconstruction-ir/v1",
            "canvas": {"width": 64, "height": 64, "colorSpace": "srgb"},
            "layers": layers,
        }
        svg.write_bytes(serialize_svg(rir, REPO_ROOT))
        output = self.run_root / "preview.png"
        profile = load_render_profile(64, 64, REAL_RESVG)
        result = render_svg(svg, output, profile)
        self.assertEqual(result.output_path, output)
        self.assertEqual(result.output_sha256, hashlib.sha256(output.read_bytes()).hexdigest())
        self.assertEqual((result.width, result.height), (64, 64))
        self.assertEqual(result.renderer_version, "0.47.0")
        self.assertEqual(result.renderer_sha256, EXPECTED_RESVG_SHA256)
        self.assertEqual(result.lifecycle_status, "RENDERED")
        metrics = compare_images(
            FLAT_FIXTURE,
            output,
            profile=profile,
            diff_output_path=self.run_root / "diff.png",
        )
        self.assertTrue(metrics.passed, metrics.failure_reasons)
        self.assertEqual(metrics.match_ratio, 1.0)
        self.assertGreaterEqual(metrics.ssim, profile.ssim_minimum)


if __name__ == "__main__":
    unittest.main(verbosity=2)
