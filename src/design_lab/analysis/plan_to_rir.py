# SPDX-License-Identifier: MIT
"""Bridge a planar-decomposition Plan into a reconstruction-ir/v1 document.

This is the seam between analysis and editable IR: every RIR node keeps the
Plan object's content-hash-stable id (so the existing `/patch` path can address
it), and nothing that the analysis did not observe is invented here. Unknown
fonts stay an empty candidate list, untraced geometry stays a group flagged for
user correction, and every node is marked `inferred` because it came from a
detector, not from a native document.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .decomposition import CanvasRegion, DecompositionError, Plan
from ..reconstruction.contracts import validate_rir

# Plan kinds that carry no recoverable geometry or content on their own.
_UNRECOVERED_KINDS = frozenset({'occlusion', 'unknown', 'group'})


def _bounds(region: CanvasRegion) -> dict[str, float]:
    return {'x': region.x, 'y': region.y, 'width': region.width, 'height': region.height}


def _path_data(polygon: tuple[tuple[float, float], ...]) -> str:
    points = ' '.join(f'{x} {y}' for x, y in polygon)
    return f'M {points} Z'


def _confidence(obj, method: str) -> dict[str, Any]:
    score = obj.confidence
    if score is None:
        # An absent detector score is not a score of zero; keep it explicitly
        # low and let the method string say where it came from.
        score = 0.0
    return {'score': max(0.0, min(1.0, float(score))), 'method': method}


def _correction_note(reason: str, timestamp: str) -> list[dict[str, str]]:
    return [{'operation': 'USER_CORRECTION_REQUIRED', 'reason': reason, 'timestamp': timestamp}]


def _node(obj: Any, raster_path: str, z_order: int, timestamp: str,
          style_overrides: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """One Plan object -> one RIR node (ids are carried over unchanged)."""
    base: dict[str, Any] = {
        'id': obj.object_id,
        'name': obj.text_content or obj.kind,
        'opacity': 1,
        'bounds': _bounds(obj.region),
        'inferred': True,
        'zOrder': z_order,
        'visible': True,
        'locked': obj.mapping_state == 'locked',
        'blendMode': 'normal',
        'confidence': _confidence(obj, f'planar-decomposition:{obj.module or "unknown-module"}'),
        'provenance': {'sourceId': obj.object_id, 'evidence': [raster_path]},
    }
    if obj.kind == 'text':
        if obj.text_content is None:
            raise DecompositionError(f'{obj.object_id}: text object without content')
        base['type'] = 'text'
        base['text'] = {
            'content': obj.text_content,
            # The IR asks the host for an editable text object; the source is a
            # raster, so nothing here can claim the original was live or outlined.
            'disposition': 'live',
            # No font was matched by the analysis; an empty list is the honest
            # answer and the host/user must supply it.
            'fontCandidates': [],
            'outlineFallback': {'available': False, 'pathData': None},
        }
        if obj.font_status != 'matched':
            base['repairHistory'] = _correction_note(
                f'font_status={obj.font_status}; no font candidate verified by analysis',
                timestamp)
        return base
    if obj.kind == 'shape':
        if obj.source_polygon:
            base['type'] = 'path'
            base['geometry'] = {'pathData': _path_data(obj.source_polygon), 'closed': True}
        else:
            # Only the bounding region is known; saying "rect" is a box
            # approximation, so it is flagged instead of passed off as traced
            # geometry.
            base['type'] = 'primitive'
            base['primitive'] = {
                'kind': 'rect',
                'parameters': {
                    'x1': obj.region.x, 'y1': obj.region.y,
                    'x2': obj.region.x + obj.region.width,
                    'y2': obj.region.y + obj.region.height,
                },
            }
            base['repairHistory'] = _correction_note(
                'no traced polygon; bounds substituted for geometry', timestamp)
        base['style'] = dict(style_overrides.get(obj.object_id, {}))
        base['masks'] = []
        return base
    if obj.kind == 'image':
        base['type'] = 'raster'
        base['raster'] = {
            'path': raster_path,
            'crop': _bounds(obj.region),
            'alpha': 1,
            'sourceMappings': [{'sourceBounds': _bounds(obj.region),
                                'targetBounds': _bounds(obj.region)}],
        }
        return base
    if obj.kind in _UNRECOVERED_KINDS:
        base['type'] = 'group'
        base['children'] = []
        base['repairHistory'] = _correction_note(
            f'kind={obj.kind}; mapping_state={obj.mapping_state}; content not recovered',
            timestamp)
        return base
    raise DecompositionError(f'{obj.object_id}: unsupported plan kind {obj.kind!r}')


def plan_to_rir(plan: Plan, *, raster_path: str, project_root=None,
                timestamp: str | None = None,
                style_overrides: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    """Return a schema-valid reconstruction-ir/v1 document for `plan`.

    `raster_path` must be project-relative: it is the source image the raster
    nodes point at, and the RIR contract refuses absolute or URL paths.
    `style_overrides` carries user-supplied colour per object id; the analysis
    never observes a solid fill, so an absent override stays an empty style and
    host lowering refuses it rather than guessing.
    """
    if not plan.objects:
        raise DecompositionError('plan has no objects to lower')
    moment = timestamp or datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    overrides = style_overrides or {}
    layers = [_node(obj, raster_path, index, moment, overrides)
              for index, obj in enumerate(plan.objects)]
    rir: dict[str, Any] = {
        'schemaVersion': 'design-lab/reconstruction-ir/v1',
        'canvas': {
            'width': int(round(plan.canvas.width)),
            'height': int(round(plan.canvas.height)),
            'colorSpace': 'srgb',
        },
        'layers': layers,
        'provenance': {'sourceId': plan.decomposition_id, 'evidence': [raster_path]},
    }
    validate_rir(rir, project_root=project_root)
    return rir
