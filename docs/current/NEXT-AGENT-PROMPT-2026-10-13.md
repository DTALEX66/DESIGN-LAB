# 下一会话提示词 — 2026-10-13（第二十四批收口）

**这不是 Authority。** 读它的顺序必须是：
`/AUTHORITY.md` → `.project/governance/authority-index.json` → 根 `AGENTS.md` →
唯一当前包 `docs/taskpacks/DESIGN-LAB-UI-FIRST-INTEGRATED-TASKPACK-2026-10-09.md` →
唯一状态源 `design-lab/config/task-ledger-r3.json` 的 `currentExecution` → 本文件。

记忆、聊天摘要、交接、旧 TaskPack、旧报告、分支名、提交数**都不能覆盖 Authority**。
**分支 / SHA / 工作区一律以你自己 `git rev-parse HEAD`、`git status --porcelain`、
`git ls-remote origin` 的读数为准，不要抄本文件里的任何 SHA。**

---

## 一、接手第一件事

```bash
git fetch origin
git rev-parse HEAD origin/main          # 两者应一致
git status --porcelain                  # 应为空
gh run list --branch main --limit 1     # 读结论，不预测
```

若 `HEAD != origin/main`：说明又有人在工作分支上推了东西，**先问清楚再动**，不要自行合并。

---

## 二、2026-10-12 之后发生了什么（时点值，只为让你知道"当时是什么"）

| 批次 | 内容 | 提交 |
|---|---|---|
| 第二十三批 | owner 项 G 落地：把闸真正引用的 1.13 MiB 证据字节搬进 Git | `7799fbe6` 之前 |
| 第二十四批 A/B/C | CI 上 `main` 首次真跑到单测后的 8 条失败：门可达性 3 / 冻结分区 3 / 链路写受跟踪文件 2 | `42108c1a`、`a8a2acc9` |
| 第二十四批 D05–D08 | 前端发现性与过滤四处"界面承诺 ≠ 代码行为"；挂在 `DL-UI-U03` | `4bfacf20` |
| 归档 | 抢救目录 + `rescue/` 4 个独有文件入库；**并补上我漏掉的"后链"** | `615c1ddb` |

- 第二十四批 A/B/C 的真因**不是**当时交接里写的那几条：冻结分区那 3 条是
  `r5_contract.validate` 先调 `current_execution.validate`，守卫触发在目标规则之前，
  `assertRaisesRegex('artifacts'|'reassessment')` **读到的永远是守卫的报错，断言根本没执行**。
  交付里那个 `archive_taskpacks_20261009_r2.py` 也是同族：写路径前置条件（源 ZIP）挡在读路径前面。
- 第二十四批 D05–D08：`systems`→`design_systems`、`version_no`→`version`、
  `objectsLoaded` 布尔量→三态、`qualified !== null`→`=== true`、
  领域抽屉跳转改为携带 `#/capabilities?domain=<slug>`（路由表按 `hashPath()` 匹配）。
- 两处归档：`docs/history/worktree-salvage-20261012/`（21 KB 文本入 Git；39 张旧 PNG
  留在 `.project-local` 但已登记 path+bytes+sha256）、
  `docs/history/personal-audit-rescue-20261007/`（4 个 `main` 里没有的文件，21 KB）。

---

## 三、两条本轮踩到、值得先读的坑

1. **"先账本、后链"是一步，不是半步。** 封完回执必须紧接
   `scripts/deepseek_authority_chain.py` → `verify_authority_gates.py --zero-spill`，**同批提交**。
   漏了后半的后果不是"链报红"这么简单：CI 的单测步骤会因整链 FAIL 而
   `AUTHORITY_GATES=PASS` 缺失，看起来像单测坏了。
2. **前端禁止行内 `style`。** 服务端每个响应都带 `style-src 'self'` 且无 `unsafe-inline`，
   `style` 属性会被拦成浏览器 E2E 的硬失败；同时它会动 `DESIGN.md §4` 的字面 px 债务计数
   （改完 `apps/workbench/**` 要跑 `scripts/design_debt_baseline.py --check`）。
   间距交给 class，不要交给 `margin-left:8px`。

---

## 四、仍未完成（不要替 owner 宣布完成）

### 需要 owner 裁定

- `docs/audits/DESIGNLAB-UI-R2-DESIGN-QA-2026-10-09.md` 的清单 **A–F、H–J** 一条未动。
  D02 / D01+D03 / D04 / D05–D08 / D09+D10 已做；owner 项 G 已按 A 方案落地。
- **`#13` 与 owner 项 F 是同一个问题，并且在代码里已经量到根因**：
  `src/design_lab/analysis/plan_to_rir.py` 这座"平面分解 Plan → reconstruction-ir"的桥
  **没有任何生产调用方**，而 `Plan.from_ocr` 的唯一实现是测试假件
  （`design-lab/tests/test_planar_decomposition.py` 的 `FakeOcr`）——
  `analysis/decomposition.py` 只声明了 `DecomposeModule` Protocol，仓库里没有真实 OCR 实现。
  所以缺的不是"路由/前端接续"这一步，而是**先定：工作台要不要跑本机 OCR（哪个模型、什么硬件、谁授权）**。
  定了之后，路由与前端接续才是几百行可逆工程；没定之前加一条只接受外部 plan 文档的路由，
  只是把"谁产出 plan"这个问题搬了个位置。界面目前三处（`shell.ts` 编排面、
  已识别结构面、provenance 面）**已经如实写着"没有生产调用方"**，这是诚实状态，不是欠账。

### 尚未执行

真实宿主 E3（需 owner 明确授权）、真人 E4、release、安装态分发、手机端（`FROZEN_DEFERRED`）。

### 账本里仍是 NOT_STARTED 的切片

`DL-UI-U07`（成果版本与局部改稿）、`U08`（真人评审与交付预检）、`U09`（知识回执、离线与反馈）、
`U10`–`U12`。`U07` 依赖 `U05`、`U09` 依赖 `U04`，两者都还是 PARTIAL——
任务卡允许"先给出可审阅桌面 UI，按需补 API"，但**要按 `docs/taskpacks/20261009-ui-first/` 的任务卡做，
不要自己另起一套 IA**。

### 必须保留

`rescue/designlab-personal-audit-dirty-20261007`：**仍无远端副本**。它的 4 个独有文件现已归档进
`docs/history/personal-audit-rescue-20261007/`，所以删分支不再等于内容消失；但分支本身仍按原决定保留。

---

## 五、每批的完成判据（照做，别省）

改动 → 闸与测试复跑（浏览器五件套 `skipped=0`）→ **`deepseek_authority_chain.py`**（凡动过账本、
被钉文件或索引）→ `verify_authority_gates.py --zero-spill` → 回执封存（**先账本、后链、同批提交**）→
提交 → 推工作分支并核对双端 SHA → **读该 SHA 的 CI 日志逐作业照抄**（不预测、不把本地结论写成 CI 结论）→
更新审计文档批次追记（追加会漂移 17 条绑它的回执，须重封，只有 `artifact_sha256` 可移动）。

本机基线（记住，别每次重新判）：聚合闸 `VERIFY_DESIGN_LAB=FAIL total=75 failed=1~2`，
红的那条/两条恒为 `verify_reconstruction_pipeline.py` / `verify_reconstruction_bundle.py`，
原因是本机 sandbox 的 safe-delete 批量守卫在 `shutil.rmtree` 上拦截，**CI 上是绿的**。
