# R5 队列与 RIR 安装包接续

本次只验收安装/导入切片，不代表 Adobe 页面产品链或整项 R5 完成。

- 源码公开入口 `design_lab.reconstruction` 指向现有单一实现；未复制算法。
- wheel 排除源码桥接 initializer，由 force-include 放入正式 initializer。
- 首次构建发现重复归档条目，修正后归档 62 项无重名，未包含 `.project-local` 数据。
- 离线构建产物：`.project-local/task-artifacts/wheel-r5-queue-fixed/design_lab-0.1.0a0-py3-none-any.whl`。
- SHA256：`e71b1759b7ead8105f53deb7235f6d3790b0aa95d118926c40f654c53313fe17`。
- 安装到既有项目隔离环境 `.project-local/task-runtime/workbench-installed`，未做全局安装。
- Python 3.13.14，使用 `-I -B -X utf8` 从非源码工作目录执行，成功导入 RIR、NativeTasks、TaskCommands，并完成有效 RIR 校验与规范 hash。
- 测试 RIR hash：`a761f69c5147dd84f2639cdf85cd47dfeeb16984285bcff5449763fa248247b5`。
- 旧 wheel 位于 `.project-local/task-artifacts/wheel-f2f8c79/`，保留用于回退；本轮未执行回退。

构建曾提示项目内 uv cache 可能被打包，实际归档检查未发现该路径；运行数据继续遵守项目内边界。

尚未验证：新 wheel 的真实 Adobe 执行、完整 RIR→原生交付、浏览器提交、升级后恢复、精确 SHA CI 与云端发布。
