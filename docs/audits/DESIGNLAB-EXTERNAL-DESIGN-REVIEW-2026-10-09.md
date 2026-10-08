# DESIGN-LAB 外部 design-review runner 首跑与数字对账（2026-10-09）

证据等级：**E2 CONTROLLED_RUNTIME**。固定版本的第三方审计器在真实 Chromium 上跑本仓 committed
bundle，绑定 exact SHA 与产物哈希；不含宿主渲染，不含人工 Jury 判定，不构成 E3。

本轮要做的事只有一件：让"界面是否符合设计标准"这个问题第一次拿到**本仓之外**的读数，
并且把两边的分歧逐条落到规则上 —— 不挑对自己有利的那一个。

## 0. 运行绑定（可复核）

| 项 | 实测值 |
|---|---|
| 被测量提交 | `700ee3fbfe32c2f5e166d8034999d5d07df7694e`（工作区对其 clean） |
| 第三方工具 | `design-review` 插件 `0.1.0`（`~/.qoder-cn/plugins/cache/qoder-marketplace/`，**未 vendored 进仓**） |
| 其依赖（装在本仓 `.project-local/runs/node-libs`） | fast-glob 3.3.3 · yaml 2.9.1 · @axe-core/playwright 4.13.0 · axe-core 4.13.0 · @playwright/test 1.63.0 · playwright 1.63.0 |
| 浏览器 | chrome-headless-shell **v1243 = Chromium 153.0.8010.12**，落到 `.project-local/runs/pw-browsers`（114.6 MiB，本仓自装，未写系统缓存） |
| 被服务的界面 | `bundleOrigin=source`，`served_bundle_sha256=f5eff17ad21bfd2800fbc485f4c5ea1e061a29257c15937e685a7c77117af858` |
| 服务 | 产品自己的 `design_lab.http_service.make_server(ProjectService(synthetic), port=8931, local_session=True)` |
| 命令 | `python scripts/run_design_review_plugin.py`（debt + a11y）· `python scripts/design_debt_baseline.py --check` |
| 原始 JSON | `.project-local/runs/design-review/.design-qa/reports/{design-debt,a11y}.json`；运行台账 `.project-local/task-artifacts/design-review/plugin-run.json` |

复现前先绑 PATH：`D:\All projects\OS External Configuration\10-toolchains\scoop\apps\nodejs-lts\24.18.0`。

## 1. 先把 runner 跑起来：两个自证型缺陷

runner 之前"跑不起来"的原因不是网络，也不是缺工具，而是本仓自己写的两件东西：

1. `register.mjs` 是用 printf 拼的字符串，写到 `register('file:///D:/All` 就断了 —— 路径里的空格
   需要的是 percent-encoding，而 encoding 应由 `pathToFileURL()` 生成，不该由手拼生成。
   现在它自己用 `pathToFileURL(join(here,'resolver.mjs')).href`。
2. 修好第一处后仍失败，但报错换了个人：`import { chromium } from '@playwright/test'` 抛
   `Named export 'chromium' not found`。根因在解析钩子：`createRequire().resolve()` 走的是
   **require 条件**，返回 CJS `index.js`，而 playwright 的具名导出是运行期动态挂的，
   `cjs-module-lexer` 看不见。改为把裸标识符交回 Node 自己的解析器
   （`next(spec, {...ctx, parentURL: import.meta.url})`，parent 落在 node-libs 内），
   `exports` 表的 `import` 条件被命中，具名导出就成立了。
3. 顺带一条与本机事实有关的更正：`C:\Users\ALEX\scoop` 是指向
   `D:\All projects\OS configuration\toolchains\scoop` 的 junction，而那个目标目录已不存在，
   所以 npm 默认缓存 `mkdir 'C:\Users\ALEX\scoop'` 报 `ENOTDIR`。缓存根必须显式指到可写处；
   这是机器事实，不改任何工具配置。

另有一条版本陷阱值得写下来：`npm install @playwright/test@1.63.0` 把 `playwright-core` 顶层提升成了
**1.64.0**，而运行期真正生效的是 `playwright@1.63.0` 自带的那份，它要的 build 是 **1243**。
用顶层 1.64.0 的 CLI 去 `install`，下载的是 1248 —— 装完照样启动失败。判定"要哪个 build"必须问
**运行期解析到的那个 core 的 `browsers.json`**，不能问最外层那个。本机 `ms-playwright` 缓存里只有
1208/1228，所以本仓自己下载 1243 进 `.project-local`，而不是拿别的 build 冒充（仓内自有 e2e 门是显式
传 `executablePath` 才用 1228 的，那是另一条路径）。

## 2. 设计债：同一批字节上的三套数字

| 断言 | §36.4 手点（旧） | 外部插件 | 本仓规则（`design_debt_baseline.py`） | 对插件的独立复算 |
|---|---|---|---|---|
| 字面色值 | 18 | 44（hex 28 + functional 16） | **34** | 44（逐格相等） |
| 字面 px | 360 | 602 | **516** | 602（逐格相等） |
| 阴影 | 9「未走令牌」 | 26（`box-shadow:` 全部） | **26 条，其中 18 条已读 var()** → 8 条未走 | 26 |
| Tailwind 任意值 | 未量 | 2 | 不适用（本项目无 Tailwind） | 2 |
| 扫描面 | 只有 style.css 且整块删 `:root` | 8 个文件逐匹配 | 7 个界面源文件逐匹配、删注释、跳令牌声明行 | 同插件 |

三点结论，各自有据：

- **插件的算术可信，语义不可全信。**我用另一套实现（不同正则、不同宿主语言）复算了它的
  674 条 finding，按 (文件 × 类型) 分格比对：**差异格 0**。所以它没有算错。
  但它把注释里的 `13px / 20.15px / #316CFF` 也算成债（px 差 86 处、色差 10 处），
  注释不是样式决策；它的 `tailwind-arbitrary-value` 正则
  `[A-Za-z0-9_:/-]+-\[[^\]]+\]` 撞上的是 TS 正则字符类
  `/bundles/bundle-native-[0-9a-f]`、`/versions/v-[0-9a-f]`（workbench.ts:302），
  **真实 Tailwind 存量是 0，不是 2**。
- **旧存量是手点的，任何规则都复现不出来。**`18` 与「删掉整个 `:root` 后 style.css 的字面色」
  对不上（那条口径是 41 处，去掉 `#fff/#000` 是 26）；`360` 最接近的是同一口径下的
  **按行**计数 345，而不是按匹配 560；`9` 读起来像"未走令牌的阴影"，该口径现值是 **8**
  （26 条 `box-shadow` 里 18 条读 `var()`），而这 8 条里还有 1 条是 `box-shadow:none`
  —— 那是**重置**不是取值债，两边都会把它算成债。真字面阴影债是 7 条。
  契约要当验收标准，就不能留这种数：现在 §4 那句话由脚本产出，
  `design-lab/tests/test_design_debt_baseline.py` 看守"文档说的 = 量出来的"，
  并且带正控制（注释剥离与令牌跳过必须真的让数字变小，否则测试红）。
- **单位不同不是分歧，口径不同才是。**插件按匹配计数、含注释、含 `vite.config.ts`（其贡献为 0）；
  本仓按匹配计数、去注释、只算 7 个界面源文件。两边都写在文档里，谁也不替代谁。

色值这条真正要治的东西，插件和本仓看法一致：44 处色面 finding 里只有 **8 处**是"复述了
`:root` 已声明的令牌"（其中 **3 处是 `#316CFF` 本身**，即 `--color-primary` 被重新打字了一遍），
剩下 **36 处是契约不认识的 off-palette 色**，头部就是契约 §3 点名的"差不多蓝"：
`#1D4FC4`×5、`#2A63D8`×4、`#2563eb`、`#3c8aff`、`rgb(37,88,219)`，外加一组状态色影子
`#c03030 / #8f2a2a / #27c86a / #11a74d / #f2b541 / #c98c00 / #f87171 / #ee5f5f`。
清理顺序因此明确：先消灭 3 处主色字面量，再收"差不多蓝"。

## 3. 可访问性：0 violation 不等于已验证

插件的 `audit-a11y.mjs` 扫了 design.qa.yaml 里的 16 屏（12 路由 ×1440×900 + 4 屏 390×844，
`reducedMotion: reduce`），产出 **16 scans / 0 findings / ok=true**。

这个"0"如果不加限定就是造假，所以我用自己的探针（同一服务、同一 bundle、同一 build、同一版 axe）
把它丢掉的那一半读回来：

| 屏 | axe 判定的 contrast 节点 | **未判定（incomplete）** | 未判定原因（axe 原话） |
|---|---|---|---|
| workbench | 28 | 71 | `background color could not be determined due to a pseudo element` |
| dashboard | 22 | 55 | `... due to a background gradient` |
| projects | 22 | 35 | `... due to a background gradient` |
| settings | 22 | 36 | `... due to a background gradient` |
| evidence @390 | 22 | 9 | `... because it is overlapped by another element` |

即：**每屏有 9–71 个文本节点 axe 根本没评**，而它评的部分没有违规。对比度在本仓只能由
`design-lab/tests/e2e/audit_workbench_contrast.mjs`（自己按 used-value 上溯背景）负责 ——
这也正是 DESIGN.md §3.1 那条 4.45:1 红线的来源。把 axe 的 `ok=true` 当"对比度已验证"就是
本仓最忌讳的那类假绿。

两条新覆盖（本仓自有门不回答的问题）：

- `aria-allowed-role` 对 `#drawer` **每屏未判定 1 处**：`aside.drawer#drawer role="dialog" aria-modal="false"`
  （shell.ts:5138）。`aside` 的隐式角色是 `complementary`，HTML-AAM 不允许它直接改挂 `dialog`，
  而它同时又不是模态的。仓内已有守卫只查抽屉的**行为与几何**
  （`audit_workbench_ui.mjs` 的 `nav-drawer`：起始 `aria-expanded=false`、关闭态可达项数、开启态；
  `test_workbench_sidebar_pinning.py` 的 `position:fixed`），**没有任何一处检查角色合法性** ——
  这是一块真实盲区，不是一个新阈值。改法有两种（`<div role="dialog">` 或保留 landmark 去掉 role），
  属界面决策，本轮只落档不擅改。
- `skip-link` 未判定 1 处：`Skip link target should become visible on activation` —— 探针不激活链接，
  所以 axe 只能说"没看"。本仓的键盘可达性门覆盖的是焦点顺序，不覆盖"激活后目标是否可见"。

同时，扫描确实量到了认证后的界面而不是登录墙：每屏 `#login` 不可见、`#route-view` 存在、
313–380 个元素、`#connection` 徽标为 `本机已连接`。这条证明是本轮自己要求的，因为插件只会
`goto + waitForSelector`，不会打字。

## 4. 与仓内已提交产物的对照（含一处口径警告）

`docs/UI-CONVERGENCE-20260930/ui-audit/report.json`（本仓自有 UI 门的 committed 产物）：
`ok=true`、`violations=0`、65 项 metric、5 个宽度 × 12 路由 + 冷启动/断连态。
**它绑的是 `05d6d761`，不是本轮的 `700ee3fb`** —— 拿一份别的提交的已存产物当"当前状态"是本仓
反复犯过的错，这里只做方法学对照，不当复验。

两侧范围也不同，且这解释了为什么两边都是 0：本仓门会先创建一个真实项目再测（有数据的视图），
外部插件只做导航（认证后空态视图）。两种状态都值得测，本轮补上的是后者。

## 5. 本轮落进仓里的东西

- `design.qa.yaml`（根，插件原生入口）：扫描面、16 屏、输出目录、debt 阈值；端口写死并在被占时拒绝运行。
- `scripts/run_design_review_plugin.py`：驱动两个审计器；缺 node/插件/钩子/端口占用一律
  `DESIGN_REVIEW_BLOCKED` 退出 3，绝不静默少测；bundle 与 HEAD 有差异时拒绝测量。
  它是测量工具，**不是 CI 门**（未接入聚合，避免把外部工具的口径变化变成仓内红灯）。
- `scripts/design_debt_baseline.py` + `design-lab/tests/test_design_debt_baseline.py`：
  契约存量数字的产出者与看守者（含"排除项必须真的有效"的正控制）。
- `DESIGN.md`：frontmatter 补 `externalRunner` 与 `measuredDebtBy/AtCommit`；§4 存量改为规则产出句；
  §6 更正"runner 仍没跑起来"的旧陈述，并把分歧去处写明。
- `docs/INDEX.md` §6：新增三条放置约定（契约存量数字、外部工具的入仓面、其产物不入仓）。

本轮跑过的判定（均为实测产物）：
`VERIFY_DESIGN_LAB=OK total=69 failed=0`；
`BOUND_TEST_RUN=OK tests=4 failures=0 errors=0 skipped=0`（`--modules test_design_debt_baseline`）；
`--modules test_gate_reachability … OK`（新增脚本未成为孤儿门）；
`REPO_CLASSIFICATION=OK`＋`DRIFT_NOTICE`（工作区 60.22→60.27 MiB，提交后需重绑投影）；
CI `700ee3fb`：Python gate / strict-TS / Authority / DeepSeek chain / wheel+launch / MiniGame /
Open Design / generated-artifact **全部 success**，仅 2 个**产物上传步骤**红
（`License & secret hygiene gate :: Upload secret history report`、
`Workbench browser E2E :: Upload E2 evidence artifact`），原因是 GitHub Actions
**artifact 存储配额已用满**，属 owner 侧清理项，不是测量失败。

## 6. 仍未闭口（不代签、不代决策）

1. **owner 裁决**：DESIGN.md 主色 `#316CFF` 红线（改色 vs 改用法）、2 份 sidecar 签字、
   3 个 REQUESTED 包、投影是否继续嵌 run_id。
2. **owner 侧运维**：Actions artifact 配额（删除远端产物不属我的授权范围）。
3. 新落档的可治项：3 处主色字面量改 `var(--color-primary)`（需重建并提交 bundle，走 Build Output Truth）；
   36 处 off-palette 色按 §2 顺序收；`#drawer` 的角色合法性；
   对比度仍只有本仓一处证据，axe 无法接手。
4. 界面对标（Figma/Blender/Illustrator/Linear/Raycast 真实参考屏 + CSS/DOM 双层比对）本轮**未做**，
   它是 design.qa.yaml 之外的另一件事。
