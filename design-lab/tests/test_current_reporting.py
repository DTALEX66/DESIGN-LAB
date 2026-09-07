# SPDX-License-Identifier: MIT
"""R3-01: projections must prove freshness and keep evidence axes separate."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import subprocess

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src'))


class CurrentReportingTests(unittest.TestCase):
    def setUp(self):
        from design_lab.governance import reporting
        self.reporting = reporting
        runtime = ROOT / '.project-local/task-runtime/r3-reporting-tests'
        runtime.mkdir(parents=True, exist_ok=True)
        temp = tempfile.TemporaryDirectory(dir=runtime)
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.write('AGENTS.md', '# isolated report project')
        env_patch = patch.dict(self.reporting.os.environ, {'PROJECT_LOCAL_ROOT':str(self.root/'.project-local')})
        env_patch.start()
        self.addCleanup(env_patch.stop)
        self.ledger = json.loads((ROOT / 'design-lab/config/task-ledger-r3.json').read_text(encoding='utf-8'))
        self.ledger['evidence'] = []
        for task in self.ledger['tasks']:
            for axis in task['axes'].values():
                axis.update(state='NOT_EXECUTED', evidence=[])
        self.write('design-lab/schemas/task-ledger-r3.schema.json', (ROOT/'design-lab/schemas/task-ledger-r3.schema.json').read_text())
        self.write(self.ledger['plan_path'], '# fixture plan')
        self.write('docs/history/taskpacks/r3-tasks-2026-09-06.json', (ROOT/'docs/history/taskpacks/r3-tasks-2026-09-06.json').read_text(encoding='utf-8'))
        self.write('src/logic.py', 'fixture = 1\n')
        self.write('.project-local/task-artifacts/test.log', 'controlled fixture passed\n')
        self.sha = 'a' * 40

    def write(self, rel, content):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8', newline='\n')

    def evidence(self, kind='local_test'):
        def digest(rel):
            return hashlib.sha256((self.root/rel).read_bytes()).hexdigest()
        receipt = dict(id='verified', kind=kind, outcome='PASS', subject_sha=self.sha,
                       task_ids=['R3-01', 'R3-02', 'R3-05'],
                       binding='WORKTREE_FILES', observed_at='2026-09-06T01:00:00Z', software={'python':'fixture'},
                       subject_files={'src/logic.py': digest('src/logic.py')},
                       artifacts=[{'path':'.project-local/task-artifacts/test.log','sha256':digest('.project-local/task-artifacts/test.log')}], note='test fixture')
        self.ledger['evidence'] = [receipt]
        return receipt

    def qualify(self, task_id='R3-01', **axes):
        task = next(t for t in self.ledger['tasks'] if t['id'] == task_id)
        for name, state in (axes or dict(implementation='IMPLEMENTED_LOCAL', unit='PASS')).items():
            task['axes'][name] = {'state':state, 'evidence':['verified']}

    def project(self):
        return self.reporting.project_ledger(self.root, self.ledger, self.sha)

    def row(self, tid='R3-01'):
        return next(t for t in self.project()['tasks'] if t['id']==tid)

    def test_valid_local_test_qualifies_only_required_local_axes(self):
        self.evidence()
        self.qualify()
        row = self.row()
        self.assertEqual(row['status'], 'DONE_LOCAL')
        self.assertEqual(row['axes']['host_live']['state'], 'NOT_EXECUTED')
        self.assertEqual(row['axes']['delivery']['state'], 'NOT_EXECUTED')

    def test_source_mutation_invalidates_prior_pass(self):
        self.evidence()
        self.qualify()
        self.write('src/logic.py', 'fixture = 2\n')
        row = self.row()
        self.assertEqual(row['axes']['unit']['state'], 'UNVERIFIED')
        self.assertNotEqual(row['status'], 'DONE_LOCAL')

    def test_evidence_for_another_task_cannot_qualify_this_task(self):
        receipt = self.evidence()
        receipt['task_ids'] = ['R3-05']
        self.qualify()
        self.assertEqual(self.row()['axes']['unit']['state'], 'UNVERIFIED')

    def test_rewritten_frozen_source_cannot_be_rebound_by_ledger(self):
        path = 'docs/history/taskpacks/r3-tasks-2026-09-06.json'
        original = json.loads((self.root/path).read_text(encoding='utf-8'))
        original['tasks'][0]['acceptance'] = ['weaker acceptance']
        self.ledger['tasks'][0]['acceptance'] = ['weaker acceptance']
        self.write(path, json.dumps(original))
        self.ledger['source']['tasks_sha256'] = hashlib.sha256((self.root/path).read_bytes()).hexdigest()
        with self.assertRaises(ValueError):
            self.project()

    def test_missing_artifact_does_not_reuse_declared_pass(self):
        receipt = self.evidence()
        receipt['artifacts'][0]['path'] = '.project-local/task-artifacts/missing.log'
        self.qualify()
        self.assertEqual(self.row()['axes']['unit']['state'], 'UNVERIFIED')

    def test_wrong_subject_commit_is_stale(self):
        receipt = self.evidence()
        receipt['subject_sha'] = 'b'*40
        self.qualify()
        self.assertNotEqual(self.row()['status'], 'DONE_LOCAL')

    def test_local_test_cannot_promote_host_or_delivery(self):
        self.evidence()
        self.qualify('R3-02', implementation='IMPLEMENTED_LOCAL', unit='PASS', host_live='PASS', delivery='PASS')
        row = self.row('R3-02')
        self.assertEqual(row['axes']['host_live']['state'], 'UNVERIFIED')
        self.assertEqual(row['axes']['delivery']['state'], 'UNVERIFIED')

    def test_done_axes_still_require_dependencies(self):
        self.evidence()
        self.qualify('R3-05')
        self.assertEqual(self.row('R3-05')['status'], 'PARTIAL')
        self.assertEqual(self.row('R3-05')['unmet_dependencies'], ['R3-01'])

    def test_missing_axes_is_rejected(self):
        del self.ledger['tasks'][0]['axes']['delivery']
        with self.assertRaises(ValueError):
            self.project()

    def test_duplicate_ids_and_unknown_dependencies_rejected(self):
        original = copy.deepcopy(self.ledger)
        self.ledger['tasks'][1]['id'] = self.ledger['tasks'][0]['id']
        with self.assertRaises(ValueError):
            self.project()
        self.ledger = original
        self.ledger['tasks'][0]['depends_on'] = ['nonexistent']
        with self.assertRaises(ValueError):
            self.project()

    def test_cycle_is_rejected(self):
        self.ledger['tasks'][0]['depends_on'] = ['R3-02']
        with self.assertRaises(ValueError):
            self.project()

    def test_private_and_escaping_evidence_paths_rejected(self):
        receipt = self.evidence()
        for path in ('../outside', 'C:/outside', '.env', '.hermes/session.db', '.git/config'):
            receipt['subject_files'] = {path:'a'*64}
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.project()

    def test_workflow_receipt_qualifies_then_expires_when_workflow_changes(self):
        for suffix in ('yml', 'yaml'):
            with self.subTest(suffix=suffix):
                path = f'.github/workflows/check.{suffix}'
                self.write(path, 'on: [push, pull_request]\n')
                receipt = self.evidence()
                receipt['subject_files'] = {
                    path: hashlib.sha256((self.root/path).read_bytes()).hexdigest()
                }
                self.qualify()
                self.assertEqual(self.row()['axes']['unit']['state'], 'PASS')
                self.write(path, 'on: [push]\n')
                self.assertEqual(self.row()['axes']['unit']['state'], 'UNVERIFIED')

    def test_workflow_exception_does_not_allow_other_github_or_private_paths(self):
        receipt = self.evidence()
        for path in ('.github/config.yml', '.github/workflows/auth.json',
                     '.github/workflows/.env.yml', '.github/workflows/run.py',
                     '.github/workflows/nested/check.yml',
                     '.github/workflows/../config.yml'):
            receipt['subject_files'] = {path: 'a'*64}
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.project()

    def test_unknown_evidence_id_is_rejected(self):
        self.qualify()
        with self.assertRaises(ValueError):
            self.project()

    def test_projection_keeps_actual_observation_time(self):
        self.evidence()
        self.qualify()
        self.assertEqual(self.project()['evidence'][0]['observed_at'], '2026-09-06T01:00:00Z')

    def test_project_owned_custom_evidence_root_remains_readable_after_root_switch(self):
        receipt = self.evidence()
        relative = '.project-local/previous/task-artifacts/test.log'
        self.write(relative, 'controlled fixture passed\n')
        receipt['artifacts'][0]['path'] = relative
        self.qualify()
        with patch.dict(self.reporting.os.environ, {'PROJECT_LOCAL_ROOT':str(self.root/'.project-local/next')}):
            self.assertEqual(self.row()['axes']['unit']['state'], 'PASS')

    def test_report_index_covers_generated_project_status_and_detects_tamper(self):
        self.write('design-lab/config/task-ledger-r3.json', json.dumps(self.ledger))
        snapshot = {'sha':self.sha, 'branch':'fixture', 'origin_main':self.sha, 'source_worktree_clean':True, 'tracked_files':0}
        self.reporting.generate(self.root, snapshot=snapshot, generated_at='2026-09-06T02:00:00Z')
        index = json.loads((self.root/'design-lab/config/current-report-index.json').read_text())
        for name in ('PROJECT_STATUS.json','PROJECT_STATUS.md','TASK_PROGRESS.json'):
            self.assertIn(name, index['reports'])
            self.assertTrue((self.root/'reports/current'/name).is_file())
        self.assertEqual(self.reporting.generate(self.root, check=True, snapshot=snapshot), [])
        self.write('reports/current/PROJECT_STATUS.md', 'manual stale content')
        failures = self.reporting.generate(self.root, check=True, snapshot=snapshot)
        self.assertIn('reports/current/PROJECT_STATUS.md', failures)
        self.assertEqual((self.root/'reports/current/PROJECT_STATUS.md').read_text(), 'manual stale content')

    def test_check_missing_output_is_read_only(self):
        self.write('design-lab/config/task-ledger-r3.json', json.dumps(self.ledger))
        self.assertTrue(self.reporting.generate(self.root, check=True, snapshot={'sha':self.sha}))
        self.assertFalse((self.root/'reports/current').exists())

    def test_report_staging_uses_selected_root(self):
        self.write('design-lab/config/task-ledger-r3.json', json.dumps(self.ledger))
        selected = self.root/'.project-local/selected'
        snapshot = {'sha':self.sha, 'branch':'fixture', 'origin_main':self.sha, 'source_worktree_clean':True, 'tracked_files':0}
        with patch.dict(self.reporting.os.environ, {'PROJECT_LOCAL_ROOT':str(selected)}):
            self.reporting.generate(self.root, snapshot=snapshot)
        self.assertTrue((selected/'task-runtime/current-reports').is_dir())
        self.assertFalse((self.root/'.project-local/task-runtime/current-reports').exists())

    def test_host_requirement_cannot_be_removed_from_task(self):
        self.ledger['tasks'][1]['required_axes'] = ['implementation', 'unit']
        with self.assertRaises(ValueError):
            self.project()

    def test_implementation_state_cannot_be_used_for_unit_axis(self):
        self.evidence()
        self.qualify(unit='IMPLEMENTED_LOCAL')
        with self.assertRaises(ValueError):
            self.project()

    def test_acceptance_text_must_match_frozen_task_definition(self):
        self.ledger['tasks'][0]['acceptance'] = ['easier replacement requirement']
        with self.assertRaises(ValueError):
            self.project()

    def test_git_porcelain_leading_space_is_preserved(self):
        result = subprocess.CompletedProcess(['git'], 0, b' M reports/current/PROJECT_STATUS.json\0', b'')
        with patch.object(self.reporting.subprocess, 'run', return_value=result):
            self.assertTrue(self.reporting._git(self.root, 'status').startswith(' M '))


if __name__ == '__main__':
    unittest.main()
