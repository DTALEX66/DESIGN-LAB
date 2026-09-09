# Photoshop 产品 patch 接续

DL-R5-012，IMPLEMENTED_LOCAL / TESTED_LOCAL 仅限计划准备；产品链 PARTIAL。

## 已实现的计划准备

复用 src/design_lab/native_patch_plan.py 的受控输入复制/哈希/项目归属逻辑，增加 design-lab/photoshop-patch-job/v1。PSD checkpoint 必须匹配原字节哈希、PSD版本头和宽高，复制到新的项目 native-plans 目录，不覆盖源文件。

仅允许 text / move，目标通过嵌套 children 唯一ID定位。text仅文本层；move仅text/raster/fill，不移动组。拒绝非有限数、布尔坐标、非法字段和越界fill。第二次计划先应用前次patch到期望图，再描述本次patch，不能丢失第一次编辑。

测试 test_photoshop_patch_plan.py 4项：先复现3个正向案例被Illustrator-only拒绝，后全部PASS；原 test_native_patch_plan.py 6项PASS，git diff --check PASS。测试checkpoint为明确合成文件头，不证明原生PSD可重开。

## 必须继续，不能宣布产品可用

1. Photoshop COM adapter 接受并校验新closed schema；checkpoint需纳入派发前输入指纹，进入宿主前拒绝hash变化。
2. JSX实现固定patch entry：拒绝已有用户打开的checkpoint，打开专用副本、核对baseline、应用单对象修改、保存新PSD、重开核对预期图、导出PNG、最终关闭并回执。不能用重建整文档代替局部修改。
3. NativeTasks._prepare绑定PSD checkpoint；NativePatchSubmissions按已验证源host分派，复用服务鉴权、幂等和父版本关系；页面选择支持PS。
4. 当前成功参考attempt att-730e6e0ceb464a0d902c8e585c59499f，project d2981992a4fa4385a91d96c6b7522262，作为未来两次真实patch候选。使用前重新校验receipt/输入/产物，不以本摘要代替校验。
5. 两次修改后独立局部差异、无关对象保持、保存重开、完整bundle和安装入口测试。

当前宿主与提交层仍拒绝Photoshop patch；新计划函数不是已开放的HTTP任意脚本接口。未做新patch实机、安装打包、全量回归或当前改动CI；未提交/上传。

## 持久化输入绑定补齐

NativeTasks._prepare 现已把 Photoshop patch checkpoint 纳入 request.inputs，并在入队/派发准备时要求 checkpointSha256 匹配。新增真实SQLite/文件测试先复现checkpoint未写入inputs（None），修复后NativeTasks 36 tests PASS；修改工程字节后新入队被拒绝。此处合成checkpoint只测试持久化绑定，格式和宿主行为仍归adapter，不是原生执行证明。

## 固定宿主入口和adapter接入

新增JSX psRunPatchJob：验证baseline/expected，拒绝用户已打开checkpoint，读取专用副本baseline，调用既有psPatch单对象修改，保存新PSD并核对expected，导出PNG和最终重开。没有调用psRunJob重建图层。Node VM执行该入口并核对打开/读回/patch/保存后读回顺序（宿主边界为替身），先观察函数不存在的RED，后readback/scaling 4项PASS。

Photoshop COM adapter现接受闭合patch schema，校验checkpoint后缀、SHA256、PSD版本/尺寸，并在Python生成独立baseline和post-patch expected；checkpoint参加输入读回（上限256MiB）。现有固定包装器用于文档收尾、阶段日志与原始完成回执。adapter先复现patch字段被拒绝，后15项PASS；legacy native 3项PASS；git diff --check PASS。

**仍未接通 NativePatchSubmissions 的Photoshop来源和页面操作；本轮无patch实机。** 下一轮应先补wrapper实际参数路由与失败测试，再接submission并执行两次真实patch。原文“adapter仍拒绝”的状态由本节替代，但不能把函数测试提升为产品或实机通过。

## 提交层与两次真实patch已接续

上述未接通状态由本节更新：NativePatchSubmissions按已验证host选择PSD/AI产物，仍要求同项目、RECEIPTED、请求hash、已发布源hash、输入和所有产物校验。新增PSD提交测试先因PATCH_SOURCE_NOT_READY失败，修改后6项PASS，含重复提交、父版本及源工程篡改拒绝。

源码环境调用产品NativePatchSubmissions→NativeTasks.execute_queued，实际Photoshop26.7.0，非页面点击/安装包：

- project d2981992a4fa4385a91d96c6b7522262；源attempt att-730e6e0ceb464a0d902c8e585c59499f。
- 第一次：ocr-1文本改为Test edycji PSD；attempt att-93e8f0350d6647aa9a472581cc20dbe2，25.343秒，RECEIPTED；version v-3d9b8ad2c26f40af9a04522d00c5178e。
- 第一次run：.project-local/projects/d2981992a4fa4385a91d96c6b7522262/native-plans/694cf6a5e4384989b053465f0b23053e；PSD SHA a13975170850332563a1c1683e911fde42a142e06baf6c8ccfde46dca157e92f，6022514bytes；PNG SHA 684c877369166304bfa5a5789eb56dadb75a59853b8eb85e2437626dcfe4b30f。
- 第二次：以前次为父，ocr-1移动[2,0]；attempt att-934eff689b0b4b518f5f49f07a3b7035，25.786秒，RECEIPTED；version v-e4eb157bdb724e4c990c86321b30953b。
- 第二次run：.project-local/projects/d2981992a4fa4385a91d96c6b7522262/native-plans/f9bfbdbc649a4cc8b0de8f1d0bfb868f；PSD SHA 98f49e835ff1da3d619c9bce5b15ac8f1ab707595a05432e7040fe2ad33449cc，6022484bytes；PNG SHA b571948b2a741b6df58c5125fac97ec142ce9f5db957cad32eec4a1c4b44eb16。
- 两次bridge SHA 31b05500e54520da566a3b95bec8793bc21e0857c760f7aa04b4e14a3e115828，文档0→0，各RUNNING仅1次。第二次execute_queued重放返回完全相同结果。额外只读对两组PSD/PNG重新hash均匹配，全部host guard为空。

仍待：页面支持Photoshop选择、独立像素/对象局部性检查、完整bundle、安装后两次修改、当前树全量回归与CI。局部修改路径未重建文档，但未独立枚举全部原生对象ID，不能宣称所有无关对象身份已获独立证明。质量/rights仍NOT_REVIEWED，未上传。旧失败证据保留。

## 页面支持与独立预览差异

页面main.ts已允许RECEIPTED Photoshop任务作为patch来源，index.html说明PS text/move和AI text/path的边界。新增PS页面行为测试先复现没有修改按钮的RED，修改后12项PASS；实际执行页面脚本，窄DOM/fetch替身验证来源绑定、重复请求同key、提交不自动dispatch。不代表真实浏览器点选测试完成。

从项目数据库定位三次真实原生PNG，用Pillow RGBA＋numpy独立逐像素比较，未改图：

- 原版→文字版：8205个变化像素，半开bbox [939,168,1981,191]。
- 文字版→移动版：1606个变化像素，半开bbox [939,168,1106,191]。

这是观察到的变化范围，未以该结果反向扩大预先接受区域；尚需对照参考/原生文字边界判定局部性与质量，不能用bbox代替Jury。未完成真实浏览器端全链、安装包重验、完整bundle及当前树全量/CI。
