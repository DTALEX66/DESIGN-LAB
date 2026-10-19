# 当前边界澄清（2026-10-19 owner方向调整）

本节优先于下文全部前继条款。DESIGN-LAB的正式定位是**专业视觉智能与可复用设计能力系统**，不是画布、通用编辑器或全流程设计文件交付平台。
- 禁止：第二套Photoshop/Figma/Blender画布或通用编辑器；通用Agent Runtime、聊天客户端、模型网关、跨项目调度器；接管WORK-LAB通用治理；取代AAOS正式知识真源。
- 允许：视觉分析、审美评估、提示词生成与反推、设计能力Registry、专业评价、分层工具接入（官方API/SDK → 原生插件 → MCP → 脚本/CLI → 受控UI自动化），以及设计专用、有界的执行/观察/核验/恢复。
- `apps/workbench`仍是唯一前端技术壳，但界面服务于能力（Brief/参考输入/分析/Prompt Builder/能力库/Adapter Registry/真实调用结果/测试对比/人工验收/知识候选），不是画布。
- 原生宿主负责画布内实际编辑；DESIGN-LAB不持有宿主私有数据库或用户素材库。
- WORK-LAB拥有通用工作流、全局配置、权限/预算、跨项目路由、监测与维护；AAOS拥有正式知识、来源/证据治理、审核与长期学习。DESIGN-LAB通过版本化合同协作，不写对方私有数据库，只提交知识候选并读取AAOS状态。
- 2026-10-09 UI-FIRST派工与`currentExecution` 34项任务已冻结（`FROZEN_DEFERRED`），不再派工；手机端不是"待排期的冻结项"，owner 2026-10-19「再说一遍 不做手机端 只做桌面端」→「授权给你 去掉手机端」把它改为**排除项**（见 AUTHORITY.md 2026-10-19 条款）。账本 `currentExecution.mobile` 仍是 schema const `FROZEN_DEFERRED` 且有测试断言，改词属状态词合同变更，需 owner 另行授权，本轮未改。
- 本轮只做权威/规划对齐与按范围验证，不实施产品功能；文档修订不等于代码实现或真实运行。

---

# 当前边界澄清（2026-10-09 owner采纳，前继记录）

本节优先于下文前继歧义：禁止的是通用Agent平台/平行运行时，不禁止src/design_lab既有Python/NativeWorkers中的设计专用规划、执行、观察、检查和恢复。
apps/workbench仍为唯一前端技术壳；主旅程按docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md迁移为能力资产、分析制作、成果反馈，不锁旧导航/DOM或菜单数量。
不接管AAOS长期知识/学习状态、WL全局治理或宿主私有数据；通过公共合同联合，可独立运行。手机端冻结在本批范围之外。

---

# BOUNDARY_CONTRACT — 职责边界合同

- 版本：`1.0`｜状态：`ACTIVE`｜SSOT 角色：边界契约

## 目的

固化 DESIGN-LAB 与宿主/工具/Agent 的职责边界，保证本仓库**不成为第二前端、第二 Agent runtime、模型网关、独立账号系统或泛用向量库**。

## DESIGN-LAB 的职责（只做增强，不做替代）

- 唯一设计控制面：`apps/workbench/`，承载 DESIGN-LAB 自有 Project、Brief、Direction、Design Artifact/version、Review、Preflight、Handoff 与 Evidence 的编排和读回；
- 协议与合同：Brief、ReferenceSet、Direction、DesignSystem、QualityAssessment、Preflight、Handoff、Evidence；
- 专业方法：MethodCard、DomainPack、Rubric、Scenario、Bundle、Adapter 协议；
- 知识资产：受治理的来源、方法、标准、注册表、BenchmarkCase；
- 质量门禁：视觉质量、设计 Critique、反 AI 痕迹、预检；
- 交付合同：可编辑交付、资产打包、权利 BOM、人工评审和能力证据。

## 不负责

- ❌ 不做第二套设计软件前端/画布/编辑器；
- ❌ 不做 Agent 运行时、聊天客户端、模型网关或通用工作流平台；
- ❌ 不拥有自己的 provider/model 认证（不写死模型，不持有 API Key）；
- ❌ 不建独立 SaaS、账号系统或泛用向量库；
- ❌ 不复制任何宿主的画布、宿主私有项目数据库、模型路由或宿主私有 Artifact 系统；DESIGN-LAB 自有的设计域 Project/Artifact/version 合同与状态不属于复制；
- ❌ 不把静态文件、Schema 通过或 VLM 自评冒充运行可用。

## 宿主职责（平台中立）

- 工作区、画布、设计流程执行、AI 调用、插件/Scenario/Atom 运行时、Artifact 创建/预览/导出、配置；
- 任意设计 Agent 平台或创意工具均可通过 Host Adapter 接入；Open Design 仅为其中一个兼容对象。

## 边界硬规则

1. 全仓仅允许 `apps/workbench/` 作为设计控制面，不得出现第二前端应用壳或第二画布；
2. 全仓不得出现第二 Agent runtime；
3. 全仓不得出现模型网关；
4. 全仓不得出现独立账号系统或泛用向量库；
5. 任何文档不得宣称本仓库"拥有"宿主的画布/项目/模型路由；
6. 证据等级声明不得超过真实证据。
