# Timing — perceptual thresholds, duration scales & per-interaction numbers

The companion to `spring-system.md` and `easing.md`. Those tell you *how the motion moves*; this tells you *how long it should take and why* — grounded in human perception and cross-checked against the major design systems. Every number here is tagged: plain = verified against a primary/official source; `[UNVERIFIED]` = convention or could not be confirmed against a primary source; `[TUNE]` = a starting point to adjust by eye, not a law.

This file feeds two skill rules: `principles.md` rule 2 (frequency governs intensity) and rule 6 (easing law). The five presets it maps to live in `spring-system.md`: **Snap** (0.2s), **Glide** (0.5s), **Pop** (0.4s), **Lively** (0.45s), **Track** (0.35s).

---

## 1. Perceptual thresholds — the canonical numbers

These are the bedrock. They are about *human perception of time*, not any particular framework. Most predate the web.

| Value | One-line meaning | Source |
|---|---|---|
| **0.1 s (100 ms)** | The system feels like it reacts **instantaneously** — "no special feedback is necessary except to display the result." | Nielsen, NN/g *"Response Times: The 3 Important Limits"* (1993), crediting Miller 1968 & Card et al. 1991 |
| **1.0 s (1000 ms)** | The user's **flow of thought stays uninterrupted** — they notice the delay but stay engaged; no special feedback needed under 1 s. | Nielsen, NN/g (same) |
| **10 s (10,000 ms)** | Limit for **keeping attention on the task**; past this, show a percent-done indicator and users start task-switching. | Nielsen, NN/g (same) |
| **~400 ms (Doherty Threshold)** | Response-time target below which "productivity soars" and use becomes addicting; replaced the older 2,000 ms norm. | Doherty & **Arvind J. Thadani**, *"The Economic Value of Rapid Response Time,"* **IBM technical report, Nov. 1982** (GE20-0752-0) — *not* the IBM Systems Journal. Popularized by Laws of UX. |
| **≤ 100 ms (RAIL Response)** | "Complete a transition initiated by user input within 100 ms" so it feels instantaneous. | web.dev *"Measure performance with the RAIL model"* |
| **≤ 50 ms (RAIL Response)** | "Process user input events within 50 ms" to guarantee a visible response inside the 100 ms window. | web.dev RAIL |
| **~100 ms (causality / launching effect)** | Below ~100 ms of delay, two events read as **one causing the other**; the launching impression is already *reduced* by **70 ms**, gives way to "delayed launching" at **~98 ms**, and **disappears entirely at 154 ms**. | Michotte, replicated RSOS 2025 (registered replication) |
| **16.7 ms (one frame @ 60 fps)** | The per-frame budget; RAIL rounds it to a **16 ms** frame budget, of which the browser needs **~6 ms**, leaving **~10 ms** of app work. At 120 fps it's **8.3 ms**, at 144 fps **6.9 ms**. | web.dev RAIL + MDN (16/10/6 ms verbatim); 8.3/6.9 = arithmetic |
| **34–137 ms (median 54, mean 65)** | Empirically measured spread of the "felt instantaneous" latency threshold for mouse interaction — the real, fuzzy edge behind Nielsen's clean 100 ms. | Forch et al. 2017 |

**Caveat worth carrying:** the clean 0.1/1/10 s ladder is a *reasoned heuristic*, not an experimental result — Miller (1968) ran no experiments and Nielsen states the limits as facts. Treat them as well-worn defaults, not measured constants. The Doherty "400 ms vs 2,000 ms" framing is a popularization (the 1982 paper argues for sub-one-second and ran its experiments at **0.3 s**); the real primary productivity gains were **+106%** and **+339%** transactions/hour, *not* the apocryphal "25–30%." `[The often-quoted "<1 s first meaningful paint" is not in current RAIL text — UNVERIFIED.]`

---

## 2. The motion duration scale — the token ladder

Reconciled across **Material 3**, **IBM Carbon**, **Atlassian**, **Salesforce (SLDS)**, and practitioners (Emil Kowalski). The cross-system consensus, stated as one ladder:

| Rung | This skill's ms | Maps to preset | M3 token | Carbon | Atlassian | SLDS | Use |
|---|---|---|---|---|---|---|---|
| **instant** | 0–100 | (none / `Snap`) | short1–2 (50–100) | fast-01/02 (70/110) | instant 0, short 150 | immediately 50, quickly 100 | micro-feedback: press, toggle, hover, ripple |
| **fast** | 150–200 | **Snap ≈ 200 ms** | short3–4 (150–200) | moderate-01 (150) | short 150 / medium 200 | promptly 200 | small UI transitions, button state, tooltip |
| **base** | 250–300 | (between) | medium1–2 (250–300) | moderate-02 (240) | long 250 | — | modals, menus, the everyday A→B |
| **slow** | 400–500 | **Glide ≈ 500 ms** | medium4–long2 (400–500) | slow-01 (400) | xlong 400 | slowly 400 | sheets, routes, full-screen, page transitions |
| **deliberate** | 600–1000 | (`Glide`+) | long3–extra-long4 (550–1000) | slow-02 (700) | xlong 400+ | paused 3200 | large/expressive moves, orchestrated sequences |

**The whole M3 scale (verified, ms):** short1–4 = 50/100/150/200; medium1–4 = 250/300/350/400; long1–4 = 450/500/550/600; extra-long1–4 = 700/800/900/1000.
**Carbon (verified):** fast-01 70, fast-02 110, moderate-01 150, moderate-02 240, slow-01 400, slow-02 700.
**SLDS (verified, `--slds-g-duration-*`):** instantly 0, immediately 50, quickly 100, promptly 200, slowly 400, paused 3200; toast-short 4800, toast-medium 9600. (`duration-slide 0.25s` is `[UNVERIFIED]` — not in 2.30.4.)
**Adobe Spectrum / Apple HIG:** publish principles, **no numeric ms durations** `[UNVERIFIED — none exist as primary numbers]`. Apple's one real number is tangential: avoid oscillations near **0.2 Hz** (one per 5 s) under Reduce Motion.

### Two structural laws of the ladder

- **Enter slower than exit.** Exits should be shorter than enters — the thing leaving doesn't need to be admired. M3 states it as policy; Atlassian ships it literally in component tokens (verified): modal/flag/spotlight **enter 250 / exit 200**; avatar/popup **enter 150 / exit 100**. So: enters ≈ 150–250 ms, exits ≈ 100–200 ms.
- **Duration scales with distance / surface area.** Small elements take short/medium; large or full-screen surfaces take long. A 40 px nudge and a full-page route should not share a duration.

### Practitioner anchor (Emil Kowalski, verified)

UI animation should "usually be shorter than **300 ms**"; default to **ease-out**; press `:active` → **scale(0.97)**; enter scale starts ~**0.93** (never `scale(0)`); tooltip **125 ms** ease-out; a dropdown at **180 ms** feels more responsive than at 400 ms; add **blur(2px)** if duration/easing still feels off; and *remove* animation entirely from actions seen "tens or hundreds of times a day."

> This is why `Snap` is 0.2 s and `Glide` is 0.5 s: `Snap` sits at the fast rung (the high-frequency floor Emil/Material/Atlassian all cluster at ~150–200 ms), and `Glide` sits at the slow rung (the 400–500 ms band for sheets/routes). `Pop`/`Lively`/`Track` (0.4/0.45/0.35 s) live in base–slow with overshoot — see `spring-system.md`.

---

## 3. Per-interaction timing table

Concrete numbers for specific interactions. Verified values name their primary artifact; conventions are flagged. Use as `[TUNE]` starting points, then apply `principles.md` rule 2 (cut for high frequency).

| Interaction | Value | Source |
|---|---|---|
| **Press / state change** | 100–200 ms (M3 short2–short4) | Flutter `Durations` / MD3 tokens |
| **Ripple (Material)** | 225 ms press, 150 ms release-fade | MD2 ripple |
| **Hover** | ~200 ms `[TUNE]` | community convention |
| **Tooltip — first (warmup)** | 700 ms (Radix `delayDuration`); 1000 ms warmup (Spectrum); 1500 ms (React Spectrum default) | Radix / Spectrum Web Components / React Spectrum docs (all verified) |
| **Tooltip — warm (subsequent)** | open **immediately** within the warm window; Radix `skipDelayDuration` **300 ms**, Spectrum cooldown **1000 ms** | Radix / Spectrum (verified) |
| **Tooltip — transition itself** | 125 ms ease-out, no delay/animation on subsequent | Emil Kowalski (verified) |
| **Menu / dropdown** | open ~180 ms (feels more responsive than 400 ms) | Emil Kowalski (verified) |
| **Modal / dialog enter** | 250–300 ms (M3 medium1–2); full-screen up to ~375 ms | MD3 tokens (verified); mapping `[verified-snippet]` |
| **Sheet / drawer** | **500 ms**, ease `cubic-bezier(0.32, 0.72, 0, 1)` | vaul `src/constants.ts` (verified) — this is also `Glide`'s cubic-bezier fallback |
| **Page / route transition** | 300–500 ms (slow rung); M3 shared-axis / fade-through **300 ms total** | M3 / Atlassian xlong (verified) |
| **Toast — auto-dismiss** | **4000 ms** (`TOAST_LIFETIME`); SLDS toast-short 4800 / toast-medium 9600 | sonner `src/index.tsx`; SLDS (verified) |
| **Toast — swipe / unmount / max visible** | 45 px swipe threshold; 200 ms before unmount; 3 visible | sonner (verified) |
| **Stagger (per-item delay)** | **≤ 20 ms** between item entrances (IBM ships `transition-delay: 20ms`); practitioner range ~20–80 ms `[TUNE]` | Material Choreography / IBM UX Motion Specs (verified) |
| **Long-press threshold** | **400 ms** (`DEFAULT_LONG_PRESS_TIMEOUT`, current AOSP — *not* the legacy 500 ms); Apple hold-timer appears at **0.3 s** | AOSP `ViewConfiguration.java`; Apple Support 102222 (verified) |
| **Double-tap window** | **300 ms** (`DOUBLE_TAP_TIMEOUT`); min gap 40 ms; web historical 350 ms | AOSP; WebKit blog (verified) |
| **Drag-start threshold** | Android **8 dp** (`TOUCH_SLOP`); vaul close at 0.25 height, velocity 0.4 | AOSP (verified); vaul (verified). *dnd-kit `distance: 8` is a common example, **NOT** a library default — `[UNVERIFIED as default]`* |
| **Loader-after-X ms (delay before spinner)** | **~300 ms** — under it show nothing, over it show a spinner | Productboard / Martin Nuc, verbatim "we set the threshold to 300ms" (practitioner convention) |
| **Tap vs scroll disambiguation** | 100 ms (`TAP_TIMEOUT`); pressed-state min 64 ms; jump-tap 500 ms | AOSP (verified) |
| **Web tap delay (historical)** | 350 ms, removable via `touch-action: manipulation` | WebKit blog 5610 (verified) |
| **Input debounce** | ~300 ms (300–1000 ms range) `[UNVERIFIED — convention]` | CSS-Tricks / DeveloperWay |
| **Scroll / resize throttle** | ~200 ms, or rAF (~16 ms) `[UNVERIFIED — convention]` | CSS-Tricks |

---

## 4. Perceived performance — making it *feel* faster

Perception beats stopwatch. Maister's framing: **Satisfaction = Perception − Expectation**, and the biggest payback for perceived quality comes in the **early stages** of an interaction ("it's hard to plan catch-up ball"). Five techniques, each with its number.

1. **Optimistic UI — decouple feedback from the network.** Update the UI immediately on the user's action and reconcile with the server later. Aim to deliver the UI response **under 100 ms** (RAIL Response). *(Simon Hearne, "Optimistic UI Patterns," verified: "decouple user feedback from the network… aim for under 100ms.")*

2. **Skeletons over spinners over blank.** A skeleton that mimics the final layout "creates the illusion of a shorter wait." Rule of thumb: **spinner/skeleton for 2–10 s**, determinate **progress bar for >10 s**, and show **any** indicator only past **~1 s** (under 1 s an animated indicator is just distracting). *(NN/g "Skeleton Screens 101" + "Progress Indicators Make a Slow System Less Insufferable.")* `[The "30–50% perceived gain" and "3 s skeleton ≈ 1.5 s spinner" figures are UNVERIFIED — absent from NN/g.]`

3. **Loader-after-X ms.** Don't flash a spinner for sub-second work — it makes fast feel slow. Delay the spinner **~300 ms**; if the work finishes first, the user never saw a loader. *(Productboard / Martin Nuc, verified.)*

4. **Front-load the motion (ease-out everywhere it responds to the user).** Movement that starts fast reads as responsive. Use decelerate-on-enter / accelerate-on-exit (M1 enter `cubic-bezier(0.0, 0.0, 0.2, 1)`, exit `cubic-bezier(0.4, 0.0, 1, 1)`; standard `cubic-bezier(0.4, 0.0, 0.2, 1)`). A moving progress bar buys **~3× longer** wait tolerance and higher satisfaction. *(NN/g, citing a University of Nebraska–Lincoln study.)*

5. **Work during the animation; occupied time feels shorter.** Use the enter animation as cover to dispatch the request — Allbirds' mini-cart "only takes half a second, but it buys enough time for the API call." Land deferred work in **≤50 ms idle chunks** (RAIL *Idle* goal) so the next interaction still hits the 100 ms Response window. Maister: **"Occupied Time Feels Shorter Than Unoccupied Time"** ("a watched pot never boils") and **"People Want to Get Started"** — pre-process waits feel longer than in-process ones, which is exactly what a skeleton exploits.

**Supporting psychology of waiting** (Maister, verified verbatim): occupied < unoccupied; uncertain > known-finite; unexplained > explained; anxious > calm; pre-process > in-process. **Endowed progress:** pre-filling a goal lifts completion — a 12-stamp card with 2 free stamps hit **34%** completion vs **19%** for a bare 10-stamp card (same 10 purchases required). *(Kivetz, Urminsky & Zheng, JMR 2006.)* Idle waits are overestimated by **~36%** *(Richard Larson, MIT — popularized via NYT; this is **not** Hornik, and **not** in Maister's text).*

---

## 5. Advanced principles for interesting UI

Disney's 12 principles, filtered for UI (Val Head's verified position: **Timing, Follow-through, Appeal, Anticipation, Squash-and-Stretch** transfer well; **Staging and Solid Drawing are mostly irrelevant** — though staging-as-orchestration below is the useful reinterpretation). Each as a rule the skill can apply.

**Disney → UI mappings worth adopting**

- **Anticipation** — wind up before a big move so it reads as intentional. A small counter-scale or pull-back before a confirm/launch. The UI equivalent of `y < 0` in a cubic-bezier (`anticipate` in Motion). Use sparingly, on consequential one-shots.
- **Follow-through & overlapping action** — parts don't all stop at once. A panel arrives, then its content settles a beat later (IBM ships exactly this: side-panel content trails the container by **20 ms**). This is what a spring's overshoot tail does for free.
- **Secondary action** — a supporting motion that reinforces the main one without competing (a subtle shadow lift as a card rises). Keep it quieter than the primary.
- **Staging** — direct attention; only one thing should be the star of any transition. (See `principles.md` rule 9: the resizing box is the star, the content swap is secondary.)

**Modern principles**

- **Orchestration / choreography** — sequence related elements with small offsets (stagger **≤ 20 ms**, range ~20–80 ms `[TUNE]`) so a group reads as one coordinated event, not a pile-up. Material *Choreography*.
- **Motion as hierarchy** — what moves first, fastest, and most is what matters most. Use timing and amplitude to rank elements, not just size and color.
- **Spatial depth** — z-axis and scale build a believable space (M3 Z-shared-axis: incoming **80% → 100%**, outgoing **100% → 110%**; X/Y shared-axis and fade-through use **92% → 100%**). Origin-aware: things grow from where they came (`principles.md` rule 3).
- **Multisensory (haptics + sound)** — pair motion with haptics/sound to make a moment feel tangible. *[The claim that Apple "doesn't synchronize haptics and sound automatically" is UNVERIFIED and likely backwards — Core Haptics explicitly supports synchronized audio. Drop that assertion; keep "pair them deliberately."]*
- **Reactivity / liveliness** — the interface should feel like it's responding *to you*: 1:1 gesture tracking, momentum retention, interruptibility (`principles.md` gesture laws A–E). A spring described "without duration" (Apple WWDC18, paraphrased) is the point — it reacts continuously rather than playing a fixed clip; lag makes gestural UI "fall off a cliff" (Chan, WWDC18, verbatim).

**Accessibility is a hard constraint on all of the above** (WCAG, verified): auto-starting motion **> 5 s** must be pausable/stoppable/hideable (2.2.2, Level A); never flash **> 3 times in 1 s** (2.3.1, Level A); interaction-triggered motion must be disableable unless essential (2.3.3, AAA). And `prefers-reduced-motion` is non-negotiable (`principles.md` rule 8).

---

## 6. Smooth vs snappy — the two dials

Same motion, two intents. **Smooth** = calm, continuous, deliberate (sheets, routes, ambient). **Snappy** = crisp, immediate, responsive (press, toggle, high-frequency). Pick the intent first, then pull these levers.

**Levers for SNAPPY**
- Shorter duration — **~150–200 ms** (`Snap`, fast rung).
- **ease-out** (starts fast = "quick response," Emil Kowalski) or low/zero bounce.
- Respond from **pixel one** (1:1), no entry delay.
- Smaller travel and scale deltas (press → `scale(0.97)`, not 0.8).
- Remove or instant-ize anything high-frequency / keyboard-driven (`principles.md` rule 2).

**Levers for SMOOTH**
- Longer duration — **~400–500 ms** (`Glide`, slow rung), up to deliberate for large surfaces.
- A soft settle — small overshoot (`Track` bounce ~0.18) or a decelerate curve; `cubic-bezier(0.32, 0.72, 0, 1)`.
- **Continuity over cuts** — shared-element / layout travel instead of a fade (`principles.md` rule 3).
- Overlap/follow-through (trailing content by ~20 ms) so it breathes.
- Enter slower than exit; scale with distance.

### Too slow / too fast

| | Threshold | What goes wrong |
|---|---|---|
| **Too fast** | < ~**100 ms** | Reads as a cut/jump, no continuity; below ~100 ms two events fuse (causality) — fine for instant feedback, bad when you wanted to *show* a transition. The ~**120–150 ms** "reads as a jump" floor is `[UNVERIFIED — synthesis]`; Material's smallest real moves sit at **150–200 ms**. |
| **Just right (UI band)** | **100–400 ms** | ~100 ms for simple feedback (toggles), 200–300 ms for substantial screen changes (NN/g, verified). |
| **Too slow** | > ~**400–500 ms** | "Animations start to feel like a real drag" at **500 ms** (NN/g, verbatim). **Far more common than too-fast.** Above ~300 ms a non-physical curve feels like waiting (Emil Kowalski). |
| **Tolerable only with a reason** | up to **1 s** | Large/orchestrated/expensive transitions, *if* the work is real and the motion explains it. Past **1 s** you've left the flow-of-thought window — show progress (§1, §4). |

Default bias, restating `easing.md`: **shorter, softer, more connected.** Too-slow is the common sin; when unsure, cut the duration before you add to it.

---

## Citations (primary/official, fetched & verified)

NN/g *Response Times* (nngroup.com/articles/response-times-3-important-limits) · NN/g *Skeleton Screens 101* / *Progress Indicators* / *Executing UX Animations* (Page Laubheimer) · Doherty & Thadani, *The Economic Value of Rapid Response Time*, IBM 1982 (GE20-0752-0; CHM 102751398) · web.dev RAIL + MDN RAIL glossary · Michotte replication, RSOS 2025 (PMC12434928) · Forch et al. 2017 · Material `material-tokens` motion.json + `material-components-android` Motion.md + Material Speed/Choreography (M1) · `@carbon/motion` + IBM UX Motion Specs · `@atlaskit/tokens@13.1.1` · `@salesforce-ux/design-system@2.30.4` · `@adobe/spectrum-tokens` (no ms) · Apple HIG Motion + Reduced Motion · Emil Kowalski (emilkowal.ski/ui/great-animations, /7-practical-animation-tips) · Rauno Freiberg, Web Interface Guidelines · Apple WWDC18 *Designing Fluid Interfaces* (asciiwwdc 2018/803) · sonner `src/index.tsx` · vaul `src/constants.ts` · AOSP `ViewConfiguration.java` · Radix / Spectrum / React Spectrum Tooltip docs · WebKit blog 5610 · Productboard / Martin Nuc · Maister *The Psychology of Waiting Lines* · Kivetz, Urminsky & Zheng, JMR 2006 · Larson (MIT) · Simon Hearne *Optimistic UI Patterns* · WCAG 2.2.2 / 2.3.1 / 2.3.3.
