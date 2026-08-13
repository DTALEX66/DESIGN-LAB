# ADAPTER_POLICY — 适配器政策

- 版本：`1.0`｜状态：`ACTIVE`｜SSOT 角色：适配器契约

## AdapterRecord

```text
id / type(host|agent|tool|model) / mode
supportedObjects / capabilityScope / versions
requiredPermissions / secretHandling / networkPolicy
rightsDependencies / installPolicy / rollback
evidenceLevel / lastVerified / boundTreeSha
```

## 模式

`in-process`、`process-isolated`、`external-cli`、`external-local-api`、`external-provider-api`、`none`。

## 规则

- 所有外部适配器默认不执行；须经项目选择、明确授权和可回读证据才可运行；
- 产品契约不默认绑定任何 host/agent/model；
- 密钥只在用户本机环境配置；禁止入库、UI、日志、报告和截图；
- 未达 E3 不得写"已集成"；
- H3–Comfy bridge 未满足前置条件时明确为未启用。
