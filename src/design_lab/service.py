# SPDX-License-Identifier: MIT
"""Project metadata facade shared by the CLI and future local HTTP transport."""
from contextlib import closing
import sqlite3
import uuid

from .runtime import asset_store
from .runtime.paths import resolve_paths


class ProjectService:
    def __init__(self, project_root):
        self.paths = resolve_paths(project_root=project_root)
        self.database = self.paths.database_path(
            self.paths.runtime_root / 'service/state.db')

    def reconcile_interrupted_attempts(self):
        """Turn attempts left RUNNING by a dead worker into a visible unknown outcome.

        Called by the service entry points before they start serving, so that
        reopening the Workbench after a crash reads "result unknown, reconcile"
        instead of a permanent "running". An attempt whose worker is still alive
        is left alone: the non-blocking OS lock is what proves the difference, and
        relabelling live work is the one thing recovery may not do.
        """
        if not self.database.exists():
            return []
        from .runtime import job_store
        from .runtime.native_recovery_lock import RecoveryBusy, recovery_lock

        def holder_is_gone(attempt_id):
            try:
                with recovery_lock(self.paths, attempt_id):
                    return True
            except RecoveryBusy:
                return False

        with closing(job_store.connect(self.database,
                                       project_root=self.paths.project_root)) as conn:
            return job_store.recover_orphaned_attempts(conn, holder_is_gone=holder_is_gone)

    def list_projects(self):
        if not self.database.exists():
            return []
        self.paths.database_path(self.database)
        with closing(sqlite3.connect(self.database.as_uri() + '?mode=ro', uri=True)) as conn:
            return [dict(zip(('id', 'name', 'created_at'), row)) for row in conn.execute(
                'SELECT project_id, display_name, created_at FROM project ORDER BY created_at, project_id')]

    def create_project(self, name):
        if (not isinstance(name, str) or not name.strip() or len(name) > 160
                or any(ord(char) < 32 or 0xD800 <= ord(char) <= 0xDFFF for char in name)):
            raise ValueError('INVALID_PROJECT_NAME')
        name = name.strip()
        project_id = uuid.uuid4().hex
        with closing(asset_store.connect(self.database, project_root=self.paths.project_root)) as conn:
            asset_store.create_project(conn, project_id, name)
            row = conn.execute('SELECT project_id, display_name, created_at FROM project WHERE project_id=?',
                               (project_id,)).fetchone()
            return dict(zip(('id', 'name', 'created_at'), row))

    def get_project(self, project_id):
        if not self.database.exists():
            return None
        self.paths.database_path(self.database)
        with closing(sqlite3.connect(self.database.as_uri() + '?mode=ro', uri=True)) as conn:
            row = conn.execute('SELECT project_id, display_name, created_at FROM project WHERE project_id=?',
                               (project_id,)).fetchone()
            return dict(zip(('id', 'name', 'created_at'), row)) if row else None
