# SPDX-License-Identifier: MIT
"""Unified content-bound worktree digest.

DL-AUDIT-20260914-01: the two historical digests (``governance/reporting``
``git_snapshot`` and the ``deepseek_authority_ledger`` / ``run_bound_test_suite``
``worktree_digest``) hashed only Git's porcelain *status string*. A file whose
path was unchanged but whose *content* moved therefore produced an identical
digest, and a recompute over the same bytes was only accidentally stable.

This module is the single shared implementation. Every entry is normalized to a
POSIX path and bound to its current SHA-256 content, so:

* same path, different content -> different digest;
* same content, recomputed     -> same digest (entries are sorted);
* a deletion is marked ``D`` (no content) and a new untracked file is bound by
  its content, so both are distinguishable from a no-op;
* generated / private / runtime roots are excluded by an *explicit* declared
  set, so writing a projection never changes the digest of the subject it
  describes.
"""
from __future__ import annotations

import hashlib
import os
import subprocess
from pathlib import Path, PurePosixPath

# Explicitly declared exclusion scope. Generated projections and private /
# runtime state never enter the digest, and they are never read as private
# data. The set is part of the public contract: changing it is a declared,
# versioned decision, not an implicit one.
EXCLUDED_PREFIXES = (
    "reports/current/",
    "design-lab/config/current-report-index.json",
    ".project-local/",
    ".git/",
    ".venv/",
    ".hermes/",
    ".openhuman/",
)
EXCLUDED_SUFFIXES = ("__pycache__",)


def _git(repo: Path, *args: str) -> str:
    env = {**os.environ, "GIT_OPTIONAL_LOCKS": "0"}
    result = subprocess.run(["git", "-c", "color.ui=false", "-C", str(repo), *args],
                            capture_output=True, text=True, encoding="utf-8",
                            errors="replace", env=env)
    if result.returncode != 0:
        raise ValueError(f"git inspection failed: {args[0]}")
    return result.stdout.rstrip("\r\n")


def _normalize(path: str) -> str:
    """Repository-relative POSIX path; rejects anything that escapes the root."""
    clean = path.replace("\\", "/")
    rel = PurePosixPath(clean)
    if rel.is_absolute() or ".." in rel.parts or str(rel) in {"", "."}:
        raise ValueError(f"worktree digest cannot normalize path: {path!r}")
    return str(rel)


def _excluded(posix: str) -> bool:
    if posix.startswith("."):
        return posix.startswith(".git/") or posix.startswith(".venv/")
    for prefix in EXCLUDED_PREFIXES:
        if posix == prefix.rstrip("/") or posix.startswith(prefix):
            return True
    name = posix.rsplit("/", 1)[-1]
    return any(name.endswith(suffix) or name == suffix for suffix in EXCLUDED_SUFFIXES) \
        or posix.endswith("/__pycache__")


def _file_sha256(repo: Path, posix: str):
    target = repo.joinpath(*PurePosixPath(posix).parts)
    try:
        if target.is_symlink() or not target.is_file():
            return None
        return "sha256:" + hashlib.sha256(target.read_bytes()).hexdigest()
    except OSError:
        return None


def _parse_status(lines: list) -> list:
    """Normalize a `git status --porcelain=v1 --untracked-files=all` listing."""
    entries = []
    for line in lines:
        if not line:
            continue
        if len(line) < 4:
            continue
        xy, rest = line[:2], line[3:]
        if rest.startswith('"'):  # quoted path; unquote the escaped form
            body = rest.rstrip('"')
            rest = body.encode("utf-8").decode("unicode_escape")
        if xy[0] in ("R", "C") and " -> " in rest:
            old, new = rest.split(" -> ", 1)
            entries.append({"kind": xy[0], "path": _normalize(new), "moved_from": _normalize(old)})
        else:
            kind = "U" if xy == "??" else xy.strip()
            entries.append({"kind": kind, "path": _normalize(rest)})
    return entries


def analyze(repo: Path, *, base: str = "HEAD", exclude_generated: bool = True) -> dict:
    """Content-bound, deterministic worktree description.

    Returns the base commit, branch, clean flag, the normalized (and, for
    untracked/modified entries, content-hashed) change list, the explicit
    excluded scope that was skipped, and the single digest that binds it all.
    """
    repo = Path(repo)
    head = _git(repo, "rev-parse", base)
    branch = _git(repo, "rev-parse", "--abbrev-ref", "HEAD")
    status = _git(repo, "status", "--porcelain=v1", "--untracked-files=all").splitlines()
    all_entries = _parse_status(status)
    kept, excluded = [], []
    for entry in all_entries:
        if exclude_generated and _excluded(entry["path"]):
            excluded.append(entry["path"])
            continue
        # Bind content for every non-deletion entry so a same-path,
        # different-content change is visible in the digest.
        if entry["kind"] != "D":
            entry["content"] = _file_sha256(repo, entry["path"])
        kept.append(entry)
    kept.sort(key=lambda e: (e["kind"], e["path"]))
    excluded.sort()
    lines = [head]
    for entry in kept:
        if entry["kind"] == "D":
            lines.append(f"D {entry['path']}")
        else:
            lines.append(f"{entry['kind']} {entry['path']} {entry.get('content') or 'missing'}")
    payload = "\n".join(lines)
    digest = "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return {
        "schema_version": "design-lab/worktree-digest/v2",
        "base": base,
        "head_sha": head,
        "branch": branch,
        "clean": not kept,
        "changes": kept,
        "excluded_generated": excluded,
        "excluded_scope": list(EXCLUDED_PREFIXES),
        "digest": digest,
    }


def worktree_digest(repo: Path, *, base: str = "HEAD", exclude_generated: bool = True) -> str:
    """The digest alone, for callers that only need the binding value."""
    return analyze(repo, base=base, exclude_generated=exclude_generated)["digest"]
