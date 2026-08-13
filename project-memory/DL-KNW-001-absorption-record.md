# DL-KNW-001 — 设计类资料吸收记录

- 任务：DL-KNW-001 Knowledge Acquisition（人工资料审核与吸收）
- 状态：✅ 第一批吸收完成（2026-08-13）
- 方式：GitHub 公开设计 SKILL/项目，MIT 许可核验后源码级 vendoring

## 吸收清单（源码级 vendoring，含 LICENSE + SOURCE.md）

| 来源 | 许可 | 落点 | 内容 | 规模 |
|---|---|---|---|---|
| [Hallmark](https://github.com/Nutlope/hallmark) | MIT | `knowledge/visual-quality/hallmark/` | anti-AI-slop 设计原则、结构多样性、21 宏结构、60+ 组件配方、slop-test 评分 | 107 文件 / 675KB |
| [Taste-Skill](https://github.com/Leonxlnx/taste-skill) | MIT | `knowledge/visual-quality/taste-skill/` | brief 推断、设计阅读、防默认纪律、风格语言（brutalist/minimalist/soft）、redesign audit-first | 8 文件 / 144KB |
| [Huashu-Design 花叔](https://github.com/alchaincyf/huashu-design) | MIT | `knowledge/production/huashu-design/` | HTML 高保真原型、幻灯片、动画、评审、品牌协议、分镜（中文 32 references） | 36 文件 / 568KB |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT | `intelligence/ui-ux-pro-max/` | 84 UI 风格、192 色板、74 字体配对、98 UX 指南、25 图表、22 技术栈（CSV 中性数据） | 41 文件 / 1.6MB |

## 治理（每份均含）

- `LICENSE` 副本（MIT，随吸收保留版权声明）
- `SOURCE.md`：来源/作者/许可/日期/用途/再分发/模型输入/商用状态
- SOURCE_REGISTRY.json 登记（`vendor-adapt`/`adopt-now`，schema 校验通过）

## 候选待评估

- [Garden Skills](https://github.com/ConardLi/garden-skills)（MIT）→ 登记 `quarantine`/`review-required`，待评估吸收范围

## 未吸收（按边界规则）

- huashu-design `assets/`（30MB 素材——不复制大文件）
- ui-ux-pro-max `cli/`（190 文件工程代码）、`stack/`、`gallery/`、`screenshots/`
- taste-skill `imagegen-frontend-*`（图像生成工作流）、`stitch`（MCP 绑定）

## 证据

- `VERIFY_SOURCE_REGISTRY=OK`（117 条，0 错误）
- `VERIFY_DESIGN_LAB=OK total=8 failed=0`
- 全测试 96 passed + 5 subtests

## 下一步（人工）

1. 吸收内容评审：确认各 skill 与 DESIGN-LAB 能力域映射（visual-quality / production / intelligence）
2. 提炼 MethodCard / BenchmarkCase（从吸收的方法到可测能力）
3. Design assets 素材到位后：E3 本地有界提取
