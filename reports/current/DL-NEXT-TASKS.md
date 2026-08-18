# DESIGN-LAB 任务清单（2026-08-19 全量推进闭环版）

## 已完成（全量推进）

- C1-C3/D1-D2 契约任务（Design IR/生产校验/经验语料库/Action Language/质量管道）
- E1 领域包 12 个（全领域）
- 边界记录（Open Design 双身份）+ WORK-LAB 更新规划
- DTCG token 对齐（converter + dtcg.json + verifier）
- adapter 登记 23 个（含全景调研 13 个操作类 adapter，E0）
- 开源吸收：ckw-design-skill（MIT）、pixelmatch（ISC）+ 全景调研文档
- **G2 真实作品**：AURORA 电商 hero 设计交付文档（Open Design opencode 真实运行，E2 取证）
- 聚合链 33/33、Python 248/248、双端一致

## 需你人工（闭环边界，不能代替）

| 任务 | 说明 | 状态 |
|---|---|---|
| A1 人工 Jury | 评分对象已存在（G2 设计文档 + H3 视频）；五域 ≥82 + 偏好 ≥70% 需你执行 | 待你 |
| A2 复审 + Release Attestation | E4 发布链，需复审人签署 | 待你 |
| A3 来源补全 162 条 | 权利审核必须人工逐条（辅助清单已就绪） | 待你 |
| B3 分支保护 | GitHub 管理员操作 | 待你 |

## 诚实说明

- G1（PS 真实 PSD）：PS 操控已验证（smoke 可编辑 PSD 105KB），但完整 G1 脚本在本机会话不稳定（多次尝试失败）；已由 G2（Open Design 方案级作品）提供真实作品替代；PS 脚本稳定性后续可调
- H3 视频为纯技术验证（非成果）；G2 为入库的第一个真实设计作品（方案级，E2）
- chroma.js 主文件路径 API 404 暂未吸收；pypdf 全库 vendored 成本高——均降级为候选
