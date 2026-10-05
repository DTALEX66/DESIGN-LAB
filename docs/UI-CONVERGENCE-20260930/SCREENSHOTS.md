# DESIGN-LAB UI 商业级 Workbench — 截图验收（Playwright 真实浏览器）
任务包：DESIGN-LAB_UI_FRONTEND_TASKPACK_20260930 · 分支 feat/ui-commercial-workbench-20260930

> 本文件此前（commit `0fbb674`）声明「12 张截图已生成 / 真实渲染 / hash 已记录」，
> 但仓库内不存在任何 PNG，表格数值全是占位符。该声明为**假完成**，与
> `VISUAL_QA.md`（DEFERRED）、`COMPLETION_REPORT.md`（待办）互相矛盾。
> 2026-10-05 已按方案 A 修复：真实执行截图并把结果写回本文件。
> 修订记录见 `MERGE_READY_HANDOFF.md` 的 Evidence Truth Repair 段。

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
  "generatedAt": "2026-10-05T14:55:48.440Z",
  "commit": "13fa81e90c8d83b0ccee1385eb42785c0807d00d",
  "subject": {
    "bundle": "apps\\workbench\\build\\main.js",
    "bundleBytes": 157747,
    "bundleSha256": "f58a8e1f9776e2c9769629f83cb8cea2c2452b3ef02466463060ee4bbcc05d21"
  },
  "project": {
    "name": "Closeout 1791212122743",
    "id": "ea553e3d87b54c83ab7e0a5b799a5e59"
  },
  "referenceSourceImage": "D:\\All projects\\DESIGN-LAB\\design-lab\\evals\\reconstruction\\cases\\poster-sunrise-001\\reference.png",
  "service": {
    "origin": "http://127.0.0.1:63946",
    "pythonVersion": "3.13.14"
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
| `00-dashboard@390.png` | 390×844 | `#/dashboard` | 76,001 | `70a983b7da73366116762fc586a8d6bcc41b702fcd4055274cb9ef7830dc78c7` |
| `01-projects@390.png` | 390×844 | `#/projects` | 67,399 | `6cd3a86610f1ac63c48409bd3619cc2ebf2c57c0a21726056c8b38d5a501265c` |
| `02-project-detail@390.png` | 390×844 | `#/projects/ea553e3d87b54c83ab7e0a5b799a5e59` | 63,410 | `940325523c53d6e0d3aa4257744ac2ea7e6f11a2481c2f8da5823c69558db975` |
| `03-creative-tools@390.png` | 390×844 | `#/tools` | 39,179 | `3779a93e02d74450dbb5500449470657feb78eb6428fc8884cae079331a83a8c` |
| `04-deliverables@390.png` | 390×844 | `#/deliverables` | 39,825 | `a4e72f8596bdf1ca3d844e18b063541f678fe2086849c410ee4872c87b592cda` |
| `05-evidence@390.png` | 390×844 | `#/evidence` | 40,998 | `4c989d14f750ea60ceb42660e79306ac1494a28c74d2f6a6928e1d5c44dcaf88` |
| `06-preflight@390.png` | 390×844 | `#/preflight` | 69,466 | `258dd6eec52a2d07360d0d4f58fbf5b01123e35cf397ad4cefce59fa2eb3a58b` |
| `07-settings@390.png` | 390×844 | `#/settings` | 81,248 | `962360552ece87cf7ffe5fec8451f2c709d153910e2b1d257ab5d2036f957f3b` |
| `08-dashboard@768.png` | 768×1024 | `#/dashboard` | 105,743 | `906e6e3f225fc370d6fa6c3e9cedc12737e16e234795bddff2637d6cfd87996d` |
| `09-projects@768.png` | 768×1024 | `#/projects` | 92,343 | `083c3302fb7be16aaee8246be0be8cd51753d83a0b2a5db22ad432590f539cce` |
| `10-project-detail@768.png` | 768×1024 | `#/projects/ea553e3d87b54c83ab7e0a5b799a5e59` | 91,930 | `8236c1fcbd365543ed6aeeb4a62339d782938cb70bce394694347e7f2019a640` |
| `11-creative-tools@768.png` | 768×1024 | `#/tools` | 50,067 | `3e1a141d9c9ab4011dc38ec9a3bde5e76d6bd946a2ba3fea58306315643e9b6d` |
| `12-deliverables@768.png` | 768×1024 | `#/deliverables` | 50,727 | `7d85f4a970515d45403ad20085be1161bfc16e61f87b69dd41ead0a93b32308a` |
| `13-evidence@768.png` | 768×1024 | `#/evidence` | 51,787 | `690a37d1fb07cade082789b8895c70b0451bbb49ff134bd83dcb4ff717351698` |
| `14-preflight@768.png` | 768×1024 | `#/preflight` | 89,138 | `b8af29fc7c9f961eb6e9777f632170fcd1ff87dc23955917a0e363489e986cd4` |
| `15-settings@768.png` | 768×1024 | `#/settings` | 137,116 | `b289c30db6fcbd504204cc1dcbdd17ecc39bdb51ed1ff921a8feef1413fc79da` |
| `16-dashboard@1280.png` | 1280×800 | `#/dashboard` | 180,476 | `ad196e257afd7813ec64d2b61f85e97879b24a284679a180027c8136ed590d20` |
| `17-projects@1280.png` | 1280×800 | `#/projects` | 130,227 | `ffe91b08baeed690ba04473491550d80b5e13a53759edd88b7559d524f90ce88` |
| `18-project-detail@1280.png` | 1280×800 | `#/projects/ea553e3d87b54c83ab7e0a5b799a5e59` | 166,397 | `f8624ef8602d1864521d9193dd1f9ebc38ba8b65622482394e205b944ad1dd26` |
| `19-creative-tools@1280.png` | 1280×800 | `#/tools` | 90,465 | `bd17ee97e15670638c807f1baa3cfd9f873021a123fd18d367780128074ce311` |
| `20-deliverables@1280.png` | 1280×800 | `#/deliverables` | 91,281 | `d8729b718058c66829bfc7aed6eb0d0c23cfa39c557cf46710fc7cc630df8408` |
| `21-evidence@1280.png` | 1280×800 | `#/evidence` | 92,531 | `82fe0274ea762f505d70edc1190d552d6553176c54f97b8c678f94693f8e44ce` |
| `22-preflight@1280.png` | 1280×800 | `#/preflight` | 125,440 | `3909e580b90ebe8bc91465895b60bb9c515ece6ceede106157c02e133d59e296` |
| `23-settings@1280.png` | 1280×800 | `#/settings` | 195,708 | `3bc2855c8ddc7f11ca5a1b9b2c1d714d020a532845d09e3bae492a2905bdd3df` |
| `24-dashboard@1920.png` | 1920×1080 | `#/dashboard` | 245,193 | `f257c3c9cd4827d1e58c6ad3b07bba7a7416827e25ed68f55598e33285b2d68f` |
| `25-projects@1920.png` | 1920×1080 | `#/projects` | 150,394 | `2e0deb330f85349b151c380b829fa75ee7651f696bd059347c865c674b26fd00` |
| `26-project-detail@1920.png` | 1920×1080 | `#/projects/ea553e3d87b54c83ab7e0a5b799a5e59` | 240,634 | `254404361d704e33dd5ce3b9e82843287cc948604722d0c1eeac9cf01649b44f` |
| `27-creative-tools@1920.png` | 1920×1080 | `#/tools` | 107,968 | `aa88141a8e7146aa5df36bb4e4c877973e1900dd262e48a905a9cc721a414f49` |
| `28-deliverables@1920.png` | 1920×1080 | `#/deliverables` | 108,639 | `95e44499317a47ff7ad7f19edbedd58135025467fadeb76c18c366747ba621ad` |
| `29-evidence@1920.png` | 1920×1080 | `#/evidence` | 110,101 | `6ffd2b8b39dadd706dd02b80736d68a77657f8a5452007ec53faaf0b356ef04e` |
| `30-preflight@1920.png` | 1920×1080 | `#/preflight` | 145,350 | `ab164128675c55d8fa1247c334fb4f14b8c66a3becbdb74e638e1d6f503043e3` |
| `31-settings@1920.png` | 1920×1080 | `#/settings` | 235,852 | `544bd164f0f634015a46682519dbcc74bc6f6cbb1068aac1e1a985957b27563e` |
| `32-dashboard@2560.png` | 2560×1440 | `#/dashboard` | 283,131 | `c0b57e370f31062a5f9630490622562a68ca774ab7c2f902f3f8e6b64b74e2e5` |
| `33-projects@2560.png` | 2560×1440 | `#/projects` | 170,152 | `2bcda14f55a3ab3e5fbeaa65a72d833ae52bc9ab74f172dbf50fa5855b07b0ad` |
| `34-project-detail@2560.png` | 2560×1440 | `#/projects/ea553e3d87b54c83ab7e0a5b799a5e59` | 304,078 | `4feb995da90ae1be7fce2d0d201cf8f2d562dbef976f13b3bc3e0f342907dea4` |
| `35-creative-tools@2560.png` | 2560×1440 | `#/tools` | 127,266 | `ce00e4fec4e235e15a3ce9724aaae3c5d3e0fff489d82036b2d35a4040b20015` |
| `36-deliverables@2560.png` | 2560×1440 | `#/deliverables` | 128,154 | `4dd3c7346e4c02e9eb06add4b2659179adfec0bd221f7a653216119b07335f25` |
| `37-evidence@2560.png` | 2560×1440 | `#/evidence` | 129,555 | `f994c1925efb0dfc0fa8f94b01c1a3139e6e0f70f89842e8d09bfba995692681` |
| `38-preflight@2560.png` | 2560×1440 | `#/preflight` | 164,588 | `1390db8ae2c46f0d2c0fc07b5704edffefdf524395e524015ff121130777a45d` |
| `39-settings@2560.png` | 2560×1440 | `#/settings` | 251,512 | `1bc93cb68b626a3d3f9ef86dcfd4202612e51cbb63b62462ca7c44cf9d8612e0` |

合计 5,121,469 bytes。逐张 hash 与 `screenshot/screenshot-manifest.json`
内 `screenshots[]` 一一对应；清单由截图脚本自动写入，不是手工誊录。

## 观察记录（据实际渲染，非预期描述）

### `#/dashboard`（Lite / Home）
- 1280/1920/2560：四张 KPI 卡（项目 / 设计系统 / 服务状态 / 服务版本）+
  最近项目 + 设计质量趋势 + Research/Brand/Delivery 三张能力卡；
  左侧 11 项 sidebar，`.app-nav-item` 12 项冻结面未变。
- 数值为真实读回：本轮 1 项目 / 4 设计系统 / `OK` / `0.1.0-alpha.0`。
- 390：KPI 两列 → 单列堆叠，无横向溢出；768：两列。
- 质量趋势 sparkline 下方保留「B10 演示序列 · 非业务指标」标注（既有诚实文案）。

### `#/projects` 与 `#/projects/:id`
- 项目列表 1 行 + 「打开」跳详情；详情页横向阶段导航 10 节点
  （Brief → References → Research* → Directions → Design System → Production →
  Versions → Review/Preflight → Handoff* → Evidence），`*` 为 PLANNED 节点。
- 1280 及以上：右侧 Inspector（版本环 + 活动绑定摘要）可见；
  768 及以下：Inspector 折叠为单列，阶段导航横向滚动。

### `#/tools`、`#/deliverables`、`#/evidence`、`#/preflight`、`#/settings`
- `#/tools`：能力卡网格显示 BLOCKED / UNKNOWN / PLANNED 徽章与下一动作，
  无「宿主在线」假指示。
- `#/deliverables`：本轮交付包数为 0（未跑宿主任务），面板显示真实空态而非假数。
- `#/evidence`：绑定链读回项目 → brief → 选定方向 → 交付包。
- `#/settings`：`/api/environment` 真实读回（roots / shared_inputs）。

## 本轮截图暴露并修复的真实缺陷

- **KPI 假值**：`animateKpiCount` 用 `parseFloat` 解析 `data-count`，
  `0.1.0-alpha.0` 被当作 `0.1` 计数，服务版本卡最终渲染为 `0.1`。
  修复：仅纯数字才参与 count-up（commit `8036439`）。
- **动画中间帧**：count-up 为 JS 驱动，`animations: 'disabled'` 不生效，
  首拍把「设计系统 3」（真实为 4）写进了图里。修复：截图前等待数值稳定。

## 诚实结论与证据等级

- 40 张 PNG 为真实 Chromium（149.0.7827.55，`chromium-1228/chrome-win64/chrome.exe`，
  非 headless-shell）渲染，绑定 exact commit `13fa81e`、bundle SHA-256
  `f58a8e1f…`、服务端口与时间戳；**E1 结构 + E2 受控运行时**级视觉证据。
- **不是 E3**：未驱动 Photoshop/Illustrator，未产出原生可编辑设计文件。
- **不是 E4**：无人工视觉验收；本文件不含任何「已验收」判定。
- 截图只证明 UI 在 5 档视口下正常渲染并读回真实服务状态。
