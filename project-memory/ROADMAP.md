# ROADMAP — 路线图

- 版本：`1.1`｜状态：`ACTIVE`｜SSOT 角色：路线图契约

## 阶段（按任务包 J 节）

| 阶段 | 内容 | 状态 |
|---|---|---|
| J0 | Freeze / 基线 | ✅ 完成（dl/migration-r3 分支）|
| J1 | 清除产品漂移（MiniGame fixture、九份 SSOT、根 README）| ✅ 完成（PR #15）|
| J2 | 内部身份与核心重构（目录、manifest/schema、verifier 入口）| ✅ 完成（PR #15）|
| J3 | 视觉能力产品化（核心对象、intelligence、domain、quality、production、knowledge）| ✅ 完成（PR #15 + #16）|
| J4 | 工具适配器（Adapter Registry、Adobe PS、ComfyUI、MiniMax H3）| ✅ 完成（E0 合同层，PR #15）|
| J5 | 证据、CI 与交付（evidence index、identity gate、exact-SHA CI、人工验收）| 🔄 部分完成：DL-EVD-001/CI-001/002/003 ✅；**DL-REL-001 人工验收待用户** |

## 已完成交付（截至 main `5e94d5d`）

- 身份迁移 R3：旧名 `opendesign-assistance` 已退出活动命名 → `design-lab`（427 文件 git mv，历史可追踪，详见历史归档）
- 九份活动 SSOT + 13 核心对象（schemaRef 13/13 可解析）+ 6 E0 适配器合同
- identity gate / unified verifier / MiniGame fixture 边界测试 / CI 4 gate 全绿
- 外置资料库 `D:\All projects\Design assets` 仅登记（DL-KNW-000），零读取

## 待人工任务（需用户参与）

| 任务 ID | 工作 | 前置/说明 |
|---|---|---|
| DL-KNW-001 | 人工资料审核：从 Design assets 生成 SourceRecord | 需用户选定允许只读扫描的子目录 |
| DL-ADB-PS-001 | Adobe Photoshop E3 取证 | 需真实运行时（Photoshop 宿主）逐项取证 |
| DL-CFY-001 | ComfyUI E3 取证 | loopback-only；需真实运行时 |
| DL-H3-001 | MiniMax H3 E3 取证 | 需真实 API 调用（仅服务视频/动效/声音/多模态）|
| DL-REL-001 | 人工可视与生产验收 | UI/UX、平面、3D、游戏视觉各至少一个有效案例 |
| DL-CI-004 | release exact-SHA gate | 需以上 E3/验收完成后启用 |

## 推进规则

- 未授权不 commit/push/PR/merge；人工任务逐项确认后推进
