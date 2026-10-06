# 仓库目录分类与归档索引（REPO INDEX）

生成方式：目录事实来自 `scripts/classify_repo.py`（由 `git ls-files` / `git ls-tree` 派生，
不是手抄），产物为 `reports/current/REPO-CLASSIFICATION.json`。
本文件解释**分类规则与放置约定**；数字以 JSON 为准。

```
python scripts/classify_repo.py          # 再生
python scripts/classify_repo.py --check  # 只读校验：派生事实与已提交件是否漂移
```

观测 commit 与体量（由上表再生时的真实测量）：
**跟踪文件 2913 个 · 工作区 44.78 MiB · pack 223.82 MiB**。

---

## 1. 权威脊线（读取顺序，唯一）

| 层 | 路径 | 类别 |
|---|---|---|
| 顶层权威 | `AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`） | authority |
| 权威索引 | `.project/governance/authority-index.json` | authority |
| 根执行规则 | `AGENTS.md` | authority |
| 当前任务包 | `docs/taskpacks/DESIGN-LAB-FINAL-AUTHORITY-CONVERGENCE-TASKPACK-2026-09-18.md` | planning |
| 唯一可变账本 | `design-lab/config/task-ledger-r3.json` | planning |
| 当前投影 | `reports/current/`（生成器产物，非真值来源） | generated |
| 本机外置根 | `.project/paths.json` · `docs/LOCAL_ENVIRONMENT.md` | authority |

`scripts/verify_path_refs.py` 会 fail-closed 检查 `AUTHORITY.md` / `AGENTS.md` 里每一条路径
引用在盘上真实存在。**因此任何目录搬迁都必须同步改这两份权威文件，否则门红。**

## 2. 分类规则（`classify_repo.py` 里的有序前缀表）

| 类别 | 含义 | 现量 |
|---|---|---|
| `authority` | 顶层权威、治理索引、决策与架构政策 | 10 files / 3 bundles |
| `planning` | 任务包与任务账本 | 见 §3 |
| `evidence` | 审计包、黄金用例、域 fixture、评估语料、设计项目产物 | 1147 files / 26.35 MiB |
| `history` | 冻结历史、交接血统、历史进度账本 | 234 files / 7.03 MiB |
| `generated` | 当前状态投影、提交的构建产物 | 83 files / 1.43 MiB |
| `source` | 产品源码、能力包、集成层、门脚本、测试、CI | 1306 files / 8.76 MiB |
| `documentation` | 其余文档 | 110 files |
| `repo-meta` | 根级运维/政策文档（README、SECURITY、RELEASE 等 22 个） | 0.22 MiB |

## 3. 规划件的当前/历史判定

`docs/taskpacks/` 共 20 个文件，**只有 1 个是当前派工入口**（§1 所列）。
其余 19 个是 superseded 血统或多模态/迁移/拆分手offs，保留只为可追溯性，
不得作为派工入口 —— 冻结与引用规则见 `docs/current/HISTORY-FREEZE-RULES.md`。
旧任务 ID 必须先经 `authority-index` / crosswalk 映射才可执行。

`docs/current/`（5 个）是产品与路线图定义；`reports/current/`（62 个）是**机器投影**，
两者不可混用：投影可被再生，定义需人裁决。

已受理但**尚未采纳为 Authority** 的请求包：`docs/taskpacks/DESIGN-LAB-GLOBAL-DESIGN-CAPABILITY-INTELLIGENCE-TASKPACK-2026-10-06.md`
（`REQUESTED`；当前派工入口仍是 §1 的 2026-09-18 包）。它对应的机器可读骨架在
`design-lab/schemas/candidate-taxonomy.schema.json` + `research/candidates/CANDIDATE-TAXONOMY.json`，
并由 `design-lab/scripts/verify_candidate_taxonomy.py` 把「未测轴必须为 null、评分必须有
evidenceRef、parentRepoStars 不得冒充自身、无许可不得越过 QUARANTINE、代理不得自签 reviewedBy」
变成 CI 门。

第三方候选的登记位置是 `research/candidates/`（CONDITIONAL_POC 索引区，源码只在
`.project-local/cache/vendor/<id>`，不进 Git）；已人工复核的源在
`design-lab/research/global-absorption/SOURCE_REGISTRY.json`（v3，`reviewedBy` 为人工责任字段）。

## 4. 证据区（禁止「整理式删除」）

| 位置 | 文件数 | 说明 |
|---|---|---|
| `docs/audits/` | 798 | 其中 784 个属于 `DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/` 一个包 |
| `docs/UI-CONVERGENCE-20260930/` | 93 | UI 收口：40 张截图 + 40 个 `.license` sidecar + manifest + 审计前后报告 |
| `fixtures/` | 226 | 域 fixture（`game-visual` 被 clean-tree 门钉住） |
| `docs/projects/` | 19 | 真实设计项目产物（6.66 MiB，本仓最大单目录产物面） |
| `docs/golden-cases/` | 11 | 黄金用例 |
| `reports/history/` | 95 | 冻结历史账本 |

## 5. 体积：能减的和不能减的（实测归因）

```
pack 223.82 MiB  −  工作区 44.78 MiB  ≈  179 MiB 全部是历史对象
```

按路径前缀对**全体历史 blob** 归因：

| 前缀 | 历史字节 |
|---|---|
| `minigame-runtime/`（**当前树里已不存在**） | **182.1 MiB / 326 blobs** |
| `docs/` | 32.7 MiB |
| `research/` | 31.9 MiB |
| `design-lab/` | 27.9 MiB |
| `reports/` | 17.3 MiB |
| `fixtures/` · `apps/` | 7.7 · 5.8 MiB |

那 182 MiB 是 8–12 MiB 的 CCTV 场景 GIF 等，**只经 `archive-evidence/2026-09-25/*` 与
`superseded-tip/*` 这些 tag 可达**——即它们是**被刻意保留的证据归档**，不是垃圾。

由此得出三条硬结论：

1. **目录规范化不会缩小 pack。** Git 的 blob 按内容寻址，`git mv` 只新增极小的 tree 对象；
   历史体积与目录形状无关。
2. **不动历史就没有 179 MiB 的回收空间。** 要回收必须删 tag + `git filter-repo` 重写 + 强推，
   这会破坏 `archive-evidence` 证据并影响所有克隆。本轮**未做**，且按现行规则（禁止删证据、
   禁止 force push）也不应由代理执行。
3. **能立刻做的是止血**：`verify_asset_governance.py` 已在 220 MiB 告警 / 256 MiB 硬预算
   （当前 223.8 MiB → WARN）。重复提交大二进制的面是截图与 fixture；sidecar 与 manifest
   已绑定 exact commit，重拍一轮就会新增 40 个 blob。**新增大文件前先看它属于哪一类，
   并能被清单绑定证据链，否则进 `.project-local/`（gitignored）而不是进仓。**

`git gc` / repack 只整理本地对象（当前 loose 395 个 / 5.93 MiB），对远端体积无影响。

## 6. 放置约定（今后新增东西去哪）

| 你要放的是 | 放这里 | 不要放 |
|---|---|---|
| 权威裁决、政策、ADR | `AUTHORITY.md` 索引所指 · `docs/decisions/` · `docs/architecture/` | 根级散落新 .md |
| 派工入口 | `docs/taskpacks/`（且**只能有一个 current**）+ 账本 `design-lab/config/task-ledger-r3.json` | 第二套 ledger / 会话内台账 |
| 审计/验收证据 | `docs/audits/<包名-日期>/`，二进制必须配 `.license` sidecar 与 manifest | `reports/`、`docs/current/` |
| 状态投影 | `reports/current/`，且必须由生成器写出、可 `--check` | 手写「当前状态」 |
| 冻结历史 | `docs/history/` 或 `reports/history/`，逐字节冻结、不改写 | 原地更新历史文件 |
| 运行期/缓存/大中间件 | `.project-local/`（PROJECT_LOCAL_ROOT） | 仓内任何目录 |
| 构建产物 | `apps/workbench/build/`（受 Build Output Truth 门钉） | 仓外未提交副本 |

## 7. 结构债（记录，不在本轮擅动）

- **批量归档被三件事同时卡住**（核查结果，不是偏好）：
  1. `scripts/verify_top_level_authority.py` 的 R2 释放完整性把
     `AUTHORITY.md`、`.project/governance/authority-index.json`、
     `docs/current/HISTORY-FREEZE-RULES.md` 与当前任务包**按 SHA-256 逐字节钉死**；
  2. `.project/governance/authority-index.json`（被钉）引用
     `docs/taskpacks/DESIGN-LAB-DEEPSEEK-AUTHORITY-TASKPACK-2026-09-14.md`——
     该文件一旦搬迁，被钉索引里出现死链；改索引又破坏被钉哈希；
  3. 其余 5 个 superseded 任务包只被 `AGENTS.md`（未钉）引用，可搬——
     但只搬 5 个、留下 1 个搬不了，等于把一个已按「家族」冻结的集合拆成两种形状，
     可读性反而下降。
  `HISTORY-FREEZE-RULES.md` 的口径是：superseded taskpacks **已按状态冻结**，
  并禁止 mass-delete；物理搬迁前必须先确认 replacement / callers /
  history preservation / link update。上面第 2 条正是「link update 无法完成」。
  **因此本轮以派生索引完成分类，不做物理搬迁。**
- **两个分叉头**：`feat/ui-commercial-workbench-20260930`（PR #213）与
  `qoder/designlab-m1-closeout-20261005`（PR #214）各自从 `main` 分叉（merge-base `1acbfa15`，
  彼此 10 / 28 提交互不含）。在任一分支合入前做全仓重命名，会让两边冲突不可解；
  合并顺序归 owner，之后再谈搬迁。
- `WORK-LAB-DESIGN-MODULE-FINAL-HANDOFF-2026-08-07.md` 留在根级：
  `docs/history/project-memory-history/V4_MIGRATION_FINAL_STATE.md` 以「该文件在根级」为
  历史记录内容引用它，搬走会让那条历史记录失真。属可信度优先于整齐的例子。
- `docs/superpowers/`、`docs/research/`、`docs/golden-cases/` 与 `design-lab/research/`
  存在主题重叠；等两个头合并后统一收口。
