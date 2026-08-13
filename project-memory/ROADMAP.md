# ROADMAP — 路线图

- 版本：`1.0`｜状态：`ACTIVE`｜SSOT 角色：路线图契约

## 阶段（按任务包 J 节）

| 阶段 | 内容 | 状态 |
|---|---|---|
| J0 | Freeze / 基线 | ✅ 完成（dl/migration-r3 分支）|
| J1 | 清除产品漂移（MiniGame fixture、九份 SSOT、根 README）| 🔄 进行中 |
| J2 | 内部身份与核心重构（目录、manifest/schema、verifier 入口）| 🔄 进行中 |
| J3 | 视觉能力产品化（核心对象、intelligence、domain、quality、production、knowledge）| 待开始 |
| J4 | 工具适配器（Adapter Registry、Adobe PS、ComfyUI、MiniMax H3）| 待开始 |
| J5 | 证据、CI 与交付（evidence index、identity gate、exact-SHA CI、人工验收）| 待开始 |

## 当前批次

- 分支：`dl/migration-r3`
- 推进方式：按任务包批次小步提交，每批 `git diff --check` + 旧名扫描 + 验证
- 未授权不 commit/push/PR/merge
