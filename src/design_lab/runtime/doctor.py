# SPDX-License-Identifier: MIT
"""DL-TP-R2-016: design-lab doctor (portable workspace).

Probes toolchain versions and reports expected/actual drift.
Never auto-installs software, accepts licenses, or touches .git metadata.
"""
from __future__ import annotations
import shutil
import subprocess
from dataclasses import dataclass, field

EXPECTED = {
    "uv": ">=0.4",
    "git": ">=2.40",
    "ffmpeg": ">=6.0",
    "node": ">=20",
}


@dataclass
class ToolStatus:
    tool: str
    found: bool
    version: str = ""
    drift: list[str] = field(default_factory=list)


def probe_tools() -> list[ToolStatus]:
    out = []
    for tool, req in EXPECTED.items():
        exe = shutil.which(tool)
        if not exe:
            out.append(ToolStatus(tool, False, drift=[f"not found; expected {req}"]))
            continue
        try:
            r = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=8)
            ver = (r.stdout or r.stderr).strip().split("\n")[0][:60]
            out.append(ToolStatus(tool, True, version=ver))
        except Exception as exc:
            out.append(ToolStatus(tool, True, drift=[f"version probe failed: {exc}"[:60]]))
    return out


def check_uv_lock() -> list[str]:
    issues = []
    uv = shutil.which("uv")
    if uv:
        r = subprocess.run([uv, "lock", "--check"], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            issues.append("uv.lock stale or invalid (run uv lock)")
    return issues

