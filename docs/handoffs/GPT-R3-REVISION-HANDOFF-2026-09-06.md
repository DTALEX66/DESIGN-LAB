# DESIGN-LAB → GPT：R3 资料层交接（V1 + DP-V2 修订，2026-09-06）

> 本文件是给 GPT 的**最终综合交接**：包含 V1 资料交付、DP-V2 五项修订、已核验事实、GPT 接管待办与边界。GPT 可按此接续 R3 主任务，不必重扫仓库或回读 DEEPSEEK 会话。正式任务状态仍以 `design-lab/config/task-ledger-r3.json` 为准（本文件不改它）。

---

## 0. 仓库与工作区状态（接管快照）

| 项 | 值 |
|---|---|
| 项目根 | `D:/All projects/DESIGN-LAB` |
| 分支 | `codex/r3-runtime-correctness` |
| HEAD | `c4dccd58331bc4561eb89265283d924b7630d113` |
| Python（主环境） | `.venv/Scripts/python.exe` = 3.13.14（R3-09 的 3.12 产品资格归 GPT） |
| 工作区 | 大量未提交/未跟踪成果（GPT 既有工作）；HEAD 非完整快照；**禁止 reset/restore/clean/覆盖** |
| 报告投影 | `scripts/generate_current_reports.py --check` → PASS / exit 0（只读核对通过） |
| 云端 | 本次无远端读回；未发布 |

V1 交付目录（只读原件，17 文件）：`docs/handoffs/deepseek-r3-20260906/`
V2 修订目录（9 文件）：`docs/handoffs/deepseek-r3-20260906-v2/`
运行/证据（Git ignored）：`.project-local/task-{artifacts,runtime}/deepseek-r3-20260906-v2/`

---

## 1. V1 交付摘要（DEEPSEEK DS-01—DS-12，已由 GPT 复核部分）

| 文件 | 内容 | 主要结果 |
|---|---|---|
| `01-requirements-matrix.json` | 24 R3 任务 × 验收逐行 | 66 行；**已知缺陷：implementation 步骤数组被误当轴状态 → 已由 DP-V2-01 修正** |
| `02-history-locators.json` | 历史定位 | 1450/536 CSV 与 baseline 树内精确副本；`history-current-tree-coverage.json`、`old-new-crosswalk.csv` 原判 MISSING（仅 ZIP）→ 已由 DP-V2-03 修正 locator |
| `03-history-crosswalk.json` | 1450 occurrence 逐条 | disposition 125/953/103/269；字节未变 |
| `04-path-link-findings.json` | 路径/链接 | 36 引用 + 8 链接 0 断链 |
| `05-ci-trigger-matrix.json` + `05-ci-proposal.md` | CI 触发 | PR paths 缺 5 规则；apps/** 与 AGENTS.md 未覆盖 → 候选方案（未改 workflow） |
| `06-test-evidence-catalog.json` | 测试证据 | focused 281/1 skipped；unified 49 PASS/0 FAIL；67 源 0 STALE |
| `07-capability-evidence-gaps.json` | 声明差异 | **缺陷：断言"ComfyUI 未安装" → 已由 DP-V2-02 撤回** |
| `08-reference-candidates.json` + `08-reconstruction-acceptance.md` | 参考候选 | 原 11 条（超约定 5–10）→ 已由 DP-V2-04 收敛 |
| `09-existing-interfaces.json` + `09-operator-runbook.md` | 接口/命令 | doctor CLI flags 确认；产品 API 无入口 |
| `10-report-consistency.json` | 报告一致 | `--check` exit 0/PASS |
| `11-repository-maintenance.json` + `11-delivery-checklist.md` | 维护 | 2 对跨目录字节相同证据（dl_h3 mp4/flac） |
| `12-results.json` + `12-DEEPSEEK-RETURN.md` | 回交 | 旧版自引用 hash 问题 → DP-V2-05 改为外部清单 |

---

## 2. DP-V2 修订（本次，GPT 待复核）

V2 目录 `docs/handoffs/deepseek-r3-20260906-v2/`（9 文件；SHA256SUMS 含 8 内容文件、**不含自身**）。

| 修订 | 文件 | 结果 | 修正要点 |
|---|---|---|---|
| **DP-V2-01** 四轴矩阵 | `01-requirements-matrix.json` | PASS | 66 行/24 ID 稳定 `record_id`；`implementation` 仅作实施步骤，不作状态；每轴 = ledger_state / progress_state / declared_state / evidence / reasons；内存校验：把步骤数组当状态必须拒绝。R3-01：implementation=IMPLEMENTED_LOCAL、unit=PASS、host_live=NOT_REQUIRED、delivery=NOT_EXECUTED |
| **DP-V2-02** ComfyUI 措辞 | `02-capability-corrections.json` | PASS | 实测两条外置路径存在：`Design External Configuration/toolchains/comfyui/ComfyUI_windows_portable/python_embeded/python.exe`（105,696 B）、`.../ComfyUI/main.py`（25,301 B）；**撤回 V1"ComfyUI 未安装"及派生 CONFLICT**；分列：文件存在=VERIFIED、进程/服务=NOT_EXECUTED、当前工作流=NOT_EXECUTED、历史 E3=保留待重验；**不升级为"已安装且可运行"** |
| **DP-V2-03** ZIP locator | `03-history-locator-corrections.json` | PASS | `old-new-crosswalk.csv` 在 **ZIP 根**（3152 B，sha256 `a52e0a01…`）；V1 的 `history/old-new-crosswalk.csv` 是错误 locator 已纠正；`evidence/history-current-tree-coverage.json`（262,249 B，sha256 `46e2504f…`）复核一致；语义：ZIP 存在 / 仓库未落盘 / 尚未恢复 / 非"来源丢失" |
| **DP-V2-04** 参考集 | `04-reference-candidates.json` + `04-reference-exclusions.json` | **PARTIAL** | 主候选 **6 条**（作者经 2026-09-06 联网搜索核实）：REF-01 NJ Himel(A)、REF-04 Tanveer Bavishi(B)、REF-05 NJ Himel(A)、REF-07 David Alabo/Adobe(B)、REF-08 Anya Evdokimova(C)、REF-11 Ana Gomez Bernaus(3D)；排除 5 条保留 V1 ID（REF-02/03/06/09/10，作者无法从搜索核实/类别重复）；**电商/2D 缺作者已核实候选 → 缺口 PARTIAL**；全部 `approved_for_reconstruction=false`、`license_scope=UNKNOWN` |
| **DP-V2-05** hash 链 | `05-DP-RETURN.md`、`05-results.json`、`SHA256SUMS.txt` | PASS | 先固定 8 内容文件（含 `00-input-baseline.json`），再按字典序生成 8 行清单（不含自身）；正文/JSON 不回填清单 hash；`acceptance_by_gpt=PENDING` |

**SHA256SUMS.txt 完整 SHA-256：`c18bc5bee48224ad860541696fbdf94fb280136e1ebeb6ffb3c551e8885281f6`**

---

## 3. 已核验事实（GPT 可直接引用，勿重复猜测）

1. **ComfyUI 安装文件在盘**（外置 portable，见 DP-V2-02）；"未安装"表述已撤回。**但文件存在 ≠ 可运行**：启动/工作流/模型资格均未验证，归 GPT。
2. **历史原件**：1450/536 两份 CSV 字节与 ZIP 一致且在仓库 `docs/history/` 有精确副本（74c5b7cc…/58e54d90…）；`old-new-crosswalk.csv`（ZIP 根，3152 B）与 `history-current-tree-coverage.json`（ZIP evidence/，262,249 B）**仅在 ZIP**，落盘与否由 GPT 权属审查决定。
3. **creative-toolchain capability 记录为 E3（历史，tree 7aa0c34a）**：不与"无 ComfyUI"冲突（该冲突已撤回）；但 E3 需在当前树重新资格验证——这是 GPT 的 host_live/requalification 工作。
4. **CI 触发不对称**（canonical-verify.yml）：push 有而 pull_request 缺 `.project/**`、`integrations/**`、`packages/capabilities/**`、`pyproject.toml`、`uv.lock`；`apps/**` 与 `AGENTS.md` 两侧都不触发。候选修改见 V1 `05-ci-proposal.md`（未改 workflow）。
5. **重复文件候选**：`integrations/generators/minimax-h3/evidence/dl_h3_prod.mp4` 与 `integrations/generators/comfyui/evidence/dl_h3_prod.mp4`（578,334 B）字节相同；同名 `.flac`（324,982 B）同样重复。去重须保留历史证据语义，归 GPT。
6. **测试证据（历史，本地 ignored）**：focused 281 用例/1 skipped；unified 49 门 PASS/0 FAIL；`doctor-live` workflow_status=NOT_EXECUTED。换机则证据 MISSING，勿重建假日志。

---

## 4. GPT 接管待办（建议顺序）

1. **复核 DP-V2-01** 四轴矩阵与正式 ledger/progress 字段逐行比对；R3 输入若已变以新证据为准（勿硬编码旧值）。
2. **DP-V2-04 电商/2D 缺口**：浏览器级确认 REF-03/REF-06 作者/作品页，或补作者可核验的电商主图候选（保持 5–10 条不同作品）。
3. **许可/rights 门**：6 条主候选 `license_scope=UNKNOWN`、`approved_for_reconstruction=false`；采用/复刻/下载/再发布授权由 GPT/用户裁决。
4. **历史索引落盘决策**：`old-new-crosswalk.csv`、`history-current-tree-coverage.json` 是否自 ZIP 恢复（权属审查）；原始私人对话正文不重建。
5. **ComfyUI/模型真实资格**：启动与工作流验证、模型 manifest/trust、H3 地域/许可判定（H3 仍 BLOCKED 直至条件满足）。
6. **CI 候选修改**：决定是否按 V1 `05-ci-proposal.md` 调整 workflow（正式 CI 变更归 GPT）。
7. **正式 ledger 更新**：`design-lab/config/task-ledger-r3.json`（唯一编辑源）；V2 `05-results.json` 的 `acceptance_by_gpt` 待 GPT 翻转为 ACCEPTED/REJECTED 依据。
8. **R3 主任务闭环**：DS/DP 完成仅代表资料核验，不等于 R3-XX 整项完成；按 `depends_on` 推进，host_live/delivery 需真实宿主/实机证据。

---

## 5. 边界与纪律（GPT 继续遵守）

- E 盘受保护；不读 `.env`/凭据/私钥/tokens/浏览器/Agent 私有会话。
- 不修改 V1 原件 17 文件（hash 已核对零漂移）；V2 已固定 9 文件。
- 不删除/迁移数据、不代签 Human Gate、不代做模型 trust 审批、不全局改配置。
- 发布/推送/PR 需用户明确授权；正式状态升级需证据。
- 运行/临时产物落 `.project-local/`（Git ignored）；旧 `.hermes` 非活跃写入路径。

---

## 6. 文件索引（GPT 最常用入口）

| 用途 | 路径 |
|---|---|
| 本交接 | `docs/handoffs/GPT-R3-REVISION-HANDOFF-2026-09-06.md` |
| V2 回交正文 | `docs/handoffs/deepseek-r3-20260906-v2/05-DP-RETURN.md` |
| V2 机器结果 | `docs/handoffs/deepseek-r3-20260906-v2/05-results.json` |
| V2 hash 清单 | `docs/handoffs/deepseek-r3-20260906-v2/SHA256SUMS.txt` |
| V2 输入基线 | `docs/handoffs/deepseek-r3-20260906-v2/00-input-baseline.json` |
| V1 需求矩阵（修订版） | `docs/handoffs/deepseek-r3-20260906-v2/01-requirements-matrix.json` |
| V1 证据/维护 | `docs/handoffs/deepseek-r3-20260906/`（17 原件） |
| 任务包/账本 | `docs/taskpacks/DESIGN-LAB-CLOUD-REAUDIT-TASKPACK-2026-09-06.md`；`design-lab/config/task-ledger-r3.json` |
| 根指令 | `AGENTS.md` |
