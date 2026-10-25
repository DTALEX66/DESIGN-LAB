// SPDX-License-Identifier: MIT
// Workbench contrast gate — real Chromium against the real loopback service.
//
// Answers one question: is any rendered text below WCAG 2.1 AA contrast for the
// background it is actually painted on?
//
// Env: E2E_SERVICE_URL E2E_TOKEN E2E_NODE_MODULES [E2E_BROWSER]
//      [CT_WIDTHS=1440,390] [CT_OUT=<json path>] [CT_STRICT=1]
//
// Why this exists next to the overflow gate: the overflow gate measures geometry
// (clipped / stray / tiny). A gradient pill with light-on-light text is none of
// those -- it is perfectly sized, fully visible, and unreadable. Nothing in the
// suite computed a contrast ratio before this file, and the repo has no contrast
// implementation anywhere in Python, so "brand blue cannot carry white body text"
// was an argument instead of a number.
//
// Deliberately conservative in two places, because a contrast gate that is easy
// to satisfy is worthless:
//   · gradient backgrounds are parsed into their colour stops and the WORST stop
//     is used, so a pill cannot pass by having one light end;
//   · ancestor opacity is composited into the foreground, so text at opacity:.72
//     is measured as what the eye sees, not as its declared colour.
//
// Falsification is a maths self-test, not a DOM trick: the probe recomputes
// published WCAG 2.1 reference ratios (1:1, 21:1, 4.54:1, 4.48:1) with the same
// lum()/ratio() it uses for real text, and exits 1 if any is off by >0.06.
// gate can be seen going red before its green is trusted.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browserPath = process.env.E2E_BROWSER || undefined;
const widths = (process.env.CT_WIDTHS || '1440,1920')
  .split(',').map((w) => Number.parseInt(w, 10)).filter((w) => Number.isFinite(w) && w > 0);
const outPath = process.env.CT_OUT || '';
const strict = process.env.CT_STRICT === '1';

const fail = (reason) => { console.error('CT_FAIL: ' + reason); process.exit(2); };
if (!serviceUrl || !token || !nmDir) fail('CT_CONFIG_MISSING');
if (!/^[0-9a-f]{64}$/.test(token)) fail('CT_TOKEN_SHAPE');
if (widths.length === 0) fail('CT_WIDTHS_EMPTY');

const req = createRequire(nmDir + '/noop.js');
const { chromium } = req('playwright');

const ROUTES = [
  ['workbench', ''], ['dashboard', '#/dashboard'], ['projects', '#/projects'],
  ['research', '#/research'], ['brand-systems', '#/brand-systems'], ['domains', '#/domains'],
  ['tools', '#/tools'], ['preflight', '#/preflight'], ['deliverables', '#/deliverables'],
  ['evidence', '#/evidence'], ['collaboration', '#/collaboration'], ['settings', '#/settings'],
  // DL-UI-U02 (2026-10-09): the three new slots. A route absent from this list is never
  // rendered by this gate, so it can never fail it either -- the 2026-10-07 finding.
  ['capabilities', '#/capabilities'], ['states', '#/states'], ['components', '#/components'],
  // R2 §2: the domain detail drawer is a surface of its own. Its captions are the muted
  // small-text kind that most often fails AA, and a route missing here is a route whose
  // contrast was never measured.
  ['domain-detail', '#/domains/brand-design'],
  ['intake', '#/intake'],
  // 提示词工程与模型选择是两条新读面。不进这份清单就永远不会被这个闸渲染，也就
  // 永远不会让它失败——2026-10-07 记下的正是这种覆盖洞，而不是假设。
  ['prompt-intelligence', '#/prompts'],
  ['model-selection', '#/models'],
  ['plan', '#/plan'],
  ['analysis', '#/analysis'],
  // DL-KB-03/06: 知识与提示词库的 meta 行、命中说明与详情小字都是小号弱色文本，最容易掉 AA。
  ['knowledge', '#/knowledge'],
  // DL-KB-08: 设计辅助的四态药丸用的是 .tag 的既有填充，但 meta 行与折叠摘要都是弱色小字，
  // 必须和知识屏一样逐条量过，否则「四态可读」只是文案断言。
  ['assistant', '#/assistant'],
  // DL-KB-10: 目标组合选择面板。四档 support_state 药丸（info/warn/bad/neutral）与档案正文的
  // 小号说明行是这一面的全部弱色文本；两栏对照如果只靠颜色区分而颜色本身掉 AA，「看得出区别」
  // 就是一句没有几何支撑的话，所以这条必须和知识屏、辅助屏一样逐条量过。
  ['target-profiles', '#/target-profiles'],
];

const MEASURE = () => {
  // Chromium serialises a resolved `color-mix()` as `color(srgb r g b / a)` (values 0..1 or
  // percentages), not as `rgba()`, so a stylesheet that uses color-mix silently disappears
  // from a rgb-only parser: the layer is dropped and the text is measured against whatever
  // is behind it. That is a false green, which is worse than a red.
  const SRGB = /^color\(\s*srgb\s+([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/;
  // Chromium serialises a resolved `color-mix(in oklab, …)` (and any colour it lands in the
  // OKLab space) as `oklab(L a b / alpha)`, not as `rgb()`. A parser that stops at rgb() drops
  // that layer, and dropping a backdrop is how a 1:1 pair gets graded against the page behind
  // it. OKLab -> linear sRGB is Ottosson's published inverse: LMS cone space from the L/a/b
  // opponent axes, cube each channel, then the M1 matrix, then the sRGB transfer curve.
  const OKLAB = /^oklab\(\s*([-\d.eE%]+)\s+([-\d.eE%]+)\s+([-\d.eE%]+)(?:\s*\/\s*([-\d.eE%]+))?\s*\)$/;
  const channel = (token, scale) => {
    if (token.endsWith('%')) return (parseFloat(token) / 100) * scale;
    return parseFloat(token);
  };
  const oklabToRgb = (l, a, b) => {
    const l_ = l + 0.3963377794 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
    const [lc, mc, sc] = [l_ ** 3, m_ ** 3, s_ ** 3];
    const lin = [
      4.0767416621 * lc - 3.3077115993 * mc + 0.2309699292 * sc,
      -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
      -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc,
    ];
    return lin.map((v) => {
      const g = v <= 0.0031308 ? v * 12.92 : 1.055 * (v ** (1 / 2.4)) - 0.055;
      return Math.min(255, Math.max(0, Math.round(g * 255)));
    });
  };
  const unknown = [];
  const noteUnknown = (where, value) => {
    if (unknown.length < 12) unknown.push(`${where} ${String(value).slice(0, 48)}`);
  };
  const num = (token, scale) => {
    if (token === undefined || token === null) return scale;
    return token.endsWith('%')
      ? Math.round((parseFloat(token) / 100) * 255)
      : Math.round(parseFloat(token) * scale);
  };
  const parse = (c, label) => {
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(c || '');
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
    const s = SRGB.exec((c || '').trim());
    if (s) {
      const alpha = s[4] === undefined ? 1
        : (s[4].endsWith('%') ? parseFloat(s[4]) / 100 : parseFloat(s[4]));
      return { r: num(s[1], 255), g: num(s[2], 255), b: num(s[3], 255), a: alpha };
    }
    const o = OKLAB.exec((c || '').trim());
    if (o) {
      const [r, g, b] = oklabToRgb(channel(o[1], 1), channel(o[2], 0.4), channel(o[3], 0.4));
      const alpha = o[4] === undefined ? 1 : channel(o[4], 1);
      return { r, g, b, a: Math.min(1, Math.max(0, alpha)) };
    }
    if (c && !/^(transparent|none|normal)$/.test(String(c).trim())
        && String(c).trim() !== 'rgba(0, 0, 0, 0)') {
      // The property and the node are part of the finding: "2 colours unparsable" without a
      // location makes the next reader re-instrument this gate to learn where to look.
      noteUnknown('unparsed-colour[' + (label || '?') + ']:', c);
    }
    return null;
  };
  // Colour stops inside a linear-gradient()/radial-gradient() value. Chromium
  // leaves these as authored text, so they must be read out of the string.
  const gradientStops = (image, label) => {
    if (!image || image === 'none') return [];
    const out = [];
    // A colour function Chromium serialises outside rgb()/color() -- `oklab(...)`, `lab(...)`,
    // `color(oklch ...)` -- must NOT match silently: a stop that this loop cannot see is a
    // background that drops out of the stack and the text gets graded against the page behind
    // it. So the alternation names the colour functions it knows, and anything else that looks
    // like a colour reaches noteUnknown through the fallback branch below.
    for (const mm of image.matchAll(/rgba?\([^)]*\)|color\([^)]*\)|[a-z-]*lab\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g)) {
      const p = parse(mm[0].startsWith('#')
        ? (() => {
            let h = mm[0].slice(1);
            if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
            const n = parseInt(h.slice(0, 6), 16);
            const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
            return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
          })()
        : mm[0], label);
      if (p) out.push(p);
    }
    return out;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)];
    const [hi, lo] = x >= y ? [x, y] : [y, x];
    return (hi + 0.05) / (lo + 0.05);
  };

  // The gate's failure mode is the maths, not the DOM, so the maths is asserted
  // here with published WCAG 2.1 reference ratios. A broken lum()/ratio() would
  // otherwise make every real run look green.
  const math = [];
  {
    const pairs = [
      ['#777777', '#777777', 1], ['#FFFFFF', '#000000', 21],
      ['#767676', '#FFFFFF', 4.54], ['#777777', '#FFFFFF', 4.48],
    ];
    for (const [a, b, want] of pairs) {
      const n = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16),
                          b: parseInt(h.slice(5, 7), 16), a: 1 });
      const got = Math.round(ratio(n(a), n(b)) * 100) / 100;
      math.push({ a, b, want, got, ok: Math.abs(got - want) <= 0.06 });
    }
  }

  const canvas = parse(getComputedStyle(document.body).backgroundColor, 'body canvas')
    || { r: 255, g: 255, b: 255, a: 1 };

  // The OKLab branch is checked against published conversions, not against itself: a forward
  // helper written next to the inverse would agree with it by construction and prove nothing.
  // These four vectors are the CSS Color 4 spec's own sRGB <-> OKLab pairs.
  const colour = [];
  for (const [value, want] of [
    ['oklab(1 0 0)', [255, 255, 255]],
    ['oklab(0 0 0)', [0, 0, 0]],
    ['oklab(0.62796 0.22486 0.12585)', [255, 0, 0]],
    ['oklab(0.45201 -0.03246 -0.31153)', [0, 0, 255]],
  ]) {
    const got = parse(value);
    const ok = !!got && Math.abs(got.r - want[0]) <= 2 && Math.abs(got.g - want[1]) <= 2
      && Math.abs(got.b - want[2]) <= 2;
    colour.push({ value, want: want.join(','), got: got ? `${got.r},${got.g},${got.b}` : 'null', ok });
  }

  // Planted violations. They are excluded from the product counts and reported separately:
  // each one proves a code path that would otherwise pass silently.
  const CONTROL_IDS = ['ct-control', 'ct-collapsed'];

  // Control, planted before the sweep so the ordinary per-node path grades it: white text
  // on a background Chromium reports as `color(srgb 1 1 1)` -- the serialisation a resolved
  // `color-mix()` produces. A parser that cannot read that form drops the background and
  // grades the text against the dark page canvas instead, which is a 21:1 PASS on a 1:1
  // white-on-white pair. If this control ever stops being reported, the parser has regressed
  // and every green below it is a lie.
  {
    const control = document.createElement('div');
    control.id = 'ct-control';
    control.style.cssText = 'position:fixed;left:-10000px;top:0;width:140px;height:40px;'
      + 'background:color(srgb 1 1 1);color:rgb(255, 255, 255);font-size:16px;font-weight:400';
    control.textContent = 'AA CONTROL';
    document.body.append(control);
  }

  // Collapsed-detail control. A closed `<details>` is the one case where Chromium keeps a
  // real layout box for text it does not paint: `::details-content` is
  // `content-visibility: hidden`, the child's rect is its normal size, `display` is `block`
  // and `opacity` is 1, so every filter below lets it through. `elementsFromPoint` on that
  // rect then returns whatever sibling panel occupies the pixel, and the veil branch grades
  // the invisible glyph as if it were seen through that sibling -- this gate's first false
  // failure, a 1.31:1 report on text nobody can read at that moment. The two sides of the
  // fix are asserted together, so neither half can be dropped silently:
  //   · the run must NOT be graded while closed (counted in `collapsed`), proving unpainted
  //     text is out of the population;
  //   · the run must BE graded after the pre-pass opens it (1:1 white-on-white), proving the
  //     skip does not quietly shrink coverage -- collapsed content is measured in the state
  //     a person actually reaches.
  {
    const host = document.createElement('details');
    host.id = 'ct-collapsed-host';
    host.style.cssText = 'position:fixed;left:-10000px;top:60px;width:220px';
    const summary = document.createElement('summary');
    summary.textContent = 'AA COLLAPSED SUMMARY';
    const control = document.createElement('div');
    control.id = 'ct-collapsed';
    control.style.cssText = 'width:220px;height:40px;background:color(srgb 1 1 1);'
      + 'color:rgb(255, 255, 255);font-size:16px;font-weight:400';
    control.textContent = 'AA COLLAPSED CONTROL';
    host.append(summary, control);
    document.body.append(host);
  }

  // Runs inside a closed detail are not painted; open every detail first, then collect, so the
  // population is exactly "text a person can be shown" and never "text a snapshot happens to
  // have expanded". `collapsed` keeps the number of runs this decision brought into the sweep.
  let collapsed = 0;
  for (const host of document.querySelectorAll('details:not([open])')) {
    for (const el of host.querySelectorAll('body *')) {
      // The summary is the one descendant a closed detail does paint, so it is not a collapsed run.
      if (el.tagName === 'SUMMARY' && el.parentElement === host) continue;
      if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)) continue;
      if (el.closest('details:not([open])') !== host) continue;  // count it once, at its nearest closed host
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      collapsed += 1;
    }
    host.open = true;
  }

  // Every element that paints text of its own.
  const targets = [];
  for (const el of document.querySelectorAll('body *')) {
    const own = Array.from(el.childNodes).some((n) =>
      n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.classList.contains('sr-status')) continue;  // deliberately clipped
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    if (parseFloat(cs.opacity) === 0) continue;
    targets.push({ el, cs, box });
  }

  const fails = [];
  let checked = 0;
  let pseudoLayers = 0;
  let coveredForeign = 0;
  const coveredExamples = [];
  let obscured = 0;
  const obscuredExamples = [];
  let margin = null;
  const nodeTag = (n) => `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}`
    + (typeof n.className === 'string' && n.className.trim()
      ? '.' + n.className.trim().split(/\s+/).join('.') : '');
  const desc = (el) => {
    const cls = (el.getAttribute('class') || '').trim();
    const id = el.id ? `#${el.id}` : '';
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return `${el.tagName.toLowerCase()}${id}${cls ? '.' + cls.split(/\s+/).join('.') : ''} :: ${txt}`;
  };

  for (const { el, cs, box } of targets) {
    const fg0 = parse(cs.color, 'fg of ' + desc(el).slice(0, 70));
    if (!fg0) continue;

    // Build the stack of backgrounds from the element outward, then composite.
    const stack = [];
    let ancestorsOpaque = false;
    for (let p = el; p && !ancestorsOpaque; p = p.parentElement) {
      const s = getComputedStyle(p);
      const solid = parse(s.backgroundColor, 'background of ' + nodeTag(p));
      if (solid && solid.a > 0) stack.push({ solid });
      const stops = gradientStops(s.backgroundImage, 'background-image of ' + nodeTag(p));
      if (stops.length) stack.push({ stops });
      // A `::before`/`::after` is a real backdrop only where it actually covers the box.
      // Measured on the active nav item: its `::before` is a 3px x 25px indicator bar at
      // left:-4px, and treating it as a candidate background put a bright gradient behind
      // text that is painted on a dark scrim -- a phantom 2.21:1 failure. So a pseudo layer
      // only enters the stack when its resolved box covers most of its originator's box,
      // which is how the full-bleed scrims are written (`inset:0`) and the bars are not.
      for (const pseudo of ['::before', '::after']) {
        const ps = getComputedStyle(p, pseudo);
        if (!ps.content || ps.content === 'none') continue;
        const host = p.getBoundingClientRect();
        const pw = parseFloat(ps.width);
        const ph = parseFloat(ps.height);
        if (!(host.width > 0 && host.height > 0)
            || !(Number.isFinite(pw) && Number.isFinite(ph))
            || pw < host.width * 0.6 || ph < host.height * 0.6) continue;
        const pSolid = parse(ps.backgroundColor, 'background of ' + nodeTag(p) + pseudo);
        if (pSolid && pSolid.a > 0) { stack.push({ solid: pSolid }); pseudoLayers += 1; }
        const pStops = gradientStops(ps.backgroundImage, 'background-image of ' + nodeTag(p) + pseudo);
        if (pStops.length) { stack.push({ stops: pStops }); pseudoLayers += 1; }
      }
      if (solid && solid.a >= 1) ancestorsOpaque = true;
    }

    // Candidate backgrounds: worst case over every gradient stop present at any
    // level, combined with the solid colours beneath it. The stack was collected
    // element-outward, so it has to be painted innermost-index-LAST: the element's
    // own background is the topmost layer, and reversing here is what makes a
    // gradient pill resolve to the pill rather than to the page behind it.
    const candidates = [];
    const layers = stack.slice().reverse();
    const walk = (i, cur) => {
      if (i >= layers.length) { candidates.push(cur); return; }
      const layer = layers[i];
      if (layer.stops) {
        for (const stop of layer.stops) walk(i + 1, over({ ...stop }, cur));
        // A gradient with an alpha-bearing stop can genuinely let the layer
        // beneath show through, so that pairing is a real candidate. An opaque
        // gradient is never absent -- adding a "no stop at all" branch would put
        // an impossible background into the set, and taking the minimum over a
        // set that contains an impossibility reports a phantom 1:1 for every
        // gradient pill. That was this gate's first bug.
        if (layer.stops.some((s) => s.a < 1)) walk(i + 1, cur);
      } else {
        walk(i + 1, over({ ...layer.solid }, cur));
      }
    };
    walk(0, canvas);
    if (candidates.length === 0) candidates.push(canvas);

    // What actually owns this pixel may not be an ancestor: a modal scrim, a floating card,
    // a toast. Measured on the shipped UI, one text run in 2461 has such an owner. Two
    // different things follow, and conflating them produced a false failure the first time:
    //   · a translucent owner mixes with what is under it, so the visible pairing really is
    //     lighter -- that is a contrast question and it is graded here;
    //   · an opaque owner means the text is not visible at all. WCAG 1.4.3 is about text an
    //     eye can see, so it is skipped here and counted as `obscured`; whether something
    //     ought to be reachable at all is the geometry gate's question, not this one.
    let foreign = null;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      const hit = document.elementsFromPoint(cx, cy)[0];
      if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) {
        const hs = getComputedStyle(hit);
        const veil = parse(hs.backgroundColor, 'veil background of ' + nodeTag(hit));
        const stop = gradientStops(hs.backgroundImage,
          'veil background-image of ' + nodeTag(hit))[0];
        const owner = (veil && veil.a > 0) ? veil : (stop || null);
        const name = `${hit.tagName.toLowerCase()}${hit.id ? '#' + hit.id : ''}`;
        if (owner && owner.a >= 1) {
          obscured += 1;
          if (obscuredExamples.length < 4) obscuredExamples.push(name);
          continue;
        }
        if (owner) {
          // A backdrop only counts for the text it really covers, so require the owner's
          // box to contain the text box -- the same lesson the pseudo-element branch learned
          // from a 3px indicator bar.
          const ownerBox = hit.getBoundingClientRect();
          const covers = ownerBox.left <= box.left + 1 && ownerBox.right >= box.right - 1
            && ownerBox.top <= box.top + 1 && ownerBox.bottom >= box.bottom - 1;
          if (covers) {
            foreign = owner;
            coveredForeign += 1;
            if (coveredExamples.length < 4) {
              coveredExamples.push(`${name} a=${Math.round(owner.a * 100) / 100}`);
            }
          }
        }
      }
    }

    // Ancestor opacity makes the text lighter against its own backdrop.
    let alpha = 1;
    for (let p = el; p; p = p.parentElement) alpha *= parseFloat(getComputedStyle(p).opacity) || 1;

    const size = parseFloat(cs.fontSize) || 16;
    const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;

    // Worst rendered pairing is the honest one. A veil above the text is composited over
    // both the glyph and its background, because that is what reaches the eye.
    let worst = null;
    for (const base of candidates) {
      const bg = foreign ? over({ ...foreign }, base) : base;
      let eff = over({ r: fg0.r, g: fg0.g, b: fg0.b, a: fg0.a * alpha }, base);
      if (foreign) eff = over({ ...foreign }, eff);
      const r = ratio(eff, bg);
      if (worst === null || r < worst.ratio) worst = { ratio: r, bg };
    }
    checked += 1;
    // The margin is the useful half of a green: 0 violations without the closest
    // node's ratio cannot tell a comfortable pass from one one rounding away from red.
    // The planted control is excluded -- it is a deliberate 1:1, so including it would
    // make every run report the tightest pair as the test fixture.
    if (!CONTROL_IDS.includes(el.id) && (margin === null || worst.ratio < margin.ratio)) {
      margin = { ratio: Math.round(worst.ratio * 100) / 100, need, el: desc(el).slice(0, 90) };
    }
    if (worst.ratio < need) {
      fails.push({
        el: desc(el), px: Math.round(size * 10) / 10, bold,
        need, got: Math.round(worst.ratio * 100) / 100,
        fg: cs.color, opacity: Math.round(alpha * 100) / 100,
      });
    }
  }

  // Every row a planted fixture produced. `reported` below answers a different question -- did
  // each control id appear at least once, i.e. is the parser still able to see the colour form --
  // and that is a boolean per id. Subtracting it from failCount instead of the row count turned
  // the fixture's own duplicate rows (one collapsed control per <details> on a long page) into
  // product debt the moment those rows stopped being masked by a covering pseudo layer.
  const controlRows = fails.filter((f) => CONTROL_IDS.some((id) => f.el.includes('#' + id))).length;
  const control = { planted: CONTROL_IDS.length, reported: 0, detail: [] };
  for (const id of CONTROL_IDS) {
    const row = fails.find((f) => f.el.includes('#' + id)) || null;
    if (row) control.reported += 1;
    control.detail.push({ id, reported: !!row, ratio: row ? row.got : null });
  }
  for (const id of [...CONTROL_IDS, 'ct-collapsed-host']) document.querySelector('#' + id)?.remove();
  return { checked, fails: fails.slice(0, 60), failCount: fails.length, controlRows, math, colour,
           pseudoLayers, unknown, control, margin, collapsed,
           coveredForeign, coveredExamples, obscured, obscuredExamples };
};

// The 20261023 pack writes its visual rules as numbers, so the replication is graded against
// those numbers instead of against an opinion: 正文 14–16px、元数据至少 12px; 控件高度约 36–40px;
// 圆角输入/按钮 6–10px、临时面板 12–16px; 玻璃只给顶栏/导航/临时面板，长文字与列表实底
// (source/09_DESIGN.md, source/08_STITCH完整提示词.txt, adopted by the owner on 2026-10-23 as
// 「按此实施」). A grep of style.css cannot answer any of these -- `.eyebrow` is declared at 10px
// on line 240 and raised to 12px on line 1601, so only the painted document knows what a person
// actually reads. This pass measures that; the verdict is taken outside the page.
const MEASURE_SPEC = () => {
  const round1 = (v) => Math.round(v * 10) / 10;
  const nodeTag = (n) => `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}`
    + (typeof n.className === 'string' && n.className.trim()
      ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const words = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const painted = (el, cs) => {
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    const b = el.getBoundingClientRect();
    return b.width >= 1 && b.height >= 1;
  };
  // Alpha of a computed colour, with no default when the serialisation is unknown: assuming
  // `solid` for a form this file has not seen would silently grade a translucent card as 实底,
  // which is the exact defect this check exists to find.
  const alphaOf = (value) => {
    const s = (value || '').trim();
    if (s === '' || s === 'none' || s === 'transparent') return 0;
    let m = s.match(/^rgba?\([^)]*,\s*([\d.]+)\s*\)$/);
    if (m) return parseFloat(m[1]);
    if (s.startsWith('rgb(')) return 1;
    m = s.match(/^color\([^)/]*\/\s*([\d.]+)\s*\)$/);
    if (m) return parseFloat(m[1]);
    if (s.startsWith('color(')) return 1;
    return null;
  };

  const all = Array.from(document.querySelectorAll('body *'));
  const runs = [];
  for (const el of all) {
    const own = Array.from(el.childNodes).some((n) =>
      n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    if (el.classList.contains('sr-status')) continue;
    runs.push({ el, cs });
  }

  const sizes = {};
  let minPx = Infinity;
  let below12 = 0;
  const below12Examples = [];
  let inBodyBand = 0;
  for (const { el, cs } of runs) {
    const px = round1(parseFloat(cs.fontSize) || 0);
    sizes[px] = (sizes[px] || 0) + 1;
    if (px < minPx) minPx = px;
    if (px >= 14 && px <= 16) inBodyBand += 1;
    if (px < 12) {
      below12 += 1;
      if (below12Examples.length < 12) {
        below12Examples.push(`${px}px ${nodeTag(el)} :: ${words(el).slice(0, 40)}`);
      }
    }
  }

  const controls = [];
  // The pack's 控件高度 and 圆角 6–10px sentences are about form controls and the action
  // buttons, so that is the graded population. A checkbox is 13px tall by design and a status
  // pill is round on purpose -- the pack's own HTML ships `.status{border-radius:20px}` -- so
  // sweeping them into the same band would convict two things the spec never addressed.
  const FORM = 'button.ghost-btn, button.soft-btn, button.primary-btn, button.danger-btn,'
    + ' input, select, textarea';
  for (const el of document.querySelectorAll('button, input:not([type=hidden]), select, textarea')) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    const box = el.getBoundingClientRect();
    const kind = el.tagName.toLowerCase();
    const isForm = (kind === 'input' || kind === 'select' || kind === 'textarea'
        || (kind === 'button' && el.matches(FORM)))
      && !(kind === 'input' && ['checkbox', 'radio'].includes((el.type || '').toLowerCase()));
    controls.push({ el, cs, h: Math.round(box.height), isForm,
                    r: round1(parseFloat(cs.borderTopLeftRadius) || 0) });
  }
  const heights = {};
  const radii = {};
  let formCount = 0;
  let formBelow36 = 0;
  const formSmallExamples = [];
  let formRadiusOver10 = 0;
  const formRadiusExamples = [];
  for (const c of controls) {
    heights[c.h] = (heights[c.h] || 0) + 1;
    radii[c.r] = (radii[c.r] || 0) + 1;
    if (!c.isForm) continue;
    formCount += 1;
    if (c.h < 36) {
      formBelow36 += 1;
      if (formSmallExamples.length < 10) formSmallExamples.push(`${c.h}px ${nodeTag(c.el)}`);
    }
    if (c.r > 10) {
      formRadiusOver10 += 1;
      if (formRadiusExamples.length < 10) formRadiusExamples.push(`${c.r}px ${nodeTag(c.el)}`);
    }
  }

  // Where glass is actually used. The pack limits it to the top bar, the navigation and
  // temporary panels, so the honest check is the list of names -- an allowlist over these
  // is a decision this file can state, and anything not on it is a defect with a name.
  const glass = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    const bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
    if (bf === 'none') continue;
    glass.push(`${nodeTag(el)} ${bf}`);
  }

  // 长文字与列表实底: for a run that carries a paragraph of prose, or for a list row, the
  // nearest ancestor that owns a background has to be opaque. Walking outward is what makes
  // this a statement about the surface a person sees rather than about one element's CSS.
  let veilHosts = 0;
  let unknownColour = 0;
  const veilExamples = [];
  for (const { el, cs } of runs) {
    const isListRow = el.closest('li, tr') !== null;
    const isLongProse = words(el).length >= 120;
    if (!isListRow && !isLongProse) continue;
    const ownAlpha = alphaOf(cs.backgroundColor);
    if (ownAlpha === null) { unknownColour += 1; continue; }
    if (ownAlpha > 0) {
      if (ownAlpha < 1) {
        veilHosts += 1;
        if (veilExamples.length < 8) veilExamples.push(`${nodeTag(el)} a=${ownAlpha}`);
      }
      continue;
    }
    let alpha = 1;
    let host = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const a = alphaOf(getComputedStyle(p).backgroundColor);
      if (a === null) { unknownColour += 1; continue; }
      if (a > 0) { alpha = a; host = p; if (a >= 1) break; }
    }
    if (alpha < 1) {
      veilHosts += 1;
      if (veilExamples.length < 8) veilExamples.push(`${nodeTag(el)} on ${host ? nodeTag(host) : 'body'} a=${alpha}`);
    }
  }

  // 避免大面积渐变. "Large area" has to be a number or the rule grades nothing, so it is stated
  // as a share of the screen the gradient is actually visible on: a gradient whose VISIBLE box
  // covers more than a quarter of the viewport is a wash behind content, a gradient on a button
  // or a pill is not. Visible area, not layout area, is the honest denominator -- a long list
  // panel measures 90x the viewport in layout terms and would otherwise convict a 24px-tall
  // sheen that is 95% scrolled away. Measured per element and per width.
  const gradientRuns = [];
  let bigGradients = 0;
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    const image = cs.backgroundImage;
    if (!image || image === 'none') continue;
    const hits = image.match(/(?:repeating-)?(?:linear|radial|conic)-gradient\(/g);
    if (!hits) continue;
    const box = el.getBoundingClientRect();
    const w = Math.max(0, Math.min(box.right, innerWidth) - Math.max(box.left, 0));
    const h = Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0));
    const share = Math.round((w * h) / (innerWidth * innerHeight) * 100) / 100;
    gradientRuns.push(`${nodeTag(el)} x${hits.length} ${(share * 100).toFixed(0)}%`);
    if (share > 0.25) bigGradients += 1;
  }
  // 单一低饱和强调色 #356B92 excludes a second blue by its own wording, and the interface has one:
  // the brand fill pair #1D4FC4 -> #2A63D8, which was introduced to carry white text at AA under the
  // shipped palette. Comparing the resolved serialisation is what makes this a measurement rather
  // than a grep of the stylesheet -- it counts the surface a person sees, wherever the token reached
  // it from. rgb(29,79,196) and rgb(42,99,216) are those two blues.
  const brandBlues = [];
  const BRAND_BLUES = /rgb\(\s*29,\s*79,\s*196\s*\)|rgb\(\s*42,\s*99,\s*216\s*\)/;
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    const paints = [cs.backgroundColor, cs.backgroundImage, cs.borderTopColor].join(' ');
    if (!BRAND_BLUES.test(paints)) continue;
    brandBlues.push(`${nodeTag(el)} ${BRAND_BLUES.exec(paints)[0]}`);
  }
  const unique = brandBlues.slice(0, 8);

  const biggestGradients = gradientRuns.slice()
    .sort((a, b) => parseFloat(b.split(' ').pop()) - parseFloat(a.split(' ').pop()))
    .slice(0, 8);

  // Two sentences from the same pack that are written as positions, not opinions: 「标签放输入上方」
  // and 「错误紧邻字段」 (09_DESIGN.md), plus the heading ladder its reference document ships
  // (h1 42px / h2 27px / h3 19px). All three are read off laid-out boxes, so a label that is
  // associated by `for=` but painted to the left of its field is caught the same way a
  // structurally-nested one that flexes into a row is.
  const headings = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    headings.push(el.tagName.toLowerCase() + ' ' + round1(parseFloat(cs.fontSize)) + 'px/'
      + (parseInt(cs.fontWeight, 10) || 400) + '/lh' + round1(parseFloat(cs.lineHeight) || 0));
  }
  const headingLadder = Array.from(new Set(headings)).sort();

  // The label WRAPS its control throughout this app (`label{display:grid}` with the caption as a
  // text node and the field as a child), so measuring the label element's own box would put its
  // bottom under the field's bottom and convict 240 correctly-labelled fields of being side by
  // side. The caption's box is the union of the label's own text nodes, which is what an eye
  // actually sees above the field; a `for=`-associated label elsewhere in the DOM has no such
  // wrapper, so its box is used directly and the same test still catches a label left of a field.
  const captionBox = (label, control) => {
    if (!label.contains(control)) return label.getBoundingClientRect();
    const rects = [];
    for (const n of label.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const b = r.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) rects.push(b);
    }
    if (!rects.length) {
      for (const child of label.children) {
        if (child === control || child.contains(control)) continue;
        const b = child.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) rects.push(b);
      }
    }
    if (!rects.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const b of rects) {
      x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top);
      x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom);
    }
    return { left: x0, top: y0, right: x1, bottom: y1 };
  };

  let labelled = 0;
  let labelAbove = 0;
  const labelSideBySide = [];
  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    const label = el.closest('label') || (el.labels && el.labels.length ? el.labels[0] : null);
    if (!label || !painted(label, getComputedStyle(label))) continue;
    const box = el.getBoundingClientRect();
    const lb = captionBox(label, el);
    if (!lb) continue;
    labelled += 1;
    const overlapsX = lb.left < box.right - 1 && lb.right > box.left + 1;
    if (lb.bottom <= box.top + 1 && overlapsX) { labelAbove += 1; continue; }
    if (labelSideBySide.length < 8) {
      labelSideBySide.push(nodeTag(label) + ' vs ' + nodeTag(el)
        + ' dy=' + Math.round(box.top - lb.top) + 'px');
    }
  }

  let errorNodes = 0;
  let errorAdjacent = 0;
  const errorFar = [];
  for (const el of document.querySelectorAll('.error, [role=alert], .field-note, .refusal')) {
    const cs = getComputedStyle(el);
    if (!painted(el, cs)) continue;
    const host = el.closest('.field-row, label, .panel, form');
    if (!host) continue;
    const control = host.querySelector('input:not([type=hidden]), select, textarea');
    if (!control || !painted(control, getComputedStyle(control))) continue;
    const cb = control.getBoundingClientRect();
    const eb = el.getBoundingClientRect();
    errorNodes += 1;
    const dy = Math.min(Math.abs(eb.top - cb.bottom), Math.abs(cb.top - eb.bottom));
    if (dy <= 24) { errorAdjacent += 1; continue; }
    if (errorFar.length < 8) errorFar.push(nodeTag(el) + ' dy=' + Math.round(dy) + 'px');
  }

  return { runs: runs.length, sizes, minPx: Number.isFinite(minPx) ? minPx : null,
           below12, below12Examples, inBodyBand,
           controlCount: controls.length, heights, radii,
           formCount, formBelow36, formSmallExamples,
           formRadiusOver10, formRadiusExamples, glass,
           gradientCount: gradientRuns.length, bigGradients, biggestGradients,
           brandBluePaints: brandBlues.length, brandBlueExamples: unique,
           veilHosts, veilExamples, unknownColour,
           headingLadder, labelled, labelAbove, labelSideBySide,
           errorNodes, errorAdjacent, errorFar };
};

const browser = await chromium.launch({ executablePath: browserPath, args: ['--no-sandbox'] });
// DL-UI-U02 (2026-10-09): which colour theme this run measured is part of the
// measurement, so it is recorded on the report and comes from the environment, not
// from a guess. The service answers `/workbench` by exact path, so the theme is set
// on the live document instead of as a query string -- the URL-parameter path
// (?palette=ui2026&scheme=light) is what a person uses, and applyTheme() reads it;
// here we drive the same two attributes that path ends up writing.
const uiPalette = process.env.UI_PALETTE || 'design-lab';
const uiScheme = process.env.UI_SCHEME || 'dark';
const report = { serviceUrl, widths, routes: {}, uiPalette, uiScheme };
// The Workbench reads which theme is applied at mount, so the two <html> attributes
// have to exist before any page script runs. `addInitScript`, not an evaluate after
// `load` -- otherwise this gate measures one palette while the page's own theme
// controls describe another, and the two disagree inside the same PNG.
async function paintTheme(p) {
  await p.addInitScript(([palette, scheme]) => {
    const apply = () => {
      document.documentElement.setAttribute('data-palette', palette);
      if (scheme === 'light') document.documentElement.setAttribute('data-scheme', 'light');
      else document.documentElement.removeAttribute('data-scheme');
    };
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }, [uiPalette, uiScheme]);
}
let failTotal = 0, checkedTotal = 0, unknownTotal = 0, pseudoTotal = 0;
let coveredTotal = 0, obscuredTotal = 0, collapsedTotal = 0;
let controlsExpected = 0, controlsReported = 0;
const mathChecks = [];
const colourChecks = [];
const unknownSamples = [];
const controlBad = [];

// A route sweep cannot open a plan that does not exist, and this round's controls -- the shot
// table, the four material formats, the voluntary-feedback history and the revision comparison --
// all live on the plan detail. So the audit files one synthetic plan into its own throwaway root
// and measures that screen as well: "the detail is legible" is a claim about a page nobody
// rendered otherwise. Nothing here is product data; it dies with the temporary state directory,
// and the record name says it is not a person's.
async function seedAssistancePlanForAudit(prefix) {
  const base = serviceUrl.replace(/\/$/, '');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const post = async (path, body) => {
    const res = await fetch(base + path, { method: 'POST', headers,
      body: JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const project = await post('/api/projects', { name: `${prefix}-audit` });
  if (project.status !== 201) {
    fail(`${prefix.toUpperCase()}_SEED_PROJECT_REFUSED ${JSON.stringify(project.json).slice(0, 200)}`);
  }
  const pid = project.json.project.id;
  const plan = {
    objective: '为秋季新品做一条 15 秒主视觉动效，标题落在大面积留白里，副标题带上说明文字',
    output_type: 'MOTION',
    neutral_creative: '两束交叉光缓慢推移，标题以一次落定收束。',
    brand_constraints: ['只用两种油墨', '标题不使用描边'],
    role_constraints: [],
    lens: '俯拍整张桌面', sound: '低频垫底，无对白', references: [],
    shots: [
      { index: 1, duration_s: 4, purpose: '开场：侧光落在纸纤维上', camera: '缓推',
        sound: null, reference_role: '主参考' },
      { index: 2, duration_s: null, purpose: '收束：标题落定，副标题带"引号"、逗号, 与一段较长的说明',
        camera: '固定', sound: '低频收干', reference_role: null },
    ],
    external_steps: [{ step: '在宿主里手动导出 MP4', tool: 'After Effects',
                       job_id: null, operation_id: null }],
    known_gaps: ['目标平台码率未定'],
    limits: ['不含多语言字幕', '不产出可编辑源文件'],
    created_by: `${prefix} 脚手架（合成，不是真人）`,
  };
  const created = await post(`/api/projects/${pid}/assistance-plans`, plan);
  if (created.status !== 201) {
    fail(`${prefix.toUpperCase()}_SEED_PLAN_REFUSED ${JSON.stringify(created.json).slice(0, 200)}`);
  }
  const planId = created.json.plan.plan_id;
  // A second revision, same route and same key set with expected_revision. The comparison panel
  // needs two readable revisions to have anything to say, so without this the state a person
  // actually reaches -- twelve fields lined up side by side at 1280 -- would never be measured.
  const second = await post(`/api/projects/${pid}/assistance-plans/${planId}/revisions`,
    { ...plan, objective: '第二版：把标题落点改成右下方留白，副标题缩短一行',
      expected_revision: 1 });
  if (second.status !== 201) {
    fail(`${prefix.toUpperCase()}_SEED_REVISION_REFUSED `
      + JSON.stringify(second.json).slice(0, 200));
  }
  return { project: pid, plan: planId, revision: second.json.revision };
}

// Open the plan the way a person does, and wait for the detail to be assembled from its several
// reads: measuring a panel that still says 正在读回 would report the contrast of placeholders.
// The wait is on the two things that only exist once the reads landed -- the shot rows and the
// served material formats -- not on every [role="status"] line having text: an empty note is the
// correct resting state, and a predicate that can never be true reads as "the panel is broken".
// The unmet conditions are named in the problem line, because "it did not settle" alone makes the
// next reader re-instrument the gate instead of reading it.
async function openPlanDetail(page, key, problems) {
  await page.locator('#as-list .as-plan-open').first().click();
  const SETTLED = () => {
    const host = document.getElementById('as-plan');
    if (!host) return ['no-detail-host'];
    const unmet = [];
    if (host.querySelector('.view-loading')) unmet.push('still-reading');
    const rows = host.querySelectorAll('#as-shots li').length;
    if (rows < 1) unmet.push('shot-rows=' + rows);
    const formats = host.querySelectorAll('#as-material option').length;
    if (formats < 4) unmet.push('material-formats=' + formats);
    return unmet;
  };
  const deadline = Date.now() + 25000;
  let unmet = ['never-polled'];
  while (Date.now() < deadline) {
    unmet = await page.evaluate(SETTLED);
    if (unmet.length === 0) return true;
    await page.waitForTimeout(400);
  }
  problems.push(`${key}: 方案详情在 25s 内没有把镜头表与材料格式读回来（${unmet.join(' ')}）`);
  return false;
}

// The knowledge entry detail is the other panel this sweep stopped short of. Its meta lines, the
// judgement trail's small print, and the sentence that appears when the browser declines the
// clipboard are exactly the weak-colour text this gate exists for -- and until now none of it was
// ever measured here, only walked (the walk asserts presence and wording, not AA ratios). One
// synthetic entry, written through the same service the page reads, discarded with the state root.
async function seedKnowledgeEntryForAudit(prefix) {
  const base = serviceUrl.replace(/\/$/, '');
  const body = {
    entry_type: 'METHOD', title: '镜头拆解三步法（合成）',
    summary: '把一段脚本拆成镜头表：先定节拍，再定景别，最后只标必要的转场。',
    domain_tags: ['film'], task_tags: ['storyboard'], target_tools: ['storyboarder'],
    body: '第一步按段落切节拍。第二步给每个节拍选景别。第三步只标必要的转场，'
      + '并留下"引号"、逗号, 与一段较长的说明文字。',
    applicability: '适合 30-90 秒短片的分镜前置。', limits: '不适用于需要精确口型对位的动画。',
    source: { sourceId: 'UNUSED', origin: 'UNKNOWN', author: 'UNKNOWN', license: 'UNKNOWN',
              licenseStatus: 'unknown', allowedUsage: 'UNKNOWN', citationScope: 'UNKNOWN',
              version: 'UNKNOWN', observedAt: 'UNKNOWN', contentHash: 'UNKNOWN',
              verification: 'UNVERIFIED' },
    related_capability_ids: [], recommended: true,
    created_by: `${prefix} 脚手架（合成，不是真人）`, supersedes: null,
  };
  const res = await fetch(base + '/api/knowledge-entries', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`,
                               'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (res.status !== 201) {
    fail(`${prefix.toUpperCase()}_SEED_KNOWLEDGE_REFUSED ${JSON.stringify(json).slice(0, 200)}`);
  }
  return { entry: json.entry.knowledge_entry_id };
}

// Same rule as the plan detail: wait on the things that only exist once the reads landed. A
// predicate that could never be true (every status line must have text) would read as a broken
// panel, and a panel measured while it still says 正在读回 would report the contrast of
// placeholders -- so the copy control, the judgement form and the served body are the settled marks.
async function openKnowledgeDetail(page, key, problems) {
  await page.locator('#kb-results .kb-open').first().click();
  const SETTLED = () => {
    const host = document.getElementById('kb-detail');
    if (!host) return ['no-detail-host'];
    const unmet = [];
    if (host.querySelector('.view-loading')) unmet.push('still-reading');
    if (!document.getElementById('kb-copy-body')) unmet.push('no-copy-control');
    if (!document.getElementById('kb-judge-revision')) unmet.push('no-judgement-form');
    const text = (document.getElementById('kb-detail-content')?.textContent ?? '').trim();
    if (text.length < 8) unmet.push('detail-text=' + text.length);
    return unmet;
  };
  const deadline = Date.now() + 25000;
  let unmet = ['never-polled'];
  while (Date.now() < deadline) {
    unmet = await page.evaluate(SETTLED);
    if (unmet.length === 0) return true;
    await page.waitForTimeout(400);
  }
  problems.push(`${key}: 知识条目详情在 25s 内没有把正文、复制控件与判断表单读回来（${unmet.join(' ')}）`);
  return false;
}

// Choose a target the way the screen asks -- software first, then whatever the next picker offers.
// The settled mark is the panel's own state flag: #tp-combination's data-mode only becomes
// 'target' once a real profile resolves. "Some text appeared" would be the wrong predicate,
// because an honest empty answer also has text.
// The comparison is the state a person reaches when they want to know what a revision changed:
// twelve fields lined up with a 相同/不同 pill each. Settle on the panel's own words -- the rows
// landed and the status line is no longer 正在读回 nor a failure -- because the honest empty and
// the loaded state both have text.
async function openPlanCompare(page, key, problems) {
  await page.evaluate(() => {
    const details = document.getElementById('as-compare');
    if (details) details.open = true;
  });
  await page.selectOption('#as-compare-from', '1');
  await page.selectOption('#as-compare-to', '2');
  await page.click('#as-compare-run');
  const settled = await page.waitForFunction(() => {
    const body = document.getElementById('as-compare-body');
    const status = document.getElementById('as-compare-status');
    return !!body && body.querySelectorAll('li').length >= 12 && !!status
      && !/正在读回|失败/.test(status.textContent || '');
  }, null, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!settled) {
    problems.push(`${key}: 两案对照没有把十二个字段读回来（对比按不动、读回失败或行数不足），`
      + '这一态的配色无人认领');
  }
  return settled;
}

// The last "only exists after an action" panel on these screens: a recorded piece of external
// feedback and its read-back row. Filled with the fewest fields the form accepts and a name that
// says out loud it is scaffolding -- a gate row is not a human sign-off, and the panel must not be
// able to read like one later.
async function openFeedbackState(page, key, problems) {
  const word = await page.locator('#as-fb-outcome option').nth(1).getAttribute('value');
  await page.selectOption('#as-fb-outcome', word ?? '');
  await page.fill('#as-fb-target', '闸门合成：秋季主视觉在客户会上放过一次');
  await page.fill('#as-fb-actor', '审计脚手架（合成，不是真人签署）');
  await page.click('#as-fb-save', { timeout: 20000 });
  const settled = await page.waitForFunction(() => {
    const history = document.getElementById('as-fb-history');
    const status = document.getElementById('as-fb-status');
    return !!history && history.querySelectorAll('li').length >= 1 && !!status
      && !/正在|失败/.test(status.textContent || '');
  }, null, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!settled) {
    problems.push(`${key}: 记录一条合成外部反馈后没有读回历史行（按钮按不动、被拒或列表为空），`
      + '这一态的配色无人认领');
  }
  return settled;
}

async function openCombinationState(page, key, problems) {  for (const id of ['tp-software', 'tp-agent', 'tp-entry', 'tp-model', 'tp-task-mode']) {
    const select = page.locator('#' + id);
    if (await select.count() !== 1) continue;
    if (await page.locator('#' + id + ' option').count() < 2) continue;
    if (await select.inputValue() !== '') continue;
    await select.selectOption({ index: 1 });
  }
  const settled = await page.waitForFunction(() => {
    const line = document.getElementById('tp-combination');
    return !!line && line.dataset.mode === 'target';
  }, null, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!settled) {
    problems.push(`${key}: 依次选了软件／Agent／接入方式之后仍未解析到一份目标档案，`
      + '这一态的配色无人认领');
  }
  return settled;
}

// The pack's numeric rules are measured on the same painted document as the AA ratios, so one
// sweep answers both questions. Attaching the spec to the contrast row keeps the single counting
// sink: a second accumulator for the same walks would give the panel rows two owners.
async function measureBoth(page) {
  const m = await page.evaluate(MEASURE);
  m.spec = await page.evaluate(MEASURE_SPEC);
  return m;
}

const ctSeed = await seedAssistancePlanForAudit('对比度审计');
report.auditSeed = { kind: 'synthetic-assistance-plan', project: ctSeed.project,
  plan: ctSeed.plan, product_data: false,
  note: '只为让方案详情能被测量而写进本次临时状态；记录人标明是合成的，随状态目录一起丢弃' };
const kbSeed = await seedKnowledgeEntryForAudit('对比度审计');
report.auditKnowledgeSeed = { kind: 'synthetic-knowledge-entry', entry: kbSeed.entry,
  product_data: false,
  note: '只为让知识条目详情能被测量而写进本次临时状态；创建人标明是合成的，随状态目录一起丢弃' };

// One sink for both the route sweep and the plan detail. Duplicating the accumulation would give
// the same counters two owners, and the second screen is exactly the one that would drift.
const specTotals = { runs: 0, below12: 0, formCount: 0, formBelow36: 0, formRadiusOver10: 0,
                     veilHosts: 0, unknownColour: 0, controls: 0, inBodyBand: 0, minPx: null,
                     gradients: 0, bigGradients: 0, brandBlues: 0,
                     labelled: 0, labelAbove: 0, errors: 0, errorAdjacent: 0 };
const specHeadingLadder = [];
const specLabelExamples = [];
const specErrorExamples = [];
const specSizes = {};
const specHeights = {};
const specRadii = {};
const specGlass = [];
const specBigGradientExamples = [];
const specBrandBlueExamples = [];
const specBelow12Examples = [];
const specVeilExamples = [];
const specFormSmallExamples = [];
const specFormRadiusExamples = [];
// The three names the pack allows glass on: the top bar, the navigation, and temporary panels.
// Measured on the shipped document, only these two exist (nothing is a temporary panel today),
// so the allowlist is the whole rule -- a fourth blurred surface is a named defect, not drift.
const GLASS_ALLOWED = ['aside#app-sidebar.sidebar', 'header.topbar'];
const glassOffList = () => specGlass.filter((g) => !GLASS_ALLOWED.includes(g.split(' ')[0]));
const absorb = (key, m) => {
  report.routes[key] = m;
  for (const c of m.math) {
    if (!mathChecks.some((k) => k.a === c.a && k.b === c.b)) mathChecks.push(c);
  }
  for (const c of m.colour) {
    if (!colourChecks.some((k) => k.value === c.value)) colourChecks.push(c);
  }
  failTotal += m.failCount - m.controlRows;
  controlsExpected += m.control.planted;
  controlsReported += m.control.reported;
  checkedTotal += m.checked;
  unknownTotal += m.unknown.length;
  pseudoTotal += m.pseudoLayers;
  coveredTotal += m.coveredForeign;
  obscuredTotal += m.obscured;
  collapsedTotal += m.collapsed;
  if (m.control.reported < m.control.planted) controlBad.push(`${key} ${JSON.stringify(m.control.detail)}`);
  for (const u of m.unknown) if (unknownSamples.length < 12) unknownSamples.push(`${key} ${u}`);
  const s = m.spec;
  if (s) {
    specTotals.runs += s.runs;
    specTotals.below12 += s.below12;
    specTotals.controls += s.controlCount;
    specTotals.formCount += s.formCount;
    specTotals.formBelow36 += s.formBelow36;
    specTotals.formRadiusOver10 += s.formRadiusOver10;
    specTotals.veilHosts += s.veilHosts;
    specTotals.unknownColour += s.unknownColour;
    specTotals.inBodyBand += s.inBodyBand;
    specTotals.minPx = specTotals.minPx === null ? s.minPx
      : Math.min(specTotals.minPx, s.minPx === null ? Infinity : s.minPx);
    for (const [k, v] of Object.entries(s.sizes)) specSizes[k] = (specSizes[k] || 0) + v;
    for (const [k, v] of Object.entries(s.heights)) specHeights[k] = (specHeights[k] || 0) + v;
    for (const [k, v] of Object.entries(s.radii)) specRadii[k] = (specRadii[k] || 0) + v;
    for (const g of s.glass) if (!specGlass.includes(g)) specGlass.push(g);
    for (const e of s.below12Examples) {
      if (specBelow12Examples.length < 24) specBelow12Examples.push(`${key} ${e}`);
    }
    for (const e of s.veilExamples) {
      if (specVeilExamples.length < 16) specVeilExamples.push(`${key} ${e}`);
    }
    for (const e of s.formSmallExamples) {
      if (specFormSmallExamples.length < 12) specFormSmallExamples.push(`${key} ${e}`);
    }
    for (const e of s.formRadiusExamples) {
      if (specFormRadiusExamples.length < 12) specFormRadiusExamples.push(`${key} ${e}`);
    }
    specTotals.gradients += s.gradientCount;
    specTotals.bigGradients += s.bigGradients;
    specTotals.labelled += s.labelled;
    specTotals.labelAbove += s.labelAbove;
    specTotals.errors += s.errorNodes;
    specTotals.errorAdjacent += s.errorAdjacent;
    for (const h of s.headingLadder) if (!specHeadingLadder.includes(h)) specHeadingLadder.push(h);
    for (const e of s.labelSideBySide) {
      if (specLabelExamples.length < 10) specLabelExamples.push(`${key} ${e}`);
    }
    for (const e of s.errorFar) {
      if (specErrorExamples.length < 10) specErrorExamples.push(`${key} ${e}`);
    }
    specTotals.brandBlues += s.brandBluePaints;
    for (const e of s.brandBlueExamples) {
      if (!specBrandBlueExamples.includes(e)) specBrandBlueExamples.push(e);
    }
    for (const e of s.biggestGradients) {
      if (parseFloat(e.split(' ').pop()) > 25 && !specBigGradientExamples.includes(e)
          && specBigGradientExamples.length < 10) specBigGradientExamples.push(e);
    }
  }
  console.log(`w=${key.padEnd(24)} checked=${String(m.checked).padStart(4)} `
    + `belowAA=${String(m.failCount - m.controlRows).padStart(3)} `
    + `pseudoLayers=${String(m.pseudoLayers).padStart(3)} unparsable=${m.unknown.length} `
    + `covered=${m.coveredForeign} obscured=${m.obscured} collapsed=${m.collapsed} `
    + `control=${m.control.reported}/${m.control.planted}`);
};

for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await paintTheme(page);
  await page.goto(serviceUrl.replace(/\/$/, '') + '/workbench', { waitUntil: 'load' });
  await page.fill('#token', token);
  await page.click('#connect-form button');
  await page.waitForTimeout(1500);
  for (const [name, hash] of ROUTES) {
    await page.evaluate((h) => { window.location.hash = h; }, hash);
    await page.waitForTimeout(1000);
    const m = await measureBoth(page);
    // The planted controls are deliberate failures; they are counted as proof the
    // parser and the overlap branch work, never as product violations.
    absorb(`${w}:${name}`, m);
    if (name === 'assistant') {
      // The plan detail is measured as its own named state. A screen that never settled is pushed
      // into the same miss list the wrapper asserts to zero, so an unmeasured panel cannot be read
      // as a clean one.
      const opened = await openPlanDetail(page, `${w}:assistant+plan-detail`, controlBad);
      if (opened) absorb(`${w}:assistant+plan-detail`, await measureBoth(page));
      const compared = await openPlanCompare(page, `${w}:assistant+plan-compare`, controlBad);
      if (compared) absorb(`${w}:assistant+plan-compare`, await measureBoth(page));
      const fed = await openFeedbackState(page, `${w}:assistant+plan-feedback`, controlBad);
      if (fed) absorb(`${w}:assistant+plan-feedback`, await measureBoth(page));
    }
    if (name === 'knowledge') {
      // Same rule for the entry detail: it is a named state of its own, and a panel that never
      // settled lands in the miss list the wrapper asserts to zero rather than being skipped.
      const opened = await openKnowledgeDetail(page, `${w}:knowledge+entry-detail`, controlBad);
      if (opened) absorb(`${w}:knowledge+entry-detail`, await measureBoth(page));
    }
    if (name === 'target-profiles') {
      // The screen's own claim is that the four support-state pills and the two truth columns are
      // only worth something if the chosen combination's colours clear AA. Selecting a target is
      // the state where those columns actually fill, so it is measured as a named row.
      const opened = await openCombinationState(page, `${w}:target-profiles+combination`,
        controlBad);
      if (opened) absorb(`${w}:target-profiles+combination`, await measureBoth(page));
    }
  }
  await page.close();
}
// The veil control needs its own document: a fixture has to be inside the viewport for a
// hit test to see it, and dropping a near-white box over the real UI would contaminate the
// very measurement it is supposed to validate.
const veilPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await veilPage.setContent('<!doctype html><html lang="zh-CN"><body style="margin:0;'
  + 'background:rgb(6,10,20)"><div style="position:relative;width:220px;height:60px;'
  + 'background:rgb(6,10,20)"><span id="ct-veiltext" style="color:rgb(245,247,252);'
  + 'font-size:16px">AA VEIL CONTROL</span><span style="position:absolute;inset:0;'
  + 'background:rgba(255,255,255,.92)"></span></div></body></html>');
const veilRun = await veilPage.evaluate(MEASURE);
await veilPage.close();
const veilRow = veilRun.fails.find((f) => f.el.includes('#ct-veiltext')) || null;
const veilCaught = !!veilRow && veilRun.coveredForeign >= 1;
console.log(`CT_VEIL_CONTROL caught=${veilCaught ? 'yes' : 'NO'}`
  + ` coveredForeign=${veilRun.coveredForeign} ratio=${veilRow ? veilRow.got : 'not-reported'}`
  + ` (white text under a 92% white veil must fall below AA)`);

const tightest = Object.values(report.routes)
  .map((v) => v.margin).filter(Boolean)
  .sort((a, b) => a.ratio - b.ratio)[0] || null;
console.log(`CT_MARGIN tightest=${tightest ? tightest.ratio : 'n/a'}`
  + ` need=${tightest ? tightest.need : 'n/a'} route=${tightest ? tightest.el : 'none'}`);
await browser.close();

// The merged spec numbers belong in the receipt, not only in the log: whoever holds the JSON has
// to be able to see which pack numbers this run measured. Assigned before the write, so the file
// and the printed CT_SPEC lines come from one accumulation.
report.spec = { ...specTotals, sizes: specSizes, heights: specHeights, radii: specRadii,
  glass: specGlass, glassAllowed: GLASS_ALLOWED, glassOffAllowlist: glassOffList(),
  below12Examples: specBelow12Examples, veilExamples: specVeilExamples,
  formSmallExamples: specFormSmallExamples, formRadiusExamples: specFormRadiusExamples,
  bigGradientExamples: specBigGradientExamples,
  brandBlueExamples: specBrandBlueExamples,
  headingLadder: specHeadingLadder,
  labelSideBySideExamples: specLabelExamples,
  errorFarExamples: specErrorExamples,
  note: '20261023 包的数字规则（正文14–16px／元数据≥12px、控件约36–40px、圆角6–10px、'
    + '玻璃只给顶栏导航与临时面板、长文字与列表实底）在同一个已渲染文档上的实测' };
if (outPath) writeFileSync(outPath, JSON.stringify(report, null, 2));
const mathBad = mathChecks.filter((c) => !c.ok);
for (const c of mathChecks) {
  console.log(`  MATH ${c.a} on ${c.b} got=${c.got} want=${c.want} ${c.ok ? 'ok' : 'WRONG'}`);
}
const colourBad = colourChecks.filter((c) => !c.ok);
for (const c of colourChecks) {
  console.log(`  COLOUR ${c.value} got=${c.got} want=${c.want} ${c.ok ? 'ok' : 'WRONG'}`);
}
if (colourBad.length > 0) {
  console.error(`CT_FAIL: the OKLab->sRGB conversion disagrees with the published spec vectors `
    + `on ${colourBad.length} value(s), so an oklab background would be measured as a colour `
    + 'this gate invented rather than the one the page paints');
  process.exit(1);
}
if (mathBad.length > 0) {
  console.error(`CT_FAIL: contrast maths self-test failed on ${mathBad.length} reference pair(s)`);
  process.exit(1);
}

console.log('');
console.log(`CT_SUMMARY checked=${checkedTotal} belowAA=${failTotal} pseudoLayers=${pseudoTotal}`
  + ` coveredForeign=${coveredTotal} obscured=${obscuredTotal} unparsable=${unknownTotal}`
  + ` collapsedOpened=${collapsedTotal}`
  + ` controlMisses=${controlsExpected - controlsReported} strict=${strict ? 1 : 0}`
  + ` mathChecks=${mathChecks.length} mathBad=${mathChecks.filter((c) => !c.ok).length}`
  + ` colourChecks=${colourChecks.length} colourBad=${colourChecks.filter((c) => !c.ok).length}`);

// The pack's numbers, measured on the same painted document. Printed on every run, so a green
// contrast verdict can never be read as silence about the 20261023 visual rules.
const sortedHist = (h) => Object.entries(h)
  .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
  .map(([k, v]) => `${k}=${v}`).join(' ');
console.log(`CT_SPEC palette=${uiPalette}/${uiScheme} textRuns=${specTotals.runs}`
  + ` minPx=${specTotals.minPx} below12=${specTotals.below12}`
  + ` in14to16=${specTotals.inBodyBand}/${specTotals.runs}`
  + ` pxHist=[${sortedHist(specSizes)}]`);
console.log(`CT_SPEC controls=${specTotals.controls} formControls=${specTotals.formCount}`
  + ` formBelow36px=${specTotals.formBelow36} formRadiusOver10=${specTotals.formRadiusOver10}`
  + ` hHist=[${sortedHist(specHeights)}] rHist=[${sortedHist(specRadii)}]`);
console.log(`CT_SPEC glass=${specGlass.length} glassOffAllowlist=${glassOffList().length}`
  + ` translucentTextHosts=${specTotals.veilHosts} unparsableAlpha=${specTotals.unknownColour}`
  + ` gradients=${specTotals.gradients} bigOver25pct=${specTotals.bigGradients}`
  + ` brandBluePaints=${specTotals.brandBlues}`);
for (const g of specGlass) console.log(`  GLASS ${g}`);
console.log(`CT_SPEC headings=[${specHeadingLadder.join(' | ')}] labelled=${specTotals.labelled}`
  + ` labelAbove=${specTotals.labelAbove} errorNodes=${specTotals.errors}`
  + ` errorAdjacent=${specTotals.errorAdjacent}`);
for (const e of specLabelExamples) console.log(`  LABEL-SIDEBY ${e}`);
for (const e of specErrorExamples) console.log(`  ERROR-FAR ${e}`);
for (const g of glassOffList()) console.log(`  GLASS-OFF-LIST ${g}`);
for (const e of specBelow12Examples) console.log(`  SMALLTEXT ${e}`);
for (const e of specVeilExamples) console.log(`  NOTSOLID ${e}`);
for (const e of specFormSmallExamples) console.log(`  FORM-BELOW36 ${e}`);
for (const e of specFormRadiusExamples) console.log(`  FORM-RADIUS ${e}`);
for (const e of specBigGradientExamples) console.log(`  BIGGRADIENT ${e}`);
for (const e of specBrandBlueExamples) console.log(`  BRANDBLUE ${e}`);
if (failTotal > 0) {
  for (const [k, v] of Object.entries(report.routes)) {
    for (const f of v.fails) {
      if (f.el.includes('#ct-control')) continue;
      console.log(`  LOWCONTRAST ${k} ${f.got}:1 need>=${f.need}:1 ${f.px}px${f.bold ? ' bold' : ''} opacity=${f.opacity} fg=${f.fg} :: ${f.el.slice(0, 96)}`);
    }
  }
  console.error(`CT_FAIL: ${failTotal} text run(s) below WCAG 2.1 AA contrast`);
  process.exit(1);
}
// A colour this file cannot read is not a pass. Before this rule existed, a
// `color(srgb ...)` backdrop (what Chromium returns for a resolved color-mix) simply
// dropped out of the stack and the text was graded against the page instead of its scrim.
if (!veilCaught) {
  console.error('CT_FAIL: the translucent-veil control was not reported, so text seen through'
    + ' a scrim is being graded against the backdrop behind the scrim');
  process.exit(1);
}
if (controlBad.length > 0) {
  for (const bad of controlBad) console.log(`  CONTROL-MISSED ${bad}`);
  console.error(`CT_FAIL: the white-on-color(srgb) control was not reported as a failure in `
    + `${controlBad.length} route(s) -- the colour parser is blind to a background the page `
    + 'actually paints, so the pass counts are not trustworthy');
  process.exit(1);
}
if (unknownTotal > 0) {
  for (const u of unknownSamples) console.log(`  UNPARSABLE ${u}`);
  console.error(`CT_FAIL: ${unknownTotal} colour value(s) this gate cannot parse; `
    + 'extending the parser is the fix, not the threshold');
  process.exit(1);
}
// Whether the pack's numbers are assertions or only measurements. The wrapper turns this on for
// the theme it grades, so the first sweep of a new rule can report its debt without pretending
// the debt is not there; a rule that is printed forever is not a rule.
if (process.env.CT_SPEC_ENFORCE === '1') {
  const specBad = [];
  if (specTotals.below12 > 0) {
    specBad.push(`元数据至少 12px -- ${specTotals.below12} 处 painted 文字小于 12px，最小 ${specTotals.minPx}px`);
  }
  if (specTotals.veilHosts > 0) {
    specBad.push(`长文字与列表实底 -- ${specTotals.veilHosts} 处文字画在半透明底上`);
  }
  if (specTotals.unknownColour > 0) {
    specBad.push(`${specTotals.unknownColour} 个背景色读不出透明度，无法判定是否实底`);
  }
  if (glassOffList().length > 0) {
    specBad.push(`玻璃只给顶栏／导航／临时面板 -- ${glassOffList().length} 处 backdrop-filter 在名单外：`
      + glassOffList().join(' | '));
  }
  if (specTotals.formRadiusOver10 > 0) {
    specBad.push(`圆角输入／按钮 6–10px -- ${specTotals.formRadiusOver10} 个表单控件圆角超过 10px`);
  }
  if (specTotals.bigGradients > 0) {
    specBad.push(`避免大面积渐变 -- ${specTotals.bigGradients} 个 painted 元素的渐变底覆盖超过视口 25%`
      + `（${specBigGradientExamples.slice(0, 4).join(' | ')}）`);
  }
  if (specBad.length > 0) {
    for (const b of specBad) console.error(`  SPEC-VIOLATION ${b}`);
    console.error(`CT_FAIL: ${specBad.length} 项 20261023 包的视觉数字未满足`);
    process.exit(1);
  }
  console.log(`CT_SPEC_ENFORCED below12=0 translucentTextHosts=0 unparsableAlpha=0`
    + ` glassOffAllowlist=0 formRadiusOver10=0 bigOver25pct=0`
    + ` brandBluePaints=${specTotals.brandBlues}（这一条登记不断言：珍珠白下压平到单一强调色在 CI 的 Linux 跑上报出 2.86:1，配色需 owner 裁定，见 style.css 同处注释与审计卷宗 §5.52）`
    + ` formControls=${specTotals.formCount} formBelow36px=${specTotals.formBelow36}`
    + `（控件高度写的是「约36–40px」，实测读数只登记不断言：本 UI 的主动作在 41–47px，`
    + '比包里的目标更高，不在 6–10px 那条带子一样的强制范围里）');
}
console.log('CT_OK: every measured text run meets WCAG 2.1 AA for its painted background,'
  + ' and every colour the page computes was parsed');
