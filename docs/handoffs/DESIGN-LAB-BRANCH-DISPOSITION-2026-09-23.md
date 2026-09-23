# DESIGN-LAB 分支处置台账（9 独有分支，2026-09-23）

> 顶层权威从属 `/AUTHORITY.md` (`DL-AUTHORITY-2026-09-18-R2`)。本台账是
> 分支审计 + 处置的**机器账本**，记录 9 个持有未上云独有提交的历史分支的
> 判定与执行结果。每条判定附 blob / 冲突 / 迁移主路径铁证，可独立复核。
> 生成器：手工审计（`git merge-base --is-ancestor` + `git merge-tree --write-tree`
> + 逐文件 `git cat-file` 比对），非自动汇总。

## 审计方法（可复现命令）

```bash
# 1) 分支独有提交 & 是否在 main 线性历史
git merge-base --is-ancestor <branch> main      # rc=0 => tip 已在 main
git rev-list --count main..<branch>            # 独有提交数

# 2) 合并可行性（非破坏性，只写临时 tree 对象）
git merge-tree --write-tree main <branch>     # 输出含 "CONFLICT" 行 => 不可干净合入

# 3) 内容级吸收判定（旧布局 vs main 新布局）
git cat-file -e main:<path>                    # 文件是否在 main
git show <branch>:<path>  | wc -c             # blob 尺寸对比
```

## 判定总表（合并 0 · 删除 4 · 冻结 5）

| 分支 | tip | 独有 | 冲突 | 判定 | 铁证 | 处置 |
|---|---|---|---|---|---|---|
| `codex/a1-provider-spi` | e879a9c | 25 | 16 | **删** | 旧路径 `design-lab/reconstruction/`；main #112 已迁 `packages/capabilities/reconstruction/`（34 文件）；12 关键模块逐一 byte-identical/main 超集，**0 函数丢失 0 孤文件** | 远端+本地已删，tip 存 `superseded-tip/codex-a1-provider-spi` |
| `codex/a2-semantics` | 36672f5 | 27 | 19 | **删** | 同 a1（超集）；`omniparser/paddleocr/font_match/geometry/evidence/state/metrics/pipeline/svg/intake/contracts/render` 全部被 main 吸收 | 远端+本地已删，tip 存 `superseded-tip/codex-a2-semantics` |
| `docs/oda4-1101-gate` | d746b95 | 1 | 0 | **删** | `reports/ODA4_1101_LOCAL_CANONICAL_GATE.md` 已迁 main `reports/history/`；本分支文件 blob 与下条**完全相同** | 远端+本地已删，tip 存 `superseded-tip/oda4-1101-gate` |
| `feat/oda4-0118-1005-0807` | 5a90c0b | 1 | 0 | **删** | 纯重复分支（同 blob `3539f53a`、同 39 行内容） | 远端+本地已删，tip 存 `superseded-tip/oda4-0118-1005-0807` |
| `feat/ucr-activation` | 0415e5a | 1 | 0 | **冻结** | UCR-R1 taskpack（`DL-TP-20260918-UNIFIED-CONVERGENCE-R1`）是现顶层权威 `FINAL-AUTHORITY-CONVERGENCE-R2` 的结构前继血统记录；不删保留 | 远端保留 |
| `feat/comfyui-e3` | aecccce | 2 | 3 | **冻结** | 2026-08-14 旧布局 E3 证据；main 已迁 `integrations/generators/comfyui/`（16 文件全在），证据已收 | 远端保留 |
| `fix/registry-quarantine-sync` | 7f48c7b | 3 | 4 | **冻结** | ai-product-os 隔离同步；main 的 SOURCE_REGISTRY 已外化（无该条），4 冲突全为新旧路径错位 | 远端保留 |
| `fix/r4-h3-prod-e3` | f21a95b | 2 | 19 | **冻结** | H3 证据 delta 旧布局，main 新路径已收；硬合会复活旧目录 | 远端保留 |
| `fix/design-lab-governance-closure-r4` | f8ce6c0 | 22 | **137** | **冻结** | 迁移前 R4 治理基线快照（240 文件）；137 冲突 = 旧布局 vs main 新结构，历史证据 | 远端保留 |

## 枢纽铁证（reconstruction 模块迁移）

main 于 #112（`c9cde8a` 2026-09-04，DL-DIR-MIG-R1）将 `design-lab/reconstruction/`
迁移到 `packages/capabilities/reconstruction/`（34 文件）。a1/a2 持 2026-08-23 旧树
（tip 早于迁移 11 天）。逐文件比对 12 个关键模块：

| 模块 | a2 字节 | main 字节 | a2 def 数 | main def 数 | 判定 |
|---|---|---|---|---|---|
| omniparser_provider.py | 3143 | 3143 | 4 | 4 | byte-identical |
| paddleocr_provider.py | 11771 | 11771 | 16 | 16 | byte-identical |
| font_match.py | 7413 | 7413 | 12 | 12 | byte-identical |
| geometry.py | 12530 | 12530 | 12 | 12 | byte-identical |
| evidence.py | 119794 | 122202 | 58 | 62 | main 超集 |
| state.py | 78272 | 78322 | 45 | 45 | main 超集 |
| metrics.py | 30147 | 30147 | 13 | 13 | byte-identical |
| pipeline.py | 31930 | 32027 | 26 | 26 | main 超集 |
| svg.py | 20487 | 20487 | 16 | 16 | byte-identical |
| intake.py | 22998 | 24419 | 24 | 24 | main 超集 |
| contracts.py | 13960 | 15100 | 12 | 12 | main 超集 |
| render.py | 64366 | 64519 | 41 | 42 | main 超集 |

**0 个 a2 文件在 main 无对应、0 个函数丢失** → 旧快照 100% 被 main 吸收，删除无数据损失。

## 回滚保护（可逆）

4 个已删分支的 tip SHA 各存一个 `superseded-tip/*` 标签，**已推到远端**：

```bash
git ls-remote origin 'refs/tags/superseded-tip/*'
# superseded-tip/codex-a1-provider-spi -> e879a9c
# superseded-tip/codex-a2-semantics     -> 36672f5
# superseded-tip/oda4-1101-gate        -> d746b95
# superseded-tip/oda4-0118-1005-0807   -> 5a90c0b
# 恢复任意一条：git fetch origin && git checkout -b <new> <tag>
```

本地 `.hermes/w/a1`、`.hermes/w/a2` 两个 codex worktree 已 `git worktree remove`
清理（运行数据，非 tracked）。

## 当前远端 refs（处置后）

`main` + 5 冻结分支（`feat/comfyui-e3` / `feat/ucr-activation` /
`fix/design-lab-governance-closure-r4` / `fix/r4-h3-prod-e3` /
`fix/registry-quarantine-sync`）+ 4 个 `superseded-tip/*` 回滚标签。

## 红线遵守

- 外置库 4 权威索引（paths.json / external-assets-index / model-radar /
  task-resources）+ design-tokens 第 5 维：**未触碰**（本台账只处理分支 refs）。
- E 盘：未访问。
- 冻结的 5 分支含 owner-gated 实操证据（H3/ComfyUI E3、R4 治理基线）与权威
  血统前继（UCR-R1），**删除即丢审计线**，故保留远端 ref，不作为删除对象。
