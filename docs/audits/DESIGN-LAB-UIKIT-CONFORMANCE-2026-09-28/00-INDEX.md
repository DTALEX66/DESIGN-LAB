# DESIGN-LAB × UI-kit conformance archive — 2026-09-28

**Archive root:** `docs/audits/DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/`
**Baseline `main` at archive time:** `3d0ad1cd51869c288e8d3870af8c2541f7bb505f`
**Round PRs:** #182 (`.seg` primitive → `553b0ca4`), #183 (route-heading de-couple → `3d0ad1c`)

> This is a **HISTORICAL / EVIDENCE archive**, not a current authority, not a task
> dispatch entry and not a ledger. Per `AGENTS.md`, the top-level authority remains
> `/AUTHORITY.md` (`DL-AUTHORITY-2026-09-18-R2`). Nothing here may be used to edit
> execution state or to claim a capability-axis promotion.

---

## 1. What this archive is

The DESIGN-LAB workbench is a 1:1 replica of the in-repo **B10** UI kit. This archive
records one round of work that made that claim **measurable** rather than asserted:
auditing, per computed CSS property, whether the B10 shell (`.app`) still depended on
pre-B10 legacy CSS, and closing the dependency that was found.

## 2. Provenance

| Input | Origin | Identity |
|---|---|---|
| Owner task pack | `DESIGNLAB_商业级前端与能力闭环_后续任务包_20260928.zip` | sha256 `70592198dbd4ea0228ab1714143ec9e230f90237d19247b8831d586d64cfae85` |
| UI-kit originals | owner batch **B04** (component system / tokens), **B07** (front-end spec), **B10** (final hi-fi deployable UI) | extracted from the owner's own per-project archives under `D:\All projects\UI套件` |

⚠️ **Only the per-project `DESIGN-LAB_*` archives were used.** The three-project
"全量包" bundles mix ArcheAxis and WORK-LAB material; using them for a DESIGN-LAB 1:1
replica would cross-contaminate colour and specification. This warning was carried in
the pack and is confirmed correct.

## 3. Layout

| Path | Contents |
|---|---|
| `pack/` | The owner-supplied pack documents, verbatim (`00_README` … `04_SOURCES`, `ALIGNMENT-ANALYSIS`, `EXTRACTION-MANIFEST`) |
| `findings/` | Work-package deliverables — `W00` crosswalk / diff-mapping / evidence-scan, `W01` typography matrix, `W02` component coverage + decision + **`W02-LEGACY-COUPLING`**, `W03` project-detail route, `W14` viewport/keyboard |
| `evidence/` | Raw, unedited harness outputs (`W02-LEAK-SWEEP.txt`, `*-VERIFY.json`, `*-PROBE.json`) |
| `harness/` | The audit tooling that produced `evidence/` — runnable, SPDX-tagged |
| `session/` | Session lineage: commit/PR message drafts, superseded revisions, intermediate probes. **Superseded, kept only for traceability** |
| `ui-originals/` | Extracted reference originals (`B04/`, `B07/`, `B10/`) + `EXTRACTION-MANIFEST.json`. The 17 B04 design sheets carry `.license` sidecars |

## 4. The headline result

`W02-LEAK-SWEEP.txt` deletes every unscoped, element-only legacy rule through the
CSSOM and diffs **all** computed longhands of every `.app` element across all 12
routes plus the default and login screens (328 elements in `.app`).

| Scope | Before | After |
|---|---|---|
| **inside `.app`** (the B10 1:1 subject) | **8** legacy-supplied bindings | **0** |
| outside `.app` (legacy chrome: login, `#workspace`, `nav.app-nav`) | 1923 | 1923 |

The 8 were the placeholder `<h2>` margins on `#/research` and `#/collaboration`,
supplied by the pre-B10 `h2{margin:0 0 14px}` rule. Fixed by declaring the margin in
`.route-view h2` with **exactly the previously computed values**, so the pixels are
unchanged and only the hidden dependency is removed. See `findings/W02-LEGACY-COUPLING.md`.

**Design consequence recorded there:** the 1923 out-of-`.app` bindings are why the
legacy element rules **cannot** simply be scoped to `body > …`. An earlier plan to do
exactly that would have broken the login and workspace screens.

## 5. Reproduction

```bash
# from the repo root; node must be resolvable (the repo pins playwright 1.63.0)
node docs/audits/DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/harness/w02-legacy-leak-sweep.mjs
```

The harness serves `apps/workbench/` under the **exact CSP the service sends**
(`default-src 'none'; script-src 'self'; style-src 'self'; …`) and drives the pinned
Chromium. On this machine `playwright@1.63.0` expects chromium-1243 while only 1228 is
installed, so the harness passes an explicit `executablePath`; adjust that constant for
another machine.

The harness carries its own **positive control** (an injected element-only leak must be
reported end-to-end). This is deliberate: three harness bugs in this round each produced
a *false* result before being found — route discovery reading `href` off `<button>`
elements, same-document hash navigation, and `getComputedStyle` returning stale values
when read in the same task as a CSSOM mutation. All three are documented in
`findings/W02-LEGACY-COUPLING.md` §5.

## 6. Deliberate exclusions

- **9 transient Chromium profile directories** (~142 MB) used by the harnesses are
  *not* archived — they are browser cache state, not work product. They remain under
  `.project-local/task-artifacts/designlab-followup-taskpack-20260928/chrome-profile-*/`.
- No capability-axis promotion is claimed. `host_live` and `delivery` remain at
  **1/28** and **0/28**: they require real host hardware and are untouched by this round.

## 7. Compliance notes

- Archived `.py`/`.mjs`/`.js` carry `SPDX-License-Identifier: MIT` so the
  **License & secret hygiene gate** (`design-lab/scripts/verify_license_coverage.py`)
  stays green; the 17 binary sheets carry `.license` sidecars for the same gate.
- Every text file here is valid UTF-8: the **identity gate** reads all tracked text and
  fails **closed** on an unreadable file. (This archive's own first sweep output was
  written UTF-16LE by a PowerShell redirect and was caught by that gate.)
- Placed under `docs/audits/` deliberately: `docs/taskpacks/**` is scanned by the
  authority-chain and context-integrity gates, so an archive there could be
  misclassified as a historical taskpack or as an authority claim.
