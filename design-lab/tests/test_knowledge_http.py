# SPDX-License-Identifier: MIT
"""Knowledge-feedback candidates over real HTTP: what a human can see and sign.

DL-P1-180 defined the candidate contract, but nothing persisted one, no route
served it, and the Workbench could only print that the panel was PLANNED. These
cases drive a real ``make_server`` on a real socket against a real project and
compare bodies that server actually wrote. The assertions are about the honest
half of the feature:

* a stored candidate is always PENDING until a *named human* decides; an agent
  reviewer is refused with its own code and the candidate stays pending;
* approval makes the local contract export-ready, and the readback still says
  ``NOT_CONNECTED`` with ``sent_count`` 0 -- export_ready is not a delivery;
* a revocation returns a receipt with ``export_blocked`` true, blocks the
  export, and cannot be rewritten by a different reason or actor;
* an invalid or superseded-into-a-fork chain is refused rather than stored;
* an unreadable row and an unapplied revocation receipt are reported as named
  conflicts while the read itself still answers 200.

Every readback body is validated against
``design-lab/schemas/assurance-knowledge-candidate-readback-v1.schema.json``.
"""
from __future__ import annotations

import http.client
import json
import os
import re
import secrets
import sqlite3
import subprocess
import tempfile
import threading
import unittest
from contextlib import closing
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(REPO / 'src'))

from design_lab.http_service import make_server                     # noqa: E402
from design_lab.service import ProjectService                       # noqa: E402

READBACK = (REPO / 'design-lab' / 'schemas'
            / 'assurance-knowledge-candidate-readback-v1.schema.json')
HEAD_RE = re.compile(r'[0-9a-f]{40,64}')

REGISTRY = None


def _registry():
    global REGISTRY
    if REGISTRY is None:
        import referencing
        resources = []
        for path in sorted((REPO / 'design-lab' / 'schemas').rglob('*.json')):
            try:
                document = json.loads(path.read_text(encoding='utf-8'))
            except (OSError, ValueError):
                continue
            if isinstance(document, dict) and isinstance(document.get('$id'), str):
                resources.append(
                    (document['$id'], referencing.Resource.from_contents(document)))
        REGISTRY = referencing.Registry(resources)
    return REGISTRY


def candidate(candidate_id='kc-http-1', **overrides) -> dict:
    """One complete submission, exactly as the write contract would accept it."""
    document = {
        'candidate_id': candidate_id,
        'candidate_type': 'METHOD',
        'source': {
            'design_lab_sha': 'a' * 40,
            'job_id': 'job-knowledge-1',
            'operation_id': 'op-knowledge-1',
            'evidence_sha256': 'sha256:' + 'b' * 64,
        },
        'rights': {
            'license_id': 'MIT',
            'rights_gate_state': 'CHECKED',
            'contains_client_asset': False,
            'contains_third_party_asset': False,
            'redaction_note': None,
        },
        'payload': {
            'title': 'judge hierarchy before decoration',
            'statement': 'type and image outrank a decorative device when they conflict',
            'applies_to': ['editorial', 'brand'],
        },
        'created_at': '2026-10-18T00:00:00Z',
        'revocation_entrypoint': 'design-lab/knowledge/revoke',
    }
    document.update(overrides)
    return document


class KnowledgeHttpTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop('PROJECT_LOCAL_ROOT', None)
        self.base = Path(tempfile.mkdtemp(dir=REPO / '.project-local' / 'task-runtime'))
        self.project = self.base / 'project'
        self.project.mkdir()
        (self.project / 'AGENTS.md').write_text('# knowledge fixture project',
                                                encoding='utf-8')
        self.service = ProjectService(self.project)
        self.project_id = self.service.create_project('Knowledge Probe')['id']
        self.other_id = self.service.create_project('Other Knowledge Probe')['id']
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

    def serve(self):
        self.httpd = make_server(self.service, self.token, 0)
        self.port = self.httpd.server_port
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def stop_server(self):
        if self.httpd is not None:
            self.httpd.shutdown()
            self.httpd.server_close()
            if self.thread is not None:
                self.thread.join(timeout=5)
        self.httpd = None
        self.thread = None

    def call(self, method, path, body=None):
        if self.httpd is None:
            self.serve()
        headers = {'Authorization': 'Bearer ' + self.token}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        with closing(http.client.HTTPConnection('127.0.0.1', self.port,
                                                timeout=15)) as conn:
            conn.request(method, path,
                         body=None if body is None else json.dumps(body),
                         headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read() or b'null')

    def readback(self, project_id=None):
        status, body = self.call(
            'GET', f"/api/projects/{project_id or self.project_id}/knowledge-candidates")
        self.assertEqual(200, status, body)
        self.assert_readback_schema(body)
        return body

    def assert_readback_schema(self, body):
        import jsonschema
        schema = json.loads(READBACK.read_text(encoding='utf-8'))
        validator = jsonschema.Draft202012Validator(schema, registry=_registry())
        errors = sorted(validator.iter_errors(body), key=lambda error: list(error.path))
        self.assertEqual([], [f"{'/'.join(str(part) for part in error.path)}: "
                              f"{error.message}" for error in errors])

    def create(self, document=None, *, supersedes=None, project_id=None):
        path = f"/api/projects/{project_id or self.project_id}/knowledge-candidates"
        if supersedes is not None:
            path += '?supersedes=' + supersedes
        return self.call('POST', path, document or candidate())

    def review(self, candidate_id, *, project_id=None, **overrides):
        body = {
            'decision': 'APPROVE',
            'reviewer_id': 'dtalex66',
            'reviewer_kind': 'human',
            'reviewed_at': '2026-10-18T00:00:00Z',
            'note': None,
            'reason': None,
        }
        body.update(overrides)
        return self.call(
            'POST',
            f"/api/projects/{project_id or self.project_id}/knowledge-candidates"
            f"/{candidate_id}/review", body)

    def revoke(self, candidate_id, **overrides):
        body = {'reason': 'superseded by a corrected method',
                'revoked_by': 'dtalex66', 'revoked_at': None}
        body.update(overrides)
        return self.call(
            'POST',
            f"/api/projects/{self.project_id}/knowledge-candidates"
            f"/{candidate_id}/revoke", body)

    # -- what an empty store says ------------------------------------------------

    def test_empty_readback_names_the_missing_transport_and_counts_zero(self):
        body = self.readback()
        self.assertEqual('design-lab/assurance-knowledge-candidate-readback/v1',
                         body['schemaVersion'])
        self.assertEqual([], body['candidates'])
        for key in ('candidate_count', 'unreadable_count', 'pending_review_count',
                    'approved_count', 'rejected_count', 'revoked_count',
                    'export_ready_count'):
            self.assertEqual(0, body[key], key)
        self.assertEqual([], body['conflicts'])
        self.assertEqual([], body['revocation_receipts'])
        self.assertEqual('NOT_CONNECTED', body['outbound']['transport'])
        self.assertEqual(0, body['outbound']['sent_count'])
        self.assertIsNone(body['outbound']['last_attempt_at'])
        self.assertTrue(body['does_not_say'])
        head = body['head_sha']
        self.assertTrue(head is None or HEAD_RE.fullmatch(head) is not None, head)

    # -- create -----------------------------------------------------------------

    def test_create_is_pending_and_a_caller_cannot_choose_the_version(self):
        status, body = self.create()
        self.assertEqual(201, status, body)
        self.assertEqual('design-lab/assurance-knowledge-candidate/v2',
                         body['schemaVersion'])
        self.assertEqual('PENDING_HUMAN_APPROVAL', body['review']['state'])
        self.assertIsNone(body['review']['reviewer_id'])
        self.assertEqual('ACTIVE', body['revocation']['state'])

        readback = self.readback()
        self.assertEqual(1, readback['candidate_count'])
        self.assertEqual(1, readback['pending_review_count'])
        self.assertEqual(0, readback['approved_count'])
        self.assertEqual(0, readback['export_ready_count'])
        row = readback['candidates'][0]
        self.assertEqual('kc-http-1', row['candidate_id'])
        self.assertEqual('PENDING_HUMAN_APPROVAL', row['review_state'])
        self.assertFalse(row['export_ready'])
        self.assertTrue(row['export_blocked_by'])

        refused = self.create({**candidate('kc-http-version'),
                               'schemaVersion': 'design-lab/assurance-knowledge-candidate/v2'})
        self.assertEqual(400, refused[0], refused[1])
        self.assertEqual('INVALID_PROJECT_FIELDS', refused[1]['error'])

    def test_unaddressable_candidate_id_is_refused_at_creation(self):
        status, body = self.create(candidate('has a space'))
        self.assertEqual(400, status, body)
        self.assertEqual('CANDIDATE_ID_INVALID', body['error'])
        self.assertEqual(0, self.readback()['candidate_count'])

    def test_replaying_the_same_submission_does_not_append_a_second_revision(self):
        first = self.create()
        self.assertEqual(201, first[0])
        second = self.create()
        self.assertEqual(201, second[0])
        self.assertEqual(first[1], second[1])
        self.assertEqual(1, self.readback()['candidate_count'])

    # -- review -----------------------------------------------------------------

    def test_an_agent_may_not_decide_and_the_candidate_stays_pending(self):
        self.create()
        status, body = self.review('kc-http-1', reviewer_kind='agent',
                                   reviewer_id='codex')
        self.assertEqual(400, status, body)
        self.assertEqual('KNOWLEDGE_HUMAN_REVIEW_REQUIRED', body['error'])
        row = self.readback()['candidates'][0]
        self.assertEqual('PENDING_HUMAN_APPROVAL', row['review_state'])
        self.assertIsNone(row['reviewer_id'])

    def test_human_approval_is_export_ready_but_never_reported_as_sent(self):
        self.create()
        status, body = self.review('kc-http-1', note='read the whole method')
        self.assertEqual(200, status, body)
        self.assertEqual('APPROVED', body['review']['state'])
        self.assertEqual('human', body['review']['reviewer_kind'])
        self.assertEqual('dtalex66', body['review']['reviewer_id'])

        readback = self.readback()
        self.assertEqual(1, readback['approved_count'])
        self.assertEqual(1, readback['export_ready_count'])
        self.assertTrue(readback['candidates'][0]['export_ready'])
        self.assertIsNone(readback['candidates'][0]['export_blocked_by'])
        self.assertEqual('NOT_CONNECTED', readback['outbound']['transport'])
        self.assertEqual(0, readback['outbound']['sent_count'])

    def test_a_rejection_must_say_why_and_is_not_export_ready(self):
        self.create()
        status, body = self.review('kc-http-1', decision='REJECT')
        self.assertEqual(400, status, body)
        self.assertEqual('REASON_REQUIRED', body['error'])

        status, body = self.review('kc-http-1', decision='REJECT',
                                   reason='the method restates the brief')
        self.assertEqual(200, status, body)
        self.assertEqual('REJECTED', body['review']['state'])
        readback = self.readback()
        self.assertEqual(1, readback['rejected_count'])
        self.assertEqual(0, readback['export_ready_count'])
        self.assertFalse(readback['candidates'][0]['export_ready'])

    def test_a_decided_candidate_is_not_re_signed(self):
        self.create()
        self.assertEqual(200, self.review('kc-http-1')[0])
        status, body = self.review('kc-http-1', decision='REJECT', reason='changed mind')
        self.assertEqual(409, status, body)
        self.assertEqual('KNOWLEDGE_CANDIDATE_DECIDED', body['error'])

    # -- revoke -----------------------------------------------------------------

    def test_revocation_returns_a_receipt_and_blocks_the_export(self):
        self.create()
        self.assertEqual(200, self.review('kc-http-1')[0])
        status, receipt = self.revoke('kc-http-1')
        self.assertEqual(200, status, receipt)
        self.assertEqual('design-lab/assurance-knowledge-candidate-revocation/v1',
                         receipt['schemaVersion'])
        self.assertEqual('kc-http-1', receipt['candidate_id'])
        self.assertTrue(receipt['export_blocked'])

        readback = self.readback()
        self.assertEqual(1, readback['revoked_count'])
        self.assertEqual(0, readback['export_ready_count'])
        self.assertEqual('REVOKED', readback['candidates'][0]['revocation_state'])
        self.assertEqual([receipt], readback['revocation_receipts'])

        # A retry of the identical revocation is a replay, not a second receipt.
        self.assertEqual(receipt, self.revoke('kc-http-1')[1])
        # A different reason would rewrite what the receipt says happened.
        status, body = self.revoke('kc-http-1', reason='a different story')
        self.assertEqual(409, status, body)
        self.assertEqual('KNOWLEDGE_ALREADY_REVOKED', body['error'])

    # -- supersede chain ---------------------------------------------------------

    def test_duplicate_ids_and_forking_chains_are_refused(self):
        self.create()
        status, body = self.create(candidate('kc-http-1', payload={
            'title': 'a different claim', 'statement': 'different',
            'applies_to': ['editorial']}))
        self.assertEqual(409, status, body)
        self.assertEqual('CANDIDATE_ID_TAKEN', body['error'])

        status, body = self.create(candidate('kc-http-2'), supersedes='missing-1')
        self.assertEqual(409, status, body)
        self.assertEqual('SUPERSEDES_UNKNOWN', body['error'])

        status, body = self.create(candidate('kc-http-3'), supersedes='kc-http-1')
        self.assertEqual(201, status, body)
        self.assertEqual('kc-http-1', body['supersedes'])
        status, body = self.create(candidate('kc-http-4'), supersedes='kc-http-1')
        self.assertEqual(409, status, body)
        self.assertEqual('SUPERSEDE_FORK', body['error'])

    # -- scope ------------------------------------------------------------------

    def test_unknown_project_and_candidate_are_404(self):
        missing = 'f' * 32
        status, body = self.call('GET', f'/api/projects/{missing}/knowledge-candidates')
        self.assertEqual(404, status, body)
        self.assertEqual('PROJECT_NOT_FOUND', body['error'])
        status, body = self.review('absent-1')
        self.assertEqual(404, status, body)
        self.assertEqual('KNOWLEDGE_CANDIDATE_NOT_FOUND', body['error'])

    def test_candidates_do_not_cross_project_boundaries(self):
        self.create()
        self.assertEqual([], self.readback(self.other_id)['candidates'])
        status, body = self.review('kc-http-1', project_id=self.other_id)
        self.assertEqual(404, status, body)
        self.assertEqual('KNOWLEDGE_CANDIDATE_NOT_FOUND', body['error'])

    # -- freshness --------------------------------------------------------------

    def test_freshness_compares_the_recorded_revision_with_this_checkout(self):
        result = subprocess.run(['git', '-C', str(REPO), 'rev-parse', 'HEAD'],
                                capture_output=True, text=True, timeout=10)
        head = result.stdout.strip()
        if result.returncode != 0 or HEAD_RE.fullmatch(head) is None:
            self.skipTest('no git subject in this checkout')
        self.create(candidate('kc-current', source={
            'design_lab_sha': head, 'job_id': 'job-1', 'operation_id': 'op-1',
            'evidence_sha256': 'sha256:' + 'b' * 64}))
        self.create(candidate('kc-stale', source={
            'design_lab_sha': 'abc1234', 'job_id': 'job-1', 'operation_id': 'op-1',
            'evidence_sha256': 'sha256:' + 'b' * 64}))
        rows = {row['candidate_id']: row for row in self.readback()['candidates']}
        self.assertEqual('CURRENT', rows['kc-current']['freshness'])
        self.assertEqual('STALE', rows['kc-stale']['freshness'])

    # -- conflicts --------------------------------------------------------------

    def test_a_corrupt_row_is_named_and_does_not_hide_the_read(self):
        # The route creates the tables on its first read; the tampering happens after
        # that so this case tests the report, not schema bootstrapping.
        self.readback()
        with closing(sqlite3.connect(self.service.database)) as conn:
            conn.execute(
                'INSERT INTO knowledge_candidate (project_id, candidate_id, revision,'
                ' candidate_type, review_state, revocation_state, document_json,'
                ' recorded_at) VALUES (?,?,?,?,?,?,?,?)',
                (self.project_id, 'corrupt-1', 1, 'METHOD', 'PENDING_HUMAN_APPROVAL',
                 'ACTIVE', '{not json', '2026-10-18T00:00:00Z'))
            conn.commit()
        readback = self.readback()
        self.assertEqual(0, readback['candidate_count'])
        self.assertEqual(1, readback['unreadable_count'])
        self.assertIn(('corrupt-1', 'DOCUMENT_UNREADABLE'),
                      [(item['candidate_id'], item['kind'])
                       for item in readback['conflicts']])

    def test_an_unapplied_receipt_is_named_as_a_conflict(self):
        self.create()
        receipt = {
            'schemaVersion': 'design-lab/assurance-knowledge-candidate-revocation/v1',
            'candidate_id': 'kc-http-1', 'entrypoint': 'design-lab/knowledge/revoke',
            'reason': 'manual repair', 'revoked_by': 'dtalex66',
            'revoked_at': '2026-10-18T00:00:00Z', 'export_blocked': True,
        }
        with closing(sqlite3.connect(self.service.database)) as conn:
            conn.execute(
                'INSERT INTO knowledge_revocation (project_id, candidate_id,'
                ' document_json, recorded_at) VALUES (?,?,?,?)',
                (self.project_id, 'kc-http-1', json.dumps(receipt),
                 '2026-10-18T00:00:00Z'))
            conn.commit()
        readback = self.readback()
        self.assertIn(('kc-http-1', 'REVOCATION_RECEIPT_UNAPPLIED'),
                      [(item['candidate_id'], item['kind'])
                       for item in readback['conflicts']])
        self.assertEqual([receipt], readback['revocation_receipts'])
        # The document is still ACTIVE: a receipt alone does not revoke in the read.
        self.assertEqual('ACTIVE', readback['candidates'][0]['revocation_state'])

    # -- persistence ------------------------------------------------------------

    def test_a_decision_survives_a_server_restart(self):
        self.create()
        self.assertEqual(200, self.review('kc-http-1')[0])
        self.stop_server()
        body = self.readback()
        self.assertEqual(1, body['approved_count'])
        self.assertEqual('APPROVED', body['candidates'][0]['review_state'])
        self.assertEqual('dtalex66', body['candidates'][0]['reviewer_id'])


if __name__ == '__main__':
    unittest.main()
