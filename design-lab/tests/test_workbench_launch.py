# SPDX-License-Identifier: MIT
"""One-command Workbench launch and restart persistence (E2 controlled runtime).

`design-lab --project <dir> workbench` must be enough for a person to reach the
product UI: no second service, no hand-written launcher, no repo CWD trick. The
launcher starts the real HTTP service in-process, prints the sign-in URL plus
the one-time token, and the same project data has to survive a full process
restart. No browser, no design host and no human acceptance is involved.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

REPO = Path(__file__).resolve().parents[2]
BUNDLE = REPO / 'apps' / 'workbench' / 'build' / 'main.js'
# The clean-install CI job sets this so the launcher is exercised through the
# installed package instead of this source checkout.
INSTALLED_MODE = os.environ.get('DL_LAUNCH_INSTALLED') == '1'
CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; "
       "img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; "
       "frame-ancestors 'none'; object-src 'none'")


class WorkbenchLaunchTests(unittest.TestCase):
    def setUp(self):
        self.parent = REPO / '.project-local' / 'task-runtime' / 'workbench-launch'
        self.parent.mkdir(parents=True, exist_ok=True)

    def _root(self) -> Path:
        root = Path(tempfile.mkdtemp(dir=self.parent))
        (root / 'AGENTS.md').write_text('# launch acceptance project', encoding='utf-8')
        return root

    def _start(self, root: Path):
        env = {**os.environ, 'PROJECT_LOCAL_ROOT': str(root / '.project-local')}
        if not INSTALLED_MODE:
            env['PYTHONPATH'] = os.pathsep.join(
                [str(REPO / 'src'), os.environ.get('PYTHONPATH', '')]).rstrip(os.pathsep)
        handle = subprocess.Popen(
            [sys.executable, '-B', '-m', 'design_lab', '--project', str(root),
             'workbench', '--port', '0', '--no-browser'],
            cwd=str(REPO), env=env, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding='utf-8', errors='replace')
        self.addCleanup(self._stop, handle)
        deadline = time.time() + 30
        while time.time() < deadline:
            line = handle.stdout.readline()
            if line.strip():
                return handle, json.loads(line)
            if handle.poll() is not None:
                self.fail('launcher exited early: ' + handle.stderr.read())
        self.fail('launcher never announced LISTENING')

    def _stop(self, handle: subprocess.Popen) -> None:
        if handle.poll() is None:
            handle.terminate()
            try:
                handle.wait(timeout=10)
            except subprocess.TimeoutExpired:
                handle.kill()
                handle.wait(timeout=10)
        for stream in (handle.stdout, handle.stderr):
            if stream:
                stream.close()

    def _request(self, base, path, token=None, data=None):
        request = urllib.request.Request(base + path, data=data, method='POST' if data else 'GET')
        if token:
            request.add_header('Authorization', 'Bearer ' + token)
        if data:
            request.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(request, timeout=15) as response:
            return response.status, dict(response.headers), response.read()

    def _wait_for_health(self, base, token):
        deadline = time.time() + 20
        while time.time() < deadline:
            try:
                return self._request(base, '/api/health', token)
            except (urllib.error.URLError, OSError):
                time.sleep(0.2)
        self.fail('service never became healthy: ' + base)

    def test_single_command_serves_the_committed_workbench(self):
        _, announcement = self._start(self._root())
        self.assertEqual(announcement['status'], 'LISTENING')
        self.assertRegex(announcement['token'], r'^[0-9a-f]{64}$')
        base = announcement['url'].rsplit('/workbench', 1)[0]
        token = announcement['token']

        status, headers, html = self._request(base, '/workbench')
        self.assertEqual(status, 200)
        self.assertEqual(headers.get('Content-Security-Policy'), CSP)
        self.assertIn('设计工作台', html.decode('utf-8'))

        status, _, served = self._request(base, '/workbench/main.js')
        self.assertEqual(status, 200)
        self.assertEqual(served, BUNDLE.read_bytes(),
                         'the served bundle must be the committed Build Output Truth byte')

        status, _, body = self._wait_for_health(base, token)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)['status'], 'OK')

        with self.assertRaises(urllib.error.HTTPError) as refused:
            self._request(base, '/api/projects')
        self.assertEqual(refused.exception.code, 401)

    def test_project_data_survives_a_full_process_restart(self):
        root = self._root()
        handle, first = self._start(root)
        base, token = first['url'].rsplit('/workbench', 1)[0], first['token']
        self._wait_for_health(base, token)
        _, _, created = self._request(
            base, '/api/projects', token,
            data=json.dumps({'name': 'Restart Probe'}).encode())
        project_id = json.loads(created)['project']['id']

        self._stop(handle)
        _, second = self._start(root)
        base2, token2 = second['url'].rsplit('/workbench', 1)[0], second['token']
        self._wait_for_health(base2, token2)
        status, _, body = self._request(base2, '/api/projects', token2)
        self.assertEqual(status, 200)
        ids = [entry['id'] for entry in json.loads(body)['projects']]
        self.assertIn(project_id, ids,
                      'a project created through the launcher must persist across a restart')


    def test_packaged_install_serves_the_committed_bundle(self):
        # In a source checkout the packaged resource does not exist, so this
        # skips honestly; in a clean wheel install (the CI job) it proves the
        # installed UI is byte-identical to the committed Build Output Truth.
        from importlib.resources import files
        packaged = files('design_lab').joinpath('resources', 'workbench',
                                                'build', 'main.js')
        if not packaged.is_file():
            self.skipTest('source checkout: no packaged workbench resource to verify')
        self.assertEqual(packaged.read_bytes(), BUNDLE.read_bytes())


if __name__ == '__main__':
    unittest.main()
