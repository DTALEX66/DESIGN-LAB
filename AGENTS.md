# AGENTS.md - DESIGN-LAB 设计实验室 Operating Guide

> 全局执行标准（跨软件跨项目）：见 WORK-LAB `00-governance/global-execution-standard.md`
> （执行生命周期：理解→扫技能→分片→执行→验证→落地；全局边界：E盘禁访/数据不外溢/官方优先/全功率/审计分层）。

## 项目定位

- DESIGN-LAB 拥有设计能力（models/tools/generation params/assets/specs/quality gates）
- 设计能力不被 WORK-LAB 采集或管理（IGNORE），由本项目独立负责

## 执行规范

- 执行任务前先扫描匹配 SKILL（见全局执行标准步骤②）
- 设计产物留在本项目内，不外溢到其他项目/共享库
- 更新以官方发布为准，不私自打包

## 模块

- design-lab/：设计核心
- design-system/：设计系统
- minigame-runtime/：小游戏运行时
- evals/：评估

（项目特有规则在此基础上补充）