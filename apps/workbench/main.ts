// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench — strict TypeScript product source (taskpack D002/D004/D006).
//
// This is the user-visible design control plane. It is typed end to end: API
// responses use the strict contract types from ./contracts.js (never `any`), and
// the browser DOM is addressed through a typed `byId` helper. The Vite build
// emits a single deterministic ES file to apps/workbench/build/main.js (D003
// Build Output Truth: outDir=build, committed, no-drift CI-checked). Because the
// only imports are `import type` (erased at build), the emitted bundle keeps
// ZERO runtime imports and stays valid both as a browser ES module and as the
// native-UI contract test's classic script.
import type {
  AssetContentResponse,
  AssetListResponse,
  BriefLineageResponse,
  BriefRevisionResponse,
  BundleDownloadResponse,
  DesignBrief,
  DesignDirection,
  DesignLayerResponse,
  DesignSystemBinding,
  DesignSystemListResponse,
  DesignSystemRecord,
  DirectionLineageResponse,
  DirectionRevisionResponse,
  EnvironmentResponse,
  EventListResponse,
  HealthResponse,
  NativeAssetListResponse,
  NativeAssetRecord,
  NativeAssetVerifyResponse,
  NativePlanResponse,
  PatchResponse,
  ProjectCreateResponse,
  ProjectListResponse,
  TaskActionResponse,
  TaskDispatchResponse,
  TaskListResponse,
  TaskPreflightResponse,
  TaskPreflightResource,
  TaskRecord,
} from './contracts.js';

// Browser-valid strict TypeScript subset: no runtime dependency or transpilation.
const byId = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let token = '';
let connected = false;
let connectGeneration = 0;
let project = '';
let epoch = 0;
let taskCursor: string | null = null;
let eventCursor: string | null = null;
let eventJob = '';
let pendingImport: { project: string; body: Record<string, unknown> } | null = null;
let busy = false;
let nativeCursor: string | null = null;
let eventRequest = 0;
let previewRequest = 0;
let verificationRequest = 0;
let taskRequest = 0;
let nativeRequest = 0;
let refreshRequest = 0;
let submittedPlan: { owner: string; identity: string; key: string } | null = null;
let planBusy = false;
let patchSource: { owner: string; job: string; attempt: string } | null = null;
let submittedPatch: { identity: string; key: string } | null = null;
let patchBusy = false;

// Renamed from `status`: the bare identifier `status` collides with the DOM global
// `window.status: string`, which made the helper non-callable under `strict`.
const setStatus = (text: string, error = false) => {
  const el = byId<HTMLParagraphElement>('status');
  el.textContent = text;
  el.classList.toggle('error', error);
};

const errMsg = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Generic fetch wrapper: T is the strict contract type for the endpoint; only the
// wire-level error envelope is read from the body, everything else is typed.
async function api<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
  const value = (await response.json()) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(value.error || 'SERVICE_ERROR');
  return value as T;
}

function button(list: string, label: string, action: () => Promise<void>) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  // Return the handled promise (do NOT `void` it): callers/tests `await
  // button.onclick()` to let the whole action chain settle before asserting
  // status text. The `.catch` already resolves the promise, so no floating
  // rejection leaks under strict settings.
  b.onclick = () => action().catch((error) => setStatus(errMsg(error), true));
  li.append(b);
  byId<HTMLUListElement>(list).append(li);
}

function resetProject() {
  submittedPlan = null;
  patchSource = submittedPatch = null;
  byId<HTMLParagraphElement>('patch-source').textContent = '请从已完成的 Illustrator 或 Photoshop 任务选择修改来源。';
  epoch++;
  taskCursor = eventCursor = null;
  eventJob = '';
  pendingImport = null;
  nativeCursor = null;
  byId<HTMLParagraphElement>('native-info').textContent = '';
  for (const id of ['assets', 'tasks', 'events', 'native-assets', 'reference-picker',
                    'design-briefs', 'design-directions', 'design-bindings',
                    'brief-lineage', 'direction-lineage'])
    byId<HTMLUListElement>(id).replaceChildren();
  // F-2b: a project switch drops the in-flight revision target, the version
  // highlight and both chains — nothing from the previous project stays
  // visible as if it were the current project's state.
  revisionBriefTarget = revisionDirectionTarget = null;
  revisionBriefCarried = [];
  highlightBrief = highlightDirection = null;
  byId<HTMLParagraphElement>('revision-brief-target').textContent = REVISION_BRIEF_IDLE;
  byId<HTMLParagraphElement>('revision-direction-target').textContent = REVISION_DIRECTION_IDLE;
  byId<HTMLParagraphElement>('brief-lineage-title').textContent = '';
  byId<HTMLParagraphElement>('direction-lineage-title').textContent = '';
  byId<HTMLParagraphElement>('design-binding-active').textContent = '';
  for (const id of ['preview', 'retry-import', 'more-tasks', 'more-events', 'more-native']) byId(id).hidden = true;
  byId<HTMLImageElement>('preview').removeAttribute('src');
  byId<HTMLParagraphElement>('preview-empty').hidden = false;
  byId<HTMLParagraphElement>('asset-info').textContent = '';
}

async function projects() {
  const data = await api<ProjectListResponse>('/projects');
  byId<HTMLSelectElement>('project').replaceChildren(new Option('选择项目', ''));
  for (const p of data.projects) byId<HTMLSelectElement>('project').append(new Option(p.name, p.id));
  if (data.projects.some((p) => p.id === project)) byId<HTMLSelectElement>('project').value = project;
}

async function loadEvents(job: string, append = false) {
  if (append && job !== eventJob) return;
  const current = epoch;
  const owner = project;
  const request = ++eventRequest;
  if (!append) {
    eventJob = job;
    eventCursor = null;
    byId<HTMLOListElement>('events').replaceChildren();
    byId<HTMLButtonElement>('more-events').hidden = true;
  }
  const data = await api<EventListResponse>(
    `/projects/${owner}/tasks/${job}/events` + (append && eventCursor !== null ? `?after=${eventCursor}` : ''),
  ).catch((error) => {
    if (current !== epoch || request !== eventRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== eventRequest) return;
  for (const event of data.events) {
    const li = document.createElement('li');
    li.textContent = `${event.at} · attempt ${event.attempt_no} · ${event.from_state || 'NEW'} → ${event.to_state}`;
    byId<HTMLOListElement>('events').append(li);
  }
  eventCursor = data.next_cursor;
  byId<HTMLButtonElement>('more-events').hidden = eventCursor === null;
}

async function tasks(append = false) {
  if (append && taskCursor === null) return;
  if (!append) {
    taskCursor = null;
    byId<HTMLButtonElement>('more-tasks').hidden = true;
  }
  const current = epoch;
  const owner = project;
  const request = ++taskRequest;
  const data = await api<TaskListResponse>(
    `/projects/${owner}/tasks` + (append && taskCursor ? `?after=${taskCursor}` : ''),
  ).catch((error) => {
    if (current !== epoch || request !== taskRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== taskRequest) return;
  if (!append) byId<HTMLUListElement>('tasks').replaceChildren();
  for (const task of data.tasks) {
    button('tasks', `${task.kind} · ${task.state} · attempt ${task.attempt.attempt_no} · ${task.job_id.slice(-12)}`, () => loadEvents(task.job_id));
    if (task.kind.endsWith('-native') && task.attempt.state === 'RECEIPTED')
      button('tasks', `导出交付包 · ${task.job_id.slice(-12)} · rights/质量待审`, () => exportBundle(task));
    if (['illustrator-native', 'photoshop-native'].includes(task.kind) && task.attempt.state === 'RECEIPTED')
      button('tasks', `修改对象 · ${task.job_id.slice(-12)}`, async () => {
        if (current !== epoch) return;
        patchSource = { owner, job: task.job_id, attempt: task.attempt.attempt_id };
        byId<HTMLParagraphElement>('patch-source').textContent =
          `来源 ${task.job_id} · ${task.attempt.attempt_id}。将在新副本修改，不覆盖原件。`;
      });
    if (task.kind.endsWith('-native') && ['PENDING', 'RUNNING', 'OUTCOME_UNKNOWN'].includes(task.attempt.state))
      button('tasks', `请求取消 · ${task.job_id.slice(-12)}`, () => cancelTask(task));
    if (task.kind.endsWith('-native') && task.attempt.state === 'PENDING')
      button('tasks', `启动任务 · ${task.job_id.slice(-12)}`, () => startTask(task));
  }
  if (!append && !data.tasks.length) byId<HTMLUListElement>('tasks').textContent = '尚无任务。导入图片后可查看真实记录。';
  taskCursor = data.next_cursor;
  byId<HTMLButtonElement>('more-tasks').hidden = taskCursor === null;
}

async function startTask(task: TaskRecord) {
  const current = epoch;
  const owner = project;
  const data = await api<TaskDispatchResponse>(
    `/projects/${owner}/tasks/${task.job_id}/run`,
    { attempt_id: task.attempt.attempt_id },
  ).catch((error) => {
    if (current !== epoch) return null;
    throw error;
  });
  if (!data || current !== epoch) return;
  await tasks();
  if (current !== epoch) return;
  setStatus(`工作进程：${data.worker}；不代表制作成功，请刷新查看宿主读回状态。`);
}

async function cancelTask(task: TaskRecord) {
  const current = epoch;
  const owner = project;
  const data = await api<TaskActionResponse>(
    `/projects/${owner}/tasks/${task.job_id}/cancel`,
    { attempt_id: task.attempt.attempt_id },
  ).catch((error) => {
    if (current !== epoch) return null;
    throw error;
  });
  if (!data || current !== epoch) return;
  await tasks();
  if (current !== epoch) return;
  setStatus(`取消请求读回：${data.task.attempt.state}；请求受理不代表宿主已停止。`);
}

async function exportBundle(task: TaskRecord) {
  const current = epoch;
  const owner = project;
  const access = token;
  setStatus('正在核对原生文件并打包；此操作不代表设计验收。');
  const data = await api<BundleDownloadResponse>(`/projects/${owner}/tasks/${task.job_id}/bundle`, {});
  if (current !== epoch) return;
  const expected = new RegExp(`^/api/projects/${owner}/bundles/bundle-native-[0-9a-f]{64}/versions/v-[0-9a-f]{32}/content$`);
  if (!expected.test(data.download_path)) throw new Error('INVALID_BUNDLE_ROUTE');
  const response = await fetch(data.download_path, { headers: { Authorization: 'Bearer ' + access }, cache: 'no-store' });
  if (!response.ok) throw new Error('BUNDLE_DOWNLOAD_UNVERIFIED');
  const bytes = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
  if (digest !== data.bundle.sha256 || bytes.byteLength !== data.bundle.byte_size) throw new Error('BUNDLE_HASH_MISMATCH');
  if (current !== epoch) return;
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `design-lab-${task.job_id.slice(-12)}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  setStatus('交付包下载 hash 已核对；字体、链接、rights 与质量仍需验收。');
}

async function preview(assetId: string) {
  const current = epoch;
  const request = ++previewRequest;
  const data = await api<AssetContentResponse>(`/projects/${project}/assets/${assetId}/content`).catch((error) => {
    if (current !== epoch || request !== previewRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== previewRequest) return;
  if (!['image/png', 'image/jpeg'].includes(data.asset.media_type)) throw new Error('UNSUPPORTED_PREVIEW');
  byId<HTMLImageElement>('preview').src = `data:${data.asset.media_type};base64,${data.content_base64}`;
  byId<HTMLImageElement>('preview').hidden = false;
  byId<HTMLParagraphElement>('preview-empty').hidden = true;
  byId<HTMLParagraphElement>('asset-info').textContent =
    `${data.asset.width} × ${data.asset.height} · rights: ${data.asset.rights} · ${data.asset.sha256}`;
}

async function refresh() {
  if (!project) return;
  const current = epoch;
  const request = ++refreshRequest;
  setStatus('正在读取项目资产与任务…');
  const result = await Promise.all([api<AssetListResponse>(`/projects/${project}/assets`), tasks(), nativeAssets()]).catch((error) => {
    if (current !== epoch || request !== refreshRequest) return null;
    throw error;
  });
  if (!result || current !== epoch || request !== refreshRequest) return;
  const [data] = result;
  byId<HTMLUListElement>('assets').replaceChildren();
  for (const asset of data.assets)
    button('assets', `${asset.width} × ${asset.height} · ${asset.media_type} · ${asset.id.slice(-10)}`, () => preview(asset.id));
  // P0-05: expose the imported assets in the 05 design layer as a lightweight
  // reference picker (checkboxes). A brief may only reference assets that were
  // actually imported into THIS project — the backend fails closed otherwise.
  populateReferencePicker(data.assets.map((asset) => asset.id));
  setStatus('已读取持久化状态。参考素材权利仍需审查。');
}

// P0-05: one checkbox per imported asset; checked ids are what submitBrief sends.
function populateReferencePicker(assetIds: string[]) {
  const picker = byId<HTMLUListElement>('reference-picker');
  picker.replaceChildren();
  if (!assetIds.length) {
    const li = document.createElement('li');
    li.textContent = '尚未导入参考素材。先导入 PNG/JPEG，再回来为简报勾选。';
    picker.append(li);
    return;
  }
  for (const id of assetIds) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.name = 'reference-asset';
    box.value = id;
    label.append(box, document.createTextNode(' ' + id));
    li.append(label);
    picker.append(li);
  }
}

function selectedReferences(): string[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="reference-asset"]:checked')).map((el) => el.value);
}

async function verifyNative(asset: NativeAssetRecord) {
  const current = epoch;
  const owner = project;
  const request = ++verificationRequest;
  byId<HTMLParagraphElement>('native-info').textContent = '正在读取原生文件并校验 hash…';
  const data = await api<NativeAssetVerifyResponse>(`/projects/${owner}/native-assets/${asset.id}/verify`).catch((error) => {
    if (current !== epoch || request !== verificationRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== verificationRequest) return;
  byId<HTMLParagraphElement>('native-info').textContent =
    `${data.asset.kind.toUpperCase()} · ${data.asset.version_id} · ${data.asset.verification} · ${data.asset.byte_size} bytes · ${data.asset.sha256} · rights: ${data.asset.rights}。此校验不代替宿主重开或人工质量验收。`;
}

async function nativeAssets(append = false) {
  if (append && nativeCursor === null) return;
  if (!append) {
    nativeCursor = null;
    byId<HTMLButtonElement>('more-native').hidden = true;
  }
  const current = epoch;
  const owner = project;
  const request = ++nativeRequest;
  const data = await api<NativeAssetListResponse>(
    `/projects/${owner}/native-assets` + (append && nativeCursor ? `?after=${nativeCursor}` : ''),
  ).catch((error) => {
    if (current !== epoch || request !== nativeRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== nativeRequest) return;
  if (!append) byId<HTMLUListElement>('native-assets').replaceChildren();
  for (const asset of data.assets)
    button('native-assets', `校验 ${asset.kind.toUpperCase()} · v${asset.version_no} · ${asset.version_id} · 数据库记录`, () => verifyNative(asset));
  if (!append && !data.assets.length) byId<HTMLUListElement>('native-assets').textContent = '暂无已登记的 AI/PSD。';
  nativeCursor = data.next_cursor;
  byId<HTMLButtonElement>('more-native').hidden = nativeCursor === null;
}

async function sendImport() {
  if (!pendingImport || busy) return;
  const job = pendingImport;
  busy = true;
  byId<HTMLButtonElement>('import-button').disabled = true;
  byId<HTMLButtonElement>('retry-import').hidden = true;
  setStatus('正在导入并验证图片。关闭页面不撤销服务端操作。');
  try {
    await api(`/projects/${job.project}/assets`, job.body);
    if (pendingImport === job) pendingImport = null;
    if (project === job.project) await refresh();
    setStatus('导入已保存；选择资产查看服务器读回。');
  } catch (error) {
    setStatus(`导入未确认：${errMsg(error)}。可使用同一幂等键重试；不会自动重复创建。`, true);
    byId<HTMLButtonElement>('retry-import').hidden = pendingImport !== job;
  } finally {
    busy = false;
    byId<HTMLButtonElement>('import-button').disabled = false;
  }
}

byId<HTMLFormElement>('connect-form').onsubmit = async (event) => {
  event.preventDefault();
  const generation = ++connectGeneration;
  const submittedToken = byId<HTMLInputElement>('token').value;
  byId<HTMLInputElement>('token').value = '';
  if (!/^[0-9a-f]{64}$/.test(submittedToken)) {
    token = '';
    connected = false;
    setStatus('访问令牌格式不正确。', true);
    return;
  }
  token = submittedToken;
  try {
    await projects();
    if (generation !== connectGeneration || token !== submittedToken) return;
    connected = true;
    byId<HTMLDivElement>('login').hidden = true;
    byId<HTMLDivElement>('workspace').hidden = false;
    byId<HTMLSpanElement>('connection').textContent = '本机已连接';
    setStatus('选择或新建项目。');
  } catch (error) {
    if (generation !== connectGeneration || token !== submittedToken) return;
    token = '';
    connected = false;
    setStatus(errMsg(error), true);
  }
};

byId<HTMLButtonElement>('disconnect').onclick = () => {
  connectGeneration += 1;
  token = '';
  connected = false;
  project = '';
  resetProject();
  byId<HTMLDivElement>('workspace').hidden = true;
  byId<HTMLDivElement>('login').hidden = false;
  byId<HTMLSpanElement>('connection').textContent = '未连接';
  setStatus('已清除页面内存中的访问令牌。');
};

byId<HTMLSelectElement>('project').onchange = () => {
  project = byId<HTMLSelectElement>('project').value;
  resetProject();
  refresh().catch((e) => setStatus(errMsg(e), true));
  loadDesignSystems().catch((e) => setStatus(errMsg(e), true));
  refreshDesign().catch((e) => setStatus(errMsg(e), true));
};

byId<HTMLButtonElement>('refresh').onclick = () => {
  void refresh().catch((e) => setStatus(errMsg(e), true));
  void loadDesignSystems().catch((e) => setStatus(errMsg(e), true));
  void refreshDesign().catch((e) => setStatus(errMsg(e), true));
};

byId<HTMLFormElement>('create-form').onsubmit = async (event) => {
  event.preventDefault();
  try {
    const data = await api<ProjectCreateResponse>('/projects', { name: byId<HTMLInputElement>('project-name').value });
    project = data.project.id;
    resetProject();
    await projects();
    byId<HTMLInputElement>('project-name').value = '';
    await refresh();
  } catch (error) {
    setStatus(errMsg(error), true);
  }
};

byId<HTMLFormElement>('import-form').onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  const input = byId<HTMLInputElement>('file');
  const file = input.files && input.files[0];
  const owner = project;
  if (!owner || !file) {
    setStatus('请先选择项目和图片。', true);
    return;
  }
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 32 * 1024 * 1024) {
    setStatus('仅支持不超过 32 MiB 的 PNG/JPEG。', true);
    return;
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (owner !== project) throw new Error('项目已切换，请重新导入');
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    pendingImport = { project: owner, body: { content_base64: btoa(binary), idempotency_key: crypto.randomUUID() } };
    await sendImport();
  } catch (error) {
    setStatus(errMsg(error), true);
  }
};

byId<HTMLButtonElement>('retry-import').onclick = () => {
  void sendImport();
};

byId<HTMLFormElement>('plan-form').onsubmit = async (event) => {
  event.preventDefault();
  if (planBusy) return;
  const current = epoch;
  const owner = project;
  try {
    if (!owner) throw new Error('请先选择项目');
    const raw = byId<HTMLTextAreaElement>('plan-rir').value;
    const styles = byId<HTMLTextAreaElement>('plan-styles').value;
    if (raw.length + styles.length > 3900000) throw new Error('对象计划过大');
    const body: Record<string, unknown> = {
      host: byId<HTMLSelectElement>('plan-host').value,
      rir: JSON.parse(raw),
      text_styles: JSON.parse(styles),
    };
    const identity = JSON.stringify(body);
    if (!submittedPlan || submittedPlan.owner !== owner || submittedPlan.identity !== identity)
      submittedPlan = { owner, identity, key: crypto.randomUUID() };
    body.idempotency_key = submittedPlan.key;
    planBusy = true;
    byId<HTMLButtonElement>('plan-submit').disabled = true;
    const data = await api<NativePlanResponse>(`/projects/${owner}/native-plans`, body);
    if (current !== epoch) return;
    await tasks();
    if (current !== epoch) return;
    setStatus(`对象计划已持久化：${data.task.attempt.state}。请从任务列表显式启动；未执行质量或权利验收。`);
  } catch (error) {
    if (current === epoch) setStatus(`计划提交未确认：${errMsg(error)}。内容不变时重试复用幂等键。`, true);
  } finally {
    planBusy = false;
    byId<HTMLButtonElement>('plan-submit').disabled = false;
  }
};

byId<HTMLButtonElement>('more-tasks').onclick = () => {
  void tasks(true).catch((e) => setStatus(errMsg(e), true));
};

byId<HTMLFormElement>('patch-form').onsubmit = async (event) => {
  event.preventDefault();
  if (patchBusy) return;
  const current = epoch;
  const owner = project;
  const source = patchSource;
  try {
    if (!source || source.owner !== owner) throw new Error('请先选择当前项目的 Illustrator 来源任务');
    const raw = byId<HTMLTextAreaElement>('patch-json').value;
    if (raw.length > 900000) throw new Error('局部修改过大');
    const body: Record<string, unknown> = { source_attempt_id: source.attempt, patch: JSON.parse(raw) };
    const identity = JSON.stringify({ source, body });
    if (!submittedPatch || submittedPatch.identity !== identity)
      submittedPatch = { identity, key: crypto.randomUUID() };
    body.idempotency_key = submittedPatch.key;
    patchBusy = true;
    byId<HTMLButtonElement>('patch-submit').disabled = true;
    const data = await api<PatchResponse>(`/projects/${owner}/tasks/${source.job}/patch`, body);
    if (current !== epoch) return;
    await tasks();
    if (current !== epoch) return;
    setStatus(`局部修改已排队：${data.task.attempt.state} · 父版本 ${data.parent.version_id}。需显式启动，尚未执行或通过质量验收。`);
  } catch (error) {
    if (current === epoch) setStatus(`局部修改提交未确认：${errMsg(error)}。相同内容重试复用幂等键。`, true);
  } finally {
    patchBusy = false;
    byId<HTMLButtonElement>('patch-submit').disabled = false;
  }
};

byId<HTMLButtonElement>('more-events').onclick = () => {
  void loadEvents(eventJob, true).catch((e) => setStatus(errMsg(e), true));
};

byId<HTMLButtonElement>('more-native').onclick = () => {
  void nativeAssets(true).catch((e) => setStatus(errMsg(e), true));
};

// ============================================================================
// E-SLICE-01 design layer: the first full-stack vertical slice
//   Project -> Brief -> Reference -> Direction (Human Choice) -> DesignSystem
// Present as first-class user interactions (forms + buttons), not raw JSON.
// Each step persists server-side and is read back from the API (evidence = the
// readback, the recorded spec digests, the chosen-actor fact, the binding).
// ============================================================================
let chosenDirection: DesignDirection | null = null;
let designRequest = 0;
let boundSystems: DesignSystemRecord[] = [];
let submittedBrief: { owner: string; identity: string; key: string } | null = null;
let submittedDirection: { owner: string; identity: string; key: string } | null = null;
let briefBusy = false;
let directionBusy = false;
let bindBusy = false;

// F-2b revision state. The revision forms are ONE form per record kind, loaded
// from a row: the target row supplies the parent version whose content is
// re-sent (a revision appends a new immutable version; it never edits the old
// row). `revisionBriefCarried` holds references that the checked picker cannot
// represent, so a revision never silently drops a reference.
let revisionBriefTarget: DesignBrief | null = null;
let revisionDirectionTarget: DesignDirection | null = null;
let revisionBriefCarried: string[] = [];
let highlightBrief: string | null = null;
let highlightDirection: string | null = null;
let briefRevisionBusy = false;
let directionRevisionBusy = false;
let briefLineageRequest = 0;
let directionLineageRequest = 0;
const REVISION_BRIEF_IDLE = '在某一简报行点击「新版本」以载入该版本内容；保存会新增一个版本，不会改写旧版本。';
const REVISION_DIRECTION_IDLE = '在某一方向行点击「新版本」以载入该版本内容；保存会新增一个版本，不会改写旧版本。';

const uuid = (): string => crypto.randomUUID();

async function loadDesignSystems() {
  const current = epoch;
  const data = await api<{ design_systems: DesignSystemRecord[] }>('/design-systems');
  if (current !== epoch) return;
  boundSystems = data.design_systems;
  const select = byId<HTMLSelectElement>('design-system');
  select.replaceChildren(new Option('选择设计系统', ''));
  for (const system of boundSystems) select.append(new Option(`${system.title} · ${system.version} (${system.evidence_level})`, system.name));
  byId<HTMLUListElement>('design-systems').replaceChildren(
    ...boundSystems.map((system) => {
      const li = document.createElement('li');
      li.textContent = `${system.name} · ${system.title} · v${system.version} · ${system.evidence_level}`;
      return li;
    }),
  );
}

// F-2b helpers — plain user language only (no command/package/artifact terms).
const shortId = (id: string): string => id.slice(-8);

function versionOf(id: string, versions: Map<string, number>): string {
  const known = versions.get(id);
  return known === undefined ? `未知版本（${shortId(id)}）` : `版本 ${known}（${shortId(id)}）`;
}

// A row is either the live version (nothing supersedes it) or a superseded
// version whose `superseded_by` pointer names the version that continued it.
function versionState(supersededBy: string | null, versions: Map<string, number>): string {
  return supersededBy === null ? '当前' : `已取代 → ${versionOf(supersededBy, versions)}`;
}

function rowButton(label: string, action: () => void | Promise<void>): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  // Same contract as button(): the handled promise is returned so a caller can
  // await the whole action chain (the .catch already resolves it).
  element.onclick = () => Promise.resolve(action()).catch((error) => setStatus(errMsg(error), true));
  return element;
}

function renderDesignLayer(data: DesignLayerResponse) {
  const layer = data.design_layer;
  const briefVersions = new Map<string, number>();
  for (const row of layer.briefs) briefVersions.set(row.brief_id, row.version);
  const directionVersions = new Map<string, number>();
  const directionsById = new Map<string, DesignDirection>();
  for (const row of layer.directions) {
    directionVersions.set(row.direction_id, row.version);
    directionsById.set(row.direction_id, row);
  }
  const activeBindingId = layer.active_binding ? layer.active_binding.binding_id : null;
  const focusRows: HTMLElement[] = [];

  byId<HTMLUListElement>('design-briefs').replaceChildren(
    ...layer.briefs.map((brief: DesignBrief) => {
      const li = document.createElement('li');
      li.tabIndex = -1;
      const refs = brief.reference_asset_ids.length;
      li.textContent = `BRIEF · ${brief.title} · ${brief.goals.join(' / ')}${brief.constraints ? ` · ${brief.constraints}` : ''} · 参考 ${refs} · v${brief.version} · ${versionState(brief.superseded_by, briefVersions)} · ${brief.spec_sha256}`;
      li.append(
        rowButton('新版本', () => loadBriefRevision(brief)),
        rowButton('版本链', () => loadBriefLineage(brief.brief_id)),
      );
      if (brief.brief_id === highlightBrief) {
        li.classList.add('highlight');
        focusRows.push(li);
      }
      return li;
    }),
  );
  byId<HTMLUListElement>('design-directions').replaceChildren(
    ...layer.directions.map((direction: DesignDirection) => {
      const li = document.createElement('li');
      li.tabIndex = -1;
      const live = direction.superseded_by === null;
      li.textContent = `DIRECTION · ${direction.title} · ${direction.chosen ? `CHOSEN by ${direction.actor}` : 'open'} · v${direction.version} · ${versionState(direction.superseded_by, directionVersions)} · 简报 ${shortId(direction.brief_id)} · ${direction.spec_sha256}`;
      if (direction.chosen && live) chosenDirection = direction;
      // Naming a superseded version "the choice" would be untrue, so the
      // choose entry is offered only on the live version of a direction.
      if (live) {
        const choose = document.createElement('button');
        choose.type = 'button';
        choose.textContent = `选为方向 · ${shortId(direction.direction_id)}`;
        choose.onclick = () => chooseDirection(direction).catch((error) => setStatus(errMsg(error), true));
        li.append(choose);
      }
      li.append(
        rowButton('新版本', () => loadDirectionRevision(direction)),
        rowButton('版本链', () => loadDirectionLineage(direction.direction_id)),
      );
      if (direction.direction_id === highlightDirection) {
        li.classList.add('highlight');
        focusRows.push(li);
      }
      return li;
    }),
  );
  byId<HTMLUListElement>('design-bindings').replaceChildren(
    ...(layer.bindings.length ? layer.bindings.map((binding: DesignSystemBinding) => {
      const li = document.createElement('li');
      const owner = directionsById.get(binding.direction_id);
      // A binding row is append-only: it stays attached to the direction VERSION
      // it was bound to and never follows a revised direction. Only the read
      // model's active_binding is current — every other row must say so.
      const state = binding.binding_id === activeBindingId
        ? '生效中'
        : owner && owner.superseded_by !== null
          ? '未生效 · 绑定留在已被取代的方向版本上，需重新建立'
          : '未生效 · 当前选定方向不是它';
      li.textContent = `BINDING · ${binding.design_system_name} · 绑定记录 v${binding.version} · 方向 ${shortId(binding.direction_id)} · ${state} · ${binding.spec_sha256}`;
      return li;
    }) : [info('design-bindings-empty')]),
  );
  const notice = byId<HTMLParagraphElement>('design-binding-active');
  const active = layer.active_binding;
  const chosen = chosenDirection;
  if (active) {
    notice.classList.remove('warn');
    notice.textContent = `当前方向已绑定设计系统：${active.design_system_name}（设计契约已固定）。`;
  } else if (chosen && layer.bindings.length) {
    // F-2b: revising a chosen direction carries the choice forward but NOT the
    // design-system binding (append-only row). Say so instead of showing the
    // retired binding as if it were current.
    notice.classList.add('warn');
    notice.textContent = `当前选定方向「${chosen.title} · 版本 ${chosen.version}」没有生效的设计契约：已有的绑定记录仍留在旧的方向版本上，不会随新版本自动跟随——绑定需重新建立（选定设计系统后点「绑定设计系统」）。`;
  } else {
    notice.classList.remove('warn');
    notice.textContent = '选择方向并绑定设计系统后，后续 Build/Review 才有固定设计契约。';
  }
  if (focusRows.length) focusRows[0].focus();
}

function info(id: string): HTMLElement {
  const p = document.createElement('p');
  p.id = id;
  p.className = 'empty';
  p.textContent = id === 'design-bindings-empty' ? '尚未绑定设计系统。' : '';
  return p;
}

async function refreshDesign() {
  if (!project) return;
  const current = epoch;
  const request = ++designRequest;
  setStatus('正在读取设计层：Brief / Direction / DesignSystem…');
  const data = await api<DesignLayerResponse>(`/projects/${project}/design-layer`).catch((error) => {
    if (current !== epoch || request !== designRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== designRequest) return;
  chosenDirection = null;
  const briefSelect = byId<HTMLSelectElement>('direction-brief');
  briefSelect.replaceChildren(new Option('选择简报', ''));
  for (const brief of data.design_layer.briefs)
    briefSelect.append(new Option(`${brief.title} · ${brief.brief_id.slice(-8)}`, brief.brief_id));
  renderDesignLayer(data);
  setStatus('设计层已读取。方向选择与绑定不代表制作完成或质量验收。');
}

async function submitBrief() {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const title = byId<HTMLInputElement>('brief-title').value;
  if (briefBusy) return;
  const goalsRaw = byId<HTMLInputElement>('brief-goals').value.trim();
  const goals = goalsRaw ? goalsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const constraints = byId<HTMLInputElement>('brief-constraints').value.trim() || null;
  if (!title || !goals.length) { setStatus('请填写简报标题与至少一条目标。', true); return; }
  const references = selectedReferences();
  const body: Record<string, unknown> = { title, goals, constraints, reference_asset_ids: references, idempotency_key: '' };
  const identity = JSON.stringify({ owner, title, goals, constraints, references });
  if (!submittedBrief || submittedBrief.owner !== owner || submittedBrief.identity !== identity)
    submittedBrief = { owner, identity, key: uuid() };
  body.idempotency_key = submittedBrief.key;
  briefBusy = true;
  byId<HTMLButtonElement>('brief-submit').disabled = true;
  try {
    await api(`/projects/${owner}/briefs`, body);
    if (current !== epoch) return;
    byId<HTMLInputElement>('brief-title').value = '';
    byId<HTMLInputElement>('brief-goals').value = '';
    byId<HTMLInputElement>('brief-constraints').value = '';
    for (const box of Array.from(document.querySelectorAll('input[name="reference-asset"]')))
      (box as HTMLInputElement).checked = false;
    await refreshDesign();
    setStatus(`简报已持久化（引用 ${references.length} 个参考素材）；下一步在简报下立方向。`);
  } catch (error) {
    if (current === epoch) setStatus(`简报未确认：${errMsg(error)}。相同内容重试复用幂等键。`, true);
  } finally {
    briefBusy = false;
    byId<HTMLButtonElement>('brief-submit').disabled = false;
  }
}

async function submitDirection() {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  if (directionBusy) return;
  const brief = byId<HTMLSelectElement>('direction-brief').value;
  const title = byId<HTMLInputElement>('direction-title').value.trim();
  const colorMood = byId<HTMLInputElement>('direction-color').value.trim() || null;
  const typeMood = byId<HTMLInputElement>('direction-type').value.trim() || null;
  if (!brief || !title) { setStatus('请选择简报并填写方向标题。', true); return; }
  const body: Record<string, unknown> = { brief_id: brief, title, style_notes: null, color_mood: colorMood, typography_mood: typeMood, idempotency_key: '' };
  const identity = JSON.stringify({ owner, brief, title, colorMood, typeMood });
  if (!submittedDirection || submittedDirection.owner !== owner || submittedDirection.identity !== identity)
    submittedDirection = { owner, identity, key: uuid() };
  body.idempotency_key = submittedDirection.key;
  directionBusy = true;
  byId<HTMLButtonElement>('direction-submit').disabled = true;
  try {
    const data = await api<{ direction: DesignDirection }>(`/projects/${owner}/directions`, body);
    if (current !== epoch) return;
    byId<HTMLInputElement>('direction-title').value = '';
    await refreshDesign();
    setStatus(`方向已排队：${data.direction.direction_id.slice(-8)}。请选择该方向并绑定设计系统。`);
  } catch (error) {
    if (current === epoch) setStatus(`方向未确认：${errMsg(error)}。相同内容重试复用幂等键。`, true);
  } finally {
    directionBusy = false;
    byId<HTMLButtonElement>('direction-submit').disabled = false;
  }
}

async function chooseDirection(direction: DesignDirection) {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const actor = 'workbench-user';
  const actorKind = 'human';
  const body = { actor, actor_kind: actorKind, idempotency_key: uuid() };
  try {
    const data = await api<{ direction: DesignDirection }>(`/projects/${owner}/directions/${direction.direction_id}/choose`, body);
    if (current !== epoch) return;
    await refreshDesign();
    setStatus(`方向已选定：${data.direction.direction_id.slice(-8)}（${data.direction.actor}）。下一步绑定设计系统。`);
  } catch (error) {
    if (current === epoch) setStatus(`方向选择未确认：${errMsg(error)}`, true);
  }
}

async function bindDesignSystem() {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  if (bindBusy) return;
  const name = byId<HTMLSelectElement>('design-system').value;
  const direction = chosenDirection;
  if (!name || !direction) { setStatus('请先选定方向，再选择要绑定的设计系统。', true); return; }
  const body = { design_system_name: name, idempotency_key: uuid() };
  bindBusy = true;
  byId<HTMLButtonElement>('design-system-bind').disabled = true;
  try {
    const data = await api<{ binding: { design_system_name: string } }>(`/projects/${owner}/directions/${direction.direction_id}/bind`, body);
    if (current !== epoch) return;
    await refreshDesign();
    setStatus(`设计系统已绑定：${data.binding.design_system_name}。设计契约已固定；制作与质量验收仍未执行。`);
  } catch (error) {
    if (current === epoch) setStatus(`设计系统绑定未确认：${errMsg(error)}`, true);
  } finally {
    bindBusy = false;
    byId<HTMLButtonElement>('design-system-bind').disabled = false;
  }
}

// ============================================================================
// F-2b revision flow: every brief / direction row can append a NEW version.
// The row's content prefills the form, the POST goes to the revision route,
// and the result is READ BACK from the server (design layer + version chain),
// so the DOM only ever shows persisted state. Stale / foreign / unauthorized
// revisions fail closed through the shared error line — never silently.
// ============================================================================
function revisionHint(error: unknown): string {
  const code = errMsg(error);
  if (code === 'STALE_REVISION') return '该版本已被取代，服务端拒绝了这次修订（STALE_REVISION）。请从版本链里的最新版本继续。';
  if (code === 'BRIEF_NOT_FOUND' || code === 'DIRECTION_NOT_FOUND') return `该版本已不在当前项目中（${code}）；请刷新后重试。`;
  if (code === 'UNAUTHORIZED') return '访问令牌无效或已过期（UNAUTHORIZED）；请断开后重新连接本机服务。';
  return `${code}；本次修订未被接受，服务端未写入任何内容。`;
}

// Long items are rejected by the service (fail closed); catch it here so the
// user sees which field is at fault instead of a bare INVALID_LIST_ITEM.
function splitList(raw: string, maxLen: number, label: string): string[] {
  const items = raw ? raw.split(',').map((value) => value.trim()).filter(Boolean) : [];
  if (items.some((item) => item.length > maxLen)) throw new Error(`${label}每项不能超过 ${maxLen} 个字符`);
  return items;
}

function loadBriefRevision(brief: DesignBrief, focusForm = true) {
  revisionBriefTarget = brief;
  const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="reference-asset"]'));
  const known = new Set(boxes.map((box) => box.value));
  for (const box of boxes) box.checked = brief.reference_asset_ids.includes(box.value);
  revisionBriefCarried = brief.reference_asset_ids.filter((id) => !known.has(id));
  byId<HTMLInputElement>('revision-brief-title').value = brief.title;
  byId<HTMLInputElement>('revision-brief-goals').value = brief.goals.join(', ');
  byId<HTMLInputElement>('revision-brief-constraints').value = brief.constraints ?? '';
  byId<HTMLParagraphElement>('revision-brief-target').textContent =
    `正在修订简报「${brief.title}」版本 ${brief.version}（${shortId(brief.brief_id)}）：内容已按该版本预填，勾选区对应它的参考素材。保存会新增一个版本，旧版本只保留为历史。`
    + (revisionBriefCarried.length ? `另有 ${revisionBriefCarried.length} 个参考素材不在当前勾选列表里，会原样保留。` : '')
    + (brief.superseded_by === null ? '' : ' 注意：该版本已被取代，服务端会拒绝这次修订（STALE_REVISION），请改从版本链中的最新版本继续。');
  // After a successful revision the highlight/focus must stay on the NEW row,
  // so the post-revision prefill does not steal focus back into the form.
  if (focusForm) byId<HTMLInputElement>('revision-brief-title').focus();
}

async function submitBriefRevision() {
  const current = epoch;
  const owner = project;
  const source = revisionBriefTarget;
  if (!owner || briefRevisionBusy) return;
  if (!source) { setStatus('请先在某一简报行点击「新版本」以载入要修订的内容。', true); return; }
  briefRevisionBusy = true;
  byId<HTMLButtonElement>('brief-revision-submit').disabled = true;
  try {
    const title = byId<HTMLInputElement>('revision-brief-title').value.trim();
    const goals = splitList(byId<HTMLInputElement>('revision-brief-goals').value, 300, '目标');
    const constraints = byId<HTMLInputElement>('revision-brief-constraints').value.trim() || null;
    if (!title || !goals.length) throw new Error('修订需要标题与至少一条目标');
    const references = Array.from(new Set([...selectedReferences(), ...revisionBriefCarried]));
    const data = await api<BriefRevisionResponse>(`/projects/${owner}/briefs/${source.brief_id}/revisions`,
      { title, goals, constraints, reference_asset_ids: references, idempotency_key: uuid() });
    if (current !== epoch) return;
    highlightBrief = data.brief.brief_id;
    await refreshDesign();
    if (current !== epoch) return;
    await loadBriefLineage(data.brief.brief_id);
    if (current !== epoch) return;
    loadBriefRevision(data.brief, false);
    setStatus(`简报已保存为版本 ${data.brief.version}（${shortId(data.brief.brief_id)}）；版本 ${source.version} 只保留为历史，旧内容未被改写。`);
  } catch (error) {
    if (current === epoch) setStatus(`简报修订未确认：${revisionHint(error)}`, true);
  } finally {
    briefRevisionBusy = false;
    byId<HTMLButtonElement>('brief-revision-submit').disabled = false;
  }
}

function loadDirectionRevision(direction: DesignDirection, focusForm = true) {
  revisionDirectionTarget = direction;
  byId<HTMLInputElement>('revision-direction-title').value = direction.title;
  byId<HTMLInputElement>('revision-direction-notes').value = (direction.style_notes ?? []).join(', ');
  byId<HTMLInputElement>('revision-direction-color').value = direction.color_mood ?? '';
  byId<HTMLInputElement>('revision-direction-type').value = direction.typography_mood ?? '';
  byId<HTMLParagraphElement>('revision-direction-target').textContent =
    `正在修订方向「${direction.title}」版本 ${direction.version}（${shortId(direction.direction_id)}）：内容已按该版本预填。保存会新增一个版本，旧版本只保留为历史。`
    + (direction.chosen ? ' 该版本是当前已选定方向：选定结论会随新版本带走，但设计系统绑定不会自动跟随，需重新建立。' : '')
    + (direction.superseded_by === null ? '' : ' 注意：该版本已被取代，服务端会拒绝这次修订（STALE_REVISION），请改从版本链中的最新版本继续。');
  if (focusForm) byId<HTMLInputElement>('revision-direction-title').focus();
}

async function submitDirectionRevision() {
  const current = epoch;
  const owner = project;
  const source = revisionDirectionTarget;
  if (!owner || directionRevisionBusy) return;
  if (!source) { setStatus('请先在某一方向行点击「新版本」以载入要修订的内容。', true); return; }
  directionRevisionBusy = true;
  byId<HTMLButtonElement>('direction-revision-submit').disabled = true;
  try {
    const title = byId<HTMLInputElement>('revision-direction-title').value.trim();
    const notes = splitList(byId<HTMLInputElement>('revision-direction-notes').value, 300, '表现备注');
    const colorMood = byId<HTMLInputElement>('revision-direction-color').value.trim() || null;
    const typeMood = byId<HTMLInputElement>('revision-direction-type').value.trim() || null;
    if (!title) throw new Error('修订需要方向标题');
    const data = await api<DirectionRevisionResponse>(`/projects/${owner}/directions/${source.direction_id}/revisions`,
      { title, style_notes: notes.length ? notes : null, color_mood: colorMood, typography_mood: typeMood, idempotency_key: uuid() });
    if (current !== epoch) return;
    highlightDirection = data.direction.direction_id;
    await refreshDesign();
    if (current !== epoch) return;
    await loadDirectionLineage(data.direction.direction_id);
    if (current !== epoch) return;
    loadDirectionRevision(data.direction, false);
    setStatus(`方向已保存为版本 ${data.direction.version}（${shortId(data.direction.direction_id)}）；版本 ${source.version} 只保留为历史。`
      + (data.direction.chosen ? ` 选定结论已随新版本带走（${data.direction.actor}）；设计系统绑定未跟随，绑定需重新建立。` : ''));
  } catch (error) {
    if (current === epoch) setStatus(`方向修订未确认：${revisionHint(error)}`, true);
  } finally {
    directionRevisionBusy = false;
    byId<HTMLButtonElement>('direction-revision-submit').disabled = false;
  }
}

async function loadBriefLineage(briefId: string) {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const request = ++briefLineageRequest;
  setStatus('正在读取简报版本链…');
  const data = await api<BriefLineageResponse>(`/projects/${owner}/briefs/${briefId}/lineage`).catch((error) => {
    if (current !== epoch || request !== briefLineageRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== briefLineageRequest) return;
  const versions = new Map<string, number>();
  for (const row of data.lineage.versions) versions.set(row.brief_id, row.version);
  const liveId = data.lineage.live_id;
  const live = liveId === null ? '—' : versionOf(liveId, versions);
  const first = data.lineage.versions.length ? data.lineage.versions[0] : null;
  byId<HTMLParagraphElement>('brief-lineage-title').textContent =
    `简报版本链 · 共 ${data.lineage.versions.length} 个版本 · 当前 ${live} · 起点 ${first ? `版本 ${first.version}` : '—'}`;
  byId<HTMLUListElement>('brief-lineage').replaceChildren(
    ...data.lineage.versions.map((row) => {
      const li = document.createElement('li');
      li.textContent = `版本 ${row.version} · ${versionState(row.superseded_by, versions)} · ${row.title} · ${row.goals.join(' / ')}${row.constraints ? ` · ${row.constraints}` : ''} · 参考 ${row.reference_asset_ids.length} · 记录于 ${row.created_at} · ${row.spec_sha256}`;
      return li;
    }),
  );
  setStatus(`简报版本链已读回：共 ${data.lineage.versions.length} 个版本，当前 ${live}。`);
}

async function loadDirectionLineage(directionId: string) {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const request = ++directionLineageRequest;
  setStatus('正在读取方向版本链…');
  const data = await api<DirectionLineageResponse>(`/projects/${owner}/directions/${directionId}/lineage`).catch((error) => {
    if (current !== epoch || request !== directionLineageRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== directionLineageRequest) return;
  const versions = new Map<string, number>();
  for (const row of data.lineage.versions) versions.set(row.direction_id, row.version);
  const liveId = data.lineage.live_id;
  const live = liveId === null ? '—' : versionOf(liveId, versions);
  const first = data.lineage.versions.length ? data.lineage.versions[0] : null;
  byId<HTMLParagraphElement>('direction-lineage-title').textContent =
    `方向版本链 · 共 ${data.lineage.versions.length} 个版本 · 当前 ${live} · 起点 ${first ? `版本 ${first.version}` : '—'}`;
  byId<HTMLUListElement>('direction-lineage').replaceChildren(
    ...data.lineage.versions.map((row) => {
      const li = document.createElement('li');
      li.textContent = `版本 ${row.version} · ${versionState(row.superseded_by, versions)} · ${row.title} · ${row.chosen ? `已选定（${row.actor}）` : '未选定'} · 色彩 ${row.color_mood ?? '未指定'} · 字体 ${row.typography_mood ?? '未指定'} · 记录于 ${row.created_at} · ${row.spec_sha256}`;
      return li;
    }),
  );
  setStatus(`方向版本链已读回：共 ${data.lineage.versions.length} 个版本，当前 ${live}。`);
}

byId<HTMLFormElement>('design-brief-form').onsubmit = (event) => {
  event.preventDefault();
  void submitBrief().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('brief-revision-form').onsubmit = (event) => {
  event.preventDefault();
  void submitBriefRevision().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('direction-revision-form').onsubmit = (event) => {
  event.preventDefault();
  void submitDirectionRevision().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('design-direction-form').onsubmit = (event) => {
  event.preventDefault();
  void submitDirection().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLButtonElement>('design-system-bind').onclick = () => {
  void bindDesignSystem().catch((e) => setStatus(errMsg(e), true));
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
const ROUTE_VIEWS = [
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
type RouteView = (typeof ROUTE_VIEWS)[number]['view'];

// Honest "not open yet" copy per IA slot that has no backend route today.
// Projects / creative-tools / deliverables / evidence are READ-ONLY readbacks
// of real service routes (see renderProjects/renderCreativeTools/
// renderDeliverables/renderEvidence). These three slots have NO backend model:
// research has no persisted conclusions, domains has no independent model, and
// the service is single-user with no collaboration route — so they say so.
const VIEW_NOT_OPEN: Partial<Record<RouteView, string>> = {
  'research': '研究洞察页未开放：当前服务没有研究结论的持久化路由。',
  'design-domains': '设计领域页未开放：领域划分尚无独立后端模型。',
  'collaboration': '团队协作页未开放：本地单机服务尚无协作路由（本地单用户模型）。',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
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

function kpiCard(label: string, value: string, note: string): HTMLElement {
  return el('div', { class: 'kpi-card' },
    el('p', { class: 'eyebrow' }, label),
    el('h3', { class: 'kpi-value' }, value),
    el('p', { class: 'kpi-note' }, note));
}

function stateMachineStepper(): HTMLElement {
  const stages = ['brief', 'research', 'designing', 'review', 'qa', 'approved', 'delivered', 'archived'];
  const ol = el('ol', { class: 'state-machine', 'aria-label': '设计域状态机（契约可视化，不代表项目进度）' });
  for (const stage of stages) ol.append(el('li', { class: 'state-machine-step', dataset: { state: stage } }, stage));
  return ol;
}

async function renderDashboard(target: HTMLElement): Promise<void> {
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

async function renderBrandSystems(target: HTMLElement): Promise<void> {
  target.replaceChildren(el('p', { class: 'view-loading' }, '正在读回设计系统…'));
  const systems = await api<DesignSystemListResponse>('/design-systems');
  target.replaceChildren(
    el('h2', {}, '品牌系统'),
    el('ul', { class: 'items', 'data-view-item': 'brand' },
      ...systems.design_systems.map((system) => el('li', {},
        `${system.name} · ${system.title} · 版本 ${system.version} · 证据级别 ${system.evidence_level}`))),
    el('p', { class: 'view-hint' }, '绑定到方向的操作在工作台「05 / DESIGN LAYER」页执行。'));
}

async function renderPreflight(target: HTMLElement): Promise<void> {
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

async function renderSettings(target: HTMLElement): Promise<void> {
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
async function projectPickerPanel(target: HTMLElement, title: string, body: (projectId: string) => Promise<HTMLElement>): Promise<void> {
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
async function renderProjects(target: HTMLElement): Promise<void> {
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
async function renderCreativeTools(target: HTMLElement): Promise<void> {
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
async function renderDeliverables(target: HTMLElement): Promise<void> {
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
async function renderEvidence(target: HTMLElement): Promise<void> {
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

async function renderRoute(view: RouteView, target: HTMLElement): Promise<void> {
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
function mountAppShell(): void {
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
if (typeof document !== 'undefined'
    && document.body !== undefined
    && typeof window !== 'undefined'
    && document.getElementById('login') !== null
    && (document as Document & { __dlShellMounted?: boolean }).__dlShellMounted !== true) {
  (document as Document & { __dlShellMounted?: boolean }).__dlShellMounted = true;
  mountAppShell();
}
