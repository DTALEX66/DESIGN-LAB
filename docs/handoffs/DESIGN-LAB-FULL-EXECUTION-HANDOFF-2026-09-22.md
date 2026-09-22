# DESIGN-LAB 全量执行交接（2026-09-22）

> 面向云端审计模型（GPT/Codex/任意独立审计者）的自包含交接。
> 本文档在 `docs/handoffs/`（git-tracked）。所有结论均附可独立复核的
> 命令、SHA、run 链接。未证明项全部显式列出，无虚报闭环。

## 0. 审计总表（先读这张）

| # | 审计对象 | 类型 | 精确引用 | 状态 |
|---|---|---|---|---|
| 1 | UI Slice 1+2 合并记录 | main commit | `d26cbc8`（PR #135 squash） | MERGED，7/7 checks 绿 |
| 2 | 后端批 1（P1-7 + P1-1） | main commit | `cb5d26f`（PR #136，update-branch 后新 head `9a62151`） | CI 重跑中（基线已对齐 `d26cbc8`） |
| 3 | UI 视觉系统单一事实源 | 仓库文件 | `design-lab/config/design-tokens.json` | 在 `d26cbc8` 内 |
| 4 | AppShell 12 路由实现 | 仓库文件 | `apps/workbench/main.ts` 尾部模块 + `apps/workbench/style.css` 尾部块 | 在 `d26cbc8` 内 |
| 5 | 换肤/IA 技术验收报告 | 仓库文件 | `docs/handoffs/DESIGN-LAB-UI-AUDIT-CONVERGENCE-2026-09-22.md` | 在 `d26cbc8` 内 |
| 6 | release-gate tag 触发修复 | 仓库文件 | `.github/workflows/release-gate.yml` | 在 `cb5d26f` 内 |
| 7 | wheel/sdist node_modules 排除 | 仓库文件 | `pyproject.toml` + `design-lab/scripts/verify_workbench_packaging.py` | 在 `cb5d26f` 内 |
| 8 | 全量审计 TaskPack（28 章） | 项目内 artifact | `.project-local/artifacts/dl-deep-audit/REPORT-SKELETON.md` | **gitignored，不在 GitHub**（见 §6 说明） |

## 1. 执行基线

- 仓库：`DTALEX66/DESIGN-LAB`，默认分支 `main`
- 本轮起点：`6a16c40`（P1-CONTROL-SPIKE + P1-RECOVERY 合并后）
- 本轮终点（截至本文档提交）：`main` 含 `d26cbc8`（#135）；`cb5d26f`（#136）待 CI 收敛合并
- 云端 main 实时核验（审计者执行）：
  `git fetch origin && git log --oneline -6 origin/main`

## 2. 前端交付（Slice 1+2，PR #135 → `d26cbc8`）

**Slice 1 — 权威换肤**
- `apps/workbench/style.css`：全色值切到 UI套件 B04 Design Tokens（深黑 `#060A14` + Electric Blue `#316CFF`），`:root` 即 design_lab 主题挂载点
- 新增 `design-lab/config/design-tokens.json`：库内单一事实源（库索引红线第 5 维）
- 视觉铁律遵守：黑/深灰 + 白 + 电蓝；紫色只进创意内容，不作系统主色
- 旧色 `#146e65`(teal) / `#f1f3ef`(浅底) 全部清除，无残留

**Slice 2 — AppShell 12 路由 IA（B07 routes.json 权威）**
- `main.ts` 尾部纯增量 `mountAppShell()`：左侧 12 路由导航 + hash 路由
  - 守卫：`document.body` + `window` + 幂等 flag + login 存在，vm 单测安全
  - 零 runtime import → bundle 仍无顶层 import/export（classic-script 可载）
  - 空 hash = 原工作台逐字节不变 → 浏览器 E2E 零影响
- 4 视图绑**真实 API 读回**（禁幻影 KPI）：
  - 仪表盘 `/health`+`/projects`+`/design-systems` 真实 KPI
  - 品牌系统 `/design-systems`
  - 预检QA `/task-preflight` fail-closed 读回（服务端 400 即拒，不写入判定）
  - 系统设置 `/environment` 只读诊断（含外置输入 DECLARED_NOT_PROBED 表）
- 7 个无后端路由的 IA 槽位**诚实标"未开放+原因"**（不造数据）
- B07 域状态机 8 阶段（brief→archived）契约可视化进仪表盘，明示"契约可视化，不代表进度"

**前端证据链（在 `d26cbc8` 可复核）**
- 三链：`pnpm typecheck` / `pnpm build` / `test:unit` 全绿；bundle 53.87kB
- 浏览器 E2E（真实 Chromium 1228 + 真实 loopback）：几何修复后重跑 PASS 2.9s
- 选择器超集：OLD=67 全保留，NEW=96，MISSING=0
- 视觉验收 4/4（192px 统一左锚点 / 12 导航完整 / 无错位重叠 / 无旧皮肤残留）
  - 效果图存 `.project-local/ui-kit/mockups/`（gitignored，本地证据）

## 3. 后端批 1（P1-7 + P1-1，PR #136 → `cb5d26f`）

**P1-7 · release-gate tag 触发器**（`.github/workflows/release-gate.yml`）
- 缺陷：`on:` 只有 `workflow_dispatch`，tag-only preflight 步
  （`if: startsWith(github.ref, 'refs/tags/')`）不可达——打 tag 永不触发 E5 gate
- 修复：新增 `push: tags: ['*']`（additive，保留 dispatch）
  - `*` 刻意放宽：本仓 0 tag、无发布 tag 命名约定；广匹配 + fail-closed gate
    （INCOMPLETE/BLOCKED，绝不误 PASS）不可能产生假发布；tag 约定建立后收紧为 `v*`
- 验证：YAML 解析通过，`on` = {workflow_dispatch, push}，push.tags=['*']

**P1-1 · wheel/sdist node_modules 排除**（`pyproject.toml` + 守卫脚本）
- 缺陷：旧整目录映射（wheel force-include + sdist only-include 的 `apps/workbench`）
  在开发机构建时把 `node_modules`（~30MB/251 文件）拖进 wheel，与 CI 干净
  checkout 的 ~0.5MB wheel 漂移
- 修复：两个 target 各只含服务端实际服务的 3 个文件（workbench.py ROUTES：
  `index.html` / `style.css` / `build/main.js`）
- 同类修到根：`verify_workbench_packaging.py` check 5 扩展——要求 3 条精确
  wheel 映射 + 3 条 sdist 条目，**整目录映射回归即 FAIL-CLOSED**（负控）
- 验证：守卫 5/5 PASS；tomllib 断言 wheel=3 条 workbench 映射、sdist 恰 3 文件、无整目录

**#136 CI 状态（审计者实时核验）**
- 原 head `cb5d26f` 基于旧 base `6a16c40`，#135 并入后变 BEHIND（strict protection）
- 已 `gh pr update-branch 136`：新 head `9a62151`，base 对齐 `d26cbc8`
- 合并前必须：`gh pr checks 136 --required` 7 项全 pass（mergeStateStatus=CLEAN）

## 4. 后续批次（未开始，按优先级）

| 批次 | 内容 | 前置 | 状态 |
|---|---|---|---|
| P1-3 | 库索引 4 文件一致性守卫（paths.json/external-assets-index/model-radar/task-resources cross-check） | 独立，纯 CI verifier | 未开始 |
| P1-2 | branch protection 补 2 个 required checks（no-skip E2E + DeepSeek authority chain） | 需 repo admin API PUT + 读回 9 项 | 未开始 |
| P1-4 | Adobe/MiniMax host E3 adapter（PS UXP + Acrobat REST） | owner-gated，真实 host readback | 未开始 |
| P1-5 | H3 本机硬件不可达（RTX 5060 8GiB EXCEEDS + BLOCKED_BY_LICENSE） | owner 裁 license / ≥24GiB GPU | 未解决（owner-gated） |
| P2 | 35 远端分支清理（28 MERGED + 4 PARTIAL_RESIDUAL + 3 保留） | owner 批准后删 | 未开始 |
| UI 组件深化 | PreflightIssue / QualityScore / ControlMatrix / LibraryIndex 等 10 组件 | Slice 2 已落 | 下一轮 |

## 5. 未证明 / 边界（审计者勿当闭环）

1. **真实 Host E3 / MiniMax live**：控制矩阵=DECLARED，真实运行 owner-gated（P1-4）
2. **E5 tag**：本仓 0 tag，release-gate tag 触发虽已修复（P1-7）但**从未真实打 tag 验证过**
3. **H3 本机**：8GiB EXCEEDS（需 20/12/8/4GiB）+ BLOCKED_BY_LICENSE，model-radar 机器态未达
4. **效果图 / 视觉验收**：本地真实 Chromium 截图 + 视觉核验通过，属 E2 受控运行，**非 E4 人工陪审**
5. **云端 CI 证据**：#135 的 7/7 全绿（Python gate 6m40s / 8m5s pass）；#136 的 CI 在 update-branch 后重跑，**合并前必须读回 7/7 pass**

## 6. 数据边界声明

- 本交接与全部技术验收报告在 `docs/handoffs/`（git-tracked，云端可审计）
- 全量审计 TaskPack（28 章）在 `.project-local/artifacts/dl-deep-audit/REPORT-SKELETON.md`
  —— **`.project-local/` 是 gitignored 项目运行数据，不在 GitHub**。云端审计者要读它须按
  §7 路径指引；若只需审计代码/CI/合并证据，`docs/handoffs/` + git 历史 + Actions runs 已自包含
- 4 层库索引权威路径（红线第 5 维）：
  `.project/paths.json`（4 shared_inputs 根→D:）/ `design-lab/config/external-assets-index.json`（H3 权重）/
  `design-lab/readiness/model-radar.json`（H3 BLOCKED/EXCEEDS）/ `task-resources.json`；
  消费方 `runtime/paths.py` 只读拒 junction（`DECLARED_NOT_PROBED`）

## 7. 审计者快速复核命令集

```bash
git clone https://github.com/DTALEX66/DESIGN-LAB
cd DESIGN-LAB
git log --oneline -6 origin/main          # 看 d26cbc8(+#136 合并后) 是否在 main
gh pr view 135 --json state,mergedAt      # 确认 #135 MERGED
gh pr view 136 --json state,mergeStateStatus   # 确认 #136 合并态
gh pr checks 136 --required                # #136 7 项 required
python design-lab/scripts/verify_workbench_packaging.py   # P1-1 守卫 5/5
# P1-7 触发器字面核验：
python -c "import yaml;d=yaml.safe_load(open('.github/workflows/release-gate.yml'));print((d.get('on') or d.get(True)).get('push',{}).get('tags'))"
```
