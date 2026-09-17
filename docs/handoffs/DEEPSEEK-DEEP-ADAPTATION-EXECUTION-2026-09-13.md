# DEEPSEEK DEEP-ADAPTATION EXECUTION RECORD — 2026-09-13

- **Pack**: DESIGN-LAB Deep Adaptation Master TaskPack (2026-09-13), Waves A–G
- **Directive**: owner instruction — *"跑完所有适合 DEEPSEEK 能跑完的所有任务（实际操作操控和设计能力的先不做）"*
- **Executor**: DEEPSEEK (agent) on behalf of owner DTALEX66
- **Subject SHA at start**: `9f34b53e7eff5707e087c35bced57bb17b856ab8` (branch `codex/r3-runtime-correctness`)
- **Date**: 2026-09-13
- **Delivery state**: working tree only — **no commit, no push, no PR, no merge, no release**
- **Decision owners**: DTALEX66 (rights, gates, release), GPT (handoff review)

## 1. Scope — what this execution did and refused to do

Executed: every listed item that an offline agent can complete honestly — contracts,
schemas, state migration, deterministic planners, fail-closed guards, structural
declarations, evidence records and unit tests.

Refused (owner-deferred or forbidden by the project rules):

| Not done | Why |
|---|---|
| Launching Photoshop / Illustrator / Premiere / Blender / ComfyUI / Penpot / MiniMax Design / Open Design | host operation needs a real run and an authorised window |
| Any GPU inference, model load, model download or weight hashing | out of the authorised boundary |
| Design-quality judgement, visual acceptance, jury verdicts | design capability is human work; an agent may only propose |
| Signing any Human Gate or rights adjudication | an agent may prepare a record, never sign it |
| `git commit` / `push` / PR / merge / release | not authorised in this round |
| Installing software, touching `E:\`, reading credentials or private sessions | hard project boundaries |

**Authorisation note (must be read).** `docs/handoffs/SESSION-RESTART-2026-09-12.md`
records a quota stop-line — "停止新增开发；重开会话本身不解除停止线" — and says the
development-branch upload authorisation must not be widened to PR/merge/release.
This execution follows the owner's later, explicit instruction to run the
Deep Adaptation pack, and therefore does add development — locally, in the
working tree only. Nothing was pushed, so no cloud state changed. If the
stop-line is meant to outrank the new pack, the correct action is to discard or
park this working tree; every artefact below is additive and revertible.

## 2. Wave A — truth reset

| Task | Deliverable | Evidence |
|---|---|---|
| DL-P0-001 `REGENERATE_PROJECT_STATUS` | 9 regenerated projections bound to `subject_sha 9f34b53` + 3 new SSOT projections (`CAPABILITY_INDEX.json`, `EVIDENCE_INDEX.json`, `MACHINE_INVENTORY.json`) + `design-lab/config/current-report-index.json` | `scripts/generate_current_reports.py --check` → `CURRENT_REPORTS=PASS mode=check scope=bound-input-integrity current-git-and-cloud=NOT_VERIFIED` |
| DL-P0-010 `HOST_INVENTORY_V2` | read-only machine inventory: 7 PRESENT (Photoshop 2025 26.7.0.15, Illustrator 2025 29.5.1, PS/AI 2023, MiniMax Design 3.0.10, Penpot Desktop 0.24.0, ComfyUI 0.33.1 portable) vs 6 NOT_FOUND_IN_SCOPE (Premiere Pro 2025, Media Encoder 2025, InDesign 2025, After Effects 2025, Blender, OpenDesign); CLI ffmpeg 8.1.2 / node v22.23.1 / python 3.13.14; RTX 5060 8151 MiB, driver 595.97 | `reports/current/MACHINE_INVENTORY.json` (`observed_at 2026-09-13T14:54:08+00:00`); scope and "no match within the recorded search scope" wording recorded, nothing launched |
| DL-P0-190 `RIGHTS_REFRESH` | MiniMax H3 licence evidence record: territory exclusions (US/EU/UK/KR) reported by independent outlets, limits of secondary evidence, impact table, recommended `BLOCKED_BY_LICENSE` with the decision left to the owner | `docs/handoffs/DEEPSEEK-RIGHTS-REFRESH-MINIMAX-H3-2026-09-13.md` |

## 3. Wave B — creative execution core (DL-P0-020 … DL-P0-040)

One additive migration on the single existing local database
(`.project-local/state/design-lab.db`) — no second store, no second writer.

| Task | Contract delivered | Files |
|---|---|---|
| DL-P0-020 `CREATIVE_JOB_MODEL` | CreativeJob: brief/direction refs, rights profile, deliverables, host targets; semantic gates (blocked rights profile, rejected direction, undeclared host, editable deliverable needing an editable source); idempotent registration keyed by `(scope, key)` | `src/design_lab/creative/creative_job.py`, `design-lab/schemas/creative-job.schema.json` |
| DL-P0-021 `OPERATION_LINEAGE` | one lineage row per producing operation; one producer per version; acyclic impact analysis (`ancestors`, `descendants`, `impacted_outputs`, `explain_version`, `job_graph`) | `src/design_lab/creative/lineage.py` |
| DL-P0-022 `ASSET_VERSION_V2` | branch / parent / generation over the frozen v1 rows; content-addressed dedupe returns the existing version; parent must be servable | `src/design_lab/creative/asset_versions.py` |
| DL-P0-030 `REQUIREMENT_LEDGER` | append-only requirement events; `MET` needs artifact **and** readback digests; waiver needs a named actor and a reason; `MUST` gate blocks delivery | `src/design_lab/creative/requirement_ledger.py` |
| DL-P0-031 `DESIGN_DECISION_LEDGER` | options → chosen → rationale, supersede and reversal history; `DIRECTION/QUALITY/RIGHTS/PRODUCTION/RELEASE` gates can only be decided or reversed by a human actor | `src/design_lab/creative/decision_ledger.py` |
| DL-P0-032 `REJECTED_VERSION_GUARD` | terminal, append-only rejection that never rewrites the version row; `assert_servable` / `guard_delivery` fail closed for rejected, failed and cancelled versions | `src/design_lab/creative/version_guard.py` |
| DL-P0-040 `WORKLAB_SESSION_LINK` | correlation only: opaque session reference, allow-listed fields, no transcript/credential/path accepted, deletion by reference | `src/design_lab/creative/session_link.py` |

Infrastructure:

- `design-lab/schemas/state/design-lab-state-creative-v1.sql` — additive migration
  (4 `asset_version` columns + 9 tables + 7 append-only/immutability triggers),
  registered in `src/design_lab/runtime/state_resources.py`.
- `src/design_lab/creative/store.py` — migration runner with pre-migration backup
  of a populated database, `runtime_migration` guard, idempotent intent records.
- `src/design_lab/runtime/asset_store.py` — one production change: the v1 version
  insert now names its columns, because a positional insert silently breaks the
  v1 writer the moment an additive migration appends a column. All v1 behaviour,
  IDs and bytes are unchanged (verified by the existing asset/store suites).

## 4. Wave D — generative runtime structure (DL-P0-080 … DL-P0-091)

Adopts the ComfyUI workflow format rather than inventing a node-graph dialect.

| Task | Contract delivered | Files |
|---|---|---|
| DL-P0-080 `COMFY_WORKFLOW_PROVIDER` | UI-graph validation (identity, link endpoints, slot bounds, observed version), API prompt-graph validation, position-independent graph fingerprint, widget binding, `ComfyWorkflowProvider` conforming to the repository's Provider SPI with `execute()` failing closed | `src/design_lab/creative/generative/workflow_provider.py` |
| DL-P0-081 `PARTIAL_REGENERATION` | minimal sound re-execution plan: a change re-runs itself and everything downstream; reuse of a changed/downstream node is refused; cycle detection; lineage impact set mapped onto nodes | `src/design_lab/creative/generative/partial_execution.py` |
| DL-P0-090 `REPLICATE_PROVIDER` | canonical remote request (exact version pin, digests not blobs, credentials refused), status-closed response parsing, receipt that only qualifies with a local artifact **and** readback digest, credentials boundary | `src/design_lab/creative/generative/remote_provider.py`, `design-lab/schemas/generative-remote-receipt.schema.json` |
| DL-P0-091 `MODEL_AS_EXTERNAL_ASSET` | model declarations by path alias with files/digests/licence/hardware; qualification gates `default_enabled`; resolver fails closed with a distinct reason per cause; **projects the DL-P1-100 model radar instead of keeping a second registry** | `src/design_lab/creative/generative/model_assets.py`, `design-lab/schemas/generative-model-asset.schema.json` |

## 5. Waves E and F and the readiness/assurance groups

Delivered by four parallel workers under a strict file-ownership split, then
verified by the lead (see §7). Every worker report was checked against the files
and by re-running its suite.

| Task | Group | Files |
|---|---|---|
| DL-P0-110 `DTCG_PROVIDER` | E | `src/design_lab/interop/dtcg.py` — DTCG 2025.10 validation, alias resolution, `$type` inheritance, flatten/roundtrip, CSS-variable projection |
| DL-P1-111 `PENPOT_ADAPTER` | E | `src/design_lab/interop/penpot.py` — declaration `$ref`-ing the existing adapter contract, `structural` status only, `live_run: NOT_EXECUTED`, file-boundary and import plan |
| DL-P1-130 `OTIO_TIMELINE` | E | `src/design_lab/interop/timeline.py` — OpenTimelineIO document validation, gap-filled exact round trip, overlap detection, asset-reference check |
| DL-P0-160 `C2PA_MAPPING` | E | `src/design_lab/interop/provenance.py` — delivery → C2PA 2.4 assertions (`c2pa.actions`, `c2pa.ingredient`, `c2pa.creative-work`, `c2pa.training-mining`), `SIGNING_STATUS = UNSIGNED_STRUCTURAL_ONLY`, `sign()` fails closed |
| DL-P0-161 `DELIVERY_RECEIPT_V2` | E | `src/design_lab/interop/delivery_receipt.py` — deterministic receipt, rollback reference required, `axes.delivery = PASS` only with full readback and no failing requirement |
| DL-P1-140 `AUDIO_PROVIDER` | F | `src/design_lab/creative/media/audio_provider.py` — ASR/TTS/SFX capability declarations, unqualified-by-default model registry, transcript text structurally forbidden, `execute()` fails closed |
| DL-P1-150 `BLENDER_ADAPTER` | F | `src/design_lab/creative/media/three_d.py` — real byte-level GLB/glTF validator with byte offsets on every error, structural Blender declaration, handoff plan |
| DL-P1-131 `VIDEO_BOUNDARY` | F | `src/design_lab/creative/media/video_boundary.py` — closed operation vocabulary, ownership rules, `assert_within_boundary`, unsupported-claim list |
| DL-P1-170 `QA_PLANE_SPLIT` | assurance | `src/design_lab/assurance/qa_plane.py` — DETERMINISTIC / MODEL_ASSISTED / HUMAN planes with evidence ceilings; a verdict is only possible on a HUMAN layer; `PASS` unreachable without a human verdict |
| DL-P0-171 `HUMAN_JURY` | assurance | `src/design_lab/assurance/human_jury.py` — verdict record v2 bound to an artifact digest; agent proposals are a different type and are refused by every verdict-taking function |
| DL-P1-180 `KNOWLEDGE_FEEDBACK` | assurance | `src/design_lab/assurance/knowledge_feedback.py` — candidate v2 with source/rights/revocation; `build_candidate` has no review parameter, so approval is only reachable through a named human reviewer; revoked candidates cannot be exported |
| DL-P0-070 `HOST_MATRIX` | readiness | `src/design_lab/readiness/host_matrix.py`, `design-lab/readiness/adobe-host-matrix.json` — claimed vs verified per host/version/API; a verified API needs `VERIFIED_LIVE` + evidence; nothing is verified because no host ran |
| DL-P1-100 `MODEL_RADAR` | readiness | `src/design_lab/readiness/model_radar.py`, `design-lab/readiness/model-radar.json` — 14 entries, references the existing external-asset registry, H3 blocked by licence, 0 enabled |
| DL-P1-120 `VECTOR_PROVIDER` + bench | readiness | `src/design_lab/readiness/vector_provider.py`, `reconstruction_bench.py` — provider SPI with no supported capability, scoring that can never report `PASS` without measured metrics, provider ranking refused for all-`NOT_RUN` cases |

Non-code items:

- **DL-P0-060 `MINIMAX_SECONDARY_HOST`** — `integrations/hosts/minimax-design/`
  (`adapter.manifest.json` E0/`supported: false`, `POC-PLAN.md`, `rights-and-provider-policy.md`,
  `evidence/README.md`). The application is recorded as present; the POC itself is
  `NOT_EXECUTED` and its acceptance fields are specified.
- **DL-P0-050 `OPEN_DESIGN_E3`** — `docs/handoffs/DEEPSEEK-OPEN-DESIGN-E3-READINESS-2026-09-13.md`.
  Blocked by a real condition: Open Design is `NOT_FOUND_IN_SCOPE` on this machine
  and installing it is outside the authorised boundary.

## 6. Cross-contract joins fixed during review

A worker-written contract passing its own tests can still fail to join with the
rest of the product. Two such gaps were found and closed by the lead:

1. **Requirement ledger → delivery receipt** (DL-P0-030 → DL-P0-161): the receipt
   speaks `PASS/FAIL/NOT_RUN/UNVERIFIED/BLOCKED/SKIPPED_OPTIONAL`, the ledger
   speaks `OPEN/MET/FAILED/WAIVED/CONTRADICTED`. Added
   `requirement_ledger.delivery_requirements()` with an explicit, tested mapping
   instead of leaving callers to guess.
2. **Model radar → model resolver** (DL-P1-100 → DL-P0-091): the radar owns model
   presence/licence/hardware; the resolver needs files and digests. Added
   `model_assets.registry_from_radar()`, which projects the real
   `model-radar.json` (14 entries; 5 blocked; 0 enabled) so there is one model
   registry, not two. Family and repo-local path vocabularies are mapped
   explicitly, and an unmapped family fails closed rather than drifting.

Also verified by hand rather than accepted from a report: the GLB validator
rejects a length mismatch, an unknown `bufferView`, a `bufferView` overrun and
non-GLB bytes, and it correctly rejected a *wrong fixture of mine* (a VEC3
accessor needing 36 bytes in a 12-byte view) — which is the behaviour that
matters.

## 7. Verification performed

| Check | Result |
|---|---|
| `test_creative_*.py` | 100 tests, OK |
| `test_interop_*.py` | 104 tests, OK |
| `test_media_*.py` | 57 tests, OK |
| `test_assurance_*.py` | 74 tests, OK |
| `test_readiness_*.py` | 53 tests, OK |
| Store suites touched by the migration (`test_asset_store`, `test_job_store`, `test_bundle_store`, `test_state_store`, `test_runtime_asset_safety`, `test_installed_state_resources`, `test_native_tasks`, `test_native_plan`, `test_image_import_recovery`) | all OK (pre-existing suites unchanged) |
| Aggregate verify chain (`design-lab/scripts/verify_design_lab.py`) | all steps PASS, exit 0 (including `verify_open_design_host_adapter.py`, `verify_comfyui_gate.py`, `verify_runtime_contracts_v3.py`, `verify_capability_evidence_v4.py`) |
| Full python regression (`scripts/run_python_tests.py`) | see §8 |
| `/goal`-level honesty checks | no host launched, no GPU, no network call, no credential read, no commit/push; every "live" path raises `NOT_EXECUTED` |
| Hygiene | 120 new files checked: all carry the SPDX header and LF endings; no shared file was touched by a worker (only `asset_store.py`, `state_resources.py`, the report projections and this record's siblings changed) |

## 8. Full regression

Command:

```powershell
& 'D:\All projects\DESIGN-LAB\.venv\Scripts\python.exe' 'D:\All projects\DESIGN-LAB\scripts\run_python_tests.py'
```

Result: **`Ran 1351 tests in 1307.142s` — `OK (skipped=33)`**, on this tree
(working tree, uncommitted). The 33 skips are the repository's existing
platform-conditional skips (Windows symlink/permission class); they are not
counted as passes. This is not an exact-SHA CI result: the tree was not committed
when the suite ran.

The historically recorded 967-item run belongs to an earlier tree and does not
describe this one.

## 9. Four-axis record

No item in this execution can claim more than the axes below, and none is
promoted by generating reports:

| Axis | State | Meaning here |
|---|---|---|
| `implementation` | `IMPLEMENTED_LOCAL` | contracts, schemas, migration and guards exist in this working tree |
| `unit` | `PASS` | the per-suite results in §7 |
| `host_live` | `NOT_VERIFIED` | no host, model, GPU or remote provider was run by anyone in this execution |
| `delivery` | `PARTIAL` | nothing is delivered to a client; the delivery receipt contract reports `PARTIAL` until a host readback exists |

## 10. Open items for the owner and GPT (not silently resolved)

1. **Ledger registration.** `design-lab/config/task-ledger-r3.json` is R5-scoped and
   its contract (`src/design_lab/governance/r5_contract.py`) pins exactly 28
   `DL-R5-*` tasks against frozen source hashes. The Deep Adaptation task ids
   (`DL-P0-*`/`DL-P1-*`) therefore appear in documents but **not** in the ledger.
   Registering them needs a new ledger version and a new contract, which is a
   governance decision, not an agent edit.
2. **Product manifest registration.** `design-lab/config/product-manifest.json`
   lists directory roles and capability families; the new packages
   (`src/design_lab/creative/`, `assurance/`, `readiness/`, `interop/`) are not
   listed. Adding a *family* would require editing `verify_product_manifest_v3.py`
   (`family_ids == EXPECTED_FAMILIES` is an exact match), so this was left alone
   deliberately.
3. **Penpot in the adapter registry.** `integrations/adapter-registry.json` still
   carries the older Penpot entry (`declared`); the new structural declaration was
   not merged into it, to avoid a shared-file edit by a worker.
4. **MiniMax H3 rights decision** — see `DEEPSEEK-RIGHTS-REFRESH-MINIMAX-H3-2026-09-13.md`
   §"Open questions". Five questions, no agent answer.
5. **Language governance (pack §36)** could not be executed: the pack text was not
   available in this session, so no policy was invented. If the pack names a
   specific requirement, it still needs to be supplied.
6. **GLB validator result shape.** `validate_glb` returns raw chunk bytes as well
   as a JSON-safe `glb_report_summary()`; a caller storing the full record must
   use the summary.
7. **Report drift — already handled once, will recur.** `PROJECT_STATUS.json` counts
   defined test methods, so adding tests drifts it. The projections were
   regenerated after the tree was frozen for this round
   (`CURRENT_REPORTS=PASS mode=generate`), and the documented count is now 1355
   defined methods bound to `subject_sha 9f34b53`. Any further code change must
   regenerate again; `--check` is the gate.

## 11. Reproduction

```powershell
$py = 'D:\All projects\DESIGN-LAB\.venv\Scripts\python.exe'
$tests = 'D:\All projects\DESIGN-LAB\design-lab\tests'
& $py -m unittest discover -s $tests -p 'test_creative_*.py' -t $tests
& $py -m unittest discover -s $tests -p 'test_interop_*.py'  -t $tests
& $py -m unittest discover -s $tests -p 'test_media_*.py'    -t $tests
& $py -m unittest discover -s $tests -p 'test_assurance_*.py' -t $tests
& $py -m unittest discover -s $tests -p 'test_readiness_*.py' -t $tests
& $py 'D:\All projects\DESIGN-LAB\design-lab\scripts\verify_design_lab.py'
& $py 'D:\All projects\DESIGN-LAB\scripts\generate_current_reports.py' --check
```

`unittest` writes progress to stderr, so PowerShell may print `[exit code: 1]`;
the authoritative line is `OK` or `FAILED`.

## 12. Rollback

Everything in this execution is additive and uncommitted:

- New code: `src/design_lab/creative/`, `src/design_lab/assurance/`,
  `src/design_lab/readiness/`, `src/design_lab/interop/`, the new schemas, state
  SQL and test files — delete to revert.
- Two modified production files: `src/design_lab/runtime/asset_store.py` (one
  named-column insert) and `src/design_lab/runtime/state_resources.py` (one
  allow-list entry) — `git checkout --` them to revert.
- Regenerated projections under `reports/current/` and
  `design-lab/config/current-report-index.json` — regenerate after reverting, or
  `git checkout --` them.
- A database that already ran the `creative-v1` migration keeps its extra columns
  and `runtime_migration` row; the backup written before migration is
  `<db>.pre-creative-v1-<hex>.bak` beside the database.
- No user file was deleted, reset, reverted or cleaned at any point, and
  `docs/handoffs/SESSION-RESTART-2026-09-12.md` is preserved untouched.
