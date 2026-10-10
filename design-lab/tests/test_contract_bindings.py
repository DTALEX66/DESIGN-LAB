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

import ast
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
# 2026-10-08 rights-gate reachability: design-lab/schemas/contracts/rights-decision.schema
# json went INERT -> BINDING when src/design_lab/assurance/rights_ledger.py began loading it
# (contract() reads the file, its enum and its closed property set at validation time), so one
# row left the inert inventory and joined the bound one. Not a re-threshold: the ledger itself
# moved, and design-lab/scripts/verify_contract_bindings.py re-checks the named instance and
# both named test files on every run.
BINDING_ROWS = 2
INERT_ROWS = 30


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
        for ref in (list(row.get('instances') or []) + list(row.get('tests') or [])
                    + list(row.get('fixtures') or [])):
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

    # --- the `:NN` half of an emitter pointer --------------------------------------

    def pointer_rows(self, repo: Path) -> list[dict]:
        return [row for row in ledger_rows(self.gate, repo)['routes']
                if row.get('emitter') and row.get('version')]

    def test_every_shipped_emitter_pointer_lands_on_a_line_that_carries_its_version(self):
        """The line number in `path:line` is read now, and the shipped ledger must survive it.

        `instance_path` has always stripped the `:NN`, so for the whole life of this ledger the
        number was decoration: adding a docstring paragraph to native_delivery.py shifted the
        envelope's version constant by three lines and VERIFY_CONTRACT_BINDINGS stayed green.
        Measured over every row here, not asserted in prose.
        """
        rows = self.pointer_rows(REPO)
        self.assertGreaterEqual(len(rows), 15,
                                'barely any row carries a pointer, so the loop below checks nothing')
        broken = [error for row in rows
                  for error in self.gate.emitter_pointer_errors(REPO, row['route'], row['emitter'],
                                                                 row['version'])]
        self.assertEqual(broken, [],
                         f'the ledger names lines the gate cannot honour: {broken[:4]}')

    def retarget(self, scratch: Path, prefix: str, pointer: str) -> str:
        """Point the one row whose emitter starts with `prefix` at `pointer`; return its version.

        The scratch ledger is rewritten through `edit_ledger`, so the mutation stays JSON the gate
        can parse and the case convicts the pointer rule rather than the ledger's syntax.
        """
        moved = []

        def mutate(doc):
            for row in doc['routes']:
                if (row.get('emitter') or '').startswith(prefix) and row.get('version'):
                    row['emitter'] = pointer
                    moved.append(row['version'])
        edit_ledger(scratch, mutate)
        self.assertEqual(len(moved), 1, f'{prefix} is named by {len(moved)} rows, not exactly one')
        return moved[0]

    def test_a_pointer_moved_onto_another_line_is_the_only_red_line(self):
        head = 'src/design_lab/native_delivery.py'
        version = next(r['version'] for r in self.pointer_rows(REPO)
                       if r['emitter'].startswith(head))
        repo = self.scratch('pointer-moved')
        self.retarget(repo, head, f'{head}:1')
        errors, _, _ = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'EMITTER_POINTER_NOT_THE_VERSION', 1)
        self.assertIn(head, reason)
        self.assertIn(version, reason)

    def test_a_pointer_into_prose_is_red_as_prose_not_as_a_missing_version(self):
        """A sentence that mentions the version is not where the version comes from.

        The gate's own file-half rule already refuses to count a quoted version as an emission
        (`emitted_versions` says so in its docstring), so a pointer into a docstring has to be
        refused the same way -- or the ledger could cite a migration note and call it a binding.
        """
        head = 'src/design_lab/native_delivery.py'
        tree = ast.parse((REPO / head).read_text(encoding='utf-8'))
        docstring = tree.body[0]
        self.assertIsInstance(docstring.value, ast.Constant,
                              'the module no longer opens with a docstring, so this fixture is stale')
        inside = docstring.value.lineno + 1
        self.assertLessEqual(inside, docstring.value.end_lineno)
        version = next(r['version'] for r in self.pointer_rows(REPO)
                       if r['emitter'].startswith(head))
        repo = self.scratch('pointer-into-prose')
        self.retarget(repo, head, f'{head}:{inside}')
        errors, _, _ = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'EMITTER_POINTER_IS_PROSE', 1)
        self.assertIn('docstring', reason)
        self.assertIn(version, reason)

    def test_a_pointer_without_a_number_or_past_the_end_of_the_file_is_named_for_what_it_is(self):
        ref = 'src/design_lab/native_delivery.py'
        row = next(r for r in self.pointer_rows(REPO) if r['emitter'].startswith(ref))
        lines = len((REPO / ref).read_text(encoding='utf-8').splitlines())
        shape = self.gate.emitter_pointer_errors(REPO, 'r', ref, row['version'])
        self.assertEqual(len(shape), 1, f'a pointer with no line number: {shape}')
        self.assertIn('EMITTER_POINTER_SHAPE', shape[0])
        beyond = self.gate.emitter_pointer_errors(REPO, 'r', f'{ref}:{lines + 1}', row['version'])
        self.assertEqual(len(beyond), 1, f'a pointer past the end of the file: {beyond}')
        self.assertIn('EMITTER_POINTER_OUT_OF_RANGE', beyond[0])
        self.assertIn(f'{lines} lines', beyond[0])

    def test_the_pointer_verdict_comes_from_the_rule_and_not_from_the_fixture(self):
        """Weaken a COPY of the gate until the pointer question is a no-op, and show it stops
        convicting.

        Otherwise the three cases above might be naming a line the gate never examined. The
        weakened copy still judges every other part of the ledger -- it simply stops noticing a
        moved line, which is exactly the failure this wave set out to make impossible.
        """
        head = 'src/design_lab/native_delivery.py'
        version = next(r['version'] for r in self.pointer_rows(REPO)
                       if r['emitter'].startswith(head))
        weak_dir = SCRATCH_BASE / 'gate-pointer-weakened'
        if weak_dir.exists():
            shutil.rmtree(weak_dir)
        weak_dir.mkdir(parents=True)
        source = GATE_PATH.read_text(encoding='utf-8')
        weak_path = weak_dir / 'verify_contract_bindings.py'
        weak_path.write_text(patched(source, "    head, _, tail = ref.partition(':')",
                                     "    return []\n    head, _, tail = ref.partition(':')"),
                             encoding='utf-8', newline='\n')
        weak = load_gate(weak_path)
        weak.REPO = REPO  # the copy's own module-level root points at its scratch directory
        self.assertEqual(weak.emitter_pointer_errors(REPO, 'r', f'{head}:1', version), [],
                         'the weakened gate still convicts, so the shipped rule was never the cause')
        self.assertEqual(len(self.gate.emitter_pointer_errors(REPO, 'r', f'{head}:1', version)), 1,
                         'the shipped gate stopped naming the moved pointer')
        repo = self.scratch('pointer-moved-weakened')
        self.retarget(repo, head, f'{head}:1')
        errors, _, _ = weak.run(repo)
        self.assertEqual(errors, [],
                          f'the weakened gate found red where the rule is absent: {errors[:3]}')
        shipped_errors, _, _ = self.run_gate(repo)
        self.assert_red_for(shipped_errors, 'EMITTER_POINTER_NOT_THE_VERSION', 1)

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
        # An exact inventory of the debts still unpaid, not a floor. 2026-10-08: 7 -> 2,
        # because design-lab/jury-readback/v1, design-lab/task-resource-preflight/v1,
        # design-lab/path-diagnostic/v1, design-lab/capability-library/v1 and
        # design-lab/domain-pack-readback/v1 each gained a schema and are now BOUND_SCHEMA
        # rows validated against a live response by
        # design-lab/scripts/verify_route_payload_contracts.py. The two left were the Adobe
        # job-spec debts (adobe-patch-job/v1 with photoshop-patch-job/v1 on one route, and
        # photoshop-native-job/v1), still unpaid. 2026-10-08 (rights chain): the list is 3,
        # because GET /api/projects/<id>/rights answers a design-lab/rights-readback/v1
        # envelope that has no schema behind it -- named here as debt, with the reason
        # stating it plainly, rather than left unlisted. 2026-10-08 (research chain): the list is 4,
        # because GET /api/projects/<id>/research answers a design-lab/research-readback/v1 envelope
        # with no schema behind it -- the same shape of named debt as the rights read-back, added by
        # the slice that made findings persistable, and its POST sibling is the BOUND_SCHEMA row that
        # validates against research-finding.schema.json. An unchanged list here would be the false
        # claim, not the safer one. The loop below is the teeth and did not move: every remaining
        # claim still has to name its missing schema. 2026-10-10 (DL-UI-U06): the list is 5, because
        # GET /api/projects/<id>/native-runtime answers a design-lab/native-runtime-readback/v1
        # envelope with no schema behind it -- the same named-debt shape as the rights and research
        # read-backs, added with the route rather than back-filled after it.
        self.assertEqual(sorted(row['route'] for row in claiming),
                         sorted(['/api/projects/([0-9a-f]{32})/tasks/(native-job-[0-9a-f]{64})/patch',
                                 '/api/projects/([0-9a-f]{32})/native-plans',
                                 '/api/projects/([0-9a-f]{32})/rights',
                                 '/api/projects/([0-9a-f]{32})/native-runtime',
                                 '/api/projects/([0-9a-f]{32})/research']),
                         'the unpaid version-bearing routes are an inventory, so a paid debt '
                         'left listed as unpaid and an unlisted new debt are both red here')
        for row in claiming:
            self.assertTrue(any(phrase in row['reason'].lower()
                                for phrase in self.gate.DEBT_PHRASES),
                            f'{row["route"]} declares {row["version"]} without naming the debt')
            holders = self.gate.schema_version_index(REPO / self.gate.SCHEMA_ROOT).get(row['version'])
            self.assertIsNone(holders, f'{row["route"]} says schema-less but {holders} exists')

    def test_the_five_closed_route_families_are_bound_and_stay_bound(self):
        """A paid debt is a BOUND_SCHEMA row naming a schema that exists, carries the version,
        and names the file that writes it. Recorded 2026-10-08."""
        index = self.gate.schema_version_index(REPO / self.gate.SCHEMA_ROOT)
        closed = {
            '/api/environment': 'design-lab/path-diagnostic/v1',
            '/api/capabilities': 'design-lab/capability-library/v1',
            '/api/domains': 'design-lab/domain-pack-readback/v1',
            '/api/task-preflight': 'design-lab/task-resource-preflight/v1',
            '/api/projects/([0-9a-f]{32})/jury': 'design-lab/jury-readback/v1',
        }
        ledger = json.loads((REPO / self.gate.LEDGER_REL).read_text(encoding='utf-8'))
        rows = {row['route']: row for row in ledger['routes']}
        for route, version in closed.items():
            row = rows[route]
            self.assertEqual(row['kind'], self.gate.BOUND_SCHEMA, route)
            self.assertEqual(row['version'], version, route)
            self.assertTrue((REPO / row['schema']).is_file(), f'{route} binds an absent schema')
            schema = json.loads((REPO / row['schema']).read_text(encoding='utf-8'))
            self.assertEqual(schema['properties']['schemaVersion']['const'], version, route)
            self.assertIs(schema.get('additionalProperties'), False,
                          f'{row["schema"]} is not closed, so a new field would pass silently')
            emitter_file = row['emitter'].split(':')[0]
            self.assertIn(version, self.gate.emitted_versions(REPO / emitter_file),
                          f'{emitter_file} no longer writes {version} as a schemaVersion')
            self.assertIn(version, index, f'no schema in {self.gate.SCHEMA_ROOT} binds {version}')

    def test_a_debt_row_cannot_be_laundered_by_deleting_the_version_line(self):
        """The gate reads the version out of the emitter's own AST, so dropping the ledger's
        `version` field does not make an unvalidated boundary payload validated -- and a paid
        debt cannot be pushed back to a plain row by deleting the line that names it."""
        for name, route, mutate in (
            # A closed family, laundered by calling it SCHEMA_LESS again and removing the debt.
            ('paid-then-unlined', '/api/task-preflight',
             lambda row: (row.pop('version'), row.update(kind='SCHEMA_LESS'))),
            # A debt still unpaid, laundered by removing only the version it names.
            ('debt-unlined', '/api/projects/([0-9a-f]{32})/tasks/(native-job-[0-9a-f]{64})/patch',
             lambda row: row.pop('version')),
        ):
            repo = self.scratch(name)

            def apply(doc, route=route, mutate=mutate):
                for row in doc['routes']:
                    if row['route'] == route:
                        mutate(row)

            edit_ledger(repo, apply)
            errors, _, _ = self.run_gate(repo)
            reason = self.assert_red_for(errors, 'SCHEMA_LESS_DEBT_UNNAMED', 1)
            self.assertIn(route, reason)
            self.assertIn('dropping the debt line does not pay the debt', reason)

    def test_a_bound_row_pointed_at_an_emitter_that_no_longer_writes_it_is_red(self):
        """The version literal is still in the source -- it just is not what the payload writes
        any more. ROUTE_EMITTER_MISSING cannot see that; the AST emission set can."""
        repo = self.scratch('emitter-disagrees')
        rel = 'src/design_lab/domain_packs.py'
        original = (repo / rel).read_text(encoding='utf-8')
        write_mutant(repo, rel, patched(
            original, '        "schemaVersion": SCHEMA_VERSION,',
            '        "schemaVersion": "design-lab/domain-pack-readback/v2",'))
        errors, _, _ = self.run_gate(repo)
        reason = self.assert_red_for(errors, 'EMITTER_VERSION_DISAGREES', 1)
        self.assertIn('/api/domains', reason)
        self.assertIn('design-lab/domain-pack-readback/v1', reason)

    def test_verdict_line_is_what_the_aggregate_matches(self):
        """verify_design_lab.py summarises each gate by scanning its output from the end for a
        line starting with VERIFY_. A verdict printed first among 80 detail lines reads as no
        verdict, so the shape and position of this line is part of the contract."""
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            code = self.gate.main([])
        lines = [line for line in buffer.getvalue().splitlines() if line]
        self.assertEqual(code, 0, f'the shipped ledger exits nonzero: {lines[-6:]}')
        # An exact inventory of the ledger, not a floor: it moves only when the ledger
        # itself gains a row the gate then re-checks. 2026-10-08: 48 -> 49 routes and
        # dispatched 48 -> 49 for the new GET .../bundles/<id>/versions/<v>/receipt row,
        # which binds the persisted DeliveryReceipt V2 to the same schema and the same
        # emitter the POST .../bundle row already binds. Nothing was re-thresholded: the
        # route is dispatched in http_service.py, so an unchanged count is the false claim.
        # 2026-10-08 (rights chain): 49 -> 51, for the two routes src/design_lab/
        # http_service.py now dispatches on -- GET .../rights (the read-back, named as
        # schema-less debt) and POST .../rights (bound to rights-decision.schema.json) --
        # each with the ledger row UNLISTED_ROUTE would convict it for being absent.
        # 2026-10-08 (research chain): 51 -> 53, for the two routes the persisted-findings slice
        # added -- GET .../research (named as schema-less debt over its read-back envelope) and
        # POST .../research (BOUND_SCHEMA against research-finding.schema.json). `dispatched` moves
        # with it because both patterns are read out of http_service.py by the same AST reader.
        # `bound` is the one token derived from the ledger instead of pinned, on the same
        # date, and the reason is recorded rather than left implicit: paying a SCHEMA_LESS
        # debt (adding a schema behind an existing row) also moves it, so a literal here
        # would convict the route that arrived last for a count it never touched. The
        # assertion is not softer for it -- this counts the rows straight out of
        # design-lab/config/contract-bindings.json while the gate counts its own, and a
        # verdict line that disagrees with the ledger is still red, as is a ledger with no
        # BOUND_SCHEMA row at all (NOTHING_TO_COMPARE, inside the gate).
        ledger = json.loads((REPO / self.gate.LEDGER_REL).read_text(encoding='utf-8'))
        expected_bound = sum(1 for row in ledger['routes']
                             if row.get('kind') == self.gate.BOUND_SCHEMA)
        # 53 -> 54 on 2026-10-08: /api/evidence-projection was added as a BOUND_SCHEMA row, and the
        # dispatched count moved with it because the gate refuses a route that arrives without a row
        # AND a row whose dispatch has gone. The number stays pinned rather than derived: deleting a
        # row together with its dispatch would otherwise leave every relation here consistent.
        # 54 -> 55 on 2026-10-10: GET /api/projects/{id}/native-runtime (DL-UI-U06) added one route
        # row and one dispatch in the same change, so both sides of that relation moved together.
        self.assertEqual(len(lines), 1 + CONTRACTS + 55,
                         'one verdict line, one note per contract row, one per route row')
        verdict = lines[-1]
        self.assertTrue(verdict.startswith('VERIFY_CONTRACT_BINDINGS=PASS'), verdict)
        # 54 -> 55 on 2026-10-10 with GET /api/projects/{id}/native-runtime (DL-UI-U06): the
        # aggregate's own line is what this compares, so a route added without its row -- or a
        # row without its dispatch -- moves these two numbers apart and stays red.
        for token in (f'schemas={CONTRACTS}', f'binding={BINDING_ROWS}', f'inert={INERT_ROWS}',
                      'routes=55', 'dispatched=55', f'bound={expected_bound}'):
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
        """Every BINDING row loses its claim when its instances go: one red line each.

        The mutation is class-wide on purpose. 2026-10-08 (rights chain): this expected one
        line while one row was BINDING; rights-decision.schema.json is the second, so the
        count is the bound inventory rather than a threshold -- and a new BINDING row that
        could be stripped without moving this number is exactly what would go unnoticed.
        """
        repo = self.scratch('binding-without-producer')

        def mutate(doc):
            for row in doc['contracts']:
                if row['status'] == 'BINDING':
                    row['instances'] = []

        edit_ledger(repo, mutate)
        errors, _, summary = self.run_gate(repo)
        self.assert_red_for(errors, 'BINDING_WITHOUT_INSTANCE', BINDING_ROWS)
        self.assertEqual(summary['binding'], BINDING_ROWS)

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
                    # A path the scratch tree really holds: the gate checks every citation exists and
                    # its line is in range before it judges the status, and this case must produce
                    # exactly one red line -- the status, not a stale citation.
                    row['instances'] = ['src/design_lab/http_service.py:1']

        edit_ledger(repo, mutate)
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'INERT_ROW_HAS_INSTANCE', 1)

    # --- citations: the fields that say where a contract is exercised ----------------

    def test_a_citation_that_is_prose_wearing_a_path_is_named_for_what_it_is(self):
        """Measured 2026-10-08: one fixtures entry read 'generated at run time by <path>:45'.

        A path field is what the gate can check; a sentence in it is checked by nothing, so the row
        looked evidenced while resting on prose. The real entry now names the generator line and the
        explanation moved into the reason.
        """
        repo = self.scratch('citation-prose')

        def mutate(doc):
            for row in doc['contracts']:
                if row['schema'].endswith('probe-result.schema.json'):
                    row['fixtures'] = ['generated at run time by '
                                       'design-lab/tests/test_contract_bindings.py:1']

        edit_ledger(repo, mutate)
        errors, _, _ = self.run_gate(repo)
        line = self.assert_red_for(errors, 'CITATION_MALFORMED', 1)
        self.assertIn('fixtures', line)

    def test_a_citation_pointing_past_the_end_of_its_file_is_red(self):
        """An in-file anchor is a claim about a line number, and line numbers move."""
        repo = self.scratch('citation-line-past-end')

        def mutate(doc):
            for row in doc['contracts']:
                if row['schema'].endswith('probe-result.schema.json'):
                    # http_service.py is in the scratch tree, so only the line number can be wrong.
                    row['fixtures'] = ['src/design_lab/http_service.py:999999']

        edit_ledger(repo, mutate)
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'CITATION_LINE_OUT_OF_RANGE', 1)

    def test_a_citation_to_a_file_that_is_gone_is_red(self):
        repo = self.scratch('citation-gone')

        def mutate(doc):
            for row in doc['contracts']:
                if row['schema'].endswith('probe-result.schema.json'):
                    # fixtures is the group whose absence this rule owns; instances and tests have
                    # BINDING_ROTTEN / INERT_ROW_HAS_INSTANCE / TEST_ROW_STALE, and one defect must
                    # produce one red line.
                    row['fixtures'] = ['src/design_lab/assurance/no_such_module.py:12']

        edit_ledger(repo, mutate)
        errors, _, _ = self.run_gate(repo)
        self.assert_red_for(errors, 'CITATION_STALE', 1)

    def test_an_inert_row_named_by_product_code_is_red(self):
        """'Nothing implements this' is a claim about the sources, so it is re-checked against them.

        The search is raw text, comments included: measured over the shipped tree that convicts
        nothing, so the strict direction costs no false red today and can only ever ask someone to
        justify a row rather than let an implemented schema hide as inert.
        """
        for label, source in (('a string', 'SCHEMA = "probe-result.schema.json"\n'),
                              ('a comment', '# see probe-result.schema.json for the shape\n')):
            repo = self.scratch(f'inert-named-{label.split()[0]}')
            write_mutant(repo, 'src/design_lab/prose_probe.py', source)
            errors, _, _ = self.run_gate(repo)
            line = self.assert_red_for(errors, 'INERT_BUT_NAMED_BY_PRODUCT', 1)
            self.assertIn('probe-result.schema.json', line)
            self.assertIn('src/design_lab/prose_probe.py', line)

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
            # 2026-10-08 (rights chain): scoped to one row instead of "every BINDING row",
            # because there are now two of them and this loop's invariant is that each case
            # moves exactly one red line. The class-wide version lives in
            # test_binding_row_without_a_producer_is_red, which expects one line per bound
            # row. Stripping the rights row also proves that row's instance is a real one.
            'binding-without-producer': lambda repo: edit_ledger(repo, lambda doc: [
                row.update(instances=[]) for row in doc['contracts']
                if row['schema'].endswith('rights-decision.schema.json')]),
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
