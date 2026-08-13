# Chart Types — Pick the Right One

Charts answer questions. Pick from the question, not the data shape.

## Decision matrix

| Question | Default | When to avoid | Accessible alternative |
|---|---|---|---|
| Compare X across categories | Horizontal bar | When categories ≤ 4 and labels are short → vertical bar is fine | Sorted table with bar-in-cell |
| Change of X over time | Line | < 4 points (use a bar); irregular intervals (use scatter) | Table with sparkline + delta |
| Cumulative change over time | Area | When you need precise individual values (use line) | Stacked bar by time bucket |
| Distribution of a numeric variable | Histogram or box plot | Few data points (< 30) — use a strip plot | Summary statistics in a table |
| Share of a whole | Stacked bar (single bar) | Always > pie; pie only at ≤ 4 slices that sum to 100% | Sorted table with % column |
| Share over time | Stacked area | When series cross frequently (use small multiples) | Small multiples table |
| Two-variable relationship | Scatter | Categorical × categorical (use heatmap) | Correlation table with R/p |
| Density across two dimensions | Heatmap | Sparse matrix (use scatter) | Pivot table |
| Flow between states | Sankey | Non-flow data; small numbers of nodes/edges | Tree table |
| Hierarchical share | Treemap | Hierarchy depth > 3; uneven category sizes | Nested table |
| OHLC over time | Candlestick | Outside finance — do not adapt | OHLC table |
| Geographic distribution | Choropleth or symbol map | Population effects unless normalized per capita | Sortable region table |

## Per-chart guidance

### Bar chart

The most reliable chart in product UI. Encodes a single number well, handles many categories, supports long labels (when horizontal).

- **Horizontal** when category labels are long or count > 5. Sort descending unless the categorical order is meaningful (months, severity).
- **Vertical** when category labels are short (3–5 chars) and count ≤ 5.
- **Stacked** for share-of-whole over time or across groups; do not stack > 4 series.
- **Grouped** ("dodged") for comparing 2–3 series across categories. Beyond 3 series, use small multiples.
- **MUST start at zero.** Bars encode magnitude via length; a non-zero baseline is a lie.
- Bar width: gap between bars 20–30 % of bar width. Wider gaps weaken the comparison.

### Line chart

For change over time. Position encodes magnitude; color distinguishes series, never magnitude.

- Cap visible series at **5**. Beyond 5, fade non-focused lines or use small multiples.
- Inline labels at the end of each line beat any legend.
- May start above zero — show the baseline value clearly. Mark the baseline tick.
- Do not smooth ("monotone"/spline) — smoothing invents data points between actual values. Use straight segments.
- Connect missing points with a dashed segment OR drop the segment. Never silently interpolate.

### Area chart

A line chart with the area under filled. Use only when the cumulative or share interpretation is the point.

- Single-series area: rare; usually a line is better. Reserve for "running total" framings.
- Stacked area: for share over time. Order series by stability — the most stable at the bottom. Use semi-transparent fills or a sequential ramp.
- Streamgraph: fancy and rarely worth it; readability suffers vs stacked bars.

### Scatter

For two-variable relationships. Each point is one observation.

- Add a regression / trend line **only** when correlation is genuine (R² > 0.3). Otherwise the line suggests a story that isn't there.
- Bubble chart (size as third variable) is mostly a mistake — area is a weak channel. Try a small multiple of scatters instead.
- For 1000+ points, use density (hexbin or 2D heatmap), not overlapping dots.

### Heatmap

Color encodes magnitude across a 2D matrix (e.g., hour × day). One of the few correct uses of color-as-magnitude.

- Use a **sequential** ramp (single hue) for unsigned magnitudes.
- Use a **diverging** ramp (two hues meeting at neutral) for signed values around a baseline.
- Label every row and column. Label the color scale.
- Maximum cell count: ~500 cells. Beyond that, the user can't read it.

### Sankey

Flow between states. Width = volume. Use only for genuine flows (funnel, source → destination).

- ≤ 30 nodes total. Beyond that it becomes spaghetti.
- ≤ 4 layers (columns) of stages.
- Reserve hover for full quantitative tooltip; the diagram alone gives a feel, not exact numbers.

### Treemap

Nested rectangles for hierarchical share. Area = magnitude.

- Tree depth ≤ 3.
- Label only the largest cells; let small cells reveal on hover.
- Color encodes category, not magnitude (magnitude is already encoded by area).

### Candlestick

Reserved for OHLC financial data. Do not adapt to non-finance use cases — the convention (red down / green up) carries domain meaning.

- Pair with a volume bar chart below, sharing the x-axis.
- Tooltip must show all four values (open, high, low, close).

## Charts to avoid almost always

- **3D charts** — the third dimension is decoration; it distorts area and length.
- **Pie chart with > 5 slices** — slice angle is hard to compare; use a sorted bar.
- **Donut with center number** — the center number wins; the donut is decoration. Use a KPI tile.
- **Radar / spider chart** — area is misleading; ordering of axes changes the shape.
- **Word cloud** — area encodes nothing meaningful; sort the words in a list.
- **Stacked bar with > 5 series** — eye can't track individual series across stacks; small multiples instead.

## Cross-references

- `references/charts/color-encoding.md` — palettes for series and magnitude.
- `references/charts/chart-anatomy.md` — title, axes, legend, tooltip rules.
- `references/charts/chart-motion.md` — animation and reduced-motion rules.
- `skills/data-visualization/SKILL.md` — full senior reference.
