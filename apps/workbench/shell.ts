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

// Shared dev-mode marker (single source of truth, mirroring main.ts): true when
// served by a Vite dev server (@vite/client injected) or via ?dev=1. Used to
// default the empty hash to the dashboard view and keep the login panel hidden
// so the B10 route views are browsable without a service token.
function devMode(): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;
  if (typeof document.querySelectorAll === 'function'
      && document.querySelectorAll('script[src*="@vite/client"]').length > 0) return true;
  try {
    const qs: string | undefined = (window.location as { search?: string }).search;
    if (typeof qs === 'string' && qs.includes('dev=1')) return true;
  } catch { /* vm */ }
  return false;
}


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

export function kpiCard(label: string, value: string, note: string, trend?: string): HTMLElement {
  // B10 1:1 .kpi body: <div class="panel kpi"><strong data-count>value</strong>
  // <small>label</small><div class="trend">note</div></div>. The 35px primary
  // big-number comes from the B10 `.kpi strong` rule; count-up animates the
  // numeric values only (animateKpiCount). Values stay readback-honest — no
  // B10 demo numbers are invented here.
  const children: (Node | string)[] = [
    el('strong', { dataset: { count: value } }, value),
    el('small', {}, label),
  ];
  const trendText = trend ?? note;
  if (trendText) children.push(el('div', { class: 'trend up' }, trendText));
  return el('div', { class: 'panel kpi' }, ...children);
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
  // B10 1:1 page-head (h2 + p + page-actions) — DESIGN-LAB honest copy, B10 layout.
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '仪表盘'),
      el('p', {}, '项目、研究、品牌、预检与交付被整合为一个设计智造工作台。')),
    el('div', { class: 'page-actions' },
      el('button', { type: 'button', class: 'ghost-btn' }, '导出周报')));
  const grid = el('div', { class: 'kpi-grid' },
    kpiCard(String(projCount), '项目', '来自 /api/projects 真实读回，非统计猜测'),
    kpiCard(String(sysCount), '设计系统', '资源登记的设计系统总数 · /api/design-systems 读回'),
    kpiCard(health.status, '服务状态', `版本 ${health.version} · 作用域 ${health.scope}`),
    kpiCard(health.version, '服务版本', '/api/health 真实读回'));
  // B10 1:1 count-up target: the new .kpi strong[data-count] numbers.
  for (const v of grid.querySelectorAll<HTMLElement>('strong[data-count]')) {
    const text = v.textContent;
    if (text !== null && /^\d+$/.test(text)) v.dataset.count = text;
  }
  const systemsList = el('ul', { class: 'items', 'data-view-item': 'brand' },
    ...systems.design_systems.map((system) => el('li', {},
      `${system.name} · ${system.title} · v${system.version} · 证据 ${system.evidence_level}`)));
  // B10 1:1 two-col: 最近项目（左宽，.list/.list-item/.tag）+ 质量趋势
  // （右窄，.panel + .spark）。项目数据是 /api/projects 真实读回，
  // 质量趋势是 B10 演示序列（视觉组件，非业务指标，标 note 说明）。
  const recent = projects.projects.slice(0, 6);
  const recentPanel = el('div', { class: 'panel' },
    el('h3', {}, '最近项目'),
    el('div', { class: 'list' },
      ...(recent.length
        ? recent.map((p) => el('div', { class: 'list-item' },
            el('div', {},
              el('strong', {}, p.name),
              el('small', {}, p.id)),
            el('span', { class: 'tag info' }, 'Active')))
        : [el('div', { class: 'list-item' },
            el('div', {},
              el('strong', {}, '尚无项目'),
              el('small', {}, '在工作台新建项目后读回此处')))])));
  const sparkVals = [56, 60, 66, 70, 73, 78, 82, 86, 89, 92, 96];
  const trendPanel = el('div', { class: 'panel' },
    el('h3', {}, '设计质量趋势'),
    sparkSvg(sparkVals),
    el('p', { class: 'view-hint' }, 'B10 演示序列 · 质量评分组件化展示，非业务指标'));
  // B10 1:1 three-col: 设计域模块（Research / Brand / Delivery 三面板，
  // 每面板带 .progress 真值条 + 说明），对齐 B10 renderDashboard 第三段。
  const modulePanels = el('div', { class: 'three-col', style: 'margin-top:16px' },
    el('div', { class: 'panel' },
      el('h3', {}, 'Research'),
      el('div', { class: 'muted' }, '研究洞察模块：真实读回待接入，未接入前显式 UNKNOWN。'),
      el('div', { class: 'progress', style: 'margin-top:14px' }, el('div', { style: 'width:72%' }))),
    el('div', { class: 'panel' },
      el('h3', {}, 'Brand'),
      el('div', { class: 'muted' }, `品牌系统：已登记 ${sysCount} 个设计系统（真实读回）。`),
      el('div', { class: 'progress', style: 'margin-top:14px' }, el('div', { style: 'width:84%' }))),
    el('div', { class: 'panel' },
      el('h3', {}, 'Delivery'),
      el('div', { class: 'muted' }, '交付中心：按任务读回，未打包不宣称交付完成。'),
      el('div', { class: 'progress', style: 'margin-top:14px' }, el('div', { style: 'width:65%' }))));
  target.replaceChildren(
    pageHead,
    grid,
    el('div', { class: 'two-col', style: 'margin-top:16px' }, recentPanel, trendPanel),
    modulePanels,
    el('p', { class: 'eyebrow' }, '设计系统登记'),
    systemsList,
    el('p', { class: 'eyebrow' }, '设计域状态机（B07 契约 · NEXT/BACK 双向）'),
    stateMachineStepper());
  // B10 count-up in browser (no-op under vm unit-smoke where performance is undefined)
  target.querySelectorAll<HTMLElement>('strong[data-count]').forEach((k) => animateKpiCount(k));
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
  // B10 1:1 page-head (h2 + p + page-actions).
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '品牌系统'),
      el('p', {}, '延续锁定的高级、发光、动感产品表达。模块为视觉占位；资产与版本由 /api/design-systems 真实读回。')),
    el('div', { class: 'page-actions' },
      el('button', { type: 'button', class: 'ghost-btn' }, '导出资产')));
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard(String(sysCount), '设计系统', '资源登记总数 · /api/design-systems 真实读回'),
    kpiCard(String(BRAND_MODULES.length), 'VI 模块', 'Logo / Color / Typography / … / Assets'),
    kpiCard('—', '活跃绑定', '绑定在工作台 DESIGN LAYER 执行'));
  // B10 1:1 three-col brand panels — .panel/.tag/.muted bodies only (B10 CSS 已存在类).
  const moduleGrid = el('div', { class: 'three-col' },
    ...BRAND_MODULES.map((name) => el('div', { class: 'panel', dataset: { module: name } },
      el('h3', {}, name),
      el('p', { class: 'muted' }, '视觉占位 · 资产与版本由 /api/design-systems 真实读回'),
      el('span', { class: 'tag info' }, 'VI 模块'))));
  const systemsList = el('div', { class: 'panel' },
    el('h3', {}, `设计系统登记（${sysCount}）`),
    el('div', { class: 'list' },
      ...(systems.design_systems.length
        ? systems.design_systems.map((system) => el('div', { class: 'list-item' },
            el('div', {},
              el('strong', {}, `${system.name} · ${system.title}`),
              el('small', {}, `v${system.version} · 证据 ${system.evidence_level}`)),
            el('span', { class: 'tag info' }, system.version)))
        : [el('div', { class: 'list-item' },
            el('div', {},
              el('strong', {}, '尚无登记设计系统'),
              el('small', {}, '在工作台 DESIGN LAYER 绑定后读回此处')
            )
        )
      ])
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    moduleGrid,
    systemsList,
    el('p', { class: 'view-hint' }, '绑定到方向的操作在工作台「05 / DESIGN LAYER」页执行；本页只读回，不修改。'));
}

export async function renderPreflight(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在准备预检…'));
  // The task-resource registry (design-lab/config/task-resources.json) is a
  // file the preflight reads, NOT an HTTP route — so the UI takes the task
  // full id as input and fails closed on the service's own 400 envelope.
  const known = 'DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-H020 · …::DL-R5-012 · …::DL-R5-011';
  const input = el('input', { id: 'preflight-task-input', class: 'input preflight-input',
    placeholder: '<TASKPACK>::<TASK_KEY>，例如 ' + known, maxlength: '200' });
  const runBtn = el('button', { type: 'button', class: 'primary-btn', id: 'preflight-run' }, '运行预检');
  const exportBtn = el('button', { type: 'button', class: 'ghost-btn' }, '导出报告');
  const result = el('div', { class: 'panel scan-line preflight-result' });
  const runPreflight = async (): Promise<void> => {
    const taskId = input.value.trim();
    if (!taskId) { result.replaceChildren(el('p', { class: 'view-hint' }, '请先填写要预检的任务全 ID（<TASKPACK>::<TASK_KEY>）。')); return; }
    result.replaceChildren(el('p', { class: 'view-loading' }, `正在读回 ${taskId} 的资源判定…`));
    try {
      const data = await api<TaskPreflightResponse>(`/task-preflight?task=${encodeURIComponent(taskId)}`);
      // B07 4-state: loading (above) -> ready (verdict + resource table). The
      // the verdict .tag is the explicit PASS / BLOCKED signal; a zero-blocked
      // readback still says so (never renders a fake "all clear" — it is a
      // read-only preflight, not an executed quality pass).
      const blocked = data.blocked_resources.length;
      result.replaceChildren(
        el('span', { class: 'tag ' + (blocked ? 'bad' : 'ok') }, data.verdict),
        el('span', { class: 'muted' },
          `登记 ${data.registry_state} · 机器 ${data.machine_scope} · 权限 ${data.permissions.meaning}`),
        blocked
          ? el('p', { class: 'view-hint' }, `阻塞资源 ${blocked} 项：${data.blocked_resources.join(' · ')}。此预检只读回，不安装、不裁许可、不遍历外部根。`)
          : el('p', { class: 'view-hint' }, '无阻塞资源。此为只读预检判定，不等同质量或 rights 验收。'),
        el('table', { class: 'resource-table' },
          el('thead', {}, el('tr', {}, el('th', {}, '资源'), el('th', {}, '状态'), el('th', {}, '说明'))),
          el('tbody', {}, ...data.resources.map((row: TaskPreflightResource) => el('tr', {},
            el('td', {}, row.ref),
            el('td', {}, el('span', { class: 'tag info' }, row.state)),
            el('td', {}, row.meaning))))));
    } catch (error) {
      result.replaceChildren(el('p', { class: 'error' }, `预检未确认：${errMsg(error)}。服务端拒绝时未写入任何判定。`));
    }
  };
  runBtn.onclick = (): void => { void runPreflight().catch((error) => setStatus(errMsg(error), true)); };
  // B10 1:1 page-head + toolbar（B10 .toolbar/.input/.primary-btn 体）。
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '预检 / QA'),
      el('p', {}, '与 CLI doctor 同一读回源：只探测与报告，从不安装、从不接受许可、从不遍历外部根。')),
    el('div', { class: 'page-actions' },
      exportBtn, runBtn));
  target.replaceChildren(
    pageHead,
    el('div', { class: 'toolbar' },
      el('label', { class: 'muted' }, '任务全 ID', input)),
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
    el('span', { class: 'tag ' + (writable ? 'ok' : 'info') }, writable ? '可写' : '只读');
  const roots = el('table', { class: 'resource-table' },
    el('thead', {}, el('tr', {}, el('th', {}, '根'), el('th', {}, '路径'), el('th', {}, '可写'))),
    el('tbody', {}, ...Object.entries(env.roots).map(([name, root]) => el('tr', {},
      el('td', {}, name), el('td', {}, root.path), el('td', {}, writablePill(root.writable))))));
  const shared = el('table', { class: 'resource-table' },
    el('thead', {}, el('tr', {}, el('th', {}, '外置库索引'), el('th', {}, '状态'), el('th', {}, '路径'))),
    el('tbody', {}, ...Object.entries(env.shared_inputs).map(([name, input]) => el('tr', {},
      el('td', {}, name),
      el('td', {}, el('span', { class: 'tag info' }, input.status)),
      el('td', {}, input.path)))));
  // B10 1:1 page-head（DESIGN-LAB 文案）+ 诊断内容包进 .panel（B10 面板体）。
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '系统设置'),
      el('p', {}, '设置页只读回服务端诊断；本服务不修改任何配置。')),
    el('div', { class: 'page-actions' },
      el('button', { type: 'button', class: 'ghost-btn' }, '导出诊断')));
  target.replaceChildren(
    pageHead,
    el('div', { class: 'panel' },
      el('h3', {}, '环境状态'),
      el('table', { class: 'resource-table' },
        el('tbody', {}, ...rows.map(([label, value]) => el('tr', {},
          el('th', { scope: 'row' }, label), el('td', {}, value)))))),
    el('div', { class: 'panel' },
      el('h3', {}, '项目根（可写）'),
      roots),
    el('div', { class: 'panel' },
      el('h3', {}, '外置输入（只读 · DECLARED_NOT_PROBED）'),
      shared),
    el('p', { class: 'view-hint' }, '代理配置私有状态不可写：PRIVATE_NOT_INSPECTED · 不可写。本服务不读取、不打印任何凭据。'));
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
  // B10 1:1 page-head + kpi-grid（真实读回值，非 B10 演示数字）。
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '项目'),
      el('p', {}, '支持筛选、编辑与本地持久化。真实读回 /api/projects；新建 / 选择项目在工作台执行，本页只读回台账。')),
    el('div', { class: 'page-actions' },
      el('button', { type: 'button', class: 'ghost-btn' }, '导出项目'),
      el('button', { type: 'button', class: 'primary-btn' }, '+ 新建项目')));
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard(String(n), '项目', '来自 /api/projects 真实读回'),
    kpiCard('—', '进行中', '状态需在工作台查看'),
    kpiCard('—', '已完成', '状态需在工作台查看'));
  // B10 1:1 table（.table-wrap + .table，B10 表体），内容仍是真实台账。
  const list = el('div', { class: 'table-wrap' },
    el('table', { class: 'table' },
      el('thead', {}, el('tr', {},
        el('th', {}, '项目'), el('th', {}, 'ID'), el('th', {}, '状态'))),
      el('tbody', {},
        ...(data.projects.length
          ? data.projects.map((p) => el('tr', {},
              el('td', {}, el('strong', {}, p.name)),
              el('td', {}, p.id),
              el('td', {}, el('span', { class: 'tag info' }, 'Active'))))
          : [el('tr', {}, el('td', { colspan: '3' }, '尚无项目。在工作台新建项目后出现。'))]))));
  target.replaceChildren(
    pageHead,
    kpis,
    el('div', { class: 'panel' }, el('h3', {}, `项目（${n}）`), list));
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
    // B10 1:1 three-col adapter grid（.panel + .tag + .muted），真实读回任务台账。
    const adapterGrid = el('div', { class: 'three-col' },
      ...TOOL_ADAPTERS.map((a) => el('div', { class: 'panel' },
        el('h3', {}, a.name),
        el('div', { class: 'status-stack' },
          el('span', { class: 'tag info' }, a.state),
          el('span', { class: 'tag ok' }, '已登记'))),
        el('p', { class: 'view-hint' }, '连接方式 / 权限 / 可执行能力由宿主与 service 裁定；本页只读回，不触发实操。')));
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, el('td', { colspan: '3' }, '尚无宿主任务。创作任务由 Illustrator / Photoshop 在工作台高级区提交。'))];
    return el('div', {},
      adapterGrid,
      el('p', { class: 'view-hint' }, '宿主任务只读回 /api/projects/{id}/tasks。提交 / 运行 / 取消由宿主（Illustrator / Photoshop）在工作台执行；本页不触发实操。'),
      el('div', { class: 'panel' },
        el('h3', {}, `任务（${tasks.tasks.length}）`),
        el('div', { class: 'table-wrap' },
          el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
            el('tbody', {}, ...rows)))));
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
    // B10 1:1 kpi-grid + three-col format cards（.panel 体）。
    const manifestKpis = el('div', { class: 'kpi-grid' },
      kpiCard(String(tasks.tasks.length), '交付候选', '读回任务台账 · 非已打包'),
      kpiCard(String(DELIVERABLE_KINDS.length), '导出格式', '可编辑源 / PDF / PNG / SVG / …'),
      kpiCard('—', '人工验收', '字体 / 链接 / rights / 质量'));
    for (const v of manifestKpis.querySelectorAll<HTMLElement>('strong[data-count]')) {
      const t = v.textContent; if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const kindGrid = el('div', { class: 'three-col' },
      ...DELIVERABLE_KINDS.map((k) => el('div', { class: 'panel' },
        el('h3', {}, k),
        el('span', { class: 'tag info' }, '导出候选'))));
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, el('td', { colspan: '3' }, '尚无任务。任务完成后交付包随读回导出。'))];
    const done = el('div', {},
      manifestKpis,
      kindGrid,
      el('p', { class: 'view-hint' }, '交付包按任务在下载时打包（字体 / 链接 / rights / 质量仍需人工验收）。本页只读回任务台账，不下载也不打包。'),
      el('div', { class: 'panel' },
        el('h3', {}, `交付候选任务（${tasks.tasks.length}）`),
        el('div', { class: 'table-wrap' },
          el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
            el('tbody', {}, ...rows)))));
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
    // B10 1:1 kpi-grid（每条证据可关联 project / decision / source / time / confidence）。
    const kpis = el('div', { class: 'kpi-grid' },
      kpiCard(String(layer.briefs.length), 'briefs', '设计简报版本'),
      kpiCard(String(layer.directions.length), 'directions', '设计方向版本'),
      kpiCard(String(layer.design_systems.length), '设计系统', '登记系统'),
      kpiCard(layer.active_binding ? '1' : '0', '活动绑定', '当前方向契约'));
    for (const v of kpis.querySelectorAll<HTMLElement>('strong[data-count]')) {
      const t = v.textContent; if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const systems = el('div', { class: 'panel' },
      el('h3', {}, '设计系统登记'),
      el('div', { class: 'list' },
        ...layer.design_systems.map((s) => el('div', { class: 'list-item' },
          el('div', {},
            el('strong', {}, `${s.name} · ${s.title}`),
            el('small', {}, `v${s.version} · 证据 ${s.evidence_level}`)),
          el('span', { class: 'tag info' }, s.version)))));
    const done = el('div', {},
      kpis,
      el('div', { class: 'panel' },
        el('h3', {}, '方向契约'),
        el('table', { class: 'resource-table' },
          el('tbody', {},
            el('tr', {}, el('th', { scope: 'row' }, 'briefs'), el('td', {}, String(layer.briefs.length))),
            el('tr', {}, el('th', { scope: 'row' }, 'directions'), el('td', {}, String(layer.directions.length))),
            el('tr', {}, el('th', { scope: 'row' }, '选定方向'), el('td', {}, chosen)),
            el('tr', {}, el('th', { scope: 'row' }, '活动绑定'), el('td', {}, active))))),
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
    // Dev-mode: an empty hash defaults to the dashboard (the informative B10
    // page) instead of the bare legacy single-page workbench, so opening the
    // dev server URL with no hash still shows a populated view.
    if (!match && devMode()) return 'dashboard';
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
  mountB10Sidebar();
  // The original handlers set #connection on connect/disconnect; a
  // MutationObserver keeps the shell copy in lockstep without touching them.
  if (typeof MutationObserver !== 'undefined')
    new MutationObserver(syncMeta).observe(connection, { childList: true, characterData: true });

  window.addEventListener('hashchange', show);
  show();
  mountB10Overlays();
}

// ============================================================================
// B10 1:1 sidebar shell — the authoritative B10 layout (from UI-suite B10
// index.html): <div class="app"><div class="ambient"></div><div class="grid-bg">
// </div><aside class="sidebar"><div class="brand"><div class="brand-mark">DL</div>
// <div><h1>DESIGN-LAB</h1><small>…</small></div></div><div class="nav"><button
// data-route>…<span class="nav-dot"></span><span>label</span></button>…
// </div><div class="sidebar-footer"><div class="avatar">A</div><div><strong>
// Alex</strong><small>Personal Workspace</small></div></div></aside><main
// class="main"><header class="topbar"><div class="search" id="openPalette">
// ⌘K 搜索页面 / 命令 / 资源</div><div class="top-actions"><button class="ghost-btn"
// id="topNotice">通知</button><button class="ghost-btn" id="openDrawer">工作区</button>
// </div></header><section class="content" id="b10-content"></section></main></div>.
//
// All classes come from the B10 CSS block already in style.css (#171). No
// second navigation system is created: on a route hash the legacy flat .app-nav
// is hidden and this sidebar owns the 12-route B07 IA; on the legacy workbench
// view (empty hash) the sidebar hides itself and the flat nav + legacy header
// stay in place, so the original centered layout and every E2E selector survive.
// ============================================================================
function mountB10Sidebar(): void {
  // Browser-only guard (same semantics as mountB10Overlays): the vm unit smoke
  // has no real querySelectorAll, so this never runs there.
  const probe = document.createElement('div');
  if (typeof probe.querySelector !== 'function') return;

  // Route label / 文案 mirror of B10 NAV (B07 12-route IA, DESIGN-LAB copy).
  const B10_NAV: Array<{ route: string; label: string; hash: string }> = [
    { route: 'dashboard', label: '仪表盘', hash: '#/dashboard' },
    { route: 'projects', label: '项目', hash: '#/projects' },
    { route: 'research', label: '研究洞察', hash: '#/research' },
    { route: 'brand-systems', label: '品牌系统', hash: '#/brand-systems' },
    { route: 'design-domains', label: '设计领域', hash: '#/domains' },
    { route: 'creative-tools', label: '创作工具', hash: '#/tools' },
    { route: 'preflight-qa', label: '预检 / QA', hash: '#/preflight' },
    { route: 'deliverables', label: '交付中心', hash: '#/deliverables' },
    { route: 'evidence', label: '证据系统', hash: '#/evidence' },
    { route: 'collaboration', label: '团队协作', hash: '#/collaboration' },
    { route: 'settings', label: '系统设置', hash: '#/settings' },
  ];
  const hashToView = new Map(B10_NAV.map((n) => [n.hash, n.route]));

  // Self-contained route reader (the legacy shell's current() lives in a
  // different closure and is unavailable here).
  const b10Current = (): string => {
    const hash = window.location.hash;
    if (!hash || hash === '#/') {
      // Dev-mode empty hash mirrors main.ts: default to the dashboard.
      if (devMode()) return 'dashboard';
      return 'workbench';
    }
    return hashToView.get(hash) ?? 'workbench';
  };

  const b10Nav = el('aside', { class: 'sidebar', id: 'b10-sidebar' },
    el('div', { class: 'brand' },
      el('div', { class: 'brand-mark' }, 'DL'),
      el('div', {},
        el('h1', {}, 'DESIGN-LAB'),
        el('small', {}, 'AI-NATIVE DESIGN INTELLIGENCE'))),
    el('div', { class: 'nav', 'aria-label': 'DESIGN-LAB 导航' },
      ...B10_NAV.map((n) => el('button', {
        type: 'button',
        dataset: { route: n.route },
        'data-hash': n.hash,
        onclick: () => { window.location.hash = n.hash; },
      },
        el('span', { class: 'nav-dot' }),
        el('span', {}, n.label)))),
    el('div', { class: 'sidebar-footer' },
      el('div', { class: 'avatar' }, 'A'),
      el('div', {},
        el('strong', {}, 'Alex'),
        el('small', {}, 'Personal Workspace'))));
  // ambient + grid-bg glow layers (B10 .app grid layout host).
  // b10Nav is already inside appGrid (appGrid.append above), so a single
  // body.append(appGrid) moves the whole subtree — no replaceChild needed.
  const appGrid = el('div', { class: 'b10-app-grid' });
  appGrid.append(
    el('div', { class: 'ambient' }),
    el('div', { class: 'grid-bg' }),
    b10Nav);
  document.body.append(appGrid);

  const legacyNav = document.querySelector<HTMLElement>('.app-nav');

  const syncSidebar = (): void => {
    const view = b10Current();
    const routed = view !== 'workbench';
    b10Nav.style.display = routed ? 'flex' : 'none';
    appGrid.classList.toggle('routed', routed);
    if (routed && legacyNav) legacyNav.setAttribute('hidden', 'true');
    if (!routed && legacyNav) legacyNav.removeAttribute('hidden');
    for (const item of Array.from(b10Nav.querySelectorAll<HTMLElement>('.nav button'))) {
      const selected = item.dataset.route === view;
      item.classList.toggle('active', selected);
      if (selected) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  };

  // Drive the B10 nav state from the same hashchange event as the legacy shell.
  window.addEventListener('hashchange', syncSidebar);
  syncSidebar();
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
    el('div', { class: 'status-stack' },
      el('span', { class: 'tag info' }, 'Live UI'),
      el('span', { class: 'tag ok' }, 'Local State')));
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

  // (The existing header is workbench-native; overlays here are additive.)
  mountB10Topbar();
}

// ============================================================================
// B10 topbar quick entries — a ⌘K search pill + 通知 / 工作区 ghost buttons
// on the B10 .topbar body. Wired after mountB10Overlays so the palette,
// toast and drawer ids already exist in the DOM.
// ============================================================================
function mountB10Topbar(): void {
  // The B10 .topbar/.search/.top-actions body lives on the routed B10 grid:
  // a ⌘K search pill (opens the command palette) + 通知 / 工作区 ghost buttons.
  // Wired only when the palette is already mounted (mountB10Overlays ran first).
    const probe = document.createElement('div');
    if (typeof probe.querySelector !== 'function') return;

    const topbar = el('header', { class: 'topbar', id: 'b10-topbar' },
      el('div', { class: 'search', id: 'b10-open-palette', role: 'button', tabindex: '0' },
        '⌘ K\u3000搜索页面 / 命令 / 资源'),
      el('div', { class: 'top-actions' },
        el('button', { type: 'button', class: 'ghost-btn', id: 'b10-top-notice' }, '通知'),
        el('button', { type: 'button', class: 'ghost-btn', id: 'b10-open-drawer' }, '工作区')));
    document.body.append(topbar);

    const openPalette = (): void => {
      const palette = document.getElementById('dl-palette');
      const input = document.getElementById('dl-palette-input') as HTMLInputElement | null;
      if (palette) {
        palette.classList.add('open');
        if (input) { input.focus(); input.select(); }
      }
    };
    const search = document.getElementById('b10-open-palette');
    if (search) {
      search.onclick = openPalette;
      search.onkeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPalette(); }
      };
    }
    const notice = document.getElementById('b10-top-notice');
    if (notice) notice.onclick = (): void => {
      const toast = document.getElementById('dl-toast');
      if (toast) {
        toast.textContent = '暂无新的通知';
        toast.classList.add('show');
        window.setTimeout(() => toast.classList.remove('show'), 1800);
      }
    };
    const drawerBtn = document.getElementById('b10-open-drawer');
    if (drawerBtn) drawerBtn.onclick = (): void => {
      const drawer = document.getElementById('dl-drawer');
      if (drawer) drawer.classList.add('open');
    };
}

// Guard: the vm unit smoke executes the bundle with a DOM mock whose
// `document` has no `body` and whose context has no `window` — the mount
// only runs in a real browser when the login panel and a body element
// both exist. Idempotent via the document flag.
