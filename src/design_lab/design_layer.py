# SPDX-License-Identifier: MIT
"""E-SLICE-01 design layer: Brief / Direction / DesignSystem vertical slice.

This is the single writer for the three design-layer tables added by
``design-lab-state-design-layer-v1.sql`` (schema v2 adds the DB-level
single-choice index, v3 the append-only event log). It is NOT a second runtime,
backend or ledger: it reuses the one local state database, opens it through the
existing creative store connection (which applies the additive design-layer
migration),
and reuses the shared ``operation_intent`` idempotency table for crash-safe,
retried-but-not-duplicated writes.

The slice is structural, not a Host run and not a Human-Jury acceptance:
  * a Brief is the recorded "what we are designing and why";
  * a Direction is one concrete visual stance under a brief; choosing one sets
    ``chosen`` as the single source of truth for that decision;
  * a DesignSystem binding binds the chosen direction to ONE catalog design
    system (validated against the packaged ``design-lab/design-systems``
    manifests), so a future Build/Review step has a fixed design contract.

Readback is the persisted record itself; evidence is the recorded spec digests,
the chosen-actor fact and the binding spec digest. Nothing here claims E3/E4.

F-2a revision model (``design-lab-state-design-layer-v3.sql``): the content rows
are immutable, the history is ONE append-only ``design_layer_event`` log, and
``chosen`` stays the materialized record of the human choice. Every write path
appends its event inside the SAME transaction as the state change it describes;
``revise_brief`` / ``revise_direction`` append a NEW content row
(version = old + 1) and only move the superseded row's ``superseded_by``
pointer (no content column is ever rewritten); ``lineage_brief`` /
``lineage_direction`` read the chain back, oldest version first.
"""
from __future__ import annotations

import json
import re
import sqlite3
from contextlib import closing
from pathlib import Path

from .creative import store as cstore
from .creative.store import CreativeError
from .runtime.paths import PROJECT_ROOT, PathPolicyError

# P0-07: the design-system catalog (source of the design contracts a direction
# may bind to) is packaged into the wheel under design_lab/resources/
# design-systems, and also lives in the source checkout. _catalog_root()
# resolves it packaged-first (installed wheel via importlib.resources) with a
# source-checkout fallback, mirroring workbench.resource(): in an installed
# environment PROJECT_ROOT does not point at the design-systems tree, so the
# catalog must come from the package.
_CATALOG_PKG = ('design_lab', 'resources', 'design-systems')
_CATALOG_SOURCE = ('design-lab', 'design-systems')


def _catalog_root():
    """Return the first design-system catalog root that actually has manifests."""
    from importlib.resources import files
    candidates = []
    try:
        candidates.append(files(_CATALOG_PKG[0]).joinpath(*_CATALOG_PKG[1:]))
    except (FileNotFoundError, ModuleNotFoundError, AttributeError):
        pass
    candidates.append(Path(PROJECT_ROOT).joinpath(*_CATALOG_SOURCE))
    for candidate in candidates:
        try:
            if candidate.is_dir() and list(candidate.glob('*/manifest.json')):
                return candidate
        except (OSError, RuntimeError):
            continue
    return candidates[0] if candidates else None


class DesignLayerError(ValueError):
    def __init__(self, status, code):
        self.status, self.code = status, code


def _text(value, field, *, max_len=400):
    if not isinstance(value, str) or not value.strip():
        raise DesignLayerError(400, 'INVALID_FIELD')
    value = value.strip()
    if len(value) > max_len:
        raise DesignLayerError(400, 'FIELD_TOO_LONG')
    return value


def _string_list(value, field, *, limit=64, item_max=300):
    if value is None:
        return []
    if not isinstance(value, list) or len(value) > limit:
        raise DesignLayerError(400, 'INVALID_LIST')
    out = []
    for item in value:
        if not isinstance(item, str) or not item.strip() or len(item.strip()) > item_max:
            raise DesignLayerError(400, 'INVALID_LIST_ITEM')
        out.append(item.strip())
    return out


def _json_field(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def _record_intent(conn, *, scope, key, document):
    """Idempotent intent recording with a precise HTTP conflict contract.

    The shared creative store fails closed when the same idempotency key is
    reused with different content. Surface that as a 409 (``IDEMPOTENCY_CONFLICT``)
    rather than an opaque store error so the design-layer API keeps a clean,
    deterministic error face without a second store or ledger.
    """
    try:
        return cstore.record_intent(conn, scope=scope, key=key, document=document)
    except CreativeError:
        raise DesignLayerError(409, 'IDEMPOTENCY_CONFLICT')


# F-2a: the event kinds the v3 schema's CHECK accepts. Appending anything else
# would be a schema violation, so the module fails closed first.
EVENT_KINDS = (
    'brief-created', 'brief-revised',
    'direction-created', 'direction-revised',
    'direction-chosen', 'direction-unchosen',
    'binding-created', 'binding-rebound',
)


def _append_event(conn, *, project_id, kind, payload, brief_id=None, direction_id=None,
                  binding_id=None, actor=None, actor_kind=None, event_id=None):
    """Append ONE design-layer event inside the CALLER's open transaction.

    Append-only is a property of this write, not a convention: it is a plain
    INSERT (no ``OR REPLACE`` / ``OR IGNORE``), so a repeated ``event_id`` fails
    closed with a PRIMARY KEY violation instead of silently overwriting history,
    and the v3 schema adds BEFORE UPDATE/DELETE triggers that abort any other
    mutation of the log. The caller's transaction is the same one that performs
    the state change the event describes, so the change and its event commit (or
    roll back) together -- there is no window in which one exists without the
    other.
    """
    if kind not in EVENT_KINDS:
        raise DesignLayerError(400, 'UNKNOWN_EVENT_KIND')
    conn.execute(
        "INSERT INTO design_layer_event (event_id, project_id, kind, brief_id, direction_id,"
        " binding_id, payload_json, actor, actor_kind, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (event_id or cstore.new_id('event'), project_id, kind, brief_id, direction_id,
         binding_id, _json_field(payload), actor, actor_kind, cstore.now()))


# P0-05: a reference asset id is the shape the image import layer mints
# (``img-`` + 64 hex). Anything else is rejected before it can reach the DB.
_ASSET_ID_SHAPE = re.compile(r'img-[0-9a-f]{64}')


def catalog():
    """The read-only design-system catalog (packaged manifests, no writes)."""
    systems = []
    catalog_root = _catalog_root()
    if catalog_root is not None:
        for manifest in sorted(catalog_root.glob('*/manifest.json')):
            data = json.loads(manifest.read_text(encoding='utf-8'))
            name = data.get('name')
            if not isinstance(name, str) or not name:
                continue
            systems.append({
                'name': name,
                'title': data.get('title') or name,
                'version': data.get('version') or '0.0.0',
                'evidence_level': (data.get('evidence') or {}).get('level', 'E0'),
            })
    return systems


class DesignLayer:
    def __init__(self, service):
        self.service = service
        self.paths = service.paths

    # -- connection helpers -------------------------------------------------
    def _check_project(self, project_id) -> None:
        if self.service.get_project(project_id) is None:
            raise DesignLayerError(404, 'PROJECT_NOT_FOUND')

    def _db_path(self):
        return self.paths.database_path(self.service.database)

    def _ro(self):
        # Read path reuses the SAME guarded connection the write path uses, so
        # the design-layer tables (from GUARDED_MIGRATIONS) are guaranteed to
        # exist before any read. A bare read-only sqlite3.connect would skip the
        # additive migration and fail with "no such table" on a project that
        # has not yet recorded a brief/direction/binding.
        return cstore.connect(self._db_path(), project_root=self.paths.project_root)

    def _rows(self, sql, params=()):
        with closing(self._ro()) as conn:
            conn.row_factory = sqlite3.Row
            return [dict(r) for r in conn.execute(sql, params).fetchall()]

    # -- readback shapes ----------------------------------------------------
    @staticmethod
    def _brief(row) -> dict:
        return {
            'brief_id': row['brief_id'],
            'title': row['title'],
            'goals': json.loads(row['goals_json']),
            'constraints': json.loads(row['constraints_json']) if row['constraints_json'] else None,
            'reference_asset_ids': json.loads(row['reference_asset_ids']) if row['reference_asset_ids'] else [],
            'spec_sha256': 'sha256:' + row['spec_sha256'],
            'version': row['version'],
            'superseded_by': row['superseded_by'],
            'created_at': row['created_at'],
        }

    @staticmethod
    def _direction(row) -> dict:
        return {
            'direction_id': row['direction_id'],
            'brief_id': row['brief_id'],
            'title': row['title'],
            'style_notes': json.loads(row['style_notes_json']) if row['style_notes_json'] else None,
            'color_mood': row['color_mood'],
            'typography_mood': row['typography_mood'],
            'chosen': bool(row['chosen']),
            'actor': row['actor'],
            'actor_kind': row['actor_kind'],
            'spec_sha256': 'sha256:' + row['spec_sha256'],
            'version': row['version'],
            'superseded_by': row['superseded_by'],
            'created_at': row['created_at'],
        }

    @staticmethod
    def _binding(row) -> dict:
        return {
            'binding_id': row['binding_id'],
            'direction_id': row['direction_id'],
            'design_system_name': row['design_system_name'],
            'spec_sha256': 'sha256:' + row['spec_sha256'],
            'version': row['version'],
            'superseded_by': row['superseded_by'],
            'created_at': row['created_at'],
        }

    @staticmethod
    def _verify_references(conn, project_id, refs):
        """P0-05: every reference_asset_id must be a real asset of THIS project.

        Deduped in order; a malformed id, an unknown id and an id owned by a
        different project all fail closed (no arbitrary ``img-…`` string may be
        persisted into a brief). The ``asset`` table is visible on this same
        guarded connection, so no second store or cross-database read is needed.
        """
        seen = []
        for ref in refs:
            if ref not in seen:
                seen.append(ref)
        for ref in seen:
            if not _ASSET_ID_SHAPE.fullmatch(ref):
                raise DesignLayerError(400, 'INVALID_REFERENCE_ASSET_ID')
            row = conn.execute(
                "SELECT project_id FROM asset WHERE asset_id=?", (ref,)).fetchone()
            if row is None:
                raise DesignLayerError(404, 'REFERENCE_ASSET_NOT_FOUND')
            if row['project_id'] != project_id:
                raise DesignLayerError(409, 'REFERENCE_ASSET_PROJECT_MISMATCH')
        return seen

    # -- briefs -------------------------------------------------------------
    def create_brief(self, project_id, *, title, goals, constraints,
                     reference_asset_ids, idempotency_key):
        self._check_project(project_id)
        title = _text(title, 'title')
        goals = _string_list(goals, 'goals')
        if not goals:
            raise DesignLayerError(400, 'GOALS_REQUIRED')
        constraints = _text(constraints, 'constraints', max_len=2000) if constraints else None
        refs = _string_list(reference_asset_ids, 'reference_asset_ids', limit=32, item_max=72)
        # P0-05: dedupe now (in order) so the persisted + hashed reference list is the
        # canonical one; the per-id asset existence / project-ownership checks happen on
        # the write connection below.
        refs = list(dict.fromkeys(refs))

        document = {'title': title, 'goals': goals, 'constraints': constraints,
                    'reference_asset_ids': refs}
        spec = cstore.hash_document(document)
        with closing(cstore.connect(self._db_path(), project_root=self.paths.project_root)) as conn:
            with cstore.transaction(conn):
                conn.row_factory = sqlite3.Row
                operation_id, _ = _record_intent(
                    conn, scope='brief:' + project_id, key=idempotency_key, document=document)
                existing = conn.execute(
                    "SELECT * FROM design_brief WHERE operation_id=?", (operation_id,)).fetchone()
                if existing is not None:
                    return {'brief': self._brief(dict(existing))}
                # P0-05: fail closed before persisting — every reference must be a
                # real asset of this project (malformed / unknown / cross-project).
                refs = self._verify_references(conn, project_id, refs)
                brief_id = cstore.new_id('brief')
                conn.execute(
                    "INSERT INTO design_brief (brief_id, operation_id, project_id, title, goals_json,"
                    " constraints_json, reference_asset_ids, spec_sha256, version, created_at)"
                    " VALUES (?,?,?,?,?,?,?,?,1,?)",
                    (brief_id, operation_id, project_id, title, _json_field(goals),
                     # P0-04: store constraints as a JSON-encoded string (""text""), not as
                     # {"constraints":"text"}; readback below json.loads it back to the same
                     # string|null so the frontend and backend share ONE contract (no
                     # [object Object] double truth).
                     _json_field(constraints) if constraints else None,
                     _json_field(refs) if refs else None,
                     spec.removeprefix('sha256:'), cstore.now()))
                _append_event(
                    conn, project_id=project_id, kind='brief-created', brief_id=brief_id,
                    payload={'brief_id': brief_id, 'version': 1, 'spec_sha256': spec})
                created = conn.execute(
                    'SELECT * FROM design_brief WHERE brief_id=?', (brief_id,)).fetchone()
        return {'brief': self._brief(dict(created))}

    def list_briefs(self, project_id, after=''):
        self._check_project(project_id)
        rows = self._rows(
            "SELECT * FROM design_brief WHERE project_id=? AND brief_id>? ORDER BY brief_id LIMIT 101",
            (project_id, after))
        return {'briefs': [self._brief(r) for r in rows[:100]],
                'next_cursor': rows[99]['brief_id'] if len(rows) > 100 else None}

    def get_brief(self, project_id, brief_id):
        self._check_project(project_id)
        rows = self._rows(
            "SELECT * FROM design_brief WHERE project_id=? AND brief_id=?", (project_id, brief_id))
        if not rows:
            raise DesignLayerError(404, 'BRIEF_NOT_FOUND')
        return {'brief': self._brief(rows[0])}

    def revise_brief(self, project_id, brief_id, *, title, goals, constraints,
                     reference_asset_ids, idempotency_key):
        """Append the NEXT version of an existing brief (F-2a, content revision).

        The parent row is never rewritten: this INSERTs a new brief row with
        ``version = parent.version + 1`` and moves ONLY the parent's
        ``superseded_by`` pointer at it, in the same transaction as the
        ``brief-revised`` event. Every content column of the parent (title,
        goals, constraints, references, spec_sha256, created_at) keeps its
        original bytes -- a revision is an append, not an edit.

        Idempotency reuses the shared intent table, so a replayed key returns the
        SAME new brief identity and a key reused with different content fails
        closed (409 IDEMPOTENCY_CONFLICT). Revising an already-superseded version
        would fork the chain, so it fails closed too (409 STALE_REVISION): revise
        the live tip returned by the previous revision.
        """
        self._check_project(project_id)
        title = _text(title, 'title')
        goals = _string_list(goals, 'goals')
        if not goals:
            raise DesignLayerError(400, 'GOALS_REQUIRED')
        constraints = _text(constraints, 'constraints', max_len=2000) if constraints else None
        refs = list(dict.fromkeys(_string_list(reference_asset_ids, 'reference_asset_ids',
                                               limit=32, item_max=72)))
        # spec_sha256 is the digest of the CONTENT document (identity-free), so
        # the same content has the same digest across versions. The intent
        # document adds the parent id, so reusing a key against a different
        # parent is a genuine conflict, not a replay.
        content = {'title': title, 'goals': goals, 'constraints': constraints,
                   'reference_asset_ids': refs}
        spec = cstore.hash_document(content)
        document = {'parent_brief_id': brief_id, **content}
        with closing(cstore.connect(self._db_path(), project_root=self.paths.project_root)) as conn:
            with cstore.transaction(conn):
                conn.row_factory = sqlite3.Row
                parent = conn.execute(
                    "SELECT * FROM design_brief WHERE project_id=? AND brief_id=?",
                    (project_id, brief_id)).fetchone()
                if parent is None:
                    raise DesignLayerError(404, 'BRIEF_NOT_FOUND')
                operation_id, _ = _record_intent(
                    conn, scope='brief-revision:' + project_id, key=idempotency_key,
                    document=document)
                existing = conn.execute(
                    "SELECT * FROM design_brief WHERE operation_id=?", (operation_id,)).fetchone()
                if existing is not None:
                    # Idempotent replay: the same key returns the same new
                    # version, and appends nothing new.
                    return {'brief': self._brief(dict(existing))}
                if parent['superseded_by'] is not None:
                    raise DesignLayerError(409, 'STALE_REVISION')
                refs = self._verify_references(conn, project_id, refs)
                version = int(parent['version']) + 1
                revised_id = cstore.new_id('brief')
                conn.execute(
                    "INSERT INTO design_brief (brief_id, operation_id, project_id, title,"
                    " goals_json, constraints_json, reference_asset_ids, spec_sha256, version,"
                    " created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (revised_id, operation_id, project_id, title, _json_field(goals),
                     _json_field(constraints) if constraints else None,
                     _json_field(refs) if refs else None,
                     spec.removeprefix('sha256:'), version, cstore.now()))
                # The ONLY column a revision may touch on the parent row.
                conn.execute(
                    "UPDATE design_brief SET superseded_by=? WHERE brief_id=?",
                    (revised_id, brief_id))
                _append_event(
                    conn, project_id=project_id, kind='brief-revised', brief_id=revised_id,
                    payload={'old_id': brief_id, 'new_id': revised_id, 'version': version,
                             'previous_version': int(parent['version']), 'spec_sha256': spec})
                created = conn.execute(
                    "SELECT * FROM design_brief WHERE brief_id=?", (revised_id,)).fetchone()
        return {'brief': self._brief(dict(created))}

    # -- directions ---------------------------------------------------------
    def create_direction(self, project_id, *, brief_id, title, style_notes,
                         color_mood, typography_mood, idempotency_key):
        self._check_project(project_id)
        if not self._rows("SELECT brief_id FROM design_brief WHERE project_id=? AND brief_id=?",
                          (project_id, brief_id)):
            raise DesignLayerError(404, 'BRIEF_NOT_FOUND')
        title = _text(title, 'title')
        style_notes = _string_list(style_notes, 'style_notes') or None
        color_mood = _text(color_mood, 'color_mood') if color_mood else None
        typography_mood = _text(typography_mood, 'typography_mood') if typography_mood else None

        document = {'brief_id': brief_id, 'title': title, 'style_notes': style_notes,
                    'color_mood': color_mood, 'typography_mood': typography_mood}
        spec = cstore.hash_document(document)
        with closing(cstore.connect(self._db_path(), project_root=self.paths.project_root)) as conn:
            with cstore.transaction(conn):
                conn.row_factory = sqlite3.Row
                operation_id, _ = _record_intent(
                    conn, scope='direction:' + project_id, key=idempotency_key, document=document)
                existing = conn.execute(
                    "SELECT direction_id FROM design_direction WHERE operation_id=?",
                    (operation_id,)).fetchone()
                if existing is not None:
                    row = conn.execute(
                        "SELECT * FROM design_direction WHERE direction_id=?", (existing[0],)).fetchone()
                    return {'direction': self._direction(dict(row))}
                direction_id = cstore.new_id('direction')
                conn.execute(
                    "INSERT INTO design_direction (direction_id, operation_id, project_id, brief_id,"
                    " title, style_notes_json, color_mood, typography_mood, spec_sha256, version,"
                    " created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)",
                    (direction_id, operation_id, project_id, brief_id, title,
                     _json_field(style_notes) if style_notes else None, color_mood,
                     typography_mood, spec.removeprefix('sha256:'), cstore.now()))
                _append_event(
                    conn, project_id=project_id, kind='direction-created', brief_id=brief_id,
                    direction_id=direction_id,
                    payload={'direction_id': direction_id, 'brief_id': brief_id, 'version': 1,
                             'spec_sha256': spec})
                created = conn.execute(
                    'SELECT * FROM design_direction WHERE direction_id=?', (direction_id,)).fetchone()
        return {'direction': self._direction(dict(created))}

    def list_directions(self, project_id, brief_id=None, after=''):
        self._check_project(project_id)
        sql = "SELECT * FROM design_direction WHERE project_id=?"
        params = [project_id]
        if brief_id:
            sql += " AND brief_id=?"
            params.append(brief_id)
        sql += " AND direction_id>? ORDER BY direction_id LIMIT 101"
        params.append(after)
        rows = self._rows(sql, params)
        return {'directions': [self._direction(r) for r in rows[:100]],
                'next_cursor': rows[99]['direction_id'] if len(rows) > 100 else None}

    def get_direction(self, project_id, direction_id):
        self._check_project(project_id)
        rows = self._rows("SELECT * FROM design_direction WHERE project_id=? AND direction_id=?",
                          (project_id, direction_id))
        if not rows:
            raise DesignLayerError(404, 'DIRECTION_NOT_FOUND')
        return {'direction': self._direction(rows[0])}

    def revise_direction(self, project_id, direction_id, *, title, style_notes, color_mood,
                         typography_mood, idempotency_key):
        """Append the NEXT version of a direction (F-2a, content revision).

        Same contract as :meth:`revise_brief`: a new row with
        ``version = parent.version + 1`` plus a ``direction-revised`` event in one
        transaction, and only the parent's ``superseded_by`` pointer moves -- the
        parent's content columns keep their original bytes.

        The human Choice follows the lineage: when the revised version was the
        chosen one, the parent releases ``chosen``/``actor`` (materialized state,
        not content) and the new version carries the same choice, recorded in the
        event payload as ``chosen_moved``. A design-system binding, however, stays
        attached to the version it was bound to (its row is append-only and may
        not be repointed), so after revising a bound chosen direction the read
        model's ``active_binding`` is null until the contract is bound again.
        """
        self._check_project(project_id)
        title = _text(title, 'title')
        style_notes = _string_list(style_notes, 'style_notes') or None
        color_mood = _text(color_mood, 'color_mood') if color_mood else None
        typography_mood = _text(typography_mood, 'typography_mood') if typography_mood else None
        with closing(cstore.connect(self._db_path(), project_root=self.paths.project_root)) as conn:
            with cstore.transaction(conn):
                conn.row_factory = sqlite3.Row
                parent = conn.execute(
                    "SELECT * FROM design_direction WHERE project_id=? AND direction_id=?",
                    (project_id, direction_id)).fetchone()
                if parent is None:
                    raise DesignLayerError(404, 'DIRECTION_NOT_FOUND')
                content = {'brief_id': parent['brief_id'], 'title': title,
                           'style_notes': style_notes, 'color_mood': color_mood,
                           'typography_mood': typography_mood}
                spec = cstore.hash_document(content)
                document = {'parent_direction_id': direction_id, **content}
                operation_id, _ = _record_intent(
                    conn, scope='direction-revision:' + project_id, key=idempotency_key,
                    document=document)
                existing = conn.execute(
                    "SELECT * FROM design_direction WHERE operation_id=?",
                    (operation_id,)).fetchone()
                if existing is not None:
                    return {'direction': self._direction(dict(existing))}
                if parent['superseded_by'] is not None:
                    raise DesignLayerError(409, 'STALE_REVISION')
                version = int(parent['version']) + 1
                carried = bool(int(parent['chosen']))
                revised_id = cstore.new_id('direction')
                # Retire the parent FIRST when the choice moves, so the brief never
                # holds two LIVE chosen rows: the v2 partial UNIQUE index keys on
                # (brief_id) WHERE chosen=1 AND superseded_by IS NULL.
                conn.execute(
                    "UPDATE design_direction SET superseded_by=?, chosen=?, actor=?, actor_kind=?"
                    " WHERE direction_id=?",
                    (revised_id, 0 if carried else parent['chosen'],
                     None if carried else parent['actor'],
                     None if carried else parent['actor_kind'], direction_id))
                conn.execute(
                    "INSERT INTO design_direction (direction_id, operation_id, project_id, brief_id,"
                    " title, style_notes_json, color_mood, typography_mood, chosen, actor, actor_kind,"
                    " spec_sha256, version, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (revised_id, operation_id, project_id, parent['brief_id'], title,
                     _json_field(style_notes) if style_notes else None, color_mood,
                     typography_mood, 1 if carried else 0,
                     parent['actor'] if carried else None,
                     parent['actor_kind'] if carried else None,
                     spec.removeprefix('sha256:'), version, cstore.now()))
                _append_event(
                    conn, project_id=project_id, kind='direction-revised',
                    brief_id=parent['brief_id'], direction_id=revised_id,
                    actor=parent['actor'] if carried else None,
                    actor_kind=parent['actor_kind'] if carried else None,
                    payload={'old_id': direction_id, 'new_id': revised_id, 'version': version,
                             'previous_version': int(parent['version']),
                             'brief_id': parent['brief_id'], 'spec_sha256': spec,
                             'chosen_moved': carried,
                             'previous_chosen_direction_id': direction_id if carried else None})
                created = conn.execute(
                    "SELECT * FROM design_direction WHERE direction_id=?", (revised_id,)).fetchone()
        return {'direction': self._direction(dict(created))}

    def choose_direction(self, project_id, direction_id, *, actor, actor_kind, idempotency_key):
        """Record which direction is chosen (the Golden Workflow 1 "Human Choice").

        Structural: sets ``chosen`` + the acting fact on the row. It is NOT a host
        run and NOT a quality-jury acceptance of a produced artifact.
        """
        self._check_project(project_id)
        if actor_kind not in ('human', 'agent'):
            raise DesignLayerError(400, 'INVALID_ACTOR_KIND')
        if actor_kind != 'human':
            raise DesignLayerError(403, 'HUMAN_DIRECTION_CHOICE_REQUIRED')
        actor = _text(actor, 'actor')
        document = {'direction_id': direction_id, 'actor': actor, 'actor_kind': actor_kind}
        with closing(cstore.connect(self._db_path(), project_root=self.paths.project_root)) as conn:
            with cstore.transaction(conn):
                conn.row_factory = sqlite3.Row
                row = dict(conn.execute(
                    "SELECT * FROM design_direction WHERE project_id=? AND direction_id=?",
                    (project_id, direction_id)).fetchone() or {})
                if not row:
                    raise DesignLayerError(404, 'DIRECTION_NOT_FOUND')
                operation_id, _ = _record_intent(
                    conn, scope='choose:' + direction_id, key=idempotency_key, document=document)
                # F-2a: the previous choice is read BEFORE the de-select below,
                # because the direction-chosen event must record which direction
                # (if any) this choice replaced. The append set is decided from
                # the state transition, so an idempotent replay of the same
                # choice appends nothing and the log stays one entry per
                # transition instead of one entry per HTTP retry.
                previous = conn.execute(
                    "SELECT direction_id FROM design_direction WHERE brief_id=? AND chosen=1"
                    " AND direction_id<>?", (row['brief_id'], direction_id)).fetchone()
                previous_chosen_id = previous['direction_id'] if previous else None
                transitioned = (not int(row['chosen']) or previous_chosen_id is not None
                                or row['actor'] != actor or row['actor_kind'] != actor_kind)
                # P0-01 single-choice invariant: within this ONE transaction, de-select
                # every other chosen direction under the SAME brief, then select this
                # direction. Both updates share the single transaction, so the database
                # can never end up in a "all cleared but the new choice not set"
                # intermediate state. (Choosing across different briefs is unaffected:
                # each brief keeps at most one chosen direction.)
                conn.execute(
                    "UPDATE design_direction SET chosen=0, actor=NULL, actor_kind=NULL "
                    "WHERE brief_id=? AND chosen=1 AND direction_id<>?",
                    (row['brief_id'], direction_id))
                conn.execute(
                    "UPDATE design_direction SET chosen=1, actor=?, actor_kind=? WHERE direction_id=?",
                    (actor, actor_kind, direction_id))
                if transitioned:
                    if previous_chosen_id is not None:
                        _append_event(
                            conn, project_id=project_id, kind='direction-unchosen',
                            brief_id=row['brief_id'], direction_id=previous_chosen_id,
                            actor=actor, actor_kind=actor_kind,
                            payload={'direction_id': previous_chosen_id,
                                     'brief_id': row['brief_id'],
                                     'unchosen_by_direction_id': direction_id})
                    _append_event(
                        conn, project_id=project_id, kind='direction-chosen',
                        brief_id=row['brief_id'], direction_id=direction_id,
                        actor=actor, actor_kind=actor_kind,
                        payload={'direction_id': direction_id, 'brief_id': row['brief_id'],
                                 'previous_chosen_direction_id': previous_chosen_id,
                                 'actor': actor, 'actor_kind': actor_kind})
                updated = conn.execute(
                    "SELECT * FROM design_direction WHERE direction_id=?", (direction_id,)).fetchone()
        return {'direction': self._direction(dict(updated))}

    # -- design-system binding ---------------------------------------------
    def bind_design_system(self, project_id, direction_id, *, design_system_name,
                           idempotency_key):
        """Bind the chosen direction to ONE catalog design system (design contract)."""
        self._check_project(project_id)
        name = _text(design_system_name, 'design_system_name')
        catalog_names = {s['name'] for s in catalog()}
        if name not in catalog_names:
            raise DesignLayerError(400, 'UNKNOWN_DESIGN_SYSTEM')
        document = {'direction_id': direction_id, 'design_system_name': name}
        spec = cstore.hash_document(document)
        with closing(cstore.connect(self._db_path(), project_root=self.paths.project_root)) as conn:
            with cstore.transaction(conn):
                conn.row_factory = sqlite3.Row
                # P0-03: a binding is the design contract OF THE CHOSEN direction.
                # Fail closed when the target direction exists but is not chosen
                # (a specific 4xx, never the generic INVALID_REQUEST).
                dr = conn.execute(
                    "SELECT chosen, actor_kind FROM design_direction WHERE project_id=? AND direction_id=?",
                    (project_id, direction_id)).fetchone()
                if dr is None:
                    raise DesignLayerError(404, 'DIRECTION_NOT_FOUND')
                if not int(dr['chosen']):
                    raise DesignLayerError(409, 'DIRECTION_NOT_CHOSEN')
                if dr['actor_kind'] != 'human':
                    # Upgrade guard: databases created before the human-only
                    # choice rule may already contain an agent-chosen row.
                    # It remains visible for audit, but cannot advance to a
                    # design-system binding until a human chooses it.
                    raise DesignLayerError(409, 'HUMAN_DIRECTION_CHOICE_REQUIRED')
                operation_id, _ = _record_intent(
                    conn, scope='bind:' + direction_id, key=idempotency_key, document=document)
                existing = conn.execute(
                    "SELECT binding_id FROM design_system_binding WHERE operation_id=?",
                    (operation_id,)).fetchone()
                if existing is not None:
                    row = conn.execute(
                        "SELECT * FROM design_system_binding WHERE binding_id=?",
                        (existing[0],)).fetchone()
                    return {'binding': self._binding(dict(row))}
                # F-2a: a binding for this direction that already exists means this
                # write REPLACES it -- recorded as binding-rebound carrying the
                # replaced id. The replaced row is left exactly as written (the v1
                # schema's no-update trigger forbids touching it); the new row is
                # the next version, so the read model's "latest revision of the
                # chosen direction's bindings" (get_design_layer) stays correct.
                replaced = conn.execute(
                    "SELECT * FROM design_system_binding WHERE direction_id=?"
                    " ORDER BY version DESC, created_at DESC, binding_id DESC LIMIT 1",
                    (direction_id,)).fetchone()
                binding_id = cstore.new_id('bind')
                version = int(replaced['version']) + 1 if replaced is not None else 1
                conn.execute(
                    "INSERT INTO design_system_binding (binding_id, operation_id, project_id,"
                    " direction_id, design_system_name, spec_sha256, version, created_at)"
                    " VALUES (?,?,?,?,?,? ,?,?)",
                    (binding_id, operation_id, project_id, direction_id, name,
                     spec.removeprefix('sha256:'), version, cstore.now()))
                _append_event(
                    conn, project_id=project_id,
                    kind='binding-rebound' if replaced is not None else 'binding-created',
                    brief_id=None, direction_id=direction_id, binding_id=binding_id,
                    payload={'binding_id': binding_id, 'direction_id': direction_id,
                             'design_system_name': name, 'version': version,
                             'spec_sha256': spec,
                             'replaced_binding_id': replaced['binding_id'] if replaced is not None
                                                   else None})
                created = conn.execute(
                    "SELECT * FROM design_system_binding WHERE binding_id=?", (binding_id,)).fetchone()
        return {'binding': self._binding(dict(created))}

    # -- F-2a lineage (read-only) ------------------------------------------
    def project_of_brief(self, brief_id):
        """Owner project of a brief id.

        The id-addressed revision/lineage routes carry no project path, so the
        owner is resolved from the record itself; an unknown id fails closed.
        """
        rows = self._rows("SELECT project_id FROM design_brief WHERE brief_id=?", (brief_id,))
        if not rows:
            raise DesignLayerError(404, 'BRIEF_NOT_FOUND')
        return rows[0]['project_id']

    def project_of_direction(self, direction_id):
        """Owner project of a direction id (see :meth:`project_of_brief`)."""
        rows = self._rows("SELECT project_id FROM design_direction WHERE direction_id=?",
                          (direction_id,))
        if not rows:
            raise DesignLayerError(404, 'DIRECTION_NOT_FOUND')
        return rows[0]['project_id']

    def lineage_brief(self, project_id, brief_id):
        """The brief's version chain, oldest version first (read-only)."""
        self._check_project(project_id)
        return {'lineage': {'brief_id': brief_id, **self._chain(
            project_id, brief_id, "SELECT * FROM design_brief WHERE project_id=?", 'brief_id',
            'brief-revised', 'BRIEF_NOT_FOUND', self._brief)}}

    def lineage_direction(self, project_id, direction_id):
        """The direction's version chain, oldest version first (read-only)."""
        self._check_project(project_id)
        return {'lineage': {'direction_id': direction_id, **self._chain(
            project_id, direction_id, "SELECT * FROM design_direction WHERE project_id=?",
            'direction_id', 'direction-revised', 'DIRECTION_NOT_FOUND', self._direction)}}

    def _chain(self, project_id, row_id, select_sql, id_column, revised_kind, not_found, shape):
        """Resolve one record's version chain from the append-only events.

        The edge record is the log, not the version numbers: the ``*-revised``
        payloads map ``new_id -> old_id``, so ANY member of the chain resolves to
        the same full lineage (an older version included). The chain is then
        walked forward through ``superseded_by``, so a caller reads history
        instead of guessing which row is current; the live tip is named
        explicitly. Nothing here writes.
        """
        rows = {row[id_column]: row for row in self._rows(select_sql, (project_id,))}
        if row_id not in rows:
            raise DesignLayerError(404, not_found)
        parents = {}
        for event in self._rows(
                "SELECT payload_json FROM design_layer_event WHERE project_id=? AND kind=?"
                " ORDER BY created_at, rowid", (project_id, revised_kind)):
            payload = json.loads(event['payload_json'])
            old_id, new_id = payload.get('old_id'), payload.get('new_id')
            if old_id in rows and new_id in rows:
                parents[new_id] = old_id
        root, seen = row_id, {row_id}
        while parents.get(root) in rows and parents[root] not in seen:
            root = parents[root]
            seen.add(root)
        chain, cursor, walked = [], root, set()
        while cursor in rows and cursor not in walked:
            walked.add(cursor)
            chain.append(rows[cursor])
            cursor = rows[cursor]['superseded_by']
        chain.sort(key=lambda row: (int(row['version']), row['created_at'], row[id_column]))
        return {'root_id': root, 'requested_id': row_id,
                'live_id': chain[-1][id_column] if chain else None,
                'versions': [shape(row) for row in chain]}

    # -- design-system catalog ---------------------------------------------
    def design_systems(self):
        """Read-only catalog of packaged design systems (the bindable contracts)."""
        return {'design_systems': catalog()}

    # -- readback: the full slice ------------------------------------------
    def get_design_layer(self, project_id):
        """Read back the whole vertical slice for a project (the evidence shape)."""
        self._check_project(project_id)
        briefs = self.list_briefs(project_id)['briefs']
        directions = self.list_directions(project_id)['directions']
        bindings = self._rows(
            "SELECT * FROM design_system_binding WHERE project_id=? ORDER BY binding_id",
            (project_id,))
        chosen = [d for d in directions if d['chosen']]
        # P0-02: chosen_direction reflects ONLY a real chosen direction. There is
        # no fallback to the most-recently-created direction, which would fabricate
        # a Human Choice that never happened. No chosen -> null.
        chosen_dir = chosen[0] if chosen else None
        # P0-D: active_binding is the binding attached to THE CHOSEN direction --
        # never a stray binding left on some now-unchosen direction. Switching
        # the choice (A -> B) leaves B unbound, so active_binding must go null,
        # not point at A's binding. Among a chosen direction's own bindings we
        # take the latest revision (version, then created_at, then id).
        active_binding = None
        if chosen_dir is not None:
            owned = [b for b in bindings
                     if b['direction_id'] == chosen_dir['direction_id']]
            if owned:
                active_binding = max(
                    owned,
                    key=lambda b: (int(b['version']), b['created_at'], b['binding_id']))
        return {
            'design_layer': {
                'briefs': briefs,
                'directions': directions,
                'chosen_direction': chosen_dir,
                'bindings': [self._binding(b) for b in bindings],
                'active_binding': self._binding(dict(active_binding)) if active_binding else None,
                'design_systems': catalog(),
            }
        }
