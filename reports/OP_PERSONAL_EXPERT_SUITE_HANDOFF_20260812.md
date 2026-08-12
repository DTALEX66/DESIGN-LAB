# Open Design Personal Expert Suite 配置与交接摘要 — 2026-08-12

## 状态与范围

本报告记录 `OPEN-DESIGN-Assistance` 仓库资产配置到 Open Design 0.19+ Personal Workspace 的当前方法、验证结果、错误复盘和发布边界。仓库是唯一 SSOT；Open Design namespace 内的资源是可重建运行镜像，不是第二份源码真相。Skills、Design Systems 和 plugin catalog 注册使用 Open Design API；plugin source mirror 则按 Open Design 的稳定本地 source 约定写入当前 namespace 的 `data/local-plugin-sources/`，两者不是同一个事务平面。

当前目标资产：

- 3 个 Personal Design Systems；
- 15 个 Personal Skills；
- 21 个内部 atoms；
- 7 个 expert plugins；
- 3 个 bundles；
- 兼容 ID `minigame-hud-designer` 与 `minigame-ui-director` 保留，但能力已扩展为通用小游戏设计；
- `anomaly-monitor-hud` 与 `anomaly-monitor-dark` 仅为按需异常监控专精，不是小游戏默认视觉方向。

## 项目与产品定位

- 项目 SSOT：`D:\All projects\OPEN-DESIGN-Assistance`。
- 产品定义：`project-memory/PRODUCT_DEFINITION_V42.md`。
- 机器 SSOT：`opendesign-assistance/config/product-manifest.json`。
- Open Design 是唯一设计主入口，拥有 Studio/画布、Agent 启动、插件运行、Artifact、预览与导出。
- 本仓库只拥有专业方法、Domain Pack、视觉质量、来源权利、生产预检、可编辑交付、Benchmark 和证据合同。
- 本仓库不建立第二前端、第二 Agent runtime、模型网关、独立账号系统或泛用向量库。

## 当前配置摘要

### 模型与认证边界

- Open Design 使用本地 Codex CLI + ChatGPT/Codex OAuth 订阅路径，不要求 OpenAI API Key。
- 仓库不保存 OAuth、token、API key、`auth.json`、`.env` 或私有 app config。
- 动态端口、Workspace ID、member ID、Codex 二进制版本路径和 Open Design payload 版本均不得硬编码。
- 当前运行态和用户选择必须从官方 API、日志或应用 UI 动态发现并读回。

### Personal Workspace 安装边界

- Personal Workspace 必须由 `/api/workspace/directory` 发现。
- 只允许 `workspaceType=personal`；active team Workspace 不能因为 active 而覆盖 Personal Workspace。
- role、member status 和 lifecycle state 必须透传 Open Design directory API；缺失时失败关闭，不默认 `owner`，不伪造 capability。
- Personal Skills 使用官方 `/api/skills/install`；内容发生变化时通过官方删除/安装事务刷新，并在失败时通过官方接口恢复旧内容。
- Design Systems 使用官方 Design System API，并保持 Personal Workspace scope。
- plugins/bundles 通过 Open Design 本地安装 API 注册；21 个自定义 atoms 不写入 `od.context.atoms` 内置闭集，也不冒充独立 Personal catalog 项，而是先进入稳定镜像，作为受管 plugin/bundle manifests 的本地 asset closure 解析；随后再注册 plugins → bundles。
- `app.sqlite` 仅允许 `mode=ro` 审计，禁止 `INSERT`、`UPDATE` 或 `DELETE`。

### 升级稳定性

- 仓库是资源源；运行镜像位于 namespace 的非版本目录 `data/local-plugin-sources/open-design-assistance`。
- 不把临时 staging 或 `versions/<version>/payload` 作为稳定 source。
- 新镜像完成全部安装和 catalog/readback 后才提交；失败时恢复旧镜像，并比较安装前后的 catalog 快照。当前 API 没有被本项目验证过的通用 plugin uninstall/restore 逆操作，因此 catalog 若已部分变化，安装器必须失败关闭并报告精确 delta，不能声称自动恢复旧 catalog。
- `.previous` 只在事务中保留，成功后删除；失败后用于恢复，不能提前删除。
- Skill 的 delete → install 不是天然原子操作，必须先保存旧 frontmatter/body，并实现安装失败恢复。
- Skill rollback staging 固定在仓库 `.hermes/task-runtime/tmp/`，不向系统 Temp 写入项目数据。
- active namespace 从当前可读 Web sidecar 日志动态发现；不固定 `release-stable-win`。
- Design System 只更新带本项目 managed marker 的对象；同名非托管对象失败关闭，禁止覆盖用户内容。旧版安装器留下的本项目 `sourceNotes` 仅作为兼容迁移标识。
- 安装前后比较 `/api/app-config`；任何用户配置变化都不能输出 `USER_CONFIG_PRESERVED=PASS`。

## 通用小游戏能力调整

保留兼容入口：

- `minigame-hud-designer`：Personal Skill ID 不变；
- `minigame-ui-director`：Plugin ID 不变，显示名称改为 `Minigame Design Director`。

通用能力覆盖：

- 玩家与产品假设；
- 核心循环、玩法规则和状态模型；
- 首局教学、难度曲线、关卡与内容系统；
- UX/UI、控制、反馈与无障碍；
- 视觉方向与内容生产；
- 经济与商业化（仅在 brief 要求时）；
- 平台、性能、埋点、测试和生产交付。

CCTV、控制台、暗色 HUD、异常电梯和 IAA 布局仍可用，但只在 brief 明确要求时加载对应专精。不得把它们冒充所有小游戏的默认产品边界。

## 真实经验

1. **API 存在不等于 UI 可见。** `/api/skills`、插件 catalog、SQLite 只读投影和真实 Personal Workspace UI 是不同证据面；最终可见性必须在 Electron UI 中验证。
2. **全局安装不等于 Personal ownership。** local/trusted 插件可以可运行但不出现在“个人的”；必须使用当前版本提供的官方 Personal Workspace 事务。
3. **Workspace authority 不能推断。** active Workspace 可能是 team；role/capability 缺失时必须失败关闭。
4. **更新后端口会变化。** Web/daemon 端口必须从当前日志或 handoff 状态动态发现，不能复用上一次端口。
5. **系统 Node 与 Electron ABI 不兼容。** packaged daemon CLI 必须通过 Open Design 自带 Electron 并设置 `ELECTRON_RUN_AS_NODE=1`，否则 `better-sqlite3` 可能报 ABI 不匹配。
6. **Windows 本地路径会被误判。** 原生 `D:\...` 可能被 CLI 当成 marketplace 名；稳定资源镜像配合 daemon-relative `./...` 路径更可靠。
7. **`od.context.atoms` 是闭集。** 自定义 atoms 不能直接塞入该字段；只引用上游内置 atoms，自定义能力通过 assets/skills 等受支持字段连接。
8. **安装器必须内容感知。** 只按 ID 判断“已安装”会让仓库更新永远无法进入 OP；应比较可管理元数据和完整正文。
9. **研究库需要压缩。** 497 位设计师、77 张方法卡、47 条风格谱系和 47 张分析卡保留在研究 SSOT，不拆成实名运行 Skills；Personal 层只发布匿名方法翻译、风格谱系组合和来源治理等紧凑能力。
10. **Evidence 等级不能混用。** 静态文件和测试是 E1/E2；API/daemon 读回是 E3 的一部分；真实 UI 可见是展示证据；只有 exact-SHA PR/CI/merge/readback 才能声明 E4 发布完成。

## 本轮错误与防复发

### 1. Hermes Project 上下文错位

错误：会话最初绑定 `WORK-LAB`，但操作目标是 `OPEN-DESIGN-Assistance`，导致自动注入的是错误项目规则。

防复发：开始任务先读取 Desktop Project；项目切换必须使用 Hermes Project switch，而不是只在 terminal 中 `cd`。当前项目已切换为 `OPEN-DESIGN-Assistance`。

### 2. 根级项目规则缺失

错误：仓库根没有 `AGENTS.md`、`.hermes.md` 或 `HERMES.md`；仅 `minigame-runtime/AGENTS.md` 约束子树，不能自动覆盖全仓。

防复发：每次会话主动读取 `START_HERE.md`、V4.2 产品定义、边界合同与项目数据边界 Skill；后续若新增根规则，应保持简洁并指向这些 SSOT，避免复制完整产品文档。

### 3. 临时验证文件短暂外溢

错误：两个 `hermes-verify-*` 验证脚本曾短暂写入系统 Temp，违反本项目数据边界；文件随后删除，C:/D: 精确候选复扫为 0。

防复发：所有可再生任务数据通过 `hermes-project-data.py --project . run -- ...` 写入 `.hermes/task-runtime/`；项目验证器、rollback staging 和 ad-hoc 脚本都不得写入系统 Temp。即使文件立即删除，也仍属于过程违规。

### 4. Terminal hook 审批漂移

错误：全局 `pre_tool_call` guard 脚本在批准后发生修改，`hermes hooks doctor` 报 `script modified since approval`，因此不能依赖 hook 形成强制边界。

防复发：修改 hook 后先审查 diff，再 revoke 和重新批准；重启 Desktop/Gateway 或开启新会话使 hook 注册生效。在修复前继续显式使用项目数据 wrapper。

### 5. Workspace authority 曾被错误提升

错误：早期安装器路径可能把缺失 role 视为 `owner`，并硬编码 capability 为 true。

修复：只透传 directory API 的真实 authority；Personal Workspace 唯一选择；缺失、多 Personal 无法唯一确定时失败关闭。行为测试覆盖 active team、authority 不提升和多 Personal fail-closed。

### 6. 安装事务早期不完整

错误：旧镜像 `.previous` 曾可能过早删除；第 N 个资源失败会留下新旧混合 catalog；Skill delete 后 install 失败会丢失旧 Skill。

修复：实现镜像延迟提交与回滚、catalog 前后快照和 partial-mutation 报告，以及旧 Skill 官方接口恢复；行为测试覆盖第 5 个资源失败和 Skill 安装失败。由于当前未验证通用 plugin catalog 逆操作，安装器不再盲目重装全部资源或宣称 catalog 已恢复。

### 7. 验证入口与路径误用

错误：Git Bash 下 `/c/...` 被 Windows Python 误解释为当前盘相对路径；测试字段曾把 `categories` 当成 manifest 顶层字段。

防复发：向 Windows-native Python 传原生 Windows 或 `C:/...` 路径；先读 schema/manifest 再写断言，不猜字段层级。

### 8. 上传前门禁使用了不存在的脚本名

错误：首次最终门禁调用了不存在的 `verify_capability_evidence_index.py`，导致整组退出 2。前置检查即使通过，也不能把该组合命令称为 green。

修复：从仓库实际文件重新发现入口，改用 `verify_capability_evidence_v4.py`，随后在最终树完整重跑并通过。门禁命令必须以整体退出码为准，不能只截取前半段成功输出。

### 9. Windows doctor 模型基线漂移

错误：live Open Design 已使用 `gpt-5.6-terra`，但 `doctor_open_design_windows.py` 仍以 `gpt-5.5` 为默认期望，产生虚假失败。

修复：validator 基线升级为 `gpt-5.6-terra`，并增加回归测试禁止退回旧默认。提交前 strict doctor 的模型项已转为 PASS；当时唯一剩余失败是工作树未提交。

### 10. 同名 Design System 覆盖风险

错误：早期实现按标题选择可编辑 user Design System，可能覆盖同名但不属于本仓库的用户内容。

修复：新对象写入稳定 managed marker；已有 marker 才允许更新。旧版安装器创建但没有 marker 的对象，仅在官方详情端点读回的完整正文与仓库 `DESIGN.md` 精确一致时允许一次性接管；正文不同或详情不可读时失败关闭。

补充：可编辑 user Design System 出现重复标题时也必须失败关闭，不能由字典构造或列表顺序静默选择其中一个。

### 11. 新安装器缺少 SPDX 头

错误：安装器进入完整候选树后，license verifier 报 `MISSING SPDX: scripts/install_op_expert_suite.py`，使 canonical 汇总失败 1 项。此前在文件尚未进入完整验证视图时得到的 license PASS 不能沿用。

修复：添加 `SPDX-License-Identifier: MIT`，随后完整重跑 canonical、license coverage 和 Python tests；最终 license coverage 为 0 缺失。

### 12. 同 ID Personal Skill 覆盖风险

错误：早期实现只按 `source=user` 和 Skill ID 识别已安装对象；同 ID、正文不同但属于用户自己的 Skill 可能进入 delete/install 刷新路径。

修复：仓库 15 个 Skills 与 OP 已安装副本均使用稳定 `upstream=https://github.com/DTALEX66/OPEN-DESIGN-Assistance` 作为 managed identity。正文完全一致时只读 skip；只有正文需要更新且 current upstream 与仓库 upstream 精确一致时才允许刷新，否则失败关闭，避免覆盖用户内容。

### 13. Sidecar URL 与 namespace 镜像目标未绑定

错误：早期动态 namespace 只按 `latest.log` mtime 选择；显式 `--app-url` 可能连接一个 sidecar，却把稳定资源镜像写入另一个较新日志对应的 namespace。

修复：任何写操作前先通过官方 `/api/health` 验证显式 sidecar；随后要求同一规范化 `app_url` 在 namespace Web 日志中精确映射到唯一 namespace，再从该绑定 namespace 解析 `data/local-plugin-sources/open-design-assistance`。零匹配或多匹配都失败关闭。

### 14. 稳定镜像 asset closure 不完整

错误：早期稳定镜像只复制 7 个 plugins 和 3 个 bundles；manifest 中 `../../atoms/...` 与 `../../research/...` 的相对引用在仓库源中存在，但在运行镜像中可能悬空。

修复：镜像固定包含 21 个 atoms，并从每个受管 manifest 自动解析和复制其 `od.context.assets` 闭包；路径逃逸或源文件缺失时失败关闭。行为测试在项目内临时目录构造真实镜像并逐条解析所有 asset 引用。

### 15. 晚到审查与证据重锚

错误：第一份异步审查在旧工作树上结束较晚，其中 Design System managed identity 等结论已被后续树修复覆盖，但 asset closure、lifecycle、catalog 回滚措辞、生成计数和 UUID ignore 问题仍能在已合并 SHA 上复现。不能因为审查对象较旧就整体丢弃。

修复：逐项在当前 `main` 重现，只吸收仍成立的发现；Personal Workspace lifecycle 现在严格要求 `active`，asset counts 增加 15 Personal Skills 和 3 Design Systems，plugin index 使用相对自身位置的链接，根级 OP working-copy ignore 改为 UUID-shaped 模式。本轮通过独立补救 PR 交付，不改写既有历史。

## 当前验证摘要

本轮最终候选树得到以下本地证据：

- canonical Open Design verifier：467/467；
- runtime contracts：235/235；
- product manifest：254/254；
- visual scoring：10/10；
- Python tests：90/90；
- MiniGame Node tests：321/321；
- Android/WebView drift：PASS；
- Personal installer focused tests：30/30；
- 专项 MINIGAME ad-hoc：16 checks PASS；
- 项目内安装器加固 ad-hoc：6 checks PASS（临时验证器位于项目 `.hermes/task-runtime/tmp/`，运行后已清理；不替代正式 suite）；
- 正式安装读回：`EXPERT_RESOURCE_READBACK=PASS`、`USER_CONFIG_PRESERVED=PASS`、`OP_EXPERT_SUITE_INSTALL=OK`；
- 真实 Electron UI：3 个 Design Systems 和 10 个 Personal expert resources 可见，小游戏详情页显示通用能力。

这些是本地 E1/E2/E3 证据。发布只在 PR exact-head CI、squash merge、main readback和本地/远端 SHA 一致后升为 E4。

## 已知限制

- plugins/bundles 可进一步按 manifest hash/version 精确跳过，减少无变化重复安装。
- Design Systems、Skills 与 plugin mirror 尚不是一个跨资源全局原子事务。
- Open Design launcher 的 `Object has been destroyed`/shutdown 后 `desktop-pet ERR_FAILED` 属于已观察到的生命周期竞态，不应冒充资源或数据库损坏；持久 launcher 修复应由上游或动态版本解析方案处理。
- 全局 Hermes 配置当前 `reasoning_effort=low` 且 terminal hook 批准漂移，属于用户环境配置问题，不纳入本仓库提交。

## 重建与回滚

重建入口：

```bash
python opendesign-assistance/scripts/install_op_expert_suite.py --dry-run
python opendesign-assistance/scripts/install_op_expert_suite.py
```

验证入口：

```bash
python opendesign-assistance/scripts/verify_open_design_assistance.py
python scripts/run_python_tests.py
cd minigame-runtime && npm test && node scripts/check-android-drift.mjs
```

回滚原则：

- 代码通过 Git/PR 回退；
- Personal Skill 刷新失败由安装器恢复旧正文；
- plugin stable-source 事务失败恢复旧镜像；catalog 快照不变时确认无 catalog 漂移，发生变化时失败关闭并报告 delta，不能虚称自动恢复；
- 不直接修改 `app.sqlite`；
- 不修改 Open Design 版本 payload；
- 不删除用户 Workspace、聊天、认证或个人配置。

## 数据边界与发布纪律

- E: 为保护盘：不枚举、不读取、不写入、不移动、不删除。
- `.hermes/`、Open Design namespace、SQLite、OAuth、日志原件和用户 app config 不提交。
- 当前报告不包含 Workspace ID、member ID、动态端口、token、OAuth 或 prompt/response body。
- 发布链：最终 diff 审计 → canonical gates → 独立只读审查 → feature branch → PR → exact-SHA CI → squash merge → main CI/readback → 本地 `main` 同步 → `HEAD == origin/main == GitHub main` 且工作树干净。
