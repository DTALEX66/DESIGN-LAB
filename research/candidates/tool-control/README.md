# Tool Control Archive（设计软件操控方案库，2026-08-19）

> 网上已验证方案的留存归档：以后需要时直接取用，不必重新找/写。来源与许可逐项核实。

## 一、已验证可执行通道（本机实测）

| 通道 | 工具 | 状态 | 运行时 |
|---|---|---|---|
| Photoshop MCP（alisaitteke，MIT，90+ 工具） | PS 2012-2025+ | ✅ 连接+枚举验证（本机 PS 2023 24.5） | .hermes/task-runtime/ps-mcp/ps-mcp-win/（node dist/index.js） |
| Illustrator MCP（ie3jp，MIT，66 工具） | AI CC 2024+ | ⚠️ 连接 OK，版本门（本机 AI 2023 被拒） | .hermes/task-runtime/ai-mcp/ai-mcp/ |
| opencode CLI（Open Design） | Open Design | ✅ 真实作品（G2） | D:/Programs/Open Design |
| ComfyUI HTTP API | ComfyUI/H3 | ✅ E3 | 127.0.0.1:8188 |
| ffmpeg CLI | 通用 | ✅ 抽帧/转码实证 | 共用库 scoop |

## 二、网上已验证脚本方案（归档）

| 方案 | 来源 | 许可 | 文件 | 本机状态 |
|---|---|---|---|---|
| adobe-illustrator-scripting SKILL（AI 脚本+对象模型参考，35KB） | github/awesome-copilot | MIT | adobe-illustrator-scripting-SKILL.md | 参考（AI 2023 版本门，升级后可用） |
| photoshop-automator SKILL | abdul-karim-mia/photoshop-automator | 未核实 | photoshop-automator-SKILL.reference.md | 仅参考（许可未核实不吸收） |

## 三、文件级方案（不操作软件本体，解析/生成文件）

| 库 | 许可 | 用途 | 状态 |
|---|---|---|---|
| psd-tools（Python） | MIT | PSD 解析/渲染 | 候选（操作层参考） |
| ag-psd（JS） | MIT | PSD 读写 | 候选（操作层参考） |
| sharp / resvg | Apache-2.0 | 图像处理/SVG 渲染 | adapter 候选 |
| @figma/rest-api-spec | MIT | Figma REST 契约 | adapter 候选 |

## 四、官方文档入口（最全功能面）

- Adobe UXP/ExtendScript 文档：github.com/AdobeDocs/uxp（Apache-2.0）
- 对象模型参考：见 adobe-illustrator-scripting SKILL 内嵌

## 五、本机限制（诚实）

- PS：MCP 稳定可用（90+ 工具子集，非全功能）；直接 JSX 不稳定（会话问题）
- AI：需升级 CC 2024+（MCP 66 工具才可执行）
- 任何自动化都是 API 暴露子集，非 PS/AI 全功能
