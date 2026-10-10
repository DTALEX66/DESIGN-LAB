# 下一轮任务提示词（DL-TP-20261009-UI-FIRST-R1，接第十四批之后）

按新任务包继续执行桌面 UI：在已落地的 U01/U02 壳层与可选配色主题、U03 能力目录（详情地址、
域包二级入口、§4 资产类型 tabs）、U04 输入/分析/制作记录（含简报写入行为证明）、U05 目标包屏
（含五种服务端拒绝与接续入口）之上，推进剩余 R2 条目与 T05–T09/T16 支持项。配色保持"既有
DESIGN-LAB 色板为默认 + 20261009 取值作可选主题"；手机端 FROZEN_DEFERRED；不建第二 runtime/
画布/知识主库/Schema；真人结论与宿主副作用不代签；每批更新 `currentExecution` 与 `reports/current`
并给出可审阅桌面实拍。实时调用技能插件辅助，缺少的可安装装载。

## 先读（顺序即权威）

1. `AUTHORITY.md`；2. `.project/governance/authority-index.json`；3. `AGENTS.md`；
4. `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md`；
5. `design-lab/config/task-ledger-r3.json` 的 `currentExecution`；
6. `docs/taskpacks/20261009-ui-first/TASK-CARDS.md`（含"2026-10-09 Design QA 增量"与
   U05 一节里 2026-10-10 的接续结论）；
7. `docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` —— 先读文末
   **「需要 owner 裁定的清单 A–G」**，再读第一~七批、**第八至十一批追记**、第十三批（U06 +
   行尾事故）与**第十四批**（CI 三个红的拆分）；
8. 设计源 `docs/history/taskpacks/20261009-r2-inputs/ui-r2/specs/01_UI_SCHEME.md` 与
   `specs/design_tokens.json`。

## 实测基线（2026-10-10，第十四批之后；不是历史声明）

- 本轮的提交链（同一分支，全部已 push）：`88529112` 能力契约修复 → `1ab5a936` 账本回执 +
  投影 + 对账表 → `c46a4525` 报告的第十四批追记与 G 项 → `e8294b3f` CI 实测读数 + 本提示词基线
  → 之后是纯文字修正提交。**双端一致不要抄这里的 SHA**：本文件写下的任何 SHA 都会在"提交这份
  修正"的那一刻过期，第一步自己读回 `git rev-parse HEAD` 与
  `git ls-remote origin refs/heads/qoder/designlab-backup-consistency-20261007` 比对，并确认
  `git status --porcelain=v1` 行数为 0（本轮最后一次实测是 `d08c6240`，MATCH=YES，dirty=0）。
  `main` 未合并；分支领先 `origin/main` `fc03a303` 的提交数用 `git rev-list --count` 现场量
  （`e8294b3f` 时为 199；第十三批写的 190 是想出来的数，已在报告里追正）。
- `apps/workbench/build/main.js` = `6ff8532de49a`，353,765 B；`shell.ts` = `d4cb20cfcbc1`；
  `style.css` = `4eb367eca1ea`，98,498 B；`tests/appshell.mjs` = `1df180c022b2`。
  **本轮一行界面字节都没动**——批次内容在服务端契约与账本。
- `design-lab/schemas/capability-library.schema.json` = `3190c87bfa89`，9,460 B，纯 LF，
  `required` 与 `properties` 各 26 键且集合相等（脚本断言）。
- 本地闸：`VERIFY_DESIGN_LAB=OK total=74 failed=0`；
  `VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=7 failures=0`（修前 CI 记 failures=121）；
  `CURRENT_EXECUTION=PASS tasks=34 mobile=FROZEN_DEFERRED counts={NOT_STARTED:25, PARTIAL:9}`；
  `TASK_DOC_STATE_GATE=PASS checks=11`；`VERIFY_PROJECTION_FRESHNESS=OK records=14 verified=19
  receipts=5 excluded=0 findings=0`；`PATH_REF_GATE=PASS checks=10`。
- 账本：**155 条证据、非 PASS 0 条**。其中 **150 条 artifact 指向 gitignored `.project-local`**
  （125 个不同路径），5 条指向受跟踪文档（本报告 3 条 + 对账表 2 条）。仓库体量实测
  `size-pack=242.71 MiB`；`origin/main` 可达 9430 个 blob 的未压缩原始字节合计 = 360.1 MiB
  （全部 blob 求和，不是 pack 压缩量，也不是按路径归属的 minigame-runtime 182.19 MiB）。
- CI 实测（`gh run view --log-failed`）：@ `aa3cb307` 为 `VERIFY_DESIGN_LAB=FAIL total=74 failed=3`
  （`VERIFY_ROUTE_PAYLOAD_CONTRACTS=FAIL bindings=7 failures=121` + `CURRENT_EXECUTION=FAIL [Errno 2]`
  + `VERIFY_PROJECTION_FRESHNESS=FAIL … deepseek_content_audit.py --check`）。
  **@ `c46a4525`（本轮推送后，run 38061750943）仍是 failed=3，但组成变了**：
  `failures=121` → `failures=1`（剩下那条是 evidence-projection 在 clone 上拒答），
  `[Errno 2]` 与 `content audit` 照旧——**三条红收敛成同一个根因**：受跟踪的判定去重算
  clone 里不存在的机器字节。两个未修的在 `aa3cb307` 的干净 detached worktree
  （`.project-local/worktrees/ci-repro`，`git status` 0 行）里逐字复现过，处置见报告 **G** 项。
- 仍然成立的上一批基线：服务路由 **54** 条（含 `GET /api/projects/{id}/native-runtime`），
  对账表 **17 屏 / 19 视图 / 54 路由 / 37 令牌**；appshell 合同面 ①–⑯ 块；种植总数 **47**
  （域包合同 6 + 浏览器闸 4 + 成列 4 + tabs 6 + 简报写入 5 + 侧栏提示 2 + 五种拒绝 4 +
  接续/状态类别 10 + 运行时面板 5 + 行尾门 1）；溢出闸两套配色各 **69** 个样本
  （23 路由 × `1920,960,620`）全清，`navCue` 三宽度顶部亮末端灭，`hiddenPx` 只随高度变
  （侧栏固定 168px 列），跨配色差 26px——文档与注释一律不抄这个数。

## 本轮该做的（按依赖顺序）

0. **上一轮按 owner 指令收尾**："完成当天跑的任务就停止任务"＋"全部上传 双端仓库一致"。
   双端字节一致已达成；目标停在 U06 观察面完成、动作面未授权、25 项 NOT_STARTED 的状态，
   不是"全部完成"。下一个会话先重读 `currentExecution` 与 `git ls-remote`，不要继承本文件的
   任何"已完成"说法。
   已完成、别重做：U03 二级入口与 tabs、U04 输入/分析/制作记录（含简报写入与接续）、
   U05 目标包屏（五种拒绝 + 状态类别 + 接续入口）、U06 只读观察面、T05/T06 取证与记录、
   能力契约的 `axes`/`qualificationReason` 声明、三宽度缩放扫描、行尾门。
   仍未做且顺序在前：R2 §2 领域空结果面、R2 §6 草稿自动保存、U07 成果版本与局部改稿、
   U08 真人评审与交付预检、U09/T16 知识回执面、T07、T09。

1. **T05 / T06 已落，别再照卡片当"未开始"**（第十四批实测）：`DL-FINAL-T05` 与 `DL-FINAL-T06`
   现在都是 **PARTIAL**，各有 3 条回执（含 clean-install 的 `skipped=0` 取证与七轴/资格读回）。
   实现侧本来就是现成的：`test_capability_library_clean_install.py` 做离 repo CWD、剥
   `PYTHONPATH`、断 `repo_root != REPO` 与缺资源 fail-closed，`_qualification()` 读回已登记的
   判定而不是硬编码。**剩下的真缺口**是第十四批补的那半：closed schema 之前禁掉了
   `axes`/`qualificationReason`，现在 26 键全声明。留意 `static_battery_batch7.py` 只跑 7 个模块，
   **不含**这两个能力模块，要引用它们的数字必须另加步骤。跑之前确认 `uv` 在 PATH
   （本机 `C:\Users\ALEX\.local\bin\uv`）并留意 `uv build` 是否在 repo 根留下未被 `.gitignore`
   覆盖的 `*.egg-info`。
2. **接续入口的像素证据**：每个捕获/闸都自起一次性 `state.db`
   （`.project-local/task-runtime/tmp*/`），所以截图里 `制作记录（0）`，新接的按钮在
   46 张 PNG 中一张都没出现。要补，就在那份临时 state 里 POST 一个
   `/api/projects/{id}/native-plans`（只排队、不起宿主、随临时目录丢弃），
   并在 `SUBJECT.json` 标成捕获脚手架。拒绝卡不必补像素：那需要伪造服务端响应。
3. **U06 的观察面已落，动作面仍未授权**：`src/design_lab/native_runtime.py` +
   `GET /api/projects/{id}/native-runtime` 已经把 `native_tasks.py:59-76` 的五张表投影成只读
   回执（ABSENT 与"存在但 0 行"分开、budget 不可得时写 null + 理由、绝不发 DDL、
   不给生产就绪结论），`#/records` 消费它，合同登记表 `contract-bindings.json` 同批补了行，
   `DL-UI-U06` 现在 PARTIAL / 4 条回执。**仍然不许做的**：`POST /tasks/{job}/run|cancel|…`
   是真实宿主副作用，按钮保持禁用并各带理由；`native cancel` 没有 ack 事件，不要伪造
   "已停止"状态。
4. **R2 §2 的领域资产空结果面**：需在 `#/domains/<packId>` 上第二次读
   `GET /api/capabilities`，并区分"没有已接线关联"与"该领域没有能力"；同时按新事实改写
   appshell ⑤/⑪ 的"恰好一次读回"理由，**不要为了绿而放宽断言**。
5. **R2 §2 上下文二级侧栏**：卡在 owner 裁定清单 A 的 4 条命名上，界面不许猜。
   若加侧栏子项，注意 `.app-nav-item` = 19 被 `browser_design_layer_e2e.mjs` 钉死，
   改计数必须带日期理由。
6. **R2 §6 草稿自动保存**：`#/intake` 的显式保存已写入服务并有行为证明（⑬）。
   自动保存**不能**写成简报修订（修订是不可变版本，逐键保存会灌爆版本链）；
   需要一条可变草稿行路由，照 `GET/POST /api/projects/{id}/research`
   （`http_service.py:337/462`、`research_review.py`、`assurance/research_store.py`、
   `write_fields()` 取自合同、body 上限 65536）的形状做，并同批改合同登记表。
7. **U09 / T16**：`http_service.py` 里没有任何 knowledge 路由，T16 验收依赖 U09，排在 U 系列之后。
8. **CI 在干净 clone 上的三条红已收敛成一个结构决定，要的是裁定不是修**（契约漏项在 runner 上
   确认修掉：`failures=121`→`1`）。原文：
   `CURRENT_EXECUTION=FAIL [Errno 2] No such file or directory: '…/.project-local/task-artifacts/ui-first-20261009/u06/implementation.json'`
   和 `VERIFY_PROJECTION_FRESHNESS=FAIL FRESHNESS-RECEIPT-DRIFT scripts/deepseek_content_audit.py --check
   exited 1: CONTENT_AUDIT=FAIL records=2 findings=2 notices=1`。
   同一根因：**受跟踪的判定去重算被 gitignore 掉的机器字节**（150/155 条回执的 artifact 在
   `.project-local`；content audit 的 37 个 vendor 树也在）。可选修法三条，都会动判定词，
   先要 owner 选：① 把回执字节搬进 Git（`size-pack` 已 242.71 MiB，这是先前明确避开的方向）；
   ② 给投影加一个与 MISMATCH 分开的具名状态（如 `ARTIFACTS_ABSENT_IN_CLONE`），让"这台机器
   没有那份字节"不再读成"回执被改过"；③ 把 content audit 的 presence 改成 SPILL-CENSUS 那种
   "按版本化记录判定、实时普查只作为机器状态上报"。**不得**用调低判据、把闸从聚合里摘掉、
   或让 `--check` 读磁盘缓存的方式让它们变绿。

## 已落，别重复劳动

域包二级地址与详情面板、`DETAIL_NAV_OWNER`（顺带修了 `#/projects/:id` 丢高亮）、
分组全局搜索与面板自裁、行内动作/药丸成列、`capability_library.py` emitter 指针 210→247、
§4 五张 tabs 与 `未分类` 徽章、简报写入的 ⑬、侧栏提示断言与 stale 数字清除、
制作记录路由、交付目标与知识上下文、能力详情地址与去重计数、active 条件条。
**第十批**：`#/plan` 的五种服务端拒绝各说各话且带服务端代码、连接失败不冒充业务拒绝、
RIR 收进默认折叠的次级面。**第十一批**：409 幂等冲突改用 `conflict` 类别（并要求两种 409
落在不同类别）、`#/records` 与 `#/intake` 的接续入口接线（行为证明＝只改 hash 且 0 请求）、
导入行不给入口、启动/取消保持禁用并各带理由、声明面板与页面控件一致性断言、
五处（+`TASK-CARDS` 一处）"没有任何调用方"改为"没有生产调用方"、溢出闸三宽度扫描。
**第十三批**：`native_runtime.py` 只读观察面 + `GET /api/projects/{id}/native-runtime` +
`#/records` 运行时面板（ABSENT≠0 行、budget 不可得写 null+理由、不发 DDL、不给生产结论）、
合同登记表同行、⑮/⑯ 两块合同、行尾门 `test_working_tree_line_endings`（最终形态＝锚点文件必须
纯 LF + 自带种植）、把 9 个被 scratch 转成 CRLF 的受跟踪文件按字节恢复。
**第十四批**：能力契约声明 `axes`/`qualificationReason`（26 键必填）与 `$defs.axisValues`，
`qualified` 从 `const null` 放开为 `boolean|null`（先实测确认 `model-radar.json` 里
`"qualification"` 出现 0 次，所以没有伪造通道）；CI 三个红逐条拆开放进报告 G 项与第十四批追记，
并在 `aa3cb307` 的干净 detached worktree 里复现了其中两个；新回执改 seal 受跟踪文档。

## 环境与坑（都会咬人）

- Bash 里 `python`/`node` 都不在 PATH：python 用 `.venv/Scripts/python.exe`（无 pytest，
  用 `python -m unittest design-lab.tests.<mod>`），node 用
  `.project/paths.json` 声明的 `.../scoop/apps/nodejs-lts/24.18.0`。
- **vm 合同面加载的是 `build/main.js`，不是 `shell.ts`**：改完源码必须先
  `vite build` 再跑 appshell，否则新断言会红在"旧字节"上（本会话就这么红过一次，
  报的是上一批的 `forbidden`）。
- **`shell.ts` / `appshell.mjs` 是 CRLF**：栽桩脚本里的跨行锚点（含 `\n`）匹配不到，
  表现为 `count=0` 的"种不下去"。用单行锚点，并靠缩进差异区分同名代码。
- **一条断言只改字符串的一半不算改**：拼接字符串里被钉住的是后半句，改前半句页面
  仍然诚实、判据仍然绿。种植必须移动被断言的那几个字节。
- 定罪的期望值是**抛错自己的那句话**，不是产品文案；写反了会把有效种植误判成"没红"。
- **两条路由共用同一个 `route-view` 元素**：在 vm 里重渲染 `#/intake` 之后，
  先前拿到的 `recordsView` 已经是输入页内容。跨页断言必须排在重渲染之前。
- 用文字找 LI 会被同名按钮抢走：作业行里也有"启动 / 取消"，按该行独有的句子定位。
- **浏览器闸会静默 skip 且 exit 0**：判据是输出里有 `Ran 1 test` 且无 `skipped`。
- **打印了 "all checks passed" 不等于绿**：一次未处理的 Promise 拒绝让 appshell 在
  全绿输出之后 exit 1。永远看退出码，且别让管道把退出码吃掉（`grep | tail` 之后
  `$?` 是 `tail` 的，本会话又踩一次）。
- 中文经 unittest 的 cp936 stdout 会成乱码；读闸的结论要读它自己写的 UTF-8 日志，
  且该日志被所有配色共用、**最后写的人赢**——引用数字必须回到对应
  `qa-*/overflow-*.json` 产物里读。
- 带空格的路径在 `shell=True` 下必须加引号（`CAP_WIDTHS_EMPTY` 那次就是 argv 错位）。
- **修一条被误判的记录，必须同时修产生误判的规则**：本会话记录器把成功句子写成
  `STATIC_BATTERY GREEN`（真实是 `STATIC_BATTERY ALL_GREEN`），第一次只改了账本那一行，
  重测时同一批又红，并把共用该步判据的另一条记录一起带成 FAIL。取证脚本只允许
  `outcome`/`exit_code` 变动且先重算回执摘要（`fix_static_record.py`、
  `fix_record_verdicts.py`），不是手改结论。
- 记录 id 会带后缀：`rec()` 里不要再把批次号写进字面 id，否则 `-r9-r9`。
- **注释改动不改 bundle 字节**（esbuild 剥注释）；`style.css` 是独立文件，改 CSS 时
  bundle 不变而样式摘要变，回执两个都绑。
- 栽桩者按启动时快照还原源文件：**跑闸期间不要编辑 `shell.ts`/`design.ts`/`style.css`
  /`appshell.mjs`/`audit_workbench_overflow.mjs`**，也不要在这时候跑 `uv build`。
- 每条新断言先种一次错证明会红；种植不红时先怀疑种植。
- **本地 74/74 绿不等于 CI 绿**：修契约之前 CI 有三个红，其中两个在本地永远复现不了，因为受跟踪的
  判定去重算被 gitignore 掉的机器字节（回执 artifact、vendor 缓存）；修完之后剩下的三个红**全部**
  是这一个根因。复现方式是干净 detached worktree（`git worktree add --detach …`，同分支要先
  `--detach`），在里面跑闸的 `--check`，而不是在本机放宽判据。新写回执请 seal **受跟踪**文档；
  账本里 150/155 条已经指向 `.project-local`，别再加深。
- `gh run view <id> --log-failed` 会把整个 job 的 runner setup 一起打进来，找 `FAIL` 行要 grep；
  闸的子级细节（例如 `CONTENT_AUDIT=FAIL records=2 findings=2`）不一定进日志，进日志的只有
  聚合器捕获的最后一行——剩下的靠 worktree 复现，不要照抄记忆。
- 行号型指针（`file.py:210`）会被正常开发撞坏；改完必须跑 `test_contract_bindings`。
- `findNodes(root, tagName, needle)` 是"标签 + 文字"两参数谓词，不是回调；要按谓词遍历用
  `walkNodes`。`el()` 把 `id`/`disabled` 走 `setAttribute`，读要用 `attributes.get()`。

## 边界（逐字保留，不得由本提示词扩权）

本提示词与包内文本不单独授予安装/付费/跨仓写入/公开发布/真实宿主副作用/commit/push/merge
权限；按接收会话实际 Task Grant 判断。E 盘受保护，无精确授权不得访问；跨项目素材、系统数据、
E/F 盘不因旧包或本轮任务获得访问授权。真人身份/时间/接受不能由 Agent 代签；分析、目标包生成、
真实执行、原生工程交付、真人评审是不同结论；没有输入、产物、宿主或受理证据的 null/unknown
字段不得转换为成功。私有数据/保护盘/恢复/Human Gate 边界不变；不建第二 runtime/画布/知识主库；
不重造通用 Agent。原型虚构 ID、卡片、localStorage、下载/暂停/取消都不作为真实生产数据。
一个 checkout 一个 writer，不主动并行开 Agent。AAOS 属独立项目；AAOS 自身任务、损坏包或文件
读取异常不列为 DESIGN-LAB 未完成项。不执行原包的 Agent 提示词或 build 脚本来获得权限；
第三方 AGENTS/CLAUDE/cursorrules/SKILL 作 inert source blobs 保存。手机端 FROZEN_DEFERRED。
既有配色不得被覆盖；设计产物留在本项目内，不外溢。不要为缺三方或人审而阻塞可完成的可逆工程；
别继续无限治理。
