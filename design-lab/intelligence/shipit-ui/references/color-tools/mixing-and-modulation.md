# Mixing & Modulation

Mixing two colors and modulating a single color (tints, shades, tones) are everyday operations. Both want a perceptual space; both fail in sRGB.

## Mixing two colors

**Mix in OKLab.** Linear interpolation along OKLab's L, a, b axes:

```js
function mixOklab(c1, c2, t) {  // t in [0,1]
  return {
    L: c1.L + t * (c2.L - c1.L),
    a: c1.a + t * (c2.a - c1.a),
    b: c1.b + t * (c2.b - c1.b),
  };
}
```

Why not OKLCH for arbitrary mixes: interpolating along the C axis between two vivid hues passes through low chroma at t=0.5 (the cylinder's axis). Cartesian (a, b) interpolation passes through a vivid mid. Use OKLCH only when you want a hue arc (next section).

In CSS:

```css
--mid: color-mix(in oklab, var(--color-brand-500) 50%, var(--color-info-500) 50%);
```

### Hue-arc mixing (rainbow gradients, hue rotations)

When mixing two hues and you want the path to traverse adjacent hues, use OKLCH with explicit direction:

```css
background: linear-gradient(in oklch shorter hue, var(--color-brand-500), var(--color-info-500));
background: linear-gradient(in oklch longer hue,  var(--color-brand-500), var(--color-info-500));
```

- `shorter hue`: rotate via the shortest arc (default).
- `longer hue`: rotate the long way around — for "cycle the rainbow" effects.

See `gradients.md` for full gradient guidance.

### Mistakes mixing

- Mixing in sRGB: mid-point goes muddy.
- Mixing in HSL: hue is interpolated but L is non-perceptual; mid can drop in lightness.
- Mixing in OKLCH for non-hue-arc cases: chroma drops at t=0.5.
- Mixing without gamut-mapping the result: high-C output can fall outside sRGB and clip in unpredictable ways.

## Tints, shades, tones

Three classical modulations of a single color:

| Operation | Mix toward | Effect |
|---|---|---|
| **Tint** | white | lighter, less chroma |
| **Shade** | black | darker, less chroma |
| **Tone** | gray (mid-L, low-C) | desaturated, similar L |

In OKLab:

```js
const white = { L: 1.0, a: 0, b: 0 };
const black = { L: 0.0, a: 0, b: 0 };
const gray  = { L: 0.5, a: 0, b: 0 };

const tint  = mixOklab(brand, white, 0.3);
const shade = mixOklab(brand, black, 0.3);
const tone  = mixOklab(brand, gray,  0.3);
```

In CSS:

```css
--color-brand-tint:  color-mix(in oklab, var(--color-brand-500) 70%, white);
--color-brand-shade: color-mix(in oklab, var(--color-brand-500) 70%, black);
--color-brand-tone:  color-mix(in oklab, var(--color-brand-500) 70%, oklch(50% 0 0));
```

### When tints/shades/tones are right

- Quick light/dark variants of one color (e.g., hover/active for a single button).
- Decorative use where you don't need a full ramp.
- Backgrounds for callouts based on the brand hue.

### When a full ramp is right

- Anything that ships as tokens.
- Anything where you'll need 4+ steps of variation.
- Anywhere contrast must be predictable across many surfaces.

Ramps and tints/shades both have their place; don't replace one with the other.

## Hover, active, disabled — modulation patterns

Default patterns:

```css
--color-brand-hover:    color-mix(in oklab, var(--color-brand) 90%, white);
--color-brand-active:   color-mix(in oklab, var(--color-brand) 85%, black);
--color-brand-disabled: color-mix(in oklab, var(--color-brand) 50%, var(--color-surface));

--color-fg-hover:       color-mix(in oklab, var(--color-fg) 90%, var(--color-brand));
```

In dark mode, the directions invert: hover usually moves toward black (or surface), active toward color or further darken. Define separately:

```css
[data-theme="dark"] {
  --color-brand-hover:  color-mix(in oklab, var(--color-brand) 88%, black);
  --color-brand-active: color-mix(in oklab, var(--color-brand) 82%, white);
}
```

Or: skip modulation, ship explicit hover/active steps from the ramp (`--color-brand-600` for hover, `--color-brand-700` for active). Often clearer.

### Light/dark variants of a single brand color

If you need just a lighter and darker version (no full ramp):

- Lighter: lift L by 0.10–0.15 in OKLCH; lower C by ~10%.
- Darker: drop L by 0.10–0.15; lower C by ~10–20% (deep colors clip chroma in sRGB).

These are heuristics; verify against the surfaces they sit on.

## Opacity vs solid mixing

Translucent surfaces look different over different backgrounds. For tokens that must be predictable:

- Use **solid** mixed values (`color-mix`) when the underlying surface is known.
- Use **alpha** when the underlying surface varies (overlays, dropdowns over photos).

For accessibility, solid mixed values are easier to verify contrast on.

When using alpha, remember `prefers-reduced-transparency`:

```css
--color-overlay: color-mix(in oklab, var(--color-fg) 60%, transparent);

@media (prefers-reduced-transparency: reduce) {
  :root { --color-overlay: var(--color-fg); }
}
```

## Compounded mixes — be careful

`color-mix()` chains evaluate left-to-right and can lose intent fast:

```css
/* hard to reason about */
--x: color-mix(in oklab, color-mix(in oklab, A 50%, B) 60%, C);
```

Generate compounded values at build time (`/palette` writes the resolved hex into tokens), reserve runtime `color-mix()` for one-step modulations.

## Common mistakes

- **Mixing in sRGB by default** because that's what naive code does.
- **Using `color-mix(in srgb, ...)`** when `in oklab` is available.
- **Treating tints as a substitute for a ramp** — produces 3 colors that all look like the brand, none of which work as a usable mid-tone.
- **Compounding `color-mix()` chains** instead of generating tokens at build time.
- **Forgetting dark-mode inversion of modulations.** Hover-darker is wrong on a dark surface; it disappears.
- **Reaching for opacity to "soften" a color** when a solid mix would be more predictable and easier to verify for contrast.
