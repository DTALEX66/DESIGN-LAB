---
name: color-engineering
description: Senior-level color work — perceptual color spaces (OKLCH/OKLab), 11-step ramps, accessibility (WCAG/APCA + colorblind safety), image extraction, harmonies, perceptual mixing, gradient interpolation, and token naming. Auto-activates on color-related edits and on edits to color sections of `tokens.css`.
type: skill
---

# Color Engineering

Color decisions in a design system propagate everywhere — once a hue or ramp is wrong, every component inherits the mistake. This skill is the toolkit a senior designer reaches for: perceptual ramps, contrast that holds at every weight, colorblind-safe categorical scales, gradients that don't mud out, and tokens that survive a dark-mode flip.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

## When this skill activates

- The user mentions: palette, ramp, hue, contrast, WCAG, APCA, colorblind, deuteranopia, gradient, OKLCH, OKLab, P3, theming, dark mode color.
- Edits to `tokens.css` color sections, `tailwind.config.*` color extensions, theme files exporting color tokens.
- Slash commands `/palette`, `/design init` (color portion), `/audit` (color & contrast scoring).
- Any image-to-palette extraction request.

## How to use the references

Do not load every reference. Pick by sub-task. Each file is ≤ 300 lines and self-contained.

| Sub-task | Read this |
|---|---|
| Pick the right color space for the operation | `references/color-tools/color-spaces.md` |
| Convert between hex/rgb/hsl/oklch, CSS syntax | `references/color-tools/conversions.md` |
| Pick or critique a harmony for a brand | `references/color-tools/harmonies.md` |
| Generate a 50–950 ramp (Tailwind/Radix style) | `references/color-tools/ramps.md` |
| Verify contrast / colorblind safety | `references/color-tools/accessibility.md` |
| Extract a palette from an image | `references/color-tools/extraction.md` |
| Mix colors, build tints/shades/tones | `references/color-tools/mixing-and-modulation.md` |
| Build a gradient that doesn't mud out | `references/color-tools/gradients.md` |
| Decide token names (semantic vs scale) | `references/color-tools/naming.md` |
| Ship a `tokens.css` color system | `references/color-tools/tokens-recipe.md` |
| Sanity-check before declaring color work done | `references/color-tools/pitfalls.md` |
| Find what you need fast | `references/color-tools/index.md` |

## Senior-level guidance

### Default to OKLCH for design tokens

OKLCH is perceptually uniform: equal Lightness steps look equal, Chroma is decoupled from Lightness, and Hue is stable as Lightness changes. Use OKLCH for ramps, mixing, and interpolation. Encode the final value as sRGB hex (or `oklch()` in CSS where browser support is acceptable — see `conversions.md`). Keep one source of truth: the OKLCH values in the token build, with hex emitted alongside for legacy contexts.

Why not HSL: HSL's L is luminance-incorrect (yellow at L=50 looks far brighter than blue at L=50), and a fixed-L hue sweep produces wildly uneven brightness. HSL is fine for casual UI tweaks; do not generate ramps or interpolate gradients in it.

### Common mistakes to refuse to make

- **Naive HSL interpolation.** Two complementary colors mixed in HSL or sRGB produce a muddy mid-point (often a desaturated gray-brown). Mix in OKLab; for hue arcs, OKLCH with explicit `shorter hue` / `longer hue`.
- **Contrast checked at one weight only.** AA-pass on Body 400 is meaningless if the same color is used for 600/700 emphasis. Verify each text weight × background pair you ship.
- **Categorical scales picked by hue alone.** Two hues at equal lightness are indistinguishable in grayscale and to several types of colorblind viewers. Vary lightness and chroma; verify with simulation.
- **"Brand red/green" with no colorblind alternative.** Status semantics encoded only in red vs green fail for ~5% of users. Pair every status color with a shape, icon, or label.
- **Mixing perceptual and non-perceptual ops in the same flow.** Don't compute a ramp in OKLCH then "tweak" mid-tones in HSL. Round-tripping through HSL silently rotates hue and shifts chroma. Stay in one space until you encode for output.
- **Dark mode as filter:invert.** Photos invert to negatives, shadows become glows, brand color becomes its complement. Always emit a real dark palette.
- **Hue drift across a ramp.** A ramp that starts at H=250 and ends at H=265 looks "off" without being obviously wrong. Lock hue and let only L (and a chroma curve) move, unless deliberately doing a perceptual hue correction (see `ramps.md`).
- **Using a screenshot as the extraction source.** OS color-management or a tinted display can shift the source by 5–10ΔE. Prefer the original asset.
- **Forgetting `prefers-contrast` and `forced-colors`.** Tokens should degrade gracefully under Windows High Contrast and user-elevated contrast preferences (see `tokens-recipe.md`).

### Perceptual vs aesthetic

OKLCH gets you to a defensible baseline. Final sign-off is still visual. After generating a ramp, view the swatches at the actual sizes they will appear (a 12px caption is not a 96px hero) and against the surfaces they will sit on. Perceptual math gets the math right; designers correct for context.

### Be honest about uncertainty

- **APCA** (Advanced Perceptual Contrast Algorithm) is more predictive than WCAG 2.x for body text but is not yet a normative WCAG 3 requirement. Ship AA as the floor; report APCA Lc alongside for the team's information. See `accessibility.md` for thresholds and the source we align to.
- **Colorblind simulation matrices** vary across publications. We align to Brettel/Viénot/Mollon (1997) for dichromat simulation and to Okabe-Ito (2008) and ColorBrewer for safe categorical palettes; alternatives exist (Machado et al. 2009 anomalous-trichromat models).
- **Library choice (verify at build time per spec §11):** `culori`, `colorjs.io`, or hand-rolled OKLCH for `/palette`. Selection criteria in `conversions.md` — do not hard-pick one in generated code without confirming current maintenance status.

### Token names this skill commits to

All examples in references and generated outputs use these names. Do not invent parallel names.

- Scale: `--color-{hue}-{50..950}` (e.g., `--color-blue-500`).
- Surfaces: `--color-surface`, `--color-surface-elevated`.
- Foreground: `--color-fg` (and `--color-fg-muted`, `--color-fg-subtle` where needed).
- Borders: `--color-border` (and `--color-border-strong`).
- Brand & focus: `--color-brand`, `--color-ring`.
- State scales (each with 50–950): `--color-success-*`, `--color-warning-*`, `--color-danger-*`, `--color-info-*`.

Semantic aliases reference scale tokens; dark mode redefines aliases, never the scale (see `tokens-recipe.md`).

### Dark mode is co-emitted, not derived at runtime

Generate light and dark together. The dark variant is not `invert(light)` — it is a deliberately re-tuned set of L values (and often C values) on the same hue. See `ramps.md` for inversion strategies and the trade-offs between hue-preserving, chroma-preserving, and lightness-flipping approaches.

### When to stop optimizing

Stop when:
1. AA contrast holds for every text-weight × surface pair you ship.
2. Status colors remain distinguishable under deuteranopia and protanopia simulation, and meaning is reinforced by a non-color channel.
3. The ramp has monotonic perceptual lightness with no visible plateau or kink.
4. Dark mode preserves brand recognition (hue stable within ~5° OKLCH) while inverting surface relationships.
5. Token names match the commitments above and no raw hex appears in component code.

If any of these fails, return to the relevant reference and fix at that layer — do not patch downstream.

## Default workflow for `/palette`-style work

1. Establish anchor (hex, image, or mood) — see `extraction.md` if image, `harmonies.md` if mood.
2. Generate ramp in OKLCH — see `ramps.md`.
3. Verify contrast and colorblind safety — see `accessibility.md`.
4. Co-emit dark variant — see `ramps.md` (Dark-mode inversion).
5. Map scale tokens to semantic aliases — see `naming.md`, `tokens-recipe.md`.
6. Run the pitfall checklist — see `pitfalls.md`.
7. Write into `tokens.css`. Print swatch + contrast preview to terminal.

Skip steps only with a stated reason. Most "the palette feels off" reports trace to a skipped step 3 or 6.
