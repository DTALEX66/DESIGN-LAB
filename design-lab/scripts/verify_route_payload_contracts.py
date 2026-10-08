#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-ROUTE-PAYLOAD-CONTRACTS: a bound route must answer with a payload that its schema accepts.

Why this gate exists. ``design-lab/config/contract-bindings.json`` recorded, as named debt,
that a set of routes answers with a payload carrying a ``schemaVersion`` for which NO schema
file exists anywhere -- ``design-lab/jury-readback/v1``, ``design-lab/task-resource-preflight/v1``,
``design-lab/path-diagnostic/v1``, ``design-lab/capability-library/v1`` and
``design-lab/domain-pack-readback/v1``. A version string with nothing behind it is the
artifact-preflight gap (commit 1ea64bbe) repeated five times: a reader sees
``schemaVersion`` and assumes a boundary is enforced.

Each debt has now been closed one way or the other, and this script is what keeps it closed.
It does not trust a ledger row that says BOUND_SCHEMA -- it drives the product over a real
socket and checks what came back:

1. PAYLOADS ARE THE PRODUCT'S. One ``design_lab.http_service.make_server`` boot against a
   scratch project root; every payload compared here is the bytes that route wrote,
   ``json.loads`` of the response body. Nothing in this file assembles an example. If the
   emitter's shape changes, what lands in the comparison is the changed shape.
2. THE SCHEMA IS A VALID draft 2020-12 document, and every real payload validates against it
   (SCHEMA_VIOLATION).
3. BOTH DIRECTIONS OF FIELD DISAGREEMENT ARE RED. A field the schema ``required`` that the
   route did not send is MISSING_FROM_EMITTER; a field the route sent that a closed schema
   does not declare is UNDECLARED_BY_SCHEMA. Nested locations are compared too, including
   map values (``tools.*``, ``current_verdicts.*``) and the branches of an ``anyOf``.
   ``$ref`` is followed into the document that owns the shape, so a jury record is compared
   against ``assurance-jury-record-v2.schema.json` rather than restated here.
4. THE VERSION IS ONE VALUE ON BOTH SIDES. The schema's ``schemaVersion`` const, the binding's
   declared version, and a literal the emitter source still produces or compares must agree
   (VERSION_DRIFT). This is the check a one-sided bump cannot pass.
5. THE LEDGER AND THIS FILE MUST AGREE, IN BOTH DIRECTIONS. Every binding here must appear in
   ``contract-bindings.json`` as a BOUND_SCHEMA row naming the same schema, version and emitter
   file (LEDGER_DISAGREES); every BOUND_SCHEMA row naming one of these schemas must have a
   binding here (UNVALIDATED_BINDING). Deleting the row, or quietly downgrading it to
   SCHEMA_LESS with the ``version`` and ``emitter`` fields removed, is red here as well as in
   design-lab/scripts/verify_contract_bindings.py -- the debt line is not removable.
6. NOTHING TO COMPARE IS A FAILURE. Zero bindings, a binding whose files are missing, zero
   payloads, a payload that is not a mapping, or a schema that binds no object location the
   payload reaches are each red. A gate that matched nothing must not report a pass.

Usage:
    python design-lab/scripts/verify_route_payload_contracts.py
Exit 0 when every binding holds, 1 otherwise. The last line printed is
``VERIFY_ROUTE_PAYLOAD_CONTRACTS=PASS|FAIL ...``.
"""
from __future__ import annotations

import ast
import hashlib
import http.client
import importlib.util
import json
import os
import secrets
import shutil
import sys
import tempfile
import threading
from contextlib import closing
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / 'src'
SCHEMA_DIR = REPO / 'design-lab' / 'schemas'
LEDGER_REL = 'design-lab/config/contract-bindings.json'
SCRATCH_PARENT = REPO / '.project-local' / 'task-runtime'

try:
    import jsonschema
    import referencing
except ImportError as exc:  # pragma: no cover - a missing validator is a harness fault
    print(f'ERROR: IMPORT_FAULT {exc} -- this gate validates real payloads and needs '
          'jsonschema + referencing', file=sys.stderr)
    raise SystemExit(2)

JURY_RECORD_ID = 'https://dtalex66.local/schemas/assurance-jury-record-v2.json'


class Harness:
    """One live server, one scratch project, real records filed through the routes.

    The scratch project root carries the same committed inputs the real one does --
    design-lab/config/task-resources.json, and .project/paths.json when the machine has one --
    so /api/task-preflight and /api/environment answer with the shapes production answers with,
    while every write lands under the scratch tree.
    """

    def __init__(self):
        self.root = Path(tempfile.mkdtemp(prefix='route-payload-contracts-', dir=str(SCRATCH_PARENT)))
        self.saved_local_root = os.environ.pop('PROJECT_LOCAL_ROOT', None)
        self.httpd = None
        self.thread = None
        self._bodies: dict[str, dict] = {}

    def __enter__(self):
        project = self.root / 'project'
        (project / 'design-lab' / 'config').mkdir(parents=True)
        (project / '.project').mkdir(parents=True)
        (project / 'AGENTS.md').write_text('# route payload contract fixture project',
                                           encoding='utf-8')
        shutil.copy(REPO / 'design-lab/config/task-resources.json',
                    project / 'design-lab/config/task-resources.json')
        machine = REPO / '.project/paths.json'
        if machine.is_file():
            shutil.copy(machine, project / '.project/paths.json')
        if str(SRC) not in sys.path:
            sys.path.insert(0, str(SRC))
        from design_lab.assurance import jury_store
        from design_lab.http_service import make_server
        from design_lab.runtime import asset_store as assets
        from design_lab.service import ProjectService
        self.jury_store = jury_store
        self.assets = assets
        self.service = ProjectService(project)
        self.filled = self.service.create_project('Payload Contract Filled')['id']
        self.empty = self.service.create_project('Payload Contract Empty')['id']
        self.version_id, self.digest = self._publish(b'artwork under review')
        self.token = secrets.token_hex(32)
        self.httpd = make_server(self.service, self.token, 0)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self._file_jury_records()
        self.brief_id = self._seed_briefs()
        return self

    def _seed_briefs(self):
        """A real brief plus a real revision of it, through the write routes.

        Two versioned rows so the compared payload exercises more than the single-record case:
        the list carries both, ``next_cursor`` stays null because the page is not full, and the
        reference id is a genuine asset of the same project (the writer refuses anything else),
        so the schema is judged against a record that could not have been assembled by hand.
        """
        ref_id = 'img-' + 'a1' * 32
        with closing(self.assets.connect(self.service.database,
                                         project_root=self.service.paths.project_root)) as conn:
            conn.execute('INSERT INTO asset VALUES (?, ?, "psd", ?)',
                         (ref_id, self.filled, '2026-10-08T00:00:00Z'))
            conn.commit()
        status, body = self.call('POST', f'/api/projects/{self.filled}/briefs', {
            'title': 'Launch poster, zh-CN first', 'goals': ['modern', 'warm', 'restrained'],
            'constraints': 'must survive single-colour print', 'reference_asset_ids': [ref_id],
            'idempotency_key': 'brief-contract-create'})
        if status != 201:
            raise RuntimeError(f'BRIEF_WRITE_REFUSED {status} {body}')
        brief_id = body['brief']['brief_id']
        status, body = self.call('POST', f'/api/projects/{self.filled}/briefs/{brief_id}/revisions',
                                 {'title': 'Launch poster, zh-CN first',
                                  'goals': ['modern', 'warm', 'restrained', 'no stock shapes'],
                                  'constraints': 'must survive single-colour print',
                                  'reference_asset_ids': [ref_id],
                                  'idempotency_key': 'brief-contract-revise'})
        if status != 201:
            raise RuntimeError(f'BRIEF_REVISION_REFUSED {status} {body}')
        return brief_id

    def __exit__(self, *exc):
        if self.httpd is not None:
            self.httpd.shutdown()
            self.httpd.server_close()
            if self.thread is not None:
                self.thread.join(timeout=5)
        if self.saved_local_root is not None:
            os.environ['PROJECT_LOCAL_ROOT'] = self.saved_local_root
        shutil.rmtree(self.root, ignore_errors=True)
        return False

    def _publish(self, payload: bytes):
        asset_id, project_id = 'a1', self.filled
        store = self.service.paths.category_dir('projects', project_id, 'assets')
        incoming = Path(self.service.paths.runtime_root) / 'contract-incoming.psd'
        incoming.parent.mkdir(parents=True, exist_ok=True)
        incoming.write_bytes(payload)
        digest = 'sha256:' + hashlib.sha256(payload).hexdigest()
        with closing(self.assets.connect(self.service.database,
                                         project_root=self.service.paths.project_root)) as conn:
            conn.execute('INSERT INTO asset VALUES (?, ?, "psd", ?)',
                         (asset_id, project_id, '2026-10-08T00:00:00Z'))
            conn.commit()
            resource = f'asset:{asset_id}'
            if not self.assets.acquire_writer(conn, resource, 'attempt-contract'):
                raise RuntimeError('WRITER_LEASE_REFUSED')
            generation = self.assets.writer_token(conn, resource, 'attempt-contract')
            version_id = self.assets.publish_version(
                conn, asset_id, incoming, store_root=store, artifact_name='native.psd',
                expected_sha256=digest, holder_attempt_id='attempt-contract',
                generation=generation)
            self.assets.release_writer(conn, resource, 'attempt-contract', generation=generation)
        return version_id, digest

    def _file_jury_records(self):
        """A real human verdict and a real agent proposal, through the write routes."""
        criteria = [{'criterion_id': 'composition', 'weight': 0.4, 'score': 4.2, 'note': 'ok'},
                    {'criterion_id': 'typography', 'weight': 0.3, 'score': 3.8, 'note': 'ok'},
                    {'criterion_id': 'brand-fit', 'weight': 0.3, 'score': 4.0, 'note': 'ok'}]
        subject = f'{self.jury_store.SUBJECT_PREFIX}{self.version_id}'
        status, body = self.call('POST', f'/api/projects/{self.filled}/jury/verdict', {
            'schemaVersion': 'design-lab/assurance-jury-record/v2', 'kind': 'JURY_VERDICT',
            'jury_record_id': 'jury-contract-1', 'subject_ref': subject,
            'artifact_sha256': self.digest,
            'juror': {'juror_id': 'dtalex66', 'kind': 'HUMAN', 'members': [],
                      'attestation': 'reviewed the exported artwork at 100%'},
            'criteria': criteria, 'verdict': 'APPROVE',
            'decided_at': '2026-10-08T00:00:00Z', 'supersedes': None, 'evidence_refs': []})
        if status != 201:
            raise RuntimeError(f'VERDICT_WRITE_REFUSED {status} {body}')
        status, body = self.call('POST', f'/api/projects/{self.filled}/jury/proposal', {
            'schemaVersion': 'design-lab/assurance-jury-record/v2', 'kind': 'JURY_PROPOSAL',
            'proposal_id': 'proposal-contract-1', 'subject_ref': subject,
            'artifact_sha256': self.digest, 'proposer': 'qoder-agent', 'criteria': criteria,
            'suggested_verdict': 'APPROVE',
            'rationale': 'weighted score clears the floor; typography alignment holds',
            'created_at': '2026-10-08T00:00:00Z'})
        if status != 201:
            raise RuntimeError(f'PROPOSAL_WRITE_REFUSED {status} {body}')

    def call(self, method, path, body=None):
        headers = {'Authorization': 'Bearer ' + self.token}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        with closing(http.client.HTTPConnection('127.0.0.1', self.httpd.server_port,
                                                timeout=30)) as conn:
            conn.request(method, path, body=None if body is None else json.dumps(body),
                         headers=headers)
            response = conn.getresponse()
            raw = response.read()
            return response.status, (json.loads(raw) if raw else None)

    def get(self, path):
        """The body this route wrote, serialised exactly as the client received it."""
        if path not in self._bodies:
            status, body = self.call('GET', path)
            if status != 200:
                raise RuntimeError(f'ROUTE_REFUSED {path} -> {status} {body}')
            self._bodies[path] = body
        return self._bodies[path]


#: name -> the route it serves, the schema that binds it, the emitter that writes the version,
#: and the real payloads to compare. Adding a row is how the next unschema'd payload gets
#: caught; a row whose files are missing, or whose route refuses, is red -- not skipped.
def build_bindings():
    return [
        {
            'name': 'path-diagnostic',
            'route': '/api/environment',
            'method': 'GET',
            'schema': 'design-lab/schemas/path-diagnostic.schema.json',
            'emitter': 'src/design_lab/runtime/paths.py',
            'version': 'design-lab/path-diagnostic/v1',
            'cases': lambda h: [('GET /api/environment', h.get('/api/environment'))],
        },
        {
            'name': 'capability-library',
            'route': '/api/capabilities',
            'method': 'GET',
            'schema': 'design-lab/schemas/capability-library.schema.json',
            'emitter': 'src/design_lab/analysis/capability_library.py',
            'version': 'design-lab/capability-library/v1',
            'cases': lambda h: [('GET /api/capabilities', h.get('/api/capabilities'))],
        },
        {
            'name': 'domain-pack-readback',
            'route': '/api/domains',
            'method': 'GET',
            'schema': 'design-lab/schemas/domain-pack-readback.schema.json',
            'emitter': 'src/design_lab/domain_packs.py',
            'version': 'design-lab/domain-pack-readback/v1',
            'cases': lambda h: [('GET /api/domains', h.get('/api/domains'))],
        },
        {
            'name': 'jury-readback',
            'route': '/api/projects/([0-9a-f]{32})/jury',
            'method': 'GET',
            'schema': 'design-lab/schemas/jury-readback.schema.json',
            'emitter': 'src/design_lab/jury_review.py',
            'version': 'design-lab/jury-readback/v1',
            # Both branches the emitter can produce: a filed review and an empty one. A schema
            # that only fits the populated case would be nicer than the code.
            'cases': lambda h: [
                ('GET .../jury with a verdict and a proposal', h.get(f'/api/projects/{h.filled}/jury')),
                ('GET .../jury with nothing filed', h.get(f'/api/projects/{h.empty}/jury')),
            ],
        },
        {
            'name': 'brief-readback',
            'route': '/api/projects/([0-9a-f]{32})/briefs(?:\\?after=(brief-[0-9a-f]{32}))?',
            'method': 'GET',
            'schema': 'design-lab/schemas/brief-readback.schema.json',
            'emitter': 'src/design_lab/design_layer.py',
            'version': 'design-lab/brief-readback/v1',
            # A project whose brief was created AND revised (two versioned rows, a live chain)
            # against a project that has never had one. The empty branch is the one a page must
            # not be able to read as a failure, and the populated branch carries a reference id
            # that only exists because the writer accepted a real asset of the same project.
            'cases': lambda h: [
                ('GET .../briefs with a revised brief', h.get(f'/api/projects/{h.filled}/briefs')),
                ('GET .../briefs with nothing filed', h.get(f'/api/projects/{h.empty}/briefs')),
            ],
        },
        {
            'name': 'task-resource-preflight',
            'route': '/api/task-preflight',
            'method': 'GET',
            'schema': 'design-lab/schemas/task-resource-preflight.schema.json',
            'emitter': 'src/design_lab/runtime/task_resources.py',
            'version': 'design-lab/task-resource-preflight/v1',
            # Three real tasks: tools only (one absent from PATH), a host declaration plus a
            # tool, and a blocked task. Together they reach every resource branch the emitter has.
            'cases': lambda h: [
                ('GET ?task=DLDS-H020', h.get('/api/task-preflight?task='
                                              'DL-TP-20260914-DEEPSEEK-AUTHORITY-R1%3A%3ADLDS-H020')),
                ('GET ?task=DL-R5-012', h.get('/api/task-preflight?task='
                                              'DL-TP-20260914-DEEPSEEK-AUTHORITY-R1%3A%3ADL-R5-012')),
                ('GET ?task=DL-R5-008', h.get('/api/task-preflight?task='
                                              'DL-TP-20260914-DEEPSEEK-AUTHORITY-R1%3A%3ADL-R5-008')),
            ],
        },
    ]


def registry():
    """Every schema in design-lab/schemas that carries an $id, so a $ref resolves to its owner.

    assurance-jury-record-v2.schema.json is in this set: the readback envelope references the
    record instead of restating it, which is the only way this file can stay honest when the
    record's own contract moves.
    """
    resources, docs = [], {}
    for path in sorted(SCHEMA_DIR.rglob('*.schema.json')):
        if 'contracts' in path.parts:
            continue
        try:
            doc = json.loads(path.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        if not isinstance(doc, dict) or not isinstance(doc.get('$id'), str):
            continue
        if doc['$id'] in docs:
            continue
        resources.append((doc['$id'], referencing.Resource.from_contents(doc)))
        docs[doc['$id']] = doc
    return referencing.Registry(resources), docs


def resolve_ref(ref: str, docs: dict, current_root):
    """`$ref` -> (owning document, subschema), for `$defs` walking and drift comparison."""
    base, _, fragment = ref.partition('#')
    doc = docs.get(base) if base else current_root
    if not isinstance(doc, dict):
        return None, None
    node = doc
    for part in [p for p in fragment.split('/') if p]:
        part = part.replace('~1', '/').replace('~0', '~')
        if not isinstance(node, dict) or part not in node:
            return None, None
        node = node[part]
    return doc, node



def absolutise(node, base_id: str):
    """A copy of `node` with every relative `$ref` rewritten against `base_id`.

    An ``anyOf`` branch is tested on its own to decide which branch a real payload actually
    satisfies, and a bare ``{"$ref": "#/$defs/toolResource"}`` has no base URI of its own --
    jsonschema then reports PointerToNowhere and the branch would be skipped, silently
    switching the nested drift check off. Rewriting makes the probe self-contained.
    """
    if isinstance(node, dict):
        out = {}
        for key, value in node.items():
            if key == '$ref' and isinstance(value, str) and value.startswith('#'):
                out[key] = f'{base_id}{value}'
            else:
                out[key] = absolutise(value, base_id)
        return out
    if isinstance(node, list):
        return [absolutise(item, base_id) for item in node]
    return node


def strip_required(node):
    """A copy of a subschema with every object-level `required` list removed, recursively.

    The branch filter must decide which variant a payload's SHAPE is, not which variant the
    schema currently claims is complete: if a mutation adds a bogus `required` to one branch,
    filtering on the mutated branch would drop that branch from the comparison and the drift
    would go silent. Discriminators (`const`/`enum` on `kind`, `state`) are kept, so a host
    resource still fails the tool branch on shape alone.

    `not` / `if` / `then` / `else` are copied untouched. assurance-jury-record-v2 refuses a
    verdict carrying proposal fields with `{"not": {"required": [...]}}`; stripping inside that
    would leave `{"not": {}}`, which rejects every instance, and the filter would then report
    that no branch fits a perfectly good record.
    """
    if isinstance(node, dict):
        return {key: (value if key in ('not', 'if', 'then', 'else') else strip_required(value))
                for key, value in node.items() if key != 'required'}
    if isinstance(node, list):
        return [strip_required(item) for item in node]
    return node


def branch_probe(branch, root_doc, docs):
    """(subschema with absolute refs, owner id) for one combinator branch."""
    owner = root_doc if isinstance(root_doc, dict) else {}
    node = branch
    if isinstance(node, dict) and isinstance(node.get('$ref'), str):
        base, resolved = resolve_ref(node['$ref'], docs, root_doc)
        if resolved is None:
            return None, None
        node, owner = resolved, base
    ident = owner.get('$id') if isinstance(owner, dict) else None
    if not isinstance(ident, str):
        return None, None
    return absolutise(node, ident), ident


def comparisons(schema, instance, path, out, docs, root_doc, reg):
    """Pair every object location the instance reaches with the schema node that binds it."""
    if not isinstance(schema, dict):
        return out
    if '$ref' in schema:
        base, node = resolve_ref(schema['$ref'], docs, root_doc)
        if node is None:
            return out
        root_doc = base
        schema = node
    if isinstance(instance, dict):
        if isinstance(schema.get('properties'), dict):
            props = schema['properties']
            required = set(schema.get('required') or [])
            out.append({'path': path, 'required': required, 'declared': set(props),
                        'produced': set(instance),
                        'closed': schema.get('additionalProperties') is False})
            for key, subschema in props.items():
                if key in instance:
                    comparisons(subschema, instance[key], f'{path}.{key}', out, docs,
                                root_doc, reg)
        for key, value in instance.items():
            # A map value (tools.*, roots.*, shared_inputs.*, current_verdicts.*) is bound by
            # additionalProperties or by a patternProperty, not by a named property, and it is
            # exactly where a state word or a required field goes missing.
            node = schema.get('additionalProperties')
            if isinstance(node, dict):
                comparisons(node, value, f'{path}.*', out, docs, root_doc, reg)
            pattern_map = schema.get('patternProperties')
            if isinstance(pattern_map, dict):
                for _pattern, pattern_node in pattern_map.items():
                    comparisons(pattern_node, value, f'{path}.*', out, docs, root_doc, reg)
        for combinator in ('allOf', 'anyOf', 'oneOf'):
            branches = schema.get(combinator) or []
            if not branches:
                continue
            # allOf branches all apply, so each is compared. For anyOf/oneOf only the branches
            # whose SHAPE the real payload satisfies are compared, otherwise a host resource
            # would be reported as "missing resolved_path". If no branch matches, every branch
            # is compared rather than none: silence is the one outcome this gate may not produce.
            selected = list(branches)
            if combinator != 'allOf':
                matched = []
                for branch in branches:
                    probe, _ident = branch_probe(branch, root_doc, docs)
                    if probe is None:
                        continue
                    try:
                        if jsonschema.Draft202012Validator(strip_required(probe),
                                                           registry=reg).is_valid(instance):
                            matched.append(branch)
                    except Exception:  # noqa: BLE001 - an unusable probe compares everything
                        matched.append(branch)
                if matched:
                    selected = matched
            for index, branch in enumerate(branches):
                if branch not in selected:
                    continue
                comparisons(branch, instance, f'{path}#{combinator}[{index}]', out, docs,
                            root_doc, reg)
    if isinstance(instance, list) and isinstance(schema.get('items'), dict):
        for index, item in enumerate(instance):
            comparisons(schema['items'], item, f'{path}[{index}]', out, docs, root_doc, reg)
    return out


def drift_errors(name, schema, payload, case_label, docs, reg):
    errors = []
    for node in comparisons(schema, payload, '$', [], docs, schema, reg):
        missing = sorted(node['required'] - node['produced'])
        if missing:
            errors.append(f'{name}/{case_label}@{node["path"]}: MISSING_FROM_EMITTER {missing} '
                          '-- the schema requires fields the route did not send')
        if node['closed']:
            extra = sorted(node['produced'] - node['declared'])
            if extra:
                errors.append(f'{name}/{case_label}@{node["path"]}: UNDECLARED_BY_SCHEMA '
                              f'{extra} -- the route sends fields a closed schema does not declare')
    return errors


def version_literals(path: Path, version: str) -> int:
    """How many times this source handles the version as a value it produces or compares."""
    try:
        tree = ast.parse(path.read_text(encoding='utf-8'), filename=str(path))
    except (OSError, SyntaxError):
        return 0
    return sum(1 for node in ast.walk(tree)
               if isinstance(node, ast.Constant) and node.value == version)


def schema_const(doc):
    return ((doc.get('properties') or {}).get('schemaVersion') or {}).get('const')


def ledger_route_rows():
    doc = json.loads((REPO / LEDGER_REL).read_text(encoding='utf-8'))
    return doc.get('routes') or []


def ledger_errors(binding, rows):
    """Rule 5: the ledger row and this binding must describe the same boundary."""
    matches = [row for row in rows if row.get('route') == binding['route']]
    if not matches:
        return [f'{binding["name"]}: LEDGER_DISAGREES no route row for {binding["route"]} -- '
                f'this payload is validated here but the ledger does not account for it']
    row = matches[0]
    errors = []
    if row.get('kind') != 'BOUND_SCHEMA':
        errors.append(f'{binding["name"]}: LEDGER_DISAGREES {binding["route"]} is listed as '
                      f'{row.get("kind")!r} while its payload is validated against '
                      f'{Path(binding["schema"]).name} here -- the debt is paid, the ledger '
                      'says it is not')
    if row.get('schema') != binding['schema']:
        errors.append(f'{binding["name"]}: LEDGER_DISAGREES the row binds {row.get("schema")!r}, '
                      f'not {binding["schema"]!r}')
    if row.get('version') != binding['version']:
        errors.append(f'{binding["name"]}: LEDGER_DISAGREES the row declares '
                      f'{row.get("version")!r} while the schema and the emitter bind '
                      f'{binding["version"]!r}')
    emitter = (row.get('emitter') or '').split(':', 1)[0]
    if emitter != binding['emitter']:
        errors.append(f'{binding["name"]}: LEDGER_DISAGREES the row names emitter {emitter!r}, '
                      f'not {binding["emitter"]!r}')
    return errors


def unvalidated_binding_errors(bindings, rows):
    """Rule 5, the other direction, keyed on the ROUTE.

    A ledger may not point any route at one of these schemas -- not even a second route that
    happens to serve the same document -- unless a real response from that route is fed to it
    here. Set membership on the schema alone would let `.../briefs` claim to be bound by
    jury-readback.schema.json because `.../jury` already is, which is the declared-but-unread
    shape this surface exists to name.
    """
    covered = {(binding['route'], binding['schema']) for binding in bindings}
    claims = {(row.get('route'), row.get('schema')) for row in rows
              if row.get('kind') == 'BOUND_SCHEMA'
              and row.get('schema') in {schema for _route, schema in covered}}
    return [f'UNVALIDATED_BINDING {route} is declared BOUND_SCHEMA against {schema} with no '
            'payload binding in design-lab/scripts/verify_route_payload_contracts.py -- a schema '
            'nobody feeds a real response to is a reader-visible claim of enforcement'
            for route, schema in sorted(claims - covered)]


def check_binding(binding, harness=None, docs=None, reg=None, rows=None,
                  schema_doc=None, cases=None):
    """Every check for one binding. `schema_doc`, `cases` and `rows` are injectable so the
    teeth of this gate can be falsified against a weakened COPY without touching a shipped
    file or rebooting the server; `cases=None` means "ask the live route", which is what the
    shipped run does."""
    errors, notes = [], []
    schema_path = REPO / binding['schema']
    emitter_path = REPO / binding['emitter']
    if not schema_path.is_file():
        return [f'{binding["name"]}: NOTHING_TO_COMPARE schema {binding["schema"]} does not '
                'exist -- this row names debt that was never written down'], notes
    if not emitter_path.is_file():
        return [f'{binding["name"]}: NOTHING_TO_COMPARE emitter {binding["emitter"]} does not '
                'exist'], notes
    if schema_doc is None:
        schema = json.loads(schema_path.read_text(encoding='utf-8'))
    else:
        schema = schema_doc
        if not schema_path.is_file():
            return [f'{binding["name"]}: NOTHING_TO_COMPARE schema is absent'], notes
    if docs is None or reg is None:
        reg, docs = registry()
    try:
        jsonschema.Draft202012Validator.check_schema(schema)
    except jsonschema.SchemaError as exc:
        return [f'{binding["name"]}: the schema is not a valid draft 2020-12 document: {exc.message}'], notes

    const = schema_const(schema)
    if const != binding['version']:
        errors.append(f'{binding["name"]}: VERSION_DRIFT {Path(binding["schema"]).name} binds '
                      f'{const!r} while this gate declares {binding["version"]!r}')
    elif not version_literals(emitter_path, const):
        errors.append(f'{binding["name"]}: VERSION_DRIFT {binding["emitter"]} no longer carries '
                      f'{const!r} as a value it produces or compares -- one side moved and the '
                      'other did not')

    if rows is None:
        rows = ledger_route_rows()
    errors.extend(ledger_errors(binding, rows))

    if cases is None:
        try:
            cases = list(binding['cases'](harness))
        except Exception as exc:  # noqa: BLE001 - a refused route is a finding, not a skip
            return errors + [f'{binding["name"]}: NOTHING_TO_COMPARE the route refused: '
                             f'{type(exc).__name__} {exc}'], notes
    normalised = []
    for item in cases:
        try:
            label, payload = item
        except (TypeError, ValueError):
            errors.append(f'{binding["name"]}: NOTHING_TO_COMPARE the case producer returned '
                          f'{item!r}, which is not a (label, payload) pair -- nothing was '
                          'compared for it')
            continue
        normalised.append((label, payload))
    cases = normalised
    if not cases:
        if not errors:
            errors.append(f'{binding["name"]}: NOTHING_TO_COMPARE -- no payload was produced, '
                          'so this binding proves nothing')
    validator = jsonschema.Draft202012Validator(schema, registry=reg)
    compared = 0
    for label, payload in cases:
        if not isinstance(payload, dict) or not payload:
            errors.append(f'{binding["name"]}/{label}: NOTHING_TO_COMPARE -- the route returned '
                          'no mapping to check')
            continue
        nodes = comparisons(schema, payload, '$', [], docs, schema, reg)
        if not nodes:
            errors.append(f'{binding["name"]}/{label}: NOTHING_TO_COMPARE -- the schema declares '
                          'no object location this payload reaches')
            continue
        compared += len(nodes)
        if not any(node['required'] for node in nodes):
            errors.append(f'{binding["name"]}/{label}: NOTHING_TO_COMPARE -- no schema node '
                          'requires anything, so a wrong payload would sail through')
        for error in sorted(validator.iter_errors(payload),
                            key=lambda e: list(e.absolute_path)):
            spot = '/'.join(str(part) for part in error.absolute_path) or '<root>'
            errors.append(f'{binding["name"]}/{label}@{spot}: SCHEMA_VIOLATION {error.message[:300]}')
        errors.extend(drift_errors(binding['name'], schema, payload, label, docs, reg))
    notes.append(f'{binding["name"]}: cases={len(cases)} object locations compared={compared}')
    return errors, notes


def run(bindings=None):
    effective = build_bindings() if bindings is None else list(bindings)
    if not effective:
        return (['NOTHING_TO_COMPARE: no route payload binding is declared at all -- a gate with '
                 'no case cannot catch a drift'], [])
    rows = ledger_route_rows()
    errors, notes = list(unvalidated_binding_errors(effective, rows)), []
    reg, docs = registry()
    with Harness() as harness:
        for binding in effective:
            case_errors, case_notes = check_binding(binding, harness=harness, docs=docs,
                                                    reg=reg, rows=rows)
            errors.extend(case_errors)
            notes.extend(case_notes)
    return errors, notes


def main(argv=None) -> int:
    errors, notes = run()
    for note in notes:
        print('  compared', note)
    for error in errors:
        print('ERROR:', error)
    # The verdict is the LAST line and starts with VERIFY_ on purpose: verify_design_lab.py
    # summarises each gate by scanning its output from the end for a line starting with VERIFY_.
    print(f'VERIFY_ROUTE_PAYLOAD_CONTRACTS={"FAIL" if errors else "PASS"} '
          f'bindings={len(build_bindings())} failures={len(errors)}')
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
