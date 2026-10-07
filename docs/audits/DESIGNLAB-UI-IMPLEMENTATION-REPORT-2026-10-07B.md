# DESIGN-LAB UI 实施收敛报告 B

**日期** 2026-10-07 · **Authority** `DL-AUTHORITY-2026-09-18-R2`
**基线** `main = 72d6ae4b`（#259 并入后）· 本报告随 `#260` 落地
**接手** CODEX 分支 `qoder/designlab-picker-autoselect-20261007` 的未提交移动端改动
**与 CODEX 报告的关系** 取代 `DESIGNLAB-UI-IMPLEMENTATION-REPORT-2026-10-07.md` 中"远端状态 UNKNOWN"
与"Chromium 不可用"两节——那两条是它的 sandbox 限制，不是仓库事实；本文给出实测值。

## 一、桌面端 UI 现在能做什么（有证据）

| 能力 | 证据 | 等级 |
|---|---|---|
| 13 个面在 1280/1920/2560 全部渲染，无溢出/无对比度违规 | `AUDIT_SCOPES 39 violations=0 ok=True` | E2 |
| 真实设计链：建项目→导入参考→建 Brief→建方向→选定→绑定设计系统→改 Brief→改已选方向→重建绑定读回→**重开页面后仍读回** | `browser-e2e-summary.json`：12 场景 `result=PASS`，`consoleErrors=0` | E2 |
| 每面首屏截图 + 机读清单（headings/KPIs/unread 计数随图存档） | `CAP_DONE shots=39`，manifest 绑定 commit | E1–E2 |
| 移动端链（appshell 布局） | 同一 E2E 的 `mobile-appshell-layout` 场景 | E2 |

E2 的限定：`subjectSha` 本地记为 `"local"`，CI 上才绑 exact SHA；本地这份证据不绑 SHA，引用时须说明。

## 二、本轮真实改掉的东西

| 缺陷 | 为什么之前的门看不见 | 落点 |
|---|---|---|
| 侧栏身份块在 4 条长页路由掉出折叠线 | 拉伸网格项不是溢出，是比屏高 | #258 |
| 台账只有 1 项目时三个 picker 面是死路 | 空态环"可滚动即合法" | #258 + 新审计项 |
| `.kpi-grid` 固定 4 列，3 计数器留 ~240px 空洞 | 空洞不是违规 | #258 |
| 共享输入零行仍标"服务端环境读回" | 空列表与读到空同形 | #258 |
| 未开放页 1 卡 / 宿主 2 卡塞三栏 | 同上 | #258 |
| 移动端滚动提示会随菜单滚走 | 类/aria 检查两种写法都绿 | #259（CODEX 提出，实测后改 sticky） |
| 宿主网格无据绿标"已登记"，同页却写 UNKNOWN | 颜色语义不在任何门的断言里 | #260 |
| `交付包（0）` 的 `0 === 0` 空真值通过 | 计数看着合法 | #260 |
| 200 响应缺集合 → 整页 TypeError 失败（⑤） | 崩溃点离原因几层远，消息只剩 TypeError | #261 |

配套守卫：`picker-dead-end`（先证伪：旧 bundle 3 违规）、`test_workbench_sidebar_pinning.py`
（4 处变异致死）。

## 三、明确未完成

1. **⑤ 响应形状异常**：崩溃面已在 seam 归一化修掉（#261）——200 响应缺列表/缺映射不再在
   后续字段访问处抛错、不再让顶层 catch 把整页变成"视图读回失败"。
   **范围限制**：归一化覆盖全部 21 个 `apiOrEmpty` 站点的崩溃面，但
   "未读回：响应缺少 …"这条**文字只接到 项目 与 仪表盘 两面**；其余面不再崩，
   但仍会把"缺字段"显示成"空集合"。铺 notice 是同一模式的机械活，本轮未做完。
   第一版（抛错式守卫）已回滚：它比 appshell 的部分 mock 更严，见 §五。
2. **Rights / Preflight 阻断案例、Handoff 可重开**：界面存在、我已逐屏读过，
   但**没有浏览器链覆盖**（E2E 的 12 场景不含它们）。
3. **首屏仍是第二套壳**（D-6 未决）：legacy 导航 + "本机已连接" vs B10 侧栏 +
   "本地单用户 / 无身份路由 · 未读回"。本轮只补了它的移动端 affordance，没有替 owner 统一。
4. **移动端已无 CI 覆盖**：证据口径按指令收到 ≥1024，代码保留。恢复用 env，已实测。

## 四、需要 owner 才能推进的（不是我的进度问题）

- 真实宿主 E3（Illustrator / Photoshop 保存 + 重开局部编辑）：需明确授权拉起宿主窗口。
- Human Jury E4、release E5、发布：需真人 / 决定。
- D-1 Inter、D-3 规格矛盾、品牌蓝 `#316CFF`、中英标题政策、首页坏消息权重、
  INSPECTOR 空环、D-6 壳统一。

## 五、回滚范围

本轮全部改动集中在 `apps/workbench/{shell.ts,style.css,build/main.js}`、
三道门的宽度默认值、`design-lab/tests/` 两个测试文件、以及 `docs/audits/` 三份记录；
无依赖变更、无 lockfile 变更、无数据库或外部副作用。逐 commit 可 revert。

## 六、并入后的收敛（#262、#263，main = a9e4398c）

§三 写下的两项已有实质推进，此处更新记录，避免报告停在旧状态。

**Preflight 的阻断→修复→重新检查已进入真实浏览器链（#262）。**
`design-lab/tests/e2e/browser_preflight_handoff.mjs` 由 shell 门驱动，对真实 loopback 服务
与真实 `design-lab/config/task-resources.json` fixture 执行 5 个断言步：视图挂载且输入框可见；
可解析工具 → READY 且判定 KPI 填充；缺失工具 → BLOCKED、点名被阻塞 ref 与 UNAVAILABLE、
并断言上一个 READY 已被清除而非留在屏上；改声明后同一 task id 复检 → READY；
交付中心在已连接且零交付包时读作真 0 而非未读回。shell 门断言**步数恰好为 5**，
少一步即变红，防止某步悄悄不再被执行。
该门的 skip 路径（无 node / 无 playwright / 无 Chromium / fixture 的 git 前提不成立）
是照抄同族门构造出来的，本轮未单独实测，记为未验证。

**能力库已成为真实读回并带上可得的分类轴（#263）。** 60 条记录（46 源 + 14 模型），
精确仓库路径连接 37/46。先测量后动手的结论值得留档：候选分类账 26 个字段里
`domains`、`artifactTypes`、`capabilityLayers`、`aestheticAxes`、`styleArchetypes`、`tier`、
`designQuality`、`currentVersion`、`referenceLineages`、`reviewedBy`、`reviewedAt`、
`humanApprovalRef` 在 980 条中**全空**，而 `sourceType`、`rights`、`evidenceLevel`、
`adoption`、`removalPath` 等 980/980 有值。因此提示词的"多轴分类"是**人工录入缺口**，
不是界面缺口；界面不代填，并把空轴显式列为未分类。
`evidenceLevel` 全部为 E0，按"仅声明"渲染为警示而非中性事实；热度带观测时间、来源与
`isNotQuality`，因为分类账策略写明 popularityIsNotQuality。

**仍开放（且不是我能替完成的）**：对某一项候选真实做适配 / 资格化 / 撤回——需要宿主运行
与人工验收；Human Jury 的 Accept/Reject/Change 面——`human_jury.py` 合同完备但无路由无 UI，
且其人工字段按铁律永不由 agent 填写；⑤ 的"未读回：响应缺少 X"文案目前只接到项目与仪表盘两面。

**本轮收尾证据（a9e4398c）**：`AUDIT_SCOPES 39 violations=0 ok=True`、`CAP_DONE shots=39`、
`test_capability_library.py` OK、`test_workbench_preflight_handoff_e2e.py` OK。

## 七、⑤/①/④ 三面收口、桌面端口径、开源池实测（2026-10-07，main = 52dfb791）

§六 的"仍开放"三项在本轮收掉两项，另一项被实测证明不是 agent 能做的。此处**追加**而非改写
§六——那一段是当时状态的记录，改写它会让"当时确实没做完"这件事失去痕迹。

**⑤ 形状异常（已并入 14d7179a / PR #265）。** `未读回：响应缺少 X` 从 2 面铺到 **21 处 seam 读回**。
两道门互补：AST 门按变量名证明每个 `apiOrEmpty` 绑定值都被引用，`ROUTE_VIEWS` 扫描门证明这句话
真的进了 DOM。扫描门当场逮到 AST 门看不见的一处谎——`projectPickerPanel` 空台账时提前 return，
把"服务没返回 projects"说成 `尚无项目`。六项变异逐一跑过两道门，结果记在 PR #265。

**① 未连接 与 ④ 真实空（已并入 52dfb791 / PR #266）。** 离线兜底载荷在 seam 源头打标，13 处空行
按读回状态措辞；`projectPickerPanel` 现在区分**三种**空（真 0 / 响应缺字段 / 未连接）。门是双向的：
未连接时 13 个路由零条"实况专属"措辞泄漏，而已连接且服务真答空集时必须照实说 `尚无项目`——
只有前半句的门，删光空态句子就能变绿。

**桌面端口径（owner 2026-10-07 裁定：只收口径，不删代码）。** 当前视口口径为
**1440 / 1280 / 1920 / 2560**，capture 入口只产出这四面 × 13 路由。`@390`、`@768` 的截图、
license 记录与 overflow 报告**作为历史证据原样保留在仓内**，不删除；移动端布局代码与样式
一律未动。§视口清单（本文档 §一 与视觉审计 §12 行）里出现的 390/768 数字属于该历史批次，
不代表当前口径。

**预检解析器一致性（PR #267，本文件写下时仍 OPEN，不记为完成）。** `doctor.probe_tools` 与
`task_resources._probe_tool` 对"这台机器有没有 node"给出过互相矛盾的答案，而
`/api/task-preflight` 的注释声称两者永不一致的情况不存在。#267 把 `preflight()` 里从未被使用的
`paths_describe` 形参接上。**本机判定一项未变**：剩余 BLOCKED 全部来自 `python-project-venv`，
它在 `paths.json` 中没有注册，而其登记说明明确拒绝硬编码 `Scripts/python.exe`，`paths.json` 又是
带绝对路径的受版本控制文件——**以何种平台中立方式声明项目 venv 属 owner 裁决**，未自采基线。

**开源池吸收实测（并行只读子智能体，结论逐条回查过 HEAD 字节）。** 结论：**本轮没有 agent 可完成
的吸收动作**，且"未吸收"这个状态本身是被正确记录的，不是缺口。依据：46 条源的 presence 为
`LOCAL_CACHE_ONLY` 37 / `ABSENT_FROM_GIT` 6 / `IN_REPO` 3；三条 `IN_REPO` 里两条落在
`test_inert_blob_placement.py` 认定的 inert quarantine 根内，第三条
`packages/capabilities/standards/front-end-design-checklist` 只有 LICENSE/README/SOURCE.md 三个
文件、在 `src/` 与 `apps/` 中零引用——即"随仓携带"，不是"已并入"。`src/` 下没有任何 per-file
upstream SPDX；真正的吸收登记册 `design-lab/research/global-absorption/SOURCE_REGISTRY.json` 6 条
全部 `review-required`，且 6 个 `integration.targetPath` 指向的 `design-lab/knowledge/…` 目录
**全部不存在**，与那 46 条完全不相交；晋升需要 `reviewedBy`，而分类账策略
`humanReviewOnly: true` 与 `verify_candidate_taxonomy.py` 写明 agent 不得设置该字段。
两条权利字段为非 SPDX 自由文本（`ui-ux-pro-max` = `MIT License`、`tool-control` =
`MIT / Apache-2.0 per-subtree`），后者是真实的按子树双许可，**不可归一**；二者一律交权利门，
不由 agent 改写观测到的值。

**两道门当场拦下我自己的两处错（门均未修改）。** 真实浏览器 overflow 门在 1440/1280/1920 各报一个
`<11px` 节点，来自我在表格单元里放的 `<small>`；词表门两次变红，一次因为我把 state 写成内联三元
表达式（它的文本扫描读不到 `UNAVAILABLE`），一次因为我在解释这件事的注释里写了它扫描的那个式样，
`X`/`Y` 被当成状态词。另有一处**度量**修正：list 行计数从"字面量出现次数"改为"渲染行数"
（字面量 + `emptyLi` 调用点，各减定义本身），**阈值 50 未动**——降阈值就是我在放宽断言。

**仍未开放**：候选的真实适配 / 资格化 / 撤回（宿主运行 + 人工验收）；Human Jury 的
Accept/Reject/Change 面（合同完备、无路由无 UI，人工字段按铁律永不由 agent 填写）；
`python-project-venv` 的平台中立声明方式（owner）；两条自由文本判决（权利门）。

**一条截图证据的结构性边界（本轮实测得出，不是推测）。** 视觉审计 §十五 对宿主 adapter 行留着
"未单独截图复核，按同一机制推定"。本轮想把它补成像素证据，结论是**当前证据工具做不到**：
`capture_workbench_screenshots.mjs:216` 固定 `fullPage: false`，每面只拍视口顶部，而 adapter 网格
在 `宿主 / Capability 状态` 面板之后——**低于 fold 的内容在全部 39 张已提交截图里都不存在**。
`audit_workbench_ui` 的 `report.json` 只记 `violations`，健康节点不留几何，所以也无法事后量。
因此这不是"再拍一张"能收的，而是截图口径本身的选择（加滚动帧 ≈ 提交集翻倍、约 +5 MiB；
或改 full-page ≈ 换掉整批证据的类别）。**属 owner 口径裁决，本轮只登记，不自行改证据工具。**
推广一句：本应用任何低于 fold 的内容，都不在现有截图证据的覆盖范围内。
