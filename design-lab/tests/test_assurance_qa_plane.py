# SPDX-License-Identifier: MIT
"""DL-P1-170 QA plane split: plane inventory, finding rules and aggregate gate."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

import jsonschema  # noqa: E402

from design_lab.assurance import AssuranceError  # noqa: E402
from design_lab.assurance import qa_plane  # noqa: E402

SHA = "sha256:" + "a" * 64
SHA_OTHER = "sha256:" + "b" * 64
SUBJECT = "design-lab/job/job-1/deliverable/poster"


def finding(**overrides):
    base = {
        "finding_id": "f-1",
        "layer_id": "qa-deterministic",
        "check_id": "check_anti_slop",
        "subject_ref": SUBJECT,
        "outcome": "PASS",
        "severity": "MAJOR",
        "evidence": {"artifact_sha256": SHA},
    }
    base.update(overrides)
    return qa_plane.QaFinding(**base)


def model_finding(**overrides):
    base = {
        "finding_id": "m-1",
        "layer_id": "qa-model-assisted",
        "check_id": "provider:aesthetic/laion",
        "subject_ref": SUBJECT,
        "outcome": "PASS",
        "severity": "MINOR",
        "evidence": {"artifact_sha256": SHA, "evidence_level": "E2"},
        "recommendation": "score 4.1 of 5; worth a human look at the material axis",
    }
    base.update(overrides)
    return qa_plane.QaFinding(**base)


def human_finding(**overrides):
    base = {
        "finding_id": "h-1",
        "layer_id": "qa-human",
        "check_id": "professional-jury/DL-QLT-002",
        "subject_ref": SUBJECT,
        "outcome": "PASS",
        "severity": "MAJOR",
        "evidence": {"artifact_sha256": SHA, "evidence_level": "E4"},
        "verdict": "ACCEPT",
    }
    base.update(overrides)
    return qa_plane.QaFinding(**base)


class QaPlaneInventoryTests(unittest.TestCase):
    def test_planes_cover_the_existing_quality_pipeline_exactly(self):
        declared = qa_plane.pipeline_layer_ids()
        self.assertEqual(
            ("deterministic", "visual-model", "expert-agent", "human-feedback"), declared
        )
        self.assertEqual(tuple(sorted(declared)), qa_plane.check_plane_inventory())

    def test_each_pipeline_layer_is_mapped_onto_exactly_one_plane(self):
        mapped = {}
        for layer in qa_plane.QA_PLANES:
            for name in layer.pipeline_layers:
                self.assertNotIn(name, mapped)
                mapped[name] = layer.layer_id
        self.assertEqual(mapped["deterministic"], "qa-deterministic")
        self.assertEqual(mapped["visual-model"], "qa-model-assisted")
        self.assertEqual(mapped["expert-agent"], "qa-model-assisted")
        self.assertEqual(mapped["human-feedback"], "qa-human")

    def test_plane_kinds_and_evidence_ceilings(self):
        ceilings = {layer.kind: layer.evidence_ceiling for layer in qa_plane.QA_PLANES}
        self.assertEqual(("E1", "E2"), ceilings["DETERMINISTIC"])
        self.assertEqual(("E2", "E3"), ceilings["MODEL_ASSISTED"])
        self.assertEqual(("E4",), ceilings["HUMAN"])
        self.assertFalse(qa_plane.plane_for("qa-model-assisted").can_block)
        self.assertTrue(qa_plane.plane_for("qa-deterministic").can_block)
        self.assertTrue(qa_plane.plane_for("qa-human").can_block)

    def test_unclaimed_pipeline_layer_is_refused(self):
        without_human = tuple(
            layer for layer in qa_plane.QA_PLANES if layer.layer_id != "qa-human"
        )
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.check_plane_inventory(planes=without_human)
        self.assertIn("human-feedback", str(caught.exception))

    def test_double_claim_is_refused(self):
        split = qa_plane.QA_PLANES + (
            qa_plane.QaLayer(
                layer_id="qa-extra",
                kind="MODEL_ASSISTED",
                evidence_ceiling=("E2", "E3"),
                owner="x",
                description="y",
                can_block=False,
                pipeline_layers=("visual-model",),
            ),
        )
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.check_plane_inventory(planes=split)
        self.assertIn("claimed by both", str(caught.exception))

    def test_unknown_pipeline_layer_is_refused(self):
        broken = tuple(
            qa_plane.QaLayer(**{**layer.__dict__, "pipeline_layers": ("no-such-layer",)})
            if layer.layer_id == "qa-human" else layer
            for layer in qa_plane.QA_PLANES
        )
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.check_plane_inventory(planes=broken)
        self.assertIn("unknown pipeline layer", str(caught.exception))

    def test_model_plane_may_not_block(self):
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_layer(qa_plane.QaLayer(
                layer_id="qa-model-assisted",
                kind="MODEL_ASSISTED",
                evidence_ceiling=("E2", "E3"),
                owner="x",
                description="y",
                can_block=True,
                pipeline_layers=("visual-model",),
            ))
        self.assertIn("may not block", str(caught.exception))

    def test_plane_document_matches_the_schema(self):
        document = qa_plane.qa_layer_document()
        jsonschema.validate(instance=document, schema=qa_plane.qa_schema())
        self.assertEqual(3, len(document["planes"]))

        # The ceiling is a schema-level guarantee too, not only a module rule.
        validator = jsonschema.Draft202012Validator(qa_plane.qa_schema())
        escalated = json.loads(json.dumps(document))
        escalated["planes"][1]["can_block"] = True
        self.assertTrue(list(validator.iter_errors(escalated)))
        escalated_ceiling = json.loads(json.dumps(document))
        escalated_ceiling["planes"][1]["evidence_ceiling"] = ["E2", "E3", "E4"]
        self.assertTrue(list(validator.iter_errors(escalated_ceiling)))


class QaFindingTests(unittest.TestCase):
    def test_pass_and_fail_need_a_nonzero_artifact_digest(self):
        candidate = finding()
        self.assertIs(candidate, qa_plane.validate_finding(candidate))
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(finding(evidence={}))
        self.assertIn("without an artifact_sha256", str(caught.exception))
        with self.assertRaises(AssuranceError) as zero:
            qa_plane.validate_finding(finding(evidence={"artifact_sha256": "sha256:" + "0" * 64}))
        self.assertIn("nonzero", str(zero.exception))
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding(finding(outcome="FAIL", evidence={"artifact_sha256": "nope"}))

    def test_an_unbound_result_is_not_evidence(self):
        document = finding(evidence={}).as_dict()
        validator = jsonschema.Draft202012Validator(qa_plane.qa_schema())
        errors = list(validator.iter_errors({
            "schemaVersion": "design-lab/assurance-qa-layer/v1",
            "planes": [layer.as_dict() for layer in qa_plane.QA_PLANES],
            "findings": [document],
        }))
        self.assertTrue(errors, "a PASS without artifact_sha256 must fail the schema too")

    def test_deterministic_plane_states_an_outcome_only(self):
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(finding(recommendation="looks fine, ship it"))
        self.assertIn("deterministic", str(caught.exception))
        with self.assertRaises(AssuranceError) as verdict:
            qa_plane.validate_finding(finding(outcome="FAIL", verdict="ACCEPT"))
        self.assertIn("only permitted in a HUMAN plane", str(verdict.exception))

    def test_model_assisted_plane_may_only_recommend(self):
        self.assertIsNotNone(qa_plane.validate_finding(model_finding()))
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(model_finding(recommendation=None))
        self.assertIn("may only recommend", str(caught.exception))
        with self.assertRaises(AssuranceError) as verdict:
            qa_plane.validate_finding(model_finding(verdict="ACCEPT"))
        self.assertIn("HUMAN plane", str(verdict.exception))

    def test_model_assisted_plane_cannot_claim_human_evidence(self):
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(model_finding(
                evidence={"artifact_sha256": SHA, "evidence_level": "E4"}))
        self.assertIn("above its ceiling", str(caught.exception))

    def test_blocker_requires_a_plane_that_can_block(self):
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(model_finding(severity="BLOCKER"))
        self.assertIn("may not block", str(caught.exception))
        blocking = finding(outcome="FAIL", severity="BLOCKER")
        self.assertIsNotNone(qa_plane.validate_finding(blocking))

    def test_human_verdict_must_settle_a_result(self):
        self.assertIsNotNone(qa_plane.validate_finding(human_finding()))
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(human_finding(outcome="INCONCLUSIVE"))
        self.assertIn("not an open check", str(caught.exception))
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding(human_finding(verdict="PASS"))

    def test_unknown_plane_and_identifiers_are_refused(self):
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.validate_finding(finding(layer_id="qa-made-up"))
        self.assertIn("unknown QA layer", str(caught.exception))
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding(finding(finding_id="  "))
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding(finding(outcome="MAYBE"))
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding(finding(severity="CRITICAL"))
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding({"finding_id": "f"})
        with self.assertRaises(AssuranceError):
            qa_plane.validate_finding(finding(evidence="sha256:abc"))


class QaAggregateTests(unittest.TestCase):
    def setUp(self):
        parent = ROOT / ".project-local/task-runtime/assurance-qa-plane-tests"
        parent.mkdir(parents=True, exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(temporary.cleanup)
        self.tmp = Path(temporary.name)

    def test_automated_findings_alone_never_reach_pass(self):
        summary = qa_plane.aggregate([finding(), model_finding()])
        self.assertEqual("NEEDS_HUMAN_VERDICT", summary["gate"])
        self.assertEqual([], summary["blocking"])
        self.assertEqual(["qa-human"], summary["missing_human_verdicts"])
        reason = qa_plane.explain_aggregate(summary)
        self.assertIn("NEEDS_HUMAN_VERDICT", reason)
        self.assertIn("no automated plane may supply one", reason)

    def test_empty_findings_fail_closed(self):
        summary = qa_plane.aggregate([])
        self.assertEqual("NEEDS_HUMAN_VERDICT", summary["gate"])

    def test_human_verdict_completes_the_gate(self):
        summary = qa_plane.aggregate([finding(), model_finding(), human_finding()])
        self.assertEqual("PASS", summary["gate"])
        self.assertEqual({"qa-human": "ACCEPT"}, summary["human_verdicts"])
        self.assertIn("gate PASS", qa_plane.explain_aggregate(summary))

    def test_a_human_pass_without_a_verdict_is_not_a_verdict(self):
        summary = qa_plane.aggregate([finding(), human_finding(verdict=None)])
        self.assertEqual("NEEDS_HUMAN_VERDICT", summary["gate"])

    def test_blocker_outranks_a_human_accept(self):
        blocked = finding(finding_id="f-blocker", outcome="FAIL", severity="BLOCKER")
        summary = qa_plane.aggregate([blocked, model_finding(), human_finding()])
        self.assertEqual("BLOCKED", summary["gate"])
        self.assertEqual(["f-blocker"], summary["blocking"])
        self.assertEqual("HUMAN", summary["layers"]["qa-human"]["kind"])
        self.assertEqual("ACCEPT", summary["planes"]["HUMAN"]["human_verdict"])
        reason = qa_plane.explain_aggregate(summary)
        self.assertIn("gate BLOCKED", reason)
        self.assertIn("f-blocker", reason)
        self.assertIn("not waivable here", reason)

    def test_a_blocker_that_did_not_run_still_blocks(self):
        pending = finding(finding_id="f-not-run", outcome="NOT_RUN", severity="BLOCKER")
        summary = qa_plane.aggregate([pending, human_finding()])
        self.assertEqual("BLOCKED", summary["gate"])

    def test_per_plane_counts(self):
        summary = qa_plane.aggregate([
            finding(finding_id="f-1"),
            finding(finding_id="f-2", outcome="INCONCLUSIVE", evidence={}),
            model_finding(),
            human_finding(),
        ])
        self.assertEqual(2, summary["planes"]["DETERMINISTIC"]["finding_count"])
        self.assertEqual(1, summary["planes"]["DETERMINISTIC"]["outcomes"]["PASS"])
        self.assertEqual(1, summary["planes"]["DETERMINISTIC"]["outcomes"]["INCONCLUSIVE"])
        self.assertEqual(1, summary["planes"]["MODEL_ASSISTED"]["finding_count"])
        self.assertEqual(4, summary["finding_count"])

    def test_summary_is_json_serializable_and_schema_valid(self):
        summary = qa_plane.aggregate([finding(), model_finding(), human_finding()])
        path = self.tmp / "summary.json"
        path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
        reloaded = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(summary, reloaded)
        document = {
            "schemaVersion": "design-lab/assurance-qa-layer/v1",
            "planes": [layer.as_dict() for layer in qa_plane.QA_PLANES],
            "summary": reloaded,
        }
        jsonschema.validate(instance=document, schema=qa_plane.qa_schema())
        self.assertIn("not an acceptance record", reloaded["explanation"])

    def test_duplicate_findings_and_bad_input_are_refused(self):
        with self.assertRaises(AssuranceError) as caught:
            qa_plane.aggregate([finding(), finding()])
        self.assertIn("duplicate finding_id", str(caught.exception))
        with self.assertRaises(AssuranceError):
            qa_plane.aggregate("f-1")
        with self.assertRaises(AssuranceError):
            qa_plane.aggregate([{"finding_id": "f"}])

    def test_explain_refuses_a_foreign_summary(self):
        with self.assertRaises(AssuranceError):
            qa_plane.explain_aggregate({"gate": "DONE"})
        with self.assertRaises(AssuranceError):
            qa_plane.explain_aggregate("gate PASS")


if __name__ == "__main__":
    unittest.main(verbosity=2)
