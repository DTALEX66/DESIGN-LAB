# DESIGN-LAB UI 商业级 Workbench — 截图验收（Playwright 真实浏览器）
任务包：DESIGN-LAB_UI_FRONTEND_TASKPACK_20260930 · 分支 feat/ui-commercial-workbench-20260930

> 本文件此前（commit `0fbb674`）声明「12 张截图已生成 / 真实渲染 / hash 已记录」，
> 但仓库内不存在任何 PNG，表格数值全是占位符。该声明为**假完成**，与
> `VISUAL_QA.md`（DEFERRED）、`COMPLETION_REPORT.md`（待办）互相矛盾。
> 2026-10-05 已按方案 A 修复：真实执行截图并把结果写回本文件。
> 修订记录见 `MERGE_READY_HANDOFF.md` 的 Evidence Truth Repair 段。
>
> 2026-10-06：界面多维审计修复批次（见 `UI-AUDIT-20261006.md`）改变了视觉结果，
> 本组 40 张截图已在新 commit 上**整轮重拍**并重建本文件的表格与环境块；
> 表格与 `screenshot-manifest.json` 由脚本从清单生成，不手抄哈希。

## 复现命令

```
.venv/Scripts/python.exe scripts/capture_workbench_screenshots.py \
    --widths 390,768,1280,1920,2560
```

启动器（`scripts/capture_workbench_screenshots.py`）会：
1. 探测 node / 仓内 Playwright / 本机 Chromium，缺一即 `CAP_BLOCKED` 退出，不伪造；
2. 先断言 `apps/workbench/build` 与 HEAD 无 drift（Build Output Truth），
   否则拒绝截图——截图必须是某个 exact commit 的证据，不能是未提交的本地重建；
3. 用真实 `ProjectService` + `make_server` 在 OS 分配端口上起回环服务，
   临时项目根 + 内存 64-hex token（与既有浏览器 E2E 同一合同）；
4. 交驱动 `design-lab/tests/e2e/capture_workbench_screenshots.mjs` 在真实
   Chromium 内**通过 UI 写入**数据，再逐页截图并计算 SHA-256。

## 方法（实际执行值）

- 页面：`http://127.0.0.1:<port>/workbench`（真实服务，CSP `script-src 'self';
  style-src 'self'`，classic-script `build/main.js`，零外部依赖）。
- 数据：驱动在 UI 内新建项目 → 导入真实参考图
  （`design-lab/evals/reconstruction/cases/poster-sunrise-001/reference.png`，
  192×128 PNG，非 1×1 占位）→ 持久化简报 → 立方向 → 选定方向 → 绑定设计系统。
  所有面板内容均为服务读回，**无 mock、无预填 DOM、无占位图**。
- 视口：390×844 / 768×1024 / 1280×800 / 1920×1080 / 2560×1440，共 5 档。
- 页面：`#/dashboard`、`#/projects`、`#/projects/:id`、`#/tools`、
  `#/deliverables`、`#/evidence`、`#/preflight`、`#/settings`，共 8 页。
- 每页截图前等待 KPI count-up 稳定（`strong[data-count]` 文本 == 目标值）后才拍，
  避免把动画中间帧的错误数字写进证据。
- 驱动对 `pageerror` / `console.error` fail-closed：任一出现即整轮判失败。
  本轮 40 张全部零诊断错误。

## 环境（读自 `screenshot/screenshot-manifest.json`）

```json
{
  "generatedAt": "2026-10-06T08:34:13.833Z",
  "commit": "0c0922335403e31d2eb5e9561e9d63c3032018d8",
  "subject": {
    "bundle": "apps\\workbench\\build\\main.js",
    "bundleBytes": 163948,
    "bundleSha256": "34809d680775380c7afe4b72d2710454e667bbbcd7abaab71652791b0c7c6b79"
  },
  "project": {
    "name": "Closeout 1791275629314",
    "id": "205b2a083d3c4be7b7ac1b0289cc8e1a"
  },
  "referenceSourceImage": "D:\\All projects\\DESIGN-LAB\\design-lab\\evals\\reconstruction\\cases\\poster-sunrise-001\\reference.png",
  "service": {
    "origin": "http://127.0.0.1:50596",
    "pythonVersion": "3.12.13"
  },
  "browser": {
    "engine": "chromium",
    "version": "149.0.7827.55",
    "executable": "C:\\Users\\ALEX\\AppData\\Local\\ms-playwright\\chromium-1228\\chrome-win64\\chrome.exe",
    "headless": true
  },
  "nodeVersion": "v24.18.0",
  "capture": {
    "fullPage": false,
    "mockUsed": false,
    "viewports": [
      390,
      768,
      1280,
      1920,
      2560
    ],
    "pages": [
      "dashboard",
      "projects",
      "project-detail",
      "creative-tools",
      "deliverables",
      "evidence",
      "preflight",
      "settings"
    ]
  }
}
```

## 截图结果（40 张，全部存在于 `screenshot/`）

| 文件 | 视口 | 路由 | 字节 | SHA-256 |
|---|---|---|---|---|
| `00-dashboard@390.png` | 390×844 | `#/dashboard` | 76,186 | `a5d400b52258216c630cddb5fce2d04dc99183d3bf3d5b94b7073fbf172cd395` |
| `01-projects@390.png` | 390×844 | `#/projects` | 65,546 | `cd216ebfe9bed82abf0b1cee26554fc9b495a040dfd58305611c75e60c83f37e` |
| `02-project-detail@390.png` | 390×844 | `#/projects/205b2a083d3c4be7b7ac1b0289cc8e1a` | 62,993 | `f716481549e2e55f27d6118c30a36b0dad6403a686266cde8812b5eab7afc085` |
| `03-creative-tools@390.png` | 390×844 | `#/tools` | 39,179 | `3779a93e02d74450dbb5500449470657feb78eb6428fc8884cae079331a83a8c` |
| `04-deliverables@390.png` | 390×844 | `#/deliverables` | 39,825 | `a4e72f8596bdf1ca3d844e18b063541f678fe2086849c410ee4872c87b592cda` |
| `05-evidence@390.png` | 390×844 | `#/evidence` | 40,998 | `4c989d14f750ea60ceb42660e79306ac1494a28c74d2f6a6928e1d5c44dcaf88` |
| `06-preflight@390.png` | 390×844 | `#/preflight` | 67,199 | `0f3fffbcac1803ba06ecfb66a8bc7c5843216e3795a129336d78827f9aea2f2d` |
| `07-settings@390.png` | 390×844 | `#/settings` | 80,594 | `72812a22981eaf2a31ca6ef201b8d0d178427057cd89a37964822d6eccdac5de` |
| `08-dashboard@768.png` | 768×1024 | `#/dashboard` | 103,008 | `481c21583162bb0cf00cfb36a37ea986e796a2b8f054b8b1d1ba4868536676d8` |
| `09-projects@768.png` | 768×1024 | `#/projects` | 88,900 | `ac99d60497024dde1bd646a5b20f5c227713c909030d69c83ac673bde4268288` |
| `10-project-detail@768.png` | 768×1024 | `#/projects/205b2a083d3c4be7b7ac1b0289cc8e1a` | 88,895 | `b4332145fed45037656490856c1102aacdb364d62ef74b59ea9c30a465a63d41` |
| `11-creative-tools@768.png` | 768×1024 | `#/tools` | 48,903 | `30eaeb5ce5c27889a6d528fded1c924c2d2b581e8e0281cde7f443c6103c0f35` |
| `12-deliverables@768.png` | 768×1024 | `#/deliverables` | 49,548 | `0eca1a0ffcb227d23e1f42efd67803d4f17660537a0e8f673fb21202f9797e42` |
| `13-evidence@768.png` | 768×1024 | `#/evidence` | 50,612 | `04621cc73e83276506784b6f3ebd32b9c01734c0167e135bdf1a2db1bf503b85` |
| `14-preflight@768.png` | 768×1024 | `#/preflight` | 84,307 | `26dc2a6a58dfc6f1008285450be874e45e064b48a740d9afd41766259bf457e6` |
| `15-settings@768.png` | 768×1024 | `#/settings` | 138,926 | `187ceeaf9458772a5732ae718b8f6aeb4fc0bad37952bc611ca9fa631eff956d` |
| `16-dashboard@1280.png` | 1280×800 | `#/dashboard` | 184,271 | `ffa460c6db94064e9b4521132fee03d6d1b3b65d4893e9e7885cc39cf56df214` |
| `17-projects@1280.png` | 1280×800 | `#/projects` | 130,599 | `6f7291e0c9952cac2e2f923d45dff783ad1ac1fed98fc4ff1083e6a4eeffad3d` |
| `18-project-detail@1280.png` | 1280×800 | `#/projects/205b2a083d3c4be7b7ac1b0289cc8e1a` | 166,854 | `606ba33b72a180494ef3a6012ff169488182532e427f92a432e1f8657bcb7d5f` |
| `19-creative-tools@1280.png` | 1280×800 | `#/tools` | 91,082 | `7dc2356d3e0c3a75fef57aa839bba91918240a0b782c7c14d16f2f69f8fe1606` |
| `20-deliverables@1280.png` | 1280×800 | `#/deliverables` | 91,943 | `d7a81e3449adafa7266f4a8f2fd377a2e5dc037b78feedda59e677134c4f6c1d` |
| `21-evidence@1280.png` | 1280×800 | `#/evidence` | 93,188 | `de33dc092451ce82093c2283710d5cccb5a6d47e5fe6b2127cf48dab1490c3e3` |
| `22-preflight@1280.png` | 1280×800 | `#/preflight` | 123,963 | `03abfcc319d2d51cd10c9598e9ab91afc29b78f9626e6f668877199c1cbd76be` |
| `23-settings@1280.png` | 1280×800 | `#/settings` | 197,729 | `0e5681a16e96d317fdeb35b620edefbabfaa40e98087a67d085151385a3c1127` |
| `24-dashboard@1920.png` | 1920×1080 | `#/dashboard` | 239,416 | `ce9aaafbeb56203c2e9924073ac2bd905410339cc78045d4d0f03ec369f82a22` |
| `25-projects@1920.png` | 1920×1080 | `#/projects` | 151,633 | `089745c5f40b2b1db1ce115b7923d84dc9f0c764da1c6d3c4ccce337f185b738` |
| `26-project-detail@1920.png` | 1920×1080 | `#/projects/205b2a083d3c4be7b7ac1b0289cc8e1a` | 245,350 | `a68363b981f01582a1c4819aac465dca78c91a09f91644a652ecc62f669233a0` |
| `27-creative-tools@1920.png` | 1920×1080 | `#/tools` | 109,022 | `467b58406981439c4c6ce968553284727057f78eb9c5d88f73b065a28fc118d3` |
| `28-deliverables@1920.png` | 1920×1080 | `#/deliverables` | 109,631 | `ea40ec19280ead8d4dadeb5146595e52e0e8b1ab7edbab182324bb0ebcdc6dd2` |
| `29-evidence@1920.png` | 1920×1080 | `#/evidence` | 111,070 | `b562198581d84b0bdcbb364856a6ce24ce972fb12bcdf2951132b55a0a517755` |
| `30-preflight@1920.png` | 1920×1080 | `#/preflight` | 144,144 | `df0eba1d2e3a7c1a703a2b3f790342f2fffc36786de77b90433f8d7ad1d53e04` |
| `31-settings@1920.png` | 1920×1080 | `#/settings` | 244,748 | `6ae294b3a8ce4e5dc165e39ecba22852d91a4eb76b96466054f56476391088e5` |
| `32-dashboard@2560.png` | 2560×1440 | `#/dashboard` | 260,434 | `d10c10b09fc4f1928de17458fc29880b1b0bba60a94987edcea1d40ff2dde977` |
| `33-projects@2560.png` | 2560×1440 | `#/projects` | 170,652 | `3d133feb44a324e32732fe6f33309a83c8905b5d80bfb485acfb9f131a92e64b` |
| `34-project-detail@2560.png` | 2560×1440 | `#/projects/205b2a083d3c4be7b7ac1b0289cc8e1a` | 308,179 | `1327f2b66b8672c2d3d5b9cd1016539868c0de6fa68536f4d419e87ec43484f0` |
| `35-creative-tools@2560.png` | 2560×1440 | `#/tools` | 127,936 | `f01c393d034a5cdedb54443f34eee2cfd351aaf5bbd3a43e6ced6ab22fa13ff4` |
| `36-deliverables@2560.png` | 2560×1440 | `#/deliverables` | 128,722 | `4040e6344aa124acd092e3aab180c5a0523584e21280a01226c77a487060b510` |
| `37-evidence@2560.png` | 2560×1440 | `#/evidence` | 130,236 | `e245898c3f0b1e375bff7725e3541943cdf6640676036068767f28e28d5b2e4e` |
| `38-preflight@2560.png` | 2560×1440 | `#/preflight` | 163,108 | `5423a191c43d2d8cd837e0b5bb0d25f4ebce027a5fcd393cd2d67cd437cf5e77` |
| `39-settings@2560.png` | 2560×1440 | `#/settings` | 259,744 | `eebb16755b58a395902e9e1fc4b91ae543bbf2da538e38a29f84b34f088ed6a9` |

## 观察记录（由清单内 `rendered` 字段生成，非人工描述）

- 捕获时间 `2026-10-06T08:34:13.833Z`；commit `0c092233`；bundle `163948` 字节。

### `#/dashboard`

- 本轮 KPI 实际读数：项目=1 · 设计系统=4 · 服务状态=OK · 服务版本=0.1.0-alpha.0

- 面板标题（读回自渲染 DOM）：「仪表盘」, 「最近项目」, 「设计质量趋势 · 未读回」, 「Research」, 「Brand」, 「Delivery」, 「继续项目」, 「待审（需人工处理）（0）」, 「失败（0）」

- 质量趋势面板标题为「设计质量趋势 · 未读回」——无质量路由即无图。
- `未读回/未连接` 文案在该页出现：True。

### `#/projects/:id`

- 详情页面板标题：「Closeout 1791275629314」, 「任务台账（1）」, 「设计层契约」, 「交付包（0）」, 「简报（Brief）· 1 个版本」, 「方向（Direction）· 1 个候选」, 「设计系统（DesignSystem）· 目录 4 项 · 绑定 1 次」, 「参考素材（1）」, 「Inspector」

### 布局与溢出（来自 `ui-audit/report.json`，65 作用域）

- 横向溢出：0；触控目标 <24px：0；无可访问名控件：0；对比度失败：0；命令面板：0。

- 占位视图会被判 `measurement-invalid`，本轮 0。

## 历轮截图暴露并修复的真实缺陷

- **KPI 假值**：`animateKpiCount` 用 `parseFloat` 解析 `data-count`，
  `0.1.0-alpha.0` 被当作 `0.1` 计数，服务版本卡最终渲染为 `0.1`。
  修复：仅纯数字才参与 count-up（commit `8036439`）。
- **动画中间帧**：count-up 为 JS 驱动，`animations: 'disabled'` 不生效，
  首拍把「设计系统 3」（真实为 4）写进了图里。修复：截图前等待数值稳定。
- 2026-10-06 批次（UI 审计修复，非截图驱动发现，但改变了截图内容，故一并记录）：
  移除仪表盘硬编码 72/84/65% 进度条与编造的质量趋势曲线；项目状态列 `Active` →
  `未读回`；预检词表 `PASS` → `READY`；状态药丸与主按钮改配（白字压品牌蓝实测
  1.83–4.45:1，不达 AA）；侧栏演示身份 `Alex / Personal Workspace` 改为
  「本地单用户 · 无身份路由 · 未读回」；命令面板导航修复（`#dashboard` → `#/dashboard`）。

## 诚实结论与证据等级

- 40 张 PNG（每张配 `.license` sidecar）为真实 Chromium（149.0.7827.55，`chromium-1228/chrome-win64/chrome.exe`，
  非 headless-shell）渲染，绑定 exact commit `ca67834a`、bundle 163269 字节 SHA-256 `3f060019…`、
  服务端口与时间戳；**E1 结构 + E2 受控运行时**级视觉证据。
- **不是 E3**：未驱动 Photoshop/Illustrator，未产出原生可编辑设计文件。
- **不是 E4**：无人工视觉验收；本文件不含任何「已验收」判定。
- 截图只证明 UI 在 5 档视口下正常渲染并读回真实服务状态。
