# ComfyUI 适配器 — 权利与 Provider 策略

- **任务**：DL-CFY-001（ComfyUI 适配器）/ DL-CFY-002（ComfyUI 取证）
- **状态**：E0 占位（declared）——运行时未就绪，不宣称可用
- **运行时**：ComfyUI（用户下载安装中）

## 权利

- ComfyUI 本体：GPL-3.0（开源）；自定义节点许可各异（使用前逐节点核验）
- 生成资产：用户拥有（本工具不主张权利），但**商用/分发权利受模型许可与 Provider 条款约束**
- 模型权重：各自许可（MiniMax H3 为 proprietary；产物 sidecar 已标 redistributable=false / commercialUse=false，待人工按模型条款审核）
- H3 产物权利：见 minimax-h3 evidence sidecar（内部验证用，未验证分发/商用）

## Provider 策略

- **模型路由**：ComfyUI 本地推理（loopback-only，绑定 127.0.0.1），不走远程 provider
- **启动**：手动启动（manual launch）——用户自行启动 ComfyUI 后适配器才可连接
- **无 rate limit / 无 cost cap**：本地 GPU 推理，不设人为限制
- **reasoning 降级**：不适用（推理在模型自身，不干预）
- **凭证**：不读取、不存储任何 API key（本地节点除外，用户自管）

## 边界

- 生成物仅写入 `80-evidence/` 或 `.hermes/task-runtime/`（忽略目录）
- 不访问 `E:\`；不触碰共享运行时状态
- 进程隔离：ComfyUI 以独立进程运行，不修改宿主配置

## 取证（E3 恢复条件）

1. 用户安装 ComfyUI 完成
2. 运行 loopback workflow（txt2img 最小图）
3. 记录：任务 ID + 产物路径/hash + 退出码（E3 四要素）
