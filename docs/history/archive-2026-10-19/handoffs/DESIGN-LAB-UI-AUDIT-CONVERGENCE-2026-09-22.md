# DESIGN-LAB UI 审计与视觉系统收敛（UI套件 → 本项目）

<!-- SPDX-License-Identifier: MIT -->

日期：2026-09-22 · 基线：main @ 6a16c40 · 状态：Slice 1 已交付（工作区，待视觉验收）

## 1. 权威来源（UI套件，仅读取未修改）

来源：`D:\All projects\UI套件`（三项目 UI 总套件），DESIGN-LAB 相关批次已解压至
`.project-local/ui-kit/`（项目内工作数据，gitignore，不入仓）。

| 权威层 | 文件 | 关键结论 |
|---|---|---|
| 视觉铁律 | `00_批次顺序_文件映射_权威规则.md` + `01_使用说明_文件对应表.md` | 黑/深灰 + 白 + Electric Blue；**紫色只进创意内容，不做系统主色**；三项目共享组件方法论/可访问性/动效节奏，**不共享品牌皮肤** |
| Design Tokens | `B04 DESIGN-LAB_design_tokens.json`（= L4） | `#060A14` 深黑 / `#316CFF` Electric Blue，**双源一致** |
| 前端治理 | `B07/theme/tokens.css` + `base-tokens.css` + `FRONTEND_GOVERNANCE.md` | 主题值**只走 CSS 变量 + `data-theme`** 隔离；组件必须继承共享基础类 |
| 组件契约 | `B07/shared-ui-core/component-registry.json` | 30 组件 6 族，DESIGN-LAB 专属 10 个 |
| IA / 状态机 | `B07/routes/routes.json` + `pages/page-map.json` + `state/domain-state-machine.json` | 12 路由页；域状态机 brief→…→delivered→archived（NEXT/BACK 双向） |
| 提示词契约 | `11_CODEX_UI开发提示词/03_DESIGN-LAB_UI开发提示词_CODEX.md` §0 | **存在真实数据协议时必须适配它，只有无前端基座时才参考 B08 React/TS 原型** |

## 2. 审计结论（DESIGN-LAB 现状 vs 权威）

| 维度 | 权威（B04+B07+提示词§3） | 仓库现状（改前） | 差距判定 |
|---|---|---|---|
| 主题机制 | CSS 变量 + `data-theme` | 硬编码色值 | **P1 冲突** |
| 视觉系统 | 深黑 `#060A14` + Electric Blue `#316CFF` | 浅色纸白 `#f1f3ef` + 青绿 `#146e65` | **P1 冲突（本 slice 已修）** |
| 页面 IA | 12 路由页（Dashboard→Settings） | 单页 8-panel Workbench | P2 backlog |
| 组件 | 10 专属组件（PreflightIssue/QualityScore…） | 未落 | P2 backlog |
| B08 原型 | React/TS 12 页 | Vanilla TS + Vite（1045 行 main.ts） | **不迁移**（提示词 §0：有真实数据协议必须适配它） |

关键可手术性证据：

- `apps/workbench/main.ts` 全文件颜色字面量命中 **0**（颜色全在 style.css）→ 换肤不碰逻辑层
- `style.css` 不经 Vite 构建（`build/main.js` 只含 JS）→ **no-drift gate 只查 build/main.js，CSS 层手术 gate 安全**
- `main.js` 重新构建后 **byte-identical**（git status 无 diff）→ 确定性构建验证通过

## 3. 本轮交付（Slice 1：权威视觉系统入仓 + 换肤）

| 文件 | 状态 | 内容 |
|---|---|---|
| `design-lab/config/design-tokens.json` | 新增（tracked） | 单源 token 契约：color 21 / space 8 / radius 4 / font 4 / motion 3 / elevation 3 / 组件 token 8，全部映射 B04 |
| `apps/workbench/style.css` | 重写（tracked） | 全色值切 `var(--dl-* / --accent / --border / --card / --muted-foreground)`，`--dl-*` 取 B04 权威值；选择器结构零改动 |

**未自动 commit**（约定：视觉验收前不 commit）。工作区待审改动 = 上述 2 文件。

## 4. 验证证据

| 检查 | 结果 |
|---|---|
| `pnpm typecheck`（workbench） | PASS（exit 0） |
| `pnpm build`（workbench） | PASS（exit 0） |
| `pnpm test:workbench-unit` | PASS（exit 0，WORKBENCH SMOKE 全过） |
| `git status` 改动面 | 仅 `M style.css` + `?? design-tokens.json` + 本文档；`build/main.js` 无 diff |
| `#fff` 残留排查 | 唯一命中 = `button{background:var(--accent);color:#fff}`（电蓝按钮白字，正确设计，非浅色残留） |

## 5. Backlog（下一批，按提示词执行顺序）

1. ~~视觉验收：截图确认深黑/电蓝换肤~~ → **已验收**（after-skin.png 视觉核验通过）
2. ~~12 页 IA 落点设计~~ → **Slice 2 已交付（见 §7）**
3. DESIGN-LAB 专属 10 组件深化（PreflightIssue / QualityScore / ControlMatrix / LibraryIndex 等）
4. ~~Domain State Machine 可视化~~ → **Slice 2 已落仪表盘**（8 阶段契约条，标注"不代表项目进度"）
5. 浏览器 E2E 视觉回归（Playwright）纳入 CI，截图比对防换肤回退
6. 无后端路由的 7 页（研究/领域/工具/交付/证据/协作/项目台账）的后端契约设计（TaskPack B/D 批之后）

## 7. Slice 2：AppShell 12 路由 IA + 仪表盘真实读回（main.ts / contracts.ts / style.css）

| 交付 | 内容 |
|---|---|
| AppShell | 左侧 12 路由导航（routes.json 权威 IA）+ hash 路由；空 hash = 原工作台逐字节不变（E2E 零影响） |
| 真数据视图 | 仪表盘（/health + /projects + /design-systems 真实 KPI）/ 品牌系统（/design-systems）/ 预检QA（/task-preflight fail-closed 读回）/ 系统设置（/environment 只读诊断，含外置输入 DECLARED_NOT_PROBED 表） |
| 诚实未开放 | 7 页无后端路由 → 明确标注"未开放 + 原因"，未连接时提示先连接（不发 401 不造数据） |
| 契约新增 | contracts.ts +5 接口（Health/Environment/TaskPreflight*），main.ts 纯增量挂载（document.body/window/幂等 flag 三重守卫，vm 单测安全） |
| 状态机 | B07 domain-state-machine 8 阶段（brief→archived）契约可视化进仪表盘，明示"契约可视化，不代表进度" |

验证（最终态）：
- 前端三链：typecheck / build / test:unit 全绿；build/main.js 53.87kB 提交（no-drift gate 新基准）
- 浏览器 E2E（真实 Chromium 1228 + 真实 loopback 服务）：几何修复前 PASS（3.5s），CSS 修复后**重跑 PASS（2.9s）**，零回归
- 选择器超集：OLD=67 全保留，NEW=96，MISSING=0
- Python 全量契约套件：1584 tests OK（skipped=2），exit 0
- 视觉验收 4/4：192px 统一左锚点（header/main/footer/route-view 同缘）/ 12 导航完整 / 无错位重叠截断 / 深黑电蓝无残留
几何根因修复记录：`.route-panel` 初稿用 `calc((100vw-360px)/2)` 做居中内边距，但面板实际从
168px 起（inset left），基准错位导致"左空右满"且状态机条被挤出可视区；修复 = 删除所有
100vw 居中 calc，全部流元素统一锚定 192px（168 gutter + 24 内间隙，与 nav 条目 14+10 内边距同源），
route-view 取消 margin:auto 左锚定。缺陷均在 `.dl-shell` 作用域内，未挂载路径（E2E 默认）逐字节不变。
红线遵守：预检页初稿曾引用不存在的 /task-resources 端点（幻影路由），已改回真实
/task-preflight?task=… 读回 + 服务端 400 fail-closed；仪表盘删 1 张写死 KPI。


## 6. 红线遵守记录

- 外置库权威索引：`UI套件` 只读消费（解压到项目内 `.project-local`），未修改源库任何文件
- E 盘：未触碰
- 换肤未扩大范围：只动 style.css 颜色/字体/动效层，panel 结构与 main.ts 逻辑零改动
