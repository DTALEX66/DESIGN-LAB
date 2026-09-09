# Photoshop 安装版交付包读回

## 构建与安装

离线uv build和pip install，仅项目内环境；wheel `.project-local/task-artifacts/wheel-r5-photoshop-patch/design_lab-0.1.0a0-py3-none-any.whl` SHA256 a45db1bb0d66a3c5f0ae7c41414f6a81dfc8f79ee6b2d04c748e51499b960d55。

ZIP逐项核对native_patch_plan、native_patch_submissions、photoshop_com、Photoshop JSX、main.ts与源文件字节一致；无.project-local/.hermes/uv-cache成员。构建提示cache位于源目录，实际包内检查未发现该残留。

安装环境 `.project-local/task-runtime/workbench-installed`，从`.project-local/task-runtime/tmp`用安装解释器-I运行，不注入源码sys.path。此为同版本号精确wheel替换，非正式版本升级或发布。旧font-inventory wheel保留供回退；本轮尚未再执行回退测试。

## 完整本地bundle

从已验证PS第二次修改attempt att-934eff689b0b4b518f5f49f07a3b7035导出：

- version v-f77a249cc57c4de3b9e80f8c8d0687ec。
- 路径 `.project-local/projects/d2981992a4fa4385a91d96c6b7522262/assets/versions/b36ac66c3168474ebc04a4dbd018868f/delivery.zip`。
- 31658083 bytes，SHA256 0ae40bb8f5197101edca17c75197ab75d75bd669be920b06829cb5b5fefda437。
- bundle-manifest.json +47个文件：最终native.psd、preview.png、父checkpoint PSD和44个图像输入。
- 独立读取ZIP全部47个成员并核对SHA256及byte_size，全部PASS。
- 安装版重复导出返回相同version/hash，不新增版本。
- requested_fonts共99个文本对象；font_observation NOT_COLLECTED，rights/quality NOT_REVIEWED，link relocation仍未验证。不包含未授权字体文件。

首次导出本身成功，但随后检查命令误用manifest.json名称导致KeyError/exit1；根据ZIP真实清单改读bundle-manifest.json，重新安装版导出和逐项校验exit0。没有修改或重建假清单。

## 边界及接续

证明安装版能读取真实PS任务并完整打包，不证明安装版已执行两次PS修改或真实页面点击；这两项继续。全量回归、当前源码exact-SHA CI、提交上传未执行；原生作品/ZIP保留ignored本地，未上传Git。基础HEAD a06c1db01944faca6c8dd41b8fe22f651138a400加未提交改动。

## 安装版两次真实修改补验通过

同一上述wheel，工作目录为.project-local/task-runtime/tmp，用安装Python -I执行NativePatchSubmissions/NativeTasks，不注入源码路径。Photoshop26.7.0，bridge SHA31b05500e54520da566a3b95bec8793bc21e0857c760f7aa04b4e14a3e115828。

1. 从att-934eff689b0b4b518f5f49f07a3b7035，将ocr-1改为Test instalacji PSD。新attempt att-97f394db603b4cab8a079782fe748db8，25.121秒，RECEIPTED；version v-55ff75c1bd704cc18a6a15c241f9580d；PSD6024089bytes，SHA5841e08c9cc1a8eb2bfad190696701c81e24b804a8306908e005b57e2d1cc4d4。
2. 从前次结果将ocr-1再移动[2,0]。新attempt att-c738963c958043e8a028b5a09fd9a92d，25.288秒，RECEIPTED；version v-17fe9dec59974e95b91e8431a8e699e4；PSD6024104bytes，SHA34628f7a08f1d9423eb58147d4f75964fa8b63a2b31cf56a529341b80c0abc21。

两次会话95002/76251均exit0；第二次execute_queued再调用得到完全相同结果。原生读回在固定桥内完成；实际页面点击、独立对象身份枚举、人审与rights仍未验收。上述旧“安装版两次修改待完成”由本节更新，不提升整体M1为完成。
