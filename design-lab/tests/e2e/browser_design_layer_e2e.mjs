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
// Exits 0 with `E2E_OK ...` on a full chain pass; non-zero otherwise.
import { createRequire } from 'node:module';
import process from 'node:process';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browser = process.env.E2E_BROWSER || null;

if (!serviceUrl || !token || !nmDir) {
  console.error('E2E_CONFIG_MISSING: need E2E_SERVICE_URL, E2E_TOKEN, E2E_NODE_MODULES');
  process.exit(3);
}
if (!/^[0-9a-f]{64}$/.test(token)) {
  console.error('E2E_TOKEN_SHAPE: must be 64-hex');
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
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const errors = [];
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

  // Refresh loads the design-system catalog + design-layer readback into 05.
  await step('refresh design systems', async () => {
    await page.locator('#refresh').click();
    await page.locator('#design-systems li').first().waitFor({ state: 'visible', timeout: 15000 });
  });

  await step('persist brief', async () => {
    await page.locator('#brief-title').fill('E2E Autumn');
    await page.locator('#brief-goals').fill('modern, warm, restrained');
    await page.locator('#brief-submit').click();
    await page.locator('#design-briefs li', { hasText: 'BRIEF · E2E Autumn' })
      .first().waitFor({ state: 'visible', timeout: 15000 });
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

  await ctx.close();
  await b.close();

  if (errors.length) {
    console.error('E2E_BROWSER_ERRORS: ' + errors.slice(0, 8).join(' ;; '));
    process.exit(4);
  }
  if (!/已绑定设计系统/.test(activeText) || !/BINDING ·/.test(bindingLine) ||
      !/CHOSEN by workbench-user/.test(directionLine)) {
    console.error('E2E_READBACK_MISMATCH:\n' + activeText + '\n' + bindingLine + '\n' + directionLine);
    process.exit(5);
  }
  console.log('E2E_OK design_layer=' + JSON.stringify({
    direction: directionLine,
    binding: bindingLine,
    active: activeText,
  }));
} catch (e) {
  console.error('E2E_FAIL: ' + e.message.split('\n')[0]);
  process.exit(1);
}
