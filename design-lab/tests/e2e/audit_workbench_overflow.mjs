// SPDX-License-Identifier: MIT
// Workbench visual overflow audit — real Chromium against the real loopback
// service. Answers ONE question: is any text cut off (invisible) or painted
// outside the viewport with no way to scroll to it?
//
// Env: E2E_SERVICE_URL E2E_TOKEN E2E_NODE_MODULES [E2E_BROWSER]
//      [OV_WIDTHS=1440,1024,390] [OV_OUT=<json path>] [OV_STRICT=1]
//      [UI_PALETTE=design-lab|ui2026] [UI_SCHEME=dark|light]
//
// Geometry is graded per theme, not once: a palette block that re-points only colours still
// changes what a screen looks like to a person, and a gate that measures one palette cannot
// see a collapse that only the other palette shows. The theme is recorded in the summary line
// so a reader knows which subject a given OV_OK speaks for.
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
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browserPath = process.env.E2E_BROWSER || undefined;
const widths = (process.env.OV_WIDTHS || '1440,1280,1920')
  .split(',').map((w) => Number.parseInt(w, 10)).filter((w) => Number.isFinite(w) && w > 0);
const outPath = process.env.OV_OUT || '';
const strict = process.env.OV_STRICT === '1';
const uiPalette = process.env.UI_PALETTE || 'design-lab';
const uiScheme = process.env.UI_SCHEME || 'dark';

// Same mechanism as the contrast gate: the Workbench decides its theme at mount, so the two
// <html> attributes must exist BEFORE any page script runs. Setting them after `load` would
// measure one palette while the page's own controls describe another.
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
  // DL-UI-U02 (2026-10-09): the three new slots. A route that is not in this list is
  // never rendered by this gate, so it cannot fail it either -- that omission is the
  // 2026-10-07 finding (8 of 12 routes had never been captured), not a hypothetical.
  ['capabilities', '#/capabilities'], ['states', '#/states'], ['components', '#/components'],
  // R2 §5: the parameterized detail address is its own measured state. The id is a record
  // from the committed vendor/sources.lock.json; if it ever disappears the view renders the
  // honest "未找到该记录" panel, which this gate would then see as its own geometry.
  ['capability-detail', '#/capabilities/anydesign'],
  // R2 §2: a domain pack's own address, measured as its own state for the same reason.
  // `brand-design` is one of the 12 directories the repo checker accepts today; the
  // rejected one (minigame-design) is reachable too but its panel carries the checker's
  // 11 reasons, so it would change what "fits" means and is checked in the vm suite.
  ['domain-detail', '#/domains/brand-design'],
  ['intake', '#/intake'],
  ['plan', '#/plan'],
  ['analysis', '#/analysis'],
  ['records', '#/records'],
];

// Deliberate clip: the screen-reader-only route-change announcer.
// A route sweep cannot see a panel that only appears after a click, and a button-gated readback is
// exactly where a clipped KPI grid or a sub-11px caption hides. Each interaction is measured as its
// own named state; a selector that is not there, or a read that never settles, fails the gate rather
// than being skipped -- an unrun measurement is not a passing one.
const INTERACTIONS = [
  ['evidence', '#evidence-projection-run', 'projection-read',
    `() => {
      const box = document.getElementById('evidence-projection-outcome');
      if (!box) return 'no-box';
      if (box.querySelector('.error')) return 'refused';
      if (box.querySelector('[data-count]')) return 'read';
      return false;
    }`],
  // R2 §9: the grouped object search is an overlay, so no route sweep can see it. Opening it
  // on a real route and waiting until every group has answered is what makes its geometry --
  // and the claim that a group never silently shows "0" -- measurable.
  ['capabilities', '#openPalette', 'global-search',
    `() => {
      const groups = document.querySelectorAll('#paletteObjects .palette-group');
      if (groups.length !== 4) return 'no-groups';
      const bodies = Array.from(groups).map((g) => (g.querySelector('.palette-group-body')
        || {}).textContent || '');
      if (bodies.some((t) => t.includes('尚未读取'))) return false;
      // Every group must land on one of the three answers a reader can act on. A body that is
      // simply empty would satisfy "not 尚未读取" while telling nobody anything.
      const answered = Array.from(groups).every((g) => {
        const body = g.querySelector('.palette-group-body');
        if (!body) return false;
        const text = body.textContent || '';
        return Boolean(body.querySelector('.item'))
          || text.includes('0 个对象') || text.includes('未读回');
      });
      if (!answered) return false;
      return 'read';
    }`],
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
  // Layout census, recorded per route and per theme. Clipping alone cannot see a column
  // that quietly becomes a third of the viewport: nothing is cut off, the page just stops
  // using the space it was given. A PNG is read by eye and a number is read by a gate; when
  // the two disagree, this is the field that says which one is lying.
  const rail = document.querySelector('#app-sidebar, .app-sidebar, aside');
  const main = document.querySelector('#route-view');
  const table = document.querySelector('#route-view table');
  const drawer = document.querySelector('.cap-drawer');
  out.layout = {
    vw: window.innerWidth,
    narrow760: window.matchMedia('(max-width:760px)').matches,
    railW: rail ? Math.round(rail.getBoundingClientRect().width) : null,
    mainW: main ? Math.round(main.getBoundingClientRect().width) : null,
    mainLeft: main ? Math.round(main.getBoundingClientRect().left) : null,
    tableW: table ? Math.round(table.getBoundingClientRect().width) : null,
    drawerW: drawer ? Math.round(drawer.getBoundingClientRect().width) : null,
  };
  // A panel painted over a global control is invisible to every other check here: nothing
  // is clipped, nothing leaves the viewport, no text is small -- the control simply stops
  // answering. Hit-test the affordances that must always be reachable. An element that is
  // absent or has no box on this route is skipped (the legacy workbench chrome hides the
  // B10 topbar), because "not on screen" is not the same claim as "covered by something".
  const CRITICAL = [['#topNotice', '顶栏通知'], ['#openDrawer', '顶栏工作区'],
    ['#openPalette', '顶栏搜索入口']];
  out.occluded = [];
  // A modal overlay is *supposed* to cover the page behind it -- that is not the defect this
  // check guards. When one is open the hit-test is skipped, and the report says so instead of
  // going silently quiet.
  const modal = document.querySelector('.palette.open, .modal.open, .drawer.open');
  if (modal) {
    out.occludedSkipped = `${modal.tagName.toLowerCase()}.${String(modal.className).trim()}`;
  } else {
  for (const [sel, label] of CRITICAL) {
    const e = document.querySelector(sel);
    if (!e) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const hit = document.elementFromPoint(Math.round(r.left + r.width / 2),
      Math.round(r.top + r.height / 2));
    if (!hit) { out.occluded.push({ sel, label, by: 'elementFromPoint returned null' }); continue; }
    if (hit !== e && !e.contains(hit)) {
      out.occluded.push({ sel, label,
        by: `${hit.tagName.toLowerCase()}${hit.id ? '#' + hit.id : ''}`
          + `${hit.className ? '.' + String(hit.className).trim().split(/\s+/).join('.') : ''}` });
    }
  }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: browserPath, args: ['--no-sandbox'] });
// A geometry receipt that does not name the bytes it measured cannot be re-checked later:
// the bundle is rebuilt between batches, and "0 clipped" over one build says nothing about
// another. Read the file the page actually loaded and bind this report to it.
// The stylesheet is bound too, and that is not decoration: layout is what this gate measures,
// and the CSS is served as its own file -- editing a rule left `main.js` byte-identical, so a
// bundle-only subject would have reported the same sha before and after a layout change.
const bundlePath = new URL('../../../apps/workbench/build/main.js', import.meta.url);
const stylePath = new URL('../../../apps/workbench/style.css', import.meta.url);
const bundleSha256 = createHash('sha256').update(readFileSync(bundlePath)).digest('hex');
const styleSha256 = createHash('sha256').update(readFileSync(stylePath)).digest('hex');
const report = { serviceUrl, widths, routes: {}, brand: {}, uiPalette, uiScheme,
  subject: { bundle: 'apps/workbench/build/main.js', bundleSha256,
    bundleBytes: statSync(bundlePath).size,
    stylesheet: 'apps/workbench/style.css', styleSha256,
    styleBytes: statSync(stylePath).size } };
let clippedTotal = 0, strayTotal = 0, tinyTotal = 0;
const interactionMissing = [];
const specProblems = [];
const interactionStates = [];
// The brand tile, measured once per width. See BRAND_PROBE below for what it proves.
const brandProblems = [];

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
    const m = await page.evaluate(MEASURE);
    report.routes[`${w}:${name}`] = m;
    // R2 §3 fixes the capability detail panel at 450 CSS px on desktop widths. A panel that
    // quietly turns full-width is neither clipped nor stray, so nothing else in this gate
    // would notice; assert the number the spec actually names. The domain detail reuses the
    // same drawer component, so the same ruler applies to it.
    if ((name === 'capability-detail' || name === 'domain-detail') && w >= 1200
      && m.layout.drawerW !== 450) {
      specProblems.push(`${w}:${name} drawer width ${m.layout.drawerW} != 450 (R2 §3)`);
    }
    // R2 §2: the cross-catalog action has to reach the screen in the state the data
    // actually supports. There is no domain↔capability join axis (measured 2026-10-09: the
    // capability `domains` classification axis is empty for all 60 records, and that field's
    // `domain` values are model-radar families), so the button must be present AND disabled
    // with its reason visible. A live button here would promise a filter nothing can back.
    if (name === 'domain-detail') {
      const join = await page.evaluate(() => {
        const drawer = document.querySelector('#domain-drawer');
        const button = drawer ? drawer.querySelector('button[disabled]') : null;
        return {
          drawer: !!drawer,
          label: button ? button.textContent.trim() : '',
          reason: drawer ? drawer.textContent.includes('未接线') : false,
        };
      });
      if (!join.drawer) specProblems.push(`${w}:domain-detail 详情面板不在文档里`);
      if (!join.label) specProblems.push(`${w}:domain-detail 跨目录动作没有以 disabled 落地`);
      else if (!join.label.includes('按该领域筛选能力'))
        specProblems.push(`${w}:domain-detail 被禁用的不是跨目录动作：${join.label}`);
      if (!join.reason) specProblems.push(`${w}:domain-detail 禁用动作没有把原因写进面板`);
    }
    // Found by reading the rendered #/domains, not by any assertion: when a row's trailing
    // columns are sized by their own content, `justify-content:space-between` parks the
    // action at whatever x its neighbours leave, so the 查看详情 buttons sat several px apart
    // and the verdict pills with them. Nothing was clipped or stray, so the gate was green
    // over a visibly ragged list. Actions must share a column and pills must share a column.
    // A control that is present but zero-width is neither aligned nor reachable, so it is
    // convicted rather than skipped -- an earlier version of this check passed when the
    // buttons were hidden, because a 0x0 rect at (0,0) is perfectly "aligned".
    if (name === 'domains') {
      const cols = await page.evaluate(() => {
        const read = (sel, side) => Array.from(document.querySelectorAll(sel)).map((n) => {
          const r = n.getBoundingClientRect();
          return { w: r.width, v: side === 'left' ? r.left : r.right };
        });
        const spread = (list) => (list.length
          ? Math.max(...list.map((e) => e.v)) - Math.min(...list.map((e) => e.v)) : 0);
        const actions = read('.list-item > button', 'left');
        // Pills are measured only in rows that carry an action. Other `.list-item`s on this
        // route (the shape-notice rows below the registry) legitimately have no trailing
        // button, so their pills sit elsewhere by design -- sweeping them in convicted a
        // correct layout with a 656px "ragged" spread on the first run of this check.
        const pills = read('.list-item:has(> button) > .tag', 'right');
        const liveActions = actions.filter((e) => e.w > 0);
        const livePills = pills.filter((e) => e.w > 0);
        return {
          actionTotal: actions.length,
          actionVisible: liveActions.length,
          actionSpread: Math.round(spread(liveActions)),
          pillTotal: pills.length,
          pillInvisible: pills.length - livePills.length,
          pillSpread: Math.round(spread(livePills)),
        };
      });
      if (cols.actionTotal < 2) {
        specProblems.push(`${w}:domains showed ${cols.actionTotal} row action(s) -- the `
          + 'registry carries one per declared pack_id, so alignment cannot be judged here');
      } else if (cols.actionVisible !== cols.actionTotal) {
        specProblems.push(`${w}:domains ${cols.actionTotal - cols.actionVisible} of `
          + `${cols.actionTotal} row actions have zero width; an invisible control is `
          + 'neither aligned nor reachable and must not be counted as tidy');
      } else if (cols.actionSpread > 1) {
        specProblems.push(`${w}:domains row actions are ragged across ${cols.actionSpread}px`);
      }
      if (cols.pillTotal >= 2 && cols.pillInvisible === 0 && cols.pillSpread > 1)
        specProblems.push(`${w}:domains verdict pills are ragged across ${cols.pillSpread}px`);
    }
    for (const [route, selector, label, predicate] of INTERACTIONS) {
      if (route !== name) continue;
      const key = `${w}:${name}+${label}`;
      const present = await page.locator(selector).count();
      if (present !== 1) { interactionMissing.push(`${key} ${selector} count=${present}`); continue; }
      await page.click(selector);
      let settled = null;
      try {
        // Each predicate is authored above as a function-expression string so the sweep stays
        // declarative. Playwright evaluates a bare string as an EXPRESSION, which would make the
        // predicate itself the (truthy) result, so it has to become a function first.
        settled = await page.waitForFunction(eval(predicate), { timeout: 25000 });
      } catch (unused) {
        interactionMissing.push(`${key}: the readback never settled within 25s`);
        await page.keyboard.press('Escape');
        continue;
      }
      const state = await settled.jsonValue();
      if (state === 'no-box' || state === 'no-groups') {
        interactionMissing.push(`${key}: the measured surface vanished from the document`);
        await page.keyboard.press('Escape');
        continue;
      }
      await page.waitForTimeout(400);
      const im = await page.evaluate(MEASURE);
      // The state travels with the measurement: a clean geometry report from a panel that showed a
      // refusal would otherwise look identical to a clean one from a panel that read the ledger back.
      im.state = state;
      report.routes[key] = im;
      interactionStates.push(`${key}=${state}`);
      if (label === 'global-search') {
        // A panel that clips its own tail is invisible to every sideways check: nothing is
        // clipped per element and nothing crosses the right edge, the content is simply below
        // an `overflow:hidden` box. Prove the last row can actually be reached.
        const proof = await page.evaluate(() => {
          const items = document.getElementById('paletteItems');
          if (!items) return { ok: false, why: 'no #paletteItems' };
          const scrollable = items.scrollHeight > items.clientHeight + 1;
          const before = items.scrollTop;
          items.scrollTop = items.scrollHeight;
          const reached = !scrollable || items.scrollTop > before;
          const rows = items.querySelectorAll('.item');
          const last = rows[rows.length - 1];
          let hit = 'no-last-row';
          if (last) {
            const r = last.getBoundingClientRect();
            const probe = document.elementFromPoint(Math.round(r.left + r.width / 2),
              Math.round(r.top + Math.min(r.height / 2, 8)));
            hit = (probe === last || last.contains(probe)) ? 'reachable'
              : (probe ? `covered-by ${probe.tagName}.${probe.className || probe.id}` : 'null');
          }
          const out = { ok: reached && hit === 'reachable', scrollable, reached, hit,
            scrollHeight: items.scrollHeight, clientHeight: items.clientHeight,
            rows: rows.length };
          items.scrollTop = before;
          return out;
        });
        report.routes[key].scrollProof = proof;
        if (!proof.ok) {
          specProblems.push(`${key} grouped search cannot reach its last row: `
            + JSON.stringify(proof));
        }
      }
      // An overlay left open would ride along into every later route's measurement.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      clippedTotal += im.clipped.length;
      strayTotal += im.stray.length;
      tinyTotal += im.tiny.length;
      for (const o of im.occluded) {
        specProblems.push(`${key} ${o.label} (${o.sel}) covered by ${o.by}`);
      }
      console.log(`w=${String(w).padEnd(5)} ${key.padEnd(34)} docX=${String(im.docOverflowX).padStart(3)} `
        + `clipped=${String(im.clipped.length).padStart(2)} stray=${String(im.stray.length).padStart(2)} `
        + `scrollOk=${String(im.scrollOk).padStart(2)} tiny=${String(im.tiny.length).padStart(2)} `
        + `state=${state}`);
    }
    clippedTotal += m.clipped.length;
    strayTotal += m.stray.length;
    tinyTotal += m.tiny.length;
    for (const o of m.occluded) {
      specProblems.push(`${w}:${name} ${o.label} (${o.sel}) covered by ${o.by}`);
    }
    console.log(`w=${String(w).padEnd(5)} ${name.padEnd(13)} docX=${String(m.docOverflowX).padStart(3)} clipped=${String(m.clipped.length).padStart(2)} stray=${String(m.stray.length).padStart(2)} scrollOk=${String(m.scrollOk).padStart(2)} tiny=${String(m.tiny.length).padStart(2)}`);
  }
  // T08 — the sidebar's "more below" cue. Every UI gate so far varied only the WIDTH, so a
  // nav list that overflows vertically was never exercised at all. The cue is a sticky 26px
  // band with `pointer-events:none` over a gradient, so covering the last item is its design
  // and asserting non-overlap would be wrong. What has to hold is that it appears exactly
  // while there is more to see and disappears at the end -- and that a window short enough to
  // make the question real was actually measured.
  await page.setViewportSize({ width: w, height: 620 });
  await page.waitForTimeout(700);
  const cue = await page.evaluate(async () => {
    const nav = document.querySelector('.nav');
    if (!nav) return { present: false };
    const read = () => ({
      hiddenPx: nav.scrollHeight - nav.clientHeight,
      atEnd: nav.scrollTop + nav.clientHeight >= nav.scrollHeight - 1,
      cue: nav.classList.contains('has-scroll-more'),
    });
    nav.scrollTop = 0;
    nav.dispatchEvent(new Event('scroll'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const top = read();
    nav.scrollTop = nav.scrollHeight;
    nav.dispatchEvent(new Event('scroll'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const end = read();
    return { present: true, top, end };
  });
  report.navCue = report.navCue || {};
  report.navCue[w] = cue;
  if (!cue.present) {
    specProblems.push(`${w}: 侧栏 .nav 不在文档里，溢出提示无从判断`);
  } else if (cue.top.hiddenPx <= 0) {
    specProblems.push(`${w}: 620px 高的窗口下侧栏没有溢出（hiddenPx=${cue.top.hiddenPx}），`
      + '溢出提示这条断言因此没有测到任何东西');
  } else {
    if (!cue.top.cue)
      specProblems.push(`${w}: 侧栏在顶部且还有 ${cue.top.hiddenPx}px 没显示，`
        + '却没有出现"下面还有"提示');
    if (cue.end.cue)
      specProblems.push(`${w}: 侧栏已滚到底，提示仍然亮着`);
    console.log(`w=${String(w).padEnd(5)} nav-cue     hiddenPx=${String(cue.top.hiddenPx).padStart(4)} `
      + `atTop=${cue.top.cue} atEnd=${cue.end.cue}`);
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
if (specProblems.length) {
  console.log('OV_SPEC_BROKEN ' + specProblems.join(' | '));
  fail('OV_SPEC_BROKEN');
}
if (interactionMissing.length) {
  console.log('OV_INTERACTION_UNMEASURED ' + interactionMissing.join(' | '));
  fail('OV_INTERACTION_UNMEASURED');
}
if (brandProblems.length) {
  console.log('OV_BRAND_BROKEN ' + brandProblems.join(' | '));
  fail('OV_BRAND_BROKEN');
}

console.log('');
console.log(`OV_SUMMARY clipped=${clippedTotal} stray=${strayTotal} tiny=${tinyTotal} interactions=${interactionStates.length} [${interactionStates.join(',')}] brand=${Object.keys(report.brand).length} spec=${specProblems.length} theme=${uiPalette}/${uiScheme}`);
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
