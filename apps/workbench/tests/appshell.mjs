// SPDX-License-Identifier: MIT
// AppShell regression tests for the 2026-09-22 UI convergence slice.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, '..', 'build', 'main.js');
const source = readFileSync(bundlePath, 'utf8');

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.classList = { add() {}, toggle() {} };
    this.hidden = false;
    this.value = '';
    this._text = '';
    this.attributes = new Map();
  }
  set textContent(value) {
    this._text = String(value ?? '');
    this.children = [];
  }
  get textContent() {
    return this._text + this.children.map((child) => child?.textContent ?? String(child)).join('');
  }
  get childNodes() { return this.children; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this._text = ''; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener() {}
  querySelectorAll(selector) {
    if (selector === '.app-nav-item') return this.children.filter((child) => child?.className === 'app-nav-item');
    return [];
  }
}

function makeContext() {
  const elements = new Map();
  const pending = [];
  const listeners = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, new MockElement());
    return elements.get(id);
  };
  const body = new MockElement('body');
  getElementById('login').hidden = false;
  getElementById('workspace').hidden = true;
  getElementById('connection').textContent = '未连接';
  const document = {
    body,
    getElementById,
    createElement: (tag) => new MockElement(tag),
  };
  const window = {
    location: { hash: '' },
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  const context = vm.createContext({
    document,
    window,
    Option: class Option extends MockElement {
      constructor(text, value) { super('option'); this.textContent = text; this.value = value; }
    },
    // `init` is recorded because block ⑧ has to see the METHOD and the BODY of a
    // submission: "one click, one request" is not proved by the path alone, and a rights
    // form that put the supersession link in the document instead of the query string would
    // still hit this exact path (the closed contract refuses that field, so it must not be
    // sent).
    fetch: (path, init) => new Promise((resolve, reject) => pending.push({
      path, init, resolve, reject,
    })),
  });
  vm.runInContext(source, context, { filename: 'build/main.js' });
  return { context, elements, pending, window, dispatchHashchange: () => listeners.get('hashchange')?.() };
}

function response(value, ok = true) {
  return { ok, json: async () => value };
}

async function flush() {
  for (let i = 0; i < 20; i += 1) await null;
}

const shell = makeContext();
shell.window.location.hash = '#/dashboard';
shell.dispatchHashchange();
shell.window.location.hash = '';
shell.dispatchHashchange();
if (shell.elements.get('login').hidden || !shell.elements.get('workspace').hidden)
  throw new Error('未连接时从 dashboard 返回 workbench 必须恢复登录并隐藏 workspace');

const firstToken = shell.context.document.getElementById('token');
firstToken.value = '1'.repeat(64);
const firstConnect = shell.elements.get('connect-form').onsubmit({ preventDefault() {} });
firstToken.value = '2'.repeat(64);
const secondConnect = shell.elements.get('connect-form').onsubmit({ preventDefault() {} });
const firstConnectRequest = shell.pending.shift();
const secondConnectRequest = shell.pending.shift();
secondConnectRequest.resolve(response({ error: 'UNAUTHORIZED' }, false));
await secondConnect;
firstConnectRequest.resolve(response({ projects: [] }));
await firstConnect;
await flush();
if (shell.elements.get('login').hidden || !shell.elements.get('workspace').hidden)
  throw new Error('过期连接成功不得覆盖较新的连接失败');

const token = shell.context.document.getElementById('token');
token.value = 'a'.repeat(64);
const connect = shell.elements.get('connect-form').onsubmit({ preventDefault() {} });
shell.pending.shift().resolve(response({ projects: [] }));
await connect;
await flush();

shell.window.location.hash = '#/dashboard';
shell.dispatchHashchange();
const activeDashboard = shell.context.document.body.children[0].children
  .find((child) => child?.dataset?.route === 'dashboard');
if (activeDashboard?.attributes.get('aria-current') !== 'page')
  throw new Error('当前路由必须通过 aria-current=page 暴露给辅助技术');
shell.window.location.hash = '#/settings';
shell.dispatchHashchange();
const dashboardRequests = shell.pending.splice(0, 4);
const settingsRequest = shell.pending.shift();
settingsRequest.resolve(response({
  status: 'OK', schemaVersion: 'v1', project_root: 'D:/project', project_local_root: '.project-local',
  write_trace: 'NONE', migration: 'NONE', agent_profile: { status: 'DISABLED' },
  roots: {}, shared_inputs: {},
}));
await flush();
shell.window.location.hash = '#/dashboard';
shell.dispatchHashchange();
if (!shell.elements.get('route-view').textContent.includes('正在读回当前视图'))
  throw new Error('切换到新 route 后必须立即显示 loading，而不是保留旧页面');
const latestDashboardRequests = shell.pending.splice(0, 4);
// Resolve the OLD (gen1) dashboard's four requests — the third of which is the
// environment readback — first. Their late success must be rejected by the
// generation guard, so the current loading state survives.
dashboardRequests[0].resolve(response({ status: 'OK', version: 'test', scope: 'local' }));
dashboardRequests[1].resolve(response({ projects: [] }));
dashboardRequests[2].resolve(response({ design_systems: [] }));
dashboardRequests[3].resolve(response({
  status: 'OK', schemaVersion: 'v1', project_root: 'D:/project', project_local_root: '.project-local',
  write_trace: 'NONE', migration: 'NONE', agent_profile: { status: 'DISABLED' },
  roots: {}, shared_inputs: {},
}));
await flush();
if (!shell.elements.get('route-view').textContent.includes('正在读回当前视图'))
  throw new Error('旧 dashboard success 不得覆盖新 dashboard 的 loading 状态');
// Now resolve the CURRENT (gen3) dashboard's requests so it commits.
latestDashboardRequests[0].resolve(response({ status: 'OK', version: 'test', scope: 'local' }));
latestDashboardRequests[1].resolve(response({ projects: [] }));
latestDashboardRequests[2].resolve(response({ design_systems: [] }));
latestDashboardRequests[3].resolve(response({
  status: 'OK', schemaVersion: 'v1', project_root: 'D:/project', project_local_root: '.project-local',
  write_trace: 'NONE', migration: 'NONE', agent_profile: { status: 'DISABLED' },
  roots: {}, shared_inputs: {},
}));
await flush();
if (!shell.elements.get('route-view').textContent.includes('仪表盘'))
  throw new Error('当前 dashboard 请求完成后必须提交当前视图');

// State ⑤ of the UI state matrix, both directions.
// (a) A 200 response that omits a collection must degrade visibly: the page still
//     renders, and it says the field was missing rather than showing 尚无项目 as if the
//     server had answered zero. Before the fix this threw at data.projects.length and
//     the top-level catch replaced the whole view with a TypeError message.
shell.window.location.hash = '#/projects';
shell.dispatchHashchange();
const malformedProjects = shell.pending.shift();
malformedProjects.resolve(response({}));
await flush();
const malformedText = shell.elements.get('route-view').textContent;
if (!malformedText.includes('未读回：响应缺少 projects'))
  throw new Error('响应缺少集合时必须说明未读回，而不是渲染成"尚无项目"');
if (malformedText.includes('视图读回失败'))
  throw new Error('缺少一个集合不得让整页读回失败');

// (b) A well-formed response must NOT carry the notice — otherwise the guard is just
//     noise and the (a) assertion proves nothing.
shell.window.location.hash = '#/dashboard';
shell.dispatchHashchange();
shell.pending.splice(0, 4);   // the dashboard's own reads, left unresolved on purpose
shell.window.location.hash = '#/projects';
shell.dispatchHashchange();
const goodProjects = shell.pending.shift();
goodProjects.resolve(response({ projects: [{ id: 'p1', name: 'Alpha' }] }));
await flush();
const goodText = shell.elements.get('route-view').textContent;
if (goodText.includes('未读回：响应缺少'))
  throw new Error('形状完整的响应不得出现形状告警');
if (!goodText.includes('Alpha'))
  throw new Error('形状完整的响应必须照常渲染');

// ⑤ SWEEP over every routable view, in both directions, driven from the route table
// itself (shape-notice-coverage.mjs proves each binding is REPORTED; this proves the
// report REACHES THE SCREEN). A view that reads through the seam and gets a 200 with a
// collection missing must render 未读回：响应缺少 …; a view that reads nothing is allowed
// to say nothing, but a mass of "reads nothing" is a rollout regression, so the count
// has a floor.
const shellSource = readFileSync(join(here, '..', 'shell.ts'), 'utf8');
const tableStart = shellSource.indexOf('export const ROUTE_VIEWS');
const tableEnd = shellSource.indexOf('export type RouteView');
if (tableStart < 0 || tableEnd < tableStart)
  throw new Error('ROUTE_VIEWS 表定位失败 —— 路由扫描失去覆盖面');
const routeHashes = [...shellSource.slice(tableStart, tableEnd)
  .matchAll(/hash: '(#[^']*)'/g)].map((m) => m[1]);
if (routeHashes.length < 10)
  throw new Error(`只从 ROUTE_VIEWS 提取到 ${routeHashes.length} 个 hash —— 提取式已失效，不要相信本扫描的覆盖面`);

let noticeViews = 0;
const silentViews = [];
for (const hash of routeHashes) {
  shell.window.location.hash = hash;
  shell.dispatchHashchange();
  // Drain until the route goes quiet, not just the first batch: a view that CHAINS its
  // reads (预检 / QA reads /projects for the jury panel, then again for the rights panel)
  // creates the second request only after the first one resolves. Splicing once would
  // leave that request unresolved forever, the router would never commit the view, and this
  // sweep would then be measuring the previous route's DOM -- a green gate about nothing.
  const requests = [];
  for (let round = 0; round < 8; round += 1) {
    const fresh = shell.pending.splice(0, shell.pending.length);
    if (!fresh.length) break;
    requests.push(...fresh);
    for (const request of fresh) request.resolve(response({}));
    await flush();
  }
  if (!requests.length) { silentViews.push(hash); continue; }
  const text = shell.elements.get('route-view').textContent;
  if (text.includes('视图读回失败'))
    throw new Error(`${hash}: 缺少集合把整页压成了读回失败（${text.slice(0, 120)}）`);
  if (!text.includes('未读回：响应缺少'))
    throw new Error(`${hash}: 发起 ${requests.length} 次 seam 读回却没有说明缺少哪个字段`);
  noticeViews += 1;
}
if (noticeViews < 8)
  throw new Error(`只有 ${noticeViews} 个视图报告了缺失形状（下限 8）—— ⑤ 的铺开出现了回归`);
console.log(`ok: ⑤ 形状告警渲染在 ${noticeViews} 个视图上；${silentViews.length} 个路由不读服务：${silentViews.join(' ')}`);

// ⑤ TARGETED, #/domains. The sweep above proves a notice can reach a screen; it cannot
// prove this particular page asks for anything. `#/domains` was the route with no backend
// at all — listed, reachable, reading nothing while the repository held the packs and the
// checker. So this pins the three things that made the gap a gap:
//   1. the view makes exactly one read, of /api/domains (a page that reads nothing, or
//      reads somewhere else, is the old defect back);
//   2. a 200 that omits `packs` is reported as 未读回 and never rendered as "the project
//      has no packs" — the lie an empty <ul> tells;
//   3. a real payload renders real rows: the rejected pack's own checker reason is on
//      screen, and the verdict word is marked lang="en" (service vocabulary, WCAG 3.1.2).
shell.window.location.hash = '#/domains';
shell.dispatchHashchange();
const domainsReads = shell.pending.splice(0, shell.pending.length);
if (domainsReads.length !== 1)
  throw new Error(`#/domains 读回了 ${domainsReads.length} 次，应为恰好 1 次 GET /api/domains`);
if (domainsReads[0].path !== '/api/domains')
  throw new Error(`#/domains 打到了 ${domainsReads[0].path}，不是 /api/domains`);
domainsReads[0].resolve(response({}));
await flush();
const domainsShapeText = shell.elements.get('route-view').textContent;
// The notice lists every refilled field in template order, so `packs` is asserted to be
// NAMED by it rather than assumed to be first.
if (!/未读回：响应缺少[^；]*\bpacks\b/.test(domainsShapeText))
  throw new Error(`域包集合缺失时必须点名 packs：…${domainsShapeText.slice(-300)}`);
if (domainsShapeText.includes('尚无域包目录'))
  throw new Error('响应没有给出 packs 时，页面不得声称尚无域包目录');
if (domainsShapeText.includes('视图读回失败'))
  throw new Error('缺少 packs 不得把整页压成读回失败');

const DOMAINS_READBACK = {
  schemaVersion: 'design-lab/domain-pack-readback/v1',
  meaning: 'Read-only projection of the committed Domain Pack directories.',
  unmeasuredMeans: 'null = the manifest does not declare that field.',
  root: 'design-lab/domain-packs', rootState: 'PRESENT',
  validationVocabulary: ['VALIDATES', 'INVALID', 'UNREADABLE', 'NOT_CHECKED'],
  checker: { path: 'design-lab/scripts/verify_domain_pack_v2.py', state: 'LOADED', note: null },
  sources: { packRoot: 'design-lab/domain-packs' },
  counts: { packs: 2, byValidation: { VALIDATES: 1, INVALID: 1, UNREADABLE: 0, NOT_CHECKED: 0 } },
  packs: [
    { directory: 'uiux-design', packId: 'uiux-design', version: '0.1.0',
      displayName: 'UI/UX Design Domain Pack', domain: 'ui-ux',
      manifestSchemaVersion: 'design-lab/domain-pack/v2', dependencies: ['jsonschema'],
      validation: 'VALIDATES', validationErrors: [], validationErrorCount: 0, note: null },
    { directory: 'minigame-design', packId: 'minigame-design', version: '0.1.0',
      displayName: 'MINIGAME Design Domain Pack', domain: null,
      manifestSchemaVersion: 'workflow/domain-pack/v1', dependencies: null,
      validation: 'INVALID',
      validationErrors: ["schema validation failed: 'domain' is a required property"],
      validationErrorCount: 11, note: null },
  ],
};
shell.window.location.hash = '#/domains';
shell.dispatchHashchange();
const domainsGood = shell.pending.splice(0, shell.pending.length);
domainsGood[0].resolve(response(DOMAINS_READBACK));
await flush();
const domainsGoodText = shell.elements.get('route-view').textContent;
if (domainsGoodText.includes('未读回：响应缺少'))
  throw new Error('形状完整的域包读回不得出现形状告警');
if (!domainsGoodText.includes('域包登记（2）'))
  throw new Error(`域包数量必须由读回给出：${domainsGoodText.slice(0, 200)}`);
if (!domainsGoodText.includes('ui-ux') || !domainsGoodText.includes('jsonschema'))
  throw new Error('域包身份 / 领域 / 依赖没有上屏');
if (!domainsGoodText.includes("'domain' is a required property"))
  throw new Error('被拒绝的域包必须带着校验器的原因上屏，而不是只留一个数字');
if (!domainsGoodText.includes('校验器共 11 条'))
  throw new Error('原因被截断时必须注明校验器实际给出了多少条');
if (domainsGoodText.includes('13'))
  throw new Error(`页面又带上了没有出处的数字：${domainsGoodText.slice(0, 240)}`);
const englishVerdicts = [];
(function walkMarked(node) {
  if (node?.attributes?.get('lang') === 'en') englishVerdicts.push(node.textContent);
  for (const child of (node?.children ?? [])) walkMarked(child);
})(shell.elements.get('route-view'));
for (const state of ['VALIDATES', 'INVALID'])
  if (!englishVerdicts.includes(state))
    throw new Error(`判定 ${state} 必须带 lang="en" 标记（服务词汇，不翻译）：${englishVerdicts.join('/')}`);

// The reverse direction of the same sentence: a service that really answers an empty
// catalog may be described as empty. Without this the 尚无 wording above could be earned
// by a page that never renders rows at all.
shell.window.location.hash = '#/domains';
shell.dispatchHashchange();
const domainsEmpty = shell.pending.splice(0, shell.pending.length);
domainsEmpty[0].resolve(response({ ...DOMAINS_READBACK,
  counts: { packs: 0, byValidation: {} }, packs: [] }));
await flush();
const domainsEmptyText = shell.elements.get('route-view').textContent;
if (!domainsEmptyText.includes('尚无域包目录'))
  throw new Error('服务真的答了空目录时，页面必须照实说尚无域包目录');
// Asserted as the three notice SHAPES rather than the bare word: the page's own
// explanatory line names 未声明 / 未读回 as the two different things it distinguishes, and
// a substring check on the word alone would convict the explanation for the lie.
for (const notice of ['未读回：响应缺少', '未读回：未连接', '未读回判定基础'])
  if (domainsEmptyText.includes(notice))
    throw new Error(`一次形状完整的空读回不得出现 ${notice}：…${domainsEmptyText.slice(-300)}`);
console.log('ok: ⑤ #/domains 读一个路由、缺 packs 说未读回、真实读回上屏带 lang="en" 与原因、空目录照实说尚无');

// ①/④ OFFLINE sweep. A second context that never connects: devMode() reads
// window.location.search, so '?dev=1' is what lets the seam answer with its honest empty
// payload. Those payloads are marked, and an empty that was never asked about must not be
// described with the wording reserved for a readback that really returned nothing.
const LIVE_ONLY_PHRASES = [
  '尚无项目。先在工作台新建项目，再读回此视图。',   // project picker
  '尚无项目 在工作台新建项目后出现。',              // projects table cell
  '尚无登记设计系统',                              // brand systems
  '尚无根登记', '尚无外置输入',                    // settings
  '尚无宿主任务',                                  // creative tools
  '尚无交付包',                                    // dashboard + deliverables
  '尚无任务 任务完成后交付包随读回导出。',          // deliverables tasks cell
  '尚无域包目录',                                  // design domains
];

const offline = makeContext();
offline.window.location.search = '?dev=1';
let offlineChecked = 0;
for (const hash of ['', ...routeHashes]) {
  offline.window.location.hash = hash;
  offline.dispatchHashchange();
  await flush();
  // The empty hash is the legacy workbench, which owns #workspace; every route view
  // renders into #route-view. Asking the wrong host would read an element that was
  // never built rather than the page that is actually on screen.
  const host = hash ? 'route-view' : 'workspace';
  const text = offline.elements.get(host)?.textContent ?? '';
  const leaked = LIVE_ONLY_PHRASES.filter((phrase) => text.includes(phrase));
  if (leaked.length)
    throw new Error(`未连接时 ${hash || '(workbench)'} 把没问过的事说成了实况：${leaked.join(' / ')}`);
  if (text.includes('未读回：未连接本机设计服务')) offlineChecked += 1;
}
if (offlineChecked < 5)
  throw new Error(`未连接态只有 ${offlineChecked} 个视图声明了未读回（下限 5）—— 空态措辞的门失效了`);
console.log(`ok: ① 未连接态 ${offlineChecked} 个视图报告未读回，${LIVE_ONLY_PHRASES.length} 条实况专属措辞零泄漏`);

// Positive control for the same switch: connected, with a service that really answers an
// empty collection, the page MUST claim the ledger is empty. Without this half the offline
// assertions above would be satisfied by deleting every empty-state sentence.
shell.window.location.hash = '#/projects';
shell.dispatchHashchange();
const emptyProjects = shell.pending.shift();
emptyProjects.resolve(response({ projects: [] }));
await flush();
const liveEmptyText = shell.elements.get('route-view').textContent;
if (!liveEmptyText.includes('尚无项目 在工作台新建项目后出现。'))
  throw new Error(`服务真的答了空台账时，必须照实说尚无项目；实际读到：${liveEmptyText.slice(0, 240)}`);
if (liveEmptyText.includes('未读回'))
  throw new Error('一次形状完整的空读回不得出现任何未读回措辞');

shell.window.location.hash = '#/brand-systems';
shell.dispatchHashchange();
const emptySystems = shell.pending.shift();
emptySystems.resolve(response({ design_systems: [] }));
await flush();
const liveSystemsText = shell.elements.get('route-view').textContent;
if (!liveSystemsText.includes('尚无登记设计系统'))
  throw new Error('设计系统读回为空时页面必须说明为空');
console.log('ok: ④ 真实空读回仍照实报告为空（两个视图正向对照）');

// ② REQUEST FAILED, swept over every route. A connected session whose read comes back
// refused is the state most likely to lie by silence: the previous route's numbers could
// stay on screen and read as current. Measured behaviour being pinned here -- every route
// that asked the service shows ONLY the failure and its reason, and a route that never
// asks must not claim a failure it did not have.
let failedChecked = 0;
let sawTransport = false;
let sawUnparsable = false;
let sawServiceError = false;
for (const hash of routeHashes) {
  shell.window.location.hash = hash;
  shell.dispatchHashchange();
  const requests = shell.pending.splice(0, shell.pending.length);
  // Three different failures, cycled per route. They travel different code paths and the
  // operator needs a different next action from each: the request never reached the
  // service; the service answered with something that is not JSON; the service answered
  // with an error envelope. Cycling (rather than mixing inside one route) is required
  // because a view fires several reads together and the first rejection wins the catch.
  const kind = routeHashes.indexOf(hash) % 3;
  for (const request of requests) {
    if (kind === 0) request.reject(new Error('ECONNREFUSED 127.0.0.1'));
    else if (kind === 1) request.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } });
    else request.resolve(response({ error: 'SERVICE_UNAVAILABLE' }, false));
  }
  await flush();
  const text = (shell.elements.get('route-view').textContent ?? '').trim();
  if (!requests.length) {
    if (text.includes('视图读回失败'))
      throw new Error(`${hash}: 这一面没有发起任何读回，却报告读回失败`);
    continue;
  }
  if (!text.startsWith('视图读回失败'))
    throw new Error(`${hash}: 读回被拒绝后页面没有以失败开头，旧内容可能留在屏上：${text.slice(0, 160)}`);
  if (!text.replace('视图读回失败：', '').trim())
    throw new Error(`${hash}: 只说失败、没有说原因`);
  if (!/无法连接本机设计服务|服务回复无法解析|SERVICE_UNAVAILABLE/.test(text))
    throw new Error(`${hash}: 失败原因里没有可诊断的信息：${text.slice(0, 160)}`);
  if (kind === 0) {
    if (!text.includes('无法连接本机设计服务') || !text.includes('ECONNREFUSED'))
      throw new Error(`${hash}: 连不上服务时既要说出"连不上"，也要保留底层原因：${text.slice(0, 160)}`);
    sawTransport = true;
  } else if (kind === 1) {
    if (!text.includes('服务回复无法解析') || !text.includes('HTTP 200'))
      throw new Error(`${hash}: 回复不是 JSON 时应说明无法解析与状态码：${text.slice(0, 160)}`);
    sawUnparsable = true;
  } else {
    if (!text.includes('SERVICE_UNAVAILABLE'))
      throw new Error(`${hash}: 服务错误码应原样上屏：${text.slice(0, 160)}`);
    sawServiceError = true;
  }
  if (text.includes('未读回：未连接'))
    throw new Error(`${hash}: 已连接但请求被拒，不是未连接，两种状态不得混用`);
  const leaked = LIVE_ONLY_PHRASES.filter((phrase) => text.includes(phrase));
  if (leaked.length)
    throw new Error(`${hash}: 失败页仍带着成功读回才有的措辞：${leaked.join(' / ')}`);
  failedChecked += 1;
}
if (failedChecked < 8)
  throw new Error(`② 失败态只有 ${failedChecked} 个视图被验证（下限 8）—— 该列的门失效了`);
// A single-request route can only ever show the transport path, so "both paths measured"
// has to be counted rather than asserted by intent.
if (!sawTransport || !sawServiceError || !sawUnparsable)
  throw new Error(`② 三种失败只测到 ${[
    sawTransport && '传输被拒', sawUnparsable && '回复不可解析', sawServiceError && '服务错误',
  ].filter(Boolean).join(' + ') || '无'}，另一种没有任何视图走过`);
console.log(`ok: ② 请求失败时 ${failedChecked} 个视图只报失败与原因（传输被拒 + 回复不可解析 + 服务错误三条路径都实测到），无旧内容残留`);

// ⑥ 产物预检 column, driven from a real click on the real bundle. The static contract
// (design-lab/tests/test_artifact_preflight_ui_contract.py) proves the page declares the
// profiles the route accepts and paints the fields the service sends; that is a text
// check and cannot see behaviour. This block proves: nothing is asked of the service
// while the page is being built, one click makes exactly one request to that bundle's
// own route, the readback carries the criterion behind each verdict, and a refusal
// replaces the previous verdict rather than decorating it.
function findIn(node, predicate) {
  if (node && predicate(node)) return node;
  for (const child of (node && node.children ? node.children : [])) {
    const hit = findIn(child, predicate);
    if (hit) return hit;
  }
  return null;
}
const byElementId = (root, id) => findIn(root, (node) => Boolean(node && node.attributes
  && typeof node.attributes.get === 'function' && node.attributes.get('id') === id));

const BUNDLE_ID = 'bundle-native-' + '0123456789abcdef'.repeat(4);
const BUNDLE_ROW = { id: BUNDLE_ID, kind: 'design-bundle', version_id: 'v-1', version_no: 1,
  byte_size: 2048, sha256: 'sha256:' + 'a'.repeat(64),
  rights: 'NOT_REVIEWED', verification: 'METADATA_ONLY' };
const TASK_ROW = (cancel) => ({ kind: 'photoshop-native', state: 'SUCCEEDED', job_id: 'job-1',
  cancel, attempt: { attempt_id: 'att-1', attempt_no: 1, state: 'RECEIPTED',
                     started_at: 'now', ended_at: 'now' } });
const resolveDeliverables = (requests, tasks) => {
  for (const request of requests)
    request.resolve(response(request.path.endsWith('/bundles') ? { bundles: [BUNDLE_ROW] }
      : { tasks }));
};
const PREFLIGHT_READBACK = {
  schemaVersion: 'design-lab/artifact-preflight/v1', profile: 'print',
  profileSchema: 'design-lab/preflight-profile/v1', verdict: 'INCOMPLETE',
  artifacts: [],
  findings: [
    { id: 'missing-links', severity: 'blocker', outcome: 'NOT_MEASURED',
      detail: '本构建没有该检查的测量器', criterion: '链接必须随包存在且摘要相符', measured: {} },
    { id: 'color-mode', severity: 'high', outcome: 'PASS',
      detail: '色彩模式 CMYK', criterion: '印刷交付应为 CMYK（ISO 12647 语境）', measured: {} },
  ],
  counts: { PASS: 1, WARNING: 0, FAIL: 0, NOT_MEASURED: 1, NOT_APPLICABLE: 0 },
  meaning: 'PASS 要求每条适用检查都被真量过且通过。',
};

shell.window.location.hash = '#/deliverables';
shell.dispatchHashchange();
const deliverableProjects = shell.pending.shift();
deliverableProjects.resolve(response({ projects: [{ id: 'p1', name: 'Alpha' }] }));
await flush();
const routeView = shell.elements.get('route-view');
const projectSelect = byElementId(routeView, '交付中心-project');
if (!projectSelect) throw new Error('交付中心没有渲染项目选择器，⑥ 找不到入口');
// A real <select> defaults to its first option; the mock has no selection model, so the
// pick is applied the way the browser would apply it and the change handler runs.
projectSelect.value = 'p1';
projectSelect.onchange();
const built = shell.pending.splice(0, shell.pending.length);
for (const request of built)
  if (request.path.includes('/preflight'))
    throw new Error(`构建交付中心时就在预检 ${request.path} —— 没有人选过交付包，结论只能是猜测`);
resolveDeliverables(built, [TASK_ROW({ requested: true, acknowledged: false })]);
await flush();
// Reads that start after the awaited join still happen without a click, so the stray
// check has to run once the page has settled -- not only at the splice above.
const stray = shell.pending.splice(0, shell.pending.length);
if (stray.length)
  throw new Error(`没有人点击，页面却发出了 ${stray.map((r) => r.path).join(' ')} —— `
    + '预检结论不能来自一次没人请求的读取');

const runButton = byElementId(routeView, 'bundle-preflight-run');
if (!runButton) throw new Error('交付包读回后没有出现预检按钮');
if (runButton.disabled) throw new Error('有交付登记时预检按钮不得是禁用的');
const bundleSelect = byElementId(routeView, 'bundle-preflight-target');
const profileSelect = byElementId(routeView, 'bundle-preflight-profile');
if (!bundleSelect || !profileSelect) throw new Error('预检缺少交付包或 profile 选择器');
const outcomeHost = byElementId(routeView, 'bundle-preflight-outcome');
if (!outcomeHost) throw new Error('预检读回区不可定位 —— 它没有把结论挂在屏上的稳定位置');
bundleSelect.value = BUNDLE_ID;
profileSelect.value = 'print';
if (outcomeHost.textContent.includes('INCOMPLETE'))
  throw new Error('预检结论在没有点击之前就出现在屏幕上');

runButton.onclick();
const first = shell.pending.splice(0, shell.pending.length);
if (first.length !== 1) throw new Error(`一次点击发出了 ${first.length} 个请求，应为 1 个`);
if (first[0].path !== `/api/projects/p1/bundles/${BUNDLE_ID}/preflight?profile=print`)
  throw new Error(`点击预检打到了 ${first[0].path} —— 必须是所选交付包自己的路由`);
first[0].resolve(response(PREFLIGHT_READBACK));
await flush();
const outcomeText = outcomeHost.textContent;
for (const must of ['INCOMPLETE', 'missing-links', 'NOT_MEASURED', '未量 1 项 / 共 2 项',
                    '判据：印刷交付应为 CMYK（ISO 12647 语境）',
                    'PASS 要求每条适用检查都被真量过且通过。'])
  if (!outcomeText.includes(must))
    throw new Error(`预检读回缺少 ${must}：${outcomeText.slice(0, 200)}`);

// The refusal half: a rejected preflight must not leave the previous verdict standing.
bundleSelect.value = BUNDLE_ID;
runButton.onclick();
const second = shell.pending.splice(0, shell.pending.length);
if (second.length !== 1) throw new Error(`第二次点击发出了 ${second.length} 个请求`);
second[0].resolve(response({ error: '归档摘要与登记的字节不一致' }, false));
await flush();
const refused = outcomeHost.textContent;
if (!refused.includes('预检未确认') || !refused.includes('归档摘要与登记的字节不一致'))
  throw new Error(`预检被拒时页面没有说出拒绝原因：${refused.slice(0, 200)}`);
if (refused.includes('INCOMPLETE'))
  throw new Error('拒绝后上一条判定仍留在屏上，等于把失败的请求算成了一个结论');

// The cancel flags, on the same page. An attempt that receipted after the operator asked
// it to stop is a different outcome from an uncontested completion, and the state word
// alone cannot show it.
if (!routeView.textContent.includes('取消未确认'))
  throw new Error('取消未被确认却交付了结果时页面必须说出来，只写 RECEIPTED 会把被拒绝的操作说成被接受');
projectSelect.onchange();
const quiet = shell.pending.splice(0, shell.pending.length);
resolveDeliverables(quiet, [TASK_ROW({ requested: false, acknowledged: false })]);
await flush();
if (routeView.textContent.includes('取消未确认'))
  throw new Error('没有人请求取消时，页面不得说取消未确认');

console.log('ok: ⑥ 产物预检列不自动跑、一次点击一个请求、判据与未量项上屏、拒绝替换旧判定、未确认的取消上屏');

// ⑦ 证据系统 now reads back the operator records that already had working backends:
// the Human Jury verdicts (GET /jury), the artifact preflight of a chosen bundle and the
// delivery receipt of that bundle's version (GET .../receipt). Block ⑥ proved the same
// shape for the 交付中心 column; what is new here is (a) a route read that must
// distinguish "no receipt was recorded" from "these bytes will not be certified", and
// (b) a jury column that must not turn an unread readback into an empty list.
const EVIDENCE_VERSION_ID = 'v-' + '0123456789abcdef'.repeat(2);
const EVIDENCE_BUNDLE = { ...BUNDLE_ROW, version_id: EVIDENCE_VERSION_ID };
const JURY_SUBJECT = `version:${EVIDENCE_VERSION_ID}`;
const JURY_READBACK = {
  schemaVersion: 'design-lab/jury-readback/v1',
  records: [], verdict_count: 1, proposal_count: 2,
  current_verdicts: { [JURY_SUBJECT]: {
    verdict: 'APPROVE', kind: 'JURY_VERDICT',
    juror: { juror_id: 'dtalex66', kind: 'HUMAN', attestation: '在 100% 缩放下对照参考图审读' } } },
  reviewable_versions: [{ subject_ref: JURY_SUBJECT, artifact_sha256: 'sha256:' + 'a'.repeat(64),
                          asset_id: 'a1', version_no: 1 }],
  human_acceptance: 'ACCEPTED',
  // The denominator jury_review.py publishes with the word; the page has to show it.
  accepted_versions: 1, reviewable_active_versions: 1,
};
// The rights readback as `rights_review.readback()` shapes it: every collection the seam
// can report missing is here, the counts are numbers, and the clearance word is the one
// these rows actually support. Block ⑦ passes it so the jury assertions measure the jury;
// block ⑧ mutates it.
const RIGHTS_SCOPE_A = 'font-brandon-grotesk';
const RIGHTS_SCOPE_B = 'client-photo-01';
const RIGHTS_DECISION_A = 'rights-' + 'a'.repeat(32);
const RIGHTS_DECISION_B = 'rights-' + 'b'.repeat(32);
const RIGHTS_READBACK = {
  schemaVersion: 'design-lab/rights-readback/v1', project_id: 'p1',
  decisions: [], decision_count: 2,
  // The rows are `document_json` as rights_review.py returns it: the contract's own closed
  // property set, and nothing else. No actor_kind, no supersedes -- those are store columns
  // that never cross the HTTP boundary, which is exactly why name_checked_only exists.
  current_decisions: {
    [RIGHTS_SCOPE_A]: { decision_id: RIGHTS_DECISION_A,
      schemaVersion: 'design-lab/rights-decision/v1', use_scope: RIGHTS_SCOPE_A,
      decision: 'APPROVED', decided_by: 'dtalex66', decided_at: '2026-10-08T09:00:00Z',
      license_ref: 'LICENSE:OFL.txt', note: '对照 SIL OFL 1.1 全文确认桌面授权',
      territory: 'worldwide' },
    [RIGHTS_SCOPE_B]: { decision_id: RIGHTS_DECISION_B,
      schemaVersion: 'design-lab/rights-decision/v1', use_scope: RIGHTS_SCOPE_B,
      decision: 'DENIED', decided_by: 'dtalex66', decided_at: '2026-10-08T09:05:00Z' },
  },
  decision_states: { APPROVED: 1, DENIED: 1, PENDING_REVIEW: 0, BLOCKED_BY_LICENSE: 0 },
  filed_scope_count: 2, approved_scope_count: 1,
  unapproved_scopes: [{ use_scope: RIGHTS_SCOPE_B, decision: 'DENIED',
                        decision_id: RIGHTS_DECISION_B, decided_by: 'dtalex66' }],
  ever_filed_scopes: [RIGHTS_SCOPE_A, RIGHTS_SCOPE_B],
  scope_conflicts: [], name_checked_only: [RIGHTS_SCOPE_A, RIGHTS_SCOPE_B],
  rights_clearance: 'NOT_REVIEWED',
  clearance_vocabulary: ['CLEARED', 'NOT_REVIEWED'],
  decision_vocabulary: ['APPROVED', 'DENIED', 'PENDING_REVIEW', 'BLOCKED_BY_LICENSE'],
  does_not_prove: ['CLEARED covers the use scopes this project has actually filed a '
    + 'decision for; it holds no requirements list',
    'a rights decision clears none of the quality, production or release gates'],
};
const RECEIPT_READBACK = {
  schemaVersion: 'design-lab/delivery-receipt/v2',
  job_id: 'native-job-' + '1'.repeat(64),
  created_at: '2026-10-08T09:00:00+00:00',
  axes: { delivery: 'PARTIAL' },
  receipt_id: 'receipt-' + 'a'.repeat(16),
  receipt_sha256: 'sha256:' + 'b'.repeat(64),
  deliverables: [
    { deliverable_id: 'native.psd', artifact_sha256: 'sha256:' + 'c'.repeat(64), byte_size: 4096,
      editable: true, host_readback: null, readback_matches_artifact: null,
      requirements: [{ req_id: 'req-rights-review', status: 'NOT_RUN' },
                     { req_id: 'req-native-bytes-verified', status: 'PASS' }],
      rollback: { backup_ref: 'asset:native-' + 'e'.repeat(64), procedure: 'drop the appended version' } },
    { deliverable_id: 'preview.png', artifact_sha256: 'sha256:' + 'f'.repeat(64), byte_size: 1024,
      editable: false, host_readback: null, readback_matches_artifact: null,
      requirements: [{ req_id: 'req-rights-review', status: 'NOT_RUN' }],
      rollback: { backup_ref: 'asset:native-' + 'e'.repeat(64), procedure: 'drop the appended version' } },
  ],
};
const DESIGN_LAYER_EMPTY = { design_layer: { briefs: [], directions: [], chosen_direction: null,
  bindings: [], active_binding: null, design_systems: [] } };

function collectMarked(node, out = []) {
  if (node?.attributes?.get('lang') === 'en') out.push(node.textContent);
  for (const child of (node?.children ?? [])) collectMarked(child, out);
  return out;
}

shell.window.location.hash = '#/evidence';
shell.dispatchHashchange();
const evidencePickerRequest = shell.pending.splice(0, shell.pending.length);
if (evidencePickerRequest.length !== 1)
  throw new Error(`#/evidence 打开时发出了 ${evidencePickerRequest.length} 个请求，应只有项目台账`);
evidencePickerRequest[0].resolve(response({ projects: [{ id: 'p1', name: 'Alpha' }] }));
await flush();
const evidenceView = shell.elements.get('route-view');
const evidenceSelect = byElementId(evidenceView, '证据系统-project');
if (!evidenceSelect) throw new Error('证据系统没有渲染项目选择器，⑦ 找不到入口');
evidenceSelect.value = 'p1';
evidenceSelect.onchange();
const evidenceBuild = shell.pending.splice(0, shell.pending.length);
const evidencePaths = evidenceBuild.map((request) => request.path);
for (const forbidden of ['/preflight', '/receipt'])
  if (evidencePaths.some((path) => path.includes(forbidden)))
    throw new Error(`构建证据页时就在运行交付结论 ${forbidden} —— 没有人选中交付包`);
const expects = ['/api/projects/p1/design-layer', '/api/projects/p1/bundles',
                 '/api/projects/p1/jury', '/api/projects/p1/rights'];
for (const expected of expects)
  if (!evidencePaths.includes(expected))
    throw new Error(`证据系统没有读回 ${expected}；实际读到 ${evidencePaths.join(' ')}`);
const answerEvidence = (requests, jury, bundles, rights) => {
  for (const request of requests) {
    if (request.path.endsWith('/jury')) request.resolve(response(jury));
    else if (request.path.endsWith('/bundles')) request.resolve(response(bundles));
    else if (request.path.endsWith('/rights')) request.resolve(response(rights ?? {}));
    else request.resolve(response(DESIGN_LAYER_EMPTY));
  }
};
// (a) A jury readback that never carried the collection must be reported as unread, and
// must NOT be shown as "there are no verdicts" -- the lie an empty <ul> tells.
answerEvidence(evidenceBuild, {}, { bundles: [EVIDENCE_BUNDLE] }, RIGHTS_READBACK);
await flush();
const unreadJuryText = evidenceView.textContent;
if (!/未读回[^\n]*current_verdicts|裁决未读回/.test(unreadJuryText))
  throw new Error(`jury 字段缺失时页面必须说未读回：…${unreadJuryText.slice(0, 260)}`);
if (unreadJuryText.includes('尚无人签署的裁决'))
  throw new Error('响应没有给出 current_verdicts 时，页面不得声称尚无人签署的裁决');
if (unreadJuryText.includes('视图读回失败'))
  throw new Error('缺少一个集合不得把整页压成读回失败');

// (b) A real verdict comes up with the service's own words, and the long ids stay on
// their own .value-mono rows.
shell.pending.splice(0, shell.pending.length);
evidenceSelect.onchange();
const juryReads = shell.pending.splice(0, shell.pending.length);
answerEvidence(juryReads, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, RIGHTS_READBACK);
await flush();
const juryText = evidenceView.textContent;
for (const must of ['APPROVE', JURY_SUBJECT, '在 100% 缩放下对照参考图审读',
                    '已签署 1 · Agent 建议 2', 'ACCEPTED', '当前版本已接受 1/1'])
  if (!juryText.includes(must))
    throw new Error(`人工裁决读回缺少 ${must}：${juryText.slice(0, 240)}`);
if (juryText.includes('尚无人签署的裁决'))
  throw new Error('有裁决可读回时页面仍说无人签署');
if (juryText.includes('未读回：响应缺少'))
  throw new Error('形状完整的裁决读回不得出现形状告警');
const juryMarked = collectMarked(evidenceView);
for (const word of ['ACCEPTED', 'JURY_VERDICT'])
  if (!juryMarked.includes(word))
    throw new Error(`判定 ${word} 必须带 lang="en"（服务词汇，不翻译）：${juryMarked.join('/')}`);

// (b2) A readback that carries no denominator must not have one invented for it.
// 0/0 would read as "nothing was left to accept" -- a claim about the ledger that the
// response never made, and exactly the shape this page has been caught on before.
shell.pending.splice(0, shell.pending.length);
evidenceSelect.onchange();
const bareReads = shell.pending.splice(0, shell.pending.length);
answerEvidence(bareReads, { ...JURY_READBACK,
                            accepted_versions: undefined,
                            reviewable_active_versions: undefined },
               { bundles: [EVIDENCE_BUNDLE] }, RIGHTS_READBACK);
await flush();
const bareText = evidenceView.textContent;
if (!bareText.includes('当前版本已接受 未读回'))
  throw new Error(`缺少分母时应说未读回：${bareText.slice(0, 240)}`);
if (bareText.includes('0/0'))
  throw new Error('页面把一个没读回的分数写成了 0/0');

// (c) The receipt: one click, one request to the selected version's own route.
const receiptButton = byElementId(evidenceView, 'evidence-receipt-run');
const preflightButton = byElementId(evidenceView, 'evidence-preflight-run');
const receiptBox = byElementId(evidenceView, 'evidence-receipt-outcome');
const preflightBox = byElementId(evidenceView, 'evidence-preflight-outcome');
const bundlePicker = byElementId(evidenceView, 'evidence-delivery-target');
const profilePicker = byElementId(evidenceView, 'evidence-delivery-profile');
if (!receiptButton || !receiptBox) throw new Error('证据系统没有交付收据的入口或读回框');
if (receiptButton.disabled || preflightButton.disabled)
  throw new Error('有交付登记时两个读回按钮都不得是禁用的');
if (receiptBox.textContent.includes('PARTIAL'))
  throw new Error('收据结论在没有点击之前就出现在屏幕上');
bundlePicker.value = EVIDENCE_BUNDLE.id;
profilePicker.value = 'print';
receiptButton.onclick();
const receiptRequests = shell.pending.splice(0, shell.pending.length);
if (receiptRequests.length !== 1)
  throw new Error(`一次收据点击发出了 ${receiptRequests.length} 个请求，应为 1 个`);
if (receiptRequests[0].path
  !== `/api/projects/p1/bundles/${EVIDENCE_BUNDLE.id}/versions/${EVIDENCE_VERSION_ID}/receipt`)
  throw new Error(`收据打到了 ${receiptRequests[0].path} —— 必须是所选版本自己的路由`);
receiptRequests[0].resolve(response(RECEIPT_READBACK));
await flush();
const receiptText = receiptBox.textContent;
for (const must of ['PARTIAL', 'native.psd', 'preview.png', 'sha256:' + 'c'.repeat(64),
                    'req-rights-review', 'NOT_RUN', '无宿主读回记录',
                    `回滚参照：${RECEIPT_READBACK.deliverables[0].rollback.backup_ref}`])
  if (!receiptText.includes(must))
    throw new Error(`交付收据读回缺少 ${must}：${receiptText.slice(0, 220)}`);
if (receiptText.includes('轴值未读回'))
  throw new Error('文档给出了 axes.delivery，页面不得说轴值未读回');
const receiptMarked = collectMarked(receiptBox);
for (const word of ['PARTIAL', 'NOT_RUN'])
  if (!receiptMarked.includes(word))
    throw new Error(`收据状态词 ${word} 必须带 lang="en"：${receiptMarked.join('/')}`);

// (d) The two refusals are two different sentences. 404 says nothing was recorded;
// 409 says these bytes will not be certified -- and neither may keep the document that
// the previous read put on the screen.
receiptButton.onclick();
const notFoundRead = shell.pending.splice(0, shell.pending.length);
if (notFoundRead.length !== 1) throw new Error(`第二次收据点击发出了 ${notFoundRead.length} 个请求`);
notFoundRead[0].resolve(response({ error: 'DELIVERY_RECEIPT_NOT_FOUND' }, false));
await flush();
const missingText = receiptBox.textContent;
if (!missingText.includes('DELIVERY_RECEIPT_NOT_FOUND') || !missingText.includes('没有收据不等于交付失败'))
  throw new Error(`无收据的 404 要说清是哪一件事：${missingText.slice(0, 200)}`);
if (missingText.includes('PARTIAL') || missingText.includes('native.psd'))
  throw new Error('拒绝后上一份收据文档仍留在屏上');
receiptButton.onclick();
const unverifiedRead = shell.pending.splice(0, shell.pending.length);
unverifiedRead[0].resolve(response({ error: 'DELIVERY_RECEIPT_UNVERIFIED' }, false));
await flush();
const refusedText = receiptBox.textContent;
if (!refusedText.includes('DELIVERY_RECEIPT_UNVERIFIED') || !refusedText.includes('拒绝出证'))
  throw new Error(`拒绝对字节出证必须说成另一件事：${refusedText.slice(0, 200)}`);
if (refusedText.includes('DELIVERY_RECEIPT_NOT_FOUND'))
  throw new Error('409 的框里还挂着 404 的说法，两种状态混成了一条');

// (e) The preflight lands in its own box, and does not touch the receipt's.
preflightButton.onclick();
const preflightReads = shell.pending.splice(0, shell.pending.length);
if (preflightReads.length !== 1)
  throw new Error(`一次预检点击发出了 ${preflightReads.length} 个请求，应为 1 个`);
if (preflightReads[0].path
  !== `/api/projects/p1/bundles/${EVIDENCE_BUNDLE.id}/preflight?profile=print`)
  throw new Error(`证据页预检打到了 ${preflightReads[0].path}`);
preflightReads[0].resolve(response(PREFLIGHT_READBACK));
await flush();
if (!preflightBox.textContent.includes('INCOMPLETE') || !preflightBox.textContent.includes('missing-links'))
  throw new Error('预检读回没有进入证据页自己的框');
if (!receiptBox.textContent.includes('拒绝出证'))
  throw new Error('预检把收据框自己的结论冲掉了 —— 两个框必须互不覆盖');

// (f) A delivery list that named a bundle but not its ACTIVE version is refused without
// a request: the receipt cannot be pointed at a version from memory.
evidenceSelect.onchange();
const rebuilt = shell.pending.splice(0, shell.pending.length);
answerEvidence(rebuilt, JURY_READBACK, { bundles: [{ ...EVIDENCE_BUNDLE, version_id: undefined }] },
               RIGHTS_READBACK);
await flush();
const blindBox = byElementId(shell.elements.get('route-view'), 'evidence-receipt-outcome');
const blindButton = byElementId(shell.elements.get('route-view'), 'evidence-receipt-run');
const blindPicker = byElementId(shell.elements.get('route-view'), 'evidence-delivery-target');
blindPicker.value = EVIDENCE_BUNDLE.id;
blindButton.onclick();
const strayReceipt = shell.pending.splice(0, shell.pending.length);
if (strayReceipt.length)
  throw new Error(`版本 id 未读回时仍然发出了 ${strayReceipt.map((r) => r.path).join(' ')} —— 收据不能指向凭记忆的版本`);
if (!blindBox.textContent.includes('未读回收据'))
  throw new Error(`版本 id 缺失时必须说明未读回：${blindBox.textContent.slice(0, 160)}`);
console.log('ok: ⑦ 证据系统读回裁决/预检/收据：缺字段说未读回不当作空列表、裁决与 lang="en" 上屏、一次点击一个收据请求、404 与 409 两种拒绝各说各话、两框互不覆盖、版本未读回时不发请求');

// ⑧ 权利决定 · Human RIGHTS. The rights gate got a real route (GET/POST
// /api/projects/<32-hex>/rights, src/design_lab/rights_review.py) and now has a real
// surface: a form on 预检 / QA where a human signs, and a read-only column on 证据系统.
// Behaviour is what text cannot prove, so this block drives it: one click files exactly one
// decision to the POST route with the contract's own field set, no request leaves before
// the project and the supersession target have been read back, a refusal replaces the
// previous verdict instead of leaving a stale green, and every word on screen is the
// service's own (lang="en", never translated). The 未读回 half is the shape this repo has
// been burned on: a count the response never carried must not be drawn as 0/0, and
// NOT_REVIEWED must not read as "somebody owes an answer".
const RIGHTS_PROJECTS = { projects: [{ id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Beta' }] };
let rightsFixture = RIGHTS_READBACK;
const rightsAnswer = (path) => (path === '/api/projects' ? RIGHTS_PROJECTS
  : path.includes('/rights') ? rightsFixture : JURY_READBACK);

// Drain every read a view chains, answering by path. 预检 / QA reads /projects twice (the
// jury panel and the rights panel each ask for themselves) and then the two ledgers, so a
// single splice would leave the second half of the page forever loading.
async function drainReads() {
  const seen = [];
  for (let round = 0; round < 8; round += 1) {
    // Settle first, then take what arrived: a read created only as the continuation of the
    // one resolved in the previous round (the rights form's reload-after-POST) is not in
    // the queue yet at the moment of the click.
    await flush();
    const fresh = shell.pending.splice(0, shell.pending.length);
    if (!fresh.length) break;
    seen.push(...fresh);
    for (const request of fresh) request.resolve(response(rightsAnswer(request.path)));
  }
  await flush();
  return seen;
}

shell.window.location.hash = '#/preflight';
shell.dispatchHashchange();
const qaReads = await drainReads();
const preflightView = shell.elements.get('route-view');
for (const expected of ['/api/projects', '/api/projects/p1/jury', '/api/projects/p1/rights'])
  if (!qaReads.some((request) => request.path === expected))
    throw new Error(`预检 / QA 没有读回 ${expected}；实际读到 ${
      qaReads.map((request) => request.path).join(' ')}`);
const rightsOutcome = byElementId(preflightView, 'rights-review-outcome');
const scopeField = byElementId(preflightView, 'rights-use-scope');
const signerField = byElementId(preflightView, 'rights-decided-by');
const supersedesField = byElementId(preflightView, 'rights-supersedes');
const rightsButton = byElementId(preflightView, 'rights-submit');
if (!rightsOutcome || !scopeField || !signerField || !supersedesField || !rightsButton)
  throw new Error('权利表单的某个入口在页面上不可定位 —— ⑧ 找不到提交面');
// The decision words offered are the readback's own `decision_vocabulary`, and nothing
// else. A radio the contract does not allow would be an offer nobody can honour; a
// pre-checked one would file a status nobody chose.
const markedWords = collectMarked(preflightView);
for (const word of ['APPROVED', 'DENIED', 'PENDING_REVIEW', 'BLOCKED_BY_LICENSE']) {
  const radio = byElementId(preflightView, `rights-decision-${word}`);
  if (!radio) throw new Error(`决定词 ${word} 没有出现在表单里，而它来自读回的 decision_vocabulary`);
  if (radio.value !== word)
    throw new Error(`决定词单选框的 value 是 ${radio.value}，不是合同的 ${word}`);
  if (!markedWords.includes(word))
    throw new Error(`决定词 ${word} 必须带 lang="en"（服务词汇，不翻译）`);
}
if (findIn(preflightView, (node) => node.attributes && node.attributes.get('name') === 'rights-decision'
  && node.checked === true))
  throw new Error('权利表单预先选中了一个决定词：没有人选择的状态不能是默认值');
const builtInPosts = qaReads.filter((request) => request.init && request.init.method === 'POST');
if (builtInPosts.length)
  throw new Error(`构建页面时发出了 POST：${builtInPosts.map((r) => r.path).join(' ')} —— `
    + '一条权利决定只能由点击提交，不能由打开页面替人签署');

// (a) Local refusals send nothing. An empty use scope and a supersession aimed at another
// scope are both doomed writes; refusing them here keeps the append-only ledger clean.
rightsButton.onclick();
if (shell.pending.length)
  throw new Error(`使用范围未填写时仍发出了 ${shell.pending.map((r) => r.path).join(' ')} —— `
    + '决定必须落在一个范围上');
if (!rightsOutcome.textContent.includes('未提交') || !rightsOutcome.textContent.includes('使用范围'))
  throw new Error(`缺使用范围时必须说明为什么没提交：${rightsOutcome.textContent.slice(0, 160)}`);
scopeField.value = RIGHTS_SCOPE_A;
signerField.value = 'dtalex66';
byElementId(preflightView, `rights-decision-${'DENIED'}`).checked = true;
supersedesField.value = RIGHTS_DECISION_B;   // decided RIGHTS_SCOPE_B, not SCOPE_A
rightsButton.onclick();
if (shell.pending.length)
  throw new Error(`替代目标与使用范围不同却仍发出了 ${shell.pending.map((r) => r.path).join(' ')} —— `
    + '跨范围替代会让被取代的决定无人计数，服务端也必然拒绝');
if (!rightsOutcome.textContent.includes('不是同一个使用范围'))
  throw new Error(`跨范围替代被拒时页面没有说明原因：${rightsOutcome.textContent.slice(0, 200)}`);
supersedesField.value = '';

// (b) One click, one POST, to the rights route with the contract's own field set.
const posted = { decision: 'DENIED', use_scope: RIGHTS_SCOPE_A };
rightsButton.onclick();
const submitted = shell.pending.splice(0, shell.pending.length);
if (submitted.length !== 1)
  throw new Error(`一次点击发出了 ${submitted.length} 个请求，应为 1 个`);
if (submitted[0].path !== '/api/projects/p1/rights')
  throw new Error(`提交打到了 ${submitted[0].path}，必须是所选项目的 rights 路由`);
if (!submitted[0].init || submitted[0].init.method !== 'POST')
  throw new Error('提交的 HTTP 方法不是 POST —— 一条权利决定不能被写成一次读取');
const RIGHT_FIELDS = ['schemaVersion', 'use_scope', 'decision', 'decided_by', 'decided_at'];
const sentBody = JSON.parse(submitted[0].init.body);
for (const field of RIGHT_FIELDS)
  if (!(field in sentBody))
    throw new Error(`提交缺少合同必备字段 ${field}：服务端会按契约拒绝，页面不该先漏掉它`);
if (sentBody.use_scope !== posted.use_scope || sentBody.decision !== posted.decision)
  throw new Error(`提交的 scope/decision 与所选不符：${JSON.stringify(sentBody)}`);
if (sentBody.schemaVersion !== 'design-lab/rights-decision/v1')
  throw new Error(`提交的 schemaVersion 是 ${sentBody.schemaVersion}，必须是契约绑定的版本`);
if ('supersedes' in sentBody || 'juror' in sentBody || 'actor_kind' in sentBody)
  throw new Error('提交把替代链接或评审人字段塞进了文档：契约关闭属性，supersedes 是查询参数');
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(sentBody.decided_at))
  throw new Error(`decided_at ${sentBody.decided_at} 不是服务接受的 RFC3339 UTC 形状`);
const firstDecisionId = sentBody.decision_id;

// (c) Success reads the ledger back from the service. The outcome line lives outside the
// re-rendered panel on purpose: written inside it, the reload would detach the very node
// the message was put in and the operator would see nothing after a filed decision.
submitted[0].resolve(response(sentBody));
await drainReads();
if (!rightsOutcome.textContent.includes('已提交'))
  throw new Error(`提交成功后没有说明结论来自服务端读回：${rightsOutcome.textContent.slice(0, 160)}`);
if (!rightsOutcome.textContent.includes('上方读回来自服务端'))
  throw new Error('提交成功的说法必须指向服务端读回，而不是页面记住的输入');

// (d) The refusal replaces the verdict: the same box, no stale green sentence standing next
// to a write the service rejected, and the refusal reason in the service's own words.
// The success reload rebuilt the panel, so the fields are looked up in the NEW form and the
// decision word has to be chosen again -- nothing carries over except the outcome line,
// which lives outside the re-rendered body.
const previousView = shell.elements.get('route-view');
const previousScope = byElementId(previousView, 'rights-use-scope');
const previousSigner = byElementId(previousView, 'rights-decided-by');
const previousButton = byElementId(previousView, 'rights-submit');
const previousRadio = byElementId(previousView, 'rights-decision-DENIED');
if (!previousScope || !previousButton || !previousRadio || !previousSigner)
  throw new Error('提交成功读回后表单没有重新渲染 —— 一条决定不能留在已失效的面板上');
previousScope.value = 'third-party-model-weights';
previousSigner.value = 'dtalex66';
previousRadio.checked = true;
previousButton.onclick();
const refusedPosts = shell.pending.splice(0, shell.pending.length);
if (refusedPosts.length !== 1) throw new Error(`第二次点击发出了 ${refusedPosts.length} 个请求，应为 1 个`);
if (JSON.parse(refusedPosts[0].init.body).decision_id === firstDecisionId)
  throw new Error('改了内容的提交沿用了上一条的 decision_id：一条新决定必须是新的一行，'
    + '而服务端会把这个 id 当撞车拒绝');
refusedPosts[0].resolve(response({ error: 'RIGHTS_NOT_HUMAN',
  detail: 'an agent-signed rights decision is refused: `decided_by` \'review-agent\' names automation' },
  false));
await flush();
const afterRefusal = rightsOutcome.textContent;
if (!afterRefusal.includes('RIGHTS_NOT_HUMAN') || !afterRefusal.includes('names automation'))
  throw new Error(`权利提交被拒时页面没有带着拒绝码与理由上屏：${afterRefusal.slice(0, 200)}`);
if (afterRefusal.includes('已提交'))
  throw new Error('拒绝后上一条"已提交"仍留在屏上，等于把被拒的写入算成了一条决定');
if (!afterRefusal.includes('没有写入任何决定'))
  throw new Error('拒绝的说法必须说明服务端什么都没写，否则读者会以为上方读回是这次的结果');

// (e) The read-only column on 证据系统: what stands per scope, who decided, the clearance
// with its denominator, the two limit reports, and the service's own does-not-prove text.
shell.window.location.hash = '#/evidence';
shell.dispatchHashchange();
const evidenceRightsRequests = shell.pending.splice(0, shell.pending.length);
if (evidenceRightsRequests.length !== 1)
  throw new Error(`#/evidence 打开时发出了 ${evidenceRightsRequests.length} 个请求，应只有项目台账`);
evidenceRightsRequests[0].resolve(response(RIGHTS_PROJECTS));
await flush();
const rightsEvidenceView = shell.elements.get('route-view');
const rightsEvidenceSelect = byElementId(rightsEvidenceView, '证据系统-project');
rightsEvidenceSelect.value = 'p1';
rightsEvidenceSelect.onchange();
const evidenceReads = shell.pending.splice(0, shell.pending.length);
answerEvidence(evidenceReads, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, RIGHTS_READBACK);
await flush();
const rightsText = rightsEvidenceView.textContent;
for (const must of [
  '权利决定读回 · Human RIGHTS',
  RIGHTS_SCOPE_A, RIGHTS_SCOPE_B,
  `决定 ${RIGHTS_DECISION_A}`, '决定人 dtalex66',
  '当前批准 1/2', '决定总数 2',
  '本读回不证明',
  'CLEARED covers the use scopes this project has actually filed a decision for',
  // 两条限制必须逐条上屏，不能被折叠成一个数量。
  'a rights decision clears none of the quality, production or release gates',
  // scope_conflicts is empty here, so the conflict sentence must not appear at all;
  // name_checked_only is not, so its limit has to be stated.
  '仅按名字核查的范围 2 个',
  '已提交但未计入清算的范围：client-photo-01（DENIED）',
])
  if (!rightsText.includes(must))
    throw new Error(`权利读回列缺少 ${must}：${rightsText.slice(0, 260)}`);
if (rightsText.includes('范围冲突'))
  throw new Error('scope_conflicts 为空时页面不得声称存在范围冲突');
if (rightsText.includes('尚无人签署的权利决定'))
  throw new Error('有决定可读回时页面仍说无人签署');
if (rightsText.includes('未读回：响应缺少'))
  throw new Error('形状完整的权利读回不得出现形状告警');
const rightsMarked = collectMarked(rightsEvidenceView);
for (const word of ['NOT_REVIEWED', 'APPROVED', 'DENIED'])
  if (!rightsMarked.includes(word))
    throw new Error(`权利状态词 ${word} 必须带 lang="en"（服务词汇，不翻译）：${rightsMarked.join('/')}`);
// A chip colour is a claim too, and it is the one a reader parses before the words.
// `.tag.ok` is the affirmative pill the stylesheet draws green, so NOT_REVIEWED and DENIED
// may never wear it, and a scope the façade counts as approved must.
function tagsPainted(node, out = []) {
  if (node?.className && /^tag\b/.test(node.className)) out.push([node.className, node.textContent]);
  for (const child of (node?.children ?? [])) tagsPainted(child, out);
  return out;
}
const painted = tagsPainted(rightsEvidenceView);
const green = painted.filter(([klass]) => /\bok\b/.test(klass)).map(([, text]) => text);
const neutral = painted.filter(([klass]) => /neutral/.test(klass)).map(([, text]) => text);
if (green.includes('NOT_REVIEWED'))
  throw new Error('NOT_REVIEWED 被涂成了肯定色：一道没被清算的门不能看起来像通过了');
if (green.includes('DENIED'))
  throw new Error('DENIED 被涂成了肯定色：façade 列在未批准范围里的决定不能是绿的');
if (!green.includes('APPROVED'))
  throw new Error(`由 unapproved_scopes 判定为批准的范围必须带肯定色：实际绿标 ${green.join('/')}`);
if (painted.some(([klass, text]) => text === 'DENIED' && !/\bbad\b/.test(klass)))
  throw new Error('DENIED 必须用拒绝色，而不是一个中性标签');
if (neutral.length)
  throw new Error(`决定词读回完整时不应出现中性标签：${neutral.join('/')}`);

// (f) A count the response never carried is not a zero. 0/0 would read as "nothing needed
// clearing" -- the very vacuity rights_review.py refuses to compute as CLEARED.
rightsFixture = { ...RIGHTS_READBACK,
  approved_scope_count: undefined, filed_scope_count: undefined, decision_count: undefined };
rightsEvidenceSelect.onchange();
const bareRights = shell.pending.splice(0, shell.pending.length);
answerEvidence(bareRights, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, rightsFixture);
await flush();
const bareRightsText = rightsEvidenceView.textContent;
if (!bareRightsText.includes('当前批准 未读回'))
  throw new Error(`缺少分母时应说未读回：${bareRightsText.slice(0, 240)}`);
if (bareRightsText.includes('0/0'))
  throw new Error('页面把没读回的分数画成了 0/0');
if (!bareRightsText.includes('决定总数 未读回'))
  throw new Error('缺少决定总数时不得显示数字');

// (g) NOT_REVIEWED with nothing filed is "never asked", not "waiting for an answer".
rightsFixture = { ...RIGHTS_READBACK, current_decisions: {}, unapproved_scopes: [],
  ever_filed_scopes: [], scope_conflicts: [], name_checked_only: [],
  filed_scope_count: 0, approved_scope_count: 0,
  decision_count: 0, decision_states: { APPROVED: 0, DENIED: 0, PENDING_REVIEW: 0,
                                        BLOCKED_BY_LICENSE: 0 } };
rightsEvidenceSelect.onchange();
const nothingFiled = shell.pending.splice(0, shell.pending.length);
answerEvidence(nothingFiled, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, rightsFixture);
await flush();
const filedText = rightsEvidenceView.textContent;
if (!filedText.includes('尚无人签署的权利决定'))
  throw new Error('服务真的答了空台账时必须照实说尚无');
if (!filedText.includes('没有被问过'))
  throw new Error('未被提交过的权利门必须说"没有被问过"，而不是让 NOT_REVIEWED 读成有人在等答复');
if (/等待(审查|答复)|正在审查/.test(filedText.replace(/不是有人在等答复|不是"正在等待审查"/g, '')))
  throw new Error('空台账的读回把 NOT_REVIEWED 说成了正在等待审查');
if (filedText.includes('仅按名字核查'))
  throw new Error('name_checked_only 为空时页面不得声称存在仅按名字核查的行');
if (!filedText.includes('PENDING_REVIEW 0'))
  throw new Error('状态计数必须原样读回：没有人类提交的 PENDING_REVIEW 应显示 0，而不是缺席');

// (h) A fork in the chain is reported, not silently tie-broken.
rightsFixture = { ...RIGHTS_READBACK,
  scope_conflicts: [{ use_scope: RIGHTS_SCOPE_A, decision_ids: [RIGHTS_DECISION_A, 'rights-c'] }] };
rightsEvidenceSelect.onchange();
const conflicted = shell.pending.splice(0, shell.pending.length);
answerEvidence(conflicted, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, rightsFixture);
await flush();
const conflictText = rightsEvidenceView.textContent;
if (!conflictText.includes('范围冲突 1 项') || !conflictText.includes(RIGHTS_DECISION_A))
  throw new Error(`多条现行决定时必须点名范围与决定 id：${conflictText.slice(0, 240)}`);
if (!conflictText.includes('是不确定的'))
  throw new Error('冲突必须被说成"当前立场不确定"，而不是悄悄选一条显示');

// (i) A superseded scope must not let a clearance quietly cover less than anybody filed.
// `ever_filed_scopes` counts every scope anybody ever filed; `current_decisions` only the
// standing ones. The page states the difference rather than leaving the reader to notice
// the denominator moved.
rightsFixture = { ...RIGHTS_READBACK, ever_filed_scopes: [RIGHTS_SCOPE_A, RIGHTS_SCOPE_B,
  'third-party-model-weights'] };
rightsEvidenceSelect.onchange();
const narrowed = shell.pending.splice(0, shell.pending.length);
answerEvidence(narrowed, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, rightsFixture);
await flush();
const narrowedText = rightsEvidenceView.textContent;
if (!narrowedText.includes('曾提交过的范围 3 个'))
  throw new Error(`曾提交过的范围数必须来自 ever_filed_scopes：${narrowedText.slice(0, 200)}`);
if (!narrowedText.includes('1 个范围已不再出现在现行集合中'))
  throw new Error('被取代的范围离场时页面要说出差额，否则清算看起来覆盖了比实际更多的东西');
if (narrowedText.includes('2 个范围已不再出现'))
  throw new Error('差额的算术错了：3 个曾提交、2 个现行，只能差 1 个');

// (j) A field the response never carried is unread, never an empty list. `current_decisions`
// is a collection the seam must refill, so the column says which field is missing and does
// not claim nobody signed.
rightsFixture = { ...RIGHTS_READBACK, current_decisions: undefined, does_not_prove: undefined };
rightsEvidenceSelect.onchange();
const unreadRights = shell.pending.splice(0, shell.pending.length);
answerEvidence(unreadRights, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] }, rightsFixture);
await flush();
const unreadRightsText = rightsEvidenceView.textContent;
if (!unreadRightsText.includes('权利决定未读回'))
  throw new Error(`权利字段缺失时页面必须说未读回：${unreadRightsText.slice(0, 240)}`);
if (unreadRightsText.includes('尚无人签署的权利决定'))
  throw new Error('响应没有给出 current_decisions 时，页面不得声称尚无人签署的权利决定');
if (unreadRightsText.includes('视图读回失败'))
  throw new Error('缺少一个集合不得把整页压成读回失败');
if (!/未读回：响应缺少[^\n]*current_decisions/.test(unreadRightsText))
  throw new Error('未读回的说法必须点名缺的是哪个字段');
rightsFixture = RIGHTS_READBACK;
console.log('ok: ⑧ 权利门：决定词来自读回且带 lang="en"、无预选、构建页面零 POST、注定被拒的写不发请求、一次点击一个 POST 带契约字段与查询参数替代、成功后读回来自服务端、拒绝替换上一条已提交、证据列读回每人每范围决定与分母/冲突/仅名字核查/does_not_prove、缺分母说未读回不画 0/0、空台账说"没有被问过"不说等待审查');

// ⑨ 研究洞察 · persisted findings. GET/POST /api/projects/<32-hex>/research became a real
// route, and the slot that used to say "no persisted conclusions route exists" now reads the
// ledger back. The claims worth driving are the ones a static page cannot make: a write leaves
// only on click and carries exactly the closed contract field set (no schemaVersion, because
// this contract declares none), a supersede link travels as a query parameter and not inside the
// document, an identical retry keeps its finding_id so the service can call it a replay while a
// changed document must take a fresh one, and the page never invents a completion word -- the
// façade publishes `research_verdict: null` precisely because "how many findings exist" is not
// "is the research finished". A count the response never carried reads 未读回 rather than 0.
const RESEARCH_PROJECTS = { projects: [{ id: 'p1', name: 'Alpha' }, { id: 'p2', name: 'Beta' }] };
let researchFixture = {
  schemaVersion: 'design-lab/research-readback/v1', project_id: 'p1',
  findings: [
    { finding_id: 'rf-one', claim: '包装线上一半的返工来自色数超限', sourceRefs: ['interview-07'],
      confidence: 'medium' },
    { finding_id: 'rf-two', claim: '模板复用率随交付格式数量下降',
      sourceRefs: ['bench-figma-2026-05', 'telemetry-12'] },
  ],
  current_findings: { 'rf-one': {}, 'rf-two': {} },
  finding_count: 2, current_finding_count: 2, superseded_finding_count: 0,
  sourced_finding_count: 2, unsourced_finding_count: 0, source_ref_total: 3,
  source_ref_field: 'sourceRefs',
  confidence_counts: { high: 0, medium: 1, low: 0, speculative: 0 },
  confidence_vocabulary: ['high', 'medium', 'low', 'speculative'],
  stated_confidence_count: 1, unattributed_findings: ['rf-one', 'rf-two'],
  actor_kinds: { UNDECLARED: 2 }, undeclared_disclaimer: 'HTTP 提交不携带作者类型',
  proves_design_quality: false, is_knowledge_export: false,
  research_verdict: null,
  research_verdict_note: 'this surface publishes no completion or clearance word',
  does_not_prove: ['a finding is working input, not a design quality verdict'],
};
const researchAnswer = (path) => (path === '/api/projects' ? RESEARCH_PROJECTS
  : path.includes('/research') ? researchFixture : {});

async function drainResearchReads() {
  const seen = [];
  for (let round = 0; round < 8; round += 1) {
    await flush();
    const fresh = shell.pending.splice(0, shell.pending.length);
    if (!fresh.length) break;
    seen.push(...fresh);
    for (const request of fresh) request.resolve(response(researchAnswer(request.path)));
  }
  await flush();
  return seen;
}

shell.window.location.hash = '#/research';
shell.dispatchHashchange();
const researchReads = await drainResearchReads();
for (const expected of ['/api/projects', '/api/projects/p1/research'])
  if (!researchReads.some((request) => request.path === expected))
    throw new Error(`研究洞察没有读回 ${expected}；实际读到 ${
      researchReads.map((request) => request.path).join(' ')}`);
const researchView = shell.elements.get('route-view');
const researchOutcome = byElementId(researchView, 'research-review-outcome');
const claimField = byElementId(researchView, 'research-claim');
const sourcesField = byElementId(researchView, 'research-sources');
const confidenceField = byElementId(researchView, 'research-confidence');
const supersedeField = byElementId(researchView, 'research-supersedes');
const researchButton = byElementId(researchView, 'research-submit');
if (!researchOutcome || !claimField || !sourcesField || !confidenceField || !supersedeField
  || !researchButton)
  throw new Error('研究表单的某个入口在页面上不可定位 —— ⑨ 找不到提交面');

// The view replaced its own "not open" copy: the notice lives in VIEW_NOT_OPEN and the route is
// now dispatched, so both halves must be gone from the rendered page.
const researchText = (researchView.textContent || '');
if (researchText.includes('未开放') || researchText.includes('没有研究结论的持久化路由'))
  throw new Error(`研究洞察仍显示"未开放"文案，而路由已存在：${researchText.slice(0, 140)}`);
// No completion word may appear, and the null verdict must be explained rather than blanked.
for (const forbidden of ['RESEARCH_COMPLETE', 'CLEARED', 'PENDING_REVIEW', '研究已完成'])
  if (researchText.includes(forbidden))
    throw new Error(`研究读回出现了它不该有的判定词 ${forbidden}`);
if (!researchText.includes('无完成判定词'))
  throw new Error('research_verdict 为 null 时页面必须说明"无完成判定词"，而不是留一个空徽章');
if (!researchText.includes('this surface publishes no completion or clearance word'))
  throw new Error('服务端给出的 research_verdict_note 没有上屏');
if (!researchText.includes('a finding is working input, not a design quality verdict'))
  throw new Error('does_not_prove 的行文没有上屏，数字就会脱离它的限制条件被读');
const confidenceWords = ['high', 'medium', 'low', 'speculative'];
for (const word of confidenceWords) {
  const option = findIn(researchView, (node) => node.tagName === 'OPTION' && node.value === word);
  if (!option) throw new Error(`置信度 ${word} 来自读回的 confidence_vocabulary，却不在下拉里`);
}
if (confidenceField.value !== '')
  throw new Error('置信度下拉预先选了值：没有人选的置信度不能是默认值');

// Building the page writes nothing.
if (researchReads.some((request) => request.init && request.init.method === 'POST'))
  throw new Error('构建研究页面时发出了 POST —— 一条结论只能由点击记录');

// (a) The two local refusals send nothing: no claim, and no source. The store refuses an
// unsourced finding outright, so the page declines to send a doomed write instead of inventing
// a citation for the operator.
researchButton.onclick();
if (shell.pending.length)
  throw new Error(`结论正文为空时仍发出了 ${shell.pending.map((r) => r.path).join(' ')}`);
if (!researchOutcome.textContent.includes('未提交')
  || !researchOutcome.textContent.includes('结论正文为空'))
  throw new Error(`缺结论正文时页面没有说明原因：${researchOutcome.textContent.slice(0, 160)}`);
claimField.value = '包装改版后货架识别度下降';
sourcesField.value = '   ';
researchButton.onclick();
if (shell.pending.length)
  throw new Error('没有来源引用时仍发出了 POST：页面不替操作人补一个来源');
if (!researchOutcome.textContent.includes('没有任何来源引用'))
  throw new Error(`缺来源时页面没有说明原因：${researchOutcome.textContent.slice(0, 160)}`);

// (b) One click, one POST, with the closed contract field set and no invented schemaVersion.
sourcesField.value = 'interview-11, shelf-photo-03';
confidenceField.value = 'low';
researchButton.onclick();
const researchSent = shell.pending.splice(0, shell.pending.length);
if (researchSent.length !== 1)
  throw new Error(`一次点击发出了 ${researchSent.length} 个请求，应为 1 个`);
if (researchSent[0].path !== '/api/projects/p1/research')
  throw new Error(`提交打到了 ${researchSent[0].path}，必须是所选项目的 research 路由`);
if (!researchSent[0].init || researchSent[0].init.method !== 'POST')
  throw new Error('研究结论的提交不是 POST');
const researchBody = JSON.parse(researchSent[0].init.body);
const RESEARCH_REQUIRED = ['finding_id', 'claim', 'sourceRefs'];
for (const field of RESEARCH_REQUIRED)
  if (!(field in researchBody))
    throw new Error(`提交缺少契约必备字段 ${field}`);
if ('schemaVersion' in researchBody)
  throw new Error('提交带了 schemaVersion：research-finding 契约关闭属性且未声明该字段，服务端会按未知属性拒绝');
const allowedKeys = new Set(['finding_id', 'claim', 'sourceRefs', 'confidence', 'notDesignRule']);
for (const key of Object.keys(researchBody))
  if (!allowedKeys.has(key))
    throw new Error(`提交带了契约之外的字段 ${key}`);
if (!Array.isArray(researchBody.sourceRefs) || researchBody.sourceRefs.length !== 2
  || researchBody.sourceRefs[0] !== 'interview-11')
  throw new Error(`来源拆分不符：${JSON.stringify(researchBody.sourceRefs)}`);
if (researchBody.confidence !== 'low')
  throw new Error(`所选置信度没有原样送出：${researchBody.confidence}`);
if ('notDesignRule' in researchBody)
  throw new Error('未勾选的可选布尔字段被写成了 false： absence 与 false 是不同的记录');
if (!/^rf-[0-9a-f]{1,32}$/.test(researchBody.finding_id))
  throw new Error(`finding_id ${researchBody.finding_id} 形状与服务端生成的一致前缀不符`);
const firstFindingId = researchBody.finding_id;

// (c) An identical resend keeps the id, so the service can answer "replay" instead of filing the
// same claim twice; a changed document must take a fresh id, because the store refuses an id
// whose content moved.
researchButton.onclick();
const resend = shell.pending.splice(0, shell.pending.length);
if (resend.length !== 1)
  throw new Error(`第二次相同点击发出了 ${resend.length} 个请求`);
if (JSON.parse(resend[0].init.body).finding_id !== firstFindingId)
  throw new Error('完全相同的重复提交换了 finding_id：服务端会把一次主张记成两条结论');
claimField.value = '包装改版后货架识别度下降（补：夜间陈列）';
researchButton.onclick();
const changed = shell.pending.splice(0, shell.pending.length);
if (JSON.parse(changed[0].init.body).finding_id === firstFindingId)
  throw new Error('改过的正文仍沿用旧 finding_id：服务端会以 ID 已占用拒绝，页面不该发注定被拒的写');

// (d) Supersession is a query parameter, and only CURRENT findings are offered as targets.
supersedeField.value = 'rf-one';
researchButton.onclick();
const superseding = shell.pending.splice(0, shell.pending.length);
if (superseding.length !== 1 || !superseding[0].path.startsWith('/api/projects/p1/research')
  || !String(superseding[0].init.body).length)
  throw new Error(`替代提交形状不对：${superseding.length} 个请求 `
    + `${superseding.map((r) => `${r.path}|${r.init && r.init.method}`).join(' ; ')}`);
if (!superseding[0].path.includes('supersedes=rf-one'))
  throw new Error(`替代链接没有作为查询参数送出：${superseding[0].path}`);
if ('supersedes' in JSON.parse(superseding[0].init.body))
  throw new Error('提交把 supersedes 塞进了文档：契约关闭属性且未声明它');
if (!byElementId(researchView, 'research-supersedes'))
  throw new Error('替代选择器消失了');

// (e) Success reads the ledger back from the service; a refusal then replaces that sentence
// rather than leaving a stale green beside an error.
superseding[0].resolve(response({ finding_id: 'rf-new', claim: 'x', sourceRefs: ['s'] }));
await drainResearchReads();
if (!researchOutcome.textContent.includes('已记录'))
  throw new Error(`记录成功后没有说明结论来自服务端读回：${researchOutcome.textContent.slice(0, 160)}`);
researchButton.onclick();
const failing = shell.pending.splice(0, shell.pending.length);
failing[0].resolve(response({ error: 'RESEARCH_SOURCE_REQUIRED',
  detail: 'a finding must cite at least one source' }, false));
await flush();
if (!researchOutcome.textContent.includes('未记录')
  || !researchOutcome.textContent.includes('RESEARCH_SOURCE_REQUIRED'))
  throw new Error(`服务端拒绝没有替换上一条成功说法：${researchOutcome.textContent.slice(0, 200)}`);
if (researchOutcome.textContent.includes('已记录'))
  throw new Error('一次被拒的写留下了"已记录"：同一屏上出现两个矛盾判定');

// (f) The unread half. A read-back that never arrived must not be drawn as a project holding no
// findings, and a count the response did not carry must not appear as 0.
// Shape-complete but count-free, so this case measures exactly one thing: a count the response
// never carried. A malformed payload would be caught by the shape notice instead (block ② covers
// that path), and the counts line would never render.
researchFixture = { schemaVersion: 'design-lab/research-readback/v1', project_id: 'p1',
  findings: [], current_findings: {}, confidence_counts: {}, does_not_prove: [],
  actor_kinds: {}, unattributed_findings: [],
  confidence_vocabulary: ['high', 'medium', 'low', 'speculative'] };
shell.window.location.hash = '#/dashboard';
shell.dispatchHashchange();
await flush();
shell.window.location.hash = '#/research';
shell.dispatchHashchange();
await drainResearchReads();
const strippedView = shell.elements.get('route-view');
const strippedText = strippedView.textContent || '';
if (!strippedText.includes('共 未读回 条'))
  throw new Error(`响应没带计数时,读数行必须逐字说"共 未读回 条"：${strippedText.slice(0, 220)}`);
// Not `\b共 0 条\b`: \\b is a word boundary over \\w only, and CJK characters are not word
// characters in JavaScript, so the guard could never have matched anything. The check is on the
// exact rendered form instead -- which is what the falsifier's fourth case proved was load-bearing.
if (strippedText.includes('共 0 条'))
  throw new Error('未读回的计数被画成了 0 条：空响应与空台账是两件事');
if (!strippedText.includes('本项目尚无已持久化的研究结论')
  && !strippedText.includes('未读回不等于本项目没有结论'))
  throw new Error(`空且确已读回的台账必须说清"没有被记录"：${strippedText.slice(0, 200)}`);
if (strippedText.includes('RESEARCH_COMPLETE'))
  throw new Error('空台账被说成了完成');

console.log('ok: ⑨ 研究洞察读回已持久化的结论：判定词一个都不画、null 判定给出服务端的说明、置信度选项来自读回且无预选、构建页面零 POST、空正文与无来源两种本地拒绝都不发请求、一次点击一个 POST 且只带契约字段（无 schemaVersion、未勾选的布尔不写成 false）、相同重发沿用 finding_id 而改动必换新 id、替代作为查询参数且只列现行结论、成功后读回来自服务端、拒绝替换上一条已提交、缺计数说未读回不画 0 条');

console.log('APPSHELL REGRESSION: all checks passed');
