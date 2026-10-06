# SPDX-License-Identifier: MIT
"""Record whether each vendor/sources.lock.json byte claim is reachable at all.

The lock lists 46 sources with a `files` count and a `path`, and
`verify_source_registry.py` answers `SOURCE_REGISTRY=PASS` without ever opening a
single one of those paths. Measured on `main` = `b7f82ac0`, that PASS covers three
very different situations:

  * 3 `ABSORB_MINIMAL` sources whose files are committed, so a clone has them;
  * 37 `CONDITIONAL_POC` sources whose `path` is `.project-local/cache/vendor/<id>`,
    a gitignored directory that exists only on the machine that acquired them
    (`docs/THIRD_PARTY_ISOLATION.md` calls it 保真副本 in cache, by policy);
  * 6 `LOCK_REFERENCE` sources whose `design-lab/intelligence/*` paths were deleted
    from Git on 2026-09-04 and are not anywhere on disk either.

This script writes what is *measured* rather than what is claimed: a `presence`
class derived from `git ls-files` plus the filesystem, a file count from each side,
and a content digest over the bytes that are actually there. It adds no policy and
removes no record; the point is that a reader can no longer mistake "hashed on one
machine" for "in the repository".

Output is deterministic (no timestamps), so the projections that digest this file
stay byte-stable across runs and platforms.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
LOCK = REPO / "vendor" / "sources.lock.json"
ISOLATION_DOC = REPO / "docs" / "THIRD_PARTY_ISOLATION.md"
# `.project-local/` is PROJECT_LOCAL_ROOT and is gitignored, so a path under it can
# never be in Git on any machine. Presence must be derived from rules that hold in a
# fresh clone, not from whether this machine happens to still have the cache.
VOLATILE_ROOT = ".project-local/"
PRESENCE = ("IN_REPO", "LOCAL_CACHE_ONLY", "ABSENT_FROM_GIT")


def tracked_paths() -> list[str]:
    out = subprocess.run(["git", "-C", str(REPO), "ls-files", "-z"],
                         capture_output=True, check=True).stdout
    return [p.decode("utf-8").replace("\\", "/") for p in out.split(b"\0") if p]


def retired_in_doc(path: str) -> bool:
    """True only when the isolation record names this exact path.

    Substring-on-directory is enough here because the doc lists the deleted files by
    full path (`design-lab/intelligence/claude-design-skill/AGENTS.md`), so a source
    whose directory never appears stays visibly unbacked rather than being retro-fitted
    with a reason nobody recorded.
    """
    if not ISOLATION_DOC.is_file():
        return False
    text = ISOLATION_DOC.read_text(encoding="utf-8", errors="replace")
    return path in text


def digest_dir(root: Path) -> tuple[int, str | None]:
    """(file count, sha256 over sorted `relpath\\0<sha256(bytes)>\\0`).

    Sorting the relative paths makes the digest independent of directory order, and
    hashing content rather than mtimes makes it reproducible for any identical set
    of bytes. Returns None when the directory itself is absent.
    """
    if not root.is_dir():
        return 0, None
    files = sorted((p for p in root.rglob("*") if p.is_file()),
                   key=lambda p: p.relative_to(root).as_posix())
    if not files:
        # An empty directory has no content to attest. Returning the digest of
        # nothing (e3b0c442…) would make "the cache folder is here but empty"
        # indistinguishable from "these bytes were verified", which is the one
        # confusion this record exists to prevent.
        return 0, None
    h = hashlib.sha256()
    for p in files:
        h.update(p.relative_to(root).as_posix().encode("utf-8"))
        h.update(b"\0")
        h.update(hashlib.sha256(p.read_bytes()).hexdigest().encode("ascii"))
        h.update(b"\0")
    return len(files), h.hexdigest()


def classify(source: dict, tracked: list[str]) -> dict:
    path = str(source.get("path") or "").replace("\\", "/").strip("/")
    prefix = path + "/"
    git_files = sorted(t for t in tracked if t.startswith(prefix))
    disk_count, disk_digest = digest_dir(REPO / path)
    if git_files:
        presence = "IN_REPO"
    elif path.startswith(VOLATILE_ROOT):
        presence = "LOCAL_CACHE_ONLY"
    else:
        presence = "ABSENT_FROM_GIT"
    recorded = source.get("files")
    return {
        "presence": presence,
        "gitFiles": len(git_files),
        "diskFiles": disk_count,
        "countMatchesRecord": recorded == (len(git_files) if git_files else disk_count),
        # a cache digest is only meaningful as cache-integrity evidence, which is
        # why `presence` travels with it and why CI on a fresh clone simply sees
        # diskFiles=0 and cannot treat the recorded value as verified.
        "contentDigest": disk_digest if presence in ("IN_REPO", "LOCAL_CACHE_ONLY") else None,
        "pathNamedInIsolationRecord": retired_in_doc(path),
    }


def main() -> int:
    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    sources = lock.get("sources") or []
    if not sources:
        raise SystemExit("SOURCE_LOCK_UNREADABLE: no sources array")
    tracked = tracked_paths()
    counts = {}
    for source in sources:
        facts = classify(source, tracked)
        source["presence"] = facts["presence"]
        source["gitFiles"] = facts["gitFiles"]
        source["diskFiles"] = facts["diskFiles"]
        source["contentDigest"] = facts["contentDigest"]
        source["countMatchesRecord"] = facts["countMatchesRecord"]
        source["pathNamedInIsolationRecord"] = facts["pathNamedInIsolationRecord"]
        counts[facts["presence"]] = counts.get(facts["presence"], 0) + 1
    unbacked = sorted(s["id"] for s in sources
                      if s["presence"] == "ABSENT_FROM_GIT" and not s["pathNamedInIsolationRecord"])
    lock["presenceAudit"] = {
        "schemaVersion": "design-lab/vendor-presence/v1",
        "method": "git ls-files + filesystem walk; contentDigest is sha256 over "
                  "sorted relpath and per-file sha256 of bytes. Presence is derived "
                  f"from git plus the `{VOLATILE_ROOT}` rule, never from whether this "
                  "machine still has a directory, so a clone recomputes the same value.",
        "presenceMeans": {
            "IN_REPO": "bytes are committed; a clone can recompute contentDigest",
            "LOCAL_CACHE_ONLY": f"bytes live only under `{VOLATILE_ROOT}` (gitignored, "
                                "PROJECT_LOCAL_ROOT) on the machine that acquired them; "
                                "a clone cannot recompute, so this is not absorbed",
            "ABSENT_FROM_GIT": "no bytes anywhere; the record is a historical "
                               "reference, not an absorbed source",
        },
        "counts": dict(sorted(counts.items())),
        # surfaced, not rewritten: why a reference lost its path is an owner call, and
        # silently deleting the record would destroy the only trace it existed.
        "absentReferencesNotNamedInIsolationRecord": unbacked,
    }
    # newline="\n": Path.write_text translates "\n" to os.linesep on Windows, which
    # would make this file's bytes platform-dependent and re-dirty the projections on
    # every developer's machine.
    with LOCK.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(lock, ensure_ascii=False, indent=2) + "\n")
    print("SOURCE_LOCK_PRESENCE=WRITTEN " + json.dumps(lock["presenceAudit"]["counts"], sort_keys=True)
          + f" unbacked_absent_references={len(unbacked)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
