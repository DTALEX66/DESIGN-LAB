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
];

const MEASURE = () => {
  // Chromium serialises a resolved `color-mix()` as `color(srgb r g b / a)` (values 0..1 or
  // percentages), not as `rgba()`, so a stylesheet that uses color-mix silently disappears
  // from a rgb-only parser: the layer is dropped and the text is measured against whatever
  // is behind it. That is a false green, which is worse than a red.
  const SRGB = /^color\(\s*srgb\s+([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/;
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
  const parse = (c) => {
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/.exec(c || '');
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
    const s = SRGB.exec((c || '').trim());
    if (s) {
      const alpha = s[4] === undefined ? 1
        : (s[4].endsWith('%') ? parseFloat(s[4]) / 100 : parseFloat(s[4]));
      return { r: num(s[1], 255), g: num(s[2], 255), b: num(s[3], 255), a: alpha };
    }
    if (c && !/^(transparent|none|normal)$/.test(String(c).trim())
        && String(c).trim() !== 'rgba(0, 0, 0, 0)') {
      noteUnknown('unparsed-colour:', c);
    }
    return null;
  };
  // Colour stops inside a linear-gradient()/radial-gradient() value. Chromium
  // leaves these as authored text, so they must be read out of the string.
  const gradientStops = (image) => {
    if (!image || image === 'none') return [];
    const out = [];
    for (const mm of image.matchAll(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g)) {
      const p = parse(mm[0].startsWith('#')
        ? (() => {
            let h = mm[0].slice(1);
            if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
            const n = parseInt(h.slice(0, 6), 16);
            const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
            return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
          })()
        : mm[0]);
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

  const canvas = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };

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
  let margin = null;
  const desc = (el) => {
    const cls = (el.getAttribute('class') || '').trim();
    const id = el.id ? `#${el.id}` : '';
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return `${el.tagName.toLowerCase()}${id}${cls ? '.' + cls.split(/\s+/).join('.') : ''} :: ${txt}`;
  };

  for (const { el, cs, box } of targets) {
    const fg0 = parse(cs.color);
    if (!fg0) continue;

    // Build the stack of backgrounds from the element outward, then composite.
    const stack = [];
    let ancestorsOpaque = false;
    for (let p = el; p && !ancestorsOpaque; p = p.parentElement) {
      const s = getComputedStyle(p);
      const solid = parse(s.backgroundColor);
      if (solid && solid.a > 0) stack.push({ solid });
      const stops = gradientStops(s.backgroundImage);
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
        const pSolid = parse(ps.backgroundColor);
        if (pSolid && pSolid.a > 0) { stack.push({ solid: pSolid }); pseudoLayers += 1; }
        const pStops = gradientStops(ps.backgroundImage);
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

    // Ancestor opacity makes the text lighter against its own backdrop.
    let alpha = 1;
    for (let p = el; p; p = p.parentElement) alpha *= parseFloat(getComputedStyle(p).opacity) || 1;

    const size = parseFloat(cs.fontSize) || 16;
    const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;

    // Worst rendered pairing is the honest one.
    let worst = null;
    for (const bg of candidates) {
      const eff = over({ r: fg0.r, g: fg0.g, b: fg0.b, a: fg0.a * alpha }, bg);
      const r = ratio(eff, bg);
      if (worst === null || r < worst.ratio) worst = { ratio: r, bg };
    }
    checked += 1;
    // The margin is the useful half of a green: 0 violations without the closest
    // node's ratio cannot tell a comfortable pass from one one rounding away from red.
    // The planted control is excluded -- it is a deliberate 1:1, so including it would
    // make every run report the tightest pair as the test fixture.
    if (el.id !== 'ct-control' && (margin === null || worst.ratio < margin.ratio)) {
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

  const controlRow = fails.find((f) => f.el.includes('#ct-control')) || null;
  const control = {
    planted: true,
    reported: !!controlRow,
    ratio: controlRow ? controlRow.got : null,
    need: controlRow ? controlRow.need : null,
  };
  document.querySelector('#ct-control')?.remove();
  return { checked, fails: fails.slice(0, 60), failCount: fails.length, math,
           pseudoLayers, unknown, control, margin };
};

const browser = await chromium.launch({ executablePath: browserPath, args: ['--no-sandbox'] });
const report = { serviceUrl, widths, routes: {} };
let failTotal = 0, checkedTotal = 0, unknownTotal = 0, pseudoTotal = 0;
const mathChecks = [];
const unknownSamples = [];
const controlBad = [];

for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(serviceUrl.replace(/\/$/, '') + '/workbench', { waitUntil: 'load' });
  await page.fill('#token', token);
  await page.click('#connect-form button');
  await page.waitForTimeout(1500);
  for (const [name, hash] of ROUTES) {
    await page.evaluate((h) => { window.location.hash = h; }, hash);
    await page.waitForTimeout(1000);
    const m = await page.evaluate(MEASURE);
    report.routes[`${w}:${name}`] = m;
    for (const c of m.math) if (!mathChecks.some((k) => k.a === c.a && k.b === c.b)) mathChecks.push(c);

    // The planted control is a deliberate failure; it must be counted as proof the parser
    // works, never as a product violation.
    failTotal += m.failCount - (m.control.reported ? 1 : 0);
    checkedTotal += m.checked;
    unknownTotal += m.unknown.length;
    if (!m.control.reported) controlBad.push(`${w}:${name} ${JSON.stringify(m.control)}`);
    pseudoTotal += m.pseudoLayers;
    for (const u of m.unknown) if (unknownSamples.length < 12) unknownSamples.push(`${w}:${name} ${u}`);
    console.log(`w=${String(w).padEnd(5)} ${name.padEnd(13)} checked=${String(m.checked).padStart(4)} belowAA=${String(m.failCount - (m.control.reported ? 1 : 0)).padStart(3)} pseudoLayers=${String(m.pseudoLayers).padStart(3)} unparsable=${m.unknown.length} control=${m.control.reported ? 'caught' : 'MISSED'}`);
  }
  await page.close();
}
const tightest = Object.values(report.routes)
  .map((v) => v.margin).filter(Boolean)
  .sort((a, b) => a.ratio - b.ratio)[0] || null;
console.log(`CT_MARGIN tightest=${tightest ? tightest.ratio : 'n/a'}`
  + ` need=${tightest ? tightest.need : 'n/a'} route=${tightest ? tightest.el : 'none'}`);
await browser.close();

if (outPath) writeFileSync(outPath, JSON.stringify(report, null, 2));

const mathBad = mathChecks.filter((c) => !c.ok);
for (const c of mathChecks) {
  console.log(`  MATH ${c.a} on ${c.b} got=${c.got} want=${c.want} ${c.ok ? 'ok' : 'WRONG'}`);
}
if (mathBad.length > 0) {
  console.error(`CT_FAIL: contrast maths self-test failed on ${mathBad.length} reference pair(s)`);
  process.exit(1);
}

console.log('');
console.log(`CT_SUMMARY checked=${checkedTotal} belowAA=${failTotal} pseudoLayers=${pseudoTotal}`
  + ` unparsable=${unknownTotal} controlMisses=${controlBad.length} strict=${strict ? 1 : 0}`
  + ` mathChecks=${mathChecks.length} mathBad=${mathChecks.filter((c) => !c.ok).length}`);
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
console.log('CT_OK: every measured text run meets WCAG 2.1 AA for its painted background,'
  + ' and every colour the page computes was parsed');
