# DESIGN-LAB R3 冻结交接与上传摘要

日期：2026-09-07（Asia/Shanghai）。本文件是本轮接手续入口，不替代正式任务账本。

## 结论与用户决定

用户反馈：“设计还行，但是太简单了，先这样，做好交接，摘要，上传，双端仓库一致”。因此停止新增实现，保存当前未完成工作快照。简单 Illustrator 图形是操控诊断 fixture，不是复杂设计复刻验收；这句话也不是全部 Quality / Rights / Production / Release gate 签署。

本轮上传范围：源码、合同、配置、测试、审计和交接文档。目标为同名开发分支 `codex/r3-runtime-correctness`；不合并 main、不创建 PR、不打标签、不正式发布。提交前基线 HEAD、local main、origin/main 均为 `c4dccd58331bc4561eb89265283d924b7630d113`。实际上传提交以 Git 记录及本轮最终远端读回为准，不能把基线 SHA 写成此次上传 SHA。

## 项目与入口

- 项目 SSOT：`D:/All projects/DESIGN-LAB`；云端：`github.com/DTALEX66/DESIGN-LAB`。
- 定位：Standalone-first、平台中立、宿主原生的专业设计生产能力层；不是第二画布、通用 Agent runtime 或知识库。WORK-LAB / ArcheAxis 不是启动前提。
- 执行规则：[AGENTS.md](../../AGENTS.md)。当前任务定义：[R3 任务包](../taskpacks/DESIGN-LAB-CLOUD-REAUDIT-TASKPACK-2026-09-06.md)。任务状态唯一编辑源：[task-ledger-r3.json](../../design-lab/config/task-ledger-r3.json)。
- 机器路径：[.project/paths.json](../../.project/paths.json)；[本机环境](../LOCAL_ENVIRONMENT.md)。模型库 `D:/All projects/Model library`、素材库 `D:/All projects/Design assets`、设计工具库 `D:/All projects/Design External Configuration`、共用工具配置库 `D:/All projects/OS External Configuration` 已登记，不要因默认安装路径不匹配重新宣称“未安装”。
- 项目运行、缓存、环境、证据统一在 `.project-local/`；不恢复使用 `.hermes/`，不访问 E 盘，不读取凭据或私有 Agent 状态。

## 冻结时任务状态

生成投影为 **3 DONE_LOCAL / 8 PARTIAL / 13 TODO**。DONE_LOCAL：R3-01、05、07；PARTIAL：R3-02、03、04、06、08、11、16、19。四轴必须分别判断；本次分支上传不把各任务的 delivery 自动升级为完成。

DP V1（17 文件）及 V2（9 文件）属于冻结资料核验包，完成不等于 R3 完成。保留 [DP 综合交接](GPT-R3-REVISION-HANDOFF-2026-09-06.md) 与 [GPT 接续包](../taskpacks/DESIGN-LAB-GPT-REMAINING-2026-09-06.md)，本文件补充其后的运行事实和新失败。知识迁移继续延后。

## 已实际执行的结果及边界

| 工作 | 已有证据 | 尚不能宣称 |
|---|---|---|
| 路径、报告、运行时合同 | 源码及对应回归已落盘；最新路径 16 PASS、报告 24 PASS | 所有入口、宿主和发布已合格 |
| ComfyUI | 0.33.1 两次独占启动；REST/WS、64px EmptyImage/SaveImage、重连、无效节点；44 运行检查、129 独立检查通过 | H3 推理、模型生成、运行中取消、生产 adapter；重启历史仅内存，尚需持久 receipt |
| H3 | 四组件 42,470,585,471 字节完整 hash 对照固定上游版本；CUDA 设备检查通过 | 模型加载、视频推理、地区/许可批准、15 秒视频完成 |
| ASR | CPU INT8 合成中英文音频；VAD 对照 14 调用、2 损坏媒体输入；VAD 7 例通过、独立 195 检查通过 | 自然录音/GPU/TTS/生产资格；无 VAD 静音幻觉失败保留 |
| OCR | 8 个官方模型文件、139,157,714 字节；短路径环境安装恢复成功 | 导入即被缓存写入边界阻断，未加载模型/未 OCR 推理 |
| Illustrator 原生批次 | 3 轮创建、编辑、保存、重开、导出、恢复；9 AI / 9 PNG / 9 SVG；105 PASS / 1 FAIL | SVG 原始字节一致性不成立，clip ID 不稳定；不是生产桥闭环 |
| Illustrator 恢复诊断 | 原生中断后重开、继续、三次重试、还原；诊断终态 PASS，独立 39 PASS / 1 FAIL | 产品路径校验仍有真实失败；不是 OS 崩溃恢复、通用幂等或复杂复刻 |
| Photoshop | 26.7.0.15 安装已识别；两次 Computer Use 启动失败已记录 | UXP 产品桥或 PS 实际操控成功 |

详细证据入口：[ComfyUI](../decisions/R3-COMFY-ENTRY-LIVE-2026-09-07.md)、[H3 / PS](../decisions/R3-READBACK-AND-H3-PREFLIGHT-2026-09-07.md)、[ASR](../decisions/R3-ASR-CPU-VAD-AUDIT-2026-09-07.md)、[OCR](../decisions/R3-OCR-PREPARATION-BOUNDARY-2026-09-07.md)、[Illustrator 批次](../decisions/R3-ILLUSTRATOR-BATCH-AUDIT-2026-09-07.md)、[Illustrator 恢复](../decisions/R3-ILLUSTRATOR-RECOVERY-AUDIT-2026-09-07.md)。

## 必须接续的错误，不得覆盖或伪造通过

1. **统一门最新为 47 PASS / 2 FAIL，exit 1**。`design-lab/scripts/verify_visual_quality_v21.py` 的 `ROOT.rglob('*.json')` 误扫 `.project-local/` 中 Paddle CINN tile_config，产生 18 个 JSON Extra data 错误；Open Design secondary verifier 传播同一根因。不是 Open Design 启动失败，不是模型损坏。修复前不要重复广扫，不修改或删除第三方文件来求绿。
2. **Illustrator Windows 合法子路径被拒绝**。`integrations/hosts/adobe/illustrator/reconstruction-assemble.jsx` 使用反斜杠 fsName 却追加正斜杠再比较前缀。独立核验的唯一失败为 valid-child；兄弟前缀及 parent traversal 拒绝正常。生产脚本未改，SHA256 `f2ba20d98479cca301c47420f6d6dd30b4ce4d8166a429099191b30607ef4cd1`。拟统一分隔符并保留边界检查，尚未实施。
3. **OCR 环境边界**：长路径安装失败后在短环境恢复；真实导入尝试写 `C:/Users/ALEX/.cache/paddle/dataset` 被拒绝。另有 guard 把 `\\.\NUL` 误分类的独立问题。未重映射 HOME、未修改 vendor、未绕过权限。RapidOCR 上游 403 保留。
4. **Photoshop UI 入口**：`accessibility window-opened handler did not become ready`，两次相同失败。未成功控制窗口，不能反复无变化重试或用 shell 绕过 UI 约束。
5. **SVG / ASR 失败不可消失**：原始 SVG clip ID 波动与无 VAD 静音 `Thank you.` 幻觉均为真实历史失败；后续限定比较不能冒充原始失败已全消除。
6. **报告提交自引用漂移**：生成器把 HEAD、tracked 数和工作区状态写入投影。提交会改变这些输入；提交前 `--check` 通过不保证提交后通过。在新机器本地 ignored receipts 还会 MISSING。不得循环刷新/提交来伪装收敛；后续应明确设计 source-tree / observation SHA 语义，再修复和验证。此 WIP 上传不修改生成器行为。

最新测试根：`.project-local/task-artifacts/normalization-20260907/20260906T205320957684Z/`。路径 16 PASS、报告 24 PASS、license PASS、doctor PATHS_RESOLVED；6 receipts 的 37 subject 引用、150 artifact 引用 hash 匹配，25 文档链接存在。旧完整 Python 756 项（755 PASS / 1 Windows 权限 SKIP）属于旧运行，本轮未重跑，不能当最新全门绿色。[完整新失败说明](../decisions/R3-CURRENT-ENTRY-REFRESH-2026-09-07.md)。

## 后续优先顺序及分工

1. **GPT：校验器边界修复**。遍历前剪枝运行根、依赖、私有状态及 reparse；坏源码 JSON 仍必须失败。RED → GREEN → 定向回归 → 安全完整统一门，保留旧 FAIL。
2. **GPT：Illustrator 产品桥路径修复**。有效路径/兄弟前缀/父穿越回归及真实宿主复验；再实现真实操作、状态读回、失败恢复，不能拿诊断 JSX 替代产品桥。
3. **GPT：报告与干净 checkout / CI**。处理提交自引用、ignored receipt 缺失和行尾变换语义；验证修改后的 CI 触发与 exact-SHA 结果。当前仅上传 WIP。
4. **GPT：OCR 与 PS 安全入口**。先隔离导入缓存和 NUL 分类；再实际 OCR。PS 先定位受支持 UI/plugin 入口，勿全局提权或重复启动求好运。
5. **GPT：模型与工作流资格**。H3 加载/显存/许可地区/推理检查、Comfy 持久 receipt 与 WorkflowPin 图指纹，随后做有权利依据的小说内容→分镜→15 秒视频；本轮尚无成品视频。
6. **GPT：生产主线**。服务/UI/M1、原生可编辑复杂参考复刻、分层透明图片备选、重开与失败回滚、Jury/rights/preflight。用户认为简单诊断图过于简单，下一轮要提升实际设计复杂度，不只是增加测试轮次。
7. **DP：明确规则下的批量辅助**。补电商候选、URL 存活和权利来源材料、文件/证据目录与 hash 核对、链接核验、历史检索。不得自行改核心代码、账本结论或替代人工 rights / quality 审批。
8. **GPT + 用户：最终验收与交付**。按 R3 depends_on 推进；复杂复刻参考 5–10 张、视频、宿主、质量、人工门、安装/升级/回滚分别验收。知识出口延后；正式合并/发布另按授权执行。

上述是接续队列，不是本轮继续执行授权，也不是新任务已完成的声明。

## 本地原生设计与运行证据的保存

简单设计及恢复过程保留在 `.project-local/task-artifacts/adobe-live-20260907/illustrator-recovery-v1/run-1788727466747/`：`baseline.ai`、`interrupted.ai`、`recovered.ai`、`retried.ai`、`restored.ai` 及 PNG、终态和独立核验。诊断 `run.jsx` SHA256 为 `925a8a192a6b3c9cbd59e131e39bd27dcc66b6405a1cb31198b9403706111de6`。独立核验文件 `independent-20260906T204650558825Z.json` 仍记录失败。

ASR 环境 `.project-local/task-runtime/asr-qualification/20260906T195532284136Z/venv/`，OCR 短环境 `.project-local/task-runtime/o6-01/v/`。不清理，不强制加入 Git；模型权重、安装环境、原始测试日志和字体相关 SVG 不上传。云端提供源码、审计、证据元数据，**不是整个本地目录逐字节备份**。换机器时 missing 必须如实记录，另行批准安全证据归档，不能重建假日志。

## 上传验收口径

提交前检查待上传路径、敏感格式、体积、冻结文件字节和 staged diff；源文件加入索引后生成投影并只读检查，再提交本轮快照。推送后 fetch、核对 `HEAD`、`origin/codex/r3-runtime-correctness` 与 `ls-remote` 同名分支三者 SHA；单列 `origin/main`。查询本次 SHA 的 CI，pending/fail/missing 不写 PASS。本次不会把 BRANCH_PUBLISHED 冒充 MERGED_MAIN / RELEASED / INSTALLED_RUNTIME_VERIFIED。
