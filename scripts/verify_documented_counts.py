#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Prose numbers must equal measured numbers.

Two stale figures reached a live surface this session: a source comment that still narrated the
workbench route table as 15 entries (it is 19), and DESIGN.md's "11 nav items need 587px, the list
only overflows below 720" (19 items, and it overflows at every desktop height measured). Both were
believed, and nothing failed. The repo already solves this once -- `scripts/design_debt_baseline.py
--check` compares the debt prose against the measurement -- so this is the same mechanism for the
counts no gate owned yet.

A claim is (file, a template holding exactly one `{n}`, a callable). The measurement reads code,
never the sentence; the sentence is never an input to the measurement -- that separation is the only
thing keeping this from being a tautology. Every extractor fails loudly when it matches nothing,
because a dead pattern that reports 0 would otherwise green-light a wrong document.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import sys

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / 'src'))


def _require(count: int, what: str) -> int:
    if count == 0:
        raise SystemExit(f'DOCUMENTED_COUNTS=FAIL the {what} extractor matched nothing; '
                         'a dead pattern must not be allowed to report a count')
    return count


def route_views() -> int:
    """Entries in the workbench route table -- the authority for how many nav items exist."""
    src = (REPO / 'apps/workbench/shell.ts').read_text(encoding='utf-8')
    start = src.index('export const ROUTE_VIEWS')
    body = src[start:src.index('] as const', start)]
    return _require(len(re.findall(r'^\s{2}\{ hash:', body, re.M)), 'ROUTE_VIEWS')


def cli_subcommands() -> int:
    src = (REPO / 'src/design_lab/cli.py').read_text(encoding='utf-8')
    return _require(src.count('add_parser('), 'cli add_parser')


def registry_adapters() -> int:
    data = json.loads((REPO / 'integrations/adapter-registry.json').read_text(encoding='utf-8'))
    rows = data.get('adapters', data if isinstance(data, list) else [])
    return _require(len(rows), 'adapter-registry')


def frozen_current_tasks() -> int:
    """Every parent and child under `currentExecution`, and they must all still be frozen.

    The prose says "34 项父/子任务全部 FROZEN_DEFERRED" in several places. That sentence carries a
    boundary, not just a count: unfreezing is an owner decision. So the measurement refuses to
    report a number while any task has left the frozen state, instead of quietly matching a count
    over a set that no longer means what the sentence says.
    """
    ledger = json.loads((REPO / 'design-lab/config/task-ledger-r3.json').read_text(encoding='utf-8'))

    def walk(node):
        for task in node.get('tasks') or []:
            yield task
            yield from walk(task)

    tasks = list(walk(ledger.get('currentExecution') or {}))
    _require(len(tasks), 'currentExecution task walk')
    loose = [str(t.get('id') or '?') for t in tasks if t.get('state') != 'FROZEN_DEFERRED']
    if loose:
        raise SystemExit(f'DOCUMENTED_COUNTS=FAIL {len(loose)} currentExecution task(s) are no '
                         f'longer FROZEN_DEFERRED ({loose[:5]}). Unfreezing is an owner decision; '
                         'until that is recorded, the sentences claiming all of them are frozen '
                         'are false and this gate will not help hide it.')
    return len(tasks)


def http_routes() -> int:
    from design_lab import http_service
    return _require(len(http_service.ROUTES), 'http_service.ROUTES')


CHAIN_TEST = 'design-lab/tests/test_standalone_chain_http.py'


def _chain_labels(*methods: str) -> int:
    """How many hop labels that walk prints, counted from the bodies it actually runs.

    A label comes from either `self.hop(...)` or a manual `self.hops.append(...)` (the native read
    back is appended, not called), so both forms count. This is the number quoted as
    "N 跳验收链" / "N 跳交付链" in the prompt -- if a hop is added and the prose is not, this moves
    and the sentence fails to match.

    Several methods may be named because the delivery walk shares its seed with the GET sweep: the
    hops live in `_deliver_to_preflight`, and a single-method pattern went red the moment that
    helper was extracted. Counting the delegation target keeps the claim measured instead of
    pinning the file's shape in place.
    """
    src = (REPO / CHAIN_TEST).read_text(encoding='utf-8')
    total = 0
    for method in methods:
        start = src.index('def ' + method)
        nxt = src.find('\n    def ', start + 10)
        body = src[start:nxt if nxt > 0 else len(src)]
        total += len(re.findall(r'self\.hop\(', body))
        total += len(re.findall(r'self\.hops\.append\(', body))
    _require(total, '+'.join(methods) + ' hop labels')
    return total


def acceptance_hops() -> int:
    return _chain_labels('test_the_chain_walks_from_project_to_a_reviewed_candidate')


def delivery_hops() -> int:
    return _chain_labels('test_the_delivery_leg_reaches_a_preflight_verdict_on_one_project',
                         '_deliver_to_preflight')


WRITE_TEST = 'design-lab/tests/test_installed_write_surface.py'
LEDGER = 'design-lab/config/contract-bindings.json'


def ledger_post_rows() -> int:
    """POST-containing ledger rows -- the denominator the write sweep is checked against."""
    document = json.loads((REPO / LEDGER).read_text(encoding='utf-8'))
    rows = [row['route'] for row in document['routes'] if 'POST' in row['method']]
    _require(len(rows), 'ledger POST rows')
    return len(rows)


def write_sweep_walked() -> int:
    """How many rows the write table performs, counted from the table itself.

    The prose distinguishes "walked" from "excluded", so the number has to come from the table's own
    entries rather than from the ledger: those two differ by exactly the rows the sweep refuses to
    POST, and a sentence that conflated them must not be able to agree with itself.
    """
    src = (REPO / WRITE_TEST).read_text(encoding='utf-8')
    start = src.index('WRITES = (')
    region = src[start:src.index('# -- the walk', start)]
    count = len(re.findall(r"^\s+\{'route':", region, re.M))
    _require(count, 'write-sweep WRITES entries')
    return count



def ledger_get_rows() -> int:
    """Ledger rows whose method is GET only -- the read sweep's denominator."""
    document = json.loads((REPO / LEDGER).read_text(encoding='utf-8'))
    rows = [row['route'] for row in document['routes'] if row['method'] == 'GET']
    _require(len(rows), 'ledger GET rows')
    return len(rows)


def get_sweep_unmeasured() -> int:
    """How many ledger GET rows the read sweep still does not call, counted from its own table.

    The sweep prints this number; the prose quotes it. Counting the marker-prefixed entries
    (`UNCONSTRUCTED:` / `COVERED-ELSEWHERE:` / `NOT-A-PATH:`) rather than trusting the sentence keeps
    "we stopped measuring this" from being reported as "there was nothing to measure".
    """
    src = (REPO / CHAIN_TEST).read_text(encoding='utf-8')
    region = src[src.index('GET_READS = {'):src.index('#: 5xx the sweep may see')]
    count = len(re.findall(r"\['(UNCONSTRUCTED:|COVERED-ELSEWHERE:|NOT-A-PATH:)", region))
    _require(count, 'read-sweep unmeasured entries')
    return count


# (file, template, measurement). Templates carry enough words to be unambiguous and to fail loudly
# when the sentence is rewritten rather than updated.
#
# The frozen-count sentence appears on four authority surfaces that all restate the same ledger fact.
# The 2026-10-20 owner unfreeze does NOT move this number: it authorizes three product segments that
# are not ledger tasks (`currentExecution` keeps its 34 `FROZEN_DEFERRED` rows, measured here), so the
# walk still refusing to report a count while any row has left the frozen state remains the honest
# guard -- if a future batch unfreezes a ledger task, every one of these four sentences goes red at
# once rather than quietly agreeing with a stale ledger.
CLAIMS = [
    ('DESIGN.md', '导航 {n} 项', route_views),
    ('docs/current/NEXT-AGENT-PROMPT.md', '{n} 个子命令（`src/design_lab/cli.py`', cli_subcommands),
    ('docs/current/NEXT-AGENT-PROMPT.md', 'adapter-registry.json` {n} 条', registry_adapters),
    ('docs/current/NEXT-AGENT-PROMPT.md', 'ROUTES` 为准，共 {n} 条', http_routes),
    # The write sweep's two denominators: the ledger's POST rows, and how many of them the table
    # actually performs. Both are quoted in the current face, and they differ by the excluded rows.
    ('docs/current/NEXT-AGENT-PROMPT.md', '账本 **{n} 条 POST 行**', ledger_post_rows),
    ('docs/current/NEXT-AGENT-PROMPT.md', '其中 **{n} 行**逐行真写', write_sweep_walked),
    ('docs/current/NEXT-AGENT-PROMPT.md', '账本是 **{n} 条** GET 行', ledger_get_rows),
    ('docs/current/NEXT-AGENT-PROMPT.md', '仍有 **{n} 条**没被这条扫描读到', get_sweep_unmeasured),
    ('docs/current/NEXT-AGENT-PROMPT.md', '**{n} 跳验收链**', acceptance_hops),
    ('docs/current/NEXT-AGENT-PROMPT.md', '**{n} 跳交付链**', delivery_hops),
    ('docs/current/NEXT-AGENT-PROMPT.md', '` 的 **{n} 项父/子任务全部', frozen_current_tasks),
    ('AUTHORITY.md', '其余 {n} 项仍 `FROZEN_DEFERRED`', frozen_current_tasks),
    ('AGENTS.md', '其余 {n} 项仍 `FROZEN_DEFERRED`', frozen_current_tasks),
    ('docs/current/PRODUCT_DEFINITION.md', '其余 {n} 项仍 `FROZEN_DEFERRED`', frozen_current_tasks),
    ('docs/taskpacks/20261020-unfreeze/OWNER-DECISION-2026-10-20.md',
     '其余 {n} 项仍 `FROZEN_DEFERRED`', frozen_current_tasks),
]


def check(verbose: bool = False) -> int:
    problems = []
    for rel, template, measure in CLAIMS:
        truth = measure()
        text = (REPO / rel).read_text(encoding='utf-8')
        want = template.format(n=truth)
        if want in text:
            if verbose:
                print(f'PASS {rel}: {want}')
            continue
        # The template is prose, not a pattern: '**{n} 跳验收链**' starts with `**`, which is an
        # illegal regex on its own. Escaping first and substituting the escaped placeholder keeps the
        # report path from raising PatternError exactly when a document is stale -- the one moment the
        # gate has to answer with a finding instead of a traceback.
        pattern = re.escape(template).replace(re.escape('{n}'), r'(\d+)')
        said = re.findall(pattern, text)
        problems.append(f'{rel}: prose says {said or "nothing"}, measurement says {truth} '
                        f'(expected the sentence "{want}")')
    for line in problems:
        print('FAIL ' + line)
    if problems:
        print(f'DOCUMENTED_COUNTS=FAIL claims={len(CLAIMS)} failed={len(problems)}')
        return 1
    print(f'DOCUMENTED_COUNTS=PASS claims={len(CLAIMS)} route_views={route_views()} '
          f'cli={cli_subcommands()} adapters={registry_adapters()} routes={http_routes()}')
    return 0


if __name__ == '__main__':
    raise SystemExit(check('--verbose' in sys.argv))
