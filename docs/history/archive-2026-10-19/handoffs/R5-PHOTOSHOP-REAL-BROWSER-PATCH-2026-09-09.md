# Photoshop 真实页面连续修改与导出

## 范围与身份

本轮为 DL-R5-010/012/005 的局部实机证据，不是整个 M1 完成。HEAD a06c1db01944faca6c8dd41b8fe22f651138a400，加本轮未提交工作区。使用源码 `.venv` 服务，而非独立安装 wheel；不能抵扣安装版页面验收。

2026-09-08 22:08—22:12 UTC，项目内 Playwright CLI 的 headless Edge 真实页面，`browser_workbench_session.py --live-project`，进程会话20935，服务127.0.0.1:50340。临时访问只在进程内生成并经页面登录；未读凭据存储。页面操作选择项目、选择修改来源、填写JSON、排队、显式启动、刷新、校验、导出；没有用直接API调用替代点击。

项目 d2981992a4fa4385a91d96c6b7522262；初始来源为已有安装版PSD任务 att-c738963c958043e8a028b5a09fd9a92d。不是本轮页面导入参考图或首次制作。

## 第一次：文字修改

对象 ocr-1，文字 `Test strony PSD`。

- 页面任务尾号 fa22aa5a94e0；attempt att-f0114b89d01a4f618a0c5a63dcb046ab。
- 页面先见PENDING，再见DISPATCHING，最终SUCCEEDED；持久化原生回执NATIVE_READBACK。
- native-plans目录233c6c5f35f94b4a9561a67a0f998127；版本v-cfebf70135dd4cc9936be7c5fb9641ac。
- PSD 6022458字节，SHA256 `1f33a17ae02ad5fb3276d1b7d823059e06086f7cdeef3debe1bfb4dcd3866ebe`。
- PNG SHA256 `2380dcfcb27cf373e32a0762ee631ceacdb2d428d1315f452a60407083a6d6af`。

## 第二次：以上述结果为来源移动

对象 ocr-1，delta [2,0]。

- 页面任务尾号a493034a4f95；attempt att-cf45fdc7e46e44a086e8d4b8f828f819。
- PENDING→DISPATCHING→SUCCEEDED；回执NATIVE_READBACK。
- native-plans目录dbb8694ab69b4fcaa5e15d2f606a49c7；版本v-2f65a5630c084f518536eea251b884c7。
- PSD 6022441字节，SHA256 `ce113e65f2a0093a3b357ec2079b1d93ab40b3efa366a764c12c8c4738e5d92a`。
- PNG SHA256 `01c8c077f4a819257797d94fc0117851aaa92b0d45304dea56d89eb5c5c1ef09`。
- 实际阶段日志final-readback-end为25279毫秒，不当作整个页面链路耗时。

两次宿主均Photoshop26.7.0，bridge SHA256 `31b05500e54520da566a3b95bec8793bc21e0857c760f7aa04b4e14a3e115828`，documents_before/after均0。回执和结果位于项目业务SQLite的native_execution_v1。事后只读检查host guard为空。

## 页面校验和下载

点击第二版本校验，页面HASH_VERIFIED；点击导出，真实浏览器下载至 `.project-local/task-artifacts/browser-r5/design-lab-a493034a4f95.zip`。

ZIP 31657984字节，SHA256 `639a1ecff5a4087a2ee83ae41a325d7197635bcce14a11a8c4661831aaaf471a`。独立读取bundle-manifest.json核对47个文件的长度和SHA256，全部一致；ZIP条目集合恰好等于47文件加manifest。第二份输入checkpoint绑定第一次PSD hash。

页面截图 `.project-local/task-artifacts/browser-r5/page-2026-09-08T22-11-35-937Z.png`；各步骤快照在同目录。切到AI项目再切回，两个新任务仍显示SUCCEEDED；这只验证本次切换，不是所有竞态或浏览器重新认证恢复。

## 未完成边界

- 没有本轮从参考图导入→自动对象计划→首次PSD制作的完整页面证据。
- 不是wheel安装版页面链路，也未验收升级/回滚。
- 不代签人工Jury/rights/字体/链接验收，不证明像素级完美复刻或独立对象身份不变。
- 当前完整953项回归仍存在间歇HTTP错误，未被本次页面成功抵扣；当前改动CI/上传仍未验收。
- 所有大产物留在ignored项目目录，不自动上传Git。

收尾：测试专属浏览器design-r5已关闭；会话20935按既定300秒上限自然结束，exit0（22:13 UTC确认）。未关闭或终止共享Adobe宿主。
