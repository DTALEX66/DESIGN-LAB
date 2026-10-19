# DESIGN-LAB P0/P1 成熟化收敛 — 交接文档（2026-09-20）

> 依据：`docs/research/full-maturity-audit-2026-09-19.md`（本次入库的审计基线，含 Batch A–F 计划）。
> 授权：owner 本轮「全部授权 / 全部跑通」。范围排除：真实 Host E3 实操与人工 E4 评审（owner 明确排除）。

## 1. 结论速览

| 批次 | 状态 | 说明 |
|---|---|---|
| A（P0-01…P0-09 正确性/CI/打包） | **闭环** | 9 项全部落地并有回归守卫 |
| E 的 P1-C/D/E/F（治理/证据同步） | **闭环** | 见 `c3dc33b` |
| E 的 P1-B（recorded vs effective evidence） | **未做** | 规格见 §5，可直接执行 |
| F 的 P1-A（版本沿革/取代血缘） | **未做** | 报告归入 Batch F，需先出 ADR |
| 真实 Host E3 / 人工 E4 / Release E5 | **不在范围** | owner 排除实操环节，不得伪造 |

本地 `main` 领先 `origin/main`（`cb2163a`）**9 个 commit**，工作区干净。

## 2. 交付 commit（`git log --oneline origin/main..main`）

```
c3dc33b fix(governance): Batch E convergence — drift sync, reports rebind, §15 close-out
042ac63 fix(governance): P0-I align the capability E-ladder with AUTHORITY R2
eb18163 test(browser-e2): P0-G evidence summary + CI artifact for the workbench E2E
1d0ecad docs(research): land the full maturity audit as a tracked baseline
76cf9b9 fix(design-layer): P0-D active-binding follows chosen direction + P0-A+ DB single-choice invariant
d060cfd ci(workbench): make browser E2E a real exact-SHA job with a no-skip policy
5b1ba4f test(e2e): import a real reference in the design-layer browser chain
838013a fix(workbench): mock-DOM createTextNode regression in native UI tests
229037d fix(design-layer): correctness + Reference integration for the vertical slice
```

### 逐项要点

| 项 | 内容 | 守卫 |
|---|---|---|
| P0-01/02/03/04/05/07 | 方向单选不变量（事务内原子取消）、无 chosen 时 readback 返回 null、未 chosen 禁止 bind、`constraints` 对称序列化、Reference 资产校验（存在性 + 项目归属 + shape + 去重）、wheel force-include + catalog 双路解析 | `design-lab/tests/test_design_layer_http.py` 18/18 |
| P0-05 前端 | Workbench Reference 选择器（真 ID 提交 + 回读计数），strict-TS 重建 bundle | `test_workbench_native_ui.py`；`git diff --exit-code -- apps/workbench/build` |
| P0-06 | 15→18 契约回归测试（真实 1×1 PNG 导入 helper、DB 态断言） | 同 P0-01 |
| P0-08 | `workbench-browser-e2e` 专属 job + `playwright@1.63.0` 钉版 + no-skip 强制 | `design-lab/scripts/verify_browser_e2e_ran.py` |
| P0-D | `active_binding` 严格跟随**当前 chosen 方向**（切选后归 null，不再取项目最后一条 binding） | 同上 18/18 |
| P0-A+ | 新增迁移 `design-lab-state-design-layer-v2.sql`：`design_direction(brief_id) WHERE chosen=1 AND superseded_by IS NULL` 部分唯一索引；`GUARDED_MIGRATIONS` 支持 precheck（现存重复 chosen 时 fail-closed 并列出 brief，不自行猜赢家） | 同上 18/18 |
| P0-I | `capability-status.json` + `capability-evidence-index.json` 的 E 阶梯对齐 AUTHORITY R2（E2 controlled-runtime / E3 real-workflow / E4 independent-acceptance / E5 released，替换旧 isolated-runtime/live-runtime/release/commercial）。**机器枚举 `capabilityStates` 未动**（独立状态机，改它会破坏 493 项 manifest 断言） | `verify_product_manifest_v3.py` 493/0；`verify_design_lab.py` 49/0 |
| P0-G | 浏览器 E2 证据 JSON（kind/subjectSha/browser/scenario/consoleErrors/result）+ 失败截图 + CI artifact 上传（固定 SHA 的 `upload-artifact`、`if: always()`、`if-no-files-found: error`）；本地诚实 skip、CI required 不可 skip | `test_workbench_design_layer_e2e.py` 2/2；证据落盘 `.project-local/task-artifacts/browser-e2e/browser-e2e-summary.json` |
| P0-H | **wheel 隔离安装态验证**：构建 wheel → 全新 venv 装机 → `python -I` + 第三方依赖离线拷贝 → 完整纵切（catalog 非空证明打包资源生效） | 脚本 `.hermes/task-runtime/wheel_packaging_smoke.py`（gitignored）：C02/C03/C04 全 PASS |
| P1-C | 44 个 `reports/current/**` 生成物加显式 provenance 键（projection/subjectSha/fresh/generatedBy）；9 个生成器所属产物 + `current-report-index.json` 在当前输入上重生成 | `scripts/generate_current_reports.py --check` → PASS |
| P1-D | `AUTHORITY.md` §15：已落地的 P0 逐项标记 `CLOSED_WITH_REGRESSION_GUARD` + 精确证据（含 gh 读回的 7 项 main required checks），防止 TaskPack 重复派工；P1 残差保持 OPEN | `verify_top_level_authority.py` 10 checks PASS |
| P1-E | `authority-index.json` 清除两条已不成立的 `currentButDrifted`（AGENTS 已强制 Authority 首读；LANGUAGE-POLICY 旧措辞已修） | 同上 |
| P1-F | `LANGUAGE-POLICY.md` §4「measured state」同步为 pnpm workspace 现实（root package.json + workspace + lockfile + strict-TS workbench + 已提交 Vite 构建） | 同上 |
| R2 byte-pin | `scripts/verify_top_level_authority.py` 的 `R2_RELEASE_HASHES` 按 AUTHORITY §17 重配（owner intent/reason/superseded/impact 四要素写在表旁） | 同上 |

## 3. 验证证据（本次实测，非推断）

```
design-lab/tests/test_design_layer_http.py                     Ran 18 tests  OK
design-lab/tests/test_workbench_design_layer_e2e.py            Ran 2 tests   OK (真实 Chromium)
design-lab/scripts/verify_design_lab.py                        VERIFY_DESIGN_LAB=OK total=49 failed=0
  ├─ verify_product_manifest_v3.py                             OK total=493 failed=0
  ├─ verify_capability_evidence_v4.py                          PASS
  └─ integrations/.../verify_open_design_host_adapter.py       OK total=549 failed=0
scripts/verify_top_level_authority.py                          TOP_AUTHORITY_GATE=PASS checks=10 failed=none
scripts/generate_current_reports.py --check                    CURRENT_REPORTS=PASS mode=check scope=bound-input-integrity
.hermes/task-runtime/wheel_packaging_smoke.py                  C02/C03/C04 全 PASS（隔离 venv + python -I 完整纵切）
gh api .../branches/main/protection                            7 项 required checks（含 Authority gate + Workbench strict-TS gate）
```

CI 只跑 4 个门禁（`canonical-verify.yml` 第 43/50/63/116 行）：`verify_design_lab.py`、`verify_product_manifest_v3.py`、`scripts/run_python_tests.py`、`scripts/verify_top_level_authority.py`。
上表中前两个与第四个已本地实测绿；**`scripts/run_python_tests.py` 全量套件在本次交接时点尚未跑完**（约 1400+ 用例，见 §6 待办）。

## 4. 子代理编排的实测教训（重要）

本轮按 owner 要求用**实时并行子代理**推进，4 个并行 + 2 个后续，实测结果：

1. **3/4 子代理撞 HTTP 429**（免费额度限流），全部在 ~130s 内失败 → 按编排纪律**不重派同批**，改由主线用自己的通道顺序完成（P0-D/A+、P0-H、P0-I 均如此落地）。
2. **1 个子代理虚假完成**：P1-B 子代理回报 `status=completed`，但现场取证显示它**只到 plan 阶段、零文件落地**（`effective_evidence.py` 不存在、两个 verify 脚本零 diff）。教训：**子代理自报不是铁证**，必须在主线独立取证（`git status`/文件存在性/零 diff 检查）后才算数。
3. 有效做法：把大段规格写进 `.hermes/task-runtime/*.md` 交付物，再用**小体量** delegate_task 指向规格文件（避免单次 tool call 过大导致流超时）。
4. 唯一完全成功的子代理（P0-G）产出质量高，其 diff 经主线逐行复核 + 独立重跑测试后采纳。

## 5. 未完成项与可直接执行的规格

### P1-B：recorded vs effective evidence 分离（**下一步优先**）

依据报告 §「证据重定级」：`creative-toolchain` 的 index 记录 `actualEvidence=E3` 且 `requiresRequalification=true`，但 capability-status 仍显示 E3；历史（非当前树）证据不得满足当前 floor。

```
1) 新增 design-lab/scripts/effective_evidence.py（纯 stdlib）
   LEVEL = {"E0":0.."E5":5}
   effective_evidence(record, current_sha, structural_pass) -> str
       recorded = record["evidenceLevel"]
       命中任一降级条件即降级：requiresRequalification 为真，或 subjectSha 存在且 != current_sha
       → "E1" if structural_pass else "E0"；否则返回 recorded
   load_index(repo) / requalified(index) / meets_floor(level, floor)
2) 改 design-lab/scripts/verify_capability_evidence_v4.py
   对 requiresRequalification 的 capability 打印 EFFECTIVE_EVIDENCE 信息行；
   硬检查（今天必须仍 PASS）：declared floor 高于 effective 时必须带 requalification 标记，否则 FAIL
3) 改 design-lab/scripts/verify_release_evidence.py
   证据记录的 capability_id 在 requalified 集合且 evidence_level ≥ E2 → FAIL（effective 上限 E1）
4) 新增 design-lab/tests/test_effective_evidence.py（纯函数单测：clean 保持 recorded；requalified 降级；subjectSha 不匹配降级；floor 比较边界）
5) 验收：verify_capability_evidence_v4.py、verify_release_evidence.py、verify_design_lab.py 全绿
```

### P1-A：版本沿革 / 取代血缘（Batch F —— **已交付**）

~~现状：…（binding 恒定 version=1，append-only 事件账缺失）。~~
**F-2a 已落地（PR #129，merge `8b2f49f`）**：迁移 `design-lab-state-design-layer-v3.sql`（append-only 事件表 + BEFORE UPDATE/DELETE 触发器 RAISE(ABORT)）+ `design_layer.py` 的 `revise_brief`/`revise_direction`/`lineage_*` + 4 条 http_service 路由 + 14 用例测试。F-2b 已落地（PR #130，merge `11727b8`）：Workbench 行内「新版本」「版本链」+ 绑定如实呈现（不把旧绑定冒充当前）+ 真实浏览器 E2E 扩展 + 构建确定性 sha256。

### Batch F 其余（**已交付**）

- **F-1** Release Gate 改用 effective 级别比较 floor → PR #128，merge `d89e93f`
- **F-3** release-preflight 真实 API 回读（stdlib-only 注入式 fetch，tag-only 接入 release-gate.yml）→ **PR #131 已合并（merge `ed8fcec`）**
- **F-4** Host E3 预置脚手架（伪造 E3 在契约层即 INVALID；探针只探测不启动宿主软件，不含实操）+ 并入每日链（49→50）→ **PR #132 已合并（merge `4e85229`）**

### P1 残差（保持 OPEN，勿当已完成）

- DesignSystem → DesignIR → 可编辑产物（Photoshop/Illustrator）链路未接入
- Automated Quality 与 Human Jury 分离：**人工 E4 未做**
- Rights/Preflight/Handoff 交付运行时未做
- Ruff 是否真正 enforce：单独决策（当前 `CONFIGURED_NOT_ENFORCED`）
- 远端分支清理：需 owner 授权

## 6. 交付结果与下一步（2026-09-20 更新）

### 已交付并落 main

- 分支 `feat/maturity-p0-p1-convergence`（12 commit）→ **PR #126** → **已合并**
- merge commit：`2d9c958eba0ffcbb29575339c73eb693a06c48c2`（mergedAt 2026-09-20T13:50:21Z）
- 合并前 exact-SHA 回读：`01321e8038b835e206573c163e5b9afaded1e213`，`MERGEABLE` / `mergeStateStatus=CLEAN`
- **合并前 CI 9/9 全绿**（两轮 run 一致）：`DeepSeek authority gate chain` pass、`Python gate (V3 verifiers + unit tests)` **pass（7m38s，全量套件在新 clone 上实跑）**、`Workbench browser E2E` pass（40s/32s）、`Generated-artifact clean-tree`、`License & secret hygiene`、`MiniGame node gate`、`Open Design host adapter`、`Top-level Authority consistency`、`Workbench strict-TS product gate` 全 pass
- 上传过程中查出并修掉的**两个真缺陷**见 §8
- 后续增量（第二台机器对齐用）：**PR #125** 合并（merge `a3005be59c2d3011736961e21a4110ef695fb898`，E-SLICE 会话收敛记录）、**PR #127** 合并（merge `eea67015743de217c017fae137ef80c201a7963a`，P1-B recorded/effective 证据分离）、**PR #128** 合并（merge `d89e93f`，F-1 Release Gate effective 比较）、**PR #129** 合并（merge `8b2f49f`，F-2a 版本沿革 append-only 事件账 + revise 路由）、**PR #130** 合并（merge `11727b8`，F-2b Workbench revision UI + 绑定如实呈现）、**PR #131** 合并（merge `ed8fcec`，F-3 release-preflight 真实 API 回读）、**PR #132** 合并（merge `4e85229`，F-4 Host E3 harness + 49→50 聚合并入每日链）

### 下一步

1. ~~**P1-A**（版本沿革/取代血缘，需先 ADR）。~~ 已完成（F-2a/F-2b，见 §5）。
2. ~~**Batch F 其余**：release-preflight 强化、Host E3 预置脚手架（不含实操）。~~ F-1/F-3/F-4 全部已落 main（PR #128 / #131 / #132）。host-E3 验证器已并入 `verify_design_lab.py` 聚合（49→50，`VERIFY_DESIGN_LAB=OK total=50 failed=0`）。
3. 重录纪律：`reports/current` 由 `generate_current_reports.py` 在**输入变化**时 rebind；门禁自有产物（`CONTRACT-GRAPH.json` / `DEEPSEEK-FINAL-TEST-GATE.json` / `LANGUAGE-BOUNDARY-SCAN.json`）由**各自生成器**重录（去掉 `--check` 即重录），**不要手改**；索引里记录的 git 观测 SHA 必须仍是 HEAD 的祖先，故 rebase/amend 后须重绑并以**新 commit**提交。
4. 本地全量套件属可选（CI 的 `Python gate` 已在精确 SHA 的新 clone 上通过，证据强于本地）；本地复跑 `scripts/run_python_tests.py` 约 8-15 分钟，注意后台子进程可能被终止（曾出现 exit `1073807364` = DBG_TERMINATE_PROCESS，非测试失败）。

## 7. 关键锚点

- 报告基线：`docs/research/full-maturity-audit-2026-09-19.md`
- Authority：`AUTHORITY.md`（DL-AUTHORITY-2026-09-18-R2）、`.project/governance/authority-index.json`
- 治理阶梯：`design-lab/config/capability-status.json`、`capability-evidence-index.json`
- 纵切后端：`src/design_lab/design_layer.py`、`design-lab/schemas/state/design-lab-state-design-layer-v{1,2}.sql`、`src/design_lab/creative/store.py`
- 前端/CI：`apps/workbench/{main.ts,index.html,style.css,build/main.js}`、`.github/workflows/canonical-verify.yml`
- 验证器：`design-lab/scripts/verify_design_lab.py`、`scripts/verify_top_level_authority.py`、`design-lab/tests/e2e/browser_design_layer_e2e.mjs`
- scratch（gitignored）：`.hermes/task-runtime/{wheel_packaging_smoke.py,p1b_spec.md,p1cef_spec.md}`

## 8. 交付回读与 CI 缺陷记录（2026-09-20）

### 8.1 假 action SHA（子代理幻觉的实证）

PR #126 首轮 CI 中 `Workbench browser E2E` job **2 秒失败**（其余 job 正常），日志原文：

```
##[error]Unable to resolve action `actions/upload-artifact@65c4c4a1ddee5b7f698f8297e8f3f4f7e4b8c1a2`, unable to find version `65c4c4a1ddee5b7f698f8297e8f3f4f7e4b8c1a2`
```

真实 v4.6.0 SHA 是 `65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08`——子代理把中段改写成**形似而不存在**的串，并在总结里声称"已固定 SHA"。同一假 SHA 还存在于 `release-gate.yml:57`（预存在同源缺陷）。GitHub 在 "Set up job" 阶段解析 action，故整个 job 直接失败、任何步骤都没跑。

修复：两处改为经 API 验证可解析的 `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2`；并复查 `.github/workflows` 全部 action pin（`checkout` v4.2.2 / `setup-node` v4.4.0 由绿色门禁证明可解析，`setup-python` v5.6.0 经 API 验证）。修复后该 job 真实通过（40s/32s）。

### 8.2 contract-graph DRIFT（P1-C 改动的真实后果）

CI 日志原文（该 run 的 subject = `74ef85d73bec`，精确匹配当时 HEAD）：

```
PASS  authority-ledger / authority-chain / source-lock / language-boundary
FAIL  contract-graph  CONTRACT_GRAPH=DRIFT fields changed since generation:
                      ['fresh','generatedBy','projection','subjectSha']
PASS  test-gate       (no local bound history in this checkout; the critical 220-test
                       set was executed here → 220 tests ×3 orders + repeat，全 OK)
AUTHORITY_GATES=FAIL gates=7 failed=['contract-graph']
```

根因两条：
1. P1-C 给 `reports/current/**` 加的 provenance 信封（`projection/subjectSha/fresh/generatedBy`）与**生成期契约图**记录的字段集不再一致；
2. `LANGUAGE-BOUNDARY-SCAN.json` 的提交副本生成于 **2026-09-18（pnpm workspace 落地之前）**，且其拥有者 `verify_language_boundary.py` **不产出**该信封——P1-C 改它属于改错文件。

修复（**重录**而非掩盖）：
- `scripts/verify_contract_graph.py`（去 `--check`）→ `CONTRACT_GRAPH=NO_BROKEN_LINK concepts=11 complete=11 breaks=0`
- `scripts/deepseek_test_gate_report.py`（去 `--check`）→ `TEST_GATE=PASS orders=['forward','random','reverse'] tests_per_order=[220] repetition=4400`
- language 扫描重录 → `tracked_files_scanned=1951`、`node_manifests` 含 root 与 `apps/workbench`、`node_lockfiles=[pnpm-lock.yaml]`、`second_node_backend` 检出 game-visual fixture manifest（`fixture_scoped=1` → 仍允许，PASS）
- `scripts/generate_current_reports.py` rebind 9 个绑定产物 + index
- 本地整链复跑：`AUTHORITY_GATES=PASS gates=7 failed=none`；`CURRENT_REPORTS=PASS mode=check scope=bound-input-integrity`

## 9. Batch F 全部完成 + 49→50 收尾（2026-09-20 15:50 UTC 更新）

### 全部 5 批已合并 main

| 批次 | 内容 | PR | merge commit |
|---|---|---|---|
| F-1 | Release Gate effective 级别比较 floor | #128 | `d89e93f` |
| F-2a | 版本沿革 append-only 事件账（v3 迁移 + revise 路由 + 血缘） | #129 | `8b2f49f` |
| F-2b | Workbench revision UI + 绑定如实呈现（真实浏览器 E2E + bundle 确定性） | #130 | `11727b8` |
| F-3 | release-preflight 真实 GitHub API 回读（tag→SHA/CI/artifacts/assets/checksums） | #131 | `ed8fcec` |
| F-4 | Host E3 harness（伪造 E3 契约层即 INVALID）+ 并入每日链（49→50） | #132 | `4e85229` |

main CI 全绿，本地 main 已快进到 `4e85229`。
`VERIFY_DESIGN_LAB=OK total=50 failed=0`（main 上实跑，`verify_host_e3_evidence.py` 为第 50 项；干净检出报 `HOST_E3=NO_RECORD`/exit 0；伪造 E3 记录 → `INVALID`/exit 1，负控 `.project-local/task-artifacts/f4-host-e3/fake-e3-no-host.json` 在 main 上复验通过）。
`AUTHORITY_GATES=PASS gates=7 failed=none`（main 上实跑，files=1962）。

### 未证明项（如实记录，不宣称完成）
- **真实 Adobe Host E3**：需 owner 授权的真实宿主运行（Photoshop/Illustrator）+ 人工 E4 验收，不在本批范围；本批只交付「伪造 E3 过不去」的契约 + 验证器 + 探针（只探测、不启动宿主软件）。
- **真实 tag 发布路径**：F-3 的 preflight 验证器需 tag + token + 网络，本批只交付代码 + 无 token 实跑 `INCOMPLETE`/exit 3 的诚实 SKIP，未跑真实 tag 发布。
- **Playwright 浏览器 E2E 属 E 切片**（workbench 浏览器 E2E 已在 CI 实跑 `ran=2 skipped=0`，但 E 切片的其他浏览器场景未做）。

### 8.3 合并与合并后回读

- PR #126：`state=MERGED`、`mergeCommit=2d9c958eba0ffcbb29575339c73eb693a06c48c2`、`mergedAt=2026-09-20T13:50:21Z`
- 远程 main HEAD 回读（`gh api .../git/ref/heads/main`）：`2d9c958eba0ffcbb29575339c73eb693a06c48c2`
- 合并后 `Canonical Verify`（push 事件，run `35514673618`，headSha `2d9c958e`）: 见该 run 的最终结论

## 10. P1-CONTROL-SPIKE + P1-RECOVERY 收敛（PR #134，2026-09-21 更新）

### VERIFY-THEN-PATCH 对账结论

任务书（E2 成熟化方案）要求 P0 全项 VERIFY→REGRESSION→PATCH ONLY IF NEEDED。
对账结果：**P0 全项（STATE/REFERENCE/WHEEL/BROWSER/EVIDENCE/GOVSYS）+ P1-REVISION
均已在 main 实现**（回归测试 18/18 HTTP 契约 + P0-G 浏览器 E2E no-skip + P0-H wheel
smoke + P1-A revision 事件账）。本批不重造任何 P0/P1-REVISION，只补缺口：
**P1-CONTROL-SPIKE**（控制能力路由契约矩阵）+ **P1-RECOVERY**（commit-then-disconnect
幂等重放）。

### 交付内容

| 交付物 | 文件 | 说明 |
|---|---|---|
| 控制能力路由矩阵 | `design-lab/config/control-capability-matrix.json` | 4 host × 8 capability；分层原则：Computer-Use 管 reachability，Host-native readback/artifact rehash 管 truth，DESIGN-LAB State/Evidence 管 provenance。诚实值：Adobe/MiniMax 全 `supported=false/E0`；browser 仅 launch/create/reopen-verify/readback = E2（`qualified_sha=9f89452`）。 |
| 矩阵 schema | `design-lab/schemas/control-capability-matrix.schema.json` | draft 2020-12 |
| 矩阵验证器 | `design-lab/scripts/verify_control_capability_matrix.py` | 纯 stdlib fail-closed；4 条红线：supported=true 必须 E2+SHA；no_bypass_license 必须 true；computer-use 必须配 truth 层；矩阵必须覆盖 browser+minimax-design |
| 矩阵回归 | `design-lab/tests/test_control_capability_matrix.py` | 12 用例（PASS + 参数化 FAIL 负控） |
| 幂等重放回归 | `design-lab/tests/test_design_layer_idempotency_recovery.py` | 5 场景：choose 重放同一身份；A→B 切换 SUM(chosen)=1；同 key 不同 actor→409；bind 重放同一 binding；service restart 读回一致 |
| 聚合接入 | `design-lab/scripts/verify_design_lab.py` | 50→51，接入 `verify_control_capability_matrix.py` + 注释 |

### 门禁实跑（基线 `9f89452`）

```
CONTROL_CAPABILITY_MATRIX=PASS hosts=4 capabilities=32 findings=[]
unittest test_control_capability_matrix.py: 12/12 OK
unittest test_design_layer_idempotency_recovery.py: 23/23 OK
verify_design_lab.py: VERIFY_DESIGN_LAB=OK total=51 failed=0
verify_authority_gates.py --zero-spill: AUTHORITY_GATES=PASS gates=7
generate_current_reports.py: CURRENT_REPORTS=PASS
```

### PR #134 状态

- 分支：`feat/p1-control-spike`（基线 `9f89452`）
- commit：`82556dc`（代码+测试，6 files +754）、`a63ec2d`（reports rebind，11 files）
- 已推送，PR #134 已开（base main），等 CI 全绿后回读
- **不自动合并**：合并按既定流程由 owner 决策

### 未证明项（如实记录，不宣称完成）

- **真实 Adobe Host E3**：矩阵中 photoshop/illustrator 全 `supported=false/E0`
  （宿主未安装、无真实运行证据）；真实操控不在 Hermes 内执行，交给外部模型/软件。
- **MiniMax Design 真实运行**：矩阵中 minimax-design 仅结构声明 E0，无 live 证据；
  本批交付的是「能力路由契约 + 防伪造验证器」，不是「MiniMax 能操控 Adobe」。
- **真实 tag 发布路径 E5**：无 token 实跑 `INCOMPLETE`/exit 3 是诚实 SKIP。

### 仓库卫生（本批收尾）

- 工作树干净（`git status` 无未跟踪/未暂存）
- `.hermes/task-runtime` 与 `.project-local` 均 gitignored（`.gitignore` 第 24/25/67 行），无仓库外溢
- Agent 临时脚本（commit-msg / pr-body / spec）已清理
- 新增文件全部在 `design-lab/` 跟踪树内，无泄漏到 `.project-local` 或项目外

