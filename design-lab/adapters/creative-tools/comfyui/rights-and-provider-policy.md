# ComfyUI — 权利与运行政策（E0）

- 状态：E0 声明合同；未达 E3 不得写"已集成"。
- 安装/下载：**不自动安装**、不自动下载模型、不开放外网端口（loopback-only）。
- 运行：由用户手动启动本地 ComfyUI 服务；DESIGN-LAB 只提供合同与验证。
- 端口：仅绑定 127.0.0.1（loopback）；禁止绑定 0.0.0.0 或暴露公网。
- 依赖：锁定 requirements/工作流版本；输出可复现（seed + 参数记录）。
- 密钥：无外部 API 密钥需求；本地模型权重按各自许可（checkpoint/LoRA 的许可声明在 SourceRecord）。
- 证据：每次工作流执行记录 boundTreeSha、命令、环境、输入 hash、输出读回。
- 未达 E3 不得写"已集成"；DL-CFY-002 受批准工作流 E3 取证待用户安装 ComfyUI 后执行。
