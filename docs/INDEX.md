# 仓库目录分类与归档索引（REPO INDEX）

生成方式：目录事实来自 `scripts/classify_repo.py`（由 `git ls-files` / `git ls-tree` 派生，
不是手抄），产物为 `reports/current/REPO-CLASSIFICATION.json`。
本文件解释**分类规则与放置约定**；数字以 JSON 为准。

```
python scripts/classify_repo.py          # 再生
python scripts/classify_repo.py --check  # 只读校验：派生事实与已提交件是否漂移
```

观测 commit 与体量（由上表再生时的真实测量）：
**跟踪文件 3369 个 · 工作区 60.37 MiB · pack 242.0 MiB**（`observedCommit f1f96a37`，
再生于 2026-10-08T19:33Z）。工作区体积此前被低估：`blob_sizes()` 用 `git ls-tree HEAD` 按行读，
非 ASCII 路径被转义后查不到键（11 个文件记成 0 字节），未提交的新文件更整体记成 0——
同一棵树先后测出 52.28 与 60.22 MiB 而文件数不变。现改从 index + 对象库取，且 blob 读不到即 fail-closed。

---

## 1. 权威脊线（读取顺序，唯一）

| 层 | 路径 | 类别 |
|---|---|---|
| 顶层权威 | `AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`） | authority |
| 权威索引 | `.project/governance/authority-index.json` | authority |
| 根执行规则 | `AGENTS.md` | authority |
| 当前任务包 | `docs/taskpacks/DESIGN-LAB-FINAL-AUTHORITY-CONVERGENCE-TASKPACK-2026-09-18.md` | planning |
| 唯一可变账本 | `design-lab/config/task-ledger-r3.json` | planning |
| 任务文档定态登记 | `design-lab/config/task-document-states.json` | authority |
| 外部卷导入台账 | `docs/history/record-imports-2026-10-08/RECORD-IMPORT-MANIFEST.md` | history |
| 当前投影 | `reports/current/`（生成器产物，非真值来源） | generated |
| 本机外置根 | `.project/paths.json` · `docs/LOCAL_ENVIRONMENT.md` | authority |

`scripts/verify_path_refs.py` 会 fail-closed 检查 `AUTHORITY.md` / `AGENTS.md` 里每一条路径
引用在盘上真实存在。**因此任何目录搬迁都必须同步改这两份权威文件，否则门红。**

定态登记由 `design-lab/scripts/verify_task_document_states.py` 把关（已入聚合链）：
它从属于 `authority-index`，与其不一致即红，且要求规划/历史面上**每个 tracked 任务文档都有声明**、
派工入口恰好一个、导入件不得自称 CURRENT、被 SHA-256 钉死的四件必须登记为 frozen。

## 2. 分类规则（`classify_repo.py` 里的有序前缀表）

| 类别 | 含义 | 现量（`f1f96a37` 实测） |
|---|---|---|
| `authority` | 顶层权威、治理索引、决策与架构政策 | 10 files / 0.03 MiB / 3 bundles |
| `planning` | 任务包与任务账本 | 见 §3 |
| `evidence` | 审计包、黄金用例、域 fixture、评估语料、设计项目产物 | 1184 files / 26.94 MiB |
| `history` | 冻结历史、交接血统、历史进度账本（含 Record 导入件） | 497 files / 14.85 MiB |
| `generated` | 当前状态投影、提交的构建产物 | 71 files / 1.23 MiB |
| `source` | 产品源码、能力包、集成层、门脚本、测试、CI | 1463 files / 11.82 MiB |
| `documentation` | 其余文档 | 119 files / 5.26 MiB |
| `repo-meta` | 根级运维/政策文档（README、SECURITY、RELEASE、DESIGN.md、design.qa.yaml 等 25 个） | 0.24 MiB |

## 3. 规划件的当前/历史判定

`docs/taskpacks/` 共 24 个跟踪文件，**只有 1 个是当前派工入口**（§1 所列）。
逐文件的定态（CURRENT / SUPERSEDED / HISTORICAL / NON_AUTHORITATIVE / REFERENCE /
REQUESTED / FROZEN，外加依据与取代对象）不再靠猜：登记在
`design-lab/config/task-document-states.json`，由 `design-lab/scripts/verify_task_document_states.py`
检查"每个跟踪任务文档都有声明"。旧任务 ID 必须先经 `authority-index` / crosswalk 映射才可执行。

已受理但**尚未采纳为 Authority** 的 REQUESTED 面（当前入口仍是 §1 的 2026-09-18 包）：
`docs/taskpacks/DESIGN-LAB-GLOBAL-DESIGN-CAPABILITY-INTELLIGENCE-TASKPACK-2026-10-06.md` 与
2026-10-06 权威修复对（`docs/taskpacks/03_DESIGN-LAB_权威修复_双端描述同步_可审计执行提示词_20261006.txt`
+ 其输入 `docs/taskpacks/03_DESIGN-LAB_完整项目描述与未来蓝图_20261006.docx`）。
待 owner 裁决的项在登记表里逐条写明 `ownerActionPending`。

外部 Record 卷的 DESIGN-LAB 任务文档与包已于 2026-10-08 归档进
`docs/history/record-imports-2026-10-08/`（259 个文件 / 7,735,797 字节；R4.1、REAUDIT-09-14、
R2 发布包原件、CODEX-09-22、2026-09-29 MASTER ATLAS 汇总包、UI-FRONTEND-09-30、
研究生态汇总包的 DESIGN-LAB 子包、B00/B07/B08/B09/B10 批次）。
逐条源路径/字节/sha256/crc32/目标/定态见同目录 `RECORD-IMPORT-MANIFEST.md`（同名 `.json` 为机器面）；
复跑 `scripts/record_import_apply.py` 得同一张表（对 HEAD 幂等），
复验 `scripts/record_import_verify.py --head` 做 源字节↔工作区↔已提交 blob 三方比对。
2026-09-08 R5 包与 2026-09-28 能力闭环包的成员经 CRC32 证明早已逐字节在仓内，因此**只登记映射不重复写字节**；
B01–B06 图片包 44,183,932 字节受本仓体积门约束留在源卷，逐成员哈希登记为 EXTERNAL-ONLY。

`docs/current/`（5 个）是产品与路线图定义；`reports/current/`（63 个）是**机器投影**，
两者不可混用：投影可被再生，定义需人裁决。

`REQUESTED` 面对应的机器可读骨架在
`design-lab/schemas/candidate-taxonomy.schema.json` + `research/candidates/CANDIDATE-TAXONOMY.json`，
并由 `design-lab/scripts/verify_candidate_taxonomy.py` 把「未测轴必须为 null、评分必须有
evidenceRef、parentRepoStars 不得冒充自身、无许可不得越过 QUARANTINE、代理不得自签 reviewedBy」
变成 CI 门——导入件的二进制 sidecar 同样把 `reviewedBy` 留空待 owner 签（见 §6）。

第三方候选的登记位置是 `research/candidates/`（CONDITIONAL_POC 索引区，源码只在
`.project-local/cache/vendor/<id>`，不进 Git）；已人工复核的源在
`design-lab/research/global-absorption/SOURCE_REGISTRY.json`（v3，`reviewedBy` 为人工责任字段）。

## 4. 证据区（禁止「整理式删除」）

| 位置 | 文件数 | 说明 |
|---|---|---|
| `docs/audits/` | 834 | 其中 784 个属于 `DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/` 一个包 |
| `docs/history/record-imports-2026-10-08/` | 259 | Record 卷导入的冻结任务包与批次材料（11,196,550 B 含同目录其余历史件） |
| `docs/UI-CONVERGENCE-20260930/` | 93 | UI 收口：40 张截图 + 40 个 `.license` sidecar + manifest + 审计前后报告 |
| `fixtures/` | 226 | 域 fixture（`game-visual` 被 clean-tree 门钉住） |
| `docs/projects/` | 19 | 真实设计项目产物（6.66 MiB，本仓最大单目录产物面） |
| `docs/golden-cases/` | 11 | 黄金用例 |
| `reports/history/` | 95 | 冻结历史账本 |

## 5. 体积：能减的和不能减的（实测归因）

```
pack 242.0 MiB  −  工作区 60.37 MiB  ≈  181.6 MiB 全部是历史对象
```

按路径前缀对**全体历史 blob** 归因（下表为 2026-10-06 那次全历史归因，本轮未重算；
本轮可测增量为 pack +1.76 MiB、工作区 +7.94 MiB，全部来自 §3 的 Record 导入；
2026-10-09 的外部审计轮再加 5 个文件、工作区 +0.08 MiB，见 `docs/audits/DESIGNLAB-EXTERNAL-DESIGN-REVIEW-2026-10-09.md`）：

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
   （当前 242.0 MiB → WARN，余量 14.0 MiB）。重复提交大二进制的面是截图与 fixture；sidecar 与 manifest
   已绑定 exact commit，重拍一轮就会新增 40 个 blob。**新增大文件前先看它属于哪一类，
   并能被清单绑定证据链，否则进 `.project-local/`（gitignored）而不是进仓。**
   任务 #29 就是这么处置的：Record 卷里 44,183,932 字节的 B01–B06 图片包**没有**进仓
   （容器超单文件 5 MiB 上限，且解出面会顶穿 256 MiB 硬预算），改为逐成员登记
   名称+大小+CRC32+sha256 的外链行；同理 ≥256 KiB 的二进制必须先有
   `design-lab/config/large-assets.json` 里带理由的 bundle 声明，`docs/audits/` 那一格
   预算只有 2.0 MiB，塞不进就按上面这条走 gitignored 证据根，而不是抬高阈值。

`git gc` / repack 只整理本地对象（当前 loose 395 个 / 5.93 MiB），对远端体积无影响。

## 6. 放置约定（今后新增东西去哪）

| 你要放的是 | 放这里 | 不要放 |
|---|---|---|
| 权威裁决、政策、ADR | `AUTHORITY.md` 索引所指 · `docs/decisions/` · `docs/architecture/` | 根级散落新 .md |
| 派工入口 | `docs/taskpacks/`（且**只能有一个 current**）+ 账本 `design-lab/config/task-ledger-r3.json` | 第二套 ledger / 会话内台账 |
| 审计/验收证据 | `docs/audits/<包名-日期>/`，二进制必须配 `.license` sidecar 与 manifest | `reports/`、`docs/current/` |
| 状态投影 | `reports/current/`，且必须由生成器写出、可 `--check` | 手写「当前状态」 |
| 冻结历史 | `docs/history/` 或 `reports/history/`，逐字节冻结、不改写 | 原地更新历史文件 |
| 外部卷导入的冻结原件 | `docs/history/record-imports-<日期>/<包名>/`；逐成员清单（源路径/字节/sha256/crc32/目标/定态）随件入库；二进制配 `design-lab/asset-sidecar/v1` 且 `reviewedBy` 留空待 owner 签；`.gitattributes` 对该子树 `-text`，禁止行尾改写 | 抬高体积阈值 / 为过门而重命名或重排原件 |
| 装不下的原件（超单文件 5 MiB 或会顶穿 pack 256 MiB 硬预算） | 留在源卷，逐成员登记 名称+大小+CRC32+sha256 的外链行；运行期副本进 `.project-local/` | 为「全部归档」写进仓里把门做红 |
| 运行期/缓存/大中间件 | `.project-local/`（PROJECT_LOCAL_ROOT） | 仓内任何目录 |
| 构建产物 | `apps/workbench/build/`（受 Build Output Truth 门钉） | 仓外未提交副本 |
| 设计契约的存量数字 | `DESIGN.md` §4 的文本必须逐字等于 `scripts/design_debt_baseline.py` 量出来的那句（`design-lab/tests/test_design_debt_baseline.py` 在 CI 看守）；逐站点色值登记在 `design-lab/config/ui-off-palette-colours.json`，其 `adjudication` 只允许人填，脚本重写必须保留 | 手点的「大概多少处」；代理替 owner 填裁决 |
| 外部审查工具的入仓面 | 配置 `design.qa.yaml` + 驱动 `scripts/run_design_review_plugin.py`（插件在 `~/.qoder-cn/plugins`，仓内不复制它） | 把第三方插件源码 vendored 进仓 |
| 外部审查工具的产物 | `.project-local/runs/design-review/`（原始 JSON）与 `.project-local/task-artifacts/design-review/plugin-run.json`（运行台账：commit/版本/端口）；结论写进 `docs/audits/` | 把每次跑出的 JSON 提交进仓（体积与噪声） |

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
- **2026-10-08 更新（任务 DL-REC-29）**：上面"批量归档被三件事卡住"的约束**逐条仍然成立**，
  但定态这件事已经不需要搬迁了——`design-lab/config/task-document-states.json` 用逐文件声明
  取代"靠目录形状表达状态"，被钉的四份权威文件字节未动（`verify_top_level_authority.py` 仍 PASS）。
  同轮把外部 Record 卷的 DESIGN-LAB 任务包落到 `docs/history/record-imports-2026-10-08/`：
  该前缀在 `verify_asset_governance.py` 的 `SKIPPED_PREFIXES` 里，是仓库自己定的"冻结历史面豁免"，
  不是我为过门找的出口——导入件的 sidecar 照写，并且把"门若在此处审会报什么"原样登记在
  `RECORD-IMPORT-MANIFEST.md`（`reviewedBy`/`approvedBy` 留空等 owner 签，代理不自签）。
- **本轮修掉的两个 git porcelain 解析缺陷**（都不是断言问题，是读法问题）：
  `verify_asset_governance.py` 按行读 `git ls-files`，被转义的中文路径当成不存在（6 个真文件报
  "cannot stat"，且这些路径完全绕过体积核算）；`classify_repo.py` 的 `blob_sizes()` 从
  `git ls-tree HEAD` 取值，同一棵树先后测出 52.28 / 60.22 MiB——11 个非 ASCII 文件记成 0 字节，
  未提交的新文件整体记成 0。两处都改成 `-z`（唯一不加引号的 porcelain），后者并改为从 index +
  对象库取数且 blob 读不到即 fail-closed，与 `verify_asset_governance.tracked_blob_sizes()` 同法。
