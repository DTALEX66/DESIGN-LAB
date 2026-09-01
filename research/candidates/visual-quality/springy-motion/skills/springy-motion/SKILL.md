---
name: springy-motion
description: >-
  Design and implement beautiful, springy, physically-grounded animations and
  micro-interactions across web (Motion / Framer Motion + CSS/WAAPI) and native
  (SwiftUI). Use when building or polishing motion: spring transitions, pop-in
  entrances, sheets/trays/drawers, shared-element morphs, text morphs, staggers,
  direction-aware tabs/routes, swipe-to-dismiss, drag-to-reorder, rubber-band
  overscroll, press/hover/tap feedback, number tickers, hold-to-confirm, ripples,
  success/confetti, skeletons. Also use to REVIEW or critique existing animations
  ("make it feel alive", "this transition feels off", "too janky", "doesn't feel
  premium"). Triggers on: springy/bouncy animation, spring physics, stiffness/
  damping/bounce, Motion/Framer Motion, SwiftUI animation/withAnimation, easing,
  interruptible gestures, momentum, reduced motion, interaction design polish.
---

# springy-motion

Beautiful motion is not decoration. It is the explanation of what just happened, in the language of physics the body already speaks. This skill builds and reviews motion that *orients, gives feedback, and shows relationships* — and nothing that doesn't.

It is opinionated: one perceptual spring model (`duration` + `bounce`), five named presets, and a small set of rules synthesized from the best interaction-design writing (Kowalski, Benji's *Family Values*, Rauno's *Invisible Details* — see `SOURCES.md`). Every number was verified against primary docs and tuned by eye in a real gallery.

## The two jobs

### A. Implement motion
1. **Name the interaction** and find it in the recipe catalog (`references/recipes-web.md`, `references/recipes-swiftui.md`).
2. **Pick the preset by frequency** (rule below). High-frequency/keyboard → less motion. Rare/high-impact → more delight.
3. **Use the recipe's code** for the target platform. Adjust the preset, not the structure.
4. **Add the reduced-motion variant** — it ships with every recipe. Not optional.
5. **Animate only `transform` + `opacity`.** If you reached for `width`/`top`/`margin`, stop.

### B. Review motion
Run `references/review-checklist.md` against the code. Report **blockers** (layout-prop animation, no reduced-motion, non-interruptible gesture, naive 0→1, destructive-commit-mid-gesture) first, then smells, then nits. Give each finding its principle and the corrected snippet.

## The spring presets (memorize these)

Parameterize by **how long it feels** (`duration`) and **how much it overshoots** (`bounce`), not stiffness/damping. One `(duration, bounce)` is portable across Motion, SwiftUI, and CSS `linear()`. Full code + derived physics + paste-ready easings in `references/spring-system.md`.

| Preset | duration · bounce | feel | use |
|---|---|---|---|
| **Snap** | 0.2 · 0 | instant, no overshoot | press, toggle, selection, high-frequency / keyboard |
| **Glide** | 0.5 · 0 | smooth, calm | sheets, routes, modals — the default A→B |
| **Pop** | 0.4 · 0.4 | satisfying overshoot (~9%) | pop-in, success, confirm — default delight |
| **Lively** | 0.45 · 0.5 | playful bounce (~16%) | confetti, FAB, onboarding — the rare delight peak |
| **Track** | 0.35 · 0.18 | finger-tight settle | release-settle for drags, swipes, sheets |

```ts
// Motion (web)
transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.4 }}   // Pop
```
```swift
// SwiftUI
withAnimation(.spring(duration: 0.4, bounce: 0.4)) { /* … */ }      // Pop
```

## The rules engine (the short version)

Full reasoning in `references/principles.md`. Apply in order; earlier wins.

1. **Purpose test.** Animate only to orient, give feedback, or show a relationship. Else cut it.
2. **Frequency governs intensity.** The more often it's seen — especially keyboard/pointer — the shorter and subtler. Over-animating the common path is the #1 mistake. Command menus, right-click, app switchers: instant or none.
3. **Continuity over teleport.** "We fly instead of teleport." Shared-element/layout transitions; animate *from the origin*; never duplicate a persistent element; morph text via shared letters (Continue→Confirm).
4. **Gesture law.** Respond 1:1 immediately (never 0→1). Trigger lightweight actions *during* the gesture, destructive/committing ones *on release*. Preserve momentum + angle. Always interruptible. Rubber-band at edges. (`references/gestures.md`)
5. **Spatial consistency.** Direction encodes space — forward and back move opposite; left/right tabs animate their direction.
6. **Springs for the physical, curves for the deterministic.** Spring = responsive/interruptible/momentum. Curve (ease-out) = one-shot. Linear = continuous only. (`references/easing.md`)
7. **Transform + opacity only.** GPU-composited. Never animate layout props. (`references/accessibility-perf.md`)
8. **Reduced motion is non-negotiable.** A calmer variant (crossfade/instant), never just "off" and never just "faster." (`references/accessibility-perf.md`)
9. **Boxes hug their content.** When content inside a container changes, the box springs to hug the new size (quick springy resize) and content scale-fades in place — never slide content sideways while the height jumps (it "shuffles"). Animate `height` directly, not via `layout`. (`references/principles.md` rule 9, `recipes-web.md` #14)

**On timing** — respond in **<100ms** (feels instant); routine transitions **~150–300ms**, large surfaces **400–500ms**; **exits faster than enters**; **>500ms** feels sluggish, **<~100ms travel** reads as a jump, not a transition. Full scale + per-interaction numbers + smooth-vs-snappy in `references/timing.md`.

## Reference map (load what you need)

- `references/principles.md` — the why; decision frameworks; the full rules engine + gesture laws.
- `references/spring-system.md` — the preset system, perceptual model, corrected physics, cross-platform mapping, custom `linear()` generator.
- `references/easing.md` — easing rules and verified curves for non-spring motion.
- `references/timing.md` — perceptual thresholds (100ms / Doherty 400ms / RAIL), the duration scale (instant→deliberate), per-interaction timing table, perceived-performance, smooth-vs-snappy, too-slow/too-fast.
- `references/gestures.md` — the five gesture laws as code (Motion + SwiftUI), momentum, thresholds.
- `references/recipes-web.md` — Motion + CSS/WAAPI recipes for every canonical interaction.
- `references/recipes-swiftui.md` — SwiftUI recipes, parameter-matched to the same presets.
- `references/review-checklist.md` — the critique rubric (blockers / smells / nits).
- `references/accessibility-perf.md` — reduced motion + performance, the two non-negotiables.
- `examples/gallery/` — runnable Vite + Motion gallery; the deterministic filmstrip harness that verified these presets.
- `SOURCES.md` — the three essays this is built on. Read them.

## The 10-second gut check

Before shipping any motion, ask:
1. `transform`/`opacity` only? 2. Interruptible? 3. Reduced-motion variant? 4. Intensity right for its frequency? 5. Connects the two states or just cuts?

Three or more "no"s → it needs work. When in doubt: **shorter, softer, more connected.**
