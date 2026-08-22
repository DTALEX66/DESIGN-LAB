# SPDX-License-Identifier: MIT
"""Pinned, explicit and bounded deterministic SVG rendering."""
from __future__ import annotations

import hashlib
import io
import json
import math
import os
import re
import stat
import struct
import subprocess
import tempfile
import warnings
import zlib
from copy import deepcopy
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

from PIL import Image, ImageCms, UnidentifiedImageError

from .contracts import ContractError, validate_run_contract
from .svg_safety import MAX_CANVAS_PIXELS, UnsafeSVGError, sanitize_svg

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_REGISTRY_PATH = _PROJECT_ROOT / "design-lab" / "config" / "reconstruction-tools.json"
_CANONICAL_RUNTIME_ROOT = _PROJECT_ROOT / ".hermes" / "task-runtime" / "reconstruction"
_REPARSE_POINT = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
_RUN_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")
_TRUSTED_REGISTRY_SHA256 = "bbdbc6e25288032bf1b732ae6dd79b796b2f25ab972d929be9f72995ac70dc8e"
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_MAX_PNG_FILE_BYTES = 512 * 1024 * 1024
_MAX_PNG_CHUNK_BYTES = 64 * 1024 * 1024
_MAX_PNG_METADATA_BYTES = 8 * 1024 * 1024


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
    registry_sha256: str


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
    registry_digest: str
    lifecycle_status: str = "RENDERED"


@dataclass(frozen=True)
class _WriteConstraints:
    """Immutable result of revalidating one C1-authorized output target."""

    contract: dict[str, Any]
    target: Path
    run_root: Path
    run_id: str


@dataclass(frozen=True)
class _FileIdentity:
    device: int
    inode: int
    size: int
    modified_ns: int


@dataclass(frozen=True)
class _InputBinding:
    path: Path
    identity: _FileIdentity
    sha256: str


def _load_registry() -> tuple[dict[str, Any], str]:
    try:
        payload = _REGISTRY_PATH.read_bytes()
        registry = json.loads(payload.decode("utf-8", errors="strict"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise RenderError(f"cannot read reconstruction tool registry: {exc}") from None
    digest = hashlib.sha256(payload).hexdigest()
    if digest != _TRUSTED_REGISTRY_SHA256:
        raise RenderError(
            "reconstruction tool registry digest does not match the trusted build anchor"
        )
    if registry.get("schemaVersion") != "design-lab/reconstruction-tools/v1":
        raise RenderError("unsupported reconstruction tool registry schema")
    return registry, digest


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
    if renderer_binary is not None and not isinstance(renderer_binary, Path):
        raise RenderError("renderer_binary must be a pathlib.Path or None")
    binary = None if renderer_binary is None else Path(os.path.abspath(renderer_binary))
    registry, registry_sha256 = _load_registry()
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
        registry_sha256=registry_sha256,
    )
    _validate_profile(profile)
    return profile


def _validate_profile(profile: RenderProfile) -> None:
    if not isinstance(profile, RenderProfile):
        raise RenderError("profile must be a RenderProfile")
    if (
        isinstance(profile.width, bool)
        or isinstance(profile.height, bool)
        or not isinstance(profile.width, int)
        or not isinstance(profile.height, int)
    ):
        raise RenderError("render profile dimensions must be strict integers")
    if profile.width <= 0 or profile.height <= 0:
        raise RenderError("render profile dimensions must be positive")
    if profile.renderer_binary is not None and not isinstance(profile.renderer_binary, Path):
        raise RenderError("renderer_binary must be a pathlib.Path or None")
    if profile.width * profile.height > MAX_CANVAS_PIXELS:
        raise RenderError(
            f"render profile exceeds the {MAX_CANVAS_PIXELS} pixel ceiling"
        )
    registry, registry_sha256 = _load_registry()
    fixed = registry["renderProfile"]
    renderer = registry["renderers"]["resvgWindows"]
    pixelmatch = registry["metrics"]["pixelmatch"]
    mae = fixed["maeLimit"]
    edge = fixed["edgeMetric"]
    dense = fixed["denseRegion"]
    expected = {
        "profile_id": fixed["id"],
        "color_space": fixed["colorSpace"],
        "renderer_id": renderer["repository"],
        "renderer_version": renderer["version"],
        "renderer_sha256": renderer["executableSha256"],
        "pixelmatch_version": pixelmatch["version"],
        "pixelmatch_algorithm": pixelmatch["algorithm"],
        "pixel_threshold": fixed["pixelThreshold"],
        "anti_alias_detection": fixed["antiAliasDetection"],
        "match_minimum": fixed["matchMinimum"],
        "ssim_minimum": fixed["ssimMinimum"],
        "mae_limit_version": mae["version"],
        "mae_limit": mae["value"],
        "edge_metric": edge["id"],
        "edge_normalization": edge["normalization"],
        "dense_connectivity": dense["connectivity"],
        "dense_bbox_exclusive_limit": dense["bboxExclusiveLimit"],
        "dense_density_minimum": dense["densityMinimum"],
        "dense_window_size": dense["windowSize"],
        "registry_sha256": registry_sha256,
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


def _validated_write_constraints(
    run_contract: dict | None,
    target: Path,
    profile: RenderProfile,
    *,
    allowed_kinds: frozenset[str],
    operation: str,
    required_suffix: str = ".png",
) -> _WriteConstraints:
    if run_contract is None:
        raise RenderError("a validated run contract is required before any public write")
    try:
        snapshot = deepcopy(run_contract)
    except Exception as exc:
        raise RenderError(f"run contract cannot be snapshotted safely: {exc}") from None
    try:
        validate_run_contract(snapshot)
    except ContractError as exc:
        raise RenderError(f"run contract validation failed: {exc}") from None
    if snapshot["lifecycle"]["state"] not in {"authorized", "running"}:
        raise RenderError("run contract lifecycle does not permit C4 writes")
    if operation not in snapshot["requestedOperations"]:
        raise RenderError(f"run contract does not authorize the {operation!r} operation")
    if snapshot["registries"]["toolRegistry"] != "design-lab/config/reconstruction-tools.json":
        raise RenderError("run contract is not bound to the C4 tool registry")
    canvas = snapshot["canvasPolicy"]
    if (canvas["width"], canvas["height"], canvas["colorSpace"]) != (
        profile.width,
        profile.height,
        "srgb",
    ):
        raise RenderError("run contract canvas dimensions/profile do not match RenderProfile")

    lexical_target = Path(os.path.abspath(os.fspath(target)))
    try:
        target_relative = lexical_target.relative_to(_PROJECT_ROOT).as_posix()
    except ValueError:
        raise RenderError("write target is outside the project and cannot be authorized") from None
    matching = [
        artifact
        for artifact in snapshot["artifacts"]
        if artifact["path"] == target_relative
    ]
    if len(matching) != 1 or matching[0]["kind"] not in allowed_kinds:
        expected_kinds = ",".join(sorted(allowed_kinds))
        raise RenderError(
            "write target is not an exact authorized artifact declaration with kind "
            f"{expected_kinds}"
        )
    if lexical_target.suffix.lower() != required_suffix:
        raise RenderError(f"write target must use the exact {required_suffix} extension")
    runtime_relative = snapshot["roots"]["runtime"].rstrip("/")
    runtime_root = _PROJECT_ROOT.joinpath(*runtime_relative.split("/"))
    try:
        lexical_target.relative_to(runtime_root)
    except ValueError:
        raise RenderError("C4 writes must stay below the exact contract runtime root") from None
    if runtime_root != _CANONICAL_RUNTIME_ROOT / snapshot["runId"]:
        raise RenderError("run contract runtime root/runId binding is not canonical")
    return _WriteConstraints(
        contract=snapshot,
        target=lexical_target,
        run_root=runtime_root,
        run_id=snapshot["runId"],
    )


def _revalidate_write_constraints(
    constraints: _WriteConstraints,
    input_bindings: tuple[_InputBinding, ...] = (),
) -> None:
    _load_registry()
    try:
        validate_run_contract(constraints.contract)
    except ContractError as exc:
        raise RenderError(f"run contract expired or became invalid before commit: {exc}") from None
    if constraints.contract["lifecycle"]["state"] not in {"authorized", "running"}:
        raise RenderError("run contract lifecycle no longer permits C4 writes")
    for binding in input_bindings:
        _verify_input_binding(binding)


def _png_prefix_dimensions(prefix: bytes) -> tuple[int, int]:
    if len(prefix) != 33 or prefix[:8] != _PNG_SIGNATURE:
        raise RenderError("PNG signature/IHDR header is missing or truncated")
    length, kind = struct.unpack(">I4s", prefix[8:16])
    if length != 13 or kind != b"IHDR":
        raise RenderError("PNG must begin with one exact 13-byte IHDR chunk")
    payload = prefix[16:29]
    expected_crc = struct.unpack(">I", prefix[29:33])[0]
    if zlib.crc32(kind + payload) & 0xFFFFFFFF != expected_crc:
        raise RenderError("PNG IHDR CRC mismatch")
    width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(
        ">IIBBBBB", payload
    )
    if width <= 0 or height <= 0:
        raise RenderError("PNG header contains invalid dimensions")
    if width * height > MAX_CANVAS_PIXELS:
        raise RenderError(f"PNG exceeds the {MAX_CANVAS_PIXELS} pixel ceiling")
    if bit_depth != 8 or color_type not in {2, 6}:
        raise RenderError("PNG IHDR must encode 8-bit RGB or RGBA")
    if compression != 0 or filtering != 0 or interlace not in {0, 1}:
        raise RenderError("PNG IHDR contains unsupported compression/filter/interlace")
    return width, height


def _preflight_png_chunks(payload: bytes) -> None:
    offset = 8
    metadata_bytes = 0
    found_iend = False
    while offset < len(payload):
        if len(payload) - offset < 12:
            raise RenderError("PNG chunk stream is truncated")
        length = struct.unpack(">I", payload[offset : offset + 4])[0]
        kind = payload[offset + 4 : offset + 8]
        if length > _MAX_PNG_CHUNK_BYTES:
            raise RenderError("PNG chunk exceeds the bounded chunk policy")
        end = offset + 12 + length
        if end > len(payload):
            raise RenderError("PNG chunk payload is truncated")
        if kind not in {b"IDAT", b"IEND"}:
            metadata_bytes += length
            if metadata_bytes > _MAX_PNG_METADATA_BYTES:
                raise RenderError("PNG metadata exceeds the bounded metadata policy")
        if kind == b"IEND":
            if length != 0 or end != len(payload):
                raise RenderError("PNG IEND chunk is malformed or not final")
            found_iend = True
            break
        offset = end
    if not found_iend:
        raise RenderError("PNG is missing its final IEND chunk")


def _open_checked_png_header(path: Path) -> tuple[Image.Image, _InputBinding]:
    """Bounded raw PNG preflight before Pillow sees any metadata chunk."""

    if not isinstance(path, Path):
        raise RenderError("PNG path must be a pathlib.Path")
    source = Path(os.path.abspath(os.fspath(path)))
    _assert_plain_existing_components(source)
    try:
        with source.open("rb") as stream:
            before = _identity(os.fstat(stream.fileno()))
            if before.size > _MAX_PNG_FILE_BYTES:
                raise RenderError("PNG exceeds the bounded file-size policy")
            prefix = stream.read(33)
            dimensions = _png_prefix_dimensions(prefix)
            stream.seek(0)
            payload = stream.read()
            after = _identity(os.fstat(stream.fileno()))
        path_after = _identity(source.stat())
        if before != after or after != path_after:
            raise RenderError("PNG identity changed during bounded snapshot")
        _preflight_png_chunks(payload)
        binding = _InputBinding(
            path=source,
            identity=after,
            sha256=hashlib.sha256(payload).hexdigest(),
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(payload))
    except Image.DecompressionBombError:
        raise RenderError(f"PNG exceeds the {MAX_CANVAS_PIXELS} pixel ceiling") from None
    except RenderError:
        raise
    except (OSError, UnidentifiedImageError) as exc:
        raise RenderError(f"cannot read PNG header: {source}: {exc}") from None
    try:
        if image.format != "PNG":
            raise RenderError(f"comparison/render output must be PNG: {source}")
        if image.mode not in {"RGB", "RGBA"}:
            raise RenderError(f"PNG must be RGB or RGBA before decode: {source}")
        if image.size != dimensions:
            raise RenderError("Pillow PNG dimensions diverge from raw IHDR preflight")
        embedded = image.info.get("icc_profile")
        if embedded:
            try:
                name = ImageCms.getProfileName(ImageCms.ImageCmsProfile(io.BytesIO(embedded)))
            except (OSError, TypeError, ValueError, ImageCms.PyCMSError) as exc:
                raise RenderError(f"PNG has invalid color profile: {exc}") from None
            if "srgb" not in name.casefold():
                raise RenderError("PNG profile mismatch: expected sRGB")
        return image, binding
    except Exception:
        image.close()
        raise


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


def _identity(metadata: os.stat_result) -> _FileIdentity:
    return _FileIdentity(
        device=metadata.st_dev,
        inode=metadata.st_ino,
        size=metadata.st_size,
        modified_ns=metadata.st_mtime_ns,
    )


def _snapshot_regular_file(path: Path, *, role: str) -> tuple[_InputBinding, bytes]:
    if not isinstance(path, Path):
        raise RenderError(f"{role} path must be a pathlib.Path")
    lexical = Path(os.path.abspath(os.fspath(path)))
    _assert_plain_existing_components(lexical)
    if not lexical.is_file():
        raise RenderError(f"{role} input is missing or not a regular file")
    try:
        with lexical.open("rb") as stream:
            before = _identity(os.fstat(stream.fileno()))
            payload = stream.read()
            after = _identity(os.fstat(stream.fileno()))
        path_after = _identity(lexical.stat())
    except OSError as exc:
        raise RenderError(f"cannot snapshot {role} input safely: {exc}") from None
    if before != after or after != path_after:
        raise RenderError(f"{role} input identity changed during snapshot")
    return (
        _InputBinding(
            path=lexical,
            identity=after,
            sha256=hashlib.sha256(payload).hexdigest(),
        ),
        payload,
    )


def _verify_input_binding(binding: _InputBinding) -> None:
    _assert_plain_existing_components(binding.path)
    try:
        observed = _identity(binding.path.stat())
    except OSError as exc:
        raise RenderError(f"bound input disappeared before commit: {exc}") from None
    if observed != binding.identity or _sha256_file(binding.path) != binding.sha256:
        raise RenderError(f"bound input changed before commit: {binding.path}")


def _bind_contract_input(
    constraints: _WriteConstraints,
    path: Path,
    *,
    kind: str,
    suffix: str,
    role: str,
    normalized_reference: bool = False,
) -> tuple[_InputBinding, bytes]:
    lexical = Path(os.path.abspath(os.fspath(path)))
    try:
        relative = lexical.relative_to(_PROJECT_ROOT).as_posix()
    except ValueError:
        raise RenderError(f"{role} input is outside the project") from None
    matching = [
        artifact
        for artifact in constraints.contract["artifacts"]
        if artifact["path"] == relative
    ]
    if len(matching) != 1 or matching[0]["kind"] != kind:
        raise RenderError(f"{role} input must be one exact {kind} input artifact")
    if lexical.suffix.lower() != suffix:
        raise RenderError(f"{role} input must use the exact {suffix} extension")
    if normalized_reference and (
        constraints.contract["source"]["normalizedReferenceTarget"] != relative
    ):
        raise RenderError(
            "reference input must equal source.normalizedReferenceTarget exactly"
        )
    return _snapshot_regular_file(lexical, role=role)


def _validate_renderer_binary_location(profile: RenderProfile) -> Path:
    binary = profile.renderer_binary
    if binary is None:
        raise RenderError("rendering requires an explicit authorized renderer binary")
    if not isinstance(binary, Path):
        raise RenderError("renderer_binary must be a pathlib.Path")
    if not binary.is_absolute():
        raise RenderError("renderer binary must be an explicit absolute path")
    _assert_plain_existing_components(binary)
    if not binary.is_file():
        raise RenderError("explicit renderer binary is missing")
    return binary


def _snapshot_explicit_renderer(profile: RenderProfile) -> bytes:
    binary = _validate_renderer_binary_location(profile)
    try:
        with binary.open("rb") as stream:
            before = _identity(os.fstat(stream.fileno()))
            payload = stream.read()
            after = _identity(os.fstat(stream.fileno()))
        path_after = _identity(binary.stat())
    except OSError as exc:
        raise RenderError(f"cannot snapshot renderer binary safely: {exc}") from None
    if before != after or after != path_after:
        raise RenderError("renderer source identity changed during verified copy")
    observed = hashlib.sha256(payload).hexdigest()
    if observed != profile.renderer_sha256:
        raise RenderError(
            f"renderer binary SHA-256 mismatch: expected {profile.renderer_sha256}, observed {observed}"
        )
    return payload


def _stage_renderer(profile: RenderProfile, directory: Path) -> tuple[Path, _FileIdentity]:
    payload = _snapshot_explicit_renderer(profile)
    descriptor = -1
    staged: Path | None = None
    try:
        descriptor, name = tempfile.mkstemp(
            prefix=".verified-resvg.", suffix=".exe", dir=directory
        )
        staged = Path(name)
        with os.fdopen(descriptor, "wb") as stream:
            descriptor = -1
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        if os.name != "nt":
            staged.chmod(0o500)
        _assert_plain_existing_components(staged)
        observed = _sha256_file(staged)
        if observed != profile.renderer_sha256:
            raise RenderError("run-local renderer staging SHA-256 mismatch")
        return staged, _identity(staged.stat())
    except Exception as primary:
        cleanup_failures: list[OSError] = []
        if descriptor >= 0:
            try:
                os.close(descriptor)
            except OSError as cleanup:
                cleanup_failures.append(cleanup)
        if staged is not None and (staged.exists() or staged.is_symlink()):
            try:
                staged.unlink()
            except OSError as cleanup:
                cleanup_failures.append(cleanup)
        if cleanup_failures:
            residue = staged if staged is not None else directory
            raise RenderError(
                f"renderer staging failed ({primary}); additionally, cleanup left "
                f"explicit residue/descriptor at {residue}: {cleanup_failures}"
            ) from ExceptionGroup(
                "renderer staging primary failure and cleanup failure",
                [primary, *cleanup_failures],
            )
        raise


def _assert_staged_identity(
    path: Path,
    expected: _FileIdentity,
    expected_sha256: str,
) -> None:
    _assert_plain_existing_components(path)
    try:
        observed = _identity(path.stat())
    except OSError as exc:
        raise RenderError(f"cannot revalidate staged renderer identity: {exc}") from None
    if observed != expected:
        raise RenderError("run-local staged renderer identity changed")
    if _sha256_file(path) != expected_sha256:
        raise RenderError("run-local staged renderer hash changed")


def _verify_committed_target(
    path: Path,
    *,
    expected_sha256: str,
    expected_identity: _FileIdentity,
    role: str,
) -> str:
    primary: RenderError | None = None
    try:
        _assert_plain_existing_components(path)
        if not path.is_file():
            raise RenderError(f"{role} commit readback is missing or not a regular file")
        observed_identity = _identity(path.stat())
        observed_sha256 = _sha256_file(path)
        if observed_identity != expected_identity or observed_sha256 != expected_sha256:
            raise RenderError(f"{role} commit readback integrity mismatch")
        return observed_sha256
    except RenderError as exc:
        primary = exc
    cleanup: OSError | None = None
    if path.exists() or path.is_symlink():
        try:
            path.unlink()
        except OSError as exc:
            cleanup = exc
    if cleanup is not None:
        raise RenderError(
            f"{primary}; additionally, invalid {role} target residue remains at {path}: {cleanup}"
        ) from ExceptionGroup(
            f"{role} commit integrity failure and invalid-target cleanup failure",
            [primary, cleanup],
        )
    raise primary


@contextmanager
def _hold_staged_executable(path: Path) -> Iterator[None]:
    """Deny staged executable writes/replacement while Windows opens it to run."""

    if os.name != "nt":
        descriptor = os.open(path, os.O_RDONLY)
        try:
            yield
        finally:
            os.close(descriptor)
        return

    import ctypes
    from ctypes import wintypes

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    create_file = kernel32.CreateFileW
    create_file.argtypes = [
        wintypes.LPCWSTR,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.LPVOID,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.HANDLE,
    ]
    create_file.restype = wintypes.HANDLE
    close_handle = kernel32.CloseHandle
    close_handle.argtypes = [wintypes.HANDLE]
    close_handle.restype = wintypes.BOOL
    handle = create_file(
        os.fspath(path),
        0x80000000,
        0x00000001,
        None,
        3,
        0x00000080,
        None,
    )
    invalid = wintypes.HANDLE(-1).value
    if handle == invalid:
        raise RenderError(
            f"cannot lock staged renderer identity: WinError {ctypes.get_last_error()}"
        )
    try:
        yield
    finally:
        if not close_handle(handle):
            raise RenderError(
                f"cannot release staged renderer identity: WinError {ctypes.get_last_error()}"
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


def _renderer_version(binary: Path, expected_version: str, run_root: Path) -> None:
    completed = _run_renderer([os.fspath(binary), "--version"], cwd=run_root)
    if completed.returncode != 0:
        raise RenderError(f"renderer version check failed with exit {completed.returncode}")
    observed = completed.stdout.strip()
    if observed not in {expected_version, f"resvg {expected_version}"}:
        raise RenderError(
            f"renderer version mismatch: expected resvg {expected_version!s}, observed {observed!r}"
        )


def _raise_render_outcome(
    primary: RenderError | None,
    cleanup_failures: list[tuple[Path, OSError]],
) -> None:
    if cleanup_failures:
        residue = "; ".join(f"{path}: {error}" for path, error in cleanup_failures)
        message = f"temporary render cleanup left explicit residue: {residue}"
        cleanup_errors = [error for _, error in cleanup_failures]
        if primary is not None:
            combined = RenderError(f"{primary}; additionally, {message}")
            raise combined from ExceptionGroup(
                "render primary failure and temporary cleanup failure",
                [primary, *cleanup_errors],
            )
        cleanup_error = RenderError(message)
        if len(cleanup_errors) == 1:
            raise cleanup_error from cleanup_errors[0]
        raise cleanup_error from ExceptionGroup(
            "multiple temporary render cleanup failures", cleanup_errors
        )
    if primary is not None:
        raise primary


def render_svg(
    svg_path: Path,
    output_path: Path,
    profile: RenderProfile,
    *,
    run_contract: dict | None = None,
) -> RenderResult:
    """Sanitize and render SVG with the exact authorized binary and no PATH lookup."""

    _validate_profile(profile)
    _validate_renderer_binary_location(profile)
    constraints = _validated_write_constraints(
        run_contract,
        output_path,
        profile,
        allowed_kinds=frozenset({"evidence"}),
        operation="reconstruct",
    )
    output, run_root = _bounded_output(output_path)
    if output != constraints.target or run_root != constraints.run_root:
        raise RenderError("prepared output diverges from the validated run contract")
    source_binding, source_payload = _bind_contract_input(
        constraints,
        svg_path,
        kind="vector-output",
        suffix=".svg",
        role="sanitized SVG",
    )
    try:
        sanitized = sanitize_svg(source_payload)
    except UnsafeSVGError as exc:
        raise RenderError(f"SVG input failed deterministic safety validation: {exc}") from None

    svg_temp: Path | None = None
    png_temp: Path | None = None
    staged_renderer: Path | None = None
    primary_error: RenderError | None = None
    output_hash: str | None = None
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
        staged_renderer, staged_identity = _stage_renderer(profile, output.parent)
        with _hold_staged_executable(staged_renderer):
            _assert_staged_identity(
                staged_renderer, staged_identity, profile.renderer_sha256
            )
            _renderer_version(staged_renderer, profile.renderer_version, run_root)
            _assert_staged_identity(
                staged_renderer, staged_identity, profile.renderer_sha256
            )
            completed = _run_renderer(
                [os.fspath(staged_renderer), os.fspath(svg_temp), os.fspath(png_temp)],
                cwd=run_root,
            )
            if completed.returncode != 0:
                message = (completed.stderr or completed.stdout).strip()
                raise RenderError(
                    f"renderer failed with exit {completed.returncode}: {message}"
                )
            _assert_staged_identity(
                staged_renderer, staged_identity, profile.renderer_sha256
            )
        image, rendered_binding = _open_checked_png_header(png_temp)
        try:
            image.load()
            if image.size != (profile.width, profile.height):
                raise RenderError(
                    "renderer output dimensions do not match the fixed profile; scaling/cropping is forbidden"
                )
        finally:
            image.close()
        _assert_plain_existing_components(output.parent)
        _verify_input_binding(rendered_binding)
        _revalidate_write_constraints(constraints, (source_binding,))
        os.replace(png_temp, output)
        png_temp = None
        output_hash = _verify_committed_target(
            output,
            expected_sha256=rendered_binding.sha256,
            expected_identity=rendered_binding.identity,
            role="render output",
        )
    except Exception as exc:
        if isinstance(exc, RenderError):
            primary_error = exc
        else:
            primary_error = RenderError(f"cannot render/write output safely: {exc}")
            primary_error.__cause__ = exc

    cleanup_failures: list[tuple[Path, OSError]] = []
    for temporary in (svg_temp, png_temp, staged_renderer):
        if temporary is not None and (temporary.exists() or temporary.is_symlink()):
            try:
                temporary.unlink(missing_ok=True)
            except OSError as exc:
                cleanup_failures.append((temporary, exc))
    _raise_render_outcome(primary_error, cleanup_failures)
    if output_hash is None:
        raise RenderError("render completed without output hash evidence")

    return RenderResult(
        output_path=output,
        output_sha256=output_hash,
        width=profile.width,
        height=profile.height,
        profile_id=profile.profile_id,
        renderer_id=profile.renderer_id,
        renderer_version=profile.renderer_version,
        renderer_sha256=profile.renderer_sha256,
        registry_digest=profile.registry_sha256,
    )
