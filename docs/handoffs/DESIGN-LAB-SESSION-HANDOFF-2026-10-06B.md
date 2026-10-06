# DESIGN-LAB 交接提示词 · 2026-10-06（会话收尾）

> 给下一个会话（本机 / 云端 / 另一个 agent）。**先读实仓，再动手。**
> 本文件不是权威源，`/AUTHORITY.md` 才是；本文件只负责"现在在哪、接下来做什么、哪些不能自决"。
> 所有 SHA 均为本会话实测读回，不是记忆或摘要。

---

## 0. 铁律（不可绕过）

1. 权威链：`/AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`）→ `.project/governance/authority-index.json`
   → `AGENTS.md` → 当前 TaskPack → **唯一任务账本** `design-lab/config/task-ledger-r3.json`
   → live main / PR / exact-SHA CI → `reports/current/**`。
   记忆、会话摘要、旧 TaskPack、旧报告、分支名、commit 数**一律不作权威**。
2. 不得新建第二账本 / 第二运行时 / 第二前端 / 第二知识库。
3. 不得 force push、不得删证据、不得未授权 merge / release / 删分支。
4. `SourceRecord.reviewedBy` / `reviewedAt`、Jury 人工字段**永远不得由 agent 填写**。
5. **新门必须先证伪再用**（注入违规 → 看到变红 → 才可用于判定）。
6. 哈希/计数必须来自管线与源记录，不得手抄。
7. 声称任何结论前，先写明**观测到的确切 SHA**。
8. 读**回执**而不是包装状态：`head/tail` 会吞掉退出码，后台任务的 exit 0 不代表内部命令成功。

---

## 1. 现在在哪（实测）

> 本节数字是**写作时刻**的读数。本文档自身通过 PR #223 进入 main，那次合并就把 main 往前推了一格
> （`d35bfc81` → `3f2842c5`）。所以**不要引用下面的 SHA 作为当前值**，按 §6 第一步自己读回。
> 这不是疏漏，是这类"落仓即过期"文档的固有性质（与投影 `fresh=false` 同源）。

- `main` 本地 = 远端 = **`d35bfc814bb1c5d583447c8bc4d4f572adff782a`**（写作时），工作树干净（0 项）。
- 分支只剩 `main`；worktree 只剩主检出 `D:/All projects/DESIGN-LAB`。
- 恢复标签：`preserve/codex-github-delivery-docs-20260929` → `daa7af46`（内容已证实过时，见 §3.6）。
- 账本：28 任务（14 P0 / 14 P1），**四轴全部 PARTIAL**，27 项 `PENDING_EVIDENCE_REVIEW`。
- 投影：`Ran 1807 tests — OK (skipped=39)` 已在 `28667300` 实测；投影本身会因后续合并重新变旧（见 §3.1）。

### 本会话落进 main 的 7 个 PR（每个合并前 9 项 required contexts 在 exact head 逐项 PASS；`strict=true`）

| PR | 内容 | head |
|---|---|---|
| #216 | 全局能力采集：979 上游观测、980 条 taxonomy、665 份 LICENSE 读原文带 sha256、181 份 API 推断已标注 | `73426936` |
| #217 | `research/candidates/README.md` visual-quality 计数 **25 → 30**（三源对账：表 30 行 = vendor cache 30 目录逐名一致 = taxonomy 30 键） | `d5a9fa4d` |
| #218 | Workbench 溢出/截断实测修复 + **D-5 闸门进 CI** | `eb29f56e` |
| #219 | 投影从"脏 worktree 快照 `3d3ff3e7`、`origin_main` 记成 `1acbfa15`"重绑到真实提交；**零状态抬升** | `c5c47af9` |
| #220 | **界面五修**（V-1…V-5）+ 审计文档 §九 + 两处自我更正 | `a69fb7b6` |
| #221 | `tool-control` 回源覆盖边界（979 不含它） | `befa8edf` |
| #222 | `div→ul/li` 改造**已尝试并回滚**的评估结论 + T1 套件观测入仓 | `dc00d2b0` |

---

## 2. 已完成且已验证的两件大事（细节看落仓文档）

### 2.1 D-5：视觉闸门进入 required CI（owner 裁决「现在接，并先证伪」）

- 落点：`design-lab/tests/test_workbench_overflow_gate.py` + `verify_browser_e2e_ran.py` 改为遍历
  `TEST_MODULES`（任一模块 skip 即红）。
- **`canonical-verify.yml` 与 `test_workbench_design_layer_e2e.py` 刻意未改** —— 二者被 SHA-256
  钉在 `task-ledger-r3.json` 与 `current-report-index.json`。加闸门走"未钉住的脚本 + 新模块"路径。
- 三层证据：① 本地合成根证伪 pre-fix `clipped=5 stray=8 tiny=70`/exit 1，post-fix `0/0/0`/exit 0；
  ② CI 实跑 `BROWSER_E2E[test_workbench_overflow_gate] ran=1 skipped=0 failed=0`；
  ③ 闸门报告 `workbench-overflow-gate.json` 已在 CI 上传的 E2 artifact 内（36 组，`clipped=0 stray=0 tiny=0 scrollOk=22`）。

### 2.2 界面：第一次真正读图（owner「界面呢」）

审计文档 §七 原话是"审计者未对截图做视觉判读（当前模型不读图）"——**该限制对后续模型不成立**。
headless 抓 8 页 × 390/1280/1440 = 24 张逐张判读，发现几何闸门**原理上测不到**的 5 类缺陷并全部修掉：

| | 屏幕上的样子 | 根因 |
|---|---|---|
| V-1 | `项目服务端项目台账读回`、`服务版本服务自检读回` 病句 | `.kpi small` inline + `.kpi .trend` inline-flex 共用一个行盒 |
| V-2 | `0.1.0-alpha.0` 断成 `0.1.0-alpha.`+`0`；`OK` 像变好的指标 | 非计数值也套 35px 大数字 |
| V-3 | `NOT_EXECUTED · 迁移 NOT_EXECUTED` | 插值只给后半截加了标签 |
| V-4 | Windows 显示 `⌘K` | 硬编码 macOS 符号 |
| V-5 | 设置页 ~450px 宽 + 右侧 ~950px 死白 | 单元素套 `.three-col` |

---

## 3. 未完成任务（按优先级；含"为什么没做"）

### 3.1 P0 · 投影再刷新（机械，5 分钟）
`#220/#221/#222` 合并后绑定又变旧。命令（**必须用项目 `.venv`**）：

```bash
cd "D:/All projects/DESIGN-LAB"
.venv/Scripts/python.exe scripts/generate_current_reports.py          # 写
.venv/Scripts/python.exe scripts/generate_current_reports.py --check  # 只读校验
.venv/Scripts/python.exe design-lab/scripts/verify_task_ledger_contract.py
```
注意：`fresh=false` 是**结构性**的（`generatedAt` 与 git 观测在被绑定内容里，投影无法描述包含它自己的提交）。
真要根治是改设计（把 `generatedAt` 移出摘要或绑父提交），不是每次合并后重跑。

### 3.2 P0 · T1 账本逐任务复核
- 前置观测**已具备**（§1）：`Ran 1807 tests — OK (skipped=39)` @ `28667300`。
- 起点应是 **`DL-R5-001`**：P0 里唯一无依赖的根节点，被 002/003/004/006/009/023/028 直接依赖。
- 契约硬约束（`design_lab/governance/reporting.py::_validate`）：`required_axes` 由
  `HOST_TASKS/DELIVERY_TASKS` 派生**不可改**；任务定义必须等于冻结源
  `docs/history/taskpacks/r5-20260908/tasks.json`（只有 `status` 例外）；证据引用必须存在于
  `ledger['evidence']`；非 implementation 轴**不得**写 `IMPLEMENTED_LOCAL`。
- **为什么本会话没批量翻牌**：`PARTIAL→PASS` 需逐任务对照 `acceptance` 复核；`host_live`/`delivery`
  要真实宿主运行与人工验收，套件观测**不支持**这两轴；且把新证据绑到 gitignored
  `.project-local/**` 正是现有条目今天 `ARTIFACT_CHANGED_OR_MISSING` 的成因，不该复制。

### 3.3 P0 · README 首屏重写 + GitHub About 描述同步（**仍未做**）
- 实测：GitHub About 现在仍以「面向职业视觉设计的 AI 原生…P0 全栈 Vertical Slice：Project→Brief→…」
  开头 —— 正是工作包禁止的「首个切片=项目本体」叙事。
- 要求：母定义、owns/does-not-own、能力覆盖矩阵、可复跑审计入口、权威链、唯一账本、
  current/future/candidate 分区、Ongoing 段；对外名 `视觉设计实验室 / Visual Design Lab`。
- 描述同步流程：推短分支 → PR → 读回上游分支 SHA + 远端文件 + exact-SHA CI →
  GitHub About 前后读回 + API 复核。**分别报，不许合并成一句"已同步"。**

### 3.4 P1 · `div→ul/li` 语义化：**需 owner 先裁决，不是工程量问题**
已实测做过全量替换（30 容器 + 67 项，计数校验、0 残留、LF 保持），`tsc` 报
`shell.ts(1445,12) TS2741 HTMLLIElement ≠ HTMLDivElement`，追出 `.list-item` 是**重载语义**：
① 7 处 `class:'list-item', style:'display:grid…'` 是独立行卡片，其中 `shell.ts:1736-1742` 两个
直接 `panel.append(...)`、不在任何 `.list` 内 → `li` 落在 `ul` 外，非法；
② `briefFieldRow()`（1441）产出的 `.list-item` 又被当作另一个 `.list-item` 的子元素
（`create.row`/`rev.row`）→ `li` 套 `li`。
正解需把"列表成员"与"行卡片"**拆成两个类名**，与「不改 B10 结构类名」冲突 → 归 **D-2**。
⚠️ 附带发现：`vite build`/`unit.mjs`/`appshell.mjs` 当时**全绿**，只有 strict-TS 闸门拦住——
esbuild 不做类型检查，`appshell.mjs` 的 DOM 桩 `querySelectorAll` 只应答 `.app-nav-item`。

### 3.5 P1 · 能力链上的真实验证
- C2 真实 provider 跑通；C3/C4 Illustrator/Photoshop **E3 只读探针**（owner 规则：未明确授权
  不得拉起宿主 GUI，只读探针先行）。
- `DL-R5-015`（M1 首个可用研究版）的 `host_live` **零证据**：卡点是 owner 排期的宿主会话 +
  人工 Jury，不是代码量。
- **C6.2 Human Jury E4 —— agent 禁止执行。**

### 3.6 已闭环但需知道的三件清理
- worktree：4 → 0（每个删除前都验过 `ancestor_of_main` + `commits_unique=0` + 无未提交内容）。
- 分支：本会话共删除 **13 个分支（其中 11 个远端）**，每个都先通过
  `merge-base --is-ancestor <tip> origin/main` **且** `rev-list --count main..tip == 0` 双条件，
  任一不满足即 `REFUSE` 并保留。全部 tip 都是 main 的祖先，恢复方式就是
  `git branch <name> <sha>`（sha 可从对应 PR 的 `headRefOid` 与 main 的 merge commit 读回）。
  ⚠️ **我自己的一个记录缺陷**：处置清单 `.project-local/tmp/merged-branch-disposition.json`
  被第二次 sweep **覆盖**，只剩最后一批 4 条；第一批 7 条的清单已不在。不影响可恢复性
  （祖先关系成立），但"清单先于删除"这条纪律我这次只在最后一批上做到了。
- `codex/github-delivery-docs-20260929` 曾被 `git cherry` 标为未合并，实测其内容**已在 main**
  （`GITHUB_DELIVERY.md` 逐字节相同；workflow 相对 main 是 55 行纯落后、0 新增；
  main 已有 `if: always() && github.event_name == 'push' && github.ref == 'refs/heads/main'`）。
  已打 `preserve/codex-github-delivery-docs-20260929` → `daa7af46` 后再删。
  **教训：patch-id 不等 ≠ 工作缺失。**
- 证据治理债（**未修**）：账本引用的 253 个工件路径中 **216 个在本检出缺失**——证据绑在
  gitignored 的每机 `.project-local` 上。这是结构性债，需要设计决定（哪些工件必须入仓或换绑定方式）。

### 3.7 待 owner 裁决（agent 不得自决）
D-1 字体栈首位 `Inter` 未随包分发（换机退化为 Segoe UI）；D-2 `.items/.mono/.error` 重复定义以谁为准
（**并阻塞 §3.4**）；D-3 规范矛盾 X-1/X-2/X-3/X-4/X-7；D-4 移动端 12 项导航在 390 首屏**看不到任何导航入口**；
品牌蓝 `#316CFF` 承载不了白色正文；中英标题策略（`Research/Brand/Delivery` 英文卡标题 vs 全页中文）；
首页把"未接入/未读回"坏消息与可用面同权重陈列；INSPECTOR 里一个空圆环；
项目详情 tab 末位 `资源预检（非设计评审）` 顶到右边缘。

---

## 4. 环境速查（本会话新增的坑，别再踩）

| 坑 | 正确做法 |
|---|---|
| `node` / `python` **都不在 Bash 的 PATH 里** | node：`D:/All projects/OS External Configuration/10-toolchains/scoop/apps/nodejs-lts/24.18.0/node.exe`（scoop 垫片是旧的，用真身）；python：**项目自带 `.venv/Scripts/python.exe`（3.13.14，含 skimage 0.26.0）** |
| 用外置 `venv313` 跑套件 | 会得到 `Ran 1734 — FAILED (failures=11, errors=43)` 而**包装器 exit 0**。真因：venv313 无 `scikit-image`，`reconstruction/metrics.py` 导入失败 → 整批模块变 `unittest.loader._FailedTest`。**测试总数变化本身就是环境错误的信号** |
| Git Bash 里给 Windows 形态 PATH | 必须 POSIX 形式 `/d/All projects/...`，否则 python 的 `shutil.which('node')` 找不到 |
| 抓界面图 | 走 `scripts/capture_workbench_screenshots.py`（它用 `tempfile.TemporaryDirectory` + 合成 `AGENTS.md` + `PROJECT_LOCAL_ROOT` 隔离）。**不要**手起 `python -m design_lab --project <真实根> workbench` 去截图——驱动会创建项目，状态会写进真实 `.project-local` |
| 取 CI 作业日志 | `gh api .../jobs/<id>/logs` 返回 0 字节（重定向不被跟随）、`gh run view --log-job` 不存在 → 用 `gh run view <run> --log` 再 grep |
| 判断某 PR 是否真绿 | 按 **required context 名逐项**判定；`gh pr checks` 会把 push 跑与 PR 跑混在一起，rollup 绿可能是旧跑 |
| 删除类脚本 | 必须 dry-run 默认 + `--apply`；每个目标做 `merge-base --is-ancestor` + `rev-list --count main..tip == 0`；不符就 **REFUSE 并保留** |
| `/tmp` 不可写 | 用 `.project-local/tmp/` |
| 令牌 | 服务打印的一次性 token 只活在进程/终端，**不入 argv、不入文件、不入 URL** |

---

## 5. 结论口径（沿用，不要退化）

- 热度（star/like）**不得相加**，必须带平台/对象/日期/来源；热度只是发现信号，不是质量证据。
- 未测量就是 `null`，不能用 0 冒充；没读到就是"未读回"，不能显示 0。
- 上游 `AGENTS/SKILL/install/affiliate` 只作 inert 参考数据，不进根指令/prompt/工具发现/能力计数。
- 交付报告**不得**写"保证零遗漏"。
- 证据等级 E0-E5 不得跨级冒充；任何 evidence record 必须绑 repo SHA / adapter / host / OS / fixture hash / artifact hash / 命令与退出码 / 审批 / readback / rollback。
- 「几何全绿」≠「界面好」；任何"界面审过了"的结论必须同时有测量数字**和**对渲染像素的逐屏判读。

---

## 6. 新会话建议的第一批动作

1. `git fetch origin && git log --oneline -8` + `gh pr list --state open` —— 确认起点仍是 `d35bfc81`。
2. 读 `AUTHORITY.md` → `AGENTS.md` → 本文件 → `docs/audits/DESIGN-LAB-WORKBENCH-VISUAL-AUDIT-20261006.md`（§八 §九）。
3. 做 §3.1（投影刷新，5 分钟）或 §3.3（README/About 同步，需 owner 给措辞）。
4. 若要推 M1，先向 owner 要宿主会话与 Jury 排期，而不是继续写治理代码
   （`AUTHORITY.md` §2 禁止连续多波只扩治理/后端而无用户可见进展）。
