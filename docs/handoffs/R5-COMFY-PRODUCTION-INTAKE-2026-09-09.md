# R5 Comfy生产接入：代码核对与下一切片边界

## 已核对的代码事实

定向搜索src/design_lab、design-lab/tests、packages和integrations中Python/TS/JS代码：ComfyTask/WorkflowPin/TaskResult的实例化仅见test_comfy_task_protocol.py；没有找到可复用的生产/prompt、/history、/interrupt客户端。integrations/generators/comfyui为manifest、策略和证据材料，不是传输实现。一次错误搜索design-lab/providers目录不存在，随后改用实际存在目录检索，未据该错误推断软件未安装。

现有 `src/design_lab/runtime/job_store.py` 已提供PENDING、RUNNING、OUTCOME_UNKNOWN、CANCEL_REQUESTED、RECONCILING、RECEIPTED状态与事务，复用它而不新建平行任务真值。

## 必须继承的实机语义

来源：`docs/decisions/R3-COMFY-ENTRY-LIVE-2026-09-07.md`，属于历史实机报告，本轮未重跑。

- 专用实例曾实测REST提交、WS sid绑定、execution_success、history读回。
- 同一图重新提交可能execution_cached且不新增文件，不能计一次新生成。
- Comfy重启后原prompt history为空，但产物仍在。因此历史消失不能直接判失败重发，更不能凭产物存在宣称恢复完成。
- 默认生产策略仍为用户手动启动后连接；专用诊断实例启动不自动改变默认策略。

## 实现顺序与验收要求

1. 项目拥有的提交计划：绑定真实图拓扑/参数、输入文件、节点模型hash、实例身份与输出根；拒绝不合格模型。图与节点指纹不能只依赖名称。
2. 持久dispatch intent先于网络发送；收到prompt ID后持久绑定。发送响应丢失应OUTCOME_UNKNOWN，禁止透明重发造成重复生成。
3. loopback受控客户端：有界响应/超时、拒绝redirect及任意外部URL；只允许规定端点，不开放通用HTTP代理或任意路径读写。
4. 按已绑定prompt ID接续WS/history；分开cache hit、新生成、失败、取消请求和真实停止ACK。共享实例的全局interrupt不能冒充单任务取消。
5. 产物根用项目路径策略解析，拒绝穿越/reparse，读回实际hash；经既有资产事务发布，再提交RECEIPTED，不能先报成功后拷文件。
6. 重启对账必须使用本地已保存的请求、实例、prompt、产物和回执。证据不足保留未知状态与占用，不通过过期锁或清空历史恢复。
7. 固定合格模型图连续10次记录，再分别跑取消/失败/断线恢复；无模型EmptyImage只能用于传输控制测试，不抵扣10次模型生成。

实现前先为网络响应丢失、跨任务事件、缓存复用、错误产物根和重启history丢失建立负例。真实服务采用已登记portable，所有诊断产物留本项目，不改共享安装、不启动未合格H3。

## 当前状态

这是代码与历史语义核对后的接入拆分，PLANNED，不是IMPLEMENTED或实机验收。已完成的结构拒绝修复见R5-COMFY-STRUCTURAL-REJECTION-2026-09-09.md；DL-R5-008继续PARTIAL，H3十五秒视频仍独立未验收，不阻塞Adobe M1。
