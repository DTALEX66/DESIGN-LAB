# SPDX-License-Identifier: MIT
"""Validation and canonicalization for reconstruction contracts."""
from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterator

from jsonschema import Draft202012Validator, FormatChecker, ValidationError
from jsonschema.exceptions import best_match

RIR_SCHEMA_ID = "design-lab/reconstruction-ir/v1"
RUN_SCHEMA_ID = "design-lab/reconstruction-run/v1"

_SCHEMA_DIR = Path(__file__).resolve().parents[1] / "schemas" / "reconstruction"


class ContractError(ValueError):
    """A schema or cross-field reconstruction contract violation."""


def _load_schema(name: str) -> dict[str, Any]:
    with (_SCHEMA_DIR / name).open("r", encoding="utf-8") as stream:
        schema = json.load(stream)
    Draft202012Validator.check_schema(schema)
    return schema


_RIR_VALIDATOR = Draft202012Validator(
    _load_schema("reconstruction-ir.schema.json"), format_checker=FormatChecker()
)
_RUN_VALIDATOR = Draft202012Validator(
    _load_schema("reconstruction-run.schema.json"), format_checker=FormatChecker()
)


def _error_path(error: ValidationError) -> str:
    path = "$"
    for part in error.absolute_path:
        path += f"[{part}]" if isinstance(part, int) else f".{part}"
    return path


def _validate_schema(validator: Draft202012Validator, value: Any) -> None:
    error = best_match(validator.iter_errors(value))
    if error is not None:
        raise ContractError(f"{_error_path(error)}: {error.message}") from None


def _walk_nodes(nodes: list[dict[str, Any]]) -> Iterator[dict[str, Any]]:
    for node in nodes:
        yield node
        if node.get("type") == "group":
            yield from _walk_nodes(node["children"])


def _require_project_relative(path: str, field: str) -> PurePosixPath:
    if not isinstance(path, str) or not path:
        raise ContractError(f"{field}: expected a non-empty project-relative path")
    if "\\" in path or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", path):
        raise ContractError(f"{field}: URLs, URI schemes, and backslash paths are forbidden")
    pure = PurePosixPath(path)
    if pure.is_absolute() or (pure.parts and pure.parts[0].endswith(":")):
        raise ContractError(f"{field}: absolute paths are forbidden")
    if any(part in {"", ".", ".."} for part in pure.parts):
        raise ContractError(f"{field}: parent traversal and dot segments are forbidden")
    return pure


def _is_within(path: str, root: str) -> bool:
    normalized_root = root.rstrip("/")
    return path == normalized_root or path.startswith(normalized_root + "/")


def _parse_timestamp(value: str, field: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise ContractError(f"{field}: invalid RFC 3339 timestamp") from None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ContractError(f"{field}: timestamp must include an offset")
    return parsed.astimezone(timezone.utc)


def validate_rir(value: dict) -> None:
    """Validate a version-one reconstruction intermediate representation."""

    _validate_schema(_RIR_VALIDATOR, value)
    seen: set[str] = set()
    for node in _walk_nodes(value["layers"]):
        node_id = node["id"]
        if node_id in seen:
            raise ContractError(f"$.layers: duplicate node id {node_id!r}")
        seen.add(node_id)
        if node["type"] == "raster":
            _require_project_relative(node["raster"]["path"], f"node {node_id!r} raster.path")
        for number_name in ("opacity",):
            number = node[number_name]
            if not math.isfinite(number):
                raise ContractError(f"node {node_id!r} {number_name}: must be finite")
        for key, number in node["bounds"].items():
            if not math.isfinite(number):
                raise ContractError(f"node {node_id!r} bounds.{key}: must be finite")


def validate_run_contract(value: dict) -> None:
    """Validate a run contract, including identity and authorization bindings."""

    _validate_schema(_RUN_VALIDATOR, value)
    run_id = value["runId"]
    job_id = value["jobId"]
    runtime_root = f".hermes/task-runtime/reconstruction/{run_id}/"
    evidence_root = f".hermes/task-artifacts/reconstruction/{run_id}/"
    if value["roots"] != {"runtime": runtime_root, "evidence": evidence_root}:
        raise ContractError("$.roots: roots must be the exact declared run runtime/evidence roots")

    path_fields = [
        (value["source"]["path"], "$.source.path"),
        (value["source"]["normalizedReferenceTarget"], "$.source.normalizedReferenceTarget"),
        (value["registries"]["toolRegistry"], "$.registries.toolRegistry"),
        (value["registries"]["modelRegistry"], "$.registries.modelRegistry"),
        (value["cancellationPolicy"]["checkpointPath"], "$.cancellationPolicy.checkpointPath"),
    ]
    path_fields.extend((artifact["path"], f"$.artifacts[{index}].path") for index, artifact in enumerate(value["artifacts"]))
    path_fields.extend(
        (target, f"$.writeAuthorization.targets[{index}]")
        for index, target in enumerate(value["writeAuthorization"]["targets"])
    )
    path_fields.extend(
        (consent["path"], f"$.providerPolicy.remoteConsents[{index}].path")
        for index, consent in enumerate(value["providerPolicy"]["remoteConsents"])
    )
    for path, field in path_fields:
        _require_project_relative(path, field)

    if not _is_within(value["cancellationPolicy"]["checkpointPath"], runtime_root):
        raise ContractError("$.cancellationPolicy.checkpointPath: must be inside the runtime root")

    artifacts = value["artifacts"]
    artifact_ids = [artifact["id"] for artifact in artifacts]
    if len(artifact_ids) != len(set(artifact_ids)):
        raise ContractError("$.artifacts: duplicate artifact id")
    artifact_paths = [artifact["path"] for artifact in artifacts]
    if len(artifact_paths) != len(set(artifact_paths)):
        raise ContractError("$.artifacts: duplicate artifact path")
    for index, path in enumerate(artifact_paths):
        if not (_is_within(path, runtime_root) or _is_within(path, evidence_root)):
            raise ContractError(f"$.artifacts[{index}].path: target is outside declared roots")

    policy = value["providerPolicy"]
    if policy["selectedProvider"] not in policy["providerAllowlist"]:
        raise ContractError("$.providerPolicy.selectedProvider: provider is not allowlisted")
    if policy["selectedProvider"] != "local":
        required_consent = (
            value["source"]["path"],
            value["source"]["sha256"].lower(),
            policy["selectedProvider"],
        )
        consents = {
            (entry["path"], entry["sha256"].lower(), entry["provider"])
            for entry in policy["remoteConsents"]
            if entry["consented"]
        }
        if required_consent not in consents:
            raise ContractError(
                "$.providerPolicy.remoteConsents: exact source hash/provider consent is required"
            )

    authorization = value["writeAuthorization"]
    if authorization["runId"] != run_id or authorization["jobId"] != job_id:
        raise ContractError("$.writeAuthorization: authorization identity does not match job/run")
    if set(authorization["targets"]) != set(artifact_paths) or len(authorization["targets"]) != len(artifact_paths):
        raise ContractError("$.writeAuthorization.targets: targets must exactly match declared artifacts")
    issued_at = _parse_timestamp(authorization["issuedAt"], "$.writeAuthorization.issuedAt")
    expires_at = _parse_timestamp(authorization["expiresAt"], "$.writeAuthorization.expiresAt")
    now = datetime.now(timezone.utc)
    if issued_at > now:
        raise ContractError("$.writeAuthorization.issuedAt: authorization is not active yet")
    if expires_at <= issued_at:
        raise ContractError("$.writeAuthorization.expiresAt: must be later than issuedAt")
    if expires_at <= now:
        raise ContractError("$.writeAuthorization.expiresAt: authorization is expired")

    lifecycle = value["lifecycle"]
    transitions = {
        "created": {"authorized", "cancelled", "failed"},
        "authorized": {"running", "cancelled", "failed"},
        "running": {"completed", "cancelled", "failed"},
        "cancelled": {"authorized"},
        "failed": {"authorized"},
        "completed": {"packaged"},
        "packaged": {"readback-verified"},
        "readback-verified": set(),
    }
    history = lifecycle["history"]
    prior_to: str | None = None
    prior_at: datetime | None = None
    for index, entry in enumerate(history):
        if entry["to"] not in transitions[entry["from"]]:
            raise ContractError(f"$.lifecycle.history[{index}]: invalid lifecycle promotion")
        if prior_to is not None and entry["from"] != prior_to:
            raise ContractError(f"$.lifecycle.history[{index}]: discontinuous lifecycle history")
        at = _parse_timestamp(entry["at"], f"$.lifecycle.history[{index}].at")
        if prior_at is not None and at < prior_at:
            raise ContractError(f"$.lifecycle.history[{index}].at: lifecycle timestamps regress")
        prior_to, prior_at = entry["to"], at
    expected_state = prior_to if prior_to is not None else "created"
    if lifecycle["state"] != expected_state:
        raise ContractError("$.lifecycle.state: state does not match lifecycle history")


def canonical_rir_bytes(value: dict) -> bytes:
    """Return the validated RIR as canonical compact UTF-8 JSON."""

    validate_rir(value)
    try:
        text = json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
    except (TypeError, ValueError) as exc:
        raise ContractError(f"$: cannot canonicalize RIR: {exc}") from None
    return text.encode("utf-8")


def canonical_rir_hash(value: dict) -> str:
    """Return SHA-256 of the exact canonical RIR byte sequence."""

    return hashlib.sha256(canonical_rir_bytes(value)).hexdigest()
