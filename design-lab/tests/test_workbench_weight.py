# SPDX-License-Identifier: MIT
"""Teeth for scripts/measure_workbench_weight.py's DL-KB-13 readings.

The card's rule is 先量基线再改, so the two readings this module guards are the ones that were
missing: 列表初始行数 (how many rows a first paint can even get) and 附件缩略图策略 (what the
attachment listing actually costs). Both are instruments that can go blind without going red --
a slice on a query-term list would print an 8-row page for a route that never promised one, and an
empty "region" extraction would print "0 img elements" for a panel that has one. So each test here
either cross-checks a printed number against the file that states it, or proves the reader is not
blind before it is believed.

Nothing here judges a threshold: the size ceiling is an owner decision (the script says so), and
the attachment numbers are a baseline, not an optimisation.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import re
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'src'))

SCRIPT = REPO / 'scripts' / 'measure_workbench_weight.py'
SCRATCH = REPO / '.project-local' / 'task-runtime' / 'kb13-weight'
TEST_CORPUS = SCRATCH / 'test-corpus'
# A stand-in store the reader is pointed at, to prove which of its signals it trusts.
FAKE_STORE = SCRATCH / 'fake_store.py'
FAKE_SOURCE = '''DEFAULT_LIMIT = 50
MAX_LIMIT = 200


class FakeLibrary:
    def search(self, *, limit=DEFAULT_LIMIT):
        terms = _TERM.findall(self.query)[:8]
        rows = self._rows(terms)
        return {'entries': [dict(r) for r in rows[:100]], 'total': len(rows)}

    def _rows(self, terms):
        return []

    def browse(self):
        rows = self._rows([])
        return [dict(r) for r in rows][:1] if rows else []


def _TERM(text):
    return []
'''


def load_script():
    spec = importlib.util.spec_from_file_location('measure_workbench_weight_under_test', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def run(argv: list[str]) -> tuple[int, str]:
    """Invoke the script's main() with the given flags and return (exit code, stdout)."""
    module = load_script()
    buffer = io.StringIO()
    previous = sys.argv
    sys.argv = [str(SCRIPT)] + argv
    try:
        with contextlib.redirect_stdout(buffer):
            code = module.main()
    finally:
        sys.argv = previous
    return code, buffer.getvalue()


class ShippedBytesStillReported(unittest.TestCase):
    """The lines other records already read must keep being printed, and keep being true."""

    @classmethod
    def setUpClass(cls):
        cls.code, cls.out = run(['--check', '--no-assets'])

    def test_existing_weight_and_verdict_lines_survive(self):
        for prefix in ('WEIGHT bundle', 'WEIGHT stylesheet', 'WEIGHT document',
                       'WEIGHT inline-data', 'WEIGHT mountPoints', 'WEIGHT page',
                       'WEIGHT module ', 'WEIGHT modules declarations',
                       'WEIGHT remoteReferences', 'WEIGHT NOTE'):
            self.assertIn(prefix, self.out, f'{prefix} is no longer printed')
        self.assertEqual(self.code, 0)
        self.assertIn('WORKBENCH_WEIGHT_GATE=OK remote=0 bundle_gzip=', self.out)

    def test_check_path_writes_nothing(self):
        # The CI step is this script with --check; it must not seed a corpus to do its verdict.
        self.assertIn('THUMBNAIL baseline SKIPPED', self.out)
        self.assertIn('Nothing above this line wrote a file', self.out)

    def test_json_carries_the_new_sections(self):
        _code, out = run(['--json', '--no-assets'])
        # The NOTE line the script prints outside the JSON branch is its own long-standing shape,
        # so the payload is the first line -- not the whole stdout.
        data = json.loads(out.splitlines()[0])
        for key in ('files', 'modules', 'pageSizes', 'listRows', 'thumbnailPolicy'):
            self.assertIn(key, data)
        self.assertIsNone(data['assetListBaseline'])
        self.assertGreater(len(data['listRows']['routes']), 10)
        self.assertIn('listRowsWithImgElement', data['thumbnailPolicy'])


class ListInitialRows(unittest.TestCase):
    """列表初始行数: one reading per list-bearing GET route, bounded by its own code."""

    @classmethod
    def setUpClass(cls):
        cls.module = load_script()
        cls.reading = cls.module.list_row_readings()
        cls.by_action = {r['action']: r for r in cls.reading['routes']}

    def test_the_reader_sees_the_route_table_it_claims(self):
        # A blind reader would print an empty table and a zero "without limit" count, which is
        # exactly the confident-nothing this repository already refuses elsewhere.
        self.assertIsNone(self.reading['readerError'], self.reading['readerError'])
        self.assertGreater(self.reading['listRoutes'], 10)
        self.assertGreater(self.reading['frontendCallSites'], 50)

    def test_every_route_is_accounted_for_exactly_once(self):
        bounded = [r for r in self.reading['routes'] if r['initialRows'] is not None]
        unbounded = [r for r in self.reading['routes'] if r['initialRows'] is None]
        self.assertEqual(len(bounded) + len(unbounded), self.reading['listRoutes'])
        self.assertEqual(sorted(r['action'] for r in unbounded), sorted(self.reading['withoutLimit']))
        for row in self.reading['routes']:
            self.assertTrue(row['action'].startswith(('_list_', '_search_')))
            self.assertEqual(row['method'], 'GET')

    def test_a_reported_bound_points_at_a_line_that_states_it(self):
        # The number is only a measurement if the file:line printed says that number in code.
        seen = 0
        for row in self.reading['routes']:
            if row['initialRows'] is None:
                continue
            seen += 1
            name, rest = row['boundAt'].split(':', 1)
            line = int(re.match(r'[0-9]+', rest).group(0))
            candidates = list((REPO / 'src' / 'design_lab').glob(name))
            self.assertEqual(len(candidates), 1, f'{name} is not exactly one file')
            text = candidates[0].read_text(encoding='utf-8').splitlines()[line - 1]
            stated = (str(row['initialRows']) in text or str(row['initialRows'] - 1) in text
                      or 'rows[:' in text or 'LIMIT' in text)
            self.assertTrue(stated, f'{name}:{line} says {text!r}, not a bound of '
                                    f'{row["initialRows"]}')
        self.assertGreaterEqual(seen, 5, 'the bounded half of the table went untested')

    def test_the_page_sizes_already_on_record_still_agree(self):
        # scripts/measure_workbench_weight.py prints five documented defaults on its own; the new
        # per-route reading must not disagree with the same constants it re-derives.
        from design_lab import knowledge_library, assistance_plan, target_profile, plan_feedback
        for action, expected in (('_search_knowledge_entries', knowledge_library.DEFAULT_LIMIT),
                                 ('_list_assistance_plans', assistance_plan.DEFAULT_LIMIT),
                                 ('_list_target_profiles', target_profile.DEFAULT_LIMIT),
                                 ('_list_plan_feedback', plan_feedback.DEFAULT_LIMIT)):
            self.assertEqual(self.by_action[action]['initialRows'], expected, action)

    def test_the_attachment_list_is_the_route_without_a_bound(self):
        assets = self.by_action['_list_or_read_assets']
        self.assertIsNone(assets['initialRows'])
        self.assertEqual(assets['unresolved'], [])
        self.assertGreaterEqual(assets['clientCalls'], 1)

    def test_none_means_resolved_and_unbounded_not_unread(self):
        # An unresolved delegate is reported separately; a NONE born of reader blindness would let
        # the script tell an owner "no limit here" about a route it never opened.
        self.assertEqual(self.reading['unresolved'], [])

    def test_the_query_term_slice_is_not_reported_as_the_page(self):
        action = self.by_action['_search_knowledge_entries']
        self.assertNotEqual(action['initialRows'], 8)
        self.assertEqual(action['maxRows'], 200)

    def test_which_signals_the_reader_trusts_on_a_store_it_can_read(self):
        SCRATCH.mkdir(parents=True, exist_ok=True)
        FAKE_STORE.write_text(FAKE_SOURCE, encoding='utf-8', newline='\n')
        self.addCleanup(lambda: FAKE_STORE.unlink(missing_ok=True))
        rel = FAKE_STORE.relative_to(REPO).as_posix()
        bounds = self.module.row_bounds(rel, 'FakeLibrary', 'search')
        values = sorted({c['value'] for c in bounds['caps']})
        self.assertIn(50, values)                       # the method's own limit default
        self.assertIn(100, values)                      # the rows[:100] page
        self.assertNotIn(8, values)                     # a slice on a CALL is not a row bound
        self.assertEqual(bounds['maximum'], 200)
        browse = self.module.row_bounds(rel, 'FakeLibrary', 'browse')
        self.assertNotIn(1, {c['value'] for c in browse['caps']})
        missing = self.module.row_bounds(rel, 'FakeLibrary', 'nothing_here')
        self.assertIsNotNone(missing['reason'])


class AttachmentThumbnailPolicy(unittest.TestCase):
    """附件缩略图策略: what the shipped client and the store really do about pixels."""

    @classmethod
    def setUpClass(cls):
        cls.module = load_script()
        cls.policy = cls.module.thumbnail_policy()

    def test_the_regions_read_are_not_empty(self):
        # Proving "no img in the list" with a region that was never found would be a pass built on
        # blindness, so the byte counts of both regions are asserted first.
        for name in ('referencePickerForProject', 'renderReferencePanel'):
            self.assertGreater(self.policy['bundleRegionBytes'][name], 500, name)

    def test_first_paint_pulls_no_pixels(self):
        self.assertEqual(self.policy['listRowsWithImgElement'], 0)
        self.assertEqual(self.policy['listRowsFetchingContent'], 0)

    def test_the_preview_is_one_lazy_element_not_a_grid(self):
        self.assertEqual(self.policy['panelImgElements'], 1)
        self.assertTrue(self.policy['previewAssetDefined'])
        self.assertGreaterEqual(self.policy['panelClickHandlers'], 1)

    def test_no_server_side_scaled_variant_exists(self):
        self.assertEqual(self.policy['scaledVariantSymbolsInStore'], [])
        self.assertIn('object-fit:contain', ';'.join(self.policy['previewBoxRules']))


class AttachmentBaselineIsMeasured(unittest.TestCase):
    """The price list, at a size small enough to re-run inside a test."""

    def test_two_assets_produce_two_accounted_points(self):
        module = load_script()
        # 64px, not 8px: the claim "the list is cheap and the pixels are not" is false for a
        # 74-byte PNG, and a test that asserts a falsehood about its own fixture proves nothing.
        result = module.asset_list_baseline(counts=(1, 2), side=64, passes=1, clean=True,
                                            corpus=str(TEST_CORPUS))
        self.assertEqual([p['assets'] for p in result['points']], [1, 2])
        self.assertTrue(result['removed'])
        self.assertFalse(TEST_CORPUS.exists(), '--clean left the corpus behind')
        for point in result['points']:
            self.assertEqual(point['bytesRead'], point['perAssetBytes'] * point['assets'])
            self.assertGreater(point['splitWallMs'], 0.0)
            parts = (point['pathCheckMs'] + point['readMs'] + point['hashMs']
                     + point['decodeMs'])
            self.assertLessEqual(parts, point['splitWallMs'] + 0.05)
            self.assertGreaterEqual(point['unattributedMs'], -0.05)
            self.assertLess(point['listJsonBytes'], point['previewAllBase64Bytes'])
            self.assertEqual(point['previewAllBase64Bytes'],
                             sum(4 * ((point['perAssetBytes'] + 2) // 3)
                                 for _ in range(point['assets'])))
            self.assertGreater(point['onePreviewJsonBytes'],
                               4 * ((point['perAssetBytes'] + 2) // 3))
            self.assertLessEqual(sum((point['pathCheckPercent'], point['readPercent'],
                                      point['hashPercent'], point['decodePercent'])), 100.0)
        growing = [p['listJsonBytes'] for p in result['points']]
        self.assertEqual(growing, sorted(growing))
        self.assertLess(growing[0], growing[1])

if __name__ == '__main__':
    unittest.main()
