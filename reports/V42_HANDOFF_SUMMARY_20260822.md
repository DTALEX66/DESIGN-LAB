# DESIGN-LAB 交接摘要 — 2026-08-22

> **HISTORICAL SNAPSHOT — NOT CURRENT EVIDENCE.** 本文件记录交接时的项目、
> 云端与运行时测试状态；不替代能力索引、运行时 attestation 或精确 SHA CI。

## Git 与云端闭环

- 交接快照基线：`fc0a2c1cd9bdc39b59522254fbfea68af7a95ddc`（`main`）。
- 该 SHA 的 Canonical Verify 已成功：
  `https://github.com/DTALEX66/DESIGN-LAB/actions/runs/32505852034`。
- `main` 已启用分支保护：5 个 Canonical Verify 必需检查、管理员强制执行、
  禁止强推与删除。
- PR #95 已合并，完成 `DL-GOV-140` 的台账回写。

## 本地验证

- `python design-lab/scripts/verify_design_lab.py`：`43/43` 通过。
- `python scripts/run_python_tests.py`：`250` 项通过（最近完整运行）。
- CI 根因修复：交接文档已显式标为历史/非当前证据，
  `verify_capability_evidence_v4.py` 与 Open Design Host Adapter verifier 均通过。

## 创意工具运行时测试

### Photoshop 2023（24.5.0）

- COM 启动与版本读回通过。
- 在 `.hermes/task-artifacts/adobe-e3-fixture/photoshop/` 中完成三次受控 fixture：
  1920×1080 PSD、可编辑图层组与文本、保存/关闭/重开读回、JPEG 预览导出、
  从备份回滚后读回。
- 三次读回均为 1920×1080、4 个图层、1 个组。
- **限制：**该 fixture 未断言调整层、蒙版和链接对象语义，故不构成完整 E3 提升证据。

### Illustrator 2023（27.5）

- COM 启动、版本读回及 1920×1080 空文档画板读回通过。
- 完整 fixture 在链接 SVG 的 COM 调用处中断；该调用会触发交互式路径处理。
- 仅创建了无标题测试文档，未生成 `.ai` 源文件、预览或证据文件；随后因未保存文档
  的安全边界暂停自动关闭操作。
- **状态：未完成，不构成 E3 证据。**继续前应由用户关闭无标题测试文档，或提供可控的
  Illustrator 自动化路径对象方式。

### Eagle 4.0.0.42

- 安装登记与既有 E1 本地只读 API 握手已确认。
- 当前没有可调用的 Eagle MCP 工具；官方 Web API V2 需要私有 token，且没有安全的
  专用测试资料库选择/创建接口。
- **状态：未完成 E2。**不得向个人资料库导入；继续前应在 Eagle 中打开或创建专用测试资料库，
  并提供当前会话可调用的 MCP/自动化接口。

## 台账与后续

- `DL-GOV-100/110/120/130/140`：已完成。
- `DL-ADP-EAG-100`：运行环境/安全测试库前置条件阻塞。
- `DL-KNW-180`：按用户指示保持延后。
- 任何 Adobe/Eagle 能力等级升级必须基于对应协议的完整可重复读回，不能由本摘要推断。
