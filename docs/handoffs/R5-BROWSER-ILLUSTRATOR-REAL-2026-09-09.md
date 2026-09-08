# R5 页面到真实 Illustrator 制作与下载读回

## 范围与结论

代码基线 `0b82e71c7c095c7a49a48e2e027e264c971e0c06`，Windows，Python 3.13.14，Illustrator 29.5.1，Playwright CLI 0.1.19 / Edge headless。

DL-R5-010/011 增量：真实浏览器新建项目 → 填入既有真实海报对象计划 → 排队 → 显式启动 → 原生保存关闭重开 → 页面 hash 校验 → 浏览器下载 ZIP，已实测。不是完整 M1 验收，不提升整项 DONE。

本次没有修改产品代码。新增 `design-lab/tests/host_fixtures/fill_real_poster_browser.py` 为大尺寸既有 RIR 填表辅助，避免 Windows 命令行长度限制；它不伪造任务事件，也不直接调用提交 API。

## 身份与实际执行

- 项目：`828ccec779ac4d88a0b1dd9e41fc63ba` / R5 Real Poster Browser 20260909。
- attempt：`att-0c6d4aec4b524289b1042401031be5fc`，最终 `RECEIPTED`（页面投影 `SUCCEEDED`）。
- job：`native-job-614d67a67ead58407e28e9198f0bbc573427f58deba1416edef0dba9dbba0f5b`。
- 排队：2026-09-08T18:46:02.514240Z；显式启动约 18:46:23Z；完成 18:47:44.735195Z。启动到完成约 81 秒，排队到完成约 102 秒。
- 临时服务 `browser_workbench_session.py --live-project`，端口 58442，使用主项目数据库和原生 guard；内存临时访问凭据未保存到报告。
- 原生 worker 曾实际存在：PID 28040 / 12188；不是只由数据库 RUNNING 字段推断执行。
- Illustrator 文档数 0 → 0；成功 receipt 后其 guard 释放。Photoshop 的 `att-52901594c1684782a99b689538aaebf3` guard 保留，未调用 Photoshop。
- 源计划：`.project-local/task-artifacts/real-poster-20260908/run-3bc50140e7f44caca5393c29002c43f9/source-rir.json`；文字样式同目录 `text-styles.json`（99 项）。复用 651 个对象计划，不是本轮新做自动拆解。
- RIR hash：`269d95511c38747ffa4ebbf6a93eed98b710fc1f0067f87ed6dec0439994bae3`。
- job hash：`8b5367f7fbad201eebd9d20071b13f4418f056b1e9b6bfba40e4a94cf7af914e`。
- bridge hash：`4a6369fa5a5bb2d631d1a996ecdceac73eb2ba30653a8bb34d837a7a50cf2fc2`。

## 原件与浏览器读回

已发布本地 AI 版本：`v-4e37c6324d9f41f9b4ad7b12da453b89`。

浏览器实际下载：`.project-local/task-artifacts/browser-r5/design-lab-dba9dbba0f5b.zip`，SHA256 `58222b96ca3ffff80c3746301e177322d4a00526c2bd927b4746df4e098c4533`。

| ZIP 成员 | 字节数 | SHA256 |
|---|---:|---|
| native.ai | 683410 | 58b387092cd01f4587ae77125a9888a42fb4c8b8038435c5b4cc42b784dbafc0 |
| preview.png | 419943 | 94f7dec69c87f5959b27b10e649b1c44a6fe98079582536be66d5a0a7bf2765e |
| preview.svg | 3629026 | c1593c60103b4347b87331d9302e79b0669175c843536106596634af9651242e |
| bundle-manifest.json | 883 | 457f2da2ac0601355828abc3dd52448bb63182bd18e9f65c8ab2f4087a27d315 |

成员逐一读取并计算 SHA256，与 receipt 的三个产物一致。PNG/SVG 与先前同一计划的输出 hash 相同，证明本次重放结果一致，不代表参考图像素级精确或人审接受。

页面证据均在 `.project-local/task-artifacts/browser-r5/`：

- `page-2026-09-08T18-48-47-150Z.yml`：`8527e371accf74dfd3da5df3159e55bbb17f783c412c405f12790a8ce9b07cb8`。包含 AI `HASH_VERIFIED` 与交付包下载 hash 核对状态。
- `page-2026-09-08T18-49-08-381Z.png`：`a201d7a9421d625d8de35ec7744fb398ea1f63a1df9128c7d3e37d01e74cebe9`。只作截图原件，不声称本轮已做视觉布局 QA。
- 当前服务页面 console：0 errors / 0 warnings。

## 失败、边界与下一步

1. 上一临时服务 57509 已结束（无监听端口）；旧页面新建操作遇到连接错误。本次确认服务终止后才启动新会话，不是重复原生任务。
2. CLI `run-code` 中 `require` 不可用；读取其 `--help` 后改用 `--filename` 与项目内生成填表代码，成功。未更改全局运行配置。
3. 全局约定的 `scripts/workflow/execution_preflight.py` 在本仓不存在；使用精确项目解释器确认版本及 jsonschema 导入后运行真实规范门。
4. `.venv/Scripts/python.exe -B -X utf8 design-lab/scripts/verify_design_lab.py`：49 门 PASS，exit 0。其 Comfy 历史记录检查不证明本轮 Comfy 推理。
5. 缺口仍有：从页面完成两次对象 patch；真正参考导入到自动拆解的完整链；刷新/重启恢复；安装包新代码资格；5—10 张参考集；字体/链接/rights/质量人审。旧 OCR、Arial 替代和局部差异问题没有在本轮解决。
6. 未上传、未合并、未发布；CI 未对本轮提交验证。ignored 原件只在本机，报告不能替代原件迁移。
7. 回退测试辅助可独立回退；保留新项目、原件和失败证据，不删除用户作品、不关闭共享宿主、不清除 PS guard。
