// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench — shell module (Lane-C split of the D002 monolith): AppShell
// navigation over the B07 12-route IA + per-view readback renderers. Reads workbench/
// design state via named imports (no cross-module writes).

import type {
  AssetContentResponse,
  AssetListResponse,
  AssetRecord,
  BriefLineageResponse,
  BriefRevisionResponse,
  BundleListResponse,
  BriefListResponse,
  BundleRecord,
  DesignBrief,
  DesignDirection,
  DesignLayerResponse,
  DesignLayerReadback,
  DesignSystemListResponse,
  DomainListResponse,
  DomainPackRecord,
  DomainPackValidation,
  EnvironmentResponse,
  CapabilityLibraryResponse,
  CapabilityRecord,
  EventListResponse,
  NativeRuntimeResponse,
  NativeRuntimeSection,
  TaskRecord,
  HealthResponse,
  ProjectListResponse,
  TaskListResponse,
  TaskPreflightResource,
  TaskPreflightResponse,
  TokenDocumentGetResponse,
  TokenDocumentListResponse,
  TokenDocumentRecord,
} from './contracts.js';

import { api, byId, connected, errMsg, projects, setStatus, token } from './workbench.js';
// W03 reuses the SAME pure domain helpers the legacy single-page brief flow uses
// (design.ts): one validation rule, one error vocabulary, one idempotency key
// source. Sharing them is what "统一旧单页与新路由的用户流程" means here.
import { createBrief, reviseDirection, revisionHint, splitList, uuid, versionState } from './design.js';

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

// The per-field question shapeNotice cannot answer: it reports the whole list, and a view
// that is about to describe an EMPTY collection needs to know whether THAT field is one
// the seam invented. An empty <ul> may be called 尚无 only when the service really
// answered "nothing here"; when the seam had to supply the empty, saying 尚无 would be
// the claim the notice two lines down contradicts.
export function shapeFieldMissing(value: unknown, field: string): boolean {
  const missing = (value as Record<symbol, unknown> | null)?.[SHAPE_MISSING];
  return Array.isArray(missing) && missing.includes(field);
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
  tokenDocuments: { token_documents: [] } as TokenDocumentListResponse,
  capabilities: {
    schemaVersion: 'design-lab/capability-library/v1',
    meaning: '未连接本机设计服务', unmeasuredMeans: 'null = 未判定，不是 0',
    counts: { total: 0, byKind: {}, byLicense: {}, byRevisionState: {}, qualified: 0 },
    sources: {}, capabilities: [],
  } as CapabilityLibraryResponse,
  // The domain readback's honest empty: the counts are zero because nothing was read,
  // and rootState / checker.state say WHY instead of leaving a blank the page would
  // have to guess at. `validationVocabulary` is the service's own declaration of its
  // closed verdict set, so it is NOT filled in here: inventing it offline would put
  // words on the screen that no readback produced. The tally rows are built from
  // `counts.byValidation`, which is empty for exactly this reason.
  domains: {
    schemaVersion: 'design-lab/domain-pack-readback/v1',
    meaning: '未连接本机设计服务', unmeasuredMeans: 'null = 未声明 / 未判定，不是 0',
    root: 'design-lab/domain-packs', rootState: 'NOT_READ',
    validationVocabulary: [],
    checker: { path: 'design-lab/scripts/verify_domain_pack_v2.py',
               state: 'NOT_READ', note: '未连接本机设计服务' },
    sources: {}, counts: { packs: 0, byValidation: {} }, packs: [],
  } as DomainListResponse,

  tasks: { tasks: [], next_cursor: null } as TaskListResponse,
  // DL-UI-U06: every section is NOT_READ, never ABSENT. "This service never recorded a native
  // attempt" is a claim about the database's table list, and a page that never reached the
  // database has no basis for it -- the same distinction the read-back itself keeps, carried
  // one layer further so an offline screen cannot borrow the service's honesty.
  nativeRuntime: {
    schemaVersion: 'design-lab/native-runtime-readback/v1',
    project_id: '',
    host_guard: { table: 'NOT_READ', rows: null },
    quiescence: { table: 'NOT_READ', rows: null },
    reconciliation: { table: 'NOT_READ', rows: null },
    recovery_protocol: { table: 'NOT_READ', rows: null },
    executions: { table: 'NOT_READ', rows: null },
    counts: {
      hosts_held: null, attempts_quiescent_receipted: null, reconciliations_open: null,
      executions_receipted: null, executions_with_result: null,
    },
    budget: null,
    budget_reason: '未读回：没有问到预算，因此既不能说有，也不能说没有',
    proves_production_ready: false,
    is_host_action_performed: false,
    does_not_say: [],
  } as NativeRuntimeResponse,
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
//
// DL-UI-U01/U02 (2026-10-09) — 布局与架构按 20261009 包执行，配色不覆盖既有值。
// 本表因此做两件事，都不改任何既有 hash：
//   1. 每个槽位挂上 `entry`：新包的三入口（能力资产 / 分析与制作 / 成果与反馈）
//      加一个辅助组。分组只是导航的呈现层，路由字节不变，旧链接继续可达。
//   2. 增加三个槽位，全部落在**已有真实路由**上或**不需要后端**的规格面上：
//        #/capabilities  GET /api/capabilities（renderCapabilityLibrary 已存在，
//                        此前只嵌在仪表盘里，没有自己的入口）
//        #/states        pack 屏 15 界面状态，静态合同面，不发请求
//        #/components    pack 屏 16 组件规范，静态规格面，不发请求
//      菜单数量不是永久产品限制（DL-TP-20261009-UI-FIRST-R1），所以这里加项是
//      按新 IA 落地，不是往表上贴临时页；表里也没有为旧 B10 DOM 回退任何页面。
//      两处按 12 项钉死的读数随之更新，并在原地写明原因：
//        design-lab/tests/e2e/browser_design_layer_e2e.mjs 的移动端布局步
//        design-lab/tests/e2e/{audit_workbench_overflow,audit_workbench_contrast}.mjs
//        与 capture_workbench_screenshots.mjs 的页面清单（不进清单=从不被渲染，
//        这是 2026-10-07 记下的那类覆盖洞）。
// ============================================================================
export const ROUTE_ENTRIES = ['能力资产', '分析与制作', '成果与反馈', '辅助'] as const;
export type RouteEntry = (typeof ROUTE_ENTRIES)[number];

export const ROUTE_VIEWS = [
  { hash: '#/capabilities', view: 'capabilities', label: '能力目录', entry: '能力资产' },
  { hash: '#/domains', view: 'design-domains', label: '设计领域', entry: '能力资产' },
  { hash: '#/brand-systems', view: 'brand-systems', label: '品牌系统', entry: '能力资产' },
  { hash: '#/tools', view: 'creative-tools', label: '创作工具', entry: '能力资产' },
  { hash: '#/projects', view: 'projects', label: '项目', entry: '分析与制作' },
  { hash: '#/research', view: 'research', label: '研究洞察', entry: '分析与制作' },
  { hash: '#/intake', view: 'intake', label: '输入与目标', entry: '分析与制作' },
  { hash: '#/analysis', view: 'analysis', label: '分析与方案', entry: '分析与制作' },
  { hash: '#/plan', view: 'plan', label: '目标生成包', entry: '分析与制作' },
  // R2 §2 把「制作记录与待继续」放在分析与制作入口下：它是找回工作的入口，不是成果面。
  { hash: '#/records', view: 'records', label: '制作记录与待继续', entry: '分析与制作' },
  { hash: '#/deliverables', view: 'deliverables', label: '交付中心', entry: '成果与反馈' },
  { hash: '#/evidence', view: 'evidence', label: '证据系统', entry: '成果与反馈' },
  { hash: '#/preflight', view: 'preflight-qa', label: '预检 / QA', entry: '成果与反馈' },
  { hash: '', view: 'workbench', label: '工作台', entry: '辅助' },
  { hash: '#/dashboard', view: 'dashboard', label: '仪表盘', entry: '辅助' },
  { hash: '#/settings', view: 'settings', label: '系统设置', entry: '辅助' },
  { hash: '#/collaboration', view: 'collaboration', label: '团队协作', entry: '辅助' },
  { hash: '#/states', view: 'ui-states', label: '界面状态', entry: '辅助' },
  { hash: '#/components', view: 'ui-components', label: '组件规范', entry: '辅助' },
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
//   1. the browser E2E counts `.app-nav-item` and requires it to equal the number
//      of ROUTE_VIEWS entries exactly (design-lab/tests/e2e/
//      browser_design_layer_e2e.mjs, mobile appshell layout step). That reading is
//      "every table entry reached the screen as a real button", so a parameterized
//      route with no page of its own would make the count claim something untrue.
//      The number itself moved 12 -> 15 on 2026-10-09 when the adopted IA added
//      three slots; a detail route is not one of them.
//   2. A sidebar button for a detail page is wrong regardless of the count: the
//      page has no meaning without an id, so it would navigate to nothing.
// So the parameterized route is resolved SEPARATELY and is reachable only by
// navigating from a project row — which is how a detail page should work.
export type AppView = RouteView | 'project-detail' | 'capability-detail' | 'domain-detail';

/** Which nav entry a parameterized detail address lives inside.
 *
 * R2 §2/§5 make these routes second-level entries of a list, so selecting one must keep
 * the parent entry highlighted. Without this the nav goes blank on `#/projects/p-1`,
 * `#/capabilities/<id>` and `#/domains/<packId>`, which reads as "you have left the
 * catalog" at exactly the moment the reader drilled into it. */
const DETAIL_NAV_OWNER: Partial<Record<AppView, RouteView>> = {
  'project-detail': 'projects',
  'capability-detail': 'capabilities',
  'domain-detail': 'design-domains',
};

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

// DL-UI-U03 (R2 §5): a capability's full detail must be re-findable, so it gets its own
// address the same way a project does. Same hardening as above -- validate the DECODED
// id, because the shape regex admits `%`. Measured charset of the 60 recorded ids is
// `[a-z0-9-]`, longest 27; anything else (traversal, encoded slash, bare `%`) resolves to
// "no such route" rather than reaching the payload lookup.
// DETAIL_ID_RE is shared with the domain-pack detail address below: both identities are
// repo-declared lower slugs, and one validated shape is one less place to drift.
const CAPABILITY_DETAIL_RE = /^#\/capabilities\/([^/?#]+)$/;
const DETAIL_ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** Capability id from a `#/capabilities/<id>` hash, or null for any other hash. */
export function capabilityDetailId(hash: string): string | null {
  const m = CAPABILITY_DETAIL_RE.exec(hash);
  if (!m || !m[1]) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return DETAIL_ID_RE.test(decoded) ? decoded : null;
}

/** Hash for one capability's detail address. */
export function capabilityDetailHash(id: string): string {
  return '#/capabilities/' + encodeURIComponent(id);
}

// R2 §2 — the domain packs are second-level entries, so one pack needs its own address
// the same way one capability does. `packId` (not `directory`) is the stable identity a
// manifest declares, so it is what travels in the hash; a pack whose manifest declares
// no pack_id has no addressable detail and stays in the list.
const DOMAIN_DETAIL_RE = /^#\/domains\/([^/?#]+)$/;

/** Pack id from a `#/domains/<packId>` hash, or null for any other hash. */
export function domainDetailId(hash: string): string | null {
  const m = DOMAIN_DETAIL_RE.exec(hash);
  if (!m || !m[1]) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return DETAIL_ID_RE.test(decoded) ? decoded : null;
}

/** Hash for one domain pack's detail address, or null when the pack declares no id. */
export function domainDetailHash(packId: string | null | undefined): string | null {
  return packId ? '#/domains/' + encodeURIComponent(packId) : null;
}

// Honest "not open yet" copy per IA slot that has no backend route today.
// Projects / creative-tools / deliverables / evidence are READ-ONLY readbacks
// of real service routes (see renderProjects/renderCreativeTools/
// renderDeliverables/renderEvidence), and since 2026-10-08 so is design-domains
// (renderDomains over GET /api/domains, which projects the committed pack
// directories through the repo's own verify_domain_pack_v2.py). Since 2026-10-08 research also
// reads its own persisted findings back over GET /api/projects/{id}/research (renderResearch), so
// only collaboration remains, because a single-user local service has no collaboration route.
// A notice here never carries a count: the numbers a reader needs come from the route.
export const VIEW_NOT_OPEN: Partial<Record<RouteView, string>> = {
  // 'research' left this table on 2026-10-08: GET/POST /api/projects/{id}/research is dispatched
  // by src/design_lab/http_service.py and renderResearch reads it back. A slot that has a route
  // may not keep a "no route" notice -- design-lab/scripts/verify_capability_self_description.py
  // now refuses the pair.
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
  // The IA slot this row describes, when the capability is a navigation view. Declared as data
  // because design-lab/scripts/verify_capability_self_description.py compares it against the
  // routes the service dispatches: without the link, a row could keep a prose `route` value and
  // a backed slot could still be described as having no route -- which is the drift that happened
  // to this table on 2026-10-08.
  slot?: string;
  permission: string;      // 所需权限/宿主状态
  reason: string;          // 为什么是现在这个状态
  nextAction: string;      // 明确的下一动作
}
const CAPABILITY_REGISTRY: readonly CapabilityContract[] = [
  { capabilityId: 'research-insights', domain: '研究洞察', source: 'IA 槽位 #/research',
    owner: 'DESIGN-LAB design core', route: 'GET /api/projects/{id}/research', slot: 'research',
    contractRef: 'design-lab/schemas/research-finding.schema.json · design-lab/schemas/state/design-lab-state-research-v1.sql · src/design_lab/assurance/research_store.py · src/design_lab/research_review.py', implementationState: 'IMPLEMENTED',
    permission: 'brief/reference 已持久化（/api/projects/{id}/assets 已有）',
    reason: '读回路由已落地：本项目已持久化的研究结论、来源覆盖与置信度分布由该路由给出，空读回说成空读回而不是 0 条判定。'
      + '仍未闭合的是结论本身的验收——一条研究结论不证明设计质量，也不是知识导出，页面与服务端都不给完成词。',
    nextAction: '按 E2+ 用真实 brief 走一遍「采集→落库→读回→取代」，并把结论送入既有的 Direction/Quality 门；UI 读回无需再改。' },
  { capabilityId: 'design-domain-model', domain: '设计领域', source: 'IA 槽位 #/domains',
    owner: 'DESIGN-LAB Domain Pack', route: 'GET /api/domains',
    contractRef: 'design-lab/schemas/domain-pack.schema.json · design-lab/domain-packs/DOMAIN_PACK_SPEC_V2.md · design-lab/scripts/verify_domain_pack_v2.py · src/design_lab/domain_packs.py',
    implementationState: 'IMPLEMENTED',
    permission: '域包目录与 manifest 为仓内已提交记录（E1 结构级）；本视图只读回，不安装、不生成、不判定设计质量',
    reason: '读回路由已落地：页面列出 design-lab/domain-packs 下真实存在的目录，并逐包给出仓内校验器自己的判定与原因。'
      + '仍未闭合的是能力验收本身——仍有目录声明 workflow/domain-pack/v1 而被 Spec V2 校验器拒绝，'
      + '具体数量与目录名由路由给出，不在 UI 侧写死。',
    nextAction: '把仍处 v1 的域包补齐到 Spec V2 十要素，并按 E2+ 做宿主与设计质量验收；UI 读回无需再改。' },
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
    // A frontend constant counted into a KPI is a number the service never read
    // back, however honest the caption. It reads as unmeasured until there is a
    // brand-module store behind it.
    kpiCard('—', 'VI 模块', '无服务端读回 · 下方为设计参考模块名,非资产统计'),
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

// ---------------------------------------------------------------------------
// Human Jury review records.
//
// The five axes and their weights are the judgement vocabulary. They must sum to
// 1.0 because `assurance/human_jury.py` refuses anything else, and
// design-lab/tests/test_jury_review_form_contract.py feeds this exact declaration
// through the contract, so the page cannot ship a form the backend rejects.
export const JURY_CRITERIA = [
  { criterion_id: 'brief-fit', weight: 0.25 },
  { criterion_id: 'composition', weight: 0.25 },
  { criterion_id: 'typography', weight: 0.2 },
  { criterion_id: 'brand-system', weight: 0.15 },
  { criterion_id: 'production', weight: 0.15 },
] as const;

export function juryCriteriaWith(assessments: Array<{ note: string; score: number }>):
    Array<Record<string, string | number>> {
  return JURY_CRITERIA.map((axis, index) => ({
    criterion_id: axis.criterion_id, weight: axis.weight,
    note: assessments[index]?.note ?? '', score: assessments[index]?.score ?? 0,
  }));
}

interface JuryVersion { subject_ref: string; artifact_sha256: string; asset_id: string; version_no: number }
interface JuryReadback {
  schemaVersion?: string;
  records: Array<Record<string, unknown>>;
  verdict_count: number;
  proposal_count: number;
  current_verdicts: Record<string, Record<string, unknown>>;
  reviewable_versions: JuryVersion[];
  human_acceptance: string;
  // The denominator of 'ACCEPTED'. jury_review.py only says ACCEPTED when every
  // reviewable version carries a current APPROVE, so the page has to show which
  // fraction it is standing on; both are optional because an older or a partial
  // response may not carry them, and an absent count is not a zero.
  accepted_versions?: number;
  reviewable_active_versions?: number;
  error?: string;
}

const JURY_UNREADABLE: JuryReadback = {
  schemaVersion: 'design-lab/jury-readback/v1', records: [], verdict_count: 0,
  proposal_count: 0, current_verdicts: {}, reviewable_versions: [],
  human_acceptance: 'UNKNOWN',
};

function acceptanceFraction(data: JuryReadback): string {
  // Both halves arrive from jury_review.py together or not at all. An absent pair is
  // printed as 未读回 rather than 0/0, because 0/0 would read as "there was nothing to
  // accept" -- a claim about the ledger the response never made.
  const accepted = data.accepted_versions;
  const total = data.reviewable_active_versions;
  if (typeof accepted !== 'number' || typeof total !== 'number') return '未读回';
  return `${accepted}/${total}`;
}

export async function renderJuryReview(host: HTMLElement): Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' }, '正在读回评审记录…'));
  const projects = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
  const projectShape = shapeNotice(projects);
  if (projectShape) {
    host.replaceChildren(el('p', { class: 'error' },
                             `评审项目清单未读回：${projectShape}`));
    return;
  }
  if (!projects.projects.length) {
    host.replaceChildren(el('p', { class: 'view-hint' },
      '本机尚无项目：评审记录按项目保存，这里不能替某个项目宣称已验收。'));
    return;
  }
  const picker = el('select', { class: 'input', id: 'jury-project' } as never);
  for (const p of projects.projects) picker.append(new Option(p.name, p.id));
  const load = async (): Promise<void> => {
    const id = picker.value || projects.projects[0].id;
    const data = await apiOrEmpty<JuryReadback>(`/projects/${id}/jury`, JURY_UNREADABLE);
    const shape = shapeNotice(data);
    body.replaceChildren(juryReadbackPanel(id, data, load, shape));
  };
  const body = el('div', { class: 'jury-body' });
  picker.onchange = (): void => { void load().catch((error) => setStatus(errMsg(error), true)); };
  host.replaceChildren(el('label', { class: 'muted' }, '评审项目', picker), body);
  await load();
}

function juryReadbackPanel(projectId: string, data: JuryReadback,
                           reload: () => Promise<void>, unread: string): HTMLElement {
  if (unread) {
    return el('div', {}, el('p', { class: 'error' },
                            `评审读回不完整：${unread}。缺失字段不会被当作空集合或已验收。`));
  }
  if (data.error) {
    return el('p', { class: 'error' },
      `评审未读回：${data.error}。未读回不等于无裁决，也不等于已验收。`);
  }
  const verdicts = Object.entries(data.current_verdicts ?? {});
  // A real <ul>/<li> pair, not divs wearing those classes: this page's rows are the
  // reviewer's evidence trail, and a screen reader announces a list of nothing otherwise.
  const list = el('ul', { class: 'list' }, ...verdicts.length
    ? verdicts.map(([subject, record]) => el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, String(record['verdict'] ?? '未记录判定')),
          el('div', { class: 'value-mono' }, subject),
          el('div', { class: 'muted' }, String(((record['juror'] ?? {}) as Record<string, unknown>)
            .attestation ?? '无评审依据')))))
    : [emptyLi(data, '尚无人签署的裁决',
        'Agent 建议不计入验收，人工签署是唯一改变此处的途径。')]);
  const summary = el('p', { class: 'view-hint' },
    `已签署 ${data.verdict_count ?? 0} · Agent 建议 ${data.proposal_count ?? 0} · 人工验收 `
    + (data.human_acceptance === 'ACCEPTED' ? '已接受' : '未接受')
    + `（当前版本 ${acceptanceFraction(data)}）`);
  return el('div', {}, summary, list,
           juryVerdictForm(projectId, data.reviewable_versions ?? [], reload));
}

// 证据系统 — the Human Jury column, read-only. Signing a verdict is a Human Gate and it
// happens on 预检 / QA, whose form is the only place a juror types an attestation; this
// column reports what that gate actually said, next to the delivery it covers.
//
// Two things make it more than a list: an ACCEPTED here is the project's own state
// (jury_review.py only says ACCEPTED when every reviewable version carries a current
// human APPROVE), and the wording for an unread readback is different from the wording
// for an empty one. `未读回` never borrows `尚无`: a page that did not get the field
// cannot claim the ledger has no verdicts.
const ACCEPTANCE_TAGS: Record<string, string> = { ACCEPTED: 'ok', NOT_ACCEPTED: 'warn' };

function evidenceJuryColumn(data: JuryReadback): HTMLElement {
  const heading = el('h3', {}, '人工评审裁决 · Human Jury');
  const unread = shapeNotice(data) || disconnectedNotice(data);
  if (unread) {
    return el('div', { class: 'panel' }, heading,
      el('p', { class: 'error' },
        `${unread}；裁决未读回。未读回不等于无裁决，也不等于已验收。`));
  }
  const verdicts = Object.entries(data.current_verdicts ?? {});
  const list = el('ul', { class: 'list' }, ...(verdicts.length
    ? verdicts.map(([subject, record]) => el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, String(record['verdict'] ?? '未记录判定')),
          // subject_ref and the artifact digest are long identifiers: their own row in
          // .value-mono, never inside the nowrap .tag pill.
          el('div', { class: 'value-mono' }, subject),
          el('div', { class: 'muted' }, String(((record['juror'] ?? {}) as Record<string, unknown>)
            .attestation ?? '无评审依据'))),
        record['kind'] ? el('span', { class: 'tag info' }, en(String(record['kind']))) : ''))
    : [emptyLi(data, '尚无人签署的裁决',
        '裁决需在预检 / QA 页由人签署后在此读回；Agent 建议不计入验收。')]));
  const acceptance = typeof data.human_acceptance === 'string' ? data.human_acceptance : '';
  // A count the response never carried is not a zero: normaliseShape only refills
  // collections, so a scalar can still be absent, and 已签署 0 would be a claim about
  // the ledger that nothing supports.
  const verdictCount = typeof data.verdict_count === 'number' ? String(data.verdict_count) : '未读回';
  const proposalCount = typeof data.proposal_count === 'number' ? String(data.proposal_count) : '未读回';
  return el('div', { class: 'panel' }, heading,
    el('p', { class: 'view-hint' },
      `已签署 ${verdictCount} · Agent 建议 ${proposalCount} · `
      + `当前版本已接受 ${acceptanceFraction(data)}`),
    el('p', {}, acceptance
      ? el('span', { class: 'tag ' + (ACCEPTANCE_TAGS[acceptance] ?? 'neutral') },
          en(acceptance))
      : el('span', { class: 'tag neutral' }, '人工验收状态未读回'),
      el('span', { class: 'muted' },
        ' · 人工验收是按项目当前版本算的，一条裁决不会替整个项目出证。')),
    list,
    el('p', { class: 'view-hint' },
      '本页只读回裁决，不签署、不改写：签署是 Human Gate，在预检 / QA 页执行。'));
}

function juryVerdictForm(projectId: string, versions: JuryVersion[],
                          reload: () => Promise<void>): HTMLElement {
  const versionSelect = el('select', { class: 'input', id: 'jury-version' });
  versionSelect.append(new Option('选择被评审的版本', ''));
  for (const v of versions) {
    versionSelect.append(new Option(`${v.subject_ref} · ${v.artifact_sha256.slice(0, 12)}…`,
                                    v.subject_ref));
  }
  const juror = el('input', { class: 'input', id: 'jury-juror', type: 'text',
    placeholder: '评审人 id', autocomplete: 'off' });
  const attestation = el('textarea', { class: 'input', id: 'jury-attestation',
    placeholder: '你在什么条件下看了这份产物（放大比例、屏幕、与参考的对比）' });
  const approve = el('input', { type: 'radio', name: 'jury-verdict', id: 'jury-approve',
    value: 'APPROVE' });
  const reject = el('input', { type: 'radio', name: 'jury-verdict', id: 'jury-reject',
    value: 'REJECT' });
  const evidence = el('textarea', { class: 'input', id: 'jury-evidence',
    placeholder: '拒绝时必填，一行一条依据' });
  // Each axis needs BOTH a score and a note: the contract requires a numeric
  // score in 0..5 plus a note, and refuses a document without them.
  const scores = JURY_CRITERIA.map((axis) => el('input', {
    class: 'input', type: 'number', id: `jury-score-${axis.criterion_id}`,
    min: '0', max: '5', step: '0.1',
    'aria-label': `${axis.criterion_id} 评分` }));
  const notes = JURY_CRITERIA.map((axis) => el('input', {
    class: 'input', type: 'text', id: `jury-note-${axis.criterion_id}`,
    placeholder: `${axis.criterion_id} 的评审说明` }));
  const outcome = el('p', { class: 'view-hint', id: 'jury-outcome' }, '');
  const submit = el('button', { type: 'button', class: 'primary-btn', id: 'jury-submit' },
                    '签署裁决');
  submit.onclick = (): void => {
    void (async (): Promise<void> => {
      const chosen = versionSelect.value;
      const digest = versions.find((v) => v.subject_ref === chosen)?.artifact_sha256 ?? '';
      const verdict = approve.checked ? 'APPROVE' : reject.checked ? 'REJECT' : '';
      if (!chosen || !digest) {
        outcome.textContent = '未签署：必须先选择被评审的版本，裁决不能指向凭记忆写出的摘要。';
        return;
      }
      if (!verdict) { outcome.textContent = '未签署：不接受任何默认判定。'; return; }
      const invalid = scores.findIndex((node) => node.value === ''
                                        || Number(node.value) < 0 || Number(node.value) > 5);
      if (invalid >= 0) {
        outcome.textContent = `未签署：${JURY_CRITERIA[invalid].criterion_id} 分值缺失或超出 0-5。`;
        return;
      }
      if (verdict === 'REJECT' && !evidence.value.trim()) {
        outcome.textContent = '未签署：拒绝必须写明依据，否则无法复核或申诉。';
        return;
      }
      submit.disabled = true;
      outcome.textContent = '提交中…';
      try {
        await api(`/projects/${projectId}/jury/verdict`, {
          schemaVersion: 'design-lab/assurance-jury-record/v2',
          kind: 'JURY_VERDICT',
          jury_record_id: 'jury-' + Math.random().toString(16).slice(2, 34),
          subject_ref: chosen, artifact_sha256: digest,
          juror: { juror_id: juror.value.trim(), kind: 'HUMAN', members: [],
                   attestation: attestation.value.trim() },
          criteria: juryCriteriaWith(scores.map((node, index) => ({
            score: Number(node.value), note: notes[index].value.trim() }))),
          verdict,
          decided_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
          supersedes: null,
          evidence_refs: evidence.value.split('\n').map((line) => line.trim()).filter(Boolean),
        });
        // Read back from the service rather than echoing what was just typed:
        // the panel below showing the verdict is proof it was stored, not proof
        // the browser remembered it.
        await reload();
        outcome.textContent = '已签署；下方列表为服务端读回。';
      } catch (error) {
        outcome.textContent = `未签署：${errMsg(error)}`;
      } finally {
        submit.disabled = false;
      }
    })();
  };
  return el('details', { class: 'advanced' },
    el('summary', {}, '签署人工裁决（写入项目状态，之后不可修改）'),
    el('div', { class: 'advanced-body' },
      versions.length
        ? el('p', { class: 'view-hint' }, '版本与其摘要由服务端读回，不由人手写。')
        : el('p', { class: 'view-hint' },
             '该项目当前没有 ACTIVE 版本可评审；生产发布后此处才会出现候选。'),
      el('label', {}, '被评审版本', versionSelect),
      el('label', {}, '评审人', juror),
      el('label', {}, '评审依据', attestation),
      el('div', {}, approve, el('label', { for: 'jury-approve' }, '接受'), ' ',
        reject, el('label', { for: 'jury-reject' }, '拒绝')),
      el('label', {}, '拒绝依据（拒绝时必填）', evidence),
      ...JURY_CRITERIA.flatMap((axis, index) => [
        el('label', {}, `${axis.criterion_id} · 分值 0-5（权重 ${axis.weight}）`, scores[index]),
        el('label', {}, `${axis.criterion_id} · 说明`, notes[index])]),
      submit, outcome));
}

// ============================================================================
// RIGHTS — the Human 权利 gate, 2026-10-08.
//
// The backend exists: GET/POST /api/projects/<32-hex>/rights over
// `src/design_lab/rights_review.py`, which stores append-only decisions in
// `assurance/rights_ledger.py` against the contract loaded from disk. What was missing
// was the surface: a human could file only from the CLI, and nobody could read the gate
// back. Signing lives here on 预检 / QA (the jury form's slot); the read-only report
// lives on 证据系统.
//
// Three rules are load-bearing, and all three are this project's old wounds:
//
//   * A field the response never carried is rendered 未读回 -- never an empty list, a
//     zero, or `0/0`. `0 of 0` is precisely the vacuity rights_review.py refuses to
//     compute ("cleared by nobody"), so the page may not draw it either.
//   * NOT_REVIEWED covers two different facts -- nobody filed anything, and a filed
//     decision is not an approval. The readback publishes the counts that tell them apart
//     beside the word, so this column shows them and the word never reads as "a review is
//     pending".
//   * The decision words a human may pick come from the readback's own
//     `decision_vocabulary`, which the store loads from rights-decision.schema.json. The
//     form therefore offers what the contract allows -- including PENDING_REVIEW, which
//     only a human may file -- and nothing the page invented. The façade never infers
//     that word, and neither does this page.
// ============================================================================
interface RightsDecisionRecord {
  decision_id: string;
  schemaVersion?: string;
  use_scope: string;
  decision: string;
  decided_by: string;
  decided_at: string;
  territory?: string | null;
  license_ref?: string | null;
  note?: string | null;
  // No `actor_kind` and no `supersedes` here on purpose. Both are COLUMNS the store keeps
  // beside the document, and the readback hands back `document_json` -- the contract's own
  // closed property set -- so neither word can cross the HTTP boundary at all. A row read
  // over HTTP is therefore name-checked only, and says so through `name_checked_only`;
  // a superseded scope leaves `current_decisions` and stays in `ever_filed_scopes`.
  // Declaring either field here would let the page render a claim this route cannot send.
}

interface RightsUnapprovedScope {
  use_scope: string; decision: string; decision_id: string; decided_by: string;
}

interface RightsScopeConflict { use_scope: string; decision_ids: string[] }

interface RightsReadback {
  schemaVersion?: string;
  project_id?: string;
  decisions: RightsDecisionRecord[];
  decision_count?: number;
  current_decisions: Record<string, RightsDecisionRecord>;
  decision_states?: Record<string, number>;
  filed_scope_count?: number;
  approved_scope_count?: number;
  unapproved_scopes: RightsUnapprovedScope[];
  ever_filed_scopes: string[];
  scope_conflicts: RightsScopeConflict[];
  name_checked_only: string[];
  rights_clearance?: string;
  clearance_vocabulary?: string[];
  decision_vocabulary?: string[];
  does_not_prove: string[];
  error?: string;
}

// The seam's honest empty for a rights read that never happened. Every collection is
// present-but-empty AND marked, so no view may describe it as a ledger holding nothing.
// The scalars are deliberately absent: normaliseShape does not refill a number or a word,
// and a clearance invented here would be a claim the page cannot trace back to an emitter.
const RIGHTS_UNREADABLE: RightsReadback = {
  schemaVersion: 'design-lab/rights-readback/v1',
  decisions: [], current_decisions: {}, unapproved_scopes: [], ever_filed_scopes: [],
  scope_conflicts: [], name_checked_only: [], does_not_prove: [],
};

// A tag colour is a claim. These two maps are compared with their emitters by
// design-lab/tests/test_rights_ui_contract.py: the clearance keys with
// `rights_review.CLEARANCE_STATES` both ways, the decision keys with the contract's own
// enum minus the word that clears.
const RIGHTS_CLEARANCE_TAGS: Record<string, string> = { CLEARED: 'ok', NOT_REVIEWED: 'warn' };

// The non-approving decision words and how loud each one is. The approving word is
// deliberately NOT a key: the page decides whether a scope clears from the façade's own
// `unapproved_scopes` list, so no hand copy of the contract's approval literal enters this
// file -- which is the exact copy verify_state_vocabularies.py convicts here, and a word
// the contract later drops cannot keep a chip nobody emits.
const RIGHTS_DECISION_TAGS: Record<string, string> = {
  DENIED: 'bad', BLOCKED_BY_LICENSE: 'bad', PENDING_REVIEW: 'warn',
};

// The version the bound contract binds as a value. Written once, as data the page sends,
// not as a restatement of the schema's field list -- the store loads that file and refuses
// anything bound differently.
const RIGHTS_DECISION_SCHEMA_VERSION = 'design-lab/rights-decision/v1';

function rightsCount(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '未读回';
}

function clearanceFraction(data: RightsReadback): string {
  // approved/filed arrives from rights_review.py as a pair or not at all. An absent pair is
  // printed as 未读回 because 0/0 would read as "nothing needed clearing" -- a claim about
  // the ledger the response never made.
  if (typeof data.approved_scope_count !== 'number' || typeof data.filed_scope_count !== 'number')
    return '未读回';
  return `${data.approved_scope_count}/${data.filed_scope_count}`;
}

// Which scopes the façade does NOT count as approved. Null means the readback never said,
// and then no scope may be painted green here.
function unapprovedScopeSet(data: RightsReadback): Set<string> | null {
  return Array.isArray(data.unapproved_scopes)
    ? new Set(data.unapproved_scopes.map((row) => String(row?.use_scope ?? '')))
    : null;
}

function rightsDecisionTagClass(scope: string, record: RightsDecisionRecord | undefined,
                                unapproved: Set<string> | null): string {
  if (unapproved === null) return 'neutral';
  if (!unapproved.has(scope)) return 'ok';
  return RIGHTS_DECISION_TAGS[String(record?.decision ?? '')] ?? 'warn';
}

// The clearance word, in the sentence the readback supports. `rights_clearance` is a
// scalar, so normaliseShape cannot refill it and an absent word is a real possibility.
function clearanceExplanation(data: RightsReadback, clearance: string): string {
  if (!clearance) return ' · 服务端没有给出清算词，本页不替它补一个；未读回不等于未清算。';
  const filed = data.filed_scope_count;
  const outstanding = data.unapproved_scopes;
  if (typeof filed !== 'number' || !Array.isArray(outstanding))
    return ' · 分母未读回，所以这一行只转述清算词本身，不推断它站在多少个范围上。';
  if (filed === 0)
    return ' · 该项目没有任何使用范围被提交过：这道门没有被问过，不是有人在等答复。'
      + ' PENDING_REVIEW 只能由人提交产生，服务与页面都不会替没人问过的范围生成它。';
  if (outstanding.length)
    return ` · 已提交但未计入清算的范围：${outstanding
      .map((row) => `${row.use_scope}（${row.decision}）`).join('、')}。`
      + ' 这一行说的是"读起来未清算"，不是"正在等待审查"。';
  return ' · 已提交的范围全部处于批准状态；清算只覆盖这些范围，见下方"本读回不证明"。';
}

// The per-scope rows, shared by both surfaces so the gate says the same thing in both
// places. One `<ul>` literal, which is the only list container this slice adds -- the
// pinned inventory in design-lab/tests/test_workbench_css_single_definition.py moves by 1.
function rightsScopeRows(data: RightsReadback, emptyHint: string): HTMLElement {
  const scopes = Object.entries(data.current_decisions ?? {});
  const unapproved = unapprovedScopeSet(data);
  return el('ul', { class: 'list' }, ...(scopes.length
    ? scopes.map(([scope, record]) => el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, scope),
          // A decision id and a license reference are long identifiers: their own
          // .value-mono row, never inside the nowrap .tag pill (UI-AUDIT-20261006).
          el('div', { class: 'value-mono' },
            `决定 ${String(record?.decision_id ?? '未读回')}`
            + (record?.license_ref ? ` · 许可 ${String(record.license_ref)}` : '')),
          el('div', { class: 'muted' },
            `决定人 ${String(record?.decided_by ?? '未读回')}`
            + (record?.decided_at ? ` · ${String(record.decided_at)}` : ' · 决定时间未读回')
            + (record?.territory ? ` · 地域 ${String(record.territory)}` : '')),
          record?.note ? el('div', { class: 'view-hint' }, String(record.note)) : ''),
        el('span', {
          class: 'tag ' + rightsDecisionTagClass(scope, record, unapproved),
        }, record?.decision ? en(String(record.decision)) : '决定词未读回')))
    // An empty here is a real readback that answered "nothing filed", which is exactly the
    // case 尚无 is allowed for; a read that did not arrive never reaches this function.
    : [emptyLi(data, '尚无人签署的权利决定', emptyHint)]));
}

// The readback's own numbers, words and limits -- everything both surfaces show. Spread
// into the caller's panel so the QA view and the evidence view cannot drift apart.
function rightsFacts(data: RightsReadback): HTMLElement[] {
  const clearance = typeof data.rights_clearance === 'string' ? data.rights_clearance : '';
  const states = data.decision_states && typeof data.decision_states === 'object'
    ? Object.entries(data.decision_states) : [];
  // How many scopes anybody ever filed, against how many stand now. Both halves come from
  // the readback, and the difference is what a supersession does: the replaced row leaves
  // `current_decisions` and stays in `ever_filed_scopes`. Saying it out loud is what keeps
  // a clearance from quietly covering less than it did.
  const everCount = Array.isArray(data.ever_filed_scopes) ? data.ever_filed_scopes.length : null;
  const standingCount = Object.keys(data.current_decisions ?? {}).length;
  const nodes: HTMLElement[] = [
    el('p', { class: 'view-hint' },
      `当前批准 ${clearanceFraction(data)} · 决定总数 ${rightsCount(data.decision_count)} · `
      + `曾提交过的范围 ${everCount === null ? '未读回' : String(everCount)} 个`),
    el('p', {},
      el('span', { class: 'tag ' + (RIGHTS_CLEARANCE_TAGS[clearance] ?? 'neutral') },
        clearance ? en(clearance) : '权利清算状态未读回'),
      el('span', { class: 'muted' }, clearanceExplanation(data, clearance))),
  ];
  if (everCount !== null && everCount > standingCount) {
    nodes.push(el('p', { class: 'view-hint' },
      `${everCount - standingCount} 个范围已不再出现在现行集合中（被后来的决定取代），`
      + '清算只按现行集合计算。'));
  }
  nodes.push(el('p', { class: 'muted' },
    states.length
      ? `现行决定按状态：${states.map(([word, count]) => `${word} ${count}`).join(' · ')}`
      : '状态计数未读回：响应没有给出 decision_states，本页不自行清点。'));
  if (data.scope_conflicts.length) {
    nodes.push(el('p', { class: 'error' },
      `范围冲突 ${data.scope_conflicts.length} 项：`
      + data.scope_conflicts.map((row) => `${row.use_scope}（${(row.decision_ids ?? [])
        .join('、')}）`).join('；')
      + '。同一范围带着多条未被取代的现行决定，这些范围的"当前权利立场"是不确定的；'
      + '服务端取最新一条只是为了给出读回，不是替人裁决。'));
  }
  if (data.name_checked_only.length) {
    nodes.push(el('p', { class: 'view-hint' },
      `仅按名字核查的范围 ${data.name_checked_only.length} 个：${data.name_checked_only.join('、')}。`
      + '合同关闭属性，HTTP 提交带不进声明的 actor kind，所以这些行只证明署名不自称自动化，'
      + '不证明是一只手敲的字。'));
  }
  nodes.push(el('div', { class: 'rights-does-not-prove' },
    el('p', { class: 'muted' },
      `本读回不证明（由服务端自己列出，${data.does_not_prove.length} 条）：`),
    ...(data.does_not_prove.length
      ? data.does_not_prove.map((line) => el('p', { class: 'view-hint' }, String(line)))
      : [el('p', { class: 'error' },
          '未读回：响应没有给出 does_not_prove，本页不替服务端省略它自己声明的限制。')])));
  return nodes;
}

// 证据系统 — read-only. Filing a rights decision is a Human Gate and happens on
// 预检 / QA; this column reports what that gate actually produced, next to the delivery.
// 证据系统 — the evidence link's own state, read from the service rather than assumed.
//
// `verified` and `current` are computed per receipt from the ledger plus the object database: the
// first asks whether the bytes a receipt hashed are still where that receipt says they came from,
// the second whether it still describes the checkout this service is running. Neither is a field
// anybody can set, and neither is the same word as the other -- conflating them is what made every
// receipt read as unverified on 2026-10-08. The read sits behind a button for the same reason the
// delivery receipt does: it recomputes every byte claim in the ledger, so a verdict about evidence
// nobody asked to check would be a guess dressed up as a readback.
interface EvidenceReceipt {
  id: string;
  taskIds: string[];
  kind: string;
  outcome: string;
  subjectSha: string;
  binding: string;
  observedAt: string;
  verified: boolean;
  current: boolean;
  integrityReasons: string[];
  currencyReasons: string[];
}

interface EvidenceProjection {
  schemaVersion?: string;
  subjectSha?: string;
  ledger?: string;
  totals?: { records?: number; outcomePass?: number; verified?: number;
             unverified?: number; current?: number };
  reasonCounts?: { integrity?: Record<string, number>; currency?: Record<string, number> };
  receipts?: EvidenceReceipt[];
  taskCounts?: Record<string, number>;
  error?: string;
}

// The honest empty for a read that never happened: collections present-but-empty and marked, every
// scalar absent, because a 0 invented here would be a claim about the ledger that no emitter made.
const EVIDENCE_PROJECTION_UNREADABLE: EvidenceProjection = {
  receipts: [], reasonCounts: { integrity: {}, currency: {} }, taskCounts: {},
};

const PROJECTION_RECEIPT_LIMIT = 12;

// Derived only from the two booleans. No ledger outcome word is hand-copied into this file: the
// service's vocabulary comes from the payload, and verify_state_vocabularies.py convicts a copy.
function projectionStateWord(receipt: EvidenceReceipt): string {
  if (!receipt.verified) return 'NOT VERIFIED';
  return receipt.current ? 'VERIFIED CURRENT' : 'VERIFIED NOT CURRENT';
}

function projectionCount(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '—';
}

function projectionReasonList(group: Record<string, number> | undefined,
                              noneText: string): HTMLElement {
  const entries = Object.entries(group ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return el('p', { class: 'view-hint' }, noneText);
  return el('ul', { class: 'list' }, ...entries.map(([token, count]) => el('li', { class: 'list-item' },
    el('div', {}, en(token), el('small', {}, '该理由命中的字节声明数')),
    el('span', { class: 'tag warn' }, String(count)))));
}

function projectionReasonLine(label: string, reasons: string[]): HTMLElement {
  if (!reasons.length) return el('small', {}, `${label}：无`);
  return el('small', {}, label + '：',
    ...reasons.slice(0, 3).flatMap((reason, index) => index === 0
      ? [en(reason)] : [' · ', en(reason)]),
    ...(reasons.length > 3 ? [el('span', {}, ` 等 ${reasons.length} 项`)] : []));
}

function projectionReceiptRows(receipts: EvidenceReceipt[]): HTMLElement {
  const shown = receipts.slice(0, PROJECTION_RECEIPT_LIMIT);
  const rest = receipts.length - shown.length;
  return el('ul', { class: 'list' },
    ...shown.map((receipt) => el('li', { class: 'list-item' },
      el('div', {},
        el('strong', {}, receipt.id),
        el('small', { class: 'value-mono' },
          `subject ${receipt.subjectSha.slice(0, 12)} · ${receipt.kind}`),
        projectionReasonLine('完整性理由', receipt.integrityReasons),
        projectionReasonLine('时效理由', receipt.currencyReasons)),
      el('span', { class: receipt.verified ? (receipt.current ? 'tag ok' : 'tag info') : 'tag bad' },
        en(projectionStateWord(receipt))))),
    ...(rest > 0 ? [el('li', { class: 'list-item' },
      el('div', {}, el('strong', {}, `其余 ${rest} 条未逐条列出`),
        el('small', {}, '上方计数覆盖全部记录；此处只是不再展开，不是没有这些记录。')))] : []));
}

function evidenceProjectionPanel(data: EvidenceProjection, unread: string): HTMLElement {
  // A 200 whose body carries an error word is its own fact: the request completed and the readback
  // still declined to carry counts. The shape notice must not swallow that code, or the reviewer is
  // left with a list of missing keys and no idea that the service named a reason.
  const refusal = data.error
    ? `服务端在响应里给出了拒绝码 ${String(data.error)}。` : '';
  if (unread) {
    return el('p', { class: 'error' },
      `${refusal}${unread}；证据链状态未读回。未读回不等于已验证，也不等于没有问题。`);
  }
  if (data.error) {
    return el('p', { class: 'error' },
      `证据链状态未读回：${String(data.error)}。服务端拒绝时没有给出任何计数，`
      + '本页不会替它补一个，也不会把拒绝解释成"没有证据问题"。');
  }
  const totals = data.totals;
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  if (!totals || typeof totals.records !== 'number') {
    return el('p', { class: 'error' },
      '证据链状态未读回：响应没有给出 totals.records。缺少计数不得被当作 0 条记录。');
  }
  if (!Array.isArray(data.receipts)) {
    return el('p', { class: 'error' },
      '证据链状态未读回：响应没有给出 receipts 集合，无法逐条判断，也不会显示任何计数。');
  }
  return el('div', {},
    el('div', { class: 'kpi-grid' },
      kpiCard(projectionCount(totals.records), '条收据', 'config/task-ledger-r3.json'),
      kpiCard(projectionCount(totals.verified), '字节可复现', '在其绑定提交上重算'),
      kpiCard(projectionCount(totals.unverified), '不可复现', '含未通过 outcome 的行'),
      kpiCard(projectionCount(totals.current), '仍适用当前检出', 'verified 的子集')),
    el('h4', {}, '完整性理由分布（为何这些字节不再在其声称的来源处）'),
    projectionReasonList(data.reasonCounts?.integrity,
      '没有完整性理由：本次读回没有发现无法复现的字节声明。'),
    el('h4', {}, '时效理由分布（为何完整的收据不再描述当前检出的字节）'),
    projectionReasonList(data.reasonCounts?.currency,
      '没有时效理由：所有完整收据引用的文件都与当前检出一致。'),
    el('h4', {}, '逐条收据'),
    receipts.length ? projectionReceiptRows(receipts)
      : el('p', { class: 'view-hint' }, '账本没有任何收据；这是读回来的空账本，不是读回失败。'),
    el('p', { class: 'view-hint' },
      `判定对象为当前检出 ${data.subjectSha ? data.subjectSha.slice(0, 12) : '（响应未给出）'}`
      + `，来源 ${data.ledger ?? '（响应未给出）'}。`
      + '该读回对当前检出重新计算，不读取 reports/current/（生成物绑定它写下时所在的提交）。'
      + '"仍适用当前检出"是"字节可复现"的子集：完整的收据若引用的文件已移动，它仍是诚实的历史，'
      + '但不是今天这份代码的证据。'));
}

async function runEvidenceProjection(host: HTMLElement): Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' },
    '正在对当前检出重算证据链完整性（逐条复算字节声明，约一秒）…'));
  try {
    const data = await apiOrEmpty<EvidenceProjection>('/evidence-projection',
      EVIDENCE_PROJECTION_UNREADABLE);
    host.replaceChildren(evidenceProjectionPanel(data, shapeNotice(data)));
  } catch (error) {
    const envelope = (error as Error & { serviceEnvelope?: Record<string, unknown> })
      .serviceEnvelope;
    const code = typeof envelope?.['error'] === 'string' ? envelope['error'] : errMsg(error);
    host.replaceChildren(el('p', { class: 'error' },
      `证据链状态未读回：${String(code)}。服务端在拒绝时没有给出任何计数或收据列表，`
      + '本页不会把一次拒绝显示成"没有证据问题"。'));
  }
}

function evidenceProjectionPanelBox(): HTMLElement {
  const out = el('div', { class: 'evidence-projection-outcome', id: 'evidence-projection-outcome' },
    el('p', { class: 'view-hint' },
      '尚未读回证据链完整性：这一判定要对当前检出逐条复算，不在页面构建时自动执行，'
      + '也不读取任何生成物。未读回不等于已验证。'));
  const run = el('button', { type: 'button', class: 'ghost-btn', id: 'evidence-projection-run' },
    '读回证据链完整性');
  run.onclick = (): void => { void runEvidenceProjection(out); };
  return el('div', { class: 'panel' },
    el('h3', {}, '证据链完整性 · Human EVIDENCE'),
    run, out,
    el('p', { class: 'view-hint' },
      '来源 GET /api/evidence-projection（src/design_lab/governance/evidence_readback.py 依 '
      + 'design-lab/schemas/evidence-projection.schema.json 校验自身后才应答）。'
      + '本页只读回，不修改账本：账本行由验证运行时写入，投影状态由这条读回呈现。'));
}

function evidenceRightsColumn(data: RightsReadback, unread: string): HTMLElement {
  const heading = el('h3', {}, '权利决定读回 · Human RIGHTS');
  if (unread) {
    return el('div', { class: 'panel' }, heading,
      el('p', { class: 'error' },
        `${unread}；权利决定未读回。未读回不等于没有决定，也不等于已清算。`));
  }
  if (data.error) {
    return el('div', { class: 'panel' }, heading,
      el('p', { class: 'error' },
        `权利未读回：${String(data.error)}。未读回不等于没有决定，也不等于已清算。`));
  }
  return el('div', { class: 'panel' }, heading,
    ...rightsFacts(data),
    rightsScopeRows(data, '权利决定需在预检 / QA 页由人提交后在此读回；'
      + '没有被提交过的范围不会出现在这里，也不会带任何默认状态。'),
    el('p', { class: 'view-hint' },
      '本页只读回决定与清算，不提交、不改写：提交是 Human Gate，在预检 / QA 页执行。'
      + '权利门不代替质量、制作与发布门。'));
}

function rightsReadbackPanel(projectId: string, data: RightsReadback,
                             reload: () => Promise<void>, unread: string,
                             outcome: HTMLElement): HTMLElement {
  if (unread) {
    return el('div', {}, el('p', { class: 'error' },
      `权利读回不完整：${unread}。缺失字段不会被当作空集合或已清算。`));
  }
  if (data.error) {
    return el('p', { class: 'error' },
      `权利未读回：${String(data.error)}。未读回不等于无决定，也不等于已清算。`);
  }
  return el('div', {},
    ...rightsFacts(data),
    rightsScopeRows(data, '在下方提交一条决定后在此读回；未被提交过的范围没有默认状态。'),
    rightsDecisionForm(projectId, data, reload, outcome));
}

// The form: one click files ONE decision for ONE use scope. `supersedes` is offered as a
// select over the decision ids the readback named, never as free text, because a
// supersession pointing at an id from memory would either 404 or replace the wrong row.
function rightsDecisionForm(projectId: string, data: RightsReadback,
                           reload: () => Promise<void>,
                           outcome: HTMLElement): HTMLElement {
  // The contract's enum as the readback states it. An absent vocabulary means the page has
  // no words to offer, so it files nothing rather than offering a guessed set.
  const vocabulary = Array.isArray(data.decision_vocabulary) ? data.decision_vocabulary : [];
  const scope = el('input', { class: 'input', id: 'rights-use-scope', type: 'text',
    placeholder: '使用范围，例如 font-brandon-grotesk / client-photo-01', autocomplete: 'off' });
  const signer = el('input', { class: 'input', id: 'rights-decided-by', type: 'text',
    placeholder: '决定人（人的名字；自称 agent / model / system 的署名会被服务端拒绝）',
    autocomplete: 'off' });
  const territory = el('input', { class: 'input', id: 'rights-territory', type: 'text',
    placeholder: '可选：地域，例如 worldwide / cn-only' });
  const licenseRef = el('input', { class: 'input', id: 'rights-license-ref', type: 'text',
    placeholder: '可选：许可文本的引用，例如 LICENSE-FILE:OFL.txt' });
  const note = el('textarea', { class: 'input', id: 'rights-note',
    placeholder: '可选：依据哪份文本、在什么范围内作出的判断' });
  const decisionInputs = vocabulary.map((word) => el('input', {
    type: 'radio', name: 'rights-decision', id: `rights-decision-${word}`, value: word }));
  const supersedes = el('select', { class: 'input', id: 'rights-supersedes' });
  const supersedeScopes = new Map<string, string>();
  supersedes.append(new Option('不替代：这是一条新的决定', ''));
  for (const [useScope, record] of Object.entries(data.current_decisions ?? {})) {
    const previous = typeof record?.decision_id === 'string' ? record.decision_id : '';
    if (!previous) continue;
    // Only CURRENT decisions are offered: a row that already carries a replacement is
    // un-superseedable (RIGHTS_ALREADY_SUPERSEDED), and offering it would invite a fork.
    supersedeScopes.set(previous, useScope);
    supersedes.append(new Option(`${useScope} · ${previous}`, previous));
  }
  const submit = el('button', { type: 'button', class: 'primary-btn', id: 'rights-submit' },
                     '提交权利决定');
  if (!vocabulary.length) submit.disabled = true;
  // One decision_id per distinct document. A retry of the identical submission replays
  // (rights_review.py recognises the id), while a fresh id for the same words would file a
  // second signature for one human judgement; a CHANGED document must take a fresh id,
  // because the store refuses an id whose content moved.
  let decisionId = '';
  let lastFingerprint = '';
  submit.onclick = (): void => {
    void (async (): Promise<void> => {
      const useScope = scope.value.trim();
      const chosen = decisionInputs.find((node) => node.checked);
      const actor = signer.value.trim();
      if (!vocabulary.length) {
        outcome.textContent = '未提交：决定词表未读回（响应没有给出 decision_vocabulary），'
          + '页面不替合同发明一个状态词。';
        return;
      }
      if (!useScope) {
        outcome.textContent = '未提交：必须先写明使用范围；一条决定要落在一个范围上，'
          + '否则读回时没人知道它管什么。';
        return;
      }
      if (!chosen) {
        outcome.textContent = '未提交：没有选中任何决定词；权利门不接受页面替你猜的默认状态。';
        return;
      }
      if (!actor) {
        outcome.textContent = '未提交：决定人必须写明。权利门不由发起请求的人默认签署，'
          + '服务端也会按名字拒绝自称自动化的署名。';
        return;
      }
      const previousId = supersedes.value;
      const previousScope = supersedeScopes.get(previousId) ?? '';
      if (previousId && previousScope && previousScope !== useScope) {
        // The store refuses this with RIGHTS_SUPERSEDES_SCOPE_MISMATCH; the page declines
        // to send a doomed write because a replacement for another scope would leave the
        // first decision unreferenced and uncountable.
        outcome.textContent = `未提交：${previousId} 决定的是 ${previousScope}，`
          + `与 ${useScope} 不是同一个使用范围；替代只能落在同一范围上，本页不发送注定被拒的请求。`;
        return;
      }
      const body: Record<string, unknown> = {
        schemaVersion: RIGHTS_DECISION_SCHEMA_VERSION,
        use_scope: useScope,
        decision: chosen.value,
        decided_by: actor,
        // The page stamps the moment of signing from the browser clock and the service
        // validates its RFC3339 shape; the human name is what the gate records, not this.
        decided_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        territory: territory.value.trim() || null,
        license_ref: licenseRef.value.trim() || null,
        note: note.value.trim() || null,
      };
      const fingerprint = JSON.stringify(body);
      if (fingerprint !== lastFingerprint) {
        decisionId = 'rights-' + Math.random().toString(16).slice(2, 34);
        lastFingerprint = fingerprint;
      }
      const payload = { decision_id: decisionId, ...body };
      submit.disabled = true;
      outcome.textContent = '提交中…';
      try {
        await api(`/projects/${projectId}/rights`
          + (previousId ? `?supersedes=${encodeURIComponent(previousId)}` : ''), payload);
        // Read back from the service rather than echoing what was just typed: the scope
        // list changing is proof the decision was stored, not proof the browser remembered.
        await reload();
        outcome.textContent = '已提交一条权利决定；上方读回来自服务端，不是本页记住的输入。';
      } catch (error) {
        const envelope = (error as Error & {
          serviceEnvelope?: Record<string, unknown>;
        }).serviceEnvelope;
        const code = typeof envelope?.error === 'string' ? envelope.error : errMsg(error);
        const detail = typeof envelope?.detail === 'string' ? envelope.detail : '';
        // The refusal replaces this box outright: a previous 已提交 standing next to a
        // request the service refused would leave two contradictory verdicts on one screen.
        outcome.textContent = `未提交：${code}${detail ? ` —— ${detail}` : ''}。`
          + '服务端没有写入任何决定；上方读回仍是提交之前的状态，不是这次的结论。';
      } finally {
        submit.disabled = false;
      }
    })();
  };
  return el('details', { class: 'advanced' },
    el('summary', {}, '提交权利决定（写入项目状态，之后不可修改，只能由新决定取代）'),
    el('div', { class: 'advanced-body' },
      el('p', { class: 'view-hint' },
        vocabulary.length
          ? `可用决定词由服务端合同给出：${vocabulary.join(' / ')}。`
          : '决定词表未读回：响应没有给出 decision_vocabulary，本表单不可提交。'),
      el('p', { class: 'view-hint' },
        '一条决定只覆盖一个使用范围；PENDING_REVIEW 只有人选它才会出现，页面与服务端都不会'
        + '替没人问过的范围生成它。一次点击提交一条。'),
      el('label', {}, '使用范围', scope),
      el('div', {}, ...vocabulary.flatMap((word, index) => [
        decisionInputs[index],
        el('label', { for: `rights-decision-${word}` }, en(word))])),
      el('label', {}, '决定人', signer),
      el('label', {}, '地域（可选）', territory),
      el('label', {}, '许可引用（可选）', licenseRef),
      el('label', {}, '说明（可选）', note),
      el('label', {}, '取代哪条现行决定（只列读回中出现过的）', supersedes),
      submit));
}

export async function renderRightsReview(host: HTMLElement): Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' }, '正在读回权利决定…'));
  const projects = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
  const projectShape = shapeNotice(projects);
  if (projectShape) {
    host.replaceChildren(el('p', { class: 'error' },
      `权利项目清单未读回：${projectShape}`));
    return;
  }
  if (!projects.projects.length) {
    // The same three empties as the shared picker: only a ledger that really answered
    // "no projects" may be described as having none.
    const offline = disconnectedNotice(projects);
    host.replaceChildren(el('p', { class: offline ? 'error' : 'view-hint' },
      offline ? `${offline}，项目台账未读回，因此不能断言无项目，也不能替某个项目提交权利决定。`
        : '本机尚无项目：权利决定按项目保存，这里不能替不存在的项目宣称已清算。'));
    return;
  }
  const picker = el('select', { class: 'input', id: 'rights-project' } as never);
  for (const p of projects.projects) picker.append(new Option(p.name, p.id));
  // The outcome line lives OUTSIDE the re-rendered body: a success or a refusal that was
  // written into the panel would be detached by the very reload that earned it.
  const outcome = el('p', { class: 'view-hint', id: 'rights-review-outcome' }, '');
  const body = el('div', { class: 'rights-body' });
  const load = async (): Promise<void> => {
    const id = picker.value || projects.projects[0].id;
    const data = await apiOrEmpty<RightsReadback>(`/projects/${id}/rights`, RIGHTS_UNREADABLE);
    const shape = shapeNotice(data);
    body.replaceChildren(rightsReadbackPanel(id, data, load, shape, outcome));
  };
  picker.onchange = (): void => { void load().catch((error) => setStatus(errMsg(error), true)); };
  host.replaceChildren(el('label', { class: 'muted' }, '权利项目', picker), outcome, body);
  await load();
}

// ---------------------------------------------------------------------------
// 研究洞察 — the read-back and the filing surface for persisted findings.
//
// This view used to render the capability library plus a "not open" notice, because there was
// no route that stored a conclusion. Since 2026-10-08 there is one
// (GET/POST /api/projects/{id}/research over assurance/research_store.py), so the slot reads
// it back. What the façade publishes is a set of counts and three explicit non-claims, and the
// page preserves that shape: there is NO completion word here to render, because
// research_review.py deliberately emits none — `research_verdict` is null and the note that
// explains why is shown in its place rather than a badge the service cannot produce.
interface ResearchFindingRecord {
  finding_id?: string;
  claim?: string;
  sourceRefs?: string[];
  confidence?: string;
  notDesignRule?: boolean;
}

interface ResearchReadback {
  schemaVersion?: string;
  project_id?: string;
  findings: ResearchFindingRecord[];
  current_findings?: Record<string, ResearchFindingRecord>;
  finding_count?: number;
  current_finding_count?: number;
  superseded_finding_count?: number;
  sourced_finding_count?: number;
  unsourced_finding_count?: number;
  source_ref_total?: number;
  source_ref_field?: string;
  confidence_counts?: Record<string, number>;
  confidence_vocabulary?: string[];
  stated_confidence_count?: number;
  unattributed_findings?: string[];
  actor_kinds?: Record<string, number>;
  undeclared_disclaimer?: string;
  proves_design_quality?: boolean;
  is_knowledge_export?: boolean;
  research_verdict?: string | null;
  research_verdict_note?: string;
  does_not_prove?: string[];
  error?: string;
}

// The honest empty for a research read that never happened: collections present-but-empty and
// marked, scalars absent so normaliseShape cannot refill them and the page shows 未读回 rather
// than a 0 that would mean "the ledger answered none".
const RESEARCH_UNREADABLE: ResearchReadback = {
  schemaVersion: 'design-lab/research-readback/v1',
  findings: [], current_findings: {}, confidence_counts: {}, does_not_prove: [],
  actor_kinds: {}, unattributed_findings: [],
};

// The research-finding contract closes its properties WITHOUT a schemaVersion field, so this
// page sends none: a body carrying a field the contract never declared is refused as unknown
// rather than tolerated, and inventing one here would be the page conditioning on a shape the
// service does not accept.

function researchNumber(data: ResearchReadback, key: keyof ResearchReadback): string {
  const value = data[key];
  return typeof value === 'number' ? String(value) : '未读回';
}

export function researchFacts(data: ResearchReadback): HTMLElement {
  const verdict = data.research_verdict;
  // A word here at all would be a claim this surface does not make; anything non-null means the
  // service changed its vocabulary and the page says so instead of quietly painting a badge.
  const tagClass = verdict === null || verdict === undefined ? 'warn' : 'info';
  const tags = Object.entries(data.confidence_counts ?? {});
  return el('div', { class: 'panel research-facts' },
    el('h3', {}, '研究结论读回'),
    el('p', { class: 'view-hint' },
      `共 ${researchNumber(data, 'finding_count')} 条 · 现行 ${researchNumber(data, 'current_finding_count')} 条 · `
      + `已被取代 ${researchNumber(data, 'superseded_finding_count')} 条 · `
      + `有来源 ${researchNumber(data, 'sourced_finding_count')} 条 · `
      + `无来源 ${researchNumber(data, 'unsourced_finding_count')} 条 · `
      + `来源引用合计 ${researchNumber(data, 'source_ref_total')} 个`),
    el('p', { class: 'muted' },
      `来源字段名取自响应（${data.source_ref_field ?? '未读回'}），置信度计数来自服务端逐词表给出（含 0），`
      + `标注数 ${researchNumber(data, 'stated_confidence_count')}；未署名 ${researchNumber(data, 'unattributed_findings')} 条。`),
    tags.length
      ? el('div', {}, ...tags.flatMap(([word, count]) => [el('span',
          { class: 'tag ' + (count ? 'info' : 'neutral') }, en(word)),
        el('span', { class: 'muted' }, String(count))]))
      : el('p', { class: 'view-hint' }, '置信度计数未读回：响应没有给出 confidence_counts，本页不代替服务发明分类。'),
    el('span', { class: 'tag ' + tagClass },
      verdict === null || verdict === undefined ? '无完成判定词' : en(String(verdict))),
    el('p', { class: 'view-hint' },
      data.research_verdict_note ?? '判定说明未读回：响应没有给出 research_verdict_note。'),
    el('p', { class: 'muted' },
      `本面不证明设计质量（proves_design_quality=${String(data.proves_design_quality ?? '未读回')}）`
      + `，也不是知识导出（is_knowledge_export=${String(data.is_knowledge_export ?? '未读回')}）。`),
    ...(data.undeclared_disclaimer
      ? [el('p', { class: 'view-hint' }, `未声明免责：${data.undeclared_disclaimer}`)] : []),
    el('ul', { class: 'list' },
      ...(data.does_not_prove ?? []).map((line) => el('li', { class: 'list-item' },
        el('span', {}, en(line))))),
    ...(data.does_not_prove?.length ? [] : [el('p', { class: 'view-hint' },
      '本读回未给出 does_not_prove，因此无法说明这些数字不覆盖什么。')]));
}

export function researchFindingRows(data: ResearchReadback): HTMLElement {
  const current = data.current_findings ?? {};
  const findings = data.findings ?? [];
  if (!findings.length) {
    // The repository's own three-way empty (emptyWording behind emptyLi): an absent service is
    // not an empty ledger, so only a response that really answered may be called "no findings".
    return el('ul', { class: 'list' },
      emptyLi(data, '本项目尚无已持久化的研究结论',
        '记录一条带来源的结论后在此读回；未读回不等于本项目没有结论。'));
  }
  return el('ul', { class: 'list' },
    ...findings.map((record) => {
      const id = typeof record.finding_id === 'string' ? record.finding_id : '未读回';
      const superseded = !Object.prototype.hasOwnProperty.call(current, id);
      const sources = Array.isArray(record.sourceRefs) ? record.sourceRefs : [];
      return el('li', { class: 'list-item' },
        el('span', {}, record.claim ?? '结论正文未读回'),
        el('span', { class: 'value-mono' }, id),
        el('span', { class: 'tag ' + (superseded ? 'neutral' : 'info') },
          superseded ? '已被取代' : '现行'),
        el('span', { class: 'tag ' + (record.confidence ? 'info' : 'warn') },
          record.confidence ? en(record.confidence) : '未标注置信度'),
        el('span', { class: 'muted' },
          sources.length ? `来源 ${sources.join(' · ')}` : '来源未读回'));
    }));
}

function researchDecisionForm(projectId: string, data: ResearchReadback, reload: () => Promise<void>,
                              outcome: HTMLElement): HTMLElement {
  const vocabulary = Array.isArray(data.confidence_vocabulary) ? data.confidence_vocabulary : [];
  const claim = el('textarea', { class: 'input', id: 'research-claim', maxlength: '4000',
    'aria-label': '研究结论正文' });
  const sources = el('input', { class: 'input', id: 'research-sources', maxlength: '2000',
    placeholder: 'interview-07, bench-figma-2026-05',
    'aria-label': '支撑这条结论的来源引用，用逗号或空格分隔，至少一个' });
  const confidence = el('select', { class: 'input', id: 'research-confidence' } as never);
  confidence.append(new Option('不标注（响应里就不会有这个字段）', ''));
  for (const word of vocabulary) confidence.append(new Option(word, word));
  const notRule = el('input', { type: 'checkbox', id: 'research-not-design-rule' });
  const supersedes = el('select', { class: 'input', id: 'research-supersedes' });
  supersedes.append(new Option('不替代：这是一条新的结论', ''));
  for (const id of Object.keys(data.current_findings ?? {})) {
    supersedes.append(new Option(id, id));
  }
  const submit = el('button', { type: 'button', class: 'primary-btn', id: 'research-submit' },
                     '记录一条研究结论');
  // One finding_id per distinct document, so an identical retry replays instead of filing the
  // same claim twice; a changed document earns a fresh id because the store refuses a reused one.
  let findingId = '';
  let lastFingerprint = '';
  submit.onclick = (): void => {
    void (async (): Promise<void> => {
      const text = claim.value.trim();
      const refs = sources.value.split(/[,\n\s]+/).map((part) => part.trim()).filter(Boolean);
      if (!text) {
        outcome.textContent = '未提交：结论正文为空。页面不发送一条没有主张的记录。';
        return;
      }
      if (!refs.length) {
        outcome.textContent = '未提交：没有任何来源引用。一条没有来源的结论是猜测，'
          + '服务端会拒绝（RESEARCH_SOURCE_REQUIRED），本页不替你补一个来源。';
        return;
      }
      const body: Record<string, unknown> = {
        claim: text,
        sourceRefs: refs,
      };
      if (confidence.value) body.confidence = confidence.value;
      if (notRule.checked) body.notDesignRule = true;
      const fingerprint = JSON.stringify(body);
      if (fingerprint !== lastFingerprint) {
        findingId = 'rf-' + Math.random().toString(16).slice(2, 34);
        lastFingerprint = fingerprint;
      }
      const previous = supersedes.value;
      const payload = { ...body, finding_id: findingId };
      submit.disabled = true;
      outcome.textContent = '提交中…';
      try {
        await api(`/projects/${projectId}/research`
          + (previous ? `?supersedes=${encodeURIComponent(previous)}` : ''), payload);
        await reload();
        outcome.textContent = '已记录一条研究结论；上方读回来自服务端，不是本页记住的输入。'
          + '这条结论不等于设计质量判定，也不等于知识导出。';
      } catch (error) {
        const envelope = (error as Error & {
          serviceEnvelope?: Record<string, unknown> }).serviceEnvelope;
        outcome.textContent = `未记录：${typeof envelope?.error === 'string'
          ? envelope.error : errMsg(error)}`
          + (typeof envelope?.detail === 'string' && envelope.detail
            ? ` —— ${envelope.detail}` : '') + '。服务端未写入任何结论。';
      } finally {
        submit.disabled = false;
      }
    })().catch((error) => setStatus(errMsg(error), true));
  };
  return el('div', { class: 'panel research-form' },
    el('h3', {}, '记录一条研究结论'),
    el('p', { class: 'view-hint' },
      '一条结论必须带至少一个来源引用；置信度只有你选了才会出现在记录里，页面不默认一个。'
      + '这里写入的是工作输入，不是 Human Gate 裁决，也不会提升任何验收轴。'),
    el('label', {}, '结论正文', claim),
    el('label', {}, '来源引用（至少一个）', sources),
    el('label', {}, '置信度（可选）', confidence),
    el('label', {}, '标注这不是一条设计规则（可选）', notRule),
    el('label', {}, '取代哪条现行结论（只列读回中出现过的）', supersedes),
    submit);
}

export async function renderResearch(host: HTMLElement): Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' }, '正在读回研究结论…'));
  const projects = await apiOrEmpty<ProjectListResponse>('/projects', OFFLINE.projects);
  const projectShape = shapeNotice(projects);
  if (projectShape) {
    host.replaceChildren(el('p', { class: 'error' }, `研究项目清单未读回：${projectShape}`));
    return;
  }
  if (!projects.projects.length) {
    const offline = disconnectedNotice(projects);
    host.replaceChildren(el('p', { class: offline ? 'error' : 'view-hint' },
      offline ? `${offline}，项目台账未读回，因此不能断言无项目，也不能替某个项目记录结论。`
        : '本机尚无项目：研究结论按项目保存，这里不能替不存在的项目建立结论。'));
    return;
  }
  const picker = el('select', { class: 'input', id: 'research-project' } as never);
  for (const p of projects.projects) picker.append(new Option(p.name, p.id));
  const outcome = el('p', { class: 'view-hint', id: 'research-review-outcome' }, '');
  const body = el('div', { class: 'research-body' });
  const load = async (): Promise<void> => {
    const id = picker.value || projects.projects[0].id;
    const data = await apiOrEmpty<ResearchReadback>(`/projects/${id}/research`,
      RESEARCH_UNREADABLE);
    const shape = shapeNotice(data);
    body.replaceChildren(
      shape ? el('p', { class: 'error' }, `研究读回形状异常：${shape}`) : researchFacts(data),
      researchFindingRows(data),
      researchDecisionForm(id, data, load, outcome));
  };
  picker.onchange = (): void => { void load().catch((error) => setStatus(errMsg(error), true)); };
  host.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h2', {}, '研究洞察'),
        el('p', {}, '按项目读回已持久化的研究结论与其来源覆盖；写入是工作输入，不是验收判定。'))),
    el('label', { class: 'muted' }, '研究项目', picker), outcome, body);
  await load();
}

// Route `#/research` renders two stacked surfaces: the project's own findings read-back, then the
// repository-wide capability library that used to occupy this slot alone. Each renderer replaces
// its own host, so they cannot wipe each other out the way two `target.replaceChildren()` calls
// on the same element would.
export async function renderResearchView(target: HTMLElement): Promise<void> {
  const findings = el('div', { id: 'research-findings' });
  const library = el('div', { id: 'capability-library' });
  target.replaceChildren(findings, library);
  await renderResearch(findings);
  await renderCapabilityLibrary(library);
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
  const juryHost = el('div', { id: 'jury-review' });
  const rightsHost = el('div', { id: 'rights-review' });
  target.replaceChildren(
    pageHead,
    kpiGrid,
    el('div', { class: 'toolbar' },
      el('label', { class: 'muted' }, '任务全 ID', input)),
    result,
    el('section', { class: 'panel' },
      el('h3', {}, '设计评审 · Human Jury'),
      el('p', { class: 'view-hint' },
        '与上方资源预检是两件事：这里读回的是人工签署的裁决，绑定到具体版本摘要。'),
      juryHost),
    el('section', { class: 'panel' },
      el('h3', {}, '权利决定 · Human RIGHTS'),
      el('p', { class: 'view-hint' },
        '与上方资源预检、人工评审都是不同的门：这里读回并提交的是一条使用范围上的许可立场。'
        + '提交是 Human Gate，只在本页由人执行；证据系统只读回。'),
      rightsHost));
  // Rejections propagate to the router on purpose. Swallowing them into a toast
  // would leave this page looking healthy while its review column is stale.
  await renderJuryReview(juryHost);
  await renderRightsReview(rightsHost);
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
// ---------------------------------------------------------------------------
// DL-UI-U03 (2026-10-09) — 能力详情：七轴取值、资格依据、许可前置。
//
// 这一块的每一条都从记录本身说话，不替记录补结论：
//   * 轴有值 → 列出值；轴是空容器 → 说"未分类"；轴是 null → 说"该记录无此字段"。
//     三者不能混为一谈，否则一个没做过的人工分类会看起来像一个已完成的判定。
//   * qualified=null 是"没有资格记录"，不是"不合格"；服务端把理由随记录一起给出
//     （capability_library._qualification），界面原样转述。
//   * 「使用此能力」当前必须禁用：目标生成包还没接（DL-UI-U05），一个按下去不产生
//     目标包的按钮就是本任务包禁止的假动作。
// ---------------------------------------------------------------------------
function axisValueText(value: unknown): string {
  if (value === null || value === undefined) return '该记录无此字段';
  if (Array.isArray(value)) return value.length ? value.join('、') : '未分类';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length ? entries.map(([k, v]) => `${k}：${String(v)}`).join(' · ') : '未分类';
  }
  return String(value);
}

function capabilityDetail(c: CapabilityRecord): HTMLElement {
  const axes = Object.entries(c.axes ?? {});
  return el('details', { class: 'capability-detail' },
    el('summary', {}, '能力详情 · 七轴、资格依据与许可前置'),
    el('ul', { class: 'list' },
      ...axes.map(([axis, value]) => el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, en(axis)),
          el('small', {}, axisValueText(value))))),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '资格判定'),
          el('small', {}, c.qualified === null
            ? (c.qualificationReason ?? '未判定')
            : `已判定为 ${String(c.qualified)}；证据 ${
              (c.qualificationEvidence ?? []).join('、') || '未列出'}`))),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '许可与权利'),
          el('small', {}, `${c.license ?? '无许可记录'}`
            + `${c.licenseUrl ? ` · ${c.licenseUrl}` : ''}`
            + `${c.rightsNotes ? ` · ${c.rightsNotes}` : ''}`
            + '；许可分布不等于使用权，未审的素材不得进入正式交付。'))),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '证据级'),
          el('small', {}, c.evidenceLevel
            ? `${en(c.evidenceLevel)} · 证据级只说明观察强度，不等于设计质量或宿主可运行`
            : '未记录证据级'))),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '反例与不适用'),
          el('small', {}, '仓内尚无按能力记录的失败样本或反例；'
            + '没有记录就说没有记录，不把空白读成"没有已知问题"。')))),
    el('button', { type: 'button', class: 'primary-btn', disabled: '' }, '使用此能力'),
    el('p', { class: 'view-hint' },
      '此按钮当前禁用：把能力落成目标生成包属于 DL-UI-U05 / DL-FINAL-T10，'
      + '接通之前它不该看起来可用。'));
}

export async function renderCapabilityLibrary(target: HTMLElement,
                                   opts: { openId?: string | null } = {}): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回能力库…'));
  const data = await apiOrEmpty<CapabilityLibraryResponse>('/capabilities', OFFLINE.capabilities);
  const rows = data.capabilities;
  const filter = el('input', { class: 'input capability-filter', type: 'search', id: 'capability-filter',
    placeholder: '按 ID / 许可 / 域 / 处置 / 修订状态过滤',
    'aria-label': '能力库过滤' });
  const shown = el('span', { class: 'muted', id: 'capability-shown' }, '');
  const body = el('tbody', {});

  // DL-UI-U03 权限/许可前置过滤。候选值只从本批读回里取，不再抄一份枚举表；
  // 没有该字段的记录单独成「无记录」一档——否则它会被静默滤掉，读起来像 0 条。
  type FacetField = 'license' | 'disposition' | 'presence' | 'evidenceLevel';
  const FACETS: ReadonlyArray<{ field: FacetField; label: string }> = [
    { field: 'license', label: '许可' },
    { field: 'disposition', label: '处置' },
    { field: 'presence', label: '存在状态' },
    { field: 'evidenceLevel', label: '证据级' },
  ];
  const ANY = '__any__';
  const NONE = '__none__';
  const facetPicks = FACETS.map((facet) => {
    const values = Array.from(new Set(rows.map((c) => c[facet.field])))
      .sort((a, b) => (a ?? '\uffff').localeCompare(b ?? '\uffff'));
    const select = el('select', { class: 'input', 'aria-label': `按${facet.label}过滤` },
      el('option', { value: ANY }, `全部${facet.label}（${values.length} 个取值）`),
      ...values.map((v) => el('option', { value: v ?? NONE }, v ?? '无记录')));
    return { field: facet.field, label: facet.label, select };
  });

  // R2 §4 资产类型 tabs. Each tab is a predicate over a field the readback really carries,
  // and a tab that comes back empty has to say which field it asked and what that silence
  // means: an unclassified axis is NOT the service answering "there are none" (§2: 保留入口、
  // 显示空结果、不伪造能力、不因零条移除分类).
  //
  // Two traps, both measured on 2026-10-09 rather than assumed:
  //   * 可调用能力 must not be counted by `kind`. `kind` answers "what sort of record is
  //     this" (source 46 / model 14 = all 60 records); callability is `qualified`, and this
  //     readback reports counts.qualified = 0. Wiring the tab to `kind` would let the screen
  //     claim 60 callable capabilities on the strength of a type label.
  //   * The three type tabs all group by `artifactTypes`, which carries no value for any
  //     record. Splitting them by name would mean inventing the value words, and the card
  //     says 取值必须来自既有分类轴，不新建字典. So they are one undivided empty set here,
  //     and the panel says the split is pending human classification instead of implying
  //     three separately measured groups.
  const axisFilled = (c: CapabilityRecord, axis: string): boolean => {
    const v = (c.axes as Record<string, unknown> | undefined)?.[axis];
    return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null;
  };
  const TYPE_TAB_NOTE = '这一类与相邻两类都按 artifactTypes 轴分组，而本批读回里该轴没有任何'
    + '取值，所以三类目前给的是同一个空集——不是三种各自量出来的"没有"。等人工分类补上取值后，'
    + '各 tab 的归属由该轴自己的值决定，这里不替它猜词表。';
  const ASSET_TABS: ReadonlyArray<{ label: string; basis: string;
    members: (c: CapabilityRecord) => boolean; note: string }> = [
    { label: '全部资产', basis: '本批读回的全部记录', members: () => true, note: '' },
    { label: '可调用能力', basis: 'qualified',
      members: (c) => c.qualified !== null,
      note: '这一类按资格判定字段计数，不按 kind：kind 说的是记录类型，可调用性说的是资格。'
        + '本批读回没有任何一条给出资格判定（未判定不等于不合格，也不等于可用）。' },
    { label: '规范与方法', basis: 'artifactTypes',
      members: (c) => axisFilled(c, 'artifactTypes'), note: TYPE_TAB_NOTE },
    { label: '案例与参考', basis: 'artifactTypes',
      members: (c) => axisFilled(c, 'artifactTypes'), note: TYPE_TAB_NOTE },
    { label: '模板与配方', basis: 'artifactTypes',
      members: (c) => axisFilled(c, 'artifactTypes'), note: TYPE_TAB_NOTE },
  ];
  let tabPick = 0;
  const tabsBox = el('div', { class: 'asset-tabs', role: 'tablist',
    'aria-label': '资产类型' });
  // An unread readback is not an empty one. Before this existed the tab strip printed a
  // confident "0" for every type when the response had omitted `capabilities` (or when
  // nothing was connected), which is the exact lie appshell block ⑨ was written to catch.
  const unreadReadback = (): boolean => Boolean(disconnectedNotice(data))
    || shapeFieldMissing(data, 'capabilities');
  // A bare "0" on a tab whose axis nobody classified reads as "this category is empty",
  // which is a different claim from "the field carries no value on any record" -- the same
  // inversion this batch had to refuse for the domain entries. So the badge names which of
  // the two it is, derived from the readback rather than hardcoded per tab. 可调用能力 keeps
  // its number: zero qualification verdicts IS a measured answer.
  const axisPopulated = (axis: string): boolean => rows.some((c) => axisFilled(c, axis));
  const tabBadge = (t: typeof ASSET_TABS[number], n: number): string => {
    if (unreadReadback()) return '未读回';
    if (t.basis === 'artifactTypes' && !axisPopulated(t.basis)) return '未分类';
    return String(n);
  };

  // R2 §4 已选条件条。每个不等于「全部」的取值一枚 chip，单独可移除；关键词也算一条。
  // 「清除检索条件」只清检索——不清领域选择、不删任务，这是 §4 末段写死的边界。
  const active = el('div', { class: 'capability-active', id: 'capability-active',
    'aria-label': '已选检索条件' });
  const chip = (label: string, value: string, remove: () => void): HTMLElement => el(
    'span', { class: 'capability-chip' },
    el('span', { class: 'capability-chip-text' }, `${label}：${value}`),
    el('button', { type: 'button', class: 'capability-chip-x',
      'aria-label': `移除条件 ${label} ${value}`, title: `移除 ${label}：${value}`,
      onclick: () => { remove(); render(); } }, '×'));
  const clearSearchOnly = (): void => {
    filter.value = '';
    for (const f of facetPicks) f.select.value = ANY;
  };
  const renderActive = (): void => {
    const picked: HTMLElement[] = [];
    const needleNow = (filter.value || '').trim();
    if (needleNow) {
      picked.push(chip('关键词', needleNow, () => { filter.value = ''; }));
    }
    for (const f of facetPicks) {
      const v = f.select.value;
      if (v === ANY || v === '') continue;
      picked.push(chip(f.label, v === NONE ? '无记录' : v, () => { f.select.value = ANY; }));
    }
    if (!picked.length) {
      active.replaceChildren(el('span', { class: 'muted' },
        '没有检索条件：下面显示的是这一批读回的全部记录。'));
      return;
    }
    active.replaceChildren(
      el('span', { class: 'muted' }, `已选 ${picked.length} 项条件`),
      ...picked,
      el('button', { type: 'button', class: 'secondary', id: 'capability-clear',
        onclick: () => { clearSearchOnly(); render(); } }, '清除检索条件'));
  };

  const render = (): void => {
    const needle = (filter.value || '').trim().toLowerCase();
    const faceted = rows.filter((c) => (needle
      ? [c.id, c.license, c.domain, c.disposition, c.presence,
         c.revisionState, c.sourceType, c.evidenceLevel,
         c.upstreamOwner].join(' ').toLowerCase().includes(needle)
      : true)
      && facetPicks.every((f) => {
        const want = f.select.value;
        // 未选择 = 全部。真实浏览器里 <select> 默认落在第一个 option（ANY）上，
        // 但 vm 桩没有选择模型、.value 恒为 ''，所以空串必须同样读成"全部"，
        // 否则桩里这张表会被自己的过滤逻辑清空的假象污染成一条空读回。
        if (want === ANY || want === '') return true;
        if (want === NONE) return c[f.field] === null || c[f.field] === undefined;
        return c[f.field] === want;
      }));
    const tab = ASSET_TABS[tabPick];
    const keep = faceted.filter(tab.members);
    // Each tab's number is counted over the *faceted* set, so the strip adds up to what the
    // reader could actually get from here rather than to the whole library.
    tabsBox.replaceChildren(...ASSET_TABS.map((t, i) => el('button', {
      type: 'button', role: 'tab', id: `asset-tab-${i}`,
      class: 'asset-tab' + (i === tabPick ? ' on' : ''),
      'aria-selected': i === tabPick ? 'true' : 'false',
      onclick: () => { tabPick = i; render(); },
    }, el('span', {}, t.label),
      el('small', {}, tabBadge(t, faceted.filter(t.members).length)))));
    // R2 §4：结果计数是「当前组合条件下的去重记录数」。同一资产可以出现在多个领域的
    // 结果里，但只有一份 ID/revision——所以按 ID 收敛，重复的不计第二条。
    const byId = new Map<string, typeof keep[number]>();
    for (const c of keep) if (!byId.has(c.id)) byId.set(c.id, c);
    const unique = Array.from(byId.values());
    const duplicates = keep.length - unique.length;
    body.replaceChildren(...unique.map((c) => el('tr', {},
      el('td', {},
        el('strong', {}, c.id),
        el('div', { class: 'muted' }, `${c.kind} · ${c.sourceType ?? '未分类'}`),
        // The withdrawal instruction is part of the record, not an afterthought: the
        // plan asks for upgrade/withdraw with source references, and this is the
        // recorded path for exactly this candidate.
        c.removalPath ? el('details', { class: 'capability-withdraw' },
          el('summary', {}, '撤回路径'),
          el('p', { class: 'mono' }, c.removalPath)) : '',
        // DL-UI-U03: 详情随记录一起读回，不另开一页去猜。
        capabilityDetail(c),
        // R2 §5: 完整详情要有自己的地址，才谈得上"被重新找到"。行内展开是速览，
        // 这个按钮把地址换成本条记录的稳定 ID。
        el('button', { type: 'button', class: 'secondary capability-open',
          'aria-label': `查看 ${c.id} 的完整详情`,
          onclick: () => { window.location.hash = capabilityDetailHash(c.id); } },
          '查看详情')),
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
    if (!unique.length) {
      // R2 §2: an empty result keeps its entry and says WHY. Three different silences and
      // they get three different sentences -- nothing connected / collection never answered
      // / a real readback in which the tab's own field matches nobody.
      const headline = unreadReadback()
        ? `${tab.label}：未读回`
        : `${tab.label}：本批读回里这一类没有命中记录`;
      const why = unreadReadback()
        ? '这一批没有读回能力记录（未连接，或响应没有给出 capabilities），'
          + '所以这里既不是 0 条，也不是这一类没有资产。'
        : faceted.length === 0
          ? `当前关键词与筛选组合下没有候选记录，所以这里说的是检索条件，`
            + '不是这一类资产的有无。'
          : `${tab.label} 按 ${tab.basis} 计数；在其余条件剩下的 ${faceted.length} 条候选里，`
            + '这个字段没有给出任何命中的记录。';
      body.append(el('tr', { class: 'asset-empty' },
        el('td', { colspan: String(TABLE_COLUMNS.length) },
          el('strong', {}, headline),
          el('p', { class: 'view-hint' }, why),
          tab.note ? el('p', { class: 'view-hint' }, tab.note) : '')));
    }
    shown.textContent = `显示 ${unique.length} / ${rows.length} 条`
      + (duplicates ? `（本组合下按 ID 去掉 ${duplicates} 条重复）` : '（按 ID 去重）');
    renderActive();
  };
  filter.oninput = () => { render(); };
  for (const facet of facetPicks) facet.select.onchange = () => { render(); };

  // The empty-state row spans this list, so the header and the colspan are the same array.
  // Two hand-typed copies would let the span rot the day a column is added.
  const TABLE_COLUMNS = ['能力', '许可', '处置', '存在状态', '修订', '资格判定', '证据级',
    '热度（非质量分）'] as const;
  // 2026-10-08: this page used to carry the research slot's "not open" notice, because it WAS
  // the research slot. Findings now read back over GET /api/projects/{id}/research at the top of
  // this route, so restating a missing route here would be a claim the service no longer supports.
  const researchCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === 'research-insights');
  target.replaceChildren(
    el('div', { class: 'page-head' },
      el('div', {},
        el('h2', {}, '能力库'),
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
      tabsBox,
      el('div', { class: 'project-picker capability-facets' },
        el('label', { class: 'capability-filter' }, '关键词', filter),
        ...facetPicks.map((f) => el('label', { class: 'capability-filter' },
          f.label, f.select))),
      active,
      el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
        'aria-label': '能力库表（可横向滚动）' },
        el('table', { class: 'table' },
          el('thead', {}, el('tr', {},
            ...TABLE_COLUMNS.map((h) => el('th', {}, h)))),
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
      el('p', { class: 'view-hint' }, '研究结论已改为读本项目的持久化路由，在本页上方读回；这里保留登记表卡片本身，不再声称缺少路由。'),
      researchCard ? capabilityCard(researchCard) : el('p', { class: 'view-hint' }, '（登记表无此项）')),
    capabilityDrawer(rows, opts.openId ?? null),
    ...shapeNoticeRows(data));
  render();
  // R2 §5: focus lands inside the panel, so Tab and Esc continue from the detail instead
  // of jumping back to the top of the page. Guarded because the vm harness has no
  // getElementById.
  if (opts.openId && typeof document !== 'undefined'
    && typeof document.getElementById === 'function') {
    const panel = document.getElementById('capability-drawer');
    if (panel && typeof panel.focus === 'function') panel.focus();
  }
}

/** R2 §5：一条能力的完整详情面板，由地址决定存不存在（不是隐藏着的浮层）。
 *  非模态：背后仍可滚动可点，所以它不是 dialog，也不改挂 role="dialog"
 *  （DESIGN.md §3 第 6 条与 `audit_workbench_ui.mjs` 的 role-permittedness 断言）。 */
function capabilityDrawer(rows: readonly CapabilityRecord[],
                          openId: string | null): HTMLElement {
  if (!openId) return el('div', { class: 'cap-drawer-slot', hidden: '' });
  const found = rows.find((c) => c.id === openId) ?? null;
  if (!found) {
    // The address is shareable; the record set is this batch's readback. A hash that
    // names an id outside it says so instead of drawing an empty shell or borrowing
    // another record's fields.
    return el('section', { class: 'cap-drawer', id: 'capability-drawer', tabindex: '-1',
      'aria-labelledby': 'cap-drawer-title' },
      el('h3', { id: 'cap-drawer-title' }, '详情地址指向的记录不在本批读回里'),
      stateBlock({
        kind: 'unknown', title: '未找到该记录', weight: 'neutral',
        producer: `#/capabilities/${openId} 不在本批 GET /api/capabilities 的 `
          + `${rows.length} 条读回里；地址本身合法，但记录身份以读回为准。`,
        next: '返回能力目录重选一条；不要按 ID 猜测这条能力的资格、许可或证据级。',
      }),
      el('div', { class: 'uif-row' },
        el('button', { type: 'button', class: 'secondary',
          onclick: () => { window.location.hash = '#/capabilities'; } }, '返回能力目录')));
  }
  const row = (label: string, value: HTMLElement | string): HTMLElement => el(
    'div', { class: 'cap-drawer-row' },
    el('span', { class: 'muted' }, label),
    typeof value === 'string' ? el('span', {}, value) : value);
  const panel = el('section', { class: 'cap-drawer', id: 'capability-drawer', tabindex: '-1',
    'aria-labelledby': 'cap-drawer-title' },
    el('div', { class: 'cap-drawer-head' },
      el('h3', { id: 'cap-drawer-title' }, found.id),
      el('button', { type: 'button', class: 'secondary', id: 'capability-drawer-close',
        onclick: () => { window.location.hash = '#/capabilities'; } }, '返回能力目录')),
    el('p', { class: 'uif-spec-note' },
      `稳定 ID ${found.id} · 类型 ${found.kind} · 来源 `
      + `${found.sourceType ?? '未分类'}。这一面板与列表行读的是同一份记录，`
      + '不是第二份台账；地址可以贴给别人，但对方看到的仍是那一批读回的内容。'),
    row('领域', found.domain
      ? el('span', {}, found.domain) : el('span', { class: 'tag neutral' }, '未分类')),
    row('资产类型', found.kind),
    row('能力范围 / 资格判定', found.qualified === null
      ? el('span', { class: 'tag neutral' }, '未判定')
      : el('span', { class: 'tag info' }, String(found.qualified))),
    el('p', { class: 'uif-spec-note' }, found.qualificationReason
      ?? '资格依据：本条记录自带判定，无需补充理由。'),
    row('许可', found.license ?? '（无记录）'),
    row('处置 / 存在状态', `${found.disposition ?? '—'} · ${found.presence ?? '—'}`),
    row('修订', el('span', {},
      el('span', { class: 'tag ' + (found.revisionState === 'VERIFIED' ? 'ok' : 'warn') },
        en(found.revisionState)),
      found.revision ? el('span', { class: 'mono' }, ` ${found.revision}`) : '')),
    row('证据级', found.evidenceLevel
      ? el('span', { class: 'tag ' + (found.evidenceLevel === 'E0' ? 'warn' : 'info') },
          en(found.evidenceLevel))
      : el('span', { class: 'tag neutral' }, '未记录')),
    row('热度（非质量分）', found.popularity
      ? `★ ${found.popularity.stargazerCount ?? '—'} · fork ${found.popularity.forkCount ?? '—'}`
        + ` · ${found.popularity.observedAt?.slice(0, 10) ?? '未记时间'}`
      : '未观测'),
    found.removalPath ? row('撤回路径', el('span', { class: 'mono' }, found.removalPath)) : '',
    el('h4', {}, '分类轴'),
    el('p', { class: 'uif-spec-note' },
      '轴值来自候选分类账；为空的轴显示"未分类"而不是 0，也不由界面代填——填它是人工分类判断，'
      + '属 DL-FINAL-T06 的验收内容。'),
    el('ul', { class: 'cap-drawer-axes' }, ...Object.entries(found.axes ?? {}).map(([axis, v]) =>
      el('li', {}, `${axis} · ${axisValueText(v)}`))),
    el('div', { class: 'uif-row' },
      el('button', { type: 'button', class: 'primary-btn', disabled: '' }, '用于本次制作'),
      el('span', { class: 'theme-toggle-note' },
        '禁用：把这条 ID 与 revision 带进制作上下文属 DL-UI-U04/U05，'
        + '接通前它不该看起来可点。')),
    el('p', { class: 'uif-spec-note' },
      '本面板不宣称执行资格：分析、目标包生成、真实执行、原生工程交付与真人评审是不同结论，'
      + '这里只读回记录里已有的字段。'));
  // Esc on the panel returns to the catalog. Focus is moved in by the caller, so the
  // keydown is scoped here rather than added to the global Escape chain.
  panel.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') window.location.hash = '#/capabilities';
  });
  return panel;
}

// ---------------------------------------------------------------------------
// 设计领域 — B07 route `#/domains`.
//
// 2026-10-08. This slot used to be a card that said the model exists but has no read
// route, and it named the pack count by hand (a bare "13" in the Chinese copy). Measured
// truth: 13 pack DIRECTORIES exist under design-lab/domain-packs, and the repo's own
// Spec V2 checker accepts 12 of them -- the 13th still declares workflow/domain-pack/v1
// and is rejected with its own list of reasons. So every number on this page now comes
// from GET /api/domains, per pack, and the verdict word is the checker's, not the page's.
//
// The two things this view must never say: that VALIDATES is anything stronger than a
// STRUCTURAL (E1) statement about files in this repository, and that a null field is an
// empty one (the payload's own `unmeasuredMeans` states the rule; the rows say which
// silence they are reporting).
const DOMAIN_TONE: Record<DomainPackValidation, string> = {
  // VALIDATES is the only green, and it is green about structure. NOT_CHECKED is
  // deliberately warn rather than bad: no verdict was produced, which is not a failure.
  VALIDATES: 'ok', INVALID: 'bad', UNREADABLE: 'bad', NOT_CHECKED: 'warn',
};

const DOMAIN_UNREAD = '未读回';
const DOMAIN_UNDECLARED = '未声明';

/** A field of the ENVELOPE the response left out (root, path, meaning). `normaliseShape`
 *  refills collections only, so an absent scalar would otherwise paint "undefined". */
export function domainRead(value: string | null | undefined): string {
  return value ? value : DOMAIN_UNREAD;
}

/** A field of the pack's OWN manifest. `null` is the pack being silent about it (a v1
 *  manifest really has no `domain`); an absent key is the service being silent. Two
 *  different facts, so they get two different words and never a defaulted string. */
export function domainDeclared(value: string | null | undefined): string {
  return value === undefined ? DOMAIN_UNREAD : (value ?? DOMAIN_UNDECLARED);
}

export function domainDependencies(values: string[] | null | undefined): string {
  if (values === undefined) return DOMAIN_UNREAD;
  if (values === null) return DOMAIN_UNDECLARED;
  return values.length ? values.join(' / ') : '声明为空（无依赖）';
}

/** The verdict word is the service's vocabulary, so it is marked and not translated; a
 *  row with no verdict word says so in the page's own language instead of wrapping
 *  "undefined" in a lang="en" pill. */
export function domainVerdict(value: DomainPackValidation | undefined): HTMLElement | string {
  return value === undefined ? DOMAIN_UNREAD : en(value);
}

export function domainTone(value: DomainPackValidation | undefined): string {
  return value === undefined ? 'warn' : (DOMAIN_TONE[value] ?? 'warn');
}

/** One pack directory, identity and declared domain included.
 *
 * R2 §2 asks the domains to be second-level entries, so each row that owns a declared
 * `pack_id` gets the same 查看详情 control a capability row uses. A pack whose manifest
 * declares no id is not given a synthesised address — it says why it has none instead. */
export function domainPackRow(pack: DomainPackRecord): HTMLElement {
  const go = domainDetailHash(pack.packId);
  // The verdict pill is emitted BEFORE the action. With the pill last, every row's action
  // left edge moved with the width of the verdict word (VALIDATES is ~14px wider than
  // INVALID), which read as a ragged column on the rendered screen; right-anchoring the
  // pair puts the actions on one column and the pills on another. The overflow gate measures
  // both edges now, so this ordering is no longer a matter of taste.
  const verdict = el('span', { class: 'tag ' + domainTone(pack.validation) },
    domainVerdict(pack.validation));
  return el('li', { class: 'list-item' },
    el('div', {},
      el('strong', {}, pack.displayName ?? domainRead(pack.directory)),
      el('small', {}, `目录 ${domainRead(pack.directory)}`
        + ` · pack_id ${domainDeclared(pack.packId)}`
        + ` · 版本 ${domainDeclared(pack.version)}`
        + ` · 领域 ${domainDeclared(pack.domain)}`
        + ` · 清单 schema ${domainDeclared(pack.manifestSchemaVersion)}`
        + ` · 依赖 ${domainDependencies(pack.dependencies)}`)),
    verdict,
    go
      ? el('button', { type: 'button', class: 'secondary',
        onclick: () => { window.location.hash = go; } }, '查看详情')
      : el('span', { class: 'muted' }, '无独立地址：清单未声明 pack_id'));
}

/** One domain pack's own facts, at its own address.
 *
 * This reuses the `.cap-drawer` component rather than adding a stylesheet block: a
 * detail panel opened from a list row is the same shape for a capability and for a
 * pack (head + label/value rows + a disabled action that says why). A second copy of
 * that CSS would be design-system drift, not a new feature.
 *
 * What this panel may NOT do is list "该领域下的能力". Measured 2026-10-09 against the
 * two readbacks: the capability `domains` classification axis is empty for all 60
 * records, and the capability `domain` field carries model-radar families
 * (`video-generation`, `asr`, …) whose single literal overlap with a pack slug (`3d`)
 * is a string coincidence, not a declared relationship. GET /api/domains carries no
 * capability reference field either, so any join drawn here would be invented by the
 * page. The action is therefore shown disabled with that reason. */
function domainDrawer(packs: readonly DomainPackRecord[],
  openId: string | null): HTMLElement {
  if (!openId) return el('div', { class: 'cap-drawer-slot', hidden: '' });
  const found = packs.find((pack) => pack.packId === openId) ?? null;
  const row = (label: string, value: HTMLElement | string): HTMLElement => el(
    'div', { class: 'cap-drawer-row' },
    el('span', { class: 'muted' }, label),
    typeof value === 'string' ? el('span', {}, value) : value);

  if (!found) {
    // The address is shareable; the pack set is this call's readback. An id outside it
    // says so instead of borrowing another pack's identity or drawing an empty shell.
    return el('section', { class: 'cap-drawer', id: 'domain-drawer', tabindex: '-1',
      'aria-labelledby': 'domain-drawer-title' },
      el('h3', { id: 'domain-drawer-title' }, '详情地址指向的域包不在本批读回里'),
      stateBlock({
        kind: 'unknown', title: '未找到该域包', weight: 'neutral',
        producer: `#/domains/${openId} 不在本批 GET /api/domains 的 `
          + `${packs.length} 个域包目录读回里；地址本身合法，但域包身份以读回为准。`,
        next: '返回域包登记重选一条；不要按 pack_id 猜测它的判定、版本或依赖。',
      }),
      el('div', { class: 'uif-row' },
        el('button', { type: 'button', class: 'secondary',
          onclick: () => { window.location.hash = '#/domains'; } }, '返回域包登记')));
  }

  const facts = [
    row('目录', el('span', { class: 'mono' }, domainRead(found.directory))),
    row('pack_id', el('span', { class: 'mono' }, domainDeclared(found.packId))),
    row('声明领域', domainDeclared(found.domain)),
    row('版本', domainDeclared(found.version)),
    row('清单 schema', el('span', { class: 'mono' },
      domainDeclared(found.manifestSchemaVersion))),
    row('依赖', domainDependencies(found.dependencies)),
    row('结构判定', el('span', { class: 'tag ' + domainTone(found.validation) },
      domainVerdict(found.validation))),
    row('判定原因', found.validationErrors.length
      ? el('span', {}, found.validationErrors.join(' ｜ ')
        + (found.validationErrors.length < (found.validationErrorCount ?? 0)
          ? `（校验器共 ${found.validationErrorCount} 条，此处每条只取首行）` : ''))
      : (found.validation === 'VALIDATES'
        ? '校验器未给出问题条目（结构级 E1，不是领域能力验收）'
        : '校验器未给出逐条原因')),
    row('服务备注', found.note ?? '（服务未给备注）'),
    el('div', { class: 'cap-drawer-row' },
      el('button', { type: 'button', class: 'secondary', disabled: '',
        title: 'GET /api/domains 的域包记录不含能力关联字段，界面无法据此筛选。' },
        '按该领域筛选能力'),
      el('span', { class: 'muted' },
        '未接线：本路由的域包记录里没有任何指向能力目录的字段，能力侧的领域分类也没有'
        + '已接线的关联。把域包连到能力是能力目录侧的分类工作，补上之后由服务给出，'
        + '不由本界面猜测。能力侧目前哪些轴为空，看能力库自己的未分类轴清单。')),
  ];
  const panel = el('section', { class: 'cap-drawer', id: 'domain-drawer', tabindex: '-1',
    'aria-labelledby': 'domain-drawer-title' },
    el('div', { class: 'cap-drawer-head' },
      el('h3', { id: 'domain-drawer-title' },
        found.displayName ?? domainRead(found.directory)),
      el('button', { type: 'button', class: 'secondary', id: 'domain-drawer-close',
        onclick: () => { window.location.hash = '#/domains'; } }, '返回域包登记')),
    ...facts,
    el('p', { class: 'view-hint' },
      '这里的每一项都来自 GET /api/domains 对这一个目录的读回；判定词来自仓内校验器 ',
      el('span', { class: 'mono' }, domainRead('design-lab/scripts/verify_domain_pack_v2.py')),
      '。', en('VALIDATES'), ' 只说明结构合规。'));
  panel.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') window.location.hash = '#/domains';
  });
  return panel;
}

export async function renderDomains(target: HTMLElement,
  opts: { openId?: string | null } = {}): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回域包…'));
  const data = await apiOrEmpty<DomainListResponse>('/domains', OFFLINE.domains);
  // The seam refills collections at the response level; a pack ROW whose own list is
  // absent would throw several frames from the field that went missing, so the one list
  // this view iterates per row is guarded where it is read.
  const packs = data.packs.map((pack) => ({ ...pack,
    validationErrors: Array.isArray(pack.validationErrors) ? pack.validationErrors : [] }));
  const tallies = data.counts.byValidation;
  // Rows the checker did not pass: shown with their reasons rather than folded into a
  // number, because "1 rejected" tells a reader nothing to act on.
  const findings = packs.filter((pack) => pack.validation !== 'VALIDATES');
  const judged = (state: DomainPackValidation): number =>
    packs.filter((pack) => pack.validation === state).length;
  const truncated = findings.filter((pack) => pack.validationErrors.length
    < (pack.validationErrorCount ?? pack.validationErrors.length));

  const pageHead = el('div', { class: 'page-head' },
    el('div', {},
      el('h2', {}, '设计领域'),
      el('p', { class: 'muted' },
        '域包清单、身份与判定全部来自 ', el('span', { class: 'mono' }, domainRead(data.root)),
        ' 的服务端读回；判定由仓内校验器 ',
        el('span', { class: 'mono' }, domainRead(data.checker.path)),
        ' 逐包给出。', en('VALIDATES'), ' 只表示结构（E1）合规：不是宿主运行、不是设计验收、'
        + '也不是该领域能力已被认定。未声明与未读回是两件事，分开写。')),
    el('div', { class: 'page-actions' }));

  // Every card counts the records this call returned. None of them is typed here, and
  // none of them reads `counts`: that map's scalars are not refilled by the seam, so a
  // missing key would otherwise be shown as a zero the service never answered.
  const kpis = el('div', { class: 'kpi-grid' },
    kpiCard(String(packs.length), '域包目录', `${domainRead(data.root)} 读回`),
    kpiCard(String(judged('VALIDATES')), '结构校验通过', '校验器判定，E1 结构级'),
    kpiCard(String(judged('INVALID')), '校验不通过', '下方逐项列出校验器原因'),
    kpiCard(String(packs.length - judged('VALIDATES')),
            '未通过 / 无判定', '校验不通过、清单读不到或未产生判定，逐项见下方'));

  // Why the list may be empty even though the page rendered: the root and the checker
  // are read before any pack is, and either can be unavailable. A missing root is NOT
  // the same fact as an empty catalog, so it must not borrow 尚无 wording.
  const unavailable: string[] = [];
  if (data.rootState !== 'PRESENT') {
    unavailable.push(`域包根 ${domainRead(data.root)} 的状态是 ${domainRead(data.rootState)}，`
      + '没有目录被列出');
  }
  if (data.checker.state !== 'LOADED') {
    unavailable.push(`校验器 ${domainRead(data.checker.path)} 未能载入`
      + `${data.checker.note ? `（${data.checker.note}）` : ''}，因此没有任何域包获得判定`);
  }
  const banner = unavailable.length
    ? [el('p', { class: 'error' }, '未读回判定基础：' + unavailable.join('；') + '。')] : [];

  const entries = Object.entries(tallies);
  const tallyLine = el('p', { class: 'view-hint' },
    entries.length
      ? `判定分布（路由统计）：${entries.map(([state, count]) => `${state} ${count}`).join(' · ')}`
      // An empty tally has two different causes and the page must not pick one at random:
      // nothing was asked (no session), or the service answered with no counts at all.
      : (disconnectedNotice(data)
        ? `判定分布未读回：${disconnectedNotice(data)}`
        : '判定分布为空：本次读回没有给出判定计数，逐包状态见上方列表'));

  const packList = el('div', { class: 'panel' },
    el('h3', {}, `域包登记（${packs.length}）`),
    el('ul', { class: 'list' },
      ...(packs.length
        ? packs.map(domainPackRow)
        // An empty list has three possible histories and the row has to name the right
        // one: the service answered "no packs" (尚无), the seam had to invent the
        // collection because the response omitted it (未读回, and 尚无 is forbidden), or
        // nothing was asked at all (emptyLi's own disconnected wording wins).
        : [emptyLi(data,
          shapeFieldMissing(data, 'packs') ? '未读回' : '尚无域包目录',
          shapeFieldMissing(data, 'packs')
            ? '响应没有给出 packs，所以这一屏不是服务端答出来的空台账'
            : `${domainRead(data.root)} 下没有可读回的域包目录`)])),
    tallyLine);

  const findingPanel = el('div', { class: 'panel' },
    el('h3', {}, `结构校验发现（${findings.length}）`),
    ...(findings.length
      ? findings.map((pack) => el('p', { class: 'view-hint' },
          el('span', { class: 'mono' }, domainRead(pack.directory)), ' · ',
          domainVerdict(pack.validation),
          `：${pack.validationErrors.length
            ? pack.validationErrors.join(' ｜ ') : '（校验器未给出逐条原因）'}`,
          pack.validationErrors.length < (pack.validationErrorCount ?? 0)
            ? `（校验器共 ${pack.validationErrorCount} 条，此处每条只取首行）` : '',
          pack.note ? ` 备注：${pack.note}` : ''))
      : [el('p', { class: 'view-hint' },
          data.checker.state === 'LOADED' && data.rootState === 'PRESENT'
            ? '本次读回的每个域包目录都通过结构校验；这不构成领域能力验收。'
            : '没有可报告的发现，因为判定基础本身未读回（见上方告警）。')]));

  target.replaceChildren(
    pageHead,
    kpis,
    ...banner,
    domainDrawer(packs, opts.openId ?? null),
    packList,
    findingPanel,
    el('p', { class: 'view-hint' },
      `${domainRead(data.meaning)} ${domainRead(data.unmeasuredMeans)}`
      + (truncated.length ? `（其中 ${truncated.length} 项的校验原因按每条首行截断）` : '')
      + ' 本页不安装、不生成、不改写域包，也不判定设计质量。'),
    ...shapeNoticeRows(data));
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
export async function projectPickerPanel(target: HTMLElement, title: string,
                         body: (projectId: string) => Promise<HTMLElement>,
                         preamble?: HTMLElement,
                         // 选择器本身只 GET；但页面会不会写入由调用方决定，所以这句
                         // 说明是参数而不是常量。输入与目标页会提交简报，它若继续显示
                         // "本页不提交、不修改"，屏幕上就是一句假话（2026-10-09 读渲染图
                         // 时发现）。默认值保持原句，其余只读页逐字节不变。
                         caption: string = '只读回服务端台账；本页不提交、不修改。'): Promise<void> {
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
          el('p', {}, caption))),
      // A preamble is a section that does not depend on picking a project. It renders on the empty
      // ledger too, because "this checkout has no projects" says nothing about the repo's own
      // evidence state -- hiding that section behind a missing selection would make it unaskable.
      ...(preamble ? [preamble] : []),
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
        el('p', {}, caption))),
    ...(preamble ? [preamble] : []),
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
// What the delivery layer can actually emit, per member name, and what it cannot.
// A flat list of nine "导出候选" read as an offer: the bundle writer produces
// native.psd / native.ai / preview.png / preview.svg / delivery.zip and nothing
// else, so PDF, Video and 3D were decorative. `producedBy` is checked against the
// Python emitters by design-lab/tests/test_deliverable_claims_match_emitters.py,
// in both directions -- a new claim without an emitter fails, and an emitter the
// page stopped offering fails too.
const DELIVERABLE_FORMATS: ReadonlyArray<{ format: string; producedBy: string | null }> = [
  { format: 'PSD', producedBy: 'native.psd' },
  { format: 'AI', producedBy: 'native.ai' },
  { format: 'PNG', producedBy: 'preview.png' },
  { format: 'SVG', producedBy: 'preview.svg' },
  { format: 'Archive', producedBy: 'delivery.zip' },
  { format: 'PDF', producedBy: null },
  { format: 'Video', producedBy: null },
  { format: '3D', producedBy: null },
] as const;

// 产物预检 — the profiles the service can actually run. The route refuses any other value,
// so this list is checked against both the profile files on disk and the route's own query
// pattern (design-lab/tests/test_artifact_preflight_ui_contract.py). Offering a profile
// nobody declares is the same false offer the deliverable formats used to be.
const PREFLIGHT_PROFILES = ['print', 'digital', 'video'] as const;

type ArtifactPreflightFinding = {
  id: string; severity: string; outcome: string; detail: string; criterion: string;
  measured: Record<string, unknown>;
};
type ArtifactPreflightReadback = {
  schemaVersion: string; profile: string; profileSchema: string; verdict: string;
  artifacts: Array<{ name: string; bytes: number; mode: string | null; width: number | null;
                     height: number | null; dpi: number | null; format: string | null }>;
  findings: ArtifactPreflightFinding[];
  counts: Record<string, number>;
  meaning: string;
};

const OUTCOME_TAGS: Record<string, string> = {
  PASS: 'ok', WARNING: 'warn', FAIL: 'bad', NOT_MEASURED: 'warn', NOT_APPLICABLE: 'neutral',
};

function artifactPreflightPanel(bundleId: string, data: ArtifactPreflightReadback): HTMLElement {
  // The verdict vocabulary is the service's own (PASS / WARN / BLOCKED / INCOMPLETE);
  // an unrecognised value goes to `neutral` rather than quietly taking the green tag.
  const tagClass = data.verdict === 'PASS' ? 'ok'
    : (data.verdict === 'WARN' || data.verdict === 'INCOMPLETE') ? 'warn'
      : data.verdict === 'BLOCKED' ? 'bad' : 'neutral';
  const unmeasured = data.counts['NOT_MEASURED'] ?? 0;
  return el('div', { class: 'bundle-preflight-readback' },
    el('p', {},
      el('span', { class: 'tag ' + tagClass }, en(data.verdict)),
      el('span', { class: 'muted' },
        `profile ${en(data.profile)} · 判据版本 ${String(data.profileSchema)} · `
        + `未量 ${unmeasured} 项 / 共 ${data.findings.length} 项`)),
    // The rule that keeps INCOMPLETE honest is the service's sentence, not the page's.
    el('p', { class: 'view-hint' }, data.meaning),
    el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
      'aria-label': '产物预检结果表（可横向滚动）' },
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {}, el('th', {}, '检查项'), el('th', {}, '严重度'),
          el('th', {}, '结论'), el('th', {}, '读回与判据'))),
        el('tbody', {}, ...data.findings.map((finding: ArtifactPreflightFinding) => el('tr', {},
          el('td', {}, finding.id),
          el('td', {}, el('span', { class: 'tag info' }, en(finding.severity))),
          el('td', {}, el('span', {
            class: 'tag ' + (OUTCOME_TAGS[finding.outcome] ?? 'neutral'),
          }, en(finding.outcome))),
          // Both strings travel: the reading and the criterion it was judged against.
          // A table of verdicts with no stated basis is what this module exists to stop.
          el('td', {}, finding.detail,
            el('div', { class: 'value-mono' }, '判据：' + finding.criterion))))))));
}

async function runArtifactPreflight(projectId: string, bundleId: string, profile: string,
                                    host: HTMLElement): Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' },
    `正在按 ${profile} profile 预检 ${bundleId}…`));
  try {
    const data = await api<ArtifactPreflightReadback>(
      `/projects/${projectId}/bundles/${bundleId}/preflight?profile=${encodeURIComponent(profile)}`,
      {});
    host.replaceChildren(artifactPreflightPanel(bundleId, data));
  } catch (error) {
    // A refused preflight replaces the box: leaving the previous bundle's verdict on
    // screen would attach a judgement to the request that just failed.
    host.replaceChildren(el('p', { class: 'error' },
      `预检未确认：${errMsg(error)}。服务端拒绝时没有写入任何结论。`));
  }
}

// ---- 交付收据 (DeliveryReceipt V2) ------------------------------------------------
// The document the `delivery-receipt` CLI verb has been reading, now reachable at
// GET /api/projects/<id>/bundles/<bundle>/versions/<version>/receipt.
//
// It is a user-initiated read, not a page-build read, for the same reason 产物预检 is:
// a receipt belongs to ONE bundle version and the page has not been told which delivery
// the operator means -- reading "the" receipt would be a guess about a version nobody
// picked. It also goes through plain `api()` because the route refuses, and a refused
// receipt is a fact about the delivery, not a broken view:
//   * 404 DELIVERY_RECEIPT_NOT_FOUND  -- no receipt was ever recorded for that version;
//   * 409 DELIVERY_RECEIPT_UNVERIFIED -- the stored document no longer matches the
//     digest it carries, so the service will not certify these bytes.
// Those two must stay two sentences on the screen. They arrive through the service's
// own codes (dispatch() maps ImageAssetError before the generic ValueError clause, so
// neither collapses into INVALID_REQUEST), and the answer replaces this box only.
type DeliveryReceiptRequirementRecord = { req_id: string; status: string };
type DeliveryReceiptDeliverable = {
  deliverable_id: string; artifact_sha256: string; byte_size: number; editable: boolean;
  host_readback: Record<string, unknown> | null;
  readback_matches_artifact: boolean | null;
  requirements: DeliveryReceiptRequirementRecord[];
  rollback: { backup_ref: string; procedure: string } | null;
};
type DeliveryReceiptDocument = {
  schemaVersion: string; job_id: string; created_at?: string;
  axes: { delivery: string }; receipt_id: string; receipt_sha256: string;
  deliverables: DeliveryReceiptDeliverable[];
};

// One deliverable's rollback promise, looked up. `backup_ref` is the receipt's own text and
// `state` is what the asset ledger said about it; nothing here decides the plan, and the page
// shows `reason` because a label the reader cannot check is a claim, not a read-back.
type RollbackProof = {
  deliverable_id: string; backup_ref: string | null; procedure: string | null;
  state: string; reason: string; asset_id: string | null; version_id: string | null;
  version_no: number | null; source_state: string | null;
};

// GET .../receipt answers this envelope, not the bare document: the document signs its own
// bytes with receipt_sha256, so the resolution of the rollback reference cannot be added to it
// and has to travel beside it.
type DeliveryReceiptReadback = {
  schemaVersion: string; receipt: DeliveryReceiptDocument;
  rollback_state: string; rollback_state_vocabulary: string[]; rollback_states: string[];
  state_meaning: Record<string, string>; rollback_proofs: RollbackProof[];
  does_not_prove: string[];
};

// A colour is a claim, so this map is compared with the emitter's own vocabularies both ways by
// design-lab/tests/test_delivery_evidence_ui_contract.py: every word the service can answer -- per
// deliverable or as the aggregate -- has a colour here, and no colour may be attached to a word the
// service cannot produce. `ok` stays reserved for the one per-deliverable state whose own meaning
// sentence says its source is still there; an aggregate that came out well is painted `info`,
// because "every promise still has a source" is not the fact a restore working is, and the axis chip
// beside it stays PARTIAL. An unlisted word falls back to `neutral`, never to a green.
const ROLLBACK_STATE_TAGS: Record<string, string> = {
  RESOLVED: 'ok', SOURCE_MISSING: 'bad', OTHER_PROJECT: 'bad', SOURCE_NOT_ACTIVE: 'warn',
  REF_UNPARSED: 'warn',
  ALL_RESOLVED: 'info', PARTLY_UNRESOLVED: 'warn', NONE_RESOLVED: 'bad',
  NOTHING_TO_CHECK: 'neutral', LEDGER_UNREADABLE: 'warn',
};

// Only an axis `interop/delivery_receipt.py` can actually write (DELIVERY_AXES) colours
// a chip here: design-lab/tests/test_delivery_evidence_ui_contract.py compares this map
// with that constant both ways, so the page cannot grow a third, greener verdict and a
// word the emitter dropped cannot keep a colour here. Anything unlisted is `neutral`.
const RECEIPT_AXIS_TAGS: Record<string, string> = { PASS: 'ok', PARTIAL: 'warn' };

// A receipt id, a digest, a job id and a rollback reference are all long: `.tag` is a
// nowrap pill that would clip the one string the operator has to compare, so each goes
// on its own row through `.value-mono` (the same rule valueRow encodes for settings).
function receiptIdentityRow(label: string, value: string): HTMLElement {
  return el('tr', {}, el('th', { scope: 'row' }, label),
    el('td', {}, el('div', { class: 'value-mono' }, value)));
}

function deliveryReceiptTableWrap(label: string, table: HTMLElement): HTMLElement {
  return el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
    'aria-label': label }, table);
}

function receiptLine(value: string | null, fallback: string,
                      marked: boolean, mono: boolean): HTMLElement {
  // One place decides the three things a read-back line can get wrong: an absent value must say
  // so instead of rendering empty, service prose keeps lang="en" so it is never translated, and
  // a long identifier keeps .value-mono so it is never clipped by a nowrap pill.
  const present = typeof value === 'string' && value.length > 0;
  if (!present) return el('div', { class: 'muted' }, fallback);
  const text = value as string;
  const body = marked ? en(text) : text;
  return el('div', mono ? { class: 'value-mono' } : {}, body);
}

function rollbackLimits(readback: DeliveryReceiptReadback): HTMLElement {
  // Transponded, never rewritten: the sentences are the emitter's, so the page and the JSON
  // carry the same limit. An empty list is named, because a missing caveat is not "no caveat".
  const lines = Array.isArray(readback.does_not_prove) ? readback.does_not_prove : [];
  if (!lines.length) {
    return el('p', { class: 'view-hint' },
      '本读回未给出 does_not_prove，因此无法说明这些核对结论不覆盖什么。');
  }
  return el('ul', { class: 'list' }, ...lines.map((line) => el('li',
    { class: 'list-item' }, el('span', {}, en(line)))));
}

function publishedWords(list: unknown): string[] | null {
  // The envelope ships the vocabulary it drew its words from. Null means it shipped none, which is
  // a different fact from "this word is not in it", so the two must not share a branch.
  return Array.isArray(list) ? list.filter((word) => typeof word === 'string') : null;
}

function rollbackTagFor(word: string, list: unknown): string {
  // A word the response's own published list does not contain is a contract break, not a word the
  // page happens to lack a colour for: the second falls back to `neutral`, the first says so.
  const published = publishedWords(list);
  if (published !== null && !published.includes(word)) return 'bad';
  return ROLLBACK_STATE_TAGS[word] ?? 'neutral';
}

function rollbackUnpublishedNote(word: string, list: unknown): string {
  const published = publishedWords(list);
  return published !== null && !published.includes(word) ? '（不在响应公布的词表内）' : '';
}

function rollbackProofTable(readback: DeliveryReceiptReadback): HTMLElement {
  const proofs = Array.isArray(readback.rollback_proofs) ? readback.rollback_proofs : [];
  const meaning = readback.state_meaning ?? {};
  return el('div', { class: 'table-wrap', tabindex: '0', role: 'region',
    'aria-label': '回滚参照核对表（可横向滚动）' },
    el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, el('th', {}, '交付物'), el('th', {}, '回滚参照'),
        el('th', {}, '核对'), el('th', {}, '依据'))),
      el('tbody', {}, ...proofs.map((proof) => {
        const state = typeof proof.state === 'string' ? proof.state : '';
        const note = typeof meaning[state] === 'string' ? meaning[state] : null;
        return el('tr', {},
          el('td', {}, proof.deliverable_id ?? '未记录'),
          el('td', {}, receiptLine(proof.backup_ref, '文档未记录 backup_ref', false, true)),
          el('td', {},
            el('span', { class: 'tag ' + rollbackTagFor(state, readback.rollback_states) },
              state ? en(state) : '未读回',
              rollbackUnpublishedNote(state, readback.rollback_states)),
            receiptLine(proof.version_no === null || proof.version_no === undefined
              ? null : `版本 v${proof.version_no}`, '未解析出版本号', false, true)),
          el('td', {},
            receiptLine(proof.reason, '服务端未给出依据', true, false),
            receiptLine(note, '该状态的释义未随响应给出', true, false)));
      }))));
}

function rollbackNothingChecked(readback: DeliveryReceiptReadback): HTMLElement {
  // The service answers with no proofs in two different situations and the page says them apart:
  // NOTHING_TO_CHECK means the document names no deliverable, LEDGER_UNREADABLE means the query
  // itself failed, so nothing was looked at. Which word arrived is transponded with lang="en"
  // rather than paraphrased, because the reader has to be able to match it to the response.
  const state = typeof readback.rollback_state === 'string' && readback.rollback_state.length
    ? readback.rollback_state : '';
  const cause = state === 'LEDGER_UNREADABLE'
    ? '台账在本次读回中无法查询，所以没有任何一个引用被核对过；这不说明那些源版本已经不存在。'
    : '这份收据没有交付物条目可供核对，"没有可核对的东西"与"全部可兑现"不是同一件事。';
  return el('p', { class: 'view-hint' }, '回滚核对未做（',
    state ? en(state) : '状态未读回', '）：', cause);
}

function rollbackProofRows(readback: DeliveryReceiptReadback): HTMLElement[] {
  if (!Array.isArray(readback.rollback_proofs)) {
    // The envelope did not answer. Drawing an empty table would be the invention, and it is the
    // same category of lie as showing an unread count as a zero.
    return [el('p', { class: 'error' },
      '回滚参照未读回：响应没有给出 rollback_proofs，本页不替它宣布这些引用可兑现或不可兑现。')];
  }
  if (!readback.rollback_proofs.length) return [rollbackNothingChecked(readback)];
  return [rollbackProofTable(readback)];
}

function deliveryReceiptPanel(readback: DeliveryReceiptReadback): HTMLElement {
  const data = readback.receipt;
  if (!data || !Array.isArray(data.deliverables)) {
    // "0 个交付物" would be the invention: the document did not answer this field.
    return el('p', { class: 'error' },
      '收据形状未读回：文档没有给出 deliverables，本页不替它猜交付物数量。');
  }
  const axis = typeof data.axes?.delivery === 'string' ? data.axes.delivery : '';
  const aggregate = typeof readback.rollback_state === 'string'
    ? readback.rollback_state : '';
  const identity = [
    receiptIdentityRow('文档版本', String(data.schemaVersion ?? '')),
    receiptIdentityRow('收据 id', String(data.receipt_id ?? '')),
    receiptIdentityRow('收据摘要', String(data.receipt_sha256 ?? '')),
    receiptIdentityRow('绑定任务', String(data.job_id ?? '')),
    receiptIdentityRow('记录时间', String(data.created_at ?? '文档未记录时间')),
  ];
  const entries = data.deliverables.map((entry) => el('tr', {},
    el('td', {}, entry.deliverable_id),
    el('td', {}, String(entry.byte_size)),
    el('td', {}, entry.editable ? '可编辑源文件' : '预览（压平）'),
    // The readback columns are what the PARTIAL axis is about: a real delivery here
    // never re-opens its own artifact in the host, so this says 无 rather than passing.
    el('td', {}, entry.host_readback
      ? (entry.readback_matches_artifact === false ? '有读回记录 · 与交付摘要不一致'
        : '有读回记录')
      : '无宿主读回记录'),
    el('td', {}, el('div', { class: 'value-mono' }, String(entry.artifact_sha256)),
      el('div', { class: 'value-mono' },
        `回滚参照：${String(entry.rollback?.backup_ref ?? '文档未记录')}`))));
  const requirements = data.deliverables.flatMap((entry) => (entry.requirements ?? [])
    .map((requirement) => el('tr', {},
      el('td', {}, entry.deliverable_id),
      el('td', {}, requirement.req_id),
      // The status word is the document's own, never a paraphrase: a receipt that
      // records NOT_RUN for rights must not be painted 未通过 or 已验收.
      el('td', {}, el('span', { class: 'tag info' }, en(String(requirement.status)))))));
  return el('div', { class: 'delivery-receipt-readback' },
    el('p', {},
      el('span', { class: 'tag ' + (RECEIPT_AXIS_TAGS[axis] ?? 'neutral') },
        axis ? en(axis) : '轴值未读回'),
      el('span', {
        class: 'tag ' + rollbackTagFor(aggregate, readback.rollback_state_vocabulary) },
        aggregate ? en(aggregate) : '回滚汇总未读回',
        rollbackUnpublishedNote(aggregate, readback.rollback_state_vocabulary)),
      el('span', { class: 'muted' }, `交付收据 · ${data.deliverables.length} 个交付物`)),
    deliveryReceiptTableWrap('交付收据身份与时间表（可横向滚动）',
      el('table', { class: 'table' }, el('tbody', {}, ...identity))),
    deliveryReceiptTableWrap('交付收据条目表（可横向滚动）',
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {}, el('th', {}, '交付物'), el('th', {}, '字节'),
          el('th', {}, '可编辑性'), el('th', {}, '宿主读回'), el('th', {}, '产物摘要 / 回滚参照'))),
        el('tbody', {}, ...entries))),
    deliveryReceiptTableWrap('交付收据要求项表（可横向滚动）',
      el('table', { class: 'table' },
        el('thead', {}, el('tr', {}, el('th', {}, '交付物'), el('th', {}, '要求项'),
          el('th', {}, '登记状态'))),
        el('tbody', {}, ...requirements))),
    ...rollbackProofRows(readback),
    el('p', { class: 'view-hint' },
      '收据读回的是交付时登记的事实：成员摘要、字节、可编辑性声明与逐项要求状态。'
      + '要求项为 NOT_RUN / UNVERIFIED 说的是这些门当时没有跑，不是跑失败了；'
      + '本页不把它读成 rights 或质量验收。'),
    el('p', { class: 'view-hint' },
      '回滚核对只回答一件事：收据点名的那个不可变源版本，现在还在不在本项目的台账里。'
      + 'RESOLVED 不等于已经回滚过——收据自己把这条记录称为计划，本页不替它执行。'),
    rollbackLimits(readback));
}

// The refusal, in the refusal's own words. Naming the code is not decoration: it is the
// handle the operator takes back to the CLI, and the two 404/409 answers differ in what
// happens next (publish a receipt vs. stop trusting these bytes).
function receiptRefusal(error: unknown): string {
  const envelope = (error as Error & { serviceEnvelope?: Record<string, unknown> })
    .serviceEnvelope;
  const code = typeof envelope?.['error'] === 'string' ? envelope['error'] : errMsg(error);
  if (code === 'DELIVERY_RECEIPT_NOT_FOUND') {
    return '未读回交付收据（DELIVERY_RECEIPT_NOT_FOUND）：该 ACTIVE 版本没有已登记的收据文档。'
      + '没有收据不等于交付失败，也不等于已验收；要出证需由交付流程写入。';
  }
  if (code === 'DELIVERY_RECEIPT_UNVERIFIED') {
    return '拒绝出证（DELIVERY_RECEIPT_UNVERIFIED）：已登记的收据文档与它自己记录的摘要对不上，'
      + '服务端没有读出它，本页也不会替它解释或补全。这不是请求写错，是这批字节不再被证明。';
  }
  return `收据未确认：${code}。服务端拒绝时没有写入任何结论。`;
}

async function runDeliveryReceipt(projectId: string, bundleId: string, versionId: string,
                                  host: HTMLElement): Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' },
    `正在读回 ${versionId} 的交付收据…`));
  try {
    const data = await api<DeliveryReceiptReadback>(
      `/projects/${projectId}/bundles/${bundleId}/versions/${versionId}/receipt`);
    host.replaceChildren(deliveryReceiptPanel(data));
  } catch (error) {
    // The box is replaced, not annotated: a receipt that refuses must not sit under the
    // document read from the previous version.
    host.replaceChildren(el('p', { class: 'error' }, receiptRefusal(error)));
  }
}

// 证据系统 — the delivery-record column. One picked bundle drives both operator reads
// that belong to a specific delivered version; neither runs while the page is built,
// because a verdict about a delivery nobody selected is a guess, not a readback.
function evidenceDeliveryColumn(projectId: string, bundles: BundleListResponse): HTMLElement {
  const picker = el('select', { class: 'input', id: 'evidence-delivery-target' });
  const versions = new Map<string, string>();
  for (const bundle of bundles.bundles) versions.set(bundle.id, bundle.version_id);
  if (bundles.bundles.length) {
    for (const bundle of bundles.bundles) {
      picker.append(new Option(`v${bundle.version_no} · ${bundle.id}`, bundle.id));
    }
  } else {
    // Through emptyWording so an unreachable service cannot be described as a project
    // that has no deliveries.
    const [head, note] = emptyWording(bundles, '暂无交付包可读回',
      '交付发布后在此列出，预检与收据按包读回。');
    picker.append(new Option(`${head} · ${note}`, ''));
  }
  const profilePicker = el('select', { class: 'input', id: 'evidence-delivery-profile' },
    ...PREFLIGHT_PROFILES.map((name) => new Option(name, name)));
  const preflightOut = el('div', { class: 'bundle-preflight-outcome',
    id: 'evidence-preflight-outcome' },
    el('p', { class: 'view-hint' },
      '尚未预检：预检只读取归档自带字节与随包清单，不修改交付包，也不代替 rights / 质量验收。'));
  const receiptOut = el('div', { class: 'delivery-receipt-outcome',
    id: 'evidence-receipt-outcome' },
    el('p', { class: 'view-hint' },
      '尚未读回交付收据：收据是交付时写下的文档，选中交付包后在此读回它说了什么、没说什么。'));
  const preflightRun = el('button', { type: 'button', class: 'primary-btn',
    id: 'evidence-preflight-run' }, '预检所选交付包');
  const receiptRun = el('button', { type: 'button', class: 'ghost-btn',
    id: 'evidence-receipt-run' }, '读回交付收据');
  preflightRun.disabled = bundles.bundles.length === 0;
  receiptRun.disabled = bundles.bundles.length === 0;
  preflightRun.onclick = (): void => {
    const bundleId = picker.value;
    if (!bundleId) {
      preflightOut.replaceChildren(el('p', { class: 'error' },
        '未预检：没有可选的交付登记，预检不能对一个凭记忆写出的 id 给出结论。'));
      return;
    }
    void runArtifactPreflight(projectId, bundleId, profilePicker.value, preflightOut);
  };
  receiptRun.onclick = (): void => {
    const bundleId = picker.value;
    // The version id must come from the same readback row as the bundle id. A delivery
    // list that named a bundle without its ACTIVE version cannot be receipted from
    // memory, so this refuses in its own box rather than calling a guessed path.
    const versionId = versions.get(bundleId) ?? '';
    if (!bundleId || !versionId) {
      receiptOut.replaceChildren(el('p', { class: 'error' },
        '未读回收据：交付读回没有同时给出该包的 id 与版本 id，'
        + '收据不能指向一个凭记忆写出的版本。'));
      return;
    }
    void runDeliveryReceipt(projectId, bundleId, versionId, receiptOut);
  };
  return el('div', { class: 'panel' },
    el('h3', {}, '交付登记的读回 · 产物预检与交付收据'),
    el('div', { class: 'toolbar' },
      el('label', { class: 'muted' }, '交付包', picker),
      el('label', { class: 'muted' }, 'profile', profilePicker),
      preflightRun, receiptRun),
    el('p', { class: 'view-hint' },
      '两项都先选交付包：结论属于那一个版本。预检运行检查，收据读回交付时已登记的文档；两者都不修改交付包。'),
    preflightOut, receiptOut);
}

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

    // 产物预检 acts on a bundle the operator picks. Nothing runs while the page is being
    // built: a verdict about a delivery nobody selected is not a readback, it is a guess.
    const bundlePicker = el('select', { class: 'input', id: 'bundle-preflight-target' });
    if (bundles.bundles.length) {
      for (const b of bundles.bundles) {
        bundlePicker.append(new Option(`v${b.version_no} · ${b.id}`, b.id));
      }
    } else {
      // The empty option goes through emptyWording so an unreachable service cannot be
      // described as a project with no deliveries.
      const [head, note] = emptyWording(bundles, '暂无交付包可预检',
        '任务完成并打包后，交付会在此读回并可预检。');
      bundlePicker.append(new Option(`${head} · ${note}`, ''));
    }
    const profilePicker = el('select', { class: 'input', id: 'bundle-preflight-profile' },
      ...PREFLIGHT_PROFILES.map((name) => new Option(name, name)));
    const preflightOut = el('div', { class: 'bundle-preflight-outcome',
      id: 'bundle-preflight-outcome' },
      el('p', { class: 'view-hint' },
        '尚未预检：预检只读取归档自带字节与随包清单，不修改交付包，也不代替 rights / 质量验收。'));
    const preflightRun = el('button', { type: 'button', class: 'primary-btn',
      id: 'bundle-preflight-run' }, '预检所选交付包');
    preflightRun.disabled = bundles.bundles.length === 0;
    preflightRun.onclick = (): void => {
      const bundleId = bundlePicker.value;
      if (!bundleId) {
        preflightOut.replaceChildren(el('p', { class: 'error' },
          '未预检：没有可选的交付登记，预检不能对一个凭记忆写出的 id 给出结论。'));
        return;
      }
      void runArtifactPreflight(id, bundleId, profilePicker.value, preflightOut);
    };

    const bundlePanel = el('div', { class: 'panel' },
      el('h3', {}, `交付包（${bundles.bundles.length}）`),
      bundleList,
      el('p', { class: 'view-hint' }, '交付包来自原生宿主导出；下载与 hash 核对在项目页执行（fail-closed）。'),
      el('div', { class: 'toolbar' },
        el('label', { class: 'muted' }, '交付包', bundlePicker),
        el('label', { class: 'muted' }, 'profile', profilePicker),
        preflightRun),
      preflightOut);
    const tasksRows: (HTMLElement | null)[] = tasks.tasks.length
      ? tasks.tasks.map((t) => el('tr', {},
          el('td', {}, t.kind), el('td', {}, t.state),
          el('td', {}, t.attempt.state,
            // RECEIPTED alone cannot tell an uncontested completion from one the operator
            // asked to stop and the host delivered anyway; the flags are what separate them.
            t.cancel.requested && !t.cancel.acknowledged
              ? el('span', { class: 'tag warn' }, '取消未确认') : '')))
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
      ...DELIVERABLE_FORMATS.map((f) => el('div', { class: 'panel' },
        el('h3', {}, f.format),
        f.producedBy
          ? el('span', { class: 'tag ok' }, `可产出 · ${f.producedBy}`)
          : el('span', { class: 'tag warn' }, '当前不产出 · 未接入'))));
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
//
// Since 2026-10-08 it also reads back the three OPERATOR records whose service sides
// already existed while this page showed only counts:
//   * the Human Jury verdicts -- GET /projects/<id>/jury, on the same read the
//     预检 / QA page uses, projected here without a signing form (a gate is signed
//     where the juror types the attestation, not here);
//   * the artifact preflight of a chosen bundle -- POST .../bundles/<id>/preflight?profile=;
//   * the delivery receipt of that same bundle version -- GET
//     .../bundles/<id>/versions/<v>/receipt.
// The last two are click-initiated and land in their own boxes: both are statements
// about ONE delivered version, so neither may be produced for a delivery nobody picked.
// What still does not appear here: the E0-E5 evidence records, which have no route.
export async function renderEvidence(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, '证据系统', async (id) => {
    const [layerResp, bundlesResp, juryResp, rightsResp] = await Promise.all([
      apiOrEmpty<DesignLayerResponse>(`/projects/${id}/design-layer`, OFFLINE.designLayer),
      apiOrEmpty<BundleListResponse>(`/projects/${id}/bundles`, OFFLINE.bundles),
      apiOrEmpty<JuryReadback>(`/projects/${id}/jury`, JURY_UNREADABLE),
      apiOrEmpty<RightsReadback>(`/projects/${id}/rights`, RIGHTS_UNREADABLE),
    ]);
    const juryUnread = shapeNotice(juryResp) || disconnectedNotice(juryResp);
    const rightsUnread = shapeNotice(rightsResp) || disconnectedNotice(rightsResp);
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
    // The fifth card is the jury readback's own count; a read that did not arrive shows
    // — rather than 0, because "no verdicts" and "no verdict read back" are different
    // claims about the same project.
    const kpis = el('div', { class: 'kpi-grid' },
      kpiCard(String(layer.briefs.length), 'briefs', '设计简报版本'),
      kpiCard(String(layer.directions.length), 'directions', '设计方向版本'),
      kpiCard(String(layer.design_systems.length), '设计系统', '登记系统'),
      kpiCard(String(bundlesResp.bundles.length), '交付包', '/bundles 读回'),
      kpiCard(juryUnread || typeof juryResp.verdict_count !== 'number'
        ? '—' : String(juryResp.verdict_count), '人工裁决',
        juryUnread ? '裁决未读回' : 'GET /jury 读回 · 仅人工签署'));
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
      evidenceJuryColumn(juryResp),
      evidenceRightsColumn(rightsResp, rightsUnread),
      evidenceDeliveryColumn(id, bundlesResp),
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
      el('p', { class: 'view-hint' }, '版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。'
        + '交付登记的两项读回（预检 / 收据）需要选中交付包后点击执行；证据链完整性由上方'
        + '卡片对当前检出读回（GET /api/evidence-projection），但 E0–E5 的逐条证据记录'
        + '仍无服务路由。'),
      ...shapeNoticeRows(layerResp, bundlesResp, juryResp, rightsResp));
    return done;
  }, evidenceProjectionPanelBox());
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
  { key: 'review',        label: '资源预检 + 人工评审', panelId: '#/preflight',   state: 'IMPLEMENTED',
    note: '任务包资源预检与 Human Jury 裁决均可读回；设计质量趋势与生产产物预检尚无入口' },
  { key: 'handoff',       label: 'Handoff',       panelId: '',                       state: 'PLANNED',
    note: '交接清单模型未建（能力登记表）' },
  // #pd-deliveries is a bundle manifest (id/kind/size/sha256/rights). E0-E5
  // evidence records have no HTTP route, so this stage is not the Evidence gate.
  { key: 'evidence',      label: 'Evidence',      panelId: '#pd-deliveries',          state: 'PLANNED',
    note: '交付包清单与证据链完整性投影均可读回；E0–E5 逐条证据记录仍无路由' },
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
// The Token WRITE half of W06 is now wired: see renderTokenDocumentPanel below, which
// posts a DTCG document to POST /api/projects/:id/design-system-tokens/{name} and reads the
// persisted version back. What still does NOT exist in the service is diff / publish /
// rollback (findings/W06-TOKEN-WRITE-GAP.md G5), so those are not offered here.
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
    el('p', { class: 'view-hint' },
      'Token 文档的写入与版本链在下方「设计系统 Token」面板执行（真实写入，读回持久化行）；'
      + '版本 diff、发布与回滚尚无路由，本页不做假 diff。'),
    status);
}

// ---------------------------------------------------------------------------
// Design-system TOKEN documents — the W06 token write chain, closed.
//
// W06-TOKEN-WRITE-GAP.md measured that a design system had a BINDING but no
// writable token VALUES (G1 no write route, G2 no project-level document,
// G3 no version chain, G4 no field-level reason). The column below reads
// /projects/:id/design-system-tokens — the persisted row, listed only when it is
// really live — and posts a DTCG document to the same route.
//
// What the page does NOT do:
//   * it never edits a stored version. The form sends `expected_version` = the
//     live tip THIS readback just reported, so a write that raced someone else's
//     revision comes back STALE_REVISION instead of quietly replacing it;
//   * it never renders a token value the service did not store: the rows below are
//     the service's own `document`, and the preview stays inside this panel —
//     the workbench's own brand never reads project tokens (§3.6 of the finding);
//   * it claims no acceptance. DTCG validation is structural evidence (E1/E2
//     local persistence); a host token tool, a rights check and a jury review are
//     still NOT_REVIEWED and say so.
//
// The three exported declarations are the page's half of the contract and are read
// by design-lab/tests/test_design_system_token_form_contract.py, which pushes
// TOKEN_SAMPLE_DOCUMENT through the real DTCG validator and compares the field
// lists against what the service actually accepts and emits. Rename a field here
// and that gate goes red; it will not ship a column that renders undefined.
export const TOKEN_DOCUMENT_FIELDS = [
  'token_document_id', 'project_id', 'design_system_name', 'document', 'token_count',
  'dtcg_schema_version', 'spec_sha256', 'actor', 'actor_kind', 'version',
  'superseded_by', 'created_at',
] as const;

// The exact body keys POST /projects/:id/design-system-tokens/{name} accepts; the
// service declares the same set as design_layer.TOKEN_WRITE_FIELDS.
export const TOKEN_WRITE_FIELDS = [
  'actor', 'actor_kind', 'document', 'expected_version', 'idempotency_key',
] as const;

// The starting point the editor offers when a project has no document yet. It is
// canonical DTCG 2025.10 (a $type-inheriting group, a resolvable alias and a
// dimension), because the contract test feeds this very string into
// dtcg.validate_document: the page may not offer a document the service refuses.
export const TOKEN_SAMPLE_DOCUMENT =
  '{"color":{"$type":"color","brand":{"$value":"#2563EB"},"surface":{"$value":"{color.brand}"}},"scale":{"$type":"dimension","space":{"md":{"$value":"16px"}}}}';

// `api()` throws the service's code as the message and carries the envelope, so a
// refusal can be shown with the field paths that caused it.
function serviceErrorDetail(error: unknown): string[] {
  const envelope = (error as { serviceEnvelope?: { detail?: unknown } } | null)?.serviceEnvelope;
  const detail = envelope?.detail;
  return Array.isArray(detail) ? detail.filter((line): line is string => typeof line === 'string') : [];
}

function tokenBaseline(documents: TokenDocumentRecord[], name: string): TokenDocumentRecord | null {
  return documents.find((row) => row.design_system_name === name) ?? null;
}

export function renderTokenDocumentPanel(
  id: string, tokens: TokenDocumentListResponse, systems: DesignSystemListResponse,
  target: HTMLElement,
): HTMLElement {
  const documents = tokens.token_documents;
  const status = el('p', { class: 'view-hint', id: 'pd-token-status', role: 'status' }, '');
  const showError = (message: string): void => { status.className = 'error'; status.textContent = message; };
  const showHint = (message: string): void => { status.className = 'view-hint'; status.textContent = message; };
  const refresh = async (): Promise<void> => {
    const live = document.getElementById('route-view') as HTMLElement | null;
    await renderProjectDetail(id, live || target);
  };

  const select = el('select', { id: 'pd-token-name', class: 'input' },
    ...(systems.design_systems.length
      ? systems.design_systems.map((system) => el('option', {
          value: system.name }, `${system.title} · ${system.name} · 证据 ${system.evidence_level}`))
      : [el('option', { value: '' }, '（目录为空或未读回）')]));
  const editor = el('textarea', {
    id: 'pd-token-document', class: 'input', rows: '10', spellcheck: 'false',
    'aria-label': 'DTCG Token 文档 JSON',
  });
  const gate = el('p', { class: 'view-hint', id: 'pd-token-gate' }, '');
  // The editor starts from what the service actually holds for the chosen system,
  // so a revision edits real persisted values instead of a template.
  const fill = (): void => {
    const live = tokenBaseline(documents, select.value);
    editor.value = live ? JSON.stringify(live.document, null, 2) : TOKEN_SAMPLE_DOCUMENT;
    gate.textContent = !systems.design_systems.length
      ? '写入不可用：设计系统目录为空或未读回，服务端会以 UNKNOWN_DESIGN_SYSTEM 拒绝。'
      : live
        ? `将追加到 ${live.design_system_name} 的 v${live.version}（${live.token_count} 个 token）。`
          + `本次提交基于 expected_version=${live.version}，服务端写入 v${live.version + 1}。`
        : `${select.value || '（未选择）'} 尚无 Token 文档；本次提交创建 v1。`;
  };
  fill();
  select.addEventListener('change', () => { fill(); });

  const writeBtn = el('button', {
    type: 'button', class: 'primary-btn', id: 'pd-token-write',
  }, documents.length ? '追加 Token 版本（真实写入）' : '提交 Token 文档（真实写入）');
  writeBtn.disabled = !systems.design_systems.length;

  writeBtn.addEventListener('click', () => {
    void (async () => {
      const name = select.value;
      if (!name) { showError('请先选择一个已登记的设计系统，再提交 Token 文档。'); return; }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(editor.value) as Record<string, unknown>;
      } catch (error) {
        // Refuse locally with the reason, and do not ask the service to judge
        // something that is not even JSON.
        showError(`Token 文档不是合法 JSON：${errMsg(error)}。本次未提交，服务端未写入任何内容。`);
        return;
      }
      const base = tokenBaseline(documents, name);
      const expectedVersion = base ? base.version : 0;
      writeBtn.disabled = true;
      showHint(`正在提交 ${name} 的 Token 文档（基于 v${expectedVersion}）…`);
      try {
        const result = await api<TokenDocumentGetResponse>(
          `/projects/${id}/design-system-tokens/${name}`, {
            document: parsed,
            expected_version: expectedVersion,
            actor: 'workbench-user',
            actor_kind: 'human',
            idempotency_key: uuid(),
          });
        await refresh();
        const node = document.getElementById('pd-token-status');
        if (node) {
          node.className = 'view-hint';
          node.textContent = `已写入并读回 v${result.token_document.version}`
            + `（${result.token_document.token_count} 个 token · DTCG ${result.token_document.dtcg_schema_version}）。`
            + '持久化与版本追加已验证；宿主 Token 工具、权利与质量验收仍未执行。';
        }
      } catch (error) {
        const detail = serviceErrorDetail(error);
        const stale = errMsg(error) === 'STALE_REVISION';
        showError(`Token 文档未被接受：${errMsg(error)}`
          + (detail.length ? `；字段：${detail.slice(0, 3).join(' | ')}` : '')
          + (stale ? `；${revisionHint(error)}` : '')
          + '；服务端未写入任何内容。');
        writeBtn.disabled = false;
      }
    })();
  });

  const rows = documents.length
    ? documents.map((doc) => el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, `${doc.design_system_name} · v${doc.version}`),
          el('small', {}, `${doc.token_count} 个 token · DTCG ${doc.dtcg_schema_version}`
            + ` · ${doc.spec_sha256.slice(0, 17)}…`),
          el('small', {}, `写回：${doc.actor || '未标注'} · ${doc.created_at}`)),
        el('span', { class: doc.actor_kind === 'human' ? 'tag ok' : 'tag info' },
          doc.actor_kind ? en(doc.actor_kind) : '未标注身份')))
    : [emptyLi(tokens, '尚无 Token 文档',
        '用下方表单提交一份 DTCG Token 文档；写入后在此读回持久化行。')];

  return el('div', { class: 'panel', id: 'pd-token-panel' },
    el('h3', {}, `设计系统 Token（DTCG）· 当前文档 ${documents.length}`),
    el('ul', { class: 'list' }, ...rows),
    el('div', { class: 'row-card', style: 'display:grid;gap:8px' },
      el('strong', {}, documents.length ? '修订 Token 文档（追加新版本）' : '提交 Token 文档（创建 v1）'),
      gate,
      fieldRow('设计系统', select, 'pd-token-name'),
      fieldRow('Token 文档 JSON', editor, 'pd-token-document'),
      el('div', { class: 'actions' }, writeBtn)),
    status,
    el('p', { class: 'view-hint' },
      '写入前服务端跑 DTCG 结构（interop-dtcg-document.schema.json）与语义校验（$type 继承、'
      + '别名解析与成环、composite 成员完整性），并按项目 + 设计系统追加版本；'
      + '已写入的版本不可改写，发布与回滚尚无路由。'));
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
  const [tasks, layerResp, systemsResp, bundlesResp, tokensResp] = await Promise.all([
    apiOrEmpty<TaskListResponse>(`/projects/${id}/tasks`, OFFLINE.tasks),
    apiOrEmpty<DesignLayerResponse>(`/projects/${id}/design-layer`, OFFLINE.designLayer),
    apiOrEmpty<DesignSystemListResponse>('/design-systems', OFFLINE.designSystems),
    apiOrEmpty<BundleListResponse>(`/projects/${id}/bundles`, OFFLINE.bundles),
    apiOrEmpty<TokenDocumentListResponse>(`/projects/${id}/design-system-tokens`,
      OFFLINE.tokenDocuments),
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
        el('div', { style: 'margin-top:16px' }, renderTokenDocumentPanel(id, tokensResp, systemsResp, target)),
        el('div', { style: 'margin-top:16px' }, renderReferencePanel(id)),
      ),
      inspector,
    ),
    el('p', { class: 'view-hint' }, 'tasks 与 design-layer 台账为只读；简报区可真实创建与修订并读回，'
      + 'Token 区可真实提交 DTCG 文档并按版本追加读回；参考素材区读回资产清单并按需预览。'
      + '提交任务 / 运行 / 取消 / 导出仍由工作台高级区执行。'),
    ...shapeNoticeRows(bundlesResp, layerResp, listing, systemsResp, tasks, tokensResp));
}

export async function renderRoute(view: AppView, target: HTMLElement): Promise<void> {
  target.replaceChildren();
  switch (view) {
    case 'dashboard': await renderDashboard(target); return;
    case 'brand-systems': await renderBrandSystems(target); return;
    case 'preflight-qa': await renderPreflight(target); return;
    case 'research': await renderResearchView(target); return;
    case 'settings': await renderSettings(target); return;
    case 'projects': await renderProjects(target); return;
    case 'creative-tools': await renderCreativeTools(target); return;
    case 'deliverables': await renderDeliverables(target); return;
    case 'evidence': await renderEvidence(target); return;
    case 'design-domains': await renderDomains(target); return;
    // R2 §2: the same registry addressed at one pack. The list stays rendered so the
    // detail is read inside its context instead of replacing it.
    case 'domain-detail': await renderDomains(target,
      { openId: domainDetailId(window.location.hash) }); return;
    // DL-UI-U02 首批页面。能力目录读的是**已有**路由 GET /api/capabilities
    // （renderCapabilityLibrary 早就存在，此前只嵌在仪表盘里没有自己的入口）；它自己
    // 带标题「能力库」，所以这里不再叠一层 h2——2026-10-09 读渲染图时发现两块标题
    // 叠在一起。界面状态与组件规范是规格面，不发请求，所以也不可能编造记录。
    case 'capabilities': await renderCapabilityLibrary(target); return;
    // R2 §5: the same catalog, addressed at one record. The list stays rendered so the
    // detail is read *inside* its context instead of replacing it.
    case 'capability-detail': await renderCapabilityLibrary(target,
      { openId: capabilityDetailId(window.location.hash) }); return;
    case 'intake': await renderIntake(target); return;
    case 'analysis': await renderAnalysis(target); return;
    case 'plan': await renderPlan(target); return;
    case 'records': await renderRecords(target); return;
    case 'ui-states': renderUiStates(target); return;
    case 'ui-components': renderUiComponents(target); return;
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
      // 2026-10-08 — design-domains left this branch: it now reads GET /api/domains
      // through renderDomains. Only `collaboration` still has no backend to read, so
      // it is the single slot that reaches here and gets its capability card.
      const slotFor = (v: string) => v === 'collaboration' ? 'collaboration' : null;
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
    ...navGroupChunks(ROUTE_VIEWS, (route) => el('button', {
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
  // 配色主题在壳装好后立刻按 URL 参数落一次属性，并把控件挂到当前可见的那层
  // chrome 上。默认（URL 不带参数）就是既有 design-lab 色板，不改变任何像素。
  mountThemeControls();

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
    // DL-UI-U03 / R2 §5: same shape for one capability's detail address.
    if (capabilityDetailId(window.location.hash)) return 'capability-detail';
    // R2 §2: one domain pack's detail address, same shape again.
    if (domainDetailId(window.location.hash)) return 'domain-detail';
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
    // 控件文案始终跟着**已生效的属性**走：属性可能在挂载之后才落到 <html> 上
    // （例如按色板逐条测量的闸门在启动脚本里设置它们），不重读就会出现侧栏说
    // "DESIGN-LAB 色板"、页面已经是另一套颜色的自相矛盾画面。
    refreshThemeControls();
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
    // R2 §5/§2: a detail address is still *inside* its catalog, so the nav keeps that
    // entry highlighted -- opening a detail must not read as having left the list.
    active(DETAIL_NAV_OWNER[view] ?? view);
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

  // Route label / 文案 mirror of B10 NAV. DL-UI-U01/U02 (2026-10-09)：这张表此前
  // 是把 ROUTE_VIEWS 手工再抄一遍（11 条同样的 hash/label），两份一旦漂移就没有
  // 任何东西会发现，所以侧栏现在**从 ROUTE_VIEWS 派生**，只排除遗留工作台项
  // （它没有侧栏按钮，空 hash 就是它）。三入口分组也随派生一起进来。
  const B10_NAV: Array<{ route: string; label: string; hash: string; entry: string }>
    = ROUTE_VIEWS
      .filter((route) => route.view !== 'workbench')
      .map((route) => ({ route: route.view as string, label: route.label as string,
        hash: route.hash as string, entry: route.entry as string }));

  // Hoisted out of the sidebar literal because it carries its own overflow cue below.
  // A <nav> element, not a div[aria-label]: role=generic does not support an accessible
  // name, so the label was silently dropped and no navigation landmark existed on routed
  // views (the legacy <nav> is hidden there).
  const navList = el('nav', { class: 'nav', 'aria-label': 'DESIGN-LAB 导航' },
    ...navGroupChunks(B10_NAV, (n) => el('button', {
      type: 'button',
      dataset: { route: n.route },
      'data-hash': n.hash,
      onclick: () => { window.location.hash = n.hash; },
    },
      el('span', { class: 'nav-dot' }),
      el('span', {}, n.label))));

  const sidebar = el('aside', { class: 'sidebar', id: 'app-sidebar' },
    el('div', { class: 'brand' },
      el('div', { class: 'brand-mark', 'aria-hidden': 'true' }),
      el('div', {},
        el('h1', {}, 'DESIGN-LAB'),
        el('small', {}, '设计智能与生产能力层'))),
    navList,
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
  // Escape is what a keyboard user expects from a disclosure they opened with Enter.
  // Without it the only way out is to find the toggle again by eye, because setNavOpen()
  // has already moved focus into the drawer (measured at 380px: aria-expanded stayed
  // 'true' through Escape before this handler existed).
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) setNavOpen(false);
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

  // The sidebar nav is `overflow:auto`, and the 19 destinations in ROUTE_VIEWS need far more
  // than a short window shows, so the last ones fall below the edge with nothing to say so.
  // No figure is quoted here on purpose: the overflow gate now drives this at a 620px-tall
  // window and records the amount itself in `report.navCue[width]`, and the value is
  // theme-dependent (the two palettes measured 26px apart on 2026-10-09), so any number
  // typed into a comment would be a stale measurement pretending to be a real one.
  // The cue is the same form the legacy bottom bar uses -- a sticky ::after inside the
  // scroll container, which is the only form that survives scrolling there.
  const syncNavCue = (): void => {
    const more = navList.scrollHeight > navList.clientHeight + 1
      && navList.scrollTop + navList.clientHeight < navList.scrollHeight - 1;
    navList.classList.toggle('has-scroll-more', more);
  };
  navList.addEventListener('scroll', syncNavCue, { passive: true });
  window.addEventListener('resize', syncNavCue);
  syncNavCue();

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
  // `aside` carries the implicit `complementary` landmark and ARIA in HTML does not allow
  // `dialog` on it (axe flagged role="dialog" here as unevaluated-permitted); this panel
  // is not modal anyway -- no focus trap, the page behind it stays usable.
  const drawer = el('aside', { class: 'drawer', id: 'drawer', 'aria-label': '工作区详情' },
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
  // R2 §9 全局搜索按对象类型分组。三条边界写死在这里：
  //   · 只查当前令牌已经能读到的那几个路由。服务没有对象级读权限模型，所以面板不声称
  //     做了权限过滤——它不泄露无权对象，是因为它根本读不到，而不是一句"已过滤"。
  //   · 某一组没读回来就说未读回，不显示 0 条：空集合与没问到是两件事。
  //   · 对象组在第一次打开面板时才读，不抢首屏；读回后缓存，切主题/换路由不重复请求。
  const OBJECT_GROUPS: ReadonlyArray<{
    label: string; path: string; limit: number;
    rows: (data: any) => Array<{ name: string; go: string; kind: string }>;
  }> = [
    {
      label: '能力资产', path: '/capabilities', limit: 8,
      rows: (d) => (d?.capabilities ?? []).map((c: CapabilityRecord) => ({
        name: c.id, kind: `${c.kind}${c.license ? ` · ${c.license}` : ''}`,
        // 能力详情已有独立地址（R2 §5），所以搜索结果直接落到那一条记录上。
        go: capabilityDetailHash(c.id),
      })),
    },
    {
      label: '项目', path: '/projects', limit: 8,
      rows: (d) => (d?.projects ?? []).map((p: { id: string; name: string }) => ({
        name: p.name, kind: `项目 ${p.id.slice(0, 8)}`, go: projectDetailHash(p.id),
      })),
    },
    {
      label: '设计领域', path: '/domains', limit: 8,
      rows: (d) => (d?.packs ?? []).map((k: { packId: string | null; directory: string;
        displayName: string | null; domain: string | null }) => ({
        name: k.displayName ?? k.directory,
        kind: `领域 ${k.domain ?? '未声明'} · ${k.packId ?? k.directory}`,
        // R2 §2: a domain row is a second-level entry, so it lands on that pack's own
        // address. A pack whose manifest declares no pack_id has no address to give —
        // it falls back to the registry instead of inventing one from the directory name.
        go: domainDetailHash(k.packId) ?? '#/domains',
      })),
    },
    {
      label: '设计系统', path: '/design-systems', limit: 8,
      rows: (d) => (d?.systems ?? []).map((s: { name: string; version_no?: number }) => ({
        name: s.name, kind: `设计系统${s.version_no ? ` v${s.version_no}` : ''}`,
        go: '#/brand-systems',
      })),
    },
  ];
  type SearchRow = { name: string; go: string; kind: string };
  /** `'unread'` is its own state: a group that never got an answer must not read as 0 objects. */
  const searchCache = new Map<string, SearchRow[] | 'unread'>();
  const unreadNote = (path: string): HTMLElement => el('p', { class: 'error' },
    `未读回：GET /api${path} 没有给回对象集合，因此这一组既不显示条数，也不说"没有"。`);
  const buildGroup = (group: typeof OBJECT_GROUPS[number])
    : HTMLElement => {
    const body = el('div', { class: 'palette-group-body' });
    const box = el('div', { class: 'palette-group', 'data-group': group.label },
      el('p', { class: 'palette-group-title' }, group.label), body);
    const cached = searchCache.get(group.path);
    if (cached === undefined) {
      body.replaceChildren(el('p', { class: 'view-hint' }, '尚未读取：打开面板后才向 '
        + `GET /api${group.path} 取这一组的对象。`));
    } else if (cached === 'unread') {
      body.replaceChildren(unreadNote(group.path));
    } else {
      renderGroupRows(body, cached, group.limit);
    }
    return box;
  };
  const renderGroupRows = (body: HTMLElement,
    rows: SearchRow[], limit: number): void => {
    if (!rows.length) {
      body.replaceChildren(el('p', { class: 'view-hint' }, '这一组当前读回 0 个对象。'));
      return;
    }
    const shown = rows.slice(0, limit);
    body.replaceChildren(
      ...shown.map((r) => el('button', {
        type: 'button', class: 'item', dataset: { go: r.go },
        onclick: () => { window.location.hash = r.go; closePalette(); },
      }, el('span', {}, r.name), el('small', {}, `${r.kind}`))),
      rows.length > shown.length
        ? el('p', { class: 'palette-more' },
          `还有 ${rows.length - shown.length} 个对象未列出：面板只画前 ${shown.length} 个，`
          + '输入更具体的关键词可缩小范围。')
        : '');
  };
  const objectsBox = el('div', { id: 'paletteObjects' },
    el('p', { class: 'palette-note' },
      '下面按对象类型分组列出可去到的真实对象。范围只限当前令牌已能读到的路由：'
      + '本服务没有对象级读权限模型，所以这里不说"已按权限过滤"。'),
    ...OBJECT_GROUPS.map((group) => buildGroup(group)));
  itemsBox.append(objectsBox);
  let objectsLoaded = false;
  const loadSearchObjects = async (): Promise<void> => {
    if (objectsLoaded) return;
    objectsLoaded = true;
    for (const group of OBJECT_GROUPS) {
      const data = await apiOrEmpty<Record<string, unknown>>(group.path, {});
      const unread = shapeNotice(data) || disconnectedNotice(data);
      const rows: SearchRow[] | 'unread' = unread ? 'unread' : group.rows(data);
      searchCache.set(group.path, rows);
      const holder = itemsBox.querySelector(`[data-group="${group.label}"]`);
      const body = holder?.querySelector('.palette-group-body');
      if (!body) continue;
      if (rows === 'unread') {
        (body as HTMLElement).replaceChildren(unreadNote(group.path));
      } else {
        renderGroupRows(body as HTMLElement, rows, group.limit);
      }
    }
  };
  const cmds = ROUTE_VIEWS.filter((r) => r.hash !== '')
    .map((r) => ({ go: r.hash, label: r.label }));
  const routeGroup = el('div', { class: 'palette-group-body' });
  // R2 §9 opens with the objects a person is looking for; the page list is the fallback, so it
  // sits after them rather than pushing four object groups below the fold.
  itemsBox.append(el('div', { class: 'palette-group', 'data-group': '页面' },
    el('p', { class: 'palette-group-title' }, '页面'), routeGroup));
  for (const c2 of cmds) {
    routeGroup.append(el('button', {
      type: 'button', class: 'item', dataset: { go: c2.go },
      onclick: () => { window.location.hash = c2.go; closePalette(); },
    }, el('span', {}, c2.label), el('small', {}, '打开')));
  }
  let paletteInvoker: Element | null = null;
  const openPalette = (): void => {
    paletteInvoker = document.activeElement;
    palette.classList.add('open'); paletteInput.focus(); paletteInput.select();
    void loadSearchObjects();
  };
  const closePalette = (): void => {
    palette.classList.remove('open');
    paletteInput.value = '';
    itemsBox.querySelectorAll<HTMLElement>('.item').forEach((i) => { i.style.display = ''; });
    itemsBox.querySelectorAll<HTMLElement>('.palette-group').forEach((g) => { g.hidden = false; });
    // Hiding the panel with an author `display:none` (`.palette{display:none}`)
    // drops focus to <body>; return it to whatever opened the palette.
    if (document.activeElement === document.body && paletteInvoker
      && document.contains(paletteInvoker)) {
      (paletteInvoker as HTMLElement).focus();
    }
    paletteInvoker = null;
  };
  paletteInput.addEventListener('input', () => {
    const q = paletteInput.value.trim().toLowerCase();
    for (const group of Array.from(itemsBox.querySelectorAll<HTMLElement>('.palette-group'))) {
      let hits = 0;
      for (const item of Array.from(group.querySelectorAll<HTMLElement>('.item'))) {
        const match = !q || (item.textContent || '').toLowerCase().includes(q);
        item.style.display = match ? 'flex' : 'none';
        if (match) hits += 1;
      }
      // A group with no hit collapses so the readable part of the panel stays the
      // results -- but only once objects have actually been read back; an unloaded
      // group must not disappear and look like "nothing matched".
      group.hidden = hits === 0 && !group.querySelector('.view-hint, .error');
    }
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

// ============================================================================
// DL-UI-U02 (2026-10-09) — 桌面 UI 优先层：配色主题轴、状态原语、首批页面
// ----------------------------------------------------------------------------
// owner 决定：新任务包带来的是**新布局与新架构**；配色不覆盖现有的，现有的保持
// 默认，新包的取值做成一个可选主题。两条轴各选各的，正交：
//
//   data-palette : design-lab（缺省，UI套件 B04/B07） | ui2026（20261009 包基线）
//   data-scheme  : dark（缺省） | light —— 只有声明过浅色一侧的色板才有第二个值
//
// 选择来自 URL 参数（?palette=ui2026&scheme=light），与既有 `?dev=1` 同一机制；
// 不写 localStorage：显示偏好不该变成一份看起来像产品数据的客户端状态，而且
// "刷新回到声明的默认值"本身就是可读回的事实。CSS 侧的地板值保护见
// apps/workbench/style.css 同段注释（品牌色族与 --border-strong 不随色板换）。
//
// design-lab 色板从未声明浅色值，所以选到它时，明暗开关必须**禁用并说明为什么**，
// 而不是留一个按下去什么都不发生的开关（那正是本任务包禁的假动作）。
// ============================================================================

export type PaletteId = 'design-lab' | 'ui2026';
export type SchemeId = 'dark' | 'light';

interface PaletteSpec {
  id: PaletteId;
  label: string;
  schemes: readonly SchemeId[];
  /** schemes 只有一侧时，界面对另一侧说的话。 */
  missingScheme: string;
}

const PALETTES: readonly PaletteSpec[] = [
  { id: 'design-lab', label: 'DESIGN-LAB 色板', schemes: ['dark'],
    missingScheme: '这套色板没有声明过浅色值，不自造一套。' },
  { id: 'ui2026', label: 'UI-20261009 基线', schemes: ['dark', 'light'], missingScheme: '' },
];

function paletteSpec(id: PaletteId): PaletteSpec {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** URL 查询参数；vm 桩里的 location 可能没有 search，读不到就当没带。 */
function urlParam(name: string): string | null {
  try {
    const search = (window.location as { search?: string }).search;
    if (typeof search !== 'string' || search.length === 0) return null;
    for (const pair of search.replace(/^\?/, '').split('&')) {
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      if (pair.slice(0, eq) === name) return decodeURIComponent(pair.slice(eq + 1));
    }
  } catch { /* vm mock，或百分号转义本身畸形 */ }
  return null;
}

/**
 * 当前生效的主题选择。**已经落在 <html> 上的属性优先**，其次才是 URL 参数：
 * 属性是界面真正呈现的事实，URL 只是写入属性的入口。顺序反过来时，一个直接设置
 * 属性的调用方（例如对比度闸门按色板逐条测量）会让按钮文案与实际配色互相矛盾，
 * 还会让"这一轴当前只有一个值"的说明消失。非法值一律退回该色板缺省侧。
 */
export function readThemeChoice(): { palette: PaletteId; scheme: SchemeId } {
  const applied = typeof document !== 'undefined'
    && document.documentElement
    && typeof document.documentElement.getAttribute === 'function'
    ? {
        palette: document.documentElement.getAttribute('data-palette'),
        scheme: document.documentElement.getAttribute('data-scheme'),
      }
    : { palette: null, scheme: null };
  const fromUrl: PaletteId = urlParam('palette') === 'ui2026' ? 'ui2026' : 'design-lab';
  const palette: PaletteId = applied.palette === 'ui2026' || applied.palette === 'design-lab'
    ? applied.palette : fromUrl;
  const spec = paletteSpec(palette);
  const fromUrlScheme = urlParam('scheme');
  const wanted = spec.schemes.includes(applied.scheme as SchemeId)
    ? applied.scheme : (spec.schemes.includes(fromUrlScheme as SchemeId)
      ? fromUrlScheme : spec.schemes[0]);
  return { palette, scheme: wanted as SchemeId };
}

/** 写回 URL：优先 replaceState（不重载、不进历史），没有就退回导航。 */
function writeUrlParam(name: string, value: string): void {
  const href = (window.location as { href?: string }).href;
  if (typeof href !== 'string') return;
  let target: string;
  try {
    const url = new URL(href);
    url.searchParams.set(name, value);
    target = url.toString();
  } catch { return; }
  const history = (window as { history?: { replaceState?: unknown; state?: unknown } }).history;
  if (history && typeof history.replaceState === 'function') {
    (history.replaceState as (state: unknown, title: string, url: string) => void)
      (history.state ?? null, '', target);
    return;
  }
  (window.location as { href: string }).href = target;
}

/**
 * 把选择落到 <html> 的属性上。CSS 只认这两个属性，所以这里就是唯一真相；
 * 属性名与 style.css 的 :root[data-palette] / [data-scheme] 成对，改一边必红。
 */
export function applyTheme(
  choice: { palette: PaletteId; scheme: SchemeId } = readThemeChoice(),
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root || typeof root.setAttribute !== 'function') return;
  root.setAttribute('data-palette', choice.palette);
  if (choice.scheme === 'dark') root.removeAttribute('data-scheme');
  else root.setAttribute('data-scheme', choice.scheme);
}

function cyclePalette(current: PaletteId): PaletteId {
  const index = PALETTES.findIndex((p) => p.id === current);
  return PALETTES[(index + 1) % PALETTES.length].id;
}

/**
 * 主题控件对。两个按钮都真的做事（写 URL + 改 <html> 属性），是这批页面上唯一
 * 接线的动作。
 *
 * 没有浅色一侧的色板**不给禁用按钮**：`button:disabled{opacity:.45}` 让文字在
 * 底色上只剩 3.4:1，被对比度闸门按每条路由报红（2026-10-09 实测），而"一个永远
 * 按不动的开关"本来就该是缺席 + 一句说明，不是摆着让人试。所以这一轴直接不出现，
 * 原因写在旁边。
 * 同一时刻屏上只会出现一套：遗留工作台视图里 `.app` 自己隐藏，路由视图里扁平
 * `.app-nav` 被 hidden，所以不需要给两套控件不同的 id。
 */
function themeControlNodes(): HTMLElement[] {
  const choice = readThemeChoice();
  const spec = paletteSpec(choice.palette);
  const nodes: HTMLElement[] = [
    el('button', {
      type: 'button', class: 'theme-toggle', dataset: { themeAction: 'palette' },
      'aria-label': '配色主题',
      onclick: () => {
        writeUrlParam('palette', cyclePalette(readThemeChoice().palette));
        applyTheme(readThemeChoice());
        refreshThemeControls();
      },
    }, spec.label),
  ];
  if (spec.schemes.length > 1) {
    nodes.push(el('button', {
      type: 'button', class: 'theme-toggle', dataset: { themeAction: 'scheme' },
      'aria-label': '明暗',
      onclick: () => {
        const now = readThemeChoice();
        const next: SchemeId = now.scheme === 'dark' ? 'light' : 'dark';
        writeUrlParam('scheme', next);
        applyTheme(readThemeChoice());
        refreshThemeControls();
      },
    }, choice.scheme === 'light' ? '浅色' : '深色'));
  }
  nodes.push(el('span', { class: 'theme-toggle-note' },
    spec.schemes.length > 1 ? '' : spec.missingScheme));
  return nodes;
}

export function buildThemeControls(): HTMLElement {
  return el('div', { class: 'theme-toggle-group uif-row' }, ...themeControlNodes());
}

/** 换了色板，可用轴就变了：整组重建成当前应该存在的那些控件。 */
function refreshThemeControls(): void {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  for (const group of Array.from(document.querySelectorAll<HTMLElement>('.theme-toggle-group'))) {
    group.replaceChildren(...themeControlNodes());
  }
}

// ---------------------------------------------------------------------------
// 状态原语（pack 屏 15 界面状态）
//
// 任务包要求覆盖 loading / empty / unknown / offline / forbidden / error /
// timeout / conflict，且每个都有真实下一步。措辞规则沿用仓库既有的那一条
// （emptyWording / disconnectedNotice / shapeNotice）：**没有读回过就不能说
// "尚无"**，所以 empty 与 unread 是两块，不是一块。
//
// 状态名一律中文，不往界面里塞服务侧的英文判定词：状态词汇表由
// design-lab/config/state-vocabularies.json 单一持有，verify_state_vocabularies.py
// 会拒绝服务发不出的判定字面量（连构建产物一起查）。下面引用服务真实状态的地方
// 走 en()，取值来自读回，不在这个页面里写死。
// ---------------------------------------------------------------------------

interface StateSpec {
  kind: string;
  title: string;
  /** 这一块在真实代码里由谁产生。引用调用点，不引用虚构的记录。 */
  producer: string;
  /** 界面必须给的下一步。 */
  next: string;
  weight: 'neutral' | 'bad';
}

const STATE_SPECS: readonly StateSpec[] = [
  { kind: 'loading', title: '正在读回', weight: 'neutral',
    producer: 'renderRoute 进入视图时先写 .view-loading，读回没有到达前界面不留白。',
    next: '等本次读回；长时间不动就刷新重新发起，而不是复用上一屏的数据。' },
  { kind: 'empty', title: '尚无记录', weight: 'neutral',
    producer: 'emptyWording() 只在服务真的答了"这里没有"时给的说法。',
    next: '按页面提示创建第一条记录；空集合不等于失败，也不等于功能不可用。' },
  { kind: 'unread', title: '未读回', weight: 'neutral',
    producer: 'shapeNotice() / disconnectedNotice()：服务答了但缺字段，或压根没连接。',
    next: '连接本机设计服务，或检查响应缺了哪个字段；缺字段不会被渲染成"尚无"。' },
  { kind: 'unknown', title: '未判定', weight: 'neutral',
    producer: '资格轴的 null 值。capabilityCard 用 .tag.neutral 显示，不借用判定的重量。',
    next: '补齐资格证据后才可能变成合格或不合格；null 既不是通过也不是失败。' },
  { kind: 'offline', title: '未连接', weight: 'neutral',
    producer: 'dev/offline seam：apiOrEmpty() 在没有令牌时给出诚实空载荷，并打标记。',
    next: '用官方入口启动本机服务，或在高级连接里粘贴临时令牌。' },
  { kind: 'forbidden', title: '无权进行', weight: 'bad',
    producer: '服务端拒绝（权利门 / Human Gate 未过）时返回的结论，界面不自行降级。',
    next: '查看权利与人工门的说明；需要真人结论的动作不能由 Agent 代签。' },
  { kind: 'error', title: '读取失败', weight: 'bad',
    producer: '视图级 catch 会把这一面的读回失败与原因留在屏上，不吞成空白。',
    next: '刷新重读；持续失败时按给出的原因排查服务，而不是反复点击。' },
  { kind: 'timeout', title: '本次请求超时', weight: 'bad',
    producer: '宿主/任务读回路径：超时不等于失败，也不等于成功，先对账。',
    next: '先核对已经发生了什么再决定是否重发，避免对同一文档重复写入。' },
  { kind: 'conflict', title: '版本冲突', weight: 'bad',
    producer: '修订已取代的版本时服务端返回 STALE_REVISION，旧版本字节不被改写。',
    next: '在最新版本上重做这次修改；旧版本保留为历史。' },
  { kind: 'cancelled', title: '取消已请求', weight: 'neutral',
    producer: '原生取消没有 ack 事件：requested 与 acknowledged 分开，界面只说请求过。',
    next: '读回任务状态确认是否真的停下；"请求取消"不等于"已取消"。' },
  { kind: 'queued', title: '已排队', weight: 'neutral',
    producer: '计划提交后只排队不启动，启动是显式动作。',
    next: '在任务行上显式启动；提交本身不会碰宿主。' },
];

/**
 * 一个状态块 = 状态名 + 它从哪来 + 下一步。下一步永远存在：一个说不出"接下来
 * 做什么"的状态就是死胡同文案。
 */
export function stateBlock(spec: StateSpec): HTMLElement {
  return el('article', { class: 'uif-state', dataset: { stateKind: spec.kind } },
    el('div', { class: 'uif-state-head' },
      el('span', { class: 'tag ' + spec.weight }, spec.title)),
    el('p', { class: 'uif-state-reason' }, spec.producer),
    el('p', { class: 'uif-state-next' }, el('strong', {}, '下一步 '), spec.next));
}

/** 屏 15 · 界面状态。静态合同面：不读后端，所以也不可能有编造的记录。 */
export function renderUiStates(target: HTMLElement): void {
  const filter = el('input', {
    class: 'input', type: 'search', id: 'uif-state-filter',
    placeholder: '按状态名 / 来源 / 下一步过滤', 'aria-label': '状态过滤',
  });
  const shown = el('span', { class: 'muted' }, '');
  const grid = el('div', { class: 'uif-states' });
  const render = (): void => {
    const needle = (filter.value || '').trim().toLowerCase();
    const keep = needle
      ? STATE_SPECS.filter((s) => `${s.title} ${s.kind} ${s.producer} ${s.next}`
        .toLowerCase().includes(needle))
      : Array.from(STATE_SPECS);
    grid.replaceChildren(...keep.map((s) => stateBlock(s)));
    shown.textContent = keep.length === STATE_SPECS.length
      ? `共 ${STATE_SPECS.length} 个状态`
      : `${keep.length} / ${STATE_SPECS.length} 个状态，其余被过滤`;
  };
  filter.oninput = render;
  render();
  target.replaceChildren(
    el('h2', {}, viewLabel('ui-states')),
    el('p', { class: 'muted' },
      '这是产品自己的状态面：每一块写的都是这个状态由哪段代码产生、界面上必须给什么下一步，'
      + '不是演示记录。没有读回过的集合一律说未读回，不说尚无。'),
    el('div', { class: 'uif-row' }, filter, shown),
    grid,
  );
}

/** 令牌样张：色块用 var() 直接刷当前主题算出来的值，不复制第二份色值表。 */
function tokenSwatch(name: string): HTMLElement {
  return el('div', { class: 'uif-swatch' },
    el('i', { style: `background:var(${name});` }),
    el('span', { class: 'mono' }, name));
}

/** 组件页里的输入样张：可输入但不接动作，避免留下按了没反应的按钮。 */
function sampleInput(): HTMLElement {
  return el('input', {
    class: 'input', type: 'search', placeholder: '例如：秋季品牌视觉',
    'aria-label': '组件样张输入框',
  });
}

/** 屏 16 · 组件规范。这里出现的每个类名都有真实调用点，不是留着好看的样式。 */
export function renderUiComponents(target: HTMLElement): void {
  // 这一列是新增的第 42 个 `ul.list` 容器（清单见
  // design-lab/tests/test_workbench_css_single_definition.py 的注释）：
  // 组件规范面里的「列表」样张，两行都是真实 li.list-item 成员。
  const list = el('ul', { class: 'list' },
    el('li', { class: 'list-item' },
      el('div', {}, el('strong', {}, '列表成员'),
        el('small', {}, 'ul.list + li.list-item 是仓库既有约定，新页面直接用它；'
          + '行卡片走 .row-card，两种语义不混。'))),
    el('li', { class: 'list-item' },
      el('div', {}, el('strong', {}, '空态有两种说法'),
        el('small', {}, 'emptyLi() 在服务真答"没有"时说尚无，在未连接或缺字段时说未读回。'))));

  const table = el('div', { class: 'table-wrap' },
    el('table', { class: 'table' },
      el('thead', {}, el('tr', {},
        el('th', {}, '规则'), el('th', {}, '为什么这样定'))),
      el('tbody', {},
        el('tr', {}, el('td', {}, '状态权重'),
          el('td', {}, '非判定（未判定 / 未读回 / 计划中）用 .tag.neutral，不借用判定的饱和重量。')),
        el('tr', {}, el('td', {}, '英文状态词'),
          el('td', {}, el('span', {}, '服务自己的词汇标记为 '), en('READY'),
            el('span', {}, '，不翻译成中文，避免产生第二套词汇。'))),
        el('tr', {}, el('td', {}, '长中文文案'),
          el('td', {}, '控件与卡片 overflow-wrap:anywhere，窄窗口靠重排而不是裁切。')))));

  // 样张按钮保持**可用**并在本页回显，不做禁用样张。两条理由都实测过：
  //   1. `button:disabled{opacity:.45}` 把标签压到 3.4:1，对比度闸门会按每条路由报红
  //      ——一个必然低对比的组件不该被摆进产品里给人抄；
  //   2. "看着能点、点了什么都不说"正是本任务包禁止的假动作。
  // 所以这里的规则写成药丸与表格那一行：要么给出真实可见的结果，要么不出现。
  const echo = el('p', { class: 'uif-spec-note', role: 'status', 'aria-live': 'polite' },
    '样张回显：还没有点击。');
  const sample = (label: string, cls: string): HTMLElement => el('button', {
    type: 'button', class: cls,
    onclick: () => {
      echo.textContent = `样张回显：已点击「${label}」，只在页面内回显，不触发产品动作。`;
    },
  }, label);

  target.replaceChildren(
    el('h2', {}, viewLabel('ui-components')),
    el('p', { class: 'muted' },
      '这里的样张按钮只做一件事：在本页回显被点击。产品动作由各自视图接线；'
      + '未接线的动作在各自主页面上以禁用加原因出现，不在这个页面上假装可用。'),
    el('div', { class: 'uif-spec' },
      el('section', { class: 'uif-spec-block' },
        el('h3', {}, '配色与明暗'),
        // 开关只有一份，在左侧导航底部（路由视图）或扁平导航里（遗留工作台）。这里
        // 再放一份会在同一屏出现两个控件，且两处文案会随挂载时刻不同而不一致——
        // 2026-10-09 读渲染图时就是这样被抓出来的。
        el('p', { class: 'uif-spec-note' },
          '色板与明暗开关在左侧导航底部，全站一份。下面六块是当前主题算出来的语义令牌：'
          + '色块直接刷 var() 的值，所以它们显示的就是界面真正在用的颜色，不是抄来的第二份色表。'),
        el('div', { class: 'uif-row' },
          tokenSwatch('--color-bg'), tokenSwatch('--color-surface'),
          tokenSwatch('--color-surface-2'), tokenSwatch('--color-border'),
          tokenSwatch('--color-text'), tokenSwatch('--color-muted')),
        el('p', { class: 'uif-spec-note' },
          '品牌色族与 --border-strong 不随色板切换：它们是被实测修正过的地板值。')),
      el('section', { class: 'uif-spec-block' },
        el('h3', {}, '状态药丸'),
        el('div', { class: 'uif-row' },
          el('span', { class: 'tag ok' }, '合格'),
          el('span', { class: 'tag warn' }, '警告'),
          el('span', { class: 'tag bad' }, '不合格'),
          el('span', { class: 'tag info' }, '信息'),
          el('span', { class: 'tag neutral' }, '未判定'))),
      el('section', { class: 'uif-spec-block' },
        el('h3', {}, '按钮与输入'),
        el('div', { class: 'uif-row' },
          sample('主操作样张', 'primary-btn'),
          sample('次操作样张', 'secondary'),
          sample('危险操作样张', 'danger-btn')),
        echo,
        el('label', {}, '输入框样张', sampleInput()),
        el('p', { class: 'uif-spec-note' },
          '焦点环由全局 :focus-visible 规则给出，主题切换不重定义它；表单边界用'
          + ' --border-strong（3:1 地板值），装饰边框用 --line。')),
      el('section', { class: 'uif-spec-block' }, el('h3', {}, '列表'), list),
      el('section', { class: 'uif-spec-block' }, el('h3', {}, '表格'), table),
      el('section', { class: 'uif-spec-block' }, el('h3', {}, '状态面'),
        el('div', { class: 'uif-states' }, ...STATE_SPECS.slice(0, 3).map(stateBlock)))),
  );
}

/**
 * 把主题控件挂到当前**可见**的那层 chrome 上：路由视图挂 B10 侧栏，遗留工作台视图
 * 挂扁平 `.app-nav`。两处都挂着同一对控件，但同一时刻只有一处可见，所以不会看到
 * 两份开关，也不需要第二套 id。
 *
 * 为什么是侧栏而不是顶栏：先放在 `.top-actions` 里，溢出闸门在 1280 当场报
 * `STRAY ... button#topNotice +10px` 与 `button#openDrawer +66px` —— 顶栏那一行
 * 本来就已经排到边界，再插两个控件就把兄弟挤出视口。侧栏是 280px 的纵向栏，
 * 控件按行换行，不给任何一行增加横向压力。
 * vm 桩没有 querySelector，这里直接跳过 —— 桩里本来也没有 B10 外壳。
 */
export function mountThemeControls(): void {
  if (typeof document === 'undefined'
      || typeof document.querySelectorAll !== 'function'
      || typeof document.querySelector !== 'function') return;
  const sidebar = document.querySelector<HTMLElement>('#app-sidebar');
  const flatNav = document.querySelector<HTMLElement>('.app-nav');
  if (sidebar) sidebar.append(buildThemeControls());
  if (flatNav) flatNav.append(buildThemeControls());
  applyTheme();
}

/**
 * 按 `entry` 分组渲染导航项。组标签是 <span class="nav-group">，不是按钮，所以
 * "屏上有几个路由项"这条读数仍然只数 .app-nav-item / .nav button —— 分组改变的是
 * 呈现层，不是路由数量。扁平 `.app-nav` 与 B10 侧栏共用这一份，避免两张表漂移。
 */
export function navGroupChunks<T extends { entry: string }>(
  items: readonly T[],
  make: (item: T) => HTMLElement,
): HTMLElement[] {
  const out: HTMLElement[] = [];
  let current: string | null = null;
  for (const item of items) {
    if (item.entry !== current) {
      current = item.entry;
      out.push(el('span', { class: 'nav-group' }, item.entry));
    }
    out.push(make(item));
  }
  return out;
}

// ============================================================================
// DL-UI-U04 (2026-10-09) — 屏 03 输入与目标
// ----------------------------------------------------------------------------
// 这一面接的是**已有**合同，不发明第二套：
//   POST /api/projects/{id}/briefs      经 design.ts createBrief()（校验与幂等键只有一份）
//   GET  /api/projects/{id}/assets      参考素材清单
//   POST /api/projects/{id}/assets      上传真实字节（content_base64 + 幂等键）
//   GET  /api/projects/{id}/briefs      提交后读回，界面说的是服务端返回的版本
//
// 合同里没有的字段，界面上就不假装持久化：简报只记录 title / goals / constraints /
// reference_asset_ids。所以「精确文案 / 锁比例 / 锁位置 / 编辑范围」和「参考职责」
// 这些包要求的输入属性，是**编排进 constraints 文本**的，页面上写明这一点；
// 「输出目标」只决定下一步去哪个界面，未接的路线禁用并说明原因。
// ============================================================================

interface IntakeConstraintFields {
  exactText: HTMLInputElement;
  lockRatio: HTMLInputElement;
  lockPosition: HTMLInputElement;
  editScope: HTMLInputElement;
  toolFormat: HTMLInputElement;
}

/** R2 §6 第三组「交付目标」的四档。每档后面的接线状态是**仓库事实**，逐条可查：
 *  分析走 #/analysis 的修订追加；目标包走 POST /native-plans 且只排队（202，不启动宿主）；
 *  原生可编辑工程的宿主执行与重开读回尚无取证；最终媒体在仓库里没有渲染或导出路由。 */
const DELIVERY_LEVELS: ReadonlyArray<{ name: string; wired: string; note: string }> = [
  { name: '分析与方向', wired: '已接线', note: '#/analysis 追加方向修订，不启动宿主、不改已交付版本。' },
  { name: '目标生成包', wired: '只排队', note: 'POST /native-plans 返回 202；启动仍是任务面上的显式动作。' },
  { name: '原生可编辑工程', wired: '未取证', note: '宿主执行与关闭重开读回还没有 E2/E3 证据，这一档当前不是可交付。' },
  { name: '最终媒体（渲染/导出）', wired: '未接线', note: '仓库内没有渲染或导出路由，界面不假装这条路存在。' },
];

/** 交付范围同样是编排进 constraints 的一句话，不是合同里新造的字段。 */
function intakeSelectedDeliveryLevels(): string[] {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="intake-delivery-level"]'))
    .filter((box) => box.checked)
    .map((box) => box.value);
}

/** 把输入属性编排成合同真正记录的那一条 constraints。 */
function composeConstraints(fields: IntakeConstraintFields, freeText: string): string {
  const parts: string[] = [];
  if (freeText.trim()) parts.push(freeText.trim());
  if (fields.exactText.value.trim()) parts.push(`精确文案：${fields.exactText.value.trim()}`);
  if (fields.lockRatio.checked) parts.push('锁定比例');
  if (fields.lockPosition.checked) parts.push('锁定位置');
  if (fields.editScope.value.trim()) parts.push(`编辑范围：${fields.editScope.value.trim()}`);
  const levels = intakeSelectedDeliveryLevels();
  if (levels.length) parts.push(`交付目标：${levels.join('、')}`);
  if (fields.toolFormat.value.trim()) parts.push(`工具与规格：${fields.toolFormat.value.trim()}`);
  return parts.join('；');
}

/** 本页自己的勾选集合：遗留单页用 `input[name="reference-asset"]`，
 *  复用同名会让两个界面互相读到对方的勾选，所以这里用独立的名字。 */
function intakeSelectedReferences(): string[] {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="intake-reference-asset"]'))
    .filter((box) => box.checked)
    .map((box) => box.value);
}

function intakeForm(projectId: string): HTMLElement {
  const title = el('input', { class: 'input', type: 'text', maxlength: '160',
    id: 'intake-title', placeholder: '例如：秋季品牌视觉' });
  const goals = el('input', { class: 'input', type: 'text', maxlength: '400',
    id: 'intake-goals', placeholder: '现代, 温暖, 克制' });
  const freeConstraints = el('input', { class: 'input', type: 'text', maxlength: '400',
    id: 'intake-constraints', placeholder: '可选：其它约束' });
  const fields: IntakeConstraintFields = {
    exactText: el('input', { class: 'input', type: 'text', maxlength: '400',
      id: 'intake-exact-text', placeholder: '必须逐字出现的文案' }),
    lockRatio: el('input', { type: 'checkbox', id: 'intake-lock-ratio' }),
    lockPosition: el('input', { type: 'checkbox', id: 'intake-lock-position' }),
    editScope: el('input', { class: 'input', type: 'text', maxlength: '200',
      id: 'intake-edit-scope', placeholder: '例如：仅标题与副标题' }),
    toolFormat: el('input', { class: 'input', type: 'text', maxlength: '300',
      id: 'intake-tool-format',
      placeholder: '例如：Illustrator · AI + PDF · 1080×1920 · 时长不适用' }),
  };
  const outcome = el('div', { class: 'intake-outcome' });
  const submit = el('button', { type: 'button', class: 'primary-btn', id: 'intake-submit' },
    '保存为简报');
  const status = el('p', { class: 'view-hint', role: 'status', 'aria-live': 'polite' },
    '提交即写入本机服务；这一步只固定"为什么设计"，不做制作，也不给质量结论。');

  const readback = async (): Promise<void> => {
    outcome.replaceChildren(el('p', { class: 'view-loading' }, '正在读回简报…'));
    let data;
    try {
      data = await api<BriefListResponse>(`/projects/${projectId}/briefs`);
    } catch (error) {
      outcome.replaceChildren(stateBlock({
        kind: 'error', title: '读取失败', weight: 'bad',
        producer: `GET /api/projects/{id}/briefs 被拒：${errMsg(error)}`,
        next: '刷新重读；持续失败时按给出的原因排查本机服务，而不是重复提交。',
      }));
      return;
    }
    const briefs = data.briefs;
    if (!briefs.length) {
      outcome.replaceChildren(el('p', { class: 'view-hint' },
        '本项目还没有简报。上面提交成功后这里会列出服务端返回的版本。'));
      return;
    }
    outcome.replaceChildren(
      el('p', { class: 'view-hint' }, `已读回 ${briefs.length} 份简报（版本与取代关系来自服务端）`),
      el('ul', { class: 'list' }, ...briefs.map((b) => el('li', { class: 'list-item' },
        el('div', {},
          el('strong', {}, `${b.title} · v${b.version}`),
          el('small', {}, `目标 ${b.goals.join('、') || '未列'}；`
            + `约束 ${b.constraints ?? '无'}；引用参考 ${b.reference_asset_ids.length} 个`
            + (b.superseded_by ? '；已被更新版本取代' : ' · 现行版本')))))));
  };

  submit.onclick = () => {
    submit.disabled = true;
    status.textContent = '正在提交…';
    void (async () => {
      try {
        await createBrief({
          owner: projectId,
          title: title.value,
          goals: (goals.value || '').split(',').map((g) => g.trim()).filter(Boolean),
          constraints: composeConstraints(fields, freeConstraints.value),
          references: intakeSelectedReferences(),
        });
        status.textContent = '简报已持久化；下面是服务端读回的版本。';
        await readback();
      } catch (error) {
        // 服务自己的话留在屏上：拒绝、版本冲突、权利门各有各的说法，不合并成"失败"。
        status.textContent = '';
        outcome.replaceChildren(stateBlock({
          kind: 'forbidden', title: '未写入', weight: 'bad',
          producer: `POST /api/projects/{id}/briefs 返回：${errMsg(error)}`,
          next: '按上面的原因修正后重试；相同内容重试会复用同一幂等键，不会重复建简报。',
        }));
      } finally {
        submit.disabled = false;
      }
    })();
  };

  return el('div', { class: 'intake-grid' },
    el('div', { class: 'uif-spec-block' },
      el('h3', {}, '需求与目标'),
      el('label', {}, '简报标题', title),
      el('label', {}, '目标（逗号分隔）', goals),
      el('label', {}, '其它约束', freeConstraints),
      el('p', { class: 'uif-spec-note' },
        '简报合同记录 title / goals / constraints / reference_asset_ids 四项；'
        + '下面的输入属性会编排进 constraints 文本，不是四个独立字段。'),
      el('div', { class: 'intake-hard' },
        el('label', {}, '精确文案（必须逐字出现）', fields.exactText),
        el('label', { class: 'intake-check' }, fields.lockRatio, '锁定比例'),
        el('label', { class: 'intake-check' }, fields.lockPosition, '锁定位置'),
        el('label', {}, '编辑范围', fields.editScope)),
      el('div', { class: 'uif-row' }, submit),
      status,
      el('div', { class: 'uif-row' },
        // The blanket disable here went stale the moment DL-UI-U05 landed the composer on
        // #/plan: 「不该看起来可用」 was justified by "目标生成包还没接通", which is no longer
        // true. What is still NOT wired is carrying THIS brief's fields into the package
        // (DL-FINAL-T09/T10), so the button now navigates and the note says precisely which
        // half is missing instead of hiding the whole step.
        el('button', {
          type: 'button', class: 'secondary', id: 'intake-to-plan',
          onclick: () => { window.location.hash = '#/plan'; },
        }, '到目标生成包继续'),
        el('span', { class: 'theme-toggle-note' },
          '这一步只是打开编排面：简报的标题 / 目标 / 约束留在服务端记录里，'
            + '不会自动变成目标包字段，宿主与底图要重新选。把简报内容落成包结构属 '
            + 'DL-FINAL-T09 / DL-FINAL-T10，尚未接线，所以这里不声称已经接上。'))),
    el('div', { class: 'uif-spec-block' },
      el('h3', {}, '参考素材与职责'),
      referencePickerForProject(projectId),
      el('p', { class: 'uif-spec-note' },
        '勾选的素材作为 reference_asset_ids 随简报持久化。参考职责（结构 / 风格 / 内容来源）'
        + '合同里没有独立字段，因此不假装持久化；一张风格参考不会自动成为内容来源或授权来源。'),
      el('div', { class: 'uif-row' },
        el('button', { type: 'button', class: 'secondary', disabled: '' }, '上传音频 / 视频 / 3D 参考'),
        el('span', { class: 'theme-toggle-note' },
          '禁用：本机导入路由只接受不超过 32 MiB 的 PNG/JPEG 字节，其它模态未实现。')),
      el('h3', {}, '交付目标'),
      deliveryTargetPicker(fields.toolFormat),
      el('h3', {}, '能力与知识'),
      knowledgeContextForProject(projectId),
      el('h3', {}, '已提交的简报'),
      outcome));
}

/** R2 §6 第三组：交付范围 + 工具与规格。勾选的是范围，说明的是接线状态——
 *  后者逐条指向仓库里能查到的那条路，不写"应该可以"。 */
function deliveryTargetPicker(toolFormat: HTMLInputElement): HTMLElement {
  return el('div', { class: 'intake-delivery' },
    ...DELIVERY_LEVELS.map((level) => el('div', { class: 'intake-delivery-row' },
      el('label', { class: 'intake-check' },
        el('input', { type: 'checkbox', name: 'intake-delivery-level', value: level.name }),
        el('span', {}, level.name),
        el('span', { class: 'tag neutral' }, level.wired)),
      el('p', { class: 'uif-spec-note' }, level.note))),
    el('label', {}, '工具与格式 / 尺寸 / 时长（可选）', toolFormat),
    el('p', { class: 'uif-spec-note' },
      '交付范围与规格会一并编排进 constraints 文本：简报合同没有为它们新造字段，'
      + '所以这里持久化的是一句话，不是四个独立属性。未取证的档位可以勾选成需求，'
      + '但它不会因此变成已具备的交付能力。'));
}

/** R2 §6 第四组：能力与知识。只列已经记录在本项目里的对象身份；
 *  获准知识 revision 属 ArcheAxis 边界，教学需要属 U06/U07，两者都不假装接好。 */
function knowledgeContextForProject(projectId: string): HTMLElement {
  const host = el('div', { class: 'intake-knowledge' },
    el('p', { class: 'view-loading' }, '正在读回本项目的方向、绑定与简报版本…'));
  void (async () => {
    let data: DesignLayerResponse;
    try {
      data = await api<DesignLayerResponse>(`/projects/${projectId}/design-layer`);
    } catch (error) {
      host.replaceChildren(stateBlock({
        kind: 'error', title: '能力上下文未读回', weight: 'bad',
        producer: `GET /api/projects/{id}/design-layer 返回：${errMsg(error)}`,
        next: '刷新重读；未读回时本页不会把"没有方向"画成事实。',
      }));
      return;
    }
    const layer = data.design_layer;
    const chosen = layer.chosen_direction;
    const binding = layer.active_binding;
    host.replaceChildren(
      el('div', { class: 'intake-knowledge-row' },
        el('span', { class: 'muted' }, '现行方向 revision'),
        el('span', {}, chosen ? `${chosen.title} · v${chosen.version}` : '未选定方向')),
      el('div', { class: 'intake-knowledge-row' },
        el('span', { class: 'muted' }, '绑定设计系统'),
        el('span', {}, binding
          ? `${binding.design_system_name} · 绑定 ${binding.direction_id}` : '无活动绑定')),
      el('div', { class: 'intake-knowledge-row' },
        el('span', { class: 'muted' }, '简报版本链'),
        el('span', {}, layer.briefs.length
          ? layer.briefs.map((b) => `v${b.version}`).join(' → ') : '尚无简报')),
      el('div', { class: 'intake-knowledge-row' },
        el('span', { class: 'muted' }, '获准知识 revision'),
        el('span', { class: 'tag neutral' }, '未接线'),
        el('span', { class: 'theme-toggle-note' },
          '长期知识真值归 ArcheAxis，本项目只经 rights 检查与人工批准输出候选；'
          + '这里不复制一份知识台账，也不声称已取回获准 revision。')),
      el('div', { class: 'intake-knowledge-row' },
        el('span', { class: 'muted' }, '教学需要'),
        el('button', { type: 'button', class: 'secondary', disabled: '' }, '按教学场景导入'),
        el('span', { class: 'theme-toggle-note' },
          '禁用：教学表达是场景筛选与需求导入，属 DL-UI-U06/U07，接通前不显示为可用。')));
  })();
  return host;
}

/** 项目内真实资产的可勾选清单（GET /api/projects/{id}/assets）。 */
function referencePickerForProject(projectId: string): HTMLElement {
  const host = el('div', { class: 'intake-references' },
    el('p', { class: 'view-loading' }, '正在读回本项目素材…'));
  void (async () => {
    try {
      const data = await api<AssetListResponse>(`/projects/${projectId}/assets`);
      if (!data.assets.length) {
        host.replaceChildren(el('p', { class: 'view-hint' },
          '本项目还没有已导入素材。导入后勾选，简报会引用它们。'));
        return;
      }
      host.replaceChildren(el('ul', { class: 'list' }, ...data.assets.map((asset) => el(
        'li', { class: 'list-item' },
        el('label', { class: 'intake-check' },
          el('input', { type: 'checkbox', name: 'intake-reference-asset', value: asset.id }),
          el('span', {}, `${asset.media_type} · ${asset.width}×${asset.height}`
            + ` · ${asset.id.slice(-8)} · 权利 ${asset.rights} · v${asset.version_no}`
            + '；导入与读回不等于获得素材使用权。'))))));
    } catch (error) {
      host.replaceChildren(stateBlock({
        kind: 'error', title: '素材未读回', weight: 'bad',
        producer: `GET /api/projects/{id}/assets 返回：${errMsg(error)}`,
        next: '刷新重读；未读回时本页不会把空列表画成"本项目没有素材"。',
      }));
    }
  })();
  return host;
}

/** 屏 03 · 输入与目标：项目选择由真实台账驱动，没有项目就不摆一张空表。 */
export async function renderIntake(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, viewLabel('intake'),
    async (projectId: string) => intakeForm(projectId),
    el('p', { class: 'view-hint' },
      '简单任务不必走完整项目流程：在这里描述目标、勾选参考、给出强约束，就落成一份可追踪的简报。'
      + '原始 RIR / JSON 属于高级开发者面，不让普通用户手填。'),
    '选择项目后填写；本页会写入本机服务（保存简报），不会碰宿主也不改已有版本。');
}

// ============================================================================
// DL-UI-U04 / R2 §7 — 制作记录与待继续
// ----------------------------------------------------------------------------
// 读的是既有 GET /api/projects/{id}/tasks 与 …/tasks/{job}/events，不新建第二套任务账。
// 分组沿用 `taskTriage()`，那三个状态集合由 design-lab/scripts/verify_state_vocabularies.py
// 对着 config/state-vocabularies.json 逐词核对，所以这里不出现界面自造的状态词，
// 也不把 OUTCOME_UNKNOWN 说成失败。
//
// 记录里没有的东西一律显示"无该字段"：TaskRecord 只有 kind / state / job_id /
// cancel{requested,acknowledged} / attempt{attempt_no,attempt_id,state}，
// 没有标题、没有领域、没有人类可读的进度——R2 §7 要的领域标签与"最近确认点"
// 因此分别落在"无该字段"与 events 读回上，不从 job_id 反推。
// ============================================================================

const TRIAGE_LABEL: Record<TaskTriage, string> = {
  in_flight: '进行中', needs_human: '待人工核对', failed: '未成功',
  done: '已有回执', unknown: '未知状态',
};

/** 一条任务的行。取消是两段事实：请求过 ≠ 宿主确认过。 */
function taskRecordRow(projectId: string, task: TaskRecord): HTMLElement {
  const triage = taskTriage(task.attempt.state);
  const events = el('div', { class: 'record-events', id: `record-events-${task.job_id}` },
    el('p', { class: 'view-hint' }, '最近确认点未读回：展开后才向 …/tasks/{job}/events 取，'
      + '列表本身不替每条任务发请求。'));
  const detail = el('details', { class: 'record-detail' },
    el('summary', {}, '最近确认点与尝试'), events);
  // Property form, like every other handler in this file: the vm harness drives
  // `onchange`/`onclick` directly, and `ontoggle` is the same kind of assignment.
  detail.ontoggle = (): void => {
    if (!detail.open || detail.dataset.loading === '1') return;
    detail.dataset.loading = '1';
    void loadTaskEvents(projectId, task.job_id, events);
  };
  return el('li', { class: 'list-item record-row' },
    el('div', { class: 'record-head' },
      el('strong', { class: 'mono' }, task.job_id),
      el('span', { class: 'tag ' + (triage === 'done' ? 'ok'
        : triage === 'failed' ? 'bad' : triage === 'unknown' ? 'neutral' : 'warn') },
        en(task.attempt.state)),
      el('span', { class: 'tag neutral' }, TRIAGE_LABEL[triage])),
    el('div', { class: 'record-facts' },
      el('span', { class: 'muted' }, `kind ${task.kind}`),
      el('span', { class: 'muted' }, `第 ${task.attempt.attempt_no} 次尝试 · `
        + `${task.attempt.attempt_id}`),
      el('span', { class: 'muted' }, task.cancel.requested
        ? `取消：已请求${task.cancel.acknowledged ? '且宿主已确认' : '，但宿主未确认（原生取消没有 ack 事件）'}`
        : '取消：未请求'),
      el('span', { class: 'tag neutral' }, '领域：无该字段')),
    detail,
    el('div', { class: 'uif-row' },
      // Two different actions were conflated here until 2026-10-10: one disabled
      // 「继续该任务」 justified by host side effects. Opening the composer is a hash
      // change with no host effect at all, so it is wired; only 启动 / 取消 stay disabled,
      // and they carry their own reason. A native job is one this page already has a
      // target-package surface for (`#/plan`); an image-import job does not, so no
      // continue affordance is painted on it.
      ...(task.kind.endsWith('-native')
        ? [el('button', {
            type: 'button', class: 'secondary', id: `record-continue-${task.job_id}`,
            onclick: () => { window.location.hash = '#/plan'; },
          }, '接续：打开目标生成包')]
        : []),
      el('button', { type: 'button', class: 'secondary', disabled: '' }, '启动 / 取消'),
      el('span', { class: 'theme-toggle-note' },
        task.kind.endsWith('-native')
          ? '接续只做页面跳转：同一项目重新打开编排面，宿主与底图仍由你重新选一次（这里不替你选，'
            + '也不把已排队任务读成完成）。启动 / 取消会驱动真实宿主并留下宿主侧效果，'
            + '本会话未获该授权，本机既有工作台已提供同一动作。'
          : '这条记录是素材导入，没有对应的目标生成包，所以这里不给接续入口。'
            + '启动 / 取消会驱动真实宿主并留下宿主侧效果，本会话未获该授权。')));
}

/** 单条任务的事件读回：最近一次状态迁移就是"最近确认点"。 */
async function loadTaskEvents(projectId: string, job: string, host: HTMLElement)
  : Promise<void> {
  host.replaceChildren(el('p', { class: 'view-loading' }, '正在读回该任务的事件…'));
  const data = await apiOrEmpty<EventListResponse>(
    `/projects/${projectId}/tasks/${encodeURIComponent(job)}/events`,
    { events: [], next_cursor: null });
  const unread = shapeNotice(data);
  const offline = disconnectedNotice(data);
  if (unread || offline) {
    host.replaceChildren(stateBlock({
      kind: 'unread', title: '事件未读回', weight: 'neutral',
      producer: unread || offline || '响应缺少 events 集合',
      next: '刷新重读；未读回时本页不会把"没有事件"当成"任务没有进展"。',
    }));
    return;
  }
  if (!data.events.length) {
    host.replaceChildren(el('p', { class: 'view-hint' },
      '该任务还没有事件记录：事件由服务在状态迁移时写入，空集合不等于失败。'));
    return;
  }
  const last = data.events[data.events.length - 1];
  host.replaceChildren(
    el('p', { class: 'view-hint' },
      `最近确认点：${last.to_state}${last.from_state ? ` ← ${last.from_state}` : ''}`
      + ` · 第 ${last.attempt_no} 次尝试 · ${last.at}`),
    el('ul', { class: 'record-event-list' }, ...data.events.slice(-8).map((e) => el(
      'li', {}, `${e.at} · 第 ${e.attempt_no} 次 · `
        + `${e.from_state ? `${e.from_state} → ` : ''}${e.to_state}`))),
    data.next_cursor ? el('p', { class: 'muted' },
      `还有更早的事件未取回（游标 ${data.next_cursor}）：本页只读回最近 8 条。`) : '');
}

export async function renderRecords(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, viewLabel('records'),
    async (projectId: string) => recordsBody(projectId),
    el('p', { class: 'view-hint' },
      '这里列出服务里真实存在的作业：状态词、尝试次数与取消标记都来自读回，不是界面推断。'
      + '没有任务的项目会如实显示空列表，不会画出示例记录。'));
}

/** DL-UI-U06 · 运行与恢复现场。只读投影：这里没有任何按钮会启动宿主，也没有一个判定词。
 *  三种"没有"必须分开画：未读回（没问到）、表不存在（这台服务从未记录过原生作业）、
 *  表存在且为空（问过了，答案是零）。把它们混成"0"就是本仓库已经栽过两次的那类错。 */
function runtimeObservation(data: NativeRuntimeResponse,
  unread: string | null): HTMLElement {
  const word = (section: NativeRuntimeSection, present: string, absent: string): string =>
    section.table === 'NOT_READ' || unread
      ? '未读回：没有问到，因此既不是占用也不是空闲'
      : section.table === 'ABSENT'
        ? absent
        : present;
  const held = (data.host_guard.rows ?? [])
    .map((row) => `${String(row.host)}→${String(row.attempt_id)}`).join('、');
  const guardPresent = data.counts.hosts_held === 0
    ? '表存在且为空：当前没有尝试持有宿主'
    : `当前 ${String(data.counts.hosts_held)} 个宿主被持有：${held}`;
  const quiescencePresent = `已记录 ${String((data.quiescence.rows ?? []).length)} 条，`
    + `其中带回执 ${String(data.counts.attempts_quiescent_receipted ?? 0)} 条`;
  const reconciliationPresent = `开着 ${String(data.counts.reconciliations_open ?? 0)} 条。`
    + '一条对账行只说明有人开了对账，不说明它查到了什么或修好了什么。';
  const recoveryPresent = (data.recovery_protocol.rows ?? [])
    .map((row) => `${String(row.attempt_id)}：${String(row.protocol)}`).join('、')
    || '表存在但没有行';
  const executionPresent = `读回 ${String((data.executions.rows ?? []).length)} 条，`
    + `其中带回执 ${String(data.counts.executions_receipted ?? 0)} 条、有结果 `
    + `${String(data.counts.executions_with_result ?? 0)} 条。`
    + '请求与结果正文不在这条投影里。';
  const rows: HTMLElement[] = [
    el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '宿主占用（native_host_guard_v1）'),
      el('small', {}, word(data.host_guard, guardPresent,
        '该状态库里没有这张表：这台服务从未记录过原生作业。')))),
    el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '静默确认（native_quiescence_v1）'),
      el('small', {}, word(data.quiescence, quiescencePresent,
        '没有这张表：从未记录过静默确认。')))),
    el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '对账（native_reconciliation_v1）'),
      el('small', {}, word(data.reconciliation, reconciliationPresent,
        '没有这张表：从未开过对账。')))),
    el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '恢复协议（native_recovery_protocol_v2）'),
      el('small', {}, word(data.recovery_protocol, recoveryPresent, '没有这张表。')))),
    el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '执行记录与回执（native_execution_v1，仅本项目）'),
      el('small', {}, word(data.executions, executionPresent, '没有这张表。')))),
    el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '占用预算'),
      el('span', { class: 'tag neutral' }, '无该字段'),
      el('small', {}, ` ${data.budget_reason}`))),
  ];
  for (const sentence of data.does_not_say) {
    rows.push(el('li', { class: 'list-item' }, el('div', {},
      el('strong', {}, '这条投影不说的内容'),
      el('small', {}, sentence))));
  }
  return el('div', { class: 'panel' },
    el('h3', {}, '运行与恢复现场'),
    el('p', { class: 'view-hint' },
      '读的是 GET /api/projects/{id}/native-runtime —— 只读投影，不启动宿主、不排队、不取消；'
        + '启动 / 取消仍是真实宿主副作用，本会话未获授权，所以这里不提供可点的动作。'),
    el('ul', { class: 'list' }, ...rows));
}

async function recordsBody(projectId: string): Promise<HTMLElement> {
  const [data, runtime] = await Promise.all([
    apiOrEmpty<TaskListResponse>(`/projects/${projectId}/tasks`, OFFLINE.tasks),
    apiOrEmpty<NativeRuntimeResponse>(`/projects/${projectId}/native-runtime`,
      OFFLINE.nativeRuntime),
  ]);
  // The seam gate requires one shape notice per read: a payload that arrived without
  // `counts` must be reported as unread instead of letting the panel print `undefined`
  // where a count belongs.
  const runtimeUnread = shapeNotice(runtime) || disconnectedNotice(runtime);
  const wrap = el('div', {});
  const unread = shapeNotice(data);
  const offline = disconnectedNotice(data);
  const tasks = data.tasks;
  const counts = tasks.reduce<Record<string, number>>((acc, t) => {
    const key = taskTriage(t.attempt.state);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  wrap.replaceChildren(
    el('div', { class: 'panel' },
      el('h3', {}, `制作记录（${tasks.length}）`),
      el('p', { class: 'view-hint' },
        unread ? `${unread}，因此这里的条数不能当作该项目的作业总数`
          : offline ? `${offline}，作业台账未读回`
            : tasks.length
              ? `按服务状态词分组：${Object.entries(counts)
                .map(([k, v]) => `${TRIAGE_LABEL[k as TaskTriage]} ${v}`).join(' · ')}。`
                + '游标分页未展开：next_cursor 存在时本页会说明还有更多。'
              : '该项目当前没有作业记录。空列表是读回结果，不是失败，也不代表从未运行过。'),
      data.next_cursor ? el('p', { class: 'muted', id: 'records-more' },
        `还有更多：服务给了下一页游标 ${data.next_cursor}；本视图不自动续读，`
        + '避免把未取回的条目算进分组计数。') : '',
      tasks.length
        ? el('ul', { class: 'list' }, ...tasks.map((t) => taskRecordRow(projectId, t)))
        : el('p', { class: 'record-empty-note' },
          'R2 §7 的三条示例记录属于原型，不在这里出现：出现在读回面里的每一行都必须'
            + '对应一条真实作业。')),
    el('div', { class: 'panel' },
      el('h3', {}, '这个入口现在能说什么、不能说什么'),
      el('ul', { class: 'list' },
        el('li', { class: 'list-item' }, el('span', {}, '状态词'),
          el('span', { class: 'tag info' }, '来自服务'),
          el('small', {}, ' attempt.state 逐词对照 config/state-vocabularies.json，'
            + 'OUTCOME_UNKNOWN 显示为"未知状态/待人工核对"，不并入失败。')),
        el('li', { class: 'list-item' }, el('span', {}, '领域标签'),
          el('span', { class: 'tag neutral' }, '无该字段'),
          el('small', {}, ' TaskRecord 不带领域；补它属 DL-FINAL-T06 的分类工作，'
            + '不由界面按 kind 猜测。')),
        el('li', { class: 'list-item' }, el('span', {}, '接续到目标生成包'),
          el('span', { class: 'tag ok' }, '已接线'),
          el('small', {}, ' 只做地址跳转：不发出请求、不启动宿主，宿主与底图到那一页重选。'
            + '简报字段不会自动变成包结构（属 DL-FINAL-T09/T10）。')),
        el('li', { class: 'list-item' }, el('span', {}, '启动 / 取消'),
          el('span', { class: 'tag warn' }, '未接线'),
          el('small', {}, ' 是真实宿主副作用，本会话无该授权；'
            + '按钮禁用并说明原因，不画成可点。'))),
    // DL-UI-U06: the observation half of run/observe/recover, over the tables the existing
    // action routes already write. It reads a second route, so the panel appears beside the
    // ledger rather than restating it.
    runtimeObservation(runtime, runtimeUnread)));
  // R2 §3 的底部任务条：只在本页真的读到进行中/待核对作业时出现。跨路由常驻的全局任务条
  // 需要"当前任务"这个应用级概念，服务没有暴露它，所以这里不画一个凭空的常驻条。
  const dock = activityDock(tasks);
  if (dock) wrap.append(dock);
  return wrap;
}

/** R2 §7 页面底部任务条：只在真的存在进行中/待核对作业时出现。 */
export function activityDock(tasks: readonly TaskRecord[]): HTMLElement | null {
  const live = tasks.filter((t) => {
    const k = taskTriage(t.attempt.state);
    return k === 'in_flight' || k === 'needs_human';
  });
  if (!live.length) return null;
  return el('div', { class: 'activity-dock', id: 'activity-dock', role: 'status',
    'aria-label': '当前制作任务' },
    el('span', {}, `${live.length} 条作业仍在进行或待人工核对`),
    el('button', { type: 'button', class: 'secondary',
      onclick: () => { window.location.hash = '#/records'; } }, '回到制作记录'));
}

// ============================================================================
// DL-UI-U05 (2026-10-09) — 屏 05 目标生成包
// ----------------------------------------------------------------------------
// 合同：POST /api/projects/{id}/native-plans，字段 {host, rir, text_styles,
// idempotency_key}，返回 202 且**只排队**，不启动宿主；启动仍是任务面上的显式动作。
// 这一页存在的理由就是 U05 的验收句"普通用户无需手写 RIR"：界面把已经记录在服务的
// 对象（现行方向、其简报、绑定的设计系统、本项目已导入的真实资产）编排成一份可审阅的
// 目标生成包，人看的是编排结果而不是 JSON。
//
// 不臆造原则：RIR 的每个字段都指向一条真实记录或用户在页面上的明确选择；
// `inferred:false` 是因为这个节点来自用户勾选，不是检测器推断。
// 分析派生的结构节点（plan_to_rir 那条桥）目前**没有生产调用方**（design-lab/tests 在调，
// 服务与本页都不调），本页不假装它接上，
// 也不把检测推断的节点画进来。
// ============================================================================

interface RirNode {
  id: string;
  type: string;
  name: string;
  opacity: number;
  bounds: { x: number; y: number; width: number; height: number };
  inferred: boolean;
  zOrder: number;
  visible: boolean;
  locked: boolean;
  blendMode: string;
  raster?: { path: string; crop: Record<string, number>; alpha: number; sourceMappings: unknown[] };
}

/** 由已记录对象编排一份 raster-only 目标包；字段形状取自
 *  design-lab/schemas/reconstruction/reconstruction-ir.schema.json 的必填集。 */
export function composeTargetPlan(asset: AssetRecord, host: string): {
  rir: { schemaVersion: string; canvas: Record<string, unknown>; layers: RirNode[] };
  textStyles: Record<string, unknown>;
} {
  const node: RirNode = {
    id: 'reference-raster',
    type: 'raster',
    name: `${asset.id.slice(-8)} · ${asset.media_type}`,
    opacity: 1,
    bounds: { x: 0, y: 0, width: asset.width, height: asset.height },
    inferred: false,
    zOrder: 0,
    visible: true,
    locked: host === 'illustrator',
    blendMode: 'normal',
    raster: {
      // 导入路由登记的就是这个完整 img-ID；raster.path 必须是它，不是本地路径。
      path: asset.id,
      crop: { x: 0, y: 0, width: asset.width, height: asset.height },
      alpha: 1,
      sourceMappings: [],
    },
  };
  return {
    rir: {
      schemaVersion: 'design-lab/reconstruction-ir/v1',
      canvas: { width: asset.width, height: asset.height, colorSpace: 'srgb' },
      layers: [node],
    },
    textStyles: {},
  };
}

/** A native-plan refusal, in the refusal's own words.
 *
 * DL-UI-U05 lists error / forbidden / conflict / timeout as separate states, and
 * `native_submissions.py` really does answer with five different codes at three different
 * statuses (400 INVALID_NATIVE_PLAN, 400 INVALID_NATIVE_KEY, 413 NATIVE_PLAN_TOO_LARGE,
 * 409 NATIVE_SUBMISSION_BUSY, 409 NATIVE_PLAN_IDEMPOTENCY_CONFLICT). Collapsing them into
 * one "未受理" card told the reader nothing about what to do next: a busy write is retried,
 * an idempotency conflict must NOT be retried with the same key, and an oversized plan needs
 * the asset, not the button. The code itself is quoted because it is the handle an operator
 * takes back to the CLI.
 */
function planRefusal(error: unknown): StateSpec {
  const envelope = (error as Error & { serviceEnvelope?: Record<string, unknown> })
    .serviceEnvelope;
  const code = typeof envelope?.['error'] === 'string' ? envelope['error'] : '';
  if (code === 'NATIVE_PLAN_IDEMPOTENCY_CONFLICT')
    return {
      // 409 is a CONFLICT, not a permission verdict: STATE_SPECS has a `conflict` kind for
      // exactly this, and `forbidden` (「无权进行」) would tell the operator to ask for access
      // when the real action is "do not reuse this key". The busy 409 below keeps `unknown`
      // because there the service decided nothing at all.
      kind: 'conflict', title: '冲突：这个幂等键已经登记过别的内容', weight: 'bad',
      producer: 'POST /api/projects/{id}/native-plans 返回 NATIVE_PLAN_IDEMPOTENCY_CONFLICT'
        + '（409）：同一把键下已有的目标包与本次提交的内容摘要不一致。',
      next: '不要换内容后复用同一个键重试——那正是这条冲突要拦的事。要么把本次改动当成新的'
        + '一次排队（新键），要么放弃这次改动。服务端没有写入任何东西。',
    };
  if (code === 'NATIVE_SUBMISSION_BUSY')
    return {
      kind: 'unknown', title: '未排队：本机服务正忙', weight: 'neutral',
      producer: 'POST /api/projects/{id}/native-plans 返回 NATIVE_SUBMISSION_BUSY（409）：'
        + '同一项目的上一次受理还没落账。',
      next: '这是可以重试的一次：等内容不同的排队会换键，重试同内容会沿用同一幂等键而不会'
        + '产生第二份目标包。排队本身仍不等于宿主已启动。',
    };
  if (code === 'NATIVE_PLAN_TOO_LARGE')
    return {
      kind: 'error', title: '目标包超过受理上限', weight: 'bad',
      producer: 'POST /api/projects/{id}/native-plans 返回 NATIVE_PLAN_TOO_LARGE（413）：'
        + '正文超过服务端 4,000,000 字节的硬上限。',
      next: '超限的是编排出来的目标包本身，不是网络。换一张更小的底图或减少节点；'
        + '界面不会截断内容来凑进上限。',
    };
  if (code === 'INVALID_NATIVE_KEY')
    return {
      kind: 'error', title: '幂等键不合法', weight: 'bad',
      producer: 'POST /api/projects/{id}/native-plans 返回 INVALID_NATIVE_KEY（400）：'
        + '键的形状不符合服务端要求。',
      next: '本页的键由 uuid() 生成，出现这条说明是界面自己发错了，不是用户填错；'
        + '按代码排查生成处，不要让用户重填。',
    };
  if (code === 'INVALID_NATIVE_PLAN')
    return {
      kind: 'error', title: '目标包不符合合同', weight: 'bad',
      producer: 'POST /api/projects/{id}/native-plans 返回 INVALID_NATIVE_PLAN（400）：'
        + '编排出的 RIR 或宿主字段没有通过合同校验。',
      next: '本页不替用户猜一个能过校验的值。核对宿主与底图是否仍在本项目的读回里；'
        + '若两者都在，这是编排缺陷，按代码报修。',
    };
  if (!envelope)
    return {
      kind: 'error', title: '请求没有到达服务端', weight: 'bad',
      producer: `POST /api/projects/{id}/native-plans 没有拿到服务回复：${errMsg(error)}。`
        + '没有回复不等于没有受理——本机可能已经写入，只是这条连接没等到答案。',
      next: '先回「制作记录与待继续」看这次排队是否已经落账，再决定是否重试；'
        + '直接重试同内容是安全的（同键），但不要在没核对前改内容重发。',
    };
  return {
    kind: 'forbidden', title: '未受理', weight: 'bad',
    producer: `POST /api/projects/{id}/native-plans 返回：${code || errMsg(error)}`,
    next: '按上面的原因修正目标包后重试；界面不会替你猜一个能通过校验的字段值。',
  };
}

function planComposer(projectId: string): HTMLElement {
  const hostSelect = el('select', { class: 'input', 'aria-label': '目标宿主' },
    el('option', { value: 'illustrator' }, 'Illustrator / AI'),
    el('option', { value: 'photoshop' }, 'Photoshop / PSD'));
  const assetSelect = el('select', { class: 'input', 'aria-label': '参考底图资产' },
    el('option', { value: '' }, '选择本项目已导入的资产'));
  const layerHost = el('div', { class: 'plan-layer' });
  const preview = el('pre', { class: 'mono plan-preview' }, '（选择资产后显示编排结果）');
  const outcome = el('div', { class: 'plan-outcome' });
  const status = el('p', { class: 'view-hint', role: 'status', 'aria-live': 'polite' },
    '提交只把目标生成包排队，不启动宿主，也不修改任何已交付版本。');
  let assets: AssetRecord[] = [];

  const recompute = (): void => {
    const asset = assets.find((a) => a.id === assetSelect.value);
    if (!asset) {
      preview.textContent = '（还没有选择资产：没有真实底图就不编排，不给空画布填假尺寸）';
      layerHost.replaceChildren();
      return;
    }
    const composed = composeTargetPlan(asset, hostSelect.value);
    preview.textContent = JSON.stringify(composed.rir, null, 2);
    layerHost.replaceChildren(el('ul', { class: 'list' },
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '底图 · 用户勾选，非推断'),
          el('small', {}, `${asset.id} · ${asset.media_type} · ${asset.width}×${asset.height}`
            + ` · 权利 ${asset.rights} · v${asset.version_no}`))),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '画布'),
          el('small', {}, `${String(composed.rir.canvas.width)}×${String(composed.rir.canvas.height)}`
            + ' · srgb（取自底图真实尺寸，不是页面臆造）'))),
      el('li', { class: 'list-item' },
        el('div', {}, el('strong', {}, '结构 / 文字 / 路径节点'),
          el('small', {}, '本批不编排：分析派生的 plan_to_rir 桥没有生产调用方'
            + '（仓库里只有 design-lab/tests 在调，服务与本页都不调），'
            + '画进去就是假结构。文字与路径节点属 U05 剩余项与 DL-FINAL-T10。')))));
  };
  hostSelect.onchange = recompute;
  assetSelect.onchange = recompute;

  const submit = el('button', { type: 'button', class: 'primary-btn', id: 'plan-submit' },
    '排队这份目标生成包');
  submit.onclick = () => {
    const asset = assets.find((a) => a.id === assetSelect.value);
    if (!asset) {
      status.textContent = '没有底图资产就不提交：本机服务要求 raster.path 指向已导入的完整 img-ID。';
      return;
    }
    submit.disabled = true;
    status.textContent = '正在提交…';
    void (async () => {
      const composed = composeTargetPlan(asset, hostSelect.value);
      try {
        const data = await api<{ task_id?: string; job_id?: string; state?: string }>(
          `/projects/${projectId}/native-plans`,
          {
            host: hostSelect.value,
            rir: composed.rir,
            text_styles: composed.textStyles,
            idempotency_key: uuid(),
          });
        const id = data.task_id ?? data.job_id ?? '未给出任务号';
        status.textContent = '';
        outcome.replaceChildren(el('p', { class: 'view-hint' },
          `已排队：${String(id)} · 状态 ${data.state ?? '未读回'}`),
        el('p', { class: 'view-hint' },
          '排队不等于完成：启动宿主与读回产物在任务面上是另一步，需要显式动作。'));
      } catch (error) {
        status.textContent = '';
        outcome.replaceChildren(stateBlock(planRefusal(error)));
      } finally {
        submit.disabled = false;
      }
    })();
  };

  void (async () => {
    try {
      const data = await api<AssetListResponse>(`/projects/${projectId}/assets`);
      assets = data.assets;
      assetSelect.replaceChildren(el('option', { value: '' }, '选择本项目已导入的资产'),
        ...assets.map((a) => el('option', { value: a.id },
          `${a.id.slice(-8)} · ${a.media_type} · ${a.width}×${a.height}`)));
      if (!assets.length) {
        assetSelect.setAttribute('disabled', '');
        status.textContent = '本项目还没有已导入资产；先在「输入与目标」导入 PNG/JPEG，'
          + '没有底图就不编排。';
      }
    } catch (error) {
      assetSelect.replaceChildren(el('option', { value: '' }, '素材未读回'));
      outcome.replaceChildren(stateBlock({
        kind: 'error', title: '素材未读回', weight: 'bad',
        producer: `GET /api/projects/{id}/assets 返回：${errMsg(error)}`,
        next: '刷新重读；读不到资产时本页不会编排任何节点。',
      }));
    }
  })();

  return el('div', { class: 'intake-grid' },
    el('div', { class: 'uif-spec-block' },
      el('h3', {}, '目标包组成（来自已记录对象）'),
      el('label', {}, '目标宿主', hostSelect),
      el('label', {}, '底图资产', assetSelect),
      el('div', {}, layerHost),
      el('p', { class: 'uif-spec-note' },
        '编排规则只有一条：每个字段指向一条真实记录或你在本页的明确选择。'
        + '权利位随资产一起显示，导入与读回不等于获得使用权。')),
    el('div', { class: 'uif-spec-block' },
      el('h3', {}, '提交与受理结果'),
      el('div', { class: 'uif-row' }, submit),
      status,
      outcome,
      // U05 的验收写的是"普通用户无需JSON"，所以 RIR 不是这一屏的主面板：它是给要核对
      // 字节的人用的次级查看面，默认收起。内容仍然来自同一次编排，不是第二份台账。
      el('details', { class: 'plan-rir' },
        el('summary', {}, '查看将提交的 RIR（JSON，供核对）'),
        preview)));
}

/** 屏 05 · 目标生成包。 */
export async function renderPlan(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, viewLabel('plan'),
    async (projectId: string) => planComposer(projectId),
    el('p', { class: 'view-hint' },
      '这一页替普通用户写 RIR：选择宿主与底图后，界面给出将要提交的完整目标包，'
      + '你审阅的是编排结果而不是 JSON。'),
    '本页会向本机服务提交一个排队任务；不启动宿主，不改动已交付版本。');
}

// ============================================================================
// DL-UI-U04 (2026-10-09) — 屏 04 分析与方案
// ----------------------------------------------------------------------------
// 这一面把"已经知道的"和"还没有来源的"分开写：
//   * 现行方向、它所依据的简报、绑定的设计系统与 spec 摘要 —— 全部来自
//     GET /api/projects/{id}/design-layer 的真实字段；
//   * 方法 / 偏好 = 方向自己的 color_mood / typography_mood / style_notes；
//   * 软件限制 = CAPABILITY_REGISTRY 里宿主那条自我描述（BLOCKED 就是 BLOCKED）；
//   * 已识别结构与推断 = 本批**没有**可信来源：analysis/plan_to_rir 这座桥在仓库里
//     没有生产调用方（design-lab/tests 在调），所以这里不画任何推断节点，只写清缺什么、下一步是什么；
//   * 本次纠正 = 走 design.ts reviseDirection()（与遗留表单同一规则），
//     修订追加新版本，不改写旧版本字节。
// ============================================================================

function analysisPanel(projectId: string): HTMLElement {
  const layerHost = el('div', { class: 'analysis-layer' });
  const correctionHost = el('div', { class: 'analysis-correction' });

  const title = el('input', { class: 'input', type: 'text', maxlength: '120',
    id: 'analysis-revision-title', placeholder: '修订后的方向标题' });
  const notes = el('input', { class: 'input', type: 'text', maxlength: '600',
    id: 'analysis-revision-notes', placeholder: '表现备注（逗号分隔，可选）' });
  const colorMood = el('input', { class: 'input', type: 'text', maxlength: '120',
    id: 'analysis-revision-color', placeholder: '色彩倾向（可选）' });
  const typeMood = el('input', { class: 'input', type: 'text', maxlength: '120',
    id: 'analysis-revision-type', placeholder: '字体倾向（可选）' });
  const target = el('select', { class: 'input', 'aria-label': '要修订的方向版本' },
    el('option', { value: '' }, '选择要修订的方向版本'));
  const status = el('p', { class: 'view-hint', role: 'status', 'aria-live': 'polite' },
    '修订会追加一个新版本；被取代的旧版本只保留为历史，字节不被改写。');
  const submit = el('button', { type: 'button', class: 'primary-btn', id: 'analysis-revise' },
    '保存为方向新版本');

  const load = async (): Promise<void> => {
    layerHost.replaceChildren(el('p', { class: 'view-loading' }, '正在读回设计层…'));
    const data = await apiOrEmpty<DesignLayerResponse>(`/projects/${projectId}/design-layer`,
      OFFLINE.designLayer);
    const layer = data.design_layer;
    const chosen = layer.chosen_direction;
    const brief = chosen
      ? layer.briefs.find((b) => b.brief_id === chosen.brief_id) ?? null : null;
    const binding = layer.active_binding;

    target.replaceChildren(el('option', { value: '' }, '选择要修订的方向版本'),
      ...layer.directions.map((d) => el('option', { value: d.direction_id },
        `${d.title} · v${d.version}${d.superseded_by ? '（已被取代）' : ' · 现行'}`)));

    const rows: HTMLElement[] = [
      el('li', { class: 'list-item' }, el('div', {},
        el('strong', {}, '现行方向'),
        el('small', {}, chosen
          ? `${chosen.title} · v${chosen.version} · 由 ${chosen.actor ?? '未记录操作者'} 选定`
          : '尚无现行方向：选择方向是人工判定，界面不替你选。'))),
      el('li', { class: 'list-item' }, el('div', {},
        el('strong', {}, '方法 / 偏好（方向自己的字段）'),
        el('small', {}, chosen
          ? `色彩 ${chosen.color_mood ?? '未声明'} · 字体 ${chosen.typography_mood ?? '未声明'}`
            + ` · 表现备注 ${(chosen.style_notes ?? []).join('、') || '未声明'}`
          : '无方向即无方法记录。'))),
      el('li', { class: 'list-item' }, el('div', {},
        el('strong', {}, '来源与知识引用'),
        el('small', {}, brief
          ? `简报《${brief.title}》v${brief.version} · 目标 ${brief.goals.join('、')}`
            + ` · 约束 ${brief.constraints ?? '无'} · 引用参考 ${brief.reference_asset_ids.length} 个`
            + ` · spec ${brief.spec_sha256.slice(0, 12)}…`
          : '未读回：没有现行方向就没有可引用的简报版本。'))),
      el('li', { class: 'list-item' }, el('div', {},
        el('strong', {}, '设计系统契约'),
        el('small', {}, binding
          ? `${binding.design_system_name} · v${binding.version} · spec `
            + `${binding.spec_sha256.slice(0, 12)}… · 绑定于方向 `
            + `${binding.direction_id.slice(-8)}`
            + (binding.superseded_by ? '（该绑定已被更新版本取代）' : ' · 现行')
          : '未绑定：绑定决定后续制作使用的契约，缺失时不假装沿用。'))),
    ];
    layerHost.replaceChildren(
      el('ul', { class: 'list' }, ...rows),
      el('div', { class: 'analysis-gaps' },
        stateBlock({
          kind: 'unknown', title: '已识别结构与推断', weight: 'neutral',
          producer: '本面没有可信来源可列：analysis/plan_to_rir 这座把平面分解 Plan 转成 '
            + 'RIR 节点的桥没有生产调用方（仓库里只有 design-lab/tests 在调），'
            + '检测得到的推断内容因此无处读回。',
          next: '要么把该桥接进一条真实分析路由并按 E2 验收，要么维持"结构节点由人在目标生成包里'
            + '逐项给出"；在接通之前，本页不画任何推断节点，也不把空白读成"没有结构"。',
        }),
        capabilityCardHost('research-insights')),
      ...shapeNoticeRows(data));

    correctionHost.replaceChildren(
      el('label', {}, '要修订的方向版本', target),
      el('label', {}, '修订后的标题', title),
      el('label', {}, '表现备注', notes),
      el('div', { class: 'uif-row' },
        el('label', { class: 'capability-filter' }, '色彩倾向', colorMood),
        el('label', { class: 'capability-filter' }, '字体倾向', typeMood)),
      el('div', { class: 'uif-row' }, submit),
      status);

    submit.onclick = () => {
      if (!target.value) {
        status.textContent = '未选择方向版本：修订必须指明改的是哪一版，界面不替你挑。';
        return;
      }
      submit.disabled = true;
      status.textContent = '正在提交修订…';
      void (async () => {
        try {
          const data = await reviseDirection({
            owner: projectId,
            directionId: target.value,
            title: title.value,
            notes: (notes.value || '').split(',').map((n) => n.trim()).filter(Boolean),
            colorMood: colorMood.value.trim() || null,
            typeMood: typeMood.value.trim() || null,
          });
          status.textContent = `已保存为版本 ${data.direction.version}；`
            + '旧版本只保留为历史。'
            + (data.direction.chosen
              ? '选定结论随新版本带走，但设计系统绑定未跟随，需要在最新版本上重新绑定。'
              : '该方向未被选定，不涉及绑定。');
          await load();
        } catch (error) {
          status.textContent = '';
          layerHost.append(stateBlock({
            kind: 'conflict', title: '修订未确认', weight: 'bad',
            producer: `POST /api/projects/{id}/directions/{dir}/revisions 返回：${revisionHint(error)}`,
            next: '若是 STALE_REVISION，请在现行版本上重做这次修订；旧版本字节不会被改写。',
          }));
        } finally {
          submit.disabled = false;
        }
      })();
    };
  };

  void load();
  return el('div', { class: 'intake-grid' },
    el('div', { class: 'uif-spec-block' },
      el('h3', {}, '判断依据（读回，不重述）'), layerHost),
    el('div', { class: 'uif-spec-block' },
      el('h3', {}, '本次纠正'), correctionHost));
}

/** 软件限制一条直接复用能力契约登记表里宿主那条自我描述，不抄第二份状态词。 */
function capabilityCardHost(capabilityId: string): HTMLElement {
  const row = CAPABILITY_REGISTRY.find((c) => c.capabilityId === capabilityId);
  return row ? capabilityCard(row)
    : el('p', { class: 'view-hint' }, `（能力登记表无 ${capabilityId} 这一条）`);
}

/** 屏 04 · 分析与方案。 */
export async function renderAnalysis(target: HTMLElement): Promise<void> {
  await projectPickerPanel(target, viewLabel('analysis'),
    async (projectId: string) => analysisPanel(projectId),
    el('p', { class: 'view-hint' },
      '检查设计判断并就地纠正：这一面把方向、简报、绑定与缺口分开列出，'
      + '推断内容必须标为推断，没有来源的部分直说没有来源。'),
    '本页的修订会写入本机服务并追加新版本；不启动宿主，也不改已交付版本。');
}
