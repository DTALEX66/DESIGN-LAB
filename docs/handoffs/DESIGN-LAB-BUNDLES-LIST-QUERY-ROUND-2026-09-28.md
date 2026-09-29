# HANDOFF —— bundle / 交付列表查询层（2026-09-28 本轮）

> **本文件不是顶层权威。** 顶层权威 = `/AUTHORITY.md`（`DL-AUTHORITY-2026-09-18-R2`）。
> Handoff 不覆盖 Authority。执行入口 =
> `docs/taskpacks/DESIGN-LAB-FINAL-AUTHORITY-CONVERGENCE-TASKPACK-2026-09-18.md`。
> 本文件是**本轮切片**的交接记录，前序轮次见
> `docs/handoffs/DESIGN-LAB-UIKIT-CONFORMANCE-ROUND-2026-09-28.md`（含 HISTORICAL 标记）。

**Evidence 等级：E2 `CONTROLLED_RUNTIME`**（合成 fixture + 真实 sqlite 读回）。
**未达到 E3/E4/E5。** 本文件不声称任何 E3+ 能力。

---

## 1. 摘要（本轮做了什么）

| 项 | 结果 |
|---|---|
| PR | **#205** |
| merge commit | **`b86c6da84ad94b50ca68c0cef9b85b627c1fbf47`** |
| 改动 | `src/design_lab/native_assets.py`（+`Bundles` 类）、`design-lab/tests/test_bundle_deliveries.py`（新增，5 测试）、`docs/audits/.../NEXT-ROUND-PLAN-BUNDLES-LIST.md`（前提更正） |
| 测试 | `Ran 5 tests ... OK` |
| 门禁 | VERIFY_DESIGN_LAB=OK total=56 failed=0；LICENSE_COVERAGE=OK；IDENTITY_GATE=OK；compileall clean |
| 必需 CI | **9/9 pass**（清单由 branch protection 实读，非推测） |
| main CI（`b86c6da`） | `Canonical Verify` **success**，failure_count=0 |

### 1.1 本轮真正的内容：一次被测试拦下的假交付

「最近交付」列表需要回答「我交付过什么」。原计划（已落仓的 `NEXT-ROUND-PLAN-BUNDLES-LIST.md`）
断言：交付 = `asset_kind='design-bundle'` 的资产。

**读源码核实后发现这是错的**，而且错得很隐蔽：

- asset 表有 CHECK 约束
  `asset_kind IN ('raster','vector','text','audio','video','blend','psd','ai','doc','other')`
  —— **`'design-bundle'` 根本不是合法值**；
- `native_bundles.py:73` 实际以 `asset_kind='other'` 注册，`asset_id='bundle-'+<native asset id>`；
- `native_bundles.py:89` 附近那个 `'design-bundle'` 字符串是**返回/语句标签，不是列值**；
- `native_delivery.py:43` 读**单条**交付用的正是 `asset_kind='other'` + 指定 `version_id`
  —— 是单资源查询，不是列表。

若照原计划先写服务、后补测试，会交付一个**永远返回空列表**的「最近交付」路由，
而代码读起来完全合理。**测试先行在这里阻止了一次假交付**（第一次运行即被 sqlite
`CHECK constraint failed` 拒绝）。

**已合入的正确谓词：**
`a.asset_kind='other' AND a.asset_id LIKE 'bundle-%'`

**必须区分的一对概念**（已写进代码注释与更正后的计划）：
DB **列值** = `'other'`；API **响应 `kind` 标签** = `'design-bundle'`。
把 `'design-bundle'` 放回 `WHERE` 就退化回上面的错误；放进响应才是对的。

### 1.2 测试覆盖（5 条，全部通过）

1. 空项目 → `{'bundles': []}`（**不是** 404）；
2. 未知项目 → `404 PROJECT_NOT_FOUND`（沿用其它读面的 fail-closed 规则）；
3. 只有 `bundle-` 前缀的 `other` 资产被返回 —— **raster 与不带前缀的 `native-…` 都必须缺席**
   （这一条才真正证明前缀过滤生效，而不是「把所有 `other` 资产倒出来」）；
4. 同资产更旧版本被 `SUPERSEDED` 时，最新 ACTIVE 版本胜出；
5. 另一个项目的 bundle 不能通过本项目读到。

写测试时还修掉两个真实 fixture 缺陷：asset 行必须每资产只插一次（`INSERT OR IGNORE`）；
`asset_version` 在 `(asset_id, content_sha256)` 上 UNIQUE，故每版本需不同摘要。

---

## 2. 遗留（本轮**明确未做**，不得算作已完成）

1. **HTTP 路由未实现** —— `Bundles` 类目前**没有任何路由**，服务与 UI 都到不了它，
   只有它的测试在调用它。计划第 3.2 节（`GET /api/projects/<32hex>/bundles`）**尚未落地**。
   **在完成这一步之前，不得声称「最近交付」可被用户读到。**
2. **前端「最近交付」面板未实现**（计划第 5 节）。harness **必须是新文件**
   （本会话已两次因改动已验证的 harness 而回滚）。
3. **D-6（`/assets` 语义）只解决了一半**：本轮证明了「交付」不必靠改 `/assets` 语义来取得，
   但 D-6 本身仍待 Owner 裁决。
4. W06 Token 写 API、W05 可纠正对象方案、DesignIR/RIR 映射、验收线 4
   （整图背景不能冒充可编辑重建）—— 均未开始。
5. W14 剩余项：axe、中文 IME、键盘遍历、拖放、离线、任务中断、缺字体、wheel 安装态、
   滚动平滑度、1000 资产索引；缩略图**裁剪模式**与全尺寸预览分离。
6. W02 原语（被 **D-3** 阻塞）；W01 X-1/X-2 决策就绪证据；W07/W15。

---

## 3. 阻塞（需要 Owner 或硬件，非工程努力可解）

| 阻塞 | 内容 |
|---|---|
| **13 项 Owner 决策pending** | `docs/audits/DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/OWNER-DECISION-REQUEST.md`：D-1、D-2、D-3、D-5、D-6、X-1～X-4、X-7、X-8 及交互合同若干。**D-3 直接阻塞 W02 原语**（建议 (a) 不自建组件库）。 |
| **E3/E4 硬件阻塞** | 真实宿主验收需要 Adobe 系硬件；`host_live` **1/28**、`delivery` **0/28**。**E3/E4/E5 未达成。** |
| 语言/权威映射 | 旧 `DL-*` id 必须经 authority-index/crosswalk 映射后才可执行。 |

---

## 4. 双端一致（本轮结束后实测）

| 检查 | 值 |
|---|---|
| local HEAD | `b86c6da84ad94b50ca68c0cef9b85b627c1fbf47` |
| origin/main | `b86c6da84ad94b50ca68c0cef9b85b627c1fbf47` |
| cloud main（GitHub API） | `b86c6da84ad94b50ca68c0cef9b85b627c1fbf47` |
| 当前分支 | `main` |
| 工作区 | clean |
| open PR | 0 |
| stash | 0 |
| worktree | 1 |
| `origin` 上 main ref | 1 |
| main CI（该 SHA） | `Canonical Verify` success，failure_count=0 |

**结论：三处 SHA 逐字节一致，工作区干净，无未推送、无悬挂 PR。**

---

## 5. 本轮新增纪律（失败换来的，勿再犯）

1. **绝不用 PowerShell 字符串拼接写源码/文档/提交信息。** 本轮又犯一次：
   `git commit -m "..."` 的提交信息里含 `"no deliveries"`，双引号提前终止了
   PowerShell 字符串，其余文本被当成 pathspec 传给 git →
   `error: pathspec ... did not match any file(s) known to git`，提交失败。
   **正确做法：用 `write` 工具写信息文件，再 `git commit -F <file>`。**（已用此法成功。）
2. **新能力放新文件**，已验证的 harness 绝不改动。
3. **先测后改**：本轮它拦下的不是笔误，而是一个「看起来对、永远返回空」的交付物。
4. **不假设谓词**：`asset_kind` 的合法取值要去读 CHECK 约束，不要从变量名/字符串字面量推断。
5. `gh pr checks --watch` 在**任意** check 失败时退出 1（含 advisory）。
   本轮据此误判「不能合并」；必需 check 清单必须从 branch protection 实读
   （本轮实读确认：`CI artifact proof (H001)` **不在**必需清单内，是 advisory/flaky）。

---

**END —— 本文件为交接记录，非权威；下一轮入口见计划第 3.2 / 5 节。**
