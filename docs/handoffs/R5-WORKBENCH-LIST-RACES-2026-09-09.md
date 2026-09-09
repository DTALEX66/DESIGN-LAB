# R5 工作台列表乱序修复

任务：DL-R5-010；基线 `a06c1db01944faca6c8dd41b8fe22f651138a400`。

## 根因与实现

同项目刷新不改变 project epoch，因此旧任务、原生资产和图片列表响应能够覆盖较新结果，旧错误也会污染当前状态。三个读流程现分别绑定递增请求序号；只有当前项目的最新请求可以更新列表、游标或传播错误。

刷新第一页时立即失效旧分页游标，隐藏继续分页入口；游标为空时追加为无操作，防止刷新未完成时使用旧游标发出追加请求并反过来作废刷新。未取消服务端操作，也未改任务提交、宿主权限或路径合同。

## 验证

- 使用实际 main.ts，经 Node VM 执行；仅 DOM/fetch 为受控边界。乱序成功、过期错误、旧分页晚于刷新共 8 个场景先失败后通过。
- 刷新中追加及当前错误传播的两个场景先失败后通过。
- `.venv/Scripts/python.exe -B -X utf8 -m unittest discover -s design-lab/tests -p test_workbench_native_ui.py`：10 项 PASS，1.200 秒。
- 补充正常两页追加、游标传递和末页停止请求回归后：11 项 PASS，1.362 秒；没有新增生产代码。上述 49 验证器结果早于这项测试补充。
- `.venv/Scripts/python.exe -B -X utf8 design-lab/scripts/verify_design_lab.py`：49 个验证器 PASS，会话 12963 最终退出 0。这是检查入口结果，不将其中历史 Comfy 文案提升为本轮推理验收。
- 报告生成后 `scripts/generate_current_reports.py --check` PASS；检查范围为 bound-input integrity。

## 边界与接续

不是实浏览器网络乱序实测，也不是当前修改的 Windows 全量测试或 exact-SHA CI。上一提交的 926 项本地/云端通过仍只绑定上一 SHA。当前整项 DL-R5-010 与 R5 保持 PARTIAL。

后续：发布本修复开发分支并核对其 CI；补真实浏览器回归、安装包更新，继续 PS 恢复/修改链及完整版本与对象选择能力。回退本独立提交可撤销读请求防护，不删除用户作品。

## 上传执行限制

本轮包含暂存、提交、普通推送的命令在启动前被工具策略拒绝：`approval required by policy, but AskForApproval is set to Never`。整条命令未执行。随后只读核对 HEAD 仍为上述基线，修改均保留在工作区，未暂存、未提交、未上传。不得把先前基线的远端一致性当作这些修改已同步，也不通过替代工具或传输绕过审批限制。
