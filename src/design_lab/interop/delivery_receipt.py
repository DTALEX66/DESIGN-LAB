# SPDX-License-Identifier: MIT
"""DL-P0-161: DeliveryReceipt V2 -- deterministic, evidence-honest delivery record.

What a receipt is
-----------------
A receipt binds one *job* to its deliverables and records, per deliverable: the
artifact digest, the byte size, the editable flag, the host readback (or ``null``),
the digest of the C2PA-shaped provenance structure (never the structure itself),
the caller-declared requirements and the rollback record for that artifact. The
receipt is deterministic: it never reads the wall clock, ``created_at`` must be
supplied by the caller, and its identity is derived from its own canonical JSON.

Evidence honesty is enforced, not documented away
-------------------------------------------------
``axes.delivery`` is ``PARTIAL`` unless *every* deliverable has a host readback;
:func:`verify_receipt` recomputes the receipt hash, rejects any digest that is not
a nonzero ``sha256:`` value, and fails closed when the delivery axis claims more
than the evidence supports. :func:`unsupported_claims` states exactly what the
receipt does not prove -- read it before quoting this receipt anywhere.

Boundary: JSON in, JSON out; no clock, no filesystem, no host, no signature. No
part of this module performs a host readback; it records one that a caller
supplies. All evidence reachable from this module is E1 (STRUCTURAL).
"""
from __future__ import annotations

import json
from datetime import datetime

from ..runtime.attempt_contract import canonical_hash, request_hash
from ..runtime.paths import PROJECT_ROOT
from . import InteropError, load_schema, schema_errors
from .provenance import SIGNING_STATUS, manifest_digest, validate_manifest

SCHEMA_VERSION = "design-lab/delivery-receipt/v2"
TASK_ID = "DL-P0-161"
SCHEMA_PATH = PROJECT_ROOT / "design-lab/schemas/interop-delivery-receipt-v2.schema.json"

DELIVERY_AXES = ("PASS", "PARTIAL")
#: Requirement statuses reused from the repository's provenance record vocabulary.
REQUIREMENT_STATUSES = (
    "NOT_RUN", "PASS", "FAIL", "BLOCKED", "UNVERIFIED", "SKIPPED_OPTIONAL",
)
IDENTITY_FIELDS = ("receipt_id", "receipt_sha256")


def _fail(message: str) -> "InteropError":
    return InteropError(message)


def _text(value, where: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise _fail(f"{where} must be a nonempty string")
    return value


def _digest(value, where: str) -> str:
    try:
        return canonical_hash(value)
    except ValueError as exc:
        raise _fail(f"{where}: {exc}") from exc


def _integer(value, where: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise _fail(f"{where} must be a non-negative integer")
    return value


def _boolean(value, where: str) -> bool:
    if not isinstance(value, bool):
        raise _fail(f"{where} must be a boolean")
    return value


def _timestamp(value, where: str) -> str:
    text = _text(value, where)
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise _fail(f"{where} must be an ISO-8601 timestamp; got {text!r}") from exc
    return text


def _schema_errors(document) -> list[str]:
    return schema_errors(load_schema(SCHEMA_PATH), document)


# --------------------------------------------------------------------------- #
# hashing
# --------------------------------------------------------------------------- #

def _body(receipt: dict) -> dict:
    return {key: value for key, value in receipt.items() if key not in IDENTITY_FIELDS}


def _derive_id(body: dict) -> str:
    return "receipt-" + request_hash(body).removeprefix("sha256:")[:16]


def _derive_hash(body: dict, receipt_id: str) -> str:
    return request_hash({**body, "receipt_id": receipt_id})


def receipt_sha256(receipt) -> str:
    """The canonical hash of a receipt body plus its ``receipt_id``."""
    if not isinstance(receipt, dict):
        raise _fail("receipt must be an object")
    body = _body(receipt)
    receipt_id = receipt.get("receipt_id")
    if receipt_id is None:
        receipt_id = _derive_id(body)
    else:
        _text(receipt_id, "receipt.receipt_id")
    return _derive_hash(body, receipt_id)


def rebuild_identity(receipt) -> dict:
    """Recompute ``receipt_id`` and ``receipt_sha256`` for a receipt body.

    A receipt is not signed, so this is an integrity check against accidental
    edits, not protection against tampering. Call it after changing a body, then
    run :func:`verify_receipt` so the evidence rules are applied again.
    """
    if not isinstance(receipt, dict):
        raise _fail("receipt must be an object")
    body = _body(receipt)
    receipt_id = _derive_id(body)
    return {**body, "receipt_id": receipt_id, "receipt_sha256": _derive_hash(body, receipt_id)}


# --------------------------------------------------------------------------- #
# normalization
# --------------------------------------------------------------------------- #

def _normalize_requirements(value, where: str) -> list[dict]:
    if not isinstance(value, list):
        raise _fail(f"{where} must be an array of {{'req_id', 'status'}} records")
    if not value:
        raise _fail(f"{where} must not be empty; a delivery with no requirement record is undecided")
    seen: set[str] = set()
    normalized = []
    for index, entry in enumerate(value):
        entry_where = f"{where}[{index}]"
        if not isinstance(entry, dict):
            raise _fail(f"{entry_where} must be an object")
        req_id = _text(entry.get("req_id"), f"{entry_where}.req_id")
        status = entry.get("status")
        if status not in REQUIREMENT_STATUSES:
            raise _fail(
                f"{entry_where}.status must be one of {', '.join(REQUIREMENT_STATUSES)}; got {status!r}"
            )
        if req_id in seen:
            raise _fail(f"{entry_where}.req_id {req_id!r} is declared twice")
        seen.add(req_id)
        normalized.append({"req_id": req_id, "status": status})
    return sorted(normalized, key=lambda record: record["req_id"])


def _normalize_rollback(value, where: str) -> dict:
    if not isinstance(value, dict):
        raise _fail(f"{where} must be an object with 'backup_ref' and 'procedure'")
    return {
        "backup_ref": _text(value.get("backup_ref"), f"{where}.backup_ref"),
        "procedure": _text(value.get("procedure"), f"{where}.procedure"),
    }


def _normalize_readback(value, where: str) -> dict:
    if not isinstance(value, dict):
        raise _fail(f"{where} must be an object")
    return {
        "host_id": _text(value.get("host_id"), f"{where}.host_id"),
        "host_version": _text(value.get("host_version"), f"{where}.host_version"),
        "readback_sha256": _digest(value.get("readback_sha256"), f"{where}.readback_sha256"),
        "opened_at": _timestamp(value.get("opened_at"), f"{where}.opened_at"),
    }


def _readback_index(host_readback) -> dict[str, dict]:
    if host_readback is None:
        return {}
    if isinstance(host_readback, dict):
        entries = []
        for deliverable_id, record in host_readback.items():
            _text(deliverable_id, "host_readback key")
            if not isinstance(record, dict):
                raise _fail(f"host_readback[{deliverable_id!r}] must be an object")
            entries.append((deliverable_id, record))
    elif isinstance(host_readback, (list, tuple)):
        entries = []
        for index, record in enumerate(host_readback):
            if not isinstance(record, dict):
                raise _fail(f"host_readback[{index}] must be an object")
            entries.append((_text(record.get("deliverable_id"),
                                  f"host_readback[{index}].deliverable_id"), record))
    else:
        raise _fail("host_readback must be a mapping keyed by deliverable id, a list of records or None")
    index: dict[str, dict] = {}
    for deliverable_id, record in entries:
        if deliverable_id in index:
            raise _fail(f"host_readback declares deliverable {deliverable_id!r} more than once")
        index[deliverable_id] = _normalize_readback(record, f"host_readback[{deliverable_id!r}]")
    return index


def _provenance_digest(entry: dict, where: str) -> str:
    manifest = entry.get("provenance_manifest")
    digest = entry.get("provenance_sha256")
    if manifest is not None and digest is not None:
        raise _fail(
            f"{where} declares both provenance_manifest and provenance_sha256; the receipt records "
            "the structure digest, so supply exactly one"
        )
    if manifest is not None:
        if not isinstance(manifest, dict):
            raise _fail(f"{where}.provenance_manifest must be an object")
        validate_manifest(manifest)
        expected = manifest.get("design_lab", {}).get("deliverable_id")
        if expected != entry.get("deliverable_id"):
            raise _fail(
                f"{where}.provenance_manifest belongs to deliverable {expected!r}, not "
                f"{entry.get('deliverable_id')!r}"
            )
        return manifest_digest(manifest)
    if digest is not None:
        return _digest(digest, f"{where}.provenance_sha256")
    raise _fail(
        f"{where} needs a provenance_manifest (validated and digested here) or a provenance_sha256; "
        "a deliverable without provenance is not receiptable"
    )


# --------------------------------------------------------------------------- #
# build
# --------------------------------------------------------------------------- #

def build_receipt(delivery, *, host_readback=None) -> dict:
    """Build a deterministic DeliveryReceipt V2 for one job.

    ``delivery``::

        {"job_id": ..., "created_at": <optional ISO-8601>,
         "requirements": [{"req_id", "status"}],   # optional per-job default
         "rollback": {"backup_ref", "procedure"},  # optional per-job default
         "deliverables": [{"deliverable_id", "artifact_sha256", "byte_size", "editable",
                           "provenance_manifest" | "provenance_sha256",
                           "requirements"?, "rollback"?}]}

    ``host_readback`` is a mapping keyed by deliverable id (or a list of records
    carrying ``deliverable_id``) of ``{"host_id", "host_version",
    "readback_sha256", "opened_at"}``. A readback for an undeclared deliverable
    fails closed. Requirement and rollback records fall back to the per-job
    defaults when a deliverable does not state its own.

    ``axes.delivery`` is ``PASS`` only when every deliverable has a host readback
    and no requirement is ``FAIL``/``BLOCKED``; otherwise ``PARTIAL``.
    """
    if not isinstance(delivery, dict):
        raise _fail("delivery must be an object")
    job_id = _text(delivery.get("job_id"), "delivery.job_id")
    created_at = delivery.get("created_at")
    if created_at is not None:
        created_at = _timestamp(created_at, "delivery.created_at")
    default_requirements = delivery.get("requirements")
    default_rollback = delivery.get("rollback")
    entries = delivery.get("deliverables")
    if not isinstance(entries, list) or not entries:
        raise _fail("delivery.deliverables must be a nonempty array")

    readbacks = _readback_index(host_readback)
    deliverables = []
    for index, entry in enumerate(entries):
        where = f"delivery.deliverables[{index}]"
        if not isinstance(entry, dict):
            raise _fail(f"{where} must be an object")
        deliverable_id = _text(entry.get("deliverable_id"), f"{where}.deliverable_id")
        artifact = _digest(entry.get("artifact_sha256"), f"{where}.artifact_sha256")
        byte_size = _integer(entry.get("byte_size"), f"{where}.byte_size")
        editable = _boolean(entry.get("editable"), f"{where}.editable")
        requirements = entry.get("requirements", default_requirements)
        if requirements is None:
            raise _fail(
                f"{where} has no requirements and the delivery declares no default; requirement "
                "status must be stated by the caller"
            )
        rollback = entry.get("rollback", default_rollback)
        if rollback is None:
            raise _fail(
                f"{where} has no rollback record and the delivery declares no default; a delivery "
                "without a rollback reference is not receiptable"
            )
        readback = readbacks.pop(deliverable_id, None)
        deliverables.append({
            "deliverable_id": deliverable_id,
            "artifact_sha256": artifact,
            "byte_size": byte_size,
            "editable": editable,
            "host_readback": readback,
            "provenance": _provenance_digest(entry, where),
            "requirements": _normalize_requirements(requirements, f"{where}.requirements"),
            "rollback": _normalize_rollback(rollback, f"{where}.rollback"),
            "readback_matches_artifact": (None if readback is None
                                          else readback["readback_sha256"] == artifact),
        })
    if readbacks:
        raise _fail(
            "host_readback names deliverable(s) the delivery does not declare: "
            + ", ".join(sorted(readbacks))
        )
    deliverables.sort(key=lambda item: item["deliverable_id"])

    body = {
        "schemaVersion": SCHEMA_VERSION,
        "job_id": job_id,
        "deliverables": deliverables,
        "axes": {"delivery": _delivery_axis(deliverables)},
    }
    if created_at is not None:
        body["created_at"] = created_at
    receipt_id = _derive_id(body)
    receipt = {**body, "receipt_id": receipt_id}
    receipt["receipt_sha256"] = _derive_hash(body, receipt_id)
    return receipt


def _delivery_axis(deliverables) -> str:
    for entry in deliverables:
        if entry["host_readback"] is None:
            return "PARTIAL"
        for requirement in entry["requirements"]:
            if requirement["status"] in ("FAIL", "BLOCKED"):
                return "PARTIAL"
    return "PASS"


# --------------------------------------------------------------------------- #
# verify
# --------------------------------------------------------------------------- #

def _check_digests(receipt: dict) -> None:
    for index, entry in enumerate(receipt["deliverables"]):
        where = f"deliverables[{index}]"
        _digest(entry["artifact_sha256"], f"{where}.artifact_sha256")
        _digest(entry["provenance"], f"{where}.provenance")
        readback = entry["host_readback"]
        if readback is not None:
            _digest(readback["readback_sha256"], f"{where}.host_readback.readback_sha256")


def unsupported_claims(receipt) -> list[str]:
    """Everything this receipt does **not** prove, as explicit statements.

    Read this before quoting a receipt anywhere: a receipt is a delivery record,
    not an acceptance, not a signature and not proof that an artifact still exists.
    """
    if not isinstance(receipt, dict):
        raise _fail("receipt must be an object")
    deliverables = receipt.get("deliverables")
    if not isinstance(deliverables, list):
        raise _fail("receipt.deliverables must be an array")
    claims = [
        "the provenance digest records an unsigned C2PA-shaped structure "
        f"({SIGNING_STATUS}); no signature, no signing certificate and no trusted timestamp exist",
        "requirement statuses are caller-declared and are not independently verified by this receipt",
        "byte_size and the editable flag are caller-declared values, not read back from the artifact",
        "this receipt does not prove the artifact still exists, nor that its bytes are unchanged "
        "since the receipt was written",
        "no independent (E4) human acceptance is recorded, and no rollback has been executed: the "
        "rollback record is a plan, not a performed restore",
        "no E2+ host/runtime result is claimed anywhere in this receipt",
    ]
    for entry in deliverables:
        deliverable_id = entry.get("deliverable_id")
        if entry.get("host_readback") is None:
            claims.append(
                f"deliverable {deliverable_id!r}: no host readback was recorded, so opening, editing "
                "and re-saving it in a host is NOT proven"
            )
        elif entry.get("readback_matches_artifact") is False:
            claims.append(
                f"deliverable {deliverable_id!r}: the host readback digest differs from the artifact "
                "digest, so a byte-identical host round trip is NOT proven"
            )
        for requirement in entry.get("requirements", []):
            if requirement.get("status") in ("FAIL", "BLOCKED"):
                claims.append(
                    f"deliverable {deliverable_id!r}: requirement {requirement.get('req_id')!r} is "
                    f"{requirement.get('status')}"
                )
    if receipt.get("axes", {}).get("delivery") == "PARTIAL":
        claims.append(
            "axes.delivery is PARTIAL: at least one deliverable lacks a host readback or carries a "
            "failing/blocked requirement"
        )
    return claims


def verify_receipt(receipt) -> dict:
    """Recompute the receipt hash and refuse any claim the evidence does not support.

    Raises :class:`InteropError` when the receipt is structurally invalid, when a
    digest is not a nonzero ``sha256:`` value, when the receipt identity does not
    match its canonical body, or when ``axes.delivery`` claims ``PASS`` without a
    host readback for every deliverable.
    """
    if not isinstance(receipt, dict):
        raise _fail("receipt must be an object")
    problems = _schema_errors(receipt)
    if problems:
        raise InteropError(f"receipt violates {SCHEMA_PATH.name}: " + "; ".join(problems))

    expected_id = _derive_id(_body(receipt))
    if receipt["receipt_id"] != expected_id:
        raise _fail(
            f"receipt_id {receipt['receipt_id']!r} does not match the canonical body (expected "
            f"{expected_id!r}); the receipt was modified after it was built"
        )
    expected_hash = _derive_hash(_body(receipt), receipt["receipt_id"])
    if receipt["receipt_sha256"] != expected_hash:
        raise _fail(
            f"receipt_sha256 mismatch: recorded {receipt['receipt_sha256']!r}, recomputed "
            f"{expected_hash!r}"
        )
    _check_digests(receipt)

    axis = receipt["axes"]["delivery"]
    if axis not in DELIVERY_AXES:
        raise _fail(f"axes.delivery must be one of {', '.join(DELIVERY_AXES)}; got {axis!r}")
    derived = _delivery_axis(receipt["deliverables"])
    if axis != derived:
        raise _fail(
            f"axes.delivery claims {axis!r} but the recorded evidence supports {derived!r} "
            "(a receipt without a host readback for every deliverable must not claim PASS)"
        )
    for index, entry in enumerate(receipt["deliverables"]):
        expected_match = (None if entry["host_readback"] is None
                          else entry["host_readback"]["readback_sha256"] == entry["artifact_sha256"])
        if entry["readback_matches_artifact"] is not expected_match:
            raise _fail(
                f"deliverables[{index}].readback_matches_artifact is {entry['readback_matches_artifact']!r} "
                f"but the recorded digests imply {expected_match!r}"
            )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "schema_path": SCHEMA_PATH.relative_to(PROJECT_ROOT).as_posix(),
        "receipt_id": receipt["receipt_id"],
        "receipt_sha256": receipt["receipt_sha256"],
        "job_id": receipt["job_id"],
        "deliverable_count": len(receipt["deliverables"]),
        "readback_count": sum(1 for entry in receipt["deliverables"]
                              if entry["host_readback"] is not None),
        "axes": dict(receipt["axes"]),
        "verified": True,
        "unsupported_claims": unsupported_claims(receipt),
    }


# --------------------------------------------------------------------------- #
# serialization
# --------------------------------------------------------------------------- #

def dumps(receipt) -> str:
    """Serialize a receipt as canonical JSON; ``loads`` reproduces the same hash."""
    if not isinstance(receipt, dict):
        raise _fail("receipt must be an object")
    try:
        return json.dumps(receipt, sort_keys=True, ensure_ascii=False,
                          separators=(",", ":"), allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise _fail(f"receipt is not canonical JSON: {exc}") from exc


def loads(text) -> dict:
    """Parse and verify a serialized receipt; the hash must survive the round trip."""
    if not isinstance(text, str) or not text.strip():
        raise _fail("serialized receipt must be a nonempty string")
    try:
        receipt = json.loads(text)
    except json.JSONDecodeError as exc:
        raise _fail(f"serialized receipt is not valid JSON: {exc}") from exc
    verify_receipt(receipt)
    if dumps(receipt) != text:
        raise _fail(
            "serialized receipt is not in canonical form; re-serialize with dumps() before signing "
            "or comparing hashes"
        )
    return receipt
