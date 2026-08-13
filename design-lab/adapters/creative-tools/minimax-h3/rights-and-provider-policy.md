# MiniMax H3 适配器 — 权利与 Provider 策略

- **任务**：DL-H3-001（H3 适配器）/ DL-H3-002（H3 取证）/ DL-H3-003（H3-Comfy 桥接）
- **状态**：E0 占位（declared）——运行时未就绪，不宣称可用
- **运行时**：MiniMax H3 模型（用户下载安装中）

## 权利

- H3 模型：proprietary（MiniMax 条款）——仅按用户安装/订阅使用，不 vendoring
- 生成视频：用户拥有（本工具不主张权利）
- 桥接：`h3-comfy-bridge-feasibility.md` 为可行性分析（不含受版权保护的实现）

## Provider 策略

- **模型路由**：H3 本地/官方通道，不绕行第三方代理
- **无 rate limit / 无 cost cap**：不设人为限制（遵循官方服务条款）
- **reasoning 降级**：不适用（视频生成模型）
- **凭证**：不读取 API key（用户自管官方凭据）

## 边界

- 生成物仅写入 `80-evidence/` 或 `.hermes/task-runtime/`（忽略目录）
- 不访问 `E:\`；不触碰共享运行时状态
- 进程隔离：H3 以独立进程运行，不修改宿主配置

## 取证（E3 恢复条件）

1. MiniMax H3 安装完成
2. 运行最小生成任务（短视频片段）
3. 记录：任务 ID + 产物路径/hash + 退出码（E3 四要素）
