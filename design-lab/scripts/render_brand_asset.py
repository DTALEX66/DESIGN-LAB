#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Extract the DESIGN-LAB brand mark from the owner's black-and-white artwork and
inline it into the served stylesheet as a data URI.

Why a data URI and not an asset route: src/design_lab/workbench.py serves a fixed
three-path allowlist ("never serve arbitrary paths or project assets") and its CSP
says `img-src data:`. A new /workbench/*.png route would mean widening both. The
stylesheet is already a served route, so the mark travels inside it.

The lockup has three ink bands (monogram / DESIGN-LAB / 设计实验室). Only the
monogram is used here: the brand slot is a 48px square and a 1088x117 wordmark does
not survive that reduction. The bands are found by measuring the image, not by
hardcoded coordinates.

Usage:
    python design-lab/scripts/render_brand_asset.py --source <BW artwork> [--check]
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
BRAND_DIR = REPO / 'apps' / 'workbench' / 'brand'
PNG_PATH = BRAND_DIR / 'design-lab-mark.png'
PROVENANCE = BRAND_DIR / 'PROVENANCE.json'
CSS_PATH = REPO / 'apps' / 'workbench' / 'style.css'
CANVAS = 144          # square output canvas; the tile renders it at 48px (3x)
GLYPH_FILL = 0.86     # fraction of the canvas the glyph occupies
LO, HI = 64.0, 192.0  # luminance ramp: below LO is transparent, above HI is solid
BEGIN = '/* brand-mark:begin sha256='
END = '/* brand-mark:end */'


def bands(mask: np.ndarray) -> list[tuple[int, int]]:
    """Row spans that carry ink, in y order. Ink fraction > 0.2% of the row."""
    rows = (mask.mean(axis=1) > 0.002)
    out, start = [], None
    for y, on in enumerate(rows):
        if on and start is None:
            start = y
        elif not on and start is not None:
            out.append((start, y - 1))
            start = None
    if start is not None:
        out.append((start, len(rows) - 1))
    return out


def extract(source: Path) -> tuple[bytes, dict]:
    im = Image.open(source)
    if im.mode not in ('L', 'LA', 'RGB', 'RGBA'):
        raise SystemExit(f'BRAND_SOURCE_UNUSABLE {im.mode}')
    lum = np.asarray(im.convert('L'), dtype=np.float32)
    alpha = np.clip((lum - LO) / (HI - LO), 0.0, 1.0)
    found = bands(alpha > 0.5)
    if not found:
        raise SystemExit('BRAND_SOURCE_HAS_NO_INK')
    # The monogram is the band closest to square -- not "the first band", which would
    # silently become the wordmark if the artwork were ever cropped above it.
    def squareness(span):
        y0, y1 = span
        box = alpha[y0:y1 + 1] > 0.5
        xs = np.where(box.any(axis=0))[0]
        w, h = xs.max() - xs.min() + 1, y1 - y0 + 1
        return max(w / h, h / w)

    y0, y1 = min(found, key=squareness)
    box = alpha[y0:y1 + 1] > 0.0
    xs = np.where(box.any(axis=0))[0]
    ys = np.where(box.any(axis=1))[0]
    x0, x1 = xs.min(), xs.max()
    crop = alpha[y0 + ys.min():y0 + ys.max() + 1, x0:x1 + 1]
    ch, cw = crop.shape
    side = CANVAS
    glyph = int(round(side * GLYPH_FILL))
    scale = glyph / max(cw, ch)
    nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    rgba = np.zeros((side, side, 4), dtype=np.uint8)
    resampled = Image.fromarray((crop * 255).astype(np.uint8), 'L').resize(
        (nw, nh), Image.LANCZOS)
    pad = np.pad(np.asarray(resampled, dtype=np.uint8),
                 ((0, nh % 2), (0, nw % 2)))  # keep the centre exact on odd sizes
    ph, pw = pad.shape
    top, left = (side - ph) // 2, (side - pw) // 2
    rgba[top:top + ph, left:left + pw] = np.dstack(
        [np.full(pad.shape, 255, np.uint8)] * 3 + [pad])
    out = Image.fromarray(rgba, 'RGBA')
    png = _encode(out)
    return png, {
        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'source_size': list(im.size),
        'monogram_band': [int(x0), int(y0 + ys.min()), int(x1), int(y0 + ys.max())],
        'monogram_source_px': [int(cw), int(ch)],
        'canvas_px': side,
        'glyph_px': [int(pw), int(ph)],
        'luminance_ramp': [LO, HI],
    }


def _encode(im: Image.Image) -> bytes:
    from io import BytesIO
    buf = BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def css_block(png: bytes) -> str:
    """The generated region, as declarations inside the existing `:root` block.

    It is a token, not a second `:root` rule: design-lab/tests/
    test_workbench_css_single_definition.py fails on a selector defined twice, and the
    cascade would make the later block the winner for every token in it.
    """
    digest = hashlib.sha256(png).hexdigest()
    uri = 'data:image/png;base64,' + base64.b64encode(png).decode('ascii')
    return (f'  {BEGIN}{digest} */\n'
            f'  --brand-mark:url("{uri}");\n'
            f'  {END}\n')


REGION = re.compile(r'[ \t]*' + re.escape(BEGIN) + r'[0-9a-f]{64} \*/.*?'
                    + re.escape(END) + r'\n?', re.S)


def patch_css(text: str, block: str) -> str:
    found = REGION.findall(text)
    if len(found) != 1:
        # Two regions would mean the generator rewrites one and the page reads the
        # other -- the stale copy wins by cascade order and nothing says so.
        raise SystemExit(f'BRAND_CSS_REGION_COUNT={len(found)} (exactly one is required)')
    return REGION.sub(lambda _: block, text, count=1)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', type=Path)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args(argv)

    if args.check:
        # The shipped mark is now the owner's vector, not a bitmap cut-out: the token derives from
        # apps/workbench/brand/design-mark.svg, so the check follows that byte-for-byte. The PNG
        # pipeline below is kept for provenance of the superseded asset, and a checker that still
        # hashed it would either fail on a correct stylesheet or pass on a stale one.
        mark_path = BRAND_DIR / 'design-mark.svg'
        if not mark_path.is_file():
            print('BRAND_ASSET_MISSING design-mark.svg is not on disk')
            return 1
        mark = mark_path.read_bytes()
        css = CSS_PATH.read_text(encoding='utf-8')
        m = re.search(r'[ \t]*' + re.escape(BEGIN) + r'([0-9a-f]{64}) \*/.*?'
                      r'--brand-mark-paper:url\("data:image/svg\+xml;base64,([A-Za-z0-9+/=]*)"\);\s*'
                      r'--brand-mark-ink:url\("data:image/svg\+xml;base64,([A-Za-z0-9+/=]*)"\);\s*'
                      r'--brand-mark:var\(--brand-mark-(paper|ink)\);.*?'
                      + re.escape(END), css, re.S)
        if not m:
            print('BRAND_CSS_REGION_UNREADABLE the managed block no longer carries the two '
                  'svg encodings plus the default selection this check expects')
            return 1
        claimed, paper_b64, ink_b64, default_variant = m.group(1), m.group(2), m.group(3), m.group(4)
        problems = []
        if hashlib.sha256(mark).hexdigest() != claimed:
            problems.append('the tracked design-mark.svg no longer matches the digest the css claims')
        for name, blob, want_fill in (('paper', paper_b64, '#EEF2F5'), ('ink', ink_b64, '#17212B')):
            decoded = base64.b64decode(blob)
            if b'<path d=' not in decoded:
                problems.append(f'--brand-mark-{name} is not a path-bearing svg')
                continue
            if decoded.replace(b' ', b'').count(b'<path') < 1:
                problems.append(f'--brand-mark-{name} carries no path geometry')
            if ('fill="%s"' % want_fill).encode() not in decoded:
                problems.append(f'--brand-mark-{name} does not carry the {want_fill} ink it claims')
            if b'viewBox' not in decoded:
                problems.append(f'--brand-mark-{name} lost its viewBox, so it cannot scale to the tile')
        source_paths = mark.count(b'<path ')
        for name, blob in (('paper', paper_b64), ('ink', ink_b64)):
            got = base64.b64decode(blob).count(b'<path ')
            if got != source_paths:
                problems.append(f'--brand-mark-{name} carries {got} paths, the tracked svg has '
                                f'{source_paths}')
        if default_variant != 'paper':
            problems.append('the default --brand-mark must be the paper glyph, because the '
                            'shipped palette is charcoal; a light palette has to opt in explicitly')
        # Every `--brand-mark:var(--brand-mark-ink)` outside the managed block is one light palette
        # opting in; the block's own default is the paper glyph, so it never appears there and no
        # correction term is needed. (An earlier draft subtracted one and so convicted a correct
        # stylesheet of being one palette short.)
        light_flips = len(re.findall(r'--brand-mark:var\(--brand-mark-ink\);', css))
        if light_flips < 2:
            problems.append(f'only {light_flips} light palette(s) opt into the ink glyph; both '
                            'ui2026/light and stitch/light must, or the mark is invisible there')
        if problems:
            print('BRAND_CSS_STALE: ' + '; '.join(problems))
            return 1
        print(f'BRAND_ASSET=OK svg={len(mark)}B paths={source_paths} encodings=2 '
              f'default={default_variant} light_flips={light_flips}')
        return 0

    if not args.source or not args.source.is_file():
        print('BRAND_SOURCE_REQUIRED -- an existing --source path is needed to regenerate')
        return 2
    BRAND_DIR.mkdir(parents=True, exist_ok=True)
    png, meta = extract(args.source)
    before = PNG_PATH.read_bytes() if PNG_PATH.is_file() else None
    PNG_PATH.write_bytes(png)
    PROVENANCE.write_bytes((json.dumps(meta, indent=2) + '\n').encode('utf-8'))
    css = CSS_PATH.read_text(encoding='utf-8')
    CSS_PATH.write_text(patch_css(css, css_block(png)), encoding='utf-8', newline='')
    same = 'unchanged' if before == png else 'rewritten'
    print(f'BRAND_ASSET=OK png={len(png)}B ({same}) canvas={meta["canvas_px"]} '
          f'glyph={meta["glyph_px"]} from {meta["monogram_source_px"]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
