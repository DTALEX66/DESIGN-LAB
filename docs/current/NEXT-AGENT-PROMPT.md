# 下一会话提示词（唯一入口）

> **本文件就地更新，不要再按日期新铸一份。**
> 2026-10-18 之前它按日期命名（`NEXT-AGENT-PROMPT-<日期>.md`），于是每轮都要铸新文件、搬一次指针，
> 旧副本合法地留在 `docs/current/` 里，`AGENTS.md` 再逐个罗列——那就是"旧路径反复出现"的机制。
> 现在只有一个文件名；改状态就改这一个文件，并同步下面两行。
> 历史条目在 `docs/history/next-agent-prompts/`，逐份登记于 `docs/history/next-agent-prompts/PROMPT-LINEAGE.json`。
> `verify_task_document_states.py` 的 `entry-not-dated-again` 会在有人重新铸日期副本时直接失败。

- **updatedAt**: 2026-10-18
- **writtenAtSha**: 自己读 `git rev-parse HEAD`（不要抄任何文档里的数字；本文件也不例外）

## 0. 这份文件是什么

不是 Authority，不是第二状态源。它只回答两件事：**现在真实状态是什么（怎么自己读）**，以及**下一刀该切哪里**。
任何与本文件冲突的事实，以 `/AUTHORITY.md`、`.project/governance/authority-index.json`、
唯一任务包和账本 `currentExecution` 为准。

## 1. 读的顺序（不可变）

1. `git rev-parse HEAD`、`git status --porcelain`、`gh pr list`、`gh run list --branch main --limit 1`
2. `/AUTHORITY.md`
3. `.project/governance/authority-index.json`
4. 根 `AGENTS.md`
5. 唯一当前包 `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md`
6. `design-lab/config/task-ledger-r3.json` 的 `currentExecution`
7. 本文件

历史只经 `authority-index` / crosswalk 进入；记忆、聊天摘要、旧交接**都不覆盖 Authority**。

## 2. 先核对，再动手

```bash
git rev-parse HEAD && git status --porcelain && git log --oneline -5
gh pr list
gh run list --branch main --limit 1
python design-lab/scripts/verify_task_document_states.py     # 13 项，含两道新检查
python scripts/verify_top_level_authority.py                 # 10 项，含 5 个 SHA 钉
```

**别抄本文件的数字当事实。** 上一轮的红灯里有一次就是"文档说已同步、实际没有"。

## 3. 2026-10-18 这一轮改了机制（不是改了措辞）

### 3.1 接续入口去日期化
`docs/current/` 曾有 5 个只差日期的提示词。现在只有一个 `docs/current/NEXT-AGENT-PROMPT.md`；
4 份旧件 + 本轮被替换的 10-13 正文都进了 `docs/history/next-agent-prompts/`，逐份记录字节与 sha256。
`AGENTS.md`、README、2026-10-13 交接、任务包第 7 条全部改指唯一入口。
**任务包本身是 SHA 钉住的**——若你必须改它，按 `AUTHORITY-PIN-CHANGE.json` 的既有流程移钉
（改 `scripts/verify_top_level_authority.py` 的哈希 + 追加一条 revision），不要只改文件。

### 3.2 两道新闸（都已用反例证明会红）
- `entry-not-dated-again`：不许存在 `<规范名>-YYYY-MM-DD.md`。按**名形状**判，不靠黑名单。
- `guidance-paths-resolve`：`AGENTS.md` / `README.md` / `AUTHORITY.md` / 本文件里出现的每个 `docs/...`
  路径必须是受跟踪文件。**分界**：交接/审计**可以**引用死路径（那是记录），指引**不可以**（那是指令）。

### 3.3 清掉的三类旧数据
- `.project-local/worktrees/` 的 6 个孤儿工作树（97 MB，`git worktree list` 一个都不认）——它们是
  "grep 到旧 `AGENTS.md`、旧 `reports/current/`"的第二个来源。删前逐个确认干净且在 HEAD。
- `design-lab/config/capability-index-v1-backup.json`（445 KB，备份躺在权威配置目录）+ 空 `services/`。
- 体积投影按 HEAD 口径重生成（`LARGEST-FILES.json` 等），并结清 `REPOSITORY-SIZE.json#subject_sha`
  的历史债务。

### 3.4 明确**不**删的
`design-lab/core/`：云审计说"zero consumers"、closeout 叫它 legacy，但
`docs/architecture/DIRECTORY-AUTHORITY.md` **明文冻结**（"must not gain new consumers"）。
成文的架构决定优先于清理冲动——要动它，先改那份文档并给出 ADR，不要在清理批里顺手删。

### 3.5 D07 拆分的边界是**量出来的**，不是猜的
`shell.ts` 7756 行里，能被搬走的和不能被搬走的，差别不在"重不重要"，而在**有没有闸按源码
文本/位置读它**。已逐条核过 20 个来源（结论落在 D07 batch 1 的提交里），要点：

- `apiOrEmpty` 的**函数声明**必须在 `shell.ts`：`tests/shape-notice-coverage.mjs` 用 TS AST
  要求 `function apiOrEmpty` 恰好 1 个，并把它当"闸的对象"，搬走即 `exit 1`。
- `FAILED_STATES` / `HUMAN_STATES` / `IN_FLIGHT_STATES` 不可搬：`verify_state_vocabularies.py`
  用 `const X = new Set\(\[(.*?)\]\)` 只在本文件正则匹配，找不到就报"词汇表无法校验"。
- `el('ul', { class: 'list'` 在 `shell.ts` 里**精确 52 次**（`test_workbench_css_single_definition.py`）。
  任何一个载体搬走，计数就变成 51——它不是"下限"，是对账。
- `scripts/design_debt_baseline.py` 只测固定 7 个文件，`shell.ts` 贡献 29 个字面 px 与 1 个
  字面色值；`DESIGN.md §4` 的"26/534/25"是它的投影。搬走 px/色值载体 → 实测下降 → 文档那
  句话不再成立。**新文件不在 SCOPE 里**，所以新文件里的 px/色值不会被测——这是拆分引入的
  静默盲区，要么把新文件登记进 SCOPE，要么别往里放字面量。
- `verify_capability_self_description.py` 的 `CAPABILITY_REGISTRY` 块**不是 43 行，是 3700 行**：
  它用 `^\];` 收尾，而注册表自己以 `] as const;` 结束，真正的 `^];` 命中在 `PROJECT_STAGES`
  的闭合行。在那个区间里插入任何 `^];` 或 `capabilityId:` 字面量都会改块边界/行数（闸钉 `rows == 5`）。

**推论**：拆分顺序只能是"先搬没人按文本读的纯函数"，DOM 组件要一批一批搬，且每搬一个
含 px/色值或 `ul.list` 的组件，都得同时改闸的清单与 `DESIGN.md` 的数字——那是**改合同**，
不是拆分。不要用一个批次的借口顺手改合同。

### 3.6 2026-10-18 全量审计（前端 + 后端 + 治理）：**判定未漂移，P0=0 / P1=3 / P2=13**

完整报告：`docs/audits/DESIGN-LAB-FULL-DRIFT-AUDIT-2026-10-18.md`（审计基线 SHA `0d9041a3`，
该 SHA 的 CI run `39128580612` 12 作业全 success）。规模：已提交 666 py（运行时 `src/design_lab` 102 ·
`design-lab/scripts` 116 · `design-lab/tests` 258 · `scripts` 68），`verify_*.py` 共 103 个。

**后端八项实测**（都有可复算命令，别抄这段当事实，重跑一遍）：

| 检查 | 结论 |
|---|---|
| 第二 runtime | **无**。运行时只有 `src/design_lab` 102 文件；`design-lab/` 的 382 py = scripts 116 + tests 258 + core 7 + production 1 |
| fail-closed | **健康**。`except` 565 行但 `except Exception: pass` 仅 1 处；`domain_packs.py:186`「a checker crash is a finding, not a verdict」、`native_tasks.py` 转 `NativeTaskError` 抛出 |
| 合同真值 | **P2**：`EVIDENCE_LEVELS`（E0–E5）在 `qa_plane.py:126`、`creative/media/__init__.py:53`、`verify_product_manifest_v3.py:26`、`verify_runtime_contracts_v3.py:21`、`verify_evidence_levels.py` **5 处各写一份**，当前值一致但**无交叉一致性闸** |
| 证据等级 | **通过**：`test_claim_honesty_gates` 6/6 OK |
| 安全 | **健康**：仅 `127.0.0.1`；`hmac.compare_digest` + Bearer + token 强制 `[0-9a-f]{64}`；生产代码 `shell=True`/`eval`/`exec` **0 处**；318 处 `execute(` 全参数化；`__pycache__` 提交数 0 |
| 依赖 | 仅标准库 + `jsonschema` + `sqlite3` |
| 死路由 | **P1-3**：后端 30+ 路由硬编码在 `http_service.py` 内 `make_server()` 的闭包 `dispatch`（167 行→末尾，**单方法约 478 行**），无集中注册表 → 前后端只能人工 grep 核对。人工核对结果**没有静默死路由**（缺口被前端主动标注「缺」） |
| 闸看守 | **通过**：`test_gate_reachability` 9/9 OK |

**前端**：P1=2 —— ①UI 量化门禁**跑得到但不生效**：`test_workbench_ui_audit_gate.py` 确实接线并 shell 出去跑
`scripts/audit_workbench_ui.py`（再包 `design-lab/tests/e2e/audit_workbench_ui.mjs`），**不是**孤立闸；
但它缺浏览器就 `skipTest`，而 CI 的 Chromium 只在 `workbench-browser-e2e` 作业装、跑全量套件的
`python-gate` 没有，且防跳过的 `verify_browser_e2e_ran.py` 的 `TEST_MODULES` **显式元组不含它**
（该文件 docstring 自己承认"未列出的浏览器套件会永远跳过且无人发现"）。净效果：它报的
`violations=12`（`button#navToggle` 62x23）不会让任何提交变红。详见 §9。
②skip-link `href="#content"` 两种状态下都到不了可见内容。P2=12。

**本轮审计自己犯的两次误判**（已写进报告诚实性声明，别重犯）：
1. 用"workflow + 4 个聚合器"文本包含扫描推出 **8 个"孤立闸"** → 被 `test_gate_reachability` 9/9 证伪
   （漏了 `verify_projection_freshness.py` 等中间聚合器）。**先跑闸，别先猜。**
2. 按 import 关系把 `design-lab/core/` 判为死代码并建议删除 → 被 `DIRECTORY-AUTHORITY.md:65` 证伪：
   它是**明文冻结的契约参考件**（"must not gain new consumers"），正确处置是"保持冻结 + 加勿引用头注消歧"。
   注意本文件 §3.4 早就写了这件事，没先读才重复踩。

## 4. 四条硬规则（违反会被闸拦，或会被 CI 打回来）

1. **不要铸日期副本。** 入口就地改。
2. **不要在测试文件的注释里写脚本文件名。** `test_gate_reachability` 把"测试模块里出现的脚本名"
   当作**调用点**，一句注释就能把一个"豁免的手动闸"变成"可达"，从而触发 `no_exemption_has_gone_stale`。
   要提就用角色称呼（"体积审计生成器"），并写清为什么不写文件名。
3. **删掉登记行时，钉住它的 pin 要在同一提交里跟着走**，并内联写明理由。否则 CI 会用
   `REPORT-DEBT-CLOSED-NOT-REMOVED` 或精确集合断言回你——这两种红灯都是对的。
4. **先读权威口径，再取证；不要用"有没有人引用/有没有出现在文本里"代替"权威文档怎么规定"。**
   2026-10-18 审计里这条连犯两次（8 个"孤立闸"、`design-lab/core/` 判死代码），两次都被权威源证伪。
   正确顺序：`AUTHORITY.md` → `authority-index.json` → `AGENTS.md` → 任务包 → `currentExecution` → 本文件，
   **然后**才是 grep/grep -c。反例：判断一个模块该不该删，先查 `DIRECTORY-AUTHORITY.md` / closeout / ADR，
   不要只看 import 计数。

## 5. 已经做完的（D01–D06 全在 `main` 上、CI 逐作业读过；D07 只做了第一批）

| 项 | 结果 |
|---|---|
| D01 触发去重 | 分支 push 只跑轻闸（compile + identity boundary），`main` 跑全套；顶层加了按 PR/ref 的 `concurrency` |
| D02 逐测试计时 | 逐测试 id/模块/状态/秒数 + 合并逐模块表，写进本次运行目录并打印 |
| D03 前置结构合同 | 3 模块 31 测试，作为 `python-gate` 第一步；空选择 rc=2 |
| D04 分片 | `--shard i/n` 独立进程 + 独立运行根；编排器校验**并集多重集合**等于 discovery |
| D05 重复调用 | 11 个重复步骤里删 7 个（9 次调用），保留跨作业/条件/轻闸那 4 个；阻断已用注入失败证明 |
| D06 请求截止 | 读 15s / 写 45s；写超时报"结果待核对，不是失败"并禁止盲目重发；切页只取消读 |
| D07 拆分（第一批） | `shell.ts` 7756 → 7531 行：`ui-primitives.ts`（`el`/`en` + 形状/未连接/空集措辞）与 `route-address.ts`（纯地址与哈希映射）独立成模块，`shell.ts` 原样再导出，导出面零变化；`build/main.js` 字节数不变（369.51 kB），差异只有模块体顺序 |
| 全量漂移审计 | 2026-10-18 对前端 + 后端 + 治理层做全量审计：**判定未漂移**，P0=0 / P1=3 / P2=13。报告 `docs/audits/DESIGN-LAB-FULL-DRIFT-AUDIT-2026-10-18.md`（基线 `0d9041a3`，CI run `39128580612` 12 作业全 success） |

顺带修掉的真问题：套件曾把 **20 个测试登记两遍**（`from ... import Class` 让 P0 用例二次进册，
3011→2991）；工作流曾因**重复映射键**被 GitHub 整份拒收（零作业 + failure，看着像基础设施抖动）。

## 6. 下一刀：四个候选（按价值，不按顺序）

### 0. 后端路由注册表 + 前后端双向闸（2026-10-18 审计**新发现**，建议优先）

审计 P1-3。`http_service.py` 的 30+ 条 API 路由全部硬编码在 `make_server()` 闭包 `dispatch` 的
`if self.path == ...` / `re.fullmatch(...)` 链条里（**单方法约 478 行**），`workbench.ROUTES` 只有 3 条静态资源。

**为什么它优先**：它是另外两条 P1 的**根因共因**——`audit_workbench_ui.mjs` 接不进 CI（P1-1）、
前后端路由只能人工 grep（P1-3），本质都是"**没有一份可枚举的清单**"。清单一旦存在，
"有没有接线""对不对得上"就从人工判断变成机械可证伪。

做法：把路由抽成模块级 `ROUTES`（或 `(method, regex, handler)` 表），加一道闸断言
"前端 `apps/workbench/*.ts` 里出现的 `/api/...` 字面量集合 == 后端注册表集合"（双向，
缺一边就红，参照 `test_gate_reachability` 的双向豁免写法）。

**坑**：抽表时不要把 `dispatch` 里的鉴权顺序改掉——`guard()` 在 `body()` 之前，写路由必须先过
`hmac.compare_digest` 再读 body；`/api/local-session` 是唯一**免鉴权**路由（:169，自己读源码确认）。
另外 `#/api/projects/<32hex>/...` 这类正则里的 id 形态就是合同，改宽改严都会动到 `verify_route_payload_contracts.py`。

### A. D07 `shell.ts` 拆分（第一批已交付，共 7531 行）——第二批切 "状态组件" 与 "纯数据编排"
第一批只搬了两块**没人按文本读**的东西（`ui-primitives.ts` / `route-address.ts`，见 §3.5/§5）。
第二批的候选，按"搬走不会碰任何清单"排序：

1. `StateSpec` / `STATE_SPECS` / `stateBlock` / `stateMachineStepper`（约 70 行，`el`/`en` 现在
   已经能从新模块导入，无环）。`renderUiStates` 必须留在 `shell.ts`——它调 `viewLabel()`，
   而 `viewLabel` 读的 `ROUTE_VIEWS` 被 `appshell.mjs` 与桌面审计脚本按**位置**切出来。
2. `composeTargetPlan` / `readPlanReceipt` / `sha256Hex` / `contentKey` / `navGroupChunks`
   （纯数据编排，但要注意 `appshell.mjs` 从 vm 上下文直接读 `searchGroupRows`，同类
   "bundle 顶层可见" 的符号不要搬）。
3. 页面级 render 留到最后：它们同时被 `ul.list` 精确计数（52）和 `DESIGN.md` 的 px/色值
   三元组（26/534/25）钉住，搬一个就要同步改两处合同 + 该文件的登记惯例。

**坑（第一批实测）**：`git diff` 会告诉你 `build/main.js` 只差模块体顺序、字节数一模一样——
这不是"没生效"，而是 Rollup 把新模块体整体前置了。判据看 `transforming... 6 modules`
（4 → 6）与 `test_workbench_served_bundle`，不要看字节数。

### B. D08 列表渲染与 `design_layer` 查询的性能基准
先建合成基准（100 / 1000 / 10000 项），量 DOM 节点数、响应字节、首屏与切页时间，**再**决定分页。
行数只证明维护耦合，不证明首屏慢——不要用行数承诺性能。

### C. U09（知识回执/离线/反馈）——产品切片
`U01`–`U07` 都是 PARTIAL；`U08`–`U12` 未开始。做产品切片时，`U07` 的教训是：
**先交付可审阅的读回面板，把"没建的那一半"写在可见文字里**，不要把 PLANNED 的锚点标成 IMPLEMENTED。

## 7. 只能由 owner 决定的（不要猜，也不要替他填）

- **E3 真实宿主**、**E4 独立人审**、**E5 发布/安装态分发**：均未执行，且需要明确授权。
- **手机端**：`FROZEN_DEFERRED`，本轮不实现不验收。
- **#13 / owner 项 F**：`plan_to_rir` 无生产调用方，且仓库**没有真实 OCR 实现**——缺的是产品判断
  （工作台要不要跑本机 OCR），不是接线。
- **D09 GitHub 必需检查**：需要另外授权。做法是先加一个稳定、绑定实际 SHA 的汇总检查，
  验证"required + 条件 skip"确实会失败，**再**设为必需；故意失败的子检查必须能阻断。
- 审计文档里的 owner 清单 A–F、H–J。

## 8. 每批的强制序列

```
改动 → 复跑相关闸与测试 → deepseek_authority_chain.py（动过账本/被钉文件/索引时）
      → verify_authority_gates.py --zero-spill → 回执（先账本、后链，同批提交）
      → 提交 → 推工作分支 + 快进 main → 读该 SHA 的 CI 逐作业照抄 → 才允许说"完成"
```

**本地结论永远不是 CI 结论。** 读 CI 时按作业读，不要只看总结论。

## 9. 工具事实（省得再踩）

- `gh run view <id> --log` 有时返回空；可用
  `gh api repos/<owner>/<repo>/actions/jobs/<job_id>/logs --allow-escape-sequences`，
  但日志会被截断，**不要指望它给出失败测试名**——该用本地复现。
- **本机沙箱跑不了全量 Python 套件**：safe-delete shim 会在中途 `SystemExit`，另有
  `rollback_lock_or_permission_failure…` 这类在 Windows 造不出锁的用例。本机聚合闸的基线是
  `total=75 failed=1..2`，**不是** 0；差别只在 CI 上消除。
- 本机**没有 pytest**。用仓库根 `.venv/Scripts/python.exe`，单模块跑法：
  `PYTHONPATH="design-lab;src" .venv/Scripts/python.exe -m unittest tests.test_rights_ui_contract`。
  结构合同那条另有入口：`python scripts/run_structure_contracts.py`（31 个测试，含 52/50 清单）。
- **本机有一个只在 checkout 里成立的假红**：`design-lab/config/contract-bindings.json` 在工作树是
  CRLF、HEAD blob 是 LF，于是 `test_working_tree_line_endings` 报它 776 处 CRLF。`git status`
  干净、`git hash-object` 等于 HEAD blob 就说明是检出形态，不是内容——不要去"修"它。
- 分片并集是 `PYTHON_TESTS_UNION=OK expected=… distinct=… ran=… duplicates=0 missing=0`；
  它抓过真 bug，改动测试装载方式后务必看这一行。
- **两道"诚实性"闸可以单跑，很快**，改动声明/证据/闸接线后先跑这两个：
  `PYTHONPATH="design-lab;src" .venv/Scripts/python.exe -m unittest design-lab.tests.test_gate_reachability`（9 测试，约 4s）
  与 `... design-lab.tests.test_claim_honesty_gates`（6 测试，约 13s）。
  前者**双向**断言"不可达 verifier 集合 == `MANUAL_GATES` 豁免清单"，后者断言证据等级回执。
- **新增/删除 `apps/workbench/` 下文件会让 `verify_inert_contract_survey` 红**（`productFiles` 计数，
  D07 第一批 209→211 就是这么红的）。修法在该脚本自己的文档里：先不带 `--check` 重跑刷新投影，
  再 `--check`；只改 `docs/audits/INERT-CONTRACT-SURVEY-2026-10-08.md` 里那一行，不要手改 JSON。
- **UI 量化门禁"跑得到但不生效"**（2026-10-18 实测，机制与"孤立闸"不同，别混为一谈）：
  `design-lab/tests/test_workbench_ui_audit_gate.py` **确实接线了**，它 shell 出去跑
  `scripts/audit_workbench_ui.py`（后者再包 `design-lab/tests/e2e/audit_workbench_ui.mjs`，见其 :28），
  所以 `test_gate_reachability` 判它可达是**对的**（经 `test_workbench_ui_audit_gate.py:34` 命名）。
  问题在另外两处：①它依赖 node + `playwright` + Chromium，缺失时 `skipTest`；
  而 CI 里 Chromium **只在 `workbench-browser-e2e` 作业安装**（yml 260–287），跑全量套件的
  `python-gate` 没有 → 在那里它必然 skip。②防跳过的 `verify_browser_e2e_ran.py` 用**显式元组**
  `TEST_MODULES`（不是 glob）只盯 5 个模块，**不含**这一个；该文件自己的 docstring 就写着
  "an unlisted browser suite would skip forever without a finding"。
  **净效果**：它 2026-10-07 报的 `violations=12`（`button#navToggle` 62x23）不会让任何提交变红。
  修法二选一：把它加进 `TEST_MODULES`，或让它不依赖浏览器。
- 改工作流先用 `actionlint` 校验（`gh release download` 取单文件即可），
  **PyYAML 通过不代表 GitHub 会接受**：重复映射键 PyYAML 静默取最后一个。
- `run_python_tests.py` 的沙箱里 `class`/`const`/`let` 是词法绑定，**不是** vm context 属性；
  测试里断言错误类型要 duck-typing，不要 `instanceof`。
- 在 vm 沙箱里补浏览器全局时**先看它是否已定义**：`Object.assign` 覆盖掉沙箱自己的
  `setTimeout` 会静默改掉该沙箱语义（真计时器还会让 node 事件循环多活 15–45 秒，撞 subprocess 超时）。

## 10. 什么算完成

- 改动有**可复核的读数**（命令 + 输出），不是"应该没问题"。
- 闸与测试在**同一份字节**上通过；CI 上按作业读到 success。
- 没建的、没验证的，写在可见文字里（面板、提交信息、本文件），不留在暗示里。
- 回退路径写明（按批 revert / 按文件 revert），并且冻结件与账本历史不被改写。

> 上一轮三次 CI 红，全部是**闸对了、人错了**：债务被结清却说没结、登记行被删但钉子没动、
> 一句注释冒充调用点。下次红的时候，先假设闸是对的。
>
> 2026-10-18 又补一句：**审计也会错，而且错法有规律**——用 grep 计数代替权威文档、用"没人引用"
> 代替"明文冻结"。所以"完成"还要求：**结论的来源写清楚**（命令 / 权威文档哪一节 / 闸的哪一条），
> 让下一轮能复算，而不是只能选择相信。
