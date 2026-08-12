# OP 个人专家套件 — 官方安装与说明

## 是什么

把本仓库的 UI/UX 五黄金案例方法与设计系统转成 **Open Design Personal Skills**（`source: user`），使 OP 在当前个人 Workspace 的所有项目中都能按这些方法工作。

## 已配置的技能

| 技能 | 类别 | 用途 |
|---|---|---|
| `mobile-task-flow-designer` | ui-ux | 移动端任务流（预约/订单/客服） |
| `b2b-backoffice-designer` | ui-ux | B2B 后台/运营工作台 |
| `ecommerce-pdp-designer` | ui-ux | 电商 PDP/结算 |
| `settings-accessibility-designer` | ui-ux | 设置页/无障碍中心 |
| `responsive-content-designer` | ui-ux | 响应式内容页 |
| `uiux-commercial-light-system` | design-systems | 跨案例商业设计系统 |

六个技能均保留 OP 原生 frontmatter：`name`、`description`、`triggers`、`od.mode`、`od.category`、`od.upstream`。

## 安装（Open Design 0.19+ 官方 Personal Skill 流程）

先启动 Open Design，然后从仓库根目录运行：

```bash
python opendesign-assistance/scripts/install_op_expert_suite.py
```

脚本会自动：

1. 从 OP 的 `logs/web/latest.log` 发现当前 Web sidecar；
2. 调用 `GET /api/workspace/directory` 选择当前 Personal Workspace；
3. 调用带 Workspace 身份的 `GET /api/skills` 检查现有技能；
4. 对缺失项调用 OP 官方 `POST /api/skills/install`。

默认对已安装技能执行 `skip`，不会擅自覆盖。仓库技能源更新后，显式运行：

```bash
python opendesign-assistance/scripts/install_op_expert_suite.py --refresh
```

`--refresh` 也只调用 OP 官方 `DELETE /api/skills/:id` 和 `POST /api/skills/install`，不直接修改数据库。

只预览动作：

```bash
python opendesign-assistance/scripts/install_op_expert_suite.py --dry-run
```

## 验证标准

当前 Personal Workspace 的 `GET /api/skills` 应包含六个目标技能，并满足：

```text
source=user
mode=design-system
hasBody=true
```

OP 会为每个 Personal Skill 自动管理归属记录；安装脚本不直接操作该内部记录。

## 存储位置

- 仓库源（唯一权威）：`opendesign-assistance/op-expert-suite/skills/<name>/SKILL.md`
- OP 桌面用户技能目录（由 OP 官方 API 管理）：`%APPDATA%\Open Design\namespaces\release-stable-win\data\skills\<name>\SKILL.md`
- 项目级技能：`<项目cwd>\.od-skills\<name>\SKILL.md`（仅该项目可用）

## 在 OP 中使用

在 OP 对话里直接描述技能场景即可，例如：

- “用移动端任务流方法设计一个预约小程序。”
- “用 B2B 后台工作台方法重构这个管理控制台。”
- “使用 uiux-commercial-light 设计系统统一这组页面。”

## 边界

- 不直接复制或修改 OP 内部数据库；
- 不伪造 Workspace binding；
- 不依赖某个固定的 0.19.x 安装版本目录或端口；
- Personal Skill 文件和归属由 OP 官方 API 创建、更新和删除；
- 仓库是知识源，运行时由官方安装器同步。
