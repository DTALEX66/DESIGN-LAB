# SPDX-License-Identifier: MIT
"""Read-only, project-scoped projections of service-owned import/native attempts.

No receipts, request bodies, notes, keys or arbitrary adapter details are exposed.
These are stored observations, not fresh artifact validation or host acceptance.
"""
from contextlib import closing
import sqlite3

from .image_assets import ImageAssetError


class TaskQueries:
    def __init__(self, service):
        self.service = service

    def _connect(self, project_id):
        if self.service.get_project(project_id) is None:
            raise ImageAssetError(404, 'PROJECT_NOT_FOUND')
        path = self.service.paths.database_path(self.service.database)
        conn = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
        conn.row_factory = sqlite3.Row
        conn.execute('BEGIN')
        return conn

    @staticmethod
    def _ready(conn):
        if conn.execute("SELECT 1 FROM runtime_migration WHERE name='attempt-v2'").fetchone():
            return True
        # A newly created project has no attempts yet. Do not migrate on GET.
        if conn.execute('SELECT 1 FROM job LIMIT 1').fetchone():
            raise ImageAssetError(503, 'TASK_SCHEMA_UNQUALIFIED')
        return False

    @staticmethod
    def _rows(conn, project_id, job_id=None, after=''):
        return conn.execute(
            'SELECT j.job_id,j.operation_id,o.state,o.updated_at,i.idempotency_scope,'
            'a.attempt_id,a.attempt_no,a.state AS attempt_state,a.started_at,a.ended_at '
            'FROM job j JOIN operation_intent i ON i.operation_id=j.operation_id '
            'JOIN operation_state o ON o.operation_id=j.operation_id '
            'JOIN attempt_state a ON a.job_id=j.job_id '
            'WHERE i.idempotency_scope IN (?,?,?) AND (? IS NULL OR j.job_id=?) AND j.job_id>? '
            'AND a.attempt_no=(SELECT MAX(b.attempt_no) FROM attempt_state b WHERE b.job_id=j.job_id) '
            'ORDER BY j.job_id LIMIT 101',
            ('image-import:' + project_id, 'native:'+project_id+':photoshop',
             'native:'+project_id+':illustrator', job_id, job_id, after)).fetchall()

    @staticmethod
    def _task(row):
        return {'job_id': row['job_id'], 'operation_id': row['operation_id'],
                'kind': ('image-import' if row['idempotency_scope'].startswith('image-import:')
                         else row['idempotency_scope'].rsplit(':',1)[1]+'-native'),
                'state': row['state'], 'updated_at': row['updated_at'],
                'attempt': {'attempt_id': row['attempt_id'], 'attempt_no': row['attempt_no'],
                            'state': row['attempt_state'], 'started_at': row['started_at'],
                            'ended_at': row['ended_at']}}

    def list(self, project_id, after=''):
        with closing(self._connect(project_id)) as conn:
            rows = self._rows(conn, project_id, after=after) if self._ready(conn) else []
            return {'tasks': [self._task(row) for row in rows[:100]],
                    'next_cursor': rows[99]['job_id'] if len(rows) > 100 else None}

    def get(self, project_id, job_id):
        with closing(self._connect(project_id)) as conn:
            rows = self._rows(conn, project_id, job_id) if self._ready(conn) else []
            if len(rows) != 1:
                raise ImageAssetError(404, 'TASK_NOT_FOUND')
            return {'task': self._task(rows[0])}

    def events(self, project_id, job_id, after=0):
        with closing(self._connect(project_id)) as conn:
            if not self._ready(conn) or len(self._rows(conn, project_id, job_id)) != 1:
                raise ImageAssetError(404, 'TASK_NOT_FOUND')
            rows = conn.execute(
                'SELECT e.event_no,e.attempt_id,a.attempt_no,e.from_state,e.to_state,e.at '
                'FROM attempt_event e JOIN attempt_state a ON a.attempt_id=e.attempt_id '
                'WHERE a.job_id=? AND e.event_no>? ORDER BY e.event_no LIMIT 101',
                (job_id, after)).fetchall()
            return {'events': [dict(row) for row in rows[:100]],
                    'next_cursor': rows[99]['event_no'] if len(rows) > 100 else None}
