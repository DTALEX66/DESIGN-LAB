# SPDX-License-Identifier: MIT
"""Walk the standalone chain over live HTTP and record where it actually reaches.

Every other test in this area proves one seam. That is how "the chain works" came to be a claim
assembled from hop-by-hop greenness while nothing had ever driven the hops in order against one
service and one project. This class does exactly that: one server, one project, each hop fed by
the real identifier the previous hop returned, over HTTP rather than in-process, because a page
can only ever call a route.

It is deliberately not a happy path. The last case asserts what the chain still CANNOT do, so the
file records the break as measured fact instead of leaving it in prose.
"""
from __future__ import annotations

import base64
import http.client
import io
import json
import os
import secrets
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for candidate in (ROOT / 'src', ROOT / 'design-lab' / 'tests'):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from design_lab.image_assets import ImageAssets  # noqa: E402
from design_lab.service import ProjectService  # noqa: E402

CANVAS = (8, 6)


def _png_bytes() -> bytes:
    stream = io.BytesIO()
    from PIL import Image
    Image.new('RGB', CANVAS, 'white').save(stream, format='PNG')
    return stream.getvalue()


class StandaloneChainTests(unittest.TestCase):
    def setUp(self):
        parent = ROOT / '.project-local/task-runtime/standalone-chain-http'
        parent.mkdir(parents=True, exist_ok=True)
        os.environ.pop('PROJECT_LOCAL_ROOT', None)
        self._temp = tempfile.TemporaryDirectory(dir=parent)
        self.root = Path(self._temp.name)
        (self.root / 'AGENTS.md').write_text('# standalone chain fixture', encoding='utf-8')
        from design_lab.http_service import make_server
        self.service = ProjectService(str(self.root))
        self.token = secrets.token_hex(32)
        self.server = make_server(self.service, self.token, port=0)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

        def _stop(self=self):
            self.server.shutdown()
            self.thread.join()
            self.server.server_close()
        self.addCleanup(_stop)
        self.addCleanup(self._temp.cleanup)
        self.hops = []

    def call(self, method, path, body=None):
        headers = {'Authorization': 'Bearer ' + self.token,
                   'Host': f'127.0.0.1:{self.port}',
                   'Origin': f'http://127.0.0.1:{self.port}',
                   'Sec-Fetch-Site': 'same-origin'}
        raw = None
        if body is not None:
            headers['Content-Type'] = 'application/json'
            raw = json.dumps(body).encode('utf-8')
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        try:
            conn.request(method, path, body=raw, headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read())
        finally:
            conn.close()

    def hop(self, name, method, path, body, expected):
        status, payload = self.call(method, path, body)
        self.hops.append(f'{name}={status}')
        self.assertEqual(status, expected,
                         f'chain broke at {name} ({method} {path}) -> {status}: '
                         f'{json.dumps(payload, ensure_ascii=False)[:400]}')
        return payload

    def test_the_chain_walks_from_project_to_a_reviewed_candidate(self):
        project = self.hop('project', 'POST', '/api/projects',
                           {'name': 'Chain walk'}, 201)['project']['id']

        asset = self.hop(
            'asset', 'POST', f'/api/projects/{project}/assets',
            {'content_base64': base64.b64encode(_png_bytes()).decode('ascii'),
             'idempotency_key': 'chain-asset'},
            201)['asset']['id']

        brief = self.hop(
            'brief', 'POST', f'/api/projects/{project}/briefs',
            {'title': 'Chain brief', 'goals': ['standalone'], 'constraints': None,
             'reference_asset_ids': [asset], 'idempotency_key': 'chain-brief'},
            201)['brief']['brief_id']

        direction = self.hop(
            'direction', 'POST', f'/api/projects/{project}/directions',
            {'brief_id': brief, 'title': 'Chain direction', 'style_notes': ['measured'],
             'color_mood': 'warm', 'typography_mood': 'sans',
             'idempotency_key': 'chain-direction'},
            201)['direction']['direction_id']

        # The aggregate read is what the workbench actually renders, so the chain is only
        # connected if the earlier writes come back through it.
        layer = self.hop('design-layer', 'GET', f'/api/projects/{project}/design-layer',
                         None, 200)
        self.assertIn(brief, json.dumps(layer))
        self.assertIn(direction, json.dumps(layer))
        self.assertIn(asset, json.dumps(layer))

        analysis = self.hop(
            'analysis', 'POST', f'/api/projects/{project}/assets/{asset}/analysis',
            {'module': 'ocr-fixture',
             'detections': [{'text': 'CHAIN', 'confidence': 0.83,
                             'polygon': [[1, 1], [4, 1], [4, 3], [1, 3]]},
                            {'text': 'WALK', 'confidence': 0.61,
                             'polygon': [[1, 4], [4, 4], [4, 6], [1, 6]]}],
             'decomposition_id': None},
            201)
        self.assertEqual(analysis['status'], 'ASSET_ANALYSIS')
        self.assertEqual(analysis['rir']['schemaVersion'], 'design-lab/reconstruction-ir/v1')
        self.assertTrue(analysis['rir']['layers'], 'the derived document carried no layers')
        # `proves` is the document's own statement of its evidence scope; a chain that dropped
        # it would let a derived IR be read as native truth downstream.
        self.assertIn('proves', analysis)

        # The submission body is imported rather than re-typed: it is a closed contract with
        # rights and provenance fields, and a second copy here would be a second authority
        # that could drift from the one the write path enforces.
        from test_knowledge_http import candidate
        created = self.hop(
            'candidate', 'POST', f'/api/projects/{project}/knowledge-candidates',
            candidate(candidate_id='kc-chain-1'), 201)
        self.assertEqual('PENDING_HUMAN_APPROVAL', created['review']['state'],
                         'a fresh candidate must not arrive pre-approved')
        candidate_id = created['candidate_id']

        reviewed = self.hop(
            'review', 'POST',
            f'/api/projects/{project}/knowledge-candidates/{candidate_id}/review',
            {'decision': 'APPROVE', 'reviewer_id': 'dtalex66', 'reviewer_kind': 'human',
             'reviewed_at': '2026-10-19T00:00:00Z', 'note': None, 'reason': None},
            200)
        self.assertEqual('APPROVED', reviewed['review']['state'])

        readback = self.hop(
            'candidate-readback', 'GET',
            f'/api/projects/{project}/knowledge-candidates', None, 200)
        self.assertEqual(1, readback['candidate_count'])
        row = next((item for item in readback['candidates']
                    if item['candidate_id'] == candidate_id), None)
        self.assertIsNotNone(row, f'the reviewed candidate is not in the readback: {self.hops}')
        self.assertEqual('APPROVED', row['review_state'])
        print('CHAIN_HOPS ' + ' '.join(self.hops))

    def test_export_is_still_not_a_reachable_hop(self):
        """The chain stops before leaving the repository, and this says so rather than pretending.

        Two facts are pinned: no route matches an export path, and the read-back projection
        declares its outbound transport as not connected. If someone adds the export leg, the
        first of these goes red and the claim in docs/current/NEXT-AGENT-PROMPT.md has to be
        re-earned deliberately.
        """
        from design_lab.http_service import ROUTES
        export_routes = [route.pattern for route in ROUTES if 'export' in route.pattern]
        self.assertEqual([], export_routes,
                         f'an export route appeared ({export_routes}); the standalone chain '
                         'now reaches further than this file and the entry-point claim say')
        source = (ROOT / 'src/design_lab/knowledge_review.py').read_text(encoding='utf-8')
        self.assertIn('"transport": "NOT_CONNECTED"', source,
                      'the outbound transport no longer says NOT_CONNECTED; if a real transport '
                      'was added, update the chain claim in the same change')


if __name__ == '__main__':
    unittest.main(verbosity=2)
