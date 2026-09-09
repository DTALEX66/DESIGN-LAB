# DL-R5-008 结构校验拒绝补强

本轮仅修改 `src/design_lab/generators/comfy_task.py` 及其协议测试。调用方定向搜索显示该协议类目前仅用于测试，未接入生产传输；不能将本轮计作Comfy实机或十次模型基准。

## RED → GREEN

先追加三个测试方法，涵盖16个负例：越界/绝对/盘符/反斜线/空/非规范路径，伪造或零workflow fingerprint，零节点checksum与重复节点ID。原实现14 tests、16 subtest failures、exit1，错误均为预期ComfyTaskError未抛出，而非环境错误。

最小修复后，同命令 `.venv/Scripts/python.exe -B -X utf8 -m unittest discover -s design-lab/tests -p test_comfy_task_protocol.py`：14 tests /0.020秒、OK、exit0。Git diff --check通过。测试使用真实协议类，没有外部服务替身或模型调用。

## 明确边界

- 这是路径词法检查，不是安全文件解析。实际生产层还必须绑定项目输出根、拒绝reparse/link、核验字节与来源hash。
- 合法格式hash不是实际内容一致性的证据；本轮只拒绝伪造格式和全零占位。
- 工作流图参数/输入指纹、REST/WS提交进度、真实取消ACK、断线恢复、10次生成仍未完成。
- 本轮发生于第三轮953项全量测试之后，因此该全量绿灯不能涵盖这两个后续变更文件；当前新增变更仅定向测试通过。
- 未安装、更新或启动Comfy/H3，未改共享库或资格profile，未上传/发布。
