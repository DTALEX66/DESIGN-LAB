# {{APP_NAME}} — 控件列表

> Platform: {{PLATFORM}} · Source: {{SOURCE_FILE}} · Extracted: {{DATE}}

## 汇总

| 指标 | 数量 |
|------|------|
| 控件类别总数 | 24 |
| 从截图提取 | {{SCREENSHOT_COUNT}} |
| 推断补全 | {{INFERRED_COUNT}} |
| 变体总数 | {{VARIANT_COUNT}} |

## 完整控件表

| # | 类别 | 变体 | 来源 | CSS 类名 | 状态覆盖 | 依赖 token |
|---|------|------|------|----------|----------|------------|
| 1 | Button | primary | screenshot | `.ds-button--primary` | default, hover, active, disabled | `--button-primary-*` |
| 2 | Button | secondary | inferred | `.ds-button--secondary` | default, hover, active, disabled | `--color-primary`, `--radius-md` |
| 3 | Button | ghost | inferred | `.ds-button--ghost` | default, hover, active, disabled | `--color-primary` |
| 4 | Button | icon | inferred | `.ds-button--icon` | default, hover, active, disabled | `--button-primary-*` |
| 5 | Input | text | screenshot | `.ds-input` | default, focus, disabled | `--input-*` |
| 6 | Input | search | inferred | `.ds-input--search` | default, focus, disabled | `--input-*` |
| 7 | Textarea | default | inferred | `.ds-textarea` | default, focus, disabled | `--input-*` |
| 8 | Select | default | inferred | `.ds-select` | default, focus, disabled | `--input-*` |
| 9 | Card | default | screenshot | `.ds-card` | default | `--card-*` |
| 10 | Card | elevated | inferred | `.ds-card--elevated` | default | `--card-*`, `--shadow-lg` |
| 11 | ListItem | default | screenshot | `.ds-list-item` | default, active | `--color-border` |
| 12 | ListItem | with-icon | inferred | `.ds-list-item--icon` | default, active | `--color-border` |
| 13 | ListItem | with-action | inferred | `.ds-list-item--action` | default, active | `--color-border` |
| 14 | Tab | default | inferred | `.ds-tab` | default, selected | `--color-primary` |
| 15 | SegmentedControl | default | inferred | `.ds-segmented` | default, selected | `--color-primary`, `--radius-md` |
| 16 | NavBar | default | screenshot | `.ds-navbar` | default | `--color-background` |
| 17 | TabBar | default | screenshot | `.ds-tabbar` | default, selected | `--color-primary` |
| 18 | Badge | default | inferred | `.ds-badge` | default | `--color-primary` |
| 19 | Badge | dot | inferred | `.ds-badge--dot` | default | `--color-error` |
| 20 | Chip | default | inferred | `.ds-chip` | default, selected | `--color-primary` |
| 21 | Chip | removable | inferred | `.ds-chip--removable` | default, selected | `--color-primary` |
| 22 | Switch | default | inferred | `.ds-switch` | off, on, disabled | `--color-primary` |
| 23 | Checkbox | default | inferred | `.ds-checkbox` | unchecked, checked, disabled | `--color-primary` |
| 24 | Radio | default | inferred | `.ds-radio` | unchecked, checked, disabled | `--color-primary` |
| 25 | Avatar | sm / md / lg | inferred | `.ds-avatar--*` | default | `--radius-full` |
| 26 | Divider | horizontal | inferred | `.ds-divider` | default | `--color-border` |
| 27 | Alert | info / success / warning / error | inferred | `.ds-alert--*` | default | semantic colors |
| 28 | Toast | default | inferred | `.ds-toast` | default | `--card-*` |
| 29 | Modal | default | inferred | `.ds-modal` | default | `--card-*`, overlay |
| 30 | Sheet | default | inferred | `.ds-sheet` | default | `--card-*`, overlay |
| 31 | Progress | bar | inferred | `.ds-progress` | default, indeterminate | `--color-primary` |
| 32 | Progress | circular | inferred | `.ds-progress--circle` | default | `--color-primary` |
| 33 | Slider | default | inferred | `.ds-slider` | default, disabled | `--color-primary` |
| 34 | Tooltip | default | inferred | `.ds-tooltip` | default | `--color-text-primary` |

<!-- Agent: 根据实际截图更新上表，修正来源列（screenshot / inferred），删除不适用的行，补充截图特有的额外变体 -->

## 截图提取详情

<!-- Agent: 列出从截图直接提取的控件，含在截图中的位置描述 -->

| 类别 | 变体 | 截图位置 | 提取的关键属性 |
|------|------|----------|----------------|
| Button | primary | 底部 CTA | bg: --color-primary, radius: 12px, padding: 12px 24px |

## 推断补全说明

<!-- Agent: 列出主要推断逻辑 -->

| 类别 | 变体 | 推断依据 |
|------|------|----------|
| Button | ghost | 由 primary 去掉背景，保留主色文字 |
| Alert | error | 使用 tokens.json 中 --color-error |
