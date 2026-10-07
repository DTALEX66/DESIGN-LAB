# SPDX-License-Identifier: MIT
"""Project-owned native exports and bounded immutable archive downloads.

``create`` publishes the archive *and* the DeliveryReceipt V2 that says what shipped,
from which host, with which digests; ``receipt`` reads that persisted document back.
The receipt is validated by the emitter before it is stored and re-verified on every
read, so a delivery never answers with a document its own bytes contradict. A missing
host readback stays missing: the document this path emits is ``PARTIAL`` by construction
and says plainly what it does not prove.
"""
from contextlib import closing, contextmanager
import hashlib
import sqlite3

from .image_assets import ImageAssetError
from .interop import InteropError, delivery_receipt
from .native_tasks import NativeTasks, NativeTaskError
from .task_queries import TaskQueries
from .runtime.bundle_store import MAX_TOTAL

RECEIPT_QUERY = ('SELECT r.receipt_json,r.receipt_sha256 FROM delivery_receipt_v1 r '
    'JOIN asset a ON a.asset_id=r.asset_id '
    'JOIN asset_version v ON v.version_id=r.version_id AND v.asset_id=a.asset_id '
    'JOIN artifact f ON f.version_id=v.version_id '
    "WHERE r.version_id=? AND r.asset_id=? AND r.project_id=? AND a.project_id=? "
    "AND v.version_id=? AND v.state='ACTIVE'")


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

    def receipt(self,project_id,asset_id,version_id):
        """Read back the receipt this project's delivery was published with.

        Ownership is decided by the asset ledger, not by the receipt row's own
        self-declared ``project_id``: both must name the asking project, and the
        version must still be ACTIVE with a published artifact, so a row written for
        another project can never make one project's document readable from another.
        """
        if self.service.get_project(project_id) is None:
            raise ImageAssetError(404,'PROJECT_NOT_FOUND')
        database=self.service.paths.database_path(self.service.database)
        with closing(sqlite3.connect(database.as_uri()+'?mode=ro',uri=True)) as conn:
            try:
                row=conn.execute(RECEIPT_QUERY,(version_id,asset_id,project_id,project_id,version_id)).fetchone()
            except sqlite3.Error:
                raise ImageAssetError(404,'DELIVERY_RECEIPT_NOT_FOUND') from None
        if not row:
            raise ImageAssetError(404,'DELIVERY_RECEIPT_NOT_FOUND')
        try:
            receipt=delivery_receipt.loads(row[0])
        except (InteropError,ValueError):
            raise ImageAssetError(409,'DELIVERY_RECEIPT_UNVERIFIED') from None
        if receipt['receipt_sha256']!=row[1]:
            raise ImageAssetError(409,'DELIVERY_RECEIPT_UNVERIFIED')
        return receipt

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
