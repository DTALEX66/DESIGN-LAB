# R5 首次全量云端回归与修正

开发分支已正常推送到 `8568343ef0671b9de65404d0d07b801e08758cde`，随后 fetch 读回与本地一致。远端 main 仍为 `c4dccd58331bc4561eb89265283d924b7630d113`；未合并、未发布，ignored 原件不在此次 Git 上传范围。

[Canonical Verify 34268041244](https://github.com/DTALEX66/DESIGN-LAB/actions/runs/34268041244) 对上述精确 SHA **FAIL**。Python 3.12.14 / Ubuntu，926 项测试、310.134 秒，28 个子测试失败、1 个错误、6 项跳过。4 个其他作业成功；Open Design 专项条件步骤因本次无对应目录修改而跳过，统一验证仍含其结构检查。

## 两个根因与修正

1. `test_r3_legacy_bridge_targets_existing_tasks_without_erasing_scope` 将历史 R3 crosswalk 的 28 个映射对照已迁移为 R5 的活动任务 ID，因版本集合不同全部失败。测试现改为核验 R5 内嵌 predecessor 与冻结 R3 原件内容/hash 一致，再逐条校验旧目标存在；不删映射、不扩大目标集合、不修改历史原件。
2. HTTP 取消测试在根测试入口设置 `PROJECT_LOCAL_ROOT` 后，直接为隔离项目构造服务，继承了外层根并被路径保护拒绝。HTTP 测试 setUp 现在在整个案例生命周期内绑定隔离项目自己的运行根，结束恢复环境。产品路径保护未放宽。

## 修复后针对验证

- 历史检索 8 项 PASS。
- 显式设置外层 `PROJECT_LOCAL_ROOT` 后运行 HTTP 模块，24 项 PASS。
- 修复前 Windows 全量入口仍在原进程运行时完成以上独立夹具验证；其结果必须归于修复前基线，不能称修复后全量通过。
- 本修正仅测试夹具/版本对照及生成投影，无宿主生产代码变更。

## 修复提交的最终验证（2026-09-09）

验证提交：`a06c1db01944faca6c8dd41b8fe22f651138a400`。

- [Canonical Verify 34269149972](https://github.com/DTALEX66/DESIGN-LAB/actions/runs/34269149972)：最终 SUCCESS；Python 全量 926 项，366.615 秒，`OK (skipped=6)`。Open Design 条件专项仍有跳过步骤；historical evidence binding 输出 `HISTORICAL_VALID`、`requiresRequalification=true`，不代表当前宿主重新验收。
- Windows / 项目 `.venv/Scripts/python.exe` / Python 3.13.14：执行 `-B -X utf8 scripts/run_python_tests.py`，会话 84694，最终退出码 0；926 项，1056.252 秒，`OK (skipped=2)`。运行期间冻结源码与 HEAD，结束后 `git status --short` 为空。
- 旧 Windows 会话 6618 最终为 926 项、1047.895 秒、28 failures / 2 errors / 2 skipped。除两个已修复根因外，另一错误是 `execution source tree changed before evidence promotion`：该轮期间曾提交修复、改变 HEAD，因此不是固定提交的有效全量验证；保留失败，不放宽证据保护。新的冻结树全量未复现此错误。

上述结果证明该提交本地和云端测试入口通过，不证明所有 R5 验收、真实宿主链路、人审、安装包或发布完成。跳过项不计为已执行通过。Node 20 action 运行时弃用警告保留，未在本轮顺手升级依赖。

## 下一项已复现缺陷

DL-R5-010：对实际 `apps/workbench/main.ts` 使用 Node VM 与可控制完成顺序的 fetch 边界，先发旧 `tasks()` 再发新 `tasks()`，先完成新响应、后完成旧响应。最终列表显示 `old`，`taskCursor` 也为 `old`。同项目请求只有 project epoch 防护，缺少请求次序防护；需补任务/原生资产/刷新乱序与分页回归，再修复。此处仅记录复现，尚未宣称修复。
