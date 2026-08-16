# V4.2 交接文档（Handoff Summary）— 2026-08-15

> **HISTORICAL SNAPSHOT — NOT CURRENT EVIDENCE.** This dated report is
> retained for audit traceability. Its E-level/runtime wording describes
> the recorded tree only and does not qualify the current checkout.

## 状态：✅ DUAL-END SYNC（本地提交并推送 origin/main，双端一致）

- 目标仓库：`DTALEX66/DESIGN-LAB`
- 基线：云端 main `cc9ca6b8427493042c012e46e5dba69ae289dc0a`（fetch 后 0 ahead / 0 behind）
- 本轮：3 类 fail-open 修复 + 回归测试 + 交接文档，提交推送后本地 HEAD == origin/main

## 本轮修复（真实可复现的 fail-open 缺口）

### 1. Scenario 安装闭包缺失（installer 未安装 bundle 引用的 scenario）

- 文件：`design-lab/scripts/install_op_expert_suite.py`、
  `design-lab/tests/test_op_personal_design_system.py`
- 根因：`EXPERT_RESOURCE_SOURCES` 仅含 7 plugins + 3 bundles；bundle
  `context.skills.ref` 引用的 `commercial-design-router`、`brand-campaign-360`
  两个 scenario 不在安装清单内，`copy_expert_resource_sources()` 的镜像复制
  与 asset closure 也不支持 `scenarios/` 目录 → 安装后的 runtime 缺 scenario。
- 修复：清单扩展为 12 项（+2 scenarios），镜像复制加入 `scenarios/` 根，
  新增测试断言 bundle 引用的 scenario 全部被 installer 管理且 manifest 存在。

### 2. 损坏 atom 被静默跳过（孤立损坏 JSON 不报错）

- 文件：`design-lab/scripts/verify_runtime_contracts_v3.py`、
  `design-lab/tests/test_verifier_internals.py`
- 根因：`local_atom_ids()` 对 `open-design.json` 解析异常直接 `except: continue`，
  未被任何 scenario stage 引用的损坏 atom 会被忽略，验证器仍报 PASS（旧基线
  235 项全绿掩盖问题）。
- 修复：解析异常显式记录 `atom <name>: JSON parses` 失败项，verifier fail-closed；
  新增"孤立损坏 atom"负向回归测试。

### 3. Capability promotion 可跳过前置等级（E4/E5 直通）

- 文件：`design-lab/scripts/verify_capability_evidence_v4.py`、
  `design-lab/tests/test_oda4_0205_evidence.py`
- 根因：`check_promotion()` 只检查目标等级自身的 artifact 行，E5+外部验收、
  E4+frozen_tree/exact_sha_ci 可直接通过，无需同一 capability 的 E1→E4 累计证据。
- 修复：promotion 改为累计要求——E2 须含 E1 `declaration_doc`，E3 须累计
  E1/E2 证据，E4 须累计前置 + frozen_tree/independent_review/exact_sha_ci，
  E5 须完整 E1→E5 链；新增 E5 直达 fail-closed 测试。

## 验证链（全绿）

| 检查 | 结果 |
|---|---|
| Python 单测（unittest discover） | 193 OK |
| verify_design_lab.py（aggregate） | VERIFY_DESIGN_LAB=OK total=17 failed=0 |
| verify_runtime_contracts_v3.py | VERIFY_RUNTIME_CONTRACTS_V3=OK total=238 failed=0 |
| verify_capability_evidence_v4.py | CAPABILITY_EVIDENCE_V4=PASS records=8 |
| verify_identity_gate.py | IDENTITY_GATE=OK total=0 |
| git diff --check | PASS |

## Release Gate（诚实状态）

```text
RELEASE_GATE=BLOCKED findings=7
```

- 5 个 capability floor 不足（creative-toolchain E1<E3 等）——真实能力缺口
- Evidence Cards `accepted=0/12`——人工校准未完成
- DL-REL-001 HUMAN-ACCEPTANCE-PENDING

自动化结构门禁通过不等于 release ready；真实 Host 运行、Jury 人工验收、
生产验收仍是硬前置，本轮未伪造任何人工项。

## 边界声明

- 未启动 Open Design Host / ComfyUI / MiniMax H3 / 生产环境 / 外部服务
- 未读取 E:/ 盘、secrets、凭据
- 仅修改 6 个 DESIGN-LAB 文件（3 脚本 + 3 测试）；未触碰 WORK-LAB
- 未做 WORK-LAB Codex/Hermes overlay（DESIGN-LAB 会话边界，用户 2026-08-14 纠正）

## 双端交付记录（本次）

- 本地 commit：见 git HEAD（fix(contracts): close scenario install closure and promotion chain fail-open）
- 推送后 origin/main：== 本地 HEAD（双端一致）
- 交接文档：本文件 `reports/V42_HANDOFF_SUMMARY_20260815.md`（tracked）
