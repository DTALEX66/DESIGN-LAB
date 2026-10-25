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

**闸门与实跑**：`test_standalone_chain_http` 源码 6 OK / 装机 6 OK，`test_installed_write_surface` 装机 6 OK，两模块合跑 12 OK；`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68`；改过受治散文后按批次 G 学到的那条单独跑了 `DOCUMENTED_COUNTS`，并把这条闸门补齐到本节的两个读侧分母：`账本是 **{n} 条** GET 行` 由账本现数（39）、`仍有 **{n} 条**没被这条扫描读到` 由扫描表里带标记前缀的条目现数（2），`claims` 由 13 增至 15。两条都各自播种证伪：写 40 → `prose says ['40'], measurement says 39`；写 3 → `prose says ['3'], measurement says 2`；照实写 `PASS claims=15`。**状态**：IMPL_LOCAL + TESTED_LOCAL。边界不变：E3/E4/E5、安装态分发、release、ComfyUI/H3、`currentExecution` 34 项、手机端排除项、字体与三方素材出范围、推理不接、签署与审核仍只接受具名 human、导出仍只读回，一字未动；级别仍是 E2——这条路由证的是"存下的字节还是不是它自己"，不是"产物好不好"，也不因为能重算摘要就变成宿主读回。

**回填：CI 逐作业、步骤级日志与本机 Windows 证据（读数按精确 SHA）**
- **`d9976d0c`（main 与备份分支同指此枚）run `39859065304` = `completed success`**：11 个重作业全绿，`Branch light gate` 按 D01 规则 skipped。步骤级：`Walk the acceptance chain against the installed package` 与 `Walk every POST row against the installed package` 均 `success`，其日志原文一次给全三条读数——`GET_SWEEP layout=installed routes=39 reads=39 answered=35 verdicts=4 unmeasured=2`、`NATIVE_VERIFY layout=installed clean=HASH_VERIFIED tampered=NATIVE_ARTIFACT_UNVERIFIED unknown=NATIVE_ASSET_NOT_FOUND`、`POST_SWEEP layout=installed rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`（两模块各 `Ran 6 tests`）。CI 那一步现在把整串 `NATIVE_VERIFY …` 当作 grep 目标，所以"只答 200 的空实现"过不去。
- `PYTHON_TESTS_UNION=OK expected=3178 distinct=3178 ran=3178 duplicates=0 missing=0 unexpected=0`，三片 `exit=0`（3177 → 3178 正是这条新用例；`test_standalone_chain_http` 由 5 条变 6 条，`PYTHON_TESTS_MODULE_ALL 4.831s tests=6`）。
- **本机 Windows 那条只能在本机量的证据**：把三个模块放进取数器自己的深 TEMP（`.project-local/task-runtime/python-tests-shard-1/313d501449a54770ad3986c2a1ffdd82/tmp`，133+ 字符基底）跑，`Ran 17 tests / OK / exit=0`，无 `WinError 206`、无 `[Errno 2]`、无 skipped——§5.26 那处按成员名判定的解包豁免仍然成立，没有因为本批新增读法而回归。本机整轮 union 未跑完就被中止（该片在 Windows 上单片要 1500s 量级），**所以本枚的"全套通过"读数以 CI 那条为准，本机这条只覆盖 Windows 专有的路径长度面**，不写成全套。
- 一处自己差点留下的错，记下来：播种用的驱动把 `native_assets.py` 改坏再改回，它打印的 `restored identical: True` 比的是**解码后的文本**——那种比较看不见行尾改动，而本仓 `.gitattributes` 是 `*.py text eol=lf`。真正的对账是字节：工作树与 `HEAD` 同一 blob（`11c325be…`，5968 字节，0 个 CRLF），并且仓库自有的 `test_working_tree_line_endings` 在聚合里一直绿。**一条不会失败的校验不是校验**，它只是把事故改成了日志。聚合读数在最终树上：`VERIFY_RESULT=OK total=549 failed=0`、`VERIFY_DESIGN_LAB=OK total=76 failed=0`、`RECORD_REGISTER_GATE=PASS checks=5 problems=0`、`DOCUMENTED_COUNTS=PASS claims=13`。
- 本轮之后：**状态 CI_VERIFIED_EXACT_SHA @ `d9976d0c`**（下面这条记录本身与投影重绑是纯文字＋派生件，另算一枚，不改上面任何读数）。
- 补一枚读数，免得本节点名的 SHA 落后于树上那枚：把两个读侧分母交给闸门现数的那条（`32c78ac2`）与它的投影重绑（`51c14f10`，main 与备份分支现同指此枚）在 CI 上同样 `completed success`——run `39865099663`，12 个作业，无一条非绿（`Branch light gate` 仍按 D01 skipped）。其后若再有纯记录提交，按同一约定另算一枚，不改以上任何读数。

**批次 I 的收尾读数（写成这样，是因为它们各自来自不同的地方）**。CI 那枚是权威：`efa5a8afb7e9b04bd05c7b6ad96f9872d46e4823`
上 main 与备份分支同指，两次 push run `39943398842` / `39943381425` 均 completed success；12 个作业里除
「Branch light gate」按规则 skipped 之外全部 success，无失败作业。Python 作业三分片 exit=0，
`PYTHON_TESTS_UNION=OK expected=3183 distinct=3183 ran=3183 duplicates=0 missing=0 unexpected=0`
（PASS 3161、SKIP 22），同作业内 `VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 inert=30 routes=68
dispatched=68 bound=54 schema_less=14`、`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=35 failures=0`、
`VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=109 routes=66 matched=55 backend_only=11 dynamic=3 special=1`、
`VERIFY_DESIGN_LAB=OK total=76 failed=0`；清轮安装作业在同一枚上给全三行
`GET_SWEEP layout=installed routes=39 reads=39 answered=35 verdicts=4 unmeasured=2`、
`POST_SWEEP layout=installed rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`、
`NATIVE_VERIFY layout=installed clean=HASH_VERIFIED tampered=NATIVE_ARTIFACT_UNVERIFIED …`，
与本机 §5.29 前面那两组源码/装机读数逐字相同。

**本机整轮没有拿到同一条绿**，这一条必须点名而不是略过：本机三片跑完是 `union-exit=1`，shard 1/2 全绿，
shard 3 报 `outcomes={'ERROR': 1, 'FAIL': 59, 'PASS': 1007, 'SKIP': 6}`，红集中在
`test_reconstruction_evidence`、`test_verifier_internals`、`test_workbench_*_gate`、`test_service_cli`、
`test_ui_layering`、`test_spill_census_tracked_verdict` 这些读整棵树或要 node/浏览器的套件。
**归因未定**，因为那一轮与我往同一棵树里解包、落 20261023 方案包的时间重叠，而这些套件里多数带
snapshot/diff 或 tree-hash 断言——并发写会把自己的活动当成违规。手上有证据的只有一条：把其中两个模块
（`test_ui_layering`、`test_service_cli`）在静默树上单跑，`Ran 15 tests / OK`、`DRIVER failures=0 errors=0 skipped=0`，
所以它们不是本质上坏。结论按证据强度写：**"全套通过"这条只按 CI 那枚报**；本机那 60 项要在静默树上重跑三分片
才能 either 归零 or 升级为真缺陷，重跑结果进下一份读数，不在此处冒充。


### 5.30 第二十七批（规划轮 J0：一份 Record 投递包变成权威、账本与归档三面，而两处工具缺陷先红给我看）

owner 2026-10-23 原话：**「读取分析，按照这个执行（前端UI有新规划），并且归档到统一项目里，更新覆盖替换到权威和规划里」**
与 **「先分析拆解，加入到优先到任务台账里」**。这一批不落产品功能，只做三件事：把投递包逐字节归档并登记、
把权威与规划覆盖替换到新包、把新派工按优先级写进唯一账本。桌面 UI 从此进入当前派工面——批次 I 那句
「前端 0 文件」是 I 的边界，不是此后每轮的边界。

**先量再写（不是抄包里的数字）**。包内 `13_包内一致性核对.json` 自报 `requirementCount 66 / sourceCount 38 /
sectionCount 19`，`00_先读这里.md` 自报观察 `main@2d6ede51`。这些是作者时点，本批一律不引用为现状。本仓
落仓时实测的现状四条：`capability_library.py` 是只读投影（无写入面）、`prompt_intelligence.py` 不调用模型、
`prompt_results.py` 存储层要求 `executed=false`、`model_selection.py` 只记录选择——四条都由代码读回，
与本件 §5.24、§5.26 的旧读数一致，所以新包的"待开发"清单不是凭空列的。合同账本与闸门的读数取
`efa5a8af` 那枚：68 行 = BOUND_SCHEMA 54 + SCHEMA_LESS 14，live 载荷比对 35 条绑定，前端对账 calls=109，
`ROUTE_VIEWS` 21 条。

**归档的取证顺序**：`certutil` 先量两份投递原件（ZIP 70,319 B / `9fadae0ae12712c3…`，HTML 59,898 B /
`614b4a7c15bfb649…`）；解包后拿包内自带的 `SHA256SUMS.txt`（16 行）逐行重算其余 16 名成员，
**0 不匹配、0 缺失**才允许落地；17 名成员 `write_bytes` 落到 `docs/taskpacks/20261023-ui-kb/source/`
（155,573 B），每份落地后立刻回读比哈希。卷宗根下那份 HTML 与包内同名成员**同一 sha256**，
所以只留一份规范副本、另一处登记成别名（`aliases` + `deduplication.groups`），不复制第二份内容对象。
ZIP 原件按 AGENTS.md 既有规则留在 `.project-local/record-archive-2026-10-23/`（Git 忽略）并在两份 manifest
里写明"不随克隆走、迁移须按摘要补齐"。既往普查一律不改写：2026-10-09 的 101 份 / 180 成员、2026-10-11 的
DOT 清单、2026-10-19 的五件波次登记与它们 `summary` 里的计数，本节只追加、不并入（`RECORD-ARCHIVE-INDEX.md`
末节 + 生成器-owned 的五行登记表未动，`RECORD_REGISTER_GATE=PASS checks=5 pathish_named=30 problems=0`）。

**这条 PASS 读数后来跟着一个位移改过一次**：本节原先追加在五件登记表之后，而
`generate_archive_record_register.py` 从自己的标题改写到文件末尾，下一轮再生成直接把它删掉
（76,437 → 73,712 B，`grep -c` 该标题变成 0）；移到登记表之前、与 2026-10-11 / 2026-10-13 两节同侧之后，
再生成逐字节不变。代价是那条闸不再扫描本节的 pathish 引用，`pathish_named` 由 30 回到 21。
两个 `problems=0` 都是各自位置上的真读数，不是同一个扫描范围。


**第一处工具缺陷在我自己身上**：登记完之后 `verify_archive_record_register.py` 报 6 条
"unresolvable path"，其中四条点的是我刚落地的中文名成员。它拿 `git ls-files` 的文本按行切分建集合，
而 git porcelain 会把非 ASCII 路径八进制引用（`"docs/…\345\205\210…"`），于是**已入仓的文件在闸门眼里不存在**。
同一件事在 `.gitattributes` 与 `verify_task_document_states.py` 都用 `-z` 处理过，这条闸门是漏网的那一条。
改成 `git ls-files -z` 后四条同时消失；另外两条是真错——我在散文里给 schema 标识加了反引号
（`design-lab/taskpack-source-manifest/v1` 不是路径），改成不带反引号并写明原因。**这两条都要点名**：
一条是工具的假阳，一条是我的措辞。修完再跑 `git -c core.quotepath=false ls-files` 与 `cat-file blob :path`
逐份复核：**17/17 的 index blob 摘要等于登记摘要**，其中 03/04/05 三份 CSV 的 CRLF（67 / 39 / 10 对）
在 index blob 里原样保留——`.gitattributes` 已为这三棵子树写 `-text whitespace=cr-at-eol`，
否则 `* text=auto eol=lf` 会把登记摘要变成不可复现的机器绑定值（同一件事这件上已记过两次）。

**权威与规划的覆盖替换按 §17 走**：`AUTHORITY.md` 增 `DESKTOP-KB-20261023-R1` 采纳块，并把 2026-10-19 那句
「当前唯一 integrated TaskPack」标为**当日原文 + 更正括注**，不删；`authority-index.json` 的
`current` / `mandatoryAuditBootOrder` / `taskpackClassificationRule.currentIntegrated` 指向新包，方向包进
`lineage` 与 `historicalSpecific`（`SUPERSEDED_DISPATCH_ENTRY_LINEAGE`，replacement 指向新包），新增
`desktopKbAdoption` 机读块（派工段、冻结段未动、前端进派工、模型本轮不部署、手机排除、AAOS 未来合同、
stillFrozen 七项）；`task-document-states.json` 里方向包降 `SUPERSEDED/LINEAGE`、新包升
`CURRENT/DISPATCH_ENTRY`、新前缀规则 `docs/taskpacks/20261023-ui-kb/**`＝FROZEN/RECORD，
`NEXT-AGENT-PROMPT.md` 的 replacement 跟着换。两份被钉面字节变了就重钉：
`AUTHORITY.md 7cd2db03… -> 00126066…`、`authority-index.json fd01ce37… -> 9a0e1a58…`，
`AUTHORITY-PIN-CHANGE.json` 追加第 10 条 revision（意图/原因/被取代/影响/跑的闸），
`R2_RELEASE_HASHES` 其余四项一字未动。**闸数没减**：`TOP_AUTHORITY_GATE=PASS checks=10 failed=none`、
`TASK_DOC_STATE_GATE=PASS checks=13 failed=none`。

**台账加入的做法**：`currentExecution` 的 `validate()` 要求 `set(tasks) == set(definitions.tasks)`，
所以加派工只能换绑定义原件，不能只往账本里塞行。定义原件落在
`docs/history/taskpacks/20261023-adoption/TASK-DEFINITIONS.json`（89,864 B，`e54f55f324626392…`），
**逐字携带 20261009 那份的 34 条定义**再加 16 条新条目——旧原件在 `docs/history/**` 冻结家族里，
按 HISTORY-FREEZE-RULES 不得改写，所以它是被复制携带而不是被编辑；账本 `currentExecution.source` 只钉当前
绑定的这一份，`legacy_snapshot` 与被携带件的出处关系写在 `AGENTS.md` 与裁决件里。账本改前先证明
`json.dumps(..., ensure_ascii=False, indent=2) + '\n'` 与磁盘字节**逐字节相同**才动手（754,760 B →
50 行任务：`{'FROZEN_DEFERRED': 34, 'IN_PROGRESS': 1, 'NOT_STARTED': 15}`，198 条证据一行未增）。
`mobile` 仍是 schema `const FROZEN_DEFERRED`，一个字节没动。

**第二处过期是我自己的闸门**：`verify_documented_counts.py` 原先在**任何**一项离开 `FROZEN_DEFERRED`
时直接 `SystemExit` 拒绝报数，理由写在 docstring 里——解冻是 owner 决定。owner 今天把决定记下来了，
所以这条拒数变成"把新派工也当成谎"，它保护的句子（四处「其余 34 项仍」）其实仍然为真。改成
**两个分开的实测数**：仍冻结 34、当前派工 16，各自钉自己的句子（`claims` 18 → 20）。保护没变弱：
悄悄解冻任何旧行会改 34 这个数，四处句子同时红。播种复证两条都红——把 16 改成 17（界面面）与 15
（任务包）各红一次，把 34 改成 35 也红一次，恢复后逐字节相同（`BOTH_CLAIMS_FALSIFIED_AND_RESTORED`）。
顺带两处硬写数：`current_execution.py` 报告里「22父任务＋12UI子任务」与「本次归档不实施产品」按投影计数与
新边界改写；`test_current_execution.py` 的 `{'NOT_STARTED': 34}` 改成从账本自身取行数，
免得每加一条派工就有人来编辑测试。

**登记件与投影是两次提交**：本件被登记件量着（登记表第五行就是它），所以内容提交之后才跑
`scripts/generate_archive_record_register.py` 与 `scripts/generate_current_reports.py`，
`deepseek_authority_chain.py` 也要重写——新落地的 taskpack/decision/manifest 都进了它的 entries，
不改写就是 `AUTHORITY_CHAIN=DRIFT`。`.project/manifest.yaml` 的 taskpack 指针与账本
`currentExecution.taskpack` 本来就不一致（那条既有 drift 读数保留，不顺手抹平）。

**边界一条没松**：手机端仍是排除项（`mobile` 常量、`AGENTS.md`、`AUTHORITY.md` 三处未改词）；
字体与三方素材仍在范围外；模型不锁死但默认 fail-closed、`UNKNOWN` 不写成合格、云端须披露离开本机的数据，
且**本批不部署模型、不下载权重**；编号仍 `UNUSED`；签署与审核仍只接受具名 human；导出仍只读回；
AAOS 仍只是未来合同；E 盘不动；release / 安装态分发 / 真实宿主 E3 / 真人 E4 / ComfyUI / MiniMax H3
与旧 34 项继续冻结。**本批改动的字节面是权威、规划、登记、台账与三条闸门/一处测试断言，产品代码 0 文件、
前端 0 文件、模型 0 调用**——交付性质是 E1（结构与登记可证）加对既有 E2 读数的引用，不是 E3/E4/release。

---

**批次 J 的 CI 第一次是红的，红在我身上，而且红得准确。** `a8e802e4` 上 11 个作业里 Python 作业失败，
shard 1/3 三条红全在 `test_record_import_fidelity`：`test_every_repo_held_row_is_accounted_for`
（`475 != 479`）、`test_recorded_hashes_match_the_files_on_disk`、
`test_the_archive_still_equals_what_the_manifest_recorded`。原因是我为了覆盖替换而改写的四份文件
（`AUTHORITY.md`、`.project/governance/authority-index.json`、`docs/current/PRODUCT_DEFINITION.md`、
`docs/current/ROADMAP.md`）**同时也是 2026-10-08 Record 导入清单的 repo 侧持有行**——清单把它们钉在
"导入后仓库副本"的摘要上，我改了字节却没有声明演进，于是 leg 2 只能报 WORKTREE-MISMATCH，
把一次诚实的覆盖替换伪装成静默损坏的样子。修法不是放宽断言，而是走仓库自带的声明器
`scripts/declare_record_evolution.py`：它只写 `repoBytesAfterImport/repoCrc32AfterImport/repoSha256AfterImport`
与 `evolvedBy`（commit 由 `git log -1 -- <path>` 现读，不手填、不虚构），归档的 `sha256/crc32/bytes` 一个不动，
leg 1 仍对源 ZIP 可验。声明之后 `RECORD_VERIFY=OK blobs=HEAD`
（`rows=492 source_verified=492 worktree_verified=479 blob_verified=466 blob_eol_only=13 blob_absent=0 moved_rows=3 skipped=0`），
`test_record_import_fidelity` 本机 `Ran 4 tests / OK`。
**这条教训的形状值得单独记一句**：权威面不是自由字节。改一份被别的登记件量着的文件，必须同一轮里跑那个
登记件的声明器——`AGENTS.md` 不在清单里，`AUTHORITY-PIN-CHANGE.json` 也不在，唯独我改的四份在活动面上。
第一轮没跑它，是因为我把这四份当"权威"而不是当"被绑定件"看。

**本机整轮那 59 FAIL + 1 ERROR 现在有读数了，不是并发写、也不是代码。** `scripts/verify_spill_census.py`
在 `RuntimeTests.test_the_check_passes_reports_machine_state_and_writes_nothing` 里报
`AssertionError: 'INCOMPLETE' != 'PASS'`，报告体是 `rootCensus … truncated=true cappedAt=4096`；
本机现数 `.project-local/task-runtime` 有 **308,833** 条目、`.project-local/task-artifacts` **9,153**、
`.project-local/projects` **472**，全部是历轮运行与测试自己写出来的忽略根。也就是说这条闸今天在这台机器上
**量不出来**（它拒绝把截断当干净，正是它该有的行为），依赖该判定的套件跟着红；CI 是干净 checkout，
那些根本不存在，所以同一枚 CI 绿。两次静默复跑（`415.7s` / `414.4s`）失败模块与耗时一致，确认是确定性状态、
不是竞态。**处置也不是"删掉就好"**：`currentExecution` 的多数回执按 `artifact_sha256` 绑在
`.project-local/task-artifacts/**` 的字节上，删了就把证据面自己删了——要么按审计确认后再清、
要么由 owner 决定把上限调到能覆盖真实状态并同步那句话，两条都不是本轮可以顺手做的。

### 5.31 第二十八批（批次 K 第一刀：知识库从账本行变成能写、能搜、能读回的桌面纵切）

owner 的批次顺序是 K0 知识管理与中文检索 → 中立方案与目标档案/导出 → 一个方案助手模型的真实接入 →
内容方法与反馈。这一批落 K0 的第一刀，四个任务按派工顺序做完：DL-KB-02（写面）、DL-KB-04（中文检索）、
DL-KB-03（知识与提示词库屏）、DL-KB-06（三入口外壳）。验收判据不是"文件在不在"，而是真实前端 +
真实 API + 持久化 + 进程重启后读回 + 错误态；四项都按这个判据留了读数。

**① 写面是六条路由，不是一段说明。** `src/design_lab/knowledge_library.py` 落三张表
（`knowledge_entry`、`knowledge_entry_revision`、`knowledge_index_state`），`http_service.py` 加六条路由：
`GET /api/knowledge-entries/search`、`POST /api/knowledge-entries`、`POST /api/knowledge-entries/import`、
`POST /api/knowledge-entries/index-rebuild`、`GET /api/knowledge-entries/(kentry-…)`、
`POST /api/knowledge-entries/(kentry-…)/revisions`。HTTP 路由 66 → 72，合同账本 68 → 74 行
（`VERIFY_CONTRACT_BINDINGS=PASS schemas=32 binding=2 inert=30 routes=74 dispatched=74 bound=60
schema_less=14`：六条全进 BOUND_SCHEMA，SCHEMA_LESS 仍是 14）。四件套同一批付：`contract-bindings.json`
六行（emitter 指向真正写 `schemaVersion` 的那一行）、六份 schema 进 `design-lab/schemas/` 并进打包三件套、
`verify_route_payload_contracts.py` 的活载荷用例（bindings 35 → 41）、`verify_workbench_route_calls.py`
认得前端调用（`calls=117 routes=72 matched=61 backend_only=11 dynamic=3 special=1`）。
写侧扫描 `POST_SWEEP layout=source rows=33 walked=32 written=32 read_backs=39 refused=0 excluded=1`，
被排除的仍是 §5.27 那条 FROZEN-BY-POLICY 的 native 派发，不是新缺口。

**② 修订只追加，不覆盖。** `_write_revision()` 在同一个事务里删旧 FTS 行、插新修订、推进
`knowledge_index_state`；条目身份 `kentry-` 不变，修订号递增，旧修订留在表里。
`_fields()` 要求 title/summary/body，静默字段一律 `UNKNOWN`（不拿空串冒充"没有"）；
`_source()` 拒绝把 `VERIFIED` 与未知许可/已复核这两对矛盾写进去。`test_knowledge_library` 17 项 OK
（含"只准 trigram 的两字中文必须 miss"这条对照）、`test_packaged_contract_resources` 6 项 OK、
`test_backup_watches_written_tables` 5 项 OK、`test_installed_write_surface` 与
`test_standalone_chain_http` 各 6 项 OK——最后一条是进程内真写、真读、真回执，不是 mock。

**③ 中文检索的判据是「短词必须命中」，不是「英文能搜」。** FTS5 的 trigram 对两个汉字没有词元，所以
`分镜`/`粒子`/`品牌` 走 `SHORT_FALLBACK`（子串回退），`panasonic` 走 `TRIGRAM`；单元层先断言只准 trigram
时两字中文必须 miss，再断言回退命中——英文通过不算中文可用。1,000 条经真实回环 HTTP 播种后的读数
（`kb-search-http.log`，`KB_HTTP_PROBE_COMMIT=7f5e68d7…`）：四条查询 `"total": 1000` 全部命中；
零结果查询 `"total": 0` 并带解释「检索只匹配标题、摘要、正文、领域/任务标签和目标工具，不做近义词扩写，
也不推荐未命中的相关条目」。p95：单元 26.1 ms、HTTP 30.4 ms，预算 300 ms（各 30 次采样，1,000 条）。
阈值与读数在同一份日志里发布，不先写"很快"再补数字。

**④ 界面是按渲染结果改出来的，四处缺陷各有一条可复跑的检查。** 所有 PNG 都是真实 Chromium 对真实
回环服务的读回（bundle `apps/workbench/build/main.js` sha256 `6bbd86d9…`）：①「新增 / 导入 / 重建索引」
在 1440 下被挤成两行（`1a7b7a2b`）；② 零结果标题重复服务句子，屏上读成「没有命中的条目没有命中「…」的条目。」
（`2ac55ce1`）；③ 新增/导入表单打开后只能靠写入成功消失，改主意只能离开页面（`4ffa77b8`，行动区加「取消」，
探针真点击后断言表单从 DOM 移除）；④ 零结果时右侧仍挂着上一次选中的完整详情，读起来像本次命中
（`7f5e68d7`，加「右侧是上次选中的条目，不在本次检索结果里」并由 `apps/workbench/tests/appshell.mjs` ㉓ 断言）。
首屏 50 行、`加载更多（已显示 50 / 共 60）`、点击后 60 行且按钮消失；空库与零结果是两句不同的话，
都给出下一步，不编造示例条目。

**⑤ 导航是派生的，缩放是量的。** `ROUTE_VIEWS` 21 → 22，侧栏仍是
`ROUTE_VIEWS.filter(...).map(...)` 派生而不是手写清单；采集器把渲染出的按钮集与服务路由表逐项比对：
`CAP_NAV_SET rendered=21 expected=21 equal=1`，`CAP_ROUTE_COVERAGE routes=22 captured=24 of 22
pageEntries=26`。100%/125%/150% 三档（1920×1080 物理屏 → 1920/1536/1280 CSS 宽）用 Tab 实测：
三档都按 21 次到达「知识与提示词库」，焦点环 3px solid、`fullyInsideNav=true`；150% 时侧栏滚动 263px
把它带进视口（`navScrollTop` 0/17/263），三档 `scrollWidth == innerWidth`，无横向溢出。
侧栏四个分组标签「设计辅助 / 知识与提示词库 / 我的方案 / 设置与诊断」与右上角设置入口在回执里逐项可读；
没有 AAOS 入口、没有连接按钮、也没有"未连接"红灯。

**⑥ 这一批有三处红是我自己造的，形状都记下来。**
第一处是**日志的编码也是证据**：`unit-knowledge.log` 与 `test_standalone_chain_http.log` 是重定向的 Python
stdout，在这台机器上按 cp936 写出，`verify_identity_gate.py` 报 `IDENTITY_GATE=FAIL total=2 scanned=3219`
并给出具体字节位置——闸门是对的。改用 `PYTHONIOENCODING=utf-8` 重跑，单元 p95 由 24.7 变 26.1（同一套件、
同一台机器，重跑读数），所有被绑定的摘要跟着重算；`VISUAL-REVIEW.md` 里那句 p95 也随之改成
「24.7（首发）/ 26.1（UTF-8 重跑）」，两条绑它的视觉回执与 `evidence-index.json` 同步重绑
（`736d5eaae0fa…`），追记的是读数来源，不是重新测一遍。
第二处是**自引用工件**：`test_standalone_chain_http` 会打 `/api/evidence-projection`，而这条路由在运行中
重新哈希账本绑定的工件路径；一旦把 stdout 重定向到它自己那条已绑定的日志上，服务读到的就是"正在写的文件"，
返回 `500 EVIDENCE_LEDGER_REJECTED … current evidence artifact hash differs`。这不是产品缺陷也不是闸门缺陷，
而是测量顺序：改为先写临时文件、跑完再把最终字节装回工件路径、最后绑摘要，才自洽。
第三处是**投影比我诚实**：`VERIFY_PROJECTION_FRESHNESS` 指出 `CONTRACT-GRAPH.json` 的 `declared_tables`
少三张（42 → 45，正是这一族的三张表），`INERT-CONTRACT-SURVEY` 则是"从已经移动的代码上算的"；
两者在 `6d8ee5b5` 重新生成。修完 `VERIFY_DESIGN_LAB=OK total=76 failed=0`。

**⑦ 账本只说它量到的事。** `currentExecution` 50 行 = 34 `FROZEN_DEFERRED` + 1 `IN_PROGRESS`（DL-KB-01）
+ 4 `PARTIAL`（DL-KB-02/03/04/06）+ 11 `NOT_STARTED`；证据 198 → 216 条，18 条新回执全部绑
`7f5e68d7` 的产物。四条是 `PARTIAL` 不是 `DONE`：**真人验收没有发生**，本轮最高只到 E2（受控运行时），
不是 E3（真实工作流），更不是 release。证据包 `kb-20261023/` 共 48 个文件，其中 47 个（索引自身除外）
逐份登记在 `evidence-index.json`（字节 + sha256）；13 张截图（3 张空库、7 张播种、3 张缩放）各带许可
sidecar。这份清单在收尾时按磁盘字节重扫过一次：首版只覆盖当时的 35 个文件，并集修版轮新增的两份闸门
日志与十份 sidecar 原不在其中，条目数这才与目录里的文件数对齐（索引保留原 `commit: 7f5e68d7`，
因为它登记的是那一批产物，重扫只是重新哈希，没有重拍任何一张图）。

**⑧ 全量并集抓到的五处红：两处是钉死的测试没同改，两处是账没跟着 CSS 走，一处是真版式缺陷。**
`PYTHON_TESTS_UNION=OK expected=3200 distinct=3200 ran=3200 …` 之后 `FAIL=5`。
`test_route_payload_contracts` 的族清单没有六条知识路由（闸门原话：「a binding added here without being
listed below is a boundary this file silently stopped covering」），`test_workbench_css_single_definition`
仍钉 53 个 `.list` 容器而实测 59——新增的六个在注释里逐一具名（设置页的模型服务与备份诊断两个面板，
知识屏的条目字段 / 来源许可 / 修订历史 / 服务 `does_not_say` 四组；检索结果容器是原位替换，不计入）。
补上后两个模块各自 31 / 17 项全绿。`test_workbench_theme_geometry_gate` 单独复跑两次均绿，
暂记为并集里的环境性红，待重跑复核，不写成已解释。
真缺陷是 **390px 窄窗底栏**：`.nav-group` 在横向滚动条里没有 `flex`，默认 `0 1 auto` 把它压到
31.9px，四个字竖排成 121px，按钮跟着 `stretch` 到同一高度，整条底栏 138px，超过 E2E 的 120px 阈值
（`browser_design_layer_e2e.mjs` 的 `mobile appshell layout`，码 11）。分组标签自 `147e6dc9` 起就在
扁平导航里，本轮把组名换成更长的三入口名字后实测越线；旧包高没有回测，这里只断言当前字节的读数。
**没有放宽阈值**：同一个 `@media(max-width:760px)` 里给 `.nav-group` 加
`flex:0 0 auto; white-space:nowrap; align-self:center`，先证伪再修——隐藏标签 138→56，标签单行不收缩
同为 56，修后 E2E 两个用例通过。这条按桌面窄窗口自适应处理，不是手机端交付，也没有把手机端列为待办。
另两处红是账要跟着 CSS 走：`verify_asset_governance` 指出 `shots/seeded/knowledge-zoom-150.png`
（356 KiB）没有声明 bundle，已在 `large-assets.json` 增加 `kb-20261023/`（实测 3.11 MiB / 预算 4.0 MiB，
理由写明账本摘要直接绑定这些字节，不能挪进 Git 忽略目录）；`design_debt_baseline` 因新增一条规则把
字面 px 从 514 变 516，`DESIGN.md` §4 的那句同改。两处完成后 `VERIFY_PROJECTION_FRESHNESS=OK`、
`ASSET_GOVERNANCE=OK`、`VERIFY_DESIGN_LAB=OK total=76 failed=0`。

**边界一条没松**：手机端仍是排除项（本轮只在 1920/1536/1280 的桌面 CSS 宽上量）；
字体与三方素材仍不在本项目范围内；模型不锁死但默认 fail-closed，本批不部署模型、不下载权重；
编号仍是字面量 `UNUSED`；签署与验收仍只接受具名 human；导出仍只读回；AAOS 仍只是未来合同；
E 盘不动；release、安装态分发、真实宿主 E3、真人 E4、ComfyUI、MiniMax H3 与旧 34 项继续冻结。

**仍然未证（写在这里，不留到下一轮才发现）**：真实中文知识语料只有探针合成的 2 + 58 条，
不含 owner 的实际条目；写入路径的逐屏截图只覆盖新增，修改与导入靠单元/接口层测试；
1920 只截了空库；1280×800 首屏侧栏只露出第一个分组（有滚动提示，150% 的 Tab 实测证明可达，
本轮未改版式）；详情徽章同时显示「最新 r1」与「非推荐版本 r1」，语义正确但可读性一般，留给版式轮次。

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

### 5.29 第二十六批（后端 I：设计层这一族从"账本记 SCHEMA_LESS"改成了有合同，而守卫第一个判红的是我自己的补丁）

owner 这句仍是「继续打磨后端」。§5.27/§5.28 把两侧都搬进了"装好的包"里度量，但账本里 `SCHEMA_LESS`
还剩 32 行，其中 **20 行属于设计层这一族**（brief / direction / design-layer / design-system-tokens），
18 行没有合同。这一族不是边角：它是 `#/brief`、`#/direction`、`#/system` 三块面板的读回面，也是
`CHAIN_HOPS … brief=201 direction=201 design-layer=200` 那两跳走过的地方。这一批改的就是那 17 行。

**① 开局现数，不抄任何提示词里的数字**（全部当场打出）：账本 68 行 = 39 GET + 28 POST + 1
`GET+POST`，`BOUND_SCHEMA` 36 / `SCHEMA_LESS` 32；这一族按路由名第一轮量成 20 行 = 3 已绑 + 17 未绑，改用**账本的 handler 落在 `design_layer` 的哪几个方法上**重量得 21 行 = 3 已绑 + 18 未绑——漏掉的是 `GET /api/design-systems`：它的行形状已经被 `design-layer-rollup-v1.schema.json` 的 `$defs.design_system` 绑住，而它自己的信封不带版本，留它就是留一个半态，所以一并付掉；载荷闸门
`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=17 failures=0`；界面调用面
`VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=109 routes=66 matched=55 backend_only=11 dynamic=3 special=1`
——未绑的 17 行里 7 行是 `backend_only`（单读简报、方向列表与单读、四条 lineage 中的两条、
两条 id 域 revisions），也就是说它们没被界面读过，但**被两侧扫描真写过真读过**，付款的依据是那两个
扫描的字节，不是面板。

**② 文档是先量字节再写的，不是先写再对着代码看**。用一次性服务把这一族每条路由的回答打出来
（`.project-local/scratch/g/probe5.py` 打 11 读 6 写的键集与形状，`probe6.py` 补 id 前缀、目录
evidence 档位、可选字段全缺时的 null、被超版链与 `active_binding` 非空那一支）。量出来的东西决定了
四条判据：token 文档 id 前缀是 `tokdoc-`；目录行的 `evidence_level` 今天是 `E0`/`E2`（因此
pattern 写成 E0–E5 阶梯而不是某个值）；`style_notes/color_mood/typography_mood/actor/actor_kind`
按 `design-lab/schemas/state/design-lab-state-design-layer-v1.sql` 的 NOT NULL 与否定可空性，
`actor_kind` 直接钉成 `human|agent|null`（表上 CHECK 就这三个）；`token_count` 的 `minimum: 1`
是从 `design-lab/schemas/state/design-lab-state-design-layer-v4.sql` 的 CHECK 抄来的，不是我给的。

**③ 四份信封合同，形状一律 `$ref` 不重述**（"一份合同只有一个主人"）：
`design-lab/schemas/design-record-v1.schema.json`（`design-lab/design-record/v1`，一条记录的信封，
读写共用，`record_kind` 判别，brief 引 `brief-readback.schema.json#/$defs/brief`，direction/binding
在此首次做主人）、`design-collection-v1.schema.json`（`design-lab/design-collection/v1`，
`collection` 判别；方向页必须有 `next_cursor`、token 页**禁止**有，因为读侧真的没有分页）、
`design-lineage-v1.schema.json`（`design-lab/design-lineage/v1`，`subject_kind` 判别）、
`design-layer-rollup-v1.schema.json`（`design-lab/design-layer-rollup/v1`，`chosen_direction` 与
`active_binding` 只能是 `null` 或一条真记录——P0-02/P0-D 那两个"不许回落"的规矩从此不只是注释）。
DTCG 文档引 `interop-dtcg-document.schema.json`，因为那份文件才是它的主人。

**④ 服务侧每次都判，而且第一个受害者是我**。`_check_design_record` / `_check_design_collection` /
`_check_design_lineage` / `_check_design_rollup` 装载自己的合同，先比 `schemaVersion` const 再校验，
不符就 500 带字段路径（`DESIGN_RECORD_CONTRACT_VIOLATION` 等四个具名码，沿用
`BRIEF_CONTRACT_VIOLATION` 的形状）。我按下第一条守卫的地方就是我自己写的补丁：`get_design_layer`
被我包成了 `{design_layer: {design_layer: {…}}}`，实跑立刻
`500 DESIGN_LAYER_ROLLUP_CONTRACT_VIOLATION`，detail 七条
（`'briefs' is a required property` ×6 + `Additional properties are not allowed ('design_layer' was unexpected)`），
抛出点在 `src/design_lab/design_layer.py` 的信封函数里——先红的是我的编辑，不是产品，也不是闸门。
emitter 行号从源文件重算：`:104/:105/:106/:107` 四个版本常量，`BRIEF_READBACK` 的 `:64` 一字未动
（新常量全插在它下面，就是为了不动那条已被账本钉住的指针）。

**⑤ 点名更正一条我自己写错的断言**：账本 brief 链那行的旧 reason 写着这条文档是
"superseded_by 链**加 design_layer_event 行**"。实测字节里没有事件行：`_chain()` 读
`design_layer_event` 只是用 `*-revised` 载荷里的 `new_id→old_id` 找回父行，交出的仍是记录本身。
新的 reason 按实测改写，并把事件 kinds 的归属写明白——仍由 `EVENT_KINDS`（`design_layer.py`）与表
CHECK 管，不由这份 schema 管。旧读数在本节保留原文以便对照，不删。

**⑥ 载荷闸门只变大不变松**：17 条绑定 → 35 条，新增的 18 条里 17 条各两例真实载荷（目录那一行一例，`catalog()` 没有空分支可给）——活梢与被超版、
有内容与空项目、追加（201）与同一幂等键的重放（200），没有一条用一个载荷冒充多个边界。
`design-lab/tests/test_route_payload_contracts.py` 的绑定清单钉同步扩到 35 项（这条钉本身就是"加了
绑定却没进清单"的红），并新增五条只针对这一族的种红：判别器说谎（brief 体配 `record_kind=direction`
同时触发 `SCHEMA_VIOLATION`/`MISSING_FROM_EMITTER`/`UNDECLARED_BY_SCHEMA`）、链丢 `root_id`、
token 列表凭空长出游标、`{}` 冒充"没有选择"、追加与重放键集必须一致。该模块 31 项 OK。

**⑦ 打包三件套，并证它会红**：四个新读取点全走 `runtime/state_resources.repo_resource()`，
`pyproject` 补四行 force-include，`design-lab/tests/test_packaged_contract_resources.py` 从磁盘枚举
调用点（42 项含 `test_contract_bindings` 全 OK）。植入检查：把装好的 wheel 里
`design_lab/resources/repo/design-lab/schemas/design-layer-rollup-v1.schema.json` 移走，装机扫描
`Ran 6 tests in 0.099s / FAILED (errors=6)`，traceback 落在
`design_layer.py:114 → state_resources.py:101 FileNotFoundError: packaged repository resource missing:
schemas/design-layer-rollup-v1.schema.json`——拒绝发生在**导入期**，比路由 500 更早、更硬，与既有
`BRIEF_READBACK_SCHEMA_PATH` 同一个形状，不是新引入的风险类；装回即 `Ran 6 tests / OK`。
wheel 从 1,073,608 字节到 1,082,262 字节，成员 354 → 381。

**⑧ 两侧扫描的语义与读数一字未动**，这是"不改扫描来迁就合同"的可复核部分：源码
`GET_SWEEP layout=source routes=39 reads=40 answered=36 verdicts=4 unmeasured=2`、
`POST_SWEEP layout=source rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`、
`NATIVE_VERIFY layout=source clean=HASH_VERIFIED tampered=NATIVE_ARTIFACT_UNVERIFIED unknown=NATIVE_ASSET_NOT_FOUND`；
装机 `GET_SWEEP layout=installed routes=39 reads=39 answered=35 verdicts=4 unmeasured=2`、
`POST_SWEEP layout=installed rows=29 walked=28 written=28 read_backs=34 refused=0 excluded=1`、
`NATIVE_VERIFY layout=installed` 同串，`CHAIN_HOPS … design-layer=200 … export=200` 与
`DELIVERY_HOPS project=201 native=READBACK bundle=201 preflight=200` 照旧。信封是加在回答**上**的。

**⑨ 受治散文的数字全部交闸门现数**：`scripts/verify_documented_counts.py` 加三条测量
（这一族付掉的行数、账本还剩多少行没有合同、载荷闸门现有多少条绑定），claims 15 → 18，
`DOCUMENTED_COUNTS=PASS claims=18`；三条各自播种皆红且报出句名（16/14/33 三枚，逐条
`FAIL … prose says ['16'], measurement says 17`，恢复即 PASS），并且本批改写了两处过期数字
（"余下 32 条 SCHEMA_LESS"改为带日期的读数并指向现值；"当前 11 条读数"改为只以闸门自己输出的
`claims=<n>` 为准）。现状面新增"后端 I"整块，旧读数不删。

**闸门与实跑**：`VERIFY_CONTRACT_BINDINGS=PASS routes=68 dispatched=68 bound=54 schema_less=14`
（36+18 / 32−18，两个方向都对得上）、`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=35 failures=0`、
`VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=109 routes=66 matched=55 backend_only=11 dynamic=3 special=1`
（本批没碰界面调用面）、`DOCUMENTED_COUNTS=PASS claims=18`；定向
`test_standalone_chain_http`+`test_installed_write_surface` 源码 12 OK / 装机 12 OK、
`test_route_payload_contracts` 31 OK、`test_contract_bindings`+`test_packaged_contract_resources` 42 OK。
前端 0 文件。本机整轮 union 与聚合读数见下一条回填。

**边界不变**：宿主 E3、真人 E4、release、安装态分发、ComfyUI / MiniMax H3、`currentExecution`
34 项 `FROZEN_DEFERRED` 继续冻结；手机端仍是排除项，不是待办；字体与三方素材不在本项目范围内；
模型不锁死但默认 fail-closed，显式选择只是被记录的动作；编号仍用字面量 `UNUSED`，代理不自造标识；
签署与审核仍只接受具名 human；导出仍只读回；E 盘不动。级别仍是 E2——这一批改的是"信封自己说的
是不是真的"，不是产物好不好。

### 5.32 CI 读数（批次 K 第一刀；本地并集与远端逐作业都绑 `cf77b2c2`）

**本地并集先在安静树上跑完。** `PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe
scripts/run_python_tests_all.py --shards 3 --jobs 1`，工作树 `HEAD cf77b2c2`、除未跟踪的
`.codebuddy/` 与 `.cursor/` 外无改动：shard 1/3 `exit=0 tests=1102 wall=1578.375s`
（PASS 1101 / SKIP 1）、shard 2/3 `exit=0 tests=1006 wall=126.719s`（PASS 1004 / SKIP 2）、
shard 3/3 `exit=0 tests=1092 wall=386.918s`（PASS 1090 / SKIP 2）；
`PYTHON_TESTS_UNION=OK expected=3200 distinct=3200 ran=3200 duplicates=0 missing=0
unexpected=0`，合计 PASS 3195 / SKIP 5，`UNION_EXIT=0`。上一轮同一口径是 FAIL 5，这次是 0。
⑧ 里那条"暂记为环境性红、不写成已解释"的 `test_workbench_theme_geometry_gate` 在这轮并集里通过；
它依然没有得到解释，只多了一条重跑读数。

**推送是 fast-forward，两个引用同一 SHA。** `git push origin cf77b2c2:main` 与
`git push origin cf77b2c2:qoder/designlab-backup-consistency-20261007` 都报 `d5444cb3..cf77b2c2`；
`git ls-remote` 读到两个 ref 都是 `cf77b2c2`。没有 force，没有合并以外的历史改写。

**远端 CI：run `40009897564`，`Canonical Verify`，SHA `cf77b2c2`，conclusion `success`。**
12 个作业里 11 个 success，`Branch light gate` 按设计在 main 上 skipped。逐作业的关键步骤：
- `Python gate (V3 verifiers + unit tests)`：18 个实质步骤全部 success，含 unified verify、
  boundTree freshness、R5 账本闸、证据工件存在性、分片单元测试（与本地并集同一套件）。
- `Top-level Authority consistency gate`：4 步全绿，含 archive-wave record register。
- `DeepSeek authority gate chain`：2 步全绿。
- `Workbench strict-TS product gate`：typecheck、Vite build、node smoke、静态验证，以及
  `No-drift: rebuilt bundle is byte-identical to committed`。
- `Workbench browser E2E (exact-SHA controlled-runtime, no-skip)`：
  `Browser E2E must RUN and PASS` 成功，证据工件已上传。
- `Clean wheel install + Workbench launch gate`：建 wheel、干净环境安装、启动读回、
  20 跳验收链、全部 POST 行逐行走查，5 步全绿。
- `Generated-artifact clean-tree gate`：重建产物无漂移 + 全树干净。
- `License & secret hygiene gate`：8 步全绿（许可覆盖、SBOM、秘密史扫描、CRLF 检查）。
- `MiniGame node gate`、`Open Design host adapter gate`（表面未变，安装/闸门步骤按条件 skipped）、
  `CI artifact proof` 均 success。
- `Branch light gate`：main 上 skipped，不是失败。

**这一轮之后仍未证的事一条没变**：真人验收没有发生，最高级别仍是 E2；产物没有发布，
没有安装态分发，没有真实宿主 E3。**边界不变**：手机端仍是排除项；字体与三方素材不在范围内；
模型不锁死但默认 fail-closed，本轮不部署模型、不下载权重；编号仍是 `UNUSED`；导出仍只读回；
AAOS 仍只是未来合同；E 盘不动；旧 34 项继续冻结。

### 5.33 收尾提交与逐作业读数（`48a7e030` → `d9a8412b`）

回填这份 5.32 的提交是 `48a7e030`（审计、交接提示词、`large-assets.json`、证据索引四件）；
随后在 `48a7e030` 上重生成三份投影（`records=5 bytes 77253->77192`、
`AUTHORITY_CHAIN=WRITTEN entries=146`、`CURRENT_REPORTS=PASS mode=generate`），三个 `--check`
全绿后提交 `d9a8412b`（12 个投影文件，53 增 53 删）。两个提交一起 fast-forward 推送，
所以两个 ref 的 CI 读数都在 `d9a8412b`：

- **main**：run `40013185833`，`Canonical Verify`，`success`，`19:39:56Z → 19:55:25Z`。
  12 个作业 11 个 success；逐步骤扫描 `conclusion` 非 success/skipped 的步骤为 0 条；
  `Branch light gate` 在 main 上 skipped（设计如此）。
- **分支**：run `40013198844`，同一 SHA，`success`；`Branch light gate` success（8 步），
  其余 11 个作业按设计 skipped。两个运行的覆盖面互补，合起来没有未跑的作业。
- `GitHub Actions` 另有一条 runner 标签迁移提示（ubuntu-latest → Ubuntu 26，2026-10-19 起），
  不影响本次结论。

这次只改了一处代码：`scripts/generate_archive_record_register.py` 的「工作树里有 N 份被还原成 CRLF」
原来把**任何**工作树与 blob 的字节差都归因成 CRLF。回填本节时审计文件有未提交编辑，生成器就把那
1,267 B 写成「被还原成 CRLF」，并把这个错误归因写进了索引。修复是先把工作树按 `\r\n→\n` 归一化再
与 blob 比，只有归一化后相等才算行尾差异；反证是同一个带未提交编辑的工作树，修复前报 2 份
（`MANIFEST.json` 1,867 B + 审计 1,267 B），修复后报 1 份（只有真的 `MANIFEST.json`）。
CI 从 `cf77b2c2` 的 `success` 推进到 `d9a8412b` 的 `success`，中间没有出现红。

### 5.34 第二轮打磨与设计审查入库（`967d3eed` → `3c6ca491`）

**这一轮没有新功能，只把第一刀留下的可见缺陷与证据账收干净。** 三个缺陷在
`967d3eed` 上修好并逐屏复读：

1. 列表行把修订号印两遍（`r1` + `推荐 r1`）。现在推荐且最新只印一个
   `最新 r1 · 推荐版本`，非推荐行印 `r1` + `无推荐版本`；`apps/workbench/tests/appshell.mjs`
   同时断言合并文案存在、`推荐 r2` 不存在、`r2` 只出现一次。
2. 详情头同样重复。推荐条目详情现在只出现一次合并徽章。
3. 窄视口下当前导航项不在侧栏视口内。`sync(view)` 里加了 `scrollIntoView({block:'nearest'})`，
   E2E 新场景 `desktop-nav-active-visible` 要求 `scrollTop>0` 且按钮矩形落在导航视口内，
   不满足就退出码 13；实测 `scrollTop=751`、按钮 593.5–640.5 落在 124.5–641。

另有一处注释错误：`browser_design_layer_e2e.mjs` 说「ROUTE_VIEWS has 22 entries」，而该文件
数的是 `.app-nav-item`（22 项，含走空 hash 的工作台）；B10 侧栏是 21 个按钮。`DESIGN.md` 的
「导航 22 项（侧栏 21 个按钮）」本来就是对的，错的是注释，已在 `8e27a95c` 改回 21 并说明两种计数。

**证据与账本。** 19 条新回执全部绑 `967d3eed`，写入 `currentExecution` 后共 235 条；
任务状态从「3 PARTIAL + 1 IN_PROGRESS + 1 NOT_STARTED」变为：
`DL-KB-03/04/06 = DONE`（三条轴各有 PASS 回执），`DL-KB-01/02/05 = PARTIAL`，
`DL-KB-07…16 = NOT_STARTED`，旧 34 项仍 `FROZEN_DEFERRED`（直方图
`FROZEN_DEFERRED 34 / DONE 3 / PARTIAL 3 / NOT_STARTED 10`）。三条 PARTIAL 缺的都不是
"再跑一次绿"，而是尚未存在的断言或路由，逐条写在回执 `command` 里：

- `DL-KB-01`：本地九门只证明这一棵树；干净克隆与 EOL 复现要干净 checkout，等本轮推送后的
  CI 作业读数回填，回执写明这是它停在 PARTIAL 的原因。
- `DL-KB-02`：A5「模型服务关闭时仍可写入、检索、编辑与复制」没有直接断言。
- `DL-KB-05`：A2 已实测（追加、旧摘要不变、409 冲突带修订号、重启读回一致），
  D5「回退推荐版本后旧方案仍可读、失效来源可标记并替换」既没有回退路由也没有
  失效来源字段，依赖尚未开工的 `DL-KB-07`。

**门禁。** 更新账本前后各跑一次九门，全部 exit 0：`TOP_AUTHORITY_GATE` 10 项、
`TASK_DOC_STATE_GATE` 13 项、`DOCUMENTED_COUNTS`（claims=20、route_views=22、cli=24、
adapters=30、routes=72）、`RECORD_REGISTER_GATE` 5 项、账本合同、上下文完整性、
投影新鲜度（records=14 / verified=21 / findings=0）、证据工件存在性、账本主题绑定。
`EVIDENCE_ARTIFACTS` 行如实保留 `tracked_drifted=64`——那是历史可变源文件的预期漂移，
不是新回执；新回执 19/19 都在盘上且摘要吻合。

**并集首跑不是全绿，两处红灯都已定位并修复。** `run_python_tests_all.py --shards 6` 在
`967d3eed` 的树上：shard 1/2/3/5/6 `exit=0`，shard 4 `exit=1 tests=476 {'FAIL': 2, 'PASS': 473, 'SKIP': 1}`，
失败项是 `test_verifier_internals.AggregateChainTests.test_aggregate_verify_runs` 与
`OpenDesignAssistanceTests.test_boundary_pass`。第一条是根因，第二条是它的下游：
新入库的 `design-lab/scripts/knowledge_revision_probe.py` 缺 SPDX 头，
`verify_license_coverage.py` 报 `MISSING SPDX`，连带 Open Design host verifier 与
`verify_design_lab.py` 的聚合红。补上 SPDX 后第二条转绿，第一条仍红，暴露出第二个真问题：
`kb-05-implementation-revisions.log` 是 Windows cp936 stdout 写出的日志（第 513 字节
`0xb7` 起是中文标题），`verify_identity_gate.py` 以 `IDENTITY_GATE=FAIL total=1 scanned=3241`
判它不可读。修法是按 cp936 解码再以 UTF-8 写回，先证明文本逐字符不变（`b.decode('cp936')`
与重编码后的 `decode('utf-8')` 相等）再落盘，并在同一个提交里把账本那条回执的
`artifact_sha256` 重钉为 `b58d862ef24ddfc579fbe45bb208ebe28f6a3dc1ccfad6d454a81f79b2e0c659`
（1,348 → 1,366 B，内容不变、编码改变）。修复后 `IDENTITY_GATE=OK total=0 scanned=3241`、
`LICENSE_COVERAGE=OK`，两条失败测试按定向重跑各自通过
（`test_aggregate_verify_runs` 118.34s、`test_boundary_pass` 1.16s）。
这次的内容没有变，但**证据文件的编码也是证据的一部分**：一份二进制上不可读的日志
会让整个聚合链红，而它看起来只是"一份日志"。

**并集复跑全绿（同一棵树，`60e40773`）。** `run_python_tests_all.py --shards 6` 六片全部
`exit=0`：1/6 `tests=626 {'PASS':626}` 1310.396s、2/6 `626 {'PASS':625,'SKIP':1}` 75.221s、
3/6 `562 {'PASS':561,'SKIP':1}` 265.913s、4/6 `476 {'PASS':475,'SKIP':1}` 182.048s
（r2 红的那两条就在这一片）、5/6 `380 {'PASS':379,'SKIP':1}` 48.001s、
6/6 `530 {'PASS':529,'SKIP':1}` 126.230s；`PYTHON_TESTS_UNION=OK expected=3200 distinct=3200
ran=3200 duplicates=0 missing=0 unexpected=0`，`UNION_RUNNER_EXIT=0`，合计 PASS 3195 / SKIP 5。
r2（红）与 r3（绿）两份日志都入库，不删不改：红的那份记录的是修复前的事实。
本机读数永远不是 CI 读数，最终判据仍是推送后逐作业读到的结果。

**CI 读数：干净检出复现成功（`3c6ca491`）。** 推送后 `main` 的 run `40036696250` 在 `3c6ca491`
上 `success`：12 个作业位里 11 个 `success`、`Branch light gate` 按规则 `skipped`；同一 SHA 的分支
run `40036704582` 也 `success`（只跑 Branch light，其余跳过）。逐行读数（本次从作业日志读出，
原样存入 `kb-01-delivery-ci-clean-checkout-20261024.log`）：`TOP_AUTHORITY_GATE=PASS checks=10
failed=none`、`RECORD_REGISTER_GATE=PASS checks=5 pathish_named=21 problems=0`、
`VERIFY_RESULT=OK total=549 failed=0`、`VERIFY_DESIGN_LAB=OK total=76 failed=0`；三片
`shard=1/3 exit=0 tests=1102 {'PASS':1089,'SKIP':13}`、`2/3 exit=0 tests=1006
{'PASS':1002,'SKIP':4}`、`3/3 exit=0 tests=1092 {'PASS':1087,'SKIP':5}`，
`PYTHON_TESTS_UNION=OK expected=3200 distinct=3200 ran=3200 duplicates=0 missing=0 unexpected=0`。
这是全新 Linux checkout：登记册的五个 blob 摘要被原样复算通过，EOL 没有被规范化改写，
`DL-KB-01` 的第二条验收（干净克隆复现）由此落地。

**上一枚是红的，红在登记册。** `f75c6909` 的 run `40036507654` 只有 `Top-level Authority` 作业失败，
其余 11 个成功：§5.34 这份 append 改写了登记册第 5 件（交付报告本身）的已提交字节，而
`docs/RECORD-ARCHIVE-INDEX.md` 还钉着旧 blob（`8d95f14263ab` / 193,302 B），所以
`RECORD_REGISTER_GATE` 拒绝。修法不是改闸门，是 `3c6ca491` 重新生成登记册（第 5 行改钉
`e0028440f230` / 200,089 B），并顺手修了生成器里那句错话——旧模板把"最后改写提交"写成了"首次读自"。
哈希绑定的记录改写天然要两次提交，这正是登记册设计里写明的那条，不是流程事故。

**`DL-KB-01` 收口。** 三条验收逐条落地：四条闸门在 `3c6ca491` 上同绿（两条由 CI 作业读出，
`TASK_DOC_STATE_GATE` 在那次 CI 的统一校验里 PASS；`DOCUMENTED_COUNTS` 不在 CI 里，本机在收口树
实测 `claims=20 route_views=22 cli=24 adapters=30 routes=72`，它计量的每个量——路由数、子命令数、
adapter 数、两跳链、冻结/派工两个分母——都不受本轮改动影响）；干净克隆复现由上面这次 CI 读数证明；
旧 34 项仍全部 `FROZEN_DEFERRED`，本轮没有解冻任何一项，规划没有被写成实施证据。回执
`kb-01-delivery-ci-clean-checkout-20261024`（axis `delivery`）绑的就是这份日志；账本状态
`PARTIAL → DONE` 后直方图为 `FROZEN_DEFERRED 34 / DONE 4 / PARTIAL 2 / NOT_STARTED 10`，
证据 236 条。

**设计审查插件第一次跑全。** `design-review` 插件对 `design.qa.yaml` 的 26 个屏幕
（22 条桌面路由 + 4 个 390×844 窄窗探针）跑出：

- a11y：26 次扫描、0 findings、`ok=true`。这是自动扫描，不是 WCAG 认证，也不是真人验收。
- design debt：713 findings、`ok=false`、10 个文件、27 个 token 值。分布
  px-magic 630 / hard-coded-color 38 / functional-color 14 / custom-shadow 28 /
  tailwind-arbitrary 3；severity minor 630 / major 52 / debt 31。按文件：
  `style.css` 683、`shell.ts` 28、`workbench.ts` 2。

这条按**未关闭的登记**入账，不按通过。`style.css` 同时是 token 声明处与组件规则所在地，
原始值里有一部分就是 token 定义；`shell.ts` 的 28 条里 17 条是注释命中，非注释的 11 条中
`5985` 是 token 预览样例 JSON、`9273` 是资源 ID 正则、`workbench.ts:377` 是路由正则，均为误报；
真实内联样式是 `5475/5477` 与 `6856/6860/6870` 五处，`6418/6692` 是 760/840px 断点常量。
清理属于版式轮次，本轮不把阈值调低，也不写"设计债已清零"。

**`evidence-index.json` 只覆盖第一刀。** 它仍然绑 `7f5e68d7` 的 47 份首刀件；
第一刀之后的 20 份新件（第二轮 19 份 + 第三轮 1 份 delivery 回执）由账本 `artifact_sha256`
逐条绑定，不并入那个索引。读证据时以账本为准，
不要把索引当成"证据包全量清单"。

### 5.35 第四刀 K3：方案对象与设计辅助（`2d9372fb` 实现 → `103a6680` 收口）

**落地形状。** 实现提交 `2d9372fb` 新增六条路由：`GET /api/assistance-plan-output-types`、
`GET /api/projects/(id)/assistance-plans`、`GET /api/projects/(id)/assistance-plans/(aplan-…)`、
`POST /api/projects/(id)/assistance-plans`、`POST …/assistance-plans/(aplan-…)/revisions`、
`POST …/assistance-plans/(aplan-…)/choose`。实测 ROUTES 72 → **78**（42 GET + 36 POST）；合同账本
74 → **80 行**（BOUND_SCHEMA 66 / SCHEMA_LESS 14；方法分布 44 GET + 35 POST + 1 GET+POST）；live
载荷绑定 41 → **47**（`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=47 failures=0`）；`ROUTE_VIEWS`
22 → **23**，`DESIGN.md` 导航 22 → 23。新增五份 plan schema（plan / write / readback / list /
output-types）与一张 94 行的 state 表。

**`DL-KB-07`（中立方案对象 + 一份创意意图）收口。** `test_assistance_plan` 18 项：
"已保存／方案已提供／用户选用／外部未验证"是四条独立读回路径，复制不写任何一条；修订追加、
不改旧链；带过期 `expected_revision` 的写被拒并点名实际版本；只有具名真人能做选用；未接回执的
选用保持 `LINKED_ONLY`，直到存储里出现反转；缺号一律 `UNUSED` 字面量。路由注册、合同行与 wheel
打包由 77 项（`test_route_payload_contracts`、`test_ledger_schema`、
`test_packaged_contract_resources`）复核。

**`DL-KB-08`（设计辅助初始态 + 方案详情屏）收口。** 浏览器实跑 `result PASS`、`consoleErrors 0`：
保存后 `saved=true` 而 `providedAfterSave`／`chosenAfterSave`／`externalVerified` 全为 `false`；
复制成功且 `copyCarriedHonesty`、`copyWroteNothing`、`copyChoseNothing` 均为 `true`——复制既不改状态、
也不代替选用；空目标被拒（`emptyObjectiveRefused`）；手工补创意可行（`suppliedCreative`）；
`providerPrimary` 是 `as-choose`，选用后 `chosen=true` 且 `chosenActorShown=true`；`revisionRows=2`；
重载读回一致（`reloadReadback`）；无聊天面（`noChatSurface`）。工作台 node 30 项（含
`㉔ B10_NAV` 从 `ROUTE_VIEWS` 派生）与 Python 44 项同绿。

**视觉与闸门。** 截图 manifest 绑 `2d9372fb`：81 张（assistant 在 1280/1440/1920），
视觉复核另存四张（`detail@1440-saved` 378,639 B、`detail@1440-chosen` 455,730 B、
`detail@1280-chosen` 437,580 B、`list@1280` 214,538 B），逐张 sha256 在收据里。UI audit
`ok=true`、`violations=[]`；溢出量 1100/900/750/620 四档；对比度 3 项双 palette；设计审查插件
第一次覆盖 `#/assistant`：27 屏 axe 扫描 0 findings（自动扫描，不是 WCAG 认证），设计债
713 条（630 minor / 52 major / 31 debt）与助手屏出现前条数、严重度与文件分布相同，
`(file, rule, severity)` 的 713 条多重集完全一致；差异是 28 条行号随 `shell.ts` 增长而位移，
不是新增债务。新界面没有新增字面 px 或硬编码颜色。收口树九门 `VERIFY_DESIGN_LAB=OK total=76 failed=0`，并带
`VERIFY_RESULT 549` / `VERIFY_PRODUCT_MANIFEST_V3 493` / `VERIFY_RUNTIME_CONTRACTS_V3 239` /
`VERIFY_VISUAL_SCORING_V3 10`；投影新鲜度 0 findings；authority gates 7 项 PASS。账本追加 13 条
回执（KB-07 两条、KB-08 十一条）后共 **249** 条全部 PASS，直方图
`FROZEN_DEFERRED 34 / DONE 6 / PARTIAL 2 / NOT_STARTED 8`。本目录现有 86 个受跟踪文件：
索引仍只覆盖第一刀 47 份，其余 39 份（本轮新增 15 份）由账本 `artifact_sha256` 逐条绑定。

**CI 第一次读数与修复。** PR #277 的首个完整矩阵（run `40048178001`，SHA `142e7efe`）是 9 个作业
success、Python gate 红，`Branch light` 与 `CI artifact proof` 按规则跳过。shard 3/3 共 1026 项里
唯一失败是 `test_backup_watches_written_tables.CoverageTests.test_every_written_table_is_watched_by_the_proof`：
KB-07 新增的 `assistance_plan`、`assistance_plan_revision`、`assistance_plan_choice` 三张表由 store
直接提交、不持写锁，却没有进 `project_backup.py` 的 `COUNTER_QUERIES`——备份窗口吞掉一次修订或一次
选用，仍会报 `PROVED_QUIESCENT`。这条规则住在单元测试里，`verify_design_lab.py` 的 76 项不含单元测试，
所以本机九门全绿也没拦住它。修复是在 `COUNTER_QUERIES` 追加三行 `rowid` 计数并写明理由；复验是
`test_backup_watches_written_tables` 5 项、`test_project_backup` 加 `test_evidence_artifact_presence`
48 项（1 skip），本机三 shard 并集 `3213 PASS / 5 SKIP / 0 FAIL`（shard 1108/1084/1026 项，
用时 408.5 / 1487.1 / 140.4 秒）。同一条并集在 CI 上的分布是 `3195 PASS / 22 SKIP / 1 FAIL`——两边总数
同为 3218，SKIP 差 17 项来自 runner 与本机的宿主环境差异，不是同一批用例被换掉。修复提交 `dbdee924`
的复跑 run `40076707359`：见本节末尾的逐作业读数。

**未证与未修。** `1440×900` 与 `1280×800` 下详情屏的主操作落在首屏折叠线以下
（`1920×1080` 可见）；它不违反任何验收句，但属体验缺陷，留给版式轮次，本轮不为此重排布局——
重排会让整条刚量好的证据链失效。收据里的选用人写作「示例审阅人」，是**示例**不是真人验收；
E2E 自己的 `subjectSha` 写的是 `local`，工件身份靠 bundle sha 与截图 manifest 的 commit 绑定，
账本回执里照实写明。a11y 的 0 是自动扫描。`DL-KB-02` 的 A5 仍无直接断言；`DL-KB-05` 的 D5
在 KB-07 收口后需要重新量，不能因依赖项 DONE 就写成已证。下一刀是 K4：
`DL-KB-09`（目标档案：软件×模型×入口）与 `DL-KB-10`（目标组合选择面板屏）。

**复跑逐作业读数（run `40076707359`，`dbdee924`）。** 10 个作业 success，`Branch light` 与
`CI artifact proof` 按规则跳过——前者只在非 main 的 push 上跑，后者只在 main 的 push 上跑，所以 PR 上
本来就不该出现它们。三个 shard 分别是 1108 项 `1103 PASS / 5 SKIP`、1084 项 `1071 PASS / 13 SKIP`、
1026 项 `1022 PASS / 4 SKIP`，合计 `3196 PASS / 22 SKIP / 0 FAIL`；与本机并集同为 3218 项，FAIL 归零，
`test_every_written_table_is_watched_by_the_proof` 这次在两张表都计数的代码上绿。

### 5.36 第五刀 K4／K5／K6：材料、目标、反馈与复用闭成一条链（实现 `36addfd5`）

**这一刀把七段链接上了。** 真实需求与参考 → 可编辑方案（DL-KB-07/08 已有）→ 按需生成或编辑材料 →
按材料选择目标 → 实际复制或导出 → 用户自愿记录外部使用反馈 → 方案与适用经验再次查找复用。本轮新增的
是后四段：`src/design_lab/plan_export.py` 用**一个** `_intent()` 构建器渲染 markdown／txt／json／分镜
CSV 四种形态，CSV 的转义是在吐出的字节上证的（引号、逗号、换行各一条），没有镜头行的方案**拒绝**出
CSV 而不是吐一张空表；`src/design_lab/target_profile.py` 把软件×模型×入口做成五条路由加一份
`design-lab/config/target-profiles.json`，未知入口保留 UNKNOWN、校验永不发放执行权；
`src/design_lab/plan_feedback.py` 记自愿的外部结果反馈，写完方案的四个状态一个字都不动、修订历史
仍在、结论词由服务给出；「我的方案」这一面补了页内检索与筛选（说明句写清"筛选只在这 M 条里做，
不是全库搜索"）、两份**真实修订**的逐字段对照、由服务铸号的复制一份，以及一份活过重载的未完成编辑
（本机存储、24 小时过期、超长不写、结构不对就当没有、保存成功即清除）。路由面从 86 涨到 **87**
（48 GET + 39 POST），写侧扫描表 `rows=39 walked=38 written=38 read_backs=47 refused=0 excluded=1`。

**两道闸门被这一刀量出两个真缺陷，都是先红给我看才改的。** 对比度闸报过一条 `1.31:1` 的
`p.view-hint`，查下去是**假失败**：闭合的 `<details>` 在 Chromium 里仍保留真实布局盒
（`::details-content` 是 `content-visibility: hidden`），`display`/`visibility`/`opacity`/矩形四道
过滤都放行，于是"没人看得见的那行字"被按它像素位置上那块兄弟面板的颜色判了分。修法是量之前先把
所有 `<details>` 展开，并把带进来的行数报成 `collapsedOpened`，同时埋一条**闭合的**白底白字对照件
——只有真的展开了它才会被报出，所以这条修正不可能悄悄变成少量。同一轮还暴露 `oklab(...)`
（`color-mix(in oklab, …)` 的序列化形式）这道闸读不懂，按它自己的家规"扩解析器而不是降阈值"补上，
并且用 CSS Color 4 规范里那四组 sRGB↔OKLab 对照值判分，不是用文件里另一个函数自证。改完两档主题各
量 50 个面、`checked=14002`、`belowAA=0`、`collapsedOpened=6228`、`unparsable=0`、`colourBad=0`，
最紧的一对是 4.11:1（深色）与 4.14:1（浅色）。截图闸的等待条件也错过一次：它要求每条
`[role="status"]` 都有文字，而材料回执那句在人不点"复制"时**本就该是空的**，于是方案详情三档宽度
全部 `settle-timeout`；改成只等"没有还在读回"，内容由脚手架自己的读回断言保证。

**一处真实超标，所以 `DL-KB-13` 是 PARTIAL。** 交付方案 §14 写的是"首屏 JavaScript gzip 不超过
150KB"，本轮实测 `apps/workbench/build/main.js` 原始 593,796 字节、gzip **155,787** 字节，超过上限；
样式表 110,904／gzip 40,530，远程引用 0。不能靠改构建解决：`vite.config.ts` 顶上的合同写明这个包
**故意不压缩**，因为原生 UI 契约测试要读顶层函数名与界面文字，压缩会让契约静默失效；也不该为凑数字
删必要内容或换栈（同一节的原话）。搜索与操作延迟达标且余量很大：1,000 条按真实结构生成的样本、
30 次查询，`search p95=28.89ms`、`create p95=8.14ms`、`detail p95=8.94ms`（阈值分别是 300ms 与
100ms），推理延迟单独报、不混进界面指标。几何面这轮补了 1536 CSS px——1920 物理屏在 Windows 125%
下的宽度，100/125/150 三档里此前**没人量过中间那一档**，现在溢出闸扫 `1440,1280,1536,1920`。
§14 还要求"安排至少 3 位目标用户做无指导任务"，那不是我能替的验收，所以这一行停在 PARTIAL。

**账本读数（`36addfd5` 上现测，21 条新回执，`kb-20261024` 目录）。** `DL-KB-09`、`DL-KB-10`、
`DL-KB-11`、`DL-KB-12`、`DL-KB-14` 记 DONE（各自 `evidence_requirements` 的轴都有 PASS 回执）；
`DL-KB-13` PARTIAL（体积超标 + 真人无指导任务未做）；`DL-KB-16` PARTIAL（实现与单元都 PASS，
`human_review` 只认具名真人，代理不签）；`DL-KB-15` 仍 NOT_STARTED，它的前置是"用户在本机实际可用的
推理服务与硬件余量"，本轮不部署模型、不自行下载权重。全量门禁 `VERIFY_DESIGN_LAB=OK total=76
failed=0`，UI 审计闸与截图采集（带合成方案种子）都是 0 退出，受影响的十个 Python 模块单独跑全绿。

**这一轮自己追正的一处：上面那段"留给下一轮的覆盖洞"已经在本轮补掉了。** 写下它之后紧接着就动手了：
几何闸与 UI 审计闸现在都在量之前先展开闭合的 `<details>`，并各自报出展开了多少个面板——几何闸在 112
个路由量测里展开 **1200** 个（单路由最多 98 个，在 research／capability／capabilities 那三面），UI 审计闸
在 54 个 scope 里展开 **324** 个。两道闸的包装各加一条断言：这个计数为 0 就红，所以"展开这一步被删掉"
不可能悄悄变成一次绿色。改完两道闸都全绿——**没有新增任何一条几何或可读性违规**，也就是说这些折叠面板
打开后的版式本来就是好的，此前那句"数说的是布局盒不是像素"是断言范围的问题，不是被掩盖的缺陷。剩下的
真问题反过来：闭合态自己的裁剪行为现在不再被这两道闸声称，谁要声称得另立一把尺。另两处未闭环的账不变：
`DL-KB-02` 的 A5 仍无直接断言，`DL-KB-05` 的 D5 需要重新量（回退要事件表，本轮没有加）。

边界不变：桌面端 only，手机端仍是排除项；不部署模型、不宣称推理已验证；导出与复制是**读回**不是
发送，页面上那句"这只是把材料交出去，不是选用，也不是发送"是服务给的词；编号仍由人填或显式选
UNUSED；三方素材与字库在范围外；E 盘不动；旧 34 项仍 `FROZEN_DEFERRED`；release、装机分发、真实宿主
E3、真人 E4、ComfyUI、MiniMax H3 与外部软件自动操作继续冻结。

**CI 把本机量不到的四件事顶了出来（逐提交读数）。** 收口提交 `d33b8e1c`/`64ad6f9b` 的首轮矩阵红了三个
作业，逐个查因，没有一条靠改断言糊过去：
① `test_gate_reachability` 报 `measure_workbench_weight.py` 声明了 `--check` 却没有任何表、链条或测试
调用它——这正是"闸门可达性"家规该抓的东西，已把它作为一步接进 Workbench 作业（`7a6ab695`）：它现在
守的是"不许有远程引用"这半条已经成立的规则，体积那半条只发布读数不判分；
② 21 条新回执绑进账本之后 `AUTHORITY_CHAIN=DRIFT`，因为那份记录钉的就是账本自己的字节，重生成
`reports/current/DEEPSEEK-AUTHORITY-CHAIN.json` 才是对的（同一提交内付清）；
③ 登记册第 5 行钉的审计件字节因 §5.36 而变，按 `git cat-file` 重钉，不手抄；
④ 几何闸在 CI 上判 `1440:capabilities`"这一屏一个标题都没有"，本地怎么都复现不出来——真相是它按固定
1 秒 sleep 量路由，把"还在读回"当成了"没有标题"。现在先等 `#route-view` 的占位消失再量，等不到就进
`OV_INTERACTION_UNMEASURED` 红（`9cba9f11`）。同一类问题在方案对照用例里又抓到一次：等待条件只看
"选用"徽章，而被比较的修订数与反馈数来自两次独立读回，CI 读到 `feedback: 0` 就误判"复制动了源"——
修订数没变恰恰说明产品是对的，错的是等待（`7925efca`）。
**最终 `7925efca` 的 PR 矩阵 `completed success`**：11 个作业里 Branch light 与 CI artifact proof 按规则
跳过（前者只在非 main 的 push 上跑，后者只在 main 上跑），其余全绿。这一串的价值不在"最后绿了"，
在于这四条只有换一台机器才会暴露——本机此前全绿了整整一天。

### 5.37 第六刀 K2 补口：DL-KB-05 D5 的判断存储（实现 `52961f49`，收口同轮）

**这一刀补的是什么。** `currentExecution` 里 DL-KB-05 的验收第三条写着
「回退知识推荐版本后旧方案仍可读；失效来源可标记并替换」。上一轮实测的结论是这句话**说不出来**：
`knowledge_entry_revision.recommended` 是随版本一起写入的、被 append-only 触发器锁死的字段，
所以推荐要么永远等于写入那一刻，要么就得改那个字段——改它就等于拆掉这个条目全部历史的保证。
没有路由、没有字段、没有界面，状态只能停在 PARTIAL。

**现在的形状。** 判断是它自己的一行，追加进 `knowledge_judgement`
（`design-lab/schemas/state/design-lab-state-knowledge-judgement-v1.sql`）：同一条目同一 `kind`
的最新一行是答案，下面的行是"答案是怎么走到这里的"。`POST /api/knowledge-entries/{id}/judgements`
回答的是条目自己的 readback（`recommendation_basis`／`recommendation_judgement`／`source_state`／
`judgements` 四个字段是这一轮加进 `knowledge-entry-readback-v1` 的），所以调用者看到的是被挪动后的
那个数，而不是一张回执。写入面拒绝的四件事各有其代码：`recorded_by_kind != 'HUMAN'` →
`KNOWLEDGE_HUMAN_JUDGEMENT_REQUIRED`（owner 2026-10-21：本机验收只接受具名真人）；没有 `reason` →
`REASON_REQUIRED`；推荐了一个没存过的修订 → `KNOWLEDGE_REVISION_NOT_FOUND`；标记失效却没给出
**库里真的存在的**替代条目 → `KNOWLEDGE_SOURCE_REPLACEMENT_REQUIRED`／`_SELF`／`_UNKNOWN`，
而 `replaced_by` 同时是外键，绕过写入面直接 INSERT 也一样进不来。`recorded_at` 由服务盖，不接受调用方自填。

**为什么这句话现在成立了。** 13 条单元测试里最关键的一条是
`test_moving_the_recommendation_rewrites_no_stored_bytes`：推荐从 r2 挪回 r1 之后，逐条比对
`detail()['revisions']` 的 `content_sha256` 与 `created_at`，**一个字节都没动**。这正是
"旧方案仍可读"的机制面——方案钉住的是修订号与摘要，摘要不变，读到的就是当初那份。重启后同一份判断
还在（`test_a_judgement_survives_a_restart_and_still_outranks_the_written_flag`），所以没有第二张
真值表，也没有引入第二张修订表：`latest_revision` 与写入标记仍只从 `knowledge_entry_revision` 算。

**同一刀里必须说的另一半。** 界面跟着落了：条目详情里"判断与来源状态"这一块带轨迹与两个表单
（`apps/workbench/shell.ts` 的 `kbJudgementPanel`），缺理由与缺记录人都在本地拒绝、不发请求，
`recorded_at` 不在请求体里。`apps/workbench/tests/appshell.mjs` 用**出货的那份 bundle** 走完了两个
表单、两次本地拒绝与写后重搜＋重读回。

**这条验收还差什么，所以行不升 DONE。** `src/design_lab/assistance_plan.py` 的
`REFERENCE_KINDS = ('ASSET','BRIEF','DIRECTION','PROMPT_RESULT')` 里**没有 KNOWLEDGE**：
方案今天无法钉住一个知识条目，所以"旧方案仍可读"只能在条目层面被证明（字节与摘要不变），
产品里并不存在一条"从方案读某条知识某个修订"的路径。补这一格要动方案 schema 的 `kind` 枚举、
`_resolve_references()` 那个以 `else: # PROMPT_RESULT` 收尾的分支、导出材料如何呈现引用，
以及读回里 `verification` 的取值——是一次独立的改动，登记成缺口而不是顺手糊过去。

**本轮门禁读数（都取自己那行输出）。** `VERIFY_CONTRACT_BINDINGS=PASS schemas=32 routes=90
dispatched=90 bound=76`；`VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=57 failures=0`，其中
`knowledge-entry-judgement cases=2 object locations compared=22` 是两条真判断经真 socket 比过合同；
`VERIFY_WORKBENCH_ROUTE_CALLS=PASS calls=138 routes=88 matched=77 backend_only=11`（新增这一条路由
是被界面真的调用到的，不是又一条 BACKEND_ONLY）；`DOCUMENTED_COUNTS=PASS claims=20 route_views=24
routes=88`；写侧扫描 `POST_SWEEP layout=source rows=40 walked=39 written=39 read_backs=48 refused=0
excluded=1`，`knowledge-judgement` 在 written 名单里；浏览器侧对比度 50 个面 `checked=14002
belowAA=0 unparsable=0`、几何 112 个面（1440/1280/1536/1920）`docOverflowX=0 clipped=0 stray=0
detailsExpanded=1200`，两者都绑在 bundle `sha256 4df788c3…`（602,549 B）上。

**顺带修掉的两个自己的缺陷。** 一是 `contract-bindings.json` 里六条 emitter 行号被这次插入挪走，
`EMITTER_POINTER_NOT_THE_VERSION` 逐条点名——行号会烂，闸门会喊，别抄数字；二是新界面上线后
`el('ul', { class: 'list'` 的存量从 72 变 73，这一条按老规矩写明新增的是哪一个容器再动数字。
重量：bundle gzip 从上一轮记录的 155,787 B 到本轮 `WORKBENCH_WEIGHT_GATE=OK remote=0
bundle_gzip=157739`（同一把尺、同一份文件），KB-13 的 150 KB 预算仍然是 owner 的决定，本轮不代做。
### 5.38 第一次真点开一条知识条目：两个一直存在的表单缺陷（`38bb48d8`）

**为什么要做这一刀。** §5.37 记下了一条边界：没有任何浏览器门禁点开过一条知识条目。这条边界不是
"细节没顾上"，它意味着**整个条目详情面从来没被真实浏览器画过**，而详情面背后的新增／修订表单同样
没有——`apps/workbench/tests/appshell.mjs` 那个 DOM 桩件走得很细，但它的 fixture 把该填的格子都
填了、把许可状态也选了，所以它绿着，而真用户不一定走得通。

**真点一次，立刻红两次。** 新加的这一步（`design-lab/tests/e2e/browser_design_layer_e2e.mjs` 的
`knowledge detail and judgement walk`）在真 Chromium 里点「新增条目」，故意**不填**「适用场景」和
「边界与反例」，然后提交：

1. 服务答 `400 INVALID_PROJECT_FIELDS`。`collect()` 里写的是
   `applicability: value.trim() || undefined`，空串被 `JSON.stringify` 直接丢键；而
   `POST /api/knowledge-entries` 与 `…/revisions` 要的是**精确键集合**（`http_service.py` 的
   `body(fields=…)`：少一个键就拒，多一个键也拒）。界面把两个看起来可选的格子当成可省略的字段，
   服务却要求它们必须在。用户看到的是一句读不懂的代码，而且**只要不填这两格就永远写不进去**。
   修法是键永远在，值留空串——存储本来就把空串写成字面量 `UNKNOWN`（`knowledge_library._text`）。
2. 补完第一条再点，服务答 `400 KNOWLEDGE_LICENSE_UNKNOWN_CONTRADICTION`。许可状态那个 `select`
   没有"未选"这一档，选项来自服务词表、**第一项默认中选**，而本机词表第一项是 `reviewed`：
   一张谁都没碰过的新表单，打开就在替用户声明"这份许可被审过了"，同时许可格子还是空的。存储的
   规则（`license == UNKNOWN` 时状态必须是 `unknown`）是对的，错的是界面把词表顺序当成了默认值。
   现在空表单默认落在 `unknown`，也就是"没人看过"这句实话。

**这条闸现在长什么样。** 走查断言八件事，全部要真值：条目写进去并按编号读回、两格留空仍存成
`UNKNOWN`、空轨迹说的是"还没有人记下"、缺理由与缺记录人各自被本地拒绝且**一个请求都没发**
（按阶段计数的 `posts.afterReasonClick/afterNameClick/afterJudgeClick/afterSourceClick`，
读数 `[0,0,1,1]`）、判断只发一次、屏上的轨迹行数与 POST 返回的 readback 逐字段对得上、
来源失效没替代条目时不发请求。两条表单缺陷另外在 `appshell.mjs` 里各有一条**不需要浏览器**的断言
（新表单默认必须是 `unknown`；修订清空两格后键仍在），两条都在修之前的字节上红过。

**顺带说清一件事。** DOM 桩件不是浏览器的替身：这次是桩件全绿、真浏览器连红两次。反过也一样成立——
所以两边各留了什么断言，写在这段里，别拿一边的绿去声称另一边。
### 5.39 方案终于能引用知识条目：D5 的方案侧补齐（`2c47e359`）

**为什么上一轮只能停在 PARTIAL。** §5.37 把判断存储建起来了，但验收那句话的主语是**旧方案**，而
`src/design_lab/assistance_plan.py` 的 `REFERENCE_KINDS` 只有
`('ASSET','BRIEF','DIRECTION','PROMPT_RESULT')`——方案根本引用不了知识条目，
所以"回退推荐版本后旧方案仍可读"在产品里没有一条走得通的路。上一轮把它登记成缺口，这一轮补。

**加了什么。** `KNOWLEDGE` 成为可引用类型：id 形状用条目自己的 `^kentry-[0-9a-f]{32}$`，
钉的是**该条目当前最大修订**与那一行的 `content_sha256`（不是推荐版本——推荐是另一个答案），
并且因为知识库是全局的、`knowledge_entry` 没有 `project_id` 列，跨项目检查这一支改为**每个分支各自
写明 owner**：知识分支显式写 `owner = None` 并说明为什么，而不是"列不存在就跳过检查"——
后者会让下一个新增类型悄悄关掉一道安全闸。四个 schema 里的 kind 枚举与 Python 那个元组现在由
`test_the_reference_kind_list_is_one_list_across_the_schemas` 钉在一起；在此之前，
只往一边加词不是任何人的失败。

**顺手拆掉的一个真缺陷。** 表单原来把引用存成**光 id**，提交时一律贴回 `kind: 'ASSET'`。
于是一份引用了 brief 或知识条目的方案，一旦在界面上点"修订"，就会把自己原来的引用改标成 ASSET
交给服务，得到 `ASSISTANCE_PLAN_REFERENCE_ID_MALFORMED`——**这类方案在界面上根本改不动**。
现在选择器带类型（一个控件、两组 `<optgroup>`：本工作区素材 / 知识与提示词库），
列表每行显示它是哪一类，选择器给不出的类型在修订时**原样保留**而不是被改名。

**量到什么。** `design-lab/tests/test_assistance_plan.py` 34 条全过，其中
`test_moving_the_recommendation_back_leaves_the_cited_plan_reading_the_same_bytes`
是真 HTTP 路由上的整条链：建条目 r1 → 修订出 r2 → 方案引用（钉住 r2 与它的摘要）→
记一条真人判断把推荐退回 r1 → 再读方案，`references[0]` 与判断之前**逐字段相同**，
`reference_status[0].state` 仍是 `CURRENT`。另有一条写 r3 的用例量的是相反方向：
链接变 `CHANGED`、摘要与钉住的修订号不动。浏览器那侧走查从 8 件加到 **10 件全真**，
新增的两件是 `pickerOffersBothSources` 与 `planCitesTheKnowledgeEntry`。
途中被服务正确拒过一次 `ASSISTANCE_PLAN_SHOTS_NOT_APPLICABLE`（表单里留着上一段的分镜行，
而我选了平面类型）——那是走查自己的错，拒得对，改成 `STORYBOARD` 后通过，没有动服务的规则。

**于是这一行升到 DONE。** `currentExecution` 直方图从 `DONE 11／PARTIAL 4` 到
**`DONE 12／PARTIAL 3`／`NOT_STARTED 1`**，`evidence` 277 条。升的依据是定义里三条验收
（A2、D5、重启一致且不引入第二张修订表）都各有实测回执，`evidence_requirements` 要的两个轴
（implementation／unit）都 PASS，另加 browser 轴两条。没做的仍然写着：
`DL-KB-13` 的体积裁定与 3 位真人无指导任务、`DL-KB-16` 的具名真人签字、`DL-KB-15` 的本机推理前置，
以及 `DL-KB-02` 的 A5 直接断言——那几条不是工程缺口，是要 owner 或真人点头的账。

### 5.40 A5 直接量一遍，顺手补上那条一直缺失的复制（`72710b7f`）

**上一轮欠的是什么。** `DL-KB-02` 的 A5 那句话有四个动词——写入、检索、编辑、复制。前三个在
`test_knowledge_library.py`／`test_knowledge_http.py` 里各有真路由回执；第四个没有，因为
**条目详情里根本没有复制这个控件**：正文读得回、显示得出，用户要带走只能自己选中再抄。
上一轮把这格留着不写，是对的——留着是欠账，写成"离线可复制"就是假账。这一轮先补控件，再补断言。

**"模型关闭"怎么量才算数。** 只写一句"这条测试没配模型"不够：模块可能在 import 时就把
provider 拉起来了，而测试恰好没走到那支。所以 `test_knowledge_library.py` 里加的是一个
**读 AST 的扫描**：`MODEL_FACING` 是一串模型／供应商／网络方向的模块名，
`_reached_names()` 把 `knowledge_library` 模块（含它自己的 import 图）里出现的名字取出来，
`_model_facing_hits()` 按**点号分段**比对——`openai.chat` 这种写法要能被抓住，只比首段就漏了。
紧接着 `test_the_offline_scanner_notices_a_model_import` 往源码里种一条假的 `import`，
要求扫描器必须报出来，同时留一个负对照：种回原字节后必须报 0。
**一把量不出错的尺不能当证据**，这条规则也适用于它自己。
最后一条 `test_writing_searching_editing_and_copying_answer_with_no_model_configured`
先断言 `model_selection` 表**行数为 0**（"没配"而不是"配了没用"），再依次建条目、检索、修订、
读回，并钉 `revised['body'] == detail['current']['body']`。

**界面上加的那一格。** `kb-copy-body` 按钮 + `kb-copy-status` 说明；有
`navigator.clipboard` 就直接写，被拒（非安全上下文／用户没给权限）时退化成**一段只读且已全选**
的 `as-copy-fallback` 文本框，配一句"浏览器拒绝写入剪贴板，请手动复制"——两条路给的都是
**服务答应的同一批字节**，页面不自己拼引用、标题或格式。为了让退化那支在 DOM 桩件里也可测，
补了桩件缺的三个能力（`navigator`、`focus()`、`select()`）：**桩件缺能力不是测试的失败，
是产品的盲区**——那一支代码本来每天都在真浏览器里跑，只是没人能在离线桩件里点它。

**浏览器走查到 11 件。** 新增 `clipboardHoldsTheServedBody`：Chromium 拿到剪贴板权限后点
复制，再读回剪贴板，和**创建路由的应答**逐字节比，而不是和走查自己打的字符串比。
各阶段发请求数仍是 `[0,0,1,1]`：两次"没填理由／没填记录人"的本地拒答**没有真的发出请求**。

**两把静态尺为什么读数一模一样。** 这一轮 `build/main.js` 从 603,048 涨到 605,670 字节，
但对比度仍是 `checked=14002 belowAA=0 unparsable=0 controlMisses=0`（两套主题各 50 个面）、
几何仍是 112 个面 `docOverflowX=0 clipped=0 stray=0`。这不是尺坏了：两把尺的路由清单里
都有 `#/knowledge`（`audit_workbench_contrast.mjs:68`、`audit_workbench_overflow.mjs:106`），
**但它们只走到列表，从不点开一条条目**，新控件在详情面板里，落在它们的行走路径之外。
所以这块界面的证据来自走查和 `appshell`，不来自这两把尺——这句话写下来，是为了下一轮
不要把"读数没变"误读成"改动没被量到所以没风险"。

**于是这一行升到 DONE。** 新增 2 条回执（unit／browser，逐条绑 `72710b7f04b9` 与 bundle
sha256 `3fdb4f636b5c`），`currentExecution.evidence` 277→**279**，直方图
**`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`**。剩下的两格仍然不是工程缺口：`DL-KB-13` 要 owner
对 150 KB 上限表态（同一把尺现在读 gzip **158,722** 字节），`DL-KB-16` 要具名真人；
`DL-KB-15` 的前置是本机可用的推理服务，本轮不部署、不自行下载权重。

**已经看清的下一刀。** 方案的参考选择器现在只给得出 5 种类型里的 2 种（`ASSET`、`KNOWLEDGE`），
`BRIEF`／`DIRECTION`／`PROMPT_RESULT` 服务收得下、界面上选不到。三条读路由
（`/api/projects/<id>/briefs`、`/directions`、`/prompt-results`）都已经存在且各有合同行，
所以这一刀不需要新路由，只把选择器补全并把"这一页读到几条、还有更早的没读到"说清楚。
### 5.41 选择器补齐五种类型：闭环的第一环在界面上接上了（`f6ec0fa0`＋`e172e33e`）

**缺口是怎么留在那里的。** 上一轮写完 §5.40 的"下一刀"就动手做了。做完发现这件事的形状很典型：
服务收五种 `REFERENCE_KINDS`，三份 schema 的四个枚举位置都写着五种，解析器五种都会钉版本与摘要，
三条读路由存在、各有合同行、也各有载荷比对——**只有选择器只列了两组**。
每一侧各自都自洽，所以没有任何一条单元测试能看出中间断了一截：这是**跨侧缺口**，
不是某一侧的缺陷。

**补了什么。** `loadProjectChoices()` 一次 `Promise.all` 读三条项目内清单，
选择器从两组变成五组 `<optgroup>`：本工作区素材／需求 Brief／方向／提示词结果／知识与提示词库。
`result_id` 在服务里按修订存多行，所以清单里一个编号只列一次（取最大修订那一行）。
分页不诚实就是页面替服务说话，所以 `next_cursor` 不是 null 时明说
"这一页之后还有更早的需求 Brief、方向没有读到"。换工作区时 `refreshAssets()` 改名
`refreshReferenceSources()`——它现在重读的是"这份方案能引用什么"，不只是素材。
**一条读失败会怎样**：`apiOrEmpty` 在被拒时是**拒**，不是退回空载荷（只有没 token 的开发态才给空），
所以 `Promise.all` 的失败走到调用方已有的那个 `catch`，屏上说"工作区读数失败：…"。
它不会把一次被拒的读写成"这个工作区还没有需求 Brief"——那句是关于库的断言，不是关于失败的。

**顺手修掉一个一直存在的悬挂 promise。** 首屏那行
`void (async () => { await loadKnowledgeChoices(); })()` 没有 `catch`：库的路由一旦被拒，
这里就是一个未处理的 rejection，而选择器还挂着"库里还没有条目"那句话——同样是把失败说成了关于库的事实。
现在它把拒接住写成 `库未读回：<服务的理由>` 再重画一次。§5.40 已经立过这条规则
（"空的回答是'库里还没有'，被拒的回答是'没读回'"），当时漏掉的是**发起读的那一行**。

**闸门自己报了一次自己的旧账。** 删掉 `verify_workbench_route_calls.py` 里
`GET .../directions` 的 `BACKEND_ONLY` 豁免，不是我改口：门禁先判红
`STALE_BACKEND_ONLY … the frontend now calls it; the exemption is no longer true`。
那句话原先是真的（界面确实只从 design-layer 投影里取方向），现在界面真的分页调它了，
豁免就成了假账，所以删的是豁免而不是断言。

**加了什么牙齿。** `test_the_workbench_picker_labels_exactly_the_kinds_the_store_accepts`
把界面上 `REFERENCE_KIND_LABELS` 的键与 `REFERENCE_KINDS` 逐一比对，并要求每种都有一个
`referenceGroup('KIND', …)`。这条测试如果上一轮就存在，KNOWLEDGE 那一刀不会留下这个缺口——
**它不是给已经修好的东西补分数，是把上一轮真正踩到的那类断裂写进闸门口子**。
浏览器走查 11 件→**12 件**：`pickerOffersBothSources` 改名 `pickerOffersAllFiveKinds`，
另加 `planCitesEveryKind`——走查在同一次保存里挂上 KNOWLEDGE／BRIEF／DIRECTION／PROMPT_RESULT
四种引用，要求**服务**回一个 `revision >= 1` 与一条摘要（页面只发类型和编号，
任何一种钉不住就是这里红，而不是悄悄存一条没法核对的引用）。
§5.39 与第七轮读数里出现的 `pickerOffersBothSources` 是当时的状态名，随断言加宽在本轮改名。

**三把尺与"读数没变"。** 收口 bundle 609,452 字节 / gzip **159,775**（同一把尺，第八轮记录 158,722）。对比度仍
`checked=14002 belowAA=0 unparsable=0 controlMisses=0`（50 个面），几何仍 112 个面
`docOverflowX=0 clipped=0 stray=0 tiny=0`。这次读数不变的原因和上一轮不同，也更该写清楚：
**`<option>` 的文字不是被画的文本 run**——`<select>` 收起时只画当前一项，所以五组选项不会新增
对比度样本；界面真正新增可见文字的是引用列表里每一行的类型标签，而那要先有引用才画得出来，
这条路径由走查覆盖（`citedRow` 断言含"知识条目"），不由这两把尺覆盖。
路由级 UI 审计在提交后的字节上重跑：`ok=true violations=0`，宽度 `1280,1920,2048`，
它的 `environment.commit` 字段直接记了 `e172e33e964b`——**这一条回执绑的是提交号本身**，
不是靠旁边的文件推断。

**账本动了两格记录，没动状态。** `DL-KB-08` 仍是 DONE，回执 11→13（unit／browser，
逐条绑 `e172e33e`）；`currentExecution.evidence` 279→**281**。直方图仍是
**`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`**——本轮没有可升的行：剩下两格 `DL-KB-13`（体积上限裁定＋
3 位真人无指导任务）与 `DL-KB-16`（具名真人签字）要的是 owner 与真人点头，`DL-KB-15` 要的是
本机可用的推理前置，本轮不部署模型、不自行下载权重，也不把"选了模型"写成"推理已验证"。

### 5.42 CI 抓到一次我自己的红：证据清单在本地根本不执行（PR run `40140337003`）

**读数。** 推送 `5041b8f5` 之后：push run `40140333553` success（light gate），
同 SHA 的 pull_request run `40140337003` **failure**，逐作业看只有一个红——
`Workbench browser E2E (exact-SHA controlled-runtime, no-skip)`，其余 10 个作业 success
（`gh api …/runs/40140337003/jobs`）。红的那条断言是：

```
AssertionError: Lists differ: ['bla…', 'clipboardHoldsTheServedBody', 'emptyTrail…]',
                            != ['bla…', 'emptyTrailSaidNotAskedAndAnswered', …, '…ody']
```

**根因不是产品，是我写的断言。** `assertEqual(sorted(kb_states), [字面表])` 里那张字面表
是我按浏览器驱动的**写入顺序**抄的，`clipboardHoldsTheServedBody` 被我加在末尾——
左边永远是字母序，右边不是，**两边不可能相等**。这一条从它被提交的那一刻起就只有一种结果。

**为什么本地看不见。** `test_workbench_design_layer_e2e.py` 的整段证据断言包在
`if os.environ.get('E2E_REQUIRED') == '1':` 里，那个变量只有 CI 的 no-skip 作业设。
本地跑的是同一个测试、真的启动了同一个 Chromium、真的重写了同一份 summary，
`Ran 2 tests / OK` 也是真的——**但它验的是驱动自己那条 `E2E_OK`，那十二件事实的清单比较一次都没执行**。
所以我把"本地浏览器走查全绿"当成过这一条的凭据，而它当时并不能为这句话作证。

**两边都补了，不是把断言删掉。** `b90aaf66`：
① 条件改为 `E2E_REQUIRED == '1' or summary.is_file()`——走到这一行的运行必然有工具链，
驱动失败会以非零退出先红，所以**只要 summary 存在就把它验掉**；required 而没有 summary 仍然是硬失败。
② 两张清单（六态与十二件）都包进 `sorted(...)`，把"顺序打错"从一种可写出来的错误改成写不出来的。
③ 牙齿按老规矩双向验：改完之后本地跑 `Ran 2 tests / OK`；再往清单里种一个 `'bogusStateName'`，
**本地立刻** `AssertionError: Lists differ … 'bogusStateName'`——同一种错，这次不用等 CI。
种完即还原（`git checkout --` 只还原了这个文件，还原前它没有别的未提交改动；
我随后重放的两处 `sorted()` 包裹也是当场补回来的）。

**这条要给下一轮的口径。** 本地 `test_workbench_design_layer_e2e … OK` 这句话**不再**等于
"清单事实已验"，它的含义由本段起改变：现在它确实包含那十二件，因为条件不再只认 CI。
在它之前写的每一句"本地浏览器走查全绿"，验的是驱动侧的 `E2E_OK` 与 summary 里的
`allAsserted`，**不是** Python 侧的清单比对——这两件事以前不是一回事，以后才是。

### 5.43 尺子开进详情面板，第一件事就是量出一个真的 AA 缺陷（`a7c43891`）

**为什么这一刀值得做。** §5.40 与 §5.41 连着两轮写了同一句话：两把静态尺走到 `#/knowledge`
就停了，从不点开一条条目，所以判断轨迹的小字、两个判断表单、剪贴板被拒时的退化框
**从来没被对比度与几何量过**——只被走查点过，而走查断言的是"话有没有说对"，不是"这行字够不够黑"。
一句被写两次的覆盖盲区，就是下一刀。

**做法照已有的先例。** 方案详情早就是这张尺的一个具名状态（`assistant+plan-detail`：先用服务
写一条合成方案，再点开，等镜头表与材料格式读回来才量）。这一轮给知识条目做了同一件事：
`seedKnowledgeEntryForAudit()` 走真路由 POST 一条合成条目（`created_by` 写明"合成，不是真人"，
随临时状态目录一起丢），点开 `.kb-open`，等 `kb-copy-body`、判断表单与正文都画上（20s 上限，
**没装配完就说"无人认领"，不量空壳**），量成 `knowledge+entry-detail`。对比度与几何两侧都加，
两份闸门的测试各自要求这个状态在**每个宽度**都出现在报告里——不然"少量一块面板"会变成一次安静的绿。

**它第一次跑就量到一个缺陷。** 逐字读数（控制跑，改动前的样式表、同一个 bundle、同一份种子）：

```
LOWCONTRAST 1440:knowledge+entry-detail 4.08:1 need>=4.5:1 16px bold opacity=1
  fg=rgb(49, 108, 255) :: strong :: 镜头拆解三步法（合成）
```

**为什么列表屏从没报过它**：这行字是 `.kb-open:hover` 的色——鼠标停在哪儿，哪儿才换色。
点开详情时指针正好还压在刚点开那一行的标题上，于是量到的就是 hover 态。`--accent` 是品牌蓝
`#316CFF`，在这块表面上只有 **4.08:1**，16px 粗体按 AA 要 4.5:1，深色与浅色两套主题各红一次
（那一轮 `Ran 3 tests … FAILED (failures=2)`）。这条控制与修复后的对照都进了回执：
`kb-03-contrast-prefix-control.log`。

**改的是字色选择，不是品牌。** 三条 hover 墨色（`.kb-open:hover`、`.as-plan-open:hover`、
`.capability-chip-x:hover`）改用 `--secondary`——这个 token 正是本项目为"小号有色文字"准备的
按主题走的那一支（`ui2026/light` 的覆盖块就是重指它，"而不是让浅色主题带着读不清的小标签上线"）。
`--accent` 本体一个字没动：品牌蓝能不能承载正文级白字仍是要 owner 裁的账，
**闸门量出一个缺陷不等于拿到了改品牌的许可**。

**量的面确实变大了。** 对比度 50→**52** 个面、`checked` 14,002→**14,278** 条文本 run，
`belowAA=0 unparsable=0 controlMisses=0`；几何 112→**116** 个面，
`docOverflowX=0 clipped=0 stray=0 tiny=0`，四个宽度的条目详情都报到 `state=read`。
**计数上升就是"伸手够得更远"的证据**，这不是把阈值放宽换来的一次绿。

**账本。** `DL-KB-03`（知识与提示词库界面）加一条 `visual_review` 回执，
10→11 条，状态仍 DONE；`currentExecution.evidence` 281→**282**。
本轮没有行需要升：可机器证明的面上一轮已经升完，剩下的 `DL-KB-13`／`DL-KB-16`／`DL-KB-15`
仍是 owner、真人与本机推理前置的账。

### 5.44 几何尺也开进方案详情：先量到"报了但没算"这个洞（`7d97ac8d`）

**不对称在哪里。** §5.43 给知识条目补了几何之后，剩下的形状就看清楚了：对比度尺**早就**会点开一份
方案（`assistant+plan-detail`，先经服务写一条合成方案），而几何尺从来不点。也就是说
**镜头表、导出面板、反馈块**这几块界面，在 1280／1536／1920 三个宽度上从来没有几何断言——
一条长中文需求会不会把面板顶宽、镜头表会不会在窄一侧挤断，没人量过。

**照先例做，但先掉进自己的坑。** 第一版把两个面板行塞进 `report.routes` 就结束了。看起来是对的：
报告里有这两行，测试也要求它们出现。**但闸门累计量的那几行（`clippedTotal` 等）与
`occluded → specProblems` 只在路由循环和原有的交互态分支里做**，我新加的行既没进计数器也没进
失败清单——**面板一旦被点开，它的 clip／stray／occlusion 是打印出来给人看、然后被忽略的**。
这正是"报了"与"算了"不是一件事。改成一个 `absorbPanel(key, m)` 单入口（和对比度尺里 `absorb`
同一句话：两处累计会让同一批计数有两个主人），并给测试加一条硬断言：
`OV_SUMMARY interactions=` 的数量**必须等于**报告里带 `+` 的行数。少一行就是红。

**第二个洞是这把尺自己的措辞。** 新行进来之后 `occluded=3`：顶栏的设置／工作区／搜索三个入口
"被遮住"。逐字读数是 `by:"elementFromPoint returned null"`，rect 的 `top≈-1814`、视口高 900——
它们不在"被什么东西盖住"，它们在**视口上方 1.8k 像素处**：设计辅助这一屏很长，点开方案详情时
浏览器把整份文档滚了下去。而这个探测块自己的注释写着"不在屏上"与"被盖住"是两件事，
代码却没遵守——`!r.width || !r.height` 只挡住了没有盒子的情况。现在多加一个 `notInView` 桶，
带上中心点、视口尺寸与 `top`／`bottom`，`occluded` 只留给真的被别的元素盖住的情况
（那仍然会进 `specProblems` 把闸门判红）。

**要不要把顶栏吸顶？** 查了采纳包：`02_完整产品方案.md` 只在"玻璃用在哪儿"这一句里提到顶栏，
**没有任何一条要求它常驻可见**。所以这一条按"实测到的现象＋留给 owner 的打磨问题"记账，
不擅自加 `position:sticky` 去补一个规格里没有的要求——那是替 owner 做设计决定。
`notInView` 现在 12 条（3 个入口 × 4 个宽度），全部来自 `assistant+plan-detail` 这四行。

**读数。** 几何尺这一提交 116→**120** 个面（四个宽度各加一行方案详情；§5.43 已经把 112 加到 116，
对比度尺停在 52 面／14,278 run），
`docOverflowX=0 clipped=0 stray=0 tiny=0 occluded=0`；四个宽度的方案详情都落到 `state=read`、
`detailsExpanded=6`。账本加 1 条 browser 回执（`DL-KB-08` 13→14 条，状态仍 DONE），
`currentExecution.evidence` 282→**283**。直方图不变：**`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`**。

**剩下还没被尺子碰过的面**（下一刀的清单，都是"点开才有"的那一类）：目标组合面板的展开态、
我的方案里两条方案的对照态、以及反馈块写入后的读回态。做法已经现成：种子 → 点开 → 等真实状态
→ 量成具名行 → **进同一个 single-sink 计数**，再补一条"报了必须等于算了"的断言。

### 5.45 目标组合：量"选中之后"那一态，这次没有新缺陷（`b4a807fb`）

**为什么这一态才是要量的。** `#/target-profiles` 一直在两把尺的清单里，但量到的永远是**没选目标**
的那一屏：`08_STITCH完整提示词.txt` 第 13 行给这一面的话是"先选软件／Agent，再看到该入口可用的
模型／模式……显示官方支持与本项目未测试的区别"，而两栏真相与四档 `support_state` 药丸**是选了之后
才画出来的**。没选的那一屏再干净，也不替选中那一态说话。

**用什么当"到位"的判据。** 不用"有字了"，用界面自己写的状态位：`#tp-combination` 带
`data-mode = unspecified | partial | plan-only | target`，只有真的解析到一份档案才成 `target`。
探测器按 `tp-software → tp-agent → tp-entry → tp-model → tp-task-mode` 依次选第一个可选项
（没有得选或已有值就跳过），然后等这个位。**等状态而不是等可见性**——一次诚实的空回答同样"有字"。

**读数。** 对比度 52→**54** 面、`checked` 14,278→**14,764** 条文本 run，`belowAA=0`；
几何 120→**124** 面，四个宽度的组合态都落 `state=read`，
`docOverflowX=0 clipped=0 stray=0 tiny=0 occluded=0`，`notInView=0`——
这条也顺手把 §5.44 那个观察的边界说清了：顶栏被推走是**长设计辅助屏**特有的，不是全站现象。
**这一刀没有量出新缺陷**，所以它只留一条 browser 回执与覆盖面数字，不写"修好了什么"。
`DL-KB-10` 回执 3→4 条（状态仍 DONE），`currentExecution.evidence` 283→**284**，
直方图 **`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`** 不变。

**这套做法现在有四处成型**（条目详情、方案详情、目标组合、以及原有的全局搜索与证据投影）：
种子／选择 → 等界面自己写的状态位 → 量成具名行 → 过同一个计数入口 → 测试要求"每宽度都在"且
"报了＝算了"。剩下还没被尺子开进去的面：**我的方案的两案对照态**与**反馈块写入后的读回态**。

### 5.46 两案对照真的被量到了：写第二份修订，才有那一态

**这一态此前不存在于任何尺子里。** `DL-KB-12` 的验收写的是"对照页比的是两份**真实修订**"，
而那块面板要满足两件事才会画出来：这份方案**得有第二个修订**，而且有人按下"对照"。
两把尺以前既不写第二版也不按按钮，所以十二行并排的内容从未被量过——
**此前它没被量过，也就谈不上通过**。

**怎么让它存在。** 种子在原来那条创建之后，**走界面用的同一条路由**
`POST …/assistance-plans/<id>/revisions`（带 `expected_revision: 1`，只改需求句）写第二版；
然后打开 `#as-compare`、把两个下拉选到 r1／r2、点"对照"。等待判据是面板自己的两句话：
`#as-compare-body` 里 ≥12 行，且 `#as-compare-status` 不再是"正在读回…"也不是失败——
**状态位取自那行文字，不是硬写 `read`**（写死的话，将来一次读回失败也会被判成"已读回"）。

**读数。** 对比度 54→**56** 面、文本 run 14,764→**15,270**，`belowAA=0`；
几何 124→**128** 面，四个宽度的对照态都落 `state=read`，
`clipped=0 stray=0 tiny=0 occluded=0 docOverflowX=0`——**1280 那一档也干净**，
这是这块并排面板最值得问的一句话（两栏长中文最容易在窄一侧挤断）。
`notInView=3` 又出现了，原因与 §5.44 同一条：设计辅助屏很长，滚到详情时顶栏被推上视口之外；
这条继续按"实测现象＋留给 owner 的吸顶问题"记账，不动布局。

**账。** `DL-KB-12` 加 1 条 browser 回执（2→3 条，仍 DONE），`evidence` 284→**285**。
直方图 **`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`** 不变。
"点开／选中才量"这套做法到这里覆盖了 条目详情、方案详情、两案对照、目标组合、全局搜索、证据投影
六处具名面板态；剩下的同类缺口只有一个：**反馈块写入后的读回态**（它也在方案详情里，
需要一个 POST 才有内容）。

### 5.47 反馈块写入之后才有那一态；顺手把一次"闸门自己崩了"记账

**最后一块"点开才量"的面。** 闭环的最后一环是「用户自愿记录外部使用反馈」，
而两把尺以前走到方案详情就停——反馈历史那行、`相同/未说明` 那几个格子、结果词的词表着色，
**都要先写一条才有内容**。这一轮把它们量进去了。

**写的是什么，怎么写得不越界。** 结果词从服务给的那一份里取第一个（页面不抄第二份词表），
两条必填填闸门文案，**记录人写「审计脚手架（合成，不是真人签署）」**——
这一格将来会出现在历史里，绝不能读起来像一次真人签署。等待判据仍是界面自己的话：
`#as-fb-history` 出现行、`#as-fb-status` 不再说"正在读回"也不是失败；
`state` 字段从这行文字**读出来**，不是硬写 `read`。

**一次崩溃被记成账，而不是被"跑绿"盖过去。** 这批改动落地前，有一次整模块跑在 `w=1536` 死了：
`locator.click: Timeout 30000ms exceeded`，等的是 `#as-list .as-plan-open`——
那一屏的方案清单当时没有可点开的行，而闸门**没有把这件事说出来，直接把进程弄崩了**。
现在这一步先数行、数不到就把 `#as-list-meta` 的原话引用进 `interactionMissing` 再往下走。
**之后两次完整跑都干净，所以这不叫"修好了"**：原因没有确定，改的是"下一次它会自报"。
这条按事实记在这里，不给它编一个原因。

**读数。** 对比度 56→**58** 面、文本 run 15,270→**15,772**、`belowAA=0`；
几何 128→**132** 面，四宽度反馈态全 `state=read`，`clipped/stray/tiny/occluded/docOverflowX=0`
（`notInView=3` 与前两节同因）。六类"点开才有"的面至此都有具名行：
条目详情、方案详情、两案对照、反馈读回、目标组合、全局搜索、证据投影。
`DL-KB-16` 加 1 条 browser 回执（3→4 条，状态仍 `PARTIAL`——差的仍是具名真人，不是界面），
`evidence` 285→**286**，直方图 **`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`** 不变。

### 5.48 把 STITCH 的六个值做成第三套色板：它第一次量就把自己量红了

**这是 owner 那句"一比一复刻 STITCH 界面设计"的第一件实物。** `08_STITCH完整提示词.txt` 的视觉段
逐字给了六个值：单一低饱和强调色 `#356B92`、正文 `#17212B`、次级 `#566472`、背景 `#F4F6F8`、
内容 `#FFFFFF`、边界 `#D8DFE5`。按既有裁定，**新任务包配色不覆盖既有配色**，所以它落成第三套
可选色板 `?palette=stitch`，默认那套一字节没动（`test_workbench_stitch_palette.py` 逐条钉住
`--color-bg #060A14`／`--color-primary #316CFF`／`--color-text #F5F7FC` 还在默认 `:root` 里）。
**只做浅色一侧**：包里没写暗色值，自造一份暗色就是把"复刻"变成"照着自己的口味猜"。

**第一次量，闸门就把这套颜色判红了。** 珍珠白画布上，`warn/success/error` 药丸的填充是淡底，
而我沿用深色主题的白墨——12px 粗体的状态词实测 **1.83:1 / 2.2:1**，
`UNRESOLVED / VERIFIED / E0 / BLOCKED / NOT_ACCEPTED …` 这些词一个不落，
`LOWCONTRAST` 共 **405** 行，闸门 exit 1。控制跑逐字留在
`kb-06-stitch-pill-ink-control.log`，同 bundle、同种子、只改那两行角色。
**修的是角色，不是阈值**：`--tag-ink` 取包自己声明的正文色，info 药丸保持中性淡底
（这套基线要的是"单一"强调色，把 info 填成深色再压白字，是同一个错换了一处犯）。
修完同一条尺 `CT_OK`：stitch/light 下 **58** 个面、**15772** 条文本 run，`belowAA=0 unparsable=0
controlMisses=0`；几何 **132** 个面，`clipped/stray/tiny/occluded/docOverflowX` 全 0。

**顺手挖出一个可达性缺陷，形状很眼熟。** `readThemeChoice()` 判断色板用的是硬写的
`urlParam('palette') === 'ui2026' ? 'ui2026' : 'design-lab'`——
于是第三套色板在菜单里、在 CSS 里、就是**进不去**：URL 与 `data-palette` 属性都被折回两套之一。
现在统一问 `PALETTES` 这张表，并留一条测试专门判这个写法回潮。
**"表里加了东西，读表的地方还在抄枚举"是同一类错的第 N 次出现**，这轮的账记在这条上。

**账与边界。** `DL-KB-06` 加 1 条 `visual_review` 回执（12→13 条，状态仍 DONE），
`evidence` 286→**287**，直方图 **`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`** 不变。
体积：bundle 609,452→**609,950** 字节、gzip 159,775→**160,052**（+277），
`DL-KB-13` 的 150 KB 上限裁定仍在 owner 手上，本轮不靠删内容凑数。
这是**量**，不是**批**：设计批准仍等 owner 真机测试，`DESIGN.md` 不进已批准状态，
也没有拿 VLM 或像素差当签字。

### 5.49 包里的数字规则进入尺子：119 处 11px、23 处半透明列表底、474 个超带半径。

**这一段做的是什么。** 20261023 包写视觉规则用的是数字：`09_DESIGN.md` 给正文 14–16px、元数据至少
12px、控件高度约 36–40px、圆角输入/按钮 6–10px、临时面板 12–16px；`08_STITCH完整提示词.txt` 给
玻璃只给顶栏／导航／临时面板、长文字与列表实底。上一轮把六枚颜色做成可选主题之后，"一比一复刻"
剩下的部分就是这几句话，而它们能不能成为断言，取决于能不能在**已渲染的文档**上量出来。静态 grep
答不了：`.eyebrow` 在前段写 10px、在后段抬回 12px，只有算完层叠才知道人读到的是几号字。所以这一刀
把尺子加进对比度闸门（`CT_SPEC` 段），跟 AA 用同一次渲染、同一批面。

**第一次量出来的债**（修复前那次扫描是 width 1440 **单宽度**；下面"改完之后"那一段是 1440+1920
**双宽度**，两处分母不同，不能互换）：小于 12px 的文本 run
**119** 处，最小 **11px**，来源是 `--uif-font-micro` 与五处硬写 11px（导航分组标签、页脚、连接状态行、
KPI 注脚、badge）；列表行与文字按钮压在半透明白上 **23** 处（`li.list-item` 的 74／100 与
`button.ghost-btn` 的 62／100）；表单控件圆角超过 10px **474** 个。玻璃这条一测就过：全 UI 只有
`aside#app-sidebar.sidebar blur(18px) + header.topbar blur(18px)` 两处 `backdrop-filter`，正好是包允许的对象，所以这条不改样式，改成把名单钉住。

**改的是哪些，以及为什么这样切。** 12px 地板全局抬（不动颜色，也不动 `--accent-hover`、
`--border-strong` 这类已实测的地板值）；实底与半径按 owner 裁定只做加法——写在
`[data-palette="stitch"][data-scheme="light"]` 的作用域里，默认炭黑一字节不动。半径取带内上限 10px，
适用对象是这句话的字面对象（input／select／textarea 与四类动作按钮，实测 **1002** 个，1440+1920
两个宽度合计，单宽度那次是 501 个）；另外
**1818** 个 painted 控件（同一双宽度扫描）是列表行、导航项与药丸，同一句把面板写成 12–16px，而包自己的 HTML 用
`border-radius:20px` 的 `.status`，所以它们保持各自半径、只在直方图里登记。控件高度写的是「约 36–40px」，
主动作实测 **41–47px**（比包里的目标更高），同样只登记不断言。这几处取舍写在测试的 docstring 里，
不靠尺子的沉默。

**改完之后的同一条尺**（stitch／light，widths 1440+1920）：

```
CT_SUMMARY checked=15772 belowAA=0 pseudoLayers=5250 coveredForeign=0 obscured=4 unparsable=0 collapsedOpened=6248 controlMisses=0 strict=1 mathChecks=4 mathBad=0 colourChecks=4 colourBad=0
CT_SPEC_ENFORCED below12=0 translucentTextHosts=0 unparsableAlpha=0 glassOffAllowlist=0 formRadiusOver10=0 formControls=1002 formBelow36px=14（控件高度写的是「约36–40px」，实测读数只登记不断言：本 UI 的主动作在 41–47px，比包里的目标更高，不在 6–10px 那条带子一样的强制范围里）
```

几何尺量同一份 CSS：

```
OV_SUMMARY clipped=0 stray=0 tiny=0 interactions=28 [1440:evidence+projection-read=read,1440:capabilities+global-search=read,1440:knowledge+entry-detail=read,1440:assistant+plan-detail=read,1440:assistant+plan-compare=read,1440:assistant+plan-feedback=read,1440:target-profiles+combination=read,1280:evidence+projection-read=read,1280:capabilities+global-search=read,1280:knowledge+entry-detail=read,1280:assistant+plan-detail=read,1280:assistant+plan-compare=read,1280:assistant+plan-feedback=read,1280:target-profiles+combination=read,1536:evidence+projection-read=read,1536:capabilities+global-search=read,1536:knowledge+entry-detail=read,1536:assistant+plan-detail=read,1536:assistant+plan-compare=read,1536:assistant+plan-feedback=read,1536:target-profiles+combination=read,1920:evidence+projection-read=read,1920:capabilities+global-search=read,1920:knowledge+entry-detail=read,1920:assistant+plan-detail=read,1920:assistant+plan-compare=read,1920:assistant+plan-feedback=read,1920:target-profiles+combination=read] brand=4 navEdge=4 spec=0 theme=stitch/light
```

字号直方图（各面合并）：12px x 6476 13px x 5274 13.3px x 464 14px x 122 15px x 192 16px x 2882 17px x 56 19px x 22 21px x 16 24px x 6 26px x 2 32px x 52 35px x 38。

**这条断言会咬。** 同一条 enforce 在默认配色下必须红：
`test_the_pack_number_assertion_refuses_a_theme_it_was_not_applied_to` 跑 design-lab／dark，断言出现
`SPEC-VIOLATION 长文字与列表实底`，并断言该配色 `below12=0`——后半句证明 12px 是全局抬的、不是只在
珍珠白里改，前半句证明这条尺不是摆设。

**账与边界。** `DL-KB-06` 加 1 条 `visual_review` 回执（13→14 条，状态仍 DONE），
`evidence` 287→**288**，直方图 **`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`** 不变；本轮没改 TS，
bundle 字节不动。下一刀的对象已经指名：包还要「单一低饱和强调色」与「避免大面积渐变」，而
`.primary-btn` 现在是两停 brand 渐变，`--brand-gradient-*` 在珍珠白下仍是那对更深的蓝，不是平涂的
#356B92；这条要连 AA 一起重测之后才好说，本轮不拿算出来的比值当通过。仍未裁的两件照旧记账不代做：
`DL-KB-13` 的 150 KB 上限，与长屏上顶栏是否吸顶。

### 5.50 包的「避免大面积渐变」变成一条面积读数：42 个面板级渐变面被压平。

**这一条为什么能量。** 上一段把包的数字规则接进对比度尺之后，还剩一句没有对象：
`08_STITCH完整提示词.txt` 的「避免大面积渐变」。「大面积」不写清就是空话，所以这条尺把对象定为
**同一屏上看得见的渐变面积**：一个 painted 元素的 `background-image` 含渐变，且它与视口的可见交集
超过 25% 就计入。用可见面积而不是布局面积，是因为长列表卡片的布局高度可以量到视口的 90 倍，
照布局算会把一条 24px 高、95% 已经滚出屏幕的高光判成违规——那是把尺子指向自己造出来的错误。
阈值取 25%：一个按钮、药丸或细进度条不可能到，一整块内容底或整屏装饰一定到。

**第一次量的债**（stitch／light，width 1440，单宽度）：渐变 painted run **656** 条，其中可见面积过阈值
**42** 处，来源是三类：`.panel` 的底（`linear-gradient(180deg, surface 82%, surface 94%)`，单卡实测可见
占比 28–75%）、`.panel::before` 的整卡高光、`.grid-bg` 的 `inset:0` 装饰网格（opacity .22 加径向 mask，
整屏 100%）。

**改法是包自己的参照物给的**，不是我挑的：包里那份 `DESIGN-LAB_今日完整需求与可行性方案_20261023.html`
的卡片写成 `section{background:#fff;border:1px solid var(--line)}`——平涂白卡压 `#f3f5f7` 画布，卡内没有
渐变也没有高光层。于是在 `[data-palette="stitch"][data-scheme="light"]` 作用域里把 `.panel` 改平涂、
`.panel::before` 的高光关掉、`.grid-bg` 不画；默认炭黑一字节不动（owner 裁定：新包的值做成可选主题，
不覆盖既有配色）。这一处顺带把上一段那条「长文字与列表实底」做得更彻底——面板底与卡内高光本来就是
正文底下的两层可变底。

**改完的读数**（同一条尺，stitch／light）：

```
CT_SUMMARY checked=15772 belowAA=0 pseudoLayers=0 coveredForeign=0 obscured=4 unparsable=0 collapsedOpened=6248 controlMisses=0 strict=1 mathChecks=4 mathBad=0 colourChecks=4 colourBad=0
CT_SPEC_ENFORCED below12=0 translucentTextHosts=0 unparsableAlpha=0 glassOffAllowlist=0 formRadiusOver10=0 bigOver25pct=0 formControls=1002 formBelow36px=14（控件高度写的是「约36–40px」，实测读数只登记不断言：本 UI 的主动作在 41–47px，比包里的目标更高，不在 6–10px 那条带子一样的强制范围里）
```

渐变 painted run 在同一条单宽度扫描上 656→**489**，可见面积过阈值 42→**0**；那份单宽度复测的原文留在
`design-lab/evidence/current-execution/task-artifacts/kb-20261025/kb-06-gradient-single-width-remeasure-20261025.log`，
这样 656→489 的比较是同一分母上的比较。上面那条 `CT_SUMMARY/CT_SPEC_ENFORCED` 来自回执所绑的
1440+1920 双宽度那次，分母不同（渐变 run 978、过阈值 0），两个数各记各的，不互换。AA 仍是 `belowAA=0`
（这不是"应该没影响"的推测，是这条尺重跑之后的读数）。几何尺量同一份 CSS：

```
OV_SUMMARY clipped=0 stray=0 tiny=0 interactions=28 [1440:evidence+projection-read=read,1440:capabilities+global-search=read,1440:knowledge+entry-detail=read,1440:assistant+plan-detail=read,1440:assistant+plan-compare=read,1440:assistant+plan-feedback=read,1440:target-profiles+combination=read,1280:evidence+projection-read=read,1280:capabilities+global-search=read,1280:knowledge+entry-detail=read,1280:assistant+plan-detail=read,1280:assistant+plan-compare=read,1280:assistant+plan-feedback=read,1280:target-profiles+combination=read,1536:evidence+projection-read=read,1536:capabilities+global-search=read,1536:knowledge+entry-detail=read,1536:assistant+plan-detail=read,1536:assistant+plan-compare=read,1536:assistant+plan-feedback=read,1536:target-profiles+combination=read,1920:evidence+projection-read=read,1920:capabilities+global-search=read,1920:knowledge+entry-detail=read,1920:assistant+plan-detail=read,1920:assistant+plan-compare=read,1920:assistant+plan-feedback=read,1920:target-profiles+combination=read] brand=4 navEdge=4 spec=0 theme=stitch/light
```

**这条也会咬。** 默认炭黑配色在同一条 enforce 下现在报两条红：`长文字与列表实底` 与 `避免大面积渐变`。
`test_the_pack_number_assertion_refuses_a_theme_it_was_not_applied_to` 断言这两句同时出现在红里，
所以"珍珠白下为 0"不是靠把默认配色一起改掉换来的。

**账与边界。** `DL-KB-06` 加第 15 条 `visual_review` 回执（带 `-r2` 的新文件，上一份一字不动），
`evidence` 288→**289**。包里剩下的句子按能量化的顺序排队：「单一低饱和强调色」与「避免霓虹」——
主按钮现在仍是两停 brand 渐变，珍珠白下不是平涂的 `#356B92`，这条必须连 AA 一起重测才好说；
「字段密度」与「标题层级」要先定分母（按哪一列算密度）才好写成数。owner 未裁的两件继续记账不代做：
`DL-KB-13` 的 150 KB 上限，与长屏上顶栏是否吸顶。

### 5.51 包里那句「单一低饱和强调色」被拆成一支可数的第二色，然后归零。

**这条量的是什么。** `08_STITCH完整提示词.txt` 写的是一句正面断言——「单一低饱和强调色 #356B92」，
它的反面是可数的：界面里还有没有第二支蓝。答案是有，而且是成对的两停：`--brand-gradient-from #1D4FC4`
与 `--brand-gradient-to #2A63D8`（style.css:23-25，2026-10-06 为了让白字过 AA 从 `#316CFF` 加深来的，
那次实测记录就在同一行上方）。尺子读的是**已渲染的色**，不是样式表里的 token：把 painted 元素的
`background-color`／`background-image`／`border-top-color` 里出现 `rgb(29,79,196)` 或 `rgb(42,99,216)`
的算一处，所以 token 从哪条规则流过来都一样会被数到。

**第一次量（stitch／light，width 1440）**：珍珠白下 **21 处** painted 面仍是那对深蓝——
`button.primary-btn`（能力详情里的「使用此能力」）、`#research-submit`、`#preflight-run`、`#jury-submit`
这些主动作。压平到包里那一支之后为 **0**。

**这一刀自己带回来一个已经量掉的缺陷，尺子当场拦下。** 压平的第一版没排除禁用态：我的规则特异性
压过了 `button:disabled`（style.css:303，2026-10-09 那次实测把禁用的「使用此能力」从 2.31:1 改成
平涂次级底＋虚线边＋可读次级墨），于是 13px 的次级墨被压在强调色底上报出 **1.06:1**，产品级红 **29** 条。
加上 `:not(:disabled)` 之后这三处只在可点状态下翻成强调色，禁用态继续用它自己的非文字线索。
**「高特异性规则顺手覆盖掉一个为无障碍而写的状态」是这一轮的根因**，不是我改错了色值。

**顺手修了尺子自己的账。** `belowAA` 以前按 `failCount - control.reported` 扣植入控制，
而 `control.reported` 是「每个 id 至少被报过一次」的布尔计数（它证明解析器还认得那串颜色序列化，
这个作用不变）；一个长页面会植入多枚同名折叠控制，多出来的行就被算成了产品债。现在按
**实际控制行数**扣，产品债与测试台自己的道具第一次分开，`controlMisses=0` 仍然要求每枚控制都被报出。

**改完的读数**（同一条尺，stitch／light，widths 1440+1920）：

```
CT_SUMMARY checked=15772 belowAA=0 pseudoLayers=0 coveredForeign=0 obscured=4 unparsable=0 collapsedOpened=6248 controlMisses=0 strict=1 mathChecks=4 mathBad=0 colourChecks=4 colourBad=0
CT_SPEC_ENFORCED below12=0 translucentTextHosts=0 unparsableAlpha=0 glassOffAllowlist=0 formRadiusOver10=0 bigOver25pct=0 brandBluePaints=0 formControls=1002 formBelow36px=14（控件高度写的是「约36–40px」，实测读数只登记不断言：本 UI 的主动作在 41–47px，比包里的目标更高，不在 6–10px 那条带子一样的强制范围里）
```

几何尺量同一份 CSS：

```
OV_SUMMARY clipped=0 stray=0 tiny=0 interactions=28 [1440:evidence+projection-read=read,1440:capabilities+global-search=read,1440:knowledge+entry-detail=read,1440:assistant+plan-detail=read,1440:assistant+plan-compare=read,1440:assistant+plan-feedback=read,1440:target-profiles+combination=read,1280:evidence+projection-read=read,1280:capabilities+global-search=read,1280:knowledge+entry-detail=read,1280:assistant+plan-detail=read,1280:assistant+plan-compare=read,1280:assistant+plan-feedback=read,1280:target-profiles+combination=read,1536:evidence+projection-read=read,1536:capabilities+global-search=read,1536:knowledge+entry-detail=read,1536:assistant+plan-detail=read,1536:assistant+plan-compare=read,1536:assistant+plan-feedback=read,1536:target-profiles+combination=read,1920:evidence+projection-read=read,1920:capabilities+global-search=read,1920:knowledge+entry-detail=read,1920:assistant+plan-detail=read,1920:assistant+plan-compare=read,1920:assistant+plan-feedback=read,1920:target-profiles+combination=read] brand=4 navEdge=4 spec=0 theme=stitch/light
```

**这条同样会咬。** 默认炭黑在同一条 enforce 下现在报 **三条**红：`长文字与列表实底`、
`避免大面积渐变`、`单一低饱和强调色`（21 处深蓝正是它的读数），
`test_the_pack_number_assertion_refuses_a_theme_it_was_not_applied_to` 断言这三句同时出现——
珍珠白的 0 不是把默认配色一起改掉换来的。

**账与边界。** `DL-KB-06` 加第 16 条 `visual_review` 回执，`evidence` 289→**290**，直方图
**`DONE 13`／`PARTIAL 2`／`NOT_STARTED 1`** 不变；TS 未改，bundle 字节不动。
包里的句子还剩两句没落成数：「字段密度」与「标题层级」要先定分母；`苹果式克制玻璃感` 已经用玻璃名单钉住，
`.app-nav button:hover` 这类 **hover 态**读同一对 brand token，但对比度尺目前只量静息态 painted 面，
所以那处不改也不宣称已合规——要改得先决定 hover 的墨色跟不跟着翻，这是一条需要 owner 拍的设计裁定，
不是我能替包猜的。owner 未裁的两件照旧记账：`DL-KB-13` 的 150 KB 上限，与长屏顶栏是否吸顶。

### 5.52 单一强调色这一条被撤回为「已测量、未满足」，证据是 CI 自己的读数。

**发生了什么。** 上一段的收口在本地（Windows + Chromium）是全绿的：珍珠白下压平三处 brand 渐变之后
`brandBluePaints=0`、`belowAA=0`。同一提交推到 CI，`Workbench browser E2E (exact-SHA controlled-runtime,
no-skip)` 在 Linux runner 上报 **2 条真红**，逐字是：

```
LOWCONTRAST 1920:target-profiles+combination 2.86:1 need>=4.5:1 16px opacity=1
  fg=rgb(222, 224, 227) :: button#tp-validate.primary-btn :: 按新目标重新校验
```

**为什么不是把色值再猜一次。** 那枚按钮的墨色是 `rgb(222,224,227)`（浅灰白，不是 `#fff`）。按 2.86:1
反推，它那一刻落到眼睛上的底比 `#356B92` 更亮（L≈0.23），而白字压那种底也只有约 3.79:1——也就是说
"改成平涂单一强调色"并没有把这一处带到 AA 之上，而我手上只有一次远程读数、没有 Linux 复现环境。
**在这种情况下继续调一个本地验证不了的色值，就是把绿灯建立在猜上**，所以处理是：三处渐变恢复原状，
`brandBluePaints` 从 enforce 断言里移出、继续作为登记的债打印，测试里换成"这条仍在测量、且非零"的断言，
并把平台差异写进注释（`:not(:disabled)` 那条修复保留——它抓回的是另一个已被量掉的缺陷，两平台一致）。

**现在包里这句话的真实状态**：`单一低饱和强调色 #356B92` 在珍珠白下**未满足**，实测 21 处 brand 深蓝仍在
（本地与 CI 同一次扫描的 `brandBluePaints` 读数一致）；要满足它需要一次配色裁定，两个方向都有代价——
同一 hue 的深阶当填充（保持单一色相，但要重测白字），或者按钮文字改深色并放弃"强调色当填充"。
这与 `品牌蓝压不住白字` 那条既有项目问题是同一类：不是新缺陷，是同一个约束在第三套配色上重新出现。

**流程上的账（本轮真正的收获）。** 三条 CI 红里，两条来自我本地只跑了 76 项聚合门禁、没跑单元套件与
权威链：`AUTHORITY_CHAIN=DRIFT`（账本加行后没重生成链）与 `--uif-font-micro` 抬到 12px 撞上 20261009 包
登记的 11——后者用这条尺自带的 `DOCUMENTED_DEVIATIONS` 正式登记，不删检查、不偷偷对齐。**闸门包不等于
测试套件**，这两条已经写进本轮收尾清单。

**账与边界。** 本轮只改样式与尺子的断言，`evidence` 仍 **290**、直方图 **`DONE 13`／`PARTIAL 2`／
`NOT_STARTED 1`** 不变；上一段那份 `kb-06-browser-single-accent-20261025` 回执**一字不动**（它记的是
它那次测量的事实，撤回发生在它之后，不能被改写），本段就是它的取代说明。`.app-nav button:hover` 仍读同一对
brand token 且不在尺子的静息态测量范围内，继续记为未测。owner 未裁的两件照旧：`DL-KB-13` 的 150 KB 上限，
与长屏顶栏是否吸顶。

### 5.53 「标题层级」与「标签位置」第一次有数：494 个带标签控件里 416 个标签在上方，层级不是单调阶梯。

**这一刀只做两件事：把尺子架对，把读数留下来。** 包里两句还没有对象——`09_DESIGN.md` 的
「标签放输入上方；错误紧邻字段」与「（标题）层级」。两者都是位置/阶梯类要求，可以在已渲染文档上量：
标签用 `caption 文本节点的 Range 联合框` 与控件盒子比较（在上方且水平重叠），标题读每个 painted
`h1..h6` 的 px/weight/line-height。

**尺子先错过一次，而且是会让人误信的那种。** 界面普遍写成 `<label>{显示标题 + 控件}</label>`——
label 是 wrapper。直接量 label 的盒子时，它的底边在控件之下，于是 247 个正确标注的字段里只有 7 个被判为
「标签在上方」，看起来像巨大的不合规；改成只量标签自己的文本节点之后是 208（单宽度那次 208/247）。
**"闸门报出一条大债"和"闸门的对象选错了"用同一个数字长得一模一样**，这条已写进注释。

**读数（stitch/light，widths 1440+1920 同一次扫描）**：带标签控件 **494**，标签在上方
**416**，其余 **78** 处逐条可点名，全部落在复选框／单选行与一个紧凑选择器上：
  `LABEL-SIDEBY 1440:tools label.project-picker vs select#创作工具-project.project-select dy=-8px`
  `LABEL-SIDEBY 1440:preflight label vs input#jury-approve dy=-17px`
  `LABEL-SIDEBY 1440:preflight label vs input#jury-reject dy=-17px`
  `LABEL-SIDEBY 1440:preflight label vs input#rights-decision-APPROVED dy=-17px`
包那句话针对的是「输入」，而勾选框把标签放在框旁是常规写法，所以本轮**只登记不断言**，
要不要把勾选类也纳入是同一次裁定里的一条。

**「错误紧邻字段」这条没测到，不能记成通过**：`errorNodes=0`——静息态与这轮打开的所有面板里
没有一条已渲染的错误／提示实例，因为错误只在真实失败时出现。要量它必须先让闸门制造一次真失败态
（保存失败、目标不兼容、模型不可用三种里有两种是可造的），这是下一刀的前置，不是本轮的绿灯。

**标题层级是量出来的未满足**：同一次扫描读到 10 个不同的
`(级别, 字号, 字重)` 组合 —— `h1 26px/700/lh0 | h2 21px/700/lh0 | h1 17px/700/lh19.6 | h2 32px/700/lh0 | h3 15px/700/lh0 | h3 13px/700/lh0 | h2 24px/700/lh0 | h3 16px/700/lh0 | h4 16px/700/lh0 | h4 14px/700/lh0`。其中 `h1` 同时是 26px 与 17px，`h3` 有 13/15/16px 而 `h4` 是
14/16px：**第三级比第四级更小**，层级不是单调阶梯。包里没写具体 px，参照文档给的是 42/27/19，
所以收敛成一套阶梯需要一次设计裁定（照参照文档、还是把现有三套界面族各自归一），本轮不替包猜；
另外打印里 `lh0` 表示计算值是 `normal`（我的格式化把 normal 转成 0，读数没错但表达有歧义，下一轮改）。

**本轮加的两条断言是覆盖断言，不是合格断言**：`labelled>=200`、`headingLadder>=5`。
它们防的是"选择器坏掉 → 0 违规 → 被读成通过"这一类假绿，而不是宣称界面已合规。
账：`evidence` 仍 290，直方图不变，本轮只改尺子与测试，未动样式；卷宗与本节的数字全部取自
`workbench-contrast-gate-stitch-light.log` 的同一次扫描。
