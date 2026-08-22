# SPDX-License-Identifier: MIT
"""Deterministic reconstruction contract tests."""
from __future__ import annotations

import copy
import json
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

DESIGN_LAB = Path(__file__).resolve().parents[1]
if str(DESIGN_LAB) not in sys.path:
    sys.path.insert(0, str(DESIGN_LAB))

from reconstruction.contracts import (  # noqa: E402
    ContractError,
    RIR_SCHEMA_ID,
    RUN_SCHEMA_ID,
    canonical_rir_bytes,
    canonical_rir_hash,
    validate_rir,
    validate_run_contract,
)


def minimal_rir() -> dict:
    return {
        "schemaVersion": "design-lab/reconstruction-ir/v1",
        "canvas": {"width": 64, "height": 64, "colorSpace": "srgb"},
        "layers": [],
    }


def raster_layer(path: str = "inputs/source.png", *, layer_id: str = "raster-1") -> dict:
    return {
        "id": layer_id,
        "type": "raster",
        "name": "Source raster",
        "opacity": 1.0,
        "bounds": {"x": 0, "y": 0, "width": 64, "height": 64},
        "inferred": False,
        "zOrder": 0,
        "visible": True,
        "locked": False,
        "blendMode": "normal",
        "raster": {
            "path": path,
            "crop": {"x": 0, "y": 0, "width": 64, "height": 64},
            "alpha": 1.0,
            "sourceMappings": [
                {
                    "sourceBounds": {"x": 0, "y": 0, "width": 64, "height": 64},
                    "targetBounds": {"x": 0, "y": 0, "width": 64, "height": 64},
                }
            ],
        },
    }


def minimal_run_contract() -> dict:
    run_id = "run-001"
    runtime_root = f".hermes/task-runtime/reconstruction/{run_id}/"
    evidence_root = f".hermes/task-artifacts/reconstruction/{run_id}/"
    now = datetime.now(timezone.utc)
    artifact_paths = [runtime_root + "output.svg", evidence_root + "report.json"]
    return {
        "schemaVersion": "design-lab/reconstruction-run/v1",
        "runId": run_id,
        "jobId": "job-001",
        "source": {
            "sourceId": "source-001",
            "path": "inputs/source.png",
            "sha256": "a" * 64,
            "profileMetadata": {"name": "reference", "version": "1"},
            "normalizedReferenceTarget": "normalized/source.png",
        },
        "profile": "ui",
        "canvasPolicy": {
            "width": 64,
            "height": 64,
            "colorSpace": "srgb",
            "globalCoordinates": "canvas",
            "tilePolicy": {
                "enabled": False,
                "tileWidth": 64,
                "tileHeight": 64,
                "overlap": 0,
            },
        },
        "roots": {"runtime": runtime_root, "evidence": evidence_root},
        "providerPolicy": {
            "defaultProvider": "local",
            "providerAllowlist": ["local", "remote-v1"],
            "selectedProvider": "local",
            "remoteConsents": [],
        },
        "writeAuthorization": {
            "authorizationId": "auth-001",
            "jobId": "job-001",
            "runId": run_id,
            "targets": artifact_paths,
            "issuedAt": (now - timedelta(minutes=1)).isoformat(),
            "expiresAt": (now + timedelta(hours=1)).isoformat(),
            "state": "authorized",
        },
        "registries": {
            "toolRegistry": "design-lab/config/tool-registry.json",
            "modelRegistry": "design-lab/config/model-registry.json",
        },
        "lifecycle": {
            "state": "authorized",
            "history": [
                {
                    "from": "created",
                    "to": "authorized",
                    "at": (now - timedelta(minutes=1)).isoformat(),
                }
            ],
        },
        "requestedOperations": ["reconstruct", "package", "readback"],
        "cancellationPolicy": {
            "cancelable": True,
            "resume": "checkpoint",
            "checkpointPath": runtime_root + "checkpoints/",
        },
        "artifacts": [
            {"id": "vector", "kind": "vector-output", "path": artifact_paths[0]},
            {"id": "evidence", "kind": "evidence", "path": artifact_paths[1]},
        ],
    }


class ReconstructionContractTests(unittest.TestCase):
    def test_schema_documents_are_valid_draft_2020_12(self):
        import jsonschema

        schema_dir = DESIGN_LAB / "schemas" / "reconstruction"
        for name in ("reconstruction-ir.schema.json", "reconstruction-run.schema.json"):
            schema = json.loads((schema_dir / name).read_text(encoding="utf-8"))
            self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
            jsonschema.Draft202012Validator.check_schema(schema)

    def test_minimal_rir_validates(self):
        validate_rir(
            {
                "schemaVersion": "design-lab/reconstruction-ir/v1",
                "canvas": {"width": 64, "height": 64, "colorSpace": "srgb"},
                "layers": [],
            }
        )

    def test_external_raster_reference_is_rejected(self):
        value = minimal_rir()
        value["layers"] = [
            {"id": "x", "type": "raster", "href": "https://example.test/x.png"}
        ]
        with self.assertRaises(ContractError):
            validate_rir(value)

    def test_duplicate_ids_are_rejected_across_nested_groups(self):
        child = raster_layer(layer_id="duplicate")
        group = {
            "id": "group-1",
            "type": "group",
            "name": "Group",
            "opacity": 1.0,
            "bounds": {"x": 0, "y": 0, "width": 64, "height": 64},
            "inferred": False,
            "zOrder": 0,
            "visible": True,
            "locked": False,
            "blendMode": "normal",
            "children": [child],
        }
        value = minimal_rir()
        value["layers"] = [group, raster_layer(layer_id="duplicate")]
        with self.assertRaisesRegex(ContractError, "duplicate"):
            validate_rir(value)

    def test_unknown_properties_are_rejected(self):
        value = minimal_rir()
        value["unexpected"] = True
        with self.assertRaises(ContractError):
            validate_rir(value)

    def test_invalid_opacity_bounds_and_z_order_are_rejected(self):
        mutations = (
            ("opacity", -0.01),
            ("bounds", {"x": 0, "y": 0, "width": -1, "height": 64}),
            ("zOrder", -1),
        )
        for field, invalid in mutations:
            with self.subTest(field=field):
                value = minimal_rir()
                layer = raster_layer()
                layer[field] = invalid
                value["layers"] = [layer]
                with self.assertRaises(ContractError):
                    validate_rir(value)

    def test_parent_traversal_and_absolute_raster_paths_are_rejected(self):
        for path in (
            "../source.png",
            "inputs/../source.png",
            "/source.png",
            "C:\\source.png",
            "https:source.png",
        ):
            with self.subTest(path=path):
                value = minimal_rir()
                value["layers"] = [raster_layer(path)]
                with self.assertRaises(ContractError):
                    validate_rir(value)

    def test_canonical_hash_is_stable_across_mapping_insertion_order(self):
        first = minimal_rir()
        second = {
            "layers": [],
            "canvas": {"colorSpace": "srgb", "height": 64, "width": 64},
            "schemaVersion": RIR_SCHEMA_ID,
        }
        expected = b'{"canvas":{"colorSpace":"srgb","height":64,"width":64},"layers":[],"schemaVersion":"design-lab/reconstruction-ir/v1"}'
        self.assertEqual(canonical_rir_bytes(first), expected)
        self.assertEqual(canonical_rir_bytes(first), canonical_rir_bytes(second))
        self.assertEqual(canonical_rir_hash(first), canonical_rir_hash(second))

    def test_hashing_rejects_invalid_rir(self):
        value = minimal_rir()
        value["schemaVersion"] = "wrong"
        with self.assertRaises(ContractError):
            canonical_rir_hash(value)

    def test_minimal_run_contract_validates(self):
        self.assertEqual(RUN_SCHEMA_ID, "design-lab/reconstruction-run/v1")
        validate_run_contract(minimal_run_contract())

    def test_invalid_profile_is_rejected(self):
        value = minimal_run_contract()
        value["profile"] = "illustration"
        with self.assertRaises(ContractError):
            validate_run_contract(value)

    def test_remote_provider_requires_exact_per_file_consent(self):
        value = minimal_run_contract()
        value["providerPolicy"]["selectedProvider"] = "remote-v1"
        with self.assertRaisesRegex(ContractError, "consent"):
            validate_run_contract(value)

        value["providerPolicy"]["remoteConsents"] = [
            {
                "path": value["source"]["path"],
                "sha256": value["source"]["sha256"],
                "provider": "remote-v1",
                "consented": True,
            }
        ]
        validate_run_contract(value)

    def test_expired_write_authorization_is_rejected(self):
        value = minimal_run_contract()
        value["writeAuthorization"]["expiresAt"] = (
            datetime.now(timezone.utc) - timedelta(seconds=1)
        ).isoformat()
        with self.assertRaisesRegex(ContractError, "expired"):
            validate_run_contract(value)

    def test_target_mismatched_write_authorization_is_rejected(self):
        value = minimal_run_contract()
        value["writeAuthorization"]["targets"] = [value["roots"]["runtime"] + "other.svg"]
        with self.assertRaisesRegex(ContractError, "targets"):
            validate_run_contract(value)

    def test_invalid_lifecycle_promotion_is_rejected(self):
        value = minimal_run_contract()
        value["lifecycle"] = {
            "state": "completed",
            "history": [
                {
                    "from": "created",
                    "to": "completed",
                    "at": datetime.now(timezone.utc).isoformat(),
                }
            ],
        }
        with self.assertRaisesRegex(ContractError, "lifecycle"):
            validate_run_contract(value)

    def test_unknown_operation_and_authorization_state_are_rejected(self):
        for field, invalid in (
            ("requestedOperations", ["upload"]),
            ("writeAuthorization.state", "pending"),
        ):
            with self.subTest(field=field):
                value = copy.deepcopy(minimal_run_contract())
                if field == "requestedOperations":
                    value[field] = invalid
                else:
                    value["writeAuthorization"]["state"] = invalid
                with self.assertRaises(ContractError):
                    validate_run_contract(value)


if __name__ == "__main__":
    unittest.main(verbosity=2)
