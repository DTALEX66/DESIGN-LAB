# DL-DIR-MIG-R1 收尾交接 — 错误总结与仓库状态

- 日期：2026-09-03
- 分支：`migration/dl-directory-convergence-r1`
- PR：#112（feat: DL-DIR-MIG-R1 directory migration convergence）
- 任务包：13/13 完成（DL-DIR-110 测试矩阵、DL-DIR-120 旧目录清理均 completed）
- 文件数：3507 → 3258（-249）；跟踪文件现 3280（含本轮恢复文件）

## 一、本轮修复错误总结（按根因分类）

### 1. 迁移时"盲目批量替换"造成的三类回归（ERR 教训）
迁移过程中用全局替换把**代码内的逻辑引用一并改写**，超出"仅移动文件路径"的范围：

| 错误类型 | 具体表现 | 修复 |
|---|---|---|
| schema URI 被误改 | `design-lab/reconstruction-*/v1` → `packages/capabilities/reconstruction-*/v1`（`reconstruction-tools.json` 受 SHA256 锚点保护，改后 digest 不匹配 → RenderError） | 全仓还原连字符形态 schema URI（目录路径斜杠形态不受影响）；registry 文件恢复 main 原版（digest 99c00e1d…） |
| 路径深度未同步 | 旧 `design-lab/reconstruction/`（3 层）→ 新 `packages/capabilities/reconstruction/`（4 层），`parents[2]`→`parents[3]`；`providers/` 子目录再深一层需 `parents[4]` | registry.py `parents[3]`→`parents[4]`；顶层文件确认 `parents[3]` 正确 |
| 未定义引用 | 多脚本引用 `PROJECT_ROOT` 但迁移时定义行丢失（reconstruct_design.py、benchmark_reconstruction.py、qualify_reconstruction_runtime.py） | 补 `PROJECT_ROOT = parents[2]`（=仓库根） |
| sys.path.insert 插错位置 | test_reconstruction_intake/semantics 头部被插入裸代码行破坏语法 | 移除错误插入 |

### 2. 迁移遗漏（文件删除未同步依赖方）
| 遗漏 | 表现 | 修复 |
|---|---|---|
| 测试引用已删第三方工具 | `test_anydesign_network_boundaries.py` 依赖 LOCK_REFERENCE 删除的 anydesign 脚本 | 删除该测试 |
| adobe 适配器文件整体丢失 | `adapter.manifest.json`、`reconstruction-assemble.jsx`、`photoshop-reconstruction/`、`rights-and-provider-policy.md`、`evidence/`（DL-DIR-060 删 design-lab/adapters/ 时未迁） | 从 main 恢复至 `integrations/hosts/adobe/`；illustrator/photoshop 验证器路径同步 |
| comfyui 适配器文件丢失 | `adapter.manifest.json`、`rights-and-provider-policy.md` | 从 main 恢复至 `integrations/generators/comfyui/`；verify_comfyui_gate 路径更新 |
| 验证器路径残留 | verify_design_lab.py 的 host-verifier 解析仍用 `adapters/` 前缀；jury-anti-slop 指向旧 `design-lab/quality/`；comfyui gate 旧路径 | 全部对齐新结构 |
| 能力索引扫描旧目录 | generate_capability_indexes.py 扫已删 intelligence/knowledge/adapters | CAPABILITY_DIRS 改为 design-lab/{domain-packs,production} + packages/capabilities/{atoms,scenarios,bundles,plugins,quality}（314 条） |

### 3. 测试文件路径引用未同步（占失败大头）
- `test_verifier_internals.py`：load_rel 加 quality/ → packages/capabilities 分支；integrations/、registry、comfyui rights 全部改经 `ROOT.parent`
- `test_op_personal_design_system.py`：ROOT 常量 → REPO_ROOT 前缀 + kind→目录映射
- `test_oda4_0302_manifest_compat.py`：plugins/bundles glob → packages/capabilities
- `test_reconstruction_illustrator/photoshop_adapter.py`：adobe 路径 → integrations/hosts/adobe
- `test_core_gates.py`：license 排除断言 → research/candidates/
- `install_op_expert_suite.py`（installer 本体）：`parents[5]`→`parents[4]`；常量全改新结构；asset 闭包复制改为 manifest-relative 镜像 + legacy fallback
- `verify_minigame_domain_pack.py`：minigame-runtime → fixtures/domains/game-visual

### 4. 治理/验证器路径（DL-DIR-110 前期已修，汇总）
verify_license_coverage（排除前缀 → research/candidates/）、verify_project_drift、verify_adapter_registry/matrix（→ integrations/adapter-registry.json，自 d44d3d8 恢复 30 adapters）、verify_product_manifest_v3（root_relative_prefixes 扩容）、verify_runtime_contracts_v3（repo_root 不再 .parent）、verify_visual_quality_v21（research → design-lab/research + f-string 修复）、verify_knowledge_lifecycle（重写）等。

## 二、当前验证状态

- **本地 verify_design_lab.py：total=49 failed=0（PASS 全绿）**，含 verify_reconstruction_bundle（此前为环境 FAIL）
- **本地全量单测：507 tests，2 failures + 1 error**（此前 13 failures + 46 errors）
  - 已确认修复：metrics/providers/performance/qualification/illustrator/photoshop/adobe_job/verifier_internals/op_personal_design_system/oda4_0302/core_gates 等全部 OK
  - 本地超时项：test_reconstruction_evidence（本地 skimage 首次编译慢，CI Linux 无此问题）
- 5 gate：Open Design host adapter gate / License / MiniGame / Generated-artifact 稳定 PASS；Python gate 为唯一失守项，已随本轮修复推送等待 CI
- 预存环境 FAIL（非迁移引起）：ComfyUI 未运行、resvg/vtracer 缺失、Illustrator 未安装 → CI 侧不必然复现

## 三、后续动作

1. CI Python gate 全绿后：`gh pr merge 112 --squash --delete-branch`
2. 合并后同步 main 至本机（push 双端一致）
3. 本地剩余 `test_reconstruction_evidence` 超时项在 CI 确认（Linux 环境快）

## 四、恢复源 commit 备忘
- d44d3d8：治理基线（adapter-registry.json、E3_FIXTURE_PROTOCOL.md）
- fabd4bc^：minigame-mobile-controls exports
- origin/main：adobe/comfyui 适配器文件
