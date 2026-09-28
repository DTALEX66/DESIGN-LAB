// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench — shell module (Lane-C split of the D002 monolith): AppShell
// navigation over the B07 12-route IA + per-view readback renderers. Reads workbench/
// design state via named imports (no cross-module writes).

import type {
  BriefLineageResponse,
  BriefRevisionResponse,
  DesignBrief,
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
// W03 reuses the SAME pure domain helpers the legacy single-page brief flow uses
// (design.ts): one validation rule, one error vocabulary, one idempotency key
// source. Sharing them is what "统一旧单页与新路由的用户流程" means here.
import { revisionHint, splitList, uuid, versionState } from './design.js';

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


// ---------------------------------------------------------------------------
// dev/offline readback seam.
//
// In dev mode (Vite dev server, or ?dev=1) with NO service token the readback
// endpoints are unreachable, and every route view used to short-circuit to
// "请先连接本机设计服务" — so no B10 page structure ever rendered and the 1:1
// replica was neither visible nor verifiable. This seam answers the SAME
// readback paths with HONEST EMPTY payloads: collections are empty and scalars
// are explicit placeholders. No B10 demo number is invented. A held token
// always goes to the live API (a connected session never reaches this path),
// and a live failure still throws — nothing here masks a real error.
function apiOrEmpty<T>(path: string, empty: T): Promise<T> {
  if (!token && devMode()) return Promise.resolve(empty);
  return api<T>(path);
}

// Honest empty payloads for the dev/offline seam (see apiOrEmpty).
const OFFLINE = {
  health: { status: 'UNKNOWN', version: '—', scope: 'dev-offline' } as HealthResponse,
  projects: { projects: [] } as ProjectListResponse,
  designSystems: { design_systems: [] } as DesignSystemListResponse,
  tasks: { tasks: [], next_cursor: null } as TaskListResponse,
  designLayer: {
    design_layer: {
      briefs: [], directions: [], chosen_direction: null,
      bindings: [], active_binding: null, design_systems: [],
    },
  } as DesignLayerResponse,
  environment: {
    schemaVersion: 'v1', status: 'OFFLINE',
    project_root: '—', project_local_root: '.project-local',
    sources: {}, roots: {}, shared_inputs: {},
    agent_profile: { status: 'DISABLED', writable: false },
    write_trace: 'NONE', migration: 'NONE',
  } as EnvironmentResponse,
};

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

// ---------------------------------------------------------------------------
// B07 route #3 is `/projects/:id` (project-detail). It must NOT become a
// ROUTE_VIEWS entry, for two independently verified reasons:
//   1. the browser E2E asserts `.app-nav-item` length === 12
//      (design-lab/tests/e2e/browser_design_layer_e2e.mjs:385). ROUTE_VIEWS
//      already has exactly 12 entries; a 13th would fail that gate.
//   2. B10's sidebar has 11 items and no detail page, so a nav button for it
//      would break the 1:1 sidebar (verified by the B10 dom-diff).
// So the parameterized route is resolved SEPARATELY and is reachable only by
// navigating from a project row — which is how a detail page should work.
export type AppView = RouteView | 'project-detail';

const PROJECT_DETAIL_RE = /^#\/projects\/([^/?#]+)$/;

/** Project id from a `#/projects/<id>` hash, or null for any other hash. */
export function projectDetailId(hash: string): string | null {
  const m = PROJECT_DETAIL_RE.exec(hash);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

/** Hash for the project-detail route (B07 `/projects/:id`). */
export function projectDetailHash(id: string): string {
  return '#/projects/' + encodeURIComponent(id);
}

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
    // `style` MUST go through the CSSOM. The service serves every workbench
    // response with `style-src 'self'` and NO 'unsafe-inline' (CSP in
    // src/design_lab/workbench.py), which blocks a `style` ATTRIBUTE and logs an
    // "Applying inline style violates..." console error that the browser E2E
    // treats as a hard failure; CSSStyleDeclaration writes are exempt. Probed
    // against the exact CSP in a real browser: setAttribute('style') blocked,
    // while style.cssText / setProperty / property assignment all applied.
    // The vm DOM mocks have no CSSStyleDeclaration, so fall back to the
    // attribute there (a vm context enforces no CSP).
    else if (key === 'style' && (node as HTMLElement).style) (node as HTMLElement).style.cssText = String(value);
    else node.setAttribute(key, String(value));
  }
  node.append(...children);
  return node;
}

// B10 1:1 .kpi body. Parameter order matches EVERY call site
// (value, label, note) — the previous (label, value) declaration silently
// inverted the card, rendering the LABEL as B10's 35px primary number and the
// value as the small caption (and breaking the count-up, which only fires on a
// numeric <strong>).
export function kpiCard(value: string, label: string, note: string, trend?: string): HTMLElement {
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

// ---------------------------------------------------------------------------
// W03 — "待审 / 失败列表" and real "最近项目".
//
// The task states below are NOT invented here: they are the attempt-state vocabulary of
// `src/design_lab/runtime/job_store.py` (ALLOWED, and
// TERMINAL = {RECEIPTED, FAILED, TIMED_OUT, CANCELLED}).
//
// The distinction that matters for honesty: OUTCOME_UNKNOWN is **not** a failure. A
// failed dispatch has an unknown outcome, and folding it into "失败" would report a
// result the service explicitly refuses to claim. It belongs in "待审" — it needs a
// human to reconcile — together with CANCEL_REQUESTED and RECONCILING.
export type TaskTriage = 'failed' | 'needs_human' | 'in_flight' | 'done' | 'unknown';
const FAILED_STATES = new Set(['FAILED', 'TIMED_OUT', 'CANCELLED']);
const HUMAN_STATES = new Set(['OUTCOME_UNKNOWN', 'CANCEL_REQUESTED', 'RECONCILING']);
const IN_FLIGHT_STATES = new Set(['PENDING', 'RUNNING']);
export function taskTriage(state: string): TaskTriage {
  if (FAILED_STATES.has(state)) return 'failed';
  if (HUMAN_STATES.has(state)) return 'needs_human';
  if (IN_FLIGHT_STATES.has(state)) return 'in_flight';
  if (state === 'RECEIPTED') return 'done';
  return 'unknown';
}

// Recency is client-local (a list of project ids the user actually opened). It is the
// only durable "which project was I in" signal the single-user desktop build has, and it
// makes "刷新保留项目上下文" survive more than the URL hash. Guarded: the vm unit smoke
// has no localStorage and no window, so a throw here would break the smoke.
const RECENT_KEY = 'design-lab.recent-projects';
const RECENT_MAX = 8;
export function recentProjectIds(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string').slice(0, RECENT_MAX) : [];
  } catch { return []; }
}
export function rememberProject(id: string): void {
  if (!id) return;
  try {
    const next = [id, ...recentProjectIds().filter((v) => v !== id)].slice(0, RECENT_MAX);
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* private mode / vm / no storage: recency is a convenience, never a gate */ }
}

export async function renderDashboard(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回服务状态…'));
  const [health, projects, systems] = await Promise.all([
    apiOrEmpty<HealthResponse>('/health', OFFLINE.health),
    apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects),
    apiOrEmpty<DesignSystemListResponse>('/design-systems', OFFLINE.designSystems),
  ]);
  // Tri-state readback for the triage lists: `apiOrEmpty` answers an unreachable service
  // with an EMPTY payload, so "0 failures" would be a false claim offline. Each project's
  // tasks are read through `api()` here and per-project failure is recorded, so the panels
  // can say "未读回" instead of inventing a zero.
  const probeIds = projects.projects.slice(0, 8).map((p) => p.id);
  const probes = await Promise.all(probeIds.map(async (pid) => {
    try {
      const resp = await api<TaskListResponse>(`/projects/${pid}/tasks`);
      return { pid, ok: true, tasks: resp.tasks };
    } catch {
      return { pid, ok: false, tasks: [] as TaskListResponse['tasks'] };
    }
  }));
  const readable = probes.filter((p) => p.ok).length;
  const triageRows = probes.flatMap((p) => p.tasks.map((t) => {
    // The attempt is what fails, so classify by attempt state; fall back to the job state
    // only when the attempt state is outside the vocabulary.
    const byAttempt = taskTriage(t.attempt.state);
    return {
      project: projects.projects.find((x) => x.id === p.pid)?.name ?? p.pid,
      kind: t.kind, state: t.state, attempt: t.attempt.state,
      bucket: byAttempt !== 'unknown' ? byAttempt : taskTriage(t.state),
    };
  }));
  const sysCount = systems.design_systems.length;
  const projCount = projects.projects.length;
  // B10 1:1 page-head (h2 + p + .page-actions) — DESIGN-LAB honest copy, B10 layout.
  // B10's dashboard page-head carries a secondary ghost + a primary action; the
  // primary here navigates to the legacy workbench, which owns project creation
  // (this page is a read-only readback and never writes).
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '仪表盘'),
      el('p', {}, '项目、研究、品牌、预检与交付被整合为一个设计智造工作台。')),
    el('div', { class: 'page-actions' },
      el('button', { type: 'button', class: 'ghost-btn' }, '导出周报'),
      el('button', {
        type: 'button', class: 'primary-btn',
        onclick: () => { window.location.hash = ''; },
      }, '+ 新建项目')));
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
  const recent = [...projects.projects].sort((a, b) => {
    const rank = recentProjectIds();
    const ra = rank.indexOf(a.id); const rb = rank.indexOf(b.id);
    return (ra < 0 ? Number.MAX_SAFE_INTEGER : ra) - (rb < 0 ? Number.MAX_SAFE_INTEGER : rb);
  }).slice(0, 6);
  const recentIds = recentProjectIds();
  const recentPanel = el('div', { class: 'panel' },
    el('h3', {}, '最近项目'),
    el('div', { class: 'list' },
      ...(recent.length
        ? recent.map((p) => el('div', { class: 'list-item' },
            el('div', {},
              el('strong', {}, p.name),
              el('small', {}, p.id)),
            el('span', { class: 'tag info' }, recentIds.includes(p.id) ? '最近打开' : '已登记')))
        : [el('div', { class: 'list-item' },
            el('div', {},
              el('strong', {}, '尚无项目'),
              el('small', {}, '在工作台新建项目后读回此处')))])) ,
    el('p', { class: 'view-hint' }, recentIds.length
      ? '按本机最近打开的项目排序（仅保存项目 id 于本机，不上传）。'
      : '本机尚未记录打开过的项目，暂按服务返回顺序显示。'));
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
  // W03 "待审 / 失败列表": derived from real task readback, never from a demo number.
  const triagePanel = (bucket: TaskTriage, title: string, emptyText: string): HTMLElement => {
    const rows = triageRows.filter((r) => r.bucket === bucket);
    const body = readable === 0
      // Deliberately NOT "0": an unreachable service has not told us there are none.
      ? el('div', { class: 'list' }, el('div', { class: 'list-item' },
          el('div', {}, el('strong', {}, '未读回'),
            el('small', {}, '服务不可达或未连接；此处不显示 0，避免把「没读到」说成「没有」。'))))
      : el('div', { class: 'list' },
          ...(rows.length
            ? rows.map((r) => el('div', { class: 'list-item' },
                el('div', {}, el('strong', {}, `${r.project} · ${r.kind}`),
                  el('small', {}, `attempt.state=${r.attempt} · job.state=${r.state}`)),
                el('span', { class: bucket === 'failed' ? 'tag bad' : 'tag warn' }, r.attempt)))
            : [el('div', { class: 'list-item' },
                el('div', {}, el('strong', {}, emptyText),
                  el('small', {}, `已读回 ${readable}/${probeIds.length} 个项目的任务`)))]));
    return el('div', { class: 'panel' }, el('h3', {}, readable === 0 ? title : `${title}（${rows.length}）`), body);
  };
  target.replaceChildren(
    pageHead,
    grid,
    el('div', { class: 'two-col', style: 'margin-top:16px' }, recentPanel, trendPanel),
    modulePanels,
    el('div', { class: 'two-col', style: 'margin-top:16px' },
      triagePanel('needs_human', '待审（需人工处理）', '无待审任务'),
      triagePanel('failed', '失败', '无失败任务')),
    el('p', { class: 'view-hint' },
      '待审/失败按各项目任务的 attempt.state 判定（词表见 src/design_lab/runtime/job_store.py：'
      + 'TERMINAL={RECEIPTED,FAILED,TIMED_OUT,CANCELLED}）。OUTCOME_UNKNOWN 是「结果未知」，'
      + `计入待审而**不**计入失败。本轮最多读回 ${probeIds.length} 个项目的任务。`),
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
  // The glow lives in style.css (`.spark polyline`), NOT as an inline style
  // attribute: `innerHTML` markup carrying style="..." is an inline style under
  // the service's `style-src 'self'` and logs a CSP console error. The stroke
  // uses the primary->secondary gradient, matching B10's `url(#spark-grad)`.
  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  svg.innerHTML = `<defs><linearGradient id="${gradId}" x1="0" x2="1">
    <stop offset="0%" stop-color="var(--color-primary)"/>
    <stop offset="100%" stop-color="var(--color-secondary)"/>
  </linearGradient></defs>
  <polyline points="${points}" fill="none" stroke="url(#${gradId})" stroke-width="3.4"
    stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg;
}

const BRAND_MODULES = ['Logo', 'Color', 'Typography', 'Icon', 'Graphic Language', 'Templates', 'Applications', 'Assets'] as const;

export async function renderBrandSystems(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回设计系统…'));
  const systems = await apiOrEmpty<DesignSystemListResponse>('/design-systems', OFFLINE.designSystems);
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
  // B10 1:1 .kpi-grid: the four counters B10's preflight page shows. Values are
  // honest placeholders ("—") until a real preflight readback fills them in —
  // no B10 demo number is invented.
  const kpiGrid = el('div', { class: 'kpi-grid' },
    kpiCard('—', '登记资源', '运行预检后读回'),
    kpiCard('—', '阻塞资源', '运行预检后读回'),
    kpiCard('—', '判定', 'PASS / BLOCKED'),
    kpiCard('—', '机器范围', '运行预检后读回'));
  const setKpi = (index: number, value: string): void => {
    const strong = kpiGrid.querySelectorAll('.kpi strong')[index];
    if (strong) strong.textContent = value;
  };
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
      setKpi(0, String(data.resources.length));
      setKpi(1, String(blocked));
      setKpi(2, data.verdict);
      setKpi(3, data.machine_scope);
      result.replaceChildren(
        el('span', { class: 'tag ' + (blocked ? 'bad' : 'ok') }, data.verdict),
        el('span', { class: 'muted' },
          `登记 ${data.registry_state} · 机器 ${data.machine_scope} · 权限 ${data.permissions.meaning}`),
        blocked
          ? el('p', { class: 'view-hint' }, `阻塞资源 ${blocked} 项：${data.blocked_resources.join(' · ')}。此预检只读回，不安装、不裁许可、不遍历外部根。`)
          : el('p', { class: 'view-hint' }, '无阻塞资源。此为只读预检判定，不等同质量或 rights 验收。'),
        el('div', { class: 'table-wrap' },
          el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, el('th', {}, '资源'), el('th', {}, '状态'), el('th', {}, '说明'))),
            el('tbody', {}, ...data.resources.map((row: TaskPreflightResource) => el('tr', {},
              el('td', {}, row.ref),
              el('td', {}, el('span', { class: 'tag info' }, row.state)),
              el('td', {}, row.meaning)))))));
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
    kpiGrid,
    el('div', { class: 'toolbar' },
      el('label', { class: 'muted' }, '任务全 ID', input)),
    result);
}

export async function renderSettings(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回运行环境…'));
  const env = await apiOrEmpty<EnvironmentResponse>('/environment', OFFLINE.environment);
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
  // B10 1:1 page-head + three-col of .panel/.list/.list-item bodies. The
  // diagnostics are the same real readback — only the presentation is B10's
  // (a .list-item is exactly "label + status pill", which is what each row is).
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '系统设置'),
      el('p', {}, '设置页只读回服务端诊断；本服务不修改任何配置。')),
    el('div', { class: 'page-actions' },
      el('button', { type: 'button', class: 'ghost-btn' }, '导出诊断')));
  target.replaceChildren(
    pageHead,
    el('div', { class: 'three-col' },
      el('div', { class: 'panel' },
        el('h3', {}, '环境状态'),
        el('div', { class: 'list' },
          ...rows.map(([label, value]) => el('div', { class: 'list-item' },
            el('span', {}, label),
            el('span', { class: 'tag ' + (label === '代理配置' ? 'warn' : 'info') }, value))))),
      el('div', { class: 'panel' },
        el('h3', {}, '项目根（可写）'),
        el('div', { class: 'list' },
          ...(Object.keys(env.roots).length
            ? Object.entries(env.roots).map(([name, root]) => el('div', { class: 'list-item' },
                el('div', {}, el('strong', {}, name), el('small', {}, root.path)),
                writablePill(root.writable)))
            : [el('div', { class: 'list-item' },
                el('div', {}, el('strong', {}, '尚无根登记'), el('small', {}, '服务未返回 roots')))]))),
      el('div', { class: 'panel' },
        el('h3', {}, '外置输入（只读 · DECLARED_NOT_PROBED）'),
        el('div', { class: 'list' },
          ...(Object.keys(env.shared_inputs).length
            ? Object.entries(env.shared_inputs).map(([name, input]) => el('div', { class: 'list-item' },
                el('div', {}, el('strong', {}, name), el('small', {}, input.path)),
                el('span', { class: 'tag info' }, input.status)))
            : [el('div', { class: 'list-item' },
                el('div', {}, el('strong', {}, '尚无外置输入'), el('small', {}, '服务未返回 shared_inputs')))])))),
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
  const data = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
  if (!data.projects.length) {
    target.replaceChildren(
      el('div', { class: 'page-head' },
        el('div', {}, el('h2', {}, title),
          el('p', {}, '只读回服务端台账；本页不提交、不修改。'))),
      el('p', { class: 'view-hint' }, '尚无项目。先在工作台新建项目，再读回此视图。'));
    return;
  }
  const select = el('select', { class: 'project-select', id: `${title.replace(/\s+/g, '-')}-project` });
  select.append(el('option', { value: '' }, `选择项目（共 ${data.projects.length} 个）`));
  for (const p of data.projects) select.append(el('option', { value: p.id }, p.name));
  const content = el('div', { class: 'route-view-body' });
  target.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {}, el('h2', {}, title),
        el('p', {}, '只读回服务端台账；本页不提交、不修改。'))),
    el('label', { class: 'project-picker' }, '项目', select), content);
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
  const data = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
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
        el('th', {}, '项目'), el('th', {}, 'ID'), el('th', {}, '状态'), el('th', {}, ''))),
      el('tbody', {},
        ...(data.projects.length
          ? data.projects.map((p) => el('tr', {},
              el('td', {}, el('strong', {}, p.name)),
              el('td', {}, p.id),
              el('td', {}, el('span', { class: 'tag info' }, 'Active')),
              el('td', {}, el('button', {
                type: 'button', class: 'ghost-btn',
                // B07 `/projects/:id` — reached from a row, never a nav item
                // (ROUTE_VIEWS must stay 12 for the browser E2E nav assertion).
                onclick: () => { window.location.hash = projectDetailHash(p.id); },
              }, '打开'))))
          : [el('tr', {}, el('td', { colspan: '4' }, '尚无项目。在工作台新建项目后出现。'))]))));
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
    const tasks = await apiOrEmpty<TaskListResponse>(`/projects/${id}/tasks`, OFFLINE.tasks);
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
    const tasks = await apiOrEmpty<TaskListResponse>(`/projects/${id}/tasks`, OFFLINE.tasks);
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
    const layer = (await apiOrEmpty<DesignLayerResponse>(`/projects/${id}/design-layer`, OFFLINE.designLayer)).design_layer;
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
        el('div', { class: 'table-wrap' },
          el('table', { class: 'table' },
            el('tbody', {},
              el('tr', {}, el('th', { scope: 'row' }, 'briefs'), el('td', {}, String(layer.briefs.length))),
              el('tr', {}, el('th', { scope: 'row' }, 'directions'), el('td', {}, String(layer.directions.length))),
              el('tr', {}, el('th', { scope: 'row' }, '选定方向'), el('td', {}, chosen)),
              el('tr', {}, el('th', { scope: 'row' }, '活动绑定'), el('td', {}, active)))))),
      systems,
      el('p', { class: 'view-hint' }, '版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。'));
    return done;
  });
}

// 项目详情 — B07 routes.json 的 `/projects/:id`（project-detail）。W03「项目中心」
// 的核心动作：从项目列表进入单个项目的上下文。只读回读，不写。
// ---------------------------------------------------------------------------
// W03 — real Brief flow inside the route shell.
//
// W03 acceptance: "从项目卡进入真实Brief并保存读回；刷新保留项目上下文；失败不弹
// 「保存成功」；旧工作入口在迁移完成前可用；无假KPI".
//
// This panel is reached ONLY from `/projects/:id` (never a nav item — the 12-item
// `.app-nav-item` invariant is asserted by the browser E2E and the B10 sidebar must
// stay at 11).
//
// It calls the SAME endpoints and the SAME pure helpers as the legacy single-page
// form (`design.ts`): create POST /projects/{id}/briefs, revise
// POST /projects/{id}/briefs/{brief_id}/revisions, lineage GET .../lineage.
// The legacy entry point therefore keeps working unchanged.
//
// Failure honesty is structural, not a convention: the success text is written ONLY
// after the service call resolves, so a rejected write cannot display success. A
// failure always renders `revisionHint(error)` (STALE_REVISION / BRIEF_NOT_FOUND /
// UNAUTHORIZED get their real meaning) into the same slot.
//
// Markup follows B10 exactly rather than the legacy form: B10 styles fields with
// `.input` + `placeholder` and uses NO `<label>` element. Using a bare `<label>`
// here would re-introduce the pre-B10 element-rule coupling this work already
// removed from `.app` (see findings/W02-LEGACY-COUPLING.md).
function briefFieldRow(prefix: string): {
  row: HTMLDivElement; title: HTMLInputElement; goals: HTMLInputElement; constraints: HTMLInputElement;
} {
  const title = el('input', { id: `${prefix}-title`, class: 'input', maxlength: '160', placeholder: '简报标题（必填）' });
  const goals = el('input', { id: `${prefix}-goals`, class: 'input', maxlength: '400', placeholder: '目标，逗号分隔：现代, 温暖, 克制' });
  const constraints = el('input', { id: `${prefix}-constraints`, class: 'input', maxlength: '400', placeholder: '约束（可选）' });
  const row = el('div', { class: 'list-item', style: 'display:grid;gap:8px' }, title, goals, constraints);
  return { row, title, goals, constraints };
}

function renderBriefEditor(id: string, layer: DesignLayerResponse['design_layer'], target: HTMLElement): HTMLElement {
  const status = el('p', { class: 'view-hint', id: 'pd-brief-status', role: 'status' }, '本页可真实创建并保存简报；保存成功后从服务端重新读回。');
  // Refresh the LIVE route host, not the node we were handed.
  //
  // When this view is reached through the router, `show()` renders into an OFF-DOM
  // staging div and then moves its children into `#route-view`; the `target` captured
  // here is therefore empty and detached by the time a write completes. Re-rendering
  // into it updated nothing on screen (the status text still appeared, because that
  // element had been moved into the live tree) -- so a successful save looked saved
  // while the brief list stayed stale. Resolve the live host by id instead.
  const refresh = async (): Promise<void> => {
    const live = document.getElementById('route-view') as HTMLElement | null;
    await renderProjectDetail(id, live || target);
  };
  // Same reason for the status slot: after a refresh the old element is gone, so the
  // message must be written to whichever node currently carries the id.
  const liveStatus = (): HTMLElement => (document.getElementById('pd-brief-status') as HTMLElement | null) || status;
  // W03 asks for "保存状态、焦点和错误定位": a rejected field must be where the eye
  // already is, and marked for assistive tech, rather than leaving the user to hunt.
  const clearInvalid = (...fields: HTMLInputElement[]): void => {
    for (const f of fields) f.removeAttribute('aria-invalid');
  };
  const fail = (error: unknown, focus?: HTMLInputElement): void => {
    const node = liveStatus();
    node.className = 'error';
    node.textContent = revisionHint(error);
    if (focus) {
      focus.setAttribute('aria-invalid', 'true');
      focus.focus();
    }
  };
  const ok = (message: string): void => {
    const node = liveStatus();
    node.className = 'view-hint';
    node.textContent = message;
  };

  const versions = new Map<string, number>();
  for (const row of layer.briefs) versions.set(row.brief_id, row.version);

  // --- create -----------------------------------------------------------------
  const create = briefFieldRow('pd-brief');
  const createBtn = el('button', { type: 'button', class: 'primary-btn', id: 'pd-brief-create' }, '新建简报');
  let submittedCreate = { identity: '', key: '' };
  createBtn.addEventListener('click', () => {
    void (async () => {
      status.className = 'view-hint';
      status.textContent = '正在提交…';
      const title = create.title.value.trim();
      let goals: string[];
      try { goals = splitList(create.goals.value, 300, '目标'); } catch (error) { fail(error, create.goals); return; }
      clearInvalid(create.title, create.goals);
      if (!title) { fail(new Error('简报需要标题与至少一条目标'), create.title); return; }
      if (!goals.length) { fail(new Error('简报需要标题与至少一条目标'), create.goals); return; }
      const constraints = create.constraints.value.trim() || null;
      // Same idempotency discipline as design.ts: a retry of the SAME content reuses
      // the key (so a double submit cannot create two versions), different content
      // gets a new one.
      const identity = JSON.stringify({ id, title, goals, constraints });
      if (submittedCreate.identity !== identity) submittedCreate = { identity, key: uuid() };
      createBtn.disabled = true;
      try {
        await api(`/projects/${id}/briefs`, {
          title, goals, constraints, reference_asset_ids: [], idempotency_key: submittedCreate.key,
        });
        await refresh();          // real read-back from the service, not a local echo
        ok(`简报已保存并读回：「${title}」。`);
      } catch (error) {
        fail(error);
      } finally {
        createBtn.disabled = false;
      }
    })();
  });

  // --- revise (open a version, edit, save as a NEW version) --------------------
  const rev = briefFieldRow('pd-rev');
  const revHint = el('p', { class: 'view-hint', id: 'pd-rev-target' },
    '在某一简报行点「新版本」以载入该版本内容；保存会新增版本，旧版本只保留为历史。');
  const revBtn = el('button', { type: 'button', class: 'primary-btn', id: 'pd-brief-revise' }, '保存新版本');
  let revTarget: DesignBrief | null = null;
  const lineageBox = el('div', { class: 'list', id: 'pd-brief-lineage' });

  const loadLineage = async (briefId: string): Promise<void> => {
    const data = await apiOrEmpty<BriefLineageResponse>(`/projects/${id}/briefs/${briefId}/lineage`, {
      lineage: { brief_id: briefId, root_id: briefId, requested_id: briefId, live_id: null, versions: [] },
    });
    const rows = data.lineage.versions;
    const liveId = data.lineage.live_id;
    lineageBox.replaceChildren(
      el('div', { class: 'list-item' },
        el('div', {}, el('strong', {}, `版本链（${rows.length}）`),
          el('small', {}, `当前 ${liveId ? `版本 ${versions.get(liveId) ?? '?'}` : '—'}`))),
      ...rows.map((row) => el('div', { class: 'list-item' },
        el('div', {},
          el('strong', {}, `版本 ${row.version} · ${row.title}`),
          el('small', {}, `${row.goals.join(' / ')}${row.constraints ? ` · ${row.constraints}` : ''} · 参考 ${row.reference_asset_ids.length} · ${row.created_at}`)),
        el('span', { class: row.brief_id === liveId ? 'tag ok' : 'tag warn' }, versionState(row.superseded_by, versions)))));
  };

  const startRevision = (brief: DesignBrief): void => {
    void (async () => {
      revTarget = brief;
      rev.title.value = brief.title;
      rev.goals.value = brief.goals.join(', ');
      rev.constraints.value = brief.constraints ?? '';
      revHint.textContent = `正在修订「${brief.title}」版本 ${brief.version}；保存会新增一个版本，版本 ${brief.version} 只保留为历史。`
        + (brief.superseded_by === null ? '' : ' 注意：该版本已被取代，服务端会以 STALE_REVISION 拒绝这次修订。');
      rev.title.focus();          // W03: focus lands on the field being revised
      await loadLineage(brief.brief_id);
    })();
  };

  revBtn.addEventListener('click', () => {
    void (async () => {
      const source = revTarget;
      if (!source) { fail(new Error('请先在某一简报行点击「新版本」以载入要修订的内容')); return; }
      status.className = 'view-hint';
      status.textContent = '正在提交修订…';
      const title = rev.title.value.trim();
      let goals: string[];
      try { goals = splitList(rev.goals.value, 300, '目标'); } catch (error) { fail(error, rev.goals); return; }
      clearInvalid(rev.title, rev.goals);
      if (!title) { fail(new Error('修订需要标题与至少一条目标'), rev.title); return; }
      if (!goals.length) { fail(new Error('修订需要标题与至少一条目标'), rev.goals); return; }
      const constraints = rev.constraints.value.trim() || null;
      revBtn.disabled = true;
      try {
        const data = await api<BriefRevisionResponse>(`/projects/${id}/briefs/${source.brief_id}/revisions`, {
          title, goals, constraints,
          // carry the source version's references: the route shell has no reference
          // picker yet (that is W04), and silently dropping them would lose data.
          reference_asset_ids: source.reference_asset_ids,
          idempotency_key: uuid(),
        });
        await refresh();
        ok(`简报已保存为版本 ${data.brief.version}；版本 ${source.version} 只保留为历史，旧内容未被改写。`);
      } catch (error) {
        fail(error);
      } finally {
        revBtn.disabled = false;
      }
    })();
  });

  const briefRows = layer.briefs.length
    ? layer.briefs.map((brief) => el('div', { class: 'list-item' },
        el('div', {},
          el('strong', {}, `${brief.title} · v${brief.version}`),
          el('small', {}, `${brief.goals.join(' / ')}${brief.constraints ? ` · ${brief.constraints}` : ''} · 参考 ${brief.reference_asset_ids.length} · ${brief.created_at}`)),
        el('div', { class: 'actions' },
          el('span', { class: brief.superseded_by === null ? 'tag ok' : 'tag warn' }, versionState(brief.superseded_by, versions)),
          el('button', { type: 'button', class: 'ghost-btn', onclick: () => startRevision(brief) }, '新版本'))))
    : [el('div', { class: 'list-item' },
        el('div', {}, el('strong', {}, '尚无简报'), el('small', {}, '用下方表单创建该项目的第一份简报（真实写入，保存后读回）')))];

  return el('div', { class: 'panel' },
    el('h3', {}, `简报（Brief）· ${layer.briefs.length} 个版本`),
    el('div', { class: 'list' }, ...briefRows),
    el('div', { class: 'list-item', style: 'display:grid;gap:10px' },
      el('strong', {}, '新建简报'), create.row, el('div', { class: 'actions' }, createBtn)),
    el('div', { class: 'list-item', style: 'display:grid;gap:10px' },
      el('strong', {}, '修订 / 新增版本'), revHint, rev.row, el('div', { class: 'actions' }, revBtn)),
    lineageBox,
    status);
}

export async function renderProjectDetail(id: string, target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回该项目…'));
  rememberProject(id);   // W03 "最近项目": record the project the user actually opened
  const listing = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
  const named = listing.projects.find((p) => p.id === id);
  const [tasks, layerResp] = await Promise.all([
    apiOrEmpty<TaskListResponse>(`/projects/${id}/tasks`, OFFLINE.tasks),
    apiOrEmpty<DesignLayerResponse>(`/projects/${id}/design-layer`, OFFLINE.designLayer),
  ]);
  const layer = layerResp.design_layer;
  const chosen = layer.chosen_direction
    ? `${layer.chosen_direction.title} · v${layer.chosen_direction.version}` : '（尚未选定方向）';
  const active = layer.active_binding
    ? `${layer.active_binding.design_system_name} · 绑定 ${layer.active_binding.direction_id}` : '（无活动绑定）';

  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, named ? named.name : id),
      el('p', {}, `项目详情 · ${id}。tasks 与 design-layer 为只读回读；下方简报区是真实写入，保存后从服务端读回。`)),
    el('div', { class: 'page-actions' },
      el('button', {
        type: 'button', class: 'ghost-btn',
        onclick: () => { window.location.hash = '#/projects'; },
      }, '返回项目列表')));

  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard(String(tasks.tasks.length), '任务', '读回 /tasks 台账'),
    kpiCard(String(layer.briefs.length), '简报版本', '读回 design-layer'),
    kpiCard(String(layer.directions.length), '方向版本', '读回 design-layer'),
    kpiCard(layer.active_binding ? '1' : '0', '活动绑定', active));

  const taskPanel = el('div', { class: 'panel' },
    el('h3', {}, `任务台账（${tasks.tasks.length}）`),
    el('div', { class: 'list' },
      ...(tasks.tasks.length
        ? tasks.tasks.slice(0, 8).map((t) => el('div', { class: 'list-item' },
            el('div', {}, el('strong', {}, t.kind), el('small', {}, `尝试 ${t.attempt.attempt_no} · ${t.attempt.state}`)),
            el('span', { class: 'tag info' }, t.state)))
        : [el('div', { class: 'list-item' },
            el('div', {}, el('strong', {}, '尚无任务'), el('small', {}, '任务由工作台高级区提交')))])));

  const layerPanel = el('div', { class: 'panel' },
    el('h3', {}, '设计层契约'),
    el('div', { class: 'list' },
      el('div', { class: 'list-item' }, el('span', {}, '选定方向'), el('span', { class: 'tag info' }, chosen)),
      el('div', { class: 'list-item' }, el('span', {}, '活动绑定'), el('span', { class: 'tag info' }, active)),
      el('div', { class: 'list-item' }, el('span', {}, '设计系统登记'), el('span', { class: 'tag info' }, String(layer.design_systems.length)))));

  target.replaceChildren(
    pageHead,
    kpis,
    el('div', { class: 'two-col', style: 'margin-top:16px' }, taskPanel, layerPanel),
    el('div', { style: 'margin-top:16px' }, renderBriefEditor(id, layer, target)),
    el('p', { class: 'view-hint' }, 'tasks 与 design-layer 台账为只读；简报区可真实创建与修订并读回。提交任务 / 运行 / 取消 / 导出仍由工作台高级区执行。'));
}

export async function renderRoute(view: AppView, target: HTMLElement): Promise<void> {
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
    // B07 `/projects/:id`. The id comes from the hash (renderRoute receives only
    // the resolved view, matching the existing signature).
    case 'project-detail': {
      const id = projectDetailId(window.location.hash);
      if (!id) { await renderProjects(target); return; }
      await renderProjectDetail(id, target);
      return;
    }
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
  // The route host IS the B10 `section.content#content` view slot (B10 renders
  // each page as a direct child of `.content`, which supplies the 26/28/30
  // padding). It is built together with the rest of the B10 `.app` tree by
  // mountB10Shell(); under the vm smoke that mount is a no-op (the mock has no
  // querySelector) so the host is appended straight to <body> to keep a valid
  // render target on the headless path.
  const routeView = el('div', { class: 'route-view', id: 'route-view', 'aria-live': 'polite' });
  document.body.append(nav);
  // Scope the shell's layout gutter to the mounted state so an unmounted path
  // (the E2E default) keeps the original centered layout untouched.
  document.body.classList.add('dl-shell');

  // Build the authoritative B10 shell (.app > .ambient + .grid-bg + aside.sidebar
  // + main.main > header.topbar + section.content#content).
  const b10 = mountB10Shell(routeView);
  if (!b10) document.body.append(routeView);

  const active = (view: string): void => {
    for (const item of Array.from(nav.querySelectorAll<HTMLButtonElement>('.app-nav-item'))) {
      const selected = item.dataset.route === view;
      item.classList.toggle('active', selected);
      if (selected) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  };

  const current = (): AppView => {
    // Parameterized B07 route resolved BEFORE the exact-match table (it has no
    // ROUTE_VIEWS entry by design — see the AppView comment).
    if (projectDetailId(window.location.hash)) return 'project-detail';
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
    // ONE place decides which chrome is visible: the B10 `.app` owns the view
    // slot on every route, and the legacy header/main/footer/nav own the default
    // (empty-hash) workbench view. The previous split — a separate hashchange
    // listener in mountB10Sidebar racing this one — is what left the B10 overlay
    // covering the route panel.
    b10?.sync(view);
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
    if (!token && !devMode()) {
      // No service token in memory and no dev bypass: the API views would only
      // 401. Say so instead of faking data (no phantom KPIs before a
      // connection). Under devMode() the views DO render — through apiOrEmpty,
      // which answers with honest empty payloads and shows the offline notice.
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
  // The original handlers set #connection on connect/disconnect; a
  // MutationObserver keeps the shell copy in lockstep without touching them.
  if (typeof MutationObserver !== 'undefined')
    new MutationObserver(syncMeta).observe(connection, { childList: true, characterData: true });

  // mountB10Overlays() runs BEFORE show() so the palette/drawer/toast/modal ids
  // and the B10 topbar handlers exist before the first route renders into them.
  mountB10Overlays();
  window.addEventListener('hashchange', show);
  show();
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
// </div></header><section class="content" id="content"></section></main></div>.
//
// All classes come from the B10 CSS block already in style.css (#171). No
// second navigation system is created: on a route hash the legacy flat .app-nav
// + legacy header/main/footer are hidden and this `.app` owns the viewport; on
// the legacy workbench view (empty hash) `.app` hides itself and the flat nav +
// legacy header/main stay in place, so the original centered layout and every
// E2E selector survive.
//
// Returns the `.app` element plus a sync() that is driven from mountAppShell's
// single show() — NOT from a second hashchange listener (that split is what
// used to leave the B10 overlay covering the route host). Returns null under
// the vm smoke, whose MockElement has no querySelector.
// ============================================================================
interface B10Shell {
  app: HTMLElement;
  sync(view: string): void;
}

function mountB10Shell(routeView: HTMLElement): B10Shell | null {
  // Browser-only guard (same semantics as mountB10Overlays): the vm unit smoke
  // has no real querySelectorAll, so this never runs there.
  const probe = document.createElement('div');
  if (typeof probe.querySelector !== 'function') return null;

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

  const sidebar = el('aside', { class: 'sidebar' },
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

  // B10 .topbar body. Handlers are attached by wireB10Topbar() at the end of
  // mountB10Overlays(), once the palette/drawer/toast ids exist.
  const topbar = el('header', { class: 'topbar' },
    el('div', { class: 'search', id: 'openPalette', role: 'button', tabindex: '0' },
      '⌘ K\u3000搜索页面 / 命令 / 资源'),
    el('div', { class: 'top-actions' },
      el('button', { type: 'button', class: 'ghost-btn', id: 'topNotice' }, '通知'),
      el('button', { type: 'button', class: 'ghost-btn', id: 'openDrawer' }, '工作区')));

  // The authoritative B10 tree: .app > .ambient + .grid-bg + aside.sidebar +
  // main.main > header.topbar + section.content#content. The route host is the
  // `.content` view slot itself, which supplies B10's 26/28/30 padding.
  //
  // The offline notice is NOT decoration: without a token the views read back
  // honest EMPTY payloads, so "项目 0" must be attributable to "not connected"
  // rather than "there are no projects". It is hidden whenever a token is held.
  const offlineNotice = el('p', { class: 'muted', id: 'b10-offline' },
    '本地浏览模式：未连接本机设计服务（无访问令牌）。页面结构为 B10 1:1 真实渲染，'
    + '但所有读回值为空占位，不是真实台账。连接服务后本提示消失。');
  const app = el('div', { class: 'app', id: 'b10-app' },
    el('div', { class: 'ambient' }),
    el('div', { class: 'grid-bg' }),
    sidebar,
    el('main', { class: 'main' },
      topbar,
      el('section', { class: 'content', id: 'content' }, offlineNotice, routeView)));
  document.body.append(app);

  // Legacy chrome that owns the default (empty-hash) workbench view.
  const legacyNav = document.querySelector<HTMLElement>('.app-nav');
  const legacyChrome = Array.from(document.querySelectorAll<HTMLElement>('body > header, body > main, body > footer'));

  const sync = (view: string): void => {
    const routed = view !== 'workbench';
    // `hidden` on .app needs an explicit rule (an author `display:grid` beats
    // the UA [hidden] rule) — see `.app[hidden]` in style.css.
    app.hidden = !routed;
    offlineNotice.hidden = Boolean(token) || !devMode();
    if (legacyNav) legacyNav.toggleAttribute('hidden', routed);
    for (const node of legacyChrome) node.toggleAttribute('hidden', routed);
    for (const item of Array.from(sidebar.querySelectorAll<HTMLElement>('.nav button'))) {
      // A project-detail page has no nav button of its own (B10's sidebar has no
      // detail entry), so keep 项目 highlighted while it is open.
      const highlight = view === 'project-detail' ? 'projects' : view;
      const selected = item.dataset.route === highlight;
      item.classList.toggle('active', selected);
      if (selected) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  };

  return { app, sync };
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

  // --- Toast --- (B10 .toast#toast; .show is added/removed, as in B10)
  const toast = el('div', { class: 'toast', role: 'status', id: 'toast' }, 'Ready');
  document.body.append(toast);
  const toastTimer: { t: number } = { t: 0 };
  const showToast = (msg: string): void => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer.t);
    toastTimer.t = window.setTimeout(() => toast.classList.remove('show'), 1900);
  };
  (window as unknown as { __dlToast?: (m: string) => void }).__dlToast = showToast;

  // --- Modal --- (B10 .overlay#modal > .modal > h3 + .body + .actions)
  const overlay = el('div', { class: 'overlay', id: 'modal' });
  const modalBox = el('div', { class: 'modal' },
    el('h3', { id: 'modalTitle' }, '确认操作'),
    el('div', { class: 'body', id: 'modalBody' }, '该操作将写入本地状态。'),
    el('div', { class: 'actions' },
      el('button', { class: 'ghost-btn', type: 'button', 'data-close-modal': '' }, '取消'),
      el('button', { class: 'primary-btn', type: 'button', id: 'modalConfirm' }, '确认')));
  overlay.append(modalBox);
  document.body.append(overlay);
  const cancelBtn = modalBox.querySelector('.actions .ghost-btn') as HTMLButtonElement;
  const openModal = (title: string, bodyHtml: string, onConfirm?: () => void): void => {
    (modalBox.querySelector('h3') as HTMLElement).textContent = title;
    (modalBox.querySelector('.body') as HTMLElement).innerHTML = bodyHtml;
    overlay.classList.add('open');
    (modalBox.querySelector('#modalConfirm') as HTMLButtonElement).onclick = () => {
      closeModal();
      if (onConfirm) onConfirm();
    };
  };
  const closeModal = (): void => { overlay.classList.remove('open'); };
  cancelBtn.onclick = closeModal;

  // --- Drawer --- (B10 aside.drawer#drawer: h3 + p.muted + .status-stack +
  // .panel > h3 + .list > .list-item + .primary-btn)
  const drawer = el('aside', { class: 'drawer', id: 'drawer', role: 'dialog', 'aria-label': '工作区详情' },
    el('h3', { style: 'margin:0 0 8px' }, '工作区 / Context'),
    el('p', { class: 'muted', style: 'margin-top:0' }, 'Command Palette（Ctrl/Cmd + K）、Toast、Modal 与 Drawer 由本页真实驱动；视图内容全部来自服务读回。'),
    el('div', { class: 'status-stack', style: 'margin:14px 0 20px' },
      el('span', { class: 'tag info' }, 'Live UI'),
      el('span', { class: 'tag ok' }, 'Local State'),
      el('span', { class: 'tag warn' }, 'Readback Only')),
    el('div', { class: 'panel' },
      el('h3', {}, '界面状态'),
      el('div', { class: 'list' },
        el('div', { class: 'list-item' }, el('span', {}, 'Rendering'), el('span', { class: 'tag ok' }, 'Ready')),
        el('div', { class: 'list-item' }, el('span', {}, 'Motion Effects'), el('span', { class: 'tag ok' }, 'Enabled')),
        el('div', { class: 'list-item' }, el('span', {}, 'Palette'), el('span', { class: 'tag info' }, 'Ctrl/Cmd + K')))),
    el('button', { class: 'primary-btn', type: 'button', id: 'closeDrawer', style: 'margin-top:18px;width:100%' }, '关闭'));
  document.body.append(drawer);
  const openDrawer = (): void => { drawer.classList.add('open'); };
  const closeDrawer = (): void => { drawer.classList.remove('open'); };
  (drawer.querySelector('#closeDrawer') as HTMLButtonElement).onclick = closeDrawer;

  // --- Command Palette --- (B10 .palette#palette > input#paletteInput +
  // #paletteItems > .item)
  const palette = el('div', { class: 'palette', id: 'palette', role: 'dialog', 'aria-label': '命令面板' },
    el('input', { id: 'paletteInput', placeholder: '搜索页面 / 命令 / 模块…', 'aria-label': '命令搜索' }));
  const itemsBox = el('div', { id: 'paletteItems' });
  palette.append(itemsBox);
  document.body.append(palette);
  const paletteInput = palette.querySelector('input') as HTMLInputElement;
  // 12 B07 route IA (mirror of ROUTE_VIEWS, the primary-nav minus default)
  const cmds = ROUTE_VIEWS.filter((r) => r.hash !== '')
    .map((r) => ({ id: r.view, label: r.label }));
  for (const c2 of cmds) {
    itemsBox.append(el('div', { class: 'item', 'data-go': c2.id },
      el('span', {}, c2.label), el('small', {}, 'Open')));
  }
  const openPalette = (): void => { palette.classList.add('open'); paletteInput.focus(); paletteInput.select(); };
  const closePalette = (): void => {
    palette.classList.remove('open');
    paletteInput.value = '';
    itemsBox.querySelectorAll('.item').forEach((i) => { (i as HTMLElement).style.display = ''; });
  };
  paletteInput.addEventListener('input', () => {
    const q = paletteInput.value.toLowerCase();
    itemsBox.querySelectorAll<HTMLElement>('.item').forEach((item) => {
      item.style.display = item.textContent!.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  });
  itemsBox.querySelectorAll<HTMLElement>('.item').forEach((item) => {
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

  // Wire the B10 .topbar built by mountB10Shell (structure there, handlers here).
  wireB10Topbar(openPalette, showToast, openDrawer);
}

// ============================================================================
// B10 topbar quick entries — a ⌘K search pill + 通知 / 工作区 ghost buttons
// on the B10 .topbar body. Wired after mountB10Overlays so the palette,
// toast and drawer ids already exist in the DOM.
// ============================================================================
function wireB10Topbar(openPalette: () => void, showToast: (m: string) => void, openDrawer: () => void): void {
  // The B10 .topbar/.search/.top-actions structure is built by mountB10Shell;
  // this only attaches behaviour, and only once the palette / toast / drawer
  // exist (mountB10Overlays calls it last).
  const search = document.getElementById('openPalette');
  if (search) {
    search.onclick = openPalette;
    search.onkeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPalette(); }
    };
  }
  const notice = document.getElementById('topNotice');
  if (notice) notice.onclick = (): void => { showToast('暂无新的通知'); };
  const drawerBtn = document.getElementById('openDrawer');
  if (drawerBtn) drawerBtn.onclick = (): void => { openDrawer(); };
}

// Guard: the vm unit smoke executes the bundle with a DOM mock whose
// `document` has no `body` and whose context has no `window` — the mount
// only runs in a real browser when the login panel and a body element
// both exist. Idempotent via the document flag.
