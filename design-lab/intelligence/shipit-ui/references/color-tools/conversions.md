# Conversions & CSS Syntax

Practical patterns for moving between formats and the CSS syntax that matters in 2026.

## Format matrix

| From → To | hex | rgb | hsl | oklch | oklab | p3 |
|---|---|---|---|---|---|---|
| **hex** | — | trivial | via rgb | via rgb→linear→oklab | via rgb→linear→oklab | via rgb→p3 |
| **rgb** | trivial | — | direct formula | linear-rgb → oklab → oklch | linear-rgb → oklab | linear-rgb → p3 |
| **hsl** | via rgb | direct formula | — | via rgb | via rgb | via rgb |
| **oklch** | oklab → linear-rgb → srgb | same | via rgb | — | polar↔cartesian | oklab → linear-p3 |
| **oklab** | linear-rgb → srgb | same | via rgb | polar↔cartesian | — | linear-p3 |
| **p3** | gamut-map → srgb | gamut-map → srgb | via rgb | linear-p3 → oklab | linear-p3 → oklab | — |

Don't hand-implement except for trivial hex↔rgb. Use a library.

## CSS syntax (current)

### Hex
```css
--color-brand: #4f46e5;          /* opaque */
--color-brand-50: #eef2ff;
--color-overlay: #00000080;      /* 8-digit, alpha last */
```

### `rgb()` / `hsl()` modern syntax
```css
/* slash for alpha, no commas */
--color-fg: rgb(15 23 42);
--color-fg-muted: rgb(15 23 42 / 0.7);
--color-brand: hsl(243 75% 58%);
```

### `oklch()` / `oklab()`
```css
/* L is 0..1 or 0..100% (recommend %); C is 0..0.4 in practice; H is degrees */
--color-brand:    oklch(54% 0.21 274);
--color-brand-50: oklch(96% 0.02 274);
--color-fg:       oklch(20% 0.02 264);
--color-overlay:  oklch(0% 0 0 / 0.5);
```

### `color()` for wide gamut
```css
--color-brand-vivid: color(display-p3 0.30 0.27 0.91);
@supports not (color: color(display-p3 0 0 0)) {
  :root { --color-brand-vivid: #4f46e5; }
}
```

### `color-mix()` (perceptual mixing in CSS)
```css
/* mix in oklab for perceptual correctness */
--color-brand-hover: color-mix(in oklab, var(--color-brand) 90%, white);
--color-brand-active: color-mix(in oklab, var(--color-brand) 80%, black);
--color-ring: color-mix(in oklab, var(--color-brand) 50%, transparent);
```

`color-mix()` is the right tool for hover/active variants when you want CSS-only modulation. For ramps, generate at build time — `color-mix()` chains compound and become hard to reason about.

## Browser support caveats (2026)

- `oklch()`, `oklab()`, `color()`, `color-mix()` are widely supported in current Chromium, Firefox, and Safari.
- `<color-interpolation-method>` (e.g., `linear-gradient(in oklab, ...)`) is supported across the same engines but check minimum-version targets.
- For projects targeting older browsers (corporate Edge Legacy, embedded WebViews), emit hex for tokens and reserve `oklch()` for progressive enhancement.

Pattern for fallback:

```css
:root {
  --color-brand: #4f46e5;                /* sRGB fallback */
}
@supports (color: oklch(0% 0 0)) {
  :root {
    --color-brand: oklch(54% 0.21 274);  /* perceptual */
  }
}
```

If the build pipeline computes both, prefer emitting both as separate tokens (`--color-brand` hex, `--color-brand-oklch` for advanced contexts) only when a real consumer needs the second form. Otherwise the supports-block above is enough.

## Library selection (verify at build time per spec §11)

Two strong options for OKLCH conversions in JS, plus the hand-roll option:

### `culori`
- Tree-shakeable; small per-conversion footprint.
- Strong gamut-mapping (`clampChroma`).
- TypeScript types good but not exhaustive.
- Selection criteria: bundle size matters; doing many conversions; want pluggable parsers.

### `colorjs.io`
- Reference-grade implementation by CSS WG members.
- Larger bundle; class-based API.
- Tracks CSS Color Level 4/5 closely.
- Selection criteria: correctness over size; doing CSS-spec-faithful work; interactive tools.

### Hand-rolled OKLCH
- ~80 lines for OKLab↔linear-sRGB↔sRGB and polar↔cartesian.
- Avoids a runtime dep.
- Selection criteria: only doing OKLCH↔hex; no gamut mapping needed; minimum dep policy.
- Risk: gamut mapping is the part you'll wish you had a library for.

**Do not hard-pick.** When `/palette` is implemented, verify current maintenance status, npm-weekly downloads, and last-release date for both libraries. Pick whichever is healthy and matches the constraint that dominates (size vs correctness).

## Hex ↔ RGB (the only one worth hand-coding)

```js
function hexToRgb(hex) {
  const m = hex.replace('#','').match(/^([0-9a-f]{6}|[0-9a-f]{3}|[0-9a-f]{8})$/i);
  if (!m) throw new Error('bad hex');
  let s = m[1];
  if (s.length === 3) s = s.split('').map(c => c+c).join('');
  const n = parseInt(s.slice(0,6), 16);
  const a = s.length === 8 ? parseInt(s.slice(6,8), 16) / 255 : 1;
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255, a };
}

function rgbToHex({r, g, b, a = 1}) {
  const h = (n) => n.toString(16).padStart(2, '0');
  const base = `#${h(r)}${h(g)}${h(b)}`;
  return a < 1 ? base + h(Math.round(a*255)) : base;
}
```

Everything else: use the library.

## Common mistakes

- **Treating `hsl()` and `oklch()` as interchangeable knobs.** They aren't; the L axes mean different things.
- **Forgetting alpha on `color-mix()` mixing with `transparent`.** `color-mix(in oklab, blue 50%, transparent)` works because `transparent` is `rgba(0,0,0,0)` — but the resulting hue can shift if you mix in sRGB. Mix in `oklab` for transparency-blends too.
- **Using `oklch(50%, 0.2, 270)` with commas.** Modern CSS uses spaces, not commas. Commas parse but are non-canonical.
- **Storing percentage L in one place and 0..1 L in another.** Pick one convention per token file.
- **Round-tripping hex → hsl → hex for "manipulation."** Each pass loses precision and shifts hue. Round-trip in OKLCH instead.
