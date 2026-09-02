#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify license coverage (V42 Phase 11): source SPDX headers + binary sidecars.

Checks, over the tracked tree:
1. Every project Python/JS/MJS source file carries an SPDX-License-Identifier
   header (REUSE), excluding generated bundles / vendored / node_modules.
2. Every tracked binary asset has a REUSE `<name>.license` sidecar.
3. Emits a coverage report; non-zero exit on any gap.

Idempotent, read-only, matches the CI license-secret-gate semantics.
Scope: focuses on design-lab/ core and top-level LICENSE sources.
minigame-runtime generated bundles are excluded (product tree already split).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SOURCE_EXT = (".py", ".mjs", ".js")
BINARY_EXT = (
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico",
    ".ttf", ".otf", ".woff", ".woff2",
    ".mp4", ".mp3", ".ogg", ".wav",
)
# Generated / vendored / split-out trees excluded from source-header coverage.
EXCLUDE_PREFIX = (
    "fixtures/domains/game-visual/",
    "fixtures/domains/game-visual/android-",
    "fixtures/domains/game-visual/wechat-",
    "fixtures/domains/game-visual/douyin-",
    "fixtures/domains/game-visual/webview-",
    "reports/",
    "design-lab/templates/",
    "design-lab/domain-packs/",
    "design-lab/design-systems/",
    "design-lab/evals/",
    # vendored third-party skill trees: each carries its own LICENSE + SOURCE.md
    # (REUSE: vendored trees are excluded from project header coverage;
    #  NOTE: rel paths are relative to design-lab/ because git_ls runs with cwd=REPO)
    "knowledge/visual-quality/hallmark/",
    "knowledge/visual-quality/taste-skill/",
    "knowledge/visual-quality/motion-design-skill/",
    "knowledge/visual-quality/design-motion-principles/",
    "knowledge/visual-quality/game-ui-mobile/",
    "knowledge/visual-quality/blender-3d/",
    "knowledge/visual-quality/brand-systems/",
    "knowledge/visual-quality/brand-identity/",
    "knowledge/visual-quality/ai-graphic-design/",
    "knowledge/visual-quality/claude2figma/",
    "knowledge/visual-quality/extract-packages/design-system/",
    "knowledge/visual-quality/ppt-agent/",
    "knowledge/visual-quality/swiftui-design/",
    "knowledge/visual-quality/claude-dolphin/",
    "knowledge/visual-quality/ux-audit-skill/",
    "knowledge/visual-quality/brandbook-skill/",
    "knowledge/visual-quality/logo-designer/",
    "knowledge/visual-quality/screenshot-to-ds/",
    "knowledge/ecommerce-ai/",
    "knowledge/visual-quality/springy-motion/",
    "knowledge/visual-quality/design-thinking/",
    "knowledge/visual-quality/game-creative/",
    "knowledge/visual-quality/design-md-skill/",
    "knowledge/visual-quality/hue/",
    "knowledge/visual-quality/qiaomu-design/",
    "knowledge/visual-quality/interface-design/",
    "knowledge/visual-quality/visual-note-card/",
    "knowledge/visual-quality/affiliate-skills/",
    "knowledge/visual-quality/document-packages/design-system/",
    "knowledge/visual-quality/dataviz-critique/",
    "knowledge/visual-quality/brand-identity-generator/",
    "intelligence/ui-ux-pro-max/",
    "intelligence/shipit-ui/",
    "intelligence/motion-engine/",
    "intelligence/design-system-prompt/",
    "intelligence/anydesign/",
    "intelligence/claude-design-skill/",
    "intelligence/motion-forensics/",
    "intelligence/web-content-designer/",
    "intelligence/genjutsu/",
    "intelligence/ai-product-os/",
    "intelligence/baoyu-design/",
    "intelligence/ultimate-uiux/",
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
        if not rel.lower().endswith(BINARY_EXT) or is_excluded(rel):
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
