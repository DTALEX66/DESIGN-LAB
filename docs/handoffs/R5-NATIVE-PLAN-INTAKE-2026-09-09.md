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
