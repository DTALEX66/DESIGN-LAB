# Comfy指纹入口拒绝门

接续结构拒绝修复后，再次核对发现直接调用WorkflowPin.fingerprint()未执行validate()，全零节点checksum仍能得到正常格式SHA256。无副作用探针已复现；不代表实际模型被加载。

新增test_fingerprint_cannot_bypass_pin_validation，涵盖非法workflow ID、未知schema、零checksum、重复节点ID。修复前15 tests中4个subtest失败（ComfyTaskError未抛出），修复为fingerprint入口先self.validate()。修复后同命令 `.venv/Scripts/python.exe -B -X utf8 -m unittest discover -s design-lab/tests -p test_comfy_task_protocol.py`：15 tests /0.018秒、OK、exit0。原先合法指纹稳定/节点排序不变的测试仍通过。Git diff --check通过。

当前源码SHA256：21420196f738d32b7de03cac463f9fc1b042e662b51de9b78cef78cea6560d8d；测试SHA256：9e478473f620a77755a1310382be3df4a2e382a21e2a7486784f811ad5aedde6。

此前账本14项证据仍保留其原始hash，不改写为本轮结果；后续报告应将原记录识别为源码变化，不能仍当当前有效证明。真实图参数/输入绑定、生产客户端、持久回执与模型验收仍未完成。这是新增定向验证，不继承此前953项全量通过结论。
