# SPDX-License-Identifier: MIT
"""DL-P1-131: video boundary rule engine tests (STRUCTURAL / E1 evidence only).

No video host is launched, nothing is rendered or encoded, and no GPU is
touched. The tests prove the ownership rules and the fail-closed paths.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from jsonschema import Draft202012Validator  # noqa: E402

from design_lab.creative.media import MediaError, load_schema  # noqa: E402
from design_lab.creative.media import video_boundary as vb  # noqa: E402

HANDOFF_CLAIMS = [
    "frame-accurate output at 23.976 fps",
    "colour-managed encode to Rec.709",
    "hardware encode on the local GPU",
    "rendered preview of the first 240 frames",
]


class BoundaryDocumentTests(unittest.TestCase):
    def test_document_matches_its_schema(self) -> None:
        document = vb.boundary_document()
        schema = load_schema("media-video-boundary")
        self.assertEqual(
            schema["$id"], "https://dtalex66.local/schemas/media-video-boundary.json"
        )
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(document)
        self.assertEqual(document["schemaVersion"], "design-lab/media-video-boundary/v1")
        self.assertEqual(document["task_ids"], ["DL-P1-131"])
        self.assertEqual(document["evidence_level"], "E1")
        self.assertEqual(document["host_execution"], "NOT_EXECUTED")
        json.dumps(document)

    def test_ownership_split_is_the_declared_one(self) -> None:
        entries = vb.boundary_entries_by_operation()
        self.assertEqual(set(entries), set(vb.OPERATIONS))
        self.assertEqual(entries["visual-design"]["owner"], "design-lab")
        self.assertEqual(entries["design-ir"]["owner"], "design-lab")
        self.assertEqual(entries["timeline-contract"]["owner"], "design-lab")
        self.assertEqual(entries["handoff-bundle"]["owner"], "design-lab")
        self.assertEqual(entries["delivery-receipt"]["owner"], "design-lab")
        for operation in (
            "render",
            "encode",
            "colour-managed-export",
            "audio-mixdown",
            "hardware-acceleration",
        ):
            self.assertEqual(entries[operation]["owner"], "host", operation)
            self.assertTrue(entries[operation]["rule"])
        for operation, entry in entries.items():
            self.assertIn(entry["owner"], vb.OWNERS)
            self.assertIsInstance(entry["rule"], str)
            self.assertGreaterEqual(len(entry["rule"]), 8)

    def test_document_is_regenerated_not_shared(self) -> None:
        first = vb.boundary_document()
        first["entries"][0]["owner"] = "host"
        self.assertEqual(vb.boundary_document()["entries"][0]["owner"], "design-lab")

    def test_design_lab_may_not_own_rendered_or_encoded_work_without_evidence(self) -> None:
        document = copy.deepcopy(vb.boundary_document())
        render = next(item for item in document["entries"] if item["operation"] == "render")
        render["owner"] = "design-lab"
        with self.assertRaises(MediaError) as caught:
            vb.validate_boundary(document)
        self.assertEqual(caught.exception.code, "VIDEO_BOUNDARY_OWNERSHIP_UNPROVEN")
        self.assertIn("host-live:", str(caught.exception))

        render["host_live_evidence_ref"] = "measured-by-hand"
        with self.assertRaises(MediaError) as caught:
            vb.validate_boundary(document)
        self.assertEqual(caught.exception.code, "MEDIA_SCHEMA_INVALID")
        self.assertIn("host_live_evidence_ref", str(caught.exception))

        render["host_live_evidence_ref"] = "host-live:export-2026-09-01-0001"
        vb.validate_boundary(document)

    def test_a_host_may_never_own_the_design_record(self) -> None:
        document = copy.deepcopy(vb.boundary_document())
        design_ir = next(
            item for item in document["entries"] if item["operation"] == "design-ir"
        )
        design_ir["owner"] = "host"
        with self.assertRaises(MediaError) as caught:
            vb.validate_boundary(document)
        self.assertEqual(caught.exception.code, "VIDEO_BOUNDARY_FOREIGN_OWNERSHIP")

    def test_ambiguous_or_incomplete_ownership_fails_closed(self) -> None:
        document = copy.deepcopy(vb.boundary_document())
        document["entries"].append(copy.deepcopy(document["entries"][0]))
        with self.assertRaises(MediaError) as duplicate:
            vb.validate_boundary(document)
        self.assertEqual(duplicate.exception.code, "VIDEO_BOUNDARY_DUPLICATE_OPERATION")

        document = copy.deepcopy(vb.boundary_document())
        document["entries"] = [
            item for item in document["entries"] if item["operation"] != "encode"
        ]
        with self.assertRaises(MediaError) as undeclared:
            vb.validate_boundary(document)
        self.assertEqual(undeclared.exception.code, "VIDEO_BOUNDARY_OPERATION_UNDECLARED")

        document = copy.deepcopy(vb.boundary_document())
        document["operations"] = [op for op in document["operations"] if op != "render"]
        with self.assertRaises(MediaError) as operation_set:
            vb.validate_boundary(document)
        self.assertEqual(operation_set.exception.code, "VIDEO_BOUNDARY_OPERATION_SET")

    def test_schema_violations_are_refused(self) -> None:
        document = copy.deepcopy(vb.boundary_document())
        document["entries"][0]["owner"] = "designlab"
        with self.assertRaises(MediaError) as caught:
            vb.validate_boundary(document)
        self.assertEqual(caught.exception.code, "MEDIA_SCHEMA_INVALID")
        with self.assertRaises(MediaError):
            vb.validate_boundary(["not", "a", "document"])


class AssertWithinBoundaryTests(unittest.TestCase):
    def test_matching_requests_are_allowed(self) -> None:
        allowed = vb.assert_within_boundary(
            {"operation": "render", "requested_owner": "host"}
        )
        self.assertTrue(allowed["allowed"])
        self.assertEqual(allowed["owner"], "host")
        self.assertTrue(allowed["reason"])

        design = vb.assert_within_boundary(
            {"operation": "design-ir", "requested_owner": "design-lab"}
        )
        self.assertEqual(design["owner"], "design-lab")

        shared = vb.assert_within_boundary(
            {"operation": "colour-space-declaration", "requested_owner": "design-lab"}
        )
        self.assertEqual(shared["owner"], "shared")
        self.assertIn("shared", shared["reason"])
        shared_host = vb.assert_within_boundary(
            {"operation": "colour-space-declaration", "requested_owner": "host"}
        )
        self.assertTrue(shared_host["allowed"])

    def test_out_of_boundary_requests_fail_closed(self) -> None:
        with self.assertRaises(MediaError) as caught:
            vb.assert_within_boundary(
                {
                    "operation": "render",
                    "requested_owner": "design-lab",
                    "frames": [1, 240],
                }
            )
        self.assertEqual(caught.exception.code, "VIDEO_BOUNDARY_OWNERSHIP_CONFLICT")
        self.assertIn("owned by 'host'", str(caught.exception))

        with self.assertRaises(MediaError) as caught:
            vb.assert_within_boundary(
                {"operation": "encode", "requested_owner": "design-lab"}
            )
        self.assertEqual(caught.exception.code, "VIDEO_BOUNDARY_OWNERSHIP_CONFLICT")

        with self.assertRaises(MediaError) as caught:
            vb.assert_within_boundary(
                {"operation": "design-ir", "requested_owner": "host"}
            )
        self.assertEqual(caught.exception.code, "VIDEO_BOUNDARY_OWNERSHIP_CONFLICT")

    def test_unknown_input_fails_closed(self) -> None:
        with self.assertRaises(MediaError) as unknown_operation:
            vb.assert_within_boundary(
                {"operation": "transcode", "requested_owner": "host"}
            )
        self.assertEqual(unknown_operation.exception.code, "VIDEO_BOUNDARY_OPERATION_UNKNOWN")

        with self.assertRaises(MediaError) as unknown_owner:
            vb.assert_within_boundary(
                {"operation": "render", "requested_owner": "design-lab-orchestrator"}
            )
        self.assertEqual(unknown_owner.exception.code, "VIDEO_BOUNDARY_OWNER_UNKNOWN")

        with self.assertRaises(MediaError) as missing:
            vb.assert_within_boundary({"operation": "render"})
        self.assertEqual(missing.exception.code, "VIDEO_REQUEST_INVALID")

        with self.assertRaises(MediaError) as not_mapping:
            vb.assert_within_boundary("render")
        self.assertEqual(not_mapping.exception.code, "VIDEO_REQUEST_INVALID")

    def test_an_amended_document_is_honoured(self) -> None:
        document = copy.deepcopy(vb.boundary_document())
        render = next(item for item in document["entries"] if item["operation"] == "render")
        render["owner"] = "design-lab"
        render["host_live_evidence_ref"] = "host-live:measured-export-0001"
        allowed = vb.assert_within_boundary(
            {"operation": "render", "requested_owner": "design-lab"}, document=document
        )
        self.assertEqual(allowed["owner"], "design-lab")


class UnsupportedClaimTests(unittest.TestCase):
    def test_structural_bundle_supports_no_host_claim(self) -> None:
        unsupported = vb.unsupported_video_claims(
            {"handoff_id": "h-1", "claims": list(HANDOFF_CLAIMS), "evidence_level": "E1"}
        )
        self.assertEqual(len(unsupported), len(HANDOFF_CLAIMS))
        for line, claim in zip(unsupported, HANDOFF_CLAIMS):
            self.assertTrue(line.startswith(claim))
            self.assertIn("NOT_EXECUTED", line)
        self.assertIn("frame-accuracy receipt", unsupported[0])
        self.assertIn("colour-managed export receipt", unsupported[1])
        self.assertIn("accelerator", unsupported[2])
        self.assertIn("render receipt", unsupported[3])

    def test_only_a_measured_host_live_receipt_clears_a_claim(self) -> None:
        bundle = {
            "handoff_id": "h-2",
            "claims": list(HANDOFF_CLAIMS),
            "host_live_receipts": [
                {
                    "claim": "frame-accurate output",
                    "receipt_ref": "host-live:export-0001",
                    "evidence_level": "E2",
                },
                {
                    "claim": "rendered preview",
                    "receipt_ref": "premiere-project-file-0007",
                    "evidence_level": "E3",
                },
                {
                    "claim": "hardware encode",
                    "receipt_ref": "host-live:gpu-0002",
                    "evidence_level": "E1",
                },
            ],
        }
        unsupported = vb.unsupported_video_claims(bundle)
        self.assertEqual(len(unsupported), 3)
        self.assertNotIn("frame-accurate", " ".join(unsupported))
        self.assertIn("rendered preview", " ".join(unsupported))
        self.assertIn("hardware encode", " ".join(unsupported))
        self.assertIn("colour-managed encode", " ".join(unsupported))

    def test_unknown_claims_are_reported_not_ignored(self) -> None:
        unsupported = vb.unsupported_video_claims(
            {"handoff_id": "h-3", "claims": ["ships an Oscar-winning edit"]}
        )
        self.assertEqual(len(unsupported), 1)
        self.assertIn("unrecognised claim class", unsupported[0])
        self.assertIn("NOT_EXECUTED", unsupported[0])

    def test_malformed_bundles_fail_closed(self) -> None:
        for bundle in (
            {"handoff_id": "h-4"},
            {"handoff_id": "h-4", "claims": []},
            {"handoff_id": "h-4", "claims": "frame-accurate output"},
            {"handoff_id": "h-4", "claims": [""]},
            {"handoff_id": "h-4", "claims": ["render"], "host_live_receipts": {}},
        ):
            with self.subTest(bundle=bundle):
                with self.assertRaises(MediaError) as caught:
                    vb.unsupported_video_claims(bundle)
                self.assertIn(
                    caught.exception.code, {"VIDEO_CLAIMS_MISSING", "VIDEO_BUNDLE_INVALID"}
                )
        with self.assertRaises(MediaError) as not_mapping:
            vb.unsupported_video_claims(["rendered preview"])
        self.assertEqual(not_mapping.exception.code, "VIDEO_BUNDLE_INVALID")

    def test_receipt_without_a_measured_level_is_ignored(self) -> None:
        unsupported = vb.unsupported_video_claims(
            {
                "handoff_id": "h-5",
                "claims": ["hardware encode"],
                "host_live_receipts": [
                    {
                        "claim": "hardware encode",
                        "receipt_ref": "host-live:gpu-0003",
                        "evidence_level": "E0",
                    }
                ],
            }
        )
        self.assertEqual(len(unsupported), 1)
        self.assertIn("requires a host-live receipt naming the accelerator", unsupported[0])


if __name__ == "__main__":
    unittest.main()
