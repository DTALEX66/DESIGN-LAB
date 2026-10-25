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
  - measured on the current build: checked=995 text runs, belowAA=0, mathBad=0 (2026-10-06).
  - 2026-10-24, same gate after it learned to open collapsed details and read OKLab: both themes
    measured 50 route-runs (24 routes x 1440/1920 plus the plan detail at each width),
    checked=14002 text runs, belowAA=0, collapsedOpened=6228, controlMisses=0, unparsable=0,
    colourBad=0, tightest margin 4.11:1 (dark) / 4.14:1 (light). That run is what found the two
    defects below, so the growth in `checked` is the point, not a side effect.
  - FALSE FAILURE the gate produced first, then a real one it produced second:
    · a closed `<details>` keeps a real layout box for text Chromium does not paint
      (`::details-content { content-visibility: hidden }`), so the invisible 接入明细 lines were
      graded against whatever sibling panel happened to own that pixel -- a 1.31:1 report on text
      nobody could read. Fixed by opening every detail before the sweep and counting the runs that
      brought in (`collapsed`), with a planted closed white-on-white control that is only reported
      when the opening really happened; without the control the skip would look like coverage loss.
    · `oklab(...)` -- how Chromium serialises a resolved `color-mix(in oklab, …)` -- was unparsable,
      which the gate refuses loudly rather than dropping the layer. The conversion is now graded
      against the CSS Color 4 spec's own four sRGB <-> OKLab vectors.

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
            # One log per report, named after the report this run actually writes. Sharing one
            # path meant a themed run overwrote the default run's log -- and the receipt reads
            # CT_SUMMARY and CT_SPEC_ENFORCED out of that file, so a green themed receipt could
            # have quoted the other theme's numbers. `workbench-overflow-gate-<theme>.log`
            # already worked this way; this closes the same hole in the contrast harness.
            log_path = parent / (Path(env['CT_OUT']).stem + '.log')
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


def _spec_fields(out):
    """The three CT_SPEC lines merged into one dict.

    The pack's numbers are printed as three lines because they measure three different
    populations (text, controls, surfaces); the assertions read them as one record, so the
    merge happens here rather than in three places that could disagree about a key name.
    """
    fields = {}
    for line in out.splitlines():
        if not line.startswith('CT_SPEC'):
            continue
        for tok in line.split()[2:]:
            if '=' in tok and '[' not in tok and '/' not in tok:
                key, value = tok.split('=', 1)
                fields.setdefault(key, value)
    return fields


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
        # OKLab is a colour space this page actually computes in (a resolved
        # `color-mix(in oklab, …)`), and the conversion is graded against the CSS Color 4
        # spec's own vectors rather than a helper of this file's.
        self.assertEqual(summary.get('colourChecks'), '4',
                         'the oklab->sRGB reference vectors did not run: %s' % summary)
        self.assertEqual(summary.get('colourBad'), '0',
                         'the oklab conversion disagrees with published spec vectors: %s'
                         % summary)
        # The veil control answers a different question: text seen *through* a scrim must be
        # graded against the blended pairing. Its own document, because a fixture has to be
        # inside the viewport for a hit test to find it.
        self.assertIn('CT_VEIL_CONTROL caught=yes', out,
                      'the translucent-veil control did not fire: %s' % out[-800:])
        self.assertIn('obscured', summary,
                      'obscured text runs are no longer counted: %s' % summary)
        # Collapsed `<details>` text is painted only once a person opens it, so a route sweep
        # that never expanded would silently measure a fraction of the screen it names. The count
        # has to be non-zero for the population to include that content at all.
        self.assertGreaterEqual(int(summary.get('collapsedOpened', '0')), 1,
                                'not one collapsed run was brought into the sweep, so this '
                                'gate only measures whatever the page happened to leave open: %s'
                                % summary)
        # The plan detail and the knowledge entry detail are the two panels this gate opens by
        # clicking into; a name in the log is not proof either was measured under every width, so
        # the report itself is read back. Both are asserted because the entry detail's row title
        # is exactly where a real AA failure turned up the moment it started being measured.
        import json
        recorded = json.loads(report_path.read_text(encoding='utf-8'))
        wanted = ['%s:assistant+plan-detail' % w for w in WIDTHS.split(',')]
        wanted += ['%s:assistant+plan-compare' % w for w in WIDTHS.split(',')]
        wanted += ['%s:assistant+plan-feedback' % w for w in WIDTHS.split(',')]
        wanted += ['%s:knowledge+entry-detail' % w for w in WIDTHS.split(',')]
        wanted += ['%s:target-profiles+combination' % w for w in WIDTHS.split(',')]
        missing = [k for k in wanted if k not in recorded.get('routes', {})]
        self.assertEqual(missing, [],
                         'these panel states were never measured, so their contrast is unclaimed '
                         'rather than good: %s' % missing)
        self.assertIs(recorded.get('auditSeed', {}).get('product_data'), False,
                      'the seeded plan must be recorded as synthetic scaffolding')
        self.assertIs(recorded.get('auditKnowledgeSeed', {}).get('product_data'), False,
                      'the seeded knowledge entry must be recorded as synthetic scaffolding')

    def test_ui2026_light_theme_is_graded_by_the_same_aa_gate(self):
        """DL-UI-U02 (2026-10-09): the 20261009 baseline ships as a *theme*, so it has
        to clear the same AA bar as the default one -- an unmeasured theme is an
        unshipped theme, and a screenshot glance is not a contrast measurement.

        The design-lab palette stays the default and keeps every pixel it had; the
        pack's values only re-point the neutral family (background / surface / border /
        text / the three status colours). Brand blues, --accent-hover and
        --border-strong stay at their measured floor values on purpose, so this case
        measures what the theme actually changed and not a re-brand.
        """
        report = _evidence_dir() / 'workbench-contrast-gate-ui2026-light.json'
        code, out, _ = _run_gate({
            'UI_PALETTE': 'ui2026',
            'UI_SCHEME': 'light',
            'CT_OUT': str(report),
        })
        if code != 0:
            low = [l for l in out.splitlines() if l.strip().startswith('LOWCONTRAST')]
            self.fail('CONTRAST_GATE_FAILED under ui2026/light (exit %d)\n'
                      '--- first 25 offenders ---\n%s\n--- tail ---\n%s'
                      % (code, '\n'.join(low[:25]), out[-1200:]))
        self.assertIn('CT_OK', out, 'gate exited 0 without CT_OK:\n%s' % out[-2000:])
        self.assertTrue(report.is_file(), 'themed run produced no report at %s' % report)
        # The receipt must name its own subject, or a green file says nothing about
        # which theme was measured.
        import json
        recorded = json.loads(report.read_text(encoding='utf-8'))
        self.assertEqual(recorded.get('uiPalette'), 'ui2026',
                         'the report does not say which palette it measured')
        self.assertEqual(recorded.get('uiScheme'), 'light',
                         'the report does not say which scheme it measured')
        checked = int(_summary(out).get('checked', '0'))
        self.assertGreaterEqual(checked, 500,
                                'themed probe measured only %d text runs; coverage is suspect'
                                % checked)
        summary = _summary(out)
        self.assertEqual(summary.get('controlMisses'), '0',
                         'the parser control was not caught under the new theme: %s' % summary)
        self.assertEqual(summary.get('unparsable'), '0',
                         'a colour the new theme computes could not be parsed: %s' % summary)

    def test_stitch_pearl_theme_is_graded_by_the_same_aa_gate(self):
        """DL-KB-06 follow-on (2026-10-25): the 20261023 pack's STITCH prompt names six exact
        colours and ships them as a third optional palette. Same rule as the 20261009 baseline --
        an unmeasured theme is an unshipped theme, and the pack's own numbers are no proof that
        its text is readable on its own background.

        The default palette is untouched by this theme (owner ruling: a new pack's colours become
        a selectable theme, never an override), and the measured floor values stay where the
        contrast gate put them, so what this case measures is exactly the six values.

        The pack's numbers are graded on the objects its sentence actually names. 圆角 6–10px is
        written for 输入/按钮, so the graded population is input/select/textarea plus the four
        action-button classes -- measured at 501 controls in this run. The other 909 painted
        controls are list rows, nav items and chips, and the same pack puts 面板 at 12–16px while
        its own reference HTML ships a 20px `.status` pill; those keep their radius and stay in the
        printed histogram. 控件高度 is written as 「约36–40px」, so it is reported (主动作 measures
        41–47px, i.e. taller than the target) and not asserted. Both readings are stated here
        because a band applied to a different population than the spec names is not a 1:1 check.
        """
        report = _evidence_dir() / 'workbench-contrast-gate-stitch-light.json'
        code, out, _ = _run_gate({
            'UI_PALETTE': 'stitch',
            'UI_SCHEME': 'light',
            'CT_OUT': str(report),
            # The 20261023 pack writes its visual rules as numbers too, and this is the theme
            # that carries the pack, so the same painted document is graded on both scales.
            'CT_SPEC_ENFORCE': '1',
        })
        if code != 0:
            low = [l for l in out.splitlines()
                   if l.strip().startswith(('LOWCONTRAST', 'SPEC-VIOLATION'))]
            self.fail('CONTRAST_GATE_FAILED under stitch/light (exit %d)\n'
                      '--- first 25 offenders ---\n%s\n--- tail ---\n%s'
                      % (code, '\n'.join(low[:25]), out[-1200:]))
        self.assertIn('CT_OK', out, 'gate exited 0 without CT_OK:\n%s' % out[-2000:])
        self.assertTrue(report.is_file(), 'themed run produced no report at %s' % report)
        import json
        recorded = json.loads(report.read_text(encoding='utf-8'))
        self.assertEqual(recorded.get('uiPalette'), 'stitch',
                         'the report does not say which palette it measured')
        self.assertEqual(recorded.get('uiScheme'), 'light',
                         'the report does not say which scheme it measured')
        summary = _summary(out)
        self.assertGreaterEqual(int(summary.get('checked', '0')), 500,
                                'themed probe measured only %s text runs; coverage is suspect'
                                % summary.get('checked'))
        self.assertEqual(summary.get('controlMisses'), '0',
                         'the parser control was not caught under the stitch theme: %s' % summary)
        self.assertEqual(summary.get('unparsable'), '0',
                         'a colour the stitch theme computes could not be parsed: %s' % summary)
        # Same panels as the default run: a theme that is only checked on the closed screens
        # has not been checked on the panels where this round added content.
        wanted = ['%s:assistant+plan-detail' % w for w in WIDTHS.split(',')]
        wanted += ['%s:assistant+plan-compare' % w for w in WIDTHS.split(',')]
        wanted += ['%s:assistant+plan-feedback' % w for w in WIDTHS.split(',')]
        wanted += ['%s:knowledge+entry-detail' % w for w in WIDTHS.split(',')]
        wanted += ['%s:target-profiles+combination' % w for w in WIDTHS.split(',')]
        missing = [k for k in wanted if k not in recorded.get('routes', {})]
        self.assertEqual(missing, [],
                         'the stitch theme was never measured for these panels: %s' % missing)
        # The pack's numbers, read off the same painted document in the same run.
        self.assertIn('CT_SPEC_ENFORCED', out,
                      'CT_SPEC_ENFORCE=1 was set but the run never reported the pack numbers'
                      ' as enforced:\n%s' % out[-1500:])
        spec = _spec_fields(out)
        self.assertGreaterEqual(int(spec.get('textRuns', '0')), 1000,
                                'the pack-number pass looked at only %s text runs; coverage is '
                                'suspect' % spec.get('textRuns'))
        self.assertGreaterEqual(int(spec.get('formControls', '0')), 20,
                                'no form controls were measured, so the 6-10px radius band and '
                                'the control-height reading are both unmeasured claims')
        self.assertGreaterEqual(float(spec.get('minPx', '0')), 12,
                                'the pack puts the smallest readable text at 12px: %s' % spec)
        self.assertEqual(spec.get('below12'), '0',
                        '元数据至少12px is not satisfied under the pack theme: %s' % spec)
        self.assertEqual(spec.get('translucentTextHosts'), '0',
                        '长文字与列表实底 is not satisfied under the pack theme: %s' % spec)
        self.assertEqual(spec.get('glassOffAllowlist'), '0',
                        'backdrop-filter is used outside 顶栏／导航／临时面板: %s' % spec)
        self.assertEqual(spec.get('formRadiusOver10'), '0',
                        '圆角输入／按钮 6–10px is not satisfied under the pack theme: %s' % spec)
        self.assertEqual(spec.get('bigOver25pct'), '0',
                        '避免大面积渐变 is not satisfied under the pack theme: %s' % spec)
        self.assertEqual(spec.get('brandBluePaints'), '0',
                        '单一低饱和强调色 is not satisfied under the pack theme: %s' % spec)
        # The receipt carries the same numbers the log printed, so a reader holding the JSON can
        # check which pack rules this run graded without re-running the browser.
        recorded_spec = recorded.get('spec') or {}
        for key in ('below12', 'veilHosts', 'formRadiusOver10', 'bigGradients', 'brandBlues'):
            self.assertEqual(recorded_spec.get(key), 0,
                             'the report does not carry %s=0 from this run: %s'
                             % (key, sorted(recorded_spec)))
        self.assertEqual(recorded_spec.get('glassOffAllowlist'), [],
                         'the report lists glass surfaces outside the pack allowance: %s'
                         % recorded_spec.get('glassOffAllowlist'))

    def test_the_pack_number_assertion_refuses_a_theme_it_was_not_applied_to(self):
        """An assertion that cannot fail guards nothing. The 实底 fix is scoped to the pack's own
        theme (owner ruling: a new pack's values become a selectable theme, never an override of
        the shipped one), so the default palette still paints list rows on a translucent surface
        and the identical enforcement must go red there -- naming the pack sentence it enforces,
        not a generic failure. Run at one width: this is a red-proof, not a coverage sweep."""
        code, out, _ = _run_gate({
            'UI_PALETTE': 'design-lab',
            'UI_SCHEME': 'dark',
            'CT_WIDTHS': '1440',
            'CT_SPEC_ENFORCE': '1',
        })
        self.assertNotEqual(code, 0,
                            'the pack-number enforcement passed on a theme whose list rows are '
                            'still translucent, so the assertion is vacuous:\n%s' % out[-1500:])
        violations = [l for l in out.splitlines() if l.strip().startswith('SPEC-VIOLATION')]
        self.assertTrue(any('实底' in v for v in violations),
                        'the run failed, but not for the translucent-surface rule: %s' % violations)
        self.assertTrue(any('单一低饱和强调色' in v for v in violations),
                        'the default theme keeps its brand gradient by design, so the accent rule '
                        'should be what goes red here too: %s' % violations)
        self.assertTrue(any('大面积渐变' in v for v in violations),
                        'the default theme was expected to keep its panel wash and grid, so the '
                        'gradient rule should be what goes red here too: %s' % violations)
        self.assertNotIn('CT_OK', out,
                        'a red pack-number run still printed the AA verdict, so the two are not'
                        ' separated in the log')
        # 元数据≥12px was raised globally, not per theme, so it must NOT be what goes red here.
        spec = _spec_fields(out)
        self.assertEqual(spec.get('below12'), '0',
                        'the 12px floor was only fixed for one palette, so the default theme '
                        'still ships 11px metadata: %s' % spec)

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
