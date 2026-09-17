# DESIGN-LAB R5 当前接续摘要

本摘要截至2026-09-09本地时间，属于接续材料，不取代唯一活动账本 `design-lab/config/task-ledger-r3.json`。冻结任务定义为 `docs/history/taskpacks/r5-20260908/tasks.json`。全部28项范围仍保留，不能把Adobe局部成功称为整个R5完成。

## 目标与停止条件

用户授权继续完整任务包；Codex额度剩余35%时停止新增任务，做交接与已授权上传收尾。最新额度工具已读到65%已用/35%剩余，停止线已触发，不得因自动续轮继续新增开发任务。仅收尾此前启动的回归和交接。不得代签Human Gate，不访问E盘或凭据，不关闭共享宿主。知识迁移仍延后。

## 工作区与交付

### 后续上传接续（用户再次明确要求“汇报进度 完成上传”）

本次按新请求重新执行正常Git交付流程，`git fetch origin` 与明确路径 `git add` 均已成功，未更换机制、未绕过保护。下文“未上传/政策拒绝”为此前停止时快照，不表示本次最终结果。此交接随交付提交保存；最终提交SHA与远端匹配以执行后的Git读回为准，不在提交前预写上传成功。仅交付源码、测试、报告和交接，ignored运行证据、作品、模型、安装环境不进入Git；没有合并main或发布release。已有967项全量结果绑定提交前dirty tree，不冒充新提交的CI。

本地分支codex/r3-runtime-correctness，HEAD a06c1db01944faca6c8dd41b8fe22f651138a400。存在大量本轮任务所属未提交改动，涵盖PS生产patch、工作台竞态、导出字体信息、测试及文档。保留这些改动；不要reset/clean/restore。

此前阶段记录过组合stage/commit/push被执行政策拒绝，不能换机制绕过。本次只读 `git ls-remote origin refs/heads/codex/r3-runtime-correctness refs/heads/main` 成功：远端开发分支为a06c1db01944faca6c8dd41b8fe22f651138a400，远端main为c4dccd58331bc4561eb89265283d924b7630d113。本地HEAD与远端开发分支提交相同，但dirty源码不是该提交字节，不能说“本地云端一致”。本次没有上传；main合并、PR和release未执行。

## 最新验证顺序（重要）

1. 前两轮953项全量失败，记录保留：首轮测试夹具和子进程编码问题已修，第二轮出现HTTP WinError10053间歇错误。
2. 同一HTTP用例独立30次、100次通过，不足以证明根因修复。
3. 第三轮全量会话85359已终态：953项、951通过、2跳过，exit0，1067.676秒。日志hash为7d33be385ec38719a704fd187c4b2d47d9262c069378b6c8b905d908255ba1fc。两个跳过为Windows符号链接权限不足，不能计PASS。详见[R5全量记录](R5-FULL-REGRESSION-VERBOSE-2026-09-09.md)。
4. 在第三轮之后修复Comfy协议词法路径/指纹、零checksum、重复node ID拒绝，并修复 fingerprint 绕过 validate 的入口。随后新增严格本地 HTTP 客户端，Comfy 定向共25项通过；所有这些后改文件均不继承第三轮全量结果。见[Comfy修复](R5-COMFY-STRUCTURAL-REJECTION-2026-09-09.md)、[指纹门](R5-COMFY-FINGERPRINT-GATE-2026-09-09.md)、[HTTP传输](R5-COMFY-HTTP-TRANSPORT-2026-09-09.md)。

## Comfy 最新增量与安装边界

- 新客户端固定127.0.0.1端口，限制路径、响应大小与总时限；拒绝重复JSON键、非有限数、截断响应及重定向。POST结果不确定不自动重发。
- 新客户端已真实调用独立 ComfyUI 0.33.1 的 stats、submit、history；64×64无模型 EmptyImage→SaveImage 完成，4096像素均为RGB(18,52,86)。不是模型生成能力验收。
- prompt 59ae7dfd-59ee-4feb-96d9-3223460c6995；PNG SHA256 b0e49e6fdcd49c416d72513b0af959579be0788ccaed03bd99fab372e7134b2d；专属服务会话24479已exit0、端口关闭。见[真实HTTP读回](R5-COMFY-HTTP-LIVE-2026-09-09.md)。
- 最新 wheel SHA256 0ccdbb652826d1ba811823ea745cc2a68839d5ef0520682e6e9d69d2afbc9204，独立环境离线安装与隔离导入通过；4项关键源码/资源逐字节匹配。不是安装版端到端或升级回滚验收。见[安装smoke](R5-COMFY-WHEEL-SMOKE-2026-09-09.md)。
- 正式账本已绑定无模型live结果；早期结构证据因后续源文件变化应保留STALE，不伪造刷新原证据。忽略目录中的原始证据换机不随Git到达。

最新汇总全量会话81275也已终态exit0：967项、965通过、2跳过、1077.357秒，覆盖上述Comfy源码变化。开始2026-09-08T23:02:44.660839Z，结束23:20:43.055160Z；HEAD保持a06c1db01944faca6c8dd41b8fe22f651138a400，绑定DIRTY_WORKTREE，不是exact-SHA CI。完整日志 `.project-local/task-artifacts/full-regression-r5-20260909/1943ecc384694d2ca1f410cdf86a7a4c/unittest.log`，SHA256 `6791020761cab1d8f0ef82b5ff56eae5d6711165dd3cc46660aa58dc01d1e286` 已独立重算一致，原始result.json在同目录。两项跳过仍为test_model_manifest缓存符号链接与test_visual_quality_scan_boundary源符号链接检查，原因Windows权限1314，不能计通过。之前间歇HTTP错误的根因仍未证明已修复。

当前已启动全量测试均已终态：81275、85359均exit0；浏览器服务20935已exit0，专属浏览器design-r5已关闭。若接手时状态发生变化，以新工具读数为准，不启动重复任务。

## Photoshop实机新增证据

- 复杂参考PSD原生制作完成：99文字、44推断alpha素材、89像素填充，不冒充矢量形状。300秒默认超时源于此前120秒超时后实际完成约143秒的观测，不等同随意放宽验收。
- 源码产品API两次patch、安装wheel两次patch已留证；不重建基底，操作新PSD副本，保存重开读回。
- 本轮真实Edge页面再连续修改两次：ocr-1文字、随后移动[2,0]，页面经历PENDING→DISPATCHING→SUCCEEDED，校验PSD并下载交付ZIP。
- 页面attempt为att-f0114b89d01a4f618a0c5a63dcb046ab及att-cf45fdc7e46e44a086e8d4b8f828f819；host26.7.0、documents0→0，事后guard为空。
- 浏览器下载ZIP SHA256 639a1ecff5a4087a2ee83ae41a325d7197635bcce14a11a8c4661831aaaf471a；独立核对47文件长度/hash与完整条目集合通过。
- 详见[页面链路](R5-PHOTOSHOP-REAL-BROWSER-PATCH-2026-09-09.md)、[产品patch](R5-PHOTOSHOP-PATCH-PRODUCT-2026-09-09.md)、[安装版与bundle](R5-PHOTOSHOP-INSTALLED-BUNDLE-2026-09-09.md)。

这些是已有PSD之后的修改链路，不是完整参考图自动拆解→首次制作→人审的M1。页面服务使用源码环境，不是安装wheel页面验收。字体实际使用、rights、独立对象身份和像素级质量仍未全部证明。

## 后续任务保持全范围

- 001/003：完善正式证据绑定、当前源码全量和exact-SHA CI、交付读回；不要批量把轴改PASS。
- 002：实际运行根治理与遗留数据核对。
- 004：未知宿主结果持久对账；原始完成标记不等于可恢复发布授权。
- 005/009：完整链接、字体、版本回退、最新wheel安装升级回退与独立工作目录验收。
- 006/007：软件模型资格、资源与OCR生产接续，保持fail-closed。
- 008：已有上述独立真实HTTP调用，但尚未接入ProjectService/Operation/Attempt的持久派发意图、prompt绑定、资产发布；WS、取消ACK、重连、10次模型基准仍需实现验收。
- 010—015：自动拆解与可修正对象计划、5—10张多类型参考、AI/PSD页面首次制作和两次patch、独立差异、人审、M1完整导出。PS本轮局部页面成功不抵扣其他缺口。
- 016—022：TTS、音乐、H3本地15秒分镜视频、Premiere工程、Blender场景、可选宿主、跨媒体依赖，全部保留；Comfy/H3不作Adobe M1硬前置。
- 023—028：历史缺失恢复、UIA后备、Comfy动效/透明资产、游戏资产、语言治理与渐进迁移。

## 推荐下一步

本次接续再次使用 `.venv/Scripts/python.exe -B -X utf8`：解释器与jsonschema导入成功；`-m unittest discover -s design-lab/tests -p 'test_comfy*.py'` 25项、4.311秒、OK；`scripts/generate_current_reports.py --check` 返回PASS（仅bound-input-integrity，不验证当前Git/云端）；`git diff --check` 无输出。不是新全量回归或exact-SHA CI。

停止线已触发。本轮交接完成后不继续新切片；恢复开发需用户新的执行方向。后续恢复时先补最新证据正式账本引用，再接续Comfy生产合同与参考集/对象修正主线。新模型或宿主行为须真实运行，不用静态类测试抵扣。上传此前被政策拒绝，不能换机制绕过；本轮保留未提交工作，不称上传完成。完整目标未实现，不得标记R5全部完成。

所有原生资产、日志、下载和测试数据均在ignored `.project-local/`；换机缺失需显示MISSING，不重建假日志、不直接把大产物提交Git。
