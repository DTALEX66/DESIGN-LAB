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
    fetch: (path) => new Promise((resolve, reject) => pending.push({ path, resolve, reject })),
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
  const requests = shell.pending.splice(0, shell.pending.length);
  for (const request of requests) request.resolve(response({}));
  await flush();
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
                          asset_id: 'a1' }],
  human_acceptance: 'ACCEPTED',
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
                 '/api/projects/p1/jury'];
for (const expected of expects)
  if (!evidencePaths.includes(expected))
    throw new Error(`证据系统没有读回 ${expected}；实际读到 ${evidencePaths.join(' ')}`);
const answerEvidence = (requests, jury, bundles) => {
  for (const request of requests) {
    if (request.path.endsWith('/jury')) request.resolve(response(jury));
    else if (request.path.endsWith('/bundles')) request.resolve(response(bundles));
    else request.resolve(response(DESIGN_LAYER_EMPTY));
  }
};
// (a) A jury readback that never carried the collection must be reported as unread, and
// must NOT be shown as "there are no verdicts" -- the lie an empty <ul> tells.
answerEvidence(evidenceBuild, {}, { bundles: [EVIDENCE_BUNDLE] });
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
answerEvidence(juryReads, JURY_READBACK, { bundles: [EVIDENCE_BUNDLE] });
await flush();
const juryText = evidenceView.textContent;
for (const must of ['APPROVE', JURY_SUBJECT, '在 100% 缩放下对照参考图审读',
                    '已签署 1 · Agent 建议 2', 'ACCEPTED'])
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
answerEvidence(rebuilt, JURY_READBACK, { bundles: [{ ...EVIDENCE_BUNDLE, version_id: undefined }] });
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

console.log('APPSHELL REGRESSION: all checks passed');
