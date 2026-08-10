# OPEN-DESIGN-Assistance

> **以 Open Design 为主入口，模型中立、风格中立、领域中立、工具中立、权利安全的专业设计智能与视觉质量平台。**

面向 **Open Design 软件** 的 Open Design-first / Agent-compatible 商业设计智能、视觉质量、专业生产与可编辑交付增强层（**V4**）。当前权威定义见 `project-memory/PRODUCT_DEFINITION_V4.md`。

本项目**不是**新的设计系统软件，也**不替代** Open Design 的工作流。用户进行设计流程、主窗口画布操作、AI 调用和设计生成时，以 **Open Design 软件本体**（当前本机基线 **0.18.1**，stable）为主；本仓库提供专业设计方法、Domain Pack、视觉质量、来源权利、生产预检、可编辑交付、Benchmark 与证据。

## 项目定义

```text
Open Design 软件
  = 真正的设计入口、主窗口/Figma-like 画布、AI 调用界面、设计流程执行处、插件/Scenario/Atom 运行时

OPEN-DESIGN-Assistance
  = Open Design 的增强层：Brief/来源/权利、专业设计方法、Domain Pack、风格谱系、
    质量 Rubric、生产预检、可编辑交付、Benchmark Case、commercial evidence 与 provenance 证据

被吸收的 MINIGAME / Design-system
  = 给 Open Design 提供参考、样板、素材、Schema/Tokens、运行时验证对象；不再单独定义主流程
```

## 五种中立（V4）

- **模型中立**：不把任一模型写死；通过受控 Agent/媒体适配器接入。
- **风格中立**：Apple / 黑金 / 科技蓝 / HUD / 大师风格均非全局默认。
- **领域中立**：公共内核服务所有领域；领域包不污染公共内核。
- **工具中立**：Open Design 是主入口；下游可适配 Figma / Penpot / Blender / FFmpeg 等。
- **权利中立**：每项来源/素材/字体/模型/标准有权利状态与使用模式。

## 三个公开入口

| 入口 | 职责 |
|---|---|
| `commercial-design-core` | 商业设计路由与核心 |
| `visual-quality-core` | 视觉质量与去 AI 味 |
| `production-handoff` | 生产预检与可编辑交付 |

内部 21 个 Atom 是可测试组件；7 个旧插件为兼容适配器（见 `config/entrypoint-convergence.json`）。

## 当前主目录 / 云端仓库

```text
主目录：D:\All projects\OPEN-DESIGN-Assistance
云端：  https://github.com/DTALEX66/OPEN-DESIGN-Assistance
```

旧目录仅作为历史来源/临时备份，不再作为主开发入口：

```text
D:\All projects\Design-system
D:\All projects\MINIGAME
```

## 目录职责

```text
opendesign-assistance/     增强层：config / schemas / scripts / plugins / bundles /
                           atoms / scenarios / adapters / templates / assets / knowledge / research
design-system/             已吸收的设计协议资产：DESIGN.md / Schema / Tokens / component rules
minigame-runtime/          已精简的游戏系统参考样板：运行时、平台样板、测试、精选素材
project-memory/            项目定义、迁移记录、吸收边界、清理决策记录
reports/                   阶段验收、证据与交接报告
```

## 完整文档索引

以下为 verifier 强制引用的仓库文档与配置，均在本仓库存在：

```text
opendesign-assistance/plugins/brand-visual-director/README.md
opendesign-assistance/plugins/spatial-exhibition-director/README.md
opendesign-assistance/templates/spatial/culture-wall.md
opendesign-assistance/templates/visual/3d-design.md
opendesign-assistance/scripts/verify_open_design_assistance.py
opendesign-assistance/scripts/generate_open_design_indexes.py
opendesign-assistance/scripts/scaffold_open_design_plugin.py
opendesign-assistance/plugins/INDEX.md
opendesign-assistance/templates/INDEX.md
opendesign-assistance/usage-notes/OPEN_DESIGN_PLUGIN_INSTALL.md
opendesign-assistance/exports/minigame-mobile-controls/README.md
project-memory/PROJECT_DEFINITION_V3.md
opendesign-assistance/ARCHITECTURE_V3.md
opendesign-assistance/config/product-manifest.json
opendesign-assistance/config/capability-status.json
opendesign-assistance/scripts/verify_product_manifest_v3.py
opendesign-assistance/scripts/verify_runtime_contracts_v3.py
opendesign-assistance/scripts/verify_visual_scoring_v3.py
```

## 主规则（V4）

1. **Open Design 软件本体是主角**
   设计流程、主窗口设计、AI 调用、设计生成都在 Open Design 软件里完成。

2. **本仓库增强 Open Design 的专业判断与交付能力**
   提供协议、知识、Domain Pack、质量门禁、生产预检、可编辑交付合同和能力证据。

3. **不把本仓库定义为 Open Design 替代品**
   工作流问题、设计流程执行、AI 模型选择与调用，以 Open Design 软件界面为准。

4. **不把文件存在冒充运行可用**
   静态文件/Manifest 只能证明 E1；Open Design daemon 注册、插件可见、Scenario/Atom 真运行和产物读回才是 E3。

5. **保持五种中立与三公开入口**
   不绑定单一模型/风格/领域/工具；对外只有三个公开入口，内部 Atom 是可测试组件。

6. **证据分级诚实**
   E1 结构 / E2 隔离运行 / E3 实时运行 / E4 发布 / E5 商业验证，各级不互相冒充。

## 优先阅读

```text
opendesign-assistance/START_HERE.md
project-memory/PRODUCT_DEFINITION_V4.md
project-memory/OPEN_DESIGN_VERSION_BASELINE.md
project-memory/MIGRATION_STATUS.md
opendesign-assistance/config/product-manifest.json
opendesign-assistance/config/CAPABILITY_INDEX.md
opendesign-assistance/config/OPEN_DESIGN_COMPATIBILITY_MATRIX.md
opendesign-assistance/config/RELEASE_EVIDENCE_CONTRACT.md
opendesign-assistance/README.md
reports/V4_HANDOFF_SUMMARY_20260807.md
```

## 已吸收内容

- 原 MINIGAME 游戏生产系统：源码、H5、Canvas、Android WebView、微信小游戏样板、skins、schemas、tests、docs、运行必需的精选 CCTV assets。
- 原 Design-system：Open Design-first Design Command Center、DESIGN.md、UI Schema、Design Tokens、component rules、Open Design prompts。
- Open Design GPT/Codex 订阅配置经验：通过本地 Codex CLI 与 `CODEX_HOME` 使用订阅登录态，不要求 OpenAI API Key。

## 不纳入 Git 的本地内容

```text
.git/  .gradle/  .tools/  .tmp/  .hermes/  node_modules/  coverage/  test-output/
```

这些不是产品协议或源码资产，可按需要在本地重新生成。

## 证据等级（V4）

| 证据级别 | 当前含义 | 本仓库可声明的范围 |
|---|---|---|
| E0 declared | 目标、原则或文档已经声明 | 只能说明设计意图 |
| E1 structural | 文件、Schema、Manifest、索引和静态校验通过 | 结构可用、路径可追踪 |
| E2 isolated-runtime | 隔离脚本或 staging 合同执行成功并有读回 | 局部能力可在隔离环境执行 |
| E3 live-runtime | 当前 Open Design runtime 注册、执行并读回产物/Provenance | 才能声明运行时可用 |
| E4 release | 精确树经过审查、提交、推送和精确 SHA CI 读回 | 才能声明发布已验证 |
| E5 commercial | 外部用户、客户或生产验收存在 | 才能声明商业验证 |

## 端到端能力模型

Open Design-first 的目标不是"生成一个看起来像设计的文件"，而是把专业判断和交付约束接到 Open Design 的实际设计界面与 Agent 执行链上：

```text
Brief / 文件 / 图片 / 参考
  → 来源、权利与安全门禁
  → Brief 标准化与商业设计路由
  → 竞品、Reference DNA、风格谱系与大师方法研究
  → 三个结构上有区别的方向 + 人工锁定
  → DESIGN.md / DTCG Tokens / Components / Asset Contracts
  → 图片 / HTML / PPTX / PDF / Motion / 3D / Spatial 生成
  → Domain Jury + Visual Quality Jury + 确定性检查
  → 有界精修循环与跨格式一致性
  → 数字 / 印刷 / 包装 / 空间 / 动效 / 3D 生产预检
  → 可编辑交付、BOM、Provenance、版本与回滚
  → Benchmark Case、人工评审与能力证据
```

其中 Open Design 负责项目 UI、主窗口/Figma-like 画布、Agent 启动、插件/Scenario 注册、预览、导出和运行时事件；本仓库负责协议、知识、提示词、能力包、质量门禁、生产预检和证据合同。

## 验证链

在 Windows Bash、PowerShell 或 CI 中，先进入仓库根目录，再按顺序运行：

```bash
python opendesign-assistance/scripts/verify_open_design_assistance.py
python scripts/run_python_tests.py
cd minigame-runtime && npm test
```

索引由源 Manifest/注册表生成，不要手工维护计数：

```bash
python opendesign-assistance/scripts/generate_open_design_indexes.py
```

预期基线：

```text
VERIFY_RESULT=OK total=456 failed=0
```

这些输出证明当前树的合同/隔离验证通过，不自动证明 Open Design 的每个插件、Scenario 或 Bundle 已经达到 E3。

## Open Design 本机接入

本仓库提供可移植脚本和说明，但不提交用户级 Open Design 配置或 Codex OAuth 状态：

```bash
python opendesign-assistance/scripts/configure_open_design_windows.py \
  --project-root "D:\\All projects\\OPEN-DESIGN-Assistance" \
  --dry-run

python opendesign-assistance/scripts/doctor_open_design_windows.py \
  --project-root "D:\\All projects\\OPEN-DESIGN-Assistance" \
  --strict
```

订阅/OAuth 路径使用本地 Codex CLI 和当前用户的 `CODEX_HOME`，不要求把 OpenAI API Key 写入仓库。用户级权限根必须是明确批准的最小项目范围；禁止授权整个系统盘或 `E:/`。

## 插件与模板扩展规则

新增插件优先使用脚手架，避免 `SKILL.md`、Manifest 和 README 漂移：

```bash
python opendesign-assistance/scripts/scaffold_open_design_plugin.py my-plugin-director
python opendesign-assistance/scripts/generate_open_design_indexes.py
python opendesign-assistance/scripts/verify_open_design_assistance.py
```

插件应明确：输入、输出、适用类别、设计系统、引用模板、运行模式、兼容版本和证据等级。大型第三方工具、许可证不清晰的素材、模型权重、字体、私有运行时状态和凭据只能留在研究/适配边界。

## 后续路线

路线按照依赖顺序推进：

1. 可信来源/权利/安全底座与能力证据。
2. 隔离 overlay 应用、回滚和现有七个插件兼容升级。
3. Scenario/Atom/Bundle 的 Open Design runtime 注册与真实任务读回。
4. 视觉质量、反 AI-slop、风格谱系和匿名大师方法引擎。
5. 品牌、UI 产品、平面 campaign、空间展陈、包装、编辑、动效和 3D 域 Pipeline。
6. 数字、印刷、包装、PPTX、Lottie、glTF/OpenPBR 等生产适配器。
7. Benchmark、回归证据、独立审查、精确 SHA 发布和外部验收。

## 协作与发布边界

- 远端 GitHub 仓库是长期代码真相；本地 live Project copy、daemon 数据和 `.hermes/` 证据不作为提交内容。
- 修改前先 `git status --short --branch`；只提交明确批准的文件。
- `commit`、`push`、PR、merge、ruleset 和 release 都需要用户授权。
- 发布前必须检查 `git diff --check`、验证结果、暂存区范围、远端 SHA 和最终 clean worktree。
- 任何描述都必须区分：已声明、结构通过、隔离运行、实时运行、发布验证和商业验证。
