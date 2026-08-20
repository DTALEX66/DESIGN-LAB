# Neutrality & Tool Adapter Policy（ODA4-0206）

## 五种中立（不可绑定单一）
- **模型中立**：不把任一模型写死；通过受控 Agent/媒体适配器接入。
- **风格中立**：Apple/黑金/科技蓝/HUD/大师风格不是全局默认。
- **领域中立**：公共内核服务所有领域；领域包不污染公共内核。
- **工具中立**：没有主入口；Open Design、Figma、Penpot、Blender、FFmpeg 等均为可替换适配对象。
- **权利中立**：每项来源/素材/字体/模型/标准有权利状态与使用模式。

## Adapter 合同
- 每个下游工具必须声明 `adapter-contract`：工具名、能力清单、状态（available/missing/process-isolated/unsupported）、模式、许可、回退。
- **大型工具进程隔离**：Blender、FFmpeg、3D/视频等大工具必须进程隔离，禁止整仓 vendoring。
- **能力可读**：缺失/不支持状态必须明确，不允许假装可用。

## 能力协商
- 每次调用先读取目标 Adapter 的能力状态；
- 缺失能力 → 明确 `missing`/`unsupported`，回退到 fallback；
- 不可静默降级为"看起来能用的假输出"。

## 边界
- 不绑定单一模型/风格/领域/下游工具。
- 受控适配器只做能力接入，不做未授权 vendoring。
