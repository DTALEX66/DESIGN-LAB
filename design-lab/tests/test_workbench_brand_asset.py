# SPDX-License-Identifier: MIT
"""The brand mark in the stylesheet is the tracked cut-out, and nothing else.

The Workbench carries the owner's logo as a data URI inside `style.css` rather than as
an asset route, because src/design_lab/workbench.py serves a fixed three-path allowlist
under `img-src data:`. That makes the shipped stylesheet hold bytes that no editor
should be trusted to keep in sync with the asset they came from, so the sync is checked
here -- through design-lab/scripts/render_brand_asset.py's own `--check`, which is the
single owner of the predicate (this module imports it rather than re-deriving it).

What each case is for:
  * the tree passes `--check`, and the two ways it can rot (payload swapped, digest
    swapped) each make it fail -- a check that cannot be disturbed guards nothing;
  * exactly one region exists, inside `:root`, and both brand tiles consume the token;
  * the PNG is a cut-out (transparent ground, white glyph, inset from the edge), not a
    rectangle of the artwork's black background;
  * the mechanism that forces inlining is still the mechanism: if an asset route is ever
    added, this test says so instead of the data URI quietly surviving on its own.
"""
from __future__ import annotations

import base64
import hashlib
import importlib.util
import io
import json
import re
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / 'design-lab' / 'scripts' / 'render_brand_asset.py'
sys.path.insert(0, str(REPO / 'src'))

_spec = importlib.util.spec_from_file_location('render_brand_asset', SCRIPT)
rba = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rba)


def _check(png: Path, css: Path) -> tuple[int, str]:
    """Run the script's own --check against a chosen pair of files."""
    import contextlib
    out = io.StringIO()
    png_real, css_real = rba.PNG_PATH, rba.CSS_PATH
    rba.PNG_PATH, rba.CSS_PATH = png, css
    try:
        with contextlib.redirect_stdout(out):
            code = rba.main(['--check'])
    finally:
        rba.PNG_PATH, rba.CSS_PATH = png_real, css_real
    return code, out.getvalue().strip()


class BrandAssetSyncTests(unittest.TestCase):
    def test_the_shipped_pair_passes_the_generators_own_check(self):
        code, line = _check(rba.PNG_PATH, rba.CSS_PATH)
        self.assertEqual(code, 0, f'the stylesheet and the tracked png disagree: {line}')
        self.assertIn('BRAND_ASSET=OK', line)

    def test_a_swapped_payload_is_caught(self):
        png = rba.PNG_PATH.read_bytes()
        other = rba._encode(Image.fromarray(np.zeros((144, 144, 4), np.uint8), 'RGBA'))
        self.assertNotEqual(png, other)
        css = rba.CSS_PATH.read_text(encoding='utf-8')
        swapped = css.replace(base64.b64encode(png).decode('ascii'),
                              base64.b64encode(other).decode('ascii'))
        self.assertNotEqual(swapped, css, 'the payload was not findable in the css')
        with _temp_pair(swapped.encode('utf-8'), png) as (p, c):
            code, line = _check(p, c)
        self.assertEqual(code, 1)
        self.assertIn('BRAND_CSS_STALE', line)

    def test_a_stale_digest_claim_is_caught(self):
        css = re.sub(r'(brand-mark:begin sha256=)[0-9a-f]{64}', r'\g<1>' + 'a' * 64,
                     rba.CSS_PATH.read_text(encoding='utf-8'))
        self.assertIn('aaaaaa', css)
        with _temp_pair(css.encode('utf-8'), rba.PNG_PATH.read_bytes()) as (p, c):
            code, line = _check(p, c)
        self.assertEqual(code, 1)
        self.assertIn('BRAND_CSS_STALE', line)

    def test_a_missing_asset_is_a_failure_not_a_pass(self):
        missing = rba.PNG_PATH.with_name('no-such-mark.png')
        self.assertFalse(missing.exists())
        code, line = _check(missing, rba.CSS_PATH)
        self.assertEqual(code, 1)
        self.assertIn('BRAND_ASSET_MISSING', line)


class BrandRegionTests(unittest.TestCase):
    def setUp(self):
        self.css = rba.CSS_PATH.read_text(encoding='utf-8')

    def test_the_stylesheet_carries_exactly_one_region(self):
        self.assertEqual(len(rba.REGION.findall(self.css)), 1,
                         'two regions would mean the generator rewrites one while the '
                         'cascade wins with the other')

    def test_the_region_lives_inside_the_root_token_block(self):
        """A second `:root{...}` rule would satisfy the browser and break the gate."""
        start = self.css.index(':root{')
        end = self.css.index('\n}', start)
        begin = self.css.index('brand-mark:begin')
        self.assertTrue(start < begin < end,
                        'the generated declaration must sit inside the existing :root block; '
                        'design-lab/tests/test_workbench_css_single_definition.py fails on a '
                        'selector defined twice')

    def test_both_brand_tiles_consume_the_token(self):
        """An unread declaration is decoration: the asset must actually be painted."""
        for selector in ('.mark{', '.brand-mark::after{'):
            block = self.css[self.css.index(selector):]
            block = block[:block.index('}')]
            self.assertIn('var(--brand-mark)', block, f'{selector} does not use the mark')
        self.assertIn('var(--glow)', self.css[self.css.index('.mark{'):],
                      'the legacy tile should glow with the project token, not a copied rgba')


class MarkShapeTests(unittest.TestCase):
    """The cut-out is a mark, not a crop of the artwork's black ground."""

    @classmethod
    def setUpClass(cls):
        cls.array = np.asarray(Image.open(rba.PNG_PATH))
        cls.image = Image.open(rba.PNG_PATH)

    def test_square_rgba_canvas_with_a_transparent_ground(self):
        self.assertEqual(self.image.mode, 'RGBA')
        self.assertEqual(self.image.size, (144, 144))
        alpha = self.array[..., 3]
        self.assertGreater((alpha < 5).mean(), 0.5,
                           'over half the canvas must be transparent or it is a box, not a mark')
        self.assertGreater((alpha > 250).mean(), 0.05)

    def test_the_glyph_is_white_and_inset_from_the_edge(self):
        alpha = self.array[..., 3]
        self.assertEqual(np.unique(self.array[..., :3][alpha > 128]).tolist(), [255],
                         'the mark is a white glyph; colour belongs to the tile, not the asset')
        ys, xs = np.where(alpha > 128)
        for name, lo, hi, limit in (('x', xs.min(), xs.max(), 144), ('y', ys.min(), ys.max(), 144)):
            self.assertGreaterEqual(lo, 4, f'{name} touches the canvas edge')
            self.assertLessEqual(hi, limit - 5, f'{name} touches the canvas edge')

    def test_the_provenance_records_a_source_digest_and_the_shipped_canvas(self):
        """The artwork lives outside the repository and is not fetched here; what this
        pins is that the recorded canvas agrees with the asset, and that the source is
        named by digest rather than by a machine-specific path."""
        meta = json.loads(rba.PROVENANCE.read_text(encoding='utf-8'))
        self.assertEqual(len(meta['source_sha256']), 64)
        self.assertNotIn('source_path', meta,
                         'a cross-project absolute path in the record would make the '
                         'asset unverifiable on any other machine')
        self.assertEqual(meta['canvas_px'], 144)
        self.assertEqual(list(self.image.size), [meta['canvas_px']] * 2)


class InlineMechanismTests(unittest.TestCase):
    def test_the_reason_the_asset_is_inlined_is_still_the_reason(self):
        from design_lab import workbench
        self.assertIn('img-src data:', workbench.CSP)
        self.assertNotIn("img-src 'self'", workbench.CSP)
        self.assertEqual(len(workbench.ROUTES), 3,
                         'the allowlist grew; if the mark can be served as a file, the '
                         'data URI should be replaced by that route and this test updated '
                         'with the CSP line that makes it legal')

    def test_the_service_still_serves_the_stylesheet_that_carries_it(self):
        from design_lab import workbench
        body, mime = workbench.resource('/workbench/style.css')
        self.assertEqual(mime, 'text/css')
        self.assertIn(b'--brand-mark', body)
        self.assertEqual(hashlib.sha256(rba.PNG_PATH.read_bytes()).hexdigest()[:16],
                         re.search(rb'brand-mark:begin sha256=([0-9a-f]{16})', body).group(1).decode())


class _temp_pair:
    """Context manager writing a (png, css) pair to a temp dir and yielding the paths."""

    def __init__(self, css_bytes: bytes, png_bytes: bytes):
        self.css_bytes, self.png_bytes = css_bytes, png_bytes

    def __enter__(self):
        import tempfile
        self.dir = tempfile.TemporaryDirectory()
        root = Path(self.dir.name)
        css = root / 'style.css'
        png = root / 'mark.png'
        css.write_bytes(self.css_bytes)
        png.write_bytes(self.png_bytes)
        return png, css

    def __exit__(self, *exc):
        self.dir.cleanup()
        return False


if __name__ == '__main__':
    unittest.main(verbosity=2)
