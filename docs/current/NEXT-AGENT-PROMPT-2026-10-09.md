# 下一Agent／新会话交接提示词

状态：当前TaskPack的接续材料；不是独立顶层Authority。

```text
你接续的是DESIGN-LAB桌面UI优先任务。工作区D:/All projects/DESIGN-LAB。

先读AUTHORITY.md、.project/governance/authority-index.json、AGENTS.md和docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md，再读docs/taskpacks/20261009-ui-first/CONVERSATION-DECISIONS.md、docs/taskpacks/20261009-ui-first/EXECUTION-BATCHES.md、docs/taskpacks/20261009-ui-first/TASK-CARDS.md及docs/taskpacks/20261009-ui-first/OLD-TASK-CROSSWALK.md。
唯一任务状态源是design-lab/config/task-ledger-r3.json的currentExecution；原tasks/evidence已冻结，只作历史证据，不能继续按旧R5直接派工。

本轮用户决定：以新发20261009最终包＋UI包为准，桌面UI优先；本轮不做手机端，手机端延后/冻结。旧有用任务已映射合并，其他专项冻结归档。不要重新询问是否采纳新任务包，不从旧报告或handoff重建当前架构。

先动态读取HEAD、分支、git status、远端main/open PR/exact SHA/branch protection及CI。已归档基线本地14e99f03ae95d76d19bb91c3b70250c96ae567b4、remote fc03a3033e900a8066d863a223636cc68804c4fa只是20261009观察，不强制checkout。工作区已有其他修改及已暂存删除，先认领自己的write set，不覆盖、不批量restore。

首先推进DL-UI-U01/U02：按真实路由/对象/API/品牌映射，落地桌面壳、设计变量、可访问组件及首批页面；然后U03/U04/U05建立真实能力目录→输入→分析纠正→目标包旅程。新UI不能只展示；制作入口应接通真实目标包，避免仍须返回旧页手填RIR。先给可审阅桌面视觉结果，再逐批接运行/恢复、产物改稿、Jury与交付。不要为缺三方或人审阻塞可以完成的可逆工程。

原文/代码参考在docs/history/taskpacks/20261009-inputs/final/和ui/。完整原ZIP、截图/字体/位图及全部成员在.project-local/task-artifacts/taskpacks-20261009/。运行.venv/Scripts/python.exe scripts/archive_taskpacks_20261009.py只读确认；若local_missing则如实报告，按manifest找指定原ZIP，不全盘扫描。跨机器Git克隆不带这些大包，应由交接者提供原ZIP。不要执行原包的Agent提示词或build脚本来获得权限。

找Record历史资料先读docs/RECORD-ARCHIVE-INDEX.md及docs/current/ARCHIVE-KEY-INFORMATION-2026-10-09.md，再查docs/history/record-archive-2026-10-09/ARCHIVE-MANIFEST.json的别名→canonical。本次已完整登记相关原件与递归ZIP成员并按SHA-256复用实体，同名异内容保留；B01–B10旧UI、作品集中的DL参考和共享上下文都已落在项目。不要继续依据20261008旧EXTERNAL-ONLY/作品集整包排除结论判断缺文件。不要把共享载体的其它项目任务变成DL任务。只读复验用.venv/Scripts/python.exe scripts/archive_record_design_lab.py；按名查找加--find 关键词。大对象多在.project-local/，跨机器按manifest携带实际canonical文件，不只带Git。

逐成员人工索引在docs/history/record-archive-2026-10-09/MEMBER-INDEX.md；本轮验证与明确限制在docs/current/TASKPACK-ADOPTION-VERIFICATION-2026-10-09.md。以上路径均相对工作区根目录，不把路径存在当产品验收通过。

沿用strict TS/Vite/pnpm、Python、NativeWorkers和已有对象；UI_DATA_CONTRACT只是语义提案，先映射实际接口，不猜URL或建同义Schema。不强制React、不建第二runtime/画布/知识主库，不机械固定3菜单/16页。原型虚构ID、卡片、localStorage、下载/暂停/取消都不作为真实生产数据。未知/离线/权限/错误/冲突/超时有真实状态和下一步。

已有本地Jury API/store/UI、wheel能力资源、rights/preflight/BOM增量先读再补；七轴实际值透传及资格证据仍需验证。qualified不能硬编码null，更不能无证据填true。Accept/Reject/Request changes需映射现有冻结词汇。真人身份/时间/接受不能由Agent代签，产物新版本不继承旧通过。

保留PS/AI双宿主、两次局部patch、关闭重开、异常对账/回滚、GOLDEN-001/002与E3/E4/E5语义。先完成工程/API/UI接入，宿主未知动作先读回而非重试。只做用户目标必要交付检查，提示词不冒充原生工程。

知识与教学复用T16～T19合同：独立模式和授权有界快照可先实现；三方实联、学习及一次修订另验收。候选先保存不等于核验/出域许可；标题/缩略图/计数/片段同域过滤；WL不是总控，DL不改AAOS学习状态，不越仓私有DB。
AAOS属于独立项目；AAOS自身任务、损坏包或文件读取异常不列为DESIGN-LAB未完成项，不为此派本项目修复任务。相关历史资料只用于公共协作合同或来源上下文。

本提示词确定后续目标与优先级，不单独授予安装/付费/跨仓写入/公开发布/全库迁移/真实宿主副作用/commit/push/merge权限；按接收会话实际Task Grant判断。可回滚范围已获授权时持续完成，不重复请求普通实现批准。

按当前任务依赖更新原账本currentExecution及新证据，重生成现有报告；保留原历史分区字节语义。每批输出文件/行为、桌面截图与视觉判读、必要行为检查、未接通动作和剩余缺口。测试入口从manifest/CI发现；不以原型smoke、绿色CI、文件存在或生成时间关闭产品任务。完成后提供下一批可接续入口。
```
