---
name: motion-design
description: Pick easings, durations, stagger, and page-transition recipes for UI motion; auto-activates on `/motion` and motion-related edits across React/Vue/Svelte stacks.
type: skill
---

# Motion Design

Tasteful motion = imperceptible-when-needed, expressive-when-warranted. Defaults below come from `tokens.css` written by `/design init`.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## Library defaults (per stack)

Spec-locked defaults. Alternates noted, do not switch without explicit user request.

| Stack | Default | Alternate |
|---|---|---|
| React | Framer Motion | Motion (Matt Perry fork) — listed in spec section 11 as a build-time decision |
| Vanilla / non-React | Motion One | — |
| Heavy timelines, scrollytelling | GSAP | — |
| Vue / Svelte / Nuxt | native transitions + `tokens.css` | Motion One when complex |

Never introduce a motion library if one is already present in `package.json`. Stack-respect (rule 7).

---

## Duration ladder

All durations are tokens. Never write a raw `ms` literal.

| Token | Value | Use |
|---|---|---|
| `--dur-150` | 150 ms | Micro: tooltip, color flash, focus ring |
| `--dur-200` | 200 ms | Hover, exit transitions, small toggles |
| `--dur-300` | 300 ms | Layout shifts, drawer/popover, dialog |
| `--dur-600` | 600 ms | Entrance, hero reveal, page fade |

Above 600 ms is reserved for orchestrated sequences (`/scene`, scroll-driven). Never put > 600 ms on a click response.

---

## Easing curves

Tokens, not hand-typed cubic-béziers.

| Token | Curve | Use |
|---|---|---|
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrance, hover-in, layout grow |
| `--ease-in-out-cubic` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetrical transitions, drawers |
| `--ease-spring` | spring (stiffness 300, damping 30) | Layout, drag-release, success bounce |
| `linear` | linear | Progress bars, scrubbing only |

Never use bare `ease`, `ease-in`, `ease-out` defaults — they are ugly. Never use `ease-in` alone on entrance (feels stuck).

---

## Default recipes

From spec section 6.6.

| Event | Duration | Easing |
|---|---|---|
| Hover | 200 ms | ease-out-quint |
| Active / press | 100 ms | ease-out-quint |
| Layout shift | 300 ms | spring |
| Entrance | 600 ms | ease-out-quint, with stagger |
| Exit | 200 ms | ease-in-cubic |
| Page transition | 300 ms in / 200 ms out | ease-in-out-cubic |

---

## Stagger patterns

Stagger reveals natural reading order. Children: 40–80 ms apart. Cap total at ~400 ms so the last item is not perceived as late.

```jsx
const list = { visible: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22,1,0.36,1] } } };
<motion.ul variants={list} initial="hidden" animate="visible">
  {items.map(i => <motion.li key={i.id} variants={item}>…</motion.li>)}
</motion.ul>
```

Bad: 200 ms × 12 children (2.4 s — reads as broken); stagger on every list site-wide (wallpaper); stagger on every re-render (only mount or explicit transition).

---

## Page transitions

Choose one and apply globally; never mix techniques on the same site.

**Crossfade (default)**
- Out: 200 ms opacity 1 → 0
- In:  300 ms opacity 0 → 1, y 8 → 0

**Slide**
- Forward: new page from right, old to left, 300 ms ease-in-out-cubic
- Back: reverse direction (use route-history hook)

**Shared-element**
- Use Framer Motion `layoutId` (React) or View Transitions API where supported.
- Reserve for hero → detail navigation. Never on every link.

---

## `prefers-reduced-motion`

Mandatory. Opacity-only transitions remain allowed (no vestibular trigger). Translate, scale, rotate, parallax must be disabled.

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

```jsx
import { useReducedMotion } from "framer-motion";
const reduced = useReducedMotion();
const variants = reduced
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } };
```

---

## Hover / active / focus baseline

Every interactive element gets all four. From `tokens.css`:

```css
.btn {
  transition:
    transform var(--dur-200) var(--ease-out-quint),
    background-color var(--dur-200) var(--ease-out-quint),
    box-shadow var(--dur-200) var(--ease-out-quint);
}
.btn:hover  { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.btn:active { transform: translateY(0);    box-shadow: var(--shadow-sm); transition-duration: var(--dur-150); }
.btn:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
```

---

## Anti-patterns (do not generate)

- `transition: all <time>` — force-specifies every property; explicit list only.
- Infinite loops on UI chrome (spinners excepted; always have a stop condition).
- Parallax on text bodies (vestibular trigger and reading hostile).
- Bouncy springs on layout-blocking transitions (router, modal open).
- Motion on first-paint above the fold without skeleton — perceived as jank.
- Auto-playing carousels with no pause control.

---

## Library cheat-sheet

- **Framer Motion** — `motion.<el>`, `variants`, `AnimatePresence`, `layout`, `useReducedMotion()`.
- **Motion One** — `animate(el, { y: [10, 0], opacity: [0, 1] }, { duration: 0.6, easing: [0.22, 1, 0.36, 1] })`.
- **GSAP** — timelines and ScrollTrigger only. Always guard with `prefers-reduced-motion` before `gsap.to`.
- **Vue/Svelte/CSS** — `<Transition>` / `transition:` directives + token-driven classes. Never inline `0.3s` literals.

---

## Advanced motion patterns

Reach for these when a screen needs depth beyond hover/focus. Every pattern ships a reduced-motion fallback. Samples use `motion/react` — verify import path at build time.

### Scroll-driven reveal

`whileInView` with `{ once: true, margin: "-15% 0px" }` — fires once, slightly before entry. Stagger per word or per line; never per character. Reduced-motion: instant opacity, no `y`.

```jsx
<motion.h1 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-15% 0px" }}
  transition={{ staggerChildren: 0.06 }}>
  {words.map((w, i) => (
    <motion.span key={i} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>{w} </motion.span>
  ))}
</motion.h1>
```

### Parallax

6–12 px translate, never above 24 px near text. Hero illustrations and decorative grids only. `useScroll` + `useTransform`. Disabled under reduced-motion.

### Magnetic hover

Cursor-follow translate within ±8 px on a CTA. Gate on `(pointer: fine)` to skip touch.

```jsx
const x = useMotionValue(0), y = useMotionValue(0);
const onMove = (e) => { if (!matchMedia("(pointer: fine)").matches) return;
  const r = e.currentTarget.getBoundingClientRect();
  x.set(((e.clientX - r.left) / r.width - 0.5) * 16);
  y.set(((e.clientY - r.top) / r.height - 0.5) * 16); };
<motion.button onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }} style={{ x, y }} />
```

### Layout transitions

`layout` for inline reorder; `layoutId` for cross-route shared elements (thumb → detail hero). Pair with `AnimatePresence`. Never spring-bouncy on layout-blocking transitions like router or modal open.

```jsx
<motion.li layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>…</motion.li>
<motion.img layoutId={`cover-${id}`} src={src} />
```

### Number counters

Animate 0 → target on viewport entry. `Intl.NumberFormat` for grouping. Reduced-motion: render final value directly.

```jsx
const v = useMotionValue(0);
const display = useTransform(v, (n) => new Intl.NumberFormat().format(Math.round(n)));
useEffect(() => { animate(v, target, { duration: 1.2, ease: [0.22, 1, 0.36, 1] }); }, []);
```

### Marquee / ticker

Logo grids and testimonial strips: duplicate list once, translate `-50%`, loop. Pause on hover. Reduced-motion: full-stop, single copy.

```css
.marquee { display: flex; gap: var(--space-8); animation: scroll 30s linear infinite; }
.marquee:hover { animation-play-state: paused; }
@keyframes scroll { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .marquee { animation: none; } }
```

### Page-transition reveal

Radial wipe or skew slide for route changes. Next.js App Router: place a `template.tsx` (re-renders on navigation), `--dur-300` in / `--dur-200` out, `--ease-in-out-cubic`.

```jsx
export default function Template({ children }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}>{children}</motion.div>; }
```

### Animated borders

Two recipes: (a) conic-gradient rotation animating `--angle`; (b) SVG stroke `stroke-dashoffset` to zero. Reserve for the page's single most important CTA — never a list.

```css
@property --angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
.btn-glow { background: conic-gradient(from var(--angle), var(--color-brand-400), var(--color-accent-400), var(--color-brand-400));
  animation: spin 4s linear infinite; }
@keyframes spin { to { --angle: 360deg; } }
```

### Mesh-gradient drift

Slow oscillation (15–30 s) of blurred radial blobs behind hero content. `translate3d`, not `background-position` (paint thrash). Reduced-motion: static.

```jsx
<motion.div animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
  transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
  style={{ background: "radial-gradient(closest-side, var(--color-brand-400), transparent)",
    filter: "blur(80px)", opacity: 0.25 }} />
```

### Typewriter / word reveal

Word-by-word fade-up for display headlines, 60 ms gap. Reduced-motion: instant. Never per character.

### Tilt cards

`perspective(1000px) rotateX/Y` ±8° tracking cursor. Coarse-pointer: no tilt. Pair with a same-axis shadow shift.

```jsx
const onMove = (e) => { if (!matchMedia("(pointer: fine)").matches) return;
  const r = e.currentTarget.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
  e.currentTarget.style.transform = `perspective(1000px) rotateX(${-py*8}deg) rotateY(${px*8}deg)`; };
```

### Card lift on hover

`y: -2`, `--shadow-md`, brand-tinted border. 200 ms ease-out. System default — do not invent per-component variants.

```css
.card { transition: transform var(--dur-200) var(--ease-out-quint),
  box-shadow var(--dur-200) var(--ease-out-quint), border-color var(--dur-200) var(--ease-out-quint); }
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md);
  border-color: color-mix(in oklch, var(--color-brand-400) 40%, var(--color-border)); }
```

Cross-refs: `rich-ui-patterns/SKILL.md` (visual catalog), `ui-design-principles/SKILL.md` (motion-polish rubric).
