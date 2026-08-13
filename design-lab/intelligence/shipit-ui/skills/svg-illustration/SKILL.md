---
name: svg-illustration
description: Author SVG illustrations matched to project tokens — viewBox conventions, stroke widths, gradient construction, two-tone vs full-color rules, and accessibility; auto-activates on `/illustrate` and `.svg` edits.
type: skill
---

# SVG Illustration

Claude writes SVG directly. No image generation API, no raster export. Every illustration matches project tokens (colors, radii) and renders crisply at any size.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## viewBox conventions

Pick one of these canonical sizes by intent:

| Use | viewBox | Rationale |
|---|---|---|
| Icon | `0 0 24 24` | Lucide/Heroicons-compatible grid |
| Small spot | `0 0 64 64` | Empty-state inline glyph |
| Standard illustration | `0 0 320 240` | Hero/empty-state, 4:3 default |
| Wide hero | `0 0 1200 600` | Marketing band |
| Square portrait | `0 0 320 320` | Avatars, decorative tiles |

Rules:
- viewBox starts at `0 0`. Never offset.
- Never set fixed `width`/`height` on the root `<svg>` — let the consumer scale via CSS. Set `width="100%"` if a default is needed.
- Always include `xmlns="http://www.w3.org/2000/svg"`.
- `preserveAspectRatio="xMidYMid meet"` is the default — only override for hero bands that should crop (`slice`).

---

## Stroke width — relative to size

Stroke is in user units of the viewBox. Pick a width that scales legibly.

| viewBox max | Stroke (line-art) | Stroke (accent) |
|---|---|---|
| 24 | 1.5 | 1 |
| 64 | 2 | 1.5 |
| 320 | 4–6 | 2–3 |
| 1200 | 12–16 | 6–8 |

Rules:
- Use `stroke-width` proportional to viewBox; never `1px` literal.
- `stroke-linecap="round"` and `stroke-linejoin="round"` for friendly line-art; `butt` + `miter` for technical/architectural.
- `vector-effect="non-scaling-stroke"` only when the stroke must remain 1 device-px regardless of zoom (rare; UI overlays).

---

## Color — always tokens, never literal hex inside SVG when used inline

Two emission paths:

**Path A — inline SVG in JSX (preferred for token integration)**
Use `currentColor` or CSS variables; the SVG inherits theme.
```
<svg viewBox="0 0 320 240" role="img" aria-label="Empty inbox">
  <rect x="40" y="60" width="240" height="140" rx="12"
        fill="var(--color-surface-elevated)"
        stroke="var(--color-border)"
        stroke-width="2" />
  <path d="M60 100 L160 160 L260 100" stroke="currentColor" stroke-width="3" fill="none" />
</svg>
```

**Path B — standalone `.svg` file in `public/`**
Cannot reference CSS variables (different document). Two-tone illustrations use `currentColor` + one defined fill set by the consuming component via `style` or `<use>` symbol patterns.

```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" fill="none">
  <rect x="40" y="60" width="240" height="140" rx="12"
        fill="currentColor" fill-opacity="0.08"
        stroke="currentColor" stroke-width="2" />
  <path d="M60 100 L160 160 L260 100" stroke="currentColor" stroke-width="3" />
</svg>
```

The React wrapper in `components/illustrations/<Slug>.tsx` sets `style={{ color: "var(--color-brand)" }}` so the illustration tracks the theme.

---

## Gradient construction

Gradients use `<defs>` + `<linearGradient>` / `<radialGradient>`. Stops use `currentColor` or token references where possible.

```
<defs>
  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0"   stop-color="currentColor" stop-opacity="0.0" />
    <stop offset="1"   stop-color="currentColor" stop-opacity="0.4" />
  </linearGradient>
</defs>
<rect width="320" height="240" fill="url(#g1)" />
```

Rules:
- `id` must be unique per file; prefix with the slug if multiple SVGs share a page (`hero-empty-g1`).
- Soft-gradient style: 2 stops, low alpha delta (0 → 0.3) — never hard 0 → 1.
- Mesh-gradient look: stack two `<radialGradient>` blobs at offset positions, low opacity, blend with `mix-blend-mode: multiply` on the parent.
- Avoid more than 4 stops — banding risk and visual noise.

---

## Style options

The five styles in spec section 6.7. Pick one per illustration; do not mix.

| Style | Recipe |
|---|---|
| Geometric | Hard shapes, flat fills, 0–2 px strokes, no gradients |
| Two-tone | `currentColor` + one accent at 0.08–0.12 fill-opacity |
| Soft-gradient | One linear or radial gradient (0 → 0.3 alpha), single hue |
| Isometric | 30°/-30° axes, three faces lit (light/mid/dark token steps 200/400/700) |
| Line-art | Stroke-only, `fill="none"`, `stroke-linecap="round"`, no fills |

---

## Two-tone vs full-color decision

| Choose | When |
|---|---|
| Two-tone | Empty states, inline illustrations, anything that should track brand color |
| Full-color | Marketing hero, onboarding storyboard, where character/scene matters |

Two-tone is the default. Full-color requires explicit user request or `/illustrate` mood input that implies it.

---

## Accessibility

The constitution rule: every illustration is labeled or marked decorative.

**Meaningful illustration**
```
<svg role="img" aria-labelledby="empty-inbox-title empty-inbox-desc"
     viewBox="0 0 320 240">
  <title id="empty-inbox-title">No messages</title>
  <desc  id="empty-inbox-desc">An open envelope with motion lines suggesting nothing inside.</desc>
  …
</svg>
```

**Decorative illustration** (next to text that already conveys the meaning)
```
<svg aria-hidden="true" focusable="false" viewBox="0 0 320 240">…</svg>
```

For React wrappers:
```
type Props = { className?: string; "aria-label"?: string; decorative?: boolean };
```
Default `decorative={false}`; when true, render `aria-hidden="true"` and drop title/desc.

Never both `aria-label` and `aria-hidden` on the same element. Never leave a meaningful illustration unlabeled.

---

## File conventions

- Path: `public/illustrations/<slug>.svg` (kebab-case slug).
- React wrapper: `components/illustrations/<Slug>.tsx` (PascalCase). Imports the SVG (or inlines if small) and exposes the `Props` above.
- Keep raw SVG ≤ 300 lines (constitution rule 1). For complex scenes, split into layered components or use `<symbol>` + `<use>`.

---

## Anti-patterns

- Embedded raster (`<image href="data:image/png;…">`) — defeats the point.
- Inline `style="fill:#aabbcc"` — bypasses tokens.
- `width="320" height="240"` on root with no viewBox — won't scale.
- Pixel-grid icons drawn at non-integer coordinates — blurry on 1× displays.
- Filters with heavy blur on large surfaces — paint cost; prefer soft gradients.
- `<text>` rendered as glyphs in icons — convert to paths or use the host font.

---

## Advanced SVG patterns

These extend the baseline for richer hero, marketing, and showcase work. Pair with `rich-ui-patterns/SKILL.md` and `motion-design/SKILL.md` for usage rules.

### Mesh gradients in SVG

Overlapping `<radialGradient>` blobs blurred via `<filter><feGaussianBlur/></filter>`. Three to four colors max, anchored on tokens via `currentColor` or stop-references in JSX-inline form.

```
<svg viewBox="0 0 800 600" aria-hidden="true">
  <defs>
    <filter id="m" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
    <radialGradient id="a" cx="0.3" cy="0.3"><stop offset="0" stop-color="var(--color-brand-400)" stop-opacity="0.6"/><stop offset="1" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="0.75" cy="0.65"><stop offset="0" stop-color="var(--color-accent-400)" stop-opacity="0.5"/><stop offset="1" stop-opacity="0"/></radialGradient>
  </defs>
  <g filter="url(#m)"><rect width="800" height="600" fill="url(#a)"/><rect width="800" height="600" fill="url(#b)"/></g>
</svg>
```

### Animated SVG — three approaches

Selection criteria, verify libraries at build time:

- **CSS keyframes** — preferred for simple loops, < 100 elements. Tokens via `var(--dur-…)`. No JS overhead.
- **SMIL** (`<animate>`) — broad support, but DOM-heavy and harder to coordinate. Treat as legacy.
- **React-driven** (Framer Motion + path animation, or `motion/react` `animate` on `pathLength`) — required for complex morphs, interactive sequences, viewport-tied entrances.

```jsx
<motion.path d={d} stroke="currentColor" fill="none"
  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
```

### Hand-drawn feel

Slight stroke-width variation across paths (1.5 / 2 / 2.5), `<filter>` displacement (`feTurbulence` + `feDisplacementMap` at small scale 1–2), and two-tone fill — one slightly darker for shadow, one for body. Restrained: heavy displacement breaks crisp rendering.

```
<filter id="rough"><feTurbulence baseFrequency="0.02" numOctaves="2"/>
  <feDisplacementMap in="SourceGraphic" scale="1.5"/></filter>
<path d="…" fill="currentColor" fill-opacity="0.12" filter="url(#rough)"/>
```

### Isometric scenes

30° / -30° axes. Depth via opacity layering on the three visible faces of each solid: top (lightest, `--color-neutral-200`), front (mid, `--color-neutral-400`), side (darkest, `--color-neutral-700`). Build a small library of reusable `<symbol>` shapes — cube, cylinder, plane — and `<use>` them.

```
<symbol id="iso-cube" viewBox="0 0 100 100">
  <polygon points="50,10 90,30 50,50 10,30" fill="var(--color-neutral-200)"/>
  <polygon points="10,30 50,50 50,90 10,70" fill="var(--color-neutral-400)"/>
  <polygon points="50,50 90,30 90,70 50,90" fill="var(--color-neutral-700)"/>
</symbol>
```

### Browser / device mockups

Chrome SVG plus a content-area filler. Common variants:

- **macOS browser** — three traffic-light dots (`--color-danger-500`, `--color-warning-500`, `--color-success-500`), top bar `--color-surface-elevated`, body `--color-surface`.
- **iOS phone** — rounded `rx=48`, notch via a small cutout `<path>` at top center.
- **iPad** — rounded `rx=24`, no notch, thin bezel.
- **Apple Watch** — capsule (`rx=28`) with crown nub on the right edge.

```
<svg viewBox="0 0 800 500" role="img" aria-label="Dashboard mockup">
  <rect x="0" y="0" width="800" height="40" fill="var(--color-surface-elevated)"/>
  <circle cx="20" cy="20" r="6" fill="var(--color-danger-500)"/>
  <circle cx="40" cy="20" r="6" fill="var(--color-warning-500)"/>
  <circle cx="60" cy="20" r="6" fill="var(--color-success-500)"/>
  <rect x="0" y="40" width="800" height="460" fill="var(--color-surface)"/>
</svg>
```

### Decorative section backgrounds

Subtle geometric patterns at 4–8% opacity behind content. Tile via `<pattern>`. Examples: dot grid, line grid, triangles, waves. Always `aria-hidden="true"`.

```
<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="2" cy="2" r="1" fill="currentColor" fill-opacity="0.06"/>
</pattern></defs>
<rect width="100%" height="100%" fill="url(#dots)"/>
```

### Animated icons

Line-draw entrance via `stroke-dashoffset` from path length to 0. State morphs via interpolating `d` (use `flubber` or `motion/react`'s implicit path tween for two-state morphs). Reduced-motion: jump to final state.

```css
.icon-draw path { stroke-dasharray: 100; stroke-dashoffset: 100;
  animation: draw var(--dur-600) var(--ease-out-quint) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
```

### Path-on-scroll

Drawing an SVG path as the user scrolls. `motion/react` `useScroll` + `useTransform` mapped to `pathLength`. Reduced-motion: render fully drawn.

```jsx
const { scrollYProgress } = useScroll();
const length = useTransform(scrollYProgress, [0, 1], [0, 1]);
<motion.path d={d} style={{ pathLength: length }} stroke="currentColor" fill="none"/>
```

### Logo lockups

Mark + wordmark in three official variants from one source SVG: horizontal lockup, vertical lockup, mark-only. Same paths, different `viewBox` crops via wrapper components. Spacing between mark and wordmark: optical, typically `mark-height × 0.4`. Never re-typeset the wordmark per variant.

Cross-refs: `rich-ui-patterns/SKILL.md` (when to deploy mockups, mesh, decorative bg), `motion-design/SKILL.md` (path-on-scroll and animated icon recipes).
