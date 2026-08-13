# Chart Anatomy

The parts of a chart and the spacing rules that hold them together. Every part is optional in isolation; together they make a credible chart.

## Parts (in z-order from top to back)

1. **Title** — what the chart is.
2. **Subtitle / context** — comparison window, units, source.
3. **Axes** — labels, ticks, gridlines.
4. **Annotations** — reference lines, threshold bands, event markers, callouts.
5. **Plot** — bars, lines, points (the data).
6. **Legend** — series swatches and labels.
7. **Tooltip** — on-demand detail.
8. **Source / footnote** — attribution, methodology link.

## Title

- One line, sentence case, ≤ 8 words.
- Describes the metric and unit, not the data shape: "Daily active users", not "Line chart of users".
- Type: `var(--text-base)` weight 600, color `--color-text-1`.
- Placed above the plot, left-aligned to the leftmost gridline.

## Subtitle

- One line, ≤ 12 words. Carries the comparison window and unit when not in the title.
- "Last 30 days vs prior 30 days" — gives the chart context the title doesn't.
- Type: `var(--text-sm)` weight 400, color `--color-text-2`.
- Optional, but raises perceived quality.

## Axes

### Tick density
- 4–7 ticks per axis. More than 8 is clutter; fewer than 4 leaves the user guessing.
- Tick values are human numbers — 1, 2, 5, 10, 20, 50, 100. Never `2.347`.
- Time axis ticks at calendar boundaries (day, week, month) — not arbitrary intervals.

### Tick labels
- Type: `var(--text-xs)` weight 400, color `--color-text-2`.
- 0° rotation (horizontal). If labels collide, abbreviate first; rotate to 45° as last resort; never 90°.
- Truncate at 12 chars on a 320 px width chart, ellipsis at the end. Full label on hover/tooltip.

### Axis titles
- Skip when the title or subtitle already gives the unit ("Daily active users" already says it's users).
- When kept, place them at the start of the axis (left for y-axis, end-right for x), not centered. Centered axis titles are 1990s.

### Gridlines
- Horizontal gridlines only on most charts (eye reads horizontally).
- 1 px, color `--color-border-subtle`, `--color-text-2` at 10 % opacity in dark mode.
- Major gridlines only; no minor gridlines unless the chart spans > 800 px wide.
- The zero baseline (when shown) is 1 px at `--color-text-2` — visually heavier than other gridlines.

## Annotations

### Reference line
- For goals, averages, last-period values.
- 1 px dashed at `--color-text-2` (or `--color-warning-500` for a threshold).
- Label at the right end, vertically centered on the line, with `--color-surface-1` background to avoid intersection visual noise.

### Threshold band
- Filled `--color-surface-2` between two values.
- Label inside the band on the right, in `--color-text-2`.

### Event marker
- Vertical line full plot height at `--color-text-2`, 1 px dashed.
- Label at the top, rotated 0°, with a small arrow pointing down to the line.

### Callout
- Pin to a specific data point with a leader line.
- ≤ 2 callouts per chart. More callouts → users stop reading them.

## Legend

### Placement
- Above plot, left-aligned, default.
- Right of plot when categories ≤ 6 and labels are short.
- Below plot on mobile.
- Inline labels at the end of each line for line charts (best legibility); skip the legend.

### Swatch shape matches the mark
- Line chart: line segment + dot.
- Area: filled square, color matches fill.
- Bar: filled square.
- Scatter: hollow circle if the chart uses hollow circles; filled if filled.

### Interactive legend
- Click a series to toggle visibility. Persist within session.
- Toggled-off series fade to 30 % opacity in the legend; mark reads as "off".
- Keyboard reachable: tab to legend, `Space`/`Enter` to toggle, arrow keys to move.

## Tooltip

- Trigger on hover **and** focus. Touch: tap to pin, tap-outside to dismiss.
- Content rows (in order): x value (formatted, full date with year if relevant), each series with swatch + label + formatted value, total when stacked.
- Position: above-right of cursor by `--space-2`. Flips to fit viewport. Never covers the focused datum.
- Background: `--color-surface-1`, 1 px border `--color-border-subtle`, shadow `--shadow-md`, radius `--radius-md`.
- Type: `var(--text-sm)`. Tabular-nums for values.
- 150 ms enter delay; 0 ms exit. Opacity-only animation.

A chart whose only legend is the tooltip is broken. Tooltips supplement.

## Source / footnote

- Below the plot, type `var(--text-xs)`, color `--color-text-2`.
- Attribution, methodology link, or "Data updated 2 minutes ago" timestamp.
- Skippable on internal dashboards; required on public charts.

## Spacing rules

| Region | Spacing token |
|---|---|
| Plot edge ↔ axis labels | `--space-2` |
| Axis labels ↔ axis title | `--space-1` |
| Title ↔ plot | `--space-3` |
| Subtitle ↔ plot | `--space-3` |
| Plot ↔ legend (when below) | `--space-3` |
| Plot ↔ source line | `--space-2` |
| Card padding around chart | `--space-5` (compact) / `--space-6` (default) |

Never let the plot touch the card edge. The plot needs breathing room — usually one `--space-6` of padding outside the axes.

## Tokens referenced

```
--color-text-1, --color-text-2
--color-surface-1, --color-surface-2
--color-border-subtle
--color-warning-500
--color-ring
--shadow-md
--radius-md
--space-1 / -2 / -3 / -5 / -6
--text-xs / -sm / -base
--chart-cat-* / --chart-seq-* / --chart-div-*
```

## Cross-references

- `references/charts/chart-types.md` — which chart for which question.
- `references/charts/color-encoding.md` — palette tokens.
- `references/charts/chart-motion.md` — transitions and reduced-motion rules.
- `references/dashboard-blueprints/chart-card.md` — chart container + states.
