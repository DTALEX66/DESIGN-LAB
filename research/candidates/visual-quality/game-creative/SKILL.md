---
name: creative-dev-toolkit
description: "Creative project full-pipeline toolkit: from game/app design to asset generation to code handoff. Covers 7 workflows: (1) game design methodology, (2) dual-format design doc generation (HTML for humans + Markdown for AI), (3) art asset requirement analysis, (4) batch AI image generation via Pollinations.ai free API, (5) programmatic SVG asset generation as fallback, (6) image processing utilities (crop/validate/convert), (7) Claude Code integration (doc formatting + plan review). Use when building games, interactive apps, or any creative project that needs design docs, art assets, and code implementation."
agent_created: true
---

# Creative Dev Toolkit — 创意项目全流程工具包

## 概述

从"我想做个游戏/应用"到"可运行的代码"的全流程工具包，整合 7 个实战验证过的核心工作流。
覆盖设计、文档、美术、图片生成、图像处理、代码交接全链路。

---

## 工作流 1：游戏/应用设计方法论

### 设计五步法

1. **概念定位** — 一句话描述核心玩法，明确目标平台和单局时长
2. **核心循环** — 定义玩家每回合/每局的操作闭环（抽牌→出牌→结算→反馈）
3. **数值体系** — 建立基础数值（HP/ATK/DEF/费用），设计成长曲线和难度曲线
4. **内容铺量** — 列出所有卡牌/角色/关卡/敌人/道具的完整清单和数值表
5. **流派设计** — 设计 3-6 种可行流派路线，确保每种都有明确的核心策略

### 设计原则

- **MVP 优先**：先设计能验证核心乐趣的最小可玩版本（3-5 个关卡），再逐步扩展
- **数值留余量**：设计文档中的数值是初始值，预留 20% 调整空间，实际需要 playtest 微调
- **流派平衡**：每种流派至少有一个明显优势和一个明显弱点，避免万能build
- **难度墙**：在 1/3 和 2/3 进度处设置"墙"，检验玩家是否掌握了核心机制

### 适合的游戏类型

| 类型 | 核心机制关键词 | 适合平台 |
|------|---------------|----------|
| 卡牌Roguelike | 抽牌/出牌/连锁/反应 | 手机竖屏 |
| 自走棋卡牌 | 摆位/合成/羁绊/自动战斗 | 手机横屏 |
| 合成养成 | 两两合成/词条遗传/育种 | 手机/PC |
| 心理博弈 | 暗牌/信息差/猜疑链 | 微信小游戏 |
| 贸易策略 | 低买高卖/事件/风险 | 手机/PC |

---

## 工作流 2：双格式设计文档生成

### 为什么要双格式

| 格式 | 用途 | 优势 |
|------|------|------|
| HTML | 给人看 | 表格美观、可折叠、有样式，适合查阅和展示 |
| Markdown | 给 AI 看 | 无标签噪音、token 效率高、Claude Code 读取最优 |

### HTML 文档结构模板

```
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    /* 暗色主题，卡片式布局 */
    body { background: #0d1117; color: #c9d1d9; font-family: system-ui; }
    .card { background: #161b22; border-radius: 8px; padding: 20px; margin: 16px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #30363d; padding: 8px 12px; text-align: left; }
    th { background: #21262d; }
    .section-title { color: #58a6ff; border-bottom: 2px solid #30363d; padding-bottom: 8px; }
    .highlight { color: #f0883e; font-weight: bold; }
    .formula { background: #1c2128; padding: 12px; border-radius: 6px; font-family: monospace; }
  </style>
</head>
<body>
  <!-- 按模块组织：核心规则 → 数值表 → 反应矩阵 → 成长系统 → 敌人 → 关卡 → 经济 -->
</body>
</html>
```

### Markdown 转换要点

- 去除所有 HTML 标签和 CSS 样式代码
- 表格转为 Markdown 表格语法
- 保持文档结构层级（# → ## → ###）
- 数值表格完整保留，不做精简
- 公式用代码块包裹

### 文档必备模块清单

1. 核心规则（棋盘/回合流程/操作限制）
2. 能量/资源系统
3. 完整卡牌/角色数值表
4. 元素反应/技能矩阵（两两组合全覆盖）
5. 伤害/结算公式（含所有乘区）
6. 成长系统（升级/合成/进化规则）
7. 敌人设计表（HP/ATK/DEF/技能/出现楼层）
8. Boss 设计（多阶段+特殊机制）
9. 关卡难度曲线（预期玩家血量剩余）
10. 经济系统（金币产出/消耗/定价）
11. 流派路线（每种流派的核心卡牌+策略）
12. 开发优先级（P0/P1/P2 分级）

---

## 工作流 3：美术素材需求分析

### 分析方法

从游戏设计文档出发，按模块逐一列出所有需要的图片素材：

1. **卡牌/角色类** — 每张牌/角色需要：插画、边框、费用球、元素标签图标
2. **敌人类** — 每个敌人需要：立绘（Boss 需要多阶段）
3. **UI 类** — 棋盘背景、格子状态、能量/HP 条、按钮、信息框
4. **特效类** — 每种技能/反应的视觉特效、连锁特效、状态图标
5. **场景类** — 不同战斗场景的背景图
6. **地图类** — Roguelike 地图节点、连线、标记
7. **商店类** — 商店界面、商品框、金币图标
8. **杂项类** — Logo、应用图标、加载动画、胜败画面

### 输出格式

每张素材列出：名称、内容描述、尺寸建议、优先级（P0/P1/P2）

- **P0**：最小可玩版本必须的素材（约 20 张）
- **P1**：核心体验完整需要的素材
- **P2**：锦上添花的素材

### 素材数量预估

| 项目规模 | P0 | P1 | P2 | 总计 |
|----------|-----|-----|-----|------|
| 小型（3关MVP） | ~20 | ~40 | ~30 | ~90 |
| 中型（10关完整） | ~20 | ~80 | ~60 | ~160 |
| 大型（多模式） | ~30 | ~120 | ~100 | ~250 |

---

## 工作流 4：批量 AI 图片生成（Pollinations.ai）

### 适用场景

- 内置 ImageGen 工具不可用或调用失败
- 需要一次性生成 10+ 张风格统一的图片
- SVG 矢量图不够精美，需要真实 AI 生成图片

### 前置条件

- Python 3 环境
- `Pillow` 库用于图片验证（`pip install Pillow`）
- `curl` 命令行工具（Windows Git Bash 自带）
- 网络可访问 `image.pollinations.ai`

### 核心 API

```
URL: https://image.pollinations.ai/prompt/{url_encoded_prompt}?width={w}&height={h}&nologo=true&seed={seed}
```

- 免费、无需 API key
- prompt 必须用英文，URL 编码
- 支持 width/height/seed/nologo 参数
- 返回 JPEG 图片

### 关键经验值

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| 并发数 | 2 | 5+ 容易触发 API 失败 |
| curl 超时 | 120s | `--max-time 120` |
| subprocess 超时 | 150s | 比 curl 多 30s 缓冲 |
| 重试次数 | 5 | 配合 PIL 验证 |
| 卡牌插画尺寸 | 512×512 | 正方形 |
| 图标尺寸 | 256×256 | 小正方形 |
| UI 条尺寸 | 512×256 | 横条 |
| 场景背景 | 800×600 | 宽幅 |

### SSL 问题处理

在沙箱环境中，Python urllib/requests 可能因 SSL 限制无法访问外部 API。
解决方案：使用 `curl --insecure --tlsv1.2` 绕过 SSL 验证。

```python
cmd = [
    "curl", "--insecure", "--tlsv1.2", "-s", "-L",
    "-o", str(path), url, "--max-time", "120"
]
result = subprocess.run(cmd, capture_output=True, text=True, timeout=150)
```

### 批量生成脚本

使用 `scripts/generate_pollinations_images.py` 作为模板：

1. 定义共享风格前缀（`CARD_STYLE`），保证同批次风格统一
2. 按类别组织任务（cards/enemies/relics/icons/ui/scenes）
3. 使用 `ThreadPoolExecutor` 并行下载
4. 每张图下载后用 `PIL.Image.verify()` 验证有效性
5. 已存在的有效文件自动跳过
6. 失败项自动重试，最终列出所有失败路径
7. 使用 `-u` 无缓冲输出实时查看进度

### 运行方式

```bash
# 生成全部（2并发最稳）
python -u generate_pollinations_images.py --workers 2

# 只生成前30张
python -u generate_pollinations_images.py --limit 30 --workers 2

# 只生成某个类别
python -u generate_pollinations_images.py --category cards --workers 2

# 指定输出目录
python -u generate_pollinations_images.py --output-dir ./my-assets --workers 2
```

### 风格一致性技巧

- 所有 prompt 以相同的风格前缀开头（如 `"game card illustration, fantasy art, dark background, digital painting"`）
- 避免在 prompt 中加入冲突的风格词（如同时写 "realistic" 和 "cartoon"）
- 同类素材使用相同尺寸
- 使用固定 seed 可复现相同图片（但不同 prompt 的 hash 会产生不同 seed）

---

## 工作流 5：SVG 程序化素材生成（Fallback）

### 适用场景

- AI 图片生成不可用时的备选方案
- 需要极小体积的矢量素材
- 需要 CSS 可控的 UI 组件

### 方法

用 Python 脚本批量生成 SVG 文件，核心技巧：

1. **定义颜色调色板** — 统一管理所有颜色，方便全局换色
2. **模板函数** — 每种素材类型一个生成函数，参数化控制内容
3. **卡牌模板** — 费用球 + 元素标签 + 卡名 + 插画区 + 数值面板
4. **敌人模板** — 简化几何图形组合，配合颜色区分类型
5. **UI 模板** — 棋盘网格、能量条、HP 条等用 rect/circle 组合

### SVG 优势与局限

| 优势 | 局限 |
|------|------|
| 矢量无损缩放 | 无法做精细插画 |
| 文件极小（KB级）| 渐变/光影效果有限 |
| CSS 可控 | 不适合复杂角色立绘 |
| 可直接在 HTML 中引用 | 风格偏简约/几何 |

### 生成后处理

SVG 可通过以下方式转 PNG：
- 浏览器打开后截图
- `cairosvg` 库（`pip install cairosvg`）
- Inkscape 命令行（`inkscape --export-png=out.png in.svg`）

---

## 工作流 6：图像处理工具集

### 图片裁剪

将一张大图按区域裁剪成多张小图：

```python
from PIL import Image
from pathlib import Path

def crop_image(src_path, output_dir, regions):
    """
    regions: [(name, x1, y1, x2, y2), ...]
    """
    img = Image.open(src_path)
    for name, x1, y1, x2, y2 in regions:
        cropped = img.crop((x1, y1, x2, y2))
        cropped.save(Path(output_dir) / f"{name}.png")
```

### 批量验证图片

```python
from PIL import Image
from pathlib import Path

def validate_images(directory):
    base = Path(directory)
    files = list(base.rglob('*.jpg')) + list(base.rglob('*.png'))
    broken = []
    for f in files:
        try:
            Image.open(f).verify()
        except Exception:
            broken.append(f)
    return len(files) - len(broken), broken
```

### 删除损坏图片

```python
from PIL import Image
from pathlib import Path

def clean_broken_images(directory):
    base = Path(directory)
    for f in base.rglob('*'):
        if f.suffix not in ('.jpg', '.png', '.jpeg'):
            continue
        try:
            Image.open(f).verify()
        except Exception:
            f.unlink()
            print(f"Deleted: {f}")
```

### 生成图片总览页

生成 HTML 页面按类别展示所有图片，方便预览和挑选：

```html
<!-- 每个类别一个 section，图片用 <img src="相对路径"> 展示 -->
```

---

## 工作流 7：Claude Code 交接

### 文档格式选择

| 接收方 | 推荐格式 | 原因 |
|--------|----------|------|
| Claude Code | Markdown | 无标签噪音，token 效率高 |
| 人类审阅 | HTML | 表格美观，可折叠 |
| GitHub 分享 | Markdown | 通用格式，渲染支持好 |

### 交接清单

给 Claude Code 交接时，提供以下文件：

1. **设计文档（.md）** — 核心数值和玩法设计
2. **美术素材需求清单（.md）** — 所有图片素材需求
3. **图片素材目录** — 已生成的图片文件夹
4. **（可选）实现计划** — 如果已有技术方案

### Claude Code 使用提示

```
请阅读 [设计文档.md] 和 [美术素材需求清单.md]，
图片素材在 [assets/] 目录下，帮我实现这个 [游戏/应用]
```

### 实现计划审查要点

当 Claude Code 生成实现计划时，检查以下要点：

1. **技术选型是否合理** — 引擎/框架是否适合游戏类型
2. **文件结构是否清晰** — config/core/scenes/ui 分层是否合理
3. **核心算法是否匹配设计文档** — 伤害公式、连锁检测、反应优先级等
4. **MVP 范围是否适当** — 不要一次做太多，先验证核心玩法
5. **素材引用方式** — CDN 加载是否有离线 fallback（重要！）
6. **实现顺序是否合理** — 骨架→核心机制→扩展→打磨

### 常见坑

- **CDN 依赖**：Phaser/Three.js 等库用 CDN 加载，无网络就白屏 → 需要本地 fallback
- **中文文件名**：Windows 上正常，但某些工具链可能出问题 → 建议素材用拼音/英文名
- **SSL 限制**：沙箱环境可能阻止 HTTPS 请求 → 用 `curl --insecure --tlsv1.2` 绕过
- **并发限制**：免费 API 高并发容易失败 → 控制在 2 并发

---

## 完整项目流程速查

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

## 注意事项

- Pollinations.ai 返回的图格式可能是 JPEG，即使保存为 `.jpg` 也是正确的
- 中文文件名在 Windows 上正常，但 URL 中的 prompt 必须 URL 编码
- 不要滥用高并发，2 workers 是稳定与速度的平衡点
- 生成图片版权归属需用户自行确认，本工具包仅提供技术实现
- SVG fallback 适合 UI 和图标，不适合需要精细插画的角色立绘
- 给 Claude Code 的文档务必用 Markdown，HTML 标签会浪费大量 token
