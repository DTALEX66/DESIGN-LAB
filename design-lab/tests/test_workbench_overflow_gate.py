# SPDX-License-Identifier: MIT
"""Workbench overflow gate: no text may be silently clipped or unreachable.

`design-lab/tests/e2e/audit_workbench_overflow.mjs` measures the rendered
Workbench in a real Chromium served by the real Python loopback service and
fails on CLIPPED (content wider than its clipping box) and STRAY (painted past
the viewport with no scrollable ancestor). In strict mode it also fails on body
text below 11px.

This module is the CI-side harness for that gate. It mirrors
`test_workbench_design_layer_e2e.py` exactly where it matters: a synthetic
project root, an OS-chosen port, an in-memory token, and PROBE-driven honest
skips when the toolchain is absent. `verify_browser_e2e_ran.py` enforces the
no-skip policy, so a skip turns the required job red instead of quietly green.

The gate was FALSIFIED before being trusted (project iron rule), measured
2026-10-06 in this same CI-shaped configuration:

  - pre-fix checkout (main `f2172744`)  -> OV_SUMMARY clipped=5 stray=8 tiny=70, exit 1
  - post-fix checkout (audit commit)    -> OV_SUMMARY clipped=0 stray=0 tiny=0, exit 0

so the job is not green merely because the synthetic fixture renders an empty
UI. It claims E2 controlled-runtime evidence only — geometry measured in a real
browser, not an E3 host run, not an E4 human visual jury, and no claim that the
UI looks good.
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

_TESTS_DIR = Path(__file__).resolve().parent
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

from test_workbench_design_layer_e2e import _find_browser, _find_node_modules_dir  # noqa: E402

ROOT = _TESTS_DIR.parents[1]
GATE_SCRIPT = _TESTS_DIR / 'e2e' / 'audit_workbench_overflow.mjs'
WIDTHS = os.environ.get('OV_WIDTHS', '1440,1280,1920')


def _evidence_dir():
    override = os.environ.get('E2E_EVIDENCE_DIR')
    if override:
        return Path(override)
    return ROOT / '.project-local' / 'task-artifacts' / 'browser-e2e'


def vucc_utility_names():
    """The class names the static conflict gate guards.

    Both guards must cover the same set: if the stylesheet gains a utility that only one of them
    knows about, the other silently stops being relevant and nothing says so.
    """
    import importlib.util
    script = ROOT / 'scripts' / 'verify_utility_class_conflicts.py'
    spec = importlib.util.spec_from_file_location('verify_utility_class_conflicts', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return sorted(module.UTILITIES)


class WorkbenchOverflowGateTests(unittest.TestCase):
    def _run_gate(self, report_name, theme_env=None):
        """Boot the real service, run the audit once, and hand back what it printed.

        Factored out because the theme is a parameter of this gate, not of the browser: the
        stylesheet re-points the neutral family per `data-palette`/`data-scheme`, so the same
        layout can collapse under one theme and hold under another. Only the default theme was
        ever measured here, while the contrast and theme-geometry gates already sweep more than
        one -- an unmeasured theme is an unshipped theme.
        """
        node = shutil.which('node')
        if not node:
            self.skipTest('E2E toolchain unavailable: node not on PATH')
        node_modules_dir = _find_node_modules_dir()
        if not node_modules_dir:
            self.skipTest('E2E toolchain unavailable: no resolvable `playwright` '
                          '(probe $E2E_NODE_MODULES / '
                          f'{ROOT / ".project-local/task-runtime/playwright"})')
        browser = _find_browser()
        if not browser:
            self.skipTest('E2E toolchain unavailable: no locally installed Chromium '
                          'revision found (probe $E2E_BROWSER / ms-playwright registry)')

        sys.path.insert(0, str(ROOT / 'src'))
        from design_lab.service import ProjectService
        from design_lab.http_service import make_server
        from unittest.mock import patch

        parent = ROOT / '.project-local' / 'task-runtime' / 'e2e-overflow-gate'
        parent.mkdir(parents=True, exist_ok=True)
        tmp = tempfile.TemporaryDirectory(dir=parent)
        root = Path(tmp.name)
        (root / 'AGENTS.md').write_text('# synthetic overflow-gate project', encoding='utf-8')
        token = secrets.token_hex(32)

        evidence = _evidence_dir()
        evidence.mkdir(parents=True, exist_ok=True)
        report_path = evidence / report_name
        # Windows: subprocess.run(capture_output=..., timeout=...) can leave the
        # pipe handle blocking after the child is killed, so the child writes to
        # a file and we wait on the process instead of the pipe.
        log_path = parent / (report_name.replace('.json', '') + '.log')

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
                    'E2E_BROWSER': str(browser),
                    'OV_WIDTHS': WIDTHS,
                    'OV_STRICT': '1',
                    'OV_OUT': str(report_path),
                    **(theme_env or {}),
                }
                with open(log_path, 'w', encoding='utf-8') as logf:
                    proc = subprocess.Popen(
                        [node, str(GATE_SCRIPT)], env=env, stdout=logf,
                        stderr=subprocess.STDOUT, cwd=str(ROOT))
                    try:
                        code = proc.wait(timeout=240)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        self.fail('E2E_OVERFLOW_TIMEOUT: the gate did not finish in 240s')
                with open(log_path, encoding='utf-8', errors='replace') as fh:
                    out = fh.read()
            finally:
                server.shutdown()
                worker.join()
                server.server_close()
                tmp.cleanup()
        return code, out, report_path

    def _fail_open(self, code, out, report_path):
        summary = next((line for line in out.splitlines()
                        if line.startswith('OV_SUMMARY')), out[-800:])
        if code != 0:
            self.fail(f'OVERFLOW_GATE_FAILED (exit {code}) widths={WIDTHS} strict=1\n'
                      f'{summary}\n--- output ---\n{out[-3000:]}')
        self.assertIn('OV_OK', out, f'gate exited 0 without OV_OK:\n{out[-2000:]}')
        self.assertTrue(report_path.is_file(),
                        f'gate produced no report at {report_path}')
        return json.loads(report_path.read_text(encoding='utf-8'))

    # `#route-view` is what a screen-reader user navigates by heading, so a jump from h2 straight
    # to h4 reads as a section that vanished. axe reports that only when it evaluates the node, and
    # it declined 9-71 nodes per screen here, so the rendered sequence is asserted instead.
    # `workbench` is the landing route: its h1 is the static header outside the route view, so it
    # has no heading in here by design -- the exception is named rather than left implicit.
    HEADINGLESS_ROUTES = {'workbench'}

    def _assert_heading_order(self, report):
        measured = 0
        for key, value in sorted(report['routes'].items()):
            if '+' in key or not isinstance(value, dict) or 'headings' not in value:
                continue
            route = key.split(':', 1)[-1]
            headings = value['headings']
            self.assertIsNone(headings.get('skip'),
                              f'{key}: the rendered heading order skips a level '
                              f'({headings.get("skip")})')
            if headings.get('levels'):
                measured += 1
            else:
                self.assertIn(route, self.HEADINGLESS_ROUTES,
                              f'{key}: this screen renders no heading at all, so a screen reader '
                              'has nothing to jump to')
        self.assertGreaterEqual(measured, 15,
                                f'only {measured} screens produced a heading sequence; the '
                                'measurement has stopped covering the route table')

    def test_the_heading_assertion_can_fail(self):
        """A guard nobody has seen red guards nothing: both branches are planted here."""
        skipped = {'routes': {'1440:dashboard': {'headings': {
            'levels': [2, 4], 'skip': 'h2 -> h4 at "某面板"'}}}}
        with self.assertRaises(AssertionError) as raised:
            self._assert_heading_order(skipped)
        self.assertIn('skips a level', str(raised.exception))

        nameless = {'routes': {'1440:dashboard': {'headings': {'levels': [], 'skip': None}}}}
        with self.assertRaises(AssertionError) as raised:
            self._assert_heading_order(nameless)
        self.assertIn('no heading at all', str(raised.exception))

        # The count floor is what stops a measurement that quietly stopped measuring from
        # passing as a clean run.
        thin = {'routes': {f'1440:r{i}': {'headings': {'levels': [2, 3], 'skip': None}}
                           for i in range(3)}}
        with self.assertRaises(AssertionError) as raised:
            self._assert_heading_order(thin)
        self.assertIn('stopped covering the route table', str(raised.exception))

    def _assert_utility_geometry(self, report, label):
        """Every element carrying a layout utility must actually compute the token's value.

        This is the browser-side half of the guard: the static conflict check can see that two
        classes set the same property, but only the rendered style says who won. Both regressions
        from folding inline styles into `.spaced-top` / `.grid-stack` were invisible to every
        existing assertion because none of them measures inter-panel spacing.
        """
        checked = 0
        seen: dict[str, int] = {}
        for key, value in sorted(report['routes'].items()):
            if '+' in key or not isinstance(value, dict):
                continue
            geometry = value.get('utilityGeometry')
            if not geometry:
                continue
            checked += geometry['checked']
            for cls, count in (geometry.get('seen') or {}).items():
                seen[cls] = seen.get(cls, 0) + count
            self.assertTrue(geometry['tokens'].get('space2') and geometry['tokens'].get('space4'),
                            f'{label} {key}: the spacing tokens the utilities rely on did not '
                            f'resolve ({geometry["tokens"]})')
            self.assertEqual(geometry['bad'], [],
                             f'{label} {key}: a utility class lost the cascade -- '
                             + '; '.join(f".{b['cls']} expected {b['prop']}:{b['want']} but "
                                         f"computed {b['got']} alongside .{b.get('coClasses') or '-'}"
                                         for b in geometry['bad']))
        # Division of labour, stated because it is load-bearing: the static gate covers all twenty
        # sites, this one covers the sites the fixture actually renders. `grid-stack` lives on panels
        # that need data the walk does not always have, so an absent utility is reported as coverage
        # rather than failed -- and the static conflict check is what guards those sites meanwhile.
        self.assertGreaterEqual(checked, 1,
                                f'{label}: no rendered element carried any utility class '
                                f'({seen}); this pass computed nothing')
        missing = sorted(set(vucc_utility_names()) - set(seen))
        if missing:
            print(f'NOTE {label} computed only {seen}; not rendered under this fixture: {missing} '
                  '(guarded statically by scripts/verify_utility_class_conflicts.py)')

    def test_no_clipped_or_unreachable_text_in_real_browser(self):
        if not GATE_SCRIPT.is_file():
            self.skipTest(f'overflow gate script missing: {GATE_SCRIPT}')
        code, out, report_path = self._run_gate('workbench-overflow-gate.json')
        report = self._fail_open(code, out, report_path)
        self._assert_heading_order(report)
        self._assert_utility_geometry(report, 'design-lab/dark:')
        # Every named interaction has to have settled on something a reader can tell apart, and at
        # least one has to have actually read the ledger back: a panel that renders a refusal at
        # every width is well-formed UI over a readback nobody ever saw.
        interactions = {key: value for key, value in report['routes'].items() if '+' in key}
        self.assertTrue(interactions, 'the gate measured no button-gated panel at all')
        for key, value in sorted(interactions.items()):
            self.assertIn(value.get('state'), ('read', 'refused'),
                          f'{key} settled on {value.get("state")!r}, which is neither a read-back '
                          'nor a named refusal')
        self.assertIn('read', {value.get('state') for value in interactions.values()},
                      'no width ever displayed the readback itself; the gate would have passed on '
                      'an error card, so the rendered panel is unverified')
        # The brand tile at every width the gate walked. `decode` is the load-bearing one:
        # it is the browser reporting the natural size of the bitmap the inlined data URI
        # actually produced, which is the only proof here that the stylesheet carries the
        # mark rather than a declaration pointing at nothing.
        brand = report.get('brand', {})
        measured = [w.strip() for w in WIDTHS.split(',') if w.strip()]
        self.assertEqual(sorted(brand, key=str), sorted(measured, key=str),
                         'the gate reported the brand tile for some widths and not others')
        for width, seen in brand.items():
            self.assertTrue(seen.get('present'), f'{width}: no .brand-mark was mounted')
            self.assertEqual(seen.get('text', 'x'), '',
                             f'{width}: the tile carries text, so a screen reader says the name twice')
            self.assertEqual(seen.get('ariaHidden'), 'true',
                             f'{width}: the decorative tile is exposed to assistive tech')
            self.assertEqual(seen.get('decode'), '144x144',
                             f'{width}: the inlined mark decoded as {seen.get("decode")}')
            self.assertGreater(seen.get('uriChars', 0), 1000,
                               f'{width}: the data URI is a stub, not the mark')
            self.assertTrue(seen.get('glow'), f'{width}: the mark has no bloom')


    def test_the_ui2026_light_theme_is_graded_by_the_same_geometry_gate(self):
        """DL-UI-U02's rule applied to layout: an unmeasured theme is an unshipped theme.

        The theme re-points the neutral family -- background, surface, border, text and the
        status colours -- and a border or surface width that only exists under one palette can
        change what fits. Contrast and theme geometry already sweep the combinations; this gate
        owns CLIPPED / STRAY / TINY / the nav-cut boundary and the scroll cue, and until now it
        measured one theme.
        """
        if not GATE_SCRIPT.is_file():
            self.skipTest(f'overflow gate script missing: {GATE_SCRIPT}')
        code, out, report_path = self._run_gate(
            'workbench-overflow-gate-ui2026-light.json',
            {'UI_PALETTE': 'ui2026', 'UI_SCHEME': 'light'})
        report = self._fail_open(code, out, report_path)
        # The receipt has to name the theme it describes, or a green file is ambiguous about
        # which subject was actually cleared.
        self._assert_utility_geometry(report, 'ui2026/light:')
        self.assertEqual('ui2026', report['uiPalette'])
        self.assertEqual('light', report['uiScheme'])
        # The sidebar boundary that started this: the nav's cut line must not sit on the
        # identity footer's hairline under either theme.
        for width, edge in sorted(report['navEdge'].items()):
            self.assertGreaterEqual(
                edge['gap'], 6,
                f'ui2026/light @{width}: footer hairline {edge["gap"]}px under the nav cut '
                f'line{" with a group label half-cut on it" if edge["labelStraddling"] else ""}')
        self.assertTrue(report['brand'], 'the themed run measured no brand tile')
        for width, seen in report['brand'].items():
            if seen.get('size', [0])[0]:
                self.assertEqual([48, 48], seen['size'],
                                 f'ui2026/light @{width}: the tile is {seen["size"]}, not 48x48')


if __name__ == '__main__':
    unittest.main(verbosity=2)
