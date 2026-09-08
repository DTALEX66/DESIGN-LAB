# R5-005 atomic multi-file delivery core

Status: IMPLEMENTED_LOCAL / unit-controlled archive tests. Not integrated into
NativeTasks or workbench yet; not R5-005 acceptance.

`runtime/bundle_store.py` builds deterministic ZIP_STORED delivery archives with
fixed entry timestamps and a canonical `bundle-manifest.json`. The manifest
binds primary member, every member's SHA256/size/role, and explicit metadata.
Source paths are not embedded in the manifest. Caller metadata is not approval:
rights/Jury status remains explicit, and tests use NOT_REVIEWED.

Sources must already be under the selected project-local root. Names reject
traversal, absolute/Windows-unsafe forms, case collisions and file/directory
collisions. Limits: 512 members including the manifest, 256 MiB per member,
1 GiB total content, 64 KiB metadata, 256 KiB manifest. Files are hashed before
and while copying; the complete archive is read back without extracting paths.

The archive is one immutable version through existing asset_store publication:
fencing, stage/rename journal, hash verification and SQLite commit are reused.
Changing even a secondary preview changes the version identity. Candidate ZIPs
remain project runtime evidence in `bundle-candidates`, not user input files.
There is no new parallel asset database or second transaction implementation.

Six tests PASS: complete member readback and deterministic reuse; preview-only
version change; wrong hash/path rejection; case collision/missing primary;
secondary tamper detection; staged publication failure with no active version.
Tests use synthetic bytes, not actual AI/PSD editable-file qualification. The
initial fixture used an unsupported asset kind and omitted durable attempt
identity; it was corrected to the existing `other` kind and real job-store
attempt contract. Archive source code does not introduce a new DB asset kind.

Next: connect original/native/preview/SVG/input assets plus Brief, font/rights,
model/seed and Jury references to this manifest; add product download/import
readback and host link relocation. Do not silently change NativeTasks' existing
primary-file result contract. ZIP delivery does not prove font completeness,
native links, editability, human acceptance or a releasable product.

Rollback: reviewed inverse code change; retain published archives, candidates,
publication journals and evidence. No bulk deletion or global configuration.
