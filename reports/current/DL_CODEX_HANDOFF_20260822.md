# DESIGN-LAB 工作交接记录（2026-08-22）

## 本次完成项

- 通过 SSH 将仓库载入本机并完成项目、交接文档与依赖环境检查。
- 修复 Windows 上 Open Design 命令输出的 UTF-8 解码问题：子进程输出现在显式使用 UTF-8，并以替换模式处理异常字节。
- 新增 Photoshop UXP 本地校验插件骨架。它只校验固定的 E3 fixture 合约，不会修改 Photoshop 文档、偏好设置或本地文件。
- 以人工执行 JSX fixture 的方式完成 Photoshop 2025 与 Illustrator 2025 的三轮创建、保存、重开读取、预览导出和恢复读取验证；本地测试产物保留在忽略的 `.hermes/task-artifacts/`，不进入版本库。

## 已验证

- `python scripts/run_python_tests.py`：250/250 通过。
- `python design-lab/scripts/verify_design_lab.py`：43/43 通过。
- `node --check design-lab/adapters/creative-tools/adobe/uxp-photoshop-runner/index.js`：通过。
- Photoshop fixture 日志显示版本 `26.7.0`，三轮均为 1920×1080、2 layers、1 group，结果 PASS。
- Illustrator fixture 日志显示版本 `29.5.1`，三轮均为 1920×1080、1 group、1 text、1 path，结果 PASS。

## 新增 Photoshop UXP 插件

路径：`design-lab/adapters/creative-tools/adobe/uxp-photoshop-runner/`

- `manifest.json`：Photoshop 24+、manifest v5、本地文件权限请求。
- `fixture-job.example.json`：固定 E3 任务（1920×1080、三轮、create/save/reopen/export/restore）。
- `index.js`：校验任务 schema、尺寸、轮次与阶段，不执行主机写操作。
- `runner.html`：命令入口页面。
- `README.md`：通过 Adobe UXP Developer Tool 的手工加载步骤。

## 未完成与边界

- 未安装或加载 Adobe UXP Developer Tool；因此新插件尚未在 Photoshop 内实际运行。
- 该插件只是无写入的合约校验器，不能替代完整 E3 适配器。尤其未覆盖 Photoshop 调整层/蒙版和 Illustrator 链接对象的严格断言。
- 发布门禁仍受未接受的能力证据卡约束；Android 运行时不在本轮设计类验收范围内。
- Creative Cloud 是当前 Adobe 官方推荐的 UXP Developer Tool 安装渠道。GitHub 上的第三方侧载工具需要写入用户 Adobe 插件目录，尚未采用。

## 后续建议

1. 在 Creative Cloud 安装 Adobe UXP Developer Tool，并在 Photoshop 中启用 Developer Mode。
2. 加载本目录的 `manifest.json`，运行 `Validate DESIGN-LAB Fixture Job`。
3. 逐步实现受限的实际执行命令，并为每轮输出保存项目内证据、哈希与读取回写记录；完成后再更新能力证据状态。

## 回滚

- 删除本次提交即可恢复两个 Python 脚本和 UXP 插件骨架。
- 本次没有修改 Adobe 设置、系统环境变量或全局依赖。
