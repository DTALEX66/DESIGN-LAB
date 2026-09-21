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

1. **视觉验收**：截图确认深黑/电蓝换肤（本会话已出效果图），验收通过即 commit Slice 1
2. **12 页 IA 落点设计**：在 Vanilla 基座上把 `routes.json` 12 路由映射到单页 panel 切换（不引 React）
3. **DESIGN-LAB 专属 10 组件**落地（PreflightIssue / QualityScore / ControlMatrix / LibraryIndex…）
4. **Domain State Machine 可视化**：brief→delivered 状态条进 Workbench 右列
5. 浏览器 E2E 视觉回归（Playwright）纳入 CI，截图比对防换肤回退

## 6. 红线遵守记录

- 外置库权威索引：`UI套件` 只读消费（解压到项目内 `.project-local`），未修改源库任何文件
- E 盘：未触碰
- 换肤未扩大范围：只动 style.css 颜色/字体/动效层，panel 结构与 main.ts 逻辑零改动
