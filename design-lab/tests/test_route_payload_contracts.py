# SPDX-License-Identifier: MIT
"""Teeth for design-lab/scripts/verify_route_payload_contracts.py.

Five route families used to answer with a payload naming a ``schemaVersion`` that no schema
file described anywhere. They are bound now, and this module is what keeps the binding honest
rather than decorative. One live server is booted for the whole class (``make_server`` on a
real socket, a scratch project root, a real jury verdict and proposal filed through the write
routes), and every payload compared below is the body that server actually wrote.

Both obligations are tested:

1. the shipped schemas accept the shipped responses -- the control;
2. each failure mode goes RED FOR ITS OWN REASON. The schema and the payload set are injectable
   into ``check_binding``, so a mutation convicts the gate's reasoning without touching a
   shipped file. Cases that must go red: a field the schema requires that the route did not
   send (MISSING_FROM_EMITTER), a field the route sent that a closed schema forbids
   (UNDECLARED_BY_SCHEMA), a one-sided ``schemaVersion`` bump (VERSION_DRIFT), the ledger and
   this file disagreeing in either direction (LEDGER_DISAGREES / UNVALIDATED_BINDING), and every
   shape of NOTHING_TO_COMPARE.

An error whose reason is not the named one does not count, and an ERROR verdict is a harness
fault, not a pass.
"""
from __future__ import annotations

import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
GATE_PATH = REPO / 'design-lab' / 'scripts' / 'verify_route_payload_contracts.py'
if str(REPO / 'src') not in sys.path:
    sys.path.insert(0, str(REPO / 'src'))

_spec = importlib.util.spec_from_file_location('route_payload_contracts', GATE_PATH)
GATE = importlib.util.module_from_spec(_spec)
sys.modules[GATE_PATH.stem] = GATE
_spec.loader.exec_module(GATE)


def load_schema(binding):
    return json.loads((REPO / binding['schema']).read_text(encoding='utf-8'))


class RoutePayloadContractTests(unittest.TestCase):
    """One live harness; each case mutates a copy of a schema, never a shipped file."""

    @classmethod
    def setUpClass(cls):
        cls.harness_cm = GATE.Harness()
        cls.harness = cls.harness_cm.__enter__()
        cls.reg, cls.docs = GATE.registry()
        cls.bindings = GATE.build_bindings()
        cls.rows = GATE.ledger_route_rows()
        cls.payloads = {}
        for binding in cls.bindings:
            cls.payloads[binding['name']] = list(binding['cases'](cls.harness))

    @classmethod
    def tearDownClass(cls):
        cls.harness_cm.__exit__(None, None, None)

    def binding(self, name):
        return next(b for b in self.bindings if b['name'] == name)

    def convicting(self, errors, token):
        return [error for error in errors if token in error]

    # --- the control ---------------------------------------------------------------

    def test_the_live_responses_satisfy_the_shipped_schemas(self):
        errors, notes = GATE.run()
        self.assertEqual(errors, [], f'the shipped bindings are red: {errors[:6]}')
        self.assertEqual(len(notes), len(self.bindings))
        for note in notes:
            # A binding that compared zero object locations would report PASS on nothing.
            self.assertGreater(int(note.split('compared=')[-1]), 0, note)
            self.assertGreaterEqual(int(note.split('cases=')[1].split()[0]), 1, note)

    def test_every_family_is_covered_by_its_own_real_cases(self):
        """Not one fixture standing in for five boundaries: each binding must reach the route."""
        expected = {'path-diagnostic': 1, 'capability-library': 1, 'domain-pack-readback': 1,
                    'jury-readback': 2, 'task-resource-preflight': 3}
        for name, count in expected.items():
            cases = self.payloads[name]
            self.assertEqual(len(cases), count, f'{name} captured {len(cases)} payloads')
            for label, payload in cases:
                self.assertIsInstance(payload, dict, f'{name}/{label} is not a mapping')
                self.assertEqual(payload['schemaVersion'], self.binding(name)['version'],
                                 f'{name}/{label} answered under a different version')

    # --- field disagreement in both directions --------------------------------------

    def test_a_required_field_the_route_does_not_send_is_red(self):
        binding = self.binding('path-diagnostic')
        schema = load_schema(binding)
        schema['properties']['auditTrail'] = {'type': 'string'}
        schema['required'].append('auditTrail')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'MISSING_FROM_EMITTER')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn('auditTrail', convicting[0])
        self.assertIn('the schema requires fields the route did not send', convicting[0])

    def test_a_field_the_route_sends_that_a_closed_schema_forbids_is_red(self):
        binding = self.binding('path-diagnostic')
        schema = load_schema(binding)
        del schema['properties']['write_trace']
        schema['required'].remove('write_trace')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'UNDECLARED_BY_SCHEMA')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn('write_trace', convicting[0])

    def test_a_map_value_and_a_nested_def_are_compared_not_just_the_top_level(self):
        """tools.* is where a state word goes missing. A gate that only looked at `$` would
        have passed a payload whose every tool binding lost the field it is judged on."""
        binding = self.binding('path-diagnostic')
        schema = load_schema(binding)
        schema['$defs']['toolBinding']['required'].append('provenanceReceipt')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'MISSING_FROM_EMITTER')
        self.assertTrue(convicting, f'the nested map value was never compared: {errors[:4]}')
        self.assertTrue(all('$.tools.*' in error for error in convicting), convicting)
        self.assertTrue(all('provenanceReceipt' in error for error in convicting), convicting)

    def test_the_anyof_branch_a_payload_does_not_satisfy_is_not_convicted(self):
        """A host resource has no resolved_path and must not be reported for it. Only the
        tool branch a real tool record actually matches is compared."""
        binding = self.binding('task-resource-preflight')
        schema = load_schema(binding)
        schema['$defs']['toolResource']['required'].append('probeEvidenceSha256')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'MISSING_FROM_EMITTER')
        self.assertEqual(len(convicting), 5, f'expected one per tool record in the real cases: '
                                             f'{[e for e in errors if "MISSING" in e][:3]}')
        for error in convicting:
            self.assertIn('#anyOf[0]', error, f'wrong branch convicted: {error}')
            self.assertNotIn('DECLARED_NOT_PROBED', error)

    def test_a_referenced_jury_record_is_compared_against_its_own_contract(self):
        """The readback schema $refs assurance-jury-record-v2 rather than restating it, so a
        record field the referenced contract does not declare is still a finding here."""
        binding = self.binding('jury-readback')
        schema = load_schema(binding)
        # Drop a required field from the ENVELOPE, and separately prove the referenced record
        # is reached: a jury record is one of the compared object locations.
        nodes = GATE.comparisons(schema, self.payloads['jury-readback'][0][1], '$', [],
                                 self.docs, schema, self.reg)
        paths = {node['path'] for node in nodes}
        self.assertTrue(any(p.startswith('$.records[0]') for p in paths),
                        f'the referenced record was never descended into: {sorted(paths)[:8]}')
        self.assertTrue(any(p.startswith('$.current_verdicts.*') for p in paths),
                        'the map of current verdicts was never descended into')
        schema2 = copy.deepcopy(schema)
        del schema2['properties']['accepted_versions']
        schema2['required'].remove('accepted_versions')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema2,
                                       cases=self.payloads[binding['name']])
        self.assertEqual(len(self.convicting(errors, 'UNDECLARED_BY_SCHEMA')), 2, errors)

    # --- one-sided version moves ----------------------------------------------------

    def test_a_schema_bumping_its_const_alone_is_red(self):
        binding = self.binding('capability-library')
        schema = load_schema(binding)
        schema['properties']['schemaVersion']['const'] = 'design-lab/capability-library/v2'
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'VERSION_DRIFT')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn("binds 'design-lab/capability-library/v2'", convicting[0])

    def test_a_schema_that_declares_no_const_cannot_tie_a_payload_to_a_version(self):
        binding = self.binding('domain-pack-readback')
        schema = load_schema(binding)
        del schema['properties']['schemaVersion']['const']
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        self.assertEqual(len(self.convicting(errors, 'VERSION_DRIFT')), 1, errors)

    # --- the ledger and this file must agree ---------------------------------------

    def test_a_row_removed_or_downgraded_in_the_ledger_is_red_here(self):
        """The debt line is not removable: dropping the row, or quietly calling the route
        SCHEMA_LESS again, is convicted from both directions."""
        cases = {
            'row deleted': lambda rows: [r for r in rows
                                         if r['route'] != '/api/environment'],
            'row downgraded to SCHEMA_LESS': lambda rows: [
                dict(r, kind='SCHEMA_LESS') if r['route'] == '/api/environment' else r
                for r in rows],
            'row binds another schema': lambda rows: [
                dict(r, schema='design-lab/schemas/artifact-preflight.schema.json')
                if r['route'] == '/api/environment' else r for r in rows],
            'row names another emitter': lambda rows: [
                dict(r, emitter='src/design_lab/cli.py:1')
                if r['route'] == '/api/environment' else r for r in rows],
        }
        for label, mutate in cases.items():
            rows = mutate(self.rows)
            errors, _ = GATE.check_binding(self.binding('path-diagnostic'), docs=self.docs,
                                           reg=self.reg, rows=rows,
                                           cases=self.payloads['path-diagnostic'])
            convicting = self.convicting(errors, 'LEDGER_DISAGREES')
            self.assertEqual(len(convicting), 1, f'{label}: {errors[:4]}')

    def test_a_bound_row_with_no_payload_binding_is_theatre(self):
        """A ledger may not claim BOUND_SCHEMA for one of these schemas from a route this gate
        never drives -- the claim has to name the response that was actually checked."""
        rows = [dict(row, kind='BOUND_SCHEMA',
                     schema='design-lab/schemas/jury-readback.schema.json',
                     version='design-lab/jury-readback/v1',
                     emitter='src/design_lab/jury_review.py:53')
                for row in self.rows
                if row['route'] == '/api/projects/([0-9a-f]{32})/briefs']
        self.assertEqual(len(rows), 1, 'the fixture row no longer exists to mutate')
        errors = GATE.unvalidated_binding_errors(self.bindings, rows + self.rows)
        self.assertEqual(len(errors), 1, errors)
        self.assertIn('/api/projects/([0-9a-f]{32})/briefs', errors[0])
        self.assertIn('jury-readback.schema.json', errors[0])
        # And the same rows, unmutated, must not raise the finding: the check is keyed on the
        # route, not on the schema, so it cannot fire twice for the row that is genuinely bound.
        self.assertEqual(GATE.unvalidated_binding_errors(self.bindings, self.rows), [])

    # --- NOTHING TO_COMPARE is a failure, in every shape ----------------------------

    def test_no_payload_produced_is_red(self):
        binding = self.binding('path-diagnostic')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=load_schema(binding), cases=[])
        self.assertEqual(len(self.convicting(errors, 'NOTHING_TO_COMPARE')), 1, errors)

    def test_a_payload_that_is_not_a_mapping_is_red(self):
        binding = self.binding('path-diagnostic')
        for label, payload in (('empty', {}), ('list', [{'status': 'PATHS_RESOLVED'}]),
                               ('null', None)):
            errors, _ = GATE.check_binding(
                binding, docs=self.docs, reg=self.reg, rows=self.rows,
                schema_doc=load_schema(binding), cases=[(label, payload)])
            self.assertEqual(len(self.convicting(errors, 'NOTHING_TO_COMPARE')), 1,
                             f'{label}: {errors[:4]}')

    def test_a_schema_that_requires_nothing_is_red(self):
        """An empty `required` set is a schema that accepts any payload: it must not pass."""
        binding = self.binding('path-diagnostic')
        schema = load_schema(binding)
        stripped = GATE.strip_required(schema)
        self.assertNotEqual(stripped, schema, 'the fixture stopped requiring anything')
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=stripped, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'NOTHING_TO_COMPARE')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn('no schema node requires anything', convicting[0])

    def test_a_schema_binding_no_location_the_payload_reaches_is_red(self):
        """`type: object` with no `properties` binds nothing: the payload would sail through
        every check this gate has, so reaching zero object locations is itself the finding."""
        binding = self.binding('path-diagnostic')
        schema = {'$schema': 'https://json-schema.org/draft/2020-12/schema',
                  '$id': 'https://design-lab.local/schemas/path-diagnostic.schema.json',
                  'type': 'object'}
        errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg, rows=self.rows,
                                       schema_doc=schema, cases=self.payloads[binding['name']])
        convicting = self.convicting(errors, 'NOTHING_TO_COMPARE')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn('no object location', convicting[0])

    def test_a_route_that_refuses_is_red_not_skipped(self):
        binding = dict(self.binding('path-diagnostic'),
                       cases=lambda h: [('GET /api/not-a-route', h.get('/api/not-a-route'))])
        errors, _ = GATE.check_binding(binding, harness=self.harness, docs=self.docs,
                                       reg=self.reg, rows=self.rows)
        convicting = self.convicting(errors, 'NOTHING_TO_COMPARE')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn('the route refused', convicting[0])
        self.assertIn('ROUTE_REFUSED', convicting[0])

    def test_a_case_producer_that_misshapes_its_pair_is_red_not_a_crash(self):
        """An ERROR here would be a harness fault, not teeth: a producer that returns a bare
        payload instead of (label, payload) has to be named, not raised through."""
        binding = dict(self.binding('path-diagnostic'),
                       cases=lambda h: [h.get('/api/environment')])
        errors, _ = GATE.check_binding(binding, harness=self.harness, docs=self.docs,
                                       reg=self.reg, rows=self.rows)
        convicting = self.convicting(errors, 'NOTHING_TO_COMPARE')
        self.assertEqual(len(convicting), 1, errors)
        self.assertIn('not a (label, payload) pair', convicting[0])

    def test_a_binding_whose_files_are_missing_is_red(self):
        for field, value in (('schema', 'design-lab/schemas/does-not-exist.schema.json'),
                             ('emitter', 'src/design_lab/does_not_exist.py')):
            binding = dict(self.binding('path-diagnostic'), **{field: value})
            errors, _ = GATE.check_binding(binding, docs=self.docs, reg=self.reg,
                                           rows=self.rows, cases=self.payloads['path-diagnostic'])
            self.assertEqual(len(self.convicting(errors, 'NOTHING_TO_COMPARE')), 1,
                             f'{field}: {errors[:4]}')

    def test_no_bindings_at_all_is_red(self):
        errors, _ = GATE.run(bindings=[])
        self.assertEqual(len(errors), 1, errors)
        self.assertIn('NOTHING_TO_COMPARE', errors[0])

    def test_the_verdict_line_is_last_and_names_the_binding_count(self):
        """verify_design_lab.py summarises each gate by scanning its output from the end for a
        line starting with VERIFY_, so the shape and position of this line is part of it."""
        import contextlib
        import io
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            code = GATE.main([])
        lines = [line for line in buffer.getvalue().splitlines() if line]
        self.assertEqual(code, 0, f'the shipped bindings exit nonzero: {lines[-6:]}')
        self.assertTrue(lines[-1].startswith('VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS'), lines[-1])
        self.assertIn(f'bindings={len(self.bindings)}', lines[-1])
        self.assertIn('failures=0', lines[-1])


if __name__ == '__main__':
    unittest.main(verbosity=2)
