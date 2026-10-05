# 09 — C7 Windows M1 可用版本就绪度

对应 `DL-R5-015`。结论：**未达 `M1_CANDIDATE`**。

## 本轮实测到的运行时事实

| 子项 | 读数 | 判定 |
|---|---|---|
| C7.1 一个启动入口 | `design-lab --project <dir> serve [--port]` 存在，但 **token 必须由 launcher 从 stdin 注入**；`serve --help` 无 `--token`/`--open`；全仓 grep `design-lab serve` 在 docs/scripts 里**零命中**，即没有任何面向用户的启动脚本或使用文档 | **缺口确认**：用户无法一条命令打开可用 Workbench → `PARTIAL` |
| 技术栈边界 | Workbench 仍是 Vite + strict TS + 单 bundle（`build/main.js` classic-script），未引入 Electron/Tauri/第二前端 | 符合 Authority §3/§4 |
| C7.2 Install | 未在本轮做 clean-environment 安装验证（`verify_workbench_packaging.py` 5 checks 只证明打包合同，不证明安装后可用） | `NOT_EXECUTED` |
| C7.3 Persistence | 服务侧持久化在截图采集中被真实使用（建项目/简报/方向/绑定写入临时项目根），但**未做 stop→restart→读回** 的 M1 级验收 | `PARTIAL` |
| C7.4 Restart / C7.5 Upgrade-backup-rollback | 未执行 | `NOT_EXECUTED` |
| C7.6 黄金流 | 主链在「宿主」一步断住（owner 未授权启动），后续 Human Jury / Rights / Preflight / Handoff / 重开再编辑均无法发生 | `BLOCKED` |

## 为什么不能叫 M1

任务书的 M1 判据要求 `Reference → Design IR → Photoshop/Illustrator → 原生可编辑文件 →
Readback → 两次局部修改 → Human Review → Rights → Preflight → Handoff → 关闭 → 重开 → 再编辑`
整链成立。当前断点有三处，且都是**同一根因**（宿主未启动 + 人工门未过）：

1. C3/C4 宿主 E3（`BLOCKED_PERMISSION`，owner 本轮只允许只读探测）；
2. C5 两次局部修改与失败/回滚实测（依赖 1）；
3. C6.2 Human Jury（`BLOCKED_HUMAN`）。

C2 的 Plan→RIR 接缝已补，使 1→2 的距离显著缩短，但**不改变**上述判定。

## 达到 M1 的最小后续动作（按依赖排序）

1. owner 授权 → 跑 `prepare_illustrator_lowered.py --execute-com` 与
   `prepare_photoshop_native.py --execute-com`，产出 host_live evidence；
2. 基于 1 做两次对象级 patch + 关闭重开读回（C5.1/C5.3/C6.6）；
3. 提交预览/diff/可编辑源给 owner 做 REJECT→修正→PASS（C6.2）；
4. 补 raster materialization 前置（当前 lowering 对 crop/sourceMappings 刻意 fail closed）；
5. 实现并验证最短启动路径（一个 thin launcher：生成 token、起 serve、打印 URL），
   再做 clean-env install + restart + persistence 验收（C7.1–C7.5）。
