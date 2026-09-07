# Illustrator 产品桥路径修复与 UI 复验边界

基线 `a97e951b01d575b774d0ca81939cc365bcfec96a`；状态 IMPLEMENTED_LOCAL / UNIT_VERIFIED，原生复验 NOT_EXECUTED。

## 实际修复

产品入口 `integrations/hosts/adobe/illustrator/reconstruction-assemble.jsx` 的 `assertInside` 将 Windows `fsName` 的反斜杠统一为正斜杠，再追加根目录分隔符并比较；保留大小写不敏感和兄弟路径拒绝。未放宽到裸字符串前缀，也未把 root 自身作为合法输出文件。

新测试 `design-lab/tests/test_illustrator_bridge_paths.py` 用 Node VM 执行实际产品 JSX（只移除 `#target`），File/Folder 使用 Windows 路径解析替身。10 个用例覆盖反斜杠、正斜杠、尾斜杠、大小写、兄弟前缀、parent traversal、根本身、不同盘符、UNC 子路径和 UNC 兄弟前缀。UNC 只做字符串回归，不访问网络共享。

RED：原代码 10 个子用例中 5 个合法路径失败；GREEN：修复后 10 个符合预期。精确解释器 `.venv/Scripts/python.exe -B -m unittest discover -s design-lab/tests -p test_illustrator_bridge_paths.py -v`，exit 0。Node 来自当前 PATH 的既有 runtime，未安装新软件。

## 实机尝试与失败

通过 Computer Use 插件发现 Illustrator 2025 未运行，按返回 app ID 启动成功；窗口 id 68258，出现主界面。通过文件→脚本→其它脚本打开选择器。

- `set_value` 对文件名编辑框返回 `Cannot set a value for an element that is not settable`。
- 重新观察后按编辑框 element index 点击，被报告坐标位于“取消”，而非目标主窗口。未认为点击成功。
- 重新激活并观察截图、使用文件名快捷键后，focus 仍报告搜索框，不满足安全输入条件。
- 使用 Escape 退出，回读只剩主窗口。没有输入脚本路径，没有启动验证脚本，没有新开/修改用户文档。

验证脚本仅准备在 `.project-local/task-artifacts/adobe-live-20260907/path-fix-qualification/run.jsx`；目录检查只有此文件，没有运行目录或 terminal receipt。不得把准备好的脚本当实际执行证据。该脚本只调用实际 assertInside，不调用创建文档或导出操作。

## 尚未闭环

新原生路径验证仍待可靠的脚本选择器输入；旧恢复测试的 valid-child 失败保留，不回写旧 hash。产品桥依然只有创建文档骨架，图层/路径/文字/蒙版/保存/重开/幂等尚未实现。此修复不是复杂参考复刻、生产桥完成或 E3。

视觉扫描修复的 49/49 统一门结果早于本次 JSX 修改；不冒用作本次聚合树全门结果。需最终统一跑门、追加正式 receipt、修复投影漂移，再分层上传验收。
