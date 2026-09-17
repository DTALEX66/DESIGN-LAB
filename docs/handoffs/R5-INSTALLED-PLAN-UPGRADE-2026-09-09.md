# R5 新版对象计划安装、回退与升级验证

范围：DL-R5-009/003 增量；本轮不调用 Adobe，不把安装测试冒充宿主实测。

## 固定构建

- 源码 SHA：`305d93b`（完整身份由该提交解析）。
- 新 wheel：`.project-local/task-artifacts/wheel-r5-browser-305d93b/design_lab-0.1.0a0-py3-none-any.whl`。
- SHA256：`b6dde45cbb8c0a4fa5440239002864d46d54b1e42a4619a9230eb81479a7ad8f`。
- 离线命令：`uv build --offline --wheel --python .venv/Scripts/python.exe --out-dir .project-local/task-artifacts/wheel-r5-browser-305d93b`，exit 0。
- 65 个 ZIP 条目，无重名，无 `.project-local` 运行数据。
- 逐字节确认 `native_plan.py`、`native_submissions.py`、`native_workers.py`、工作台 `main.ts` 与当前源码一致。
- uv 的 source 内 cache 警告仍保留；实际成员检查通过。

## 已安装执行

解释器 `.project-local/task-runtime/workbench-installed/Scripts/python.exe`，Python 3.13.14。工作目录为项目内非源码目录 `.project-local/task-runtime/tmp`，通过 `-I -B -X utf8` 调用测试辅助 `design-lab/tests/host_fixtures/installed_plan_smoke.py`，不注入 sys.path，确认模块来自 `Lib/site-packages/design_lab`。

独立测试项目 `.project-local/task-runtime/installed-plan-smoke-305d93b`：

1. 真实 PNG 字节导入；以资产 ID 构造含 alpha 的 raster RIR。
2. AI、PS 分别执行完整 plan lowering 和持久化 enqueue。
3. 重建服务对象、重复相同 key，attempt ID 不变。
4. 两项由 PENDING 取消为 CANCELLED。
5. 对取消项尝试 worker.start，得到 `NATIVE_TASK_NOT_PENDING`，没有派发宿主。
6. 未生成 AI 或 PSD 文件。

结果 PASS，exit 0：

- AI attempt `att-39e5e8ba8693460b852425d0e2276a79`。
- PS attempt `att-1801d71b82e1447eb175ad8796fe0a9a`。

隔离数据库只用于无宿主测试，未绕过主项目 Photoshop 未决 guard。

## 实际回退再升级

通过 `uv pip install --offline --python <installed-python> --no-deps --reinstall <wheel>`：

- 从新包回退到 `.project-local/task-artifacts/wheel-r5-queue-fixed/design_lab-0.1.0a0-py3-none-any.whl`（SHA256 `e71b1759b7ead8105f53deb7235f6d3790b0aa95d118926c40f654c53313fe17`）。
- 用旧安装包的 ProjectService / TaskQueries 打开同一测试数据，两项状态仍 `CANCELLED`：`ROLLBACK_READBACK_PASS`，exit 0。
- 再安装新包，重复读取同一数据：`UPGRADE_READBACK_PASS`，exit 0。
- 最终隔离环境停留在新包。未全局安装，未修改系统环境或依赖版本。

注意两个包均为 `0.1.0a0`，此次是按精确 wheel hash 的替换/回退测试，不证明正式版本号升级策略、签名安装器或任意数据库迁移兼容性。

## 边界

已验证 `INSTALLED_RUNTIME_VERIFIED` 的范围仅图片导入、RIR 转换、幂等排队、取消与拒绝再启动，以及上述两个精确包间状态读回。安装版浏览器、安装版真实 Adobe 调用、完整导出、发布及 exact-SHA CI 仍未在本轮执行。此前源码真实浏览器证据见 `R5-BROWSER-ILLUSTRATOR-REAL-2026-09-09.md`，不能自动提升为安装包宿主证据。
