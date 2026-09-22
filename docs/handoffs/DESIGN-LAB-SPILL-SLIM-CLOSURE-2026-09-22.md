# DESIGN-LAB 后续任务收口交接（2026-09-22 第二轮）

基线：`main` = `0c41175`（#138 审计分支已合并）。本轮三项后续任务。

## 1. 合并审计分支（任务①）— 已完成

- `codex/design-lab-audit-20260922`（exact-SHA `abd3b51`，CI 9/9）经 **PR #138** squash 合并进 main。
- main 前进到 `0c41175`（`git ls-remote origin main` 铁证）；远端审计分支已删除（`gh pr create --delete-branch` / merge `--delete-branch`）。
- 本地 `git checkout main && git pull` 与 origin/main 同步。

## 2. 瘦身项目本体（任务②）— 已完成

**根因**：AGENTS.md 明令 `.hermes` 不是活跃写入路径（运行根统一 `.project-local/`），但本轮执行期把 241.57 MiB 运行数据违规写进了 `.hermes/task-runtime`（主体是 `dl-ad-pkg-ci/` CI 缓存 + 98 个一次性任务脚本/消息文件）。

**处置**（用项目自带工具链，非手删）：
- `python scripts/deepseek_hermes_migration.py --plan` → 99 对象 / 241.77 MiB 全为 DESIGN-LAB 自有 RUNTIME_STATE，目标 `.project-local/archive/hermes-legacy/`。
- `--apply` → copy → 逐对象 digest 校验（`DIGEST_MISMATCH` 即中止）→ 删源 → 写恢复 manifest（`MIGRATION=APPLIED objects=99`）。
- `--verify` → **PASS**（109 对象含历史 manifest，digest 逐一回读，源已清）。
- 结果：`.hermes` 241.8 MB → 仅剩 13 KB `skill-call-index.json`（Hermes 原生，**DO_NOT_TOUCH**，非 DESIGN-LAB 所有）。

**回滚**：`python scripts/deepseek_hermes_migration.py --restore`（manifest 在 `.project-local/archive/hermes-legacy/MIGRATION-MANIFEST.json`）。

**本体其余大块（未动，均必要/证据）**：
- git-tracked >200KB 共 32 文件 / 19.6 MB，全部为 evidence（game-visual/nebula PNG、h3 mp4/flac、MASTER/QUARANTINE registry、历史 crosswalk JSON/CSV）——被 repo 多处引用（reference 核验非 orphan），属 E3/E4 证据资产，不可删。
- `.git` 215 MB（history）、`.venv`/`node_modules`（可再生 dev 依赖，gitignored）、`.project-local` 3.7 GB（指定 runtime 根，evidence 持久数据，非污染）。

## 3. 追踪外溢数据（任务③）— 已完成

- 用项目自带零污染守卫 `scripts/verify_zero_spill.py`（junction-aware，`.hermes` 列为 DENIED 根）+ 台账生成器 `scripts/deepseek_spill_census.py`。
- 刷新 `reports/current/SPILL-CENSUS.json`：迁移后 **objects=1 / total=0.01 MiB**（仅剩 `skill-call-index.json` DO_NOT_TOUCH）。
- `scripts/deepseek_spill_census.py --check` → **SPILL_CENSUS=PASS**（tracked 台账与当前 FS 一致，零漂移）。
- 库索引交叉核验（外置库维度）：`.project/paths.json` 4 个 shared_inputs 根全指向 `D:`（model-library/design-assets/os-toolchain/design-toolchain），**0 个 C:/E: 漂移**；`external-assets-index.json` 2 条路径无 E:/C: 污染；`paths.py` 含 junction/reparse 拒读（3 处 junction、1 处 reparse 命中，symlink/islink 走 Path 语义）。

## 未证明边界（不虚报闭环）

- 本轮三任务全部有 digest/ls-remote/SPILL_CENSUS=PASS 级证据；未触及 E3 真实宿主 / E4 人工陪审 / E5 tag 发布。
- `.venv`、`node_modules`、`.project-local` runtime 证据均未删除（可再生或持久证据，非污染）。

## 复核命令集

```
git ls-remote origin main                                  # main=0c41175
python scripts/deepseek_spill_census.py --check            # SPILL_CENSUS=PASS
python scripts/deepseek_hermes_migration.py --verify        # MIGRATION_VERIFY=PASS
```
