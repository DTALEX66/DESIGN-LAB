# START HERE — OPEN-DESIGN-Assistance（唯一入口）

> 本文件是唯一的项目总入口。V4 已替代所有旧 V2/V2.1/V3 活动入口（见 `project-memory/V4_INHERITANCE_MATRIX.md`）。

## 定位
以 **Open Design 为主入口**，模型中立、风格中立、领域中立、工具中立、权利安全的**专业设计智能与视觉质量平台**（`project-memory/PRODUCT_DEFINITION_V4.md`）。

Open Design 拥有 Studio/画布、Agent 启动、插件/Scenario/Atom 运行、Artifact、预览与导出；本仓库负责专业设计方法、Domain Pack、视觉质量、来源权利、生产预检、可编辑交付、Benchmark 与证据。

## 唯一权威任务包
当前唯一活动执行入口是 **V4 Authoritative TaskPack（命名空间 `ODA4-*`）**。所有旧 V2/V2.1/V3 任务卡均为历史参考，禁止机械重跑。

## 三个公开入口
1. `commercial-design-core` — 商业设计路由与核心
2. `visual-quality-core` — 视觉质量与去 AI 味
3. `production-handoff` — 生产预检与可编辑交付

内部 21 个 Atom 是可测试组件；7 个旧插件为兼容适配器（见 `config/entrypoint-convergence.json`）。

## 能力索引（机器 SSOT 生成）
- `opendesign-assistance/config/CAPABILITY_INDEX.md`
- `opendesign-assistance/config/product-manifest.json`（SSOT）

## 验证链
```bash
python opendesign-assistance/scripts/verify_open_design_assistance.py
python scripts/run_python_tests.py
cd minigame-runtime && npm test && node scripts/check-android-drift.mjs
```

## 证据分级
无 E3 不称运行可用；无 E4 不称发布完成；无 E5 不称商业验证完成。

## 边界
- 不访问 E:\；不读凭据；不写项目外目录。
- 默认不 commit/push/PR/merge/tag/release，停在 `READY_FOR_USER_APPROVAL` 等待授权。
