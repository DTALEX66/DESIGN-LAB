# DESIGN-LAB 任务清单（2026-08-19 联邦执行后）

## 已完成（全部非人工任务）

- TP-20260819 P0/P1/P2 全部（身份中立化/知识角色/证据对齐/转化链/评估/归档）+ 9 交付文件
- 联邦契约落地：ExtractionJob/CandidateKnowledge 验证器 + 21 对象（19→21）
- E2E-002 联邦 E2E（Brief→IR→Knowledge→Quality→Handoff）FEDERATION_E2E=PASS
- 聚合链 35/35、Python 全过、双端一致
- 吸收：ckw-design-skill（MIT）+ pixelmatch（ISC）；chroma.js/pypdf 降级为操作层参考（多文件库，不 vendored）

## 人工延后（需你）

| 任务 | 说明 |
|---|---|
| A1 人工 Jury | 评分对象已存在（G2 设计文档） |
| A2 复审 + Attestation | E4 发布链 |
| A3 来源补全 162 条 | 权利审核逐条 |
| B3 分支保护 | GitHub 管理员 |
| OpenPencil 试点批准 | 许可证核验后进 adapter 开发 |

## 说明

- chroma.js/pypdf：多文件运行时库，与验证器仅标准库纪律冲突 → 操作层 adapter 候选（不 vendored）
- H3/ComfyUI E3 保留（纯测试产物）；G2 为真实作品（E2）
