---
name: data-visualization
description: Apply senior chart-design knowledge — pick-the-right-chart framework, color encoding, axis honesty, accessible alt-text, responsive sizing — when generating or refining charts in dashboards or files importing recharts, visx, tremor, echarts, chart.js.
type: skill
---

# Data Visualization

Senior reference for charts in product UI. Assumes the reader can read a chart; the goal is to surface the encoding decisions, axis-honesty rules, and accessibility patterns that separate a credible chart from a pretty one.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## 1. Pick the chart from the question

Charts answer questions. Pick the chart from the question, never from the data shape.

| Question | Default chart | Notes |
|---|---|---|
| How does X compare across categories? | Horizontal bar | Vertical only when categories ≤ 5 and labels are short |
| How does X change over time? | Line | Multi-series cap: 5 lines visible |
| How is X distributed? | Histogram or box plot | Bar chart over numeric bins ≠ histogram; spacing matters |
| What's the share of a whole? | Stacked bar (single bar) > pie | Pie only at ≤ 4 slices and parts that sum to 100% |
| How does X relate to Y? | Scatter | Add trendline only when correlation is genuine |
| Where are the hot spots? | Heatmap | Time × category matrix is its sweet spot |
| What's the flow between states? | Sankey | Reserve for genuine flows; not for everything-is-a-process |
| Hierarchical share? | Treemap | When tree depth ≤ 3 and area comparison matters |
| OHLC over time (finance)? | Candlestick | Reserved domain; do not adapt to non-finance |

When in doubt, a horizontal bar chart wins. It handles long labels, supports many categories, encodes a single number well, and is the most readable format. Full matrix in `references/charts/chart-types.md`.

## 2. Encoding — color is a last resort

Position is the strongest channel; length is next; angle/area are weak; color is the weakest. Encode the most important variable on the strongest channel available.

- A line chart already uses position (y) and length (x). Color distinguishes series; it does not encode magnitude.
- A bar chart uses length for magnitude; color should encode category, not redundantly encode magnitude (a single hue is fine).
- A heatmap is one of the few cases where color encodes magnitude — and only with a proper sequential or diverging scale.

Never use color as the only channel for an encoding. Pair with shape, pattern, or label.

## 3. Color palettes for charts

Three families, used for three jobs. Full token set in `references/charts/color-encoding.md`.

| Family | Use | Token shape |
|---|---|---|
| **Categorical** | Series in line/bar (≤ 8) | `--chart-cat-1` … `--chart-cat-8` (Okabe-Ito by default — colorblind-safe) |
| **Sequential** | Magnitude on heatmap, choropleth | `--chart-seq-50` … `--chart-seq-900` (single-hue ramp) |
| **Diverging** | Above/below baseline (gain/loss, sentiment) | `--chart-div-low` ↔ `--chart-div-mid` ↔ `--chart-div-high` |

Hard rules:
- **Max 8 categorical colors per chart.** Beyond 8, group "Other" or change chart type.
- **Colorblind-safe by default.** Okabe-Ito or the Color Universal Design palette. Verify with a deuteranopia simulator before shipping.
- **Red/green caveat.** ~8% of men cannot distinguish them. If you need gain/loss, pair with arrow/sign and use `--color-success-600` / `--color-danger-600` only when the symbol carries the meaning.
- **Single-hue sequential, not rainbow.** Rainbow ramps lie about magnitude — they introduce false bands.

## 4. Axis honesty

Axis decisions are ethics decisions.

- **Bar charts MUST start at zero.** A bar's length encodes magnitude; truncating the axis makes a 2 % difference look like a 200 % difference. The most-shipped chart lie.
- **Line charts MAY not start at zero.** A line encodes change over time; forcing zero often hides the trend. Pick a baseline that frames the relevant variation, but show the baseline value clearly.
- **Use log scale when the data spans > 2 orders of magnitude.** Always label the axis as log explicitly.
- **Dual y-axes are usually wrong.** They imply correlation that often isn't there. Use small multiples instead.
- **Time axes are linear in time, not in data points.** Missing days exist; do not compress them out.
- **Round axis ticks to human numbers** (1, 2, 5, 10, 20, 50…) — never `2.347 …`.

## 5. Annotations and reference lines

Numbers on a chart need context. Annotations carry that context.

- **Reference line** for goals, averages, prior period — 1 px dashed at `--color-text-2`, with a small label at the end.
- **Threshold band** for normal range — fill `--color-surface-2` between bounds.
- **Event markers** — vertical line at a known event ("Launch", "Outage"), label on top.
- **Callout** — pin to a specific data point with a leader line; never more than 2 callouts per chart.

Annotations belong to the chart, not the page. They go inside the SVG so they survive export.

## 6. Tooltips

Tooltips supplement; they never carry primary information.

- Trigger on hover **and** focus. Touch devices: tap to pin, tap-elsewhere to dismiss.
- Content: x value (formatted, full date including year), one row per series with swatch + label + value, total when stacked.
- Position: above the cursor, flips below if it would clip the viewport. Never covers the data point.
- 150 ms delay on entry to avoid flicker; instant on exit.
- Tooltip must also be reachable via keyboard — arrow keys move the focused datum; the tooltip mirrors the focus.

A chart whose only legend is the tooltip is broken. Tooltips supplement an existing visible legend.

## 7. Legend placement

| Placement | Use |
|---|---|
| Above plot, left-aligned | Default — readable without eye travel |
| Right of plot | When categories > 4 and short |
| Below plot | Mobile, or when plot is wider than legend |
| Inline (label at end of line) | Line charts with ≤ 5 series — best legibility |

Inline labels at the end of each line beat any legend for line charts. Do this whenever space allows.

Interactive legends (click to toggle a series) are excellent — but the toggle state must persist for the session and be keyboard-reachable.

## 8. Accessible alt-text for charts

Every chart MUST have alt text. The pattern:

> "[Chart type] showing [variable] over [domain]. [Headline insight]. [Range or notable point]."

Examples:
- "Line chart of daily active users from Jan to Mar 2026. Steady growth from 12k to 18k, with a dip on Feb 14."
- "Horizontal bar chart of revenue by region. North America leads at $4.2M, EMEA second at $2.8M, APAC third at $1.6M."

Beyond alt text, provide a "View as table" toggle on every chart. Screen-reader users, keyboard users, and analysts copying numbers all benefit.

```html
<figure role="figure" aria-label="…">
  <svg aria-hidden="true">…</svg>
  <figcaption class="sr-only">[full description]</figcaption>
  <button aria-controls="chart-table">View as table</button>
  <table id="chart-table" hidden>…</table>
</figure>
```

## 9. Animation rules

Charts animate to communicate change, not to entertain.

- **Entrance**: 600 ms, ease-out-quint. Lines draw left-to-right; bars grow from baseline. Disable under `prefers-reduced-motion`.
- **Update** (data change, filter change): 300 ms, ease-in-out-cubic. Animate position, not opacity flicker. Respect reduced motion.
- **Hover / focus highlight**: 150 ms, ease-out-quint. No layout shift.
- **Suppress animation when:** the chart updates more than once every 2 seconds (live data); the user changes the time range (snap, don't morph); the dataset cardinality changes (a bar appearing from nothing reads as a glitch — fade in only).

Tokens: `--dur-150 / 300 / 600`, `--ease-out-quint`, `--ease-in-out-cubic` — see `references/charts/chart-motion.md`.

## 10. Responsive sizing and density

A chart that only works at 1440 is a screenshot. Three sizes for one chart:

| Size | Width | Height | Decoration |
|---|---|---|---|
| **Sparkline** | 80–160 px | 24–40 px | No axes, no legend, no tooltip — context lives elsewhere |
| **Card chart** | 280–600 px | 160–240 px | Title outside, axes minimal, legend if needed |
| **Full chart** | ≥ 600 px | 280–360 px | Full title, axes, legend, annotations, tooltip |

Below 768 px:
- Drop minor gridlines.
- Move legend below or behind a toggle.
- Reduce tick density (every other tick).
- Charts in tabs / accordions on mobile, not stacked grids.

Sparklines have no tooltip; their context lives in the surrounding KPI tile (label + value + delta). Don't rebuild a chart inside a sparkline.

## 11. Library guidance — verify at build time

Per spec section 11, do not lock a chart library in the design. Detect what the project already uses; if none, present 2–3 candidates and selection criteria, then ask.

| Library | Pick when |
|---|---|
| **Recharts** | React app, common chart shapes, declarative; team comfort matters more than custom needs |
| **Visx** | React app, custom or unusual encodings; team has bandwidth for low-level work |
| **Tremor** | React + Tailwind, dashboard-shaped primitives (KPI tile, area chart, donut), fast scaffolding |
| **ECharts** | Framework-agnostic, very large datasets, interactive features (zoom, brush, complex tooltips) |
| **Chart.js** | Framework-agnostic, simple charts, smallest bundle of the heavyweights |

Detection order: read `package.json` → if a chart lib is present, use it. If not, ask the user. Never silently install. Match the constitution's stack-respect rule (rule 7).

## 12. Anti-patterns (do not generate)

- Bar chart with truncated y-axis. Always start at zero for bars.
- Pie chart with > 5 slices, or with slices that don't sum to 100%.
- Dual y-axis on overlapping lines (false-correlation hazard).
- Rainbow color ramp for sequential magnitude.
- 3D charts for 2D data. The third dimension is decoration; it distorts.
- Smoothed lines (`monotone`/spline) on time series — invents data points between actual values.
- A legend that's the only way to identify a series, plus no tooltip.
- Animation on a live-updating chart that thrashes the eye.
- A chart with no title, no axis labels, no source, and a tooltip carrying all of the above.
- Chart labels at angles other than 0° or 90°. Rotate the chart, not the labels.
