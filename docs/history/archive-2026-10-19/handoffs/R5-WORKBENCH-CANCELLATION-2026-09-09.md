# R5 工作台取消请求接续

范围：DL-R5-004 / DL-R5-010 的增量实现，不代表整项验收。

## 实现

- POST `/api/projects/{project}/tasks/{native-job}/cancel` 仅接受 `attempt_id`。
- 复用 loopback / Host / Origin / Bearer 防护；绑定项目、原生任务和具体 attempt。
- 数据库写入时再次检查 attempt 是否仍为当前项，旧页面不能取消新重试。
- 工作台为 PENDING、RUNNING、OUTCOME_UNKNOWN 原生任务提供请求按钮；提交后读取任务列表。
- RUNNING 只转 CANCEL_REQUESTED，重复请求幂等；不释放原生宿主 guard，不写取消确认。
- 终态拒绝重写。响应不是宿主停止凭据，也不授权终止共享进程。

## 本地验证

- 项目解释器 `.venv/Scripts/python.exe`。
- `-B -X utf8 -m unittest discover -s design-lab/tests -p test_service_http.py -q`：22 项通过，真实 CLI 子进程、HTTP、SQLite；宿主边界为受控 fixture。
- `-B -X utf8 -m unittest discover -s design-lab/tests -p test_workbench_native_ui.py -q`：5 项通过，实际工作台脚本在 Node VM 执行，DOM/fetch 为测试边界，不是实际浏览器验收。
- HTTP 覆盖未授权、跨项目、字段错误、旧 attempt、终态、重复请求与 guard/ack 不变。
- UI 覆盖按钮操作、attempt 请求体、刷新后的状态及未确认停止提示。

## 未完成

真实浏览器操作、Adobe cancellation ack、当前安装包刷新、原生提交/patch 页面入口尚未由本片段验收。
请求受理后的宿主执行可能完成而非取消，最终状态必须以宿主读回和任务持久化记录为准。
精确提交 CI 和云端上传另行核验，本文件不声明双端一致。
