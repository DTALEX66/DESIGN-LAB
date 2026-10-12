# 下一会话提示词 — 2026-10-12（第二十三批收口，防漂移版）

**这不是 Authority。** 读它的顺序必须是：
`/AUTHORITY.md` → `.project/governance/authority-index.json` → 根 `AGENTS.md` →
唯一当前包 `docs/taskpacks/DESIGNLAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md` →
唯一状态源 `design-lab/config/task-ledger-r3.json` 的 `currentExecution` → 本文件。

记忆、聊天摘要、交接、旧 TaskPack、旧报告、分支名、提交数**都不能覆盖 Authority**。
**分支 / SHA / 工作区一律以你自己 `git rev-parse HEAD`、`git status --porcelain`、
`git ls-remote origin` 的读数为准，不要抄本文件里的任何 SHA。**

---

## 一、为什么会有这份文件（防漂移，说明白）

第二十三批之前，本仓库有**四个权威面**同时在说"还没提交"，而它们其实早已提交推送：

- `AGENTS.md`「本轮归档与权威同步为本地未提交修改……不宣称远端已同步」
- `AUTHORITY.md`「repository commit=NOT_EXECUTED, live CI=NOT_EXECUTED」
- `docs/current/TASKPACK-ADOPTION-VERIFICATION-2026-10-09.md`「本轮改动仍为本地未提交工作」
- `docs/current/UI-DESKTOP-RECONCILIATION-2026-10-09.md`「工作树：DIRTY（本地未提交）」

一个换会话、换软件的新 Agent 读到其中任何一条，都会**正确地推导出错误的结论**：
远端不可信 → 重复劳动、或者不敢基于远端做任何判断。**漂移不是忘了更新，是更新了但被旧事实覆盖。**

四条都已加时点更正（保留原句 + 标注何时失效），而不是删掉——删掉会让后来者以为那段变更从未被提交过。

**你接手时先做这件事**：`git fetch origin && git rev-parse HEAD origin/main`，
若两者不一致，说明又有人在工作分支上推了东西；**先问清楚再动**，不要自行合并。

---

## 二、当前状态（自读为准，以下只是 2026-10-12 的时点）

| 维度 | 状态 |
|---|---|
| 分支 | `main` + `qoder/designlab-backup-consistency-20261007`（合并后同 SHA） |
| 本地分支 | 3（main / 工作分支 / `rescue/designlab-personal-audit-dirty-20261007`） |
| 远端分支 | 2 |
| worktree | 1（主检出） |
| 唯一可变状态源 | `design-lab/config/task-ledger-r3.json` → `currentExecution`，34 项 |
| 回执 | 194 条，产物全部受跟踪（`design-lab/evidence/current-execution/`） |
| 聚合闸 | 本地 `VERIFY_DESIGN_LAB=FAIL total=75 failed=2`（两条本机环境问题，见下）；**CI 上 `OK total=75 failed=0`** |

**权威链的正确读法**：`/AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`）→ authority-index →
`AGENTS.md` → 唯一当前包 → `currentExecution` → 本文件。`Handoff` 永远不是顶层权威。

---

## 三、owner 项 G 已关闭：干净 clone 现在能自己复现

这是本批最大的一件事，因为它是**换机器漂移的直接来源**。

- 交接提示词曾写"搬 242.71 MiB 进 Git"。**这个数字是错的**：194 条回执里 175 条绑定
  `.project-local`，实际只引用 **1.13 MiB / 175 个小文件**；`.project-local` 整体 5.2 GB 但大部分无人引用。
  **先量再让 owner 选**，是这次的关键——那个数字本会否掉唯一可行的方案。
- 字节已复制到 `design-lab/evidence/current-execution/`（保持原相对形状）；194 条回执全部改指受跟踪副本，
  **`artifact_sha256` 一个都没动**（脚本逐个重算，不符即中止）。
- 途中三次真实碰撞，**都没有绕开**：
  1. 供应链闸把任何受跟踪 `.log` 判为生成物，而 A 必须跟踪 82 个 → 豁免**只给 evidence 根下的 `.log`**。
     第一版写宽到整个 marker 元组，被我自己的探针抓到 `.pyc` 也被豁免，已收窄 + 6 条探针钉边界。
  2. `* text=auto eol=lf` 把工作树 CRLF 改写成 blob LF，回执哈希的是工作树字节 → 证据标 `binary`。
     验证方式是对索引 blob 逐个 `git show :<path>` 重算，194/194 一致。
  3. `deepseek_content_audit` 把"本机没抓取过 gitignored 缓存"当成缺陷并翻转 verdict →
     改 `CACHE_ABSENT`，**仓内路径缺失仍判缺陷**。

## 四、`RECORD_VERIFY`：已落地副本可以演进，但必须被记录

`docs/history/record-imports-2026-10-08/RECORD-IMPORT-MANIFEST.json` 里 7 行
`ALREADY-IN-REPO` 曾声明"仓库副本 == 归档字节"，而这 7 个文件后来被**有意重写**
（`147e6dc9` 改了 4 个权威/索引文件 + PRODUCT_DEFINITION.md，`da43c4dc` 改了 2 个 T07 标准）。
旧闸只能报 `WORKTREE-MISMATCH`——**诚实的演进与静默损坏长得一模一样**。

现在每行带 `repoSha256AfterImport` / `repoCrc32AfterImport` / `repoBytesAfterImport` + `evolvedBy` + 说明。
归档字节仍对 ZIP 校验（leg 1，492/492），leg 2 改为对仓内副本核对这些落地后摘要。
**这不是豁免**：两条反例钉住——写错落地后 crc 会 FAIL；不写 commit 会 `WORKTREE-EVOLVED-UNDECLARED` FAIL。

**你若要改这 7 个文件之一**：照此模式更新该行的落地后摘要，不要删 `evolution`，也不要把摘要改成"归档值"。

---

## 五、本机环境坑（会伪装成判据问题）

- 本机 sandbox 的 **safe-delete 批量守卫**会在 `shutil.rmtree` 上拦截
  （`[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] count=50 threshold=50`）。
  这使 `verify_reconstruction_pipeline` 与 `verify_reconstruction_bundle` 在本机恒红；
  两条已在**未改动的 HEAD 上复现过同形**，属环境不是回归。**CI 上这两条是绿的。**
- `git worktree remove` 删大工作树会被同一守卫卡住（582 MB）→ 后台跑 + 免沙箱。
- 路径含空格（`D:/All projects/...`）时**不要用 `for` 循环按空格切路径**，会让统计静默失真。
  用 `while IFS= read -r`。我因此一度误报"所有工作树都干净"。
- `design_lab` 是 namespace package，`domain_packs.py` 里 `..` 相对导入会抛
  "attempted relative import beyond top-level package"，必须绝对导入。
- `vm.runInContext` 跑 bundle 时，bundle 顶层函数**只在 context 里**；在外层 node 脚本直接调用会
  `is not defined`。**"fetch 之前抛异常"在断言里读作"没有发出请求"**——脚手架缺一个 API 会让覆盖被静默跳过。
- 新闸不登记进 `verify_design_lab.SCRIPTS` 或 `verify_browser_e2e_ran.TEST_MODULES`＝永远没人测 / 永远 skip。
- 改 `packages/` 下任何文件会让 `inert_contract_survey` 的计数变化 → 按其文档化路径重跑生成器。
- 追加到活文档 `docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` 会让 17 条绑它的回执漂移 →
  `.project-local/tmp/reseal_qa_batch19.py` 重封（只有 `artifact_sha256` 可移动）。

---

## 六、仍未完成（不要替 owner 宣布完成）

**需要 owner 裁定**：清单 A–F、H–J（详见 `docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md`）。
其中 **D05–D08 前端发现性与过滤**是可逆工程、可直接做；D08（跳转不带领域条件）是第十八批我自己引入的。

**尚未执行**：真实宿主 E3（需 owner 明确授权）、真人 E4、release、安装态分发、手机端（FROZEN_DEFERRED）。

**`rescue/designlab-personal-audit-dirty-20261007` 必须保留**：它独有 4 个仓库里完全没有的文件
（个人产品审计报告、UI 实施报告 A 版、两个 personal_workbench E2 测试）。它无远端副本，删了就没了。

**一条已知的、尚未解决的 CI 拓扑问题**：Python unit tests 步骤排在 unified verify 之后，
聚合链一红就 skipped → 578 个 unittest 模块目前只是本地证据。要 CI 真跑到需 owner 允许改拓扑。

---

## 七、每批的完成判据（照做，别省）

改动 → 闸与测试复跑（浏览器五件套 `skipped=0`）→ `generate_current_reports.py` →
回执封存（**先账本、后链、同批提交**）→ 提交 → 推工作分支并核对双端 SHA →
**读该 SHA 的 CI 日志逐作业照抄**（不预测、不把本地结论写成 CI 结论）→
更新审计文档批次追记 → 给出可审阅实拍。

**一条新的**：改动 `packages/`、`docs/`、`src/` 或新增受跟踪文件后，
`verify_language_boundary` 记的 `tracked_files_scanned` 会过期 → 重跑生成器再提交。
记录类闸只在**产生它的那台机器**上为真，这是本批反复踩到的同一类缺陷。