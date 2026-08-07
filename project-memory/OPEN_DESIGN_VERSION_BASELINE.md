# Open Design Version Baseline（ODA4-0301）

- 日期：2026-08-07｜证据：E1
- 来源：本机官方安装配置 `D:\Programs\Open Design\resources\open-design-config.json`（`appVersion`）

## 实测基线

| 项 | 值 | 来源 |
|---|---|---|
| **本机实际安装版本** | `0.13.0` | `open-design-config.json` `appVersion` |
| 应用类型 | Electron 桌面应用（chrome_*.pak, app.asar） | 安装目录 |
| daemon 入口 | `app/prebundled/daemon/daemon-cli.mjs` | config |
| daemon sidecar | `app/prebundled/daemon/daemon-sidecar.mjs` | config |
| web sidecar | `app/prebundled/web-sidecar.mjs` | config |
| namespace | `release-stable-win` | config |
| web 输出模式 | `standalone` | config |

## 版本确认结论

- 任务包先前的"候选基线 `0.18.1`"**未在本机得到确认**；本机实际安装的是 `0.13.0`。
- 执行所有 E3 运行/插件/Scenario 对齐，必须以 **`0.13.0`（本机实测）** 为准。
- `minimum/tested/latest` 三档：
  - **minimum**: 本仓库可兼容的最低已知版本 = `0.13.0`（本机实测，唯一已确认）。
  - **tested**: `0.13.0`（本机安装，待 ODA4-0303 运行验证）。
  - **latest**: 需从官方发布渠道确认；当前未联网核实，不臆造。

## 记录位置
- 本文件：`project-memory/OPEN_DESIGN_VERSION_BASELINE.md`
- 机器可读：`opendesign-assistance/config/compatibility-baseline.json`

## 边界
- 不读取任何凭据/认证/私有状态。
- `telemetryRelayUrl`/`posthogKey` 为应用遥测配置，非本项目凭据，不纳入仓库。
- 未联网时不得虚构官方 latest 版本。
