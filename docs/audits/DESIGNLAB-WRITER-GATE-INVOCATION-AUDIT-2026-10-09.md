# DESIGN-LAB 会写被跟踪文件的门，以及谁用它们的写模式调用它们（2026-10-09）

本文每张表都由脚本按第 1 节写明的规则量出来再生成（生成脚本放在被 ignore 的
`.project-local/runs/writer-sweep/write_audit.py`，是本轮的临时工具，不是仓内资产——所以规则本身
写在下面，读者不需要那个脚本也能自己复算）。范围：`scripts/*.py` 与 `design-lab/scripts/*.py`
里把**被跟踪路径**作为写入目标的脚本，以及三个调用面（测试、权威链、workflow）。

## 0. 为什么这算一个缺陷类

一道门如果同时是写手，用裸参数调它就是在改被跟踪文件。测试里这样调，全套每次跑都会重写投影（上一回合在 `test_claim_honesty_gates.py` 上量到并改掉，三份投影因此不再被测试改写）；**CI 里这样调**，除了污染树还有一个更坏的效果：记录每次都被刷新，于是没人能看出它的内容与它自己的判断已经脱节。本轮量到的实例：`LANGUAGE-BOUNDARY-SCAN.json` 的判断仍然对（`verdict=PASS`、`failures=[]`），但它记的 `tracked_files_scanned=3360`，而同一提交在干净检出里重算出来是 **3412**——差 52 个文件，一直没人看见，因为每次链跑都把它重写一遍。

## 1. 会写被跟踪路径的脚本（实测 25 个）

判定规则（也写在生成脚本里）：某常量的字面量是被跟踪路径**或**被跟踪目录，且该常量出现在带 `.write_text(` 的那一行，才算这个脚本在写它——两种真实形态都要认：`OUT = REPO / "reports/current/X.json"` 配 `OUT.write_text(...)`，以及 `OUT = REPO / "reports/current"` 配 `(OUT / name).write_text(...)`（后者一份脚本发多份记录，所以目标写成"该目录内逐份"，不去冒充精确文件名）。只看"脚本里提到这个路径"会把只读它的脚本误判成写手——本轮就是靠这条区分否证了我自己上一轮的一句断言。

| 脚本 | 写的被跟踪文件 | 有只读形态？ | write_text 调用数 |
|---|---|---|---|
| `design-lab/scripts/inventory_binaries.py` | `reports/ (该目录内逐份)` | **无** | 1 |
| `design-lab/scripts/migrate_source_registry_v3.py` | `reports/ (该目录内逐份)` | **无** | 3 |
| `design-lab/scripts/update_evidence_binding.py` | `design-lab/ (该目录内逐份)` | **无** | 2 |
| `scripts/classify_repo.py` | `reports/ (该目录内逐份)` | `--check` | 1 |
| `scripts/deepseek_foundation_audit.py` | `reports/current/FOUNDATION-AUDIT.json` | `--check` | 1 |
| `scripts/deepseek_language_inventory.py` | `reports/current/LANGUAGE-INVENTORY.json` | `--check` | 1 |
| `scripts/deepseek_migration_rehearsal.py` | `reports/current/CREATIVE-MIGRATION-REHEARSAL.json` | **无** | 1 |
| `scripts/deepseek_post_cleanup_audit.py` | `reports/current/POST-CLEANUP-AUDIT.json` | **无** | 1 |
| `scripts/deepseek_registry_ssot.py` | `reports/current/DEEPSEEK-REGISTRY-SSOT.json` | `--check` | 1 |
| `scripts/deepseek_runtime_cleanup.py` | `reports/current/RUNTIME-CLEANUP-PLAN.json` | **无** | 3 |
| `scripts/deepseek_spill_census.py` | `reports/current/SPILL-CENSUS.json` | `--check` | 1 |
| `scripts/deepseek_test_gate_report.py` | `reports/current/DEEPSEEK-FINAL-TEST-GATE.json` | `--check` | 1 |
| `scripts/generate_branch_cleanup_candidates.py` | `design-lab/ (该目录内逐份)` | **无** | 1 |
| `scripts/generate_branch_inventory.py` | `reports/ (该目录内逐份)` | **无** | 1 |
| `scripts/generate_machine_inventory.py` | `reports/ (该目录内逐份)` | `--check` | 1 |
| `scripts/generate_repository_size_report.py` | `design-lab/ (该目录内逐份)` | **无** | 1 |
| `scripts/generate_rights_registry.py` | `design-lab/config/rights-registry.json` | `--check` | 1 |
| `scripts/verify_clean_tree.py` | `reports/current/CLEAN-TREE-REPORT.json` | **无** | 1 |
| `scripts/verify_contract_graph.py` | `reports/current/CONTRACT-GRAPH.json` | `--check` | 1 |
| `scripts/verify_evidence_levels.py` | `reports/current/EVIDENCE-LEVEL-AUDIT.json` | `--check`、`--self-test` | 1 |
| `scripts/verify_fresh_clone.py` | `reports/current/FRESH-CLONE-VERIFICATION.json` | **无** | 1 |
| `scripts/verify_language_boundary.py` | `reports/current/LANGUAGE-BOUNDARY-SCAN.json` | `--check` | 1 |
| `scripts/verify_no_overclaim.py` | `reports/current/NO-OVERCLAIM-AUDIT.json` | `--check` | 1 |
| `scripts/verify_recovery_safety.py` | `reports/current/RECOVERY-SAFETY.json` | `--check` | 1 |
| `scripts/verify_supply_chain.py` | `reports/current/SUPPLY-CHAIN-REPORT.json` | `--check`、`--self-test` | 1 |

没有只读形态的 11 个：`design-lab/scripts/inventory_binaries.py`、`design-lab/scripts/migrate_source_registry_v3.py`、`design-lab/scripts/update_evidence_binding.py`、`scripts/deepseek_migration_rehearsal.py`、`scripts/deepseek_post_cleanup_audit.py`、`scripts/deepseek_runtime_cleanup.py`、`scripts/generate_branch_cleanup_candidates.py`、`scripts/generate_branch_inventory.py`、`scripts/generate_repository_size_report.py`、`scripts/verify_clean_tree.py`、`scripts/verify_fresh_clone.py`。这些里绝大多数是**一次性历史审计**（`test_gate_reachability.py` 的 MANUAL_GATES 已逐条声明为 one-off），给它们补 `--check` 是在造没人调用的接口，所以本轮只给`verify_language_boundary.py` 补——它是唯一被 CI 链以写模式实际调用的那个。

## 2. 权威链（CI 走的那条）的子调用 argv

| 链条目 | 子脚本 | argv |
|---|---|---|
| authority-ledger | `scripts/deepseek_authority_ledger.py` | `verify` |
| authority-chain | `scripts/deepseek_authority_chain.py` | `--check` |
| source-lock | `scripts/verify_source_lock.py` | `--check` |
| contract-graph | `scripts/verify_contract_graph.py` | `--check` |
| language-boundary | `scripts/verify_language_boundary.py` | `--check` |

实测裸调用条目：0 个（已全部改掉）。本轮之前的那一个是 `language-boundary`，同一列表里其他四条都带 `--check`/`verify`，只有它是空的——所以这不是风格问题，是链条里唯一一处"检查器位置上放了写手"。

## 3. workflow 直接调的脚本（逐行读数）

- `canonical-verify.yml:41` — `run: python design-lab/scripts/verify_identity_gate.py`
- `canonical-verify.yml:43` — `run: python design-lab/scripts/verify_design_lab.py`
- `canonical-verify.yml:45` — `run: python design-lab/scripts/verify_adapter_matrix.py`
- `canonical-verify.yml:55` — `run: python design-lab/scripts/verify_task_ledger_contract.py`
- `canonical-verify.yml:62` — `run: python design-lab/scripts/verify_evidence_artifact_presence.py`
- `canonical-verify.yml:68` — `run: python design-lab/scripts/verify_candidate_taxonomy.py`
- `canonical-verify.yml:70` — `run: python design-lab/scripts/verify_state_vocabularies.py`
- `canonical-verify.yml:87` — `run: python design-lab/scripts/verify_library_index_consistency.py`
- `canonical-verify.yml:118` — `run: python scripts/verify_authority_gates.py --zero-spill`
- `canonical-verify.yml:142` — `run: python scripts/verify_top_level_authority.py`
- `canonical-verify.yml:147` — `run: python design-lab/scripts/verify_project_drift.py`
- `canonical-verify.yml:153` — `run: python scripts/verify_path_refs.py`
- `canonical-verify.yml:202` — `run: python3 design-lab/scripts/verify_workbench_packaging.py`
- `canonical-verify.yml:338` — `run: python design-lab/scripts/verify_license_coverage.py`
- `canonical-verify.yml:346` — `run: python design-lab/scripts/verify_sbom.py`
- `canonical-verify.yml:358` — `run: python scripts/verify_secret_history.py --max-blobs 0`
- `release-gate.yml:46` — `run: python design-lab/scripts/verify_design_lab.py`
- `release-gate.yml:52` — `run: python design-lab/scripts/verify_release_gate.py`

`canonical-verify.yml` 被四个 SHA-256 pin 之一保护（`scripts/verify_top_level_authority.py` 校验），所以这一轮我一行没动它。第 118 行走的是权威链脚本，链内部现在只做检查；第 142 行 `verify_top_level_authority.py` 不写被跟踪文件（不在上面那张表里），所以那两处都不是写模式。

## 4. 本轮改了什么（以及没改什么）

- `scripts/verify_language_boundary.py` 增加只读 `--check`：只比**判断**（`verdict` 与 `failures` 集合，双向），描述性计数（`tracked_files_scanned`）只报 NOTICE 不判红——把它钉死就等于要求每次提交都重写记录，那正是这个缺陷的形状。`subject_sha` 故意不比：在册的九条历史空值由 `design-lab/config/report-subject-debt.json` 管，门已经在那儿数着。
- `scripts/verify_authority_gates.py` 的 GATES 第 5 条 argv 由 `[]` 改为 `["--check"]`。
- 新增守卫 `design-lab/tests/test_language_boundary_check_mode.py`（13 例）：其中一条把规则写成对整个 GATES 列表的 AST 检查——**任何不带 argv 却写被跟踪路径的子调用直接红**。我用修复前的链字节反证过：该守卫准确报出 `[('language-boundary', 'scripts/verify_language_boundary.py')]`，也就是它确实能抓到被抓到的那个缺陷，不是一条永远为真的断言。
- 修完整条链时又量出一处**只在非 UTF-8 控制台才现形**的缺陷：`verify_authority_gates.py` 用
  `encoding="utf-8", errors="replace"` 读子进程输出，而子进程（`verify_language_boundary.py`）
  在自己的 cp936 控制台上打印中文注解 → 父进程把非 ASCII 字节全变成 U+FFFD → 再打印回同一个
  codepage 时 `UnicodeEncodeError`，整条链在第一行报告上崩掉（实测 `CHAIN_EXIT=1`，traceback 在
  `print(f"{status:10s} ...")`）。Linux runner 用的是 UTF-8，永远撞不到，所以它能活到今天。
  修法分两层：给每个子进程显式 `PYTHONIOENCODING=utf-8`（根因），并对回显那一行做
  `safe_text()`（不让一条报告行决定整条链能不能跑完）——只处理回显，退出码、判断与写出的记录
  一律不动，所以它藏不了任何失败。
- 修完实测：`AUTHORITY_GATES=PASS gates=7 failed=none`，其中
  `language-boundary LANGUAGE_BOUNDARY=PASS mode=check judgement_agrees=yes descriptive_drift=1`；
  跑完 `git status --porcelain` 前后逐字相同，即整条链不再写任何被跟踪文件。测试里带一条
  以 `PYTHONIOENCODING=gbk` 复现该崩法并断言链跑完且树不动的回归例。
- 没改：九条在册记录一条都没重跑（它们都被 DONE 任务当证据引用，见任务册理由）；workflow 没动；`deepseek_*` 一次性审计没加接口。

## 5. 我上一轮写错的一句（带日期更正）

我在 2026-10-09 的交接与提示词里把 `verify_authority_gates.py` 说成"CI 里的写手，会重写 `DEEPSEEK-FINAL-TEST-GATE.json`"。读代码后否证：该脚本只在 `TEST_GATE_OUT` **存在时读它**，写那份记录的是 `deepseek_test_gate_report.py`，而且链里对它的调用本来就是 `--check`；只有在本地 bound 历史缺失的全新检出里，它才故意先跑关键 220 例再生成一次，并把理由写在 `run_test_gate()` 的 note 里。真正被我抓住的是同列表里的另一条（language-boundary）。错因：我把"脚本里出现了那个路径常量"读成"它写那个路径"，没看赋值之外的用法。

## 6. 复现命令

```
python scripts/verify_language_boundary.py --check       # 判断一致则 exit 0，且不写盘
python design-lab/tests/test_language_boundary_check_mode.py
python .project-local/runs/writer-sweep/read_call_statements.py   # 本表的原始读数
```

生成时间 2026-10-08T21:37:02+00:00；表内脚本数 25、无只读形态 11、链内裸调用 0、workflow 直接调用行 18。
