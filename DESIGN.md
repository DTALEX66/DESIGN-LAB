---
name: DESIGN-LAB Workbench design contract
version: 1
status: proposed-for-owner-acceptance
sourceOfTruthForTokens: apps/workbench/style.css (:root)
derivedFrom:
  - "D:/All projects/UI套件 — B04/L4 权威 Tokens、B07 tokens.css、03_B03 页面级 UI 与 AAOS 配色纠正"
  - apps/workbench/style.css
externalStandardsCited:
  - "WCAG 2.1 AA — 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast, 2.4.7 Focus Visible, 2.5.8 Target Size (Minimum, WCAG 2.2), 3.1.2 Language of Parts, 2.1.2 No Keyboard Trap"
  - "W3C WAI-ARIA Authoring Practices 1.2 — Disclosure Navigation, Dialog/Mobile Drawer, Landmarks"
  - "W3C Design Tokens Community Group — DTCG format (already enforced by design-lab/scripts/verify_interop_dtcg.py)"
  - "Material Design 3 — state layers and elevation as the reference model for hover/focus/disabled"
  - "Microsoft Fluent 2 — focus ring treatment on dark surfaces"
  - "Primer / Carbon — dark-theme data-density and table conventions (reference only, not a dependency)"
enforcedBy:
  - design-lab/tests/test_design_system_tokens.py
  - design-lab/tests/test_interop_dtcg.py
  - design-lab/tests/test_workbench_css_single_definition.py
  - design-lab/tests/test_design_debt_baseline.py
  - design-lab/tests/test_ui_layering.py
  - design-lab/tests/e2e/audit_workbench_contrast.mjs
  - design-lab/tests/e2e/audit_workbench_ui.mjs
  - design-lab/tests/e2e/audit_workbench_overflow.mjs
externalRunner:
  config: design.qa.yaml
  command: python scripts/run_design_review_plugin.py
  auditors: [audit-design-debt.mjs, audit-a11y.mjs]
measuredDebtBy: scripts/design_debt_baseline.py
measuredDebtRegister: design-lab/config/ui-off-palette-colours.json
measuredDebtAtCommit: 700ee3fb
---

# DESIGN-LAB Workbench — 设计契约

这份文件的存在理由：在此之前，"界面是否符合设计标准"无法被机器回答。渲染侧有门，源真值侧
只有一堆 PNG 展板。本文件把展板的取值落成仓内文本，使视觉一致性第一次有了可比的一端。
**它不引入任何框架或组件库**：Workbench 是原生 TS + 自研 CSS，契约只约束取值、状态与边界。

## 1. 令牌（实现值，逐条从 `:root` 读出）

| 语义 | 值 | 用途 | 约束 |
|---|---|---|---|
| `--color-bg` | `#060A14` | 画布 | 唯一页面底色 |
| `--color-surface` | `#0D1221` | 面板 | 不得再叠第三层"更深的黑" |
| `--color-surface-2` | `#11182A` | 输入/次级面板 | — |
| `--color-border` | `#213D66` | 描边 | 1px；分隔靠留白不靠线堆 |
| `--color-primary` | `#316CFF` | 动作/焦点/选中 | **见 §3 对比度红线** |
| `--color-secondary` | `#4BAFFF` | 次级强调、图标、cue | — |
| `--brand-gradient-from/-to` | `#1D4FC4 / #2A63D8` | 主按钮与选中段的渐变两端 | 三处共用同一对端点；不得再在规则里抄字面值 |
| `--color-text` | `#F5F7FC` | 正文 | — |
| `--color-muted` | `#9AA3B8` | 次级文本 | 只用于 ≥13px |
| `--color-success/warning/error` | `#2FC58D / #F4B942 / #F05252` | 状态 | 状态必须同时有文字，不靠颜色单独承载（WCAG 1.4.1） |
| radius | `--radius-md 8px` / `--radius-lg 14px` | 圆角 | 品牌砖 16px 是既有例外，不再新增任意圆角 |
| motion | `120 / 180 / 280 / 420 ms` | 快/常规/慢/强调 | 只动 `transform`/`opacity`/`clip-path`；不得逐帧 `filter`；必须尊重 `prefers-reduced-motion` |

字族：`system-ui, "Microsoft YaHei", sans-serif`。中英混排按项目语言策略：标题可中英并置，
正文中文；机器状态词（`ACTIVE`/`PARTIAL`/`PASS`…）**不翻译**且必须 `lang="en"` 标注
（WCAG 3.1.2，由 `verify_state_vocabularies.py` 与 UI 门共同看守）。

## 2. 布局与边界

- 宽屏：280px 固定侧栏 + 1fr 内容；顶栏 78px；内容区 padding 26/28/30。
- 断点：`≤840px` 侧栏转 off-canvas 抽屉（`#navToggle` + `inert`）；`≤760px` 旧版页头导航转底部横滚。
- **高度也是断点**：侧栏导航 11 项需 587px，窗口高度 ≤720 时列表溢出，此时必须出现
  `.nav.has-scroll-more` 的粘性 cue，滚到底自动消失。`overflow:auto` 不算可供性。
- 层级：12 处 `z-index` 已全部落成层级表 `design-lab/config/ui-layering.json`（11 层，值与
  选择器由 `design-lab/scripts/verify_ui_layering.py` 从 `style.css` 量得，界面源里不得再出现
  裸数字；表里少一句说明、多一行没用的层、选择的规则变了都对不上号）。**实测遗留**：
  `--layer-flow-figure(0)` 与 `--layer-flow-node(2)` 所在的 `.flow-svg`/`.node` 在 12 条路由
  × 1440/820/390 三档视口的真实 DOM 里从未出现 —— 疑似死样式，待 owner 裁决后删或接回；
  `.sidebar` 的 88 只在 ≤840px 生效（实测 820/390 为 88，1440 为 `auto`，那里它是 sticky 列）。

## 3. 红线（违反即 blocker，不是建议）

1. **`#316CFF` 上不得放白色正文。** 实测该组合上限 4.45:1，达不到 AA 对正文的 4.5:1。
   已按面分别用 `--border-strong` 处理；**品牌主色本身待 owner 裁决**（改色 vs 改用法）。
2. 状态词不得翻译，不得由 UI 宣称服务发不出的判定词。
3. 读回不到就是读回不到：空态必须区分"没有数据"与"没读到"（`未读回` ≠ `0` ≠ `尚无`）。
4. 不得为了视觉整齐把 `aria-hidden` 的装饰资产旁边再放一份同名文字。
5. 未过 `verify_asset_governance.py` 的二进制不得进界面。
6. landmark 元素（`aside`/`main`/`nav`/`section`/`form`）不得改挂 `role="dialog"`：
   ARIA in HTML 不允许这一对，且非模态面板（无焦点约束、背后仍可用）本就不是 dialog。
   去掉角色必须保留可访问名，否则该区域变成无名 landmark。由
   `design-lab/tests/e2e/audit_workbench_ui.mjs` 的 `role-permittedness` 断言看守。

## 4. Do / Don't

- Do 复用 `.panel/.tag/.kpi-grid/.list-item` 等既有类；Don't 为单页写局部覆盖色。
- Do 用 `color-mix(in srgb, var(--x) N%, transparent)` 派生态；Don't 新写字面色值。
  当前存量（由 `scripts/design_debt_baseline.py` 按声明的规则实测，`--check` 看守，
  不再是手点数字）：非令牌声明、去掉注释后的 7 个界面源文件里，
  字面色值 26 处、字面 px 516 处、阴影声明 24 条（其中 18 条已读 var()）。
  26 处色值分两类：**13 处是有色相的字面量**（chromatic），13 处是中性 alpha 遮罩/阴影
  （neutral-alpha）。每一处有色相的字面量都逐条登记在
  `design-lab/config/ui-off-palette-colours.json`，`adjudication` 是 owner 专用字段，代理不得填；
  新增一处即门红（存量只许减）。按次清理，不得增长。此前 §36.4 的 18/360/9 是手点的，
  任何规则都复现不出来，与外部 design-review 插件的读数也不一致 —— 分歧逐条见
  `docs/audits/DESIGNLAB-EXTERNAL-DESIGN-REVIEW-2026-10-09.md`（§7 是同日追正段：主色并无重复
  字面量，`box-shadow:none` 曾被计成债，8 处字面量已换成令牌引用并逐处实测像素未变）。
- Do 让新交互在键盘与窄屏下同样可达；Don't 用 hover 承载唯一入口。

## 5. 对标（下一步要做的比较，不是已完成）

本契约只固定"我们自己的取值与规则"。要与对标软件比还原度，需要抓真实参考屏并做像素/DOM
双层比对，候选对标（同为深色、面板密集、专业工具型）：**Figma、Blender、Adobe Illustrator、
Linear、Raycast**。方法沿用已验证过的规矩：先收割对标的 CSS/DOM/内联数据，按它的真实数字
建参照，而不是按文字描述复刻；窗口缩放按尺寸档位逐个截图比较，滚动条存在不等于可见。

## 6. 本文件的验证状态

- 令牌取值：从 `apps/workbench/style.css` 读出，非回忆。
- §3.1 的 4.45:1 与 §2 的 587px/≤720 数字：本轮真实 Chromium 实测（`.project-local/task-artifacts/browser-e2e/workbench-ui-audit.json`、`.project-local/tmp/ui-short-viewport.json`）。
- 对比度证据的覆盖面（实测，见审计包 §9）：`design-lab/tests/e2e/audit_workbench_contrast.mjs`
  在 24 个路由×宽度组合上判 2461 个文本运行，最紧的一对是 4.11:1（要求 3:1，大字）；
  `color-mix()` 计算出的 `color(srgb …)` 背景已纳入合成，读不懂的颜色一律判红而不是跳过。
  外部 axe 每屏肯判 22–28 个节点、并因伪元素/渐变/遮挡拒绝评 9–71 个，
  所以对比度不能由 axe 的"0 violations"背书。
- §4 存量数字：`scripts/design_debt_baseline.py` 实测，`design-lab/tests/test_design_debt_baseline.py`
  在 CI 里看守"文档说的 = 量出来的"。
- 状态是 `proposed`：owner 接受前不得当作已批准的验收标准使用。
- 外部确定性 runner：**已跑通**（2026-10-09）。`design.qa.yaml` + `scripts/run_design_review_plugin.py`
  驱动 design-review 插件的 `audit-design-debt.mjs`（源侧）与 `audit-a11y.mjs`（axe-core，真实
  Chromium、产品自己的回环服务、committed bundle）。它给的债数与本文件不同，分歧已逐条落档，
  未挑对自己有利的那个：`docs/audits/DESIGNLAB-EXTERNAL-DESIGN-REVIEW-2026-10-09.md`。
- 仍未做：与外部对标的像素级还原度比较（§5）。
