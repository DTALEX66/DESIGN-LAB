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
python design-lab/scripts/verify_top_level_authority.py      # 10 项，含 5 个 SHA 钉
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

## 4. 三条硬规则（违反会被闸拦，或会被 CI 打回来）

1. **不要铸日期副本。** 入口就地改。
2. **不要在测试文件的注释里写脚本文件名。** `test_gate_reachability` 把"测试模块里出现的脚本名"
   当作**调用点**，一句注释就能把一个"豁免的手动闸"变成"可达"，从而触发 `no_exemption_has_gone_stale`。
   要提就用角色称呼（"体积审计生成器"），并写清为什么不写文件名。
3. **删掉登记行时，钉住它的 pin 要在同一提交里跟着走**，并内联写明理由。否则 CI 会用
   `REPORT-DEBT-CLOSED-NOT-REMOVED` 或精确集合断言回你——这两种红灯都是对的。

## 5. 已经做完的（D01–D06，全部在 `main` 上、CI 逐作业读过）

| 项 | 结果 |
|---|---|
| D01 触发去重 | 分支 push 只跑轻闸（compile + identity boundary），`main` 跑全套；顶层加了按 PR/ref 的 `concurrency` |
| D02 逐测试计时 | 逐测试 id/模块/状态/秒数 + 合并逐模块表，写进本次运行目录并打印 |
| D03 前置结构合同 | 3 模块 31 测试，作为 `python-gate` 第一步；空选择 rc=2 |
| D04 分片 | `--shard i/n` 独立进程 + 独立运行根；编排器校验**并集多重集合**等于 discovery |
| D05 重复调用 | 11 个重复步骤里删 7 个（9 次调用），保留跨作业/条件/轻闸那 4 个；阻断已用注入失败证明 |
| D06 请求截止 | 读 15s / 写 45s；写超时报"结果待核对，不是失败"并禁止盲目重发；切页只取消读 |

顺带修掉的真问题：套件曾把 **20 个测试登记两遍**（`from ... import Class` 让 P0 用例二次进册，
3011→2991）；工作流曾因**重复映射键**被 GitHub 整份拒收（零作业 + failure，看着像基础设施抖动）。

## 6. 下一刀：三个候选（按价值，不按顺序）

### A. D07 `shell.ts` 拆分（7751 行）——第一批只做"保持导出边界"的抽取
先抽共同错误/加载/状态组件与纯格式函数，**不动**页面级 render 的导出面，再谈动态 import。
**坑**：仓库里有一批"整文件源码出现次数/位置"型合同（`test_workbench_css_single_definition.py`
的 list 容器精确清单就是其一）。改模块边界时这些会红——按该文件的既有惯例登记"清单长了几列"，
不要为了让测试过而改数字；能转成页面/DOM 合同的，先转合同再拆文件。

### B. D08 列表渲染与 `design_layer` 查询的性能基准
先建合成基准（100 / 1000 / 10000 项），量 DOM 节点数、响应字节、首屏与切页时间，**再**决定分页。
`shell.ts` 7751 行只证明维护耦合，不证明首屏慢——不要用行数承诺性能。

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
