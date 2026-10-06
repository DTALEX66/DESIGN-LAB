#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Classify the repository's documentation and asset areas into one index.

The catalog is DERIVED, not authored: every number comes out of `git ls-files` /
`git ls-tree`, so it cannot quietly drift into a flattering description of the
repo the way a hand-kept manifest does. `--check` re-derives and fails on drift.

Categories are decided by explicit rules (see CATEGORY_RULES) so the mapping is
auditable and reviewable in diff form.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports" / "current" / "REPO-CLASSIFICATION.json"

# Ordered: first match wins. `docs/audits/...` must be tested before `docs/`.
CATEGORY_RULES: list[tuple[str, str, str]] = [
    ('AUTHORITY.md', 'authority', '顶层权威（唯一）'),
    ('AGENTS.md', 'authority', '根执行规则'),
    ('.project/governance/', 'authority', '机器权威索引与策略'),
    ('.project/paths.json', 'authority', '本机外置根声明'),
    ('docs/taskpacks/', 'planning', '任务包（含 superseded，见 INDEX）'),
    ('design-lab/config/task-ledger-r3.json', 'planning', '唯一可变任务账本'),
    ('docs/current/', 'planning', '当前文档面'),
    ('docs/audits/', 'evidence', '审计与验收证据包'),
    ('docs/handoffs/', 'history', '交接血统（非当前入口）'),
    ('docs/history/', 'history', '冻结历史与逐字节基线'),
    ('reports/history/', 'history', '历史进度账本冻结件'),
    ('reports/current/', 'generated', '当前状态投影（由生成器再生）'),
    ('reports/migration/', 'history', '迁移记录'),
    ('docs/golden-cases/', 'evidence', '黄金用例'),
    ('docs/projects/', 'evidence', '设计项目产物（真实交付样例）'),
    ('docs/decisions/', 'authority', '决策记录（ADR 式）'),
    ('docs/architecture/', 'authority', '架构与语言策略'),
    ('docs/UI-CONVERGENCE-20260930/', 'evidence', 'UI 收口证据与记录'),
    ('fixtures/', 'evidence', '域 fixture 与回归素材'),
    ('design-lab/evals/', 'evidence', '评估与黄金语料'),
    ('apps/workbench/build/', 'generated', '提交的构建产物（Build Output Truth）'),
    ('src/', 'source', '产品源码'),
    ('packages/', 'source', '能力包'),
    ('apps/', 'source', 'Workbench 前端源码'),
    ('integrations/', 'source', '宿主/发行集成层'),
    ('design-lab/scripts/', 'source', '门与工具（Python）'),
    ('scripts/', 'source', '根级门与工具'),
    ('design-lab/tests/', 'source', '测试'),
    ('.github/', 'source', 'CI 定义'),
    ('docs/', 'documentation', '其余文档'),
    ('design-lab/', 'source', '设计核心其余模块'),
    ('reports/', 'generated', '其余报告'),
    ('vendor/', 'source', '第三方源码副本（inert source blobs）'),
    ('research/', 'documentation', '研究素材'),
    ('LICENSES/', 'repo-meta', '第三方许可证文本'),
    # Single-segment paths: the repo-root operating/meta documents. Must stay last
    # so no real directory is caught by it.
    ('', 'repo-meta', '根级运维与政策文档'),
]


def classify(path: str) -> tuple[str, str]:
    for prefix, category, note in CATEGORY_RULES:
        if not prefix:
            if '/' not in path:
                return category, note
            continue
        if path == prefix or path.startswith(prefix):
            return category, note
    return 'other', ''


def tracked_files() -> list[str]:
    out = subprocess.run(['git', 'ls-files', '-z'], cwd=REPO, capture_output=True)
    return [p for p in out.stdout.decode('utf-8').split('\0') if p]


def blob_sizes() -> dict[str, int]:
    """Working-tree byte size per tracked path (from the HEAD tree)."""
    out = subprocess.run(['git', 'ls-tree', '-r', '-l', 'HEAD'],
                         cwd=REPO, capture_output=True, text=True,
                         encoding='utf-8', errors='replace').stdout
    sizes: dict[str, int] = {}
    for line in out.splitlines():
        if '\t' not in line:
            continue
        meta, path = line.split('\t', 1)
        fields = meta.split()
        if len(fields) < 4 or not fields[3].isdigit():
            continue
        sizes[path] = int(fields[3])
    return sizes


def last_touch(path: str) -> str:
    out = subprocess.run(['git', 'log', '-1', '--format=%ad', '--date=short', '--', path],
                         cwd=REPO, capture_output=True, text=True, encoding='utf-8')
    return out.stdout.strip() or 'unknown'


def authority_references() -> set[str]:
    """Path references made inside the two authority files (fenced blocks removed)."""
    refs: set[str] = set()
    for name in ('AUTHORITY.md', 'AGENTS.md'):
        text = (REPO / name).read_text(encoding='utf-8', errors='replace')
        text = re.sub(r'```.*?```', '', text, flags=re.S)
        for token in re.findall(r'[\w./\-]+\.(?:md|json|py|csv|yaml|yml|toml|jsonl(?:\.gz)?|mjs)',
                                text):
            refs.add(token.lstrip('/'))
    return refs


def bundle_key(path: str) -> str:
    parts = path.split('/')
    if parts[0] == 'docs' and len(parts) > 2 and parts[1] in ('audits', 'handoffs', 'history',
                                                             'projects', 'golden-cases',
                                                             'UI-CONVERGENCE-20260930'):
        return '/'.join(parts[:2]) + '/'
    if parts[0] in ('reports', 'fixtures') and len(parts) > 2:
        return '/'.join(parts[:2]) + '/'
    if len(parts) == 1:
        return path
    return parts[0] + '/'


def build() -> dict:
    files = tracked_files()
    sizes = blob_sizes()
    refs = authority_references()
    bundles: dict[str, dict] = {}
    for path in files:
        category, note = classify(path)
        key = bundle_key(path)
        entry = bundles.setdefault(key, {'path': key, 'category': category, 'note': note,
                                         'files': 0, 'bytes': 0,
                                         'cited_by_authority': 0, 'lastTouch': 'earliest'})
        entry['files'] += 1
        entry['bytes'] += sizes.get(path, 0)
        if path in refs or any(r.endswith(path) or path.endswith(r) for r in refs):
            entry['cited_by_authority'] += 1
    touched = {}
    for key in bundles:
        touched[key] = last_touch(key)
    for key, entry in bundles.items():
        entry['lastTouch'] = touched[key]
        entry['bytes'] = entry['bytes']
    packs = subprocess.run(['git', 'count-objects', '-vH'], cwd=REPO,
                           capture_output=True, text=True, encoding='utf-8').stdout
    pack_mib = 0.0
    for line in packs.splitlines():
        if line.startswith('size-pack:'):
            value, unit = line.split(':')[1].strip().split()
            pack_mib = float(value) * {'KiB': 1/1024, 'MiB': 1, 'GiB': 1024, 'B': 1/1048576}[unit]
    by_cat: dict[str, dict] = {}
    for entry in bundles.values():
        c = by_cat.setdefault(entry['category'], {'files': 0, 'bytes': 0, 'bundles': 0})
        c['files'] += entry['files']
        c['bytes'] += entry['bytes']
        c['bundles'] += 1
    return {
        'schemaVersion': 'design-lab/repo-classification/v1',
        'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'observedCommit': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=REPO,
                                         capture_output=True, text=True).stdout.strip(),
        'totals': {
            'trackedFiles': len(files),
            'workingTreeMiB': round(sum(sizes.values()) / 1048576, 2),
            'packMiB': round(pack_mib, 2),
            'note': 'pack 含全部历史与 tag 归档；working tree 为当前检出字节。两者之差不是垃圾。',
        },
        'categories': {k: {'files': v['files'], 'bundles': v['bundles'],
                           'mib': round(v['bytes'] / 1048576, 2)}
                       for k, v in sorted(by_cat.items())},
        'bundles': sorted(bundles.values(), key=lambda e: (-e['bytes'], e['path'])),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='fail if the committed file drifted')
    args = parser.parse_args()
    payload = build()
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    if not args.check:
        OUT.write_text(text, encoding='utf-8')
        print(f'REPO_CLASSIFICATION=WRITTEN {OUT.relative_to(REPO).as_posix()} '
              f'bundles={len(payload["bundles"])} '
              f'workingTreeMiB={payload["totals"]["workingTreeMiB"]} '
              f'packMiB={payload["totals"]["packMiB"]}')
        return 0
    # A regeneration always rewrites the timestamp, the observed commit and the
    # pack size; those are not drift. `size-pack` in particular is a property of
    # the clone (CI checks out with limited history), so treating it as an
    # invariant would raise a false failure there.
    if not OUT.exists():
        print('REPO_CLASSIFICATION=MISSING')
        return 1
    committed = json.loads(OUT.read_text(encoding='utf-8'))
    watched = lambda t: {'trackedFiles': t['trackedFiles'], 'workingTreeMiB': t['workingTreeMiB']}
    if watched(committed['totals']) != watched(payload['totals']):
        print('REPO_CLASSIFICATION=DRIFT totals\n  committed=%s\n  derived=%s'
              % (json.dumps(committed['totals']), json.dumps(payload['totals'])))
        return 1
    if committed['categories'] != payload['categories']:
        print('REPO_CLASSIFICATION=DRIFT categories')
        print('  committed=%s' % json.dumps(committed['categories'], ensure_ascii=False)[:400])
        print('  derived=%s' % json.dumps(payload['categories'], ensure_ascii=False)[:400])
        return 1
    key = lambda items: {e['path']: (e['category'], e['files'], e['bytes']) for e in items}
    if key(committed['bundles']) != key(payload['bundles']):
        moved = sorted(set(key(committed['bundles'])) ^ set(key(payload['bundles'])))
        print('REPO_CLASSIFICATION=DRIFT bundles', moved[:10])
        return 1
    print('REPO_CLASSIFICATION=OK (derived facts match the committed file)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
