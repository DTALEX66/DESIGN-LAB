# Ramps (50–950)

A ramp is a perceptually monotonic sequence of lightness values for one hue. Tailwind and Radix ship 11-step ramps. The step labels (50, 100, 200…900, 950) are conventional; the L values behind them are what matters.

## Step convention

| Step | Role | Typical L (light mode) |
|---|---|---|
| 50  | Tinted surface, faintest backgrounds | 97–98 |
| 100 | Subtle surface, low-emphasis fills | 94–95 |
| 200 | Hairline borders, dividers | 88–90 |
| 300 | Borders, disabled fg | 80–82 |
| 400 | Solid borders, secondary fg on tinted bg | 68–72 |
| 500 | Brand mid (often the "name" of the hue) | 56–60 |
| 600 | Hover for 500-on-light | 48–52 |
| 700 | Active, strong fg | 40–44 |
| 800 | High-emphasis fg, solid surface text | 30–34 |
| 900 | Headings on light, near-max emphasis | 22–26 |
| 950 | Maximum emphasis, near-black with hue | 14–18 |

These are starting targets, not laws. Some hues need adjustment (yellow plateaus high; deep blue compresses low). The Radix scales' philosophy — each step has a specific UI role — is more useful than treating numbers as mere lightness labels.

## Lightness curve

A linear L sweep (e.g., L=98 down to L=18 in 11 even steps) is uneven perceptually because the human eye discriminates more finely in mid-tones. Common curves:

### Linear in OKLCH L
- Even arithmetic steps in L.
- Surprisingly good in OKLCH because OKLCH L is already perceptual.
- Default starting point.

### Bezier-eased L
- Compressed near the ends, stretched in the middle.
- Useful when the brand mid (500) needs to be exactly at a target L (e.g., 58) and the ends are pinned at 97 and 16.
- Produces more usable mid-tones for borders, hovers, and emphasis.

### Custom anchor-driven
- Pin L at three or four anchor steps (e.g., 50: 97, 500: 58, 950: 16) and interpolate between.
- Most flexible; matches what design teams actually want.

Recommended: anchor-driven with 3 anchors (50, 500, 950) and monotonic-cubic interpolation between. Verify the resulting L sequence is strictly monotonic.

## Chroma curve

Chroma should not be flat across the ramp:

- At very high L (≥ 95), high C looks dirty (you can't have a vivid pastel — the math says yes, the eye says muddy).
- At very low L (≤ 20), high C is impossible in sRGB anyway (gamut clips).
- The 400–700 range supports the highest meaningful chroma.

Recommended C curve: **peak around step 500–600, taper toward both ends.** A symmetric bell or skewed bell (peak at 600, gentler taper toward dark end).

```
L:  98  95  90  82  72  58  50  42  34  26  18
C: .02 .04 .08 .12 .18 .22 .22 .20 .16 .10 .06
```

Adjust per hue: yellows max around C=0.20 in sRGB; blues can hold C≈0.27.

## Hue stability vs hue correction

Default: **lock H across the ramp.** This is what most users expect from a "blue" scale.

Exception — perceptual hue correction: very dark blues drift toward purple in sRGB-clipped output. A small H adjustment (±3–5°) at the dark end can keep the perceived hue stable. Do this consciously; document it in the ramp generator.

Anti-pattern: drifting hue 10°+ across a ramp because "it looks better." It looks unintentional. Lock and only correct with stated reason.

## Cold vs warm ramps

Warm hues (reds, oranges, yellows) and cold hues (blues, cyans) carry different perceived weight at equal L:

- Warm at L=58 feels heavier than cold at L=58.
- The 500 step on a warm hue often wants L≈54; on a cold hue L≈60.
- Adjust per-ramp; don't force one curve to fit every hue.

## Generating a ramp — recipe

Input: anchor hex, target H if known.

1. Convert anchor to OKLCH.
2. If anchor is intended to be the 500 step, lock its H and use its C as the chroma peak.
3. Build L sequence: anchor-driven (50: 97, 500: anchor.L, 950: 16) with monotonic-cubic interpolation.
4. Build C sequence: bell curve peaking at 500–600, scaled by anchor.C.
5. Compose `oklch(L C H)` for each step.
6. Gamut-map each to sRGB (reduce C, preserve L and H).
7. Verify monotonic L; if any step's L crosses its neighbor, fail loudly and adjust anchors.
8. Verify minimum perceptual delta between steps (ΔE in OKLab ≥ ~3 between adjacent steps).
9. Run contrast checks for the pairs you'll actually ship (see `accessibility.md`).

## Dark-mode inversion strategies

Dark mode is **not** filter:invert. It is a deliberate re-tuning of the same hue.

### Strategy A: hue-preserving lightness mirror
- Map L_dark[step] = 100 − L_light[reverse_step].
- Reverses the role: light-mode 50 (near-white) becomes dark-mode 950 (near-black) and vice versa.
- Often combined with a slight C adjustment (dark backgrounds tolerate less chroma at low L; reduce C of dark steps).
- Best when surfaces and emphasis flip cleanly.

### Strategy B: chroma-preserving with flat lightness offset
- Subtract a constant from each L; re-clamp.
- Simpler, but loses the perceived contrast that mid-tones get in dark mode.
- Acceptable for accent hues, rarely best for neutral surfaces.

### Strategy C: independent dark ramp
- Generate dark ramp from scratch with its own anchors (often a different anchor hex tuned for dark surfaces).
- Most work; best result for premium products.
- Use when brand recognition in dark mode matters more than mathematical symmetry.

### Practical default

For tokens generated by `/palette`:

- Strategy A for accent hues (brand, status).
- Strategy A with C reduced by ~15% in the L < 30 range for neutrals (dark surfaces tolerate less chroma).
- Surface tokens are not generated by L-flip — they're authored as a separate set (see `tokens-recipe.md`).

## What about Radix-style 12-step?

Radix uses 12 steps (1–12) with a different role assignment. If the project has Radix conventions, map:

| Radix | Role | Tailwind equivalent |
|---|---|---|
| 1 | App background | 50 |
| 2 | Subtle background | 100 |
| 3 | UI element bg | 200 |
| 4 | Hovered UI bg | 200/300 |
| 5 | Active UI bg | 300 |
| 6 | Subtle border | 300/400 |
| 7 | UI border | 400 |
| 8 | Hovered border | 500 |
| 9 | Solid bg (brand) | 500/600 |
| 10 | Hovered solid bg | 600 |
| 11 | Low-contrast text | 700 |
| 12 | High-contrast text | 950 |

Don't ship both naming systems in one project. Pick one based on stack convention; this skill defaults to 50–950 to match Tailwind, the more common case.

## Common mistakes

- **Linear L in HSL.** Looks plateaued at warm hues, jumpy at cold.
- **Constant C across the ramp.** Mids look fine, ends look dirty or flat.
- **Hue drift "to taste."** Always document a deliberate H deviation.
- **Generating dark by inverting L only on accent ramps but using filter:invert on neutrals.** Surfaces will look greenish or pinkish depending on the OS profile.
- **Pinning the anchor as 500 when it isn't.** If the brand color is dark (L≈30), it's a 700/800, not a 500. Either accept that the brand color is a 700 in the scale, or rebuild the scale around a lighter L for 500.
- **Generating 11 steps then "fixing" step 400 manually.** Manual fixes in the middle of a generated ramp create kinks. Adjust the curve, not one step.
