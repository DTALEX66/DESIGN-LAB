# R5 页面原生局部修改接入

基线 `bbb8e53` 加本轮工作树；以最终提交绑定实现。范围 DL-R5-010/011，不宣称 M1 或人审完成。

## 实现

- `NativePatchSubmissions` 只接受 project/job/source attempt、固定 patch 字段及幂等键。来源必须是当前 Illustrator RECEIPTED attempt。
- 读取原始 request 和 operation intent hash，复核 receipt 的输入、全部输出及已发布 AI 原件；不接受客户端路径、baseline 或 receipt。
- 新检查点和链接输入由内部准备器复制到新运行根；父 attempt/asset/version、client hash、job hash 在 `native_patch_submission_v1` 持久保存。
- OS 锁覆盖提交身份与来源 attempt。响应丢失后重试复用同一已排队任务；原件已变则拒绝。
- HTTP `POST /api/projects/{project}/tasks/{job}/patch` 只排队，沿用鉴权及字段白名单；调用既有 `/run` 才启动。
- 页面从已完成 Illustrator 任务选择来源，输入文字/路径 JSON，显示父版本和真实 PENDING 状态。第二次修改选择第一次完成的任务；不自动重建全部对象。
- 修改保存成独立资产并记录父版本，不冒充同一 asset 内 v2/v3；统一版本历史视图仍待完善。

## 测试

先观察缺少模块及 HTTP 404、页面无修改按钮的预期失败，后实现通过：patch prepare 6 项、patch submission/真实 HTTP 5 项、前端行为 8 项、既有 HTTP 24 项。规范门 49 项 PASS。报告 check PASS，只表示绑定输入完整性。

HTTP 测试首次因测试 token 不是 64 位十六进制被拒绝，修正夹具后才进入预期 404 测试，没有放宽服务鉴权。

## 真实页面与宿主记录

Windows / Illustrator 29.5.1 / Python 3.13.14 / Playwright CLI 0.1.19 / Edge headless。
项目 `828ccec779ac4d88a0b1dd9e41fc63ba`，来源 base attempt `att-0c6d4aec4b524289b1042401031be5fc`。
浏览器服务使用主项目状态库与原生 guard，端口 58055，测试窗口有界；不通过隔离库绕过宿主保护。

第一修改：页面选择基线，提交 `ocr-100` 文字拼写修正 `restrykycyjna` → `restrykcyjna`，点击启动。

- attempt `att-39d9f1d1a1b4425186a05d8f2d47ce21`，RECEIPTED。
- 父版本 `v-4e37c6324d9f41f9b4ad7b12da453b89`；新版本 `v-a075fdffb8aa4f25a7323d65421f5e68`。
- AI SHA256 `088c98d75f6c2d7805a34c4b3fd6afbe34ecd1850aed63557e76fa2784d1b116`。
- PNG SHA256 `5bf9f7755eaa10af895215236c26249301c4c4fe8ab46d6ed162f174d59c81bd`。
- SVG SHA256 `cf7e0e08589b83cda91d487cbb8409b1a3a2bd67ae01e986dabdad75c734176f`。
- 文档数 0 → 0；原生桥执行前后完整对象读回。

第二修改以第一修改为来源，路径 `r0-icon2-p1` 的所有 anchor/left/right x 坐标 +4，保持拓扑。
attempt `att-40552d28d27544fe8146839f55525934`，最终 RECEIPTED，完成时间 2026-09-08T19:13:09.512854Z，文档数 0 → 0。

- 新版本 `v-42fa29bcc9c74ec7aeb22347c5e58ef7`。
- AI SHA256 `87737ea79af6a14ad17bc0164bc61f921ea191e0db6d20c95c5ec83cf95c3d4e`。
- PNG SHA256 `53e1943c7cd4a87c0d5e952f676aeccce452b3fd146a8ac63c2f4ce9076e3428`。
- SVG SHA256 `4d442c438f56c4f15882f89f625a5e24776636326e6c17b438f4f31e71caf7f2`。
- 执行期间旧测试服务按窗口正常退出，独立 worker 没有被终止。确认其退出后重启服务到 59694，页面重新选择项目能读出两次 SUCCEEDED 及多余任务 CANCELLED。
- 页面最终版本 HASH_VERIFIED，下载 `.project-local/task-artifacts/browser-r5/design-lab-24f5ff3f31fa.zip`，SHA256 `6fd7efa186bd7083558919c0f326023d1b8233efaf37cd96a30ae9c47c5423c4`。下载 ZIP 三个产物再次逐成员计算 hash，与 receipt 一致。
- 页面快照 `.project-local/task-artifacts/browser-r5/page-2026-09-08T19-14-47-216Z.yml`（SHA256 `554edbdf074e8583f83b45791edc6c258f51cb6bc4a870268ade4c7e7fad9200`）保留校验/下载结果，console 0 errors / 0 warnings。
- 最终 Illustrator guard 已释放，Photoshop guard 仍在。没有关闭共享 Adobe 进程。

误排队记录：第一次路径填充辅助只搜索第一 layer，未找到目标；后续点击保留了旧文字 JSON，形成 `att-d01e1299a7b64c49bbe35ad325966bbc`。通过页面取消，最终 CANCELLED，从未派发。改为搜索全部 layer 后填入正确路径再提交。记录保留，不能隐去测试操作错误。

## 尚未验收

Photoshop 页面 patch、文字局部差异的旧 2 像素外溢问题、复杂参考质量、5—10 张案例、人审/rights/生产预检、安装包本轮改动和 exact-SHA CI 均不能由本轮替代。未清除 Photoshop 未决 guard，未上传或发布。
