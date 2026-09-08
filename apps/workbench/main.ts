// SPDX-License-Identifier: MIT
// Browser-valid TypeScript subset: no runtime dependency or transpilation required.
const $ = id => document.getElementById(id);
let token = '', project = '', epoch = 0, taskCursor = null, eventCursor = null, eventJob = '';
let pendingImport = null, busy = false;
let nativeCursor = null;
let eventRequest = 0, previewRequest = 0, verificationRequest = 0;
let submittedPlan = null, planBusy = false;
let patchSource = null, submittedPatch = null, patchBusy = false;
const status = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };
async function api(path, body) {
  const response = await fetch('/api' + path, {method: body ? 'POST' : 'GET',
    headers: {Authorization: 'Bearer ' + token, ...(body ? {'Content-Type':'application/json'} : {})},
    ...(body ? {body: JSON.stringify(body)} : {}), cache:'no-store'});
  const value = await response.json();
  if (!response.ok) throw Error(value.error || 'SERVICE_ERROR');
  return value;
}
function button(list, label, action) {
  const li = document.createElement('li'), b = document.createElement('button');
  b.type = 'button'; b.textContent = label;
  b.onclick = () => action().catch(error => status(error.message, true));
  li.append(b); $(list).append(li);
}
function resetProject() {
  submittedPlan = null;
  patchSource = submittedPatch = null; $('patch-source').textContent = '请从已完成的 Illustrator 任务选择修改来源。';
  epoch++; taskCursor = eventCursor = null; eventJob = ''; pendingImport = null;
  nativeCursor = null; $('native-info').textContent = '';
  for (const id of ['assets','tasks','events','native-assets']) $(id).replaceChildren();
  for (const id of ['preview','retry-import','more-tasks','more-events','more-native']) $(id).hidden = true;
  $('preview').removeAttribute('src'); $('preview-empty').hidden = false; $('asset-info').textContent = '';
}
async function projects() {
  const data = await api('/projects');
  $('project').replaceChildren(new Option('选择项目', ''));
  for (const p of data.projects) $('project').append(new Option(p.name,p.id));
  if (data.projects.some(p => p.id === project)) $('project').value = project;
}
async function loadEvents(job, append = false) {
  if (append && job !== eventJob) return;
  const current = epoch, owner = project, request = ++eventRequest;
  if (!append) { eventJob = job; eventCursor = null; $('events').replaceChildren(); $('more-events').hidden = true; }
  const data = await api(`/projects/${owner}/tasks/${job}/events` + (append && eventCursor !== null ? `?after=${eventCursor}` : '')).catch(error => {
    if (current !== epoch || request !== eventRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== eventRequest) return;
  for (const event of data.events) {
    const li = document.createElement('li');
    li.textContent = `${event.at} · attempt ${event.attempt_no} · ${event.from_state || 'NEW'} → ${event.to_state}`;
    $('events').append(li);
  }
  eventCursor = data.next_cursor; $('more-events').hidden = eventCursor === null;
}
async function tasks(append = false) {
  const current = epoch, owner = project;
  const data = await api(`/projects/${owner}/tasks` + (append && taskCursor ? `?after=${taskCursor}` : ''));
  if (current !== epoch) return;
  if (!append) $('tasks').replaceChildren();
  for (const task of data.tasks) {
    button('tasks', `${task.kind} · ${task.state} · attempt ${task.attempt.attempt_no} · ${task.job_id.slice(-12)}`, () => loadEvents(task.job_id));
    if (task.kind.endsWith('-native') && task.attempt.state === 'RECEIPTED')
      button('tasks', `导出交付包 · ${task.job_id.slice(-12)} · rights/质量待审`, () => exportBundle(task));
    if (task.kind === 'illustrator-native' && task.attempt.state === 'RECEIPTED')
      button('tasks', `修改对象 · ${task.job_id.slice(-12)}`, async () => {
        if (current !== epoch) return;
        patchSource = {owner,job:task.job_id,attempt:task.attempt.attempt_id};
        $('patch-source').textContent = `来源 ${task.job_id} · ${task.attempt.attempt_id}。将在新副本修改，不覆盖原件。`;
      });
    if (task.kind.endsWith('-native') && ['PENDING','RUNNING','OUTCOME_UNKNOWN'].includes(task.attempt.state))
      button('tasks', `请求取消 · ${task.job_id.slice(-12)}`, () => cancelTask(task));
    if (task.kind.endsWith('-native') && task.attempt.state === 'PENDING')
      button('tasks', `启动任务 · ${task.job_id.slice(-12)}`, () => startTask(task));
  }
  if (!append && !data.tasks.length) $('tasks').textContent = '尚无任务。导入图片后可查看真实记录。';
  taskCursor = data.next_cursor; $('more-tasks').hidden = taskCursor === null;
}
async function startTask(task) {
  const current = epoch, owner = project;
  const data = await api(`/projects/${owner}/tasks/${task.job_id}/run`, {attempt_id:task.attempt.attempt_id}).catch(error => {
    if (current !== epoch) return null;
    throw error;
  });
  if (!data || current !== epoch) return;
  await tasks();
  if (current !== epoch) return;
  status(`工作进程：${data.worker}；不代表制作成功，请刷新查看宿主读回状态。`);
}
async function cancelTask(task) {
  const current = epoch, owner = project;
  const data = await api(`/projects/${owner}/tasks/${task.job_id}/cancel`, {attempt_id:task.attempt.attempt_id}).catch(error => {
    if (current !== epoch) return null;
    throw error;
  });
  if (!data || current !== epoch) return;
  await tasks();
  if (current !== epoch) return;
  status(`取消请求读回：${data.task.attempt.state}；请求受理不代表宿主已停止。`);
}
async function exportBundle(task) {
  const current = epoch, owner = project, access = token;
  status('正在核对原生文件并打包；此操作不代表设计验收。');
  const data = await api(`/projects/${owner}/tasks/${task.job_id}/bundle`, {});
  if (current !== epoch) return;
  const expected = new RegExp(`^/api/projects/${owner}/bundles/bundle-native-[0-9a-f]{64}/versions/v-[0-9a-f]{32}/content$`);
  if (!expected.test(data.download_path)) throw Error('INVALID_BUNDLE_ROUTE');
  const response = await fetch(data.download_path, {headers:{Authorization:'Bearer ' + access},cache:'no-store'});
  if (!response.ok) throw Error('BUNDLE_DOWNLOAD_UNVERIFIED');
  const bytes = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
  if (digest !== data.bundle.sha256 || bytes.byteLength !== data.bundle.byte_size) throw Error('BUNDLE_HASH_MISMATCH');
  if (current !== epoch) return;
  const url = URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
  const link = document.createElement('a'); link.href = url; link.download = `design-lab-${task.job_id.slice(-12)}.zip`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url),30000);
  status('交付包下载 hash 已核对；字体、链接、rights 与质量仍需验收。');
}
async function preview(asset) {
  const current = epoch, request = ++previewRequest;
  const data = await api(`/projects/${project}/assets/${asset.id}/content`).catch(error => {
    if (current !== epoch || request !== previewRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== previewRequest) return;
  if (!['image/png','image/jpeg'].includes(data.asset.media_type)) throw Error('UNSUPPORTED_PREVIEW');
  $('preview').src = `data:${data.asset.media_type};base64,${data.content_base64}`;
  $('preview').hidden = false; $('preview-empty').hidden = true;
  $('asset-info').textContent = `${data.asset.width} × ${data.asset.height} · rights: ${data.asset.rights} · ${data.asset.sha256}`;
}
async function refresh() {
  if (!project) return;
  const current = epoch;
  status('正在读取项目资产与任务…');
  const [data] = await Promise.all([api(`/projects/${project}/assets`),tasks(),nativeAssets()]);
  if (current !== epoch) return;
  $('assets').replaceChildren();
  for (const asset of data.assets) button('assets', `${asset.width} × ${asset.height} · ${asset.media_type} · ${asset.id.slice(-10)}`, () => preview(asset));
  status('已读取持久化状态。参考素材权利仍需审查。');
}
async function verifyNative(asset) {
  const current = epoch, owner = project, request = ++verificationRequest;
  $('native-info').textContent = '正在读取原生文件并校验 hash…';
  const data = await api(`/projects/${owner}/native-assets/${asset.id}/verify`).catch(error => {
    if (current !== epoch || request !== verificationRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== verificationRequest) return;
  $('native-info').textContent = `${data.asset.kind.toUpperCase()} · ${data.asset.version_id} · ${data.asset.verification} · ${data.asset.byte_size} bytes · ${data.asset.sha256} · rights: ${data.asset.rights}。此校验不代替宿主重开或人工质量验收。`;
}
async function nativeAssets(append = false) {
  const current = epoch, owner = project;
  const data = await api(`/projects/${owner}/native-assets` + (append && nativeCursor ? `?after=${nativeCursor}` : ''));
  if (current !== epoch) return;
  if (!append) $('native-assets').replaceChildren();
  for (const asset of data.assets) button('native-assets', `校验 ${asset.kind.toUpperCase()} · v${asset.version_no} · ${asset.version_id} · 数据库记录`, () => verifyNative(asset));
  if (!append && !data.assets.length) $('native-assets').textContent = '暂无已登记的 AI/PSD。';
  nativeCursor = data.next_cursor; $('more-native').hidden = nativeCursor === null;
}
async function sendImport() {
  if (!pendingImport || busy) return;
  const job = pendingImport; busy = true; $('import-button').disabled = true; $('retry-import').hidden = true;
  status('正在导入并验证图片。关闭页面不撤销服务端操作。');
  try {
    await api(`/projects/${job.project}/assets`, job.body);
    if (pendingImport === job) pendingImport = null;
    if (project === job.project) await refresh();
    status('导入已保存；选择资产查看服务器读回。');
  } catch (error) {
    status(`导入未确认：${error.message}。可使用同一幂等键重试；不会自动重复创建。`, true);
    $('retry-import').hidden = pendingImport !== job;
  } finally { busy = false; $('import-button').disabled = false; }
}
$('connect-form').onsubmit = async event => {
  event.preventDefault(); token = $('token').value; $('token').value = '';
  if (!/^[0-9a-f]{64}$/.test(token)) { token = ''; status('访问令牌格式不正确。',true); return; }
  try { await projects(); $('login').hidden = true; $('workspace').hidden = false;
    $('connection').textContent = '本机已连接'; status('选择或新建项目。');
  } catch (error) { token = ''; status(error.message,true); }
};
$('disconnect').onclick = () => { token = ''; project = ''; resetProject(); $('workspace').hidden = true; $('login').hidden = false; $('connection').textContent = '未连接'; status('已清除页面内存中的访问令牌。'); };
$('project').onchange = () => { project = $('project').value; resetProject(); refresh().catch(e => status(e.message,true)); };
$('refresh').onclick = () => refresh().catch(e => status(e.message,true));
$('create-form').onsubmit = async event => {
  event.preventDefault();
  try { const data = await api('/projects',{name:$('project-name').value}); project = data.project.id;
    resetProject(); await projects(); $('project-name').value = ''; await refresh();
  } catch(error) { status(error.message,true); }
};
$('import-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  const file = $('file').files[0], owner = project;
  if (!owner || !file) { status('请先选择项目和图片。',true); return; }
  if (!['image/png','image/jpeg'].includes(file.type) || file.size > 32 * 1024 * 1024) { status('仅支持不超过 32 MiB 的 PNG/JPEG。',true); return; }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (owner !== project) throw Error('项目已切换，请重新导入');
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    pendingImport = {project:owner,body:{content_base64:btoa(binary),idempotency_key:crypto.randomUUID()}};
    await sendImport();
  } catch(error) { status(error.message,true); }
};
$('retry-import').onclick = sendImport;
$('plan-form').onsubmit = async event => {
  event.preventDefault();
  if (planBusy) return;
  const current = epoch, owner = project;
  try {
    if (!owner) throw Error('请先选择项目');
    const raw = $('plan-rir').value, styles = $('plan-styles').value;
    if (raw.length + styles.length > 3900000) throw Error('对象计划过大');
    const body = {host:$('plan-host').value,rir:JSON.parse(raw),text_styles:JSON.parse(styles)};
    const identity = JSON.stringify(body);
    if (!submittedPlan || submittedPlan.owner !== owner || submittedPlan.identity !== identity)
      submittedPlan = {owner,identity,key:crypto.randomUUID()};
    body.idempotency_key = submittedPlan.key;
    planBusy = true; $('plan-submit').disabled = true;
    const data = await api(`/projects/${owner}/native-plans`,body);
    if (current !== epoch) return;
    await tasks();
    if (current !== epoch) return;
    status(`对象计划已持久化：${data.task.attempt.state}。请从任务列表显式启动；未执行质量或权利验收。`);
  } catch (error) {
    if (current === epoch) status(`计划提交未确认：${error.message}。内容不变时重试复用幂等键。`,true);
  } finally { planBusy = false; $('plan-submit').disabled = false; }
};
$('more-tasks').onclick = () => tasks(true).catch(e => status(e.message,true));
$('patch-form').onsubmit = async event => {
  event.preventDefault();
  if (patchBusy) return;
  const current = epoch, owner = project, source = patchSource;
  try {
    if (!source || source.owner !== owner) throw Error('请先选择当前项目的 Illustrator 来源任务');
    const raw = $('patch-json').value;
    if (raw.length > 900000) throw Error('局部修改过大');
    const body = {source_attempt_id:source.attempt,patch:JSON.parse(raw)};
    const identity = JSON.stringify({source,body});
    if (!submittedPatch || submittedPatch.identity !== identity)
      submittedPatch = {identity,key:crypto.randomUUID()};
    body.idempotency_key = submittedPatch.key;
    patchBusy = true; $('patch-submit').disabled = true;
    const data = await api(`/projects/${owner}/tasks/${source.job}/patch`,body);
    if (current !== epoch) return;
    await tasks();
    if (current !== epoch) return;
    status(`局部修改已排队：${data.task.attempt.state} · 父版本 ${data.parent.version_id}。需显式启动，尚未执行或通过质量验收。`);
  } catch (error) {
    if (current === epoch) status(`局部修改提交未确认：${error.message}。相同内容重试复用幂等键。`,true);
  } finally { patchBusy = false; $('patch-submit').disabled = false; }
};
$('more-events').onclick = () => loadEvents(eventJob,true).catch(e => status(e.message,true));
$('more-native').onclick = () => nativeAssets(true).catch(e => status(e.message,true));
