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

console.log('APPSHELL REGRESSION: all checks passed');
