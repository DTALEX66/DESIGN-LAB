# R5 原生局部修改准备层

基线 `4dea99d`，推进 DL-R5-010/011。此切片为内部构造器，不是已开放的 HTTP/UI 功能。

## 本轮实现

`src/design_lab/native_patch_plan.py` 从已由调用方绑定 receipt 的 Illustrator baseline 构造新的 patch job：

- 原始 AI 检查点按 hash 复核、复制到新的项目内运行目录；不覆盖原件。
- 仅接受 text/path、唯一对象 ID、固定字段；不接受 JSX、命令或外部输出路径。
- 路径修改保持点数，拒绝 NaN、Infinity、布尔坐标、越界值。
- 承接前一次 patch 的结果对象图，使第二次 patch 的重开前基线匹配前次产物。
- 链接图像按 receipt 的 hash/大小核对，复制至新运行根并改写资产路径。
- 所有可预检输入先验证再写入；中途 I/O 失败的已写副本保留，不自动删除证据。
- 输出仍采用既有 Adobe patch schema 与宿主桥；没有重写原生操作算法。

## 测试与限制

新增 `design-lab/tests/test_native_patch_plan.py`：先运行得到缺少实现的预期失败，再实现并通过 6 项真实文件测试。已有 Illustrator patch / preflight 2 项通过。

既有 native plan 5 项、native submissions 2 项通过；规范门 `design-lab/scripts/verify_design_lab.py` 49 项通过（exit 0）。报告重新生成后 `generate_current_reports.py --check` 通过；生成时间不充当当前 Git/云端证据。

一个测试夹具初次将源根设为 `.project-local` 自身，被路径策略拒绝；改为明确子目录，没有放宽生产路径策略。

**安全前置尚未接线**：准备器是内部 API，不能直接暴露给客户端；下一步的持久化提交服务必须先验证来源任务的 project/attempt/RECEIPTED 状态、原始 request/receipt 绑定及已发布原件 hash，再调用它。必须持久保存父 attempt、父资产版本、幂等身份和新 job，之后才能开放 HTTP 和页面。客户端不得选择 baseline/checkpoint/input_hashes。

本轮没有调用宿主，没有生成新的 AI/PSD，也未将任务标为 DONE。页面两次修改、父版本关系读回和真实参考回归仍待完成。Photoshop patch 另行接入，不假称本构造器支持 Photoshop。
