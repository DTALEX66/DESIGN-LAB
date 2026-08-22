# SPDX-License-Identifier: MIT
"""Pinned, explicit and bounded deterministic SVG rendering."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import stat
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, UnidentifiedImageError

from .svg_safety import UnsafeSVGError, sanitize_svg

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_REGISTRY_PATH = _PROJECT_ROOT / "design-lab" / "config" / "reconstruction-tools.json"
_CANONICAL_RUNTIME_ROOT = _PROJECT_ROOT / ".hermes" / "task-runtime" / "reconstruction"
_REPARSE_POINT = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
_RUN_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


class RenderError(RuntimeError):
    """A render request would weaken the pinned renderer contract."""


@dataclass(frozen=True)
class RenderProfile:
    """The sole versioned owner of every deterministic comparison parameter."""

    profile_id: str
    width: int
    height: int
    color_space: str
    rgba_background: tuple[int, int, int, int]
    renderer_id: str
    renderer_version: str
    renderer_sha256: str
    renderer_binary: Path | None
    pixelmatch_version: str
    pixelmatch_algorithm: str
    pixel_threshold: float
    anti_alias_detection: bool
    match_minimum: float
    ssim_minimum: float
    mae_limit_version: str
    mae_limit: float | None
    edge_metric: str
    edge_normalization: int
    dense_connectivity: int
    dense_bbox_exclusive_limit: int
    dense_density_minimum: float
    dense_window_size: int


@dataclass(frozen=True)
class RenderResult:
    """Read-back evidence for one successful deterministic render."""

    output_path: Path
    output_sha256: str
    width: int
    height: int
    profile_id: str
    renderer_id: str
    renderer_version: str
    renderer_sha256: str
    lifecycle_status: str = "RENDERED"


def _load_registry() -> dict[str, Any]:
    try:
        registry = json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise RenderError(f"cannot read reconstruction tool registry: {exc}") from None
    if registry.get("schemaVersion") != "design-lab/reconstruction-tools/v1":
        raise RenderError("unsupported reconstruction tool registry schema")
    return registry


def _require_number(value: Any, field: str, *, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise RenderError(f"{field} must be numeric")
    number = float(value)
    if not math.isfinite(number) or not minimum <= number <= maximum:
        raise RenderError(f"{field} is outside its finite allowed range")
    return number


def load_render_profile(
    width: int,
    height: int,
    renderer_binary: Path | None = None,
    *,
    rgba_background: tuple[int, int, int, int] | None = None,
) -> RenderProfile:
    """Load the one repository-owned profile for explicit canvas dimensions."""

    if isinstance(width, bool) or isinstance(height, bool) or not isinstance(width, int) or not isinstance(height, int):
        raise RenderError("render profile dimensions must be integers")
    if width <= 0 or height <= 0:
        raise RenderError("render profile dimensions must be positive")
    binary = (
        None
        if renderer_binary is None
        else Path(os.path.abspath(os.fspath(renderer_binary)))
    )
    registry = _load_registry()
    fixed = registry.get("renderProfile", {})
    renderer = registry.get("renderers", {}).get("resvgWindows", {})
    pixelmatch = registry.get("metrics", {}).get("pixelmatch", {})
    mae = fixed.get("maeLimit", {})
    edge = fixed.get("edgeMetric", {})
    dense = fixed.get("denseRegion", {})
    background = fixed.get("rgbaBackground") if rgba_background is None else list(rgba_background)
    if not (
        isinstance(background, list)
        and len(background) == 4
        and all(isinstance(channel, int) and not isinstance(channel, bool) and 0 <= channel <= 255 for channel in background)
    ):
        raise RenderError("render profile RGBA background is invalid")
    sha256 = renderer.get("executableSha256")
    if not isinstance(sha256, str) or not _SHA256.fullmatch(sha256):
        raise RenderError("renderer executable SHA-256 is invalid")
    profile = RenderProfile(
        profile_id=fixed.get("id"),
        width=width,
        height=height,
        color_space=fixed.get("colorSpace"),
        rgba_background=tuple(background),
        renderer_id=renderer.get("repository"),
        renderer_version=renderer.get("version"),
        renderer_sha256=sha256,
        renderer_binary=binary,
        pixelmatch_version=pixelmatch.get("version"),
        pixelmatch_algorithm=pixelmatch.get("algorithm"),
        pixel_threshold=_require_number(fixed.get("pixelThreshold"), "pixelThreshold", minimum=0, maximum=1),
        anti_alias_detection=fixed.get("antiAliasDetection"),
        match_minimum=_require_number(fixed.get("matchMinimum"), "matchMinimum", minimum=0, maximum=1),
        ssim_minimum=_require_number(fixed.get("ssimMinimum"), "ssimMinimum", minimum=0, maximum=1),
        mae_limit_version=mae.get("version"),
        mae_limit=None if mae.get("value") is None else _require_number(mae.get("value"), "maeLimit.value", minimum=0, maximum=1),
        edge_metric=edge.get("id"),
        edge_normalization=edge.get("normalization"),
        dense_connectivity=dense.get("connectivity"),
        dense_bbox_exclusive_limit=dense.get("bboxExclusiveLimit"),
        dense_density_minimum=_require_number(dense.get("densityMinimum"), "denseRegion.densityMinimum", minimum=0, maximum=1),
        dense_window_size=dense.get("windowSize"),
    )
    _validate_profile(profile)
    return profile


def _validate_profile(profile: RenderProfile) -> None:
    if not isinstance(profile, RenderProfile):
        raise RenderError("profile must be a RenderProfile")
    if profile.width <= 0 or profile.height <= 0:
        raise RenderError("render profile dimensions must be positive")
    expected = {
        "profile_id": "design-lab/render-profile/v1",
        "color_space": "sRGB IEC61966-2.1",
        "renderer_id": "linebender/resvg",
        "renderer_version": "0.47.0",
        "renderer_sha256": "433a7c744cff561ed64fcf73c7c04e239d7a07ae5f0aadbf1ba8471d63707402",
        "pixelmatch_version": "7.2.0",
        "pixelmatch_algorithm": "YIQ-v7.2.0",
        "pixel_threshold": 0.1,
        "anti_alias_detection": True,
        "match_minimum": 0.995,
        "ssim_minimum": 0.995,
        "edge_metric": "sobel-rgb-l1/v1",
        "edge_normalization": 255,
        "dense_connectivity": 8,
        "dense_bbox_exclusive_limit": 32,
        "dense_density_minimum": 0.25,
        "dense_window_size": 32,
    }
    for field, value in expected.items():
        if getattr(profile, field) != value:
            raise RenderError(f"render profile mismatch: {field}")
    if (
        not isinstance(profile.rgba_background, tuple)
        or len(profile.rgba_background) != 4
        or not all(
            isinstance(channel, int)
            and not isinstance(channel, bool)
            and 0 <= channel <= 255
            for channel in profile.rgba_background
        )
        or profile.rgba_background[3] != 255
    ):
        raise RenderError("render profile mismatch: rgba_background must be opaque RGBA")
    if not isinstance(profile.mae_limit_version, str) or not profile.mae_limit_version:
        raise RenderError("render profile mismatch: mae_limit_version")
    if profile.mae_limit is not None:
        _require_number(profile.mae_limit, "mae_limit", minimum=0, maximum=1)
        if profile.mae_limit_version == "uncalibrated-v1":
            raise RenderError("a calibrated MAE limit requires a calibrated version")


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    try:
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1 << 20), b""):
                digest.update(chunk)
    except OSError as exc:
        raise RenderError(f"cannot hash renderer binary: {exc}") from None
    return digest.hexdigest()


def _is_reparse(path: Path) -> bool:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise RenderError(f"cannot inspect path safely: {path}: {exc}") from None
    return path.is_symlink() or bool(getattr(metadata, "st_file_attributes", 0) & _REPARSE_POINT)


def _assert_plain_existing_components(path: Path) -> None:
    current = Path(path.anchor)
    parts = path.parts[1:] if path.anchor else path.parts
    for part in parts:
        current /= part
        if not current.exists() and not current.is_symlink():
            continue
        if _is_reparse(current):
            raise RenderError(f"path crosses a symlink/reparse boundary: {current}")


def _bounded_output(output_path: Path) -> tuple[Path, Path]:
    lexical = Path(os.path.abspath(os.fspath(output_path)))
    try:
        relative = lexical.relative_to(_CANONICAL_RUNTIME_ROOT)
    except ValueError:
        raise RenderError("output must be below the exact canonical run root") from None
    if len(relative.parts) < 2 or not _RUN_ID.fullmatch(relative.parts[0]):
        raise RenderError("output must be below one exact canonical run root")
    run_root = _CANONICAL_RUNTIME_ROOT / relative.parts[0]
    _assert_plain_existing_components(lexical.parent)
    try:
        lexical.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise RenderError(f"cannot create output parent: {exc}") from None
    _assert_plain_existing_components(lexical.parent)
    if run_root.resolve(strict=True) != run_root:
        raise RenderError("canonical run root resolves through a reparse boundary")
    return lexical, run_root


def _validate_explicit_renderer(profile: RenderProfile) -> None:
    binary = profile.renderer_binary
    if binary is None:
        raise RenderError("rendering requires an explicit authorized renderer binary")
    if not binary.is_absolute():
        raise RenderError("renderer binary must be an explicit absolute path")
    _assert_plain_existing_components(binary)
    if not binary.is_file():
        raise RenderError("explicit renderer binary is missing")
    observed = _sha256_file(binary)
    if observed != profile.renderer_sha256:
        raise RenderError(
            f"renderer binary SHA-256 mismatch: expected {profile.renderer_sha256}, observed {observed}"
        )


def _run_renderer(command: list[str], *, cwd: Path) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="strict",
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.SubprocessError, UnicodeError) as exc:
        raise RenderError(f"renderer invocation failed: {exc}") from None


def _renderer_version(profile: RenderProfile, run_root: Path) -> None:
    if profile.renderer_binary is None:
        raise RenderError("rendering requires an explicit authorized renderer binary")
    completed = _run_renderer([os.fspath(profile.renderer_binary), "--version"], cwd=run_root)
    if completed.returncode != 0:
        raise RenderError(f"renderer version check failed with exit {completed.returncode}")
    observed = completed.stdout.strip()
    if observed not in {profile.renderer_version, f"resvg {profile.renderer_version}"}:
        raise RenderError(
            f"renderer version mismatch: expected resvg {profile.renderer_version!s}, observed {observed!r}"
        )


def render_svg(svg_path: Path, output_path: Path, profile: RenderProfile) -> RenderResult:
    """Sanitize and render SVG with the exact authorized binary and no PATH lookup."""

    _validate_profile(profile)
    output, run_root = _bounded_output(output_path)
    source = Path(os.path.abspath(os.fspath(svg_path)))
    _assert_plain_existing_components(source)
    if not source.is_file():
        raise RenderError("SVG input is missing")
    try:
        sanitized = sanitize_svg(source.read_bytes())
    except (OSError, UnsafeSVGError) as exc:
        raise RenderError(f"SVG input failed deterministic safety validation: {exc}") from None

    _validate_explicit_renderer(profile)
    assert profile.renderer_binary is not None
    _renderer_version(profile, run_root)
    if _sha256_file(profile.renderer_binary) != profile.renderer_sha256:
        raise RenderError("renderer binary changed during version verification")

    svg_temp: Path | None = None
    png_temp: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=f".{output.name}.",
            suffix=".svg",
            dir=output.parent,
            delete=False,
        ) as stream:
            stream.write(sanitized)
            stream.flush()
            os.fsync(stream.fileno())
            svg_temp = Path(stream.name)
        handle, name = tempfile.mkstemp(
            prefix=f".{output.name}.", suffix=".png", dir=output.parent
        )
        os.close(handle)
        png_temp = Path(name)
        completed = _run_renderer(
            [os.fspath(profile.renderer_binary), os.fspath(svg_temp), os.fspath(png_temp)],
            cwd=run_root,
        )
        if completed.returncode != 0:
            message = (completed.stderr or completed.stdout).strip()
            raise RenderError(f"renderer failed with exit {completed.returncode}: {message}")
        if _sha256_file(profile.renderer_binary) != profile.renderer_sha256:
            raise RenderError("renderer binary changed during rendering")
        try:
            with Image.open(png_temp) as image:
                image.load()
                if image.format != "PNG":
                    raise RenderError("renderer output is not PNG")
                if image.size != (profile.width, profile.height):
                    raise RenderError(
                        "renderer output dimensions do not match the fixed profile; scaling/cropping is forbidden"
                    )
        except (OSError, UnidentifiedImageError) as exc:
            raise RenderError(f"renderer output cannot be read back as PNG: {exc}") from None
        _assert_plain_existing_components(output.parent)
        os.replace(png_temp, output)
        png_temp = None
        _assert_plain_existing_components(output)
        output_hash = _sha256_file(output)
    finally:
        for temporary in (svg_temp, png_temp):
            if temporary is not None:
                try:
                    temporary.unlink(missing_ok=True)
                except OSError:
                    pass

    return RenderResult(
        output_path=output,
        output_sha256=output_hash,
        width=profile.width,
        height=profile.height,
        profile_id=profile.profile_id,
        renderer_id=profile.renderer_id,
        renderer_version=profile.renderer_version,
        renderer_sha256=profile.renderer_sha256,
    )
