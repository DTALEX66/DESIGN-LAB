# ROADMAP — 路线图

- 版本：`1.2`｜状态：`ACTIVE`｜SSOT 角色：路线图契约

## 阶段（按任务包 J 节）

| 阶段 | 内容 | 状态 |
|---|---|---|
| J0 | Freeze / 基线 | ✅ 完成（DL-MIG-000/001/002）|
| J1 | 清除产品漂移（MiniGame fixture、九份 SSOT、根 README）| ✅ 完成 |
| J2 | 内部身份与核心重构（目录、manifest/schema、verifier 入口）| ✅ 完成 |
| J3 | 视觉能力产品化（核心对象、intelligence、domain、quality、production、knowledge）| ✅ 完成（含 Jury V1 + Preflight V1）|
| J4 | 工具适配器（Adapter Registry、Adobe PS、ComfyUI、MiniMax H3）| 🔄 E0 合同全就绪；**E3 取证待运行时** |
| J5 | 证据、CI 与交付（evidence index、identity gate、exact-SHA CI、人工验收）| 🔄 DL-EVD-001/CI-001..004 ✅；**DL-REL-001 人工验收待用户** |

## 已完成交付（截至 main `f156ce2`）

- 34/34 任务有产物；Definition of Done 13/13 通过
- 身份迁移 R3：`opendesign-assistance` → `design-lab`（git mv，历史可追踪）
- 九份 SSOT + 13 核心对象 + 6 E0 适配器合同 + Visual Quality Jury V1 + Production Preflight V1
- DL-KNW-001 三批吸收：8 个 MIT/CC0 设计 SKILL 源码级 vendoring（hallmark/taste-skill/huashu-design/uiux-pro-max/motion×2/shipit-ui/design-checklist）
- SOURCE_REGISTRY 124 条（schema 校验通过）
- identity gate / unified verifier（9 检查）/ MiniGame fixture 边界 / CI 5 gate 全绿

## 待人工/运行时任务（自动推进已尽）

| 任务 ID | 工作 | 前置 |
|---|---|---|
| DL-ADB-PS-001 | Photoshop E3 取证（可编辑 PSD 交付）| Photoshop 运行时 |
| DL-CFY-001/002 | ComfyUI E0/E1 检查 + 受批准 workflow E3 | **用户下载安装 ComfyUI**（暂停中）|
| DL-H3-001/002/003 | MiniMax H3 E0 + provider qualification + bridge | **用户下载安装 H3 模型**（暂停中）|
| DL-REL-001 | 人工可视与生产验收（UI/UX、平面、3D、游戏视觉各 ≥1 案例）| 人工选择案例 |
| DL-CI-004 启用 | release exact-SHA gate | 上述 E3/验收完成后 |

## 推进规则

- 未授权不 commit/push/PR/merge；人工任务逐项确认后推进

