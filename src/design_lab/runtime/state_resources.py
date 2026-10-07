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
    'design-lab-state-creative-v1.sql',
    'design-lab-state-jury-v1.sql',
    # 2026-10-08 quality-gate reachability: the sealed QualityRecord store
    # (design-lab/schemas/state/design-lab-state-quality-v1.sql, applied by
    # src/design_lab/assurance/quality_store.py). Additive: one new immutable
    # resource name, no existing file renamed or re-versioned.
    'design-lab-state-quality-v1.sql',
    # 2026-10-08 rights-gate reachability: the Human Rights decision store
    # (design-lab/schemas/state/design-lab-state-rights-v1.sql, applied by
    # src/design_lab/assurance/rights_ledger.py). Additive: one new immutable
    # resource name, no existing file renamed or re-versioned.
    'design-lab-state-rights-v1.sql',
    # 2026-10-08 research-finding reachability: the ResearchFinding working-state store
    # (design-lab/schemas/state/design-lab-state-research-v1.sql, applied by
    # src/design_lab/assurance/research_store.py). Additive: one new immutable resource
    # name, no existing file renamed or re-versioned.
    'design-lab-state-research-v1.sql',
    'design-lab-state-design-layer-v1.sql',
    'design-lab-state-design-layer-v2.sql',
    'design-lab-state-design-layer-v3.sql',
    'design-lab-state-design-layer-v4.sql',
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
