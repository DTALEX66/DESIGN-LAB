#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Cross-check Record zip members against tracked repo files by CRC32.

A zip member CRC32 is the CRC32 of the member's uncompressed bytes, so it is
directly comparable with zlib.crc32 over a repo file's bytes. This proves
whether a package was ALREADY landed in-repo before duplicating its bytes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def repo_crc_index() -> dict[int, list[str]]:
    import subprocess

    out = subprocess.run(["git", "ls-files", "-z"], cwd=REPO, capture_output=True, text=True,
                         encoding="utf-8", errors="replace").stdout
    paths = [p for p in out.split("\0") if p]
    index: dict[int, list[str]] = {}
    for rel in paths:
        p = REPO / rel
        try:
            data = p.read_bytes()
        except OSError:
            continue
        index.setdefault(zlib.crc32(data) & 0xFFFFFFFF, []).append(rel)
    return index


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--zips", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    crc_index = repo_crc_index()
    print(f"repo files hashed={sum(len(v) for v in crc_index.values())} distinct_crc={len(crc_index)}")

    lines: list[str] = []
    for zpath in args.zips:
        zp = Path(zpath)
        lines.append(f"\n=== {zp.name} ===")
        with zipfile.ZipFile(zp) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                data = zf.read(info)
                crc = info.CRC & 0xFFFFFFFF
                hits = crc_index.get(crc, [])
                sha = "sha256:" + hashlib.sha256(data).hexdigest()
                status = "IN-REPO: " + ", ".join(hits) if hits else "NOT-IN-REPO"
                lines.append(f"{crc:08x} {len(data):>9,} {sha[:19]}  {info.filename}  -> {status}")
                if hits:
                    for h in hits:
                        rp = (REPO / h).read_bytes()
                        if zlib.crc32(rp) & 0xFFFFFFFF != crc:
                            lines.append(f"  !! repo file {h} crc drifted")
    text = "\n".join(lines) + "\n"
    Path(args.out).write_text(text, encoding="utf-8")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
