# SPDX-License-Identifier: MIT
"""Explicit-project CLI; no inferred install-directory or user-profile writes."""
import argparse
import hashlib
import json
import sqlite3
import sys

from . import __version__
from .runtime.asset_store import AssetError
from .runtime.paths import PathPolicyError
from .runtime.project_backup import BackupError
from .service import ProjectService


def _recovery_summary(readback):
    """Compact "what needs a decision and why".

    Never serializes stored jobs, authorization receipts or file paths: the
    fields below are ledger state words and reason codes only.
    """
    return {'status': readback['status'], 'error': readback.get('error'),
            'pending': readback['pending'], 'actionable': readback['actionable'],
            'listed': readback['listed'], 'truncated': readback['truncated'],
            'needsDecision': [{'attempt_id': d['attempt_id'], 'project_id': d['project_id'],
                               'host': d['host'], 'state': d['state'],
                               'operation': d['operation'], 'action': d['action'],
                               'reason': d['reason'], 'worker_active': d['worker_active'],
                               'receipt_persisted': d['receipt_persisted'],
                               'request_bound': d['request_bound'],
                               'quiescence_recorded': d['quiescence_recorded'],
                               'blocking_attempt_id': d.get('blocking_attempt_id'),
                               'host_guard': d['host_guard']}
                              for d in readback['decisions']]}


def main(argv=None):
    parser = argparse.ArgumentParser(prog='design-lab')
    parser.add_argument('--version', action='version', version=__version__)
    parser.add_argument('--project', required=True, help='explicit owning project directory')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('paths', help='read-only project path diagnosis')
    server = commands.add_parser('serve', help='loopback metadata API; launcher supplies temporary token on stdin')
    server.add_argument('--port', type=int, default=0)
    workbench = commands.add_parser(
        'workbench',
        help='start the service and print the sign-in URL and one-time token (no external launcher)')
    workbench.add_argument('--port', type=int, default=0)
    workbench.add_argument('--no-browser', action='store_true',
                           help='print the URL instead of opening the local browser')
    workbench.add_argument('--manual-connect', action='store_true',
                           help='compatibility mode: print a temporary token instead of '
                                'connecting the launched page automatically')
    worker = commands.add_parser('native-worker', help='execute one persisted approved native attempt')
    worker.add_argument('--attempt', required=True)
    recovery = commands.add_parser(
        'native-recovery',
        help='list persisted native attempts whose outcome is unknown; decide one only with '
             'explicit operator authorization')
    recovery.add_argument('--attempt', default=None,
                          help='unresolved attempt to decide; omit to list without acting')
    recovery.add_argument('--actor', default=None,
                         help='operator identity recorded on the decision (required with --attempt)')
    recovery.add_argument('--receipt', default=None,
                         help='the operator statement authorizing this decision (required with --attempt)')
    trail = commands.add_parser(
        'audit-trail',
        help='read back the writer journal: lease takeovers and versions created by an attempt')
    trail.add_argument('--limit', type=int, default=20,
                       help='rows to read, newest first (1-200)')
    projects = commands.add_parser('projects').add_subparsers(dest='action', required=True)
    projects.add_parser('list')
    projects.add_parser('create').add_argument('--name', required=True)
    delivery = commands.add_parser(
        'delivery-receipt',
        help='read back the persisted delivery receipt of one published bundle version, '
             'with the claims it does not make')
    delivery.add_argument('--project-id', required=True, help='owning project id (32 hex)')
    delivery.add_argument('--bundle', required=True, help='bundle asset id published by a delivery')
    delivery.add_argument('--version', required=True, help='bundle version id of that delivery')
    backup = commands.add_parser('backup',
                                 help='archive the durable project state into one verified zip')
    backup.add_argument('--out', default=None, help='target directory or .zip path')
    backup.add_argument('--member', action='append', dest='members',
                        help='local-root-relative path to include (repeatable)')
    restore = commands.add_parser('restore', help='unpack a backup and re-verify every hash')
    restore.add_argument('--from', dest='archive', required=True)
    restore.add_argument('--into', default=None,
                         help='target local root; defaults to this project\'s own')
    restore.add_argument('--force', action='store_true',
                         help='allow restoring over a non-empty target')
    restore.add_argument('--allow-upgrade', action='store_true',
                         help='restore despite a version or state-schema mismatch')
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
            reconciled = service.reconcile_interrupted_attempts()
            recovery_summary = _recovery_summary(service.recovery_readback())
            with make_server(service, token, args.port) as httpd:
                print(json.dumps({'status': 'LISTENING', 'host': '127.0.0.1',
                                  'port': httpd.server_port,
                                  'reconciled_attempts': len(reconciled),
                                  'recovery': recovery_summary}), flush=True)
                try:
                    httpd.serve_forever()
                except KeyboardInterrupt:
                    pass
            return 0
        elif args.command == 'workbench':
            import secrets
            from .http_service import make_server
            token = secrets.token_hex(32)
            reconciled = service.reconcile_interrupted_attempts()
            recovery_summary = _recovery_summary(service.recovery_readback())
            with make_server(service, token, args.port,
                             local_session=not args.manual_connect) as httpd:
                url = f'http://127.0.0.1:{httpd.server_port}/workbench'
                # The token is the sign-in the Workbench asks for; it lives only in
                # this process and this terminal, never in argv, a file or a URL.
                # In the default mode it is not even printed: the launched page
                # picks it up through the same-origin handshake, so nothing has to
                # be copied, and a stray terminal scrollback cannot carry a secret.
                print(json.dumps({'status': 'LISTENING', 'url': url,
                                  'port': httpd.server_port,
                                  'reconciled_attempts': len(reconciled),
                                  'recovery': recovery,
                                  **({'token': token,
                                      'token_ttl': 'until this process exits'}
                                     if args.manual_connect
                                     else {'connection': 'automatic'})}), flush=True)
                if not args.no_browser:
                    import webbrowser
                    webbrowser.open(url)
                try:
                    httpd.serve_forever()
                except KeyboardInterrupt:
                    pass
            return 0
        elif args.command == 'backup':
            from datetime import datetime, timezone
            from pathlib import Path
            from .runtime.project_backup import create_backup
            local_root = Path(service.paths.local_root)
            members = tuple(args.members) if args.members else None
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            destination = Path(args.out) if args.out else local_root / 'backups'
            if destination.suffix.lower() == '.zip':
                destination.parent.mkdir(parents=True, exist_ok=True)
            else:
                destination.mkdir(parents=True, exist_ok=True)
                destination = destination / f'design-lab-backup-{stamp}.zip'
            manifest = create_backup(local_root, destination, members=members,
                                     version=__version__)
            result = {'status': 'BACKUP_CREATED', 'archive': destination.name,
                      'fileCount': manifest['fileCount'],
                      'totalBytes': manifest['totalBytes'],
                      'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
                      'createdAt': manifest['createdAt']}
        elif args.command == 'restore':
            from pathlib import Path
            from .runtime.project_backup import restore_backup, state_schema_version
            target = Path(args.into) if args.into else service.paths.local_root
            result = restore_backup(
                args.archive, target, force=args.force, allow_upgrade=args.allow_upgrade,
                version=__version__,
                local_state_schema_version=state_schema_version(service.paths.local_root))
            result['status'] = 'RESTORE_VERIFIED'
            result['target'] = Path(target).name
        elif args.command == 'audit-trail':
            from .runtime.audit_trail import recent as _audit_recent
            try:
                print(json.dumps({'status': 'AUDIT_TRAIL',
                                  'journal': _audit_recent(service, limit=args.limit)},
                                 ensure_ascii=False, sort_keys=True))
            except ValueError as exc:
                # The limit is the caller's mistake, not the store's; say which so the
                # operator does not go looking for a broken database.
                print(json.dumps({'status': 'ERROR', 'error': 'INVALID_AUDIT_TRAIL_REQUEST',
                                  'detail': str(exc)}, ensure_ascii=False, sort_keys=True))
                return 2
        elif args.command == 'native-recovery':
            from .native_tasks import NativeTaskError
            from .runtime.job_store import AttemptError
            if not args.attempt:
                # Same shape as the start-up announcement, so the operator reads one
                # vocabulary in both places.
                result = {'status': 'RECOVERY_READBACK',
                          'recovery': _recovery_summary(service.recovery_readback())}
            else:
                # No default actor and no default receipt: a decision the operator
                # did not sign for is not one the product may take on their behalf.
                if not (args.actor and args.receipt):
                    print(json.dumps({'status': 'ERROR',
                                      'error': 'RECOVERY_DECISION_AUTHORIZATION_REQUIRED',
                                      'detail': 'deciding needs --actor and --receipt; '
                                                'listing without --attempt takes no action'},
                                     ensure_ascii=False))
                    return 2
                try:
                    decided = service.decide_native_recovery(args.attempt, authorization=dict(
                        actor=args.actor, scope='project-native-test', receipt=args.receipt))
                except (NativeTaskError, AttemptError) as exc:
                    reason = (exc.attempt.get('reason')
                              if isinstance(getattr(exc, 'attempt', None), dict) else None)
                    print(json.dumps({'status': 'ERROR', 'error': str(exc), 'reason': reason,
                                      'state': (exc.attempt.get('state')
                                                if reason else None)}, ensure_ascii=False))
                    return 2
                attempt = decided['result']['attempt']
                result = {'status': 'RECOVERY_DECIDED', 'attempt_id': args.attempt,
                          'action': decided['decision']['action'],
                          'state': attempt['state'], 'note': attempt['note'],
                          'artifacts_accepted': attempt['state'] == 'RECEIPTED'}
        elif args.command == 'native-worker':
            from .native_tasks import NativeTasks, NativeTaskError
            try:
                task = NativeTasks(service).execute_queued(args.attempt)
            except NativeTaskError as exc:
                # Never serialize stored jobs, authorization receipts or paths.
                print(json.dumps({'status':'ERROR','error':str(exc)}))
                return 2
            result = {'attempt_id':task['attempt']['attempt_id'],'state':task['attempt']['state']}
        elif args.command == 'delivery-receipt':
            from .image_assets import ImageAssetError
            from .interop import InteropError, delivery_receipt
            from .native_delivery import NativeDelivery
            try:
                document = NativeDelivery(service).receipt(args.project_id, args.bundle, args.version)
                # loads() already verified the document; this report is what the
                # operator reads: the schema it was validated against and every claim
                # the receipt does not make.
                result = {'status': 'DELIVERY_RECEIPT', 'verification': delivery_receipt.verify_receipt(document),
                          'receipt': document}
            except ImageAssetError as exc:
                print(json.dumps({'status': 'ERROR', 'error': exc.code,
                                  'http_status': exc.status}, ensure_ascii=False))
                return 2
            except InteropError as exc:
                print(json.dumps({'status': 'ERROR', 'error': 'DELIVERY_RECEIPT_UNVERIFIED',
                                  'detail': str(exc)}, ensure_ascii=False))
                return 2
        elif args.command == 'paths':
            result = service.paths.describe()
        elif args.action == 'list':
            result = {'projects': service.list_projects()}
        else:
            result = {'project': service.create_project(args.name)}
    except (ValueError, OSError, sqlite3.Error, AssetError, PathPolicyError,
            BackupError) as exc:
        print(json.dumps({'status': 'ERROR', 'error': type(exc).__name__, 'detail': str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0
