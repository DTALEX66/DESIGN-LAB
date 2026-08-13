# EVIDENCE_POLICY — 证据政策

- 版本：`1.0`｜状态：`ACTIVE`｜SSOT 角色：证据契约
- 权威：本文件 + `product-manifest.json` 的 `evidencePolicy` 一致

## 证据等级

| 等级 | 含义 |
|---|---|
| E0 | 声明/合同级：仅有契约、清单、无执行 |
| E1 | 只读验证：静态检查、schema 校验、hash 一致 |
| E2 | 本地执行：单元测试、确定性生成器、本地回路 |
| E3 | 真实运行时：宿主/工具实际执行、读回、回滚证据 |
| E4 | 发布级：exact-SHA CI、artifact、人工审批 |
| E5 | 生产验收：客户/生产环境验证与长期读回 |

## 证据记录要求

每条 EvidenceRecord 必须包含：
`E 等级 + boundTreeSha + 责任人 + 时间 + 执行命令/环境 + 输入 hash + 结果 + 人工审批人`

## 铁律

- 未达 E3 不得写"已集成"；
- 单张 AI 生成图不得作为通过证据；
- 静态文件/schema 通过/VLM 自评不得冒充运行可用；
- 历史证据绑定旧树 SHA 时不得复用于新树。
