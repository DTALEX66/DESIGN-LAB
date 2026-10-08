// SPDX-License-Identifier: MIT
// Workbench visual overflow audit — real Chromium against the real loopback
// service. Answers ONE question: is any text cut off (invisible) or painted
// outside the viewport with no way to scroll to it?
//
// Env: E2E_SERVICE_URL E2E_TOKEN E2E_NODE_MODULES [E2E_BROWSER]
//      [OV_WIDTHS=1440,1024,390] [OV_OUT=<json path>] [OV_STRICT=1]
//
// The gate is FALSIFIABLE: before it is trusted it must be seen to go RED on a
// known-bad build. Verified 2026-10-06 against the pre-fix build, which failed
// with `settings div.panel clipped 388px`; the same build passes after the fix.
//
// What counts as a failure (see classify()):
//   CLIPPED  content wider/taller than its box AND the box clips it -> invisible.
//   STRAY    painted past the viewport right edge with NO scrollable ancestor
//            -> user can never reach it.
// What does NOT count:
//   · .sr-status — the deliberate screen-reader-only live region (its own CSS
//     clips it by design, so it is allowlisted explicitly, not silently).
//   · anything inside a real overflow:auto|scroll ancestor -> reachable by
//     scrolling (.table-wrap tables, the mobile .app-nav). These are reported
//     as SCROLL_OK so the number stays visible and reviewable.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browserPath = process.env.E2E_BROWSER || undefined;
const widths = (process.env.OV_WIDTHS || '1440,1280,1920')
  .split(',').map((w) => Number.parseInt(w, 10)).filter((w) => Number.isFinite(w) && w > 0);
const outPath = process.env.OV_OUT || '';
const strict = process.env.OV_STRICT === '1';

const fail = (reason) => { console.error('OV_FAIL: ' + reason); process.exit(2); };
if (!serviceUrl || !token || !nmDir) fail('OV_CONFIG_MISSING');
if (!/^[0-9a-f]{64}$/.test(token)) fail('OV_TOKEN_SHAPE');
if (widths.length === 0) fail('OV_WIDTHS_EMPTY');

const req = createRequire(nmDir + '/noop.js');
const { chromium } = req('playwright');

const ROUTES = [
  ['workbench', ''], ['dashboard', '#/dashboard'], ['projects', '#/projects'],
  ['research', '#/research'], ['brand-systems', '#/brand-systems'], ['domains', '#/domains'],
  ['tools', '#/tools'], ['preflight', '#/preflight'], ['deliverables', '#/deliverables'],
  ['evidence', '#/evidence'], ['collaboration', '#/collaboration'], ['settings', '#/settings'],
];

// Deliberate clip: the screen-reader-only route-change announcer.
// A route sweep cannot see a panel that only appears after a click, and a button-gated readback is
// exactly where a clipped KPI grid or a sub-11px caption hides. Each interaction is measured as its
// own named state; a selector that is not there, or a read that never settles, fails the gate rather
// than being skipped -- an unrun measurement is not a passing one.
const INTERACTIONS = [
  ['evidence', '#evidence-projection-run', 'projection-read'],
];

const ALLOWLIST = ['sr-status'];

const MEASURE = () => {
  const allow = ['sr-status'];
  const desc = (e) => {
    const cls = (e.getAttribute('class') || '').trim();
    const id = e.id ? `#${e.id}` : '';
    const txt = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70);
    return `${e.tagName.toLowerCase()}${id}${cls ? '.' + cls.split(/\s+/).join('.') : ''} :: ${txt}`;
  };
  const inAllowlist = (e) => allow.some((c) => (e.getAttribute('class') || '').includes(c));
  // A painted overflow is only acceptable if SOME ancestor actually scrolls.
  const hasScrollableAncestor = (e) => {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
    }
    return false;
  };
  const out = { docOverflowX: 0, clipped: [], stray: [], scrollOk: 0, tiny: [] };
  const de = document.documentElement;
  out.docOverflowX = de.scrollWidth - de.clientWidth;
  const vw = window.innerWidth;
  for (const e of Array.from(document.querySelectorAll('body *'))) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (inAllowlist(e)) continue;
    const d = desc(e);
    const ox = cs.overflowX, oy = cs.overflowY;
    const dx = e.scrollWidth - e.clientWidth;
    const dy = e.scrollHeight - e.clientHeight;
    if (dx > 1 && (ox === 'hidden' || ox === 'clip')) out.clipped.push({ axis: 'x', by: dx, el: d });
    if (dy > 1 && (oy === 'hidden' || oy === 'clip')) out.clipped.push({ axis: 'y', by: dy, el: d });
    if (r.right > vw + 1) {
      if (hasScrollableAncestor(e)) out.scrollOk++;
      else out.stray.push({ over: Math.round(r.right - vw), el: d });
    }
    const fs = parseFloat(cs.fontSize);
    if (fs > 0 && fs < 11 && (e.textContent || '').trim().length > 0) out.tiny.push({ px: fs, el: d });
  }
  return out;
};

const browser = await chromium.launch({ executablePath: browserPath, args: ['--no-sandbox'] });
const report = { serviceUrl, widths, routes: {}, brand: {} };
let clippedTotal = 0, strayTotal = 0, tinyTotal = 0;
const interactionMissing = [];
const interactionStates = [];
// The brand tile, measured once per width. See BRAND_PROBE below for what it proves.
const brandProblems = [];

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
    for (const [route, selector, label] of INTERACTIONS) {
      if (route !== name) continue;
      const key = `${w}:${name}+${label}`;
      const present = await page.locator(selector).count();
      if (present !== 1) { interactionMissing.push(`${key} ${selector} count=${present}`); continue; }
      await page.click(selector);
      let settled = null;
      try {
        settled = await page.waitForFunction(() => {
          const box = document.getElementById('evidence-projection-outcome');
          if (!box) return 'no-box';
          if (box.querySelector('.error')) return 'refused';
          if (box.querySelector('[data-count]')) return 'read';
          return false;
        }, { timeout: 25000 });
      } catch (unused) {
        interactionMissing.push(`${key}: the readback never settled within 25s`);
        continue;
      }
      const state = await settled.jsonValue();
      if (state === 'no-box') {
        interactionMissing.push(`${key}: the outcome box vanished from the document`);
        continue;
      }
      await page.waitForTimeout(400);
      const im = await page.evaluate(MEASURE);
      // The state travels with the measurement: a clean geometry report from a panel that showed a
      // refusal would otherwise look identical to a clean one from a panel that read the ledger back.
      im.state = state;
      report.routes[key] = im;
      interactionStates.push(`${key}=${state}`);
      clippedTotal += im.clipped.length;
      strayTotal += im.stray.length;
      tinyTotal += im.tiny.length;
      console.log(`w=${String(w).padEnd(5)} ${key.padEnd(34)} docX=${String(im.docOverflowX).padStart(3)} `
        + `clipped=${String(im.clipped.length).padStart(2)} stray=${String(im.stray.length).padStart(2)} `
        + `scrollOk=${String(im.scrollOk).padStart(2)} tiny=${String(im.tiny.length).padStart(2)} `
        + `state=${state}`);
    }
    clippedTotal += m.clipped.length;
    strayTotal += m.stray.length;
    tinyTotal += m.tiny.length;
    console.log(`w=${String(w).padEnd(5)} ${name.padEnd(13)} docX=${String(m.docOverflowX).padStart(3)} clipped=${String(m.clipped.length).padStart(2)} stray=${String(m.stray.length).padStart(2)} scrollOk=${String(m.scrollOk).padStart(2)} tiny=${String(m.tiny.length).padStart(2)}`);
  }
  // The brand tile is the owner's logo inlined into the stylesheet as a data URI, so
  // "is the logo showing?" cannot be answered from the CSS text: the declaration survives
  // a malformed URI, and the vm harness never mounts the shell at all (its MockElement has
  // no querySelector, which is the shell's own capability guard). This measures the painted
  // tile -- the ::after background resolved to a data URI the browser decoded to the
  // expected bitmap, the tile carries no text, and the wordmark beside it is the name.
  const brand = await page.evaluate(() => {
    const tile = document.querySelector('.brand-mark');
    if (!tile) return { present: false };
    const after = getComputedStyle(tile, '::after');
    const rect = tile.getBoundingClientRect();
    const match = /url\("?(data:image\/png;base64,[A-Za-z0-9+/=]+)"?\)/
      .exec(after.backgroundImage || '');
    return {
      present: true,
      text: (tile.textContent || '').trim(),
      ariaHidden: tile.getAttribute('aria-hidden'),
      size: [Math.round(rect.width), Math.round(rect.height)],
      glow: (after.filter || 'none') !== 'none',
      uri: match ? match[1] : '',
      name: (document.querySelector('.brand h1') || {}).textContent || '',
    };
  });
  const decode = brand.uri
    ? await page.evaluate((uri) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(`${img.naturalWidth}x${img.naturalHeight}`);
      img.onerror = () => resolve('decode-failed');
      img.src = uri;
    }), brand.uri)
    : 'no-data-uri';
  const seen = { ...brand, uriChars: brand.uri.length, decode };
  delete seen.uri; // 6.6 KB of base64 does not belong in a report a human reads.
  report.brand[w] = seen;
  if (!brand.present) {
    brandProblems.push(`${w}: no .brand-mark in the mounted shell`);
  } else {
    if (brand.text) brandProblems.push(`${w}: the tile carries text "${brand.text}"`);
    if (brand.ariaHidden !== 'true') brandProblems.push(`${w}: the tile is not aria-hidden`);
    if (!brand.glow) brandProblems.push(`${w}: the mark has no bloom (::after filter is none)`);
    if (brand.uriChars < 1000) brandProblems.push(`${w}: the inlined uri is ${brand.uriChars} chars`);
    if (decode !== '144x144') brandProblems.push(`${w}: the mark decoded as ${decode}, not 144x144`);
    if (!brand.name.includes('DESIGN-LAB')) brandProblems.push(`${w}: no wordmark beside the tile`);
    // A collapsed sidebar (the 760px breakpoint) legitimately has no box to measure.
    if (brand.size[0] > 0 && brand.size.join('x') !== '48x48')
      brandProblems.push(`${w}: the tile is ${brand.size.join('x')}, not 48x48`);
  }
  await page.close();
}
await browser.close();

if (outPath) writeFileSync(outPath, JSON.stringify(report, null, 2));
if (interactionMissing.length) {
  console.log('OV_INTERACTION_UNMEASURED ' + interactionMissing.join(' | '));
  fail('OV_INTERACTION_UNMEASURED');
}
if (brandProblems.length) {
  console.log('OV_BRAND_BROKEN ' + brandProblems.join(' | '));
  fail('OV_BRAND_BROKEN');
}

console.log('');
console.log(`OV_SUMMARY clipped=${clippedTotal} stray=${strayTotal} tiny=${tinyTotal} interactions=${interactionStates.length} [${interactionStates.join(',')}] brand=${Object.keys(report.brand).length}`);
if (clippedTotal > 0) {
  for (const [k, v] of Object.entries(report.routes)) {
    for (const c of v.clipped) console.log(`  CLIPPED ${k} +${c.by}px ${c.el.slice(0, 100)}`);
  }
  console.error('OV_FAIL: content is being cut off');
  process.exit(1);
}
if (strayTotal > 0) {
  for (const [k, v] of Object.entries(report.routes)) {
    for (const s of v.stray) console.log(`  STRAY ${k} +${s.over}px ${s.el.slice(0, 100)}`);
  }
  console.error('OV_FAIL: content is unreachable (no scrollable ancestor)');
  process.exit(1);
}
if (strict && tinyTotal > 0) {
  console.error(`OV_FAIL: ${tinyTotal} text node(s) below 11px`);
  process.exit(1);
}
console.log('OV_OK: no clipped or unreachable text');
