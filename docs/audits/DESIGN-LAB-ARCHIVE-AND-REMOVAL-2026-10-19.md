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
