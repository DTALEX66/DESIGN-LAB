# SPDX-License-Identifier: MIT
"""DL-TP-T06 (MULTIMODAL-2026-09-05): planar decomposition object mapping (structural).

Structural layer only. Objects carry an honest mapping_state; host_object_id is
only ever set by a host-side verifier, never inferred here. OCR and vector
tracing are replaceable module seams (Protocol) - this module never claims one
of them ran or succeeded.

Invariants:
- text objects with no verified host object stay mapping_state='unmapped';
- a locked object cannot be silently re-mapped by another module;
- font substitutions are explicit (matched/substituted/missing), never hidden.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Protocol


class DecomposeModule(Protocol):
    """Replaceable planar-analysis module (OCR / vector trace / heuristic)."""

    module_id: str

    def detect(self, source_path: str) -> list[dict[str, Any]]:
        """Return candidate objects with kind/region; must not set host ids."""


class DecompositionError(RuntimeError):
    pass


@dataclass(frozen=True)
class CanvasRegion:
    x: float
    y: float
    width: float
    height: float


@dataclass
class PlanObject:
    object_id: str
    kind: str  # text/shape/image/occlusion/group/unknown
    region: CanvasRegion
    module: str | None = None
    text_content: str | None = None
    font_status: str = "unknown"
    mapping_state: str = "unmapped"  # unmapped/auto/corrected/locked/unrecovered
    host_object_id: str | None = None
    note: str | None = None

    def validate(self) -> None:
        if not self.object_id or not self.kind:
            raise DecompositionError(f"object {self.object_id!r} incomplete")
        if self.mapping_state not in ("unmapped", "auto", "corrected", "locked", "unrecovered"):
            raise DecompositionError(f"object {self.object_id}: invalid mapping_state")
        if self.font_status not in ("matched", "substituted", "missing", "unknown"):
            raise DecompositionError(f"object {self.object_id}: invalid font_status")
        if self.mapping_state == "unmapped" and self.host_object_id is not None:
            raise DecompositionError(f"object {self.object_id}: unmapped cannot carry host_object_id")
        if self.host_object_id is not None and self.mapping_state == "unrecovered":
            raise DecompositionError(f"object {self.object_id}: unrecovered cannot carry host_object_id")

    def lock(self) -> None:
        self.validate()
        if self.mapping_state == "unrecovered":
            raise DecompositionError(f"object {self.object_id}: unrecovered cannot be locked")
        if self.host_object_id is None:
            raise DecompositionError(f"object {self.object_id}: cannot lock without a host object")
        self.mapping_state = "locked"

    def mark_host_mapping(self, host_object_id: str, *, by_user: bool = False) -> None:
        """Host-side verification result (called by a verifier, never by a module)."""
        if self.mapping_state == "locked":
            raise DecompositionError(f"object {self.object_id}: locked; user must unlock to remap")
        self.host_object_id = host_object_id
        self.mapping_state = "corrected" if by_user else "auto"


@dataclass
class Plan:
    decomposition_id: str
    source_ref: str
    source_sha256: str
    canvas: CanvasRegion
    objects: list[PlanObject] = field(default_factory=list)

    def to_contract(self) -> dict[str, Any]:
        return {
            "decomposition_id": self.decomposition_id,
            "schemaVersion": "design-lab/planar-decomposition/v1",
            "source_ref": {"path": self.source_ref, "sha256": self.source_sha256},
            "canvas": {
                "width": int(self.canvas.width),
                "height": int(self.canvas.height),
            },
            "objects": [
                {
                    "object_id": o.object_id,
                    "kind": o.kind,
                    "region": {
                        "x": o.region.x,
                        "y": o.region.y,
                        "width": o.region.width,
                        "height": o.region.height,
                    },
                    "text_content": o.text_content,
                    "font_status": o.font_status,
                    "mapping_state": o.mapping_state,
                    "host_object_id": o.host_object_id,
                    "module": o.module,
                    "note": o.note or "",
                }
                for o in self.objects
            ],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_contract(), ensure_ascii=False, sort_keys=True)

    def validate(self) -> None:
        if not self.decomposition_id or not self.source_ref:
            raise DecompositionError("decomposition identity incomplete")
        ids = [o.object_id for o in self.objects]
        if len(ids) != len(set(ids)):
            raise DecompositionError("duplicate object_id")
        for o in self.objects:
            o.validate()
