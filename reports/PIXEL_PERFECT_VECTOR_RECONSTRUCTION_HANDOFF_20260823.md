# DESIGN-LAB 像素级矢量复刻交接摘要 — 2026-08-23

> **HISTORICAL SNAPSHOT — NOT CURRENT EVIDENCE.** **CURRENT LOCAL SNAPSHOT — NOT CLOUD/CI EVIDENCE.** 交接时间：
> `2026-08-23 14:59:20 +08:00`。本文件区分已提交、本地验证、进行中、阻塞、
> 未执行和未发布；不得把计划、手工 smoke 或本地输出提升为 CI、云端或交付完成声明。

## 0. 2026-08-24 当前执行附录（优先于下列历史叙述）

> 本附录只覆盖当前未提交工作树；它不是 GitHub、CI、合并或 Adobe 运行时证据。

- 检查时分支：`codex/pixel-perfect-vector-reconstruction`；已提交 `HEAD`：
  `d2488d2ee185c208a61fa6f67ab72dfcc7f1110d`；本地跟踪 `origin/main`：
  `9468c40ea8b739499b06e80a7edf5d5542659778`；相对关系 `ahead 29 / behind 1`。
- 当前实现仍在工作树中，**未提交、未推送、未合并**；因此不存在可绑定的 exact-SHA CI。
- 全量本地 Python 门禁（当前工作树）：`512 tests / 994.539s / OK`。这是
  `TESTED_LOCAL`，并不等价于 `CI_VERIFIED_EXACT_SHA` 或 `INSTALLED_RUNTIME_VERIFIED`。
- 已新增并本地验证：分层候选与融合、修复迭代、Adobe 作业/授权/静态适配器安全边界、
  对抗输入防护、六案例权利清晰黄金语料、8GB 路由与 NDJSON 计时记录、失败闭环的发布证据合同。
- `qualify_reconstruction_runtime.py` 只接受宿主产出的三次运行记录并验证预览/read-back
  SHA 与清理残留；本地 CLI 回归测试通过，但它不自行制造 Adobe 运行结果。
- 黄金语料为六张从 `design-lab/evals/reconstruction/sources.json` 生成并冻结 SHA-256 的
  原创程序化 PNG；语料拓扑/权属/哈希/反参考图覆盖验证为 `PASS`。其案例
  `executionStatus` 仍为 `NOT_EXECUTED`，不能声称六张图已完成复刻。
- 性能配置明确为 `measurementStatus: UNMEASURED`：尚未采集每 profile 至少 3 次冷启动、
  5 次热启动的六案例真实样本；没有伪造 p50/p95/显存结论。
- 发布投影 `reports/current/RECONSTRUCTION_CAPABILITY.json` 明确为 `NONCURRENT`。发布校验
  必须同时获得相同 SHA 的成功 CI、六案例 PASS、Illustrator PASS 与真实宿主运行记录；当前缺任一项即 fail-closed。
- 已知执行器错误已排除：后台测试首次因 Python `-c` 参数被 PowerShell 拆分而报
  `SyntaxError: import`，后以正确引号重启；目录创建使用 `New-Item -LiteralPath` 的参数不兼容
  也未影响既有 `.hermes` 目录。两者均为启动包装错误，不是产品或测试回归。

### 当前仍需真实运行/交付的闭环门

1. 以已资格化的本地模型和真实参考输入，执行六个黄金案例并产出每项质量/可编辑性证据。
2. 在经单次会话授权的 Illustrator（及需要时 Photoshop）中完成三次干净装配、保存、导出、重开与 read-back；记录同一 Git SHA。
3. 对六案例采集性能冷/热样本，写入硬件 ID、样本量、p50/p95、峰值 VRAM 与工作集；之后才可校准阈值。
4. 显式授权后提交、推送、合并；对合并 SHA 执行并读取 GitHub CI，随后再生成当前发布投影。

## 1. 当前 Git 状态

- 主项目：`D:\All projects\DESIGN-LAB`
- 当前分支：`codex/pixel-perfect-vector-reconstruction`
- 当前 HEAD：`98157cca050e811e50678298b1ed7e84b3bf16b1`
- 本地 `origin/main` 跟踪引用：`9cfe83237cd24b7870ad462d3337a45ee22e6785`
- 当前分支相对该本地引用：`ahead 27 / behind 0`
- 本地 `main`：`9468c40`；不要把它与 `origin/main` 或当前功能分支混称为“本地”。
- Remote：`git@github.com:DTALEX66/DESIGN-LAB.git`
- 当前功能分支 **未 push，未做 live remote SHA readback，未执行 exact-SHA CI，未合并**。
- 交接文件创建前主工作树 clean；本交接文件本身尚未提交。

27 个本地功能分支提交从已批准规格/计划开始，当前实现端点为：

| 层 | 当前提交 | 状态 |
|---|---|---|
| 规格与四份计划 | `3ea23f0..77e3778` | 已提交 |
| C1 闭合 RIR/run contracts | `f5f9fc9..299c373` | 已提交 |
| C2 intake/normalization | `0c0e113..8f76379` | 已提交 |
| C3 sanitized SVG | `3b06d21..e137c82` | 已提交 |
| C4 deterministic fidelity | `ce2eba6..ee0a822` | 已提交 |
| C5 resumable pipeline | `4c71bfb` | 已提交 |
| C6 evidence bundle | `a34ebec` | 已提交，独立审查 clean |
| A1 provider SPI/registry | `0ec071f` | 已提交，独立审查 clean |
| A2 OCR/UI/geometry/font | `98157cc` | 已提交，独立审查 clean；组合 full gate 未闭合 |

保留的隔离工作树均 clean：

- `.hermes/w/a1` → `codex/a1-provider-spi@e879a9c`
- `.hermes/w/a2` → `codex/a2-semantics@36672f5`

## 2. 已验证的代码门禁

### C6 与 A1 集成前后

- C6 最终独立审查：`ACCEPT — 0C / 0I / 0M`。
- C6 full Python：`438/438 PASS`，`660.483s`。
- C6 bundle fixture：
  `RECONSTRUCTION_BUNDLE=PASS artifacts=12 state=PIXEL_VERIFIED_DETERMINISTIC`。
- C6 canonical：`45/45 PASS`。
- License coverage、asset governance、external asset index：全部 PASS。
- A1 最终独立审查：`ACCEPT — 0C / 0I / 0M`。
- A1 隔离树 full Python：`424/424 PASS`，`127.398s`；canonical `44/44 PASS`。
- C6+A1 主树交叉门：provider `20/20 PASS`、bundle fixture PASS、canonical `45/45 PASS`。

### A2

- A2 最终独立审查 Round 5：`ACCEPT — 0C / 0I / 0M`。
- Targeted：semantics `13/13 PASS`、provider regression `20/20 PASS`、focused `3/3 PASS`、
  `py_compile` 与 scope/residue PASS。
- A2 已集成到主树 `98157cc`。
- **组合 full Python 尚未闭合：**会话 `47652` 在交接时仍运行；输出流已出现
  `F.F`（至少 2 个失败），但最终 traceback/summary 尚未产生。项目 venv 进程
  `PID 3872` 与底层 runtime `PID 28028` 在交接时仍存在。不要把该 full gate 标为 PASS；
  也不要在没有最终堆栈前猜测根因或重复启动另一套 full tests。

精确解释器：
`D:\All projects\DESIGN-LAB\.hermes\task-runtime\reconstruction-dev\.venv\Scripts\python.exe`
（Python 3.12.13）。

## 3. MiniMax H3 / ComfyUI 15 秒视频

状态：**TESTED_LOCAL / PASS**。

- 成片：`.hermes/task-artifacts/h3-alice/h3-alice-15s-final.mp4`
- SHA-256：`55D24312EF0BC7A9F731F5305EEDC8E12A786B0A1C6FA013C15C56D5362D4ED8`
- 13,000,062 bytes；H.264 1024×576、24 fps、360/360 帧；AAC 32 kHz stereo。
- 视频、音频、容器均 `15.000000s`。
- 三镜头：Shot 1 T2V；Shot 2/3 以前段末帧 I2V 接力；无 OOM、无降级、无生成重试。
- 全流解码、black/freeze/silence、时间线抽帧目检均 PASS。
- ComfyUI 仅本地 `127.0.0.1:8188`；任务启动的 PID 4492 已停止。
- 动态 WebP 与 FFmpeg 8.1.2 的兼容问题已用 Pillow 全帧 PNG 桥接闭环。

证据：

- `.hermes/task-artifacts/h3-alice/FINAL_REPORT.md`
- `.hermes/task-artifacts/h3-alice/evidence/final-validation.json`

## 4. 八类参考图基准

来源库：`D:\All projects\Design assets\benchmarks\pixel-reconstruction-v1\`

状态：**TESTED_LOCAL / PARTIAL**。

- 来源、许可、ATTRIBUTION、metadata、SHA：`8/8 PASS`，源文件最终回读未变。
- C1–C5 targeted：`153/153 PASS`。
- 7/8 生成 reference raster。
- 3 个原生 SVG：两次 resvg 哈希一致；这只证明源渲染确定性，不是复刻完成。
- 4 个 JPEG 均生成 VTracer SVG 与 resvg readback，但都未达到 0.995 像素门：
  - poster：MR `0.931811` / SSIM `0.768126`
  - ecommerce：MR `0.816582` / SSIM `0.688928`
  - brand：MR `0.927802` / SSIM `0.687606`
  - UI：MR `0.925683` / SSIM `0.915161`
- 3D ZIP：CRC/路径安全 PASS；本机未发现 Blender，`BLOCKED_NO_BLENDER`。

证据：

- `.hermes/task-artifacts/reconstruction-benchmark-v1/REPORT.zh-CN.md`
- `.hermes/task-artifacts/reconstruction-benchmark-v1/benchmark-results.json`

结论：单次自动描摹只能作为下限；成熟方案必须是 OCR/规则几何/矢量候选/透明语义层
混合，再由 C4 diff 门和后续 Adobe native read-back 迭代。

## 5. Adobe LIVE 状态

### Illustrator 2025

状态：**PASS_LIVE_MANUAL_SMOKE**，不是 adapter/E3 完成。

- 在唯一 Illustrator 2025 窗口新建 1920×1080 RGB 测试文档。
- 绘制矩形、椭圆两个可编辑原语。
- 保存原生 AI 并导出 SVG、透明 PNG：
  - `illustrator-live-smoke.ai`：227,477 B，SHA
    `CDB8DC4833330074E48E388726647C3E5A41106D8D15F2BEC9E44E4DC7569FC5`
  - `illustrator-live-smoke.svg`：1,264 B，SHA
    `3E706BF868C4872B4FFF579FFD74D197E3FE770C6E3E57BFDE122D6AB7861877`
  - `illustrator-live-smoke.png`：15,796 B，1125×500 ARGB，SHA
    `8F0A247809E94807FE55C8B272B78FA490755EC778695D9DD5658139BCB93F25`

### Photoshop 2025

状态：**BLOCKED_COMPUTER_USE_STATE_CAPTURE_TIMEOUT**。

- 两次均能枚举唯一 Photoshop 2025 窗口。
- 两次 fresh `get_window/get_window_state` 都无返回，第二次约 228.6s 后安全中断。
- 0 次 Photoshop 文档输入，0 个 PSD/PNG 产物；窗口/模态/文档状态 UNKNOWN。
- 不能据此判定 Photoshop 产品失败，只能判定本次 Computer Use 状态捕获阻塞。

证据：

- `.hermes/task-artifacts/adobe-live-smoke/REPORT.zh-CN.md`
- `.hermes/task-artifacts/adobe-live-smoke/live-smoke.json`

### 更稳的 Adobe 操控路线

- “纯截图+鼠标”应降为启动、异常恢复和目视读回层，不应承担生产对象编辑。
- 首选原生脚本/插件执行确定性对象操作：Illustrator COM/ExtendScript/JSX，
  Photoshop UXP/`batchPlay`（必要时用 COM/JSX 兼容桥），再由 Python/MCP 做任务编排、
  哈希、像素比较与证据打包。
- 本地历史快照 `reports/V42_HANDOFF_SUMMARY_20260822.md` 记录 Photoshop 2023 COM
  fixture 曾真实通过、Illustrator 2023 COM 版本/空文档读回通过；这是历史线索，**不是 2025
  当前验证**。应先用 2025 做最小 COM/JSX/UXP capability probe，再落 D1–D4 adapter。
- 官方网络调研任务在用户请求交接时被中断，未形成可引用的研究报告；下一任务应先完成
  官方 Adobe 文档/样例的 2025 控制面核验，再选最终实现。

## 6. 外置库与已验证工具

- 主项目：`D:\All projects\DESIGN-LAB`
- 设计资料：`D:\All projects\Design assets`
- 共用模型：`D:\All projects\Model library`
- 设计外置工具：`D:\All projects\Design External Configuration`
- OS 共用外置配置：`D:\All projects\OS External Configuration`
- resvg 0.47.0：
  `D:\All projects\Design External Configuration\toolchains\resvg\v0.47.0\resvg.exe`
  SHA `433a7c744cff561ed64fcf73c7c04e239d7a07ae5f0aadbf1ba8471d63707402`
- VTracer 1.0.0-alpha.3：
  `D:\All projects\Design External Configuration\toolchains\vtracer\1.0.0-alpha.3\vtracer.exe`
  SHA `83d9df564119f1d21719f358c02b77372dd40e34373cc7a47b9dcc3014e7c587`
- FFmpeg 8.1.2：
  `D:\All projects\OS External Configuration\10-toolchains\scoop\apps\ffmpeg\current\bin\ffmpeg.exe`

## 7. 本轮错误与处置台账

### 7.1 核心 C6 evidence bundle

| 审查轮 | 发现 | 根因/影响 | 处置与当前状态 |
|---|---|---|---|
| Round 1 | 2 Critical + 3 Important | 未真实重渲染/重算；本地 JSON 可合成 `DELIVERY_READY`；结构、provenance 与 dirty source 绑定不足 | 增加 C3→C4 真实链、preview/metrics/diff 重算；本地永远不能合成 `DELIVERY_READY`；严格 source/provenance/dirty-tree 闭合 |
| Round 2 | 3 Important | primitive/group/raster 投影不够精确；metrics/隐私扫描不闭合；execution closure 硬编码不完整 | 精确对象投影、metrics closed shape、控制 JSON 全扫描、动态 execution closure 与 HEAD/blob/current 绑定 |
| Round 3 | 3 Important | recorded canvas background 无法表示；`sourceBounds` 错等同局部 crop；相对 `home/`、`tokenizer` 等被误报 | 背景 exact SVG 投影；normalized source 与局部 crop 分离；隐私规则改为路径上下文和精确键边界 |
| Round 4 | 3 Important | 允许零尺寸 raster target；漏 API key/client secret/Bearer；closure 不递归 providers 且漏 gate script | raster 两轴严格 `>0`；扩展敏感分类；closure v3 递归 local/HEAD 并覆盖 scripts/config/tests |
| Round 5 | 0C/0I/0M | — | 独立 `ACCEPT`；C6 full、bundle fixture、canonical、治理门均 PASS |

审查过程中两项 focused test 曾因主树 `.hermes/task-runtime/reconstruction` 写权限返回
`ENVIRONMENT_FAIL`。该错误没有被误判为产品回归；后续将 TEMP/TMP/run root 绑定到项目可写
`.hermes`，targeted `34/34 PASS`。

### 7.2 A1 provider SPI / registry

| 审查轮 | 主要错误 | 处置与当前状态 |
|---|---|---|
| Round 1：5I | 未资格化 provider 在特定哈希/remote 条件下可误报 READY；remote 无逐文件 contract；无候选事件缺失/任务错绑；祖先 junction/hardlink/TOCTOU；warnings/events 未闭合 | READY/load 只允许 QUALIFIED+license+完整 preflight；remote exact contract；`NO_PROVIDER`；全链/reparse/hardlink/stat identity；闭合 diagnostics |
| Round 2：3I | 哈希期间新增 hardlink；括号/等号上下文绝对路径绕过；`prompt=`/`session=` 敏感赋值绕过 | `st_nlink` 与 hash 后全链重验；路径 token 边界；normalized assignment denylist |
| Round 3：1I | `sessionData/authHeader/privateData` 等派生敏感键仍可通过 | 闭合 session/auth/private 家族，并保留窄 telemetry allowlist |
| Round 4：1I | 允许表遗漏合法 `sessionElapsed`，形成过严误报 | 仅加入 exact `sessionelapsed`，不放宽 `session*` 默认拒绝 |
| Round 5：0C/0I/0M | — | 独立 `ACCEPT`；A1 full `424/424`、组合 provider/bundle/canonical PASS |

A1 初建隔离工作树时还遇到 Windows 路径过长；将工作树缩短为 `.hermes/w/a1` 后，baseline
`404/404 PASS`。这是环境路径问题，不是产品代码失败。

### 7.3 A2 semantics / font / OCR

| 审查轮 | 主要错误 | 处置与当前状态 |
|---|---|---|
| Round 1：5I | 非方形 canvas 的 circle radius 语义错误；单点背景推断裁掉 full-canvas 内容；字体 family 会搜索系统字体且祖先 junction 可越界；仅捕获 `MemoryError`，真实 CUDA OOM 外泄；OCR runner/JSON 无界；OmniParser 非 UI 可被误授权 READY | 统一全局坐标/radius；显式授权 font path/root 与全链/TOCTOU；明确 OOM 转换；检测数/文本/polygon/bytes 上限；Omni ui-only/强制 `LICENSE_DENIED` |
| Round 2：3I | 横向 full-canvas gradient 仍被裁边；Paddle validation/size 失败遗留 proposal 或抛非结构化异常；Omni `profile=None` 仍调用 registry | 横/纵 full-canvas gradient exact bounds；staging/补偿清理/structured DEGRADED；仅 `profile=='ui'` 才进入 registry |
| Round 3：1I | stage 只在 write/flush/fsync 成功后才标记 created，I/O 失败会残留并阻断重试 | 独占创建后立即记录 ownership，覆盖 write/flush/fsync/close 失败 |
| Round 4：1I | ownership 仍依赖可失败的路径 `stat`，存在 handle/path 身份窗口 | 用打开句柄 `fstat` 绑定 owner；cleanup 用 `lstat/stat` 对照 handle identity，失配硬失败且不删除非自有 stage |
| Round 5：0C/0I/0M | — | 独立 `ACCEPT`；targeted/focused/pycompile PASS |

A2 隔离树第一次 full gate 由执行宿主中止，留下零 CPU 子进程；未把它计为 PASS，也没有杀共享
进程，子进程随后自然退出。集成后的主树 full gate当前又已观察到 `F.F`；最终堆栈仍未产生，
所以目前只能登记为“至少两个失败、根因未知”，禁止凭审查通过推断组合全量通过。

### 7.4 H3 / ComfyUI

| 错误 | 根因 | 处置/状态 |
|---|---|---|
| Shot 3 首次 HTTP 400 | I2V 输入节点要求 basename，误传完整路径；请求未入队、未采样 | 改传 `shot2-last.png` 后成功；不计为生成重试 |
| FFmpeg 8.1.2 无法直解 ComfyUI/Pillow animated WebP | 解码器互操作问题；Pillow 可逐帧完整解码，历史样本也复现 | Pillow 提取全部帧为 PNG，再交 FFmpeg；最终 360/360 帧和媒体门 PASS |

### 7.5 Adobe / Computer Use

| 错误或中断 | 根因/证据 | 处置与当前状态 |
|---|---|---|
| 初次未发现运行窗口 | AI/PS 当时 `isRunning=false`，与用户更早的“已打开”状态已漂移 | 后续用户重新打开，唯一 AI/PS 2025 窗口均可枚举 |
| 首次启动 approval timeout | Computer Use 应用批准超时，不是 Adobe 崩溃 | 未绕过批准层；用户重新明确授权后恢复 |
| 两次物理 Esc stop | Computer Use 明确回报用户按下 Escape；旧 observation 不可复用 | 每次立即停止；用户 fresh reauthorization 后重新初始化 |
| Illustrator 导出 PNG 为 1125×500 而非 1920×1080 | 导出时未选“使用画板”，PNG按图稿边界输出 | 已在证据中注明；不误报画板尺寸错误 |
| Photoshop 两次状态捕获长期无返回 | 唯一窗口可枚举，但 `get_window/get_window_state` 无结果；第二次约 228.6s | controller 安全中断；0 PS 输入/产物；状态为 Computer Use capture blocker，不判 Photoshop 产品失败 |

本轮纯 UI 路线的高延迟和状态捕获不稳定，证明它不适合承担生产对象编辑。历史 COM 线索应作为下一轮
原生脚本/UXP 调研入口，但尚未完成 2025 官方资料核验。

### 7.6 八图、工具和执行环境

- 4 个 JPEG 的 VTracer 基线全部低于像素门；这是算法下限，不是命令失败。
- 3D ZIP 安全审计 PASS，但未找到 Blender，明确 `BLOCKED_NO_BLENDER`。
- 项目要求的 `scripts/workflow/execution_preflight.py` 实际不存在；改用精确 venv 和显式
  `jsonschema/Pillow/NumPy/scikit-image` import/version preflight。不得伪报项目 helper 已运行。
- Workflow Assistance skill 路径读取被权限边界拒绝；没有提权读取私有 agent 目录，继续依照
  项目 `AGENTS.md`、公开技能和仓库证据执行。这是正确边界行为。
- 一次 PowerShell `rg ... *.md` 因 Windows wildcard 解析返回路径语法错误；后续使用 `rg --files`
  再过滤，未影响仓库内容。
- full tests 中 `example.test/missing.css` 的 partial/abort 输出是既有测试 fixture 的预期路径，
  不能单独视为网络或产品失败；最终 unittest summary 才是门禁。
- Adobe 官方网络调研代理因用户切换为“写交接摘要”而被中断，没有生成报告；不能伪称已完成调研。

## 8. 后续任务（按闭环顺序）

1. **先闭合当前 A2 组合 full gate。**等待会话 47652 输出最终 summary/trace；只针对失败做
   最小复现和根因调试。修复后跑 affected targeted，再跑一次 full + canonical + bundle closure。
2. **完成 Adobe 官方控制面调研。**优先验证 Illustrator 2025 COM/JSX/ExtendScript 与
   Photoshop 2025 UXP/`batchPlay`/兼容桥，形成正式架构裁决；Computer Use 退为辅助层。
3. **A3 semantic RGBA decomposition。**LayerD → SAM2+BiRefNet fallback，透明紧裁、
   z-order、遮挡 inferred 标注；无模型时 fail-closed，不下载。
4. **A4 vector candidates + hybrid fusion。**VTracer 实跑；StarVector 仅资格化后启用；
   sanitizer、局部指标、5% raster budget、anti-overlay。
5. **A5 diff-guided repair loop。**最多 20 global / 10 local；回归修复丢弃；PARTIAL 不冒充 PASS。
6. **D1–D4 Adobe adapters。**Illustrator native assembly/read-back、Image Trace 候选、
   Photoshop UXP 分层准备与 run-relative handoff；完成三次干净运行与 rollback/residue 证据。
7. **八图完整复刻。**对 8 类逐一生成 RIR/SVG/透明层/native AI/read-back/metrics/evidence；
   当前 4 个 VTracer PARTIAL 不是完成。3D 项需先安装或定位 Blender（单独授权）。
8. **H1–H5 hardening/release。**六/八案例资格、三跑重现、性能、对抗安全、恢复、release evidence。
9. **发布闭环。**最终 clean diff → full/canonical → exact commits → push 功能分支 → remote SHA
   readback → PR/exact-SHA CI → merge → main SHA/CI readback；只有此时才可声明云端与本地一致。
10. **知识迁移继续延后。**按用户指令，直到上述验收闭环后再执行。

## 9. 禁止误报

- 当前不是 `DELIVERY_READY`。
- 当前不是云端/本地双端一致。
- H3 本地 PASS 不等于 CI/发布。
- Illustrator 手工 smoke 不等于 D1/D2 adapter 或完整 E3。
- A2 独立审查 clean 不等于组合 full gate PASS；当前 full 流已出现失败。
- 8 图来源审计/原生 SVG repeat render 不等于八图完整复刻。
- 不得将未安装模型标为 READY；当前 VTracer 可用，其余按 registry 的
  MISSING / UNQUALIFIED / LICENSE_DENIED / DISABLED 状态 fail-closed。
