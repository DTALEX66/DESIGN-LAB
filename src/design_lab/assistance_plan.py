# SPDX-License-Identifier: MIT
"""The assistance plan: one neutral design intent, its revisions, and who adopted one.

DL-KB-07. A short task should not need a complete project before it can be written down. This
module is the object that holds the intent itself -- objective, output type, neutral creative,
brand/role constraints, lens and sound requirements, external steps, known gaps and the material
revisions it was built from -- and it reuses the repository's existing objects for everything it
can: the project owns it, and brief / direction / prompt result / asset references are stored as
references with the revision and digest they had when the plan was written, never copied.

Four facts are kept apart on purpose, because the screen has to show them apart:

* **saved** -- the plan's bytes are in the state database. That is all a write answer claims.
* **provided** -- the current revision carries a neutral creative. A draft with an objective and
  no creative is saved but not provided, and the readback says so.
* **chosen** -- a named human adopted a revision (``assistance_plan_choice``). The table's CHECK
  refuses any other actor_kind, so an application bug cannot file an agent's choice as a person's.
* **externally verified** -- always false. No route in this repository dispatches an external
  step, so the readback carries the constant and the schema pins it with ``const: false``: turning
  it true requires a contract change, not a flag flip.

Analysis is never inferred from a reference. A plan that names an asset is *linked* to it; the
readback reports ``ANALYZED`` only when a stored reversal (``prompt_result`` with kind REVERSAL)
exists for that asset at its current digest. When a reference is only registered as a link, every
surface reads ``LINKED_ONLY`` -- there is no branch that upgrades it because the plan mentions it.

Like the knowledge library, one writer appends revisions and "current" is MAX(revision) at read
time. A plan's revision pins the revisions of its references; if a referenced object moves on, the
readback reports the reference as CHANGED rather than quietly showing the new bytes as if they were
what the plan used.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import re
import sqlite3
import uuid

from .assurance import utc_now_rfc3339
from .creative import store as cstore
from .interop import InteropError, load_schema, resource_registry, schema_errors
from .runtime.state_resources import repo_resource, state_schema

PLAN_VERSION = 'design-lab/assistance-plan/v1'
WRITE_VERSION = 'design-lab/assistance-plan-write/v1'
READBACK_VERSION = 'design-lab/assistance-plan-readback/v1'
LIST_VERSION = 'design-lab/assistance-plan-list/v1'
OUTPUT_TYPES_VERSION = 'design-lab/assistance-plan-output-types/v1'

PLAN_SCHEMA_PATH = repo_resource('schemas/assistance-plan-v1.schema.json')
_READBACK_SCHEMA_PATH = repo_resource('schemas/assistance-plan-readback-v1.schema.json')
_WRITE_SCHEMA_PATH = repo_resource('schemas/assistance-plan-write-v1.schema.json')
_LIST_SCHEMA_PATH = repo_resource('schemas/assistance-plan-list-v1.schema.json')
_OUTPUT_TYPES_SCHEMA_PATH = repo_resource('schemas/assistance-plan-output-types-v1.schema.json')
_STATE = state_schema('design-lab-state-assistance-plan-v1.sql')

OUTPUT_TYPES = ('IMAGE', 'UI', 'MOTION', 'STORYBOARD', 'AUDIO', 'CAMPAIGN')
#: The output types as the initial screen names them. One table, served with every answer, so the
#: view cannot offer a word the service refuses or hide one it accepts.
OUTPUT_LABELS = {'IMAGE': '平面与品牌', 'UI': '界面与交互', 'MOTION': '动效与视频',
                 'STORYBOARD': '分镜与脚本', 'AUDIO': '声音', 'CAMPAIGN': '整合方案'}
UNKNOWN = 'UNKNOWN'
UNUSED = 'UNUSED'
REFERENCE_KINDS = ('ASSET', 'BRIEF', 'DIRECTION', 'PROMPT_RESULT')
REFERENCE_ID = {
    'ASSET': re.compile(r'^img-[0-9a-f]{64}$'),
    'BRIEF': re.compile(r'^brief-[0-9a-f]{32}$'),
    'DIRECTION': re.compile(r'^direction-[0-9a-f]{32}$'),
    'PROMPT_RESULT': re.compile(r'^(?:prompt|reversal)-[0-9a-f]{32}$'),
}
#: Fields the content digest covers. Identity (plan_id, revision) and bookkeeping (timestamps,
#: author) are outside it, so the same content written twice digests to the same value.
CONTENT_FIELDS = ('objective', 'output_type', 'neutral_creative', 'brand_constraints',
                  'role_constraints', 'lens', 'sound', 'references', 'external_steps',
                  'known_gaps', 'limits')
DEFAULT_LIMIT = 50
MAX_LIMIT = 200
MAX_OPTIONAL_TEXT = 8000

CLAIMS_NOT_MADE = (
    'this plan is a record of a person\'s intent; no model was run to produce it, and the '
    'assistance model setting is a separate record that does not appear here',
    'an external job_id or operation_id is a label the caller supplied; this service never '
    'dispatched that step and cannot verify whether it ran',
    'referencing an asset is not analysing it; the readback reports analysis evidence separately '
    'and a linked-only reference stays LINKED_ONLY',
    'the references below are pinned to the revisions recorded here; a later revision of a '
    'referenced object does not change what this plan used',
)

DOES_NOT_SAY = (
    '保存方案不是运行模型，也不是生成图片或视频；方案内容由创建者填写',
    '登记外部 job_id/operation_id 不代表已派发或已执行，服务不核验外部结果',
    '参考只登记了链接时，不代表图片或视频已被分析',
    '「用户选用」是一条具名人工记录，不是质量评分或系统推荐',
)

_CHOOSE_FIELDS = ('actor', 'actor_kind')


class AssistancePlanError(ValueError):
    """A store refusal carrying the status and code the route answers with."""

    def __init__(self, status, code, detail=None):
        super().__init__(detail or code)
        self.status = status
        self.code = code
        self.detail = detail


def connect(db_path, *, project_root=None) -> sqlite3.Connection:
    """Open the shared state database with the plan tables present.

    ``cstore.connect`` is the same guarded connection the design layer uses, so ``project``,
    ``asset_version``, ``design_brief`` and ``design_direction`` are guaranteed to exist before a
    reference is resolved. The plan tables are additive to that database.
    """
    try:
        connection = cstore.connect(db_path, project_root=project_root)
    except Exception as exc:  # cstore raises its own error type on a policy failure
        raise AssistancePlanError(500, 'ASSISTANCE_PLAN_STATE_UNAVAILABLE',
                                  f'the state database could not be opened: {exc}') from None
    connection.row_factory = sqlite3.Row
    connection.executescript(_STATE.read_text(encoding='utf-8'))
    connection.commit()
    return connection


def _now() -> str:
    return utc_now_rfc3339()


def _canonical(document) -> str:
    return json.dumps(document, ensure_ascii=False, sort_keys=True)


def _digest(document) -> str:
    return 'sha256:' + hashlib.sha256(_canonical(document).encode('utf-8')).hexdigest()


def _content_digest(document) -> str:
    return _digest({key: document[key] for key in CONTENT_FIELDS})


_registry = None


def _ref_registry():
    global _registry
    if _registry is None:
        try:
            document = load_schema(PLAN_SCHEMA_PATH)
        except (InteropError, OSError) as exc:
            raise AssistancePlanError(
                500, 'ASSISTANCE_PLAN_CONTRACT_UNREADABLE',
                f'cannot load {PLAN_SCHEMA_PATH.name} for $ref resolution: {exc}') from None
        identifier = document.get('$id')
        if not isinstance(identifier, str):
            raise AssistancePlanError(
                500, 'ASSISTANCE_PLAN_CONTRACT_UNREADABLE',
                f'{PLAN_SCHEMA_PATH.name} carries no $id, so a $ref into it cannot be resolved '
                'offline')
        _registry = resource_registry({identifier: document})
    return _registry


def _check(document, path, label, *, registry=None):
    try:
        problems = schema_errors(load_schema(path), document, registry=registry)
    except (InteropError, OSError) as exc:
        raise AssistancePlanError(500, 'ASSISTANCE_PLAN_CONTRACT_UNREADABLE',
                                  f'cannot load {path.name} for {label}: {exc}') from None
    if problems:
        raise AssistancePlanError(500, 'ASSISTANCE_PLAN_CONTRACT_VIOLATION', problems)
    return document


def _required_text(value, field, *, max_len=2000):
    if not isinstance(value, str) or not value.strip():
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_MISSING',
                                  f'{field} is required and must be a non-empty string')
    value = value.strip()
    if len(value) > max_len:
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_TOO_LONG',
                                  f'{field} exceeds {max_len} characters')
    return value


def _optional_text(value, field, *, max_len=MAX_OPTIONAL_TEXT):
    """A field the caller left out is UNKNOWN in the stored bytes, never absent."""
    if value is None:
        return UNKNOWN
    if not isinstance(value, str):
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_MALFORMED',
                                  f'{field} must be a string (or absent); got '
                                  f'{type(value).__name__}')
    value = value.strip()
    if not value:
        return UNKNOWN
    if len(value) > max_len:
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_TOO_LONG',
                                  f'{field} exceeds {max_len} characters')
    return value


def _string_list(value, field, *, item_max=400, limit=32):
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > limit:
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_MALFORMED',
                                  f'{field} must be a list of at most {limit} strings')
    out = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_MALFORMED',
                                      f'{field} contains an empty or non-string value')
        item = item.strip()
        if len(item) > item_max:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELD_TOO_LONG',
                                      f'{field} contains a value over {item_max} characters')
        if item not in out:
            out.append(item)
    return out


def _reference_ids(value):
    """The request's reference list, normalised to ``[{kind, id}]`` in first-seen order.

    Only the two keys a caller may state are accepted; revision and digest are resolved by the
    store from the live object, because a caller-supplied digest would be a claim this service
    has not measured.
    """
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > 64:
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_REFERENCES_MALFORMED',
                                  'references must be a list of at most 64 {kind, id} objects')
    out = []
    for item in value:
        if not isinstance(item, dict):
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_REFERENCES_MALFORMED',
                                      'each reference must be an object with kind and id')
        extra = sorted(set(item) - {'kind', 'id'})
        if extra:
            raise AssistancePlanError(
                400, 'ASSISTANCE_PLAN_REFERENCE_UNKNOWN_FIELD',
                f'a reference carries field(s) this record resolves itself: {extra}. Revision '
                'and digest are read from the referenced object, never supplied by the caller')
        kind = item.get('kind')
        if kind not in REFERENCE_KINDS:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_REFERENCE_KIND_INVALID',
                                      f'reference kind must be one of {REFERENCE_KINDS}; '
                                      f'got {kind!r}')
        identifier = item.get('id')
        if not isinstance(identifier, str) or REFERENCE_ID[kind].match(identifier) is None:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_REFERENCE_ID_MALFORMED',
                                      f'{kind} reference id is malformed: {identifier!r}')
        if (kind, identifier) not in [(entry['kind'], entry['id']) for entry in out]:
            out.append({'kind': kind, 'id': identifier})
    return out


def _external_steps(value):
    """External steps carry only caller-supplied labels; a missing id is the literal UNUSED.

    The store mints no job or operation id. ``UNUSED`` is how a person says "I did not use one",
    and the readback repeats the distinction instead of turning a label into evidence.
    """
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > 32:
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_STEPS_MALFORMED',
                                  'external_steps must be a list of at most 32 objects')
    out = []
    for item in value:
        if not isinstance(item, dict):
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_STEPS_MALFORMED',
                                      'each external step must be an object')
        extra = sorted(set(item) - {'step', 'tool', 'job_id', 'operation_id'})
        if extra:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_STEP_UNKNOWN_FIELD',
                                      f'an external step carries undeclared field(s): {extra}')
        step = _required_text(item.get('step'), 'external_steps.step', max_len=400)
        tool = _optional_text(item.get('tool'), 'external_steps.tool', max_len=400)
        label = {}
        for key in ('job_id', 'operation_id'):
            raw = item.get(key)
            if raw is None or (isinstance(raw, str) and not raw.strip()):
                label[key] = UNUSED
                continue
            if not isinstance(raw, str) or any(ord(char) < 32 for char in raw) or len(raw) > 200:
                raise AssistancePlanError(
                    400, 'ASSISTANCE_PLAN_STEP_LABEL_MALFORMED',
                    f'external_steps.{key} must be a supplied label of at most 200 characters '
                    'with no control characters, or the literal UNUSED')
            label[key] = raw.strip()
        out.append({'step': step, 'tool': tool, 'job_id': label['job_id'],
                    'operation_id': label['operation_id']})
    return out


def _fields(value):
    if not isinstance(value, dict):
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELDS_MALFORMED',
                                  'the request body must be one object')
    objective = _required_text(value.get('objective'), 'objective')
    output_type = value.get('output_type')
    if output_type not in OUTPUT_TYPES:
        raise AssistancePlanError(400, 'ASSISTANCE_PLAN_OUTPUT_TYPE_INVALID',
                                  f'output_type must be one of {OUTPUT_TYPES}; '
                                  f'got {output_type!r}')
    created_by = _required_text(value.get('created_by'), 'created_by', max_len=200)
    return {
        'objective': objective,
        'output_type': output_type,
        'neutral_creative': _optional_text(value.get('neutral_creative'), 'neutral_creative'),
        'brand_constraints': _string_list(value.get('brand_constraints'), 'brand_constraints'),
        'role_constraints': _string_list(value.get('role_constraints'), 'role_constraints'),
        'lens': _optional_text(value.get('lens'), 'lens'),
        'sound': _optional_text(value.get('sound'), 'sound'),
        'reference_ids': _reference_ids(value.get('references')),
        'external_steps': _external_steps(value.get('external_steps')),
        'known_gaps': _string_list(value.get('known_gaps'), 'known_gaps'),
        'limits': _string_list(value.get('limits'), 'limits'),
        'created_by': created_by,
    }


def _table_exists(conn, name):
    return conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
                        (name,)).fetchone() is not None


def _resolve_references(conn, project_id, references):
    """Pin each reference to the revision and digest the object has *now*.

    A missing table means nothing of that kind was ever stored in this checkout, which is the
    same answer as "no such object" -- 404 with the kind named. A cross-project or malformed
    reference fails closed, exactly as the brief writer's reference check does.
    """
    resolved = []
    for entry in references:
        kind, identifier = entry['kind'], entry['id']
        row = None
        if kind == 'ASSET':
            row = conn.execute(
                'SELECT a.project_id, v.version_no, v.content_sha256 FROM asset a'
                ' JOIN asset_version v ON v.asset_id = a.asset_id AND v.state = ?'
                ' WHERE a.asset_id = ? ORDER BY v.version_no DESC LIMIT 1',
                ('ACTIVE', identifier)).fetchone()
            revision, digest = (row['version_no'], row['content_sha256']) if row else (None, None)
        elif kind == 'BRIEF':
            if _table_exists(conn, 'design_brief'):
                row = conn.execute(
                    'SELECT project_id, version, spec_sha256 FROM design_brief WHERE brief_id=?',
                    (identifier,)).fetchone()
            revision, digest = ((row['version'], 'sha256:' + row['spec_sha256'])
                                if row else (None, None))
        elif kind == 'DIRECTION':
            if _table_exists(conn, 'design_direction'):
                row = conn.execute(
                    'SELECT project_id, version, spec_sha256 FROM design_direction'
                    ' WHERE direction_id=?', (identifier,)).fetchone()
            revision, digest = ((row['version'], 'sha256:' + row['spec_sha256'])
                                if row else (None, None))
        else:  # PROMPT_RESULT
            if _table_exists(conn, 'prompt_result'):
                # result_id is unique per project, not globally (prompt_result is keyed by
                # (project_id, revision)). Prefer this project's row so a same-named result in
                # another project cannot turn a valid reference into a project mismatch.
                rows = conn.execute(
                    'SELECT project_id, revision, content_sha256 FROM prompt_result'
                    ' WHERE result_id=? ORDER BY revision DESC', (identifier,)).fetchall()
                row = next((entry for entry in rows if entry['project_id'] == project_id),
                           rows[0] if rows else None)
            revision, digest = ((row['revision'], row['content_sha256']) if row else (None, None))
        if row is None:
            raise AssistancePlanError(
                404, 'ASSISTANCE_PLAN_REFERENCE_NOT_FOUND',
                f'{kind} {identifier} is not stored in this checkout, so a plan cannot cite it')
        if row['project_id'] != project_id:
            raise AssistancePlanError(
                409, 'ASSISTANCE_PLAN_REFERENCE_PROJECT_MISMATCH',
                f'{kind} {identifier} belongs to another project; a plan cites only material of '
                'its own project')
        if revision is None or not digest:
            raise AssistancePlanError(
                409, 'ASSISTANCE_PLAN_REFERENCE_NOT_READY',
                f'{kind} {identifier} has no current revision to pin (an asset without an active '
                'version, for example), so the plan cannot record what it used')
        resolved.append({'kind': kind, 'id': identifier, 'revision': revision,
                         'sha256': digest})
    return resolved


def _document(plan_id, revision, project_id, fields, references):
    document = {
        'schemaVersion': PLAN_VERSION,
        'plan_id': plan_id,
        'revision': revision,
        'project_id': project_id,
        'objective': fields['objective'],
        'output_type': fields['output_type'],
        'neutral_creative': fields['neutral_creative'],
        'brand_constraints': list(fields['brand_constraints']),
        'role_constraints': list(fields['role_constraints']),
        'lens': fields['lens'],
        'sound': fields['sound'],
        'references': references,
        'external_steps': fields['external_steps'],
        'known_gaps': list(fields['known_gaps']),
        'limits': list(fields['limits']),
        'content_sha256': '',
        'created_at': _now(),
        'created_by': fields['created_by'],
        'claims_not_made': list(CLAIMS_NOT_MADE),
    }
    document['content_sha256'] = _content_digest(document)
    return _check(document, PLAN_SCHEMA_PATH, 'assistance plan')


def _provided(document):
    return isinstance(document, dict) and document.get('neutral_creative') not in (None, '', UNKNOWN)


class AssistancePlans:
    def __init__(self, service):
        self.service = service
        self.paths = service.paths

    def _connect(self):
        return connect(self.paths.database_path(self.service.database),
                       project_root=self.paths.project_root)

    @staticmethod
    def _check_project(conn, project_id):
        if conn.execute('SELECT 1 FROM project WHERE project_id=?', (project_id,)).fetchone() is None:
            raise AssistancePlanError(404, 'PROJECT_NOT_FOUND')

    def output_types(self) -> dict:
        """The closed vocabulary the create route accepts, with the screen's own labels.

        Project-independent on purpose: the initial screen must be able to offer a type before
        a workspace exists, and a view that carried its own copy of these six words could offer
        one the service refuses.
        """
        return _check({'schemaVersion': OUTPUT_TYPES_VERSION,
                       'output_types': [{'value': value, 'label': OUTPUT_LABELS[value]}
                                        for value in OUTPUT_TYPES]},
                      _OUTPUT_TYPES_SCHEMA_PATH, 'assistance plan output types')

    def _write_revision(self, conn, plan_id, revision, project_id, fields, created_by):
        references = _resolve_references(conn, project_id, fields['reference_ids'])
        document = _document(plan_id, revision, project_id, fields, references)
        try:
            conn.execute(
                'INSERT INTO assistance_plan_revision (plan_id, revision, objective, output_type,'
                ' content_sha256, created_at, created_by, document_json)'
                ' VALUES (?,?,?,?,?,?,?,?)',
                (plan_id, revision, document['objective'], document['output_type'],
                 document['content_sha256'], document['created_at'], created_by,
                 _canonical(document)))
        except sqlite3.IntegrityError as exc:
            conn.rollback()
            raise AssistancePlanError(409, 'ASSISTANCE_PLAN_CONCURRENT_UPDATE',
                                      f'the state database refused the revision: {exc}') from None
        return document

    # -- writing ------------------------------------------------------------------

    def create(self, project_id, value) -> dict:
        fields = _fields(value)
        with closing(self._connect()) as conn:
            self._check_project(conn, project_id)
            plan_id = 'aplan-' + uuid.uuid4().hex
            conn.execute('INSERT INTO assistance_plan (plan_id, project_id, created_at)'
                         ' VALUES (?,?,?)', (plan_id, project_id, _now()))
            document = self._write_revision(conn, plan_id, 1, project_id, fields,
                                            fields['created_by'])
            conn.commit()
        return _check({'schemaVersion': WRITE_VERSION, 'status': 'ASSISTANCE_PLAN',
                       'stored': True, 'plan': document, 'revision': 1,
                       'claims_not_made': list(CLAIMS_NOT_MADE)},
                      _WRITE_SCHEMA_PATH, 'assistance plan write', registry=_ref_registry())

    def revise(self, project_id, plan_id, value) -> dict:
        fields = _fields(value)
        expected = value.get('expected_revision')
        if not isinstance(expected, int) or isinstance(expected, bool) or expected < 1:
            raise AssistancePlanError(
                400, 'ASSISTANCE_PLAN_EXPECTED_REVISION_REQUIRED',
                'expected_revision must be the revision this write was prepared against; without '
                'it a second writer silently overwrites the first one\'s correction')
        with closing(self._connect()) as conn:
            plan = conn.execute('SELECT project_id FROM assistance_plan WHERE plan_id=?',
                                (plan_id,)).fetchone()
            if plan is None or plan['project_id'] != project_id:
                raise AssistancePlanError(404, 'ASSISTANCE_PLAN_NOT_FOUND')
            current = conn.execute(
                'SELECT MAX(revision) AS top FROM assistance_plan_revision WHERE plan_id=?',
                (plan_id,)).fetchone()['top']
            if expected != current:
                raise AssistancePlanError(
                    409, 'ASSISTANCE_PLAN_REVISION_CONFLICT',
                    f'the plan is at revision {current}, not {expected}; re-read it and write '
                    'against the revision you actually saw')
            document = self._write_revision(conn, plan_id, current + 1, project_id, fields,
                                            fields['created_by'])
            conn.commit()
        return _check({'schemaVersion': WRITE_VERSION, 'status': 'ASSISTANCE_PLAN',
                       'stored': True, 'plan': document, 'revision': current + 1,
                       'claims_not_made': list(CLAIMS_NOT_MADE)},
                      _WRITE_SCHEMA_PATH, 'assistance plan write', registry=_ref_registry())

    def choose(self, project_id, plan_id, value) -> dict:
        """Record that a named human adopted one stored revision.

        Only ``actor_kind: 'human'`` is accepted. This repository's gate rule is that acceptance
        is signed by a named person; an agent's choice is a proposal, and the storage CHECK
        refuses it as well so the rule survives an application bug.
        """
        if not isinstance(value, dict):
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_FIELDS_MALFORMED',
                                      'the request body must be one object')
        extra = sorted(set(value) - set(_CHOOSE_FIELDS) - {'revision'})
        if extra:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_CHOICE_UNKNOWN_FIELD',
                                      f'the choice carries undeclared field(s): {extra}')
        actor = _required_text(value.get('actor'), 'actor', max_len=200)
        if value.get('actor_kind') != 'human':
            raise AssistancePlanError(
                409, 'ASSISTANCE_PLAN_CHOICE_NOT_HUMAN',
                'only a named human can adopt a plan: an agent\'s choice is a proposal, and this '
                'record is the person\'s statement')
        revision = value.get('revision')
        with closing(self._connect()) as conn:
            plan = conn.execute('SELECT project_id FROM assistance_plan WHERE plan_id=?',
                                (plan_id,)).fetchone()
            if plan is None or plan['project_id'] != project_id:
                raise AssistancePlanError(404, 'ASSISTANCE_PLAN_NOT_FOUND')
            top = conn.execute('SELECT MAX(revision) AS top FROM assistance_plan_revision'
                               ' WHERE plan_id=?', (plan_id,)).fetchone()['top']
            if not isinstance(revision, int) or isinstance(revision, bool) or not 1 <= revision <= top:
                raise AssistancePlanError(
                    400, 'ASSISTANCE_PLAN_CHOICE_REVISION_INVALID',
                    f'revision must name a stored revision between 1 and {top}')
            try:
                conn.execute(
                    'INSERT INTO assistance_plan_choice (plan_id, revision, actor, actor_kind,'
                    ' chosen_at) VALUES (?,?,?,?,?)',
                    (plan_id, revision, actor, 'human', _now()))
            except sqlite3.IntegrityError as exc:
                conn.rollback()
                raise AssistancePlanError(
                    409, 'ASSISTANCE_PLAN_ALREADY_CHOSEN',
                    f'revision {revision} already carries a choice: {exc}. A choice is a record, '
                    'not a toggle; a different person changing their mind is a new fact only the '
                    'owner can decide how to contract') from None
            conn.commit()
        return self.detail(project_id, plan_id)

    # -- reading ------------------------------------------------------------------

    def _live_references(self, conn, project_id, references):
        """Each reference at its live revision, plus whether that asset has analysis evidence."""
        statuses = []
        analyzed = linked = 0
        for entry in references:
            kind, identifier = entry['kind'], entry['id']
            current_revision = current_sha = None
            analysis = None
            if kind == 'ASSET':
                row = conn.execute(
                    'SELECT v.version_no, v.content_sha256 FROM asset a JOIN asset_version v'
                    ' ON v.asset_id = a.asset_id AND v.state = ? WHERE a.asset_id = ?'
                    ' ORDER BY v.version_no DESC LIMIT 1', ('ACTIVE', identifier)).fetchone()
                current_revision = row['version_no'] if row else None
                current_sha = row['content_sha256'] if row else None
                if current_sha and _table_exists(conn, 'prompt_result') and conn.execute(
                        'SELECT 1 FROM prompt_result WHERE project_id=? AND kind=? AND asset_id=?'
                        ' AND asset_sha256=? LIMIT 1',
                        (project_id, 'REVERSAL', identifier, current_sha)).fetchone() is not None:
                    analysis = 'ANALYZED'
                    analyzed += 1
                else:
                    analysis = 'LINKED_ONLY'
                    linked += 1
            elif kind == 'BRIEF' and _table_exists(conn, 'design_brief'):
                row = conn.execute('SELECT version, spec_sha256 FROM design_brief'
                                   ' WHERE brief_id=?', (identifier,)).fetchone()
                current_revision = row['version'] if row else None
                current_sha = ('sha256:' + row['spec_sha256']) if row else None
            elif kind == 'DIRECTION' and _table_exists(conn, 'design_direction'):
                row = conn.execute('SELECT version, spec_sha256 FROM design_direction'
                                   ' WHERE direction_id=?', (identifier,)).fetchone()
                current_revision = row['version'] if row else None
                current_sha = ('sha256:' + row['spec_sha256']) if row else None
            elif kind == 'PROMPT_RESULT' and _table_exists(conn, 'prompt_result'):
                row = conn.execute('SELECT revision, content_sha256 FROM prompt_result'
                                   ' WHERE project_id=? AND result_id=?',
                                   (project_id, identifier)).fetchone()
                current_revision = row['revision'] if row else None
                current_sha = row['content_sha256'] if row else None
            if current_revision is None:
                state = 'MISSING'
            elif (current_revision, current_sha) == (entry['revision'], entry['sha256']):
                state = 'CURRENT'
            else:
                state = 'CHANGED'
            statuses.append({'kind': kind, 'id': identifier,
                             'recorded_revision': entry['revision'],
                             'recorded_sha256': entry['sha256'],
                             'current_revision': current_revision,
                             'current_sha256': current_sha,
                             'state': state, 'analysis': analysis})
        return statuses, {'analyzed': analyzed, 'linked_only': linked}

    def detail(self, project_id, plan_id) -> dict:
        with closing(self._connect()) as conn:
            plan = conn.execute('SELECT project_id FROM assistance_plan WHERE plan_id=?',
                                (plan_id,)).fetchone()
            if plan is None or plan['project_id'] != project_id:
                raise AssistancePlanError(404, 'ASSISTANCE_PLAN_NOT_FOUND')
            rows = conn.execute(
                'SELECT revision, content_sha256, created_at, created_by, document_json'
                ' FROM assistance_plan_revision WHERE plan_id=? ORDER BY revision',
                (plan_id,)).fetchall()
            choice = conn.execute(
                'SELECT revision, actor, actor_kind, chosen_at FROM assistance_plan_choice'
                ' WHERE plan_id=? ORDER BY chosen_at DESC, revision DESC LIMIT 1',
                (plan_id,)).fetchone()
            documents, unreadable, revisions = {}, 0, []
            for row in rows:
                try:
                    document = json.loads(row['document_json'])
                except (TypeError, ValueError):
                    document = None
                    unreadable += 1
                if document is not None:
                    documents[row['revision']] = document
                revisions.append({'revision': row['revision'],
                                  'content_sha256': row['content_sha256'],
                                  'created_at': row['created_at'],
                                  'created_by': row['created_by'],
                                  'readable': document is not None})
            latest = rows[-1]['revision'] if rows else None
            current = documents.get(latest)
            references = current['references'] if current else []
            statuses, summary = self._live_references(conn, project_id, references)
        latest_choice = None
        if choice is not None:
            latest_choice = {'chosen': True, 'revision': choice['revision'],
                             'actor': choice['actor'], 'actor_kind': choice['actor_kind'],
                             'chosen_at': choice['chosen_at'],
                             'is_latest': choice['revision'] == latest}
        else:
            latest_choice = {'chosen': False, 'revision': None, 'actor': None,
                             'actor_kind': None, 'chosen_at': None, 'is_latest': False}
        supplied = []
        if current:
            for step in current['external_steps']:
                for key in ('job_id', 'operation_id'):
                    if step[key] != UNUSED and step[key] not in supplied:
                        supplied.append(step[key])
        provided = _provided(current)
        return _check({
            'schemaVersion': READBACK_VERSION,
            'plan_id': plan_id,
            'project_id': project_id,
            'latest_revision': latest,
            'revisions': revisions,
            'current': current,
            'basis': [dict(entry) for entry in references],
            'reference_status': statuses,
            'analysis_summary': summary,
            'choice': latest_choice,
            'external': {'verified': False,
                         'steps': len(current['external_steps']) if current else 0,
                         'supplied_ids': supplied},
            'states': {'saved': True, 'provided': provided, 'chosen': latest_choice['chosen'],
                       'externally_verified': False},
            'does_not_say': list(DOES_NOT_SAY),
        }, _READBACK_SCHEMA_PATH, 'assistance plan readback', registry=_ref_registry())

    def list(self, project_id, *, offset=0, limit=DEFAULT_LIMIT) -> dict:
        if not isinstance(offset, int) or isinstance(offset, bool) or offset < 0:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_OFFSET_INVALID', 'offset must be >= 0')
        if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= MAX_LIMIT:
            raise AssistancePlanError(400, 'ASSISTANCE_PLAN_LIMIT_INVALID',
                                      f'limit must be between 1 and {MAX_LIMIT}')
        with closing(self._connect()) as conn:
            self._check_project(conn, project_id)
            total = conn.execute('SELECT COUNT(*) FROM assistance_plan WHERE project_id=?',
                                 (project_id,)).fetchone()[0]
            rows = conn.execute(
                'SELECT p.plan_id, r.revision, r.objective, r.output_type, r.created_at,'
                ' r.created_by, r.document_json FROM assistance_plan p'
                ' JOIN assistance_plan_revision r ON r.plan_id = p.plan_id'
                ' AND r.revision = (SELECT MAX(x.revision) FROM assistance_plan_revision x'
                '                    WHERE x.plan_id = p.plan_id)'
                ' WHERE p.project_id=? ORDER BY r.created_at DESC, p.plan_id DESC'
                ' LIMIT ? OFFSET ?', (project_id, limit, offset)).fetchall()
            choices = {row['plan_id']: row['revision'] for row in conn.execute(
                'SELECT c.plan_id, c.revision FROM assistance_plan_choice c WHERE NOT EXISTS ('
                ' SELECT 1 FROM assistance_plan_choice d WHERE d.plan_id = c.plan_id'
                ' AND (d.chosen_at > c.chosen_at'
                '      OR (d.chosen_at = c.chosen_at AND d.revision > c.revision)))')}
        plans = []
        for row in rows:
            try:
                document = json.loads(row['document_json'])
            except (TypeError, ValueError):
                document = None
            plans.append({'plan_id': row['plan_id'], 'revision': row['revision'],
                          'objective': row['objective'], 'output_type': row['output_type'],
                          'created_at': row['created_at'], 'created_by': row['created_by'],
                          'reference_count': len(document['references']) if document else 0,
                          'provided': _provided(document),
                          'chosen_revision': choices.get(row['plan_id'])})
        return _check({'schemaVersion': LIST_VERSION, 'total': total, 'offset': offset,
                       'limit': limit, 'returned': len(plans),
                       'next_offset': (offset + len(plans)) if offset + len(plans) < total else None,
                       'plans': plans},
                      _LIST_SCHEMA_PATH, 'assistance plan list')
