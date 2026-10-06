#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Keep status vocabularies from being hand-copied into disagreement.

LANGUAGE-POLICY §5: enums and status words are not copied by hand between Python,
TypeScript and host JS; the contract file is the authority and each language
either validates against it or generates from it. A hand copy already drifted
once -- the Workbench advertised the preflight verdict as "PASS / BLOCKED" while
runtime/task_resources.py only ever emits READY or BLOCKED -- so this checks the
contract against BOTH sides rather than trusting either.

FAILS when:
  * a Python source no longer matches the recorded vocabulary (two-way);
  * the Workbench's triage sets match neither the contract nor each other;
  * a verdict/status literal appears in the UI that the service cannot emit
    (the 'PASS' class of false claim), including inside the built bundle.

Read-only. Pure stdlib.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CONTRACT = REPO / 'design-lab' / 'config' / 'state-vocabularies.json'
JOB_STORE = REPO / 'src' / 'design_lab' / 'runtime' / 'job_store.py'
TASK_RESOURCES = REPO / 'src' / 'design_lab' / 'runtime' / 'task_resources.py'
SHELL_TS = REPO / 'apps' / 'workbench' / 'shell.ts'
BUNDLE = REPO / 'apps' / 'workbench' / 'build' / 'main.js'


def quoted(text: str) -> set[str]:
    """Upper-snake identifiers inside either quote style (TS uses single quotes)."""
    return set(re.findall(r"""['"]([A-Z][A-Z0-9_]{2,})['"]""", text))


def py_attempt_states() -> tuple[set[str], set[str]]:
    text = JOB_STORE.read_text(encoding='utf-8')
    terminal = quoted(re.search(r'^TERMINAL = \{(.*?)\}', text, re.S | re.M).group(1))
    allowed = re.search(r'^ALLOWED = \{(.*?)^\}', text, re.S | re.M).group(1)
    keys = set(re.findall(r'^\s*"([A-Z_]+)":', allowed, re.M))
    return keys | terminal, terminal


def py_preflight() -> tuple[set[str], set[str], set[str], set[str]]:
    text = TASK_RESOURCES.read_text(encoding='utf-8')
    verdict = set(re.findall(r'verdict = "([A-Z_]+)" if', text))
    verdict |= {v for v in quoted(text) if v in {'READY', 'BLOCKED', 'PASS'}}
    states = set(re.findall(r'"state": "([A-Z_]+)"', text))
    # `state = "RESOLVED" if executable else "UNAVAILABLE"` -- both branches count.
    for a, b in re.findall(r'state = "([A-Z_]+)" if .*? else "([A-Z_]+)"', text):
        states |= {a, b}
    block_match = re.search(
        r'blocked = \[r for r in results if r\.get\("state"\) in \((.*?)\)\]', text, re.S)
    blocking = set(re.findall(r'"([A-Z_]+)"', block_match.group(1))) if block_match else set()
    registry = set(re.findall(r'registry_state = "([A-Z_]+)"', text))
    return verdict, states, registry, blocking


def ts_set(name: str) -> set[str]:
    if not SHELL_TS.is_file():
        return set()
    text = SHELL_TS.read_text(encoding='utf-8')
    match = re.search(rf'const {name} = new Set\(\[(.*?)\]\)', text, re.S)
    return quoted(match.group(1)) if match else set()


def main() -> int:
    errors: list[str] = []
    try:
        contract = json.loads(CONTRACT.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as exc:
        print(f'STATE_VOCABULARIES=FAIL contract unreadable: {exc}')
        return 1
    if contract.get('schemaVersion') != 'design-lab/state-vocabularies/v1':
        print('STATE_VOCABULARIES=FAIL wrong schemaVersion')
        return 1

    attempts = contract['attemptStates']
    declared_all = set(attempts['all'])
    declared_terminal = set(attempts['terminal'])

    py_all, py_terminal = py_attempt_states()
    if py_all != declared_all:
        errors.append(f'job_store ALLOWED/TERMINAL = {sorted(py_all)} but contract says '
                      f'{sorted(declared_all)}')
    if py_terminal != declared_terminal:
        errors.append(f'job_store TERMINAL = {sorted(py_terminal)} but contract says '
                      f'{sorted(declared_terminal)}')

    for name, key in (('FAILED_STATES', 'failed'), ('HUMAN_STATES', 'needsHuman'),
                      ('IN_FLIGHT_STATES', 'inFlight')):
        in_ui = ts_set(name)
        if not in_ui:
            errors.append(f'{name} not found in apps/workbench/shell.ts; the UI vocabulary '
                          f'cannot be verified')
            continue
        expected = set(attempts[key])
        if in_ui != expected:
            errors.append(f'{name} = {sorted(in_ui)} but contract says {sorted(expected)}')

    ui_sets = set().union(*(ts_set(n) for n in
                            ('FAILED_STATES', 'HUMAN_STATES', 'IN_FLIGHT_STATES')))
    if ui_sets and ui_sets > declared_all:
        errors.append(f'UI triage uses states the service cannot emit: '
                      f'{sorted(ui_sets - declared_all)}')

    verdict, states, registry, blocking = py_preflight()
    declared_verdicts = set(contract['taskResourcePreflight']['verdicts'])
    for label, actual, key in (('verdict', verdict, 'verdicts'),
                               ('resource state', states, 'resourceStates'),
                               ('blocking resource state', blocking, 'blockingResourceStates'),
                               ('registry_state', registry, 'registryStates')):
        expected = set(contract['taskResourcePreflight'][key])
        if actual != expected:
            errors.append(f'task_resources {label} = {sorted(actual)} but contract says '
                          f'{sorted(expected)}')

    # The specific regression this file exists for: the UI taught a verdict word
    # the service cannot emit. Look for the verdict-shaped literal only, so an
    # unrelated use of the word elsewhere cannot produce a false alarm.
    for path, label in ((SHELL_TS, 'shell.ts'), (BUNDLE, 'build/main.js')):
        if not path.is_file():
            continue
        body = path.read_text(encoding='utf-8', errors='replace')
        for hit in re.findall(r"['\"]([A-Z]{3,10})\s*/\s*[A-Z]{3,10}['\"]", body):
            if set(hit.split('/')) - declared_verdicts:
                errors.append(f'{label} advertises the verdict pattern {hit!r}; the service '
                              f'emits only {sorted(declared_verdicts)}')
        for hit in re.findall(r"['\"](PASS|FAIL|OKAY|APPROVED)['\"]", body):
            if hit not in declared_verdicts:
                errors.append(f'{label} advertises {hit!r} as a status; the service emits '
                              f'only {sorted(declared_verdicts)}')

    print(f'STATE_VOCABULARIES attempt_states={len(declared_all)} verdicts='
          f'{contract["taskResourcePreflight"]["verdicts"]} errors={len(errors)}')
    for err in errors[:12]:
        print('ERROR:', err)
    print('STATE_VOCABULARIES=' + ('FAIL' if errors else 'OK'))
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
