# R5 Photoshop 阶段诊断接续

范围：DL-R5-004 / DL-R5-012。基线 HEAD a06c1db01944faca6c8dd41b8fe22f651138a400 加本地未提交改动；不是该 SHA 的已提交功能。

## 本轮实现

- 固定 COM 包装器把 job SHA 绑定的 observer 传入 psRunJob。
- 在独占 runRoot 下以 xb 预留 photoshop-stages.log；已有文件拒绝派发，不覆盖历史诊断。
- 原生 JSX 按验证、构建、保存重开、读回、导出、最终重开读回写入阶段及相对毫秒数。
- 日志不是原生完成回执，不参与产物接受，不能凭最后一条日志释放 guard。
- 不改变 120 秒默认超时，不自动重试，不关闭共享 Photoshop 进程。

## 验证

项目解释器 `.venv/Scripts/python.exe`，PIL / jsonschema 实际导入成功。全局说明提到的 scripts/workflow/execution_preflight.py 在当前项目不存在，未伪造运行结果。

- Photoshop COM adapter：先观察已有日志仍派发的 RED（1 != 0），修复后 11 tests PASS。
- 实际生成的包装 JS 在 Node VM 执行，通过受控宿主边界把两个事件写入真实临时文件，核对 job SHA 与顺序；不等同 Photoshop 实机。
- Photoshop readback scaling：3 tests PASS。
- NativeTasks：34 tests PASS。
- 全量回归、当前改动 exact-SHA CI、新版本安装和带阶段日志 Photoshop 实机：NOT EXECUTED。

## 下一步

1. 查明 att-839e089155bf4a6bad45e3677f87ab8b 的当前原生状态；保留未知产物，使用已有持久化 quiescence 流程，不能凭旧摘要直接清锁。
2. 只在确认前次停止且 guard 合法释放后，执行单次带阶段日志的复杂参考测试，按阶段数据定位 120 秒瓶颈。
3. 补持久化原生完成 receipt / reconciliation；诊断日志不能代替该能力。
4. Photoshop 两次产品局部 patch 与真实质量验收仍待完成。

本轮未提交或上传。此前上传政策拒绝不能通过换机制绕过。

## 实机接续：阶段证据已取得

上一未知任务 att-839e089155bf4a6bad45e3677f87ab8b 通过实际 COM quiescence，文档 0→0、关闭 0；输出保留未接受。PSD SHA256 224693a9e62fc3a7cb37c8b14de0206c052908796eb395bf449316aba3b482c7，PNG d82b643cde2e26bebb82988f13912594213c04cfe6322fa8d05c41b8a8d51d40。首次调用命令因 Python 多一个括号解析失败，未执行任何恢复；纠正语法后退出 0。

随后单次运行 prepare_real_poster_ps.py --execute（源码环境，非安装包），会话 1483 终态 exit 1 / TimeoutExpired 120 秒。新 attempt：att-d229f7dcc4ec4359b64bc26ceb73f07d，guard 保留。运行目录 `.project-local/task-artifacts/real-poster-ps-20260908/run-726191253d7f4c1394b19729da76c676`。

原生 photoshop-stages.log 的 job 绑定 bd1e0c8ea017979ebe032c01755757cb936c4c3deb5e5ff553370977ee1ef0b7：validated 45ms，build-start 46ms，build-end 129434ms，save-reopen-start 129434ms。由此证明构建本身已超时，且调用方退出后宿主继续执行；不能把超时单归因于保存或读回。后续需查最终阶段/原生静止状态，禁止据调用方 exit 1 推断宿主停止。

本轮独立修复 native_bundles 对 Photoshop group.children 的字体递归漏报：新增用例先得到空列表的 RED，补遍历后 NativeTasks 35 tests PASS。该清单仍仅表示请求字体，不证明实际宿主字体或许可。

稍后只读日志取得完整阶段：save-reopen-end 132627ms、readback-end 136744ms、export-start 136744ms、export-end 136953ms、final-reopen-start 136954ms、final-readback-end 142617ms。构建约129.388秒，占最后阶段累计142.617秒约91%；最后阶段不包含包装器收尾确认，不能代替原始成功 receipt。guard 未主动释放。

## 原始完成回执持久化切片（仅本地实现）

新增固定 `photoshop-completion.receipt`，派发前以 xb 独占预留，已有文件拒绝派发。包装器在 psRunJob 返回、任务文档关闭、原有文档 ID/数量核对以及原 activeDocument 恢复后，才追加原始 DL_PS_NATIVE_V1 回执。包含宿主版本、job ID、job SHA、前后文档数。超时不会删除该文件。

测试先复现回执不存在/已有回执仍进入派发；实现后 Photoshop adapter 13 tests PASS，NativeTasks 35 tests PASS。Node VM 执行实际生成包装器并写真实文件，另验证 close 失败则预留回执仍为空且结果 unknown。

尚未实现从落盘原始回执到持久化 verified receipt 的受控恢复入口；文件本身无产物哈希，不能单独证明产物未变化，也不能自动发布/解锁。后续必须绑定派发时的请求/桥版本/输入指纹，校验回执与产物，处理截断/重复/伪造和读回失败。旧 run 没有该文件，禁止补造。此次新功能尚未进行 Adobe 实机、安装包、全量及 exact-SHA CI 验证。
