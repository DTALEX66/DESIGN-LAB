# DP-V2 交接回交 GPT（2026-09-06）

> 分支 `codex/r3-runtime-correctness` HEAD `c4dccd5`；V1 原件目录 `docs/handoffs/deepseek-r3-20260906/`（17 文件，只读保留）；V2 交付目录 `docs/handoffs/deepseek-r3-20260906-v2/`。
> 范围：仅修订 V1 交接材料的五类已复核错误；不重跑 DS-01—12、不改核心代码、不发布。

## 一、五项修订结果

| 项 | 结果 | 文件 | 说明 |
|---|---|---|---|
| DP-V2-01 四轴矩阵 | **PASS** | `01-requirements-matrix.json` | 66 行、24 ID；implementation 步骤数组不再当状态；每轴含 ledger/progress/declared state+evidence+reasons；附内存校验（数组当状态必须拒绝） |
| DP-V2-02 ComfyUI 措辞 | **PASS** | `02-capability-corrections.json` | 两条外置路径已实测存在（python.exe 105,696B / main.py 25,301B）；撤回 V1"ComfyUI 未安装"及派生冲突；不升级为"可运行"；历史 E3 保留待重验 |
| DP-V2-03 ZIP locator | **PASS** | `03-history-locator-corrections.json` | `old-new-crosswalk.csv` 确在 ZIP 根（3152B, sha256 a52e0a01…）；纠正 V1 的 `history/` 前缀错误 locator；`history-current-tree-coverage.json` 262,249B hash 复核一致 |
| DP-V2-04 参考集收敛 | **PARTIAL**（见下） | `04-reference-candidates.json` + `04-reference-exclusions.json` | 主候选 6 条全作者核实（A×2/B×2/C/3D）；排除 5 条保留 V1 ID；电商/2D 无已核实作者候选 → 缺口 PARTIAL |
| DP-V2-05 回交与 hash 链 | 见本目录 | `05-DP-RETURN.md`、`05-results.json`、`SHA256SUMS.txt` | 8 内容文件先固定；清单按字典序含其余 8 文件完整 SHA-256，**不含自身** |

## 二、GPT 待办

1. **DP-V2-04 电商/2D 缺口**：REF-03/REF-06 页面可达但作者未能从搜索核实；请浏览器级确认作者/作品页，或补作者可核验的电商主图候选。
2. **许可核对**：6 条主候选 `license_scope=UNKNOWN`、`approved_for_reconstruction=false`；采用/复刻/下载/再发布授权由 GPT/用户裁决。
3. **历史证据恢复**：`old-new-crosswalk.csv` 与 `history-current-tree-coverage.json` 在 ZIP（非仓库）；是否落盘/恢复由 GPT 决定（权属审查）。1450/536 原文未改、未重建私人正文。
4. **ComfyUI 真实状态**：文件存在≠可运行；进程/服务/工作流验证与模型资格由 GPT 执行。
5. **正式 ledger**：`design-lab/config/task-ledger-r3.json` 未改；V2 只管理本修订轮状态，不称项目真值表。
6. **V2-01 复核**：按 input 逐字段比对；若 R3 输入已变，以新证据为准（不硬编码旧值）。

## 三、边界遵守

- V1 17 文件只读、hash 未变；未改 R3 任务包/ledger/reports/config/schema/src/tests/workflow/锁/根指令。
- 未提交/push/PR/发布；未装软件/模型；未启动宿主/ComfyUI/GPU；E 盘未碰；未读敏感/私密内容。
- helper 脚本/日志在 `.project-local/task-{artifacts,runtime}/deepseek-r3-20260906-v2/`（Git ignored），不在 V2 交付目录。
- V2 九个文件 = 八个内容文件 + SHA256SUMS.txt；清单不含自身，清单 hash 见交付消息。

## 四、V2 文件清单

```text
docs/handoffs/deepseek-r3-20260906-v2/
  00-input-baseline.json
  01-requirements-matrix.json
  02-capability-corrections.json
  03-history-locator-corrections.json
  04-reference-candidates.json
  04-reference-exclusions.json
  05-DP-RETURN.md
  05-results.json
  SHA256SUMS.txt
```

完整 SHA-256 见 `SHA256SUMS.txt`（八行，字典序，不含自身）。
