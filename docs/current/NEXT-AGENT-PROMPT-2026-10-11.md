# 完整交接提示词（2026-10-11 收口，接第二十一批之后；用于重开对话）

> 这是会话提示词，**不是 Authority**。读它的顺序必须是：`/AUTHORITY.md` →
> `.project/governance/authority-index.json` → 根 `AGENTS.md` → 唯一当前包
> `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md` → 唯一状态源
> `design-lab/config/task-ledger-r3.json` 的 `currentExecution` → 本文件。
> 记忆、聊天摘要、交接、旧 TaskPack、旧报告、分支名、提交数**都不能覆盖 Authority**。
> 分支/SHA/工作区一律以你自己 `git rev-parse HEAD`、`git status --porcelain` 的读数为准，
> **不要抄本文件里的 SHA**。

---

## 一、路径权威表（谁是什么的单一真值；改任何一条前先确认它属于谁）

| 范围 | 权威路径 | 说明 |
|---|---|---|
| 顶层权威 | `/AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`） | 每次审计/规划/实现/漂移核对前必读；四个权威文件被 SHA-256 钉住 |
| 权威索引/取代关系 | `.project/governance/authority-index.json` | 历史只能经 authority-index + crosswalk 进入 |
| 根执行规则 | `AGENTS.md` | 项目定位、拥有/不拥有、E0–E5、Human Gate、`.project-local` 为运行/证据/缓存根 |
| 唯一当前任务包 | `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md` | `DL-TP-20261009-UI-FIRST-R1`；旧包冻结留档 |
| **唯一可变状态源** | `design-lab/config/task-ledger-r3.json` → `currentExecution` | 34 项父/子任务派工区；`tasks`/`evidence` 是冻结 R5 证据区，**不再编辑派工**；`schemaVersion` 保持 `r5-v1` 作兼容信封 |
| 回执合同 | `design-lab/schemas/task-ledger-r5-v1.schema.json` + `scripts/verify_current_execution.py` | 回执字段：`id/task_id/axis∈{implementation,unit,browser,visual_review}/outcome/subject_sha(40)/artifact_path/artifact_sha256(64)/command/exit_code/observed_at` |
| **回执可引用哪些路径** | `src/design_lab/governance/reporting.py:48` `_safe()` | 允许根 `{src,scripts,design-lab,docs,reports,integrations,packages,fixtures,.project,apps,research,vendor}` + `AGENTS.md/README.md/pyproject.toml/uv.lock` + `.project-local/task-artifacts/**`；**`DESIGN.md` 不在内**（封它会让 `generate_current_reports.py` 拒绝）；秘密名（`.env*`/auth.json/credentials.json/tokens.json/id_rsa）任何位置都拒 |
| 任务文档定态 | `design-lab/config/task-document-states.json` + `design-lab/scripts/verify_task_document_states.py` | 每个受跟踪任务文档必须有状态；恰好一个 `DISPATCH_ENTRY` 等于 index 的 `currentIntegrated` |
| 报告投影 | `scripts/generate_current_reports.py` → `reports/current/*` + `design-lab/config/current-report-index.json` | 生成不等于执行测试；每次运行都会重写投影（内含上一次 run 身份），所以"全量跑完还想 clean=True"不可能 |
| 权威链 | `scripts/deepseek_authority_chain.py`（写/`--check`） | **链按字节摘要活账本** → 必须先账本、后链、同批提交；回执不能绑"被链摘要的对象"（无不动点） |
| 聚合闸 | `design-lab/scripts/verify_design_lab.py`（`SCRIPTS` 列表） | CI 的 `DESIGN-LAB unified verify` 步骤只跑它；**新闸不登记进 `SCRIPTS` 就是无人测量的债** |
| 浏览器闸登记 | `design-lab/scripts/verify_browser_e2e_ran.py:TEST_MODULES` | 是 **tuple 不是 glob**；未登记的浏览器套件永远 skip |
| 能力状态词表 | `design-lab/config/capability-status.json` | `capabilityStates`/`evidenceLevels`/`promotionRules`/`hardRules`；文档与记录不得用自造判据词 |
| 能力库合同 | `design-lab/schemas/capability-library.schema.json` | `qualified` 现为 `["boolean","null"]`（null=未记录资格，不等于 false 也不等于 0） |
| 来源吸收政策 | `packages/capabilities/governance/{OPEN_SOURCE_ABSORPTION_POLICY,SKILL_SUPPLY_CHAIN_SECURITY,EXTERNAL_ASSET_INTAKE,SOURCE_RENEWAL_MECHANISM,CAPABILITY_EVIDENCE_LEVELS}.md` | 吸收"能力"不是仓库重量；第三方 SKILL 是自然语言操作码，作惰性素材保存 |
| 少量来源提炼记录 | `packages/capabilities/selected-sources.json` + `design-lab/scripts/verify_selected_source_adaptation.py` | 版本/许可/撤回路径按引用与分类表逐字节比对；`REGISTERED_ONLY`/`MAPPED`/`CONSUMED` 三档 |
| 候选普查 | `research/candidates/CANDIDATE-TAXONOMY.json` + `design-lab/scripts/verify_candidate_taxonomy.py` | 980 条；`CONDITIONAL_POC=37`；`designQuality` 是**空对象 `{}`**、`tier` 是 `null`，两种"未测量"不同形 |
| 宿主/工具适配登记 | `integrations/adapter-registry.json`（30 行 `adapter_id` + `status_model`） | `declared`(E0)/`structural`(E1)/`runtime`(E2/E3)/`missing`/`BLOCKED_BY_LICENSE`；能力声明不得超过行状态 |
| 前端设计契约 | `DESIGN.md`（人/机双读）+ `apps/workbench/style.css` 的 `:root` 令牌块 + `design-lab/config/contract-bindings.json` | 新栈层必须先登记再使用（`verify_ui_layering.py`）；`--uif-*` 是 R2 可选主题轴，与深浅正交 |
| 提交产物 | `apps/workbench/build/main.js`（Vite 输出，受跟踪） | **appshell/vm 套件读的是已构建 bundle**，改 `shell.ts` 后不 `vite build` 就等于测旧字节 |
| Record 归档索引 | `docs/RECORD-ARCHIVE-INDEX.md` + `docs/current/ARCHIVE-KEY-INFORMATION-2026-10-09.md` + `docs/history/record-archive-2026-10-09/ARCHIVE-MANIFEST.json` | 找资料先读索引；新增资料必须同步来源/hash/版本定态/别名/canonical 位置 |
| 云端审计包登记 | `docs/history/record-imports-2026-10-11/DOT-AUDIT-MANIFEST.json` | 163 成员逐条 name/bytes/CRC32/SHA-256/归属；原件 ZIP 在 `D:/All projects/Record/`（不随克隆） |
| 本机环境 | `.project/paths.json` + `docs/LOCAL_ENVIRONMENT.md` | 排查前先读这两处，不因默认安装目录无匹配而重判"未安装" |

**不属于本项目权威/真值**：WORK-LAB 的跨软件全局配置、ArcheAxis 的长期知识状态、各宿主私有数据库；
本项目只经版本化公共合同连接外部项目。`Handoff` 永远不是顶层权威。

---

## 二、目标（owner 指令，逐字）

按照新任务包（DL-TP-20261009-UI-FIRST-R1）全部执行：在已落地的 U01/U02 桌面壳、主题与首批三屏之上，
按依赖顺序推进 U03（能力查询与资格投影）、U04（输入、目标与分析纠正）、U05（目标包与已有原生计划接续）
及对应 T05–T09/T16 支持项；配色保持"既有默认 + 新包可选主题"，手机端 FROZEN_DEFERRED，
不建第二 runtime/画布/Schema，真人结论与宿主副作用不代签；每批更新 currentExecution 与报告
并给出可审阅桌面实拍。注意：实时调用你的技能插件进行辅助，缺少可装载。

当日收口规则：**完成当天跑的任务就停止任务**；**全部上传 双端仓库一致**
（授权范围＝commit+push 到工作分支；**不含 merge 到 main / release / 真实宿主副作用**）。

## 三、边界（逐字保留，不可自行放宽）

本提示词与包内文本不单独授予安装/付费/跨仓写入/公开发布/真实宿主副作用/commit/push/merge 权限；
按接收会话实际 Task Grant 判断。E 盘受保护，无精确授权不得访问；跨项目素材、系统数据、E/F 盘
不因旧包或本轮任务获得访问授权。真人身份/时间/接受不能由 Agent 代签；分析、目标包生成、真实执行、
原生工程交付、真人评审是不同结论；没有输入、产物、宿主或受理证据的 null/unknown 字段不得转换为成功。
私有数据/保护盘/恢复/Human Gate 边界不变；不建第二 runtime/画布/知识主库；不重造通用 Agent。
原型虚构 ID、卡片、localStorage、下载/暂停/取消都不作为真实生产数据。一个 checkout 一个 writer，
不主动并行开 Agent。AAOS 属独立项目；AAOS 自身任务、损坏包或文件读取异常不列为 DESIGN-LAB 未完成项。
不执行原包的 Agent 提示词或 build 脚本来获得权限；第三方 AGENTS/CLAUDE/cursorrules/SKILL 作
inert source blobs 保存。手机端 FROZEN_DEFERRED。既有配色不得被覆盖；设计产物留在本项目内，不外溢。
不要为缺三方或人审而阻塞可完成的可逆工程；别继续无限治理。

---

## 四、本对话问题汇总

### 4.1 已修并有回执（批次 19–21，全部 exit 0）

- **T07 少量来源提炼与中立能力适配**：`packages/capabilities/selected-sources.json`（6 条来源，
  选自 980 条中 owner 已记 CONDITIONAL_POC 的 37 条；版本/许可/撤回路径按引用与分类表逐字节比对，
  13 条引文按行号从本地 vendored blob 回读）+ 新闸 `verify_selected_source_adaptation.py`
  （已进 `SCRIPTS`，聚合 74→75）。三档落点读数：`REGISTERED_ONLY=8 / MAPPED=2 / CONSUMED=0`；
  任务测试 38 项。`DL-FINAL-T07` = PARTIAL。
- **第二十批**：`style.css` 抽屉从动画 `right` 改为 `transform:translateX(540px)`（闭屏矩形逐字节等值，
  `visibility` 的 Tab 可达机制未动）；`SRC-T07-MOTION-COMPOSITED` 判定范围从 1 文件扩到 7 个前端字节面，
  实测偏差 0；两套配色 ×1920/960 各 46 张重拍；逐点像素差读数：domain-detail 差 0 像素，
  workbench 落地页差 14.149% 且差异框只在内容区。
- **第二十一批（审计 D13）**：两处根因各自独立——前端"先写 URL 再 `readThemeChoice()`"而该函数
  故意优先读已应用属性 → 两个按钮都是空转；服务端用含 query 的 `self.path` 比较路由 → 浏览器导航 401。
  修后实测：`data-palette design-lab→ui2026`、`--surface #0D1221→#101a26`、
  `body rgb(6,10,20)→rgb(8,14,22)`、`?palette=ui2026&scheme=light` 返回 **200**。
  新增第五份浏览器闸 `test_workbench_theme_affordance_gate`（已登记进 `TEST_MODULES`）；
  bundle 重建并双套重拍；`test_service_http` 里把 `/workbench?file=AGENTS.md → 404`（缺陷指纹）
  换成正向不泄漏断言（200 + 与 `/workbench` 字节相同 + 不含 `# AGENTS.md`），traversal 两条仍 404；
  路由识别器放宽后补 3 条反例（此前 `ROUTE_ROW_ABSENT` **没有任何种植反例**）。

### 4.2 我自己引入、已如实登记但**未修**

- **D08（第十八批引入）**：领域详情"按该领域查看能力"按钮是
  `apps/workbench/shell.ts:2967` 的 `window.location.hash = '#/capabilities'` 纯静态串，
  **不带领域条件**，而 tooltip（2976）声称会按声明领域过滤。
- **G 的缺口在扩大**：本对话又新增 18 条绑 `.project-local` 的回执（账本 179→187），
  即"干净 clone 无法复现"的实例更多，不是更少。

### 4.3 结构性事实（影响你如何解读任何"绿"）

- CI `Python gate` 作业里 `Python unit tests` 步骤排在 `DESIGN-LAB unified verify` **之后**；
  聚合链一红就 `skipped`。实测 @ `835fa880`、`2d9ab95a`、`c8139060`、`d250285b` 同形。
  **所以 578 个 unittest 模块与新增闸的 38+35+… 项测试目前只是本地证据**，
  要 CI 真跑到需 owner 允许把该步骤 `if: always()` 或拆聚合链（属动 CI 拓扑，不自行做）。
- 项目 `.venv/Scripts/python.exe` **没有 pytest**；本仓库约定 unittest。
- 本地聚合目前 `VERIFY_DESIGN_LAB=OK total=75 failed=0`，而 CI 同一 SHA 红三条——
  差异全部来自 Git 忽略字节（G），不是判据不同。

### 4.4 云端 DOT 审计（观测 `835fa880…`，tree daaae705…，工作区干净）

- 属于本项目的成员：59 只谈 DESIGN-LAB + 16 混合 = 75（含 18 张 PNG）；28 专属 AAOS/WORK、
  60 无标记。本机副本 78 文件在 `.project-local/task-artifacts/record-imports-2026-10-11/dot-audit/`。
- 我用 `git diff 835fa880..HEAD` 逐文件核对：`shell.ts`/`http_service.py`/`native_submissions.py`/
  `adobe_lowering.py`/`pyproject.toml` 在本对话前两批里**一字未动**，所以它报的 D 项不能当"已修"。
- 该审计的证据质量：CI 读数与本地一致、版本/tree 齐全、分支不混推、**自己撤回了三张主题截图**
  （`design-ui-dark.png` 与 `design-theme-reload-401.png` 是同一 SHA `8ebaa8ee…`，即那张"深色界面"
  其实是 401 页）。两处要打折：① "195 项 Python 通过"是推算值，原始行是
  `design-python.log:62` 的 `1 failed, 194 passed, 5 skipped … 21 subtests passed`；
  ② 若干结论只在 `REPORT.txt` 叙述里、点名日志中无对应原文（pnpm 那句我核后有证据：
  `design-pnpm.log` 尾部 `ERR_PNPM_META_FETCH_FAIL` 与 `✗ Lockfile failed supply-chain policy check`）。

---

## 五、未完成任务（按依赖排序；每条都给"完成判据"）

### A. 审计仍成立的条目（可逆工程，不需要 owner 先裁）

1. **D02 默认 Illustrator 计划不能排队**（P1）
   `shell.ts:7072` `locked: host === 'illustrator'` → `packages/capabilities/reconstruction/adobe_lowering.py:118`
   拒绝 locked → `http_service.py:608` 折成 400 `INVALID_REQUEST`；Photoshop 能过只是 UI 给了 false。
   *判据*：两条宿主的默认计划都能真实入队（202 + 读回），并有跨层真实路由测试；不放宽 lowering 合同。
2. **D01 + D03 幂等**（P1）
   `shell.ts:7225`、`shell.ts:4730` 每次点击现生成 `uuid()`（`design.ts:55`），服务端按
   `sha256(project_id+':'+key)` 认身份（`native_submissions.py:29`、`image_assets.py:111`）→ 重试即第二个
   job/素材；而 `shell.ts:7157` 写"同键安全"、`shell.ts:4758` 写"失败项未写入"。
   *判据*：键在用户意图生命周期内持有；结果未知先查询/重放；两句文案与实际行为一致；有受控故障测试
   （丢响应→重试→服务端仍是一条）。
3. **D04 响应字段**：202 把任务嵌在 `task`（`task_queries.py:78`），UI 读顶层
   `task_id/job_id/state`（`shell.ts:7219/7227`）；`shell.ts:7192` 读 `asset.version_no` 而服务端不发
   → `vundefined`（同文件 4611 已有守卫，这条没有）。*判据*：共享响应类型 + 真实路由到 UI 的合同测试。
4. **D05/D06/D07/D08 前端发现性与过滤**：搜索只过滤 DOM 前 8 条（`shell.ts:5858/5918/5989`）且读
   `systems` 而后端发 `design_systems`（`design_layer.py:1129`）；`objectsLoaded` 成功前置 true 且无 catch
   （`5936-5941`）；`qualified !== null`（`2464`）+ 三个产物 tab 共用 `axisFilled`（`2468-2473`）；
   D08 见 4.2。*判据*：过滤后分页、字段名与合同一致、失败可重试且单独呈现、`qualified === true` 才算可调用、
   跳转携带领域条件。
5. **D09/D10 发行资源**：`runtime/paths.py:17` 的 `PROJECT_ROOT` 在装态解析到 `Lib/` →
   `assurance/research_store.py:73`、`rights_ledger.py:75` 读裸路径 → 安装版 GET 500；
   `pyproject.toml:28-35` force-include 不含这两份 schema、不含 `design-lab/domain-packs/**` 与
   `schemas/domain-pack.schema.json`（`domain_packs.py:44-45`）。正确机制旁边就有：
   `runtime/state_resources.py:41` 用 `files('design_lab').joinpath(...)`。
   *判据*：wheel 安装后 research/rights/domains 三族路由有测试且不再 500/MISSING；
   现在 `test_workbench_served_bundle.py:72` 在 INSTALLED_MODE 直接 skip，要改成必跑。
6. **T09 的真实一条链**（验收原话）：至少一条 实际输入→分析→目标包→纠正 路径；精准文字强约束要有真实
   路线；提示词不冒充原生工程。T16 排在 `DL-UI-U09` 之后（AAOS 版本知识/候选回执/离线边界，
   在途版本固定、撤销与新鲜度如实、不跨 DB、不双主、不默认全库迁移、替身不冒实联）。
7. 会话任务面板里未关的三项：`#13` object-plan 层喂给 `rir.layers`（store 已存在
   `native_submission_v1`，缺的是路由/前端接续）、`#14` R2 §6 草稿自动保存（**被裁定项 E 卡住**）、
   `#27` 第二十一批（代码已推，剩 CI 逐作业照抄）。

### B. 需要 owner 裁定，界面与闸都不替它猜（全文在
`docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` 的 owner 清单节）

- **A** R2 §2 二级导航的领域标签 4 处（平面设计 graphic/visual、UI 与交互 ui-ux/product-ui、
  字体与出版无包声明、游戏视觉唯一候选声明 v1 且 `domain=null` INVALID）。
- **B** R2 §3 令牌冲突：唯一真活在渲染里的是顶栏 `--uif-topbar:78px` vs 包里 64px；h1/h2 角色映射。
- **C** 26 处字面色值的 adjudication 字段。
- **D** 品牌主色 `#316CFF` 承载不下白色正文（对比度上限 4.45:1）。
- **E** §6 草稿自动保存要不要服务端持久化（需一条可变 draft 行，**绝不能挂 brief 修订**）。
- **F** U05 结构/文本节点的来源。
- **G** 干净 clone 上无法复现的真值闸债（四个实例：route payload contracts、`verify_current_execution`
  的 `[Errno 2]`、`verify_projection_freshness` 的 `deepseek_content_audit` 漂移、链摘要活账本）。
  四个候选处置已写在文档里（搬 242.71 MiB 字节进 Git / 加 `ARTIFACTS_ABSENT_IN_CLONE` 具名状态 /
  presence 改 SPILL-CENSUS 形状 / 活账本标 `mutable_state`）。**禁止**用调低判据、摘闸、
  让 `--check` 读磁盘缓存来变绿。
- **H** 13 份 rubric 加权求和（权重合计实测全为 100，轴数 5–7，阈值 82/80）vs 来源方法
  "各维度独立、不许平均 + 分档锚点"；轴数不一致是否统一。
- **I** 12 套启发式框架与既有六轴的关系（当引用词汇表还是第二评分体系）。
- **J** `aside#drawer` 触发器在 1920/960/1440 全部 `element is not visible`，≤840 显式
  `.top-actions{display:none}`；桌面是否应当可达（可达→补触发器+常设断言；不可达→组件与其 CSS 是
  移除候选，不自行删）。原因未定位，探针日志三份齐在
  `.project-local/task-artifacts/ui-first-20261009/b20-20261011/drawer-trigger-probe-{1920,960,1440}.log`
  （1920 那份先前只落在 `.project-local/tmp/`，本批补进被引用登记的目录）。
- 另外：真实宿主 E3（Photoshop/Illustrator/ComfyUI/MiniMax）需 owner 明确授权才动，只读探针除外；
  真人 E4 评审、三方视觉验收、merge 到 `main`、release 都不在本批范围。

---

## 六、复核命令（本机已验证的绑定，别重新摸索）

```bash
cd "D:\All projects\DESIGN-LAB"
# 聚合闸（CI 的 unified verify 只跑这个）
PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe design-lab/scripts/verify_design_lab.py
# 单个新闸 + 任务测试（.venv 无 pytest；unittest 约定）
PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe \
  design-lab/scripts/verify_selected_source_adaptation.py
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe -m unittest \
  design-lab.tests.test_selected_source_adaptation design-lab.tests.test_contract_bindings \
  design-lab.tests.test_service_http
# 浏览器五件套（no-skip；node 必须进 PATH，且是 scoop 的 binary 不是 shim）
export PATH="/d/All projects/OS External Configuration/10-toolchains/scoop/apps/nodejs-lts/24.18.0:$PATH"
E2E_REQUIRED=1 PYTHONDONTWRITEBYTECODE=1 PYTHONIOENCODING=utf-8 \
  .venv/Scripts/python.exe design-lab/scripts/verify_browser_e2e_ran.py
# 前端：改 shell.ts 后必须重建（vm/appshell 套件读的是已构建 bundle）
NODE="/d/All projects/OS External Configuration/10-toolchains/scoop/apps/nodejs-lts/24.18.0/node.exe"
( cd apps/workbench && "$NODE" node_modules/typescript/bin/tsc --noEmit \
  && "$NODE" node_modules/vite/bin/vite.js build \
  && for s in unit.mjs appshell.mjs shape-notice-coverage.mjs; do "$NODE" tests/$s; done )
# 账本/链/投影（顺序：先账本、后链、同批提交）
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe scripts/generate_current_reports.py
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe scripts/deepseek_authority_chain.py      # 写
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe scripts/deepseek_authority_chain.py --check
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe scripts/verify_current_execution.py
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe scripts/verify_authority_gates.py --zero-spill
PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe scripts/design_debt_baseline.py --check
```

## 七、本对话踩过的坑（照做省时间）

- `self.path` **含 query**；`readThemeChoice()` 优先读已应用 `<html>` 属性；屏上有两套 `.theme-toggle`
  （遗留那套不可见，Playwright 默认点隐藏那条 → 30s 超时）。
- 新闸不登记进 `verify_design_lab.SCRIPTS` 或不登记进 `verify_browser_e2e_ran.TEST_MODULES`
  就是永远没人测 / 永远 skip。
- 改 `packages/` 下任何文件会让 `inert_contract_survey.py` 的 `productFiles` 计数变化 → 按该闸自己的
  文档化路径**重跑生成器**（不加 `--check`）即复绿，并核对状态分布未变。
- 编辑活文档 `docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` 会让 17 条绑它的回执漂移
  （`CURRENT_REPORTS=FAIL current evidence artifact hash differs`）→ 用
  `.project-local/tmp/reseal_qa_batch19.py` 重封，**只有 `artifact_sha256` 可移动**。
- `Path.write_text()` 在 Windows 会写 CRLF，`git add` 提示"CRLF will be replaced by LF"是既有常态。
- 中文输出走控制台会 cp936 乱码：写文件再 Read；`grep | tail` 会吞退出码，用 `> log 2>&1` + 自记
  `NAME_EXIT=` 标记读结论，**不读 wrapper 的 exit 0**。
- `ast.parse` OK 不代表语义正确：一次 Edit 吃掉 `data = json.loads(...)` 前半截仍能过 AST 检查——看 diff 行本身。
- 工具缺陷不留在账上：本对话 recorder 把 cwd 与相对脚本路径配错写出假 FAIL 回执，处理是
  `git checkout -- design-lab/config/task-ledger-r3.json`（丢弃**自己刚写的**改动是这里的正确意图）、修调用、重封。
- 未测量没有统一哨兵：`tier` 是 `null`、`designQuality` 是 `{}`，判"未测量"要覆盖 `null/{}/[]/""`。
- 归档二进制没有文本标记，按内容归属会漏——`evidence/design-*.png` 要靠成员名归属（本对话错过一次并已在提交里更正）。

## 八、完成判据（每批都要走完）

改动 → 闸与测试复跑（含五份浏览器套件 `skipped=0`）→ `generate_current_reports.py` → 回执封存
（先账本后链，同批提交）→ 提交 → 推工作分支并核对双端 SHA → **读该 SHA 的 CI 日志逐作业照抄**
（含失败步骤名），不预测、不把本地结论写成 CI 结论 → 更新
`docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` 批次追记与 owner 清单 → 给出可审阅桌面实拍
（并说明每张绑的 bundle/样式摘要；本批若无 UI 字节变化，用摘要证明而不是重拍凑数）。

真人 E4、真实宿主 E3、手机端（FROZEN_DEFERRED）、merge 到 `main` 与 release 不在授权范围内。
