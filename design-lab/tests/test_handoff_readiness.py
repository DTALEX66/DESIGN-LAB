# SPDX-License-Identifier: MIT
"""DL-CLOUD-2026-09-25 Prompt I: the Quality->Jury->Rights->Preflight->Handoff
readiness combiner's seven acceptance cases.

The combiner is a pure backend decision layer (see
:mod:`design_lab.assurance.handoff_readiness`). These fixtures exercise the
closed vocabulary of the four existing contracts -- the sealed QualityRecord,
the frozen rights-registry states, the preflight check model, and the
commercial handoff -- and pin the acceptance cases the audit enumerates:

* an automated judge's high score never unblocks a human REJECT;
* a rights ``FORBIDDEN``/``NOT_ADJUDICATED`` field blocks;
* a missing-font preflight blocker blocks;
* a stale artifact hash blocks;
* a re-open failure (a failing reopen-readback preflight check) blocks;
* the all-pass case reaches READY_FOR_HANDOFF;
* the UI signals (BLOCKER band) mirror the backend decision exactly.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from design_lab.assurance import human_jury  # noqa: E402
from design_lab.assurance import quality_record  # noqa: E402
from design_lab.assurance import handoff_readiness as hr  # noqa: E402

SUBJECT = "design-lab/job/job-1/deliverable/poster"
SHA = "sha256:" + "a" * 64
OTHER = "sha256:" + "b" * 64


def det(**o):
    d = {"finding_id": "f-det", "layer_id": "qa-deterministic",
         "check_id": "preflight.structural", "subject_ref": SUBJECT,
         "outcome": "PASS", "severity": "INFO", "evidence": {"artifact_sha256": SHA}}
    d.update(o)
    return d


def judge_high(**o):
    # an advisory model score that reads as "excellent" but must not gate
    d = {"finding_id": "f-judge", "layer_id": "qa-model-assisted",
         "check_id": "provider:aesthetic/laion", "subject_ref": SUBJECT,
         "outcome": "REVIEW_REQUIRED", "severity": "MINOR",
         "evidence": {"artifact_sha256": SHA, "confidence": 0.97, "score": 0.97},
         "recommendation": "aesthetic score is high; still human-gated"}
    d.update(o)
    return d


def approve():
    return {"schemaVersion": "design-lab/assurance-jury-record/v2", "kind": "JURY_VERDICT",
            "jury_record_id": "j-1", "subject_ref": SUBJECT, "artifact_sha256": SHA,
            "juror": {"juror_id": "dtalex66", "kind": "HUMAN",
                      "attestation": "calibrated-display review at 100%"},
            "criteria": [{"criterion_id": "anti-slop", "weight": 1.0, "score": 4.0, "note": None}],
            "verdict": "APPROVE", "decided_at": "2026-09-23T10:00:00Z",
            "supersedes": None, "evidence_refs": []}


def reject():
    # a REJECT verdict must carry evidence (the schema's REJECT branch demands
    # non-empty evidence_refs); it reuses the approve() base then overrides
    return {**approve(), "jury_record_id": "j-2", "verdict": "REJECT",
            "evidence_refs": ["reports/current/qa-rejection-evidence.json"]}


def qrec(approval, deterministic=None, judge=None):
    return quality_record.record_quality_record(
        quality_record_id="qr-1", subject_ref=SUBJECT, artifact_sha256=SHA,
        deterministic=deterministic if deterministic is not None else [det()],
        automated_judge=judge if judge is not None else [judge_high()],
        human_verdict=approval)


CLEAN_RIGHTS = [
    {"subject_id": "font:inter", "kind": "font", "license": "OFL-1.1",
     "territory": {"limits": [], "state": "ADJUDICATED"},
     "use_restriction": "ADJUDICATED", "output_restriction": "ADJUDICATED",
     "redistribution": "ADJUDICATED"},
]
BLOCK_RIGHTS = [
    {"subject_id": "model:h3", "kind": "provider", "license": "UNLICENSED",
     "territory": {"limits": ["commercial"], "state": "NOT_ADJUDICATED"},
     "use_restriction": "FORBIDDEN", "output_restriction": "NOT_ADJUDICATED",
     "redistribution": "NOT_ADJUDICATED"},
]

def preflight(status="pass", checks=None):
    cks = checks if checks is not None else [
        {"id": "font", "status": "pass"},
        {"id": "reopen_readback", "status": "pass"},
        {"id": "bleed", "status": "pass"},
    ]
    return {"preflight_id": "pf-1", "schemaVersion": "design-lab/preflight/v2",
            "profile": "print",
            "required_checks": [
                {"id": "font", "severity": "blocker", "tool": "fontkit"},
                {"id": "reopen_readback", "severity": "blocker", "tool": "adobe-uxp"},
                {"id": "bleed", "severity": "high", "tool": "prepress"},
            ],
            "result": {"status": status, "checks": cks}}


HANDOFF = {
    "project_id": "p-1", "version": "v3",
    "artifacts": [{"path": "poster.ai", "role": "source", "format": "pdf-x4",
                   "editable": True, "hash": SHA}],
    "assets": [], "licenses": [], "preflight_reports": ["pf-1"],
    "approvals": [{"role": "producer", "status": "approved"}],
}


def ready(*, quality, rights, pf, hf):
    return hr.decide(quality_record_doc=quality, rights_entries=rights,
                     preflight=pf, handoff=hf)


class PromptIHandoffReadinessTests(unittest.TestCase):
    def test_human_reject_with_high_model_score_blocks(self):
        d = ready(quality=qrec(reject()), rights=CLEAN_RIGHTS, pf=preflight(), hf=HANDOFF)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertEqual(d["quality_final_gate"], "BLOCKED")
        # the advisory judge is present but explicitly non-gating
        self.assertTrue(any("advisory" in s for s in d["info"]))
        self.assertTrue(any(s.startswith("human_gate") for s in d["blockers"]))

    def test_rights_blocker_blocks_even_on_human_approve(self):
        d = ready(quality=qrec(approve()), rights=BLOCK_RIGHTS, pf=preflight(), hf=HANDOFF)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertTrue(any(s.startswith("rights:model:h3") for s in d["blockers"]))

    def test_restricting_rights_state_is_warning_not_blocker(self):
        restr = [{"subject_id": "img:stock", "kind": "image", "license": "CC-BY",
                  "territory": {"limits": [], "state": "ADJUDICATED"},
                  "use_restriction": "PERSONAL_RESEARCH_NONCOMMERCIAL_ONLY",
                  "output_restriction": "ADJUDICATED", "redistribution": "ADJUDICATED"}]
        d = ready(quality=qrec(approve()), rights=restr, pf=preflight(), hf=HANDOFF)
        # a personal-research restriction is a WARNING band, not a blocker:
        # with a signed human APPROVE and no blocker it still reads READY,
        # but the restriction must surface in the UI WARNING band
        self.assertEqual(d["readiness"], "READY_FOR_HANDOFF")
        self.assertNotIn("rights:img:stock:use_restriction=PERSONAL_RESEARCH_NONCOMMERCIAL_ONLY", d["blockers"])
        self.assertIn("rights:img:stock:use_restriction=PERSONAL_RESEARCH_NONCOMMERCIAL_ONLY", d["warnings"])

    def test_missing_font_preflight_blocker_blocks(self):
        pf = preflight(status="fail", checks=[
            {"id": "font", "status": "fail"},
            {"id": "reopen_readback", "status": "pass"},
            {"id": "bleed", "status": "pass"}])
        d = ready(quality=qrec(approve()), rights=CLEAN_RIGHTS, pf=pf, hf=HANDOFF)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertTrue(any(s == "preflight:font=fail (severity=blocker)" for s in d["blockers"]))

    def test_reopen_failure_blocks(self):
        pf = preflight(status="fail", checks=[
            {"id": "font", "status": "pass"},
            {"id": "reopen_readback", "status": "fail"},
            {"id": "bleed", "status": "pass"}])
        d = ready(quality=qrec(approve()), rights=CLEAN_RIGHTS, pf=pf, hf=HANDOFF)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertTrue(any(s.startswith("preflight:reopen_readback=fail") for s in d["blockers"]))

    def test_stale_artifact_blocks(self):
        stale_handoff = dict(HANDOFF, artifacts=[
            {"path": "poster.ai", "role": "source", "format": "pdf-x4",
             "editable": True, "hash": OTHER}])  # quality record says SHA
        d = ready(quality=qrec(approve()), rights=CLEAN_RIGHTS, pf=preflight(), hf=stale_handoff)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertTrue(any(s.startswith("stale_artifact") for s in d["blockers"]))

    def test_live_reobserved_digest_mismatch_blocks(self):
        d = hr.decide(quality_record_doc=qrec(approve()), rights_entries=CLEAN_RIGHTS,
                      preflight=preflight(), handoff=HANDOFF, live_artifact_sha=OTHER)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertTrue(any(s.startswith("stale_artifact") for s in d["blockers"]))

    def test_all_pass_reaches_ready_for_handoff(self):
        d = ready(quality=qrec(approve()), rights=CLEAN_RIGHTS, pf=preflight(), hf=HANDOFF)
        self.assertEqual(d["readiness"], "READY_FOR_HANDOFF")
        self.assertEqual(d["quality_final_gate"], "PASS")
        self.assertEqual(d["blockers"], [])
        self.assertEqual(d["ui_signals"]["BLOCKER"], [])

    def test_ui_backend_consistent(self):
        # the UI BLOCKER band is literally the backend blocker list
        d = ready(quality=qrec(reject()), rights=BLOCK_RIGHTS,
                  pf=preflight(status="fail", checks=[
                      {"id": "font", "status": "fail"},
                      {"id": "reopen_readback", "status": "pass"},
                      {"id": "bleed", "status": "pass"}]),
                  hf=HANDOFF)
        self.assertEqual(d["ui_signals"]["BLOCKER"], d["blockers"])
        self.assertEqual(d["readiness"], "BLOCKED")

    def test_no_preflight_report_blocks(self):
        d = hr.decide(quality_record_doc=qrec(approve()), rights_entries=CLEAN_RIGHTS,
                      preflight=None, handoff=HANDOFF)
        self.assertEqual(d["readiness"], "BLOCKED")
        self.assertTrue(any("no report supplied" in s for s in d["blockers"]))


if __name__ == "__main__":
    unittest.main()
