# 09 — C7 Windows M1 可用版本就绪度

对应 `DL-R5-015`。结论：**未达 `M1_CANDIDATE`**。

## 本轮实测到的运行时事实

| 子项 | 读数 | 判定 |
|---|---|---|
| C7.1 一个启动入口 | **已实现**：`python -m design_lab --project <dir> workbench [--port] [--no-browser]` 进程内起服务，首行输出 `{status,url,port,token}`，token 只存在于该进程与终端（不进 argv/URL/文件），默认自动开本机浏览器。`serve` 保留为脚本化底层入口（tty 上仍拒绝无 stdin 启动） | `DONE_E2`（测试驱动真实 CLI 子进程读回） |
| 启动读回证明 | `design-lab/tests/test_workbench_launch.py`：LISTENING 公告、`/workbench` 200 + CSP 逐字节、`/workbench/main.js` 与**已提交 bundle 逐字节相等**、带 token 的 `/api/health` = OK、无 token 的 `/api/projects` = 401 | 3 tests（2 PASS + 1 诚实 skip） |
| C7.2 Install | 本机离线无法建 wheel（venv 无 hatchling、`uv` 不在 PATH）→ 改为**新增 CI job** `wheel-install-gate`：`uv build --wheel` → 干净 venv 安装 → `DL_LAUNCH_INSTALLED=1` 跑同一套启动测试，其中 packaged 测试断言安装态 bundle 与提交态逐字节一致 | `PENDING_CI_VERDICT`（本地不宣称） |
| C7.3 Persistence | `test_project_data_survives_a_full_process_restart`：经 API 建项目 → **终止进程** → 重启 → 项目仍在同一 id | `DONE_E2` |
| 技术栈边界 | 未引入 Electron/Tauri/第二前端；启动器是同一 Python 包内的一个子命令 | 符合 Authority §3/§4 |
| C7.4 Restart / C7.5 Upgrade-backup-rollback | 服务级重启已覆盖；**应用级/Windows 会话级重启与升级-备份-回滚未执行** | `NOT_EXECUTED` |
| C7.6 黄金流 | 主链仍断在宿主一步（owner 不授权启动），后续 Human Jury / Rights / Preflight / Handoff / 重开再编辑无法发生 | `BLOCKED` |

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
4. ~~补 raster materialization 前置~~ → **已完成**：`materialize_raster_regions`
   把参考图区域裁成 staged 资产，照片区域现在能 lower 成合法 Illustrator raster 层；
5. ~~实现最短启动路径~~ → **已完成**（见上表 C7.1）；剩余是把 `wheel-install-gate`
   的 CI 判读回来，再做 Windows 应用级/会话级重启与升级-备份-回滚（C7.4/C7.5）；
6. 把 `plan_to_rir` / `materialize_raster_regions` 接成服务侧任务与 Workbench 入口
   （需要 provider 真实产出 detections，否则只是空壳路由，不做）。
