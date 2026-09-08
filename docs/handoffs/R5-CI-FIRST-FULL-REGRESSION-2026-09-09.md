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

当前仍需新提交的 exact-SHA CI 和修复后 Windows 全量验证。禁止复用失败 SHA 的其他绿色作业宣称整体通过。Node 20 action 运行时弃用警告保留，未在本轮顺手升级依赖。
