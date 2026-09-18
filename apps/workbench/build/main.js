const byId = (id) => document.getElementById(id);
let token = "";
let project = "";
let epoch = 0;
let taskCursor = null;
let eventCursor = null;
let eventJob = "";
let pendingImport = null;
let busy = false;
let nativeCursor = null;
let eventRequest = 0;
let previewRequest = 0;
let verificationRequest = 0;
let taskRequest = 0;
let nativeRequest = 0;
let refreshRequest = 0;
let submittedPlan = null;
let planBusy = false;
let patchSource = null;
let submittedPatch = null;
let patchBusy = false;
const setStatus = (text, error = false) => {
  const el = byId("status");
  el.textContent = text;
  el.classList.toggle("error", error);
};
const errMsg = (error) => error instanceof Error ? error.message : String(error);
async function api(path, body) {
  const response = await fetch("/api" + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer " + token, ...body ? { "Content-Type": "application/json" } : {} },
    ...body ? { body: JSON.stringify(body) } : {},
    cache: "no-store"
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "SERVICE_ERROR");
  return value;
}
function button(list, label, action) {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.onclick = () => action().catch((error) => setStatus(errMsg(error), true));
  li.append(b);
  byId(list).append(li);
}
function resetProject() {
  submittedPlan = null;
  patchSource = submittedPatch = null;
  byId("patch-source").textContent = "请从已完成的 Illustrator 或 Photoshop 任务选择修改来源。";
  epoch++;
  taskCursor = eventCursor = null;
  eventJob = "";
  pendingImport = null;
  nativeCursor = null;
  byId("native-info").textContent = "";
  for (const id of ["assets", "tasks", "events", "native-assets"]) byId(id).replaceChildren();
  for (const id of ["preview", "retry-import", "more-tasks", "more-events", "more-native"]) byId(id).hidden = true;
  byId("preview").removeAttribute("src");
  byId("preview-empty").hidden = false;
  byId("asset-info").textContent = "";
}
async function projects() {
  const data = await api("/projects");
  byId("project").replaceChildren(new Option("选择项目", ""));
  for (const p of data.projects) byId("project").append(new Option(p.name, p.id));
  if (data.projects.some((p) => p.id === project)) byId("project").value = project;
}
async function loadEvents(job, append = false) {
  if (append && job !== eventJob) return;
  const current = epoch;
  const owner = project;
  const request = ++eventRequest;
  if (!append) {
    eventJob = job;
    eventCursor = null;
    byId("events").replaceChildren();
    byId("more-events").hidden = true;
  }
  const data = await api(
    `/projects/${owner}/tasks/${job}/events` + (append && eventCursor !== null ? `?after=${eventCursor}` : "")
  ).catch((error) => {
    if (current !== epoch || request !== eventRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== eventRequest) return;
  for (const event of data.events) {
    const li = document.createElement("li");
    li.textContent = `${event.at} · attempt ${event.attempt_no} · ${event.from_state || "NEW"} → ${event.to_state}`;
    byId("events").append(li);
  }
  eventCursor = data.next_cursor;
  byId("more-events").hidden = eventCursor === null;
}
async function tasks(append = false) {
  if (append && taskCursor === null) return;
  if (!append) {
    taskCursor = null;
    byId("more-tasks").hidden = true;
  }
  const current = epoch;
  const owner = project;
  const request = ++taskRequest;
  const data = await api(
    `/projects/${owner}/tasks` + (append && taskCursor ? `?after=${taskCursor}` : "")
  ).catch((error) => {
    if (current !== epoch || request !== taskRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== taskRequest) return;
  if (!append) byId("tasks").replaceChildren();
  for (const task of data.tasks) {
    button("tasks", `${task.kind} · ${task.state} · attempt ${task.attempt.attempt_no} · ${task.job_id.slice(-12)}`, () => loadEvents(task.job_id));
    if (task.kind.endsWith("-native") && task.attempt.state === "RECEIPTED")
      button("tasks", `导出交付包 · ${task.job_id.slice(-12)} · rights/质量待审`, () => exportBundle(task));
    if (["illustrator-native", "photoshop-native"].includes(task.kind) && task.attempt.state === "RECEIPTED")
      button("tasks", `修改对象 · ${task.job_id.slice(-12)}`, async () => {
        if (current !== epoch) return;
        patchSource = { owner, job: task.job_id, attempt: task.attempt.attempt_id };
        byId("patch-source").textContent = `来源 ${task.job_id} · ${task.attempt.attempt_id}。将在新副本修改，不覆盖原件。`;
      });
    if (task.kind.endsWith("-native") && ["PENDING", "RUNNING", "OUTCOME_UNKNOWN"].includes(task.attempt.state))
      button("tasks", `请求取消 · ${task.job_id.slice(-12)}`, () => cancelTask(task));
    if (task.kind.endsWith("-native") && task.attempt.state === "PENDING")
      button("tasks", `启动任务 · ${task.job_id.slice(-12)}`, () => startTask(task));
  }
  if (!append && !data.tasks.length) byId("tasks").textContent = "尚无任务。导入图片后可查看真实记录。";
  taskCursor = data.next_cursor;
  byId("more-tasks").hidden = taskCursor === null;
}
async function startTask(task) {
  const current = epoch;
  const owner = project;
  const data = await api(
    `/projects/${owner}/tasks/${task.job_id}/run`,
    { attempt_id: task.attempt.attempt_id }
  ).catch((error) => {
    if (current !== epoch) return null;
    throw error;
  });
  if (!data || current !== epoch) return;
  await tasks();
  if (current !== epoch) return;
  setStatus(`工作进程：${data.worker}；不代表制作成功，请刷新查看宿主读回状态。`);
}
async function cancelTask(task) {
  const current = epoch;
  const owner = project;
  const data = await api(
    `/projects/${owner}/tasks/${task.job_id}/cancel`,
    { attempt_id: task.attempt.attempt_id }
  ).catch((error) => {
    if (current !== epoch) return null;
    throw error;
  });
  if (!data || current !== epoch) return;
  await tasks();
  if (current !== epoch) return;
  setStatus(`取消请求读回：${data.task.attempt.state}；请求受理不代表宿主已停止。`);
}
async function exportBundle(task) {
  const current = epoch;
  const owner = project;
  const access = token;
  setStatus("正在核对原生文件并打包；此操作不代表设计验收。");
  const data = await api(`/projects/${owner}/tasks/${task.job_id}/bundle`, {});
  if (current !== epoch) return;
  const expected = new RegExp(`^/api/projects/${owner}/bundles/bundle-native-[0-9a-f]{64}/versions/v-[0-9a-f]{32}/content$`);
  if (!expected.test(data.download_path)) throw new Error("INVALID_BUNDLE_ROUTE");
  const response = await fetch(data.download_path, { headers: { Authorization: "Bearer " + access }, cache: "no-store" });
  if (!response.ok) throw new Error("BUNDLE_DOWNLOAD_UNVERIFIED");
  const bytes = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
  if (digest !== data.bundle.sha256 || bytes.byteLength !== data.bundle.byte_size) throw new Error("BUNDLE_HASH_MISMATCH");
  if (current !== epoch) return;
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `design-lab-${task.job_id.slice(-12)}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3e4);
  setStatus("交付包下载 hash 已核对；字体、链接、rights 与质量仍需验收。");
}
async function preview(assetId) {
  const current = epoch;
  const request = ++previewRequest;
  const data = await api(`/projects/${project}/assets/${assetId}/content`).catch((error) => {
    if (current !== epoch || request !== previewRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== previewRequest) return;
  if (!["image/png", "image/jpeg"].includes(data.asset.media_type)) throw new Error("UNSUPPORTED_PREVIEW");
  byId("preview").src = `data:${data.asset.media_type};base64,${data.content_base64}`;
  byId("preview").hidden = false;
  byId("preview-empty").hidden = true;
  byId("asset-info").textContent = `${data.asset.width} × ${data.asset.height} · rights: ${data.asset.rights} · ${data.asset.sha256}`;
}
async function refresh() {
  if (!project) return;
  const current = epoch;
  const request = ++refreshRequest;
  setStatus("正在读取项目资产与任务…");
  const result = await Promise.all([api(`/projects/${project}/assets`), tasks(), nativeAssets()]).catch((error) => {
    if (current !== epoch || request !== refreshRequest) return null;
    throw error;
  });
  if (!result || current !== epoch || request !== refreshRequest) return;
  const [data] = result;
  byId("assets").replaceChildren();
  for (const asset of data.assets)
    button("assets", `${asset.width} × ${asset.height} · ${asset.media_type} · ${asset.id.slice(-10)}`, () => preview(asset.id));
  setStatus("已读取持久化状态。参考素材权利仍需审查。");
}
async function verifyNative(asset) {
  const current = epoch;
  const owner = project;
  const request = ++verificationRequest;
  byId("native-info").textContent = "正在读取原生文件并校验 hash…";
  const data = await api(`/projects/${owner}/native-assets/${asset.id}/verify`).catch((error) => {
    if (current !== epoch || request !== verificationRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== verificationRequest) return;
  byId("native-info").textContent = `${data.asset.kind.toUpperCase()} · ${data.asset.version_id} · ${data.asset.verification} · ${data.asset.byte_size} bytes · ${data.asset.sha256} · rights: ${data.asset.rights}。此校验不代替宿主重开或人工质量验收。`;
}
async function nativeAssets(append = false) {
  if (append && nativeCursor === null) return;
  if (!append) {
    nativeCursor = null;
    byId("more-native").hidden = true;
  }
  const current = epoch;
  const owner = project;
  const request = ++nativeRequest;
  const data = await api(
    `/projects/${owner}/native-assets` + (append && nativeCursor ? `?after=${nativeCursor}` : "")
  ).catch((error) => {
    if (current !== epoch || request !== nativeRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== nativeRequest) return;
  if (!append) byId("native-assets").replaceChildren();
  for (const asset of data.assets)
    button("native-assets", `校验 ${asset.kind.toUpperCase()} · v${asset.version_no} · ${asset.version_id} · 数据库记录`, () => verifyNative(asset));
  if (!append && !data.assets.length) byId("native-assets").textContent = "暂无已登记的 AI/PSD。";
  nativeCursor = data.next_cursor;
  byId("more-native").hidden = nativeCursor === null;
}
async function sendImport() {
  if (!pendingImport || busy) return;
  const job = pendingImport;
  busy = true;
  byId("import-button").disabled = true;
  byId("retry-import").hidden = true;
  setStatus("正在导入并验证图片。关闭页面不撤销服务端操作。");
  try {
    await api(`/projects/${job.project}/assets`, job.body);
    if (pendingImport === job) pendingImport = null;
    if (project === job.project) await refresh();
    setStatus("导入已保存；选择资产查看服务器读回。");
  } catch (error) {
    setStatus(`导入未确认：${errMsg(error)}。可使用同一幂等键重试；不会自动重复创建。`, true);
    byId("retry-import").hidden = pendingImport !== job;
  } finally {
    busy = false;
    byId("import-button").disabled = false;
  }
}
byId("connect-form").onsubmit = async (event) => {
  event.preventDefault();
  token = byId("token").value;
  byId("token").value = "";
  if (!/^[0-9a-f]{64}$/.test(token)) {
    token = "";
    setStatus("访问令牌格式不正确。", true);
    return;
  }
  try {
    await projects();
    byId("login").hidden = true;
    byId("workspace").hidden = false;
    byId("connection").textContent = "本机已连接";
    setStatus("选择或新建项目。");
  } catch (error) {
    token = "";
    setStatus(errMsg(error), true);
  }
};
byId("disconnect").onclick = () => {
  token = "";
  project = "";
  resetProject();
  byId("workspace").hidden = true;
  byId("login").hidden = false;
  byId("connection").textContent = "未连接";
  setStatus("已清除页面内存中的访问令牌。");
};
byId("project").onchange = () => {
  project = byId("project").value;
  resetProject();
  refresh().catch((e) => setStatus(errMsg(e), true));
  loadDesignSystems().catch((e) => setStatus(errMsg(e), true));
  refreshDesign().catch((e) => setStatus(errMsg(e), true));
};
byId("refresh").onclick = () => {
  void refresh().catch((e) => setStatus(errMsg(e), true));
  void loadDesignSystems().catch((e) => setStatus(errMsg(e), true));
  void refreshDesign().catch((e) => setStatus(errMsg(e), true));
};
byId("create-form").onsubmit = async (event) => {
  event.preventDefault();
  try {
    const data = await api("/projects", { name: byId("project-name").value });
    project = data.project.id;
    resetProject();
    await projects();
    byId("project-name").value = "";
    await refresh();
  } catch (error) {
    setStatus(errMsg(error), true);
  }
};
byId("import-form").onsubmit = async (event) => {
  event.preventDefault();
  if (busy) return;
  const input = byId("file");
  const file = input.files && input.files[0];
  const owner = project;
  if (!owner || !file) {
    setStatus("请先选择项目和图片。", true);
    return;
  }
  if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 32 * 1024 * 1024) {
    setStatus("仅支持不超过 32 MiB 的 PNG/JPEG。", true);
    return;
  }
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (owner !== project) throw new Error("项目已切换，请重新导入");
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    pendingImport = { project: owner, body: { content_base64: btoa(binary), idempotency_key: crypto.randomUUID() } };
    await sendImport();
  } catch (error) {
    setStatus(errMsg(error), true);
  }
};
byId("retry-import").onclick = () => {
  void sendImport();
};
byId("plan-form").onsubmit = async (event) => {
  event.preventDefault();
  if (planBusy) return;
  const current = epoch;
  const owner = project;
  try {
    if (!owner) throw new Error("请先选择项目");
    const raw = byId("plan-rir").value;
    const styles = byId("plan-styles").value;
    if (raw.length + styles.length > 39e5) throw new Error("对象计划过大");
    const body = {
      host: byId("plan-host").value,
      rir: JSON.parse(raw),
      text_styles: JSON.parse(styles)
    };
    const identity = JSON.stringify(body);
    if (!submittedPlan || submittedPlan.owner !== owner || submittedPlan.identity !== identity)
      submittedPlan = { owner, identity, key: crypto.randomUUID() };
    body.idempotency_key = submittedPlan.key;
    planBusy = true;
    byId("plan-submit").disabled = true;
    const data = await api(`/projects/${owner}/native-plans`, body);
    if (current !== epoch) return;
    await tasks();
    if (current !== epoch) return;
    setStatus(`对象计划已持久化：${data.task.attempt.state}。请从任务列表显式启动；未执行质量或权利验收。`);
  } catch (error) {
    if (current === epoch) setStatus(`计划提交未确认：${errMsg(error)}。内容不变时重试复用幂等键。`, true);
  } finally {
    planBusy = false;
    byId("plan-submit").disabled = false;
  }
};
byId("more-tasks").onclick = () => {
  void tasks(true).catch((e) => setStatus(errMsg(e), true));
};
byId("patch-form").onsubmit = async (event) => {
  event.preventDefault();
  if (patchBusy) return;
  const current = epoch;
  const owner = project;
  const source = patchSource;
  try {
    if (!source || source.owner !== owner) throw new Error("请先选择当前项目的 Illustrator 来源任务");
    const raw = byId("patch-json").value;
    if (raw.length > 9e5) throw new Error("局部修改过大");
    const body = { source_attempt_id: source.attempt, patch: JSON.parse(raw) };
    const identity = JSON.stringify({ source, body });
    if (!submittedPatch || submittedPatch.identity !== identity)
      submittedPatch = { identity, key: crypto.randomUUID() };
    body.idempotency_key = submittedPatch.key;
    patchBusy = true;
    byId("patch-submit").disabled = true;
    const data = await api(`/projects/${owner}/tasks/${source.job}/patch`, body);
    if (current !== epoch) return;
    await tasks();
    if (current !== epoch) return;
    setStatus(`局部修改已排队：${data.task.attempt.state} · 父版本 ${data.parent.version_id}。需显式启动，尚未执行或通过质量验收。`);
  } catch (error) {
    if (current === epoch) setStatus(`局部修改提交未确认：${errMsg(error)}。相同内容重试复用幂等键。`, true);
  } finally {
    patchBusy = false;
    byId("patch-submit").disabled = false;
  }
};
byId("more-events").onclick = () => {
  void loadEvents(eventJob, true).catch((e) => setStatus(errMsg(e), true));
};
byId("more-native").onclick = () => {
  void nativeAssets(true).catch((e) => setStatus(errMsg(e), true));
};
let chosenDirection = null;
let designRequest = 0;
let boundSystems = [];
let submittedBrief = null;
let submittedDirection = null;
let briefBusy = false;
let directionBusy = false;
let bindBusy = false;
const uuid = () => crypto.randomUUID();
async function loadDesignSystems() {
  const current = epoch;
  const data = await api("/design-systems");
  if (current !== epoch) return;
  boundSystems = data.design_systems;
  const select = byId("design-system");
  select.replaceChildren(new Option("选择设计系统", ""));
  for (const system of boundSystems) select.append(new Option(`${system.title} · ${system.version} (${system.evidence_level})`, system.name));
  byId("design-systems").replaceChildren(
    ...boundSystems.map((system) => {
      const li = document.createElement("li");
      li.textContent = `${system.name} · ${system.title} · v${system.version} · ${system.evidence_level}`;
      return li;
    })
  );
}
function renderDesignLayer(data) {
  const layer = data.design_layer;
  byId("design-briefs").replaceChildren(
    ...layer.briefs.map((brief) => {
      const li = document.createElement("li");
      li.textContent = `BRIEF · ${brief.title} · ${brief.goals.join(" / ")}${brief.constraints ? ` · ${brief.constraints}` : ""} · ${brief.spec_sha256}`;
      return li;
    })
  );
  byId("design-directions").replaceChildren(
    ...layer.directions.map((direction) => {
      const li = document.createElement("li");
      li.textContent = `DIRECTION · ${direction.title} · ${direction.chosen ? `CHOSEN by ${direction.actor}` : "open"} · ${direction.spec_sha256}`;
      if (direction.chosen) chosenDirection = direction;
      const button2 = document.createElement("button");
      button2.type = "button";
      button2.textContent = `选为方向 · ${direction.direction_id.slice(-8)}`;
      button2.onclick = () => chooseDirection(direction).catch((error) => setStatus(errMsg(error), true));
      li.append(document.createTextNode(" "), button2);
      return li;
    })
  );
  byId("design-bindings").replaceChildren(
    ...layer.bindings.length ? layer.bindings.map((binding) => {
      const li = document.createElement("li");
      li.textContent = `BINDING · ${binding.design_system_name} · ${binding.spec_sha256}`;
      return li;
    }) : [info("design-bindings-empty")]
  );
  const active = layer.active_binding;
  byId("design-binding-active").textContent = active ? `当前方向已绑定设计系统：${active.design_system_name}（设计契约已固定）。` : "选择方向并绑定设计系统后，后续 Build/Review 才有固定设计契约。";
}
function info(id) {
  const p = document.createElement("p");
  p.id = id;
  p.className = "empty";
  p.textContent = "尚未绑定设计系统。";
  return p;
}
async function refreshDesign() {
  if (!project) return;
  const current = epoch;
  const request = ++designRequest;
  setStatus("正在读取设计层：Brief / Direction / DesignSystem…");
  const data = await api(`/projects/${project}/design-layer`).catch((error) => {
    if (current !== epoch || request !== designRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== designRequest) return;
  chosenDirection = null;
  const briefSelect = byId("direction-brief");
  briefSelect.replaceChildren(new Option("选择简报", ""));
  for (const brief of data.design_layer.briefs)
    briefSelect.append(new Option(`${brief.title} · ${brief.brief_id.slice(-8)}`, brief.brief_id));
  renderDesignLayer(data);
  setStatus("设计层已读取。方向选择与绑定不代表制作完成或质量验收。");
}
async function submitBrief() {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const title = byId("brief-title").value;
  if (briefBusy) return;
  const goalsRaw = byId("brief-goals").value.trim();
  const goals = goalsRaw ? goalsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const constraints = byId("brief-constraints").value.trim() || null;
  if (!title || !goals.length) {
    setStatus("请填写简报标题与至少一条目标。", true);
    return;
  }
  const body = { title, goals, constraints, reference_asset_ids: [], idempotency_key: "" };
  const identity = JSON.stringify({ owner, title, goals, constraints });
  if (!submittedBrief || submittedBrief.owner !== owner || submittedBrief.identity !== identity)
    submittedBrief = { owner, identity, key: uuid() };
  body.idempotency_key = submittedBrief.key;
  briefBusy = true;
  byId("brief-submit").disabled = true;
  try {
    await api(`/projects/${owner}/briefs`, body);
    if (current !== epoch) return;
    byId("brief-title").value = "";
    byId("brief-goals").value = "";
    byId("brief-constraints").value = "";
    await refreshDesign();
    setStatus("简报已持久化；下一步在简报下立方向。");
  } catch (error) {
    if (current === epoch) setStatus(`简报未确认：${errMsg(error)}。相同内容重试复用幂等键。`, true);
  } finally {
    briefBusy = false;
    byId("brief-submit").disabled = false;
  }
}
async function submitDirection() {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  if (directionBusy) return;
  const brief = byId("direction-brief").value;
  const title = byId("direction-title").value.trim();
  const colorMood = byId("direction-color").value.trim() || null;
  const typeMood = byId("direction-type").value.trim() || null;
  if (!brief || !title) {
    setStatus("请选择简报并填写方向标题。", true);
    return;
  }
  const body = { brief_id: brief, title, style_notes: null, color_mood: colorMood, typography_mood: typeMood, idempotency_key: "" };
  const identity = JSON.stringify({ owner, brief, title, colorMood, typeMood });
  if (!submittedDirection || submittedDirection.owner !== owner || submittedDirection.identity !== identity)
    submittedDirection = { owner, identity, key: uuid() };
  body.idempotency_key = submittedDirection.key;
  directionBusy = true;
  byId("direction-submit").disabled = true;
  try {
    const data = await api(`/projects/${owner}/directions`, body);
    if (current !== epoch) return;
    byId("direction-title").value = "";
    await refreshDesign();
    setStatus(`方向已排队：${data.direction.direction_id.slice(-8)}。请选择该方向并绑定设计系统。`);
  } catch (error) {
    if (current === epoch) setStatus(`方向未确认：${errMsg(error)}。相同内容重试复用幂等键。`, true);
  } finally {
    directionBusy = false;
    byId("direction-submit").disabled = false;
  }
}
async function chooseDirection(direction) {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const actor = "workbench-user";
  const actorKind = "human";
  const body = { actor, actor_kind: actorKind, idempotency_key: uuid() };
  try {
    const data = await api(`/projects/${owner}/directions/${direction.direction_id}/choose`, body);
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
  const name = byId("design-system").value;
  const direction = chosenDirection;
  if (!name || !direction) {
    setStatus("请先选定方向，再选择要绑定的设计系统。", true);
    return;
  }
  const body = { design_system_name: name, idempotency_key: uuid() };
  bindBusy = true;
  byId("design-system-bind").disabled = true;
  try {
    const data = await api(`/projects/${owner}/directions/${direction.direction_id}/bind`, body);
    if (current !== epoch) return;
    await refreshDesign();
    setStatus(`设计系统已绑定：${data.binding.design_system_name}。设计契约已固定；制作与质量验收仍未执行。`);
  } catch (error) {
    if (current === epoch) setStatus(`设计系统绑定未确认：${errMsg(error)}`, true);
  } finally {
    bindBusy = false;
    byId("design-system-bind").disabled = false;
  }
}
byId("design-brief-form").onsubmit = (event) => {
  event.preventDefault();
  void submitBrief().catch((e) => setStatus(errMsg(e), true));
};
byId("design-direction-form").onsubmit = (event) => {
  event.preventDefault();
  void submitDirection().catch((e) => setStatus(errMsg(e), true));
};
byId("design-system-bind").onclick = () => {
  void bindDesignSystem().catch((e) => setStatus(errMsg(e), true));
};
