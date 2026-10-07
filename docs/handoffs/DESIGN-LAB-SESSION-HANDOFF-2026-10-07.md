# DESIGN-LAB 交接提示词 · 2026-10-07（UI 收敛批次收尾）

读这份就够了，细节在它指过去的落仓文件里。上一份同类文档是
`docs/handoffs/DESIGN-LAB-SESSION-HANDOFF-2026-10-06B.md`，其内容除本节"待裁决"部分外已被本轮并入覆盖。

## 0. 铁律（沿用，不可绕过）

- 记忆 / 会话摘要 / 旧 TaskPack / 分支名 / commit 数**一律不作权威**；只有落仓文件可授权改动。
- 不建第二账本、第二运行时、第二前端、第二知识库。
- 不 force push、不删证据、未授权不 merge / release / 删分支；不用 admin 提权去让门变绿。
- `SourceRecord.reviewedBy` / `reviewedAt` 与 Jury 的人工字段**永不由 agent 填写**。
- 新门必须先证伪再用；哈希与计数来自管线，不手抄；读回执不读包装状态。
- 未测得 = `null`，读不回 = "未读回"，永远不是 0；"几何全绿" ≠ "界面好"。

## 1. 现在在哪（实测，不是叙述）

观察到的 `main` = `9d99a0e1f0de`（本节生成时的 origin/main tip）。UI 收敛批次 #260–#275 已全部并入，
生成这一刻没有开放 PR、没有待合分支 —— 这份文档自身是它之后的第一个 PR，所以读 §1 时以表里最后一行的
SHA 为准，别把这句"没有开放 PR"当成现在的状态。批次内每一次的证据在
`docs/audits/DESIGNLAB-UI-IMPLEMENTATION-REPORT-2026-10-07B.md` **§一–§十**（那一份整面复观测绑定 `dcc9d12e`）；
本文 **§5** 是把同一套门在当前 tip 上重新跑一遍的结果 —— 旧 SHA 的绿不自动提升新 SHA，所以两条都要留。

| PR | merge SHA | 来源分支 |
|---|---|---|
| #260 | `22fddb3958f9` | `designlab-desktop-evidence-scope` |
| #261 | `0d82428f5c3e` | `designlab-shape-degradation` |
| #262 | `b846937482ce` | `designlab-preflight-chain` |
| #263 | `a9e4398cc6b6` | `designlab-capability-library` |
| #264 | `5e03117cdaab` | `designlab-ui-record-convergence` |
| #265 | `14d7179a5b5c` | `designlab-notice-rollout` |
| #266 | `52dfb791d0c9` | `designlab-readstate` |
| #267 | `aae165ccdc35` | `designlab-declared-tool-roots` |
| #268 | `f4f236a92015` | `designlab-ui-closeout-266` |
| #269 | `81f6615847a4` | `designlab-project-venv` |
| #270 | `2e634524c563` | `designlab-failed-state` |
| #271 | `13e8cc9496a8` | `designlab-manifest-relpath` |
| #272 | `868dc9f7e7e8` | `designlab-ui-closeout-final` |
| #273 | `dcc9d12e96fa` | `designlab-unreachable-diagnosis` |
| #274 | `45b7fea923c2` | `designlab-settled-main-closeout` |
| #275 | `9d99a0e1f0de` | `designlab-skip-identity` |

## 2. 这一轮真正改掉的东西（一句话一条，展开看 §一–§十）

- 六态矩阵的每一列都从"看起来对"变成"有门拦着"：⑤ 形状异常、① 离线 vs 真实空、④ 空态正向对照、
  ② 失败分型（连不上 / 回复无法解析 / 服务错误三条路径各自有名）。
- 读回失败不再把引擎字符串直接上屏，原因保留、状态码带上，且扫描门实测到三条路径而不是只测一条。
- 声明根里的工具解析次序改成"声明绑定 → 项目 venv → PATH"，且 `path_source` 由**实际解析结果**决定。
- 证据记录器 `run_bound_test_suite.py` 开始记录每条 skip 的用例 id 与它自己声明的原因；
  计数有、身份没有时 `BOUND_SKIP_IDENTITY=DEFECT` 退 3。

## 3. 待 owner 裁决（agent 不得自决，也不得"顺手做掉"）

- D-1 Inter 字体栈首位；D-3 规格矛盾 X-1/X-2/X-3/X-4/X-7；D-4 390 抽屉 vs 滚动；D-6 首屏壳统一；
  品牌蓝 `#316CFF`（撑不住白字，已按面用 `--border-strong` 绕开，token 本体仍待裁）；
  中英标题政策；首页坏消息权重；INSPECTOR 空环。
- 权利门：`tool-control` 双许可、`omniparser` 混许可、6 个悬空 `review-required` 吸收目标；
  `external-assets-index.json` 的 20 条 `review-required`（`generated_at` 仍是 2026-08-16）。
  我不刷新该索引（会把本机绝对路径写进受版本控制的文件），也不散列权重（文件政策禁止）。
- 证据分叉：截图口径（低于 fold 无覆盖）、78 张孤儿 PNG 去留（备查未删，
  `.project-local/tmp/cap-orphans-270/`）、`.project-local/projects/` 的 341.1 MiB 归属口径、
  worktree 清理需要 junction 拆除。
- E3 真实宿主、E4 人工 Jury、E5 发布 —— 需要真人和真实宿主，不是工程量问题。

## 4. 环境速查（本轮新增的坑）

- node/python 不在 Bash 的 PATH 上；node 用 scoop 那个二进制，Python 用项目 `.venv/Scripts/python.exe`。
- **在一个新 worktree 里跑门**：`apps/workbench/` 下需要
  `node_modules` → 指向主检出 `apps/workbench/node_modules/` 的符号链接（pnpm 内部是相对链接，穿得过）。
  不装包、不动主检出（主检出被另一个会话占着，它的 4 个已改文件不是我的）。
- 真实浏览器门要走 `scripts/run_bound_test_suite.py --modules …`，带
  `PATH=<node 目录 POSIX 形式>`、`E2E_NODE_MODULES=<含 node_modules/playwright 的那个目录>`、
  `E2E_REQUIRED=1`、`PYTHONUTF8=1`。少了 `E2E_REQUIRED=1` 它们会**诚实地 SKIP 并 exit 0**。
- 任何一次全量跑都会就地重写 `reports/current/` 里的投影（只有时间戳/计数）。
  先 `git diff` 取证，再 `git checkout -- reports/current/`，并且把 `worktree_clean=false` 的原因写出来。
- 本机 `verify_authority_gates.py` 报 `TEST_GATE=DRIFT`：`last-run.json` 是每机器 scratch，
  受版本控制的报告相对它必然陈旧 —— 在未改动的第二个 worktree 里也一样报，所以不是缺陷、别去"修绿"。
- `canonical-verify.yml` 与 `test_workbench_design_layer_e2e.py` 是 SHA-256 钉死的，改不了。

## 5. 当前 tip 上的复观测（`9d99a0e1f0de`，本机）

Report B §十 那一份绑定的是 `dcc9d12e`（= #273 的合并点）；其后的 #274/#275 只动文档、测试与证据
记录器，没动 UI 代码，但旧证据不提升新 SHA，所以整面在 `origin/main` 当前 tip 上又跑了一遍：

- `tsc --noEmit` → 0；`vite build` 后 `git diff --exit-code -- apps/workbench/build` → 0（产物与提交态逐字节相同）
- `unit.mjs` / `shape-notice-coverage.mjs` / `appshell.mjs` → 全过
- 上面那次全量跑里**含**五条真实浏览器门（overflow / contrast / ui-audit / 设计层纵切 / 预检交接），
  带 `E2E_REQUIRED=1` 跑的：它们既没红、也没以 SKIP 蒙过（下面被点名的 5 条里没有它们）。
  少了 `E2E_REQUIRED=1` 时这几条会诚实地 SKIP 并 exit 0 —— 那是"没测"，不是"过了"。
- Python 全量绑定跑，记录器自己写的字段：
  `testrun-20261007T085744Z-forward-85b16b98cfc0` @ `9d99a0e1f0de`：
  `tests_run=1946`、`failures=0`、`errors=0`、
  `skipped=5`、`1288.459 s`、manifest `sha256:30fe86b32…`、
  `worktree_clean=false` —— 跑动中 `reports/current/` 的三个投影被测试
  就地重写。在 `dcc9d12e` 那一次我抓过 diff 存档：差异只有 `audited_at`/`generated_at` 三个时间戳；
  这一次我直接 `git checkout -- reports/current/` 还原成提交态、没有再留一份 diff，所以那句"只有时间戳"
  是**上一次取证**的结论，不是这一次的读数（坑记在本文 §4；那次的 diff 记在 Report B §十）
- 被点名的 skip（新记录器的第一条用处）：

- `test_bound_run_skip_identity._Fixture.test_skipped_case` — fixture: this case is declared not-runnable on purpose
- `test_model_manifest.ModelManifestTests.test_cache_symlink_to_own_blob_supported_but_escape_and_broken_rejected` — ENVIRONMENT_FAIL: native symlink creation lacks Windows privilege (1314)
- `test_source_lock_presence.DigestsAreMachineScopedEvidence.test_cache_digest_is_verified_only_when_this_machine_has_the_bytes` — this machine has no vendor cache; cache integrity is NOT_VERIFIED here
- `test_visual_quality_scan_boundary.VisualQualityScanBoundaryTests.test_source_link_is_rejected_without_reading_target` — Native symlink privilege unavailable: [WinError 1314] 客户端没有所需的特权。: 'D…（完整原因含临时路径，见 `last-run.json`）
- `test_workbench_launch.WorkbenchLaunchTests.test_packaged_install_serves_the_committed_bundle` — source checkout: no packaged workbench resource to verify

**读数**：没有一条是"真检查悄悄不见了"。两条是 Windows 建符号链接缺
`SeCreateSymbolicLinkPrivilege`（按策略不提权），一条本机没有 vendor cache（缓存完整性在这里就是
`NOT_VERIFIED`），一条是源码检出没有"已打包安装"可验。

- 工具腿：`scripts/design_lab_doctor.py` → `uv`、`git`、`ffmpeg`、`node` 四个全部 `found` + `VERSION_VERIFIED` + `drift=[]`；
  ffmpeg 与 node 由声明根回答，uv 与 git 由当前进程 PATH 回答。

这四条 skip 的口径是"环境边界"，不是"通过"。要往 E3 走需要真实宿主，见 §3 最后一条。

## 6. 新会话建议的第一批动作

1. 读 `AUTHORITY.md` → `.project/governance/authority-index.json` → `AGENTS.md` →
   `design-lab/config/task-ledger-r3.json` → Report B §八 §十（顺序就是优先级）。
2. `git fetch origin && git rev-parse origin/main`，把观察到的 SHA 写进第一句话。
3. 若 owner 已对 §3 任一条给出裁决：只在**主检出之外**的新分支上实现，门先证伪再用，
   跑 `run_bound_test_suite.py` 拿绑定记录，再开 PR；不要新增第二份状态投影。
4. 若没有新裁决：可做的只剩"把 §3 的每一条变成 owner 一眼能拍的形式"（读图、列表、代价），
   不是继续扩治理面 —— AUTHORITY §2 禁止连续多波只扩治理/后端而无用户可见进展。
