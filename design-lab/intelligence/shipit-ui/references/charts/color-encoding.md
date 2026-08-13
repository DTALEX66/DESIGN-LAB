# Color Encoding for Charts

Three families, three jobs. All values reference tokens — never bare hex.

## Categorical — distinguish series

Use when each color identifies a distinct, unordered category (line series, bar groups, scatter clusters).

**Default palette: Okabe-Ito** (8 colors, colorblind-safe across deuteranopia, protanopia, tritanopia).

| Token | Role |
|---|---|
| `--chart-cat-1` | First series |
| `--chart-cat-2` | Second series |
| `--chart-cat-3` | Third series |
| `--chart-cat-4` | Fourth series |
| `--chart-cat-5` | Fifth series |
| `--chart-cat-6` | Sixth series |
| `--chart-cat-7` | Seventh series |
| `--chart-cat-8` | Eighth series |

Underlying values (defaults; project may override):

```
--chart-cat-1: #0072B2;   /* blue */
--chart-cat-2: #E69F00;   /* orange */
--chart-cat-3: #009E73;   /* green */
--chart-cat-4: #CC79A7;   /* reddish purple */
--chart-cat-5: #56B4E9;   /* sky blue */
--chart-cat-6: #D55E00;   /* vermilion */
--chart-cat-7: #F0E442;   /* yellow (use sparingly on light bg) */
--chart-cat-8: #000000;   /* black / strong neutral */
```

Dark mode supplies higher-luminance variants of each token. The same `--chart-cat-N` resolves correctly in both themes; component code does not branch on theme.

**Hard cap: 8.** Beyond 8 categories, group "Other" or change the chart type.

**Color Universal Design (CUD)** is an alternate palette that swaps a few hues for slightly better print performance. Either is acceptable; do not mix.

## Sequential — magnitude on a single hue

Use when color encodes an ordered, unsigned quantity (heatmap intensity, choropleth value).

| Token | Role |
|---|---|
| `--chart-seq-50` | Lightest, smallest magnitude |
| `--chart-seq-100` | … |
| `--chart-seq-300` | Mid-low |
| `--chart-seq-500` | Mid |
| `--chart-seq-700` | Mid-high |
| `--chart-seq-900` | Darkest, largest magnitude |

Rules:
- Single hue, varying lightness. Multi-hue ramps are sequential only when carefully constructed (e.g., viridis); never roll your own.
- Avoid rainbow ramps for sequential data — they introduce false bands and suggest categorical breaks where none exist.
- Reverse direction in dark mode (light = small magnitude, dark = large magnitude → in dark mode, dim = small, bright = large).

## Diverging — magnitude around a baseline

Use when color encodes a signed value with a meaningful midpoint (gain/loss, sentiment, deviation from goal, hot/cold).

| Token | Role |
|---|---|
| `--chart-div-low-700` | Strongest negative |
| `--chart-div-low-500` | Mid negative |
| `--chart-div-low-200` | Light negative |
| `--chart-div-mid` | Neutral midpoint |
| `--chart-div-high-200` | Light positive |
| `--chart-div-high-500` | Mid positive |
| `--chart-div-high-700` | Strongest positive |

Rules:
- Two hues that meet at a clearly neutral midpoint. The midpoint must be visibly distinguishable from either end.
- Avoid red/green diverging without a redundant channel. ~8 % of men cannot distinguish red and green; the bar's sign or an arrow must also encode direction.
- Symmetric extremes — equal saturation and luminance distance from neutral. Asymmetric ramps imply asymmetric importance.

## Semantic colors (status, never magnitude)

| Token | Use |
|---|---|
| `--color-success-500` / `--color-success-600` | Positive outcomes, gains, "up is good" |
| `--color-danger-500` / `--color-danger-600` | Errors, losses, breaches |
| `--color-warning-500` / `--color-warning-600` | At-risk, slow, threshold-near |
| `--color-info-500` / `--color-info-600` | Neutral notice |

These are for badges, alerts, deltas, and threshold lines — not for series in a multi-series chart. A line chart's first series is `--chart-cat-1`, not `--color-success-500`, even if the metric trends up.

## Red / green caveats

The single most common color-encoding mistake.

- ~8 % of men and ~0.5 % of women have red-green color vision deficiency.
- Red-up / green-down is a common Western convention but is not universal — in some Asian markets red is positive (gain).
- **Always pair red/green with a redundant channel:** an arrow, a sign (+/−), a text label, a shape, a position.
- For multi-series charts, never use red and green as your two series colors.

## Maximum distinct categories

| Chart | Max categorical colors |
|---|---|
| Line | 5 visible at once (faded "all" view fine if interactive) |
| Stacked bar | 4 |
| Grouped bar | 3 |
| Pie / donut | 4 (and only when slices sum to 100%) |
| Scatter | 5 |
| Sankey | unlimited (but ≤ 30 nodes total) |

## Dark mode

Categorical hues need higher luminance in dark mode to pass contrast. The token resolves to different underlying values per theme; component code reads `--chart-cat-N` and never branches.

Sequential and diverging ramps invert intuition in dark mode: on a dark background, "more luminous" reads as "more". Verify the ramp direction in both themes before shipping.

## Verification checklist

- Run the palette through a deuteranopia simulator (Stark, Color Oracle, browser DevTools). All series remain distinguishable.
- Print test (greyscale): the order of series should still be inferable from luminance ordering.
- Background contrast: every series color hits ≥ 3:1 against the chart background, in both themes.
- The legend swatch is the same shape and stroke as the chart mark (filled square for area, line+dot for line series).

## Cross-references

- `references/charts/chart-types.md` — when to use each chart family.
- `references/charts/chart-anatomy.md` — legend, tooltip, gridline color tokens.
- `skills/data-visualization/SKILL.md` § 3 — encoding hierarchy.
