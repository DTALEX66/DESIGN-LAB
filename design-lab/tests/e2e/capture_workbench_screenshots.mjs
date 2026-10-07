// SPDX-License-Identifier: MIT
// Viewport screenshot capture for the Workbench (E1/E2 visual proof only).
// Drives the REAL loopback service with the committed build/main.js in a real
// Chromium: bootstrap a project through the UI, then capture every routed page
// at each declared viewport and write PNGs + a hash manifest next to them.
// Env: E2E_SERVICE_URL E2E_TOKEN E2E_NODE_MODULES [E2E_BROWSER]
//      CAP_OUT_DIR CAP_COMMIT CAP_WIDTHS CAP_SOURCE_IMAGE CAP_PYTHON_VERSION
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const serviceUrl = process.env.E2E_SERVICE_URL;
const token = process.env.E2E_TOKEN;
const nmDir = process.env.E2E_NODE_MODULES;
const browser = process.env.E2E_BROWSER;
const outDir = process.env.CAP_OUT_DIR;
const commit = process.env.CAP_COMMIT || 'unknown';
const sourceImage = process.env.CAP_SOURCE_IMAGE || '';
// Repo-relative when the file is inside the checkout, absolute (and visibly so) when the
// operator pointed at something outside it.
const referenceSourceRecorded = (() => {
  if (!sourceImage) return null;
  const rel = path.relative(process.cwd(), sourceImage).split(path.sep).join('/');
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : sourceImage;
})();
const pythonVersion = process.env.CAP_PYTHON_VERSION || 'unknown';
const widths = (process.env.CAP_WIDTHS || '1280,1920,2560')
  .split(',').map((w) => Number.parseInt(w, 10)).filter((w) => Number.isFinite(w) && w > 0);

const VIEWPORT_HEIGHT = { 390: 844, 768: 1024, 1280: 800, 1440: 900, 1920: 1080, 2560: 1440 };
const heightFor = (w) => VIEWPORT_HEIGHT[w] ?? Math.round(w * 0.62);

const fail = (reason) => {
  console.error('CAP_FAIL: ' + reason);
  process.exit(2);
};
if (!serviceUrl || !token || !nmDir || !outDir) fail('CAP_CONFIG_MISSING');
if (!/^[0-9a-f]{64}$/.test(token)) fail('CAP_TOKEN_SHAPE');
if (widths.length === 0) fail('CAP_WIDTHS_EMPTY');

const req = createRequire(nmDir + '/noop.js');
const pw = req('playwright');

// Routed pages, in capture order. `dynamic` pages need the bootstrapped id.
//
// This list used to cover 8 of the 12 entries in shell.ts ROUTE_VIEWS, so four routed
// pages -- including 品牌系统, which has a real /api/* readback -- had never been
// rendered by any screenshot round. A route that is never captured cannot fail the
// geometry gates either, so the omission read as "the UI is audited".
//
// The landing surface (工作台) is the app shell, not a `#route-view` page: measured,
// at the landing URL `#route-view` stays present but empty and hidden, so waiting on it
// times out. It used to be left out on the belief that the browser E2E shot it -- that
// E2E only writes a PNG on failure (`fail.png`), so in a normal run the primary surface
// was never captured by anything. It is captured here against its own host element.
const PAGES = [
  { key: 'workbench', hash: '', host: '#workspace' },
  { key: 'dashboard', hash: '#/dashboard' },
  { key: 'projects', hash: '#/projects' },
  { key: 'project-detail', hash: null, dynamic: true },
  { key: 'research', hash: '#/research' },
  { key: 'brand-systems', hash: '#/brand-systems' },
  { key: 'domains', hash: '#/domains' },
  { key: 'creative-tools', hash: '#/tools' },
  { key: 'deliverables', hash: '#/deliverables' },
  { key: 'evidence', hash: '#/evidence' },
  { key: 'collaboration', hash: '#/collaboration' },
  { key: 'preflight', hash: '#/preflight' },
  { key: 'settings', hash: '#/settings' },
];

mkdirSync(outDir, { recursive: true });

const launchOpts = { headless: true };
if (browser) launchOpts.executablePath = browser;
const b = await pw.chromium.launch(launchOpts);
let browserVersion = 'unknown';
try {
  browserVersion = b.version();
} catch {
  // version probe is best-effort; launch errors must dominate the run.
}

const shots = [];
const problems = [];
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// Build Output Truth: the served bundle is the committed byte, so bind its hash
// to the record instead of only naming the commit.
const bundleSubject = () => {
  const rel = path.join('apps', 'workbench', 'build', 'main.js');
  const abs = path.resolve(rel);
  if (!existsSync(abs)) return { bundle: rel, bundleSha256: 'MISSING' };
  const bytes = readFileSync(abs);
  return { bundle: rel, bundleBytes: bytes.length, bundleSha256: sha256(bytes) };
};

// A failed bootstrap is far more diagnosable with the live DOM next to the
// stack, so dump the visible status/notice text before exiting.
let livePage = null;
const dumpDiagnostics = async (err) => {
  let text = 'no live page';
  if (livePage) {
    text = await livePage
      .evaluate(() => Array.from(document.querySelectorAll('p[id],ul[id]'))
        .map((n) => n.id + ' :: ' + (n.textContent || '').trim().slice(0, 300)).join('\n'))
      .catch(() => 'diagnostics unavailable');
  }
  writeFileSync(path.join(outDir, 'capture-debug.txt'),
    String(err && err.stack ? err.stack : err) + '\n\n' + text, 'utf8');
  console.error(text);
  fail('CAP_BOOTSTRAP_FAILED');
};

const openWorkspace = async (width) => {
  const ctx = await b.newContext({ viewport: { width, height: heightFor(width) } });
  const page = await ctx.newPage();
  livePage = page;
  page.on('pageerror', (e) => problems.push(`pageerror@${width}: ` + String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console@${width}: ` + m.text());
  });
  await page.goto(serviceUrl + '/workbench', { waitUntil: 'load' });
  await page.locator('#token').fill(token);
  await page.locator('#connect-form button').first().click();
  await page.locator('#workspace').waitFor({ state: 'visible', timeout: 20000 });
  return { ctx, page };
};

// --- bootstrap a real project through the UI (no fixture injection) ---------
const stamp = Date.now();
const projectName = 'Closeout ' + stamp;
let projectId = '';
try {
  const { ctx, page } = await openWorkspace(1280);
  await page.locator('#project-name').fill(projectName);
  await page.locator('#create-form button').first().click();
  await page.locator('#project option', { hasText: projectName })
    .first().waitFor({ state: 'attached', timeout: 20000 });
  await page.locator('#project').selectOption({ label: projectName });
  projectId = await page.locator('#project').inputValue();
  if (!projectId) fail('CAP_PROJECT_ID_MISSING');

  if (sourceImage && existsSync(sourceImage)) {
    const buffer = readFileSync(sourceImage);
    await page.locator('#file').setInputFiles({
      name: path.basename(sourceImage), mimeType: 'image/png', buffer,
    });
    await page.locator('#import-button').click();
    await page.locator('#reference-picker input[type=checkbox]').first()
      .waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#reference-picker input[type=checkbox]').first().check();
  }

  await page.locator('#refresh').click();
  await page.locator('#design-systems li').first().waitFor({ state: 'visible', timeout: 20000 });
  // The refresh repopulates the project select; keep it on the bootstrapped
  // project so the bind click has a current project owner.
  await page.locator('#project').selectOption({ label: projectName });

  await page.locator('#brief-title').fill('Closeout visual proof');
  await page.locator('#brief-goals').fill('commercial, restrained, editable');
  await page.locator('#brief-submit').click();
  await page.locator('#design-briefs li', { hasText: 'BRIEF · Closeout visual proof' })
    .first().waitFor({ state: 'visible', timeout: 20000 });

  await page.locator('#direction-brief').selectOption({ index: 1 });
  await page.locator('#direction-title').fill('Closeout Direction');
  await page.locator('#direction-color').fill('warm');
  await page.locator('#direction-submit').click();
  await page.locator('#design-directions li', { hasText: 'DIRECTION · Closeout Direction' })
    .first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#design-directions li button', { hasText: '选为方向' })
    .first().click();
  await page.locator('#design-directions li', { hasText: 'CHOSEN by workbench-user' })
    .first().waitFor({ state: 'visible', timeout: 20000 });

  await page.locator('#design-system').selectOption({ index: 1 });
  await page.locator('#design-system-bind').click();
  await page.locator('#design-bindings li', { hasText: 'BINDING ·' })
    .first().waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#design-binding-active', { hasText: '已绑定设计系统' })
    .first().waitFor({ state: 'visible', timeout: 20000 });
  await ctx.close();
} catch (err) {
  await dumpDiagnostics(err);
}

// --- capture ----------------------------------------------------------------
const pageHash = (p) => (p.dynamic ? '#/projects/' + encodeURIComponent(projectId) : p.hash);

for (const width of widths) {
  const { ctx, page } = await openWorkspace(width);
  for (const p of PAGES) {
    const hash = pageHash(p);
    const host = p.host || '#route-view';
    if (p.host) {
      // The landing surface reveals itself only while the session token lives in
      // THIS document's closure (`show()` hides #workspace whenever !connected), so a
      // reload cannot reach it -- it would capture the connect form and call it the
      // workbench. Step out to a routed view and back with same-document hash changes
      // so the token survives and the hashchange actually fires.
      await page.evaluate(() => { window.location.hash = '#/dashboard'; });
      await page.locator('#route-view').waitFor({ state: 'visible', timeout: 20000 });
      await page.evaluate(() => { window.location.hash = ''; });
    } else {
      await page.goto(serviceUrl + '/workbench' + hash, { waitUntil: 'load' });
    }
    await page.locator(host).waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForFunction((sel) =>
      !document.querySelector(sel + ' .view-loading'), host, { timeout: 30000 })
      .catch(() => problems.push(`loading-timeout@${width} ${p.key}`));
    // KPI count-up is JS-driven, so a mid-animation frame would freeze a wrong
    // number into the evidence; wait until every readback value has settled.
    await page.waitForFunction((sel) => Array.from(
        document.querySelectorAll(sel + ' strong[data-count]'))
      .every((n) => (n.textContent || '').trim() === n.dataset.count),
    host, { timeout: 8000 }).catch(() => problems.push(`kpi-settle-timeout@${width} ${p.key}`));
    await page.waitForTimeout(400);
    const file = `${String(shots.length).padStart(2, '0')}-${p.key}@${width}.png`;
    const filePath = path.join(outDir, file);
    const buffer = await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
    const bytes = readFileSync(filePath);
    // The numbers the PNG shows are recorded next to the PNG. Prose that
    // re-describes a screenshot is a second, unbound source of truth, and this
    // file already has one fabricated round behind it; quoting the manifest
    // instead means the same bytes back both.
    const rendered = await page.evaluate((sel) => ({
      host: sel,
      kpis: Array.from(document.querySelectorAll(sel + ' .kpi')).map((card) => ({
        value: (card.querySelector('strong') || {}).textContent?.trim() ?? '',
        label: (card.querySelector('small') || {}).textContent?.trim() ?? '',
        note: (card.querySelector('.trend') || {}).textContent?.trim() ?? '',
      })),
      headings: Array.from(document.querySelectorAll(sel + ' h2, ' + sel + ' h3'))
        .map((h) => h.textContent.trim()).slice(0, 14),
      unreadBack: /未读回|未连接/.test(document.querySelector(sel)?.textContent ?? ''),
    }), host);
    shots.push({
      file,
      page: p.key,
      hashRoute: hash,
      viewport: { width, height: heightFor(width) },
      url: serviceUrl + '/workbench' + hash,
      bytes: bytes.length,
      bufferBytes: buffer.length,
      sha256: sha256(bytes),
      rendered,
      capturedAt: new Date().toISOString(),
    });
    writeFileSync(filePath + '.license', JSON.stringify({
      schemaVersion: 'design-lab/asset-sidecar/v1',
      file: path.relative(process.cwd(), filePath).split(path.sep).join('/'),
      sha256: 'sha256:' + sha256(bytes),
      license: 'MIT',
      author: 'DESIGN-LAB Workbench rendered by scripts/capture_workbench_screenshots.py '
        + 'for DTALEX66 (DESIGN-LAB project owner)',
      redistributable: true,
      modelInputAllowed: false,
      commercialUse: true,
      sourceId: null,
      exception: {
        approvedBy: 'DTALEX66 (project owner)',
        expiresAt: '2027-10-05',
      },
      notes: 'First-party screenshot of this repository\'s own Workbench served by its own '
        + 'loopback service, rendered at commit ' + commit + '. Visible content: project UI '
        + '(MIT), one first-party MIT eval reference raster, and text set in locally installed '
        + 'system fonts. Font output rights are asserted only for the local OS licence; no '
        + 'third-party artwork, stock imagery or model output is embedded. Approval basis: the '
        + 'owner\'s 2026-10-05 closeout instruction to capture and archive real UI screenshots '
        + 'in this directory. modelInputAllowed=false because no training right is asserted.',
    }, null, 2) + '\n', 'utf8');
    console.log(`CAP ok: ${file} ${bytes.length}B`);
  }
  await ctx.close();
}

await b.close();

if (problems.length > 0) {
  console.error(problems.join('\n'));
  fail('CAP_BROWSER_DIAGNOSTICS count=' + problems.length);
}

const manifest = {
  kind: 'workbench-viewport-screenshots',
  schema: 'design-lab/screenshot-manifest/v1',
  generatedAt: new Date().toISOString(),
  commit,
  subject: bundleSubject(),
  project: { name: projectName, id: projectId },
  // Recorded relative to the repo, the same way the PNG sidecars record their own path.
  // The absolute form made the committed manifest machine-specific: running the identical
  // capture from a linked worktree produced a different record, so the evidence could not
  // be committed from anywhere but the primary checkout. An outside-repo --source-image
  // keeps its absolute form and says so, rather than being smuggled into a repo-relative
  // path that resolves to nothing.
  referenceSourceImage: referenceSourceRecorded,
  service: { origin: serviceUrl, pythonVersion },
  browser: { engine: 'chromium', version: browserVersion, executable: browser || 'playwright-default', headless: true },
  nodeVersion: process.version,
  capture: { fullPage: false, mockUsed: false, viewports: widths, pages: PAGES.map((p) => p.key) },
  screenshots: shots,
};
writeFileSync(path.join(outDir, 'screenshot-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('CAP_DONE shots=' + shots.length + ' out=' + outDir);
