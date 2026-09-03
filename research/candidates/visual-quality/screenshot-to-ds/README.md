<div align="center">

# Screenshot to Design System

**Drop a UI screenshot. Get design tokens and a full component library demo.**

Upload an App screenshot, component board, or design mockup — invoke the skill — and your coding agent extracts colors, typography, and control styles **control-by-control**, then generates a browsable design system demo.

Works with **[Cursor](https://cursor.com/docs/skills)**, **[Claude Code](https://code.claude.com/docs/en/skills)**, **[OpenAI Codex](https://developers.openai.com/codex/skills)**, and any tool that supports the [Agent Skills](https://agentskills.io) open standard.

**上传 UI 截图，一键提取配色 token 与完整控件库 Demo。支持 Cursor、Claude Code、Codex 等主流 AI 编程工具。**

<br>

[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-open%20standard-6366f1?style=for-the-badge)](https://agentskills.io)
[![Cursor](https://img.shields.io/badge/Cursor-supported-000000?style=for-the-badge&logo=cursor&logoColor=white)](https://cursor.com/docs/skills)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-supported-D97757?style=for-the-badge)](https://code.claude.com/docs/en/skills)
[![Codex](https://img.shields.io/badge/OpenAI%20Codex-supported-412991?style=for-the-badge&logo=openai&logoColor=white)](https://developers.openai.com/codex/skills)
![Components](https://img.shields.io/badge/components-24%20categories-10b981?style=for-the-badge)
[![Python](https://img.shields.io/badge/python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://pypi.org/project/Pillow/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Last Update](https://img.shields.io/github/last-commit/WCF900905/screenshot-to-design-system?label=Last%20update&style=for-the-badge)](https://github.com/WCF900905/screenshot-to-design-system)

<br>

[English](#what-is-this) · [中文](#中文)

</div>

---

## What is this?

A cross-platform [Agent Skill](https://agentskills.io) that reads **individual UI controls** from a screenshot — not the full page layout. It extracts semantic design tokens, builds a 24-category component library, and outputs HTML demos your team can open in a browser.

No Figma export. No manual token spreadsheet. Just a screenshot and one skill invocation.

### Supported agents

Same `SKILL.md`, different discovery paths — install once per tool (or use the installer for all):

| Agent | Global path | Project path | How to invoke |
|-------|-------------|--------------|---------------|
| [Cursor](https://cursor.com/docs/skills) | `~/.cursor/skills/` | `.cursor/skills/` | `/screenshot-to-design-system` |
| [Claude Code](https://code.claude.com/docs/en/skills) | `~/.claude/skills/` | `.claude/skills/` | `/screenshot-to-design-system` |
| [OpenAI Codex](https://developers.openai.com/codex/skills) | `~/.agents/skills/` | `.agents/skills/` | Pick from `/skills` or describe the task |
| Other Agent Skills tools | `~/.agents/skills/` | `.agents/skills/` | Follow your tool's skill docs |

> **Tip:** The installer clones once to `~/.agents/skills/` and symlinks Cursor + Claude Code paths automatically.

| Approach | What it does | Best for |
|----------|--------------|----------|
| **This skill** | Reads each control region → tokens + component demo | Bootstrapping a design system from existing UI |
| Full-page replication | Recreates layout, background, positioning | Pixel-perfect page clones |
| `DESIGN.md` libraries ([awesome-design-md](https://github.com/VoltAgent/awesome-design-md)) | Pre-built design docs from known brands | Matching a published design language |

### Core principle: read controls, not pages

| ✅ Extract | ❌ Ignore |
|-----------|----------|
| Fill colors, borders, radius, shadows, type per control | Page background, gradients, illustrations |
| Control shapes and variants | Icon graphics, logos, avatar photos |
| Semantic tokens inferred from visible controls | Full-page layout and positioning |

---

## Quick Start

### 1. Install

**All agents — one command (Cursor + Claude Code + Codex):**

```bash
curl -fsSL https://raw.githubusercontent.com/WCF900905/screenshot-to-packages/design-system/main/scripts/install.sh | bash
```

**Project-level (commit `.cursor/skills/`, `.claude/skills/`, or `.agents/skills/` to share with team):**

```bash
curl -fsSL https://raw.githubusercontent.com/WCF900905/screenshot-to-packages/design-system/main/scripts/install.sh | bash -s -- --project
```

**Single agent:**

```bash
# Cursor only
curl -fsSL .../install.sh | bash -s -- --cursor

# Claude Code only
curl -fsSL .../install.sh | bash -s -- --claude

# Codex only
curl -fsSL .../install.sh | bash -s -- --codex
```

Restart your AI tool after install.

<details>
<summary>Manual install per agent</summary>

**Cursor**

```bash
git clone https://github.com/WCF900905/screenshot-to-design-system.git \
  ~/.cursor/skills/screenshot-to-design-system
```

**Claude Code**

```bash
git clone https://github.com/WCF900905/screenshot-to-design-system.git \
  ~/.claude/skills/screenshot-to-design-system
```

**OpenAI Codex**

```bash
git clone https://github.com/WCF900905/screenshot-to-design-system.git \
  ~/.agents/skills/screenshot-to-design-system
```

**Cursor UI (Remote Rule):** Customize → Rules → Add Rule → Remote Rule (Github) → `https://github.com/WCF900905/screenshot-to-design-system`

</details>

### 2. Use

1. Attach or paste a UI screenshot in your agent chat
2. Invoke the skill:

   | Agent | Invocation |
   |-------|------------|
   | Cursor | `/screenshot-to-design-system` |
   | Claude Code | `/screenshot-to-design-system` |
   | Codex | Select from `/skills` or ask: *"Use screenshot-to-design-system on this image"* |

3. The agent runs an 8-step workflow and writes output to `demo/<slug>/`
4. Open the generated demo:

   ```bash
   open demo/<slug>/style-guide.html
   open demo/<slug>/components.html
   ```

**Requirements:** An Agent Skills–compatible tool · Python 3 + `pip install Pillow` (color sampling script)

---

## What's Inside the Skill

This repository **is** the skill folder. Directory name must stay `screenshot-to-design-system` (matches `name` in `SKILL.md`).

```
screenshot-to-packages/design-system/
├── SKILL.md                 # Agent playbook (required)
├── references/              # Input detection, token schema, component checklist, UI review
├── scripts/
│   ├── install.sh           # One-line installer
│   └── sample_colors.py     # Pixel-level color sampling
└── templates/               # HTML / markdown templates for demo output
```

## What's Inside the Generated Demo

After running the skill, output lands in `demo/<slug>/`:

| File | Purpose |
|------|---------|
| `tokens.json` | Primitive → semantic → component token layers |
| `tokens.css` | CSS custom properties for all tokens |
| `style-guide.html` | Color, type, spacing, radius, shadow catalog |
| `components.html` | Full 24-category component library showcase |
| `components-list.md` | Per-component source tags (`screenshot` / `inferred`) |
| `analysis.md` | Control region inventory and extraction notes |
| `ui-review-report.md` | Automated visual review + fix log |
| `reference.png` | Original screenshot |
| `screenshots/` | Rendered demo captures |

### 8-Step Workflow

```
Detect controls → Sample colors → Build tokens → Identify components
→ Generate HTML demo → Browser screenshots → UI review → Fix & deliver
```

Each screenshot-sourced control is extracted first. Missing categories are inferred from existing tokens — never introducing colors outside the screenshot's design language.

---

## Uninstall

```bash
rm -rf ~/.cursor/skills/screenshot-to-design-system
rm -rf ~/.claude/skills/screenshot-to-design-system
rm -rf ~/.agents/skills/screenshot-to-design-system
# project install:
rm -rf .cursor/skills/screenshot-to-design-system
rm -rf .claude/skills/screenshot-to-design-system
rm -rf .agents/skills/screenshot-to-design-system
```

---

## Contributing

Issues and PRs welcome. Before opening a PR, please open an issue to discuss significant changes.

---

## License

MIT License — see [LICENSE](LICENSE).

This skill helps AI agents extract publicly visible UI styling from screenshots for design system bootstrapping. It does not claim ownership of any app's visual identity.

---

## 中文

### 这是什么？

面向 [Agent Skills](https://agentskills.io) 开放标准的跨平台 Skill：从 UI 截图中**逐个读取控件区域**（非整页布局），提取配色 token 与控件样式，补全 24 类标准控件库，并生成可在浏览器打开的 HTML Demo。

**支持 Cursor、Claude Code、OpenAI Codex** 及所有兼容 Agent Skills 的工具。

| 工具 | 全局路径 | 项目路径 | 调用方式 |
|------|----------|----------|----------|
| Cursor | `~/.cursor/skills/` | `.cursor/skills/` | `/screenshot-to-design-system` |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` | `/screenshot-to-design-system` |
| OpenAI Codex | `~/.agents/skills/` | `.agents/skills/` | `/skills` 选择或描述任务 |

| 方式 | 作用 | 适用场景 |
|------|------|----------|
| **本 Skill** | 逐控件取色 → token + 控件库 Demo | 从现有 UI 快速搭建设计系统 |
| 整页复刻 | 还原布局、背景、位置 | 高保真页面克隆 |
| [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 现成品牌 DESIGN.md | 匹配已知设计语言 |

### 安装

**全部工具（Cursor + Claude Code + Codex）：**

```bash
curl -fsSL https://raw.githubusercontent.com/WCF900905/screenshot-to-packages/design-system/main/scripts/install.sh | bash
```

**项目级（随仓库共享）：**

```bash
curl -fsSL https://raw.githubusercontent.com/WCF900905/screenshot-to-packages/design-system/main/scripts/install.sh | bash -s -- --project
```

**仅安装某一工具：**

```bash
curl -fsSL .../install.sh | bash -s -- --cursor   # 仅 Cursor
curl -fsSL .../install.sh | bash -s -- --claude   # 仅 Claude Code
curl -fsSL .../install.sh | bash -s -- --codex    # 仅 Codex
```

**手动克隆：**

```bash
# Cursor
git clone https://github.com/WCF900905/screenshot-to-design-system.git \
  ~/.cursor/skills/screenshot-to-design-system

# Claude Code
git clone https://github.com/WCF900905/screenshot-to-design-system.git \
  ~/.claude/skills/screenshot-to-design-system

# Codex
git clone https://github.com/WCF900905/screenshot-to-design-system.git \
  ~/.agents/skills/screenshot-to-design-system
```

安装后重启对应 AI 工具。

### 使用

1. 在 Agent 对话中上传 UI 截图（App 截图、控件展示板、设计稿局部均可）
2. 调用 Skill：
   - **Cursor / Claude Code**：`/screenshot-to-design-system`
   - **Codex**：从 `/skills` 选择，或说明「用 screenshot-to-design-system 分析这张截图」
3. 输出写入 `demo/<slug>/`，打开 `style-guide.html` 与 `components.html` 查看

**环境：** 支持 Agent Skills 的 AI 工具 · Python 3 + `pip install Pillow`

### 生成物说明

| 文件 | 说明 |
|------|------|
| `tokens.json` / `tokens.css` | 三层 token 与 CSS 变量 |
| `style-guide.html` | 配色、字体、间距、圆角、阴影 |
| `components.html` | 24 类控件完整展示 |
| `components-list.md` | 控件来源标注（截图提取 / 推断补全） |
| `analysis.md` | 控件区域清单与分析 |
| `ui-review-report.md` | UI 走查与修复记录 |

### 卸载

```bash
rm -rf ~/.cursor/skills/screenshot-to-design-system
rm -rf ~/.claude/skills/screenshot-to-design-system
rm -rf ~/.agents/skills/screenshot-to-design-system
```

许可证：MIT — 见 [LICENSE](LICENSE)。
