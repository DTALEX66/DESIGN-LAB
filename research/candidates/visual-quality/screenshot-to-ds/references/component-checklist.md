# 控件标准全集与补全规则

**必须生成完整控件库。** 截图中有的优先提取（`screenshot`）；截图中没有的按已有样式推断补全（`inferred`）。

## 标准全集（必须全部出现在 components.html 与 components-list.md）

| # | 类别 | 必须变体 | 必须状态 |
|---|------|----------|----------|
| 1 | Button | primary, secondary, ghost, icon | default, hover, active, disabled |
| 2 | Input | text, search | default, focus, disabled |
| 3 | Textarea | default | default, focus, disabled |
| 4 | Select | default | default, focus, disabled |
| 5 | Card | default, elevated | default |
| 6 | ListItem | default, with-icon, with-action | default, pressed/active |
| 7 | Tab | default | default, selected |
| 8 | SegmentedControl | default | default, selected |
| 9 | NavBar | default | default |
| 10 | TabBar | default | default, selected |
| 11 | Badge | default, dot | default |
| 12 | Chip / Tag | default, removable | default, selected |
| 13 | Switch | default | off, on, disabled |
| 14 | Checkbox | default | unchecked, checked, disabled |
| 15 | Radio | default | unchecked, checked, disabled |
| 16 | Avatar | sm, md, lg | default |
| 17 | Divider | horizontal | default |
| 18 | Alert | info, success, warning, error | default |
| 19 | Toast | default | default |
| 20 | Modal | default | default |
| 21 | Sheet | default | default |
| 22 | Progress | bar, circular | default, indeterminate |
| 23 | Slider | default | default, disabled |
| 24 | Tooltip | default | default |

## 通用属性（每种控件都要记录）

| 属性 | 说明 |
|------|------|
| width / height | 固定或 auto / 100% |
| padding | 四方向或 shorthand |
| background | 颜色或 transparent |
| color | 文字色 |
| border | width style color |
| border-radius | 值 |
| box-shadow | 值或 none |
| font-size / font-weight | 来自 token |
| opacity | 禁用态等 |

## Phase A：逐控件区域提取

从截图划定的**每个控件区域**单独读取样式，记录精确 CSS 属性。同类控件多个实例时，取共性或标注差异。

**禁止**：从页面背景、留白、状态栏区域采样或推断控件样式。

### 识别信号速查

| 类别 | 识别信号 |
|------|----------|
| Button Primary | 填充主色、白字、CTA 位置 |
| Button Secondary | 描边或浅底 |
| Button Ghost | 无背景或透明 |
| Icon Button | 仅图标、圆形或方形 |
| Input / SearchBar | 边框输入框、placeholder、搜索图标 |
| Card | 圆角容器、阴影、内边距 |
| ListItem | 行布局、分割线、左图标/右箭头 |
| Tab / SegmentedControl | 选中/未选中态 |
| NavBar / TabBar | 顶部/底部导航 |
| Badge / Chip | 小标签、圆角 pill |
| Switch / Checkbox / Radio | 选择控件 |
| Avatar | 圆形/圆角头像 |
| Divider | 水平分割线 |
| Modal / Sheet / Toast | 浮层、弹窗、提示条 |

## Phase B：推断补全规则

截图中**没有**的控件，按以下规则从已有样式推断：

| 目标控件 | 推断依据 |
|----------|----------|
| Secondary Button | Primary 的描边版：透明底 + 主色边框 + 主色字 |
| Ghost Button | Primary 的无背景版：透明底 + 主色字 |
| Icon Button | Primary 圆形缩小：同 radius-full、同主色 |
| Textarea | Input 样式 + 更大 min-height |
| Select | Input 样式 + 右侧下拉箭头 |
| Elevated Card | Card + 更大 shadow |
| Alert info | 主色浅底 + 主色边框 |
| Alert success/warning/error | 对应 semantic 状态色 |
| Toast | Card 紧凑版 + 固定宽度 |
| Modal / Sheet | Card + overlay 背景 |
| Progress / Slider | 主色轨道 + 灰色背景轨道 |
| Tooltip | 深色底 + 小字号 + 小圆角 |
| 未出现的 Tab/Nav 变体 | 从截图中出现的导航控件类推选中/未选中色 |

**推断约束：**
- 所有颜色、圆角、阴影、字号必须引用 `tokens.css` 变量
- 不得引入截图设计语言中没有的新颜色
- 每个推断控件在 `components-list.md` 标注 `source: inferred`
- 推断假设写入 `analysis.md`

## 不需要还原的元素

以下用占位块（`.ds-placeholder`）代替，不纳入控件库：

- 插画、摄影、产品渲染图
- 地图、图表数据可视化
- 复杂 3D / 材质
- 精确 Logo（除非用户要求近似）
- 头像照片（Avatar 用 initials 或灰色圆形占位）

## components.html 分组顺序

按此顺序输出**全部 24 类**，不可省略：

1. Buttons → 2. Inputs → 3. Textarea → 4. Select → 5. Cards → 6. Lists → 7. Tabs → 8. Segmented Control → 9. NavBar → 10. TabBar → 11. Badges → 12. Chips → 13. Switch → 14. Checkbox → 15. Radio → 16. Avatar → 17. Divider → 18. Alert → 19. Toast → 20. Modal → 21. Sheet → 22. Progress → 23. Slider → 24. Tooltip

每组内：先 screenshot 提取的变体，再 inferred 变体；先 default，再其他状态。

## 来源标注

`components.html` 中每个控件组标题旁加来源标签：

```html
<h2>Buttons <span class="source-tag source-tag--mixed">2 screenshot · 2 inferred</span></h2>
<div class="component-label">Primary <span class="source-tag source-tag--screenshot">screenshot</span></div>
<div class="component-label">Ghost <span class="source-tag source-tag--inferred">inferred</span></div>
```

CSS：
```css
.source-tag { font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: 500; margin-left: 8px; }
.source-tag--screenshot { background: #DCFCE7; color: #166534; }
.source-tag--inferred { background: #FEF3C7; color: #92400E; }
.source-tag--mixed { background: #E0E7FF; color: #3730A3; }
```

## components-list.md 格式

见 [templates/components-list.md](../templates/components-list.md)。

汇总表必填：

| 类别 | 变体 | 来源 | CSS 类名 | 状态 | 依赖 token |
|------|------|------|----------|------|------------|

来源值：`screenshot` | `inferred` | `screenshot+inferred`（部分状态来自截图、部分推断）
