# ARCHITECTURE — DESIGN-LAB 技术架构

- 版本：`1.0`｜状态：`ACTIVE`｜SSOT 角色：架构契约
- 定位：**Agent-platform-neutral** design intelligence and production laboratory for professional visual design with **commercial** production preflight and editable delivery; host-native, no default binding.

## 目标树

```text
DESIGN-LAB/
├─ design-lab/
│  ├─ core/                    # objects, contracts, policy
│  ├─ intelligence/            # intake, direction, system, critique
│  ├─ atoms/                   # small testable capabilities
│  ├─ bundles/                 # public composites
│  ├─ scenarios/               # end-to-end visual design cases
│  ├─ domain-packs/            # professional domains
│  ├─ quality/                 # rubrics, juries, visual regression
│  ├─ production/              # preflight, handoff, provenance, rollback
│  ├─ knowledge/               # governed sources and methods
│  ├─ research/                # benchmarks and experiments
│  ├─ evals/                   # test fixtures and evidence indexes
│  ├─ schemas/                 # neutral JSON schemas
│  ├─ config/                  # checked-in neutral registries
│  ├─ scripts/                 # deterministic generators/verifiers
│  ├─ templates/
│  ├─ assets/
│  └─ adapters/
│     ├─ agents/{hermes,codex}/
│     ├─ hosts/open-design/
│     └─ creative-tools/{adobe,figma,blender,penpot,ffmpeg,comfyui,minimax-h3}/
├─ packages/design-system/              # neutral reusable design protocol assets only
├─ fixtures/domains/game-visual/           # frozen game-visual fixture; not product
├─ docs/
├─ reports/
└─ README.md
```

## 分层

1. **对象层**（core/）：13 个核心对象与 schema；
2. **智能层**（intelligence/）：Brief → Direction → DesignSystem；
3. **领域层**（domain-packs/）：专业领域 pack（不污染 core）；
4. **质量层**（quality/）：Rubric、Jury、回归；
5. **生产层**（production/）：Preflight、Handoff、Provenance、Rollback；
6. **适配层**（adapters/）：Host/Agent/Tool/Model 适配器，无默认绑定；
7. **证据层**（evals/ + research/）：E0–E5 证据、基准、人工评审。

## Host compatibility without product pollution

`open-design.json` 文件名与上游 `$schema` 仅在其是字面 Open Design payload 时保留，且必须标记 `hostAdapter: open-design`。Open Design 特定安装/doctor/scaffold/runtime 代码位于 `integrations/hosts/open-design/`。不得因字符串含"Open Design"而全局改名上游契约；也不得以旧名作为活动 core 文档的默认产品身份。
