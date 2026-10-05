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
  "generatedAt": "2026-10-05T15:03:38.595Z",
  "commit": "fbe94ac217c52965c19b11ebdddd4bebb37d5829",
  "subject": {
    "bundle": "apps\workbench\build\main.js",
    "bundleBytes": 157747,
    "bundleSha256": "f58a8e1f9776e2c9769629f83cb8cea2c2452b3ef02466463060ee4bbcc05d21"
  },
  "project": {
    "name": "Closeout 1791212592470",
    "id": "7739ebfa5d434eb5b3152fa21db58781"
  },
  "referenceSourceImage": "D:\All projects\DESIGN-LAB\design-lab\evals\reconstruction\cases\poster-sunrise-001\reference.png",
  "service": {
    "origin": "http://127.0.0.1:57518",
    "pythonVersion": "3.13.14"
  },
  "browser": {
    "engine": "chromium",
    "version": "149.0.7827.55",
    "executable": "C:\Users\ALEX\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe",
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
| `01-projects@390.png` | 390×844 | `#/projects` | 67,398 | `17517d20757954d3ad43ef2ccce8ae8ac6dcc8851980484ceed00d9df455a67a` |
| `02-project-detail@390.png` | 390×844 | `#/projects/7739ebfa5d434eb5b3152fa21db58781` | 63,430 | `0ef997d3405dd2e93339bb2b454e0c94f25fbe7012d66d219f53f6d05397aa89` |
| `03-creative-tools@390.png` | 390×844 | `#/tools` | 39,179 | `3779a93e02d74450dbb5500449470657feb78eb6428fc8884cae079331a83a8c` |
| `04-deliverables@390.png` | 390×844 | `#/deliverables` | 39,825 | `a4e72f8596bdf1ca3d844e18b063541f678fe2086849c410ee4872c87b592cda` |
| `05-evidence@390.png` | 390×844 | `#/evidence` | 40,998 | `4c989d14f750ea60ceb42660e79306ac1494a28c74d2f6a6928e1d5c44dcaf88` |
| `06-preflight@390.png` | 390×844 | `#/preflight` | 69,466 | `258dd6eec52a2d07360d0d4f58fbf5b01123e35cf397ad4cefce59fa2eb3a58b` |
| `07-settings@390.png` | 390×844 | `#/settings` | 81,220 | `58505434adf843bb3acda10f51d6ae113991adc49cc6cefdba6bb22015057bbc` |
| `08-dashboard@768.png` | 768×1024 | `#/dashboard` | 105,705 | `2b9e028e3dd1d4e09f6f260398c69335f65614eb24ca6f66da3a78c5a7a8f08f` |
| `09-projects@768.png` | 768×1024 | `#/projects` | 92,249 | `65efcd7459d69bc0637185b7cd8cb3cd9bdcf7b6355b68f61523834e2f6d327b` |
| `10-project-detail@768.png` | 768×1024 | `#/projects/7739ebfa5d434eb5b3152fa21db58781` | 92,069 | `01d5a984d1bed488810581e0405d6c1c963fcb28c52b640e651ac3b491b9f95b` |
| `11-creative-tools@768.png` | 768×1024 | `#/tools` | 50,067 | `3e1a141d9c9ab4011dc38ec9a3bde5e76d6bd946a2ba3fea58306315643e9b6d` |
| `12-deliverables@768.png` | 768×1024 | `#/deliverables` | 50,727 | `7d85f4a970515d45403ad20085be1161bfc16e61f87b69dd41ead0a93b32308a` |
| `13-evidence@768.png` | 768×1024 | `#/evidence` | 51,787 | `690a37d1fb07cade082789b8895c70b0451bbb49ff134bd83dcb4ff717351698` |
| `14-preflight@768.png` | 768×1024 | `#/preflight` | 89,138 | `b8af29fc7c9f961eb6e9777f632170fcd1ff87dc23955917a0e363489e986cd4` |
| `15-settings@768.png` | 768×1024 | `#/settings` | 137,398 | `d4d6ce0b5789ae003af9028d4f1d3c0aba6d5a70b5353108a30e27b53e1534e9` |
| `16-dashboard@1280.png` | 1280×800 | `#/dashboard` | 180,430 | `5caa62ded80ef4f9b2a6e871ea4ef5de4a2db510f94fb13a5d7d939719ccc613` |
| `17-projects@1280.png` | 1280×800 | `#/projects` | 130,113 | `337285bd50ddff1a812f646814fc4d2bbf69bf6d9f5f247eec6970f0583dc085` |
| `18-project-detail@1280.png` | 1280×800 | `#/projects/7739ebfa5d434eb5b3152fa21db58781` | 166,631 | `be7e6b07195b3e728ba4ffe7c47fd01edecc9e4ce44f926f25bd842ac0893b65` |
| `19-creative-tools@1280.png` | 1280×800 | `#/tools` | 90,465 | `bd17ee97e15670638c807f1baa3cfd9f873021a123fd18d367780128074ce311` |
| `20-deliverables@1280.png` | 1280×800 | `#/deliverables` | 91,281 | `d8729b718058c66829bfc7aed6eb0d0c23cfa39c557cf46710fc7cc630df8408` |
| `21-evidence@1280.png` | 1280×800 | `#/evidence` | 92,531 | `82fe0274ea762f505d70edc1190d552d6553176c54f97b8c678f94693f8e44ce` |
| `22-preflight@1280.png` | 1280×800 | `#/preflight` | 125,440 | `3909e580b90ebe8bc91465895b60bb9c515ece6ceede106157c02e133d59e296` |
| `23-settings@1280.png` | 1280×800 | `#/settings` | 194,947 | `99e117c2371f78eb9bc2b052d9144148298db48bc749994c09d2e4fbfecf841a` |
| `24-dashboard@1920.png` | 1920×1080 | `#/dashboard` | 245,303 | `9d762c4ff77a905936ca153e5711e8a20be619da9d69aeff35d448e9832615c5` |
| `25-projects@1920.png` | 1920×1080 | `#/projects` | 150,436 | `abb32d56e7121818616631ae9850aeb5385bba92a5f1fc5604cf959e2b530042` |
| `26-project-detail@1920.png` | 1920×1080 | `#/projects/7739ebfa5d434eb5b3152fa21db58781` | 241,203 | `ac5e48c96a70954a2413a3e81de997a039b278422a42936b8661377a9942e685` |
| `27-creative-tools@1920.png` | 1920×1080 | `#/tools` | 107,968 | `aa88141a8e7146aa5df36bb4e4c877973e1900dd262e48a905a9cc721a414f49` |
| `28-deliverables@1920.png` | 1920×1080 | `#/deliverables` | 108,541 | `dd1d7783948226d3b19e7dc9211966889554ce0283610eb8d85eb7d78ac694e9` |
| `29-evidence@1920.png` | 1920×1080 | `#/evidence` | 110,101 | `6ffd2b8b39dadd706dd02b80736d68a77657f8a5452007ec53faaf0b356ef04e` |
| `30-preflight@1920.png` | 1920×1080 | `#/preflight` | 145,350 | `ab164128675c55d8fa1247c334fb4f14b8c66a3becbdb74e638e1d6f503043e3` |
| `31-settings@1920.png` | 1920×1080 | `#/settings` | 235,090 | `3b0ffcbaf738fb0e8981d53e95d6921192da0d4ac578eb67055ba04d65d56afc` |
| `32-dashboard@2560.png` | 2560×1440 | `#/dashboard` | 283,182 | `bf97a7a94e75ce1ff44e2fe72b76acfcbe2f5975a93bf744a6ba918615aa3754` |
| `33-projects@2560.png` | 2560×1440 | `#/projects` | 170,084 | `0fd2ad80189bd45a8ee434a24c9995e5d89fb8041d59ef76bd1e8fca0c3d5999` |
| `34-project-detail@2560.png` | 2560×1440 | `#/projects/7739ebfa5d434eb5b3152fa21db58781` | 304,612 | `fe012616837160190c7dbeb11726085c178b8427b47db033d4ea75ee4588df39` |
| `35-creative-tools@2560.png` | 2560×1440 | `#/tools` | 127,266 | `ce00e4fec4e235e15a3ce9724aaae3c5d3e0fff489d82036b2d35a4040b20015` |
| `36-deliverables@2560.png` | 2560×1440 | `#/deliverables` | 128,154 | `4dd3c7346e4c02e9eb06add4b2659179adfec0bd221f7a653216119b07335f25` |
| `37-evidence@2560.png` | 2560×1440 | `#/evidence` | 129,555 | `f994c1925efb0dfc0fa8f94b01c1a3139e6e0f70f89842e8d09bfba995692681` |
| `38-preflight@2560.png` | 2560×1440 | `#/preflight` | 164,588 | `1390db8ae2c46f0d2c0fc07b5704edffefdf524395e524015ff121130777a45d` |
| `39-settings@2560.png` | 2560×1440 | `#/settings` | 250,321 | `e23adf09da4fb7f8e2352fda535224664857927c1a6e8c42ebf05bdf790456f8` |

合计 5,120,249 bytes。逐张 hash 与 `screenshot/screenshot-manifest.json`
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

- 40 张 PNG（每张配 `.license` sidecar）为真实 Chromium（149.0.7827.55，`chromium-1228/chrome-win64/chrome.exe`，
  非 headless-shell）渲染，绑定 exact commit `fbe94ac`、bundle SHA-256
  `f58a8e1f…`、服务端口与时间戳；**E1 结构 + E2 受控运行时**级视觉证据。
- **不是 E3**：未驱动 Photoshop/Illustrator，未产出原生可编辑设计文件。
- **不是 E4**：无人工视觉验收；本文件不含任何「已验收」判定。
- 截图只证明 UI 在 5 档视口下正常渲染并读回真实服务状态。
