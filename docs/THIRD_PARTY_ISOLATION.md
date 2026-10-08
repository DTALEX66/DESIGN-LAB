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

## 退役登记：`vendor/sources.lock.json` 里指向已删除目录的 6 条 LOCK_REFERENCE

补记于 2026-10-08（任务：把"悬空引用"改成"显式缺失声明"）。此前 `docs/THIRD_PARTY_ISOLATION.md`
只按**文件**列出被删的第三方 AGENTS/CLAUDE 说明件，`amend_source_lock_presence.py` 的
`pathNamedInIsolationRecord` 因此只对两条目录为真——那两条是**子串巧合命中**，不是来源退役声明，
另外 4 条整目录引用则完全没有依据。下表逐条由 `git log --diff-filter=D` 与被删前的
`git rev-parse <commit>^:<path>` 测得，不抄不改：删除提交、被删 tree 的 SHA（这就是这批字节的
内容身份，可复核、可再取）、锁记文件数、以及各树内 `SOURCE.md` 自述的上游与许可。

`revision` 列诚实标注"未记修订"：这些是 2026-08-13/14 vendoring 时只记了分支的记录，
补不出 commit 就写补不出，不用今天的 HEAD 冒充当时的字节。三条 `ABSORB_MINIMAL` 的修订状态
由 `vendor/sources.revisions.json` 单独登记，LOCK_REFERENCE 不混进去。

| lock id | 原路径（整目录，已删除） | 锁记文件数 | 删除提交 | 被删 tree SHA（内容身份） | 上游（SOURCE.md 自述） | 许可（SOURCE.md 自述） | 修订 |
|---|---|---|---|---|---|---|---|
| `anydesign` | `design-lab/intelligence/anydesign` | 19 | `c9cde8a54e22f84f988537e212b992de3bd7cfcd`（2026-09-04） | `5bd9befc04926072f1bd73538940591c09044516` | https://github.com/uxKero/anydesign | `MIT` | 未记修订 |
| `claude-design-skill` | `design-lab/intelligence/claude-design-skill` | 24 | `c9cde8a54e22f84f988537e212b992de3bd7cfcd`（2026-09-04） | `599981a99da57f718b647a6add6eebcd54635b82` | https://github.com/jiji262/claude-design-skill | `MIT` | 未记修订 |
| `design-system-prompt` | `design-lab/intelligence/design-system-prompt` | 34 | `c9cde8a54e22f84f988537e212b992de3bd7cfcd`（2026-09-04） | `4b745f22417812b18149d18962289f238f351f38` | https://github.com/Trystan-SA/claude-design-system-prompt | `MIT` | 未记修订 |
| `motion-engine` | `design-lab/intelligence/motion-engine` | 28 | `c9cde8a54e22f84f988537e212b992de3bd7cfcd`（2026-09-04） | `fe0e31cd55b12b4c9e62ed0f49c5c82e2259fed4` | https://github.com/OpaceDigitalAgency/skills | `MIT` | 未记 commit（仅 `main`） |
| `shipit-ui` | `design-lab/intelligence/shipit-ui` | 76 | `c9cde8a54e22f84f988537e212b992de3bd7cfcd`（2026-09-04） | `d232d4f85df01d152aeb102ea70f773a8d88bbfc` | https://github.com/shipiit/shipit-ui-design | `MIT` | 未记修订 |
| `web-content-designer` | `design-lab/intelligence/web-content-designer` | 11 | `c9cde8a54e22f84f988537e212b992de3bd7cfcd`（2026-09-04） | `0c4de6fe7925ce7e80081e987e431ec2cba24455` | https://github.com/lowtidebuild/web-content-designer | `Apache-2.0` | 未记修订 |

处置：6 条记录**保留**为历史引用（删掉记录会同时删掉"它曾存在"的唯一痕迹），但从此每条都
带删除提交与内容身份，读者可独立复算。`web-content-designer` 的许可另见
`vendor/sources.lock.json` 的 `licenseCorrection`：锁与 `rights-registry.json` 两处原写 MIT，
而 SOURCE.md、`QUARANTINE_REGISTRY`（已 reviewed）、SBOM 三处一致为 Apache-2.0，故对齐到有证据的值。
