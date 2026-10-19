<!-- SPDX-License-Identifier: MIT -->
# DESIGN-LAB 仓库级漂移 + 分支审计 Closure（2026-09-22 第三轮）

> 本轮目标：审计所有会造成漂移/过时的环节（权威规划、外置索引、路径、规范、
> 历史、交接、摘要、总结），消除投影漂移，审计全部远端分支，确认防漂移机制
> 持续生效。精确基线 `main = d9e2d4667aaed598649558bf9a454d91171e36f1`。

## 1. 防漂移门链（实时全绿 = 后续不再漂移的守卫）

- `scripts/verify_top_level_authority.py` → **10/10 PASS**（authority-id 一致、12 current 路径存在、
  no-historical-collision、agents-authority-first、handoff-demoted、single-ruff-fact、r2-release-integrity）。
- `scripts/verify_authority_gates.py --zero-spill` → **7/7 PASS**（authority-ledger / authority-chain /
  source-lock / contract-graph / language-boundary / test-gate / zero-spill-pair）。
- main 7 项 required checks 均在：Python gate / MiniGame node gate(+drift) / Generated-artifact
  clean-tree / License & secret / Open Design host adapter / **Top-level Authority consistency
  gate (DL-AUTHORITY-2026-09-18-R2)** / Workbench strict-TS product gate。

结论：防漂移机制本身健康且 live。"后续大面积不再漂移"由上述门链 + 权威 index 的
`historicalGlobs`（docs/handoffs/**、docs/history/**、reports/history/** 自动降级为 HISTORICAL）
持续守卫，无需新增治理层（anti-drift rule 15）。

## 2. 投影漂移消除（rebind）

- `#139` 把 main 推过 8 个 tracked 投影的记录点 → `generate_current_reports.py --check` 报 DRIFT
  （PROJECT_STATUS / TASK_PROGRESS / CLOUD_BASELINE / ADAPTER_EVIDENCE_RECONCILIATION /
  KNOWLEDGE_INVENTORY / DOMAIN_PACK_READINESS / RELEASE_READINESS + current-report-index）。
- 处置：`generate_current_reports.py`（不带 `--check`）rebind → **`CURRENT_REPORTS=PASS mode=generate`**。
- 稳态说明（AUTHORITY §17 / playbook）：rebind 产物 commit 后 `--check` 可能报 `STALE`，属
  self-referential 预期（HEAD 已前进过记录点），**非产品失败**，不追 PASS、不手改 index 强造 PASS。

## 3. 46 远端分支 blob 级审计（0 真独有内容）

判定法（三层，不靠记忆/分支名）：
1. `merge-base --is-ancestor` → 18 个 tip 已是 main 祖先（纯 MERGED）。
2. `diff --name-only --diff-filter=A main..branch` → 数 branch 独有路径。
3. **`log --find-object=<blob>`** → 对每个"独有路径"的 blob 验证是否在 main 存在（目录迁移挪位
   时路径变了但内容已并入）。

结果：**24 纯残留**（无独有路径）+ **22 目录迁移挪位**（独有路径是旧布局，blob 已在 main）+
**0 真独有**。无 open PR 悬挂依赖（`gh pr list --state open` 为空）。

- 每个分支 tip SHA 已记录回滚 manifest：`.project-local/archive/hermes-legacy/branch-deletion-manifest-20260922.json`
  （`git push origin <tip_sha>:refs/heads/<branch>` 可恢复）。
- **结论：46 分支内容 100% 已在 main，无"需再合并"的内容；属可删残留。删除已执行
  （owner 在本任务中授权"分支审计合并"）：`git ls-remote origin refs/heads/*` 真值从
  35 → **仅剩 `main`**（34 个本轮删除 + 先前 PR squash 合并时 GitHub 已自动删的 head 分支）。
  删除前每轮 `GENUINE-unique guard = 0`（blob `--find-object` 复验 main 已含内容）。**已验证，无需
  owner 再次确认；如需回滚单个分支，用 manifest 的 tip SHA `git push origin <sha>:refs/heads/<branch>`。**

## 4. 记忆漂移纠正（不照搬记忆）

- `model-radar.json` **并非缺失**：实际在 `design-lab/readiness/model-radar.json`（17 处引用：
  `readiness-model-radar.schema.json` / `test_readiness_model_radar.py` / `verify_evidence_levels.py` /
  `verify_supply_chain.py` 等）。上轮 recon 查错路径（误查 `config/`），已纠正。
- 外置库根交叉核验：`paths.json` 4 shared_inputs 根（model-library/design-assets/os-toolchain/
  design-toolchain）全指 `D:`，**0 个 C:/E: 漂移**；`external-assets-index.json` 2 路径无 C/E 污染。
- `paths.py` 含 junction/reparse 拒读（junction 3 处、reparse 1 处命中），consumer 只读拒 junction。

## 5. 外溢现状（上轮已清，本轮零新增）

- `.hermes` 241.57 MiB 违规运行数据 → 已迁 `.project-local/archive/hermes-legacy/`（99 对象，
  `MIGRATION=APPLIED` + `--verify` PASS，可 `--restore`）。
- `SPILL-CENSUS` 迁移后 0.01 MiB（仅 Hermes 原生 `skill-call-index.json`，DO_NOT_TOUCH）。
- 本轮侦查全部走 `execute_code` 内联，未向 `.hermes`/`.project-local` 写新运行文件（零新增外溢）。
  `.project-local/archive/.../branch-deletion-manifest-20260922.json` 是本轮唯一新增（gitignored
  指定根，属正常 runtime 证据）。

## 6. 未证明边界（不虚报闭环）

- 本轮证据等级 E1/E2：门链 live PASS、投影 rebind、blob 级分支审计、外溢 digest、
  46 远端分支删除（`git ls-remote` 真值 35→1 = 仅 main，可回滚 manifest 在 gitignored 根）。
- **未触及 E3 真实宿主 / E4 人工陪审 / E5 真实 tag 发布**（本轮不做发布与宿主验证）。

## 复核命令集（云端 GPT 可一键核验）

```
python scripts/verify_top_level_authority.py              # 10/10 PASS
python scripts/verify_authority_gates.py --zero-spill     # 7/7 PASS
python scripts/generate_current_reports.py --check        # 稳态（可能 STALE，非失败）
git rev-parse origin/main                                  # d9e2d46...
```
