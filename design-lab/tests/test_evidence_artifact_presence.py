# SPDX-License-Identifier: MIT
"""Evidence artefact presence gate tests.

Distinguishes the two kinds of artefact path: a tracked file that has gone is a
hard break, while a `.project-local/` runtime path is expected to be absent on a
clean checkout and may only ever warn. The gate has to keep that difference or it
is either useless (always green) or noise (always red).
"""
from __future__ import annotations

import collections
import copy
import importlib.util
import json
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MODULE = REPO / 'design-lab' / 'scripts' / 'verify_evidence_artifact_presence.py'
LEDGER = REPO / 'design-lab' / 'config' / 'task-ledger-r3.json'

spec = importlib.util.spec_from_file_location('evidence_artifact_presence', MODULE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def _ledger() -> dict:
    return json.loads(LEDGER.read_text(encoding='utf-8'))


class EvidenceArtifactPresenceTests(unittest.TestCase):
    def test_tracked_artefacts_of_the_real_ledger_all_read_back(self):
        result = gate.evaluate(REPO, _ledger())
        self.assertEqual(result['broken'], [],
                         'every tracked evidence artefact must still exist')
        # Known decay, asserted rather than hidden. Each entry is a record whose
        # artefact bytes legitimately moved after the observation, and the inventory is
        # exact so the NEXT unannounced move still goes red. Fifty-three records on twenty-two
        # distinct artefacts -- and the numbers here are re-measured, not inherited: see
        # the correction below, because this count was wrong in this file for an hour.
        #   * build/main.js -- a 2026-09-27 record used a mutable build output as
        #     its artefact, so the bundle has since moved on;
        #   * the two files the 2026-10-06 M1 runtime-slice record bound by hash --
        #     test_project_backup.py (commit 701ace9c replaced the raw file copy with a
        #     snapshot plus a writer barrier) and test_workbench_launch.py (the launch
        #     token path moved into the service);
        #   * test_service_http.py -- 0cb1397b added the delivery-receipt route cases.
        # In every case the older record is not rewritten: it stays as the historical
        # observation it was, and a newer record carries the current binding.
        #
        # 2026-10-08, a correction that has to stay in the file: an hour ago this inventory was
        # widened to 27 records across 5 artefacts, and the extra 23 were a measurement bug, not
        # decay. The gate hashed `Path.read_bytes()` and compared it to a record's blob hash, so on
        # this platform every CRLF working file drifted permanently -- `.gitattributes` says
        # text=auto and the audit document is CRLF in the checkout and LF in the object store. (One
        # more correction, same day: this sentence also named "this test module" as CRLF, and
        # counting the bytes says it is LF. The CRLF set among the artefacts these records name is
        # the audit document, src/design_lab/native_delivery.py,
        # design-lab/config/contract-bindings.json and the two rollback test modules; build/main.js,
        # http_service.py, shell.ts and this file are LF.)
        # `git hash-object <file>` equals the HEAD blob for all of them,
        # which is the proof that no content moved. The gate now hashes the committed form
        # (`git show HEAD:<path>`, index as fallback), and the count went back to the four this
        # assertion named before. Kept in Counter form with the total pinned because a count that
        # cannot be disturbed guards nothing: a fifth real move, or a 24th record on one of these
        # artefacts, is still red.
        counts = collections.Counter((record, why) for _, record, why in result['drifted'])
        expected = collections.Counter({
            ('apps/workbench/build/main.js', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_project_backup.py', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_workbench_launch.py', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_service_http.py', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            # 2026-10-08, commit 02fa13cd: the row that recorded the per-module verification pass
            # binds its artefacts to the code it describes rather than to the audit prose -- one of
            # those files is this one, and the line-ending fix then edited it. So the record's
            # artefact is older than the bytes it names, which is exactly what this inventory
            # exists to say out loud. Nothing is rewritten: the row stays the observation it was and
            # the correcting row for the defect names the current bytes.
            # 2026-10-08, one more on this same artefact, and the cause is this very commit: the
            # change that widened the inventory below lives in this file, so HEAD's bytes for it are
            # newer than BOTH records that name it -- r5-003-per-module-verification-and-two-assertions-my-own-wave-moved-20261008
            # and r5-003-artefact-gate-hashed-working-bytes-so-crlf-always-drifted-20261008. A record
            # that names a source file ages whenever that file is edited; that is the property this
            # inventory exists to make visible, and the bound run caught it before I did -- the
            # module passed standalone (against the pre-commit HEAD) and failed once the commit
            # existed. The count is re-measured here, not inherited from the line above.
            ('design-lab/tests/test_evidence_artifact_presence.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 2,
            # 2026-10-08, the second time this exact number appeared in this file -- and the first
            # time it is true. Twenty-three records name
            # docs/audits/DESIGNLAB-LAUNCH-REVIEW-PREFLIGHT-2026-10-08.md as their artefact, and
            # section 22 of that document is now committed, so HEAD's bytes for that path are no
            # longer the bytes those records hashed. This is NOT the bug recorded below: that one
            # was 23 drifts caused by hashing working bytes against a blob hash on a CRLF checkout,
            # disproved by `git hash-object` equalling the HEAD blob. Here the committed blob
            # itself moved, which is what a continuously written document does to every record that
            # cites it. The practice this pays for is already in force: a new record binds the code
            # it describes (see the r5-010 rollback row), so it drifts when that code moves and not
            # when the prose is extended. The 23 ids are named by the gate's own output; none of
            # them is rewritten -- each stays the observation it was, and the newest records carry
            # the current binding.
            # 2026-10-08, commit ab45c818 added the missing `unittest.main()` entry guard to five
            # files that records from 2026-09-27/28 had hashed as artefacts:
            # test_comfy_http.py (2 records), test_illustrator_com_adapter.py, test_model_manifest.py,
            # test_photoshop_com_adapter.py and test_workbench_native_ui.py (4 records). Before that
            # commit, executing any of them ran zero tests and exited 0, so those records were
            # describing bytes belonging to files whose contents had never been read back per file --
            # the guard is what makes a per-module run mean anything. Nine more drifted pairs, and
            # test_workbench_launch.py was already in this list, so its own bootstrap adds none.
            ('design-lab/tests/test_comfy_http.py', 'HASH_MOVED_SINCE_OBSERVATION'): 2,
            ('design-lab/tests/test_illustrator_com_adapter.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_model_manifest.py', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_photoshop_com_adapter.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_workbench_native_ui.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 4,
            ('design-lab/scripts/verify_object_model_backing.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
            # 2026-10-08, four more names on this inventory, all of them caused by the wave that
            # settled the delivery-manifest object row, and each one is a record whose artefact is
            # the code it described rather than the prose -- which is the binding practice this file
            # asked for. They drift because that code genuinely moved:
            #   * contract-bindings.json -- commit 717257ab re-pointed the artifact-preflight
            #     emitter from production_preflight.py:365 to :378, because the delivery-bom
            #     finding inserted thirteen lines above it. The pointer is checked by line number on
            #     purpose, so a real insertion must move it (verify_contract_bindings.py).
            #   * verify_design_lab.py -- 717257ab added verify_template_contracts.py to SCRIPTS
            #     (67 gates to 68) and corrected the object-model comment to the new 6/9/6 split.
            #   * verify_object_model_backing.py -- the same commit deleted the delivery-manifest
            #     row from UNREFERENCED, re-pinned the counts to product=6/unreferenced=6, and
            #     replaced the two stale "against HEAD 0a873fc1" citations with the commit the
            #     re-measurement actually ran at.
            #   * test_object_model_backing_gate.py -- REAL_COUNTS re-pinned to match, and the
            #     hardcoded "expected 7" in the weakened-copy test became derived from REAL_COUNTS
            #     so this class of staleness cannot come back.
            # Nothing above is rewritten: each stays the observation it was.
            ('design-lab/config/contract-bindings.json',
             'HASH_MOVED_SINCE_OBSERVATION'): 2,
            ('design-lab/scripts/verify_design_lab.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_object_model_backing_gate.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 2,
            # 2026-10-08, the prose-classifier correction moved two more pairs and added one name.
            # Both are rows bound to code, which is why they drift when that code is corrected:
            #   * object-model.json -- a record hashes it as its artefact, and the quality-report row
            #     was re-pointed onto assurance-jury-record-v2.schema.json (the schema human_jury.py
            #     actually loads) once the classifier stopped reading docstrings as references;
            #   * test_object_model_backing_gate.py -- the second drifted record on this file is the
            #     same wave: REAL_COUNTS re-pinned 7/9/5 to 5/10/6 and the new
            #     ProseIsNotAReferenceTests added to it.
            # Neither older record is rewritten; each stays the observation it was.
            ('design-lab/config/object-model.json', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            # 2026-10-08, commit 6fa40276 added two more, both records bound to the gate that
            # re-measures the INERT claims rather than to the audit prose:
            #   * verify_contract_bindings.py -- it now re-tests every "nothing implements this"
            #     assertion and requires a citation to be a path;
            #   * test_contract_bindings.py -- four injection cases went with those rules, including
            #     the one that caught this gate convicting one vanished file twice.
            ('design-lab/scripts/verify_contract_bindings.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('design-lab/tests/test_contract_bindings.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 2,
            # 2026-10-08, the evidence readback wave (3520c82f / 2aeaaaf4 / a0d001a8) added four
            # pairs. Every one is a record bound to code that this wave genuinely changed, which is
            # the binding practice this file asks for -- they drift because the shipped implementation
            # moved, not because prose was extended:
            #   * verify_route_payload_contracts.py -- a seventh live-socket binding for
            #     GET /api/evidence-projection, validated over 156 object locations;
            #   * contract-bindings.json -- the route row that makes that binding non-removable
            #     (routes 53 -> 54, bound 15 -> 16);
            #   * test_contract_bindings.py -- its pinned route count moved with the same row;
            #   * reporting.py -- the claim enumeration became the single owner the binding gate
            #     imports, and the object reads were batched per commit (10.0s -> 1.0s).
            # No older record is rewritten; each stays the observation it was.
            ('design-lab/scripts/verify_route_payload_contracts.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
            ('docs/audits/DESIGNLAB-LAUNCH-REVIEW-PREFLIGHT-2026-10-08.md',
             'HASH_MOVED_SINCE_OBSERVATION'): 23,
            # 2026-10-08, commit 9e7db8a4 added one more. It is a record bound to code, not to prose:
            # reporting.py owns the byte-claim enumeration now, so the older record that hashed it as
            # its artefact is honestly describing bytes that have since moved. The older record is not
            # rewritten -- it stays the observation it was, and this line is what makes that visible
            # instead of silent.
            ('src/design_lab/governance/reporting.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 2,
            # 2026-10-08, the evidence readback wave's own boundary-text correction (78abda27) and
            # the brand-mark slice (11026229) both moved shell.ts. One record hashes shell.ts as its
            # artefact -- the row that bound the 证据 page's readback to the file it described -- so
            # it now describes bytes that have moved. It is not rewritten: the newer binding is the
            # brand row's own subject_files, and this line is what keeps the older observation
            # honest instead of silently absorbing the change.
            ('apps/workbench/shell.ts', 'HASH_MOVED_SINCE_OBSERVATION'): 1,
            # 2026-10-08, commit a87b8eea: the object-model round-trip builder was taught to follow
            # a $ref, and one record binds that very file as its artefact -- the row that recorded
            # the round-trip gate's per-object coverage. Editing the gate ages the record that
            # quotes it, which is the property this inventory exists to expose rather than a defect
            # in either. The older record still reports what it observed; the newer bytes are bound
            # by the row this wave appends.
            ('design-lab/tests/test_oda4_0204b_object_model_roundtrip.py',
             'HASH_MOVED_SINCE_OBSERVATION'): 1,
        })
        self.assertEqual(counts, expected,
                         'the drifted-artefact inventory is exact in both directions: a new '
                         'move, a new artefact name, or one more record on a known artefact '
                         'are all findings, and a drifted pair that quietly disappeared is too')
        self.assertEqual(sum(counts.values()), 53,
                         'the total drifted-record count is pinned, not derived')

    def test_missing_tracked_artefact_is_a_hard_break_not_a_warning(self):
        ledger = copy.deepcopy(_ledger())
        target = next(e for e in ledger['evidence']
                      if any(not a['path'].startswith('.project-local')
                             for a in e['artifacts']))
        target['artifacts'] = [{'path': 'docs/this-evidence-file-does-not-exist.md',
                                'sha256': '0' * 64}]
        result = gate.evaluate(REPO, ledger)
        self.assertEqual([entry[2] for entry in result['broken']], ['NOT-IN-GIT-INDEX'])

    def test_changed_artefact_bytes_count_as_drift_not_destruction(self):
        ledger = copy.deepcopy(_ledger())
        for receipt in ledger['evidence']:
            for artifact in receipt['artifacts']:
                if not artifact['path'].startswith('.project-local'):
                    artifact['sha256'] = 'f' * 64
                    result = gate.evaluate(REPO, ledger)
                    self.assertIn((receipt['id'], artifact['path'],
                                   'HASH_MOVED_SINCE_OBSERVATION'), result['drifted'])
                    self.assertEqual(result['broken'], [])
                    return
        self.fail('no tracked artefact found to tamper with')

    def test_runtime_paths_only_warn(self):
        ledger = copy.deepcopy(_ledger())
        ledger['evidence'] = [{
            'id': 'synthetic', 'task_ids': ['DL-R5-001'], 'kind': 'local_test',
            'outcome': 'PASS', 'subject_sha': '0' * 40, 'binding': 'COMMIT',
            'observed_at': '2026-10-06T00:00:00Z', 'software': {}, 'subject_files': {},
            'artifacts': [{'path': '.project-local/never/existed.json',
                           'sha256': '0' * 64}],
            'note': 'synthetic',
        }]
        result = gate.evaluate(REPO, ledger)
        self.assertEqual(result['broken'], [])
        self.assertEqual(len(result['runtime_missing']), 1)


if __name__ == '__main__':
    unittest.main()
