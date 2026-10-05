# 10 — 剩余阻塞与遗留项（精确到可执行）

## A. 人工 / 权限门（Agent 不能自解）

| # | 项 | 状态 | 下一动作 |
|---|---|---|---|
| A1 | Photoshop / Illustrator 真宿主 E3 | `BLOCKED_PERMISSION`（本轮 owner 选择「只做只读探测」） | 授权后执行 `design-lab/tests/host_fixtures/prepare_illustrator_lowered.py --execute-com` 与 `prepare_photoshop_native.py --execute-com` |
| A2 | Human Jury（REJECT→修正→RE-SUBMIT→PASS） | `BLOCKED_HUMAN` | 见 `08_JURY_RIGHTS_PREFLIGHT.md` 的 5 个问题，需 A1 产物 |
| A3 | PR #213 un-draft / merge / 分支删除 / tag / release | `BLOCKED_PERMISSION`（owner 门） | 已 push 到 `84ffc19`，保持 DRAFT；等 owner 决定 |
| A4 | 截图内系统字体的再分发权利确认 | `UNKNOWN RIGHTS` | 法务/许可确认前，不得据此做 `PRODUCTION_CERTIFIED` |
| A5 | Ruff 是否真正 enforce（Authority §8 遗留决策） | `OPEN` | 单独决策，不重开全语言迁移 |

## B. 账本 / 投影遗留（Agent 可执行，本轮未做）

| # | 项 | 现状 | 建议动作 |
|---|---|---|---|
| B1 | `DL-R5-010` implementation/unit 投影为 `UNVERIFIED` | 证据 subject_sha 衰减 | 在目标 SHA 上重跑绑定测试，写一条 `outcome=PASS` 的 evidence |
| B2 | `design-lab/config/capability-evidence-current.json` 仍是 2026-09-04 `DL-TP-R2-014` 投影，`bound_sha` 全 null、`supported_current` 全 false | 过期投影 | 由既有生成器重生成并绑定 exact SHA，禁止手工填绿 |
| B3 | 28 项 R5 任务 `reassessment` 仅 010 变 `REVIEWED`，其余 27 项仍 `PENDING_EVIDENCE_REVIEW` | 未复核 | 逐条按当前 Authority 产品轴复核；无证据不得抬升 |
| B4 | 11 项产品轴（CONTRACT/BACKEND/FRONTEND/…）在 ledger 里仍是 4 轴词表 | 词表与 Authority §2 不一致 | 属 Authority 级映射决策，需 owner 定口径后再改，不自作主张 |
| B5 | `reports/current/DEEPSEEK-AUTHORITY-CHAIN.json` 生成于 2026-09-29 | 可能已漂移 | 用 `scripts/deepseek_authority_chain.py` 重生成并核对 |

## C. 本轮发现的环境/工程性事实（值得记录，避免重复踩）

| # | 事实 | 影响 |
|---|---|---|
| C1 | `node`/`pnpm` 不在 Git Bash PATH；本机 Node 在 scoop 工具链根 `10-toolchains/scoop/apps/nodejs-lts/24.18.0`，pnpm 经 `corepack pnpm` 可用 | 不探测就误判「未安装」；门需在正确 PATH 下跑 |
| C2 | 深路径 git worktree（`.project-local/task-worktrees/closeout-20261005`）会让 `verify_asset_governance.py` 因 Windows MAX_PATH 报 `cannot stat tracked file` | worktree 放在 `.project-local/wt/c1` 后全绿；Windows 上 worktree 根要短 |
| C3 | Playwright 全量 Chromium（`chromium-1228/chrome-win64/chrome.exe`）与 headless-shell 并存；既有浏览器 E2E 的探针**优先 headless-shell**，其 E2 记录里的 browser 字段是路径字符串而非版本号 | 截图证据与 E2 记录的“浏览器”口径不同，报告中已分别写明 |
| C4 | KPI count-up 是 JS 动画，Playwright `animations:'disabled'` 无效 | 任何“数值证据”截图都必须等数值收敛 |
| C5 | 仓库体积预算 `pack_mib=216.0 / hard_budget_mib=256` | 再向 docs 提交二进制证据前需先定 artifact 策略 |

## D. 明确冻结的外围扩张（未做，符合任务书 §9/§10）

`H3 / 全面 ComfyUI / TTS / Music / Premiere / Blender / Game asset / Collaboration /
Penpot collaboration / OpenPencil 深度集成 / 第二画布 / 第二 runtime / 第二前端`
全部维持 `DEFERRED_AFTER_M1`；`DL-R5-008/016/017/018/019/020/021/022/024/025/026/027/028`
状态未改，未删除。

## E. 历史恢复

`HISTORY_RECOVERY_PARTIAL` 维持不变：未宣称历史 100% 恢复；
本轮未触碰 `DESIGN-LAB完整项目对话与时间线汇报.md` 及其 manifest。
历史恢复与产品 M1 分离，不阻塞主链。
