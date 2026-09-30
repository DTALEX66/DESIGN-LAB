# DESIGN-LAB UI 商业级 Workbench — MERGE_READY_HANDOFF
任务包：DESIGN-LAB_UI_FRONTEND_TASKPACK_20260930 · 分支 feat/ui-commercial-workbench-20260930

## 交接状态
- 基线：main @ `1acbfa15a8c036907aadbdc6938b8706c91b5d3e`（LIVE 读回，open PR=0）
- 改动文件：`apps/workbench/shell.ts` / `apps/workbench/style.css` /
  `apps/workbench/tests/appshell.mjs` / `apps/workbench/build/main.js`（重建）/
  `docs/UI-CONVERGENCE-20260930/`（6 份报告 + ASSET_MANIFEST.json）
- 未 tag、未 release、未动 main 保护（任务包 + 用户范围裁决）。

## 本地已验证
- tsc strict PASS；vite build PASS（4 modules，157.71 kB）
- unit.mjs / appshell.mjs PASS；test_service_http 27/27 PASS
- 全量 unittest discover（1762 tests）：本地后台执行 + CI 复核

## 合并前还需（CI 门）
1. `workbench-gate`：pnpm frozen install → tsc → vite build → unit smoke →
   packaging verifier → **No-drift（git diff --exit-code build/）**。
   本分支已提交重建后的 build/main.js，drift 门应绿。
2. `workbench-browser-e2e`：no-skip 浏览器片（exact-SHA controlled-runtime）；
   冻结断言 `.app-nav-item===12` 与 `#design-*` 选择器未触碰。
3. Python gate（unittest 全量 + V3 verifiers）。
4. DeepSeek authority gate：本分支**未改** `task-ledger-r3.json` 与
   `DEEPSEEK-AUTHORITY-CHAIN.json` → 无投影漂移；若 CI 仍报 DRIFT，
   按 `scripts/deepseek_authority_chain.py` 重新生成（LEDGER 已标
   mutable_state，结构性修复在 508d54b）。

## 合并后（owner 门，不在本 PR 内）
- E3/E4 宿主实操验收（owner gate）
- tag / release（用户明确不操作自动化任务，本分支不 tag）
- Playwright 截图 4 分辨率补拍（CI E2E 通过后回填 VISUAL_QA.md）

## 回滚
- 单 PR squash 回滚：revert 该 merge commit；build/main.js 随 shell.ts/style.css
  一起回退，byte-determinism 门自洽。
