// SPDX-License-Identifier: MIT
// Quantitative Workbench UI audit against the real service and a real Chromium.
// Measures what the eye claims: overflow, contrast, keyboard reachability,
// touch targets, accessible names, degraded-state wording and console noise,
// then fails closed on any hard violation so the numbers cannot drift silently.
// Env: E2E_SERVICE_URL E2E_TOKEN E2E_NODE_MODULES [E2E_BROWSER] AUDIT_WIDTHS
import { createRequire } from 'node:module';
import process from 'node:process';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browser = process.env.E2E_BROWSER;
if (!serviceUrl || !token || !nmDir) {
  console.error('AUDIT_CONFIG_MISSING');
  process.exit(2);
}
const widths = (process.env.AUDIT_WIDTHS || '390,768,1280,1920,2560')
  .split(',').map((w) => Number.parseInt(w, 10)).filter(Number.isFinite);
const HEIGHT = { 390: 844, 768: 1024, 1280: 800, 1920: 1080, 2560: 1440 };

const pw = createRequire(nmDir + '/noop.js')('playwright');
const launchOpts = { headless: true };
if (browser) launchOpts.executablePath = browser;

const violations = [];
const metrics = [];
const notes = {};
const add = (kind, detail) => violations.push(`${kind}: ${detail}`);

const b = await pw.chromium.launch(launchOpts);

// In-page measurement: contrast is computed from the used colour values,
// walking up for a non-transparent background the way a browser paints it.
const PROBE = () => {
  const lum = (c) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const parse = (value) => {
    const m = value.match(/-?[\d.]+/g);
    if (!m) return null;
    const nums = m.slice(0, 3).map(Number);
    return (m.length > 3 && Number(m[3]) === 0) ? null : nums;
  };
  const bgOf = (el) => {
    let node = el;
    while (node) {
      const style = getComputedStyle(node);
      // A gradient lives in background-image, so backgroundColor is transparent
      // and walking further up compares the text against a surface nobody sees.
      // Those pairs are NOT measurable from computed styles: report them as
      // indeterminate instead of inventing a pass or a fail. Their ratios are
      // asserted statically against the exact gradient stops in style.css.
      if (style.backgroundImage && style.backgroundImage !== 'none') return null;
      const colour = parse(style.backgroundColor);
      if (colour) return colour;
      node = node.parentElement;
    }
    return [255, 255, 255];
  };
  const ratio = (a, c) => {
    const l1 = lum(a);
    const l2 = lum(c);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const text = (el) => (el.textContent || '').trim();
  // An element inside a `hidden` ancestor keeps its own `display` value, so
  // checking the element alone measures text nobody can see. Layout boxes are
  // the only honest "is this rendered" test.
  const rendered = (el) => el.getClientRects().length > 0;
  const contrast = [];
  let gradientBacked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!text(el) || el.children.length || !rendered(el)) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden') continue;
    if (Number(style.opacity) < 0.35) continue;
    const fg = parse(style.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (bg === null) { gradientBacked += 1; continue; }
    const size = parseFloat(style.fontSize) || 16;
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const got = ratio(fg, bg);
    if (got < need) {
      contrast.push({ tag: el.tagName.toLowerCase(), size: Math.round(size),
                      need, got: Number(got.toFixed(2)),
                      text: text(el).slice(0, 40) });
    }
  }
  const focusables = Array.from(document.querySelectorAll(
    'a[href],button,input,select,textarea,[tabindex]')).filter(rendered);
  const clickables = Array.from(document.querySelectorAll('body *'))
    .filter((el) => (el.onclick || el.getAttribute('onclick')) && rendered(el));
  const clickableNotReachable = clickables.filter((el) => {
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return false;
    if (el.getAttribute('role') === 'button') return false;
    const tabindex = el.getAttribute('tabindex');
    return tabindex === null || Number(tabindex) < 0;
  }).map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`
    + `${el.className ? '.' + String(el.className).split(' ')[0] : ''}`);
  const unnamed = Array.from(document.querySelectorAll('input,select,textarea'))
    .filter(rendered)
    .filter((el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
      if (el.labels && el.labels.length) return false;
      const id = el.id;
      return !(id && document.querySelector(`label[for="${id}"]`));
    }).map((el) => `${el.tagName.toLowerCase()}#${el.id || '(no-id)'}`);
  const images = Array.from(document.querySelectorAll('img'))
    .filter((el) => rendered(el) && !el.hasAttribute('alt')).length;
  const overflow = document.documentElement.scrollWidth
    - Math.min(window.innerWidth, document.documentElement.clientWidth);
  const targets = Array.from(document.querySelectorAll(
    'button,a[href],input,select,[role="button"]'))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24))
    .length;
  return {
    contrast, clickableNotReachable, unnamed, images, overflow, targets,
    gradientBacked,
    focusables: focusables.length,
    paint: Math.round(performance.getEntriesByType('paint')
      .find((e) => e.name === 'first-contentful-paint')?.startTime ?? -1),
  };
};

// Same-document hash change. `page.goto` with a fragment can force a document
// reload, and the session token lives only in page memory (shell.ts keeps it in
// a closure), so a reload would silently swap every view for the
// "请先…连接" placeholder and the audit would measure a shell instead of a UI.
const navigate = async (page, hash) => {
  await page.evaluate((value) => { window.location.hash = value; }, hash);
  await page.waitForFunction(() => {
    const view = document.querySelector('#route-view');
    return !!view && !view.querySelector('.view-loading');
  }, null, { timeout: 20000 });
};

// Every measurement must describe a LIVE view. Anything else is no evidence.
const assertLive = async (page, width, route) => {
  const state = await page.evaluate(() => {
    const view = document.querySelector('#route-view');
    const workspace = document.querySelector('#workspace');
    const login = document.querySelector('#login');
    return {
      hasView: !!view,
      placeholder: /请先在工作台连接本机设计服务/.test(view ? view.textContent : ''),
      readFailed: /视图读回失败/.test(view ? view.textContent : ''),
      workspaceVisible: !!workspace && !workspace.hidden,
      loginVisible: !!login && !login.hidden,
    };
  });
  // The empty-hash route owns #workspace; hash routes own #route-view.
  const live = route === '' ? state.workspaceVisible && !state.loginVisible
                             : state.hasView && !state.placeholder;
  if (!live) {
    add('measurement-invalid', `${width} ${route || '(workbench)'} was not a live view: `
      + JSON.stringify(state));
    return false;
  }
  if (state.readFailed) add('view-readback-failure',
                            `${width} ${route || '(workbench)'} ${state.readFailed}`);
  return true;
};

const connect = async (width) => {
  const ctx = await b.newContext({ viewport: { width, height: HEIGHT[width] ?? 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => add('pageerror', `${width} ${String(e).slice(0, 120)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') add('console-error', `${width} ${m.text().slice(0, 120)}`);
  });
  await page.goto(serviceUrl + '/workbench', { waitUntil: 'load' });
  await page.locator('#token').fill(token);
  await page.locator('#connect-form button').first().click();
  await page.locator('#workspace').waitFor({ state: 'visible', timeout: 20000 });
  return { ctx, page };
};

// --- bootstrap real state so the panels have something true to show ---------
const { ctx: bootCtx, page: boot } = await connect(1280);
await boot.locator('#project-name').fill('UI Audit ' + Date.now());
await boot.locator('#create-form button').first().click();
await boot.locator('#project option').last().waitFor({ state: 'attached', timeout: 20000 });
await boot.locator('#project').selectOption({ index: 1 });
const projectId = await boot.locator('#project').inputValue();
await boot.locator('#brief-title').fill('Audit brief');
await boot.locator('#brief-goals').fill('auditable, honest');
await boot.locator('#brief-submit').click();
await boot.locator('#design-briefs li').first().waitFor({ state: 'visible', timeout: 20000 });
await bootCtx.close();

// '' is the legacy workbench view, which is the only view that owns #workspace.
const ROUTES = ['', '#/dashboard', '#/projects', `#/projects/${projectId}`, '#/tools',
                '#/deliverables', '#/evidence', '#/preflight', '#/settings',
                '#/research', '#/domains', '#/collaboration', '#/brand-systems'];

for (const width of widths) {
  const { ctx, page } = await connect(width);
  for (const route of ROUTES) {
    await navigate(page, route);
    if (!(await assertLive(page, width, route))) continue;
    const probe = await page.evaluate(PROBE);
    metrics.push({ width, route: route || '(workbench)', ...probe });
    for (const item of probe.contrast) {
      add('contrast', `${width} ${route} <${item.tag}> ${item.got}:1 need ${item.need}:1 `
        + `size=${item.size} "${item.text}"`);
    }
    for (const item of probe.clickableNotReachable) {
      add('keyboard', `${width} ${route} click target not reachable: ${item}`);
    }
    for (const item of probe.unnamed) add('label', `${width} ${route} ${item}`);
    if (probe.images) add('alt', `${width} ${route} ${probe.images} img without alt`);
    if (probe.overflow > 0) add('overflow', `${width} ${route} +${probe.overflow}px`);
    if (width <= 430 && probe.targets) {
      add('touch-target', `${width} ${route} ${probe.targets} targets under 24px`);
    }
  }

  // Degraded state, in-session: the explicit disconnect must leave an honest
  // "not read back" notice on every view, never a confident zero.
  await navigate(page, '#/dashboard');
  await navigate(page, '');
  await page.locator('#disconnect').click();
  await page.waitForFunction(() => {
    const login = document.querySelector('#login');
    return !!login && !login.hidden;
  }, null, { timeout: 20000 }).catch(() => add('degraded-state',
    `${width} disconnect did not return to the connect panel`));
  await navigate(page, '#/dashboard');
  const body = await page.locator('body').innerText();
  const honest = /未读回|未连接|请先在工作台连接|连接本机设计服务/.test(body);
  if (!honest) add('degraded-state', `${width} offline view claims values`);
  notes[`disconnect-${width}`] = {
    showsPlaceholder: /请先在工作台连接本机设计服务/.test(body),
    hasUnreadBack: /未读回/.test(body),
    hasNotConnectedBadge: /未连接/.test(body),
  };

  // Degraded state, cold start: a fresh document has no token in memory, so the
  // view must refuse to render data AND must still offer a way to connect.
  // `show()` deliberately hides #login on every routed view, so an instruction
  // to "connect first" without an action would be a dead end.
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => {
    const view = document.querySelector('#route-view');
    return !!view && (view.textContent || '').length > 0;
  }, null, { timeout: 20000 }).catch(() => {});
  const cold = await page.evaluate(() => ({
    loginVisible: (() => { const n = document.querySelector('#login'); return !!n && !n.hidden; })(),
    connectAction: Array.from(document.querySelectorAll('#route-view button'))
      .some((b) => /前往工作台连接/.test(b.textContent || '')),
    claimsData: !/未读回|未连接|请先|连接本机设计服务/.test(document.querySelector('#route-view')
      ? document.querySelector('#route-view').textContent : ''),
  }));
  if (cold.claimsData) add('cold-start', `${width} cold load shows confident data with no session`);
  if (!cold.loginVisible && !cold.connectAction) {
    add('cold-start', `${width} cold load on a routed view offers neither a connect form nor a way to reach it`);
  }
  notes[`cold-${width}`] = cold;
  // The action works: follow it and the connect form must appear.
  if (!cold.loginVisible && cold.connectAction) {
    await page.locator('#route-view button').first().click();
    const reached = await page.waitForFunction(() => {
      const n = document.querySelector('#login');
      return !!n && !n.hidden;
    }, null, { timeout: 5000 }).then(() => true).catch(() => false);
    if (!reached) add('cold-start', `${width} 前往工作台连接 did not reveal the connect form`);
  }
  await ctx.close();
}

await b.close();

notes.totalMetrics = metrics.length;
notes.hardViolations = violations.length;
console.log(JSON.stringify({ ok: violations.length === 0, violations, notes,
  worst: metrics.filter((m) => m.contrast.length).slice(0, 12) }, null, 2));
process.exit(violations.length === 0 ? 0 : 1);
