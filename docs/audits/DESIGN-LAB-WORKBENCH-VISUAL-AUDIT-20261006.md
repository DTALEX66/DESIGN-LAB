# DESIGN-LAB Workbench 视觉自审 · 2026-10-06

> 触发：owner 反馈「文字都溢出了 / 没有审美吗 / 没有视觉设计规范吗 / 没有相关技能和插件调用吗 /
> 界面需要显示那么后端对接的内容吗」。
> 本文只记录**实测**结论。所有数字来自真实 Chromium 对真实 loopback 服务的测量，不来自阅读代码后的推断。

- **审计对象**：`apps/workbench`（index.html / main.ts / shell.ts / workbench.ts / design.ts / style.css）
- **基线 commit**：`734269367a96ef68841d9d0a81b85cbdf61608ab`
- **分支**：`qoder/designlab-workbench-visual-audit-20261006`
- **服务**：`python -m design_lab --project <dir> workbench --port 8787`，本机 token（一次性，不入仓）
- **浏览器**：Chromium 1228（`%LOCALAPPDATA%/ms-playwright/chromium-1228/chrome-win64/chrome.exe`）
- **视口**：1440 / 1280 / 1024 / 768 / 390 × 12 条路由
- **证据产物**：`.project-local/tmp/overflow-*.json`（修复前）、`gate-red.json`（证伪）、`gate-final.json`（修复后）

---

## 一、方法论（为什么可信）

不用「读 CSS 猜哪里会溢出」。判定分两类，只有这两类算缺陷：

| 类别 | 判定条件 | 为什么算缺陷 |
|---|---|---|
| `CLIPPED` | `scrollWidth > clientWidth` 且该元素 `overflow-x: hidden/clip` | 内容被**静默裁掉**，用户永远看不到 |
| `STRAY` | 元素右边界超出视口，且**没有任何** `overflow:auto/scroll` 祖先 | 用户**滚不到**，等于丢失 |

不算缺陷的两类，但**照样计数并打印**，避免用「未发现」掩盖事实：

- `.sr-status`：路障公告的屏幕阅读器专用区域，CSS 本来就 `clip-path:inset(50%)`。显式 allowlist，不静默跳过。
- 位于真实滚动容器内的元素（`.table-wrap` 表格、移动端 `.app-nav`）：记为 `SCROLL_OK`，可横向滚动到达。

**闸门已证伪后启用**（项目铁律：新门必须先看到它变红）。
注入 `.panel{max-width:220px}` 后闸门输出 `OV_SUMMARY clipped=4` 并 `OV_FAIL`，退出码 1；
移除注入后 `clipped=0 stray=0 tiny=0` 并 `OV_OK`，退出码 0。

---

## 二、实测发现（修复前）

| # | 发现 | 证据 | 严重度 |
|---|---|---|---|
| F-1 | **系统设置页 `div.panel` 文字被裁掉 388px**（1440 视口），390 视口裁掉 391px | `overflow-report.json` `settings` 路由 | 高 · 内容不可见 |
| F-2 | 项目根面板被裁掉 94px | 同上 | 高 |
| F-3 | `grid` / `flex` 子项缺 `min-width:0`，无法收缩，宽内容顶破面板 | 1024 视口表格外溢 23px | 中 |
| F-4 | legacy 工作台页 **16 处文字为 10px**，其中一处 `.eyebrow` 被当正文塞了 60 个汉字 | `tiny=16` | 中 · 可读性 |
| F-5 | 侧栏品牌副标题 `.brand small` 10px | `tiny` 计数 | 低 |
| F-6 | **31 处 `/api/...` 路由串直接写在用户可见文案里**（KPI 卡片注解、页面说明、能力卡） | `grep -c '/api/' shell.ts` | 中 · 信息层级 |
| F-7 | 设置页整页是服务端诊断（schema id / roots / shared_inputs / write_trace / migration） | 页面结构 | 中 |
| F-8 | RIR JSON（`maxlength=3800000`）与 Patch JSON（`maxlength=900000`）文本域直接铺在主流程里 | `index.html` | 中 |

### F-1 根因链（不是猜的）

```
.tag { white-space: nowrap }              ← 短状态药丸，nowrap 本身是对的
   ↓ 但被拿来承载完整文件系统路径
.list-item { display:flex; ... }          ← 子项默认 min-width:auto，无法收缩
   ↓ 行被撑到 ~600px
.three-col > *                            ← grid 子项同样 min-width:auto
   ↓
.panel { overflow: hidden }               ← B10 面板静默裁掉超出部分
   ↓
结果：C:/Users/ALEX/... 这条路径，用户只看到前面一小截
```

---

## 三、修复（只做三件事）

### 1. 让宽内容可收缩、让长值换行 —— `apps/workbench/style.css`

```css
.two-col>*,.three-col>*,.split>*,.kpi-grid>*{min-width:0}
.list-item,.list-item>*{min-width:0}
.list-item{flex-wrap:wrap}                 /* 兜底：nowrap 药丸放不下时换到下一行 */
.list-item.value-row{flex-direction:column;align-items:stretch;gap:6px}
.value-mono{ font-family:ui-monospace,…; overflow-wrap:anywhere; word-break:break-word; max-width:100% }
.list-item small{overflow-wrap:anywhere;word-break:break-word}
.table-wrap{max-width:100%}
```

长值（路径 / hash / schema id）改用新类 `.value-mono` 承载，与 `.tag`（短状态药丸）职责分离。
**不改 B10 结构类名、不改 B10 声明值、不引入第二套色板。**

### 2. 字号回到项目自己声明的 token 尺度 —— 不是发明新值

`:root` 早已声明 `--font-caption:13px` / `--font-body:16px`，但实现侧实际用的是
10px（`.eyebrow`）、13px（legacy 正文）、11px（`.mono`/`.badge`）、10px（`.brand small`）。
修复方式是**让实现服从已有规范**：

| 选择器 | 前 | 后 | 依据 |
|---|---|---|---|
| `.eyebrow` | 10px / letter-spacing 2px | 12px / .08em | 标签仍小于正文；2px 字距在中文下过宽 |
| `body > header p, body > main p, body > footer p` | 13px | 14px | 仍低于 `--font-body:16px`，不改信息密度层级 |
| `.mono` / `.badge` | 11px | 12px | 全站最小可见文本统一到 12px |
| `.brand small` | 10px | 12px | 同上 |

`index.html` 中那条 60 字的 `.eyebrow` 改回 `.note`（13px 说明文本），不再用标签样式承载正文。

### 3. 收敛后端对接内容

- `shell.ts`：移除用户可见文案中的 `/api/...`（13 处替换，脚本带计数校验，任一项计数不符即中止不落盘）。
  改为「服务端项目台账读回」「服务端目录读回」「服务自检读回」等人类可读描述。
  **实际 fetch 路径与请求数量、顺序完全未改** —— `appshell.mjs` 依赖 dashboard 恰好 4 个请求且顺序固定。
- 设置页：路径诊断（`项目根` / `外置输入` 两块）移入 `<details class="advanced">`，默认收起。
- 能力卡：路由 / 合同引用 / owner / 下一动作移入「接入明细」折叠；
  **状态标签（PLANNED / BLOCKED）保持可见** —— 诚实标注是这张卡存在的理由，不能折起来。
- `index.html`：RIR 对象计划、Adobe 局部修改两块移入 `<details class="advanced">`，默认收起。

---

## 四、修复后实测（同一脚本、同一服务）

| 视口 | CLIPPED | STRAY | SCROLL_OK | tiny(<11px) |
|---|---|---|---|---|
| 1440 | 0 | 0 | 0 | 0 |
| 1024 | 0 | 0 | 7（表格，可滚） | 0 |
| 390  | 0 | 0 | 21（表格 13 + 移动导航 8，均可滚） | 0 |

`OV_SUMMARY clipped=0 stray=0 tiny=0` → `OV_OK`，退出码 0。
12 条路由 × 3 档视口，`documentElement.scrollWidth - clientWidth` 全程为 0（无横向整页溢出）。

设置页裁切：**388px → 0**。页面级横向溢出：**全程 0**。

---

## 五、可复跑入口

```bash
# 与既有 capture_workbench_screenshots.mjs 同一套 env 约定
E2E_SERVICE_URL=http://127.0.0.1:8787 \
E2E_TOKEN=<64-hex> \
E2E_NODE_MODULES=<abs>/apps/workbench/node_modules \
E2E_BROWSER=<abs>/chrome.exe \
OV_WIDTHS=1440,1024,390 OV_STRICT=1 \
node design-lab/tests/e2e/audit_workbench_overflow.mjs
```

`E2E_NODE_MODULES` **必须是绝对路径**（`createRequire` 不接受相对路径，否则 `MODULE_NOT_FOUND`）。
`OV_STRICT=1` 额外把「正文小于 11px」判为失败。

---

## 六、未做 / 待 owner 裁决（不自行决定）

| # | 事项 | 为什么不能自决 |
|---|---|---|
| D-1 | **字体栈首位 `Inter` 未随包分发**。本机 `document.fonts.check('12px Inter')` 为 true 只是因为系统装了 Inter；换机即退化到 Segoe UI。 | 字体属品牌决策；且 frontend-design 规范明确禁用 Inter/system 字体堆 |
| D-2 | `style.css` 中 `.items` 被定义两次（grid / flex），`.mono`、`.error` 亦重复，后声明胜出 | 清理需确认哪一份是权威（B10 原稿 vs 实现侧） |
| D-3 | 原稿自相矛盾项 X-1（正文 18 vs 16px）、X-2（caption 14 vs 13px）、X-3/X-4（断点 767/760/840）、X-7（`--radius-sm` 12px 冲突） | 文件内已记录但未裁决 |
| D-4 | 移动端 12 项导航在 390 视口需横向滚动（1059px 内容 / 390px 视口） | 是可滚动容器，不算缺陷；但是否改为抽屉/分段导航属产品决策 |
| D-5 | 本页是否纳入 `canonical-verify.yml` 自动验证 | 需要真实服务 + Chromium，CI 环境是否具备待确认 |

---

## 七、诚实边界

- 本次**没有**做视觉主观评审（构图、留白节奏、色彩情绪）。只修了可测量的缺陷：
  内容被裁、内容不可达、字号低于可读下限、后端细节过度暴露。
- 「好不好看」没有结论，也没有被声称有结论。
- 截图已抓取至 `.project-local/tmp/workbench-shots/`（16 张），但审计者**未对截图做视觉判读**
  （当前模型不读图），本报告结论全部来自 DOM 几何测量，不来自看图。
