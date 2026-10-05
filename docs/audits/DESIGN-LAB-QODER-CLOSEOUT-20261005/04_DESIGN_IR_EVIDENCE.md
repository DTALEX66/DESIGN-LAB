# 04 — C2 Reference → Design IR

对应任务：`DL-R5-013`（真实参考对象分析与设计计划）。基线：`qoder/designlab-m1-closeout-20261005`。

## 审计结论（先读代码再动手）

链路两端早就存在，但**从未对接**：

| 段 | 既有实现 | 状态 |
|---|---|---|
| Reference 归一化 / 分块 / profile | `packages/capabilities/reconstruction/intake.py` | 已有 |
| 语义对象计划（Plan） | `src/design_lab/analysis/decomposition.py`（`Plan` / `PlanObject`，内容哈希稳定 `object_id`、`mapping_state`、`font_status`） | 已有，**只到 Plan 为止** |
| 可编辑 IR | `design-lab/schemas/reconstruction/reconstruction-ir.schema.json`（`design-lab/reconstruction-ir/v1`）+ `contracts.validate_rir` | 已有 |
| 宿主 lowering | `adobe_lowering.lower_layers` → `adobe_job.build_adobe_job` / `build_photoshop_job` | 已有，且 Illustrator 侧有历史 E3 记录 |
| 对象级 patch | `native_patch_plan.py` + `native_patch_submissions.py`（按 `id` 定位、要求先有 RECEIPTED attempt） | 已有 |
| **Plan → RIR** | —— | **缺失（本次补上）** |

`pipeline.run_reconstruction` 只 `_load_explicit_rir`，即“消费一份已经写好的 RIR”，
不会从参考图导出 RIR；`design-ir-v2.schema.json`（含 rights/revision/components）
经 grep 确认**零代码消费者**，是死合同，不能当既有能力宣传。

## 本次实现

新增 `src/design_lab/analysis/plan_to_rir.py`（commit `c3e43ea`）：
`plan_to_rir(plan, raster_path=…, project_root=…, style_overrides=…) -> reconstruction-ir/v1`，
产出即时 `validate_rir` 失败则抛错（fail closed）。

诚实性约束（都有对应测试）：

- **stable object IDs**：`PlanObject.object_id` 原样成为 RIR 节点 `id`，不改写、不加前缀，
  因此现有 `/patch` 路径可直接按 id 定位（测试 `test_ids_are_carried_over_for_object_level_patch`）。
- 每个节点 `inferred: true` + `confidence{score,method}` + `provenance{sourceId,evidence}`；
  分析没看见的东西一律不写：
  - 字体未匹配 → `fontCandidates: []` + `repairHistory: USER_CORRECTION_REQUIRED`，不编造 family/weight；
  - 无 traced polygon 的 shape → `primitive rect` + 明确 reason
    “bounds substituted for geometry”，不冒充描边几何；
  - `occlusion/unknown/group` → 空 `group` + `USER_CORRECTION_REQUIRED`，
    不生成假背景层；
  - 颜色从不猜测 → `style: {}`。
- `raster` 节点只指向项目相对路径的源图，绝对路径直接由合同拒绝。

## 反向边界也被钉住

`PlanToAdobeLoweringTests`：

- 未补字体/填充时，`build_adobe_job` 以
  `solid RGB hex fill required` / `unexpected native object fields` 拒绝该 IR
  —— lowering 不会替用户猜颜色或字体；
- 补上用户提供的 `text_styles` 与 `style_overrides` 后，同一 IR 成功 lower 成
  合法 Illustrator job，job 层里对象 id 仍是 `ocr-1` / `s-1`。

## 证据等级与未做的事

- 本项为 **E1 结构 + 合同级集成**（schema 校验 + 真实 lowering 函数消费）。
- **不是 E2**：未跑真实 OCR/描边 provider（`defaultEnabled:false`，ONNX 环境未接入本链）。
- **不是 E3**：未启动 Illustrator/Photoshop（owner 本轮只授权只读探测）。
- 三类真实 Reference fixture（文字+几何海报 / 照片+蒙版+文字 / 复杂合成）
  仍为 `executionStatus: NOT_EXECUTED`，未冒充已验收；
  `design-lab/evals/reconstruction/cases/` 六个 golden 未改。
- 未新增第二 IR runtime、未启用 `design-ir-v2`、未新增 HTTP 路由：
  Workbench 侧尚无“从参考图一键出 IR”的入口，故
  `DL-R5-013` 的 FRONTEND/DELIVERY 轴**未推进**，整体仍是 `PARTIAL`。
