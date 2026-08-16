#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-V2 P1-A: verify design kernel (fail-closed).

验证：
1. design-project-state / design-command / execution-result schema 有效（Draft 2020-12）
2. core 状态机合法（transition 图、阶段集合）
3. 命令验证器拒绝未知 capability / 工具名（provider/adapter 中立）
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parent.parent
SCHEMAS = ROOT / "schemas"
CORE = ROOT / "core"


def load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []

    # 1) schemas 有效
    for name in ("design-project-state.schema.json", "design-command.schema.json", "execution-result.schema.json"):
        try:
            s = load_json(SCHEMAS / name)
            jsonschema.Draft202012Validator.check_schema(s)
        except Exception as exc:
            errors.append(f"{name}: {exc}")

    # 2) 状态机契约（从 schema 提取阶段，与 core 一致）
    state_schema = load_json(SCHEMAS / "design-project-state.schema.json")
    schema_stages = set(state_schema["properties"]["stage"]["enum"])
    try:
        import importlib.util
        ps = importlib.util.spec_from_file_location("dl_core_project_state", str(CORE / "project_state.py"))
        pm = importlib.util.module_from_spec(ps); sys.modules[ps.name] = pm; ps.loader.exec_module(pm)
        STAGES, TRANSITIONS = pm.STAGES, pm.TRANSITIONS
        core_stages = set(STAGES)
        if schema_stages != core_stages:
            errors.append(f"stage mismatch: schema={sorted(schema_stages)} core={sorted(core_stages)}")
        # transition 目标都在阶段集合内
        for src, dsts in TRANSITIONS.items():
            if src not in core_stages:
                errors.append(f"transition source not a stage: {src}")
            for d in dsts:
                if d not in core_stages:
                    errors.append(f"transition {src}->{d}: {d} not a stage")
        # 全链可达性：draft 出发能否到 archived
        seen = set()
        frontier = {"draft"}
        while frontier:
            nxt = set()
            for s in frontier:
                nxt |= TRANSITIONS.get(s, set())
            frontier = nxt - seen
            seen |= nxt
        if "archived" not in seen:
            errors.append("state machine cannot reach archived from draft")
    except Exception as exc:
        errors.append(f"core state machine load failed: {exc}")

    # 3) 命令验证器中立性
    cs = importlib.util.spec_from_file_location("dl_core_commands", str(CORE / "commands.py"))
    cm = importlib.util.module_from_spec(cs); cs.loader.exec_module(cm)
    validate_command, is_tool_name = cm.validate_command, cm.is_tool_name
    if not is_tool_name("photoshop.text"):
        errors.append("photoshop.text should be detected as a tool name (neutrality)")
    if not is_tool_name("deepseek.reason"):
        errors.append("deepseek.reason should be detected as a provider name (neutrality)")
    if is_tool_name("image.text.create"):
        errors.append("image.text.create must stay neutral (no tool/provider name)")

    print(f"DESIGN_KERNEL={'FAIL' if errors else 'PASS'}")
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
