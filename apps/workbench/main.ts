// SPDX-License-Identifier: MIT
// Browser-valid TypeScript subset: no runtime dependency or transpilation required.
const $ = id => document.getElementById(id);
let token = '', project = '', epoch = 0, taskCursor = null, eventCursor = null, eventJob = '';
let pendingImport = null, busy = false;
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
  epoch++; taskCursor = eventCursor = null; eventJob = ''; pendingImport = null;
  for (const id of ['assets','tasks','events']) $(id).replaceChildren();
  for (const id of ['preview','retry-import','more-tasks','more-events']) $(id).hidden = true;
  $('preview').removeAttribute('src'); $('preview-empty').hidden = false; $('asset-info').textContent = '';
}
async function projects() {
  const data = await api('/projects');
  $('project').replaceChildren(new Option('选择项目', ''));
  for (const p of data.projects) $('project').append(new Option(p.name,p.id));
  if (data.projects.some(p => p.id === project)) $('project').value = project;
}
async function loadEvents(job, append = false) {
  const current = epoch, owner = project;
  const data = await api(`/projects/${owner}/tasks/${job}/events` + (append && eventCursor !== null ? `?after=${eventCursor}` : ''));
  if (current !== epoch) return;
  if (!append) $('events').replaceChildren();
  eventJob = job;
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
  for (const task of data.tasks) button('tasks', `${task.kind} · ${task.state} · attempt ${task.attempt.attempt_no} · ${task.job_id.slice(-12)}`, () => loadEvents(task.job_id));
  if (!append && !data.tasks.length) $('tasks').textContent = '尚无任务。导入图片后可查看真实记录。';
  taskCursor = data.next_cursor; $('more-tasks').hidden = taskCursor === null;
}
async function preview(asset) {
  const current = epoch;
  const data = await api(`/projects/${project}/assets/${asset.id}/content`);
  if (current !== epoch) return;
  if (!['image/png','image/jpeg'].includes(data.asset.media_type)) throw Error('UNSUPPORTED_PREVIEW');
  $('preview').src = `data:${data.asset.media_type};base64,${data.content_base64}`;
  $('preview').hidden = false; $('preview-empty').hidden = true;
  $('asset-info').textContent = `${data.asset.width} × ${data.asset.height} · rights: ${data.asset.rights} · ${data.asset.sha256}`;
}
async function refresh() {
  if (!project) return;
  const current = epoch;
  status('正在读取项目资产与任务…');
  const [data] = await Promise.all([api(`/projects/${project}/assets`),tasks()]);
  if (current !== epoch) return;
  $('assets').replaceChildren();
  for (const asset of data.assets) button('assets', `${asset.width} × ${asset.height} · ${asset.media_type} · ${asset.id.slice(-10)}`, () => preview(asset));
  status('已读取持久化状态。参考素材权利仍需审查。');
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
$('more-tasks').onclick = () => tasks(true).catch(e => status(e.message,true));
$('more-events').onclick = () => loadEvents(eventJob,true).catch(e => status(e.message,true));
