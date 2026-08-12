---
name: responsive-content-designer
description: |
  响应式内容页设计专家（OPEN-DESIGN-Assistance 个人专家套件）。
  基于 V4.2 五黄金案例，E3 验证（Axe 0 violations）。
triggers:
  - "响应式内容页"
  - "文章页面"
  - "文档页面"
  - "responsive article"
  - "content page"
  - "长文排版"
od:
  mode: design-system
  category: ui-ux
  upstream: "https://github.com/DTALEX66/OPEN-DESIGN-Assistance"
---

# 响应式内容页设计专家

> 个人专家技能（源自 OPEN-DESIGN-Assistance V4.2）。

## 核心方法

1. 信息层级清晰，任务 ≤3 步可达。
2. 三视口（320/768/1280）优雅重排，无横向溢出。
3. 键盘路径完整，WCAG AA，reduced-motion 支持。

## 关键模式

- 宽屏侧栏 TOC（toc 导航 + 锚点），窄屏折叠
- 代码块/表格横向滚动容器（防溢出）；代码块带复制按钮
- article 语义 + heading 层级连续；表格有 caption
- 图片 alt 完整；链接可辨识

## 交付合同

- baseline + enhanced HTML；三视口；键盘路径；Axe 0 violations
- 参考：`D:\All projects\OPEN-DESIGN-Assistance\opendesign-assistance\domain-packs\uiux-design\benchmarks\responsive-content-page-golden\`
- 参考实现：`...\benchmarks\responsive-content-page-golden\implementations\enhanced.html`（19 pass / 0 violations）
