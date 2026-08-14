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

- 最近一次自动化验证基线：`496f758fbd450c750d60c596efd17de260bfea1a` 已推送，Canonical 15/15、Python 168 passed、MiniGame 319 passed；exact-SHA CI run `31820748499` 已成功
- 本轮证据边界修复已提交为 `91aa2db`（CI 待回读）：新增 `reports/` 历史快照边界、三份敏感历史 E3 报告的 fail-closed 标记，以及 capability evidence verifier 的回归门禁；当前 targeted verifier tests `49 passed`
- 当前 Git 树未跟踪 `docs/current/TASK_GRAPH_V2.yaml`，也没有活动文件引用该路径；不依据旧交接文本推断或伪造当前任务图，任务 SSOT 以本路线图、产品 manifest 和 capability index 为准
- 前端入口验证：MiniGame `verify-all --summary` 的 tests/WeChat/Douyin/skins/V5 全部通过；Android debug build 与 APK metadata 因工具链未安装保持 `SKIP`，Douyin 仅保留 release AppID warning
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
| Phase 7 style-master-method | 497 master records / 77 method cards 的来源核验与方法卡闭环 | 另立范围；当前 E0，不阻塞本轮结构 gate |

## 推进规则

- 未授权不 commit/push/PR/merge；本轮用户已授权代码/文档修复的 commit/push/PR 收尾，但人工验收与真实运行仍不可代做
- MiniMax H3、ComfyUI 及 H3-Comfy bridge 继续冻结，不纳入本轮推进

