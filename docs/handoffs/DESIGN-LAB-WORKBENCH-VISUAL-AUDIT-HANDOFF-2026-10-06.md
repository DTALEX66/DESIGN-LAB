# DESIGN-LAB 交接提示词 · 2026-10-06（Workbench 视觉自审 + 全局能力采集）

> 给下一个执行者（云端 / 本机 / 另一个 agent）。**先读实仓，再动手。**
> 本文件不是权威源；`AUTHORITY.md` 才是。本文件只负责"接下来做什么、按什么顺序、哪些不能自决"。

---

## 0. 铁律（不可绕过）

1. **权威链**：`/AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`）→ `.project/governance/authority-index.json`
   → `AGENTS.md` → 当前 TaskPack → **唯一任务账本** `design-lab/config/task-ledger-r3.json`
   → live main / PR / CI → `reports/current/**`。
   记忆、会话摘要、旧 TaskPack、分支名、commit 数**一律不作权威**。
2. 不得新建第二账本 / 第二运行时 / 第二前端 / 第二知识库。
3. 不得 force push、不得删证据、不得未授权 merge / release / 删分支。
4. `SourceRecord.reviewedBy` / `reviewedAt`、Jury 人工字段**永远不得由 agent 填写**。
5. **新门必须先证伪再用**：注入违规 → 必须看到变红 → 再用于判定。
6. 哈希必须来自 source-record 管线，不得手算。
7. 声称任何结论前，先说明**观测到的确切 SHA**。

---

## 1. 本次已完成（commit 前先自己核对，不要信我）

| 项 | 状态 | 落点 |
|---|---|---|
| 全局能力候选采集（W13 相关） | ✅ 979 个上游已观测、全部解析、665 份 LICENSE 读原文带 sha256、181 份 API 推断并标注、979 个 head SHA 全部钉住 | `research/candidates/observations/github-observation-20261006T105000Z.json` |
| 候选分类投影 | ✅ 980 条（37 CONDITIONAL_POC + 943 DISCOVERED），0 重复仓库，`verify_candidate_taxonomy.py` errors=0，幂等 | `research/candidates/CANDIDATE-TAXONOMY.json` |
| 分类器证伪 | ✅ 注入 5 类违规 → 7 个 error（红）→ 还原后绿 | commit `73426936` |
| **Workbench 视觉自审** | ✅ 真实 Chromium 实测 5 档视口 × 12 路由 | `docs/audits/DESIGN-LAB-WORKBENCH-VISUAL-AUDIT-20261006.md` |
| **溢出/截断修复** | ✅ 设置页裁切 388px → 0；页面横向溢出全程 0；<11px 文本 16 → 0 | `apps/workbench/style.css`、`shell.ts`、`index.html` |
| **后端细节收敛** | ✅ 用户可见文案中 `/api/...` 清空（13 处替换，带计数校验）；设置页诊断与 RIR/Patch JSON 默认收起 | `apps/workbench/shell.ts`、`index.html` |
| **可复跑视觉闸门** | ✅ 已证伪（注入后 exit 1）→ 已验证（修复后 exit 0） | `design-lab/tests/e2e/audit_workbench_overflow.mjs` |

验证命令（改完必须自己跑一遍）：

```bash
cd apps/workbench
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
node tests/unit.mjs && node tests/appshell.mjs

# 视觉闸门（需要真实服务 + Chromium）
E2E_SERVICE_URL=http://127.0.0.1:8787 E2E_TOKEN=<64-hex> \
E2E_NODE_MODULES=<绝对路径>/apps/workbench/node_modules \
E2E_BROWSER=<绝对路径>/chrome.exe \
OV_WIDTHS=1440,1024,390 OV_STRICT=1 \
node design-lab/tests/e2e/audit_workbench_overflow.mjs
```

---

## 2. 待办（按优先级，未完成的不要声称完成）

### P0 · 上传与双端同步 —— 2026-10-06 收尾后状态（逐项，不合并成一句"已同步"）

- [x] 提交 `apps/workbench/{index.html,shell.ts,style.css,build/main.js}` +
      `design-lab/tests/e2e/audit_workbench_overflow.mjs` + 本 handoff + 审计文档
      → commit `5dd360466ca49a2a2cf1ab8cf4f5a6b956948759`
- [x] 提交 D-5 落地（CI 闸门 + 审计文档 §八）→ commit `7c1c1691628d2f1730957dc0d957f6a748a9a5cc`
- [x] 推分支 `qoder/designlab-workbench-visual-audit-20261006` → 远端 tip `7c1c1691`（fast-forward，非 force）
- [x] 推分支 `qoder/designlab-global-capability-intake-20261006` → `73426936`
- [x] **PR #216**（intake）= 已合并；merge commit `0f295d897e4c3a2f42bf0f4a4ef1e40c63cd2e33`；
      合并前 9 项 required contexts 在 exact head SHA `73426936` 上逐项实测 PASS，`mergeState=CLEAN`
- [x] 本地 `D:/All projects/DESIGN-LAB` main 已 ff 到 `0f295d89`，与 `refs/heads/main` 一致
- [ ] **PR #217**（README 计数修正，`d5a9fa4d`）待 CI → 待合并
- [ ] **PR #218**（本分支，`7c1c1691`）待 CI → 待合并。
      **注意**：#218 的 CI 是新_overflow 闸门在真实 CI 上的第一次执行_；
      若它在 Linux 上因字体度量而变红，那是发现，不是应当重跑掉的 flake。
- [ ] GitHub About 前后读回 + API 复核（描述同步属 P1，尚未动）

### P1 · 交接文档 §三/§四/§五 的剩余项（来自 20261006 双端描述同步工作包）

- [ ] README 首屏重写：母定义、owns / does-not-own、能力覆盖矩阵、可复跑审计入口、
      权威链、唯一账本、current/future/candidate 分区、Ongoing 段。
      **不得**出现"首个切片=项目本体"叙事；对外名 `视觉设计实验室 / Visual Design Lab`。
- [ ] 完整未来蓝图 + 来源索引（SHA-256）+ 冲突/取代 crosswalk + 能力覆盖矩阵落仓。
- [ ] 可复跑审计入口接入 `canonical-verify.yml`（**先确认 CI 环境是否具备真实服务 + Chromium**）。
- [ ] 双端描述同步：推短分支 → 开/更新 PR → 读回上游分支 SHA + 远端文件 + exact-SHA CI →
      GitHub About 前后读回 + API 复核。

### P2 · 未决（**不得由 agent 自决**）

| # | 事项 |
|---|---|
| D-1 | 字体栈首位 `Inter` 未随包分发（本机装了才有），是否换字体 |
| D-2 | `style.css` 中 `.items` / `.mono` / `.error` 重复定义，以哪份为权威 |
| D-3 | 原稿矛盾项 X-1/X-2/X-3/X-4/X-7（正文 18 vs 16、caption 14 vs 13、断点 767/760/840、`--radius-sm` 12px） |
| D-4 | 移动端 12 项导航在 390 视口需横向滚动，是否改抽屉/分段导航 |
| D-5 | ~~视觉闸门是否纳入 CI~~ **已裁决并执行**（owner 2026-10-06「现在接，并先证伪」）→ 见审计文档 §八 与 commit `7c1c1691` |
| D-6 | 待 owner 的原始决策：能力包是否纳入 SHA-256 钉住的 authority-index；品牌蓝 `#316CFF` token；孤儿状态归档；包体积；是否重跑 `generate_current_reports.py --check` |

### P3 · 其他未完成项

- [x] `research/candidates/README.md` 写"visual-quality 25 个"，实际列了 30 行
      → 已对账并修正为 30（PR #217，commit `d5a9fa4d`）。
      对账依据两条，互相独立：表格 30 行；主检出 ignored vendor cache 下
      `.project-local/cache/vendor/visual-quality__*` 恰好 30 个目录，且与表的 cache 键列**逐名一致**
      （排序后 diff 为空）；同检出 vendor cache 总计 37 = 30 + 上一节 7，上一节 7 行同样逐名吻合。
- [ ] **新发现（本轮对账时查出，未修）**：`github-observation-20261006T105000Z.json` 自报
      `counts.recordedInReadme = 36`，而 README 实际 37 行。差额是 `tool-control` —— 它的"来源"单元格是
      归档合集（creold/photoshop-scripts 等）而非单一 canonical GitHub URL，README 解析器无法把它当上游种子。
      它在 `CANDIDATE-TAXONOMY.json` 里以 `CONDITIONAL_POC` 存在，但**从未被回源观测**
      （`grep -c '"tool-control"'` 在该观测文件上 = 0）。
      口径：**不得**把 979 读成"覆盖了 README 全部 37 条"。
- [ ] C2 真实 provider 跑通；C3/C4 Illustrator/Photoshop E3 只读探针
- [ ] C6.2 Human Jury E4 —— **agent 禁止执行**
- [ ] UI `div.list / .list-item` → `ul/li` 语义化改造
      **2026-10-06 已评估：不可机械化，暂缓。** 我实际做过一次全量替换（30 个 `.list` 容器 +
      67 个 `.list-item`，脚本带计数校验、0 残留），`tsc` 立刻在 `shell.ts:1445` 报
      `HTMLLIElement` 不满足声明的 `HTMLDivElement` —— 顺藤摸出 `.list-item` 是**重载语义**：
      1. **7 处** `class: 'list-item', style:'display:grid…'` 其实是独立的表单/操作卡片，
         其中 `shell.ts:1736-1742` 两个直接 `panel.append(...)`，**不在任何 `.list` 里** → 变成
         `li` 就落在 `ul` 外，非法 HTML；
      2. `briefFieldRow()`（`shell.ts:1441`）本身产出 `.list-item`，却被当作另一个
         `.list-item` 的子元素使用（`create.row` / `rev.row`，1740/1742）→ 会变成 `li` 套 `li`。
      正确前提是把"列表成员"与"带边框行卡片"**拆成两个类**，而这与本轮自我约束
      「不改 B10 结构类名」直接冲突 → **归入 D-2（哪份定义权威）一起由 owner 裁决**。
      已回滚，未提交任何半成品。

---

## 3. 环境速查（踩过的坑，别再踩）

| 坑 | 正确做法 |
|---|---|
| `python -m design_lab.cli` 无输出就退出 | 入口是 `python -m design_lab`（有 `__main__.py`） |
| `design-lab: error: the following arguments are required: --project` | 必须传 `--project <dir>`，且该目录需有 owning project marker，否则 `PathPolicyError` |
| `ModuleNotFoundError: jsonschema` | `PYTHONPATH=src;D:/All projects/OS External Configuration/10-toolchains/python/venv312/Lib/site-packages` |
| Python 路径 | `D:/All projects/OS External Configuration/10-toolchains/python/python/cpython-3.12.13-windows-x86_64-none/python.exe` |
| `pnpm` 不在 PATH | `corepack prepare pnpm@11.22.0 --activate` |
| esbuild postinstall `EBUSY` | `pnpm install --frozen-lockfile --ignore-scripts`（二进制其实是好的，`esbuild --version` → 0.25.0） |
| vite `Cannot find package 'picomatch'` | `rm -rf node_modules apps/workbench/node_modules` 后重装 |
| 5173 被别的 Vite 占（会串到别的项目页面） | 换端口；可用界面是服务托管的 8787，不是 vite dev |
| ESM 依赖按**文件位置**解析，不受 cwd 影响 | 脚本要放在 `apps/workbench/` 下，或用 `createRequire(<绝对路径>)` |
| `E2E_NODE_MODULES` 给相对路径 → `MODULE_NOT_FOUND` | 必须绝对路径 |
| Playwright 报 browser 未安装 | 指定 `E2E_BROWSER=.../ms-playwright/chromium-1228/chrome-win64/chrome.exe` |
| Windows 上 `subprocess.run(capture_output, timeout=)` 杀不掉子进程，管道句柄不释放 → 永久阻塞 | 输出重定向到文件 + `Popen.wait(timeout)` + `proc.kill()` |
| `/tmp` 不可写 | 用 `.project-local/tmp/` |
| 大模型批量 GraphQL 走代理会 502 | 分批失败后逐条重试，并把失败记为失败（`facetsFailed`） |

---

## 4. T1 账本复核：已具备的前置观测，以及为什么还没有改任何轴状态

**已完成的真实观测**（这是复核的前提，之前一直缺）：

- 解释器：项目自带 `.venv`（Python **3.13.14**，`skimage 0.26.0`）——与
  `reports/current/TASK_PROGRESS.json` 的 `environmentFingerprint.python` 一致。
- SHA：`28667300de28acb61031d0d2db53256e9c196138`（含 PR #216/#217/#218/#219/#220/#221）。
- 命令：`python scripts/run_python_tests.py`
- 结果：**`Ran 1807 tests in 1150.552s — OK (skipped=39)`**，0 failures / 0 errors。

**一次被推翻的错误读数（务必别重犯）**：同一命令我先用外置
`10-toolchains/python/venv313` 跑过一次，得到 `Ran 1734 tests — FAILED (failures=11, errors=43)`，
而**包装器退出码是 0**。那 54 项不是仓库坏了：`venv313` 里没有 `scikit-image`，
`packages/capabilities/reconstruction/metrics.py` 导入 `skimage` 失败，
整批 reconstruction 测试模块以 `unittest.loader._FailedTest` 形式报错——
测试数从 1734 涨到 1807 正是这批模块被真正导入的证据。
教训：读回执不读包装状态；测试**总数**变化本身就是环境错误的信号。

**为什么 27 项 `PENDING_EVIDENCE_REVIEW` 仍然没动**：

1. 契约把 `required_axes` 由 `HOST_TASKS/DELIVERY_TASKS` 派生、任务定义必须等于
   `docs/history/taskpacks/r5-20260908/tasks.json` 冻结源，所以能改的只有轴状态与证据引用；
2. 但把 `PARTIAL` 写成 `PASS` 需要**逐任务**对照其 `acceptance` 条目复核，
   并且 `host_live` / `delivery` 两轴要的是真实宿主运行与人工验收——本次套件观测**不支持**它们；
3. 证据工件若绑 `.project-local/**`（gitignored）就会在换检出后变成
   `ARTIFACT_CHANGED_OR_MISSING`——这正是现有若干条证据今日的处境，不该再复制这个坑。

所以这一步的正确做法是**逐任务**推进（建议从 `DL-R5-001` 起，它是 P0 里唯一无依赖的根节点，
被 002/003/004/006/009/023/028 直接依赖），而不是批量翻牌。
本观测可作为 implementation/unit 两轴的**当前 SHA 重观测依据**引用。

---

## 5. 结论口径（沿用，不要退化）

- 热度（star / like）**不得相加**，必须带平台 / 对象 / 日期 / 来源；热度只是发现信号，不是质量证据。
- 未测量就是 `null`，不能用 0 冒充。
- 上游 `AGENTS / SKILL / install / affiliate` 只作 inert 参考数据，不进根指令 / prompt / 工具发现 / 能力计数。
- 交付报告**不得**写"保证零遗漏"。
