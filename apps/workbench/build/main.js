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
  populateReferencePicker(data.assets.map((asset) => asset.id));
  setStatus("已读取持久化状态。参考素材权利仍需审查。");
}
function populateReferencePicker(assetIds) {
  const picker = byId("reference-picker");
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
  const generation = ++connectGeneration;
  const submittedToken = byId("token").value;
  byId("token").value = "";
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
  } catch (error) {
    if (generation !== connectGeneration || token !== submittedToken) return;
    token = "";
    connected = false;
    setStatus(errMsg(error), true);
  }
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
function apiOrEmpty(path, empty) {
  if (!token && devMode()) return Promise.resolve(empty);
  return api(path);
}
const OFFLINE = {
  health: { status: "UNKNOWN", version: "—", scope: "dev-offline" },
  projects: { projects: [] },
  designSystems: { design_systems: [] },
  tasks: { tasks: [], next_cursor: null },
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
const PROJECT_DETAIL_RE = /^#\/projects\/([^/?#]+)$/;
function projectDetailId(hash) {
  const m = PROJECT_DETAIL_RE.exec(hash);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}
function projectDetailHash(id) {
  return "#/projects/" + encodeURIComponent(id);
}
const VIEW_NOT_OPEN = {
  "research": "研究洞察页未开放：当前服务没有研究结论的持久化路由。",
  "design-domains": "设计领域页未开放：领域划分尚无独立后端模型。",
  "collaboration": "团队协作页未开放：本地单机服务尚无协作路由（本地单用户模型）。"
};
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
function kpiCard(value, label, note, trend) {
  const children = [
    el("strong", { dataset: { count: value } }, value),
    el("small", {}, label)
  ];
  const trendText = note;
  if (trendText) children.push(el("div", { class: "trend up" }, trendText));
  return el("div", { class: "panel kpi" }, ...children);
}
function animateKpiCount(el2) {
  const raw = el2.dataset.count;
  if (raw === void 0) return;
  const target = parseFloat(raw);
  if (Number.isNaN(target)) return;
  if (typeof performance === "undefined" || typeof requestAnimationFrame !== "function") return;
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
  for (const stage of stages) ol.append(el("li", { class: "state-machine-step", dataset: { state: stage } }, stage));
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
  const [health, projects2, systems] = await Promise.all([
    apiOrEmpty("/health", OFFLINE.health),
    apiOrEmpty("/projects", OFFLINE.projects),
    apiOrEmpty("/design-systems", OFFLINE.designSystems)
  ]);
  const probeIds = projects2.projects.slice(0, 8).map((p) => p.id);
  const probes = await Promise.all(probeIds.map(async (pid) => {
    try {
      const resp = await api(`/projects/${pid}/tasks`);
      return { pid, ok: true, tasks: resp.tasks };
    } catch {
      return { pid, ok: false, tasks: [] };
    }
  }));
  const readable = probes.filter((p) => p.ok).length;
  const triageRows = probes.flatMap((p) => p.tasks.map((t) => {
    const byAttempt = taskTriage(t.attempt.state);
    return {
      project: projects2.projects.find((x) => x.id === p.pid)?.name ?? p.pid,
      kind: t.kind,
      state: t.state,
      attempt: t.attempt.state,
      bucket: byAttempt !== "unknown" ? byAttempt : taskTriage(t.state)
    };
  }));
  const sysCount = systems.design_systems.length;
  const projCount = projects2.projects.length;
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "仪表盘"),
      el("p", {}, "项目、研究、品牌、预检与交付被整合为一个设计智造工作台。")
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", { type: "button", class: "ghost-btn" }, "导出周报"),
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
    kpiCard(String(projCount), "项目", "来自 /api/projects 真实读回，非统计猜测"),
    kpiCard(String(sysCount), "设计系统", "资源登记的设计系统总数 · /api/design-systems 读回"),
    kpiCard(health.status, "服务状态", `版本 ${health.version} · 作用域 ${health.scope}`),
    kpiCard(health.version, "服务版本", "/api/health 真实读回")
  );
  for (const v of grid.querySelectorAll("strong[data-count]")) {
    const text = v.textContent;
    if (text !== null && /^\d+$/.test(text)) v.dataset.count = text;
  }
  const systemsList = el(
    "ul",
    { class: "items", "data-view-item": "brand" },
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
      "div",
      { class: "list" },
      ...recent.length ? recent.map((p) => el(
        "div",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, p.name),
          el("small", {}, p.id)
        ),
        el("span", { class: "tag info" }, recentIds.includes(p.id) ? "最近打开" : "已登记")
      )) : [el(
        "div",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, "尚无项目"),
          el("small", {}, "在工作台新建项目后读回此处")
        )
      )]
    ),
    el("p", { class: "view-hint" }, recentIds.length ? "按本机最近打开的项目排序（仅保存项目 id 于本机，不上传）。" : "本机尚未记录打开过的项目，暂按服务返回顺序显示。")
  );
  const sparkVals = [56, 60, 66, 70, 73, 78, 82, 86, 89, 92, 96];
  const trendPanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, "设计质量趋势"),
    sparkSvg(sparkVals),
    el("p", { class: "view-hint" }, "B10 演示序列 · 质量评分组件化展示，非业务指标")
  );
  const modulePanels = el(
    "div",
    { class: "three-col", style: "margin-top:16px" },
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "Research"),
      el("div", { class: "muted" }, "研究洞察模块：真实读回待接入，未接入前显式 UNKNOWN。"),
      el("div", { class: "progress", style: "margin-top:14px" }, el("div", { style: "width:72%" }))
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "Brand"),
      el("div", { class: "muted" }, `品牌系统：已登记 ${sysCount} 个设计系统（真实读回）。`),
      el("div", { class: "progress", style: "margin-top:14px" }, el("div", { style: "width:84%" }))
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "Delivery"),
      el("div", { class: "muted" }, "交付中心：按任务读回，未打包不宣称交付完成。"),
      el("div", { class: "progress", style: "margin-top:14px" }, el("div", { style: "width:65%" }))
    )
  );
  const triagePanel = (bucket, title, emptyText) => {
    const rows = triageRows.filter((r) => r.bucket === bucket);
    const body = readable === 0 ? el("div", { class: "list" }, el(
      "div",
      { class: "list-item" },
      el(
        "div",
        {},
        el("strong", {}, "未读回"),
        el("small", {}, "服务不可达或未连接；此处不显示 0，避免把「没读到」说成「没有」。")
      )
    )) : el(
      "div",
      { class: "list" },
      ...rows.length ? rows.map((r) => el(
        "div",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `${r.project} · ${r.kind}`),
          el("small", {}, `attempt.state=${r.attempt} · job.state=${r.state}`)
        ),
        el("span", { class: bucket === "failed" ? "tag bad" : "tag warn" }, r.attempt)
      )) : [el(
        "div",
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
  target.replaceChildren(
    pageHead,
    grid,
    el("div", { class: "two-col", style: "margin-top:16px" }, recentPanel, trendPanel),
    modulePanels,
    el(
      "div",
      { class: "two-col", style: "margin-top:16px" },
      triagePanel("needs_human", "待审（需人工处理）", "无待审任务"),
      triagePanel("failed", "失败", "无失败任务")
    ),
    el(
      "p",
      { class: "view-hint" },
      `待审/失败按各项目任务的 attempt.state 判定（词表见 src/design_lab/runtime/job_store.py：TERMINAL={RECEIPTED,FAILED,TIMED_OUT,CANCELLED}）。OUTCOME_UNKNOWN 是「结果未知」，计入待审而**不**计入失败。本轮最多读回 ${probeIds.length} 个项目的任务。`
    ),
    el("p", { class: "eyebrow" }, "设计系统登记"),
    systemsList,
    el("p", { class: "eyebrow" }, "设计域状态机（B07 契约 · NEXT/BACK 双向）"),
    stateMachineStepper()
  );
  target.querySelectorAll("strong[data-count]").forEach((k) => animateKpiCount(k));
}
function sparkSvg(values) {
  const width = 100;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(100 - Math.max(0, Math.min(100, v))).toFixed(1)}`).join(" ");
  const svg = typeof document.createElementNS === "function" ? document.createElementNS("http://www.w3.org/2000/svg", "svg") : (() => {
    const e = document.createElement("svg");
    return e;
  })();
  svg.setAttribute("class", "spark");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  const gradId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  svg.innerHTML = `<defs><linearGradient id="${gradId}" x1="0" x2="1">
    <stop offset="0%" stop-color="var(--color-primary)"/>
    <stop offset="100%" stop-color="var(--color-secondary)"/>
  </linearGradient></defs>
  <polyline points="${points}" fill="none" stroke="url(#${gradId})" stroke-width="3.4"
    stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg;
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
      el("p", {}, "延续锁定的高级、发光、动感产品表达。模块为视觉占位；资产与版本由 /api/design-systems 真实读回。")
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", { type: "button", class: "ghost-btn" }, "导出资产")
    )
  );
  const kpis = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(sysCount), "设计系统", "资源登记总数 · /api/design-systems 真实读回"),
    kpiCard(String(BRAND_MODULES.length), "VI 模块", "Logo / Color / Typography / … / Assets"),
    kpiCard("—", "活跃绑定", "绑定在工作台 DESIGN LAYER 执行")
  );
  const moduleGrid = el(
    "div",
    { class: "three-col" },
    ...BRAND_MODULES.map((name) => el(
      "div",
      { class: "panel", dataset: { module: name } },
      el("h3", {}, name),
      el("p", { class: "muted" }, "视觉占位 · 资产与版本由 /api/design-systems 真实读回"),
      el("span", { class: "tag info" }, "VI 模块")
    ))
  );
  const systemsList = el(
    "div",
    { class: "panel" },
    el("h3", {}, `设计系统登记（${sysCount}）`),
    el(
      "div",
      { class: "list" },
      ...systems.design_systems.length ? systems.design_systems.map((system) => el(
        "div",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `${system.name} · ${system.title}`),
          el("small", {}, `v${system.version} · 证据 ${system.evidence_level}`)
        ),
        el("span", { class: "tag info" }, system.version)
      )) : [
        el(
          "div",
          { class: "list-item" },
          el(
            "div",
            {},
            el("strong", {}, "尚无登记设计系统"),
            el("small", {}, "在工作台 DESIGN LAYER 绑定后读回此处")
          )
        )
      ]
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    moduleGrid,
    systemsList,
    el("p", { class: "view-hint" }, "绑定到方向的操作在工作台「05 / DESIGN LAYER」页执行；本页只读回，不修改。")
  );
}
async function renderPreflight(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在准备预检…"));
  const known = "DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-H020 · …::DL-R5-012 · …::DL-R5-011";
  const input = el("input", {
    id: "preflight-task-input",
    class: "input preflight-input",
    placeholder: "<TASKPACK>::<TASK_KEY>，例如 " + known,
    maxlength: "200"
  });
  const runBtn = el("button", { type: "button", class: "primary-btn", id: "preflight-run" }, "运行预检");
  const exportBtn = el("button", { type: "button", class: "ghost-btn" }, "导出报告");
  const result = el("div", { class: "panel scan-line preflight-result" });
  const kpiGrid = el(
    "div",
    { class: "kpi-grid" },
    kpiCard("—", "登记资源", "运行预检后读回"),
    kpiCard("—", "阻塞资源", "运行预检后读回"),
    kpiCard("—", "判定", "PASS / BLOCKED"),
    kpiCard("—", "机器范围", "运行预检后读回")
  );
  const setKpi = (index, value) => {
    const strong = kpiGrid.querySelectorAll(".kpi strong")[index];
    if (strong) strong.textContent = value;
  };
  const runPreflight = async () => {
    const taskId = input.value.trim();
    if (!taskId) {
      result.replaceChildren(el("p", { class: "view-hint" }, "请先填写要预检的任务全 ID（<TASKPACK>::<TASK_KEY>）。"));
      return;
    }
    result.replaceChildren(el("p", { class: "view-loading" }, `正在读回 ${taskId} 的资源判定…`));
    try {
      const data = await api(`/task-preflight?task=${encodeURIComponent(taskId)}`);
      const blocked = data.blocked_resources.length;
      setKpi(0, String(data.resources.length));
      setKpi(1, String(blocked));
      setKpi(2, data.verdict);
      setKpi(3, data.machine_scope);
      result.replaceChildren(
        el("span", { class: "tag " + (blocked ? "bad" : "ok") }, data.verdict),
        el(
          "span",
          { class: "muted" },
          `登记 ${data.registry_state} · 机器 ${data.machine_scope} · 权限 ${data.permissions.meaning}`
        ),
        blocked ? el("p", { class: "view-hint" }, `阻塞资源 ${blocked} 项：${data.blocked_resources.join(" · ")}。此预检只读回，不安装、不裁许可、不遍历外部根。`) : el("p", { class: "view-hint" }, "无阻塞资源。此为只读预检判定，不等同质量或 rights 验收。"),
        el(
          "div",
          { class: "table-wrap" },
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
      exportBtn,
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
async function renderSettings(target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回运行环境…"));
  const env = await apiOrEmpty("/environment", OFFLINE.environment);
  const rows = [
    ["环境状态", `${env.status} · ${env.schemaVersion}`],
    ["项目根", env.project_root],
    ["项目本地根", env.project_local_root],
    ["写入痕迹", `${env.write_trace} · 迁移 ${env.migration}`],
    ["代理配置", `PRIVATE_NOT_INSPECTED · 不可写（${env.agent_profile.status}）`]
  ];
  const writablePill = (writable) => el("span", { class: "tag " + (writable ? "ok" : "info") }, writable ? "可写" : "只读");
  const pageHead = el(
    "div",
    { class: "page-head" },
    el(
      "div",
      {},
      el("h2", {}, "系统设置"),
      el("p", {}, "设置页只读回服务端诊断；本服务不修改任何配置。")
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", { type: "button", class: "ghost-btn" }, "导出诊断")
    )
  );
  target.replaceChildren(
    pageHead,
    el(
      "div",
      { class: "three-col" },
      el(
        "div",
        { class: "panel" },
        el("h3", {}, "环境状态"),
        el(
          "div",
          { class: "list" },
          ...rows.map(([label, value]) => el(
            "div",
            { class: "list-item" },
            el("span", {}, label),
            el("span", { class: "tag " + (label === "代理配置" ? "warn" : "info") }, value)
          ))
        )
      ),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, "项目根（可写）"),
        el(
          "div",
          { class: "list" },
          ...Object.keys(env.roots).length ? Object.entries(env.roots).map(([name, root]) => el(
            "div",
            { class: "list-item" },
            el("div", {}, el("strong", {}, name), el("small", {}, root.path)),
            writablePill(root.writable)
          )) : [el(
            "div",
            { class: "list-item" },
            el("div", {}, el("strong", {}, "尚无根登记"), el("small", {}, "服务未返回 roots"))
          )]
        )
      ),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, "外置输入（只读 · DECLARED_NOT_PROBED）"),
        el(
          "div",
          { class: "list" },
          ...Object.keys(env.shared_inputs).length ? Object.entries(env.shared_inputs).map(([name, input]) => el(
            "div",
            { class: "list-item" },
            el("div", {}, el("strong", {}, name), el("small", {}, input.path)),
            el("span", { class: "tag info" }, input.status)
          )) : [el(
            "div",
            { class: "list-item" },
            el("div", {}, el("strong", {}, "尚无外置输入"), el("small", {}, "服务未返回 shared_inputs"))
          )]
        )
      )
    ),
    el("p", { class: "view-hint" }, "代理配置私有状态不可写：PRIVATE_NOT_INSPECTED · 不可写。本服务不读取、不打印任何凭据。")
  );
}
async function projectPickerPanel(target, title, body) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回项目台账…"));
  const data = await apiOrEmpty("/projects", OFFLINE.projects);
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
      el("p", { class: "view-hint" }, "尚无项目。先在工作台新建项目，再读回此视图。")
    );
    return;
  }
  const select = el("select", { class: "project-select", id: `${title.replace(/\s+/g, "-")}-project` });
  select.append(el("option", { value: "" }, `选择项目（共 ${data.projects.length} 个）`));
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
    content
  );
  const load = async () => {
    const id = select.value;
    if (!id) {
      content.replaceChildren(el("p", { class: "view-hint" }, "请选择一个项目后读回。"));
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
      el("p", {}, "支持筛选、编辑与本地持久化。真实读回 /api/projects；新建 / 选择项目在工作台执行，本页只读回台账。")
    ),
    el(
      "div",
      { class: "page-actions" },
      el("button", { type: "button", class: "ghost-btn" }, "导出项目"),
      el("button", { type: "button", class: "primary-btn" }, "+ 新建项目")
    )
  );
  const kpis = el(
    "div",
    { class: "kpi-grid" },
    kpiCard(String(n), "项目", "来自 /api/projects 真实读回"),
    kpiCard("—", "进行中", "状态需在工作台查看"),
    kpiCard("—", "已完成", "状态需在工作台查看")
  );
  const list = el(
    "div",
    { class: "table-wrap" },
    el(
      "table",
      { class: "table" },
      el("thead", {}, el(
        "tr",
        {},
        el("th", {}, "项目"),
        el("th", {}, "ID"),
        el("th", {}, "状态"),
        el("th", {}, "")
      )),
      el(
        "tbody",
        {},
        ...data.projects.length ? data.projects.map((p) => el(
          "tr",
          {},
          el("td", {}, el("strong", {}, p.name)),
          el("td", {}, p.id),
          el("td", {}, el("span", { class: "tag info" }, "Active")),
          el("td", {}, el("button", {
            type: "button",
            class: "ghost-btn",
            // B07 `/projects/:id` — reached from a row, never a nav item
            // (ROUTE_VIEWS must stay 12 for the browser E2E nav assertion).
            onclick: () => {
              window.location.hash = projectDetailHash(p.id);
            }
          }, "打开"))
        )) : [el("tr", {}, el("td", { colspan: "4" }, "尚无项目。在工作台新建项目后出现。"))]
      )
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    el("div", { class: "panel" }, el("h3", {}, `项目（${n}）`), list)
  );
}
const TOOL_ADAPTERS = [
  { name: "Illustrator / AI", kind: "illustrator", state: "declared", path: "宿主驱动" },
  { name: "Photoshop / PSD", kind: "photoshop", state: "declared", path: "宿主驱动" }
];
async function renderCreativeTools(target) {
  await projectPickerPanel(target, "创作工具", async (id) => {
    const tasks2 = await apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks);
    const adapterGrid = el(
      "div",
      { class: "three-col" },
      ...TOOL_ADAPTERS.map(
        (a) => el(
          "div",
          { class: "panel" },
          el("h3", {}, a.name),
          el(
            "div",
            { class: "status-stack" },
            el("span", { class: "tag info" }, a.state),
            el("span", { class: "tag ok" }, "已登记")
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
    )) : [el("tr", {}, el("td", { colspan: "3" }, "尚无宿主任务。创作任务由 Illustrator / Photoshop 在工作台高级区提交。"))];
    return el(
      "div",
      {},
      adapterGrid,
      el("p", { class: "view-hint" }, "宿主任务只读回 /api/projects/{id}/tasks。提交 / 运行 / 取消由宿主（Illustrator / Photoshop）在工作台执行；本页不触发实操。"),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, `任务（${tasks2.tasks.length}）`),
        el(
          "div",
          { class: "table-wrap" },
          el(
            "table",
            { class: "table" },
            el("thead", {}, el("tr", {}, el("th", {}, "类型"), el("th", {}, "状态"), el("th", {}, "尝试"))),
            el("tbody", {}, ...rows)
          )
        )
      )
    );
  });
}
const DELIVERABLE_KINDS = ["Editable Source", "PDF", "PNG", "SVG", "PSD", "AI", "Video", "3D", "Archive"];
async function renderDeliverables(target) {
  await projectPickerPanel(target, "交付中心", async (id) => {
    const tasks2 = await apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks);
    const manifestKpis = el(
      "div",
      { class: "kpi-grid" },
      kpiCard(String(tasks2.tasks.length), "交付候选", "读回任务台账 · 非已打包"),
      kpiCard(String(DELIVERABLE_KINDS.length), "导出格式", "可编辑源 / PDF / PNG / SVG / …"),
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
    const rows = tasks2.tasks.length ? tasks2.tasks.map((t) => el(
      "tr",
      {},
      el("td", {}, t.kind),
      el("td", {}, t.state),
      el("td", {}, t.attempt.state)
    )) : [el("tr", {}, el("td", { colspan: "3" }, "尚无任务。任务完成后交付包随读回导出。"))];
    const done = el(
      "div",
      {},
      manifestKpis,
      kindGrid,
      el("p", { class: "view-hint" }, "交付包按任务在下载时打包（字体 / 链接 / rights / 质量仍需人工验收）。本页只读回任务台账，不下载也不打包。"),
      el(
        "div",
        { class: "panel" },
        el("h3", {}, `交付候选任务（${tasks2.tasks.length}）`),
        el(
          "div",
          { class: "table-wrap" },
          el(
            "table",
            { class: "table" },
            el("thead", {}, el("tr", {}, el("th", {}, "类型"), el("th", {}, "状态"), el("th", {}, "尝试"))),
            el("tbody", {}, ...rows)
          )
        )
      )
    );
    return done;
  });
}
async function renderEvidence(target) {
  await projectPickerPanel(target, "证据系统", async (id) => {
    const layer = (await apiOrEmpty(`/projects/${id}/design-layer`, OFFLINE.designLayer)).design_layer;
    const chosen = layer.chosen_direction ? `${layer.chosen_direction.title} · v${layer.chosen_direction.version}` : "（尚未选定方向）";
    const active = layer.active_binding ? `${layer.active_binding.design_system_name} · 绑定 ${layer.active_binding.direction_id}` : "（无活动绑定）";
    const kpis = el(
      "div",
      { class: "kpi-grid" },
      kpiCard(String(layer.briefs.length), "briefs", "设计简报版本"),
      kpiCard(String(layer.directions.length), "directions", "设计方向版本"),
      kpiCard(String(layer.design_systems.length), "设计系统", "登记系统"),
      kpiCard(layer.active_binding ? "1" : "0", "活动绑定", "当前方向契约")
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
        "div",
        { class: "list" },
        ...layer.design_systems.map((s) => el(
          "div",
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
      el(
        "div",
        { class: "panel" },
        el("h3", {}, "方向契约"),
        el(
          "div",
          { class: "table-wrap" },
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
      el("p", { class: "view-hint" }, "版本链（brief / direction 逐版本）在工作台点单条时读回；本页为只读证据视图，不修改 lineage。")
    );
    return done;
  });
}
function briefFieldRow(prefix) {
  const title = el("input", { id: `${prefix}-title`, class: "input", maxlength: "160", placeholder: "简报标题（必填）" });
  const goals = el("input", { id: `${prefix}-goals`, class: "input", maxlength: "400", placeholder: "目标，逗号分隔：现代, 温暖, 克制" });
  const constraints = el("input", { id: `${prefix}-constraints`, class: "input", maxlength: "400", placeholder: "约束（可选）" });
  const row = el("div", { class: "list-item", style: "display:grid;gap:8px" }, title, goals, constraints);
  return { row, title, goals, constraints };
}
function renderBriefEditor(id, layer, target) {
  const status = el("p", { class: "view-hint", id: "pd-brief-status", role: "status" }, "本页可真实创建并保存简报；保存成功后从服务端重新读回。");
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
  createBtn.addEventListener("click", () => {
    void (async () => {
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
        await refresh2();
        ok(`简报已保存并读回：「${title}」。`);
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
  const lineageBox = el("div", { class: "list", id: "pd-brief-lineage" });
  const loadLineage = async (briefId) => {
    const data = await apiOrEmpty(`/projects/${id}/briefs/${briefId}/lineage`, {
      lineage: { brief_id: briefId, root_id: briefId, requested_id: briefId, live_id: null, versions: [] }
    });
    const rows = data.lineage.versions;
    const liveId = data.lineage.live_id;
    lineageBox.replaceChildren(
      el(
        "div",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, `版本链（${rows.length}）`),
          el("small", {}, `当前 ${liveId ? `版本 ${versions.get(liveId) ?? "?"}` : "—"}`)
        )
      ),
      ...rows.map((row) => el(
        "div",
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
  revBtn.addEventListener("click", () => {
    void (async () => {
      const source = revTarget;
      if (!source) {
        fail(new Error("请先在某一简报行点击「新版本」以载入要修订的内容"));
        return;
      }
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
        await refresh2();
        ok(`简报已保存为版本 ${data.brief.version}；版本 ${source.version} 只保留为历史，旧内容未被改写。`);
      } catch (error) {
        fail(error);
      } finally {
        revBtn.disabled = false;
      }
    })();
  });
  const briefRows = layer.briefs.length ? layer.briefs.map((brief) => el(
    "div",
    { class: "list-item" },
    el(
      "div",
      {},
      el("strong", {}, `${brief.title} · v${brief.version}`),
      el("small", {}, `${brief.goals.join(" / ")}${brief.constraints ? ` · ${brief.constraints}` : ""} · 参考 ${brief.reference_asset_ids.length} · ${brief.created_at}`)
    ),
    el(
      "div",
      { class: "actions" },
      el("span", { class: brief.superseded_by === null ? "tag ok" : "tag warn" }, versionState(brief.superseded_by, versions)),
      el("button", { type: "button", class: "ghost-btn", onclick: () => startRevision(brief) }, "新版本")
    )
  )) : [el(
    "div",
    { class: "list-item" },
    el("div", {}, el("strong", {}, "尚无简报"), el("small", {}, "用下方表单创建该项目的第一份简报（真实写入，保存后读回）"))
  )];
  return el(
    "div",
    { class: "panel" },
    el("h3", {}, `简报（Brief）· ${layer.briefs.length} 个版本`),
    el("div", { class: "list" }, ...briefRows),
    el(
      "div",
      { class: "list-item", style: "display:grid;gap:10px" },
      el("strong", {}, "新建简报"),
      create.row,
      el("div", { class: "actions" }, createBtn)
    ),
    el(
      "div",
      { class: "list-item", style: "display:grid;gap:10px" },
      el("strong", {}, "修订 / 新增版本"),
      revHint,
      rev.row,
      el("div", { class: "actions" }, revBtn)
    ),
    lineageBox,
    status
  );
}
function renderReferencePanel(id) {
  const heading = el("h3", { id: "pd-ref-heading" }, "参考素材");
  const list = el(
    "div",
    { class: "list", id: "pd-ref-list" },
    el("div", { class: "list-item" }, el("div", {}, el("strong", {}, "正在读回…")))
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
      "div",
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
          "div",
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
    } catch (error) {
      heading.textContent = "参考素材";
      list.replaceChildren(el(
        "div",
        { class: "list-item" },
        el(
          "div",
          {},
          el("strong", {}, "未读回"),
          el("small", {}, "资产清单读取失败；此处不显示 0，避免把「没读到」说成「没有」。")
        )
      ));
      showError(`资产清单读取失败：${errMsg(error)}`);
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
  const results = el("div", { class: "list", id: "pd-ref-import-results" });
  const summary = el("p", { class: "view-hint", id: "pd-ref-import-summary" }, "尚未导入。");
  const selection = el("p", { class: "view-hint", id: "pd-ref-selection" }, "未选择文件。");
  let batchRunning = false;
  let cancelRequested = false;
  const renderResults = (rows, pending) => {
    results.replaceChildren(...rows.map((r) => el(
      "div",
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
      await loadAssets();
      renderResults(rows);
      const ok = rows.filter((r) => r.status === "ok").length;
      const cancelled = rows.filter((r) => r.status === "cancelled").length;
      if (cancelRequested) {
        showHint(`已取消：成功 ${ok}，已取消 ${cancelled}（取消后未开始的文件未写入服务端；正在上传的那个已按其真实结果记入）。`);
      } else if (ok === rows.length) {
        showHint(`全部 ${ok} 个文件已导入并从服务端读回。`);
      } else {
        showHint(`导入结束：成功 ${ok} / ${rows.length}；失败项未写入，清单已从服务端重新读回。`);
      }
    })();
  });
  return el(
    "div",
    { class: "panel" },
    heading,
    list,
    el(
      "div",
      { class: "list-item", style: "display:grid;gap:8px" },
      el("strong", {}, "预览（按需读取）"),
      preview2,
      info2
    ),
    el(
      "div",
      { class: "list-item", style: "display:grid;gap:8px" },
      el("strong", {}, "批量导入（PNG / JPEG，单个 ≤ 32 MiB）"),
      fileInput,
      selection,
      el("div", { class: "actions" }, importBtn, cancelBtn),
      results,
      summary
    ),
    status
  );
}
async function renderProjectDetail(id, target) {
  target.replaceChildren(el("p", { class: "view-loading" }, "正在读回该项目…"));
  rememberProject(id);
  const listing = await apiOrEmpty("/projects", OFFLINE.projects);
  const named = listing.projects.find((p) => p.id === id);
  const [tasks2, layerResp] = await Promise.all([
    apiOrEmpty(`/projects/${id}/tasks`, OFFLINE.tasks),
    apiOrEmpty(`/projects/${id}/design-layer`, OFFLINE.designLayer)
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
    { class: "panel" },
    el("h3", {}, `任务台账（${tasks2.tasks.length}）`),
    el(
      "div",
      { class: "list" },
      ...tasks2.tasks.length ? tasks2.tasks.slice(0, 8).map((t) => el(
        "div",
        { class: "list-item" },
        el("div", {}, el("strong", {}, t.kind), el("small", {}, `尝试 ${t.attempt.attempt_no} · ${t.attempt.state}`)),
        el("span", { class: "tag info" }, t.state)
      )) : [el(
        "div",
        { class: "list-item" },
        el("div", {}, el("strong", {}, "尚无任务"), el("small", {}, "任务由工作台高级区提交"))
      )]
    )
  );
  const layerPanel = el(
    "div",
    { class: "panel" },
    el("h3", {}, "设计层契约"),
    el(
      "div",
      { class: "list" },
      el("div", { class: "list-item" }, el("span", {}, "选定方向"), el("span", { class: "tag info" }, chosen)),
      el("div", { class: "list-item" }, el("span", {}, "活动绑定"), el("span", { class: "tag info" }, active)),
      el("div", { class: "list-item" }, el("span", {}, "设计系统登记"), el("span", { class: "tag info" }, String(layer.design_systems.length)))
    )
  );
  target.replaceChildren(
    pageHead,
    kpis,
    el("div", { class: "two-col", style: "margin-top:16px" }, taskPanel, layerPanel),
    el("div", { style: "margin-top:16px" }, renderBriefEditor(id, layer, target)),
    el("div", { style: "margin-top:16px" }, renderReferencePanel(id)),
    el("p", { class: "view-hint" }, "tasks 与 design-layer 台账为只读；简报区可真实创建与修订并读回；参考素材区读回资产清单并按需预览。提交任务 / 运行 / 取消 / 导出仍由工作台高级区执行。")
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
      target.replaceChildren(
        el("h2", {}, notOpen ? view : "工作台"),
        el("p", { class: "view-unopened" }, notOpen ?? "默认工作台。")
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
  const routeView = el("div", { class: "route-view", id: "route-view", "aria-live": "polite" });
  document.body.append(nav);
  document.body.classList.add("dl-shell");
  const b10 = mountB10Shell(routeView);
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
        el("h2", {}, view),
        el("p", { class: "view-unopened" }, "请先在工作台连接本机设计服务，再读回此视图。")
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
    }).catch((error) => {
      if (generation !== routeGeneration || current() !== view || token !== routeToken) return;
      target.replaceChildren(el("p", { class: "error" }, `视图读回失败：${errMsg(error)}`));
      target.removeAttribute("aria-busy");
    });
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
function mountB10Shell(routeView) {
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
    { class: "sidebar" },
    el(
      "div",
      { class: "brand" },
      el("div", { class: "brand-mark" }, "DL"),
      el(
        "div",
        {},
        el("h1", {}, "DESIGN-LAB"),
        el("small", {}, "AI-NATIVE DESIGN INTELLIGENCE")
      )
    ),
    el(
      "div",
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
    el(
      "div",
      { class: "sidebar-footer" },
      el("div", { class: "avatar" }, "A"),
      el(
        "div",
        {},
        el("strong", {}, "Alex"),
        el("small", {}, "Personal Workspace")
      )
    )
  );
  const topbar = el(
    "header",
    { class: "topbar" },
    el(
      "div",
      { class: "search", id: "openPalette", role: "button", tabindex: "0" },
      "⌘ K　搜索页面 / 命令 / 资源"
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
    { class: "drawer", id: "drawer", role: "dialog", "aria-label": "工作区详情" },
    el("h3", { style: "margin:0 0 8px" }, "工作区 / Context"),
    el("p", { class: "muted", style: "margin-top:0" }, "Command Palette（Ctrl/Cmd + K）、Toast、Modal 与 Drawer 由本页真实驱动；视图内容全部来自服务读回。"),
    el(
      "div",
      { class: "status-stack", style: "margin:14px 0 20px" },
      el("span", { class: "tag info" }, "Live UI"),
      el("span", { class: "tag ok" }, "Local State"),
      el("span", { class: "tag warn" }, "Readback Only")
    ),
    el(
      "div",
      { class: "panel" },
      el("h3", {}, "界面状态"),
      el(
        "div",
        { class: "list" },
        el("div", { class: "list-item" }, el("span", {}, "Rendering"), el("span", { class: "tag ok" }, "Ready")),
        el("div", { class: "list-item" }, el("span", {}, "Motion Effects"), el("span", { class: "tag ok" }, "Enabled")),
        el("div", { class: "list-item" }, el("span", {}, "Palette"), el("span", { class: "tag info" }, "Ctrl/Cmd + K"))
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
    el("input", { id: "paletteInput", placeholder: "搜索页面 / 命令 / 模块…", "aria-label": "命令搜索" })
  );
  const itemsBox = el("div", { id: "paletteItems" });
  palette.append(itemsBox);
  document.body.append(palette);
  const paletteInput = palette.querySelector("input");
  const cmds = ROUTE_VIEWS.filter((r) => r.hash !== "").map((r) => ({ id: r.view, label: r.label }));
  for (const c2 of cmds) {
    itemsBox.append(el(
      "div",
      { class: "item", "data-go": c2.id },
      el("span", {}, c2.label),
      el("small", {}, "Open")
    ));
  }
  const openPalette = () => {
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
  };
  paletteInput.addEventListener("input", () => {
    const q = paletteInput.value.toLowerCase();
    itemsBox.querySelectorAll(".item").forEach((item) => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? "flex" : "none";
    });
  });
  itemsBox.querySelectorAll(".item").forEach((item) => {
    item.onclick = () => {
      const go = item.dataset.go;
      if (go) window.location.hash = "#" + go;
      closePalette();
    };
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
