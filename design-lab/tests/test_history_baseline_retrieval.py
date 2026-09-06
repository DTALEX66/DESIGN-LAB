# SPDX-License-Identifier: MIT
"""History baseline retrieval fixture (PR115 audit F09).

The frozen history artifacts (evidence manifest + task-id crosswalk CSVs) must
be present in the committed tree and byte-identical to the hashes sealed in
reports/history-baseline.json — otherwise the baseline is not retrievable.
"""
from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # repo root
BASELINE = ROOT / "reports" / "history-baseline.json"


class HistoryBaselineRetrievalTests(unittest.TestCase):
    def test_baseline_exists(self):
        self.assertTrue(BASELINE.is_file(), "reports/history-baseline.json missing")

    def test_frozen_csvs_exist_and_match_sealed_hashes(self):
        baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
        expected = {
            "historyManifestSha": "docs/history/DESIGN-LAB-HISTORY-EVIDENCE-MANIFEST-2026-09-04.csv",
            "historyCrosswalkSha": "docs/history/DESIGN-LAB-HISTORY-TASK-ID-CROSSWALK-2026-09-04.csv",
        }
        for key, rel in expected.items():
            sealed = baseline.get(key)
            self.assertTrue(sealed, f"{key} missing from history-baseline.json")
            path = ROOT / rel
            self.assertTrue(path.is_file(), f"baseline artifact not in tree: {rel}")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(digest, sealed, f"{rel} no longer matches sealed {key}")

    def test_crosswalk_retrievable_rows(self):
        csv = ROOT / "docs/history/DESIGN-LAB-HISTORY-TASK-ID-CROSSWALK-2026-09-04.csv"
        self.assertTrue(csv.is_file())
        header = csv.read_text(encoding="utf-8").splitlines()[0].lower()
        self.assertIn("occurrence", header)
        with csv.open(encoding="utf-8") as stream:
            self.assertGreaterEqual(sum(1 for _ in stream), 1000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
