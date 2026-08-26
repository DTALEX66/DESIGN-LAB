# 第三方指令隔离清单

> 本文件记录 DESIGN-LAB 仓库中的第三方指令文件。这些文件作为 inert source blobs 保存，
> 不进入根指令、prompt、tool discovery 或能力计数。

## 隔离状态

| 状态 | 含义 |
|---|---|
| `INERT_BLOB` | 作为源码保存，不执行、不索引、不进入 prompt |
| `QUARANTINE` | 身份/许可/安全未闭合，禁止激活 |
| `REFERENCE_ONLY` | 有启发但不进入运行面 |

## 第三方 AGENTS.md 文件

| 路径 | 来源 | 状态 | 说明 |
|---|---|---|---|
| `design-lab/intelligence/ultimate-uiux/AGENTS.md` | Design Pro (第三方设计技能) | `INERT_BLOB` | 64行，React/Tailwind/shadcn 设计方法论 |
| `design-lab/intelligence/claude-design-skill/AGENTS.md` | jiji262 | `QUARANTINE` | 3行，外部身份规则（`jiji262 <jiguofei@msn.com>`） |
| `design-lab/intelligence/design-system-prompt/codex/AGENTS.md` | 第三方 Codex 技能 | `INERT_BLOB` | 6行，设计系统 prompt 加载指令 |
| `minigame-runtime/AGENTS.md` | 本项目 | `ACTIVE` | 23行，MiniGame fixture 定义（已正确） |

## 第三方 CLAUDE.md 文件

| 路径 | 来源 | 状态 | 说明 |
|---|---|---|---|
| `design-lab/intelligence/ultimate-uiux/CLAUDE.md` | Design Pro | `INERT_BLOB` | 配套 CLAUDE 规则 |
| `design-lab/intelligence/claude-design-skill/CLAUDE.md` | jiji262 | `QUARANTINE` | 外部身份规则 |
| `design-lab/intelligence/motion-forensics/CLAUDE.md` | 第三方运动分析 | `INERT_BLOB` | 运动取证技能 |
| `design-lab/knowledge/visual-quality/affiliate-skills/CLAUDE.md` | Affitor | `QUARANTINE` | 联盟营销技能，有外部 API（openaffiliate.dev）和自动更新 |
| `design-lab/knowledge/visual-quality/claude2figma/CLAUDE.md.template` | 第三方 | `INERT_BLOB` | 模板文件 |
| `design-lab/knowledge/visual-quality/game-ui-mobile/CLAUDE.md` | 第三方 | `INERT_BLOB` | 游戏 UI 移动端设计，有外部路径引用（`D:\972026\`） |

## 隔离规则

1. **不进入根指令**：根 `AGENTS.md` 不引用这些文件
2. **不进入 prompt**：执行任务时不加载这些文件作为指令
3. **不进入 tool discovery**：不被扫描为可用 skill
4. **不进入能力计数**：`capability-index.json` 需重构，只接受显式 `capability.manifest.*`
5. **不自动激活**：quarantine 内容无法自动激活

## 待修复

- [ ] `capability-index.json` 需重构：当前 2424 项包含所有文件（README、LICENSE、requirements 等），需改为只接受显式 capability manifest
- [ ] `claude-design-skill/AGENTS.md` 和 `CLAUDE.md` 包含外部身份规则，需确认是否保留或删除
- [ ] `affiliate-skills/CLAUDE.md` 包含外部 API 和自动更新，需确认是否保留或删除

## 创建时间

- 创建者：DLR-020 任务
- 创建时间：2026-08-26
- 基线 SHA：`38d322affaec163e7c7ca0e3610042285aab1f0f`
