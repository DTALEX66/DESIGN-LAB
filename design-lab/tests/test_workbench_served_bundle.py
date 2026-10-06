# SPDX-License-Identifier: MIT
"""Served-UI provenance and the terminal HTTP error path.

Two defects the security audit found, both invisible to the existing gates:

1. An installed wheel copy of the UI wins over the checkout, so a stale
   site-packages bundle is served even while the repository moves on (probed on a
   real machine: installed 72,051 B from Sep 27 vs committed 157,747 B from
   Oct 6). `/api/health` now reports which bytes are served; this test asserts
   they are the committed ones in a source checkout.
2. An exception outside the named taxonomy escaped dispatch, so socketserver
   printed a traceback and dropped the connection: no machine-readable error,
   and the client could not tell "rejected" from "unreachable".
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / 'src'))

from design_lab.http_service import make_server  # noqa: E402
from design_lab.service import ProjectService  # noqa: E402
from design_lab import workbench  # noqa: E402

COMMITTED_BUNDLE = REPO / 'apps' / 'workbench' / 'build' / 'main.js'
# Set only by the CI job that installs the wheel and re-runs this module.
INSTALLED_MODE = os.environ.get('DL_LAUNCH_INSTALLED') == '1'


def request(port, token, path='/api/health'):
    req = urllib.request.Request('http://127.0.0.1:%d%s' % (port, path),
                                 headers={'Authorization': 'Bearer ' + token,
                                          'Host': '127.0.0.1:%d' % port})
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.status, json.loads(response.read())


class ServedBundleTests(unittest.TestCase):
    def setUp(self):
        self.root = REPO / '.project-local' / 'task-runtime' / 'served-bundle-tests'
        self.root.mkdir(parents=True, exist_ok=True)
        self.token = hashlib.sha256(b'served-bundle').hexdigest()

    def _serve(self, service):
        server = make_server(service, self.token, port=0)
        port = server.server_address[1]
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        self.addCleanup(lambda: (server.shutdown(), worker.join(), server.server_close()))
        return port

    def test_health_reports_the_served_bundle_identity(self):
        with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(self.root / 'a')}):
            port = self._serve(ProjectService(str(REPO)))
            status, payload = request(port, self.token)
        self.assertEqual(status, 200)
        self.assertEqual(set(payload), {'status', 'version', 'scope', 'bundleSha256',
                                        'bundleOrigin'})
        self.assertIn(payload['bundleOrigin'], ('packaged', 'source'))
        self.assertRegex(payload['bundleSha256'], r'^[0-9a-f]{64}$')

    @unittest.skipIf(INSTALLED_MODE, 'installed wheel has no apps/ checkout next to it')
    def test_served_bundle_is_the_committed_bundle_in_a_source_checkout(self):
        with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(self.root / 'b')}):
            port = self._serve(ProjectService(str(REPO)))
            _, payload = request(port, self.token)
        self.assertEqual(workbench.bundle_origin(), 'source')
        self.assertEqual(payload['bundleSha256'],
                         hashlib.sha256(COMMITTED_BUNDLE.read_bytes()).hexdigest(),
                         'served bytes must equal the committed, drift-gated bundle')

    def test_unexpected_failure_is_machine_readable_and_keeps_the_server_usable(self):
        service = ProjectService(str(REPO))
        with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(self.root / 'c')}):
            port = self._serve(service)
            with patch.object(type(service), 'list_projects',
                              side_effect=RuntimeError('unexpected internal detail')):
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    request(port, self.token, '/api/projects')
                error = caught.exception
                body = json.loads(error.read())
            self.assertEqual(error.code, 500)
            self.assertEqual(body, {'error': 'INTERNAL'})
            # The internal message must not leak, and the connection must survive:
            # the previous behaviour was a dropped socket with a server-side traceback.
            self.assertNotIn('unexpected', json.dumps(body))
            self.assertEqual(request(port, self.token)[0], 200)


if __name__ == '__main__':
    unittest.main()
