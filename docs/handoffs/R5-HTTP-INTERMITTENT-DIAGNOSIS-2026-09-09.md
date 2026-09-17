# R5 HTTP 间歇错误接续诊断

## 本轮实测

基线 HEAD：a06c1db01944faca6c8dd41b8fe22f651138a400，加当前未提交工作区改动。没有修改 HTTP 产品实现或加入重试。

用项目 `.venv/Scripts/python.exe -B -X utf8`，向 sys.path 添加 `design-lab/tests`，构造 100 个 `test_native_patch_submissions.NativePatchSubmissionTests.test_http_patch_route_scoped_fields_and_idempotency` 实例并顺序执行。工具会话 94146：100 tests / 66.297 秒，OK，exit 0。真实 loopback HTTP、临时 SQLite 和资产目录；Adobe 外部 dispatch 是夹具，不能计宿主验收。

每次覆盖正常提交、幂等重放、非法字段、缺认证及跨项目拒绝。没有忽略 socket 异常、跳过断言或失败自动重试。

## 根因状态：未确认

源码检查：`http_service.py` 的 guard 在读取 body 之前拒绝无认证请求；`send_json` 写出带 Content-Length 的 JSON，声明 Connection:close。未消费 body 与 Windows 连接关闭之间的关系仍是假设，不是证实根因。测试树定向搜索未发现 setdefaulttimeout 或 SO_LINGER 的修改；这不能排除其他环境因素。

上一轮完整 953 项仍有 WinError10053，独立 100 次成功不能将其改为 PASS。原始结果保留在 `R5-PHOTOSHOP-FULL-REGRESSION-2026-09-09.md`，不覆盖其 hash 绑定。

## 下一步

1. 若再次跑全量，使用逐项 verbose 输出绑定同一个运行句柄，不因观察超时重启。
2. 若复现，记录不含请求正文或凭据的测试名、连接阶段、异常类型和时序，比较失败前的测试与独立执行环境。
3. 根因被复现前，不修改认证顺序、无界读取未认证 body、关闭共享进程或加入掩盖错误的重试。

当前结论：针对测试 PASS；全量回归 FAIL 未收口；当前提交 CI、发布与云端读回 NOT EXECUTED。
