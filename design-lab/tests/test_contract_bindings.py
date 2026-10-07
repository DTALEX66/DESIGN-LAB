# SPDX-License-Identifier: MIT
"""Teeth for design-lab/scripts/verify_contract_bindings.py.

Two obligations, and both are tested:

1. the shipped ledger is TRUE of the shipped repo -- every one of the 32 files under
   design-lab/schemas/contracts/ is accounted for, exactly one row each, 1 BINDING and 31
   INERT, and every route http_service.py dispatches on is either bound to a schema that
   exists or listed as schema-less with a reason that names the debt;
2. each failure mode goes RED FOR ITS OWN REASON against a mutated COPY of the tree. The
   scratch tree is assembled from the files the ledger itself names, so a mutation convicts
   the gate's reasoning and not a missing file. The unmutated scratch copy is asserted green
   first: if the control is red, the mutations prove nothing.

An error whose reason is not the named one does not count. A mutated copy that goes red
because the scratch tree was assembled badly -- or that stays green -- is a failure here.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import shutil
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCRATCH_BASE = REPO / '.project-local' / 'task-runtime' / 'contract-bindings-scratch'

# Reassignable so a falsifier can point the same cases at a weakened COPY of the gate and
# show these tests stop convicting. Never mutated here.
GATE_PATH = REPO / 'design-lab' / 'scripts' / 'verify_contract_bindings.py'

CONTRACTS = 32
BINDING_ROWS = 1
INERT_ROWS = 31


def load_gate(path: Path = None):
    """Import the shipped gate from its real path, under a unique module name."""
    target = Path(path or GATE_PATH)
    spec = importlib.util.spec_from_file_location('verify_contract_bindings_under_test', target)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def ledger_rows(gate, repo: Path):
    return json.loads((repo / gate.LEDGER_REL).read_text(encoding='utf-8'))


def build_pristine_scratch(dest: Path) -> Path:
    """A real, complete, unmutated tree the gate can judge -- copied, never symlinked.

    The set of files is derived from the shipped ledger rather than hardcoded, so the scratch
    tree cannot silently fall behind a ledger edit.
    """
    gate = load_gate()
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    shutil.copytree(REPO / 'design-lab' / 'schemas', dest / 'design-lab' / 'schemas')
    (dest / 'design-lab' / 'config').mkdir(parents=True, exist_ok=True)
    shutil.copy(REPO / gate.LEDGER_REL, dest / gate.LEDGER_REL)
    (dest / 'src' / 'design_lab').mkdir(parents=True, exist_ok=True)
    shutil.copy(REPO / gate.HTTP_REL, dest / gate.HTTP_REL)
    ledger = ledger_rows(gate, REPO)
    for row in ledger['contracts']:
        for ref in list(row.get('instances') or []) + list(row.get('tests') or []):
            source = REPO / ref.split(':', 1)[0]
            if not source.is_file():
                raise AssertionError(f'the shipped ledger names an absent file: {ref}')
            target = dest / ref.split(':', 1)[0]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(source, target)
    for row in ledger['routes']:
        emitter = row.get('emitter')
        if not emitter:
            continue
        source = REPO / emitter.split(':', 1)[0]
        if not source.is_file():
            raise AssertionError(f'the shipped ledger names an absent emitter: {emitter}')
        target = dest / emitter.split(':', 1)[0]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(source, target)
    return dest


def patched(text: str, before: str, after: str) -> str:
    count = text.count(before)
    assert count == 1, f'anchor matched {count}x, not exactly 1x: {before[:70]!r}'
    return text.replace(before, after, 1)


def write_mutant(scratch: Path, rel: str, text: str) -> Path:
    path = scratch / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')
    return path


def edit_ledger(scratch: Path, mutate) -> Path:
    """Rewrite the scratch ledger through `mutate(rows_doc)`, keeping it valid JSON."""
    gate = load_gate()
    doc = json.loads((scratch / gate.LEDGER_REL).read_text(encoding='utf-8'))
    mutate(doc)
    return write_mutant(scratch, gate.LEDGER_REL,
                        json.dumps(doc, ensure_ascii=False, indent=2))


class GateTeethTests(unittest.TestCase):
    """Every case runs the SHIPPED gate over a tree; only the tree differs per case."""

    @classmethod
    def setUpClass(cls):
        cls.gate = load_gate()
        cls.pristine = build_pristine_scratch(SCRATCH_BASE / 'pristine')

    def scratch(self, name: str) -> Path:
        """A fresh copy of the pristine scratch tree, mutated by `apply`."""
        dest = SCRATCH_BASE / name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(self.pristine, dest)
        return dest

    def run_gate(self, repo: Path):
        errors, notes, summary = self.gate.run(repo)
        return errors, notes, summary

    def assert_red_for(self, errors, token, expected):
        """Exactly `expected` red lines carry `token`, and NOTHING else is red."""
        convicting = [error for error in errors if token in error]
        self.assertEqual(
            len(convicting), expected,
            f'expected exactly {expected} red line(s) naming {token}, got '
            f'{len(convicting)} of {len(errors)}: {errors[:4]}')
        others = [error for error in errors if token not in error]
        self.assertEqual(
            others, [],
            f'a mutation aimed at {token} also produced unrelated red lines, so the case is '
            f'not surgical: {others[:4]}')
        return convicting[0]

    # --- the shipped repo -------------------------------------------------------

    def test_shipped_ledger_is_green(self):
        errors, notes, summary = self.gate.run(REPO)
        self.assertEqual(errors, [], f'the shipped ledger is red: {errors[:6]}')
        self.assertEqual(summary['schemas'], CONTRACTS)
        self.assertEqual(summary['binding'], BINDING_ROWS)
        self.assertEqual(summary['inert'], INERT_ROWS)
        self.assertEqual(summary['routes'], summary['dispatched'])
        self.assertGreaterEqual(summary['bound'], 1)

    def test_pristine_scratch_copy_is_green(self):
        """The control: the same gate over the copied tree must be green, or no mutation here
        is evidence of anything."""
        errors, _, summary = self.run_gate(self.pristine)
        self.assertEqual(errors, [], f'the unmutated scratch tree is red: {errors[:6]}')
        self.assertEqual(summary['schemas'], CONTRACTS)

    def test_binding_row_names_a_real_producer_of_its_own_version(self):
        """Not a file-exists check: the producer must emit the version the schema binds."""
        ledger = ledger_rows(self.gate, REPO)
        bound = [row for row in ledger['contracts'] if row['status'] == self.gate.BINDING]
        self.assertEqual(len(bound), BINDING_ROWS)
        for row in bound:
            schema = json.loads((REPO / row['schema']).read_text(encoding='utf-8'))
            const = schema['properties']['schemaVersion']['const']
            self.assertEqual(row['version'], const)
            self.assertTrue(row['instances'], row['schema'])
            for ref in row['instances']:
                text = (REPO / ref.split(':')[0]).read_text(encoding='utf-8')
                self.assertIn(const, text, f'{ref} does not produce {const}')

    def test_no_inert_row_is_phased_as_pending_work(self):
        ledger = ledger_rows(self.gate, REPO)
        inert = [row for row in ledger['contracts'] if row['status'] == self.gate.INERT]
        self.assertEqual(len(inert), INERT_ROWS)
        for row in inert:
            reason = row['reason'].lower()
            for word in self.gate.EVASIVE:
                self.assertNotIn(word, reason,
                                 f'{row["schema"]} calls its absence {word!r}: {row["reason"]}')
            self.assertFalse(row['instances'], f'{row["schema"]} is INERT but names an instance')

    def test_the_artifact_preflight_gap_cannot_come_back(self):
        """The route whose payload claimed a version with nothing behind it is BOUND_SCHEMA,
        and its schema still carries that version."""
        ledger = ledger_rows(self.gate, REPO)
        row = next(row for row in ledger['routes'] if row['route'].endswith('/preflight'
                                                                  '(?:\\?profile=(print|digital|video))?'))
        self.assertEqual(row['kind'], self.gate.BOUND_SCHEMA)
        self.assertEqual(row['version'], 'design-lab/artifact-preflight/v1')
        schema_text = (REPO / row['schema']).read_text(encoding='utf-8')
        self.assertIn(row['version'], schema_text)
        self.assertIn(row['version'], (REPO / row['emitter'].split(':')[0]).read_text(encoding='utf-8'))

    def test_a_version_claiming_route_without_a_schema_says_so(self):
        """A SCHEMA_LESS row whose payload declares a version must name the missing schema, so
        'deliberately schema-less' cannot quietly mean 'nobody looked'."""
        ledger = json.loads((REPO / self.gate.LEDGER_REL).read_text(encoding='utf-8'))
        claiming = [row for row in ledger['routes']
                    if row['kind'] == self.gate.SCHEMA_LESS and row.get('version')]
        self.assertGreaterEqual(len(claiming), 6)
        for row in claiming:
            self.assertTrue(any(phrase in row['reason'].lower()
                                for phrase in self.gate.DEBT_PHRASES),
                            f'{row["route"]} declares {row["version"]} without naming the debt')
            holders = self.gate.schema_version_index(REPO / self.gate.SCHEMA_ROOT).get(row['version'])
            self.assertIsNone(holders, f'{row["route"]} says schema-less but {holders} exists')

    def test_verdict_line_is_what_the_aggregate_matches(self):
        """verify_design_lab.py summarises each gate by scanning its output from the end for a
        line starting with VERIFY_. A verdict printed first among 80 detail lines reads as no
        verdict, so the shape and position of this line is part of the contract."""
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            code = self.gate.main([])
        lines = [line for line in buffer.getvalue().splitlines() if line]
        self.assertEqual(code, 0, f'the shipped ledger exits nonzero: {lines[-6:]}')
        self.assertEqual(len(lines), 1 + 32 + 48,
                         'one verdict line, one note per contract row, one per route row')
        verdict = lines[-1]
        self.assertTrue(verdict.startswith('VERIFY_CONTRACT_BINDINGS=PASS'), verdict)
        for token in (f'schemas={CONTRACTS}', f'binding={BINDING_ROWS}', f'inert={INERT_ROWS}',
                      'routes=48', 'dispatched=48', 'bound=6'):
            self.assertIn(token, verdict)

    # --- failure modes, each against a mutated copy ------------------------------

    def test_unlisted_schema_file_is_red(self):
        repo = self.scratch('unlisted-schema')
        new = repo / 'design-lab/schemas/contracts/widget-plan.schema.json'
        new.write_text(json.dumps({
            '$schema': 'https://json-schema.org/draft/2020-12/schema',
            '$id': 'https://design-lab.local/schemas/widget-plan.schema.json',
            'title': 'widget-plan', 'type': 'object', 'additionalProperties': False,
            'required': ['widget_id', 'schemaVersion'],
            'properties': {'widget_id': {'type': 'string'},
                           'schemaVersion': {'const': 'design-lab/widget-plan/v1'}}},
            indent=2), encoding='utf-8', newline='\n')
        errors, _, summary = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'UNLISTED_SCHEMA', 1)
        self.assertIn('widget-plan.schema.json', reason)
        self.assertEqual(summary['schemas'], CONTRACTS + 1,
                         'the count must move with the directory, or the row is decoration')

    def test_deleted_producer_line_rotts_a_binding(self):
        repo = self.scratch('rotten-binding')
        rel = 'src/design_lab/analysis/decomposition.py'
        original = (repo / rel).read_text(encoding='utf-8')
        patched_text = patched(
            original,
            '            "schemaVersion": "design-lab/planar-decomposition/v1",\n',
            '            "schemaVersion": "design-lab/planar-decomposition/v2",\n')
        write_mutant(repo, rel, patched_text)
        errors, _, _ = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'BINDING_ROTTEN', 1)
        self.assertIn('planar-decomposition.schema.json', reason)
        self.assertIn('design-lab/planar-decomposition/v1', reason)

    def test_binding_row_without_a_producer_is_red(self):
        repo = self.scratch('binding-without-producer')

        def mutate(doc):
            for row in doc['contracts']:
                if row['status'] == 'BINDING':
                    row['instances'] = []

        edit_ledger(repo, mutate)
        errors, _, summary = self.run_gate(repo)
        self.assert_red_for(errors, 'BINDING_WITHOUT_INSTANCE', 1)
        self.assertEqual(summary['binding'], 1)

    def test_missing_ledger_is_red_not_green(self):
        repo = self.scratch('no-ledger')
        (repo / self.gate.LEDGER_REL).unlink()
        errors, _, summary = self.run_gate(repo)
        self.assert_red_for(errors, 'NOTHING_TO_COMPARE', 1)
        self.assertEqual(summary['schemas'], CONTRACTS,
                         'the gate must still count the 32 orphaned contracts')

    def test_empty_contract_directory_is_red_not_green(self):
        """The NOTHING_TO_COMPARE guard on the other axis: a gate that finds no schema at all
        must not report that the contract surface is fine."""
        repo = self.scratch('no-schemas')
        for path in (repo / 'design-lab/schemas/contracts').glob('*.json'):
            path.unlink()
        errors, _, summary = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'NOTHING_TO_COMPARE', 1)
        self.assertIn('schemas/contracts', reason)
        self.assertEqual(summary['schemas'], 0)

    def test_listed_schema_that_vanished_is_red(self):
        """Symmetry with the unlisted file: a row whose schema was deleted cannot linger."""
        repo = self.scratch('vanished-schema')
        gone = 'design-lab/schemas/contracts/permission-manifest.schema.json'
        (repo / gone).unlink()
        errors, _, summary = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'SCHEMA_ROW_ABSENT', 1)
        self.assertIn('permission-manifest.schema.json', reason)
        self.assertEqual(summary['schemas'], CONTRACTS - 1)

    def test_inert_row_that_names_an_instance_is_red(self):
        """The other half of the BINDING rule: an implemented schema cannot hide as INERT."""
        repo = self.scratch('inert-with-instance')

        def mutate(doc):
            for row in doc['contracts']:
                if row['schema'].endswith('audit-event.schema.json'):
                    row['status'] = 'INERT'
                    row['instances'] = ['src/design_lab/runtime/asset_store.py:144']

        edit_ledger(repo, mutate)
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'INERT_ROW_HAS_INSTANCE', 1)

    def test_one_sided_version_bump_is_red(self):
        repo = self.scratch('version-drift')
        rel = 'design-lab/schemas/contracts/retry-policy.schema.json'
        original = (repo / rel).read_text(encoding='utf-8')
        write_mutant(repo, rel, patched(
            original, '"const": "design-lab/retry-policy/v1"',
            '"const": "design-lab/retry-policy/v2"'))
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'VERSION_DRIFT', 1)

    def test_new_route_without_a_row_is_red(self):
        """The boundary half: a route that appears and is not accounted for cannot pass."""
        repo = self.scratch('unlisted-route')
        rel = 'src/design_lab/http_service.py'
        original = (repo / rel).read_text(encoding='utf-8')
        write_mutant(repo, rel, patched(
            original,
            "                    if self.path == '/api/design-systems':\n",
            "                    if self.path == '/api/telemetry':\n"
            "                        return self.send_json(200, {'events': []})\n"
            "                    if self.path == '/api/design-systems':\n"))
        errors, _, summary = self.run_gate(repo)
        self.assert_red_for(errors, 'UNLISTED_ROUTE', 1)
        self.assertEqual(summary['dispatched'], summary['routes'] + 1)

    def test_bound_route_losing_its_emitter_is_red(self):
        repo = self.scratch('route-emitter-gone')
        rel = 'src/design_lab/assurance/production_preflight.py'
        original = (repo / rel).read_text(encoding='utf-8')
        write_mutant(repo, rel, patched(
            original,
            "        'schemaVersion': 'design-lab/artifact-preflight/v1',",
            "        'schemaVersion': 'design-lab/artifact-preflight/v2',"))
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'ROUTE_EMITTER_MISSING', 1)

    def test_schema_less_row_whose_debt_is_already_paid_is_red(self):
        """A ledger that under-claims is as wrong as one that over-claims."""
        repo = self.scratch('stale-schema-less')
        victim = None
        for row in ledger_rows(self.gate, REPO)['routes']:
            if row['kind'] == self.gate.SCHEMA_LESS and row.get('version'):
                victim = row['version']
                break
        self.assertTrue(victim, 'no version-bearing SCHEMA_LESS row exists to pay off')
        (repo / 'design-lab/schemas/paid-off-debt.schema.json').write_text(json.dumps({
            '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'paid',
            'type': 'object', 'properties': {'schemaVersion': {'const': victim}}}, indent=2),
            encoding='utf-8', newline='\n')
        errors, _, _ = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'SCHEMA_LESS_STALE', 1)
        self.assertIn(victim, reason)

    def test_evasive_inert_reason_is_red(self):
        repo = self.scratch('evasive-reason')

        def mutate(doc):
            for row in doc['contracts']:
                if row['schema'].endswith('probe-result.schema.json'):
                    row['reason'] = 'Future work: the probe surface will be implemented later.'

        edit_ledger(repo, mutate)
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'INERT_REASON_EVASIVE', 1)

    def test_every_mode_still_convicts_when_other_checks_pass(self):
        """Regression guard for the scratch harness itself: each named mutation must move the
        red-line count by exactly one, so no case rides on a pre-existing failure."""
        cases = {
            'unlisted-schema': lambda repo: (repo / 'design-lab/schemas/contracts' / 'zzz.schema.json').write_text(
                '{"$schema":"https://json-schema.org/draft/2020-12/schema","title":"zzz",'
                '"type":"object","properties":{"schemaVersion":'
                '{"const":"design-lab/zzz/v1"}}}', encoding='utf-8', newline='\n'),
            'rotten-binding': lambda repo: write_mutant(
                repo, 'src/design_lab/analysis/decomposition.py',
                patched((repo / 'src/design_lab/analysis/decomposition.py').read_text(encoding='utf-8'),
                        '"design-lab/planar-decomposition/v1"', '"design-lab/planar-decomposition/v9"')),
            'binding-without-producer': lambda repo: edit_ledger(repo, lambda doc: [
                row.update(instances=[]) for row in doc['contracts'] if row['status'] == 'BINDING']),
            'no-ledger': lambda repo: (repo / self.gate.LEDGER_REL).unlink(),
        }
        for name, apply in cases.items():
            repo = self.scratch(f'count-{name}')
            apply(repo)
            errors, _, _ = self.run_gate(repo)
            self.assertEqual(len(errors), 1,
                             f'{name} produced {len(errors)} red lines, expected exactly one: '
                             f'{errors[:3]}')


if __name__ == '__main__':
    unittest.main(verbosity=2)
