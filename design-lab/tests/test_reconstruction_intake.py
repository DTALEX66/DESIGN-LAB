# SPDX-License-Identifier: MIT
"""Deterministic reconstruction image-intake tests."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import unittest
import uuid
import zlib
from dataclasses import FrozenInstanceError
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageCms

DESIGN_LAB = Path(__file__).resolve().parents[1]
PROJECT_ROOT = DESIGN_LAB.parent
FIXTURE = DESIGN_LAB / "tests" / "fixtures" / "reconstruction" / "flat-64.png"
if str(DESIGN_LAB) not in sys.path:
    sys.path.insert(0, str(DESIGN_LAB))

from reconstruction.intake import (  # noqa: E402
    IntakeError,
    ReconstructionProfile,
    classify_reconstruction_profile,
    normalize_reference,
    partition_analysis_tiles,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _png_with_dimensions(width: int, height: int) -> bytes:
    """Build a tiny PNG container with a literal IHDR for invalid-dimension tests."""

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IEND", b"")


def _resolved_requirement_specs(path: Path, seen: set[Path] | None = None) -> set[str]:
    """Resolve pip -r includes so the test exercises the root install manifest."""

    resolved = path.resolve(strict=True)
    visited = set() if seen is None else seen
    if resolved in visited:
        return set()
    visited.add(resolved)
    specs: set[str] = set()
    for raw_line in resolved.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("-r ") or line.startswith("--requirement "):
            include = line.split(maxsplit=1)[1]
            specs.update(_resolved_requirement_specs(resolved.parent / include, visited))
        else:
            specs.add(line)
    return specs


def _make_directory_reparse(target: Path, link: Path) -> None:
    """Create a directory symlink, with an unprivileged Windows junction fallback."""

    try:
        os.symlink(target, link, target_is_directory=True)
        return
    except (OSError, NotImplementedError) as symlink_error:
        if os.name != "nt":
            raise symlink_error
    completed = subprocess.run(
        ["cmd.exe", "/d", "/c", "mklink", "/J", str(link), str(target)],
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise OSError(f"cannot create Windows junction (exit {completed.returncode})")


class ReconstructionIntakeTests(unittest.TestCase):
    def setUp(self) -> None:
        root = PROJECT_ROOT / ".hermes" / "task-runtime" / "reconstruction-tests"
        self.scratch = root / uuid.uuid4().hex
        self.scratch.mkdir(parents=True)

    def tearDown(self) -> None:
        shutil.rmtree(self.scratch, ignore_errors=True)

    def _save(self, name: str, mode: str, format_name: str, *, icc: bytes | None = None) -> Path:
        path = self.scratch / name
        color = (12, 34, 56, 78) if mode == "RGBA" else (12, 34, 56)
        image = Image.new(mode, (7, 5), color)
        kwargs = {"lossless": True} if format_name == "WEBP" else {}
        if icc is not None:
            kwargs["icc_profile"] = icc
        image.save(path, format=format_name, **kwargs)
        return path

    def test_tracked_fixture_matches_literal_first_party_recipe_and_sidecar(self) -> None:
        with Image.open(FIXTURE) as image:
            self.assertEqual((image.format, image.mode, image.size), ("PNG", "RGBA", (64, 64)))
            pixels = image.load()
            for y in range(64):
                for x in range(64):
                    # Hand-authored four-quadrant recipe used to generate this fixture.
                    expected = (
                        (20, 40, 80, 255)
                        if x < 32 and y < 32
                        else (230, 70, 50, 255)
                        if x >= 32 and y < 32
                        else (40, 190, 110, 192)
                        if x < 32
                        else (245, 210, 60, 64)
                    )
                    self.assertEqual(pixels[x, y], expected)

        sidecar = json.loads(Path(str(FIXTURE) + ".license").read_text(encoding="utf-8"))
        self.assertEqual(sidecar["schemaVersion"], "design-lab/asset-sidecar/v1")
        self.assertEqual(sidecar["file"], "design-lab/tests/fixtures/reconstruction/flat-64.png")
        self.assertEqual(sidecar["sha256"], "sha256:" + sha256(FIXTURE))
        self.assertEqual(sidecar["license"], "MIT")
        self.assertIn("DTALEX66", sidecar["author"])

    def test_png_jpeg_and_webp_rgb_rgba_inputs_are_normalized_without_source_mutation(self) -> None:
        sources = [
            (FIXTURE, "PNG", "RGBA"),
            (self._save("photo.jpg", "RGB", "JPEG"), "JPEG", "RGB"),
            (self._save("surface.webp", "RGB", "WEBP"), "WEBP", "RGB"),
        ]
        for index, (source, expected_format, expected_mode) in enumerate(sources):
            with self.subTest(expected_format):
                before = source.read_bytes()
                result = normalize_reference(source, self.scratch / f"run-{index}")
                self.assertEqual(source.read_bytes(), before)
                self.assertEqual(result.source_sha256, hashlib.sha256(before).hexdigest())
                self.assertEqual(result.source_identity.sha256, result.source_sha256)
                self.assertEqual(result.source_identity.resolved_path, source.resolve())
                self.assertEqual(result.source_identity.size_bytes, len(before))
                self.assertEqual(result.source_format, expected_format)
                self.assertEqual(result.original_mode, expected_mode)
                self.assertEqual(result.mode, "RGBA")
                self.assertEqual((result.width, result.height), (64, 64) if source == FIXTURE else (7, 5))
                self.assertEqual(result.color_profile.origin, "assumed-srgb")
                self.assertIsNone(result.color_profile.icc_sha256)
                self.assertTrue(result.normalized_path.is_relative_to(self.scratch / f"run-{index}"))
                self.assertEqual(result.normalized_sha256, sha256(result.normalized_path))
                with Image.open(result.normalized_path) as normalized:
                    self.assertEqual((normalized.format, normalized.mode, normalized.size), (
                        "PNG", "RGBA", (result.width, result.height)
                    ))

                with self.assertRaises(FrozenInstanceError):
                    result.source_identity.size_bytes = 0  # type: ignore[misc]

    def test_alpha_and_embedded_profile_are_preserved_and_recorded(self) -> None:
        profile = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))
        source = self._save("profiled.png", "RGBA", "PNG", icc=profile.tobytes())
        result = normalize_reference(source, self.scratch / "run")
        self.assertEqual(result.color_profile.origin, "embedded")
        self.assertEqual(
            result.color_profile.icc_sha256,
            hashlib.sha256(profile.tobytes()).hexdigest(),
        )
        self.assertIn("sRGB", result.color_profile.name)
        with Image.open(result.normalized_path) as normalized:
            self.assertEqual(normalized.getpixel((0, 0))[3], 78)
            self.assertIn("icc_profile", normalized.info)

    def test_invalid_embedded_profile_fails_before_output(self) -> None:
        source = self._save("bad-profile.png", "RGB", "PNG", icc=b"not-an-icc-profile")
        run_dir = self.scratch / "run"
        with self.assertRaises(IntakeError):
            normalize_reference(source, run_dir)
        self.assertFalse((run_dir / "reference.normalized.png").exists())

    def test_corrupt_zero_dimension_mode_and_format_inputs_fail_closed(self) -> None:
        invalid_sources: list[Path] = []
        corrupt = self.scratch / "corrupt.png"
        corrupt.write_bytes(b"not a PNG")
        invalid_sources.append(corrupt)
        zero = self.scratch / "zero.png"
        zero.write_bytes(_png_with_dimensions(0, 1))
        invalid_sources.append(zero)
        grayscale = self.scratch / "grayscale.png"
        Image.new("L", (2, 2), 128).save(grayscale, format="PNG")
        invalid_sources.append(grayscale)
        bitmap = self.scratch / "bitmap.bmp"
        Image.new("RGB", (2, 2), (1, 2, 3)).save(bitmap, format="BMP")
        invalid_sources.append(bitmap)

        for index, source in enumerate(invalid_sources):
            run_dir = self.scratch / f"invalid-run-{index}"
            with self.subTest(source.name), self.assertRaises(IntakeError):
                normalize_reference(source, run_dir)
            self.assertFalse((run_dir / "reference.normalized.png").exists())

    def test_normalization_is_byte_deterministic_across_runs(self) -> None:
        first = normalize_reference(FIXTURE, self.scratch / "run-a")
        second = normalize_reference(FIXTURE, self.scratch / "run-b")
        self.assertEqual(first.normalized_sha256, second.normalized_sha256)
        self.assertEqual(first.normalized_path.read_bytes(), second.normalized_path.read_bytes())

    def test_4097_axis_is_tiled_without_scaling_or_cropping(self) -> None:
        source = self.scratch / "wide.png"
        image = Image.new("RGB", (4097, 3), (3, 5, 7))
        image.putpixel((4096, 2), (251, 17, 99))
        image.save(source, format="PNG")
        result = normalize_reference(source, self.scratch / "run")
        self.assertEqual((result.width, result.height), (4097, 3))
        self.assertEqual(
            [(tile.x, tile.y, tile.width, tile.height) for tile in result.tiles],
            [(0, 0, 4096, 3), (4096, 0, 1, 3)],
        )
        with Image.open(result.normalized_path) as normalized:
            self.assertEqual(normalized.size, (4097, 3))
            self.assertEqual(normalized.getpixel((4096, 2))[:3], (251, 17, 99))

    def test_tiles_cover_every_pixel_exactly_once_in_global_coordinates(self) -> None:
        width, height = 9, 7
        tiles = partition_analysis_tiles(width, height, max_axis=4)
        coverage = np.zeros((height, width), dtype=np.uint8)
        for expected_index, tile in enumerate(tiles):
            self.assertEqual(tile.index, expected_index)
            self.assertGreater(tile.width, 0)
            self.assertGreater(tile.height, 0)
            self.assertGreaterEqual(tile.x, 0)
            self.assertGreaterEqual(tile.y, 0)
            self.assertLessEqual(tile.right, width)
            self.assertLessEqual(tile.bottom, height)
            coverage[tile.y : tile.bottom, tile.x : tile.right] += 1
        np.testing.assert_array_equal(coverage, np.ones((height, width), dtype=np.uint8))

    def test_classifier_has_independently_derived_synthetic_expectations(self) -> None:
        flat = np.full((64, 64, 4), (30, 60, 90, 255), dtype=np.uint8)
        ui = np.zeros((64, 64, 4), dtype=np.uint8)
        ui[:, :, 3] = 255
        checker = (np.indices((64, 64)).sum(axis=0) % 2) * 255
        ui[:, :, :3] = checker[:, :, None]
        mixed = np.zeros((64, 64, 4), dtype=np.uint8)
        mixed[:, :, 3] = 255
        mixed[:, :, :3] = np.arange(64, dtype=np.uint8)[None, :, None] * 4
        rng = np.random.default_rng(20260823)
        photographic = np.empty((64, 64, 4), dtype=np.uint8)
        photographic[:, :, :3] = rng.integers(0, 256, (64, 64, 3), dtype=np.uint8)
        photographic[:, :, 3] = 255

        cases = [
            (flat, ReconstructionProfile.FLAT),
            (ui, ReconstructionProfile.UI),
            (mixed, ReconstructionProfile.MIXED),
            (photographic, ReconstructionProfile.PHOTOGRAPHIC),
        ]
        for pixels, expected in cases:
            with self.subTest(expected.value):
                self.assertEqual(classify_reconstruction_profile(pixels), expected)

    def test_classifier_and_tiling_reject_invalid_inputs(self) -> None:
        for pixels in (
            np.zeros((0, 1, 4), dtype=np.uint8),
            np.zeros((2, 2, 2), dtype=np.uint8),
            np.zeros((2, 2, 4), dtype=np.float32),
        ):
            with self.subTest(pixels.shape), self.assertRaises(IntakeError):
                classify_reconstruction_profile(pixels)
        for width, height, max_axis in ((0, 1, 4), (1, 0, 4), (1, 1, 0), (1, 1, True)):
            with self.subTest((width, height, max_axis)), self.assertRaises(IntakeError):
                partition_analysis_tiles(width, height, max_axis)

    def test_parent_traversal_and_existing_reparse_destinations_are_rejected(self) -> None:
        traversing = self.scratch / "parent" / ".." / "run"
        with self.assertRaises(IntakeError):
            normalize_reference(FIXTURE, traversing)

        actual = self.scratch / "actual"
        actual.mkdir()
        link = self.scratch / "linked-run"
        try:
            _make_directory_reparse(actual, link)
        except OSError as exc:
            self.skipTest(f"directory reparse point unavailable: {exc}")
        try:
            with self.assertRaises(IntakeError):
                normalize_reference(FIXTURE, link)
            self.assertFalse((actual / "reference.normalized.png").exists())
        finally:
            link.rmdir()

    def test_existing_output_symlink_is_rejected_without_touching_target(self) -> None:
        run_dir = self.scratch / "run"
        run_dir.mkdir()
        outside = self.scratch / "outside"
        outside.mkdir()
        sentinel = outside / "sentinel.bin"
        sentinel.write_bytes(b"sentinel")
        destination = run_dir / "reference.normalized.png"
        try:
            _make_directory_reparse(outside, destination)
        except OSError as exc:
            self.skipTest(f"output reparse point unavailable: {exc}")
        try:
            with self.assertRaises(IntakeError):
                normalize_reference(FIXTURE, run_dir)
            self.assertEqual(sentinel.read_bytes(), b"sentinel")
        finally:
            destination.rmdir()

    def test_root_requirements_install_manifest_resolves_core_dependencies(self) -> None:
        specs = _resolved_requirement_specs(PROJECT_ROOT / "requirements.txt")
        self.assertTrue(
            {
                "Pillow>=11.3,<13",
                "numpy>=2.2,<3",
                "scikit-image>=0.25,<0.27",
                "defusedxml>=0.7,<1",
            }.issubset(specs),
            f"root requirements omit reconstruction dependencies: {sorted(specs)}",
        )


if __name__ == "__main__":
    unittest.main()
