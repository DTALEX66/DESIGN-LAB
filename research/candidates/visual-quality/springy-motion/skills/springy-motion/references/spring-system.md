# The spring system — one intent, every platform

The core idea of this skill: **stop thinking in stiffness / damping / mass. Think in `duration` + `bounce`** — how long the motion *feels* and how much it *overshoots*. Those two perceptual numbers are portable: the same `(duration, bounce)` drives Motion (web), SwiftUI (native), and a CSS `linear()` approximation, and means the same thing on each.

This is also how the platforms themselves think now — SwiftUI's `Spring(duration:bounce:)` and Motion's `{ visualDuration, bounce }` both take exactly these two knobs.

---

## The two knobs

- **`duration`** (seconds) — the *perceptual* length: how long until the element looks like it has arrived. Not the full settle (a spring's tiny tail decays for longer); the part you feel.
- **`bounce`** (0…1 for this system) — overshoot. `0` = critically damped, no overshoot, just a soft stop. Higher = more overshoot and oscillation. `bounce = 1 − dampingRatio`.

That's it. Everything else (stiffness, damping, mass) is *derived*.

### bounce → how much overshoot, really

`bounce` is subtler than it sounds, because overshoot falls off fast as damping rises:

| bounce | dampingRatio ζ | actual peak overshoot |
|---|---|---|
| 0 | 1.00 | 0% (critically damped) |
| 0.18 | 0.82 | ~1% |
| 0.3 | 0.70 | ~4.6% (= SwiftUI `.bouncy`) |
| 0.4 | 0.60 | ~9.5% |
| 0.5 | 0.50 | ~16% |
| 0.6 | 0.40 | ~25% |

So a "satisfying pop" lives around `bounce 0.4`, not `0.2`. SwiftUI's named springs are deliberately restrained (`.snappy` = 0.15, `.bouncy` = 0.3). Don't go past ~0.55 for UI — it starts to feel like a toy.

---

## The five presets

Pick by **frequency and input** (see `principles.md` rule 2): the more often the user sees it — and the more it's keyboard/pointer-driven — the less motion it should carry.

| Preset | duration | bounce | overshoot | feel | use |
|---|---|---|---|---|---|
| **Snap** | 0.2 | 0 | 0% | instant, crisp | press, toggle, selection, high-frequency / keyboard |
| **Glide** | 0.5 | 0 | 0% | smooth, calm | sheets, routes, modals — the default A→B |
| **Pop** | 0.4 | 0.4 | ~9% | satisfying overshoot | pop-in entrances, success, confirm — default delight |
| **Lively** | 0.45 | 0.5 | ~16% | playful bounce | confetti, FAB, onboarding — the delight peak (rare) |
| **Track** | 0.35 | 0.18 | ~1% | finger-tight settle | release-settle for drags, sheets, swipe-to-dismiss |

These numbers are not guesses — they were generated from the physics below and tuned by eye in the gallery (`examples/gallery`) using deterministic filmstrips. Treat them as the house defaults; deviate when a specific moment calls for it.

### Per-preset, all three platforms

Each block is the *same spring* expressed three ways. The derived physics (`mass 1`) are given so you can hand them to any engine.

#### Snap — `duration 0.2, bounce 0` · derived `stiffness 987, damping 62.8` · settle ~300ms
```ts
// Motion (web)
transition={{ type: 'spring', visualDuration: 0.2, bounce: 0 }}
// or, since there's no overshoot, a tween is fine and cheaper:
transition={{ duration: 0.18, ease: [0, 0, 0.58, 1] }}  // ease-out
```
```swift
// SwiftUI
.snappy(duration: 0.2, extraBounce: 0)   // or .spring(duration: 0.2, bounce: 0)
```
```css
/* CSS — play over the settle duration */
transition: transform 300ms linear(0,0.075,0.227,0.390,0.536,0.656,0.750,0.821,0.873,0.911,0.938,0.957,0.971,0.980,0.986,0.991,0.994,0.996,0.997,0.998,0.999,1);
```

#### Glide — `duration 0.5, bounce 0` · derived `stiffness 158, damping 25.1` · settle ~650ms
```ts
transition={{ type: 'spring', visualDuration: 0.5, bounce: 0 }}
```
```swift
.smooth(duration: 0.5)   // .smooth has base bounce 0
```
```css
transition: transform 650ms linear(0,0.059,0.183,0.325,0.461,0.579,0.677,0.755,0.817,0.864,0.900,0.927,0.947,0.961,0.972,0.980,0.986,0.990,0.993,0.995,0.996,1);
/* fallback if you don't want linear(): cubic-bezier(0.32, 0.72, 0, 1)  — the vaul drawer curve */
```

#### Pop — `duration 0.4, bounce 0.4` · derived `stiffness 247, damping 18.8` · settle ~640ms
```ts
transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.4 }}
```
```swift
.spring(duration: 0.4, bounce: 0.4)   // ≈ .bouncy(duration: 0.4, extraBounce: 0.1)
```
```css
transition: transform 640ms linear(0,0.094,0.303,0.540,0.752,0.914,1.020,1.076,1.094,1.089,1.070,1.048,1.027,1.011,1.000,0.993,0.991,0.991,0.993,0.995,0.997,1);
/* fallback: cubic-bezier(0.34, 1.56, 0.64, 1)  — ease-out-back, ~10% overshoot */
```

#### Lively — `duration 0.45, bounce 0.5` · derived `stiffness 195, damping 14` · settle ~720ms
```ts
transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.5 }}
```
```swift
.spring(duration: 0.45, bounce: 0.5)   // ≈ .bouncy(duration: 0.45, extraBounce: 0.2)
```
```css
transition: transform 720ms linear(0,0.096,0.315,0.573,0.809,0.989,1.103,1.155,1.160,1.135,1.095,1.054,1.019,0.993,0.979,0.974,0.975,0.980,0.987,0.994,0.999,1);
/* no cubic-bezier equivalent — must use linear() for this much overshoot */
```

#### Track — `duration 0.35, bounce 0.18` · derived `stiffness 322, damping 29.4` · settle ~460ms
```ts
// during the gesture: bind 1:1 (useMotionValue / drag). on release:
transition={{ type: 'spring', visualDuration: 0.35, bounce: 0.18 }}
// throw with carried momentum:
dragTransition={{ power: 0.8, timeConstant: 700 }}  // Motion inertia defaults
```
```swift
// while dragging:
.interactiveSpring(response: 0.15, dampingFraction: 0.86)
// on release, seed with gesture velocity:
.spring(duration: 0.35, bounce: 0.18)
```
```css
/* CSS can express the release-settle only — it cannot carry gesture velocity */
transition: transform 460ms linear(0,0.062,0.199,0.361,0.518,0.654,0.764,0.849,0.910,0.952,0.980,0.997,1.006,1.010,1.011,1.010,1.009,1.007,1.005,1.004,1.003,1);
```

> **Track is special:** it's the only preset that must carry *velocity*. A flicked element keeps its speed and direction (`principles.md` gesture law C). CSS `linear()` is a static curve with no velocity transfer, so never use CSS for the *active* part of a drag — only for the release-settle, and prefer Motion/SwiftUI which hand off velocity automatically.

---

## The physics (and a correction worth knowing)

A spring is a damped harmonic oscillator: `m·x″ + c·x′ + k·x = 0`. With `mass = 1`, the perceptual model converts like this:

```
mass      = 1
stiffness = (2π / duration)²
damping   = 4π · (1 − bounce) / duration        // ζ = 1 − bounce, ω₀ = 2π/duration
```

Verify it against Apple's own published examples (this is how you know it's right):
- `Spring(duration: 0.5, bounce: 0.3)` → stiffness `(4π)² = 157.9`, damping `4π·0.7/0.5 = 17.6`. ✓ (Apple prints 157.9 / 17.6.)
- `Spring(mass: 1, stiffness: 100, damping: 10)` → duration `2π/√100 = 0.63`, bounce `1 − 10/(2√100) = 0.5`. ✓ (Apple prints 0.63 / 0.5.)

> **Correction:** some transcripts of WWDC23 "Animate with springs" circulate a damping formula `1 − 4π·bounce/duration`. That is garbled — it produces negative damping for ordinary bounce values and does **not** reproduce Apple's worked numbers. The correct, verified formula is `damping = 4π·(1 − bounce)/duration`. This skill uses the correct one.

### `duration` semantics, honestly

There are three subtly different "durations" in the wild, and pretending they're identical is how cross-platform motion drifts:
- **Apple `Spring(duration:)`** = the natural period `2π/ω₀`.
- **Motion `visualDuration`** = time to *visually* arrive (the bouncy tail happens after).
- **Motion `duration`** = time to *fully settle* (the long tail included).

For this system, `duration` means the **perceptual arrival**. Motion's `visualDuration` maps to it directly. SwiftUI's `.spring(duration:)` is the natural period, which is very close in feel for low bounce and is the idiomatic API, so we use it. The CSS `linear()` is generated from the derived physics and played over the computed *settle* time, so its visible arrival lands at roughly `duration`. These are **feel-calibrated, not bit-identical** — when you need three platforms pixel-locked, pass the derived `stiffness`/`damping`/`mass` to all three (Motion accepts them directly).

---

## Generating a custom spring `linear()`

When a preset doesn't fit, generate your own. Sample the damped oscillator and emit each point as a `linear()` stop (algorithm verified against `okikio/spring-easing`):

```js
function springLinear(duration, bounce, points = 24) {
  const mass = 1
  const w0 = (2 * Math.PI) / duration            // natural frequency
  const k = w0 * w0                              // stiffness
  const zeta = 1 - bounce                        // damping ratio
  const wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0
  const b = zeta < 1 ? (zeta * w0) / wd : w0
  const value = (t) => {
    const p = zeta < 1
      ? Math.exp(-t * zeta * w0) * (Math.cos(wd * t) + b * Math.sin(wd * t))
      : (1 + b * t) * Math.exp(-t * w0)
    return 1 - p                                 // 0 → 1 progress
  }
  // settle: within 0.5% for 8 steps (perceptual, trims the dead tail)
  const dt = 1 / 120
  let t = 0, rest = 0, settle = duration * 3
  for (let i = 0; i < 4000; i++) {
    t += dt
    if (Math.abs(1 - value(t)) < 0.005) { if (++rest >= 8) { settle = t; break } }
    else rest = 0
  }
  const stops = Array.from({ length: points }, (_, i) => value((i / (points - 1)) * settle))
  stops[0] = 0; stops[points - 1] = 1
  return { easing: `linear(${stops.map((n) => n.toFixed(3)).join(',')})`, durationMs: Math.round(settle * 1000) }
}
```

Set the CSS/WAAPI `duration` to the returned `durationMs` and the `easing` to the returned string. More `points` = smoother but longer; 20–28 is plenty for UI. Tools: Jake Archibald's [Linear Easing Generator](https://linear-easing-generator.netlify.app/) and `okikio/spring-easing` do the same and can simplify the point list.

---

## When NOT to use a spring

- **Precision / numeric data** (financial charts, exact values): `bounce 0` or no animation. Overshoot on a number that means money is a lie. (`principles.md` rule, KB.)
- **Continuous/ambient** (spinners, marquees, shimmer): `linear` easing, not a spring.
- **Deterministic one-shots where physics adds nothing** (a progress bar filling): a tween with `ease-out` is fine.

Springs earn their cost when motion is *physical, interruptible, or responding to the user*. That's most of the interesting cases — but not all of them.
