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
所以 digital 归档不做链接校验。这是 profile 的声明范围,不是本模块漏实现;链接图对
PNG/JPG 这类数字交付没有对象可查,把它加进 digital 只会凭空多出一条恒真的检查。要改
得改 profile,并由改的人负责那条检查在数字域里究竟量什么。

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

### 6. 链路逐条判定与本轮新抓到的事实(2026-10-08,含只读审计的交叉核对)

一个只读审计子智能体 gave me a table; I re-checked its claims instead of pasting it, because
two of them did not survive contact with the code.

| 链路 | 判定 | 依据 / 仍需 |
|---|---|---|
| 合同 | PARTIAL | `design-lab/schemas/contracts/*.json` 32 份在 `src/design_lab/` 里**一个读者都没有**;产物预检的 schema 与发射器字段名待对账(子任务进行中) |
| 后端 | REACHABLE | `http_service.py` 路由表 |
| 前端 | PARTIAL | `#/domains` 之前无任何后端;`#/collaboration` 属本地单机模型的诚实空页 |
| 持久化 | REACHABLE | 新增 `design_system_token`、`delivery_receipt_v1`、`jury_record` 三类真表 |
| 读回 | PARTIAL | 重启读回有;**启动恢复的摘要目前只上 stdout,没有路由也没有界面** |
| 质量 | MISSING | `assurance/qa_plane.py` + `quality_record.py` 只有测试与 handoff 脚本消费;产品里没有路由、没有 CLI 动词,门开不了 |
| 预检 | REACHABLE(不持久) | 交付中心真能跑并读回;结论**故意不落库**(见下) |
| 交付 | PARTIAL | 回执已落库并可 CLI 读回;`receipt()` 还没有 GET 路由;PDF/Video/3D 仍不产出 |
| 证据 | PARTIAL | `#/evidence` 只投影设计层与交付包计数,不显示 jury、预检、回执 |

我自己核对出来的四条:

1. **rights 不是门,是常量。** `native_assets.py:36,99`、`image_assets.py:72,140`、
   `native_bundles.py:126-156` 一律把 `'NOT_REVIEWED'` **注入**响应 —— 状态库里没有 rights 列,
   全仓没有任何 `UPDATE … rights`。所以 `shell.ts:814,1851` 那句
   `b.rights === 'NOT_REVIEWED' ? warn : b.rights` 的 else 分支是死代码:这个标签永远不会变。
   AGENTS.md 承诺的 Rights gate 因此是"声明了但没有实现",已列为待办,不是工程量之争。
2. **审计子智能体的一条结论是错的。** 它说 `#/research` 已接后端却仍写着"未开放"。实测
   `http_service.py` 里没有任何 research 路由,`shell.ts:296` 那句话是**诚实的**。
   W13(ResearchFinding/MethodCard)确实整体缺失 —— 结论方向不同,处理方式也不同:前者要改注释,
   后者要补链路。
3. **活动账本自 2026-09 的 R5 迁移起就没有 schema。** 唯一存在的
   `task-ledger-r3.schema.json` 钉的是 `r3-v1` / `DL-TP-20260906-R3` / `^R3-\d\d$` / 要求
   `acceptance`,拿它校验活账本得 105 条错(69 条 id 形态、28 条缺 `acceptance`、外加
   `predecessor`/`definition`/`reassessment` 未声明、artifact 形状不同、evidence 有 maxItems)。
   但把**冻结的 R3 前继账本**拿去校验同一份 schema,得 0 条错 —— 所以 r3 schema 不是烂文件,
   它管的是 r3 那份;真正的缺口是迁到 `r5-v1` 时没人写 r5 的 schema,而 AGENTS.md 早就把
   `r5-v1` 说成"只是版本标识,不是文件路径",等于把这个缺口写在文档里挂着。
   现在补 r5 schema,并让门按账本自己的 `schemaVersion` 选文件:`schemaVersion` 指不到文件就是
   硬失败(这次的根因正是一个没有文件背后的版本串)。
4. **`audit_event` 只写不读。** `asset_store.py:144,250` 在写,产品代码从不 SELECT,
   只有 `test_asset_store.py:99` 读。要么把它读出来,要么停止写 —— 一个只有写入的日志看起来
   像审计线索,其实不是。

一个我做的**不修**决定:预检结论不入库。预检是对**当前字节**的一次计算,重新跑很便宜;把
"PASS"存下来就等于给一份可能立刻改变的判定一个持久身份,反而制造陈旧绿灯。要留的是"跑过、
跑了什么、结论是什么"这一类**事件**,不是可被反复读取当成现状的判定值。`#/evidence` 因此应当
读回 jury 与回执,并让预检保持"当场跑"。

## 7. 第三段:入口与安装态(提交 181ce73a / faedcc27 / fa5db57d)

### 7.1 官方启动命令被自己打死了,而我的定向门全绿

`fa69afc0` 给 `cli.py` 加了 `native-recovery`,其中 `recovery = commands.add_parser(...)`。同一函数作用域里
workbench 分支打印的 LISTENING 行写的是 `'recovery': recovery` —— 打的是 **argparse 子解析器对象**,于是
`json.dumps` 抛 `Object of type ArgumentParser is not serializable`,**产品在打印端口之前就崩了**。
serve 分支三行之外打印的是 `recovery_summary`,只有 workbench 分支被同名变量吃掉。

我提交前跑了 `test_native_tasks`、`test_boot_reconciliation`、`test_service_cli`,全绿。漏掉的是启动器自己的
`test_workbench_launch` —— 因为"改了 cli.py"没有让我想到"跑启动器测试"。抓它的是**安装态复验**(见 7.3),
不是门集合。修的时候不止改那一行:把解析器改名 `recovery_command`,让"能被打错的东西"不存在。
修完做一次对照实验:把 bug 放回去,`test_workbench_launch` 在**源码态也 2 个失败** —— 门有牙,是我的
验证顺序没有。

### 7.2 `audit_event` 一直在写,没人读

`asset_store.py:144,250` 写 `asset_version_created:*` 与 `writer_takeover:*`,产品代码从不 SELECT,只有
`test_asset_store.py` 读。写不进问题的日志不是审计线索:它长得像,回答问题时什么都不答。最该被看见的是
`writer_takeover` —— `takeover_writer` 会主动递增 generation 并把资源交给新写者(卡死/崩溃的持有者就是靠它
不再阻塞项目),之后运维第一个问题是"谁在什么时候接管了什么"。

`runtime/audit_trail.py` 用存储自己的路径策略以 `mode=ro` 打开,所以它不可能变成第二个写者;三种"空"分开
(没有状态库 / 库里没有 journal 行 / 这一页读完);actor 保持是 attempt id,不翻译成人名;分页用
`(at, audit_id)` 行值比较,因为只按微秒时间戳排序无法保证不重复不丢。
三条常设断言防回退:src 里必须有人 SELECT 它、读路径必须被 CLI 调用、写必须还在写 —— 否则第一条会被
"把写删掉"这一手悄悄满足。两个削弱(永远报 PRESENT、按 offset 分页)都实测变红。

### 7.3 安装态必须在当前 HEAD 重测,而且要防"用到上一天的 wheel"

全量绑定跑里 `test_packaged_install_serves_the_committed_bundle` 在源码态**合法 skip**,所以本地那句
`OK (skipped=1)` 对安装态什么也不证明。本轮重测:删掉旧 wheel → `uv build --wheel --out-dir dist` → 干净
venv → 装 wheel → **把 wheel 内的 `design_lab/resources/workbench/build/main.js` 与仓内已提交 bundle 逐字节
比对**(相同,208231B)→ 四份能力库输入随包 → `DL_LAUNCH_INSTALLED=1` 下 `Ran 3 tests / OK` 且
**skip 行为 0**。

第一次尝试是假的:`uv build --out dist` 不是合法参数,构建失败,`install` 装的是**前一天的 wheel**,而
`INSTALL_RC=0` 和"导入成功"全都成立。这与 7.1 同族:**producer 失败后,下一个环节会安心地量残留物**。
所以校验脚本现在先删产物、比字节、要求 0 skip,并且失败时也要把日志落盘(第一版抛异常时把证据一起丢了)。

### 7.4 32 份 contracts/ schema 里,只有 1 份是真的

`design-lab/schemas/contracts/` 声明 32 份合同;`grep -rn "schemas/contracts" src/` 为空 —— 运行时一份都不读。
唯一名副其实的是 `design-lab/planar-decomposition/v1`(`analysis/decomposition.py:164` 真的产出它,测试校验的是
**产出的** JSON)。其余 31 份 INERT,其中几份不是"没读"而是**与实现相反**,继续留着就是让下一个读者误信:

- `contracts/delivery-receipt` 钉 v1 且要求 `delivery_id/delivered_at`、禁掉随包 v2 必需的
  `receipt_sha256/job_id/deliverables/axes`(我把两份文件的 const 与 required 并排读出来确认);
- `contracts/job-spec` 钉 v1,而 `creative_job.py` 写 v2,状态库 DEFAULT 还是 v1;
- `asset-manifest` 在同一个版本身份下有两份,字段大小写不同;
- `audit-event` / `operation-intent` 描述真表的必填字段里没有 `schemaVersion`,所以任何真实行都永远不满足
  那份 closed schema。

新门 `verify_contract_bindings.py` 是一张双向清单(32 schema 一行一条 + 48 条路由:6 条 BOUND_SCHEMA、
42 条 SCHEMA_LESS),并把**九条"发出 schemaVersion 但没有对应 schema"的路由记成具名债务** —— 其中一条是本轮
`domain-pack-readback/v1` 自己造的。记账而不是遮掉:本轮另一个门(§5.3)之所以存在,就是因为"声明了但没人
校验"和"没人声明"看起来一样。



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
两个计数并要求总数 > 200。该脚本已进 `verify_design_lab.py` 的聚合清单(条数随波次变动,
当前实测值记在 §8 末,不在此处钉一个会过期的数字)。

### 5.6 我的预检界面把 CI 的词表门改红了(而我所有的定向门都没抓到)

`d5192069` 之后直接跑 `verify_state_vocabularies.py` 是 FAIL:

```
ERROR: shell.ts advertises 'PASS' as a status; the service emits only ['BLOCKED', 'READY']
ERROR: build/main.js advertises 'PASS' as a status; the service emits only ['BLOCKED', 'READY']
```

而我把 UI 相关门全跑了一遍都是绿的。原因不是门太松,是我没跑它 —— 这条门只在
`canonical-verify.yml` 里单独调用,**不在聚合清单里**,所以本地绑定运行永远碰不到它。
先补结构:把它加进 `verify_design_lab.py`,让本地与 CI 见到同一套东西。

门的语义也要说清楚。它当初禁 'PASS',是因为 `runtime/task_resources.py` 只发 READY/BLOCKED,
而界面把预检判定写成 'PASS / BLOCKED'。现在有了**第二个发射器**
(`assurance/production_preflight.py`),它的判定真的是 PASS / WARN / BLOCKED / INCOMPLETE ——
所以"这个词本身是假的"不再成立。

改法不是把词加进白名单了事:
- 词表文件 `design-lab/config/state-vocabularies.json` 新增 `artifactPreflight`,带 `sources`
  指向发射它的模块;门双向核对该词表,`VERDICTS` 改了而词表不改就变红。
- 界面里的状态字面量必须属于**某个已声明词表**;没有发射器能产出的词(OKAY、APPROVED、
  自造的 SUPERB)照旧致命。
- 原来那个谎的**形状**继续点名禁止:'PASS / BLOCKED' 仍然致命,因为任务资源预检只发
  READY/BLOCKED。放宽的是词,不是那句假话。

这条门原先一个测试都没有,所以"它还能抓到东西"从来没人证明过。新增
`test_state_vocabularies_gate.py` 9 条,夹具一律是**真实文件 + 一处替换**,并且断言"这一处
替换确实改变了门解析到的集合"—— 我第一次写的 job_store 变异改的是转移表里的值而不是键,
门看不见,测试因此假绿;加了这条断言之后它就没法再假绿。9 条全过,含"历史谎形状仍致命"与
"真树的 PASS 是合法的"(门不能紧到把诚实读成违规)。


## 8. 第四段:"已接受"曾经由一个版本代表整个项目(2026-10-08 追加)

我自己发布的能力里有一个过度断言,读代码时抓到:`JuryReview.list()` 算
`human_acceptance` 用的是 `any(item['verdict'] == 'APPROVE' for item in current.values())`。
一个项目十次修订,只要在任何一次上签过 APPROVE,界面就报"人工验收 已接受"。
这一词是给**项目**下的结论,却由**单个版本**的签字满足。

顺着它查出第二层,而且是存储层的:`publish_version` 从不降级被替换的字节 —— 全仓没有任何
一条把 `asset_version.state` 写成 `SUPERSEDED` 的生产代码(只有测试直接 UPDATE)。
于是 `reviewable_versions` 取"所有 ACTIVE 版本"就等于取整条修订史:
一个资产改十次,评审清单上就摆着十张稿子,给废稿签字也会被记成有效判定。
产品其他位置早已按"当前版本 = 该资产 ACTIVE 里最大的 `version_no`"来读
(`native_assets.list`、`asset_store.current_version`),评审面是唯一没跟上的一处。

三处都是收紧,没有一处放宽:

- 谓词改成"每个在评审清单上的版本都带一个现行 APPROVE",并且**显式**要求清单非空:
  `0 of 0` 在数学上为真,但"还没发布任何东西的项目已被人工接受"是一句假话,所以报
  `NOT_ACCEPTED`。
- `reviewable_versions` 与产品其余读法对齐:每个资产一行,取 ACTIVE 中最大 `version_no`。
- `record()` 拒绝对"已被替换的修订"签字,并把两个 `version_no` 都点名 ——
  以前的拒绝理由只有 `state != 'ACTIVE'`,对废稿毫无约束力。

读回里加了 `accepted_versions` 与 `reviewable_active_versions`,"已接受"从此带着它的
分母;`design-lab/schemas/jury-readback.schema.json` 把这条语义写死(空清单必须
`NOT_ACCEPTED`,`ACCEPTED` 要求分母 ≥ 1)。

反证是三段变异(`.project-local/tmp/falsify_jury_acceptance.py`),每段都必须在指名用例上
以断言失败(不是 ERROR)变红、还原后回到 12 绿:
把谓词退回 `any(...)` → 两条用例红;删掉取最新 `version_no` 的子查询 → 降级签字用例红;
把 `record()` 里"被替换即拒绝"的判断短路 → 同一条用例红。第一次跑这个反证脚本时,第三段的
needle 是我按记忆写的 SQL 文本,和文件里的 Python 字符串拼接形式不一致,0 命中;脚本因此
报 `NEED NOT FOUND` 而不是假装"变异无影响"——这正是它该有的行为。

同族的第二处发射器已经定位、尚未处理:`assurance/quality_store.py:465` 的
`'human_acceptance': 'ACCEPTED' if accepted else 'NOT_ACCEPTED'` 是同一个 `if 非空` 过度断言,
它的 `assessable_versions()` 也仍在取全部 ACTIVE 版本。本轮不并行改它的原因是 worker 正在写
这个文件(见下)。

协作实况值得记一条:同一时间窗里,worker 正在创建
`design-lab/schemas/jury-readback.schema.json` 与
`design-lab/scripts/verify_route_payload_contracts.py`。我在几分钟内读到的是**两个不同版本**的
同一个 schema —— 第一版 `reviewableVersion` 不含 `version_no`,我在中间把它从发射器里删掉,
再跑新门就得到 `'version_no' is a required property` + `MISSING_FROM_EMITTER` 两条红。
补齐后 `VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS bindings=5 failures=0`。结论不是谁改错了,
而是共享工作树里"我刚才读到的字节"只是快照,不是事实:改合同之前要重读、改完要立刻用真门重跑。
另记:该门此刻尚未进 `verify_design_lab.py` 聚合清单 —— 一个没人调用的门等于文档,已列入待注册项。

注册状态实测(`ast` 数 `SCRIPTS` 列表元素,2026-10-08):聚合清单 **59** 项。本波把
`verify_artifact_preflight_contract.py` 注册了进去(它此前只在文档里被引用,没人调用),
`verify_ledger_schema_pairing.py` 由 ledger schema 那一路的 worker 同时注册。
**仍未注册**:`verify_route_payload_contracts.py`、`verify_contract_bindings.py` ——
两个脚本此刻正在被各自的作者改写(文件 mtime 在我读到它们之后又变过),把它们接进聚合前先
等其字节稳定,否则聚合变红的究竟是真缺陷还是并发写入就分不清了;这一条留给聚合轮。


## 9. 第五段:预检曾经量的是"碰巧先返回的那一行"(2026-10-08 追加)

`preflight_bundle` 把状态库里的登记解析成"要量哪个文件"时用的是

```sql
SELECT art.path, art.sha256 FROM artifact art JOIN ... WHERE ... ORDER BY v.version_no DESC
```
然后 `fetchone()`。`ORDER BY` 只管版本号,**同一版本登记多个 artifact 时没有任何次序**——
而 `creative/asset_versions.create_version(artifacts=[...])` 明确允许一个版本登记多个产物。
于是"这次交付的预检结论"其实取决于 SQLite 恰好先给哪一行。

这不是我推测出来的:反证脚本(`.project-local/tmp/falsify_preflight_artifact_scope.py`)把
查询退回原样之后,新增用例 `test_a_preview_registered_before_the_deliverable_does_not_become_the_verdict`
立刻变红——它按 `[preview, deliverable]` 的顺序登记两个产物,旧代码量了 **preview** 并把结论
当作整次交付。改法:`WHERE` 里显式取该资产 ACTIVE 中的最大 `version_no`(与 §8 里评审清单同一条
规则),`ORDER BY CASE art.role WHEN 'deliverable' THEN 0 ELSE 1 END, art.path, art.artifact_id`
把次序写死;同版本还登记着却没被量的字节,追加一条 `artifact-scope` 的 `NOT_MEASURED` finding
并**重新聚合** verdict —— `run_preflight` 里的聚合规则抽成 `_aggregate`/`_recount`,两处共用一个实现,
避免以后又长出第二个"结论怎么算"。

有一条必须说清楚,不然这条记录就是在给自己贴金:`test_a_newer_revision_is_preflighted_instead_of_the_one_it_replaced`
在旧查询下**仍然是绿的**——旧的 `ORDER BY v.version_no DESC` 本来就把改版取对了,所以这条用例
不是缺陷证明,它只是把"预检当前交付物"钉成契约。真正被反证出来的缺陷只有一个:同一版本内的产物选择。

33 条用例通过(29 原有 + 4 新增),两段变异都在指名用例上以断言失败变红、还原后回到 33 绿;
`verify_artifact_preflight_contract` / `verify_production_preflight` / `verify_state_vocabularies` /
`verify_route_payload_contracts` 四道门同批通过(新 finding 的 `NOT_MEASURED` 属于已声明词表,
没有引入界面可以说而服务发不出的词)。


## 10. 第六段:没人问过的 rights 门,不能写成"正在等答复"(2026-10-08 追加)

`creative/approval.py` 的投影把两件事用同一个词说:

```python
STATES = ("PENDING", "APPROVED", "REJECTED", "REVERSED")
def _projection_state(record):
    if record is None:
        return "PENDING"      # <- 从来没有提交过任何请求
```
`record is None` 是"这个门根本没被打开过",而 `PENDING` 的意思是"已经有人被问、正等人答复"。
RIGHTS 门最常见的真实状态恰恰是前者,于是它读起来像后者——交付前检查会以为审查正在进行,
而实际上没有一个人被要求看过许可证。这违反项目自己写在案的一条规则:**缺席的审查必须停在
NOT_REVIEWED,不能被措辞成已经在流程里**(`interop/delivery_receipt.py` 也正是这样把
`NOT_REVIEWED` 映射成 `NOT_RUN` 的)。

改法是加一个词并把两件事分开,而不是把 `PENDING` 说轻一点:
`NOT_REVIEWED`(没有任何记录 / 该请求已被替代 SUPERSEDED)与
`PENDING`(PROPOSED,已提交、等人答复)。`granted` 仍然只在 `state == "APPROVED"` 为真,
`require_approval` 的失败分支一个字都没动——所以这次改的只是"没做"要说成"没做"。

反证两头都要(`.project-local/tmp/falsify_approval_vocabulary.py`):
把 `None` 改回 `PENDING` → 未触碰门与门清单两条用例红;
把 `PROPOSED` 改成 `NOT_REVIEWED` → "问了才叫待答复"与清单用例红。
42 条用例通过(改动前这两个模块共 40 条:其中断言 `PENDING` 的那条被替换成 3 条语义正确的用例,
`test_an_untouched_gate_reports_not_reviewed_and_still_blocks` 保留了原有的阻断断言);
两次变异都在还原后回到 42 绿。

还没闭合的(如实标注,不假装做完):rights 目前只有这条**审批投影**,仍然
**没有** `rights` 状态表、没有 `/api/.../rights` 路由、没有界面面板、
`design-lab/schemas/contracts/rights-decision.schema.json` 在
`contract-bindings.json` 里仍是 `INERT`(74 个主体的 `config/rights-registry.json` 没有任何
`src/` 代码读取,`assurance/handoff_readiness._rights_gates` 会算裁决但**零个产品调用方**)。
把这条链按 Human Jury 的形状补齐(裁决器 → 只追加表 + 迁移登记 → HTTP 门面与路由 → 面板 →
词表声明 → 反证)是下一步,并且界面一旦要说 `APPROVED`,`state-vocabularies.json` 必须先有一个
真能发出该词的来源——否则 `verify_state_vocabularies.py` 会正确地把它判成界面谎。

> **2026-10-08 追正(提交 `747c14c5` + `4d0910df`,按 HEAD 复核过才写)**:上面这段里
> 除“界面面板”以外都过期了。现已存在:`assurance/rights_ledger.py`(契约从磁盘读取、
> 版本双向比对、封闭的拒绝码表)、`design-lab-state-rights-v1.sql` 的只追加表与
> UPDATE/DELETE 触发器、`rights_review.py` 门面 + GET/POST 两条路由(`http_service.py:301,412`)、
> `rights` CLI 动词、`state-vocabularies.json` 的 `rights` 词表(带真实 `sources`),
> 账本里 `rights-decision.schema.json` 已由 INERT 转 BINDING(带实例与测试行号)。
> 仍未闭合的三条,逐条按 HEAD 验证过:①**界面面板还没有**(任务 #16 正在做);
> ②`config/rights-registry.json` 的 74 个主体仍然没有任何 `src/` 读取者;
> ③`handoff_readiness._rights_gates` 仍然零个产品调用方(只剩注释里的提及)。
> ②③是“数据与一个会算裁决的函数都在,但没人把它们接到链上”,不是措辞问题;
> 把它们接进裁决流程需要 owner 对“什么算一个需要裁决的主体清单”给出判据,
> 我不会用一次自动读取替这个判断做主。


## 11. 本波次提交清单与仍未闭合的口(2026-10-08)

<!-- WAVE COMMITS:BEGIN -->
本波次落仓的提交(43 个,`fc03a303`..`14269a36`,由 `git log --reverse --format=%h %s` 直接生成,不手抄):

| 提交 | 说明 |
|---|---|
| `7ee682d9` | fix(runtime): snapshot the state database, and stage what a restore installs |
| `707c067b` | chore(reports): rebind the projections to the backup inputs they describe |
| `701ace9c` | fix(runtime): make a backup prove no production writer moved |
| `71a5e974` | docs(audit): record the backup fixes, and name the new stale artefact instead of hiding it |
| `b713bf3e` | chore(ledger): bind the backup-consistency evidence to the run that proves it |
| `10bf16a3` | feat(runtime): the official launch connects its own page, and the library ships its inputs |
| `1b928576` | fix(workbench): the landing view stops being a second shell, and the bundle follows |
| `5cc5380e` | Revert "fix(workbench): the landing view stops being a second shell" -- D-6 is the owner's call |
| `dcc27769` | test(launch): read the token through the handshake, so the tests cannot keep the leak alive |
| `9c208c78` | test(evidence): name the third stale artefact the launcher change produced |
| `c78ff19b` | test(evidence): compare the drift set without depending on record order |
| `3fb13115` | fix(test): repair the syntax error committed in c78ff19b |
| `e84aabf9` | fix(workbench): stop offering delivery formats the bundle writer cannot produce |
| `0c36669f` | feat(assurance): make a Human Jury verdict storable, serveable and readable back |
| `c2e74aac` | feat(workbench): a reviewer can read and sign jury verdicts from the preflight page |
| `d74e7c41` | feat(assurance): artifact preflight that measures what it can and admits the rest |
| `a8e0c67c` | fix(governance): read a wheel by member name instead of decoding it as text |
| `d5192069` | fix(workbench): the jury rows are a real list, and 交付中心 can preflight a delivery |
| `edf0c85a` | fix(native): a cancel the host never acknowledged stops disappearing into a success |
| `a91d6a27` | feat(governance): check a record's subject bytes against the commit it claims to bind |
| `ed6d84f0` | fix(assurance): a jury proposal is checked against the contract, not just its key set |
| `775eff60` | fix(governance): a second verdict emitter, declared -- and the gate that never had a test |
| `894c526a` | feat(design-system): a token document can now be written, versioned, read back and seen |
| `29c97c3d` | fix(runtime): a restored project rebases its publication journal, and cannot claim clean otherwise |
| `1ea64bbe` | fix(assurance): the preflight payload gets a schema, and the claimed drift was a false positive |
| `23bb997a` | fix(runtime): commit the writer-fence assertion the token append already calls |
| `fa69afc0` | feat(runtime): recovery decisions and delivery receipts are now reachable, not just callable |
| `fda18e93` | test(recovery): make the journal fixtures survive a deeper checkout |
| `27624963` | docs(audit): record the nine-link verdict, and which audit claims did not survive checking |
| `faedcc27` | feat(runtime): the writer journal can be read back, so it becomes an audit trail |
| `17a770a9` | feat(domains): 设计领域 reads the packs that are actually on disk |
| `fa5db57d` | feat(governance): name which contract schemas the product actually honours -- one of 32 |
| `181ce73a` | fix(launch): the official workbench command was serializing its own argparse object |
| `3d12c3f7` | docs(audit): entry-point death, a write-only journal, a fake install proof, and 31 of 32 inert contracts |
| `de9601ed` | fix(jury): one signature no longer stands for the whole project |
| `a587f339` | chore(verify): the preflight contract gate had no caller, and my doc pinned a stale count |
| `47aa7d01` | fix(verify): the aggregate gained a registration before the verifier existed |
| `87524737` | fix(preflight): the registered delivery is now measured, not whichever row came first |
| `76fa17b0` | fix(rights): a gate nobody opened no longer reads as one awaiting an answer |
| `88ea30c1` | feat(governance): five route payloads gain schemas written from live captures, and both gates get callers |
| `0cb1397b` | feat(evidence): the delivery receipt is readable over HTTP, and 证据系统 reads it back |
| `5b8e7d51` | feat(quality): a sealed QualityRecord is stored, readable and reachable from the CLI |
| `14269a36` | feat(workbench): 已接受 now states its denominator on screen |
<!-- WAVE COMMITS:END -->

仍未闭合,按"能不能由我自己关掉"分开列:

**我这边继续做的:**
- ~~rights 链:裁决器 → 只追加表 + 迁移登记 → HTTP 门面与路由 → `rights` CLI → 词表声明 →
  `contract-bindings` 行由 INERT 转 BOUND → 界面面板 → 反证(§10 末的清单)~~ —— 除**界面面板**
  外已在 `747c14c5`/`4d0910df` 闭合;逐条按 HEAD 复核的追正见 §10 末。
- ResearchFinding / MethodCard 仍无端到端持久化与读回。
- 聚合清单现在 62 项(本波注册 5 处:artifact preflight 合同、ledger schema 配对、
  contract bindings、route payload、current-version 约定);所有新门都要在最终 HEAD 上随聚合与绑定运行再跑一遍。
- 绑定运行的证据追加 + `reports/current/*` 投影再生成(`--check` 目前报 DRIFT,因为本波
  新增了测试模块与门)。

**必须由人或外部条件闭合的(BLOCKED,不伪造):**
- 真实宿主 E3(Photoshop / Illustrator 实拍读回):需要 owner 明确授权去操作正在使用的宿主文档。
- 真人 Jury E4:需要真人签署;我不会代签或伪造 attestation。
- 发布 E5:需要 release 与 exact-SHA CI 上下文;推送与发布按授权逐次判断。
- D-6:落地工作台与主壳统一 —— `apps/workbench/shell.ts` 的 `.app-nav` 几何门钉住了现状,
  这是两个壳的合同问题,不是顺手能改的样式。
- 本地浏览器门会**按名跳过**(`test_workbench_ui_audit_gate` 需要 bundle 与 HEAD 一致且需要
  playwright)。跳过记为跳过,不算覆盖;绑定运行里 `skipped=0` 只在非浏览器集合上成立。


## 12. 第七段:同一个缺陷今天犯了四次,于是它变成一条门(2026-10-08 追加)

§8(评审清单给了废稿)、§9(预检量了碰巧先返回的行)、§10/5b8e7d51(一个主体替整个项目出证)
是同一个问题的四个面:**`publish_version` 从不降级被替换的字节,全仓没有任何生产代码把
`asset_version.state` 写成 `SUPERSEDED`,所以 `state='ACTIVE'` 等于整条修订史。**
第四次是本轮扫描时新抓到的:`image_assets._read` 也只筛 `state='ACTIVE'`,于是
- `list()` 把同一个 raster 资产按修订次数重复列出(**实测**:去掉规则后新用例就在这条断言上红);
- `content()` 要求 `len(rows) == 1`,否则 `raise ImageAssetError(404, 'ASSET_NOT_FOUND')`
  —— 一个存在的资产没有确定的读取结果(**这是读代码得到的事实**,不是我测到的现象,
  因为同一用例里前面的重复断言先失败)。

产品其他位置早已按"`version_no` 最大的 ACTIVE 行 = 当前版本"来读(`native_assets.list` 两处、
`asset_store.current_version`),所以修法不是发明新约定,而是**把已有约定写成必须说出来的话**:

`design-lab/scripts/verify_current_version_rule.py` 用 AST 取每个模块里的字符串常量,找出同时含
`asset_version` 与 `state='ACTIVE'` 的 SQL,要求**同一条语句**里出现
`MAX(<别名>.version_no)` 或 `ORDER BY <别名>.version_no DESC`,或者它本就钉在某一个
`version_id = ?` / `sha256 = ?` 上(重发布同一次字节不需要回答"哪个是当前版本")。
它拒绝的是谎,不是数字:新增一个合规读取器不会动任何计数;扫描到零条语句判 FAIL(空扫描和干净
树不能共用一个结论);豁免表若指向已经不存在的语句判 `STALE_EXEMPTION`。

实测 11 条 ACTIVE 读取:`RULED=8 / PINNED=3 / UNRULED=0`。`test_current_version_rule.py` 8 条
用例用**合成夹具**逐条打出各分支(合规两类、两种钉法、裸 ACTIVE 必须点名 `UNRULED: offender.py`、
空目录、不存在的目录、失效豁免),另外两条真的断言"活树干净"和"这条门已在聚合清单里"
—— 一条没人调用的门只是文档。门已注册,聚合现为 62 项;`test_gate_reachability` 4 条仍绿。


## 13. 第八段:同一约定还有两处没人测过的读取,这次是实测到的(2026-10-08 追加)

§12 的门只保证"语句里说了哪个版本是当前版本",它不检查**一个资产登记多个文件**的情形。
顺着这条线又找到两处同类读取,而且 `NativeAssets.list` / `Bundles.list` / `verify()`
**过去没有任何测试**(仓里只剩 `test_bundles_list.py` 的 `__pycache__` 残骸,源文件早已不在):

- 两处列表都 `JOIN artifact`,于是一个资产登记了 preview 就在清单里出现两次;
- `verify()` 与 `content()` 一样要求 `len(rows) == 1`,否则 `NATIVE_ASSET_NOT_FOUND`。

区别是这次缺陷是**测出来的**,不是读出来的:
`.project-local/tmp/falsify_native_listing_rows.py` 把新增的"取 deliverable、按 role 再按 path
的唯一 artifact 子查询"删掉之后,`test_verify_still_answers_for_an_asset_that_registered_a_preview`
以产品自己抛的 `ImageAssetError(404)` 变红 —— 一个就在磁盘上的资产回答"不存在";清单重复那条同批变红。

修法是同一句约定:`f.artifact_id = (SELECT g.artifact_id FROM artifact g WHERE g.version_id =
v.version_id ORDER BY CASE g.role WHEN 'deliverable' THEN 0 ELSE 1 END, g.path LIMIT 1)`。
预览文件的**名字故意排在 `native.psd` 之前**,所以只按 path 排序的写法会送错字节。
5 条新用例通过(含"未知资产仍按正确理由 404",防止修复把"没有行"偷换成"成功");
`verify_current_version_rule` 仍 `OK statements=11 RULED=8 PINNED=3 UNRULED=0`。

两条反证脚本自己也各修了一次分类错误,记下来是因为它们都会伪装成"门有效":
1. 我原先把"以 ERROR 变红"一律当成可疑(纪律是"断言失败而不是 ERROR 才算感到"),但这里 ERROR
   恰是产品自己抛的 404。把 SyntaxError/ImportError/sqlite 错误与产品异常分开之后判定才正确。
2. `falsify_acceptance_denominator_ui.py` 第一次跑出两个假"感到",因为它只改 `shell.ts`,而
   appshell 门在 vm 里执行的是 `build/main.js`(源码只在另一段里被 grep)。它现在先 `vite build`,
   构建失败就拒绝跑门。

顺着这条约定还查到第三处:`NativeDelivery.content()` 虽然钉住了 `v.version_id=?`,但它同样
`JOIN artifact` 并要求 `len(rows) == 1`,所以一个登记了预览文件的交付包**下载时回答
`404 BUNDLE_NOT_FOUND`** —— 这次不是读出来的,是删掉子查询后由产品自己抛出来实测到的
(`.project-local/tmp/falsify_bundle_content_row.py`)。修法与上面同一句约定。
`RECEIPT_QUERY` 里的 `JOIN artifact` 则是有意为之(用连接当"该版本确实发布过产物"的过滤条件),
读取用 `fetchone`,重复行不改变结论,因此不动它 —— 记录在此是为了让下一个人不必再猜。
46 条 delivery 范围用例通过。


## 14. 第九段:备份的"没有人在写"证明,看不见人工签署(2026-10-08 追加)

`project_backup.py` 的静默证明由两部分组成:活动查询(租约、未完成 attempt、宿主守卫)
加 `COUNTER_QUERIES`(只增计数器的前后对比,用来抓"在抓取窗口里开始并完成"的写入)。
但 **`jury_record` 与 `quality_record` 都不取写租约** —— `jury_store.record()` /
`quality_store.record()` 直接 commit —— 也不在任何活动查询里。于是:一次人在页面上签裁决的
动作正好落在备份窗口内时,前后两次读取的活动集合仍然为空,归档照样写着
`productionQuiescence=PROVED_QUIESCENT`,而那份签名**不在这个包里**。
这是"用一次证明掩盖另一类写入",与 §5.4 那个"取消未确认却报成功"是同族。

修法是把这两张表加进计数器集合(缺表时 `_read_activity` 本来就跳过,所以对旧库安全),
并让用例真的在窗口里签一条:`_database_snapshot` 被包住,签名落在前后两次读取之间,
`create_backup` 必须以 `moved during the backup window` 拒绝,且**不留半成品归档**。
反证:删掉这两行计数器,用例立刻在"备份没在看的表,就看不见它动"这条断言上红
(`.project-local/tmp/falsify_backup_watches_human_records.py`),还原后 43 条绿
(其中 1 条是本仓既有的按名跳过,不是本次新增)。

同一族里我此刻**不**动的两处,理由是它们不是谎而是设计选择:`RECEIPT_QUERY` 的 artifact 连接
是故意的 EXISTS 过滤并用 `fetchone` 读取(重复行不改变结论);
`delivery_receipt_v1` 有租约与代际围栏保护,已经在活动查询覆盖范围内。
rights 表落地之后必须同样进入计数器 —— 该要求已写进任务 #10 的验收条件,不是事后追认。


## 15. 第十段:"没有人在写"这句证明,覆盖面原本是猜的(2026-10-08 追加)

§14 修完两张表之后,把这条覆盖问题一次量清楚:用大小写不敏感、覆盖
`INSERT / INSERT OR REPLACE / INSERT OR IGNORE …` 全部拼法的正则,从 `src/design_lab/**` 抽出
**产品真的会写的状态表**,再与 `project_backup.py` 里出现过的表名相减。测得 18 张状态表、
14 张有产品写入路径,其中 8 张当时不在证明的视野里:
`project / asset / approval / audit_event / job / job_attempt / operation_intent / rights_decision`
(每张都带写入者文件名归属,不是我看着表名猜的)。

这些表全部不持写租约,却都会被产品直接 commit。也就是说 `PROVED_QUIESCENT` 这句话覆盖的
只是它列出的那些表,其余表在备份窗口里怎么动它都不知道 —— 一句关于整个状态库的结论,实际
建立在一部分库的观察上。八张全部加入 `COUNTER_QUERIES`(缺表时 `_read_activity` 本来跳过,
对旧库安全)。

覆盖关系本身变成一条测试:`test_backup_watches_written_tables.py` 双向检查 ——
"有写入但没被计数"判红,"豁免表指向一张已经不写入的表"也判红,空推导判红
(断言 written ≥ 12,否则正则一坏全套断言就假绿)。两个方向都反证过:删掉一行计数器 →
盲表用例红;把计数器名字改成 `approvals` → 同一用例红(真实表变盲)。
还原后同批绿:覆盖 5 条 + 备份 43 条(1 条既有按名跳过)+ rights 58 条。


## 16. 追正:`8f0d4f98` 那条提交对反证的说法是错的

那条提交写"把 walk 指向不存在的目录 → 改前会打印 OK total=0,改后以空洞原因失败"。
**这句不成立**,它撞的其实是两条不同路径:

- `os.walk(ROOT / 'no-such-directory')` 会让 `onerror` 回调把
  `active directory unreadable: [WinError 3]` 追加进 `hits`,而 hits 非空在**今天之前就已经失败**
  —— 它证明的是既有规则,不是我新加的地板线;
- 真正证明新地板线的是另一个变异:计数器 `SCANNED['files'] += 1` 改成 `+= 0`,于是 hits 为空
  而 scanned=0,才打印出
  `IDENTITY_GATE=FAIL scanned=0 total=0 reason=the walk examined too few files to be a check at all`。

我第一版反证脚本在**打印阶段**被 cp936 控制台打断(`UnicodeEncodeError: 'gbk' codec can't encode
character '\u03f5'`),而我从残留输出里看到"它红了"就写了提交说明 —— 红了不等于为正确的理由红。
修好的脚本(`.project-local/tmp/falsify_identity_scan_liveness.py`)现在显式跑两条变异、各自断言
reason 文本、并 `sys.stdout.reconfigure(encoding='utf-8')` 防止打印把自己先杀掉:两条都感到,
还原后 `OK total=0 scanned=3012`。

并入既有纪律:**反证必须断言失败的原因字符串,不能只断言"变红了"**。这与
"退出码/包装状态不是证据"以及"探针自己也要被反证"是同一族。

同一批还登记了账本漂移的第四条(`0cb1397b` 改写了 `test_service_http.py`,由
`r5-bundle-list-route-http-ui-20260929` 绑定的字节比它描述的代码更旧):做法是把条目**连同理由**
加进那份精确清单,并把清单头注释从"只报 2/4 条"补成 4 条 —— 少报覆盖面与不报是同一类问题。
双向反证:漏登记会红;留着一条已经不再漂移的借口也会红。


## 17. 这份记录自己的引用也被量了一次(2026-10-08)

审计文档是别人最不会去复核的那份产物,所以对本波两份文档做了引用检查
(`.project-local/tmp/check_audit_citations.py`):凡**仓库根限定的完整路径**都必须存在于
HEAD(或 gitignored 工作证据根),带 `:行号` 的还必须落在该文件的行数之内 ——
指向一个 120 行文件的第 164 行,和指向一个被删掉的文件,是同一类谎。
严格规则下共 **20 条**可核引用,**0 条问题**。

我**没有**把它注册成门,理由写在这里而不是藏在心里:宽松版(连简写文件名一起匹配)在同一份文档上
报出 15 条,其中大多数不是路径主张而是
①简写(`project_backup.py`、`rights_review.py` 这类只写文件名的提法),
②合成夹具名(我在 §12 写的 `offender.py` 是反证脚本里临时造的模块),
③**故意陈述某文件不存在**(§13 里的 `test_bundles_list.py` 只剩 `__pycache__` 残骸)。
一条门的判断对象如果需要先配一份"哪些提及不是主张"的豁免表,豁免表就会变成新的谎源。
因此它现在是自查工具,不是 CI 断言;地板线设在 15(今天实测 20),只用来抓"匹配器哪天不匹配了",
不承诺任何清单数量。


## 18. 反证脚本自己的锚点,错了两次(2026-10-08 追加)

今天两次被自己的反证脚本误导,方向刚好相反,所以都值得记:

1. **假"感到"**(`8f0d4f98` 的原始说法):变异 `os.walk` 的根目录,红是红了,但红的原因是
   **既有的** `onerror→hits` 规则,不是我新加的地板线。见 §16。
2. **假"没感到"**(本轮):`falsify_domain_readback.py` 第二条想证明"检查器没跑就不给判定"
   这条断言有没有被钉住,锚点挑了 `entry["validation"] = NOT_CHECKED` 那一行。测试全绿,
   脚本于是报"该断言无人执行"。**这是错的**:checker 不可用那条路径在更早的地方就用
   `_pack_entry` 的默认字典(第 126 行 `"validation": NOT_CHECKED,`)构造并返回,
   根本走不到我改的那一行。把锚点换成默认值本身之后:
   `TEETH a pack whose checker was not run is given a verdict anyway -> FAILED (failures=2)`,
   两条诚实断言都有效,`both honesty claims are enforced`。

差别只在锚点是否落在**断言所走的那条路径**上。规则并入 §16 的那一条:反证不仅要断言失败的
原因字符串,还要先确认被改的行确实是该断言的执行路径 —— 否则一次错锚会同时制造
"已证明"和"无人证明"两种假结论,而后者更危险,因为它看起来像是在自我批评。

同批把 §7 遗留的"反证脚本只查阅未重跑"清掉了:`falsify_delivery_receipt_wiring.py` 在当前树上
重跑,**7/7 感到**,每条都带 ran==1 与指名原因。

我自己在这段里也写坏过一次测试:先加的"每个被计数的名字必须是状态表"其实是**错的断言** ——
`native_host_guard_v1` 声明在 `native_tasks.py` 里而非 `.sql`,`FROM sqlite_master` / `PRAGMA`
也会被我的名字正则捞进来,于是它把四五个合法名字报成"不存在的表"。它同时还是**空断言**:
我先把 watched 与状态表集合取过交集,再去断言交集里的名字都在状态表里。删掉它,理由是
"名字打错"这件事已经被盲表断言覆盖了(打错 = 真表变盲),不需要一个建立在错误前提上的额外检查。




