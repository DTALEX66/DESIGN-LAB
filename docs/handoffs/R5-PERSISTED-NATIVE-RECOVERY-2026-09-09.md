# R5-004 persisted native receipt recovery

Status: IMPLEMENTED_LOCAL / controlled tests, not host-live acceptance.
Base: `4df8c4a3f5dc3f9fe88f67d46fb147c1bda20e38`.

`NativeTasks.reconcile_receipted(attempt_id, authorization=...)` is an internal
publication-only recovery entry. It never dispatches Photoshop or Illustrator.
It requires an unknown attempt with its original host guard and a previously
persisted native receipt. It rechecks job identity, input hashes, every output
hash and document counts before publishing. Asset identity comes from the same
durable operation. A committed matching version is reused by asset_store rather
than copied into a second version. Final result, attempt completion and guard
release are committed together.

The recovery claim is durable and non-expiring. Missing receipt, changed inputs,
wrong authorization, a prior quiescence claim or another recovery prevents
unsafe continuation. An interrupted recovery itself retains the claim and guard;
it is not automatically restarted by expiry or by a second worker.

Tests use real SQLite/files and a controlled COM boundary double. New cases:

- publication failure after persisted receipt, fresh service instance, no host
  redispatch, one published version, idempotent replay;
- failure after committed publication but before native finish, same version reused;
- unknown host with no receipt cannot release guard;
- changed input cannot publish or release guard;
- missing authorization rejected and failed recovery claim cannot be stolen.

Focused native tests: 17 PASS; existing quiescence tests: 3 PASS. These are not
new native software runs. The original real Photoshop attempt without its
original receipt is intentionally not resolved by this method, and its later
independent readback is not silently promoted into that receipt.

Remaining R5-004 scope: verified late-result reconciliation without an original
receipt; recovery from interruption of recovery itself using proven stopped
worker ownership; host cancellation acknowledgement; HTTP/UI integration and
real host interruption trials. R5-005 multi-file atomic asset manifests also
remain separate: this change continues to publish only the existing primary
native asset. Rights and quality remain NOT_REVIEWED.

Rollback: revert this code/test change as a reviewed inverse commit, preserving
database tables, claims, original outputs and evidence. Do not delete guards,
expire recovery claims or close shared Adobe processes as a rollback shortcut.

Final local checks: native 17, quiescence 3, job-store 6, asset-store 5,
runtime-asset-safety 18 and operation-coordinator 8 tests PASS (57 total).
Canonical suite `VERIFY_DESIGN_LAB=OK total=49 failed=0`, exit 0. Current reports
regenerated and `--check` passed. No actual host was dispatched by these tests;
no remote push/CI or installed-wheel refresh is included in this checkpoint.

## OS-lock recovery continuation

The subsequent change adds `runtime/native_recovery_lock.py`: a nonblocking
Windows byte-range lock (POSIX flock fallback is implemented but not tested here)
under the selected project runtime root. Lock files are hashed by attempt ID,
path-checked, retained rather than unlinked, and reject hardlinks. There is no
time-based ownership expiry. Closing the handle or process exit releases the OS
lock; a live holder prevents a second recovery, including from the same process.

New recovery claims atomically carry `native_recovery_protocol_v2=os-lock-v1`.
Only these claims can resume from RECONCILING after acquiring the same OS lock.
Old untagged claims remain ineligible because their workers never promised this
locking protocol. A failed resumed recovery still retains the host guard and
must recheck all inputs/outputs next time. No host redispatch is introduced.

Validation: 18 native tests, 3 quiescence tests, and one actual two-process lock
test PASS. The lock test starts and terminates only its own synthetic Python
helper, proving live exclusion and OS release after a crash; no Adobe or shared
process is terminated. Native recovery continuation is exercised with real
SQLite/files and a doubled COM boundary. An initial legacy-claim test fixture
failed because its DELETE was uncommitted; explicit fixture commit corrected
that setup, and the untagged-claim rejection then passed.

Additional real process-exit trial: a recovery child exits via `os._exit(43)`
after asset publication and before `_finish`. Parent confirms terminal exit,
original guard retained and one existing version; a fresh service resumes the
same attempt and version successfully. Native tests now total 19 PASS. This
covers a recovery-process crash, not merely a caught Python exception.

Remaining: actual process-kill trials inside the other publication crash windows,
late native completion without an original receipt, cancellation acknowledgement,
multi-file manifests and product UI. The OS lock alone does not prove these.
