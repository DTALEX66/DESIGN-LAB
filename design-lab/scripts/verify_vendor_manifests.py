#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Make the cache-only vendored roots auditable from the repository alone.

`vendor/sources.lock.json` records 46 sources. 3 ship their bytes in-repo, 6 point at
directories deleted on 2026-09-04, and **37 live only in this machine's
`.project-local/cache/vendor/`** -- a path CI never sees and no other clone has. For those
37 the lock carried one `contentDigest` each, which answers "are these the bytes I checked?"
but not "what is in there?". A digest nobody can list cannot be reviewed, cannot be diffed
when upstream moves, and cannot carry a rights decision. So each cache-only root now has a
committed manifest under `vendor/manifests/<id>.json`: member path, byte size and sha256 per
file, plus the aggregate digest and blank owner fields.

Two modes, deliberately different in what they may touch:
  default / --check  reads nothing but the repository. It re-derives the aggregate digest
                     from each manifest's own rows and compares that to the digest the
                     manifest claims and to the one the lock records, so a clone can prove
                     the evidence is self-consistent and matches the recorded identity even
                     though the third-party bytes are (and must stay) absent.
  --write            needs the cache. Walks it, hashes every file, and refuses to emit a
                     manifest unless the recomputed digest equals both `digest_dir` on the
                     walked tree and the lock's `contentDigest`. Disagreement there is drift
                     in the cache, so it is reported, not smoothed over.

`verify_source_registry.py` owns the other presence class: it convicts `ABSENT_FROM_GIT`
rows that are undeclared. Neither gate speaks for the other -- this one only walks
`LOCAL_CACHE_ONLY` rows, so "SOURCE_REGISTRY=PASS" plus "VERIFY_VENDOR_MANIFESTS=OK" is what
"every vendor reference is accounted for" actually means.

`reviewedBy` / `reviewedAt` / `rightsDecision` stay null: a rights decision belongs to the
owner, `--write` never invents one, and regeneration keeps whatever a human recorded. The
gate therefore prints `awaiting_owner_review=37` as a count, and it is not a failure -- a
blank field an agent refused to fill is the correct state.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LOCK = REPO / "vendor" / "sources.lock.json"
MANIFEST_DIR = REPO / "vendor" / "manifests"
sys.path.insert(0, str(REPO))

from scripts.amend_source_lock_presence import digest_dir  # noqa: E402

SCHEMA_VERSION = "design-lab/vendor-manifest/v1"
CACHE_ONLY = "LOCAL_CACHE_ONLY"
HEX64 = re.compile(r"^[0-9a-f]{64}$")
LICENSE_FILE = re.compile(r"(^|/)(LICENSE|COPYING|NOTICE)", re.I)
# Owner-only. No mode of this script writes a value into them; --write copies forward
# whatever is already in the file so a ruling survives regeneration.
OWNER_FIELDS = ("reviewedBy", "reviewedAt", "rightsDecision")


def digest_from_rows(rows: list[dict]) -> str:
    """The same byte-level recipe as `digest_dir`, from already-hashed rows.

    Its own function so `--check` can prove a manifest internally consistent without the
    files: identical sort key, identical separators, identical hash. `digest_dir` sorts by
    `relpath` and feeds the path as UTF-8 and the hex digest as ASCII, so this must too.
    """
    h = hashlib.sha256()
    for row in sorted(rows, key=lambda r: r["path"]):
        h.update(row["path"].encode("utf-8"))
        h.update(b"\0")
        h.update(row["sha256"].encode("ascii"))
        h.update(b"\0")
    return h.hexdigest()


def walk_cache(root: Path) -> list[dict]:
    rows = []
    for path in sorted((p for p in root.rglob("*") if p.is_file()),
                       key=lambda p: p.relative_to(root).as_posix()):
        data = path.read_bytes()
        rows.append({"path": path.relative_to(root).as_posix(),
                     "bytes": len(data),
                     "sha256": hashlib.sha256(data).hexdigest()})
    return rows


def read_lock(path: Path = LOCK) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sources_with_presence(lock: dict, presence: str = CACHE_ONLY) -> list[dict]:
    return [s for s in lock.get("sources") or [] if s.get("presence") == presence]


def manifest_path(source_id: str, manifest_dir: Path = MANIFEST_DIR) -> Path:
    return manifest_dir / (source_id + ".json")


def license_files_present(rows: list[dict]) -> list[str]:
    """Which licence files the tree actually holds -- evidence, not the lock's word."""
    return sorted({r["path"] for r in rows if LICENSE_FILE.search(r["path"])})


def row_findings(source_id: str, rows: list[dict]) -> list[str]:
    """Structural checks on the rows themselves, before any digest is trusted.

    The digest catches a changed hash, but a human reads `bytes` and counts files by eye, so
    those fields are checked too; and a duplicated path would make `fileCount` describe a
    list rather than a tree.
    """
    findings: list[str] = []
    seen: set[str] = set()
    for row in rows:
        path = row.get("path")
        if not isinstance(path, str) or not path:
            findings.append(f"{source_id}: MANIFEST-ROW-SHAPE a row carries no usable path")
            continue
        if path in seen:
            findings.append(f"{source_id}: MANIFEST-DUPLICATE-PATH {path} is listed twice, so "
                            "fileCount counts rows instead of files")
            continue
        seen.add(path)
        sha = row.get("sha256")
        if not isinstance(sha, str) or not HEX64.match(sha):
            findings.append(f"{source_id}: MANIFEST-ROW-SHAPE {path} has sha256={sha!r}, "
                            "not 64 lowercase hex")
        size = row.get("bytes")
        if not isinstance(size, int) or isinstance(size, bool) or size < 0:
            findings.append(f"{source_id}: MANIFEST-ROW-SHAPE {path} has bytes={size!r}, "
                            "not a non-negative integer")
    return findings


def check(lock: dict, manifest_dir: Path = MANIFEST_DIR,
          ) -> tuple[list[str], list[str], int, int]:
    """Return (problems, roots awaiting owner review, rows, license-file-less count)."""
    problems: list[str] = []
    pending: list[str] = []
    rows_total = 0
    no_license_file = 0
    cache_only = sources_with_presence(lock)
    known_ids = {s.get("id") for s in cache_only}

    for source in cache_only:
        sid = source.get("id", "?")
        path = manifest_path(sid, manifest_dir)
        if not path.is_file():
            problems.append(f"MANIFEST_MISSING {sid} -- a cache-only root with no in-repo "
                            "record of what it holds; run --write on the machine that has "
                            "the cache")
            continue
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            problems.append(f"MANIFEST-UNREADABLE {sid}: {exc}")
            continue
        if manifest.get("schemaVersion") != SCHEMA_VERSION:
            problems.append(f"MANIFEST-SCHEMA {sid} says "
                            f"{manifest.get('schemaVersion')!r}, expected {SCHEMA_VERSION!r}")
            continue
        if manifest.get("id") != sid:
            problems.append(f"MANIFEST-ID {sid} -- the file is named for this root but its "
                            f"`id` field says {manifest.get('id')!r}")
        rows = manifest.get("files") or []
        rows_total += len(rows)
        if not rows:
            problems.append(f"MANIFEST_EMPTY {sid} -- no rows means nothing was hashed, and "
                            "an empty directory must never be recorded as verified")
            continue
        problems += row_findings(sid, rows)
        derived = digest_from_rows(rows)
        if derived != manifest.get("contentDigest"):
            problems.append(f"MANIFEST-DIGEST {sid} -- its own rows hash to {derived[:16]}... "
                            f"while the manifest claims {str(manifest.get('contentDigest'))[:16]}...")
        if manifest.get("contentDigest") != source.get("contentDigest"):
            problems.append(f"LOCK-MANIFEST-DIGEST {sid} -- the lock records "
                            f"{str(source.get('contentDigest'))[:16]}... and the manifest "
                            f"{str(manifest.get('contentDigest'))[:16]}...; the bytes the lock "
                            "attests and the bytes the manifest lists are not the same set")
        if manifest.get("fileCount") != len(rows):
            problems.append(f"MANIFEST-COUNT {sid} fileCount={manifest.get('fileCount')} "
                            f"rows={len(rows)}")
        total = sum(r.get("bytes", 0) for r in rows if isinstance(r.get("bytes"), int))
        if manifest.get("totalBytes") != total:
            problems.append(f"MANIFEST-BYTES {sid} totalBytes={manifest.get('totalBytes')} "
                            f"rows sum={total}")
        # The presence audit counted these files when it measured the cache. A manifest that
        # silently disagreed with it would mean the cache moved and nobody re-measured.
        if manifest.get("lockFiles") != source.get("files"):
            problems.append(f"LOCK-MANIFEST-FILES {sid} -- the lock's presence audit says "
                            f"files={source.get('files')} and the manifest recorded "
                            f"{manifest.get('lockFiles')}")
        if not manifest.get("licenseFilesPresent"):
            no_license_file += 1
        if not manifest.get("reviewedBy"):
            pending.append(sid)

    # Both directions: a manifest whose root is no longer cache-only is a live record of
    # evidence that no longer exists, and would be read as current.
    if manifest_dir.is_dir():
        for extra in sorted(p for p in manifest_dir.glob("*.json")):
            if extra.stem not in known_ids:
                problems.append(f"MANIFEST-ORPHAN {extra.name} -- no cache-only row in "
                                "vendor/sources.lock.json owns this root, so the manifest "
                                "documents a reference that has moved or gone")
    return problems, sorted(pending), rows_total, no_license_file


def write(lock: dict, repo: Path = REPO, manifest_dir: Path = MANIFEST_DIR,
          ) -> tuple[int, int, list[str], list[str]]:
    manifest_dir.mkdir(parents=True, exist_ok=True)
    missing: list[str] = []
    drift: list[str] = []
    written = 0
    rows_total = 0
    for source in sources_with_presence(lock):
        sid = source.get("id", "?")
        root = repo / str(source.get("path") or "")
        if not root.is_dir():
            missing.append(sid)
            continue
        rows = walk_cache(root)
        count, digest = digest_dir(root)
        derived = digest_from_rows(rows)
        if not rows or digest is None:
            drift.append(f"{sid} -- the cache directory is present but holds no files, and an "
                         "empty root is never attested as verified content")
            continue
        if derived != digest or count != len(rows):
            drift.append(f"{sid} -- the walk and `digest_dir` disagree on the same tree "
                         f"(rows={len(rows)} vs count={count}); suspect the two recipes")
            continue
        if digest != source.get("contentDigest"):
            drift.append(f"{sid} -- cache holds {digest[:16]}... while the lock records "
                         f"{str(source.get('contentDigest'))[:16]}...; the cache moved after "
                         "the presence audit, so re-run scripts/amend_source_lock_presence.py "
                         "instead of manifesting new bytes under the old identity")
            continue
        if source.get("files") != len(rows):
            drift.append(f"{sid} -- the lock's presence audit counted {source.get('files')} "
                         f"files and the cache now holds {len(rows)}; same fix as a digest "
                         "mismatch: re-measure the presence before manifesting")
            continue
        path = manifest_path(sid, manifest_dir)
        prior = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
        document = {
            "schemaVersion": SCHEMA_VERSION,
            "id": sid,
            "cachePath": source.get("path"),
            "canonicalUrl": source.get("canonicalUrl"),
            "license": source.get("license"),
            "licenseFilesPresent": license_files_present(rows),
            "provenanceSource": source.get("provenanceSource"),
            "observedAt": source.get("observedAt"),
            "lockFiles": source.get("files"),
            "lockDiskFiles": source.get("diskFiles"),
            "fileCount": len(rows),
            "totalBytes": sum(r["bytes"] for r in rows),
            "contentDigest": digest,
            "digestMethod": "sha256 over sorted `relpath\\0<sha256(bytes)>\\0` "
                            "(the recipe vendor/sources.lock.json uses)",
            # Owner-only, copied forward verbatim. Generation never reviews.
            **{field: prior.get(field) for field in OWNER_FIELDS},
            "files": rows,
        }
        # LF stated explicitly: `.gitattributes` normalises `*.json text eol=lf`, so a
        # CRLF working copy would not equal the bytes every clone checks out, and any gate
        # that digests working-tree text would disagree with CI about the same record.
        path.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8", newline="\n")
        written += 1
        rows_total += len(rows)
    return written, rows_total, missing, drift


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--write", action="store_true",
                        help="regenerate every cache-only manifest from this machine's cache")
    parser.add_argument("--check", action="store_true",
                        help="verify the committed manifests from repository state alone "
                             "(the default when no mode is given)")
    args = parser.parse_args(argv)
    try:
        lock = read_lock()
    except (OSError, json.JSONDecodeError) as exc:
        print(f"vendor/sources.lock.json unreadable: {exc}")
        print("VERIFY_VENDOR_MANIFESTS=FAIL findings=1")
        return 1

    if args.write:
        written, rows_total, missing, drift = write(lock)
        print(f"manifests written={written} rows={rows_total} "
              f"cache_missing={len(missing)} drift={len(drift)}")
        for note in drift:
            print("VENDOR_MANIFEST=DRIFT " + note)
        for sid in missing:
            print("VENDOR_MANIFEST=CACHE_MISSING " + sid
                  + " -- this machine does not hold the cache the manifest is derived from")
        if drift:
            print("VERIFY_VENDOR_MANIFESTS=FAIL mode=write drift=%d" % len(drift))
            return 1
        problems, pending, check_rows, _ = check(lock)
        if problems:
            print("VERIFY_VENDOR_MANIFESTS=FAIL mode=write regenerated_state_findings=%d"
                  % len(problems))
            for problem in problems:
                print("VENDOR_MANIFEST=FAIL " + problem)
            return 1
        print(f"VERIFY_VENDOR_MANIFESTS=OK mode=write roots={written} rows={check_rows} "
              f"awaiting_owner_review={len(pending)} cache_missing={len(missing)}")
        return 0

    problems, pending, rows_total, no_license_file = check(lock)
    for problem in problems:
        print("VENDOR_MANIFEST=FAIL " + problem)
    if pending:
        print("VENDOR_MANIFEST=NOTICE reviewedBy is null for "
              + ", ".join(pending[:8])
              + (" ..." if len(pending) > 8 else "")
              + f" ({len(pending)} roots) -- a rights decision belongs to the owner and an "
                "agent must not fill it, so this count is reported, not failed")
    if no_license_file:
        print(f"VENDOR_MANIFEST=NOTICE license_files_absent={no_license_file} -- these trees "
              "hold no LICENSE/COPYING/NOTICE file, so the rights review has only the lock's "
              "word to go on")
    roots = len(sources_with_presence(lock))
    verdict = "OK" if not problems else "FAIL"
    print(f"VERIFY_VENDOR_MANIFESTS={verdict} roots={roots} rows={rows_total} "
          f"awaiting_owner_review={len(pending)} license_files_absent={no_license_file} "
          f"findings={len(problems)}")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
