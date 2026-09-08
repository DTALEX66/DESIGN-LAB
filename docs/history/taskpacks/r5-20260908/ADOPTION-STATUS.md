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
