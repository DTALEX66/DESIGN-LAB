# Illustrator assembly slice (2026-09-08)

`runApprovedJob(job, approvedRoot)` is a synchronous host entrypoint. The second
argument is the session-owned root supplied by the trusted caller, not copied
from untrusted input. The generic Adobe JSON Schema remains an envelope; this
Illustrator-specific preflight is stricter. There is not yet a network/API
dispatcher for this entrypoint.

## Current supported input

All objects below are closed: missing and extra fields are rejected.

- Root: `schemaVersion` (`design-lab/adobe-host-job/v1`), `jobId`, `rirHash`,
  `runRoot`, `artboard`, `layers`, `assets`, `targets`, `operations`, `authorization`.
- `authorization`: `{required:true, scope:"single-session"}`. This is a scope
  marker, not proof of a Human Gate or a signed authorization receipt.
- `artboard`: `{width,height}` in RGB points, dimensions 1–16383.
- `targets`: `{ai,svg,png}` absolute local paths beneath the approved run root,
  with matching extensions. Existing files are refused; parents must exist.
- `assets`: array of `{id,path}`. PNG/JPEG input copies must exist under the run
  root. Upstream must verify content, hashes and rights before invocation.
- `layers`: 1–100 `{id,items}` records; 1–1000 items per layer. Layers/items are
  specified back-to-front. IDs are globally unique across assets/layers/items.
- Text: `{id,kind:"text",text,position:[x,y],font,size,color:[r,g,b]}`.
  `font` is an installed PostScript name, not a family-name approximation.
- Path: `{id,kind:"path",points,closed,color:[r,g,b]}`. Each point is
  `{anchor:[x,y],left:[x,y],right:[x,y]}`; controls remain editable Bezier handles.
  Paths are filled, unstroked. Stroke/gradient support remains outstanding.
- Raster: `{id,kind:"raster",assetId,position:[x,y],width,height}`. Linked task
  input is embedded into the saved native AI.
- `operations` must match the legacy `REQUIRED_OPERATIONS` sequence exactly.
  This list is a required capability target, **not** a claim that masks or every
  reconstruction operation are implemented. Mask/group jobs currently reject.

## Output and ownership

The bridge creates its own document, builds the specified objects, saves AI,
closes/reopens, checks text/font/size, Bezier geometry, layer/counts and raster
embedding, then exports PNG/SVG. It closes and reopens AI again after export:
Illustrator 29.5.1 changed the document association during SVG export in testing.
The returned document is the reopened AI, available for subsequent local edits.

Failures propagate; partial output and task-owned documents are not concealed
or deleted. The future coordinator must retain document identity and reconcile
unknown effects rather than blindly retry. File existence checks are not an
atomic writer lease, reparse-point defense or crash recovery implementation.

## Qualification limits and next work

- This slice is not the full R3-11/R4-011 acceptance.
- Group/mask support, object patch API, two independently saved local edits,
  rollback and interruption/retry integration remain required.
- Raster readback currently checks embedding/counts, not per-object pixel hash;
  color, z-order and text-position round-trip checks need broader coverage.
- The RIR hash is syntax-checked only; the upstream owner must bind it to actual
  RIR bytes and the evidence manifest. Synthetic host fixture uses a nonzero
  test marker, not a production provenance claim.
- Host scripts must never accept arbitrary shell/menu commands. Do not execute
  user-supplied script text to implement object plans.
- Existing native tests do not prove complex reference fidelity, font
  redistribution rights, independent quality acceptance or release readiness.
