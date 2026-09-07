# SPDX-License-Identifier: MIT
"""R3 current reports: one task ledger, four evidence axes, checked projections."""
from __future__ import annotations

import ast
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile
import warnings

from jsonschema import Draft202012Validator, FormatChecker
from design_lab.runtime.paths import resolve_paths

LEDGER = 'design-lab/config/task-ledger-r3.json'
SCHEMA = 'design-lab/schemas/task-ledger-r3.schema.json'
TASK_SOURCE = 'docs/history/taskpacks/r3-tasks-2026-09-06.json'
HOST_TASKS = {'R3-' + number for number in ('02', '08', '10', '11', '12', '13', '14', '15',
                                           '16', '17', '18', '19', '20', '21', '22', '23')}
DELIVERY_TASKS = {'R3-04', 'R3-15', 'R3-24'}
INDEX = 'design-lab/config/current-report-index.json'
CURRENT = 'reports/current/'
REPORTS = ('CLOUD_BASELINE.json', 'CLOUD_BASELINE.md', 'PROJECT_STATUS.json', 'PROJECT_STATUS.md',
           'TASK_PROGRESS.json', 'ADAPTER_EVIDENCE_RECONCILIATION.json', 'KNOWLEDGE_INVENTORY.json',
           'DOMAIN_PACK_READINESS.json', 'RELEASE_READINESS.json')
KINDS = {'implementation': {'structural', 'local_test', 'host_live'}, 'unit': {'local_test'},
         'host_live': {'host_live'}, 'delivery': {'delivery'}}


def _json(raw):
    def pairs(values):
        result = {}
        for key, value in values:
            if key in result:
                raise ValueError(f'duplicate JSON key: {key}')
            result[key] = value
        return result
    def invalid(value):
        raise ValueError(f'nonfinite JSON value: {value}')
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=invalid)


def _safe(root, relative):
    if not isinstance(relative, str) or not relative or '\\' in relative or ':' in relative:
        raise ValueError('expected a public repository-relative POSIX path')
    rel = PurePosixPath(relative)
    allowed = {'src', 'scripts', 'design-lab', 'docs', 'reports', 'integrations', 'packages', 'fixtures', '.project'}
    denied = {'.git', '.hermes', '.openhuman', 'auth.json', 'credentials.json', 'tokens.json', 'id_rsa'}
    def permitted(parts):
        return not any(p.lower() in denied or p.lower().startswith('.env') for p in parts)
    if rel.is_absolute() or '..' in rel.parts or not permitted(rel.parts):
        raise ValueError('private or escaping evidence path rejected')
    workflow_source = (len(rel.parts) == 3 and rel.parts[:2] == ('.github', 'workflows')
                       and rel.suffix in {'.yml', '.yaml'})
    if rel.parts[0] not in allowed and relative not in {'AGENTS.md', 'README.md', 'pyproject.toml', 'uv.lock'}:
        if not workflow_source and not (rel.parts[0] == '.project-local' and 'task-artifacts' in rel.parts[1:-1]):
            raise ValueError('evidence path outside declared public artifact/source roots')
    target = root.joinpath(*rel.parts)
    for ancestor in (target, *target.parents):
        if ancestor == root:
            break
        if ancestor.is_symlink() or (hasattr(ancestor, 'is_junction') and ancestor.is_junction()):
            raise ValueError('evidence paths may not traverse links or junctions')
    resolved = target.resolve()
    if not resolved.is_relative_to(root.resolve()) or not permitted(resolved.relative_to(root.resolve()).parts):
        raise ValueError('resolved evidence path escaped public roots')
    return target


class Reader:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.hashes = {}

    def read(self, relative, optional=False):
        path = _safe(self.root, relative)
        try:
            if path.stat().st_size > 32 * 1024 * 1024:
                raise ValueError('report input exceeds bounded read size')
            raw = path.read_bytes()
        except FileNotFoundError:
            if not optional:
                raise
            raw = None
        digest = hashlib.sha256(raw).hexdigest() if raw is not None else None
        if relative in self.hashes and self.hashes[relative] != digest:
            raise ValueError(f'input changed while projecting: {relative}')
        self.hashes[relative] = digest
        return raw

    def json(self, relative, optional=False):
        raw = self.read(relative, optional)
        return _json(raw) if raw is not None else None

    def stable(self):
        for relative in list(self.hashes):
            self.read(relative, optional=True)


def _validate(reader, ledger):
    errors = sorted(Draft202012Validator(reader.json(SCHEMA), format_checker=FormatChecker()).iter_errors(ledger),
                    key=lambda e: str(list(e.path)))
    if errors:
        raise ValueError(f'invalid task ledger: {errors[0].message}')
    tasks = {t['id']: t for t in ledger['tasks']}
    if len(tasks) != len(ledger['tasks']):
        raise ValueError('duplicate task IDs')
    raw_source = reader.read(TASK_SOURCE)
    # The supplied ZIP member has no final LF; the repository text copy adds one.
    if ledger['source']['tasks_sha256'] not in {
            hashlib.sha256(raw_source).hexdigest(),
            hashlib.sha256(raw_source.removesuffix(b'\n')).hexdigest()}:
        raise ValueError('frozen task source hash mismatch')
    source = _json(raw_source)
    if source['id'] != ledger['taskpack'] or source['baselineSha'] != ledger['baseline_sha']:
        raise ValueError('taskpack identity differs from frozen source')
    originals = {task['id']: task for task in source['tasks']}
    if set(originals) != set(tasks):
        raise ValueError('task inventory differs from frozen source')
    for tid, original in originals.items():
        if any(tasks[tid].get(key) != value for key, value in original.items() if key != 'status'):
            raise ValueError(f'task definition differs from frozen source: {tid}')
    receipts = {e['id']: e for e in ledger['evidence']}
    if len(receipts) != len(ledger['evidence']):
        raise ValueError('duplicate evidence IDs')
    visiting, visited, order = set(), set(), []
    def visit(tid):
        if tid not in tasks:
            raise ValueError(f'unknown task dependency: {tid}')
        if tid in visiting:
            raise ValueError('cyclic task dependencies')
        if tid in visited:
            return
        visiting.add(tid)
        task = tasks[tid]
        required = {'implementation', 'unit'}
        if tid in HOST_TASKS:
            required.add('host_live')
        if tid in DELIVERY_TASKS:
            required.add('delivery')
        if set(task['required_axes']) != required:
            raise ValueError(f'required evidence axes differ from R3 acceptance: {tid}')
        for axis, value in task['axes'].items():
            if axis != 'implementation' and value['state'] == 'IMPLEMENTED_LOCAL':
                raise ValueError('implementation state cannot qualify testing, host or delivery')
            if axis in task['required_axes'] and value['state'] == 'NOT_REQUIRED':
                raise ValueError('required axis cannot be waived')
            if any(eid not in receipts for eid in value['evidence']):
                raise ValueError('unknown evidence reference')
        for dependency in task['depends_on']:
            visit(dependency)
        visiting.remove(tid)
        visited.add(tid)
        order.append(tid)
    for tid in tasks:
        visit(tid)
    reader.read(ledger['plan_path'])
    return tasks, receipts, order


def project_ledger(root, ledger, subject_sha, *, reader=None):
    reader = reader or Reader(root)
    tasks, receipts, order = _validate(reader, ledger)
    evaluated = {}
    for eid, receipt in receipts.items():
        reasons = []
        if receipt['outcome'] != 'PASS':
            reasons.append('OUTCOME_NOT_PASS')
        if receipt['subject_sha'] != subject_sha:
            reasons.append('STALE_SUBJECT_SHA')
        for relative, expected in receipt['subject_files'].items():
            reader.read(relative, optional=True)
            if reader.hashes[relative] != expected:
                reasons.append(f'SOURCE_CHANGED_OR_MISSING:{relative}')
        for artifact in receipt['artifacts']:
            reader.read(artifact['path'], optional=True)
            if reader.hashes[artifact['path']] != artifact['sha256']:
                reasons.append(f'ARTIFACT_CHANGED_OR_MISSING:{artifact["path"]}')
        evaluated[eid] = {**receipt, 'verified': not reasons, 'reasons': reasons}
    projected = {}
    for tid in order:
        task = tasks[tid]
        axes = {}
        for axis, declaration in task['axes'].items():
            reasons = []
            state = declaration['state']
            if state in {'PASS', 'IMPLEMENTED_LOCAL'}:
                good = [eid for eid in declaration['evidence'] if evaluated[eid]['verified']
                        and tid in evaluated[eid]['task_ids'] and evaluated[eid]['kind'] in KINDS[axis]]
                if not good:
                    state = 'UNVERIFIED'
                    reasons.append('no current evidence of the required kind')
            axes[axis] = {**declaration, 'state': state, 'declared_state': declaration['state'], 'reasons': reasons}
        unmet = [dep for dep in task['depends_on'] if projected[dep]['status'] != 'DONE_LOCAL']
        satisfied = all(axes[axis]['state'] in {'IMPLEMENTED_LOCAL', 'PASS'} for axis in task['required_axes'])
        started = any(a['state'] not in {'NOT_EXECUTED', 'NOT_REQUIRED'} for a in axes.values())
        status = 'DONE_LOCAL' if satisfied and not unmet else 'PARTIAL' if started else 'TODO'
        projected[tid] = {'id': tid, 'title': task['title'], 'status': status, 'depends_on': task['depends_on'],
                          'unmet_dependencies': unmet, 'required_axes': task['required_axes'], 'axes': axes}
    return {'schemaVersion': 'design-lab/task-progress/r3-v1', 'taskpack': ledger['taskpack'],
            'subjectSha': subject_sha, 'ledgerUpdatedAt': ledger['updated_at'],
            'tasks': [projected[t['id']] for t in ledger['tasks']], 'evidence': list(evaluated.values()),
            'counts': dict(Counter(t['status'] for t in projected.values())),
            'note': 'DONE_LOCAL concerns the declared task axes and dependencies, not a product release or hosted CI.'}


def _git(root, *args):
    result = subprocess.run(['git', '-c', 'color.ui=false', '-C', str(root), *args], capture_output=True,
                            env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'})
    if result.returncode:
        raise ValueError(f'git inspection failed: {args[0]}')
    return result.stdout.decode('utf-8', errors='strict').rstrip('\r\n')


def git_snapshot(root):
    if Path(_git(root, 'rev-parse', '--show-toplevel')).resolve() != Path(root).resolve():
        raise ValueError('report root must be the owning Git root')
    generated = {CURRENT + name for name in REPORTS} | {INDEX}
    # -z prevents shell quoting/Unicode escapes in filenames.
    changes = _git(root, 'status', '--porcelain', '--untracked-files=all', '-z').split('\0')
    dirty = any(record and record[3:] not in generated for record in changes)
    try:
        origin = _git(root, 'rev-parse', 'origin/main')
    except ValueError:
        origin = None
    return {'sha': _git(root, 'rev-parse', 'HEAD'), 'branch': _git(root, 'branch', '--show-current'),
            'origin_main': origin, 'source_worktree_clean': not dirty,
            'tracked_files': len([p for p in _git(root, 'ls-files', '-z').split('\0') if p])}


def _dump(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')


def _build(reader, snapshot, generated_at):
    ledger = reader.json(LEDGER)
    progress = project_ledger(reader.root, ledger, snapshot['sha'], reader=reader)
    common = {'subjectSha': snapshot['sha'], 'generatedAt': generated_at,
              'fresh': bool(snapshot.get('source_worktree_clean') and snapshot.get('origin_main') == snapshot['sha']),
              'freshnessMeaning': 'local source/ref snapshot only; generation time is not a test or cloud observation'}
    adapters = reader.json('integrations/adapter-registry.json', optional=True)
    evidence_index = reader.json('design-lab/config/capability-evidence-current.json', optional=True)
    sources = reader.json('design-lab/research/global-absorption/SOURCE_REGISTRY.json', optional=True)
    quarantine = reader.json('design-lab/research/global-absorption/QUARANTINE_REGISTRY.json', optional=True)
    def count(data, key):
        return len(data.get(key, [])) if data is not None else None
    defined = 0
    for path in sorted((reader.root/'design-lab/tests').glob('test_*.py')):
        raw = reader.read(path.relative_to(reader.root).as_posix())
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', SyntaxWarning)
            tree = ast.parse(raw.decode('utf-8-sig'))
        defined += sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.startswith('test_') for node in ast.walk(tree))
    status = {**common, 'schemaVersion': 'design-lab/project-status/v2', 'taskpack': ledger['taskpack'],
              'ledger': LEDGER, 'plan': ledger['plan_path'], 'git': snapshot, 'taskCounts': progress['counts'],
              'sources': {'activeRegistryEntries': count(sources, 'entries'), 'quarantinedSources': count(quarantine, 'entries')},
              'tests': {'definedTestMethodCount': defined, 'executed': 'see individual verified ledger receipts'},
              'hostLive': 'derived from host_live axis only', 'releaseStatus': 'NOT_RELEASED'}
    table = ['| Task | Status | Implementation | Unit | Host live | Delivery |', '|---|---|---|---|---|---|']
    for task in progress['tasks']:
        table.append('| ' + ' | '.join([task['id'], task['status'], *(task['axes'][axis]['state'] for axis in KINDS)]) + ' |')
    markdown = '# PROJECT_STATUS（生成投影）\n\n'
    markdown += f"任务包：{ledger['taskpack']}；基线/HEAD：`{snapshot['sha']}`。\n\n"
    markdown += f"唯一编辑源：`{LEDGER}`。生成时间 {generated_at} 不代表重新测试或实机验收。\n\n"
    markdown += '\n'.join(table) + '\n\n发布状态：NOT_RELEASED。原始观察时间与哈希见 TASK_PROGRESS.json。\n'
    cloud = {**common, 'schemaVersion': 'design-lab/cloud-baseline/v2', 'local': snapshot,
             'remoteRef': 'origin/main (local tracking ref)', 'cloudReadback': 'NOT_EXECUTED',
             'unavailable': ['currentRemoteSha', 'exactShaCI', 'openPullRequests', 'branchProtection'],
             'note': 'No GitHub API query was run by this generator; tool installation is not inferred.'}
    reconciled = []
    for adapter in (adapters or {}).get('adapters', []):
        reconciled.append({'adapterId': adapter.get('adapter_id'), 'tool': adapter.get('tool'),
                           'declaredStatus': adapter.get('status'), 'historicalDeclaredLevel': adapter.get('evidence', {}).get('level'),
                           'currentHostQualification': 'NOT_EXECUTED', 'reason': 'registry declarations are not current host receipts'})
    packs = []
    pack_root = reader.root/'design-lab/domain-packs'
    if pack_root.is_dir():
        for pack in sorted(pack_root.iterdir()):
            if pack.is_dir() and not pack.is_symlink():
                manifests = [p for p in pack.glob('*.json') if p.is_file()]
                for path in manifests:
                    reader.read(path.relative_to(reader.root).as_posix())
                packs.append({'domain': pack.name, 'contractJsonFiles': len(manifests), 'status': 'STRUCTURAL_ONLY', 'hostLive': 'NOT_EXECUTED'})
    reports = {
        'PROJECT_STATUS.json': _dump(status), 'PROJECT_STATUS.md': markdown.encode('utf-8'),
        'TASK_PROGRESS.json': _dump({**common, **progress}),
        'CLOUD_BASELINE.json': _dump(cloud),
        'CLOUD_BASELINE.md': (f"# CLOUD_BASELINE\n\nLocal HEAD: `{snapshot['sha']}`\n\nLocal origin/main: `{snapshot.get('origin_main')}`\n\nGitHub live readback / exact-SHA CI: NOT EXECUTED.\n").encode(),
        'ADAPTER_EVIDENCE_RECONCILIATION.json': _dump({**common, 'schemaVersion':'design-lab/adapter-reconciliation/v2',
                                                     'adapters':reconciled, 'capabilityIndexEntries':count(evidence_index,'capabilities')}),
        'KNOWLEDGE_INVENTORY.json': _dump({**common, 'schemaVersion':'design-lab/knowledge-inventory/v1',
                                         **status['sources'], 'migrationStatus':'deferred'}),
        'DOMAIN_PACK_READINESS.json': _dump({**common, 'schemaVersion':'design-lab/domain-readiness/v2', 'domainPacks':packs}),
        'RELEASE_READINESS.json': _dump({**common, 'schemaVersion':'design-lab/release-readiness/v2', 'status':'NOT_RELEASED',
                                       'blockers':['R3-15 acceptance', 'host evidence', 'rights/quality/release gates', 'exact-SHA delivery']})}
    if set(reports) != set(REPORTS):
        raise ValueError('report inventory does not match generated outputs')
    return reports


def generate(root, *, check=False, snapshot=None, generated_at=None):
    root = Path(root).resolve()
    reader = Reader(root)
    supplied_snapshot = snapshot is not None
    snapshot = snapshot or git_snapshot(root)
    if check:
        if not (root/INDEX).is_file():
            return [INDEX]
        # Index is an output, not an input hash (avoid self-reference).
        old = _json((root/INDEX).read_bytes())
        generated_at = old.get('generatedAt')
        if not isinstance(generated_at, str):
            return [INDEX]
    generated_at = generated_at or datetime.now(timezone.utc).isoformat(timespec='seconds')
    reports = _build(reader, snapshot, generated_at)
    reader.stable()
    if not supplied_snapshot and git_snapshot(root) != snapshot:
        raise ValueError('Git state changed during report generation')
    index = {'schemaVersion':'design-lab/current-report-index/v2', 'subjectSha':snapshot['sha'], 'generatedAt':generated_at,
             'ledger':LEDGER, 'reports':list(REPORTS), 'reportRoot':'../../reports/current/',
             'inputHashes':reader.hashes, 'outputHashes':{name:hashlib.sha256(raw).hexdigest() for name,raw in reports.items()}}
    outputs = {CURRENT+name:raw for name,raw in reports.items()}
    outputs[INDEX] = _dump(index)
    if check:
        return [rel for rel,raw in outputs.items() if not (root/rel).is_file() or (root/rel).read_bytes()!=raw]
    stage_root = resolve_paths(project_root=root).category_dir('runtime', 'current-reports')
    stage_root.mkdir(parents=True, exist_ok=True)
    for relative, raw in outputs.items():
        target = _safe(root, relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=stage_root, suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        try:
            os.replace(temporary, target)
        finally:
            if temporary.exists():
                temporary.unlink()
    return []
