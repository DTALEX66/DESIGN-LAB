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
  BundleDownloadResponse,
  DesignBrief,
  DesignDirection,
  DesignLayerResponse,
  DesignSystemRecord,
  EventListResponse,
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
  TaskRecord,
} from './contracts.js';

// Browser-valid strict TypeScript subset: no runtime dependency or transpilation.
const byId = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

let token = '';
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
  for (const id of ['assets', 'tasks', 'events', 'native-assets']) byId<HTMLUListElement>(id).replaceChildren();
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
  setStatus('已读取持久化状态。参考素材权利仍需审查。');
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
  token = byId<HTMLInputElement>('token').value;
  byId<HTMLInputElement>('token').value = '';
  if (!/^[0-9a-f]{64}$/.test(token)) {
    token = '';
    setStatus('访问令牌格式不正确。', true);
    return;
  }
  try {
    await projects();
    byId<HTMLDivElement>('login').hidden = true;
    byId<HTMLDivElement>('workspace').hidden = false;
    byId<HTMLSpanElement>('connection').textContent = '本机已连接';
    setStatus('选择或新建项目。');
  } catch (error) {
    token = '';
    setStatus(errMsg(error), true);
  }
};

byId<HTMLButtonElement>('disconnect').onclick = () => {
  token = '';
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

function renderDesignLayer(data: DesignLayerResponse) {
  const layer = data.design_layer;
  byId<HTMLUListElement>('design-briefs').replaceChildren(
    ...layer.briefs.map((brief: DesignBrief) => {
      const li = document.createElement('li');
      li.textContent = `BRIEF · ${brief.title} · ${brief.goals.join(' / ')}${brief.constraints ? ` · ${brief.constraints}` : ''} · ${brief.spec_sha256}`;
      return li;
    }),
  );
  byId<HTMLUListElement>('design-directions').replaceChildren(
    ...layer.directions.map((direction: DesignDirection) => {
      const li = document.createElement('li');
      li.textContent = `DIRECTION · ${direction.title} · ${direction.chosen ? `CHOSEN by ${direction.actor}` : 'open'} · ${direction.spec_sha256}`;
      if (direction.chosen) chosenDirection = direction;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `选为方向 · ${direction.direction_id.slice(-8)}`;
      button.onclick = () => chooseDirection(direction).catch((error) => setStatus(errMsg(error), true));
      li.append(document.createTextNode(' '), button);
      return li;
    }),
  );
  byId<HTMLUListElement>('design-bindings').replaceChildren(
    ...(layer.bindings.length ? layer.bindings.map((binding) => {
      const li = document.createElement('li');
      li.textContent = `BINDING · ${binding.design_system_name} · ${binding.spec_sha256}`;
      return li;
    }) : [info('design-bindings-empty')]),
  );
  const active = layer.active_binding;
  byId<HTMLParagraphElement>('design-binding-active').textContent = active
    ? `当前方向已绑定设计系统：${active.design_system_name}（设计契约已固定）。`
    : '选择方向并绑定设计系统后，后续 Build/Review 才有固定设计契约。';
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
  const body: Record<string, unknown> = { title, goals, constraints, reference_asset_ids: [], idempotency_key: '' };
  const identity = JSON.stringify({ owner, title, goals, constraints });
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
    await refreshDesign();
    setStatus('简报已持久化；下一步在简报下立方向。');
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

byId<HTMLFormElement>('design-brief-form').onsubmit = (event) => {
  event.preventDefault();
  void submitBrief().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('design-direction-form').onsubmit = (event) => {
  event.preventDefault();
  void submitDirection().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLButtonElement>('design-system-bind').onclick = () => {
  void bindDesignSystem().catch((e) => setStatus(errMsg(e), true));
};
