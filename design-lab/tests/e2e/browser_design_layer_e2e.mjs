// SPDX-License-Identifier: MIT
// E-SLICE-02 browser E2E: real Chromium drives the Workbench 05 design layer
// vertical slice (Project -> Brief -> Direction -> DesignSystem) end to end,
// served by the real Python loopback service (same-origin fetch).
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
               'persisted-readback'],
    consoleErrors: errors.length,
    result,
  };
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
    const name = 'E2E Autumn ' + Date.now();
    await page.locator('#project-name').fill(name);
    await page.locator('#create-form button').first().click();
    // The project select repopulates only after the create POST plus the projects()
    // refresh round-trip settles; wait for the new <option> to attach before we can
    // select it (an immediate read sees the pre-create placeholder only).
    await page.locator('#project option', { hasText: name })
      .first().waitFor({ state: 'attached', timeout: 20000 });
    await page.locator('#project').selectOption({ label: name });
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
      const reason = 'E2E_REFERENCE_NOT_CARRIED: ' + briefLine;
      console.error(reason);
      await captureFailureShot(ctx, b);
      writeSummary('FAIL', reason);
      process.exit(6);
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
  });

  // Read back the final readback line as the persisted-state proof.
  const activeText = await page.locator('#design-binding-active').first().innerText();
  const bindingLine = await page.locator('#design-bindings li').first().innerText();
  const directionLine = await page.locator('#design-directions li').first().innerText();

  // Failure checks happen BEFORE the teardown so a failure screenshot can be
  // captured while the page (and its DOM state) is still alive.
  if (errors.length) {
    const tail = errors.slice(0, 8).join(' ;; ');
    console.error('E2E_BROWSER_ERRORS: ' + tail);
    await captureFailureShot(ctx, b);
    writeSummary('FAIL', 'E2E_BROWSER_ERRORS: ' + tail);
    process.exit(4);
  }
  if (!/已绑定设计系统/.test(activeText) || !/BINDING ·/.test(bindingLine) ||
      !/CHOSEN by workbench-user/.test(directionLine)) {
    const detail = 'E2E_READBACK_MISMATCH:\n' + activeText + '\n' + bindingLine + '\n' + directionLine;
    console.error(detail);
    await captureFailureShot(ctx, b);
    writeSummary('FAIL', detail);
    process.exit(5);
  }

  await ctx.close();
  await b.close();

  writeSummary('PASS');
  console.log('E2E_OK design_layer=' + JSON.stringify({
    direction: directionLine,
    binding: bindingLine,
    active: activeText,
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
