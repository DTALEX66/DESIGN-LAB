#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Every evidence record claims it observed specific bytes at a specific commit.

`design-lab/config/task-ledger-r3.json` records, per evidence entry, a `subject_sha` and a
`subject_files` map {path: sha256}. That is the only mechanism by which an entry can be
checked by someone who was not there -- and until now nothing checked it:
`verify_evidence_artifact_presence` looks at `artifacts` (documents the record produced) and
ignores `subject_files` entirely. So a record could name files that never existed at the
commit it binds to, or publish a digest that does not match those bytes, and stay green.

This gate recomputes each declared digest from `git show <subject_sha>:<path>` -- the object
database, never the working tree, so a later edit to the same path cannot move the answer --
and fails on anything that does not match.

The KNOWN list is two-way, the way this repo's other ledgers work: an unsanctioned defect
fails, and a sanctioned entry that has since become verifiable ALSO fails, so the list
cannot rot into permanent excuses for records nobody ever repairs. Rewriting an old record's
digests to satisfy the gate would be fabricating evidence; the honest move is to mark the
defect, date it, and let it block anything new.
"""
from __future__ import annotations

import json
import subprocess
import sys
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEDGER = ROOT / 'design-lab/config/task-ledger-r3.json'

MATCH = 'MATCH'
MISMATCH = 'DIGEST_MISMATCH'
ABSENT = 'NOT_IN_BOUND_COMMIT'
NO_COMMIT = 'BOUND_COMMIT_NOT_IN_REPOSITORY'

# (record id, path) -> why this record cannot be made verifiable without fabricating it.
KNOWN = {
# 57 entries of this kind.
    ('r5-006-static-unit-20260928',
     'src/design_lab/readiness/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-006-static-unit-20260928',
     'src/design_lab/readiness/__pycache__/host_matrix.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-006-static-unit-20260928',
     'src/design_lab/readiness/__pycache__/model_radar.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-006-static-unit-20260928',
     'src/design_lab/readiness/__pycache__/reconstruction_bench.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-006-static-unit-20260928',
     'src/design_lab/readiness/__pycache__/vector_provider.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-008-static-unit-20260928',
     'src/design_lab/generators/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-008-static-unit-20260928',
     'src/design_lab/generators/__pycache__/comfy_http.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-008-static-unit-20260928',
     'src/design_lab/generators/__pycache__/comfy_task.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-009-static-unit-20260928',
     'src/design_lab/reconstruction/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-013-static-unit-20260928',
     'src/design_lab/reconstruction/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'packages/capabilities/quality/jury/__pycache__/check_anti_slop.cpython-311.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'packages/capabilities/quality/jury/__pycache__/check_anti_slop.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'src/design_lab/assurance/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'src/design_lab/assurance/__pycache__/human_jury.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'src/design_lab/assurance/__pycache__/knowledge_feedback.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'src/design_lab/assurance/__pycache__/qa_plane.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-014-static-unit-20260928',
     'src/design_lab/assurance/__pycache__/quality_record.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-016-static-unit-20260928',
     'src/design_lab/interop/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-016-static-unit-20260928',
     'src/design_lab/interop/__pycache__/delivery_receipt.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-016-static-unit-20260928',
     'src/design_lab/interop/__pycache__/dtcg.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-016-static-unit-20260928',
     'src/design_lab/interop/__pycache__/penpot.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-016-static-unit-20260928',
     'src/design_lab/interop/__pycache__/provenance.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-016-static-unit-20260928',
     'src/design_lab/interop/__pycache__/timeline.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-017-static-unit-20260928',
     'src/design_lab/interop/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-017-static-unit-20260928',
     'src/design_lab/interop/__pycache__/delivery_receipt.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-017-static-unit-20260928',
     'src/design_lab/interop/__pycache__/dtcg.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-017-static-unit-20260928',
     'src/design_lab/interop/__pycache__/penpot.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-017-static-unit-20260928',
     'src/design_lab/interop/__pycache__/provenance.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-017-static-unit-20260928',
     'src/design_lab/interop/__pycache__/timeline.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-019-static-unit-20260928',
     'src/design_lab/interop/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-019-static-unit-20260928',
     'src/design_lab/interop/__pycache__/delivery_receipt.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-019-static-unit-20260928',
     'src/design_lab/interop/__pycache__/dtcg.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-019-static-unit-20260928',
     'src/design_lab/interop/__pycache__/penpot.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-019-static-unit-20260928',
     'src/design_lab/interop/__pycache__/provenance.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-019-static-unit-20260928',
     'src/design_lab/interop/__pycache__/timeline.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-020-static-unit-20260928',
     'src/design_lab/interop/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-020-static-unit-20260928',
     'src/design_lab/interop/__pycache__/delivery_receipt.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-020-static-unit-20260928',
     'src/design_lab/interop/__pycache__/dtcg.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-020-static-unit-20260928',
     'src/design_lab/interop/__pycache__/penpot.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-020-static-unit-20260928',
     'src/design_lab/interop/__pycache__/provenance.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-020-static-unit-20260928',
     'src/design_lab/interop/__pycache__/timeline.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-022-static-unit-20260928',
     'src/design_lab/interop/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-022-static-unit-20260928',
     'src/design_lab/interop/__pycache__/delivery_receipt.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-022-static-unit-20260928',
     'src/design_lab/interop/__pycache__/dtcg.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-022-static-unit-20260928',
     'src/design_lab/interop/__pycache__/penpot.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-022-static-unit-20260928',
     'src/design_lab/interop/__pycache__/provenance.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-022-static-unit-20260928',
     'src/design_lab/interop/__pycache__/timeline.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-024-static-unit-20260928',
     'src/design_lab/adapters/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-024-static-unit-20260928',
     'src/design_lab/adapters/__pycache__/illustrator_com.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-024-static-unit-20260928',
     'src/design_lab/adapters/__pycache__/photoshop_com.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-024-static-unit-20260928',
     'src/design_lab/adapters/__pycache__/spi.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-025-static-unit-20260928',
     'src/design_lab/generators/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-025-static-unit-20260928',
     'src/design_lab/generators/__pycache__/comfy_http.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-025-static-unit-20260928',
     'src/design_lab/generators/__pycache__/comfy_task.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-026-static-unit-20260928',
     'src/design_lab/generators/__pycache__/__init__.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-026-static-unit-20260928',
     'src/design_lab/generators/__pycache__/comfy_http.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
    ('r5-026-static-unit-20260928',
     'src/design_lab/generators/__pycache__/comfy_task.cpython-313.pyc'): '2026-09-28 static-unit subject list includes an interpreter cache file. The digest matches those bytes, but a .pyc is not tracked, so no commit can ever reproduce it.',
# 6 entries of this kind.
    ('r5-027-static-unit-20260928',
     'fixtures/domains/game-visual/android-minigame/audio/anomaly.wav'): '2026-09-28 record binds 4c9f1849, before this generated audio fixture was committed; the digest came from disk.',
    ('r5-027-static-unit-20260928',
     'fixtures/domains/game-visual/android-minigame/audio/bgm-anomaly-pressure-loop.wav'): '2026-09-28 record binds 4c9f1849, before this generated audio fixture was committed; the digest came from disk.',
    ('r5-027-static-unit-20260928',
     'fixtures/domains/game-visual/android-minigame/audio/bgm-night-shift-loop.wav'): '2026-09-28 record binds 4c9f1849, before this generated audio fixture was committed; the digest came from disk.',
    ('r5-027-static-unit-20260928',
     'fixtures/domains/game-visual/android-minigame/audio/boot.wav'): '2026-09-28 record binds 4c9f1849, before this generated audio fixture was committed; the digest came from disk.',
    ('r5-027-static-unit-20260928',
     'fixtures/domains/game-visual/android-minigame/audio/click.wav'): '2026-09-28 record binds 4c9f1849, before this generated audio fixture was committed; the digest came from disk.',
    ('r5-027-static-unit-20260928',
     'fixtures/domains/game-visual/android-minigame/audio/lockdown.wav'): '2026-09-28 record binds 4c9f1849, before this generated audio fixture was committed; the digest came from disk.',
# 4 entries of this kind.
    ('r5-comfy-http-model-free-live-20260909',
     'src/design_lab/generators/comfy_http.py'): '2026-09-09 record binds a06c1db0 and this entry does not equal the bytes at that commit -- the subject was read from the working tree. Left as recorded, because rewriting it would be fabricating evidence.',
    ('r5-comfy-structural-rejection-20260909',
     'design-lab/tests/test_comfy_task_protocol.py'): '2026-09-09 record binds a06c1db0 and this entry does not equal the bytes at that commit -- the subject was read from the working tree. Left as recorded, because rewriting it would be fabricating evidence.',
    ('r5-comfy-structural-rejection-20260909',
     'src/design_lab/generators/comfy_task.py'): '2026-09-09 record binds a06c1db0 and this entry does not equal the bytes at that commit -- the subject was read from the working tree. Left as recorded, because rewriting it would be fabricating evidence.',
    ('r5-ps-handoff-review-20260909',
     'src/design_lab/native_patch_submissions.py'): '2026-09-09 record binds a06c1db0 and this entry does not equal the bytes at that commit -- the subject was read from the working tree. Left as recorded, because rewriting it would be fabricating evidence.',
}




def default_reader(commit: str, path: str):
    """Bytes of `path` at `commit`, or None when that commit has no such blob."""
    result = subprocess.run(['git', '-C', str(ROOT), 'show', f'{commit}:{path}'],
                            capture_output=True)
    if result.returncode != 0:
        return None
    return result.stdout


def commit_exists(commit: str) -> bool:
    return subprocess.run(['git', '-C', str(ROOT), 'cat-file', '-e', commit],
                          capture_output=True).returncode == 0


def classify(records, reader, exists) -> list[tuple[str, str, str]]:
    """[(kind, record_id, path)] for every declared subject file that cannot be reproduced."""
    defects: list[tuple[str, str, str]] = []
    for record in records:
        identity = record.get('id', '(unidentified record)')
        commit = (record.get('subject_sha') or '').strip()
        files = record.get('subject_files') or {}
        if not files:
            continue
        if not commit or not exists(commit):
            for path in files:
                defects.append((NO_COMMIT, identity, path))
            continue
        for path, declared in files.items():
            blob = reader(commit, path)
            if blob is None:
                defects.append((ABSENT, identity, path))
            elif sha256(blob).hexdigest() != str(declared).removeprefix('sha256:'):
                defects.append((MISMATCH, identity, path))
    return defects


def partition(defects):
    unsanctioned, stale = [], []
    hit = set()
    for kind, record_id, path in defects:
        key = (record_id, path)
        if key in KNOWN:
            hit.add(key)
        else:
            unsanctioned.append((kind, record_id, path))
    for key in KNOWN:
        if key not in hit:
            stale.append(key)
    return sorted(unsanctioned), sorted(stale)


def main() -> int:
    ledger = json.loads(LEDGER.read_text(encoding='utf-8'))
    records = ledger.get('evidence', [])
    defects = classify(records, default_reader, commit_exists)
    unsanctioned, stale = partition(defects)
    declared = sum(len(record.get('subject_files') or {}) for record in records)
    if unsanctioned:
        print(f'LEDGER_SUBJECT_BINDING=FAIL unsanctioned={len(unsanctioned)}')
        for kind, record_id, path in unsanctioned:
            print(f'  {kind} {record_id} :: {path}')
        return 1
    if stale:
        print(f'LEDGER_SUBJECT_BINDING=FAIL stale_known={len(stale)}')
        for record_id, path in stale:
            print(f'  now verifiable but still listed as a known defect: {record_id} :: {path}')
        return 1
    print(f'LEDGER_SUBJECT_BINDING=OK subject_files={declared} checked='
          f'{declared} known_unverifiable={len(defects)} records={len(records)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
