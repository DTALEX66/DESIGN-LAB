# UI 走查（子 Agent）

**主 Agent 在 Step 5 浏览器截图后，启动子 Agent 做 1 次 UI 走查。** 子 Agent 只负责发现问题；主 Agent 修复全部严重与中等项后，才可告知用户完成。

## 何时启动

- Step 1–5 全部完成
- `style-guide.html`、`components.html` 已在浏览器渲染并截图
- **仅启动 1 次**，不重复走查

## 子 Agent 启动方式

使用 Task 工具，`subagent_type: generalPurpose`，`readonly: true`。

### Task description

```
UI Review — screenshot-to-design-system
```

### Task prompt 模板

```
你是一名 UI 视觉走查员。对比「原始参考图中的各控件区域」与「生成的设计系统 Demo 中对应控件」，找出样式不符合的地方。

**走查单位是控件，不是整页。** 不评页面布局还原、背景还原、控件排列位置。

## 输入材料

1. 原始参考图路径：{{REFERENCE_IMAGE_PATH}}
2. Demo 目录：{{DEMO_DIR}}
3. 生成物：
   - tokens.json / tokens.css
   - style-guide.html（截图：{{STYLE_GUIDE_SCREENSHOT}}）
   - components.html（截图：{{COMPONENTS_SCREENSHOT}}）
   - components-list.md
   - analysis.md

## 走查范围

**严重（blocking）— 截图提取项明显不对：**
- 控件配色 hex 偏差 > 5%
- 圆角、padding、阴影、字号、字重明显不符
- 控件形状与比例偏差过大

**中等（important）— 截图提取项有可见偏差：**
- 阴影过重/过轻、字号差一级、间距偏紧/偏松
- token 与实现不一致（如 CSS 覆写 token）

**可接受（acceptable）— 仅记录，不要求修复：**
- 推断补全控件、无参考的状态态
- 字体 fallback、icon 占位块
- 页面布局、背景、控件排列位置

## 对比方法

1. 读取原始参考图，对照 `analysis.md` 控件区域清单
2. 读取 Demo 截图与 tokens.json、components-list.md
3. 按控件类别逐项对比 screenshot 来源项

## 输出格式

写入 {{DEMO_DIR}}/ui-review-report.md：

```markdown
# UI 走查报告

## 总结
- 整体匹配度：高 / 中 / 低
- 严重（blocking）：N 项
- 中等（important）：N 项
- 可接受（acceptable）：N 项

## 严重（blocking）
| # | 控件 | 问题 | 参考 | 当前实现 | 建议修改 |
|---|------|------|------|----------|----------|

## 中等（important）
| # | 控件 | 问题 | 参考 | 当前实现 | 建议修改 |
|---|------|------|------|----------|----------|

## 可接受（acceptable）
| # | 控件 | 说明 |
|---|------|------|

## 推断控件备注
（截图无法验证的推断项）
```

**不要输出 VERDICT。** 主 Agent 负责修复，不由子 Agent 判定任务可否结束。
```

## 主 Agent 收到反馈后（Step 7）

1. 读取 `ui-review-report.md`
2. **必须修复**全部 `blocking`（严重）项
3. **必须修复**全部 `important`（中等）项
4. `acceptable` 项写入 `analysis.md`，不改代码
5. 修复后更新浏览器截图
6. 在 `ui-review-report.md`「修复记录」表标注每项 `done`
7. **修复完成后才可 Step 8 告知用户**；不启动第 2 轮走查

若某项确实无法修复，在 `analysis.md` 说明原因，但仍须先尝试修复。

## 走查前主 Agent 必须准备

```
demo/<slug>/
├── reference.png
├── screenshots/
│   ├── style-guide.png
│   └── components.png
└── ui-review-report.md        # 子 Agent 输出，主 Agent 补充修复记录
```

## 最终交付条件

- [ ] 子 Agent 已执行 1 次走查
- [ ] 全部 blocking 与 important 项已修复（或无法修复的已说明原因）
- [ ] `ui-review-report.md` 修复记录已更新
- [ ] 最终回复包含修复摘要与剩余 acceptable 差异
