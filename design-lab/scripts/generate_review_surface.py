#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-V2 P2-G: lightweight Review Surface generator.

输入一个 DesignProject state（design-project-state v2），输出 markdown 项目总览：
当前阶段 / 对象引用 / 质量状态 / 交付状态 / 待用户判断节点 / 证据。
不构建设计编辑器；只做只读投影。
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def render(state: dict) -> str:
    stage = state.get('stage', 'unknown')
    quality = state.get('quality_status', 'pending')
    objects = state.get('objects', {})
    history = state.get('history', [])
    mode = state.get('user_mode', 'director')

    lines = [
        f'# Review Surface — {state.get("project_id", "(no id)")}',
        '',
        f'- **当前阶段**: {stage}',
        f'- **质量状态**: {quality}',
        f'- **修订号**: {state.get("revision", 1)}',
        f'- **用户模式**: {mode}',
        f'- **领域**: {state.get("domain", "")}',
        '',
        '## 项目对象',
    ]
    if objects:
        for k, v in objects.items():
            lines.append(f'- `{k}` -> {v}')
    else:
        lines.append('_暂无对象引用_')

    lines += ['', '## 阶段历史']
    if history:
        for h in history[-10:]:
            lines.append(f'- {h.get("at", "")[:19]} {h.get("from_stage")} -> {h.get("to_stage")} ({h.get("reason", "")})')
    else:
        lines.append('_无阶段变更_')

    lines += ['', '## 待用户判断节点（按模式）']
    approval = {
        'guided': ['direction', 'critique', 'preflight'],
        'copilot': ['critique', 'preflight'],
        'director': ['preflight'],
        'method': ['preflight'],
        'production': [],
    }
    for n in approval.get(mode, []):
        mark = 'WARN' if n == stage else '.'
        lines.append(f'- {mark} {n}')
    if not approval.get(mode):
        lines.append('_生产模式：无人工判断节点_')

    lines += ['', '## 交付与证据']
    lines.append(f'- 质量报告: {objects.get("qualityReport", "未生成")}')
    lines.append(f'- 预检报告: {objects.get("preflightReport", "未生成")}')
    lines.append(f'- 交付清单: {objects.get("deliveryManifest", "未生成")}')
    lines.append(f'- 记忆记录: {len(objects.get("memoryRecords", []))} 条')
    lines.append(f'- 生成时间: {datetime.now().isoformat(timespec="seconds")}（只读投影，非状态源）')
    return chr(10).join(lines)


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: generate_review_surface.py <state.json> [out.md]', file=sys.stderr)
        return 2
    state = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    md = render(state)
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(md, encoding='utf-8')
    print(md)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
