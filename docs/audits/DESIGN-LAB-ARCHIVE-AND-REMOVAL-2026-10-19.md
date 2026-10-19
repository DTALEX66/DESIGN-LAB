# 归档与删除波次交付记录（2026-10-19）

- **taskId / 血统**：owner 2026-10-19 两条指令的执行记录；权威包仍为
  `docs/taskpacks/DESIGN-LAB-DIRECTION-ALIGNMENT-2026-10-19.md`（`DL-TP-20261019-DIRECTION-R1`）。
- **本文件取代的读数**：`docs/audits/DESIGN-LAB-DIRECTION-ALIGNMENT-2026-10-19.md` §7/§8 的闸门数字。
  那份是方向批次的 dated 记录，按 `reports/README.md` 的规则**不改写**；本文件是同一条指令链后续波次的
  dated 记录。当前真值仍以 `design-lab/config/capability-evidence-index.json`、
  `design-lab/config/capability-status.json` 与 `git rev-parse HEAD` 实读为准。

## 0. 结论与状态声明（先看这一节）

- **结论：`PARTIAL`**。本波次声明范围内的动作已落地：40 组 / 228 文件整目录移动（逐条按 blob
  SHA-1 与字节数复核，`bytesRewritten=0`）、83 份旧交接/提示词的"先汇总再移除"、被这些路径绑定的
  读侧消费者全部改指新位、六份权威钉值重钉并逐次记录理由（`AUTHORITY-PIN-CHANGE.json` 实测 7 条 revisions；2026-10-19 占 5 条：方向批次、归档波、删除波、手机端移出范围、AAOS 改为非依赖）、投影再生成。
- **不写 `PASS` 的理由**：其一，已推送 tip 的云端判定**实测为红**——`main` 上 `c71e3d21` 的 run 39287724318
  共 11 个 job，其中 `Python gate` 失败（`shard 3/3 tests=975 FAIL=1`，CI 只发布计数不发布测试名）；同一 SHA 在
  开发分支上的 run 39287715573 是 light gate（11 个 job `skipped`），那句"success"只描述编译与身份边界，
  不是 CI 通过。红因定位见 §5 末。其二，owner 门外的边界（release / 安装态分发 / 真实宿主 E3 / 真人 E4 /
  AAOS 接收 / ComfyUI·H3）依旧不解锁；**手机端不在这一列**——它已由 owner 2026-10-19 定为排除项，不是待授权项。
- **状态声明（`ACCEPTANCE.md` 第 10 项：六件事是不同状态）**：
  - 文档修订＝本波次这一份报告与五份登记件已完成；
  - 规划完成＝方向包 `DL-TP-20261019-DIRECTION-R1` 已闭环，`currentExecution` 34 项仍全部
    `FROZEN_DEFERRED`，解冻需要 owner 明确授权；
  - 代码实现＝归档/删除波本身不新增产品功能，改动只在登记、读侧路径解析与闸门；**同一条指令链后续两次提交确实加了可调用面**：`AssetAnalysis.derive` 的两条生产入口（CLI `design-lab analyze` 与 `POST …/assets/<img-ID>/analysis`）、`contract-bindings` 一行、以及侧栏边界修复与它的新闸门读数。这不解锁 `currentExecution` 34 项，也不构成新任务派工；
  - 真实运行＝**宿主侧未执行**（无真实宿主 E3）。已执行的是回路内受控运行：三条 live 测试真起 loopback 服务、真读资产字节、真拿回 RIR 并过 `validate_rir`；这是 E2 口径，不是 E3；
  - 人工验收＝未执行，且本文件不含任何人工签核，被删文档的"结论"字段是文档自己写的内容摘要，
    不等于有人接受过；
  - AAOS 接收＝未执行。
- **§5 的表**是同一轮实测的定向闸门读数，不是当前状态；复现请按 §2 的命令自读。

## 1. Owner 原话与本轮边界

1. 「任何旧的过时的冗余的陈旧的，不要再明面上，全部归档到该去汇总的地方，包括仓库目录文件夹整体搬走，
   要么压缩归档到历史里……按照规范化处理，防止再次索引路径到旧资料上」
2. 「旧交接和一些提示词的资料 汇总到一起归档后 就删除了吧」，追问后明确为
   「旧的都删除，但是要先审计后归档到一起形成汇总和追溯，并且有新的更新和替代」

本轮只动文档、登记与闸门；**未**执行 release、安装态分发、真实宿主 E3、真人 E4、手机端、AAOS 联调、
ComfyUI/H3（仍 `FROZEN_DEFERRED`，解冻需 owner 明确授权）；E 盘与私有数据边界不变；
账本 `tasks`/`evidence`/`source`/`taskpack`/`plan_path` 身份字段字节未改。

## 2. 基线怎么读（不抄本文件的数字）

```bash
git rev-parse HEAD
git ls-files | wc -l
python scripts/generate_current_reports.py --check   # PASS / STALE / DRIFT 三种读法不同
python scripts/verify_top_level_authority.py
```

本文出现的 SHA 只用于指认"当时测的那一次"，不是当前基线。

## 3. 做了什么（全部为实测数字）

| 动作 | 数量 | 证据 |
| --- | --- | --- |
| 移动归档 | 228 个跟踪文件 / 8,416,910 字节，40 组 | `docs/history/archive-2026-10-19/MANIFEST.json`；逐文件 `原路径→新路径→blob→字节`，移动前记录、移动后从 index 复验。当前读数为 **155 条仍在树上的行逐条复验一致＋73 条标 `status=REMOVED` 带 `restoreAt`**，改写字节 0；清单不再把已删行算作"从工作区可复验" |
| 汇总（删除前置） | 106 条登记（85 交接 + 6 提示词面 + 15 reports 面） | `HANDOFF-PROMPT-DIGEST.json` + `AGGREGATED-RECORD-2026-10-19.md`：每份的标题、自述、结论、取代关系、只有它记载的事实 |
| 删除 | 83 个文件 / 713,606 字节 | `REMOVALS.json`：blob sha1 + sha256 + crc32 + 字节 + `restoreAt`；每条由构建脚本用 `git show <restoreAt>:<path>` 实测后才登记 |
| 明面收敛 | `docs/` 下 0 个 `handoffs/plans/research/superpowers` 目录；`docs/taskpacks/` 14 个跟踪文件 | `git ls-files` 实读 |
| 投影再生 | 跟踪文件 3,806 → **3,724**；工作区 69.68 MiB；pack 241.69 MiB（>224 WARN，<256 硬预算） | `reports/current/REPO-CLASSIFICATION.json` 等；九类之和 = 3724 = 跟踪文件数 |
| 重钉 | AUTHORITY.md / authority-index.json / HISTORY-FREEZE-RULES.md 本轮两次改字节两次重钉 | `docs/history/taskpacks/20261009-adoption/AUTHORITY-PIN-CHANGE.json` `revisions[-2..-1]` |

**故意不删**（删了是销毁输入或拆散 bundle，不是清理陈旧料）：
`handoffs/deepseek-r3-20260906/` 17 件 owner 随包提供的 R3 审计输入原件；
`next-agent-prompts/PROMPT-LINEAGE.json`（血统登记表）；按日期 bundle 目录内的交接成员；
authority-index 与账本仍点名的四份包体。

## 4. 防"再次索引旧路径"的机制

- 指引面（`AGENTS.md` / `README.md` / `AUTHORITY.md` / `docs/current/NEXT-AGENT-PROMPT.md`）
  不再出现任何已删文件的路径字面量；由 `verify_task_document_states.py:guidance-paths-resolve`
  与 `scripts/verify_path_refs.py` 双向看守。
- 允许继续点名旧路径的只有四类，且各有理由：被哈希钉死的账本证据行（字节不可改）、由这些行派生的投影索引、
  `authority-index.json` 的 `formerly` 标签、DeepSeek 链脚本里经 `archive_records.read_record()` 解析的
  stop-line 常量，以及 presence 测试里对 recovered 集合的精确 pin。
- 需要原件内容时不手写解析：`scripts/archive_records.py` 按 工作区 → 归档移动 → `REMOVALS.json`
  的 `restoreAt` 三层取字节并回写来源，三层都不到即 `RecordUnavailable`。

## 5. 命令、退出码与读数（本会话实测，均为定向闸口）

| 命令 | 退出码 | 读数 |
| --- | --- | --- |
| `python scripts/verify_path_refs.py` | 0 | `PATH_REF_GATE=PASS checks=10 failed=[]` |
| `python design-lab/scripts/verify_task_document_states.py` | 0 | `TASK_DOC_STATE_GATE=PASS checks=13 failed=none` |
| `python scripts/verify_top_level_authority.py` | 0 | `TOP_AUTHORITY_GATE=PASS checks=10 failed=none` |
| `python scripts/verify_authority_gates.py --zero-spill` | 0 | `AUTHORITY_GATES=PASS gates=7 failed=none` |
| `python scripts/record_import_verify.py --head` | 0 | `RECORD_VERIFY=OK blobs=HEAD`（rows=492，movedTo=3，evolved=9） |
| `python design-lab/scripts/verify_evidence_artifact_presence.py` | 0 | `WARN tracked_broken=0 tracked_drifted=60 recovered=4 relocated=0` |
| `python design-lab/scripts/verify_design_lab.py` | 0 | `VERIFY_DESIGN_LAB=OK total=76 failed=0` |
| `python scripts/run_structure_contracts.py` | 0 | `STRUCTURE_CONTRACTS=PASS tests=31 failures=0 errors=0` |
| `python design-lab/scripts/verify_task_ledger_contract.py` | 0 | `TASK_LEDGER_CONTRACT=OK` |
| `python design-lab/scripts/verify_library_index_consistency.py` | 0 | `PASS shared_inputs=4 shared_roots=2 assets=24` |
| `python design-lab/scripts/update_evidence_binding.py --check` | 0 | `UPDATE_EVIDENCE_BINDING=HISTORICAL_VALID`（非产品通过声明） |
| `python scripts/verify_clean_tree.py` | 0 | `CLEAN_TREE=CLEAN dirty=0 unattributed=0` |
| `python scripts/generate_current_reports.py --check` | 0 | `CURRENT_REPORTS=STALE`（绑定输入未变、HEAD 已前移；不等于产品通过） |
| `python packages/.../check_anti_slop.py design-lab/ --skip-prefixes …`（与 CI 同参） | 0 | `JURY_DETERMINISTIC=OK (human review still required)` |
| `python -m compileall -q design-lab/scripts` | 0 | — |
| `python scripts/verify_archive_record_register.py` | 0 | `RECORD_REGISTER_GATE=PASS`（把登记节反向解析回 git blob 逐条重算：5 行表格 + 5 条完整摘要 + 登记节点名的路径式 token 全部可解析）；**已接入 CI**——`.github/workflows/canonical-verify.yml` 的 `top-authority-gate` 作业第 5 步，`STRUCTURE_CONTRACTS=PASS tests=31` 的可达性合同就是要求它被点名，否则等于交付一个从来不会跑的闸 |
| `python scripts/generate_archive_record_register.py` | 0 | `records=5 ...`（重建登记节；小节清单与计数直接从报告正文读，不再手写，杜绝登记与报告脱节） |
| 三层取回探针（`scripts/archive_records.py:read_record`，样本取自两份记录自身：live / 移动前 / 移动后 / 已删首行 / 已删末行） | 0 | `checked=5 failures=0 removed_rows=83 move_rows=228`，其中 `reports/history/V4_HANDOFF_SUMMARY_20260807.md` 走 `removed-at:<sha>` 层取回 2,327 B |

| 定向 pytest（本会话逐次实跑，未跑全库分片） | 最终 0 | `test_record_import_fidelity + test_current_reporting + test_ledger_schema` → `1 failed, 86 passed`（修好后 fidelity 单独 `4 passed`）；`presence + readback` → `21 passed`；`subject-binding + gate-reachability` → `42 passed`；受影响模块全集 → `2 failed, 143 passed, 24 subtests`（两处失败见 §6.5，修后该模块 `5 passed`） |

### 5.1 后续两批（分析入口 + 侧栏边界）的实测读数

| 命令 | 退出码 | 读数 |
| --- | --- | --- |
| CI `main` run @ `c71e3d21`（全库分片） | 1 | `PYTHON_TESTS_SHARDS_START shards=3 expected_tests=3067`；shard1 `tests=1062 exit=0`、shard2 `tests=1030 exit=0`、shard3 `tests=975 FAIL=1`。CI 只发布计数不发布测试名，所以红因靠本地复现定位（见下） |
| `pytest design-lab/tests/test_contract_bindings.py` | 0 → 修前 1 | 修前 `AssertionError: 93 != 92 : one verdict line, one note per contract row, one per route row`（`test_verdict_line_is_what_the_aggregate_matches`）；把钉住的派工路由清单 59→60 并写明因由后 `35 passed`。账本实读 `route rows = 60`，与闸口自报 `routes=60 dispatched=60` 同向 |
| `pytest design-lab/tests/test_current_reporting.py design-lab/tests/test_projection_freshness.py` | 0 | `68 passed, 13 subtests passed in 237.24s` |
| `pytest design-lab/tests/test_asset_analysis.py` | 0 | `9 passed`（6 单元 + 3 条真起 loopback 服务的 HTTP 实跑） |
| `python design-lab/scripts/verify_browser_e2e_ran.py`（`E2E_REQUIRED=1`） | 0 | `BROWSER_E2E ran=9 skipped=0 failed=0`，六个模块逐个 `skipped=0`。**注意次序**：先在未提交的 bundle 上跑，`test_workbench_ui_audit_gate` 拒绝测量并报 `AUDIT_BLOCKED: apps/workbench/build differs from HEAD`——这是设计如此，提交后再跑才允许出数 |
| `python design-lab/tests/e2e/audit_workbench_overflow.mjs`（经 overflow 门） | 2 → 0 | 修前 `OV_NAV_EDGE_TIGHT 1440px/1280px/1920px: footer hairline 0px under the nav cut line, a group label is half-cut on it`；修后 `OV_OK`，证据 JSON 记 `gap=12 overflow=499 straddling=["nav-group"]` |
| `python scripts/design_debt_baseline.py --check` | 0 | `DESIGN_DEBT_BASELINE=PASS`；`literal_px=534` 在侧栏修复前后同值（新增的是 token 边距，不是字面量） |
| `python design-lab/scripts/verify_contract_bindings.py` | 0 | `VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 inert=30 routes=60 dispatched=60 bound=21 schema_less=39` |
| `python design-lab/scripts/verify_workbench_route_calls.py` | 0 | `VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=96 routes=58 matched=47 backend_only=11 dynamic=3 special=1` |

**关于全库分片的诚实说明**：本会话起过一次本地 `run_python_tests_all.py --shards 3`，跑到约 19 分钟时已被 CI 的
计数与本地定向复现共同指认到那一条红（`test_verdict_line_is_what_the_aggregate_matches`），于是停止该次运行、
改为按模块复现与验证——**没有**在本地跑完全库分片。全库分片的完整判定来自 CI 那一次（它就是红的来源），
修后判定见 §0 与下一条提交。

**未执行**：真实宿主、真人验收、发布/安装态一律未执行。**手机端不在这一列**——它是 owner
2026-10-19 定的排除项（不是"本轮还没做的冻结项"），把它写成"未执行"会把它留在待办面上。

### 5.2 第三批（桌面端打磨 + 独立全链路走查）的实测读数

| 动作 | 实测证据 |
| --- | --- |
| 侧栏边界缺陷（§6.7） | 修前 `OV_NAV_EDGE_TIGHT 1440/1280/1920 gap=0` 且三处都是分组标签被切在切割线上；修后 `OV_OK`，证据 JSON `gap=12 overflow=499 straddling=["nav-group"]` |
| 一条被测量否证的猜想 | 1440 截图里 8 字标签看似断行剩孤字；实为文本宽 150 px / 可用 211 px，且把 `.nav` 压到 96 px 后 22 项**无一换行**（flex 子项不缩到内容宽以下，失败模式是横向溢出，已由 `CLIPPED/STRAY` 覆盖）。见 §9 |
| 三条"桥没有生产调用方"的过期声明 | 分析入口落地后，plan 页提示已改，但渲染面 `producer`/`next` 与两处面板注释仍说无调用方；全部改述并**重新构建 + 1440 渲染核对**（截图同时独立确认了上面两行：标签单行、切线与页脚边框分离） |
| preflight 路由首次 live HTTP | 新增用例实测 `verdict=INCOMPLETE`（该 fixture 的 PSD 无法检查透明合并，服务不认证自己没打开过的字节）；跨项目读返回 **400**，而同族 export 路由对同一条件返回 **404**——分歧如实记录，不静默统一，因为状态码是页面分支依据 |
| 独立全链路首次单条走查 | 13 跳验收链 `project=201 asset=201 brief=201 direction=201 design-layer=200 analysis=201 jury-verdict=201 jury-readback=200 rights=201 rights-readback=200 candidate=201 review=200 candidate-readback=200`；4 跳交付链 `project=201 native=READBACK bundle=201 preflight=200`。 jury 判定**对着 asset 那一跳返回的 version_id/sha256** 落判，此前 jury fixture 自己往库 publish 版本，"导入的资产能长出一个可判的 version"从未被证明 |
| 走查写出来的两个链事实 | `native_tasks.py:94` 只接受字面量 scope `project-native-test`，所以交付段是受控 E2 而非真实宿主 E3；`NativeTaskError` 包装会吞掉原因，取 `__cause__` 才看到 `scoped caller authorization required` |
| 覆盖确认 | CI 自己的发现器：`total discovered 3071`，chain 模块 3 条全部在列（未被发现的测试等于不跑的测试）；与借体的 5 个模块同跑 `87 passed, 23 subtests` |
| 仍无入口的两段 | 提示词段（`prompt` 在 http_service/cli/shell.ts 三处 0 命中，无模块）与导出段（`export_payload`/`to_v1_projection` 在 `src/` 内 0 调用方，`outbound.transport` 硬编码 `NOT_CONNECTED`）。补它们是产品实施，属 owner 门，本轮不建 |

## 6. 本轮暴露并修掉的六个缺陷

1. **分类聚合按目录贴标签**：`bundle_key()` 把一个顶层目录收成一个 bundle，于是 `docs/` 里第一个文件的类别
   给整个目录命名，`planning` 从投影里消失。改为逐文件计数，并核对九类之和 = 跟踪文件数。
2. **钉死文件的行尾被工具改写**：Windows `Path.write_text` 把 `\n` 写成 `\r\n`，三个 `binary` 文件因此
   真实字节变化——而我照着重钉了哈希，于是所有闸门全绿地放过了一个非本意的改写。已按原像恢复并重钉。
3. **降级检查被静默关闭**：`verify_top_level_authority.py` 的 `handoff-demoted` 仍查归档前的旧路径，
   找不到文件就 `PASS — absent; nothing to demote`。现经 `archive_records` 三层解析读回原件字节；
   把 UCR 条目的 `restoreAt` 改成假 SHA 后该门 `FAIL` 且退出 1（已实测）。
4. **钉死文件被浅克隆读不到**：上一缺陷修好后，CI 仍红——该 job 用默认 `fetch-depth: 1`，
   没有 `restoreAt` 那个 commit，本地全历史却看不见这个差异。补 `fetch-depth: 0`，并改掉步骤注释里
   已经失效的"只读工作树"说法。
5. **recovered 不能变成免检通道**：删档后证据测试的漂移清单少了一项、篡改测试挑中被删工件从而"什么也没测"。
   漂移计数按实测 delta（+1，正是被本轮改动的闸门模块自己老化了它绑定的记录）改为 60 并写明因由；
   篡改测试改选仍在树上的工件；新增精确 pin 的 recovered 断言（藏掉 `REMOVALS.json` 即回退为
   `tracked_broken=4`）。
6. **一条已关闭的债留在开放清单**：`CLEAN-TREE-REPORT.json` 的 `subject_sha` 已在本轮一次有意的生成器
   运行中绑定真实 commit，`REPORT-DEBT-CLOSED-NOT-REMOVED` 拒绝让记账落后于事实；按登记簿自己的机制
   移入 `resolved_2026_10_19`，并写明该运行连带 re-base 了 `DLDS-I020` 引用的证据。

## 6.5 第七个缺陷（本次复核自己发现的）

7. **清单把自己的删除也算清楚了**：`MANIFEST.json` 原写 "228/228 复验一致"，删除波之后这句话就过了——73 条已不在树上，再生成器也会直接 SystemExit（下次谁再跑它就是一颗地雷）。现在已删行带 `status=REMOVED` 与 `restoreAt`，`summary` 分列 `byteIdentityVerified=155` / `removedSinceThisPass=73`，并与 `REMOVALS.json` 的 blob/字节互相对账后才落盘。

## 6.6 第八个缺陷（owner 追问「还有没做完的吗」时暴露）

登记节把 `MANIFEST.json` / `REMOVALS.json` / 汇总登记的产出方式写成 `.project-local/task-runtime/*.py` 三条命令，并把它叫「生成命令」。实测该根下 40 个脚本**全部被 Git 忽略**（`git check-ignore` 逐条为真），所以这些命令只在这台机器上跑得通：一个新克隆按登记节去复现，会得到「找不到脚本」，而我上一轮还把它们说成「可复用的自审工具」——那是过诺。

处置不是补一句免责声明，而是把**复现路径**变成受审面：`scripts/verify_archive_record_register.py`（只读，把登记节反向解析后逐条对 `git cat-file blob HEAD:` 重算，任何不一致即 `FAIL` 并退出 1）与 `scripts/generate_archive_record_register.py`（重建本节，小节清单与计数直接从报告正文里读，不再手写枚举）入库，登记节改引这两条。那三个一次性波次工装仍留在 `.project-local/`，并写明「不在 Git 里、本节数字不需要它们也能复现」——它们的写侧会改 `docs/history/**` 冻结件，不该做成常备命令。

## 6.7 第九个缺陷（UI 对齐走查发现，先量化再修）

侧栏导航是唯一滚动区，身份页脚紧贴其下。列表在底部边缘必然把某一项切一半，而页脚的 1px 上边框正好压在那条切割线上——读起来像有人给半个分组标签画了下划线。上一轮我只在 1440 下用眼睛看到它，没量化，所以当时按"未测量"记成了待裁定项；本轮先测再说：`OV_NAV_EDGE_TIGHT 1440/1280/1920 gap=0`，且三个宽度上被切的那一项都是 `nav-group` 分组标签。

任何 CLIPPED 检查都看不见它：元素在自己的盒子里是完整的，盒子只是被滚动了。修法是给导航一个 token 级下边距（`--uif-space-3`，实测 `gap=12`），让切割线与边框分开——滚动列表躲不开切项，但可以把切项离线。同时把这条边界做成闸门：溢出审计现在逐宽度量导航底边与页脚边框的距离，切割线 6px 内出现边框即 `OV_NAV_EDGE_TIGHT` 退出 2（先以未修字节实跑为红，再以修后字节实跑为绿，不是推定）。

## 7. 回滚方法

- 单文件还原：`git checkout <restoreAt> -- <path>`（`REMOVALS.json` 每行都带 `restoreAt` 与 blob）。
- 整批还原：`git revert` 删除提交与归档提交（两者都只动路径/登记，不改任何被钉的原件字节）。
- 重钉回退：`AUTHORITY-PIN-CHANGE.json` 每条 revision 都保留 `from` 摘要，可据此把
  `R2_RELEASE_HASHES` 指回前一版并同步还原文件。

## 8. 风险与下一步

- `recovered` 只证明"字节还在对象库里"，不证明"内容仍与记录一致"——被删工件无法再做内容漂移比对。
  这是删除的固有代价，已在测试与注释里说明，不用放宽断言来掩盖。
- 账本 `tasks`/`evidence` 仍指向 `docs/handoffs/…` 的 sealed 路径：只要 `REMOVALS.json` 与 blob 在，
  读回成立；若将来做 history rewrite 或浅克隆依赖，这条会立刻变红，而不是悄悄变绿。
- 下一刀不在本轮范围：release / E3 / E4 / AAOS 接收 仍等 owner 授权；手机端不是"等授权"，是 owner 2026-10-19 已定的排除项（§6 冲突矩阵第 5 行）。
  `docs/taskpacks/` 剩余四份包体只有在 owner 允许改被钉索引时才能再搬。

## 9. 技能走查记录：量到了什么，量不到什么

owner 点名要"调用技能插件辅助执行"，本轮实际用了三类，各自能证明的东西不一样，写清楚免得下一轮把它们当成同等证据。

**能用的**：仓库自有合同（状态词不翻译、空态必须区分"没有数据"与"没读到"、界面不得宣称服务发不出的判定）逐条对照渲染结果，加上 `design-review:ui-alignment-review` 的走查框架，产出了 §6.7 那条真实缺陷——它先被记为"未测量、待裁定"，量化之后才确认成立并修掉。流程是对的：走查框架负责把问题问出来，闸门负责把数字钉住。

**量不到的，三处，都写下来而不是假装通过**：

1. **跨轮视觉回归不可用**。没有播种的 fixture（数据、时间、随机源都不冻结），两次截图的差值里混着真实数据变化，diff 比例没有解释力。所以本轮的视觉判断依据是 1440 下逐张人工查看加几何断言（`OV_*`、对比度、主题几何），不是像素回归；要做像素回归得先有一个冻结 fixture 的基线面，那是另一件事。
2. **插件自带的 debt 扫描与仓库自有基线口径不同**。它按自己的规则集计数，`scripts/design_debt_baseline.py` 按登记簿逐处对账，两个数字不可互换。本轮以仓库自有基线为准（`DESIGN_DEBT_BASELINE=PASS`，literal_px=534 未增），插件结果只作参考，不进闸门读数。
3. **没有批准的视觉参照物**。仓库里没有 Figma frame 或经批准的基线截图作为设计目标，所以 alignment 的对照面只能是自家权威文本（定位句、状态词、空态合同）。这意味着本轮修的是"界面与已声明合同是否一致"，不是"界面是否符合某个视觉稿"——后者要 owner 先给参照物，不能由 agent 代拟。

**没有做的**：`product-design:flow-web` / `design-review:ui-designer` 一类会**新画界面**的技能未调用。当前 `currentExecution` 34 项全部冻结、本轮明令"不实施产品功能"，生成新屏等于绕过解冻门；要新屏需 owner 明确授权。

**一条被测量否证的猜想**（写下来防止下一轮重追）：1440 全页截图里 "制作记录与待继续" 看起来像断行成两行、末行剩一个孤字。实测否证：该标签文本宽 150 px、可用 211 px；把 `.nav` 强行压到 96 px 后 22 个导航项**没有一个**发生换行（flex 子项默认 `min-width:auto`，不缩到内容宽以下，所以这条构造的失败模式是横向溢出，而那正是溢出闸门 `CLIPPED/STRAY` 已经覆盖的）。三次仪器失误也记在这里，因为它们的错法各不相同：用盒高÷行高会把带 padding 的按钮读成两行；对元素建 Range 得到的 `getClientRects()` 数目是**行内盒**数（图标 span 也算一条），两者都会凭空造出 18/22 条 "WRAPS"。只有对最深文本节点取矩形高度除以 `line-height`，再配一个"压窄容器必须看到换行"的播种对照，才敢用它说"没换行"——本条结论正是那个对照说"仪器是瞎的"之后才敢下的。
