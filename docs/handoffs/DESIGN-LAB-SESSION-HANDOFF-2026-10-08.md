# DESIGN-LAB 交接 · 2026-10-08（能力链自证 / 界面标志与导航 / 吸收池对账 / 上传）

本文每个数字都来自本轮读到的收据、账本、git 或门报告，文件路径随数写出；没有一个是回忆或推算。
生成器 `scripts/emit_session_handoff_20261008.py` 未使用：它要求收据 `worktree_clean=True`，
而全套运行**结构上不可能**干净（投影里嵌着上一次运行的 run_id，跑一次就改一次），见 §5。

## 0. 双端状态（实测）

- 本地 tip = 远端 tip = `4a7e196d3900418e59238c47b3e505f6992cece7`（`git ls-remote` 与
  `git rev-parse` 逐字符比对，`BOTH_ENDS_IDENTICAL=yes`）
- 分支 `qoder/designlab-backup-consistency-20261007` 已推送并建立 upstream；相对
  `origin/main` ahead **138**，且 `origin/main` 是它的祖先（可 fast-forward）。
- **main 没有被推进，没有开 PR，没有合并**：那三件按边界要单独授权。

## 1. 这一轮做完的事

1. 证据链可问：`GET /api/evidence-projection` + 契约 + 发射器 + 界面卡片 + 真实浏览器门；
   对象读按 commit 批量化（10.0s→1.0s）。
2. 字节声明枚举收归单一所有者，绑定门按声明的 binding 判定。
3. 30 条 INERT 合同算成可拍板表（`docs/audits/INERT-CONTRACT-SURVEY-2026-10-08.md`，带 `--check`）。
4. 界面换上 owner 的图形标：从黑白稿按亮度斜坡抠出，以 data URI 内联进被服务的样式表
   （`img-src data:` + 三条固定路径决定它不能是新路由），并在真实 Chromium 里量渲染。
5. 导航两个真缺陷修掉：矮窗口静默裁菜单（68–317px）与窄屏抽屉 Escape 无效。
6. 全套跑出来的三处旧账修掉：列表容器清单 pin、`$ref` 合成器、新二进制权利 sidecar。
7. 测试自身可重复性缺陷修掉：holder-lives 用例在 Windows 上拆卸期抢句柄导致 ERROR。
8. 体积：按名清理 4 个可再生根，回收 **0.69 GiB / 4.75 GiB = 14.5%**（见 §4）。

## 2. 当前实测基线（下一轮以此为起点，不是以本文为准）

| 项 | 值 | 来源 |
|---|---|---|
| 聚合门 | `VERIFY_DESIGN_LAB=OK total=68 failed=0` | `design-lab/scripts/verify_design_lab.py` |
| 全套绑定运行 | `testrun-20261008T115408Z-forward-2eff6d33e865`：2686 tests / 0 failures / **1 error** / 5 skipped / subject `f5b56c67` / clean=False | `.project-local/task-artifacts/test-run/last-run.json` |
| 那 1 个 error | `test_boot_reconciliation.ProbeIsRequired.test_nothing_is_relabelled_while_the_holder_lives`，teardown WinError 32 | 同上 `errors_detail` + `.project-local/tmp/bound-wave.log` |
| 该 error 的现状 | 已在 `55a7bbca` 修复：模块连跑 5 次 9 例 OK，加守卫例后 10 例 OK；**尚未由全套复验** | `.project-local/tmp/br-*.log` |
| UI 量化门 | `totalMetrics=26 hardViolations=0` | `.project-local/task-artifacts/browser-e2e/workbench-ui-audit.json` |
| 令牌/样式表门 | 68 例 OK（design-system tokens / DTCG / CSS 单定义） | unittest 直跑 |
| 证据记录 | 76 条（local_test 71 / structural 4 / host_live 1；PASS 39 / PARTIAL 37） | `design-lab/config/task-ledger-r3.json` |
| 任务 | 28 个全 PARTIAL | `reports/current/TASK_PROGRESS.json` counts |

## 3. 卡在哪：只有三种人能给的东西

- **真实宿主 E3**：全仓只有 1 条 host_live 记录。PS/AI/Comfy 从未被驱动跑过真实设计任务。
  入口已在仓里（native worker、审批台账、回滚证明），缺的是你授权拉起真实宿主。
- **真人 Jury E4**：评审机器与读回全通，但没有一条"真人对着真设计稿下的判决"。只能你签。
- **发布 E5 / CI**：没有 exact-SHA release；推送已按授权完成，PR 与合并未做。
- **30 条 INERT 合同接还是删**：普查表每行带 `retire_targets`。
- **吸收池注册要人签**：`verify_candidate_taxonomy.py` 明令"代理不得自签 reviewedBy"，
  所以 §4 的对账我只能报，不能替你确认。
- **品牌 sidecar 三个权利位**：`apps/workbench/brand/design-lab-mark.png.license` 里
  `redistributable=false` / `commercialUse=true` / `modelInputAllowed=true` 是我按本次指示的
  保守读法，不对就改这个文件。

## 4. 开源吸收池：账与货零重叠（实测，未修）

- `research/candidates/CANDIDATE-TAXONOMY.json` 980 条，`generatedAt=2026-10-06T11:09:32Z`；
  979 条 `adoption.observedAt` 距今 2 天，**唯一没被重观测的是 `tool-control`**，它也是唯一
  无 `pinnedCommitSHA` 的一条；7 条缺 `discoveredAt`。
- **吸收没有发生**：`evidenceLevel` 980/980 全 `E0`，`tier` 全 None，`reviewedBy` **0/980**；
  disposition = 943 DISCOVERED + 37 CONDITIONAL_POC。
- 可复用的料确实已在册：`component-library` 125 + `design-system` 178 = 303，许可分布
  MIT 194 / Apache-2.0 39 / NOASSERTION 31 / 无 23 / CC0 6 / ISC 2。
- **账货不符**：`SOURCE_REGISTRY.json` 6 条的 `integration.target` 全指
  `design-lab/knowledge/sources/<id>`，而该树被 `c9cde8a5`（2026-09-04，DL-DIR-MIG-R1）删除，
  `git ls-files` 已无相关路径 → 人已审的记录悬空 34 天。反向：`.project-local/cache/vendor/`
  实有 **37 个** vendored 根，**一条都不在注册表里**。
- 已有门为何不响：`verify_source_registry.py:143` 只在 `status=active` 时要求 target 存在，
  这 6 条是 `review-required`。修法：任何带 target 的行若 target 不存在，必须显式声明缺失
  状态与起始提交，不能让"被删"伪装成"待审"。
- `QUARANTINE_REGISTRY.json` 162 条：`contentHash` 0/162、`reviewedBy` 0/162，文档停在 2026-08-16。

体积（`size_container.py` 全量重走，followlinks=False，跳过 47 个 reparse 点）：
清理前 checkout **4.75 GiB**，`.project-local` 占 87.2%；按名删除
`task-runtime/{fresh-clone,wheelcheck,wheelcheck2,contract-bindings-scratch}`
= 291+196+194+26 MiB，清理后 **4.06 GiB**，回收 **0.69 GiB = 14.5%**。
仍按名保留 **1.15 GiB** 并写明理由：`worktrees` 532 MiB（10 个兄弟分支属其他 agent）、
`projects` 341 MiB（真实数据）、`task-artifacts` 126 MiB（被账本引用的证据）、
`backups` 69 MiB（唯一副本）、`playwright` 51 MiB（浏览器门的暖缓存，删了门会 skip 而非 pass）、
`cache/vendor` 33 MiB（37 个 vendored 源的唯一副本，且其注册表已坏）、`lint-tools` 26 MiB。
`.git` size-pack 240.24 MiB，其中历史不可回收（需重写历史，破坏性，未授权）。

## 5. 一个结构性事实：全套运行永远不可能 clean

投影里嵌 `test_run_id`，所以每跑一次全套就改一次 `reports/current/*`
（本轮固定是那三个：`EVIDENCE-LEVEL-AUDIT.json` / `NO-OVERCLAIM-AUDIT.json` /
`SUPPLY-CHAIN-REPORT.json`）。因此 `worktree_clean=True` 只对 `--modules` 子集可达，
而子集恰恰是本轮抓到三处旧账的地方。要么让投影不嵌 run_id，要么把"dirty 集合恰为这三个
投影"作为可接受条件写进门——两者都是设计决定，未擅自改。

## 6. 下一轮第一批动作（按顺序）

1. 全套重跑（`--order forward`，不带 `--modules`）复验 `55a7bbca` 的 teardown 修复；
   判定看 `.project-local/task-artifacts/test-run/last-run.json` 的 `result/errors_detail`，
   不看包装退出码。
2. 用 §4 的对账结果决定：`tool-control` 重观测、6 条悬空记录改缺失状态、37 个 vendored 根
   是否入库（需你签 reviewedBy）。
3. 补 `DESIGN.md` 设计契约（UI套件 B04/L4 落成仓内文本），否则"界面是否符合设计标准"
   永远只能答一半（§36.5）。
4. 决定 30 条 INERT 与 MethodCard 两种形状。
5. 若要 main 前进：`origin/main` 是当前 tip 的祖先，可 fast-forward；PR/合并需你点头。

## 7. 环境速查（本轮新增的坑）

- 本机对 `api.github.com` 与 `registry.npmjs.org` 实测 200；旧记忆"HF/GitHub 连不上"只对
  HuggingFace 模型通道成立，已纠正。缺第三方 npm 包是在界内要补的洞（装到
  `.project-local/runs/node-libs` + ESM 解析钩子），不是"跑不了"的理由。
- 深度路径删除要 `\\?\` 前缀且必须用反斜杠形式（`as_posix()` 会被前缀拒绝）。
- `grep -a` 读含中文/符号的日志；管道会吞退出码，判定一律落到文件再读。
- vm 测试壳的 `MockElement` 缺 `querySelector` 是 `mountB10Shell` 的能力探测，补它会改变产品行为。
- 全套运行期间不要动被跟踪文件，也不要共享端口：本轮我自己拉起的 61509 服务全程在场，
  模块级复跑仍 5/5 通过，但结论要以空闲复测为准。
