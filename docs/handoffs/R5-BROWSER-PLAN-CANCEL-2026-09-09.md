# R5 真实浏览器排队与取消验证

代码基线：`3f4b118`；2026-09-09 本机执行（工件名时间为 UTC）。

使用新建隔离 Edge headless 浏览器，Playwright CLI 0.1.19。缓存、daemon 和快照均定向 `.project-local`，未使用个人浏览器 profile。
测试服务使用临时项目及仅内存令牌；登录填充与提交合并执行，未保存或打印令牌。

实际页面动作：登录 → 新建“浏览器取消验收”项目 → 选择 Photoshop → 提交 8×6 白底受控 RIR → 任务列表 PENDING → 请求取消 → 刷新 → CANCELLED，启动与取消按钮消失。
未点击启动、未调用 Adobe、未生成原生作品。这是浏览器/HTTP/持久化取消链路证据，不是设计质量或宿主验收。

- 排队快照：`.project-local/task-artifacts/browser-r5/page-2026-09-08T18-34-12-218Z.yml`
- 刷新后快照：`.project-local/task-artifacts/browser-r5/page-2026-09-08T18-34-43-046Z.yml`
- 视口截图：`.project-local/task-artifacts/browser-r5/page-2026-09-08T18-34-58-577Z.png`
- 浏览器 console 查询：0 error / 0 warning。
- 排队快照 SHA256：`6542a15cbb03704f64cb8f643d5b99f4ec069e8aa35cd190cc26a7b45115db96`。
- 刷新快照 SHA256：`84e1e363e363526c07cb674e455c9e27ece09fa10ce97ec6febce295daad153d`。
- 视口截图 SHA256：`fa3540c28656a7e92facd20c7e63b4e80f4f177a2a549371d8eff91851ca77fd`。
- 本轮自建测试服务已退出，design-r5 浏览器会话已关闭；未关闭共享应用。

仍未验证：真实宿主生成/patch/导出、浏览器重新登录后的项目恢复、独立人审、当前提交的安装与 CI/发布。
