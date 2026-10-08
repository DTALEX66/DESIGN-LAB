let chosenDirection = null;
let designRequest = 0;
let boundSystems = [];
let submittedBrief = null;
let submittedDirection = null;
let briefBusy = false;
let directionBusy = false;
let bindBusy = false;
let revisionBriefTarget = null;
let revisionDirectionTarget = null;
let revisionBriefCarried = [];
let highlightBrief = null;
let highlightDirection = null;
let briefRevisionBusy = false;
let directionRevisionBusy = false;
let briefLineageRequest = 0;
let directionLineageRequest = 0;
const REVISION_BRIEF_IDLE = "在某一简报行点击「新版本」以载入该版本内容；保存会新增一个版本，不会改写旧版本。";
const REVISION_DIRECTION_IDLE = "在某一方向行点击「新版本」以载入该版本内容；保存会新增一个版本，不会改写旧版本。";
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
const shortId = (id) => id.slice(-8);
function versionOf(id, versions) {
  const known = versions.get(id);
  return known === void 0 ? `未知版本（${shortId(id)}）` : `版本 ${known}（${shortId(id)}）`;
}
function versionState(supersededBy, versions) {
  return supersededBy === null ? "当前" : `已取代 → ${versionOf(supersededBy, versions)}`;
}
function rowButton(label, action) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.onclick = () => Promise.resolve(action()).catch((error) => setStatus(errMsg(error), true));
  return element;
}
function renderDesignLayer(data) {
  const layer = data.design_layer;
  const briefVersions = /* @__PURE__ */ new Map();
  for (const row of layer.briefs) briefVersions.set(row.brief_id, row.version);
  const directionVersions = /* @__PURE__ */ new Map();
  const directionsById = /* @__PURE__ */ new Map();
  for (const row of layer.directions) {
    directionVersions.set(row.direction_id, row.version);
    directionsById.set(row.direction_id, row);
  }
  const activeBindingId = layer.active_binding ? layer.active_binding.binding_id : null;
  const focusRows = [];
  byId("design-briefs").replaceChildren(
    ...layer.briefs.map((brief) => {
      const li = document.createElement("li");
      li.tabIndex = -1;
      const refs = brief.reference_asset_ids.length;
      li.textContent = `BRIEF · ${brief.title} · ${brief.goals.join(" / ")}${brief.constraints ? ` · ${brief.constraints}` : ""} · 参考 ${refs} · v${brief.version} · ${versionState(brief.superseded_by, briefVersions)} · ${brief.spec_sha256}`;
      li.append(
        rowButton("新版本", () => loadBriefRevision(brief)),
        rowButton("版本链", () => loadBriefLineage(brief.brief_id))
      );
      if (brief.brief_id === highlightBrief) {
        li.classList.add("highlight");
        focusRows.push(li);
      }
      return li;
    })
  );
  byId("design-directions").replaceChildren(
    ...layer.directions.map((direction) => {
      const li = document.createElement("li");
      li.tabIndex = -1;
      const live = direction.superseded_by === null;
      li.textContent = `DIRECTION · ${direction.title} · ${direction.chosen ? `CHOSEN by ${direction.actor}` : "open"} · v${direction.version} · ${versionState(direction.superseded_by, directionVersions)} · 简报 ${shortId(direction.brief_id)} · ${direction.spec_sha256}`;
      if (direction.chosen && live) chosenDirection = direction;
      if (live) {
        const choose = document.createElement("button");
        choose.type = "button";
        choose.textContent = `选为方向 · ${shortId(direction.direction_id)}`;
        choose.onclick = () => chooseDirection(direction).catch((error) => setStatus(errMsg(error), true));
        li.append(choose);
      }
      li.append(
        rowButton("新版本", () => loadDirectionRevision(direction)),
        rowButton("版本链", () => loadDirectionLineage(direction.direction_id))
      );
      if (direction.direction_id === highlightDirection) {
        li.classList.add("highlight");
        focusRows.push(li);
      }
      return li;
    })
  );
  byId("design-bindings").replaceChildren(
    ...layer.bindings.length ? layer.bindings.map((binding) => {
      const li = document.createElement("li");
      const owner = directionsById.get(binding.direction_id);
      const state = binding.binding_id === activeBindingId ? "生效中" : owner && owner.superseded_by !== null ? "未生效 · 绑定留在已被取代的方向版本上，需重新建立" : "未生效 · 当前选定方向不是它";
      li.textContent = `BINDING · ${binding.design_system_name} · 绑定记录 v${binding.version} · 方向 ${shortId(binding.direction_id)} · ${state} · ${binding.spec_sha256}`;
      return li;
    }) : [info("design-bindings-empty")]
  );
  const notice = byId("design-binding-active");
  const active = layer.active_binding;
  const chosen = chosenDirection;
  if (active) {
    notice.classList.remove("warn");
    notice.textContent = `当前方向已绑定设计系统：${active.design_system_name}（设计契约已固定）。`;
  } else if (chosen && layer.bindings.length) {
    notice.classList.add("warn");
    notice.textContent = `当前选定方向「${chosen.title} · 版本 ${chosen.version}」没有生效的设计契约：已有的绑定记录仍留在旧的方向版本上，不会随新版本自动跟随——绑定需重新建立（选定设计系统后点「绑定设计系统」）。`;
  } else {
    notice.classList.remove("warn");
    notice.textContent = "选择方向并绑定设计系统后，后续 Build/Review 才有固定设计契约。";
  }
  if (focusRows.length) focusRows[0].focus();
}
function info(id) {
  const li = document.createElement("li");
  li.id = id;
  li.className = "empty";
  li.textContent = "尚未绑定设计系统。";
  return li;
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
  const references = selectedReferences();
  const body = { title, goals, constraints, reference_asset_ids: references, idempotency_key: "" };
  const identity = JSON.stringify({ owner, title, goals, constraints, references });
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
    for (const box of Array.from(document.querySelectorAll('input[name="reference-asset"]')))
      box.checked = false;
    await refreshDesign();
    setStatus(`简报已持久化（引用 ${references.length} 个参考素材）；下一步在简报下立方向。`);
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
function revisionHint(error) {
  const code = errMsg(error);
  if (code === "STALE_REVISION") return "该版本已被取代，服务端拒绝了这次修订（STALE_REVISION）。请从版本链里的最新版本继续。";
  if (code === "BRIEF_NOT_FOUND" || code === "DIRECTION_NOT_FOUND") return `该版本已不在当前项目中（${code}）；请刷新后重试。`;
  if (code === "UNAUTHORIZED") return "访问令牌无效或已过期（UNAUTHORIZED）；请断开后重新连接本机服务。";
  return `${code}；本次修订未被接受，服务端未写入任何内容。`;
}
function splitList(raw, maxLen, label) {
  const items = raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : [];
  if (items.some((item) => item.length > maxLen)) throw new Error(`${label}每项不能超过 ${maxLen} 个字符`);
  return items;
}
function loadBriefRevision(brief, focusForm = true) {
  revisionBriefTarget = brief;
  const boxes = Array.from(document.querySelectorAll('input[name="reference-asset"]'));
  const known = new Set(boxes.map((box) => box.value));
  for (const box of boxes) box.checked = brief.reference_asset_ids.includes(box.value);
  revisionBriefCarried = brief.reference_asset_ids.filter((id) => !known.has(id));
  byId("revision-brief-title").value = brief.title;
  byId("revision-brief-goals").value = brief.goals.join(", ");
  byId("revision-brief-constraints").value = brief.constraints ?? "";
  byId("revision-brief-target").textContent = `正在修订简报「${brief.title}」版本 ${brief.version}（${shortId(brief.brief_id)}）：内容已按该版本预填，勾选区对应它的参考素材。保存会新增一个版本，旧版本只保留为历史。` + (revisionBriefCarried.length ? `另有 ${revisionBriefCarried.length} 个参考素材不在当前勾选列表里，会原样保留。` : "") + (brief.superseded_by === null ? "" : " 注意：该版本已被取代，服务端会拒绝这次修订（STALE_REVISION），请改从版本链中的最新版本继续。");
  if (focusForm) byId("revision-brief-title").focus();
}
async function submitBriefRevision() {
  const current = epoch;
  const owner = project;
  const source = revisionBriefTarget;
  if (!owner || briefRevisionBusy) return;
  if (!source) {
    setStatus("请先在某一简报行点击「新版本」以载入要修订的内容。", true);
    return;
  }
  briefRevisionBusy = true;
  byId("brief-revision-submit").disabled = true;
  try {
    const title = byId("revision-brief-title").value.trim();
    const goals = splitList(byId("revision-brief-goals").value, 300, "目标");
    const constraints = byId("revision-brief-constraints").value.trim() || null;
    if (!title || !goals.length) throw new Error("修订需要标题与至少一条目标");
    const references = Array.from(/* @__PURE__ */ new Set([...selectedReferences(), ...revisionBriefCarried]));
    const data = await api(
      `/projects/${owner}/briefs/${source.brief_id}/revisions`,
      { title, goals, constraints, reference_asset_ids: references, idempotency_key: uuid() }
    );
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
    byId("brief-revision-submit").disabled = false;
  }
}
function loadDirectionRevision(direction, focusForm = true) {
  revisionDirectionTarget = direction;
  byId("revision-direction-title").value = direction.title;
  byId("revision-direction-notes").value = (direction.style_notes ?? []).join(", ");
  byId("revision-direction-color").value = direction.color_mood ?? "";
  byId("revision-direction-type").value = direction.typography_mood ?? "";
  byId("revision-direction-target").textContent = `正在修订方向「${direction.title}」版本 ${direction.version}（${shortId(direction.direction_id)}）：内容已按该版本预填。保存会新增一个版本，旧版本只保留为历史。` + (direction.chosen ? " 该版本是当前已选定方向：选定结论会随新版本带走，但设计系统绑定不会自动跟随，需重新建立。" : "") + (direction.superseded_by === null ? "" : " 注意：该版本已被取代，服务端会拒绝这次修订（STALE_REVISION），请改从版本链中的最新版本继续。");
  if (focusForm) byId("revision-direction-title").focus();
}
async function submitDirectionRevision() {
  const current = epoch;
  const owner = project;
  const source = revisionDirectionTarget;
  if (!owner || directionRevisionBusy) return;
  if (!source) {
    setStatus("请先在某一方向行点击「新版本」以载入要修订的内容。", true);
    return;
  }
  directionRevisionBusy = true;
  byId("direction-revision-submit").disabled = true;
  try {
    const title = byId("revision-direction-title").value.trim();
    const notes = splitList(byId("revision-direction-notes").value, 300, "表现备注");
    const colorMood = byId("revision-direction-color").value.trim() || null;
    const typeMood = byId("revision-direction-type").value.trim() || null;
    if (!title) throw new Error("修订需要方向标题");
    const data = await api(
      `/projects/${owner}/directions/${source.direction_id}/revisions`,
      { title, style_notes: notes.length ? notes : null, color_mood: colorMood, typography_mood: typeMood, idempotency_key: uuid() }
    );
    if (current !== epoch) return;
    highlightDirection = data.direction.direction_id;
    await refreshDesign();
    if (current !== epoch) return;
    await loadDirectionLineage(data.direction.direction_id);
    if (current !== epoch) return;
    loadDirectionRevision(data.direction, false);
    setStatus(`方向已保存为版本 ${data.direction.version}（${shortId(data.direction.direction_id)}）；版本 ${source.version} 只保留为历史。` + (data.direction.chosen ? ` 选定结论已随新版本带走（${data.direction.actor}）；设计系统绑定未跟随，绑定需重新建立。` : ""));
  } catch (error) {
    if (current === epoch) setStatus(`方向修订未确认：${revisionHint(error)}`, true);
  } finally {
    directionRevisionBusy = false;
    byId("direction-revision-submit").disabled = false;
  }
}
async function loadBriefLineage(briefId) {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const request = ++briefLineageRequest;
  setStatus("正在读取简报版本链…");
  const data = await api(`/projects/${owner}/briefs/${briefId}/lineage`).catch((error) => {
    if (current !== epoch || request !== briefLineageRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== briefLineageRequest) return;
  const versions = /* @__PURE__ */ new Map();
  for (const row of data.lineage.versions) versions.set(row.brief_id, row.version);
  const liveId = data.lineage.live_id;
  const live = liveId === null ? "—" : versionOf(liveId, versions);
  const first = data.lineage.versions.length ? data.lineage.versions[0] : null;
  byId("brief-lineage-title").textContent = `简报版本链 · 共 ${data.lineage.versions.length} 个版本 · 当前 ${live} · 起点 ${first ? `版本 ${first.version}` : "—"}`;
  byId("brief-lineage").replaceChildren(
    ...data.lineage.versions.map((row) => {
      const li = document.createElement("li");
      li.textContent = `版本 ${row.version} · ${versionState(row.superseded_by, versions)} · ${row.title} · ${row.goals.join(" / ")}${row.constraints ? ` · ${row.constraints}` : ""} · 参考 ${row.reference_asset_ids.length} · 记录于 ${row.created_at} · ${row.spec_sha256}`;
      return li;
    })
  );
  setStatus(`简报版本链已读回：共 ${data.lineage.versions.length} 个版本，当前 ${live}。`);
}
async function loadDirectionLineage(directionId) {
  const current = epoch;
  const owner = project;
  if (!owner) return;
  const request = ++directionLineageRequest;
  setStatus("正在读取方向版本链…");
  const data = await api(`/projects/${owner}/directions/${directionId}/lineage`).catch((error) => {
    if (current !== epoch || request !== directionLineageRequest) return null;
    throw error;
  });
  if (!data || current !== epoch || request !== directionLineageRequest) return;
  const versions = /* @__PURE__ */ new Map();
  for (const row of data.lineage.versions) versions.set(row.direction_id, row.version);
  const liveId = data.lineage.live_id;
  const live = liveId === null ? "—" : versionOf(liveId, versions);
  const first = data.lineage.versions.length ? data.lineage.versions[0] : null;
  byId("direction-lineage-title").textContent = `方向版本链 · 共 ${data.lineage.versions.length} 个版本 · 当前 ${live} · 起点 ${first ? `版本 ${first.version}` : "—"}`;
  byId("direction-lineage").replaceChildren(
    ...data.lineage.versions.map((row) => {
      const li = document.createElement("li");
      li.textContent = `版本 ${row.version} · ${versionState(row.superseded_by, versions)} · ${row.title} · ${row.chosen ? `已选定（${row.actor}）` : "未选定"} · 色彩 ${row.color_mood ?? "未指定"} · 字体 ${row.typography_mood ?? "未指定"} · 记录于 ${row.created_at} · ${row.spec_sha256}`;
      return li;
    })
  );
  setStatus(`方向版本链已读回：共 ${data.lineage.versions.length} 个版本，当前 ${live}。`);
}
function resetDesignRevision() {
  revisionBriefTarget = revisionDirectionTarget = null;
  revisionBriefCarried = [];
  highlightBrief = highlightDirection = null;
  byId("revision-brief-target").textContent = REVISION_BRIEF_IDLE;
  byId("revision-direction-target").textContent = REVISION_DIRECTION_IDLE;
  byId("brief-lineage-title").textContent = "";
  byId("direction-lineage-title").textContent = "";
  byId("design-binding-active").textContent = "";
}
const byId = (id) => document.getElementById(id);
let token = "";
let connected = false;
let connectGeneration = 0;
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
  const el2 = byId("status");
  el2.textContent = text;
  el2.classList.toggle("error", error);
  const main = typeof document.querySelector === "function" ? document.querySelector("body > main") : null;
  if (main && main.hidden) {
    const live = document.querySelector(".sr-status");
    if (live) live.textContent = text;
  }
};
const errMsg = (error) => error instanceof Error ? error.message : String(error);
const dropSession = () => {
  token = "";
  connected = false;
  const badge = byId("connection");
  if (badge) badge.textContent = "未连接";
};
async function api(path, body) {
  let response;
  try {
    response = await fetch("/api" + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: "Bearer " + token, ...body ? { "Content-Type": "application/json" } : {} },
      ...body ? { body: JSON.stringify(body) } : {},
      cache: "no-store"
    });
  } catch (error) {
    throw new Error(`无法连接本机设计服务（${errMsg(error)}）`);
  }
  let value;
  try {
    value = await response.json();
  } catch (error) {
    throw new Error(`服务回复无法解析（HTTP ${response.status}，${errMsg(error)}）`);
  }
  if (response.status === 401) dropSession();
  if (!response.ok) {
    if (value.error === "PROJECT_PATH_TOO_LONG")
      throw new Error("项目路径过长，Windows 无法保存。请将项目放在较短的目录后重试。");
    const failure = new Error(value.error || "SERVICE_ERROR");
    failure.serviceEnvelope = value;
    throw failure;
  }
  return value;
}
function setListNotice(listId, text) {
  const list = byId(listId);
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = text;
  list.replaceChildren(li);
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
  for (const id of [
    "assets",
    "tasks",
    "events",
    "native-assets",
    "reference-picker",
    "design-briefs",
    "design-directions",
    "design-bindings",
    "brief-lineage",
    "direction-lineage"
  ])
    byId(id).replaceChildren();
  resetDesignRevision();
  for (const id of ["preview", "retry-import", "more-tasks", "more-events", "more-native"]) byId(id).hidden = true;
  byId("preview").removeAttribute("src");
  byId("preview-empty").hidden = false;
  byId("asset-info").textContent = "";
}
async function projects() {
  const data = await api("/projects");
  byId("project").replaceChildren(new Option("选择项目", ""));
  for (const p of data.projects) byId("project").append(new Option(p.name, p.id));
  if (!project) {
    let remembered = "";
    try {
      remembered = window.localStorage.getItem("design-lab:active-project") || "";
    } catch {
    }
    if (data.projects.some((p) => p.id === remembered)) project = remembered;
    else if (data.projects.length === 1) project = data.projects[0].id;
  }
  if (data.projects.some((p) => p.id === project)) byId("project").value = project;
}
function rememberProject$1() {
  try {
    window.localStorage.setItem("design-lab:active-project", project);
  } catch {
  }
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
  if (!append && !data.tasks.length) setListNotice("tasks", "尚无任务。导入图片后可查看真实记录。");
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
  populateReferencePicker(data.assets.map((asset) => asset.id));
  setStatus("已读取持久化状态。参考素材权利仍需审查。");
}
function populateReferencePicker(assetIds) {
  const picker = byId("reference-picker");
  const selected = new Set(typeof document.querySelectorAll === "function" ? selectedReferences() : []);
  picker.replaceChildren();
  if (!assetIds.length) {
    const li = document.createElement("li");
    li.textContent = "尚未导入参考素材。先导入 PNG/JPEG，再回来为简报勾选。";
    picker.append(li);
    return;
  }
  for (const id of assetIds) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.name = "reference-asset";
    box.value = id;
    box.checked = selected.has(id);
    label.append(box, document.createTextNode(" " + id));
    li.append(label);
    picker.append(li);
  }
}
function selectedReferences() {
  return Array.from(document.querySelectorAll('input[name="reference-asset"]:checked')).map((el2) => el2.value);
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
  if (!append && !data.assets.length) setListNotice("native-assets", "暂无已登记的 AI/PSD。");
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
async function connectLocalService(submittedToken = "") {
  const generation = ++connectGeneration;
  if (!submittedToken) {
    setStatus("正在连接本机设计服务…");
    try {
      const response = await fetch("/api/local-session", { cache: "no-store", signal: AbortSignal.timeout(8e3) });
      if (!response.ok) throw new Error("本机服务未开启自动连接，请使用官方 workbench 启动入口。");
      const session = await response.json();
      if (generation !== connectGeneration) return;
      submittedToken = session.token || "";
    } catch (error) {
      if (generation !== connectGeneration) return;
      setStatus(errMsg(error), true);
      return;
    }
  }
  if (!/^[0-9a-f]{64}$/.test(submittedToken)) {
    token = "";
    connected = false;
    setStatus("访问令牌格式不正确。", true);
    return;
  }
  token = submittedToken;
  try {
    await projects();
    if (generation !== connectGeneration || token !== submittedToken) return;
    connected = true;
    byId("login").hidden = true;
    byId("workspace").hidden = false;
    byId("connection").textContent = "本机已连接";
    setStatus("选择或新建项目。");
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function")
      window.dispatchEvent(new Event("hashchange"));
    if (project) {
      resetProject();
      void Promise.all([refresh(), loadDesignSystems(), refreshDesign()]).catch((error) => setStatus(`已连接，项目读回失败：${errMsg(error)}`, true));
    }
  } catch (error) {
    if (generation !== connectGeneration || token !== submittedToken) return;
    token = "";
    connected = false;
    setStatus(errMsg(error), true);
  }
}
byId("connect-form").onsubmit = async (event) => {
  event.preventDefault();
  const submittedToken = byId("token").value;
  byId("token").value = "";
  await connectLocalService(submittedToken);
};
byId("disconnect").onclick = () => {
  connectGeneration += 1;
  token = "";
  connected = false;
  project = "";
  resetProject();
  byId("workspace").hidden = true;
  byId("login").hidden = false;
  byId("connection").textContent = "未连接";
  setStatus("已清除页面内存中的访问令牌。");
};
byId("project").onchange = () => {
  project = byId("project").value;
  rememberProject$1();
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
let creatingProject = false;
byId("create-form").onsubmit = async (event) => {
  event.preventDefault();
  if (creatingProject) return;
  creatingProject = true;
  const form = byId("create-form");
  const submit = typeof form.querySelector === "function" ? form.querySelector("button") : null;
  if (submit) submit.disabled = true;
  try {
    const data = await api("/projects", { name: byId("project-name").value });
    project = data.project.id;
    rememberProject$1();
    resetProject();
    await projects();
    byId("project-name").value = "";
    await refresh();
  } catch (error) {
    setStatus(errMsg(error), true);
  } finally {
    creatingProject = false;
    if (submit) submit.disabled = false;
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
function devMode() {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (typeof document.querySelectorAll === "function" && document.querySelectorAll('script[src*="@vite/client"]').length > 0) return true;
  try {
    const qs = window.location.search;
    if (typeof qs === "string" && qs.includes("dev=1")) return true;
  } catch {
  }
  return false;
}
const SHAPE_MISSING = Symbol.for("design-lab/shape-missing");
const DISCONNECTED = Symbol.for("design-lab/disconnected");
function normaliseShape(live, template, prefix = "") {
  if (template === null || typeof template !== "object") return [];
  const missing = [];
  for (const [key, want] of Object.entries(template)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(want)) {
      if (!Array.isArray(live[key])) {
        live[key] = [];
        missing.push(field);
      }
    } else if (want !== null && typeof want === "object") {
      if (live[key] === null || typeof live[key] !== "object") {
        live[key] = {};
        missing.push(field);
      }
      missing.push(...normaliseShape(live[key], want, field));
    }
  }
  return missing;
}
function apiOrEmpty(path, empty) {
  if (!token && devMode()) return Promise.resolve(markDisconnected(empty));
  return api(path).then((live) => {
    const missing = normaliseShape(live, empty);
    if (missing.length) Object.defineProperty(live, SHAPE_MISSING, { value: missing, enumerable: false });
    return live;
  });
}
function shapeNoticeRows(...values) {
  const notes = values.map(shapeNotice).filter(Boolean);
  return notes.length ? [el("p", { class: "error" }, notes.join("；"))] : [];
}
function shapeNotice(value) {
  const missing = value?.[SHAPE_MISSING];
  return Array.isArray(missing) && missing.length ? `未读回：响应缺少 ${missing.join("、")}` : "";
}
function shapeFieldMissing(value, field) {
  const missing = value?.[SHAPE_MISSING];
  return Array.isArray(missing) && missing.includes(field);
}
function markDisconnected(payload) {
  const mark = (target) => {
    Object.defineProperty(target, DISCONNECTED, { value: true, enumerable: false });
  };
  mark(payload);
  for (const value of Object.values(payload)) {
    if (value !== null && typeof value === "object") mark(value);
  }
  return payload;
}
function disconnectedNotice(value) {
  return value?.[DISCONNECTED] === true ? "未读回：未连接本机设计服务" : "";
}
function emptyWording(value, noun, hint) {
  const offline = disconnectedNotice(value);
  return offline ? ["未读回", offline] : [noun, hint];
}
function emptyLi(value, noun, hint) {
  const [head, note] = emptyWording(value, noun, hint);
  return el("li", { class: "list-item" }, el("div", {}, el("strong", {}, head), el("small", {}, note)));
}
function emptyTd(value, noun, hint, colspan) {
  const [head, note] = emptyWording(value, noun, hint);
  return el("td", { colspan: String(colspan) }, `${head} ${note}`);
}
const OFFLINE = {
  health: { status: "UNKNOWN", version: "—", scope: "dev-offline" },
  projects: { projects: [] },
  designSystems: { design_systems: [] },
  tokenDocuments: { token_documents: [] },
  capabilities: {
    schemaVersion: "design-lab/capability-library/v1",
    meaning: "未连接本机设计服务",
    unmeasuredMeans: "null = 未判定，不是 0",
    counts: { total: 0, byKind: {}, byLicense: {}, byRevisionState: {}, qualified: 0 },
    sources: {},
    capabilities: []
  },
  // The domain readback's honest empty: the counts are zero because nothing was read,
  // and rootState / checker.state say WHY instead of leaving a blank the page would
  // have to guess at. `validationVocabulary` is the service's own declaration of its
  // closed verdict set, so it is NOT filled in here: inventing it offline would put
  // words on the screen that no readback produced. The tally rows are built from
  // `counts.byValidation`, which is empty for exactly this reason.
  domains: {
    schemaVersion: "design-lab/domain-pack-readback/v1",
    meaning: "未连接本机设计服务",
    unmeasuredMeans: "null = 未声明 / 未判定，不是 0",
    root: "design-lab/domain-packs",
    rootState: "NOT_READ",
    validationVocabulary: [],
    checker: {
      path: "design-lab/scripts/verify_domain_pack_v2.py",
      state: "NOT_READ",
      note: "未连接本机设计服务"
    },
    sources: {},
    counts: { packs: 0, byValidation: {} },
    packs: []
  },
  tasks: { tasks: [], next_cursor: null },
  bundles: { bundles: [] },
  designLayer: {
    design_layer: {
      briefs: [],
      directions: [],
      chosen_direction: null,
      bindings: [],
      active_binding: null,
      design_systems: []
    }
  },
  environment: {
    schemaVersion: "v1",
    status: "OFFLINE",
    project_root: "—",
    project_local_root: ".project-local",
    sources: {},
    roots: {},
    shared_inputs: {},
    agent_profile: { status: "DISABLED", writable: false },
    write_trace: "NONE",
    migration: "NONE"
  }
};
const ROUTE_VIEWS = [
  { hash: "", view: "workbench", label: "工作台" },
  { hash: "#/dashboard", view: "dashboard", label: "仪表盘" },
  { hash: "#/projects", view: "projects", label: "项目" },
  { hash: "#/research", view: "research", label: "研究洞察" },
  { hash: "#/brand-systems", view: "brand-systems", label: "品牌系统" },
  { hash: "#/domains", view: "design-domains", label: "设计领域" },
  { hash: "#/tools", view: "creative-tools", label: "创作工具" },
  { hash: "#/preflight", view: "preflight-qa", label: "预检 / QA" },
  { hash: "#/deliverables", view: "deliverables", label: "交付中心" },
  { hash: "#/evidence", view: "evidence", label: "证据系统" },
  { hash: "#/collaboration", view: "collaboration", label: "团队协作" },
  { hash: "#/settings", view: "settings", label: "系统设置" }
];
function viewLabel(view) {
  return ROUTE_VIEWS.find((route) => route.view === view)?.label ?? view;
}
const PROJECT_DETAIL_RE = /^#\/projects\/([^/?#]+)$/;
const PROJECT_ID_RE = /^[0-9a-f]{32}$/;
function projectDetailId(hash) {
  const m = PROJECT_DETAIL_RE.exec(hash);
  if (!m || !m[1]) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(m[1]);
  } catch {
    return null;
  }
  return PROJECT_ID_RE.test(decoded) ? decoded : null;
}
function projectDetailHash(id) {
  return "#/projects/" + encodeURIComponent(id);
}
const VIEW_NOT_OPEN = {
  // 'research' left this table on 2026-10-08: GET/POST /api/projects/{id}/research is dispatched
  // by src/design_lab/http_service.py and renderResearch reads it back. A slot that has a route
  // may not keep a "no route" notice -- design-lab/scripts/verify_capability_self_description.py
  // now refuses the pair.
  "collaboration": "团队协作页未开放：本地单机服务尚无协作路由（本地单用户模型）。"
};
const CAPABILITY_REGISTRY = [
  {
    capabilityId: "research-insights",
    domain: "研究洞察",
    source: "IA 槽位 #/research",
    owner: "DESIGN-LAB design core",
    route: "GET /api/projects/{id}/research",
    slot: "research",
    contractRef: "design-lab/schemas/research-finding.schema.json · design-lab/schemas/state/design-lab-state-research-v1.sql · src/design_lab/assurance/research_store.py · src/design_lab/research_review.py",
    implementationState: "IMPLEMENTED",
    permission: "brief/reference 已持久化（/api/projects/{id}/assets 已有）",
    reason: "读回路由已落地：本项目已持久化的研究结论、来源覆盖与置信度分布由该路由给出，空读回说成空读回而不是 0 条判定。仍未闭合的是结论本身的验收——一条研究结论不证明设计质量，也不是知识导出，页面与服务端都不给完成词。",
    nextAction: "按 E2+ 用真实 brief 走一遍「采集→落库→读回→取代」，并把结论送入既有的 Direction/Quality 门；UI 读回无需再改。"
  },
  {
    capabilityId: "design-domain-model",
    domain: "设计领域",
    source: "IA 槽位 #/domains",
    owner: "DESIGN-LAB Domain Pack",
    route: "GET /api/domains",
    contractRef: "design-lab/schemas/domain-pack.schema.json · design-lab/domain-packs/DOMAIN_PACK_SPEC_V2.md · design-lab/scripts/verify_domain_pack_v2.py · src/design_lab/domain_packs.py",
    implementationState: "IMPLEMENTED",
    permission: "域包目录与 manifest 为仓内已提交记录（E1 结构级）；本视图只读回，不安装、不生成、不判定设计质量",
    reason: "读回路由已落地：页面列出 design-lab/domain-packs 下真实存在的目录，并逐包给出仓内校验器自己的判定与原因。仍未闭合的是能力验收本身——仍有目录声明 workflow/domain-pack/v1 而被 Spec V2 校验器拒绝，具体数量与目录名由路由给出，不在 UI 侧写死。",
    nextAction: "把仍处 v1 的域包补齐到 Spec V2 十要素，并按 E2+ 做宿主与设计质量验收；UI 读回无需再改。"
  },
  {
    capabilityId: "host-adapter-live",
    domain: "创作工具（宿主实时状态）",
    source: "IA 槽位 #/tools",
    owner: "Host/Tool Adapter 层",
    route: "GET /api/projects/{id}/tasks（已有）+ 宿主探测路由（缺）",
    contractRef: "src/design_lab/native_assets.py Bundles；宿主 adapter 合同",
    implementationState: "BLOCKED",
    permission: "宿主（Illustrator/Photoshop 等）需以官方插件/CLI/MCP 形态接入；UI 只读回，不触发实操",
    reason: "后端尚无宿主在线探测路由；任务台账可读回，但宿主是否在线/可执行只能 UNKNOWN。",
    nextAction: "在 adapter 层增加宿主探测读回路由（官方接入后），UI 替换 UNKNOWN 占位。"
  },
  {
    capabilityId: "mcp-diagnostics",
    domain: "MCP 诊断",
    source: "任务包 2026-09-30（新增）",
    owner: "MCP 工具层",
    route: "GET /api/mcp/…（缺）",
    contractRef: "无现有 MCP 后端路由",
    implementationState: "BLOCKED",
    permission: "需本机 MCP 运行时 + 服务路由",
    reason: "当前后端不暴露 MCP 状态；不安装、不假报可用。",
    nextAction: "后端提供 MCP 读回路由后 UI 接入；在此之前 UI 只标注 BLOCKED。"
  },
  {
    capabilityId: "collaboration",
    domain: "团队协作",
    source: "IA 槽位 #/collaboration",
    owner: "（超出当前范围）",
    route: "无（单用户模型）",
    contractRef: "AGENTS.md：本地单用户服务，无协作路由",
    implementationState: "PLANNED",
    permission: "需要多用户/权限模型先立项",
    reason: "本地单用户模型；协作是后续独立立项，不做假入口。",
    nextAction: "立项协作模型后再评估路由与页面。"
  }
];
function capabilityCard(c) {
  return el(
    "div",
    { class: "panel capability-card", dataset: { capability: c.capabilityId } },
    el(
      "div",
      {},
      el("h3", {}, c.domain),
      el(
        "div",
        { class: "status-stack" },
        // style.css establishes `.tag.neutral` for exactly this: a non-verdict must not
        // borrow the weight of a verdict. PLANNED says "no answer yet", so it gets the
        // outline pill the dashboard blueprint cards already use -- and IMPLEMENTED,
        // which this call site would otherwise have painted the same `info` blue, is a
        // real verdict and gets the affirmative one.
        el(
          "span",
          { class: "tag " + (c.implementationState === "BLOCKED" ? "warn" : c.implementationState === "IMPLEMENTED" ? "ok" : "neutral") },
          en(c.implementationState)
        )
      )
    ),
    el("p", { class: "muted" }, c.reason),
    el(
      "details",
      { class: "advanced" },
      el("summary", {}, "接入明细"),
      el(
        "div",
        { class: "advanced-body" },
        el("p", { class: "view-hint" }, `状态来源：${c.source}`),
        el("p", { class: "view-hint" }, `所需条件：${c.permission}`),
        el("p", { class: "view-hint" }, `工程落点：${c.route}（${c.contractRef}）`),
        el("p", { class: "view-hint" }, `下一动作：${c.nextAction}`)
      )
    )
  );
}
function buildVersionRing(versions) {
  if (versions.length <= 1) return null;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "version-ring");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `方向版本环：${versions.length} 个版本`);
  const cx = 60, cy = 60, r = 46;
  const orbit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  orbit.setAttribute("class", "version-ring-orbit");
  orbit.setAttribute("cx", String(cx));
  orbit.setAttribute("cy", String(cy));
  orbit.setAttribute("r", String(r));
  orbit.setAttribute("fill", "none");
  svg.append(orbit);
  versions.forEach((v, i) => {
    const n = Math.max(versions.length, 1);
    const angle = i / n * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("class", "version-ring-node" + (v.chosen ? " is-chosen" : ""));
    node.setAttribute("cx", x.toFixed(2));
    node.setAttribute("cy", y.toFixed(2));
    node.setAttribute("r", v.chosen ? "6" : "4");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `v${v.version}` + (v.chosen ? "（选定）" : "") + (v.superseded_by ? " · 已被取代" : "");
    node.append(title);
    svg.append(node);
  });
  return svg;
}
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === void 0) continue;
    if (key === "class") node.className = String(value);
    else if (key === "dataset") for (const [dk, dv] of Object.entries(value)) node.dataset[dk] = String(dv);
    else if (key.startsWith("on") || key === "type" || key === "value" || key === "placeholder")
      node[key] = value;
    else if (key === "style" && node.style) node.style.cssText = String(value);
    else node.setAttribute(key, String(value));
  }
  node.append(...children);
  return node;
}
function en(text) {
  return el("span", { lang: "en" }, text);
}
function sharedInputRows(response, limit = 4) {
  const entries = Object.entries(response.shared_inputs).slice(0, limit);
  if (!entries.length) return [emptyLi(response, "尚无外置输入", "服务未返回 shared_inputs")];
  return entries.map(([name, input]) => el(
    "li",
    { class: "list-item" },
    el("div", {}, el("strong", {}, name), el("small", {}, input.path)),
    el("span", {
      class: input.status === "MISSING" ? "tag bad" : input.status === "DECLARED_NOT_PROBED" ? "tag warn" : "tag ok"
    }, en(input.status))
  ));
}
function kpiCard(value, label, note, trend) {
  const unread = !token && value === "0";
  const shown = unread ? "—" : value;
  const isText = !/^\d[\d,]*(?:\.\d+)?$/.test(shown);
  const children = [
    el("strong", { dataset: { count: shown }, class: isText ? "is-text" : null }, shown),
    el("small", {}, label)
  ];
  const trendText = unread ? "未读回：未连接本机设计服务" : note;
  if (trendText) children.push(el("div", { class: "trend" }, trendText));
  return el("div", { class: "panel kpi" }, ...children);
}
function animateKpiCount(el2) {
  const raw = el2.dataset.count;
  if (raw === void 0) return;
  if (!/^\d+(\.\d+)?$/.test(raw)) return;
  const target = parseFloat(raw);
  if (Number.isNaN(target)) return;
  if (typeof performance === "undefined" || typeof requestAnimationFrame !== "function") return;
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const suffix = el2.dataset.suffix ?? "";
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  const duration = 850;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el2.textContent = (target * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function stateMachineStepper() {
  const stages = ["brief", "research", "designing", "review", "qa", "approved", "delivered", "archived"];
  const ol = el("ol", { class: "state-machine", "aria-label": "设计域状态机（契约可视化，不代表项目进度）" });
  for (const stage of stages) ol.append(el("li", { class: "state-machine-step", dataset: { state: stage } }, en(stage)));
  return ol;
}
const FAILED_STATES = /* @__PURE__ */ new Set(["FAILED", "TIMED_OUT", "CANCELLED"]);
const HUMAN_STATES = /* @__PURE__ */ new Set(["OUTCOME_UNKNOWN", "CANCEL_REQUESTED", "RECONCILING"]);
const IN_FLIGHT_STATES = /* @__PURE__ */ new Set(["PENDING", "RUNNING"]);
function taskTriage(state) {
  if (FAILED_STATES.has(state)) return "failed";
  if (HUMAN_STATES.has(state)) return "needs_human";
  if (IN_FLIGHT_STATES.has(state)) return "in_flight";
  if (state === "RECEIPTED") return "done";
  return "unknown";
}
const RECENT_KEY = "design-lab.recent-projects";
const RECENT_MAX = 8;
function recentProjectIds() {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}
function rememberProject(id) {
  if (!id) return;
  try {
    const next = [id, ...recentProjectIds().filter((v) => v !== id)].slice(0, RECENT_MAX);
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
  }
}
async function renderDashboard(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回服务状态…"));
  const [health, projects2, systems, environment] = await Promise.all([
    apiOrEmpty("/health", OFFLINE.health),
    apiOrEmpty("/projects", OFFLINE.projects),
    apiOrEmpty("/design-systems", OFFLINE.designSystems),
    apiOrEmpty("/environment", OFFLINE.environment)
  ]);
  const probeIds = projects2.projects.slice(0, 6).map((p) => p.id);
  const probes = await Promise.all(probeIds.map(async (pid) => {
    const taskResult = { res: null, err: null };
    const bundleResult = { res: null, err: null };
    try {
      taskResult.res = await api(`/projects/${pid}/tasks`);
    } catch (e) {
      taskResult.err = e;
    }
    try {
      bundleResult.res = await api(`/projects/${pid}/bundles`);
    } catch (e) {
      bundleResult.err = e;
    }
    return { pid, taskResult, bundleResult };
  }));
  const readable = probes.filter((p) => p.taskResult.res !== null).length;
  const triageRows = probes.flatMap((p) => (p.taskResult.res?.tasks ?? []).map((t) => {
    const byAttempt = taskTriage(t.attempt.state);
    return {
      project: projects2.projects.find((x) => x.id === p.pid)?.name ?? p.pid,
      kind: t.kind,
      state: t.state,
      attempt: t.attempt.state,
      bucket: byAttempt !== "unknown" ? byAttempt : taskTriage(t.state),
      pid: p.pid
    };
  }));
  const bundlesReadable = probes.filter((p) => p.bundleResult.res !== null).length;
  const activeProductionRows = triageRows.filter((r) => r.bucket === "in_flight");
  const allBundles = probes.flatMap(
    (p) => (p.bundleResult.res?.bundles ?? []).map((b) => ({
      ...b,
      project: projects2.projects.find((x) => x.id === p.pid)?.name ?? p.pid,
      pid: p.pid
    }))
  );
  const bundleHeading = !probes.length ? "交付包（台账无项目可读）" : bundlesReadable === probes.length ? `交付包（${allBundles.length}）` : `交付包（未读回 ${probes.length - bundlesReadable}/${probes.length} 项目）`;
  const sysCount = systems.design_systems.length;
  const projCount = projects2.projects.length;
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "仪表盘"),
      el("p", {}, "项目、品牌、预检与交付已可读回；研究、设计领域、协作尚未开放（见能力登记表）。")
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", {
        type: "button",
        class: "primary-btn",
        onclick: () => {
          window.location.hash = "";
        }
      }, "+ 新建项目")
    )
  );
  const grid = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(projCount), "项目", "服务端项目台账读回，非统计猜测"),
    kpiCard(String(sysCount), "设计系统", "资源登记的设计系统总数 · 服务端目录读回"),
    kpiCard(health.status, "服务状态", `版本 ${health.version} · 作用域 ${health.scope}`),
    kpiCard(health.version, "服务版本", "服务自检读回")
  );
  for (const v of grid.querySelectorAll("strong[data-count]")) {
    const text = v.textContent;
    if (text !== null && /^\d+$/.test(text)) v.dataset.count = text;
  }
  const systemsList = el(
    "ul",
    { class: "items-chips", "data-view-item": "brand" },
    ...systems.design_systems.map((system) => el(
      "li",
      {},
      `${system.name} · ${system.title} · v${system.version} · 证据 ${system.evidence_level}`
    ))
  );
  const recent = [...projects2.projects].sort((a, b) => {
    const rank = recentProjectIds();
    const ra = rank.indexOf(a.id);
    const rb = rank.indexOf(b.id);
    return (ra < 0 ? Number.MAX_SAFE_INTEGER : ra) - (rb < 0 ? Number.MAX_SAFE_INTEGER : rb);
  }).slice(0, 6);
  const recentIds = recentProjectIds();
  const recentPanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, "最近项目"),
    el(
      "ul",
      { class: "list" },
      ...recent.length ? recent.map((p) => el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, p.name),
          el("small", {}, p.id)
        ),
        el("span", { class: "tag info" }, recentIds.includes(p.id) ? "最近打开" : "已登记")
      )) : [emptyLi(projects2, "尚无项目", "在工作台新建项目后读回此处")]
    ),
    el("p", { class: "view-hint" }, recentIds.length ? "按本机最近打开的项目排序（仅保存项目 id 于本机，不上传）。" : "本机尚未记录打开过的项目，暂按服务返回顺序显示。")
  );
  const trendPanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, "设计质量趋势 · 未读回"),
    el("p", { class: "view-hint" }, "无质量读回路由（见能力登记表 quality / Human Jury）；不以演示序列充当评分。")
  );
  const researchCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === "research-insights");
  const deliveryCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === "design-domain-model");
  const modulePanels = el(
    "div",
    { class: "three-col", style: "margin-top:16px" },
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "Research"),
      el("div", { class: "muted" }, "研究洞察模块：真实读回待接入，未接入前显式 UNKNOWN。")
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "Brand"),
      el("div", { class: "muted" }, `品牌系统：目录登记 ${sysCount} 个设计系统（服务端目录读回，全局目录而非本项目状态）。`)
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "Delivery"),
      el("div", { class: "muted" }, "交付中心：按任务读回，未打包不宣称交付完成。")
    )
  );
  const blueprintCards = el(
    "div",
    { class: "three-col", style: "margin-top:16px" },
    ...researchCard ? [capabilityCard(researchCard)] : [],
    ...deliveryCard ? [capabilityCard(deliveryCard)] : [],
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "协作"),
      el(
        "div",
        { class: "status-stack" },
        el("span", { class: "tag neutral" }, en("PLANNED")),
        el("small", {}, "本地单用户模型，无协作路由")
      ),
      el("p", { class: "view-hint" }, "协作是后续独立立项；不建假入口，标签保持 feature-gated。")
    )
  );
  const triagePanel = (bucket, title, emptyText) => {
    const rows = triageRows.filter((r) => r.bucket === bucket);
    const body = readable === 0 ? el("ul", { class: "list" }, el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, "未读回"),
        el("small", {}, "服务不可达或未连接；此处不显示 0，避免把「没读到」说成「没有」。")
      )
    )) : el(
      "ul",
      { class: "list" },
      ...rows.length ? rows.map((r) => el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `${r.project} · ${r.kind}`),
          el("small", {}, `attempt.state=${r.attempt} · job.state=${r.state}`)
        ),
        el("span", { class: bucket === "failed" ? "tag bad" : "tag warn" }, r.attempt)
      )) : [el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, emptyText),
          el("small", {}, `已读回 ${readable}/${probeIds.length} 个项目的任务`)
        )
      )]
    );
    return el("div", { class: "panel" }, el("h3", {}, readable === 0 ? title : `${title}（${rows.length}）`), body);
  };
  const continueId = recentProjectIds()[0];
  const continueProj = continueId ? projects2.projects.find((p) => p.id === continueId) : void 0;
  const continuePanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, "继续项目"),
    el("ul", { class: "list" }, continueProj ? el(
      "li",
      { class: "list-item" },
      el("div", {}, el("strong", {}, continueProj.name), el("small", {}, `本机最近打开 · ${continueProj.id}`)),
      el(
        "div",
        { class: "actions" },
        el("button", {
          type: "button",
          class: "primary-btn",
          id: "pd-continue",
          onclick: () => {
            window.location.hash = `#/projects/${encodeURIComponent(continueProj.id)}`;
          }
        }, "继续")
      )
    ) : el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, "尚无「继续项目」"),
        el("small", {}, "在本机打开过某个项目后，这里会显示最近打开的那一个。")
      )
    ))
  );
  target.replaceChildren(
    pageHead,
    grid,
    el("div", { class: "two-col", style: "margin-top:16px" }, recentPanel, trendPanel),
    modulePanels,
    // Pack 01_RESEARCH_AND_PRODUCT §101: the home page should offer 「继续项目」. It is
    // derived from the SAME local recency record the 最近项目 panel uses (project ids only,
    // kept on this machine, never uploaded), and it is honest when there is nothing to
    // continue rather than pointing at an arbitrary project.
    continuePanel,
    el(
      "div",
      { class: "two-col", style: "margin-top:16px" },
      triagePanel("needs_human", "待审（需人工处理）", "无待审任务"),
      triagePanel("failed", "失败", "无失败任务")
    ),
    ...shapeNoticeRows(environment, health, projects2, systems)
  ), // 2026-09-30 — 活跃生产 + 最近交付 + Host/Capability 状态 + Quick Launch。
  // 全部来自真实读回：活跃生产 = in_flight triage；最近交付 = /bundles 读回；
  // Host 状态 = /environment shared_inputs + 能力登记表（诚实 UNKNOWN 占位，
  // 不做假探测）；Quick Launch = 跳转各视图的一行直达。
  el(
    "div",
    { class: "two-col", style: "margin-top:16px" },
    el(
      "div",
      { class: "panel" },
      el("h3", {}, `活跃生产（${activeProductionRows.length}）`),
      el(
        "ul",
        { class: "list" },
        ...activeProductionRows.length ? activeProductionRows.map((r) => el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, `${r.project} · ${r.kind}`),
            el("small", {}, `job.state=${r.state} · attempt=${r.attempt}`)
          ),
          // PENDING has not started (job_store requires PENDING -> RUNNING
          // before adapter dispatch), so the pill carries the real state
          // instead of claiming 运行中 for both.
          el("span", { class: "tag warn" }, r.attempt)
        )) : [el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, readable === 0 ? "未读回" : "无运行中任务"),
            el("small", {}, readable === 0 ? "服务不可达或未连接；此处不显示 0，避免把「没读到」说成「没有」。" : "运行中任务为 PENDING / RUNNING 状态（服务侧作业状态词表）。")
          )
        )]
      ),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, bundleHeading),
        el(
          "ul",
          { class: "list" },
          ...allBundles.length ? allBundles.slice(0, 8).map((b) => el(
            "li",
            { class: "list-item" },
            el(
              "div",
              {},
              el("strong", {}, `${b.project} · 交付包 v${b.version_no}`),
              el("small", {}, `${b.id} · ${b.byte_size} 字节 · ${b.rights}`)
            ),
            el(
              "span",
              { class: b.rights === "NOT_REVIEWED" ? "tag warn" : "tag info" },
              b.rights === "NOT_REVIEWED" ? "权利未审查" : b.rights
            )
          )) : [emptyLi(projects2, "尚无交付包", "任务完成并打包后，交付会在此读回。")]
        )
      )
    ),
    el(
      "div",
      { class: "panel", style: "margin-top:16px" },
      el("h3", {}, "Host / Capability 状态"),
      el(
        "div",
        { class: "three-col" },
        el(
          "div",
          { class: "panel" },
          el("h3", {}, "宿主读回"),
          el(
            "ul",
            { class: "list" },
            ...TOOL_ADAPTERS.map((a) => el(
              "li",
              { class: "list-item" },
              el(
                "div",
                {},
                el("strong", {}, a.name),
                el("small", {}, a.path)
              ),
              el("span", { class: "tag neutral" }, en("UNKNOWN"))
            ))
          ),
          el("p", { class: "view-hint" }, "宿主在线状态尚未有服务路由；此处 UNKNOWN，不假报可用。")
        ),
        el(
          "div",
          { class: "panel" },
          el("h3", {}, "共享输入"),
          el("ul", { class: "list" }, ...sharedInputRows(environment)),
          el("p", { class: "view-hint" }, "服务端环境读回；写权限与状态由服务裁定。")
        ),
        el(
          "div",
          { class: "panel" },
          el("h3", {}, "未来能力"),
          el(
            "ul",
            { class: "list" },
            ...CAPABILITY_REGISTRY.slice(0, 4).map((c) => el(
              "li",
              { class: "list-item" },
              el(
                "div",
                {},
                el("strong", {}, c.domain),
                el("small", {}, c.contractRef)
              ),
              el(
                "span",
                { class: c.implementationState === "BLOCKED" ? "tag warn" : "tag info" },
                c.implementationState
              )
            ))
          )
        )
      ),
      el(
        "div",
        { class: "panel quick-launch", style: "margin-top:16px" },
        el("h3", {}, "Quick Launch"),
        el(
          "ul",
          { class: "list" },
          el(
            "li",
            { class: "list-item" },
            el("div", {}, el("strong", {}, "新建项目"), el("small", {}, "进入工作台创建项目")),
            el(
              "div",
              { class: "actions" },
              el("button", {
                type: "button",
                class: "ghost-btn",
                onclick: () => {
                  window.location.hash = "";
                }
              }, "工作台")
            )
          ),
          el(
            "li",
            { class: "list-item" },
            el("div", {}, el("strong", {}, "项目列表"), el("small", {}, "全部项目一览")),
            el(
              "div",
              { class: "actions" },
              el("button", {
                type: "button",
                class: "ghost-btn",
                onclick: () => {
                  window.location.hash = "#/projects";
                }
              }, "项目")
            )
          ),
          el(
            "li",
            { class: "list-item" },
            el("div", {}, el("strong", {}, "创作工具"), el("small", {}, "宿主任务读回")),
            el(
              "div",
              { class: "actions" },
              el("button", {
                type: "button",
                class: "ghost-btn",
                onclick: () => {
                  window.location.hash = "#/tools";
                }
              }, "创作工具")
            )
          ),
          el(
            "li",
            { class: "list-item" },
            el("div", {}, el("strong", {}, "预检 / QA"), el("small", {}, "任务资源预检")),
            el(
              "div",
              { class: "actions" },
              el("button", {
                type: "button",
                class: "ghost-btn",
                onclick: () => {
                  window.location.hash = "#/preflight";
                }
              }, "预检")
            )
          )
        )
      )
    ),
    el(
      "p",
      { class: "view-hint" },
      `待审 / 失败按各项目任务的实际执行轮次状态判定（服务侧词表：TERMINAL={RECEIPTED, FAILED, TIMED_OUT, CANCELLED}）。OUTCOME_UNKNOWN 是「结果未知」，计入待审而不计入失败。本轮最多读回 ${probeIds.length} 个项目的任务。`
    ),
    el("p", { class: "eyebrow" }, "设计系统登记"),
    systemsList,
    el("p", { class: "eyebrow" }, "设计域状态机（UI 参考稿 B10/B07 · 非服务状态，未读回）"),
    blueprintCards,
    stateMachineStepper()
  );
  target.querySelectorAll("strong[data-count]").forEach((k) => animateKpiCount(k));
}
const BRAND_MODULES = ["Logo", "Color", "Typography", "Icon", "Graphic Language", "Templates", "Applications", "Assets"];
async function renderBrandSystems(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回设计系统…"));
  const systems = await apiOrEmpty("/design-systems", OFFLINE.designSystems);
  const sysCount = systems.design_systems.length;
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "品牌系统"),
      el("p", {}, "延续锁定的高级、发光、动感产品表达。模块为视觉占位；资产与版本由服务端目录读回。")
    ),
    el("div", { class: "page-actions" })
  );
  const kpis = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(sysCount), "设计系统", "资源登记总数 · 服务端目录读回"),
    // A frontend constant counted into a KPI is a number the service never read
    // back, however honest the caption. It reads as unmeasured until there is a
    // brand-module store behind it.
    kpiCard("—", "VI 模块", "无服务端读回 · 下方为设计参考模块名,非资产统计"),
    kpiCard("—", "活跃绑定", "绑定在工作台 DESIGN LAYER 执行")
  );
  const moduleGrid = el(
    "div",
    { class: "three-col" },
    ...BRAND_MODULES.map((name) => el(
      "div",
      { class: "panel", dataset: { module: name } },
      el("h3", {}, name),
      el("p", { class: "muted" }, "视觉占位 · 资产与版本由服务端目录读回"),
      el("span", { class: "tag info" }, "VI 模块")
    ))
  );
  const systemsList = el(
    "div",
    { class: "panel" },
    el("h3", {}, `设计系统登记（${sysCount}）`),
    el(
      "ul",
      { class: "list" },
      ...systems.design_systems.length ? systems.design_systems.map((system) => el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `${system.name} · ${system.title}`),
          el("small", {}, `v${system.version} · 证据 ${system.evidence_level}`)
        ),
        el("span", { class: "tag info" }, system.version)
      )) : [
        emptyLi(systems, "尚无登记设计系统", "在工作台 DESIGN LAYER 绑定后读回此处")
      ]
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    moduleGrid,
    systemsList,
    el("p", { class: "view-hint" }, "绑定到方向的操作在工作台「05 / DESIGN LAYER」页执行；本页只读回，不修改。"),
    ...shapeNoticeRows(systems)
  );
}
const JURY_CRITERIA = [
  { criterion_id: "brief-fit", weight: 0.25 },
  { criterion_id: "composition", weight: 0.25 },
  { criterion_id: "typography", weight: 0.2 },
  { criterion_id: "brand-system", weight: 0.15 },
  { criterion_id: "production", weight: 0.15 }
];
function juryCriteriaWith(assessments) {
  return JURY_CRITERIA.map((axis, index) => ({
    criterion_id: axis.criterion_id,
    weight: axis.weight,
    note: assessments[index]?.note ?? "",
    score: assessments[index]?.score ?? 0
  }));
}
const JURY_UNREADABLE = {
  schemaVersion: "design-lab/jury-readback/v1",
  records: [],
  verdict_count: 0,
  proposal_count: 0,
  current_verdicts: {},
  reviewable_versions: [],
  human_acceptance: "UNKNOWN"
};
function acceptanceFraction(data) {
  const accepted = data.accepted_versions;
  const total = data.reviewable_active_versions;
  if (typeof accepted !== "number" || typeof total !== "number") return "未读回";
  return `${accepted}/${total}`;
}
async function renderJuryReview(host) {
  host.replaceChildren(el("p", { class: "view-loading" }, "正在读回评审记录…"));
  const projects2 = await apiOrEmpty("/projects", OFFLINE.projects);
  const projectShape = shapeNotice(projects2);
  if (projectShape) {
    host.replaceChildren(el(
      "p",
      { class: "error" },
      `评审项目清单未读回：${projectShape}`
    ));
    return;
  }
  if (!projects2.projects.length) {
    host.replaceChildren(el(
      "p",
      { class: "view-hint" },
      "本机尚无项目：评审记录按项目保存，这里不能替某个项目宣称已验收。"
    ));
    return;
  }
  const picker = el("select", { class: "input", id: "jury-project" });
  for (const p of projects2.projects) picker.append(new Option(p.name, p.id));
  const load = async () => {
    const id = picker.value || projects2.projects[0].id;
    const data = await apiOrEmpty(`/projects/${id}/jury`, JURY_UNREADABLE);
    const shape = shapeNotice(data);
    body.replaceChildren(juryReadbackPanel(id, data, load, shape));
  };
  const body = el("div", { class: "jury-body" });
  picker.onchange = () => {
    void load().catch((error) => setStatus(errMsg(error), true));
  };
  host.replaceChildren(el("label", { class: "muted" }, "评审项目", picker), body);
  await load();
}
function juryReadbackPanel(projectId, data, reload, unread) {
  if (unread) {
    return el("div", {}, el(
      "p",
      { class: "error" },
      `评审读回不完整：${unread}。缺失字段不会被当作空集合或已验收。`
    ));
  }
  if (data.error) {
    return el(
      "p",
      { class: "error" },
      `评审未读回：${data.error}。未读回不等于无裁决，也不等于已验收。`
    );
  }
  const verdicts = Object.entries(data.current_verdicts ?? {});
  const list = el("ul", { class: "list" }, ...verdicts.length ? verdicts.map(([subject, record]) => el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, String(record["verdict"] ?? "未记录判定")),
      el("div", { class: "value-mono" }, subject),
      el("div", { class: "muted" }, String((record["juror"] ?? {}).attestation ?? "无评审依据"))
    )
  )) : [emptyLi(
    data,
    "尚无人签署的裁决",
    "Agent 建议不计入验收，人工签署是唯一改变此处的途径。"
  )]);
  const summary = el(
    "p",
    { class: "view-hint" },
    `已签署 ${data.verdict_count ?? 0} · Agent 建议 ${data.proposal_count ?? 0} · 人工验收 ` + (data.human_acceptance === "ACCEPTED" ? "已接受" : "未接受") + `（当前版本 ${acceptanceFraction(data)}）`
  );
  return el(
    "div",
    {},
    summary,
    list,
    juryVerdictForm(projectId, data.reviewable_versions ?? [], reload)
  );
}
const ACCEPTANCE_TAGS = { ACCEPTED: "ok", NOT_ACCEPTED: "warn" };
function evidenceJuryColumn(data) {
  const heading = el("h3", {}, "人工评审裁决 · Human Jury");
  const unread = shapeNotice(data) || disconnectedNotice(data);
  if (unread) {
    return el(
      "div",
      { class: "panel" },
      heading,
      el(
        "p",
        { class: "error" },
        `${unread}；裁决未读回。未读回不等于无裁决，也不等于已验收。`
      )
    );
  }
  const verdicts = Object.entries(data.current_verdicts ?? {});
  const list = el("ul", { class: "list" }, ...verdicts.length ? verdicts.map(([subject, record]) => el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, String(record["verdict"] ?? "未记录判定")),
      // subject_ref and the artifact digest are long identifiers: their own row in
      // .value-mono, never inside the nowrap .tag pill.
      el("div", { class: "value-mono" }, subject),
      el("div", { class: "muted" }, String((record["juror"] ?? {}).attestation ?? "无评审依据"))
    ),
    record["kind"] ? el("span", { class: "tag info" }, en(String(record["kind"]))) : ""
  )) : [emptyLi(
    data,
    "尚无人签署的裁决",
    "裁决需在预检 / QA 页由人签署后在此读回；Agent 建议不计入验收。"
  )]);
  const acceptance = typeof data.human_acceptance === "string" ? data.human_acceptance : "";
  const verdictCount = typeof data.verdict_count === "number" ? String(data.verdict_count) : "未读回";
  const proposalCount = typeof data.proposal_count === "number" ? String(data.proposal_count) : "未读回";
  return el(
    "div",
    { class: "panel" },
    heading,
    el(
      "p",
      { class: "view-hint" },
      `已签署 ${verdictCount} · Agent 建议 ${proposalCount} · 当前版本已接受 ${acceptanceFraction(data)}`
    ),
    el(
      "p",
      {},
      acceptance ? el(
        "span",
        { class: "tag " + (ACCEPTANCE_TAGS[acceptance] ?? "neutral") },
        en(acceptance)
      ) : el("span", { class: "tag neutral" }, "人工验收状态未读回"),
      el(
        "span",
        { class: "muted" },
        " · 人工验收是按项目当前版本算的，一条裁决不会替整个项目出证。"
      )
    ),
    list,
    el(
      "p",
      { class: "view-hint" },
      "本页只读回裁决，不签署、不改写：签署是 Human Gate，在预检 / QA 页执行。"
    )
  );
}
function juryVerdictForm(projectId, versions, reload) {
  const versionSelect = el("select", { class: "input", id: "jury-version" });
  versionSelect.append(new Option("选择被评审的版本", ""));
  for (const v of versions) {
    versionSelect.append(new Option(
      `${v.subject_ref} · ${v.artifact_sha256.slice(0, 12)}…`,
      v.subject_ref
    ));
  }
  const juror = el("input", {
    class: "input",
    id: "jury-juror",
    type: "text",
    placeholder: "评审人 id",
    autocomplete: "off"
  });
  const attestation = el("textarea", {
    class: "input",
    id: "jury-attestation",
    placeholder: "你在什么条件下看了这份产物（放大比例、屏幕、与参考的对比）"
  });
  const approve = el("input", {
    type: "radio",
    name: "jury-verdict",
    id: "jury-approve",
    value: "APPROVE"
  });
  const reject = el("input", {
    type: "radio",
    name: "jury-verdict",
    id: "jury-reject",
    value: "REJECT"
  });
  const evidence = el("textarea", {
    class: "input",
    id: "jury-evidence",
    placeholder: "拒绝时必填，一行一条依据"
  });
  const scores = JURY_CRITERIA.map((axis) => el("input", {
    class: "input",
    type: "number",
    id: `jury-score-${axis.criterion_id}`,
    min: "0",
    max: "5",
    step: "0.1",
    "aria-label": `${axis.criterion_id} 评分`
  }));
  const notes = JURY_CRITERIA.map((axis) => el("input", {
    class: "input",
    type: "text",
    id: `jury-note-${axis.criterion_id}`,
    placeholder: `${axis.criterion_id} 的评审说明`
  }));
  const outcome = el("p", { class: "view-hint", id: "jury-outcome" }, "");
  const submit = el(
    "button",
    { type: "button", class: "primary-btn", id: "jury-submit" },
    "签署裁决"
  );
  submit.onclick = () => {
    void (async () => {
      const chosen = versionSelect.value;
      const digest = versions.find((v) => v.subject_ref === chosen)?.artifact_sha256 ?? "";
      const verdict = approve.checked ? "APPROVE" : reject.checked ? "REJECT" : "";
      if (!chosen || !digest) {
        outcome.textContent = "未签署：必须先选择被评审的版本，裁决不能指向凭记忆写出的摘要。";
        return;
      }
      if (!verdict) {
        outcome.textContent = "未签署：不接受任何默认判定。";
        return;
      }
      const invalid = scores.findIndex((node) => node.value === "" || Number(node.value) < 0 || Number(node.value) > 5);
      if (invalid >= 0) {
        outcome.textContent = `未签署：${JURY_CRITERIA[invalid].criterion_id} 分值缺失或超出 0-5。`;
        return;
      }
      if (verdict === "REJECT" && !evidence.value.trim()) {
        outcome.textContent = "未签署：拒绝必须写明依据，否则无法复核或申诉。";
        return;
      }
      submit.disabled = true;
      outcome.textContent = "提交中…";
      try {
        await api(`/projects/${projectId}/jury/verdict`, {
          schemaVersion: "design-lab/assurance-jury-record/v2",
          kind: "JURY_VERDICT",
          jury_record_id: "jury-" + Math.random().toString(16).slice(2, 34),
          subject_ref: chosen,
          artifact_sha256: digest,
          juror: {
            juror_id: juror.value.trim(),
            kind: "HUMAN",
            members: [],
            attestation: attestation.value.trim()
          },
          criteria: juryCriteriaWith(scores.map((node, index) => ({
            score: Number(node.value),
            note: notes[index].value.trim()
          }))),
          verdict,
          decided_at: (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
          supersedes: null,
          evidence_refs: evidence.value.split("\n").map((line) => line.trim()).filter(Boolean)
        });
        await reload();
        outcome.textContent = "已签署；下方列表为服务端读回。";
      } catch (error) {
        outcome.textContent = `未签署：${errMsg(error)}`;
      } finally {
        submit.disabled = false;
      }
    })();
  };
  return el(
    "details",
    { class: "advanced" },
    el("summary", {}, "签署人工裁决（写入项目状态，之后不可修改）"),
    el(
      "div",
      { class: "advanced-body" },
      versions.length ? el("p", { class: "view-hint" }, "版本与其摘要由服务端读回，不由人手写。") : el(
        "p",
        { class: "view-hint" },
        "该项目当前没有 ACTIVE 版本可评审；生产发布后此处才会出现候选。"
      ),
      el("label", {}, "被评审版本", versionSelect),
      el("label", {}, "评审人", juror),
      el("label", {}, "评审依据", attestation),
      el(
        "div",
        {},
        approve,
        el("label", { for: "jury-approve" }, "接受"),
        " ",
        reject,
        el("label", { for: "jury-reject" }, "拒绝")
      ),
      el("label", {}, "拒绝依据（拒绝时必填）", evidence),
      ...JURY_CRITERIA.flatMap((axis, index) => [
        el("label", {}, `${axis.criterion_id} · 分值 0-5（权重 ${axis.weight}）`, scores[index]),
        el("label", {}, `${axis.criterion_id} · 说明`, notes[index])
      ]),
      submit,
      outcome
    )
  );
}
const RIGHTS_UNREADABLE = {
  schemaVersion: "design-lab/rights-readback/v1",
  decisions: [],
  current_decisions: {},
  unapproved_scopes: [],
  ever_filed_scopes: [],
  scope_conflicts: [],
  name_checked_only: [],
  does_not_prove: []
};
const RIGHTS_CLEARANCE_TAGS = { CLEARED: "ok", NOT_REVIEWED: "warn" };
const RIGHTS_DECISION_TAGS = {
  DENIED: "bad",
  BLOCKED_BY_LICENSE: "bad",
  PENDING_REVIEW: "warn"
};
const RIGHTS_DECISION_SCHEMA_VERSION = "design-lab/rights-decision/v1";
function rightsCount(value) {
  return typeof value === "number" ? String(value) : "未读回";
}
function clearanceFraction(data) {
  if (typeof data.approved_scope_count !== "number" || typeof data.filed_scope_count !== "number")
    return "未读回";
  return `${data.approved_scope_count}/${data.filed_scope_count}`;
}
function unapprovedScopeSet(data) {
  return Array.isArray(data.unapproved_scopes) ? new Set(data.unapproved_scopes.map((row) => String(row?.use_scope ?? ""))) : null;
}
function rightsDecisionTagClass(scope, record, unapproved) {
  if (unapproved === null) return "neutral";
  if (!unapproved.has(scope)) return "ok";
  return RIGHTS_DECISION_TAGS[String(record?.decision ?? "")] ?? "warn";
}
function clearanceExplanation(data, clearance) {
  if (!clearance) return " · 服务端没有给出清算词，本页不替它补一个；未读回不等于未清算。";
  const filed = data.filed_scope_count;
  const outstanding = data.unapproved_scopes;
  if (typeof filed !== "number" || !Array.isArray(outstanding))
    return " · 分母未读回，所以这一行只转述清算词本身，不推断它站在多少个范围上。";
  if (filed === 0)
    return " · 该项目没有任何使用范围被提交过：这道门没有被问过，不是有人在等答复。 PENDING_REVIEW 只能由人提交产生，服务与页面都不会替没人问过的范围生成它。";
  if (outstanding.length)
    return ` · 已提交但未计入清算的范围：${outstanding.map((row) => `${row.use_scope}（${row.decision}）`).join("、")}。 这一行说的是"读起来未清算"，不是"正在等待审查"。`;
  return ' · 已提交的范围全部处于批准状态；清算只覆盖这些范围，见下方"本读回不证明"。';
}
function rightsScopeRows(data, emptyHint) {
  const scopes = Object.entries(data.current_decisions ?? {});
  const unapproved = unapprovedScopeSet(data);
  return el("ul", { class: "list" }, ...scopes.length ? scopes.map(([scope, record]) => el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, scope),
      // A decision id and a license reference are long identifiers: their own
      // .value-mono row, never inside the nowrap .tag pill (UI-AUDIT-20261006).
      el(
        "div",
        { class: "value-mono" },
        `决定 ${String(record?.decision_id ?? "未读回")}` + (record?.license_ref ? ` · 许可 ${String(record.license_ref)}` : "")
      ),
      el(
        "div",
        { class: "muted" },
        `决定人 ${String(record?.decided_by ?? "未读回")}` + (record?.decided_at ? ` · ${String(record.decided_at)}` : " · 决定时间未读回") + (record?.territory ? ` · 地域 ${String(record.territory)}` : "")
      ),
      record?.note ? el("div", { class: "view-hint" }, String(record.note)) : ""
    ),
    el("span", {
      class: "tag " + rightsDecisionTagClass(scope, record, unapproved)
    }, record?.decision ? en(String(record.decision)) : "决定词未读回")
  )) : [emptyLi(data, "尚无人签署的权利决定", emptyHint)]);
}
function rightsFacts(data) {
  const clearance = typeof data.rights_clearance === "string" ? data.rights_clearance : "";
  const states = data.decision_states && typeof data.decision_states === "object" ? Object.entries(data.decision_states) : [];
  const everCount = Array.isArray(data.ever_filed_scopes) ? data.ever_filed_scopes.length : null;
  const standingCount = Object.keys(data.current_decisions ?? {}).length;
  const nodes = [
    el(
      "p",
      { class: "view-hint" },
      `当前批准 ${clearanceFraction(data)} · 决定总数 ${rightsCount(data.decision_count)} · 曾提交过的范围 ${everCount === null ? "未读回" : String(everCount)} 个`
    ),
    el(
      "p",
      {},
      el(
        "span",
        { class: "tag " + (RIGHTS_CLEARANCE_TAGS[clearance] ?? "neutral") },
        clearance ? en(clearance) : "权利清算状态未读回"
      ),
      el("span", { class: "muted" }, clearanceExplanation(data, clearance))
    )
  ];
  if (everCount !== null && everCount > standingCount) {
    nodes.push(el(
      "p",
      { class: "view-hint" },
      `${everCount - standingCount} 个范围已不再出现在现行集合中（被后来的决定取代），清算只按现行集合计算。`
    ));
  }
  nodes.push(el(
    "p",
    { class: "muted" },
    states.length ? `现行决定按状态：${states.map(([word, count]) => `${word} ${count}`).join(" · ")}` : "状态计数未读回：响应没有给出 decision_states，本页不自行清点。"
  ));
  if (data.scope_conflicts.length) {
    nodes.push(el(
      "p",
      { class: "error" },
      `范围冲突 ${data.scope_conflicts.length} 项：` + data.scope_conflicts.map((row) => `${row.use_scope}（${(row.decision_ids ?? []).join("、")}）`).join("；") + '。同一范围带着多条未被取代的现行决定，这些范围的"当前权利立场"是不确定的；服务端取最新一条只是为了给出读回，不是替人裁决。'
    ));
  }
  if (data.name_checked_only.length) {
    nodes.push(el(
      "p",
      { class: "view-hint" },
      `仅按名字核查的范围 ${data.name_checked_only.length} 个：${data.name_checked_only.join("、")}。合同关闭属性，HTTP 提交带不进声明的 actor kind，所以这些行只证明署名不自称自动化，不证明是一只手敲的字。`
    ));
  }
  nodes.push(el(
    "div",
    { class: "rights-does-not-prove" },
    el(
      "p",
      { class: "muted" },
      `本读回不证明（由服务端自己列出，${data.does_not_prove.length} 条）：`
    ),
    ...data.does_not_prove.length ? data.does_not_prove.map((line) => el("p", { class: "view-hint" }, String(line))) : [el(
      "p",
      { class: "error" },
      "未读回：响应没有给出 does_not_prove，本页不替服务端省略它自己声明的限制。"
    )]
  ));
  return nodes;
}
const EVIDENCE_PROJECTION_UNREADABLE = {
  receipts: [],
  reasonCounts: { integrity: {}, currency: {} },
  taskCounts: {}
};
const PROJECTION_RECEIPT_LIMIT = 12;
function projectionStateWord(receipt) {
  if (!receipt.verified) return "NOT VERIFIED";
  return receipt.current ? "VERIFIED CURRENT" : "VERIFIED NOT CURRENT";
}
function projectionCount(value) {
  return typeof value === "number" ? String(value) : "—";
}
function projectionReasonList(group, noneText) {
  const entries = Object.entries(group ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return el("p", { class: "view-hint" }, noneText);
  return el("ul", { class: "list" }, ...entries.map(([token2, count]) => el(
    "li",
    { class: "list-item" },
    el("div", {}, en(token2), el("small", {}, "该理由命中的字节声明数")),
    el("span", { class: "tag warn" }, String(count))
  )));
}
function projectionReasonLine(label, reasons) {
  if (!reasons.length) return el("small", {}, `${label}：无`);
  return el(
    "small",
    {},
    label + "：",
    ...reasons.slice(0, 3).flatMap((reason, index) => index === 0 ? [en(reason)] : [" · ", en(reason)]),
    ...reasons.length > 3 ? [el("span", {}, ` 等 ${reasons.length} 项`)] : []
  );
}
function projectionReceiptRows(receipts) {
  const shown = receipts.slice(0, PROJECTION_RECEIPT_LIMIT);
  const rest = receipts.length - shown.length;
  return el(
    "ul",
    { class: "list" },
    ...shown.map((receipt) => el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, receipt.id),
        el(
          "small",
          { class: "value-mono" },
          `subject ${receipt.subjectSha.slice(0, 12)} · ${receipt.kind}`
        ),
        projectionReasonLine("完整性理由", receipt.integrityReasons),
        projectionReasonLine("时效理由", receipt.currencyReasons)
      ),
      el(
        "span",
        { class: receipt.verified ? receipt.current ? "tag ok" : "tag info" : "tag bad" },
        en(projectionStateWord(receipt))
      )
    )),
    ...rest > 0 ? [el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, `其余 ${rest} 条未逐条列出`),
        el("small", {}, "上方计数覆盖全部记录；此处只是不再展开，不是没有这些记录。")
      )
    )] : []
  );
}
function evidenceProjectionPanel(data, unread) {
  const refusal = data.error ? `服务端在响应里给出了拒绝码 ${String(data.error)}。` : "";
  if (unread) {
    return el(
      "p",
      { class: "error" },
      `${refusal}${unread}；证据链状态未读回。未读回不等于已验证，也不等于没有问题。`
    );
  }
  if (data.error) {
    return el(
      "p",
      { class: "error" },
      `证据链状态未读回：${String(data.error)}。服务端拒绝时没有给出任何计数，本页不会替它补一个，也不会把拒绝解释成"没有证据问题"。`
    );
  }
  const totals = data.totals;
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  if (!totals || typeof totals.records !== "number") {
    return el(
      "p",
      { class: "error" },
      "证据链状态未读回：响应没有给出 totals.records。缺少计数不得被当作 0 条记录。"
    );
  }
  if (!Array.isArray(data.receipts)) {
    return el(
      "p",
      { class: "error" },
      "证据链状态未读回：响应没有给出 receipts 集合，无法逐条判断，也不会显示任何计数。"
    );
  }
  return el(
    "div",
    {},
    el(
      "div",
      { class: "kpi-grid" },
      kpiCard(projectionCount(totals.records), "条收据", "config/task-ledger-r3.json"),
      kpiCard(projectionCount(totals.verified), "字节可复现", "在其绑定提交上重算"),
      kpiCard(projectionCount(totals.unverified), "不可复现", "含未通过 outcome 的行"),
      kpiCard(projectionCount(totals.current), "仍适用当前检出", "verified 的子集")
    ),
    el("h4", {}, "完整性理由分布（为何这些字节不再在其声称的来源处）"),
    projectionReasonList(
      data.reasonCounts?.integrity,
      "没有完整性理由：本次读回没有发现无法复现的字节声明。"
    ),
    el("h4", {}, "时效理由分布（为何完整的收据不再描述当前检出的字节）"),
    projectionReasonList(
      data.reasonCounts?.currency,
      "没有时效理由：所有完整收据引用的文件都与当前检出一致。"
    ),
    el("h4", {}, "逐条收据"),
    receipts.length ? projectionReceiptRows(receipts) : el("p", { class: "view-hint" }, "账本没有任何收据；这是读回来的空账本，不是读回失败。"),
    el(
      "p",
      { class: "view-hint" },
      `判定对象为当前检出 ${data.subjectSha ? data.subjectSha.slice(0, 12) : "（响应未给出）"}，来源 ${data.ledger ?? "（响应未给出）"}。该读回对当前检出重新计算，不读取 reports/current/（生成物绑定它写下时所在的提交）。"仍适用当前检出"是"字节可复现"的子集：完整的收据若引用的文件已移动，它仍是诚实的历史，但不是今天这份代码的证据。`
    )
  );
}
async function runEvidenceProjection(host) {
  host.replaceChildren(el(
    "p",
    { class: "view-loading" },
    "正在对当前检出重算证据链完整性（逐条复算字节声明，约一秒）…"
  ));
  try {
    const data = await apiOrEmpty(
      "/evidence-projection",
      EVIDENCE_PROJECTION_UNREADABLE
    );
    host.replaceChildren(evidenceProjectionPanel(data, shapeNotice(data)));
  } catch (error) {
    const envelope = error.serviceEnvelope;
    const code = typeof envelope?.["error"] === "string" ? envelope["error"] : errMsg(error);
    host.replaceChildren(el(
      "p",
      { class: "error" },
      `证据链状态未读回：${String(code)}。服务端在拒绝时没有给出任何计数或收据列表，本页不会把一次拒绝显示成"没有证据问题"。`
    ));
  }
}
function evidenceProjectionPanelBox() {
  const out = el(
    "div",
    { class: "evidence-projection-outcome", id: "evidence-projection-outcome" },
    el(
      "p",
      { class: "view-hint" },
      "尚未读回证据链完整性：这一判定要对当前检出逐条复算，不在页面构建时自动执行，也不读取任何生成物。未读回不等于已验证。"
    )
  );
  const run = el(
    "button",
    { type: "button", class: "ghost-btn", id: "evidence-projection-run" },
    "读回证据链完整性"
  );
  run.onclick = () => {
    void runEvidenceProjection(out);
  };
  return el(
    "div",
    { class: "panel" },
    el("h3", {}, "证据链完整性 · Human EVIDENCE"),
    run,
    out,
    el(
      "p",
      { class: "view-hint" },
      "来源 GET /api/evidence-projection（src/design_lab/governance/evidence_readback.py 依 design-lab/schemas/evidence-projection.schema.json 校验自身后才应答）。本页只读回，不修改账本：账本行由验证运行时写入，投影状态由这条读回呈现。"
    )
  );
}
function evidenceRightsColumn(data, unread) {
  const heading = el("h3", {}, "权利决定读回 · Human RIGHTS");
  if (unread) {
    return el(
      "div",
      { class: "panel" },
      heading,
      el(
        "p",
        { class: "error" },
        `${unread}；权利决定未读回。未读回不等于没有决定，也不等于已清算。`
      )
    );
  }
  if (data.error) {
    return el(
      "div",
      { class: "panel" },
      heading,
      el(
        "p",
        { class: "error" },
        `权利未读回：${String(data.error)}。未读回不等于没有决定，也不等于已清算。`
      )
    );
  }
  return el(
    "div",
    { class: "panel" },
    heading,
    ...rightsFacts(data),
    rightsScopeRows(data, "权利决定需在预检 / QA 页由人提交后在此读回；没有被提交过的范围不会出现在这里，也不会带任何默认状态。"),
    el(
      "p",
      { class: "view-hint" },
      "本页只读回决定与清算，不提交、不改写：提交是 Human Gate，在预检 / QA 页执行。权利门不代替质量、制作与发布门。"
    )
  );
}
function rightsReadbackPanel(projectId, data, reload, unread, outcome) {
  if (unread) {
    return el("div", {}, el(
      "p",
      { class: "error" },
      `权利读回不完整：${unread}。缺失字段不会被当作空集合或已清算。`
    ));
  }
  if (data.error) {
    return el(
      "p",
      { class: "error" },
      `权利未读回：${String(data.error)}。未读回不等于无决定，也不等于已清算。`
    );
  }
  return el(
    "div",
    {},
    ...rightsFacts(data),
    rightsScopeRows(data, "在下方提交一条决定后在此读回；未被提交过的范围没有默认状态。"),
    rightsDecisionForm(projectId, data, reload, outcome)
  );
}
function rightsDecisionForm(projectId, data, reload, outcome) {
  const vocabulary = Array.isArray(data.decision_vocabulary) ? data.decision_vocabulary : [];
  const scope = el("input", {
    class: "input",
    id: "rights-use-scope",
    type: "text",
    placeholder: "使用范围，例如 font-brandon-grotesk / client-photo-01",
    autocomplete: "off"
  });
  const signer = el("input", {
    class: "input",
    id: "rights-decided-by",
    type: "text",
    placeholder: "决定人（人的名字；自称 agent / model / system 的署名会被服务端拒绝）",
    autocomplete: "off"
  });
  const territory = el("input", {
    class: "input",
    id: "rights-territory",
    type: "text",
    placeholder: "可选：地域，例如 worldwide / cn-only"
  });
  const licenseRef = el("input", {
    class: "input",
    id: "rights-license-ref",
    type: "text",
    placeholder: "可选：许可文本的引用，例如 LICENSE-FILE:OFL.txt"
  });
  const note = el("textarea", {
    class: "input",
    id: "rights-note",
    placeholder: "可选：依据哪份文本、在什么范围内作出的判断"
  });
  const decisionInputs = vocabulary.map((word) => el("input", {
    type: "radio",
    name: "rights-decision",
    id: `rights-decision-${word}`,
    value: word
  }));
  const supersedes = el("select", { class: "input", id: "rights-supersedes" });
  const supersedeScopes = /* @__PURE__ */ new Map();
  supersedes.append(new Option("不替代：这是一条新的决定", ""));
  for (const [useScope, record] of Object.entries(data.current_decisions ?? {})) {
    const previous = typeof record?.decision_id === "string" ? record.decision_id : "";
    if (!previous) continue;
    supersedeScopes.set(previous, useScope);
    supersedes.append(new Option(`${useScope} · ${previous}`, previous));
  }
  const submit = el(
    "button",
    { type: "button", class: "primary-btn", id: "rights-submit" },
    "提交权利决定"
  );
  if (!vocabulary.length) submit.disabled = true;
  let decisionId = "";
  let lastFingerprint = "";
  submit.onclick = () => {
    void (async () => {
      const useScope = scope.value.trim();
      const chosen = decisionInputs.find((node) => node.checked);
      const actor = signer.value.trim();
      if (!vocabulary.length) {
        outcome.textContent = "未提交：决定词表未读回（响应没有给出 decision_vocabulary），页面不替合同发明一个状态词。";
        return;
      }
      if (!useScope) {
        outcome.textContent = "未提交：必须先写明使用范围；一条决定要落在一个范围上，否则读回时没人知道它管什么。";
        return;
      }
      if (!chosen) {
        outcome.textContent = "未提交：没有选中任何决定词；权利门不接受页面替你猜的默认状态。";
        return;
      }
      if (!actor) {
        outcome.textContent = "未提交：决定人必须写明。权利门不由发起请求的人默认签署，服务端也会按名字拒绝自称自动化的署名。";
        return;
      }
      const previousId = supersedes.value;
      const previousScope = supersedeScopes.get(previousId) ?? "";
      if (previousId && previousScope && previousScope !== useScope) {
        outcome.textContent = `未提交：${previousId} 决定的是 ${previousScope}，与 ${useScope} 不是同一个使用范围；替代只能落在同一范围上，本页不发送注定被拒的请求。`;
        return;
      }
      const body = {
        schemaVersion: RIGHTS_DECISION_SCHEMA_VERSION,
        use_scope: useScope,
        decision: chosen.value,
        decided_by: actor,
        // The page stamps the moment of signing from the browser clock and the service
        // validates its RFC3339 shape; the human name is what the gate records, not this.
        decided_at: (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
        territory: territory.value.trim() || null,
        license_ref: licenseRef.value.trim() || null,
        note: note.value.trim() || null
      };
      const fingerprint = JSON.stringify(body);
      if (fingerprint !== lastFingerprint) {
        decisionId = "rights-" + Math.random().toString(16).slice(2, 34);
        lastFingerprint = fingerprint;
      }
      const payload = { decision_id: decisionId, ...body };
      submit.disabled = true;
      outcome.textContent = "提交中…";
      try {
        await api(`/projects/${projectId}/rights` + (previousId ? `?supersedes=${encodeURIComponent(previousId)}` : ""), payload);
        await reload();
        outcome.textContent = "已提交一条权利决定；上方读回来自服务端，不是本页记住的输入。";
      } catch (error) {
        const envelope = error.serviceEnvelope;
        const code = typeof envelope?.error === "string" ? envelope.error : errMsg(error);
        const detail = typeof envelope?.detail === "string" ? envelope.detail : "";
        outcome.textContent = `未提交：${code}${detail ? ` —— ${detail}` : ""}。服务端没有写入任何决定；上方读回仍是提交之前的状态，不是这次的结论。`;
      } finally {
        submit.disabled = false;
      }
    })();
  };
  return el(
    "details",
    { class: "advanced" },
    el("summary", {}, "提交权利决定（写入项目状态，之后不可修改，只能由新决定取代）"),
    el(
      "div",
      { class: "advanced-body" },
      el(
        "p",
        { class: "view-hint" },
        vocabulary.length ? `可用决定词由服务端合同给出：${vocabulary.join(" / ")}。` : "决定词表未读回：响应没有给出 decision_vocabulary，本表单不可提交。"
      ),
      el(
        "p",
        { class: "view-hint" },
        "一条决定只覆盖一个使用范围；PENDING_REVIEW 只有人选它才会出现，页面与服务端都不会替没人问过的范围生成它。一次点击提交一条。"
      ),
      el("label", {}, "使用范围", scope),
      el("div", {}, ...vocabulary.flatMap((word, index) => [
        decisionInputs[index],
        el("label", { for: `rights-decision-${word}` }, en(word))
      ])),
      el("label", {}, "决定人", signer),
      el("label", {}, "地域（可选）", territory),
      el("label", {}, "许可引用（可选）", licenseRef),
      el("label", {}, "说明（可选）", note),
      el("label", {}, "取代哪条现行决定（只列读回中出现过的）", supersedes),
      submit
    )
  );
}
async function renderRightsReview(host) {
  host.replaceChildren(el("p", { class: "view-loading" }, "正在读回权利决定…"));
  const projects2 = await apiOrEmpty("/projects", OFFLINE.projects);
  const projectShape = shapeNotice(projects2);
  if (projectShape) {
    host.replaceChildren(el(
      "p",
      { class: "error" },
      `权利项目清单未读回：${projectShape}`
    ));
    return;
  }
  if (!projects2.projects.length) {
    const offline = disconnectedNotice(projects2);
    host.replaceChildren(el(
      "p",
      { class: offline ? "error" : "view-hint" },
      offline ? `${offline}，项目台账未读回，因此不能断言无项目，也不能替某个项目提交权利决定。` : "本机尚无项目：权利决定按项目保存，这里不能替不存在的项目宣称已清算。"
    ));
    return;
  }
  const picker = el("select", { class: "input", id: "rights-project" });
  for (const p of projects2.projects) picker.append(new Option(p.name, p.id));
  const outcome = el("p", { class: "view-hint", id: "rights-review-outcome" }, "");
  const body = el("div", { class: "rights-body" });
  const load = async () => {
    const id = picker.value || projects2.projects[0].id;
    const data = await apiOrEmpty(`/projects/${id}/rights`, RIGHTS_UNREADABLE);
    const shape = shapeNotice(data);
    body.replaceChildren(rightsReadbackPanel(id, data, load, shape, outcome));
  };
  picker.onchange = () => {
    void load().catch((error) => setStatus(errMsg(error), true));
  };
  host.replaceChildren(el("label", { class: "muted" }, "权利项目", picker), outcome, body);
  await load();
}
const RESEARCH_UNREADABLE = {
  schemaVersion: "design-lab/research-readback/v1",
  findings: [],
  current_findings: {},
  confidence_counts: {},
  does_not_prove: [],
  actor_kinds: {},
  unattributed_findings: []
};
function researchNumber(data, key) {
  const value = data[key];
  return typeof value === "number" ? String(value) : "未读回";
}
function researchFacts(data) {
  const verdict = data.research_verdict;
  const tagClass = verdict === null || verdict === void 0 ? "warn" : "info";
  const tags = Object.entries(data.confidence_counts ?? {});
  return el(
    "div",
    { class: "panel research-facts" },
    el("h3", {}, "研究结论读回"),
    el(
      "p",
      { class: "view-hint" },
      `共 ${researchNumber(data, "finding_count")} 条 · 现行 ${researchNumber(data, "current_finding_count")} 条 · 已被取代 ${researchNumber(data, "superseded_finding_count")} 条 · 有来源 ${researchNumber(data, "sourced_finding_count")} 条 · 无来源 ${researchNumber(data, "unsourced_finding_count")} 条 · 来源引用合计 ${researchNumber(data, "source_ref_total")} 个`
    ),
    el(
      "p",
      { class: "muted" },
      `来源字段名取自响应（${data.source_ref_field ?? "未读回"}），置信度计数来自服务端逐词表给出（含 0），标注数 ${researchNumber(data, "stated_confidence_count")}；未署名 ${researchNumber(data, "unattributed_findings")} 条。`
    ),
    tags.length ? el("div", {}, ...tags.flatMap(([word, count]) => [
      el(
        "span",
        { class: "tag " + (count ? "info" : "neutral") },
        en(word)
      ),
      el("span", { class: "muted" }, String(count))
    ])) : el("p", { class: "view-hint" }, "置信度计数未读回：响应没有给出 confidence_counts，本页不代替服务发明分类。"),
    el(
      "span",
      { class: "tag " + tagClass },
      verdict === null || verdict === void 0 ? "无完成判定词" : en(String(verdict))
    ),
    el(
      "p",
      { class: "view-hint" },
      data.research_verdict_note ?? "判定说明未读回：响应没有给出 research_verdict_note。"
    ),
    el(
      "p",
      { class: "muted" },
      `本面不证明设计质量（proves_design_quality=${String(data.proves_design_quality ?? "未读回")}），也不是知识导出（is_knowledge_export=${String(data.is_knowledge_export ?? "未读回")}）。`
    ),
    ...data.undeclared_disclaimer ? [el("p", { class: "view-hint" }, `未声明免责：${data.undeclared_disclaimer}`)] : [],
    el(
      "ul",
      { class: "list" },
      ...(data.does_not_prove ?? []).map((line) => el(
        "li",
        { class: "list-item" },
        el("span", {}, en(line))
      ))
    ),
    ...data.does_not_prove?.length ? [] : [el(
      "p",
      { class: "view-hint" },
      "本读回未给出 does_not_prove，因此无法说明这些数字不覆盖什么。"
    )]
  );
}
function researchFindingRows(data) {
  const current = data.current_findings ?? {};
  const findings = data.findings ?? [];
  if (!findings.length) {
    return el(
      "ul",
      { class: "list" },
      emptyLi(
        data,
        "本项目尚无已持久化的研究结论",
        "记录一条带来源的结论后在此读回；未读回不等于本项目没有结论。"
      )
    );
  }
  return el(
    "ul",
    { class: "list" },
    ...findings.map((record) => {
      const id = typeof record.finding_id === "string" ? record.finding_id : "未读回";
      const superseded = !Object.prototype.hasOwnProperty.call(current, id);
      const sources = Array.isArray(record.sourceRefs) ? record.sourceRefs : [];
      return el(
        "li",
        { class: "list-item" },
        el("span", {}, record.claim ?? "结论正文未读回"),
        el("span", { class: "value-mono" }, id),
        el(
          "span",
          { class: "tag " + (superseded ? "neutral" : "info") },
          superseded ? "已被取代" : "现行"
        ),
        el(
          "span",
          { class: "tag " + (record.confidence ? "info" : "warn") },
          record.confidence ? en(record.confidence) : "未标注置信度"
        ),
        el(
          "span",
          { class: "muted" },
          sources.length ? `来源 ${sources.join(" · ")}` : "来源未读回"
        )
      );
    })
  );
}
function researchDecisionForm(projectId, data, reload, outcome) {
  const vocabulary = Array.isArray(data.confidence_vocabulary) ? data.confidence_vocabulary : [];
  const claim = el("textarea", {
    class: "input",
    id: "research-claim",
    maxlength: "4000",
    "aria-label": "研究结论正文"
  });
  const sources = el("input", {
    class: "input",
    id: "research-sources",
    maxlength: "2000",
    placeholder: "interview-07, bench-figma-2026-05",
    "aria-label": "支撑这条结论的来源引用，用逗号或空格分隔，至少一个"
  });
  const confidence = el("select", { class: "input", id: "research-confidence" });
  confidence.append(new Option("不标注（响应里就不会有这个字段）", ""));
  for (const word of vocabulary) confidence.append(new Option(word, word));
  const notRule = el("input", { type: "checkbox", id: "research-not-design-rule" });
  const supersedes = el("select", { class: "input", id: "research-supersedes" });
  supersedes.append(new Option("不替代：这是一条新的结论", ""));
  for (const id of Object.keys(data.current_findings ?? {})) {
    supersedes.append(new Option(id, id));
  }
  const submit = el(
    "button",
    { type: "button", class: "primary-btn", id: "research-submit" },
    "记录一条研究结论"
  );
  let findingId = "";
  let lastFingerprint = "";
  submit.onclick = () => {
    void (async () => {
      const text = claim.value.trim();
      const refs = sources.value.split(/[,\n\s]+/).map((part) => part.trim()).filter(Boolean);
      if (!text) {
        outcome.textContent = "未提交：结论正文为空。页面不发送一条没有主张的记录。";
        return;
      }
      if (!refs.length) {
        outcome.textContent = "未提交：没有任何来源引用。一条没有来源的结论是猜测，服务端会拒绝（RESEARCH_SOURCE_REQUIRED），本页不替你补一个来源。";
        return;
      }
      const body = {
        claim: text,
        sourceRefs: refs
      };
      if (confidence.value) body.confidence = confidence.value;
      if (notRule.checked) body.notDesignRule = true;
      const fingerprint = JSON.stringify(body);
      if (fingerprint !== lastFingerprint) {
        findingId = "rf-" + Math.random().toString(16).slice(2, 34);
        lastFingerprint = fingerprint;
      }
      const previous = supersedes.value;
      const payload = { ...body, finding_id: findingId };
      submit.disabled = true;
      outcome.textContent = "提交中…";
      try {
        await api(`/projects/${projectId}/research` + (previous ? `?supersedes=${encodeURIComponent(previous)}` : ""), payload);
        await reload();
        outcome.textContent = "已记录一条研究结论；上方读回来自服务端，不是本页记住的输入。这条结论不等于设计质量判定，也不等于知识导出。";
      } catch (error) {
        const envelope = error.serviceEnvelope;
        outcome.textContent = `未记录：${typeof envelope?.error === "string" ? envelope.error : errMsg(error)}` + (typeof envelope?.detail === "string" && envelope.detail ? ` —— ${envelope.detail}` : "") + "。服务端未写入任何结论。";
      } finally {
        submit.disabled = false;
      }
    })().catch((error) => setStatus(errMsg(error), true));
  };
  return el(
    "div",
    { class: "panel research-form" },
    el("h3", {}, "记录一条研究结论"),
    el(
      "p",
      { class: "view-hint" },
      "一条结论必须带至少一个来源引用；置信度只有你选了才会出现在记录里，页面不默认一个。这里写入的是工作输入，不是 Human Gate 裁决，也不会提升任何验收轴。"
    ),
    el("label", {}, "结论正文", claim),
    el("label", {}, "来源引用（至少一个）", sources),
    el("label", {}, "置信度（可选）", confidence),
    el("label", {}, "标注这不是一条设计规则（可选）", notRule),
    el("label", {}, "取代哪条现行结论（只列读回中出现过的）", supersedes),
    submit
  );
}
async function renderResearch(host) {
  host.replaceChildren(el("p", { class: "view-loading" }, "正在读回研究结论…"));
  const projects2 = await apiOrEmpty("/projects", OFFLINE.projects);
  const projectShape = shapeNotice(projects2);
  if (projectShape) {
    host.replaceChildren(el("p", { class: "error" }, `研究项目清单未读回：${projectShape}`));
    return;
  }
  if (!projects2.projects.length) {
    const offline = disconnectedNotice(projects2);
    host.replaceChildren(el(
      "p",
      { class: offline ? "error" : "view-hint" },
      offline ? `${offline}，项目台账未读回，因此不能断言无项目，也不能替某个项目记录结论。` : "本机尚无项目：研究结论按项目保存，这里不能替不存在的项目建立结论。"
    ));
    return;
  }
  const picker = el("select", { class: "input", id: "research-project" });
  for (const p of projects2.projects) picker.append(new Option(p.name, p.id));
  const outcome = el("p", { class: "view-hint", id: "research-review-outcome" }, "");
  const body = el("div", { class: "research-body" });
  const load = async () => {
    const id = picker.value || projects2.projects[0].id;
    const data = await apiOrEmpty(
      `/projects/${id}/research`,
      RESEARCH_UNREADABLE
    );
    const shape = shapeNotice(data);
    body.replaceChildren(
      shape ? el("p", { class: "error" }, `研究读回形状异常：${shape}`) : researchFacts(data),
      researchFindingRows(data),
      researchDecisionForm(id, data, load, outcome)
    );
  };
  picker.onchange = () => {
    void load().catch((error) => setStatus(errMsg(error), true));
  };
  host.replaceChildren(
    el(
      "div",
      { class: "page-head" },
      el(
        "div",
        {},
        el("h2", {}, "研究洞察"),
        el("p", {}, "按项目读回已持久化的研究结论与其来源覆盖；写入是工作输入，不是验收判定。")
      )
    ),
    el("label", { class: "muted" }, "研究项目", picker),
    outcome,
    body
  );
  await load();
}
async function renderResearchView(target) {
  const findings = el("div", { id: "research-findings" });
  const library = el("div", { id: "capability-library" });
  target.replaceChildren(findings, library);
  await renderResearch(findings);
  await renderCapabilityLibrary(library);
}
async function renderPreflight(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在准备预检…"));
  const known = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-H020";
  const input = el("input", {
    id: "preflight-task-input",
    class: "input preflight-input",
    // The example used to live in the placeholder, where a placeholder cannot wrap:
    // at 1280 the field clipped it after the comma, so the format was visible and the
    // only concrete example was not. It moved into the result panel's first message.
    placeholder: "<TASKPACK>::<TASK_KEY>",
    maxlength: "200",
    "aria-label": "任务资源预检 ID，格式为任务包 ID::任务键"
  });
  const runBtn = el("button", { type: "button", class: "primary-btn", id: "preflight-run" }, "运行预检");
  const result = el(
    "div",
    { class: "panel preflight-result" },
    // Constructed empty, this rendered as a large blank bordered box, which reads as
    // a broken panel rather than as a result area waiting for a run.
    el(
      "p",
      { class: "view-hint" },
      "尚未运行预检。填写任务全 ID（形如 " + known + "），点「运行预检」后在此读回判定与资源清单。"
    )
  );
  const kpiGrid = el(
    "div",
    { class: "kpi-grid" },
    kpiCard("—", "登记资源", "运行预检后读回"),
    kpiCard("—", "阻塞资源", "运行预检后读回"),
    kpiCard("—", "判定", "READY / BLOCKED"),
    kpiCard("—", "机器范围", "运行预检后读回")
  );
  const setKpi = (index, value) => {
    const strong = kpiGrid.querySelectorAll(".kpi strong")[index];
    if (strong) strong.textContent = value;
  };
  const resetKpis = () => {
    for (let i = 0; i < 4; i += 1) setKpi(i, "—");
  };
  const runPreflight = async () => {
    const taskId = input.value.trim();
    if (!taskId) {
      resetKpis();
      result.replaceChildren(el("p", { class: "view-hint" }, "请先填写要预检的任务全 ID（<TASKPACK>::<TASK_KEY>）。"));
      return;
    }
    resetKpis();
    result.replaceChildren(el("p", { class: "view-loading" }, `正在读回 ${taskId} 的资源判定…`));
    try {
      const data = await api(`/task-preflight?task=${encodeURIComponent(taskId)}`);
      const blocked = data.blocked_resources.length;
      const noData = data.resources.length === 0;
      setKpi(0, String(data.resources.length));
      setKpi(1, String(blocked));
      setKpi(2, noData ? "—" : data.verdict);
      setKpi(3, data.machine_scope);
      result.replaceChildren(
        el(
          "span",
          { class: "tag " + (blocked ? "bad" : noData ? "warn" : "ok") },
          noData ? "无可判定资源" : data.verdict
        ),
        el(
          "span",
          { class: "muted" },
          `登记 ${data.registry_state} · 机器 ${data.machine_scope} · 权限 ${data.permissions.meaning}`
        ),
        noData ? el("p", { class: "view-hint" }, `该任务未解析到任何资源（登记状态 ${data.registry_state}）；没有可比对的资源，不给出 READY 判定。`) : blocked ? el("p", { class: "view-hint" }, `阻塞资源 ${blocked} 项：${data.blocked_resources.join(" · ")}。此预检只读回，不安装、不裁许可、不遍历外部根。`) : el("p", { class: "view-hint" }, "无阻塞资源。此为只读预检判定，不等同质量或 rights 验收。"),
        el(
          "div",
          {
            class: "table-wrap",
            tabindex: "0",
            role: "region",
            "aria-label": "预检资源表（可横向滚动）"
          },
          el(
            "table",
            { class: "table" },
            el("thead", {}, el("tr", {}, el("th", {}, "资源"), el("th", {}, "状态"), el("th", {}, "说明"))),
            el("tbody", {}, ...data.resources.map((row) => el(
              "tr",
              {},
              el("td", {}, row.ref),
              el("td", {}, el("span", { class: "tag info" }, row.state)),
              el("td", {}, row.meaning)
            )))
          )
        )
      );
    } catch (error) {
      resetKpis();
      result.replaceChildren(el("p", { class: "error" }, `预检未确认：${errMsg(error)}。服务端拒绝时未写入任何判定。`));
    }
  };
  runBtn.onclick = () => {
    void runPreflight().catch((error) => setStatus(errMsg(error), true));
  };
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "预检 / QA"),
      el("p", {}, "与 CLI doctor 同一读回源：只探测与报告，从不安装、从不接受许可、从不遍历外部根。")
    ),
    el(
      "div",
      { class: "page-actions" },
      runBtn
    )
  );
  const juryHost = el("div", { id: "jury-review" });
  const rightsHost = el("div", { id: "rights-review" });
  target.replaceChildren(
    pageHead,
    kpiGrid,
    el(
      "div",
      { class: "toolbar" },
      el("label", { class: "muted" }, "任务全 ID", input)
    ),
    result,
    el(
      "section",
      { class: "panel" },
      el("h3", {}, "设计评审 · Human Jury"),
      el(
        "p",
        { class: "view-hint" },
        "与上方资源预检是两件事：这里读回的是人工签署的裁决，绑定到具体版本摘要。"
      ),
      juryHost
    ),
    el(
      "section",
      { class: "panel" },
      el("h3", {}, "权利决定 · Human RIGHTS"),
      el(
        "p",
        { class: "view-hint" },
        "与上方资源预检、人工评审都是不同的门：这里读回并提交的是一条使用范围上的许可立场。提交是 Human Gate，只在本页由人执行；证据系统只读回。"
      ),
      rightsHost
    )
  );
  await renderJuryReview(juryHost);
  await renderRightsReview(rightsHost);
}
function valueRow(label, value, long, tagClass = "info") {
  return long ? el(
    "li",
    { class: "list-item value-row" },
    el("span", {}, label),
    el("span", { class: "value-mono" }, value)
  ) : el(
    "li",
    { class: "list-item" },
    el("span", {}, label),
    el("span", { class: "tag " + tagClass }, value)
  );
}
async function renderCapabilityLibrary(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回能力库…"));
  const data = await apiOrEmpty("/capabilities", OFFLINE.capabilities);
  const rows = data.capabilities;
  const filter = el("input", {
    class: "input capability-filter",
    type: "search",
    id: "capability-filter",
    placeholder: "按 ID / 许可 / 域 / 处置 / 修订状态过滤",
    "aria-label": "能力库过滤"
  });
  const shown = el("span", { class: "muted", id: "capability-shown" }, "");
  const body = el("tbody", {});
  const render = () => {
    const needle = (filter.value || "").trim().toLowerCase();
    const keep = needle ? rows.filter((c) => [
      c.id,
      c.license,
      c.domain,
      c.disposition,
      c.presence,
      c.revisionState,
      c.sourceType,
      c.evidenceLevel,
      c.upstreamOwner
    ].join(" ").toLowerCase().includes(needle)) : rows;
    body.replaceChildren(...keep.map((c) => el(
      "tr",
      {},
      el(
        "td",
        {},
        el("strong", {}, c.id),
        el("div", { class: "muted" }, `${c.kind} · ${c.sourceType ?? "未分类"}`),
        // The withdrawal instruction is part of the record, not an afterthought: the
        // plan asks for upgrade/withdraw with source references, and this is the
        // recorded path for exactly this candidate.
        c.removalPath ? el(
          "details",
          { class: "capability-withdraw" },
          el("summary", {}, "撤回路径"),
          el("p", { class: "mono" }, c.removalPath)
        ) : ""
      ),
      el("td", {}, c.license ?? "（无记录）"),
      el("td", {}, c.disposition ?? "—"),
      el("td", {}, c.presence ?? "—"),
      el("td", {}, el("span", {
        // A revision recovered by exact repository-path join is the only green here;
        // unresolved and not-verified are warnings, never blanks.
        class: "tag " + (c.revisionState === "VERIFIED" ? "ok" : "warn")
      }, en(c.revisionState)), c.revision ? el("div", { class: "mono" }, c.revision) : ""),
      el("td", {}, c.qualified === null ? el("span", { class: "tag neutral" }, "未判定") : el("span", { class: "tag info" }, String(c.qualified))),
      el("td", {}, c.evidenceLevel ? el(
        "span",
        { class: "tag " + (c.evidenceLevel === "E0" ? "warn" : "info") },
        en(c.evidenceLevel)
      ) : el("span", { class: "tag neutral" }, "未记录")),
      // Popularity is shown with its observation stamp and an explicit not-a-score
      // marker, per the taxonomy policy `popularityIsNotQuality`.
      el("td", {}, c.popularity ? el(
        "span",
        { class: "muted" },
        `★ ${c.popularity.stargazerCount ?? "—"} · fork ${c.popularity.forkCount ?? "—"} · ${c.popularity.observedAt?.slice(0, 10) ?? "未记时间"} · 非质量分`
      ) : el("span", { class: "muted" }, "未观测"))
    )));
    shown.textContent = `显示 ${keep.length} / ${rows.length} 条`;
  };
  filter.oninput = () => {
    render();
  };
  const researchCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === "research-insights");
  target.replaceChildren(
    el(
      "div",
      { class: "page-head" },
      el(
        "div",
        {},
        el("h2", {}, "能力库"),
        // The payload carries `unmeasuredMeans` for machines; the reader gets the same
        // rule in the page's own language, with the English state words left untranslated.
        el("p", {}, "只读回仓内已维护的能力记录：来源锁、修订账与模型雷达。空白不等于 0：未经宿主运行与人工验收的项标为 未判定，未取回修订的项标为 NOT_VERIFIED 或 UNRESOLVED；本视图不安装、不取证、不代签许可。")
      ),
      el("div", { class: "page-actions" }, shown)
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, `能力记录（${data.counts.total}）`),
      el(
        "p",
        { class: "view-hint" },
        `许可分布 ${Object.entries(data.counts.byLicense).map(([k, v]) => `${k} ${v}`).join(" · ")}；修订 ${Object.entries(data.counts.byRevisionState).map(([k, v]) => `${k} ${v}`).join(" · ")}；已判定 ${data.counts.qualified}。本视图不安装、不取证、不代签许可。`
      ),
      el("label", { class: "project-picker" }, "过滤", filter),
      el(
        "div",
        {
          class: "table-wrap",
          tabindex: "0",
          role: "region",
          "aria-label": "能力库表（可横向滚动）"
        },
        el(
          "table",
          { class: "table" },
          el("thead", {}, el(
            "tr",
            {},
            el("th", {}, "能力"),
            el("th", {}, "许可"),
            el("th", {}, "处置"),
            el("th", {}, "存在状态"),
            el("th", {}, "修订"),
            el("th", {}, "资格判定"),
            el("th", {}, "证据级"),
            el("th", {}, "热度（非质量分）")
          )),
          body
        )
      )
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "分类轴现状"),
      el(
        "p",
        { class: "view-hint" },
        `已连接候选分类 ${data.classification?.joined ?? 0} / ${data.counts.total} 条。` + (data.classification?.unclassifiedAxes?.length ? `以下轴在候选分类账中全部为空，界面不代填：${data.classification.unclassifiedAxes.join("、")}。` : "所有已声明分类轴均有值。") + ` ${data.classification?.note ?? ""}`
      ),
      el(
        "p",
        { class: "view-hint" },
        "热度取自 GitHub 观测并带观测时间；策略明确 popularityIsNotQuality，因此它不参与排序或判定。"
      )
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "研究结论"),
      el("p", { class: "view-hint" }, "研究结论已改为读本项目的持久化路由，在本页上方读回；这里保留登记表卡片本身，不再声称缺少路由。"),
      researchCard ? capabilityCard(researchCard) : el("p", { class: "view-hint" }, "（登记表无此项）")
    ),
    ...shapeNoticeRows(data)
  );
  render();
}
const DOMAIN_TONE = {
  // VALIDATES is the only green, and it is green about structure. NOT_CHECKED is
  // deliberately warn rather than bad: no verdict was produced, which is not a failure.
  VALIDATES: "ok",
  INVALID: "bad",
  UNREADABLE: "bad",
  NOT_CHECKED: "warn"
};
const DOMAIN_UNREAD = "未读回";
const DOMAIN_UNDECLARED = "未声明";
function domainRead(value) {
  return value ? value : DOMAIN_UNREAD;
}
function domainDeclared(value) {
  return value === void 0 ? DOMAIN_UNREAD : value ?? DOMAIN_UNDECLARED;
}
function domainDependencies(values) {
  if (values === void 0) return DOMAIN_UNREAD;
  if (values === null) return DOMAIN_UNDECLARED;
  return values.length ? values.join(" / ") : "声明为空（无依赖）";
}
function domainVerdict(value) {
  return value === void 0 ? DOMAIN_UNREAD : en(value);
}
function domainTone(value) {
  return value === void 0 ? "warn" : DOMAIN_TONE[value] ?? "warn";
}
function domainPackRow(pack) {
  return el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, pack.displayName ?? domainRead(pack.directory)),
      el("small", {}, `目录 ${domainRead(pack.directory)} · pack_id ${domainDeclared(pack.packId)} · 版本 ${domainDeclared(pack.version)} · 领域 ${domainDeclared(pack.domain)} · 清单 schema ${domainDeclared(pack.manifestSchemaVersion)} · 依赖 ${domainDependencies(pack.dependencies)}`)
    ),
    el(
      "span",
      { class: "tag " + domainTone(pack.validation) },
      domainVerdict(pack.validation)
    )
  );
}
async function renderDomains(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回域包…"));
  const data = await apiOrEmpty("/domains", OFFLINE.domains);
  const packs = data.packs.map((pack) => ({
    ...pack,
    validationErrors: Array.isArray(pack.validationErrors) ? pack.validationErrors : []
  }));
  const tallies = data.counts.byValidation;
  const findings = packs.filter((pack) => pack.validation !== "VALIDATES");
  const judged = (state) => packs.filter((pack) => pack.validation === state).length;
  const truncated = findings.filter((pack) => pack.validationErrors.length < (pack.validationErrorCount ?? pack.validationErrors.length));
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "设计领域"),
      el(
        "p",
        { class: "muted" },
        "域包清单、身份与判定全部来自 ",
        el("span", { class: "mono" }, domainRead(data.root)),
        " 的服务端读回；判定由仓内校验器 ",
        el("span", { class: "mono" }, domainRead(data.checker.path)),
        " 逐包给出。",
        en("VALIDATES"),
        " 只表示结构（E1）合规：不是宿主运行、不是设计验收、也不是该领域能力已被认定。未声明与未读回是两件事，分开写。"
      )
    ),
    el("div", { class: "page-actions" })
  );
  const kpis = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(packs.length), "域包目录", `${domainRead(data.root)} 读回`),
    kpiCard(String(judged("VALIDATES")), "结构校验通过", "校验器判定，E1 结构级"),
    kpiCard(String(judged("INVALID")), "校验不通过", "下方逐项列出校验器原因"),
    kpiCard(
      String(packs.length - judged("VALIDATES")),
      "未通过 / 无判定",
      "校验不通过、清单读不到或未产生判定，逐项见下方"
    )
  );
  const unavailable = [];
  if (data.rootState !== "PRESENT") {
    unavailable.push(`域包根 ${domainRead(data.root)} 的状态是 ${domainRead(data.rootState)}，没有目录被列出`);
  }
  if (data.checker.state !== "LOADED") {
    unavailable.push(`校验器 ${domainRead(data.checker.path)} 未能载入${data.checker.note ? `（${data.checker.note}）` : ""}，因此没有任何域包获得判定`);
  }
  const banner = unavailable.length ? [el("p", { class: "error" }, "未读回判定基础：" + unavailable.join("；") + "。")] : [];
  const entries = Object.entries(tallies);
  const tallyLine = el(
    "p",
    { class: "view-hint" },
    entries.length ? `判定分布（路由统计）：${entries.map(([state, count]) => `${state} ${count}`).join(" · ")}` : disconnectedNotice(data) ? `判定分布未读回：${disconnectedNotice(data)}` : "判定分布为空：本次读回没有给出判定计数，逐包状态见上方列表"
  );
  const packList = el(
    "div",
    { class: "panel" },
    el("h3", {}, `域包登记（${packs.length}）`),
    el(
      "ul",
      { class: "list" },
      ...packs.length ? packs.map(domainPackRow) : [emptyLi(
        data,
        shapeFieldMissing(data, "packs") ? "未读回" : "尚无域包目录",
        shapeFieldMissing(data, "packs") ? "响应没有给出 packs，所以这一屏不是服务端答出来的空台账" : `${domainRead(data.root)} 下没有可读回的域包目录`
      )]
    ),
    tallyLine
  );
  const findingPanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, `结构校验发现（${findings.length}）`),
    ...findings.length ? findings.map((pack) => el(
      "p",
      { class: "view-hint" },
      el("span", { class: "mono" }, domainRead(pack.directory)),
      " · ",
      domainVerdict(pack.validation),
      `：${pack.validationErrors.length ? pack.validationErrors.join(" ｜ ") : "（校验器未给出逐条原因）"}`,
      pack.validationErrors.length < (pack.validationErrorCount ?? 0) ? `（校验器共 ${pack.validationErrorCount} 条，此处每条只取首行）` : "",
      pack.note ? ` 备注：${pack.note}` : ""
    )) : [el(
      "p",
      { class: "view-hint" },
      data.checker.state === "LOADED" && data.rootState === "PRESENT" ? "本次读回的每个域包目录都通过结构校验；这不构成领域能力验收。" : "没有可报告的发现，因为判定基础本身未读回（见上方告警）。"
    )]
  );
  target.replaceChildren(
    pageHead,
    kpis,
    ...banner,
    packList,
    findingPanel,
    el(
      "p",
      { class: "view-hint" },
      `${domainRead(data.meaning)} ${domainRead(data.unmeasuredMeans)}` + (truncated.length ? `（其中 ${truncated.length} 项的校验原因按每条首行截断）` : "") + " 本页不安装、不生成、不改写域包，也不判定设计质量。"
    ),
    ...shapeNoticeRows(data)
  );
}
async function renderSettings(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回运行环境…"));
  const env = await apiOrEmpty("/environment", OFFLINE.environment);
  const rows = [
    { label: "环境状态", value: env.status, long: false },
    { label: "诊断契约", value: env.schemaVersion, long: true },
    { label: "项目根", value: env.project_root, long: true },
    { label: "项目本地根", value: env.project_local_root, long: true },
    { label: "写入痕迹", value: `写入 ${env.write_trace} · 迁移 ${env.migration}`, long: false },
    { label: "代理配置", value: `${env.agent_profile.status} · ${env.agent_profile.writable ? "可写" : "不可写"}`, long: false }
  ];
  const writablePill = (writable) => el(
    "span",
    { class: "tag " + (writable ? "warn" : "info") },
    writable ? "声明可写（未探测）" : "只读"
  );
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "系统设置"),
      el("p", {}, "设置页只读回服务端诊断；本服务不修改任何配置。")
    ),
    el("div", { class: "page-actions" })
  );
  target.replaceChildren(
    pageHead,
    // This panel is the only child of the row, so it must not sit in a
    // three-column grid: at 1440 it rendered ~450px wide with 950px of empty
    // canvas to its right. Full width lets .list-item's space-between put the
    // label left and the status pill right, which reads as designed rather
    // than truncated.
    el(
      "div",
      { class: "panel" },
      // The panel heading and its first row were both called 环境状态, so the
      // page read the heading as a duplicate of the value under it. The panel is
      // a readback of the service environment; the row inside it is the status.
      el("h3", {}, "服务端环境读回"),
      el(
        "ul",
        { class: "list" },
        ...rows.map((r) => valueRow(
          r.label,
          r.value,
          r.long,
          r.label === "代理配置" ? "warn" : "info"
        ))
      )
    ),
    // 路径诊断是后端对接面，不是设计生产面：默认收起，展开才占版面。
    el(
      "details",
      { class: "advanced" },
      el("summary", {}, "服务端路径诊断（默认收起）"),
      el(
        "div",
        { class: "advanced-body" },
        el(
          "div",
          { class: "three-col" },
          el(
            "div",
            { class: "panel" },
            el("h3", {}, "项目根（服务声明可写，未探测）"),
            el(
              "ul",
              { class: "list" },
              ...Object.keys(env.roots).length ? Object.entries(env.roots).map(([name, root]) => el(
                "li",
                { class: "list-item" },
                el("div", {}, el("strong", {}, name), el("small", {}, root.path)),
                writablePill(root.writable)
              )) : [emptyLi(env, "尚无根登记", "服务未返回 roots")]
            )
          ),
          el(
            "div",
            { class: "panel" },
            el("h3", {}, "外置输入（只读 · DECLARED_NOT_PROBED）"),
            el(
              "ul",
              { class: "list" },
              ...Object.keys(env.shared_inputs).length ? Object.entries(env.shared_inputs).map(([name, input]) => el(
                "li",
                { class: "list-item" },
                el("div", {}, el("strong", {}, name), el("small", {}, input.path)),
                el("span", { class: "tag info" }, input.status)
              )) : [emptyLi(env, "尚无外置输入", "服务未返回 shared_inputs")]
            )
          )
        )
      )
    ),
    el("p", { class: "view-hint" }, "代理配置私有状态不可写：PRIVATE_NOT_INSPECTED · 不可写。本服务不读取、不打印任何凭据。"),
    ...shapeNoticeRows(env)
  );
}
async function projectPickerPanel(target, title, body, preamble) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回项目台账…"));
  const data = await apiOrEmpty("/projects", OFFLINE.projects);
  const unread = shapeNotice(data);
  const offline = disconnectedNotice(data);
  if (!data.projects.length) {
    target.replaceChildren(
      el(
        "div",
        { class: "page-head" },
        el(
          "div",
          {},
          el("h2", {}, title),
          el("p", {}, "只读回服务端台账；本页不提交、不修改。")
        )
      ),
      ...preamble ? [preamble] : [],
      el(
        "p",
        { class: unread || offline ? "error" : "view-hint" },
        unread ? `${unread}，因此无法判断台账是否为空` : offline ? `${offline}，台账未读回，不能断言为空` : "尚无项目。先在工作台新建项目，再读回此视图。"
      )
    );
    return;
  }
  const sole = data.projects.length === 1 ? data.projects[0] : null;
  const select = el("select", { class: "project-select", id: `${title.replace(/\s+/g, "-")}-project` });
  if (!sole) select.append(el("option", { value: "" }, `选择项目（共 ${data.projects.length} 个）`));
  for (const p of data.projects) select.append(el("option", { value: p.id }, p.name));
  const content = el("div", { class: "route-view-body" });
  target.replaceChildren(
    el(
      "div",
      { class: "page-head" },
      el(
        "div",
        {},
        el("h2", {}, title),
        el("p", {}, "只读回服务端台账；本页不提交、不修改。")
      )
    ),
    ...preamble ? [preamble] : [],
    el("label", { class: "project-picker" }, "项目", select),
    content,
    ...shapeNoticeRows(data)
  );
  const load = async () => {
    const id = select.value;
    if (!id) {
      content.replaceChildren(el(
        "div",
        { class: "empty" },
        el("div", { class: "icon", "aria-hidden": "true" }, "—"),
        el("p", {}, `未选择项目，${title}没有可读回的记录`),
        el("small", {}, "在上方「项目」中选择项目后，本页从服务端台账只读回；未读回不显示数字。")
      ));
      return;
    }
    content.replaceChildren(el("p", { class: "view-loading" }, "正在读回该项目…"));
    try {
      content.replaceChildren(await body(id));
    } catch (error) {
      content.replaceChildren(el("p", { class: "error" }, `读回失败：${errMsg(error)}`));
    }
  };
  select.onchange = () => {
    void load();
  };
  await load();
}
async function renderProjects(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回项目台账…"));
  const data = await apiOrEmpty("/projects", OFFLINE.projects);
  const n = data.projects.length;
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "项目"),
      el("p", {}, "支持筛选、编辑与本地持久化。数据来自服务端台账；新建 / 选择项目在工作台执行，本页只读回。")
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", {
        type: "button",
        class: "primary-btn",
        onclick: () => {
          window.location.hash = "";
        }
      }, "+ 新建项目")
    )
  );
  const kpis = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(n), "项目", "服务端台账读回"),
    kpiCard("—", "进行中", "状态需在工作台查看"),
    kpiCard("—", "已完成", "状态需在工作台查看")
  );
  const list = el(
    "div",
    {
      class: "table-wrap",
      tabindex: "0",
      role: "region",
      "aria-label": "项目台账表（可横向滚动）"
    },
    el(
      "table",
      { class: "table" },
      el("thead", {}, el(
        "tr",
        {},
        el("th", { scope: "col" }, "项目"),
        el("th", { scope: "col" }, "ID"),
        el("th", { scope: "col" }, "状态"),
        el("th", { scope: "col" }, "操作")
      )),
      el(
        "tbody",
        {},
        ...data.projects.length ? data.projects.map((p) => el(
          "tr",
          {},
          el("th", { scope: "row" }, expandableTitle(p.name)),
          el("td", {}, p.id),
          // /api/projects returns only {id, name}: ProjectRecord carries no
          // status field, so the ledger cannot say "Active". The same page
          // already refuses to guess 进行中/已完成 in its KPIs.
          el("td", {}, el("span", { class: "tag neutral" }, "未读回")),
          el("td", {}, el("button", {
            type: "button",
            class: "ghost-btn",
            // B07 `/projects/:id` — reached from a row, never a nav item
            // (ROUTE_VIEWS must stay 12 for the browser E2E nav assertion).
            onclick: () => {
              window.location.hash = projectDetailHash(p.id);
            }
          }, "打开"))
        )) : [el("tr", {}, emptyTd(data, "尚无项目", "在工作台新建项目后出现。", 4))]
      )
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    el("div", { class: "panel" }, el("h3", {}, `项目（${n}）`), list),
    ...shapeNoticeRows(data)
  );
}
const TOOL_ADAPTERS = [
  { name: "Illustrator / AI", kind: "illustrator", state: "declared", path: "宿主驱动" },
  { name: "Photoshop / PSD", kind: "photoshop", state: "declared", path: "宿主驱动" }
];
async function renderCreativeTools(target) {
  await projectPickerPanel(target, "创作工具", async (id) => {
    const tasks2 = await apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks);
    const env = await apiOrEmpty("/environment", OFFLINE.environment);
    const mcpCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === "mcp-diagnostics");
    const hostCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === "host-adapter-live");
    const hostStatus = el(
      "div",
      { class: "panel" },
      el("h3", {}, "宿主 / Capability 状态"),
      el(
        "div",
        { class: "three-col" },
        el(
          "div",
          { class: "panel" },
          el("h3", {}, "宿主读回"),
          el(
            "ul",
            { class: "list" },
            ...TOOL_ADAPTERS.map((a) => el(
              "li",
              { class: "list-item" },
              el(
                "div",
                {},
                el("strong", {}, a.name),
                el("small", {}, a.path)
              ),
              el("span", { class: "tag neutral" }, en("UNKNOWN"))
            ))
          ),
          el("p", { class: "view-hint" }, "宿主在线状态尚未有服务路由；此处 UNKNOWN，不假报可用。")
        ),
        el(
          "div",
          { class: "panel" },
          el("h3", {}, "共享输入"),
          el("ul", { class: "list" }, ...sharedInputRows(env)),
          el("p", { class: "view-hint" }, "服务端环境读回。")
        ),
        hostCard ? capabilityCard(hostCard) : el("div", { class: "panel" }),
        mcpCard ? capabilityCard(mcpCard) : el("div", { class: "panel" })
      )
    );
    const adapterGrid = el(
      "div",
      { class: "card-flow" },
      ...TOOL_ADAPTERS.map(
        (a) => el(
          "div",
          { class: "panel" },
          el("h3", {}, a.name),
          el(
            "div",
            { class: "status-stack" },
            el("span", { class: "tag info" }, a.state),
            // Neutral, not ok: the fact here is that an adapter entry exists in
            // integrations/adapter-registry.json. Nothing probed the host, and the panel
            // above this one says so ("UNKNOWN，不假报可用"). A green pill on the same
            // page contradicted it.
            el("span", { class: "tag neutral" }, "登记于 adapter-registry")
          )
        ),
        el("p", { class: "view-hint" }, "连接方式 / 权限 / 可执行能力由宿主与 service 裁定；本页只读回，不触发实操。")
      )
    );
    const rows = tasks2.tasks.length ? tasks2.tasks.map((t) => el(
      "tr",
      {},
      el("td", {}, t.kind),
      el("td", {}, t.state),
      el("td", {}, t.attempt.state)
    )) : [el("tr", {}, emptyTd(tasks2, "尚无宿主任务", "创作任务由 Illustrator / Photoshop 在工作台高级区提交。", 3))];
    return el(
      "div",
      {},
      hostStatus,
      adapterGrid,
      el("p", { class: "view-hint" }, "宿主任务只读回服务端任务台账。提交 / 运行 / 取消由宿主（Illustrator / Photoshop）在工作台执行；本页不触发实操。"),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, `任务（${tasks2.tasks.length}）`),
        el(
          "div",
          {
            class: "table-wrap",
            tabindex: "0",
            role: "region",
            "aria-label": "设计领域任务表（可横向滚动）"
          },
          el(
            "table",
            { class: "table" },
            el("thead", {}, el("tr", {}, el("th", {}, "类型"), el("th", {}, "状态"), el("th", {}, "尝试"))),
            el("tbody", {}, ...rows)
          )
        )
      ),
      ...shapeNoticeRows(env, tasks2)
    );
  });
}
const DELIVERABLE_FORMATS = [
  { format: "PSD", producedBy: "native.psd" },
  { format: "AI", producedBy: "native.ai" },
  { format: "PNG", producedBy: "preview.png" },
  { format: "SVG", producedBy: "preview.svg" },
  { format: "Archive", producedBy: "delivery.zip" },
  { format: "PDF", producedBy: null },
  { format: "Video", producedBy: null },
  { format: "3D", producedBy: null }
];
const PREFLIGHT_PROFILES = ["print", "digital", "video"];
const OUTCOME_TAGS = {
  PASS: "ok",
  WARNING: "warn",
  FAIL: "bad",
  NOT_MEASURED: "warn",
  NOT_APPLICABLE: "neutral"
};
function artifactPreflightPanel(bundleId, data) {
  const tagClass = data.verdict === "PASS" ? "ok" : data.verdict === "WARN" || data.verdict === "INCOMPLETE" ? "warn" : data.verdict === "BLOCKED" ? "bad" : "neutral";
  const unmeasured = data.counts["NOT_MEASURED"] ?? 0;
  return el(
    "div",
    { class: "bundle-preflight-readback" },
    el(
      "p",
      {},
      el("span", { class: "tag " + tagClass }, en(data.verdict)),
      el(
        "span",
        { class: "muted" },
        `profile ${en(data.profile)} · 判据版本 ${String(data.profileSchema)} · 未量 ${unmeasured} 项 / 共 ${data.findings.length} 项`
      )
    ),
    // The rule that keeps INCOMPLETE honest is the service's sentence, not the page's.
    el("p", { class: "view-hint" }, data.meaning),
    el(
      "div",
      {
        class: "table-wrap",
        tabindex: "0",
        role: "region",
        "aria-label": "产物预检结果表（可横向滚动）"
      },
      el(
        "table",
        { class: "table" },
        el("thead", {}, el(
          "tr",
          {},
          el("th", {}, "检查项"),
          el("th", {}, "严重度"),
          el("th", {}, "结论"),
          el("th", {}, "读回与判据")
        )),
        el("tbody", {}, ...data.findings.map((finding) => el(
          "tr",
          {},
          el("td", {}, finding.id),
          el("td", {}, el("span", { class: "tag info" }, en(finding.severity))),
          el("td", {}, el("span", {
            class: "tag " + (OUTCOME_TAGS[finding.outcome] ?? "neutral")
          }, en(finding.outcome))),
          // Both strings travel: the reading and the criterion it was judged against.
          // A table of verdicts with no stated basis is what this module exists to stop.
          el(
            "td",
            {},
            finding.detail,
            el("div", { class: "value-mono" }, "判据：" + finding.criterion)
          )
        )))
      )
    )
  );
}
async function runArtifactPreflight(projectId, bundleId, profile, host) {
  host.replaceChildren(el(
    "p",
    { class: "view-loading" },
    `正在按 ${profile} profile 预检 ${bundleId}…`
  ));
  try {
    const data = await api(
      `/projects/${projectId}/bundles/${bundleId}/preflight?profile=${encodeURIComponent(profile)}`,
      {}
    );
    host.replaceChildren(artifactPreflightPanel(bundleId, data));
  } catch (error) {
    host.replaceChildren(el(
      "p",
      { class: "error" },
      `预检未确认：${errMsg(error)}。服务端拒绝时没有写入任何结论。`
    ));
  }
}
const ROLLBACK_STATE_TAGS = {
  RESOLVED: "ok",
  SOURCE_MISSING: "bad",
  OTHER_PROJECT: "bad",
  SOURCE_NOT_ACTIVE: "warn",
  REF_UNPARSED: "warn",
  ALL_RESOLVED: "info",
  PARTLY_UNRESOLVED: "warn",
  NONE_RESOLVED: "bad",
  NOTHING_TO_CHECK: "neutral",
  LEDGER_UNREADABLE: "warn"
};
const RECEIPT_AXIS_TAGS = { PASS: "ok", PARTIAL: "warn" };
function receiptIdentityRow(label, value) {
  return el(
    "tr",
    {},
    el("th", { scope: "row" }, label),
    el("td", {}, el("div", { class: "value-mono" }, value))
  );
}
function deliveryReceiptTableWrap(label, table) {
  return el("div", {
    class: "table-wrap",
    tabindex: "0",
    role: "region",
    "aria-label": label
  }, table);
}
function receiptLine(value, fallback, marked, mono) {
  const present = typeof value === "string" && value.length > 0;
  if (!present) return el("div", { class: "muted" }, fallback);
  const text = value;
  const body = marked ? en(text) : text;
  return el("div", mono ? { class: "value-mono" } : {}, body);
}
function rollbackLimits(readback) {
  const lines = Array.isArray(readback.does_not_prove) ? readback.does_not_prove : [];
  if (!lines.length) {
    return el(
      "p",
      { class: "view-hint" },
      "本读回未给出 does_not_prove，因此无法说明这些核对结论不覆盖什么。"
    );
  }
  return el("ul", { class: "list" }, ...lines.map((line) => el(
    "li",
    { class: "list-item" },
    el("span", {}, en(line))
  )));
}
function publishedWords(list) {
  return Array.isArray(list) ? list.filter((word) => typeof word === "string") : null;
}
function rollbackTagFor(word, list) {
  const published = publishedWords(list);
  if (published !== null && !published.includes(word)) return "bad";
  return ROLLBACK_STATE_TAGS[word] ?? "neutral";
}
function rollbackUnpublishedNote(word, list) {
  const published = publishedWords(list);
  return published !== null && !published.includes(word) ? "（不在响应公布的词表内）" : "";
}
function rollbackProofTable(readback) {
  const proofs = Array.isArray(readback.rollback_proofs) ? readback.rollback_proofs : [];
  const meaning = readback.state_meaning ?? {};
  return el(
    "div",
    {
      class: "table-wrap",
      tabindex: "0",
      role: "region",
      "aria-label": "回滚参照核对表（可横向滚动）"
    },
    el(
      "table",
      { class: "table" },
      el("thead", {}, el(
        "tr",
        {},
        el("th", {}, "交付物"),
        el("th", {}, "回滚参照"),
        el("th", {}, "核对"),
        el("th", {}, "依据")
      )),
      el("tbody", {}, ...proofs.map((proof) => {
        const state = typeof proof.state === "string" ? proof.state : "";
        const note = typeof meaning[state] === "string" ? meaning[state] : null;
        return el(
          "tr",
          {},
          el("td", {}, proof.deliverable_id ?? "未记录"),
          el("td", {}, receiptLine(proof.backup_ref, "文档未记录 backup_ref", false, true)),
          el(
            "td",
            {},
            el(
              "span",
              { class: "tag " + rollbackTagFor(state, readback.rollback_states) },
              state ? en(state) : "未读回",
              rollbackUnpublishedNote(state, readback.rollback_states)
            ),
            receiptLine(proof.version_no === null || proof.version_no === void 0 ? null : `版本 v${proof.version_no}`, "未解析出版本号", false, true)
          ),
          el(
            "td",
            {},
            receiptLine(proof.reason, "服务端未给出依据", true, false),
            receiptLine(note, "该状态的释义未随响应给出", true, false)
          )
        );
      }))
    )
  );
}
function rollbackNothingChecked(readback) {
  const state = typeof readback.rollback_state === "string" && readback.rollback_state.length ? readback.rollback_state : "";
  const cause = state === "LEDGER_UNREADABLE" ? "台账在本次读回中无法查询，所以没有任何一个引用被核对过；这不说明那些源版本已经不存在。" : '这份收据没有交付物条目可供核对，"没有可核对的东西"与"全部可兑现"不是同一件事。';
  return el(
    "p",
    { class: "view-hint" },
    "回滚核对未做（",
    state ? en(state) : "状态未读回",
    "）：",
    cause
  );
}
function rollbackProofRows(readback) {
  if (!Array.isArray(readback.rollback_proofs)) {
    return [el(
      "p",
      { class: "error" },
      "回滚参照未读回：响应没有给出 rollback_proofs，本页不替它宣布这些引用可兑现或不可兑现。"
    )];
  }
  if (!readback.rollback_proofs.length) return [rollbackNothingChecked(readback)];
  return [rollbackProofTable(readback)];
}
function deliveryReceiptPanel(readback) {
  const data = readback.receipt;
  if (!data || !Array.isArray(data.deliverables)) {
    return el(
      "p",
      { class: "error" },
      "收据形状未读回：文档没有给出 deliverables，本页不替它猜交付物数量。"
    );
  }
  const axis = typeof data.axes?.delivery === "string" ? data.axes.delivery : "";
  const aggregate = typeof readback.rollback_state === "string" ? readback.rollback_state : "";
  const identity = [
    receiptIdentityRow("文档版本", String(data.schemaVersion ?? "")),
    receiptIdentityRow("收据 id", String(data.receipt_id ?? "")),
    receiptIdentityRow("收据摘要", String(data.receipt_sha256 ?? "")),
    receiptIdentityRow("绑定任务", String(data.job_id ?? "")),
    receiptIdentityRow("记录时间", String(data.created_at ?? "文档未记录时间"))
  ];
  const entries = data.deliverables.map((entry) => el(
    "tr",
    {},
    el("td", {}, entry.deliverable_id),
    el("td", {}, String(entry.byte_size)),
    el("td", {}, entry.editable ? "可编辑源文件" : "预览（压平）"),
    // The readback columns are what the PARTIAL axis is about: a real delivery here
    // never re-opens its own artifact in the host, so this says 无 rather than passing.
    el("td", {}, entry.host_readback ? entry.readback_matches_artifact === false ? "有读回记录 · 与交付摘要不一致" : "有读回记录" : "无宿主读回记录"),
    el(
      "td",
      {},
      el("div", { class: "value-mono" }, String(entry.artifact_sha256)),
      el(
        "div",
        { class: "value-mono" },
        `回滚参照：${String(entry.rollback?.backup_ref ?? "文档未记录")}`
      )
    )
  ));
  const requirements = data.deliverables.flatMap((entry) => (entry.requirements ?? []).map((requirement) => el(
    "tr",
    {},
    el("td", {}, entry.deliverable_id),
    el("td", {}, requirement.req_id),
    // The status word is the document's own, never a paraphrase: a receipt that
    // records NOT_RUN for rights must not be painted 未通过 or 已验收.
    el("td", {}, el("span", { class: "tag info" }, en(String(requirement.status))))
  )));
  return el(
    "div",
    { class: "delivery-receipt-readback" },
    el(
      "p",
      {},
      el(
        "span",
        { class: "tag " + (RECEIPT_AXIS_TAGS[axis] ?? "neutral") },
        axis ? en(axis) : "轴值未读回"
      ),
      el(
        "span",
        {
          class: "tag " + rollbackTagFor(aggregate, readback.rollback_state_vocabulary)
        },
        aggregate ? en(aggregate) : "回滚汇总未读回",
        rollbackUnpublishedNote(aggregate, readback.rollback_state_vocabulary)
      ),
      el("span", { class: "muted" }, `交付收据 · ${data.deliverables.length} 个交付物`)
    ),
    deliveryReceiptTableWrap(
      "交付收据身份与时间表（可横向滚动）",
      el("table", { class: "table" }, el("tbody", {}, ...identity))
    ),
    deliveryReceiptTableWrap(
      "交付收据条目表（可横向滚动）",
      el(
        "table",
        { class: "table" },
        el("thead", {}, el(
          "tr",
          {},
          el("th", {}, "交付物"),
          el("th", {}, "字节"),
          el("th", {}, "可编辑性"),
          el("th", {}, "宿主读回"),
          el("th", {}, "产物摘要 / 回滚参照")
        )),
        el("tbody", {}, ...entries)
      )
    ),
    deliveryReceiptTableWrap(
      "交付收据要求项表（可横向滚动）",
      el(
        "table",
        { class: "table" },
        el("thead", {}, el(
          "tr",
          {},
          el("th", {}, "交付物"),
          el("th", {}, "要求项"),
          el("th", {}, "登记状态")
        )),
        el("tbody", {}, ...requirements)
      )
    ),
    ...rollbackProofRows(readback),
    el(
      "p",
      { class: "view-hint" },
      "收据读回的是交付时登记的事实：成员摘要、字节、可编辑性声明与逐项要求状态。要求项为 NOT_RUN / UNVERIFIED 说的是这些门当时没有跑，不是跑失败了；本页不把它读成 rights 或质量验收。"
    ),
    el(
      "p",
      { class: "view-hint" },
      "回滚核对只回答一件事：收据点名的那个不可变源版本，现在还在不在本项目的台账里。RESOLVED 不等于已经回滚过——收据自己把这条记录称为计划，本页不替它执行。"
    ),
    rollbackLimits(readback)
  );
}
function receiptRefusal(error) {
  const envelope = error.serviceEnvelope;
  const code = typeof envelope?.["error"] === "string" ? envelope["error"] : errMsg(error);
  if (code === "DELIVERY_RECEIPT_NOT_FOUND") {
    return "未读回交付收据（DELIVERY_RECEIPT_NOT_FOUND）：该 ACTIVE 版本没有已登记的收据文档。没有收据不等于交付失败，也不等于已验收；要出证需由交付流程写入。";
  }
  if (code === "DELIVERY_RECEIPT_UNVERIFIED") {
    return "拒绝出证（DELIVERY_RECEIPT_UNVERIFIED）：已登记的收据文档与它自己记录的摘要对不上，服务端没有读出它，本页也不会替它解释或补全。这不是请求写错，是这批字节不再被证明。";
  }
  return `收据未确认：${code}。服务端拒绝时没有写入任何结论。`;
}
async function runDeliveryReceipt(projectId, bundleId, versionId, host) {
  host.replaceChildren(el(
    "p",
    { class: "view-loading" },
    `正在读回 ${versionId} 的交付收据…`
  ));
  try {
    const data = await api(
      `/projects/${projectId}/bundles/${bundleId}/versions/${versionId}/receipt`
    );
    host.replaceChildren(deliveryReceiptPanel(data));
  } catch (error) {
    host.replaceChildren(el("p", { class: "error" }, receiptRefusal(error)));
  }
}
function evidenceDeliveryColumn(projectId, bundles) {
  const picker = el("select", { class: "input", id: "evidence-delivery-target" });
  const versions = /* @__PURE__ */ new Map();
  for (const bundle of bundles.bundles) versions.set(bundle.id, bundle.version_id);
  if (bundles.bundles.length) {
    for (const bundle of bundles.bundles) {
      picker.append(new Option(`v${bundle.version_no} · ${bundle.id}`, bundle.id));
    }
  } else {
    const [head, note] = emptyWording(
      bundles,
      "暂无交付包可读回",
      "交付发布后在此列出，预检与收据按包读回。"
    );
    picker.append(new Option(`${head} · ${note}`, ""));
  }
  const profilePicker = el(
    "select",
    { class: "input", id: "evidence-delivery-profile" },
    ...PREFLIGHT_PROFILES.map((name) => new Option(name, name))
  );
  const preflightOut = el(
    "div",
    {
      class: "bundle-preflight-outcome",
      id: "evidence-preflight-outcome"
    },
    el(
      "p",
      { class: "view-hint" },
      "尚未预检：预检只读取归档自带字节与随包清单，不修改交付包，也不代替 rights / 质量验收。"
    )
  );
  const receiptOut = el(
    "div",
    {
      class: "delivery-receipt-outcome",
      id: "evidence-receipt-outcome"
    },
    el(
      "p",
      { class: "view-hint" },
      "尚未读回交付收据：收据是交付时写下的文档，选中交付包后在此读回它说了什么、没说什么。"
    )
  );
  const preflightRun = el("button", {
    type: "button",
    class: "primary-btn",
    id: "evidence-preflight-run"
  }, "预检所选交付包");
  const receiptRun = el("button", {
    type: "button",
    class: "ghost-btn",
    id: "evidence-receipt-run"
  }, "读回交付收据");
  preflightRun.disabled = bundles.bundles.length === 0;
  receiptRun.disabled = bundles.bundles.length === 0;
  preflightRun.onclick = () => {
    const bundleId = picker.value;
    if (!bundleId) {
      preflightOut.replaceChildren(el(
        "p",
        { class: "error" },
        "未预检：没有可选的交付登记，预检不能对一个凭记忆写出的 id 给出结论。"
      ));
      return;
    }
    void runArtifactPreflight(projectId, bundleId, profilePicker.value, preflightOut);
  };
  receiptRun.onclick = () => {
    const bundleId = picker.value;
    const versionId = versions.get(bundleId) ?? "";
    if (!bundleId || !versionId) {
      receiptOut.replaceChildren(el(
        "p",
        { class: "error" },
        "未读回收据：交付读回没有同时给出该包的 id 与版本 id，收据不能指向一个凭记忆写出的版本。"
      ));
      return;
    }
    void runDeliveryReceipt(projectId, bundleId, versionId, receiptOut);
  };
  return el(
    "div",
    { class: "panel" },
    el("h3", {}, "交付登记的读回 · 产物预检与交付收据"),
    el(
      "div",
      { class: "toolbar" },
      el("label", { class: "muted" }, "交付包", picker),
      el("label", { class: "muted" }, "profile", profilePicker),
      preflightRun,
      receiptRun
    ),
    el(
      "p",
      { class: "view-hint" },
      "两项都先选交付包：结论属于那一个版本。预检运行检查，收据读回交付时已登记的文档；两者都不修改交付包。"
    ),
    preflightOut,
    receiptOut
  );
}
async function renderDeliverables(target) {
  await projectPickerPanel(target, "交付中心", async (id) => {
    const [tasks2, bundles] = await Promise.all([
      apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks),
      apiOrEmpty(`/projects/${id}/bundles`, OFFLINE.bundles)
    ]);
    const bundleRows = bundles.bundles.length ? bundles.bundles.map((b) => el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, `交付包 · v${b.version_no}`),
        el("small", {}, `${b.id} · ${b.byte_size} 字节 · ${b.rights}`)
      ),
      el(
        "div",
        { class: "actions" },
        el("button", {
          type: "button",
          class: "ghost-btn",
          onclick: () => {
            window.location.hash = "#/projects/" + encodeURIComponent(id);
          }
        }, "在项目页下载"),
        el(
          "span",
          { class: b.rights === "NOT_REVIEWED" ? "tag warn" : "tag info" },
          b.rights === "NOT_REVIEWED" ? "权利未审查" : b.rights
        )
      )
    )) : [emptyLi(bundles, "尚无交付包", "任务完成并打包后，交付会在此读回。")];
    const bundleList = el(
      "ul",
      { class: "list" },
      ...bundleRows.filter((x) => x !== null)
    );
    const bundlePicker = el("select", { class: "input", id: "bundle-preflight-target" });
    if (bundles.bundles.length) {
      for (const b of bundles.bundles) {
        bundlePicker.append(new Option(`v${b.version_no} · ${b.id}`, b.id));
      }
    } else {
      const [head, note] = emptyWording(
        bundles,
        "暂无交付包可预检",
        "任务完成并打包后，交付会在此读回并可预检。"
      );
      bundlePicker.append(new Option(`${head} · ${note}`, ""));
    }
    const profilePicker = el(
      "select",
      { class: "input", id: "bundle-preflight-profile" },
      ...PREFLIGHT_PROFILES.map((name) => new Option(name, name))
    );
    const preflightOut = el(
      "div",
      {
        class: "bundle-preflight-outcome",
        id: "bundle-preflight-outcome"
      },
      el(
        "p",
        { class: "view-hint" },
        "尚未预检：预检只读取归档自带字节与随包清单，不修改交付包，也不代替 rights / 质量验收。"
      )
    );
    const preflightRun = el("button", {
      type: "button",
      class: "primary-btn",
      id: "bundle-preflight-run"
    }, "预检所选交付包");
    preflightRun.disabled = bundles.bundles.length === 0;
    preflightRun.onclick = () => {
      const bundleId = bundlePicker.value;
      if (!bundleId) {
        preflightOut.replaceChildren(el(
          "p",
          { class: "error" },
          "未预检：没有可选的交付登记，预检不能对一个凭记忆写出的 id 给出结论。"
        ));
        return;
      }
      void runArtifactPreflight(id, bundleId, profilePicker.value, preflightOut);
    };
    const bundlePanel = el(
      "div",
      { class: "panel" },
      el("h3", {}, `交付包（${bundles.bundles.length}）`),
      bundleList,
      el("p", { class: "view-hint" }, "交付包来自原生宿主导出；下载与 hash 核对在项目页执行（fail-closed）。"),
      el(
        "div",
        { class: "toolbar" },
        el("label", { class: "muted" }, "交付包", bundlePicker),
        el("label", { class: "muted" }, "profile", profilePicker),
        preflightRun
      ),
      preflightOut
    );
    const tasksRows = tasks2.tasks.length ? tasks2.tasks.map((t) => el(
      "tr",
      {},
      el("td", {}, t.kind),
      el("td", {}, t.state),
      el(
        "td",
        {},
        t.attempt.state,
        // RECEIPTED alone cannot tell an uncontested completion from one the operator
        // asked to stop and the host delivered anyway; the flags are what separate them.
        t.cancel.requested && !t.cancel.acknowledged ? el("span", { class: "tag warn" }, "取消未确认") : ""
      )
    )) : [el("tr", {}, emptyTd(tasks2, "尚无任务", "任务完成后交付包随读回导出。", 3))];
    const tasksPanel = el(
      "div",
      { class: "panel" },
      el("h3", {}, `交付候选任务（${tasks2.tasks.length}）`),
      el(
        "div",
        {
          class: "table-wrap",
          tabindex: "0",
          role: "region",
          "aria-label": "交付候选任务表（可横向滚动）"
        },
        el(
          "table",
          { class: "table" },
          el("thead", {}, el("tr", {}, el("th", {}, "类型"), el("th", {}, "状态"), el("th", {}, "尝试"))),
          el("tbody", {}, ...tasksRows.filter((x) => x !== null))
        )
      )
    );
    const manifestKpis = el(
      "div",
      { class: "kpi-grid" },
      kpiCard(String(tasks2.tasks.length), "交付候选", "读回任务台账 · 非已打包"),
      kpiCard(String(bundles.bundles.length), "交付包", "读回 /bundles · 可下载核对 hash"),
      kpiCard("—", "人工验收", "字体 / 链接 / rights / 质量")
    );
    for (const v of manifestKpis.querySelectorAll("strong[data-count]")) {
      const t = v.textContent;
      if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const kindGrid = el(
      "div",
      { class: "three-col" },
      ...DELIVERABLE_FORMATS.map((f) => el(
        "div",
        { class: "panel" },
        el("h3", {}, f.format),
        f.producedBy ? el("span", { class: "tag ok" }, `可产出 · ${f.producedBy}`) : el("span", { class: "tag warn" }, "当前不产出 · 未接入")
      ))
    );
    return el(
      "div",
      {},
      manifestKpis,
      kindGrid,
      el("p", { class: "view-hint" }, "交付包按任务在下载时打包（字体 / 链接 / rights / 质量仍需人工验收）。本页只读回，不下载也不打包。"),
      bundlePanel,
      tasksPanel,
      ...shapeNoticeRows(bundles, tasks2)
    );
  });
}
async function renderEvidence(target) {
  await projectPickerPanel(target, "证据系统", async (id) => {
    const [layerResp, bundlesResp, juryResp, rightsResp] = await Promise.all([
      apiOrEmpty(`/projects/${id}/design-layer`, OFFLINE.designLayer),
      apiOrEmpty(`/projects/${id}/bundles`, OFFLINE.bundles),
      apiOrEmpty(`/projects/${id}/jury`, JURY_UNREADABLE),
      apiOrEmpty(`/projects/${id}/rights`, RIGHTS_UNREADABLE)
    ]);
    const juryUnread = shapeNotice(juryResp) || disconnectedNotice(juryResp);
    const rightsUnread = shapeNotice(rightsResp) || disconnectedNotice(rightsResp);
    const layer = layerResp.design_layer;
    const chosen = layer.chosen_direction ? `${layer.chosen_direction.title} · v${layer.chosen_direction.version}` : "（尚未选定方向）";
    const active = layer.active_binding ? `${layer.active_binding.design_system_name} · 绑定 ${layer.active_binding.direction_id}` : "（无活动绑定）";
    const bindingChain = el(
      "div",
      { class: "panel" },
      el("h3", {}, "证据绑定链"),
      el(
        "ul",
        { class: "list" },
        el(
          "li",
          { class: "list-item" },
          el("div", {}, el("strong", {}, "项目"), el("small", {}, id)),
          el("span", { class: "tag ok" }, "已读回")
        ),
        el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, `Brief（${layer.briefs.length} 版本）`),
            el("small", {}, layer.briefs.length ? layer.briefs.map((b) => `v${b.version}`).join(" → ") : "（无）")
          ),
          el(
            "span",
            { class: layer.briefs.length ? "tag ok" : "tag info" },
            layer.briefs.length ? "已读回" : "空"
          )
        ),
        el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, "选定方向"),
            el("small", {}, chosen)
          ),
          el(
            "span",
            { class: layer.chosen_direction ? "tag ok" : "tag warn" },
            layer.chosen_direction ? "已选定" : "未选定"
          )
        ),
        el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, `交付包（${bundlesResp.bundles.length}）`),
            el("small", {}, bundlesResp.bundles.length ? bundlesResp.bundles.map((b) => `v${b.version_no}`).join(" → ") : "（无）")
          ),
          el(
            "span",
            { class: bundlesResp.bundles.length ? "tag ok" : "tag info" },
            bundlesResp.bundles.length ? "已读回" : "空"
          )
        )
      ),
      el("p", { class: "view-hint" }, "绑定链只读回；方向选定与交付打包在项目页和工作台高级区执行。")
    );
    const kpis = el(
      "div",
      { class: "kpi-grid" },
      kpiCard(String(layer.briefs.length), "briefs", "设计简报版本"),
      kpiCard(String(layer.directions.length), "directions", "设计方向版本"),
      kpiCard(String(layer.design_systems.length), "设计系统", "登记系统"),
      kpiCard(String(bundlesResp.bundles.length), "交付包", "/bundles 读回"),
      kpiCard(
        juryUnread || typeof juryResp.verdict_count !== "number" ? "—" : String(juryResp.verdict_count),
        "人工裁决",
        juryUnread ? "裁决未读回" : "GET /jury 读回 · 仅人工签署"
      )
    );
    for (const v of kpis.querySelectorAll("strong[data-count]")) {
      const t = v.textContent;
      if (t !== null && /^\d+$/.test(t)) v.dataset.count = t;
    }
    const systems = el(
      "div",
      { class: "panel" },
      el("h3", {}, "设计系统登记"),
      el(
        "ul",
        { class: "list" },
        ...layer.design_systems.map((s) => el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, `${s.name} · ${s.title}`),
            el("small", {}, `v${s.version} · 证据 ${s.evidence_level}`)
          ),
          el("span", { class: "tag info" }, s.version)
        ))
      )
    );
    const done = el(
      "div",
      {},
      kpis,
      bindingChain,
      evidenceJuryColumn(juryResp),
      evidenceRightsColumn(rightsResp, rightsUnread),
      evidenceDeliveryColumn(id, bundlesResp),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, "方向契约"),
        el(
          "div",
          {
            class: "table-wrap",
            tabindex: "0",
            role: "region",
            "aria-label": "设计层版本计数表"
          },
          el(
            "table",
            { class: "table" },
            el(
              "tbody",
              {},
              el("tr", {}, el("th", { scope: "row" }, "briefs"), el("td", {}, String(layer.briefs.length))),
              el("tr", {}, el("th", { scope: "row" }, "directions"), el("td", {}, String(layer.directions.length))),
              el("tr", {}, el("th", { scope: "row" }, "选定方向"), el("td", {}, chosen)),
              el("tr", {}, el("th", { scope: "row" }, "活动绑定"), el("td", {}, active))
            )
          )
        )
      ),
      systems,
      el("p", { class: "view-hint" }, "版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。交付登记的两项读回（预检 / 收据）需要选中交付包后点击执行；证据链完整性由上方卡片对当前检出读回（GET /api/evidence-projection），但 E0–E5 的逐条证据记录仍无服务路由。"),
      ...shapeNoticeRows(layerResp, bundlesResp, juryResp, rightsResp)
    );
    return done;
  }, evidenceProjectionPanelBox());
}
const PROJECT_STAGES = [
  { key: "brief", label: "Brief", panelId: "#pd-brief-editor", state: "IMPLEMENTED" },
  { key: "references", label: "References", panelId: "#pd-reference-panel", state: "IMPLEMENTED" },
  {
    key: "research",
    label: "Research",
    panelId: "",
    state: "PLANNED",
    note: "研究洞察无后端路由（见能力登记表 research-insights）"
  },
  { key: "directions", label: "Directions", panelId: "#pd-direction-panel", state: "IMPLEMENTED" },
  { key: "design-system", label: "Design System", panelId: "#pd-design-system-panel", state: "IMPLEMENTED" },
  { key: "production", label: "Production", panelId: "#pd-tasks-panel", state: "IMPLEMENTED" },
  // No #pd-versions-panel is ever rendered: version readback lives in the brief
  // / direction panels and the Inspector ring. A PLANNED node keeps the stage
  // honest, because an IMPLEMENTED chip whose anchor does not exist is a button
  // that silently does nothing (buildStageNav only reveals `note` as a
  // pointer-only title, so assistive tech and keyboard users never saw it).
  {
    key: "versions",
    label: "Versions",
    panelId: "",
    state: "PLANNED",
    note: "版本读回在简报 / 方向面板与 Inspector 版本环，无独立 Versions 面板"
  },
  // The only preflight with a route is /api/task-preflight — the repo's
  // task-resource doctor. Design quality, Jury and production preflight have no
  // route, so the stage name carries the boundary in visible text.
  {
    key: "review",
    label: "资源预检 + 人工评审",
    panelId: "#/preflight",
    state: "IMPLEMENTED",
    note: "任务包资源预检与 Human Jury 裁决均可读回；设计质量趋势与生产产物预检尚无入口"
  },
  {
    key: "handoff",
    label: "Handoff",
    panelId: "",
    state: "PLANNED",
    note: "交接清单模型未建（能力登记表）"
  },
  // #pd-deliveries is a bundle manifest (id/kind/size/sha256/rights). E0-E5
  // evidence records have no HTTP route, so this stage is not the Evidence gate.
  {
    key: "evidence",
    label: "Evidence",
    panelId: "#pd-deliveries",
    state: "PLANNED",
    note: "交付包清单与证据链完整性投影均可读回；E0–E5 逐条证据记录仍无路由"
  }
];
function buildStageNav(currentStageKey) {
  const nav = el("ol", { class: "stage-nav", "aria-label": "项目阶段导航" });
  for (const stage of PROJECT_STAGES) {
    const li = el("li", { class: "stage-nav-item", dataset: { stage: stage.key, state: stage.state } });
    const isCurrent = stage.key === currentStageKey;
    if (isCurrent) li.setAttribute("aria-current", "step");
    const btnAttrs = {
      type: "button",
      class: "stage-nav-btn" + (stage.state === "IMPLEMENTED" ? "" : " is-planned") + (isCurrent ? " is-current" : ""),
      onclick: () => {
        if (stage.panelId.startsWith("#/")) {
          window.location.hash = stage.panelId.slice(1);
        } else if (stage.panelId) {
          const target = document.querySelector(stage.panelId);
          if (target) {
            const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
            if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        }
      },
      title: stage.note ?? (stage.state === "IMPLEMENTED" ? "点击跳转到该阶段" : stage.note ?? "")
    };
    const tag = stage.state !== "IMPLEMENTED" ? el("span", { class: "tag " + (stage.state === "BLOCKED" ? "warn" : "neutral") }, en(stage.state)) : null;
    li.append(el(
      "button",
      btnAttrs,
      el("span", { class: "stage-nav-label" }, stage.label),
      ...tag ? [tag] : []
    ));
    nav.append(li);
  }
  return nav;
}
function buildInspectorPanel(id, layer) {
  const versionData = layer.directions.map((d) => ({
    version: d.version,
    chosen: d.chosen,
    superseded_by: d.superseded_by
  }));
  const ring = buildVersionRing(versionData);
  const chosen = layer.chosen_direction;
  const binding = layer.active_binding;
  const sysItems = layer.design_systems.length ? [el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, "设计系统"),
      el("small", {}, layer.design_systems.map((s) => s.name).join(", "))
    )
  )] : [];
  const body = el(
    "div",
    { class: "inspector-body" },
    ...ring ? [ring] : [],
    el("p", { class: "view-hint" }, `${layer.directions.length} 个方向版本` + (chosen ? ` · 选定：${chosen.title} v${chosen.version}` : " · 尚未选定方向")),
    el(
      "ul",
      { class: "list" },
      el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, "活动绑定"),
          el("small", {}, binding ? `${binding.design_system_name} → ${binding.direction_id}` : "（无活动绑定）")
        )
      ),
      ...sysItems.filter((x) => x !== null)
    )
  );
  return el(
    "aside",
    { class: "inspector", id: "pd-inspector", "aria-label": "项目 Inspector" },
    el(
      "div",
      { class: "inspector-head" },
      el("h3", {}, "Inspector"),
      el("button", {
        type: "button",
        class: "ghost-btn inspector-toggle",
        "aria-expanded": "true",
        onclick: (e) => {
          const btn = e.currentTarget;
          const collapsed = btn.getAttribute("aria-expanded") === "false";
          btn.setAttribute("aria-expanded", String(!collapsed));
          btn.parentElement?.parentElement?.classList.toggle("is-collapsed", collapsed);
        }
      }, "收起")
    ),
    body
  );
}
function fieldRow(labelText, input, id) {
  const label = el("label", { class: "field-label", for: id }, labelText);
  return el("div", { class: "field-row" }, label, input);
}
function briefFieldRow(prefix) {
  const title = el("input", { id: `${prefix}-title`, class: "input", maxlength: "160", placeholder: "例如：秋季品牌视觉" });
  const goals = el("input", { id: `${prefix}-goals`, class: "input", maxlength: "400", placeholder: "现代, 温暖, 克制" });
  const constraints = el("input", { id: `${prefix}-constraints`, class: "input", maxlength: "400", placeholder: "例如：不改变 logo 拓扑" });
  const row = el(
    "div",
    { class: "row-card", style: "display:grid;gap:8px" },
    fieldRow("简报标题（必填）", title, `${prefix}-title`),
    fieldRow("目标（逗号分隔，必填）", goals, `${prefix}-goals`),
    fieldRow("约束（可选）", constraints, `${prefix}-constraints`)
  );
  return { row, title, goals, constraints };
}
const TITLE_MAX = 18;
function expandableTitle(text, suffix = "") {
  const shown = `${text}${suffix}`;
  const wrap = el("span", { class: "title-cell" });
  if (shown.length <= TITLE_MAX) {
    wrap.append(el("strong", { class: "title-text" }, shown));
    return wrap;
  }
  const node = el("strong", { class: "title-text", title: shown }, `${shown.slice(0, TITLE_MAX)}…`);
  const btn = el("button", {
    type: "button",
    class: "ghost-btn title-expand",
    "aria-expanded": "false",
    onclick: () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      node.textContent = expanded ? `${shown.slice(0, TITLE_MAX)}…` : shown;
      btn.textContent = expanded ? "全称" : "收起";
    }
  }, "全称");
  wrap.append(node, btn);
  return wrap;
}
function renderBriefEditor(id, layer, target) {
  const status = el("p", { class: "view-hint", id: "pd-brief-status", role: "status" }, "本页可真实创建并保存简报；保存成功后从服务端重新读回。");
  const stateChip = el("span", { class: "tag info", id: "pd-brief-state" }, "未修改");
  const setState = (kind) => {
    const chip = document.getElementById("pd-brief-state") || stateChip;
    const label = {
      idle: "未修改",
      dirty: "未保存（dirty）",
      saving: "保存中（saving）",
      saved: "已保存（saved）",
      conflict: "冲突（conflict·可恢复）",
      failed: "失败"
    };
    chip.className = kind === "saved" ? "tag ok" : kind === "conflict" ? "tag warn" : kind === "failed" ? "tag bad" : "tag info";
    chip.textContent = label[kind];
  };
  const draftKey = (form) => `design-lab.brief-draft:${id}:${form}`;
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1e3;
  const DRAFT_MAX_CHARS = 2e3;
  const readDraft = (form) => {
    try {
      const raw = globalThis.localStorage?.getItem(draftKey(form));
      if (!raw || raw.length > DRAFT_MAX_CHARS) return null;
      const o = JSON.parse(raw);
      if (typeof o?.title !== "string" && typeof o?.goals !== "string") return null;
      if (typeof o.savedAt !== "number" || Date.now() - o.savedAt > DRAFT_TTL_MS) return null;
      return { title: String(o.title ?? ""), goals: String(o.goals ?? ""), constraints: String(o.constraints ?? "") };
    } catch {
      return null;
    }
  };
  const writeDraft = (form, v) => {
    try {
      const payload = JSON.stringify({ ...v, savedAt: Date.now() });
      if (payload.length > DRAFT_MAX_CHARS) return;
      globalThis.localStorage?.setItem(draftKey(form), payload);
    } catch {
    }
  };
  const clearDraft = (form) => {
    try {
      globalThis.localStorage?.removeItem(draftKey(form));
    } catch {
    }
  };
  const refresh2 = async () => {
    const live = document.getElementById("route-view");
    await renderProjectDetail(id, live || target);
  };
  const liveStatus = () => document.getElementById("pd-brief-status") || status;
  const clearInvalid = (...fields) => {
    for (const f of fields) f.removeAttribute("aria-invalid");
  };
  const fail = (error, focus) => {
    const node = liveStatus();
    node.className = "error";
    node.textContent = revisionHint(error);
    setState(errMsg(error) === "STALE_REVISION" ? "conflict" : "failed");
    if (focus) {
      focus.setAttribute("aria-invalid", "true");
      focus.focus();
    }
  };
  const ok = (message) => {
    const node = liveStatus();
    node.className = "view-hint";
    node.textContent = message;
  };
  const versions = /* @__PURE__ */ new Map();
  for (const row of layer.briefs) versions.set(row.brief_id, row.version);
  const create = briefFieldRow("pd-brief");
  const createBtn = el("button", { type: "button", class: "primary-btn", id: "pd-brief-create" }, "新建简报");
  let submittedCreate = { identity: "", key: "" };
  const createValues = () => ({ title: create.title.value, goals: create.goals.value, constraints: create.constraints.value });
  for (const f of [create.title, create.goals, create.constraints]) {
    f.addEventListener("input", () => {
      setState("dirty");
      writeDraft("create", createValues());
    });
  }
  createBtn.addEventListener("click", () => {
    void (async () => {
      setState("saving");
      status.className = "view-hint";
      status.textContent = "正在提交…";
      const title = create.title.value.trim();
      let goals;
      try {
        goals = splitList(create.goals.value, 300, "目标");
      } catch (error) {
        fail(error, create.goals);
        return;
      }
      clearInvalid(create.title, create.goals);
      if (!title) {
        fail(new Error("简报需要标题与至少一条目标"), create.title);
        return;
      }
      if (!goals.length) {
        fail(new Error("简报需要标题与至少一条目标"), create.goals);
        return;
      }
      const constraints = create.constraints.value.trim() || null;
      const identity = JSON.stringify({ id, title, goals, constraints });
      if (submittedCreate.identity !== identity) submittedCreate = { identity, key: uuid() };
      createBtn.disabled = true;
      try {
        await api(`/projects/${id}/briefs`, {
          title,
          goals,
          constraints,
          reference_asset_ids: [],
          idempotency_key: submittedCreate.key
        });
        clearDraft("create");
        await refresh2();
        ok(`简报已保存并读回：「${title}」。`);
        setState("saved");
      } catch (error) {
        fail(error);
      } finally {
        createBtn.disabled = false;
      }
    })();
  });
  const rev = briefFieldRow("pd-rev");
  const revHint = el(
    "p",
    { class: "view-hint", id: "pd-rev-target" },
    "在某一简报行点「新版本」以载入该版本内容；保存会新增版本，旧版本只保留为历史。"
  );
  const revBtn = el("button", { type: "button", class: "primary-btn", id: "pd-brief-revise" }, "保存新版本");
  let revTarget = null;
  const lineageBox = el("ul", { class: "list", id: "pd-brief-lineage" });
  const loadLineage = async (briefId) => {
    const data = await apiOrEmpty(`/projects/${id}/briefs/${briefId}/lineage`, {
      lineage: { brief_id: briefId, root_id: briefId, requested_id: briefId, live_id: null, versions: [] }
    });
    const rows = data.lineage.versions;
    const liveId = data.lineage.live_id;
    const notice = shapeNotice(data);
    lineageBox.replaceChildren(
      ...notice ? [el("li", { class: "error" }, notice)] : [],
      el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `版本链（${rows.length}）`),
          el("small", {}, `当前 ${liveId ? `版本 ${versions.get(liveId) ?? "?"}` : "—"}`)
        )
      ),
      ...rows.map((row) => el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `版本 ${row.version} · ${row.title}`),
          el("small", {}, `${row.goals.join(" / ")}${row.constraints ? ` · ${row.constraints}` : ""} · 参考 ${row.reference_asset_ids.length} · ${row.created_at}`)
        ),
        el("span", { class: row.brief_id === liveId ? "tag ok" : "tag warn" }, versionState(row.superseded_by, versions))
      ))
    );
  };
  const startRevision = (brief) => {
    void (async () => {
      revTarget = brief;
      rev.title.value = brief.title;
      rev.goals.value = brief.goals.join(", ");
      rev.constraints.value = brief.constraints ?? "";
      revHint.textContent = `正在修订「${brief.title}」版本 ${brief.version}；保存会新增一个版本，版本 ${brief.version} 只保留为历史。` + (brief.superseded_by === null ? "" : " 注意：该版本已被取代，服务端会以 STALE_REVISION 拒绝这次修订。");
      rev.title.focus();
      await loadLineage(brief.brief_id);
    })();
  };
  const revValues = () => ({ title: rev.title.value, goals: rev.goals.value, constraints: rev.constraints.value });
  for (const f of [rev.title, rev.goals, rev.constraints]) {
    f.addEventListener("input", () => {
      setState("dirty");
      writeDraft("rev", revValues());
    });
  }
  revBtn.addEventListener("click", () => {
    void (async () => {
      const source = revTarget;
      if (!source) {
        fail(new Error("请先在某一简报行点击「新版本」以载入要修订的内容"));
        return;
      }
      setState("saving");
      status.className = "view-hint";
      status.textContent = "正在提交修订…";
      const title = rev.title.value.trim();
      let goals;
      try {
        goals = splitList(rev.goals.value, 300, "目标");
      } catch (error) {
        fail(error, rev.goals);
        return;
      }
      clearInvalid(rev.title, rev.goals);
      if (!title) {
        fail(new Error("修订需要标题与至少一条目标"), rev.title);
        return;
      }
      if (!goals.length) {
        fail(new Error("修订需要标题与至少一条目标"), rev.goals);
        return;
      }
      const constraints = rev.constraints.value.trim() || null;
      revBtn.disabled = true;
      try {
        const data = await api(`/projects/${id}/briefs/${source.brief_id}/revisions`, {
          title,
          goals,
          constraints,
          // carry the source version's references: the route shell has no reference
          // picker yet (that is W04), and silently dropping them would lose data.
          reference_asset_ids: source.reference_asset_ids,
          idempotency_key: uuid()
        });
        clearDraft("rev");
        await refresh2();
        ok(`简报已保存为版本 ${data.brief.version}；版本 ${source.version} 只保留为历史，旧内容未被改写。`);
        setState("saved");
      } catch (error) {
        fail(error);
      } finally {
        revBtn.disabled = false;
      }
    })();
  });
  const briefRows = layer.briefs.length ? layer.briefs.map((brief) => el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      expandableTitle(brief.title, ` · v${brief.version}`),
      el("small", {}, `${brief.goals.join(" / ")}${brief.constraints ? ` · ${brief.constraints}` : ""} · 参考 ${brief.reference_asset_ids.length} · ${brief.created_at}`)
    ),
    el(
      "div",
      { class: "actions" },
      el("span", { class: brief.superseded_by === null ? "tag ok" : "tag warn" }, versionState(brief.superseded_by, versions)),
      el("button", { type: "button", class: "ghost-btn", onclick: () => startRevision(brief) }, "新版本")
    )
  )) : [emptyLi(layer, "尚无简报", "用下方表单创建该项目的第一份简报（真实写入，保存后读回）")];
  const restored = [];
  const createDraft = readDraft("create");
  if (createDraft) {
    create.title.value = createDraft.title;
    create.goals.value = createDraft.goals;
    create.constraints.value = createDraft.constraints;
    restored.push("新建简报");
  }
  const revDraft = readDraft("rev");
  if (revDraft) {
    rev.title.value = revDraft.title;
    rev.goals.value = revDraft.goals;
    rev.constraints.value = revDraft.constraints;
    restored.push("修订");
  }
  if (restored.length) setState("dirty");
  const draftNote = el("p", { class: "view-hint", id: "pd-brief-draft" }, restored.length ? `已恢复上次未保存的草稿：${restored.join("、")}。草稿仅保存在本机；保存成功或丢弃后即清除。` : "");
  const discardBtn = el("button", {
    type: "button",
    class: "ghost-btn",
    id: "pd-brief-discard",
    onclick: () => {
      clearDraft("create");
      clearDraft("rev");
      setState("idle");
      draftNote.textContent = "草稿已丢弃；表单内容未改动服务端任何状态。";
    }
  }, "丢弃草稿");
  const panel = el("div", { class: "panel", id: "pd-brief-editor" });
  panel.append(
    el("h3", {}, `简报（Brief）· ${layer.briefs.length} 个版本`),
    el("ul", { class: "list" }, ...briefRows),
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:10px" },
      el("strong", {}, "新建简报"),
      create.row,
      el("div", { class: "actions" }, createBtn)
    ),
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:10px" },
      el("strong", {}, "修订 / 新增版本"),
      revHint,
      rev.row,
      el("div", { class: "actions" }, revBtn)
    ),
    lineageBox,
    el("div", { class: "actions", id: "pd-brief-statebar" }, stateChip, discardBtn),
    draftNote,
    status
  );
  return panel;
}
function renderReferencePanel(id) {
  const heading = el("h3", { id: "pd-ref-heading" }, "参考素材");
  const list = el(
    "ul",
    { class: "list", id: "pd-ref-list" },
    el("li", { class: "list-item" }, el("div", {}, el("strong", {}, "正在读回…")))
  );
  const preview2 = el("img", { id: "pd-ref-preview", class: "ref-preview", alt: "参考素材预览" });
  preview2.hidden = true;
  const info2 = el(
    "p",
    { class: "view-hint", id: "pd-ref-info" },
    "点某一行的「预览」按需读取该资产；清单本身不预加载整图。"
  );
  const status = el("p", { class: "view-hint", id: "pd-ref-status", role: "status" }, "");
  const showError = (message) => {
    status.className = "error";
    status.textContent = message;
  };
  const showHint = (message) => {
    status.className = "view-hint";
    status.textContent = message;
  };
  const previewAsset = async (assetId) => {
    showHint(`正在读取 ${assetId} …`);
    try {
      const data = await api(`/projects/${id}/assets/${assetId}/content`);
      const a = data.asset;
      if (!["image/png", "image/jpeg"].includes(a.media_type)) throw new Error(`UNSUPPORTED_PREVIEW:${a.media_type}`);
      preview2.src = `data:${a.media_type};base64,${data.content_base64}`;
      preview2.hidden = false;
      info2.textContent = `${a.width} × ${a.height} · ${a.media_type} · rights: ${a.rights} · sha256 ${a.sha256.slice(0, 16)}…`;
      showHint(`已按需读回 ${assetId}。`);
    } catch (error) {
      preview2.hidden = true;
      preview2.removeAttribute("src");
      info2.textContent = "—";
      showError(`资产 ${assetId} 读取失败：${errMsg(error)}`);
    }
  };
  const assetRow = (a) => {
    const rights = a.rights === "NOT_REVIEWED" ? el("span", { class: "tag warn" }, "权利未审查") : el("span", { class: "tag info" }, a.rights);
    const headline = [
      a.width !== void 0 && a.height !== void 0 ? `${a.width} × ${a.height}` : null,
      a.media_type,
      a.kind
    ].filter(Boolean).join(" · ");
    const provenance = [
      a.id,
      a.version_no !== void 0 ? `版本 ${a.version_no}` : null,
      a.version_id ? `version_id ${a.version_id.slice(0, 12)}…` : null,
      a.sha256 ? `sha256 ${String(a.sha256).replace(/^sha256:/, "").slice(0, 16)}…` : null
    ].filter(Boolean).join(" · ");
    return el(
      "li",
      { class: "list-item" },
      el("div", {}, el("strong", {}, headline), el("small", {}, provenance)),
      el(
        "div",
        { class: "actions" },
        rights,
        el("button", { type: "button", class: "ghost-btn", id: `pd-ref-preview-${a.id}`, onclick: () => {
          void previewAsset(a.id);
        } }, "预览")
      )
    );
  };
  const loadAssets = async () => {
    try {
      const data = await api(`/projects/${id}/assets`);
      const assets = data.assets;
      heading.textContent = `参考素材（${assets.length}）`;
      list.replaceChildren(
        ...assets.length ? assets.map(assetRow) : [el(
          "li",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, "尚无参考素材"),
            el("small", {}, "用下方批量导入，或在旧工作台导入；未知权利可研究，但会阻止生产认证。")
          )
        )]
      );
      showHint(assets.some((a) => a.rights === "NOT_REVIEWED") ? "清单已读回。存在「权利未审查」的素材：可继续研究，但在权利清除前不能作为生产认证依据（服务端 fail-closed）。" : "清单已读回；图片内容按需读取。");
      return true;
    } catch (error) {
      heading.textContent = "参考素材";
      list.replaceChildren(el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, "未读回"),
          el("small", {}, "资产清单读取失败；此处不显示 0，避免把「没读到」说成「没有」。")
        )
      ));
      showError(`资产清单读取失败：${errMsg(error)}`);
      return false;
    }
  };
  void loadAssets();
  const fileInput = el("input", {
    type: "file",
    id: "pd-ref-files",
    class: "input",
    multiple: "multiple",
    accept: "image/png,image/jpeg"
  });
  const importBtn = el("button", { type: "button", class: "primary-btn", id: "pd-ref-import" }, "开始导入");
  const cancelBtn = el("button", { type: "button", class: "ghost-btn", id: "pd-ref-cancel" }, "取消");
  cancelBtn.disabled = true;
  const results = el("ul", { class: "list", id: "pd-ref-import-results" });
  const summary = el("p", { class: "view-hint", id: "pd-ref-import-summary" }, "尚未导入。");
  const selection = el("p", { class: "view-hint", id: "pd-ref-selection" }, "未选择文件。");
  let batchRunning = false;
  let cancelRequested = false;
  const renderResults = (rows, pending) => {
    results.replaceChildren(...rows.map((r) => el(
      "li",
      { class: "list-item" },
      el("div", {}, el("strong", {}, r.name), el("small", {}, r.detail)),
      el(
        "span",
        { class: r.status === "ok" ? "tag ok" : r.status === "cancelled" ? "tag warn" : "tag bad" },
        r.status === "ok" ? "已导入" : r.status === "cancelled" ? "已取消" : "失败"
      )
    )));
    const ok = rows.filter((r) => r.status === "ok").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    summary.className = "view-hint";
    summary.textContent = `导入 ${rows.length} 个：成功 ${ok} · 失败 ${failed} · 已取消 ${cancelled}` + (failed ? "（失败项未写入服务端）" : "") + (pending ? ` · ${pending}` : "");
  };
  fileInput.addEventListener("change", () => {
    const n = fileInput.files ? fileInput.files.length : 0;
    selection.textContent = n ? `已选择 ${n} 个文件。` : "未选择文件。";
  });
  cancelBtn.addEventListener("click", () => {
    if (!batchRunning) return;
    cancelRequested = true;
    cancelBtn.disabled = true;
    selection.textContent = "已请求取消：正在上传的这个文件会完成，其余不再开始。";
  });
  importBtn.addEventListener("click", () => {
    void (async () => {
      if (batchRunning) return;
      const files = Array.from(fileInput.files ?? []);
      if (!files.length) {
        showError("请先选择要导入的图片（PNG / JPEG）。");
        return;
      }
      batchRunning = true;
      cancelRequested = false;
      importBtn.disabled = true;
      cancelBtn.disabled = false;
      const rows = [];
      for (const file of files) {
        if (cancelRequested) {
          rows.push({ name: file.name, status: "cancelled", detail: "取消后未开始" });
          continue;
        }
        if (!["image/png", "image/jpeg"].includes(file.type)) {
          rows.push({ name: file.name, status: "failed", detail: `不支持的媒体类型 ${file.type || "(空)"}：仅 PNG / JPEG` });
          renderResults(rows);
          continue;
        }
        if (file.size > 32 * 1024 * 1024) {
          rows.push({ name: file.name, status: "failed", detail: `超过 32 MiB（${Math.round(file.size / 1048576)} MiB）` });
          renderResults(rows);
          continue;
        }
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          await api(`/projects/${id}/assets`, { content_base64: btoa(binary), idempotency_key: uuid() });
          rows.push({ name: file.name, status: "ok", detail: `${Math.round(file.size / 1024)} KiB · 服务端已确认` });
        } catch (error) {
          rows.push({ name: file.name, status: "failed", detail: errMsg(error) });
        }
        renderResults(rows);
      }
      batchRunning = false;
      importBtn.disabled = false;
      cancelBtn.disabled = true;
      renderResults(rows, "正在从服务端重新读回清单…");
      const listRead = await loadAssets();
      renderResults(rows);
      const ok = rows.filter((r) => r.status === "ok").length;
      const cancelled = rows.filter((r) => r.status === "cancelled").length;
      if (cancelRequested) {
        showHint(`已取消：成功 ${ok}，已取消 ${cancelled}（取消后未开始的文件未写入服务端；正在上传的那个已按其真实结果记入）。`);
      } else if (ok === rows.length) {
        showHint(listRead ? `全部 ${ok} 个文件已导入并从服务端读回。` : `全部 ${ok} 个文件已导入；导入后的清单未读回，请稍后刷新。`);
      } else {
        showHint(`导入结束：成功 ${ok} / ${rows.length}；失败项未写入，` + (listRead ? "清单已从服务端重新读回。" : "清单未读回，请稍后刷新。"));
      }
    })();
  });
  return el(
    "div",
    { class: "panel", id: "pd-reference-panel" },
    heading,
    list,
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:8px" },
      el("strong", {}, "预览（按需读取）"),
      preview2,
      info2
    ),
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:8px" },
      el("strong", {}, "批量导入（PNG / JPEG，单个 ≤ 32 MiB）"),
      fieldRow("选择要导入的图片", fileInput, "pd-ref-files"),
      selection,
      el("div", { class: "actions" }, importBtn, cancelBtn),
      results,
      summary
    ),
    status
  );
}
function renderDirectionPanel(id, layer, target) {
  const status = el("p", { class: "view-hint", id: "pd-dir-status", role: "status" }, "");
  const showError = (m) => {
    status.className = "error";
    status.textContent = m;
  };
  const showHint = (m) => {
    status.className = "view-hint";
    status.textContent = m;
  };
  const refresh2 = async () => {
    const live = document.getElementById("route-view");
    await renderProjectDetail(id, live || target);
  };
  const briefById = new Map(layer.briefs.map((b) => [b.brief_id, b]));
  const liveBriefs = layer.briefs.filter((b) => b.superseded_by === null);
  const chosen = layer.chosen_direction;
  const binding = layer.active_binding;
  const consistency = !chosen ? binding ? "不一致：存在活动绑定但没有选定方向" : "尚未选定方向" : binding ? binding.direction_id === chosen.direction_id ? `一致：选定方向与活动绑定同为一个（${chosen.title}）` : `不一致：选定方向「${chosen.title}」≠ 活动绑定所属方向 ${binding.direction_id}` : "方向已选定，但尚未绑定设计系统（属正常中间态，不宣称已一致到交付）";
  const directionRow = (d) => {
    const bound = briefById.get(d.brief_id);
    const stale = bound ? bound.superseded_by !== null : true;
    const mood = [d.color_mood ? `色感 ${d.color_mood}` : null, d.typography_mood ? `字感 ${d.typography_mood}` : null].filter(Boolean).join(" · ") || "（未填色感/字感）";
    const notes = d.style_notes && d.style_notes.length ? d.style_notes.join(" / ") : null;
    return el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        expandableTitle(d.title, ` · v${d.version}`),
        el("small", {}, `${mood}${notes ? ` · ${notes}` : ""} · ${d.direction_id}`),
        el("small", {}, d.actor ? `选定人：${d.actor}（${d.actor_kind ?? "未标注类型"}）` : "尚未有人选定"),
        ...stale ? [el("small", { class: "error" }, bound ? `绑定的简报版本 v${bound.version} 已被取代 → 该方向需重新审查（不自动失效，也不自动沿用）` : "绑定的简报已不在当前项目中 → 需重新审查")] : []
      ),
      el(
        "div",
        { class: "actions" },
        d.chosen ? el("span", { class: "tag ok" }, "已选定") : el("span", { class: "tag info" }, "候选"),
        ...d.chosen ? [] : [el("button", {
          type: "button",
          class: "ghost-btn",
          id: `pd-dir-choose-${d.direction_id}`,
          onclick: () => {
            void (async () => {
              showHint(`正在以人工身份选定「${d.title}」…`);
              try {
                await api(`/projects/${id}/directions/${d.direction_id}/choose`, {
                  actor: "workbench-user",
                  actor_kind: "human",
                  idempotency_key: uuid()
                });
                await refresh2();
              } catch (error) {
                showError(`方向选择未确认：${errMsg(error)}`);
              }
            })();
          }
        }, "选定（人工）")]
      )
    );
  };
  const briefSelect = el(
    "select",
    { id: "pd-dir-brief", class: "input" },
    ...liveBriefs.length ? liveBriefs.map((b) => el("option", { value: b.brief_id }, `${b.title} · v${b.version} · ${b.brief_id.slice(-8)}`)) : [el("option", { value: "" }, "（没有可用简报版本）")]
  );
  const title = el("input", { id: "pd-dir-title", class: "input", maxlength: "160", placeholder: "方向标题（必填）" });
  const colorMood = el("input", { id: "pd-dir-color", class: "input", maxlength: "120", placeholder: "色感（可选）" });
  const typeMood = el("input", { id: "pd-dir-type", class: "input", maxlength: "120", placeholder: "字感（可选）" });
  const createBtn = el("button", { type: "button", class: "primary-btn", id: "pd-dir-create" }, "新建方向候选");
  createBtn.addEventListener("click", () => {
    void (async () => {
      const briefId = briefSelect.value;
      const t = title.value.trim();
      if (!briefId) {
        showError("请先创建一份简报，再立方向。");
        return;
      }
      if (!t) {
        showError("方向需要标题。");
        title.setAttribute("aria-invalid", "true");
        title.focus();
        return;
      }
      title.removeAttribute("aria-invalid");
      createBtn.disabled = true;
      showHint("正在提交方向候选…");
      try {
        await api(`/projects/${id}/directions`, {
          brief_id: briefId,
          title: t,
          style_notes: null,
          color_mood: colorMood.value.trim() || null,
          typography_mood: typeMood.value.trim() || null,
          idempotency_key: uuid()
        });
        await refresh2();
        const node = document.getElementById("pd-dir-status");
        if (node) {
          node.className = "view-hint";
          node.textContent = `方向候选「${t}」已保存并读回；候选不会自动成为选定方向，必须由人选定。`;
        }
      } catch (error) {
        showError(`方向未确认：${errMsg(error)}`);
      } finally {
        createBtn.disabled = false;
      }
    })();
  });
  return el(
    "div",
    { class: "panel", id: "pd-direction-panel" },
    el("h3", {}, `方向（Direction）· ${layer.directions.length} 个候选`),
    el("p", { class: "view-hint", id: "pd-dir-consistency" }, `版本链 / 选定 / 绑定一致性：${consistency}`),
    el(
      "ul",
      { class: "list" },
      ...layer.directions.length ? [...layer.directions].map(directionRow) : [emptyLi(layer, "尚无方向候选", "先建立简报，再用下方表单立候选；选定必须由人执行。")]
    ),
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:8px" },
      el("strong", {}, "新建方向候选（绑定到某个简报版本）"),
      fieldRow("所属简报版本", briefSelect, "pd-dir-brief"),
      fieldRow("方向标题（必填）", title, "pd-dir-title"),
      fieldRow("色感（可选）", colorMood, "pd-dir-color"),
      fieldRow("字感（可选）", typeMood, "pd-dir-type"),
      el("div", { class: "actions" }, createBtn)
    ),
    status
  );
}
function renderDesignSystemPanel(id, layer, systems, target) {
  const status = el("p", { class: "view-hint", id: "pd-ds-status", role: "status" }, "");
  const showError = (m) => {
    status.className = "error";
    status.textContent = m;
  };
  const showHint = (m) => {
    status.className = "view-hint";
    status.textContent = m;
  };
  const refresh2 = async () => {
    const live = document.getElementById("route-view");
    await renderProjectDetail(id, live || target);
  };
  const chosen = layer.chosen_direction;
  const active = layer.active_binding;
  const select = el(
    "select",
    { id: "pd-ds-name", class: "input" },
    ...systems.design_systems.length ? systems.design_systems.map((s) => el("option", { value: s.name }, `${s.title} · v${s.version} · 证据 ${s.evidence_level}`)) : [el("option", { value: "" }, "（目录为空或未读回）")]
  );
  const bindBtn = el("button", { type: "button", class: "primary-btn", id: "pd-ds-bind" }, "绑定到已选定方向");
  bindBtn.disabled = !chosen || !systems.design_systems.length;
  const gate = el("p", { class: "view-hint", id: "pd-ds-gate" }, !chosen ? "绑定不可用：尚无人选定方向。请先在「方向」面板人工选定一个候选（AI 候选不会自动成为选定方向）。" : !systems.design_systems.length ? "绑定不可用：设计系统目录为空或未读回。" : `将绑定到已选定方向「${chosen.title}」（v${chosen.version}）。`);
  bindBtn.addEventListener("click", () => {
    void (async () => {
      const name = select.value;
      if (!chosen) {
        showError("请先人工选定一个方向，再绑定设计系统。");
        return;
      }
      if (!name) {
        showError("请选择要绑定的设计系统。");
        return;
      }
      bindBtn.disabled = true;
      showHint(`正在绑定 ${name} …`);
      try {
        await api(`/projects/${id}/directions/${chosen.direction_id}/bind`, {
          design_system_name: name,
          idempotency_key: uuid()
        });
        await refresh2();
        const node = document.getElementById("pd-ds-status");
        if (node) {
          node.className = "view-hint";
          node.textContent = `设计系统已绑定：${name}。设计契约已固定；制作与质量验收仍未执行。`;
        }
      } catch (error) {
        showError(`绑定未确认：${errMsg(error)}`);
        bindBtn.disabled = false;
      }
    })();
  });
  const consistent = !!(active && chosen && active.direction_id === chosen.direction_id);
  return el(
    "div",
    { class: "panel", id: "pd-design-system-panel" },
    el("h3", {}, `设计系统（DesignSystem）· 目录 ${systems.design_systems.length} 项 · 绑定 ${layer.bindings.length} 次`),
    el(
      "ul",
      { class: "list" },
      el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, "活动绑定"),
          el("small", {}, active ? `${active.design_system_name} · 绑定于方向 ${active.direction_id} · v${active.version}` : "（无活动绑定）")
        ),
        el("span", { class: active ? "tag ok" : "tag info" }, active ? "已绑定" : "未绑定")
      ),
      ...active && chosen ? [el(
        "li",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, "绑定与选定方向的一致性"),
          el("small", {}, consistent ? "一致：活动绑定所属方向就是人工选定的方向。" : `不一致：活动绑定属于 ${active.direction_id}，而人工选定的是 ${chosen.direction_id}。`)
        ),
        el("span", { class: consistent ? "tag ok" : "tag bad" }, consistent ? "一致" : "不一致")
      )] : []
    ),
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:8px" },
      el("strong", {}, "绑定设计系统（需先有人选定方向）"),
      gate,
      fieldRow("要绑定的设计系统", select, "pd-ds-name"),
      el("div", { class: "actions" }, bindBtn)
    ),
    el(
      "p",
      { class: "view-hint" },
      "Token 文档的写入与版本链在下方「设计系统 Token」面板执行（真实写入，读回持久化行）；版本 diff、发布与回滚尚无路由，本页不做假 diff。"
    ),
    status
  );
}
const TOKEN_SAMPLE_DOCUMENT = '{"color":{"$type":"color","brand":{"$value":"#2563EB"},"surface":{"$value":"{color.brand}"}},"scale":{"$type":"dimension","space":{"md":{"$value":"16px"}}}}';
function serviceErrorDetail(error) {
  const envelope = error?.serviceEnvelope;
  const detail = envelope?.detail;
  return Array.isArray(detail) ? detail.filter((line) => typeof line === "string") : [];
}
function tokenBaseline(documents, name) {
  return documents.find((row) => row.design_system_name === name) ?? null;
}
function renderTokenDocumentPanel(id, tokens, systems, target) {
  const documents = tokens.token_documents;
  const status = el("p", { class: "view-hint", id: "pd-token-status", role: "status" }, "");
  const showError = (message) => {
    status.className = "error";
    status.textContent = message;
  };
  const showHint = (message) => {
    status.className = "view-hint";
    status.textContent = message;
  };
  const refresh2 = async () => {
    const live = document.getElementById("route-view");
    await renderProjectDetail(id, live || target);
  };
  const select = el(
    "select",
    { id: "pd-token-name", class: "input" },
    ...systems.design_systems.length ? systems.design_systems.map((system) => el("option", {
      value: system.name
    }, `${system.title} · ${system.name} · 证据 ${system.evidence_level}`)) : [el("option", { value: "" }, "（目录为空或未读回）")]
  );
  const editor = el("textarea", {
    id: "pd-token-document",
    class: "input",
    rows: "10",
    spellcheck: "false",
    "aria-label": "DTCG Token 文档 JSON"
  });
  const gate = el("p", { class: "view-hint", id: "pd-token-gate" }, "");
  const fill = () => {
    const live = tokenBaseline(documents, select.value);
    editor.value = live ? JSON.stringify(live.document, null, 2) : TOKEN_SAMPLE_DOCUMENT;
    gate.textContent = !systems.design_systems.length ? "写入不可用：设计系统目录为空或未读回，服务端会以 UNKNOWN_DESIGN_SYSTEM 拒绝。" : live ? `将追加到 ${live.design_system_name} 的 v${live.version}（${live.token_count} 个 token）。本次提交基于 expected_version=${live.version}，服务端写入 v${live.version + 1}。` : `${select.value || "（未选择）"} 尚无 Token 文档；本次提交创建 v1。`;
  };
  fill();
  select.addEventListener("change", () => {
    fill();
  });
  const writeBtn = el("button", {
    type: "button",
    class: "primary-btn",
    id: "pd-token-write"
  }, documents.length ? "追加 Token 版本（真实写入）" : "提交 Token 文档（真实写入）");
  writeBtn.disabled = !systems.design_systems.length;
  writeBtn.addEventListener("click", () => {
    void (async () => {
      const name = select.value;
      if (!name) {
        showError("请先选择一个已登记的设计系统，再提交 Token 文档。");
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(editor.value);
      } catch (error) {
        showError(`Token 文档不是合法 JSON：${errMsg(error)}。本次未提交，服务端未写入任何内容。`);
        return;
      }
      const base = tokenBaseline(documents, name);
      const expectedVersion = base ? base.version : 0;
      writeBtn.disabled = true;
      showHint(`正在提交 ${name} 的 Token 文档（基于 v${expectedVersion}）…`);
      try {
        const result = await api(
          `/projects/${id}/design-system-tokens/${name}`,
          {
            document: parsed,
            expected_version: expectedVersion,
            actor: "workbench-user",
            actor_kind: "human",
            idempotency_key: uuid()
          }
        );
        await refresh2();
        const node = document.getElementById("pd-token-status");
        if (node) {
          node.className = "view-hint";
          node.textContent = `已写入并读回 v${result.token_document.version}（${result.token_document.token_count} 个 token · DTCG ${result.token_document.dtcg_schema_version}）。持久化与版本追加已验证；宿主 Token 工具、权利与质量验收仍未执行。`;
        }
      } catch (error) {
        const detail = serviceErrorDetail(error);
        const stale = errMsg(error) === "STALE_REVISION";
        showError(`Token 文档未被接受：${errMsg(error)}` + (detail.length ? `；字段：${detail.slice(0, 3).join(" | ")}` : "") + (stale ? `；${revisionHint(error)}` : "") + "；服务端未写入任何内容。");
        writeBtn.disabled = false;
      }
    })();
  });
  const rows = documents.length ? documents.map((doc) => el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, `${doc.design_system_name} · v${doc.version}`),
      el("small", {}, `${doc.token_count} 个 token · DTCG ${doc.dtcg_schema_version} · ${doc.spec_sha256.slice(0, 17)}…`),
      el("small", {}, `写回：${doc.actor || "未标注"} · ${doc.created_at}`)
    ),
    el(
      "span",
      { class: doc.actor_kind === "human" ? "tag ok" : "tag info" },
      doc.actor_kind ? en(doc.actor_kind) : "未标注身份"
    )
  )) : [emptyLi(
    tokens,
    "尚无 Token 文档",
    "用下方表单提交一份 DTCG Token 文档；写入后在此读回持久化行。"
  )];
  return el(
    "div",
    { class: "panel", id: "pd-token-panel" },
    el("h3", {}, `设计系统 Token（DTCG）· 当前文档 ${documents.length}`),
    el("ul", { class: "list" }, ...rows),
    el(
      "div",
      { class: "row-card", style: "display:grid;gap:8px" },
      el("strong", {}, documents.length ? "修订 Token 文档（追加新版本）" : "提交 Token 文档（创建 v1）"),
      gate,
      fieldRow("设计系统", select, "pd-token-name"),
      fieldRow("Token 文档 JSON", editor, "pd-token-document"),
      el("div", { class: "actions" }, writeBtn)
    ),
    status,
    el(
      "p",
      { class: "view-hint" },
      "写入前服务端跑 DTCG 结构（interop-dtcg-document.schema.json）与语义校验（$type 继承、别名解析与成环、composite 成员完整性），并按项目 + 设计系统追加版本；已写入的版本不可改写，发布与回滚尚无路由。"
    )
  );
}
function renderDeliveryPanel(id, data) {
  const bundles = data.bundles;
  const heading = el("h3", { id: "pd-deliveries-heading" }, `交付包（${bundles.length}）`);
  const status = el("p", { class: "view-hint", id: "pd-deliveries-status", role: "status" }, "");
  const list = el(
    "ul",
    { class: "list", id: "pd-deliveries-list" },
    ...bundles.length ? [] : [el(
      "li",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, token ? "尚无交付包" : "未连接"),
        el("small", {}, token ? "任务完成并打包后，交付会在此读回。" : "连接本机设计服务后读回该项目的交付清单。")
      )
    )]
  );
  const download = async (bundle) => {
    const access = token;
    const route = `/projects/${id}/bundles/${bundle.id}/versions/${bundle.version_id}/content`;
    status.textContent = `正在核对 ${bundle.id} 的交付包…`;
    const response = await fetch("/api" + route, { headers: { Authorization: "Bearer " + access }, cache: "no-store" });
    if (!response.ok) {
      status.textContent = `交付包读取失败：HTTP ${response.status}。`;
      return;
    }
    const bytes = await response.arrayBuffer();
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0")
    ).join("");
    if (digest !== bundle.sha256.replace(/^sha256:/, "") || bytes.byteLength !== bundle.byte_size) {
      status.textContent = "交付包与记录 hash 不一致，未采纳（fail-closed）。";
      return;
    }
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `design-lab-${bundle.id.slice(-12)}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
    status.textContent = `交付包已下载并核对 hash；字体、链接、rights 与质量仍需验收。`;
  };
  const row = (b) => el(
    "li",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, `交付包 · v${b.version_no}`),
      el("small", {}, `${b.id} · ${b.byte_size} 字节 · sha256 ${String(b.sha256).replace(/^sha256:/, "").slice(0, 16)}…`)
    ),
    el(
      "div",
      { class: "actions" },
      el("button", {
        type: "button",
        class: "ghost-btn",
        onclick: () => {
          void download(b).catch((e) => {
            status.textContent = `交付包读取失败：${errMsg(e)}`;
          });
        }
      }, "下载交付包"),
      el(
        "span",
        { class: b.rights === "NOT_REVIEWED" ? "tag warn" : "tag info" },
        b.rights === "NOT_REVIEWED" ? "权利未审查" : b.rights
      )
    )
  );
  list.append(...bundles.map(row));
  status.textContent = bundles.length ? "交付清单已读回。hash 在点击「下载交付包」时核对；权利与质量仍需独立验收。" : token ? "该项目当前没有已交付的设计包。" : "未连接：交付清单未读回，不代表该项目没有交付包。";
  return el(
    "div",
    { class: "panel", id: "pd-deliveries" },
    heading,
    list,
    status,
    el(
      "p",
      { class: "view-hint" },
      "交付包内容：宿主导出的可编辑源 + 预览 + 输入清单（manifest）。BOM 尚未生成（PLANNED，无写入口）；读取与 hash 为只读回读，权利 / 质量 / 预检仍由人工验收。"
    )
  );
}
async function renderProjectDetail(id, target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回该项目…"));
  rememberProject(id);
  const listing = await apiOrEmpty("/projects", OFFLINE.projects);
  const named = listing.projects.find((p) => p.id === id);
  const [tasks2, layerResp, systemsResp, bundlesResp, tokensResp] = await Promise.all([
    apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks),
    apiOrEmpty(`/projects/${id}/design-layer`, OFFLINE.designLayer),
    apiOrEmpty("/design-systems", OFFLINE.designSystems),
    apiOrEmpty(`/projects/${id}/bundles`, OFFLINE.bundles),
    apiOrEmpty(
      `/projects/${id}/design-system-tokens`,
      OFFLINE.tokenDocuments
    )
  ]);
  const layer = layerResp.design_layer;
  const chosen = layer.chosen_direction ? `${layer.chosen_direction.title} · v${layer.chosen_direction.version}` : "（尚未选定方向）";
  const active = layer.active_binding ? `${layer.active_binding.design_system_name} · 绑定 ${layer.active_binding.direction_id}` : "（无活动绑定）";
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, named ? named.name : id),
      el("p", {}, `项目详情 · ${id}。tasks 与 design-layer 为只读回读；下方简报区是真实写入，保存后从服务端读回。`)
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", {
        type: "button",
        class: "ghost-btn",
        onclick: () => {
          window.location.hash = "#/projects";
        }
      }, "返回项目列表")
    )
  );
  const kpis = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(tasks2.tasks.length), "任务", "读回 /tasks 台账"),
    kpiCard(String(layer.briefs.length), "简报版本", "读回 design-layer"),
    kpiCard(String(layer.directions.length), "方向版本", "读回 design-layer"),
    kpiCard(layer.active_binding ? "1" : "0", "活动绑定", active)
  );
  const taskPanel = el(
    "div",
    { class: "panel", id: "pd-tasks-panel" },
    el("h3", {}, `任务台账（${tasks2.tasks.length}）`),
    el(
      "ul",
      { class: "list" },
      ...tasks2.tasks.length ? tasks2.tasks.slice(0, 8).map((t) => el(
        "li",
        { class: "list-item" },
        el("div", {}, el("strong", {}, t.kind), el("small", {}, `尝试 ${t.attempt.attempt_no} · ${t.attempt.state}`)),
        el("span", { class: "tag info" }, t.state)
      )) : [emptyLi(tasks2, "尚无任务", "任务由工作台高级区提交")]
    )
  );
  const layerPanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, "设计层契约"),
    el(
      "ul",
      { class: "list" },
      valueRow("选定方向", chosen, false),
      // `active` always embeds a 32-hex direction_id, so it is a long value by
      // construction and must never go into the nowrap .tag pill (F-2).
      valueRow("活动绑定", active, true),
      valueRow("设计系统登记", String(layer.design_systems.length), false)
    )
  );
  const stageNav = buildStageNav();
  const inspector = buildInspectorPanel(id, layer);
  target.replaceChildren(
    pageHead,
    kpis,
    stageNav,
    el(
      "div",
      { class: "project-detail-layout" },
      el(
        "div",
        { class: "project-detail-main" },
        el("div", { class: "two-col", style: "margin-top:16px" }, taskPanel, layerPanel),
        el("div", { style: "margin-top:16px" }, renderDeliveryPanel(id, bundlesResp)),
        el("div", { style: "margin-top:16px" }, renderBriefEditor(id, layer, target)),
        el("div", { style: "margin-top:16px" }, renderDirectionPanel(id, layer, target)),
        el("div", { style: "margin-top:16px" }, renderDesignSystemPanel(id, layer, systemsResp, target)),
        el("div", { style: "margin-top:16px" }, renderTokenDocumentPanel(id, tokensResp, systemsResp, target)),
        el("div", { style: "margin-top:16px" }, renderReferencePanel(id))
      ),
      inspector
    ),
    el("p", { class: "view-hint" }, "tasks 与 design-layer 台账为只读；简报区可真实创建与修订并读回，Token 区可真实提交 DTCG 文档并按版本追加读回；参考素材区读回资产清单并按需预览。提交任务 / 运行 / 取消 / 导出仍由工作台高级区执行。"),
    ...shapeNoticeRows(bundlesResp, layerResp, listing, systemsResp, tasks2, tokensResp)
  );
}
async function renderRoute(view, target) {
  target.replaceChildren();
  switch (view) {
    case "dashboard":
      await renderDashboard(target);
      return;
    case "brand-systems":
      await renderBrandSystems(target);
      return;
    case "preflight-qa":
      await renderPreflight(target);
      return;
    case "research":
      await renderResearchView(target);
      return;
    case "settings":
      await renderSettings(target);
      return;
    case "projects":
      await renderProjects(target);
      return;
    case "creative-tools":
      await renderCreativeTools(target);
      return;
    case "deliverables":
      await renderDeliverables(target);
      return;
    case "evidence":
      await renderEvidence(target);
      return;
    case "design-domains":
      await renderDomains(target);
      return;
    // B07 `/projects/:id`. The id comes from the hash (renderRoute receives only
    // the resolved view, matching the existing signature).
    case "project-detail": {
      const id = projectDetailId(window.location.hash);
      if (!id) {
        await renderProjects(target);
        return;
      }
      await renderProjectDetail(id, target);
      return;
    }
    default: {
      const notOpen = VIEW_NOT_OPEN[view];
      const slotFor = (v) => v === "collaboration" ? "collaboration" : null;
      const wanted = slotFor(view);
      const cards = el(
        "div",
        { class: "card-flow" },
        ...CAPABILITY_REGISTRY.filter((c) => c.capabilityId === wanted).map(capabilityCard)
      );
      const hasCards = CAPABILITY_REGISTRY.some((c) => c.capabilityId === wanted);
      target.replaceChildren(
        el("h2", {}, notOpen ? viewLabel(view) : "工作台"),
        el("p", { class: "view-unopened" }, notOpen ?? "默认工作台。"),
        ...hasCards ? [cards] : []
      );
      return;
    }
  }
}
function mountAppShell() {
  const login = byId("login");
  const workspace = byId("workspace");
  const nav = el(
    "nav",
    { class: "app-nav", "aria-label": "DESIGN-LAB 导航" },
    el("span", { class: "app-nav-brand" }, "DESIGN-LAB"),
    ...ROUTE_VIEWS.map((route) => el("button", {
      type: "button",
      class: "app-nav-item",
      dataset: { route: route.view },
      onclick: () => {
        window.location.hash = route.hash === "" ? "" : route.hash;
      }
    }, route.label)),
    el("span", { class: "app-nav-meta", id: "shell-connection" }, "未连接")
  );
  const syncLegacyNavCue = () => {
    const mobile = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 760px)").matches;
    const hasMore = mobile && nav.scrollWidth > nav.clientWidth && nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1;
    nav.classList.toggle("has-scroll-more", hasMore);
  };
  nav.addEventListener("scroll", syncLegacyNavCue, { passive: true });
  window.addEventListener("resize", syncLegacyNavCue);
  const routeView = el("div", { class: "route-view", id: "route-view", tabindex: "-1" });
  document.body.append(nav);
  document.body.classList.add("dl-shell");
  const b10 = mountB10Shell(routeView, syncLegacyNavCue);
  if (!b10) document.body.append(routeView);
  const active = (view) => {
    for (const item of Array.from(nav.querySelectorAll(".app-nav-item"))) {
      const selected = item.dataset.route === view;
      item.classList.toggle("active", selected);
      if (selected) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    }
  };
  const current = () => {
    if (projectDetailId(window.location.hash)) return "project-detail";
    const match = ROUTE_VIEWS.find((route) => route.hash === window.location.hash);
    if (!match && devMode()) return "dashboard";
    return match ? match.view : "workbench";
  };
  let routeGeneration = 0;
  const show = () => {
    const view = current();
    const showWorkbench = view === "workbench";
    const generation = ++routeGeneration;
    const routeToken = token;
    b10?.sync(view);
    login.hidden = showWorkbench ? connected : true;
    if (showWorkbench) {
      workspace.hidden = !connected;
      active("workbench");
      return;
    }
    login.hidden = true;
    workspace.hidden = true;
    active(view);
    const target = byId("route-view");
    if (!token && !devMode()) {
      target.replaceChildren(
        el("h2", {}, viewLabel(view)),
        el("p", { class: "view-unopened" }, "请先在工作台连接本机设计服务，再读回此视图。"),
        el("button", {
          type: "button",
          class: "primary-btn",
          onclick: () => {
            window.location.hash = "";
          }
        }, "前往工作台连接")
      );
      target.removeAttribute("aria-busy");
      return;
    }
    target.replaceChildren(el("p", { class: "view-loading" }, "正在读回当前视图…"));
    target.setAttribute("aria-busy", "true");
    const pendingView = document.createElement("div");
    void renderRoute(view, pendingView).then(() => {
      if (generation !== routeGeneration || current() !== view || token !== routeToken) return;
      target.replaceChildren(...Array.from(pendingView.childNodes));
      target.removeAttribute("aria-busy");
      announceRoute(viewLabel(view));
      if (document.activeElement === document.body) target.focus({ preventScroll: true });
    }).catch((error) => {
      if (generation !== routeGeneration || current() !== view || token !== routeToken) return;
      target.replaceChildren(el("p", { class: "error" }, `视图读回失败：${errMsg(error)}`));
      target.removeAttribute("aria-busy");
      announceRoute(`${viewLabel(view)} 读回失败`);
      if (document.activeElement === document.body) target.focus({ preventScroll: true });
    });
  };
  const routeAnnouncer = el("p", { class: "sr-status", role: "status" });
  document.body.append(routeAnnouncer);
  const announceRoute = (label) => {
    routeAnnouncer.textContent = `${label} 已载入`;
  };
  const connection = byId("connection");
  const syncMeta = () => {
    byId("shell-connection").textContent = connection.textContent || "未连接";
  };
  if (typeof MutationObserver !== "undefined")
    new MutationObserver(syncMeta).observe(connection, { childList: true, characterData: true });
  mountB10Overlays();
  window.addEventListener("hashchange", show);
  show();
}
function mountB10Shell(routeView, syncLegacyNavCue) {
  const probe = document.createElement("div");
  if (typeof probe.querySelector !== "function") return null;
  const B10_NAV = [
    { route: "dashboard", label: "仪表盘", hash: "#/dashboard" },
    { route: "projects", label: "项目", hash: "#/projects" },
    { route: "research", label: "研究洞察", hash: "#/research" },
    { route: "brand-systems", label: "品牌系统", hash: "#/brand-systems" },
    { route: "design-domains", label: "设计领域", hash: "#/domains" },
    { route: "creative-tools", label: "创作工具", hash: "#/tools" },
    { route: "preflight-qa", label: "预检 / QA", hash: "#/preflight" },
    { route: "deliverables", label: "交付中心", hash: "#/deliverables" },
    { route: "evidence", label: "证据系统", hash: "#/evidence" },
    { route: "collaboration", label: "团队协作", hash: "#/collaboration" },
    { route: "settings", label: "系统设置", hash: "#/settings" }
  ];
  const sidebar = el(
    "aside",
    { class: "sidebar", id: "app-sidebar" },
    el(
      "div",
      { class: "brand" },
      el("div", { class: "brand-mark", "aria-hidden": "true" }),
      el(
        "div",
        {},
        el("h1", {}, "DESIGN-LAB"),
        el("small", {}, "设计智能与生产能力层")
      )
    ),
    // A <nav> element, not a div[aria-label]: role=generic does not support an
    // accessible name, so the label was silently dropped and no navigation
    // landmark existed on routed views (the legacy <nav> is hidden there).
    el(
      "nav",
      { class: "nav", "aria-label": "DESIGN-LAB 导航" },
      ...B10_NAV.map((n) => el(
        "button",
        {
          type: "button",
          dataset: { route: n.route },
          "data-hash": n.hash,
          onclick: () => {
            window.location.hash = n.hash;
          }
        },
        el("span", { class: "nav-dot" }),
        el("span", {}, n.label)
      ))
    ),
    // No identity route exists (/api/health returns status/version/scope only),
    // so the footer cannot name a logged-in workspace owner. 'Alex / Personal
    // Workspace' was leftover B10 mock-up content presented as fact.
    el(
      "div",
      { class: "sidebar-footer" },
      el("div", { class: "avatar", "aria-hidden": "true" }, "D/L"),
      el(
        "div",
        {},
        el("strong", {}, "本地单用户"),
        el("small", { id: "personal-connection" }, "本机服务未连接")
      )
    )
  );
  const modKey = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl";
  const navToggle = el("button", {
    type: "button",
    class: "nav-toggle ghost-btn",
    id: "navToggle",
    "aria-expanded": "false",
    "aria-controls": "app-sidebar"
  }, "导航");
  const setNavOpen = (open) => {
    sidebar.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    const mobile = window.matchMedia("(max-width: 840px)").matches;
    sidebar.toggleAttribute("inert", mobile && !open);
    if (open) sidebar.querySelector(".nav button")?.focus();
    else if (mobile && sidebar.contains(document.activeElement)) navToggle.focus();
  };
  navToggle.onclick = () => setNavOpen(!sidebar.classList.contains("open"));
  sidebar.addEventListener("click", (event) => {
    if (event.target.closest("button")) setNavOpen(false);
  });
  const topbar = el(
    "header",
    { class: "topbar" },
    navToggle,
    el(
      "div",
      { class: "search", id: "openPalette", role: "button", tabindex: "0" },
      `${modKey} K　搜索页面 / 命令 / 资源`
    ),
    el(
      "div",
      { class: "top-actions" },
      el("button", { type: "button", class: "ghost-btn", id: "topNotice" }, "通知"),
      el("button", { type: "button", class: "ghost-btn", id: "openDrawer" }, "工作区")
    )
  );
  const offlineNotice = el(
    "p",
    { class: "muted", id: "b10-offline" },
    "本地浏览模式：未连接本机设计服务（无访问令牌）。页面结构为 B10 1:1 真实渲染，但所有读回值为空占位，不是真实台账。连接服务后本提示消失。"
  );
  const app = el(
    "div",
    { class: "app", id: "b10-app" },
    el("div", { class: "ambient" }),
    el("div", { class: "grid-bg" }),
    sidebar,
    el(
      "main",
      { class: "main" },
      topbar,
      el("section", { class: "content", id: "content" }, offlineNotice, routeView)
    )
  );
  document.body.append(app);
  const legacyNav = document.querySelector(".app-nav");
  const legacyChrome = Array.from(document.querySelectorAll("body > header, body > main, body > footer"));
  const sync = (view) => {
    const routed = view !== "workbench";
    app.hidden = !routed;
    offlineNotice.hidden = Boolean(token) || !devMode();
    if (legacyNav) legacyNav.toggleAttribute("hidden", routed);
    for (const node of legacyChrome) node.toggleAttribute("hidden", routed);
    if (!routed) syncLegacyNavCue();
    byId("personal-connection").textContent = connected ? "本机服务已连接" : "本机服务未连接";
    for (const item of Array.from(sidebar.querySelectorAll(".nav button"))) {
      const highlight = view === "project-detail" ? "projects" : view;
      const selected = item.dataset.route === highlight;
      item.classList.toggle("active", selected);
      if (selected) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    }
  };
  return { app, sync };
}
function mountB10Overlays() {
  const probe = document.createElement("div");
  if (typeof probe.querySelector !== "function") return;
  const toast = el("div", { class: "toast", role: "status", id: "toast" }, "Ready");
  document.body.append(toast);
  const toastTimer = { t: 0 };
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer.t);
    toastTimer.t = window.setTimeout(() => toast.classList.remove("show"), 1900);
  };
  window.__dlToast = showToast;
  const overlay = el("div", { class: "overlay", id: "modal" });
  const modalBox = el(
    "div",
    { class: "modal" },
    el("h3", { id: "modalTitle" }, "确认操作"),
    el("div", { class: "body", id: "modalBody" }, "该操作将写入本地状态。"),
    el(
      "div",
      { class: "actions" },
      el("button", { class: "ghost-btn", type: "button", "data-close-modal": "" }, "取消"),
      el("button", { class: "primary-btn", type: "button", id: "modalConfirm" }, "确认")
    )
  );
  overlay.append(modalBox);
  document.body.append(overlay);
  const cancelBtn = modalBox.querySelector(".actions .ghost-btn");
  const closeModal = () => {
    overlay.classList.remove("open");
  };
  cancelBtn.onclick = closeModal;
  const drawer = el(
    "aside",
    { class: "drawer", id: "drawer", role: "dialog", "aria-modal": "false", "aria-label": "工作区详情" },
    el("h3", { style: "margin:0 0 8px" }, "工作区 / 前端说明"),
    el(
      "p",
      { class: "muted", style: "margin-top:0" },
      "Command Palette（Ctrl/Cmd + K）、Toast、Modal 与 Drawer 由本页真实驱动；台账视图内容来自服务读回，未连接时显示未读回而不是数据。"
    ),
    el(
      "div",
      { class: "status-stack", style: "margin:14px 0 20px" },
      el("span", { class: "tag info" }, "前端浮层"),
      el("span", { class: "tag info" }, "本机界面偏好"),
      el("span", { class: "tag warn" }, "只读不回写")
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "前端能力（不代表数据读回）"),
      el(
        "ul",
        { class: "list" },
        el("li", { class: "list-item" }, el("span", {}, "本页浮层"), el("span", { class: "tag info" }, "已渲染")),
        el("li", { class: "list-item" }, el("span", {}, "动效"), el("span", { class: "tag info" }, "跟随系统偏好")),
        el("li", { class: "list-item" }, el("span", {}, "命令面板"), el("span", { class: "tag info" }, "Ctrl/Cmd + K"))
      )
    ),
    el("button", { class: "primary-btn", type: "button", id: "closeDrawer", style: "margin-top:18px;width:100%" }, "关闭")
  );
  document.body.append(drawer);
  const openDrawer = () => {
    drawer.classList.add("open");
  };
  const closeDrawer = () => {
    drawer.classList.remove("open");
  };
  drawer.querySelector("#closeDrawer").onclick = closeDrawer;
  const palette = el(
    "div",
    { class: "palette", id: "palette", role: "dialog", "aria-label": "命令面板" },
    el("input", { id: "paletteInput", placeholder: "搜索页面名称…", "aria-label": "搜索页面" })
  );
  const itemsBox = el("div", { id: "paletteItems" });
  palette.append(itemsBox);
  document.body.append(palette);
  const paletteInput = palette.querySelector("input");
  const cmds = ROUTE_VIEWS.filter((r) => r.hash !== "").map((r) => ({ go: r.hash, label: r.label }));
  for (const c2 of cmds) {
    itemsBox.append(el("button", {
      type: "button",
      class: "item",
      dataset: { go: c2.go },
      onclick: () => {
        window.location.hash = c2.go;
        closePalette();
      }
    }, el("span", {}, c2.label), el("small", {}, "打开")));
  }
  let paletteInvoker = null;
  const openPalette = () => {
    paletteInvoker = document.activeElement;
    palette.classList.add("open");
    paletteInput.focus();
    paletteInput.select();
  };
  const closePalette = () => {
    palette.classList.remove("open");
    paletteInput.value = "";
    itemsBox.querySelectorAll(".item").forEach((i) => {
      i.style.display = "";
    });
    if (document.activeElement === document.body && paletteInvoker && document.contains(paletteInvoker)) {
      paletteInvoker.focus();
    }
    paletteInvoker = null;
  };
  paletteInput.addEventListener("input", () => {
    const q = paletteInput.value.toLowerCase();
    itemsBox.querySelectorAll(".item").forEach((item) => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? "flex" : "none";
    });
  });
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (palette.classList.contains("open")) closePalette();
      else openPalette();
    }
    if (e.key === "Escape") {
      closePalette();
      closeDrawer();
      closeModal();
    }
  });
  wireB10Topbar(openPalette, showToast, openDrawer);
}
function wireB10Topbar(openPalette, showToast, openDrawer) {
  const search = document.getElementById("openPalette");
  if (search) {
    search.onclick = openPalette;
    search.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPalette();
      }
    };
  }
  const notice = document.getElementById("topNotice");
  if (notice) notice.onclick = () => {
    showToast("暂无新的通知");
  };
  const drawerBtn = document.getElementById("openDrawer");
  if (drawerBtn) drawerBtn.onclick = () => {
    openDrawer();
  };
}
byId("design-brief-form").onsubmit = (event) => {
  event.preventDefault();
  void submitBrief().catch((e) => setStatus(errMsg(e), true));
};
byId("brief-revision-form").onsubmit = (event) => {
  event.preventDefault();
  void submitBriefRevision().catch((e) => setStatus(errMsg(e), true));
};
byId("direction-revision-form").onsubmit = (event) => {
  event.preventDefault();
  void submitDirectionRevision().catch((e) => setStatus(errMsg(e), true));
};
byId("design-direction-form").onsubmit = (event) => {
  event.preventDefault();
  void submitDirection().catch((e) => setStatus(errMsg(e), true));
};
byId("design-system-bind").onclick = () => {
  void bindDesignSystem().catch((e) => setStatus(errMsg(e), true));
};
function devBypassEnabled() {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (typeof document.querySelectorAll === "function" && document.querySelectorAll('script[src*="@vite/client"]').length > 0) return true;
  try {
    const qs = window.location.search;
    if (typeof qs === "string" && qs.includes("dev=1")) return true;
  } catch {
  }
  return false;
}
if (typeof document !== "undefined" && document.body !== void 0 && typeof window !== "undefined" && devBypassEnabled() && document.__dlShellMounted !== true) {
  document.__dlShellMounted = true;
  mountAppShell();
} else if (typeof document !== "undefined" && document.body !== void 0 && typeof window !== "undefined" && document.getElementById("login") !== null && document.__dlShellMounted !== true) {
  document.__dlShellMounted = true;
  mountAppShell();
}
if (typeof document !== "undefined" && document.body !== void 0 && devBypassEnabled()) {
  const loginEl = document.getElementById("login");
  const workspaceEl = document.getElementById("workspace");
  const connEl = document.getElementById("connection");
  if (loginEl) loginEl.hidden = true;
  if (workspaceEl) {
    workspaceEl.hidden = false;
  }
  if (connEl) connEl.textContent = "未连接 · 本地浏览模式";
}
if (typeof window !== "undefined" && document.body?.dataset.localSession === "auto" && !devBypassEnabled()) void connectLocalService();
