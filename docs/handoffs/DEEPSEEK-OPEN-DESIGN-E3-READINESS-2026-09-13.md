# Open Design adapter — E3 readiness (DL-P0-050)

- **Task**: DL-P0-050 `OPEN_DESIGN_E3` (Deep Adaptation Master TaskPack, Wave C)
- **Date**: 2026-09-13
- **Subject SHA**: `9f34b53e7eff5707e087c35bced57bb17b856ab8`
- **Result of this execution**: structurally prepared, **`NOT_EXECUTED`**
- **Blocker**: no Open Design runtime or host was found in the recorded search
  scope, and installing software is outside the authorised boundary of this
  execution

## Current state (verified by reading, not by running)

| Artefact | Path | State |
|---|---|---|
| Adapter manifest | `integrations/hosts/open-design/adapter.manifest.json` | `status: declared`, `evidenceLevel: E0`, `supported: false`, `runtimeStatus: not-started` |
| Expert suite (16 skills) | `integrations/hosts/open-design/expert-suite/skills/` | present |
| Installer | `integrations/hosts/open-design/installer/install_op_expert_suite.py` | present, gated on a user-approved host profile |
| Verifier | `integrations/hosts/open-design/verifier/verify_open_design_host_adapter.py` | present |
| Projection generator | `integrations/hosts/open-design/verifier/generate_open_design_adapter_indexes.py` | present |
| Projections | `integrations/hosts/open-design/projections/{atoms,bundles,scenarios,plugins}/` | present (neutral source → projection) |
| Compatibility matrix | `design-lab/config/OPEN_DESIGN_COMPATIBILITY_MATRIX.md` | baseline Open Design `0.18.1`; plugin manifests aligned; live registration marked pending |
| Install detection | `reports/current/MACHINE_INVENTORY.json` | **OpenDesign: NOT_FOUND_IN_SCOPE** (no match within the recorded search scope) |

The absence above means "no match inside the recorded search scope". It is not a
claim that Open Design is absent from the machine in every possible location.

## Why E3 cannot be produced here

E3 requires a real brief → native editable artifact → reopen readback → failure
and rollback loop inside the host. Every one of those steps needs a running Open
Design instance. The recorded inventory found none, and this execution is not
authorised to install one, to launch a host, or to treat a projection file as if
it were a host result.

The honest level for the adapter therefore stays **E0 declared**, with the
structural work already at **E1/E2** in the matrix. Nothing in this document
claims otherwise.

## Ladder — what each level still needs

| Level | Requirement | Current |
|---|---|---|
| E0 DECLARED | identity, scope, licence candidate, owner | met |
| E1 STRUCTURAL | manifest, schema alignment, static tests, projection generation | met (plugin manifests reference the official schema; verifier exists) |
| E2 CONTROLLED_RUNTIME | a fixed host version driven on a synthetic fixture, with artifact and readback digests | **not met** — no host available |
| E3 REAL_WORKFLOW | real brief → native editable artifact → reopen readback → rollback, bound to an exact SHA | **not met** |

## Preconditions for a live E3 (owner-side)

1. Open Design installed and its version recorded (installation is the owner's
   action; this project does not bundle or install it).
2. Owner approval of a host profile — the installer is gated on this by design.
3. A rights note for the host's own terms.
4. An allocated window with the stop-line considered.

## Steps a future live E3 would take (none executed here)

The commands are deliberately **not** spelled out with flags: this repository's
own rule forbids inventing CLI arguments, and every interface must be discovered
from the installed official runtime (`--help`, schema, runtime readback) at the
time of the run. What is fixed is the order:

1. Read the installed version from the host itself and record the build string.
2. Run the verifier `verifier/verify_open_design_host_adapter.py` and keep its
   full output.
3. Generate projections with
   `verifier/generate_open_design_adapter_indexes.py`, then confirm the
   generated `open-design.json` files diff cleanly against the committed ones.
4. Install the expert suite through
   `installer/install_op_expert_suite.py` under the approved host profile.
5. Drive one real design task end to end inside the host and export a native,
   editable artifact.
6. Reopen the exported artifact and record the readback comparison.
7. Record a failure and its recovery, then roll back and verify the rollback.

## Required evidence for the E3 record

Same field set as the other host adapters: exact host version, exact DESIGN-LAB
SHA, OS, path aliases (never raw user paths), ordered replayable actions,
artifact `sha256` and byte size, readback `sha256` and what was compared, error
text, rollback performed, and the four axes recorded separately. A record missing
any of these is a structural note, not an E3.

## Boundary (unchanged)

No authentication or private-state reading; no mutation of Open Design's private
configuration; unverified capabilities stay `UNVERIFIED`; the Open Design
adapter never becomes a default host or a runtime dependency of the neutral core
(ADR-001, standalone-first).

## Four axes (this execution)

| Axis | State | Basis |
|---|---|---|
| implementation | `IMPLEMENTED_LOCAL` | readiness record written; existing structural adapter and verifier reviewed |
| unit | `PASS` | existing Open Design adapter verifier/tests remain the gate; not modified here |
| host_live | `NOT_VERIFIED` | no host present in the recorded scope; nothing launched |
| delivery | `NOT_DELIVERED` | E3 evidence does not exist; this document is a plan |
