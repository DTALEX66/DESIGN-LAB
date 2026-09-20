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

### P1-A：版本沿革 / 取代血缘（Batch F，需先 ADR）

现状：`design_direction`/`design_system_binding` 有 `version`/`superseded_by` 字段但**没有真正的版本链**（binding 恒定 version=1，append-only 事件账缺失）。报告要求：append-only 版本沿革 + 与 decision/binding 的血缘 + 取代语义，先出 ADR 再实现。

### Batch F 其余

release-preflight 强化、`effectiveEvidence` 接入 Release Gate、Host E3 预置脚手架（不含实操）。

### P1 残差（保持 OPEN，勿当已完成）

- DesignSystem → DesignIR → 可编辑产物（Photoshop/Illustrator）链路未接入
- Automated Quality 与 Human Jury 分离：**人工 E4 未做**
- Rights/Preflight/Handoff 交付运行时未做
- Ruff 是否真正 enforce：单独决策（当前 `CONFIGURED_NOT_ENFORCED`）
- 远端分支清理：需 owner 授权

## 6. 下一步（按顺序）

1. 本地跑完 `scripts/run_python_tests.py` 全量套件（CI 第 4 个门禁），确认绿。
2. push 分支 `feat/maturity-p0-p1-convergence` → 开 PR → 等 4 门禁 + required checks → 回读 exact-SHA 结果。
3. 处理早前开着的 PR **#125**（会话总结，docs-only）。
4. 执行 §5 的 P1-B，再进 P1-A/Batch F。
5. 注意：`reports/current` 只在**输入变化**时重生成（`generate_current_reports.py --check` 报 DRIFT 时）；不要手改生成物。

## 7. 关键锚点

- 报告基线：`docs/research/full-maturity-audit-2026-09-19.md`
- Authority：`AUTHORITY.md`（DL-AUTHORITY-2026-09-18-R2）、`.project/governance/authority-index.json`
- 治理阶梯：`design-lab/config/capability-status.json`、`capability-evidence-index.json`
- 纵切后端：`src/design_lab/design_layer.py`、`design-lab/schemas/state/design-lab-state-design-layer-v{1,2}.sql`、`src/design_lab/creative/store.py`
- 前端/CI：`apps/workbench/{main.ts,index.html,style.css,build/main.js}`、`.github/workflows/canonical-verify.yml`
- 验证器：`design-lab/scripts/verify_design_lab.py`、`scripts/verify_top_level_authority.py`、`design-lab/tests/e2e/browser_design_layer_e2e.mjs`
- scratch（gitignored）：`.hermes/task-runtime/{wheel_packaging_smoke.py,p1b_spec.md,p1cef_spec.md}`
