# R5 第三轮全量回归：通过执行项，保留跳过与历史失败

## 本轮结果

- 工具会话85359已终态，exit0。
- 命令：`.venv/Scripts/python.exe -B -X utf8 -m unittest discover -v -s design-lab/tests`。
- 953 tests /1067.676秒；951通过、2 skipped、0 failure、0 error；unittest汇总为OK (skipped=2)。
- 执行起止：2026-09-08T22:14:11.268344+00:00 至22:31:59.967966+00:00（记录器起止含进程开销）。
- HEAD始终为a06c1db01944faca6c8dd41b8fe22f651138a400，绑定当前未提交工作区，不能把它当该commit的干净树测试或exact-SHA CI。
- 源码冻结至该进程退出；Git diff --check通过，前后HEAD相同。报告生成检查在开跑前通过。

## 原始证据

项目ignored目录 `.project-local/task-artifacts/full-regression-r5-20260909/d0a5162f89f54c099c3ca7d64b81b892/`：

- `unittest.log`：逐项原始输出，SHA256 `7d33be385ec38719a704fd187c4b2d47d9262c069378b6c8b905d908255ba1fc`，结束后独立重算一致。
- `result.json`：命令、时间、基线、退出码及日志hash。
- 记录器没有重试测试、过滤失败或重写结果；终端输出截断不影响完整落盘日志。

## 两项未执行

1. test_model_manifest.ModelManifestTests.test_cache_symlink_to_own_blob_supported_but_escape_and_broken_rejected：Windows native symlink权限1314。
2. test_visual_quality_scan_boundary.VisualQualityScanBoundaryTests.test_source_link_is_rejected_without_reading_target：相同权限不足。

这两项不是PASS；本轮未提升权限或改变系统设置。

## HTTP历史错误仍保留

此前第二轮953项中出现WinError10053。本轮该具体测试test_http_patch_route_scoped_fields_and_idempotency为ok。此前独立30次和后续100次也未复现，但没有确认或修复该间歇错误根因。因此结论是“最新全量运行通过执行项”，不是“间歇错误已彻底修复”。前两轮报告及hash绑定不覆写。

## 交付边界

本轮证明Python本地回归，不能替代真实宿主、5—10张参考集、人工Jury/rights、Comfy十次模型基准、H3本地15秒视频、安装升级回退或远端当前SHA CI。所有R5未完成要求继续保留。尚未因本轮通过而提交/上传/合并/发布。

下一步：将该证据接入正式账本；接续Comfy三项已复现的结构拒绝缺口与真实生产合同。后续改动的测试边界须重新标明，不能继续继承本轮全量绿灯。
