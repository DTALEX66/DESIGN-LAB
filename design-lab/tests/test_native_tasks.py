# SPDX-License-Identifier: MIT
"""Durable native execution: real SQLite, files and threads; COM boundary only doubled."""
from contextlib import closing
import hashlib
import importlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'src'))
from design_lab.service import ProjectService
from design_lab.runtime import job_store
from design_lab.adapters.photoshop_com import PhotoshopDispatchError


class NativeTaskTests(unittest.TestCase):
    def setUp(self):
        parent=ROOT/'.project-local/task-runtime/native-task-tests';parent.mkdir(parents=True,exist_ok=True)
        temp=tempfile.TemporaryDirectory(dir=parent);self.addCleanup(temp.cleanup)
        self.root=Path(temp.name);(self.root/'AGENTS.md').write_text('# synthetic owner',encoding='utf-8')
        env=patch.dict(os.environ,{'PROJECT_LOCAL_ROOT':str(self.root/'.project-local')});env.start();self.addCleanup(env.stop)
        self.service=ProjectService(self.root);self.project=self.service.create_project('Native test')['id']
        self.run=self.root/'.project-local/task-artifacts/run';self.run.mkdir(parents=True)
        Image.new('RGB',(8,6),'blue').save(self.run/'input.png')
        self.job=dict(schemaVersion='design-lab/photoshop-native-job/v1',jobId='native-test',runRoot=str(self.run),width=8,height=6,
            outputName='output.psd',previewName='output.png',assets=[dict(id='input',path=str(self.run/'input.png'))],
            layers=[dict(id='image',kind='raster',assetId='input',position=[0,0],width=8,height=6)])
        self.authorization=dict(actor='test-owner',scope='project-native-test',receipt='synthetic test authorization')

    def module(self):
        self.assertIsNotNone(importlib.util.find_spec('design_lab.native_tasks'),'durable native executor missing')
        return importlib.import_module('design_lab.native_tasks')

    def execute(self,key='key',job=None):
        return self.module().NativeTasks(self.service).execute(self.project,'photoshop',job or self.job,
            idempotency_key=key,approved_root=self.run,authorization=self.authorization)

    def native(self,host,job,**kwargs):
        primary=self.run/job['outputName'];preview=self.run/job['previewName']
        primary.write_bytes(b'8BPS\x00\x01 controlled fake COM boundary')
        Image.new('RGB',(8,6),'red').save(preview)
        def digest(p):return dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),byte_size=p.stat().st_size)
        return dict(status='NATIVE_READBACK',job_id=job['jobId'],host_version='26.7.0',bridge_sha256='b'*64,
            job_sha256=hashlib.sha256(json.dumps(job,sort_keys=True,ensure_ascii=True,separators=(',',':')).encode()).hexdigest(),
            inputs={str(self.run/'input.png'):digest(self.run/'input.png')},artifacts={'psd':digest(primary),'png':digest(preview)},
            documents_before=0,documents_after=0)

    def test_restart_reuses_one_native_execution_and_published_version(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=self.native) as invoke:
            first=self.execute();self.service=ProjectService(self.root);second=self.execute()
        self.assertEqual(invoke.call_count,1)
        self.assertEqual(first['asset'],second['asset'])
        self.assertEqual(second['attempt']['state'],'RECEIPTED')
        published=Path(second['asset']['path']);self.assertTrue(published.is_relative_to(self.service.paths.projects_root))
        self.assertEqual(published.read_bytes(),(self.run/'output.psd').read_bytes())

    def test_different_request_same_key_rejected_without_dispatch(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=self.native) as invoke:
            self.execute();changed=dict(self.job);changed['width']=9
            with self.assertRaises(module.NativeTaskError):self.execute(job=changed)
        self.assertEqual(invoke.call_count,1)

    def test_timeout_persists_host_guard_across_restart_and_projects(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=PhotoshopDispatchError('timeout',outcome_unknown=True)):
            with self.assertRaises(module.NativeTaskError) as caught:self.execute()
        self.assertEqual(caught.exception.attempt['state'],'OUTCOME_UNKNOWN')
        self.service=ProjectService(self.root);self.project=self.service.create_project('Other')['id']
        with patch.object(module,'_dispatch') as invoke:
            with self.assertRaisesRegex(module.NativeTaskError,'HOST_BUSY'):self.execute('other-key')
            invoke.assert_not_called()

    def test_preflight_rejection_releases_host_without_auto_retry(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=PhotoshopDispatchError('invalid')):
            with self.assertRaises(module.NativeTaskError) as caught:self.execute()
        self.assertEqual(caught.exception.attempt['state'],'FAILED')
        with patch.object(module,'_dispatch',side_effect=self.native) as invoke:
            unchanged=self.execute();good=self.execute('new-key')
        self.assertEqual(unchanged['attempt']['state'],'FAILED')
        self.assertEqual(good['attempt']['state'],'RECEIPTED');self.assertEqual(invoke.call_count,1)

    def test_concurrent_workers_do_not_double_dispatch(self):
        module=self.module();entered=threading.Event();release=threading.Event();results=[]
        def slow(*args,**kwargs):
            entered.set()
            if not release.wait(10):raise RuntimeError('test release timeout')
            return self.native(*args,**kwargs)
        def worker():
            try:results.append(self.execute())
            except BaseException as e:results.append(e)
        with patch.object(module,'_dispatch',side_effect=slow) as invoke:
            thread=threading.Thread(target=worker);thread.start()
            try:
                self.assertTrue(entered.wait(10));second=self.execute()
                self.assertEqual(second['attempt']['state'],'RUNNING')
                with self.assertRaisesRegex(module.NativeTaskError,'HOST_BUSY'):self.execute('second-key')
            finally:release.set();thread.join(10)
        self.assertFalse(thread.is_alive());self.assertEqual(invoke.call_count,1)
        self.assertEqual(results[0]['attempt']['state'],'RECEIPTED')

    def test_bad_receipt_retains_unresolved_guard(self):
        module=self.module()
        def wrong(*args,**kwargs):
            receipt=self.native(*args,**kwargs);receipt['job_sha256']='0'*64;return receipt
        with patch.object(module,'_dispatch',side_effect=wrong):
            with self.assertRaises(module.NativeTaskError) as caught:self.execute()
        self.assertEqual(caught.exception.attempt['state'],'OUTCOME_UNKNOWN')
        with closing(job_store.connect(self.service.database,project_root=self.root)) as conn:
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM asset_version').fetchone()[0],0)
        with patch.object(module,'_dispatch') as invoke:
            self.assertEqual(self.execute()['attempt']['state'],'OUTCOME_UNKNOWN');invoke.assert_not_called()

    def test_publication_failure_does_not_redispatch_or_release_guard(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=self.native),patch.object(module.assets,'publish_version',side_effect=OSError('test disk failure')):
            with self.assertRaises(module.NativeTaskError) as caught:self.execute()
        self.assertEqual(caught.exception.attempt['state'],'OUTCOME_UNKNOWN')
        self.assertTrue((self.run/'output.psd').exists())
        with patch.object(module,'_dispatch') as invoke:
            with self.assertRaisesRegex(module.NativeTaskError,'HOST_BUSY'):self.execute('other')
            invoke.assert_not_called()

    def test_pre_dispatch_cancel_is_not_sent_to_host(self):
        module=self.module()
        # First unresolved job occupies host; second remains PENDING.
        with patch.object(module,'_dispatch',side_effect=PhotoshopDispatchError('timeout',outcome_unknown=True)):
            with self.assertRaises(module.NativeTaskError):self.execute()
        with self.assertRaises(module.NativeTaskError) as busy:self.execute('pending')
        aid=busy.exception.attempt['attempt_id']
        with closing(job_store.connect(self.service.database,project_root=self.root)) as conn:job_store.request_cancel(conn,aid)
        with patch.object(module,'_dispatch') as invoke:
            self.assertEqual(self.execute('pending')['attempt']['state'],'CANCELLED');invoke.assert_not_called()

    def test_proven_preflight_failure_allows_explicit_next_attempt(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=PhotoshopDispatchError('preflight')):
            with self.assertRaises(module.NativeTaskError) as failure:self.execute()
        old=failure.exception.attempt
        with closing(job_store.connect(self.service.database,project_root=self.root)) as conn:
            job_store.retry_attempt(conn,old['job_id'],previous_attempt_id=old['attempt_id'])
        with patch.object(module,'_dispatch',side_effect=self.native):result=self.execute()
        self.assertEqual(result['attempt']['attempt_no'],2);self.assertEqual(result['attempt']['state'],'RECEIPTED')

    def test_changed_input_same_key_is_conflict_even_when_path_unchanged(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=self.native):self.execute()
        Image.new('RGB',(8,6),'green').save(self.run/'input.png')
        with patch.object(module,'_dispatch') as invoke:
            with self.assertRaisesRegex(module.NativeTaskError,'IDEMPOTENCY_CONFLICT'):self.execute()
            invoke.assert_not_called()

    def test_missing_scoped_authorization_never_dispatches(self):
        module=self.module();self.authorization={}
        with patch.object(module,'_dispatch') as invoke:
            with self.assertRaisesRegex(module.NativeTaskError,'REQUEST_REJECTED'):self.execute()
            invoke.assert_not_called()

    def test_published_bytes_tampered_replay_does_not_return_success(self):
        module=self.module()
        with patch.object(module,'_dispatch',side_effect=self.native):result=self.execute()
        Path(result['asset']['path']).write_bytes(b'tampered')
        with patch.object(module,'_dispatch') as invoke:
            with self.assertRaises(module.NativeTaskError):self.execute()
            invoke.assert_not_called()
