# SPDX-License-Identifier: MIT
"""Report which repository files the HTTP service can reach, and whether the wheel ships them.

Why this exists: `PROJECT_ROOT` is `Path(__file__).parents[3]`, which is the checkout in a source
tree but the interpreter's own `Lib` inside an installed wheel. A route that opens its contract that
way answers a refusal there, and nothing in a source checkout can see it -- in 2026-10-23 one such
read answered `500 INTERNAL`, another `503 PROJECT_STORE_UNAVAILABLE` (blaming the user's database),
and a third answered `409 NATIVE_BUNDLE_UNVERIFIED`, i.e. a missing packaged file wearing the mask of
a judgement about the work.

This walks an import closure from `src/design_lab/http_service.py` -- module level and function
level, because the service defers several imports into handlers -- and reports every expression that
builds a repository path from the root, plus whether pyproject's wheel force-include ships it under
`design_lab/resources/repo/` (the prefix `runtime/state_resources.repo_resource()` looks in).

Two limits are stated rather than hidden, because a green-looking "0 remaining" from this tool is not
proof:
  * a root parked in a variable first (`REPO = Path(__file__).resolve().parents[3]` then
    `REPO / 'design-lab/...'`) is not followed -- two of the three original readers were spelled
    that way;
  * a reader that resolves packaged-first to a *different* packaged prefix (the Adobe bridges under
    `design_lab/resources/adobe/`) is reported as not declared and is correct.
The claim that an installed wheel really serves the product is carried by the behavioural gate:
`design-lab/tests/test_standalone_chain_http.py` under `DL_LAUNCH_INSTALLED=1`, which CI's clean-wheel
job runs.

`--control` proves the detector fires: it pulls the pre-fix bytes of readers that spelled the root in
each recognised form out of git and asserts they are found. A detector that reports nothing is
indistinguishable from a fixed tree unless something demonstrates it can still see the disease.
"""
from __future__ import annotations

import argparse
import ast
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / 'src' / 'design_lab'
DATA = re.compile(r'^(design-lab|packages|vendor|research|integrations|apps)')
REPO_RESOURCE_PREFIX = 'design_lab/resources/repo/'
CONTROL_REF = '91186bc7'
CONTROL_FILES = [
    'src/design_lab/assurance/production_preflight.py',
    'src/design_lab/model_catalog.py',
]


def force_include_pairs(pyproject_text: str) -> set[tuple[str, str]]:
    return set(re.findall(r'"([^"]+)"\s*=\s*"(design_lab/resources[^"]+)"', pyproject_text))


def is_shipped(relative: str, pairs) -> bool:
    """Whether some force-include line ships this path, by its own key or an ancestor directory key."""
    parts = Path(relative).parts
    for depth in range(len(parts), 0, -1):
        source = 'design-lab/' + '/'.join(parts[:depth])
        if (source, REPO_RESOURCE_PREFIX + source) in pairs:
            return True
    return False


def is_repo_root_expression(node) -> bool:
    if isinstance(node, ast.Name) and node.id == 'PROJECT_ROOT':
        return True
    if isinstance(node, ast.Call):
        args = node.args or []
        if len(args) == 1 and isinstance(args[0], ast.Name) and args[0].id == 'PROJECT_ROOT':
            return True
    probe = node
    if isinstance(probe, ast.Call) and isinstance(probe.func, ast.Name) and probe.func.id == 'Path':
        probe = probe.args[0] if probe.args else probe
    if (isinstance(probe, ast.Subscript) and isinstance(probe.value, ast.Attribute)
            and probe.value.attr == 'parents'):
        return '__file__' in {getattr(item, 'id', None) for item in ast.walk(probe.value.value)}
    return False


def parts_of(node):
    """The literal pieces of `<repo root> / 'a' / 'b'`, or None when this is not one."""
    pieces = []
    while isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
        if not isinstance(node.right, ast.Constant) or not isinstance(node.right.value, str):
            return None
        pieces.append(node.right.value)
        node = node.left
        if is_repo_root_expression(node):
            return list(reversed(pieces))
    return list(reversed(pieces)) if is_repo_root_expression(node) else None


def module_path(name: str, current: Path) -> Path:
    if name.startswith('.'):
        depth = len(name) - len(name.lstrip('.'))
        rest = name.lstrip('.').replace('.', '/')
        base = current.parent
        for _ in range(depth - 1):
            base = base.parent
        return (base / (rest + '.py')) if rest else (base / '__init__.py')
    return SRC / (name.replace('.', '/') + '.py')


def imports_of(path: Path) -> set[str]:
    found: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding='utf-8'))):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            base = ('.' * node.level) + (node.module or '')
            found.add(base)
            for alias in node.names:
                if alias.name != '*':
                    found.add(f'{base}.{alias.name}' if (node.module or node.level) else alias.name)
    return found


def build_closure(start: Path = SRC / 'http_service.py') -> set[Path]:
    found, pending = set(), [start]
    while pending:
        path = pending.pop()
        if path in found:
            continue
        found.add(path)
        for name in imports_of(path):
            target = module_path(name, path)
            if target.is_file() and target not in found:
                pending.append(target)
    return found


def scan(paths) -> list[tuple[str, str]]:
    hits = []
    for path in paths:
        for node in ast.walk(ast.parse(path.read_text(encoding='utf-8'))):
            targets = [node.value] if isinstance(node, ast.Assign) else []
            if isinstance(node, (ast.Return, ast.Call)):
                targets = [child for child in ast.walk(node) if isinstance(child, ast.BinOp)]
            for target in targets:
                pieces = parts_of(target)
                if pieces and DATA.search('/'.join(pieces)):
                    hits.append((str(path), '/'.join(pieces)))
    return hits


def control() -> int:
    work = Path(tempfile.mkdtemp(prefix='dl-root-reads-control-'))
    paths = []
    for relative in CONTROL_FILES:
        text = subprocess.run(['git', '-C', str(REPO), 'show', f'{CONTROL_REF}:{relative}'],
                              capture_output=True, text=True, encoding='utf-8').stdout
        if not text:
            print(f'CONTROL_REFUSING git show {CONTROL_REF}:{relative} returned nothing')
            return 2
        target = work / Path(relative).name
        target.write_text(text, encoding='utf-8', newline='\n')
        paths.append(target)
    hits = scan(paths)
    names = sorted({f'{Path(module).name} -> {relative}' for module, relative in hits})
    print('CONTROL hits=' + str(len(names)))
    for name in names:
        print('   ' + name)
    if len(names) < len(CONTROL_FILES):
        print('CONTROL_FAILED: the detector no longer sees the pre-fix spellings it was written for')
        return 1
    print('CONTROL=OK every pre-fix reader was found')
    return 0


def report(pairs) -> int:
    closure = build_closure()
    rows, seen = [], set()
    for module_file, relative in scan(sorted(closure)):
        if (module_file, relative) in seen:
            continue
        seen.add((module_file, relative))
        resolved = REPO / relative
        rows.append((str(Path(module_file).relative_to(SRC)), relative,
                     'SHIPPED' if is_shipped(relative, pairs) else 'NOT-SHIPPED',
                     'dir' if resolved.is_dir() else ('file' if resolved.exists() else 'absent')))
    print('REPO_ROOT_READS closure_modules=' + str(len(closure)) + ' paths=' + str(len(rows)))
    for module, relative, state, kind in sorted(rows):
        print(f'  {state:<11} {kind:<6} {module:<36} {relative}')
    undeclared = sorted({relative for _, relative, state, _ in rows if state == 'NOT-SHIPPED'})
    print('REPO_ROOT_READS=REPORT paths=' + str(len(rows))
          + ' not_shipped_under_resources_repo=' + str(len(undeclared))
          + ' NOT_SHIPPED=[' + ','.join(undeclared) + ']'
          + ' (see the two documented blind spots; the behavioural gate is the proof)')
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--control', action='store_true',
                        help='prove the detector still finds the pre-fix spellings, and exit')
    options = parser.parse_args(argv)
    if options.control:
        return control()
    return report(force_include_pairs((REPO / 'pyproject.toml').read_text(encoding='utf-8')))


if __name__ == '__main__':
    sys.exit(main())
