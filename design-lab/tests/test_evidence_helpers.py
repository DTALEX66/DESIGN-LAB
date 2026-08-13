# SPDX-License-Identifier: MIT
"""Unit tests for DL-EVD-001 / DL-REL-001 helper tools:
- update_evidence_binding.py (boundTree freshness/ancestry logic)
- score_artifact.py (weighted scoring + ACCEPT/REVISE/REJECT)
- verify_sbom.py (SPDX integrity + vendored coverage)
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"


def load(name: str):
    path = SCRIPTS / name
    spec = importlib.util.spec_from_file_location(name.replace(".py", ""), path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class UpdateEvidenceBindingTests(unittest.TestCase):
    def test_check_accepts_ancestor(self):
        """boundTree == HEAD or any ancestor must pass (multi-merge safe)."""
        m = load("update_evidence_binding.py")
        head = m.git_head()
        self.assertTrue(head, "git HEAD must resolve")
        # simulate check() with current boundTree read from disk
        findings = m.check()
        self.assertEqual(findings, [], f"expected OK on real tree: {findings}")

    def test_check_rejects_foreign_sha(self):
        """A boundTree that is NOT an ancestor of HEAD must fail closed."""
        m = load("update_evidence_binding.py")
        # patch INDEX contents in-memory to a foreign SHA
        orig = m.INDEX.read_text(encoding="utf-8")
        data = json.loads(orig)
        data["boundTree"] = "0" * 40
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
                json.dump(data, f)
                tmp = Path(f.name)
            m.INDEX = tmp
            findings = m.check()
            self.assertTrue(any("STALE" in f for f in findings), f"expected STALE: {findings}")
        finally:
            m.INDEX = ROOT / "config" / "capability-evidence-index.json"
            tmp.unlink(missing_ok=True)


class ScoreArtifactTests(unittest.TestCase):
    RUBRIC = ROOT / "evals" / "rubrics" / "3d.rubric.json"

    def _sheet(self, scores: dict) -> Path:
        fd, name = tempfile.mkstemp(suffix=".json")
        with open(fd, "w", encoding="utf-8") as f:
            json.dump({"artifact": "test/x.blend", "reviewer": "tester", "scores": scores}, f)
        return Path(name)

    def test_accept(self):
        m = load("score_artifact.py")
        rubric = json.loads(self.RUBRIC.read_text(encoding="utf-8"))
        scores = {ax["id"]: 9.0 for ax in rubric["axes"]}
        sheet = self._sheet(scores)
        try:
            result, code = m.score(self.RUBRIC, sheet)
            self.assertEqual(code, 0)
            self.assertEqual(result["verdict"], "ACCEPT")
            self.assertEqual(result["weighted_score"], 9.0)
        finally:
            sheet.unlink(missing_ok=True)

    def test_reject(self):
        m = load("score_artifact.py")
        rubric = json.loads(self.RUBRIC.read_text(encoding="utf-8"))
        scores = {ax["id"]: 5.0 for ax in rubric["axes"]}
        sheet = self._sheet(scores)
        try:
            result, code = m.score(self.RUBRIC, sheet)
            self.assertEqual(code, 0)
            self.assertEqual(result["verdict"], "REJECT")
        finally:
            sheet.unlink(missing_ok=True)

    def test_missing_axis_fails_closed(self):
        m = load("score_artifact.py")
        rubric = json.loads(self.RUBRIC.read_text(encoding="utf-8"))
        scores = {ax["id"]: 9.0 for ax in rubric["axes"][:5]}
        sheet = self._sheet(scores)
        try:
            result, code = m.score(self.RUBRIC, sheet)
            self.assertEqual(code, 1)
            self.assertIn("missing", result.get("error", ""))
        finally:
            sheet.unlink(missing_ok=True)

    def test_out_of_range_fails_closed(self):
        m = load("score_artifact.py")
        rubric = json.loads(self.RUBRIC.read_text(encoding="utf-8"))
        scores = {ax["id"]: 11.0 for ax in rubric["axes"]}
        sheet = self._sheet(scores)
        try:
            result, code = m.score(self.RUBRIC, sheet)
            self.assertEqual(code, 1)
            self.assertIn("out of range", result.get("error", ""))
        finally:
            sheet.unlink(missing_ok=True)


class VerifySbomTests(unittest.TestCase):
    def test_sbom_valid(self):
        m = load("verify_sbom.py")
        findings = m.check()
        self.assertEqual(findings, [], f"expected SBOM OK: {findings}")


if __name__ == "__main__":
    unittest.main()
