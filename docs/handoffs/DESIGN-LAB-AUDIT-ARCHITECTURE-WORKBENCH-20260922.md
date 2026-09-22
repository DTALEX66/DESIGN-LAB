# DESIGN-LAB Architecture / Workbench Audit Handoff — 2026-09-22

> **EXECUTION_HANDOFF / NON_AUTHORITATIVE**
> Current truth starts at `/AUTHORITY.md` (`DL-AUTHORITY-2026-09-18-R2`) and
> `/.project/governance/authority-index.json`. This handoff records one bounded
> execution round; it does not replace Authority, the integrated TaskPack, or
> the machine ledger.

## Subject and boundary

- Project: `DESIGN-LAB` only.
- Audit baseline exact SHA: `d13c7dcd92560826ab6ea8aec8033def4818b253`.
- Delivery branch: `codex/design-lab-audit-20260922`.
- Audit input: `D:/All projects/Record/DESIGN-LAB_CODEX_20260922.zip`, treated as
  `READ_ONLY_HANDOFF`; none of its files were copied into the repository.
- `reports/current/**`, generated audit projections, task ledger, host data,
  external projects, credentials, E: drive, and native application state were
  not manually edited.
- Cloud PR/head/check evidence is dynamic and must be read live after upload;
  no pre-upload value in this file is a cloud completion claim.

## Completed in this round

### Human-gate and ledger safety

- The Design Layer direction-choice endpoint now rejects every non-human actor
  with `403 HUMAN_DIRECTION_CHOICE_REQUIRED`; a rejected attempt leaves the
  persisted chosen direction empty.
- Decision supersession now fails closed across job boundaries.
- A decision carrying a human-only gate cannot be superseded by an agent.
- Supersession validates the predecessor inside the write transaction and only
  accepts a live predecessor, preventing two successors from forking one
  decision lineage.
- Supersession events retain the original decision's job and gate identity.
- `assert_gate()` and `open_gates()` now distinguish a human decision from a
  positive gate outcome: `BLOCK` / `REJECT` remain blocking, while a Direction
  gate is satisfied by the selected human direction.
- Binding rechecks that a chosen direction was chosen by a human, so a legacy
  pre-fix agent-chosen row cannot advance to Design System binding.
- Asset branch tips now use numeric `version_no` ordering rather than lexical
  UUID ordering; the regression uses deliberately reversed version IDs.

### Workbench state and layout

- Connection attempts are generation-scoped. A late response from an older
  token can no longer overwrite a newer success/failure or a disconnect.
- Route rendering is generation/token scoped and commits an off-DOM result only
  for the still-current route; stale success and error responses are discarded.
- Login/workspace visibility now follows an explicit `connected` state.
- Desktop navigation is above the full-width header and scrolls vertically on
  short viewports.
- Mobile navigation is a readable, horizontally scrollable bottom bar instead
  of blank zero-size labels.
- Active routes expose `aria-current="page"`; async route readback exposes
  `aria-live` and `aria-busy` state.
- Narrow preflight inputs no longer force horizontal overflow.

### Authority and repository layout

- README and root `AGENTS.md` now name the FINAL integrated TaskPack as the
  current entry and classify R5 as frozen product lineage.
- Product Definition and Boundary Contract now recognize `apps/workbench/` as
  the one DESIGN-LAB control plane while continuing to prohibit a second app
  shell, canvas, agent runtime, model gateway, or host-private data clone.
- MiniGame Domain Pack source-of-truth paths now resolve inside DESIGN-LAB,
  not the obsolete WORK-LAB location.

## Verification evidence

| Gate | Result | Evidence boundary |
|---|---|---|
| Workbench strict TypeScript | PASS | `tsc --noEmit` |
| Workbench Vite build | PASS | committed `apps/workbench/build/main.js` rebuilt |
| Workbench unit + AppShell regression | PASS | node smoke and stale route/connect tests |
| Targeted Python regressions | PASS | 56 tests: Design Layer, decision ledger, asset version guard |
| Approval / failure-recovery regressions | PASS | 18 tests |
| Native Workbench UI regressions | PASS | 14 tests |
| Real Chromium Workbench E2 | PASS | 2 tests; full vertical slice, persisted readback, mobile layout; console errors 0 |
| Workbench packaging truth | PASS | 5 checks |
| Top-level Authority consistency | PASS | 10 checks |
| Canonical DESIGN-LAB verifier | PASS | 51 suites, 0 failed |
| Git whitespace check | PASS | `git diff --check` |

These results prove local structural and controlled-runtime behavior through E2.
They do not prove a new Photoshop/Illustrator/Figma/Blender host E3 run, an
independent human E4 acceptance, or an E5 release/install/upgrade cycle.

## Open problems and next decisions

1. **Installer authorization (P1, fail before enablement).** The Open Design
   installer can discover and write a host target without a single explicit
   approved Host Profile receipt at its entry. Add target/profile/write-scope
   validation before any probe or external write, then test the denied path.
2. **Current TaskPack release snapshot drift (P1 governance).** The byte-pinned
   FINAL TaskPack still contains pre-landing statements such as main lacking
   Authority, while Authority section 15 closes those tasks. Changing it needs
   the formal R2 re-pin flow; it was not silently rewritten here.
3. **Generated current projections (P1 freshness).** Directory counts and
   `reports/current` subjects are stale. Regenerate only through their owning
   scripts on the final committed subject; never hand-edit generated files.
4. **Session-link namespace (P2).** `source_system` is not part of the stored
   identity, so equal external references from two sources can collide. This
   needs an additive schema migration plus cross-source read/delete tests.
5. **Legacy core mode semantics (P2).** `design-lab/core/user_modes.py` still
   models production with zero human approval points. Confirm it is historical
   only or align it with the current Human Gate contract before reuse.
6. **KnowledgeCandidate contract (P2, before export enablement).** The v1 schema
   cannot carry rights, human approval, source/artifact/evidence hashes, exact
   DESIGN SHA, supersession, and revocation fields required by Authority.
7. **D7/D8 evidence backlog.** Native host-record re-verification and recovery
   drills were not executed in this architecture/UI round. Historical evidence
   must not be promoted to current E3/E5.

## Recovery / rollback

- Revert the delivery commit(s) on `codex/design-lab-audit-20260922`; do not
  reset or clean the user workspace.
- The only generated tracked artifact in scope is
  `apps/workbench/build/main.js`; rebuild it from `apps/workbench/main.ts` after
  any source revert and confirm byte-level no-drift.
- Local browser evidence is under `.project-local/task-artifacts/browser-e2e/`
  and is ignored runtime evidence, not source truth.
