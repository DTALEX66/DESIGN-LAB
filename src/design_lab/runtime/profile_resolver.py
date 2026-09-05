# SPDX-License-Identifier: MIT
"""DL-TP-R2-015: ProfileResolver.

hard-filter + fixed 100-point scoring + deterministic tie-break.
Input: artifact/format/editability/offline/rights/cost/host evidence.
Output: ranked candidates, rejection reasons, selected Profile.
Never starts software.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any

# host profiles: id -> capabilities
PROFILES = {
    "photoshop": {"formats": {"psd", "psb"}, "offline": True, "rights": "ok", "cost": 50, "editable": True},
    "illustrator": {"formats": {"ai", "svg", "eps"}, "offline": True, "rights": "ok", "cost": 50, "editable": True},
    "coreldraw": {"formats": {"cdr", "svg"}, "offline": True, "rights": "ok", "cost": 40, "editable": True},
    "figma": {"formats": {"fig", "svg", "png"}, "offline": False, "rights": "ok", "cost": 20, "editable": True},
    "penpot": {"formats": {"svg", "png"}, "offline": False, "rights": "ok", "cost": 10, "editable": True},
    "comfyui": {"formats": {"png", "webp"}, "offline": True, "rights": "ok", "cost": 5, "editable": False},
    "minimax-h3": {"formats": {"mp4", "webp"}, "offline": True, "rights": "BLOCKED_BY_LICENSE", "cost": 5, "editable": False},
}


@dataclass
class Candidate:
    profile: str
    score: int
    rejection: str = ""
    reasons: list[str] = field(default_factory=list)


def resolve(evidence: dict) -> dict[str, Any]:
    fmt = evidence.get("format", "").lower()
    needs_offline = evidence.get("offline", False)
    needs_editable = evidence.get("editable", False)
    rights_scope = evidence.get("rights", "PERSONAL_RESEARCH_NONCOMMERCIAL")

    candidates: list[Candidate] = []
    for pid, p in PROFILES.items():
        reasons = []
        if fmt not in p["formats"]:
            reasons.append(f"format {fmt} unsupported")
        if needs_offline and not p["offline"]:
            reasons.append("requires offline")
        if needs_editable and not p["editable"]:
            reasons.append("not editable")
        if p["rights"] == "BLOCKED_BY_LICENSE":
            reasons.append("rights BLOCKED_BY_LICENSE")
        if reasons:
            candidates.append(Candidate(pid, 0, "rejected", reasons))
        else:
            # 100-point fixed score (cost-weighted), deterministic
            score = max(1, 100 - p["cost"] * 2)
            candidates.append(Candidate(pid, score))

    ranked = sorted([c for c in candidates if not c.rejection], key=lambda c: (-c.score, c.profile))
    selected = ranked[0].profile if ranked else None
    return {
        "ranked": [{"profile": c.profile, "score": c.score} for c in ranked],
        "rejected": [{"profile": c.profile, "reasons": c.reasons} for c in candidates if c.rejection],
        "selected": selected,
    }

