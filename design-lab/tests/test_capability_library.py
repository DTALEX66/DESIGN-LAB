# SPDX-License-Identifier: MIT
"""The capability library projection and its route.

These assert the three properties the projection exists to guarantee, plus one real
HTTP round trip. They deliberately do not assert specific record counts from the data:
the counts are derived from the records in the call, so a test that hardcoded 46 or 14
would pass on a stale checkout and fail on a legitimate addition.
"""
from __future__ import annotations

import json
import os
import secrets
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(ROOT / 'src'))

from design_lab.analysis import capability_library  # noqa: E402


class ProjectionTests(unittest.TestCase):
    def setUp(self):
        self.doc = capability_library.build(ROOT)

    def test_every_record_reports_no_qualification_because_none_is_recorded(self):
        # Qualification is a host run plus a human acceptance. Neither is derivable
        # from a registry, so a projection that said `false` would be claiming the
        # capability was evaluated and failed.
        self.assertTrue(self.doc['capabilities'])
        for record in self.doc['capabilities']:
            self.assertIsNone(record['qualified'], f"{record['id']} claims a verdict")
            self.assertIsNone(record['qualificationEvidence'])
        self.assertEqual(self.doc['counts']['qualified'], 0)

    def test_absent_revision_is_not_verified_never_absent_provenance(self):
        states = {r['id']: r['revisionState'] for r in self.doc['capabilities']}
        self.assertNotIn(None, states.values())
        self.assertNotIn('', states.values())
        # Models are outside the vendor revision mechanism entirely.
        for record in self.doc['capabilities']:
            if record['kind'] == 'model':
                self.assertEqual(record['revisionState'], 'NOT_VERIFIED')

    def test_counts_are_derived_from_the_records_in_this_call(self):
        counts = self.doc['counts']
        self.assertEqual(counts['total'], len(self.doc['capabilities']))
        self.assertEqual(sum(counts['byKind'].values()), counts['total'])
        self.assertEqual(sum(counts['byRevisionState'].values()), counts['total'])
        self.assertEqual(sum(counts['byLicense'].values()), counts['total'])
        lock = json.loads((ROOT / capability_library.LOCK_REL).read_text(encoding='utf-8'))
        self.assertEqual(counts['byKind']['source'], len(lock['sources']))

    def test_a_missing_input_fails_closed_rather_than_projecting_a_partial_library(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(FileNotFoundError):
                capability_library.build(Path(tmp))

    def test_unmeasured_semantics_are_published_with_the_data(self):
        # The view prints this so a reader cannot take a blank as a zero.
        self.assertIn('null', self.doc['unmeasuredMeans'])


class RouteTests(unittest.TestCase):
    def test_the_route_serves_the_projection_over_the_real_service(self):
        from design_lab.service import ProjectService
        from design_lab.http_service import make_server

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'AGENTS.md').write_text('# capability route probe', encoding='utf-8')
            token = secrets.token_hex(32)
            with patch.dict(os.environ, {'PROJECT_LOCAL_ROOT': str(root / '.project-local')}):
                service = ProjectService(str(root))
                server = make_server(service, token, port=0)
                port = server.server_address[1]
                worker = threading.Thread(target=server.serve_forever, daemon=True)
                worker.start()
                try:
                    unauthenticated = self._get(port, '')
                    self.assertEqual(unauthenticated.getcode(), 401)
                    body = json.loads(self._get(port, token).read().decode('utf-8'))
                finally:
                    server.shutdown()
                    worker.join()
                    server.server_close()
        self.assertEqual(body['schemaVersion'], capability_library.SCHEMA_VERSION)
        self.assertEqual(body['counts']['total'], len(body['capabilities']))

    def _get(self, port, token):
        request = Request(f'http://127.0.0.1:{port}/api/capabilities')
        if token:
            request.add_header('Authorization', f'Bearer {token}')
        try:
            return urlopen(request, timeout=10)
        except Exception as error:      # noqa: BLE001 - 401 arrives as URLError
            code = getattr(error, 'code', None)
            if code == 401 and not token:
                class Handled:
                    def getcode(self): return 401
                return Handled()
            raise


if __name__ == '__main__':
    unittest.main()
