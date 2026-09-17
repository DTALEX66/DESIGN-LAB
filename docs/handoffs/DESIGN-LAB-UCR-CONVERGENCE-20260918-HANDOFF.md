# UCR 统一收口 2026-09-18｜P0 / P0-A / 报告真值 — 交接（HANDOFF）

任务包：`DL-TP-20260918-UNIFIED-CONVERGENCE-R1`。主线：`main`。
执行者：Hermes Agent。本文为 **tracked 权威交接**，与
`.project-local/task-artifacts/ucr-r1/`（运行数据，不入库）配套。

## 1. 执行摘要

本会话执行统一收口 R1 的 **P0 结构收口**、**P0-A truth 批**、**报告真值批**三个
可合并批次，均已 **merge 进 main 且 exact-SHA CI 全绿**。主线合并子目标完成，
本地 ↔ GitHub 双端一致（0 open PR）。

- 主线路径：`c4dccd5`(任务包旧基线) → `6434698`(P0 前置) → `e49ebb8`(P0 收口, PR#117)
  → `619cd22`(P0-A truth, PR#118) → `ecb973d`(报告真值, PR#119 = 当前 main)。
- 6 条过时远端分支删除（归档 tip SHA 于 `.project-local/.../BRANCH-DELETE-RECORD.json`）。
- 本轮收尾清理 4 条**本地残留** `gone` 跟踪分支（远端已删、本地遗留）。

## 2. 逐项交付状态（已 merge）

| 批次 | PR | merge commit | 交付 | 证据 |
|---|---|---|---|---|
| P0 结构收口 | #117 | `e49ebb8` | FA-11 task-preflight URL 解析+import 深度；FA-05 zero-spill denied 优先+权限截断→INCOMPLETE；FA-03 report check 陈旧 subject→STALE 不洗白 PASS；报告重绑 | 各 3 个锁定测试 + aggregate `VERIFY_DESIGN_LAB=OK` |
| P0-A truth | #118 | `619cd22` | FU-07/08 manifest 版本 `1.0.0`→`0.1.0-alpha.0`（对齐 pyproject 真实包事实）+ 文档路径；verifier 改 consistency gate；FU-04/05 ARCHITECTURE 重写真实树+V2/V3 降权 banner；FU-06 Ruff 单一事实 `CONFIGURED_NOT_ENFORCED` | 聚合 549/0 + manifest 493/0 + CI 全绿 |
| 报告真值 | #119 | `ecb973d` | FU-09 重绑主线；FU-10 报告改绑 **input-digest + tree-scope**（非自指 commit-SHA），新增 3 个锁定测试 | `CURRENT_REPORTS=PASS` + 33/33 + CI 全绿 |

## 3. 双端一致性（本地 ↔ GitHub）

| 项 | 本地 | 远端 | 一致 |
|---|---|---|---|
| `main` | `ecb973d` | `origin/main`=`ecb973d` | ✅ |
| Open PR | — | 0（#117/#118/#119 merged） | ✅ |
| 过时分支 | 4 条 `gone` 残留**已清** | 24 条（远端删 6 后） | ✅ |

保留的本地 WIP 分支（**进行中工作，非不一致**）：
- `feat/ucr-activation`：UCR 任务包文件已落仓（激活条件 1/5），未推远端。
- `feat/ucr-workbench-strict-ts`：Workbench strict-TS，工作树 8 文件未提交。

## 4. 未完成 / 阻塞

- **UCR-E（Workbench strict-TS）**：进行中。暂停点矛盾——`workbench.py` 路由指向
  `dist/main.js`，但 `vite.config.ts` 设 `outDir:'build'` 且 `.gitignore` 忽略 `dist/`，
  三者须先统一（build vs dist + gitignore 否定规则）再继续。
- **UCR-ACT（任务包激活）**：`AGENTS.md` 写入被受保护 agent-instruction-file 闸门拦截，
  审批 prompt 超时=未获同意，不得绕行。需用户显式批准后才能完成条件 2–5。
- **UCR-S2（Vertical Slice：Project→Brief→Reference→Direction→DesignSystem）**：未开始。

## 5. 遗留工具链事实

- 本地全量验证器须用 `.venv/Scripts/python.exe`（Python 3.13 + jsonschema 4.26.0）；
  wrapper 的 uv Python 3.11 缺 jsonschema。
- Windows/Git：CRLF 规范化；含路径的 commit 消息走 `git commit -F <file>`；多行 PR body 走 `--body-file`。
