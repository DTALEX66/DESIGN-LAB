// SPDX-License-Identifier: MIT
// E-SLICE-02 browser E2E: real Chromium drives the Workbench 05 design layer
// vertical slice (Project -> Brief -> Direction -> DesignSystem) end to end,
// served by the real Python loopback service (same-origin fetch).
//
// F-2b extends the SAME run with the revision chain: the brief is revised, then
// the CHOSEN direction is revised, and the assertions read back the persisted
// DOM — version numbers, 当前 vs 已取代 with the superseded_by pointer, both
// lineage panels, and the honest "绑定需重新建立" state that appears when the
// append-only design-system binding is left behind on the retired direction
// version (active_binding === null must NEVER render as a current binding).
// The run then RELOADS the page and rebuilds the same DOM from the service, so
// the readback cannot be an in-memory illusion.
//
// This is a controlled-runtime (E2) proof: a real browser loads the committed
// `apps/workbench/build/main.js` and exercises the user-visible forms against
// the live API, then the assertions read back the persisted DOM state. It does
// NOT claim an E3 host run or an E4 human jury acceptance.
//
// Driven by the Python shell test_workbench_design_layer_e2e.py via
// `node browser_design_layer_e2e.mjs`. Environment:
//   E2E_SERVICE_URL     required  e.g. http://127.0.0.1:56321
//   E2E_TOKEN           required  64-hex service bearer token
//   E2E_NODE_MODULES    required  dir that CONTAINS node_modules/ so that
//                                 `playwright` resolves (repo npm-cache).
//   E2E_BROWSER         optional  explicit chromium executablePath; when set
//                                 it bypasses playwright's revision lookup so a
//                                 pre-installed browser works with zero download.
//   E2E_EVIDENCE_DIR    optional  dir for browser-e2e-summary.json (+ fail.png
//                                 on failure); default
//                                 .project-local/task-artifacts/browser-e2e
// Exits 0 with `E2E_OK ...` on a full chain pass; non-zero otherwise. Every
// exit path writes the evidence summary so CI artifacts and local runs carry
// the same machine-readable trail.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browser = process.env.E2E_BROWSER || null;
const evidenceDir = path.resolve(process.env.E2E_EVIDENCE_DIR || '.project-local/task-artifacts/browser-e2e');
const errors = [];
let browserInfo = browser ? String(browser) : null;
let page = null;
// Hoisted so the reload step can re-select the SAME project after the page
// (and its in-memory project id) is thrown away.
let projectName = '';
let projectId = '';
// What the route-inventory step actually derived, so the evidence names its own
// subject instead of leaving a reader to guess which number was in play.
let routeInventory = null;

// P0-G: single evidence writer, used by every exit path (PASS and FAIL).
const writeSummary = (result, error) => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const payload = {
    kind: 'workbench-browser-e2',
    subjectSha: process.env.E2E_SUBJECT_SHA || 'local',
    browser: { engine: 'chromium', version: browserInfo },
    workflowRunId: process.env.E2E_WORKFLOW_RUN_ID || 'local',
    scenario: ['create-project', 'import-reference', 'create-brief',
               'create-direction', 'choose-direction', 'bind-design-system',
               'revise-brief', 'revise-chosen-direction',
               'binding-rebuild-readback', 'reload-persisted-readback',
               'persisted-readback', 'mobile-appshell-layout',
               'nav-route-inventory-derived-from-served-bundle'],
    consoleErrors: errors.length,
    result,
  };
  if (routeInventory) payload.routeInventory = routeInventory;
  if (error) payload.error = error;
  fs.writeFileSync(path.join(evidenceDir, 'browser-e2e-summary.json'),
                   JSON.stringify(payload, null, 2) + '\n');
};

if (!serviceUrl || !token || !nmDir) {
  console.error('E2E_CONFIG_MISSING: need E2E_SERVICE_URL, E2E_TOKEN, E2E_NODE_MODULES');
  writeSummary('FAIL', 'E2E_CONFIG_MISSING: need E2E_SERVICE_URL, E2E_TOKEN, E2E_NODE_MODULES');
  process.exit(3);
}
if (!/^[0-9a-f]{64}$/.test(token)) {
  console.error('E2E_TOKEN_SHAPE: must be 64-hex');
  writeSummary('FAIL', 'E2E_TOKEN_SHAPE: must be 64-hex');
  process.exit(3);
}

// Resolve `playwright` from the directory that owns node_modules/ (the repo
// npm-cache), not from this script's location.
const req = createRequire(nmDir + '/noop.js');
const pw = req('playwright');

const launchOpts = { headless: true };
if (browser) launchOpts.executablePath = browser;

const step = (name, fn) => {
  process.stdout.write(`E2E step: ${name}\n`);
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`E2E ok: ${name}`));
};

// One fail-closed exit shape: log the reason, screenshot the live page while it
// still exists, write the machine-readable summary, exit non-zero.
const abort = async (reason, code, ctx, b) => {
  console.error(reason);
  await captureFailureShot(ctx, b);
  writeSummary('FAIL', reason);
  process.exit(code);
};

// ---------------------------------------------------------------------------
// ROUTE INVENTORY -- derived, never typed.
//
// `ROUTE_VIEWS` (apps/workbench/shell.ts) is the authority for the routes the Workbench
// mounts, and mountAppShell() renders exactly one `.app-nav-item` button per entry,
// stamped `data-route="<view>"` (verified: one `app-nav-item` construction site in the
// bundle, and navGroupChunks() drops nothing). The mobile-layout step used to compare the
// button count against a literal integer a human re-typed on every IA change (12 -> 15 ->
// 18 -> 19, with three stale "12" comments found the same day). The number and the
// comments are the same drift class; this parses the inventory instead.
//
// Source of the expected inventory: the bundle bytes the SERVICE HANDS TO THE BROWSER
// (`GET /workbench/main.js`), fetched with Node and parsed here. Two measured reasons:
//   * the DOM alone cannot answer it -- `ROUTE_VIEWS` is not exported to `window` (the
//     only global the bundle installs is `window.__dlToast`), so a page-side read sees the
//     MOUNTED buttons, not the table they came from. Expecting the mount to equal the
//     mount would be a tautology, so the expectation has to come from outside the DOM;
//   * not `apps/workbench/build/main.js` on disk either -- `design_lab.workbench.resource()`
//     prefers the installed wheel copy when one exists, so served and committed bytes CAN
//     diverge (workbench.py's D003 note records a 72,051 B installed bundle vs a 157,747 B
//     committed one). Serving the checkout is what the browser executed, and the identity
//     is asserted below (the page hashes the same URL and must agree) rather than assumed.
// `minify:false` (apps/workbench/vite.config.ts) keeps the array readable, so the entries
// are recoverable without a TS compiler.
//
// Fail-closed: an unreadable marker, an unbalanced literal, an entry without `hash`/`view`
// or an empty table all ABORT the run -- a parse that yields nothing never degrades into
// "no expectation, therefore no failure".
// ---------------------------------------------------------------------------
const ROUTE_TABLE_MARKER = 'const ROUTE_VIEWS = [';

/** Body of the array literal whose '[' sits at `openIndex`, string-aware. */
const sliceArrayBody = (text, openIndex) => {
  let depth = 0, inStr = null, esc = false;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
    else if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return null;
};

/** Each top-level `{ ... }` of an object-array body, comments and all. */
const sliceEntryObjects = (body) => {
  const out = [];
  let depth = 0, buf = '', inStr = null, esc = false;
  for (const ch of body) {
    if (inStr) {
      buf += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; buf += ch; continue; }
    if (ch === '{') depth += 1;
    if (depth > 0) buf += ch;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) { out.push(buf); buf = ''; }
    }
  }
  return out;
};

const stringField = (obj, key) => {
  const m = obj.match(new RegExp('\\b' + key + '\\s*:\\s*["\']([^"\']*)["\']'));
  return m ? m[1] : null;
};

const sha256Hex = (text) => createHash('sha256').update(text).digest('hex');

/** -> [{hash, view}] | null (null means "could not read the table", never "no routes"). */
const parseRouteViews = (bundleText) => {
  const markerAt = bundleText.indexOf(ROUTE_TABLE_MARKER);
  if (markerAt < 0) return null;
  const body = sliceArrayBody(bundleText, markerAt + ROUTE_TABLE_MARKER.length - 1);
  if (body === null) return null;
  const objects = sliceEntryObjects(body);
  const routes = [];
  for (const obj of objects) {
    const hash = stringField(obj, 'hash');
    const view = stringField(obj, 'view');
    if (hash === null || view === null) return null;
    if (hash !== '' && !hash.startsWith('#/')) return null;
    routes.push({ hash, view });
  }
  return routes.length > 0 ? routes : null;
};

try {
  const b = await pw.chromium.launch(launchOpts);
  try {
    browserInfo = await b.browserVersion() || browserInfo;
  } catch {
    // version probe is best-effort; launch errors must dominate the summary.
  }
  const ctx = await b.newContext();
  page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const base = serviceUrl.replace(/\/$/, '');
  await page.goto(base + '/workbench', { waitUntil: 'load' });

  await step('connect', async () => {
    await page.locator('#token').fill(token);
    await page.locator('#connect-form button').first().click();
    await page.locator('#workspace').waitFor({ state: 'visible', timeout: 15000 });
  });

  await step('create project', async () => {
    projectName = 'E2E Autumn ' + Date.now();
    await page.locator('#project-name').fill(projectName);
    await page.locator('#create-form button').first().click();
    // The project select repopulates only after the create POST plus the projects()
    // refresh round-trip settles; wait for the new <option> to attach before we can
    // select it (an immediate read sees the pre-create placeholder only).
    await page.locator('#project option', { hasText: projectName })
      .first().waitFor({ state: 'attached', timeout: 20000 });
    await page.locator('#project').selectOption({ label: projectName });
    projectId = await page.locator('#project').inputValue();
  });

  // P0-05 B04: import a real reference asset and let the picker carry it into the brief.
  // The PNG is a PIL-verified valid 1x1 RGBA image (not a broken placeholder).
  await step('import reference', async () => {
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
      '0000000b49444154789c6360000200000500017a5eab3f0000000049454e44ae426082', 'hex');
    await page.locator('#file').setInputFiles({ name: 'ref.png', mimeType: 'image/png', buffer: png });
    await page.locator('#import-button').click();
    // sendImport() -> refresh() -> populateReferencePicker: one checkbox per imported asset.
    await page.locator('#reference-picker input[type=checkbox]').first()
      .waitFor({ state: 'visible', timeout: 20000 });
  });

  // Refresh loads the design-system catalog + design-layer readback into 05.
  await step('refresh design systems', async () => {
    await page.locator('#refresh').click();
    await page.locator('#design-systems li').first().waitFor({ state: 'visible', timeout: 15000 });
  });

  await step('persist brief with reference', async () => {
    // P0-05 B04: the imported asset is a real reference; check it so the brief
    // carries a genuine asset id (not an empty list), then prove the readback.
    await page.locator('#reference-picker input[type=checkbox]').first().check();
    await page.locator('#brief-title').fill('E2E Autumn');
    await page.locator('#brief-goals').fill('modern, warm, restrained');
    await page.locator('#brief-submit').click();
    await page.locator('#design-briefs li', { hasText: 'BRIEF · E2E Autumn' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
    const briefLine = await page.locator('#design-briefs li').first().innerText();
    if (!/参考 1/.test(briefLine)) {
      await abort('E2E_REFERENCE_NOT_CARRIED: ' + briefLine, 6, ctx, b);
    }
    // F-2b: a freshly created record is version 1 and is the current version.
    if (!/v1 · 当前/.test(briefLine)) {
      await abort('E2E_BRIEF_VERSION_MISSING: ' + briefLine, 6, ctx, b);
    }
  });

  await step('raise direction', async () => {
    // #direction-brief is repopulated by refreshDesign after the brief landed.
    await page.locator('#direction-brief').selectOption({ index: 1 });
    await page.locator('#direction-title').fill('Warm Gradient');
    await page.locator('#direction-color').fill('warm');
    await page.locator('#direction-submit').click();
    await page.locator('#design-directions li', { hasText: 'DIRECTION · Warm Gradient' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
  });

  await step('choose direction', async () => {
    await page.locator('#design-directions li button', { hasText: '选为方向' })
      .first().click();
    await page.locator('#design-directions li', { hasText: 'CHOSEN by workbench-user' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
  });

  await step('bind design system', async () => {
    await page.locator('#design-system').selectOption({ index: 1 });
    await page.locator('#design-system-bind').click();
    await page.locator('#design-bindings li', { hasText: 'BINDING ·' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#design-binding-active', { hasText: '已绑定设计系统' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
    const bindingLine = await page.locator('#design-bindings li').first().innerText();
    if (!/生效中/.test(bindingLine)) {
      await abort('E2E_BINDING_NOT_ACTIVE: ' + bindingLine, 6, ctx, b);
    }
  });

  // ------------------------------------------------------------------------
  // F-2b: revise the brief. The row's「新版本」entry must prefill the form from
  // that version's persisted content, the POST must land on the revision route,
  // and the result must be read back (new live version + retired old version).
  // ------------------------------------------------------------------------
  await step('revise brief', async () => {
    const row = page.locator('#design-briefs li', { hasText: 'BRIEF · E2E Autumn' }).first();
    await row.locator('button', { hasText: '新版本' }).click();
    const prefillTitle = await page.locator('#revision-brief-title').inputValue();
    const prefillGoals = await page.locator('#revision-brief-goals').inputValue();
    const checkedRefs = await page.locator('#reference-picker input[type=checkbox]:checked').count();
    if (prefillTitle !== 'E2E Autumn' || !/modern, warm, restrained/.test(prefillGoals) || checkedRefs !== 1) {
      await abort('E2E_REVISION_PREFILL_MISSING: title=' + prefillTitle +
                  ' goals=' + prefillGoals + ' refs=' + checkedRefs, 7, ctx, b);
    }
    const target = await page.locator('#revision-brief-target').innerText();
    if (!/版本 1/.test(target)) {
      await abort('E2E_REVISION_TARGET_MISSING: ' + target, 7, ctx, b);
    }
    await page.locator('#revision-brief-goals').fill('modern, warm, restrained, night');
    await page.locator('#brief-revision-submit').click();
    await page.locator('#brief-lineage li', { hasText: '版本 2' })
      .first().waitFor({ state: 'visible', timeout: 15000 });

    if (await page.locator('#design-briefs li').count() !== 2) {
      await abort('E2E_BRIEF_VERSION_COUNT: ' +
                  JSON.stringify(await page.locator('#design-briefs li').allInnerTexts()), 7, ctx, b);
    }
    const live = page.locator('#design-briefs li', { hasText: '当前' }).first();
    const retired = page.locator('#design-briefs li', { hasText: '已取代' }).first();
    const liveLine = await live.innerText();
    const retiredLine = await retired.innerText();
    // The new version carries the edited content; the retired row keeps its own.
    if (!/night/.test(liveLine) || /night/.test(retiredLine) ||
        !/已取代 → 版本 2/.test(retiredLine) || !/v1/.test(retiredLine)) {
      await abort('E2E_BRIEF_VERSION_STATE:\n' + liveLine + '\n' + retiredLine, 7, ctx, b);
    }
    // Success must move the highlight + focus onto the NEW version's row.
    if (await page.locator('#design-briefs li.highlight').count() !== 1) {
      await abort('E2E_BRIEF_HIGHLIGHT_MISSING', 7, ctx, b);
    }
    const focused = await page.evaluate(
      () => (document.activeElement && document.activeElement.textContent) || '');
    if (!/night/.test(focused)) {
      await abort('E2E_BRIEF_FOCUS_NOT_ON_NEW_VERSION: ' + focused, 7, ctx, b);
    }
    // The version chain is read back from the service, oldest version first.
    const chain = await page.locator('#brief-lineage li').allInnerTexts();
    const chainTitle = await page.locator('#brief-lineage-title').innerText();
    if (chain.length !== 2 || !/^版本 2 · 当前/.test(chain[1]) ||
        !/^版本 1 · 已取代 → 版本 2/.test(chain[0]) || !/共 2 个版本/.test(chainTitle)) {
      await abort('E2E_BRIEF_LINEAGE:\n' + chainTitle + '\n' + chain.join('\n'), 7, ctx, b);
    }
  });

  // ------------------------------------------------------------------------
  // F-2b: revise the CHOSEN direction. The human Choice follows the new version,
  // but the append-only design-system binding stays on the retired version, so
  // the UI must say「绑定需重新建立」and must NOT show the old binding as current.
  // ------------------------------------------------------------------------
  await step('revise chosen direction', async () => {
    const row = page.locator('#design-directions li', { hasText: 'CHOSEN by workbench-user' }).first();
    await row.locator('button', { hasText: '新版本' }).click();
    const prefillTitle = await page.locator('#revision-direction-title').inputValue();
    const prefillColor = await page.locator('#revision-direction-color').inputValue();
    const target = await page.locator('#revision-direction-target').innerText();
    if (prefillTitle !== 'Warm Gradient' || prefillColor !== 'warm' ||
        !/版本 1/.test(target) || !/已选定方向/.test(target)) {
      await abort('E2E_DIRECTION_REVISION_PREFILL: title=' + prefillTitle +
                  ' color=' + prefillColor + ' target=' + target, 8, ctx, b);
    }
    await page.locator('#revision-direction-title').fill('Warm Gradient II');
    await page.locator('#direction-revision-submit').click();
    await page.locator('#direction-lineage li', { hasText: '版本 2' })
      .first().waitFor({ state: 'visible', timeout: 15000 });

    if (await page.locator('#design-directions li').count() !== 2) {
      await abort('E2E_DIRECTION_VERSION_COUNT: ' +
                  JSON.stringify(await page.locator('#design-directions li').allInnerTexts()), 8, ctx, b);
    }
    const liveLine = await page.locator('#design-directions li', { hasText: '当前' }).first().innerText();
    const retiredLine = await page.locator('#design-directions li', { hasText: '已取代' }).first().innerText();
    // Choice carried forward / retired row must NOT still read as chosen.
    if (!/Warm Gradient II/.test(liveLine) || !/CHOSEN by workbench-user/.test(liveLine) ||
        !/已取代 → 版本 2/.test(retiredLine) || /CHOSEN by/.test(retiredLine)) {
      await abort('E2E_DIRECTION_VERSION_STATE:\n' + liveLine + '\n' + retiredLine, 8, ctx, b);
    }
    const chain = await page.locator('#direction-lineage li').allInnerTexts();
    if (chain.length !== 2 || !/^版本 2 · 当前/.test(chain[1]) || !/已选定（workbench-user）/.test(chain[1]) ||
        !/^版本 1 · 已取代 → 版本 2/.test(chain[0]) || !/未选定/.test(chain[0])) {
      await abort('E2E_DIRECTION_LINEAGE:\n' + chain.join('\n'), 8, ctx, b);
    }
    if (await page.locator('#design-directions li.highlight').count() !== 1) {
      await abort('E2E_DIRECTION_HIGHLIGHT_MISSING', 8, ctx, b);
    }
  });

  await step('binding rebuild readback', async () => {
    const activeText = await page.locator('#design-binding-active').first().innerText();
    const bindingLine = await page.locator('#design-bindings li').first().innerText();
    if (!/绑定需重新建立/.test(activeText) || /已绑定设计系统/.test(activeText)) {
      await abort('E2E_ACTIVE_BINDING_NOT_HONEST: ' + activeText, 9, ctx, b);
    }
    if (!/未生效/.test(bindingLine) || /生效中/.test(bindingLine)) {
      await abort('E2E_RETIRED_BINDING_SHOWN_ACTIVE: ' + bindingLine, 9, ctx, b);
    }
  });

  // ------------------------------------------------------------------------
  // F-2b persistence: throw the page away and rebuild everything from the
  // service. Same versions, same chain, same honest binding state — i.e. the
  // DOM was never the source of truth.
  // ------------------------------------------------------------------------
  await step('reload persisted readback', async () => {
    await page.reload({ waitUntil: 'load' });
    await page.locator('#token').fill(token);
    await page.locator('#connect-form button').first().click();
    await page.locator('#workspace').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#project option', { hasText: projectName })
      .first().waitFor({ state: 'attached', timeout: 20000 });
    await page.locator('#project').selectOption({ label: projectName });
    await page.locator('#design-briefs li').first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#design-directions li').first().waitFor({ state: 'visible', timeout: 15000 });

    const briefRows = await page.locator('#design-briefs li').allInnerTexts();
    const directionRows = await page.locator('#design-directions li').allInnerTexts();
    if (briefRows.length !== 2 || !briefRows.some((l) => /已取代 → 版本 2/.test(l)) ||
        !briefRows.some((l) => /当前/.test(l) && /night/.test(l)) ||
        directionRows.length !== 2 ||
        !directionRows.some((l) => /CHOSEN by workbench-user/.test(l) && /Warm Gradient II/.test(l))) {
      await abort('E2E_RELOAD_VERSIONS:\n' + briefRows.join('\n') + '\n--\n' + directionRows.join('\n'),
                  10, ctx, b);
    }
    // Both chains are re-read from the service on the reloaded page.
    await page.locator('#design-briefs li', { hasText: '当前' }).first()
      .locator('button', { hasText: '版本链' }).click();
    await page.locator('#brief-lineage li', { hasText: '版本 2' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#design-directions li', { hasText: '当前' }).first()
      .locator('button', { hasText: '版本链' }).click();
    await page.locator('#direction-lineage li', { hasText: '版本 2' })
      .first().waitFor({ state: 'visible', timeout: 15000 });

    const briefChain = await page.locator('#brief-lineage li').allInnerTexts();
    const directionChain = await page.locator('#direction-lineage li').allInnerTexts();
    if (briefChain.length !== 2 || !/^版本 1 · 已取代 → 版本 2/.test(briefChain[0]) ||
        !/^版本 2 · 当前/.test(briefChain[1]) ||
        directionChain.length !== 2 || !/^版本 1 · 已取代 → 版本 2/.test(directionChain[0]) ||
        !/^版本 2 · 当前/.test(directionChain[1])) {
      await abort('E2E_RELOAD_LINEAGE:\n' + briefChain.join('\n') + '\n--\n' + directionChain.join('\n'),
                  10, ctx, b);
    }
    const activeText = await page.locator('#design-binding-active').first().innerText();
    if (!/绑定需重新建立/.test(activeText) || /已绑定设计系统/.test(activeText)) {
      await abort('E2E_RELOAD_BINDING_NOT_HONEST: ' + activeText, 10, ctx, b);
    }
  });

  await step('mobile appshell layout', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const layout = await page.evaluate(async () => {
      const nav = document.querySelector('.app-nav');
      const items = Array.from(document.querySelectorAll('.app-nav-item'));
      const rect = nav?.getBoundingClientRect();
      const firstStyle = items.length ? getComputedStyle(items[0]) : null;
      // Hash the module THIS document was able to load from the same origin: the page and
      // the driver must be describing the same bytes, or the inventory below is about some
      // other bundle. (crypto.subtle is present on http://127.0.0.1, which Chrome treats as
      // a secure context; when it is absent the length check below still applies.)
      const served = await fetch('/workbench/main.js');
      const servedText = await served.text();
      let servedSha = null;
      if (globalThis.crypto?.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(servedText));
        servedSha = Array.from(new Uint8Array(buf))
          .map((x) => x.toString(16).padStart(2, '0')).join('');
      }
      return {
        itemRoutes: items.map((i) => i.dataset?.route ?? ''),
        fontSize: firstStyle ? Number.parseFloat(firstStyle.fontSize) : 0,
        navLeft: rect?.left ?? -1,
        navWidth: rect?.width ?? 0,
        navHeight: rect?.height ?? 0,
        overflowX: nav ? getComputedStyle(nav).overflowX : '',
        servedStatus: served.status,
        servedLength: servedText.length,
        servedSha,
      };
    });
    // The app-shell geometry reading is unchanged: same thresholds, same exit code.
    if (layout.fontSize < 10 || layout.navLeft !== 0 || layout.navWidth < 380 ||
        layout.navHeight > 120 || layout.overflowX !== 'auto') {
      await abort('E2E_MOBILE_APPSHELL_LAYOUT: ' + JSON.stringify(layout), 11, ctx, b);
    }

    // --- route inventory: mounted nav vs the table that produced it --------------
    let bundleText = null;
    let bundleStatus = 'FETCH_THREW';
    try {
      const res = await fetch(base + '/workbench/main.js');
      bundleStatus = String(res.status);
      if (res.ok) bundleText = await res.text();
    } catch (e) {
      bundleStatus = 'FETCH_ERROR ' + e.message.split('\n')[0];
    }
    if (bundleText === null) {
      await abort('E2E_BUNDLE_FETCH_FAILED: /workbench/main.js answered ' + bundleStatus, 12, ctx, b);
    }
    const table = parseRouteViews(bundleText);
    if (table === null) {
      await abort('E2E_ROUTE_TABLE_UNREADABLE: no parseable `' + ROUTE_TABLE_MARKER +
                  '` in the served bundle (' + bundleText.length + ' chars, sha256:' +
                  sha256Hex(bundleText) + ')', 12, ctx, b);
    }
    const parsedSha = sha256Hex(bundleText);
    if (layout.servedStatus !== 200 || layout.servedLength !== bundleText.length ||
        (layout.servedSha !== null && layout.servedSha !== parsedSha)) {
      await abort('E2E_BUNDLE_IDENTITY_MISMATCH: driver parsed sha256:' + parsedSha +
                  ' (' + bundleText.length + ' chars) but the page fetched status=' +
                  layout.servedStatus + ' length=' + layout.servedLength +
                  ' sha256:' + (layout.servedSha ?? 'unavailable'), 12, ctx, b);
    }
    const mounted = [...layout.itemRoutes].sort();
    const expected = table.map((r) => r.view).sort();
    routeInventory = {
      source: 'served bundle GET ' + base + '/workbench/main.js',
      bundleSha256: parsedSha,
      bundleChars: bundleText.length,
      tableEntryCount: table.length,
      navItemCount: mounted.length,
      tableViews: table.map((r) => r.view),
      tableHashes: table.map((r) => r.hash),
      navRoutes: mounted,
    };
    // EXACT equality on both the count and the membership, for the same reason the
    // literal did: this is the reading that says every table entry reached the screen as
    // a real button and no button exists that the table does not name. A route that stops
    // rendering, a button that appears without a route, and a re-labelled view all go red.
    // It is an inventory, not a product limit: the taskpack says the menu count is not
    // fixed ("不机械固定3菜单/16页"), and it now moves with the table with nobody editing
    // this file.
    if (mounted.length !== table.length || mounted.join('\u0000') !== expected.join('\u0000')) {
      await abort('E2E_NAV_ROUTE_INVENTORY: nav=' + mounted.length +
                  ' table=' + table.length +
                  ' nav-only=[' + mounted.filter((v) => !expected.includes(v)).join(',') +
                  '] table-only=[' + expected.filter((v) => !mounted.includes(v)).join(',') +
                  '] ' + JSON.stringify(routeInventory), 12, ctx, b);
    }
    console.log('E2E_ROUTE_INVENTORY: ' + JSON.stringify({
      nav: mounted.length, table: table.length, bundleSha256: parsedSha,
    }));
  });

  // Read back the final state as the persisted-state proof.
  const activeText = await page.locator('#design-binding-active').first().innerText();
  const bindingLine = await page.locator('#design-bindings li').first().innerText();
  const directionLine = await page.locator('#design-directions li', { hasText: '当前' }).first().innerText();
  const briefLine = await page.locator('#design-briefs li', { hasText: '当前' }).first().innerText();
  const directionChain = await page.locator('#direction-lineage li').allInnerTexts();
  const briefChain = await page.locator('#brief-lineage li').allInnerTexts();

  // Failure checks happen BEFORE the teardown so a failure screenshot can be
  // captured while the page (and its DOM state) is still alive.
  if (errors.length) {
    const tail = errors.slice(0, 8).join(' ;; ');
    await abort('E2E_BROWSER_ERRORS: ' + tail, 4, ctx, b);
  }
  if (!/绑定需重新建立/.test(activeText) || /已绑定设计系统/.test(activeText) ||
      !/未生效/.test(bindingLine) || /生效中/.test(bindingLine) ||
      !/CHOSEN by workbench-user/.test(directionLine) || !/night/.test(briefLine) ||
      briefChain.length !== 2 || directionChain.length !== 2) {
    const detail = 'E2E_READBACK_MISMATCH:\n' + activeText + '\n' + bindingLine + '\n' +
                   directionLine + '\n' + briefLine + '\n' + briefChain.join('\n') + '\n--\n' +
                   directionChain.join('\n');
    await abort(detail, 5, ctx, b);
  }

  // The export exit, in a real browser. appshell ㉒ already drives the same sequence in jsdom,
  // but a DOM shim cannot say whether the control is really clickable, whether the GET really
  // leaves the page, or whether the panel really paints the service's bytes. This is the chain
  // that answers those three: create -> a named human approves -> the row's control goes live ->
  // the panel renders both projections, the stored ids and the outbound facts.
  await page.evaluate(() => { window.location.hash = '#/records'; });
  await page.locator('#knowledge-create-submit').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#knowledge-type').selectOption('METHOD');
  await page.locator('#knowledge-title').fill('E2E export chain');
  await page.locator('#knowledge-statement')
    .fill('the export exit is reachable from the page, not only from a route');
  await page.locator('#knowledge-applies-to').fill('editorial');
  await page.locator('#knowledge-license').fill('project-internal');
  await page.locator('#knowledge-rights').selectOption('CHECKED');
  await page.locator('#knowledge-client-asset').selectOption('false');
  await page.locator('#knowledge-third-party').selectOption('false');
  await page.locator('#knowledge-job-mode').selectOption('fill');
  await page.locator('#knowledge-job').fill('job-e2e-export');
  // The declination branch, exercised on the wire: 不使用 sends the literal, and the filled
  // job_id above travels unchanged beside it.
  await page.locator('#knowledge-operation-mode').selectOption('unused');
  await page.locator('#knowledge-evidence').fill('sha256:' + 'e'.repeat(64));
  await page.locator('#knowledge-create-submit').click();
  // Wait on the control's actual state, not its visibility: the row is already on screen before
  // the reload, so a visibility wait passes against the stale DOM and reads the wrong answer.
  const outcomeText = async () => page.locator('#knowledge-outcome').innerText();
  const waitExportEnabled = async (want) => page.waitForFunction((expected) => {
    const button = document.getElementById('knowledge-export-0');
    return !!button && (expected ? !button.disabled : button.disabled);
  }, want, { timeout: 20000 }).then(() => true).catch(() => false);
  if (!await waitExportEnabled(false)) {
    await abort('E2E_EXPORT_LIVE_BEFORE_APPROVAL: an unapproved candidate offered a working '
                + 'export control; outcome=' + await outcomeText(), 13, ctx, b);
  }
  await page.locator('#knowledge-review-target').selectOption({ index: 0 });
  await page.locator('#knowledge-decision').selectOption('APPROVE');
  await page.locator('#knowledge-reviewer').fill('E2E Reviewer');
  await page.locator('#knowledge-review-submit').click();
  if (!await waitExportEnabled(true)) {
    await abort('E2E_EXPORT_STILL_BLOCKED_AFTER_APPROVAL: outcome=' + await outcomeText()
                + ' row=' + await page.locator('#knowledge-body').innerText()
                  .then((text) => text.slice(0, 300)), 13, ctx, b);
  }
  await page.locator('#knowledge-export-0').click();
  // The panel starts in a loading state; read it only once that text is gone, or the assertion
  // below measures a spinner.
  await page.waitForFunction(() => {
    const node = document.getElementById('knowledge-export-body');
    return !!node && !/正在读回/.test(node.textContent) && node.textContent.length > 40;
  }, null, { timeout: 20000 });
  const exportText = await page.locator('#knowledge-export-body').innerText();
  const missing = ['CANDIDATE_EXPORT',
    // The envelope and the document it wraps carry DIFFERENT versions: the envelope is
    // ...-export-envelope/v1, the wrapped v2 export document has always been ...-export/v1.
    // Asserting both, side by side, is the browser-side twin of the collision the render caught.
    'design-lab/assurance-knowledge-candidate-export-envelope/v1',
    'design-lab/assurance-knowledge-candidate-export/v1',
    'design-lab/candidate-knowledge/v1',
    'job-e2e-export:UNUSED', 'USER_SUPPLIED', 'EXPLICITLY_UNUSED',
    'NOT_CONNECTED', 'sent_count=0', 'bytes=']
    .filter((needle) => !exportText.includes(needle));
  if (missing.length || /已发送|发送成功|delivered/i.test(exportText)) {
    await abort('E2E_EXPORT_PANEL: missing=' + JSON.stringify(missing)
                + ' text=' + exportText.slice(0, 300), 13, ctx, b);
  }
  console.log('E2E_EXPORT_EXIT: ' + JSON.stringify({
    envelope: exportText.includes(
      'design-lab/assurance-knowledge-candidate-export-envelope/v1'),
    sentClaim: /已发送|发送成功|delivered/i.test(exportText),
    bytes: (exportText.match(/bytes=(\d+)/) || [])[1] ?? null,
  }));

  await ctx.close();
  await b.close();

  writeSummary('PASS');
  console.log('E2E_OK design_layer=' + JSON.stringify({
    project: projectId,
    brief: briefLine,
    briefChain,
    direction: directionLine,
    binding: bindingLine,
    active: activeText,
    directionChain,
  }));
} catch (e) {
  const reason = 'E2E_FAIL: ' + e.message.split('\n')[0];
  console.error(reason);
  await captureFailureShot();
  writeSummary('FAIL', reason);
  process.exit(1);
}

// P0-G: screenshot the live page when a real failure happens mid-chain, so a
// CI artifact can show WHERE the slice broke. Best-effort: in the catch path
// the browser/context may already be dead (or never created — see `let page`)
// and the shot is skipped; that is not itself a failure.
async function captureFailureShot(ctx, b) {
  if (!page) return;
  try {
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, 'fail.png') });
    console.error('E2E_FAIL_SCREENSHOT: ' + path.join(evidenceDir, 'fail.png'));
  } catch {
    console.error('E2E_FAIL_SCREENSHOT: unavailable (page/browser already closed)');
  } finally {
    if (ctx) { try { await ctx.close(); } catch { /* already torn down */ } }
    if (b) { try { await b.close(); } catch { /* already torn down */ } }
  }
}
