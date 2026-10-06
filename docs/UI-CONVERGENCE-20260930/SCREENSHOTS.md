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
  "generatedAt": "2026-10-06T04:42:50.398Z",
  "commit": "ca67834ae675c3ea3885d94ef0c47c04761dad81",
  "subject": {
    "bundle": "apps\\workbench\\build\\main.js",
    "bundleBytes": 163269,
    "bundleSha256": "3f0600198df895806a227e8cca6fd93183529387db5508b4bdaa1e65cae215fe"
  },
  "project": {
    "name": "Closeout 1791261745788",
    "id": "3d44b5210bd34d6b82bb115001b8dc86"
  },
  "referenceSourceImage": "D:\\All projects\\DESIGN-LAB\\design-lab\\evals\\reconstruction\\cases\\poster-sunrise-001\\reference.png",
  "service": {
    "origin": "http://127.0.0.1:55663",
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
| `01-projects@390.png` | 390×844 | `#/projects` | 65,548 | `2abf785321e5176756f97e2fa91e830966953fc53560510aab091d3745a905f6` |
| `02-project-detail@390.png` | 390×844 | `#/projects/3d44b5210bd34d6b82bb115001b8dc86` | 63,444 | `eefbe5e4f1e154bdd7dbedcfe965ce940cb1b302634161895393abcafc70e768` |
| `03-creative-tools@390.png` | 390×844 | `#/tools` | 39,179 | `3779a93e02d74450dbb5500449470657feb78eb6428fc8884cae079331a83a8c` |
| `04-deliverables@390.png` | 390×844 | `#/deliverables` | 39,825 | `a4e72f8596bdf1ca3d844e18b063541f678fe2086849c410ee4872c87b592cda` |
| `05-evidence@390.png` | 390×844 | `#/evidence` | 40,998 | `4c989d14f750ea60ceb42660e79306ac1494a28c74d2f6a6928e1d5c44dcaf88` |
| `06-preflight@390.png` | 390×844 | `#/preflight` | 67,199 | `0f3fffbcac1803ba06ecfb66a8bc7c5843216e3795a129336d78827f9aea2f2d` |
| `07-settings@390.png` | 390×844 | `#/settings` | 80,482 | `333c3cb1ac86b57ed729f73d3b560bd20d508a68bffd22ab341f0e5ef9a7f955` |
| `08-dashboard@768.png` | 768×1024 | `#/dashboard` | 103,134 | `dd9b1f85d0cf94564950b56907a186820eb1d3feca0a753a0c1eabf680566899` |
| `09-projects@768.png` | 768×1024 | `#/projects` | 88,586 | `af226f4ddde19ad9bf73bf72c60857cf4e53d2362e3aa7cd4568d2ede2170b64` |
| `10-project-detail@768.png` | 768×1024 | `#/projects/3d44b5210bd34d6b82bb115001b8dc86` | 89,069 | `fa802836363b0da590e80fd40108e5546ad8b8dcfe7f96fc6b8ba87bce99e67c` |
| `11-creative-tools@768.png` | 768×1024 | `#/tools` | 48,903 | `30eaeb5ce5c27889a6d528fded1c924c2d2b581e8e0281cde7f443c6103c0f35` |
| `12-deliverables@768.png` | 768×1024 | `#/deliverables` | 49,548 | `0eca1a0ffcb227d23e1f42efd67803d4f17660537a0e8f673fb21202f9797e42` |
| `13-evidence@768.png` | 768×1024 | `#/evidence` | 50,612 | `04621cc73e83276506784b6f3ebd32b9c01734c0167e135bdf1a2db1bf503b85` |
| `14-preflight@768.png` | 768×1024 | `#/preflight` | 84,180 | `9c5dc8de976b5822802e46c1d38aaf7b19308882e3063584dd7e21dbfe5e8472` |
| `15-settings@768.png` | 768×1024 | `#/settings` | 139,856 | `60ab1db6f0a42c1f5e7a78d684d5c53af18bdc4b4fece47adb984d25e3b00d47` |
| `16-dashboard@1280.png` | 1280×800 | `#/dashboard` | 184,388 | `dd813998b591b8284e4bf54d403f2be9db231ad5f0895ac12cab77608016346e` |
| `17-projects@1280.png` | 1280×800 | `#/projects` | 130,342 | `d6e6749e23ef0fb14d383d248c2307b01ab60cbe676d8b0395d70ec7ee0c3f08` |
| `18-project-detail@1280.png` | 1280×800 | `#/projects/3d44b5210bd34d6b82bb115001b8dc86` | 167,129 | `2aa2df8a846cc5382906f8dbbf91b6f4f6b96f286de69237db140b6c329eeb2a` |
| `19-creative-tools@1280.png` | 1280×800 | `#/tools` | 91,082 | `7dc2356d3e0c3a75fef57aa839bba91918240a0b782c7c14d16f2f69f8fe1606` |
| `20-deliverables@1280.png` | 1280×800 | `#/deliverables` | 91,943 | `d7a81e3449adafa7266f4a8f2fd377a2e5dc037b78feedda59e677134c4f6c1d` |
| `21-evidence@1280.png` | 1280×800 | `#/evidence` | 93,188 | `de33dc092451ce82093c2283710d5cccb5a6d47e5fe6b2127cf48dab1490c3e3` |
| `22-preflight@1280.png` | 1280×800 | `#/preflight` | 123,827 | `e7bf4a1ccc0e76aa8fadf828555c03ac516d556f93361a1bfa0fa4eafd6097e2` |
| `23-settings@1280.png` | 1280×800 | `#/settings` | 197,474 | `f2d9a121426b335462e96fef012cfc4b4a25c82a5f80f025e7a5d00ae5788a37` |
| `24-dashboard@1920.png` | 1920×1080 | `#/dashboard` | 239,457 | `f58c3cfab0a343f2657b4304d82d7e467cebff410c1bbd072aada6c8bae79cdd` |
| `25-projects@1920.png` | 1920×1080 | `#/projects` | 151,072 | `60b5ccaee013f15ffdb30dcde283402c0c214978eda023004d810965e6207bfc` |
| `26-project-detail@1920.png` | 1920×1080 | `#/projects/3d44b5210bd34d6b82bb115001b8dc86` | 245,769 | `1c7166663586e3fce9e5e8487c579391f034a6390e7fd289be25a3a2ef5f93c3` |
| `27-creative-tools@1920.png` | 1920×1080 | `#/tools` | 109,022 | `467b58406981439c4c6ce968553284727057f78eb9c5d88f73b065a28fc118d3` |
| `28-deliverables@1920.png` | 1920×1080 | `#/deliverables` | 109,631 | `ea40ec19280ead8d4dadeb5146595e52e0e8b1ab7edbab182324bb0ebcdc6dd2` |
| `29-evidence@1920.png` | 1920×1080 | `#/evidence` | 111,070 | `b562198581d84b0bdcbb364856a6ce24ce972fb12bcdf2951132b55a0a517755` |
| `30-preflight@1920.png` | 1920×1080 | `#/preflight` | 144,061 | `e99bc533070d5e80e6debdf263c5aa4ae7e488bff0bc77d7030ce5cd860d8e7a` |
| `31-settings@1920.png` | 1920×1080 | `#/settings` | 245,651 | `9f6cab15459b2179718935f2a560bd765f04f399bbfd96687148391fc35f78e9` |
| `32-dashboard@2560.png` | 2560×1440 | `#/dashboard` | 260,261 | `2dedf6d9417a47c8e48944129430b3a856ffb264c35941ba671097f29095c1af` |
| `33-projects@2560.png` | 2560×1440 | `#/projects` | 170,427 | `9e1ae542a61ed5c4e4227889b2f64721eb76c4eea8de04c34fdd9965d57e2892` |
| `34-project-detail@2560.png` | 2560×1440 | `#/projects/3d44b5210bd34d6b82bb115001b8dc86` | 308,071 | `8e3c9dfcaa56605758684360c5fece9989f19b378830acd604825b7efa8fd287` |
| `35-creative-tools@2560.png` | 2560×1440 | `#/tools` | 127,936 | `1484a87b0f1933a89c4d367e50d3469e0a7e3214d846fb46ae1c6f77e16e9f44` |
| `36-deliverables@2560.png` | 2560×1440 | `#/deliverables` | 128,722 | `4040e6344aa124acd092e3aab180c5a0523584e21280a01226c77a487060b510` |
| `37-evidence@2560.png` | 2560×1440 | `#/evidence` | 130,236 | `e245898c3f0b1e375bff7725e3541943cdf6640676036068767f28e28d5b2e4e` |
| `38-preflight@2560.png` | 2560×1440 | `#/preflight` | 163,068 | `97ddbc9d70e54cc3f107ce59d975fb8c106ccb51ddb76e57c7bcf36062dab345` |
| `39-settings@2560.png` | 2560×1440 | `#/settings` | 261,146 | `607d4353a9225a173295347b015b614c6af29b63b069d1e3c87bc69499171451` |

## 观察记录（由清单内 `rendered` 字段生成，非人工描述）

- 捕获时间 `2026-10-06T04:42:50.398Z`；commit `ca67834a`；bundle `163269` 字节。

### `#/dashboard`

- 本轮 KPI 实际读数：项目=1 · 设计系统=4 · 服务状态=OK · 服务版本=0.1.0-alpha.0

- 面板标题（读回自渲染 DOM）：「仪表盘」, 「最近项目」, 「设计质量趋势 · 未读回」, 「Research」, 「Brand」, 「Delivery」, 「继续项目」, 「待审（需人工处理）（0）」, 「失败（0）」

- 质量趋势面板标题为「设计质量趋势 · 未读回」——本轮已删除编造的 sparkline，改由能力登记表说明无质量路由。
- `未读回/未连接` 文案在该页出现：True（待审 / 人工验收面板按 UNKNOWN-not-0 规则显示）。

### `#/projects` 与 `#/projects/:id`

- 项目页 KPI：项目=1 · 进行中=— · 已完成=—；其状态列本轮显示「未读回」（服务无状态字段）。

- 详情页面板标题：「Closeout 1791261745788」, 「任务台账（1）」, 「设计层契约」, 「交付包（0）」, 「简报（Brief）· 1 个版本」, 「方向（Direction）· 1 个候选」, 「设计系统（DesignSystem）· 目录 4 项 · 绑定 1 次」, 「参考素材（1）」, 「Inspector」

### 布局与溢出（来自 `ui-audit/report.json`，65 作用域）

- 横向溢出违规：0；触控目标 <24px 违规：0；无可访问名控件：0；对比度失败：0。

- 视口 5 档 × 13 个视图共 65 个作用域，全部判定为 live（未连上服务的占位视图会被判 `measurement-invalid`，本轮为 0）。

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
