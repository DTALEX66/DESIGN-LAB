# CROSSWALK — 2026-09-24 云端审计（RAW）× live `cb9c3ca` 活核对

> Authority: `/AUTHORITY.md` (`DL-AUTHORITY-2026-09-18-R2`) + `.project/governance/authority-index.json` (v2, `TOP_LEVEL_CURRENT`)
> Observed main SHA: `cb9c3ca68a4eb0a12436b719668b16aa09def600`（live `origin/main`，2026-09-24 核对）
> RAW 存档：`docs/audits/DESIGN-LAB-CLOUD-AUDIT-2026-09-24-RAW.md`（NON_AUTHORITATIVE）
> 本文件 = RAW 的事实核对 + 可执行拆解；**不**在 ingest 同一 PR 内执行其任务清单。

## 1. 事实核对（RAW 声称 → live 实测 → 判定）

| # | RAW 声称 | live 实测（`cb9c3ca`） | 判定 |
|---|---|---|---|
| F1 | main = `cb9c3ca` | `origin/main` = `cb9c3ca68a…` | ✓ 一致 |
| F2 | 11 visible branches（10× `codex/*` + main） | 实际 **10** branches，**0 个** `codex/*`（`feat/adapter-locator-audit-b4`、`feat/ci-artifact-proof-h001`、`feat/comfyui-e3`、`feat/evidence-append-only-b5`、`feat/quality-record-schema-b3`、`feat/ucr-activation`、`fix/design-lab-governance-closure-r4`、`fix/r4-h3-prod-e3`、`fix/registry-quarantine-sync`、`main`） | ✗ 分支表整体不符 |
| F3 | 分支表含 `codex/add-csp-csp-router`@`b7b71745…` 等 10 条 | `git ls-remote origin` 无 `codex/*`；`git cat-file -e b7b717456373…` 对象不存在（本地库无此 SHA）；表内个别 SHA（如 `f3c7ed33…`）为真实历史 commit（#143 workbench），但对应分支名为 RAW 侧拼接 | ✗ 分支表为跨环境/幻觉层，**不得继承其"已验证"表述** |
| F4 | open PR = `#149 feat(ai): add declarative ai utilization registry`（head `codex/add-ai-utilization-registry`） | live `#149` = **G-3/B3 封死的 per-artifact QualityRecord schema + 校验器 + CI gate**，head `feat/quality-record-schema-b3`，OPEN，9/9 required 全绿 | ✗ PR 身份不符（RAW 读错仓态或跨仓） |
| F5 | 机器治理层"无机器可读索引" | `.project/governance/authority-index.json`（v2，status=`TOP_LEVEL_CURRENT`）**已存在**且由 "Top-level Authority consistency gate"（9 required 之一）持续校验 | ✗ 已闭 |
| F6 | "path-drift-check 不存在" | `design-lab/scripts/verify_project_drift.py` 存在，但**仅**语言/产品漂移（DL-GOV-130：default-host 措辞、E0/E1 过度声明）；**路径引用漂移检查器确缺**（AGENTS/authority 文档/`paths.json`/`external-assets-index.json` 的 path 引用是否全部命中 tracked 文件，无 CI 校验）；且 `verify_project_drift.py` 本身**未接入 CI 聚合器** | ◑ 部分属实（真缺口 = 路径引用校验 + drift 检查器接 CI） |
| F7 | "无统一环境/工具链注册" | `.project/paths.json` + `docs/LOCAL_ENVIRONMENT.md` + `reports/current/MACHINE_INVENTORY.json` + `external-assets-index.json` + `model-radar.json` **均已存在**；AGENTS.md「模型与工具」已载明"本机外置根以 `.project/paths.json` 为准"、"更新以官方发布为准，不私自打包" | ✗ 已闭；**残留真缺口** = 无 machine-readable `allowAutoInstall=false` 策略字段 + 无 CI 断言 |
| F8 | "无当前集成 TaskPack" | `docs/taskpacks/DESIGN-LAB-FINAL-AUTHORITY-CONVERGENCE-TASKPACK-2026-09-18.md`（`DL-TP-20260918-FINAL-AUTHORITY-CONVERGENCE-R2`）= AGENTS.md 唯一 current integrated TaskPack | ✗ 已闭 |
| F9 | 需新建 `EvidenceEnvelope v2` | evidence 合同族已存在（`evidence-record`、`evidence-attestation`、`release-evidence`、`capability-evidence`、`run-receipt`、`operation-receipt` schema）；`verify_evidence_cards.py` B5 已接 CI（#151） | ✗ 不建第二并行系统（反漂移）；真残留 = **Host E3 逐宿主资格数据**（owner-gated，DECLARED） |
| F10 | Workbench UI 缺 Preflight 面板/token 库/host 面板 | live grep `apps/workbench/src/`：`preflight`/`token`/EvidenceEnvelope 引用 = 0 → **属实**。workbench 现有 E2E/strict-TS 门（12.2–12.5）在 CI，UI 组件须绑定真实 `/api`（禁幻影 KPI） | ✓ 真缺口（agent 可执行结构面） |

## 2. 判定（按域）

- **机器治理 / 环境注册 / TaskPack / 证据合同**：RAW 的 P0-T1、P0-T3、P1-T2 大部分 **已被仓内既有设施闭合**（F5/F7/F8/F9）；RAW 基于过时/跨环境仓态。
- **真缺口（agent 授权结构层）**：
  - **G-A（P0-T2 旗舰）**：权威文档路径引用漂移校验器 + 接 CI（fail-closed）。
  - **G-B**：`verify_project_drift.py`（DL-GOV-130）接 CI 聚合器。
  - **G-C**：`paths.json` machine-readable 安装策略（`allowAutoInstall=false` + 官方源约束）+ CI 断言。
  - **G-D**：Host adapter 逐宿主资格矩阵数据（对既有 `readiness-host-matrix.schema.json` 填充 + 校验；E3/E4 腿 = DECLARED，不 EXECUTE）。
  - **G-E**：Workbench UI 批次（preflight 面板、token 库、host session 面板、BOM、rollback、evidence 视图、项目库；全部绑定真实 `/api`）。
- **owner-gated（保留任务文档，不执行操作层）**：真实 Host E3 / Human Jury E4 / 商业视觉链 E5 数据腿 / 模型 H3 live / 分支删除 / `#149` 手动合并。

## 3. 执行批次（agent 授权结构层，顺序 = 反漂移优先级"先闭合结构缺口"）

| 批次 | 内容 | 交付 |
|---|---|---|
| **PR-A（本 PR）** | RAW + 本 CROSSWALK + rebind 投影 | 拆解入账，**不**执行任务清单 |
| **PR-B（G-A 旗舰）** | `verify_authority_path_refs.py`（权威文档/`paths.json`/`external-assets-index.json` path 引用全命中 tracked、不存在即 FAIL；缺文件 FAIL）+ 接 "Top-level Authority consistency gate" + 单测 | fail-closed 路径漂移门禁 |
| **PR-C（G-B + G-C）** | `verify_project_drift.py` 接 CI；`paths.json` 安装策略字段 + 断言 + 单测 | 语言漂移门禁 + 环境策略机器化 |
| **PR-D（G-D）** | `design-lab/config/host-adapter-qualification.json`（逐宿主 E-level，E3/E4 腿 `DECLARED`）+ schema 校验 + CI 断言 | 宿主资格矩阵数据面 |
| **PR-E（G-E，可能拆 2–3 PR）** | Workbench UI 批次：① preflight 面板 + token 库；② host session + evidence 视图 + BOM + rollback；③ 项目库 + case card + audit log；全部绑真实 `/api`，E2E 覆盖 | 使用层 UI 交付 |

**执行规则**：每 PR 独立、合并后 main-tip 9/9 required 全绿再开下一 PR；owner-gated 腿在任何 PR 中只写 DECLARED receipt，不 EXECUTE；`#149`（B3）保持 user-managed 不动。

## 4. 风险矩阵（采纳 RAW 评估，执行判定修正）

| 风险 | RAW 判定 | 本 CROSSWALK 修正 |
|---|---|---|
| Path Drift | 高危 | 确认为**当前最大结构风险**（F6）→ G-A 旗舰直接处置 |
| Host 漂移 | 中 | 降为中低：宿主为 Adapter 非运行依赖（ADR-001），E3 腿 owner-gated → G-D 数据面即可 |
| 模型漂移 | 中 | 高→中：`model-radar.json` + `external-assets-index.json` + doctor 已存在；残留 = 安装策略机器化（G-C） |
| UI 扩张 | 中 | 维持中：G-E 分批 + 禁幻影 KPI + E2E 门 |
| 权限扩张 | 中 | 维持中：不新建并行系统；EvidenceEnvelope 诉求并入既有合同族 |

## 5. Rollback 预案

- PR-A：文档 + 投影再生成；revert 单 commit 即可（无代码面）。
- PR-B/C/D：验证器新增为 additive（既有 CI 任务加一行调用）；revert 不影响 main 9/9 required（新检查以**新** required 检查身份加入，按 P1-2 分支保护同步更新保护配置，owner 可见）。
- PR-E：workbench 组件面 revert 独立；`/api` 端点不动则 UI 回退无数据耦合。

## 6. 不采纳项（RAW 提议但否决）

1. 新建 `docs/authority/authority-index.yaml` — 与既有 `.project/governance/authority-index.json`（v2 + CI gate）构成第二 ledger → 反漂移规则否决。
2. 新建 `EvidenceEnvelope v2` 并行系统 — 既有证据合同族 + B5 校验器已覆盖语义 → 否决，仅 G-D 数据面。
3. 按 RAW 分支表清理 `codex/*` 分支 — 该表不存在于 live 仓（F2/F3）→ 无对象可操作；分支清理仍走 owner-gated 既有台账（`reports/current/BRANCH-CLEANUP-CANDIDATES.json`）。
