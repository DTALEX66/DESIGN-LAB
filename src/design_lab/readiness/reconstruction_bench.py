# SPDX-License-Identifier: MIT
"""DL-P1-120 (part 2): reconstruction/vectorisation bench harness (measures only).

Module boundary: this harness owns *deterministic scoring of already measured
metrics* and *reproducible reporting* of a case set. It is a measurer, not a
qualifier: it launches nothing, spawns no tracer, downloads nothing, and a `PASS`
from `score_case` qualifies no provider by itself. A provider becomes qualified
only through the live evidence chain owned elsewhere in the project.

Fail-closed rules added here (not present elsewhere in the repository):
  * a case is `PASS` only when every declared threshold is met *and* the
    candidate supplies a real measured `ssim` *and* a nonzero output digest;
  * a case with no measured metrics is `NOT_RUN` and can never become `PASS`;
  * a case with a declared expected SVG digest fails when the delivered digest
    differs, even if every size/shape threshold would have passed;
  * `compare_providers()` refuses to rank or order providers whose cases have no
    measurement, instead of ranking an all-zero row as if it were last place;
  * the report states `"executed": false` explicitly when nothing ran, and the
    case-set hash is the order-independent `request_hash` of the case set.

Docstring contract: this harness measures; it does not qualify a provider.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from ..runtime.attempt_contract import canonical_hash, request_hash
from . import ReadinessError

TASK_ID = "DL-P1-120"
SCHEMA_VERSION = "design-lab/reconstruction-bench-report/v1"

OUTCOMES = ("PASS", "FAIL", "NOT_RUN")#: Deterministic refusal/outcome reason codes.
REASON_PASS = "ALL_THRESHOLDS_MET"
REASON_UNSCORED = "NO_EXPECTED_DIGEST_DECLARED"
REASON_NOT_MEASURED = "NO_MEASURED_METRICS"
REASON_SSIM_UNMEASURED = "SSIM_NOT_MEASURED"
REASON_DIGEST_MISSING = "OUTPUT_DIGEST_MISSING"
REASON_INPUT_MISMATCH = "INPUT_DIGEST_MISMATCH"
REASON_EXPECTED_MISMATCH = "EXPECTED_DIGEST_MISMATCH"
REASON_MAX_PATHS = "MAX_PATHS_EXCEEDED"
REASON_MAX_BYTES = "MAX_BYTES_EXCEEDED"
REASON_MIN_SSIM = "MIN_SSIM_NOT_MET"
REASON_NOT_EXECUTED = "HARNESS_NOT_EXECUTED"
REASON_NO_CASE = "NO_CASE_DECLARED"


@dataclass(frozen=True)
class VectorBenchCase:
    """One scoring case. Thresholds left as `None` are simply not declared."""

    case_id: str
    input_sha256: str
    expected_svg_sha256: Optional[str] = None
    max_paths: Optional[int] = None
    max_bytes: Optional[int] = None
    min_ssim: Optional[float] = None
    notes: str = ""

    def as_request(self) -> dict:
        """Order-independent, canonical description of the case definition."""
        return {
            "case_id": self.case_id,
            "input_sha256": self.input_sha256,
            "expected_svg_sha256": self.expected_svg_sha256,
            "max_paths": self.max_paths,
            "max_bytes": self.max_bytes,
            "min_ssim": self.min_ssim,
        }

    def declared_thresholds(self) -> dict:
        return {key: value for key, value in (
            ("max_paths", self.max_paths), ("max_bytes", self.max_bytes), ("min_ssim", self.min_ssim))
            if value is not None}


@dataclass(frozen=True)
class VectorMetrics:
    """Measured metrics only. `None` means 'not measured', never zero."""

    paths: Optional[int] = None
    bytes: Optional[int] = None
    ssim: Optional[float] = None
    node_count: Optional[int] = None

    def as_dict(self) -> dict:
        return {"paths": self.paths, "bytes": self.bytes, "ssim": self.ssim, "node_count": self.node_count}


@dataclass(frozen=True)
class MeasuredCandidate:
    """What a caller (the live harness) measured for one case and one provider."""

    provider_id: str
    input_sha256: str
    output_sha256: Optional[str] = None
    metrics: VectorMetrics = field(default_factory=VectorMetrics)
    executed: bool = False
    notes: str = ""


@dataclass(frozen=True)
class VectorBenchResult:
    """The scored outcome for one case and one provider."""

    case_id: str
    provider_id: str
    outcome: str
    metrics: dict = field(default_factory=dict)
    evidence: dict = field(default_factory=dict)
    reason: str = ""

    def as_dict(self) -> dict:
        return {"case_id": self.case_id, "provider_id": self.provider_id, "outcome": self.outcome,
                "metrics": dict(self.metrics), "evidence": dict(self.evidence), "reason": self.reason}


def _digest(value, *, field_name: str) -> str:
    """Canonicalize a digest, reporting a ReadinessError instead of a bare ValueError."""
    try:
        return canonical_hash(value)
    except ValueError as exc:
        raise ReadinessError(f"{field_name}: {exc}") from exc


def _check_case(case: VectorBenchCase) -> None:
    if not isinstance(case, VectorBenchCase):
        raise ReadinessError("score_case requires a VectorBenchCase")
    if not isinstance(case.case_id, str) or not case.case_id.strip():
        raise ReadinessError("case_id must be a non-empty string")
    _digest(case.input_sha256, field_name=f"{case.case_id}.input_sha256")
    if case.expected_svg_sha256 is not None:
        _digest(case.expected_svg_sha256, field_name=f"{case.case_id}.expected_svg_sha256")
    for name, value in (("max_paths", case.max_paths), ("max_bytes", case.max_bytes)):
        if value is not None and (isinstance(value, bool) or not isinstance(value, int) or value <= 0):
            raise ReadinessError(f"{case.case_id}: {name} must be a positive integer or None")
    if case.min_ssim is not None:
        if isinstance(case.min_ssim, bool) or not isinstance(case.min_ssim, (int, float)):
            raise ReadinessError(f"{case.case_id}: min_ssim must be a number or None")
        if not 0.0 <= float(case.min_ssim) <= 1.0:
            raise ReadinessError(f"{case.case_id}: min_ssim must lie in [0, 1]")


def _check_metrics(case_id: str, metrics: VectorMetrics) -> None:
    for name in ("paths", "bytes", "node_count"):
        value = getattr(metrics, name)
        if value is not None and (isinstance(value, bool) or not isinstance(value, int) or value < 0):
            raise ReadinessError(f"{case_id}: measured {name} must be a non-negative integer or None")
    if metrics.ssim is not None:
        if isinstance(metrics.ssim, bool) or not isinstance(metrics.ssim, (int, float)):
            raise ReadinessError(f"{case_id}: measured ssim must be a number or None")
        if not 0.0 <= float(metrics.ssim) <= 1.0:
            raise ReadinessError(f"{case_id}: measured ssim must lie in [0, 1]")


def score_case(case: VectorBenchCase, candidate: MeasuredCandidate) -> VectorBenchResult:
    """Score one case deterministically from measured metrics only.

    `NOT_RUN` when no metrics were measured (never `PASS`); `FAIL` when a
    declared threshold or a declared digest is violated.
    """
    _check_case(case)
    if not isinstance(candidate, MeasuredCandidate):
        raise ReadinessError("score_case requires a MeasuredCandidate")
    if not isinstance(candidate.provider_id, str) or not candidate.provider_id.strip():
        raise ReadinessError("provider_id must be a non-empty string")
    _check_metrics(case.case_id, candidate.metrics)

    evidence = {
        "input_sha256": _digest(case.input_sha256, field_name="case.input_sha256"),
        "expected_svg_sha256": (_digest(case.expected_svg_sha256, field_name="case.expected_svg_sha256")
                                if case.expected_svg_sha256 is not None else None),
        "provider_input_sha256": (_digest(candidate.input_sha256, field_name="candidate.input_sha256")
                                 if candidate.input_sha256 else None),
        "output_sha256": (_digest(candidate.output_sha256, field_name="candidate.output_sha256")
                          if candidate.output_sha256 else None),
        "candidate_notes": candidate.notes,
    }
    base = {"case_id": case.case_id, "provider_id": candidate.provider_id,
            "metrics": candidate.metrics.as_dict(), "evidence": evidence}

    measured = [value for value in (candidate.metrics.paths, candidate.metrics.bytes,
                                    candidate.metrics.ssim, candidate.metrics.node_count)
                if value is not None]
    if not measured:
        return VectorBenchResult(outcome="NOT_RUN", reason=REASON_NOT_MEASURED, **base)

    if candidate.input_sha256 and _digest(candidate.input_sha256,
                                        field_name="candidate.input_sha256") != evidence["input_sha256"]:
        return VectorBenchResult(outcome="FAIL", reason=REASON_INPUT_MISMATCH, **base)
    if not candidate.output_sha256:
        return VectorBenchResult(outcome="FAIL", reason=REASON_DIGEST_MISSING, **base)
    if case.expected_svg_sha256 is not None and evidence["output_sha256"] != evidence["expected_svg_sha256"]:
        return VectorBenchResult(outcome="FAIL", reason=REASON_EXPECTED_MISMATCH, **base)
    if case.min_ssim is not None and candidate.metrics.ssim is None:
        # An unscored similarity threshold cannot be assumed to pass.
        return VectorBenchResult(outcome="NOT_RUN", reason=REASON_SSIM_UNMEASURED, **base)
    if case.max_paths is not None and (candidate.metrics.paths is None
                                       or candidate.metrics.paths > case.max_paths):
        return VectorBenchResult(outcome="FAIL", reason=REASON_MAX_PATHS, **base)
    if case.max_bytes is not None and (candidate.metrics.bytes is None
                                       or candidate.metrics.bytes > case.max_bytes):
        return VectorBenchResult(outcome="FAIL", reason=REASON_MAX_BYTES, **base)
    if case.min_ssim is not None and float(candidate.metrics.ssim) < float(case.min_ssim):
        return VectorBenchResult(outcome="FAIL", reason=REASON_MIN_SSIM, **base)
    if case.expected_svg_sha256 is None and case.min_ssim is None:
        # Nothing but size/shape was declared; the case is unscored, not passed.
        return VectorBenchResult(outcome="NOT_RUN", reason=REASON_UNSCORED, **base)
    return VectorBenchResult(outcome="PASS", reason=REASON_PASS, **base)


def _ordered_results(results_by_provider: dict) -> list:
    """Deterministic (provider_id, case_id) ordering; refuses bad shapes."""
    if not isinstance(results_by_provider, dict) or not results_by_provider:
        raise ReadinessError("compare_providers requires a non-empty mapping of provider_id -> results")
    rows = []
    for provider_id, results in results_by_provider.items():
        if not isinstance(provider_id, str) or not provider_id.strip():
            raise ReadinessError("provider ids must be non-empty strings")
        if not isinstance(results, (list, tuple)) or not results:
            raise ReadinessError(f"{provider_id}: results must be a non-empty sequence")
        ordered = sorted(results, key=lambda result: result.case_id)
        cases = [result.case_id for result in ordered]
        if len(set(cases)) != len(cases):
            raise ReadinessError(f"{provider_id}: duplicate case_id in results")
        for result in ordered:
            if result.outcome not in OUTCOMES:
                raise ReadinessError(f"{provider_id}: unknown outcome {result.outcome!r}")
            if result.provider_id != provider_id:
                raise ReadinessError(
                    f"{provider_id}: result for {result.case_id} declares provider {result.provider_id!r}")
        rows.append((provider_id, ordered))
    return sorted(rows, key=lambda row: row[0])


def compare_providers(results_by_provider: dict) -> dict:
    """Deterministic ranking table; providers with no measurement are refused.

    Returns `{"ranked": [...], "refused": [...]}`. A refused provider is one
    whose cases are all `NOT_RUN`: it is not ranked at all, because ranking an
    unmeasured row would read as "last place" rather than "no measurement".
    """
    rows = _ordered_results(results_by_provider)
    ranked = []
    refused = []
    for provider_id, results in rows:
        outcomes = [result.outcome for result in results]
        not_run = outcomes.count("NOT_RUN")
        passes = outcomes.count("PASS")
        fails = outcomes.count("FAIL")
        row = {"provider_id": provider_id, "cases": len(outcomes), "pass": passes, "fail": fails,
               "not_run": not_run, "pass_rate": (passes / len(outcomes)) if outcomes else 0.0,
               "case_outcomes": {result.case_id: result.outcome for result in results}}
        if not_run == len(outcomes):
            row["refusal"] = REASON_NOT_MEASURED
            refused.append(row)
        else:
            ranked.append(row)
    ranked.sort(key=lambda row: (-row["pass_rate"], row["not_run"], row["provider_id"]))
    for position, row in enumerate(ranked, start=1):
        row["rank"] = position
    return {"ranked": ranked, "refused": refused}


def prepare_cases(definitions) -> list:
    """Build and validate an ordered case set from mappings (fixtures, not runs)."""
    if not isinstance(definitions, (list, tuple)) or not definitions:
        raise ReadinessError("a bench case set must be a non-empty sequence")
    cases = []
    for definition in definitions:
        if not isinstance(definition, dict):
            raise ReadinessError("each bench case definition must be a mapping")
        try:
            case = VectorBenchCase(**definition)
        except TypeError as exc:
            raise ReadinessError(f"invalid bench case definition: {exc}") from exc
        _check_case(case)
        cases.append(case)
    identifiers = [case.case_id for case in cases]
    if len(set(identifiers)) != len(identifiers):
        raise ReadinessError("duplicate case_id in the bench case set")
    return cases


def case_set_hash(cases) -> str:
    """Order-independent `request_hash` of the case definitions."""
    if not isinstance(cases, (list, tuple)) or not cases:
        raise ReadinessError("a bench case set must be a non-empty sequence")
    payload = sorted((case.as_request() for case in cases), key=lambda item: item["case_id"])
    return request_hash(payload)


def bench_report(cases, results) -> dict:
    """Reproducible report: case-set hash, per-case outcomes, explicit non-execution.

    `results` is a flat sequence of `VectorBenchResult` (any provider mix). The
    report is a measurement record; it qualifies no provider.
    """
    if not isinstance(cases, (list, tuple)) or not cases:
        raise ReadinessError("bench_report requires a non-empty case sequence")
    for case in cases:
        _check_case(case)
    declared = {case.case_id for case in cases}
    results = list(results or [])
    for result in results:
        if result.case_id not in declared:
            raise ReadinessError(f"result for undeclared case: {result.case_id}")
        if result.outcome not in OUTCOMES:
            raise ReadinessError(f"unknown outcome {result.outcome!r}")

    by_provider = {}
    for result in sorted(results, key=lambda item: (item.provider_id, item.case_id)):
        by_provider.setdefault(result.provider_id, []).append(result)
    executed = any(result.outcome in ("PASS", "FAIL") for result in results)

    return {
        "schema_version": SCHEMA_VERSION,
        "task_id": TASK_ID,
        "executed": executed,
        "case_count": len(cases),
        "case_set_hash": case_set_hash(cases),
        "thresholds": {case.case_id: case.declared_thresholds() for case in sorted(
            cases, key=lambda item: item.case_id)},
        "expected_digests": {case.case_id: case.expected_svg_sha256 for case in sorted(
            cases, key=lambda item: item.case_id)},
        "results": {provider_id: [result.as_dict() for result in provider_results]
                    for provider_id, provider_results in sorted(by_provider.items())},
        "ranking": compare_providers(by_provider) if by_provider else {"ranked": [], "refused": []},
        "not_run": sorted(result.case_id for result in results if result.outcome == "NOT_RUN"),
        "blockers": ([REASON_NOT_EXECUTED + ": no provider executed any case; "
                      "this report records a case set, not a trace run"]
                     if not executed else []),
        "qualification": "NOT_QUALIFIED_BY_HARNESS",
    }
