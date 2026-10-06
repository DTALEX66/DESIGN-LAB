# T1 账本逐任务复核 · 第二项：DL-R5-002

**复核对象**：`design-lab/config/task-ledger-r3.json` → `DL-R5-002`「仓库路径规范与旧运行根治理」
**观测 exact SHA**：`main` = `ba38204326`（`gh api commits/main` 实读；本分支基点）
**观察窗口**：2026-10-06T17:36Z–17:38Z
**结论**：A1 结构上成立但**当期无法出具完整认证**；A2 未核；A3 成立。**四轴不抬升。**

| 轴 | 现状 | 证据 |
|---|---|---|
| `implementation` | PARTIAL | `r5-runtime-root-boundary-live-20260927` |
| `unit` | PARTIAL | `r5-002-static-unit-20260928` |
| `host_live` | PARTIAL（required_axes 内，**证据为空**） | — |
| `delivery` | PARTIAL（不在 required_axes 内） | — |

---

## A1「已安装 Agent、CLI、UI、Adobe 入口无新增项目数据写入 `.hermes`」

**代码面成立**：全仓 `.hermes` 的**非文档**引用只有 4 处，全部是**排除列表**（扫描时跳过该目录），
没有任何写入方：

| 文件:行 | 用途 |
|---|---|
| `design-lab/scripts/verify_identity_gate.py:43,51` | `EXCLUDED_NAMES` / 前缀排除 |
| `design-lab/scripts/verify_product_manifest_v3.py:181,324` | 根相对前缀排除 |
| `design-lab/scripts/verify_visual_quality_v21.py:57,64` | 同上 |

策略面也有登记：`.project/governance/path-risk.yaml:6` 把 `.hermes/` 列为风险路径。
`AGENTS.md` 与 `AUTHORITY.md` §7 均声明 `.hermes` 不是活跃写入根。

**但当期认证拿不到。** 直接跑零外溢守卫：

```
python scripts/verify_zero_spill.py --self-test
  → ZERO_SPILL_SNAPSHOT=... repo_entries=9662 repo_complete=False agent_entries=19962 external_roots=0
  → task under test: generate_current_reports.py --check exit=0
  → ZERO_SPILL=INCOMPLETE spill=0 repo_new=1 repo_changed=1
     incomplete_roots=['agent:.codex', 'agent:.dsh', 'repo', 'repo-current']   exit=2
```

要点：

1. `spill=0` —— 在被扫到的范围内确实没有新外溢。
2. **`external_roots=0` 且 `repo_complete=False`** —— 外置根与 agent 根没有绑定进来，
   所以守卫**拒绝给 PASS，返回 `INCOMPLETE` 且 exit 2**。这是 fail-closed 在正确工作，
   不是门的缺陷。
3. `repo_new=1 repo_changed=1` 是自检自身的产物
   （`.project-local/task-artifacts/zero-spill/self-test-*.json`），属自指噪声，不是被测命令写出去的。

**因此 A1 的准确判定是**：写入方为零（结构证据，E1），但"无新增外溢"的**运行态认证在本机当前
配置下不可得**。根因与工具链审计的"有但未绑定"同源：**外置根存在却没登记给零外溢守卫**。
这条在绑定完成前不能升 `PASS`。

## A2「旧数据 hash 对应」— **本次未核**

`docs/history/DESIGN-LAB-HISTORY-EVIDENCE-MANIFEST-2026-09-04.csv` 与
`DESIGN-LAB-HISTORY-TASK-ID-CROSSWALK-2026-09-04.csv`（1451 行、含 `source_sha256` / `context_sha256` 列）
承载旧数据哈希。逐条复核需要独立一轮，本文**不声称已做**。

## A3「历史引用保留且不作为执行指令」— 成立

`docs/taskpacks/*.md` 中带 `SUPERSEDED` / `HISTORICAL` 标记的文件 **13** 个；
`.project/governance/authority-index.json` 用 `historicalGlobs` + `historicalSpecific` +
`taskpackClassificationRule` 给出机器可读分类，`nonAuthoritativeKinds` 显式列出
`HANDOFF_SUMMARY` / `BRANCH_NAME` / `COMMIT_COUNT` 等。历史不是被删掉，而是被标成不可执行——
这正是该条 acceptance 要的语义。

---

## 为什么仍然不抬升任何轴

1. **A1 缺当期运行态认证**，且缺的原因（外置根未绑定）本身是可修的具体缺口，不是"再等等"。
2. **A2 未核**。三条 acceptance 里有一条完全没验，抬升就是无证据抬升。
3. `host_live` 在 `required_axes` 内且**证据为空**；本任务三条 acceptance 都不涉及真实宿主，
   所以该轴为空是自洽的，但不得被读成已验证。
4. 本会话**没有在当前 SHA 重跑套件**；仓内 `Ran 1807 — OK` 属于 `28667300`，是前一会话观测。

## 抬升 DL-R5-002 的最小充分动作

1. 把外置根绑定给零外溢守卫，使 `external_roots > 0` 且 `repo_complete=True`，
   重跑得 `ZERO_SPILL=PASS`（这是 A1 缺的那一块，也是唯一需要动手的一块）。
2. 逐条复核 A2 的两份 CSV 哈希。
3. 在合并后的 exact main SHA 上重跑套件，取 `commands_and_exit_codes` + `environment_versions`。
4. 新证据的 `artifact_hashes` **只绑 tracked 路径**。
