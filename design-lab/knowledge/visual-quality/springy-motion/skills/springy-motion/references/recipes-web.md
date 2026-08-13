# Web recipes (Motion + CSS/WAAPI)

Copy-paste recipes for the common springy moments on the web. Each names *when* to use it, the preset it maps to (`spring-system.md`), the Motion code, and the reduced-motion variant. Read `principles.md` first — it tells you *whether* to animate; this file is *how*.

All code uses **Motion** (`motion` / `motion/react`, the successor to Framer Motion). These recipes are the same components that run, verified, in `examples/gallery`.

## Setup

```bash
npm i motion
```
```ts
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'motion/react'
```

## Preset → Motion transition

Drive every spring by the perceptual `(duration, bounce)` via `visualDuration` (the designer-friendly knob — the bouncy tail happens after it). Numbers from `spring-system.md`.

```ts
const spring = {
  snap:   { type: 'spring', visualDuration: 0.2,  bounce: 0    },
  glide:  { type: 'spring', visualDuration: 0.5,  bounce: 0    },
  pop:    { type: 'spring', visualDuration: 0.4,  bounce: 0.4  },
  lively: { type: 'spring', visualDuration: 0.45, bounce: 0.5  },
  track:  { type: 'spring', visualDuration: 0.35, bounce: 0.18 },
} as const
```

> Motion picks a spring by default for transforms (`x`, `scale`, `rotate`) and a tween for `opacity`/`color`. You usually only need to set `transition` when you want a specific preset.

## The reduced-motion rule (applies to every recipe)

Read it once, gate the **kinetics**, keep the **feedback**:

```ts
const reduce = useReducedMotion()
// then: travel/scale/bounce only when !reduce; always keep the opacity/state change.
```
Or globally: `<MotionConfig reducedMotion="user"><App/></MotionConfig>` disables transform + layout animations while keeping opacity/color. See `accessibility-perf.md`.

---

## 1. Press feedback — Snap

**When:** buttons, cards, rows. The most frequent interaction, so keep it crisp and quiet. Scale down on press only.

```tsx
<motion.button
  className="btn"
  whileTap={reduce ? undefined : { scale: 0.96 }}
  transition={spring.snap}
>
  Press me
</motion.button>
```
Pure-CSS version: `button:active { transform: scale(0.96); transition: transform 120ms cubic-bezier(0,0,0.58,1); }`
**Reduced motion:** drop the scale; keep a color/opacity `:active` state — it's functional feedback.

## 2. Pop-in entrance — Pop

**When:** cards, badges, toasts appearing. **Never animate from `scale(0)`** — start at `0.93`. Pair scale with opacity.

```tsx
<AnimatePresence mode="popLayout">
  {items.map((it) => (
    <motion.span
      layout
      key={it.id}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      transition={spring.pop}
    >
      {it.label}
    </motion.span>
  ))}
</AnimatePresence>
```
For origin-aware growth (popover from its trigger) set `style={{ transformOrigin: 'top left' }}` toward the trigger. **Reduced motion:** opacity only.

## 3. Draggable sheet / drawer — Glide in, Track on drag

**When:** bottom sheets, drawers, trays. Enter with Glide; while dragging, bind 1:1 and dismiss on a far-enough or fast-enough release (vaul thresholds). See `gestures.md`.

```tsx
<motion.div
  className="sheet"
  initial={reduce ? { opacity: 0 } : { y: '100%' }}
  animate={reduce ? { opacity: 1 } : { y: 0 }}
  exit={reduce ? { opacity: 0 } : { y: '100%' }}
  transition={spring.glide}
  drag={reduce ? false : 'y'}
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={{ top: 0, bottom: 0.6 }}      // rubber-band only downward
  onDragEnd={(_, info) => {
    if (info.offset.y > 120 || info.velocity.y > 500) close()   // far OR fast
  }}
/>
```
**Reduced motion:** opacity in/out, drag disabled (keep a close button).

## 4. Shared-element morph — Glide/Pop

**When:** thumbnail → detail, list row → expanded card. The element *travels and transforms*; it is never duplicated (Family). Use `layoutId` on both the small and large element inside a `LayoutGroup`.

```tsx
<LayoutGroup>
  {items.map((s) => (
    <motion.button layoutId={`card-${s.id}`} key={s.id} onClick={() => setSel(s.id)} transition={spring.pop} />
  ))}

  <AnimatePresence>
    {sel && (
      <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSel(null)}>
        <motion.div layoutId={`card-${sel}`} className="detail" transition={spring.pop} />
      </motion.div>
    )}
  </AnimatePresence>
</LayoutGroup>
```
**Reduced motion:** crossfade old → new (dissolve), no positional travel.

## 5. Text morph — Snap (Continue → Confirm)

**When:** a meaningful label change you want the user to register (Family's Continue→Confirm). Keep the shared prefix fixed, morph the rest.

```tsx
<button className="morph">
  <span>Con</span>
  <span className="swap">
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={confirm ? 'firm' : 'tinue'}
        initial={{ y: '0.9em', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '-0.9em', opacity: 0 }}
        transition={spring.snap}
      >
        {confirm ? 'firm' : 'tinue'}
      </motion.span>
    </AnimatePresence>
  </span>
</button>
```
`.swap { display: inline-grid; overflow: hidden; }  .swap > span { grid-area: 1/1; }`
**Reduced motion:** hard swap or quick opacity crossfade.

## 6. Stagger — Pop/Glide

**When:** a list or grid reveals. Keep the per-item delay tight (≈40ms) so the cascade reads without becoming a wait.

```tsx
{items.map((it, i) => (
  <motion.div
    key={it.id}
    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ ...spring.pop, delay: reduce ? 0 : i * 0.04 }}
  />
))}
```
Or with the JS API: `stagger(0.04, { from: 'first' })`. **Reduced motion:** show all at once, single opacity fade, no per-item delay.

## 7. Direction-aware tabs — Snap pill + shared-axis (carousel) panel

**When:** segmented controls, tab bars, paged views. The indicator slides via `layoutId`; the panel does a **shared-axis (X)** transition — the old panel slides fully *out* one side while the new slides fully *in* from the other, like a carousel/"push" (Family: "fly, don't teleport"). Track the previous index to get direction.

> **Name the move.** A full-width slide with no fade is a **shared-axis transition** (Material's term; the X-axis variant). iOS calls a forward nav a **push**; generically it's a **slide/carousel**. Don't confuse it with a **fade-through** (cross-fade with a tiny offset) — that's the subtler sibling for unrelated content. For tabs you want the slide.

The panels are `position: absolute; inset: 0` inside an `overflow: hidden` wrap, so they travel the full width and get clipped:
```tsx
const select = (next) => { setDir(next > i ? 1 : -1); setI(next) }

{idx === i && <motion.span layoutId="pill" className="pill" transition={spring.snap} />}

<div style={{ position: 'relative', overflow: 'hidden', height: 64 }}>
  <AnimatePresence mode="popLayout" initial={false} custom={dir}>
    <motion.div key={i} custom={dir} style={{ position: 'absolute', inset: 0 }}
      variants={{
        enter:  (d) => ({ x: d > 0 ? '100%' : '-100%' }), // new comes from the side you're heading
        center: { x: '0%' },
        exit:   (d) => ({ x: d > 0 ? '-100%' : '100%' }), // old leaves the opposite side
      }}
      initial="enter" animate="center" exit="exit"
      transition={{ type: 'spring', visualDuration: 0.42, bounce: 0 }} // clean slide, no overshoot
    />
  </AnimatePresence>
</div>
```
No `opacity` change — it's a pure slide. **Reduced motion:** swap to an `opacity` fade (no x); the pill jumps.

## 8. Swipe-to-dismiss with momentum — Track

**When:** dismissable cards, toasts, notifications. 1:1 drag, commit on release past a distance OR velocity threshold (destructive → on release, never mid-gesture). See `gestures.md`.

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.5}
  onDragEnd={(_, info) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) dismiss()
  }}
  whileDrag={{ cursor: 'grabbing' }}
/>
```
**Reduced motion:** a visible dismiss button; no fling, instant remove.

## 9. Rubber-band overscroll — Track

**When:** the end of a scroll/drag region. Resist past the bound, snap back. `dragElastic` is the rubber-band; the spring-back is Track.

```tsx
<motion.div drag="y" dragConstraints={{ top: -200, bottom: 0 }} dragElastic={0.5} dragTransition={{ power: 0.8, timeConstant: 700 }} />
```
**Reduced motion:** hard clamp at the boundary, no elastic.

## 10. Number ticker — Snap (tabular)

**When:** counters, prices, stats. Use **`font-variant-numeric: tabular-nums`** so digits don't shift. `bounce: 0` — never bounce a number that means money.

```tsx
<span className="ticker">  {/* .ticker { font-variant-numeric: tabular-nums; display:grid; overflow:hidden } */}
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span key={value} grid-area="1/1"
      initial={{ y: '0.8em', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-0.8em', opacity: 0 }}
      transition={spring.snap}>
      {value}
    </motion.span>
  </AnimatePresence>
</span>
```
For a smooth count-up, drive a `useMotionValue` + `useTransform(v => Math.round(v))`. **Reduced motion:** set the final number instantly.

## 11. Hold-to-confirm — linear progress + Pop complete

**When:** a deliberate, destructive confirm. Progress fills with **`linear`** easing over the hold; completion is a Pop + a haptic-equivalent flash.

```tsx
<motion.div
  className="fill"
  initial={{ scaleX: 0 }}
  animate={{ scaleX: holding ? 1 : 0 }}
  transition={{ duration: holding ? 1.2 : 0.2, ease: 'linear' }}
  onAnimationComplete={() => holding && confirm()}
  style={{ transformOrigin: 'left' }}
/>
```
**Reduced motion:** require a press-and-hold without the animated fill, or a plain confirm button.

## 12. Success / confetti — Lively

**When:** a milestone (backup complete, payment sent). The delight peak — use sparingly (`principles.md` rule 2).

```tsx
<AnimatePresence>
  {done && (
    <motion.div className="check"
      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
      transition={spring.lively}>✓</motion.div>
  )}
</AnimatePresence>
```
**Reduced motion:** a static success icon + color change; no particles, no bounce.

## 13. Skeleton shimmer — linear, continuous

**When:** loading placeholders. A `linear` looped sheen (~1.2–1.5s).

```css
.skeleton { background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%); background-size: 400% 100%; animation: shimmer 1.4s linear infinite; }
@keyframes shimmer { to { background-position: -400% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }   /* stop it — continuous motion is what reduced-motion targets */
```

## 14. Resizable panel — box hugs its content (Glide/Pop)

**When:** a container's content swaps and the container must change size — multi-step flows, expanding cards, a panel switching views. The box springs to hug the new content; the content does a quick scale-fade *in place* (`principles.md` rule 9). Do **not** slide content sideways while the height jumps — that shuffles.

Animate `height` **directly** (measured), not via Motion `layout` — `layout` scale-corrects children and warps them mid-resize.

```tsx
function ResizablePanel({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  // measure the new content before paint, so the box springs to hug it
  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight)
  }, [activeKey])

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.36, bounce: 0.2 }}
      style={{ overflow: 'hidden' }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          ref={ref}
          key={activeKey}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={reduce ? { duration: 0.16 } : { type: 'spring', visualDuration: 0.3, bounce: 0.08 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
```

`popLayout` pulls the exiting view out of flow so the box reflows to the *new* content immediately, and `offsetHeight` ignores the entering view's `scale`, so the measurement is correct. The box bounce (`0.2`) makes it "grab" the new size. **Reduced motion:** instant height, opacity-only swap. (This is exactly what the Send-flow showpiece in `examples/gallery` uses.)

---

## 15. Proximity dock — magnify by cursor distance (not hover)

**When:** docks, toolbars, tab bars, emoji rows — anywhere a row of items should focus around the pointer. Respond to *distance*, not binary hover (`principles.md`). The `useSpring` is what separates "alive" from "twitchy."

```tsx
import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

function DockItem({ mouseX, children }) {
  const ref = useRef<HTMLButtonElement>(null) // fixed-size box (e.g. 52px in CSS)
  const dist = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect()
    return b ? x - (b.x + b.width / 2) : 9999
  })
  // Magnify with SCALE (a transform), NOT width/height. Width/height reflows the row
  // and resizes the tray → the background "canvas" jiggles. Scale leaves layout
  // untouched: the tray is rock-static and tiles rise above it (overflow: visible).
  const target = useTransform(dist, [-150, 0, 150], [1, 1.6, 1]) // triangular falloff, 150px reach
  const scale = useSpring(target, { stiffness: 380, damping: 28, mass: 0.6 }) // smooth, alive
  const y = useTransform(scale, [1, 1.6], [0, -6])       // lift the big ones
  const opacity = useTransform(scale, [1, 1.6], [0.6, 1]) // dim the far ones
  return <motion.button ref={ref} style={{ scale, y, opacity, transformOrigin: 'bottom center' }}>{children}</motion.button>
}

function Dock({ items }) {
  const mouseX = useMotionValue(Infinity) // Infinity = "cursor nowhere near" → all at rest
  const [active, setActive] = useState(false)
  return (
    <motion.div
      animate={{ scale: active ? 1.06 : 1 }} // ONE scale on hover-enter; the dock "wakes up", then holds
      transition={{ type: 'spring', visualDuration: 0.32, bounce: 0.22 }}
      style={{ transformOrigin: 'bottom center', overflow: 'visible' }}
      onPointerEnter={() => setActive(true)}
      onPointerMove={(e) => mouseX.set(e.clientX)}
      onPointerLeave={() => { setActive(false); mouseX.set(Infinity) }}
    >
      {items.map((it) => <DockItem key={it.id} mouseX={mouseX}>{it.node}</DockItem>)}
    </motion.div>
  )
}
```
The tray sizes to the **fixed** tile boxes. It may scale up **once** on hover-enter (a single state change — the dock "wakes up", then holds), but it must **never resize per cursor-move**. Set `overflow: visible` so magnified tiles rise above it, and `transform-origin: bottom` so they grow up out of the dock. **Never animate a tile's `width`/`height` here** — that reflows the row, resizes the background surface, and makes the whole dock jiggle up and down as the cursor moves. Magnify is a `scale` transform; the surface either holds or changes once. (A label tooltip on the nearest tile wants `scale: 1/scale` so it stays crisp.) **Reduced motion:** skip the `onPointerMove` update (no magnify) — a plain row.

**No overlap — push the tiles apart.** Scaling a tile in place collides it with its neighbors. Give each tile an `x` push too, equal to the cumulative growth of the tiles between it and the cursor. Lay the *scaled* widths out, anchor the point under the cursor, and offset each tile from its base position — layout boxes never move (surface stays static), only the transform fans them out:
```ts
const scaleAt = (cp, i) => 1 + Math.max(0, 1 - Math.abs(i*PITCH + BASE/2 - cp) / FALLOFF) * (MAX - 1)
// each tile's x = (ideal center in a scaled-width layout, anchored at cursor) − (base center)
const xOf = (cp, index) => {
  const w = (i) => BASE * scaleAt(cp, i)
  const left = []; let e = 0
  for (let i = 0; i < COUNT; i++) { left[i] = e; e += w(i) + GAP }
  const k = Math.min(COUNT - 1, Math.max(0, Math.floor(cp / PITCH)))
  const shift = cp - (left[k] + Math.min(1, Math.max(0, (cp - k*PITCH)/BASE)) * w(k)) // keep cursor point fixed
  return (left[index] + w(index)/2 + shift) - (index*PITCH + BASE/2)
}
```
Drive `scale` and `x` (both `useSpring`) off `mouseX` per tile. `width`-based layout fans them apart too but reflows/jiggles the surface; scaling-in-place keeps the surface static but overlaps — **scale + translate-push is the only thing that gets both** (`principles.md`, full impl in `examples/gallery` ProximityCompare).

## 16. Animate the hierarchy, not just the layer

**When:** any group reveal (a list, a card grid, a panel of rows). Stagger the **structure**, then the **detail** — don't slide one container in as a block (`principles.md`).

```tsx
{cards.map((card, i) => (
  <motion.div key={card.id}
    initial={{ opacity: 0, x: 120 }} animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: i * 0.07 }}>   {/* structure first */}
    <Icon />
    <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.22 + i * 0.13 }}>{card.title}</motion.h3> {/* detail, 2nd stagger */}
    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.30 + i * 0.13 }}>{card.sub}</motion.p>
  </motion.div>
))}
```
The cards land on a tight stagger (~70ms); their text fades in on a *second, longer* stagger so the eye reads cards → words. `ease-out-expo` `(0.23, 1, 0.32, 1)` gives an elegant decelerate. **Reduced motion:** opacity only, no x, no stagger.

## 17. Textareas that grow with content — `field-sizing`

**When:** comment boxes, message composers, any multi-line input. Let the field hug its text instead of nesting a scrollbar — smoother to write in, keeps the form scannable. No JS height-syncing.

```css
textarea { field-sizing: content; min-height: 2.9em; max-height: 200px; }
```
The field sizes to its content, then scrolls only past the max. Support: Chromium 123+, Safari TP; Firefox behind a flag — degrades to a normal fixed textarea, so it's safe to ship today.

---

## Morphing & resizing — the Motion `layout` pitfalls

Motion `layout` / `layoutId` animate size and position by applying **scale transforms** and counter-scaling children. Perfect for moving a box between positions — but it has sharp edges. Three rules, learned the hard way building the showcases:

**1. Shape/size morph → animate the dimensions DIRECTLY, not `layout` + `style`.**
Setting `width`/`height`/`borderRadius` in `style` *and* putting `layout` on the same element makes the two fight: the box scale-distorts its corners and "snaps" instead of growing smoothly. For a pill that morphs shape (a Dynamic-Island container, an expanding card):
```tsx
// ✅ a true box-grow with crisp corners
<motion.div animate={{ width, height, borderRadius }} transition={{ type: 'spring', visualDuration: 0.42, bounce: 0.16 }} />
// ❌ janky, distorted corners
<motion.div layout style={{ width, height, borderRadius }} />
```
Yes, animating `width`/`height` isn't GPU-composited — but for one small morphing surface it's correct and looks right, where `layout` looks broken. (Open a container *downward*: make its stage top-anchored, then growing the height reveals downward.)

**2. Never put `layoutId` AND `animate={{ x, y, scale }}` on the same element.**
Both try to own position — they fight and the transition glitches. Use one. If you compute target `x/y/scale` yourself (e.g. cards in a stack moving between stacked/fanned/selected layouts), use `animate` and **drop the `layoutId`**.

**3. Persistent content → anchor and reveal, don't reposition.** (`principles.md` rule 3)
If an element is on screen before *and* after a transition in the same place, don't make it a traveling shared element. Keep it one stationary element and reveal the new content around it — open a player downward with the album art fixed top-left, rather than morphing the art into a "new" spot. The faux-travel (moving/scaling to roughly where it already is) is what reads as jumpy.

**4. In-place icon/label swaps → shared grid cell, not `popLayout`/`wait`.**
To crossfade an icon or label *in place* (play↔pause, a morphing button label), stack both in one grid cell and crossfade — don't use `mode="popLayout"` (pops the exiting node to the corner) or `mode="wait"` (blank gap between out and in):
```tsx
// parent: display:grid; place-items:center
<AnimatePresence initial={false}>
  <motion.svg key={playing ? 'pause' : 'play'} style={{ gridArea: '1 / 1' }}
    initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
    transition={spring.snap} />
</AnimatePresence>
```

**5. Hover: lift with transform, shadow with CSS.**
Animate the lift in Motion (`whileHover={{ y: -2 }}`), but put any shadow change on CSS `:hover` with a `transition`. Motion reverting a `boxShadow` string to the CSS base on un-hover flickers like a glow switching off — and big glows read as harsh. Keep hover subtle: a small lift, never a glow.

**6. Progressive reveal reads smoother than crossfade-out.**
When swapping panel content, prefer revealing the *new* content (scale-up `0.94 → 1` + a small directional slide-in, on a spring) over fading the *old* out. The eye follows the arriving thing; a symmetric crossfade-and-slide "shuffles." (Rule 9's "set box, progressive content" — the direction-aware tabs in `examples/gallery` use it.)

**For a box that hugs changing content,** animate its `height` directly (recipe #14) — not `layout`, same reason as rule 1.

---

## CSS-only springs (no Motion)

When you can't add a JS dep, use the generated `linear()` springs from `spring-system.md`:

```css
.pop-in {
  transition: transform 640ms linear(0,0.094,0.303,0.540,0.752,0.914,1.020,1.076,1.094,1.089,1.070,1.048,1.027,1.011,1.000,0.993,0.991,0.991,0.993,0.995,0.997,1);
}
/* enter/exit without JS: @starting-style + transition-behavior: allow-discrete — see the KB / accessibility-perf.md */
```
For WAAPI: `el.animate(keyframes, { duration: 640, easing: 'linear(…)' , fill: 'both' })`. CSS/WAAPI cannot carry gesture velocity — never use them for the *active* part of a drag (use Track via Motion). See `gestures.md`.
