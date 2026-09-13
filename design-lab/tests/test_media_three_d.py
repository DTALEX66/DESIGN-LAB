# SPDX-License-Identifier: MIT
"""DL-P1-150: Blender adapter contract and GLB/glTF validator tests.

The container tests are real byte-level tests over synthetic structures built in
memory; they prove the validator's rules, not that any 3D tool ran. No Blender
process is started, no .blend or .glb file is opened and no render is executed.
"""
from __future__ import annotations

import json
from pathlib import Path
import struct
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from jsonschema import Draft202012Validator  # noqa: E402

from design_lab.creative.media import MediaError, load_schema  # noqa: E402
from design_lab.creative.media import three_d as td  # noqa: E402

JSON_TYPE = td.JSON_CHUNK_TYPE
BIN_TYPE = td.BIN_CHUNK_TYPE
MINIMAL_JSON = b'{"asset":{"version":"2.0"}}'


def chunk(chunk_type: int, payload: bytes) -> bytes:
    return struct.pack("<II", len(payload), chunk_type) + payload


def container(*chunks: bytes) -> bytes:
    body = b"".join(chunks)
    return b"glTF" + struct.pack("<II", 2, 12 + len(body)) + body


def padded(payload: bytes, fill: bytes = b" ") -> bytes:
    """Pad a chunk payload to the 4-byte boundary GLB requires."""
    return payload + fill * (-len(payload) % 4)


def simple_document(byte_length: int = 12) -> dict:
    return {
        "asset": {"version": "2.0", "generator": "design-lab-structural-fixture"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}}]}],
        "buffers": [{"byteLength": byte_length}],
        "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": byte_length}],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 1, "type": "VEC3"}
        ],
    }


class BlenderAdapterContractTests(unittest.TestCase):
    def test_declaration_matches_the_repository_adapter_contract_schema(self) -> None:
        declaration = td.blender_adapter_declaration()
        Draft202012Validator(load_schema("adapter-contract")).validate(declaration)
        self.assertEqual(declaration["status"], "structural")
        self.assertEqual(declaration["mode"], "external-cli")
        self.assertEqual(declaration["tool"], "blender")
        self.assertEqual(declaration["evidence"]["level"], "E1")
        self.assertEqual(declaration["evidence"]["task_ids"], ["DL-P1-150"])
        self.assertIsNone(declaration["evidence"]["runtime_version"])
        self.assertTrue(declaration["rollback"])
        self.assertTrue(declaration["capabilities"])
        for capability in declaration["capabilities"]:
            self.assertFalse(capability["supported"])
            self.assertIn("not installed", capability["note"])
        self.assertIn("not installed", declaration["evidence"]["note"])
        self.assertIn("NOT_EXECUTED", declaration["evidence"]["note"])

    def test_declaration_contains_no_absolute_user_path(self) -> None:
        from design_lab.creative.media import reject_absolute_paths

        reject_absolute_paths(td.blender_adapter_declaration(), "adapter declaration")
        for artifact in td.blender_adapter_declaration()["evidence"]["artifact_paths"]:
            self.assertFalse(Path(artifact).is_absolute())

    def test_handoff_describes_a_future_live_run_and_is_not_executed(self) -> None:
        handoff = td.blender_handoff(
            {
                "handoff_id": "op-3d-0001",
                "scene_ref": "design-assets/structural-fixture.blend",
                "script_ref": "src/design_lab/creative/media/three_d.py",
                "output_ref": "model-library/handoff/structural-fixture.glb",
                "blender_ref": "os-toolchain",
                "frames": [1, 24],
            }
        )
        self.assertEqual(handoff["note"], "requires a live Blender run: NOT_EXECUTED")
        self.assertTrue(handoff["note"].endswith("NOT_EXECUTED"))
        self.assertTrue(handoff["requires_live_host"])
        self.assertEqual(handoff["host_execution"], "NOT_EXECUTED")
        self.assertTrue(all(step["status"] == "NOT_EXECUTED" for step in handoff["steps"]))
        actions = " ".join(step["action"] for step in handoff["steps"])
        self.assertIn("alias", actions)
        self.assertIn("--background", actions)
        self.assertIn("--python", actions)
        self.assertIn("read back the produced file", actions)

    def test_handoff_plan_fails_closed_on_bad_input(self) -> None:
        with self.assertRaises(MediaError) as extra:
            td.blender_handoff(
                {
                    "handoff_id": "x",
                    "scene_ref": "a.blend",
                    "script_ref": "b.py",
                    "output_ref": "c.glb",
                    "sandbox": True,
                }
            )
        self.assertEqual(extra.exception.code, "BLENDER_HANDOFF_PLAN_INVALID")
        with self.assertRaises(MediaError):
            td.blender_handoff({"handoff_id": "x"})
        with self.assertRaises(MediaError):
            td.blender_handoff(
                {
                    "handoff_id": "x",
                    "scene_ref": "a.blend",
                    "script_ref": "b.py",
                    "output_ref": "c.glb",
                    "frames": [10, 1],
                }
            )

    def test_report_matches_its_schema_and_carries_structural_evidence(self) -> None:
        record = td.validate_glb(
            td.build_glb(simple_document(12), b"\x00" * 12)
        )
        report = td.blender_adapter_report(
            glb_validation=record,
            handoff=td.blender_handoff(
                {
                    "handoff_id": "op-3d-1",
                    "scene_ref": "design-assets/scene.blend",
                    "script_ref": "src/design_lab/creative/media/three_d.py",
                    "output_ref": "model-library/out.glb",
                }
            ),
        )
        schema = load_schema("media-three-d-adapter")
        self.assertEqual(
            schema["$id"], "https://dtalex66.local/schemas/media-three-d-adapter.json"
        )
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(load_schema("adapter-contract")).check_schema(
            load_schema("adapter-contract")
        )
        Draft202012Validator(schema).validate(report)
        self.assertFalse(report["host"]["installed"])
        self.assertEqual(report["host"]["install_state"], "NOT_PROBED_ON_THIS_HOST")
        self.assertEqual(report["adapter_contract"]["status"], "structural")
        self.assertEqual(report["glb_validation"]["bin_chunks"][0]["length"], 12)
        json.dumps(report)  # JSON-safe: no bytes leaked into the report

    def test_no_third_party_gltf_library_is_imported(self) -> None:
        self.assertNotIn("pygltflib", sys.modules)
        self.assertNotIn("gltf", sys.modules)
        self.assertNotIn("trimesh", sys.modules)


class GlbStructureTests(unittest.TestCase):
    def test_round_trip_is_exact(self) -> None:
        document = simple_document(12)
        binary = bytes(range(12))
        data = td.build_glb(document, binary)
        record = td.validate_glb(data)
        self.assertEqual(record["status"], "VALID")
        self.assertEqual(record["document"], document)
        self.assertEqual(record["byte_length"], len(data))
        self.assertEqual(record["header"], {"magic": "glTF", "version": 2, "length": len(data)})
        self.assertEqual(record["json_chunk"]["header_offset"], 12)
        self.assertEqual(record["json_chunk"]["data_offset"], 20)
        chunk_record = record["bin_chunks"][0]
        self.assertEqual(chunk_record["body"], binary)
        self.assertEqual(chunk_record["declared_byte_length"], 12)
        self.assertFalse(chunk_record["padding_nonzero"])
        self.assertEqual(record["asset_version"], "2.0")
        self.assertEqual(record["counts"]["accessors"], 1)
        rebuilt = td.build_glb(record["document"], record["bin_chunks"][0]["body"])
        self.assertEqual(rebuilt, data)

    def test_padding_is_applied_and_reported(self) -> None:
        document = {"asset": {"version": "2.0"}}
        data = td.build_glb(document, b"\x01\x02\x03")
        record = td.validate_glb(data)
        payload = json.dumps(document, separators=(",", ":"))
        self.assertEqual(record["json_chunk"]["padding"], (-len(payload)) % 4)
        self.assertEqual(record["bin_chunks"][0]["length"], 4)
        self.assertIsNone(record["bin_chunks"][0]["declared_byte_length"])
        self.assertEqual(record["bin_chunks"][0]["body"], b"\x01\x02\x03\x00")
        self.assertEqual(record["bin_chunks"][0]["data"][:3], b"\x01\x02\x03")
        self.assertFalse(record["bin_chunks"][0]["padding_nonzero"])

    def test_header_violations_carry_the_exact_offset(self) -> None:
        cases = [
            (b"glTF", "GLB_HEADER_TRUNCATED", 0),
            (b"gLTF" + struct.pack("<II", 2, 12), "GLB_HEADER_MAGIC", 0),
            (b"glTF" + struct.pack("<II", 1, 12), "GLB_HEADER_VERSION", 4),
            (b"glTF" + struct.pack("<II", 2, 99), "GLB_HEADER_LENGTH", 8),
        ]
        for payload, code, offset in cases:
            with self.subTest(code=code):
                with self.assertRaises(MediaError) as caught:
                    td.validate_glb(payload)
                self.assertEqual(caught.exception.code, code)
                self.assertIn(f"offset={offset}:", str(caught.exception))
        with self.assertRaises(MediaError) as not_bytes:
            td.validate_glb("glTF")
        self.assertEqual(not_bytes.exception.code, "GLB_INPUT_NOT_BYTES")

    def test_chunk_table_violations(self) -> None:
        good_json = chunk(JSON_TYPE, padded(MINIMAL_JSON))
        after_json = 12 + len(good_json)
        # chunk length is not 4-byte aligned
        misaligned = container(struct.pack("<II", 5, JSON_TYPE) + b"abcde")
        # chunk length runs past the end of the container
        overrun = container(struct.pack("<II", 100, JSON_TYPE) + b"abcd")
        # a second JSON chunk
        second_json = container(good_json, chunk(JSON_TYPE, b"{}  "))
        # a BIN chunk before the JSON chunk
        bin_first = container(chunk(BIN_TYPE, b"\x00\x00\x00\x00"), good_json)
        # an unknown chunk type
        unknown = container(good_json, chunk(0x12345678, b"\x00\x00\x00\x00"))
        # fewer than 8 trailing bytes after the JSON chunk
        trailing = container(good_json) + b"\x00\x00\x00\x00"
        trailing = trailing[:8] + struct.pack("<I", len(trailing)) + trailing[12:]
        cases = [
            (misaligned, "GLB_CHUNK_ALIGNMENT", 12),
            (overrun, "GLB_CHUNK_BOUNDS", 12),
            (second_json, "GLB_CHUNK_ORDER", after_json),
            (bin_first, "GLB_CHUNK_ORDER", 12),
            (unknown, "GLB_CHUNK_TYPE_UNKNOWN", after_json),
            (trailing, "GLB_CHUNK_HEADER_TRUNCATED", len(trailing) - 4),
        ]
        for payload, code, offset in cases:
            with self.subTest(code=code):
                with self.assertRaises(MediaError) as caught:
                    td.validate_glb(payload)
                self.assertEqual(caught.exception.code, code)
                self.assertIn(f"offset={offset}:", str(caught.exception))

    def test_missing_json_chunk(self) -> None:
        payload = container(chunk(BIN_TYPE, b"\x00\x00\x00\x00"))
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(payload)
        self.assertEqual(caught.exception.code, "GLB_CHUNK_ORDER")
        truncated_to_bin_only = b"glTF" + struct.pack("<II", 2, 12)
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(truncated_to_bin_only)
        self.assertEqual(caught.exception.code, "GLB_JSON_CHUNK_MISSING")

    def test_json_chunk_violations(self) -> None:
        bad_utf8 = container(chunk(JSON_TYPE, b"\xff\xfe\xfd\xfc"))
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(bad_utf8)
        self.assertEqual(caught.exception.code, "GLB_JSON_ENCODING")
        self.assertIn("offset=20:", str(caught.exception))

        bad_json = container(chunk(JSON_TYPE, padded(b"{not json}")))
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(bad_json)
        self.assertEqual(caught.exception.code, "GLB_JSON_PARSE")
        self.assertIn("offset=20:", str(caught.exception))

        not_object = container(chunk(JSON_TYPE, padded(b"[1,2,3,4]")))
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(not_object)
        self.assertEqual(caught.exception.code, "GLB_JSON_NOT_OBJECT")

        null_padded = container(chunk(JSON_TYPE, padded(MINIMAL_JSON, b"\x00")))
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(null_padded)
        self.assertEqual(caught.exception.code, "GLB_JSON_PARSE")

    def test_reference_integrity_inside_glb(self) -> None:
        document = simple_document(12)
        document["buffers"].append({"byteLength": 4})
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(td.build_glb(document, b"\x00" * 12))
        self.assertEqual(caught.exception.code, "GLB_BUFFER_BINARY_CHUNK_MISSING")

        too_long = simple_document(64)
        data = td.build_glb(too_long, b"\x00" * 12)
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(data)
        self.assertEqual(caught.exception.code, "GLB_BUFFER_BYTELENGTH_EXCEEDS_CHUNK")
        self.assertIn("offset=", str(caught.exception))
        self.assertIn("byteLength 64 exceeds BIN chunk 0 length 12", str(caught.exception))

        bad_view = simple_document(12)
        bad_view["bufferViews"][0]["buffer"] = 3
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(td.build_glb(bad_view, b"\x00" * 12))
        self.assertEqual(caught.exception.code, "GLTF_BUFFERVIEW_BUFFER_INDEX")

        out_of_range = simple_document(12)
        out_of_range["bufferViews"][0]["byteOffset"] = 8
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(td.build_glb(out_of_range, b"\x00" * 12))
        self.assertEqual(caught.exception.code, "GLTF_BUFFERVIEW_RANGE")

        bad_accessor = simple_document(12)
        bad_accessor["accessors"][0]["bufferView"] = 7
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(td.build_glb(bad_accessor, b"\x00" * 12))
        self.assertEqual(caught.exception.code, "GLTF_ACCESSOR_BUFFERVIEW_INDEX")

        no_view = simple_document(12)
        del no_view["accessors"][0]["bufferView"]
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(td.build_glb(no_view, b"\x00" * 12))
        self.assertEqual(caught.exception.code, "GLTF_ACCESSOR_BUFFERVIEW_MISSING")

        accessor_overrun = simple_document(12)
        accessor_overrun["accessors"][0]["count"] = 4
        with self.assertRaises(MediaError) as caught:
            td.validate_glb(td.build_glb(accessor_overrun, b"\x00" * 12))
        self.assertEqual(caught.exception.code, "GLTF_ACCESSOR_RANGE")

    def test_sparse_accessor_without_a_buffer_view_is_accepted(self) -> None:
        document = simple_document(12)
        document["accessors"] = [
            {
                "componentType": 5126,
                "count": 1,
                "type": "VEC3",
                "sparse": {
                    "count": 1,
                    "indices": {"bufferView": 0, "componentType": 5125},
                    "values": {"bufferView": 0},
                },
            }
        ]
        record = td.validate_glb(td.build_glb(document, b"\x00" * 12))
        self.assertEqual(record["status"], "VALID")

    def test_asset_member_is_required(self) -> None:
        with self.assertRaises(MediaError) as missing:
            td.validate_glb(td.build_glb({"scenes": []}))
        self.assertEqual(missing.exception.code, "GLTF_ASSET_MISSING")
        with self.assertRaises(MediaError) as version:
            td.validate_glb(td.build_glb({"asset": {"version": "1.0"}}))
        self.assertEqual(version.exception.code, "GLTF_ASSET_VERSION")

    def test_diagnose_reports_instead_of_raising(self) -> None:
        good = td.diagnose_glb(td.build_glb({"asset": {"version": "2.0"}}))
        self.assertTrue(good["valid"])
        self.assertIsNone(good["error"])
        bad = td.diagnose_glb(b"nope")
        self.assertFalse(bad["valid"])
        self.assertIn("GLB_HEADER_TRUNCATED", bad["error"])


class GltfJsonTests(unittest.TestCase):
    def test_uri_buffers_are_declared_external_assets_not_resolved(self) -> None:
        document = simple_document(12)
        document["buffers"] = [{"byteLength": 12, "uri": "scene.bin"}]
        record = td.validate_gltf_json(document)
        self.assertEqual(record["status"], "VALID")
        self.assertEqual(record["container"], "gltf")
        self.assertIsNone(record["byte_length"])
        self.assertIsNone(record["json_chunk"])
        self.assertEqual(record["bin_chunks"], [])
        self.assertEqual(
            record["external_assets"],
            [
                {
                    "kind": "buffer",
                    "index": 0,
                    "uri": "scene.bin",
                    "byteLength": 12,
                    "resolution": "NOT_PROBED",
                    "note": "declared external asset; never resolved or fetched",
                }
            ],
        )

    def test_buffer_without_uri_is_refused_without_a_bin_chunk(self) -> None:
        with self.assertRaises(MediaError) as caught:
            td.validate_gltf_json(simple_document(12))
        self.assertEqual(caught.exception.code, "GLTF_BUFFER_REQUIRES_URI")
        self.assertIn("offset=0:", str(caught.exception))

    def test_unsafe_and_embedded_uris_are_refused(self) -> None:
        for uri, code in (
            ("D:/assets/scene.bin", "GLTF_BUFFER_URI_UNSAFE"),
            ("/assets/scene.bin", "GLTF_BUFFER_URI_UNSAFE"),
            ("../scene.bin", "GLTF_BUFFER_URI_UNSAFE"),
            ("assets\\\\scene.bin", "GLTF_BUFFER_URI_UNSAFE"),
            ("data:application/octet-stream;base64,AAAA", "GLTF_BUFFER_URI_DATA_URI_UNSUPPORTED"),
            ("", "GLTF_BUFFER_URI_INVALID"),
        ):
            with self.subTest(uri=uri):
                document = simple_document(12)
                document["buffers"] = [{"byteLength": 12, "uri": uri}]
                with self.assertRaises(MediaError) as caught:
                    td.validate_gltf_json(document)
                self.assertEqual(caught.exception.code, code)

    def test_gltf_reference_integrity(self) -> None:
        document = simple_document(12)
        document["buffers"] = [{"byteLength": 12, "uri": "scene.bin"}]
        broken = json.loads(json.dumps(document))
        broken["bufferViews"][0]["buffer"] = 5
        with self.assertRaises(MediaError) as caught:
            td.validate_gltf_json(broken)
        self.assertEqual(caught.exception.code, "GLTF_BUFFERVIEW_BUFFER_INDEX")
        broken_view = json.loads(json.dumps(document))
        broken_view["bufferViews"][0]["byteLength"] = 4096
        with self.assertRaises(MediaError) as caught:
            td.validate_gltf_json(broken_view)
        self.assertEqual(caught.exception.code, "GLTF_BUFFERVIEW_RANGE")
        broken_accessor = json.loads(json.dumps(document))
        broken_accessor["accessors"][0]["bufferView"] = 9
        with self.assertRaises(MediaError) as caught:
            td.validate_gltf_json(broken_accessor)
        self.assertEqual(caught.exception.code, "GLTF_ACCESSOR_BUFFERVIEW_INDEX")
        not_object = []
        with self.assertRaises(MediaError) as caught:
            td.validate_gltf_json(not_object)
        self.assertEqual(caught.exception.code, "GLTF_DOCUMENT_NOT_OBJECT")


if __name__ == "__main__":
    unittest.main()
