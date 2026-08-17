# DESIGN-LAB 完整后续任务清单（2026-08-17 收敛版）

> 汇总：R4 遗留阻塞 + V2 规划 + 调研报告收敛任务。按依赖与类型分组排序。
> 纪律：fail-closed、不伪造证据、未指定不猜测；每项独立提交。

## A. 人工参与类（E4 发布链的硬阻塞，需你执行）

| ID | 任务 | 前置 | 验收 | 状态 |
|---|---|---|---|---|
| A1 | 人工专业 Jury（DL-QLT-002） | 12 证据卡 + 19 rubrics 已就绪 | 五域评分 ≥82/100 且偏好率 ≥70%；12 卡人工校准 | 🔴 阻塞，需你 |
| A2 | 独立复审 + Release Attestation（DL-REL-001） | A1 完成 | E4 发布链（复审人签署 attestation） | 🔴 阻塞，需你 |
| A3 | 162 条隔离来源人工补全 | 无 | 每条 author/权利标志/reviewedBy 补全出隔离 | 🔴 阻塞，需你 |
| A4 | H3 产物人工验收（mp4 视频+音频） | 无 | 你确认画面/声音是否满意 | 待你听看 |

## B. 真实运行取证类（需环境/授权）

| ID | 任务 | 前置 | 验收 | 状态 |
|---|---|---|---|---|
| B1 | Open Design live E3（DL-ADP-OD-E3） | 启动 Open Design 运行时 | 真实运行 + Artifact 回读 + E3 证据 | 🟡 待授权 |
| B2 | Photoshop E3（DL-ADB-PS-001） | PS 订阅 + 本机环境 | 可编辑 PSD 交付 + preflight 回读 | 🟡 待授权 |
| B3 | 主分支保护（DL-CI-007） | 管理员 | require PR/CI/审批 | 🟡 待管理员 |

## C. 契约级任务（调研收敛，P0，可立即自动执行）

| ID | 任务 | 交付 | 验收 | 状态 |
|---|---|---|---|---|
| C1 | T1 Design IR 契约 | design-ir.schema.json（可编辑文档对象模型：画布+图层 text/image/vector/3d+样式/变换/约束，版本化） | schema 有效 + 正负 fixture + 与 artifact.schema.json 引用关系明确 | ⏳ 未开始 |
| C2 | T2 生产校验契约增强 | preflight.schema.json 定义 required_checks（id/severity/tool/标准 ref）+ 印刷/数字/视频 profiles | blocker 样本（无出血/缺字体/色域错）100% 标记；机器可读 | ⏳ 未开始 |
| C3 | T3 经验语料库契约 | experience-record.schema.json（项目级语料：方向+变体+评审+决策日志+源文件 refs） | schema 有效；与 memory-record 引用关系明确 | ⏳ 未开始 |

## D. 能力增强（P1，低代码/文档级）

| ID | 任务 | 交付 | 验收 | 状态 |
|---|---|---|---|---|
| D1 | T4 Design Action Language 词汇表 | design-action.schema.json（原子动作动词表，作为 DesignCommand.args 规范化层） | 与 command 兼容；动作不绑工具名 | ⏳ 未开始 |
| D2 | T5 质量分层管道定义 | quality/pipeline.md（deterministic→视觉模型→专家→人类反馈 + evals rubrics 对齐） | 文档 + 分层可追溯 + human calibration 步骤明确 | ⏳ 未开始 |
| D3 | T6 开源组件候选映射 | research/adapters-roadmap.md（CLIP/SAM/OCR/布局→未来 adapter/provider 候选，E0 标注） | 只归档不实施 | ⏳ 未开始 |

## E. 可选扩展（P2，按需）

| ID | 任务 | 前置 | 验收 | 状态 |
|---|---|---|---|---|
| E1 | 剩余领域包（packaging/spatial/3D/motion/video/audio/game-visual） | 逐域按十要素契约 | 每域 DOMAIN_PACK_V2 PASS | 🔵 按需 |
| E2 | 设计技能源码吸收轮（设计方法/规则类，宽松许可 MIT/Apache/CC0/BSD） | 候选搜索 + 走 external_asset_intake 管线 | SOURCE_REGISTRY 登记 + license 校验 + 隔离/吸收 | 🔵 按需 |
| E3 | H3 音频导出 UI 流程（SaveAudio→mp4） | 无 | 界面直接存 mp4（API 绕过已生效） | 🔵 待你确认 |

## F. 常态维护（每轮自动）

- 提交后重生成 capability/asset-counts/PROJECT_STATUS 索引
- 云端 CI 监控（Canonical Verify V4 五门）
- 双端一致性（本地 main == 云端 main）

## 推荐执行顺序

**立即自动**：C1 → C2 → C3（契约三连）→ D1/D2/D3（增强）
**并行等你**：A1（人工 Jury——E4 唯一硬阻塞）、A3（来源补全）、A4（H3 验收）
**待授权**：B1/B2（真实运行取证）、B3（分支保护）
**按需**：E1（领域包）、E2（源码吸收轮）

> 说明：C/D 全为契约/文档级，不新增运行时、不绑工具、不重命名，符合定位；A/B 是发布链真实进展所必需，但需要你参与或授权。
