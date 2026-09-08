# SPDX-License-Identifier: MIT
"""Explicit-project CLI; no inferred install-directory or user-profile writes."""
import argparse
import json
import sqlite3
import sys

from . import __version__
from .runtime.asset_store import AssetError
from .runtime.paths import PathPolicyError
from .service import ProjectService


def main(argv=None):
    parser = argparse.ArgumentParser(prog='design-lab')
    parser.add_argument('--version', action='version', version=__version__)
    parser.add_argument('--project', required=True, help='explicit owning project directory')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('paths', help='read-only project path diagnosis')
    server = commands.add_parser('serve', help='loopback metadata API; launcher supplies temporary token on stdin')
    server.add_argument('--port', type=int, default=0)
    worker = commands.add_parser('native-worker', help='execute one persisted approved native attempt')
    worker.add_argument('--attempt', required=True)
    projects = commands.add_parser('projects').add_subparsers(dest='action', required=True)
    projects.add_parser('list')
    projects.add_parser('create').add_argument('--name', required=True)
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    try:
        service = ProjectService(args.project)
        if args.command == 'serve':
            from .http_service import make_server
            if sys.stdin.isatty():
                raise ValueError('SERVICE_REQUIRES_LAUNCHER_STDIN')
            token = sys.stdin.readline(66).rstrip('\r\n')
            with make_server(service, token, args.port) as httpd:
                print(json.dumps({'status': 'LISTENING', 'host': '127.0.0.1', 'port': httpd.server_port}), flush=True)
                try:
                    httpd.serve_forever()
                except KeyboardInterrupt:
                    pass
            return 0
        elif args.command == 'native-worker':
            from .native_tasks import NativeTasks, NativeTaskError
            try:
                task = NativeTasks(service).execute_queued(args.attempt)
            except NativeTaskError as exc:
                # Never serialize stored jobs, authorization receipts or paths.
                print(json.dumps({'status':'ERROR','error':str(exc)}))
                return 2
            result = {'attempt_id':task['attempt']['attempt_id'],'state':task['attempt']['state']}
        elif args.command == 'paths':
            result = service.paths.describe()
        elif args.action == 'list':
            result = {'projects': service.list_projects()}
        else:
            result = {'project': service.create_project(args.name)}
    except (ValueError, OSError, sqlite3.Error, AssetError, PathPolicyError) as exc:
        print(json.dumps({'status': 'ERROR', 'error': type(exc).__name__, 'detail': str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0
