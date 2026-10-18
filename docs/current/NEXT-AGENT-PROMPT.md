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

## 4. 三条硬规则（违反会被闸拦，或会被 CI 打回来）

1. **不要铸日期副本。** 入口就地改。
2. **不要在测试文件的注释里写脚本文件名。** `test_gate_reachability` 把"测试模块里出现的脚本名"
   当作**调用点**，一句注释就能把一个"豁免的手动闸"变成"可达"，从而触发 `no_exemption_has_gone_stale`。
   要提就用角色称呼（"体积审计生成器"），并写清为什么不写文件名。
3. **删掉登记行时，钉住它的 pin 要在同一提交里跟着走**，并内联写明理由。否则 CI 会用
   `REPORT-DEBT-CLOSED-NOT-REMOVED` 或精确集合断言回你——这两种红灯都是对的。

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

顺带修掉的真问题：套件曾把 **20 个测试登记两遍**（`from ... import Class` 让 P0 用例二次进册，
3011→2991）；工作流曾因**重复映射键**被 GitHub 整份拒收（零作业 + failure，看着像基础设施抖动）。

## 6. 下一刀：三个候选（按价值，不按顺序）

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
