# 第三方指令隔离（现状：仓库外隔离）

> 更新：2026-09-04（DL-DIR-MIG-R1 规范化终版）
> 历史：DLR-020（2026-08-26）曾记录"仓库内 inert blob 隔离"；DL-DIR-MIG-R1（2026-09-01~03）将第三方内容迁至 `research/candidates/`；2026-09-04 规范化后**第三方完整源码已退出 Git**，隔离由"仓库内排除"升级为"仓库外物理隔离"。

## 隔离状态（2026-09-04 起）

| 层 | 内容 | 位置 | 治理 |
|---|---|---|---|
| **Git 内（无第三方源码）** | 自有代码/文档/配置 + `research/candidates/README.md` 索引 | 仓库 tracked | license/sbom/identity gate 全覆盖 |
| **ignored cache（第三方源码）** | 37 个候选仓完整源码（含 LICENSE/SOURCE.md/AGENTS.md/CLAUDE.md/SKILL.md） | `.project-local/cache/vendor/<id>`（gitignored） | `vendor/sources.lock.json` 登记 43 项（disposition=CONDITIONAL_POC / LOCK_REFERENCE） |
| **决策登记** | 逐仓来源/许可/裁决 | `design-lab/research/global-absorption/QUARANTINE_REGISTRY.json`（162 源） | license review 已逐项核实 |

## 为什么仓库内不再保存第三方源码

1. **不进入根指令**：根 `AGENTS.md` 不引用第三方文件
2. **不进入 prompt / tool discovery**：第三方 AGENTS/CLAUDE/SKILL 不在工作树，工具无法递归发现
3. **不进入能力计数**：`capability-index` / `product-manifest` 只登记 DESIGN 自有能力（manifest v3 校验 321 项路径全绿）
4. **license 合规简化**：Git 内所有文件接受统一 SPDX 头/侧车检查（`LICENSE_COVERAGE=OK`）；第三方各自许可随 cache 保存、不混入项目许可面
5. **可追溯**：每仓有来源 URL + 原始 SHA（SOURCE.md）+ 许可核实（QUARANTINE_REGISTRY），需要时从 cache 取用

## 历史遗留参考（DLR-020 记录，2026-08-26）

下列文件曾是仓库内 inert blobs，2026-09-04 已随候选仓退出 Git（保真副本在 `.project-local/cache/vendor/`）：

| 原路径（已删除） | 来源 | 当时状态 |
|---|---|---|
| `design-lab/intelligence/ultimate-uiux/AGENTS.md` | Design Pro (第三方设计技能) | `INERT_BLOB` |
| `design-lab/intelligence/claude-design-skill/AGENTS.md` | jiji262 | `QUARANTINE` |
| `design-lab/intelligence/design-system-prompt/codex/AGENTS.md` | 第三方 Codex 技能 | `INERT_BLOB` |
| `design-lab/intelligence/motion-forensics/CLAUDE.md` | 第三方运动分析 | `INERT_BLOB` |
| `design-lab/knowledge/visual-quality/affiliate-skills/CLAUDE.md` | Affitor | `QUARANTINE` |
| `design-lab/knowledge/visual-quality/claude2figma/CLAUDE.md.template` | 第三方 | `INERT_BLOB` |
| `design-lab/knowledge/visual-quality/game-ui-mobile/CLAUDE.md` | 第三方 | `INERT_BLOB` |

## 未来资格化（DL-DIR-030）

- 候选仓验证通过 → ABSORB_MINIMAL 提取进 `packages/capabilities/<id>`（许可 + 来源 + 测试随行），**仍不整仓复制**
- 参考用 → LOCK_REFERENCE（`vendor/sources.lock.json` 已有记录）
- 不合格 → REJECT_REMOVE（decision ledger）
- 任何情况下第三方整仓不回 Git

## 创建时间

- 创建者：DLR-020 任务（2026-08-26，基线 SHA `38d322affaec163e7c7ca0e3610042285aab1f0f`）
- 更新：DL-DIR-MIG-R1 规范化（2026-09-04）
