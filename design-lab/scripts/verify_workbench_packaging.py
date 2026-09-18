#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DESIGN-LAB Workbench D003 Build-Output-Truth / packaging static verifier.

Fails closed if any of:
  * src/design_lab/workbench.py routes /workbench/main.js to anything but
    'build/main.js' (the single Build Output Truth; 'dist' is deprecated)
  * the committed Vite bundle apps/workbench/build/main.js is absent / too small
  * the .gitignore negation that TRACKS apps/workbench/build/ is missing
    (D003 committed-bundle, no-drift; unlike the generic 'build/' ignore above)
  * git does not track apps/workbench/build/main.js
  * pyproject.toml no longer force-includes apps/workbench ->
    design_lab/resources/workbench (the wheel packaging path that lets the
    packaged Python package serve the same committed bundle)

Pure stdlib + git; does NOT import the (not-yet-packed) design_lab package, so
it can run inside the node workbench-gate before the Python wheel exists.
Deterministic and network-free; reads only the working tree.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    CHECKS.append((name, ok, detail))
    suffix = f' — {detail}' if detail and not ok else ''
    print(('PASS ' if ok else 'FAIL ') + name + suffix)


# 1) Routing truth: the Workbench route must point at the build output dir.
wb = (ROOT / 'src/design_lab/workbench.py').read_text(encoding='utf-8')
m = re.search(r"'/workbench/main\.js':\s*\('([^']+)'.*?", wb)
route = m.group(1) if m else '<route-not-found>'
check('workbench.py routes /workbench/main.js to build/main.js (D003)',
      route == 'build/main.js', f'got {route!r}')

# 2) Committed Vite bundle present and non-trivial.
bundle = ROOT / 'apps/workbench/build/main.js'
size = bundle.stat().st_size if bundle.is_file() else 0
check('committed Vite bundle present (apps/workbench/build/main.js)',
      size > 1000, f'{bundle.name} missing or too small ({size} bytes)')

# 3) .gitignore negation that tracks the workbench build dir.
gi = (ROOT / '.gitignore').read_text(encoding='utf-8')
check('.gitignore negation tracks apps/workbench/build/',
      '!apps/workbench/build/' in gi and '!apps/workbench/build/**' in gi,
      'negation rules missing — build/ would stay ignored')

# 4) git actually tracks the bundle (committed into the repo).
r = subprocess.run(['git', 'ls-files', 'apps/workbench/build/main.js'],
                   cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
check('git tracks apps/workbench/build/main.js',
      r.returncode == 0 and 'apps/workbench/build/main.js' in r.stdout,
      (r.stdout.strip() or r.stderr.strip()))

# 5) pyproject force-includes the workbench into the wheel resource path.
pp = (ROOT / 'pyproject.toml').read_text(encoding='utf-8')
check('pyproject force-includes apps/workbench -> design_lab/resources/workbench',
      re.search(r'["\']?apps/workbench["\']?\s*=\s*["\']design_lab/resources/workbench["\']', pp) is not None,
      'force-include mapping missing — wheel would not ship the committed bundle')

failed = [name for name, ok, _ in CHECKS if not ok]
print('\nWORKBENCH PACKAGING: ' +
      ('FAIL-CLOSED — ' + '; '.join(failed) if failed else 'all 5 Build-Output-Truth / packaging checks passed'))
sys.exit(1 if failed else 0)
