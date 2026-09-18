# SPDX-License-Identifier: MIT
"""E-SLICE-01 design layer: Brief / Direction / DesignSystem vertical slice.

This is the single writer for the three design-layer tables added by
``design-lab-state-design-layer-v1.sql``. It is NOT a second runtime, backend or
ledger: it reuses the one local state database, opens it through the existing
creative store connection (which applies the additive design-layer migration),
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
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path

from .creative import store as cstore
from .creative.store import CreativeError
from .runtime.paths import PROJECT_ROOT, PathPolicyError

# Packaged design-system catalog directory (source of the design contracts a
# direction may bind to). Resolved through PROJECT_ROOT so it works in both the
# source tree and the installed wheel.
_CATALOG_ROOT = PROJECT_ROOT / 'design-lab' / 'design-systems'


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


def catalog():
    """The read-only design-system catalog (packaged manifests, no writes)."""
    systems = []
    if _CATALOG_ROOT.is_dir():
        for manifest in sorted(_CATALOG_ROOT.glob('*/manifest.json')):
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
                brief_id = cstore.new_id('brief')
                conn.execute(
                    "INSERT INTO design_brief (brief_id, operation_id, project_id, title, goals_json,"
                    " constraints_json, reference_asset_ids, spec_sha256, version, created_at)"
                    " VALUES (?,?,?,?,?,?,?,?,1,?)",
                    (brief_id, operation_id, project_id, title, _json_field(goals),
                     _json_field({'constraints': constraints}) if constraints else None,
                     _json_field(refs) if refs else None,
                     spec.removeprefix('sha256:'), cstore.now()))
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

    def choose_direction(self, project_id, direction_id, *, actor, actor_kind, idempotency_key):
        """Record which direction is chosen (the Golden Workflow 1 "Human Choice").

        Structural: sets ``chosen`` + the acting fact on the row. It is NOT a host
        run and NOT a quality-jury acceptance of a produced artifact.
        """
        self._check_project(project_id)
        if actor_kind not in ('human', 'agent'):
            raise DesignLayerError(400, 'INVALID_ACTOR_KIND')
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
                conn.execute(
                    "UPDATE design_direction SET chosen=1, actor=?, actor_kind=? WHERE direction_id=?",
                    (actor, actor_kind, direction_id))
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
                if not conn.execute(
                        "SELECT 1 FROM design_direction WHERE project_id=? AND direction_id=?",
                        (project_id, direction_id)).fetchone():
                    raise DesignLayerError(404, 'DIRECTION_NOT_FOUND')
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
                binding_id = cstore.new_id('bind')
                conn.execute(
                    "INSERT INTO design_system_binding (binding_id, operation_id, project_id,"
                    " direction_id, design_system_name, spec_sha256, version, created_at)"
                    " VALUES (?,?,?,?,?,? ,1,?)",
                    (binding_id, operation_id, project_id, direction_id, name,
                     spec.removeprefix('sha256:'), cstore.now()))
                created = conn.execute(
                    "SELECT * FROM design_system_binding WHERE binding_id=?", (binding_id,)).fetchone()
        return {'binding': self._binding(dict(created))}

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
        active_binding = bindings[-1] if bindings else None
        return {
            'design_layer': {
                'briefs': briefs,
                'directions': directions,
                'chosen_direction': next((d for d in chosen), None) or (
                    directions[-1] if directions else None),
                'bindings': [self._binding(b) for b in bindings],
                'active_binding': self._binding(dict(active_binding)) if active_binding else None,
                'design_systems': catalog(),
            }
        }
