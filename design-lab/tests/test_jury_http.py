# SPDX-License-Identifier: MIT
"""The jury endpoints over real HTTP, and what a restart still shows.

Human Jury was a validated contract with no route and no table for weeks: the UI
could not display a judgement and nothing survived a restart. These drive a real
server on a real socket against a real published version.
"""
from __future__ import annotations

import hashlib
import http.client
import json
import os
import secrets
import sqlite3
import tempfile
import threading
import unittest
from contextlib import closing
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(REPO / 'src'))

from design_lab.assurance import jury_store                       # noqa: E402
from design_lab.http_service import make_server                   # noqa: E402
from design_lab.runtime import asset_store as assets               # noqa: E402
from design_lab.service import ProjectService                      # noqa: E402

CRITERIA = [{'criterion_id': 'composition', 'weight': 0.4, 'score': 4.2, 'note': 'ok'},
            {'criterion_id': 'typography', 'weight': 0.3, 'score': 3.8, 'note': 'ok'},
            {'criterion_id': 'brand-fit', 'weight': 0.3, 'score': 4.0, 'note': 'ok'}]


class JuryHttpTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop('PROJECT_LOCAL_ROOT', None)
        self.base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        self.project = self.base / 'project'
        self.project.mkdir()
        (self.project / 'AGENTS.md').write_text('# jury fixture project', encoding='utf-8')
        self.service = ProjectService(self.project)
        self.project_id = self.service.create_project('Jury Probe')['id']
        self.version_id, self.digest = self._publish(b'artwork under review')
        self.token = secrets.token_hex(32)
        self.httpd = None
        self.thread = None

    def tearDown(self):
        if self.httpd is not None:
            self.httpd.shutdown()
            self.httpd.server_close()
            if self.thread is not None:
                self.thread.join(timeout=5)
            self.httpd = None

    def _publish(self, payload: bytes, *, project_id=None, asset_id='a1'):
        project_id = project_id or self.project_id
        source = self.base / f'incoming-{asset_id}-{len(payload)}.psd'
        source.write_bytes(payload)
        digest = 'sha256:' + hashlib.sha256(payload).hexdigest()
        store = self.service.paths.category_dir('projects', project_id, 'assets')
        database = self.service.database
        with closing(assets.connect(database, project_root=self.service.paths.project_root)) as conn:
            conn.execute('INSERT INTO asset VALUES (?, ?, "psd", ?)',
                         (asset_id, project_id, '2026-10-08T00:00:00Z'))
            conn.commit()
            resource = f'asset:{asset_id}'
            self.assertTrue(assets.acquire_writer(conn, resource, 'attempt-http'))
            generation = assets.writer_token(conn, resource, 'attempt-http')
            version_id = assets.publish_version(conn, asset_id, source, store_root=store,
                                               artifact_name='native.psd',
                                               expected_sha256=digest,
                                               holder_attempt_id='attempt-http',
                                               generation=generation)
            assets.release_writer(conn, resource, 'attempt-http', generation=generation)
        return version_id, digest

    def serve(self):
        self.httpd = make_server(self.service, self.token, 0)
        self.port = self.httpd.server_port
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def call(self, method, path, body=None):
        if self.httpd is None:
            self.serve()
        headers = {'Authorization': 'Bearer ' + self.token}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        with closing(http.client.HTTPConnection('127.0.0.1', self.port, timeout=15)) as conn:
            conn.request(method, path, body=None if body is None else json.dumps(body),
                         headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read() or b'null')

    def _verdict(self, **overrides):
        base = {
            'schemaVersion': 'design-lab/assurance-jury-record/v2',
            'kind': 'JURY_VERDICT',
            'jury_record_id': 'jury-http-1',
            'subject_ref': f'{jury_store.SUBJECT_PREFIX}{self.version_id}',
            'artifact_sha256': self.digest,
            'juror': {'juror_id': 'dtalex66', 'kind': 'HUMAN', 'members': [],
                      'attestation': 'reviewed the exported artwork at 100%'},
            'criteria': CRITERIA,
            'verdict': 'APPROVE',
            'decided_at': '2026-10-08T00:00:00Z',
            'supersedes': None,
            'evidence_refs': [],
        }
        base.update(overrides)
        return base

    def test_empty_review_reports_nothing_accepted_rather_than_zero_of_something(self):
        status, body = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(status, 200)
        self.assertEqual(body['records'], [])
        self.assertEqual(body['verdict_count'], 0)
        self.assertEqual(body['human_acceptance'], 'NOT_ACCEPTED')
        self.assertEqual(body['current_verdicts'], {})
        # The reviewer is shown what may be judged, with its digest, so a verdict
        # never depends on a hand-typed hash.
        self.assertEqual([row['subject_ref'] for row in body['reviewable_versions']],
                         [f'{jury_store.SUBJECT_PREFIX}{self.version_id}'])
        self.assertEqual(body['reviewable_versions'][0]['artifact_sha256'], self.digest)

    def test_a_superseded_version_leaves_the_reviewable_list(self):
        """Only the currently readable version can be accepted, and the list says so."""
        with closing(sqlite3.connect(self.service.database)) as conn:
            conn.execute('UPDATE asset_version SET state="SUPERSEDED" WHERE version_id=?',
                         (self.version_id,))
            conn.commit()
        _, body = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(body['reviewable_versions'], [])
        document = self._verdict()
        status, refused = self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                    document)
        self.assertEqual(status, 400)
        self.assertIn('SUPERSEDED', refused['error'])

    def test_a_human_verdict_is_recorded_read_back_and_survives_a_restart(self):
        status, stored = self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                   self._verdict())
        self.assertEqual(status, 201, stored)
        status, body = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(body['verdict_count'], 1)
        self.assertEqual(body['human_acceptance'], 'ACCEPTED')
        self.assertEqual(list(body['current_verdicts']), [self._verdict()['subject_ref']])

        # Restart proof: a second server process over the same state database.
        self.tearDown()
        self.httpd = None
        self.serve()
        status, reread = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(status, 200)
        self.assertEqual([row['jury_record_id'] for row in reread['records']], ['jury-http-1'])
        self.assertEqual(reread['human_acceptance'], 'ACCEPTED')

    def test_an_agent_signature_is_refused_with_the_reason_not_a_generic_400(self):
        document = self._verdict(juror={'juror_id': 'codex', 'kind': 'CODEX',
                                        'members': [], 'attestation': 'auto'})
        status, body = self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                 document)
        self.assertEqual(status, 400)
        self.assertIn('CODEX', body['error'])
        status, after = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(after['verdict_count'], 0, 'a refused signature must leave no record')

    def test_reposting_the_same_submission_is_a_replay_not_a_second_verdict(self):
        first = self._verdict()
        self.assertEqual(self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                   first)[0], 201)
        status, replay = self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                   first)
        self.assertEqual(status, 201)
        self.assertEqual(replay['jury_record_id'], 'jury-http-1')
        _, body = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(body['verdict_count'], 1,
                         'a resend after a lost response must not duplicate an attestation')

    def test_reusing_an_id_for_different_content_is_a_conflict(self):
        self.call('POST', f'/api/projects/{self.project_id}/jury/verdict', self._verdict())
        status, body = self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                 self._verdict(verdict='REJECT',
                                               evidence_refs=['contact sheet, 100% crop']))
        self.assertEqual(status, 409)
        self.assertEqual(body['error'], 'JURY_RECORD_ID_TAKEN')

    def test_a_verdict_cannot_borrow_a_version_from_another_project(self):
        """The version must belong to the project the verdict is filed against."""
        other_id = self.service.create_project('Other Probe')['id']
        other_version, other_digest = self._publish(b'other project artwork',
                                                    project_id=other_id, asset_id='a9')
        document = self._verdict(subject_ref=f'{jury_store.SUBJECT_PREFIX}{other_version}',
                                 artifact_sha256=other_digest)
        status, body = self.call('POST', f'/api/projects/{self.project_id}/jury/verdict',
                                 document)
        self.assertEqual(status, 400, body)
        self.assertIn('not a version of this project', body['error'])
        _, after = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(after['verdict_count'], 0)

    def test_a_proposal_is_recorded_separately_and_grants_nothing(self):
        proposal = {
            'schemaVersion': 'design-lab/assurance-jury-proposal/v2',
            'kind': 'JURY_PROPOSAL', 'proposal_id': 'prop-http-1',
            'subject_ref': f'{jury_store.SUBJECT_PREFIX}{self.version_id}',
            'artifact_sha256': self.digest, 'proposer': 'review-agent',
            'criteria': CRITERIA, 'suggested_verdict': 'APPROVE',
            'rationale': 'weighted mean above the floor',
            'created_at': '2026-10-08T00:00:00Z',
        }
        status, stored = self.call('POST', f'/api/projects/{self.project_id}/jury/proposal',
                                   proposal)
        self.assertEqual(status, 201, stored)
        _, body = self.call('GET', f'/api/projects/{self.project_id}/jury')
        self.assertEqual(body['proposal_count'], 1)
        self.assertEqual(body['verdict_count'], 0)
        self.assertEqual(body['human_acceptance'], 'NOT_ACCEPTED',
                         'an agent suggestion must not read as an accepted gate')

    def test_unknown_project_is_404_not_an_empty_review(self):
        status, body = self.call('GET', f'/api/projects/{"0" * 32}/jury')
        self.assertEqual(status, 404)
        self.assertEqual(body['error'], 'PROJECT_NOT_FOUND')

    def _other_project(self):
        other = self.base / 'other'
        other.mkdir()
        (other / 'AGENTS.md').write_text('# other project', encoding='utf-8')
        return other


if __name__ == '__main__':
    unittest.main()
