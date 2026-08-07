# Open Design Version Baseline（ODA4-0301）— UPDATED

- 最近更新：2026-08-07（从 0.13.0 升级到 0.18.0）
- 来源：官方 `https://releases.open-design.ai/stable/versions/0.18.0/open-design-0.18.0-win-x64-setup.exe`
- 证据：E1（安装后 `open-design-config.json` 读回 `appVersion`）

## 实测基线（当前）

| 项 | 值 | 来源 |
|---|---|---|
| **已安装版本** | `0.18.0` | `open-design-config.json` `appVersion` |
| 安装包 | `open-design-0.18.0-win-x64-setup.exe`（311 MB, NSIS） | releases.open-design.ai |
| 安装包 SHA-256 | `a76a4c28...2ac02f48cb` | 本地校验 |
| namespace | `release-stable-win` | config |
| daemon 入口 | `app/prebundled/daemon/daemon-cli.mjs` | config |
| amrProfile | `prod` | config |
| web 输出模式 | `standalone` | config |

## 升级历史

| 日期 | 从 | 到 | 方式 |
|---|---|---|---|
| 2026-08-07 | 0.13.0 | **0.18.0** | 官方安装包静默升级（NSIS /S） |

## 版本档位（更新后）

- **minimum**: `0.13.0`（历史已知可运行）
- **tested**: `0.18.0`（当前已安装）
- **latest**: `0.18.0`（官网 `/download/` directAssets 权威字段确认）

## 记录位置
- 本文件：`project-memory/OPEN_DESIGN_VERSION_BASELINE.md`
- 机器可读：`opendesign-assistance/config/compatibility-baseline.json`
