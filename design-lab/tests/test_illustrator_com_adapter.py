# SPDX-License-Identifier: MIT
"""Adapter decisions with COM boundary doubled; native qualification is separate."""
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'src'))


class IllustratorComAdapterTests(unittest.TestCase):
    def setUp(self):
        parent=ROOT/'.project-local/task-runtime/illustrator-com-tests';parent.mkdir(parents=True,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=parent);self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);(self.root/'AGENTS.md').write_text('# synthetic owner',encoding='utf-8')
        self.run=self.root/'.project-local/task-artifacts/run';self.run.mkdir(parents=True)
        self.job=dict(schemaVersion='design-lab/adobe-host-job/v1',jobId='com-test',rirHash='a'*64,
            runRoot=str(self.run),artboard=dict(width=8,height=6),layers=[dict(id='layer',items=[dict(id='box',kind='path',
                points=[dict(anchor=[0,0],left=[0,0],right=[0,0]),dict(anchor=[8,6],left=[8,6],right=[8,6])],closed=False,color=[255,0,0])])],assets=[],
            targets={k:str(self.run/('output.'+k)) for k in ('ai','png','svg')},
            operations=['createDocument','createLayer','placePath','placeText','placeRaster','applyMask',
                'saveAI','exportSVG','reopen','readback','exportPNG'],authorization=dict(required=True,scope='single-session'))

    def adapter(self):
        import design_lab.adapters.illustrator_com as module
        return module

    def outputs(self,script,timeout):
        # Only external COM boundary is doubled; filesystem sealing is real.
        (self.run/'output.ai').write_bytes(b'%PDF-1.5\nsynthetic test, not native proof')
        (self.run/'output.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>',encoding='utf-8')
        Image.new('RGB',(8,6),'red').save(self.run/'output.png')
        return 'DL_NATIVE_V1\t29.5.1\tcom-test\t'+'a'*64+'\t0\t0'

    def test_adapter_available_and_seals_real_outputs(self):
        """Missing adapter or accepting an unbound acknowledgement must fail."""
        import importlib.util
        self.assertIsNotNone(importlib.util.find_spec('design_lab.adapters.illustrator_com'))
        module=self.adapter()
        with patch.object(module,'_invoke_com',side_effect=self.outputs):
            result=module.execute(self.job,project_root=self.root,approved_root=self.run)
        self.assertEqual(result['status'],'NATIVE_READBACK')
        self.assertEqual(result['host_version'],'29.5.1')
        self.assertEqual(result['artifacts']['ai']['sha256'],hashlib.sha256((self.run/'output.ai').read_bytes()).hexdigest())
        self.assertEqual(result['job_sha256'],hashlib.sha256(json.dumps(self.job,ensure_ascii=True,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest())

    def test_escape_or_existing_output_never_dispatches(self):
        module=self.adapter()
        for target in (self.root/'outside.ai',self.run/'..'/'escape.ai'):
            self.job['targets']['ai']=str(target)
            with patch.object(module,'_invoke_com') as invoke:
                with self.assertRaises(module.IllustratorDispatchError):module.execute(self.job,project_root=self.root,approved_root=self.run)
                invoke.assert_not_called()
        self.job['targets']['ai']=str(self.run/'output.ai');(self.run/'output.ai').write_bytes(b'preserve')
        with patch.object(module,'_invoke_com') as invoke:
            with self.assertRaises(module.IllustratorDispatchError):module.execute(self.job,project_root=self.root,approved_root=self.run)
            invoke.assert_not_called()
        self.assertEqual((self.run/'output.ai').read_bytes(),b'preserve')

    def test_timeout_and_wrong_receipt_do_not_report_success(self):
        module=self.adapter()
        for outcome in (TimeoutError('COM did not return'),'DL_NATIVE_V1\t29.5.1\tanother-job\t'+'a'*64+'\t0\t0'):
            with patch.object(module,'_invoke_com',**({'side_effect':outcome} if isinstance(outcome,Exception) else {'return_value':outcome})):
                with self.assertRaises(module.IllustratorDispatchError) as caught:
                    module.execute(self.job,project_root=self.root,approved_root=self.run)
                self.assertTrue(caught.exception.outcome_unknown)

    def test_missing_output_and_changed_input_are_unknown(self):
        module=self.adapter()
        with patch.object(module,'_invoke_com',return_value='DL_NATIVE_V1\t29.5.1\tcom-test\t'+'a'*64+'\t0\t0'):
            with self.assertRaises(module.IllustratorDispatchError) as caught:
                module.execute(self.job,project_root=self.root,approved_root=self.run)
            self.assertTrue(caught.exception.outcome_unknown)
        Image.new('RGB',(8,6),'blue').save(self.run/'input.png')
        self.job['assets']=[dict(id='image',path=str(self.run/'input.png'))]
        def changed(script,timeout):
            result=self.outputs(script,timeout);(self.run/'input.png').write_bytes(b'changed');return result
        with patch.object(module,'_invoke_com',side_effect=changed):
            with self.assertRaises(module.IllustratorDispatchError) as caught:
                module.execute(self.job,project_root=self.root,approved_root=self.run)
            self.assertTrue(caught.exception.outcome_unknown)

    def test_malformed_job_fails_before_com_and_retains_existing_files(self):
        module=self.adapter()
        self.job['rirHash']='0'*64
        with patch.object(module,'_invoke_com') as invoke:
            with self.assertRaises(module.IllustratorDispatchError) as caught:
                module.execute(self.job,project_root=self.root,approved_root=self.run)
            self.assertFalse(caught.exception.outcome_unknown)
            invoke.assert_not_called()
