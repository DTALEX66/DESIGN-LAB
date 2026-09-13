# SPDX-License-Identifier: MIT
"""DL-P1-120: vector provider lifecycle and reconstruction bench scoring.

E1 STRUCTURAL: the provider is exercised only through its refusal paths (no
tracer is installed and none may be launched), and the bench is scored from
synthetic measured metrics, never from a real trace.
"""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

INPUT = "1" * 64
EXPECTED = "2" * 64
OTHER = "3" * 64


class VectorProviderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from design_lab.readiness import vector_provider

        cls.vector_provider = vector_provider

    def provider(self, **kwargs):
        return self.vector_provider.VectorProvider(**kwargs)

    def test_provider_conforms_to_the_provider_adapter_spi(self):
        from design_lab.adapters.spi import LIFECYCLE, ProviderAdapter

        provider = self.provider()
        self.assertIsInstance(provider, ProviderAdapter)
        self.assertEqual(provider.adapter_type, "provider")
        for step in LIFECYCLE:
            self.assertTrue(callable(getattr(provider, step)))
        self.assertEqual(provider.lifecycle(), LIFECYCLE)

    def test_no_capability_is_supported_and_execute_fails_closed(self):
        provider = self.provider(tracer_id="vtracer", tracer_path="tools/vtracer.exe")
        self.assertEqual(provider.supports_summary()["supported_capabilities"], [])
        self.assertTrue(all(value is False for value in provider.capability_matrix().values()))
        with self.assertRaises(self.vector_provider.ReadinessError) as caught:
            provider.execute({"input_sha256": INPUT})
        message = str(caught.exception)
        self.assertIn(self.vector_provider.NOT_EXECUTED, message)
        self.assertIn("no admitted vectorisation backend", message)

    def test_readback_fails_closed_and_never_reports_an_empty_success(self):
        with self.assertRaises(self.vector_provider.ReadinessError) as caught:
            self.provider().readback({})
        self.assertIn(self.vector_provider.NOT_EXECUTED, str(caught.exception))

    def test_probe_prepare_observe_and_rollback_claim_no_execution(self):
        provider = self.provider()
        probe = provider.probe({"input_sha256": INPUT})
        self.assertEqual(probe["status"], self.vector_provider.NOT_EXECUTED)
        self.assertFalse(probe["execution_attempted"])
        self.assertFalse(probe["process_spawned"])
        self.assertEqual(probe["supported_apis"], [])
        prepared = provider.prepare({"input_sha256": INPUT})
        self.assertFalse(prepared["prepared"])
        self.assertEqual(prepared["requested_input_sha256"], INPUT)
        self.assertEqual(provider.observe({})["artifacts"], [])
        self.assertFalse(provider.rollback({})["reverted"])

    def test_adapter_contract_declaration_is_structural_only(self):
        import json

        contract = self.provider().adapter_contract(evidence_refs=["design-lab/readiness/model-radar.json"])
        schema = json.loads((ROOT / "design-lab/schemas/adapter-contract.schema.json").read_text(encoding="utf-8"))
        from jsonschema import Draft202012Validator

        Draft202012Validator(schema).validate(contract)
        self.assertEqual(contract["status"], "structural")
        self.assertEqual(contract["mode"], "none")
        self.assertTrue(all(item["supported"] is False for item in contract["capabilities"]))
        self.assertEqual(contract["evidence"]["level"], "E1")

    def test_a_supported_declaration_is_refused_at_construction(self):
        api = self.vector_provider.VectorAPI("vector.trace.raster_to_svg", "external-tracer", True, "synthetic")
        with self.assertRaises(self.vector_provider.ReadinessError) as caught:
            self.vector_provider.VectorProvider(apis=[api])
        self.assertIn("may be declared supported", str(caught.exception))

    def test_bad_constructor_arguments_are_refused(self):
        with self.assertRaises(self.vector_provider.ReadinessError):
            self.vector_provider.VectorProvider(tracer_id="")
        with self.assertRaises(self.vector_provider.ReadinessError):
            self.vector_provider.VectorProvider(apis=["not-an-api"])

    def test_declaration_document_matches_its_schema(self):
        import copy

        provider = self.provider(tracer_id="vtracer", tracer_path="tools/vtracer.exe")
        document = provider.declaration()
        self.vector_provider.validate_declaration(document)
        self.assertEqual(document["execution_state"], self.vector_provider.NOT_EXECUTED)
        self.assertEqual(document["evidence_level"], "E1")
        self.assertTrue(all(item["supported"] is False for item in document["capabilities"]))

        unsupported = copy.deepcopy(document)
        unsupported["capabilities"][0]["supported"] = True
        with self.assertRaises(self.vector_provider.ReadinessError) as caught:
            self.vector_provider.validate_declaration(unsupported)
        self.assertIn("requires an evidence_ref", str(caught.exception))

        protected = copy.deepcopy(document)
        protected["tracer_path"] = "E:/tools/vtracer.exe"
        with self.assertRaises(self.vector_provider.ReadinessError) as caught:
            self.vector_provider.validate_declaration(protected)
        self.assertIn("protected E: drive", str(caught.exception))


class BenchCaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from design_lab.readiness import reconstruction_bench

        cls.bench = reconstruction_bench

    def case(self, **overrides):
        payload = {"case_id": "case-1", "input_sha256": INPUT, "expected_svg_sha256": EXPECTED,
                   "max_paths": 100, "max_bytes": 1000, "min_ssim": 0.90, "notes": "synthetic"}
        payload.update(overrides)
        return self.bench.VectorBenchCase(**payload)

    def candidate(self, **overrides):
        payload = {"provider_id": "provider:vector/synthetic", "input_sha256": INPUT,
                   "output_sha256": EXPECTED,
                   "metrics": self.bench.VectorMetrics(paths=10, bytes=100, ssim=0.95, node_count=12),
                   "executed": True, "notes": "synthetic measurement"}
        payload.update(overrides)
        return self.bench.MeasuredCandidate(**payload)

    # -- scoring ----------------------------------------------------------
    def test_pass_requires_every_threshold_and_a_measured_ssim(self):
        result = self.bench.score_case(self.case(), self.candidate())
        self.assertEqual(result.outcome, "PASS")
        self.assertEqual(result.reason, self.bench.REASON_PASS)
        self.assertEqual(result.evidence["output_sha256"], "sha256:" + EXPECTED)

    def test_unmeasured_case_is_not_run_never_pass(self):
        result = self.bench.score_case(self.case(), self.candidate(metrics=self.bench.VectorMetrics()))
        self.assertEqual(result.outcome, "NOT_RUN")
        self.assertEqual(result.reason, self.bench.REASON_NOT_MEASURED)

    def test_missing_ssim_cannot_satisfy_a_min_ssim_threshold(self):
        metrics = self.bench.VectorMetrics(paths=10, bytes=100, ssim=None, node_count=12)
        result = self.bench.score_case(self.case(), self.candidate(metrics=metrics))
        self.assertEqual(result.outcome, "NOT_RUN")
        self.assertEqual(result.reason, self.bench.REASON_SSIM_UNMEASURED)

    def test_unscored_case_is_not_run_even_with_measurements(self):
        case = self.case(expected_svg_sha256=None, min_ssim=None)
        result = self.bench.score_case(case, self.candidate(output_sha256=OTHER))
        self.assertEqual(result.outcome, "NOT_RUN")
        self.assertEqual(result.reason, self.bench.REASON_UNSCORED)

    def test_missing_output_digest_fails(self):
        result = self.bench.score_case(self.case(), self.candidate(output_sha256=None))
        self.assertEqual(result.outcome, "FAIL")
        self.assertEqual(result.reason, self.bench.REASON_DIGEST_MISSING)

    def test_threshold_and_digest_violations_fail_with_distinct_reasons(self):
        too_many_paths = self.bench.VectorMetrics(paths=101, bytes=100, ssim=0.99, node_count=12)
        self.assertEqual(self.bench.score_case(self.case(), self.candidate(metrics=too_many_paths)).reason,
                         self.bench.REASON_MAX_PATHS)
        too_big = self.bench.VectorMetrics(paths=10, bytes=1001, ssim=0.99, node_count=12)
        self.assertEqual(self.bench.score_case(self.case(), self.candidate(metrics=too_big)).reason,
                         self.bench.REASON_MAX_BYTES)
        low_ssim = self.bench.VectorMetrics(paths=10, bytes=100, ssim=0.10, node_count=12)
        self.assertEqual(self.bench.score_case(self.case(), self.candidate(metrics=low_ssim)).reason,
                         self.bench.REASON_MIN_SSIM)
        self.assertEqual(self.bench.score_case(self.case(), self.candidate(output_sha256=OTHER)).reason,
                         self.bench.REASON_EXPECTED_MISMATCH)
        self.assertEqual(self.bench.score_case(self.case(), self.candidate(input_sha256=OTHER)).reason,
                         self.bench.REASON_INPUT_MISMATCH)

    def test_zero_and_malformed_digests_are_refused(self):
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.score_case(self.case(input_sha256="0" * 64), self.candidate())
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.score_case(self.case(), self.candidate(output_sha256="not-a-digest"))
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.score_case(self.case(min_ssim=2.0), self.candidate())

    def test_measured_metrics_cannot_be_negative(self):
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.score_case(self.case(), self.candidate(metrics=self.bench.VectorMetrics(paths=-1)))

    # -- comparison -------------------------------------------------------
    def test_compare_providers_refuses_to_rank_unmeasured_providers(self):
        passing = self.bench.score_case(self.case(), self.candidate())
        unmeasured = self.bench.score_case(self.case(), self.candidate(
            provider_id="provider:vector/absent", metrics=self.bench.VectorMetrics()))
        table = self.bench.compare_providers({"provider:vector/synthetic": [passing],
                                              "provider:vector/absent": [unmeasured]})
        self.assertEqual([row["provider_id"] for row in table["ranked"]], ["provider:vector/synthetic"])
        self.assertEqual(table["ranked"][0]["rank"], 1)
        self.assertEqual([row["provider_id"] for row in table["refused"]], ["provider:vector/absent"])
        self.assertEqual(table["refused"][0]["refusal"], self.bench.REASON_NOT_MEASURED)

    def test_compare_providers_is_deterministic_and_rejects_mismatched_rows(self):
        first = self.bench.score_case(self.case(case_id="a"), self.candidate(provider_id="p1"))
        second = self.bench.score_case(self.case(case_id="b"), self.candidate(provider_id="p1"))
        third = self.bench.score_case(self.case(case_id="a"), self.candidate(provider_id="p2"))
        table = self.bench.compare_providers({"p2": [third], "p1": [second, first]})
        self.assertEqual([row["provider_id"] for row in table["ranked"]], ["p1", "p2"])
        self.assertEqual(table["ranked"][0]["case_outcomes"], {"a": "PASS", "b": "PASS"})
        with self.assertRaises(self.bench.ReadinessError) as caught:
            self.bench.compare_providers({"p1": [third]})
        self.assertIn("declares provider", str(caught.exception))
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.compare_providers({})

    # -- case set and report ----------------------------------------------
    def test_case_set_hash_is_order_independent(self):
        cases = self.bench.prepare_cases([
            {"case_id": "a", "input_sha256": INPUT, "min_ssim": 0.9},
            {"case_id": "b", "input_sha256": OTHER, "max_paths": 5},
        ])
        reversed_cases = list(reversed(cases))
        self.assertEqual(self.bench.case_set_hash(cases), self.bench.case_set_hash(reversed_cases))
        self.assertTrue(self.bench.case_set_hash(cases).startswith("sha256:"))
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.prepare_cases([{"case_id": "a", "input_sha256": INPUT},
                                      {"case_id": "a", "input_sha256": INPUT}])
        with self.assertRaises(self.bench.ReadinessError):
            self.bench.prepare_cases([])

    def test_report_states_that_nothing_executed(self):
        case = self.case()
        not_run = self.bench.score_case(case, self.candidate(metrics=self.bench.VectorMetrics()))
        report = self.bench.bench_report([case], [not_run])
        self.assertFalse(report["executed"])
        self.assertEqual(report["not_run"], ["case-1"])
        self.assertEqual(report["qualification"], "NOT_QUALIFIED_BY_HARNESS")
        self.assertTrue(any(self.bench.REASON_NOT_EXECUTED in blocker for blocker in report["blockers"]))
        self.assertEqual(report["case_set_hash"], self.bench.case_set_hash([case]))

    def test_report_with_no_results_is_still_explicitly_not_executed(self):
        report = self.bench.bench_report([self.case()], [])
        self.assertFalse(report["executed"])
        self.assertEqual(report["results"], {})
        self.assertEqual(report["ranking"], {"ranked": [], "refused": []})

    def test_report_refuses_results_for_undeclared_cases(self):
        case = self.case()
        foreign = self.bench.score_case(self.case(case_id="elsewhere"), self.candidate())
        with self.assertRaises(self.bench.ReadinessError) as caught:
            self.bench.bench_report([case], [foreign])
        self.assertIn("undeclared case", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
