# SPDX-License-Identifier: MIT
"""DL-TP-R2-016: doctor tests."""
from __future__ import annotations
import sys, unittest
from pathlib import Path
SRC = Path(__file__).resolve().parents[2] / 'src'
sys.path.insert(0, str(SRC))


class DoctorTests(unittest.TestCase):
    def test_probe_git_found(self):
        from design_lab.runtime.doctor import probe_tools
        st = {s.tool: s for s in probe_tools()}
        self.assertIn('git', st)
        self.assertTrue(st['git'].found)  # git exists in this environment

    def test_drift_field_present(self):
        from design_lab.runtime.doctor import probe_tools
        for s in probe_tools():
            self.assertIsInstance(s.drift, list)


if __name__ == '__main__':
    unittest.main()
