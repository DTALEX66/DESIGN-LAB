# DESIGN-LAB — UI-kit conformance round handover (2026-09-28)

> **HISTORICAL — NOT AN AUTHORITY.** This is a round handover/archive record, kept for
> traceability only. It is not top-level authority, not a task dispatch entry and not a
> status projection. Top-level authority remains `/AUTHORITY.md`
> (`DL-AUTHORITY-2026-09-18-R2`); current state is `reports/current/**` (a projection,
> freshness-checked) plus live CI at the exact SHA. Nothing here may be used to edit
> execution state.

**Baseline `main`:** `3d0ad1cd51869c288e8d3870af8c2541f7bb505f`
**Round PRs:** #182 → `553b0ca4`, #183 → `3d0ad1c`
**Full evidence archive:** `docs/audits/DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/00-INDEX.md`

---

## 1. What was delivered

| PR | Scope | Verify |
|---|---|---|
| **#182** | Unscoped `.seg` segmented control — B07's registry maps `Tabs` onto it, but B10 defines the control only inside `.toolbar`, so it did not exist outside one. Adds the two states B07 declares and B10 never expressed (hover 120ms, focus 2px ring) plus `:disabled`. | 19/19 PASS; an 18-property computed-style diff shows `.toolbar .seg*` diverges **only** in `transition` |
| **#183** | De-couple the route-host heading from pre-B10 legacy CSS. `.route-view h2` declared `font-size` but not `margin`, so the placeholder `<h2>`'s margins came silently from the legacy unscoped `h2{margin:0 0 14px}`. | `.app` legacy-supplied bindings **8 → 0**, pixels unchanged |

## 2. How the second one was found (the method worth reusing)

Rather than argue specificity, the audit **measures the cascade**: delete every
unscoped element-only legacy rule through the CSSOM and diff **all** computed longhands
(`getComputedStyle`'s own index list, not a hand-written property set) for every `.app`
element across all 12 routes plus the default and login screens — 328 elements.

Reasoning behind it: because B10 styles **only by class** (`(0,1,0)`), a bare element
rule `(0,0,1)` can never beat a B10 rule. It can only fill in a property B10 leaves
undeclared. So the question "did legacy CSS leak into the B10 shell?" is exactly
"which properties change when the legacy rules are removed?" — a measurement.

Harness: `docs/audits/DESIGN-LAB-UIKIT-CONFORMANCE-2026-09-28/harness/w02-legacy-leak-sweep.mjs`.

## 3. Boundary finding that must not be forgotten

The same sweep reports **1923** legacy-supplied bindings **outside** `.app`: the
login/connect screen, `#workspace` and `nav.app-nav` are the **legacy app**, which B10
does not govern.

> **Consequence: the legacy element rules must NOT be blanket-scoped to `body > …`.**
> An earlier plan in this round to do exactly that would have broken the login and
> workspace screens. Retiring the legacy chrome is a prerequisite for touching those
> rules, not a follow-up to it.

## 4. Harness bugs found this round (each had produced a false result)

Recorded because a harness that silently measures the wrong subject is worse than none:

1. `.app-nav-item` is a `<button data-route>` — reading `href` gave `null ×12`, the URLs
   became `?dev=1null`, dev mode never engaged, and the sweep was measuring the **login
   screen** while reporting on routes. Route discovery now aborts loudly.
2. A `goto` differing only in the hash is a **same-document** navigation; each route now
   gets a unique query to force a real document load.
3. **Same-task staleness**: `getComputedStyle` read in the same task as a CSSOM mutation
   returns the pre-mutation value. Measured: the rule list went 10 → 8, the deleted rules
   were gone, yet before/after for the first button were byte-identical — i.e. the sweep
   **undercounted leaks**. Prepare and read are now separate tasks.

A fourth, found while shipping the archive itself: a PowerShell `*>` redirect wrote the
evidence file as **UTF-16LE**, which the identity gate reads as unreadable text and
**fails closed** on. Evidence files are now written as explicit UTF-8.

Because of 1–4 the harness carries an end-to-end **positive control** (an injected
element-only leak must be reported). A clean result from an uncontrolled detector is not
evidence.

## 5. Still open (unchanged by this round)

- **Owner decisions pending:** D-1 (ratify the derived crosswalk), D-2 (where W-numbering
  lands), D-3 (component-library path — evidence says an external library could cover
  only ~6/46 items ≈13%, so not recommended), D-5 (pack committed to `docs/taskpacks/` —
  **note this round archived it under `docs/audits/` instead, deliberately**, because
  `docs/taskpacks/**` is scanned by the authority-chain and context-integrity gates).
- **X-1/X-2** body/caption font size, **X-3/X-4** three coexisting mobile breakpoints,
  **X-7** `--radius-sm` collision, **X-8** "Pressed 80ms" unexpressed. The
  `.route-view h2` 24px-vs-B10-32px divergence is filed here rather than silently fixed.
- **Interaction contract:** hover 120ms (app 200ms), focus 2px (app 3px), modal 220ms
  (unexpressed), toast 4s (app 1900ms).
- **E3/E4 gap:** `host_live` **1/28**, `delivery` **0/28** — needs real Adobe hardware.
  This round is CSS/structural only and promotes **no** axis.
- B07's `folder-structure.md` recommends React + Router + Zustand + TanStack Query +
  Radix + Tailwind, which **contradicts AUTHORITY §3** and the pack's Vanilla-TS ruling →
  classified `REFERENCE_ONLY`, not adopted.
