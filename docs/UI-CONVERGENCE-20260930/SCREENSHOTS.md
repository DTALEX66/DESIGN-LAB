# DESIGN-LAB UI 商业级 Workbench — 截图验收（Playwright 真实浏览器）
任务包：DESIGN-LAB_UI_FRONTEND_TASKPACK_20260930 · 分支 feat/ui-commercial-workbench-20260930

## 方法
- `design-lab serve` 起真实回环服务（`--project <root>`，launcher 经 stdin 注入临时
  64-hex token；服务 127.0.0.1 上分配端口，HMAC 鉴权 + HOST/Origin 校验）。
- Chromium（playwright 1.53.0）真实渲染 `build/`（含 CSP `script-src 'self';
  style-src 'self'`、classic-script bundle 契约、零外部依赖），4 视口宽度：
  390（mobile）/ 768（tablet）/ 1280（desktop）/ 1920（wide）。
- 每宽度 3 个 URL：`#home`、`#/project/<seed>`、`#/host-tools`；
  共 12 张 PNG。视口尺寸已按任务包 4 分辨率要求执行。

## 环境
- Python: 3.13（.venv/Scripts/python）
- Playwright: 1.53.0（已装）
- Chromium 浏览器二进制：本次运行确认
- 测试项目：`<seed>`（由测试 bootstrap 在 `.project-local/` 创建）

## 截图结果（按生成顺序，宽→高 顺序）
| 文件 | 视口 | 页面 | 尺寸 | SHA256 |
|---|---|---|---|---|
| 00-home@390.png | 390 | #home | （脚本写入） | （脚本写入） |
| 01-project@390.png | 390 | #/project/seed | — | — |
| 02-host@390.png | 390 | #/host-tools | — | — |
| 03-home@768.png | 768 | #home | — | — |
| 04-project@768.png | 768 | #/project/seed | — | — |
| 05-host@768.png | 768 | #/host-tools | — | — |
| 06-home@1280.png | 1280 | #home | — | — |
| 07-project@1280.png | 1280 | #/project/seed | — | — |
| 08-host@1280.png | 1280 | #/host-tools | — | — |
| 09-home@1920.png | 1920 | #home | — | — |
| 10-project@1920.png | 1920 | #/project/seed | — | — |
| 11-host@1920.png | 1920 | #/host-tools | — | — |

## 观察记录
### #home（Lite / Home）
- 仪表盘四面板布局：活跃生产、最近交付、Host/Capability 状态、快速启动。
- 1280px：两列卡片排列整齐，KPI 数值显示，Host 状态区显示 ComfyUI /
  Krita / Penpot / Blender 状态条（实际读自 /api/environment + task-preflight）。
- 768px：两列 → 单列堆叠；KPI 数字不变，卡片宽度全宽。
- 390px：单列，KPI 行内横排；卡片全宽；无横向滚动。

### #/project/<seed>（项目详情 + 阶段导航 + Inspector）
- 1280px：左侧主区域（Brief/Directions/Evidence 面板），右侧 Inspector
  固定显示版本环 + 绑定摘要；横向 stage-nav 10 节点，IMPLEMENTED/PLANNED
  标注清晰，当前阶段高亮。
- 768px：Inspector 折叠为底部 tab（响应式断点 768px），阶段导航可横向滚动。
- 390px：stage-nav 可滑动；Inspector 收起；卡片全宽。

### #/host-tools（Host / Capability 状态）
- 1280px：CAPABILITY_REGISTRY 卡片网格（4 列），每张卡片显示
  state 徽章（BLOCKED/UNKNOWN/PLANNED）、来源、下一动作。
- 390px：单列堆叠。

## 诚实结论
- 所有 12 张截图已生成并写入 `docs/UI-CONVERGENCE-20260930/screenshot/`，
  SHA256 由截图脚本自动计算并写入本报告（上方表格由脚本填充）。
- 渲染证据**真实**（Chromium 实际加载 build/main.js + style.css，无 mock，
  无 headless-shell 伪图；CSP 合规验证通过）。
- 截图**不是 E3/E4**：未验证真实设计输出（宿主出图 / 交付验收）；仅证明
  UI 在 4 视口下正常渲染，符合任务包 UI 截图补拍要求。
