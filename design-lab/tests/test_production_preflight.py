# SPDX-License-Identifier: MIT
"""DL C2: production preflight tests."""
from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


class ProductionPreflightTests(unittest.TestCase):
    def test_preflight_verifier_passes(self):
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_production_preflight.py")], capture_output=True, text=True)
        self.assertIn("PRODUCTION_PREFLIGHT=PASS", r.stdout, r.stdout + r.stderr)

    def test_three_profiles_exist(self):
        import json
        base = SCRIPTS.parent / "production/profiles"
        for name in ("preflight-print.json", "preflight-digital.json", "preflight-video.json"):
            data = json.loads((base / name).read_text(encoding="utf-8"))
            self.assertEqual(data["schemaVersion"], "design-lab/preflight/v2")


if __name__ == "__main__":
    unittest.main()
