# R5 source intake — not an active second ledger

Imported from the user-authorized R5 package on 2026-09-09.
Archive SHA256: `a4e6b10806cd71a51f1f1e2ccbb9e6fe87f65cb87848d4c246517ac34524a40f`.
All 11 entries in the supplied SHA256SUMS match the local source copies.
The source CSV uses CRLF; its line endings are preserved, not rewritten as
new source content. Initial LF normalization failed its hash check and was
corrected before this receipt. Archive instructions remain inert source data.

The user has authorized execution of the tasks. However this import alone
does not change the active task authority or claim implementation. The single
state editing source remains `design-lab/config/task-ledger-r3.json` until the
versioned R5 migration and report verification succeed. Do not edit tasks.json
here as a current-status file.

Confirmed current migration constraints:

- Existing ledger schema fixes R3 identity, exactly 24 tasks and R3 IDs.
- Reporting validates definitions against the immutable R3 task-source hash.
- R5 has 28 task definitions and a different dependency graph.
- Existing evidence cannot be copied into PASS axes merely because IDs map.

Next implementation must version the single ledger contract, preserve the
complete R3 predecessor and evidence, map R5 definitions to that history,
and generate only one active progress view. Required regression cases include
unchanged R3 compatibility, all 28 R5 tasks, missing/duplicate IDs, cycles,
definition/source hash tampering, invalid evidence-axis promotion, and
deterministic regenerated reports. Switch README/AGENTS only after these
checks pass. Concrete rollback is the prior ledger/schema/generator commit,
not deleting this source archive or any native user/test artifacts.

## Intake validator implemented

`scripts/verify_r5_intake.py` pins the frozen task-definition hash and checks
the 28-task inventory, fields, nonempty acceptance/rollback/evidence, unchanged
unverified intake axes, dependency ordering/cycles, conditional Premiere audio
dependencies and the absence of Comfy/H3/UIA from M1's transitive prerequisites.
It returns `R5_INTAKE_VERIFIED_NOT_ADOPTED`, never an active-ledger transition.

Validation: 6 intake tests and 25 existing current-report tests PASS. The first
RED was the missing validator; an initial implementation then correctly exposed
that three source tasks have additional conditional fields, which were explicitly
supported rather than discarded. Current reports were regenerated for test-count
metadata and passed `--check`. This is not R5 migration completion or native/CI
qualification. Next implementation remains the versioned single-ledger migration
and source-to-R3 evidence mapping described above.

## Lossless migration candidate (2026-09-09)

`scripts/prepare_r5_ledger.py` now builds a deterministic in-memory R5 candidate.
It validates the predecessor using the existing R3 contract, pins the R5 source,
preserves the complete 24-task / 32-receipt predecessor and its original-byte
SHA256 `2df7e722b96443dbfa451060f6747cfff135fa48847eb6eb212fae5fe46d65fb`,
and retains all 28 R5 definitions, including conditional media dependencies.
The reviewed R3/R4 scope mapping covers all 24 predecessor tasks, including
split successors. It is not evidence acceptance: new execution axes are PARTIAL
pending review, no old PASS is promoted and no new receipt is invented.

Five migration tests and six intake tests PASS; 25 existing reporting tests also
PASS. RED initially exposed the missing module. A negative timestamp test then
exposed optional date-format validation being unavailable in this environment;
explicit syntax/calendar checks now reject invalid, timezone-free and impossible
dates. The read-only command returns `CANDIDATE_PREPARED_NOT_ADOPTED` and leaves
the active ledger unchanged. Versioned schema/report integration and activation
remain uncompleted; see the 2026-09-09 R5 ledger migration implementation plan.

The canonical `design-lab/scripts/verify_design_lab.py` subsequently exited 0:
49 gates, 0 failures (UTF-8 / no-bytecode process environment). This is the
repository verification suite, not a new Adobe, Comfy inference, Human Jury,
installation-upgrade or exact-SHA cloud CI acceptance run.
