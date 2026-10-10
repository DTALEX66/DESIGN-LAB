# Design QA Verdict: Pass with warnings

对象：DESIGN-LAB Workbench 桌面 UI 本批（三入口壳层、可选配色主题、能力目录前置过滤、
`#/intake` `#/analysis` `#/plan`、`#/states` 状态矩阵、`#/components` 组件规范）。
判定基准：R2 包 `docs/history/taskpacks/20261009-r2-inputs/ui-r2/specs/01_UI_SCHEME.md`
＋ `specs/design_tokens.json` ＋ 包内 22 张效果图，与仓库 `DESIGN.md`。

## Summary

本批**已落地部分**在两套配色下都能通过仓库自己的确定性闸门（19 条路由 × 2 主题：0 裁切、
0 不可达、0 小于 11px；对比度 AA 双主题通过），实拍与几何读数一致，没有发现深浅主题之间的
语义漂移。真正的偏差是**覆盖度**：R2 的信息架构里有五块在本批完全不存在（资产类型 tabs、
已选条件条、450px 详情抽屉与独立地址、草稿自动保存、制作记录与任务条），`#/intake` 只做到
R2 §6 四组输入里的两组。这些不是还原度缺陷，而是尚未开工的增量，已按卡折进
DL-UI-U03/U04/U05 与 DL-FINAL-T08/T09，不在本文件里当作"已通过"。

审查过程中被**推翻**的两条初判，连同推翻它的测量一起记在下方"已排除"一节：一条来自我
自己的裁剪图误读，一条来自对未接线控件的猜测。

## Evidence Reviewed

- 设计契约：`DESIGN.md` §1–§4（含 2026-10-09 复测后的实测存量）、
  `docs/taskpacks/20261009-r2-ui/CROSSWALK.md`（R1/R2 取舍与三处待 owner 裁决的令牌冲突）。
- 源视觉真值：R2 `specs/01_UI_SCHEME.md` §2/§3/§4/§5/§6/§7/§9/§10/§11；
  R2 效果图 22 张（`.project-local/task-artifacts/taskpacks-20261009-r2/extracted/screens/`），
  其中浅色基准 `14_catalog_light.png`。
- 渲染实现：`.project-local/task-artifacts/ui-first-20261009/screens/default/` 19 张 @1920
  ＋ 16 张 @960；`screens/ui2026-light/` 19 张 @1920（**本批重拍**，见 Blockers 前置说明）。
  两套 manifest 的 subject 同为 `apps/workbench/build/main.js`
  sha256 `10776c22…`、307355 字节。
- 视图/内容一致性：两套 manifest 的 `rendered.host/#route-view`、`headings`、`kpis` 逐条相同，
  即两主题渲染的是同一 DOM，差别只在令牌。
- 确定性报告：`OV_OUT` 溢出/几何报告（两份，各自带 `uiPalette/uiScheme`）、
  对比度 AA 报告（`test_workbench_contrast_gate` 的双主题用例）、
  `.project-local/runs/design-review/.design-qa/reports/design-debt.json`（findings=706）、
  `scripts/design_debt_baseline.py --check` = `DESIGN_DEBT_BASELINE=PASS`、
  `scripts/archive_ui_desktop_reconcile_20261009.py --check` = 17 屏 / 18 路由 / 53 断言 / 37 令牌。
- 源码：`apps/workbench/shell.ts`（`ROUTE_VIEWS`、`STATE_SPECS`、`renderCapabilityLibrary`、
  `intakeForm`、`analysisPanel`、`planComposer`、命令面板）、`apps/workbench/style.css`
  （`:root` 令牌块 + 两个 `:root[data-palette=…]` 主题块 + 本批新增组件块）。

## 先说证据本身的缺陷（已修）

- Severity: blocker（针对**证据**，不是产品）
- Evidence：`screens/ui2026-light/screenshot-manifest.json` 旧副本记的 subject 是
  `bundleBytes=281680`、sha256 `4ce45da3…`、generatedAt 15:00，而当时的 bundle 已是
  `307355`/`10776c22…`；且只有 16 张，缺 `intake`/`plan`/`analysis` 三屏。
- Observed：浅色主题下本批新增的三屏**没有任何同字节实拍**。
- 影响：上一版浅色证据不能为本批背书。
- 处置：用同一隔离入口重跑浅色集，现 19 张全部绑定 `10776c22…`；`SUBJECT.json` 逐条记
  `head` ＋ `worktree_digest` ＋ `apps_workbench_dirty=true` ＋ deviation 原文（tracked 的
  `scripts/capture_workbench_screenshots.py` 仍拒绝未提交 bundle，本会话无 commit 授权，
  守卫未动）。
- Verification：新 manifest `uiPalette=ui2026 uiScheme=light shots=19 subject=10776c22…`。

## Blockers

无。本批已落地的界面没有阻止设计验收的缺陷。

## Major Issues

### 1. `#/intake` 只覆盖 R2 §6 四组输入中的两组
- Severity: major
- Evidence：`screens/ui2026-light/16-intake@1920@ui2026-light.png` 与
  `screens/default/16-intake@1920.png`；`shell.ts` `intakeForm()`。
- Observed：页面上是「需求与目标」「参考素材与职责」两组；R2 §6 表的
  **交付目标**（分析 / 目标包 / 原生工程 / 最终媒体 + 工具、格式、尺寸、时长）与
  **能力与知识**（资产 revision、获准知识 revision、教学需要）都没有落点。
  右栏在 1920 下约 60% 高度是空的——正是这两组该在的位置。
- 影响：从输入面进不到交付范围，`#/plan` 的目标包只能靠默认值，U04 的"输入→分析→目标包"
  旅程断在第二环。
- 建议修法：按 R2 §6 的分组补两块面板进右栏（沿用 `.intake-grid` 的既有卡片），
  交付目标只列**已有资格证据**支持的路线，未知项显示"待核验"而不是灰掉消失。
- Verification：新屏进 `capture_workbench_screenshots.mjs` 的 PAGES 与 overflow 的 ROUTES，
  两主题各一张实拍。
- 归属：DL-UI-U04（已写入 `currentExecution` 的 notes）。

### 2. 强约束与偏好无法分别保存（合同缺口，不是前端缺口）
- Severity: major / needs-design-decision
- Evidence：`#/intake` 页面自述"简报合同记录 title / goals / constraints /
  reference_asset_ids 四项；下面的输入属性会编排进 constraints 文本，不是四个独立字段"。
- Observed：R2 §6 要求"强约束与偏好分别保存"；当前简报 schema 只有一个 `constraints` 文本。
- 影响：前端无论怎么改分组，落库都会把两者混成一段话，下游无法据此判定违约。
- 建议修法：先裁决 schema（新增 `hard_constraints` / `preferences` 两个数组，或声明
  本轮仍走合成文本并把它标成已知损失），再动界面。不自行扩 schema。
- 归属：owner 裁决 + DL-FINAL-T07。

### 3. R2 §4/§5 的目录三件套缺失：资产类型 tabs、已选条件条、详情抽屉与独立地址
- Severity: major
- Evidence：`renderCapabilityLibrary()` 现有的是关键词 + 5 个前置过滤 select + 表格；
  `grep` 无 `drawer`/`asset-type` 相关实现，路由表里也没有详情地址。
- Observed：R2 §4 的"资产类型 tabs / 已选条件与结果数 / 卡片或列表切换"和 §5 的
  "450px 右侧抽屉、保留目录领域·条件·位置和焦点、完整详情有独立地址"都未实现。
  当前"查看详情"是行内展开，关闭即回到列表，无法把某条详情重新找回来。
- 影响：目录→详情→"用于本次制作"这条 R2 主旅程只能走一半。
- 建议修法：抽屉用 `#/<route>/<id>` 形式的可分享地址；已选条件条上每个 chip 可单独移除，
  计数按当前组合去重（R2 §4 末段）。
- 归属：DL-UI-U03 + DL-FINAL-T08。

### 4. 草稿自动保存与"正在保存/已保存/保存失败"缺失
- Severity: major
- Evidence：`intakeForm()` 只在提交时写服务；页面文案"提交即写入本机服务"。
- Observed：R2 §6 要求变更自动保存到正确任务身份并显示三态，未保存离开给恢复机会。
- 影响：长表单中途离开即丢失，且用户无法区分"已存"和"没存"。
- 建议修法：接既有草稿接口（不新建第二套存储），三态各一条真实状态；服务不可用时显示
  失败而不是静默本地保存。
- 归属：DL-UI-U04。

### 5. R2 §7「制作记录与待继续」与页面底部任务条缺失
- Severity: major
- Evidence：`ROUTE_VIEWS` 的"分析与制作"入口下只有 新建需求 / 分析与方案 / 目标生成包；
  无记录列表、无任务条组件。
- Observed：R2 §7 要求找回工作的入口（任务、领域标签、真实状态、最近确认点、继续操作）
  ＋ 底部持续任务条（只在实际存在任务时出现）。
- 影响：跨页浏览后无法回到"哪一个任务"，U05 的恢复语义没有承载面。
- 建议修法：任务条只在真实存在当前/待继续任务时渲染；R2 原型里的三条示例记录不得当作
  真实排队状态。
- 归属：DL-UI-U04 + DL-FINAL-T09。

### 6. 全局搜索只有路由启动器，没有 R2 §9 的三对象组
- Severity: major
- Evidence：`shell.ts:5320-5356`——命令面板项是 `dataset.go` 路由，`input` 事件按标签子串
  过滤，`Ctrl/Cmd+K` 开合、Esc 归还焦点（这两点已符合 §9）。
- Observed：没有能力资产 / 制作记录 / 成果三组，没有按权限过滤的服务端检索，也没有
  "对象类型与去向"。
- 影响：§9 的"搜索后进入正确对象"目前只能到"进入正确页面"。
- 建议修法：分组渲染 + 先按权限过滤再计数返回；无权限对象不得出现标题或计数。
  面板不得宣称它做的是远程检索。
- 归属：DL-FINAL-T08。

### 7. 11 个领域没有成为可导航入口
- Severity: major
- Evidence：`ROUTE_VIEWS` 里"能力资产"入口下是 能力目录 / 设计领域 / 品牌系统 / 创作工具；
  R2 §2 要求二级导航直接列出 11 个领域并读现有领域配置与稳定 ID。
- Observed：领域是一页汇总，不是一组入口。
- 建议修法：领域项从既有领域配置生成（含稳定 ID），空领域保留入口显示空结果，不因零条
  移除分类（R2 §2 末段）。
- 归属：DL-UI-U03。

## Minor Issues

### 侧栏底部区域没有可发现性，且闸门看不见"重叠"
- Severity: minor / needs-design-decision
- Evidence：`default/14-states@1920.png`、`ui2026-light/18-analysis@1920@ui2026-light.png`
  里导航溢出指示（▼）落在"辅助"分组线附近；几何闸门两主题 19 路由均报 0 裁切 / 0 不可达 /
  0 小于 11px，即它**没有**任何元素间重叠断言，这类问题目前只能靠人眼。
- Observed：我在实拍上看出"▼ 压在分组标题同线""主题说明被折到视口外"两件事，其中第二件
  随后被源码否定（见"已排除"3）。第一件没有测量支持，因此不作为缺陷断言，只作为断言缺口记账。
- 建议修法：给闸门补一条 rect 重叠 + `elementFromPoint` 断言（先证明栽进去的能量红），
  再据此判断侧栏底部是否需要常驻可见区。R2 §3 只写了反向要求（内容保留底部留白，
  最后一个按钮能滚动到任务条上方），侧栏自身没有写，所以这是设计缺口，需要 owner 定。
- 归属：DL-FINAL-T08（已写入 TASK-CARDS 的 QA 增量段）。

## Design Debt

- 本批 `字面 px` 存量 516→532（+16），实测全部落在 `apps/workbench/style.css` 的新组件块；
  色值成员换了一对（`#1d4fc4` 令牌化后登记行删除，新增 `#4bafff` 即 `--tag-info-from`），
  总数仍 26。两处 `adjudication` 均留给 owner，代理未填。已写进 `DESIGN.md` §4，
  `--check` = `DESIGN_DEBT_BASELINE=PASS`。
- 外部 design-review 插件报 706 条（hard-coded-color 38 / functional-color 14 /
  px-magic-number 625 / custom-shadow 27 / tailwind-arbitrary-value 2），与仓库规则读数
  （26 / 532 / 24）不同源：插件按声明计数、仓库按"非令牌且非注释"计数，且本仓库无 Tailwind。
  分歧逐条仍记在 `docs/audits/DESIGNLAB-EXTERNAL-DESIGN-REVIEW-2026-10-09.md`，不合并读数。
- 组件拆分：R2 §11 列的 25 个组件名里，本批真正成形的只有 AppShell/PrimaryNav/ContextNav/
  GlobalSearch/TaskRecordList(缺)/BriefForm/DeliveryTarget(缺)/StepNavigation/
  ConnectionStatus/Empty·ErrorState 等一部分，其余仍以 `shell.ts` 内联函数存在。
  不要求照搬组件名，但要求同一语义不再各写一份——已折进 DL-FINAL-T08。

## Acceptable Differences

- 浅色主题把导航侧栏一起翻浅：与 R2 浅色基准一致（实测 `14_catalog_light.png`
  侧栏 (234,240,246)、画布 (244,247,250)，同为浅色，仅差一档表面层级）。
- `--color-secondary` / `--color-info` / info 药丸填充在浅色下重指到包自己声明的 light accent：
  深色下的 `#4BAFFF` 压白底只有 2.37:1，被 AA 闸门按路由报红后修正，取值来自包，未造新色。
- 状态矩阵 11 项 ≥ R2 §10 的 8 项：多出的 未读回 / 未判定 / 取消已请求 是仓库真实词汇，
  不是照抄原型。
- 手机端（R2 §3 <768 列与底部四入口）：owner 决定 FROZEN_DEFERRED，本批不实现、不验收。

## 已排除（初判被测量推翻，留作方法记录）

1. "浅色主题下能力表被挤成一列列竖排文字" —— 来自我对一张裁剪图的读法。三个独立测量都反对：
   浏览器内 rect 探针（rail 280 / main 1584 / table 1546 @1920，两主题逐路由相同）、
   PNG 墨迹横向范围（default 19..1619、light 28..1619）、两主题整幅实拍。产品没有这个缺陷；
   错的是我的裁剪回读。**几何断言优先于图片回读**这条规则再次成立。
2. "顶栏搜索框是装饰" —— `#openPalette` 有 `onclick`、`Ctrl/Cmd+K` 与 Esc 归还焦点，
   已接线；真实缺口是它只检索路由（见 Major 6），不是假控件。
3. "浅色主题下主题控件的说明文字被折到视口外" —— 源码 `themeControlNodes()` 是
   `spec.schemes.length > 1 ? '' : spec.missingScheme`：ui2026 声明了浅色，所以那一行**本
   就该是空的**；design-lab 没声明浅色才印"这套色板没有声明过浅色值，不自造一套"。
   两主题各自正确，不是折叠。
4. "组件规范页的色块在浅色下仍显示深色值" —— 直接取像素：浅色实拍
   `15-components@1920@ui2026-light.png` 在色块带 (y=300..330) 上依次为
   (244,247,250)/(255,255,255)/(240,245,250)/(207,218,229)，正是 `--uif-light-*` 四档，
   色块刷的是当前主题算出来的值。

方法记录：本文件里所有"看出来的"结论都被改写成可复算的测量（rect、像素、源码行）之后才保留；
四条初判在这一步被推翻。缩放后的整幅预览不足以支撑还原度断言，这一点比任何单条发现都更该记住。

## Automation Artifacts

- Expected（源真值）：R2 `extracted/screens/*.png` 22 张；未做像素级 diff（本仓库无 R2 基线快照，
  且 R2 效果图是设计意图而非像素合同）。
- Actual：`screens/default/`（19@1920 + 16@960）、`screens/ui2026-light/`（19@1920，本批重拍）。
- Diff：无图像 diff——两套实拍主题不同源，逐像素差会把"换了颜色"当成缺陷；改用
  `rendered` 结构等价 + 两主题各自的 rect 普查作为对照。
- JSON：`browser-e2e/workbench-overflow-gate.json`（含 `uiPalette/uiScheme` 与 per-route
  `layout`）、`browser-e2e/*contrast*.json`、`runs/design-review/.design-qa/reports/design-debt.json`、
  `task-artifacts/ui-first-20261009/reconcile.json`。
- 本闸门化了两件此前只能靠人眼的事：溢出/几何闸门现在**逐主题**跑（此前只跑默认配色），
  并在每条路由记录 `railW/mainW/mainLeft/tableW/narrow760`。

## Verification Checklist

- [x] 两主题 @1920 实拍均绑定当前 bundle（`10776c22…`），manifest 各自记 subject
- [x] 溢出/几何闸门两主题各跑一遍：19 路由 × 2 = 0 clipped / 0 stray / 0 tiny
- [x] 对比度 AA 两主题各跑一遍（含浅色专用用例，回执点名自己的 subject）
- [x]  typography / spacing / colors-tokens / assets / copy 五个面逐条看过：见 Major 1–7 与 Minor
- [x] 状态：default / hover / focus-visible / disabled / loading / empty / unread / unknown /
  offline / forbidden / error / timeout / conflict / queued / cancelled —— `#/states` 11 项齐，
  disabled 用非透明度去 cues（AA 实测驱动）
- [ ] 键盘全程走查、减少动画、200% 缩放：需要真人，未做，不代签
- [ ] 真实宿主执行与真人 Jury（E3/E4）：不在本批授权内
- [x] 无新增未登记字面色：`design_debt_baseline --check` PASS，26 处逐条在案
- [ ] commit / push / CI：本会话无该授权，全部改动仍是工作树未提交状态

## 批次后追记（同日第三批，本报告不改判，只标已消化项）

判定仍是 **Pass with warnings**：上面列的是当时那批字节的覆盖差，追记只说明其中两条已经做掉，
避免下一个人按旧清单重复派工。新证据绑定重建后的 bundle
`fd0e67d9…`（314,344 字节），两主题各 19 张实拍、各 19 路由 0 裁切 / 0 不可达 / 0 小于 11px。

- **Major 1（输入四组缺两组）→ 已落地。** `#/intake` 现在是六个 h3：
  需求与目标 / 参考素材与职责 / **交付目标** / **能力与知识** / 已提交的简报。
  交付目标四档各自标注接线状态并注明依据（分析与方向=已接线、目标生成包=只排队、
  原生可编辑工程=未取证、最终媒体=未接线）；能力与知识读 `GET /design-layer` 的
  现行方向 revision、活动绑定与简报版本链，获准知识 revision 明确标未接线并说明归 ArcheAxis，
  教学需要禁用并说明属 U06/U07。两组输入一律编排进合同真正记录的那条 `constraints`，
  没有假装合同长出新字段。
- **Major 3 的一半（已选条件条 + 去重计数）→ 已落地。** `#/capabilities` 增加
  `#capability-active`：每个不等于「全部」的取值一枚可单独移除的 chip，关键词也算一枚；
  「清除检索条件」只清检索，不清领域选择、不删任务（§4 末段那条边界）；
  结果计数改为按 ID 收敛，并在有重复时说明去掉了多少条。
  §4 剩下的资产类型 tabs 与 §5 的 450px 抽屉／独立地址仍未实现，Major 3 不整条关闭。
- **证据侧新增一条改进**：溢出/几何闸门的报告现在自带 `subject.bundleSha256/bundleBytes`。
  此前它只记主题与宽度，一份「0 裁切」无法证明测的是哪一版字节；账本写入器现在按
  报告里的 subject 与磁盘上的 bundle 是否一致来定 PASS/FAIL，测旧字节即 FAIL。
- 仍开着的：Major 2（强约束/偏好分字段，待 owner 裁决 schema）、Major 4（草稿自动保存）、
  Major 5（制作记录与任务条）、Major 6（全局搜索三对象组）、Major 7（11 领域二级入口）、
  Minor（闸门缺元素重叠断言），以及键盘／减少动画／200% 的真人验收。

## 第四批追记（同日，R2 §5 详情地址 + 遮挡断言）

新证据绑定 bundle `5af19a1e…`（320,873 字节），两主题各 20 路由、各 20 张实拍。

- **Major 3 的另一半（450px 抽屉 + 独立地址）→ 已落地。** `#/capabilities/<id>` 成为真实地址，
  沿用 `#/projects/<id>` 的加固形状（解码后校验；实测 60 条 id 字符集 `[a-z0-9-]`、最长 27）。
  面板由地址决定存不存在，列表仍在原位 → 它是面板不是 dialog，未改挂 role。
  七轴空值显示"该记录无此字段"而不是 0；「用于本次制作」禁用并说明归属。
- **Minor（闸门无重叠断言）→ 已补，并且当场抓到真缺陷。** 新增
  `elementFromPoint` 命中测试后，第一次跑就报
  `#topNotice covered by button#capability-drawer-close`：抽屉压在顶栏右端两个按钮上。
  这条**不是**我先前那种看图误判——它有可复算的命中测试与栽桩复现
  （`qa-20261009d/geometry-assertions-falsification.log`：栽 8px → 红，栽 500px 宽 → 红，
  还原后字节一致且绿）。修法是把顶栏高度抽成 `--uif-topbar` 令牌并从它下方起算。
- 顺带的存量变化：字面 px 532→531（顶栏高度令牌化，少一处字面量），
  阴影声明 24→25 且新增那条读 `var(--shadow-soft)`；`DESIGN.md` §4 与
  `ui-layering.json`（`--layer-detail-panel:70`，name/purpose/note 齐全）同步。
- 至此 Major 3 关闭（tabs 仍属 §4 的另一条，见下），Minor 关闭。仍开着的：
  Major 2（schema 待裁决）、Major 4（草稿自动保存）、Major 5（制作记录与任务条）、
  Major 6（全局搜索三对象组）、Major 7（11 领域二级入口）、§4 的资产类型 tabs，
  以及键盘／减少动画／200% 的真人验收。

## 第五批追记（同日，R2 §7 制作记录与待继续）

新证据绑定 bundle `bb95a58b…`（328,929 字节），两主题各 21 路由、各 21 张实拍。

- **Major 5 → 已落地。** `#/records` 读既有 `GET /projects/{id}/tasks`：状态词原样出现
  （不翻译、不合并），取消的 `requested` 与宿主 `acknowledged` 分成两段事实，
  `TaskRecord` 没有的领域字段显示"无该字段"而不是按 `kind` 猜，
  "最近确认点"只在展开那一行时发一次 `…/tasks/{job}/events` 读回，
  底部任务条只数进行中与待人工核对的作业（三条种子里报 2 条，已回执的不计）。
- **一条方法结论**：实拍用的合成项目台账是空的，所以**行的渲染无法由截图证明**。
  这一屏改由 appshell ⑩ 用三条真实形状的 `TaskRecord` 驱动，并栽三种桩各红一次
  （任务条数成 3、领域按 kind 编造、取消两段并成一句），还原后绿且字节一致。
  教训与"未挂载的组件不算功能"同源：能渲染到屏幕上的才叫交付，
  渲染不到就用真实数据在 vm 里驱动并证明断言能红。
- 仍开着的：Major 2（schema 待裁决）、Major 4（草稿自动保存——已核实服务**没有**任何
  draft 路由，要先补后端再谈三态）、Major 6（全局搜索三对象组）、
  Major 7（11 领域二级入口——实测能力记录的 `domain` 是模型雷达 slug，与设计域只有一个
  字面巧合 `3d`，按它 join 会把"没有能力"说成 0 条）、§4 的资产类型 tabs
  （七轴在 60 条记录里全为空，tabs 必须能显示真实空态），以及键盘／减少动画／200% 的真人验收。

## 第六批追记（同日，R2 §9 全局搜索分组）

新证据绑定 bundle `e9b74265…`（333,652 字节），两主题各 22 个测量键、各 21 张实拍。

- **Major 6 → 已落地。** 命令面板按对象类型分四组读真实对象：能力资产（结果直接落到
  `#/capabilities/<id>`）、项目、设计领域（13 个真实域包）、设计系统，每条显示类型与去向，
  超过每组上限只画前若干条并明说还剩多少。三条边界写死：只查当前令牌已能读到的路由，
  服务没有对象级读权限模型所以**不声称"已按权限过滤"**；某组没答回来就说未读回，不显示 0 条；
  对象组首次打开才读并缓存。
- **浮层现在可测了。** 溢出/几何闸门新增 `global-search` 交互态：点 `#openPalette` → 等四组都
  给出可行动答案 → 量浮层几何 → Esc 关闭，避免打开的浮层污染后续路由。settle 谓词要求每组必须
  落在「有行 / 明确 0 个 / 明确未读回」三态之一，并栽桩证明它会红：让一组读回 0 且删掉空态文字
  → `OV_INTERACTION_UNMEASURED`，还原后绿且源码字节一致。
- 遮挡断言在模态浮层打开时按设计跳过，并在回执里写 `occludedSkipped: div.palette open`，
  而不是静默通过。
- **同一批里被实拍抓出来的真缺陷（blocker，已修）**：分组面板自己把尾巴裁掉了。首张
  `21-search-groups` 里只有『页面』一组 19 行，四组对象全在 `overflow:hidden` 之下不可达，
  而几何闸门照旧全绿——没有横向溢出，也没有元素被自身盒子裁断，纵向超出视口这件事它本来不建模。
  修法三件：面板定高 `max-height:78vh`、`#paletteItems` 变成滚动区、对象组排在页面组之前
  （§9 说的是搜对象，页面是兜底）；并给闸门加一条"滚到底后最后一行必须命中测试可达"的断言，
  栽桩（去掉滚动区）复现 `reached:false hit:null` → `OV_SPEC_BROKEN`，还原后绿且 CSS 字节一致
  （`qa-20261009f/palette-scroll-falsification.log`）。
- **回执绑定的一条改进**：几何回执的 `subject` 现在同时点名 bundle 与 stylesheet。CSS 是独立
  文件，改布局时 `main.js` 字节不变——只绑 bundle 的回执区分不出改过没改过，这一批就实测到了：
  重排面板后 bundle 从 `e9b74265` 变 `c3f16dc8`，而改 CSS 时它没变。
- 仍开着的：Major 2（schema 待裁决）、Major 4（草稿自动保存，需先补后端）、
  Major 7（11 领域二级入口）、§4 的资产类型 tabs、nav 内部排版断言，
  以及键盘／减少动画／200% 的真人验收。

## 需要 owner 裁定的清单（2026-10-09 汇总；界面不替这些决定猜）

每条都给了"不裁定时界面的当前行为"，这样等待不会变成停滞。

### A. R2 §2 二级导航的领域标签（4 处，算术见 `qa-20261009g/r2-domain-nav-mapping.log`）

§2 的 11 个中文名与读回的 12 个 slug 对不上：

1. **平面设计** → `graphic` 还是 `visual`？两个包都在，都通过校验。
   当前行为：两个各自成一条入口，用读回的 `displayName` 显示。
2. **UI 与交互** → `ui-ux` 还是 `product-ui`？同上。
   当前行为：两条入口并列。
3. **字体与出版** 没有任何域包声明它。
   当前行为：不出现这条入口（出现即等于凭空造一个域包）。
4. **游戏视觉** 唯一候选 `minigame-design` 声明 `workflow/domain-pack/v1`，
   `domain=null` 且被仓内校验器拒绝（11 条原因）。
   当前行为：它在列表与详情里如实显示为 `INVALID` + 未声明领域，不冒充可用领域。

反向也有一条：`ecommerce` 有包、无 §2 名字。当前行为：照常显示，不删。

### B. R2 §3 的三处令牌冲突（沿用第一批记录，未变）

h1 27/29px、侧栏 256/232/280px、内容边距 30/40 与 22/26。
当前行为：保留仓库既有取值，§3 取值不覆盖默认配色与默认尺度。

### C. 26 处字面色值的 adjudication 字段

`design_debt_baseline.py` 明确 "an agent must not fill this field"。
当前行为：全部登记在案、逐处可查，不自动令牌化。

### D. 品牌主色 #316CFF 承载不下白色正文（对比度上限 4.45:1）

当前行为：按面解决（新增 `--border-strong`），品牌令牌本身不动。

### E. §6 草稿自动保存要不要服务端持久化

界面已有 localStorage 草稿（遗留简报面板），`#/intake` 的显式保存已写入本机服务。
自动保存若要跨重载/跨机器可靠，需要一条**可变草稿行**路由；
不能改写成简报修订（修订是不可变版本，逐键保存会灌爆版本链）。
当前行为：`#/intake` 只在用户点"保存为简报"时写一次；屏上说明这一点。

### F. U05 结构/文本节点的来源

`Plan.from_ocr` + `plan_to_rir` 已实现且 39 条本地测试通过，但没有生产调用方；
主机资格回放依赖 `.project-local/task-artifacts/ocr-qualification/` 的实测回执，
本机这些回执不存在，所以 `CONTROLLED_OCR_PASS` 在当前机器上不可复现（不是失败）。
当前行为：`#/plan` 只画底图一个节点（`inferred:false`），没有真实底图就不编排。

## 第七批追记（2026-10-09 深夜，Major 7：领域成为二级入口）

- **先量再做，量出来的结论改变了设计**：R2 §2 要 11 个领域成为二级导航。读回给的是
  13 个目录、12 个声明 slug（`minigame-design` 声明 v1 清单，`domain=null`，校验 INVALID）。
  §2 自己写了"不是永久硬编码的总共 11 类……生产读取现有领域配置和稳定 ID"，所以入口按读回生成，
  不写死 11。
- **领域→能力没有关联轴**：60 条能力的 `domains` 分类轴全为空；能力记录的 `domain` 字段装的是
  模型雷达 family（`video-generation`/`asr`/`3d`…），与包 slug 的唯一字面重合是字符串巧合。
  于是第七批把"按该领域筛选能力"做成禁用按钮 + 屏上写明原因。这里有一个容易被误读的点：
  §2 说"领域没有资产时显示空结果"，但**把"没有已接线关联"显示成"该领域 0 条资产"本身就是一种
  伪造**——0 条是一个判定，而服务没有给出任何可供判定的字段。真正的空结果资产面仍待做，
  且必须先第二次读回 `GET /api/capabilities` 并区分这两种措辞。
- **§2 的中文名与真实 slug 对不上（owner 裁决，已算术化）**：2 个名字无域包
  （字体与出版、游戏视觉），2 个名字各命中 2 个包（平面设计→graphic/visual，
  UI 与交互→ui-ux/product-ui），1 个包无人认领（ecommerce）。界面不替这四处猜。
  名字清单是从冻结规格逐字解析的，不是手抄；脚本在名字解析不出对应行时直接拒绝出数。
- **组件复用而非新样式**：详情面板复用既有 `.cap-drawer`，本批零新增 CSS，
  债务普查保持 26 色值／531 px／25 阴影不变。
- **顺带修掉的既有导航缺陷**：`#/projects/:id` 此前会让侧栏丢掉当前项高亮。三个参数化详情地址
  现在统一由 `DETAIL_NAV_OWNER` 认领父项，辅助技术读到的 `aria-current` 与真实位置一致。
- **一次把旧账挖出来的收获**：本批把 `test_contract_bindings` 加进静态电池，立刻红 24 条——
  根因是一条 `emitter` 行号指针 `capability_library.py:210`。HEAD 上那一行确实是
  `"schemaVersion": SCHEMA_VERSION,`，但本线程更早一批给该文件加了 ~47 行，指针就落到注释上了。
  该门此前"仍未注册"（见 `DESIGNLAB-LAUNCH-REVIEW-PREFLIGHT-2026-10-08.md`），所以没人在本地跑它。
  指针改指 247 行后 32 条全绿。这说明"行号型指针"是会被正常功能开发撞坏的，注册进电池才算有人守。
- **读渲染图找到的第二个缺陷：行内动作不成列。** 实拍里 13 行的"查看详情"落在好几列上。
  根因不是裁切也不是溢出——几何闸全绿——而是 `.list-item` 用 `justify-content:space-between`
  排三个子元素，中间那个的位置由两侧内容的宽度决定。第一次修只加了
  `.list-item:has(> button)>div:first-child{flex:1}`，栽桩后测得按钮仍差 14px：真正推着它的是
  **判定药丸自己的宽度**（VALIDATES 比 INVALID 宽）。所以修法是把药丸排到动作之前，让两列都
  右锚定；CSS 只多一条不含任何字面量的吸收规则，债务普查仍是 26／531／25。
- **这条断言本身被推翻过两次，两次都是先怀疑断言而不是放宽它**：
  1. 初版只比按钮的 left 边缘，于是 `display:none` 的按钮以 (0,0) 处 0×0 的矩形"完美对齐"——
     不可达被当成整齐。现在 DOM 里有、宽度为 0 直接判红。
  2. 药丸分支最初用 `.list-item > .tag`，把没有动作的行也扫进来，在**正确的**布局上报出
     656px 的假阳性。改成 `.list-item:has(> button) > .tag` 后才对上。
  四次种植各红在自己那条分支上（撑宽一个动作→23px；隐藏动作→13/13 零宽；去掉 flex→药丸 7px；
  给一个药丸加 margin→药丸 60px），还原后 style.css 字节一致（`9be8d6ea0a53`）。
  注意其中两次种植一开始是**种错的**：去掉 flex 只会让药丸散开（`space-between` 永远把最后
  一个子元素钉在右边缘），而给右锚定的药丸加 padding 根本不移动它的右边缘。改的是种植，
  不是阈值。
- 证据目录 `.project-local/task-artifacts/ui-first-20261009/qa-20261009g/`：两套配形的几何回执
  （23 条键，`1920:domain-detail` 抽屉实测 450px、clipped/stray/tiny/遮挡全 0）、AA 回执、
  两次栽桩日志（合同面 6 次、浏览器闸 4 次，均红在种下的原因上、还原后字节一致）、
  关联轴测量、命名算术、以及把每张 PNG 的 sha256 与 bundle/stylesheet 摘要钉在一起的
  `SHOTS.json`（上一批的实拍回执只绑了 manifest 自己，没有把像素和字节绑上）。


## 第八至十一批追记（2026-10-10 补写；本报告此前停在第七批，是三批的欠账）

补写而不是重写：第七批以上的判定不变，下面只记此后四批改了什么、量到了什么、以及本报告
自己该早点发现的问题。

- **第八批（R2 §4 资产类型 tabs）** 与 **第九批（U05 目标生成包编排面）** 的结论已落在
  `TASK-CARDS.md` 与账本里，此处不重复。要说的是两批各留下一个本报告没抓到的东西：
  tabs 的判据字段一开始选错（`kind` 而不是"资格"），靠"某张 tab 命中 100% 记录"这个
  不合理信号才发现；U05 的五个服务端拒绝一开始塌成一张「未受理」卡。两者都在第十批补了
  断言与种植。
- **第十批（`planRefusal` 五种拒绝）里有一个本报告应当当场拦下的缺陷，是我自己带进来的**：
  409 `NATIVE_PLAN_IDEMPOTENCY_CONFLICT` 用了 `kind: 'forbidden'`。屏上标题写"冲突"，
  状态类别却是"无权进行"，读者会被导向申请权限，而正确动作是**不要再复用同一个键**。
  `STATE_SPECS` 里本来就有 `conflict` 这一类，U05 的验收也点名 conflict。第十一批改为
  `conflict`，并加一条断言：两种 409 必须落在**不同**类别（忙可重试，幂等冲突不可），
  否则把两者并成一个词就会判红。`NATIVE_SUBMISSION_BUSY` 维持 `unknown`——那是服务
  什么都没决定，不是拒绝也不是许可。
  教训：字符串断言全绿并不能保护分类字段。标题对、类别错，是这一类缺陷的固定形状。
- **一条验收条款连续十批没有浏览器证据**：U05 与 U04 的验收都写"200%缩放"，而
  每批矩阵把 `OV_WIDTHS` 钉在 `1920`，闸自己的默认也是 `1440,1280,1920`——三个都不算窄口。
  1920 的 200% 是 960 CSS px，所以此前没有任何一份回执能替这条说话。第十一批两套主题都扫
  `1920,960,620`：69 条路由样本 clean、抽屉 450px、clipped/stray/tiny/遮挡全 0。
  判据也一并改严：新的 `zoom_passed` 除了要求 `1920:domain-detail` 干净，还要求三个宽度
  都出现过；只看一个固定键的判据永远注意不到扫描范围在缩小。
- **`navCue.hiddenPx` 在三个宽度上完全一样（759/749）不是探针坏了**：它是
  `scrollHeight − clientHeight`，而侧栏是固定 168px 的列，纵向溢出只随**高度**变化；
  闸在测这条时单独把高度设成 620。同理，同一宽度下两套主题相差 26px，所以
  `shell.ts` 的注释里不抄任何数字，只指向闸自己的记录。
- **「禁用」的理由必须指向被禁的那个效果。** `#/records` 的「继续该任务」以宿主副作用为由
  禁用，但跳到编排面没有宿主效果；`#/intake` 的「继续做目标生成包」引用的依赖已经在第九批
  落地，理由过期。第十一批各拆成两个控件：跳转可用（行为证明＝只改 hash 且发出 0 个请求），
  启动/取消仍禁用并说明为什么；导入行没有对应的目标包，就不给它入口，并把这个"为什么没有"
  写在屏上。
- **一处错误的负面断言在仓库里活了四批**：`plan_to_rir 在仓库里没有任何调用方` 出现在
  `shell.ts` 四处（其中两处是屏上文字）与生成器 `audit_ui_desktop_reconcile_20261009.py:86`，
  另有 `TASK-CARDS.md` 一处。而 `design-lab/tests/test_plan_to_rir.py` 有 8 处 import。
  正确说法是"没有**生产**调用方"。这属于同一类问题：负面断言没人证伪就当成事实复用，
  并且它会自己复制到界面文本和对账表里。
- **看渲染图抓到的第三个缺陷，是这一批自己带进去的**：`#/records` 的"这个入口现在能说什么、
  不能说什么"面板里，继续操作那一行还写着 **「未接线」**，而同一页已经画出了能点的接续按钮。
  页面自相矛盾，而几何闸、对比度闸、vm 断言全都没看见——因为它们各自看的是布局、颜色和字符串，
  没有把"面板的声明"和"面板所在页面上的控件"放在一起对。修法是拆成两行：
  接续到目标生成包「已接线」（并写明只跳转、不发请求、简报字段不会自动变成包结构）与
  启动 / 取消「未接线」（那才是本会话没有授权的真实宿主副作用）。⑮ 里加了对应断言，
  种植从八株加到十株。定位这两行时又踩了一次自己的坑：两条路由共用同一个 `route-view`
  元素，断言必须排在重渲染 `#/intake` 之前；而按"启动 / 取消"文字找 LI 会先命中作业行里
  那个同名禁用按钮，改成按该行独有的"本会话无该授权"定位。
- 证据目录 `.project-local/task-artifacts/ui-first-20261009/qa-20261009m/`（`qa-20261009l` 是
  加入这两条断言之前的同一批屏）：两套配形的三宽度几何回执、AA 回执、16 个块的 vm 日志
  （新增 ⑮）、十株种植日志（`falsify-continue`，全部红在种下的原因上，`shell.ts` 还原为
  `e87b2b17228f`、bundle `d5c7c1bf4b8b`）、以及 23×2 张把 PNG 摘要与 bundle/stylesheet
  绑在一起的 `SHOTS.json`。
- **实拍有一个说不出口的空白**：捕获用的项目 `制作记录（0）`——每个捕获/闸都自己起一份
  临时 state.db（`.project-local/task-runtime/tmp*/`），所以截图里永远没有原生作业行，
  新接的接续按钮在 46 张 PNG 里一张都没出现。它的证据目前只有 vm 的行为证明。
  要补像素，就得在那份一次性 state 里 POST 一个 native-plans（只排队、不起宿主、随临时目录
  丢弃），并在 `SUBJECT.json` 标成捕获脚手架。
  其中两次种植一开始是废的：这个文件是 CRLF，跨行锚点匹配不到（`count=0`）；另一株只改了
  被拼接字符串的前半句，被钉住的后半句还在，于是页面仍然诚实、判据仍然绿。改的是种植。
- 还有一处**判据自身的错，而且它被"修好"过一次又复发**：新记录器要的成句子写成
  `STATIC_BATTERY GREEN`，而电池一直写 `STATIC_BATTERY ALL_GREEN`（步骤 `EXIT=0`），
  于是一道通过的闸被记成 FAIL。第一次只改了账本里那一行，没改记录器里的错句子，
  所以同一批重测时它又红了，并且把共用这一步判据的另一条记录
  （`DL-UI-U05-stale-claims-corrected`）一起带成 FAIL。教训是：修一条被误判的记录时，
  必须同时修产生这个误判的规则，否则"修好"只是把那一行字改对。
  取证方式保持不变——`fix_static_record.py` / `fix_record_verdicts.py` 先重算回执与产物摘要，
  再只允许 `outcome`/`exit_code` 两个字段变动，并打印它依据的那一行——不是手改结论。
  现在 `currentExecution` 的 143 条证据里非 PASS 为 0。顺带修掉两个 `-r9-r9` 的双后缀记录 id；
  账本里另有 12 条历史 id 带 `-r7-r2` / `-r8-r2` 形态，属于可读出"哪一批 + 第几次重测"的
  旧命名，不改动历史。

## 第十三批追记（2026-10-10，U06 观察面 + 一次我自己造成的静默事故）

- **U06 缺的是读面，不是动作。** `native_tasks.py` 一直记着宿主占用、静默回执、对账与恢复
  协议，`http_service.py` 里却没有任何路由投影它们（实测 grep 零命中），所以界面能说出作业
  状态词，却说不出"Photoshop 现在被占着"。新增 `GET /api/projects/{id}/native-runtime`：
  只读、`mode=ro`、**绝不建表**——建表是 `native_tasks._connect` 的职责，读侧一旦建表，
  "这台服务从未跑过原生作业"就会变成"宿主空闲"，正是本仓库已犯过两次的错。
  `budget` 恒为 null 并带理由，不写 0；不造 IDLE/HEALTHY/READY 这类判定词。
- **接缝闸先把我拦下了一次**：新的 `apiOrEmpty` 读取必须有自己的 `shapeNotice`，
  报错原文是 "runtime read through apiOrEmpty but no shapeNotice call reports its missing
  fields"。按要求把 notice 移到读取点，接缝数 36→37，全部有主。
- **⑮/⑯ 的种植里有两株是我自己的断言无效**：一株的期望写成了产品文案而不是抛错原文；
  另一株在整个视图里 grep「未读回」，而作业行的 events 占位句本来就含这四个字——页面坏了
  它也不会红。后者改成把断言限定在面板内，并补一条反向检查（完整读回不得被当成未读回）。
- **一次静默事故 + 一次更糟的"修复"**：某个 scratch 用 `Path.write_text()` 重写受跟踪文件，
  在 Windows 上把 `shell.ts` 等 **9 个文件、23190 行**从 LF 转成 CRLF。`.gitattributes` 明明
  写着 `* text=auto eol=lf`，而 `core.autocrlf=true` 让 `git status` 一声不响——先暴露的居然是
  三株种植突然 `count=0`：**闸还在退出 0，却已经不守卫了**。我随后想用一条正则给所有 scratch
  脚本补 `newline='
'`，结果把 390 个文件里的 148 个改出语法错误（比原 bug 更糟），只能
  逐字节回退成"删掉我插入的那段字节"。最终交付的是门而不是笔记：
  `design-lab/tests/test_working_tree_line_endings.py` 最终形态是"被脚本按字符串锚点匹配的
  8 个文件必须是纯 LF"，并自带一株种植验证。前两版都被实测否掉：diff 版不可行
  （`core.autocrlf=true` 下纯换行改动产生的 patch 是 0 字节，git 根本看不见）；全仓字节比对
  版一上来就红 2,729 个历史 CRLF 文件（连 `.gitattributes` 自己在内），这种门下一个接手的人
  只会把它改成永真。第三版才既 satisfiable 又能命中本次事故。  行分割吃掉），比对工作树与属性，并按 63 条既有偏差的基线判定——**新增即红，已修却仍留在
  表里也红**（只能缩）。种植：把 README.md 改成 CRLF → 点名定罪，还原后字节一致。
  写这个门时自己也错了一次：只取 `parts[2]` 会把 `attr/text=auto eol=lf` 里的 `eol=lf` 丢掉，
  那样整道门会变成永真。
- **一个红步骤按瞬时中断处理，而不是放宽判据**：矩阵里浅色主题的溢出闸报
  `OV_SPEC_BROKEN 1920/960:domains showed 0 row action(s)`，但两份回执在该路由上字节一致，
  日志里有 `WinError 10053` 连接中止；空闲复跑 80.5s 通过，于是重新落这份回执并把它记在
  证据里，而不是把那条"必须看到行内动作"的判据调松。
- 证据目录 `.project-local/task-artifacts/ui-first-20261009/qa-20261009p/`：三宽度 × 23 路由
  = 69 个样本两套配色全清（含带新面板的 `#/records`）、AA 回执、17 块 vm 日志、五株运行时
  种植日志、13 项电池（含新增的门与 native-runtime 模块）、23×2 张与 bundle
  `6ff8532de49a` 绑定的 PNG。账本 153 条证据、非 PASS 0 条。
- **本轮以 owner 指令收尾**："完成当天跑的任务就停止任务"。因此提交并推送后停在
  `qoder/designlab-backup-consistency-20261007`，`main` 未合并（该分支领先 origin/main
  190 个提交），CI 结论、真实宿主 E3、真人评审 E4 与手机端仍为未做/未签。
