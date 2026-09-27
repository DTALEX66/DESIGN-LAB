# DESIGN-LAB — 项目梳理 / 证据根授权修复 / 交接总结

> **分类：`HISTORICAL_EXECUTION_RECORD` / `NON_AUTHORITATIVE`**
> 本文件是**时间点执行记录**，不是顶层 Authority。当前权威一律以 `/AUTHORITY.md`
> (`DL-AUTHORITY-2026-09-18-R2`) 与 `/.project/governance/authority-index.json` 为准。
> 后续任何 merge / branch / CI 变化都会使本文过时。

- **日期：** 2026-09-27
- **起点 SHA：** `634071f3c8ffa87e08fa1386f49c185ff6fa36d8`（PR #173 合并后）
- **本轮 PR：** #174（真值对齐，已合并为 `cae840d2a45d47cc31797ea4b4cecc98f1918a26`）、#175（证据根授权修复，见下）
- **只读梳理全文：** `.project-local/task-artifacts/project-survey-2026-09-27/PROJECT-SURVEY-2026-09-27.md`（未入仓）

---

## 1. 本轮做了什么（一句话）

项目的**三个「任务真值」面**系统性落后于已交付事实；本轮把它们对齐，并在**owner 授权**下修复了
**证据根策略与 AUTHORITY §7 声明不一致**的缺陷。**未改任何产品行为。**

---

## 2. HERMES 侧结论（用户明确要求确认）

**没有任何 HERMES 后台任务在为 DESIGN-LAB 执行工作。**

| 任务来源 | 实测 |
|---|---|
| `cron/jobs.json` | `{"jobs": []}` — 无作业定义 |
| cron ticker 心跳 | 存活（有心跳），但无作业可跑 |
| `cron/executions.db` | 902 行 / 16 个 job_id，窗口 `2026-07-26 → 2026-08-11`，已停 7 周 |
| `kanban.db` | 8 张表全 0 行 |
| `project-local-runs/` | 只有 `WORK-LAB`，**无 DESIGN-LAB** |
| `state.db::async_delegations` | 23 条（completed 10 / error 13），最近一条早于本会话 |
| `verification_evidence.db` | 128 条 test 事件；**DESIGN-LAB 命中 0 行** |
| `hooks/` `desktop/` `desktop-plugins/` | 全空 |
| HERMES 项目登记 | DESIGN-LAB = `p_517e2512`（archived=0）；但 `active_id` = ArcheAxis |

普查脚本可重跑：`.project-local/task-artifacts/external-recovery-2026-09-27/hermes-task-census.py`。
按用户指示，**HERMES 侧零改动**。

---

## 3. 审计发现与修复

### 3.1 已修复

| # | 问题 | 修复 | 证据 |
|---|---|---|---|
| F-1 | `reports/current/**` 投影漂移：观察 SHA `6ba2578` ≠ main `634071f`，且写的任务包不是 current integrated 包 | 用 `scripts/generate_current_reports.py` 重生成；`--check` = `PASS` | PR #174 |
| F-2 | R5 账本 112 个轴**仅 3 个**有证据；全部 `PARTIAL` + `PENDING_EVIDENCE_REVIEW` | 新增 5 条 receipt，绑定轴 **3 → 10**；状态**全部保持 PARTIAL**（契约 `r5_contract.py:100-101` 禁止越权置 PASS） | PR #174 + 本 PR |
| F-3 | `AUTHORITY.md` §13 建立时快照被当作现状读（7 checks / 28 分支 / 3 个 workbench 文件） | §13 原文保留；新增 **§13.1** 带日期与观察 SHA 的 live 读回；修正 §15 三处现在时陈述；按 §17 **同步再钉** verifier byte-pin | PR #174 |
| F-4 | `.project-local` 顶层混入 agent 会话暂存 | 4 文件按所有权迁入 `task-artifacts/external-recovery-2026-09-27/`（sha256 移前=移后）；4 文件依契约/引用保留 | 本次 |
| F-5 | 嵌套残留 `.project-local/.project-local/`（空） | 删除（删前确认 0 文件） | 本次 |
| **F-6** | **证据根 `allowed` 集合与 AUTHORITY §7 声明的仓库根不一致**：缺 `apps`（§3 声明的前端）、`research`、`vendor` —— 导致**任何 receipt 都无法引用前端与这两处 §7 声明的根** | `reporting.py` 补齐为 §7 的 13 个声明根；原地记录 owner intent / reason / superseded / impact | **本 PR** |

### 3.2 F-6 的安全面审计（放宽前必做）

- `apps/` 内容：源码 + `tests/` + `build/main.js`，**无任何凭据类文件名**
- `research/`（2 文件 15.9 KB）、`vendor/`（1 文件 22.8 KB）、`services/`（0 文件）：**均无凭据类文件名**
- **密钥防护未被放宽**：`_safe` 的 `denied` 集合对**每个路径分量**生效，实测
  `.env` / `apps/workbench/.env` / `apps/auth.json` **全部仍然 DENY**
- 即：**放宽的是"可以引用什么"，不是"可以泄露什么"**

### 3.3 审计发现但**未**擅自处理（需 owner 决定）

| # | 发现 | 建议 |
|---|---|---|
| O-1 | `services/` 存在于磁盘顶层但 **AUTHORITY §7 未声明**，且当前 **0 文件** | 要么在 §7 声明，要么删除该空目录；本 PR **未**加入证据根（它不是 §7 声明的根） |
| O-2 | `LICENSES/` 存在于顶层但 §7 未声明 | 同上，确认是否补进 §7 |
| O-3 | `AUTHORITY.md` §13.1 是**时点读数**，会再次过时 | 每次审计必须 live-read（§13 已明确此规则） |
| O-4 | HERMES `state.db` = **4.51 GB** | HERMES 全局范围，高风险，未动 |
| O-5 | 本机 PowerShell 5.1 默认按 GBK 读文件 → UTF-8 中文文件乱码，`ConvertFrom-Json` **直接解析失败** | 脚本化审计必须 `-Encoding UTF8` 或改用 `.venv\Scripts\python.exe`；建议给 Python 设 `PYTHONIOENCODING=utf-8` |
| O-6 | R5 账本仍是 `PLANNED_DELTA` + 全 `PARTIAL`，**不含"已完成"语义** | 需要一次正式的 evidence reassessment（owner 主导），本轮刻意不越权 |

---

## 4. 账本证据绑定现状（可逐条溯源）

8 条 receipt / **10 of 112** 个轴已绑定。全部 `outcome=PARTIAL`、`state=PARTIAL`、
`reassessment=PENDING_EVIDENCE_REVIEW` —— **刻意不宣称任何任务完成**。

| receipt | 绑定轴 | kind | 锚定 |
|---|---|---|---|
| `r5-branch-convergence-live-20260927` | DL-R5-001.implementation | structural | SHA `634071f` |
| `r5-runtime-root-boundary-live-20260927` | DL-R5-002.implementation | structural | SHA `634071f` |
| `r5-ci-required-checks-live-20260927` | DL-R5-003.implementation | structural | SHA `634071f` |
| `r5-workbench-strict-ts-build-truth-20260927` | DL-R5-028.implementation + .unit | local_test | SHA `634071f` |
| `r5-workbench-native-task-ui-tests-20260927` | DL-R5-010.implementation + .unit | local_test | SHA `634071f` |
| （既有 3 条）`r5-comfy-*`、`r5-ps-*` | DL-R5-008 / DL-R5-012 | 见账本 | 历史 SHA |

契约约束（`src/design_lab/governance/r5_contract.py`）：
`definition` / `title` / `depends_on` / `predecessor_task_ids` / `required_axes` **逐字节冻结**，本轮**未改动任何一个**。

---

## 5. 本轮验证（全部在本工作树实跑）

| 门 | 结果 |
|---|---|
| `scripts/run_python_tests.py` | `Ran 1755 tests — OK (skipped=37)` |
| `scripts/verify_top_level_authority.py` | `TOP_AUTHORITY_GATE=PASS checks=10` |
| `scripts/verify_authority_gates.py --zero-spill` | `AUTHORITY_GATES=PASS gates=7` |
| `scripts/generate_current_reports.py --check` | `CURRENT_REPORTS=PASS` |
| `design-lab/scripts/verify_project_drift.py` | `PROJECT_DRIFT=PASS findings=0` |
| `scripts/verify_path_refs.py` | `PATH_REF_GATE=PASS checks=10` |
| `design-lab/scripts/update_evidence_binding.py --check` | `HISTORICAL_VALID`（未重绑，遵守 DL-EVD-002） |
| identity / design_lab / adapter_matrix / product_manifest_v3 / runtime_contracts_v3 / visual_scoring_v3 / source_registry / v2_protocols / visual_quality_v21 / library_index_consistency / anti-slop / compileall | 全 OK |
| workbench `tsc --noEmit` + `vite build` + `tests/unit.mjs` + `tests/appshell.mjs` | 全绿；`apps/workbench/build` 无漂移 |
| CI PR #174 | 9/9 required checks 双 run 全 pass |

---

## 6. 双端一致状态

见本 PR 合并后的回读：

- `local main` == `origin/main` == `<合并后 SHA>`
- 工作区干净（`git status --porcelain` 空）
- 远端分支数 = 1（仅 `main`）；open PR = 0；stash = 0；worktree = 1

---

## 7. 交接给下一个会话

### 必读顺序（AUTHORITY §0 强制）

`/AUTHORITY.md` → `/.project/governance/authority-index.json` → `/AGENTS.md` →
`docs/current/PRODUCT_DEFINITION.md` → `docs/architecture/*` →
`docs/taskpacks/DESIGN-LAB-FINAL-AUTHORITY-CONVERGENCE-TASKPACK-2026-09-18.md` →
`design-lab/config/task-ledger-r3.json` → live GitHub `main`/PR/CI → `reports/current/**`（校验 fresh 后）

### 应优先接手的事

1. **O-6**：R5 账本的正式 evidence reassessment（决定是否把已交付项置 `REVIEWED`；这会解锁 `PASS`/`IMPLEMENTED_LOCAL`）
2. **TaskPack P1**：`DesignSystem → DesignIR → Photoshop/Illustrator → 可编辑产物 → readback → patch`（PNG-only 不算完成）
3. **O-1 / O-2**：`services/`、`LICENSES/` 是否补进 AUTHORITY §7
4. **O-5**：脚本化审计的编码规范（否则会误判"数据损坏"）

### 环境注意（本轮踩到并已解决）

- 本机 `pnpm` **自身安装损坏**（`DSH/pnpm-store/v11/links/@/pnpm/11.22.0/...` 缺失，属 DSH 运行时，
  不在本项目范围、也不得外溢修改）。本地门禁改用**同一底层工具**直接调用
  （`node .../tsc`、`node .../vite.js build`、`node tests/*.mjs`）；CI 用可用 pnpm 跑权威命令。
- `node` 不在 PATH：用 DSH runtime shim
  （`desktop-user-data/runtime-commands/generations/<gen>/private/node-bin` 前置到 PATH）。
- Python 用 `.venv\Scripts\python.exe`（3.13.14），并设 `PYTHONIOENCODING=utf-8`。
- Vite dev server 会因编辑器原子写入的临时目录 EBUSY 崩溃；改代码后需重启，且**不要在它运行时编辑**。
- Playwright 需显式指定 `executablePath`
  （`OS External Configuration/toolchains/playwright/chromium-1228/chrome-win64/chrome.exe`），
  且用 `launchPersistentContext` 把 profile 留在项目内（默认会写 `%TEMP%`，越界）。

---

**END — 时间点执行记录。当前权威见 `/AUTHORITY.md`。**
