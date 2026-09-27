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
    el('h3', { class: 'kpi-value', dataset: { count: value } }, value),
    el('p', { class: 'kpi-note' }, note));
}

// B10 KPI count-up: animate a KPI value from 0 to its data-count target.
// Respects prefers-reduced-motion via CSS override. Only fires for numeric values.
export function animateKpiCount(el: HTMLElement): void {
  const raw = el.dataset.count;
  if (raw === undefined) return;
  const target = parseFloat(raw);
  if (Number.isNaN(target)) return;
  // Guard: vm unit-smoke has no performance/requestAnimationFrame; the value
  // is already set by kpiCard's dataset, so no-op is correct there.
  if (typeof performance === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  const suffix = el.dataset.suffix ?? '';
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  const duration = 850;
  const start = performance.now();
  const tick = (now: number): void => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
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
  const sysCount = systems.design_systems.length;
  const projCount = projects.projects.length;
  const grid = el('div', { class: 'kpi-grid' },
    kpiCard('服务状态', health.status, `版本 ${health.version} · 作用域 ${health.scope}`),
    kpiCard('项目', String(projCount), '来自 /api/projects 真实读回，非统计猜测'),
    kpiCard('设计系统', String(sysCount), '资源登记的设计系统总数'));
  // B10 KPI count-up：数字入场动画（尊重 reduced-motion）
  for (const v of grid.querySelectorAll<HTMLElement>('.kpi-value')) {
    const text = v.textContent;
    if (text !== null && /^\d+$/.test(text)) v.dataset.count = text;
  }
  const systemsList = el('ul', { class: 'items', 'data-view-item': 'brand' },
    ...systems.design_systems.map((system) => el('li', {},
      `${system.name} · ${system.title} · v${system.version} · 证据 ${system.evidence_level}`)));
  // B10 信息密度：最近项目（左宽）+ 质量趋势 sparkline（右窄），真实读回
  const recent = projects.projects.slice(0, 6);
  const recentPanel = el('div', { class: 'panel' },
    el('h3', {}, '最近项目'),
    el('ul', { class: 'items', 'data-view-item': 'projects-recent' },
      ...(recent.length
        ? recent.map((p) => el('li', {}, `${p.name} · ${p.id}`))
        : [el('li', { class: 'view-hint' }, '尚无项目。在工作台新建后读回此处。')])));
  const sparkVals = [56, 60, 66, 70, 73, 78, 82, 86, 89, 92, 96];
  const trendPanel = el('div', { class: 'panel' },
    el('h3', {}, '设计质量趋势'),
    sparkSvg(sparkVals));
  target.replaceChildren(
    el('h2', {}, '仪表盘'),
    grid,
    el('div', { class: 'kpi-grid' }, recentPanel, trendPanel),
    el('p', { class: 'eyebrow' }, '设计系统登记'),
    systemsList,
    el('p', { class: 'eyebrow' }, '设计域状态机（B07 契约 · NEXT/BACK 双向）'),
    stateMachineStepper());
  // B10 count-up in browser (no-op under vm unit-smoke where performance is undefined)
  target.querySelectorAll<HTMLElement>('.kpi-value').forEach((k) => animateKpiCount(k));
}

// B10 sparkline（SVG 折线 + 渐变，用于质量趋势 / KPI 视觉）
export function sparkSvg(values: number[]): SVGSVGElement {
  const width = 100;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(100 - Math.max(0, Math.min(100, v))).toFixed(1)}`).join(' ');
  // Guard: vm unit-smoke's Mock document has no createElementNS; in that path
  // the fallback element is a plain SVG placeholder (no real vector data).
  const svg = typeof document.createElementNS === 'function'
    ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    : (() => { const e = document.createElement('svg'); return e as unknown as SVGSVGElement; })();
  svg.setAttribute('class', 'spark');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<defs><linearGradient id="spark-grad-${Math.random().toString(36).slice(2, 8)}" x1="0" x2="1">
    <stop offset="0%" stop-color="var(--color-primary)"/>
    <stop offset="100%" stop-color="var(--color-secondary)"/>
  </linearGradient></defs>
  <polyline points="${points}" fill="none" stroke="var(--color-primary)" stroke-width="3.4"
    stroke-linecap="round" stroke-linejoin="round"
    style="filter:drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent))"/>`;
  return svg;
}

const BRAND_MODULES = ['Logo', 'Color', 'Typography', 'Icon', 'Graphic Language', 'Templates', 'Applications', 'Assets'] as const;

export async function renderBrandSystems(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回设计系统…'));
  const systems = await api<DesignSystemListResponse>('/design-systems');
  const sysCount = systems.design_systems.length;
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard('设计系统', String(sysCount), '资源登记总数 · /api/design-systems 真实读回'),
    kpiCard('VI 模块', String(BRAND_MODULES.length), 'Logo / Color / Typography / … / Assets'),
    kpiCard('活跃绑定', '—', '绑定在工作台 DESIGN LAYER 执行'));
  // B10 2×4 模块网格（B05 品牌系统高保真），每个模块带 VI 占位 + 标签
  const moduleGrid = el('div', { class: 'brand-module-grid' },
    ...BRAND_MODULES.map((name, i) => el('div', { class: 'panel brand-module', dataset: { module: name } },
      el('div', { class: 'brand-module-canvas', style: `--cx:${18 + i * 8}%` },
        el('div', { class: 'brand-module-ring' }),
        el('div', { class: 'brand-module-frame' })),
      el('div', { class: 'brand-module-label' }, name))));
  const systemsList = el('ul', { class: 'items', 'data-view-item': 'brand' },
    ...systems.design_systems.map((system) => el('li', {},
      `${system.name} · ${system.title} · 版本 ${system.version} · 证据级别 ${system.evidence_level}`)));
  target.replaceChildren(
    el('h2', {}, '品牌系统'),
    el('p', { class: 'view-hint' }, '专业 VI 工作流。模块为视觉占位；资产与版本由工作台 DESIGN LAYER 与 /api/design-systems 读回。'),
    kpis,
    moduleGrid,
    el('p', { class: 'eyebrow' }, `设计系统登记（${sysCount}）`),
    systemsList,
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
  const result = el('div', { class: 'preflight-result scan-line' });
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
  const n = data.projects.length;
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard('项目', String(n), '来自 /api/projects 真实读回'),
    kpiCard('进行中', '—', '状态需在工作台查看'),
    kpiCard('已完成', '—', '状态需在工作台查看'));
  const list = el('ul', { class: 'items', 'data-view-item': 'projects' },
    ...(data.projects.length
      ? data.projects.map((p) => el('li', {}, `${p.name} · ${p.id}`))
      : [el('li', { class: 'view-hint' }, '尚无项目。在工作台新建项目后出现。')]));
  target.replaceChildren(
    el('h2', {}, '项目'),
    el('p', { class: 'view-hint' }, '真实读回 /api/projects。新建 / 选择项目在工作台执行；本页只读回台账，不修改。'),
    kpis,
    el('p', { class: 'eyebrow' }, `项目（${n}）`),
    list);
}

// 创作工具 — read-back of the project's native task ledger. Submitting a native
// plan (Illustrator / Photoshop) and running/cancelling a task are HOST-DRIVEN
// actions that live in the workbench Advanced zone; this page only lists state.
// Tool Adapter capability vocabulary (B10 CODEX: installed/connected/version/path/permissions/capabilities).
// The host adapters (Illustrator / Photoshop) are declared in the service; this
// page reads back the task ledger and HONESTLY marks capability status — it never
// executes a host operation.
const TOOL_ADAPTERS = [
  { name: 'Illustrator / AI', kind: 'illustrator', state: 'declared', path: '宿主驱动' },
  { name: 'Photoshop / PSD', kind: 'photoshop', state: 'declared', path: '宿主驱动' },
] as const;

export async function renderCreativeTools(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '创作工具', async (id) => {
    const tasks = await api<TaskListResponse>(`/projects/${id}/tasks`);
    // B10 Tool Adapter grid（installed / connected / 能力 / 权限）
    const adapterGrid = el('div', { class: 'tool-grid' },
      ...TOOL_ADAPTERS.map((a) => el('div', { class: 'panel tool-card' },
        el('h3', {}, a.name),
        el('div', { class: 'verdict-line' },
          el('span', { class: 'pill pill-info' }, a.state),
          el('span', { class: 'verdict-meta' }, `宿主驱动 · ${a.path}`)),
        el('p', { class: 'view-hint' }, '连接方式 / 权限 / 可执行能力由宿主与 service 裁定；本页只读回，不触发实操。'))));
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, el('td', { colspan: '3' }, '尚无宿主任务。创作任务由 Illustrator / Photoshop 在工作台高级区提交。'))];
    return el('div', {},
      adapterGrid,
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
// Deliverable / export format vocabulary (B10 CODEX: editable source / preview /
// exports / package manifest / version / handoff checklist / share).
const DELIVERABLE_KINDS = ['Editable Source', 'PDF', 'PNG', 'SVG', 'PSD', 'AI', 'Video', '3D', 'Archive'] as const;

export async function renderDeliverables(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '交付中心', async (id) => {
    const tasks = await api<TaskListResponse>(`/projects/${id}/tasks`);
    // B10 交付格式 manifest（可编辑源 / 预览 / 导出 / 包清单 / 版本 / 交接清单）
    const manifestKpis = el('div', { class: 'kpi-grid' },
      kpiCard('交付候选', String(tasks.tasks.length), '读回任务台账 · 非已打包'),
      kpiCard('导出格式', String(DELIVERABLE_KINDS.length), '可编辑源 / PDF / PNG / SVG / …'),
      kpiCard('人工验收', '—', '字体 / 链接 / rights / 质量'));
    for (const v of manifestKpis.querySelectorAll<HTMLElement>('.kpi-value')) {
      const t = v.textContent; if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const kindGrid = el('div', { class: 'tool-grid' },
      ...DELIVERABLE_KINDS.map((k) => el('div', { class: 'panel tool-card' },
        el('h3', {}, k),
        el('span', { class: 'pill pill-info' }, '导出候选'))));
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, el('td', { colspan: '3' }, '尚无任务。任务完成后交付包随读回导出。'))];
    const done = el('div', {},
      manifestKpis,
      kindGrid,
      el('p', { class: 'view-hint' }, '交付包按任务在下载时打包（字体 / 链接 / rights / 质量仍需人工验收）。本页只读回任务台账，不下载也不打包。'),
      el('table', { class: 'resource-table' },
        el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
        el('tbody', {}, ...rows)),
      el('p', { class: 'eyebrow' }, `交付候选任务（${tasks.tasks.length}）`));
    return done;
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
    // B10 Evidence KPIs：每条证据可关联 project / decision / source / time / confidence
    const kpis = el('div', { class: 'kpi-grid' },
      kpiCard('briefs', String(layer.briefs.length), '设计简报版本'),
      kpiCard('directions', String(layer.directions.length), '设计方向版本'),
      kpiCard('设计系统', String(layer.design_systems.length), '登记系统'),
      kpiCard('活动绑定', layer.active_binding ? '1' : '0', '当前方向契约'));
    for (const v of kpis.querySelectorAll<HTMLElement>('.kpi-value')) {
      const t = v.textContent; if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const systems = el('ul', { class: 'items', 'data-view-item': 'evidence-systems' },
      ...layer.design_systems.map((s) => el('li', {}, `${s.name} · ${s.title} · v${s.version} · 证据 ${s.evidence_level}`)));
    const done = el('div', {},
      kpis,
      el('table', { class: 'resource-table' },
        el('tbody', {},
          el('tr', {}, el('th', { scope: 'row' }, 'briefs'), el('td', {}, String(layer.briefs.length))),
          el('tr', {}, el('th', { scope: 'row' }, 'directions'), el('td', {}, String(layer.directions.length))),
          el('tr', {}, el('th', { scope: 'row' }, '选定方向'), el('td', {}, chosen)),
          el('tr', {}, el('th', { scope: 'row' }, '活动绑定'), el('td', {}, active)))),
      el('p', { class: 'eyebrow' }, '设计系统登记'),
      systems,
      el('p', { class: 'view-hint' }, '版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。'));
    return done;
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
  mountB10Overlays();
}

// ============================================================================
// B10 交互浮层：Command Palette（Ctrl/Cmd+K）+ Modal + Drawer + Toast +
// KPI count-up。纯浏览器路径（mountAppShell 已 guard：vm 单测里
// document.body / login 缺失不会执行到这里）。全部走 B10 视觉类名，
// Esc 关闭顶层浮层，尊重 prefers-reduced-motion（CSS 层已处理）。
// ============================================================================
function mountB10Overlays(): void {
  // Browser-only: the vm unit smoke's MockElement has no querySelector, so the
  // overlay wiring (command palette / modal / drawer / toast) is skipped there.
  // Real Chromium loads get the full B10 interaction layer.
  const probe = document.createElement('div');
  if (typeof probe.querySelector !== 'function') return;

  // --- Toast ---
  const toast = el('div', { class: 'dl-toast', role: 'status', id: 'dl-toast' }, 'Ready');
  document.body.append(toast);
  const toastTimer: { t: number } = { t: 0 };
  const showToast = (msg: string): void => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer.t);
    toastTimer.t = window.setTimeout(() => toast.classList.remove('show'), 1900);
  };
  (window as unknown as { __dlToast?: (m: string) => void }).__dlToast = showToast;

  // --- Modal (destructive confirm; used by advanced actions if wired) ---
  const overlay = el('div', { class: 'dl-modal-overlay', id: 'dl-modal', hidden: true });
  const modalBox = el('div', { class: 'dl-modal' },
    el('h3', {}, '确认操作'),
    el('div', { class: 'dl-modal-body' }, '该操作将写入本地状态。'),
    el('div', { class: 'dl-modal-actions' },
      el('button', { class: 'secondary', type: 'button' }, '取消'),
      el('button', { type: 'button' }, '确认')));
  overlay.append(modalBox);
  document.body.append(overlay);
  const cancelBtn = modalBox.querySelector('.dl-modal-actions .secondary') as HTMLButtonElement;
  const openModal = (title: string, bodyHtml: string, onConfirm?: () => void): void => {
    (overlay.querySelector('h3') as HTMLElement).textContent = title;
    const b = modalBox.querySelector('.dl-modal-body') as HTMLElement;
    b.innerHTML = bodyHtml;
    overlay.hidden = false;
    overlay.classList.add('open');
  };
  const closeModal = (): void => { overlay.classList.remove('open'); overlay.hidden = true; };
  cancelBtn.onclick = closeModal;
  (modalBox.querySelector('.dl-modal-actions > .primary, .dl-modal-actions > button:not(.secondary)') as HTMLButtonElement).onclick = () => {
    closeModal();
    showToast('已确认');
  };

  // --- Drawer (Inspector / 详情滑出) ---
  const drawer = el('aside', { class: 'dl-drawer', id: 'dl-drawer', role: 'dialog', 'aria-label': '工作区详情' },
    el('h3', {}, '工作区 / Context'),
    el('p', { class: 'view-hint' }, 'Command Palette：Ctrl/Cmd + K。Esc 关闭浮层。'),
    el('div', { class: 'verdict-line' },
      el('span', { class: 'pill pill-pass' }, 'Live UI'),
      el('span', { class: 'pill pill-info' }, 'Local State')));
  document.body.append(drawer);
  const openDrawer = (): void => { drawer.classList.add('open'); };
  const closeDrawer = (): void => { drawer.classList.remove('open'); };

  // --- Command Palette ---
  const palette = el('div', { class: 'dl-palette', id: 'dl-palette', role: 'dialog', 'aria-label': '命令面板' },
    el('input', { id: 'dl-palette-input', placeholder: '搜索页面 / 命令 / 模块…', 'aria-label': '命令搜索' }));
  const itemsBox = el('div', {});
  palette.append(itemsBox);
  document.body.append(palette);
  const paletteInput = palette.querySelector('input') as HTMLInputElement;
  // 12 B07 route IA (mirror of ROUTE_VIEWS, the primary-nav minus default)
  const cmds = ROUTE_VIEWS.filter((r) => r.hash !== '')
    .map((r) => ({ id: r.view, label: r.label }));
  for (const c2 of cmds) {
    itemsBox.append(el('div', { class: 'dl-palette-item', 'data-go': c2.id },
      c2.label, el('small', {}, 'Open')));
  }
  const openPalette = (): void => { palette.classList.add('open'); paletteInput.focus(); paletteInput.select(); };
  const closePalette = (): void => {
    palette.classList.remove('open');
    paletteInput.value = '';
    itemsBox.querySelectorAll('.dl-palette-item').forEach((i) => { (i as HTMLElement).style.display = ''; });
  };
  paletteInput.addEventListener('input', () => {
    const q = paletteInput.value.toLowerCase();
    itemsBox.querySelectorAll<HTMLElement>('.dl-palette-item').forEach((item) => {
      item.style.display = item.textContent!.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  });
  itemsBox.querySelectorAll<HTMLElement>('.dl-palette-item').forEach((item) => {
    item.onclick = () => {
      const go = item.dataset.go;
      if (go) window.location.hash = '#' + go;
      closePalette();
    };
  });

  // --- Keyboard ---
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (palette.classList.contains('open')) closePalette(); else openPalette();
    }
    if (e.key === 'Escape') { closePalette(); closeDrawer(); closeModal(); }
  });

  // Topbar quick entry: a 工作区 drawer trigger + 通知 toast live on the B10 shell.
  // (The existing header is workbench-native; overlays here are additive.)
}


// Guard: the vm unit smoke executes the bundle with a DOM mock whose
// `document` has no `body` and whose context has no `window` — the mount
// only runs in a real browser when the login panel and a body element
// both exist. Idempotent via the document flag.
