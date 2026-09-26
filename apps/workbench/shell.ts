// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench — shell module (Lane-C split of the D002 monolith): AppShell
// navigation over the B07 12-route IA + per-view readback renderers. Reads workbench/
// design state via named imports (no cross-module writes).

import type {
  DesignLayerResponse,
  DesignSystemListResponse,
  EnvironmentResponse,
  HealthResponse,
  ProjectListResponse,
  TaskListResponse,
  TaskPreflightResource,
  TaskPreflightResponse,
} from './contracts.js';

import { api, byId, connected, errMsg, projects, setStatus, token } from './workbench.js';


// ============================================================================
// UI convergence slice 2 (2026-09-22): AppShell navigation over the B07
// authoritative 12-route IA (routes.json). Purely additive: it inserts ONE new
// sidebar + one new route-panel region and toggles them by URL hash. Every
// pre-existing element id, handler and text label is untouched, so the
// browser E2E (id-located selectors) and the vm unit smoke keep their
// contracts. The default view (empty hash) is the original workbench: no hash
// == the legacy single-page layout, byte for byte.
//
// Views are bound to REAL service routes only (no invented KPIs):
//   dashboard / brand-systems / preflight-qa / settings -> /api/* readbacks
//   the remaining IA slots carry no backend route today and HONESTLY say so.
// ============================================================================
export const ROUTE_VIEWS = [
  { hash: '', view: 'workbench', label: '工作台' },
  { hash: '#/dashboard', view: 'dashboard', label: '仪表盘' },
  { hash: '#/projects', view: 'projects', label: '项目' },
  { hash: '#/research', view: 'research', label: '研究洞察' },
  { hash: '#/brand-systems', view: 'brand-systems', label: '品牌系统' },
  { hash: '#/domains', view: 'design-domains', label: '设计领域' },
  { hash: '#/tools', view: 'creative-tools', label: '创作工具' },
  { hash: '#/preflight', view: 'preflight-qa', label: '预检 / QA' },
  { hash: '#/deliverables', view: 'deliverables', label: '交付中心' },
  { hash: '#/evidence', view: 'evidence', label: '证据系统' },
  { hash: '#/collaboration', view: 'collaboration', label: '团队协作' },
  { hash: '#/settings', view: 'settings', label: '系统设置' },
] as const;
export type RouteView = (typeof ROUTE_VIEWS)[number]['view'];

// Honest "not open yet" copy per IA slot that has no backend route today.
// Projects / creative-tools / deliverables / evidence are READ-ONLY readbacks
// of real service routes (see renderProjects/renderCreativeTools/
// renderDeliverables/renderEvidence). These three slots have NO backend model:
// research has no persisted conclusions, domains has no independent model, and
// the service is single-user with no collaboration route — so they say so.
export const VIEW_NOT_OPEN: Partial<Record<RouteView, string>> = {
  'research': '研究洞察页未开放：当前服务没有研究结论的持久化路由。',
  'design-domains': '设计领域页未开放：领域划分尚无独立后端模型。',
  'collaboration': '团队协作页未开放：本地单机服务尚无协作路由（本地单用户模型）。',
};

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'dataset') for (const [dk, dv] of Object.entries(value as Record<string, unknown>)) (node as HTMLElement).dataset[dk] = String(dv);
    else if (key.startsWith('on') || key === 'type' || key === 'value' || key === 'placeholder')
      (node as unknown as Record<string, unknown>)[key] = value;
    else node.setAttribute(key, String(value));
  }
  node.append(...children);
  return node;
}

export function kpiCard(label: string, value: string, note: string): HTMLElement {
  return el('div', { class: 'kpi-card' },
    el('p', { class: 'eyebrow' }, label),
    el('h3', { class: 'kpi-value' }, value),
    el('p', { class: 'kpi-note' }, note));
}

export function stateMachineStepper(): HTMLElement {
  const stages = ['brief', 'research', 'designing', 'review', 'qa', 'approved', 'delivered', 'archived'];
  const ol = el('ol', { class: 'state-machine', 'aria-label': '设计域状态机（契约可视化，不代表项目进度）' });
  for (const stage of stages) ol.append(el('li', { class: 'state-machine-step', dataset: { state: stage } }, stage));
  return ol;
}

export async function renderDashboard(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回服务状态…'));
  const [health, projects, systems] = await Promise.all([
    api<HealthResponse>('/health'),
    api<ProjectListResponse>('/projects'),
    api<DesignSystemListResponse>('/design-systems'),
  ]);
  const grid = el('div', { class: 'kpi-grid' },
    kpiCard('服务状态', health.status, `版本 ${health.version} · 作用域 ${health.scope}`),
    kpiCard('项目', String(projects.projects.length), '来自 /api/projects 真实读回，非统计猜测'),
    kpiCard('设计系统', String(systems.design_systems.length), '资源登记的设计系统总数'));
  const systemsList = el('ul', { class: 'items', 'data-view-item': 'brand' },
    ...systems.design_systems.map((system) => el('li', {},
      `${system.name} · ${system.title} · v${system.version} · 证据 ${system.evidence_level}`)));
  target.replaceChildren(
    el('h2', {}, '仪表盘'),
    grid,
    el('p', { class: 'eyebrow' }, '设计系统登记'),
    systemsList,
    el('p', { class: 'eyebrow' }, '设计域状态机（B07 契约 · NEXT/BACK 双向）'),
    stateMachineStepper());
}

export async function renderBrandSystems(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回设计系统…'));
  const systems = await api<DesignSystemListResponse>('/design-systems');
  target.replaceChildren(
    el('h2', {}, '品牌系统'),
    el('ul', { class: 'items', 'data-view-item': 'brand' },
      ...systems.design_systems.map((system) => el('li', {},
        `${system.name} · ${system.title} · 版本 ${system.version} · 证据级别 ${system.evidence_level}`))),
    el('p', { class: 'view-hint' }, '绑定到方向的操作在工作台「05 / DESIGN LAYER」页执行。'));
}

export async function renderPreflight(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在准备预检…'));
  // The task-resource registry (design-lab/config/task-resources.json) is a
  // file the preflight reads, NOT an HTTP route — so the UI takes the task
  // full id as input and fails closed on the service's own 400 envelope.
  const known = 'DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-H020 · …::DL-R5-012 · …::DL-R5-011';
  const input = el('input', { id: 'preflight-task-input', class: 'preflight-input',
    placeholder: '<TASKPACK>::<TASK_KEY>，例如 ' + known, maxlength: '200' });
  const result = el('div', { class: 'preflight-result' });
  const runPreflight = async (): Promise<void> => {
    const taskId = input.value.trim();
    if (!taskId) { result.replaceChildren(el('p', { class: 'view-hint' }, '请先填写要预检的任务全 ID（<TASKPACK>::<TASK_KEY>）。')); return; }
    result.replaceChildren(el('p', { class: 'view-loading' }, `正在读回 ${taskId} 的资源判定…`));
    try {
      const data = await api<TaskPreflightResponse>(`/task-preflight?task=${encodeURIComponent(taskId)}`);
      // B07 4-state: loading (above) -> ready (verdict + resource table). The
      // verdict pill is the explicit PASS / BLOCKED signal; a zero-blocked
      // readback still says so (never renders a fake "all clear" — it is a
      // read-only preflight, not an executed quality pass).
      const blocked = data.blocked_resources.length;
      result.replaceChildren(
        el('div', { class: 'verdict-line' },
          el('span', { class: blocked ? 'pill pill-block' : 'pill pill-pass' }, data.verdict),
          el('span', { class: 'verdict-meta' },
            `登记 ${data.registry_state} · 机器 ${data.machine_scope} · 权限 ${data.permissions.meaning}`)),
        blocked
          ? el('p', { class: 'view-hint' }, `阻塞资源 ${blocked} 项：${data.blocked_resources.join(' · ')}。此预检只读回，不安装、不裁许可、不遍历外部根。`)
          : el('p', { class: 'view-hint' }, '无阻塞资源。此为只读预检判定，不等同质量或 rights 验收。'),
        el('table', { class: 'resource-table' },
          el('thead', {}, el('tr', {}, el('th', {}, '资源'), el('th', {}, '状态'), el('th', {}, '说明'))),
          el('tbody', {}, ...data.resources.map((row: TaskPreflightResource) => el('tr', {},
            el('td', {}, row.ref),
            el('td', {}, el('span', { class: 'pill pill-info' }, row.state)),
            el('td', {}, row.meaning))))));
    } catch (error) {
      result.replaceChildren(el('p', { class: 'error' }, `预检未确认：${errMsg(error)}。服务端拒绝时未写入任何判定。`));
    }
  };
  target.replaceChildren(
    el('h2', {}, '预检 / QA'),
    el('p', { class: 'view-hint' }, '与 CLI doctor 同一读回源：只探测与报告，从不安装、从不接受许可、从不遍历外部根。'),
    el('label', {}, '任务全 ID', input, el('button', { type: 'button', class: 'secondary', onclick: () => { void runPreflight().catch((error) => setStatus(errMsg(error), true)); } }, '读回判定')),
    result);
}

export async function renderSettings(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回运行环境…'));
  const env = await api<EnvironmentResponse>('/environment');
  const rows: Array<[string, string]> = [
    ['环境状态', `${env.status} · ${env.schemaVersion}`],
    ['项目根', env.project_root],
    ['项目本地根', env.project_local_root],
    ['写入痕迹', `${env.write_trace} · 迁移 ${env.migration}`],
    ['代理配置', `PRIVATE_NOT_INSPECTED · 不可写（${env.agent_profile.status}）`],
  ];
  // LibraryIndex: the external library index is the read-only red-line surface.
  // Turn each row's status / writability into an explicit pill so the 4-state
  // contract is visible (a writable root is marked; every shared input stays
  // read-only DECLARED_NOT_PROBED — the UI never implies it can write there).
  const writablePill = (writable: boolean): HTMLElement =>
    el('span', { class: 'pill ' + (writable ? 'pill-pass' : 'pill-info') }, writable ? '可写' : '只读');
  const roots = el('table', { class: 'resource-table' },
    el('thead', {}, el('tr', {}, el('th', {}, '根'), el('th', {}, '路径'), el('th', {}, '可写'))),
    el('tbody', {}, ...Object.entries(env.roots).map(([name, root]) => el('tr', {},
      el('td', {}, name), el('td', {}, root.path), el('td', {}, writablePill(root.writable))))));
  const shared = el('table', { class: 'resource-table' },
    el('thead', {}, el('tr', {}, el('th', {}, '外置库索引'), el('th', {}, '状态'), el('th', {}, '路径'))),
    el('tbody', {}, ...Object.entries(env.shared_inputs).map(([name, input]) => el('tr', {},
      el('td', {}, name),
      el('td', {}, el('span', { class: 'pill pill-info' }, input.status)),
      el('td', {}, input.path)))));
  target.replaceChildren(
    el('h2', {}, '系统设置'),
    el('table', { class: 'resource-table' },
      el('tbody', {}, ...rows.map(([label, value]) => el('tr', {},
        el('th', { scope: 'row' }, label), el('td', {}, value))))),
    el('p', { class: 'eyebrow' }, '项目根（可写）'),
    roots,
    el('p', { class: 'eyebrow' }, '外置输入（只读 · DECLARED_NOT_PROBED）'),
    shared,
    el('p', { class: 'view-hint' }, '设置页只读回服务端诊断；本服务不修改任何配置。'));
}

// --- UI real-data routes (2026-09-22): projects / creative-tools /
//     deliverables / evidence as READ-ONLY readbacks of real service routes.
//     Operational automation (submit native plan, run task, patch, bundle,
//     choose direction, bind system) is NEVER triggered here — the page reads
//     state back and says the action is performed in the host / workbench.
// ---

// Shared readback-only project picker. Loads /api/projects once, lets the user
// pick a project, and re-runs `body(projectId)` on each change. No mutation:
// only GETs below this point.
export async function projectPickerPanel(target: HTMLElement, title: string, body: (projectId: string) => Promise<HTMLElement>): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回项目台账…'));
  const data = await api<ProjectListResponse>('/projects');
  if (!data.projects.length) {
    target.replaceChildren(
      el('h2', {}, title),
      el('p', { class: 'view-hint' }, '尚无项目。先在工作台新建项目，再读回此视图。'));
    return;
  }
  const select = el('select', { class: 'project-select', id: `${title.replace(/\s+/g, '-')}-project` });
  select.append(el('option', { value: '' }, `选择项目（共 ${data.projects.length} 个）`));
  for (const p of data.projects) select.append(el('option', { value: p.id }, p.name));
  const content = el('div', { class: 'route-view-body' });
  target.replaceChildren(el('h2', {}, title), el('label', { class: 'project-picker' }, '项目', select), content);
  const load = async (): Promise<void> => {
    const id = select.value;
    if (!id) { content.replaceChildren(el('p', { class: 'view-hint' }, '请选择一个项目后读回。')); return; }
    content.replaceChildren(el('p', { class: 'view-loading' }, '正在读回该项目…'));
    try {
      content.replaceChildren(await body(id));
    } catch (error) {
      content.replaceChildren(el('p', { class: 'error' }, `读回失败：${errMsg(error)}`));
    }
  };
  select.onchange = () => { void load(); };
  await load();
}

// 项目台账 — a straight readback of /api/projects. No selection here: picking a
// project happens in the workbench; this page just lists the ledger.
export async function renderProjects(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回项目台账…'));
  const data = await api<ProjectListResponse>('/projects');
  const list = el('ul', { class: 'items', 'data-view-item': 'projects' },
    ...(data.projects.length
      ? data.projects.map((p) => el('li', {}, `${p.name} · ${p.id}`))
      : [el('li', { class: 'view-hint' }, '尚无项目。在工作台新建项目后出现。')]));
  target.replaceChildren(
    el('h2', {}, '项目'),
    el('p', { class: 'view-hint' }, '真实读回 /api/projects。新建 / 选择项目在工作台执行；本页只读回台账，不修改。'),
    el('p', { class: 'eyebrow' }, `项目（${data.projects.length}）`),
    list);
}

// 创作工具 — read-back of the project's native task ledger. Submitting a native
// plan (Illustrator / Photoshop) and running/cancelling a task are HOST-DRIVEN
// actions that live in the workbench Advanced zone; this page only lists state.
export async function renderCreativeTools(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '创作工具', async (id) => {
    const tasks = await api<TaskListResponse>(`/projects/${id}/tasks`);
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, el('td', { colspan: '3' }, '尚无宿主任务。创作任务由 Illustrator / Photoshop 在工作台高级区提交。'))];
    return el('div', {},
      el('p', { class: 'view-hint' }, '宿主任务只读回 /api/projects/{id}/tasks。提交 / 运行 / 取消由宿主（Illustrator / Photoshop）在工作台执行；本页不触发实操。'),
      el('table', { class: 'resource-table' },
        el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
        el('tbody', {}, ...rows)),
      el('p', { class: 'eyebrow' }, `任务（${tasks.tasks.length}）`));
  });
}

// 交付中心 — read-back of the task ledger with an on-demand delivery note. The
// bundle ZIP is downloaded on demand from the workbench per task; nothing is
// packaged or shipped from this page.
export async function renderDeliverables(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '交付中心', async (id) => {
    const tasks = await api<TaskListResponse>(`/projects/${id}/tasks`);
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, el('td', { colspan: '3' }, '尚无任务。任务完成后交付包随读回导出。'))];
    return el('div', {},
      el('p', { class: 'view-hint' }, '交付包按任务在下载时打包（字体 / 链接 / rights / 质量仍需人工验收）。本页只读回任务台账，不下载也不打包。'),
      el('table', { class: 'resource-table' },
        el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
        el('tbody', {}, ...rows)),
      el('p', { class: 'eyebrow' }, `交付候选任务（${tasks.tasks.length}）`));
  });
}

// 证据系统 — read-back of the design layer: briefs, directions, the chosen
// direction, design-system bindings and the active binding. Version chains are
// read on demand from the workbench; this is a read-only evidence view.
export async function renderEvidence(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '证据系统', async (id) => {
    const layer = (await api<DesignLayerResponse>(`/projects/${id}/design-layer`)).design_layer;
    const chosen = layer.chosen_direction
      ? `${layer.chosen_direction.title} · v${layer.chosen_direction.version}` : '（尚未选定方向）';
    const active = layer.active_binding
      ? `${layer.active_binding.design_system_name} · 绑定 ${layer.active_binding.direction_id}` : '（无活动绑定）';
    const systems = el('ul', { class: 'items', 'data-view-item': 'evidence-systems' },
      ...layer.design_systems.map((s) => el('li', {}, `${s.name} · ${s.title} · v${s.version} · 证据 ${s.evidence_level}`)));
    return el('div', {},
      el('table', { class: 'resource-table' },
        el('tbody', {},
          el('tr', {}, el('th', { scope: 'row' }, 'briefs'), el('td', {}, String(layer.briefs.length))),
          el('tr', {}, el('th', { scope: 'row' }, 'directions'), el('td', {}, String(layer.directions.length))),
          el('tr', {}, el('th', { scope: 'row' }, '选定方向'), el('td', {}, chosen)),
          el('tr', {}, el('th', { scope: 'row' }, '活动绑定'), el('td', {}, active)))),
      el('p', { class: 'eyebrow' }, '设计系统登记'),
      systems,
      el('p', { class: 'view-hint' }, '版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。'));
  });
}

export async function renderRoute(view: RouteView, target: HTMLElement): Promise<void> {
  target.replaceChildren();
  switch (view) {
    case 'dashboard': await renderDashboard(target); return;
    case 'brand-systems': await renderBrandSystems(target); return;
    case 'preflight-qa': await renderPreflight(target); return;
    case 'settings': await renderSettings(target); return;
    case 'projects': await renderProjects(target); return;
    case 'creative-tools': await renderCreativeTools(target); return;
    case 'deliverables': await renderDeliverables(target); return;
    case 'evidence': await renderEvidence(target); return;
    default: {
      const notOpen = VIEW_NOT_OPEN[view];
      target.replaceChildren(
        el('h2', {}, notOpen ? view : '工作台'),
        el('p', { class: 'view-unopened' }, notOpen ?? '默认工作台。'));
      return;
    }
  }
}

// Build the shell once; route switching only swaps which region is shown.
export function mountAppShell(): void {
  const login = byId<HTMLDivElement>('login');
  const workspace = byId<HTMLDivElement>('workspace');
  const nav = el('nav', { class: 'app-nav', 'aria-label': 'DESIGN-LAB 导航' },
    el('span', { class: 'app-nav-brand' }, 'DESIGN-LAB'),
    ...ROUTE_VIEWS.map((route) => el('button', {
      type: 'button', class: 'app-nav-item', dataset: { route: route.view },
      onclick: () => { window.location.hash = route.hash === '' ? '' : route.hash; },
    }, route.label)),
    el('span', { class: 'app-nav-meta', id: 'shell-connection' }, '未连接'));
  const routePanel = el('div', { class: 'route-panel', hidden: true },
    el('div', { class: 'route-view', id: 'route-view', 'aria-live': 'polite' }));
  document.body.append(nav, routePanel);
  // Scope the shell's layout gutter to the mounted state so an unmounted path
  // (the E2E default) keeps the original centered layout untouched.
  document.body.classList.add('dl-shell');

  const active = (view: string): void => {
    for (const item of Array.from(nav.querySelectorAll<HTMLButtonElement>('.app-nav-item'))) {
      const selected = item.dataset.route === view;
      item.classList.toggle('active', selected);
      if (selected) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  };

  const current = (): RouteView => {
    const match = ROUTE_VIEWS.find((route) => route.hash === window.location.hash);
    return match ? match.view : 'workbench';
  };

  let routeGeneration = 0;

  const show = (): void => {
    const view = current();
    const showWorkbench = view === 'workbench';
    const generation = ++routeGeneration;
    const routeToken = token;
    routePanel.hidden = showWorkbench;
    login.hidden = showWorkbench ? connected : true;
    if (showWorkbench) {
      workspace.hidden = !connected;
      active('workbench');
      return;
    }
    login.hidden = true;
    workspace.hidden = true;
    active(view);
    const target = byId<HTMLDivElement>('route-view');
    if (!token) {
      // No service token in memory: the API views would only 401. Say so
      // instead of faking data (no phantom KPIs before a connection).
      target.replaceChildren(
        el('h2', {}, view),
        el('p', { class: 'view-unopened' }, '请先在工作台连接本机设计服务，再读回此视图。'));
      target.removeAttribute('aria-busy');
      return;
    }
    // Render off-DOM, then commit only if this is still the current route and
    // connection context. A slow success/error from an older route can never
    // overwrite the newer view's DOM.
    target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回当前视图…'));
    target.setAttribute('aria-busy', 'true');
    const pendingView = document.createElement('div');
    void renderRoute(view, pendingView).then(() => {
      if (generation !== routeGeneration || current() !== view || token !== routeToken) return;
      target.replaceChildren(...Array.from(pendingView.childNodes));
      target.removeAttribute('aria-busy');
    }).catch((error) => {
      if (generation !== routeGeneration || current() !== view || token !== routeToken) return;
      target.replaceChildren(el('p', { class: 'error' }, `视图读回失败：${errMsg(error)}`));
      target.removeAttribute('aria-busy');
    });
  };

  // Reflect the service connection badge into the shell meta slot.
  const connection = byId<HTMLSpanElement>('connection');
  const syncMeta = (): void => {
    byId<HTMLSpanElement>('shell-connection').textContent = connection.textContent || '未连接';
  };
  syncMeta();
  // The original handlers set #connection on connect/disconnect; a
  // MutationObserver keeps the shell copy in lockstep without touching them.
  if (typeof MutationObserver !== 'undefined')
    new MutationObserver(syncMeta).observe(connection, { childList: true, characterData: true });

  window.addEventListener('hashchange', show);
  show();
}

// Guard: the vm unit smoke executes the bundle with a DOM mock whose
// `document` has no `body` and whose context has no `window` — the mount
// only runs in a real browser when the login panel and a body element
// both exist. Idempotent via the document flag.
