# Easing — when you're not using a spring

Springs cover most of the interesting motion (see `spring-system.md`). This file is for the rest: deterministic, one-shot, or continuous moves where you reach for a fixed curve instead. The rules here are `principles.md` rules 1, 2, and 6, made concrete.

---

## Spring or curve?

Decide first. They are not interchangeable.

| Use a **spring** when… | Use a **curve** when… |
|---|---|
| motion responds to the user (press, drag, hover) | the move is deterministic and one-shot (a reveal, a fade) |
| it can be interrupted or re-targeted mid-flight | it runs start-to-finish, never interrupted |
| it carries momentum (a flick, a thrown sheet) | it's continuous/ambient (spinner, marquee, shimmer) |
| it should feel physical or alive | physics would add nothing (a progress bar filling) |

A spring carries velocity across interruptions; a curve is a static, pre-specified path with no velocity transfer. The moment a motion needs to feel hand-tracked or redirectable, leave this file and go to `spring-system.md` — pick `Snap`, `Glide`, `Pop`, `Lively`, or `Track`. For drags specifically, see `gestures.md`.

---

## The easing law

`ease-out` is the default. Everything else is an exception you justify.

| Curve | Use it for | Why |
|---|---|---|
| **ease-out** | anything responding to the user — entrances, taps, things appearing | starts fast (feels responsive), settles soft |
| **ease-in-out** | elements already on screen moving A→B | symmetric travel between two known points |
| **ease-in** | exits that *leave the screen* only | accelerating-away reads as "gone" |
| **linear** | spinners, marquees, continuous loops, hold-progress | constant rate is the point; any curve looks like a stutter |

Two hard rules:
- **Never bare `ease-in` for UI that stays.** It starts slow — reads as lag, like the app didn't hear you. Reserve it for things leaving.
- **Asymmetric beats symmetric.** A curve that accelerates and decelerates at *different* rates feels more alive than a mirror-image one. `ease-out` (slow tail, fast head) is asymmetric by design; that's why it's the default.

When in doubt: `ease-out`, short, done.

---

## Verified standard curves

The four CSS keywords, spec-exact (W3C css-easing-1). Endpoints are always fixed at `(0,0)→(1,1)`.

| Keyword | cubic-bezier |
|---|---|
| `ease` | `cubic-bezier(0.25, 0.1, 0.25, 1.0)` |
| `ease-in` | `cubic-bezier(0.42, 0, 1, 1)` |
| `ease-out` | `cubic-bezier(0, 0, 0.58, 1)` |
| `ease-in-out` | `cubic-bezier(0.42, 0, 0.58, 1)` |

### Named community curves

Not spec keywords — community curves, but authority-verified and worth keeping in the kit. Label them as such in code so the next person knows they're conventions, not built-ins.

| Name | cubic-bezier | Note |
|---|---|---|
| ease-out-expo | `cubic-bezier(0.16, 1, 0.3, 1)` | very fast head, long soft tail; punchy entrances |
| ease-out-back | `cubic-bezier(0.34, 1.56, 0.64, 1)` | ~10% overshoot via `y1 > 1` |
| vaul drawer | `cubic-bezier(0.32, 0.72, 0, 1)` | the one authority-authored curve; the `Glide` cubic-bezier fallback |
| Material standard | `cubic-bezier(0.4, 0, 0.2, 1)` | Material's everyday standard curve |

`ease-out-back` and the `vaul` curve are also the cubic-bezier fallbacks for `Pop` and `Glide` in `spring-system.md` — use them when you can't emit a `linear()`.

---

## cubic-bezier limits — and where it breaks

`cubic-bezier(x1, y1, x2, y2)`:
- **`x1`, `x2` must be in `0..1`** — outside that range is invalid and the rule is dropped.
- **`y1`, `y2` are unrestricted.** `y > 1` overshoots; `y < 0` anticipates (pulls back before moving). That's how `ease-out-back` gets its overshoot.

The ceiling: a single cubic-bezier **cannot oscillate**. It can overshoot *once* (one hump) but can't come back down and bounce again. For real spring overshoot — multiple settles, a true bounce — use `linear()`, not cubic-bezier. See `spring-system.md` for generating one from `(duration, bounce)`.

---

## Motion easing constants

If you're on Motion (web), these are the built-in easing names (`motion.dev/docs/easing-functions`):

```
linear
easeIn, easeOut, easeInOut
circIn, circOut, circInOut
backIn, backOut, backInOut
anticipate
steps
cubicBezier
```

Custom curve, two ways:
```ts
ease: [0.16, 1, 0.3, 1]              // bare array = cubic-bezier control points
ease: cubicBezier(0.16, 1, 0.3, 1)  // helper form, same thing
```

There are **no named spring presets** in Motion (`"gentle"`/`"wobbly"` are a react-spring thing). For springs, drive `bounce` + `visualDuration` — see `spring-system.md`.

---

## Duration guidance

Keep UI easing animations **≤ ~300ms**. Past that, a non-physical curve starts to feel like waiting. `ease-out` entrances in this range feel responsive; the longer ones feel sluggish.

The per-element numbers below are community starting points `[UNVERIFIED]` — tune them by eye, don't treat them as law:

| Element | Starting point | Curve |
|---|---|---|
| Button hover | ~200ms | ease-out |
| Button press | ~120–150ms | ease-out |
| Modal in | ~250–300ms | ease-out |
| Tooltip | ~100ms | ease-out |

And remember `principles.md` rule 2: the more often a user sees a motion, the shorter it gets. A press at 130ms that fires fifty times an hour should never creep toward 300ms. Start from the table, then cut.
