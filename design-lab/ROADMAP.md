# DESIGN-LAB Roadmap

> Agent-platform-neutral design intelligence and production capability layer.
> Current reference host: Open Design (version-agnostic). Any design AGENT platform may act as host/entry via adapters.

本路线图基于 `project-memory/PRODUCT_DEFINITION.md` 与 `design-lab/ARCHITECTURE_V3.md`（平台中立）。

## 项目原则

```text
设计 AGENT 平台（当前参考宿主：Open Design） = 设计流程、AI 调用、主窗口画布的实际执行环境。
DESIGN-LAB = 面向任意设计 AGENT 平台的能力增强层：
             设计方法、设计体系、来源/权利、质量 Rubric、生产预检、可编辑交付、证据。
```

- 本仓库不成为第二个设计前端、不成为工作流中心；
- 能力经 Host Adapter（当前 `design-lab/adapters/hosts/open-design/`）接入宿主平台；
- 不绑定软件、不绑定版本：模型中立、风格中立、领域中立、平台中立、版本中立、权利受治理（Rights Governed）。

## Phase 1：Host Adapter 基线（Open Design 参考宿主）

状态：基线已建立。

```text
design-lab/adapters/hosts/open-design/   Host Adapter 专用工具与合同
design-lab/scripts/doctor_*.py           Host 环境诊断
design-lab/usage-notes/PORTABLE_*.md     便携安装与验收
```

下一步：把 doctor 输出接入 Host usage note，形成新机器安装后的固定验收清单。

## Phase 2：能力层中立化收口

- 旧 Open Design 中心语义文档归档至 `project-memory/history/`；
- 可运行第三方前端不再位于活动 `intelligence/` 能力层（已隔离至 `design-lab/research/quarantine/`）；
- 外置资料库仅接受 SourceRecord → 提取结果 → MethodCard / ReferenceSet / Rubric / Benchmark，见 `KNOWLEDGE_ASSET_POLICY.md`；
- 验证链 fail-closed：缺失验证器失败、失败不写 `.verify-chain-ok`、无 exact-SHA 证据 release verifier 非零退出。

## Phase 3：多 Host 适配与运行时取证

- Photoshop / ComfyUI / MiniMax H3 等 Host Adapter E3 运行时取证；
- 四类人工案例验收（Benchmark / Jury）；
- 多平台能力注册表与证据索引随当前 main 重生成。
