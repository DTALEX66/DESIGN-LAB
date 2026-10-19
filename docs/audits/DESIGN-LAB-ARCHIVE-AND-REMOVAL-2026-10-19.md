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
  读侧消费者全部改指新位、六份权威钉值三次重钉并逐次记录理由、投影再生成。
- **不写 `PASS` 的两个理由**：其一，已推送 tip 的云端 CI 判定本文件写作时仍是 `pending`，
  我不替 CI 宣布通过；其二，两条 owner 门外的边界（release / 安装态分发 / 真实宿主 E3 / 真人 E4 /
  手机端 / AAOS 联调 / ComfyUI·H3）依旧 `FROZEN_DEFERRED`，波次再干净也不解锁它们。
- **状态声明（`ACCEPTANCE.md` 第 10 项：六件事是不同状态）**：
  - 文档修订＝本波次这一份报告与五份登记件已完成；
  - 规划完成＝方向包 `DL-TP-20261019-DIRECTION-R1` 已闭环，`currentExecution` 34 项仍全部
    `FROZEN_DEFERRED`，解冻需要 owner 明确授权；
  - 代码实现＝**本波次没有新增任何产品功能**，改动只在登记、读侧路径解析与闸门；
  - 真实运行＝未执行；
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
| 定向 pytest（本会话逐次实跑，未跑全库分片） | 最终 0 | `test_record_import_fidelity + test_current_reporting + test_ledger_schema` → `1 failed, 86 passed`（修好后 fidelity 单独 `4 passed`）；`presence + readback` → `21 passed`；`subject-binding + gate-reachability` → `42 passed`；受影响模块全集 → `2 failed, 143 passed, 24 subtests`（两处失败见 §6.5，修后该模块 `5 passed`） |

**未跑**：全库分片测试套件（CI 的 `run_python_tests_all.py --shards 3` 负责，本会话未重复）；
真实宿主、真人验收、发布/安装态、手机端一律未执行。

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
- 下一刀不在本轮范围：release / E3 / E4 / 手机端 / AAOS 仍等 owner 授权；
  `docs/taskpacks/` 剩余四份包体只有在 owner 允许改被钉索引时才能再搬。
