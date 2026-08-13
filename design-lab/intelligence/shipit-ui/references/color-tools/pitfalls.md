# Pitfalls — Final Pass Checklist

A checklist of mistakes the team has seen ship. Run before declaring color work done. Each item has a concrete example.

## Accessibility pitfalls

### Tooltip-only color coding
**Symptom:** Status of a row encoded only in row color; semantics revealed on hover.
**Why it fails:** Mobile/touch has no hover; screen readers ignore color; colorblind users see ambiguous tones.
**Fix:** Add an icon, badge, or inline label. Tooltip is augmentation, not encoding.

### Body text below 4.5:1 because "the design said muted"
**Symptom:** `--color-fg-muted` at 3.8:1, used on body paragraphs.
**Fix:** `--color-fg-muted` for ≥ 18pt or for non-essential UI only. Body text uses `--color-fg`. Verify per pair.

### Status semantics in red/green only
**Symptom:** Success/danger differ by hue, indistinguishable to deuteranopes.
**Fix:** Add icon (check/x), shape, position, or label. Lightness offset between success and danger helps too.

### Focus ring 1.5:1 against the active background
**Symptom:** `--color-ring` is the brand color, but the brand color sits on a brand-tinted surface in some component.
**Fix:** `--color-ring` must hit ≥ 3:1 against every surface it can sit on. If your brand is light, use a darker ring step.

### `prefers-reduced-transparency` ignored
**Symptom:** A frosted-glass overlay becomes a 30%-opacity blur; users with low vision lose all underlying contrast.
**Fix:** Define a solid fallback in the media query.

### `forced-colors: active` not authored
**Symptom:** Windows High Contrast strips your custom colors; buttons appear unstyled or worse.
**Fix:** Use system color keywords (`CanvasText`, `ButtonText`, `Highlight`) and test in HC mode.

## Ramp pitfalls

### Hue drift across the ramp
**Symptom:** `--color-blue-50` reads cool, `--color-blue-950` reads purple.
**Cause:** Hue was not locked across the ramp.
**Fix:** Lock H in OKLCH; only deviate at the dark end with a documented small correction (±3–5°).

### Mid-tones look dirty
**Symptom:** Steps 400–600 look muddy or grayish.
**Cause:** Constant chroma — high chroma at high L looks dirty in sRGB.
**Fix:** Bell-curve C, peaking at 500–600.

### Plateau at the top
**Symptom:** Steps 50, 100, 200 all look the same near-white.
**Cause:** L curve is too compressed at the high end.
**Fix:** Use anchor-driven L with monotonic-cubic interpolation.

### Brand color is at the wrong step
**Symptom:** Brand hex was a deep navy; got used as `--color-brand-500` even though its OKLCH L ≈ 28.
**Fix:** Either accept it as `--color-brand-800` and rebuild the scale around a lighter 500, or move the brand to a lighter L for the 500 step.

## Gradient pitfalls

### Default sRGB middle
**Symptom:** Two-hue gradient mid is muddy gray-brown.
**Fix:** `linear-gradient(in oklab, …)` for arbitrary mixes; `in oklch shorter hue` / `longer hue` for hue arcs.

### Conic without `in oklch`
**Symptom:** Color wheel passes through dirty mids.
**Fix:** `conic-gradient(in oklch longer hue, …)`.

### Animated gradient ignores reduced-motion
**Symptom:** Constant 12s background-position animation; users with vestibular sensitivity affected.
**Fix:** `@media (prefers-reduced-motion: reduce) { animation: none; }`.

### `background-clip: text` with no fallback color
**Symptom:** Gradient text invisible if the gradient fails or in older browsers.
**Fix:** Set `color: var(--color-fg)` first, then layer the gradient.

## Extraction pitfalls

### Palette generated from a tinted screenshot
**Symptom:** Extracted palette is 5–10ΔE off; team thinks the brand color is wrong.
**Fix:** Always extract from the source asset. If only a screenshot exists, warn and proceed cautiously.

### Largest cluster ≠ brand color
**Symptom:** Extracted "primary" is the photo's sky background.
**Fix:** Filter clusters by chroma (`C > 0.06`) before picking the primary.

### One hue family extracted
**Symptom:** Source image is monochromatic; extracted palette has no accent.
**Fix:** Detect; warn user; either supplement with `harmonies.md` or pick a lower-chroma cluster as accent and accept the limitation.

### K-means with random init = different result each run
**Fix:** Use k-means++ or run with fixed seed. Deterministic output is auditable.

## Mixing pitfalls

### `color-mix(in srgb, ...)` everywhere
**Symptom:** Mid-mixes muddy.
**Fix:** Default to `in oklab`.

### Compounded `color-mix` chains
**Symptom:** Hard to reason about; designers can't predict result.
**Fix:** Generate at build time. Use `color-mix` for one-step modulations only.

### Hover-darken that disappears in dark mode
**Symptom:** `--color-brand-hover: color-mix(in oklab, var(--color-brand) 90%, black)` works on light but vanishes on dark surfaces.
**Fix:** Define hover/active per theme, or use ramp steps (`--color-brand-700`) instead of mixes.

## Token pitfalls

### Naming after value
**Symptom:** `--light-blue: #3b82f6` later swapped to teal; name now lies.
**Fix:** Rename to `--color-blue-500` or `--color-brand`. Use scale or semantic, not adjective.

### Inventing single-use semantic tokens
**Symptom:** `--color-pricing-table-strikethrough-discount-bg`.
**Fix:** Inline a reference to an existing token, or reuse a state alias.

### Redefining scale tokens in a theme override
**Symptom:** `[data-theme="dark"] { --color-blue-500: oklch(20% …); }` — every consumer surprises.
**Fix:** Override aliases only.

### Mixed naming conventions in one file
**Fix:** Pick one. Document in the file header.

## Dark-mode pitfalls

### `filter: invert(1)` for dark mode
**Symptom:** Photos become negatives, brand color becomes its complement, shadows become glows.
**Fix:** Author a real dark palette. Co-emitted at token generation.

### Brand color not adjusted for dark
**Symptom:** `--color-brand` at L=30 is invisible on a dark surface.
**Fix:** Switch the alias to a lighter step (`--color-brand-400`) in dark mode.

### Surface-elevated darker than surface
**Symptom:** Cards are darker than the page in dark mode — counter to z-axis lighting intuition.
**Fix:** Elevated should be lighter than surface in dark mode (e.g., neutral-900 elevated, neutral-950 surface).

### Borders disappear in dark mode
**Symptom:** Border was `--color-neutral-200`; in dark this maps to a near-white that doesn't contrast with the dark surface as a hairline.
**Fix:** Borders use a different alias path in dark — typically a step that sits 2–3 L-units lighter than the surface, not a flat numeric inversion.

## General pitfalls

### "Looks fine on my monitor"
**Symptom:** Designer's monitor is calibrated and bright; users on TN panels see a different palette.
**Fix:** Verify on at least one cheap LCD; use OS color profiles where possible.

### Eyeballing contrast
**Symptom:** "It looks readable to me."
**Fix:** Run the math. Every pair you ship.

### Single-pass extraction → final tokens
**Symptom:** Treating extraction output as the final palette.
**Fix:** Extraction produces anchors. Anchors feed the ramp builder. Ramps feed the verifier. Tokens are the output of the verifier.

### Not testing in actual components
**Symptom:** Palette looks great in swatches; collapses in the real Button at 13px.
**Fix:** Verify at the target text size and against the surfaces the color will actually sit on.

## Final pre-ship checklist

Run all five blocks. Any failure routes you back to the indicated reference.

- [ ] **Spaces:** all computation in OKLCH/OKLab; encoded as hex + `oklch()` (`color-spaces.md`, `conversions.md`).
- [ ] **Ramps:** monotonic L; bell-curve C; locked H; all 11 steps perceptually distinct (`ramps.md`).
- [ ] **Accessibility:** WCAG AA on all text-pair × surface combos; APCA reported; status colors safe under deuteranopia/protanopia (`accessibility.md`).
- [ ] **Tokens:** scale → semantic → optional component; dark mode redefines aliases only; names match commitments (`naming.md`, `tokens-recipe.md`).
- [ ] **Polish:** gradients use `in oklab`/`in oklch`; reduced-motion authored; reduced-transparency authored; forced-colors handled (`gradients.md`, `accessibility.md`).
