# R5 安装包接续验证

基线 HEAD `a06c1db01944faca6c8dd41b8fe22f651138a400` 加尚未提交的工作台列表竞态修复；不是该 SHA 的纯净构建。

- 离线 `uv build --offline --wheel --python .venv/Scripts/python.exe --out-dir .project-local/task-artifacts/wheel-r5-list-fix` 成功。
- wheel SHA256：`acc06f8a2f38ca53ac7a7cf9fd627861571fc032369062d9dbb24796a5a1ca7c`。
- 检查 ZIP 条目无 `.project-local`、`.hermes` 或 uv-cache 路径；native_patch_plan.py、native_patch_submissions.py、打包 main.ts 与当前源字节 SHA256 完全一致。构建工具的仓内缓存警告保留，通过实际条目检查确认未混入运行缓存。
- 在项目隔离 `.project-local/task-runtime/workbench-installed` 环境离线、无依赖重装该 wheel，未修改全局环境。
- 从非源码工作目录 `.project-local/task-runtime/tmp` 运行安装解释器 `-I -B -X utf8` 与 `installed_plan_smoke.py`。实际模块位置为隔离环境 site-packages，不注入仓库 sys.path。
- 图片导入→AI/PS 对象计划转换→持久排队→同键重试复用→取消→拒绝启动已取消任务：PASS，退出码 0。
- fixture：`.project-local/task-runtime/installed-plan-smoke-list-fix`；AI attempt `att-6c4b37bde1294ccabfd6fea4ef70eadf`，PS attempt `att-d010f82223b34fc5bf88523af6248dde`，均 CANCELLED。

## 同夹具回退与恢复复测

随后在相同隔离环境离线回退到 `wheel-r5-browser-305d93b` 的旧 wheel（SHA256 `b6dde45cbb8c0a4fa5440239002864d46d54b1e42a4619a9230eb81479a7ad8f`），以安装解释器 `-I -B -X utf8` 从非源码目录调用 ProjectService / TaskQueries，只读列出同夹具两个原生任务。两项 ID 和 CANCELLED 状态完全匹配，退出 0。

再恢复本页新 wheel，执行相同只读检查，两个任务 ID 与 CANCELLED 状态仍匹配，退出 0。最终隔离环境安装的是新 wheel。两个包版本号均为 `0.1.0a0`，这是绑定精确 wheel hash 的替换/回退验证，不是正式跨版本升级验收。

边界：本次未实际调用 Adobe，未执行安装版局部修改，未发布。wheel 和夹具属于 ignored 本地证据，不在 Git 上传范围。安装版实际宿主与 patch 链仍须接续，不因模块存在或排队成功宣称完成。

## 后续安装版 Illustrator 实机局部修改

上述边界对应安装 smoke 阶段。随后使用同一新 wheel 的解释器、`-I` 和 site-packages 模块，经原项目服务数据库提交真实 patch；未新建数据库绕过宿主 guard。

- 来源：项目 `828ccec779ac4d88a0b1dd9e41fc63ba`，来源 attempt `att-40552d28d27544fe8146839f55525934`，来源 AI hash `87737ea79af6a14ad17bc0164bc61f921ea191e0db6d20c95c5ec83cf95c3d4e`。
- 新副本将 `ocr-100` 改为明确的安装测试文本，未覆盖原工程。attempt `att-c3ff35b60c74458e97ab8cdf39569aa7`，最终 RECEIPTED；UTC 20:12:41.008805 至 20:14:03.969971，约 82.961 秒。
- Illustrator 29.5.1，固定桥执行 open/readback/patch/save/reopen/readback/export；文档数 0→0。
- AI：680463 bytes，SHA256 `75e357b817404072cd0bffa61a76c176cd310b6eefb0afb9670428dfebb52077`。
- PNG：414966 bytes，SHA256 `d8e7ebc5bde985e3347281aebecd7d444b5591ec15a0f70ef03ba8f3eb950ef3`。
- SVG：3628888 bytes，SHA256 `fcbb0d49d98b5d6f441cee10f60992421f30c67c2a10b09b751a5aadfee45a44`。
- 资产版本 `v-114196d9aab0468f94c79b0809fd6bab`，rights NOT_REVIEWED。
- 重建服务对象后再次 execute_queued 同一 attempt，资产一致；数据库 RUNNING 事件仅 1 次，Illustrator guard 已释放，Photoshop 原未知结果 guard 保留。

这是安装版一次真实文本修改及幂等读回，不是安装版两次修改完整链、浏览器入口或人工视觉接受；测试文本也不作为忠实参考复刻产物。

### 第二次安装版修改接续

随后以上一次原生版本为父版本，对 `r0-icon2-p1` 的全部 anchor/left/right x 坐标增加 2，保持点数与拓扑。安装版 NativePatchSubmissions 从第一版 checkpoint 创建新副本，再 execute_queued 和幂等读回。

- attempt `att-aa32c1e4de0a430ab8a30633f6abbdf5`：RECEIPTED；UTC 20:15:21.648067→20:16:45.920530，约 84.272 秒；RUNNING 事件仅 1 次。
- 父版本 `v-114196d9aab0468f94c79b0809fd6bab`；新版本 `v-f70ab2138b1241029b8247729051117a`。
- Illustrator 29.5.1，文档数 0→0；Illustrator guard 释放，Photoshop 原 guard 不变。
- AI 680906 bytes，SHA256 `fbf845b8d8b6e67628a1156bb7edf57c171874ba65f00b427e8ad61a22afb0c4`。
- PNG 414970 bytes，SHA256 `e88434afd28d01d68792a622f36b7666fe07df0f827029d19a85071112c1a923`。
- SVG 3628888 bytes，SHA256 `cce41aee10a5a6ee271f7a4658aded2cb17938b14d77820f05394ae9ae652d57`。

安装版文本→路径两次真实修改与重开/重试接续已有证据；尚未补独立对象/像素局部性比较、安装版浏览器全链、完整导出、人审与发布，不能据此提升整项 M1 完成。

### 独立像素局部性复核

随后从项目只读数据库取得三个 attempt 的实际 targets 与 receipt，逐一重算全部 AI/PNG/SVG SHA256，均一致。使用 Pillow RGBA 与 NumPy 按像素比较，允许区域取原 `source-rir.json` 中 ocr-100 bounds 与原 segmentation.json 的 r0-icon2 box，不按观察结果扩大。

| 修改 | 变化像素 | 实际变化框（右下排除） | 原允许框 | 区域外变化 |
|---|---:|---|---|---:|
| 文本 | 11999 | [170,2663,1752,2684] | [170,2660,1766,2682] | 177 |
| 路径 | 205 | [476,462,509,497] | [442,342,651,552] | 0 |

结论：路径像素局部性 PASS；文本严格原标注框局部性 FAIL，因此整体不能宣称局部性验收通过。文本差异向下越界两行像素；是否由原 OCR bounds、字体度量或实际无关对象变化造成尚需独立对象读回判断，不能凭截图猜测，也不调整门限求绿。来源不是已人审接受的参考产物，测试文本仅用于安装验证。

### SVG 对象结构独立对比

再次重算三个 SVG hash 后，用 defusedxml 解析实际导出，不调用宿主桥的比较函数。三个版本均 7284 个 XML 元素、655 个带 ID 的元素。按文档顺序逐元素比较 tag、全部 attributes 和 text：

- 来源→文本版：仅 1 处变化，元素 7277、`text#ocr-100` 的文本改变，属性无变化。
- 文本版→路径版：仅 1 处变化，元素 6726、`path#r0-icon2-p1` 的 `d` 属性改变，文本无变化。

因此当前 SVG 导出层面未发现无关对象属性/文本变化；原生对象身份是否保持仍不能单凭导出证明。此证据将文本像素越界调查收敛到目标文本的渲染覆盖与原 OCR 框关系，尚未证明具体字体度量根因，不撤销严格像素局部性 FAIL。

### 安装版完整字节打包读回

安装解释器从非源码目录调用原项目 NativeTasks.export_bundle，对第二次修改的 attempt 生成实际 ZIP，并独立打开逐成员重算 SHA256。

- bundle 版本 `v-77284140570d4bba845f4cc0189810e0`，5406771 bytes，SHA256 `cb41fee9a3a2a6189b9c612a84df68a04030763a6b12a570f2e0bec1998a6b5f`。
- 文件：`.project-local/projects/828ccec779ac4d88a0b1dd9e41fc63ba/assets/versions/5aafa4b629424e9bbda90c4af81bc010/delivery.zip`。
- `native.ai`、`preview.png`、`preview.svg` 与上述第二版回执 hash 一致；`inputs/0000.ai` 与第一版 AI hash 一致；另有 bundle-manifest.json。
- 包内仍明确 `font_inventory=NOT_COLLECTED`、`link_relocation=NOT_VERIFIED`、rights/quality `NOT_REVIEWED`。字节打包成功不等于专业生产完整性通过，这些缺口仍需补齐。

本次是本地安装包 API 导出，不是浏览器下载、人审接受或云端上传。

### 字体信息缺口定位

第二版已绑定 job 的 99 个文本对象请求 ArialMT 23 个、Arial-BoldMT 76 个。固定 Illustrator 桥在重开 readback 时逐对象比较实际 textFont.name 与 spec.font，及字号/位置；现有成功回执绑定该桥 SHA `4a6369fa5a5bb2d631d1a996ecdceac73eb2ba30653a8bb34d837a7a50cf2fc2`，但包生成器没有输出逐字体清单，仍写 NOT_COLLECTED。

SVG 的字体定义在 inline style，非 font-family XML 属性；不能因为直接属性查询全为空就判断字体丢失。ocr-100 实际 style 为 ArialMT / 22.1441px，transform 基线 y=2679.0029。原允许框底边 2682，文字变化实际到 2684；该坐标事实支持继续调查字体下伸部与 OCR 框，不独立证明根因。

后续应把请求字体、宿主读回证明、来源与许可状态分别记录到 bundle，不能将字体名或该受控回执等同字体可分发许可。暂未更改 bundle 合同或复制字体文件。
