# SPDX-License-Identifier: MIT
"""Resolve immutable SQL resources in an installed package or its source tree.

The source SQL directory remains authoritative. A distribution builder must
copy those bytes into resources/state; a missing installed resource fails closed.
"""
from importlib.resources import files
from pathlib import Path

_NAMES = frozenset({
    'design-lab-state-v1.sql',
    'design-lab-state-assets-v1.sql',
    'design-lab-state-assets-v2.sql',
    'design-lab-state-attempt-v1.sql',
    'design-lab-state-attempt-v2.sql',
})


def state_schema(name):
    if name not in _NAMES:
        raise ValueError('unknown state schema resource')
    packaged = files('design_lab').joinpath('resources', 'state', name)
    if packaged.is_file():
        return packaged
    module = Path(__file__).resolve()
    root = module.parents[3]
    # Never search CWD, a user profile, or an unrelated adjacent project.
    if (root / 'src/design_lab/runtime/state_resources.py').resolve() == module:
        source = root / 'design-lab/schemas/state' / name
        if source.is_file():
            return source
    raise FileNotFoundError(f'packaged state schema missing: {name}')
