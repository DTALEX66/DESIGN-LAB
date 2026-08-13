# Color Spaces

The space you compute in determines whether the result will look right. Output encoding (sRGB hex, `oklch()`, `color(display-p3 …)`) is a separate decision from the computation space.

## Spaces in scope

### sRGB
- Default web color space. Hex codes (`#4f46e5`) and `rgb()` are sRGB.
- Non-linear (gamma-encoded). Math on raw sRGB values is perceptually wrong.
- Linear-light sRGB (degamma'd) is correct for blending compositing operations but still not perceptually uniform.
- Use for: final encoding when targeting universal browser support.
- Do not use for: ramps, gradients, mixing.

### HSL / HSV
- Cylindrical reparametrizations of sRGB. Lightness/Value is **not** perceptual brightness.
- HSL `L=50` yellow vs `L=50` blue: yellow is far brighter to the eye.
- A fixed-S, fixed-L hue sweep visibly pulses in luminance.
- Use for: quick UI tweaks where the artist's eye is the final judge.
- Do not use for: generating ramps, comparing brightness, perceptual interpolation.

### OKLab
- Perceptually uniform Cartesian space (Björn Ottosson, 2020). L is perceptual lightness; a, b are green–red and blue–yellow opponents.
- Equal Euclidean distance ≈ equal perceived difference (within working ranges).
- Use for: mixing two colors (linear interpolation in OKLab).
- Do not use for: hue arc traversal (use OKLCH for that — Cartesian a/b interpolation between two vivid hues passes through low chroma).

### OKLCH
- Polar form of OKLab: L (lightness), C (chroma), H (hue, degrees).
- L is the same perceptual lightness as OKLab.
- C decouples chroma from L — you can move L while holding C constant.
- H is stable; you can rotate hue without changing perceived lightness.
- Use for: ramps (lock H, vary L), hue rotations, gradient hue arcs (`shorter` / `longer hue` choice).
- Caveat: high-C values may fall outside sRGB. Always gamut-map (clip C, not L, when reducing to sRGB).

### Display P3
- Wider gamut than sRGB. Most modern Apple displays and many high-end PC monitors are P3 or wider.
- Authored as `color(display-p3 r g b)` in CSS.
- Useful for: brand colors that look noticeably more vivid when not clipped to sRGB.
- Trade-off: requires fallback for non-P3 displays. Author both: P3 first, sRGB fallback.

### Rec.2020
- HDR-class wide gamut. Currently rare in design tooling. P3 is the practical wide-gamut target for 2026.

## Which space for which operation

| Operation | Compute in | Encode as |
|---|---|---|
| Lightness ramp (50–950) | OKLCH (lock H, sweep L) | sRGB hex + `oklch()` |
| Mixing two arbitrary colors | OKLab | sRGB hex |
| Hue arc / rainbow gradient | OKLCH with explicit `shorter`/`longer hue` | `oklch()` or sRGB stops |
| Tint (mix toward white) | OKLab | sRGB hex |
| Dark-mode L inversion | OKLCH | sRGB hex + `oklch()` |
| Contrast comparison (WCAG 2) | sRGB linear-light Y | n/a — comparison only |
| Contrast comparison (APCA) | per-spec sRGB transform | n/a |
| Wide-gamut brand vivid | OKLCH → P3 | `color(display-p3 ...)` with sRGB fallback |
| Categorical scale | OKLCH (vary L and H, often C) | sRGB hex |

## Why OKLCH is the modern default for design tokens

1. **Perceptual lightness.** Step sizes in L look uniform across the ramp.
2. **Hue stability.** A hue rotation does not silently shift apparent lightness.
3. **Chroma decoupling.** You can pull chroma down at the ends of a ramp without dragging L with it.
4. **Browser support.** `oklch()` is supported in current Chromium, Firefox, and Safari. For older targets, emit hex.
5. **Tooling.** `culori` and `colorjs.io` both support OKLCH first-class. Verify maintenance status at build time per spec §11.

## Gamut mapping

When OKLCH-computed values fall outside sRGB:
- **Naive RGB clamp** distorts hue and lightness.
- **Reduce C, keep L and H.** Iteratively decrease C (binary search) until the color is in-gamut. This preserves perceived lightness and hue, sacrificing only saturation.
- `colorjs.io` exposes this as `toGamut({ space: 'srgb', method: 'css' })`. `culori` exposes `clampChroma`.

## Conversion pseudocode (reference)

OKLab from linear sRGB (Björn Ottosson, 2020):

```
l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
l_ = cbrt(l); m_ = cbrt(m); s_ = cbrt(s)
L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
b = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
```

OKLCH from OKLab:

```
C = sqrt(a*a + b*b)
H = atan2(b, a) * 180/PI    # normalize to [0, 360)
```

In practice, do not hand-roll. Use a vetted library; see `conversions.md`.

## Common mistakes specific to color spaces

- **Mixing in sRGB hex space.** `(#ff0000 + #00ff00) / 2 = #808000` — mathematically yes, perceptually a muddy olive. Mix in OKLab.
- **Ramping in HSL.** `L: 95→5` looks fine on blue (L=50 blue is dim); the same step pattern on yellow plateaus at the top because perceived L of HSL-yellow is already near 100.
- **Round-tripping through HSL to "fix" a hue.** Each round-trip introduces drift. Stay in OKLCH.
- **Treating CIELAB and OKLab as interchangeable.** They are similar but not identical; OKLab corrects perceptual issues in CIELAB at high chroma. Pick one and stay there.
- **Authoring `oklch()` with no sRGB fallback for legacy targets.** If your project supports browsers without `oklch()` support, emit a hex fallback in the same custom property declaration via `@supports` or build-time emission.

## Decision shortcut

- One color, casual tweak: HSL is fine.
- Anything that ships in tokens, ramps, gradients, or interpolation: OKLCH/OKLab.
- Wide-gamut brand: P3 with sRGB fallback.

If unsure, default to OKLCH and encode hex alongside.
