# Photoshop readback scaling and late-output checkpoint

Status: IMPLEMENTED_LOCAL / targeted tests PASS; new bridge host timing NOT
EXECUTED. This change is not proof that the full PSD workflow succeeded.

## Confirmed redundant traversal

`psReadback` called recursive `psFind` separately for every expected object.
A real-JSX Node test with 100 leaf layers observed 10,000 layer-name property
reads. This quadratic traversal is unnecessary at a native DOM boundary.
The failing regression asserted at most 400 reads and failed with 10,000.

The reader now indexes direct children once per parent and resolves expected
IDs from that index. A document-wide seen set rejects duplicate actual IDs.
Layer count, correct parent membership, group/mask type, text kind, contents,
font and size checks remain. `psFind` is retained for isolated patch lookup.
The scaling regression now passes, as do negative controls for changed text,
duplicate IDs, moved children and unexpected masks.

This is an isolated measured traversal fix, not a claim that traversal is
the only cause of the 120-second transport deadline failure. Building the
full document also took longer than that deadline. No deadline was raised,
history disabled, document flattened, or layer count reduced.

## Still-running original full fixture

Original run:
`.project-local/task-artifacts/real-poster-ps-20260908/run-2d83da284b144263ab26ab00028cbd64/`.
It was dispatched before this change; its script already captured the old
bridge bytes. The change cannot retroactively accelerate or validate it.

At this checkpoint the late candidate `master.psd` appeared:

- 6,061,730 bytes;
- SHA256 `97b0d40aca27686fd75113621ff50e5208769d18ba5f6b7d044e92bc53ffeff5`;
- Pillow header detection: PSD, RGB, 2155 x 3000.

Pillow layer enumeration failed with a short-buffer `struct.error`; this
does not distinguish an unsupported decoder feature from an incomplete or
invalid layered file. Header detection is not layer/editability acceptance.
No preview PNG or successful native receipt had appeared at the checkpoint.
The original Photoshop guard remains `OUTCOME_UNKNOWN` and no redispatch
was performed. Read-only COM query session `20260` remains pending.

Photoshop PID 14148 continued consuming CPU (395.27 → 626.03 seconds
across observations). Its private memory was 15,710,920,704 bytes; system
free physical memory observed was 21,719,792 KiB. These do not establish a
deadlock or out-of-memory failure. Do not kill the application or clear its
guard based on the response timeout.

## Checks

- `test_photoshop_readback_scaling.py`: 2 PASS after the measured RED case.
- `test_photoshop_legacy_native.py`: 3 PASS.
- `test_photoshop_com_adapter.py`: 6 PASS.
- Canonical `design-lab/scripts/verify_design_lab.py`: exit 0, session 73486,
  with process-local `PYTHONUTF8=1` and `PYTHONDONTWRITEBYTECODE=1`.
  This validates the local aggregate gates, not native timing or acceptance.

Next: poll the same query, observe the exact output root, and independently
read back late outputs once the host has finished. Preserve the failed
attempt; neither late file existence nor a new-reader unit test authorizes
publishing its asset or silently converting its state to success.
