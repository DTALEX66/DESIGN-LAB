# Design Rule: Tinted Neutrals (No Pure White on Pure Black)

> Don't use pure white on pure black. Color your neutrals. Tinted greys express a wider range of color, elevation, and depth.

This is a **default rule** for every palette and theme `shipit-ui-design` produces. To override, the user must explicitly request "pure neutrals."

## The rule

| Avoid | Prefer |
|---|---|
| `#FFFFFF` background | tinted near-white (e.g., `oklch(99% 0.005 250)`) |
| `#000000` background | tinted near-black (e.g., `oklch(13% 0.02 250)`) |
| Pure-grey ramps (`#E5E5E5`, `#737373`, etc.) | OKLCH-anchored tinted ramps with a small chroma value (0.005–0.025) |

## Why

- Pure `#000`/`#FFF` produces a 21:1 contrast — far above WCAG AAA. The eye fatigues quickly; long sessions feel harsh.
- Pure greys are perceptually flat. The eye reads them as "absence of color," which limits depth, elevation, and atmosphere.
- Tinted neutrals carry a hint of hue (typically the brand or its complement). They harmonize with the rest of the palette and give a designed feel.
- Tinted neutrals reduce simultaneous-contrast effects: text on a tinted bg shifts less visibly when adjacent surfaces use related hues.

## Recommended ranges (OKLCH)

For an 11-step neutral ramp matching Tailwind/Radix conventions:

| Step | Lightness (L) | Chroma (C) | Hue (H) — pick one tint |
|---|---|---|---|
| 50  | 98% | 0.005 | cool 250° / warm 70° / brand H |
| 100 | 96% | 0.008 | "" |
| 200 | 92% | 0.012 | "" |
| 300 | 86% | 0.016 | "" |
| 400 | 70% | 0.022 | "" |
| 500 | 56% | 0.028 | "" |
| 600 | 44% | 0.030 | "" |
| 700 | 34% | 0.030 | "" |
| 800 | 25% | 0.026 | "" |
| 900 | 18% | 0.022 | "" |
| 950 | 12% | 0.018 | "" |

Chroma should peak in the mid-tones (steps 400–700). Going above ~0.035 makes the neutral feel like a colored tone rather than a neutral. Going below ~0.005 returns to "perceptually pure" greys.

## Three practical tints

**Cool / slate** — hue 240°–260°. Modern, professional, fintech, dashboards. The most common safe default.

**Warm / sand** — hue 60°–80°. Editorial, marketing, hospitality, food, lifestyle. Feels human and approachable.

**Brand-tinted** — hue equal to the brand color's H. Creates the strongest harmony but only works when the brand has a single dominant hue. For multi-hue brands, default to cool.

## Token mapping

In `tokens.css`, neutrals appear under both their scale name and a semantic alias:

```css
/* scale */
--neutral-50:  oklch(99% 0.005 250);
--neutral-100: oklch(96% 0.008 250);
/* … */
--neutral-950: oklch(12% 0.018 250);

/* semantic — light mode */
--color-bg:               var(--neutral-50);
--color-surface:          #ffffff;          /* one explicit white is okay for elevated cards */
--color-surface-elevated: var(--neutral-50);
--color-fg:               var(--neutral-900);   /* not 950 — keeps contrast strong but not harsh */
--color-fg-subtle:        var(--neutral-600);
--color-border:           var(--neutral-200);
--color-border-subtle:    var(--neutral-100);

/* semantic — dark mode (data-theme="dark") */
--color-bg:               var(--neutral-950);
--color-surface:          var(--neutral-900);
--color-surface-elevated: var(--neutral-800);
--color-fg:               var(--neutral-50);
--color-fg-subtle:        var(--neutral-400);
--color-border:           var(--neutral-800);
--color-border-subtle:    var(--neutral-900);
```

Note: in light mode, `--color-surface` may be `#ffffff` (one explicit white is acceptable to give cards a clean lift over the tinted bg). In dark mode, never use `#000`.

## Body text contrast targets

| Pair | Target ratio |
|---|---|
| `--color-fg` on `--color-bg`, light mode | 12:1 – 17:1 (eye-comfortable but well above AAA) |
| `--color-fg` on `--color-bg`, dark mode | 12:1 – 16:1 |
| `--color-fg-subtle` on `--color-bg` | 5:1 – 7:1 (AA for body, AAA for large) |

These are a touch lower than the 21:1 of pure-on-pure — and that is the point.

## Common mistakes

1. Using `#000` for "primary brand black." Define a tinted near-black instead (e.g., `--neutral-950`).
2. Using `#FFF` everywhere in light mode. Reserve `#FFF` for cards/elevated surfaces; the page bg should be `--neutral-50`.
3. Using `filter: invert()` for dark mode. It produces washed-out colors and ignores the tint principle. Always emit explicit dark tokens.
4. Switching tint between light and dark modes. Use the same hue in both; only L and C change.
5. Setting chroma too high (>0.04) and ending up with a "blue-grey" or "tan" instead of a neutral.

## Token-level enforcement

The `design-system-keeper` skill warns when it sees:
- Bare `#000`, `#000000`, `rgb(0,0,0)`, `oklch(0% …)` in styles.
- Bare `#fff`, `#ffffff`, `rgb(255,255,255)`, `oklch(100% …)` outside the explicit `--color-surface` definition.
- A `var(--neutral-…)` ramp where the chroma reads as exactly 0 (suggests pure greys).

## Cross-references

- Color spaces and OKLCH basics → `references/color-tools/color-spaces.md`
- Building the full ramp → `references/color-tools/ramps.md`
- Contrast measurement → `references/color-tools/accessibility.md`
- Token recipe (where these aliases live) → `references/color-tools/tokens-recipe.md`
