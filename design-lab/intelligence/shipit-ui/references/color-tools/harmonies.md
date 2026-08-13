# Color Harmonies

Harmony rules from color theory map to hue-angle relationships. They are starting points, not guarantees — a "correct" triadic palette can still feel chaotic if chroma and lightness aren't matched. Always verify in OKLCH (lock L and C while you rotate H, then deviate intentionally).

## The harmonies

Angles below are hue offsets in OKLCH. Compute against an anchor hue.

### Complementary (180°)
- Two hues opposite on the wheel.
- High contrast; risk of vibration when both are at high chroma and similar L.
- Works for: sharp focal accents (CTAs against muted surfaces).
- Falls flat when: used at equal weight; both hues fight for dominance.
- Mitigation: keep one at full chroma, the other at half chroma or lower L.

### Split-complementary (anchor + 150°, anchor + 210°)
- Softer than complementary; keeps high contrast without the vibration.
- Works for: editorial palettes, brand accent + two warm/cool variants.
- Failure mode: the two complement-adjacent colors can look like a mistake unless their L is matched.

### Analogous (anchor ± 30°, optionally ± 60°)
- Adjacent hues; serene, low-tension.
- Works for: ambient surfaces, calming product UIs, dashboards where color shouldn't shout.
- Falls flat when: used for categorical data — too easy to confuse adjacent series.
- Pairing rule: pick one as primary, the others at lower chroma or smaller area.

### Triadic (120°, 240°)
- Three hues equally spaced.
- Vibrant when balanced; chaotic if all at full chroma and matched L.
- Works for: playful brands, illustration systems.
- Practice: one dominant, two subordinate. Lower chroma on the subordinates.

### Tetradic (rectangle: anchor, +60°, +180°, +240°)
- Four hues, two complementary pairs.
- Hard to balance; one pair tends to dominate.
- Works for: large palettes where you have many surfaces; editorial systems.
- Falls flat when: applied without a clear hierarchy.

### Square (anchor, +90°, +180°, +270°)
- Four hues equally spaced.
- More balanced than tetradic but more dissonant; harder to harmonize.
- Use cautiously; usually one anchor dominates and the rest accent.

### Monochromatic (single hue, varying L and C)
- Variations of one hue.
- Works for: 11-step ramps, minimalist brands, surfaces.
- Failure mode: lacks a focal accent — pair with a single complementary or neutral surface.

### Neutral + accent
- Most production UIs in practice. A 5–7-step neutral ramp + 1 brand hue + status hues.
- This is what `tokens-recipe.md` ships by default.

## Harmony selector

| Brand goal | Recommended harmony | Notes |
|---|---|---|
| Calm, editorial, content-led | Analogous + neutral | Keep brand chroma moderate. |
| Conversion-focused (SaaS, e-commerce) | Neutral + brand + complementary accent | Reserve complement for primary CTA only. |
| Playful, B2C product | Triadic with one dominant | Cap chroma on subordinates. |
| Data-dense (dashboards) | Neutral + categorical scale | Use a colorblind-safe categorical (Okabe-Ito). See `accessibility.md`. |
| Trust / financial / health | Monochromatic + neutral, single accent | Avoid wide hue spread. |
| Luxury / fashion | High-contrast neutral + restrained accent | Often near-monochromatic with a deep brand hue. |
| Status semantics (success/warning/danger/info) | Distinct hues at matched L; non-color reinforcement | Pair with icon/shape; verify under simulation. |

## OKLCH-correct harmony recipe

Starting from anchor `H₀, C₀, L₀`:

1. Rotate H by the harmony offset. Keep C and L equal at first.
2. Generate ramps for each anchor (lock its H, sweep L; see `ramps.md`).
3. **Check perceived weight.** Even with matched L, some hues feel heavier (yellows often look lighter at the same L; blues feel heavier). Adjust C downward on the heavier-feeling hue if needed.
4. Verify under colorblind simulation. Triadic palettes that look distinct to a trichromat may collapse to two hues under deuteranopia. See `accessibility.md`.
5. Pick a single dominant. A palette with no dominant feels indecisive.

## Common ways harmonies fall flat

- **Hue-only thinking.** Two complementary hues at mismatched L look like a mistake.
- **Equal-weight three-hue palettes.** Without a dominant, the eye has nowhere to rest.
- **Saturated triadic.** Saturday-morning-cartoon energy. One must be subordinate.
- **Analogous palette for categorical data.** Adjacent hues confuse when each represents a discrete category.
- **Complementary for status.** Red/green works visually but fails for ~5% of users without redundant cues.
- **Monochromatic with no neutral.** Surfaces have nowhere to "rest"; everything competes.
- **Square palette as four equals.** Almost never works; pick a hierarchy.

## When to break the rules

- **High-fashion / editorial.** Deliberate dissonance can be the point. Document the deviation; don't let it leak into status colors.
- **Brand hand-off.** If marketing has fixed brand hues that don't map cleanly, treat them as anchors and build the rest of the system around them.
- **Cultural color associations.** Red/green are not universally success/danger. Note assumptions in tokens (`--color-success`) so they can be overridden per-locale if needed.

## What this skill writes

When asked for a harmony from an anchor:

1. State the anchor in OKLCH.
2. Compute the harmony partners with hue rotation only (locked L, locked C).
3. Adjust C downward on perceptually-heavier hues (note the adjustment).
4. Generate ramps for each (per `ramps.md`).
5. Run the accessibility check (per `accessibility.md`).
6. Output: harmony name, anchors with rationale, full ramps, contrast & simulation report.

Never output "use this harmony" without naming it and stating why over the alternatives.
