# DL-CI-004 — Release exact-SHA gate

- 任务：DL-CI-004 Release exact-SHA gate
- 状态：🔄 配置就绪（E3/验收前置未完成前不启用）

## 门禁定义

Release 必须同时满足：
1. CI run、artifact、SHA 回读一致（exact-SHA）
2. 人工审批（DL-REL-001 验收通过）
3. clean worktree
4. boundTreeSha + exact command + environment + readback 证据齐备

## 前置（未满足 → 保持未启用）

- DL-REL-001 人工可视验收（UI/UX、平面、3D、游戏视觉各 ≥1 有效案例）
- E3 取证（Adobe PS / ComfyUI / MiniMax H3，用户下载安装运行时后）
- ComfyUI 与 MiniMax H3 当前**由用户下载安装，本任务暂停推进**

## 启用流程

1. 全部 E3 取证完成 + DL-REL-001 通过
2. `verify_release_evidence.py` 全绿
3. 人工批准发布 → 标记启用
