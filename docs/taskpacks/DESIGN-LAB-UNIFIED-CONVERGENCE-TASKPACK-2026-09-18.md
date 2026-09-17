# DESIGN-LAB 统一产品收口与反漂移执行任务包

**TaskPack ID：** `DL-TP-20260918-UNIFIED-CONVERGENCE-R1`
**版本：** `v1.0-integrated-convergence`
**状态：** `PROPOSED_EXECUTION_SUBPACK / NOT_ACTIVE_UNTIL_REGISTERED`
**上位 Authority：** `DL-TP-20260914-DEEPSEEK-AUTHORITY-R1`
**产品任务血统：** `DL-TP-20260908-R5`
**历史任务映射：** `DESIGN-LAB-HISTORY-TASK-ID-CROSSWALK-2026-09-04.csv`
**目标仓库：** `DTALEX66/DESIGN-LAB`
**本地 SSOT：** `D:\All projects\DESIGN-LAB`
**当前候选基线：** `codex/deepseek-authority-r1@fc4aa0f775c102d18365c386fe712b42fd9d018a`
**当前 main 基线：** `main@c4dccd58331bc4561eb89265283d924b7630d113`
**当前 PR：** `#116`，OPEN / NOT_MERGED
**用途：** PERSONAL_RESEARCH_NONCOMMERCIAL
**原则：** REUSE-FIRST / OPEN-SOURCE-FIRST / PLUGIN-FIRST / LOCAL-FIRST WHEN POSSIBLE

---

# 0. 本任务包是什么

本任务包不是：

* 第三套治理体系；
* 第三套任务状态数据库；
* 新的 Agent Runtime；
* 对 R5、DeepSeek Authority、历史 TaskPack 的推翻；
* 重新从零规划 DESIGN-LAB。

本任务包是：

> **把 DESIGN-LAB 过去所有仍有效的产品、架构、前端、后端、Adapter、Host、Rights、Jury、Preflight、语言、仓库、分支、CI、证据和历史任务，重新映射到当前真实远端状态后形成的统一收口执行包。**

旧任务只允许进入以下状态之一：

`VERIFIED_DONE`
`LANDED_PENDING_REVALIDATION`
`PARTIAL`
`OPEN`
`DEFERRED_HOST`
`DEFERRED_HUMAN`
`BLOCKED`
`SUPERSEDED_SCOPE_PRESERVED`
`HISTORICAL_ONLY`

禁止因为旧任务曾写过 `DONE`，就在新 SHA 上自动认为完成。

---

# 1. Authority 与激活规则

当前仓库 Authority 在本任务包正式落仓前保持不变。

当前：

```text
DeepSeek Current Authority
→ DL-TP-20260914-DEEPSEEK-AUTHORITY-R1

Product execution lineage
→ DL-TP-20260908-R5
→ design-lab/config/task-ledger-r3.json
```

本任务包只有在：

1. 文件落仓；
2. Authority Chain 分类；
3. AGENTS.md 明确注册；
4. 现有 ledger 建立映射；
5. exact-SHA CI 验证；

以后才能成为活动执行入口。

**不得因为本聊天生成了任务包，就声称仓库 Authority 已更新。**

不得创建第三个可变 task ledger。

如需机器派工，只能：

* 扩展现有 ledger；
* 或生成 read-only projection；
* 不允许建立平行事实源。

---

# 2. Authority 优先级

发生冲突时：

```text
用户当前明确指令
>
仓库根 AGENTS.md
>
当前正式 Authority
>
本任务包（激活后）
>
R5 task ledger / machine contracts
>
.project / product manifest / schemas
>
exact-SHA CI evidence
>
current generated reports
>
历史 Crosswalk
>
历史 TaskPack
>
交接摘要
>
聊天摘要 / Memory / compressed context
```

如果 current report 与代码、CI 或 exact SHA 冲突：

**report 降级，不允许代码事实跟着报告走。**

---

# 3. 历史任务包整合规则

必须保留并吸收以下历史范围：

| 历史阶段                                      | 必须继承的核心 scope                                                  |
| ----------------------------------------- | -------------------------------------------------------------- |
| 早期 DESIGN-LAB 深化任务                        | 当前事实、SSOT、Open Design、专业视觉质量、Adapter、E3/E4                     |
| 2026-08 Identity / Architecture Migration | DESIGN-LAB 身份、Host-neutral、Adapter Registry、Rights、MiniGame 边界 |
| 2026-08 Converged Follow-up               | Photoshop / Illustrator E3、Adapter SDK、专业交付                    |
| OSS / REUSE-FIRST 阶段                      | 开源能力吸收、最小 vendoring、license/source lock                        |
| Directory Migration                       | 目录收敛、第三方外置、运行数据治理                                              |
| 2026-09-04 Standalone-first               | R0–R5 58 项任务完整 scope                                           |
| 2026-09-05 Multimodal                     | 图片、视频、音频、3D、生成能力边界                                             |
| R3                                        | runtime、native execution、Photoshop/Illustrator、recovery        |
| R5                                        | 产品任务账本、Host/Delivery 多轴验收                                      |
| 2026-09-14 DeepSeek Authority             | 仓库、语言、外溢、结构、Authority、Codex handoff                            |
| 2026-09-17 Branch Convergence             | 全分支语义残留、CI blocker、PR/main 收口                                  |
| 2026-09-18 Fullstack Audit                | Workbench + Design Backend + Repo + Language 真正产品闭环            |

任何历史任务不得凭旧 ID 直接派工。

必须通过：

```text
legacy occurrence
→ historical crosswalk
→ current capability
→ current implementation
→ current evidence
```

确认。

---

# 4. 历史冲突统一裁决

## 4.1 Review Console vs Workbench

旧规划：

```text
Thin Review Console
```

当前产品深化：

```text
Professional Design Workbench
```

最终裁决：

> Workbench 是 DESIGN-LAB 的设计控制与决策工作台，但不是第二 Photoshop/Figma。

允许拥有：

* Brief；
* Reference Board；
* Research；
* Direction；
* Design System；
* Design IR；
* Version；
* Critique；
* Jury；
* Host execution；
* Readback；
* Preflight；
* Handoff；
* Evidence。

不建设：

* 通用像素画布；
* 通用矢量编辑器；
* 通用聊天壳；
* 通用 Agent OS。

因此旧 Review Console scope：

**SUPERSEDED_SCOPE_PRESERVED → Workbench Design Control Plane。**

---

## 4.2 npm vs pnpm

旧 TaskPack 出现过：

```text
package-lock.json
npm ci
```

当前 LANGUAGE-POLICY 已确定：

```text
pnpm
pnpm-lock.yaml
single product workspace
```

最终：

**产品 Workbench 使用 pnpm。**

MiniGame fixture 自己的 package.json：

保持 fixture-scoped。

不得成为 product workspace。

禁止同时出现 npm/yarn/pnpm 三套产品依赖真值。

---

## 4.3 Python 3.12 vs >=3.11

当前：

```text
pyproject:
requires-python >=3.11

Canonical CI:
Python 3.12
```

最终：

```text
Product minimum = >=3.11
Canonical CI = 3.12
```

除非以后真实 Host compatibility / benchmark 证明需要提高最低版本。

旧文档中“Python 3.12+”不得自动改变 product minimum。

---

## 4.4 Evidence 等级

历史中存在不同 E0–E4 定义。

统一使用当前：

```text
E0 DECLARED
E1 STRUCTURAL
E2 CONTROLLED_RUNTIME
E3 REAL_WORKFLOW
E4 INDEPENDENT_ACCEPTANCE
E5 RELEASED/REPEATABLE
```

旧 evidence 必须重新映射。

不得：

```text
旧 E3
→ 自动成为当前 E3
```

---

## 4.5 Open Design 身份

最终：

```text
Open Design = Host Adapter
```

不是：

```text
DESIGN-LAB runtime
默认唯一 Host
产品身份
第二 DESIGN-LAB
```

---

## 4.6 语言迁移

最终技术边界：

```text
Python
→ Runtime / State / QA / Provider / Reconstruction / CLI

TypeScript
→ Workbench / Web / IPC / MCP Client

JSX / UXP JS
→ Adobe Host Native

JSON Schema
→ Cross-language contract truth

SQL / SQLite
→ Local state

Shell / PowerShell
→ Thin launcher only

Rust
→ NOT_PRIMARY
```

不进行：

```text
Python → Rust 全仓迁移
Python → C# 全仓迁移
Workbench → Avalonia
Workbench → Electron
```

---

# 5. 产品身份硬冻结

DESIGN-LAB 是：

> AI-native、Agent-platform-neutral、Host-native 的职业视觉设计智能与生产能力层。

核心闭环：

```text
Brief
↓
Reference
↓
Research
↓
Directions
↓
Design System
↓
Design IR
↓
Production
↓
Native Host / Generator
↓
Readback
↓
Critique / Jury
↓
Refinement
↓
Preflight
↓
Editable Handoff
↓
Evidence / Provenance
```

必须同时保留：

**设计智能 + 真实设计执行。**

不得漂移为：

```text
仓库治理项目
CI 项目
JSON Schema 项目
Agent Framework
聊天工具
MiniGame 平台
Open Design Fork
通用自动化软件
```

---

# 6. 产品完成语义

从本任务包开始，任何设计能力都采用多轴状态：

```text
CONTRACT
BACKEND
FRONTEND
HOST
READBACK
QUALITY
RIGHTS
DELIVERY
EVIDENCE
```

例如：

```text
BACKEND = PASS
FRONTEND = NOT_IMPLEMENTED
HOST = NOT_VERIFIED
```

则只能写：

```text
BACKEND_IMPLEMENTED
```

禁止写：

```text
FEATURE_COMPLETE
PRODUCT_COMPLETE
```

---

# 7. 前后端必须纵向推进

禁止以后连续几天只跑：

```text
Backend
Schema
Verifier
Governance
```

新的默认研发单位为：

# Vertical Design Slice

```text
Workbench
↓
Contract / API
↓
Python Design Engine
↓
State
↓
Host / Generator
↓
Readback
↓
Quality
↓
Delivery
```

每个 Slice 必须从用户可见入口一直连接到真实结果。

---

# 8. 当前事实基线

执行前必须重新读取。

任务包编写时基线：

```text
candidate:
codex/deepseek-authority-r1
fc4aa0f775c102d18365c386fe712b42fd9d018a

main:
c4dccd58331bc4561eb89265283d924b7630d113

PR:
#116
OPEN
NOT_MERGED
```

PR #116 是当前 structural convergence PR。

不得因为本任务包出现，就再建立一个平行 structural convergence 分支。

---

# 9. 当前已落地但必须复验的修复

当前 candidate 已出现以下修复实现或提交声明，统一状态：

`LANDED_PENDING_REVALIDATION`

包括：

* `RenderError` compatibility；
* `request_hash` compatibility；
* Authority CLI modules protocol；
* Authority Gate secondary IndexError；
* Unicode/NUL-safe worktree digest；
* task resource state model；
* strict source-lock digest；
* package resources；
* remote receipt request/model/digest binding；
* SQLite store path convergence；
* README stale references；
* H3 expired evidence archive/disposition；
* branch semantic residual tooling；
* CI artifact readback；
* branch convergence matrix。

这些任务：

**不得重新从头实现。**

先验证 current HEAD。

只有失败才修。

---

# 10. 当前问题总登记

以下不是“漏洞数量”。

它们是：

```text
code defects
acceptance gaps
SSOT drift
product gaps
maintenance gaps
continuous invariants
```

---

## FA 系列

| ID                                                 | 状态                          | 本任务包处理                       |
| -------------------------------------------------- | --------------------------- | ---------------------------- |
| FA-01 RenderError/request_hash compatibility       | LANDED_PENDING_REVALIDATION | exact-SHA full tests         |
| FA-02 Authority CLI protocol                       | LANDED_PENDING_REVALIDATION | authority CI                 |
| FA-03 FAIL report 可被 identical FAIL check 误判       | MUST_REVERIFY               | 修 report semantics           |
| FA-04 worktree digest Unicode/path                 | PARTIAL_REVALIDATE          | 验 NUL + links + exclusions   |
| FA-05 zero-spill denied-root priority/completeness | OPEN_REAUDIT                | fail-closed                  |
| FA-06 task resource READY 语义                       | LANDED_PENDING_REVALIDATION | state matrix                 |
| FA-07 source lock digest identity                  | PARTIAL_REVALIDATE          | observed digest/revision     |
| FA-08 fresh clone PASS 语义                          | OPEN_REAUDIT                | fresh clone qualification    |
| FA-09 CI coverage 与真实工具链                           | PARTIAL                     | Frontend/Ruff gates          |
| FA-10 历史完成度冒充当前完成度                                 | PERMANENT_INVARIANT         | 禁 overall fake %             |
| FA-11 `/api/task-preflight`                        | CONFIRMED_OPEN              | P0 修复                        |
| FA-12 package resources / checkout coupling        | LANDED_PENDING_REVALIDATION | wheel smoke                  |
| FA-13 artifact action / release workflow           | LANDED_PENDING_REVALIDATION | exact current workflow       |
| FA-14 fake API artifact readback                   | LANDED_PENDING_REVALIDATION | GitHub Actions real artifact |
| FA-15 remote receipt stale binding                 | LANDED_PENDING_REVALIDATION | negative tests               |
| FA-16 Workbench 无完整设计纵切                            | OPEN_P0                     | 产品主任务                        |
| FA-17 branch inventory / residual                  | PARTIAL                     | semantic closeout            |
| FA-18 README stale paths                           | LANDED_PENDING_REVALIDATION | current path verifier        |
| FA-19 SQLite selected path mismatch                | LANDED_PENDING_REVALIDATION | single DB smoke              |

---

## RA 系列

| ID                                        | 状态                           |
| ----------------------------------------- | ---------------------------- |
| RA-01 expired binary evidence             | LANDED_PENDING_REVALIDATION  |
| RA-02 authority-chain freshness           | OPEN：tracked projection 仍需收口 |
| RA-03 “no regression” 无证据                 | PERMANENT_INVARIANT          |
| RA-04 C/D spill audit scope overstatement | PERMANENT_INVARIANT          |

任何 scoped drive scan：

不得写：

```text
C drive clean
D drive clean
```

只能写实际扫描范围。

---

# 11. 新增 Fullstack / SSOT 问题

## FU-01

Workbench 当前只存在于 convergence candidate。

必须：

```text
merge 后 main exact SHA readback
```

才能称正式主线拥有 Workbench。

---

## FU-02

Workbench 当前仍只有：

```text
index.html
main.ts
style.css
```

没有完整产品：

```text
package.json
tsconfig
Vite build
pnpm lock
strict TS gate
browser E2E
```

状态：

`OPEN_P0`

---

## FU-03

Canonical CI 没有独立 Workbench Product Gate。

状态：

`OPEN_P0`

---

## FU-04

ACTIVE `ARCHITECTURE.md` 与真实目录结构漂移。

仍描述旧：

```text
design-lab/intelligence
design-lab/atoms
design-lab/bundles
design-lab/scenarios
design-lab/adapters
```

必须修。

---

## FU-05

历史活动感文档过多：

```text
ARCHITECTURE_V2
ARCHITECTURE_V3
ROADMAP_V2
INTEGRATION_V21
...
```

必须：

```text
history
或
HISTORICAL POINTER
```

---

## FU-06

`LANGUAGE-POLICY.md` 与 `pyproject.toml` 对 Ruff 的描述冲突。

必须建立一个事实。

---

## FU-07

`product-manifest.json`：

```text
version = 1.0.0
```

而：

```text
pyproject = 0.1.0-alpha.0
```

版本真值冲突。

必须统一。

---

## FU-08

`product-manifest.json` 文档路径仍存在旧路径：

```text
docs/PRODUCT_DEFINITION.md
docs/BOUNDARY_CONTRACT.md
```

必须与当前 SSOT 对齐。

---

## FU-09

tracked current report 存在：

```text
旧 candidate SHA
旧 worktree state
```

同时仓库 HEAD 已前进。

必须重构 report freshness 语义。

---

## FU-10

tracked report 不应试图自引用“包含自身的 commit SHA”。

以后：

```text
tracked report
→ source/input digest / tree scope

exact commit SHA evidence
→ CI artifact
```

避免：

```text
生成 report
→ commit SHA 变化
→ report 又 stale
→ 再 commit
```

无限循环。

---

## FU-11

当前 backend 已有大量设计能力，但未作为 Workbench 第一等设计对象暴露。

状态：

`OPEN_P0`

---

## FU-12

默认 UI 仍过于工程化：

```text
RIR JSON
Patch JSON
Styles JSON
```

必须转 Advanced Developer Mode。

---

# 12. Wave 0 — Freeze / Delta / History

**Owner：DeepSeek / Codex structural**

任务：

`DL-UCR-000`

执行：

1. read current remote candidate；
2. read current main；
3. read PR #116；
4. read Actions；
5. read branch heads；
6. read AGENTS；
7. read current Authority；
8. read R5 ledger；
9. read historical crosswalk；
10. 生成本任务包 delta baseline。

输出必须包括：

```text
HEAD
main
PR
CI
branch
authority
task ledger
worktree
current reports
```

任何 SHA 变化：

只做 delta。

禁止重新进行“全项目从零理解”造成漂移。

---

# 13. Wave 1 — 当前 candidate / PR #116 收口

**目标：**

先把已经跑了很久的 structural convergence 真正闭合。

不把 Workbench 大改塞进 PR #116。

PR #116 只允许：

```text
bug fix
truth fix
authority fix
SSOT fix
CI fix
report fix
```

禁止继续扩张功能。

---

## DL-UCR-010 — exact-SHA revalidation

Current head 上必须跑：

```text
locked install
structural verifiers
authority gate
full Python
package smoke
HTTP smoke
artifact readback
rights
clean tree
```

---

## DL-UCR-011 — 报告 freshness

处理：

```text
MAIN-MERGE-READINESS
DEEPSEEK-AUTHORITY-CHAIN
branch reports
current projections
```

不得留下：

```text
current report
subject = old candidate
```

---

## DL-UCR-012 — FA-03

验证并修复：

```text
FAIL report
→ --check
```

不得：

```text
same FAIL
→ PASS
```

history 必须保留：

```text
subject
platform
manifest
run identity
```

---

## DL-UCR-013 — FA-05

zero-spill：

顺序必须：

```text
denied root
→ allowed root
→ unknown
```

不得 allowed repo root 抢先覆盖 denied path。

必须验证：

* symlink；
* junction；
* incomplete scan；
* permission denied；
* hidden/dot roots；
* missing drives。

---

## DL-UCR-014 — FA-11

修：

```text
/api/task-preflight?task=...
```

必须正确：

* parse path；
* parse query；
* import；
* task validation；
* error mapping。

必须真实 HTTP test。

不能只测 Python helper。

---

# 14. Wave 2 — Main structural adoption

只有：

```text
PR #116 required checks green
+
用户明确允许 merge
```

才进入。

否则：

STOP。

禁止 Agent 自主 merge。

Merge 后：

```text
main exact SHA
```

重新：

```text
install
unit
authority
package
HTTP
WorkBench smoke
clean tree
```

Candidate PASS 不代表 main PASS。

---

# 15. Wave 3 — Repository SSOT 真正规范化

## 最终目录责任

```text
apps/
→ runnable frontend

src/design_lab/
→ Python runtime

packages/
→ reusable design capabilities

integrations/
→ host/tool/model boundaries

design-lab/
→ content/config/contracts/tests

fixtures/
→ test/regression fixtures

research/
→ intake

vendor/
→ locks/minimal reviewed sources

docs/
→ human authority/history

reports/
→ projections/evidence index

scripts/
→ thin repo tooling

.project/
→ tracked project policy

.project-local/
→ all local runtime state
```

---

## design-lab/ 历史双树裁决

保留：

```text
config
schemas
domain-packs
evals
research
production
templates
tests
assets
profiles
design-systems
```

作为 content / authoring root。

禁止：

```text
new runtime code
```

进入这里。

Runtime 只能：

```text
src/design_lab
```

---

## services/

当前没有真实独立 service。

不得为了目录漂亮创建：

```text
services/jobs
services/review
services/delivery
```

空壳。

只有生命周期真的独立后再创建。

---

# 16. ARCHITECTURE 修复

重写 ACTIVE 架构树。

必须反映真实：

```text
apps
src
packages
integrations
design-lab
fixtures
docs
reports
scripts
.project
.project-local
```

禁止继续以已经不存在或 superseded 的路径为 current target。

---

# 17. 历史架构文档降权

处理：

```text
design-lab/ARCHITECTURE_V2.md
design-lab/ARCHITECTURE_V3.md
design-lab/ROADMAP.md
design-lab/ROADMAP_V2.md
design-lab/INTEGRATION_V21.md
...
```

历史内容保留。

但必须：

```text
HISTORICAL
SUPERSEDED
CURRENT → ...
```

不得让 Agent 误判为活动 SSOT。

---

# 18. Manifest Truth

统一：

```text
PRODUCT_DEFINITION
BOUNDARY_CONTRACT
ROADMAP
ARCHITECTURE
LANGUAGE_POLICY
DIRECTORY_AUTHORITY
product version
```

`product-manifest.json` 与真实路径一致。

---

# 19. 版本真值

当前应明确区分：

```text
schemaVersion
productVersion
releaseState
```

Product version 以真正 package/release 事实决定。

若当前仍：

```text
0.1.0-alpha.0
```

则 manifest 不得继续写：

```text
1.0.0
```

除非有真实 release 决策。

---

# 20. Runtime Root

唯一：

```text
.project-local/
```

包含：

```text
state
runs
cache
artifacts
exports
logs
tmp
locks
agent-workspaces
task-runtime
task-artifacts
```

`.hermes`：

```text
LEGACY / AGENT HOME
```

不得成为 DESIGN-LAB runtime write target。

---

# 21. Spill / Foreign Data

原则：

```text
detect
classify
hash
owner
preserve
migrate only if DESIGN-LAB-owned
```

禁止：

```text
按文件名删除
按相似目录删除
未知 DB 删除
外项目文件移动
```

C:/D: 审计必须注明 scope。

---

# 22. Wave 4 — Language Convergence

## Python

保持 Python。

不重写。

当前职责：

```text
Runtime
State
Creative
Provider
Reconstruction
QA
Preflight
CLI
HTTP service
```

继续：

```text
pyproject
uv.lock
Hatchling
src layout
```

---

# 23. Ruff 真实落地

必须二选一。

推荐：

**正式落地。**

增加：

```text
pinned Ruff dev dependency
uv.lock
CI Ruff step
local lint command
supply-chain record
```

然后更新 LANGUAGE-POLICY。

不得继续：

```text
pyproject 说已执行
policy 说没安装
CI 又没有明确执行
```

三套事实。

---

# 24. TypeScript 真迁移

这是本轮真正的语言迁移。

从：

```text
.ts extension
+
browser-compatible JS subset
```

迁移到：

```text
strict TypeScript
→ typecheck
→ build
→ test
→ package
```

---

## Product Node workspace

建立唯一 product workspace：

```text
/package.json
/pnpm-workspace.yaml
/pnpm-lock.yaml
```

只包含产品 Workbench。

MiniGame fixture：

保持 fixture 自己的 Node 环境。

不把它变成 workspace dependency。

---

# 25. Workbench 技术结构

目标：

```text
apps/workbench/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ index.html
├─ src/
│  ├─ main.ts
│  ├─ api/
│  ├─ contracts/
│  ├─ state/
│  ├─ views/
│  ├─ components/
│  └─ styles/
├─ tests/
└─ e2e/
```

技术：

```text
Vanilla TypeScript
Vite
pnpm
Playwright
```

第一阶段：

不引入 React / Vue。

因为当前 UI 规模不需要额外框架复杂度。

---

# 26. TypeScript strict baseline

至少：

```text
strict
noImplicitAny
strictNullChecks
noImplicitReturns
noFallthroughCasesInSwitch
```

API response：

不得：

```text
any
```

跨语言 enum：

不得手抄。

来自：

```text
JSON Schema / generated types
```

---

# 27. Frontend CI

增加独立：

```text
workbench-gate
```

不得被 Python 失败自动 skip。

至少：

```text
pnpm install --frozen-lockfile
typecheck
Vite build
unit tests
Playwright Chromium
package integration
clean tree
```

Python 和 Frontend：

分别出结果。

---

# 28. Wave 5 — Workbench 产品化

Workbench 主导航：

```text
Projects
Brief
References
Research
Directions
Design System
Create
Versions
Review
Preflight
Handoff
Evidence
```

---

# 29. JSON 降级为 Advanced

正常用户操作：

```text
文字
字体
字号
颜色
间距
层级
构图
对象
尺寸
材质
方向
Variant
Design Token
```

以下移动到：

```text
Advanced / Developer
```

* RIR JSON；
* Patch JSON；
* raw styles；
* raw receipts；
* debug payload。

---

# 30. Frontend 不只是 Dashboard

Workbench 必须真正承担设计决策：

```text
Edit Brief
Manage Reference
Compare Direction
Select Direction
Edit DesignSystem
Review DesignDiff
Approve / Reject
Request Revision
Select Host
Apply Critique
Run Preflight
Build Handoff
```

不能只是：

```text
看任务列表
点 Run
看日志
```

---

# 31. Wave 6 — Design Backend 产品化

优先复用：

```text
src/design_lab/creative/
```

禁止再建：

```text
creative_v2
new-design-runtime
studio-backend
```

平行实现。

---

# 32. 第一等 Design Objects

必须真正进入：

```text
State
API
Workbench
Versioning
Evidence
```

对象：

```text
Brief
ReferenceSet
ResearchFinding
Direction
DesignSystem
DesignIR
CreativeJob
Artifact
QualityAssessment
JuryDecision
PreflightReport
HandoffPackage
EvidenceRecord
```

---

# 33. Commercial Design Router 真正执行

现有：

```text
intake
research
directions
system
generation
critique
preflight
handoff
```

必须从 SKILL 文档变成：

```text
executable workflow
```

---

## 每阶段

必须：

```text
state
version
hash
owner
evidence
failure
rollback/refinement
```

---

# 34. Design Direction Gate

一个重要设计任务至少探索：

```text
3 structurally different directions
```

不是：

```text
同一版换三个颜色
```

Workbench 必须视觉比较：

* concept；
* composition；
* typography；
* color；
* imagery；
* material；
* hierarchy；
* production feasibility；
* risk。

人工选择 Direction。

---

# 35. DesignSystem

选定 Direction 后形成：

```text
versioned DesignSystem
```

至少：

```text
typography
color
spacing
grid
layout rules
visual language
material
imagery rules
component/token rules
production constraints
```

然后进入生产。

---

# 36. DesignContext / ChangeSet / DesignDiff

继承历史 R2-019 scope。

必须继续拥有：

```text
must_keep
must_change
change_budget
semantic_diff
visual_diff
expected_revision
```

像素相似度：

不得单独批准设计修改。

---

# 37. Operation / Attempt

继承历史 R2-018。

必须保持：

```text
logical Operation
≠
physical Attempt
```

外部 Host：

不宣称 exactly-once。

发生：

```text
host changed
receipt missing
```

必须：

```text
OUTCOME_UNKNOWN
→ RECONCILING
```

不是盲重试。

---

# 38. SQLite Truth

唯一活动数据库：

```text
.project-local/state/design-lab.db
```

禁止第二套活动 DB。

保持：

```text
single writer
transactional outbox
idempotency
receipt conflict handling
backup API
quick_check
```

---

# 39. HostSession / DocumentSession

继承历史任务。

必须区分：

```text
ATTACH_EXISTING
LAUNCH_OWNED
```

用户已有未保存文档：

不得被自动接管。

必须 Human Choice。

---

# 40. Process Supervisor

只允许管理：

```text
DESIGN-LAB launched helpers
bridge
renderer
Comfy worker
```

禁止强杀：

```text
用户自己打开的 Photoshop
Illustrator
CorelDRAW
```

---

# 41. Portable Workspace

继续保留。

可携带：

```text
repo
schemas
locks
assets manifest
models manifest
```

不可直接跨机器复制作为有效运行态：

```text
active SQLite
venv
credentials
Adobe installation
COM registration
GPU driver
```

---

# 42. Observability

继续保留：

```text
AuditEvent
RunTrace
W3C trace context
local telemetry
support bundle
redaction
```

Telemetry：

不能成为业务真值。

---

# 43. Wave 7 — Host / Tool / Generator

所有 Adapter 继续统一：

```text
probe
prepare
execute
observe
readback
rollback
```

禁止：

```text
每个工具自己造完整 runtime
```

---

# 44. Adobe

优先顺序：

```text
Photoshop
Illustrator
```

然后按真实需求：

```text
InDesign
Premiere
After Effects
```

不做 Adobe 万能 Adapter。

---

# 45. Photoshop

保留：

```text
UXP
DOM-first
executeAsModal
readback
history/rollback
editable PSD
```

当前旧 UXP branch 的 capability：

只允许 selective requalification。

禁止 whole cherry-pick。

---

# 46. Illustrator

保持：

```text
native editable
AI/SVG/PDF
text/object readback
revision
rollback
```

结构 test：

不冒充真实 E3。

---

# 47. Open Design

作为：

```text
optional Host Adapter
```

保持：

```text
neutral capability
→ Open Design projection
```

不得污染 core。

---

# 48. Figma / Penpot / OpenPencil

作为 Optional Host。

进入产品前必须：

```text
probe
real editable test
readback
rollback
rights
maintenance
```

不因为开源或流行就自动吸收。

---

# 49. CorelDRAW

历史任务保留为 optional professional print/vector host。

不作为 0.1 全局硬依赖。

---

# 50. Media / Multimodal

必须保留过去用户要求：

```text
image
video
audio
3D
motion
```

但统一进入：

```text
Creative Generator / Media Adapter
```

不为每类模型新建产品。

---

## 支持边界

```text
ComfyUI
FFmpeg
Blender
Audio provider
Video provider
Remote generation providers
```

均经过公共 contracts。

---

# 51. MiniMax H3

不作为全项目 blocker。

独立：

```text
Rights Gate
Model Lock
Runtime Gate
Evidence
```

许可/地域/使用范围：

必须基于执行时实际许可重新判断。

不得依赖旧报告永久授权。

---

# 52. REUSE-FIRST 真正落实

从现在开始，外部项目/方法不能只进入 Registry。

任何 Source 最终必须进入：

```text
ABSORBED
REFERENCE_ONLY
REJECTED
DEFERRED
```

---

## ABSORBED 必须有

```text
source
license
revision
capability mapping
destination
implementation
tests
evidence
rollback
```

没有代码/方法/规则/测试落点：

不得写：

```text
已融合
```

---

# 53. Vendor / Third-party

禁止整仓长期 vendoring。

优先：

```text
source lock
minimal absorbed source
license
patch
fixture
method card
```

第三方：

```text
AGENTS
CLAUDE
cursorrules
SKILL
install scripts
```

保持 inert。

不得自动提升成根指令。

---

# 54. Wave 8 — Quality / Jury

设计质量必须成为产品主线。

包含：

```text
composition
hierarchy
typography
color
spacing
material
lighting
readability
brand fit
commercial readiness
accessibility
AI-slop
```

---

# 55. Automated 与 Human 分离

必须显示：

```text
Automated Assessment
Human Jury
```

Agent/VLM：

不能自称 Human Jury。

---

# 56. Human Jury

E4 必须是：

```text
真实人
实际查看作品
实际给 verdict
```

仅存在 JSON：

不是 E4。

---

# 57. Critique Loop

Workbench 支持：

```text
Critique
↓
Apply / Reject
↓
Revision
↓
Compare
↓
Re-score
```

历史版本不可覆盖。

---

# 58. Rights

所有：

```text
font
image
logo
trademark
model
audio
video
reference
third-party source
```

进入 Rights。

Unknown：

默认不能 production certify。

---

# 59. Preflight

必须至少覆盖：

```text
dimensions
resolution
color mode
bleed
fonts
links
rights
editability
missing assets
BOM
delivery target
known limitations
```

---

# 60. Handoff

最终 HandoffPackage：

```text
editable source
preview
asset manifest
font manifest
rights summary
BOM
preflight
provenance
evidence
known limitations
```

ZIP hash PASS：

不代表：

```text
commercial-ready
```

---

# 61. Wave 9 — Golden Workflow 01

# DESIGN-LAB Designs DESIGN-LAB

使用 DESIGN-LAB 自己重设计 Workbench。

完整：

```text
Brief
↓
Reference
↓
Research
↓
3 Directions
↓
Human Selection
↓
DesignSystem
↓
Workbench Implementation
↓
Browser Test
↓
Quality
↓
Accessibility
↓
Human Jury
↓
Preflight
↓
Handoff
```

目的：

同时验证前端和设计后端。

---

# 62. Golden Workflow 02

# Professional Commercial Visual

建议：

```text
Poster / Brand Visual
```

完整：

```text
Brief
↓
References
↓
Directions
↓
DesignSystem
↓
DesignIR
↓
Photoshop / Illustrator
↓
Editable Artifact
↓
Readback
↓
Patch
↓
Critique
↓
Human Jury
↓
Preflight
↓
Handoff
```

禁止仅 PNG 作为成功。

---

# 63. Golden Workflow 03

在前两个稳定后再增加：

```text
UIUX
Packaging
Spatial / Exhibition
Motion / Video
3D
```

不是同时扩张所有领域。

---

# 64. Evidence

每条 evidence 必须绑定：

```text
repo SHA
adapter
host version
OS
fixture
artifact hash
command/action
approval
readback
rollback
timestamp
```

---

# 65. CI 最终结构

Canonical 拆清职责：

```text
Repository / Authority Gate
Contract Gate
Python Backend Gate
Workbench Frontend Gate
Package / Fresh Clone Gate
Rights / License Gate
Host Structural Gate
MiniGame Fixture Boundary
```

真实 Host：

```text
Host Live Qualification
```

单独记录。

---

# 66. Frontend 独立运行

Python FAIL：

不能造成：

```text
Frontend全部 skipped
```

Frontend 必须独立看到：

```text
PASS / FAIL
```

---

# 67. Fresh Clone

建立真正 fresh clone / installed-wheel qualification。

不能：

```text
checkout 内 imports PASS
```

就声称 package 可安装。

---

# 68. Package Smoke

必须在：

```text
outside repository checkout
```

测试：

```text
import
CLI
resources
schemas
Workbench
HTTP
native plan
```

---

# 69. HTTP Smoke

至少：

```text
health
environment
projects
tasks
native-plans
task-preflight
native-assets
bundle
```

真实 HTTP。

---

# 70. Report Truth

`reports/current/` 新规则：

每份 report 必须注明：

```text
observed_at
input digests
source state
freshness
```

如果是 tracked projection：

优先绑定：

```text
input/tree digest
```

Exact commit SHA：

放 CI evidence/artifact。

禁止自引用 commit 循环。

---

# 71. No Fake Green

禁止：

```text
file exists = PASS
schema exists = feature done
unit test = E3
static adapter = integrated
VLM = Human Jury
candidate green = main green
old E3 = current E3
```

---

# 72. Branch Convergence

继续使用已有：

```text
semantic residual matrix
```

而不是 Git ahead/behind 数量判断能力。

---

## 三类分支

### S1

Graph ancestor / zero unique：

可进入 cleanup candidate。

但不能自动删除。

---

### S2

Semantic absorbed / historical：

先：

```text
equivalence
external reference
PR/tag
automation
worktree
```

检查。

---

### S3

历史高风险：

```text
UXP
R4
directory convergence
```

必须完成：

```text
semantic residual = explicitly resolved
```

才可进入 cleanup proposal。

---

# 73. 禁止 whole merge

禁止直接 whole-merge：

```text
fix/design-lab-governance-closure-r4
migration/dl-directory-convergence-r1
codex/uxp-validation-handoff-20260822
```

只迁真实 residual。

---

# 74. Branch Delete

删除分支属于 destructive。

必须：

```text
用户明确授权
```

即使已经证明 0 residual，也只是：

```text
DELETE_CANDIDATE
```

---

# 75. PR #116

当前 PR #116 不自动 merge。

要求：

```text
head exact CI green
SSOT blockers closed
known code blockers closed
package/readback truth closed
user authorization
```

---

# 76. Main Protection

如果权限允许：

建议 main：

```text
PR required
required checks
block force push
block delete
```

如果 API 无权限：

状态写：

```text
UNKNOWN
```

不能写“已保护”。

---

# 77. Executor 分工

## DeepSeek / DSH

负责：

```text
repository
docs
SSOT
authority
static contracts
schemas
source locks
cleanup
offline tests
language boundary
CI structural
branch residual analysis
```

---

## Codex

负责：

```text
Workbench implementation
backend implementation
real host integration
Photoshop/Illustrator
HTTP/live flows
package
browser
E3
```

---

## Human

负责：

```text
Direction selection
Rights decisions
professional visual Jury
production acceptance
destructive authorization
merge/release authorization
```

---

# 78. 真实 Host 不作为结构修复全局 blocker

可以先完成：

```text
repo fix
schema fix
front end build
backend API
CI
```

而不等待所有 Host。

但是：

没有真实 Host：

不得声称：

```text
E3
integrated
product complete
release ready
```

---

# 79. 当前优先级

## P0-A — 先收掉当前 structural branch

```text
current CI
FA-03
FA-05
FA-11
SSOT docs
version truth
language truth
report freshness
package/fresh clone
```

---

## P0-B — Workbench

```text
strict TypeScript
Vite
pnpm
browser E2E
real design workflow
```

---

## P0-C — Backend → Workbench

```text
Brief
Reference
Direction
DesignSystem
Quality
Handoff
```

---

## P1

```text
Adobe E3
Jury
Preflight
Branch cleanup
```

---

## P2

```text
expanded media
additional hosts
advanced domains
performance optimizations
```

---

# 80. 当前 issue closure 顺序

严格按：

```text
1 baseline
2 current CI
3 known defects
4 SSOT
5 package truth
6 main convergence
7 frontend toolchain
8 frontend design workflow
9 backend product APIs
10 host vertical slices
11 quality
12 handoff
13 golden workflows
14 E3/E4
15 release/cleanup
```

禁止再次：

```text
先扩治理
后做产品
```

---

# 81. 反漂移 Gate 01 — Product Identity

每次 TaskPack/PR 必须检查：

```text
Does this improve professional design capability?
```

如果主要成果只有：

```text
more governance
more registry
more reports
```

且没有修真实 blocker：

拒绝。

---

# 82. 反漂移 Gate 02 — Frontend / Backend Balance

每次阶段必须报告：

```text
Frontend changed?
Backend changed?
User-visible design capability changed?
```

如果连续两个产品 Wave：

```text
Frontend = NO
```

必须解释。

---

# 83. 反漂移 Gate 03 — No Parallel Runtime

搜索并阻断：

```text
creative_v2
runtime_v2
new-backend
new-store
new-workbench
```

无 ADR 平行实现。

---

# 84. 反漂移 Gate 04 — No Old Architecture Resurrection

CI 检查 current docs/config 不得重新把旧：

```text
design-lab/intelligence
design-lab/atoms
design-lab/adapters
```

标成活动 target。

历史文档 allowlist 除外。

---

# 85. 反漂移 Gate 05 — Language Boundary

自动检查：

```text
Python not frontend
TS not backend orchestration
JSX not runtime state
Shell not business logic
Rust not primary
```

---

# 86. 反漂移 Gate 06 — Evidence Truth

自动检查：

```text
E3 requires host
E4 requires human/independent acceptance
E5 requires exact release
```

---

# 87. 反漂移 Gate 07 — Historical IDs

任何旧：

```text
DL-xxx
```

必须经 historical crosswalk。

禁止裸 ID 重新派工。

---

# 88. 反漂移 Gate 08 — No Completion Sum

禁止：

```text
58/58 DeepSeek
+
28/28 R5
=
100% project complete
```

不同 ledger：

不同 scope。

不得相加。

---

# 89. 反漂移 Gate 09 — Current Report Freshness

`reports/current` 中出现：

```text
old SHA
old branch
old path
```

必须：

```text
FAIL / STALE
```

不能继续被 current 文档引用为当前事实。

---

# 90. 反漂移 Gate 10 — REUSE-FIRST

新增第三方能力前：

必须搜索：

```text
existing project capability
existing open source
existing adapter
existing method
```

只有不存在合适实现：

才自研。

---

# 91. 反漂移 Gate 11 — Absorption

Source Registry 中长期：

```text
CANDIDATE
```

不得不断累积。

每轮要求清算：

```text
ABSORB
REFERENCE
REJECT
DEFER
```

---

# 92. 反漂移 Gate 12 — Repository Size

持续：

```text
tracked repo size
large binary
duplicate source
generated artifact
runtime spill
```

检查。

运行数据：

永远不进 Git。

---

# 93. 反漂移 Gate 13 — Main Is Truth After Merge

Merge 后：

candidate 不再是产品事实源。

重新：

```text
main exact SHA
```

取证。

---

# 94. 反漂移 Gate 14 — No Silent Scope Expansion

一个任务如果从：

```text
fix API
```

变成：

```text
rewrite backend
```

必须 STOP。

重新拆 task。

---

# 95. 反漂移 Gate 15 — No Unauthorized Destructive Action

必须人工批准：

```text
branch delete
force push
merge
release
license acceptance
commercial publish
irreversible asset change
```

---

# 96. 阶段汇报固定模板

每次只用：

```text
Baseline SHA:
Current branch:
Main SHA:
PR:
Changed capability:
Frontend:
Backend:
Host:
Tests:
Exact result:
Evidence level:
Human gate:
Rights:
Open issues:
Historical predecessor tasks:
Rollback:
Worktree:
Next:
```

禁止：

```text
应该完成
大概可以
基本好了
全部没问题
```

---

# 97. Definition of Structural Done

必须：

```text
[ ] current authority consistent
[ ] current reports consistent
[ ] full backend tests
[ ] package smoke
[ ] real HTTP
[ ] zero unauthorized runtime spill
[ ] docs/manifest path truth
[ ] language truth
[ ] branch residual classified
```

---

# 98. Definition of Frontend Done

必须：

```text
[ ] real TypeScript
[ ] strict typecheck
[ ] production build
[ ] browser E2E
[ ] packaged Workbench
[ ] typed contracts
[ ] no default raw JSON UX
[ ] design workflow visible
```

---

# 99. Definition of Product Slice Done

必须：

```text
[ ] Workbench
[ ] API
[ ] backend
[ ] persistence
[ ] result
[ ] readback
[ ] quality
[ ] failure path
[ ] evidence
```

适用 Host 的 Slice：

必须再加：

```text
[ ] real host
[ ] editable artifact
[ ] rollback/recovery
```

---

# 100. Definition of E3 Done

必须真实：

```text
Brief
→ workflow
→ host/tool
→ editable artifact
→ reopen/readback
→ failure
→ rollback/recovery
```

---

# 101. Definition of E4 Done

必须：

```text
real human/independent review
+
golden case
+
quality
+
rights
+
preflight
```

---

# 102. Definition of E5 Done

必须：

```text
exact SHA
release artifact
install
upgrade
recovery
repeat
```

历史 release 不算。

---

# 103. Main Merge 最低条件

对于当前 convergence：

```text
[ ] exact current candidate known
[ ] CI required checks green
[ ] Python full suite green
[ ] package smoke
[ ] real HTTP preflight
[ ] current authority truth
[ ] no known P0 code defect
[ ] reports not materially stale
[ ] user authorizes merge
```

---

# 104. 产品阶段完成条件

即使 structural merge 完成：

仍不能写：

```text
DESIGN-LAB complete
```

直到：

```text
Workbench
+
Backend Design Workflow
+
Host
+
Jury
+
Handoff
```

形成真实闭环。

---

# 105. 最终目标状态

最终仓库应该表现为：

```text
DESIGN-LAB

Professional Workbench
        │
        ▼
Design Intelligence
        │
        ▼
Design Objects / Contracts
        │
        ▼
Python Runtime
        │
        ▼
Host / Generator Adapters
        │
        ▼
Editable Artifacts
        │
        ▼
Readback / Versions
        │
        ▼
Quality / Human Jury
        │
        ▼
Rights / Preflight
        │
        ▼
Handoff / Provenance
```

而不是：

```text
大量 TaskPack
大量 verifier
大量 report
大量 registry
但用户没有真正的软件可用
```

---

# 106. 第一执行批

按顺序：

### Batch A

`DL-UCR-000`

重新冻结 latest SHA / CI / PR / branch / authority。

### Batch B

并行：

```text
DL-UCR-012 FA-03
DL-UCR-013 FA-05
DL-UCR-014 FA-11
ARCHITECTURE truth
MANIFEST path/version truth
LANGUAGE/Ruff truth
```

### Batch C

same-candidate：

```text
full tests
wheel
HTTP
authority
reports
```

### Batch D

若用户授权：

```text
PR #116 merge
```

### Batch E

从最新 main 新建产品 convergence 工作分支。

开始：

```text
Workbench strict TS
+
Frontend Gate
+
Design Object APIs
```

---

# 107. 第二执行批

做第一个真正产品 Vertical Slice：

```text
Project
→ Brief
→ Reference
→ Direction
→ DesignSystem
```

Frontend + Backend 一起完成。

---

# 108. 第三执行批

```text
DesignSystem
→ DesignIR
→ Photoshop / Illustrator
→ Readback
→ Patch
```

---

# 109. 第四执行批

```text
Quality
→ Critique
→ Human Jury
→ Revision
```

---

# 110. 第五执行批

```text
Rights
→ Preflight
→ Handoff
```

---

# 111. 第六执行批

Golden：

```text
DESIGN-LAB Workbench self-redesign
Professional Poster/Brand workflow
```

---

# 112. 第七执行批

扩展：

```text
Video
Audio
3D
Motion
Other Hosts
```

只在核心闭环稳定以后。

---

# 113. 明确禁止

本任务包禁止以下行为：

```text
重做 DESIGN-LAB 定位
再建治理系统
重做第二 Runtime
为了整洁全仓大搬家
Rust 全仓迁移
C# / Avalonia 重写
React/Vue 无需求引入
Electron/Tauri 无需求引入
把 Workbench 做第二 Photoshop
把 Open Design 做项目核心 Runtime
把 WORK-LAB / ArcheAxis 放进当前热路径
把 Comfy/H3 做全项目硬前置
整支 merge 旧 R4 / migration / UXP branch
用静态 PASS 冒充 E3
用模型评分冒充 Human Jury
按分支 ahead 数量判断缺失能力
按文件名删除外溢数据
直接 merge/delete/release
```

---

# 114. 不允许丢失的历史能力清单

以下历史 scope 即使本任务包未逐条展开原任务文字，也必须继续保留：

```text
Standalone-first
13 Core Objects
Design IR
Domain Packs
DesignContext
ChangeSet
DesignDiff
Adapter SPI
Design Control MCP
Local Runtime
Operation / Attempt
SQLite single truth
Lease fencing
Approval
HostSession
DocumentSession
ProcessSupervisor
Portable workspace
Evidence E0-E5
ProfileResolver
AssetRef / Trait
OTIO
NativeTransaction
Audit / Trace
Rights
Source lock
SBOM
Model lock
Photoshop
Illustrator
Corel
Open Design
Figma
Penpot/OpenPencil
ComfyUI
H3
FFmpeg
Audio
Video
3D
Visual Quality
Anti AI-slop
Human Jury
Production Preflight
Editable Handoff
Provenance
Rollback
KnowledgeCandidate
MiniGame visual fixture boundary
REUSE-FIRST
Repository slimming
Zero spill
Branch semantic convergence
```

任何执行 Agent 若认为其中某项“不需要”：

必须出：

```text
SUPERSESSION decision
+
replacement
+
evidence
```

不能静默删除。

---

# 115. TaskPack Closeout

只有完成：

```text
structural convergence
+
repository truth
+
language truth
+
frontend product
+
backend design workflow
+
real vertical slices
+
quality/human gate
+
handoff
```

才能关闭本任务包。

Closeout 必须提供：

```text
final main SHA
task state
issue state
branch state
frontend state
backend state
host state
E0-E5 matrix
golden cases
remaining deferred items
release state
rollback point
```

---

# 116. 最终反漂移声明

以后任何 Agent 接手 DESIGN-LAB，第一件事不是“重新规划项目”。

第一件事必须是：

```text
read AGENTS
read current Authority
read this taskpack
read current ledger
read current exact SHA
read current CI
read current issue registry
```

然后只做：

```text
DELTA
```

不得再从历史文档中抽出旧架构重新启动一轮迁移。

不得因为某个旧 TaskPack 写得更详细，就让它恢复为 current。

不得因为某个新模型提出了更“漂亮”的架构，就无证据推翻已经稳定的边界。

DESIGN-LAB 后续开发只有一个方向：

> **减少治理摩擦，把已经建设的大量后端设计能力真正通过 Workbench 交给用户，并连接真实专业 Host、质量判断和可编辑交付，尽快形成可以实际使用的职业设计闭环。**

**END — `DL-TP-20260918-UNIFIED-CONVERGENCE-R1`**