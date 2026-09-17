# SPDX-License-Identifier: MIT
"""Project-owned native exports and bounded immutable archive downloads."""
from contextlib import closing, contextmanager
import hashlib
import sqlite3

from .image_assets import ImageAssetError
from .native_tasks import NativeTasks, NativeTaskError
from .task_queries import TaskQueries
from .runtime.bundle_store import MAX_TOTAL


class NativeDelivery:
    def __init__(self,service):
        self.service=service

    def create(self,project_id,job_id):
        task=TaskQueries(self.service).get(project_id,job_id)['task']
        aid=task['attempt']['attempt_id']
        database=self.service.paths.database_path(self.service.database)
        with closing(sqlite3.connect(database.as_uri()+'?mode=ro',uri=True)) as conn:
            if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='native_execution_v1'").fetchone():
                raise ImageAssetError(409,'NATIVE_RECEIPT_UNAVAILABLE')
            if not conn.execute('SELECT 1 FROM native_execution_v1 WHERE attempt_id=? AND project_id=?',(aid,project_id)).fetchone():
                raise ImageAssetError(404,'NATIVE_TASK_NOT_FOUND')
        try:
            bundle=NativeTasks(self.service).export_bundle(aid,authorization=dict(
                actor='authenticated-local-client',scope='project-native-test',
                receipt='Explicit authenticated project-scoped bundle export; no rights/quality acceptance'))
        except NativeTaskError:
            raise ImageAssetError(409,'NATIVE_BUNDLE_UNVERIFIED') from None
        public={key:value for key,value in bundle.items() if key!='path'}
        return dict(bundle=public,download_path=f"/api/projects/{project_id}/bundles/{bundle['id']}/versions/{bundle['version_id']}/content")

    @contextmanager
    def content(self,project_id,asset_id,version_id):
        if self.service.get_project(project_id) is None:
            raise ImageAssetError(404,'PROJECT_NOT_FOUND')
        database=self.service.paths.database_path(self.service.database)
        with closing(sqlite3.connect(database.as_uri()+'?mode=ro',uri=True)) as conn:
            rows=conn.execute('SELECT f.path,f.sha256,f.byte_size FROM asset a JOIN asset_version v ON v.asset_id=a.asset_id '
                'JOIN artifact f ON f.version_id=v.version_id WHERE a.project_id=? AND a.asset_id=? '
                "AND a.asset_kind='other' AND v.version_id=? AND v.state='ACTIVE'",(project_id,asset_id,version_id)).fetchall()
        if len(rows)!=1:raise ImageAssetError(404,'BUNDLE_NOT_FOUND')
        raw_path,expected,size=rows[0]
        try:
            path=self.service.paths.checked_path(raw_path)
            if not path.is_relative_to(self.service.paths.category_dir('projects',project_id,'assets')):
                raise ValueError('wrong artifact owner')
            if path.suffix!='.zip' or not 0<size<=MAX_TOTAL+1024*1024:
                raise ValueError('invalid archive size/type')
            stream=path.open('rb')
            try:
                import os
                before=os.fstat(stream.fileno())
                if before.st_nlink!=1 or before.st_size!=size:raise ValueError('invalid artifact')
                digest=hashlib.file_digest(stream,'sha256').hexdigest()
                after=os.fstat(stream.fileno())
                if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns) or digest!=expected.removeprefix('sha256:'):
                    raise ValueError('archive changed')
                stream.seek(0)
            except BaseException:
                stream.close();raise
        except (OSError,ValueError):
            raise ImageAssetError(409,'BUNDLE_BYTES_UNVERIFIED') from None
        with stream:
            yield stream,size,digest
