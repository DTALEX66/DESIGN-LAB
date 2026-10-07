# DESIGN-LAB 启动连接 · 人工评审 · 产物预检 · 2026-10-08

同一波次内的三条链,基线 live main `fc03a3033e900a8066d863a223636cc68804c4fa`。
本轮接手时的第一个发现是交接前提反了:本地检出 `1d18ae80` 相对 live main 是
**0 ahead / 81 behind**,交接点名的"必须先修的门"(`test_workbench_css_single_definition.py`
50→47)在 main 上早已用 rendered-rows 语义正确修好(`37bd2622`,下限仍是 50)。
未提交增量按行比对后,真正 main 上没有的是备份一致性(见
`DESIGNLAB-BACKUP-CONSISTENCY-2026-10-08.md`)、官方启动自动连接、以及下面两条能力链。

## 1. 官方启动自动连接(提交 10bf16a3 / dcc27769)

`design-lab workbench` 以前把一次性令牌打到 stdout,要求人复制进页面。现在默认不打印任何
凭据:由本服务自己打开的页面通过 `GET /api/local-session` 取回会话,且仅当
`Sec-Fetch-Site` 恰为 `same-origin` 时作答。`--manual-connect` 保留旧行为给外部启动器。

这个端点比既有 `guard` 更窄,是刻意的:`guard` 允许缺失 `Sec-Fetch-Site`(普通 HTTP 客户端
本来就没有这个头),这对"服务一个页面"没问题,对"交出凭据"不行。测试用真实 socket 断言
四种拒绝:伪造 Host、外部 Origin、cross-site、无头,以及 auto-connect 关闭时端点不存在、
令牌不在服务出的 HTML 字节里。

`OSError` 的 winerror 206 从 `PROJECT_STORE_UNAVAILABLE` 里分出来成为
`PROJECT_PATH_TOO_LONG`。长路径是本项目在 Windows 上的真实故障形态,把它报成"存储不可用"
会把用户支去查数据库而不是查项目放在哪。

能力库打包缺陷:`capability_library.py` 用 `parents[3]` 推断仓库根,安装态即
`<venv>/Lib`,四份输入读不到 → `_read_json` 以 `FileNotFoundError`(OSError 子类)失败关闭
→ HTTP 层再报成 `PROJECT_STORE_UNAVAILABLE`,一个指向错误子系统的错误诊断。现在四份输入
随 wheel 打包并优先解析安装态。

安装态是**实测**的,不是推断:`uv build --wheel` → 干净 venv → `IMPORTS_OK` →
`DL_LAUNCH_INSTALLED=1` 下 `Ran 3 tests / OK` 且**无 skip**,其中安装态能力库投影与仓库态
逐条相等。这是依赖复用的本地安装验证,不是清洁房间发布,因此不构成 E5。

CI 的 wheel 门断言 `Ran 3 tests` 且禁止 skip,所以这条读回是**扩写已有用例**而不是新增方法。

## 2. Human Jury 从合同变成可用能力(提交 0c36669f / c2e74aac)

`human_jury.py` 校验裁决已有一段时间,但没有表、没有端点、没有界面:评审无法留存,
重启即丢,UI 只能显示空占位。补齐的链:

- `design-lab-state-jury-v1.sql`:append-only,`UPDATE`/`DELETE` 触发器直接拒绝。人工签署的
  凭据被就地改写等于重写项目引用的验收历史。
- `jury_store.record()`:裁决必须绑定**同一项目内 ACTIVE 版本**且摘要与该版本一致;
  Agent 署名按类型名拒绝;已取代的记录不能被再次取代(否则验收链分叉,"当前裁决"无定义);
  proposal 永远不进 `verdict` 列。
- `connect()` 委托 `asset_store.connect()`,不在这里第二次实现路径策略与 assets-v2 迁移。
- 端点 `GET/POST /api/projects/{id}/jury{,/verdict,/proposal}`;读回带
  `reviewable_versions`(含摘要),所以评审人不需要手抄哈希。
- `JuryReviewError` 在通用 `ValueError` 分支之前映射:拒绝原因是有用信息
  ("artifact_sha256 does not match the version being judged"),塌成 `INVALID_REQUEST`
  就等于告诉用户"你的判断有问题"。
- 同一提交重发是重放(返回已存记录),同 id 不同内容是 409。浏览器在丢响应后重试
  不该产生第二份签署。

界面挂在预检页的新段落下:读回当前裁决、Agent 建议数、是否真的存在人工验收,空态明说
"尚无人签署的裁决"。签署表单从 `reviewable_versions` 取版本与摘要。

两条门抓到我自己写错的东西:
1. 表单只收了说明没收 `score`,而合同要求每条准则有 0–5 分值 —— 每次提交都会 400。
   新增 `test_jury_review_form_contract.py` 把页面自己声明的轴/权重/文档形状送进
   `record_verdict`,UI 从此不可能发出合同拒绝的表单。
2. 两个新 seam 起初没有 `shapeNotice`,并把拒绝 catch 成 toast。appshell 门要求读回被拒时
   整个路由以失败开头,屏上不能留着旧内容 —— 改为让拒绝冒泡到路由,该批失败路径覆盖
   从 8 个视图涨到 9 个。

## 3. 产物级预检:能量多少就说多少(提交 d74e7c41)

`design-lab/production/profiles/*.json` 声明了 print 11 项、digital 9 项、video 9 项的
`pass|warning|fail` × `blocker|high|medium`,而树里唯一的"检查器"只走目录并返回五个字符串码。
`/api/task-preflight` 探的是任务工具与资源,是另一件事 —— 页面以前也这么标,没撒谎,但
产品确实没有产物预检。声明了却发不出的词表是假绿灯发生器:读者看到清单就以为检查跑过。

现在的发射器守三条:

* 只报 profile 声明过的检查项。漏报一项就是靠省略变绿,多报一项同样错,两个方向都有断言;
* 每条结论带 `criterion`,写明判据;profile 自己没给阈值时,直接说明判据来自本模块;
* `PASS` 要求每条适用检查都被真量过且通过。出现任何 `NOT_MEASURED` 结论封顶
  `INCOMPLETE` —— 一个本构建读不了透明合并的 PSD 报 `INCOMPLETE` 并给出原因,
  而不是沿用其它检查的绿灯。

用 Pillow 从真实字节量到的:像素尺寸、有 DPI 时的物理尺寸与有效 PPI、色彩模式对 profile
意图、alpha、容器格式、以及按归档自带清单核对的链接存在性与摘要。
明确标为未量的:出血、安全区、叠印、透明合并、PDF 配置、页序、字体嵌入/转曲、时长、
帧率、响度、编解码器、以及没有声明上限的体积项。

端点 `POST /api/projects/{id}/bundles/{bundle-id}/preflight?profile=…`:bundle 从状态库按 id
解析并限定在本项目,归档字节按登记摘要校验,成员路径越界直接拒绝 —— 页面不接受文件路径。

一条 profile 覆盖度事实记在此处而不是藏起来:`missing-links` 只由 print profile 声明,
所以 digital 归档不做链接校验。这是 profile 的声明范围,不是本模块漏实现;要改得改 profile。

## 4. 本波次未闭合的(不假装做完)

* `asset_publication` 恢复日志跨根后仍指旧根,`recover_publications(store_root=新根)` 按
  `store_root=?` 选取会静默跳过 PREPARED 行。按 owner 既有裁决只重定位 `artifact.path`,
  签名执行记录不改。
* 重启对账的 continue/reconcile/pause 机器齐全且读回诚实,但 `reconcile_receipted` /
  `quiesce_*` 在产品代码里没有调用点,启动只做 `RUNNING→OUTCOME_UNKNOWN` 改名。
* Design System token 写路径、ResearchFinding/MethodCard 持久化:仍是合同/CLI 层,
  没有端点与界面。
* D-6(首屏壳统一)属 owner 待裁事项:一次尝试把它做掉后被回退,因为它打断了钉死的
  `.app-nav` 几何门(见 `5cc5380e`)。
* 真实宿主 E3、真人 Jury E4、发布 E5 需要人与宿主,不是工程量问题。

## 5. 第二段(2026-10-08 追加,提交 a8e0c67c / d5192069 / edf0c85a)

第 3 节的界面读回与第 4 节的取消语义在本段闭合;另外抓出一个我自己写坏的门和一个是
非门。

### 5.1 预检的界面读回(提交 d5192069)

挂在交付中心:选交付包 + 选 profile + 点预检,读回判定、未量计数、每条结论的 detail 与
**判据**,并保留 `NOT_MEASURED` 行 —— 过滤掉它们就是让 INCOMPLETE 冒充通过。页面不自动
预检:没有人选过的交付包,结论只能是猜测。

两条门,分工不同:
- `test_artifact_preflight_ui_contract.py`(静态合同):页面提供的 profile 集合与磁盘上
  的 profile 文件、路由自己的 `?profile=` 模式**三方相等**;URL 必须由 project id +
  bundle id 组成;判据必须上屏;服务的四个判定词都必须有对应着色。
- `appshell.mjs` 第 ⑥ 段(行为):对**已构建的 bundle** 驱动 —— 不点击就发出的请求算失败、
  一次点击恰好一个请求且落在所选交付包自己的路由、判据与未量项出现在屏上、被拒后旧判定
  被替换而不是叠加。

五个产品变异各自把对应的门改红(判据丢失、过滤 NOT_MEASURED、多提供一个 profile、未点
先显示判定、URL 改成传路径),门是有牙的。

这一段还抓到一条我自己的工具缺陷:**`vite build` 失败时旧 bundle 留在原地**,下一个门量的
就不是它声称的字节。第一次 falsify 就撞上这个 —— 我的变异把括号写坏了,构建失败,
appshell 报的是上一个变异的错。之后所有变异脚本都先断言构建返回 0。

### 5.2 我上一波写坏的门(提交 d5192069)

`0c36669f`/`c2e74aac` 的评审列用的是 `<div class="list">` + `<div class="list-item">`,
被 `ListItemIsReallyAListMember` 两条断言抓到:看着是列表,读屏软件里什么都不是,而且空态
`<p>` 直接坐在 `<ul>` 的位置上。改成真 `<ul>/<li>` + `emptyLi()`。该门把容器数钉成精确清单
(为了让迁移漏掉一处就必然报警),所以容器数 30→31 是**有意的清单增长**,注释里点明了新调用
点。全量运行确认这两条失败属于我,不是既有基线。

### 5.3 身份门把 wheel 当文本读(提交 a8e0c67c)

`verify_identity_gate.py` 遍历工作树时按 UTF-8 读 `dist/*.whl`,于是**每次本地打包都让门变红**,
而且它检测不到任何东西;CI 没有 `dist/`,所以 CI 永远看不见这个缺陷。同时 `.zip` 早就被
"二进制跳过"放行 —— 而 zip 正是旧包名会藏身的地方:成员名。现在 `.zip`/`.whl` 按成员名匹配,
打不开的容器按 fail-closed 记为违规。

发出去之前先量过:活动树里的两个容器(design-lab 自己构建的 wheel、docs/audits 下冻结的
任务包归档)成员名都干净,所以没有新的红。归档里的旧名字在成员**正文**里,这一门不声称读
正文,那条限制写在这里而不是藏起来。

### 5.4 取消未被确认却成功了(提交 edf0c85a)

`POST /tasks/<job>/cancel` 只把尝试推到 `CANCEL_REQUESTED` 并回 202;适配器没有任何"我停了"
的事件,所以 `acknowledge_cancel`(通往 RECONCILING 的唯一路径)在产品代码里**没有调用点**。
剩下的两种结局里,宿主仍交付的那一种会走 `_finish` 提交 `RECEIPTED`,备注里看不见那次取消,
任务读回也不带任何取消字段 —— 一个被拒绝的操作在所有界面上与一个没人反对的完成**无法区分**,
包括那句写着"请求取消不等于已取消"的页面。

改的是可读性,不是状态:`RECEIPTED` 保留,因为字节确实发布并读回了。现在尝试备注写明取消
未被适配器确认,`/tasks` 带 `cancel.requested/acknowledged`(用 COALESCE,因为 v2 之前的尝试
可能没有 resolution 行),交付中心把这一行标成 取消未确认。两条单测钉住后端 —— 含"普通完成
必须是 requested:false",这个新字段不能读成"总是被取消过";appshell 第 ⑥ 段两种载荷都真渲染。
删除标记会触发正向断言,`||` 代替 `&&` 会触发反向断言。

`acknowledge_cancel` 仍然没有生产调用点:那需要宿主协议先有一种"已停止"的事件,属于协议问题,
不是补一根线就能做完的事。

### 5.5 账本里的 subject_files 从来没被验过

每条 evidence 记录都带 `subject_sha` + `subject_files{路径: 摘要}`,这是**局外人唯一能复核
"这条证据到底绑的是哪份字节"**的机制。而 `verify_evidence_artifact_presence` 只看
`artifacts`(记录产出的文档),完全不读 `subject_files` —— 所以我实测了一遍:268 个声明里
201 个能对上所绑提交的 blob,67 个对不上。

对不上的两类原因不同,分开记:
- 4 条实质性过度声明,都在 2026-09-09 那批记录里:3 个摘要不等于所绑提交 a06c1db0 的字节
  (comfy_task.py、test_comfy_task_protocol.py、native_patch_submissions.py),1 个路径在那
  个提交里根本不存在(`generators/comfy_http.py`)。也就是说这些摘要取自当时的工作树,不是
  取自它声称绑定的提交。
- 63 条是"把磁盘上的东西当主体":57 个 `__pycache__/*.pyc`(从来没进过 git),6 个
  `fixtures/.../audio/*.wav`(记录绑 4c9f1849,而那些生成素材是之后才提交的)。

新增 `verify_ledger_subject_binding.py`:一律用 `git show <subject_sha>:<path>` 从对象库取
字节(不碰工作树,所以后来改同一个路径不会改变答案),摘要不符或路径不在所绑提交里就算缺陷;
`design-lab/config` 之外唯一的例外是一张**双向**的 KNOWN 清单 —— 出现新缺陷变红,已修的条目
还赖在清单上也变红,防止它慢慢变成一串"历史原因"。清单是按记录逐条写的,不给通配,别的记录
不能借用同一条豁免。

我没有去改那 4 条旧记录的摘要:把它们"改对"等于伪造证据。做法是把缺陷写在源码里并标日期,
让它阻塞任何新的。顺带一条好消息:我自己这批记录(备份、评审、预检)全部对得上,机制本身
是有牙的。

门自己也被反证过:11 条用例里包含"摘要不同必须报 MISMATCH""路径缺失必须报 ABSENT""提交取
不到必须报 NO_COMMIT 而不是当作通过""豁免是按记录生效不是按路径生效""清单里的条目变得可验证
时必须报 stale",以及一条专门防止 OK 空心化的断言 —— 它比较 `subject_files=` 与 `checked=`
两个计数并要求总数 > 200。该脚本已进 `verify_design_lab.py` 的聚合清单(现共 57 个,failed=0)。


