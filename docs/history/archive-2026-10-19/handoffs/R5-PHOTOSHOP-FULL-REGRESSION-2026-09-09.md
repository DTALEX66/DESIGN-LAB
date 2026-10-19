# Photoshop 增量全量回归与修复

## 首轮全量结果（不能标通过）

会话15363，命令 `.venv/Scripts/python.exe -B -X utf8 -m unittest discover -s design-lab/tests`，953 tests /1067.200秒，1 failure、1 error、2 skipped，exit1。运行期间源码与HEAD保持冻结；基线a06c1db01944faca6c8dd41b8fe22f651138a400加本轮未提交改动。

1. test_service_http.ServiceHttpTests.test_native_bundle_http_export_and_download_are_owner_scoped：409而非201。旧合成job无layers，合成receipt无bridge_sha256，不能满足新增字体与回执绑定元数据。修复测试夹具，提供完整闭合PSD job字段和显式合成bridge SHA，不放宽产品导出校验。针对重跑先复现同失败，修复后24 tests PASS /15.583秒。
2. test_verifier_internals.OpenDesignAssistanceTests.test_boundary_pass：子Python默认Windows编码，而父进程按UTF8读取，导致UnicodeDecodeError（0xc5）、stdout为None，进而TypeError。测试启动子树显式PYTHONUTF8=1 / PYTHONIOENCODING=utf-8，并明确capture encoding=utf-8；不使用errors=ignore掩盖数据。修复后test_verifier_internals 55 tests PASS /79.371秒。

修复仅测试夹具/测试子进程编码，不改变已验证安装wheel和Photoshop产品代码；不能把针对79项PASS表述为新的953项全量PASS。

## 后续

更新报告后进行最终aggregate全量确认；记录确切会话与结果。发布仍需当前提交exact-SHA CI和远端读回，且已有推送政策拒绝不得绕过。M1质量/人审、真实页面全链和其他R5任务仍未完成。

## 第二轮全量：间歇性HTTP连接错误

会话45928，953 tests /1072.288秒，errors1、skipped2，exit1。前述HTTP导出夹具和编码问题未复现；唯一错误为test_native_patch_submissions.NativePatchSubmissionTests.test_http_patch_route_scoped_fields_and_idempotency在无认证请求读取状态行时ConnectionAbortedError/WinError10053。没有收到预期401，并非权限门允许请求通过。

只读检查显示服务在guard拒绝后返回Connection:close；是否与未消费请求body/Windows连接关闭有关尚未证明，不能凭假设修改网络实现。随后同一真实HTTP测试独立重复30次（会话90486），19.147秒全部PASS，未稳定复现。未加入隐式重试、忽略socket异常、跳过测试或降低权限检查。全量仍FAIL，不以30次针对成功抵扣。

下一轮应使用逐项verbose输出并保留任务内诊断，定位错误时序/网络关闭条件。当前无测试进程仍在运行；15363/45928/90486均已终态。代码和HEAD在两次全量执行期间均保持冻结。
