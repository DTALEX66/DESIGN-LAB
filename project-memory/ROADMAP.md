# ROADMAP — 路线图

- 版本：`1.2`｜状态：`ACTIVE`｜SSOT 角色：路线图契约

## 阶段（按任务包 J 节）

| 阶段 | 内容 | 状态 |
|---|---|---|
| J0 | Freeze / 基线 | ✅ 完成（DL-MIG-000/001/002）|
| J1 | 清除产品漂移（MiniGame fixture、九份 SSOT、根 README）| ✅ 完成 |
| J2 | 内部身份与核心重构（目录、manifest/schema、verifier 入口）| ✅ 完成 |
| J3 | 视觉能力产品化（核心对象、intelligence、domain、quality、production、knowledge）| ✅ 完成（含 Jury V1 + Preflight V1）|
| J4 | 工具适配器（Adapter Registry、Adobe PS、ComfyUI、MiniMax H3）| 🔄 合同/结构验证完成；Photoshop E3 与 Open Design live requalification 待运行时；H3/ComfyUI 按用户要求冻结 |
| J5 | 证据、CI 与交付（evidence index、identity gate、exact-SHA CI、人工验收）| 🔄 Canonical gate 与当前 main CI ✅；**DL-REL-001 人工验收、E4/E5 发布链待完成** |

## 当前基线与本轮审计交付

- 最近一次自动化验证基线：`2021a5bc0ed1279cd5d1cdc5ecee0293e782dde6` 已推送，Canonical 16/16、Python 174 passed、MiniGame 319 passed；exact-SHA CI run `31827866614` 已成功
- 本轮结构证据闭环：`2ea6dcb5302269552f1437316d68a8b0c2732242` 新增 `verify_style_master_method.py` 并接入 Canonical，497 masters / 77 anchor cards / 47 lineages / 47 analysis cards 均通过；style-master-method 从 E0 诚实提升为 E1 structural，Canonical 16/16，exact-SHA CI run `31827742980` 成功；release gate 从 8 项降为 7 项，仍由真实 E2/E3、人工校准和 DL-REL-001 阻塞
- 本轮证据边界修复：`91aa2db` 已通过 exact-SHA CI；`b25c76a` 扩展为全量 `reports/*.md` E3/E4/E5/runtime 声明 fail-closed 门禁；`3f87527` 修复 release gate 只检查人工 marker 的漏洞，`a95f8bb` 补齐新增回归测试 SPDX 头并通过 exact-SHA CI run `31824338318`，现会同时阻断 capability floors（5 项不足）和 Evidence Cards（0/12 accepted）
- 当前 Git 树未跟踪 `docs/current/TASK_GRAPH_V2.yaml`，也没有活动文件引用该路径；不依据旧交接文本推断或伪造当前任务图，任务 SSOT 以本路线图、产品 manifest 和 capability index 为准
- 前端入口验证：MiniGame 319 tests、WeChat/Douyin/skins/V5 检查通过；`verify-all --summary` 现在对缺失 portable Android toolchain 返回 exit 2 / `BLOCKED`，不再把 Android debug build 与 APK metadata 的 `SKIP` 误报为 acceptance pass；Douyin 仅保留 release AppID warning
- 证据索引已按当前树重新绑定；历史 E3 证据不自动继承到新树，visual-quality / creative-toolchain 当前保持 E1
- 身份迁移 R3：旧名 `opendesign-assistance` 已退出活动命名 → `design-lab`（git mv，历史可追踪，见历史归档）
- 九份 SSOT + 13 核心对象 + **9 适配器合同（open-design/figma/penpot/blender/ffmpeg/browser/comfyui/adobe/h3，全部 E0 就绪）** + Visual Quality Jury V1 + Production Preflight V1
- DL-KNW-001 十三批吸收：35 个 MIT/Apache/CC0 设计 SKILL 源码级 vendoring + 7 reference 登记（hallmark/taste-skill/huashu/uiux-pro-max/motion×2/shipit/design-checklist/game-ui/blender/motion-engine/brand×3/design-system-prompt/claude2figma/extract-ds/anydesign/ppt-agent/swiftui/a11y×2/brandbook/logo/ecommerce/motion-forensics/springy/genjutsu/baoyu/ultimate-uiux/hue/qiaomu/interface-design/visual-note-card/affiliate 等）
- SOURCE_REGISTRY 162 条（schema 校验通过）；CAPABILITY_INDEX count=2222
- identity gate / unified verifier（**15 检查**，含 adapter/benchmark/evidence 防漂移）/ MiniGame fixture 边界 / CI 4 gate 全绿
- 评测资产：12 benchmark briefs + 19 rubrics + 12 evidence cards + 评分单模板（DL-REL-001 验收路径就绪）

## 非 MiniMax H3 / ComfyUI 的剩余问题与后续任务

| 任务 ID | 工作 | 前置 |
|---|---|---|
| DL-ADB-PS-001 | Photoshop E3 取证（可编辑 PSD 交付）| Photoshop 订阅与真实运行时 |
| V42-0409 / ODA4-0905 | 五案例真人专业 Jury、偏好测试与 12 卡人工校准 | 用户实际评分，不得由静态/模型自评替代 |
| V42-0410 / ODA4-0907 | 黄金纵切冻结、Evidence Cards 真实运行与 E3 证据 | 0409 通过 + Open Design live runtime |
| ODA4-0906 | 在工程框架之外补充真实视觉失败样本与人工确认 | 0905 人工盲评产生 REJECT 样本 |
| ODA4-0908 | Pareto 的真实延迟/Token/成本数据与回归报告 | 真实运行记录；不得用 manifest 规格字段代替 |
| DL-EVD-001 / creative-toolchain | Open Design 插件/原子重新注册、最小任务、artifact/provenance read-back | Open Design runtime；不涉及 H3/ComfyUI |
| DL-CI-004 → ODA4-1105/1106 | E4 exact-SHA 发布证据、独立复审与最终发布收尾 | 上述人工/E3 前置全部完成并获授权 |
| Phase 7 style-master-method | 497 master records / 77 method cards 的来源核验与方法卡闭环 | 结构层已验证为 E1；来源核验与方法卡闭环仍另立范围，不阻塞本轮结构 gate |

## 推进规则

- 未授权不 commit/push/PR/merge；本轮用户已授权代码/文档修复的 commit/push/PR 收尾，但人工验收与真实运行仍不可代做
- MiniMax H3、ComfyUI 及 H3-Comfy bridge 继续冻结，不纳入本轮推进

