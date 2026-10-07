#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Check that ledger evidence artefacts are actually readable.

Evidence records point at two very different kinds of path. Tracked files
(`docs/`, `apps/`, `design-lab/`) are durable and must exist -- a missing one
means the proof is gone, so that is a hard failure. `.project-local/` paths live
in the gitignored runtime root, which is wiped by cleanup and never exists on a
fresh checkout, so their absence is reported as a warning with counts rather
than a red gate; `--strict-runtime` upgrades it for local audits.

This exists because the R3 predecessor ledger carries 254 artefact references
that are already dead, and one current R5 record lost its ComfyUI result file:
the ledger kept asserting proof nobody can read back.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LEDGER = 'design-lab/config/task-ledger-r3.json'
RUNTIME_PREFIX = '.project-local/'


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _git(root: Path, *args: str) -> bytes | None:
    """`git` over a pipe, or None when it refuses. A non-zero exit is an answer, not a crash."""
    completed = subprocess.run(['git', '-C', str(root), *args], capture_output=True)
    return completed.stdout if completed.returncode == 0 else None


def _current_bytes(root: Path, rel: str) -> bytes | None:
    """The tracked content of one path, in the form git stores it.

    Deliberately NOT `Path.read_bytes()`. A record's hash is the SHA-256 of the *blob*, and on this
    platform a working file can legitimately differ from its own blob by line endings alone
    (`.gitattributes` declares `text=auto`, and several files are CRLF in the checkout and LF in the
    object store). Comparing the two directly made every CRLF artefact report
    HASH_MOVED_SINCE_OBSERVATION on every run, whatever its content: 23 records on the wave's own
    audit document were line-ending noise, not decay, and a drift inventory that is mostly noise is
    read as nothing. `git show HEAD:<path>` is the committed bytes; the index form is the fallback
    for a path that is tracked but not yet in HEAD.
    """
    blob = _git(root, 'show', f'HEAD:{rel}')
    if blob is None:
        blob = _git(root, 'show', f':{rel}')
    return blob


def evaluate(root: Path, ledger: dict) -> dict:
    index = set(subprocess.run(['git', '-C', str(root), 'ls-files'],
                               capture_output=True, text=True,
                               encoding='utf-8', errors='replace').stdout.splitlines())
    broken, drifted, runtime_missing, runtime_ok = [], [], [], 0
    for receipt in ledger.get('evidence', []):
        for artifact in receipt.get('artifacts', []):
            rel = artifact['path']
            if rel.startswith(RUNTIME_PREFIX):
                if (root / rel).is_file():
                    runtime_ok += 1
                else:
                    runtime_missing.append((receipt['id'], rel))
                continue
            if rel not in index:
                # Not tracked and not runtime: nothing can ever read it back.
                broken.append((receipt['id'], rel, 'NOT-IN-GIT-INDEX'))
                continue
            path = root / rel
            if not path.is_file():
                broken.append((receipt['id'], rel, 'MISSING'))
                continue
            current = _current_bytes(root, rel)
            if current is None:
                broken.append((receipt['id'], rel, 'NO-GIT-OBJECT'))
                continue
            if _sha256(current) != artifact['sha256']:
                # The artefact was a mutable source file: it moved on since the
                # observation. That is decay the projector already accounts for,
                # not destroyed proof, so it must not make the gate red forever.
                drifted.append((receipt['id'], rel, 'HASH_MOVED_SINCE_OBSERVATION'))
    return {'broken': broken, 'drifted': drifted, 'runtime_missing': runtime_missing,
            'runtime_ok': runtime_ok}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--strict-runtime', action='store_true',
                        help='also fail when .project-local runtime artefacts are absent')
    parser.add_argument('--root', default=str(REPO))
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()
    ledger = json.loads((root / LEDGER).read_text(encoding='utf-8'))
    result = evaluate(root, ledger)
    broken, drifted, missing, ok = (result['broken'], result['drifted'],
                                    result['runtime_missing'], result['runtime_ok'])
    for receipt_id, rel, why in broken:
        print(f'  BROKEN {receipt_id} -> {rel} ({why})')
    for receipt_id, rel, why in drifted:
        print(f'  DRIFTED {receipt_id} -> {rel} ({why})')
    for receipt_id, rel in missing[:5]:
        print(f'  RUNTIME-MISSING {receipt_id} -> {rel}')
    if len(missing) > 5:
        print(f'  ... {len(missing) - 5} more runtime artefact references absent')
    summary = (f'tracked_broken={len(broken)} tracked_drifted={len(drifted)} '
               f'runtime_present={ok} runtime_missing={len(missing)}')
    if broken:
        print(f'EVIDENCE_ARTIFACTS=FAIL {summary}')
        return 1
    if (missing or drifted) and args.strict_runtime:
        print(f'EVIDENCE_ARTIFACTS=FAIL(strict-runtime) {summary}')
        return 1
    if missing or drifted:
        print(f'EVIDENCE_ARTIFACTS=WARN {summary} '
              '(runtime root is gitignored; drift means the artefact was a mutable '
              'source file that has moved on since the observation)')
        return 0
    print(f'EVIDENCE_ARTIFACTS=OK {summary}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
