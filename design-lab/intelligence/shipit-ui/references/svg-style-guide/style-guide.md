# SVG Style Guide

The five sanctioned illustration styles for `/illustrate`. Pick one per project and stay in it; mixed styles read as inconsistent product work.

Universal rules across every style:

- **viewBox first.** Every SVG opens with `viewBox`. No fixed `width`/`height` attributes inside the asset; size at the call site via CSS.
- **Token colors only.** Fills and strokes reference `currentColor`, `var(--color-*)`, or hard-coded values pulled from the project palette — never freeform hex like `#a4c8e1`.
- **Accessibility:** if decorative, set `aria-hidden="true"` and `focusable="false"`. If meaningful, include `<title>` (and `<desc>` when nuance helps), and reference them via `role="img"` plus `aria-labelledby`.
- **Optimize at write-time.** No editor metadata, no `id` collisions across instances (use deterministic prefixes), no `style` blocks where attributes work.
- **No text inside illustrations** unless the text is the subject. Render labels in HTML adjacent to the SVG.

## 1. Geometric

Flat, hard-edged shapes built from primitives. Bauhaus / Swiss feel. The default for product marketing pages.

| Rule | Value |
|---|---|
| viewBox | square `0 0 200 200` or wide `0 0 400 240` |
| Fills | flat `var(--color-brand-*)`, max 4 distinct hues |
| Strokes | none (or 0) |
| Corners | sharp by default; if rounded, single shared `--radius` token |
| Gradients | not allowed |
| Accessibility | decorative unless illustrating a metric — then `<title>` + `<desc>` |

```svg
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <rect x="20" y="20" width="80" height="80" fill="var(--color-brand-200)" />
  <rect x="100" y="20" width="80" height="80" fill="var(--color-brand-500)" />
  <rect x="20" y="100" width="80" height="80" fill="var(--color-brand-700)" />
  <circle cx="140" cy="140" r="40" fill="var(--color-accent-500)" />
</svg>
```

## 2. Two-tone

Single subject in two values from the palette — a deep tone and a light tone — plus optional white. Editorial, calm, very legible at small sizes.

| Rule | Value |
|---|---|
| viewBox | match aspect of subject, typically `0 0 240 240` |
| Fills | exactly two: `var(--color-brand-700)` + `var(--color-brand-200)` (or analogous) |
| Strokes | none |
| Gradients | not allowed |
| Detail | shapes only; don't simulate volume |
| Accessibility | usually `aria-hidden`; meaningful when illustrating a feature |

```svg
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t1">
  <title id="t1">Stacked envelope, suggesting incoming mail</title>
  <rect x="40" y="80" width="160" height="120" rx="8" fill="var(--color-brand-200)" />
  <path d="M40 88 L120 152 L200 88" fill="none" stroke="var(--color-brand-700)" stroke-width="6" />
  <rect x="60" y="60" width="120" height="20" rx="4" fill="var(--color-brand-700)" />
</svg>
```

## 3. Soft-gradient

Lush, depth-y, modern AI/SaaS aesthetic. Use sparingly — at most one soft-gradient illustration per page.

| Rule | Value |
|---|---|
| viewBox | wide; `0 0 480 320` typical |
| Fills | linear or radial gradients between two palette steps (e.g. brand-300 → brand-700) |
| Stops | exactly 2 or 3 stops; never 4+ |
| Strokes | none, or 1px subtle highlight inside the shape |
| Blur | one `feGaussianBlur` at most, stdDeviation ≤ 12 |
| Accessibility | decorative; pair with HTML headline that carries meaning |

```svg
<svg viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="g1" cx="30%" cy="30%" r="80%">
      <stop offset="0%" stop-color="var(--color-brand-300)" />
      <stop offset="100%" stop-color="var(--color-brand-800)" />
    </radialGradient>
  </defs>
  <rect width="480" height="320" rx="24" fill="url(#g1)" />
  <circle cx="360" cy="120" r="60" fill="var(--color-accent-400)" opacity="0.7" />
</svg>
```

## 4. Isometric

True 30-degree isometric projection. Higher information density; good for architecture, system diagrams, dashboards-in-marketing.

| Rule | Value |
|---|---|
| viewBox | wide, `0 0 480 320` typical |
| Angles | every long edge sits on a 30°/150° axis. No arbitrary skew. |
| Fills | three values per face (top, left, right) for shading: lightest, mid, darkest — pulled from palette |
| Strokes | optional 1–1.5px in the darkest palette step for definition |
| Gradients | avoid; flat shading reads cleaner at small sizes |
| Accessibility | almost always meaningful — include `<title>` and `<desc>` |

```svg
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t2">
  <title id="t2">Isometric cube</title>
  <polygon points="120,40 200,80 120,120 40,80" fill="var(--color-neutral-200)" />
  <polygon points="40,80 120,120 120,200 40,160" fill="var(--color-neutral-500)" />
  <polygon points="200,80 120,120 120,200 200,160" fill="var(--color-neutral-700)" />
</svg>
```

## 5. Line-art

Strokes only, no fills. Editorial, technical, schematic. Plays best on neutral-50 or neutral-950 backgrounds.

| Rule | Value |
|---|---|
| viewBox | match subject aspect |
| Strokes | `currentColor` so it inherits text color; `stroke-width` proportional to viewBox (typical: 1.5–2 in a 24-unit box, 4–6 in a 240-unit box) |
| Fills | `none` |
| Linecaps | `round` |
| Linejoins | `round` |
| Accessibility | almost always icon-like; `<title>` if standalone |

```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t3"
     fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <title id="t3">Bookmark</title>
  <path d="M6 3h12v18l-6-4-6 4z" />
</svg>
```

## Picking a style

| Project type | Style |
|---|---|
| Product marketing, feature pages | Geometric or Two-tone |
| Editorial, longform | Two-tone or Line-art |
| AI / modern SaaS hero | Soft-gradient (one per page) |
| Architecture / system diagrams | Isometric |
| Documentation, technical | Line-art |

Once chosen, every `/illustrate` invocation in the project should keep to that style unless the user explicitly asks for a different one.

## Stroke-width relative to viewBox

A common bug: `stroke-width="1"` inside a 240-unit viewBox is invisible. Rule of thumb:

- viewBox edge ~24: stroke-width 1.5–2
- viewBox edge ~100: stroke-width 3–4
- viewBox edge ~240: stroke-width 4–6
- viewBox edge ~480: stroke-width 6–8

Or: `stroke-width = round(viewBoxEdge / 60)`.
