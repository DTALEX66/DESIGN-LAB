# Creative Dev Toolkit — 创意游戏项目skill

> 从"我想做个游戏/应用"到"可运行的代码"的全流程工具包，整合 7 个实战验证过的核心工作流。

覆盖 **设计 → 文档 → 美术 → 图片生成 → 图像处理 → 代码交接** 全链路。

---

## 为什么需要这个工具包？

做一个小游戏/创意项目，通常需要经历这些阶段：

1. **设计** — 想清楚核心玩法、数值体系
2. **文档** — 把设计写成结构化文档
3. **美术需求** — 列出所有需要的图片素材
4. **图片生成** — 批量生成 AI 图片素材
5. **图像处理** — 裁剪、验证、整理素材
6. **代码交接** — 把文档和素材交给 AI 编程助手实现

每个阶段都有坑。这个工具包把实战中踩过的坑和最佳实践整合成了一套可复用的方法论 + 脚本工具。

---

## 7 大核心工作流

### 工作流 1：游戏/应用设计方法论

从零到一设计游戏的方法论框架：

- **设计五步法**：概念定位 → 核心循环 → 数值体系 → 内容铺量 → 流派设计
- **设计原则**：MVP 优先、数值留余量、流派平衡、难度墙
- **5 种游戏类型参考**：卡牌 Roguelike、自走棋卡牌、合成养成、心理博弈、贸易策略

### 工作流 2：双格式设计文档生成

同时生成两种格式的设计文档：

| 格式 | 用途 | 优势 |
|------|------|------|
| HTML | 给人看 | 表格美观、可折叠、有样式 |
| Markdown | 给 AI 看 | 无标签噪音、token 效率高 |

内置 12 个必备模块清单，确保设计文档完整覆盖所有关键信息。

### 工作流 3：美术素材需求分析

从设计文档出发，按 8 个模块逐一列出所有需要的图片素材：

- 卡牌/角色插画、边框、图标
- 敌人/Boss 立绘
- UI 界面素材（棋盘、能量条、HP 条、按钮）
- 特效/动画素材
- 场景背景
- Roguelike 地图节点
- 商店界面
- 杂项（Logo、加载动画、胜败画面）

每张素材标注：内容描述、尺寸建议、优先级（P0/P1/P2）。

### 工作流 4：批量 AI 图片生成（Pollinations.ai）

**核心功能** — 使用 [Pollinations.ai](https://pollinations.ai) 免费 API 批量生成 AI 图片：

- 免费、无需 API Key
- 支持自定义 prompt 和尺寸
- 并行下载（推荐 2 并发）
- PIL 自动验证图片完整性
- 失败自动重试（最多 5 次）
- 已存在文件自动跳过
- 支持按类别过滤生成

```bash
# 生成全部图片
python -u scripts/generate_pollinations_images.py --workers 2

# 只生成前 30 张
python -u scripts/generate_pollinations_images.py --limit 30 --workers 2

# 只生成卡牌类
python -u scripts/generate_pollinations_images.py --category cards --workers 2

# 指定输出目录
python -u scripts/generate_pollinations_images.py --output-dir ./my-assets --workers 2
```

### 工作流 5：SVG 程序化素材生成（Fallback）

AI 图片生成不可用时的备选方案：

- Python 脚本批量生成 SVG 矢量素材
- 统一颜色调色板管理
- 参数化模板（卡牌、敌人、UI 组件）
- 矢量无损缩放，文件极小

### 工作流 6：图像处理工具集

4 个实用图像处理命令：

```bash
# 裁剪大图为多张小图
python scripts/image_utils.py crop --src big.png --dir output --regions regions.json

# 验证目录下所有图片是否有效
python scripts/image_utils.py validate --dir ./assets

# 删除损坏的图片文件
python scripts/image_utils.py clean --dir ./assets

# 生成图片总览 HTML 页面
python scripts/image_utils.py gallery --dir ./assets --out index.html
```

### 工作流 7：Claude Code 交接

把设计文档和素材交给 AI 编程助手（如 Claude Code）的最佳实践：

- 文档格式选择建议
- 交接清单（设计文档 + 素材清单 + 图片目录）
- 实现计划审查要点
- 常见坑提醒（CDN 依赖、中文文件名、SSL 限制、并发限制）

---

## 项目结构

```
creative-dev-toolkit/
├── README.md                          # 本文件
├── LICENSE                            # MIT 许可证
├── .gitignore
├── SKILL.md                           # 完整方法论文档（7 个工作流详解）
└── scripts/
    ├── generate_pollinations_images.py  # 批量 AI 图片生成脚本
    └── image_utils.py                    # 图像处理工具集
```

---

## 快速开始

### 环境要求

- Python 3.8+
- `curl` 命令行工具（Windows Git Bash 自带）
- `Pillow` 库（图片验证用）

### 安装依赖

```bash
pip install Pillow
```

### 使用批量生图脚本

1. 编辑 `scripts/generate_pollinations_images.py` 中的任务定义区
2. 修改 `CARD_TASKS`、`ENEMIES`、`RELICS` 等变量为你自己的素材需求
3. 运行脚本：

```bash
python -u scripts/generate_pollinations_images.py --output-dir ./my-game-assets --workers 2
```

4. 生成的图片会按类别自动分目录存放：

```
my-game-assets/
├── cards/
│   ├── fire/
│   │   ├── 火花.jpg
│   │   ├── 烈焰.jpg
│   │   └── 焚天.jpg
│   ├── water/
│   └── special/
├── enemies/
├── relics/
├── icons/
├── ui/
└── scenes/
```

### 使用图像处理工具

```bash
# 验证所有图片是否完整
python scripts/image_utils.py validate --dir ./my-game-assets

# 生成预览总览页
python scripts/image_utils.py gallery --dir ./my-game-assets --out index.html
```

---

## 关键经验值

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| 并发数 | 2 | 5+ 容易触发 API 失败 |
| curl 超时 | 120s | `--max-time 120` |
| 重试次数 | 5 | 配合 PIL 验证 |
| 卡牌插画尺寸 | 512×512 | 正方形 |
| 图标尺寸 | 256×256 | 小正方形 |
| 场景背景 | 800×600 | 宽幅 |

### SSL 问题处理

在沙箱/受限网络环境中，Python urllib/requests 可能因 SSL 限制无法访问外部 API。解决方案：

```python
cmd = [
    "curl", "--insecure", "--tlsv1.2", "-s", "-L",
    "-o", str(path), url, "--max-time", "120"
]
```

---

## 完整项目流程

```
概念构思
  → [工作流1] 游戏设计方法论：定义核心循环、数值体系、流派
  → [工作流2] 生成双格式设计文档（HTML + MD）
  → [工作流3] 美术素材需求分析：列出所有图片清单+优先级
  → [工作流4] 批量 AI 图片生成（Pollinations.ai）
    └─ 失败时 → [工作流5] SVG 程序化素材生成（Fallback）
  → [工作流6] 图像处理：裁剪/验证/生成总览页
  → [工作流7] Claude Code 交接：MD文档 + 素材目录 + 实现计划审查
  → 开发实现 → 测试 → 迭代
```

---

## 实战案例

这个工具包在"元素链·消除RPG"卡牌游戏项目中完整验证过：

- 设计了 18 张元素卡牌 + 6 张特殊牌的完整数值体系
- 生成了 15 种元素反应矩阵和连锁伤害公式
- 列出了 140+ 张美术素材需求清单
- 使用 Pollinations.ai 批量生成了 73 张 AI 图片素材
- 交接给 Claude Code 实现 Phaser 3 游戏原型

---

## 作为  Skill 使用

本工具包同时也是 [WorkBuddy](https://www.codebuddy.cn/) 的 Skill。将 `SKILL.md` 和 `scripts/` 目录放入 `~/.workbuddy/skills/creative-dev-toolkit/` 即可自动加载。

---

## License

[MIT](LICENSE)

---

## Author

**wotonger**
- GitHub: [@wotonger](https://github.com/wotonger)
