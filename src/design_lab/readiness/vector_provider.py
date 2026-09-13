# SPDX-License-Identifier: MIT
"""DL-P1-120 (part 1): vectorisation provider adapter, declared but NOT executed.

Module boundary: this module declares the vectorisation capability surface and
implements the `ProviderAdapter` lifecycle from `design_lab.adapters.spi`
(`probe -> prepare -> execute -> observe -> readback -> rollback`) without
launching, spawning, importing, or downloading anything. There is no tracer
installed or admitted in this build, so:

  * every declared API has `supported = False`;
  * `execute()` fails closed with an explicit `NOT_EXECUTED_STRUCTURAL_ONLY`
    error naming the missing prerequisite;
  * `readback()` fails closed too, because there is no artifact to read back and
    an empty readback must never be reported as a success.

`probe()`/`prepare()`/`observe()`/`rollback()` report status only and never
claim execution. The paired harness `design_lab.readiness.reconstruction_bench`
measures; this adapter is what would be measured, and nothing here qualifies a
tracer. DL-P0-... style evidence for a tracer requires a separate live run that
this build deliberately does not perform.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from jsonschema import Draft202012Validator

from ..adapters.spi import LIFECYCLE, ProviderAdapter
from ..runtime.paths import PROJECT_ROOT
from . import ReadinessError

TASK_ID = "DL-P1-120"
ADAPTER_ID = "provider:vector/vectorize"
SCHEMA_VERSION = "design-lab/vector-provider-declaration/v1"
SCHEMA_PATH = PROJECT_ROOT / "design-lab/schemas/readiness-vector-provider.schema.json"
ADAPTER_VERSION = "0.1.0"

#: Distinguishing marker for a refused execution in a structural-only build.
NOT_EXECUTED = "NOT_EXECUTED_STRUCTURAL_ONLY"
#: Filesystem / process kinds the vector provider may eventually front.
BACKEND_KINDS = ("external-tracer", "in-repo-tracer", "manual-vector-native")

#: Declared capability names, in a fixed order so reports stay reproducible.
CAPABILITY_NAMES = (
    "vector.trace.raster_to_svg",
    "vector.trace.in_repo",
    "vector.native.manual_authoring",
    "vector.readback.svg_structure",
)


@dataclass(frozen=True)
class VectorAPI:
    """One declared vectorisation surface; `supported` is false unless admitted."""

    api_id: str
    kind: str
    supported: bool
    reason: str
    note: str = ""

    def as_declaration(self) -> dict:
        """Presentation for design-lab/schemas/adapter-contract.schema.json capabilities."""
        return {"name": self.api_id, "supported": self.supported, "note": self.note or self.reason}


def _default_apis() -> tuple:
    external = ("no external tracer binary is admitted in this build; "
                "design-lab/config/reconstruction-tools.json is the admission registry")
    in_repo = ("no in-repository tracer is implemented; the capability is declared only")
    manual = ("manual/vector-native authoring has no admitted tool in this build")
    readback = ("without an executed trace there is no SVG to read back")
    return (
        VectorAPI("vector.trace.raster_to_svg", "external-tracer", False, external,
                  "would front an external CLI tracer (for example vtracer) behind an alias"),
        VectorAPI("vector.trace.in_repo", "in-repo-tracer", False, in_repo,
                  "would front an in-repository tracer implementation"),
        VectorAPI("vector.native.manual_authoring", "manual-vector-native", False, manual,
                  "would front a host-native or manual vector workflow"),
        VectorAPI("vector.readback.svg_structure", "readback", False, readback,
                  "would re-parse the delivered SVG and compare structure, not bytes"),
    )


class VectorProvider(ProviderAdapter):
    """`ProviderAdapter`-shaped vectorisation provider; structural only.

    Construct with no arguments for the honest default (nothing admitted). A
    tracer may be named for documentation purposes via `tracer_id`/`tracer_path`,
    which changes no `supported` flag and unblocks no execution.
    """

    adapter_type = "provider"
    adapter_id = ADAPTER_ID
    version = ADAPTER_VERSION

    def __init__(self, *, tracer_id: str | None = None, tracer_path=None, apis=None):
        if tracer_id is not None and (not isinstance(tracer_id, str) or not tracer_id.strip()):
            raise ReadinessError("tracer_id must be a non-empty string or None")
        self.tracer_id = tracer_id
        self.tracer_path = None if tracer_path is None else Path(tracer_path).as_posix()
        self._apis = tuple(_default_apis() if apis is None else apis)
        for api in self._apis:
            if not isinstance(api, VectorAPI):
                raise ReadinessError("declared APIs must be VectorAPI instances")
            if api.kind not in BACKEND_KINDS and api.kind != "readback":
                raise ReadinessError(f"unknown vector backend kind: {api.kind!r}")
        if any(api.supported for api in self._apis):
            raise ReadinessError(
                "no vector backend may be declared supported by this structural build; "
                "admission requires live trace evidence")

    # -- declaration -----------------------------------------------------
    def declared_apis(self) -> list:
        return [api.as_declaration() for api in self._apis]

    def capability_matrix(self) -> dict:
        return {api.api_id: api.supported for api in self._apis}

    def lifecycle(self) -> tuple:
        return LIFECYCLE

    def adapter_contract(self, *, evidence_refs=None) -> dict:
        """Adapter-contract-shaped declaration at E1 STRUCTURAL.

        Never claims a runtime capability: `mode` is `none` and no declared
        capability is supported, which is the only honest value while no tracer
        is admitted.
        """
        return {
            "adapter_id": self.adapter_id,
            "tool": self.tracer_id or "unresolved",
            "capabilities": [
                {"name": name, "supported": False,
                 "note": "declared surface; no admitted backend in this build"}
                for name in CAPABILITY_NAMES
            ],
            "status": "structural",
            "mode": "none",
            "fallback": "manual vector authoring; also unavailable in this build",
            "evidence": {
                "level": "E1",
                "runtime_version": None,
                "task_ids": [TASK_ID],
                "artifact_paths": list(evidence_refs or []),
                "note": "structural declaration only; nothing was launched, traced, or read back",
            },
            "rollback": "no side effects: nothing is created, so nothing needs reverting",
        }

    def supports_summary(self) -> dict:
        return {
            "adapter_id": self.adapter_id,
            "adapter_version": self.version,
            "tracer_id": self.tracer_id,
            "tracer_path": self.tracer_path,
            "supported_capabilities": [api.api_id for api in self._apis if api.supported],
            "unsupported_capabilities": [api.api_id for api in self._apis if not api.supported],
            "execution_state": NOT_EXECUTED,
            "evidence_level": "E1",
        }

    def declaration(self) -> dict:
        """The structural declaration document validated by `validate_declaration`."""
        return {
            "schema_version": SCHEMA_VERSION,
            "task_id": TASK_ID,
            "adapter_id": self.adapter_id,
            "adapter_version": self.version,
            "adapter_type": self.adapter_type,
            "lifecycle": list(LIFECYCLE),
            "backend_kinds": sorted({api.kind for api in self._apis}),
            "tracer_id": self.tracer_id,
            "tracer_path": self.tracer_path,
            "capabilities": [
                {"api_id": api.api_id, "kind": api.kind, "declared": True,
                 "supported": api.supported, "reason": api.reason, "note": api.note,
                 "evidence_ref": None}
                for api in self._apis
            ],
            "execution_state": NOT_EXECUTED,
            "evidence_level": "E1",
        }

    # -- lifecycle -------------------------------------------------------
    def probe(self, ctx: dict) -> dict:
        """Structural probe: reports declared surfaces only; opens nothing."""
        if not isinstance(ctx, dict):
            raise ReadinessError("probe context must be a mapping")
        return {
            "adapter_id": self.adapter_id,
            "adapter_version": self.version,
            "status": NOT_EXECUTED,
            "execution_attempted": False,
            "process_spawned": False,
            "tracer_id": self.tracer_id,
            "tracer_path": self.tracer_path,
            "declared_apis": self.declared_apis(),
            "supported_apis": [],
            "note": "declared surface only; the existence of a tracer file is not a capability",
        }

    def prepare(self, ctx: dict) -> dict:
        if not isinstance(ctx, dict):
            raise ReadinessError("prepare context must be a mapping")
        return {
            "adapter_id": self.adapter_id,
            "prepared": False,
            "status": NOT_EXECUTED,
            "reason": "no admitted tracer backend; preparation would require an admitted binary and an input hash",
            "requested_input_sha256": ctx.get("input_sha256"),
        }

    def execute(self, envelope: dict) -> dict:
        """Always refuses: this build has no admitted tracer and runs nothing."""
        if not isinstance(envelope, dict):
            raise ReadinessError("execute envelope must be a mapping")
        input_sha256 = envelope.get("input_sha256")
        raise ReadinessError(
            f"{NOT_EXECUTED}: {self.adapter_id} has no admitted vectorisation backend "
            f"(tracer_id={self.tracer_id or 'none'}); nothing was launched and no vector output exists. "
            f"Missing: an admitted tracer binary registered in "
            f"design-lab/config/reconstruction-tools.json, a configured input "
            f"(input_sha256={input_sha256 or 'absent'}), and a live run with readback evidence"
        )

    def observe(self, ctx: dict) -> dict:
        if not isinstance(ctx, dict):
            raise ReadinessError("observe context must be a mapping")
        return {
            "adapter_id": self.adapter_id,
            "status": NOT_EXECUTED,
            "artifacts": [],
            "note": "nothing was executed, so there is nothing to observe",
        }

    def readback(self, ctx: dict) -> dict:
        """Refuses: reporting an empty readback as success would be a false pass."""
        if not isinstance(ctx, dict):
            raise ReadinessError("readback context must be a mapping")
        raise ReadinessError(
            f"{NOT_EXECUTED}: {self.adapter_id} has no executed artifact to read back; "
            "an absent readback is never a successful readback"
        )

    def rollback(self, ctx: dict) -> dict:
        return {
            "adapter_id": self.adapter_id,
            "status": NOT_EXECUTED,
            "reverted": False,
            "note": "no side effects were produced, so no rollback was needed or performed",
        }


def validate_declaration(document: dict, *, schema_path=None) -> dict:
    """Schema-validate a provider declaration and enforce the structural rules.

    Fail-closed rule added here: a capability may not be `supported` unless it
    carries an explicit `evidence_ref` to live trace evidence, which this build
    cannot produce, so a structural declaration is always all-false.
    """
    if not isinstance(document, dict):
        raise ReadinessError("vector provider declaration must be a JSON object")
    from .host_matrix import load_document

    schema = load_document(SCHEMA_PATH if schema_path is None else schema_path)
    errors = sorted(Draft202012Validator(schema).iter_errors(document),
                    key=lambda error: list(error.absolute_path))
    if errors:
        rendered = [f"{'/'.join(str(part) for part in error.absolute_path) or '<root>'}: {error.message}"
                    for error in errors]
        raise ReadinessError("vector provider declaration schema violation: " + "; ".join(rendered[:8]))
    for capability in document["capabilities"]:
        if capability["supported"] and not (capability.get("evidence_ref") or "").strip():
            raise ReadinessError(
                f"{capability['api_id']}: a supported vectorisation capability requires an evidence_ref to a "
                "live trace run; none exists in this build")
    if document["tracer_path"] and ":" in document["tracer_path"]:
        drive = document["tracer_path"].split(":", 1)[0]
        if drive.casefold() == "e":
            raise ReadinessError("the protected E: drive is not a vector tracer location")
    return document
