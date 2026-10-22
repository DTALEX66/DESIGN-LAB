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
  读侧消费者全部改指新位、六份权威钉值重钉并逐次记录理由（`AUTHORITY-PIN-CHANGE.json` 实测 8 条 revisions；2026-10-19 占 6 条：方向批次、归档波、删除波、手机端移出范围、AAOS 改为非依赖、AAOS 补进机器面）、投影再生成。
- **不写 `PASS` 的理由只剩一条**：owner 门外的边界（release / 安装态分发 / 真实宿主 E3 / 真人 E4 /
  AAOS 接收 / ComfyUI·H3）依旧不解锁，波次再干净也不解锁它们。**手机端不在这一列**——它已由 owner
  2026-10-19 定为排除项，不是待授权项。
  云端判定不再是理由：`c71e3d21` 那次确实红（`main` run 39287724318 的 `Python gate` 报
  `shard 3/3 tests=975 FAIL=1`，且同 SHA 在开发分支上的 39287715573 是 light gate——11 个 job 全
  `skipped`，那句"success"只描述编译与身份边界，不能当 CI 通过引用），红因已定位并修复（§5 末与
  §5.1）；此后 `72950ce2`、`b07a3906`、`6f4a89a4` 三个 head 的 `main` run 均 `OVERALL=success`
  （各 11 个真实 job success + light gate skipped）。当前 tip 的判定按 §5.2 的方式逐 job 读，不代读。
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
| `python design-lab/scripts/verify_browser_e2e_ran.py`（`E2E_REQUIRED=1`） | 0 | `BROWSER_E2E ran=9 skipped=0 failed=0`（加入交替主题那条后为 `ran=10`），六个模块逐个 `skipped=0`。**注意次序**：先在未提交的 bundle 上跑，`test_workbench_ui_audit_gate` 拒绝测量并报 `AUDIT_BLOCKED: apps/workbench/build differs from HEAD`——这是设计如此，提交后再跑才允许出数 |
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

| 交替主题几何覆盖（补上的盲区） | 溢出审计是唯一只测一个主题的浏览器闸门（对比度测 design-lab/dark + ui2026/light，主题几何扫三种组合，而它握着 CLIPPED/STRAY/TINY/切割线/滚动提示）。播种否证证明这条新用例有牙而非重复：把 `.nav{margin-bottom:0}` 只作用到 `[data-palette=ui2026][data-scheme=light]`，默认主题那条仍 `ok`，新用例在三个宽度上全报 `OV_NAV_EDGE_TIGHT gap=0`——改之前这个 bug 会绿着发出去。恢复后两主题 `Ran 2 tests OK`，整表 `BROWSER_E2E ran=10 skipped=0 failed=0` |
| 云端判定（逐条实读，不替 CI 宣布） | `72950ce2`、`b07a3906`、`6f4a89a4` 三个 head 的 `main` run 均 `OVERALL=success`，各 11 个真实 job success、`Branch light gate` skipped；同 SHA 在开发分支上的 light-gate run 也是 success，但那是 11 job 全 skipped，只说明编译与身份边界，不能当"CI 通过"引用 |

**闸门 × 维度覆盖矩阵**（本轮逐条查 invocation 得出，不是读注释——溢出闸门的注释本来就写着"按主题分级"，而它实际只测一个）：

| 闸门 | 宽度 | 高度 | 主题 |
| --- | --- | --- | --- |
| `test_workbench_overflow_gate` | 1440/1280/1920 | 900（全套几何）+ 620（滚动提示与边界） | design-lab/dark **与** ui2026/light（本轮补） |
| `test_workbench_contrast_gate` | 1440/1920 | 900 | design-lab/dark **与** ui2026/light |
| `test_workbench_theme_geometry_gate` | 按组合 | 900 | 三种组合（design-lab/dark、ui2026/dark、ui2026/light） |
| `test_workbench_theme_affordance_gate` | 单宽 | 900 | 它本身就是"点主题按钮"，天然跨主题 |
| `test_workbench_ui_audit_gate` | 1280/1920 | 900 | **仅默认主题**——它测的溢出/对比/键盘可达/目标尺寸/命名/降级措辞/控制台噪声里，对比与几何已由上面两道按主题覆盖，键盘可达与命名不随色板变；因此本轮不加第二趟（代价约等于把这道 26 scope 的量测翻倍），而是把这条判断记在这里，免得下一轮重新查一遍再得出同样的结论 |

**高度维度本轮补上了**：溢出审计原先只在 900px 高下比几何，620px 那一趟只判滚动提示出不出。同一趟里导航与页脚都在屏幕上，所以顺手把边界也量了——实测 `gap620=12`（1440/1280/1920、两个主题一致，列表溢出 779px）。把阈值从 6 抬到 13 会让闸门 `OV_SPEC_BROKEN`，恢复后两主题重跑仍绿，所以这条比较是活的而不是装饰。**仍未按主题分的只剩 ui_audit 那道**（理由见上表），而 DESIGN.md 第 125 行要求的"尺寸档位逐个截图比较"仍由 `capture_workbench_screenshots.mjs` 的 `VIEWPORT_HEIGHT` 档位承担——截图是人看的，不是闸门判的。

### 5.3 第四批（接口层普查 + 链路收口）的实测读数

| 命令 | 退出码 | 读数 |
| --- | --- | --- |
| `gh run view 39310800333 --repo DTALEX66/DESIGN-LAB --json headBranch,event,conclusion,jobs` | 0 | `BRANCH=main EVENT=push CONC=success jobs=12`：11 个作业 `success`，只有 `Branch light gate` 是 `skipped`（它按设计只在开发分支跑）。这是 `fd5e426e` 的 exact-SHA 判定，也是独立链路那两条腿的收口证据——同一个 SHA 的分支 run 39310790208 是 light gate，不能拿它的"success"当 CI 通过 |
| `PYTHONPATH="design-lab/tests;src" python -m unittest -q test_standalone_chain_http test_contract_bindings` | 0 | `Ran 38 tests ... OK`，逐跳读数原样复现：`CHAIN_HOPS project=201 asset=201 brief=201 direction=201 design-layer=200 analysis=201 jury-verdict=201 jury-readback=200 rights=201 rights-readback=200 candidate=201 review=200 candidate-readback=200`（13 跳）与 `DELIVERY_HOPS project=201 native=READBACK bundle=201 preflight=200`（4 跳） |
| `grep -c "add_parser(" src/design_lab/cli.py` | 0 | 16（脚本/CLI 层实数） |
| `integrations/adapter-registry.json` 条目数 | 0 | 30（原生插件层实数，另有 `ADAPTER_REGISTRY=PASS`、`ADAPTER_MATRIX=PASS matrix=9`、`ADAPTER_LOCATOR_AUDIT=PASS`） |
| `grep -rniE "ui_automation\|controlled\.ui\|accessibility tree\|屏幕坐标" src/ \| wc -l` | 0 | 0——受控 UI 自动化层在 `src/` 内没有任何模块 |

这三条数是替 owner 那句「保留标准通用的接入接口」逐层实测出来的，结论按层分开写，不合并成一句"接入已可用"：官方 API/SDK 层有代码但等级以 E0/E1 为主（ComfyUI 的 E2/E3 证据属 2026-08，未在现树复验）；原生插件层与 CLI 层是实的；**MCP 层只有合同没有服务**（`INERT-CONTRACT-SURVEY-2026-10-08.md` 记 `state=NO_STATE_COUNTERPART`、`route_references=[]`、`table_readers=[]`、`table_writers=[]`）；**受控 UI 自动化层零模块**。后两层要补属产品实施，仍在 `currentExecution` 冻结内。普查结果就地写进 `docs/current/NEXT-AGENT-PROMPT.md` 的开放边界一节。

### 5.4 第五批（桌面端验收尺寸 + 定位句一致性）的实测读数

| 命令 | 退出码 | 读数 |
| --- | --- | --- |
| `powershell -File .project-local/task-runtime/screen-probe.ps1` | 0 | `SCREEN \\.\DISPLAY1 bounds=2048x1152 working=2048x1104 primary=True` + `APPLIED_DPI=120`。结论：浏览器拿到的 CSS 视口宽是 **2048**，2560 只是面板物理宽——验收尺寸因此按 2048 设，而不是按看起来更大的那个数 |
| `python scripts/audit_workbench_ui.py --widths 2560`、`--widths 2048` | 0 | 两档各一趟 `AUDIT_SCOPES 13 violations=0 ok=True`。服务日志里那条 503 与 `ConnectionAbortedError` 属 `disconnect-*` scope 自己注入的断连，不是缺陷 |
| `python -m unittest -q test_workbench_ui_audit_gate`（默认档改为 `1280,1920,2048` 后） | 首趟 1 → 次趟 0 | 首趟红在 `console-error: 1280 Failed to load resource: net::ERR_NO_BUFFER_SPACE`——本机连跑三趟浏览器工装后的套接字缓冲瞬时耗尽，不是产品问题；第二趟 `OK`。**没有给它加重试**：控制台报错就该红，这是闸门在做事 |
| `OV_HEIGHT=1100 / 900 / 750 OV_WIDTHS=1440 python -m unittest -q test_workbench_overflow_gate`（三趟） | 0 | `navEdge overflow` = **299 / 499 / 649**，`gap` 三趟都是 **12**，被切的元素 1100 与 900 是 `nav-group`、**750 是 `button`**。默认档重跑 `Ran 2 tests OK`（162s）。**这一行第一版写错了**：我当时写"clientHeight 由 CSS 定死、边界几何与视口高无关，所以不加第三档"，错因是把短档（620）那一趟的 `hiddenPx=779` 当成两趟的共同读数——而我覆盖的只有名义高度，短档根本没动，两次当然同值。重量之后正确的说法是：溢出量随视口高变化，恒定的只有发丝线与切割线的间距（固定 token 边距，620/750/900/1100 四档实测都是 12）；不加 1100 档是因为它与 900 档切同一个元素、判同一条不变量，而 750 会切到另一个元素，说明现有两档不是摆设 |
| `python -m unittest -q test_workbench_brand_asset` | 0 | `Ran 15 tests OK`，其中 3 条是本轮新增的定位句一致性 |
| `python .project-local/task-runtime/falsify_positioning_line.py` | 0 | `POSITIONING_FALSIFIER moved=4/4`：改掉权威句、少一份落地页副本、把品牌行后半改一个字、以及让 `.brand-line` 提取式失配，四种破坏各自让对应断言变红；第四种还先报"提取式已失效，不要用它下结论"而不是静默通过 |

**为什么补这三条断言**：定位句「专业视觉智能与可复用设计能力系统」同时出现在权威文本、落地页（`/workbench` 的 served 字节，页头与页脚各一次）与侧栏品牌块（为不断词而拆成的两行）三处，此前**没有任何东西把它们绑在一起**——改一处是免费的，产品可以在三个地方对自己说三种话。现在权威是源头、落地页测的是 `workbench.resource()` 真正吐出的字节（安装态 wheel 一并覆盖）、侧栏测两行拼回去是否仍是那句权威话。三处当前实测一致，这条补的是"下次不一致会红"。

### 5.5 第六批（把"文档说的 = 量出来的"补成一条闸门）

本轮两处过期数字都是人眼撞出来的：源码注释还在叙述"12 → 15"（表里已经 19 条），设计契约还写"导航 11 项需 587px、≤720 才溢出"（19 项，且任何桌面高度下都溢出）。仓库里已经有这个机制的先例（`design_debt_baseline.py --check` 就是"债的散文对回实测"），所以补的是同一条机制覆盖剩下没人管的计数。

| 命令 | 退出码 | 读数 |
| --- | --- | --- |
| `python scripts/verify_documented_counts.py --verbose` | 0 | `DOCUMENTED_COUNTS=PASS claims=4 route_views=19 cli=16 adapters=30 routes=58`。四条各有一个只读代码的测量式（`ROUTE_VIEWS` 条目数、`cli.py` 的 `add_parser(`、适配器注册表长度、`http_service.ROUTES` 长度），散文只提供句子，不参与测量 |
| `python -m unittest -q test_documented_counts` | 0 | `Ran 2 tests OK`。第二条把 `DESIGN.md` 的"导航 19 项"改成 18 再跑闸门，实读输出 `FAIL DESIGN.md: prose says ['18'], measurement says 19` 并退出 1；它同时拒绝一种退化情形——若模板已经匹配不到任何句子，测试自己先红（"the claim is unpinned and this falsifier is testing nothing"） |
| `python -m unittest -q test_gate_reachability` | 0 | `Ran 9 tests OK`：新脚本经测试模块进入 Python gate，不需要动工作流文件 |

三个提取式都写成"匹配不到就 `SystemExit`"，因为一个死掉的式子返回 0 会让闸门把"读不到"当成"没有差异"，那正是本轮 §6.3 那条缺陷的同一种错法。

### 5.6 第七批（2048 采集档、jury 读侧证据、计数闸门扩到六条）

| 命令 | 退出码 | 读数 |
| --- | --- | --- |
| `python scripts/capture_workbench_screenshots.py --widths 2048` | 0 | 23 张 @2048×1152。此前该宽度没有档位，会走 `w * 0.62` 兜底算出 1270——一个谁都没有的画幅；已在 `VIEWPORT_HEIGHT` 补上实测的 `2048:1152` |
| 2048 档人工查看 | — | 仪表盘与能力目录逐张看，并**当场否证了自己一次目测错判**：能力目录在宽屏下看着像"表头与单元格逐列错位"，读构造才知道那一屏是单个 `<table>`（表头是 `shell.ts:2563` 的 `TABLE_COLUMNS`，每格 `el('td', …)`），列宽由整列共享，结构上不可能逐行错位。结论：2048 档无缺陷（同档系统性检查已由 ui_audit 判 13 scope `violations=0`） |
| `python -m unittest -q test_standalone_chain_http` | 0 | `Ran 4 tests OK`，链上读数不变（13 跳 + 4 跳）。新增一条证明 `GET /projects/<id>/jury` 的 `reviewable_versions` 会给出 `version:<导入返回的 version_id>` 且 `artifact_sha256` 等于导入摘要——桌面 jury 面板的判定对象确实有来源；此前只证明过"拿导入响应里的 id 能 POST 判定"，那不等于界面列得出来 |
| `python scripts/verify_documented_counts.py --verbose` | 0 | `DOCUMENTED_COUNTS=PASS claims=6`：新增两条把提示词里的"**13 跳验收链** / **4 跳交付链**"对回测试方法体（`self.hop(` 调用数加手工 `hops.append(` 数）。跳数一变，句子立刻对不上——今天加 jury 那条时正是这个数最容易悄悄过期 |
| `python -m unittest -q test_documented_counts test_standalone_chain_http` | 0 | `Ran 6 tests OK`，播种反证仍然红（`prose says ['18'], measurement says 19`） |

### 5.7 第八批（无障碍复核：自动化看不见的部分，以及补上的一条断言）

| 检查 | 读数 | 判读 |
| --- | --- | --- |
| `grep -c "outline:none" apps/workbench/style.css` | 0 | 焦点环没有被抹掉 |
| `grep -c ":focus-visible" apps/workbench/style.css` | 10 | 焦点可见态是成体系的规则而不是零星几处 |
| `grep -c "prefers-reduced-motion"`（CSS / shell） | 1 / 3 | 动效有降级路径（CSS 4 处 `animation:`、20 处 `transition:` 都在其约束内） |
| toast 实现 | `el('div', { class: 'toast', role: 'status', id: 'toast' }, …)`（`shell.ts:5794`） | 播报走 `role="status"`，不是只有视觉变化 |
| 状态词 `lang` | 标签自带 `lang="en"`；`shell.ts:7085` 写明为何不再套一层 `en()`（外层会先被文字检查命中） | 与状态词合同一致，未翻译 |
| 表单标注 | `<label>` 72 处 / `aria-label` 44 处 | 以原生标注为主，ARIA 是补充 |
| **新增**：逐屏标题序列（溢出闸门 `out.headings`） | 23 条路由读数中跳级 **0** 处；唯一无标题的是落地路由 `workbench`（其 h1 在 `#route-view` 之外），作为具名例外 | axe 每屏拒评 9–71 个节点，标题顺序此前没有任何东西在看；现在由 `test_workbench_overflow_gate` 断言，且三条分支（跳级 / 无标题 / 覆盖数掉到 15 以下）都有播种反证证明会红 |
| 本轮人工未做 | 真实读屏软件下的措辞、键盘-only 主路径 | 记为待人工，不写成通过 |

结论：本轮无障碍侧**没有发现需要改产品的缺陷**；产出是一条原来缺失的覆盖（渲染出的标题顺序）与它自己的反证。

### 5.8 第九批（设计债复核：棘轮看不见的"种类"，以及它抓出的一次真回归）

基线闸门数的是"非令牌声明不许增长"，看不见**同一声明被重复多少次**、也看不见内联样式。按种类扫的结果：

| 项 | 实测 | 判读 |
| --- | --- | --- |
| `shell.ts` 内联 `style:` 站点 | 27 处，其中 `margin-top:16px` **14 次**、`display:grid;gap:8px` **6 次**、`display:grid;gap:10px` 2 次、其余 5 个各 1 次 | 20/27 是两个声明的重复，属于"该收成类"而不是"该登记的字面量" |
| 收成 | `.spaced-top{margin-top:var(--uif-space-4)}`、`.grid-stack{display:grid;gap:var(--uif-space-2)}`（style.css 830/831 行，各定义一次） | token 值 16px / 8px 与原内联逐字相同；`literal_px` 由 **534 → 514**，`--check` 立刻以"DESIGN.md §4 没有这句原话"为由拒绝，直到文档改成实测句为止——这正是这条闸门该有的行为 |
| `gap:10px` 那 2 处 | 保留内联 | 10px 不在间距档（4/8/12/16/24/32/40）上，改成 8px 是可见变化而不是重构；要归一需要先决定加哪个 token，那是 owner 侧的选择 |
| `!important` | 7 处，逐条看：`[hidden]`、reduced-motion 块内 3 条、`.error` 颜色（注释写明是 load-bearing） | 都是有意例外，不算债 |
| 色值字面量 | 26 处登记在 `ui-off-palette-colours.json`，`adjudication` 空 | 闸门自己报 `NOTICE PENDING-OWNER-ADJUDICATION`，代理不得填 |

**这次重构制造了一次真实回归，而且是像素比对抓到的**：`.quick-launch{margin-top:0}` 从来没生效过——它唯一的使用处一直挂着内联 `margin-top:16px`，内联优先级压过类规则；把内联换成 `.spaced-top` 之后，这条死声明按源码顺序（它定义在 1479 行，晚于 830 行）开始获胜，把仪表盘那张卡顶到 0。已删除该死声明并在原处写明它曾经是死的，免得有人把它当"面板自己的间距"加回来。

**同时暴露一条闸门灵敏度事实**：带着这个 16px 错位，`test_workbench_overflow_gate`、`test_workbench_ui_audit_gate`、`test_workbench_theme_geometry_gate`、`test_workbench_contrast_gate` 四道（8 个测试）**全绿**——它们看的是溢出、边界、对比度、控件尺寸与命名，不看"某张卡离上一张卡多远"。而像素比对在这里也分不开：数据屏每次采集都换播种项目名，`01-dashboard` 无论对比哪一对都有约 1700 px 差值，与噪声同量级。最终依据是级联本身：删掉那条之后，匹配 `div.panel.quick-launch.spaced-top` 且设置 `margin-top` 的规则只剩 `.spaced-top`，其 token 为 16px，与被替换的内联值逐字相等。修法与验证方式都记下来，是因为"四道浏览器闸门绿"并不能证明一次样式重构没有改变可见结果。

### 5.9 第十批（把层叠冲突做成闸门：同一形状的第二处回归）

§5.8 记了第一处（`.quick-launch{margin-top:0}`）。写闸门去防它复发时，同一形状的第二处当场被抓出来：

| 项 | 实测 |
| --- | --- |
| `.row-card` 的声明 | `display:flex; gap:12px`（style.css:885-897，与 `.list-item` 共用一条规则） |
| `.grid-stack` 的定义位置 | style.css:831 —— **早于** `.row-card`，同特异性 |
| 后果 | 6 张 `.row-card grid-stack` 卡片在折叠后按源码顺序变成 flex/12px，而它们折叠前是内联 grid/8px |
| 四道浏览器闸门 | 带着这处错位**全绿**（8 个测试）——它们不量卡片间距，也不看复合层叠 |
| 像素比对 | 分不开：数据屏任意两次采集都差约 1700 px（播种项目名带时间戳），16px 级别的位移淹没在噪声里 |
| 修法 | 加 `.row-card.grid-stack{display:grid;gap:var(--uif-space-2)}`（特异性 0-2-0，与文件顺序无关）。**没有**采用"把工具类挪到文件末尾"那种做法——那只是把下一次冲突推到更晚的位置 |
| 新闸门 | `scripts/verify_utility_class_conflicts.py`：读样式表与 `shell.ts` 里字面 `class:` 集合，工具类与同元素上的组件类共享属性即红，除非有复合规则显式解决。`UTILITY_CONFLICTS=PASS checked=20 utilities=['grid-stack','spaced-top']` |
| 反证 | `design-lab/tests/test_utility_class_conflicts.py` 三条：当前树绿；**删掉那条复合规则必须回红**并点名 gap 冲突；shell 里没有任何工具类时报 FAIL 而不是 PASS |

**这一批真正的产出不是那 20 处折叠，而是这条事实**：对本项目的工作台而言，"浏览器闸门全绿"不构成"布局未变"的证据。闸门量的是溢出、边界距离、对比度、控件尺寸与命名；卡片之间差 16px 不在任何一条断言里。要么按复合选择器把意图写死（现在这样做），要么给间距本身加断言——后者需要想清楚锚点集合，不在本轮里顺手做。

### 5.10 第十一批（层叠冲突的第二道闸门，以及它自己被抓到的盲区）

§5.9 的静态闸门只读源码，不看渲染结果。这一批补了浏览器里的那道：溢出审计对每个带工具类的元素读 `getComputedStyle`，与它该用的间距 token 逐一比对（`--uif-space-4`=16px、`--uif-space-2`=8px），python 侧断言 `bad == []` 且 token 确实解析出值。

**两道闸门各被种一次真实的 bug，结果不一样，这个差别就是要记的东西**：

| 播种 | 静态闸门 | 浏览器闸门 |
| --- | --- | --- |
| 把死声明 `.quick-launch{margin-top:0}` 追加回样式表末尾 | **红**：`FAIL shell.ts:877 class="panel quick-launch spaced-top": .spaced-top sets margin-top:var(--uif-space-4), but .quick-launch also sets margin-top:0` | **没红**——那张卡在测试 fixture 下不渲染。实读 `seen: {'spaced-top': 9}`，而 shell 里有 14 处 `spaced-top`，即 5 处本轮根本没上屏 |
| 把 `.three-col{margin-top:0}` 追加回末尾（仪表盘确实渲染的站点） | 红 | **红**：`design-lab/dark: 1280:dashboard: a utility class lost the cascade -- .spaced-top expected margin-top:16px but computed 0px alongside .three-col` |

结论写进现行面：**对这一类 bug，不依赖 fixture 数据的静态闸门是主承重的**，浏览器那道只保证"渲染出来的站点"算对了。它每次跑会打一行 `NOTE ... not rendered under this fixture: ['grid-stack']`，把盲区说出来而不是静默通过。播种后 `git diff` 对 `style.css` 为 0 行，两处注入都已还原。

### 5.11 三份信封补上 schema：契约补齐，以及一处被自己挪坏的指针

前几批把三段解冻面接完之后，留下的 named debt 是**三份自己写了 `schemaVersion`、却没有任何 schema 描述其形状的信封**：`GET /api/models`（`design-lab/model-catalog/v1`）、`GET …/model-selection`（`design-lab/model-selection-readback/v1`）、`GET …/knowledge-candidates/<id>/export`（当时只写 `status`，连版本都没有）。第三批那轮账本曾经试图把 v2 schema 直接绑到导出信封上，被闸门以 `ROUTE_VERSION_UNBOUND` 判红——v2 的 const 是 `…/candidate/v2`，绑上去就是在替一个没人检查的形状背书。这一批改的就是那一笔：先让信封写自己的版本（`knowledge_review.py` 新增 `EXPORT_VERSION`，导出体第一键变为 `"schemaVersion"`），再写 schema，再喂 live 载荷，账本三行同时翻成 `BOUND_SCHEMA`。三件事一次做完，因为"schema 存在但没人绑"与"账本说绑了但没载荷"都是这一面存在要拒绝的半态。

**实测读数**（定向闸门，全量由 CI 在同一 SHA 上重跑）：

| 面 | 改前 | 改后（同一提交内实测） |
| --- | --- | --- |
| 账本路由 kinds | `BOUND_SCHEMA` 23 / `SCHEMA_LESS` 43 | `BOUND_SCHEMA` 26 / `SCHEMA_LESS` 40（`routes=66` 未变） |
| 载荷闸门绑定 | `bindings=7` | `VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=10 failures=0` |
| 新增三条的比对量 | — | model-catalog `cases=1 locations=30`；model-selection-readback `cases=3 locations=9`；candidate-export `cases=1 locations=9` |
| 未付的版本债清单 | 7 条 | 5 条（`test_contract_bindings.py` 的钉死清单，逐项记日期与原因） |

30 这个数字是可核对的：根节点 1 + `sources`、`hardware`、`counts`、`counts.placement`、`join`、`selection`
六个容器节点 = 7，再加 14 条模型行与 9 条端点行。它同时也是"这份 schema 真的走进了每一行"的证据——
只比 `$` 一层的 schema 只会给出 1（`policy` 是字符串数组，不产生对象节点）。

**新绑定的两条播种，各自红在它该红的原因上**（写在 `design-lab/tests/test_route_payload_contracts.py`，不碰出厂文件）：

| 播种 | 结果 |
| --- | --- |
| 把 `counts.qualified_local` 保持 0，而把第一条模型行的 `radar_state` 改成 `QUALIFIED_LOCAL` | **红**：`SCHEMA_VIOLATION … models/0/radar_state`——目录的 fail-closed 计数不是散文，是断言。这条不变式是 `#/models` 那一页唯一的防呆：注册表没记合格，页面就不许长出合格的样子 |
| 从读回信封 schema 里删掉 `state`（closed 对象） | **红 ×3**：`UNDECLARED_BY_SCHEMA ['state']`，三个真实载荷各一次——路由发了 schema 不声明的字段 |

另外补了可达性断言：`$.selection#oneOf`、`$.history[0]`、`$.export`、`$.v1_projection`、`$.provenance` 必须真的被下探。这三份 schema 都刻意 `$ref` 记录本身（存下来的选择、v2 的 `$defs/export`、v1 投影）而不是重述形状，$ref 若没被跟进，"引用"就只是措辞。

**自己制造并被闸门当场抓住的一处**：插入 `EXPORT_VERSION` 让 `knowledge_review.py` 整体下移一行，账本里另一条**与本批无关**的读回行指针 `src/design_lab/knowledge_review.py:316` 于是指到了 `return {` 上，`VERIFY_CONTRACT_BINDINGS=FAIL` 原话是 `EMITTER_POINTER_NOT_THE_VERSION 'src/design_lab/knowledge_review.py:316' holds 'return {' … the line is decoration`。指针会随文档悄悄腐烂，这条闸门只读文件半边的指针、却要求行半边也认账，所以一次 +1 行的编辑就足够让它红。已重测为 `:317` 并重跑绿。

**一处刻意的收窄，写进 schema 的 `$comment` 而不是留成暗坑**：目录的 `placement` 只允许直方图真正计数的三个词（`local`/`huggingface`/`vendor`），而雷达自己的 schema 的 `source.kind` 枚举还多一个 `modelscope`。今天 14 条里没有该 kind，但一条 `modelscope` 记录会让 `counts.placement` 之和少于 `counts.models`，并让选择该模型时撞上一份 schema 的枚举。所以这个差被 `design-lab/tests/test_model_catalog.py:65`（每行的 placement 必须落在词表内）先抓住，扩词汇要求 catalog schema、`model-selection-v1.schema.json` 与状态库的 `CHECK` 三处一起动。

**仍未付的 5 条**：Adobe 两个 job-spec 债（`…/tasks/(native-job-…)/patch`、`…/native-plans`）与 rights / research / native-runtime 三份读回。`POST …/model-selection/choose` 留在 `SCHEMA_LESS` 是有意的：它回的是操作收据，收据本身不写版本，而里面的选择文档是被 `model-selection-v1.schema.json` 绑住的。

**上一条批次的 CI 红，是这一批顺手补的，也是本轮最该记的一条**：`b28aa57f` 在 main 上的 Canonical Verify 唯一失败项是 `test_backup_watches_written_tables.CoverageTests.test_every_written_table_is_watched_by_the_proof`，实读 `['model_selection'] != []`。上一批新增 `model_selection` 表时，本地 `VERIFY_DESIGN_LAB=OK total=76 failed=0` 与四条浏览器闸门全绿——**因为那 76 项是 `verify_*.py` 验证器，不含单元测试；这条断言住在测试里，只有 CI 的 "Python unit tests (sharded)" 那一步会跑**。修法按测试自己的指示来：把 `('model_selection', 'rowid')` 加进 `project_backup.py` 的 `COUNTER_QUERIES`（追加式选择表没有写者租约，静默证明看不见它就等于"备份窗口吞掉一次决定还宣称 PROVED_QUIESCENT"），并写明日期与理由；`WITHOUT ROWID` 那条同时复核——复合主键 `(project_id, revision)` 仍是 rowid 表，计数器可用。

这不是新缺陷，是同一类缺陷的**第二次**：那条测试的文件头就写着"一份人工判定在备份窗口里落地而无人看见，直到 601a6422；这道测试是为了让它不能再安静地发生"。这次它做到了——只是它说话的地方不在我这一轮的量法里。写下来的规则：**加表就是加消费者**，DDL 变化之后必须至少跑 `test_backup_watches_written_tables`，或直接跑分片全量；定向闸门绿不等于契约绿。播种核对：还原 `COUNTER_QUERIES` 那一行后该测试重新变红，读数仍是 `['model_selection']`。

### 5.12 「不使用」终于成为一个选项：两个编号的三态在浏览器里被看见

owner 那句话的前半句早就落地了——`#/knowledge` 的创建表单里一直有 `job_id` / `operation_id` 两个可填写位置，写入合同也早就把两件事分开：空白 400 并点名是哪个字段，字面量 `UNUSED` 被存下、读回报成 `EXPLICITLY_UNUSED`。缺的是后半句：**没有那个"选择用没用"的控件**，于是"这次确实没有编号"只能靠操作者背一个魔法字符串来表达。这一批改的就是那半句。

**做了什么**：两个编号各自先选「来处」——`我来填写` / `不使用（发送字面量 UNUSED）`，默认空，未选就本地拒绝并说明这是"没选"。选「不使用」时填写框**只禁用、不清空**；框里还有字时报自己的冲突（`… 冲突：已选择「不使用」，但填写框里还有内容…页面不会替你丢掉已经打进去的东西`），而不是静默丢弃。三个可达状态各一句话，没有一条是装饰。

**浏览器里的实测**（一次性 scratch 探针，真服务 + 真 Chromium + 已出厂的 bundle；探针脚本在 `.project-local/tmp/` 下，不入库）：

| 量 | 读数 |
| --- | --- |
| 两个新 select 的盒子 | `2048x1152` 视口内 `w=1598 h=42`，`overflowsParent=false`、`clippedByParent=false`、`fontSize=12px`（与同行其余控件同规格） |
| 可及名 | `labels=1` 各一条（`job_id 的来处` / `operation_id 的来处`），三个 option 文案原样上屏 |
| 选「不使用」后 | `#knowledge-operation` 变为 `disabled=true` 且 `value="op-keep-me"`——Playwright 拒绝往禁用框里写字，这本身就是"不清空"的证据 |
| 本地拒绝 | `未提交：job_id 为空：选了「我来填写」就得真的填；这次确实没有编号请改选「不使用」。服务端未写入任何候选。` |
| 真写入 | 一条候选落地：`已记录一条候选；它仍是 PENDING_HUMAN_APPROVAL…`，读回 `共 1 条候选 · 待裁决 1 … 不可导出`，出站仍是 `NOT_CONNECTED → ArcheAxis；sent_count=0` |
| 控制台 | `errors: []` |

**闸门侧**：`appshell.mjs` ㉒ 的本地拒绝序列从两条扩到六条（没选 / 填写却空 / 不使用却非空），并新增一段外发体断言——`source.operation_id === "UNUSED"` 且同一表单里填写中的 `job_id` 原样带走，证明字面量上线而不是界面装饰。UI 审计在 `1280/1920/2048` 三档 `Ran 1 test OK`（单跑 2048 时 `AUDIT_SCOPES 15 violations=0`），溢出 3 OK、对比度 3 OK、served-bundle 4 OK；bundle 重建为 432.31 kB 后一并提交——UI 审计在 `apps/workbench/build` 与 HEAD 不一致时直接 `AUDIT_BLOCKED` 拒绝测量，这个顺序本轮又被迫走对了一次。

**一处值得记的读法**：探针第一次跑炸在自己的 `node.options`（`<input>` 没有 `options`），第二次炸在 Playwright 拒绝填禁用框——两次"失败"都是功能在起作用，而不是缺陷。把禁用做成"锁住可见内容"而不是"清空并隐藏"，正是为了让操作者随时能改主意而不丢输入。

### 5.13 导出出口终于有人能按到，以及按下去之后发现的一个重名版本

§5.11 把导出信封绑上了 schema，但 `apps/workbench/shell.ts` 只调 knowledge-candidates 的读回、审阅与撤销——**没有导出**。也就是说"可寻址"停在 HTTP/CLI 两级，操作者手上那台界面还差一级。这一批补那一级：每条候选一行一个 `读回导出文档` 按钮，`export_ready=false` 的行是禁用的且按钮文字自己说明"本条被合同阻止"；面板渲染信封版本、两份投影、编号回显（`USER_SUPPLIED` / `EXPLICITLY_UNUSED` 分开）、freshness、出站三事实与 `does_not_say` 逐句。按钮文字带"不发送"三个字，因为一个只写「导出」的控件会被读成已经交付。

**浏览器实测**（真服务 + 真 Chromium + 出厂 bundle，2048×1152）：创建 → 具名批准 → 同一行的按钮从 `disabled:true` 变 `disabled:false`、文字从"本条被合同阻止"变"读回导出文档（不发送）"→ 点下去发的是 GET，面板读数原样为

```
CANDIDATE_EXPORT 信封 design-lab/assurance-knowledge-candidate-export-envelope/v1 · kc-ab21ca7f037708 · 第 2 版
v1 投影：design-lab/candidate-knowledge/v1 source_id job-export-probe:UNUSED
编号回显：job_id job-export-probe（USER_SUPPLIED）· operation_id UNUSED（EXPLICITLY_UNUSED）
出站：NOT_CONNECTED；sent_count=0；bytes=878
```

`errors: []`、`overflow: false`；UI 审计三档宽度 `AUDIT_SCOPES 45 violations=0`（第一次跑在 2048 撞到一个 `net::ERR_NO_BUFFER_SPACE` 控制台错误，与 §5.7 记过的那次同源，重跑单进程即绿）。

**这一屏顺带抓出一个 §5.11 自己造的缺陷**：信封的 `schemaVersion` 当时取名 `design-lab/assurance-knowledge-candidate-export/v1`——而那正是 `knowledge_feedback.EXPORT_VERSION` 从很久以前起就给**被包裹的那份 v2 导出文档**用的字符串。一个版本名，两种形状：读回顶层字段的人会把信封的合同套在被包文档上（键集合不同），反之亦然。闸门抓不到它，因为每一侧各自自洽；是渲染出来的面板把两个版本并排打在屏幕上才看出重名。修法是把**新的一方**改名（信封 → `...-export-envelope/v1`，文件与 `$id` 同改），因为被叫错的一方不能是已经出厂、被三处测试与 CLI 断言的那一个。

顺手把这类缺陷变成机器可见的：`test_contract_bindings.py` 新增一条清单式断言，扫全树 `schemaVersion` const（含 `$defs`），**同名不同形即红**，现存三对合法重名逐对写明理由（同一合同被自己的 `$defs` 与描述它的文件各说一次）。清单不是地板：新重名要红到有人说明为什么两者是同一份合同，说明完失效了也要从清单里删掉。

**上面那段浏览器证据是 scratch 探针，不能从克隆里重跑**——所以这一段现在住进了出厂链路：`design-lab/tests/e2e/browser_design_layer_e2e.mjs` 的链条多出第 13 段，创建→具名批准→断言按钮从 `disabled` 变可用→点下去→断言面板里同时出现 `…-export-envelope/v1`（信封）与 `…-export/v1`（被包的 v2 文档）与 `design-lab/candidate-knowledge/v1`（v1 投影）、`job-e2e-export:UNUSED`、`USER_SUPPLIED`/`EXPLICITLY_UNUSED`、`NOT_CONNECTED`/`sent_count=0`/`bytes=`，并且断言屏上**没有**「已发送 / 发送成功 / delivered」。这一段落进链路时自己撞了两次：先是在旧 DOM 上等 `visible`（按钮在重载前就在屏幕上，读到的是过期状态），再是把被包文档的版本号断言成了 `…/candidate/v2`——真实读数证明 `…-export/v1` 一直属于被包文档，重名的是我新加的信封那一侧。两次都是这条链该抓的东西，现在它每次都抓。

### 5.14 第十二批（外部审计包核验 + 现行面三处过期现状句）

owner 发来 `DESIGN-LAB_独立闭环审计包_20261021.zip`（19 成员，`sha256sum -c SHA256SUMS.txt` 全 OK，包内审计 SHA 与 live `main` 同号）。**8 条断言逐条对回当前字节，全部成立**，因此本批不重审、只修被它抓到的现状面：DL-01 `model.executed` 恒 false（`src/design_lab/prompt_intelligence.py:199`、`:312`）、DL-02 无 prompt/analysis/result 表（`grep CREATE TABLE src/design_lab/` 12 处命中里 0 处是结果表）且 `apps/workbench/shell.ts:8278` 自己写明"服务端不持久化这份文档"、DL-03 审阅只认 human（`src/design_lab/knowledge_review.py:426`）、DL-06 `shell.ts` 8975 行、IF-01 `schemas=32 binding=2 routes=66 bound=26 schema_less=40`、OSS-01 `records=6 mapped=2 consumed=0`。

**DL-05 是唯一一条"文档落后于代码"的，也就是本批的活**：`docs/current/PRODUCT_DEFINITION.md` 第 6 行仍写导出「2026-10-20 已落地，界面按钮仍未接」，而 `#/records` 的知识面板与每行读回按钮已在 §5.13 落地并进厂；`docs/current/ROADMAP.md` R2 仍写「已规划，未执行」，而验收链 18 跳 + 交付链 4 跳每一跳都有 live 入口。两处改成实测分轴读数，并把 owner 同日三条裁定写进现行面：**推理执行不接**（只做契约与错误路径）、**验收与外发都保持 human-only**（可以拆存储与状态词，不拆"谁能验收"）、**导出保持只读回**（按钮文字里的"不发送"是有意的）。

**自己撞出来的第二处过期句在本文件自己身上**：§9 那条"写进文档的数字现在有闸门了"还写着「当前 4 条」并举 `导航 19 项 / CLI 子命令 16 / HTTP 路由 58`。闸门看不见它——`verify_documented_counts.py` 比对的是它自己 CLAIMS 里的模板串，不是这句对白话的举例——所以它是**人眼复核撞出来的**，不是门抓出来的。现改写为实测 `claims=11`：`route_views=21`、`cli=24`、`adapters=30`、`routes=64`、18 跳 / 4 跳两条链、以及「其余 34 项仍 FROZEN_DEFERRED」这一句在五份权威件上的逐字复述。教训记成一句：**修正句本身也是新断言**，写之前先跑那条检查。

**批次序列实跑**（Record 那一步不是可选项）：`record_import_verify.py --head` 在改前只报两行 NOTE，改后如实报出 `WORKTREE-MISMATCH docs/current/PRODUCT_DEFINITION.md`（声明 `crc=efe38284 size=11466`，实测 `e3728ae2 / 12288`）与 `ROADMAP.md`（`4d2ef63b / 9564` 对 `33926668 / 9879`），走 `declare_record_evolution.py` 把两行绑到真实提交 `442cc71b`，回读 `RECORD_VERIFY=OK rows=492 worktree_verified=479 mapped_copies_verified=220 blob_eol_only=12`，单测 `test_record_import_fidelity` 4 项 OK。`DOCUMENTED_COUNTS=PASS claims=11`、`PATH_REF_GATE=PASS checks=10`。本批**没有**动产品代码、账本与 schema，所以 34 项 `FROZEN_DEFERRED` 与钉住的六份权威件字节一字未改。

**本批自己造成的缺陷，按 §6.8 同一条形状又犯了一次**：插入 §5.14 时把锚点定在下一节的标题行 `## 6. 本轮暴露并修掉的六个缺陷` 上，替换后那一行被吃掉，六个缺陷的正文变成无题悬空。当场用 `grep "^## 6"` 发现并补回，净差异回到 +12/−0。也就是说 §6.8 记过的教训（**never anchor an insert on the neighbour's own line prefix**）在这轮之前只是被写下、没被执行；本批把它当作插入纪律复检的一条固定动作：改 markdown 结构后必须 `git diff --numstat` 看删除数，删除数不为 0 而本意是纯新增，就是锚点吃掉了邻居。

### 5.15 第十三批（三份读回债付掉，以及我自己的 schema 被自己种的红）

`schema_less=40` 里的三条读回还清：GET `…/rights`、GET `…/research`、GET `…/native-runtime`。做法仍是那一条配方，不留半态——schema + live 载荷用例 + 账本行翻 `BOUND_SCHEMA` 并重测 emitter 行号 + 测试钉死清单同步。三条 envelope 都**先取真字节再写文档**：`rights` 用三个真项目（一份 APPROVED＝CLEARED、一份 APPROVED＋DENIED＝NOT_REVIEWED 且有真实 `unapproved_scopes`、一份没人填过），`research` 用一条被 supersede 的真链加一份空账本，`native-runtime` 用**同一路由读两次**——先在没有任何 native 表时读（五段全 ABSENT、五个计数全 null），再在播种一条持锁 attempt 链之后读（五段全 PRESENT 且各自带真行）。emitter 行号是从源文件重算出来的，不是抄的：`rights_review.py:101→48`、`research_review.py:94→40`、`native_runtime.py:31→31`，取的都是 `_READBACK_VERSION = '<version>'` 那一行。被包的记录一律 `$ref` 不重述：rights 决定引 `schemas/contracts/rights-decision.schema.json`，research 结论引 `schemas/research-finding.schema.json`；为此 `registry()` 现在第二轮装载 `contracts/`，且只登记没人占用的 `$id`（全库 127 个 `$id` 实测 0 冲突），所以既有绑定的解析结果一字未变。

**读数**：`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=13 failures=0`（rights 3 例 10 处对象位、research 2 例 5 处、runtime 2 例 14 处）；`VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 inert=30 routes=66 dispatched=66 bound=29 schema_less=37`；单测 `test_contract_bindings` 36 项 OK、`test_route_payload_contracts` 26 项 OK。

**我自己种出来的第一条红，是真窟窿**。我给 runtime 的计数写成 `["integer","null"]` 就以为锁住了 absent/present；把 ABSENT 项目的 `hosts_held` 从 null 改成 0 种下去，闸门一声不响。也就是说这份 schema 当时允许"这台服务从没跑过原生 attempt"被读成"没有主机被占"——恰好是这条路由存在的理由。修法是八条 if/then 把每个计数段与其表的 `table` 值双向锁死（ABSENT ⇒ 该计数必须是 null，PRESENT ⇒ 必须是 integer），种的那条假话随即被 `SCHEMA_VIOLATION` 判红，并且这条播种现在常驻在出厂测试里，不再是我手下的临时探针。教训与 §6 那几条同形：**属性类型相同不等于关系被绑定**。

**第二条红是覆盖面的，不是产品的**：`test_every_family_is_covered_by_its_own_real_cases` 的 `expected` 字典只列出它当时想到的绑定，`brief-readback` 与 `evidence-projection` 从来不在清单里——我新增三条后把断言改成"清单必须与 `build_bindings()` 全集相等"，第一次跑就报出这两个历史缺口。一个只证明自己列举过的总体的闸门，加不加新面都一样绿；现在漏列即红。

**Adobe 两条为什么仍然挂着（不是忘了，是不肯用假付款换计数）**：`POST …/native-plans` 与 `POST …/tasks/(native-job-…)/patch` 声明的 `design-lab/photoshop-native-job/v1`、`design-lab/adobe-patch-job/v1`、`design-lab/photoshop-patch-job/v1` 都不是本服务写出的 envelope——实测 `POST …/native-plans` 的响应是 native_submission 读回，作业文档只在 adapter 内部构造（`photoshop_com.py:121-157` 手写键集、路径审批、画布预算、checkpoint 头校验）。因此补一份没人装载的 schema 文件正是这块账本点名要禁的事（同一账本对 `adobe-host-job/v1` 的判词就是"有文件但没有 src/ 模块读它，所以它不校验任何东西"）。诚实的付法是让那两个 adapter 边界装载 schema，属产品代码改动，且本机不做真实宿主 E3；记在此处而不是顺手改成 `BOUND_SCHEMA`。

### 5.16 第十四批（提示词结果落库：把"逐跳绿灯"改成"一条产物身份贯穿"）

审计闭环表里最硬的一条是"结果保存与版本＝缺关键一段"：两条提示词路由产出一份完整带版本文档之后就把它丢了，`apps/workbench/shell.ts:8278` 的现行注释自己写着"服务端不持久化这份文档"，所以 18 跳链证明的只是**同一台服务器上多个接口能顺序调用**，不是**同一份专业产物走过了分析→验收→留存**。本批补这一刀，全程不留半态。

**落了什么**（`git ls-files` 与 `grep` 实测，不是计划）：新表两张（`design-lab/schemas/state/design-lab-state-prompt-results-v1.sql`：`prompt_result` 追加式、`prompt_result_review` 追加式，`reviewer_kind` 在**表上**被 CHECK 钉成 `'human'`，并对 `(project_id, result_id)` 建复合外键——签名不能指向一条不存在或不属于本项目的结果，这不是约定而是不可表示）；两张表都拒绝 UPDATE/DELETE（触发器），与 model_selection/research/rights/jury 同一血统；`src/design_lab/prompt_results.py` 在写入前用 `interop.load_schema` 对三份新合同校验；`POST …/prompts` 与 `POST …/assets/<id>/prompt-reversal` 现在**先落库再回答**，落库失败就是这一跳的回答（代理不许返回 201 却什么都没留下）；新读回 `GET …/prompt-results` 与新签署 `POST …/prompt-results/<id>/review`。响应体一字未改——两份 prompt 合同是闭合键集，把"存了第几版"塞进去会让文档合同变成 envelope 的附件，存储事实改由读回路由披露。**记账与闸门同批跟上**：账本 `routes 66→68`、`bound 29→31`，两条新路由都是 BOUND_SCHEMA 且 emitter 行号从源文件重算；`verify_workbench_route_calls.py` 的 `BACKEND_ONLY` 收了两条带"应在面板落地时删除"的过期理由（本批不动界面，界面是下一刀）；`project_backup.COUNTER_QUERIES` 加两张表并由 `test_backup_watches_written_tables`（5 项 OK）证明写入面不再对它们失明。

**贯穿的证据**：`test_standalone_chain_http.py` 的验收链由 18 跳变 **20 跳**——新增 `prompt-results=200`（两份文档都在库里，存下的 `content_sha256` 等于产生它那一跳发布的 `document_sha256`，且新产物读回为 UNREVIEWED）与 `prompt-accept=201`（具名人工签署，签名引用的摘要=该行摘要）。第 17 跳的知识候选不再 `from test_knowledge_http import candidate` 原样搬运无关固定件：它的 `evidence_sha256` 取自本次被签署的组合，两个编号用字面量 `UNUSED`，导出段随之回显 `provenance.job_id=UNUSED / job_id_state=EXPLICITLY_UNUSED / v1_projection.source_id=UNUSED:UNUSED`。`test_prompt_results.py` 18 项把"存的就是给你看的字节"、同 id 不同摘要＝409 碰撞、`executed=true` 不可入库、无来源不可入库、Agent 签署 400 且理由里点名 2026-10-21 裁定、跨项目签名 404、直接 SQL 也改不动删不掉、以及"有一行读不出来"必须报 `unreadable_count` 而不是假装没有产物。

**读数**：`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=14 failures=0`（prompt-result-readback 3 例 91 处对象位——被包文档按 `$ref` 拉到自己的合同上比，不是在本文件里重述）；`VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 routes=68 dispatched=68 bound=31 schema_less=37`；`VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=107 routes=66 matched=53 backend_only=13`；`DOCUMENTED_COUNTS=PASS claims=11 routes=66`（"20 跳验收链 / HTTP 路由 66 = 37 GET + 29 POST"两句现值由闸门对回代码）。单测定向全绿：prompt_results 18、standalone_chain 4、contract_bindings 36、route_payload 26、backup_watches 5。

**三件自己造出来的东西，都写在这里。** 第一件是**闸门的报错路径自己崩了**：`scripts/verify_documented_counts.py` 在发现某句过期时把模板当正则用，而 `'**{n} 跳验收链**'` 以 `**` 开头是非法模式——我把跳数从 18 改成 20 之前，它本该报"这句过期"，实际抛的是 `re.PatternError: nothing to repeat`。一个只在失败时崩的仪器等于把失败藏起来；现在先 `re.escape` 再替换转义后的占位符。第二件是**我差点把已经说对的行改错**：审计包正文把 PDF/UA-1 写成 "ISO 19005-1"（19005-1 是 PDF/A-1），而仓库登记件里写的本来就是正确的 `ISO 14289-1`——按审计去"修"就会把对的改成错的；已把这条差异记进项目记忆并保留 C 档未核验状态。第三件**是 §6.8 与 §5.14 已经点名过的那个形状，我在同一批里又犯了一次**：插入 §5.16 时 again 把锚点定在下一节标题行上，`## 6.` 再次被吃掉，`git diff --numstat` 报 `+14/−1` 才暴露。区别只在于这次是我明知故犯——§5.14 里我自己写了"改 markdown 结构后必须看删除数"，而这次我在写完 §5.16 后先去跑别的检查，没有立刻看 numstat。**教训的具体形状因此变了**：不是"要知道这条规则"，而是"结构编辑的下一步必须是 `grep '^## 6\.'` 与 numstat，不许插入别的动作"。补回后净差异 `+14/−0`。

**一件没做的事，说清楚为什么不做**：本机分片全量（`run_python_tests_all.py --shards 3 --jobs 1`）跑到一半被我主动停掉，不是失败——本仓库的既有记录写明本机沙箱跑不出干净聚合（safe-delete shim 中途 `SystemExit`、Windows 造不出锁的用例），而 `git commit` 会移动 HEAD，让 `test_projection_freshness` 在运行中报出我无法与真问题区分的红。权威判定由该精确 SHA 的 CI `PYTHON_TESTS_UNION` 给出；本批的本地信号是那五个定向套件与上面三道闸的实测读数。

**收尾序列里被闸门抓出的第三件事：我刷新了契约普查，却漏了契约图。** `verify_design_lab` 的 76 项里 `verify_projection_freshness` 报 `FRESHNESS-DRIFT reports/current/CONTRACT-GRAPH.json — fields changed since generation: ['declared_tables']`：两张新表进了 `declared_tables`，而 `scripts/generate_current_reports.py` 不生产那份投影，它由 `scripts/verify_contract_graph.py` 自己写。这条红是**闸门的正确判决**，不是噪声——工作树静止、聚合闸自跑、只有一项红，红里点名了变化的字段。修法是重跑该脚本（`CONTRACT_GRAPH=NO_BROKEN_LINK concepts=11 complete=11 breaks=0`，diff 里恰好是两行新表指向新的 state SQL），再重钉一次投影。教训形状：**普查与图是两份派生件，加表要各刷一次**，`generate_current_reports.py` 不代表所有派生面已经跟上。


### 5.17 第十五批（规范出处第二轮取证：两条仍取不到，一条被我自己写错过）

owner 的要求是"按网上最专业的先收入库里，落地我自行测试"，登记件的价值全在出处诚实。第二轮用只读子智能体重跑，每条记录实际 URL、HTTP 结果与页面原话。

**结论是两条仍是 UNKNOWN，而且这次把"为什么取不到"写成了可复算的清单。** PDF/UA-1：iso.org 的 `/standard/71374`、`/38369`、`/64599` 与 `/obp/ui` 一律 **403**（整站拦非浏览器客户端），pdfa.org 根页与三条子路径仍 403，本轮新试的三条国家标准渠道 `webstore.ansi.org` **403**、`knowledge.bsigroup.com` **404 "Product not found"**、DIN webstore 连接失败——版次不补、不猜，C 档保留。IEC 61966-2-1：`webstore.iec.ch/en/publication/78` 这轮直接读到页面自己印的 "CISPR 25:2008 … Withdrawn (2016-10-27) … Superseded by CISPR 25:2021"，确认那个编号从来不是 sRGB；IEC 检索面 404。新取到的可打开侧页是 ICC 的色彩编码登记 `registry.color.org/rgb-registry/srgb`，原话 Reference "sRGB"、Def "IEC 61966-2-1:1999"、"see Amendment 1"、"Updated April 2015"，并写明该国际标准"available through National Standards Bodies"——按**只可引用**登记，不当作 IEC 出版记录。

**三家设计语言的版本面本轮被实测否证了一次**：登记件第四节原先写着"Apple 的 `.../tutorials/data/design/human-interface-guidelines.json` 实测可用"，而那一族 JSON 现在**全部 404**；可打开的是纯 Markdown 姊妹页 `…/human-interface-guidelines.md`，它只给 frontmatter `"metadataVersion" : "0.1.0"` 与 "Copyright © 2026 Apple Inc."，**没有任何编辑日期**——0.1.0 是内容元数据的 schema 标记，登记里明确写了它不是 HIG 版本。Material 侧 `m3.material.io/sitemap.xml` 给出 `<lastmod>`（首页 2026-07-08、/blog 2026-10-06），登记为"站点最后修改日，不是规范版本"；Fluent 侧 /whats-new 404、/get-started/whatisnew 自述无带日期条目，页面上唯一版本串是 "DOMPurify version is 3.4.15"——那是随页打包的净化库，登记件里专门写了一行**不得把它当 Fluent 版本**，因为这类误认一旦写进登记就会被后来者当出处。

**顺带纠正一处外部误记，而不是照它改**：随包审计把 PDF/UA-1 写成 "ISO 19005-1"（19005-1 是 PDF/A-1），仓库这一行本来就是 `ISO 14289-1`。按审计措辞去"修"会把对的改成错的，所以只在登记里记下这个差异。`ACCESSIBILITY_BASELINE.md` 的 PDF/UA 那条也按审计要求处理清楚了：它是本项目自己的**做法**（分剖面记录 + 附校验器证据），不需要出版方出处；需要出处的是"符合 ISO 14289-1:YYYY"这类带版次断言——已在原位标注取证前不得这样写。

**本批只动 `packages/capabilities/standards/**` 与本登记件**，不碰产品代码，也**没有新增判据**：现行对比度判据仍是 WCAG 2.2 AA，APCA 仍是 B 档行业动向记录，改阈值要 owner 裁定。

### 5.18 第十六批（B3 桌面半：面板改成能签字，浏览器链把这件事写进回执）

§5.16 落了存储与路由，页面还写着"两条都不落库"。这批把桌面端接上：`apps/workbench/shell.ts` 新增结果面板（修订 / 类型 / 身份尾号 / 摘要尾号 / 生成时间 / 签署状态），`executed` 仍为真时单独点出，签字表单固定 `reviewer_kind:'human'`，裁决人没署名就在本页拒发，不发请求。owner 2026-10-21 的三条裁定都在界面上可见：不落模型执行、不外发、只读回。

实跑读数（本机，2026-10-21/22）：`npx tsc --noEmit` 无输出；`npm run test:unit` 出 "APPSHELL REGRESSION: all checks passed" 与 "shape-notice coverage: all bindings reported"；浏览器链 `E2E_REQUIRED=1` → `Ran 2 tests … OK`，回执 `"result": "PASS"`、`consoleErrors: 0`、`bundleSha256 10df5e3a01a713959914009adc06d3b83d9db9ee58b27d6145ec7a338e27ace7`。链里第 14 节走的是真页面：选中未被取代的 brief → 点生成 → 等 `option` 值匹配 `^(prompt|reversal)-[0-9a-f]{32}$` → 逐行断言"没人签过/UNREVIEWED" → 匿名签字被本地拒 → 署名后读回 ACCEPTED 与 `E2E Reviewer` → 面板不得出现 `已发送|发送成功|delivered|模型已执行`。

**这两轮把证据从 stdout 搬进了回执。** 子进程 stdout 被 Python 包装器在成功时吞掉，直接跑 mjs 又只会得到 `E2E_CONFIG_MISSING`，所以"链跑过第 14 节"原本只能靠人眼看日志。现在 `browser-e2e-summary.json` 的 `scenario` 里多一条 `prompt-result-compose-store-sign`，并带 `promptLoop`（本次实测 `{"resultId":"prompt-76f1ab5da4f7b5d28daacc40051cf6fc","unsignedRow":true,"signedRow":true,"reviewerShown":true,"overclaim":false}`），`E2E_REQUIRED=1` 时包装器直接断言这几项——跳过这一节的运行不可能再被读成 PASS。

自己造的三处红，都记下来：`selectOption({index:1})` 选中的是**已被取代的 v1 brief**，服务器按合同回 409 STALE_REVISION；改成按文本挑未取代的那条。第二个更坏——守卫写了 `/UNREVIEWED/`，而面板自己的说明文字里就有这个词，于是断言**为错误的原因变绿**（真因是 compose 还在飞，状态是"正在提交，等待读回"）；改成等 option 值本身，并逐行断言。第三处 `shape-notice-coverage.mjs` 拒绝新读回路径没有 `shapeNotice`：读回的字段缺失必须被说出来，不能用"未读回"糊过去。`verify_workbench_route_calls.py` 的 `CANDIDATES` 探测词表原本没有 prompt-result 的 id 形状，会让新 POST 被误报 `FRONTEND_ROUTE_UNSERVED`，有意扩了词表（不是扩产品面）。同批把 `test_contract_bindings.py` 里硬写的 `routes=66` 改成从台账派生——CI 在 81dc4fc2 就是被这行写红的（本地 35bddcfd 的主运行仍显示这一条为唯一 FAIL，见 §5.21）。提交 `6ca44f46`（状态：IMPL_LOCAL + TESTED_LOCAL；CI 读数见 §5.21）。

### 5.19 第十七批（B2b：Adobe 的作业契约，写出来就必须被读到）

`design-lab/tests/test_contract_bindings.py` 的欠账清单最后剩两条，都是 Adobe 作业形状：`POST …/tasks/<native-job>/patch` 声明 `design-lab/adobe-patch-job/v1`（与 `photoshop-patch-job/v1` 同一路由），`POST …/native-plans` 声明 `design-lab/photoshop-native-job/v1`。这三份 schema 逐条只重写适配器**已经在做**的手检：键集精确、`jobId`/`rirHash` 形状、`checkpointSha256` 64 hex、Illustrator 的 `operations` 常量表、Photoshop 的画布边长与输出名。没写的也不是摆设——画布**面积**上限、路径包含、checkpoint 字节、输出文件尚不存在，JSON Schema 看不见这些，reason 里逐条点名为仍然由手检负责。

关键一条：**schema 不能只写不读**。台账原句就是在定"声明了却没人读"这个罪，所以同批把装载接进 `illustrator_com.py` / `photoshop_com.py`：各自一个 `JOB_CONTRACTS` 版本表，`execute()` 在任何 COM 调用前按 body 里的版本取文件校验，取不到文件或不认识版本都是预检拒绝（`outcome_unknown=False`）。没动的 130 个既有 execute 调用点全绿：`test_illustrator_com_adapter.py` 10 项、`test_photoshop_com_adapter.py` 18 项、`test_native_tasks.py` 47 项、`test_native_quiescence.py` 3 项。

新增的牙齿有两条正向断言与两条种的红：装运夹具必须**通过**自己的契约（否则下一条红可能只是读不到文件），以及手检从未判过的字段现在被拒——`layers` 必须是列表、`artboard`/`authorization` 必须是对象。第三枚探针反而把我自己的假设照出来了：我给 Photoshop 原生作业种了 `layers=[['id','image']]`，它合法通过，因为**原生路径**根本不读 layers 的元素；`_photoshop_patch` 会逐个索引元素，所以"每项是对象"这条只在 patch 契约里写，探针也移到 patch 形状上。欠账清空后 `test_a_debt_row_cannot_be_laundered_by_deleting_the_version_line` 与 `test_schema_less_row_whose_debt_is_already_paid_is_red` 失去了天然的受害者（今天已无带版本的 SCHEMA_LESS 行），两者改为**把已付的 Adobe 行洗回去**作为种植方式，并在测试里写清牙齿搬到了哪两个文件。闸门实测：`VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 inert=30 routes=68 dispatched=68 bound=33 schema_less=35`，`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=14 failures=0`，该模块 36 项 OK。提交 `ee46de6a`（IMPL_LOCAL + TESTED_LOCAL）。

### 5.20 第十八批（B5：第一条 CONSUMED 必须是"量出来的"，并且同一把扫描器要能判红）

`packages/capabilities/selected-sources.json` 的阶梯一直是 8 条 REGISTERED_ONLY + 2 条 MAPPED、0 条 CONSUMED。这批把 `SRC-T07-MOTION-COMPOSITED` 升为 CONSUMED，证据级别 E1 → E2，`capabilityState` 保持 `structural-pass`（受控运行时不是宿主级隔离运行）。判据原文只禁布局属性（`width/height/top/left/right/bottom/margin*/padding*`），所以新闸门的禁用集合与文本扫描器**完全一致**——`design-lab/tests/test_workbench_motion_gate.py` 里有一条对照断言：文本扫过 7 个 `appliesTo` 文件得出的条数必须等于浏览器读到的条数，两条闸门对同一字节只能给一个答案。

实跑读数（`MA_SUMMARY`）：21 个导航项 → 21 个不同 location、22 次扫描、9614 条 CSSOM 规则、88 个 `@keyframes`、154 个关键帧步进、8995 个渲染元素、布局动效 **0** 条；同一把扫描器先必须判出植入缺陷的 **3** 条（`@keyframes dlMotionPlant` 的 from/to + `.dl-motion-plant{transition:width}`）。刻意不判的两项写进回执而不是沉默：`transition: all` 132 处、`stroke-dashoffset` 等非布局动画 110 处——本闸门不自造比判据更严的标准，但把它看见的交出。回执绑定字节：`styleSha256`/`bundleSha256` 由测试与盘上文件对账。

自己造的坑，五个，全部记原样：① 第一版按 `rule.keyFrames` 识别关键帧，Chromium 用的是 `keyRules`（`cssRules` 为别名），于是 4 个 `@keyframes` 一个没读到；② 更坏的一版把分组判断写成 `if (rule.cssRules) { walk(); continue; }`，而 CSS 嵌套让**每条普通样式规则**都有了 `.cssRules`，结果 `styleRules=0` 而页面照样"零违规"——这正是"绿闸门读的是空输入"这一类，靠 `keyframeRules/styleRules` 覆盖率计数才被抓住；③ 植入用 `addStyleTag` 被产品的 CSP `style-src 'self'` 直接拒绝，改成 constructed stylesheet，不为过闸门而放宽产品策略；④ 该 Chromium 的 `document.styleSheets` **不含** `adoptedStyleSheets`（实测 `adopted=1, sheets=1`），扫描器改为两个集合都走，否则"页面用了构造式样式表"这种真实写法会扫成干净；⑤ 原有的 CONSUMED 种植测试把 proof 指向自己所在的文件，而那个文件为了新的正向断言开始引用规则名与标准名，于是"缺测试"这一条再也不响——种植改用 `design-lab/config/contract-bindings.json`，同时正向测试 `test_the_one_shipped_consumed_landing_is_a_browser_measurement` 把 consumed=1 的成立条件写成测试而非散文。另有一处依赖隐式值：种植原先假设 `evidenceLevel` 仍是 E1，现在必须自己降级。

新文件同时进了三处人口登记，否则会被"只证明自己列出的清单"放过：`verify_browser_e2e_ran.py` 的 `TEST_MODULES`（注册表是元组不是 glob，未登记的浏览器套件会永远跳过而无发现）、`test_gate_reachability.py` 认得到的 `.mjs` 名单、以及 `LICENSE_COVERAGE=OK` / `VERIFY_EXECUTION_PATH_GATE=PASS files=8` 两项卫生闸门。本轮没有在本机跑整条 no-skip 浏览器套件：机器上有 WORK-LAB 与 ArcheAxis 的并行作业在跑，全套浏览器闸口在竞争下极慢，而 CI 的 required 作业才是权威——本机只定向跑了新模块（1 项 OK）与 §5.18 的链。`SELECTED_SOURCES=OK records=6 registered_only=8 mapped=1 consumed=1 motion_deviations=0 citations=VERIFIED(13)/SKIPPED(0)`，该模块 39 项 OK。

### 5.21 CI 读数与本批边界（逐作业，绑定精确 SHA）

**`f4b727e15ccf551a0fb58b74d26f8b7bd94fc26a` 已推到 `main` 与 `qoder/designlab-backup-consistency-20261007`，主运行 39654042652 `conclusion=success`**，逐作业（照 artifact 原样转录，不重组判决）：Python gate success、DeepSeek authority gate chain success、Workbench strict-TS product gate success、MiniGame node gate (+drift) success、Generated-artifact clean-tree gate success、Clean wheel install + Workbench launch gate success、License & secret hygiene gate success、Open Design host adapter gate success、Top-level Authority consistency gate success、Workbench browser E2E (exact-SHA controlled-runtime, no-skip) success、CI artifact proof (H001) success；Branch light gate `skipped`——该作业按设计只在开发分支跑，不是缺失。备份分支上的轻量运行 39654053174 同样 success。

Python 闸门的计数回执：三个分片全 `exit=0`——`shard=1/3 tests=947 outcomes={'PASS': 945, 'SKIP': 2}`、`shard=2/3 tests=1143 outcomes={'PASS': 1127, 'SKIP': 16}`、`shard=3/3 tests=1057 outcomes={'PASS': 1053, 'SKIP': 4}`，`PYTHON_TESTS_UNION=OK expected=3147 distinct=3147 ran=3147 duplicates=0 missing=0 unexpected=0`。上一轮同一条是 `expected=3139` 且 shard=3/3 有 1 项 FAIL（`test_contract_bindings.GateTeethTests.test_verdict_line_is_what_the_aggregate_matches`）——**本批把它转绿了**，3139 → 3147 的 +8 就是本批新增的测试数（Illustrator 3、Photoshop 3、精选来源 1、motion 包装器 1）。CI 只出计数不出测试名，所以这句对照是按作业 id 与两次读数写的，不是从名字表里读的。

浏览器 no-skip 作业逐模块回执：`test_workbench_design_layer_e2e ran=2 skipped=0 failed=0`、`overflow_gate ran=3`、`contrast_gate ran=3`、`theme_geometry_gate ran=1`、`theme_affordance_gate ran=1`、`ui_audit_gate ran=1`、**`test_workbench_motion_gate ran=1 skipped=0 failed=0`**，合计 `BROWSER_E2E ran=12 skipped=0 failed=0` → `BROWSER_E2E: PASS (ran, no-skip, no-skip policy satisfied)`。这条对本批有分量：§5.20 那条 CONSUMED 的度量闸门在 CI 的 pinned playwright + chromium 下**没有跳过**，植入的 `adoptedStyleSheets` 缺陷在该浏览器构建里同样被判出——若那边的 Chromium 构建与我本机不同，`MA_SELF_TEST_INCONCLUSIVE` 会红，而不是把 0 违规当成通过。

状态分级（不要把上一级当成下一级）：B3 桌面半、B2b、B5 三条均为 **CI_VERIFIED_EXACT_SHA @ f4b727e1**（本地实跑在前，逐作业读数在后）。§5.17 那批（B4，`35bddcfd`）的内容闸门全绿，但它的主运行被同一行硬编码测试判为 failure，该红已由本批取代；因此 B4 的准确说法是 **BRANCH_PUBLISHED + 内容闸门绿 + 其唯一 FAIL 已在 f4b727e1 转绿**，不是"当时就 11/11 success"。仍未执行、也未因这次推送而改变的：release、安装态分发、真实宿主 E3、真人 E4、ComfyUI、MiniMax H3；`currentExecution` 34 项仍 `FROZEN_DEFERRED`；手机端仍是排除项。

### 5.22 第十九批（规范出处第三轮，以及我自己把登记件写红的两次）

**第一次是序列错误。** §5.21 把 CI 读数写进审计件之后，我推了 `26cb7975`，但没有重跑 `scripts/generate_archive_record_register.py`——而审计件本身就是登记件的第 5 行。CI 的 Top-level Authority 作业随即报 `RECORD_REGISTER_GATE=FAIL checks=5 problems=5`：`blob SHA-1 claim d1577174b595 vs f793d9d7e265`、`bytes claim 89,924 vs 92,342`、`SHA-256 prefix claim 8214ee17858b3735 vs fba2e65ac0fcbe5f`、`bullet disagrees with table (path or digest)`、`bullet 5: digest no longer matches the committed blob`。这条红是闸门的正确判决：我在"重测登记件"之后又改了同一个被登记的文件——最后一个写者就是它的所有人。修法是把**所有内容编辑放在重测之前**，再按原序列走：`f6af3825` 上四脚本本地复跑全绿（`TOP_AUTHORITY_GATE=PASS checks=10`、`PROJECT_DRIFT=PASS findings=0`、`PATH_REF_GATE=PASS checks=10`、`RECORD_REGISTER_GATE=PASS checks=5 problems=0`），聚合 `VERIFY_DESIGN_LAB=OK total=76 failed=0`。

**第二次是本件自己写错的一句读数。** 第三轮取证用只读子智能体跑了八条以上新渠道，主会话再直连复核关键一条，结果**推翻的是我自己上一轮的登记**：`developer.apple.com/tutorials/data/design/human-interface-guidelines.json` 本轮 **200**（原样给 `"copyright": "Copyright © 2026 Apple Inc. All rights reserved."` 与 `"schemaVersion": {"major": 0, "minor": 3, "patch": 0}`，仍无任何编辑日期或规范版本），而 §5.17 与登记件第四节写的是"那一族 JSON 全部 404"。两轮读数不同就登记两次：不删旧读数、不把新读数说成"一直如此"，也不因为"现在能打开"就把它当版本证据。同轮另两条：Fluent 的 `learn.microsoft.com/en-us/windows/apps/design/` 在 HTML `<head>` 里服务端就给 `ms.date: 2026-10-07`、`updated_at: 2026-10-08T15:21`、`git_commit_id: a6d48a8e…`、`ms.update-cycle: 365-days`（登记为文档页编辑日期与提交号，**不是** Fluent 2 版本号）；Material 侧仍只有 `sitemap.xml` 的 `<lastmod>`，`/get-started` 与 `/blog` 的服务端 HTML 不出版本、日期与许可。

**两条 C 档欠账仍未结，渠道清单变长了。** PDF/UA-1：ISO 与 PDF Association 仍 403，NEN **503**，Beuth→DIN Media 301 后 **404**，EAN/TBS 与 Wayback 连接失败，BSI 产品页仍在 404 族——唯一新增是第三方索引对出版方页面的字段捕获（Edition 2 / Publication date 2014-12 / 17 页 / ISO/TC 171/SC 2 / 前版本 2012 已撤回），按捕获登记，**不升级为已核验版次**，`ACCESSIBILITY_BASELINE.md` 里带版次的符合性断言因此仍未解禁。IEC 61966-2-1：`webstore.iec.ch/en/publication/2960` 打开的是 "IEC 60695-4:2012 … Fire hazard testing"，把"换个编号猜"这条路堵死；`/en/search?q=…` 404、searchresults 与 preview PDF 连接失败、`sfs.fi`/`standard.no`/`nen.nl`/`sist.es`/`aenor.com` 无命中——出版记录仍 UNKNOWN。三者版本号一律 UNKNOWN 不变。

**这批不动判据**：现行对比度判据仍是 WCAG 2.2 AA，APCA 仍是 B 档行业动向记录。`INDUSTRY_SPEC_REGISTER.md` 是出处件，没有闸门给它出判决；同一目录里的 `MOTION_ACCESSIBILITY.md` 却由 `verify_selected_source_adaptation.py` 逐字核对 `ruleId` 是否出现在正文——**同目录两种强度**，改错文件时才分得出来。

### 5.23 第二十批（后端 A/B/C/D：把 Stitch 的 D01/D05/D07/D08 需要的字段先做成真的）

owner 的分工是"后端你按审计报告做，前端我交给 STITCH，做好再告诉你接入"。所以这批不动视觉、不动导航形状，只把设计稿要求、而 API 目前答不上来的字段做成能答的。

**A（D01 首页台账）**：`GET /api/projects` 原先只回 `{id, name, created_at}`，页面要么猜、要么每项目每资源各打一次。现在回 `design-lab/project-list/v1`：逐项目给 14 个表面的记录数、最晚时间戳、以及"还没人签"的两个数。**这批真正的合同是一条双向绑定**：某个计数为 null **当且仅当**该表面的表在此检出从未建过（并且表面名出现在 `absentSurfaces`）——0 是"表在、这个项目一条没有"。种的红两条方向各有测试：给未建表的表面报 0、把已报 absent 的表面写成有数，都被 schema 判红；`project_index.py` 在出口前自校合同，违反就是 500 `PROJECT_LIST_CONTRACT_VIOLATION`（测试用替换 `_one` 的方式把谎种进构造器，证明拒绝发生在服务端而不是纸面）。**没有第二套判定**：未签/已过期走 `prompt_results._state_of`（与读回同一函数，抽出后两处共用），候选侧直接取该资源自己读回的计数；漂移测试手工插一条引用了别的摘要的签名，要求读回与台账同时说 `NOT_CURRENT`、且 `accepted_count` 为 0、`unreviewed` 为 0——这是仓库里第一次真正构造出该状态。

**B（D05 能力库计数）**：`counts.qualified` 算的是"有资格判定记录的数量"，但字段名读起来是"合格数"；今天两者都是 0，所以这不是当前错误而是将来的错误。拆成 `qualificationVerdicts / qualifiedTrue / qualifiedFalse / qualificationNotAdjudicated` 四个数，schema 的 required 与 closed properties 同步，UI 那句话改成四个数并排，`contracts.ts` 与离线夹具一起换。测试里加了旧 schema 给不了的分区不变式：`total = verdicts + notAdjudicated`。

**C（D07 候选导出）不是缺口，实测后取消**：`KnowledgeReview.list` 每行已经带 `export_ready` 与 `export_blocked_by`，信封已有 `export_ready_count / pending_review_count / revoked_count / conflicts / head_sha / outbound`，而且 `test_knowledge_http.py:236 / :281` 正反两向早就断言过。所以本批给 C 的交付是这条实测记录，加上台账里的 `knowledgeCandidatesExportReady` 与读回数字必须一致（不一致就是两处各算一套的开端）。

**D（D08 记录与取消语义）也没有缺口，但有一句本批写错后当场改正**：任务记录已含 `state`、`updated_at` 与 `cancel.{requested, acknowledged}` 两个布尔——设计要的"取消已发"与"宿主确认已停"在数据上是两件事。**这一版原先写"`acknowledged` 目前没有通往 true 的宿主事件"，核对源码后不成立**：`job_store.acknowledge_cancel` 在 `CANCEL_REQUESTED` 之上把它置 1 并推到 `RECONCILING`，变更说明原文 "adapter acknowledged cancellation; readback still required"；`native_tasks._failed` 在派发前被拒（`effect_not_started`）的取消路径同样置 1。真正的限制因此是语义而不是可达性：它说的是**适配层已确认**，不是宿主已停手、也不是产物已核对——界面可以显示"已确认取消，仍需读回"，不得画成会自己变绿的进度。这条错句是"追正本身是新断言"的现场版：我把它写进登记件之前没有打开那两个函数看。给 `GET …/tasks` 补信封 schema（`surface` 判别、状态词汇取自 `design-lab/config/state-vocabularies.json` 一处、100 条上限与 `truncated`/`next_cursor` 同一表达式、`does_not_say` 点名上面那条语义）留下一批做，它顺带能付掉台账里那两行"recorded debt"——其中一行理由还引用了**不存在的文件** `design-lab/schemas/status-vocabulary`（实测无此路径；真正的词汇合同是 `design-lab/config/state-vocabularies.json`，由 `verify_state_vocabularies.py` 守），正是 §3 那一类"路径写错但读起来像出处"的旧账。

**闸门与实跑**：`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68 bound=34 schema_less=34`（A 把 `/api/projects` 从 SCHEMA_LESS 翻成 BOUND_SCHEMA，理由里点名 POST 半边仍未绑——一次 dispatch 两种载荷，不假装整行付清）；`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=15`，其中 project-list 用两条真实载荷：这条检出（表面被前面用例开过，计数是整数）与一个一次性新根（什么都没开过，全部 null 且被点名）。定向：`test_project_rollup` 6、`test_capability_library` 14、`test_contract_bindings` 36、`test_route_payload_contracts` 26、`test_service_http` 31、`test_prompt_results` 18、`test_design_layer_http` 20、`test_knowledge_http` 22 全 OK；`tsc --noEmit` 0、`npm run build` 0（bundle 446.18 kB / gzip 119.84 kB）、`npm run test:unit` 0（47 处 seam 形状告警覆盖不变）。聚合第一次报的单项红是我自己的序列错——改了 `capability_library.py` 却没刷 inert 普查，`inert_contract_survey.py` 重跑后（`productFiles` 219→220）`--check` 转绿；这条红与 §5.22 同一形状：**派生件必须在内容写完之后重测**。

**前端只做了两处文字**：能力库那句计数说明，和 `/api/projects` 读回的 seam 声明——`apiOrEmpty` 是拿离线模板与真实载荷对形状的，台账换了信封之后把模板写成页面真正读的 `{projects: []}`（`ProjectListView`），路由发出的其余字段由 `ProjectListResponse` 声明。把离线模板扩成新信封的第一版做法被自己的形状守卫连坐了两处夹具（"形状完整的响应不得出现形状告警"、"研究洞察没有读回 …/research"），那是断言在正确工作，收窄 seam 声明才是修法，改完两处夹具仍保留真实信封形状。

**状态**：IMPL_LOCAL + TESTED_LOCAL @ `de1bde57`；CI 逐作业读数见 §5.24（这一行写的"回填在本节末"没有做到——那批推上去后有两个作业红，我把读数写在下一节，并且不改动这里的原文）。边界不变：推理执行仍未接、`model.executed` 恒 false、签署与审核仍只接受具名 human、导出仍只读回；E3/E4/E5、ComfyUI/H3、`currentExecution` 34 项、手机端排除项一字未动。

### 5.24 第二十一批（后端 D：三条任务读回合成一份信封、付掉台账那两行 debt，并修掉 A 自己漏给 CI 的两条红）

owner 的分工没变（「现在你按照审计报告来做后端 前端我交给STITCH 做好了 再告诉给你接入」），本批仍只做后端。要做的两件事就是 §5.23 末尾留下的那两件：给 `GET …/tasks`、`GET …/tasks/<job>`、`GET …/tasks/<job>/events` 补信封 schema，并顺手把 `contract-bindings.json` 里那两行 "Recorded debt, not a clean boundary" 付掉。

**信封（`src/design_lab/task_queries.py`）**：三条读回共用一个版本 `design-lab/task-readback-v1`，`surface` 是判别字段（`list` / `task` / `events`），`design-lab/schemas/task-readback-v1.schema.json` 要求每个 surface 只带自己那一个载荷键、并明写禁止另外两个——一条路由不能在被要一条记录时回一个列表。分页事实由同一个表达式算出来：两条 SQL 都是 `LIMIT PAGE_LIMIT + 1`，`truncated` 与 `next_cursor` 来自同一次比较，所以载荷不可能一边说"到底了"一边还揣着游标；合同把这三条写死（`truncated=false ⇒ next_cursor=null`、`truncated=true ⇒ 游标非空`、`count=0 ⇒ truncated=false`）。状态词汇**不在这里重打一遍**：`attemptStates` 读自唯一拥有它的 `design-lab/config/state-vocabularies.json`（由 `verify_state_vocabularies.py` 守），读不到就是 503 拒绝而不是"少给一个字段"——页面拿到空词汇表会退回它上次构建时记住的那些词，那比报错更坏。作业级状态词没有命名集合，`operationStates.declaredAs` 就照实说"写在 `job_store.py` 的 `_op()` 落点里的行内字面量"，并回读本页实际出现过的词（`observedInThisPage`）。`does_not_say` 三条，第三条就是 §5.23 更正后的取消语义：`cancel.acknowledged` 是适配层确认，不是宿主已停手，也不是产物已核对。

**自己写错的一处，当场改掉**：`image_assets.ImageAssetError` 的构造只有 `(status, code)` 两个参数，我先按三个参数写了拒绝分支——那条路径真走到时抛的是 `TypeError`，不是一个具名拒绝。改成新的 `TaskReadbackError(status, code, detail)`，并在 `http_service.py` 的两条任务路由上把 detail 一起发出去："词汇文件读不到"和"这页声称到底了却还带游标"是两件不同的事，一张只有红色错误词的任务卡说不出该修哪一个。

**台账**：`GET …/tasks` 与 `GET …/tasks/<job>(/events)` 两行从 `SCHEMA_LESS` 翻成 `BOUND_SCHEMA`（emitter `src/design_lab/task_queries.py:24`），理由里同时更正两处过期说法——原文引用的 `design-lab/schemas/status-vocabulary` **这个路径不存在**（真正的词汇合同是上面那个 config），而"这两条读回由 native_execution_v1 表构建"也不对，行来自 `job / operation_intent / operation_state / attempt_state / attempt_resolution`。这正是 §3 那一类"路径写错但读起来像出处"的旧账，付债的时候一并清掉。

**A 批欠 CI 的两条红（逐作业读数 @ `95829383`，`MAIN=failure`）**：① `Python gate (V3 verifiers + unit tests)` 单条失败 `test_service_cli.ServiceCliTests.test_create_then_new_process_lists_persisted_project`——它断言"新建进程里列出的项目 == 创建时回显的那条记录"，而 A 把列表换成了台账信封；本地我从没跑过这个模块，三个分片的 union 仍是 `expected=3153 distinct=3153 missing=0`，缺的就是我这批改出来的新断言面。② `Clean wheel install + Workbench launch gate`。根因是 §D09 那一类的复发：`PROJECT_ROOT = Path(__file__).parents[3]` 在检出里是仓库根，在安装态是解释器自己的 `Lib`，于是 A 的 `ProjectIndex` 打不开它自己的合同文件，`/api/projects` 回 500，启动器打印 `status: ERROR`。**这条红是我自己造出来的，不是环境噪声**，而且它在源码检出里永远看不见——只有安装态会踩。

**修法与新的牙齿**：`project_index.py` 与 `task_queries.py` 都改走 `runtime/state_resources.repo_resource()`（打包优先、且只有当这个模块确实是检出里的那一份才允许回落到检出），`pyproject.toml` 的 `force-include` 加三行把 `project-list-v1.schema.json`、`task-readback-v1.schema.json`、`state-vocabularies.json` 装进 wheel。为这类缺陷补了一个闸门 `design-lab/tests/test_packaged_contract_resources.py`：**从磁盘枚举** `src/design_lab` 里所有 `repo_resource('…')` 字面量，逐条要求 pyproject 声明了对应打包路径、并且仓库里那个文件还在；第四条是手检——把 `project-list` 那行声明从 pyproject 文本里删掉，检查必须翻红，否则它什么都守不住。

**安装态实跑（不是推断）**：`uv build --wheel` → `uv venv` 干净环境 → `uv pip install <该 wheel>`，跑 CI 那条原话 `DL_LAUNCH_INSTALLED=1 python -m unittest design-lab.tests.test_workbench_launch`：**`Ran 3 tests` / `OK` / 输出里没有 `skipped`**，正是 CI 那三条 grep 要的形状。植入检查：把 `site-packages/design_lab/resources/repo/design-lab/schemas/project-list-v1.schema.json` 移走再跑，`'ERROR' != 'LISTENING'`、`FAILED (failures=1, errors=1)`，装回去复跑 `OK`——这条红能被这一行字节引起，说明绿线是被打包带住的。另外从装好的包里起一次真实服务读两条路由：`package=…/venv-clean/Lib/site-packages/design_lab`、`srcShadowed=False`、`project-list=design-lab/project-list/v1 surfaces=14 absent=13 waitingNulls=4`、`task-readback=design-lab/task-readback/v1 surface=list limit=100 truncated=False cursor=None attemptStates=9 doesNotSay=3`，wheel 成员 354 个。

**读数**：`VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 inert=30 routes=68 dispatched=68 bound=36 schema_less=32`（A 把 `/api/projects` 翻正、D 把两条 tasks 翻正，34/34 → 36/32）；`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=17 failures=0`，其中 `task-readback-list` 与 `task-readback-detail` 各两条真实载荷：一条是什么都没记的页，一条是带着**已被适配层确认的取消**的页，后者走 `job_store.begin_attempt/transition/request_cancel/acknowledge_cancel` 而不是手写行。种子改用 `job_store.connect()` 而不是 `NativeTasks._connect()` 是被自己的用例逼出来的：后者会建 `native_execution_v1` 表，把 `native-runtime-readback` 那条"表还不存在时读到的 ABSENT"用例洗成 PRESENT——那是那条用例存在的唯一理由。`STATE_VOCABULARIES=OK attempt_states=9 errors=0`。定向：`test_task_readback_envelope` 10、`test_packaged_contract_resources` 4、`test_contract_bindings` + `test_route_payload_contracts` 72、`test_service_http`/`test_service_cli`/`test_project_rollup`/`test_native_tasks`/`test_native_submissions` 100 全 OK；全量 union 与聚合 `VERIFY_DESIGN_LAB=OK total=76 failed=0` 读数记在本节末（提交前重取）。

**没做与不宣称**：前端一行没动——`/tasks` 的界面仍读 `{tasks, next_cursor}`，信封的其余字段由后端发出、等 STITCH 的面板来接；`apps/workbench/contracts.ts` 把 `next_cursor` 写成 `string | null`，对事件页是**不精确的**（那里的游标是 `event_no` 整数），这是既有不精确、本批不偷偷扩界面，接入时连同 `TaskRecord` 一起按信封改正，写在下一轮提示词里。级别仍是 E1 结构合同 + E2 受控运行时：没有宿主参与，`cancel.acknowledged` 不等于宿主已停手，也不因为补了 schema 就变成 E3。**状态**：IMPL_LOCAL + TESTED_LOCAL；推到两个 ref 后按该精确 SHA 逐作业读的 CI 结果**回填在本节末尾**（不是另开一节，也不改上面任何一句旧读数）。

**CI 逐作业读数 @ `91186bc7`（两个 ref 同指这一枚；run `39800445236` = `completed success`，分支轻闸 run `39800431447` 也 success）**：11 个重作业全绿，逐条为 `CI artifact proof`、`Clean wheel install + Workbench launch gate`、`DeepSeek authority gate chain`、`Generated-artifact clean-tree gate`、`License & secret hygiene gate`、`MiniGame node gate (+ drift check)`、`Open Design host adapter gate`、`Python gate (V3 verifiers + unit tests)`、`Top-level Authority consistency gate`、`Workbench browser E2E (exact-SHA controlled-runtime, no-skip)`、`Workbench strict-TS product gate`；`Branch light gate` 按 D01 规则在 main 运行里 skipped。**§5.23 欠下的两条红这次都在原作业上转正**：`Python gate` 三个分片 `exit=0`，`PYTHON_TESTS_UNION=OK expected=3167 distinct=3167 ran=3167 duplicates=0 missing=0 unexpected=0`（本地同群体第一次跑 shard=1/3 时报过 2 个 ERROR——`test_capability_library_clean_install` 的两条安装态用例；把那 83 个模块 1105 条在同进程重跑是 `OK (skipped=2)`、单跑该模块也 OK，本机没能复现，**因此这条只记为"本地一次读数与 CI 不一致，以 CI 为准"**，不写成已解释的缺陷）；`Clean wheel install` 作业里 `Ran 3 tests in 1.816s` 且步骤的三条 grep 都过，也就是说 `/api/projects` 的读回在安装态第一次真的被跑到了。E2E 作业按 no-skip 政策实跑 `2 + 3 + 3` 条。

**装机面的债清单（同一根因，量出来才写，不靠先例推）**：在干净安装的 wheel 上逐条调用账本里的 37 条 `GET /api/…`。分母要说清：**只用一个真实项目 id 就能构造出 URL 的是 23 条**——14 条给 2xx、6 条给出它本该给的判决（`404 NOT_FOUND` 指向不存在的 id、`400 TASK_REQUIRED`、`403 SAME_ORIGIN_REQUIRED`），另外 **14 条需要真实资产/简报/方向 id，本轮没有调用，那是"没测"不是"没问题"**。三条**因为自己的合同文件走 `PROJECT_ROOT` 而在安装态读不到**——`GET /api/models` → `503 MODEL_CATALOG_UNAVAILABLE`、`GET …/prompt-results` → `500 PROMPT_RESULT_CONTRACT_UNREADABLE`、`GET …/design-layer` → `500 INTERNAL`。`GET /api/evidence-projection` 的 `503 EVIDENCE_LEDGER_ABSENT` **不算这一类**：那个临时根里确实没有台账，是它该有的判决。同一形状的路径表达式全仓还有 29 处、分布在 33 个模块里；本批只付了自己新加的两份，其余仍是装机态债，而源码检出里的任何测试都看不见它——上一版"PROJECT_ROOT 载入的合同不需要新 pyproject 条目"的判断就是这么来的：它拿 `model-selection` 当先例，而那个先例在安装态自己就是坏的。打包副本与检出字节一致（`state-vocabularies.json` 两侧同 `54460ab5…`，`task-readback-v1.schema.json` 两侧同 `df78e5db…`）。**状态**：CI_VERIFIED_EXACT_SHA @ `91186bc7`（分支与 main 两个 ref 同指此枚；本节之后的文字与投影重测另算一枚）。

### 5.25 第二十二批（后端 E：拿"装好的包"当准绳重度量，把整类装机面拒绝读路径付掉，并把这条验收钉进 CI）

owner 这句是「继续打磨后端」。既然 §5.24 量到的根因是"检出里看不见安装态"，这一批就不再用检出读法推定，而是**先把度量搬到安装包里**，再决定修什么。

**方法（两条，缺一不可）**：① 静态——从 `src/design_lab/http_service.py` 做 AST import 闭包（含函数内延迟 import），把闭包内所有由 `PROJECT_ROOT` 拼出来的仓库数据路径列出来，对照 `pyproject` 的 force-include：**18 条读取里 17 条没有声明行**，全部真实存在于检出。② 动态——用 `uv build --wheel` 出来的包装进干净 venv，把 `design-lab/tests/test_standalone_chain_http.py` 改成能 honour `DL_LAUNCH_INSTALLED=1`（沿用 `test_workbench_launch` 已有约定：置位时不把 `src/` 插到 sys.path，好让 `import design_lab` 真的落到 site-packages；`design-lab/tests` 仍要插，这个模块从兄弟测试借夹具，抽掉它会红在错的原因上），并在 `setUp` 里先验布局再跑跳：包路径必须含 `site-packages`，`/api/health` 的 `bundleOrigin` 必须是 `packaged`。
**①单独不够，这条是这批最该记住的一点**：静态扫认的是 `PROJECT_ROOT` 这个名字，而 `assurance/production_preflight.py`、`assurance/delivery_bom.py`、`governance/evidence_readback.py` 三处把同一个根拼成 `Path(__file__).resolve().parents[3]`——清单里看不见它们，是**安装态实跑**把它们抓出来的：`GET …/design-layer` → `500 INTERNAL`、`POST …/tasks/<job>/bundle` → `409 NATIVE_BUNDLE_UNVERIFIED`、`POST …/bundles/<id>/preflight` → `503 PROJECT_STORE_UNAVAILABLE`。第二条最坏：**一个缺失的打包文件伪装成了一条语义判决**（"这份产物没被核对"），而真实原因是"合同字节不在这里"；第三条则把矛头指到用户的数据库上。这两条都不是新缺陷，是 §3 那一类"读起来像结论"的形状第一次在安装包里被照出来。

**修了什么**：20 处读取改走 `runtime/state_resources.repo_resource()`（17 条静态 + 3 条动态），`pyproject` 的 wheel force-include 补 20 行。`design-lab/readiness` 用**目录行**而不是两条文件行：TOML 里同一个源键不能出现两次，而 `model-radar.json` 早已作为能力库的四个输入之一被打包在 `resources/capability-library/` 下——那条继续留着（库自己按那个根解析），新行服务 `repo_resource`。三处 provenance 字段原本是 `SCHEMA_PATH.relative_to(PROJECT_ROOT)` 现算的，改路径后会把 `ValueError` 顶上来，因此改为模块级字面量 `SCHEMA_REPOSITORY_PATH`，**值与今天逐字相同**（`design-lab/schemas/…`）。

**装机面复测（同一把尺子）**：账本里 37 条 `GET /api/…`，能用一个真实项目 id 构造的 23 条中 **2xx 从 14 条升到 17 条**，§5.24 点名的三条拒绝全部转正。`/api/evidence-projection` 仍回 `503 EVIDENCE_LEDGER_ABSENT`，**这条要在 §5.24 上做一处更正**：它并非"临时根没有台账"，detail 明写 `design-lab/config/task-ledger-r3.json is not in this checkout`，而它判的那个根是 `…/venv-clean/Lib`——判决本身仍然正确（安装的产品里确实没有治理台账），但它命名的不是项目根。§5.24 原文不改，按本条为准。
**验收链在装好的包上跑通**：4 条用例全绿，`CHAIN_HOPS project=201 asset=201 brief=201 direction=201 design-layer=200 analysis=201 catalog=200 model-choose=201 prompt-compose=201 prompt-reverse=201 prompt-results=200 prompt-accept=201 jury-verdict=201 jury-readback=200 rights=201 rights-readback=200 candidate=201 review=200 candidate-readback=200 export=200` 与 `DELIVERY_HOPS project=201 native=READBACK bundle=201 preflight=200`。植入检查：把 site-packages 里的 `resources/repo/design-lab/production/profiles` 整个移走，`design-lab/tests/test_standalone_chain_http.py` 立刻三条 ERROR，异常原文 `FileNotFoundError: packaged repository resource missing: production/profiles`——**拒绝发生在导入时，没有悄悄回落到检出**；移回来复跑绿。wheel 从 1,034,230 B 到 1,068,459 B（+34 KB，装进去的是合同字节，不是素材）。

**自己的闸门抓了自己一次**：改完源码后 `VERIFY_CONTRACT_BINDINGS=FAIL`，8 条 `EMITTER_POINTER_NOT_THE_VERSION`——我删了这些文件里的若干行，账本里 `path:line` 的发射器指针就落到了注释和别的语句上（§5.24 记过同类一次，这是第二次）。按当前行号重钉 8 条（`evidence_readback.py:29→30`、`design_layer.py:63→64`、`production_preflight.py:378→383`、`prompt_intelligence.py:184→48`、`:292→49`、`model_selection.py:228→39`、`prompt_results.py:46→45`、`:47→46`），转 PASS。**这条不是可选项**：`test_packaged_contract_resources.py` 从磁盘枚举 `repo_resource('…')` 字面量，所以本批新增的 18 个调用点若少一行声明就红；该测试的覆盖自陈也扩到 9 个具名读取（含 `production/profiles`、`schemas/bom.schema.json`、`readiness/model-radar.json`）。

**CI 里多了永久的一步**：`.github/workflows/canonical-verify.yml` 的 clean-wheel 作业追加 "Walk the acceptance chain against the installed package"——断言 `Ran [1-9][0-9]* tests`（**不钉死用例数**，上一批 `routes=66` 那种硬编码红过一次）、`^OK`、无 `skipped`，且 `CHAIN_HOPS` 与 `DELIVERY_HOPS` 两行都被打印。这一作业从此既是安装态冒烟也是全链回归。

**闸门与实跑**：`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68 bound=36 schema_less=32`（计数未变——这批改的是"从哪里读合同"，不是"哪条边界有没有合同"）、`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=17 failures=0`、`INERT_SURVEY=OK rows=30`、`STATE_VOCABULARIES=OK`、`WORKBENCH PACKAGING: all 5 … passed`；定向源码 `test_delivery_bom`+`test_evidence_readback_contract`+`test_production_preflight`+`test_artifact_preflight_ui_contract` 78 OK，`test_interop_dtcg`/`test_interop_provenance`/`test_readiness_host_matrix(_gate)`/`test_readiness_model_radar`/`test_assurance_jury`/`test_assurance_knowledge_feedback`/`test_brief_readback_contract`/`test_jury_http`/`test_knowledge_http`/`test_packaged_contract_resources` 218 OK，`test_standalone_chain_http` 源码模式 4 OK、安装模式 4 OK、`test_workbench_launch` 安装模式 `Ran 3 tests / OK`。**状态**：IMPL_LOCAL + TESTED_LOCAL（聚合与全量 union、CI 逐作业读数在本节末回填）。

**边界与级别**：这一批把"独立可运行"的主张从**源码检出**扩展到**安装好的包**，证据级别仍是 E2 受控运行时——同一台机器、合成夹具、无真实宿主、无真人验收；`preflight=200` 不等于产物可用，`export=200` 不等于已发送。E3/E4/E5、ComfyUI/H3、`currentExecution` 34 项、手机端排除项、字体与三方素材出范围，一字未动。

**第三步：把度量工具本身做成有正向对照的审计件**。上面两种读法各有一个盲区，所以把它们固化成 `design-lab/scripts/audit_repo_root_reads.py`：它从 `http_service.py` 走 import 闭包，用 AST 认出 `<根> / 'a' / 'b'` 的拼法，并逐条问 `pyproject` 是否把该路径装进 `design_lab/resources/repo/`（`repo_resource` 唯一会去读的目录下），同时支持"整目录声明覆盖其子文件"。写它的时候先犯了个真错：**检测器只认 `ast.Call`，而 `Path(__file__).resolve().parents[3]` 在 AST 里是 `Subscript`**——于是它对三处 parents 拼法全部视而不见，并给出一个漂亮的 "0 remaining"。这个"0"是假绿，被 `--control` 抓到：控制项从 git 取 `91186bc7` 的修复前字节喂给同一个 `scan()`，认不出病就等于检测器坏了。现在报告是 `REPO_ROOT_READS=REPORT paths=1 not_shipped_under_resources_repo=1`，那一条是 `adapters/photoshop_com.py` 的 Adobe 桥——它**本来就先读 `design_lab/resources/adobe/`**（另一个打包前缀，pyproject 有意如此），且只在真实宿主派发时打开，而派发冻结。工具的两条限制写在文件头并记在这里：① 先把根存进变量再拼的两步写法不追（修复前的 `delivery_bom.py`/`evidence_readback.py` 与 `illustrator_com.py` 都属于这类）；② 前缀不同的合法 packaged-first 读法会被报成 NOT-SHIPPED。**因此这句不是"静态证明干净"，而是"禁止新增同类读路径"**：`design-lab/tests/test_packaged_contract_resources.py` 里两条新用例把这条报告变成闸门——`--control` 必须 `CONTROL=OK`，`NOT_SHIPPED` 集合必须落在上面那条白名单内，且 `paths=0`（空群体）本身判红。装机面真正的主张由行为闸门扛：CI 的 clean-wheel 作业在安装包里跑 20+4 跳。

**两条本批自己量出来的尾巴，都按"看得见"而不是"吸收掉"处理**：① 证据台账的漂移清单涨了 4 对。`test_evidence_artifact_presence.py` 看守的是"哪条记录把它描述的代码当工件、而那段代码后来动了"——本批改的 `delivery_bom.py`、`design_layer.py`、`governance/evidence_readback.py`、`interop/dtcg.py` 各被一条 2026-10-08 的记录绑定，字节一变就到期。按该文件的既有做法：**旧记录一字不改**，在清单里加四条带日期的行并写明原因，总数从 60 钉到 64；这 4 对是用该测试自己的度量重新量出来的（actual 64 / pinned 60，差集恰好这四个名字），不是从上文抄的。
② 全量 union 在这台机器上稳定复现 2 条 ERROR，**原因这次拿到了 raise site**：`test_capability_library_clean_install` 的两条安装态用例要把 wheel 解包到临时根，而解出来的最深一条路径是
`…\.project-local\task-runtime\python-tests-shard-1\<32hex>\tmp\dl-t05-site-xxxx\design_lab\resources\repo\design-lab\domain-packs\uiux-design\benchmarks\ecommerce-pdp-checkout-golden\implementations`，
Windows 报 `[WinError 206] 文件名或扩展名太长`。上一批（本批之前）的本地 union 已经是同样这两条、同样位置，Linux 上三次 CI 全绿——**这是本机路径长度上限，不是代码缺陷，也不是本批引入**；`_installed_site()` 在检出内的 `.venv` 被判为"源码布局"而回落到解包，是它踩中的机制。修法要么给该用例一个更短的临时根，要么只解包它真正需要的成员；在拿到这两条之一的实测前，不把"CI 绿"写成"已解释"。级别不变：这两条本机红不改变 §5.25 上面任何一条装机面读数，那些是从 site-packages 真实解析（`site-packages` + `bundleOrigin=packaged`）跑出来的。

**本批最终读数**（回填完成）：CI 逐作业——代码枚 `2102ba8b`（打包修正）run `39821106405` 与本批尾枚 `f804af9f`（审计工具 + 两条闸门用例）run `39823168783` **均 `completed success`**，11 个重作业全绿、`Branch light gate` 按 D01 规则 skipped；`Clean wheel install + Workbench launch gate` 作业里新加的 **"Walk the acceptance chain against the installed package" 步骤为 `success`**（这一步按构造无法靠"没跑"变绿：它要求 `Ran [1-9][0-9]* tests`、`^OK`、无 `skipped`，并且 `CHAIN_HOPS` 与 `DELIVERY_HOPS` 两行都被打印）。Python 闸门：`2102ba8b` 为 `PYTHON_TESTS_UNION=OK expected=3167 distinct=3167 ran=3167 duplicates=0 missing=0 unexpected=0`（三分片 exit=0），尾枚 `f804af9f` 为 `expected=3169 distinct=3169 ran=3169 missing=0 unexpected=0`——多出的 2 条正是审计工具的两条用例。**状态：CI_VERIFIED_EXACT_SHA @ `f804af9f`**（main 与备份分支同指此枚；下面的文字/投影重绑另算一枚，不改上面任何读数）。本机全量 union 的 2 条 Windows 路径长度 ERROR 见本节末 ②。

**闸门计数不变的原因**：`VERIFY_CONTRACT_BINDINGS=PASS routes=68 bound=36 schema_less=32` 与 `VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=17` 一字未动——本批改的是"合同从哪里读"，不是"哪条边界有没有合同"；`INERT_SURVEY=OK rows=30`、`STATE_VOCABULARIES=OK`、`WORKBENCH PACKAGING: all 5 passed`、聚合 `VERIFY_DESIGN_LAB=OK total=76 failed=0`（尾枚重跑同值）。wheel `1,068,459 B`。

### 5.26 第二十三批（后端 F：把装机面"没测"的那一半真测完，并修掉本机背了两批的路径超长红）

owner 这句还是「继续打磨后端」。§5.24 与 §5.25 各自留下一条明写的欠账——"14 条 GET 行没调用"和"本机两条安装态用例稳定红"——这一批就把这两条结清，不加新功能、不动前端。

**先更正我自己连写两轮的读数**：那两节写的是"账本 37 条 GET 行"。逐行数一遍是 **39 条**：我当时的过滤条件是 `route.startswith('/api/')`，把 `/workbench` 与 `workbench.ROUTES` 两行滤掉了却没说。分母写错不是无害的近似，它正是这批要修的毛病本身，所以原句保留不改，以本句为准。

**① 每一条 GET 都用真实对象调用一次**（`design-lab/tests/test_standalone_chain_http.py` 新增 `test_every_ledger_get_route_is_answered_in_this_layout`）：先用写入路由造出资产、简报、方向，再复用交付腿（`_deliver_to_preflight()` 从原来的交付用例里抽出来共用，不复制第二份）拿到交付项目、job、bundle 与 version id，然后把账本每行的 id 槽位换成**这台服务刚写进去的值**逐条调用。断言是双向的：每行必须在覆盖表里有一条读法，否则红——新增路由不能靠"没人加"溜过去；反过来，表里出现账本已不声明的路由也红。槽位缺值直接失败，不会把字面量 `{token}` 当路径发出去。5xx 只允许一张按布局分开的名单，而且**名单必须与实际发生的 5xx 完全相等**：不再发生的那条会让断言红，免得一个旧豁免悄悄给下一条 5xx 背书。
**读数**：源码布局 `routes=39 reads=39 answered=35 verdicts=4`，未点名 5xx 为 0；装好的 wheel 里 `routes=39 reads=38 answered=34 verdicts=4`，唯一被点名的 5xx 是 `/api/evidence-projection → 503 EVIDENCE_LEDGER_ABSENT`——安装的产品里没有可投影的治理检出，它点名缺哪个台账文件而不是给一张干净回执；同一条在源码检出里回 200，两侧名单互换即为红，所以这条不是被豁免掉的失败，是被读出来的差别。三条"仍然没读"逐条写明理由：`…/native-assets/<id>/verify` 需要先被登记的原生资产（交付腿注册的是 bundle 与版本，不是资产行）；`…/knowledge-candidates/<id>/export` 由同一布局里的验收链走到 `export=200`，本扫描不重复建候选；`workbench.ROUTES` 那行本来就不是 URL，是账本记的模块表名。**CI 的装机步现在额外要求日志里出现 `GET_SWEEP layout=installed`**——用例被重构空转时，作业不能照样绿。

**② 本机背了两批的那两条红**（`test_capability_library_clean_install`）：根因量清了——不是代码，是**这台机器的路径长度上限**：runner 把自己的临时根放在 `.project-local/task-runtime/python-tests-shard-1/<32hex>/tmp/`（133 字符），wheel 解包后最深的一条是 `…/design_lab/resources/repo/design-lab/domain-packs/uiux-design/benchmarks/<pack>-golden/implementations/<baseline|enhanced>.html`，377 个成员里正好 8 条超过 259 字符，**没有一条是探针要读的**。修法是逐成员解包 + **对"跳过了什么"下断言**：只允许 `resources/repo/design-lab/domain-packs/` 下的基准页被跳过，四个能力库输入若被跳过即红，其它任何成员跳不过；判据是**成员名而不是 errno**——同一台机器上同一类超长路径在 `makedirs` 处报 `WinError 206`、在 `open` 处报 `[Errno 2]`，我一开始按错误码过滤，实跑立刻不复现，这就是"按码过滤会悄悄再坏一次"的现场版。另加一条不对称用例 `test_an_unextractable_member_the_probe_needs_is_a_finding`，分别证明"需要的成员被跳过必须红"与"基准页被跳过必须放行"，否则这段豁免等于没测。
**验证**：在 runner 自己的深临时根下重跑该模块，`Ran 5 tests / OK / errors=0 failures=0 skipped=0`（此前稳定 2 ERROR）；植入仍然有效（把能力库输入从解包站点移走 → 探针必须拒绝，那条用例就在同一模块里）。这不是把测试关掉换来的绿。

**闸门与实跑**：定向 `test_standalone_chain_http` 源码 5 OK、装机 5 OK（两次都打印自己的分母），`test_capability_library_clean_install` 5 OK（含 runner 环境），`test_evidence_artifact_presence`/`test_packaged_contract_resources`/`test_route_payload_contracts`/`test_contract_bindings` 合计 78 OK；`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68 bound=36 schema_less=32`、`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=17 failures=0`（这批没改任何边界，只改了"有没有被读到"）。**状态**：IMPL_LOCAL + TESTED_LOCAL @ `74a461f4`；边界不变——E3/E4/E5、ComfyUI/H3、`currentExecution` 34 项、手机端排除项、字体与三方素材出范围、推理不接、签署与导出仍只本地具名 human，一字未动。级别仍是 E2：sweep 量的是"这台装好的服务答不答"，不是"产物好不好"。

**回填：CI 逐作业与本机绑定重跑（读数按精确 SHA）**
- 代码尾枚 `11e30625`（`74a461f4` 扫描 + `7b250581` 记录 + `5e621da3` 计数闸门跟进 + 投影重绑）run `39833406071` = **`completed success`**，11 个重作业全绿、`Branch light gate` 按 D01 规则 skipped。逐条：`CI artifact proof`、`Clean wheel install + Workbench launch gate`、`DeepSeek authority gate chain`、`Generated-artifact clean-tree gate`、`License & secret hygiene gate`、`MiniGame node gate`、`Open Design host adapter gate`、`Python gate`、`Top-level Authority consistency gate`、`Workbench browser E2E (no-skip)`、`Workbench strict-TS product gate`。
- **CI 那一步真的在安装包里扫完了全表**：作业步骤 `Walk the acceptance chain against the installed package` 为 `success`，其日志原文 `GET_SWEEP layout=installed routes=39 reads=38 answered=34 verdicts=4 unmeasured=3`，三条未读各自的原因也逐行打印（`UNCONSTRUCTED` / `COVERED-ELSEWHERE` / `NOT-A-PATH`）。步骤里有 `grep -q "GET_SWEEP layout=installed"`，所以这一步不能靠"没跑用例"变绿。
- `PYTHON_TESTS_UNION=OK expected=3171 distinct=3171 ran=3171 duplicates=0 missing=0 unexpected=0`（3169 → 3171 正是本批新增的两条用例：装机 GET 扫描与解包豁免的不对称用例）。
- **本机绑定重跑（②的关键证据，Linux CI 给不了）**：同一命令 `scripts/run_python_tests_all.py --shards 3 --jobs 1` 在这台机器上 `shard=1/3 exit=0 tests=1106 outcomes={'PASS': 1104, 'SKIP': 2}`、`shard=2/3 exit=0`、`shard=3/3 exit=0`、`PYTHON_TESTS_UNION=OK expected=3171`——上一批与这一批开头本机稳定复现的那 2 条 `[WinError 206]`/`[Errno 2]` ERROR **不再出现**，且不是靠跳过：同一分片用例数还多了 1 条。聚合 `VERIFY_DESIGN_LAB=OK total=76 failed=0`（推送前重跑同值）。
- 一处自己被闸门抓住的记录：把交付腿的夹具抽成 `_deliver_to_preflight()` 后，`verify_documented_counts.py` 报 `the …_delivery_leg… hop labels extractor matched nothing`——它按**方法名**在方法体里数跳数，重构把跳数搬走了。闸门拒绝报数是正确行为，修法是让度量跟着委托链走（`5e621da3`），而不是把重构回退；"4 跳交付链"那句现在量的还是那 4 跳。
- 本轮之后：**状态 CI_VERIFIED_EXACT_SHA @ `11e30625`**（main 与备份分支同指此枚；下面的记录与投影重绑是纯文字＋派生件，另算一枚，不改上面任何读数）。

### 5.27 第二十四批（后端 G：把写侧也搬进"装好的包"里度量，并让播种的故障把一处误判顶出来）

owner 这句仍然是「继续打磨后端」。§5.26 把读侧量完了，写侧却没有对应的度量：每个 POST 路由各自有测试，但每份测试都从检出里给自己播种夹具，所以"这台装好的服务能不能写"从未被任何一次运行摊开过。这批只做这件事，不加功能、不动前端一行。

**① 写侧覆盖表**（`design-lab/tests/test_installed_write_surface.py`，`3f542016`）：账本里带 POST 的行共 **29 条**（含 `('GET+POST', '/api/projects')` 那条创建行），逐行按对象依赖顺序真写一次，并**每条都用 GET 读回**。断言与读侧同构且同样双向：账本每行必须在这张表里有一条走法或一条明写的豁免，否则红；表里出现账本已不声明的路由也红；同一路由重复登记也红。槽位由上一跳真实返回的 id 填，缺值即失败，不会把字面量 `{brief}` 发出去当请求（这一点单独有一条用例守着，因为它只会变成一个没人细看的 400）。5xx 名单按布局分开、并与实际发生**完全相等**：多一条即红，少一条——曾经豁免过而这次不再发生的——也红。播种用例有四条：账本里插一条没人走的行必须被点名为"未度量"；把整张表清空必须报出全部分母；豁免名单与实际拒绝互换必须两头都响；槽位替换与 DTCG 花括号必须分得开。
**读数（同一把尺子两侧各跑一遍）**：源码布局 `POST_SWEEP layout=source rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`；装好的 wheel 里 `POST_SWEEP layout=installed` 后面**一字不差相同**。两侧都没有未点名 5xx，所以本批没有新增"三件套"要付——这不是侥幸，是 §5.25 那批把读路径全部改走 `repo_resource` 之后，写路径第一次被真的走到时给出的确认。wheel 实测 1,073,608 字节——其中删掉下面那条重复包装之前是 1,073,668，两次都当场量过。
**一条不走的行**：`POST …/tasks/<job>/run` 的体就一个 `attempt_id`，本扫描手里就有——但 `native_workers.start()` 会 spawn 一个 `design_lab native-worker` 子进程去派发真实创意宿主。owner 2026-10-19/21 的冻结与本轮"不触发任何真实宿主/模型执行"都在，所以它登记为 `FROZEN-BY-POLICY` 而不是"构造不出合法体"：**能不能构造体**与**准不允许做这次写**是两件事，混成一件就会让下一个读的人以为那是技术缺口。原生腿本身照 §5.24 的边界走：`_dispatch` 被 patch、scope 用字面量 `project-native-test`，产物是真字节并按 id 登记——这仍是 E2 受控运行时，不是 E3。

**② 播种把一处误判顶了出来**（`8b83652d`）：为证明这张表在安装布局里不是空转，我把 wheel 里的三个合同文件挨个移走再复跑。两次都是整模块 ERROR，原因同一枚且诚实——`task_queries.py` 在 import 期就 `repo_resource('schemas/task-readback-v1.schema.json')`，文件不在则服务根本起不来（`FileNotFoundError: packaged repository resource missing: …`）。第三次移走 `config/state-vocabularies.json` 时露出的就不是"缺文件"而是**判决本身**：`POST …/tasks/<job>/bundle` 回 **400 INVALID_REQUEST**。机制是 `TaskReadbackError` 继承 `ValueError`，而 dispatch 的兜底子句把所有 `ValueError` 一律写成 400——读侧两条路由（`_list_tasks`、`_task_detail_or_events`）在批次 D 各自就地包过，写侧那几条（bundle/patch/cancel/native-plans）顺手建同一份信封却没包。后果是把一句"服务器的合同文件读不出来"发给调用者读成"你的请求不合法"，与 §5.25 记过的 `PROJECT_STORE_UNAVAILABLE` 指错方向是同一类缺陷的第二个实例。修法按 dispatch 既有的家规：在通用 `ValueError` 子句**之前**加一条 `except TaskReadbackError`，原样带出 `exc.status` 与该码自己的 detail，并补一条不对称用例（`test_a_write_route_that_builds_an_envelope_names_the_contract_not_the_request`）——把这条子句删掉该用例必须红、留着必须绿，四步实测：带子句 OK、删子句 FAILED、恢复、再 OK。**没有**新增打包侧债务：那个配置文件本来就在 wheel 里（批次 D 已 force-include），这批修的是状态映射，不是可见性。**随后把重复的那一半收掉**：`dispatch` 有了具名子句之后，批次 D 给两条读路由就地加的 `_answer_task_read` 包装产出的拒绝体与它**逐字节相同**，等于一个字节面有两个人管。包装已删，三条调用点直接 `send_json(200, …)`，拒绝映射只留 dispatch 一处；`test_task_readback_envelope`/`test_service_http`/本扫描/验收链合计 **52 tests OK**，重装 wheel 后两侧读数一字不变。

**③ 顺带更正三处没人看守的散文指针**：`docs/current/NEXT-AGENT-PROMPT.md` 里"路由清单以 `http_service.py:93` 的 `ROUTES` 为准"、以及第 1、2 段里的 `:191`（POST assets）与 `:195`（POST analysis）在 HEAD 上分别应为 **94 / 203 / 206**。这不是本批改行号改坏的——本批的插入在 470 行之后，三处都在它上面，是更早的批次改动留下的、且**没有任何闸门会读它们**。§5.25 记过账本发射器指针被自己的闸门抓住；散文里同形状的引用坏了不会响，所以更危险。已按当次实测改写，并写明"以 `ROUTES` 表为准、不要抄这里的数字"。同时那句"共 66 条 = 37 GET + 29 POST"现在补了口径：66 是 `http_service.ROUTES` 的条目数（`/api/projects` 在那里是 GET 与 POST 两枚 Route），而账本是 68 行 = 39 GET + 28 POST + 1 `GET+POST`，两侧扫描各自的分母因此不同（读侧 39、写侧 29）。
**闸门又抓了我自己的记录一次**（与 §5.25 同形状，第二次）：把 `ROUTES` 那句写成"为准（2026-10-22 复测：66 枚 Route = …）"之后，`verify_documented_counts.py` 报 `prose says nothing, measurement says 66 (expected the sentence "ROUTES` 为准，共 66 条")`。它按**逐字锚句**在文档里找那个数字，我把锚句拆开了，于是它拒绝让一句"看起来更像"的话冒充测量。正确修法是把锚句原样留下、把补充口径写在它后面，而不是把闸门放宽成模糊匹配（`5e621da3` 那次同理）。
**随后把这两个分母也变成被测量的句子**：`verify_documented_counts.py` 新增两条 CLAIMS——`账本 **{n} 条 POST 行**` 由 `contract-bindings.json` 现数，`其中 **{n} 行**逐行真写` 由扫描表自己的 `WRITES` 条目现数。两个数**必须**不同（差的就是那条政策豁免），所以一句把它们混起来写的散文不能自洽。播种实测：写 30 → `prose says ['30'], measurement says 29`；写 29 走 → `prose says ['29'], measurement says 28`；照实写 → `DOCUMENTED_COUNTS=PASS claims=13`，`test_documented_counts` 同模块 OK。

**闸门与实跑**：定向 `test_installed_write_surface` 源码 6 OK / 装机 6 OK（两侧都打印自己的分母）、`test_standalone_chain_http` 源码与装机各 5 OK、`test_task_readback_envelope`/`test_packaged_contract_resources`/`test_contract_bindings`/`test_service_http` 合计 OK；`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68 bound=36 schema_less=32`（本批没动任何边界，只动了一次错误映射）、`DOCUMENTED_COUNTS=PASS claims=11 routes=66`。**状态**：IMPL_LOCAL + TESTED_LOCAL @ `3f542016`。边界不变：E3/E4/E5、安装态分发、release、ComfyUI/H3、`currentExecution` 34 项、手机端排除项、字体与三方素材出范围、推理不接、签署与审核仍只接受具名 human、导出仍只读回，一字未动；级别仍是 E2——这张表量的是"这台装好的服务写不写得进、读不读得回"，不是"产物好不好"。

**回填：CI 逐作业、步骤级日志与本机绑定重跑（读数按精确 SHA）**
- 一枚被自己抓住的中间红：`1ff547bb` 的 main 作业 **failure**，唯一一条红是 `test_documented_counts.test_every_documented_count_matches_the_code`——就是上面"锚句被我拆开"那一条。机制值得记：`verify_design_lab.py --check` 那 76 项**既不含**计数闸门**也不含**单元测试（该脚本里 `documented_counts` 与 `run_python_tests` 各命中 0 次），所以我推送前跑的聚合绿并不覆盖散文面。修法不是放宽聚合，而是"改过受治散文后单独跑 `scripts/verify_documented_counts.py` 与分片套件"。同一枚上 `Walk every POST row against the installed package` 步骤已是 `success`——红在别的作业，不在这条断言。
- **最终枚 `fa0cf178`（main 与备份分支同指此枚）run `39850923993` = `completed success`**：11 个重作业全绿（`CI artifact proof`、`Clean wheel install + Workbench launch gate`、`DeepSeek authority gate chain`、`Generated-artifact clean-tree gate`、`License & secret hygiene gate`、`MiniGame node gate`、`Open Design host adapter gate`、`Python gate`、`Top-level Authority consistency gate`、`Workbench browser E2E (no-skip)`、`Workbench strict-TS product gate`），`Branch light gate` 按 D01 规则 skipped。
- **CI 在安装包里真的走完了写侧**：该作业步骤日志原文 `POST_SWEEP layout=installed rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`；同一枚读侧仍是 `GET_SWEEP layout=installed routes=39 reads=38 answered=34 verdicts=4 unmeasured=3`。步骤里有 `grep -q "POST_SWEEP layout=installed"`、`grep -q "POST_SWEEP_WRITTEN"`、`grep -q "POST_SWEEP_EXCLUDED"` 与 `! grep -q "unearned 5xx"`，所以用例被重构成空转时作业不能照绿。
- `PYTHON_TESTS_UNION=OK expected=3177 distinct=3177 ran=3177 duplicates=0 missing=0 unexpected=0`（上一批 3171 → 3177 正是本扫描 6 条用例进表：`PYTHON_TESTS_MODULE_ALL 4.050s tests=6 test_installed_write_surface`），三片各自 `exit=0`。
- **本机绑定重跑（Windows 那一半，Linux CI 给不了）**：`scripts/run_python_tests_all.py --shards 3 --jobs 1` 三片 `exit=0`——`shard=1/3 tests=977 {'PASS':976,'SKIP':1}`、`shard=2/3 tests=1127 {'PASS':1124,'SKIP':3}`、`shard=3/3 tests=1073 {'PASS':1072,'SKIP':1}`（该片本机 1534.497s 对 CI 455.817s）、`PYTHON_TESTS_UNION=OK expected=3177`，**零 ERROR**：§5.26 修掉的那两条本机 `[WinError 206]`/`[Errno 2]` 没有回来。边界照实写：这次本机跑从 `6a05e347` 起跑，最后两枚（`276ea88e` 计数口径与散文、`fa0cf178` 投影重绑）落在跑的过程中，所以本机这条覆盖的是"写侧扫描 + 信封拒绝映射"这棵代码树；**最终枚的全套读数以 CI 那一条为准**，本批新增的两条计数断言在推送前各自跑过（播种 30/29 皆红、照实写 `claims=13 PASS`，`test_documented_counts` 同模块 OK）。聚合在最终树重跑同值：`VERIFY_DESIGN_LAB=OK total=76 failed=0`、`VERIFY_RESULT=OK total=549 failed=0`。
- 本轮之后：**状态 CI_VERIFIED_EXACT_SHA @ `fa0cf178`**（下面这条记录本身与投影重绑是纯文字＋派生件，另算一枚，不改上面任何读数）。

### 5.28 第二十五批（后端 H：把读侧最后一条"没调用"换成真调用，并先证它量的是字节）

owner 这句还是「继续打磨后端」。§5.26 清了 14 条没调用的 GET 行，却留下一条以自己写的理由关闭的洞——`…/native-assets/<id>/verify` 登记为 `UNCONSTRUCTED: verifying needs a registered native asset id, and the delivered fixture registers a bundle and its versions, **not an asset row**`。这句话是**错的**，而且它错得很像样：交付腿确实注册 bundle，但它同时也注册了那一行原生资产。批次 G 的写侧扫描把 `GET /api/projects/<id>/native-assets` 的答案原样打印出来，洞自己就露出来了：`{"id": "native-b5553c…", "kind": "psd", "version_id": "v-47f897…", "verification": "METADATA_ONLY"}` 就在手里。**先更正旧句，再改代码**：登记理由不删，以本句为准。

**① 那条读法换成真调用**：`GET_READS` 里那一格改成 `/api/projects/{delivery_project}/native-assets/{native_asset}/verify`，槽位由交付腿自己的列表读回答；列表若空，扫描立刻红（`the delivery leg produced no native asset row to verify`），这样"这条又没人走了"不能靠一句注释重新溜进来。`native_asset` 也进缺槽即红的名单，不再多一处能吞下未填占位符的地方。分母随之移动，两侧各跑一遍：源码 `reads=39 answered=35 unmeasured=3` → `reads=40 answered=36 unmeasured=2`；装机 `reads=38 answered=34 unmeasured=3` → `reads=39 answered=35 unmeasured=2`。剩下 2 条不是洞而是判决：候选 export 在同一布局的验收链里走到 `export=200`（本扫描不重复建候选），`workbench.ROUTES` 那行本身不是 URL。

**② 判决的含义先用播种钉死**（新增 `test_the_native_asset_verify_route_re_reads_the_stored_bytes`）：这条路由与列表行的区别只在它自己那一次重算——列表 `verification=METADATA_ONLY`，verify 答 `HASH_VERIFIED`。要断言"它读的是字节"，就必须让字节动起来：从账本 `artifact` 行取该版本真正的落盘路径（`…/assets/versions/<32hex>/native.psd`），把它改成**等长**的字节——只比大小的检查照样过——判决必须变成 `409 NATIVE_ARTIFACT_UNVERIFIED`；写回原字节必须回到 `HASH_VERIFIED`；一个形状合法但从未登记过的 id 必须 `404 NATIVE_ASSET_NOT_FOUND`。三步都在同一个用例里，且 verify 前后不改写文件（断言字节原样）。
**仪器自己的牙齿也验过**：把 `native_assets.py` 那行摘要比较改成永假，这条用例必须红。实测四步——带比较 `OK`；去掉比较 `FAILED（409 != 200）`；恢复原文件 `OK`；再跑一次 `OK`。这条播种不是走过场：去掉比较后判决**仍然**答 `HASH_VERIFIED`，也就是说没有这一步，"它重算了摘要"这句话本身是没人能推翻的装饰。

**③ 没有新增打包面债务**：这条路由读的是项目自己的资产库字节，不是仓库里的合同/配置文件；源码与装机两侧同值（`NATIVE_VERIFY layout=installed clean=HASH_VERIFIED tampered=NATIVE_ARTIFACT_UNVERIFIED unknown=NATIVE_ASSET_NOT_FOUND`）就是证据，因此三件套这一批没有要付的账。CI 的装机步现要求这整串出现——它把三个判决一次钉死，只答 200 的空转实现不能过。写侧扫描读数一字未动（`rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`）。

**闸门与实跑**：`test_standalone_chain_http` 源码 6 OK / 装机 6 OK，`test_installed_write_surface` 装机 6 OK，两模块合跑 12 OK；`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68`；改过受治散文后按批次 G 学到的那条单独跑了 `DOCUMENTED_COUNTS`。**状态**：IMPL_LOCAL + TESTED_LOCAL。边界不变：E3/E4/E5、安装态分发、release、ComfyUI/H3、`currentExecution` 34 项、手机端排除项、字体与三方素材出范围、推理不接、签署与审核仍只接受具名 human、导出仍只读回，一字未动；级别仍是 E2——这条路由证的是"存下的字节还是不是它自己"，不是"产物好不好"，也不因为能重算摘要就变成宿主读回。

**回填：CI 逐作业、步骤级日志与本机 Windows 证据（读数按精确 SHA）**
- **`d9976d0c`（main 与备份分支同指此枚）run `39859065304` = `completed success`**：11 个重作业全绿，`Branch light gate` 按 D01 规则 skipped。步骤级：`Walk the acceptance chain against the installed package` 与 `Walk every POST row against the installed package` 均 `success`，其日志原文一次给全三条读数——`GET_SWEEP layout=installed routes=39 reads=39 answered=35 verdicts=4 unmeasured=2`、`NATIVE_VERIFY layout=installed clean=HASH_VERIFIED tampered=NATIVE_ARTIFACT_UNVERIFIED unknown=NATIVE_ASSET_NOT_FOUND`、`POST_SWEEP layout=installed rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`（两模块各 `Ran 6 tests`）。CI 那一步现在把整串 `NATIVE_VERIFY …` 当作 grep 目标，所以"只答 200 的空实现"过不去。
- `PYTHON_TESTS_UNION=OK expected=3178 distinct=3178 ran=3178 duplicates=0 missing=0 unexpected=0`，三片 `exit=0`（3177 → 3178 正是这条新用例；`test_standalone_chain_http` 由 5 条变 6 条，`PYTHON_TESTS_MODULE_ALL 4.831s tests=6`）。
- **本机 Windows 那条只能在本机量的证据**：把三个模块放进取数器自己的深 TEMP（`.project-local/task-runtime/python-tests-shard-1/313d501449a54770ad3986c2a1ffdd82/tmp`，133+ 字符基底）跑，`Ran 17 tests / OK / exit=0`，无 `WinError 206`、无 `[Errno 2]`、无 skipped——§5.26 那处按成员名判定的解包豁免仍然成立，没有因为本批新增读法而回归。本机整轮 union 未跑完就被中止（该片在 Windows 上单片要 1500s 量级），**所以本枚的"全套通过"读数以 CI 那条为准，本机这条只覆盖 Windows 专有的路径长度面**，不写成全套。
- 一处自己差点留下的错，记下来：播种用的驱动把 `native_assets.py` 改坏再改回，它打印的 `restored identical: True` 比的是**解码后的文本**——那种比较看不见行尾改动，而本仓 `.gitattributes` 是 `*.py text eol=lf`。真正的对账是字节：工作树与 `HEAD` 同一 blob（`11c325be…`，5968 字节，0 个 CRLF），并且仓库自有的 `test_working_tree_line_endings` 在聚合里一直绿。**一条不会失败的校验不是校验**，它只是把事故改成了日志。聚合读数在最终树上：`VERIFY_RESULT=OK total=549 failed=0`、`VERIFY_DESIGN_LAB=OK total=76 failed=0`、`RECORD_REGISTER_GATE=PASS checks=5 problems=0`、`DOCUMENTED_COUNTS=PASS claims=13`。
- 本轮之后：**状态 CI_VERIFIED_EXACT_SHA @ `d9976d0c`**（下面这条记录本身与投影重绑是纯文字＋派生件，另算一枚，不改上面任何读数）。

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

## 6.8 第十个缺陷（写现行面时删掉了邻居的冻结条目）

给 `docs/current/NEXT-AGENT-PROMPT.md` 追加接口层普查那条时，`old_string` 只取了既有条目的**第一行**。编辑工具按整段匹配替换，于是连带把「ComfyUI/H3、外部服务、跨仓库写入、数据外发、E 盘访问：全部冻结/需授权」整条删掉，并把它的 AAOS 续句并进了我的新条目——一次自以为是"纯追加"的写入实际做了一次改写。删掉的这条是范围边界条款，在"现行面"上把它抹掉，等于对下一个会话放宽 owner 边界，比写错数字更严重。

发现靠的是把写回读回来，而不是靠 diff 看着顺眼：编辑后立即读该区域，看到两条被合成一条，再按"这条改动应当是若干行新增、零行删除"去验——`git diff --stat` 报 7 行新增却同时有删除，就是断言不成立的信号。修法是重新拆成两条，并确认提交的 diff 为 `1 file changed, 7 insertions(+)` 且**零删除行**。既有那条「往满行条目里追加时锚点要取完整边界」的教训在文档面同样成立，这次是它的一次复发，因此记进报告而不只记进记忆。

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

## 10. 像素回归实跑（§9.1 那条判断这轮被自己验了一遍）

上面第 1 条说"跨轮视觉回归不可用，因为 fixture 不冻结"。这句话本身是个断言，所以本轮用仓库自有工装（`scripts/capture_workbench_screenshots.py --widths 1440`）重采了 23 张，与改动前的基线逐张比对，产物全部落在 gitignore 的 `.project-local/task-runtime/ui-capture/` 下，没有覆盖任何基线，也没有动跟踪文件。

结论：**没有发现属于本轮三处可见改动之外的布局回归**；同时 §9.1 成立——整页 diff 比例在这套 fixture 下没有解释力。按布局带分开看：

| 带 | 变化 | 判读 |
| --- | --- | --- |
| 品牌块（x<300, y<140） | 23 张全部 **0 px** | 48×48 图块与首行没有动，这是本轮唯一直接改到该区域的改动，未产生意外位移 |
| 导航带（x<300, y≥140） | 每张 48–52 px | 取最干净的一对（`10-collaboration`，其内容带只差 2 px）逐行落位：7 行各 4 px 落在 `x=35..40`（每个导航点的左右边缘列，x 范围与行号与基线完全一致，只是边缘像素振幅差 10/255），另有 4 行各 2 px 落在 y=816/817/849/850——那正是 `b5e57911` 把页脚发丝线推下 12 px 的位置。前者是同一几何下的亚像素边缘差，不是位移，更不是换色 token |
| 内容带（x≥300） | 合计 260,539 px，但高度集中：`21-records` 106,666、`18-intake` 46,854、`15-domain-detail` 28,483，而 `10-collaboration` 只有 2 px、`05-brand-systems` 49 px | 直接并排看了 `21-records` 两张：基线是"制作记录 (0)"配空态句"空列表是读回结果，不是失败"，新图是"制作记录 (1)"配一条真实 `RECEIPTED` 作业行（`job-857a8ee…`、`att-4028758e…`），项目下拉里是 `Closeout 1792433865945` 对 `Closeout 1792439576861`。版式、间距、字号、徽标一致，差的全是播种数据与时间戳 |

两个仪器教训值得记：整页 `getbbox()` 在有活数据的页面上毫无用处——一个十六进制字符变了就能把框拉到 `x=1411`，所以第一版脚本输出的框全是"整页"，必须改成按带计数才看得见结构；以及"两张图差多少像素"这个问题问错了对象，该问的是"差在哪个带、几何有没有动"。

**基线没有被更新**：按回归评审自己的规矩，基线只能在 owner 认可实现结果后重制，owner 本轮未看这批图，所以旧基线原样留着。要让像素回归成为可用闸门，缺的不是阈值而是**一个冻结 fixture 的采集面**（播种项目名、冻结时间、固定作业行），那属产品工装，等授权再动。
