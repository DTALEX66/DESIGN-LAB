#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Report paths must be printable wherever they are written.

Owner audit 2026-10-26, finding 7: `scripts/audit_workbench_ui.py` finished a full sweep, wrote the
JSON, and THEN called `out_path.relative_to(REPO)` while printing the path -- so with `--out` (or
`E2E_EVIDENCE_DIR`) outside the checkout the run died with `ValueError` after measuring everything.
Two sites in `run_design_review_plugin.py` had the same shape.
"""
from __future__ import annotations
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src'))
sys.path.insert(0, str(ROOT / 'scripts'))

from report_paths import display_path  # noqa: E402


class ReportPathDisplayTests(unittest.TestCase):
    def test_an_in_repo_path_is_still_printed_relative(self) -> None:
        target = ROOT / '.project-local' / 'task-artifacts' / 'browser-e2e' / 'x.json'
        self.assertEqual(display_path(target, ROOT),
                         target.resolve().relative_to(ROOT.resolve()).as_posix(),
                         'the line a human greps for changed shape for paths that were fine')

    def test_an_out_of_repo_path_is_printed_absolutely_and_does_not_raise(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            outside = Path(tmp) / 'report.json'
            shown = display_path(outside, ROOT)
            self.assertEqual(Path(shown), outside.resolve(),
                             'an out-of-repo path must still be identifiable from the line')
            self.assertNotIn(str(ROOT.resolve()).replace('\\', '/').lower(),
                             Path(shown).parent.as_posix().lower() + '|',
                             'the display path leaked the repo prefix back in')

    def test_the_two_scripts_no_longer_print_an_unguarded_relative_to(self) -> None:
        for rel in ('scripts/audit_workbench_ui.py', 'scripts/run_design_review_plugin.py'):
            text = (ROOT / rel).read_text(encoding='utf-8')
            self.assertNotIn('relative_to(REPO).as_posix()', text,
                             f'{rel} still derives a display path with the call that raised')
            self.assertIn('display_path(', text,
                          f'{rel} stopped using the shared helper, so the crash class can return')

    def test_the_source_check_bites_a_reintroduced_relative_to(self) -> None:
        """Without this, the assertion above is a string match that could pass on a broken script."""
        sample = (ROOT / 'scripts' / 'audit_workbench_ui.py').read_text(encoding='utf-8')
        reintroduced = sample.replace('display_path(out_path, REPO)',
                                      'out_path.relative_to(REPO).as_posix()')
        self.assertNotEqual(reintroduced, sample,
                            'the sample no longer contains the call site, so this plant is hollow')
        self.assertIn('relative_to(REPO).as_posix()', reintroduced)
        self.assertNotIn('relative_to(REPO).as_posix()',
                         (ROOT / 'scripts' / 'run_design_review_plugin.py').read_text(
                             encoding='utf-8'))

    def test_the_expression_that_crashed_still_crashes_on_the_same_input(self) -> None:
        """Non-vacuity for the fix: the pre-print expression is what raised, on exactly this path.

        Proved against the raw call rather than against a copy of the old script, because the old
        line is deleted and a deleted line cannot be executed.
        """
        with tempfile.TemporaryDirectory() as tmp:
            outside = Path(tmp) / 'report.json'
            with self.assertRaises(ValueError):
                outside.resolve().relative_to(ROOT.resolve())
            # And the helper returns a usable path for the same input, which is the difference.
            self.assertTrue(display_path(outside, ROOT).endswith('report.json'))

    def test_the_helper_survives_a_windows_case_difference(self) -> None:
        # Case-insensitive filesystems are why `is_relative_to` was not trusted here: the two paths
        # can differ only in drive-letter case and still be the same directory.
        upper = display_path(ROOT / 'reports' / 'current' / 'TASK_PROGRESS.json', ROOT)
        self.assertEqual(upper, 'reports/current/TASK_PROGRESS.json', upper)
        odd_case = display_path(Path(str(ROOT).upper()) / 'reports' / 'x.json', ROOT)
        self.assertTrue(odd_case.endswith('reports/x.json'),
                        f'a case-differing repo root produced {odd_case!r}')


if __name__ == '__main__':
    unittest.main(verbosity=2)
