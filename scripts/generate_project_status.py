#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-MIG-005: generate PROJECT_STATUS (single source of generated status).

Replaces hand-written test/capability/source/file counts in active docs.
Active docs must reference reports/current/PROJECT_STATUS.md instead of
copying numbers. Deterministic on the current tree.
"""
from __future__ import annotations

import ast
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "reports" / "current"


def git(args: list[str]) -> str:
    r = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def load_json(rel: str) -> dict:
    p = REPO / rel
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def count_test_methods() -> int:
    total = 0
    for p in sorted((REPO / "design-lab" / "tests").rglob("test_*.py")):
        try:
            tree = ast.parse(p.read_text(encoding="utf-8"))
        except (OSError, SyntaxError):
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name.endswith("Tests"):
                total += sum(1 for n in node.body if isinstance(n, ast.FunctionDef) and n.name.startswith("test_"))
    return total


def main() -> int:
    head = git(["rev-parse", "HEAD"])
    branch = git(["symbolic-ref", "--short", "HEAD"])
    origin_main = git(["rev-parse", "origin/main"])
    tracked = git(["ls-files"])
    tracked_count = len(tracked.splitlines()) if tracked else 0
    pack = git(["count-objects", "-vH"])
    pack_mib = 0.0
    for line in pack.splitlines():
        if line.startswith("size-pack:"):
            try:
                pack_mib = float(line.split(":")[1].strip().split()[0])
            except (ValueError, IndexError):
                pass

    registry = load_json("design-lab/research/global-absorption/SOURCE_REGISTRY.json")
    quarantine = load_json("design-lab/research/global-absorption/QUARANTINE_REGISTRY.json")
    capability = load_json("design-lab/config/capability-index.json")
    evidence_cards = load_json("design-lab/evals/evidence/evidence-cards.json")
    ev_index = load_json("design-lab/config/capability-evidence-index.json")
    inventory = load_json("reports/current/DL-AST-002-BINARY-INVENTORY.json")

    level_counts: dict[str, int] = {}
    for rec in ev_index.get("records", []):
        lvl = rec.get("evidence_level")
        if lvl:
            level_counts[lvl] = level_counts.get(lvl, 0) + 1

    status = {
        "schemaVersion": "design-lab/project-status/v1",
        "generatedAt": date.today().isoformat(),
        "generator": "scripts/generate_project_status.py (DL-MIG-005)",
        "git": {
            "branch": branch or "unknown",
            "headSha": head or "unknown",
            "originMainSha": origin_main or "unknown",
            "worktreeClean": not git(["status", "--porcelain"]),
            "trackedFiles": tracked_count,
            "packMiB": round(pack_mib, 2),
        },
        "sources": {
            "activeRegistryEntries": len(registry.get("entries", [])),
            "quarantinedSources": len(quarantine.get("entries", [])),
        },
        "capabilities": {
            "capabilityIndexCount": capability.get("capability_count", len(capability.get("capabilities", []))),
        },
        "evidence": {
            "cards": len(evidence_cards.get("cards", [])),
            "recordsByLevel": level_counts,
            "authoritativeAccepts": 0,
        },
        "assets": {
            "binaries": inventory.get("totalBinaries", 0),
            "binaryMiB": inventory.get("totalMiB", 0),
        },
        "tests": {
            "definedTestMethodCount": count_test_methods(),
            "note": "defined test methods (AST count); run `python scripts/run_python_tests.py` for execution results",
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_json = OUT_DIR / "PROJECT_STATUS.json"
    out_json.write_text(json.dumps(status, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    md = [
        "# PROJECT_STATUS（生成状态，DL-MIG-005）",
        "",
        f"- 生成时间：{status['generatedAt']}｜生成器：`{status['generator']}`",
        f"- Git：分支 `{status['git']['branch']}`，HEAD `{status['git']['headSha'][:12]}`，origin/main `{status['git']['originMainSha'][:12]}`，worktree {'clean' if status['git']['worktreeClean'] else 'dirty'}",
        f"- tracked 文件：{status['git']['trackedFiles']}；仓库 pack：{status['git']['packMiB']} MiB（预算 256 MiB，预警 220 MiB）",
        "",
        "## 来源治理",
        f"- 活动登记（v3）：{status['sources']['activeRegistryEntries']}；隔离登记：{status['sources']['quarantinedSources']}（162 条遗留已隔离，DL-KNW-003）",
        "",
        "## 能力与证据",
        f"- 能力索引：{status['capabilities']['capabilityIndexCount']} 项；证据卡：{status['evidence']['cards']}（authoritative accepts=0）",
        "- 各能力证据等级分布：" + ("；".join(f"{k}={v}" for k, v in sorted(status['evidence']['recordsByLevel'].items())) or "（无记录）"),
        "",
        "## 资产",
        f"- tracked 二进制：{status['assets']['binaries']}（{status['assets']['binaryMiB']} MiB，全量清单见 DL-AST-002-BINARY-INVENTORY.json）",
        "",
        "## 测试",
        f"- 定义测试方法数（AST 静态计数）：{status['tests']['definedTestMethodCount']}",
        "- 实际执行结果以 `python scripts/run_python_tests.py` 为准（本文件不冒充执行证据）",
        "",
        "> 活动文档只引用本生成状态，不复制数字（DL-MIG-005）。",
        "",
    ]
    out_md = OUT_DIR / "PROJECT_STATUS.md"
    out_md.write_text("\n".join(md), encoding="utf-8")
    print(f"PROJECT_STATUS=OK tracked={status['git']['trackedFiles']} pack_mib={status['git']['packMiB']} "
          f"active_sources={status['sources']['activeRegistryEntries']} quarantined={status['sources']['quarantinedSources']} "
          f"capabilities={status['capabilities']['capabilityIndexCount']} tests={status['tests']['definedTestMethodCount']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
