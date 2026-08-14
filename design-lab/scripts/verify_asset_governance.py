#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Asset governance gate (KNOWLEDGE_ASSET_POLICY §4).

Enforces repository size budget, per-file size cap and binary entry checks.
Fail-closed: any violation returns non-zero and prints ASSET_GOVERNANCE=FAIL.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TOTAL_BUDGET_MIB = 256
SINGLE_FILE_MIB = 5
BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mp3", ".wav",
    ".pdf", ".zip", ".gz", ".7z", ".ttf", ".otf", ".woff", ".woff2",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".model", ".onnx", ".pb",
}


def git(args: list[str]) -> str:
    r = subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout.strip()


def main() -> int:
    errors: list[str] = []

    # 1. Total repo budget (pack size as proxy for committed volume)
    try:
        size_out = git(["count-objects", "-vH"])
        pack_line = next(l for l in size_out.splitlines() if l.startswith("size-pack:"))
        pack_mib = float(pack_line.split(":")[1].strip().split()[0])
    except (StopIteration, ValueError) as e:
        errors.append(f"cannot read pack size: {e}")
        pack_mib = 0.0
    if pack_mib > TOTAL_BUDGET_MIB:
        errors.append(f"repo pack {pack_mib:.1f} MiB exceeds budget {TOTAL_BUDGET_MIB} MiB")

    # 2. Per-file cap on tracked files (excluding quarantine/, history/ which are inert,
    #    and minigame-runtime/assets/generated/ which are regenerable CCTV loops with
    #    .license sidecars; see KNOWLEDGE_ASSET_POLICY §7 exception list).
    tracked = git(["ls-files"]).splitlines()
    skipped_prefixes = (
        "design-lab/research/quarantine/",
        "project-memory/history/",
        "reports/history/",
        "minigame-runtime/assets/generated/",
    )
    for rel in tracked:
        if rel.startswith(skipped_prefixes):
            continue
        p = REPO / rel
        try:
            size = p.stat().st_size
        except OSError:
            continue
        if size > SINGLE_FILE_MIB * 1024 * 1024:
            errors.append(f"file exceeds {SINGLE_FILE_MIB} MiB cap: {rel} ({size/1048576:.1f} MiB)")

    # 3. Binary entry gate: tracked binaries outside quarantine/history need license sidecar
    license_missing: list[str] = []
    for rel in tracked:
        suffix = Path(rel).suffix.lower()
        if suffix not in BINARY_SUFFIXES:
            continue
        if rel.startswith(skipped_prefixes):
            continue
        sidecar = REPO / f"{rel}.license"
        license_file = REPO / "LICENSES" / f"{Path(rel).name}.license"
        if not sidecar.exists() and not license_file.exists():
            license_missing.append(rel)
    if license_missing:
        errors.append(
            "binary assets missing .license sidecar: " + ", ".join(license_missing[:8])
        )

    print(f"ASSET_GOVERNANCE={'FAIL' if errors else 'OK'}")
    print(f"pack_mib={pack_mib:.1f} budget_mib={TOTAL_BUDGET_MIB} files={len(tracked)}")
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
