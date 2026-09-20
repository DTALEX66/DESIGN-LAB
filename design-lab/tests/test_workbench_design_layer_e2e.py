# SPDX-License-Identifier: MIT
"""E-SLICE-02 browser E2E: drive the Workbench 05 design layer slice in a real
Chromium served by the real Python loopback service (E2 controlled-runtime).

This is the browser-level E2E the workbench-gate CI comment says is owned by
the E-slice gate ("NOT silently dropped"). It proves the vertical slice
(Project -> Brief -> Direction -> DesignSystem) works end-to-end through the
committed `build/main.js` in a real browser, against the live API. It claims
E2 controlled-runtime evidence only — not an E3 host run or an E4 human jury.

Toolchain is PROBE-driven so a clean CI checkout (which lacks the gitignored
in-repo Playwright npm-cache and the pre-installed Chromium) skips HONESTLY
rather than faking a pass: if `node` + the in-repo `playwright` npm-cache + a
locally installed Chromium are all present, the real browser drives the slice
and the test asserts the persisted DOM readback; otherwise it skips with the
exact reason it is unavailable.

P0-G evidence chain: when the toolchain is present the browser driver also
writes a machine-readable `browser-e2e-summary.json` (+ `fail.png` on failure)
into `.project-local/task-artifacts/browser-e2e/` (override: $E2E_EVIDENCE_DIR).
With `E2E_REQUIRED=1` (the CI no-skip job) a run must leave a PASS summary
behind; locally the test stays honest — a missing summary is never a failure,
the honest local answer is the skip reason, not an evidence gap.
"""
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

ROOT = Path(__file__).resolve().parents[2]
NODE_SCRIPT = Path(__file__).resolve().parent / 'e2e' / 'browser_design_layer_e2e.mjs'


def _find_node_modules_dir():
    """Return the directory that CONTAINS a `node_modules/playwright`, or None.

    `E2E_NODE_MODULES` wins; otherwise discover the in-repo gitignored npx
    cache (a hash-suffixed dir under the playwright task-runtime root).
    """
    override = os.environ.get('E2E_NODE_MODULES')
    if override and (Path(override) / 'node_modules' / 'playwright').is_dir():
        return Path(override)
    npx_root = ROOT / '.project-local' / 'task-runtime' / 'playwright' / 'npm-cache' / '_npx'
    if npx_root.is_dir():
        for child in npx_root.iterdir():
            if (child / 'node_modules' / 'playwright').is_dir():
                return child
    return None


def _find_browser():
    """Return a locally installed Chromium executable, or None.

    `E2E_BROWSER` wins; otherwise scan the per-user ms-playwright registries
    for the newest chromium revision (headless shell preferred, falls back to
    full Chromium). Returning None means the browser E2E cannot run here.
    """
    override = os.environ.get('E2E_BROWSER')
    if override and Path(override).is_file():
        return Path(override)
    roots = []
    local_appdata = os.environ.get('LOCALAPPDATA')
    if local_appdata:
        roots.append(Path(local_appdata) / 'ms-playwright')
    roots.append(Path.home() / '.cache' / 'ms-playwright')
    for root in roots:
        if not root.is_dir():
            continue
        for name in sorted(root.iterdir(), reverse=True):
            if name.name.startswith(('chromium_headless_shell-', 'chromium-')):
                exe_names = {'chrome-headless-shell.exe', 'chrome-headless-shell',
                             'chrome.exe', 'chrome'}
                for candidate in sorted(name.rglob('*'), reverse=True):
                    if candidate.is_file() and candidate.name in exe_names:
                        return candidate
    return None


class WorkbenchDesignLayerE2ETests(unittest.TestCase):
    def test_design_layer_slice_in_real_browser(self):
        if not NODE_SCRIPT.is_file():
            self.skipTest(f'E2E browser script missing: {NODE_SCRIPT}')
        node = shutil.which('node')
        if not node:
            self.skipTest('E2E toolchain unavailable: node not on PATH')
        node_modules_dir = _find_node_modules_dir()
        if not node_modules_dir:
            self.skipTest('E2E toolchain unavailable: in-repo Playwright npm-cache '
                          f'not found (probe $E2E_NODE_MODULES / '
                          f'{ROOT / ".project-local/task-runtime/playwright"})')
        browser = _find_browser()
        if not browser:
            self.skipTest('E2E toolchain unavailable: no locally installed Chromium '
                          'revision found (probe $E2E_BROWSER / ms-playwright registry)')

        # Spin up a real loopback service on an OS-chosen port, mirroring the
        # design-layer contract tests' harness (fresh project, in-memory token).
        sys.path.insert(0, str(ROOT / 'src'))
        from design_lab.service import ProjectService
        from design_lab.http_service import make_server
        from unittest.mock import patch
        parent = ROOT / '.project-local' / 'task-runtime' / 'e2e-design-layer'
        parent.mkdir(parents=True, exist_ok=True)
        tmp = tempfile.TemporaryDirectory(dir=parent)
        root = Path(tmp.name)
        (root / 'AGENTS.md').write_text('# synthetic e2e browser project', encoding='utf-8')
        token = secrets.token_hex(32)
        with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(root / '.project-local')}):
            service = ProjectService(str(root))
            server = make_server(service, token, port=0)
            port = server.server_address[1]
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                env = {
                    **os.environ,
                    'E2E_SERVICE_URL': f'http://127.0.0.1:{port}',
                    'E2E_TOKEN': token,
                    'E2E_NODE_MODULES': str(node_modules_dir),
                    'E2E_EVIDENCE_DIR': str(
                        ROOT / '.project-local' / 'task-artifacts' / 'browser-e2e'),
                }
                if browser:
                    env['E2E_BROWSER'] = str(browser)
                proc = subprocess.run(
                    [node, str(NODE_SCRIPT)],
                    env=env, capture_output=True, text=True, encoding='utf-8',
                    errors='replace', timeout=200, cwd=str(ROOT))
            finally:
                server.shutdown()
                worker.join()
                server.server_close()
                tmp.cleanup()
            if proc.returncode != 0:
                self.fail('E2E browser run exited %d (toolchain present, real failure):\n'
                          '--- stdout ---\n%s\n--- stderr ---\n%s'
                          % (proc.returncode, proc.stdout, proc.stderr))
            self.assertIn('E2E_OK', proc.stdout, 'E2E did not reach a full-slice readback:\n'
                                                  + proc.stdout + proc.stderr)
            # P0-G evidence chain: required mode (CI no-skip job, $E2E_REQUIRED=1)
            # must leave a machine-readable PASS summary behind; locally the test
            # stays honest — a missing summary is NOT a failure (the honest answer
            # on a toolchain-less checkout is the skip reason above, not a gap).
            if os.environ.get('E2E_REQUIRED') == '1':
                summary = ROOT / '.project-local' / 'task-artifacts' / 'browser-e2e' / \
                    'browser-e2e-summary.json'
                self.assertTrue(summary.is_file(),
                                'E2E_REQUIRED but no evidence summary written: '
                                f'{summary}')
                payload = json.loads(summary.read_text(encoding='utf-8'))
                self.assertEqual(payload.get('kind'), 'workbench-browser-e2',
                                 'E2E summary kind drifted: ' + str(payload.get('kind')))
                self.assertEqual(payload.get('result'), 'PASS',
                                 'E2E summary is not a PASS run: '
                                 + summary.read_text(encoding='utf-8'))

    def test_e2e_script_is_lint_clean(self):
        # The browser driver must be a parseable ESM module; guard against a
        # stray syntax edit by loading it through node's parser only when the
        # toolchain is present (a syntax error here would otherwise surface
        # only mid-run).
        if not NODE_SCRIPT.is_file():
            self.skipTest(f'E2E browser script missing: {NODE_SCRIPT}')
        node = shutil.which('node')
        if not node:
            self.skipTest('node not on PATH')
        proc = subprocess.run([node, '--check', str(NODE_SCRIPT)],
                              capture_output=True, text=True, encoding='utf-8',
                              errors='replace', timeout=60, cwd=str(ROOT))
        self.assertEqual(proc.returncode, 0, 'E2E browser script syntax check failed: '
                                              + proc.stderr)


if __name__ == '__main__':
    unittest.main()
