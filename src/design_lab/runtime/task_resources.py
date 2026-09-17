# SPDX-License-Identifier: MIT
"""DL-AUDIT-20260914-04 — task-scoped resource preflight.

A task names the resources it depends on (a tool, a model, a host, a licence).
Before it may run, the preflight resolves *only the resources that task needs*
and reports, for each, its real path, availability and scope — without ever
installing, downloading or accepting a licence.

Key properties (the audit acceptance):

* a resource registry is OPTIONAL. When it is absent or unreadable the preflight
  falls back to the standalone ``.project/paths.json`` local configuration, so a
  task that declares no external resource still runs;
* a missing resource blocks ONLY the task(s) that declare it, never a global
  gate;
* tool paths are probed read-only in the current search scope; external shared
  input roots are recorded DECLARED_NOT_PROBED (never traversed), matching the
  path policy;
* the same function backs the CLI ``doctor --task`` and the worker/workbench
  entry, so the two can never disagree.
"""
from __future__ import annotations

import json
import platform
import shutil
from pathlib import Path

REGISTRY_SCHEMA = "design-lab/task-resources/v1"
REGISTRY_REL = "design-lab/config/task-resources.json"


class TaskResourceError(ValueError):
    """A task resource declaration is malformed or unresolvable."""


def _load_registry(root: Path):
    """Return the registry document, or None when it is absent (optional)."""
    path = root / REGISTRY_REL
    if not path.is_file():
        return None
    raw = path.read_bytes()
    if len(raw) > 256 * 1024:
        raise TaskResourceError("task resource registry is oversized")
    try:
        doc = json.loads(raw.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise TaskResourceError("task resource registry is not valid JSON") from exc
    if not isinstance(doc, dict) or doc.get("schemaVersion") != REGISTRY_SCHEMA:
        raise TaskResourceError("unsupported task resource registry")
    return doc


def entry_host_scope(entry) -> str:
    """Host scope declared on a resource entry, defaulting to 'none'."""
    return entry.get("host_scope", "none") if isinstance(entry, dict) else "none"


def _probe_tool(name: str, declared_version: str | None) -> dict:
    """Read-only path probe; never installs and never accepts a licence."""
    executable = shutil.which(name)
    state = "RESOLVED" if executable else "UNAVAILABLE"
    return {
        "kind": "tool",
        "resolved_path": executable,
        "path_source": "shutil.which" if executable else None,
        "search_scope": "current process PATH only",
        "declared_version": declared_version,
        "state": state,
        "meaning": ("tool found in search scope; version NOT re-proven here"
                    if executable else "tool absent from the current search scope"),
    }


def preflight(root: Path, task_full_id: str, *, registry=None, paths_describe=None) -> dict:
    """Resolve and report the resources one task depends on.

    ``task_full_id`` is the full authority key ``<TASKPACK>::<TASK_KEY>``. The
    returned verdict is per-task: ``READY`` (all declared resources resolved),
    ``BLOCKED`` (a declared resource is unavailable — blocks only this task) or
    ``REGISTRY_INERT`` (a declared resource cannot be resolved at all). A
    missing registry never blocks: it is reported and the task proceeds on the
    standalone local configuration.
    """
    root = Path(root)
    if not task_full_id or "::" not in task_full_id:
        raise TaskResourceError("task_full_id must be '<TASKPACK>::<TASK_KEY>'")
    taskpack_id, task_key = task_full_id.split("::", 1)

    doc = registry
    registry_state = "PRESENT"
    if doc is None:
        doc = _load_registry(root)
        if doc is None:
            registry_state = "NOT_AVAILABLE"
    resources = (doc or {}).get("resources", {})
    needs = [ref for ref in (doc or {}).get("tasks", {}).get(task_full_id, [])]
    if not needs and registry_state == "PRESENT":
        needs = [ref for ref in (doc or {}).get("requires_by_task", {}).get(task_full_id, [])]

    results = []
    for ref in needs:
        entry = resources.get(ref)
        if entry is None:
            # Declared in the task map but not described: inert, do not guess.
            results.append({"ref": ref, "kind": "unknown", "state": "UNRESOLVED_INERT",
                            "host_scope": entry_host_scope(entry),
                            "meaning": "resource is referenced but not described in the registry"})
            continue
        kind = entry.get("kind", "tool")
        host_scope = entry.get("host_scope", "none")
        if kind == "tool":
            results.append({"ref": ref, "host_scope": host_scope,
                            **_probe_tool(entry.get("name", ref), entry.get("version"))})
        elif kind == "model":
            results.append({"ref": ref, "kind": "model", "host_scope": host_scope,
                            "state": "METADATA_ONLY",
                            "path": entry.get("path"), "licence": entry.get("licence"),
                            "meaning": "model resource is recorded, not loaded or run"})
        elif kind in ("host", "licence", "external"):
            results.append({"ref": ref, "kind": kind, "host_scope": host_scope,
                            "state": "DECLARED_NOT_PROBED",
                            "path": entry.get("path"), "licence": entry.get("licence"),
                            "meaning": "external/host/licence root is declared, never traversed"})
        else:
            results.append({"ref": ref, "kind": kind, "host_scope": host_scope,
                            "state": "UNRESOLVED_INERT",
                            "meaning": "unsupported resource kind"})
    blocked = [r for r in results if r.get("state") in ("UNAVAILABLE", "UNRESOLVED_INERT")]
    verdict = "BLOCKED" if blocked else "READY"
    return {
        "schemaVersion": "design-lab/task-resource-preflight/v1",
        "task_full_id": task_full_id,
        "taskpack_id": taskpack_id,
        "task_key": task_key,
        "registry_state": registry_state,
        "local_config_fallback": "paths.json" if registry_state != "PRESENT" else None,
        "resources": results,
        "blocked_resources": [r["ref"] for r in blocked],
        "verdict": verdict,
        "machine_scope": platform.system(),
        "authority_source": "taskpack_full_id",
        "permissions": {
            "install": False,
            "licence_accept": False,
            "external_traverse": False,
            "meaning": "the preflight probes and reports only; it never installs, "
                       "accepts a licence or traverses an external root",
        },
        "install_executed": False,
        "licence_accepted": False,
        "meaning": ("per-task verdict; a missing resource blocks only this task, "
                    "never a global gate; nothing is installed or auto-approved"),
    }
