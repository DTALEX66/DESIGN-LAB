# SPDX-License-Identifier: MIT
"""Theme affordance gate: the palette buttons must change what is painted, and the URL they
write must reload as a page.

Companion to `test_workbench_theme_tokens.py` (which proves the stylesheet's registered numbers
are read by some rule) and `test_workbench_theme_geometry_gate.py` (which proves the optional
palette moves geometry when the attributes are set). This one is the only gate that *clicks*:
the DOT audit finding D13 was invisible to both, because the vm contract suite never asserted a
theme change and the capture driver sets the <html> attributes itself, so it renders the alternate
palette without the product path ever having worked.

Harness is the same as the other browser gates: synthetic project root, OS-chosen port, in-memory
token, PROBE-driven honest skips when the toolchain is absent, and `verify_browser_e2e_ran.py`
enforcing the no-skip policy in CI.

Passing here means four separate things were observed, and each is asserted rather than implied:
the control existed, the applied palette changed after the click, the computed colour values moved
between the two palettes, and `?palette=ui2026&scheme=light` answered 200.
"""
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

_TESTS_DIR = Path(__file__).resolve().parent
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

from test_workbench_design_layer_e2e import _find_browser, _find_node_modules_dir  # noqa: E402

ROOT = _TESTS_DIR.parents[1]
GATE_SCRIPT = _TESTS_DIR / 'e2e' / 'audit_workbench_theme_affordance.mjs'


def _evidence_dir():
    override = os.environ.get('E2E_EVIDENCE_DIR')
    if override:
        return Path(override)
    return ROOT / '.project-local' / 'task-artifacts' / 'browser-e2e'


class WorkbenchThemeAffordanceGateTests(unittest.TestCase):
    def test_clicking_the_theme_control_changes_the_painted_page(self):
        if not GATE_SCRIPT.is_file():
            self.skipTest(f'affordance gate script missing: {GATE_SCRIPT}')
        node = shutil.which('node')
        if not node:
            self.skipTest('E2E toolchain unavailable: node not on PATH')
        node_modules_dir = _find_node_modules_dir()
        if not node_modules_dir:
            self.skipTest('E2E toolchain unavailable: no resolvable `playwright`')
        browser = _find_browser()
        if not browser:
            self.skipTest('E2E toolchain unavailable: no locally installed Chromium')

        sys.path.insert(0, str(ROOT / 'src'))
        from design_lab.service import ProjectService
        from design_lab.http_service import make_server

        parent = ROOT / '.project-local' / 'task-runtime' / 'e2e-theme-affordance'
        parent.mkdir(parents=True, exist_ok=True)
        tmp = tempfile.TemporaryDirectory(dir=parent)
        root = Path(tmp.name)
        (root / 'AGENTS.md').write_text('# synthetic theme-affordance-gate project', encoding='utf-8')
        token = secrets.token_hex(32)
        evidence = _evidence_dir()
        evidence.mkdir(parents=True, exist_ok=True)
        report_path = evidence / 'workbench-theme-affordance-gate.json'
        log_path = parent / 'theme-affordance.log'

        with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(root / '.project-local')}):
            service = ProjectService(str(root))
            server = make_server(service, token, port=0)
            port = server.server_address[1]
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                env = {**os.environ,
                       'E2E_SERVICE_URL': f'http://127.0.0.1:{port}',
                       'E2E_TOKEN': token,
                       'E2E_NODE_MODULES': str(node_modules_dir),
                       'E2E_BROWSER': str(browser),
                       'AFF_OUT': str(report_path),
                       'AFF_SHOTS': str(evidence / 'affordance-shots')}
                with open(log_path, 'w', encoding='utf-8') as logf:
                    proc = subprocess.Popen([node, str(GATE_SCRIPT)], env=env, stdout=logf,
                                            stderr=subprocess.STDOUT, cwd=str(ROOT))
                    try:
                        code = proc.wait(timeout=180)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        self.fail('E2E_AFFORDANCE_TIMEOUT: the gate did not finish in 180s')
                with open(log_path, encoding='utf-8', errors='replace') as fh:
                    out = fh.read()
            finally:
                server.shutdown()
                worker.join()
                server.server_close()
                tmp.cleanup()

        summary = next((line for line in out.splitlines()
                        if line.startswith('AFF_SUMMARY')), out[-800:])
        if code != 0:
            self.fail(f'THEME_AFFORDANCE_GATE_FAILED (exit {code})\n{summary}\n--- output ---\n'
                      f'{out[-3000:]}')
        self.assertIn('AFF_OK', out, f'gate exited 0 without AFF_OK:\n{out[-2000:]}')
        self.assertTrue(report_path.is_file(), f'no report at {report_path}')

        report = json.loads(report_path.read_text(encoding='utf-8'))
        self.assertEqual(report['findings'], [],
                         f'gate reported findings while exiting 0: {report["findings"]}')
        for field, disk in (('styleSha256', (ROOT / 'apps/workbench/style.css').read_bytes()),
                            ('bundleSha256', (ROOT / 'apps/workbench/build/main.js').read_bytes())):
            self.assertEqual(report['subject'][field], hashlib.sha256(disk).hexdigest(),
                             f'{field} in the receipt does not match the bytes on disk')

        # Non-vacuity: the click must have been observed changing the applied palette, and the
        # themed reload must have actually been requested. A report where nothing moved and
        # nothing was refuted is a scan that matched nothing, not a pass.
        measures = report['measures']
        self.assertIn('afterPaletteClick', measures,
                      'no palette click was measured -- the control was never driven')
        self.assertNotEqual(measures['plainBeforeClick']['palette'],
                            measures['afterPaletteClick']['palette'],
                            'the applied palette did not change, yet the gate reported no finding')
        self.assertNotEqual(measures['plainBeforeClick']['bodyBg'],
                            measures['afterPaletteClick']['bodyBg'],
                            'the painted background did not change after the palette click')
        self.assertTrue(any('200' in s and 'palette=ui2026' in s for s in report['statuses']),
                        f'the themed reload was never answered 200: {report["statuses"]}')


if __name__ == '__main__':
    unittest.main()
