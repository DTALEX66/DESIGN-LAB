# R5 Photoshop 未知任务安全暂停

DL-R5-004/012：新增 Photoshop 固定 quiesce 脚本，复用原生状态机的单次恢复声明；原始请求 hash、项目和宿主绑定必须重新匹配才允许进入 COM。未保存目标、无法定位文档、重复目标、回执不匹配或文件变化均拒绝。失败保留 guard 和恢复声明，不自动再次调用。

验证：Photoshop 适配器 8 项 PASS，含执行实际生成 JavaScript 的 6 类文档边界（DOM 为专用替身）；原生任务 34 项 PASS；原恢复测试 3 项 PASS。请求篡改测试先复现触达 adapter，修复后在派发前拒绝。

## 本机恢复结果

在原项目数据库对 `att-52901594c1684782a99b689538aaebf3` 明确执行 quiesce_photoshop；实际 PowerShell COM 返回同步静止确认，退出码 0。

- documents 0→0，closed_documents=0；未关闭任何文档或共享 Photoshop 进程。
- 原 PSD 6061730 bytes / `97b0d40aca27686fd75113621ff50e5208769d18ba5f6b7d044e92bc53ffeff5`。
- 原 PNG 19413204 bytes / `53fe760caf72d6b0012cc7dfd27598311d225adaa3f440967d678c0c7202e7fd`。
- 恢复前后文件 hash 一致，并与既有迟到读回一致。
- 脚本 SHA256 `c1e6dd4629e21099fa14f86ca254aac156ab34c2c868f027677d022508ce7c36`。
- attempt 为 RECONCILING，operation 为 PAUSED_NEEDS_USER；只读数据库核对 native_host_guard_v1 为空。

没有把原未知任务提升为成功、没有补造原始回执或发布其作品。旧任务仍需单独解决；宿主可供新的独立任务使用。新增代码尚未全量验证、打入安装包、提交或上传；不能重用历史 CI 宣称当前通过。
