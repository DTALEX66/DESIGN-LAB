# SPDX-License-Identifier: MIT
"""Loopback-only metadata transport; no host execution or arbitrary file API."""
import hmac
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import re
import sqlite3

from . import __version__
from .runtime.asset_store import AssetError
from .runtime.paths import PathPolicyError
from .image_assets import ImageAssets, ImageAssetError


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


def make_server(service, token, port=0):
    """Caller owns server lifetime; token is supplied in memory, never logged."""
    if not isinstance(token, str) or not re.fullmatch(r'[0-9a-f]{64}', token):
        raise ValueError('INVALID_SERVICE_TOKEN')
    if type(port) is not int or not 0 <= port <= 65535:
        raise ValueError('INVALID_SERVICE_PORT')

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

        def guard(self):
            authority = f'127.0.0.1:{self.server.server_port}'
            if self.headers.get_all('Host', []) != [authority]:
                raise RequestError(403, 'HOST_DENIED')
            origins = self.headers.get_all('Origin', [])
            if origins and origins != ['http://' + authority]:
                raise RequestError(403, 'ORIGIN_DENIED')
            sites = self.headers.get_all('Sec-Fetch-Site', [])
            if sites and sites not in (['same-origin'], ['none']):
                raise RequestError(403, 'CROSS_SITE_DENIED')
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
                self.guard()
                if self.command == 'GET':
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/assets(?:/(img-[0-9a-f]{64})/content)?', self.path)
                    if match:
                        images = ImageAssets(service)
                        return self.send_json(200, images.content(*match.groups()) if match[2] else
                                              {'assets': images.list(match[1])})
                    if self.path == '/api/health':
                        return self.send_json(200, {'status': 'OK', 'version': __version__, 'scope': 'project-metadata'})
                    if self.path == '/api/environment':
                        return self.send_json(200, service.paths.describe())
                    if self.path == '/api/projects':
                        return self.send_json(200, {'projects': service.list_projects()})
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})', self.path)
                    if match:
                        project = service.get_project(match[1])
                        if project is not None:
                            return self.send_json(200, {'project': project})
                    raise RequestError(404, 'NOT_FOUND')
                if self.command == 'POST':
                    match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/assets', self.path)
                    if match:
                        value = self.body(fields={'content_base64', 'idempotency_key'}, limit=45_000_256)
                        return self.send_json(201, ImageAssets(service).import_image(match[1], **value))
                    if self.path != '/api/projects':
                        raise RequestError(404, 'NOT_FOUND')
                    value = self.body()
                    return self.send_json(201, {'project': service.create_project(value['name'])})
                raise RequestError(405, 'METHOD_NOT_ALLOWED')
            except RequestError as exc:
                self.send_json(exc.status, {'error': exc.code})
            except ImageAssetError as exc:
                self.send_json(exc.status, {'error': exc.code})
            except ImportError:
                self.send_json(503, {'error': 'IMAGE_DEPENDENCY_UNAVAILABLE'})
            except (ValueError, PathPolicyError):
                self.send_json(400, {'error': 'INVALID_REQUEST'})
            except (sqlite3.Error, AssetError, OSError):
                self.send_json(503, {'error': 'PROJECT_STORE_UNAVAILABLE'})

        do_GET = dispatch
        do_POST = dispatch
        do_DELETE = dispatch
        do_PUT = dispatch
        do_PATCH = dispatch
        do_OPTIONS = dispatch

    return HTTPServer(('127.0.0.1', port), Handler)
