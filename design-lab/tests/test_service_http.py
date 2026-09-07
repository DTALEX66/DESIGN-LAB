# SPDX-License-Identifier: MIT
"""Real CLI processes, loopback requests and persistent project metadata."""
import http.client
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import queue
import secrets
import subprocess
import sys
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ServiceHttpTests(unittest.TestCase):
    def seed_native(self):
        from contextlib import closing
        from unittest.mock import patch
        sys.path.insert(0,str(ROOT/'src'));self.addCleanup(lambda:sys.path.remove(str(ROOT/'src')))
        from design_lab.service import ProjectService
        from design_lab.runtime import job_store as jobs,asset_store as assets
        with patch.dict(os.environ):
            os.environ.pop('PROJECT_LOCAL_ROOT',None)
            service=ProjectService(self.root);project=service.create_project('Native query fixture')['id']
            other=service.create_project('Other project')['id']
            job='native-job-'+'a'*64;asset='native-'+'b'*64
            data=b'8BPS synthetic query fixture; not native-host evidence'
            path=service.paths.category_dir('projects',project,'assets')/'native.psd';path.parent.mkdir(parents=True);path.write_bytes(data)
            sha=hashlib.sha256(data).hexdigest()
            with closing(assets.connect(service.database,project_root=self.root)) as conn:
                assets.register_asset(conn,project,asset,'psd')
                version=assets.record_version(conn,asset,sha,artifacts=[(str(path),sha,len(data),'deliverable')])
            with closing(jobs.connect(service.database,project_root=self.root)) as conn:
                attempt=jobs.begin_attempt(conn,job,operation_id='native-op-'+'a'*64,idempotency_scope='native:'+project+':photoshop',
                    idempotency_key='PRIVATE_NATIVE_KEY',request_hash='a'*64)
                jobs.transition(conn,attempt['attempt_id'],'RUNNING',note='PRIVATE_NATIVE_NOTE')
                jobs.transition(conn,attempt['attempt_id'],'RECEIPTED',evidence=dict(operation_id='native-op-'+'a'*64,
                    attempt_id=attempt['attempt_id'],artifact_sha256=sha,readback_sha256=sha,private='PRIVATE_NATIVE_RECEIPT'))
        return project,other,job,asset,version,path,sha

    def test_native_tasks_and_asset_readback_are_scoped_and_survive_restart(self):
        project,other,job,asset,version,path,sha=self.seed_native();self.start()
        prefix='/api/projects/'+project
        status,data=self.request(path=prefix+'/tasks');self.assertEqual(status,200)
        self.assertEqual(len(data['tasks']),1,'native task absent from project query')
        self.assertEqual(data['tasks'][0]['kind'],'photoshop-native')
        self.assertEqual(data['tasks'][0]['state'],'SUCCEEDED')
        self.assertEqual(self.request(path=prefix+'/tasks/'+job)[0],200)
        events=self.request(path=prefix+'/tasks/'+job+'/events')[1]['events']
        self.assertEqual([e['to_state'] for e in events],['PENDING','RUNNING','RECEIPTED'])
        status,listing=self.request(path=prefix+'/native-assets');self.assertEqual(status,200)
        record=listing['assets'][0];self.assertEqual(record['id'],asset);self.assertEqual(record['version_id'],version)
        self.assertEqual(record['verification'],'METADATA_ONLY');self.assertNotIn('path',record)
        self.stop();self.start()
        status,checked=self.request(path=prefix+'/native-assets/'+asset+'/verify');self.assertEqual(status,200)
        self.assertEqual(checked['asset']['verification'],'HASH_VERIFIED');self.assertEqual(checked['asset']['sha256'],'sha256:'+sha)
        public=json.dumps([data,listing,checked,events]);self.assertNotIn('PRIVATE_NATIVE',public)
        for suffix in ('/tasks/'+job,'/tasks/'+job+'/events','/native-assets/'+asset+'/verify'):
            self.assertEqual(self.request(path='/api/projects/'+other+suffix)[0],404)
        self.assertEqual(self.request(path=prefix+'/native-assets?after='+asset)[1]['assets'],[])
        self.assertEqual(self.request(path=prefix+'/tasks?after='+job)[1]['tasks'],[])

    def test_native_file_tamper_and_unauthorized_readback_fail_closed(self):
        project,other,job,asset,version,path,sha=self.seed_native();self.start()
        route='/api/projects/'+project+'/native-assets/'+asset+'/verify'
        self.assertEqual(self.request(path=route,headers={'Authorization':''})[0],401)
        path.write_bytes(b'tampered')
        self.assertEqual(self.request(path=route)[0],409)
        self.assertEqual(self.request('POST',path=route,body='{}')[0],404)
        self.assertEqual(self.request(path='/api/projects/'+project+'/native-assets?after=../escape')[0],404)

    def setUp(self):
        parent = ROOT / '.project-local/task-runtime/service-http-tests'
        parent.mkdir(parents=True, exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / 'AGENTS.md').write_text('# synthetic HTTP test project', encoding='utf-8')
        self.token = secrets.token_hex(32)
        self.process = None
        self.addCleanup(self.stop)

    def start(self):
        env = dict(os.environ)
        env.pop('PROJECT_LOCAL_ROOT', None)
        code = 'import sys; sys.path.insert(0, sys.argv.pop(1)); from design_lab.cli import main; sys.exit(main())'
        installed_python = env.pop('DESIGN_LAB_QUALIFICATION_PYTHON', None)
        launcher = ([installed_python, '-I', '-B', '-m', 'design_lab'] if installed_python else
                    [sys.executable, '-B', '-c', code, str(ROOT / 'src')])
        self.process = subprocess.Popen(
            [*launcher, '--project', str(self.root),
             'serve', '--port', '0'], cwd=self.root.parent, env=env,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, encoding='utf-8')
        self.process.stdin.write(self.token + '\n')
        self.process.stdin.flush()
        self.process.stdin.close()
        lines = queue.Queue()
        threading.Thread(target=lambda: lines.put(self.process.stdout.readline()), daemon=True).start()
        try:
            line = lines.get(timeout=10)
        except queue.Empty:
            self.fail('server did not emit readiness within 10 seconds')
        self.assertTrue(line, 'serve command exited without readiness')
        ready = json.loads(line)
        self.assertEqual(ready['status'], 'LISTENING')
        self.assertEqual(ready['host'], '127.0.0.1')
        self.assertNotIn(self.token, line)
        self.port = ready['port']

    def stop(self):
        if self.process:
            if self.process.poll() is None:
                self.process.terminate()
            self.process.wait(timeout=10)
            for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
                stream.close()
            self.process = None

    def request(self, method='GET', path='/api/projects', body=None, headers=None):
        defaults = {'Authorization': 'Bearer ' + self.token}
        if body is not None:
            defaults['Content-Type'] = 'application/json'
        defaults.update(headers or {})
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            conn.request(method, path, body=body, headers=defaults)
            response = conn.getresponse()
            return response.status, json.loads(response.read())
        finally:
            conn.close()

    def test_http_create_survives_process_restart(self):
        self.start()
        status, body = self.request('POST', body=json.dumps({'name': 'Native editable poster'}))
        self.assertEqual(status, 201)
        record = body['project']
        self.assertEqual(record['name'], 'Native editable poster')
        self.stop()
        self.start()
        self.assertEqual(self.request(), (200, {'projects': [record]}))
        self.assertEqual(self.request(path='/api/projects/' + record['id']), (200, {'project': record}))

    def test_health_and_environment_are_read_only(self):
        self.start()
        status, health = self.request(path='/api/health')
        self.assertEqual(status, 200)
        self.assertEqual(health['status'], 'OK')
        self.assertEqual(health['scope'], 'project-metadata')
        self.assertEqual(self.request(path='/api/environment')[0], 200)
        self.assertEqual(self.request(), (200, {'projects': []}))
        self.assertFalse((self.root / '.project-local').exists())

    def test_workbench_assets_are_fixed_local_and_do_not_open_api_auth(self):
        self.start()
        for path, mime in (('/workbench', 'text/html'), ('/workbench/main.js', 'text/javascript'),
                           ('/workbench/style.css', 'text/css')):
            conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
            try:
                conn.request('GET', path)
                response = conn.getresponse()
                payload = response.read()
                self.assertEqual(response.status, 200)
                self.assertTrue(response.getheader('Content-Type').startswith(mime))
                self.assertIn("default-src 'none'", response.getheader('Content-Security-Policy'))
                self.assertGreater(len(payload), 100)
            finally:
                conn.close()
        self.assertEqual(self.request(headers={'Authorization': ''})[0], 401)
        for path in ('/workbench/../../AGENTS.md', '/workbench/main.ts', '/workbench?file=AGENTS.md'):
            self.assertEqual(self.request(path=path)[0], 404)
        self.assertEqual(self.request(path='/workbench', headers={'Host': 'evil.example'})[0], 403)
        self.assertFalse((self.root / '.project-local').exists())

    def test_untrusted_host_origin_and_missing_auth_cannot_write(self):
        self.start()
        for headers in ({'Host': 'evil.example'}, {'Origin': 'https://evil.example'},
                        {'Origin': 'null'}, {'Authorization': ''},
                        {'Authorization': 'Bearer invalid'}, {'Sec-Fetch-Site': 'cross-site'}):
            with self.subTest(headers=list(headers)):
                self.assertIn(self.request('POST', body='{"name":"forbidden"}', headers=headers)[0], (401, 403))
        self.assertFalse((self.root / '.project-local').exists())

    def test_same_origin_json_request_is_accepted(self):
        self.start()
        status, _ = self.request('POST', body='{"name":"allowed"}',
                                 headers={'Origin': f'http://127.0.0.1:{self.port}'})
        self.assertEqual(status, 201)

    def test_invalid_payloads_do_not_create_database(self):
        self.start()
        for body in ('{', '[]', '{"name":""}', '{"name":null}', '{"name":"ok","path":"escape"}',
                     '{"name":"one","name":"two"}'):
            with self.subTest(body=body):
                self.assertEqual(self.request('POST', body=body)[0], 400)
        self.assertEqual(self.request('POST', body='{"name":"bad"}',
                                      headers={'Content-Type': 'text/plain'})[0], 415)
        self.assertEqual(self.request('POST', body='x' * 17000)[0], 413)
        self.assertFalse((self.root / '.project-local').exists())

    def test_invalid_unicode_name_is_rejected_before_database_creation(self):
        self.start()
        self.assertEqual(self.request('POST', body='{"name":"\\ud800"}')[0], 400)
        self.assertFalse((self.root / '.project-local').exists())

    def test_ambiguous_headers_are_rejected(self):
        self.start()
        for extra, expected in (([('Host', 'evil.example')], 403),
                                ([('Content-Length', '2'), ('Content-Length', '2')], 400),
                                ([('Transfer-Encoding', 'chunked')], 400),
                                ([('Origin', 'null'), ('Origin', f'http://127.0.0.1:{self.port}')], 403)):
            conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
            try:
                conn.putrequest('POST', '/api/projects')
                conn.putheader('Authorization', 'Bearer ' + self.token)
                conn.putheader('Content-Type', 'application/json')
                for key, value in extra:
                    conn.putheader(key, value)
                conn.endheaders()
                response = conn.getresponse()
                self.assertEqual(response.status, expected)
                response.read()
            finally:
                conn.close()
        self.assertFalse((self.root / '.project-local').exists())

    def test_unknown_routes_and_methods_do_not_write(self):
        self.start()
        for path in ('/api/projects/absent', '/api/projects/../../AGENTS.md', '/api/projects?path=AGENTS.md'):
            self.assertEqual(self.request(path=path)[0], 404)
        self.assertEqual(self.request('DELETE')[0], 405)
        self.assertFalse((self.root / '.project-local').exists())

    def image_body(self, color='red', key='import-one'):
        from PIL import Image
        stream = io.BytesIO()
        Image.new('RGB', (16, 12), color).save(stream, format='PNG')
        data = stream.getvalue()
        return data, json.dumps({'content_base64': base64.b64encode(data).decode('ascii'),
                                 'idempotency_key': key})

    def test_real_image_import_receipt_content_and_restart(self):
        self.start()
        _, project = self.request('POST', body='{"name":"Image project"}')
        endpoint = '/api/projects/' + project['project']['id'] + '/assets'
        data, body = self.image_body()
        status, imported = self.request('POST', endpoint, body)
        self.assertEqual(status, 201)
        asset = imported['asset']
        self.assertEqual(asset['sha256'], 'sha256:' + hashlib.sha256(data).hexdigest())
        self.assertEqual(asset['rights'], 'NOT_REVIEWED')
        self.assertEqual(imported['attempt']['state'], 'RECEIPTED')
        self.assertEqual((asset['width'], asset['height']), (16, 12))
        self.stop()
        self.start()
        self.assertEqual(self.request(path=endpoint), (200, {'assets': [asset]}))
        self.assertEqual(self.request('POST', endpoint, body), (201, imported))
        status, content = self.request(path=endpoint + '/' + asset['id'] + '/content')
        self.assertEqual(status, 200)
        self.assertEqual(base64.b64decode(content['content_base64']), data)

    def test_import_key_conflict_does_not_publish_second_asset(self):
        self.start()
        _, project = self.request('POST', body='{"name":"Conflict project"}')
        endpoint = '/api/projects/' + project['project']['id'] + '/assets'
        _, body = self.image_body('red')
        self.assertEqual(self.request('POST', endpoint, body)[0], 201)
        _, changed = self.image_body('blue')
        self.assertEqual(self.request('POST', endpoint, changed)[0], 409)
        self.assertEqual(len(self.request(path=endpoint)[1]['assets']), 1)

    def test_invalid_image_and_cross_project_read_are_rejected(self):
        self.start()
        _, first = self.request('POST', body='{"name":"First"}')
        _, second = self.request('POST', body='{"name":"Second"}')
        endpoint = '/api/projects/' + first['project']['id'] + '/assets'
        for payload in ({'content_base64': 'not base64', 'idempotency_key': 'a'},
                        {'content_base64': base64.b64encode(b'<svg/>').decode(), 'idempotency_key': 'a'},
                        {'content_base64': '', 'idempotency_key': '../escape'}):
            self.assertEqual(self.request('POST', endpoint, json.dumps(payload))[0], 400)
        self.assertEqual(self.request(path=endpoint), (200, {'assets': []}))
        _, body = self.image_body()
        _, imported = self.request('POST', endpoint, body)
        foreign = '/api/projects/' + second['project']['id'] + '/assets/' + imported['asset']['id'] + '/content'
        self.assertEqual(self.request(path=foreign)[0], 404)

    def test_modified_published_image_cannot_reuse_success_receipt(self):
        self.start()
        _, project = self.request('POST', body='{"name":"Integrity"}')
        endpoint = '/api/projects/' + project['project']['id'] + '/assets'
        _, body = self.image_body()
        _, imported = self.request('POST', endpoint, body)
        files = list((self.root / '.project-local/projects' / project['project']['id']).glob('assets/versions/*/reference.png'))
        self.assertEqual(len(files), 1)
        files[0].write_bytes(b'corrupted synthetic fixture')
        self.assertEqual(self.request('POST', endpoint, body)[0], 409)
        self.assertEqual(self.request(path=endpoint + '/' + imported['asset']['id'] + '/content')[0], 409)

    def test_jpeg_import_preserves_original_encoded_bytes(self):
        from PIL import Image
        self.start()
        _, project = self.request('POST', body='{"name":"JPEG"}')
        endpoint = '/api/projects/' + project['project']['id'] + '/assets'
        stream = io.BytesIO()
        Image.new('RGB', (21, 15), 'blue').save(stream, format='JPEG')
        data = stream.getvalue()
        body = json.dumps({'content_base64': base64.b64encode(data).decode(), 'idempotency_key': 'jpeg'})
        status, imported = self.request('POST', endpoint, body)
        self.assertEqual(status, 201)
        self.assertEqual(imported['asset']['media_type'], 'image/jpeg')
        _, readback = self.request(path=endpoint + '/' + imported['asset']['id'] + '/content')
        self.assertEqual(base64.b64decode(readback['content_base64']), data)

    def test_task_history_survives_restart_and_is_project_scoped(self):
        self.start()
        _, first = self.request('POST', body='{"name":"Task owner"}')
        _, second = self.request('POST', body='{"name":"Other owner"}')
        root = '/api/projects/' + first['project']['id']
        other = '/api/projects/' + second['project']['id']
        self.assertEqual(self.request(path=root + '/tasks'), (200, {'tasks': [], 'next_cursor': None}))
        _, payload = self.image_body()
        _, imported = self.request('POST', root + '/assets', payload)
        job_id = imported['attempt']['job_id']
        self.stop()
        self.start()
        status, listing = self.request(path=root + '/tasks')
        self.assertEqual(status, 200)
        self.assertEqual(len(listing['tasks']), 1)
        task = listing['tasks'][0]
        self.assertEqual(task['job_id'], job_id)
        self.assertEqual(task['state'], 'SUCCEEDED')
        self.assertEqual(task['attempt']['state'], 'RECEIPTED')
        self.assertEqual(task['kind'], 'image-import')
        self.assertNotIn('note', task['attempt'])
        self.assertEqual(self.request(path=root + '/tasks/' + job_id), (200, {'task': task}))
        status, events = self.request(path=root + '/tasks/' + job_id + '/events')
        self.assertEqual(status, 200)
        self.assertEqual([e['to_state'] for e in events['events']], ['PENDING', 'RUNNING', 'RECEIPTED'])
        self.assertTrue(all('detail' not in e and 'evidence_json' not in e for e in events['events']))
        cursor = events['events'][-1]['event_no']
        self.assertEqual(self.request(path=root + '/tasks/' + job_id + '/events?after=' + str(cursor)),
                         (200, {'events': [], 'next_cursor': None}))
        self.assertEqual(self.request(path=other + '/tasks'), (200, {'tasks': [], 'next_cursor': None}))
        for tail in ('', '/events'):
            self.assertEqual(self.request(path=other + '/tasks/' + job_id + tail)[0], 404)
        self.assertEqual(self.request(path=root + '/tasks?after=' + job_id),
                         (200, {'tasks': [], 'next_cursor': None}))

    def test_task_reads_cannot_create_state_or_accept_ambiguous_cursors(self):
        self.start()
        root = '/api/projects/' + 'a' * 32 + '/tasks'
        for tail in ('', '/job-' + 'a' * 64, '/job-' + 'a' * 64 + '/events'):
            self.assertEqual(self.request(path=root + tail)[0], 404)
        for query in ('?after=../escape', '?after=x&after=y', '?limit=999999', '?after=%00'):
            self.assertEqual(self.request(path=root + query)[0], 404)
        self.assertFalse((self.root / '.project-local').exists())

    def test_task_pagination_latest_attempt_and_cancellation_are_not_flattened(self):
        from contextlib import closing
        from unittest.mock import patch
        sys.path.insert(0, str(ROOT / 'src'))
        self.addCleanup(lambda: sys.path.remove(str(ROOT / 'src')))
        from design_lab.service import ProjectService
        from design_lab.runtime import job_store as jobs
        with patch.dict(os.environ):
            os.environ.pop('PROJECT_LOCAL_ROOT', None)
            service = ProjectService(self.root)
            project = service.create_project('Paginated tasks')['id']
            scope = 'image-import:' + project
            with closing(jobs.connect(service.database, project_root=self.root)) as conn:
                for number in range(102):
                    job_id = 'job-' + f'{number:064x}'
                    jobs.begin_attempt(conn, job_id, operation_id='import-' + f'{number:064x}',
                                       idempotency_scope=scope, idempotency_key=str(number), request_hash='a' * 64)
                first = 'job-' + '0' * 64
                for _ in range(51):
                    attempt = jobs.latest_attempt(conn, first)
                    jobs.transition(conn, attempt['attempt_id'], 'FAILED', note='PRIVATE_TEST_SENTINEL')
                    jobs.retry_attempt(conn, first, previous_attempt_id=attempt['attempt_id'])
                attempt = jobs.latest_attempt(conn, first)
                jobs.transition(conn, attempt['attempt_id'], 'RUNNING')
                jobs.request_cancel(conn, attempt['attempt_id'])
            before = hashlib.sha256(service.database.read_bytes()).hexdigest()
        self.start()
        root = '/api/projects/' + project + '/tasks'
        status, page = self.request(path=root)
        self.assertEqual(status, 200)
        self.assertEqual(len(page['tasks']), 100)
        self.assertEqual(page['next_cursor'], 'job-' + f'{99:064x}')
        self.assertEqual(page['tasks'][0]['state'], 'CANCEL_REQUESTED')
        self.assertEqual(page['tasks'][0]['attempt']['state'], 'CANCEL_REQUESTED')
        self.assertEqual(page['tasks'][0]['attempt']['attempt_no'], 52)
        _, last = self.request(path=root + '?after=' + page['next_cursor'])
        self.assertEqual([t['job_id'] for t in last['tasks']], ['job-' + f'{n:064x}' for n in (100, 101)])
        self.assertIsNone(last['next_cursor'])
        _, events = self.request(path=root + '/' + first + '/events')
        self.assertEqual(len(events['events']), 100)
        self.assertIsNotNone(events['next_cursor'])
        _, tail = self.request(path=root + '/' + first + '/events?after=' + str(events['next_cursor']))
        combined = events['events'] + tail['events']
        self.assertEqual(len(combined), 105)
        self.assertEqual(len({e['event_no'] for e in combined}), 105)
        self.assertEqual(combined[-1]['to_state'], 'CANCEL_REQUESTED')
        self.assertNotIn('PRIVATE_TEST_SENTINEL', json.dumps(combined))
        self.stop()
        self.assertEqual(hashlib.sha256(service.database.read_bytes()).hexdigest(), before)


if __name__ == '__main__':
    unittest.main()
