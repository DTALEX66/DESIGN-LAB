# 下一会话提示词（唯一入口）

> **本文件就地更新，不要再按日期新铸一份。**
> 2026-10-18 之前它按日期命名（`NEXT-AGENT-PROMPT-<日期>.md`），于是每轮都要铸新文件、搬一次指针，
> 旧副本合法地留在 `docs/current/` 里，`AGENTS.md` 再逐个罗列——那就是"旧路径反复出现"的机制。
> 现在只有一个文件名；改状态就改这一个文件，并同步下面两行。
> 历史条目在 `docs/history/next-agent-prompts/`，逐份登记于 `docs/history/next-agent-prompts/PROMPT-LINEAGE.json`。
> `verify_task_document_states.py` 的 `entry-not-dated-again` 会在有人重新铸日期副本时直接失败。

- **updatedAt**: 2026-10-20
- **writtenAtSha**: 自己读 `git rev-parse HEAD`（不要抄任何文档里的数字；本文件也不例外）

## 0. 这份文件是什么

不是 Authority，不是第二状态源。它只回答两件事：**现在真实状态是什么（怎么自己读）**，以及**下一刀该切哪里**。
任何与本文件冲突的事实，以 `/AUTHORITY.md`、`.project/governance/authority-index.json`、
唯一任务包和账本 `currentExecution` 为准。

## 1. 读的顺序（不可变）

1. `git rev-parse HEAD`、`git status --porcelain`、`gh pr list`、`gh run list --branch main --limit 1`
2. `/AUTHORITY.md`
3. `.project/governance/authority-index.json`
4. 根 `AGENTS.md`
5. 唯一当前包 `docs/taskpacks/DESIGN-LAB-DIRECTION-ALIGNMENT-2026-10-19.md`（`DL-TP-20261019-DIRECTION-R1`）
6. `design-lab/config/task-ledger-r3.json` 的 `currentExecution`
7. 本文件

历史只经 `authority-index` / crosswalk 进入；记忆、聊天摘要、旧交接**都不覆盖 Authority**。

## 2. 先核对，再动手

```bash
git rev-parse HEAD && git status --porcelain && git log --oneline -5
gh pr list
gh run list --branch main --limit 1
python scripts/verify_top_level_authority.py                 # 10 项，含 6 个 SHA 钉
python design-lab/scripts/verify_task_document_states.py     # 13 项
```

**别抄本文件的数字当事实。** 上一轮的红灯里有一次就是"文档说已同步、实际没有"。

## 3. 2026-10-19 的方向调整（本轮唯一的权威变化）

Owner 原话（逐字）：

> 其他任务冻结，以这份任务为当前权威与闭环目标（更新项目内的权威和规划），未来能力暂时冻结和延期延后

落仓结果：

- 正式定位：**面向职业视觉设计的 AI 原生、平台中立的专业视觉智能与可复用设计能力系统**。
  产品本体 = 视觉智能 + 审美能力工程化 + 设计能力库 + 设计软件自动化 + 受控知识回流。
- 六大能力域：Visual Intelligence / Aesthetic Analysis / Prompt Intelligence /
  Design Capability Library / Creative Tool Automation / Knowledge Candidate & Evaluation。
- 永久非目标：第二画布或通用编辑器；以全流程设计文件制作交付为产品本体；
  通用 Agent Runtime / 聊天客户端 / 模型网关 / 跨项目调度器；接管 WORK-LAB 通用治理；
  取代 AAOS 正式知识真源；把热门资源或模型输出直接认定为合格能力/可信知识；默认外传客户素材。
- `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md` 降为 `SUPERSEDED / LINEAGE`；
  `currentExecution` 的 **34 项父/子任务全部 `FROZEN_DEFERRED`**，不再派工；原字节、任务定义与证据保留。
- 本轮**只做**权威/规划对齐、冲突矩阵、能力映射、技术可行性矩阵、最小真实闭环规划与按范围测试；
  **不实施产品功能**。解冻任何未来能力都需要 owner 明确授权。
  （2026-10-20 更新：这条普遍禁止已被 owner 后续直接指令在**三段**上取消，见下文「当前授权面」。
  原句保留，因为它记录 2026-10-19 那一轮的效力范围。）

## 2.0 当前授权面（2026-10-20 定点解冻）

逐字原话与解释见 `docs/taskpacks/20261020-unfreeze/OWNER-DECISION-2026-10-20.md`；机器面读
`.project/governance/authority-index.json` 的 `unfreezeAdoption`。**只放行三段产品实施**：

1. **Prompt Intelligence 入口** —— 提示词生成与反推成为可调用面（服务 façade、CLI、HTTP 路由、工作台面板）。
   实施前的基线实测（2026-10-19）：`prompt` 在 `src/design_lab/http_service.py`、`src/design_lab/cli.py`、
   `apps/workbench/shell.ts` 三处 0 命中，只作为产品声明存在于边界合同与方向包。
   落地后按同一量法重新实测（2026-10-20，小写 `prompt` 子串出现次数）：`http_service.py` 8 处、`cli.py` 21 处、`apps/workbench/shell.ts` 41 处。承载模块是 `src/design_lab/prompt_intelligence.py`，入口为两条写路由（`POST …/prompts`、`POST …/assets/<id>/prompt-reversal`）、CLI `prompt generate|reverse` 与工作台 `#/prompts`。本句不再是缺口。
2. **`KnowledgeCandidate` 导出出口** —— 把 `export_payload` / `to_v1_projection`（`src/` 内原本零调用者）
   接到真实调用方，让"导出"成为可寻址动作；`outbound.transport` 仍是 `NOT_CONNECTED`，不得因为加了出口就宣称已发送。落地状态（2026-10-20）：调用方是 `KnowledgeReview.export_document`，入口为 `GET …/knowledge-candidates/<id>/export` 与 CLI `export-candidate`，信封自己写 `design-lab/assurance-knowledge-candidate-export-envelope/v1` 并有 schema 与 live 载荷用例绑定。界面侧同日补上第三级（2026-10-21，`#/records` 的知识面板）：每条候选一行一个 `读回导出文档（不发送）` 按钮，被合同挡住的那些行是禁用的且按钮自己说明原因，面板把信封版本、两份投影、编号回显（USER_SUPPLIED 与 EXPLICITLY_UNUSED 分开）、freshness 与 outbound 三事实原样上屏。按钮文字带"不发送"是有意的：只写「导出」会被读成已经交付。
3. **模型选择接口** —— 不锁死：菜单导航 + 接口，用户自行选择本地或云端模型。
   fail-closed 的**默认值**规则不变（`UNQUALIFIED_*` 默认 `defaultEnabled: false`；零 checksum、许可冲突、
   模型不存在、硬件不足时 resolver 仍拒绝）。用户的显式选择是被记录的用户动作，不改变合格状态、
   不把 `UNKNOWN` 写成合格、不宣称推理已验证；云端项必须写明哪些数据离开本机。

仍不做：release、安装态分发、真实宿主 E3、真人 E4、ComfyUI、MiniMax H3 验收；`currentExecution`
其余 34 项仍 `FROZEN_DEFERRED`（`scripts/verify_documented_counts.py` 实测，任何一项解冻都会让四处句子同时红）。
新落地的范围收口：**字体库与第三方素材的权利判定移出本项目范围**，不得再列为缺口或开工前提；
`source.job_id` / `operation_id` 改为界面可填写 + 可显式选择"不使用"，代理不得自行铸造标识冒充来源证据；
`DESIGN.md` 在 owner 真实测试前不进已批准状态，逐条配色归属与品牌蓝裁定**挂起不是阻塞**，不要再反复请示。业界规范入库这一步已落地一半（2026-10-21）：`packages/capabilities/standards/INDUSTRY_SPEC_REGISTER.md` 按「可吸收 / 只可引用 / 今日未能核验」三档登记 11 条外部规范的出处、版本与许可原话，取不到的字段一律留 UNKNOWN——WCAG 3.0 草案已在第二轮直接取到（页面原话「W3C Working Draft 10 September 2026」，许可为 W3C 文档使用规则；它是方向不是判据，本项目现行判据仍是 WCAG 2.2 AA）；PDF/UA-1 与 IEC 61966-2-1 两条仍取不到出版方页面（ISO 目录 403、pdfa.org 全站 403/404、IEC 那个编号实测返回 CISPR 25:2008），版次只有二手线索，登记件里原样标为未核验——下一位要重取，而不是补一个日期顶上。

本轮同步过的面（都已落盘）：`AUTHORITY.md`、authority index、`AGENTS.md`、
`docs/current/PRODUCT_DEFINITION.md`、`docs/architecture/BOUNDARY_CONTRACT.md`、`docs/current/ROADMAP.md`、
`design-lab/config/product-manifest.json`、`design-lab/config/task-document-states.json`、唯一账本状态、
`.project/manifest.yaml` 的 taskpack 指针、`R2_RELEASE_HASHES`、`AUTHORITY-PIN-CHANGE.json`、`reports/current/**`。

**没有**同步、也不得声称同步的：真实宿主调用、人工验收。（原句还列有"运行时代码、模型路由"——
2026-10-20 定点解冻后，上文「当前授权面」三段的运行时代码与模型选择接口**属于本轮实施范围**，
但"路由到已合格模型"仍然不得声称：合格判定只在真实取证后由 owner 验收。）「AAOS 接收」不再列入本项目同步范围：owner 2026-10-19 定调本项目独立全链路跑通，外部知识系统只通过版本化公共合同连接，其接收状态既不由本项目宣称，也不作为本项目的完成条件。

### 3.1 2026-10-19 归档与删除波（明面已经换了形状）

Owner 两条指令：旧的不许留在明面上；旧的都删除，但先审计、汇总成可追溯记录、并给出替代。已执行完：

- **移动**：228 个跟踪文件 `git mv` 进 `docs/history/archive-2026-10-19/**`（85 份按日期交接、19 个旧任务包、
  `docs/plans|research|superpowers`、UI-CONVERGENCE 证据包 93 件、4 份旧当前面记录、根级 WORK-LAB 交接），
  5 份 reports 交接摘要进 `reports/history/`。逐文件 `原路径→新路径→blob→字节` 在
  `docs/history/archive-2026-10-19/MANIFEST.json`，228/228 复验字节一致。
- **删除**：83 份（68 交接 + 5 按日期提示词 + 10 份 loose reports 交接），共 713,606 字节。
  删前先汇总：`AGGREGATED-RECORD-2026-10-19.md`（每份的标题/自述/结论/只有它记载的事实）+
  `HANDOFF-PROMPT-DIGEST.json`；恢复句柄在 `REMOVALS.json`（blob sha1/sha256/crc32/bytes/restoreAt），
  逐条 `git show <restoreAt>:<path>` 实测过才算登记。
- **明面现状**：`docs/` 不再有 `handoffs/`；`docs/taskpacks/` 只剩 4 个包体 + 2 个来源目录（14 个跟踪文件），
  因为 `authority-index` 与账本仍点名这四件，被钉字节不能改。
- **故意没删**：`handoffs/deepseek-r3-20260906/` 17 件（owner 随包提供的审计输入原件）、`PROMPT-LINEAGE.json`、
  按日期 bundle 目录里的成员。删这些是销毁输入或拆散 bundle，不是清理陈旧材料。
- **指针的替代**：指引面不再点名任何已删文件；需要原件内容时用 `scripts/archive_records.py:read_record(rel)`，
  它按 工作区 → 归档移动 → 删除清单 restoreAt 三层解析，并把来源回写进报告
  （`handoff_read_from: removed-at:<sha>`）。三层都不到即 `RecordUnavailable`，不放行。
- **逐条证据与读数**：`docs/audits/DESIGN-LAB-ARCHIVE-AND-REMOVAL-2026-10-19.md`（§0 结论 `PARTIAL`、命令 + 退出码、§6 六处与 §6.5 一处共七处缺陷、回滚方法）。
- **重钉**：本轮 AUTHORITY.md / authority-index.json / HISTORY-FREEZE-RULES.md 共重钉两次
  （归档改路径一次、删除改指针一次），每次都在 `AUTHORITY-PIN-CHANGE.json` 追加 revision。
- **登记位置**：这五份记录本身（移动清单、移除清单、汇总登记、可读汇总、交付报告）的路径、
  blob SHA-1、字节与 SHA-256 已写入 `docs/RECORD-ARCHIVE-INDEX.md` 的 2026-10-19 一节，
  哈希取自 `git cat-file blob HEAD:<路径>`；找资料先读那个索引，不要回聊天记录里抄。

## 4. 状态是分轴的，不能合成一个"完成"

能力状态至少区分：
`Discovered`、`Reviewed`、`Adapted`、`Installed`、`Loaded/Connected`、`Tested`、
`Qualified`、`Accepted`、`Knowledge Candidate`、`Ingested/Verified in AAOS`。

证据等级仍是 E0–E5：E0 声明 / E1 结构 / E2 受控运行 / E3 真实工作流 /
E4 独立人审 / E5 发布可复现。**文档修订 ≠ 规划完成 ≠ 代码实现 ≠ 真实运行 ≠ 人工验收 ≠ 外部知识系统接收。**最后一轴是对外部系统状态的读数（本项目只写候选、只读回执），不是本项目闭环的前提。

当前实测（重跑命令，别抄结论）：

| 事实 | 复算方式 | 读数 |
|---|---|---|
| 能力证据分布 | `design-lab/config/capability-evidence-current.json` 的 `capabilities` | 50 条：E1=13、E0=37 |
| Provider 证据 | `design-lab/config/provider-capabilities.json` | 全部 E0（未复验运行时） |
| 已批准模型 | `design-lab/config/model-manifest-trust.json#approved` | 空 |
| Adobe/Comfy/Penpot 适配器 | `src/design_lab/adapters/`、`src/design_lab/generators/`、`src/design_lab/interop/penpot.py` | 静态/合同层存在；无当前 SHA 的真实宿主 E3 |
| 历史 ComfyUI/H3 记录 | `docs/current/ROADMAP.md` 的 2026-08-16 `runtime-pass` | 历史记录，未在当前 HEAD 复验；H3/ComfyUI 已冻结 |
| 评测集 | `git ls-files evals; git ls-files design-lab/evals; git ls-files design-lab/evals/reconstruction` | 根 `evals/` **0**；`design-lab/evals/` **63**；其中 `reconstruction` **20**（6 例 golden corpus + 索引）；**无六域级基准** |
| Prompt Intelligence 运行时 | `git grep -l -iE 'class .*Prompt' -- 'src/design_lab/*.py'; git grep -l -iE 'def .*prompt' -- 'src/design_lab/*.py'` | 只命中 `generators/comfy_http.py` 的请求字段；**没有独立运行时模块**（两条口令原本写 `**/*.py`，会漏掉 26 个顶层文件；改成 `*.py` 后读数不变，仍是这个结论） |
| 真实 OCR | `git grep -l -i 'ocr' -- 'src/design_lab/*.py'; git grep -l -i 'tesseract' -- 'src/design_lab/*.py'` | `ocr` 命中 6 个文件（`analysis/decomposition.py`、`analysis/model_cache.py`、`asset_analysis.py`、`http_service.py`、`creative/generative/model_assets.py`、`readiness/model_radar.py`），`tesseract` 0 命中；**没有 OCR 引擎实现**——新增的两个命中是派生入口与路由在"要求操作者提供观测"时提到 OCR，不是引擎。注意本行旧版用 `'src/design_lab/**/*.py'`，该 pathspec 不含 26 个顶层文件，所以旧读数少两个 |
| 运行时规模（HEAD 口径） | `git ls-files src/design_lab \| grep -c '\.py$'` | 106 个 .py：顶层 26 / creative 21 / runtime 17 / assurance 12 / governance 7 / interop 6 / analysis 6 / adapters 4 / readiness 3 / generators 3 / reconstruction 1。本行旧版写作 103 且引用 `'src/design_lab/**/*.py'`——那个 pathspec 只给 80（它匹配不到 `src/design_lab/` 直属文件），数字与命令本来就不成对，现已换成能复现出口令的那一条 |
| 能力包 | `git ls-files packages/capabilities \| wc -l` | 178 个受跟踪文件；atoms 21 个目录 |

## 5. 六大能力域 → 现有实现映射（只用于映射，不新建账本）

六域是**能力视角**，不是新目录、不是新账本、不是新任务编号。实现落在既有模块与既有 W00–W17 工作分组上
（W 分组见 `docs/audits/DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/pack/02_EXECUTION_TASKS.md`）。

| 能力域 | 现有实现（模块/配置） | 现有证据 | 主要缺口 | 既有任务映射 |
|---|---|---|---|---|
| Visual Intelligence | `src/design_lab/analysis/`（decomposition / plan_to_rir / model_cache / model_manifest / capability_library）、`packages/capabilities/reconstruction/`（34 个受跟踪文件）、`design_layer.py` | E1 结构；`design-lab/evals/reconstruction/` 有 6 例 golden corpus；无六域级一致性与字段完整性实测 | 观察/推断/不确定性未分离到可验证输出；无六域基准集 | W04、W05、W13；T09、T10、T11；U04、U05 |
| Aesthetic Analysis | `qa_plane.py`、`quality_record/store`、`human_jury`、`jury_store`、`jury_review.py`、`design-tokens.json` | E1；Jury 记录层存在 | 无盲评一致性、维度区分度、反例覆盖；无 E4 | W06、W08、W09；T12；U06 |
| Prompt Intelligence | 仅 `generators/comfy_http.py` 的请求字段；无独立模块 | E0（结构引用） | 结构化提示词、图像反推、跨模型转换、人工可用性评审全部缺失 | W07、W16；T09、T10；U04 |
| Design Capability Library | `design-lab/config/capability-*.json`、`packages/capabilities/`（atoms 21 / bundles / plugins / quality / standards）、`verify_knowledge_lifecycle.py` | 50 条能力证据 E1=13 / E0=37；资格状态可追溯 | 去重/分类一致性、许可核验的批量实测；`tool-control` 等来源登记债 | W02、W13；T05、T06、T07；U03 |
| Creative Tool Automation | `adapters/photoshop_com.py`、`adapters/illustrator_com.py`、`adapters/spi.py`、`generators/comfy_*.py`、`interop/penpot.py` | E0/E1 为主；ComfyUI 2 条为 2026-08-16 历史 E3，未在当前树复验 | 分层选择、超时/取消、失败模式、恢复/回滚逐项声明与实测 | W07、W10、W16；T13、T14；U05、U06 |
| Knowledge Candidate & Evaluation | `assurance/`（rights / preflight / jury / quality）、`schemas/candidate-knowledge.schema.json`、`knowledge-role-classification.json`、`verify_knowledge_lifecycle.py` | E1；候选字段与生命周期闸存在 | 无 AAOS 接收回读；无真实验收主体/时间/理由 | W08、W17；T16、T18；U09 |

`design-lab/core/` 是**明文冻结的契约参考件**（`docs/architecture/DIRECTORY-AUTHORITY.md`， "must not gain new consumers"）。
不要因为"没人 import"就删它；要动它先改那份文档并给出 ADR。

## 6. 最小真实闭环：已规划，未执行

目标闭环（`docs/taskpacks/DESIGN-LAB-DIRECTION-ALIGNMENT-2026-10-19.md` §10）：

```
固定视觉输入（含 brief/参考图）
  → 分析：观察 / 推断 / 不确定性 分栏输出
  → 结构化提示词（含目标模型/工具与不确定性）
  → 一次合格工具调用或可验证输出（读回 + 失败/恢复记录）
  → 用户或授权 Agent 验收（署名、时间、理由）
  → 知识候选（来源/许可/版本/测试/哈希/撤回）
```

- 最小可执行切片（不需要外部服务）：固定 fixture + 本地确定性分析 + 提示词结构 + 差异/读回工件；
  产物必须能复算，失败与低置信必须显式标注。
- 工具调用段：官方 API/SDK → 原生插件 → MCP → 脚本/CLI → 受控 UI 自动化；
  **当前没有可用的、未冻结的真实宿主**（Adobe E3 / ComfyUI/H3 均需 owner 授权）。AAOS 不属于「宿主」：它是可选的外部知识系统合同对端，本项目不等待它。
- 人工验收段与研究接受段属于 owner 门；不得用 VLM 自评、截图或"AI 说通过"代替。
- 映射：输入/分析 = T09/T10/U04；目标包 = U05；工具调用 = T13（E3，owner-gated）；
  验收 = T12（E4，owner-gated）；知识候选 = T16/T18/U09。
- **五段链路的实测现状（2026-10-19 逐条查过，不是推断）**：
  1. 视觉输入 = 已实现且真跑：`src/design_lab/image_assets.py:21 inspect_image`、POST `/api/projects/{id}/assets`（`http_service.py:203`，2026-10-22 复测），字节入库并按 sha256 复核。
  2. 分析/提示词 = **桥在、调用方已有两个（2026-10-19 起）**：`analysis/decomposition.py:96 Plan.from_ocr` 与 `analysis/plan_to_rir.py:137`（内部调用 `reconstruction/contracts.validate_rir`）都有测试通过，生产入口现有两条——CLI `design-lab analyze`（`cli.py:242`/`cli.py:665`）与 `POST /api/projects/<id>/assets/<img-ID>/analysis`（`http_service.py:206`，2026-10-22 复测），都经 `src/design_lab/asset_analysis.py:AssetAnalysis.derive`。核验口令：`git grep -c AssetAnalysis -- 'src/design_lab/*.py'` → 三个文件各命中。**仍然缺的是合格的 OCR/分析后端**：观测必须由操作者提供，所以该路由在 workbench 调用闸门里登记为 `backend_only`，页面也不自动编排结构。**反向提示词仍然没有运行时模块**——注意旧版用 `grep 'analyz|prompt'` 作证据是假阴性仪器（代码里写的是 `analysis` 不是 `analyz`，而 CLI 的 `analyze` 动词确实命中），别再拿那条口令的 0 命中当"没有入口"。`design-lab/core/providers.py`（不在 `src/design_lab/core/`）只是 39 行能力词汇表。所以这一段既不能声称已实现，也不能靠新建面板冒充。
  3. 工具调用 = 静态合同 E1；本机唯一可离线真跑的是 vtracer（`providers/vtracer_provider.py:7` → 外部工具链 1.0.0-alpha.3，MIT，`commercialUse: ALLOWED`）；`design-action.schema.json` 在 `src/` 内**没有 emitter**，`integrations/hosts/ffmpeg/` 是空目录。
  4. 验收 = E2 有路由有 UI（`/jury/verdict`、`/jury/proposal`、`quality`/`rights` CLI），但 E4 真人判定按铁律不由代理填。
  5. 知识候选 = 存储与路由齐（`assurance/knowledge_feedback.py:202 build_candidate`、`knowledge_candidate` 表、create/review/revoke 三路由），**缺的是从验收判定到候选的发射器**；导出合同也已存在（`design-lab/schemas/assurance-knowledge-candidate-v2.schema.json` 的 `$defs.export`，第 178 行），**不要再新建一份 export schema**——那会让一个边界出现两个权威。
- **独立全链路的真实可跑面（2026-10-22 复测，路由清单以 `http_service.py:94` 的 `ROUTES` 为准，共 66 条 = 37 GET + 29 POST（2026-10-22 复测。账本 `contract-bindings.json` 是 68 行 = 39 GET + 28 POST + 1 `GET+POST`，因为 `/api/projects` 在 ROUTES 里是 GET 与 POST 两枚、在账本里是一行；所以读侧扫描的分母是 39、写侧是 29，两数不可互换。别抄这里的数字，自读表））**：
  能靠调用入口真跑通的链是 项目 → 简报 → 参考图入库 → 资产分析派生 RIR（CLI `analyze` + POST `…/assets/<img-ID>/analysis`，live HTTP 已测）→ 原生计划提交 → jury 判定 → rights 记录 → 打包 → **preflight**（POST `…/bundles/<id>/preflight`，2026-10-19 起有 live HTTP 测试；此前所有 preflight 测试都只在进程内调 `preflight_bundle`，路由的默认 profile 与返回形状从未被走过）→ 知识候选创建/审阅/撤回。
  **两个断点没有任何调用入口，不是"还没接"而是没有实现**：(1) Prompt Intelligence——`prompt` 在 `http_service.py`、`cli.py`、`apps/workbench/shell.ts` 三处 0 命中，也没有承载模块，它只作为产品主张出现在 BOUNDARY_CONTRACT 与任务包 §9；(2) 候选导出——`assurance/knowledge_feedback.py:458 export_payload` 与 `:521 to_v1_projection` 在整个 `src/` 内**零调用方**（除各自函数体内那行 `_document(candidate, "…")` 自指标签），出站 `outbound.transport` 在 `knowledge_review.py:337` 硬编码 `NOT_CONNECTED`，该模块第 11 行的注释本身就写明"本仓库没有 ArcheAxis transport"。所以导出段缺的不是接线，是一个真实出口。（本行是 2026-10-19 的诊断，两段已于 2026-10-20 落地，见上头两条的落地状态；照本行去"补第一个调用方"会重复劳动。）
  另两处口径要写清：`quality` 记录只有 CLI（`cli.py:99`），**没有路由**，所以它既不算 matched 也不算 backend_only；`/jury/proposal` 有路由但页面不调（BACKEND_ONLY，理由已登记）。
  **链上走查（2026-10-19 起有了第一条，2026-10-20 把提示词两段接进来，2026-10-22 把提示词结果落库与人工签署接进来）**：`design-lab/tests/test_standalone_chain_http.py` 用一个服务、一个项目，按上一跳真实返回的 id 依次走 **20 跳验收链**——project→asset→brief→direction→design-layer 读回→资产分析派生 reconstruction-ir/v1→目录读回 `GET /api/models`→模型选择 `POST …/model-selection/choose`→提示词组合（prompt-composition/v1，正文里必须出现前面那两跳写入的 brief 与 direction，`model.selected` 必须就是刚记录的那个修订）→提示词反推（prompt-reversal/v1，绑定 asset 那跳返回的 sha256）→**提示词结果读回 `GET …/prompt-results`（两份文档都必须在库里，且存下的 content_sha256 等于产生它那一跳发布的 document_sha256）**→**具名人工签署 `POST …/prompt-results/<id>/review`（签名引用的就是它判过的那份摘要）**→**jury 判定（对着 asset 那一跳返回的 version_id 与 sha256 直接落判，201）**→jury 读回→**rights 决策**→rights 读回（CLEARED）→知识候选（`evidence_sha256` 取自这次被签署的组合，编号一律字面量 `UNUSED`）→人工审阅→候选读回，实测 `project=201 asset=201 brief=201 direction=201 design-layer=200 analysis=201 catalog=200 model-choose=201 prompt-compose=201 prompt-reverse=201 prompt-results=200 prompt-accept=201 jury-verdict=201 jury-readback=200 rights=201 rights-readback=200 candidate=201 review=200 candidate-readback=200 export=200`；另有 **4 跳交付链** `project=201 native=READBACK bundle=201 preflight=200`。此前每个缝各自有测试但没人按顺序走过，"独立全链路"是从逐跳绿灯拼出来的主张；而 2026-10-21 的审计指出更实的一层：那 18 跳证明的是同一台服务器上多个接口能按顺序调用，**不是**同一份专业产物贯穿了分析、验收与留存——现在第 11、12 跳与第 17 跳的 `evidence_sha256` 把这条链钉成了一条身份链。写这条链时发现的两个链事实，都记在测试注释里：jury 的判定对象此前只能靠测试自己往数据库里 publish 版本，从未证明"导入的资产能长出一个可判的 version"；`native_tasks.execute` 只接受字面量 scope `project-native-test`（`native_tasks.py:94`），所以交付段是受控 E2 而不是真实宿主 E3。导出段的调用方已经接上（2026-10-20 同日第二批）：`export_payload`/`to_v1_projection` 在 `src/` 内的零调用者由 `KnowledgeReview.export_document` 终止，入口是 `GET …/knowledge-candidates/<id>/export` 与 CLI `export-candidate`，也正是这条链的第 20 跳（实测 `export=200`，且 `provenance.job_id` 回显 `UNUSED` / `EXPLICITLY_UNUSED`、`v1_projection.source_id` 为 `UNUSED:UNUSED`）；`test_design_layer_http.py:147` 那条 6 跳走查仍止于 design-layer。所以"独立全链路跑通"当前的准确说法是：**20 跳每一跳都有可调入口与 live 证据，含提示词两段的页面入口、结果落库与人工签署、以及导出出口**。仍然不在链上的是三件事，且都不是入口缺失：发送通道（`outbound.transport` 恒为 `NOT_CONNECTED`、`sent_count` 恒为 0，本项目没有 ArcheAxis 传输）、合格后端（`QUALIFIED_LOCAL=0`，owner 2026-10-21 裁定推理执行仍不接）、以及真人 E4 与真实宿主 E3。（2026-10-22 B3 桌面半：原先第四件"桌面端对 `…/prompt-results` 的调用"已经不再是缺口——`apps/workbench/shell.ts` 现在列出存下的结果并可具名签署，`design-lab/tests/e2e/browser_design_layer_e2e.mjs` 第 14 节在真实 Chromium 里走完"生成→读回列表→匿名签字被本地拒→署名后读回 ACCEPTED"，并把这几项事实写进 `browser-e2e-summary.json` 的 `promptLoop`，所以跳过这一节的运行不能被读成 PASS。两条路由随之从 `BACKEND_ONLY` 表里删除——留着会被 `STALE_BACKEND_ONLY` 判红，这正是这张表双向防陈旧的作用。）
- **两处曾经不是工程缺口、而是 owner 决定，现在一条已定、一条仍待裁**：(a) 验收记录里没有 `source.job_id`/`operation_id`，而 `build_candidate` 强制要求它们——owner 2026-10-20 定了做法：「编号问题留出可填写位置，用户自行填写或者选择用没用」。所以界面与接口提供可填写位置并允许显式选择"不使用"，代理仍不得凭空填 provenance。落地状态（2026-10-20）：写入合同已接受字面量 `UNUSED` 代表"显式不使用"（`knowledge_feedback.PROVENANCE_UNUSED`，v2 schema 两处 description 已记名），空白仍 400 且点名被拒字段——"没填"与"声明没有"是两件事；导出信封回读 `provenance.job_id_state ∈ {USER_SUPPLIED, EXPLICITLY_UNUSED}`，v1 投影 `source_id` 原样拼接不做美化。界面侧同日落地（2026-10-20，b0b8be55）：`#/knowledge` 的创建表单里两个编号各自先选「来处」——"我来填写"或"不使用（发送字面量 UNUSED）"，未选时本地就拒绝并说明是"没选"而不是"没有"；选"不使用"只禁用填写框、不清空内容，框里还有字时报自己的冲突而不是静默丢掉；`apps/workbench/tests/appshell.mjs` ㉒ 逐条走过这三态并断言外发体里 `source.operation_id === "UNUSED"` 而同表单填写中的 `job_id` 原样带走——字面量上线，不是界面装饰。合同侧与界面侧现在都不再阻塞。(b) 本机没有合格模型：`readiness/model-radar.json` 14 条里 `QUALIFIED_LOCAL=0` 且全部 `default_enabled: false`，`reconstruction-models.json` 指向的模型根目录不存在，omniparser `commercialUse: DENIED`；磁盘上确有 Qwen2.5-VL-7B GGUF（含 mmproj）但它不在雷达里。要不要把它列为合格本地模型，是许可与资格裁定，不是我能替你定的。界面侧已改读 `GET /api/models`（`src/design_lab/model_catalog.py`）：它把雷达 14 条与 provider-capabilities 9 条端点**并列**给出、`join.key` 保持 null 并写明两边无共同字段，计数全部实测（`qualified_local=0`、`weights_recorded=0`、`default_enabled_true=0`），`selection.transport` 仍是 `NOT_CONNECTED`——所以"可选"不等于"已合格"，也不等于"能发送"。选择也已被记录（2026-10-20 同日第二批）：`model_selection` 表按项目追加修订、触发器拒绝 UPDATE/DELETE，`GET /api/projects/<id>/model-selection` 回读三态 `CHOSEN / DECLINED / NEVER_ASKED`（DECLINED 是操作者显式「不用」，NEVER_ASKED 是没人被问过，两者不得合并），`POST …/model-selection/choose` 写一次选择；快照字段由服务从它校验过的目录行复制，所以命名一个模型带不进任何资格，`MODEL_NOT_IN_CATALOGUE` 拒绝登记外的名字；提示词文档原样带出 `model.selected` 与 `selection_state`，而 `model.executed` 在两份 schema 里都是 const false。三份信封级合同同日补上 schema 并各带一条live 载荷用例（`design-lab/schemas/model-catalog-v1.schema.json`、`model-selection-readback-v1.schema.json`、`assurance-knowledge-candidate-export-envelope-v1.schema.json`，用例在 `design-lab/scripts/verify_route_payload_contracts.py`，账本三行随之从 SCHEMA_LESS 翻成 BOUND_SCHEMA）；未付的版本债由 7 条回到 5 条，剩的是 Adobe 两个 job-spec 与 rights/research/native-runtime 三份读回。（2026-10-22 更新：那三份读回已付——rights/research/native-runtime 各有自己的 schema 与 live 载荷用例，`VERIFY_CONTRACT_BINDINGS` 读数由 `routes=66 bound=26 schema_less=40` 变为 `bound=29 schema_less=37`，`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=13`；未付的只剩 Adobe 两个 job-spec，它们的形状是 adapter 构造的作业文档而不是本服务写的 envelope，付它要在 `photoshop_com.py` / `illustrator_com.py` 的边界上装载 schema，不是再补一份没人读的 schema 文件。）2026-10-22（B2b）：这两条也付了，且按那句要求付——三份契约文件在 `design-lab/schemas/reconstruction/`（adobe-patch-job / photoshop-patch-job / photoshop-native-job），两个 adapter 各自持有一张 `JOB_CONTRACTS` 版本表，`execute()` 在第一次 COM 调用前按 body 里的版本装载并校验，取不到文件或不认识版本都是预检拒绝；手检一条没删。`VERIFY_CONTRACT_BINDINGS` 实测 `routes=68 dispatched=68 bound=33 schema_less=35`，带版本号的未付债清单实测为空（`test_contract_bindings.py` 里那条从"两条 Adobe"改为"空集"，并写明空集才是这里真正的牙齿：新的带版本 SCHEMA_LESS 行照样红）。`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=14 failures=0`。
- **链的桌面可达性，一句话（2026-10-22 直接读 `design-lab/scripts/verify_workbench_route_calls.py` 的 `BACKEND_ONLY` 表得出，不是估计）**：20 跳验收链里 **19 跳在 workbench 有真实调用点**，只剩一跳登记为 `backend_only`：①"资产分析派生 RIR"——本机无合格 OCR/分析后端（`readiness/model-radar.json` 报 `QUALIFIED_LOCAL=0`、全部 `default_enabled:false`），操作者路径是 CLI `design-lab analyze`。原先的 ②`GET …/prompt-results` 与 ③`POST …/prompt-results/<id>/review` 两条豁免已随 B3 桌面面板落地删除（留着会被 `STALE_BACKEND_ONLY` 判红：前端确实开始调用了；同日实测 `VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=109 routes=66 matched=55 backend_only=11 dynamic=3 special=1`）。这张表是**双向防陈旧**的：路由消失却仍登记会红，前端已经开始调用却仍登记也会红，所以这句总结会跟着表一起失效，不会悄悄过期。owner 待决里"要不要把磁盘上的 Qwen2.5-VL-7B GGUF 列为合格本地模型"正是第①跳能否进页面的前置——缺的是资格裁定，不是代码。
- **精选来源阶梯的第一条 CONSUMED 是量出来的，不是登记出来的（2026-10-22 B5）**：`packages/capabilities/selected-sources.json` 由 `registered_only=8 mapped=2 consumed=0` 变为 `mapped=1 consumed=1`，升上去的是 `SRC-T07-MOTION-COMPOSITED`（`packages/capabilities/standards/MOTION_ACCESSIBILITY.md`）。证据是 `design-lab/tests/e2e/audit_workbench_motion.mjs`：真实 Chromium 逐条点击导航（21 项 → 21 个 location → 22 次扫描），读 CSSOM 与 computed style，实测 9614 条规则、88 个 `@keyframes`、154 个关键帧步进、8995 个元素，布局属性动效 0 条；同一把扫描器必须先判出植入缺陷的 3 条，零才算证据。它刻意不判的也交了出来：`transition: all` 132 处、非布局的其他动画属性 110 处——判据原文只禁布局属性，闸门不自造更严的标准。**这条不是判据变更**：E2 是受控运行时测量，`capabilityState` 仍是 `structural-pass`，宿主 E3 与真人 E4 依旧冻结。它进了 `verify_browser_e2e_ran.py` 的 `TEST_MODULES`，所以在 required 作业里跳过即红；一条 CONSUMED 的判据若靠"没人看"活着，就等于没有。
- **已作废的三条调查结论**（写在这里防止下一会话照它们动手）："export 没有 schema 文件" 与 "plan_to_rir 缺失" 都是错的；前者见上（且 2026-10-20 起信封自己也写了 `design-lab/assurance-knowledge-candidate-export-envelope/v1`，不再只靠正文里的 `status` 认身份），后者是缺调用方而非缺实现。第三条现在也过期了："`plan_to_rir` 无生产调用方" 自 2026-10-19 起不成立（CLI `analyze` + `POST …/assets/<id>/analysis` 两条入口，见 §上一项 2），照旧话去"补第一个调用方"会重复劳动。缺的那一半是**合格后端**，不是调用方。
- 下一轮若获授权，先交付"可审阅的读回面板 + 真实数据源 + 可复现测试"，
  把没建的那一半写在可见文字里，不要把 PLANNED 标成 IMPLEMENTED。
  **2026-10-22 之后的实际剩余面（B2–B5 已全部落地并 CI_VERIFIED @ `f4b727e1`，见审计件 §5.18–§5.21）**：
  ①带版本号的未付契约债清单实测为空（余下 32 条 SCHEMA_LESS 都是"信封自己不带 schemaVersion"的选择，不是欠账）；
  **后端 A/B/D 已落地（审计件 §5.23 与 §5.24）**：`GET /api/projects` 现回 `design-lab/project-list/v1`，
  逐项目给 14 个表面的计数、最晚时间戳与"还没人签"的两个数，合同把 **null=该表面在此检出从未建表**
  与 **0=表在而此项目没有记录** 绑成双向不可互换；能力库的 `counts.qualified` 拆成
  `qualificationVerdicts / qualifiedTrue / qualifiedFalse / qualificationNotAdjudicated`
  （旧字段"读起来像合格数、算的是有判定数"，今天同为 0，将来会分岔）；三条任务读回合成一份
  `design-lab/task-readback/v1`（`surface` 判别 + `limit=100` 与 `truncated`/`next_cursor` 同源 +
  状态词汇读自 `design-lab/config/state-vocabularies.json` + `does_not_say` 点名取消语义），台账那两行
  "recorded debt"随之付掉并更正了两处过期理由。实测读数：
  `VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68 bound=36 schema_less=32`、
  `VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=17`。D07/D08 经复核**不是缺口**：候选每行已带
  `export_ready/export_blocked_by`，任务记录已带 `cancel.requested` 与 `cancel.acknowledged` 两个布尔——
  两者都有真实写入路径（`job_store.acknowledge_cancel` 在 `CANCEL_REQUESTED` 上置 1 并转 `RECONCILING`，
  `native_tasks._failed` 的派发前被拒路径也置 1），语义是**适配层已确认、仍需读回**，不是宿主已停手；
  界面可显示"已确认取消，仍需读回"，不得画成会自己变绿的进度。（此处上一版写的"没有通往 true 的宿主
  事件"是没打开那两个函数就下的结论，已在 §5.23 原样更正。）
  **A 批欠下的两条 CI 红已在 §5.24 记账并修掉**，其中一条是安装态才会踩的：`PROJECT_ROOT` 是
  `Path(__file__).parents[3]`，在 wheel 里指向解释器的 `Lib`，于是 `/api/projects` 打不开自己的合同、
  启动器回 `status: ERROR`。改走 `repo_resource()` 并给 `pyproject` 补三行 `force-include`，另加一个
  从磁盘枚举 `repo_resource('…')` 字面量的闸门（`design-lab/tests/test_packaged_contract_resources.py`，
  含一条"删掉声明必须判红"的手检）。接入侧要读的字段清单：列表页
  `{schemaVersion, surface:'list', limit, truncated, next_cursor, count, stateVocabulary, tasks, does_not_say}`，
  详情页同信封但 `surface:'task'` 且 `truncated` 恒 false、`next_cursor` 恒 null，事件页 `surface:'events'`
  且**游标是 `event_no` 整数**——`apps/workbench/contracts.ts` 现在把 `next_cursor` 写成 `string | null`，
  对事件页不精确，接入时随信封一起改正（本批不动界面）。
  **本批状态：CI_VERIFIED_EXACT_SHA @ `91186bc7`**（分支与 main 同指此枚；11 个重作业全绿，
  `PYTHON_TESTS_UNION=OK expected=3167 distinct=3167 ran=3167 missing=0 unexpected=0`，
  安装态作业 `Ran 3 tests` 且步骤三条 grep 全过——§5.23 欠的两条红就是在这一枚上转正的）。
  **上一轮点名的"装机面债"已在同日第二十二批（后端 E）付清，别再照旧话重做**（审计件 §5.25）：
  度量换了地方——静态用 AST 从 `http_service.py` 走 import 闭包列出 `PROJECT_ROOT` 拼出来的仓库读取（18 条里 17 条没有 force-include 声明），
  动态把 `design-lab/tests/test_standalone_chain_http.py` 改成能 honour `DL_LAUNCH_INSTALLED=1` 并在 `setUp`
  先验布局（包路径含 `site-packages`、`/api/health` 的 `bundleOrigin=packaged`），在装好的 wheel 上跑整条链。
  **静态单独不够**：`production_preflight.py` / `delivery_bom.py` / `evidence_readback.py` 把同一个根拼成
  `Path(__file__).parents[3]`，清单看不见，是安装态实跑抓出来的——`GET …/design-layer` `500 INTERNAL`、
  `POST …/tasks/<job>/bundle` **`409 NATIVE_BUNDLE_UNVERIFIED`（缺文件伪装成语义判决，最坏的一种）**、
  `POST …/bundles/<id>/preflight` `503 PROJECT_STORE_UNAVAILABLE`（矛头指向用户的数据库）。
  现在 20 处读取改走 `repo_resource()` 并补 20 行 force-include，装机链 **4 条用例全绿**，
  `CHAIN_HOPS … export=200` 与 `DELIVERY_HOPS project=201 native=READBACK bundle=201 preflight=200`；
  装机 GET 面（能用一个真实项目 id 构造的 23 条）2xx 由 14 升到 **17**，`/api/models`、
  `…/prompt-results`、`…/design-layer` 三条拒绝全部转正。植入检查做过：移走
  `resources/repo/design-lab/production/profiles` 后立刻 `FileNotFoundError: packaged repository resource
  missing: production/profiles`，拒绝发生在导入时而不是悄悄回落。
  **CI 里已有永久的一步**：clean-wheel 作业新增 "Walk the acceptance chain against the installed package"，
  断言 `Ran [1-9][0-9]* tests`（不钉死用例数）、`^OK`、无 `skipped`、`CHAIN_HOPS` 与 `DELIVERY_HOPS` 都打印。
  **后端 E 状态：CI_VERIFIED_EXACT_SHA @ `f804af9f`**（main 与备份分支同指此枚；11 个重作业全绿，
  `PYTHON_TESTS_UNION=OK expected=3169 distinct=3169 ran=3169 missing=0 unexpected=0`，新加的装机链步骤
  在该枚为 `success`；打包修正单枚 `2102ba8b` 也独立跑过一遍全绿）。
  审计工具也在库里了：`design-lab/scripts/audit_repo_root_reads.py` 从 `http_service.py` 走 AST import 闭包，
  报告路由可达的仓库根读取及其打包声明状态，`--control` 会从 git 取修复前字节证明检测器还看得见病
  （它曾因为只认 `ast.Call` 而对 `parents[3]` 的 `ast.Subscript` 形式报过假的 "0 remaining"）。
  `design-lab/tests/test_packaged_contract_resources.py` 把这份报告变成闸门，并**把"空群体"本身判红**。
  它的两条盲区写在工具头部注释里，别把它们当已解决：先把根存进变量的两步拼法不追；不同打包前缀的
  合法 packaged-first 读法会被报成 NOT-SHIPPED（现在只有 Adobe 桥那一条，宿主派发仍冻结）。
  **本机那条未结的读数已经结清**（原本记在这里，现由后端 F 修完，见下条与 §5.26）：
  `test_capability_library_clean_install` 两条安装态用例在本机绑定跑里稳定
  `[WinError 206] 文件名或扩展名太长`（解包 wheel 到 `.project-local/task-runtime/python-tests-shard-1/…`
  的深路径，377 个成员里 8 条超 259 字符且探针一条都不读），Linux CI 三次全绿。
  更正一句旧话：`/api/evidence-projection` 在安装包里回 `503 EVIDENCE_LEDGER_ABSENT`，detail 是
  `design-lab/config/task-ledger-r3.json is not in this checkout`，判决仍然正确，但它命名的那个"检出"
  其实是解释器目录 `…/Lib`——上一轮写的"临时根没有台账"说错了对象。
  **上一轮那两条"没测/未修"，同日第二十三批（后端 F）都结清了**（审计件 §5.26）：
  ① 分母先更正——账本是 **39 条** GET 行，不是前两轮写的 37 条（我当时的 `startswith('/api/')` 过滤把
  `/workbench` 与 `workbench.ROUTES` 悄悄滤掉了）。现在 `test_standalone_chain_http` 里新增
  `test_every_ledger_get_route_is_answered_in_this_layout`：用写入路由造出真实资产/简报/方向，再经
  `_deliver_to_preflight()`（从交付腿抽出来共用）拿 job/bundle/version id，把每一行的槽位换成真值调用。
  读数：源码 `routes=39 reads=39 answered=35 verdicts=4` 无未点名 5xx；装机 `reads=38 answered=34
  verdicts=4`，唯一被点名的 5xx 是 `/api/evidence-projection → 503 EVIDENCE_LEDGER_ABSENT`
  （安装态没有可投影的治理检出；同一条在源码检出回 200，两侧名单互换即红，所以这不是豁免是差别）。
  仍未读的 3 条各带原因：`…/native-assets/<id>/verify` 需要先登记的原生资产；候选 export 由同一布局的
  验收链走到 `export=200`；`workbench.ROUTES` 不是 URL。覆盖表**双向**断言，新路由没人写读法就红；
  CI 装机步额外要求日志出现 `GET_SWEEP layout=installed`。
  ② 本机那两条 `[WinError 206]` 修好了：逐成员解包 + 对跳过集合下断言（只许 domain-pack 基准页被跳，
  能力库四个输入不许跳），判据用成员名而非 errno（同一超长路径在 `makedirs` 报 206、在 `open` 报
  `[Errno 2]`，按码过滤会悄悄再坏一次），并加了一条不对称用例证明这条豁免两侧都有效。在 runner 自己的
  深临时根下该模块 `Ran 5 tests / OK / errors=0 skipped=0`。**后端 F 状态：IMPL_LOCAL + TESTED_LOCAL
  @ `74a461f4`**，CI 逐作业读数见 §5.26 末。
  **后端 F 复核后：CI_VERIFIED_EXACT_SHA @ `11e30625`**（main 与备份分支同指此枚；11 个重作业全绿，
  `PYTHON_TESTS_UNION=OK expected=3171 distinct=3171 ran=3171 missing=0 unexpected=0`；CI 装机步骤日志原文
  `GET_SWEEP layout=installed routes=39 reads=38 answered=34 verdicts=4 unmeasured=3`，该步骤要求这行必须出现，
  所以用例被重构成空转时作业不能照绿）。本机绑定重跑 `scripts/run_python_tests_all.py --shards 3 --jobs 1`
  三分片全 `exit=0`（`shard=1/3 outcomes={'PASS': 1104,'SKIP': 2}`），此前稳定复现的两条本机 ERROR 消失——
  这条只能在 Windows 上量，Linux CI 给不了这个证据。
  **写侧的同一把尺子已于同日第二十四批（后端 G）量完**（审计件 §5.27）：`design-lab/tests/`
  `test_installed_write_surface.py` 把账本 **29 条 POST 行**（含 `GET+POST` 那条创建行）登记成一张按对象依赖顺序排的覆盖表，
  其中 **28 行**逐行真写、每行都用 GET 读回，剩下 1 行按政策点名不走，覆盖表双向断言、槽位缺值即红、5xx 名单按布局分开且必须与实际发生
  完全相等。读数两侧一字不差：源码 `rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`，
  装好的 wheel 同样如此——本批没有新增"三件套"要付，这是 §5.25 付清读路径之后写侧第一次被真走到时
  给出的确认，不是侥幸。唯一不走的行是 `POST …/tasks/<job>/run`：体只有一个 `attempt_id` 而扫描手里就有，
  但 `native_workers.start()` 会 spawn 子进程派发真实宿主，冻结与"不触发真实宿主/模型执行"都在，所以按
  `FROZEN-BY-POLICY` 点名登记，不冒充"构造不出合法体"。**播种把一处误判顶了出来**：把 wheel 里的
  `config/state-vocabularies.json` 移走后 `POST …/tasks/<job>/bundle` 回 **400 INVALID_REQUEST**——
  `TaskReadbackError` 继承 `ValueError`，写侧那几条顺手建同一份信封的路由没像读侧两条那样就地包，于是
  "服务器读不出合同文件"被发成"你的请求不合法"。已按 dispatch 家规在通用 `ValueError` 子句前补一条
  具名子句（`8b83652d`），并加一条不对称用例：删掉该子句必红、恢复必绿，四步实跑已记；批次 D 给两条读路由就地加的那层包装与它产出逐字节相同的拒绝体，已删——一个字节面不留两个主人。两侧读数与 wheel 字节在删包装后重测：源码与装机同值，wheel 1,073,608 字节。**后端 G 状态：IMPL_LOCAL + TESTED_LOCAL @ `3f542016`，复核后 CI_VERIFIED_EXACT_SHA @ `fa0cf178`**（main 与备份分支同指此枚；11 个重作业全绿，CI 装机步日志原文 `POST_SWEEP layout=installed rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`，该步骤要求这行与 `POST_SWEEP_WRITTEN`/`POST_SWEEP_EXCLUDED` 都出现且"未点名 5xx"不出现；`PYTHON_TESTS_UNION=OK expected=3177 …missing=0 unexpected=0`，本机三片 exit=0 零 ERROR——但一处中间红要点名：`1ff547bb` 那枚的 Python 作业红在 `test_documented_counts`，因为我重写了计数闸门的**逐字锚句**，而 `verify_design_lab --check` 那 76 项不含这条闸门也不含单元测试；改过受治散文后必须单独跑它，细节与两处修正见 §5.27 末）。级别仍是 E2——这张表量的是"这台装好的服务写不写得进、
  读不读得回"，不是产物好不好。CI 装机步现同时要求 `GET_SWEEP layout=installed` 与 `POST_SWEEP
  layout=installed`（外加 `POST_SWEEP_WRITTEN`/`POST_SWEEP_EXCLUDED` 两行与"没有未点名 5xx"）。
  顺带更正本件里三处没人看守的散文行号：`http_service.py` 的 `ROUTES` 现为 **94** 行（原写 93），
  POST `/assets` 路由现为 **203**（原写 191），POST `…/assets/<img>/analysis` 现为 **206**（原写 195）。
  三处都不是本批改行号改坏的（本批插入在 470 行之后），是更早批次留下的、且**没有任何闸门会读它们**——
  与 §5.25 那次被 `EMITTER_POINTER_NOT_THE_VERSION` 当场抓住的账本指针同一形状，只是散文坏了不会响。
  **同日第二十五批（后端 H）把读侧最后一条"没调用"结清了**（审计件 §5.28）：批次 F 那句
  "`…/native-assets/<id>/verify` 需要先登记的原生资产"是**错的**——交付腿自己就登记了一行
  `{"id": "native-<64hex>", "kind": "psd", "verification": "METADATA_ONLY"}`，`GET …/native-assets`
  当场答出来，只是当时没人去读。现在那条 UNCONSTRUCTED 已换成真调用，扫描分母随之移动：
  源码 `reads=39 answered=35 unmeasured=3` → `reads=40 answered=36 unmeasured=2`，
  装机 `reads=38 answered=34 unmeasured=3` → `reads=39 answered=35 unmeasured=2`；仍有 **2 条**没被这条扫描读到，且都不是洞而是判决：候选 export（同一布局的验收链已走到
  `export=200`，本扫描不重复建候选）与 `workbench.ROUTES`（那行账本记的是模块表名，不是 URL）。
  **这条路由量的是字节**，且已用播种证明不是标签：列表行的 `verification` 是 `METADATA_ONLY`，
  verify 行自己重算摘要后答 `HASH_VERIFIED`；把账本记下的那个 `native.psd` 改成**等长**的字节
  （只查大小也过得去）判决必须变成 `409 NATIVE_ARTIFACT_UNVERIFIED`，改回来必须回到 `HASH_VERIFIED`，
  形状合法但从未登记过的 id 必须 `404 NATIVE_ASSET_NOT_FOUND`；再把 `native_assets.py` 里那行摘要比较
  改成永假，这条用例必须红——实测四步：带比较 OK、去掉比较红、恢复 OK、恢复后再 OK，
  所以这不是"看着像有牙齿"的断言。两侧都跑：源码 6 OK，装好的 wheel 里
  `NATIVE_VERIFY layout=installed clean=HASH_VERIFIED tampered=NATIVE_ARTIFACT_UNVERIFIED
  unknown=NATIVE_ASSET_NOT_FOUND`，写侧扫描读数一字未动。CI 的装机步现同时要求这行整串出现。
  本批未新增打包面债务：这条路由读的是项目自己的资产库字节，不读仓库合同文件，两侧同值即是证据。本节的两个读侧分母（39 条 GET 行、仍有 2 条没被读到）也已交 `scripts/verify_documented_counts.py` 现数（claims 13 → 15，两条各自播种皆红、照实写 PASS），所以它们不能悄悄变陈旧。**后端 H 状态：IMPL_LOCAL + TESTED_LOCAL @ `4454531b`，复核后 CI_VERIFIED_EXACT_SHA @ `51c14f10`（main 与备份分支同指此枚，run `39865099663` = completed success、12 作业无非绿；其代码前枚 `d9976d0c` 同枚全绿，11 个重作业全绿，CI 装机步同一条日志里给全 `GET_SWEEP`/`NATIVE_VERIFY`/`POST_SWEEP` 三行且要求整串出现，`PYTHON_TESTS_UNION=OK expected=3178 …missing=0 unexpected=0`；本机把三个模块放进取数器自己的深 TEMP 重跑 `Ran 17 tests / OK / exit=0`、零 `WinError 206`——本机整轮 union 未跑完就被中止，所以"全套通过"这条只按 CI 那枚报，不冒充本机证据。细节见 §5.28 末）。
  口径也补清：66 是 `ROUTES` 条目数（`/api/projects` 在那里是 GET 与 POST 两枚），账本 68 行 =
  39 GET + 28 POST + 1 `GET+POST`，所以读侧分母 39、写侧分母 29，两个数不可互换。
  ②规范登记件的第三轮取证已于同日跑完（见审计件 §5.22）：Apple 与 Fluent 各补到一条服务端可读的面，
  但**这一轮推翻的是本件自己上一轮的读数**——`.../tutorials/data/design/human-interface-guidelines.json`
  本轮直连 **200**（给 `schemaVersion 0.3.0` 与版权年，仍无编辑日期），而上一轮登记为"全族 404"；
  两轮读数都留着，不删旧、不粉饰。仍未结的是两条 C 档：**PDF/UA-1 版次**（ISO/PDF Association 403、NEN 503、
  Beuth→DIN 404、EAN/TBS 与 Wayback 连接失败、BSI 404，只有第三方索引捕获到 Edition 2 / 2014-12 / 17 页，
  按捕获登记不升级为已核验）与 **IEC 61966-2-1 出版记录**（`/publication/2960` 实测是 IEC 60695-4 防火测试，
  编号不可猜；检索与预览面 404/连接失败）。这些是重跑取数，不是判据变更，也不需 owner 批准；
  带版次的符合性断言在取证到位前仍不得写。
  ③真正卡住的只剩 owner 面：合格后端（`QUALIFIED_LOCAL=0`，磁盘上那条 Qwen2.5-VL-7B 是否列为合格是许可裁定）、
  `DESIGN.md` 批准与配色归属（挂起，非前提）、以及 E3/E4/E5 与 34 项 `FROZEN_DEFERRED`。
  代理不得替 owner 填任何一项，也不得把②以外的剩余面当缺口重复派工。

## 7. 只能由 owner 决定的（不要猜，也不要替他填）

- **E3 真实宿主**、**E4 独立人审**、**E5 发布/安装态分发**：均未执行，需明确授权。
- **手机端**：**已从范围移除**（owner 2026-10-19：「再说一遍 不做手机端 只做桌面端」→「授权给你 去掉手机端」）。AUTHORITY.md / AGENTS.md / PRODUCT_DEFINITION / authority-index 的现行条款都已把它从「冻结待排」改为「排除」：不派工、不开路由、不加组件、不做验收、不记为能力缺口或未交付项；恢复需 owner 新的明确授权。机器面留一处说明：账本 `currentExecution.mobile` 由 schema 以 `const: FROZEN_DEFERRED` 钉住、并被 `design-lab/tests/test_current_execution.py` 断言，改这个词属于 schema+测试+UI 状态词的合同变更，不在本次授权内；该值本身的含义就是「手机工作零派工」。桌面端响应式/自适应是交付质量的一部分，不等于手机端，其既有闸门保持不动。
- **解冻 34 项 `FROZEN_DEFERRED` 任务**：需要新的 owner 明确授权；不得自行恢复派工。owner 2026-10-20 放行的是**三段产品实施**（提示词入口、导出出口、模型选择接口），不是账本任务解冻——`currentExecution` 34 项一项未动，`scripts/verify_documented_counts.py` 实测并在四处句子同时看守。
- **已从范围移出，不要再当缺口登记**：字体库与第三方素材的权利判定（owner 2026-10-20：「三方素材和字库不在本项目范围内」）。保留的只是既有数据边界：不默认上传客户素材、不持有用户素材库、E 盘受保护。`DESIGN.md` 的批准、字面配色的逐条归属（存量以 `scripts/design_debt_baseline.py --check` 与
`design-lab/config/ui-off-palette-colours.json` 实测为准，本文件不复述数字）、品牌 `#316CFF` 能否承载白字——owner 原话「我现在看不见」，属**挂起项而非开工前提**，不要为它们反复请示；本轮按「设计规范按照网上最专业的先收入库里」把业界规范作为参考素材入库，落地验收由 owner 自行测试。
- **"保留标准通用的接入接口"具体保留到哪一层（2026-10-19 逐层实测，别把"有合同"读成"能接入"）**：
  官方 API/SDK 层有代码（`adapters/photoshop_com.py`、`adapters/illustrator_com.py`、`adapters/spi.py`、`interop/penpot.py`、`generators/comfy_*.py`），等级以 E0/E1 为主，ComfyUI 的 E2/E3 证据是 2026-08 的、未在当前树复验；
  原生插件层有注册表与清单（`integrations/adapter-registry.json` 30 条、`integrations/hosts|generators/*/adapter.manifest.json`），闸门 `ADAPTER_REGISTRY=PASS`、`ADAPTER_MATRIX=PASS matrix=9`、`ADAPTER_LOCATOR_AUDIT=PASS`；
  脚本/CLI 层有 24 个子命令（`src/design_lab/cli.py` 的 `add_parser` 实数）；
  **MCP 层只有合同没有服务**——`schemas/contracts/design-control-mcp.schema.json` 与 contract-bindings 那一行在，但 `docs/audits/INERT-CONTRACT-SURVEY-2026-10-08.md` 记它 `state=NO_STATE_COUNTERPART`、`route_references=[]`、`table_readers=[]`、`table_writers=[]`；
  **受控 UI 自动化层在 `src/` 内没有任何模块**（`ui_automation|controlled.ui|accessibility tree|屏幕坐标` 全 0 命中），它只作为策略分层出现在本文件 §上一行。
  所以：owner 要的"标准通用接入接口"在**合同与注册表层是保留的**，MCP 与受控 UI 自动化两层是**已声明未实现**；把后两层做出来属产品实施，在 `currentExecution` 冻结之内，需 owner 授权才动。
- **ComfyUI/H3、外部服务、跨仓库写入、数据外发、E 盘访问**：全部冻结/需授权。**AAOS 不在此列**——owner 2026-10-19：「AAOS 不要管，保留标准通用的接入接口等，本项目按照独立能运行的能全链路跑通的项目」。保留 `schemas/candidate-knowledge.schema.json`、`knowledge-role-classification.json`、`verify_knowledge_lifecycle.py` 这些版本化合同与出口，但不得再把 AAOS 联调当作本项目的前置条件或完成判据。
- **D09 GitHub 必需检查**：需另外授权；先加稳定、绑定实际 SHA 的汇总检查，验证"required + 条件 skip"
  确实会失败，再设为必需。

## 8. 每批的强制序列（按 owner 的效率约束：只跑最小定向闸）

```
改动 → 只复跑相关闸与测试（不跑全量套件，除非 owner 显式授权）
      → 动过账本/被钉文件/索引时：deepseek_authority_chain.py + generate_current_reports.py
      → 动过 Record 导入清单绑定的跟踪文件时：declare_record_evolution.py <路径> --why "…"
      → 提交 → 推工作分支 + 快进 main → 读该 SHA 的 CI 逐作业照抄 → 才允许说"完成"
```

**Record 那一步不是可选项**：清单里有 479 行按 CRC/大小绑定仓库内的跟踪文件（含 `docs/LOCAL_ENVIRONMENT.md`、
`docs/architecture/BOUNDARY_CONTRACT.md` 这类看着像"随便改改"的文档），改一个就红三条
`test_record_import_fidelity`。改前先 `python scripts/record_import_verify.py --head` 看这一行动没动；
红了用 `declare_record_evolution.py` 走登记机制，别改断言。2026-10-19 这一轮就两次踩它：
先是 `BOUNDARY_CONTRACT.md`，后是 `LOCAL_ENVIRONMENT.md`——两次都不是内容缺陷，是清单没跟上。

**本地结论永远不是 CI 结论。** 读 CI 时按作业读，不要只看总结论。
上一轮 owner 明确要求：不要无限跑各类全量测试和大型闸门；需要显式授权时先申请。

## 9. 工具事实（省得再踩）

- **本机 `.venv` 里没有 pytest，但装得上**：
  `uv run --python .venv/Scripts/python.exe --with pytest --no-sync -m pytest <files> -q`。
  这条取代早前"本机没有 pytest，只能用 unittest"的记录（2026-10-19 实测：单文件与 21 项子集都能跑）。
  跑整个 `design-lab/tests` 目录时 capture 阶段会在某个关掉 stdout 的用例上崩掉
  （`ValueError: I/O operation on closed file`，此时 `no tests ran`）——那是本地工装缺陷，不是产品红；
  要么只跑定向子集，要么交给 CI。
- **`Path.write_text` 在 Windows 会把 `\n` 写成 `\r\n`**。本轮补丁脚本因此把三个 `binary` 属性的钉死文件
  （AUTHORITY.md、authority-index.json、HISTORY-FREEZE-RULES.md）和 `cr-at-eol` 子树里的登记表悄悄改成 CRLF，
  而钉死文件不做行尾归一，改动直接进 blob——哈希还跟着更新了，所以门全绿也没发现。
  改这类文件必须 `read_bytes` / `write_bytes` 并按原像形状回落；改完用
  `git diff --numstat` 看行数是否与预期一致，再核 blob 与原像的行尾。
- **新入库的 `scripts/verify_*.py` 本身就是 CI 面改动**：`design-lab/tests/test_gate_reachability.py` 的
  `test_every_orphaned_gate_is_exempted_with_a_reason` 会把「没有任何 workflow、也没有任何测试点名」的
  校验脚本判为孤儿闸并失败——本轮就因此让 `66fdade1` 的 Python 作业变红：
  `STRUCTURE_CONTRACTS=FAIL tests=31 failures=1`，offender 就是刚加的登记校验器。
  合同给的两条正当出口只有：接进 `.github/workflows/canonical-verify.yml`（本轮接在 
  `top-authority-gate` 第 5 步），或按既有豁免面写明理由。所以加闸时必须同一次跑 
  `python scripts/run_structure_contracts.py`（31 项）再谈提交——它不在我原先认定的『小闸门』集合里，
  本地因此一点征兆都没有。改 workflow 后还要 YAML 解析复核与 `named steps` 重名检查。
- **指引面点名已删文件会双门齐红**：`verify_path_refs` 与 `verify_task_document_states` 的
  `guidance-paths-resolve` 都把 `AUTHORITY.md` 里的 `docs/...` 当指令。写"某文件已删除"时不要留它的路径字面量，
  留汇总面/恢复清单的路径。
- **系统 Python 缺 `jsonschema`**；报告生成器必须用 `.venv/Scripts/python.exe scripts/generate_current_reports.py`。
- **账本身份字段仍钉在 `DL-TP-20261009-UI-FIRST-R1`**（这是设计：定义/证据字节不动，只有状态冻结）。
  因此 `.project/manifest.yaml#taskpack` 指向新包时，`deepseek_authority_chain.py` 会稳定产出**恰好 1 条**
  drift finding（`recorded=DL-TP-20261019-DIRECTION-R1`、`current_authority=DL-TP-20261009-UI-FIRST-R1`）。
  `--check` 通过；不要为了让这条 finding 消失去改写账本身份字段。
- **新包是 SHA 钉住的**。改它必须走 `docs/history/taskpacks/20261009-adoption/AUTHORITY-PIN-CHANGE.json` 流程：
  追加 revision + 改 `scripts/verify_top_level_authority.py` 的哈希，不要只改文件。
- `guidance-paths-resolve`：`AGENTS.md` / `README.md` / `AUTHORITY.md` / 本文件里出现的每个 `docs/...`
  路径必须是**受跟踪文件**。新文档先 `git add` 再跑闸。交接/审计可以引用死路径（那是记录），指引不可以。
- `entry-not-dated-again`：不许存在 `NEXT-AGENT-PROMPT-<日期>.md`；入口就地改。
- **登记哈希要算 blob，不要算工作树**：本机 `core.autocrlf=true`，同一份 `docs/history/**` 文件
  在提交对象里是 LF、检出后是 CRLF，`sha256sum <文件>` 与 `git cat-file blob HEAD:<路径> | sha256sum`
  必然不同（2026-10-19 实测 `MANIFEST.json` 85,966 B → 87,833 B）。登记件要写清哈希取自提交对象，
  **并写明测于哪个提交**；提交不能含自己的哈希，所以「首次读自」和「重算于」两个读数都要留下。
- **跑测试期间不要在同一工作树上 commit**：本轮 pytest 子集跑到一半时我提交了一个 docs 改动，
  `test_projection_freshness` 立刻 `findings=2 FAIL`；工作树静止后单跑同一条 43.8s PASS，
  `verify_projection_freshness.py` 直跑 `OK findings=0`。中途改树的运行不是判定，别照着它改产品。
- **`git ls-remote --tags` 的字段提取会吃掉 SHA**：`sed 's|.*refs/tags/||'` 连前面的 SHA 一起删，
  比对本地/远端 tag 时会 12/12 全报 MISMATCH。用 `sed 's|\trefs/tags/| |'` 后按 `$2 $1` 输出，
  再 `diff`（本轮这样核过：12 个 tag 名与对象 id 全部一致）。
- **不要在测试文件的注释里写脚本文件名**：`test_gate_reachability` 把"测试模块里出现的脚本名"当作调用点，
  一句注释就能把豁免的手动闸变成"可达"，触发 `no_exemption_has_gone_stale`。用角色称呼。
- **新增/删除 `apps/workbench/` 下文件会让 `verify_inert_contract_survey` 红**（`productFiles` 计数）。
  按该脚本自己的文档：先不带 `--check` 重跑刷新投影，再 `--check`；不要手改 JSON。
- **U09/T16 的在途改动已提交，工作树干净**：`apps/workbench/shell.ts`、`http_service.py`、
  `state_resources.py`、知识候选运行时与 schema/state、测试与构建产物已在 2026-10-19 的
  U09 批次上传（用 `git log` 自读 SHA，不要抄文档），CI 在该 SHA 上全绿。
  **落代码 ≠ 解冻任务**：`currentExecution` 的 34 项仍是 `FROZEN_DEFERRED`；知识候选没有 AAOS
  接收回执，E3/E4 未执行。若工作树再出现未提交改动，仍按保护规则处理。
- 本机沙箱跑不了全量 Python 套件：safe-delete shim 会中途 `SystemExit`，另有 Windows 造不出锁的用例。
  本机聚合闸基线**不是 0**；差别只在 CI 上消除。
- `gh run view <id> --log` 有时返回空；用
  `gh api repos/<owner>/<repo>/actions/jobs/<job_id>/logs --allow-escape-sequences`，
  但日志会被截断，**不要指望它给出失败测试名**——该用本地复现。
- 改工作流先用 `actionlint` 校验；**PyYAML 通过不代表 GitHub 会接受**（重复映射键 PyYAML 静默取最后一个）。

- **桌面端验收宽度是 2048 CSS px，不是 2560**：本机实测 `Screen.Bounds` 2048×1152、`WorkingArea` 2048×1104、`AppliedDPI` 120（2560×1440 面板 125% 缩放）。浏览器拿到的盒子就是 2048 宽，2560 是面板物理宽、用户看不到那个盒子。UI 审计闸门因此扫 `1280,1920,2048`（`audit_workbench_ui.mjs` 的 `HEIGHT` 表配 `2048→1152`），13 个 scope × 3 档 = 39 次量测，本机一趟约 9 秒。高度维度见下面那条（先写错过、后重量过的那一条）。
- **跨轮像素回归没有解释力，除非先冻结 fixture**（本轮实跑证实，不是推定）：23 张 1440 截图与改动前基线比对，品牌块 0 px、导航带每张 48–52 px（其中 4 行 2 px 正是页脚发丝线下移 12 px 的预期变化，其余是导航点同一几何下的亚像素边缘差）、内容带 26 万像素集中在带活数据的屏（`21-records` 一张就 10.6 万，看下去是播种项目名 `Closeout 179…` 与多出一条真实 `RECEIPTED` 作业，版式没动）。两个仪器教训：整页 `getbbox()` 在活数据页上毫无用处（一个十六进制字符就能把框拉到最右），必须按布局带计数；以及**基线没有被覆盖**——按规矩只有 owner 认可实现结果后才能重制。
- **推 `main` 的取消规则是半条，别按半条办事**：`cancel-in-progress` 的条件写作 `github.event_name == 'pull_request'`，所以**正在跑**的 main run 不会被后一次 push 打断（实测 `37bee232` 在跑时推了 `0c0a50c3`，两个各自跑完、各自 11 个真作业 success）；但**还在排队**的那条会——`9a3a3f37` 一个字作业都没跑就被 `2087509d` 顶掉了（`CONC=cancelled jobs=0`）。所以：不必为"怕取消"压批次，但也别以为每个 tip 都会各自出判定——只有队尾那个会。读到 `cancelled` 就当"被取代"，不要当证据。
- **`GET /api/projects/<id>/design-layer` 里没有资产实体**（本轮把链路测试的断言从"子串出现"改成"作为身份字段的值出现"时量出来的）：投影只有 `briefs / directions / chosen_direction / bindings / active_binding / design_systems` 六个键，资产仅通过 `design_layer.briefs[i].reference_asset_ids[j]` 被引用。所以桌面端要显示"这个资产的分析/判定"，要么从简报的引用列表拿 id 再单独读，要么走资产自己的路由——别以为聚合读回里能直接找到资产对象。
- **写进文档的数字现在有闸门了**：`scripts/verify_documented_counts.py` 把契约与提示词里逐条写出的计数对回代码——当前 11 条读数（2026-10-22 实测）：`DESIGN.md` 的"导航 21 项"、CLI 子命令 24、适配器注册表 30、HTTP 路由 66、20 跳验收链、4 跳交付链，剩下五处是同一条账本事实在 `NEXT-AGENT-PROMPT.md`（"34 项父/子任务全部"）、`AUTHORITY.md`、`AGENTS.md`、`docs/current/PRODUCT_DEFINITION.md` 与 20261020 owner 决定件里的逐字复述。测量只读代码、句子只被比对，两边不互相喂数据；任何提取式匹配不到就 `SystemExit`，不会退化成"读到 0 所以没有差异"。它经 `design-lab/tests/test_documented_counts.py` 进 CI（不用改工作流），并且自带播种反证：把 DESIGN.md 那个 21 改成 20，闸门立刻红。今天那两处过期数字（源码注释里的 15、契约里的"11 项 / 587px / ≤720 才溢出"）都是靠人眼撞出来的，这条闸门的作用是让下一处自己红——本句自己就红过两次：一次是 2026-10-21 它写"当前 4 条"并列出 19/16/58 三个对不上代码的数字（闸门看不见，因为那三个数不在它的模板里，是人眼撞出来的）；一次是 2026-10-22 加了两跳之后。**同一批还修了这条闸门自己的一个缺陷**：它在"报告哪句过期"时把模板当正则用，`**{n} 跳验收链**` 以 `**` 开头就是非法模式，于是一次普通的散文过期变成 traceback 而不是 finding；现在先 `re.escape` 再替换占位符，过期必须说得出名字。
- **`generate_current_reports.py --check` 的三种词要分清**：`STALE` 退出 0（绑定输入没动、HEAD 前移了，正常）；`DRIFT` 退出 1（**被绑定的输入本身老化**——跟踪的源码/文档/测试改了都算，必须重生成并重钉）；`PASS` 才是当前字节自洽。本轮 `DRIFT` 出现过两次，两次都是我自己刚提交了绑定输入，不是闸门在找事。

- **溢出闸门的高度维度：这一条我先前写错过，现在的版本是重量过的**。把高度做成可覆盖（`OV_HEIGHT` / `OV_SHORT_HEIGHT`，默认仍是 900/620，CI 不变）之后，在宽度 1440 上按名义高 1100 / 900 / 750 各跑一趟：`navEdge overflow` = **299 / 499 / 649**，`gap` 三趟都是 **12**，而被切的元素在 1100 与 900 是 `nav-group` 分组标签、**到 750 变成 `button` 导航项**。所以列表溢出量**随视口高变化**（`.nav` 的 `clientHeight` 跟着窗口长高）；我上一版写的"clientHeight 由 CSS 定死、几何与高度无关"是错的，错因是把 620 那一趟的 `hiddenPx=779` 当成两趟的共同读数——而当时我只覆盖了名义高度，短档根本没变，两次当然同值。真正与高度无关的只有**发丝线与切割线的间距**（固定 token 边距，620/750/900/1100 四档实测恒为 12）。结论不变但理由换了：CI 不加 1100 档，因为 1100 与 900 切到同一个元素、判同一条不变量，属重复；750 会切到另一个元素，说明现有 900+620 两档也不是摆设。

- **两个闸门里的 "routes" 不是同一个东西，别去"对齐"它们**：`verify_contract_bindings` 报 `routes=64`，数的是 `design-lab/config/contract-bindings.json` 的 route 行（每行带 handler/kind/marker/method/reason/route）；`verify_workbench_route_calls` 报 `routes=64`，数的是 `http_service.ROUTES` 的路由模式。本轮实跑过一条自以为是"对账"的口令：拿 `row['route']` 去比 `pattern`，结果是"60 条声明全部命中服务、同时 58 条服务里 57 条未被声明"——两个结论互不相容，说明字段映射本身就是错的，不是数据有缺口。**这条口令不要再用**；真要查某个路由有没有登记，得先读那个 JSON 自己的 schema 与闸门的读法。
- **本轮在 tip 上重跑过的只读闸门（一次成批，供下一轮对照基线）**：`AUTHORITY_GATES=PASS gates=7`、`VERIFY_CONTRACT_BINDINGS=PASS schemas=32 routes=60 dispatched=60 bound=21 schema_less=39`、`VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=96 routes=58 matched=47 backend_only=11`、`STRUCTURE_CONTRACTS=PASS tests=31`、`DOCUMENTED_COUNTS=PASS claims=4`、`KNOWLEDGE_LIFECYCLE=PASS findings=0`。

- **2048×1152 这一档已经人工看过，而且我在那里看错过一次**：采集工装补了 `2048:1152` 档（原来会走 `w*0.62` 的兜底，量出一个谁都没有的画幅），重采 23 张后逐张看仪表盘与能力目录。能力目录在宽屏下看着像"表头与单元格逐列错位"（`MIT` 落在 许可 表头左边、`UNRESOLVED` 徽标落在 修订 表头右边）。读构造即被否证：那一屏是**单个 `<table>`**（表头清单是 `apps/workbench/shell.ts` 里的 `TABLE_COLUMNS`，起于 2563 行；每格都是 `el('td', …)`），列宽由整列共享，结构上不可能逐行错位——看到的是目测像素的误差，加上 auto 布局把富余宽度全给最宽列造成的空档。所以 **2048 档没有缺陷**（同档的系统性检查已由 ui_audit 判 13 scope `violations=0`）。教训写下来：宽屏截图里"列不对齐"这种判断，先回去读它是 `table` 还是 `grid`，不要拿肉眼估的 x 坐标下断言。

- **桌面 jury 面板的判定对象有测试了**：面板不自己找版本，它把 `GET /api/projects/<id>/jury` 返回的 `reviewable_versions` 直接灌进版本下拉（`apps/workbench/shell.ts` 的 `juryVerdictForm(projectId, data.reviewable_versions ?? [], reload)`），再对着读回来的 `subject_ref` 提交判定。新增 `test_the_jury_readback_offers_an_imported_asset_version_as_a_verdict_target` 证明：真导入一张图之后，读侧会给出 `version:<该版本>` 且 `artifact_sha256` 等于导入返回的摘要——此前只证明过"拿导入响应里的 version_id 能 POST 判定"，那不等于界面能列出它。

- **无障碍复核（本轮，桌面端）**：能测的都测了——**没有发现可修的缺陷，但补了一条原来没人看的断言**。自动化看不见的部分逐项核过：`outline:none` **0** 处、`:focus-visible` 规则 **10** 条、`prefers-reduced-motion` 在 CSS 与 shell 各有处理（1 / 3 处）、toast 自带 `role="status"`（`apps/workbench/shell.ts:5794`）、状态词按合同在标签自身带 `lang="en"`（7085 行写明为什么不再套一层 `en()`）、表单侧 `<label>` **72** 处对 `aria-label` **44** 处。**新增**：溢出闸门现在逐屏量渲染出的标题序列并断言不得跨级跳（23 条路由读数里 **0** 处跳级；落地路由 `workbench` 的 h1 在 `#route-view` 之外，作为具名例外而不是静默放过），并有一条播种反证证明三条分支都会红——axe 每屏仍拒评 9–71 个节点，标题顺序本来没有任何东西在看。**仍属人工**：真实读屏软件下的措辞与键盘-only 主路径本轮没做，也没假装做过。

- **工具类与组件类的层叠冲突现在有闸门**：`scripts/verify_utility_class_conflicts.py`。来历是同一批里两次静默回归，形状完全一样——把重复内联样式收成 `.spaced-top` / `.grid-stack` 之后，组件类（`.quick-launch{margin-top:0}`、`.row-card{display:flex;gap:12px}`，都定义在工具类之后）按源码顺序开始获胜，元素被挪位；而**四道浏览器闸门全程绿**（它们量溢出/边界/对比度/控件尺寸，不量卡片间距）。正确修法是把意图写成复合选择器（`.row-card.grid-stack{...}`，特异性 0-2-0，与文件顺序无关），不是把工具类挪到文件末尾。闸门读样式表 + `shell.ts` 里字面 `class:` 集合：工具类与同一元素上的组件类共享属性即红，除非有复合规则显式解决；当前 20 个受保护站点干净，测试里删掉那条复合规则必须回红。**给样式做"等价重构"之前先看这条**，也别再把"浏览器闸门绿"当成布局未变的证据。

- **层叠冲突现在有两道闸门，各自都被播种证明会红**：静态的 `scripts/verify_utility_class_conflicts.py` 与浏览器里的 `test_workbench_overflow_gate._assert_utility_geometry`。**两道各有覆盖范围，别拿一道当两道用**：把 `.quick-launch{margin-top:0}` 种回去，静态闸门立刻红（`FAIL shell.ts:877 class="panel quick-launch spaced-top" ...`），而浏览器闸门**没红**——那张卡在测试 fixture 下根本没渲染（`seen: {'spaced-top': 9}`，shell 里有 14 处）；把 `.three-col{margin-top:0}` 种回去，浏览器闸门就红了，报 `.spaced-top expected margin-top:16px but computed 0px alongside .three-col`（在 `1280:dashboard`）。所以：**对这一类 bug，不依赖 fixture 数据的静态闸门才是主承重**，浏览器那道只覆盖渲染出来的站点（每次跑会打 `NOTE ... not rendered under this fixture: [...]` 把盲区说出来，而不是静默通过）。

## 10. 什么算完成

- 改动有**可复核的读数**（命令 + 输出），不是"应该没问题"。
- 闸与测试在**同一份字节**上通过；CI 上按作业读到 success。
- 没建的、没验证的，写在可见文字里（面板、提交信息、验收报告、本文件），不留在暗示里。
- 状态分轴写清：文档 / 规划 / 代码 / 真实运行 / 人工验收 / 外部知识系统接收，各自独立（最后一轴本项目只写候选、只读回执，不据其判定本项目是否闭环）。
- 回退路径写明（按批 revert / 按文件 revert），冻结件与账本历史不被改写。

> 上一轮三次 CI 红，全部是**闸对了、人错了**：债务被结清却说没结、登记行被删但钉子没动、
> 一句注释冒充调用点。下次红的时候，先假设闸是对的。
>
> 2026-10-18 补：**审计也会错，而且错法有规律**——用 grep 计数代替权威文档、用"没人引用"
> 代替"明文冻结"。所以"完成"还要求：**结论的来源写清楚**（命令 / 权威文档哪一节 / 闸的哪一条），
> 让下一轮能复算，而不是只能选择相信。
