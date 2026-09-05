# SPDX-License-Identifier: MIT
"""DL-TP-T09 (MULTIMODAL-2026-09-05): ComfyUI generation task protocol (structural).

Pure-local structural layer: submission envelope, status enum, cancel
semantics, artifact reclaim, and pinned workflow/version checks. Cache hits are
never reported as a new generation success. No live ComfyUI dependency: real
E2E belongs to the host side and stays '待实机' until measured.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Mapping

_WORKFLOW_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_SHA256 = re.compile(r"^sha256:[0-9a-f]{64}$")


class ComfyTaskError(ValueError):
    """Generation task contract violation."""


@dataclass(frozen=True)
class PinnedNode:
    """One pinned model/node version inside a ComfyUI workflow."""

    node_id: str
    type: str
    version: str  # exact version string of node/checkpoint
    source_hash: str  # sha256:... of the model/node file actually used


@dataclass(frozen=True)
class WorkflowPin:
    """Pinned workflow identity + per-node pins. Reproducibility contract."""

    workflow_id: str
    schema_version: str = "design-lab/comfy-task/v1"
    nodes: tuple[PinnedNode, ...] = ()

    def fingerprint(self) -> str:
        payload = json.dumps(
            {
                "workflow_id": self.workflow_id,
                "schema_version": self.schema_version,
                "nodes": sorted((n.node_id, n.type, n.version, n.source_hash) for n in self.nodes),
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def validate(self) -> None:
        if not _WORKFLOW_ID.fullmatch(self.workflow_id):
            raise ComfyTaskError(f"invalid workflow_id: {self.workflow_id!r}")
        for node in self.nodes:
            if not node.node_id or not node.type or not node.version:
                raise ComfyTaskError(f"node pin incomplete: {node}")
            if not _SHA256.fullmatch(node.source_hash):
                raise ComfyTaskError(f"node {node.node_id} source_hash must be sha256:...")
        if self.schema_version != "design-lab/comfy-task/v1":
            raise ComfyTaskError(f"unsupported schema_version: {self.schema_version!r}")


# Generation task lifecycle. CACHE_HIT is a distinct terminal: it proves the
# same pinned workflow+inputs already produced this artifact — never a 'new
# generation success'.
TASK_STATES = (
    "QUEUED",
    "RUNNING",
    "SUCCEEDED",
    "FAILED",
    "CANCELLED",
    "CACHE_HIT",
)
TERMINAL = {"SUCCEEDED", "FAILED", "CANCELLED", "CACHE_HIT"}
NOT_A_NEW_GENERATION = {"CACHE_HIT", "FAILED", "CANCELLED"}


@dataclass
class ComfyTask:
    """One generation submission with fixed workflow pin and inputs."""

    task_id: str
    workflow: WorkflowPin
    inputs_hash: str  # sha256:... over canonical inputs JSON
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat(timespec="seconds"))

    def validate(self) -> None:
        if not _WORKFLOW_ID.fullmatch(self.task_id):
            raise ComfyTaskError(f"invalid task_id: {self.task_id!r}")
        self.workflow.validate()
        if not _SHA256.fullmatch(self.inputs_hash):
            raise ComfyTaskError("inputs_hash must be sha256:...")


@dataclass
class TaskResult:
    task_id: str
    state: str
    artifacts: tuple[str, ...] = ()          # repo-relative artifact paths (claimable)
    workflow_fingerprint: str | None = None
    note: str | None = None

    def validate(self) -> None:
        if self.state not in TASK_STATES:
            raise ComfyTaskError(f"invalid state: {self.state!r}")
        if self.state == "SUCCEEDED":
            if not self.artifacts:
                raise ComfyTaskError("SUCCEEDED without reclaimable artifacts is forbidden")
            if not self.workflow_fingerprint:
                raise ComfyTaskError("SUCCEEDED requires workflow fingerprint")
        if self.state in NOT_A_NEW_GENERATION and self.state != "CACHE_HIT":
            if self.state == "FAILED" and self.note is None:
                raise ComfyTaskError("FAILED requires a reason note")
        if self.state == "CACHE_HIT":
            # cache hit may carry artifacts (the previously produced ones) but
            # must be explicit that no new generation ran.
            if self.workflow_fingerprint is None:
                raise ComfyTaskError("CACHE_HIT requires the pinned workflow fingerprint")


def classify_result(state: str) -> str:
    """Human/API summary of what actually happened (never overclaims)."""
    if state == "SUCCEEDED":
        return "new generation succeeded"
    if state == "CACHE_HIT":
        return "cached hit - NOT a new generation"
    if state == "FAILED":
        return "generation failed"
    if state == "CANCELLED":
        return "cancelled before completion"
    return f"in progress ({state})"
