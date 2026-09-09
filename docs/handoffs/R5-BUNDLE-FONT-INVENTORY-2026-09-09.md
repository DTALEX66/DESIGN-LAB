# R5 交付包请求字体清单

DL-R5-005/014 增量；在现有 NativeTasks.export_bundle 内增加 metadata 字段，未复制字体或调用宿主。

- requested_fonts：按 PostScript 名去重排序，关联排序后的对象 ID，遍历嵌套 items/contours。
- font_inventory=REQUESTED_ONLY；font_observation=NOT_COLLECTED；font_rights=NOT_REVIEWED。
- native_receipt_binding：attempt_id、bridge_sha256、job_sha256。是可追溯引用，不是独立字体清点或许可批准。

原生任务测试新增真实 ZIP manifest 断言，先失败（缺 requested_fonts）后通过。补嵌套文本、非文本忽略、无字体与空字体拒绝后，test_native_tasks.py 共 31 项 PASS，4.664 秒。COM 边界替身不作实机证据。

随后源码版对已真实完成的安装版 Illustrator attempt `att-aa32c1e4de0a430ab8a30633f6abbdf5` 重新导出新 bundle 版本；未重跑 Adobe，未覆盖旧 ZIP：

- 版本 `v-b1366573f09a4433abbaab6b175fe5e8`；5408085 bytes。
- SHA256 `621ab9f62876f9ebee1ffad9fae2f13c83cf606ed3b511e51fe686f58a924226`。
- 路径 `.project-local/projects/828ccec779ac4d88a0b1dd9e41fc63ba/assets/versions/2f33cd8af1894c3693728530df965eac/delivery.zip`。
- 独立读取包 manifest：ArialMT 23 个对象、Arial-BoldMT 76 个对象，共 99；实际字体采集与许可状态未提升。无 ttf/otf/woff/woff2 文件。

边界：安装 wheel 尚未包含本次字体 metadata 变更；新变更尚未全量验证、提交或上传。文本局部性既有 FAIL、人审、链接迁移仍未闭环。不能将清单存在当专业交付全部通过。

## 后续安装版验证

test_bundle_store.py 6 项 PASS（0.493 秒）。随后离线构建 `wheel-r5-font-inventory/design_lab-0.1.0a0-py3-none-any.whl`，SHA256 `efd505d5285c77297f06d761c25acb1c755d8163b825726ff7d32d2e1159babc`；ZIP 无项目运行缓存，native_bundles.py 与当前源文件 SHA 一致。

在项目隔离 workbench-installed 环境重装该 wheel，从非源码目录以 `-I -B -X utf8` 导入 site-packages，调用同一真实 attempt 的 export_bundle。重新打开 manifest，字体对象计数仍为 23+76，许可 NOT_REVIEWED；整个 ZIP SHA 与源码导出 `621ab9f6...924226` 完全一致。字体 metadata 已进入该安装包；仍未执行新修改的全量测试、CI 或上传，未重跑 Adobe。
