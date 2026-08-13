# DESIGN-LAB（设计实验室）

> **面向职业视觉设计的、AI 原生、平台中立的设计智能与生产能力实验室。它把设计研究、合规知识、设计方法、领域能力、视觉质量、专业工具适配、生产预检（commercial preflight）、可编辑交付和证据体系（evidence & provenance）组织为可组合、可执行、可验证、可回滚的设计能力闭环。**

> **Agent-platform-neutral design intelligence and production laboratory for professional visual design. Host-native; current reference host: Open Design (no default binding).**

## 一屏说明

**DESIGN-LAB 不是第二个设计软件前端，也不是静态资料库。** 它是一个**产品化的设计能力系统**：

```text
研究/开源资料                    = 受治理的知识与证据底座
可测试的 Method / Rubric / Pack   = 可复用专业能力
Host / Agent / Tool Adapters      = 在现有工作界面中执行能力
Preflight / Handoff / Evidence    = 商业生产闭环
```

设计师在已接入的宿主（当前为 Open Design 参考入口，未来可为 Adobe/Figma/Blender/ComfyUI 等）中工作；DESIGN-LAB 提供合同、方法、质量门、可编辑交付和适配器。**host-native first，不重建第二画布、聊天客户端、模型网关或通用 SaaS 后端。**

## 视觉设计是第一主线

品牌视觉 / 平面与编辑 / UI·UX / 电商视觉 / 包装 / 空间与展陈 / 3D / 动效 / 视频视觉 / 游戏视觉与交互界面。

## 六能力域

```text
01 Design Intelligence    02 Professional Visual Domains    03 Visual Quality
04 Creative Toolchain     05 Production & Handoff           06 Research & Evidence
```

## 当前主目录 / 云端仓库

```text
主目录：D:\All projects\DESIGN-LAB
云端：  https://github.com/DTALEX66/DESIGN-LAB
```

## 目录职责

```text
design-lab/     能力层：core / intelligence / atoms / bundles / scenarios /
               domain-packs / quality / production / knowledge / research /
               evals / schemas / config / scripts / templates / assets / adapters
design-system/  中性设计协议资产（DESIGN.md / Schema / Tokens / component rules）
minigame-runtime/  游戏视觉设计 fixture / runtime reference（冻结边界，非产品）
project-memory/  九份活动 SSOT + history/
reports/        阶段验收、证据与交接报告
```

## 关键文档

```text
project-memory/PRODUCT_DEFINITION.md    ← 唯一产品定义（SSOT）
project-memory/ARCHITECTURE.md          ← 技术架构
project-memory/BOUNDARY_CONTRACT.md     ← 职责边界
project-memory/NEUTRALITY_POLICY.md     ← 平台中立
project-memory/EVIDENCE_POLICY.md       ← 证据政策
project-memory/ADAPTER_POLICY.md        ← 适配器政策
project-memory/OBJECT_MODEL.md          ← 核心对象模型
project-memory/USER_MODES.md            ← 五类用户
project-memory/ROADMAP.md               ← 路线图
design-lab/config/product-manifest.json ← 机器可读 SSOT
```

## 主规则

1. **宿主是主角**：设计流程、画布、AI 调用、生成都在所接入宿主（当前 Open Design）里完成。
2. **本仓库增强专业判断与交付能力**：协议、知识、Domain Pack、质量门禁、预检、可编辑交付、证据。
3. **不做宿主替代品**：不重建画布/编辑器/模型网关/SaaS 后端。
4. **不把文件存在冒充运行可用**：静态文件/Manifest 只证明 E1；真实执行与读回才是 E3。
5. **平台中立**：产品契约不绑定默认 host/agent/model；宿主选择属于本地 profile/项目级配置。
6. **证据分级诚实**：E0–E5 各级不互相冒充；未达 E3 不写"已集成"。

## 已吸收内容（历史）

- 原 MINIGAME 游戏生产系统 → 收敛为 `minigame-runtime/` 游戏视觉 fixture。
- 原 Design-system → 收敛为 `design-system/` 中性设计协议资产。
- 旧 `OPEN-DESIGN-Assistance` 身份 → 历史归档（`project-memory/history/`、`reports/history/`），不再作为活动产品名。

## 验证入口

```bash
python design-lab/scripts/verify_design_lab.py   # 全验证链
python -m pytest design-lab/tests/               # 单元 + fixture 测试
```
