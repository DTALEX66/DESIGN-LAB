# SPDX-License-Identifier: MIT
"""DL-TP-T06: model-cache probe tests (fail-closed, read-only).

Uses synthetic cache directories so no real model is required. Verifies the
README/INCOMPLETE/ABSENT classification and that the OCR backend only reports
READY when both det and rec bytes are present.
"""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
import sys

SRC = Path(__file__).resolve().parents[2] / "src"
sys.path.insert(0, str(SRC))


class ModelCacheProbeTests(unittest.TestCase):
    def _probe(self):
        from design_lab.analysis.model_cache import ModelCacheProbe

        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        return ModelCacheProbe(hf_home=root / "hf", modelscope_home=root / "ms")

    def _make_repo(self, probe, repo_id, *, snapshots=False, blobs=False, refs=False):
        hub = probe.hf_hub / ("models--" + repo_id.replace("/", "--"))
        hub.mkdir(parents=True, exist_ok=True)
        if snapshots:
            (hub / "snapshots" / "abc").mkdir(parents=True)
            (hub / "snapshots" / "abc" / "model.bin").write_text("bytes")
        if blobs:
            (hub / "blobs").mkdir(parents=True)
            (hub / "blobs" / "file1").write_text("x")
        if refs:
            (hub / "refs").mkdir(parents=True)
            (hub / "refs" / "main").write_text("abc")
        return hub

    def test_ready_when_snapshots_and_blobs(self):
        p = self._probe()
        self._make_repo(p, "org/model", snapshots=True, blobs=True)
        self.assertEqual(p.hf_readiness(p.hf_hub / "models--org--model"), "READY")

    def test_incomplete_when_refs_only(self):
        p = self._probe()
        self._make_repo(p, "org/model", refs=True)
        self.assertEqual(p.hf_readiness(p.hf_hub / "models--org--model"), "INCOMPLETE")

    def test_absent(self):
        p = self._probe()
        self.assertEqual(p.hf_readiness(p.hf_hub / "models--org--missing"), "ABSENT")

    def test_ocr_ready_only_with_both_det_and_rec(self):
        from design_lab.analysis.model_cache import ocr_backend_ready

        p = self._probe()
        # only det present -> NOT_READY
        self._make_repo(p, "PaddlePaddle/PP-OCRv6_medium_det", snapshots=True, blobs=True)
        verdict = ocr_backend_ready(p)
        self.assertFalse(verdict.ready)
        # add rec -> READY
        self._make_repo(p, "PaddlePaddle/PP-OCRv6_medium_rec", snapshots=True, blobs=True)
        verdict = ocr_backend_ready(p)
        self.assertTrue(verdict.ready)
        self.assertEqual(verdict.status, "READY")

    def test_asr_ready_when_any_variant_ready(self):
        from design_lab.analysis.model_cache import asr_backend_ready

        p = self._probe()
        self._make_repo(p, "Systran/faster-whisper-base", snapshots=True, blobs=True)
        self.assertTrue(asr_backend_ready(p).ready)


if __name__ == "__main__":
    unittest.main()
