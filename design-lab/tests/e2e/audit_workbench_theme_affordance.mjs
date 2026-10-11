// SPDX-License-Identifier: MIT
// Theme affordance gate: does clicking the palette control actually change what is painted,
// and does the URL the control writes come back as a page instead of a 401?
//
// Why this exists: the DOT audit (D13) found that both theme buttons were no-ops in a real
// browser and that `?palette=ui2026` answered 401. Neither could be seen from the vm contract
// suite (which never asserted a theme change) or from the capture driver (which sets the <html>
// attributes directly, so it renders the light theme without the product path ever working).
// This gate drives the shipped bundle in Chromium, clicks the real buttons, and reads the
// computed background before and after -- the only reading that can tell "the attribute moved"
// apart from "the page changed".
//
// Env: E2E_SERVICE_URL E2E_TOKEN E2E_NODE_MODULES E2E_BROWSER [AFF_OUT] [AFF_WIDTH=1440]
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browserPath = process.env.E2E_BROWSER;
const outPath = process.env.AFF_OUT || '';
const width = Number.parseInt(process.env.AFF_WIDTH || '1440', 10);

const fail = (reason) => { console.error('AFF_FAIL: ' + reason); process.exit(2); };
if (!serviceUrl || !token || !nmDir) fail('missing E2E_SERVICE_URL / E2E_TOKEN / E2E_NODE_MODULES');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const req = createRequire(nmDir + '/noop.js');
const { chromium } = req('playwright');

const READ = () => {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll('.theme-toggle'));
  return {
    palette: root.getAttribute('data-palette') || '(absent)',
    scheme: root.getAttribute('data-scheme') || '(absent)',
    bodyBg: getComputedStyle(document.body).backgroundColor,
    surfaceVar: getComputedStyle(root).getPropertyValue('--surface').trim(),
    primaryVar: getComputedStyle(root).getPropertyValue('--primary').trim(),
    controls: buttons.map((b) => ({ action: b.dataset.themeAction || '?',
                                    label: (b.textContent || '').trim(),
                                    visible: b.offsetParent !== null
                                    && getComputedStyle(b).visibility !== 'hidden' })),
    search: location.search,
  };
};

const browser = await chromium.launch({ executablePath: browserPath, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width, height: 900 } });
const findings = [];
const measures = {};
const statuses = [];

page.on('response', (r) => {
  const u = new URL(r.url());
  if (u.pathname === '/workbench') statuses.push(`${r.status()} ${u.search || '(no query)'}`);
});

async function read(tag) {
  const value = await page.evaluate(READ);
  measures[tag] = value;
  return value;
}

// 1. the plain page, on a routed view where the shell header renders the controls
await page.goto(`${serviceUrl}/workbench#/capabilities`, { waitUntil: 'load' });
await page.waitForTimeout(500);
const before = await read('plainBeforeClick');
// Two sets of controls exist in the document by design -- the legacy workbench topbar and the
// routed shell header -- and exactly one of each is hidden. Clicking the hidden one is what
// made the first version of this probe time out, so the count of VISIBLE controls per action is
// itself the assertion: a person must have exactly one thing to press.
const visibleCount = (list, action) => list.filter((c) => c.action === action && c.visible).length;
const paletteVisible = visibleCount(before.controls, 'palette');
if (paletteVisible !== 1)
  findings.push(`#${'capabilities'} shows ${paletteVisible} visible palette control(s) out of `
    + `${before.controls.length} .theme-toggle nodes -- there must be exactly one to press, `
    + 'and an invisible twin is a phantom control');

// 2. click the palette button: the applied palette AND the painted surface must move
if (paletteVisible === 1) {
  await page.locator('.theme-toggle[data-theme-action="palette"]:visible').first().click();
  await page.waitForTimeout(500);
  const after = await read('afterPaletteClick');
  // The shot is taken from the click path itself, not from a driver that presets the
  // attributes, so the PNG and the computed colours describe the same interaction.
  if (process.env.AFF_SHOTS) {
    mkdirSync(process.env.AFF_SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(process.env.AFF_SHOTS,
      `clicked-${before.palette}-to-${after.palette}@${width}.png`) });
  }
  if (after.palette === before.palette)
    findings.push(`clicking the palette control left data-palette at ${before.palette} -- `
      + 'the handler re-read a source that had not been written yet (D13)');
  if (after.surfaceVar === before.surfaceVar && after.primaryVar === before.primaryVar
      && after.bodyBg === before.bodyBg)
    findings.push('the computed colours did not change after the palette click '
      + `(surface=${before.surfaceVar} primary=${before.primaryVar} bg=${before.bodyBg}) -- `
      + 'an attribute that moves without changing what is painted is not a theme');
  if (after.search === before.search)
    findings.push(`the palette click left the URL at "${after.search}" -- the control is `
      + 'supposed to record its own choice so a reload repeats it');

  if (visibleCount(after.controls, 'scheme') === 1) {
    const schemeBefore = await read('beforeSchemeClick');
    await page.locator('.theme-toggle[data-theme-action="scheme"]:visible').first().click();
    await page.waitForTimeout(500);
    const schemeAfter = await read('afterSchemeClick');
    if (schemeAfter.scheme === schemeBefore.scheme)
      findings.push(`the scheme control left data-scheme at ${schemeBefore.scheme} (D13)`);
    if (schemeAfter.bodyBg === schemeBefore.bodyBg
        && schemeAfter.surfaceVar === schemeBefore.surfaceVar)
      findings.push(`the scheme click painted nothing new (bg=${schemeBefore.bodyBg})`);
  }
}

// 3. the URL the control writes must come back as a page, and must be applied on load.
// A fresh page is used because Playwright returns null from goto() when the target is a
// same-document change, and `/workbench#/x` -> `/workbench?palette=..#/x` is exactly that
// edge case: a null response would have been read as "no answer at all" rather than measured.
const themedPage = await browser.newPage({ viewport: { width, height: 900 } });
themedPage.on('response', (r) => {
  const u = new URL(r.url());
  if (u.pathname === '/workbench') statuses.push(`${r.status()} ${u.search || '(no query)'}`);
});
const themed = await themedPage.goto(
  `${serviceUrl}/workbench?palette=ui2026&scheme=light#/capabilities`, { waitUntil: 'load' });
if (!themed) findings.push('the themed navigation produced no response object to grade');
else if (themed.status() !== 200)
  findings.push(`GET /workbench?palette=ui2026&scheme=light answered HTTP ${themed.status()} -- `
    + 'the page route matched the query string, so a reload of the interface own URL fails');
await themedPage.waitForTimeout(500);
const readOn = async (p, tag) => {
  const value = await p.evaluate(READ);
  measures[tag] = value;
  return value;
};
const fromUrl = await readOn(themedPage, 'loadedFromQueryUrl');
if (themed && themed.status() === 200) {
  if (fromUrl.palette !== 'ui2026')
    findings.push(`the URL asked for palette=ui2026 but the page applied ${fromUrl.palette}`);
  if (fromUrl.scheme !== 'light' && fromUrl.palette !== 'design-lab')
    findings.push(`the URL asked for scheme=light but the page applied ${fromUrl.scheme} `
      + 'on a palette that publishes it');
}

// 4. the painted difference must be observable between the two palettes
const defaultSurface = measures.plainBeforeClick.surfaceVar || measures.plainBeforeClick.bodyBg;
const themedSurface = fromUrl.surfaceVar || fromUrl.bodyBg;
if (defaultSurface && defaultSurface === themedSurface
    && measures.plainBeforeClick.palette !== fromUrl.palette)
  findings.push(`the two palettes resolve to the same painted surface ${themedSurface} -- `
    + 'one of the two token blocks is inert');

await browser.close();

const subject = {
  bundle: 'apps/workbench/build/main.js',
  bundleSha256: createHash('sha256').update(readFileSync(path.join(REPO, 'apps/workbench/build/main.js'))).digest('hex'),
  style: 'apps/workbench/style.css',
  styleSha256: createHash('sha256').update(readFileSync(path.join(REPO, 'apps/workbench/style.css'))).digest('hex'),
  width,
};
const report = { kind: 'workbench-theme-affordance', schemaVersion: 'design-lab/browser-gate/v1',
  generatedAt: new Date().toISOString().slice(0, 19) + 'Z', subject, statuses, measures,
  findings };
if (outPath) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 1) + '\n');
}
console.log('AFF_SUMMARY findings=' + findings.length
  + ' statuses=' + JSON.stringify(statuses)
  + ' plain=' + measures.plainBeforeClick.palette + '/' + measures.plainBeforeClick.scheme
  + ' afterClick=' + (measures.afterPaletteClick || {}).palette
  + ' fromUrl=' + fromUrl.palette + '/' + fromUrl.scheme
  + ' surface ' + defaultSurface + ' -> ' + themedSurface);
for (const f of findings) console.log('  FINDING: ' + f);
if (findings.length) { console.error('AFF_DONE=FAIL findings=' + findings.length); process.exit(1); }
console.log('AFF_OK');
