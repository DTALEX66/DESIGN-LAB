// SPDX-License-Identifier: MIT
// Workbench API contracts — strict TypeScript types for DESIGN-LAB service
// responses (taskpack 26: API responses must not be `any`; cross-language
// enum vocabularies come from generated types / JSON Schema, never hand-copied).
//
// Type-only surface: everything here erases at runtime (tsc noEmit / esbuild /
// Node type stripping), so the served browser script keeps zero runtime imports.

export interface TaskAttempt {
  attempt_no: number;
  attempt_id: string;
  state: string;
}

export interface TaskCancel {
  requested: boolean;
  acknowledged: boolean;
}

export interface TaskRecord {
  kind: string;
  state: string;
  job_id: string;
  // The service emits both flags for every attempt, so a receipted task can be told apart
  // from one whose cancellation the operator asked for and the host never acknowledged.
  cancel: TaskCancel;
  attempt: TaskAttempt;
}

export interface EventRecord {
  at: string;
  attempt_no: number;
  from_state?: string;
  to_state: string;
}

export interface AssetRecord {
  id: string;
  kind: string;
  version_no: number;
  version_id: string;
  media_type: string;
  width: number;
  height: number;
  rights: string;
  sha256: string;
}

export interface NativeAssetRecord {
  id: string;
  kind: string;
  version_no: number;
  version_id: string;
  byte_size: number;
  sha256: string;
  rights: string;
  verification: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
}

export interface ProjectListResponse {
  projects: ProjectRecord[];
}

export interface TaskListResponse {
  tasks: TaskRecord[];
  next_cursor: string | null;
}

export interface EventListResponse {
  events: EventRecord[];
  next_cursor: string | null;
}

export interface AssetListResponse {
  assets: AssetRecord[];
}

export interface NativeAssetListResponse {
  assets: NativeAssetRecord[];
  next_cursor: string | null;
}

export interface AssetContentResponse {
  asset: AssetRecord;
  content_base64: string;
}

export interface NativeAssetVerifyResponse {
  asset: NativeAssetRecord;
}

export interface ProjectCreateResponse {
  project: ProjectRecord;
}

export interface TaskDispatchResponse {
  worker: string;
}

export interface TaskActionResponse {
  task: TaskRecord;
}

export interface BundleDownloadResponse {
  bundle: { sha256: string; byte_size: number };
  download_path: string;
}

// Project delivery read-back: GET /api/projects/<id>/bundles lists the
// project's design bundles (its deliveries), read from the persisted store.
// `kind` is the API response label 'design-bundle' -- NOT the stored column
// value ('other'), which is the measured predicate the query filters on.
export interface BundleRecord {
  id: string;
  kind: string;
  version_id: string;
  version_no: number;
  byte_size: number;
  sha256: string;
  rights: string;
  verification: string;
}

export interface BundleListResponse {
  bundles: BundleRecord[];
}

export interface NativePlanResponse {
  task: TaskRecord;
}

export interface PatchResponse {
  task: TaskRecord;
  parent: { version_id: string };
}

// --- E-SLICE-01 design layer: Brief -> Reference -> Direction -> DesignSystem ---
export interface DesignBrief {
  brief_id: string;
  title: string;
  goals: string[];
  constraints: string | null;
  reference_asset_ids: string[];
  spec_sha256: string;
  version: number;
  superseded_by: string | null;
  created_at: string;
}

export interface DesignDirection {
  direction_id: string;
  brief_id: string;
  title: string;
  style_notes: string[] | null;
  color_mood: string | null;
  typography_mood: string | null;
  chosen: boolean;
  actor: string | null;
  actor_kind: string | null;
  spec_sha256: string;
  version: number;
  superseded_by: string | null;
  created_at: string;
}

export interface DesignSystemBinding {
  binding_id: string;
  direction_id: string;
  design_system_name: string;
  spec_sha256: string;
  version: number;
  superseded_by: string | null;
  created_at: string;
}

export interface DesignSystemRecord {
  name: string;
  title: string;
  version: string;
  evidence_level: string;
}

export interface BriefListResponse {
  briefs: DesignBrief[];
  next_cursor: string | null;
}

export interface DirectionListResponse {
  directions: DesignDirection[];
  next_cursor: string | null;
}

export interface BriefGetResponse {
  brief: DesignBrief;
}

export interface DirectionGetResponse {
  direction: DesignDirection;
}

export interface DesignSystemListResponse {
  design_systems: DesignSystemRecord[];
}

export interface DesignLayerReadback {
  briefs: DesignBrief[];
  directions: DesignDirection[];
  chosen_direction: DesignDirection | null;
  bindings: DesignSystemBinding[];
  active_binding: DesignSystemBinding | null;
  design_systems: DesignSystemRecord[];
}

export interface DesignLayerResponse {
  design_layer: DesignLayerReadback;
}

// --- F-2b revision flow: append a new version, read the chain back ---------
export interface BriefRevisionResponse {
  brief: DesignBrief;
}

export interface DirectionRevisionResponse {
  direction: DesignDirection;
}

export interface BriefLineage {
  brief_id: string;
  root_id: string;
  requested_id: string;
  live_id: string | null;
  versions: DesignBrief[];
}

export interface DirectionLineage {
  direction_id: string;
  root_id: string;
  requested_id: string;
  live_id: string | null;
  versions: DesignDirection[];
}

export interface BriefLineageResponse {
  lineage: BriefLineage;
}

export interface DirectionLineageResponse {
  lineage: DirectionLineage;
}

// --- design-system TOKEN documents (W06 token write chain) -----------------
// The record the service persists and reads back. `document` is the DTCG token
// document exactly as written; the CSS custom-property map is a projection and is
// never stored, so it has no field here.
export interface TokenDocumentRecord {
  token_document_id: string;
  project_id: string;
  design_system_name: string;
  document: Record<string, unknown>;
  token_count: number;
  dtcg_schema_version: string;
  spec_sha256: string;
  actor: string | null;
  actor_kind: string | null;
  version: number;
  superseded_by: string | null;
  created_at: string;
}

export interface TokenDocumentListResponse {
  token_documents: TokenDocumentRecord[];
}

export interface TokenDocumentGetResponse {
  token_document: TokenDocumentRecord;
}

// A refusal that carries field paths: TOKEN_DOCUMENT_INVALID arrives with the
// DTCG schema/semantic reasons, which is the only form a reviewer can fix.
export interface TokenWriteError {
  error: string;
  detail?: string[];
}

// --- UI convergence slice 2: service diagnostics read back by AppShell views ---
export interface HealthResponse {
  status: string;
  version: string;
  scope: string;
}

export interface EnvironmentResponse {
  schemaVersion: string;
  status: string;
  project_root: string;
  project_local_root: string;
  sources: Record<string, string>;
  roots: Record<string, { path: string; ownership: string; writable: boolean }>;
  shared_inputs: Record<string, { path: string; writable: boolean; status: string }>;
  agent_profile: { status: string; writable: boolean };
  write_trace: string;
  migration: string;
}

export interface TaskPreflightResource {
  ref: string;
  kind: string;
  state: string;
  meaning: string;
  host_scope?: string;
  path?: string | null;
  licence?: string | null;
}

/** Projection of vendor/sources.lock.json + sources.revisions.json + model-radar. */
export interface CapabilityRecord {
  id: string;
  kind: string;
  domain: string | null;
  title: string;
  disposition: string | null;
  license: string | null;
  presence: string | null;
  url: string | null;
  revision: string | null;
  revisionState: string;
  revisionReason: string | null;
  repo: string | null;
  observedAt: string | null;
  contentDigest: string | null;
  /** null means no host run and no human acceptance exists yet - not `false`. */
  qualified: boolean | null;
  qualificationEvidence: string | null;
  sourceType: string | null;
  evidenceLevel: string | null;
  upstreamOwner: string | null;
  licenseUrl: string | null;
  rightsNotes: string | null;
  removalPath: string | null;
  popularity: {
    stargazerCount: number | null;
    forkCount: number | null;
    observedAt: string | null;
    source: string | null;
    isNotQuality: boolean;
  } | null;
  unclassifiedAxes: string[];
}

export interface CapabilityLibraryResponse {
  schemaVersion: string;
  meaning: string;
  unmeasuredMeans: string;
  classification?: {
    joined: number;
    unclassifiedAxes: string[];
    note: string;
  };
  counts: {
    total: number;
    byKind: Record<string, number>;
    byLicense: Record<string, number>;
    byRevisionState: Record<string, number>;
    qualified: number;
  };
  sources: Record<string, string>;
  capabilities: CapabilityRecord[];
}

export interface TaskPreflightResponse {
  schemaVersion: string;
  task_full_id: string;
  taskpack_id: string;
  task_key: string;
  registry_state: string;
  local_config_fallback: string | null;
  resources: TaskPreflightResource[];
  blocked_resources: string[];
  verdict: string;
  machine_scope: string;
  authority_source: string;
  permissions: { install: boolean; licence_accept: boolean; external_traverse: boolean; meaning: string };
  install_executed: boolean;
  licence_accepted: boolean;
  meaning: string;
}

// --- Domain Pack readback: GET /api/domains --------------------------------
// The four words are the closed vocabulary of src/design_lab/domain_packs.py. They are
// declared here rather than free strings because a page that invented a fifth verdict
// ("approved", "accepted") would be claiming a judgement no emitter produces; the
// two-way equality with the Python tuple is pinned by
// design-lab/tests/test_domain_pack_readback.py (LANGUAGE-POLICY §5 — enums are not
// hand-copied between languages without a check that both sides match).
export type DomainPackValidation = 'VALIDATES' | 'INVALID' | 'UNREADABLE' | 'NOT_CHECKED';

/** One pack directory, with the identity its own manifest declares. */
export interface DomainPackRecord {
  directory: string;
  /** null = the manifest does not declare it (or could not be read). Not "none", not "". */
  packId: string | null;
  version: string | null;
  displayName: string | null;
  /** A workflow/domain-pack/v1 manifest has no `domain` field at all. */
  domain: string | null;
  manifestSchemaVersion: string | null;
  dependencies: string[] | null;
  validation: DomainPackValidation;
  validationErrors: string[];
  validationErrorCount: number;
  note: string | null;
}

export interface DomainListResponse {
  schemaVersion: string;
  meaning: string;
  unmeasuredMeans: string;
  root: string;
  rootState: string;
  validationVocabulary: string[];
  checker: { path: string; state: string; note: string | null };
  sources: Record<string, string>;
  counts: { packs: number; byValidation: Record<string, number> };
  packs: DomainPackRecord[];
}

