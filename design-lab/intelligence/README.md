# intelligence — Brief → Direction → Design System contract

DL-INT-001：设计智能管线契约——从 Brief 到 Direction 到 Design System 的可追溯转换。

## 管线

```text
Brief (design-brief.schema.json)
  → Direction (design-direction.schema.json)    # 设计方向推断
  → Design System (design-system.schema.json)   # tokens/type/grid/components
  → Critique (design-critique.schema.json)      # 质量评审
```

## 契约

1. **Brief 输入**：project_id、discipline、objective、audience、deliverables、constraints
2. **Direction 推断**：从 Brief 推断设计方向（风格语言/情绪/布局倾向）；必须输出 `composition` 决策
3. **Design System 产出**：tokens（色板/字体/间距）、typography、grid、components、assetContracts
4. **可追溯性**：每个 Direction 关联 source brief_id；每个 Design System 关联 direction_id

## 跨领域场景（≥3 条可追溯）

| scenario | 域 | brief→direction→system 链 |
|---|---|---|
| brand-campaign-360 | 品牌 | ✅ |
| commercial-design-router | 商业 | ✅ |
| master-guided-art-direction | 艺术指导 | ✅ |
| master-method-visual-upgrade | 方法升级 | ✅ |
| reference-to-original-system | 参考转化 | ✅ |
| visual-quality-refinement | 视觉质量 | ✅ |

## 验证

- `verify_runtime_contracts_v3.py`：scenario 存在性 + SKILL/open-design 结构
- object-model round-trip：brief/direction/design-system schema 可解析可 round-trip

## 关联

- schemas: design-brief / design-direction / design-system / design-critique
- 吸收: taste-skill brief 推断（knowledge/visual-quality/taste-skill）、ui-ux-pro-max 设计智能数据（intelligence/ui-ux-pro-max）
