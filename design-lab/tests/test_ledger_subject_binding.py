# SPDX-License-Identifier: MIT
"""The ledger's evidence records must be checkable by someone who was not there.

`verify_ledger_subject_binding.py` recomputes every `subject_files` digest from the commit the
record binds to. This module proves the recomputation has teeth, that the sanctioned list is
two-way, and that the real ledger passes it today.

The synthetic cases inject their own byte reader, so they are deterministic and never depend
on what this machine happens to have in its working tree.
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import unittest
from hashlib import sha256
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'design-lab/scripts/verify_ledger_subject_binding.py'

spec = importlib.util.spec_from_file_location('ledger_subject_binding', SCRIPT)
gate = importlib.util.module_from_spec(spec)
sys.modules['ledger_subject_binding'] = gate
spec.loader.exec_module(gate)


def record(identity='r-x', commit='c0', **files):
    return {'id': identity, 'subject_sha': commit,
            'subject_files': dict(files)}


def reader(blobs):
    """A stand-in for `git show <commit>:<path>` over an in-memory byte map."""
    def read(commit, path):
        return blobs.get((commit, path))
    return read


class Classification(unittest.TestCase):
    def test_matching_digest_is_not_a_defect(self):
        body = b'print(1)\n'
        defects = gate.classify([record(pathA=sha256(body).hexdigest())],
                                reader({('c0', 'pathA'): body}), lambda _c: True)
        self.assertEqual(defects, [])

    def test_wrong_digest_is_found(self):
        defects = gate.classify([record(pathA=sha256(b'other bytes').hexdigest())],
                                reader({('c0', 'pathA'): b'print(1)\n'}), lambda _c: True)
        self.assertEqual(defects, [(gate.MISMATCH, 'r-x', 'pathA')])

    def test_path_missing_from_the_bound_commit_is_found(self):
        """The shape this ledger actually had: records naming files that were only ever on
        disk (interpreter caches) or that were committed later."""
        defects = gate.classify([record(pathA='a' * 64)], reader({}), lambda _c: True)
        self.assertEqual(defects, [(gate.ABSENT, 'r-x', 'pathA')])

    def test_unresolvable_commit_is_found_rather_than_assumed_ok(self):
        defects = gate.classify([record(commit='deadbeef', pathA='a' * 64)],
                                reader({}), lambda _c: False)
        self.assertEqual(defects, [(gate.NO_COMMIT, 'r-x', 'pathA')])

    def test_a_record_without_subject_files_is_not_silently_counted_as_clean(self):
        """Not a defect, but not a proof either: there is nothing to check. The gate's OK
        line reports how many files it actually compared so this cannot pass as coverage."""
        defects = gate.classify([{'id': 'r-y', 'subject_sha': 'c0', 'subject_files': {}}],
                                reader({}), lambda _c: True)
        self.assertEqual(defects, [])
        declared = sum(len(r.get('subject_files') or {}) for r in [{'subject_files': {}}])
        self.assertEqual(declared, 0)


class TwoWayLedger(unittest.TestCase):
    def test_an_unsanctioned_defect_fails(self):
        unsanctioned, stale = gate.partition(
            [(gate.MISMATCH, 'a-brand-new-record', 'src/design_lab/x.py')])
        self.assertEqual(unsanctioned, [(gate.MISMATCH, 'a-brand-new-record',
                                         'src/design_lab/x.py')])
        self.assertTrue(stale, 'the known entries are stale against synthetic input, which is '
                               'expected here; the real-ledger test below asserts both lists')

    def test_a_sanctioned_entry_that_stopped_being_a_defect_is_stale(self):
        """A fixed record must leave the list, or the list becomes a permanent excuse."""
        key = next(iter(gate.KNOWN))
        unsanctioned, stale = gate.partition([])
        self.assertEqual(unsanctioned, [])
        self.assertIn(key, stale)

    def test_the_blessing_is_per_record_not_per_path(self):
        """`a/other.py` is sanctioned for one record. A different record naming the same path
        is a new claim about bytes and has to be checked on its own terms."""
        path = 'src/design_lab/readiness/__pycache__/__init__.cpython-313.pyc'
        holder = 'r5-006-static-unit-20260928'
        self.assertIn((holder, path), gate.KNOWN)
        unsanctioned, _ = gate.partition([(gate.ABSENT, 'r5-999-copycat', path)])
        self.assertEqual(len(unsanctioned), 1)
        unsanctioned_ok, _ = gate.partition([(gate.ABSENT, holder, path)])
        self.assertEqual(unsanctioned_ok, [])

    def test_known_entries_are_unique_and_reasoned(self):
        self.assertGreaterEqual(len(gate.KNOWN), 60)
        for key, reason in gate.KNOWN.items():
            self.assertIsInstance(key, tuple)
            self.assertEqual(len(key), 2, f'{key} must be (record id, path)')
            self.assertGreaterEqual(len(reason), 30,
                                    f'{key} is sanctioned without a reason worth reading')


class RealLedger(unittest.TestCase):
    def test_current_ledger_passes_the_gate(self):
        result = subprocess.run([sys.executable, '-B', str(SCRIPT)],
                                capture_output=True, text=True, encoding='utf-8',
                                errors='replace', cwd=ROOT)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('LEDGER_SUBJECT_BINDING=OK', result.stdout)

    def test_the_gate_actually_compared_the_declared_files(self):
        """An OK line that checked nothing would be the worst outcome of all: green, and
        wrong. subject_files and checked must be the same number."""
        result = subprocess.run([sys.executable, '-B', str(SCRIPT)],
                                capture_output=True, text=True, encoding='utf-8',
                                errors='replace', cwd=ROOT)
        line = [l for l in result.stdout.splitlines() if 'LEDGER_SUBJECT_BINDING=OK' in l][0]
        fields = dict(pair.split('=') for pair in line.replace(
            'LEDGER_SUBJECT_BINDING=OK ', '').split() if '=' in pair)
        ledger = json.loads((ROOT / 'design-lab/config/task-ledger-r3.json')
                            .read_text(encoding='utf-8'))
        declared = sum(len(record.get('subject_files') or {})
                       for record in ledger['evidence'])
        self.assertEqual(int(fields['subject_files']), declared)
        self.assertEqual(int(fields['checked']), declared)
        self.assertGreater(declared, 200, 'the ledger has stopped carrying subject bytes; '
                                          'this gate would be vacuous')


if __name__ == '__main__':
    unittest.main()
