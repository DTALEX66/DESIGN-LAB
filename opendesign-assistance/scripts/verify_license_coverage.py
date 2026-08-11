#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify license coverage (V42 Phase 11): source SPDX headers + binary sidecars.

Checks, over the tracked tree:
1. Every project Python/JS/MJS source file carries an SPDX-License-Identifier
   header (REUSE), excluding generated bundles / vendored / node_modules.
2. Every tracked binary asset has a REUSE `<name>.license` sidecar.
3. Emits a coverage report; non-zero exit on any gap.

Idempotent, read-only, matches the CI license-secret-gate semantics.
Scope: focuses on opendesign-assistance/ core and top-level LICENSE sources.
minigame-runtime generated bundles are excluded (product tree already split).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SOURCE_EXT = (".py", ".mjs", ".js")
BINARY_EXT = (
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
    ".ttf", ".otf", ".woff", ".woff2",
    ".mp4", ".mp3", ".ogg", ".wav",
)
# Generated / vendored / split-out trees excluded from source-header coverage.
EXCLUDE_PREFIX = (
    "minigame-runtime/",
    "minigame-runtime/android-",
    "minigame-runtime/wechat-",
    "minigame-runtime/douyin-",
    "minigame-runtime/webview-",
    "opendesign-assistance/exports/",
    "opendesign-assistance/templates/",
    "opendesign-assistance/domain-packs/",
    "opendesign-assistance/design-systems/",
    "opendesign-assistance/evals/",
)


def git_ls() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files"], cwd=REPO, capture_output=True, text=True, check=True,
    ).stdout
    return [l for l in out.splitlines() if l]


def is_excluded(rel: str) -> bool:
    if "/node_modules/" in rel:
        return True
    return rel.startswith(EXCLUDE_PREFIX)


def check_source() -> list[str]:
    missing = []
    for rel in git_ls():
        if not rel.endswith(SOURCE_EXT) or is_excluded(rel):
            continue
        p = REPO / rel
        if not p.exists():
            continue
        head = p.read_text(encoding="utf-8", errors="replace")[:200]
        if "SPDX-License-Identifier" not in head:
            missing.append(rel)
    return missing


def check_binary_sidecars() -> list[str]:
    missing = []
    for rel in git_ls():
        if not rel.lower().endswith(BINARY_EXT):
            continue
        if not (REPO / (rel + ".license")).exists():
            missing.append(rel)
    return missing


def main() -> int:
    src_missing = check_source()
    bin_missing = check_binary_sidecars()
    print(f"Source files missing SPDX header: {len(src_missing)}")
    for f in src_missing:
        print(f"  MISSING SPDX: {f}")
    print(f"Binary assets missing .license sidecar: {len(bin_missing)}")
    for f in bin_missing:
        print(f"  MISSING sidecar: {f}")
    ok = not src_missing and not bin_missing
    if ok:
        print("LICENSE_COVERAGE=OK (source headers + binary sidecars complete)")
        return 0
    print("LICENSE_COVERAGE=FAIL")
    return 1


if __name__ == "__main__":
    sys.exit(main())
