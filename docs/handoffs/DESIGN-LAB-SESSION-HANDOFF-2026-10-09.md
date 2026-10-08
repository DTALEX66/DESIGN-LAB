# DESIGN-LAB 交接 · 2026-10-09（vendor 逐文件登记 / 新门注册 / CI 未执行的确切原因）

本文每个数字都来自本轮读到的收据、门输出或 git 对象，路径随数写出；没有回忆值，没有推算值。
本轮只做第一批第 5 项的余量与第 2 项的复验，没有重跑全套或全仓普查（理由见 §5）。

## 0. 双端状态（实测）

- 本轮推上去的三个头：`53802797068e3e55ad55240d250523007c5f5cdd`（vendor 登记与门）、
  `2845237c4e2f4d3b422f150f06063359a22d34ad`（投影重绑）、
  `fa0b63d994e2f04b7b88448620735bffdab2126e`（对我自己数字的更正）。
- `git ls-remote origin refs/heads/qoder/designlab-backup-consistency-20261007` 与
  `git rev-parse HEAD` 在 `fa0b63d9` 推送后逐字符相同；本文提交即是该分支第四个头。
- **main 未推进、未开 PR、未合并**：按边界这三件要分别授权。
- 工作树：本轮聚合门与 `--modules` 绑定跑之后 `git status --short` 均为空。

## 1. 这一轮做完的事

1. **37 个只在本地缓存的 vendor 根落成仓内可审面**。每个 `LOCAL_CACHE_ONLY` 根一份
   `vendor/manifests/<id>.json`：逐文件 `path`/`bytes`/`sha256`，加聚合 `contentDigest`、
   实测到的许可证文件名、来源 URL、`lockFiles`/`lockDiskFiles`，以及**留空**的
   `reviewedBy`/`reviewedAt`/`rightsDecision`。
2. **新门** `design-lab/scripts/verify_vendor_manifests.py`：默认（也是聚合调用的形态）只读仓内
   状态，从 manifest 自己的行重算聚合摘要，与 manifest 声称值和锁记录值双向对齐。`--write`
   只在"walk、`digest_dir`、锁摘要、锁文件数"四者一致时落盘；缓存动过就报 DRIFT 且保持原字节。
3. **注册**进 `verify_design_lab.py` 的 SCRIPTS：**69 → 70 条**（`ast` 直接数 `53802797^` 与
   `53802797` 两个 blob），聚合打印的 `total=` 因此 **70 → 71**（`EXTRA_CHECKS` 有 1 条）。
   我在 `53802797` 的提交信息里把这两个数字都写成"SCRIPTS 70 → 71"，是错的，已在
   `fa0b63d9` 与 `docs/THIRD_PARTY_ISOLATION.md` 里带测量更正。
4. **测试** `design-lab/tests/test_vendor_manifests.py`：34 例 OK（本轮直跑），每个 finding
   各埋一份假记录：缺登记 / 空清单 / 改行哈希 / 锁与清单摘要分叉 / 文件数分叉 / 字节总数分叉 /
   重复路径 / 截断哈希 / 负字节 / 孤儿清单 / 根换类后残留清单 / 异 schema / `id` 错位 / 坏 JSON。
   另钉两件会静默失效的事：行配方必须逐字节复现 `digest_dir`；重生成不得代填权利裁决。
5. **"没有缓存也能审"是测出来的**：`git worktree add --detach
   .project-local/worktrees/vendorhead 53802797` 里根本没有 `.project-local`，门仍
   `VERIFY_VENDOR_MANIFESTS=OK ... findings=0`，测试 34 例 OK，执行路径门
   `VERIFY_EXECUTION_PATH_GATE=PASS files=7 pins-verified`，可达性 4 例 OK。
6. **第一批第 2 项收口**（55a7bbca 的 teardown 修复复验），两份收据见 §2 末两行。

## 2. 当前实测基线（下一轮以此为起点，不是以本文为准）

| 项 | 值 | 来源 |
|---|---|---|
| 聚合门 | `VERIFY_DESIGN_LAB=OK total=71 failed=0`，`PASS verify_vendor_manifests.py` 在第 261 行 | `.project-local/runs/vendor-manifest-round/aggregate.log` |
| vendor 登记门 | `VERIFY_VENDOR_MANIFESTS=OK roots=37 rows=1914 awaiting_owner_review=37 license_files_absent=0 findings=0` | 本轮直跑；同一行也在聚合日志 |
| 登记体积 | 37 份 / 360,201 字节（最大 `baoyu-design.json` 42,129，最小 `vq-design-md-skill.json` 1,475），覆盖 1,914 文件 / 35,104,251 字节（33.48 MiB） | `vendor/manifests/` + `os.walk` 实测 |
| 生成 | `manifests written=37 rows=1914 cache_missing=0 drift=0` | `--write` 输出 |
| 新测试 | 34 例 OK | `design-lab/tests/test_vendor_manifests.py` 直跑 |
| 投影 | `CURRENT_REPORTS=PASS mode=check scope=bound-input-integrity current-git-and-cloud=NOT_VERIFIED`；`definedTestMethodCount` 2696 → **2730**（+34，正是新模块） | `scripts/generate_current_reports.py --check`、`reports/current/PROJECT_STATUS.json` |
| 体积门 | `ASSET_GOVERNANCE=OK`，`working_tree_mib=47.54`（预算 64；本轮从 47.16 起），`pack_mib=242.0`（警告线 220，硬线 256） | `design-lab/scripts/verify_asset_governance.py` |
| 最近一次全套 | `testrun-20261008T144437Z-forward-7328bfad9510`：2687 tests / 1 failure / 0 errors / 45 skipped / subject `c9c6e638` / clean=False / 1318.3s；那 1 例是 `test_gate_reachability.test_every_orphaned_gate_is_exempted_with_a_reason` | `.project-local/task-artifacts/test-run/history.jsonl` + `.project-local/runs/suite-29.log` |
| teardown 复验（旧） | `55a7bbca` 是该 subject 的祖先（`git merge-base --is-ancestor` 为真），全套 `errors=0` 且日志里没有 `boot_reconciliation` 的 FAIL/SKIP 行 | 同上 |
| teardown 复验（新） | `testrun-20261008T204123Z-forward-repeat-e7c4504bc3d0`：11 tests / 0 failures / **0 errors** / 0 skipped / subject `fa0b63d994e2` / clean=True | `.project-local/task-artifacts/test-run/last-run.json` |

## 3. CI 从头到尾没执行过：原因这次是 GitHub 自己写的

- 头 `fa0b63d9` 的 run `37840931479`：11 个 job，**11 个 `steps=0`**，10 个 `failure` + 1 个
  `skipped`，`createdAt 20:38:20Z → updatedAt 20:38:25Z`（5 秒）。前一轮 `2845237c` 的 run
  `37840576985` 形状完全一样。
- 不是作业里哪一步失败——作业从未启动。check-run annotation 原文：
  > The job was not started because recent account payments have failed or your spending limit
  > needs to be increased. Please check the 'Billing & plans' section in your settings
- `gh api repos/DTALEX66/DESIGN-LAB` 给 `"private":true`：私有仓的 GitHub 托管分钟数是计费项，
  所以这句注解与观测一致，是账务条件，不是代码缺陷。**这一条只能 owner 处理**。
- 结论口径：自 `5cbfa641` 起每个头的 run 都是"未执行"，一律**不得**写成 CI 绿。本轮所有判定
  来自本地收据（§2 每条都给了文件）。
- 次生风险，同一份 annotation：
  > The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026.
  `canonical-verify.yml` 被 SHA-pin，我不动它。账务恢复后的第一次真跑可能正撞上镜像迁移，届时
  若有 job 红，先分清是产品字节还是 runner 镜像变了。

## 4. `tool-control`：清单让"拆分"第一次变成可拍板的表

锁的 `notes` 与 taxonomy 的 `rightsNotes` 都说这条聚合项来自"多个上游"，点了
creold/photoshop-scripts、creold/illustrator-scripts、Comfy-Org、style-dictionary 四个名字。
`vendor/manifests/tool-control.json` 的 120 行实测出的是**五个子树**，其中两个才真是上游树：

| 子树 | 文件 | 字节 | 有 LICENSE？ |
|---|---|---|---|
| `scripts/illustrator` | 100 | 3,172,528 | 是（`scripts/illustrator/LICENSE`） |
| `scripts/photoshop` | 12 | 87,594 | 是（`scripts/photoshop/LICENSE`） |
| `scripts/inkscape` | 2 | 23,497 | 否 |
| `scripts/comfyui` | 1 | 28,274（`sdxl_simple_example.json`） | 否 |
| `scripts/style-dictionary` | 1 | 4,178（`basic-config.json`） | 否 |
| `scripts/README.md` + 3 个根文件 | 4 | 40,810 | 否 |

也就是说：锁自述四个来源，字节里有五个子树；taxonomy 写的 `MIT / Apache-2.0 (per subtree)`
只在两个子树上有文件名支撑，另外三个没有任何许可证文件。这条聚合项**不能作为一个单元被审**——
这不是新判断，是清单第一次让人看得见它。拆分动作我没有做：锁自己的
`canonicalUrlAbsentReason.whatWouldCloseIt` 写明"ids 被 capability index 与 quarantine registry
引用，拆分是协同的记录变更，不是改锁"，那是跨三份记录的编辑，属需授权的实现工作。

> 同日更正（2026-10-09 下一回合实测）：本节按"五个子树"计数，是因为只看了 `scripts/` 一层。
> 根上还有两个各自有来源的 SKILL 文件，且该树自带两份来源表（根 `README.md` §二 与
> `scripts/README.md`），逐子树写了 owner/repo、许可与脚本数——合计 **7 个第三方来源 + 2 份
> 本仓自述文档**。锁的 `whatWouldCloseIt` 说 ids 被 capability index 与 quarantine registry 引用，
> 这句没测过：实测含 `tool-control` 的行数为 capability-index **0**、QUARANTINE_REGISTRY **0**，
> 而 SOURCE_REGISTRY 8 行、CANDIDATE-TAXONOMY 3 行、rights-registry 1 行、
> knowledge-role-classification 1 行、锁自身 3 行。逐源归属与校验它的门已落在
> `vendor/manifests/tool-control.json` 的 `origins` 与 `docs/THIRD_PARTY_ISOLATION.md`。

## 5. 本轮没有重跑全套的理由，以及跑了什么

目标明令：全套/聚合/普查仅在有新增证据需求或判定需要时执行。本轮跑了：新门本身（两次形态）、
新测试模块、`test_gate_reachability`(4)、`test_test_selfsufficiency_gate`(13)、
`verify_asset_governance`（staging 后，因为它读索引）、`verify_execution_path_gate`、
`classify_repo --check`、`generate_current_reports --check`、聚合一次（理由：新门从未在聚合里
被观测过，而 CI 不能告诉我，本地聚合日志是唯一能证明"注册生效且 total=71"的收据）、
`--modules test_boot_reconciliation` 一次（理由：把 §2 的 teardown 结论绑到当前头）。
全套（2687 例 / 22 分钟）**没跑**：本轮改动是新增两份文件 + 37 份登记 + 一行注册，
没有任何产品行为变化，而最近一次全套的 1 例红已在可达性门里不复现。

## 6. 下一轮第一批动作（按顺序）

1. `tool-control` 拆分：按 §4 的子树表把一条聚合记录改成五条（两条真上游 + 三个 fixture），
   同步改 `vendor/sources.lock.json`、`research/candidates/CANDIDATE-TAXONOMY.json`、
   `design-lab/research/global-absorption/{SOURCE_REGISTRY,QUARANTINE_REGISTRY}.json` 与
   capability index 里的 id 引用；`reviewedBy` 一律留空。
2. 第一批第 3 项：界面基准对照（Figma/Blender/Illustrator/Linear/Raycast）。可离线做的部分
   先从 `.project-local/cache/vendor/` 里的第三方 CSS/DOM 取样；真宿主画面需要 owner 授权才拉
   （见记忆"Host GUI authorization"），产物落 `docs/audits/` 偏差表。
3. 账务恢复后：把 `fa0b63d9`（或当时 tip）在 CI 上真跑一次，按 job 逐个读结论；在拿到第一条
   真实 CI PASS 之前，任何"已验证头"的说法都要带"CI 未执行"。
4. owner 待裁（不代签，累计）：DESIGN.md 主色 `#316CFF`；2 个 sidecar 签字；3 个 REQUESTED 包；
   投影是否停止嵌 `run_id`；26 条 off-palette `adjudication`；11 个层级命名；
   `.flow-svg`/`.node` 死样式与 `#modal` 无调用点的处置；**新增：37 条 vendor
   `reviewedBy`/`rightsDecision`**；GitHub Actions 账务/额度。

## 7. 下一轮提示词（可直接粘贴）

```
目标：继续 DESIGN-LAB 前后端打磨。本轮只做一件事：把 `tool-control` 这一条多来源聚合记录按实测
子树拆成独立条目，并让三道门与三份记录彼此一致。

事实基线（本轮已实测，照此执行，不要重新判断）：
- HEAD 与远端 tip 相同，见 docs/handoffs/DESIGN-LAB-SESSION-HANDOFF-2026-10-09.md §0。
- CI 自 5cbfa641 起从未执行（11 个 job 全部 steps=0，GitHub annotation 明确写"account payments
  have failed or your spending limit needs to be increased"）。判定只读本地收据，禁止把 CI 说成绿。
- vendor 登记门已注册并绿：VERIFY_VENDOR_MANIFESTS=OK roots=37 rows=1914
  awaiting_owner_review=37 license_files_absent=0 findings=0；聚合 total=71 failed=0。
- tool-control 的实测子树：scripts/illustrator 100 文件 3,172,528 字节（有 LICENSE）、
  scripts/photoshop 12 文件 87,594 字节（有 LICENSE）、scripts/inkscape 2 文件 23,497 字节、
  scripts/comfyui 1 文件 28,274 字节、scripts/style-dictionary 1 文件 4,178 字节、
  scripts/README.md 与 3 个根文件共 4 文件 40,810 字节（六组合计 3,356,881 = 该行 totalBytes）。
  锁自述 4 个来源而字节里有 5 个子树。

要做：
1. 先读 `vendor/sources.lock.json` 里 tool-control 行的 `canonicalUrlAbsentReason.whatWouldCloseIt`
   与 `design-lab/scripts/verify_source_registry.py` 的 `vendor_lock_findings`，确认拆分要同步改
   哪些记录（锁、CANDIDATE-TAXONOMY、SOURCE_REGISTRY、QUARANTINE_REGISTRY、capability index 的 id）。
2. 用一次性脚本（写进 `.project-local/runs/`，不要 `python -c`）把聚合行按子树重记为独立条目，
   每条带 canonicalUrl、逐子树的 `contentDigest`（配方同 `digest_dir`）、实测许可证文件名、
   `reviewedBy` 留空；`tool-control` 原 id 的引用点逐个改列并写明理由，不许留悬空引用。
3. 重新生成 `vendor/manifests/tool-control*.json`，并让 `verify_vendor_manifests.py --check`、
   `verify_source_registry.py`、`classify_repo.py --check`、`generate_current_reports.py --check`
   全绿；新行为若被 pin 了数量，改数字必须写原因，不许删断言。
4. 提交后在 detached worktree 里按提交字节复验上述门，再 push；push 前 `git status` 必须为空。

边界（逐字有效）：授权项目内本地实现/修复/构建与验证；commit/push/PR/merge/发布/远程删除/付费
调用/跨项目读写/操作真实宿主文档按明确授权分别判断；禁止 reset --hard、clean、批量 restore|checkout、
覆盖未知修改、删真实项目；不读打印密钥；不递归扫全量 .project-local|磁盘|Home；E:/F: 无 exact path
不得访问；不改 ACL/提权/全局安装/改 PATH/藏 stderr 让机器协议测试变绿；不改阈值、不删断言、不批量
skip 换绿。owner 裁决项（DESIGN.md 主色、sidecar 签字、REQUESTED 包、投影 run_id、37 条 vendor
reviewedBy）保持挂起不代签。判定只读实测产物（last-run.json、门输出、CI job 结论）。
严禁无理由重复全量审计循环。本轮结束给出下一轮提示词，边界逐字重述，只写实测基线。
```

## 8. 追加（同日下一回合）：投影的"主题"字段有 9 条从未绑到任何提交

找别的东西时撞上的。`scripts/verify_supply_chain.py` 里写的是 `git("rev-parse HEAD")`——
一个 argv 元素，git 直接拒绝，helper 返回空串，于是报告的 `subject_sha` 一直是 `""`。
把 `reports/current/*.json` 与 `design-lab/config/*.json` 全扫一遍：**带 subject 字段的记录 69 条
（按 key 计），其中 9 条为空**，且这 9 条正好与残留的 9 个 `git("... ...")` 调用一一配对
（`git("rev-parse", "HEAD")` 分开传的 60 条都有值）。没有门看过这个字段：一个"不指向任何东西"
的出处字段和一个"还没填"的字段长得一模一样，而 `deepseek_final_closeout.py` 与账本里的
`#<check>` 证据指针都在把它们当作绑定过的记录引用。

本回合做的：
- 修掉我这一片里三道门的调用（`verify_supply_chain.py` / `verify_evidence_levels.py` /
  `verify_no_overclaim.py`），重新生成它们的报告：三份现在都写 `db6c146d6784c…`。
- **第二个缺陷同批修掉**：`test_claim_honesty_gates.py` 用裸模式调这三道门，而裸模式就是**写模式**，
  所以每跑一次全套就重写三份被跟踪的报告——投影"每次跑都不干净"这句话，至少这三份的原因是测试
  当了写手，不是 run_id 嵌进投影。现在测试改调 `--check`（比对存储记录与当场重算，且不写盘），
  并加两条断言：跑完门之后 `git status --porcelain` 对这三个路径必须为空；三份的 `subject_sha`
  必须是 40 位十六进制。`verify_no_overclaim.py --check` 原先只印一个词、不报数（等于无法区分
  "过了"和"什么都没看"），现在两种模式印同一行测量值；比较的内容没放宽。
- 新门 `design-lab/scripts/verify_report_subject_binding.py`（注册进聚合，SCRIPTS 70 → 71）：
  逐条给 `subject_sha`/`subjectSha` 定级，允许为空**当且仅当**它在
  `design-lab/config/report-subject-debt.json` 里有行（写它的脚本 + 理由 + 声明日期）；
  已绑定的记录若仍留在册上就是红（册子只能因修好而缩短）；并且用 **AST 拒绝调用形状本身**——
  任何 `git("… …")` 单串参数直接红，未声明的第十个没处藏。当前实测
  `VERIFY_REPORT_SUBJECT_BINDING=OK records=69 bound=60 declared_unbound=9 joined_call_sites=9 findings=0`。
- 测试 `design-lab/tests/test_report_subject_binding.py` 26 例 OK，每条 finding 各埋一份假记录；
  其中两条抓到了我自己写门时的两个真缺陷：注册表被读两遍导致同一问题报两遍，
  以及"在册但记录已不存在"那条断言当时**永远不会触发**（只在遍历已扫描记录时检查，方向反了）。

写剩的 9 条债（在册，逐条可执行）：`CLEAN-TREE-REPORT` / `CONTRACT-GRAPH` / `FOUNDATION-AUDIT` /
`LANGUAGE-BOUNDARY-SCAN` / `POST-CLEANUP-AUDIT` / `RECOVERY-SAFETY` / `REPOSITORY-SIZE` /
`SPILL-CENSUS` 的 `subject_sha`，以及 `design-lab/config/rights-registry.json` 的同名字段；
生产脚本逐条写在册子里。**为什么这回合不一次修完**：修完要各自重算记录，而
`DEEPSEEK-*` 几份被 DeepSeek 血统链与 `generate_rights_registry.py` 的派生链消费，
重算前必须先确认谁在摘要它们——那是又一次跨记录协同变更，按同一套纪律单独做。

### 8.1 同日更正与推进（同回合内实测，不改上文原句）

上文把剩下的 9 条债写成"逐条可执行"。这条判断被下一回合的实测否证了一半，现按测到的写：

- 九条调用形状**已全部修好**（`git("rev-parse", "HEAD")`），门的 AST 扫描现在
  `joined_call_sites=0`，所以 `callSites` 数组清空。修的是源码，**没有重跑任何一条记录**，
  九份记录字节不变。
- 为什么不能机械重跑：逐条去 `reports/current/DEEPSEEK-AUTHORITY-LEDGER-2026-09-14.json` 里查
  引用者，**九份全被账本任务引用，且那些任务状态都是 DONE**——
  CLEAN-TREE-REPORT←DLDS-I020、CONTRACT-GRAPH←DLDS-F000、FOUNDATION-AUDIT←DLDS-F020、
  LANGUAGE-BOUNDARY-SCAN←DLDS-C020+DLDS-C050、POST-CLEANUP-AUDIT←DLDS-D030+DLDS-E050+DLDS-K030、
  RECOVERY-SAFETY←DLDS-I000+DLDS-I010、REPOSITORY-SIZE←DLDS-D000、SPILL-CENSUS←DLDS-E000、
  rights-registry←DLDS-G020。重跑生成器会整条重写记录（不只 subject），于是 DONE 判决所依据的
  证据被悄悄换底——那不是修缺陷，是改历史。所以这 9 条从"可执行"降级为"需一次有意识的再基线决定"。
- 门的册子因此加了两个必须互相一致的字段（`RECORD-PRODUCER-STILL-BROKEN` /
  `RECORD-DEFECT-STILL-CLAIMED`）：`producerFixedOn` 说清生产脚本的缺陷修在哪天，
  `whatWouldCloseIt` 说清闭合需要动谁的证据；缺任一项即 `REPORT-DEBT-ROW-INCOMPLETE`。
  顺带纠正我自己的一个读数错误：账本任务数组**没有 `id` 字段**（标识是 `task_key`/`full_id`），
  所以我先用数组下标当任务号打印了一遍——那些数字对读者毫无意义，现已按 `task_key`+状态记录，
  并由测试用 `^DLDS-[A-Z]\d{3}$` 钉住。
- 实测：`VERIFY_REPORT_SUBJECT_BINDING=OK records=69 bound=60 declared_unbound=9
  joined_call_sites=0 findings=0`；`test_report_subject_binding.py` 33 例 OK（新增两条闭合规则与
  四条仓内状态断言，含"全仓不再有 joined git 调用"与"每条在册记录的生成脚本都含修好的调用"）。

## 9. 新量到的一条：投影在干净检出上必然漂移，原因不是工作流写的那个

`.github/workflows/canonical-verify.yml` 第 49-52 行的注释说，
`generate_current_reports.py --check` 在干净检出上"永远不可能通过"，理由写的是
"投影绑的是生成时的 git 快照"。这句话在同一个头（`69496617`）上被实测否证了原因部分：

- 主树里刚生成完跑 `--check`：`CURRENT_REPORTS=PASS`。
- 同一个头、同一个提交，detached worktree（完全没有 `.project-local`）跑 `--check`：
  `CURRENT_REPORTS=DRIFT` 覆盖 9 个文件。逐项对字节重算后，差异字段只有两类，**都不是 git 快照**：
  1. `testRunId` / `testRunAt` / `testRunResult` / `testRunMeaning`——投影去读了
     `.project-local/task-artifacts/test-run/last-run.json`（被 ignore 的运行时文件）。
     干净机器上它是 `null` +"no bound test run"，主树里是
     `testrun-20261008T204123Z-forward-repeat-e7c4504bc3d0` + `OK`。受影响：
     `PROJECT_STATUS.json`、`PROJECT_STATUS.md`、`CLOUD_BASELINE.json`、
     `ADAPTER_EVIDENCE_RECONCILIATION.json`、`KNOWLEDGE_INVENTORY.json`（`--check` 报的 9 个里这几份就是这个原因）。
  2. `TASK_PROGRESS.json` 里往 reasons 数组里追加
     `RUNTIME_ARTIFACT_ABSENT_ON_THIS_MACHINE:.project-local/task-artifacts/project-survey-2026-09-27/PROJECT-SURVEY-2026-09-27.md`
     ——把"这台机器缺这个运行时件"写进被跟踪的记录，而且实测出现两次（同一份缺件被逐条 reason 各追加一遍）。

两个后果都值得单独定夺，不是我该顺手改的：
- 一条 tracked 投影里带着只有生成机才能证明的测试结果；换台机器它就换成 `null`，
  也就是说"投影声称的测试绑定"是机器相关的，而账本与 `PROJECT_STATUS.md` 都在把它当事实展示。
- 缺件信息被写进 tracked 记录，等于让每台机器的磁盘状态参与投影内容——这正是
  "CI 发现的门必须从仓库回答存在性，不能从本地磁盘回答"那条规则针对的形状，只是发生在投影侧。

工作流文件被 SHA-256 pin，我不动它；这里只把测到的差异写成可核对的字段名。
下一步决定（owner 项，已在册）：投影是否停止嵌 `testRunId` 与本机缺件；若停止，
`--check` 就能作为干净检出上的真门接进 CI，那句注释也就有了可以被验证的版本。

## 10. 追加（同日第三回合）：三条机器依赖的 `--check` 全部改成从 tracked 状态回答，登记表清零

任务表 #21。三个提交，逐条独立可回退：

- `363ba17c` `fix(gates): read the destructive-operation receipts from versioned bytes`
- `db76cc41` `fix(gates): judge the critical-set record from the repository, not from this machine's runs`
- `c9b0be1f` `fix(gates): judge the spill census by its rules, and report its bytes`

细节与全部实测数字在 `docs/audits/DESIGNLAB-WRITER-GATE-INVOCATION-AUDIT-2026-10-09.md` §8（含那张
"比的字段 / 本机值 / 干净检出重算值 / 输入性质 / 新判据 / 机器态词表"六列表）。这里只留结论：

1. `RECOVERY-SAFETY` 的破坏性操作回执原本只活在 `.project-local/`，已逐字节归档到
   `reports/history/destructive-receipts-2026-09-13/`（3 份，73203 / 3162 / 55071 B，与原件 sha256 一致，
   本来就是 LF，所以 `.gitattributes` 一个字没改）。门现在从归档字节判，`--check` 也从"只比 verdict
   一个字段"变成比整份判断。
2. `DEEPSEEK-FINAL-TEST-GATE` 的运行不可从仓库重放（执行是权威链的事），改后判 16 个模块是否为版本化
   测试文件、记录自己的数字是否支持自己的结论、DEFERRED 是否还诚实。顺带量到
   `executed_scope.tests_per_order` 是手写的 220，而它引用的那三条运行各自记 **225**（复跑 450=225×2），
   这个数字从没被读过；现在派生并被比对，散文按"描述当前事实"与"描述 2026-09-14 那次运行"分别更正。
3. `SPILL-CENSUS` 记录**故意没重写**（规则读的字段现存记录都带），只把检查换成规则+算术+git 前提+隐私
   声明，因此它的 `subject_sha` 仍为空、仍在债务表里——这条没有推进 #18/#20。
4. `verify_projection_freshness.py`：`records=14 verified=14 excluded=0 findings=0`，本机与干净检出
   （`c9b0be1f`，无 `.project-local`）逐字相同，porcelain 前后 0。EXCLUDED 保留为空 dict，机制由
   一条"埋一条假豁免必须以 NOTICE 出现且不算 finding"的测试继续覆盖。
5. 新测试 53 条（15 + 16 + 22），每条守卫都有埋缺陷分支；机器无关性用"把走盘函数换成 raise，判断必须
   照旧出干净"来证明。
6. 本轮结束时：`AUTHORITY_GATES=PASS gates=6 failed=none`、`VERIFY_DESIGN_LAB=OK total=73 failed=0`、
   `VERIFY_REPORT_SUBJECT_BINDING=OK records=69 bound=61 declared_unbound=8 joined_call_sites=0
   findings=0`、`NO_OVERCLAIM=PASS claims=8 supported=4 qualified=4 unsupported=0`（重跑后计数一字未动，
   两份被重绑的记录没有引入新主张）。

### 10.1 有两条我**没有**顺手做掉的事，理由实测

- 普查型投影（`LANGUAGE-INVENTORY` / `REPO-CLASSIFICATION`）的 `tracked_files_total` 一类描述性数字，
  在本轮新增 5 个 tracked 文件后没有重绑。不重绑的理由：记录里记的字段（本机实测
  `tracked_files_total=1907`，`git ls-files` 今天 3422）本来就声明为快照，而我这轮重写的
  `--check` 明确只判自相矛盾、把树移动写成 NOTICE；把它们重绑要逐个重写 `subject_sha`，那正是 §9/#20
  还等 owner 定的问题。要重绑请在同一个决定里做。
- `RECOVERY-SAFETY.json` 的重绑是**被迫**的（形状变了，不重绑则 `--check` 必然红），因此它的债务行按
  "债已闭合"规则必须删。登记 `thisRound.rebasedOn` 写清了：在哪个 head 跑的、为什么必须跑、以及
  "绑定运行记的是运行结束时的 HEAD"这个问题并未因此被决定。#18 的可选项从 9 个变 8 个。

### 10.2 另请 owner 看一眼的一条（我没动）

`reports/current/SPILL-CENSUS.json` 的 `agent_homes.*.path` 记的是本机 agent home 的绝对路径（含用户名），
`design_lab_owned[]` 记条目名；这些已提交并推送过，现在改不能收回既成事实。是否把这类字段脱敏成
`~/.codex` 形式、或整段移出 tracked 投影，请定。

## 11. 下一轮提示词（可直接粘贴；§7 的那份已被本节取代）

> 目标不变：持续推进 DESIGN-LAB 前后端打磨，每轮从已入账缺陷/账本 PARTIAL 余量里挑具体项做掉并验证；
> 严禁无理由重复全量审计（全套、聚合门、重跑普查只在有新证据需求或判定需要时跑，并写明理由）；
> 判定只读实测产物（`last-run.json`、门输出、CI job 结论）；owner 裁决项（DESIGN.md 主色、sidecar 签字、
> REQUESTED 包、投影 `testRunId`/`subject_sha` 重绑策略、`agent_homes.*.path` 脱敏）保持挂起不代签。
>
> 边界（逐字沿用）：授权项目内本地实现/修复/构建与验证；commit/push/PR/merge/发布/远程删除/付费调用/
> 跨项目读写/操作真实宿主文档按明确授权分别判断；禁止 reset --hard、clean、批量 restore|checkout、
> 覆盖未知修改、删真实项目；不读打印密钥；不递归扫全量 `.project-local`|磁盘|Home；E:/F: 无 exact path
> 不得访问；不改 ACL/提权/全局安装/改 PATH/藏 stderr 让机器协议测试变绿；不改阈值、不删断言、不批量 skip 换绿。
>
> 起点（实测于 `c9b0be1f`，本机与干净检出一致）：`VERIFY_PROJECTION_FRESHNESS=OK records=14 verified=14
> excluded=0 findings=0`；`AUTHORITY_GATES=PASS gates=6`；`VERIFY_DESIGN_LAB=OK total=73 failed=0`；
> `VERIFY_REPORT_SUBJECT_BINDING=OK records=69 bound=61 declared_unbound=8`；
> `NO_OVERCLAIM=PASS claims=8 supported=4 qualified=4 unsupported=0`；CI 仍从未执行（11 个 job 全
> `steps=0`，GitHub Actions 计费是 owner 侧开关）。
>
> 第一批（按顺序）：
> 1. 把 §8 的三条修复接到 CI 可见面：确认 `canonical-verify.yml` 的每一步实际会跑到
>    `verify_projection_freshness.py`（它在聚合门里），并从 workflow 逐行列出"哪些 `--check` 门在 CI
>    里根本没有步骤"——被 SHA pin 的工作流我不能改，所以产出一份"需要 owner 批准加的行"清单，
>    每行附它守的断言与一条能在本地证明它会红的埋缺陷。
> 2. `#20` 的证据补齐但不代签：逐份列出仍嵌 `testRunId` / `RUNTIME_ARTIFACT_ABSENT_ON_THIS_MACHINE`
>    的 tracked 投影，给出"删字段"与"保留但在 `--check` 里声明为机器态"两个方案各自的实测影响面
>    （哪些门、哪些测试、哪条 ledger 引用会变）。
> 3. 继续做已入账缺陷：`tool-control` 之外的 6 条 `ABSENT_FROM_GIT` lock 行仍指向被 `c9cde8a5` 删掉的树；
>    先测"现在还有没有可用的上游来源"，把可判的写成门，不可判的按现有格式登记理由。
> 4. 界面基准那条（首批第 3 项）在没有 owner 的 GUI/联网授权前不再重跑：只把已实测到的"离线材料不足"
>    （6 个缓存根里 markup/style/tsx 共 83 个非 jsx 文件：css 11 / html 25 / tsx 21 / jsx 119 / svg 26）
>    维持在册，不造表。
>
> 收尾：`git status --porcelain` 必须 0；提交只带本轮实际改的文件；push 后必须用 `git ls-remote`
> 证明双端一致（不看本地 tracking ref）。每一轮结束给出下一轮提示词。

## 12. 追加（同日第四回合）：任务表 #22 —— "只读形态"在 CI 里到底被不被跑，实测完并接了门

两个提交：`af8f1b9e`（hermes 拆分 + receipts 表 + 形态可达性守卫）、`51c23f90`（审计文档）。
细节与全部实测数在 `docs/audits/DESIGNLAB-READONLY-MODE-CI-SURFACE-2026-10-09.md`。

1. `deepseek_hermes_migration.py --verify` 在两棵树里都 FAIL 且没人调用。实测它的主张一半真一半过期：
   109 个归档对象里 108 个还在且 digest 未变、原源无残留；缺的那一个
   （`runtime/dl-ad-pkg-ci`，253.3 MB / 5559 文件）是**被 tracked 记录删掉的**
   （`prune-manifest-2026-09-26.json` 的 `phase2.removed[0]` + closeout ledger §C，两处都写明它是 CI
   可再生产物、都有日期）。现在它从 tracked 副本读 manifest，两份版本记录互相对账：缺的对象必须被 prune
   记录点名，prune 点名的对象必须有对应迁移记录，本机是否还持有归档只报不判。埋点证明：归档目录存在但被清空
   → 打印 108 条 `missing target`，而已被记录的那一条不计入。
2. `verify_projection_freshness.py` 增加第二张表 `RECEIPT_CHECKS`（4 条：hermes `--verify`、
   `verify_vendor_manifests.py --check` 显式命名、`design_debt_baseline.py --check`、
   `inert_contract_survey.py --check`）。verdict 行两棵树逐字一致：
   `VERIFY_PROJECTION_FRESHNESS=OK records=14 verified=18 receipts=4 excluded=0 findings=0`，porcelain 0；
   整门 27 s，4 条 receipts 实测 123 ms / 135 ms / ≈0 s / ≈1 s。
3. `test_gate_reachability.py` 新增 `ReadOnlyModeTests`：**声明**只读形态的脚本，该形态必须被调用，否则必须
   在册并写明实测判定。实测计数：30 个脚本声明 → 21 个的形态确被调用 → 10 个在册，每条附今天的输出与关闭
   条件（含 `build_candidate_taxonomy.py --check` rc=2：parser 强制 `--observation`，形态根本调不动；
   `generate_current_reports.py --check` 本机 DRIFT 3 份、干净检出 9 份；`verify_zero_spill.py --self-test`
   因自检驱动前者而继承同一份红）。三个方向已证伪：删真行 → 红；给没有该形态的脚本加一行 → 红；已调用还留在
   册 → 红；不动 → 绿。
4. 两个我自己的仪器缺陷写进审计文档而不是悄悄改掉：判定第一版"名字与 flag 在三行内共现"匹配到了豁免表自己的
   散文，8 条在册记录被误判为"已调用"（现在四张表按 Python 对象解析，并有一条埋点断言"散文提及不得算调用"）；
   helper 取名 `test_module_calls`，被 unittest 当用例收集而报缺参数的 TypeError。

**需要 owner 拍板的两句话**（我不能动被 SHA-256 pin 的工作流）：是否给 `verify_projection_freshness.py`
单独一个命名步骤（成本 27 s 内、以及它会与聚合门重复跑一次，见审计 §4）；工作流注释里那句 "executes the
220-test critical set" 现在实测是 **225**，注释不在任何门里，只有 owner 改得动。

## 13. 下一轮提示词（可直接粘贴；§11 那份已被本节取代）

> 目标不变：持续推进 DESIGN-LAB 前后端打磨，每轮从已入账缺陷/账本 PARTIAL 余量里挑具体项做掉并验证；
> 严禁无理由重复全量审计（全套、聚合门、重跑普查只在有新证据需求或判定需要时跑，并写明理由）；
> 判定只读实测产物（`last-run.json`、门输出、CI job 结论）；owner 裁决项（DESIGN.md 主色、sidecar 签字、
> REQUESTED 包、投影 `testRunId`/空 `subject_sha` 的重绑策略、`agent_homes.*.path` 脱敏、是否为 freshness
> 门单独加 CI 步骤）保持挂起不代签。
> 边界（逐字沿用）：授权项目内本地实现/修复/构建与验证；commit/push/PR/merge/发布/远程删除/付费调用/
> 跨项目读写/操作真实宿主文档按明确授权分别判断；禁止 reset --hard、clean、批量 restore|checkout、
> 覆盖未知修改、删真实项目；不读打印密钥；不递归扫全量 `.project-local`|磁盘|Home；E:/F: 无 exact path
> 不得访问；不改 ACL/提权/全局安装/改 PATH/藏 stderr 让机器协议测试变绿；不改阈值、不删断言、不批量 skip 换绿。
> 起点（实测于 `51c23f90`，本机与干净检出逐字相同，porcelain 0）：`VERIFY_PROJECTION_FRESHNESS=OK
> records=14 verified=18 receipts=4 excluded=0 findings=0`；`MIGRATION_VERIFY=PASS objects=109
> recorded_removals=1`；`AUTHORITY_GATES=PASS gates=6 failed=none`；`VERIFY_DESIGN_LAB=OK total=73 failed=0`；
> `VERIFY_REPORT_SUBJECT_BINDING=OK records=69 bound=61 declared_unbound=8`；CI 仍从未执行（11 个 job 全
> `steps=0`）。
> 第一批（按顺序，全部是已在册缺陷，不做新普查）：
> 1. 把 `deepseek_content_audit.py --check` 从在册转为强制：用它自己的 writer 重发它点名的两份派生审计
>    （`THIRD-PARTY-SOURCE-AUDIT.json`、`DUPLICATE-CONTENT-AUDIT.json`）。重发前先测会不会动 `subject_sha`
>    与 ledger 引用；若触及 owner 未决的重绑策略，就留在册并写明测到的差异，不代签。
> 2. 诊断 `deepseek_directory_audit.py --check` 与 `deepseek_final_closeout.py --check` 各自为什么 FAIL：
>    只读实测到字段级；判据过期就按 §8/§10 的"判据来自 tracked 状态 + 机器事实只报不判"重写，记录真相就接进
>    `RECEIPT_CHECKS` 并从在册删行；一条修不完就留在册，别做半成品。
> 3. 修 `build_candidate_taxonomy.py --check` 的形态：给 `--observation` 一个 tracked 默认值（并写明这份观测
>    的来源与日期），或撤掉该 flag；两条路都必须让"声明的只读形态真的可调"成为可测事实，而不是留在册里当注释。
> 4. 首批第 3 项（界面基准）在没有 owner 的 GUI/联网授权前继续不重跑，只维持"离线材料不足"的实测记录
>    （6 个缓存根里 css 11 / html 25 / tsx 21 / jsx 119 / svg 26），不造表。
> 收尾：`git status --porcelain` 必须 0；提交只带本轮实际改的文件；push 后用 `git ls-remote` 证明双端一致
> （不看本地 tracking ref）。每一轮结束给出下一轮提示词。


