# DESIGN-LAB 夜间增量交接

本轮是开发分支检查点，不是 M1 / R3 / R4.1 完成。用户已授权无人值守推进和上传；无法读取账户剩余百分比，因此不声称触达 30% 阈值，按可恢复阶段保存成果。

## 当前成果

基线 `a97e951b01d575b774d0ca81939cc365bcfec96a`，分支 `codex/r3-runtime-correctness`。该基线 GitHub Canonical Verify run `34068690361` 已读回 completed/success；不覆盖本轮尚未发布的修改。

1. **视觉质量扫描边界修复**：遍历前排除运行/依赖/私有目录，保留源码 JSON 错误。RED 复现后 GREEN；3 PASS / 1 原生 symlink 权限 SKIP。真实定向校验无错误。[审计](../decisions/R3-VISUAL-QUALITY-SCAN-FIX-2026-09-07.md)。
2. **Illustrator 路径修复**：统一 fsName 分隔符后比较边界；10 个 JS 路径子用例及 4 项既有相关测试通过。原生复验没有执行：脚本选择框不可 set_value，点击定位错误，安全退出。未修改用户文档。[审计](../decisions/R3-ILLUSTRATOR-PATH-FIX-2026-09-07.md)。
3. **报告观察语义**：index v3 保存生成时 Git 观察；check 验证绑定输入/输出完整性，不冒充当前 Git/云端读回。真实临时 Git 提交回归与其余报告测试共 25 PASS。[语义、边界与回退](../decisions/R3-REPORT-OBSERVATION-SEMANTICS-2026-09-07.md)。
4. **R4.1 增量对齐**：补 R3 24/24 到 R4.1 的映射，保留原包，不重置已做实现。[映射与合同缺口](../taskpacks/R4.1-R3-INCREMENTAL-ALIGNMENT-2026-09-07.md)。
5. **可安装服务前置设计**：确认 SQL 资源和 PROJECT_ROOT 仍绑定源码位置；需先处理资源打包与显式项目根，再复用现有 asset/job store。[设计，非实现](../decisions/R3-INSTALLABLE-SERVICE-DESIGN-2026-09-07.md)。

## 最新测试，不得混淆

- 聚合树统一门会话 **81500**：exit 0，49 PASS / 0 FAIL。终态原始输出在 `.project-local/task-artifacts/report-observation-20260907/unified-81500.log`。
- 完整 Python 测试会话 **14679**：`.venv/Scripts/python.exe -B scripts/run_python_tests.py`，2026-09-07 22:54:41 本地时间启动。本交接写入时仍在运行、持续有进度，进程 29880 CPU 持续增长；**没有终态通过结论**。
- 后继优先 `write_stdin(session_id=14679)` 读回；句柄遗失才按真实进程状态判定，不能因观察超时另起一轮。若新进程占用旧 PID，要核对创建时间，不能只看 PID。
- 完整测试开始后的变更为审计/交接/映射文档；代码修改在启动前已完成。上传提交会改变 SHA，终态结果仍须绑定本次实际源码 hash，不能伪造为已验证新提交的云端 CI。
- 报告新鲜度与任务资格分开：旧 `c4dccd5` 收据可以 STALE，不改旧 hash / subject SHA 来恢复数字。正式 ledger 本轮尚未追加新收据；生成报告不是新宿主实测。

## 接续顺序

### 追加终态（检查点上传后读回）

会话 **14679 已结束，exit 0**：`Ran 762 tests in 1062.010s`，`OK (skipped=2)`，即 **760 PASS / 2 SKIP**，没有失败。终态原始输出（非完整逐点日志）保留 `.project-local/task-artifacts/report-observation-20260907/python-14679-terminal.log`。不再轮询该已完成会话，不再重复全量启动。上文“仍在运行”是交接写入时的历史状态，以本追加终态为准。

已上传代码检查点为 `38b89ff3050e5511ed3981a9019b846fff29f324`，当次本地/跟踪 ref/直接远端读回一致，提交后报告完整性检查通过。该 SHA 的 CI run `34136982157` 在读回时为 in_progress；需后继按 exact SHA 查询终态。这不是 main 合并或正式发布。

1. 读回 14679 终态；若失败，保存实际失败和耗时，不重复全量盲跑。
2. 将本轮新验证按 source/artifact hash 追加到正式 ledger，保留旧 FAIL 和 STALE；不得将 JS 替身测试提升为 Adobe 实机证据。
3. 处理可安装包的 SQL 资源和项目根，安装到本项目 ignored 环境，从非仓库 CWD 验证；再实现持久项目/任务 API。
4. Illustrator 产品桥仍只是创建文档骨架：补真实对象、保存、重开、读回和失败恢复；脚本选择器输入可靠性需另诊断，不重复错误点击。PS 尚无原生闭环。
5. 接 Comfy 产品 adapter、工作流图指纹、取消确认与可复现记录；H3 许可适用性未清不得推理；ASR/OCR/TTS 分开验收。
6. 工作台、复杂参考 5–10 类/张、AI/PSD 两次局部修改、15 秒内容/分镜视频和人工门仍未完成。知识迁移继续延后。

## 保存和发布范围

本轮只上传源码、测试和文档的同名开发分支；不创建 PR、不合并 main、不发布版本。原生文件、模型、环境、测试原始日志保持 `.project-local/` 本地，不强制加入 Git。完整上传 SHA 以 Git 记录及最终远端读回为准；本文件不写自身提交 SHA，避免自引用。

本机外置目录继续以 `.project/paths.json` 和 `docs/LOCAL_ENVIRONMENT.md` 为准；不扫描 E 盘，不写共享库，不读取凭据。用户授权自动操作不等于人审质量、rights 或 release 签署。

## 接续检查点：可安装包、CLI 与本地项目 HTTP

本节覆盖上文已完成的待办：Python 会话 14679 已结束，不再轮询；SQL wheel 资源与显式 CLI 项目根已推进，下一步不再从 package=false 开始。

- 发布前基准 `709bf3e72ce21c29b9f391de35aa34d523c49355`；本次已实时读回该 SHA 的 CI run `34137158705` completed/success。`38b89ff` 的 run `34136982157` 也 completed/success。两者不覆盖本次新增源码。
- 五份 SQL 构建入 wheel，源码/安装资源校验通过；保留原 SQL SSOT。包开启安装、增加 CLI、ProjectService 和 loopback 元数据 API。
- 源码定向验证：CLI 4、HTTP 8、SQL 资源 3、资产事务 18、Attempt 23，共 56 项 PASS。安装 wheel 后另跑 HTTP 8 项 PASS，实际独立进程重启读回。
- 最新 HTTP wheel hash `43a7026829183087f2fb66248b678845a5e67280e69a84fe55b9f2c10fd725f5`；wheel 的 38 个成员仅 package/dist-info，无运行缓存污染。各轮 wheel 分目录保留，不覆盖旧证据。
- 发现并修复非法 Unicode 名称返回 400 却创建数据库的副作用；回归现要求在创建数据库前拒绝。
- 环境差异：全局指引中的 execution_preflight.py 与根 package.json 在本仓库不存在；使用实际 Python 3.13.14 导入/版本校验、根 Python 入口和仓库 canonical workflow。缺失路径不是产品失败。
- 原报告 bound-input 检查因源码变更报告 DRIFT，已运行唯一生成器再校验 PASS；没有手改旧证据 SHA、没有把旧证据抬升为当前实机通过。
- 本切片提交前统一校验 `verify_design_lab.py` 49 PASS / 0 FAIL；evidence binding 仅 HISTORICAL_VALID、requiresRequalification=true。旧 Comfy 校验器输出中的 E3 标签不等于本切片实机结果。最新完整 Python suite 未在本机重跑，交给本次 exact-SHA CI，不能复用旧 762 项结果。

验收正文：[安装后 CLI](../decisions/R3-INSTALLED-CLI-QUALIFICATION-2026-09-07.md)、[HTTP 元数据](../decisions/R3-LOCAL-HTTP-METADATA-2026-09-07.md)、[SQL 资源](../decisions/R3-INSTALLED-STATE-RESOURCES-2026-09-07.md)。原始运行脚本、wheel、环境保持 ignored 本地；换机器需要真实重建重跑，不能补造日志。

继续顺序：显式 project root 传入任务存储及资产发布 → 复用 operation/attempt 接入任务、事件、取消和真实导入导出 → 工作台与 Adobe 产品桥联通。当前 HTTP 仅项目元数据，使用启动器 stdin 内存密钥、Host/Origin 边界，不是公开网络服务；无模型/宿主调用，未验证全依赖安装、长任务负载或完整服务升级恢复。

完整范围未缩减：5–10 张复杂不同类型参考、AI/PSD 两次局部修改、15 秒内容分镜视频、Comfy 生产适配、H3 条件资格、媒体与人工门仍分别待验收。R3-09 / R4-009 仍 PARTIAL，不据本切片宣称 M1 或全部完成。

## 接续检查点：显式存储拥有者与真实图片导入

- 前一发布 SHA `d59a472cc32129dfe9f1df7a22766d3064a83600` 的 CI run `34139232538` 已实时读回 completed/success。
- state_store、job_store、资产发布和恢复均新增显式 `project_root`；源码与安装后各 3 项通过，既有资产 18、Attempt 23 项通过。参见 [拥有项目记录](../decisions/R3-EXPLICIT-STORE-OWNER-2026-09-07.md)。
- 新增真实 PNG/JPEG HTTP 导入、项目隔离列表与原字节读回；使用已有 Operation/Attempt/asset publication/fencing，不新建平行账本。发布并重新 hash 读回才 RECEIPTED；相同请求幂等，改请求、越项目、已损坏字节拒绝。rights 始终 NOT_REVIEWED。
- 锁定完整依赖安装后的真实子进程 HTTP 13 PASS；故障注入 1 PASS（真实 rename 后错误，任务 OUTCOME_UNKNOWN、无 ACTIVE 版本、不自动重试、可隔离回收）。见 [图片导入记录](../decisions/R3-IMAGE-IMPORT-HTTP-2026-09-07.md)。
- 生成报告时尝试更新 R3-09 的 baseline_existing 被 frozen-source 校验拒绝，已撤回这一修改；不绕过校验，不把历史基线改成当前进度。新证据尚需按正式 receipt 格式绑定到账本，报告中的 NOT_EXECUTED 不代表这批源码不存在。
- 剩余明确工作：导入中断对账入口、任务/事件/取消/修改/导出 API、OpenAPI/TS 合同、工作台和真实宿主联通。当前导入同步执行，不是异步设计 worker，不证明成熟复刻效果。
- 本轮最终源码定向：服务 17、故障导入 1、显式根 3、资产 18、Attempt 23，共 62 PASS；统一校验 49 PASS。最新整仓 Python suite 仍须由本次发布 exact-SHA CI 证明，未沿用前次结果。

## 原生入口恢复（23:56）

Illustrator 脚本文件选择器已经实际输入并执行本项目 run.jsx。路径校验原生 6 PASS，host 29.5.1，文档数 0→0；终态位于 `adobe-live-20260907/path-fix-qualification/run-1788796615014/`。详见 [路径审计追加](../decisions/R3-ILLUSTRATOR-PATH-FIX-2026-09-07.md)。不要继续把该入口写成当前阻断。

入口要点：辅助功能 focused_element 错报 SearchEditBox，截图却可见文件名框插入光标。Alt+N 后以截图确认实际焦点，再 type_text 完整项目脚本路径、截图核对文字确实进入文件名框，Return 执行。不能只依据旧 element index 或错误的焦点文本；每个动作后重新观察。

因此下一步优先推进已解阻的 Illustrator 产品对象/保存桥，任务查询与事件接口仍保留，不用纯元数据工作替代原生设计目标。先使用已实测诊断代码的宿主操作，再以当前闭合任务合同约束；不得直接将诊断脚本宣称产品完成。

本次已实时读回 `83b4fc628f706668ec4f31b7856fbd8d214c42e5` 的 CI run `34140369754` completed/success。原生新验证只针对该提交中的路径函数，不提升全 R3/R4 或主分支发布。
