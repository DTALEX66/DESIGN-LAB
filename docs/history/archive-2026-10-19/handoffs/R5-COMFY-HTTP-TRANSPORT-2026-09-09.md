# Comfy受限HTTP传输第一切片

新增 `src/design_lab/generators/comfy_http.py` 与真实loopback测试。端点依据已登记portable的公开server.py核对：GET /system_stats、GET /history/{prompt_id}、POST /prompt。未启动或修改共享Comfy安装。

客户端固定127.0.0.1，仅接受整数端口和限定任务/client ID；固定10秒socket超时、4MB请求/响应上限，无redirect跟随、自动重试、通用URL接口、全局interrupt或进程控制。提交前JSON序列化拒绝非有限数，缺失合法prompt_id或网络/非200结果均保留outcome_unknown=True。

测试先因模块缺失失败（3 import errors，属于未实现而非环境缺依赖），实现后 `unittest discover -s design-lab/tests -p 'test_comfy*.py'` 为18 tests /1.526秒，OK，exit0。三项新测试使用实际HTTPServer和socket：固定stats端点、POST服务端读到请求但关闭连接时仅发送一次且报告未知、非法端口和任务路径不发请求。服务端替代Comfy边界，因此只算本地传输集成，不算真实Comfy或模型验收。diff --check通过。

## 必须接续

尚未接入ProjectService/Operation/Attempt，尚无dispatch intent持久化、模型资格门、图指纹、WS、产物读回和发布。调用submit的上层必须先完成这些门，不能直接从UI开放任意图。还需补成功submit/history、redirect、畸形/重复键JSON、有界响应等负例，并对实际Comfy专用实例验证。

DL-R5-008继续PARTIAL；此前953项全量不涵盖此后新增传输文件。此切片没有生成模型图片/H3视频，没有上传、修改全局配置或关闭共享进程。

## 后续响应边界补测

真实loopback测试扩展为成功提交/历史查询的图与ID读回、302不跟随、重复JSON键及NaN/Infinity/数值溢出拒绝。四个异常JSON负例在修复前均未抛出错误；加入重复键拒绝和非有限值检查后，Comfy相关21 tests /3.061秒、OK、exit0，diff --check通过。此前“还需补成功submit/history、redirect、重复键JSON”已由本轮覆盖，真实Comfy服务和响应大小/慢连接边界仍需补测。

socket的10秒为I/O超时，不是整个请求总时限；当前不能声称可抵抗持续慢速分块响应。生产持久任务整合前必须保留此限制。

## HTTP截断拒绝

新增负例：服务声明Content-Length为12但只发送合法JSON `{}` 后关闭。修复前9项HTTP测试中该项失败，说明read(上限)接受短消息而不会自动抛出IncompleteRead。修复后检查HTTPResponse剩余声明长度，非零时拒绝，不能因JSON本身完整而认可未收齐的HTTP消息。

另验证超4MB提交在打开socket前失败，200但缺prompt_id保持outcome_unknown且只发送一次。Comfy合计24 tests /4.096秒、OK、exit0，diff --check通过。仍为专用loopback测试，不是Comfy模型验收，慢流总截止时间尚待补齐。

## 总时限补齐（后继结果）

新增真实socket慢流负例：每0.03秒写1字节，测试仅将总时限常量缩短到0.15秒。原实现10项HTTP测试中该例失败，证明持续小片段可延长旧I/O超时。实现连接起始monotonic总时限，连接完成后用剩余时间的Timer shutdown本请求持有的socket，并在返回前再核对截止时间；finally取消Timer。默认10秒，不终止任何宿主进程，不自动重试提交。

修复后Comfy合计25 tests /4.313秒、OK、exit0，diff --check通过。此结果取代前文“慢流总时限未补齐”的当前实现描述；前文保留为历史测试顺序。真实Comfy服务、任务持久化、资格门、产物发布和模型基准仍未完成。
