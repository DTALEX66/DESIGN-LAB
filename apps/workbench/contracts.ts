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

export interface TaskRecord {
  kind: string;
  state: string;
  job_id: string;
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
