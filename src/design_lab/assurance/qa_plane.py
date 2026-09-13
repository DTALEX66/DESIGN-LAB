# SPDX-License-Identifier: MIT
"""DL-P1-170 QA plane split: deterministic, model-assisted and human assurance.

This module is the QA plane of DESIGN-LAB. It does **not** replace the existing
quality gate (``verify_quality_gate``, ``verify_production_preflight``,
``packages/capabilities/quality/**``, ``design-lab/schemas/quality-gate.schema.json``);
it separates that work into three explicitly non-interchangeable planes and
fixes the evidence ceiling of each one, so a deterministic check, a model
recommendation and a human verdict can never be confused:

* ``DETERMINISTIC`` -- reproducible rules, evidence ceiling E1/E2, ``can_block``.
* ``MODEL_ASSISTED`` -- providers and expert-agent critique, ceiling E2/E3.
  It may only produce a ``recommendation``: it can never carry a ``verdict`` and
  it may not block, because nothing automated may veto as if it were a person.
* ``HUMAN`` -- the Human Gate (professional jury, DL-QLT-002), ceiling E4,
  ``can_block``, and the only plane allowed to carry a ``verdict``.

``QA_PLANES`` maps the layer ids declared in
``packages/capabilities/quality/pipeline-layers.json`` onto those three planes,
and :func:`check_plane_inventory` refuses an inventory that leaves a declared
pipeline layer unclaimed, claims an unknown layer or claims one layer twice, so
the two documents cannot drift silently.

Boundary: this module is structural validation and aggregation only. It never
runs a check, calls a provider, reads an artifact, writes a record or records a
human decision; :func:`aggregate` only reports which plane still owes one.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
import json
from typing import Mapping

from ..runtime.paths import PROJECT_ROOT
from . import AssuranceError, require_digest, require_text

QA_SCHEMA_PATH = PROJECT_ROOT / "design-lab/schemas/assurance-qa-layer.schema.json"
PIPELINE_LAYERS_PATH = PROJECT_ROOT / "packages/capabilities/quality/pipeline-layers.json"

KIND_DETERMINISTIC = "DETERMINISTIC"
KIND_MODEL_ASSISTED = "MODEL_ASSISTED"
KIND_HUMAN = "HUMAN"

PLANE_KINDS = (KIND_DETERMINISTIC, KIND_MODEL_ASSISTED, KIND_HUMAN)
OUTCOMES = ("PASS", "FAIL", "INCONCLUSIVE", "NOT_RUN")
SEVERITIES = ("BLOCKER", "MAJOR", "MINOR", "INFO")
EVIDENCE_LEVELS = ("E0", "E1", "E2", "E3", "E4", "E5")
FINDING_VERDICTS = ("ACCEPT", "REVISE", "REJECT")
GATES = ("BLOCKED", "NEEDS_HUMAN_VERDICT", "PASS")

SUMMARY_VERSION = "design-lab/assurance-qa-summary/v1"
INVENTORY_VERSION = "design-lab/assurance-qa-layer/v1"


@dataclass(frozen=True)
class QaLayer:
    """One assurance plane. ``evidence_ceiling`` lists the levels its findings may claim."""

    layer_id: str
    kind: str
    evidence_ceiling: tuple
    owner: str
    description: str
    can_block: bool
    pipeline_layers: tuple = ()

    def as_dict(self) -> dict:
        return {
            "layer_id": self.layer_id,
            "kind": self.kind,
            "evidence_ceiling": list(self.evidence_ceiling),
            "owner": self.owner,
            "description": self.description,
            "can_block": self.can_block,
            "pipeline_layers": list(self.pipeline_layers),
        }


QA_PLANES = (
    QaLayer(
        layer_id="qa-deterministic",
        kind=KIND_DETERMINISTIC,
        evidence_ceiling=("E1", "E2"),
        owner="design-lab deterministic gates",
        description=(
            "Reproducible rules (preflight, structural and anti-slop checks) whose result "
            "another run must be able to repeat from the same artifact digest. Fail closed."
        ),
        can_block=True,
        pipeline_layers=("deterministic",),
    ),
    QaLayer(
        layer_id="qa-model-assisted",
        kind=KIND_MODEL_ASSISTED,
        evidence_ceiling=("E2", "E3"),
        owner="design-lab providers and expert-agent critique",
        description=(
            "Provider scoring (aesthetic/vision) and expert-agent critique. Advisory only: "
            "an automated plane may recommend and escalate, never veto and never sign."
        ),
        can_block=False,
        pipeline_layers=("visual-model", "expert-agent"),
    ),
    QaLayer(
        layer_id="qa-human",
        kind=KIND_HUMAN,
        evidence_ceiling=("E4",),
        owner="Human Gate (professional jury, DL-QLT-002)",
        description=(
            "Independent human judgement on the exact artifact digest. The only plane that "
            "may carry a verdict; a human rejection fails the whole artifact."
        ),
        can_block=True,
        pipeline_layers=("human-feedback",),
    ),
)


@dataclass(frozen=True)
class QaFinding:
    """One plane's observation about one subject. Not a gate decision by itself."""

    finding_id: str
    layer_id: str
    check_id: str
    subject_ref: str
    outcome: str
    severity: str
    evidence: Mapping = field(default_factory=dict)
    recommendation: str | None = None
    verdict: str | None = None

    def __post_init__(self):
        if isinstance(self.evidence, Mapping):
            object.__setattr__(self, "evidence", dict(self.evidence))

    def as_dict(self) -> dict:
        return {
            "finding_id": self.finding_id,
            "layer_id": self.layer_id,
            "check_id": self.check_id,
            "subject_ref": self.subject_ref,
            "outcome": self.outcome,
            "severity": self.severity,
            "evidence": dict(self.evidence) if isinstance(self.evidence, Mapping) else self.evidence,
            "recommendation": self.recommendation,
            "verdict": self.verdict,
        }


@lru_cache(maxsize=1)
def qa_schema() -> dict:
    return json.loads(QA_SCHEMA_PATH.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def pipeline_layer_ids() -> tuple:
    """Layer ids declared by the existing quality pipeline document."""
    try:
        document = json.loads(PIPELINE_LAYERS_PATH.read_text(encoding="utf-8"))
        layers = document["layers"]
        return tuple(layer["id"] for layer in layers)
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
        raise AssuranceError(f"quality pipeline layer inventory is unreadable: {exc}") from exc


def plane_for(layer_id: str) -> QaLayer:
    """Resolve a declared plane, or fail closed. Undeclared planes do not exist."""
    for layer in QA_PLANES:
        if layer.layer_id == layer_id:
            return layer
    raise AssuranceError(
        f"unknown QA layer {layer_id!r}; a finding must belong to a declared plane "
        f"({', '.join(layer.layer_id for layer in QA_PLANES)})"
    )


def check_plane_inventory(planes: tuple = QA_PLANES) -> tuple:
    """Drift guard between ``QA_PLANES`` and ``pipeline-layers.json``.

    Returns the declared pipeline layer ids and refuses an inventory that is not
    an exact, duplicate-free cover of them.
    """
    declared = set(pipeline_layer_ids())
    claimed: dict = {}
    for layer in planes:
        validate_layer(layer)
        if not layer.pipeline_layers:
            raise AssuranceError(f"QA layer {layer.layer_id!r} claims no pipeline layer")
        for name in layer.pipeline_layers:
            if name not in declared:
                raise AssuranceError(
                    f"QA layer {layer.layer_id!r} claims unknown pipeline layer {name!r}; "
                    f"declared: {', '.join(sorted(declared))}"
                )
            if name in claimed:
                raise AssuranceError(
                    f"pipeline layer {name!r} is claimed by both {claimed[name]!r} and "
                    f"{layer.layer_id!r}"
                )
            claimed[name] = layer.layer_id
    unclaimed = sorted(declared - set(claimed))
    if unclaimed:
        raise AssuranceError(
            f"pipeline layer(s) {', '.join(unclaimed)} are not mapped onto any QA plane; "
            "the QA plane split and the quality pipeline must not drift"
        )
    if set(layer.kind for layer in planes) != set(PLANE_KINDS):
        raise AssuranceError(
            "the QA plane inventory must declare exactly the three plane kinds "
            f"{', '.join(PLANE_KINDS)}"
        )
    return tuple(sorted(declared))


def validate_layer(layer) -> QaLayer:
    if not isinstance(layer, QaLayer):
        raise AssuranceError(f"a QA layer must be a QaLayer; got {type(layer).__name__}")
    require_text(layer.layer_id, "layer_id")
    if layer.kind not in PLANE_KINDS:
        raise AssuranceError(f"QA layer {layer.layer_id!r} has unknown kind {layer.kind!r}")
    ceilings = tuple(layer.evidence_ceiling)
    if not ceilings or any(level not in EVIDENCE_LEVELS for level in ceilings):
        raise AssuranceError(
            f"QA layer {layer.layer_id!r} must declare an evidence ceiling drawn from "
            f"{', '.join(EVIDENCE_LEVELS)}"
        )
    expected = {
        KIND_DETERMINISTIC: ("E1", "E2"),
        KIND_MODEL_ASSISTED: ("E2", "E3"),
        KIND_HUMAN: ("E4",),
    }[layer.kind]
    if ceilings != expected:
        raise AssuranceError(
            f"QA layer {layer.layer_id!r} of kind {layer.kind} must have evidence ceiling "
            f"{'/'.join(expected)}; got {'/'.join(ceilings)}"
        )
    if layer.kind == KIND_MODEL_ASSISTED and layer.can_block:
        raise AssuranceError(
            f"QA layer {layer.layer_id!r} is model-assisted and may not block; an automated "
            "plane produces a recommendation, never a veto"
        )
    require_text(layer.owner, "owner")
    require_text(layer.description, "description")
    if not isinstance(layer.can_block, bool):
        raise AssuranceError(f"QA layer {layer.layer_id!r} can_block must be a boolean")
    return layer


def validate_finding(finding) -> QaFinding:
    """Enforce the finding contract, including the plane it claims to come from."""
    if not isinstance(finding, QaFinding):
        raise AssuranceError(f"a QA finding must be a QaFinding; got {type(finding).__name__}")
    layer = validate_layer(plane_for(finding.layer_id))
    require_text(finding.finding_id, "finding_id")
    require_text(finding.check_id, "check_id")
    require_text(finding.subject_ref, "subject_ref")
    if finding.outcome not in OUTCOMES:
        raise AssuranceError(
            f"finding {finding.finding_id!r} has unknown outcome {finding.outcome!r}; "
            f"expected one of {', '.join(OUTCOMES)}"
        )
    if finding.severity not in SEVERITIES:
        raise AssuranceError(
            f"finding {finding.finding_id!r} has unknown severity {finding.severity!r}; "
            f"expected one of {', '.join(SEVERITIES)}"
        )
    if finding.evidence is not None and not isinstance(finding.evidence, Mapping):
        raise AssuranceError(
            f"finding {finding.finding_id!r} evidence must be an object; "
            f"got {type(finding.evidence).__name__}"
        )
    evidence = dict(finding.evidence or {})

    # A claimed result is only a result when it is bound to an artifact digest.
    if finding.outcome in ("PASS", "FAIL"):
        digest = evidence.get("artifact_sha256")
        if digest is None:
            raise AssuranceError(
                f"finding {finding.finding_id!r} reports {finding.outcome} without an "
                "artifact_sha256 in evidence; a result not bound to an artifact is not evidence"
            )
        require_digest(digest, f"finding {finding.finding_id!r} evidence.artifact_sha256")
    elif "artifact_sha256" in evidence:
        require_digest(
            evidence["artifact_sha256"],
            f"finding {finding.finding_id!r} evidence.artifact_sha256",
        )

    level = evidence.get("evidence_level")
    if level is not None:
        if level not in EVIDENCE_LEVELS:
            raise AssuranceError(
                f"finding {finding.finding_id!r} claims unknown evidence level {level!r}"
            )
        if level not in layer.evidence_ceiling:
            raise AssuranceError(
                f"finding {finding.finding_id!r} in plane {layer.layer_id!r} claims evidence "
                f"level {level} above its ceiling {'/'.join(layer.evidence_ceiling)}"
            )

    if finding.severity == "BLOCKER" and not layer.can_block:
        raise AssuranceError(
            f"finding {finding.finding_id!r} is severity BLOCKER in plane {layer.layer_id!r}, "
            "which may not block; only a plane with can_block may raise a blocker"
        )

    # Plane separation: only a human plane may express a verdict, only an
    # automated plane may express a recommendation, and neither may borrow the
    # other's authority.
    if finding.verdict is not None:
        if layer.kind != KIND_HUMAN:
            raise AssuranceError(
                f"finding {finding.finding_id!r} carries a verdict in plane {layer.layer_id!r} "
                f"of kind {layer.kind}; a verdict is only permitted in a HUMAN plane"
            )
        if finding.verdict not in FINDING_VERDICTS:
            raise AssuranceError(
                f"finding {finding.finding_id!r} has unknown verdict {finding.verdict!r}; "
                f"expected one of {', '.join(FINDING_VERDICTS)}"
            )
        if finding.outcome not in ("PASS", "FAIL"):
            raise AssuranceError(
                f"finding {finding.finding_id!r} carries a verdict with outcome "
                f"{finding.outcome}; a verdict settles a PASS or FAIL, not an open check"
            )
    if finding.recommendation is not None:
        require_text(finding.recommendation, f"finding {finding.finding_id!r} recommendation")
        if layer.kind == KIND_DETERMINISTIC:
            raise AssuranceError(
                f"finding {finding.finding_id!r} is deterministic and carries a recommendation; "
                "a deterministic plane states an outcome, and a recommendation here would "
                "masquerade as judgement it does not have"
            )
    if layer.kind == KIND_MODEL_ASSISTED and finding.recommendation is None:
        raise AssuranceError(
            f"finding {finding.finding_id!r} is model-assisted without a recommendation; an "
            "automated plane may only recommend, so the recommendation is the whole finding"
        )
    return finding


def qa_layer_document(findings=()) -> dict:
    """The declared plane inventory (optionally with findings) as a schema-checked document."""
    document = {
        "schemaVersion": INVENTORY_VERSION,
        "planes": [validate_layer(layer).as_dict() for layer in QA_PLANES],
        "findings": [validate_finding(finding).as_dict() for finding in findings],
    }
    _check_schema(document)
    return document


def _check_schema(document: dict) -> None:
    from jsonschema import Draft202012Validator

    validator = Draft202012Validator(qa_schema())
    errors = sorted(validator.iter_errors(document), key=lambda error: list(error.path))
    if errors:
        first = errors[0]
        where = "/".join(str(part) for part in first.path)
        raise AssuranceError(
            f"assurance QA document violates assurance-qa-layer.schema.json"
            f"{('/' + where) if where else ''}: {first.message}"
        )


def _validated_sequence(findings) -> list:
    if findings is None or isinstance(findings, (str, bytes, Mapping)):
        raise AssuranceError("aggregate requires an iterable of QA findings")
    try:
        items = list(findings)
    except TypeError as exc:
        raise AssuranceError("aggregate requires an iterable of QA findings") from exc
    validated = [validate_finding(item) for item in items]
    ids = [item.finding_id for item in validated]
    duplicates = sorted({name for name in ids if ids.count(name) > 1})
    if duplicates:
        raise AssuranceError(
            f"duplicate finding_id in QA aggregate: {', '.join(duplicates)}"
        )
    return validated


def _counts(values, universe) -> dict:
    return {name: sum(1 for value in values if value == name) for name in universe}


def aggregate(findings) -> dict:
    """Plane-aware summary of validated findings.

    ``BLOCKED`` outranks everything: a hard blocker cannot be averaged or
    waived away by a human ACCEPT. ``PASS`` is impossible while any HUMAN plane
    has not produced a verdict on this subject.
    """
    validated = _validated_sequence(findings)
    by_layer = {layer.layer_id: [] for layer in QA_PLANES}
    for finding in validated:
        by_layer[finding.layer_id].append(finding)

    layer_summaries = {}
    for layer in QA_PLANES:
        items = by_layer[layer.layer_id]
        verdicts = [item.verdict for item in items if item.verdict is not None]
        layer_summaries[layer.layer_id] = {
            "layer_id": layer.layer_id,
            "kind": layer.kind,
            "can_block": layer.can_block,
            "evidence_ceiling": list(layer.evidence_ceiling),
            "finding_count": len(items),
            "outcomes": _counts([item.outcome for item in items], OUTCOMES),
            "severities": _counts([item.severity for item in items], SEVERITIES),
            "human_verdict": verdicts[0] if verdicts else None,
        }

    planes = {}
    for kind in PLANE_KINDS:
        layer_ids = [layer.layer_id for layer in QA_PLANES if layer.kind == kind]
        items = [item for layer_id in layer_ids for item in by_layer[layer_id]]
        verdicts = [item.verdict for item in items if item.verdict is not None]
        planes[kind] = {
            "layer_ids": layer_ids,
            "finding_count": len(items),
            "outcomes": _counts([item.outcome for item in items], OUTCOMES),
            "severities": _counts([item.severity for item in items], SEVERITIES),
            "human_verdict": verdicts[0] if verdicts else None,
            "blocking": [item.finding_id for item in items
                         if item.severity == "BLOCKER" and item.outcome != "PASS"],
        }

    blocking = [item for item in validated
                if item.severity == "BLOCKER" and item.outcome != "PASS"]
    human_layers = [layer.layer_id for layer in QA_PLANES if layer.kind == KIND_HUMAN]
    human_verdicts = {layer_id: layer_summaries[layer_id]["human_verdict"]
                      for layer_id in human_layers
                      if layer_summaries[layer_id]["human_verdict"] is not None}
    missing = [layer_id for layer_id in human_layers if layer_id not in human_verdicts]

    if blocking:
        gate = "BLOCKED"
    elif missing or not human_layers:
        gate = "NEEDS_HUMAN_VERDICT"
    else:
        gate = "PASS"

    summary = {
        "schemaVersion": SUMMARY_VERSION,
        "gate": gate,
        "planes": planes,
        "layers": layer_summaries,
        "blocking": [item.finding_id for item in blocking],
        "blocking_findings": [item.as_dict() for item in blocking],
        "human_verdicts": human_verdicts,
        "missing_human_verdicts": missing,
        "finding_count": len(validated),
        "explanation": "",
    }
    summary["explanation"] = explain_aggregate(summary)
    _check_schema(
        {"schemaVersion": INVENTORY_VERSION,
         "planes": [layer.as_dict() for layer in QA_PLANES],
         "summary": summary},
    )
    return summary


def explain_aggregate(summary) -> str:
    """The reason string behind an aggregate gate."""
    if not isinstance(summary, Mapping) or summary.get("gate") not in GATES:
        raise AssuranceError(
            "explain_aggregate requires an aggregate summary produced by aggregate()"
        )
    gate = summary["gate"]
    if gate == "BLOCKED":
        detail = ", ".join(
            f"{item['finding_id']} ({item['layer_id']}/{item['check_id']}"
            f"/{item['outcome']}/{item['severity']})"
            for item in summary.get("blocking_findings", ())
        )
        count = len(summary.get("blocking", ()))
        return (
            f"gate BLOCKED: {count} blocking finding(s) {detail}; a hard blocker is not "
            "waivable here, so no human verdict and no model score can clear it"
        )
    if gate == "NEEDS_HUMAN_VERDICT":
        missing = list(summary.get("missing_human_verdicts", ()))
        if not missing:
            return (
                "gate NEEDS_HUMAN_VERDICT: no HUMAN plane is declared, so PASS is "
                "structurally impossible; automation never signs a human gate"
            )
        layers = summary.get("layers", {})
        verdicts = [
            f"{layer_id}={layers.get(layer_id, {}).get('human_verdict')}"
            for layer_id in missing
        ]
        return (
            f"gate NEEDS_HUMAN_VERDICT: no blocking finding, but {len(missing)} HUMAN "
            f"plane(s) owe a verdict on this subject ({', '.join(missing)}; observed "
            f"{', '.join(verdicts)}); no automated plane may supply one"
        )
    verdicts = ", ".join(
        f"{layer_id}={verdict}" for layer_id, verdict in sorted(summary.get("human_verdicts", {}).items())
    )
    return (
        f"gate PASS: no blocking finding and every HUMAN plane produced a verdict on this "
        f"subject ({verdicts}); this is a plane-aware summary, not an acceptance record"
    )
