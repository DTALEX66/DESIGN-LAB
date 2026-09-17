# Comfy HTTP客户端真实服务读回

本轮新增客户端连接实际ComfyUI0.33.1专用实例，内嵌Python3.13.14、Torch2.13.0+cu130。不是模拟HTTPServer；但工作流仅EmptyImage→SaveImage，无模型，不计十次模型生成、H3或专业设计验收。

- 控制器会话24479，exit0；专用PID11964，端口57815。
- 客户端源码SHA256：d8bb2404197bf9014aa550ac100a07ede014c9e6721ff3483c12c54e1d96fdcc。
- 真实prompt_id：59ae7dfd-59ee-4feb-96d9-3223460c6995；history completed=true/status_str=success，缓存节点列表为空。
- 产物64×64 RGB，全部像素精确为18,52,86；PNG SHA256 b0e49e6fdcd49c416d72513b0af959579be0788ccaed03bd99fab372e7134b2d。
- 输出根 `.project-local/task-runtime/comfy-http-live/bb63046b6f444fe9a7a96d0bf66f949b/`，包含launch、result、server.log、writes.jsonl和output。
- result.json SHA256 0c7a831cf5fd68a863666d127812f6e9c5d7636b2ed104cc34c648ee6bcaa309，结束后独立重算。
- Python observer共21条事件、0 denied；不外推OS/native/DLL所有IO。输入/输出/user/database/temp/缓存均指向专用项目根。
- 未改共享安装、未加载模型、自定义节点与外部API节点禁用。

专用进程完成后由其Popen持有者terminate，server exit1是主动结束方式，不计优雅退出或故障恢复通过。独立connect_ex确认57815端口关闭；未终止用户共享Comfy/Adobe进程。

运行脚本 `.project-local/task-artifacts/comfy-normalization/run_http_client.py`，复用旧server_observer.py但未改旧脚本。此控制器从生产HTTP客户端调用stats/submit/history，不用旧aiohttp请求替代新客户端。

当前证明：固定版本受控无模型真实HTTP调用与产物读回。未证明：WS、持久dispatch intent、重启对账、取消ACK、合格模型10次生成、资产服务原子发布、UI全链及H3十五秒视频。DL-R5-008保持PARTIAL，不能把这次测试扩大成生产完成。
