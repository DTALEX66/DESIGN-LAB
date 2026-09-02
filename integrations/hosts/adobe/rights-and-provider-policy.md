# Adobe Photoshop 适配器 — 权利与 Provider 策略

- **任务**：DL-ADB-PS-001（Photoshop 适配器 E3）
- **状态**：E0 占位（declared）——运行时未就绪，不宣称可用
- **运行时**：Adobe Photoshop（用户侧安装，需订阅）

## 权利

- Photoshop 本体：proprietary（Adobe 订阅制）——仅作为运行时宿主，不 vendoring
- 脚本契约：通过官方脚本/UXP 接口调用（不逆向、不破解）
- 生成资产：用户拥有（本工具不主张权利）

## Provider 策略

- **模型路由**：本地 Photoshop 进程，不走远程 provider
- **无 rate limit / 无 cost cap**：本地执行，不设人为限制
- **reasoning 降级**：不适用（Photoshop 非模型推理）
- **凭证**：不读取 Adobe 账号凭据；订阅状态用户自管

## 边界

- 生成物仅写入 `80-evidence/` 或 `.hermes/task-runtime/`（忽略目录）
- 不访问 `E:\`；不触碰共享运行时状态
- 进程隔离：Photoshop 以独立进程运行（脚本宿主），不修改宿主配置

## 取证（E3 恢复条件）

1. Photoshop 运行时可用
2. 执行最小可编辑交付任务（PSD 导出）
3. 记录：任务 ID + 产物路径/hash + 退出码（E3 四要素）
