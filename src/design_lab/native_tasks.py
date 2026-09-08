# SPDX-License-Identifier: MIT
"""Durable internal native execution using the service's existing state stores.

Host guards deliberately never expire. An unresolved COM call may still write;
only a verified completion or a proven pre-dispatch rejection releases a guard.
This is not a public arbitrary-job endpoint or a rights/quality approval engine.
"""
from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3

from .adapters import illustrator_com, photoshop_com
from .runtime import asset_store as assets, job_store as jobs
from .runtime.attempt_contract import request_hash
from .runtime.native_recovery_lock import recovery_lock, RecoveryBusy


class NativeTaskError(RuntimeError):
    def __init__(self,code,*,attempt=None):
        super().__init__(code);self.attempt=attempt


def _dispatch(host,job,**kwargs):
    return {'illustrator':illustrator_com,'photoshop':photoshop_com}[host].execute(job,**kwargs)


def _json(value):
    return json.dumps(value,sort_keys=True,ensure_ascii=True,separators=(',',':'),allow_nan=False)


def _digest(path):
    before=path.stat()
    if not path.is_file() or not 0<before.st_size<=256*1024*1024 or before.st_nlink!=1:raise ValueError('invalid file')
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):h.update(block)
    after=path.stat()
    if (before.st_size,before.st_mtime_ns,before.st_ino)!=(after.st_size,after.st_mtime_ns,after.st_ino):raise ValueError('file changed')
    return dict(sha256=h.hexdigest(),byte_size=before.st_size)


class NativeTasks:
    def __init__(self,service):
        self.service=service;self.paths=service.paths;self.owner=self.paths.project_root

    def _connect(self):
        conn=jobs.connect(self.service.database,project_root=self.owner)
        try:
            conn.executescript('''
CREATE TABLE IF NOT EXISTS native_execution_v1 (
 attempt_id TEXT PRIMARY KEY REFERENCES attempt_state(attempt_id),
 project_id TEXT NOT NULL REFERENCES project(project_id), host TEXT NOT NULL,
 request_json TEXT NOT NULL, receipt_json TEXT, result_json TEXT
);
CREATE TABLE IF NOT EXISTS native_host_guard_v1 (
 host TEXT PRIMARY KEY CHECK(host IN ('illustrator','photoshop')),
 attempt_id TEXT NOT NULL UNIQUE REFERENCES attempt_state(attempt_id), acquired_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS native_quiescence_v1 (
 attempt_id TEXT PRIMARY KEY REFERENCES attempt_state(attempt_id),
 authorization_json TEXT NOT NULL, started_at TEXT NOT NULL, receipt_json TEXT
);
CREATE TABLE IF NOT EXISTS native_reconciliation_v1 (
 attempt_id TEXT PRIMARY KEY REFERENCES attempt_state(attempt_id),
 authorization_json TEXT NOT NULL, started_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS native_recovery_protocol_v2 (
 attempt_id TEXT PRIMARY KEY REFERENCES native_reconciliation_v1(attempt_id),
 protocol TEXT NOT NULL CHECK(protocol='os-lock-v1')
);
''')
            return conn
        except BaseException:conn.close();raise

    def _inside(self,value,root):
        path=self.paths.checked_path(value)
        if path==root or not path.is_relative_to(root):raise ValueError('outside approved root')
        return path

    def _prepare(self,project_id,host,job,key,root,authorization):
        if host not in ('photoshop','illustrator'):raise ValueError('unsupported host')
        if not isinstance(project_id,str) or not re.fullmatch(r'[0-9a-f]{32}',project_id) or self.service.get_project(project_id) is None:raise ValueError('unknown project')
        if not isinstance(key,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}',key):raise ValueError('invalid key')
        if (not isinstance(authorization,dict) or set(authorization)!={'actor','scope','receipt'}
            or authorization['scope']!='project-native-test'
            or any(not isinstance(v,str) or not v.strip() or len(v)>2000 for v in authorization.values())):raise ValueError('scoped caller authorization required')
        payload=_json(job)
        if len(payload)>4_000_000:raise ValueError('oversized job')
        job=json.loads(payload);root=self.paths.checked_path(root)
        if not root.is_dir() or self.paths.checked_path(job['runRoot'])!=root:raise ValueError('unapproved root')
        inputs={}
        for asset in job['assets']:
            path=self._inside(asset['path'],root);inputs[str(path)]=_digest(path)
        if host=='illustrator' and job.get('schemaVersion')=='design-lab/adobe-patch-job/v1':
            path=self._inside(job['checkpoint'],root);inputs[str(path)]=_digest(path)
            if inputs[str(path)]['sha256']!=job['checkpointSha256']:raise ValueError('checkpoint hash mismatch')
        if host=='photoshop':
            outputs={'psd':root/job['outputName'],'png':root/job['previewName']}
        else:outputs=job['targets']
        outputs={kind:self._inside(path,root) for kind,path in outputs.items()}
        primary='psd' if host=='photoshop' else 'ai'
        if set(outputs)!=({'psd','png'} if primary=='psd' else {'ai','png','svg'}):raise ValueError('invalid output set')
        identity=hashlib.sha256((project_id+':'+host+':'+key).encode()).hexdigest()
        request=dict(project_id=project_id,host=host,job=job,inputs=inputs,authorization=dict(authorization))
        return job,root,outputs,primary,identity,request

    def _claim(self,conn,attempt,host):
        with jobs._transaction(conn):
            current,op=jobs._current(conn,attempt['attempt_id'])
            if current['state']!='PENDING':return False
            if conn.execute('SELECT 1 FROM native_host_guard_v1 WHERE host=?',(host,)).fetchone():
                raise NativeTaskError('HOST_BUSY_UNRESOLVED',attempt=current)
            conn.execute('INSERT INTO native_host_guard_v1 VALUES (?,?,?)',(host,current['attempt_id'],jobs._now()))
            jobs._change(conn,current,'RUNNING','native host claimed; non-expiring guard')
            jobs._op(conn,op,'DISPATCHING')
            return True

    def _verify_result(self,result,project_id):
        asset=result['asset'];path=self._inside(asset['path'],self.paths.category_dir('projects',project_id))
        actual=_digest(path)
        if actual!={'sha256':asset['sha256'],'byte_size':asset['byte_size']}:raise NativeTaskError('PUBLISHED_ARTIFACT_CHANGED')
        return result

    def _existing(self,conn,attempt,project_id):
        row=conn.execute('SELECT result_json FROM native_execution_v1 WHERE attempt_id=?',(attempt['attempt_id'],)).fetchone()
        if attempt['state']=='RECEIPTED':
            if not row or not row[0]:raise NativeTaskError('NATIVE_RESULT_MISSING',attempt=attempt)
            return self._verify_result(json.loads(row[0]),project_id)
        return {'attempt':attempt}

    def _verify_receipt(self,receipt,job,request,outputs):
        if (receipt.get('status')!='NATIVE_READBACK' or receipt.get('job_id')!=job['jobId']
            or receipt.get('job_sha256')!=hashlib.sha256(_json(job).encode()).hexdigest()
            or receipt.get('documents_before')!=receipt.get('documents_after')
            or type(receipt.get('documents_before')) is not int
            or receipt.get('inputs')!=request['inputs']):raise ValueError('native receipt mismatch')
        for path,digest in request['inputs'].items():
            if _digest(self.paths.checked_path(path))!=digest:raise ValueError('input changed')
        if set(receipt.get('artifacts',{}))!=set(outputs):raise ValueError('artifact set mismatch')
        for kind,path in outputs.items():
            if _digest(self.paths.checked_path(path))!=receipt['artifacts'][kind]:raise ValueError('output mismatch')

    def _publish(self,project_id,asset_id,primary,source,receipt,aid,*,recovering=False):
        with closing(assets.connect(self.service.database,project_root=self.owner)) as conn:
            assets.register_asset(conn,project_id,asset_id,primary)
            resource='asset:'+asset_id
            if not assets.acquire_writer(conn,resource,aid):
                if not recovering:raise NativeTaskError('ASSET_WRITER_BUSY')
                # Caller owns the OS recovery lock; only this same attempt's
                # prior lease may be fenced out, never a different writer.
                assets.takeover_writer(conn,resource,aid,expected_holder=aid)
            generation=assets.writer_token(conn,resource,aid)
            try:
                if recovering:
                    assets.recover_publications(conn,store_root=self.paths.category_dir('projects',project_id,'assets'),
                        project_root=self.owner,asset_id=asset_id,holder_attempt_id=aid,generation=generation)
                version=assets.publish_version(conn,asset_id,source,
                    store_root=self.paths.category_dir('projects',project_id,'assets'),artifact_name='native.'+primary,
                    expected_sha256=receipt['artifacts'][primary]['sha256'],holder_attempt_id=aid,
                    generation=generation,project_root=self.owner)
                row=conn.execute('SELECT path,sha256,byte_size FROM artifact WHERE version_id=?',(version,)).fetchone()
                result=dict(id=asset_id,version_id=version,path=row[0],sha256=row[1].removeprefix('sha256:'),
                            byte_size=row[2],kind=primary,rights='NOT_REVIEWED')
                self._verify_result({'asset':result},project_id)
                return result
            finally:assets.release_writer(conn,resource,aid,generation=generation)

    def _finish(self,conn,aid,host,result):
        with jobs._transaction(conn):
            current,op=jobs._current(conn,aid)
            guard=conn.execute('SELECT attempt_id FROM native_host_guard_v1 WHERE host=?',(host,)).fetchone()
            if current['state'] not in ('RUNNING','CANCEL_REQUESTED','RECONCILING') or guard!=(aid,):raise NativeTaskError('NATIVE_FINISH_CONFLICT')
            digest=result['asset']['sha256']
            evidence=jobs._evidence(dict(operation_id=op,attempt_id=aid,artifact_sha256=digest,readback_sha256=digest,
                kind='native-host-published',native=result['native'],version_id=result['asset']['version_id'],rights='NOT_REVIEWED'),op,aid)
            jobs._resolution(conn,aid,'effect_verified',evidence);jobs._op(conn,op,'SUCCEEDED')
            jobs._change(conn,current,'RECEIPTED','native readback and published bytes verified')
            result['attempt']=jobs._record(conn,aid)
            conn.execute('UPDATE native_execution_v1 SET result_json=? WHERE attempt_id=?',(_json(result),aid))
            conn.execute('DELETE FROM native_host_guard_v1 WHERE host=? AND attempt_id=?',(host,aid))
        return result

    def _failed(self,conn,aid,host,not_started):
        with jobs._transaction(conn):
            current,op=jobs._current(conn,aid)
            if current['state'] in ('RUNNING','CANCEL_REQUESTED'):
                if not_started:
                    cancelling=current['state']=='CANCEL_REQUESTED'
                    jobs._resolution(conn,aid,'effect_not_started');jobs._op(conn,op,'CANCELLED' if cancelling else 'RETRYABLE')
                    if cancelling:conn.execute('UPDATE attempt_resolution SET cancel_acked=1 WHERE attempt_id=?',(aid,))
                    jobs._change(conn,current,'CANCELLED' if cancelling else 'FAILED','adapter rejected before dispatch')
                    conn.execute('DELETE FROM native_host_guard_v1 WHERE host=? AND attempt_id=?',(host,aid))
                elif current['state']=='RUNNING':
                    jobs._change(conn,current,'OUTCOME_UNKNOWN','native effects/publication require reconciliation')
                    jobs._op(conn,op,'OUTCOME_UNKNOWN')
            return jobs._record(conn,aid)

    def reconcile_receipted(self,attempt_id,*,authorization):
        """Resume publication from a persisted verified host receipt, never dispatch.

        Missing receipts cannot prove host completion. Explicit recovery holds
        an OS-owned lock throughout; only a subsequent holder may resume a
        protocol-tagged claim. Legacy claims are never inferred stopped.
        """
        if (not isinstance(authorization,dict) or set(authorization)!={'actor','scope','receipt'}
            or authorization['scope']!='project-native-test'
            or any(not isinstance(v,str) or not v.strip() or len(v)>2000 for v in authorization.values())):
            raise NativeTaskError('RECONCILIATION_AUTHORIZATION_REQUIRED')
        try:
            with recovery_lock(self.paths,attempt_id):
                return self._reconcile_receipted_locked(attempt_id,authorization)
        except RecoveryBusy as exc:
            raise NativeTaskError('RECONCILIATION_WORKER_ACTIVE') from exc

    def _reconcile_receipted_locked(self,attempt_id,authorization):
        with closing(self._connect()) as conn:
            with jobs._transaction(conn):
                current,op=jobs._current(conn,attempt_id)
                row=conn.execute('SELECT host,project_id,request_json,receipt_json FROM native_execution_v1 WHERE attempt_id=?',(attempt_id,)).fetchone()
                if not row:raise NativeTaskError('RECONCILIATION_NOT_ELIGIBLE')
                host,project_id,raw_request,raw_receipt=row
                if current['state']=='RECEIPTED':return self._existing(conn,current,project_id)
                guard=conn.execute('SELECT attempt_id FROM native_host_guard_v1 WHERE host=?',(host,)).fetchone()
                claim=conn.execute('SELECT 1 FROM native_reconciliation_v1 WHERE attempt_id=?',(attempt_id,)).fetchone()
                protocol=conn.execute('SELECT protocol FROM native_recovery_protocol_v2 WHERE attempt_id=?',(attempt_id,)).fetchone()
                eligible=(current['state']=='OUTCOME_UNKNOWN' and not claim) or (
                    current['state']=='RECONCILING' and claim and protocol==('os-lock-v1',))
                if (not eligible or guard!=(attempt_id,) or not raw_receipt
                    or conn.execute('SELECT 1 FROM native_quiescence_v1 WHERE attempt_id=?',(attempt_id,)).fetchone()):
                    raise NativeTaskError('RECONCILIATION_NOT_ELIGIBLE')
                if not claim:
                    conn.execute('INSERT INTO native_reconciliation_v1 VALUES (?,?,?)',(attempt_id,_json(authorization),jobs._now()))
                    conn.execute("INSERT INTO native_recovery_protocol_v2 VALUES (?,'os-lock-v1')",(attempt_id,))
                    jobs._change(conn,current,'RECONCILING','persisted native receipt; publication-only recovery')
                else:
                    jobs._event(conn,attempt_id,'RECONCILING','RECONCILING','OS lock reacquired; explicit publication recovery')
                jobs._op(conn,op,'RECONCILING')
            try:
                request=json.loads(raw_request);job=request['job'];receipt=json.loads(raw_receipt)
                root=self.paths.checked_path(job['runRoot'])
                raw_outputs=({'psd':root/job['outputName'],'png':root/job['previewName']}
                             if host=='photoshop' else job['targets'])
                outputs={kind:self._inside(path,root) for kind,path in raw_outputs.items()}
                primary='psd' if host=='photoshop' else 'ai'
                self._verify_receipt(receipt,job,request,outputs)
                # Asset identity is already bound to the persisted operation, not
                # reconstructed using a new idempotency key or caller input.
                if not op.startswith('native-op-'):raise ValueError('invalid operation identity')
                asset_id='native-'+op.removeprefix('native-op-')
                asset=self._publish(project_id,asset_id,primary,outputs[primary],receipt,attempt_id,recovering=True)
                return self._finish(conn,attempt_id,host,dict(asset=asset,native=receipt))
            except Exception as exc:
                raise NativeTaskError('RECONCILIATION_UNRESOLVED_GUARD_RETAINED') from exc

    def quiesce_illustrator(self,attempt_id,*,authorization):
        """Pause an unknown attempt after fixed host cleanup, never accept it.

        Internal recovery entry, not an HTTP action. A failed recovery keeps
        both the original guard and a non-expiring recovery claim; no retries.
        """
        if (not isinstance(authorization,dict) or set(authorization)!={'actor','scope','receipt'}
            or authorization['scope']!='project-native-test'
            or any(not isinstance(v,str) or not v.strip() or len(v)>2000 for v in authorization.values())):
            raise NativeTaskError('QUIESCENCE_AUTHORIZATION_REQUIRED')
        with closing(self._connect()) as conn:
            with jobs._transaction(conn):
                current,op=jobs._current(conn,attempt_id)
                row=conn.execute('SELECT host,request_json FROM native_execution_v1 WHERE attempt_id=?',(attempt_id,)).fetchone()
                guard=conn.execute('SELECT attempt_id FROM native_host_guard_v1 WHERE host=?',('illustrator',)).fetchone()
                if (not row or row[0]!='illustrator' or guard!=(attempt_id,) or current['state']!='OUTCOME_UNKNOWN'
                    or conn.execute('SELECT 1 FROM native_quiescence_v1 WHERE attempt_id=?',(attempt_id,)).fetchone()):
                    raise NativeTaskError('QUIESCENCE_NOT_ELIGIBLE')
                request=json.loads(row[1]);job=request['job']
                conn.execute('INSERT INTO native_quiescence_v1 VALUES (?,?,?,NULL)',(attempt_id,_json(authorization),jobs._now()))
            try:
                receipt=illustrator_com.quiesce(job,project_root=self.owner,approved_root=job['runRoot'])
                if (receipt.get('status')!='HOST_QUIESCENT_ARTIFACTS_UNACCEPTED'
                    or receipt.get('job_id')!=job['jobId'] or type(receipt.get('closed_documents')) is not int
                    or receipt['closed_documents'] not in (0,1)
                    or type(receipt.get('documents_before')) is not int or type(receipt.get('documents_after')) is not int
                    or receipt['documents_before']<0 or receipt['documents_after']<0
                    or receipt['documents_before']-receipt['documents_after']!=receipt['closed_documents']):
                    raise ValueError('invalid quiescence receipt')
                with jobs._transaction(conn):
                    current,op=jobs._current(conn,attempt_id)
                    guard=conn.execute('SELECT attempt_id FROM native_host_guard_v1 WHERE host=?',('illustrator',)).fetchone()
                    if current['state']!='OUTCOME_UNKNOWN' or guard!=(attempt_id,):raise ValueError('recovery state changed')
                    jobs._change(conn,current,'RECONCILING','host quiescent; outputs preserved, not accepted')
                    jobs._resolution(conn,attempt_id,'needs_user');jobs._op(conn,op,'PAUSED_NEEDS_USER')
                    conn.execute('UPDATE native_quiescence_v1 SET receipt_json=? WHERE attempt_id=?',(_json(receipt),attempt_id))
                    conn.execute('DELETE FROM native_host_guard_v1 WHERE host=? AND attempt_id=?',('illustrator',attempt_id))
                    return dict(attempt=jobs._record(conn,attempt_id),quiescence=receipt)
            except Exception as exc:raise NativeTaskError('QUIESCENCE_OUTCOME_UNKNOWN_GUARD_RETAINED') from exc

    def execute(self,project_id,host,job,*,idempotency_key,approved_root,authorization):
        try:job,root,outputs,primary,identity,request=self._prepare(project_id,host,job,idempotency_key,approved_root,authorization)
        except Exception as exc:raise NativeTaskError('NATIVE_REQUEST_REJECTED') from exc
        with closing(self._connect()) as conn:
            try:
                attempt=jobs.begin_attempt(conn,'native-job-'+identity,operation_id='native-op-'+identity,
                    idempotency_scope='native:'+project_id+':'+host,idempotency_key=idempotency_key,request_hash=request_hash(request))
            except jobs.AttemptError as exc:raise NativeTaskError('NATIVE_IDEMPOTENCY_CONFLICT') from exc
            aid=attempt['attempt_id']
            with jobs._transaction(conn):
                conn.execute('INSERT OR IGNORE INTO native_execution_v1(attempt_id,project_id,host,request_json) VALUES (?,?,?,?)',
                             (aid,project_id,host,_json(request)))
            if not self._claim(conn,attempt,host):return self._existing(conn,jobs.latest_attempt(conn,attempt['job_id']),project_id)
            adapter_returned=False
            try:
                receipt=_dispatch(host,job,project_root=self.owner,approved_root=root)
                adapter_returned=True
                self._verify_receipt(receipt,job,request,outputs)
                with jobs._transaction(conn):
                    conn.execute('UPDATE native_execution_v1 SET receipt_json=? WHERE attempt_id=?',(_json(receipt),aid))
                asset=self._publish(project_id,'native-'+identity,primary,outputs[primary],receipt,aid)
                return self._finish(conn,aid,host,dict(asset=asset,native=receipt))
            except Exception as exc:
                no_effect=(not adapter_returned and isinstance(exc,(photoshop_com.PhotoshopDispatchError,illustrator_com.IllustratorDispatchError)) and not exc.outcome_unknown)
                current=self._failed(conn,aid,host,no_effect)
                raise NativeTaskError('NATIVE_NOT_STARTED' if no_effect else 'NATIVE_OUTCOME_UNKNOWN',attempt=current) from exc
