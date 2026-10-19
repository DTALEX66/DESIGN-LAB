# 新会话交接提示词（2026-09-12）

下面整段可直接作为新会话的首条消息。本文是交接快照，不是活动账本，也不构成发布、合并或新增开发授权。

---

请接手 DESIGN-LAB。先恢复上下文、只读核对当前状态并简洁汇报，等待我的新执行方向；不要因重开会话自动恢复全部开发。全程中文。

## 项目与边界

- 工作目录：`D:\All projects\DESIGN-LAB`；GitHub 仓库：`DTALEX66/DESIGN-LAB`。
- 先读根 `AGENTS.md` 和适用的下级规则、匹配技能。项目 standalone-first；WORK-LAB、ArcheAxis 不是运行前置，Open Design 只是可选宿主 adapter。
- 运行、证据、缓存、环境和大产物留在本仓 ignored `.project-local/`。`.hermes` 不是活跃写入根。保护用户改动与共享宿主，不 reset/clean/restore，不关闭共享进程。
- 不访问 E 盘、凭据、私有会话或其他 agent 私有状态；不修改全局配置。知识迁移仍延后。不得代签 Human Gate。
- 用户曾授权推进完整 R5，但上一轮额度剩余35%的停止线已触发，停止新增开发；重开会话本身不解除停止线。用户另曾明确要求“汇报进度 完成上传”，该开发分支上传授权应保留，不能扩展为 PR、合并 main 或 release 授权。执行政策拒绝不得绕过。

## 最新已核实 Git 状态

2026-09-12 交接检查：

- 当前分支：`codex/r3-runtime-correctness`。
- HEAD：`9f34b53e7eff5707e087c35bced57bb17b856ab8`。
- 最新提交：`feat: deliver R5 Photoshop patches and bounded Comfy transport`，53个文件，1983行新增、112行删除。
- 本地远端跟踪引用 `origin/codex/r3-runtime-correctness`：`a06c1db01944faca6c8dd41b8fe22f651138a400`，本地 ahead 1。
- 写本交接文件前工作区干净；本交接文件是本轮新增、未提交文件，需保留。
- 本轮没有 fetch/ls-remote、push、PR、合并或发布；上述远端跟踪引用不是当前云端读回。新会话若需判断上传状态，应只读查询实际远端分支并比较完整 SHA。
- 上一会话最后报告 push 被工具层拦截：`approval required by policy, but AskForApproval is set to Never`。这是历史错误，不证明新会话仍有相同限制，也不证明 GitHub 认证失败。不要改保护配置或换通道绕过拒绝。
- 旧交接中的“大量未提交”“HEAD a06c1db”已被本次 Git 检查覆盖；旧测试的 dirty-tree 身份不能随之改成新提交的 exact-SHA CI。

## 必读顺序（相对项目根）

1. `AGENTS.md`。
2. 本文件及 `docs/handoffs/R5-CURRENT-CONTINUATION-2026-09-09.md`：后者保留详细历史，Git状态以本文件快照及新工具读数为准。
3. `docs/history/taskpacks/r5-20260908/tasks.json`、同目录 `02-TASKS.md`、`03-EXECUTOR-HANDOFF.md`：冻结 R5 定义，不编辑执行状态。
4. `design-lab/config/task-ledger-r3.json`：唯一活动状态编辑源，schema为 `design-lab/task-ledger/r5-v1`，按 depends_on 和案例条件依赖执行。
5. `reports/current/TASK_PROGRESS.json`、`reports/current/PROJECT_STATUS.md`：生成投影，不能手改代替账本；`scripts/generate_current_reports.py --check` 检查漂移。
6. `.project/paths.json`、`docs/LOCAL_ENVIRONMENT.md`：先看已登记的软件和模型位置，再做精确路径诊断；后者部分能力描述早于09-09新增证据，不能用旧文字否定较新记录。

## 已有成果及证据边界

以下是本轮读取仓库文档获得的历史结果，不是09-12重新跑过的测试：

- 最新记录全量：967项，965通过、2跳过，exit0，1077.357秒。两项为Windows符号链接权限1314，不能计PASS。基于 `a06c1db` 加当时 DIRTY_WORKTREE，不是 `9f34b53` exact-SHA CI。
- 日志：`.project-local/task-artifacts/full-regression-r5-20260909/1943ecc384694d2ca1f410cdf86a7a4c/unittest.log`；记录SHA256：`6791020761cab1d8f0ef82b5ff56eae5d6711165dd3cc46660aa58dc01d1e286`。09-12未重新检查原始文件或哈希；换机可能MISSING。
- 上轮后续定向：Comfy25项通过、报告 `--check` PASS（bound-input-integrity）、`git diff --check`通过；不是新全量或云端CI。
- 既往HTTP `WinError10053` 间歇故障后来未复现，但根因尚未证明修复，保留历史失败。
- Photoshop：复杂PSD制作；源码API和安装wheel两次局部patch；真实Edge工作台基于已有PSD连续改文字、移动、保存重开及导出。ZIP记录47个文件长度/hash核对通过。不是参考图导入至首次制作、人审和安装版页面的完整M1。
- Comfy：严格本地HTTP客户端、指纹及路径拒绝校验；真实ComfyUI0.33.1执行无模型 EmptyImage→SaveImage，64×64纯色产物读回。不是模型生成、十次golden或H3验收。
- 当前报告28项均PARTIAL，发布NOT_RELEASED。报告观察SHA是 `a06c1db`，不是当前HEAD；生成时间不等于测试时间。

主要证据文档：

- `docs/handoffs/R5-PHOTOSHOP-REAL-BROWSER-PATCH-2026-09-09.md`
- `docs/handoffs/R5-PHOTOSHOP-PATCH-PRODUCT-2026-09-09.md`
- `docs/handoffs/R5-PHOTOSHOP-INSTALLED-BUNDLE-2026-09-09.md`
- `docs/handoffs/R5-COMFY-HTTP-LIVE-2026-09-09.md`
- `docs/handoffs/R5-COMFY-HTTP-TRANSPORT-2026-09-09.md`
- `docs/handoffs/R5-COMFY-WHEEL-SMOKE-2026-09-09.md`
- `docs/handoffs/R5-FULL-REGRESSION-VERBOSE-2026-09-09.md`（第三轮953项；最新967项见CURRENT-CONTINUATION，勿混淆）

## 恢复开发后的主线（先等我的新方向）

1. 核对最新证据与活动账本绑定、分支实际发布状态及exact-SHA CI；不要批量提升状态。
2. Comfy生产合同：ProjectService/Operation/Attempt持久派发意图、prompt绑定、资产发布；WS、取消ACK、重连、十次合格模型基准仍未闭环。
3. Adobe M1：参考图自动拆解与可修正对象计划、5—10张参考集、AI/PSD页面首次制作和两次patch、独立差异、人审rights、完整导出、安装升级回退。Comfy/H3/UIA不作为Adobe M1硬前置。
4. 保留全部28项范围，包括运行根治理、恢复对账、软件模型资格、TTS、音乐、H3本地视频、Premiere、Blender、跨媒体、UIA、游戏资产、语言治理等；按账本依赖推进，不能把PS局部成功当全部完成。

不要重复启动旧会话编号的任务；旧全量、专属浏览器和Comfy服务已记录退出，但当前进程状态仍需新工具核对。测试前确认项目解释器及依赖；历史命令使用 `.venv/Scripts/python.exe -B -X utf8`，不要未经检查假定环境可用。汇报须区分本地实现、本地测试、宿主实机、分支发布、exact-SHA CI、main合并和release。

你的第一步：只读恢复上述上下文，检查Git状态，报告已提交内容、未提交交接文件、云端是否已读回及最重要未完成项；不要直接开始新开发或推送。
