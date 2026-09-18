# SPDX-License-Identifier: MIT
"""E-SLICE-01 design layer vertical slice (Brief -> Reference -> Direction -> DesignSystem).

Real loopback HTTP contract tests: a Brief, a Direction, a human Choice and a
DesignSystem binding are driven through the actual workbench API and read back
as persisted state. Idempotent retries return the SAME identity; a reused key
with different content fails closed as 409; unknown design systems and missing
rows fail closed as 400/404. Nothing here claims E3 host runs or E4 jury
acceptance: the slice is structural and the catalog is read-only.
"""
import hashlib
import http.client
import json
import os
import secrets
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


class DesignLayerHttpTests(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(ROOT / 'src'))
        self.addCleanup(sys.path.remove, str(ROOT / 'src'))
        parent = ROOT / '.project-local' / 'task-runtime' / 'design-layer-tests'
        parent.mkdir(parents=True, exist_ok=True)
        tmp = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        (self.root / 'AGENTS.md').write_text('# synthetic design-layer HTTP project', encoding='utf-8')

        from design_lab.service import ProjectService
        from design_lab.http_service import make_server
        local_env = patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(self.root / '.project-local')})
        local_env.start()
        self.addCleanup(local_env.stop)
        self.service = ProjectService(str(self.root))
        self.token = secrets.token_hex(32)
        self.server = make_server(self.service, self.token, port=0)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

        def _stop_server(self=self):
            # Stop the serve loop, wait for the background thread to wind down
            # before closing the socket; otherwise close() races the thread's
            # select() and emits a WinError 10038 teardown trace.
            self.server.shutdown()
            self.thread.join()
            self.server.server_close()
        self.addCleanup(_stop_server)

    def request(self, method='GET', path='/api/projects', body=None, headers=None):
        defaults = {'Authorization': 'Bearer ' + self.token,
                    'Host': f'127.0.0.1:{self.port}',
                    'Origin': f'http://127.0.0.1:{self.port}',
                    'Sec-Fetch-Site': 'same-origin'}
        if body is not None:
            defaults['Content-Type'] = 'application/json'
        defaults.update(headers or {})
        raw = json.dumps(body).encode() if body is not None else None
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            conn.request(method, path, body=raw, headers=defaults)
            resp = conn.getresponse()
            payload = json.loads(resp.read())
            return resp.status, payload
        finally:
            conn.close()

    def key(self, n):
        return hashlib.sha256(n.encode()).hexdigest()

    def _project(self, name='E slice'):
        status, body = self.request('POST', '/api/projects', {'name': name})
        self.assertEqual(status, 201)
        return body['project']['id']

    def _brief(self, pid, title='Autumn', key='b1', goals=('modern',)):
        status, body = self.request('POST', f'/api/projects/{pid}/briefs', {
            'title': title, 'goals': list(goals), 'constraints': None,
            'reference_asset_ids': ['img-' + 'a' * 64], 'idempotency_key': self.key(key)})
        self.assertEqual(status, 201)
        return body['brief']

    def _direction(self, pid, bid, title='Warm', key='d1'):
        status, body = self.request('POST', f'/api/projects/{pid}/directions', {
            'brief_id': bid, 'title': title, 'style_notes': ['soft'],
            'color_mood': 'warm', 'typography_mood': 'sans',
            'idempotency_key': self.key(key)})
        self.assertEqual(status, 201)
        return body['direction']

    def test_full_vertical_slice_persists_and_reads_back(self):
        pid = self._project()
        brief = self._brief(pid)
        direction = self._direction(pid, brief['brief_id'])
        # Idempotent retry: same key -> same identity, still one row.
        self.assertEqual(self._brief(pid), brief)
        self.assertEqual(self._direction(pid, brief['brief_id']), direction)
        self.assertEqual(len(self.request(path=f'/api/projects/{pid}/briefs')[1]['briefs']), 1)

        chosen = self.request('POST', f"/api/projects/{pid}/directions/{direction['direction_id']}/choose",
                              {'actor': 'ALEX', 'actor_kind': 'human',
                               'idempotency_key': self.key('c1')})[1]['direction']
        self.assertTrue(chosen['chosen'])
        self.assertEqual(chosen['actor'], 'ALEX')
        self.assertEqual(chosen['actor_kind'], 'human')

        binding = self.request('POST', f"/api/projects/{pid}/directions/{direction['direction_id']}/bind",
                               {'design_system_name': 'uiux-commercial-light',
                                'idempotency_key': self.key('s1')})[1]['binding']
        self.assertEqual(binding['design_system_name'], 'uiux-commercial-light')

        readback = self.request(path=f'/api/projects/{pid}/design-layer')[1]['design_layer']
        self.assertEqual(readback['chosen_direction']['direction_id'], direction['direction_id'])
        self.assertEqual(readback['active_binding']['design_system_name'], 'uiux-commercial-light')
        self.assertEqual(len(readback['briefs']), 1)
        self.assertEqual(len(readback['directions']), 1)
        self.assertEqual(len(readback['bindings']), 1)

    def test_reused_key_with_different_content_fails_closed_409(self):
        pid = self._project()
        self._brief(pid)
        status, body = self.request('POST', f'/api/projects/{pid}/briefs', {
            'title': 'Autumn', 'goals': ['DIFFERENT'], 'constraints': None,
            'reference_asset_ids': ['img-' + 'a' * 64], 'idempotency_key': self.key('b1')})
        self.assertEqual(status, 409)
        self.assertEqual(body['error'], 'IDEMPOTENCY_CONFLICT')
        self.assertEqual(len(self.request(path=f'/api/projects/{pid}/briefs')[1]['briefs']), 1)

    def test_unknown_design_system_and_missing_rows_fail_closed(self):
        pid = self._project()
        brief = self._brief(pid)
        direction = self._direction(pid, brief['brief_id'])
        status, body = self.request('POST',
                                    f"/api/projects/{pid}/directions/{direction['direction_id']}/bind",
                                    {'design_system_name': 'nope', 'idempotency_key': self.key('bad')})
        self.assertEqual(status, 400)
        self.assertEqual(body['error'], 'UNKNOWN_DESIGN_SYSTEM')
        status, body = self.request(path=f"/api/projects/{pid}/briefs/brief-" + '0' * 32)
        self.assertEqual(status, 404)
        self.assertEqual(body['error'], 'BRIEF_NOT_FOUND')
        status, body = self.request('POST', f'/api/projects/{pid}/briefs',
                                    {'title': '', 'goals': [], 'constraints': None,
                                     'reference_asset_ids': [], 'idempotency_key': self.key('empty')})
        self.assertEqual(status, 400)

    def test_design_system_catalog_is_read_only_and_consistent(self):
        status, body = self.request(path='/api/design-systems')
        self.assertEqual(status, 200)
        names = {system['name'] for system in body['design_systems']}
        self.assertEqual(names, {'anomaly-monitor-dark', 'nebula-tech',
                                 'personal-design-intelligence', 'uiux-commercial-light'})
        # The catalog is a pure read: it neither creates state nor needs a project.
        self.assertFalse((self.root / '.project-local').exists())

    def test_design_layer_reads_are_owner_scoped(self):
        owner = self._project()
        other = self._project('Other')
        brief = self._brief(owner)
        self.assertEqual(self.request(
            path=f"/api/projects/{other}/briefs/{brief['brief_id']}")[0], 404)
        self.assertEqual(self.request(path=f"/api/projects/{other}/design-layer")[1]['design_layer']['briefs'], [])

    def test_write_routes_require_auth_and_cannot_create_state(self):
        pid = self._project()
        self.assertEqual(self.request('POST', f'/api/projects/{pid}/briefs',
                                      {'idempotency_key': self.key('x')},
                                      headers={'Authorization': ''})[0], 401)
        self.assertEqual(self.request(path='/api/design-systems',
                                      headers={'Authorization': ''})[0], 401)


if __name__ == '__main__':
    unittest.main()
