# SPDX-License-Identifier: MIT
"""Real preflight/filesystem with only native COM dispatch doubled."""
import hashlib
import importlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'src'))


class PhotoshopComAdapterTests(unittest.TestCase):
    def setUp(self):
        parent=ROOT/'.project-local/task-runtime/photoshop-com-tests';parent.mkdir(parents=True,exist_ok=True)
        temp=tempfile.TemporaryDirectory(dir=parent);self.addCleanup(temp.cleanup)
        self.root=Path(temp.name);(self.root/'AGENTS.md').write_text('# synthetic owner',encoding='utf-8')
        environment=patch.dict(os.environ,{'PROJECT_LOCAL_ROOT':str(self.root/'.project-local')})
        environment.start();self.addCleanup(environment.stop)
        self.run=self.root/'.project-local/task-artifacts/run';self.run.mkdir(parents=True)
        Image.new('RGB',(8,6),'blue').save(self.run/'input.png')
        self.job=dict(schemaVersion='design-lab/photoshop-native-job/v1',jobId='ps-test',runRoot=str(self.run),
            width=8,height=6,outputName='output.psd',previewName='output.png',
            assets=[dict(id='input',path=str(self.run/'input.png'))],
            layers=[dict(id='image',kind='raster',assetId='input',position=[0,0],width=8,height=6)])

    def adapter(self):
        self.assertIsNotNone(importlib.util.find_spec('design_lab.adapters.photoshop_com'),'product adapter missing')
        return importlib.import_module('design_lab.adapters.photoshop_com')

    def receipt(self):
        sha=hashlib.sha256(json.dumps(self.job,ensure_ascii=True,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
        return 'DL_PS_NATIVE_V1\t26.7.0\tps-test\t'+sha+'\t0\t0'

    def outputs(self,script,timeout):
        (self.run/'output.psd').write_bytes(b'8BPS\x00\x01'+b'\0'*6+b'\x00\x03'+(6).to_bytes(4,'big')+(8).to_bytes(4,'big')+b'\x00\x08\x00\x03')
        Image.new('RGB',(8,6),'red').save(self.run/'output.png')
        return self.receipt()

    def test_seals_bound_native_receipt_and_real_file_hashes(self):
        module=self.adapter()
        with patch.object(module,'_invoke_com',side_effect=self.outputs):
            result=module.execute(self.job,project_root=self.root,approved_root=self.run)
        self.assertEqual(result['status'],'NATIVE_READBACK')
        self.assertEqual(result['host_version'],'26.7.0')
        self.assertEqual(result['artifacts']['psd']['sha256'],hashlib.sha256((self.run/'output.psd').read_bytes()).hexdigest())
        self.assertEqual(result['job_sha256'],self.receipt().split('\t')[3])

    def test_bad_paths_existing_outputs_and_invalid_dimensions_never_dispatch(self):
        module=self.adapter()
        for key,value in [('outputName','../escape.psd'),('previewName','x.psd'),('width',True),('width',0),('height',float('nan')),
                          ('width',16384),('runRoot',str(self.root))]:
            bad=dict(self.job);bad[key]=value
            with self.subTest(key=key,value=value),patch.object(module,'_invoke_com') as invoke:
                with self.assertRaises(module.PhotoshopDispatchError) as caught:module.execute(bad,project_root=self.root,approved_root=self.run)
                self.assertFalse(caught.exception.outcome_unknown);invoke.assert_not_called()
        (self.run/'output.psd').write_bytes(b'preserve')
        with patch.object(module,'_invoke_com') as invoke:
            with self.assertRaises(module.PhotoshopDispatchError):module.execute(self.job,project_root=self.root,approved_root=self.run)
            invoke.assert_not_called()
        self.assertEqual((self.run/'output.psd').read_bytes(),b'preserve')

    def test_nonimage_and_outside_assets_never_dispatch(self):
        module=self.adapter();(self.run/'input.png').write_bytes(b'not an image')
        for path in (str(self.run/'input.png'),str(self.root/'private.png')):
            self.job['assets'][0]['path']=path
            with patch.object(module,'_invoke_com') as invoke:
                with self.assertRaises(module.PhotoshopDispatchError) as caught:module.execute(self.job,project_root=self.root,approved_root=self.run)
                self.assertFalse(caught.exception.outcome_unknown);invoke.assert_not_called()

    def test_timeout_wrong_binding_and_missing_artifacts_are_unknown(self):
        module=self.adapter()
        for reply in (TimeoutError('test'),self.receipt().replace('ps-test','other'),self.receipt()):
            with patch.object(module,'_invoke_com',**({'side_effect':reply} if isinstance(reply,Exception) else {'return_value':reply})):
                with self.assertRaises(module.PhotoshopDispatchError) as caught:module.execute(self.job,project_root=self.root,approved_root=self.run)
                self.assertTrue(caught.exception.outcome_unknown)

    def test_modified_input_cannot_be_sealed_as_success(self):
        module=self.adapter()
        def changed(script,timeout):
            reply=self.outputs(script,timeout);(self.run/'input.png').write_bytes(b'mutated');return reply
        with patch.object(module,'_invoke_com',side_effect=changed):
            with self.assertRaises(module.PhotoshopDispatchError) as caught:module.execute(self.job,project_root=self.root,approved_root=self.run)
            self.assertTrue(caught.exception.outcome_unknown)

    def test_wrong_native_header_or_preview_dimensions_are_unknown(self):
        module=self.adapter()
        for kind in ('psd','png'):
            for name in ('output.psd','output.png'):
                path=self.run/name
                if path.exists():path.unlink()
            def corrupted(script,timeout):
                reply=self.outputs(script,timeout)
                if kind=='psd':(self.run/'output.psd').write_bytes(b'not psd')
                else:Image.new('RGB',(7,6),'red').save(self.run/'output.png')
                return reply
            with patch.object(module,'_invoke_com',side_effect=corrupted):
                with self.assertRaises(module.PhotoshopDispatchError) as caught:module.execute(self.job,project_root=self.root,approved_root=self.run)
                self.assertTrue(caught.exception.outcome_unknown)
