# SPDX-License-Identifier: MIT
"""Loopback-only metadata transport; no host execution or arbitrary file API."""
import hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import re
import sqlite3
from urllib.parse import parse_qsl, urlsplit

from . import __version__
from .runtime.asset_store import AssetError
from .runtime.paths import PathPolicyError
from .image_assets import ImageAssets, ImageAssetError
from .task_queries import TaskQueries
from .task_commands import TaskCommands
from .native_submissions import NativeSubmissions
from .native_patch_submissions import NativePatchSubmissions
from .native_tasks import NativeTaskError
from .native_workers import NativeWorkers
from .native_assets import Bundles, NativeAssets
from .native_delivery import NativeDelivery
from .design_layer import (DesignLayer, DesignLayerError, DESIGN_SYSTEM_NAME_PATTERN,
                           TOKEN_WRITE_FIELDS)
from .jury_review import JuryReview, JuryReviewError
from .rights_review import RightsReview, RightsReviewError, write_fields
from .research_review import (ResearchReview, ResearchReviewError,
                              write_fields as research_write_fields)
from .assurance.production_preflight import PreflightError, preflight_bundle
from . import workbench


class RequestError(ValueError):
    def __init__(self, status, code):
        self.status, self.code = status, code


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON key')
        result[key] = value
    return result


def make_server(service, token, port=0, *, local_session=False):
    """Caller owns server lifetime; token is supplied in memory, never logged.

    `local_session` is the official personal launcher's handshake: the page this
    server itself opened may ask for the token, so nobody has to copy it out of a
    terminal. It is not an account system and not an auth relaxation -- see the
    `/api/local-session` handler for exactly who is answered.
    """
    if not isinstance(token, str) or not re.fullmatch(r'[0-9a-f]{64}', token):
        raise ValueError('INVALID_SERVICE_TOKEN')
    if type(port) is not int or not 0 <= port <= 65535:
        raise ValueError('INVALID_SERVICE_PORT')
    workers = NativeWorkers(service)

    class Handler(BaseHTTPRequestHandler):
        server_version = 'DESIGN-LAB'
        sys_version = ''

        def setup(self):
            self.request.settimeout(3)
            super().setup()

        def log_message(self, format, *args):
            # Request targets and payloads are not audit-safe diagnostic logs.
            pass

        def send_json(self, status, value):
            self.drain_body()
            payload = json.dumps(value, ensure_ascii=True).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Connection', 'close')
            self.end_headers()
            self.close_connection = True
            self.wfile.write(payload)

        def drain_body(self):
            """Discard an unconsumed request body so the socket closes with FIN.

            ``guard()`` / ``body()`` can fail before the client's body bytes are
            read. Closing a socket that still has unread data in its receive
            buffer makes the kernel reset the connection, so a client awaiting
            the error response sees connection-aborted (WinError 10053) instead
            of the deterministic 4xx. Best-effort: any failure here is ignored;
            repeated calls are no-ops.
            """
            if self.command not in ('POST', 'PUT', 'PATCH'):
                return
            lengths = self.headers.get_all('Content-Length', [])
            if len(lengths) != 1 or not re.fullmatch(r'[0-9]{1,8}', lengths[0]):
                return
            remaining = int(lengths[0]) - getattr(self, '_body_read', 0)
            while remaining > 0:
                chunk = self.rfile.read(min(remaining, 65536))
                if not chunk:
                    break
                remaining -= len(chunk)

        def guard(self, require_auth=True):
            authority = f'127.0.0.1:{self.server.server_port}'
            if self.headers.get_all('Host', []) != [authority]:
                raise RequestError(403, 'HOST_DENIED')
            origins = self.headers.get_all('Origin', [])
            if origins and origins != ['http://' + authority]:
                raise RequestError(403, 'ORIGIN_DENIED')
            sites = self.headers.get_all('Sec-Fetch-Site', [])
            if sites and sites not in (['same-origin'], ['none']):
                raise RequestError(403, 'CROSS_SITE_DENIED')
            if not require_auth:
                return
            auth = self.headers.get_all('Authorization', [])
            if (len(auth) != 1 or not hmac.compare_digest(
                    auth[0].encode('utf-8'), ('Bearer ' + token).encode('ascii'))):
                raise RequestError(401, 'UNAUTHORIZED')

        def body(self, *, fields=frozenset({'name'}), limit=16384):
            if self.headers.get_all('Transfer-Encoding', []):
                raise RequestError(400, 'TRANSFER_ENCODING_DENIED')
            lengths = self.headers.get_all('Content-Length', [])
            if len(lengths) != 1 or not re.fullmatch(r'[0-9]{1,8}', lengths[0]):
                raise RequestError(400, 'INVALID_CONTENT_LENGTH')
            size = int(lengths[0])
            if size > limit:
                raise RequestError(413, 'BODY_TOO_LARGE')
            types = self.headers.get_all('Content-Type', [])
            if types not in (['application/json'], ['application/json; charset=utf-8']):
                raise RequestError(415, 'JSON_REQUIRED')
            data = self.rfile.read(size)
            self._body_read = len(data)
            if len(data) != size:
                raise RequestError(400, 'INCOMPLETE_BODY')
            try:
                value = json.loads(data.decode('utf-8'), object_pairs_hook=_unique_object)
            except (ValueError, UnicodeError, RecursionError):
                raise RequestError(400, 'INVALID_JSON') from None
            if not isinstance(value, dict) or set(value) != fields:
                raise RequestError(400, 'INVALID_PROJECT_FIELDS')
            return value

        def dispatch(self):
            try:
                if (self.command == 'GET' and self.path == '/api/local-session'
                        and local_session):
                    self.guard(require_auth=False)
                    # `guard` already pins Host to 127.0.0.1:<port> (which is what
                    # stops DNS rebinding) and allows an absent Sec-Fetch-Site.
                    # Absent is not enough here: any local process can forge that,
                    # so only a browser that this very server served is answered.
                    if self.headers.get_all('Sec-Fetch-Site', []) != ['same-origin']:
                        raise RequestError(403, 'SAME_ORIGIN_REQUIRED')
                    return self.send_json(200, {'token': token})
                if self.command == 'GET' and self.path in workbench.ROUTES:
                    self.guard(require_auth=False)
                    payload, mime = workbench.resource(self.path)
                    if local_session and self.path == '/workbench':
                        # The page asks for the session only when its own server
                        # says auto-connect is on; a bundle copied elsewhere must not
                        # knock on a door that will never answer.
                        payload = payload.replace(b'<body>', b'<body data-local-session="auto">', 1)
                    self.send_response(200)
                    self.send_header('Content-Type', mime + '; charset=utf-8')
                    self.send_header('Content-Length', str(len(payload)))
                    self.send_header('Content-Security-Policy', workbench.CSP)
                    self.send_header('X-Content-Type-Options', 'nosniff')
                    self.send_header('Referrer-Policy', 'no-referrer')
                    self.send_header('Cache-Control', 'no-store')
                    self.send_header('Connection', 'close')
                    self.end_headers()
                    self.close_connection = True
                    self.wfile.write(payload)
                    return
                self.guard()
                if self.command == 'GET':
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/bundles/(bundle-native-[0-9a-f]{64})/versions/(v-[0-9a-f]{32})/content',self.path)
                    if match:
                        with NativeDelivery(service).content(*match.groups()) as (stream,size,digest):
                            self.send_response(200)
                            self.send_header('Content-Type','application/zip')
                            self.send_header('Content-Disposition','attachment; filename="design-lab-delivery.zip"')
                            self.send_header('Content-Length',str(size))
                            self.send_header('X-Content-SHA256',digest)
                            self.send_header('X-Content-Type-Options','nosniff')
                            self.send_header('Cache-Control','no-store')
                            self.send_header('Connection','close')
                            self.end_headers();self.close_connection=True
                            try:
                                for block in iter(lambda:stream.read(1024*1024),b''):
                                    self.wfile.write(block)
                            except OSError:
                                # Headers are already sent; never append JSON to
                                # a truncated ZIP stream. Client verifies length/hash.
                                return
                        return
                    # The DeliveryReceipt V2 the `delivery-receipt` CLI verb reads
                    # (cli.py), now readable over the same boundary NativeDelivery
                    # already owns. Nothing is caught and re-raised here on purpose:
                    # NativeDelivery.receipt verifies the persisted document and its
                    # own digest on every read, and dispatch() maps ImageAssetError by
                    # its status AND code two clauses above the generic ValueError
                    # one. So a version that was never receipted stays
                    # 404 DELIVERY_RECEIPT_NOT_FOUND ("we wrote no document about this
                    # delivery") while a stored document its own bytes contradict
                    # stays 409 DELIVERY_RECEIPT_UNVERIFIED ("we refuse to certify
                    # these"). Folding either into INVALID_REQUEST would read as a bad
                    # request the operator could go back and fix, which is a different
                    # fact about different bytes.
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/bundles/(bundle-native-[0-9a-f]{64})/versions/(v-[0-9a-f]{32})/receipt',self.path)
                    if match:
                        # The envelope, not the bare document: a receipt's rollback record names an
                        # immutable source version and nothing used to look it up on the way out.
                        # The document itself is still returned byte-for-byte under `receipt`, so
                        # its self-digest keeps describing exactly the bytes it covers.
                        return self.send_json(200,NativeDelivery(service).readback(*match.groups()))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/native-assets(?:\?after=(native-[0-9a-f]{64}))?',self.path)
                    if match:
                        return self.send_json(200,NativeAssets(service).list(match[1],match[2] or ''))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/native-assets/(native-[0-9a-f]{64})/verify',self.path)
                    if match:
                        return self.send_json(200,NativeAssets(service).verify(*match.groups()))
                    # Project bundle/delivery list: read-back of the project's design
                    # bundles (its deliveries). The Bundles query class landed in
                    # native_assets.py first (tests only); this route is what makes
                    # it reachable from the service and the workbench UI.
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/bundles',self.path)
                    if match:
                        return self.send_json(200,Bundles(service).list(match[1]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/tasks(?:\?after=((?:native-)?job-[0-9a-f]{64}))?', self.path)
                    if match:
                        return self.send_json(200, TaskQueries(service).list(match[1], match[2] or ''))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/tasks/((?:native-)?job-[0-9a-f]{64})(/events)?(?:\?after=([0-9]{1,16}))?', self.path)
                    if match and (match[3] or match[4] is None):
                        query = TaskQueries(service)
                        return self.send_json(200, query.events(match[1], match[2], int(match[4] or 0))
                                              if match[3] else query.get(match[1], match[2]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/assets(?:/(img-[0-9a-f]{64})/content)?', self.path)
                    if match:
                        images = ImageAssets(service)
                        return self.send_json(200, images.content(*match.groups()) if match[2] else
                                              {'assets': images.list(match[1])})
                    if self.path == '/api/health':
                        # bundleSha256/bundleOrigin are not decoration: an installed
                        # wheel copy of the UI wins over the checkout, so this is how
                        # an operator (and the wheel-install gate) sees WHICH bytes
                        # are actually being served.
                        return self.send_json(200, {'status': 'OK', 'version': __version__,
                                                    'scope': 'project-metadata',
                                                    'bundleSha256': workbench.served_bundle_sha256(),
                                                    'bundleOrigin': workbench.bundle_origin()})
                    if self.path == '/api/environment':
                        return self.send_json(200, service.paths.describe())
                    if self.path == '/api/capabilities':
                        # UI plan: the capability library is a read-only projection of
                        # the source lock, the vendor revision record and the model
                        # radar. It installs, qualifies and licenses nothing, and it
                        # reads the committed records, never a machine-local cache.
                        from .analysis.capability_library import build
                        return self.send_json(200, build())
                    if self.path == '/api/domains':
                        # Same class of read as /api/capabilities: committed repository
                        # records, not project or machine state, so the root is the
                        # package's own repository root. Domain Pack SPEC V2 asks for a
                        # structural check, and this serves the verdict
                        # design-lab/scripts/verify_domain_pack_v2.py itself gives each
                        # pack -- a read path with its own copy of the rules would be a
                        # second authority able to disagree with CI. Read-only by design:
                        # no POST/PUT/DELETE form of this path is dispatched below.
                        from . import domain_packs
                        return self.send_json(200, domain_packs.build())
                    if urlsplit(self.path).path == '/api/task-preflight':
                        # DL-AUDIT-20260914-04: the same preflight the CLI doctor
                        # uses, so workbench and CLI can never disagree. Read-only.
                        # FA-11 (DL-TP-20260918-UCR-014): parse the query with a real
                        # URL parser (urlsplit + parse_qsl), not string surgery. Match
                        # on the path component so a present query no longer 404s; a
                        # missing/empty `task` maps to TASK_REQUIRED and a malformed
                        # task to TASK_PREFLIGHT_REJECTED (never the other way round).
                        from .runtime.task_resources import TaskResourceError, preflight
                        params = dict(parse_qsl(urlsplit(self.path).query, keep_blank_values=True))
                        task = params.get('task', '')
                        if not task:
                            raise RequestError(400, 'TASK_REQUIRED')
                        try:
                            value = preflight(service.paths.project_root, task,
                                              paths_describe=service.paths.describe())
                        except TaskResourceError:
                            return self.send_json(400, {'error': 'TASK_PREFLIGHT_REJECTED'})
                        return self.send_json(200, value)
                    if self.path == '/api/projects':
                        return self.send_json(200, {'projects': service.list_projects()})
                    layer = DesignLayer(service)
                    if self.path == '/api/design-systems':
                        return self.send_json(200, layer.design_systems())
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/design-layer', self.path)
                    if match:
                        return self.send_json(200, layer.get_design_layer(match[1]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/jury', self.path)
                    if match:
                        return self.send_json(200, JuryReview(service).list(match[1]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/rights', self.path)
                    if match:
                        # The rights read-back is the same class of read as /jury: what a
                        # human filed, what stands now, and the clearance word the stored
                        # rows actually support. An empty ledger answers 200 with
                        # NOT_REVIEWED rather than a 404 the page would have to guess at.
                        return self.send_json(200, RightsReview(service).list(match[1]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/research', self.path)
                    if match:
                        # Same class of read again, with one deliberate difference: research
                        # has NO project-level verdict word to publish, so an empty panel
                        # answers 200 with counts of zero and `research_verdict` null rather
                        # than a 404 the page would have to invent a word for, and rather than
                        # a "cleared"-shaped field that would read as a gate nobody put here.
                        return self.send_json(200, ResearchReview(service).list(match[1]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/briefs(?:\?after=(brief-[0-9a-f]{32}))?', self.path)
                    if match:
                        return self.send_json(200, layer.list_briefs(match[1], match[2] or ''))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/briefs/(brief-[0-9a-f]{32})', self.path)
                    if match:
                        return self.send_json(200, layer.get_brief(*match.groups()))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions(?:\?after=(direction-[0-9a-f]{32}))?', self.path)
                    if match:
                        return self.send_json(200, layer.list_directions(match[1], after=match[2] or ''))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions/(direction-[0-9a-f]{32})', self.path)
                    if match:
                        return self.send_json(200, layer.get_direction(*match.groups()))
                    # F-2a lineage reads. The project-scoped form is the one that
                    # can name a foreign project (its 404 is the cross-project
                    # boundary); the id-scoped form resolves the owner from the
                    # record itself and fails closed on an unknown id.
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/briefs/(brief-[0-9a-f]{32})/lineage', self.path)
                    if match:
                        return self.send_json(200, layer.lineage_brief(*match.groups()))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions/(direction-[0-9a-f]{32})/lineage', self.path)
                    if match:
                        return self.send_json(200, layer.lineage_direction(*match.groups()))
                    match = re.fullmatch(r'/api/design-briefs/(brief-[0-9a-f]{32})/lineage', self.path)
                    if match:
                        return self.send_json(200, layer.lineage_brief(
                            layer.project_of_brief(match[1]), match[1]))
                    match = re.fullmatch(r'/api/design-directions/(direction-[0-9a-f]{32})/lineage', self.path)
                    if match:
                        return self.send_json(200, layer.lineage_direction(
                            layer.project_of_direction(match[1]), match[1]))
                    # Design-system TOKEN documents (W06 G1/G2/G3). The list form is
                    # what the workbench column reads, so an empty ledger answers an
                    # empty list rather than a 404 the page would have to guess at.
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/design-system-tokens', self.path)
                    if match:
                        return self.send_json(200, layer.list_token_documents(match[1]))
                    match = re.fullmatch(
                        r'/api/projects/([0-9a-f]{32})/design-system-tokens/('
                        + DESIGN_SYSTEM_NAME_PATTERN + r')(/lineage)?', self.path)
                    if match:
                        return self.send_json(200, layer.token_lineage(match[1], match[2])
                                              if match[3] else layer.get_tokens(match[1], match[2]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})', self.path)
                    if match:
                        project = service.get_project(match[1])
                        if project is not None:
                            return self.send_json(200, {'project': project})
                    raise RequestError(404, 'NOT_FOUND')
                if self.command == 'POST':
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/tasks/(native-job-[0-9a-f]{64})/patch',self.path)
                    if match:
                        value=self.body(fields={'source_attempt_id','patch','idempotency_key'},limit=1_000_000)
                        return self.send_json(202,NativePatchSubmissions(service).submit(*match.groups(),**value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/tasks/(native-job-[0-9a-f]{64})/run',self.path)
                    if match:
                        value=self.body(fields={'attempt_id'})
                        return self.send_json(202,workers.start(*match.groups(),value['attempt_id']))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/native-plans',self.path)
                    if match:
                        value=self.body(fields={'host','rir','text_styles','idempotency_key'},limit=4_000_000)
                        return self.send_json(202,NativeSubmissions(service).submit(match[1],**value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/tasks/(native-job-[0-9a-f]{64})/cancel',self.path)
                    if match:
                        value = self.body(fields={'attempt_id'})
                        return self.send_json(202,TaskCommands(service).cancel(*match.groups(),value['attempt_id']))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/tasks/(native-job-[0-9a-f]{64})/bundle',self.path)
                    if match:
                        self.body(fields=set())
                        return self.send_json(201,NativeDelivery(service).create(*match.groups()))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/assets', self.path)
                    if match:
                        value = self.body(fields={'content_base64', 'idempotency_key'}, limit=45_000_256)
                        return self.send_json(201, ImageAssets(service).import_image(match[1], **value))
                    layer = DesignLayer(service)
                    match = re.fullmatch(
                        r'/api/projects/([0-9a-f]{32})/bundles'
                        r'/(bundle-native-[0-9a-f]{64})/preflight'
                        r'(?:\?profile=(print|digital|video))?', self.path)
                    if match:
                        # The bundle is resolved from the state database by id and
                        # restricted to this project; no path arrives from the page.
                        # The profile is validated here rather than trusted downstream.
                        return self.send_json(200, preflight_bundle(
                            service, match[1], match[2], profile=match[3] or 'digital'))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/jury/verdict', self.path)
                    if match:
                        # The exact key set is the point: an unknown field is refused
                        # rather than silently dropped, and `juror`/`criteria` stay
                        # nested for the contract layer to validate.
                        value = self.body(fields={
                            'schemaVersion', 'kind', 'jury_record_id', 'subject_ref',
                            'artifact_sha256', 'juror', 'criteria', 'verdict',
                            'decided_at', 'supersedes', 'evidence_refs'}, limit=65536)
                        return self.send_json(201, JuryReview(service).record_verdict(
                            match[1], value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/jury/proposal', self.path)
                    if match:
                        value = self.body(fields={
                            'schemaVersion', 'kind', 'proposal_id', 'subject_ref',
                            'artifact_sha256', 'proposer', 'criteria', 'suggested_verdict',
                            'rationale', 'created_at'}, limit=65536)
                        return self.send_json(201, JuryReview(service).record_proposal(
                            match[1], value))
                    match = re.fullmatch(
                        r'/api/projects/([0-9a-f]{32})/rights'
                        r'(?:\?supersedes=([A-Za-z0-9_.:-]{1,80}))?', self.path)
                    if match:
                        # Exact key set, loaded from the contract itself (rights_review
                        # .write_fields) rather than restated here: an unknown field is
                        # refused rather than silently dropped, and a supersession link is
                        # a column on the row, not a document field the closed schema never
                        # declared. Superseding is how a human withdraws an approval without
                        # editing history.
                        value = self.body(fields=write_fields(), limit=65536)
                        return self.send_json(201, RightsReview(service).record(
                            match[1], value, supersedes=match[2]))
                    match = re.fullmatch(
                        r'/api/projects/([0-9a-f]{32})/research'
                        r'(?:\?supersedes=([A-Za-z0-9_.:-]{1,80}))?', self.path)
                    if match:
                        # Exact key set again, loaded from the research-finding contract
                        # (research_review.write_fields) rather than restated here, so an
                        # unknown field is refused instead of dropped -- including the
                        # `schemaVersion` a caller of the rights or jury routes would send by
                        # habit, which this closed contract does not declare. A supersede link
                        # is a column on the row, never a document field.
                        value = self.body(fields=research_write_fields(), limit=65536)
                        return self.send_json(201, ResearchReview(service).record(
                            match[1], value, supersedes=match[2]))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/briefs', self.path)
                    if match:
                        value = self.body(fields={'title', 'goals', 'constraints', 'reference_asset_ids', 'idempotency_key'})
                        return self.send_json(201, layer.create_brief(match[1], **value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions', self.path)
                    if match:
                        value = self.body(fields={'brief_id', 'title', 'style_notes', 'color_mood', 'typography_mood', 'idempotency_key'})
                        return self.send_json(201, layer.create_direction(match[1], **value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions/(direction-[0-9a-f]{32})/choose', self.path)
                    if match:
                        value = self.body(fields={'actor', 'actor_kind', 'idempotency_key'})
                        return self.send_json(200, layer.choose_direction(match[1], match[2], **value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions/(direction-[0-9a-f]{32})/bind', self.path)
                    if match:
                        value = self.body(fields={'design_system_name', 'idempotency_key'})
                        return self.send_json(201, layer.bind_design_system(match[1], match[2], **value))
                    # F-2a revisions: appending the next version of a brief or a
                    # direction. The full content is re-sent (a revision is a new
                    # immutable row); the project-scoped form fails closed on a
                    # foreign project, the id-scoped form resolves the owner and
                    # fails closed on an unknown id.
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/briefs/(brief-[0-9a-f]{32})/revisions', self.path)
                    if match:
                        value = self.body(fields={'title', 'goals', 'constraints',
                                                   'reference_asset_ids', 'idempotency_key'})
                        return self.send_json(201, layer.revise_brief(match[1], match[2], **value))
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/directions/(direction-[0-9a-f]{32})/revisions', self.path)
                    if match:
                        value = self.body(fields={'title', 'style_notes', 'color_mood',
                                                   'typography_mood', 'idempotency_key'})
                        return self.send_json(201, layer.revise_direction(match[1], match[2], **value))
                    match = re.fullmatch(r'/api/design-briefs/(brief-[0-9a-f]{32})/revisions', self.path)
                    if match:
                        value = self.body(fields={'title', 'goals', 'constraints',
                                                   'reference_asset_ids', 'idempotency_key'})
                        return self.send_json(201, layer.revise_brief(
                            layer.project_of_brief(match[1]), match[1], **value))
                    match = re.fullmatch(r'/api/design-directions/(direction-[0-9a-f]{32})/revisions', self.path)
                    if match:
                        value = self.body(fields={'title', 'style_notes', 'color_mood',
                                                   'typography_mood', 'idempotency_key'})
                        return self.send_json(201, layer.revise_direction(
                            layer.project_of_direction(match[1]), match[1], **value))
                    match = re.fullmatch(
                        r'/api/projects/([0-9a-f]{32})/design-system-tokens/('
                        + DESIGN_SYSTEM_NAME_PATTERN + r')', self.path)
                    if match:
                        # Exact-key body again: an unknown field is refused rather
                        # than dropped, and `expected_version` is what makes a lost
                        # concurrent revision visible instead of silent.
                        value = self.body(fields=TOKEN_WRITE_FIELDS, limit=262_144)
                        return self.send_json(201, layer.write_tokens(match[1], match[2], **value))
                    if self.path != '/api/projects':
                        raise RequestError(404, 'NOT_FOUND')
                    value = self.body()
                    return self.send_json(201, {'project': service.create_project(value['name'])})
                raise RequestError(405, 'METHOD_NOT_ALLOWED')
            except RequestError as exc:
                self.send_json(exc.status, {'error': exc.code})
            except ImageAssetError as exc:
                self.send_json(exc.status, {'error': exc.code})
            except NativeTaskError:
                self.send_json(409, {'error':'NATIVE_TASK_REQUIRES_RECONCILIATION'})
            except DesignLayerError as exc:
                # Before the generic ValueError clause, and with its detail when it
                # has one: a refused token document carries the field paths
                # ("document: color.brand.$value is not a CSS color string"), and
                # collapsing it into INVALID_REQUEST would leave the reviewer with
                # a JSON box and no idea what to change.
                payload = {'error': exc.code}
                if exc.detail:
                    payload['detail'] = exc.detail[:10]
                self.send_json(exc.status, payload)
            # Before the generic ValueError clause: a refused jury signature carries
            # the reason ("an agent-signed verdict is refused: juror kind 'CODEX'"),
            # and collapsing it to INVALID_REQUEST would hide why a human gate was
            # not granted.
            except JuryReviewError as exc:
                self.send_json(exc.status, {'error': exc.code})
            # Same position and same reasoning as the jury clause above: a refused rights
            # signature has to arrive as the rule that refused it (RIGHTS_NOT_HUMAN) with
            # the name it refused, and a stored row that no longer satisfies its own
            # contract has to arrive as a 409, not as a retryable 400. The code is what a
            # caller branches on; the detail is what an operator reads.
            except RightsReviewError as exc:
                payload = {'error': exc.code}
                if exc.detail:
                    payload['detail'] = exc.detail
                self.send_json(exc.status, payload)
            # Same position and same reasoning as the rights clause: "that finding cites no
            # source", "that chain belongs to another project" and "a machine signed this as a
            # human statement" are three different refusals an operator has to be able to act
            # on, and folding them into INVALID_REQUEST would leave a page guessing which one
            # it hit.
            except ResearchReviewError as exc:
                payload = {'error': exc.code}
                if exc.detail:
                    payload['detail'] = exc.detail
                self.send_json(exc.status, payload)
            # A preflight refusal is a statement about the artifact ("the archive
            # digest does not match what was approved", "a manifest member is
            # missing"), so it must reach the page intact.
            except PreflightError as exc:
                self.send_json(400, {'error': str(exc)})
            except ImportError:
                self.send_json(503, {'error': 'IMAGE_DEPENDENCY_UNAVAILABLE'})
            except (ValueError, PathPolicyError):
                self.send_json(400, {'error': 'INVALID_REQUEST'})
            except OSError as exc:
                # winerror 206 is ERROR_FILENAME_EXCED_RANGE: the project lives
                # under a path Windows cannot address. Folding that into "store
                # unavailable" sends the user to look at the database instead of
                # at where the project is stored.
                code = ('PROJECT_PATH_TOO_LONG' if getattr(exc, 'winerror', None) == 206
                        else 'PROJECT_STORE_UNAVAILABLE')
                self.send_json(503, {'error': code})
            except (sqlite3.Error, AssetError):
                self.send_json(503, {'error': 'PROJECT_STORE_UNAVAILABLE'})
            except Exception:
                # Terminal clause. Anything outside the named taxonomy (a
                # RecursionError from deeply nested RIR JSON, for instance) used to
                # escape dispatch, so socketserver printed a traceback to stderr and
                # dropped the connection: the client saw a reset, the dashboard kept
                # showing stale state, and no machine-readable error existed. The
                # type name is deliberately NOT echoed -- it can carry module and
                # path detail, and this surface is authenticated but still local.
                self.send_json(500, {'error': 'INTERNAL'})

        do_GET = dispatch
        do_POST = dispatch
        do_DELETE = dispatch
        do_PUT = dispatch
        do_PATCH = dispatch
        do_OPTIONS = dispatch

    return HTTPServer(('127.0.0.1', port), Handler)
