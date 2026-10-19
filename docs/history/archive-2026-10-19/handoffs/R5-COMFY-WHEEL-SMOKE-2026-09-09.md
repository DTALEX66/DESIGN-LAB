# 最新Comfy客户端wheel与独立安装smoke

离线uv build生成 `.project-local/task-artifacts/wheel-comfy-http/design_lab-0.1.0a0-py3-none-any.whl`，143475字节，SHA256 `0ccdbb652826d1ba811823ea745cc2a68839d5ef0520682e6e9d69d2afbc9204`。

独立读取ZIP，逐字节核对comfy_http.py、comfy_task.py、workbench/main.ts、Photoshop JSX共4个关键资源与当前源文件一致。包内无.project-local、.hermes、uv-cache条目。构建器提示源内cache可能被收入，实际检查未发现；不为去警告改写全局路径。

新建专属 `.project-local/task-runtime/comfy-http-installed`，离线安装该wheel及16项解析依赖；没有覆盖此前workbench-installed。Python3.13.14，从 `.project-local/task-runtime/tmp` 用安装解释器-I -B导入客户端，实际__file__位于新环境site-packages，生成合法WorkflowPin指纹，exit0。

边界：这是安装与导入smoke，不是安装版完整设计/Comfy模型工作流、升级回滚或exact-SHA release。依赖由离线wheel安装解析，并非本轮按uv.lock逐项一致性证明。wheel仍为同版本0.1.0a0的新hash，未上传或发布。原安装环境与此前wheel保留，未删改。

当前全量953项报告早于Comfy源码变化；新增Comfy25项定向通过及源码客户端真实无模型Comfy测试另有记录，不合并成新全量通过声明。
