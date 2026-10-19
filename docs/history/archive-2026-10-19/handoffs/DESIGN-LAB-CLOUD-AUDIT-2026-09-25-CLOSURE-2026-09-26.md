# DESIGN-LAB 09-25 云审计闭环交接（#159–#162，2026-09-26）

> **性质**：本文件是 09-25 云审计（`DL-CLOUD-2026-09-25`）agent-authorized 结构层
> 修复的**收口交接**（记录 + 摘要 + 未决清单）。顶层权威始终是 `/AUTHORITY.md`
> （`DL-AUTHORITY-2026-09-18-R2`）；本文件不覆盖 Authority，只是执行账。
> 所有 SHA 为 squash 合入 main 后的落点。

## 0. 执行摘要（本轮做了什么）

用户授权边界（原文）："全部审计 全量修复 所有你遇到的问题 给你全部授权
全面完成未完成的任务，**不包括操作和自动化任务**。"

据此，09-25 审计 10 个 Prompt 中 agent-authorized 的结构/合同/CI/文档层
全部完成，4 个 PR 合入 main：

| PR | Prompt | 交付 | main 落点（SHA） |
|---|---|---|---|
| #159 | G | H001 415 根因修（artifact 下载腿 Accept） | `639176464fc8a3476a986b9dd5ead655503e20b9` |
| #160 | B | Tool Resolution Contract + 非批准执行路径门 | `c244d6ad443bb93627799fdf08a5095f17a91664` |
| #161 | F | Context Capsule + Session Receipt + 防失忆门 | `9c1e90f42c1ccc5a29303df0b19b0757b0307d87` |
| #162 | I | 五层 readiness 组合器（Quality→Jury→Rights→Preflight→Handoff） | `41f8ab63ba2540bfe27333a51e8eb3d769594660` |

每个 PR 合入前均 18/18 required CI 全绿；UNSTABLE 桶的非-required
H001 advisory lane 属 by-design（见 §2 #159）。终态：本地 = 远端
`41f8ab6`，仅 main 分支 + 5 个 `archive-evidence/2026-09-25/*` tag，
worktree clean。

## 1. 前置（09-25 已闭环、09-26 复核仍成立）

- 五维扫描（仓库规范/语言/分支/外溢数据/收口台账）：#149/#156/#157
  已全量执行；09-26 复核：`D:\tmp` 空树、`.project-local` ≈1.4 GB、
  分支 main-only、`DESIGN-LAB-FULL-SWEEP-CLOSE-OUT-LEDGER-2026-09-25.md`
  §6 各 gate PASS 记录与 main 一致。
- 09-25 F1（`docs/LOCAL_ENVIRONMENT.md` SUPERSEDED 指针）+ F2
  （locator 去硬编码）：#158 合入 `8c67eb6`。

## 2. 各 PR 细节与证据

### #159 — H001 / Prompt G（415 根因）
- **根因**：`api.github.com` artifacts zip 端点强制
  `Accept: application/vnd.github+json`；旧代码携带
  `application/octet-stream` → 415 "Must accept 'application/json'"。
  live 实证：octet-stream→415；JSON→200 + zip + sha256 与 API 一致。
- **改动**：`verify_ci_artifact_proof.py` / `verify_release_preflight.py`
  的 artifact 下载腿 Accept 改 JSON（release asset 腿 github.com/objects
  不受 415 影响，未动）；contract line 加 `gate=ADVISORY` 标记，
  proof record 落 `gate` 字段；workflow 注释文档化 advisory 与
  required-green 的隔离。
- **CI 实证**（真实 API 读回）：PASS lane `ARTIFACT_SECRET-HISTORY-REPORT=OK`
  bytes/sha256 一致 + `CI_ARTIFACT_PROOF=PASS gate=ADVISORY`；另一 lane
  的诚实 `RUN-SHA-MISMATCH` fail-closed 发现（不是 415、不是吞错）。
- **边界**：lane 晋升 H003（non-required→required）= owner 决定，
  本 PR 未做。

### #160 — Prompt B（路径漂移 + No-Download 门）
- `resolve_tool_locator.py`：通用 fail-closed 定位器，6 级策略
  （explicit→env→registry-metadata→PATH→canonical-root→fail closed）、
  五态（FOUND/VERIFIED/MISSING/AMBIGUOUS/BLOCKED）、别名去重、
  **observed-only**（version/sha256 只记录观察值，绝不虚构；未观察
  即 VERIFIED 的语义被显式禁止）。registry App Paths 层只读批准
  静态元数据（`registry-app-paths.json` 单一目录，非第二 paths SSOT）；
  活 Win32 查询仍 owner-gated。
- `verify_execution_path_gate.py`（B-C 门）：扫描执行路径里的
  toolchain-fetch token（curl/wget/Invoke-* 等），命中必须 pin 进
  `execution-path-allowlist.json`（每 pin 带 B-D 五元组 receipt）；
  新命中 = NEW-VIOLATION fail-closed，stale pin 同样失败。
  `install-authorization.schema.json`：安装授权 receipt 合同。
- 15 个 hermetic 测试；B4 门零命中（新文件 gate-clean）。
- **踩坑记录**：测试文件里的 STALE-PIN fixture 含 `"curl"` 字面量——
  本地跑门时该文件 untracked（`git ls-files` 不列）所以 PASS，
  CI 上 tracked → 第 7 命中文件未 pin → NEW-VIOLATION。教训：
  门扫描域以 `git ls-files` 为准，提交测试/新文件后必须在 tracked
  态重跑门。

### #161 — Prompt F（防失忆层）
- `context_capsule.py`：GENERATED CONTEXT（永不成为第二 authority），
  绑定 authority 链 + live main + current TaskPack 指针 + task-ledger +
  环境 hash；session receipt 只能按 hash 引用 capsule；STALE 上报、
  不静默续行；不可观察字段记 absent-with-reason。
- `verify_context_integrity.py`：capsule/receipt schema 校验 +
  current-TaskPack 指针校验 + **current-looking 历史文档检测器**
  （`docs/taskpacks/*`、`reports/history/**` 里带"唯一 current /
  当前任务包"类措辞而无 SUPERSEDED 标记 = FAIL——即 F1 失忆根因
  的 CI 固化）。
- 揪出并根因修复 3 份真实 F1 类缺陷：两份 08-25 final taskpack +
  B030 R3 进展快照（头部加非侵入 SUPERSEDED 标记，正文不动）。
- **踩坑记录（关键）**：改这 3 份文档字节 →
  `deepseek_authority_chain.py --check`（H010 gate 子门 2）报
  **DRIFT**（authority-chain 工件记录了旧 digest）。修法 = 重新生成
  `reports/current/DEEPSEEK-AUTHORITY-CHAIN.json`（write 模式）rebind
  digest 并随 PR 提交。经验：**改 docs/taskpacks 任何被 chain 工件
  收录的文档，必须同步 rebind `DEEPSEEK-AUTHORITY-CHAIN.json`**，
  否则 H010 必红。

### #162 — Prompt I（五层闭环）
- `src/design_lab/assurance/handoff_readiness.py`：纯后端决策层，
  组合 4 份**现有**合同（sealed QualityRecord 经
  `quality_record.final_gate_of`/`as_gate_summary`；rights-registry
  冻结状态词表；preflight v2；commercial handoff schema），
  **不建平行 quality truth**。输出 `READY_FOR_HANDOFF / BLOCKED` +
  BLOCKER/WARNING/INFO 三档（同一来源列表喂 UI 与 backend，
  不可不一致）。
- 判定语义：automated score 永不入 gate（REJECT 人工否决盖过
  0.97 模型分）；rights `FORBIDDEN`/`NOT_ADJUDICATED` = BLOCKER；
  `PERSONAL_RESEARCH_NONCOMMERCIAL_ONLY` /
  `NO_THIRD_PARTY_DISTRIBUTION` = WARNING；preflight blocker 级
  check fail（含 missing font、re-open failure）= BLOCKER；
  stale artifact hash（quality record digest / live re-observed
  任一不符）= BLOCKER；无 preflight report = BLOCKER。
- 10 个验收测试 = 审计点名的 7 类案例 + UI/backend 一致性。
- 边界：信号接入 Workbench UI = owner-gated C/D/E 产品层，未做。

## 3. 终态证据（可复现）

```bash
# 双端一致
git log --oneline -5            # 41f8ab6 ... 6391764
git ls-remote origin refs/heads/main   # 41f8ab63ba25...
# 分支/标签
git branch -a                   # 仅 main（+ 远端 main）
git tag --list 'archive-evidence/*'   # 5 个 09-25 证据 tag
# 新增门全绿
python design-lab/scripts/verify_execution_path_gate.py    # PASS files=7 findings=0
python design-lab/scripts/verify_context_integrity.py     # PASS
python design-lab/scripts/verify_adapter_locator_audit.py # PASS violations=0
python -m unittest design-lab.tests.test_handoff_readiness  # 10/10
```

## 4. 未决项（owner-gated，未做，勿宣称闭环）

以 `docs/audits/DESIGN-LAB-FULL-SWEEP-CLOSE-OUT-LEDGER-2026-09-25.md`
§5 为准（落仓权威，高于任何会话摘要）：

| 项 | 内容 | 为何未做 |
|---|---|---|
| C / D / E | Lite Workbench 产品化、启动器合并、Agent/MCP 控制台 | UI 产品决策，需 owner 定优先级/范围 |
| H | Photoshop/Illustrator 真宿主 E3 Golden Workflow + E4 Human Jury | 真实执行 + 人工门（owner 门） |
| G-9 / G-10 | golden-workflow exact-SHA pin、commercial-visual chain | ledger §5：`PARKED per R1`，NOT agent-autonomous |
| H003 | H001 lane 晋升 required | CI 治理决策（owner） |
| J | 外部项目受控吸收与 Pilot | 真实下载/安装/许可 |
| — | `design-lab/core` → `src/` 迁移 | owner 架构决策 |

## 5. 给下一个 agent 的操作规则（防失忆要点）

1. 会话启动先跑 `python design-lab/scripts/context_capsule.py` 取
   capsule（权威绑定 + SHA 全链），receipt 只按 hash 引用。
2. 任何改 `docs/taskpacks/*` 被 chain 收录文档的操作，**同 PR 内
   rebind `reports/current/DEEPSEEK-AUTHORITY-CHAIN.json`**（H010 会
   校验 digest）。
3. 新增含 curl/wget/Invoke-* 字面量的文件（含测试 fixture）必须
   在 `execution-path-allowlist.json` pin 五元组，且提交后在
   tracked 态复跑 C 门。
4. 新增机器路径字面量/winreg 关键词文档字符串会触发 B4 门——
   docstring 一律写抽象语义。
5. 定位器/门均为零副作用：不得在门内做网络/下载/安装/写文件；
   未观察即 VERIFIED 属于幻影，fail-closed 拒绝。
