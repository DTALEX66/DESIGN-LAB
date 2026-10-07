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
    throw new Error(value.error || "SERVICE_ERROR");
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
  capabilities: {
    schemaVersion: "design-lab/capability-library/v1",
    meaning: "未连接本机设计服务",
    unmeasuredMeans: "null = 未判定，不是 0",
    counts: { total: 0, byKind: {}, byLicense: {}, byRevisionState: {}, qualified: 0 },
    sources: {},
    capabilities: []
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
  "research": "研究洞察页未开放：当前服务没有研究结论的持久化路由。",
  "design-domains": "设计领域页未开放：域包模型已在仓内（schema、DOMAIN_PACK_SPEC_V2 与 13 个域包，并有 verify_domain_pack_v2.py 校验），缺的是 GET /api/domains 读回路由。",
  "collaboration": "团队协作页未开放：本地单机服务尚无协作路由（本地单用户模型）。"
};
const CAPABILITY_REGISTRY = [
  {
    capabilityId: "research-insights",
    domain: "研究洞察",
    source: "IA 槽位 #/research",
    owner: "DESIGN-LAB design core",
    route: "GET /api/research/…",
    contractRef: "apps/workbench/shell.ts ROUTE_VIEWS（12 路由 IA）；无后端模型",
    implementationState: "PLANNED",
    permission: "brief/reference 已持久化（/api/projects/{id}/assets 已有）",
    reason: "服务尚无研究结论持久化路由；研究目前由 brief/reference 驱动。",
    nextAction: "设计 research 结论模型 + 服务路由，然后 UI 读回替换本卡。"
  },
  {
    capabilityId: "design-domain-model",
    domain: "设计领域",
    source: "IA 槽位 #/domains",
    owner: "DESIGN-LAB Domain Pack",
    route: "GET /api/domains/…",
    contractRef: "design-lab/schemas/domain-pack.schema.json · design-lab/domain-packs/DOMAIN_PACK_SPEC_V2.md（13 个域包）",
    implementationState: "PLANNED",
    permission: "域包模型与 13 个域包已落仓（E1 结构级）；缺 HTTP 读回路由",
    reason: '域划分并非"尚无模型"：schema、DOMAIN_PACK_SPEC_V2 与 13 个域包目录都在仓内，并有 verify_domain_pack_v2.py 校验；缺的只是 GET /api/domains 读回。',
    nextAction: "为 Domain Pack 建 /api/domains 读回路由。"
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
    kpiCard(String(BRAND_MODULES.length), "VI 模块", BRAND_MODULES.join(" / ")),
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
  target.replaceChildren(
    pageHead,
    kpiGrid,
    el(
      "div",
      { class: "toolbar" },
      el("label", { class: "muted" }, "任务全 ID", input)
    ),
    result
  );
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
  const notOpen = VIEW_NOT_OPEN["research"];
  const researchCard = CAPABILITY_REGISTRY.find((c) => c.capabilityId === "research-insights");
  target.replaceChildren(
    el(
      "div",
      { class: "page-head" },
      el(
        "div",
        {},
        el("h2", {}, "研究洞察 / 能力库"),
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
      el("p", { class: "view-unopened" }, notOpen),
      researchCard ? capabilityCard(researchCard) : el("p", { class: "view-hint" }, "（登记表无此项）")
    ),
    ...shapeNoticeRows(data)
  );
  render();
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
async function projectPickerPanel(target, title, body) {
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
const DELIVERABLE_KINDS = ["Editable Source", "PDF", "PNG", "SVG", "PSD", "AI", "Video", "3D", "Archive"];
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
    const bundlePanel = el(
      "div",
      { class: "panel" },
      el("h3", {}, `交付包（${bundles.bundles.length}）`),
      bundleList,
      el("p", { class: "view-hint" }, "交付包来自原生宿主导出；下载与 hash 核对在项目页执行（fail-closed）。权利 / 质量 / 预检仍需独立验收。")
    );
    const tasksRows = tasks2.tasks.length ? tasks2.tasks.map((t) => el(
      "tr",
      {},
      el("td", {}, t.kind),
      el("td", {}, t.state),
      el("td", {}, t.attempt.state)
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
      ...DELIVERABLE_KINDS.map((k) => el(
        "div",
        { class: "panel" },
        el("h3", {}, k),
        el("span", { class: "tag info" }, "导出候选")
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
    const [layerResp, bundlesResp] = await Promise.all([
      apiOrEmpty(`/projects/${id}/design-layer`, OFFLINE.designLayer),
      apiOrEmpty(`/projects/${id}/bundles`, OFFLINE.bundles)
    ]);
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
      kpiCard(String(bundlesResp.bundles.length), "交付包", "/bundles 读回")
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
      el("p", { class: "view-hint" }, "版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。"),
      ...shapeNoticeRows(layerResp, bundlesResp)
    );
    return done;
  });
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
    label: "资源预检（非设计评审）",
    panelId: "#/preflight",
    state: "IMPLEMENTED",
    note: "仅任务包资源预检可读回；设计质量 / Jury / 生产预检尚无入口"
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
    note: "交付包清单已可读回；E0–E5 证据记录无服务路由"
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
    el("p", { class: "view-hint" }, "Token 编辑 / 预览 / 版本 diff / 发布 / 回滚在服务端尚无写 API，未实现；此处不做假编辑。"),
    status
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
  const [tasks2, layerResp, systemsResp, bundlesResp] = await Promise.all([
    apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks),
    apiOrEmpty(`/projects/${id}/design-layer`, OFFLINE.designLayer),
    apiOrEmpty("/design-systems", OFFLINE.designSystems),
    apiOrEmpty(`/projects/${id}/bundles`, OFFLINE.bundles)
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
        el("div", { style: "margin-top:16px" }, renderReferencePanel(id))
      ),
      inspector
    ),
    el("p", { class: "view-hint" }, "tasks 与 design-layer 台账为只读；简报区可真实创建与修订并读回；参考素材区读回资产清单并按需预览。提交任务 / 运行 / 取消 / 导出仍由工作台高级区执行。"),
    ...shapeNoticeRows(bundlesResp, layerResp, listing, systemsResp, tasks2)
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
      await renderCapabilityLibrary(target);
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
      const slotFor = (v) => v === "design-domains" ? "design-domain-model" : v === "collaboration" ? "collaboration" : null;
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
    { route: "workbench", label: "工作台", hash: "" },
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
      el("div", { class: "brand-mark" }, "DL"),
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
  setNavOpen(false);
  window.matchMedia("(max-width: 840px)").addEventListener("change", () => setNavOpen(false));
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
  const legacyMain = document.querySelector("body > main");
  const workbenchView = el("section", { class: "personal-workbench", id: "workbench-view" });
  if (legacyMain) {
    workbenchView.append(...Array.from(legacyMain.childNodes));
    app.querySelector("#content")?.append(workbenchView);
  }
  const sync = (view) => {
    const routed = view !== "workbench";
    app.hidden = false;
    workbenchView.hidden = routed;
    routeView.hidden = !routed;
    offlineNotice.hidden = Boolean(token) || !devMode();
    if (legacyNav) legacyNav.hidden = true;
    for (const node of legacyChrome) node.hidden = true;
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
