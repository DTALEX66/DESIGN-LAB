#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Measure the workbench's shipped weight before anyone claims it got lighter (DL-KB-13).

The card's rule is 先量基线再改 and 给出实测读数与阈值，而不是「感觉变快了」. So this file reports
only what it can read off the bytes in front of it, and refuses three temptations:

* it prints no frames-per-second, no "snappier", no percentage improvement -- none of those are
  observable here, and inference latency is reported elsewhere and never mixed into these numbers;
* it does not invent a performance budget: `design.qa.yaml` declares none today, so a ceiling is
  an explicit owner decision. The one hard rule checked here is the one already implied by the
  project's own offline claim -- a shipped file that reaches for a remote URL is a finding;
* it does not judge the *source* tree. Every byte figure is the artifact the browser actually
  loads, so a rebuild that doubles the bundle cannot hide behind unchanged sources.

Pure stdlib. Read-only.

    python scripts/measure_workbench_weight.py            # readings
    python scripts/measure_workbench_weight.py --check    # fail on a remote reference
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SHIPPED = [
    ('bundle', REPO / 'apps/workbench/build/main.js'),
    ('stylesheet', REPO / 'apps/workbench/style.css'),
    ('document', REPO / 'apps/workbench/index.html'),
]
# The three surfaces that page a list for the operator, read from the code that enforces them.
PAGE_SIZES = {
    'knowledge list default': ('src/design_lab/knowledge_library.py', 'DEFAULT_LIMIT'),
    'knowledge list maximum': ('src/design_lab/knowledge_library.py', 'MAX_LIMIT'),
    'plan list default': ('src/design_lab/assistance_plan.py', 'DEFAULT_LIMIT'),
    'target profile list default': ('src/design_lab/target_profile.py', 'DEFAULT_LIMIT'),
    'plan feedback list default': ('src/design_lab/plan_feedback.py', 'DEFAULT_LIMIT'),
}
# An XML namespace is an identifier, not a fetch: all four `http:` hits in the shipped bundle were
# createElementNS("http://www.w3.org/2000/svg"). Convicting them would make this check cry wolf,
# and a check that cries wolf gets switched off. Real fetches still are findings.
NAMESPACES = ('http://www.w3.org/1999/xhtml', 'http://www.w3.org/2000/svg',
              'http://www.w3.org/1999/xlink', 'http://purl.org/dc/elements/1.1/',
              'https://design-lab.local/')
REMOTE = re.compile(r'''https?://[^\s"')]+|(?:cdn\.|unpkg\.|jsdelivr\.)[a-z0-9.-]+'''
                    r'''|googleapis\.com|gstatic\.com|googleusercontent\.com''')


def remote_refs(text: str) -> list[str]:
    """Every URL-shaped reference in these bytes that is not a namespace identifier."""
    return [hit for hit in REMOTE.findall(text) if not hit.startswith(NAMESPACES)]
DATA_URI = re.compile(r'data:[a-z0-9.+-]+/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]*')
EL_CALL = re.compile(r"\bel\('")
ROUTE_VIEWS = re.compile(r"hash:\s*'[^']*'")


def read(path: Path) -> bytes:
    if not path.is_file():
        raise SystemExit(f'MEASURE_UNREADABLE {path.relative_to(REPO)} is not a file')
    return path.read_bytes()


def limits() -> dict[str, int]:
    out = {}
    for label, (rel, name) in PAGE_SIZES.items():
        match = re.search(rf'^{name} = (\d+)', read(REPO / rel).decode('utf-8'), re.M)
        if match is None:
            raise SystemExit(f'MEASURE_SOURCE_MOVED {rel} no longer declares {name}')
        out[label] = int(match.group(1))
    return out


def measure() -> dict:
    files = {}
    remote_hits = []
    inline_bytes = 0
    inline_count = 0
    for label, path in SHIPPED:
        raw = read(path)
        files[label] = {'bytes': len(raw), 'gzip': len(gzip.compress(raw, 9)),
                        'sha256': __import__('hashlib').sha256(raw).hexdigest()[:16]}
        text = raw.decode('utf-8', errors='replace')
        remote_hits += [f'{label}: {hit}' for hit in remote_refs(text)]
        for uri in DATA_URI.finditer(text):
            inline_count += 1
            inline_bytes += len(uri.group(0))
    shell = read(REPO / 'apps/workbench/shell.ts').decode('utf-8')
    budget = 'budget' in (REPO / 'design.qa.yaml').read_text(encoding='utf-8').lower()
    return {'files': files, 'remoteReferences': remote_hits,
            'inlineDataUris': {'count': inline_count, 'bytes': inline_bytes,
                               'shareOfBundlePercent': round(
                                   100.0 * inline_bytes / files['bundle']['bytes'], 2)},
            'mountPoints': len(EL_CALL.findall(shell)),
            'routedViews': len(ROUTE_VIEWS.findall(
                shell[shell.index('export const ROUTE_VIEWS'):shell.index('\n];',
                                                                          shell.index('export const ROUTE_VIEWS'))])),
            'pageSizes': limits(),
            'budgetDeclared': budget}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    data = measure()
    if args.json:
        print(json.dumps(data, ensure_ascii=False, sort_keys=True))
    else:
        for label, entry in data['files'].items():
            print(f'WEIGHT {label:10} bytes={entry["bytes"]:>8} gzip={entry["gzip"]:>7} '
                  f'sha={entry["sha256"]}')
        print(f'WEIGHT inline-data count={data["inlineDataUris"]["count"]} '
              f'bytes={data["inlineDataUris"]["bytes"]} '
              f'share={data["inlineDataUris"]["shareOfBundlePercent"]}% of the bundle')
        print(f'WEIGHT mountPoints={data["mountPoints"]} routedViews={data["routedViews"]}')
        for label, value in data['pageSizes'].items():
            print(f'WEIGHT page {label} = {value}')
        print(f'WEIGHT remoteReferences={len(data["remoteReferences"])} '
              f'budgetDeclared={data["budgetDeclared"]}')
        for hit in data['remoteReferences']:
            print(f'WEIGHT REMOTE_REFERENCE {hit}')
    if not data['budgetDeclared']:
        print('WEIGHT NOTE design.qa.yaml declares no performance budget; a ceiling is an owner '
              'decision, so these are baseline readings, not a pass/fail judgement on size.')
    if args.check:
        if data['remoteReferences']:
            print('WORKBENCH_WEIGHT_GATE=FAIL remote references in shipped bytes: '
                  f'{len(data["remoteReferences"])}')
            return 1
        print(f'WORKBENCH_WEIGHT_GATE=OK remote=0 bundle_gzip={data["files"]["bundle"]["gzip"]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
