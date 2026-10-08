#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-REC-29 verification: re-prove that every landed import equals its source.

Reads the committed manifest and, for each row, re-opens the external source and
compares NAME + SIZE + CRC32 + sha256 three ways:

  source   -> the member bytes as they are in Record right now
  worktree -> the bytes on disk under this repository
  blob     -> the bytes git would commit (index) or has committed (HEAD)

The third comparison is what catches an otherwise invisible mutation: a
line-ending normalisation rule rewriting a byte-frozen original at add time.

Exit code 0 only when every row of every kind reconciles.

Usage:
    python scripts/record_import_verify.py            # source vs worktree vs index
    python scripts/record_import_verify.py --head     # ... and vs HEAD blobs
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import subprocess
import sys
import zipfile
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MANIFEST = REPO / "docs/history/record-imports-2026-10-08/RECORD-IMPORT-MANIFEST.json"
RECORD = Path(r"D:\All projects\Record")


def deep(path: str) -> str:
    s = os.path.abspath(path)
    return s if s.startswith("\\\\?\\") else "\\\\?\\" + s


def crc(data: bytes) -> str:
    return f"{zlib.crc32(data) & 0xFFFFFFFF:08x}"


def sha(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def git_blob(rel: str, use_head: bool) -> bytes | None:
    ref = f"HEAD:{rel}" if use_head else f":{rel}"
    r = subprocess.run(["git", "cat-file", "blob", ref], cwd=REPO, capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout


def source_bytes(row: dict) -> bytes | None:
    container = row["source_container"]
    member = row["source_member"]
    if member == "(loose file)":
        p = RECORD / container
        if not p.is_file():
            return None
        with open(deep(str(p)), "rb") as fh:
            return fh.read()
    if "::" in container:
        outer_name, inner_name = container.split("::", 1)
        outer = RECORD / outer_name
        if not outer.is_file():
            return None
        with zipfile.ZipFile(outer) as zf:
            raw = zf.read(inner_name)
        with zipfile.ZipFile(io.BytesIO(raw)) as inner:
            return inner.read(member)
    p = RECORD / container
    if not p.is_file():
        return None
    with zipfile.ZipFile(p) as zf:
        return zf.read(member)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--head", action="store_true", help="also compare against HEAD blobs")
    args = ap.parse_args()

    if not MANIFEST.is_file():
        print(f"VERIFY ABORT: manifest missing: {MANIFEST}")
        return 2
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rows = manifest["entries"]

    counters = {"checked": 0, "source_missing": 0, "worktree_mismatch": 0,
                "blob_mismatch": 0, "blob_absent": 0, "external_drift": 0,
                "mapped_copies_verified": 0, "skipped": 0}
    failures: list[str] = []

    for row in rows:
        action = row["action"]
        if action not in ("LANDED", "ALREADY-IN-REPO", "EXTERNAL-ONLY",
                          "NESTED-CONTAINER-VERIFIED"):
            counters["skipped"] += 1
            continue
        src = source_bytes(row)
        if src is None:
            counters["source_missing"] += 1
            failures.append(f"SOURCE-MISSING {row['source_container']}::{row['source_member']}")
            continue
        if crc(src) != row["crc32"] or len(src) != row["bytes"] or sha(src) != row["sha256"]:
            counters["external_drift" if action == "EXTERNAL-ONLY" else "worktree_mismatch"] += 1
            failures.append(f"SOURCE-DRIFT {row['source_container']}::{row['source_member']} "
                            f"recorded crc={row['crc32']} now={crc(src)}")
            continue
        counters["checked"] += 1
        if action == "ALREADY-IN-REPO":
            # The manifest claims a pre-existing repo copy already equals this
            # member byte-for-byte; re-prove it instead of trusting the label.
            rel = row["target"]
            dest = REPO / rel
            if not dest.is_file():
                counters["worktree_mismatch"] += 1
                failures.append(f"MAPPED-COPY-MISSING {rel}")
                continue
            with open(deep(str(dest)), "rb") as fh:
                wt = fh.read()
            if crc(wt) != row["crc32"] or sha(wt) != row["sha256"]:
                counters["worktree_mismatch"] += 1
                failures.append(f"MAPPED-COPY-MISMATCH {rel} expected crc={row['crc32']} "
                                f"got crc={crc(wt)}")
            else:
                counters["mapped_copies_verified"] += 1
            continue
        if action != "LANDED":
            continue
        rel = row["target"]
        dest = REPO / rel
        if not dest.is_file():
            counters["worktree_mismatch"] += 1
            failures.append(f"WORKTREE-MISSING {rel}")
            continue
        with open(deep(str(dest)), "rb") as fh:
            wt = fh.read()
        if crc(wt) != row["crc32"] or len(wt) != row["bytes"] or sha(wt) != row["sha256"]:
            counters["worktree_mismatch"] += 1
            failures.append(f"WORKTREE-MISMATCH {rel} expected crc={row['crc32']} "
                            f"size={row['bytes']:,} got crc={crc(wt)} size={len(wt):,}")
            continue
        blob = git_blob(rel.replace("\\", "/"), args.head)
        if blob is None:
            counters["blob_absent"] += 1
            continue
        if crc(blob) != row["crc32"] or sha(blob) != row["sha256"]:
            counters["blob_mismatch"] += 1
            failures.append(f"BLOB-MISMATCH {rel} worktree crc={crc(wt)} blob crc={crc(blob)} "
                            "(a git attribute is rewriting the frozen original)")

    print(f"RECORD_VERIFY manifest_rows={len(rows)} checked={counters['checked']} "
          f"skipped={counters['skipped']} source_missing={counters['source_missing']} "
          f"source_or_worktree_mismatch={counters['worktree_mismatch']} "
          f"blob_mismatch={counters['blob_mismatch']} blob_absent={counters['blob_absent']} "
          f"external_drift={counters['external_drift']} "
          f"mapped_copies_verified={counters['mapped_copies_verified']}")
    for f in failures[:40]:
        print("FAIL:", f)
    if len(failures) > 40:
        print(f"FAIL: ... {len(failures) - 40} more")
    verdict = "OK" if not failures and counters["blob_mismatch"] == 0 else "FAIL"
    print(f"RECORD_VERIFY={verdict} scope={'HEAD' if args.head else 'INDEX'}")
    return 0 if verdict == "OK" else 1


if __name__ == "__main__":
    raise SystemExit(main())
