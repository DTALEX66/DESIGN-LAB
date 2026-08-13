# Token Schema

三层结构：Primitive → Semantic → Component。

## tokens.json 完整示例

```json
{
  "meta": {
    "source": "screenshot.png",
    "platform": "ios",
    "canvas": { "width": 390, "height": 844 },
    "extractedAt": "2026-07-04"
  },
  "primitive": {
    "color": {
      "white": "#FFFFFF",
      "gray-50": "#F9FAFB",
      "gray-100": "#F3F4F6",
      "gray-500": "#6B7280",
      "gray-900": "#111827",
      "blue-500": "#3B82F6",
      "blue-600": "#2563EB",
      "red-500": "#EF4444",
      "green-500": "#22C55E"
    },
    "radius": {
      "none": "0",
      "sm": "6px",
      "md": "12px",
      "lg": "16px",
      "full": "9999px"
    },
    "shadow": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 12px rgba(0,0,0,0.08)",
      "lg": "0 8px 24px rgba(0,0,0,0.12)"
    },
    "spacing": {
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "8": "32px"
    },
    "font": {
      "family-sans": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "size-xs": "12px",
      "size-sm": "14px",
      "size-base": "16px",
      "size-lg": "18px",
      "size-xl": "20px",
      "size-2xl": "24px",
      "weight-normal": "400",
      "weight-medium": "500",
      "weight-semibold": "600",
      "weight-bold": "700"
    }
  },
  "semantic": {
    "color-primary": "{primitive.color.blue-500}",
    "color-primary-hover": "{primitive.color.blue-600}",
    "color-background": "{primitive.color.white}",
    "color-background-secondary": "{primitive.color.gray-50}",
    "color-text-primary": "{primitive.color.gray-900}",
    "color-text-secondary": "{primitive.color.gray-500}",
    "color-border": "{primitive.color.gray-100}",
    "color-success": "{primitive.color.green-500}",
    "color-error": "{primitive.color.red-500}",
    "radius-button": "{primitive.radius.md}",
    "radius-card": "{primitive.radius.lg}",
    "shadow-card": "{primitive.shadow.md}"
  },
  "component": {
    "button-primary-bg": "{semantic.color-primary}",
    "button-primary-bg-hover": "{semantic.color-primary-hover}",
    "button-primary-text": "{primitive.color.white}",
    "button-primary-radius": "{semantic.radius-button}",
    "button-primary-padding": "{primitive.spacing.3} {primitive.spacing.6}",
    "card-bg": "{semantic.color-background}",
    "card-radius": "{semantic.radius-card}",
    "card-shadow": "{semantic.shadow-card}",
    "card-padding": "{primitive.spacing.4}",
    "input-bg": "{semantic.color-background}",
    "input-border": "{semantic.color-border}",
    "input-radius": "{semantic.radius.sm}",
    "input-padding": "{primitive.spacing.3} {primitive.spacing.4}"
  }
}
```

## tokens.css 生成规则

1. 将所有 primitive 值写入 `:root` CSS 变量。
2. semantic 和 component 引用 primitive 变量，不重复硬编码 hex。
3. 命名：`--color-*`、`--radius-*`、`--shadow-*`、`--spacing-*`、`--font-*`、`--button-*`、`--card-*`。

```css
:root {
  /* Primitive */
  --color-blue-500: #3B82F6;
  --radius-md: 12px;

  /* Semantic */
  --color-primary: var(--color-blue-500);
  --color-background: #FFFFFF;

  /* Component */
  --button-primary-bg: var(--color-primary);
  --button-primary-radius: var(--radius-md);
}
```

## 配色提取优先级

1. **主色**：最大面积强调色（CTA 按钮、选中态、品牌色块）
2. **背景层级**：页面底、卡片底、浮层底
3. **文字层级**：标题、正文、辅助、禁用
4. **边框 / 分割**：列表分割、输入框边框
5. **状态色**：success / warning / error / info（截图有则提取，无则跳过）

## 字体层级映射

| 层级 | 典型用途 | 记录属性 |
|------|----------|----------|
| Display | 大标题 | size, weight, line-height, letter-spacing |
| Title | 页面标题 | size, weight, line-height |
| Body | 正文 | size, weight, line-height |
| Caption | 辅助说明 | size, weight, color (secondary) |
| Button | 按钮文案 | size, weight, letter-spacing |
