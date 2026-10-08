# SPDX-License-Identifier: MIT
"""Workbench contrast gate: no rendered text may fall below WCAG 2.1 AA.

`design-lab/tests/e2e/audit_workbench_contrast.mjs` measures the real Workbench
in a real Chromium served by the real Python loopback service and fails on any
text run whose contrast against its painted background is under 4.5:1 (3:1 for
large text). Gradient backgrounds are resolved to their colour stops and the
worst stop is used, and ancestor opacity is composited in -- both are cases the
existing UI checks skip entirely.

This module is the CI-side harness. It mirrors
`test_workbench_overflow_gate.py` where it matters: a synthetic project root, an
OS-chosen port, an in-memory token, PROBE-driven honest skips when the toolchain
is absent, and a file-backed child process on Windows so a killed subprocess
cannot leave a pipe handle blocking. `verify_browser_e2e_ran.py` enforces the
no-skip policy across TEST_MODULES, so a skip turns the required job red instead
of quietly green.

FALSIFICATION RECORD (2026-10-06, this machine, real Chromium + real service):
  - the probe's WCAG reference table was mutated (#777777-on-#777777 expected 3:1
    instead of 1:1) -> "MATH ... got=1 want=3 WRONG", exit 1. The self-check is
    therefore not vacuous.
  - an earlier DOM-injection fixture was abandoned deliberately: the injected
    node's computed colour was not what the fixture set, so it proved the fixture
    rather than the gate. The maths is this gate's real failure mode, so the maths
    is what gets asserted.
  - two bugs the falsification caught first, either of which would have made the
    gate lie: background layers were composited inside-out, and an "or no stop at
    all" branch put an impossible background into the candidate set, so every
    gradient pill reported 1:1. 44 phantom offenders disappeared once both were
    fixed.
  - measured on the current build: checked=995 text runs, belowAA=0, mathBad=0.

It claims E2 controlled-runtime evidence only: contrast computed from what a real
browser painted, not an E3 host run and not an E4 human judgement about whether
the UI looks good.
"""
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
GATE_SCRIPT = _TESTS_DIR / 'e2e' / 'audit_workbench_contrast.mjs'
WIDTHS = os.environ.get('CT_WIDTHS', '1440,1920')


def _evidence_dir():
    override = os.environ.get('E2E_EVIDENCE_DIR')
    if override:
        return Path(override)
    return ROOT / '.project-local' / 'task-artifacts' / 'browser-e2e'


def _run_gate(env_extra):
    """Boot the real service on a synthetic root and run the probe once.

    Returns (exit_code, stdout, report_path) so every assertion shares one
    measurement rather than re-running the browser.
    """
    node = shutil.which('node')
    node_modules_dir = _find_node_modules_dir()
    browser = _find_browser()
    if not GATE_SCRIPT.is_file():
        raise unittest.SkipTest('contrast gate script missing: %s' % GATE_SCRIPT)
    if not node:
        raise unittest.SkipTest('E2E toolchain unavailable: node not on PATH')
    if not node_modules_dir:
        raise unittest.SkipTest('E2E toolchain unavailable: no resolvable `playwright`')
    if not browser:
        raise unittest.SkipTest('E2E toolchain unavailable: no locally installed Chromium')

    sys.path.insert(0, str(ROOT / 'src'))
    from design_lab.service import ProjectService
    from design_lab.http_service import make_server

    parent = ROOT / '.project-local' / 'task-runtime' / 'e2e-contrast-gate'
    parent.mkdir(parents=True, exist_ok=True)
    tmp = tempfile.TemporaryDirectory(dir=parent)
    root = Path(tmp.name)
    (root / 'AGENTS.md').write_text('# synthetic contrast-gate project', encoding='utf-8')
    token = secrets.token_hex(32)

    evidence = _evidence_dir()
    evidence.mkdir(parents=True, exist_ok=True)
    report_path = evidence / 'workbench-contrast-gate.json'
    log_path = parent / 'contrast-gate.log'

    with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(root / '.project-local')}):
        service = ProjectService(str(root))
        server = make_server(service, token, port=0)
        port = server.server_address[1]
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            env = {
                **os.environ,
                'E2E_SERVICE_URL': 'http://127.0.0.1:%d' % port,
                'E2E_TOKEN': token,
                'E2E_NODE_MODULES': str(node_modules_dir),
                'E2E_BROWSER': str(browser),
                'CT_WIDTHS': WIDTHS,
                'CT_STRICT': '1',
                'CT_OUT': str(report_path),
                **env_extra,
            }
            with open(log_path, 'w', encoding='utf-8') as logf:
                proc = subprocess.Popen([node, str(GATE_SCRIPT)], env=env, stdout=logf,
                                        stderr=subprocess.STDOUT, cwd=str(ROOT))
                try:
                    code = proc.wait(timeout=240)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    raise AssertionError('E2E_CONTRAST_TIMEOUT: gate did not finish in 240s')
            with open(log_path, encoding='utf-8', errors='replace') as fh:
                out = fh.read()
        finally:
            server.shutdown()
            worker.join()
            server.server_close()
            tmp.cleanup()
    return code, out, report_path


def _summary(out):
    line = next((l for l in out.splitlines() if l.startswith('CT_SUMMARY')), '')
    return dict(tok.split('=', 1) for tok in line.split()[1:] if '=' in tok)


class WorkbenchContrastGateTests(unittest.TestCase):
    def test_every_rendered_text_run_meets_aa(self):
        code, out, report_path = _run_gate({})
        if code != 0:
            low = [l for l in out.splitlines() if l.strip().startswith('LOWCONTRAST')]
            detail = '\n'.join(low[:25])
            self.fail('CONTRAST_GATE_FAILED (exit %d) widths=%s\n'
                      '--- first 25 offenders ---\n%s\n--- tail ---\n%s'
                      % (code, WIDTHS, detail, out[-1200:]))
        self.assertIn('CT_OK', out, 'gate exited 0 without CT_OK:\n%s' % out[-2000:])
        self.assertTrue(report_path.is_file(), 'gate produced no report at %s' % report_path)
        # A probe that measured nothing would also print CT_OK, so coverage is
        # asserted separately from the verdict.
        checked = int(_summary(out).get('checked', '0'))
        self.assertGreaterEqual(checked, 500,
                                'probe measured only %d text runs; coverage is suspect' % checked)
        # The gate plants a white-on-`color(srgb 1 1 1)` pair on every route. Chromium
        # serialises a resolved color-mix() that way, so a parser that cannot read it drops
        # the background and grades the text against the page instead -- a 21:1 pass on a
        # 1:1 pair. Both fields must stay at zero or the pass counts are not trustworthy.
        summary = _summary(out)
        self.assertEqual(summary.get('controlMisses'), '0',
                         'the parser control was not caught somewhere: %s' % summary)
        self.assertEqual(summary.get('unparsable'), '0',
                         'a colour the page computes could not be parsed, so at least one '
                         'background was dropped from the stack: %s' % summary)

    def test_contrast_maths_reference_table_is_satisfied(self):
        """The probe recomputes published WCAG 2.1 ratios with the same lum()/ratio()
        it applies to real text. If that table were skipped, the verdict above would
        be measuring a broken formula."""
        _code, out, _rep = _run_gate({})
        summary = _summary(out)
        self.assertEqual(summary.get('mathChecks'), '4',
                         'reference table did not run: %s' % summary)
        self.assertEqual(summary.get('mathBad'), '0',
                         'contrast maths disagrees with WCAG reference ratios: %s' % summary)


if __name__ == '__main__':
    unittest.main(verbosity=2)
