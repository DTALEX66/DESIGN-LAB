# SPDX-License-Identifier: MIT
"""DL-P1-150: Blender host adapter contract plus a real GLB/glTF validator.

The adapter declaration is structural: Blender is not installed on this machine
and this module never launches it, never renders, never exports and never reads
a ``.blend`` file. ``blender_handoff`` describes what a future live adapter
would do and ends with ``requires a live Blender run: NOT_EXECUTED``.

The validators are real: :func:`validate_glb` walks the binary glTF container
byte by byte (header, chunk table, alignment, bounds, trailing bytes), parses
the JSON chunk and checks glTF 2.0 reference integrity; :func:`validate_gltf_json`
applies the same reference rules to the JSON variant without a BIN chunk. Only
the standard library is used - no glTF third-party library is imported - and no
file is opened: the caller supplies bytes.

Offset convention for errors: container violations carry the absolute byte
offset in ``data`` at which the violation was detected. Document-level
violations carry the byte offset of the JSON chunk payload (its first byte),
which is the exact byte where the offending document begins; ``.gltf``
documents have no container, so their offset is ``0`` (document start). Range
violations that overrun a BIN chunk carry the byte offset at which the overrun
would begin.

Deliberately NOT implemented: accessor element-size arithmetic against
``bufferView.byteLength`` (interleaving, matrix padding and sparse accessors
make a structural-only guess unsafe), and any semantic/geometry validation
(normals, manifoldness, units, materials).
"""
from __future__ import annotations

import json
from typing import Any, Mapping

from . import (
    MediaError,
    NOT_EXECUTED,
    STRUCTURAL_EVIDENCE,
    require_mapping,
    require_text,
    validate_against,
)

__all__ = [
    "ADAPTER_ID",
    "BIN_CHUNK_TYPE",
    "GLB_HEADER_LENGTH",
    "GLB_MAGIC",
    "GLB_VERSION",
    "JSON_CHUNK_TYPE",
    "blender_adapter_declaration",
    "blender_adapter_report",
    "blender_capabilities",
    "blender_handoff",
    "build_glb",
    "diagnose_glb",
    "glb_report_summary",
    "validate_glb",
    "validate_gltf_json",
]

ADAPTER_ID = "design-lab.blender-adapter.structural"
ADAPTER_VERSION = "0.1.0-structural-e1"

GLB_MAGIC = b"glTF"
GLB_VERSION = 2
GLB_HEADER_LENGTH = 12
JSON_CHUNK_TYPE = 0x4E4F534A  # b"JSON" read little-endian
BIN_CHUNK_TYPE = 0x004E4942  # b"BIN\0" read little-endian
_CHUNK_HEADER_LENGTH = 8

#: Capability names this adapter declares but cannot execute.
_BLENDER_CAPABILITIES = (
    ("open-blend-file", "open a .blend document through the Blender CLI"),
    ("headless-render", "run ``--background`` renders on a fixed frame range"),
    ("gltf-export", "export a scene to .gltf or .glb"),
    ("geometry-readback", "read object counts, bounds and units back from a scene"),
    ("material-readback", "read material and texture bindings back from a scene"),
)

_SCHEMA_ARTIFACTS = [
    "src/design_lab/creative/media/three_d.py",
    "design-lab/schemas/media-three-d-adapter.schema.json",
]

_GLTF_COMPONENT_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def _error(code: str, offset: int, detail: str) -> MediaError:
    return MediaError(code, f"offset={offset}: {detail}")


def blender_capabilities() -> list:
    """Declared Blender capabilities; every one is unsupported in this build."""
    return [
        {
            "name": name,
            "supported": False,
            "note": (
                f"declared only - {subject}. Blender is not installed on this "
                "machine, so this build cannot execute or measure it"
            ),
        }
        for name, subject in _BLENDER_CAPABILITIES
    ]


def blender_adapter_declaration() -> dict:
    """The Blender adapter contract, validated against adapter-contract.schema.json.

    ``status`` is ``structural`` and ``mode`` is ``external-cli``: the CLI shape
    is declared, but no Blender binary exists on this host and no install path
    was probed, so no capability may be advertised as supported.
    """
    declaration = {
        "adapter_id": ADAPTER_ID,
        "tool": "blender",
        "status": "structural",
        "mode": "external-cli",
        "license": "GPL-3.0-or-later",
        "capabilities": blender_capabilities(),
        "fallback": (
            "no Blender fallback exists in this build: 3D artifacts are accepted "
            "only as already-produced GLB or glTF files and are validated "
            "structurally by design_lab.creative.media.three_d.validate_glb"
        ),
        "evidence": {
            "level": STRUCTURAL_EVIDENCE,
            "runtime_version": None,
            "task_ids": ["DL-P1-150"],
            "artifact_paths": list(_SCHEMA_ARTIFACTS),
            "note": (
                "Blender is not installed on this machine (declared, not probed); "
                "no Blender process was started, no scene was opened and no render "
                "or export was executed. A live Blender version, install path and "
                "readback remain NOT_EXECUTED"
            ),
        },
        "rollback": (
            "nothing to roll back structurally: this adapter writes no Blender "
            "file, preference or addon. A future live run must roll back by "
            "deleting only the artifacts it wrote under the project-local task "
            "runtime root, by releasing the headless process lease, and by "
            "restoring the scene file from its pre-run hash-checked copy"
        ),
    }
    return validate_against("adapter-contract", declaration)


def _check_uri(uri: Any, index: int, offset: int) -> str:
    if not isinstance(uri, str) or not uri:
        raise _error(
            "GLTF_BUFFER_URI_INVALID", offset, f"buffers[{index}].uri is empty or not a string"
        )
    if uri.startswith("data:"):
        raise MediaError(
            "GLTF_BUFFER_URI_DATA_URI_UNSUPPORTED",
            f"offset={offset}: buffers[{index}].uri is a data URI; embedded base64 "
            "payloads are not resolved structurally",
        )
    if "\\" in uri:
        raise _error(
            "GLTF_BUFFER_URI_UNSAFE",
            offset,
            f"buffers[{index}].uri {uri!r} uses a backslash path separator",
        )
    if uri.startswith("/") or (len(uri) > 1 and uri[1] == ":"):
        raise _error(
            "GLTF_BUFFER_URI_UNSAFE",
            offset,
            f"buffers[{index}].uri {uri!r} is an absolute path",
        )
    if ".." in uri.split("/"):
        raise _error(
            "GLTF_BUFFER_URI_UNSAFE",
            offset,
            f"buffers[{index}].uri {uri!r} traverses upwards",
        )
    return uri


def _check_document(document: Any, *, container: str, offset: int,
                    bin_chunk_lengths: list | None) -> dict:
    """glTF 2.0 reference integrity shared by the GLB and .gltf containers."""
    if not isinstance(document, Mapping):
        raise _error(
            "GLTF_DOCUMENT_NOT_OBJECT", offset, f"top level is {type(document).__name__}"
        )
    asset = document.get("asset")
    if not isinstance(asset, Mapping):
        raise _error("GLTF_ASSET_MISSING", offset, "required member 'asset' is missing")
    version = asset.get("version")
    if version != "2.0":
        raise _error(
            "GLTF_ASSET_VERSION",
            offset,
            f"asset.version is {version!r}, expected '2.0'",
        )

    buffers = document.get("buffers", [])
    if not isinstance(buffers, list):
        raise _error("GLTF_BUFFERS_NOT_ARRAY", offset, "'buffers' must be an array")
    buffer_lengths = []
    external_assets = []
    for index, buffer in enumerate(buffers):
        if not isinstance(buffer, Mapping):
            raise _error(
                "GLTF_BUFFER_NOT_OBJECT", offset, f"buffers[{index}] is not an object"
            )
        byte_length = buffer.get("byteLength")
        if type(byte_length) is not int or byte_length < 0:
            raise _error(
                "GLTF_BUFFER_BYTELENGTH",
                offset,
                f"buffers[{index}].byteLength must be a non-negative integer",
            )
        if "uri" in buffer:
            uri = _check_uri(buffer["uri"], index, offset)
            external_assets.append(
                {
                    "kind": "buffer",
                    "index": index,
                    "uri": uri,
                    "byteLength": byte_length,
                    "resolution": "NOT_PROBED",
                    "note": "declared external asset; never resolved or fetched",
                }
            )
        elif bin_chunk_lengths is None:
            raise _error(
                "GLTF_BUFFER_REQUIRES_URI",
                offset,
                f"buffers[{index}] has no uri and the gltf container has no BIN "
                "chunk to resolve it",
            )
        else:
            if index >= len(bin_chunk_lengths):
                raise _error(
                    "GLB_BUFFER_BINARY_CHUNK_MISSING",
                    offset,
                    f"buffers[{index}] declares no uri but only "
                    f"{len(bin_chunk_lengths)} BIN chunk(s) exist",
                )
            chunk = bin_chunk_lengths[index]
            if byte_length > chunk["length"]:
                raise _error(
                    "GLB_BUFFER_BYTELENGTH_EXCEEDS_CHUNK",
                    chunk["data_offset"] + max(chunk["length"], 0),
                    f"buffers[{index}].byteLength {byte_length} exceeds BIN chunk "
                    f"{index} length {chunk['length']}",
                )
        buffer_lengths.append(byte_length)

    buffer_views = document.get("bufferViews", [])
    if not isinstance(buffer_views, list):
        raise _error("GLTF_BUFFERVIEWS_NOT_ARRAY", offset, "'bufferViews' must be an array")
    for index, view in enumerate(buffer_views):
        if not isinstance(view, Mapping):
            raise _error(
                "GLTF_BUFFERVIEW_NOT_OBJECT", offset, f"bufferViews[{index}] is not an object"
            )
        target = view.get("buffer")
        if type(target) is not int or not 0 <= target < len(buffer_lengths):
            raise _error(
                "GLTF_BUFFERVIEW_BUFFER_INDEX",
                offset,
                f"bufferViews[{index}].buffer {target!r} does not reference a "
                f"declared buffer (declared: {len(buffer_lengths)})",
            )
        view_length = view.get("byteLength")
        if type(view_length) is not int or view_length < 0:
            raise _error(
                "GLTF_BUFFERVIEW_BYTELENGTH",
                offset,
                f"bufferViews[{index}].byteLength must be a non-negative integer",
            )
        view_offset = view.get("byteOffset", 0)
        if type(view_offset) is not int or view_offset < 0:
            raise _error(
                "GLTF_BUFFERVIEW_BYTEOFFSET",
                offset,
                f"bufferViews[{index}].byteOffset must be a non-negative integer",
            )
        if view_offset + view_length > buffer_lengths[target]:
            raise _error(
                "GLTF_BUFFERVIEW_RANGE",
                offset,
                f"bufferViews[{index}] spans {view_offset}+{view_length} bytes but "
                f"buffers[{target}].byteLength is {buffer_lengths[target]}",
            )

    accessors = document.get("accessors", [])
    if not isinstance(accessors, list):
        raise _error("GLTF_ACCESSORS_NOT_ARRAY", offset, "'accessors' must be an array")
    for index, accessor in enumerate(accessors):
        if not isinstance(accessor, Mapping):
            raise _error(
                "GLTF_ACCESSOR_NOT_OBJECT", offset, f"accessors[{index}] is not an object"
            )
        if "bufferView" not in accessor:
            sparse = accessor.get("sparse")
            if isinstance(sparse, Mapping):
                continue
            raise _error(
                "GLTF_ACCESSOR_BUFFERVIEW_MISSING",
                offset,
                f"accessors[{index}] has no bufferView and no sparse block",
            )
        target = accessor["bufferView"]
        if type(target) is not int or not 0 <= target < len(buffer_views):
            raise _error(
                "GLTF_ACCESSOR_BUFFERVIEW_INDEX",
                offset,
                f"accessors[{index}].bufferView {target!r} does not reference a "
                f"declared bufferView (declared: {len(buffer_views)})",
            )
        counts = _GLTF_COMPONENT_COUNT.get(accessor.get("type"))
        component_size = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}.get(
            accessor.get("componentType")
        )
        count = accessor.get("count")
        if counts is None or component_size is None or type(count) is not int or count < 0:
            continue
        view = buffer_views[target]
        if not isinstance(view, Mapping):
            continue
        element = component_size * counts
        stride = view.get("byteStride")
        element_offset = accessor.get("byteOffset", 0)
        if type(element_offset) is not int or element_offset < 0:
            raise _error(
                "GLTF_ACCESSOR_BYTEOFFSET",
                offset,
                f"accessors[{index}].byteOffset must be a non-negative integer",
            )
        if type(stride) is int and stride > 0:
            required = element_offset + max(count - 1, 0) * stride + element
        else:
            required = element_offset + count * element
        view_length = view.get("byteLength")
        if type(view_length) is int and required > view_length:
            raise _error(
                "GLTF_ACCESSOR_RANGE",
                offset,
                f"accessors[{index}] needs {required} bytes but bufferViews[{target}] "
                f"declares {view_length}",
            )

    return {
        "asset_version": version,
        "counts": {
            "buffers": len(buffers),
            "bufferViews": len(buffer_views),
            "accessors": len(accessors),
            "meshes": len(document.get("meshes", []) or []),
            "nodes": len(document.get("nodes", []) or []),
            "materials": len(document.get("materials", []) or []),
            "scenes": len(document.get("scenes", []) or []),
        },
        "external_assets": external_assets,
        "container": container,
    }


def validate_gltf_json(document: Mapping) -> dict:
    """Validate a ``.gltf`` JSON document without a BIN chunk.

    Every ``buffer`` must declare a ``uri``; those URIs are recorded as declared
    external assets and are never resolved, opened or fetched. The container has
    no bytes, so reported offsets are ``0`` (document start).
    """
    checks = _check_document(document, container="gltf", offset=0, bin_chunk_lengths=None)
    return {
        "status": "VALID",
        "evidence_level": STRUCTURAL_EVIDENCE,
        "container": "gltf",
        "byte_length": None,
        "asset_version": checks["asset_version"],
        "counts": checks["counts"],
        "external_assets": checks["external_assets"],
        "json_chunk": None,
        "bin_chunks": [],
        "binary_chunks": [],
        "document": dict(document),
    }


def validate_glb(data: bytes) -> dict:
    """Structurally validate a GLB container. Reads bytes only; opens no file."""
    if not isinstance(data, (bytes, bytearray, memoryview)):
        raise MediaError(
            "GLB_INPUT_NOT_BYTES", f"expected bytes, got {type(data).__name__}"
        )
    data = bytes(data)
    if len(data) < GLB_HEADER_LENGTH:
        raise _error(
            "GLB_HEADER_TRUNCATED",
            0,
            f"only {len(data)} bytes present, the glTF header needs 12",
        )
    if data[0:4] != GLB_MAGIC:
        raise _error(
            "GLB_HEADER_MAGIC", 0, f"magic is {data[0:4]!r}, expected {GLB_MAGIC!r}"
        )
    version = int.from_bytes(data[4:8], "little")
    if version != GLB_VERSION:
        raise _error("GLB_HEADER_VERSION", 4, f"version is {version}, expected 2")
    declared_length = int.from_bytes(data[8:12], "little")
    if declared_length != len(data):
        raise _error(
            "GLB_HEADER_LENGTH",
            8,
            f"declared length {declared_length} != actual {len(data)} bytes",
        )

    chunks = []
    bin_chunks = []
    json_chunk = None
    offset = GLB_HEADER_LENGTH
    while offset < len(data):
        if len(data) - offset < _CHUNK_HEADER_LENGTH:
            raise _error(
                "GLB_CHUNK_HEADER_TRUNCATED",
                offset,
                f"{len(data) - offset} trailing bytes cannot hold an 8-byte chunk header",
            )
        chunk_length = int.from_bytes(data[offset:offset + 4], "little")
        chunk_type = int.from_bytes(data[offset + 4:offset + 8], "little")
        data_offset = offset + _CHUNK_HEADER_LENGTH
        end = data_offset + chunk_length
        if chunk_length % 4:
            raise _error(
                "GLB_CHUNK_ALIGNMENT",
                offset,
                f"chunk length {chunk_length} is not 4-byte aligned",
            )
        if end > len(data):
            raise _error(
                "GLB_CHUNK_BOUNDS",
                offset,
                f"chunk length {chunk_length} at {offset} overruns the "
                f"{len(data)}-byte container",
            )
        body = data[data_offset:end]
        if chunk_type == JSON_CHUNK_TYPE:
            if json_chunk is not None:
                raise _error("GLB_CHUNK_ORDER", offset, "a second JSON chunk is present")
            if chunks:
                raise _error(
                    "GLB_CHUNK_ORDER", offset, "the JSON chunk must be the first chunk"
                )
            json_chunk = {
                "index": len(chunks),
                "header_offset": offset,
                "data_offset": data_offset,
                "length": chunk_length,
            }
            chunks.append({"type": "JSON", "header_offset": offset})
        elif chunk_type == BIN_CHUNK_TYPE:
            if json_chunk is None:
                raise _error(
                    "GLB_CHUNK_ORDER", offset, "a BIN chunk appears before the JSON chunk"
                )
            bin_chunks.append(
                {
                    "index": len(bin_chunks),
                    "header_offset": offset,
                    "data_offset": data_offset,
                    "length": chunk_length,
                    "body": body,
                }
            )
            chunks.append({"type": "BIN", "header_offset": offset})
        else:
            raise _error(
                "GLB_CHUNK_TYPE_UNKNOWN",
                offset,
                f"chunk type {chunk_type:#010x} is neither JSON nor BIN",
            )
        offset = end

    if offset != len(data):
        raise _error("GLB_TRAILING_BYTES", offset, "unparsed trailing bytes remain")
    if json_chunk is None:
        raise _error("GLB_JSON_CHUNK_MISSING", len(data), "no JSON chunk is present")

    raw_json = data[json_chunk["data_offset"]:json_chunk["data_offset"] + json_chunk["length"]]
    try:
        text = raw_json.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise _error(
            "GLB_JSON_ENCODING", json_chunk["data_offset"], f"JSON chunk is not UTF-8: {exc}"
        ) from exc
    stripped = text.rstrip(" ")
    json_chunk["padding"] = len(text) - len(stripped)
    try:
        document = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise _error(
            "GLB_JSON_PARSE",
            json_chunk["data_offset"],
            f"JSON chunk does not parse: {exc.msg} at column {exc.colno}",
        ) from exc
    if not isinstance(document, Mapping):
        raise _error(
            "GLB_JSON_NOT_OBJECT",
            json_chunk["data_offset"],
            f"JSON chunk decoded to {type(document).__name__}, expected an object",
        )

    checks = _check_document(
        document,
        container="glb",
        offset=json_chunk["data_offset"],
        bin_chunk_lengths=bin_chunks,
    )
    buffers = document.get("buffers", []) or []
    public_chunks = []
    for chunk in bin_chunks:
        buffer = buffers[chunk["index"]] if chunk["index"] < len(buffers) else {}
        declared = buffer.get("byteLength") if isinstance(buffer, Mapping) else None
        body = chunk["body"]
        if type(declared) is int:
            body_view = body[:declared]
            padding_nonzero = any(byte != 0 for byte in body[declared:])
        else:
            body_view = body
            padding_nonzero = False
        public_chunks.append(
            {
                "index": chunk["index"],
                "header_offset": chunk["header_offset"],
                "data_offset": chunk["data_offset"],
                "length": chunk["length"],
                "declared_byte_length": declared,
                "body": body_view,
                "data": body,
                "padding_nonzero": padding_nonzero,
            }
        )
    return {
        "status": "VALID",
        "evidence_level": STRUCTURAL_EVIDENCE,
        "container": "glb",
        "byte_length": len(data),
        "header": {"magic": "glTF", "version": GLB_VERSION, "length": declared_length},
        "json_chunk": json_chunk,
        "bin_chunks": public_chunks,
        "binary_chunks": [chunk["body"] for chunk in public_chunks],
        "asset_version": checks["asset_version"],
        "counts": checks["counts"],
        "external_assets": checks["external_assets"],
        "document": dict(document),
    }


def diagnose_glb(data: bytes) -> dict:
    """Non-raising wrapper around :func:`validate_glb` for triage and reporting."""
    try:
        return {"valid": True, "record": validate_glb(data), "error": None}
    except MediaError as exc:
        return {"valid": False, "record": None, "error": str(exc)}


def glb_report_summary(record: Mapping) -> dict:
    """JSON-safe summary of a validation record (drops bytes and the document)."""
    require_mapping(record, "record")
    json_chunk = record.get("json_chunk")
    return {
        "status": require_text(record.get("status"), "status"),
        "container": require_text(record.get("container"), "container"),
        "evidence_level": STRUCTURAL_EVIDENCE,
        "byte_length": record.get("byte_length"),
        "asset_version": require_text(record.get("asset_version"), "asset_version"),
        "counts": dict(record.get("counts", {})),
        "external_assets": [
            dict(asset) for asset in record.get("external_assets", [])
        ],
        "json_chunk": None if json_chunk is None else {
            "index": json_chunk["index"],
            "header_offset": json_chunk["header_offset"],
            "data_offset": json_chunk["data_offset"],
            "length": json_chunk["length"],
            "padding": json_chunk.get("padding", 0),
        },
        "bin_chunks": [
            {
                "index": chunk["index"],
                "header_offset": chunk["header_offset"],
                "data_offset": chunk["data_offset"],
                "length": chunk["length"],
                "declared_byte_length": chunk.get("declared_byte_length"),
                "padding_nonzero": bool(chunk.get("padding_nonzero")),
            }
            for chunk in record.get("bin_chunks", [])
        ],
    }


def build_glb(json_document: Mapping, binary_chunk: bytes | None = None) -> bytes:
    """Build a GLB container from a JSON document and an optional BIN chunk.

    JSON padding is spaces and BIN padding is zeros, as glTF 2.0 requires, so
    ``validate_glb(build_glb(document, chunk))`` returns the document unchanged
    and the chunk body byte for byte.
    """
    if not isinstance(json_document, Mapping):
        raise MediaError(
            "GLB_DOCUMENT_NOT_OBJECT",
            f"expected a mapping, got {type(json_document).__name__}",
        )
    try:
        payload = json.dumps(
            dict(json_document), ensure_ascii=False, separators=(",", ":"), allow_nan=False
        ).encode("utf-8")
    except (TypeError, ValueError) as exc:
        raise MediaError("GLB_DOCUMENT_NOT_SERIALIZABLE", str(exc)) from exc
    padded_json = payload + b" " * (-len(payload) % 4)
    body = (
        len(padded_json).to_bytes(4, "little")
        + JSON_CHUNK_TYPE.to_bytes(4, "little")
        + padded_json
    )
    if binary_chunk is not None:
        if not isinstance(binary_chunk, (bytes, bytearray, memoryview)):
            raise MediaError(
                "GLB_CHUNK_NOT_BYTES", f"expected bytes, got {type(binary_chunk).__name__}"
            )
        raw = bytes(binary_chunk)
        padded_bin = raw + b"\x00" * (-len(raw) % 4)
        body += (
            len(padded_bin).to_bytes(4, "little")
            + BIN_CHUNK_TYPE.to_bytes(4, "little")
            + padded_bin
        )
    total = GLB_HEADER_LENGTH + len(body)
    header = GLB_MAGIC + GLB_VERSION.to_bytes(4, "little") + total.to_bytes(4, "little")
    return header + body


def blender_handoff(plan: Mapping) -> dict:
    """Describe the live handoff a real Blender adapter would perform.

    Nothing here is executed: the plan is validated, the steps are described and
    the record ends with ``requires a live Blender run: NOT_EXECUTED``.
    """
    plan = require_mapping(plan, "plan", code="BLENDER_HANDOFF_PLAN_INVALID")
    allowed = {
        "handoff_id", "scene_ref", "script_ref", "output_ref", "blender_ref",
        "frames",
    }
    if set(plan) - allowed:
        raise MediaError(
            "BLENDER_HANDOFF_PLAN_INVALID",
            f"unexpected plan keys: {sorted(set(plan) - allowed)}",
        )
    handoff_id = require_text(
        plan.get("handoff_id"), "handoff_id", code="BLENDER_HANDOFF_PLAN_INVALID"
    )
    scene_ref = require_text(
        plan.get("scene_ref"), "scene_ref", code="BLENDER_HANDOFF_PLAN_INVALID"
    )
    script_ref = require_text(
        plan.get("script_ref"), "script_ref", code="BLENDER_HANDOFF_PLAN_INVALID"
    )
    output_ref = require_text(
        plan.get("output_ref"), "output_ref", code="BLENDER_HANDOFF_PLAN_INVALID"
    )
    blender_ref = plan.get("blender_ref", "os-toolchain")
    require_text(blender_ref, "blender_ref", code="BLENDER_HANDOFF_PLAN_INVALID")
    frames = plan.get("frames")
    if frames is not None:
        if (not isinstance(frames, list) or len(frames) != 2
                or any(type(value) is not int or value < 0 for value in frames)
                or frames[1] < frames[0]):
            raise MediaError(
                "BLENDER_HANDOFF_PLAN_INVALID",
                "frames must be an inclusive [first, last] pair of non-negative integers",
            )
    steps = [
        {
            "step": 1,
            "action": (
                f"probe the Blender install path through the declared alias "
                f"'{blender_ref}' (never an absolute path) and record the exact "
                "binary version string"
            ),
            "status": NOT_EXECUTED,
            "requires": (
                "a live Blender installation resolvable through the declared "
                "alias; no install path was probed in this build"
            ),
        },
        {
            "step": 2,
            "action": (
                f"run headless: blender --background {scene_ref} --python "
                f"{script_ref} -- {output_ref}"
                + ("" if frames is None else f" --frames {frames[0]}..{frames[1]}")
            ),
            "status": NOT_EXECUTED,
            "requires": (
                "a live Blender run; this build starts no process and opens no scene"
            ),
        },
        {
            "step": 3,
            "action": (
                f"read back the produced file at '{output_ref}': hash it, compare "
                "with the exporter declaration and validate the container with "
                "validate_glb"
            ),
            "status": NOT_EXECUTED,
            "requires": (
                "an artifact produced by step 2; nothing was produced here, so no "
                "hash exists to read back"
            ),
        },
        {
            "step": 4,
            "action": (
                "roll back by deleting only the artifacts written under the "
                "project-local task runtime root and releasing the process lease"
            ),
            "status": NOT_EXECUTED,
            "requires": "a live run to have written something first",
        },
    ]
    return {
        "handoff_id": handoff_id,
        "task_ids": ["DL-P1-150"],
        "evidence_level": STRUCTURAL_EVIDENCE,
        "scene_ref": scene_ref,
        "script_ref": script_ref,
        "output_ref": output_ref,
        "blender_ref": blender_ref,
        "frames": frames,
        "steps": steps,
        "requires_live_host": True,
        "host_execution": NOT_EXECUTED,
        "note": "requires a live Blender run: NOT_EXECUTED",
    }


def blender_adapter_report(*, glb_validation: Mapping | None = None,
                           handoff: Mapping | None = None) -> dict:
    """Adapter report validated by ``media-three-d-adapter.schema.json``.

    The embedded ``adapter_contract`` is the same document that
    :func:`blender_adapter_declaration` validates against the repository's
    ``adapter-contract.schema.json``; the report schema only fixes its summary
    shape.
    """
    declaration = blender_adapter_declaration()
    report = {
        "schemaVersion": "design-lab/media-three-d-adapter/v1",
        "adapter_id": declaration["adapter_id"],
        "task_ids": ["DL-P1-150"],
        "evidence_level": STRUCTURAL_EVIDENCE,
        "host": {
            "tool": "blender",
            "status": "structural",
            "mode": "external-cli",
            "installed": False,
            "install_state": "NOT_PROBED_ON_THIS_HOST",
            "note": (
                "Blender is not installed on this machine (declared, not probed); "
                "no install path was searched and no host run was executed"
            ),
        },
        "capabilities": [dict(item) for item in declaration["capabilities"]],
        "adapter_contract": declaration,
        "handoff": None if handoff is None else dict(handoff),
        "glb_validation": (
            None if glb_validation is None else glb_report_summary(glb_validation)
        ),
    }
    return validate_against("media-three-d-adapter", report)
