# evals — 评估与验收证据

DL-REL-001：人工可视与生产验收。**UI/UX、平面、3D、游戏视觉各至少一个有效案例**。

## 结构

```text
evals/
├─ benchmarks/   # BenchmarkCase（含吸收的 rubrics）
├─ rubrics/      # 质量 Rubric（19 份）
└─ evidence/     # 验收证据（E3 读回记录）
```

## 验收矩阵（DL-REL-001）

| 域 | 有效案例要求 | 当前状态 | 前置 |
|---|---|---|---|
| UI/UX | 至少 1 个真实渲染读回案例 | ⏳ 待验收 | 人工选择案例 |
| 平面 | 至少 1 个可编辑交付案例 | ⏳ 待验收 | Photoshop 运行时（用户下载安装）|
| 3D | 至少 1 个 3D 场景/资产案例 | ⏳ 待验收 | Blender 适配器 E3 |
| 游戏视觉 | 至少 1 个 fixture 视觉回归案例 | ⏳ 待验收 | minigame 多端渲染读回 |

## 证据纪律

- 每案例记录：boundTreeSha、生成时间、执行环境、工具版本、输入 hash、人工审批人
- **不用单张 AI 图作为通过证据**（Quality gate）；官方模拟器/实机截图才为 E3
- 验收通过后才启用 DL-CI-004 release gate

## 当前证据

- `evidence/`：1 文件（E0 合同级占位）
- 全部 E3 读回待运行时就绪（ComfyUI/MiniMax H3 由用户下载安装，暂停推进）
