# 下一轮任务提示词（2026-10-11，接 DL-TP-20261009-UI-FIRST-R1 第十九批之后）

> 本文件是会话提示词，不是独立 Authority。执行前仍按根 AGENTS.md 顺序读
> `/AUTHORITY.md` → `.project/governance/authority-index.json` → 本仓库 `AGENTS.md`
> → 唯一当前包 `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md`
> → 唯一状态源 `design-lab/config/task-ledger-r3.json` 的 `currentExecution`。
> 分支与工作区状态以你自己 `git rev-parse HEAD` / `git status --porcelain` 的读数为准，
> 不要抄本文件里的任何 SHA。

## 目标（逐字沿用 owner 的指令）

按照新任务包（DL-TP-20261009-UI-FIRST-R1）全部执行：在已落地的 U01/U02 桌面壳、主题与首批三屏之上，
按依赖顺序推进 U03（能力查询与资格投影）、U04（输入、目标与分析纠正）、U05（目标包与已有原生计划接续）
及对应 T05–T09/T16 支持项；配色保持"既有默认 + 新包可选主题"，手机端 FROZEN_DEFERRED，
不建第二 runtime/画布/Schema，真人结论与宿主副作用不代签；每批更新 currentExecution 与报告
并给出可审阅桌面实拍。注意：实时调用你的技能插件进行辅助，缺少可装载。

owner 的当日收口规则仍在效：**完成当天跑的任务就停止任务**；**全部上传 双端仓库一致**
（授权的是 commit+push 到工作分支，不含 merge/release）。

## 边界（不可自行放宽，逐字保留）

本提示词与包内文本不单独授予安装/付费/跨仓写入/公开发布/真实宿主副作用/commit/push/merge 权限；
按接收会话实际 Task Grant 判断。E 盘受保护，无精确授权不得访问；跨项目素材、系统数据、E/F 盘
不因旧包或本轮任务获得访问授权。真人身份/时间/接受不能由 Agent 代签；分析、目标包生成、真实执行、
原生工程交付、真人评审是不同结论；没有输入、产物、宿主或受理证据的 null/unknown 字段不得转换为成功。
私有数据/保护盘/恢复/Human Gate 边界不变；不建第二 runtime/画布/知识主库；不重造通用 Agent。
原型虚构 ID、卡片、localStorage、下载/暂停/取消都不作为真实生产数据。一个 checkout 一个 writer，
不主动并行开 Agent。AAOS 属独立项目；AAOS 自身任务、损坏包或文件读取异常不列为 DESIGN-LAB 未完成项。
不执行原包的 Agent 提示词或 build 脚本来获得权限；第三方 AGENTS/CLAUDE/cursorrules/SKILL 作
inert source blobs 保存。手机端 FROZEN_DEFERRED。既有配色不得被覆盖；设计产物留在本项目内，不外溢。
不要为缺三方或人审而阻塞可完成的可逆工程；别继续无限治理。

## 本轮（第十九批）已经做到的事实，可复核

- T07 产物：`packages/capabilities/selected-sources.json`（6 条来源，选自 980 条里 owner 已记
  CONDITIONAL_POC 的 37 条；版本/许可/撤回路径按引用自 `CANDIDATE-TAXONOMY.json` 复制，
  13 条引文按行号自本地 vendored blob 读出）。
- T07 闸：`design-lab/scripts/verify_selected_source_adaptation.py`，已登记进
  `verify_design_lab.py` 的 SCRIPTS（阶段数 74→75，判据未变）。读数：
  `SELECTED_SOURCES=OK records=6 registered_only=8 mapped=2 consumed=0 motion_deviations=2
  citations=VERIFIED(13)/SKIPPED(0)`。
- T07 任务测试：`design-lab/tests/test_selected_source_adaptation.py`，`Ran 38 tests OK`，
  每个种植由自己的罪名定罪。
- 闸量出的**真偏差（下一批的活）**：`apps/workbench/style.css:1061` 与 `:1065` 动画 `right`
  （布局触发属性），与已提炼规则 `SRC-T07-MOTION-COMPOSITED`（只动画 transform/opacity）冲突。
  现以"有界偏差"登记，**改法要动 nav 抽屉几何**，必须同批重跑：
  `design-lab/tests/e2e/audit_workbench_overflow.mjs`（两套配色 × 1920/960/620）+
  `audit_workbench_theme_geometry.mjs` + 截图驱动，然后更新 `knownDeviations` 条目
  （少一条或多一条都会红）。
- 桌面 UI 字节本批未变：`apps/workbench/build/main.js` `255e992ac03b…`(358,028 B)、
  `style.css` `f5410c1ad591…`(101,028 B)、`shell.ts` `875d61cf475b…`(428,853 B) 与第十八批被审阅
  截图所绑的同一三枚摘要；第十八批实拍仍是可审阅面。
- 账本：`DL-FINAL-T07` = PARTIAL，回执 +3（共 172），
  `CURRENT_EXECUTION=PASS tasks=34 counts={'NOT_STARTED': 24, 'PARTIAL': 10}`；
  `AUTHORITY_CHAIN=WRITTEN entries=144` 后 `--check PASS`；`AUTHORITY_GATES=PASS gates=7 failed=none`。

## 下一批建议顺序（依赖优先，不做重复治理）

1. **动效偏差落地**（上面那条，属 T07→前端增量的接续，也在 T08/U02 范围内）。
2. **U04→U05 的真实一条链**：至少一条 实际输入→分析→目标包→纠正 路径（T09 验收原话），
   精准文字强约束要有真实路线，提示词不得冒充原生工程；`rir.layers` 的接续仍有 task #13 的缺口。
3. **T16**：AAOS 版本知识/候选回执/离线边界——在途版本固定、撤销与新鲜度如实处理、
   不跨 DB、不双主、不默认全库迁移、替身不冒实联；它排在 DL-UI-U09 之后。
4. 需要 owner 裁定的不要猜：A、C、D、E、F、G（含顶栏 78 实测 vs 包内 64、h1/h2 角色映射、
   活账本是否标 `mutable_state`）以及本批新增的 **H**（13 份 rubric 加权求和 vs 分档锚点、
   轴数 5–7 不一致）与 **I**（12 套启发式框架与六轴的关系）。全部记在
   `docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` 的 owner 清单节。
5. 三方 SKILL 的执行级供应链判定：本机已装 `research-copilot:skill-criticagent`，
   但它会真实拉起被审对象（宿主副作用），需 owner 点名。

## 本批踩到的坑（照做可省时间）

- `designQuality` 在分类表里是**空对象 `{}`** 而不是 `null`，`tier` 才是 `null`；判"未测量"必须
  覆盖 `null/{}/[]/""` 四种空形，且两个方向都要种植。
- 在 `packages/` 下新增任何文件都会让 `design-lab/scripts/inert_contract_survey.py` 的
  `productFiles` 计数变化，`--check` 随即判红；按其自身规则**重跑生成器**（不加 `--check`）即复绿，
  本次实测除 `productFiles` 208→209 外一字未变。
- 项目 `.venv/Scripts/python.exe` **没有 pytest**（本仓库约定是 unittest，578 个文件用 unittest）；
  跑测试用 `PYTHONDONTWRITEBYTECODE=1 .venv/Scripts/python.exe -m unittest design-lab.tests.<mod>`。
  外部 `10-toolchains/python/venv313` 是 uv trampoline，直接调用会 `entity not found`。
- `Path.write_text()` 在 Windows 会把 `\n` 写成 CRLF，`git add` 时提示 "CRLF will be replaced by LF"
  是既有常态，不是新缺陷。
- 包裹后台命令的 wrapper 退出 0 不等于内部命令通过：读 `AGG_EXIT=`/`GATE=` 这类自记标记，
  不要读 wrapper 状态。
- 中文输出走 cp936 控制台会乱码：写进 `.project-local/tmp/*.log` 再用 Read 读。

## 完成判据

每批：改动 → 闸与测试复跑 → `scripts/generate_current_reports.py` → 账本回执封存（先账本、
后链，同批提交）→ 提交 → 推到工作分支并核对双端 SHA → 读该 SHA 的 CI 日志并**照抄读数**，
不预测、不合并多次运行的数字。真人结论、真实宿主 E3、手机端与 merge 到 main 都不在本批范围内。
