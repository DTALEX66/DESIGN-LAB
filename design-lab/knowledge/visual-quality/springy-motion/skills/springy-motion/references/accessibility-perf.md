# Accessibility & performance — the two non-negotiables

Reduced motion and 60fps are not polish passes. They are the floor. A recipe that drops frames or ignores Reduce Motion is broken, no matter how good the spring feels on your machine. This file is the gate every recipe in this skill ships through. Read `principles.md` rules 4, 6, 8, and 33 first — this is their enforcement layer.

---

## Reduced motion is non-negotiable

Honor `prefers-reduced-motion` / Reduce Motion. Not optional, not "later."

The reduced variant is the part people get wrong. It is **a calmer version**, not nothing and not just faster.

| Wrong reduced variant | Why it's wrong |
|---|---|
| Same motion, shorter duration | Still travels, scales, bounces — it's the kinetics that trigger people, not the clock |
| Nothing happens, instant cut | Kills feedback and continuity — user loses *where did that go* and *what did I just do* |
| In-app toggle only | The OS setting already states intent — mirror it; don't make people set it twice |

The reduced variant keeps **feedback and continuity** and drops only the **kinetics**. Travel/scale/spring becomes crossfade, instant change, or dissolve. The user still learns what happened and what's related — they just don't get thrown around.

**First to disable, in order:**

| Priority | Category | Examples |
|---|---|---|
| 1 | Continuous / looping | shimmer, spinners, marquees, pulsing, parallax loops |
| 2 | Large positional / zoom / depth | shared-element transitions, sheets, full-screen zoom, parallax, 3D tilt |
| 3 | Everything else | small fades, color, opacity — usually fine to keep |

Mirror the OS setting. Never ship a reduced experience that only an in-app toggle reaches — the system preference is the source of truth.

---

## Per-platform: read the setting, swap the variant

Same intent, three platforms. Each reads the OS preference and substitutes a calmer variant — it does not just stop.

### CSS — `@media (prefers-reduced-motion: reduce)`

Values are `no-preference` / `reduce`; a bare `(prefers-reduced-motion)` query means `reduce`. Baseline since Jan 2020 — safe to rely on everywhere.

```css
.sheet {
  transition: transform 650ms linear(/* Glide */);
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition: opacity 150ms ease;  /* crossfade in place — no travel */
    transform: none;
  }
}
```

Keep the opacity transition so the change still registers. Drop the `transform`.

### Motion (web) — `useReducedMotion()` + `<MotionConfig>`

`useReducedMotion()` returns a reactive `boolean`. Swap to opacity-only variants by hand:

```jsx
const reduce = useReducedMotion()
return <motion.div animate={{ x: reduce ? 0 : 100, opacity: 1 }} />
```

Or gate the whole tree with `<MotionConfig reducedMotion="user">`:

```jsx
<MotionConfig reducedMotion="user"><App /></MotionConfig>
```

`reducedMotion` defaults to `"never"`. Options: `"user"` (follow the OS), `"always"`, `"never"`. When active, Motion does exactly the right thing: *"transform and layout animations will be disabled. Other animations, like opacity and backgroundColor, will persist."* That's the calmer-not-nothing rule, built in — your fades and color changes survive, your travel and layout moves stop.

Set `reducedMotion="user"` at the app root. Reach for per-component `useReducedMotion()` only when you need a bespoke reduced variant (a specific dissolve, a different crossfade target).

### SwiftUI — `@Environment(\.accessibilityReduceMotion)`

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion  // Bool, iOS 13+

withAnimation(reduceMotion ? nil : .spring(duration: 0.4, bounce: 0.4)) {
    isPresented = true
}
```

`reduceMotion` is `true` when system Reduce Motion is on. Gate the large/3D-simulating animations: pass `nil` to `withAnimation` (instant) or substitute a crossfade. Keep the state change either way — the sheet still presents, it just doesn't fly.

---

## Performance: animate transform and opacity, nothing else

Two properties skip **both layout and paint** and composite on the GPU: **`transform`** and **`opacity`**. These are the only zero-cost tier. Default to them.

**The forbidden list — these force layout every frame:**

`width` · `height` · `top` · `left` · `right` · `bottom` · `margin` · `padding`

Animating any of these thrashes layout on every frame and janks. Need a size change? Animate `transform: scale()`. Need to move? Animate `transform: translate()`. Never animate the geometry properties directly.

**The one exception:** a *single small surface morphing its box shape* — a Dynamic-Island-style pill, an expanding card, a panel that hugs its content — may animate `width`/`height`/`borderRadius` directly. There, scale (`layout`/`transform`) visibly distorts the corners and content, so a direct dimension animation is the *correct, better-looking* choice, and the cost (one element, occasionally) is negligible. This is **not** a license to animate `width`/`height` on lists, large surfaces, or anything a `transform` could move/resize. See `recipes-web.md` → Morphing & resizing.

**The middle tier — compositor-capable but can still paint:**

`filter` · `clip-path` · `mask`

These can run on the compositor but may still trigger paint — they are **not** the zero-cost tier. Fine for reveals and one-shot effects. Budget for low-end devices; profile before using them in anything continuous or in a list.

| Tier | Properties | Verdict |
|---|---|---|
| Free | `transform`, `opacity` | Default to these. Skip layout and paint. |
| Budgeted | `filter`, `clip-path`, `mask` | OK for reveals; can paint; test on low-end |
| Forbidden | `width/height/top/left/right/bottom/margin/padding` | Forces layout. Never animate. |

---

## `will-change`: last resort, just-in-time

MDN is blunt: `will-change` is a *"last resort… should not be used to anticipate performance problems."* It is not a speed boost you sprinkle on everything.

Set it **just before** animating and reset it the moment you're done — on enter or gesture-start, back to `auto` on `animationend`:

```js
el.addEventListener('mouseenter', () => el.style.willChange = 'transform, opacity');
el.addEventListener('animationend', () => el.style.willChange = 'auto');
```

Static `will-change` (left on in CSS or set once and never cleared) **wastes memory** and **can create a stacking context** — which silently breaks `z-index` layering and overlap you didn't expect. Apply it dynamically, valid values `auto | scroll-position | contents | <custom-ident>`. If you can't point to a measured jank it fixes, don't add it.

---

## Reduce backdrop-blur during fast scroll

`backdrop-filter: blur()` is one of the most expensive things you can composite, and it's recomputed every frame the content behind it moves. A heavy blur on a sticky nav *during a fast scroll* both tanks the GPU and **destroys perceived smoothness** (the blur smears the motion). Drop the blur while scrolling, restore it once the scroll settles:

```js
let idle
const nav = document.querySelector('.navbar')
window.addEventListener('scroll', () => {
  nav.style.backdropFilter = 'blur(8px)'        // light blur while moving
  clearTimeout(idle)
  idle = setTimeout(() => { nav.style.backdropFilter = 'blur(24px)' }, 120) // restore when settled
}, { passive: true })
```

Same idea applies to any heavy effect *during* motion (large shadows, big blurs, complex filters): lighten it while things move, restore on idle. Keep the scroll listener `passive` so it never blocks scrolling.

---

## 60fps is the floor

Jank is not a cosmetic defect. A dropped frame reads as *"this app doesn't understand me"* — the motion stutters exactly when the user is paying attention, and trust drops with it. 60fps (16.6ms/frame) is the minimum, not the target. If a recipe can't hold 60fps on the devices you ship to, cut the effect before you ship the stutter. Profile on real low-end hardware, not your dev machine.

---

## Reduced-motion variant checklist

Every recipe passes all of these before it's done:

- [ ] Reads the OS setting — `@media (prefers-reduced-motion: reduce)`, `useReducedMotion()` / `<MotionConfig reducedMotion="user">`, or `@Environment(\.accessibilityReduceMotion)`. Never an in-app-only toggle.
- [ ] Reduced variant is **calmer, not gone** — crossfade / instant / dissolve. Feedback and continuity survive.
- [ ] Continuous and looping motion (shimmer, spinners, parallax) is disabled first.
- [ ] Large positional / zoom / depth moves (shared-element, sheets, parallax) drop their travel; opacity and color persist.
- [ ] Animates only `transform` + `opacity` in the hot path. No forbidden layout props.
- [ ] `filter` / `clip-path` / `mask` (if used) are budgeted and tested on low-end.
- [ ] `will-change` is set just-in-time and reset to `auto` on `animationend` — never left static.
- [ ] Holds 60fps on the lowest-end target device, profiled — not assumed.

If any box is unchecked, you're not done. See `review-checklist.md` for the full ship gate and `spring-system.md` for the presets (Snap, Glide, Pop, Lively, Track) these variants reduce from.
