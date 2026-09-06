# SPDX-License-Identifier: MIT
"""Central reconstruction runtime-root resolver (DL-TP-R0-003 / PR115-F06).

All reconstruction run/evidence/cache/tmp/lock writes resolve through this
module. The canonical runtime root is PROJECT_LOCAL_ROOT (.project-local/);
legacy .hermes roots are never produced by mainline code. Module-level
constants exist so contract validation, packaging, rollback and tests agree on
one root vocabulary.
"""
from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
PROJECT_LOCAL_ROOT = PROJECT_ROOT / ".project-local"

# Canonical reconstruction namespace under .project-local/ (trailing-slash
# repo-relative strings used by run contracts and the evidence bundle).
RUNTIME_REL = ".project-local/task-runtime/reconstruction"
EVIDENCE_REL = ".project-local/task-artifacts/reconstruction"

# Legacy roots that must never be produced by active mainline code (R0-003).
LEGACY_RUNTIME_REL = ".hermes/task-runtime/reconstruction"
LEGACY_EVIDENCE_REL = ".hermes/task-artifacts/reconstruction"

RUNTIME_PARENT = PROJECT_LOCAL_ROOT / "task-runtime" / "reconstruction"
EVIDENCE_PARENT = PROJECT_LOCAL_ROOT / "task-artifacts" / "reconstruction"


def runtime_root(run_id: str) -> str:
    """Repo-relative trailing-slash runtime root for one run id."""
    return f"{RUNTIME_REL}/{run_id}/"


def evidence_root(run_id: str) -> str:
    """Repo-relative trailing-slash evidence root for one run id."""
    return f"{EVIDENCE_REL}/{run_id}/"
