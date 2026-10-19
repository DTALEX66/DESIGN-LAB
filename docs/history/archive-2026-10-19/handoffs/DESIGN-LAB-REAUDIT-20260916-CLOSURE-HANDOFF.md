# DESIGN-LAB 再审计 2026-09-14/15/16｜收尾总交接（CLOSURE HANDOFF）

日期：2026-09-16。分支：`codex/deepseek-authority-r1`。
本文是**收口总交接**，汇总本批次（DL-AUDIT-20260914 结构/门控批次 + 外溢瘦身 + C/D 双盘审计）
的全部 **问题 / 摘要 / 阻塞 / 交接**。与同目录 `DESIGN-LAB-REAUDIT-20260915-HANDOFF.md`
（批次主交接）配套；运行数据在 `.project-local/task-artifacts/`（不入库）。

> 主交接（逐任务交付状态 01–10、瘦身分层、验收矩阵）见
> `docs/handoffs/DESIGN-LAB-REAUDIT-20260915-HANDOFF.md`。
> C/D 外溢审计结论见 `docs/decisions/CD-SPILL-AUDIT-2026-09-16.md`。
> 本文只做**问题/阻塞/交接**收口 + 双端一致性声明，不重复展开逐任务细节。

---

## 1. 摘要（本批次做了什么，按交付状态）

再审计任务包 18 项 + 3 份伴随审计文件 + 用户两条追加指令（外溢瘦身、C/D 双盘严格审计）。

| 工作块 | 交付状态 | 关键产物 |
|---|---|---|
| 任务 01–09 + 10（审计/准备）| 全部落地并本地实证 | 见主交接第 1 节逐项表 |
| 外溢瘦身（`.project-local`）| 4802 → 3158 MiB（净回收 1.64 GiB），TIER-1/2 已删、TIER-3 网络组保留 | `spill-cleanup-tier1/2.py`、`spill-cleanup-report.md` |
| C/D 双盘严格审计 | 完成，**删除集为空**（非本项目外溢一律保留，5 个 taskpack 哈希迁移进库） | `docs/decisions/CD-SPILL-AUDIT-2026-09-16.md`、3 个补入 taskpack |
| 双端一致性 | 本地 HEAD = 远端 ref（见第 5 节，随本提交再校验一次） | — |

操控软件类（任务 11）+ 设计验收类（任务 12–18）按用户指示**本批跳过**，边界见第 4 节。

---

## 2. 问题（定性，均为既有条件 / 已修复，非本批次引入的回归）

1. **`reconstruction` 13 个导入 ERR**（`No module named 'reconstruction'`）
   - 定性：HEAD 版与 F401 删除后版产生**完全相同**的 13 个 ERR → 既有环境条件。
     `reconstruction` 是仓库内 `packages/capabilities/reconstruction` 包，需 uv 的
     ci-adapters 组或 packages 入 sys.path 才可导入。
   - **非本批次 F401 改动引入**；该文件不在 16 个 CRITICAL_MODULES（220 关键集未覆盖它），
     属全量 1392 范围，本批记 DEFERRED。
2. **`test_reconstruction_semantics.py` CRLF 行尾异常**
   - HEAD 为纯 LF、工作区被转全 CRLF，全仓 127 个改动 .py 中唯一异常 → **已归一 LF**，
     `git diff --check` 彻底干净。
3. **F401 删除安全性**
   - 被删 import 所在方法体只用 `self._descriptor()/self._request()` 助手（409/419 行独立 import），
     不直接引用被删名字 → 删除安全、无回归。
4. **`D:\All*` SQLite 外溢库归属易误判**
   - 表集（13 表）与 **ArcheAxis-Knowledge-OS `v3-thirteen-tables` fixture 精确吻合**，
     与 DESIGN-LAB state 表（asset/artifact）**零重叠** → 非本项目，按铁律保留（不是"看着像就删"）。
5. **只读 sqlite 探测副作用**（如实披露）
   - 本轮为取证 `D:\All` 用只读打开 WAL 库，触碰了 `All-shm` 的 mtime（WAL 只读打开会建 shm 索引）；
     真实写入停在 03:11，0 行数据，**非活跃写者**。

---

## 3. 阻塞点（需宿主 / 需授权 / 非本批范围 —— 逐项列明，不擅自推进）

| 阻塞项 | 说明 | 解除条件 |
|---|---|---|
| **全量 1392 三顺序** | host 0x4E 写 `C:\Windows\MEMORY.DMP` 风险；独立记 DEFERRED，**不吞进 220 判定** | 低内存窗 / 另择宿主 |
| **uv 不可用** | 系统无 uv；`reconstruction` 13 ERR 与 fresh-clone 的 install 阶段因此 NOT_VERIFIABLE | 安装 uv（DLDS-H020） |
| **TIER-3 网络组 1991 MiB** | o6-01/ocr/asr/playwright，恢复需网络重下模型与浏览器（本主机网络不可靠） | 授权 `--include-networks` |
| **`D:\All*`（~136 KB，ArcheAxis 13 表型）** | 他项目外溢，本批无授权 | 归口 ArcheAxis 项目单独处理 |
| **`D:\tmp\oh`（他人浅克隆 `KunalSin9h/openai-harness`）+ mm html** | 非 DESIGN-LAB 归属 | 用户定夺是否清理 |
| **Hermes 全局附件 5 taskpack 原件** | 已哈希迁移进 `docs/taskpacks/`（3 缺补 2 已在库），**原件保留**（全局态默认不删） | 明确授权"删除全局态" |
| **任务 11–18** | 真实宿主（PS/AI/M1/Comfy/音视频/Blender）+ 人工设计裁决 | 交 Codex/Human 执行 |
| **候选仍脏树 → 已推** | 本批次全部已 commit + push（HEAD 见第 5 节），无未上传结构工作 | 远端 CI `authority-gate` job 跑完才算双端完整验收 |

> 注：上轮"待授权"的 `D:\All*`、`D:\tmp\oh`、taskpack 去重在本批**全部保留**（未删任何非本项目数据），
> 因为它们要么归属非本项目、要么属全局工作流态 —— 符合"确保属于本项目才删"的铁律。

---

## 4. 交接（给 Codex / Human 的边界）

- **任务 11–18 操作边界**（`skip-handoff-11-18.md`）：DeepSeek 只做结构/离线/门控；
  真实宿主操控（Photoshop/Illustrator/M1/Comfy/音视频/Blender）与专业设计质量裁决交
  **Codex + Human**；Penpot **不重造骨架**（接现有 Codex 真实宿主队列）；资产交换
  PNG/MP4 可作预览但不替代约定可编辑对象。
- **宿主侧待办**（解锁第 3 节阻塞项 1/2）：可装 uv 的宿主上跑 `reconstruction` 13 测试 +
  1392 全量三顺序；低内存窗跑全量避免 0x4E。
- **归口项**（阻塞 4/5/6）：`D:\All*` 交 ArcheAxis；`D:\tmp\oh` + Hermes 全局附件原件
  由用户决定是否清理（本批保守保留，零数据丢失）。
- **双端验收**：本地门链 7/7 PASS + 220 关键集 + ruff 0 是**结构证据**；
  **远端 CI 跑完 `authority-gate` 才是完整验收**（Linux CI PASS 不替代 Windows 宿主结果，
  1392 全量仍在各自 DEFERRED 状态）。

---

## 5. 双端仓库一致性（本提交随附校验）

本收口交接作为一个 commit 推送。校验口径：

```
git rev-parse HEAD
git ls-remote origin codex/deepseek-authority-r1
# 期望两者一致；且
git rev-list --count HEAD..origin/codex/deepseek-authority-r1   # 期望 0
```

本次推送后预期 **本地 HEAD == 远端 ref（ahead/behind = 0/0）**。
上一批次（`9cc8f2a` 结构 + `2800d7b` C/D 审计与 taskpack）均已在远端；本提交仅追加收口 handoff，
不改任何被跟踪代码/测试/门控文件，故**不触发门链回归**（纯 docs 变更）。
