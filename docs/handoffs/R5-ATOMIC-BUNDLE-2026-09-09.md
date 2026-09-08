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

## Native export integration and real artifact readback

`NativeTasks.export_bundle` now exports only RECEIPTED native attempts after
rechecking persisted job/receipt, published primary bytes, all original output
hashes and input assets. The original primary-result contract stays unchanged.
The bundle uses a separate derived asset ID in the same existing database.
OS locking and scoped publication recovery serialize/recover exports; other
writers cannot be taken over. This internal method is not yet an HTTP/UI route.

Native tests: 23 PASS, including complete output/input archive contents,
idempotent export, preservation of primary asset replay, changed-preview refusal
and refusal to export an unknown native attempt as completed work.

Real local export (no new Adobe call):

- Source attempt: `att-e240d819ddd44b76a1a6899feb786690`, Illustrator 29.5.1.
- Version: `v-25bad7a473a74d15848ceeba8261578b`.
- Archive: `.project-local/projects/e90a75cf81cf4f99bef3965d46d49cbf/assets/versions/a9e3f014601b4d38958a4133154c30ae/delivery.zip`.
- Size: 4,733,596 bytes; SHA256 `c0d3cf5323274efe72ab72c733c77420fbbd8b1f2ef049040ffbbf586952ffb4`.
- `native.ai`: `4bd448b71b026118ab19bab3e249b97d2d37c7d9fc73328a7a6302bf600e89a2`.
- `preview.png`: `94f7dec69c87f5959b27b10e649b1c44a6fe98079582536be66d5a0a7bf2765e`.
- `preview.svg`: `c1593c60103b4347b87331d9302e79b0669175c843536106596634af9651242e`.

All member hashes match the original receipt; repeat export returned the exact
same asset/version. This particular native job declared no input assets; its
source reference image/RIR/Brief are not silently invented as bundled inputs.
Font inventory remains NOT_COLLECTED, link relocation NOT_VERIFIED, rights and
quality NOT_REVIEWED. No source asset was uploaded or modified. The earlier PSD
unknown attempt remains unresolved and was not exported by this integration.
