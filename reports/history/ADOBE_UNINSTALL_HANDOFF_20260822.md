# Adobe 软件全面清除 — 交接摘要（2026-08-22）

> **HISTORICAL SNAPSHOT — NOT CURRENT EVIDENCE.** 本文件记录 Adobe 卸载清理
> 任务的过程与结果；不构成任何运行时 attestation 或能力等级证据。

## 任务

用户反馈 Adobe 软件版本过旧，要求全面更新。第一步：全面清除现有 Adobe 软件
（静默卸载 + 全量清理，含注册表与文件残留）。

## 卸载前盘点

| 软件 | 版本 | 位置 | 大小 |
|---|---|---|---|
| Adobe Photoshop 2023 | 24.5.0.500 | `C:\Program Files\Adobe` | 5.4 GB |
| Adobe Illustrator 2023 | 27.5 | `C:\Program Files\Adobe` | 5.4 GB 内 |
| Adobe Acrobat DC | 20.013.20074 | `C:\Program Files (x86)\Adobe` | 1.8 GB |
| 共享组件（Common Files/ProgramData） | — | — | ~2.7 GB |
| 用户数据（AppData） | — | — | ~130 MB |

另有历史残留：`AppData\Roaming\Adobe` 中遗留 Photoshop 2021 设置（早前卸载不干净）。

## 执行方式（关键）

- 当前 shell 为 git-bash，**非管理员**；卸载 Program Files 需提权。
- 统一经 `PowerShell Start-Process -Verb RunAs -Wait` 提权运行 Python 脚本
  （会触发 UAC；cua-driver 因安全设计拒绝操作授权进程，属正常保护）。
- 脚本结果写 `.hermes/task-runtime/*.log`，提权进程 stdout 不可见，靠日志回读。

## 清理结果（全部完成）

1. **静默卸载**：Photoshop rc=0、Illustrator rc=0、Acrobat（首次 rc=1602，重试成功）。
2. **目录**：Program Files、Program Files (x86)、Common Files、ProgramData、
   AppData（Roaming/Local/LocalLow）全部清空。
3. **进程**：结束 CCXProcess / node / AdobeIPCBroker 等后台进程。
4. **服务**：Adobe 相关服务全部删除（stop=1060 即不存在）。
5. **System32 组件**：AdobePDF.dll（停 spooler 后强删）、AdobePDFUI.dll、
   AdobeRGB1998.icc。
6. **快捷方式**：桌面 + 开始菜单 4 个 .lnk 删除。
7. **注册表**：
   - Uninstall 键（HKLM 64/32 + HKCU）→ 无 Adobe
   - Adobe 主键（HKLM\SOFTWARE\Adobe、WOW6432Node、HKCU\SOFTWARE\Adobe）→ absent
   - **332 个 HKCR 文件关联类**（Photoshop/Illustrator COM）→ 全删
   - **109 个 CLSID + 9 Interface + 1 Interface(WOW64)** → 全删

最终验证：注册表深层检查 + 文件系统扩展扫描全部 0 命中。

## 遗留项（重启后自动删除）

- `C:\Program Files\Adobe` 下 2 个空目录壳（Illustrator 2023 / Photoshop 2023，
  0 字节），已 `MoveFileEx(MOVEFILE_DELAY_UNTIL_REBOOT)` 标记 pending-delete。
- 这是 Windows 对系统级锁定文件的强制机制，重启后自动删除。

## 重要交叉影响（务必知悉）

DESIGN-LAB 的 Adobe 适配器运行时测试依赖本机已卸载的软件：

- `V42_HANDOFF_SUMMARY_20260822.md` 记录的 **Photoshop 2023 COM 启动 + E3 fixture**
  （`adobe-e3-fixture/photoshop/`）与 **Illustrator 2023 COM 测试**，其软件本体已卸载。
- 上述 E3 证据在新版本 Adobe 安装前**不再可复现**。
- 下一步装好新版本后，需重做 COM 启动读回 + 受控 fixture，再更新能力等级证据。

## 脚本位置

14 个脚本均在 `.hermes/task-runtime/`（忽略目录，运行数据不进 git）：
`inventory_adobe.py`、`uninstall_adobe.py`、`adobe_leftover_cleanup.py`、
`adobe_final_cleanup.py`、`adobe_kill_processes.py`、`adobe_reboot_delete.py`、
`adobe_coresync_cleanup.py`、`adobe_spooler_cleanup.py`、`adobe_extended_cleanup.py`、
`adobe_hkcr_cleanup.py`、`adobe_clsid_cleanup.py`、`list_adobe_leftover.py`、
`scan_adobe_extended.py`、`check_adobe_registry.py`。

## 下一步

1. 安装新版本 Adobe（Creative Cloud 桌面版或独立安装包）。
2. 装好后重做适配器 COM 启动读回 + fixture 测试，更新 E3 证据。
