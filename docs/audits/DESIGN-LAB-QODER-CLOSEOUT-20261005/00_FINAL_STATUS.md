# 00 — DESIGN-LAB QODER CLOSEOUT 最终状态（2026-10-05）

- Authority：`DL-AUTHORITY-2026-09-18-R2`（`/AUTHORITY.md`，本次未改）
- 观察 exact SHA：`origin/main` = `1acbfa15a8c036907aadbdc6938b8706c91b5d3e`；
  UI 分支起点 `0fbb67439755d9ded181ded6c061711f23343dc9`
- 本轮产出分支：
  - `feat/ui-commercial-workbench-20260930` → 远端已前进到 `84ffc1954b71c34ab638d85ea0cbc41e5abe33a3`（PR #213，仍 DRAFT）
  - `qoder/designlab-m1-closeout-20261005`（本地，未 push）

## 分级结论（只允许任务书词表）

| 项 | 状态 |
|---|---|
| C0 UI 分支收口 | **DONE_E2**（门全绿 + Evidence Truth 真修 + 文档一致 + CI exact-SHA 绿） |
| C0.1 截图真值 | **DONE**（40 张真实渲染 + 逐张 hash 已独立复核） |
| C0.2 文档对齐 | **DONE** |
| C0.3 IA 不扩张 | **DONE**（复核，未改） |
| C0.4 合并 | **READY_FOR_OWNER_MERGE**（PR 仍 DRAFT，merge 属 owner 门） |
| C1 Ledger/Reports | **DONE_E1**（合同修复 + 投影重生成 + drift 门入 CI） |
| C2 Reference→Design IR | **PARTIAL**（接缝与合同级集成完成；无 provider 真跑、无宿主 lowering 实测） |
| C3 Illustrator E3 | **BLOCKED_PERMISSION**（owner 选择只读探测） |
| C4 Photoshop E3 | **BLOCKED_PERMISSION**（同上） |
| C5 Readback/Patch/Rollback | **PARTIAL**（宿主未跑，两次局部修改与失败矩阵未实测） |
| C6 Quality/Jury/Rights/Preflight/Handoff | **PARTIAL** + Human Jury **BLOCKED_HUMAN** |
| C7 Windows M1 | **PARTIAL**（最短启动入口缺口确认，未实现；install/restart/persistence 未验收） |
| M1 判据 | **未达 `M1_CANDIDATE`** |
| E5 / release | **NOT_EXECUTED**（未 tag、未 release） |

## 门读数（本轮实测）

### UI 分支 `84ffc19`
- 本地：`tsc --noEmit` PASS；`vite build` PASS（4 modules / 157747 B）；
  `unit.mjs` PASS；`appshell.mjs` PASS；`test_service_http` + `test_design_layer_http`
  = 47 tests OK；`verify_design_lab.py` 55 项 verifier 全 PASS（exit 0）；
  `verify_top_level_authority.py` 10/10；`verify_path_refs.py` 10/10；
  `verify_project_drift.py`、`verify_identity_gate.py`、`verify_workbench_packaging.py` 5/5、
  `verify_license_coverage.py`、`verify_asset_governance.py`、`check_anti_slop.py` 全 PASS；
  `git diff --exit-code -- apps/workbench/build` CLEAN；
  MiniGame node 300 tests + android drift OK；
  浏览器 E2E（`E2E_REQUIRED=1`，subjectSha=`84ffc19`）`ran=2 skipped=0 failed=0`，
  `consoleErrors=0`，结果 PASS。
- 远端 CI：`Canonical Verify` 对 `84ffc19` **success**（两个 run 均绿）。
  对照：对 `694ad2d` **failure**，失败 job = `Python gate (V3 verifiers + unit tests)`，
  根因即截图 sidecar 未过 `verify_asset_governance`，由 `84ffc19` 修复。
- 全量 Python 套件本地读数：在 `694ad2d` 上 `Ran 1762 tests`，
  `FAILED (failures=1, skipped=37)`，唯一失败项 = `test_aggregate_verify_runs`
  → 内部 `FAIL verify_asset_governance.py`（同一根因）。修复后该 verifier 单独跑为
  `ASSET_GOVERNANCE=OK`，聚合 `verify_design_lab.py` 为 exit 0。
  在 `84ffc19` 上的本地全量重跑在 25 分钟处被主动停止（远端 CI 同 SHA 已绿），
  因此**不宣称**本地全量在 `84ffc19` 复跑完成。
  同一次运行早期还出现过 2 个 error，根因是我在套件运行期间向 `docs/` 写入
  尚未配 sidecar 的 PNG，属自扰，非产品缺陷。

### closeout 分支
- `scripts/generate_current_reports.py --check`：修复前 `FAIL invalid R5 ledger contract
  at evidence/36/artifacts` → 修复后 `PASS`（scope=bound-input-integrity，
  `current-git-and-cloud=NOT_VERIFIED`）。
- `verify_top_level_authority` / `verify_path_refs` / `verify_project_drift` /
  `verify_identity_gate` / `verify_license_coverage` / `verify_asset_governance` 全 PASS。
- `design-lab.tests.test_plan_to_rir`：17 tests OK。

## 本轮真实交付（可核对）

| 交付 | 位置 |
|---|---|
| 40 张真实视口截图 + 40 个 license sidecar + manifest | `docs/UI-CONVERGENCE-20260930/screenshot/`（绑定 commit `fbe94ac`，合计 5,120,249 B，hash 已独立复核） |
| 截图采集器（真实服务 + 真实 Chromium，fail-closed） | `scripts/capture_workbench_screenshots.py`、`design-lab/tests/e2e/capture_workbench_screenshots.mjs` |
| KPI 假值修复 | `apps/workbench/shell.ts` `animateKpiCount` 数字守卫（`8036439`） |
| 账本合同修复 + 投影重生成 + CI drift 门 | `95b446d` |
| Plan→RIR 接缝 + 17 项测试 | `src/design_lab/analysis/plan_to_rir.py`、`design-lab/tests/test_plan_to_rir.py`（`c3e43ea`、`2c566e6`） |
| 11 份只读收口报告 | `docs/audits/DESIGN-LAB-QODER-CLOSEOUT-20261005/` |

## 未做的事（明确不冒充）

- 未启动任何宿主 GUI；未产出 `.ai` / `.psd` 原生可编辑文件；未做两次对象级局部修改与回滚实测。
- 未替用户做 Human Jury，未写任何 PASS verdict。
- 未新增第二 ledger / 第二 runtime / 第二前端 / 第二画布。
- 未抬升任何 R5 任务轴状态；28 项中仅 `DL-R5-010` 的 `reassessment` 由复核转为 `REVIEWED`。
- 未 merge、未 un-draft、未 tag、未 release、未删分支。
- 一处 commit message 事实错误未改写：`893a3ec` 写 Chromium `149.0.7827.57`，
  权威读数以 manifest 为准 `149.0.7827.55`（历史不改写，只在此标注）。
