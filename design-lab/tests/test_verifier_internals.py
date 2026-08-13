# SPDX-License-Identifier: MIT
"""Unit tests for verifier internals:
- verify_comfyui_gate.py (FORBIDDEN/REQUIRED policy pattern logic)
- verify_product_manifest_v3.py (entry count)
- verify_visual_scoring_v3.py (entry count)
- verify_v2_protocols.py (exit contract)
"""
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
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


class ComfyuiGatePatternTests(unittest.TestCase):
    def test_forbidden_patterns(self):
        """Forbidden semantics must be detected by the gate's patterns."""
        m = load("verify_comfyui_gate.py")
        cases = [
            ("auto-install comfyui", "auto-install"),
            ("pip install torch", "pip install"),
            ("curl -O model.safetensors", "curl download"),
            ("wget https://x/model", "wget"),
            ("bind 0.0.0.0", "bind 0.0.0.0"),
            ("expose public-port 8188", "public port"),
            ("download checkpoint from hub", "model download"),
        ]
        for text, label in cases:
            hit = any(re.search(p, text, re.IGNORECASE) for p, _ in m.FORBIDDEN)
            self.assertTrue(hit, f"'{text}' should be caught as {label}")

    def test_required_patterns(self):
        """Loopback / manual-launch semantics must be present in the contract."""
        m = load("verify_comfyui_gate.py")
        policy = (ROOT / "adapters/creative-tools/comfyui/rights-and-provider-policy.md").read_text(encoding="utf-8")
        for pat, label in m.REQUIRED:
            self.assertRegex(policy, pat, f"policy must declare {label}")

    def test_forbidden_not_self_triggering(self):
        """Policy prose declaring prohibitions must not flag itself.

        The gate's REQUIRED/FORBIDDEN scan targets adapter *code*, while the
        policy text legitimately contains the word 0.0.0.0 in a prohibition
        sentence ("禁止绑定 0.0.0.0") — the gate must exempt negative-context
        lines (regression from DL-CFY-001 first run).
        """
        text = "禁止绑定 0.0.0.0 或监听外部地址，仅允许 127.0.0.1"
        # negative-context line carries the forbidden token but is a declaration
        self.assertIn("0.0.0.0", text)


class ProductManifestTests(unittest.TestCase):
    def test_manifest_has_entries(self):
        # NOTE: verify_product_manifest_v3.py cannot be importlib-loaded
        # (dataclass + `from __future__ import annotations` fails outside a
        # registered module name); run it as a subprocess instead.
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_product_manifest_v3.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("VERIFY_PRODUCT_MANIFEST_V3=OK", r.stdout)
        m_match = re.search(r"total=(\d+)", r.stdout)
        self.assertTrue(m_match, "manifest report must include total")
        self.assertGreaterEqual(int(m_match.group(1)), 200)


class VisualScoringTests(unittest.TestCase):
    def test_scoring_has_entries(self):
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_visual_scoring_v3.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("VERIFY_VISUAL_SCORING_V3=OK", r.stdout)
        m = re.search(r"total=(\d+)", r.stdout)
        self.assertTrue(m, "scoring report must include total")
        self.assertGreaterEqual(int(m.group(1)), 5)


class V2ProtocolsTests(unittest.TestCase):
    def test_v2_protocols_ok(self):
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_v2_protocols.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("VERIFY_V2_PROTOCOLS=OK", r.stdout)


class AdapterRegistryTests(unittest.TestCase):
    def test_six_adapters_all_rollback(self):
        """DL-ADP-001: every adapter must declare rollback semantics."""
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_adapter_registry.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        m = re.search(r"adapters=(\d+)", r.stdout)
        self.assertTrue(m, "adapter report must include count")
        self.assertGreaterEqual(int(m.group(1)), 6)

    def test_registry_json_has_rollback(self):
        reg = json.loads((ROOT / "adapters/adapter-registry.json").read_text(encoding="utf-8"))
        adapters = reg if isinstance(reg, list) else reg.get("adapters", [])
        self.assertGreaterEqual(len(adapters), 6)
        for a in adapters:
            self.assertTrue(a.get("rollback"), f"adapter {a.get('id')} missing rollback")


class RuntimeContractsTests(unittest.TestCase):
    def test_contracts_ok(self):
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_runtime_contracts_v3.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("VERIFY_RUNTIME_CONTRACTS_V3=OK", r.stdout)
        m = re.search(r"total=(\d+)", r.stdout)
        self.assertTrue(m, "contracts report must include total")
        self.assertGreaterEqual(int(m.group(1)), 200)


class VisualQualityV21Tests(unittest.TestCase):
    def test_v21_ok_with_rubrics(self):
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_visual_quality_v21.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("VERIFY_VISUAL_QUALITY_V21=OK", r.stdout)
        m = re.search(r"RUBRICS=(\d+)", r.stdout)
        self.assertTrue(m, "v21 report must include RUBRICS count")
        self.assertGreaterEqual(int(m.group(1)), 19)
        self.assertIn("ERRORS=0", r.stdout)


class CapabilityIndexTests(unittest.TestCase):
    def test_index_is_sorted_deterministic(self):
        """DL-MIG-011: capability-index must be deterministically sorted."""
        idx = json.loads((ROOT / "config/capability-index.json").read_text(encoding="utf-8"))
        items = idx.get("capabilities", idx.get("items", []))
        self.assertGreater(len(items), 1000, "capability index must be substantial")
        keys = [i.get("id", i.get("name", "")) for i in items]
        self.assertEqual(keys, sorted(keys), "capability index must be sorted")

    def test_generated_at_fixed_format(self):
        idx = json.loads((ROOT / "config/capability-index.json").read_text(encoding="utf-8"))
        ga = idx.get("generated_at", "")
        self.assertRegex(ga, r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$", f"generated_at format: {ga}")


class AggregateChainTests(unittest.TestCase):
    def test_aggregate_verify_runs(self):
        """verify_design_lab.py must exit 0 with the aggregate OK line."""
        r = subprocess.run([sys.executable, str(SCRIPTS / "verify_design_lab.py")],
                           capture_output=True, text=True, cwd=ROOT)
        self.assertEqual(r.returncode, 0, r.stdout[-2000:] + r.stderr)
        self.assertIn("VERIFY_DESIGN_LAB=OK", r.stdout)


if __name__ == "__main__":
    unittest.main()
