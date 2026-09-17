# DESIGN-LAB 再审计 2026-09-14｜DeepSeek 可执行批次 — 交接（HANDOFF）

批次：MONITORING-INTAKE-20260915 / DL-AUDIT-20260914。分支：`codex/deepseek-authority-r1`。
执行者：DeepSeek（结构/离线/门控）。本文是 **tracked 权威交接**，与
`.project-local/task-artifacts/audit-20260915/`（运行数据，不入库）配套。

## 1. 执行摘要

再审计任务包 18 项（`DESIGN-LAB-REAUDIT-20260914.zip` → `tasks-proposed.json`）。
按「操控软件类 + 设计验收类暂不执行」的指示：

- **任务 01–10（结构/离线/门控）：全部完成并本地实证。**
- **任务 11–18（真实宿主操控软件 + 专业设计验收）：按指示跳过**，
  交接边界写入 `.project-local/task-artifacts/audit-20260915/skip-handoff-11-18.md`，
  交 Codex + Human 执行。
- 3 份伴随审计文件（08 工作区接入交接 / 01 审计报告 / 05 附件完整性 JSON）
  的有用项已并入（Penpot 不升级默认底座、资产交换损失、来源去重命名空间、工作簿 7 组结论）。

### 逐项交付状态（任务 01–10）

| 任务 | 交付物 | 状态 |
|---|---|---|
| 01 证据摘要绑定 | `src/design_lab/governance/worktree_digest.py`（统一内容绑定摘要）接入 reporting/ledger/bound-suite | TESTED_LOCAL |
| 02 完成状态与证据核验 | `.project-local/.../audit_02_status_verification.py`：58 项证据完整性全 PASS，C030/G000/H010/H020 逐项裁定，不批量清零 | AUDITED_LOCAL |
| 03 零外溢检测 | `scripts/verify_zero_spill.py`：DENIED_REPO_ROOTS、`--external` 禁止目录、junction→INCOMPLETE（fail-closed）、`resolve_interpreter()` | TESTED_LOCAL |
| 04 任务资源预检 | `src/design_lab/runtime/task_resources.py` + `design-lab/config/task-resources.json` + `doctor --task FULL_ID` + `/api/task-preflight` | TESTED_LOCAL |
| 05 来源锁与启用资格 | `scripts/verify_source_lock.py`：46 条逐项追溯门（url 39/46、revision 0/46、digest 40/46、license 46/46，4 条 INERT 禁止执行，不编造 commit） | IMPLEMENTED_LOCAL |
| 06 可安装与干净环境 | 4 个验证器移除 `.venv/Scripts/python.exe` 硬依赖，平台中立解释器解析；fresh-clone 9 阶段 PASS | TESTED_LOCAL |
| 07 CI 接入与延期拆分 | `scripts/verify_authority_gates.py` 聚合门 + CI `authority-gate` job；测试清单 hash/平台/顺序/seed 绑定；**1392 全量单独记 DEFERRED** | TESTED_LOCAL |
| 08 语言与遗留收尾 | ruff 0.16.7（`[tool.ruff]` 入 pyproject + CI lint 门）；F/E9 全仓归零；72 处子进程编码点加 utf-8；F 类 73 处真缺陷全修 | TESTED_LOCAL |
| 09 证据持久与回收 | `.project-local/.../evidence_census.py` + `evidence-census.json`：4579 MiB 只读普查，3294 MiB 标 RECLAIMABLE_WITH_COPY（带恢复路径），未删除 | AUDITED_LOCAL |
| 10 最终审计 + PR 准备 | 候选固定 HEAD `f82f17ee` + worktree digest `sha256:bb4feabd1992`；Final Audit note + PR 材料（审计/准备部分）；本次完成 push | PREPARED→PUSHED |

## 2. 外溢追踪与项目瘦身（本次附带完成）

按 `evidence-census.json` 的 `reclaim_rule`，分三层 fail-closed 回收，
`.project-local` 由 **4802 → 3158 MiB（净回收 1.64 GiB）**：

- **TIER-1 可再生缓存（800.30 MiB）**：pycache/pip-cache/uv-cache×2/fresh-clone
  （`verify_fresh_clone.py` 开头即 rmtree 重克隆，已实证自我重建 9 阶段 PASS）。
- **TIER-2 lockfile 可验证（802.1 + 41.8 MiB）**：comfy/workbench venv、wheel-build
  （uv.lock 可重装）；import-qualification 的 requirements.txt **先备份到 `spill-backup/`** 再删；
  bundle-candidates 按 SHA-256 去重（删 3 个重复，保留 7 个唯一 zip 证据）。
- **TIER-3 网络恢复组（1991.4 MiB，保留未删）**：o6-01/ocr/asr/playwright，
  恢复需网络重下模型与浏览器（本主机网络不可靠）→ **待授权 `--include-networks`**。
- 主动保留：`lint-tools`（ruff 在用）、`state.db`、`projects/` bundle store、`task-artifacts` 证据。

**外溢追踪（项目外）**：无 DESIGN-LAB 外溢根；`D:\tmp`（1.19 MiB，blog/mm html + `oh/` 浅克隆）
非本项目归属，保留未动；E 盘未触碰。脚本与报告：
`.project-local/task-artifacts/spill-cleanup-tier1.py` / `tier2.py` / `spill-cleanup-report.md`（运行数据，不入库）。

## 3. 验收证据（全实证，非一次绿测）

| 检查 | 结果 |
|---|---|
| ruff F/E9 全仓 | 0 violation（`All checks passed!`） |
| 权威门链 7 门 + zero-spill-pair | **7/7 PASS**（`AUTHORITY_GATES=PASS gates=7 failed=none`） |
| 220 关键集（forward/reverse/random + 重复） | `TEST_GATE=PASS`；164×3 顺序回归 rc=0 |
| `verify_fresh_clone.py` | 9 阶段 PASS（1907 tracked 文件在位，install=NOT_VERIFIABLE/uv 缺失） |
| 改动/新增 .py 逐文件 AST | 全编译过（0 语法错误） |
| `git diff --check` | CLEAN（0 warning；1 处 CRLF 行尾异常已归一 LF） |
| CRLF 全仓扫描 | 127 改动 .py 仅 1 处异常（`test_reconstruction_semantics.py`），已修复 |

## 4. 问题（定性，非本轮回归）

- **`reconstruction` 模块 13 个 ERR（`No module named 'reconstruction'`）**：
  HEAD 版与 F401 删除后版产生**完全相同**的 13 个 ERR → 属既有环境条件
  （`reconstruction` 是仓库内 `packages/capabilities/reconstruction` 包，需 uv ci-adapters 组
  或 packages 入 sys.path），**非本轮 F401 改动引入**；该文件不在 16 个 CRITICAL_MODULES，
  属全量 1392 范围。
- **CRLF 行尾异常**：`test_reconstruction_semantics.py` HEAD 为纯 LF、工作区被转全 CRLF，
  全仓唯一；已归一 LF，`git diff --check` 彻底干净。
- **F401 删除安全性**：被删 import 的方法体只用 `self._descriptor()/self._request()`
  助手（各自在 409/419 行独立 import），不直接引用被删名字 → 删除安全、无回归。

## 5. 阻塞（需宿主 / 需授权 / 非本批范围）

| 项 | 说明 | 解除条件 |
|---|---|---|
| 全量 1392 三顺序 | host 0x4E 写 `C:\Windows\MEMORY.DMP` 风险，独立记 DEFERRED，不吞进 220 判定 | 低内存窗 / 另择宿主 |
| uv 不可用 | 系统无 uv，`reconstruction` 13 ERR 与 fresh-clone 的 install 阶段 NOT_VERIFIABLE | 安装 uv（DLDS-H020） |
| TIER-3 网络组 1991 MiB | 模型缓存 o6-01/ocr/asr + playwright，恢复需网络重下 | 授权 `--include-networks` |
| 任务 11–18 | 真实宿主（PS/AI/M1/Comfy/音视频/Blender）+ 人工设计裁决 | 交 Codex/Human 执行 |
| `D:\tmp\oh` 旧浅克隆 | 非 DESIGN-LAB 归属 | 用户定夺 |

## 6. 双端一致性验证

本批次以一次 commit 推送。推送后必须验证 **本地与远端同 SHA**：

```
git rev-parse HEAD
git ls-remote origin codex/deepseek-authority-r1
# 两者须一致；并确认远端无 ahead 提交
git fetch origin && git rev-list --count HEAD..origin/codex/deepseek-authority-r1   # 期望 0
```

推送前门链 7/7 PASS 为结构证据；**远端 CI 跑完 `authority-gate` job 后才算双端完整验收**
（本地 PASS 不替代 CI，1392 全量仍在各自 DEFERRED 状态）。
