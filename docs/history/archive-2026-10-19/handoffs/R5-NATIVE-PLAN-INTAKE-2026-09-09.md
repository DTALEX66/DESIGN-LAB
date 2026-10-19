# R5 对象计划提交接续

范围：DL-R5-010 / DL-R5-013 的内部准备及 HTTP 排队切片。

接口：POST `/api/projects/{project_id}/native-plans`，仅接受 `host`、`rir`、`text_styles`、`idempotency_key`。
`host` 仅 photoshop / illustrator。RIR 的 raster.path 在客户端合同中必须是本项目已导入的 img-ID，不能是文件路径。

服务端核对素材 hash 与项目归属，在新的 native-plans 子目录暂存原始字节，再调用现有 RIR 转换生成内部任务。
短序号输入名避免 Windows 深目录触发文件名长度问题；客户端对象计划不被就地修改。
同一项目、宿主、幂等键绑定同一计划 hash；不同内容返回 409。
OS 锁避免同键并发准备，job 持久化后调用既有 enqueue，不在 HTTP 请求内执行 Adobe。
请求失败遗留目录保留，不清理或覆盖用户文件。入队后响应丢失，重试复用同一 attempt。

验证：5 项 native_plan 测试、2 项 native_submissions 测试、23 项 HTTP 测试通过。
HTTP 测试使用真实 CLI 子进程与 SQLite；提交仅验证 PENDING，不是 Adobe 实机证据。
覆盖：双格式准备、跨项目与任意路径拒绝、素材篡改、非空目录拒绝、幂等冲突和丢失响应接续。

未完成：服务端后台进程启动、页面计划编辑/提交、计划级 patch、宿主全链实测、最终人审与发布。
当前安装隔离环境尚不包含本提交层；需下一次 wheel 刷新。云端发布与 exact-SHA CI 未由本切片验证。

## 后续本地实现：后台启动与高级页面输入

- `/tasks/{job}/run` 接受具体 attempt_id，只允许 PENDING；跨项目、旧 attempt 和终态拒绝。
- 每个服务实例最多两个工作进程，同一存活 attempt 不重复启动；宿主层仍使用持久化 guard。
- worker 使用固定 Python CLI，不接收任意命令或脚本；后台窗口隐藏，不在服务关闭时杀死共享宿主。
- 工作台提供高级 RIR/文字样式 JSON 编辑与排队、显式启动、取消请求和完成后导出。
- 页面输入不是自动参考拆解，也不是完整对象级编辑器；不自动启动提交内容，不代签人审。
- 本地针对测试：HTTP 24 项、NativeTasks 29 项、实际工作台脚本 VM 7 项通过。
- 一个真实 CLI 子进程使用无效尺寸任务，证明 pre-dispatch 拒绝落为 FAILED；未调用 Adobe，不作为宿主制作证据。
- 浏览器交互、当前 wheel 更新、真实 Adobe 全链仍待验证。原“尚未实现”的描述保留为该阶段历史，不应覆盖本段的新进展。
