# SPDX-License-Identifier: MIT
"""Behavioral contracts for closed Adobe reconstruction host jobs."""
from __future__ import annotations

import shutil
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "design-lab"))
sys.path.insert(0, str(PROJECT_ROOT / "packages" / "capabilities"))
RUNTIME_ROOT = PROJECT_ROOT / ".project-local" / "task-runtime" / "adobe-job-tests"


class AdobeHostJobTests(unittest.TestCase):
    def setUp(self) -> None:
        shutil.rmtree(RUNTIME_ROOT, ignore_errors=True)
        RUNTIME_ROOT.mkdir(parents=True)
        self.rir = {
            "schemaVersion": "design-lab/reconstruction-ir/v1",
            "canvas": {"width": 64, "height": 48, "colorSpace": "srgb"},
            "layers": [],
        }

    def tearDown(self) -> None:
        shutil.rmtree(RUNTIME_ROOT, ignore_errors=True)

    def test_job_targets_are_run_relative_and_hash_bound(self) -> None:
        """Changing the RIR or escaping the run root must invalidate the immutable host job."""
        from reconstruction.adobe_job import build_adobe_job, canonical_rir_hash

        job = build_adobe_job(self.rir, RUNTIME_ROOT)

        self.assertEqual(job.rir_hash, canonical_rir_hash(self.rir))
        self.assertTrue(all(path.is_relative_to(RUNTIME_ROOT) for path in job.target_paths()))
        self.assertEqual(job.artboard, {"width": 64, "height": 48, "colorSpace": "RGB"})

    def test_unknown_host_operation_is_rejected(self) -> None:
        """No job may invoke menu commands, shell execution, or an unlisted host action."""
        from reconstruction.adobe_job import AdobeJobError, build_adobe_job, validate_adobe_job

        job = build_adobe_job(self.rir, RUNTIME_ROOT).to_dict()
        job["operations"] = ["createDocument", "runMenuCommand"]

        with self.assertRaises(AdobeJobError):
            validate_adobe_job(job)


if __name__ == "__main__":
    unittest.main()
