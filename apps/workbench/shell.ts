// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench — shell module (Lane-C split of the D002 monolith): AppShell
// navigation over the B07 12-route IA + per-view readback renderers. Reads workbench/
// design state via named imports (no cross-module writes).

import type {
  AssetContentResponse,
  AssetListResponse,
  BriefLineageResponse,
  BriefRevisionResponse,
  BundleListResponse,
  BundleRecord,
  DesignBrief,
  DesignDirection,
  DesignLayerResponse,
  DesignLayerReadback,
  DesignSystemListResponse,
  EnvironmentResponse,
  CapabilityLibraryResponse,
  EventListResponse,
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
//
// State ⑤ of the UI state matrix. A live response that omitted a collection the view
// was about to walk used to throw at that field access, several layers away, and the
// top-level catch reported the whole view as failed with a TypeError as its only
// message. The response is therefore normalised against the shape the call site
// already declares through its `empty` fallback: an absent list becomes an empty list
// and an absent map becomes an empty map, which is strictly more permissive than
// today (a well-formed response is untouched, and a partial one stops crashing).
// The fields that had to be invented are recorded on the object, so a view can say
// 未读回：响应缺少 … instead of silently rendering the empty case as 尚无.
const SHAPE_MISSING = Symbol.for('design-lab/shape-missing');
// The seam's other failure mode: with no session it hands out an honest EMPTY payload
// so the page structure still renders. That empty is not evidence the ledger has
// nothing in it, so it is marked at the source and no view may describe it as a zero.
const DISCONNECTED = Symbol.for('design-lab/disconnected');

function normaliseShape(live: Record<string, unknown>, template: unknown, prefix = ''): string[] {
  if (template === null || typeof template !== 'object') return [];
  const missing: string[] = [];
  for (const [key, want] of Object.entries(template as Record<string, unknown>)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(want)) {
      if (!Array.isArray(live[key])) { live[key] = []; missing.push(field); }
    } else if (want !== null && typeof want === 'object') {
      if (live[key] === null || typeof live[key] !== 'object') { live[key] = {}; missing.push(field); }
      missing.push(...normaliseShape(live[key] as Record<string, unknown>, want, field));
    }
    // null and primitive fallbacks are skipped: null is a legal live value for
    // chosen_direction / active_binding / next_cursor, so requiring one would
    // fabricate a failure the service never produced.
  }
  return missing;
}

function apiOrEmpty<T extends object>(path: string, empty: T): Promise<T> {
  if (!token && devMode()) return Promise.resolve(markDisconnected(empty));
  return api<Record<string, unknown>>(path).then((live) => {
    const missing = normaliseShape(live, empty);
    if (missing.length) Object.defineProperty(live, SHAPE_MISSING, { value: missing, enumerable: false });
    return live as T;
  });
}

// One row per view that had to invent a collection because the service left it out.
// Spread into the view's children; empty means nothing to report, so a healthy read
// adds no noise. This is deliberately per-view rather than one shared accumulator:
// renders run off-DOM and race, and a losing generation would otherwise leak its
// notice into the view that won.
export function shapeNoticeRows(...values: unknown[]): HTMLElement[] {
  const notes = values.map(shapeNotice).filter(Boolean);
  return notes.length ? [el('p', { class: 'error' }, notes.join('；'))] : [];
}

// What a view must say when the service answered 200 but left a collection out.
export function shapeNotice(value: unknown): string {
  const missing = (value as Record<symbol, unknown> | null)?.[SHAPE_MISSING];
  return Array.isArray(missing) && missing.length
    ? `未读回：响应缺少 ${missing.join('、')}` : '';
}

function markDisconnected<T extends object>(payload: T): T {
  const mark = (target: object): void => {
    Object.defineProperty(target, DISCONNECTED, { value: true, enumerable: false });
  };
  mark(payload);
  // Views hold the collection they walked (`layer`, not the response root), so the
  // marker has to survive one level of nesting to be reachable where it is needed.
  for (const value of Object.values(payload)) {
    if (value !== null && typeof value === 'object') mark(value);
  }
  return payload;
}

// What a view must say when there was no readback at all. Distinct from shapeNotice:
// there the service answered and omitted a field; here nothing was ever asked.
export function disconnectedNotice(value: unknown): string {
  return (value as Record<symbol, unknown> | null)?.[DISCONNECTED] === true
    ? '未读回：未连接本机设计服务' : '';
}

// The two headings an empty collection may carry. `noun` (尚无X) is a claim about the
// ledger, so it is allowed only on a real readback. Both directions matter: the offline
// case may not borrow the confident wording, and a real empty may not hide behind 未读回.
export function emptyWording(value: unknown, noun: string, hint: string): [string, string] {
  const offline = disconnectedNotice(value);
  return offline ? ['未读回', offline] : [noun, hint];
}

export function emptyLi(value: unknown, noun: string, hint: string): HTMLElement {
  const [head, note] = emptyWording(value, noun, hint);
  return el('li', { class: 'list-item' }, el('div', {}, el('strong', {}, head), el('small', {}, note)));
}

export function emptyTd(value: unknown, noun: string, hint: string, colspan: number): HTMLElement {
  const [head, note] = emptyWording(value, noun, hint);
  // One text node, not a <small> caption: inside a table cell the 0.8em small is the
  // size the overflow gate measures, and it failed at every width on the first run.
  return el('td', { colspan: String(colspan) }, `${head} ${note}`);
}

// Honest empty payloads for the dev/offline seam (see apiOrEmpty).
const OFFLINE = {
  health: { status: 'UNKNOWN', version: '—', scope: 'dev-offline' } as HealthResponse,
  projects: { projects: [] } as ProjectListResponse,
  designSystems: { design_systems: [] } as DesignSystemListResponse,
  capabilities: {
    schemaVersion: 'design-lab/capability-library/v1',
    meaning: '未连接本机设计服务', unmeasuredMeans: 'null = 未判定，不是 0',
    counts: { total: 0, byKind: {}, byLicense: {}, byRevisionState: {}, qualified: 0 },
    sources: {}, capabilities: [],
  } as CapabilityLibraryResponse,
  tasks: { tasks: [], next_cursor: null } as TaskListResponse,
  bundles: { bundles: [] } as BundleListResponse,
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

// Chinese page name for a view id. Headings must never expose the internal route
// id (`research`, `preflight-qa`) where the operator clicked a Chinese label.
export function viewLabel(view: string): string {
  return ROUTE_VIEWS.find((route) => route.view === view)?.label ?? view;
}

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
// Project ids are `uuid4().hex` service-side. Validating the DECODED value is
// what closes the hole: the regex above admits `%`, so `#/projects/%2e%2e%2f…`
// decoded into a string containing `/` and `?` and was interpolated straight
// into API paths. Bare `%` also made decodeURIComponent throw, which aborted
// the whole route render.
const PROJECT_ID_RE = /^[0-9a-f]{32}$/;

/** Project id from a `#/projects/<id>` hash, or null for any other hash. */
export function projectDetailId(hash: string): string | null {
  const m = PROJECT_DETAIL_RE.exec(hash);
  if (!m || !m[1]) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return PROJECT_ID_RE.test(decoded) ? decoded : null;
}

/** Hash for the project-detail route (B07 `/projects/:id`). */
export function projectDetailHash(id: string): string {
  return '#/projects/' + encodeURIComponent(id);
}

// Honest "not open yet" copy per IA slot that has no backend route today.
// Projects / creative-tools / deliverables / evidence are READ-ONLY readbacks
// of real service routes (see renderProjects/renderCreativeTools/
// renderDeliverables/renderEvidence). These three slots have NO readback route:
// research has no persisted conclusions, domains has a model in the repo but no
// GET /api/domains, and the service is single-user with no collaboration route —
// so they say so, in the same terms the capability card below uses.
export const VIEW_NOT_OPEN: Partial<Record<RouteView, string>> = {
  'research': '研究洞察页未开放：当前服务没有研究结论的持久化路由。',
  'design-domains': '设计领域页未开放：域包模型已在仓内（schema、DOMAIN_PACK_SPEC_V2 与 13 个域包，并有 verify_domain_pack_v2.py 校验），缺的是 GET /api/domains 读回路由。',
  'collaboration': '团队协作页未开放：本地单机服务尚无协作路由（本地单用户模型）。',
};

// ---------------------------------------------------------------------------
// UI convergence 2026-09-30 — 未来能力契约登记表（UI 层单一来源）。
//
// 任务包要求：无 backend 的蓝图页不得声称「可用」，每个能力卡必须给来源、
// 状态、权限与未来接入点；有 backend 的页必须展示真实数据。本登记表是
// 唯一的 UI 侧声明：实现状态（PLANNED / BLOCKED / IMPLEMENTED）与证据
// （evidenceRef，指向现有服务契约，不发明 KPI）都引用已有事实；backend
// 接入后本页数据由对应 /api 路由读回替换。不建第二账本。
export interface CapabilityContract {
  capabilityId: string;
  domain: string;
  source: string;          // 声明来源（现有契约 / 服务路由 / 宿主），不指向不存在的东西
  owner: string;
  route: string;           // 未来（或现有）路由
  contractRef: string;     // 现有合同/模块引用
  implementationState: 'PLANNED' | 'BLOCKED' | 'IMPLEMENTED';
  permission: string;      // 所需权限/宿主状态
  reason: string;          // 为什么是现在这个状态
  nextAction: string;      // 明确的下一动作
}
const CAPABILITY_REGISTRY: readonly CapabilityContract[] = [
  { capabilityId: 'research-insights', domain: '研究洞察', source: 'IA 槽位 #/research',
    owner: 'DESIGN-LAB design core', route: 'GET /api/research/…',
    contractRef: 'apps/workbench/shell.ts ROUTE_VIEWS（12 路由 IA）；无后端模型', implementationState: 'PLANNED',
    permission: 'brief/reference 已持久化（/api/projects/{id}/assets 已有）',
    reason: '服务尚无研究结论持久化路由；研究目前由 brief/reference 驱动。',
    nextAction: '设计 research 结论模型 + 服务路由，然后 UI 读回替换本卡。' },
  { capabilityId: 'design-domain-model', domain: '设计领域', source: 'IA 槽位 #/domains',
    owner: 'DESIGN-LAB Domain Pack', route: 'GET /api/domains/…',
    contractRef: 'design-lab/schemas/domain-pack.schema.json · design-lab/domain-packs/DOMAIN_PACK_SPEC_V2.md（13 个域包）',
    implementationState: 'PLANNED',
    permission: '域包模型与 13 个域包已落仓（E1 结构级）；缺 HTTP 读回路由',
    reason: '域划分并非"尚无模型"：schema、DOMAIN_PACK_SPEC_V2 与 13 个域包目录都在仓内，并有 verify_domain_pack_v2.py 校验；缺的只是 GET /api/domains 读回。',
    nextAction: '为 Domain Pack 建 /api/domains 读回路由。' },
  { capabilityId: 'host-adapter-live', domain: '创作工具（宿主实时状态）', source: 'IA 槽位 #/tools',
    owner: 'Host/Tool Adapter 层', route: 'GET /api/projects/{id}/tasks（已有）+ 宿主探测路由（缺）',
    contractRef: 'src/design_lab/native_assets.py Bundles；宿主 adapter 合同',
    implementationState: 'BLOCKED',
    permission: '宿主（Illustrator/Photoshop 等）需以官方插件/CLI/MCP 形态接入；UI 只读回，不触发实操',
    reason: '后端尚无宿主在线探测路由；任务台账可读回，但宿主是否在线/可执行只能 UNKNOWN。',
    nextAction: '在 adapter 层增加宿主探测读回路由（官方接入后），UI 替换 UNKNOWN 占位。' },
  { capabilityId: 'mcp-diagnostics', domain: 'MCP 诊断', source: '任务包 2026-09-30（新增）',
    owner: 'MCP 工具层', route: 'GET /api/mcp/…（缺）',
    contractRef: '无现有 MCP 后端路由',
    implementationState: 'BLOCKED',
    permission: '需本机 MCP 运行时 + 服务路由',
    reason: '当前后端不暴露 MCP 状态；不安装、不假报可用。',
    nextAction: '后端提供 MCP 读回路由后 UI 接入；在此之前 UI 只标注 BLOCKED。' },
  { capabilityId: 'collaboration', domain: '团队协作', source: 'IA 槽位 #/collaboration',
    owner: '（超出当前范围）', route: '无（单用户模型）',
    contractRef: 'AGENTS.md：本地单用户服务，无协作路由',
    implementationState: 'PLANNED',
    permission: '需要多用户/权限模型先立项',
    reason: '本地单用户模型；协作是后续独立立项，不做假入口。',
    nextAction: '立项协作模型后再评估路由与页面。' },
] as const;

// Honest copy + card renderer for blueprint capability slots. Every card shows
// its real state (PLANNED / BLOCKED) and the integration point; NONE of them
// is a fake button, and NONE is a KPI.
function capabilityCard(c: CapabilityContract): HTMLElement {
  // UI-AUDIT-20261006：能力卡面向人的是"这是什么、现在什么状态、为什么"；
  // 路由 / 合同引用 / owner / 下一动作是工程对接面，默认收起。状态标签
  // （PLANNED / BLOCKED）始终可见 —— 诚实标注是这张卡存在的理由，不能折起来。
  return el('div', { class: 'panel capability-card', dataset: { capability: c.capabilityId } },
    el('div', {},
      el('h3', {}, c.domain),
      el('div', { class: 'status-stack' },
        // style.css establishes `.tag.neutral` for exactly this: a non-verdict must not
        // borrow the weight of a verdict. PLANNED says "no answer yet", so it gets the
        // outline pill the dashboard blueprint cards already use -- and IMPLEMENTED,
        // which this call site would otherwise have painted the same `info` blue, is a
        // real verdict and gets the affirmative one.
        el('span', { class: 'tag ' + (c.implementationState === 'BLOCKED' ? 'warn'
          : c.implementationState === 'IMPLEMENTED' ? 'ok' : 'neutral') },
          en(c.implementationState)))),
    el('p', { class: 'muted' }, c.reason),
    el('details', { class: 'advanced' },
      el('summary', {}, '接入明细'),
      el('div', { class: 'advanced-body' },
        el('p', { class: 'view-hint' }, `状态来源：${c.source}`),
        el('p', { class: 'view-hint' }, `所需条件：${c.permission}`),
        el('p', { class: 'view-hint' }, `工程落点：${c.route}（${c.contractRef}）`),
        el('p', { class: 'view-hint' }, `下一动作：${c.nextAction}`))));
}

// ============================================================================
// UI convergence 2026-09-30 — dynamic-VI helpers.
//
// The ring/orbit is DATA-DRIVEN: nodes are real direction versions read from
// /api/projects/{id}/design-layer, and the ring is their lineage (superseded
// chain). It never masks an artwork thumbnail and never claims progress.
// ============================================================================
/** Build the version ring for a direction: one node per version, current
 *  version marked. Pure string/number data in; SVG out. */
function buildVersionRing(versions: Array<{ version: number; chosen: boolean; superseded_by: string | null }>): SVGSVGElement | null {
  // The ring's whole meaning is sequence: chosen vs superseded vs still current.
  // With one version there is no sequence, and the orbit plus a single dot at
  // twelve o'clock read as a gauge stuck at zero -- a broken widget, not a
  // result. The line below it already states "1 个方向版本 · 选定：…", so the
  // honest rendering for n <= 1 is no ring at all.
  if (versions.length <= 1) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'version-ring');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `方向版本环：${versions.length} 个版本`);
  const cx = 60, cy = 60, r = 46;
  // orbit line (the ring itself)
  const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  orbit.setAttribute('class', 'version-ring-orbit');
  orbit.setAttribute('cx', String(cx)); orbit.setAttribute('cy', String(cy)); orbit.setAttribute('r', String(r));
  orbit.setAttribute('fill', 'none');
  svg.append(orbit);
  versions.forEach((v, i) => {
    const n = Math.max(versions.length, 1);
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    node.setAttribute('class', 'version-ring-node' + (v.chosen ? ' is-chosen' : ''));
    node.setAttribute('cx', x.toFixed(2)); node.setAttribute('cy', y.toFixed(2));
    node.setAttribute('r', v.chosen ? '6' : '4');
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `v${v.version}` + (v.chosen ? '（选定）' : '') + (v.superseded_by ? ' · 已被取代' : '');
    node.append(title);
    svg.append(node);
  });
  return svg;
}

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

// Machine-state words stay English on purpose -- they are the service's own
// vocabulary, and translating them would create exactly the second vocabulary
// that verify_state_vocabularies.py exists to prevent. Inside a lang="zh-CN"
// document they must be marked instead, or a screen reader pronounces them with
// Chinese phonemes (WCAG 3.1.2 Language of Parts).
export function en(text: string): HTMLElement {
  return el('span', { lang: 'en' }, text);
}

// One shared-input row per declared external root. Only a probe that actually saw
// the root may be green: runtime/paths.py reports DECLARED_NOT_PROBED, a
// declaration. An empty map gets a row that says so, because a blank list under a
// "服务端环境读回" heading reads as a readback that found nothing to report.
function sharedInputRows(response: EnvironmentResponse, limit = 4): HTMLElement[] {
  const entries = Object.entries(response.shared_inputs).slice(0, limit);
  // An empty map from an unconnected seam is not a server that answered "no roots".
  if (!entries.length) return [emptyLi(response, '尚无外置输入', '服务未返回 shared_inputs')];
  return entries.map(([name, input]) => el('li', { class: 'list-item' },
    el('div', {}, el('strong', {}, name), el('small', {}, input.path)),
    el('span', {
      class: input.status === 'MISSING' ? 'tag bad'
        : (input.status === 'DECLARED_NOT_PROBED' ? 'tag warn' : 'tag ok'),
    }, en(input.status))));
}

// B10 1:1 .kpi body. Parameter order matches EVERY call site// (value, label, note) — the previous (label, value) declaration silently
// inverted the card, rendering the LABEL as B10's 35px primary number and the
// value as the small caption (and breaking the count-up, which only fires on a
// numeric <strong>).
export function kpiCard(value: string, label: string, note: string, trend?: string): HTMLElement {
  // The single UNKNOWN-not-0 rule for every KPI. With no session, `apiOrEmpty`
  // answers the OFFLINE seam, so a `0` means "the service was not read", not
  // "there are none" — the same distinction the triage panels make explicitly.
  // Reachable on the real service too: `?dev=1` enables the seam.
  const unread = !token && value === '0';
  const shown = unread ? '—' : value;
  // A KPI value that is not a count (a version string, a status word, the unread
  // em-dash) must not wear the 35px numeral treatment: at 1440 `0.1.0-alpha.0`
  // wrapped to `0.1.0-alpha.` + `0`, and `OK` read as a metric that had improved.
  // Only numeric values keep the large-figure scale.
  const isText = !/^\d[\d,]*(?:\.\d+)?$/.test(shown);
  const children: (Node | string)[] = [
    el('strong', { dataset: { count: shown }, class: isText ? 'is-text' : null }, shown),
    el('small', {}, label),
  ];
  const trendText = unread ? '未读回：未连接本机设计服务' : (trend ?? note);
  // `trend` is never supplied by any caller today, because no route returns a
  // signed delta. So the caption is the provenance note and must render in the
  // neutral colour: painting '—'/未读回 notes in --color-success read as an
  // improving metric.
  if (trendText) children.push(el('div', { class: trend ? 'trend up' : 'trend' }, trendText));
  return el('div', { class: 'panel kpi' }, ...children);
}

// B10 KPI count-up: animate a KPI value from 0 to its data-count target.
// Honours prefers-reduced-motion HERE, in JS: a text-content tween is invisible
// to CSS, so no stylesheet rule can stop it. Only fires for numeric values.
export function animateKpiCount(el: HTMLElement): void {
  const raw = el.dataset.count;
  if (raw === undefined) return;
  // A readback KPI must never be rewritten by the animation. Only a plain
  // number may be counted up: parseFloat('0.1.0-alpha.0') is 0.1, which would
  // have replaced the service version with a false value.
  if (!/^\d+(\.\d+)?$/.test(raw)) return;
  const target = parseFloat(raw);
  if (Number.isNaN(target)) return;
  // Guard: vm unit-smoke has no performance/requestAnimationFrame; the value
  // is already set by kpiCard's dataset, so no-op is correct there.
  if (typeof performance === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  // matchMedia is absent in the vm smoke mock; `matches` false keeps the
  // animation there, which is the pre-existing behaviour.
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
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
  for (const stage of stages) ol.append(el('li', { class: 'state-machine-step', dataset: { state: stage } }, en(stage)));
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
  const [health, projects, systems, environment] = await Promise.all([
    apiOrEmpty<HealthResponse>('/health', OFFLINE.health),
    apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects),
    apiOrEmpty<DesignSystemListResponse>('/design-systems', OFFLINE.designSystems),
    apiOrEmpty<EnvironmentResponse>('/environment', OFFLINE.environment),
  ]);
  // Tri-state readback for the triage lists: `apiOrEmpty` answers an unreachable service
  // with an EMPTY payload, so "0 failures" would be a false claim offline. Each project's
  // tasks are read through `api()` here and per-project failure is recorded, so the panels
  // can say "未读回" instead of inventing a zero.
  // 2026-09-30: bundles are read alongside tasks so the 最近交付 / 活跃生产 panels
  // below have a real service source, not a placeholder.
  const probeIds = projects.projects.slice(0, 6).map((p) => p.id);
  const probes = await Promise.all(probeIds.map(async (pid) => {
    const taskResult: { res: TaskListResponse | null; err: unknown } = { res: null, err: null };
    const bundleResult: { res: BundleListResponse | null; err: unknown } = { res: null, err: null };
    try { taskResult.res = await api<TaskListResponse>(`/projects/${pid}/tasks`); }
    catch (e) { taskResult.err = e; }
    try { bundleResult.res = await api<BundleListResponse>(`/projects/${pid}/bundles`); }
    catch (e) { bundleResult.err = e; }
    return { pid, taskResult, bundleResult };
  }));
  const readable = probes.filter((p) => p.taskResult.res !== null).length;
  const triageRows = probes.flatMap((p) => (p.taskResult.res?.tasks ?? []).map((t) => {
    // The attempt is what fails, so classify by attempt state; fall back to the job state
    // only when the attempt state is outside the vocabulary.
    const byAttempt = taskTriage(t.attempt.state);
    return {
      project: projects.projects.find((x) => x.id === p.pid)?.name ?? p.pid,
      kind: t.kind, state: t.state, attempt: t.attempt.state,
      bucket: byAttempt !== 'unknown' ? byAttempt : taskTriage(t.state),
      pid: p.pid,
    };
  }));
  // 活跃生产 = in_flight triage rows; 交付包 = bundles actually read back. The
  // heading never says 最近: BundleRecord carries no timestamp, so recency is not
  // knowable and the rows stay in service order.
  const bundlesReadable = probes.filter((p) => p.bundleResult.res !== null).length;
  const activeProductionRows = triageRows.filter((r) => r.bucket === 'in_flight');
  const allBundles: Array<BundleRecord & { project: string; pid: string }> = probes.flatMap((p) =>
    (p.bundleResult.res?.bundles ?? []).map((b) => ({
      ...b,
      project: projects.projects.find((x) => x.id === p.pid)?.name ?? p.pid,
      pid: p.pid,
    })),
  );
  // `bundlesReadable === probes.length` is vacuously true when there are no probes, so
  // the heading painted a real-looking 交付包（0） with nothing asked. The middle branch
  // says what is actually known -- the ledger offered no project to read -- rather than
  // a bundle count or a failed-readback claim; distinguishing "server says empty" from
  // "we never asked" at list level is the separate defect already filed in the state
  // matrix, and this heading does not pretend to solve it.
  const bundleHeading = !probes.length ? '交付包（台账无项目可读）'
    : bundlesReadable === probes.length ? `交付包（${allBundles.length}）`
    : `交付包（未读回 ${probes.length - bundlesReadable}/${probes.length} 项目）`;
  const sysCount = systems.design_systems.length;
  const projCount = projects.projects.length;
  // B10 1:1 page-head (h2 + p + .page-actions) — DESIGN-LAB honest copy, B10 layout.
  // B10's dashboard page-head carries a secondary ghost + a primary action; the
  // primary here navigates to the legacy workbench, which owns project creation
  // (this page is a read-only readback and never writes).
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '仪表盘'),
      el('p', {}, '项目、品牌、预检与交付已可读回；研究、设计领域、协作尚未开放（见能力登记表）。')),
    el('div', { class: 'page-actions' },
      el('button', {
        type: 'button', class: 'primary-btn',
        onclick: () => { window.location.hash = ''; },
      }, '+ 新建项目')));
  const grid = el('div', { class: 'kpi-grid' },
    kpiCard(String(projCount), '项目', '服务端项目台账读回，非统计猜测'),
    kpiCard(String(sysCount), '设计系统', '资源登记的设计系统总数 · 服务端目录读回'),
    kpiCard(health.status, '服务状态', `版本 ${health.version} · 作用域 ${health.scope}`),
    kpiCard(health.version, '服务版本', '服务自检读回'));
  // B10 1:1 count-up target: the new .kpi strong[data-count] numbers.
  for (const v of grid.querySelectorAll<HTMLElement>('strong[data-count]')) {
    const text = v.textContent;
    if (text !== null && /^\d+$/.test(text)) v.dataset.count = text;
  }
  const systemsList = el('ul', { class: 'items-chips', 'data-view-item': 'brand' },
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
    el('ul', { class: 'list' },
      ...(recent.length
        ? recent.map((p) => el('li', { class: 'list-item' },
            el('div', {},
              el('strong', {}, p.name),
              el('small', {}, p.id)),
            el('span', { class: 'tag info' }, recentIds.includes(p.id) ? '最近打开' : '已登记')))
        : [emptyLi(projects, '尚无项目', '在工作台新建项目后读回此处')])) ,
    el('p', { class: 'view-hint' }, recentIds.length
      ? '按本机最近打开的项目排序（仅保存项目 id 于本机，不上传）。'
      : '本机尚未记录打开过的项目，暂按服务返回顺序显示。'));
  // No quality route exists (`/api/quality` is absent and Human Jury is an open
  // gate), so the dashboard shows no trend line at all. The previous panel drew
  // a hardcoded rising sequence (56..96) under the heading 设计质量趋势: a
  // footnote cannot make an invented improving curve honest.
  const trendPanel = el('div', { class: 'panel' },
    el('h3', {}, '设计质量趋势 · 未读回'),
    el('p', { class: 'view-hint' }, '无质量读回路由（见能力登记表 quality / Human Jury）；'
      + '不以演示序列充当评分。'));
  // B10 1:1 three-col: 设计域模块（Research / Brand / Delivery 三面板 + 说明）。
  // The B10 original draws a .progress bar in each panel; those widths (72 / 84 /
  // 65%) were constants with no denominator and no route, and one sat under copy
  // that said UNKNOWN and another under 真实读回. The bars are therefore NOT
  // rendered; the panels keep their honest text.
  const researchCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'research-insights');
const deliveryCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'design-domain-model');
const modulePanels = el('div', { class: 'three-col', style: 'margin-top:16px' },
    el('div', { class: 'panel' },
      el('h3', {}, 'Research'),
      el('div', { class: 'muted' }, '研究洞察模块：真实读回待接入，未接入前显式 UNKNOWN。')),
    el('div', { class: 'panel' },
      el('h3', {}, 'Brand'),
      el('div', { class: 'muted' }, `品牌系统：目录登记 ${sysCount} 个设计系统（服务端目录读回，全局目录而非本项目状态）。`)),
    el('div', { class: 'panel' },
      el('h3', {}, 'Delivery'),
      el('div', { class: 'muted' }, '交付中心：按任务读回，未打包不宣称交付完成。')));
  // 2026-09-30 — blueprint capability cards on the dashboard: honest PLANNED
  // states with source/owner/route/contract, never a fake "available" button.
  const blueprintCards = el('div', { class: 'three-col', style: 'margin-top:16px' },
    ...(researchCard ? [capabilityCard(researchCard)] : []),
    ...(deliveryCard ? [capabilityCard(deliveryCard)] : []),
    el('div', { class: 'panel' },
      el('h3', {}, '协作'),
      el('div', { class: 'status-stack' },
        el('span', { class: 'tag neutral' }, en('PLANNED')),
        el('small', {}, '本地单用户模型，无协作路由')),
      el('p', { class: 'view-hint' }, '协作是后续独立立项；不建假入口，标签保持 feature-gated。')));
  // W03 "待审 / 失败列表": derived from real task readback, never from a demo number.
  const triagePanel = (bucket: TaskTriage, title: string, emptyText: string): HTMLElement => {
    const rows = triageRows.filter((r) => r.bucket === bucket);
    const body = readable === 0
      // Deliberately NOT "0": an unreachable service has not told us there are none.
      ? el('ul', { class: 'list' }, el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '未读回'),
            el('small', {}, '服务不可达或未连接；此处不显示 0，避免把「没读到」说成「没有」。'))))
      : el('ul', { class: 'list' },
          ...(rows.length
            ? rows.map((r) => el('li', { class: 'list-item' },
                el('div', {}, el('strong', {}, `${r.project} · ${r.kind}`),
                  el('small', {}, `attempt.state=${r.attempt} · job.state=${r.state}`)),
                el('span', { class: bucket === 'failed' ? 'tag bad' : 'tag warn' }, r.attempt)))
            : [el('li', { class: 'list-item' },
                el('div', {}, el('strong', {}, emptyText),
                  el('small', {}, `已读回 ${readable}/${probeIds.length} 个项目的任务`)))]));
    return el('div', { class: 'panel' }, el('h3', {}, readable === 0 ? title : `${title}（${rows.length}）`), body);
  };
  const continueId = recentProjectIds()[0];
  const continueProj = continueId ? projects.projects.find((p) => p.id === continueId) : undefined;
  const continuePanel = el('div', { class: 'panel' },
    el('h3', {}, '继续项目'),
    el('ul', { class: 'list' }, continueProj
      ? el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, continueProj.name), el('small', {}, `本机最近打开 · ${continueProj.id}`)),
        el('div', { class: 'actions' },
          el('button', {
            type: 'button', class: 'primary-btn', id: 'pd-continue',
            onclick: () => { window.location.hash = `#/projects/${encodeURIComponent(continueProj.id)}`; },
          }, '继续')))
      : el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '尚无「继续项目」'),
          el('small', {}, '在本机打开过某个项目后，这里会显示最近打开的那一个。')))));
  target.replaceChildren(
    pageHead,
    grid,
    el('div', { class: 'two-col', style: 'margin-top:16px' }, recentPanel, trendPanel),
    modulePanels,
    // Pack 01_RESEARCH_AND_PRODUCT §101: the home page should offer 「继续项目」. It is
    // derived from the SAME local recency record the 最近项目 panel uses (project ids only,
    // kept on this machine, never uploaded), and it is honest when there is nothing to
    // continue rather than pointing at an arbitrary project.
    continuePanel,    el('div', { class: 'two-col', style: 'margin-top:16px' },
      triagePanel('needs_human', '待审（需人工处理）', '无待审任务'),
      triagePanel('failed', '失败', '无失败任务')),
    ...shapeNoticeRows(environment, health, projects, systems)),
    // 2026-09-30 — 活跃生产 + 最近交付 + Host/Capability 状态 + Quick Launch。
    // 全部来自真实读回：活跃生产 = in_flight triage；最近交付 = /bundles 读回；
    // Host 状态 = /environment shared_inputs + 能力登记表（诚实 UNKNOWN 占位，
    // 不做假探测）；Quick Launch = 跳转各视图的一行直达。
    el('div', { class: 'two-col', style: 'margin-top:16px' },
      el('div', { class: 'panel' },
        el('h3', {}, `活跃生产（${activeProductionRows.length}）`),
        el('ul', { class: 'list' },
          ...(activeProductionRows.length
            ? activeProductionRows.map((r) => el('li', { class: 'list-item' },
                el('div', {},
                  el('strong', {}, `${r.project} · ${r.kind}`),
                  el('small', {}, `job.state=${r.state} · attempt=${r.attempt}`)),
                // PENDING has not started (job_store requires PENDING -> RUNNING
                // before adapter dispatch), so the pill carries the real state
                // instead of claiming 运行中 for both.
                el('span', { class: 'tag warn' }, r.attempt)))
            : [el('li', { class: 'list-item' },
                el('div', {},
                  el('strong', {}, readable === 0 ? '未读回' : '无运行中任务'),
                  el('small', {}, readable === 0
                    ? '服务不可达或未连接；此处不显示 0，避免把「没读到」说成「没有」。'
                    : '运行中任务为 PENDING / RUNNING 状态（服务侧作业状态词表）。')))])),
      el('div', { class: 'panel' },
        el('h3', {}, bundleHeading),
        el('ul', { class: 'list' },
          ...(allBundles.length
            ? allBundles.slice(0, 8).map((b) => el('li', { class: 'list-item' },
                el('div', {},
                  el('strong', {}, `${b.project} · 交付包 v${b.version_no}`),
                  el('small', {}, `${b.id} · ${b.byte_size} 字节 · ${b.rights}`)),
                el('span', { class: b.rights === 'NOT_REVIEWED' ? 'tag warn' : 'tag info' },
                  b.rights === 'NOT_REVIEWED' ? '权利未审查' : b.rights)))
            : [emptyLi(projects, '尚无交付包', '任务完成并打包后，交付会在此读回。')])),
    )),
    el('div', { class: 'panel', style: 'margin-top:16px' },
      el('h3', {}, 'Host / Capability 状态'),
      el('div', { class: 'three-col' },
        el('div', { class: 'panel' },
          el('h3', {}, '宿主读回'),
          el('ul', { class: 'list' },
            ...TOOL_ADAPTERS.map((a) => el('li', { class: 'list-item' },
              el('div', {},
                el('strong', {}, a.name),
                el('small', {}, a.path)),
              el('span', { class: 'tag neutral' }, en('UNKNOWN'))))),
          el('p', { class: 'view-hint' }, '宿主在线状态尚未有服务路由；此处 UNKNOWN，不假报可用。')),
        el('div', { class: 'panel' },
          el('h3', {}, '共享输入'),
          el('ul', { class: 'list' }, ...sharedInputRows(environment)),
          el('p', { class: 'view-hint' }, '服务端环境读回；写权限与状态由服务裁定。')),
        el('div', { class: 'panel' },
          el('h3', {}, '未来能力'),
          el('ul', { class: 'list' },
            ...CAPABILITY_REGISTRY.slice(0, 4).map((c) => el('li', { class: 'list-item' },
              el('div', {},
                el('strong', {}, c.domain),
                el('small', {}, c.contractRef)),
              el('span', { class: c.implementationState === 'BLOCKED' ? 'tag warn' : 'tag info' },
                c.implementationState))))),
      ),
    el('div', { class: 'panel quick-launch', style: 'margin-top:16px' },
      el('h3', {}, 'Quick Launch'),
      el('ul', { class: 'list' },
        el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '新建项目'), el('small', {}, '进入工作台创建项目')),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'ghost-btn',
              onclick: () => { window.location.hash = ''; } }, '工作台'))),
        el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '项目列表'), el('small', {}, '全部项目一览')),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'ghost-btn',
              onclick: () => { window.location.hash = '#/projects'; } }, '项目'))),
        el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '创作工具'), el('small', {}, '宿主任务读回')),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'ghost-btn',
              onclick: () => { window.location.hash = '#/tools'; } }, '创作工具'))),
        el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '预检 / QA'), el('small', {}, '任务资源预检')),
          el('div', { class: 'actions' },
            el('button', { type: 'button', class: 'ghost-btn',
              onclick: () => { window.location.hash = '#/preflight'; } }, '预检'))),
      )),
    ),
    el('p', { class: 'view-hint' },
      '待审 / 失败按各项目任务的实际执行轮次状态判定（服务侧词表：TERMINAL='
      + '{RECEIPTED, FAILED, TIMED_OUT, CANCELLED}）。OUTCOME_UNKNOWN 是「结果未知」，'
      + `计入待审而不计入失败。本轮最多读回 ${probeIds.length} 个项目的任务。`),
    el('p', { class: 'eyebrow' }, '设计系统登记'),
    systemsList,
    el('p', { class: 'eyebrow' }, '设计域状态机（UI 参考稿 B10/B07 · 非服务状态，未读回）'),
    blueprintCards,
    stateMachineStepper());
  // B10 count-up in browser (no-op under vm unit-smoke where performance is undefined)
  target.querySelectorAll<HTMLElement>('strong[data-count]').forEach((k) => animateKpiCount(k));
}

// B10 sparkline（SVG 折线 + 渐变，用于质量趋势 / KPI 视觉）
const BRAND_MODULES = ['Logo', 'Color', 'Typography', 'Icon', 'Graphic Language', 'Templates', 'Applications', 'Assets'] as const;

export async function renderBrandSystems(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回设计系统…'));
  const systems = await apiOrEmpty<DesignSystemListResponse>('/design-systems', OFFLINE.designSystems);
  const sysCount = systems.design_systems.length;
  // B10 1:1 page-head (h2 + p + page-actions).
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '品牌系统'),
      el('p', {}, '延续锁定的高级、发光、动感产品表达。模块为视觉占位；资产与版本由服务端目录读回。')),
    el('div', { class: 'page-actions' }));
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard(String(sysCount), '设计系统', '资源登记总数 · 服务端目录读回'),
    kpiCard(String(BRAND_MODULES.length), 'VI 模块', BRAND_MODULES.join(' / ')),
    kpiCard('—', '活跃绑定', '绑定在工作台 DESIGN LAYER 执行'));
  // B10 1:1 three-col brand panels — .panel/.tag/.muted bodies only (B10 CSS 已存在类).
  const moduleGrid = el('div', { class: 'three-col' },
    ...BRAND_MODULES.map((name) => el('div', { class: 'panel', dataset: { module: name } },
      el('h3', {}, name),
      el('p', { class: 'muted' }, '视觉占位 · 资产与版本由服务端目录读回'),
      el('span', { class: 'tag info' }, 'VI 模块'))));
  const systemsList = el('div', { class: 'panel' },
    el('h3', {}, `设计系统登记（${sysCount}）`),
    el('ul', { class: 'list' },
      ...(systems.design_systems.length
        ? systems.design_systems.map((system) => el('li', { class: 'list-item' },
            el('div', {},
              el('strong', {}, `${system.name} · ${system.title}`),
              el('small', {}, `v${system.version} · 证据 ${system.evidence_level}`)),
            el('span', { class: 'tag info' }, system.version)))
        : [emptyLi(systems, '尚无登记设计系统', '在工作台 DESIGN LAYER 绑定后读回此处')
      ])
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    moduleGrid,
    systemsList,
    el('p', { class: 'view-hint' }, '绑定到方向的操作在工作台「05 / DESIGN LAYER」页执行；本页只读回，不修改。'),
    ...shapeNoticeRows(systems));
}

export async function renderPreflight(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在准备预检…'));
  // The task-resource registry (design-lab/config/task-resources.json) is a
  // file the preflight reads, NOT an HTTP route — so the UI takes the task
  // full id as input and fails closed on the service's own 400 envelope.
  const known = 'DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-H020';
  const input = el('input', { id: 'preflight-task-input', class: 'input preflight-input',
    // The example used to live in the placeholder, where a placeholder cannot wrap:
    // at 1280 the field clipped it after the comma, so the format was visible and the
    // only concrete example was not. It moved into the result panel's first message.
    placeholder: '<TASKPACK>::<TASK_KEY>', maxlength: '200',
    'aria-label': '任务资源预检 ID，格式为任务包 ID::任务键' });
  const runBtn = el('button', { type: 'button', class: 'primary-btn', id: 'preflight-run' }, '运行预检');
  // `.scan-line` was on this panel from construction and nothing ever added or
  // removed it, so the light sweep looped forever on an empty result box -- the
  // page looked like it was working before the user pressed 运行预检. A sweep is
  // only honest while a scan is actually in flight; re-add it around the run,
  // not around the empty panel.
  const result = el('div', { class: 'panel preflight-result' },
    // Constructed empty, this rendered as a large blank bordered box, which reads as
    // a broken panel rather than as a result area waiting for a run.
    el('p', { class: 'view-hint' },
      '尚未运行预检。填写任务全 ID（形如 ' + known + '），点「运行预检」后在此读回判定与资源清单。'));
  // B10 1:1 .kpi-grid: the four counters B10's preflight page shows. Values are
  // honest placeholders ("—") until a real preflight readback fills them in —
  // no B10 demo number is invented.
  const kpiGrid = el('div', { class: 'kpi-grid' },
    kpiCard('—', '登记资源', '运行预检后读回'),
    kpiCard('—', '阻塞资源', '运行预检后读回'),
    kpiCard('—', '判定', 'READY / BLOCKED'),
    kpiCard('—', '机器范围', '运行预检后读回'));
  const setKpi = (index: number, value: string): void => {
    const strong = kpiGrid.querySelectorAll('.kpi strong')[index];
    if (strong) strong.textContent = value;
  };
  // A failed or abandoned run must not leave the PREVIOUS task's verdict on
  // screen: four cards reading `12 / 0 / READY / Windows` under an error line
  // would attribute a stale judgement to the request that just failed.
  const resetKpis = (): void => {
    for (let i = 0; i < 4; i += 1) setKpi(i, '—');
  };
  const runPreflight = async (): Promise<void> => {
    const taskId = input.value.trim();
    if (!taskId) {
      resetKpis();
      result.replaceChildren(el('p', { class: 'view-hint' }, '请先填写要预检的任务全 ID（<TASKPACK>::<TASK_KEY>）。')); return;
    }
    resetKpis();
    result.replaceChildren(el('p', { class: 'view-loading' }, `正在读回 ${taskId} 的资源判定…`));
    try {
      const data = await api<TaskPreflightResponse>(`/task-preflight?task=${encodeURIComponent(taskId)}`);
      // B07 4-state: loading (above) -> ready (verdict + resource table). The
      // verdict .tag carries the service's own vocabulary (READY / BLOCKED —
      // `runtime/task_resources.py` never emits PASS). A task with ZERO resolved
      // resources also returns READY, so an empty registry is shown as
      // undecidable rather than as an all-clear.
      const blocked = data.blocked_resources.length;
      const noData = data.resources.length === 0;
      setKpi(0, String(data.resources.length));
      setKpi(1, String(blocked));
      setKpi(2, noData ? '—' : data.verdict);
      setKpi(3, data.machine_scope);
      result.replaceChildren(
        el('span', { class: 'tag ' + (blocked ? 'bad' : (noData ? 'warn' : 'ok')) },
          noData ? '无可判定资源' : data.verdict),
        el('span', { class: 'muted' },
          `登记 ${data.registry_state} · 机器 ${data.machine_scope} · 权限 ${data.permissions.meaning}`),
        noData
          ? el('p', { class: 'view-hint' }, `该任务未解析到任何资源（登记状态 ${data.registry_state}）；没有可比对的资源，不给出 READY 判定。`)
          : blocked
            ? el('p', { class: 'view-hint' }, `阻塞资源 ${blocked} 项：${data.blocked_resources.join(' · ')}。此预检只读回，不安装、不裁许可、不遍历外部根。`)
            : el('p', { class: 'view-hint' }, '无阻塞资源。此为只读预检判定，不等同质量或 rights 验收。'),
        el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
          'aria-label': '预检资源表（可横向滚动）' },
          el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, el('th', {}, '资源'), el('th', {}, '状态'), el('th', {}, '说明'))),
            el('tbody', {}, ...data.resources.map((row: TaskPreflightResource) => el('tr', {},
              el('td', {}, row.ref),
              el('td', {}, el('span', { class: 'tag info' }, row.state)),
              el('td', {}, row.meaning)))))));
    } catch (error) {
      resetKpis();
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
      runBtn));
  target.replaceChildren(
    pageHead,
    kpiGrid,
    el('div', { class: 'toolbar' },
      el('label', { class: 'muted' }, '任务全 ID', input)),
    result);
}

// UI-AUDIT-20261006 F-2, single implementation: `.tag` is a nowrap short-state
// pill, so any long identifier (path, schema id, 32-hex binding id) must go to
// `.value-mono` on its own row instead. This was local to renderSettings, which
// is how the rule got missed the second time it was needed.
function valueRow(label: string, value: string, long: boolean, tagClass = 'info'): HTMLElement {
  return long
    ? el('li', { class: 'list-item value-row' },
        el('span', {}, label),
        el('span', { class: 'value-mono' }, value))
    : el('li', { class: 'list-item' },
        el('span', {}, label),
        el('span', { class: 'tag ' + tagClass }, value));
}

// 研究洞察 / 能力库 — the capability records the repository already maintains and
// gates (source lock + vendor revisions + model radar) served as one readback, per the
// UI plan's single "Research & Capability Library" slot. Read-only by construction: it
// installs nothing, licenses nothing and qualifies nothing, and an unqualified record
// stays null rather than becoming a score. The persisted research CONCLUSIONS are still
// not open and this page says so rather than letting the live table imply otherwise.
export async function renderCapabilityLibrary(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回能力库…'));
  const data = await apiOrEmpty<CapabilityLibraryResponse>('/capabilities', OFFLINE.capabilities);
  const rows = data.capabilities;
  const filter = el('input', { class: 'input capability-filter', type: 'search', id: 'capability-filter',
    placeholder: '按 ID / 许可 / 域 / 处置 / 修订状态过滤',
    'aria-label': '能力库过滤' });
  const shown = el('span', { class: 'muted', id: 'capability-shown' }, '');
  const body = el('tbody', {});

  const render = (): void => {
    const needle = (filter.value || '').trim().toLowerCase();
    const keep = needle
      ? rows.filter((c) => [c.id, c.license, c.domain, c.disposition, c.presence,
                            c.revisionState, c.sourceType, c.evidenceLevel,
                            c.upstreamOwner].join(' ').toLowerCase().includes(needle))
      : rows;
    body.replaceChildren(...keep.map((c) => el('tr', {},
      el('td', {},
        el('strong', {}, c.id),
        el('div', { class: 'muted' }, `${c.kind} · ${c.sourceType ?? '未分类'}`),
        // The withdrawal instruction is part of the record, not an afterthought: the
        // plan asks for upgrade/withdraw with source references, and this is the
        // recorded path for exactly this candidate.
        c.removalPath ? el('details', { class: 'capability-withdraw' },
          el('summary', {}, '撤回路径'),
          el('p', { class: 'mono' }, c.removalPath)) : ''),
      el('td', {}, c.license ?? '（无记录）'),
      el('td', {}, c.disposition ?? '—'),
      el('td', {}, c.presence ?? '—'),
      el('td', {}, el('span', {
        // A revision recovered by exact repository-path join is the only green here;
        // unresolved and not-verified are warnings, never blanks.
        class: 'tag ' + (c.revisionState === 'VERIFIED' ? 'ok' : 'warn'),
      }, en(c.revisionState)), c.revision ? el('div', { class: 'mono' }, c.revision) : ''), 
      el('td', {}, c.qualified === null
        ? el('span', { class: 'tag neutral' }, '未判定')
        : el('span', { class: 'tag info' }, String(c.qualified))),
      el('td', {}, c.evidenceLevel
        ? el('span', { class: 'tag ' + (c.evidenceLevel === 'E0' ? 'warn' : 'info') },
            en(c.evidenceLevel))
        : el('span', { class: 'tag neutral' }, '未记录')),
      // Popularity is shown with its observation stamp and an explicit not-a-score
      // marker, per the taxonomy policy `popularityIsNotQuality`.
      el('td', {}, c.popularity
        ? el('span', { class: 'muted' },
            `★ ${c.popularity.stargazerCount ?? '—'} · fork ${c.popularity.forkCount ?? '—'}`
            + ` · ${c.popularity.observedAt?.slice(0, 10) ?? '未记时间'} · 非质量分`)
        : el('span', { class: 'muted' }, '未观测')))));
    shown.textContent = `显示 ${keep.length} / ${rows.length} 条`;
  };
  filter.oninput = () => { render(); };

  const notOpen = VIEW_NOT_OPEN['research'];
  const researchCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'research-insights');
  target.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h2', {}, '研究洞察 / 能力库'),
        // The payload carries `unmeasuredMeans` for machines; the reader gets the same
        // rule in the page's own language, with the English state words left untranslated.
        el('p', {}, '只读回仓内已维护的能力记录：来源锁、修订账与模型雷达。'
          + '空白不等于 0：未经宿主运行与人工验收的项标为 未判定，'
          + '未取回修订的项标为 NOT_VERIFIED 或 UNRESOLVED；本视图不安装、不取证、不代签许可。')),
      el('div', { class: 'page-actions' }, shown)),
    el('div', { class: 'panel' },
      el('h3', {}, `能力记录（${data.counts.total}）`),
      el('p', { class: 'view-hint' },
        `许可分布 ${Object.entries(data.counts.byLicense).map(([k, v]) => `${k} ${v}`).join(' · ')}`
        + `；修订 ${Object.entries(data.counts.byRevisionState).map(([k, v]) => `${k} ${v}`).join(' · ')}`
        + `；已判定 ${data.counts.qualified}。本视图不安装、不取证、不代签许可。`),
      el('label', { class: 'project-picker' }, '过滤', filter),
      el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
        'aria-label': '能力库表（可横向滚动）' },
        el('table', { class: 'table' },
          el('thead', {}, el('tr', {},
            el('th', {}, '能力'), el('th', {}, '许可'), el('th', {}, '处置'),
            el('th', {}, '存在状态'), el('th', {}, '修订'), el('th', {}, '资格判定'),
            el('th', {}, '证据级'), el('th', {}, '热度（非质量分）'))),
          body))),
    el('div', { class: 'panel' },
      el('h3', {}, '分类轴现状'),
      el('p', { class: 'view-hint' },
        `已连接候选分类 ${data.classification?.joined ?? 0} / ${data.counts.total} 条。`
        + (data.classification?.unclassifiedAxes?.length
          ? `以下轴在候选分类账中全部为空，界面不代填：${data.classification.unclassifiedAxes.join('、')}。`
          : '所有已声明分类轴均有值。')
        + ` ${data.classification?.note ?? ''}`),
      el('p', { class: 'view-hint' },
        '热度取自 GitHub 观测并带观测时间；策略明确 popularityIsNotQuality，因此它不参与排序或判定。')),
    el('div', { class: 'panel' },
      el('h3', {}, '研究结论'),
      el('p', { class: 'view-unopened' }, notOpen ?? '（无）'),
      researchCard ? capabilityCard(researchCard) : el('p', { class: 'view-hint' }, '（登记表无此项）')),
    ...shapeNoticeRows(data));
  render();
}

export async function renderSettings(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回运行环境…'));
  const env = await apiOrEmpty<EnvironmentResponse>('/environment', OFFLINE.environment);
  // `long` = 该值是文件系统路径这类长标识。UI-AUDIT-20261006 F-1：长值不得
  // 塞进 .tag —— .tag 是 nowrap 短状态药丸，承载完整路径时会把 .list-item
  // 撑到 ~600px，再被 .panel 的 overflow:hidden 静默裁掉（1440 下实测裁掉
  // 388px）。长值走 .value-mono（等宽 + 换行 + 独占一行）。
  const rows: Array<{ label: string; value: string; long: boolean }> = [
    { label: '环境状态', value: env.status, long: false },
    { label: '诊断契约', value: env.schemaVersion, long: true },
    { label: '项目根', value: env.project_root, long: true },
    { label: '项目本地根', value: env.project_local_root, long: true },
    { label: '写入痕迹', value: `写入 ${env.write_trace} · 迁移 ${env.migration}`, long: false },
    { label: '代理配置', value: `${env.agent_profile.status} · ${env.agent_profile.writable ? '可写' : '不可写'}`, long: false },
  ];
  // LibraryIndex: the external library index is the read-only red-line surface.
  // Turn each row's status / writability into an explicit pill so the 4-state
  // contract is visible. `runtime/paths.py` returns a DECLARED `writable` flag
  // for the roots without any os.access / write probe, so the pill says 声明
  // rather than 可写 — a green checkmark for a step nobody executed.
  const writablePill = (writable: boolean): HTMLElement =>
    el('span', { class: 'tag ' + (writable ? 'warn' : 'info') },
      writable ? '声明可写（未探测）' : '只读');
  // B10 1:1 page-head + three-col of .panel/.list/.list-item bodies. The
  // diagnostics are the same real readback — only the presentation is B10's
  // (a .list-item is exactly "label + status pill", which is what each row is).
  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '系统设置'),
      el('p', {}, '设置页只读回服务端诊断；本服务不修改任何配置。')),
    el('div', { class: 'page-actions' }));
  target.replaceChildren(
    pageHead,
    // This panel is the only child of the row, so it must not sit in a
    // three-column grid: at 1440 it rendered ~450px wide with 950px of empty
    // canvas to its right. Full width lets .list-item's space-between put the
    // label left and the status pill right, which reads as designed rather
    // than truncated.
    el('div', { class: 'panel' },
      // The panel heading and its first row were both called 环境状态, so the
      // page read the heading as a duplicate of the value under it. The panel is
      // a readback of the service environment; the row inside it is the status.
      el('h3', {}, '服务端环境读回'),
      el('ul', { class: 'list' },
        ...rows.map((r) => valueRow(r.label, r.value, r.long,
          r.label === '代理配置' ? 'warn' : 'info')))),
    // 路径诊断是后端对接面，不是设计生产面：默认收起，展开才占版面。
    el('details', { class: 'advanced' },
      el('summary', {}, '服务端路径诊断（默认收起）'),
      el('div', { class: 'advanced-body' },
        el('div', { class: 'three-col' },
          el('div', { class: 'panel' },
            el('h3', {}, '项目根（服务声明可写，未探测）'),
            el('ul', { class: 'list' },
              ...(Object.keys(env.roots).length
                ? Object.entries(env.roots).map(([name, root]) => el('li', { class: 'list-item' },
                    el('div', {}, el('strong', {}, name), el('small', {}, root.path)),
                    writablePill(root.writable)))
                : [emptyLi(env, '尚无根登记', '服务未返回 roots')]))),
          el('div', { class: 'panel' },
            el('h3', {}, '外置输入（只读 · DECLARED_NOT_PROBED）'),
            el('ul', { class: 'list' },
              ...(Object.keys(env.shared_inputs).length
                ? Object.entries(env.shared_inputs).map(([name, input]) => el('li', { class: 'list-item' },
                    el('div', {}, el('strong', {}, name), el('small', {}, input.path)),
                    el('span', { class: 'tag info' }, input.status)))
                : [emptyLi(env, '尚无外置输入', '服务未返回 shared_inputs')])))))),
    el('p', { class: 'view-hint' }, '代理配置私有状态不可写：PRIVATE_NOT_INSPECTED · 不可写。本服务不读取、不打印任何凭据。'),
    ...shapeNoticeRows(env));
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
  const unread = shapeNotice(data);
  const offline = disconnectedNotice(data);
  if (!data.projects.length) {
    // Three different empties, and the earlier branch collapsed them into one claim:
    // a ledger that genuinely holds no project, a 200 that never carried the collection,
    // and a page that never asked because nothing is connected. Only the first may say
    // 尚无项目.
    target.replaceChildren(
      el('div', { class: 'page-head' },
        el('div', {}, el('h2', {}, title),
          el('p', {}, '只读回服务端台账；本页不提交、不修改。'))),
      el('p', { class: unread || offline ? 'error' : 'view-hint' },
        unread ? `${unread}，因此无法判断台账是否为空`
          : offline ? `${offline}，台账未读回，不能断言为空`
            : '尚无项目。先在工作台新建项目，再读回此视图。'));
    return;
  }
  // One project in the ledger and a placeholder selected is a dead first screen:
  // the readback already named the only project there is, so open it. Only
  // reachable from a real readback — the offline fallback list is empty.
  const sole = data.projects.length === 1 ? data.projects[0] : null;
  const select = el('select', { class: 'project-select', id: `${title.replace(/\s+/g, '-')}-project` });
  if (!sole) select.append(el('option', { value: '' }, `选择项目（共 ${data.projects.length} 个）`));
  for (const p of data.projects) select.append(el('option', { value: p.id }, p.name));
  const content = el('div', { class: 'route-view-body' });
  target.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {}, el('h2', {}, title),
        el('p', {}, '只读回服务端台账；本页不提交、不修改。'))),
    el('label', { class: 'project-picker' }, '项目', select), content,
    ...shapeNoticeRows(data));
  const load = async (): Promise<void> => {
    const id = select.value;
    if (!id) {
      // Three routed views (创作工具 / 交付中心 / 证据系统) shared this handler and
      // showed one grey sentence above a full screen of black, which reads as a
      // broken page rather than an unselected one. The repo already ships an
      // `.empty` component; use it, and say what will appear once a project is
      // picked without inventing any value in the meantime.
      content.replaceChildren(el('div', { class: 'empty' },
        el('div', { class: 'icon', 'aria-hidden': 'true' }, '—'),
        el('p', {}, `未选择项目，${title}没有可读回的记录`),
        el('small', {}, '在上方「项目」中选择项目后，本页从服务端台账只读回；未读回不显示数字。')));
      return;
    }
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
      el('p', {}, '支持筛选、编辑与本地持久化。数据来自服务端台账；新建 / 选择项目在工作台执行，本页只读回。')),
    el('div', { class: 'page-actions' },
      el('button', {
        type: 'button', class: 'primary-btn',
        onclick: () => { window.location.hash = ''; },
      }, '+ 新建项目')));
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard(String(n), '项目', '服务端台账读回'),
    kpiCard('—', '进行中', '状态需在工作台查看'),
    kpiCard('—', '已完成', '状态需在工作台查看'));
  // B10 1:1 table（.table-wrap + .table，B10 表体），内容仍是真实台账。
  const list = el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
    'aria-label': '项目台账表（可横向滚动）' },
    el('table', { class: 'table' },
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col' }, '项目'), el('th', { scope: 'col' }, 'ID'),
        el('th', { scope: 'col' }, '状态'), el('th', { scope: 'col' }, '操作'))),
      el('tbody', {},
        ...(data.projects.length
          ? data.projects.map((p) => el('tr', {},
              el('th', { scope: 'row' }, expandableTitle(p.name)),
              el('td', {}, p.id),
              // /api/projects returns only {id, name}: ProjectRecord carries no
              // status field, so the ledger cannot say "Active". The same page
              // already refuses to guess 进行中/已完成 in its KPIs.
              el('td', {}, el('span', { class: 'tag neutral' }, '未读回')),
              el('td', {}, el('button', {
                type: 'button', class: 'ghost-btn',
                // B07 `/projects/:id` — reached from a row, never a nav item
                // (ROUTE_VIEWS must stay 12 for the browser E2E nav assertion).
                onclick: () => { window.location.hash = projectDetailHash(p.id); },
              }, '打开'))))
          : [el('tr', {}, emptyTd(data, '尚无项目', '在工作台新建项目后出现。', 4))]))));
  target.replaceChildren(
    pageHead,
    kpis,
    el('div', { class: 'panel' }, el('h3', {}, `项目（${n}）`), list),
    ...shapeNoticeRows(data));
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
    const env = await apiOrEmpty<EnvironmentResponse>('/environment', OFFLINE.environment);
    // 2026-09-30 — Host/Capability 状态卡：宿主在线状态诚实标注 UNKNOWN
    // （后端尚无宿主探测路由），共享输入服务端环境读回。
    const mcpCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'mcp-diagnostics');
    const hostCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'host-adapter-live');
    const hostStatus = el('div', { class: 'panel' },
      el('h3', {}, '宿主 / Capability 状态'),
      el('div', { class: 'three-col' },
        el('div', { class: 'panel' },
          el('h3', {}, '宿主读回'),
          el('ul', { class: 'list' },
            ...TOOL_ADAPTERS.map((a) => el('li', { class: 'list-item' },
              el('div', {},
                el('strong', {}, a.name),
                el('small', {}, a.path)),
              el('span', { class: 'tag neutral' }, en('UNKNOWN'))))),
          el('p', { class: 'view-hint' }, '宿主在线状态尚未有服务路由；此处 UNKNOWN，不假报可用。')),
        el('div', { class: 'panel' },
          el('h3', {}, '共享输入'),
          el('ul', { class: 'list' }, ...sharedInputRows(env)),
          el('p', { class: 'view-hint' }, '服务端环境读回。')),
        hostCard ? capabilityCard(hostCard) : el('div', { class: 'panel' }),
        mcpCard ? capabilityCard(mcpCard) : el('div', { class: 'panel' }),
      ),
    );
    // B10 1:1 three-col adapter grid（.panel + .tag + .muted），真实读回任务台账。
    const adapterGrid = el('div', { class: 'card-flow' },
      ...TOOL_ADAPTERS.map((a) => el('div', { class: 'panel' },
        el('h3', {}, a.name),
        el('div', { class: 'status-stack' },
          el('span', { class: 'tag info' }, a.state),
          // Neutral, not ok: the fact here is that an adapter entry exists in
          // integrations/adapter-registry.json. Nothing probed the host, and the panel
          // above this one says so ("UNKNOWN，不假报可用"). A green pill on the same
          // page contradicted it.
          el('span', { class: 'tag neutral' }, '登记于 adapter-registry'))),
        el('p', { class: 'view-hint' }, '连接方式 / 权限 / 可执行能力由宿主与 service 裁定；本页只读回，不触发实操。')));
    const rows = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, emptyTd(tasks, '尚无宿主任务', '创作任务由 Illustrator / Photoshop 在工作台高级区提交。', 3))];
    return el('div', {},
      hostStatus,
      adapterGrid,
      el('p', { class: 'view-hint' }, '宿主任务只读回服务端任务台账。提交 / 运行 / 取消由宿主（Illustrator / Photoshop）在工作台执行；本页不触发实操。'),
      el('div', { class: 'panel' },
        el('h3', {}, `任务（${tasks.tasks.length}）`),
        el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
          'aria-label': '设计领域任务表（可横向滚动）' },
          el('table', { class: 'table' },
            el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
            el('tbody', {}, ...rows)))),
    ...shapeNoticeRows(env, tasks));
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
    const [tasks, bundles] = await Promise.all([
      apiOrEmpty<TaskListResponse>(`/projects/${id}/tasks`, OFFLINE.tasks),
      apiOrEmpty<BundleListResponse>(`/projects/${id}/bundles`, OFFLINE.bundles),
    ]);
    // 2026-09-30 — 真实 bundle 读回：显示该项目的交付包（id / 版本 / 字节 / 权利），
    // 不再只有占位卡片。
    const bundleRows: (HTMLElement | null)[] = bundles.bundles.length
      ? bundles.bundles.map((b) => el('li', { class: 'list-item' },
          el('div', {},
            el('strong', {}, `交付包 · v${b.version_no}`),
            el('small', {}, `${b.id} · ${b.byte_size} 字节 · ${b.rights}`)),
          el('div', { class: 'actions' },
            el('button', {
              type: 'button', class: 'ghost-btn',
              onclick: () => {
                window.location.hash = '#/projects/' + encodeURIComponent(id);
              },
            }, '在项目页下载'),
            el('span', { class: b.rights === 'NOT_REVIEWED' ? 'tag warn' : 'tag info' },
              b.rights === 'NOT_REVIEWED' ? '权利未审查' : b.rights))))
      : [emptyLi(bundles, '尚无交付包', '任务完成并打包后，交付会在此读回。')];
    const bundleList = el('ul', { class: 'list' },
      ...bundleRows.filter((x): x is HTMLElement => x !== null));

    const bundlePanel = el('div', { class: 'panel' },
      el('h3', {}, `交付包（${bundles.bundles.length}）`),
      bundleList,
      el('p', { class: 'view-hint' }, '交付包来自原生宿主导出；下载与 hash 核对在项目页执行（fail-closed）。权利 / 质量 / 预检仍需独立验收。'));
    const tasksRows: (HTMLElement | null)[] = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state), el('td', {}, t.attempt.state)))
      : [el('tr', {}, emptyTd(tasks, '尚无任务', '任务完成后交付包随读回导出。', 3))];
    const tasksPanel = el('div', { class: 'panel' },
      el('h3', {}, `交付候选任务（${tasks.tasks.length}）`),
      el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
        'aria-label': '交付候选任务表（可横向滚动）' },
        el('table', { class: 'table' },
          el('thead', {}, el('tr', {}, el('th', {}, '类型'), el('th', {}, '状态'), el('th', {}, '尝试'))),
          el('tbody', {}, ...tasksRows.filter((x): x is HTMLElement => x !== null)))),
    );
    // B10 1:1 kpi-grid（.panel 体）。
    const manifestKpis = el('div', { class: 'kpi-grid' },
      kpiCard(String(tasks.tasks.length), '交付候选', '读回任务台账 · 非已打包'),
      kpiCard(String(bundles.bundles.length), '交付包', '读回 /bundles · 可下载核对 hash'),
      kpiCard('—', '人工验收', '字体 / 链接 / rights / 质量'));
    for (const v of manifestKpis.querySelectorAll<HTMLElement>('strong[data-count]')) {
      const t = v.textContent; if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const kindGrid = el('div', { class: 'three-col' },
      ...DELIVERABLE_KINDS.map((k) => el('div', { class: 'panel' },
        el('h3', {}, k),
        el('span', { class: 'tag info' }, '导出候选'))));
    return el('div', {},
      manifestKpis,
      kindGrid,
      el('p', { class: 'view-hint' }, '交付包按任务在下载时打包（字体 / 链接 / rights / 质量仍需人工验收）。本页只读回，不下载也不打包。'),
      bundlePanel,
      tasksPanel,
    ...shapeNoticeRows(bundles, tasks));
  });
}

// 证据系统 — read-back of the design layer: briefs, directions, the chosen
// direction, design-system bindings and the active binding. Version chains are
// read on demand from the workbench; this is a read-only evidence view.
export async function renderEvidence(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '证据系统', async (id) => {
    const [layerResp, bundlesResp] = await Promise.all([
      apiOrEmpty<DesignLayerResponse>(`/projects/${id}/design-layer`, OFFLINE.designLayer),
      apiOrEmpty<BundleListResponse>(`/projects/${id}/bundles`, OFFLINE.bundles),
    ]);
    const layer = layerResp.design_layer;
    const chosen = layer.chosen_direction
      ? `${layer.chosen_direction.title} · v${layer.chosen_direction.version}` : '（尚未选定方向）';
    const active = layer.active_binding
      ? `${layer.active_binding.design_system_name} · 绑定 ${layer.active_binding.direction_id}` : '（无活动绑定）';
    // 2026-09-30 — 证据绑定面板：项目 → brief → direction → bundle 关联链，
    // 全部来自真实读回，不发明 KPI。
    const bindingChain = el('div', { class: 'panel' },
      el('h3', {}, '证据绑定链'),
      el('ul', { class: 'list' },
        el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '项目'), el('small', {}, id)),
          el('span', { class: 'tag ok' }, '已读回')),
        el('li', { class: 'list-item' },
          el('div', {},
            el('strong', {}, `Brief（${layer.briefs.length} 版本）`),
            el('small', {}, layer.briefs.length
              ? layer.briefs.map((b) => `v${b.version}`).join(' → ')
              : '（无）')),
          el('span', { class: layer.briefs.length ? 'tag ok' : 'tag info' },
            layer.briefs.length ? '已读回' : '空')),
        el('li', { class: 'list-item' },
          el('div', {},
            el('strong', {}, '选定方向'),
            el('small', {}, chosen)),
          el('span', { class: layer.chosen_direction ? 'tag ok' : 'tag warn' },
            layer.chosen_direction ? '已选定' : '未选定')),
        el('li', { class: 'list-item' },
          el('div', {},
            el('strong', {}, `交付包（${bundlesResp.bundles.length}）`),
            el('small', {}, bundlesResp.bundles.length
              ? bundlesResp.bundles.map((b) => `v${b.version_no}`).join(' → ')
              : '（无）')),
          el('span', { class: bundlesResp.bundles.length ? 'tag ok' : 'tag info' },
            bundlesResp.bundles.length ? '已读回' : '空')),
      ),
      el('p', { class: 'view-hint' }, '绑定链只读回；方向选定与交付打包在项目页和工作台高级区执行。'),
    );
    // B10 1:1 kpi-grid（每条证据可关联 project / decision / source / time / confidence）。
    const kpis = el('div', { class: 'kpi-grid' },
      kpiCard(String(layer.briefs.length), 'briefs', '设计简报版本'),
      kpiCard(String(layer.directions.length), 'directions', '设计方向版本'),
      kpiCard(String(layer.design_systems.length), '设计系统', '登记系统'),
      kpiCard(String(bundlesResp.bundles.length), '交付包', '/bundles 读回'));
    for (const v of kpis.querySelectorAll<HTMLElement>('strong[data-count]')) {
      const t = v.textContent; if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const systems = el('div', { class: 'panel' },
      el('h3', {}, '设计系统登记'),
      el('ul', { class: 'list' },
        ...layer.design_systems.map((s) => el('li', { class: 'list-item' },
          el('div', {},
            el('strong', {}, `${s.name} · ${s.title}`),
            el('small', {}, `v${s.version} · 证据 ${s.evidence_level}`)),
          el('span', { class: 'tag info' }, s.version)))));
    const done = el('div', {},
      kpis,
      bindingChain,
      el('div', { class: 'panel' },
        el('h3', {}, '方向契约'),
        el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
          'aria-label': '设计层版本计数表' },
          el('table', { class: 'table' },
            el('tbody', {},
              el('tr', {}, el('th', { scope: 'row' }, 'briefs'), el('td', {}, String(layer.briefs.length))),
              el('tr', {}, el('th', { scope: 'row' }, 'directions'), el('td', {}, String(layer.directions.length))),
              el('tr', {}, el('th', { scope: 'row' }, '选定方向'), el('td', {}, chosen)),
              el('tr', {}, el('th', { scope: 'row' }, '活动绑定'), el('td', {}, active)))))),
      systems,
      el('p', { class: 'view-hint' }, '版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。'),
      ...shapeNoticeRows(layerResp, bundlesResp));
    return done;
  });
}

// 项目详情 — B07 routes.json 的 `/projects/:id`（project-detail）。W03「项目中心」
// 的核心动作：从项目列表进入单个项目的上下文。只读回读，不写。
// 2026-09-30 — 项目详情页横向阶段导航 + 右侧可折叠 Inspector。
//
// 阶段顺序固定为任务包「固定创作流」：
//   Brief → References → Research → Directions → Design System → Production → Versions → Review / Preflight → Handoff → Evidence
// 每个阶段节点绑定到已渲染的 panel（id 锚点），点击滚动到对应 panel 并高亮。
// Research / Review / Handoff 无后端路由的阶段标注为「PLANNED」并引用能力登记表。
// 右侧 Inspector 显示当前选定方向的版本环 + 绑定摘要，可折叠，不遮挡内容。
const PROJECT_STAGES: Array<{
  key: string; label: string;
  panelId: string;           // CSS selector for the target panel
  state: 'IMPLEMENTED' | 'PLANNED' | 'BLOCKED';
  note?: string;
}> = [
  { key: 'brief',         label: 'Brief',         panelId: '#pd-brief-editor',       state: 'IMPLEMENTED' },
  { key: 'references',    label: 'References',    panelId: '#pd-reference-panel',    state: 'IMPLEMENTED' },
  { key: 'research',      label: 'Research',      panelId: '',                       state: 'PLANNED',
    note: '研究洞察无后端路由（见能力登记表 research-insights）' },
  { key: 'directions',    label: 'Directions',    panelId: '#pd-direction-panel',    state: 'IMPLEMENTED' },
  { key: 'design-system', label: 'Design System', panelId: '#pd-design-system-panel', state: 'IMPLEMENTED' },
  { key: 'production',    label: 'Production',    panelId: '#pd-tasks-panel',        state: 'IMPLEMENTED' },
  // No #pd-versions-panel is ever rendered: version readback lives in the brief
  // / direction panels and the Inspector ring. A PLANNED node keeps the stage
  // honest, because an IMPLEMENTED chip whose anchor does not exist is a button
  // that silently does nothing (buildStageNav only reveals `note` as a
  // pointer-only title, so assistive tech and keyboard users never saw it).
  { key: 'versions',      label: 'Versions',      panelId: '',                       state: 'PLANNED',
    note: '版本读回在简报 / 方向面板与 Inspector 版本环，无独立 Versions 面板' },
  // The only preflight with a route is /api/task-preflight — the repo's
  // task-resource doctor. Design quality, Jury and production preflight have no
  // route, so the stage name carries the boundary in visible text.
  { key: 'review',        label: '资源预检（非设计评审）', panelId: '#/preflight',   state: 'IMPLEMENTED',
    note: '仅任务包资源预检可读回；设计质量 / Jury / 生产预检尚无入口' },
  { key: 'handoff',       label: 'Handoff',       panelId: '',                       state: 'PLANNED',
    note: '交接清单模型未建（能力登记表）' },
  // #pd-deliveries is a bundle manifest (id/kind/size/sha256/rights). E0-E5
  // evidence records have no HTTP route, so this stage is not the Evidence gate.
  { key: 'evidence',      label: 'Evidence',      panelId: '#pd-deliveries',          state: 'PLANNED',
    note: '交付包清单已可读回；E0–E5 证据记录无服务路由' },
];

function buildStageNav(currentStageKey?: string): HTMLElement {
  const nav = el('ol', { class: 'stage-nav', 'aria-label': '项目阶段导航' });
  for (const stage of PROJECT_STAGES) {
    const li = el('li', { class: 'stage-nav-item', dataset: { stage: stage.key, state: stage.state } });
    const isCurrent = stage.key === currentStageKey;
    if (isCurrent) li.setAttribute('aria-current', 'step');
    const btnAttrs: Record<string, unknown> = {
      type: 'button',
      class: 'stage-nav-btn' + (stage.state === 'IMPLEMENTED' ? '' : ' is-planned') + (isCurrent ? ' is-current' : ''),
      onclick: () => {
        if (stage.panelId.startsWith('#/') ) {
          // route hash — navigate
          window.location.hash = stage.panelId.slice(1);
        } else if (stage.panelId) {
          const target = document.querySelector(stage.panelId);
          if (target) {
            const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            // Scroll alone leaves the caret on the chip; focus the destination so
            // the next Tab continues from where the user was taken.
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            (target as HTMLElement).focus({ preventScroll: true });
          }
        }
      },
      title: stage.note ?? (stage.state === 'IMPLEMENTED' ? '点击跳转到该阶段' : stage.note ?? ''),
    };
    // The state tag stays in the accessible name: with aria-hidden the only
    // signal that a stage is PLANNED was a pointer-only `title`, so a keyboard
    // user pressed an enabled-looking button and nothing happened.
    const tag: HTMLElement | null = stage.state !== 'IMPLEMENTED'
      ? el('span', { class: 'tag ' + (stage.state === 'BLOCKED' ? 'warn' : 'neutral') }, en(stage.state))
      : null;
    li.append(el('button', btnAttrs,
      el('span', { class: 'stage-nav-label' }, stage.label),
      ...(tag ? [tag] : []),
    ));
    nav.append(li);
  }
  return nav;
}

function buildInspectorPanel(id: string, layer: DesignLayerReadback): HTMLElement {
  // Direction versions for the ring: one node per direction record.
  const versionData = layer.directions.map((d) => ({
    version: d.version,
    chosen: d.chosen,
    superseded_by: d.superseded_by,
  }));
  const ring = buildVersionRing(versionData);
  const chosen = layer.chosen_direction;
  const binding = layer.active_binding;
  const sysItems: Array<HTMLElement | null> = layer.design_systems.length
    ? [el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, '设计系统'),
          el('small', {}, layer.design_systems.map((s) => s.name).join(', '))))]
    : [];
  const body = el('div', { class: 'inspector-body' },
    ...(ring ? [ring] : []),
    el('p', { class: 'view-hint' }, `${layer.directions.length} 个方向版本` +
      (chosen ? ` · 选定：${chosen.title} v${chosen.version}` : ' · 尚未选定方向')),
    el('ul', { class: 'list' },
      el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, '活动绑定'),
          el('small', {}, binding
            ? `${binding.design_system_name} → ${binding.direction_id}`
            : '（无活动绑定）')),
      ),
      ...sysItems.filter((x): x is HTMLElement => x !== null),
    ),
  );
  return el('aside', { class: 'inspector', id: 'pd-inspector', 'aria-label': '项目 Inspector' },
    el('div', { class: 'inspector-head' },
      el('h3', {}, 'Inspector'),
      el('button', { type: 'button', class: 'ghost-btn inspector-toggle',
        'aria-expanded': 'true',
        onclick: (e: Event) => {
          const btn = e.currentTarget as HTMLButtonElement;
          const collapsed = btn.getAttribute('aria-expanded') === 'false';
          btn.setAttribute('aria-expanded', String(!collapsed));
          (btn.parentElement?.parentElement as HTMLElement | null)?.classList.toggle('is-collapsed', collapsed);
        },
      }, '收起'),
    ),
    body);
}

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
// Labels are real <label for> elements carrying the class `.field-label`. The
// bare `label` element selector in style.css (display:grid / 12px / --ink) is
// exactly the pre-B10 leak W02 removed, so every rule that styles these is
// class-scoped and wins on specificity. A placeholder is not a label: it
// disappears the moment the operator types, and required-vs-optional lived only
// inside it.
function fieldRow(labelText: string, input: HTMLElement, id: string): HTMLElement {
  const label = el('label', { class: 'field-label', for: id }, labelText);
  return el('div', { class: 'field-row' }, label, input);
}

function briefFieldRow(prefix: string): {
  row: HTMLDivElement; title: HTMLInputElement; goals: HTMLInputElement; constraints: HTMLInputElement;
} {
  const title = el('input', { id: `${prefix}-title`, class: 'input', maxlength: '160', placeholder: '例如：秋季品牌视觉' });
  const goals = el('input', { id: `${prefix}-goals`, class: 'input', maxlength: '400', placeholder: '现代, 温暖, 克制' });
  const constraints = el('input', { id: `${prefix}-constraints`, class: 'input', maxlength: '400', placeholder: '例如：不改变 logo 拓扑' });
  const row = el('div', { class: 'row-card', style: 'display:grid;gap:8px' },
    fieldRow('简报标题（必填）', title, `${prefix}-title`),
    fieldRow('目标（逗号分隔，必填）', goals, `${prefix}-goals`),
    fieldRow('约束（可选）', constraints, `${prefix}-constraints`));
  return { row, title, goals, constraints };
}

// Pack 01_RESEARCH_AND_PRODUCT §103: "中文长标题截断有全称入口".
//
// A `title` attribute alone is NOT an entry point: it is pointer-only, invisible to the
// keyboard and to assistive tech. So a truncated heading gets a real <button> that expands
// the text IN PLACE, carries `aria-expanded`, and is reachable by Tab/Enter. The button
// carries a stable `.title-expand` class so tests (and future styling) do not have to match
// on its label text -- matching by label is what made the previous attempt unverifiable.
// A short title gets NO control: nothing was hidden, so nothing needs revealing.
const TITLE_MAX = 18;
function expandableTitle(text: string, suffix = ''): HTMLElement {
  const shown = `${text}${suffix}`;
  const wrap = el('span', { class: 'title-cell' });
  if (shown.length <= TITLE_MAX) {
    wrap.append(el('strong', { class: 'title-text' }, shown));
    return wrap;
  }
  const node = el('strong', { class: 'title-text', title: shown }, `${shown.slice(0, TITLE_MAX)}…`);
  const btn = el('button', {
    type: 'button', class: 'ghost-btn title-expand', 'aria-expanded': 'false',
    onclick: () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      node.textContent = expanded ? `${shown.slice(0, TITLE_MAX)}…` : shown;
      btn.textContent = expanded ? '全称' : '收起';
    },
  }, '全称');
  wrap.append(node, btn);
  return wrap;
}

function renderBriefEditor(id: string, layer: DesignLayerResponse['design_layer'], target: HTMLElement): HTMLElement {
  const status = el('p', { class: 'view-hint', id: 'pd-brief-status', role: 'status' }, '本页可真实创建并保存简报；保存成功后从服务端重新读回。');
  // Pack 01_RESEARCH_AND_PRODUCT: "表单保存有 dirty、saving、saved、conflict 状态，
  // 离开未保存页有恢复策略". Those four words ARE the state vocabulary, so they are the
  // labels. A generic "错误" would lose the one distinction that matters: a CONFLICT is
  // recoverable (continue from the newest version); a validation failure is not the same
  // thing at all.
  const stateChip = el('span', { class: 'tag info', id: 'pd-brief-state' }, '未修改');
  const setState = (kind: 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'failed'): void => {
    const chip = (document.getElementById('pd-brief-state') as HTMLElement | null) || stateChip;
    const label: Record<typeof kind, string> = {
      idle: '未修改', dirty: '未保存（dirty）', saving: '保存中（saving）',
      saved: '已保存（saved）', conflict: '冲突（conflict·可恢复）', failed: '失败',
    };
    chip.className = kind === 'saved' ? 'tag ok'
      : kind === 'conflict' ? 'tag warn'
        : (kind === 'failed' ? 'tag bad' : 'tag info');
    chip.textContent = label[kind];
  };
  // 离开未保存页的恢复策略: the draft is kept locally (per project + form) and offered back
  // on return; it is discarded the moment a save succeeds. Nothing is transmitted -- this is
  // a recovery aid, not a second source of truth.
  //
  // It is nonetheless design text sitting in browser origin storage, which is
  // outside the "产物留在项目内" boundary, so it is bounded rather than open-ended:
  // a 24 h TTL, a size ceiling, and malformed records are refused. Surviving a
  // reload is the feature; surviving indefinitely is not.
  const draftKey = (form: string): string => `design-lab.brief-draft:${id}:${form}`;
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const DRAFT_MAX_CHARS = 2000;
  const readDraft = (form: string): { title: string; goals: string; constraints: string } | null => {
    try {
      const raw = globalThis.localStorage?.getItem(draftKey(form));
      if (!raw || raw.length > DRAFT_MAX_CHARS) return null;
      const o = JSON.parse(raw) as { title?: unknown; goals?: unknown; constraints?: unknown;
                                     savedAt?: unknown };
      if (typeof o?.title !== 'string' && typeof o?.goals !== 'string') return null;
      if (typeof o.savedAt !== 'number' || Date.now() - o.savedAt > DRAFT_TTL_MS) return null;
      return { title: String(o.title ?? ''), goals: String(o.goals ?? ''), constraints: String(o.constraints ?? '') };
    } catch { return null; }
  };
  const writeDraft = (form: string, v: { title: string; goals: string; constraints: string }): void => {
    try {
      const payload = JSON.stringify({ ...v, savedAt: Date.now() });
      if (payload.length > DRAFT_MAX_CHARS) return;
      globalThis.localStorage?.setItem(draftKey(form), payload);
    } catch { /* private mode */ }
  };
  const clearDraft = (form: string): void => {
    try { globalThis.localStorage?.removeItem(draftKey(form)); } catch { /* ignore */ }
  };
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
    // A conflict is recoverable (continue from the newest version); a validation or
    // transport failure is not the same thing, so they get different states.
    setState(errMsg(error) === 'STALE_REVISION' ? 'conflict' : 'failed');
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
  const createValues = () => ({ title: create.title.value, goals: create.goals.value, constraints: create.constraints.value });
  for (const f of [create.title, create.goals, create.constraints]) {
    f.addEventListener('input', () => { setState('dirty'); writeDraft('create', createValues()); });
  }
  createBtn.addEventListener('click', () => {
    void (async () => {
      setState('saving');
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
        // Clear the draft BEFORE refreshing: refresh() re-reads localStorage, so clearing
        // afterwards re-rendered the panel with the draft still present and showed
        // "已恢复上次未保存的草稿" immediately after a SUCCESSFUL save (caught by the
        // save-state harness). The draft's reason to exist ends at the write, not after.
        clearDraft('create');
        await refresh();          // real read-back from the service, not a local echo
        ok(`简报已保存并读回：「${title}」。`);
        setState('saved');
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
  const lineageBox = el('ul', { class: 'list', id: 'pd-brief-lineage' });

  const loadLineage = async (briefId: string): Promise<void> => {
    const data = await apiOrEmpty<BriefLineageResponse>(`/projects/${id}/briefs/${briefId}/lineage`, {
      lineage: { brief_id: briefId, root_id: briefId, requested_id: briefId, live_id: null, versions: [] },
    });
    const rows = data.lineage.versions;
    const liveId = data.lineage.live_id;
    // The box is a <ul>, so the notice has to be an <li>; the sentence itself still
    // comes from the one shapeNotice source the page-level rows use.
    const notice = shapeNotice(data);
    lineageBox.replaceChildren(
      ...(notice ? [el('li', { class: 'error' }, notice)] : []),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, `版本链（${rows.length}）`),
          el('small', {}, `当前 ${liveId ? `版本 ${versions.get(liveId) ?? '?'}` : '—'}`))),
      ...rows.map((row) => el('li', { class: 'list-item' },
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

  const revValues = () => ({ title: rev.title.value, goals: rev.goals.value, constraints: rev.constraints.value });
  for (const f of [rev.title, rev.goals, rev.constraints]) {
    f.addEventListener('input', () => { setState('dirty'); writeDraft('rev', revValues()); });
  }
  revBtn.addEventListener('click', () => {
    void (async () => {
      const source = revTarget;
      if (!source) { fail(new Error('请先在某一简报行点击「新版本」以载入要修订的内容')); return; }
      setState('saving');
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
        clearDraft('rev');        // before refresh(), for the same reason as the create path
        await refresh();
        ok(`简报已保存为版本 ${data.brief.version}；版本 ${source.version} 只保留为历史，旧内容未被改写。`);
        setState('saved');
      } catch (error) {
        fail(error);
      } finally {
        revBtn.disabled = false;
      }
    })();
  });

  const briefRows = layer.briefs.length
    ? layer.briefs.map((brief) => el('li', { class: 'list-item' },
        el('div', {},
          expandableTitle(brief.title, ` · v${brief.version}`),
          el('small', {}, `${brief.goals.join(' / ')}${brief.constraints ? ` · ${brief.constraints}` : ''} · 参考 ${brief.reference_asset_ids.length} · ${brief.created_at}`)),
        el('div', { class: 'actions' },
          el('span', { class: brief.superseded_by === null ? 'tag ok' : 'tag warn' }, versionState(brief.superseded_by, versions)),
          el('button', { type: 'button', class: 'ghost-btn', onclick: () => startRevision(brief) }, '新版本'))))
    : [emptyLi(layer, '尚无简报', '用下方表单创建该项目的第一份简报（真实写入，保存后读回）')];

  // 离开未保存页的恢复策略: restore any draft found for this project + form, disclose it,
  // and offer a one-click discard. The restored values are NOT silently presented as the
  // saved version -- the chip says 未保存（dirty） and the note names what was restored.
  const restored: string[] = [];
  const createDraft = readDraft('create');
  if (createDraft) {
    create.title.value = createDraft.title;
    create.goals.value = createDraft.goals;
    create.constraints.value = createDraft.constraints;
    restored.push('新建简报');
  }
  const revDraft = readDraft('rev');
  if (revDraft) {
    rev.title.value = revDraft.title;
    rev.goals.value = revDraft.goals;
    rev.constraints.value = revDraft.constraints;
    restored.push('修订');
  }
  if (restored.length) setState('dirty');
  const draftNote = el('p', { class: 'view-hint', id: 'pd-brief-draft' }, restored.length
    ? `已恢复上次未保存的草稿：${restored.join('、')}。草稿仅保存在本机；保存成功或丢弃后即清除。`
    : '');
  const discardBtn = el('button', {
    type: 'button', class: 'ghost-btn', id: 'pd-brief-discard',
    onclick: () => {
      clearDraft('create'); clearDraft('rev');
      setState('idle');
      draftNote.textContent = '草稿已丢弃；表单内容未改动服务端任何状态。';
    },
  }, '丢弃草稿');

  const panel = el('div', { class: 'panel', id: 'pd-brief-editor' });
  panel.append(
    el('h3', {}, `简报（Brief）· ${layer.briefs.length} 个版本`),
    el('ul', { class: 'list' }, ...briefRows),
    el('div', { class: 'row-card', style: 'display:grid;gap:10px' },
      el('strong', {}, '新建简报'), create.row, el('div', { class: 'actions' }, createBtn)),
    el('div', { class: 'row-card', style: 'display:grid;gap:10px' },
      el('strong', {}, '修订 / 新增版本'), revHint, rev.row, el('div', { class: 'actions' }, revBtn)),
    lineageBox,
    el('div', { class: 'actions', id: 'pd-brief-statebar' }, stateChip, discardBtn),
    draftNote,
    status);
  return panel;
}

// ---------------------------------------------------------------------------
// W04 — 参考与资产 (reference/assets) in the route shell.
//
// 鉴权图像路径: the service authenticates with an `Authorization: Bearer` header ONLY
// (src/design_lab/http_service.py:107) — there is no query-parameter token and no cookie.
// A bare `<img src="/api/projects/<id>/assets/<asset>/content">` therefore CANNOT load
// asset bytes (401); the bytes must be fetched through `api()` and turned into a data:
// URL. That is the same path the legacy `preview()` uses, reused rather than reinvented.
//
// 大图按需生成预览: the list renders NO image elements and fetches NO bytes. Content is
// read only when a row's 「预览」 is clicked, so a project with many assets does not pull
// every full-size image on page load.
//
// 图片不被默认裁剪 / alpha 可见: the preview uses `object-fit: contain` (a `cover` default
// would crop) over a checkerboard ground so transparency is visible rather than reading as
// a black or white box. See `.ref-preview` in style.css.
//
// 未知 rights: the service writes `NOT_REVIEWED` at import and enforces rights elsewhere;
// this panel surfaces the value and says plainly that unreviewed rights block production
// certification. It does NOT claim to enforce anything itself.
function renderReferencePanel(id: string): HTMLElement {
  const heading = el('h3', { id: 'pd-ref-heading' }, '参考素材');
  const list = el('ul', { class: 'list', id: 'pd-ref-list' },
    el('li', { class: 'list-item' }, el('div', {}, el('strong', {}, '正在读回…'))));
  const preview = el('img', { id: 'pd-ref-preview', class: 'ref-preview', alt: '参考素材预览' });
  preview.hidden = true;
  const info = el('p', { class: 'view-hint', id: 'pd-ref-info' },
    '点某一行的「预览」按需读取该资产；清单本身不预加载整图。');
  const status = el('p', { class: 'view-hint', id: 'pd-ref-status', role: 'status' }, '');
  const showError = (message: string): void => { status.className = 'error'; status.textContent = message; };
  const showHint = (message: string): void => { status.className = 'view-hint'; status.textContent = message; };

  const previewAsset = async (assetId: string): Promise<void> => {
    showHint(`正在读取 ${assetId} …`);
    try {
      const data = await api<AssetContentResponse>(`/projects/${id}/assets/${assetId}/content`);
      const a = data.asset;
      if (!['image/png', 'image/jpeg'].includes(a.media_type)) throw new Error(`UNSUPPORTED_PREVIEW:${a.media_type}`);
      preview.src = `data:${a.media_type};base64,${data.content_base64}`;
      preview.hidden = false;
      info.textContent = `${a.width} × ${a.height} · ${a.media_type} · rights: ${a.rights} · sha256 ${a.sha256.slice(0, 16)}…`;
      showHint(`已按需读回 ${assetId}。`);
    } catch (error) {
      // 缺失引用可定位: the failing asset id is named, and no stale image is left shown.
      preview.hidden = true;
      preview.removeAttribute('src');
      info.textContent = '—';
      showError(`资产 ${assetId} 读取失败：${errMsg(error)}`);
    }
  };

  const assetRow = (a: AssetListResponse['assets'][number]): HTMLElement => {
    const rights = a.rights === 'NOT_REVIEWED'
      ? el('span', { class: 'tag warn' }, '权利未审查')
      : el('span', { class: 'tag info' }, a.rights);
    // NOTE (measured, not assumed): the live /assets payload carries
    // id, version_id, sha256, byte_size, rights, width, height, media_type -- it does NOT
    // carry `kind` or `version_no`, even though contracts.ts declares them on AssetRecord.
    // Rendering the declared fields blindly printed "undefined · 版本 undefined" in the row.
    // So: build the line from what is actually present, and prefer version_id (which does
    // exist) over version_no. Nothing here may ever render the string "undefined".
    const headline = [a.width !== undefined && a.height !== undefined ? `${a.width} × ${a.height}` : null,
      a.media_type, a.kind].filter(Boolean).join(' · ');
    const provenance = [a.id,
      a.version_no !== undefined ? `版本 ${a.version_no}` : null,
      a.version_id ? `version_id ${a.version_id.slice(0, 12)}…` : null,
      a.sha256 ? `sha256 ${String(a.sha256).replace(/^sha256:/, '').slice(0, 16)}…` : null,
    ].filter(Boolean).join(' · ');
    return el('li', { class: 'list-item' },
      el('div', {}, el('strong', {}, headline), el('small', {}, provenance)),
      el('div', { class: 'actions' },
        rights,
        el('button', { type: 'button', class: 'ghost-btn', id: `pd-ref-preview-${a.id}`, onclick: () => { void previewAsset(a.id); } }, '预览')));
  };

  // Extracted so a completed import can re-read the list from the SERVICE (real
  // read-back) instead of echoing what the loop thinks it did.
  const loadAssets = async (): Promise<boolean> => {
    try {
      const data = await api<AssetListResponse>(`/projects/${id}/assets`);
      const assets = data.assets;
      heading.textContent = `参考素材（${assets.length}）`;
      list.replaceChildren(
        ...(assets.length ? assets.map(assetRow) : [el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '尚无参考素材'),
            el('small', {}, '用下方批量导入，或在旧工作台导入；未知权利可研究，但会阻止生产认证。')))]));
      showHint(assets.some((a) => a.rights === 'NOT_REVIEWED')
        ? '清单已读回。存在「权利未审查」的素材：可继续研究，但在权利清除前不能作为生产认证依据（服务端 fail-closed）。'
        : '清单已读回；图片内容按需读取。');
      return true;
    } catch (error) {
      // Same honesty rule as the triage panels: an unreadable list is not an empty one.
      heading.textContent = '参考素材';
      list.replaceChildren(el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '未读回'),
          el('small', {}, '资产清单读取失败；此处不显示 0，避免把「没读到」说成「没有」。'))));
      showError(`资产清单读取失败：${errMsg(error)}`);
      return false;
    }
  };
  void loadAssets();

  // ---- 批量导入：可取消 + 报告部分失败 ------------------------------------------
  // The pack's W04 acceptance asks for exactly this: "批量导入可取消并报告部分失败".
  // The semantics are stated rather than implied:
  //   · One file per POST -- the service accepts a single content_base64 per request.
  //   · Cancel takes effect BEFORE THE NEXT FILE STARTS; the file already in flight is
  //     allowed to finish and its REAL outcome is reported. It is deliberately NOT aborted
  //     mid-request, because a cancelled in-flight write may still have persisted
  //     server-side -- claiming otherwise would be the same "report an unknown outcome as
  //     known" error the triage panels exist to prevent.
  //   · A failed file never counts as imported; the summary counts only real outcomes.
  const fileInput = el('input', { type: 'file', id: 'pd-ref-files', class: 'input',
    multiple: 'multiple', accept: 'image/png,image/jpeg' });
  const importBtn = el('button', { type: 'button', class: 'primary-btn', id: 'pd-ref-import' }, '开始导入');
  const cancelBtn = el('button', { type: 'button', class: 'ghost-btn', id: 'pd-ref-cancel' }, '取消');
  cancelBtn.disabled = true;
  const results = el('ul', { class: 'list', id: 'pd-ref-import-results' });
  const summary = el('p', { class: 'view-hint', id: 'pd-ref-import-summary' }, '尚未导入。');
  const selection = el('p', { class: 'view-hint', id: 'pd-ref-selection' }, '未选择文件。');
  let batchRunning = false;
  let cancelRequested = false;

  type Row = { name: string; status: 'ok' | 'failed' | 'cancelled'; detail: string };
  const renderResults = (rows: Row[], pending?: string): void => {
    results.replaceChildren(...rows.map((r) => el('li', { class: 'list-item' },
      el('div', {}, el('strong', {}, r.name), el('small', {}, r.detail)),
      el('span', { class: r.status === 'ok' ? 'tag ok' : (r.status === 'cancelled' ? 'tag warn' : 'tag bad') },
        r.status === 'ok' ? '已导入' : (r.status === 'cancelled' ? '已取消' : '失败')))));
    const ok = rows.filter((r) => r.status === 'ok').length;
    const failed = rows.filter((r) => r.status === 'failed').length;
    const cancelled = rows.filter((r) => r.status === 'cancelled').length;
    summary.className = 'view-hint';
    summary.textContent = `导入 ${rows.length} 个：成功 ${ok} · 失败 ${failed} · 已取消 ${cancelled}`
      + (failed ? '（失败项未写入服务端）' : '')
      // While the service read-back is still running the summary says so, so "the loop
      // finished" is never confused with "the list now reflects the service".
      + (pending ? ` · ${pending}` : '');
  };

  fileInput.addEventListener('change', () => {
    const n = fileInput.files ? fileInput.files.length : 0;
    selection.textContent = n ? `已选择 ${n} 个文件。` : '未选择文件。';
  });
  cancelBtn.addEventListener('click', () => {
    if (!batchRunning) return;
    cancelRequested = true;
    cancelBtn.disabled = true;
    selection.textContent = '已请求取消：正在上传的这个文件会完成，其余不再开始。';
  });

  importBtn.addEventListener('click', () => {
    void (async () => {
      if (batchRunning) return;
      const files = Array.from(fileInput.files ?? []);
      if (!files.length) { showError('请先选择要导入的图片（PNG / JPEG）。'); return; }
      batchRunning = true;
      cancelRequested = false;
      importBtn.disabled = true;
      cancelBtn.disabled = false;
      const rows: Row[] = [];
      for (const file of files) {
        if (cancelRequested) { rows.push({ name: file.name, status: 'cancelled', detail: '取消后未开始' }); continue; }
        // Client gate mirrors the legacy import exactly: same media types, same 32 MiB cap.
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
          rows.push({ name: file.name, status: 'failed', detail: `不支持的媒体类型 ${file.type || '(空)'}：仅 PNG / JPEG` });
          renderResults(rows); continue;
        }
        if (file.size > 32 * 1024 * 1024) {
          rows.push({ name: file.name, status: 'failed', detail: `超过 32 MiB（${Math.round(file.size / 1048576)} MiB）` });
          renderResults(rows); continue;
        }
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = '';
          for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          await api(`/projects/${id}/assets`, { content_base64: btoa(binary), idempotency_key: uuid() });
          rows.push({ name: file.name, status: 'ok', detail: `${Math.round(file.size / 1024)} KiB · 服务端已确认` });
        } catch (error) {
          rows.push({ name: file.name, status: 'failed', detail: errMsg(error) });
        }
        renderResults(rows);
      }
      batchRunning = false;
      importBtn.disabled = false;
      cancelBtn.disabled = true;
      // ALWAYS render the final rows. The first version skipped this on the cancel path
      // (the cancelled rows were pushed but never painted, and the success message was
      // gated on !cancelRequested), so a cancelled batch left the PREVIOUS batch's results
      // and summary on screen -- the user would read stale outcomes as if they were this
      // run's. Caught by the batch harness.
      renderResults(rows, '正在从服务端重新读回清单…');
      // `loadAssets` reports its own outcome; if it failed it paints 未读回 in
      // the list, and the summary must not then claim the list was read back.
      const listRead = await loadAssets();
      renderResults(rows);         // final: loop outcomes AND a settled list
      const ok = rows.filter((r) => r.status === 'ok').length;
      const cancelled = rows.filter((r) => r.status === 'cancelled').length;
      if (cancelRequested) {
        showHint(`已取消：成功 ${ok}，已取消 ${cancelled}（取消后未开始的文件未写入服务端；正在上传的那个已按其真实结果记入）。`);
      } else if (ok === rows.length) {
        showHint(listRead ? `全部 ${ok} 个文件已导入并从服务端读回。`
                          : `全部 ${ok} 个文件已导入；导入后的清单未读回，请稍后刷新。`);
      } else {
        showHint(`导入结束：成功 ${ok} / ${rows.length}；失败项未写入，`
          + (listRead ? '清单已从服务端重新读回。' : '清单未读回，请稍后刷新。'));
      }
    })();
  });

  return el('div', { class: 'panel', id: 'pd-reference-panel' },
      heading, list,
      el('div', { class: 'row-card', style: 'display:grid;gap:8px' },
        el('strong', {}, '预览（按需读取）'), preview, info),
    el('div', { class: 'row-card', style: 'display:grid;gap:8px' },
      el('strong', {}, '批量导入（PNG / JPEG，单个 ≤ 32 MiB）'),
      fieldRow('选择要导入的图片', fileInput, 'pd-ref-files'), selection,
      el('div', { class: 'actions' }, importBtn, cancelBtn),
      results, summary),
    status);
}

// ---------------------------------------------------------------------------
// W05 — Direction（方向卡 / 候选对比 / 人工选择）.
//
// W05 验收 (pack):
//   1. 版本链、chosen 和 active binding 一致
//   2. **AI 候选不能自动替代人选**
//   3. 改变 Brief 使相关审查状态**显式过期**
//   4. 整图背景不能冒充可编辑重建  <- 属「可修正对象计划」部分，本轮未做（见 finding）
//
// What this panel enforces, and why each is not cosmetic:
//   · Choosing is an explicit human act: it POSTs /directions/{id}/choose with
//     actor_kind='human'. Nothing auto-chooses -- a freshly created candidate is never
//     marked chosen, and the panel says so before anyone acts. (验收 2)
//   · A direction bound to a brief version that has since been SUPERSEDED is flagged as
//     needing re-review, derived from the readback (superseded_by) rather than a local
//     guess -- and flagged as "needs re-review", not as silently still-valid nor as
//     silently void. (验收 3)
//   · chosen vs active binding is reported as the service actually has it, including the
//     honest intermediate state "方向已选定，但尚未绑定设计系统". (验收 1)
function renderDirectionPanel(id: string, layer: DesignLayerResponse['design_layer'], target: HTMLElement): HTMLElement {
  const status = el('p', { class: 'view-hint', id: 'pd-dir-status', role: 'status' }, '');
  const showError = (m: string): void => { status.className = 'error'; status.textContent = m; };
  const showHint = (m: string): void => { status.className = 'view-hint'; status.textContent = m; };
  const refresh = async (): Promise<void> => {
    const live = document.getElementById('route-view') as HTMLElement | null;
    await renderProjectDetail(id, live || target);
  };

  const briefById = new Map(layer.briefs.map((b) => [b.brief_id, b]));
  const liveBriefs = layer.briefs.filter((b) => b.superseded_by === null);
  const chosen = layer.chosen_direction;
  const binding = layer.active_binding;

  // 验收 1: report the REAL relationship, including the honest intermediate state.
  const consistency = !chosen
    ? (binding ? '不一致：存在活动绑定但没有选定方向' : '尚未选定方向')
    : (binding
      ? (binding.direction_id === chosen.direction_id
        ? `一致：选定方向与活动绑定同为一个（${chosen.title}）`
        : `不一致：选定方向「${chosen.title}」≠ 活动绑定所属方向 ${binding.direction_id}`)
      : '方向已选定，但尚未绑定设计系统（属正常中间态，不宣称已一致到交付）');

  const directionRow = (d: DesignDirection): HTMLElement => {
    const bound = briefById.get(d.brief_id);
    const stale = bound ? bound.superseded_by !== null : true;
    const mood = [d.color_mood ? `色感 ${d.color_mood}` : null, d.typography_mood ? `字感 ${d.typography_mood}` : null]
      .filter(Boolean).join(' · ') || '（未填色感/字感）';
    const notes = d.style_notes && d.style_notes.length ? d.style_notes.join(' / ') : null;
    return el('li', { class: 'list-item' },
      el('div', {},
        expandableTitle(d.title, ` · v${d.version}`),
        el('small', {}, `${mood}${notes ? ` · ${notes}` : ''} · ${d.direction_id}`),
        el('small', {}, d.actor ? `选定人：${d.actor}（${d.actor_kind ?? '未标注类型'}）` : '尚未有人选定'),
        // 验收 3: explicit expiry, derived from the readback.
        ...(stale
          ? [el('small', { class: 'error' }, bound
            ? `绑定的简报版本 v${bound.version} 已被取代 → 该方向需重新审查（不自动失效，也不自动沿用）`
            : '绑定的简报已不在当前项目中 → 需重新审查')]
          : [])),
      el('div', { class: 'actions' },
        d.chosen ? el('span', { class: 'tag ok' }, '已选定') : el('span', { class: 'tag info' }, '候选'),
        ...(d.chosen ? [] : [el('button', {
          type: 'button', class: 'ghost-btn', id: `pd-dir-choose-${d.direction_id}`,
          onclick: () => {
            void (async () => {
              showHint(`正在以人工身份选定「${d.title}」…`);
              try {
                await api(`/projects/${id}/directions/${d.direction_id}/choose`, {
                  actor: 'workbench-user', actor_kind: 'human', idempotency_key: uuid(),
                });
                await refresh();
              } catch (error) { showError(`方向选择未确认：${errMsg(error)}`); }
            })();
          },
        }, '选定（人工）')])));
  };

  const briefSelect = el('select', { id: 'pd-dir-brief', class: 'input' },
    ...(liveBriefs.length
      ? liveBriefs.map((b) => el('option', { value: b.brief_id }, `${b.title} · v${b.version} · ${b.brief_id.slice(-8)}`))
      : [el('option', { value: '' }, '（没有可用简报版本）')]));
  const title = el('input', { id: 'pd-dir-title', class: 'input', maxlength: '160', placeholder: '方向标题（必填）' });
  const colorMood = el('input', { id: 'pd-dir-color', class: 'input', maxlength: '120', placeholder: '色感（可选）' });
  const typeMood = el('input', { id: 'pd-dir-type', class: 'input', maxlength: '120', placeholder: '字感（可选）' });
  const createBtn = el('button', { type: 'button', class: 'primary-btn', id: 'pd-dir-create' }, '新建方向候选');

  createBtn.addEventListener('click', () => {
    void (async () => {
      const briefId = briefSelect.value;
      const t = title.value.trim();
      if (!briefId) { showError('请先创建一份简报，再立方向。'); return; }
      if (!t) { showError('方向需要标题。'); title.setAttribute('aria-invalid', 'true'); title.focus(); return; }
      title.removeAttribute('aria-invalid');
      createBtn.disabled = true;
      showHint('正在提交方向候选…');
      try {
        await api(`/projects/${id}/directions`, {
          brief_id: briefId, title: t, style_notes: null,
          color_mood: colorMood.value.trim() || null,
          typography_mood: typeMood.value.trim() || null,
          idempotency_key: uuid(),
        });
        await refresh();
        const node = document.getElementById('pd-dir-status');
        if (node) {
          node.className = 'view-hint';
          node.textContent = `方向候选「${t}」已保存并读回；候选不会自动成为选定方向，必须由人选定。`;
        }
      } catch (error) {
        showError(`方向未确认：${errMsg(error)}`);
      } finally { createBtn.disabled = false; }
    })();
  });

  return el('div', { class: 'panel', id: 'pd-direction-panel' },
      el('h3', {}, `方向（Direction）· ${layer.directions.length} 个候选`),
      el('p', { class: 'view-hint', id: 'pd-dir-consistency' }, `版本链 / 选定 / 绑定一致性：${consistency}`),
    el('ul', { class: 'list' },
      ...(layer.directions.length
        ? [...layer.directions].map(directionRow)
        : [emptyLi(layer, '尚无方向候选', '先建立简报，再用下方表单立候选；选定必须由人执行。')])),
    el('div', { class: 'row-card', style: 'display:grid;gap:8px' },
      el('strong', {}, '新建方向候选（绑定到某个简报版本）'),
      fieldRow('所属简报版本', briefSelect, 'pd-dir-brief'),
      fieldRow('方向标题（必填）', title, 'pd-dir-title'),
      fieldRow('色感（可选）', colorMood, 'pd-dir-color'),
      fieldRow('字感（可选）', typeMood, 'pd-dir-type'),
      el('div', { class: 'actions' }, createBtn)),
    status);
}

// ---------------------------------------------------------------------------
// W06 — DesignSystem catalog + bind (the "先复用 catalog/bind" half).
//
// Bind is gated on a HUMAN-CHOSEN direction, so W05's gate composes into W06: there is no
// path here that binds a design system to a candidate nobody selected. The control says
// why it is unavailable rather than silently doing nothing.
//
// Honesty about what a binding means: the service records a design contract; it does NOT
// mean production or quality acceptance. The panel repeats that and surfaces the catalog's
// `evidence_level` exactly as the service reports it (no self-promotion).
//
// The Token WRITE half of W06 (edit/preview/diff/publish/rollback) does not exist in the
// service yet; see findings/W06-TOKEN-WRITE-GAP.md for the measured gap and the proposed
// minimal schema/version/validation/permission design. It is deliberately not invented here.
function renderDesignSystemPanel(
  id: string, layer: DesignLayerResponse['design_layer'], systems: DesignSystemListResponse,
  target: HTMLElement,
): HTMLElement {
  const status = el('p', { class: 'view-hint', id: 'pd-ds-status', role: 'status' }, '');
  const showError = (m: string): void => { status.className = 'error'; status.textContent = m; };
  const showHint = (m: string): void => { status.className = 'view-hint'; status.textContent = m; };
  const refresh = async (): Promise<void> => {
    const live = document.getElementById('route-view') as HTMLElement | null;
    await renderProjectDetail(id, live || target);
  };

  const chosen = layer.chosen_direction;
  const active = layer.active_binding;
  const select = el('select', { id: 'pd-ds-name', class: 'input' },
    ...(systems.design_systems.length
      ? systems.design_systems.map((s) => el('option', { value: s.name }, `${s.title} · v${s.version} · 证据 ${s.evidence_level}`))
      : [el('option', { value: '' }, '（目录为空或未读回）')]));
  const bindBtn = el('button', { type: 'button', class: 'primary-btn', id: 'pd-ds-bind' }, '绑定到已选定方向');
  // W05's human gate composes in: no chosen direction -> no binding path, reason stated.
  bindBtn.disabled = !chosen || !systems.design_systems.length;
  const gate = el('p', { class: 'view-hint', id: 'pd-ds-gate' }, !chosen
    ? '绑定不可用：尚无人选定方向。请先在「方向」面板人工选定一个候选（AI 候选不会自动成为选定方向）。'
    : (!systems.design_systems.length
      ? '绑定不可用：设计系统目录为空或未读回。'
      : `将绑定到已选定方向「${chosen.title}」（v${chosen.version}）。`));

  bindBtn.addEventListener('click', () => {
    void (async () => {
      const name = select.value;
      if (!chosen) { showError('请先人工选定一个方向，再绑定设计系统。'); return; }
      if (!name) { showError('请选择要绑定的设计系统。'); return; }
      bindBtn.disabled = true;
      showHint(`正在绑定 ${name} …`);
      try {
        await api(`/projects/${id}/directions/${chosen.direction_id}/bind`, {
          design_system_name: name, idempotency_key: uuid(),
        });
        await refresh();
        const node = document.getElementById('pd-ds-status');
        if (node) {
          node.className = 'view-hint';
          node.textContent = `设计系统已绑定：${name}。设计契约已固定；制作与质量验收仍未执行。`;
        }
      } catch (error) {
        showError(`绑定未确认：${errMsg(error)}`);
        bindBtn.disabled = false;
      }
    })();
  });

  const consistent = !!(active && chosen && active.direction_id === chosen.direction_id);
  return el('div', { class: 'panel', id: 'pd-design-system-panel' },
      el('h3', {}, `设计系统（DesignSystem）· 目录 ${systems.design_systems.length} 项 · 绑定 ${layer.bindings.length} 次`),
    el('ul', { class: 'list' },
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '活动绑定'),
          el('small', {}, active
            ? `${active.design_system_name} · 绑定于方向 ${active.direction_id} · v${active.version}`
            : '（无活动绑定）')),
        el('span', { class: active ? 'tag ok' : 'tag info' }, active ? '已绑定' : '未绑定')),
      ...(active && chosen
        ? [el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, '绑定与选定方向的一致性'),
            el('small', {}, consistent
              ? '一致：活动绑定所属方向就是人工选定的方向。'
              : `不一致：活动绑定属于 ${active.direction_id}，而人工选定的是 ${chosen.direction_id}。`)),
          el('span', { class: consistent ? 'tag ok' : 'tag bad' }, consistent ? '一致' : '不一致'))]
        : [])),
    el('div', { class: 'row-card', style: 'display:grid;gap:8px' },
      el('strong', {}, '绑定设计系统（需先有人选定方向）'),
      gate, fieldRow('要绑定的设计系统', select, 'pd-ds-name'),
      el('div', { class: 'actions' }, bindBtn)),
    el('p', { class: 'view-hint' }, 'Token 编辑 / 预览 / 版本 diff / 发布 / 回滚在服务端尚无写 API，未实现；此处不做假编辑。'),
    status);
}

// ---- 最近交付（W03-RECENT-DELIVERIES gap -> now wired to a real route) ----
// The W03 finding recorded the missing "recent deliveries" module on the project
// page; that data now exists (GET /projects/:id/bundles) but had no panel. This
// reads that route and lists the project's delivered design bundles. It REUSES the
// proven bundle download + hash-verify flow (workbench.ts exportBundle does the
// same check): we never claim a download succeeded unless the bytes match the
// recorded sha256/size. Delivery is a read-back of a persisted artifact, not a new
// KPI; rights/quality stay NOT_REVIEWED until a real host + jury (E3/E4) runs.
function renderDeliveryPanel(id: string, data: BundleListResponse): HTMLElement {
  const bundles = data.bundles;
  const heading = el('h3', { id: 'pd-deliveries-heading' }, `交付包（${bundles.length}）`);
  const status = el('p', { class: 'view-hint', id: 'pd-deliveries-status', role: 'status' }, '');
  // The list itself was read via the service route (apiOrEmpty: a connected session
  // gets the live readback; dev/offline gets an honest empty payload) — so the rows
  // below are rendered from what the SERVICE said, never from an invented count.
  const list = el('ul', { class: 'list', id: 'pd-deliveries-list' },
    ...(bundles.length
      ? []
      : [el('li', { class: 'list-item' },
          el('div', {}, el('strong', {}, token ? '尚无交付包' : '未连接'),
            el('small', {}, token ? '任务完成并打包后，交付会在此读回。' : '连接本机设计服务后读回该项目的交付清单。')))]));

  // Mirrors exportBundle's hash check so a served bundle is only accepted when its
  // digest + size match the recorded artifact. Guarded so it cannot break the
  // headless vm path (no crypto/fetch there): it only runs on real user click.
  const download = async (bundle: BundleRecord): Promise<void> => {
    const access = token;
    const route = `/projects/${id}/bundles/${bundle.id}/versions/${bundle.version_id}/content`;
    status.textContent = `正在核对 ${bundle.id} 的交付包…`;
    const response = await fetch('/api' + route, { headers: { Authorization: 'Bearer ' + access }, cache: 'no-store' });
    if (!response.ok) { status.textContent = `交付包读取失败：HTTP ${response.status}。`; return; }
    const bytes = await response.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      (b) => b.toString(16).padStart(2, '0')).join('');
    if (digest !== bundle.sha256.replace(/^sha256:/, '') || bytes.byteLength !== bundle.byte_size) {
      status.textContent = '交付包与记录 hash 不一致，未采纳（fail-closed）。';
      return;
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `design-lab-${bundle.id.slice(-12)}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = `交付包已下载并核对 hash；字体、链接、rights 与质量仍需验收。`;
  };

  const row = (b: BundleRecord): HTMLElement => el('li', { class: 'list-item' },
    el('div', {},
      el('strong', {}, `交付包 · v${b.version_no}`),
      el('small', {}, `${b.id} · ${b.byte_size} 字节 · sha256 ${String(b.sha256).replace(/^sha256:/, '').slice(0, 16)}…`)),
    el('div', { class: 'actions' },
      el('button', {
        type: 'button', class: 'ghost-btn',
        onclick: () => { void download(b).catch((e) => { status.textContent = `交付包读取失败：${errMsg(e)}`; }); },
      }, '下载交付包'),
      el('span', { class: b.rights === 'NOT_REVIEWED' ? 'tag warn' : 'tag info' },
        b.rights === 'NOT_REVIEWED' ? '权利未审查' : b.rights)));

  // Render the live rows. A connected session's service readback failed here? It
  // cannot: `data` already holds the service answer (apiOrEmpty turns an offline
  // dev seam into an honest empty payload; a live failure still surfaces to the
  // caller, not into a silent "nothing here"). So this branch never hides a real
  // readback error behind a fake empty list.
  list.append(...bundles.map(row));
  // An empty list from the dev/offline seam is NOT "this project has no
  // deliveries" — the rows came through apiOrEmpty, so without a session the
  // absence is unread, not zero. The row above already distinguishes the two.
  status.textContent = bundles.length
    ? '交付清单已读回。hash 在点击「下载交付包」时核对；权利与质量仍需独立验收。'
    : (token ? '该项目当前没有已交付的设计包。' : '未连接：交付清单未读回，不代表该项目没有交付包。');

  return el('div', { class: 'panel', id: 'pd-deliveries' },
    heading, list,
    status,
    el('p', { class: 'view-hint' },
      '交付包内容：宿主导出的可编辑源 + 预览 + 输入清单（manifest）。BOM 尚未生成（PLANNED，无写入口）；'
      + '读取与 hash 为只读回读，权利 / 质量 / 预检仍由人工验收。'));
}

export async function renderProjectDetail(id: string, target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回该项目…'));
  rememberProject(id);   // W03 "最近项目": record the project the user actually opened
  const listing = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
  const named = listing.projects.find((p) => p.id === id);
  const [tasks, layerResp, systemsResp, bundlesResp] = await Promise.all([
    apiOrEmpty<TaskListResponse>(`/projects/${id}/tasks`, OFFLINE.tasks),
    apiOrEmpty<DesignLayerResponse>(`/projects/${id}/design-layer`, OFFLINE.designLayer),
    apiOrEmpty<DesignSystemListResponse>('/design-systems', OFFLINE.designSystems),
    apiOrEmpty<BundleListResponse>(`/projects/${id}/bundles`, OFFLINE.bundles),
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

  const taskPanel = el('div', { class: 'panel', id: 'pd-tasks-panel' },
    el('h3', {}, `任务台账（${tasks.tasks.length}）`),
    el('ul', { class: 'list' },
      ...(tasks.tasks.length
        ? tasks.tasks.slice(0, 8).map((t) => el('li', { class: 'list-item' },
            el('div', {}, el('strong', {}, t.kind), el('small', {}, `尝试 ${t.attempt.attempt_no} · ${t.attempt.state}`)),
            el('span', { class: 'tag info' }, t.state)))
        : [emptyLi(tasks, '尚无任务', '任务由工作台高级区提交')])))

  const layerPanel = el('div', { class: 'panel' },
    el('h3', {}, '设计层契约'),
    el('ul', { class: 'list' },
      valueRow('选定方向', chosen, false),
      // `active` always embeds a 32-hex direction_id, so it is a long value by
      // construction and must never go into the nowrap .tag pill (F-2).
      valueRow('活动绑定', active, true),
      valueRow('设计系统登记', String(layer.design_systems.length), false)));

  // 2026-09-30 — 横向阶段导航（Brief → … → Evidence）+ 右侧 Inspector。
  // Versions 阶段没有独立面板，它的锚点是 Inspector 里的版本环。
  const stageNav = buildStageNav();
  const inspector = buildInspectorPanel(id, layer);

  target.replaceChildren(
    pageHead,
    kpis,
    stageNav,
    el('div', { class: 'project-detail-layout' },
      el('div', { class: 'project-detail-main' },
        el('div', { class: 'two-col', style: 'margin-top:16px' }, taskPanel, layerPanel),
        el('div', { style: 'margin-top:16px' }, renderDeliveryPanel(id, bundlesResp)),
        el('div', { style: 'margin-top:16px' }, renderBriefEditor(id, layer, target)),
        el('div', { style: 'margin-top:16px' }, renderDirectionPanel(id, layer, target)),
        el('div', { style: 'margin-top:16px' }, renderDesignSystemPanel(id, layer, systemsResp, target)),
        el('div', { style: 'margin-top:16px' }, renderReferencePanel(id)),
      ),
      inspector,
    ),
    el('p', { class: 'view-hint' }, 'tasks 与 design-layer 台账为只读；简报区可真实创建与修订并读回；参考素材区读回资产清单并按需预览。提交任务 / 运行 / 取消 / 导出仍由工作台高级区执行。'),
    ...shapeNoticeRows(bundlesResp, layerResp, listing, systemsResp, tasks));
}

export async function renderRoute(view: AppView, target: HTMLElement): Promise<void> {
  target.replaceChildren();
  switch (view) {
    case 'dashboard': await renderDashboard(target); return;
    case 'brand-systems': await renderBrandSystems(target); return;
    case 'preflight-qa': await renderPreflight(target); return;
    case 'research': await renderCapabilityLibrary(target); return;
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
      // 2026-09-30 — blueprint slots now render honest capability cards
      // (from CAPABILITY_REGISTRY) instead of a bare "unopened" note.
      // Only the remaining VIEW_NOT_OPEN slots (design-domains / collaboration) reach
      // here; research now has a real readback of its own and creative-tools never did.
      const slotFor = (v: string) => v === 'design-domains' ? 'design-domain-model'
        : v === 'collaboration' ? 'collaboration' : null;
      const wanted = slotFor(view);
      const cards = el('div', { class: 'card-flow' },
        ...CAPABILITY_REGISTRY.filter((c) => c.capabilityId === wanted).map(capabilityCard));
      const hasCards = CAPABILITY_REGISTRY.some((c) => c.capabilityId === wanted);
      target.replaceChildren(
        el('h2', {}, notOpen ? viewLabel(view) : '工作台'),
        el('p', { class: 'view-unopened' }, notOpen ?? '默认工作台。'),
        ...(hasCards ? [cards] : []),
      );
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
  // The legacy Workbench still has a separate shell while the D-6 product
  // direction remains open. On narrow screens its bottom navigation is wider
  // than the viewport; keep a visible continuation cue only while more items
  // remain to the right, so the scrollable menu does not look truncated.
  const syncLegacyNavCue = (): void => {
    const mobile = typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 760px)').matches;
    const hasMore = mobile
      && nav.scrollWidth > nav.clientWidth
      && nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1;
    nav.classList.toggle('has-scroll-more', hasMore);
  };
  nav.addEventListener('scroll', syncLegacyNavCue, { passive: true });
  window.addEventListener('resize', syncLegacyNavCue);
  // The route host IS the B10 `section.content#content` view slot (B10 renders
  // each page as a direct child of `.content`, which supplies the 26/28/30
  // padding). It is built together with the rest of the B10 `.app` tree by
  // mountB10Shell(); under the vm smoke that mount is a no-op (the mock has no
  // querySelector) so the host is appended straight to <body> to keep a valid
  // render target on the headless path.
  // `tabindex="-1"` makes the view host a focus target so a route swap can keep
  // the caret where the user navigated (see show()); it stays out of the Tab
  // order itself.
  const routeView = el('div', { class: 'route-view', id: 'route-view', tabindex: '-1' });
  document.body.append(nav);
  // Scope the shell's layout gutter to the mounted state so an unmounted path
  // (the E2E default) keeps the original centered layout untouched.
  document.body.classList.add('dl-shell');

  // Build the authoritative B10 shell (.app > .ambient + .grid-bg + aside.sidebar
  // + main.main > header.topbar + section.content#content).
  const b10 = mountB10Shell(routeView, syncLegacyNavCue);
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
      // The connect form lives in #login, which `show()` above deliberately
      // hides on every routed view — so the instruction needs a working action,
      // otherwise a cold load on a hash route tells the user to connect with no
      // visible way to do it.
      target.replaceChildren(
        el('h2', {}, viewLabel(view)),
        el('p', { class: 'view-unopened' }, '请先在工作台连接本机设计服务，再读回此视图。'),
        el('button', {
          type: 'button', class: 'primary-btn',
          onclick: () => { window.location.hash = ''; },
        }, '前往工作台连接'));
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
      announceRoute(viewLabel(view));
      // Replacing every child destroys the element the user had focused, which
      // drops the caret to <body> on each route change. Move focus to the view
      // host instead, so the next Tab continues inside what just loaded.
      if (document.activeElement === document.body) target.focus({ preventScroll: true });
    }).catch((error) => {
      if (generation !== routeGeneration || current() !== view || token !== routeToken) return;
      target.replaceChildren(el('p', { class: 'error' }, `视图读回失败：${errMsg(error)}`));
      target.removeAttribute('aria-busy');
      announceRoute(`${viewLabel(view)} 读回失败`);
      if (document.activeElement === document.body) target.focus({ preventScroll: true });
    });
  };

  // One narrow live region for route changes. `#route-view` itself used to carry
  // aria-live, which made a screen reader re-read the whole KPI grid and every
  // table on each swap, and double-announce the per-panel role="status" lines.
  const routeAnnouncer = el('p', { class: 'sr-status', role: 'status' });
  document.body.append(routeAnnouncer);
  const announceRoute = (label: string): void => {
    routeAnnouncer.textContent = `${label} 已载入`;
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

function mountB10Shell(routeView: HTMLElement, syncLegacyNavCue: () => void): B10Shell | null {
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

  const sidebar = el('aside', { class: 'sidebar', id: 'app-sidebar' },
    el('div', { class: 'brand' },
      el('div', { class: 'brand-mark' }, 'DL'),
      el('div', {},
        el('h1', {}, 'DESIGN-LAB'),
        el('small', {}, '设计智能与生产能力层'))),
    // A <nav> element, not a div[aria-label]: role=generic does not support an
    // accessible name, so the label was silently dropped and no navigation
    // landmark existed on routed views (the legacy <nav> is hidden there).
    el('nav', { class: 'nav', 'aria-label': 'DESIGN-LAB 导航' },
      ...B10_NAV.map((n) => el('button', {
        type: 'button',
        dataset: { route: n.route },
        'data-hash': n.hash,
        onclick: () => { window.location.hash = n.hash; },
      },
        el('span', { class: 'nav-dot' }),
        el('span', {}, n.label)))),
    // No identity route exists (/api/health returns status/version/scope only),
    // so the footer cannot name a logged-in workspace owner. 'Alex / Personal
    // Workspace' was leftover B10 mock-up content presented as fact.
    el('div', { class: 'sidebar-footer' },
      el('div', { class: 'avatar', 'aria-hidden': 'true' }, 'D/L'),
      el('div', {},
        el('strong', {}, '本地单用户'),
        el('small', { id: 'personal-connection' }, '本机服务未连接'))));

  // B10 .topbar body. Handlers are attached by wireB10Topbar() at the end of
  // mountB10Overlays(), once the palette/drawer/toast ids exist.
  // The modifier glyph is platform-dependent: the service is served on Windows
  // and Linux too, where `⌘` advertises a key that no keyboard on those hosts
  // has. macOS keeps ⌘; everything else gets the literal `Ctrl`.
  const modKey = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
  // At <=840px the sidebar is an off-canvas drawer (see .nav-toggle in
  // style.css), so it needs a trigger that exists only there. Above that width
  // the button is display:none and the drawer classes are inert.
  const navToggle = el('button', { type: 'button', class: 'nav-toggle ghost-btn',
    id: 'navToggle', 'aria-expanded': 'false', 'aria-controls': 'app-sidebar' }, '导航');
  const setNavOpen = (open: boolean): void => {
    sidebar.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    // A closed off-canvas drawer that is only translated off-screen stays
    // focusable, so Tab walks into links nobody can see and a click can land on
    // them. `inert` takes the whole subtree out of the tab order and hit-testing,
    // but only on the mobile layout: on desktop the sidebar is visible and must
    // stay interactive.
    const mobile = window.matchMedia('(max-width: 840px)').matches;
    sidebar.toggleAttribute('inert', mobile && !open);
    if (open) sidebar.querySelector<HTMLButtonElement>('.nav button')?.focus();
    else if (mobile && sidebar.contains(document.activeElement)) navToggle.focus();
  };
  navToggle.onclick = (): void => setNavOpen(!sidebar.classList.contains('open'));
  // Without this the drawer stays on top of the page you just chose to visit.
  sidebar.addEventListener('click', (event: Event) => {
    if ((event.target as HTMLElement).closest('button')) setNavOpen(false);
  });
  const topbar = el('header', { class: 'topbar' },
    navToggle,
    el('div', { class: 'search', id: 'openPalette', role: 'button', tabindex: '0' },
      `${modKey} K\u3000搜索页面 / 命令 / 资源`),
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
    if (!routed) syncLegacyNavCue();
    // The topbar identity block used to read a static "无身份路由 · 未读回" on every
    // route. The connection state is real and already known here, so show it.
    byId<HTMLElement>('personal-connection').textContent =
      connected ? '本机服务已连接' : '本机服务未连接';
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
// Esc 关闭顶层浮层。动效偏好：CSS 层负责 transition/animation，KPI 数字补间由
// animateKpiCount 自己读 matchMedia（CSS 管不到 textContent 的变化）。
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
  // Takes nodes/text, never an HTML string: this was the only helper in the UI
  // whose contract was "pass raw markup", and markup passed to innerHTML parses
  // even under `script-src 'self'`. Keeping it DOM-constructive means a future
  // caller cannot route service text into the parser.
  const openModal = (title: string, body: Node | string, onConfirm?: () => void): void => {
    (modalBox.querySelector('h3') as HTMLElement).textContent = title;
    (modalBox.querySelector('.body') as HTMLElement).replaceChildren(body);
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
  const drawer = el('aside', { class: 'drawer', id: 'drawer', role: 'dialog', 'aria-modal': 'false', 'aria-label': '工作区详情' },
    el('h3', { style: 'margin:0 0 8px' }, '工作区 / 前端说明'),
    el('p', { class: 'muted', style: 'margin-top:0' },
      'Command Palette（Ctrl/Cmd + K）、Toast、Modal 与 Drawer 由本页真实驱动；'
      + '台账视图内容来自服务读回，未连接时显示未读回而不是数据。'),
    el('div', { class: 'status-stack', style: 'margin:14px 0 20px' },
      el('span', { class: 'tag info' }, '前端浮层'),
      el('span', { class: 'tag info' }, '本机界面偏好'),
      el('span', { class: 'tag warn' }, '只读不回写')),
    el('div', { class: 'panel' },
      el('h3', {}, '前端能力（不代表数据读回）'),
      el('ul', { class: 'list' },
        el('li', { class: 'list-item' }, el('span', {}, '本页浮层'), el('span', { class: 'tag info' }, '已渲染')),
        el('li', { class: 'list-item' }, el('span', {}, '动效'), el('span', { class: 'tag info' }, '跟随系统偏好')),
        el('li', { class: 'list-item' }, el('span', {}, '命令面板'), el('span', { class: 'tag info' }, 'Ctrl/Cmd + K')))),
    el('button', { class: 'primary-btn', type: 'button', id: 'closeDrawer', style: 'margin-top:18px;width:100%' }, '关闭'));
  document.body.append(drawer);
  const openDrawer = (): void => { drawer.classList.add('open'); };
  const closeDrawer = (): void => { drawer.classList.remove('open'); };
  (drawer.querySelector('#closeDrawer') as HTMLButtonElement).onclick = closeDrawer;

  // --- Command Palette --- (B10 .palette#palette > input#paletteInput +
  // #paletteItems > .item)
  const palette = el('div', { class: 'palette', id: 'palette', role: 'dialog', 'aria-label': '命令面板' },
    el('input', { id: 'paletteInput', placeholder: '搜索页面名称…', 'aria-label': '搜索页面' }));
  const itemsBox = el('div', { id: 'paletteItems' });
  palette.append(itemsBox);
  document.body.append(palette);
  const paletteInput = palette.querySelector('input') as HTMLInputElement;
  // 12 B07 route IA (mirror of ROUTE_VIEWS, the primary-nav minus default).
  // `go` carries the ROUTE hash (`#/dashboard`), not the view id: the router
  // matches `window.location.hash` against ROUTE_VIEWS[].hash, so a `#dashboard`
  // value matched nothing and silently landed on the legacy workbench page.
  // Rows are real <button>s because this palette is the only route switch left
  // under 840px (the B10 sidebar is display:none there) — a div-with-onclick
  // made every route unreachable by keyboard.
  const cmds = ROUTE_VIEWS.filter((r) => r.hash !== '')
    .map((r) => ({ go: r.hash, label: r.label }));
  for (const c2 of cmds) {
    itemsBox.append(el('button', {
      type: 'button', class: 'item', dataset: { go: c2.go },
      onclick: () => { window.location.hash = c2.go; closePalette(); },
    }, el('span', {}, c2.label), el('small', {}, '打开')));
  }
  let paletteInvoker: Element | null = null;
  const openPalette = (): void => {
    paletteInvoker = document.activeElement;
    palette.classList.add('open'); paletteInput.focus(); paletteInput.select();
  };
  const closePalette = (): void => {
    palette.classList.remove('open');
    paletteInput.value = '';
    itemsBox.querySelectorAll('.item').forEach((i) => { (i as HTMLElement).style.display = ''; });
    // Hiding the panel with an author `display:none` (`.palette{display:none}`)
    // drops focus to <body>; return it to whatever opened the palette.
    if (document.activeElement === document.body && paletteInvoker
      && document.contains(paletteInvoker)) {
      (paletteInvoker as HTMLElement).focus();
    }
    paletteInvoker = null;
  };
  paletteInput.addEventListener('input', () => {
    const q = paletteInput.value.toLowerCase();
    itemsBox.querySelectorAll<HTMLElement>('.item').forEach((item) => {
      item.style.display = item.textContent!.toLowerCase().includes(q) ? 'flex' : 'none';
    });
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
