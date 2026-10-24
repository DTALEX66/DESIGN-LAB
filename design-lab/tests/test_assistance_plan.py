# SPDX-License-Identifier: MIT
"""DL-KB-07: the assistance plan store -- revisions, pinned references, and four honest states.

What this suite is for. A plan is the object a short task can be written into without building a
complete project first, and the ways it can start lying are specific:

* **a saved plan quietly claims more than storage.** "saved", "provided", "chosen" and "externally
  verified" are four different facts. A plan with an objective and no creative is saved and not
  provided; a named human choosing a revision is the only way "chosen" turns true; nothing in this
  repository dispatches an external step, so "externally verified" is a constant false that only a
  contract change can move.
* **a registered link is read as analysis.** Citing an image is not analysing it. The readback must
  say LINKED_ONLY until a stored reversal for that exact asset digest exists -- and the same test
  then performs the reversal and requires ANALYZED, so LINKED_ONLY is a measurement rather than a
  constant.
* **a reference silently follows its object.** A plan pins the revision and digest it used. When
  the object moves on, the readback says CHANGED instead of presenting the new bytes as the old
  basis.
* **an agent's choice is filed as a person's.** The route refuses `actor_kind: agent`, and the
  storage CHECK refuses it again, so the rule survives an application bug.
* **a correction overwrites its parent.** Revisions are append-only, "current" is MAX(revision),
  and a write prepared against a stale revision is refused with the actual number.
* **a caller mints its own evidence.** Reference revision/digest are resolved from the live object;
  a request that supplies them is refused. A missing job_id is the literal UNUSED, never an id the
  service invented.

Nothing here proves a model ran, an external job executed, or an asset was analysed by a model: the
counts are rows in a local store, and the one analysis this suite records is a reversal whose
observations the caller supplied.
"""
from __future__ import annotations

import base64
import hashlib
import http.client
import io
import json
import os
import secrets
import sqlite3
import sys
import tempfile
import threading
import unittest
from contextlib import closing
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'src'))

from design_lab import assistance_plan                              # noqa: E402
from design_lab.assistance_plan import (                            # noqa: E402
    AssistancePlanError, UNKNOWN, UNUSED)
from design_lab.http_service import make_server                     # noqa: E402
from design_lab.service import ProjectService                       # noqa: E402

DETECTIONS = [
    {'text': 'PROMPT', 'confidence': 0.91, 'polygon': [[1, 1], [4, 1], [4, 3], [1, 3]]},
    {'text': 'HOP', 'confidence': 0.57, 'polygon': [[1, 4], [4, 4], [4, 6], [1, 6]]},
]


def _png_bytes() -> bytes:
    from PIL import Image

    stream = io.BytesIO()
    Image.new('RGB', (8, 6), 'white').save(stream, format='PNG')
    return stream.getvalue()


def plan_body(**overrides):
    body = {
        'objective': '为秋季新品做一张克制的主视觉海报',
        'output_type': 'IMAGE',
        'neutral_creative': '一束侧光穿过纸纤维，留出大面积空白承载标题。',
        'brand_constraints': ['只用两种油墨'],
        'role_constraints': [],
        'lens': None,
        'sound': None,
        'references': [],
        'external_steps': [],
        'known_gaps': ['目标纸张未定'],
        'limits': ['未包含多语言排版'],
        'created_by': 'owner',
    }
    body.update(overrides)
    return body


class AssistancePlanTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop('PROJECT_LOCAL_ROOT', None)
        self.base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        self.root = self.base / 'project'
        self.root.mkdir()
        (self.root / 'AGENTS.md').write_text('# assistance plan fixture', encoding='utf-8')
        self.token = secrets.token_hex(32)
        self._serve(ProjectService(self.root))
        self.project = self.service.create_project('Assistance Plan')['id']

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)

    def _serve(self, service):
        self.service = service
        self.httpd = make_server(service, self.token, 0)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def _restart(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)
        self._serve(ProjectService(self.root))

    def _call(self, method, path, body=None):
        headers = {'Authorization': 'Bearer ' + self.token}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        with closing(http.client.HTTPConnection('127.0.0.1', self.httpd.server_port,
                                                timeout=20)) as conn:
            conn.request(method, path, body=None if body is None else json.dumps(body),
                         headers=headers)
            response = conn.getresponse()
            raw = response.read()
            return response.status, (json.loads(raw) if raw else None)

    def _create(self, project=None, **overrides):
        status, body = self._call(
            'POST', f'/api/projects/{project or self.project}/assistance-plans',
            plan_body(**overrides))
        self.assertEqual(status, 201, body)
        return body['plan']

    def _import_asset(self, project=None, key='asset-1'):
        status, body = self._call(
            'POST', f'/api/projects/{project or self.project}/assets',
            {'content_base64': base64.b64encode(_png_bytes()).decode(),
             'idempotency_key': key})
        self.assertEqual(status, 201, body)
        return body['asset']

    # -- B1: a plan, its basis, its limits; saved and read back after a restart -------

    def test_a_plan_is_saved_with_its_basis_and_reads_back_after_a_restart(self):
        created = self._create(
            external_steps=[{'step': '手动导出印刷 PDF', 'tool': 'Illustrator',
                             'job_id': None, 'operation_id': 'op-1024'}],
            known_gaps=['目标纸张未定'], limits=['未包含多语言排版'])
        detail = self._call('GET',
                            f'/api/projects/{self.project}/assistance-plans/'
                            f'{created["plan_id"]}')[1]
        self.assertEqual(1, detail['latest_revision'])
        self.assertEqual(created, detail['current'],
                         'the readback rebuilt a different document from the one the write answered')
        self.assertEqual(created['content_sha256'],
                         assistance_plan._content_digest(created),
                         'the stored digest does not cover the bytes it claims to')
        self.assertEqual(['目标纸张未定'], detail['current']['known_gaps'])
        self.assertEqual(['未包含多语言排版'], detail['current']['limits'])
        self.assertEqual([{'step': '手动导出印刷 PDF', 'tool': 'Illustrator',
                           'job_id': UNUSED, 'operation_id': 'op-1024'}],
                         detail['current']['external_steps'],
                         'an absent job_id must be stored as the literal UNUSED, never omitted')
        self.assertFalse(detail['external']['verified'])
        self.assertEqual(['op-1024'], detail['external']['supplied_ids'])
        self.assertTrue(detail['states']['saved'])
        self.assertTrue(detail['states']['provided'])
        self.assertFalse(detail['states']['chosen'])
        self.assertFalse(detail['states']['externally_verified'])
        self.assertTrue(detail['current']['claims_not_made'])

        self._restart()
        again = self._call('GET', f'/api/projects/{self.project}/assistance-plans/'
                                  f'{created["plan_id"]}')
        self.assertEqual(200, again[0], again[1])
        self.assertEqual(created, again[1]['current'],
                         'the plan did not survive a restart byte for byte')
        listed = self._call('GET', f'/api/projects/{self.project}/assistance-plans')[1]
        self.assertEqual(1, listed['total'])
        self.assertEqual(created['plan_id'], listed['plans'][0]['plan_id'])
        self.assertEqual(0, listed['plans'][0]['reference_count'])

    def test_a_draft_without_a_creative_is_saved_but_not_provided(self):
        created = self._create(neutral_creative=None)
        self.assertEqual(UNKNOWN, created['neutral_creative'])
        detail = self._call('GET', f'/api/projects/{self.project}/assistance-plans/'
                                   f'{created["plan_id"]}')[1]
        self.assertTrue(detail['states']['saved'])
        self.assertFalse(detail['states']['provided'],
                         'a plan with no creative must not read as provided just because it saved')

    # -- revisions --------------------------------------------------------------------

    def test_a_stale_revision_is_refused_with_the_actual_number(self):
        created = self._create()
        status, body = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans/'
                    f'{created["plan_id"]}/revisions',
            plan_body(expected_revision=1, objective='第二版'))
        self.assertEqual(201, status, body)
        self.assertEqual(2, body['revision'])
        status, refused = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans/'
                    f'{created["plan_id"]}/revisions',
            plan_body(expected_revision=1, objective='第三版'))
        self.assertEqual(409, status)
        self.assertEqual('ASSISTANCE_PLAN_REVISION_CONFLICT', refused['error'])
        self.assertIn('revision 2', refused['detail'])
        detail = self._call('GET', f'/api/projects/{self.project}/assistance-plans/'
                                   f'{created["plan_id"]}')[1]
        self.assertEqual([1, 2], [row['revision'] for row in detail['revisions']],
                         'a refused write left a row behind')
        self.assertEqual('第二版', detail['current']['objective'])

    def test_a_plan_revision_without_expected_revision_is_refused(self):
        created = self._create()
        status, body = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans/'
                    f'{created["plan_id"]}/revisions', plan_body())
        self.assertEqual(400, status,
                         'the route requires expected_revision by exact key set, so this body '
                         'never reaches the store')
        self.assertEqual('INVALID_PROJECT_FIELDS', body['error'])
        # The store refuses the same shape for any other caller; the route's exact key set is a
        # first line, not the only one.
        with self.assertRaises(AssistancePlanError) as caught:
            assistance_plan.AssistancePlans(self.service).revise(
                self.project, created['plan_id'], plan_body())
        self.assertEqual('ASSISTANCE_PLAN_EXPECTED_REVISION_REQUIRED', caught.exception.code)

    def test_the_revision_table_refuses_its_own_rewrite(self):
        created = self._create()
        with closing(assistance_plan.connect(
                self.service.database, project_root=self.service.paths.project_root)) as conn:
            for statement in (
                    'UPDATE assistance_plan_revision SET objective = ? WHERE plan_id = ?',
                    'DELETE FROM assistance_plan_revision WHERE plan_id = ?'):
                args = (('rewritten', created['plan_id']) if statement.startswith('UPDATE')
                        else (created['plan_id'],))
                with self.assertRaises(sqlite3.IntegrityError):
                    conn.execute(statement, args)
            conn.rollback()

    # -- B6: a link is not an analysis ------------------------------------------------

    def test_a_linked_asset_is_reported_linked_only_until_a_reversal_exists(self):
        asset = self._import_asset()
        created = self._create(references=[{'kind': 'ASSET', 'id': asset['id']}])
        self.assertEqual(asset['id'], created['references'][0]['id'])
        self.assertEqual(asset['sha256'], created['references'][0]['sha256'],
                         'the pinned digest is not the digest the import route verified')
        detail = self._call('GET', f'/api/projects/{self.project}/assistance-plans/'
                                   f'{created["plan_id"]}')[1]
        status = detail['reference_status'][0]
        self.assertEqual('CURRENT', status['state'])
        self.assertEqual('LINKED_ONLY', status['analysis'],
                         'registering a link was reported as analysing the image')
        self.assertEqual({'analyzed': 0, 'linked_only': 1}, detail['analysis_summary'])

        status_code, reversal = self._call(
            'POST', f'/api/projects/{self.project}/assets/{asset["id"]}/prompt-reversal',
            {'module': 'ocr-fixture', 'detections': DETECTIONS, 'decomposition_id': None})
        self.assertEqual(201, status_code, reversal)
        detail = self._call('GET', f'/api/projects/{self.project}/assistance-plans/'
                                   f'{created["plan_id"]}')[1]
        self.assertEqual('ANALYZED', detail['reference_status'][0]['analysis'],
                         'a stored reversal for the exact asset digest must flip LINKED_ONLY; '
                         'otherwise the first assertion proves only a constant')
        self.assertEqual({'analyzed': 1, 'linked_only': 0}, detail['analysis_summary'])

    def test_a_reference_that_moved_on_is_reported_changed(self):
        asset = self._import_asset()
        created = self._create(references=[{'kind': 'ASSET', 'id': asset['id']}])
        other = 'sha256:' + hashlib.sha256(b'second version').hexdigest()
        with closing(assistance_plan.connect(
                self.service.database, project_root=self.service.paths.project_root)) as conn:
            conn.execute('INSERT INTO asset_version (version_id, asset_id, version_no,'
                         ' content_sha256, state, created_at) VALUES (?,?,?,?,?,?)',
                         ('v-' + secrets.token_hex(16), asset['id'], 2, other, 'ACTIVE',
                          '2026-10-24T00:00:00Z'))
            conn.commit()
        status = self._call('GET', f'/api/projects/{self.project}/assistance-plans/'
                                   f'{created["plan_id"]}')[1]['reference_status'][0]
        self.assertEqual('CHANGED', status['state'])
        self.assertEqual(1, status['recorded_revision'])
        self.assertEqual(asset['sha256'], status['recorded_sha256'])
        self.assertEqual(2, status['current_revision'])
        self.assertEqual(other, status['current_sha256'])

    def test_a_caller_supplied_revision_or_digest_is_refused(self):
        asset = self._import_asset()
        for extra in ({'sha256': asset['sha256']}, {'revision': 1}):
            status, body = self._call(
                'POST', f'/api/projects/{self.project}/assistance-plans',
                plan_body(references=[dict({'kind': 'ASSET', 'id': asset['id']}, **extra)]))
            self.assertEqual(400, status)
            self.assertEqual('ASSISTANCE_PLAN_REFERENCE_UNKNOWN_FIELD', body['error'])

    def test_a_reference_from_another_project_is_refused(self):
        other_project = self.service.create_project('Other')['id']
        foreign = self._import_asset(project=other_project, key='foreign-1')
        status, body = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans',
            plan_body(references=[{'kind': 'ASSET', 'id': foreign['id']}]))
        self.assertEqual(409, status)
        self.assertEqual('ASSISTANCE_PLAN_REFERENCE_PROJECT_MISMATCH', body['error'])

    def test_an_unstored_reference_is_a_404_not_a_saved_plan(self):
        status, body = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans',
            plan_body(references=[{'kind': 'ASSET', 'id': 'img-' + '0' * 64}]))
        self.assertEqual(404, status)
        self.assertEqual('ASSISTANCE_PLAN_REFERENCE_NOT_FOUND', body['error'])
        listed = self._call('GET', f'/api/projects/{self.project}/assistance-plans')[1]
        self.assertEqual(0, listed['total'], 'a refused create left a plan row behind')

    # -- choosing is a named human's record -------------------------------------------

    def test_only_a_named_human_can_choose_a_revision(self):
        created = self._create()
        status, body = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans/'
                    f'{created["plan_id"]}/choose',
            {'actor': 'agent-1', 'actor_kind': 'agent', 'revision': 1})
        self.assertEqual(409, status)
        self.assertEqual('ASSISTANCE_PLAN_CHOICE_NOT_HUMAN', body['error'])
        status, chosen = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans/'
                    f'{created["plan_id"]}/choose',
            {'actor': 'DTALEX66', 'actor_kind': 'human', 'revision': 1})
        self.assertEqual(200, status, chosen)
        self.assertEqual({'chosen': True, 'revision': 1, 'actor': 'DTALEX66',
                          'actor_kind': 'human',
                          'chosen_at': chosen['choice']['chosen_at'], 'is_latest': True},
                         chosen['choice'])
        self.assertTrue(chosen['states']['chosen'])
        with closing(assistance_plan.connect(
                self.service.database, project_root=self.service.paths.project_root)) as conn:
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute('INSERT INTO assistance_plan_choice (plan_id, revision, actor,'
                             ' actor_kind, chosen_at) VALUES (?,?,?,?,?)',
                             (created['plan_id'], 1, 'agent-2', 'agent', '2026-10-24T00:00:00Z'))
            conn.rollback()

    def test_choosing_a_revision_that_does_not_exist_is_refused(self):
        created = self._create()
        status, body = self._call(
            'POST', f'/api/projects/{self.project}/assistance-plans/'
                    f'{created["plan_id"]}/choose',
            {'actor': 'DTALEX66', 'actor_kind': 'human', 'revision': 3})
        self.assertEqual(400, status)
        self.assertEqual('ASSISTANCE_PLAN_CHOICE_REVISION_INVALID', body['error'])

    # -- the object's own refusals ----------------------------------------------------

    def test_the_output_type_vocabulary_is_served_before_any_project_exists(self):
        # DL-KB-08: the initial screen must offer an output type before a workspace exists. A
        # vocabulary that rides the project-scoped list route would be unavailable at exactly the
        # moment it is first needed, so this read is measured on a checkout with zero projects.
        empty = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime')) / 'empty'
        empty.mkdir()
        (empty / 'AGENTS.md').write_text('# empty checkout for the vocabulary read',
                                         encoding='utf-8')
        service = ProjectService(empty)
        httpd = make_server(service, self.token, 0)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            with closing(http.client.HTTPConnection('127.0.0.1', httpd.server_port,
                                                    timeout=20)) as conn:
                conn.request('GET', '/api/assistance-plan-output-types',
                             headers={'Authorization': 'Bearer ' + self.token})
                response = conn.getresponse()
                body = json.loads(response.read())
            self.assertEqual(200, response.status, body)
            self.assertEqual(0, len(service.list_projects()))
            self.assertEqual('design-lab/assistance-plan-output-types/v1', body['schemaVersion'])
            self.assertEqual(list(assistance_plan.OUTPUT_TYPES),
                             [row['value'] for row in body['output_types']],
                             'the screen would offer a different set than the routes accept')
            for row in body['output_types']:
                self.assertEqual(assistance_plan.OUTPUT_LABELS[row['value']], row['label'])
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join(timeout=5)

    def test_every_served_output_type_is_one_the_create_route_accepts(self):
        status, body = self._call('GET', '/api/assistance-plan-output-types')
        self.assertEqual(200, status, body)
        for row in body['output_types']:
            created = self._create(output_type=row['value'])
            self.assertEqual(row['value'], created['output_type'],
                             'the screen offered a word the create route stored as something else')

    def test_an_unknown_output_type_is_refused_by_name(self):
        status, body = self._call('POST', f'/api/projects/{self.project}/assistance-plans',
                                  plan_body(output_type='VIDEOGAME'))
        self.assertEqual(400, status)
        self.assertEqual('ASSISTANCE_PLAN_OUTPUT_TYPE_INVALID', body['error'])

    def test_a_plan_for_an_unknown_project_is_404(self):
        status, body = self._call('POST',
                                  f'/api/projects/{"0" * 32}/assistance-plans', plan_body())
        self.assertEqual(404, status)
        self.assertEqual('PROJECT_NOT_FOUND', body['error'])

    def test_a_plan_is_not_readable_through_another_project(self):
        created = self._create()
        other = self.service.create_project('Reader')['id']
        status, body = self._call('GET', f'/api/projects/{other}/assistance-plans/'
                                         f'{created["plan_id"]}')
        self.assertEqual(404, status)
        self.assertEqual('ASSISTANCE_PLAN_NOT_FOUND', body['error'])

    def test_the_schemas_are_packaged_and_named_by_state_resources(self):
        from design_lab.runtime.state_resources import state_schema
        self.assertTrue(state_schema('design-lab-state-assistance-plan-v1.sql').is_file())
        for path in (assistance_plan.PLAN_SCHEMA_PATH, assistance_plan._READBACK_SCHEMA_PATH,
                     assistance_plan._WRITE_SCHEMA_PATH, assistance_plan._LIST_SCHEMA_PATH,
                     assistance_plan._OUTPUT_TYPES_SCHEMA_PATH):
            self.assertTrue(path.is_file(), path)


if __name__ == '__main__':
    unittest.main()
