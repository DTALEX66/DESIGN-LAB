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

console.log('APPSHELL REGRESSION: all checks passed');
