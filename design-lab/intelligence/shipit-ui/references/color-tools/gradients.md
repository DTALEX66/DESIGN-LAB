# Gradients

Most production gradients look muddy in the middle. The cause is sRGB interpolation. The fix is `<color-interpolation-method>` — supported in current Chromium, Firefox, and Safari.

## The sRGB-mid-muddy problem

A linear gradient from blue (`#0000ff`) to yellow (`#ffff00`) in sRGB passes through a desaturated gray-brown at t=0.5. The math interpolates the encoded gamma values; perceptually, that's wrong.

The same gradient in OKLab passes through a vivid green (or whatever the perceptual midpoint actually is). The CSS:

```css
/* default: srgb-interpolation, looks muddy */
background: linear-gradient(blue, yellow);

/* perceptual mid */
background: linear-gradient(in oklab, blue, yellow);
```

Always specify `in oklab` (or `in oklch …`) for production gradients between distinct hues.

## Linear gradients

```css
/* angle / direction first */
background: linear-gradient(135deg in oklab, var(--color-brand-500), var(--color-info-500));
background: linear-gradient(to right in oklch shorter hue, var(--color-brand-500), var(--color-info-500));
```

### Stops

For multi-stop gradients, place stops at the perceptual midpoints, not even percentages:

```css
background: linear-gradient(
  in oklab,
  var(--color-brand-500) 0%,
  var(--color-brand-700) 50%,
  var(--color-brand-900) 100%
);
```

Single-hue ramps (light → dark of the same hue) are the simplest case and rarely look muddy in any space — but consistency: still author with `in oklab`.

## Radial gradients

```css
background: radial-gradient(circle at 30% 20% in oklab, var(--color-brand-300), transparent 70%);
```

Common pattern: blurred radial-color blob over a surface for a soft glow. `transparent` interpolation in OKLab also avoids the muddy-mid issue.

## Conic gradients

Used for color wheels, progress arcs, and decorative effects. Always specify `in oklch` so the hue arc is correct:

```css
background: conic-gradient(
  in oklch longer hue,
  oklch(70% 0.2  30),
  oklch(70% 0.2 120),
  oklch(70% 0.2 210),
  oklch(70% 0.2 300),
  oklch(70% 0.2  30)
);
```

`longer hue` ensures the rainbow goes around the wheel; `shorter hue` would skip the long way and produce a single-color sweep.

## Hue arc direction

For two hues, OKLCH offers two arc directions:

```css
background: linear-gradient(in oklch shorter hue, A, B);
background: linear-gradient(in oklch longer hue,  A, B);
```

- **shorter hue**: shortest path around the wheel. Default for most cases.
- **longer hue**: long path. Used when you want the gradient to traverse other hues — e.g., red → green going through orange/yellow rather than through magenta.

For nearby hues (e.g., 30° apart), the difference is negligible. For complementary hues (180°), `shorter hue` chooses an arbitrary direction; you should specify intent.

## Soft-mesh gradients (CSS-only approximation)

True mesh gradients are a Safari-only WebKit extension. The portable approximation is layered radial gradients with blur:

```css
.mesh {
  position: relative;
  background: var(--color-surface);
  isolation: isolate;
}
.mesh::before, .mesh::after {
  content: "";
  position: absolute;
  inset: -10%;
  z-index: -1;
  filter: blur(80px);
  opacity: 0.6;
}
.mesh::before {
  background:
    radial-gradient(circle at 20% 30% in oklab, var(--color-brand-400), transparent 50%),
    radial-gradient(circle at 80% 60% in oklab, var(--color-info-400),  transparent 50%);
}
.mesh::after {
  background:
    radial-gradient(circle at 60% 10% in oklab, var(--color-success-300), transparent 60%);
}
```

Notes:
- Blur radius drives "softness." 60–120px is typical for hero surfaces.
- `isolation: isolate` prevents bleeding into ancestor stacking contexts.
- Performance: blurred layers are GPU-cheap on modern hardware but accumulate cost; cap at 3–4 layers for large surfaces.

## Animated gradients with reduced-motion

```css
.animated-mesh {
  background: linear-gradient(135deg in oklab,
    var(--color-brand-500), var(--color-info-500), var(--color-brand-500));
  background-size: 200% 200%;
  animation: mesh-shift 12s linear infinite;
}

@keyframes mesh-shift {
  to { background-position: 100% 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .animated-mesh { animation: none; background-size: 100% 100%; }
}
```

Constitution rule #4: every motion respects `prefers-reduced-motion`. Gradient animation is motion.

## Token-driven gradients

Author gradients as tokens, not in component CSS:

```css
:root {
  --gradient-brand: linear-gradient(135deg in oklab,
    var(--color-brand-400), var(--color-brand-700));
  --gradient-hero: radial-gradient(ellipse at top in oklab,
    var(--color-brand-300), transparent 70%);
}

.hero { background: var(--gradient-hero), var(--color-surface); }
```

Reasons:
- Reusable across components.
- One place to update for theming.
- Dark-mode override at the token layer:

```css
[data-theme="dark"] {
  --gradient-brand: linear-gradient(135deg in oklab,
    var(--color-brand-700), var(--color-brand-400));
}
```

## Gamut and gradients

A linear-gradient from `oklch(70% 0.3 30)` to `oklch(70% 0.3 270)` may pass through colors outside sRGB. Browsers gamut-map the interpolated stops. Result is usually fine but can look subtly different from authored stops. If the brand hinges on exact mid-points, generate stops at smaller intervals (e.g., 10%) explicitly and gamut-map at build time.

## Common mistakes

- **No `<color-interpolation-method>`.** Default sRGB interpolation gives muddy mids.
- **`in srgb` thinking it means perceptual.** It doesn't — it means default-encoding-space, which is the muddy-mid case.
- **Two-stop rainbow gradients.** Pick a hue arc direction explicitly (`shorter`/`longer hue`); never let the engine guess.
- **Blurring with `filter: blur()` at large radii on big surfaces.** Costs add up; profile.
- **Animating `background-position` without `prefers-reduced-motion`.** Fails constitution rule #4.
- **Stacking 5+ blurred radial layers.** Looks muddy because each layer multiplies opacity. 2–4 is the sweet spot.
- **Using gradient as text background (`background-clip: text`) without solid fallback.** If the gradient fails to load or is overridden, text becomes invisible. Always set `color` first.

## Quick decision tree

- Same-hue light-to-dark? `linear-gradient(in oklab, …)`.
- Two distinct hues? `linear-gradient(in oklch shorter hue, …)` (or `longer hue` if you want the long way).
- Soft glow blob? `radial-gradient(in oklab, color, transparent)`.
- Color wheel / hue cycle? `conic-gradient(in oklch longer hue, …)`.
- Mesh? Layered radials with blur, `isolation: isolate`.
- Animated? Wrap in `prefers-reduced-motion`.
