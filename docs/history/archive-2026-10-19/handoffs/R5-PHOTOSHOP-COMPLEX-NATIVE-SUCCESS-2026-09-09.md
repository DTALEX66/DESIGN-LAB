# Photoshop 复杂参考原生制作成功接续

任务 DL-R5-004/012，PARTIAL；源码环境真实宿主验证，不是完整 M1、人审接受或已发布版本。

## 变更和依据

上一轮实测构建129.388秒、最终读回142.617秒，证明原120秒默认预算不足。Photoshop 默认改300秒，最大允许600秒不变；没有取消未知结果保护、自动重试或杀宿主。新增143秒受控调用边界用例先失败，修改后 Photoshop adapter 14 tests PASS。

原 att-d229f7dcc4ec4359b64bc26ceb73f07d 经实际同步 quiesce：文档0→0、关闭0，产物保留未接受，再释放其 guard；不是盲目清锁。

## 实机证据

- 命令：项目 `.venv/Scripts/python.exe -B -X utf8 design-lab/tests/host_fixtures/prepare_real_poster_ps.py --execute`，PROJECT_LOCAL_ROOT 明确指向本项目 .project-local。
- 会话89141终态 exit0，2026-09-08T20:56:00.733092Z。
- 基线HEAD a06c1db01944faca6c8dd41b8fe22f651138a400 **加未提交改动**；不是该提交的CI证明。
- Photoshop26.7.0；run `.project-local/task-artifacts/real-poster-ps-20260908/run-f39d0961d439447f8462a66f5dc9d213`。
- project d2981992a4fa4385a91d96c6b7522262；attempt att-730e6e0ceb464a0d902c8e585c59499f；state RECEIPTED。
- job ps-9654a72ff5b11e5ae8a60be4；SHA256 692a4d263ac6db16da5aa2f2a0cd6dc31f7549f92cd75be3ff18564fb72dd306。
- bridge SHA256 e7ee8c783e5ba2dd4fb3393cf73a8fc9ef70dec1cfc76a9833706c356caa2438。
- NativeTasks源码SHA256 512132bba7a685d5ce2e3aa5aadaf3b33ea84f8ef06ae560edf84b006bf729a7。
- 同请求第二次调用返回同attempt/asset；RUNNING事件仅1次，guard0。额外只读数据库确认全宿主guard为空。
- 原生落盘 photoshop-completion.receipt 与同步成功绑定一致，documents0→0；原始证明 native-task-readback.json 保存在run中。
- 阶段：build47→124420ms，save/reopen结束127511ms，readback131495ms，export结束131706ms，最终readback137197ms。attempt起止约138.384秒。

## 产物

- PSD 6061730 bytes，SHA256 b9225aa74522f45a4cd1baf55ab12be96f4bdf6abddc3f788625955df6e3de34。
- PNG 19413204 bytes，SHA256 d01db0d5e87887a7cecd55d159c9bc0eae513eb039ca1b06c11178cf3669f2bb。
- 已发布到**本地资产仓**的PSD：`.project-local/projects/d2981992a4fa4385a91d96c6b7522262/assets/versions/b6b2d9a6989c4721a7ccc19694990248/native.psd`；独立Get-FileHash读回一致。
- version v-be838df71a7a40f08cf3904de6d29189，rights NOT_REVIEWED。这里的本地资产发布不等于Git上传或正式release。

## 尚未完成

99个文字对象、44个推断alpha栅格、89个矩形像素填充；矩形不是矢量形状。OCR、替代字体和white-to-alpha误镂空问题未获质量接受。仍须两次产品级patch、页面端完整链、人审、完整打包与安装验证。

当前 native_patch_submissions.py / native_patch_plan.py 只接受Illustrator；Photoshop JSX psPatch存在不等于产品入口支持。下一步须贯通受控PSD checkpoint/hash、text/move patch、第二次patch基线、保存重开与版本父子关系。

超时原始回执恢复入口仍未实现；本次是预算内正常成功。全量回归、当前改动exact-SHA CI、提交上传尚未执行。原生作品保持本项目ignored路径，不上传到Git。
