#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-CI-005: host adapter matrix gate (E0/E1 only, fail-closed).

Requires every adapter in the canonical host matrix to be registered and to
carry NO runtime evidence claim above what is actually proven:
- open-design / adobe / figma / penpot / blender / comfyui / minimax-h3 /
  ffmpeg / browser
- every adapter evidence.level must be E0 (declared) or E1 (structural);
  adapters without real runtime evidence must never claim E3+.
- ComfyUI and MiniMax H3 stay frozen at E0 (declared, supported=false) —
  see DL-H3 / DL-CI-005.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
REGISTRY = REPO / "adapters" / "adapter-registry.json"

MATRIX = {
    "adapter-open-design": "open-design",
    "adapter-adobe-photoshop": "adobe",
    "adapter-figma": "figma",
    "adapter-penpot": "penpot",
    "adapter-blender": "blender",
    "adapter-comfyui": "comfyui",
    "adapter-minimax-h3": "minimax-h3",
    "adapter-ffmpeg": "ffmpeg",
    "adapter-browser": "browser",
}
FROZEN_E0 = {"adapter-comfyui", "adapter-minimax-h3"}
ALLOWED_LEVELS = {"E0", "E1"}
LEVEL_ORDER = {"E0": 0, "E1": 1, "E2": 2, "E3": 3, "E4": 4, "E5": 5}


def main() -> int:
    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ADAPTER_MATRIX=FAIL registry unreadable: {exc}")
        return 1
    adapters = {a.get("adapter_id"): a for a in data.get("adapters", [])}
    errors: list[str] = []

    for adapter_id, host in MATRIX.items():
        ad = adapters.get(adapter_id)
        if ad is None:
            errors.append(f"matrix adapter missing: {adapter_id} ({host})")
            continue
        level = (ad.get("evidence") or {}).get("level")
        if level not in ALLOWED_LEVELS:
            errors.append(f"{adapter_id}: evidence.level {level!r} not allowed (E0/E1 only, DL-CI-005)")
        if adapter_id in FROZEN_E0 and level != "E0":
            errors.append(f"{adapter_id}: frozen at E0 (declared, supported=false), got {level!r}")

    # no adapter may claim runtime evidence without a runtime identity
    for adapter_id, ad in adapters.items():
        ev = ad.get("evidence") or {}
        if LEVEL_ORDER.get(ev.get("level"), -1) >= LEVEL_ORDER["E3"]:
            if not ev.get("runtime_id") and not ev.get("task_ids"):
                errors.append(f"{adapter_id}: E3+ claim without runtime identity/task ids")

    print(f"ADAPTER_MATRIX={'PASS' if not errors else 'FAIL'} matrix={len(MATRIX)}")
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
