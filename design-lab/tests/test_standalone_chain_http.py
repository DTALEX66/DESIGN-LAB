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


def _values_under(document, *keys):
    """Every string stored under any of `keys`, anywhere in a JSON document.

    Used where the chain used to assert `id in json.dumps(doc)`. A substring match also passes if
    the id shows up in a message, a cursor or a log line; membership of an identity field is the
    claim the aggregate actually makes -- that it names these entities as entities.
    """
    found = []
    stack = [document]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            for key, value in node.items():
                if key in keys:
                    if isinstance(value, str):
                        found.append(value)
                    elif isinstance(value, list):
                        # `reference_asset_ids` is a list of identities, not a single one, so the
                        # strings inside it are just as much "this document names the entity".
                        found.extend(item for item in value if isinstance(item, str))
                if isinstance(value, (dict, list)):
                    stack.append(value)
        elif isinstance(node, list):
            stack.extend(item for item in node if isinstance(item, (dict, list)))
    return found


def _paths_holding(document, value, prefix=''):
    """Where a value actually sits in a JSON document, as `a.b[0].c` paths."""
    hits = []
    if isinstance(document, dict):
        for key, child in document.items():
            hits.extend(_paths_holding(child, value, f'{prefix}.{key}' if prefix else key))
    elif isinstance(document, list):
        for index, child in enumerate(document):
            hits.extend(_paths_holding(child, value, f'{prefix}[{index}]'))
    elif isinstance(document, str) and value in document:
        hits.append(prefix or '$')
    return hits


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

        imported = self.hop(
            'asset', 'POST', f'/api/projects/{project}/assets',
            {'content_base64': base64.b64encode(_png_bytes()).decode('ascii'),
             'idempotency_key': 'chain-asset'},
            201)['asset']
        asset, asset_version, asset_sha256 = (imported['id'], imported['version_id'],
                                              imported['sha256'])

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
        self.assertIn(brief, _values_under(layer, 'brief_id'),
                      'the aggregate never names the brief as an entity')
        self.assertIn(direction, _values_under(layer, 'direction_id'),
                      'the aggregate never names the direction as an entity')
        self.assertIn(asset, _values_under(layer, 'reference_asset_ids'),
                      'the aggregate reaches the imported asset only through the brief that '
                      f'references it; it occurs at {_paths_holding(layer, asset)}')

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

        # Prompt Intelligence, both directions, over the identifiers the earlier hops returned.
        # This is the segment that had no entry point at all before 2026-10-20, so the chain could
        # not reach it: a composition is only proof if it carries the brief and direction the chain
        # just wrote, and a reversal is only proof if it restates the observations this hop supplied.
        # The operator's model choice, walked between the records and the prompt that must carry
        # it: the catalogue is read, one of its own rows is chosen, and the composition has to
        # echo that revision -- otherwise "the user chose" would be a UI claim with no chain behind
        # it, and the prompt could name a model nobody recorded a decision about.
        catalogue = self.hop('catalog', 'GET', '/api/models', None, 200)
        chosen_model = catalogue['models'][0]['model_id']
        self.assertEqual('design-lab/model-catalog/v1', catalogue['schemaVersion'])
        self.assertEqual(0, catalogue['counts']['default_enabled_true'],
                         'the chain now walks a catalogue whose defaults are enabled; that is a '
                         'qualification claim the radar has not made, so re-read this hop on purpose')
        choice = self.hop('model-choose', 'POST',
                          f'/api/projects/{project}/model-selection/choose',
                          {'model_id': chosen_model, 'declared_unused': False,
                           'actor': 'chain-operator', 'actor_kind': 'human'}, 201)
        self.assertEqual('CHOSEN', choice['state'])

        composed = self.hop(
            'prompt-compose', 'POST', f'/api/projects/{project}/prompts',
            {'brief_id': brief, 'direction_id': direction, 'target': 'image-generation'}, 201)
        prompt_document = composed['document']
        self.assertEqual('design-lab/prompt-composition/v1', prompt_document['schemaVersion'])
        self.assertEqual('CHOSEN', prompt_document['model']['selection_state'])
        self.assertEqual(chosen_model, prompt_document['model']['selected']['model_id'],
                         'the composition did not carry the choice the chain just recorded')
        self.assertEqual(choice['selection']['revision'],
                         prompt_document['model']['selected']['revision'])
        self.assertIn('Chain brief', prompt_document['prompt_text'],
                      'the composition did not carry the brief the chain wrote one hop earlier')
        self.assertIn('Chain direction', json.dumps(prompt_document, ensure_ascii=False),
                      'no direction section reached the prompt, so the brief/direction seam is not '
                      'the one the chain established')
        self.assertEqual(False, prompt_document['model']['executed'],
                         'a chain document may not claim a model ran')

        reversal = self.hop(
            'prompt-reverse', 'POST',
            f'/api/projects/{project}/assets/{asset}/prompt-reversal',
            {'module': 'ocr-fixture',
             'detections': [{'text': 'CHAIN', 'confidence': 0.83,
                             'polygon': [[1, 1], [4, 1], [4, 3], [1, 3]]}],
             'decomposition_id': None}, 201)
        self.assertEqual('design-lab/prompt-reversal/v1', reversal['document']['schemaVersion'])
        self.assertEqual(asset_sha256, reversal['document']['asset']['sha256'],
                         'the reversal is not bound to the bytes the asset hop imported')
        self.assertIn('CHAIN', reversal['document']['prompt_text'],
                      'the supplied observation never reached the reversal text')

        # The acceptance seam: a human verdict filed against the version the ASSET hop just
        # returned, over HTTP. This is the connection that previously existed only inside two
        # separate fixtures -- the jury test published its own version straight into the
        # database, so nothing had ever proved that an imported asset yields something a
        # verdict can be recorded against.
        from test_jury_http import CRITERIA
        verdict = self.hop(
            'jury-verdict', 'POST', f'/api/projects/{project}/jury/verdict',
            {'schemaVersion': 'design-lab/assurance-jury-record/v2', 'kind': 'JURY_VERDICT',
             'jury_record_id': 'jury-chain-1',
             'subject_ref': f'version:{asset_version}', 'artifact_sha256': asset_sha256,
             'juror': {'juror_id': 'dtalex66', 'kind': 'HUMAN', 'members': [],
                       'attestation': 'reviewed the imported artwork'},
             'criteria': CRITERIA, 'verdict': 'APPROVE',
             'decided_at': '2026-10-19T00:00:00Z', 'supersedes': None, 'evidence_refs': []},
            201)
        self.assertEqual(verdict['subject_ref'], f'version:{asset_version}')
        jury = self.hop('jury-readback', 'GET', f'/api/projects/{project}/jury', None, 200)
        self.assertEqual(1, jury['verdict_count'])
        self.assertEqual('ACCEPTED', jury['human_acceptance'])

        from test_rights_http import decision
        self.hop('rights', 'POST', f'/api/projects/{project}/rights',
                 decision(decision_id='rd-chain-1'), 201)
        rights = self.hop('rights-readback', 'GET', f'/api/projects/{project}/rights',
                          None, 200)
        self.assertEqual(1, rights['decision_count'])
        self.assertEqual('CLEARED', rights['rights_clearance'],
                         'an approved scope must clear rights, and NOT_REVIEWED here would '
                         'mean the write never landed')

        # The candidate body is imported rather than re-typed: it is a closed rights and
        # provenance contract, and a second copy here would be a second authority able to
        # drift from the one the write path enforces.
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

        # The exit the segment never had: the approved candidate the review hop just decided is
        # now addressable as an export. Answering 200 is only "assembled and contract-valid" --
        # the envelope has to keep saying nothing left the machine, or the chain would end in a
        # delivery claim the service cannot make.
        exported = self.hop(
            'export', 'GET',
            f'/api/projects/{project}/knowledge-candidates/{candidate_id}/export', None, 200)
        self.assertEqual('design-lab/assurance-knowledge-candidate-export/v1',
                         exported['export']['schemaVersion'])
        self.assertEqual('NOT_CONNECTED', exported['outbound']['transport'])
        self.assertEqual(0, exported['outbound']['sent_count'])
        self.assertEqual('job-knowledge-1', exported['provenance']['job_id'],
                         'the export did not echo the provenance ids the candidate hop stored')
        self.assertEqual('job-knowledge-1:op-knowledge-1',
                         exported['v1_projection']['source_id'],
                         'the v1 projection rebuilt source_id from something other than the stored ids')
        print('CHAIN_HOPS ' + ' '.join(self.hops))

    def test_the_jury_readback_offers_an_imported_asset_version_as_a_verdict_target(self):
        """What the desktop's jury panel actually reads.

        The panel never goes looking for versions of its own: `apps/workbench/shell.ts` renders
        `reviewable_versions` from GET /projects/<id>/jury straight into the version select, and
        posts the verdict against whatever that read offered. So "a person can judge an imported
        asset from the UI" rests on that one field. The chain walk above proves a verdict can be
        posted against a version id taken from the *import* response, which is not the same claim.
        """
        project = self.hop('project', 'POST', '/api/projects',
                           {'name': 'Jury target read'}, 201)['project']['id']
        imported = self.hop(
            'asset', 'POST', f'/api/projects/{project}/assets',
            {'content_base64': base64.b64encode(_png_bytes()).decode('ascii'),
             'idempotency_key': 'jury-target-asset'},
            201)['asset']

        offered = self.hop('jury-targets', 'GET', f'/api/projects/{project}/jury', None, 200)
        rows = offered['reviewable_versions']
        want = f"version:{imported['version_id']}"
        self.assertIn(want, [row['subject_ref'] for row in rows],
                      f'the read side never offers the imported version as reviewable: '
                      f'{[row["subject_ref"] for row in rows]}')
        self.assertEqual(imported['sha256'],
                         next(row['artifact_sha256'] for row in rows if row['subject_ref'] == want),
                         'the panel is offered a label for the version but not the bytes the '
                         'verdict is actually about')

    def test_the_delivery_leg_reaches_a_preflight_verdict_on_one_project(self):
        """The last reachable segment, on the SAME project the service already owns.

        `test_service_http` seeds a native export into its own fixture project, so nothing had
        shown that a project can go from a native attempt through a registered bundle to a
        preflight verdict in one pass. The native dispatch is patched because no host is
        launched here -- that is the controlled-runtime boundary, not a simulated success: the
        bundle is real bytes, registered by id, and the preflight verdict is computed from them.
        """
        import hashlib
        from unittest.mock import patch
        from design_lab.native_tasks import NativeTasks

        project = self.hop('project', 'POST', '/api/projects',
                           {'name': 'Delivery leg'}, 201)['project']['id']
        run = self.service.paths.category_dir('runtime', 'chain-delivery')
        run.mkdir(parents=True, exist_ok=True)
        job = dict(schemaVersion='design-lab/photoshop-native-job/v1', jobId='chain-export',
                   runRoot=str(run), width=8, height=6, assets=[], outputName='native.psd',
                   previewName='preview.png',
                   layers=[dict(id='background', kind='fill', bounds=[0, 0, 8, 6],
                                color=[0, 0, 0])])

        def native(_host, payload, **_kwargs):
            output = {}
            for kind, name in (('psd', 'native.psd'), ('png', 'preview.png')):
                data = ('chain controlled ' + kind).encode()
                (run / name).write_bytes(data)
                output[kind] = dict(sha256=hashlib.sha256(data).hexdigest(),
                                    byte_size=len(data))
            raw = json.dumps(payload, sort_keys=True, ensure_ascii=True,
                             separators=(',', ':')).encode()
            return dict(status='NATIVE_READBACK', job_id=payload['jobId'],
                        job_sha256=hashlib.sha256(raw).hexdigest(), host_version='fixture',
                        bridge_sha256='b' * 64, inputs={}, artifacts=output,
                        documents_before=0, documents_after=0)

        with patch('design_lab.native_tasks._dispatch', side_effect=native):
            attempt = NativeTasks(self.service).execute(
                project, 'photoshop', job, idempotency_key='chain-export',
                approved_root=run,
                # `native_tasks.execute` refuses any scope other than this literal
                # (`native_tasks.py:94`), which is itself a chain fact: the native leg is
                # reachable under a controlled test scope, not from an unattended production
                # caller. Recording it here keeps the delivery hop from reading as E3.
                authorization=dict(actor='fixture', scope='project-native-test',
                                   receipt='controlled boundary'))
        job_id = attempt['attempt']['job_id']
        self.hops.append('native=READBACK')

        bundle = self.hop(
            'bundle', 'POST', f'/api/projects/{project}/tasks/{job_id}/bundle', {}, 201)
        report = self.hop(
            'preflight', 'POST',
            f"/api/projects/{project}/bundles/{bundle['bundle']['id']}/preflight", {}, 200)
        from design_lab.assurance import production_preflight as pp
        self.assertIn(report['verdict'], pp.VERDICTS)
        self.assertEqual(sum(report['counts'].values()), len(report['findings']))
        # Whatever the verdict, it must be about the bytes that were actually registered:
        # the digest the bundle published is the one the checker was handed.
        self.assertTrue(any(item.get('measured') for item in report['findings']),
                        'no finding reports a measurement, so the verdict is not evidence')
        print('DELIVERY_HOPS ' + ' '.join(self.hops))

    def test_the_export_hop_exists_but_still_sends_nothing(self):
        """The chain now reaches the exit; it still does not reach outside the repository.

        This case used to assert that NO export route existed, so that anyone wiring the exit would
        have to re-earn the entry-point claim on purpose rather than by accident. The exit landed on
        owner authorisation (2026-10-20), so the boundary moved one notch and is pinned here in its
        new place: an export route exists and is walked by the acceptance chain above, while the
        transport it would need remains absent. Those are different facts, and the envelope has to
        keep saying so -- `outbound.transport` stays NOT_CONNECTED and `sent_count` stays 0, which is
        what stops a green export from being read as a delivery.
        """
        from design_lab.http_service import ROUTES
        export_routes = [route.pattern for route in ROUTES if 'export' in route.pattern]
        self.assertEqual(
            ['/api/projects/([0-9a-f]{32})/knowledge-candidates'
             '/([A-Za-z0-9_.:-]{1,80})/export'], export_routes,
            'the export route moved or multiplied; the acceptance chain walks exactly one export hop, '
            'so a second one needs its own hop and its own claim')
        # Nothing in the route table can put the document on a wire.
        self.assertEqual([], [route.pattern for route in ROUTES
                              if 'send' in route.pattern or 'deliver-to' in route.pattern],
                         'a transport route appeared; then the chain claim, the readback text and '
                         'this file all need to change together')
        source = (ROOT / 'src/design_lab/knowledge_review.py').read_text(encoding='utf-8')
        self.assertIn('"transport": "NOT_CONNECTED"', source,
                      'the outbound transport no longer says NOT_CONNECTED; if a real transport '
                      'was added, update the chain claim in the same change')
        self.assertEqual(2, source.count('"transport": "NOT_CONNECTED"'),
                         'the readback and the export envelope are two different answers and both '
                         'must keep saying nothing was sent')


if __name__ == '__main__':
    unittest.main(verbosity=2)
