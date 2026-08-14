# comfyui — 取证目录

- **任务**：DL-CFY-001/002
- **当前状态**：**E0 占位（当前树未执行）**。
- 本轮未启动 ComfyUI、未启动 MiniMax H3、未下载模型、未执行工作流，也未把外部运行时状态当作当前证据。
- 目录中的旧运行记录已经标记为历史候选记录，不绑定当前 exact SHA，不得用于 E3/E4 晋级或发布 gate。

## 当前可证明范围

- 仅证明仓库侧 adapter manifest、loopback/manual-launch policy 和证据目录结构存在。
- 禁止自动安装、自动下载、外部端口和隐式启动。
- 重新晋级必须在明确授权后完成真实 runtime requalification，并同时提供当前 exact tree、runtime ID/version、task ID、artifact/provenance 和 read-back。

## 权利与边界

- ComfyUI 和模型不进入仓库 vendoring 路径。
- 当前没有任何 H3/ComfyUI 运行状态、GPU 状态、模型下载状态或生成物被认定为本轮结果。
