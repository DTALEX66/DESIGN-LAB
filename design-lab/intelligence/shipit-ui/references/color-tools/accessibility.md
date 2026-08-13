# Accessibility — Contrast & Colorblind Safety

Contrast is a floor, not the goal. A palette can pass WCAG AA and still be unreadable for a deuteranope, or look garbled in a high-contrast forced-colors mode. Verify all three: WCAG, simulated colorblind perception, and forced-colors degradation.

## WCAG 2.1 contrast

Rule of thumb: ratio of relative luminances, `(L1 + 0.05) / (L2 + 0.05)`, where L is computed from sRGB linear-light Y.

| Level | Body text | Large text (≥18pt or ≥14pt bold) | Non-text UI |
|---|---|---|---|
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | (no AAA for non-text) |

**AA is the floor for production.** Aim AAA on body text where the design allows. Status colors must hit at least 3:1 against the surface they sit on.

### Pseudocode

```js
function relativeLuminance({r, g, b}) {
  const c = (v) => {
    v /= 255;
    return v <= 0.03928 ? v/12.92 : ((v + 0.055)/1.055) ** 2.4;
  };
  return 0.2126*c(r) + 0.7152*c(g) + 0.0722*c(b);
}

function wcagContrast(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}
```

### Pairs to verify

For every ramp you ship, verify these pairs at minimum:

- `--color-fg` on `--color-surface` — body text floor.
- `--color-fg` on `--color-surface-elevated` — body text on cards/sheets.
- `--color-fg-muted` on `--color-surface` — secondary text floor (3:1 for large text only; if used for body, must hit 4.5:1).
- `--color-brand` on `--color-surface` — brand link/button floor.
- White (`#fff`) on `--color-brand-{500..700}` — brand button label.
- `--color-ring` against the colors it surrounds — focus ring visibility.
- Each state color (success/warning/danger/info) at solid step on its corresponding bg.

### Common WCAG mistakes

- **Checking only one pair.** Body 400 is one of many.
- **Ignoring the elevated surface.** Cards on white have a different floor than text on white.
- **Disabled fg below 3:1.** WCAG 2 explicitly exempts "incidental" and disabled UI from contrast requirements, but disabled-but-readable is better practice. Aim 3:1.
- **Forgetting hover/active states.** A button passing on its base color may fail on hover-darken.

## APCA (the modern alternative)

APCA (Advanced Perceptual Contrast Algorithm, Andrew Somers) is more predictive of body-text readability than WCAG 2.x. Drafts of WCAG 3 (Silver) reference it, but it is **not yet a normative WCAG requirement.**

We align our APCA usage to the public Working Draft as of 2026 (see https://github.com/Myndex/apca-w3). Alternative implementations (BPCA proposals, slight constant tweaks) exist; we don't redistribute matrices in this skill.

### Output

APCA returns Lc (lightness contrast) on a roughly −108 to +106 scale; sign indicates polarity (dark text on light vs light on dark).

| `|Lc|` | Recommendation |
|---|---|
| ≥ 90 | Body text (small) |
| ≥ 75 | Body text (mid) |
| ≥ 60 | Larger body, headlines (24px+) |
| ≥ 45 | Large headlines, decorative |
| < 45 | Not for text (icon/UI only at most) |

These are guidance from the APCA spec, not a regulation. **Ship WCAG 2 AA as the floor; report APCA Lc alongside for richer guidance.** When the two disagree, prefer the stricter outcome until WCAG 3 lands.

### When APCA matters most

- Dark mode body text — WCAG 2 over-rewards dark backgrounds; APCA models this correctly.
- Mid-tone text on mid-tone backgrounds — WCAG 2 can pass borderline pairs that look weak.
- Very light text on near-white — WCAG 2 can be optimistic; APCA penalizes it.

## Colorblind safety

Roughly 8% of men and 0.5% of women have some color-vision deficiency. Types:

- **Deuteranomaly / deuteranopia** — reduced/absent green sensitivity (most common).
- **Protanomaly / protanopia** — reduced/absent red sensitivity.
- **Tritanomaly / tritanopia** — reduced/absent blue sensitivity (rare).
- **Achromatopsia** — full grayscale; rare. The grayscale fallback test covers this.

### Simulation

We align dichromat simulation to **Brettel/Viénot/Mollon (1997)** — the most widely-implemented model. Anomalous-trichromat simulation per Machado et al. (2009) is more recent but less universally implemented; both are valid. Note the source you're using when reporting results.

In code:
- `culori` does not bundle CVD simulation; pair with `color-blind` or implement Brettel matrices directly.
- `colorjs.io` has experimental CVD; verify maintenance at build time.
- `chromatic` (Figma plugin) and `Stark` (browser/Figma) are good visual checkers for designer review.

### What to test

For every categorical or status palette:

1. Simulate deuteranopia and protanopia.
2. Confirm each color remains distinguishable from the others.
3. Confirm meaning is reinforced by a non-color channel (icon, shape, label, position).
4. Convert to grayscale (achromat fallback). Adjacent steps should still differ.

### Colorblind-safe palettes to reference

- **Okabe-Ito 8-color** (Okabe & Ito, 2008) — categorical, distinguishable across major CVD types. The default categorical palette to recommend when no brand constraint dictates otherwise:
  - `#000000` black
  - `#E69F00` orange
  - `#56B4E9` sky blue
  - `#009E73` bluish green
  - `#F0E442` yellow
  - `#0072B2` blue
  - `#D55E00` vermillion
  - `#CC79A7` reddish purple
- **Color Universal Design (CUD)** — broader Japanese standard; superset of Okabe-Ito approaches.
- **ColorBrewer** colorblind-safe schemes (sequential and diverging) — best for data viz with ordered values; see `dashboard-blueprints/` for chart usage.

### Status colors and the red/green problem

Default status pairs:
- Success: green (~H 145 in OKLCH)
- Warning: amber/yellow (~H 75)
- Danger: red (~H 25)
- Info: blue (~H 230)

Under deuteranopia, success-green and danger-red collapse toward similar yellows. Mitigations:

1. **Always pair with an icon/shape.** Check, alert-triangle, x-circle, info-circle.
2. **Lightness offset.** Make success a lighter L than danger, or vice versa, so even desaturated they differ.
3. **Don't rely on hue alone.** Position, shape, label, and color together.

This is constitution rule #2-adjacent: "Don't encode meaning in color alone."

## Forced-colors and prefers-contrast

Two media queries that get forgotten:

```css
@media (prefers-contrast: more) {
  :root {
    --color-fg: oklch(0% 0 0);
    --color-border: oklch(20% 0 0);
  }
}

@media (forced-colors: active) {
  /* Windows High Contrast — system colors only */
  .button { border: 1px solid CanvasText; background: ButtonFace; color: ButtonText; }
}
```

Under `forced-colors: active`, custom colors are overridden by system colors. Components should use semantic system color keywords (`CanvasText`, `ButtonText`, `LinkText`, `Highlight`) where it matters and avoid relying on background images for meaning.

## Reduced transparency

```css
@media (prefers-reduced-transparency: reduce) {
  :root { --color-overlay-bg: var(--color-surface-elevated); }
}
```

Replace translucent overlays with solid surfaces. Often forgotten alongside reduced-motion.

## Verification checklist (run before declaring color work done)

- [ ] WCAG AA passes on all body-text × surface pairs.
- [ ] WCAG AA passes on hover/active variants of interactive elements.
- [ ] Focus ring (`--color-ring`) is ≥ 3:1 against every surface it can sit on.
- [ ] APCA Lc reported alongside WCAG ratios.
- [ ] Status palette tested under deuteranopia and protanopia simulation; remains distinguishable.
- [ ] Status meaning reinforced by icon/shape/label, not color alone.
- [ ] Grayscale fallback: adjacent ramp steps still differ.
- [ ] `prefers-contrast: more` and `forced-colors: active` styles authored.
- [ ] `prefers-reduced-transparency` handled if any translucent surfaces ship.

If any item fails, fix at the ramp/token layer, not in the component.
