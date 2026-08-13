# Chart Card

Container for a single chart. Houses title, subtitle, time-range selector, export action, and the chart itself with full state coverage.

## Anatomy

```
┌────────────────────────────────────────────────┐
│ Title                       [time range ▼] [↗]│  ← header
│ Subtitle                                       │
├────────────────────────────────────────────────┤
│                                                │
│              CHART                             │  ← plot region
│                                                │
├────────────────────────────────────────────────┤
│ Source: …                Last updated 2m ago   │  ← footer (optional)
└────────────────────────────────────────────────┘
```

| Region | Purpose |
|---|---|
| Header | Title, subtitle, time-range selector, action menu (export, fullscreen, refresh) |
| Plot region | The chart canvas; padding `--space-5` on all sides |
| Footer | Source attribution, freshness timestamp |

## States

| State | Visual |
|---|---|
| default | Header + chart + optional footer |
| loading | Header rendered as final; plot region shows skeleton matching final aspect ratio (no jump) |
| empty (no data for range) | "No data for this period" + suggestion to widen range |
| error | "Failed to load" + retry button inside the plot region |
| stale (cache while fetch fails) | Chart dimmed to 70%, "Last updated 5 min ago, retry" caption |
| range-changed (transition) | 300 ms cross-fade or snap to new domain (see `references/charts/chart-motion.md`) |

## Header components

- **Title**: `var(--text-base)` weight 600.
- **Subtitle**: `var(--text-sm)` weight 400, `--color-text-2`. Carries comparison context ("Last 30 days vs prior 30 days").
- **Time-range selector**: pill or dropdown. Standard ranges: 24h, 7d, 30d, 90d, YTD, custom.
- **Action menu** (kebab): Export CSV / PNG / SVG, Open in fullscreen, Refresh now, Share link.

## Time-range selector

A small dropdown right-aligned in the header. Defaults to 30d on first load; persists last choice per surface (and per chart on heavy analyst dashboards).

Custom range opens a date picker. The custom range is a real URL state — the chart card supports linkable views.

## Export

Three formats:
- **CSV** — the underlying data, not the picture.
- **PNG** — rasterized chart at 2× for retina; includes title, axes, legend, source.
- **SVG** — vector for slide decks; same content as PNG.

Export button has a kebab menu with all three; default action (single click) is the most-used (CSV in analyst surfaces, PNG in exec).

## Accessibility

- `<section>` with `aria-labelledby` pointing at the title `<h3>`.
- Inside: `<figure>` containing the chart `<svg aria-hidden="true">` and a `<figcaption class="sr-only">` with the alt-text pattern from `skills/data-visualization/SKILL.md` § 8.
- "View as table" toggle as a `<button>` reveals an accessible `<table>` of the underlying data.
- Time-range selector is a real `<select>` or `aria-haspopup` listbox.
- Action menu is a real `<menu>` or `aria-haspopup` menu, opened with `Enter`/`Space`, dismissed with `Esc`.

## Responsive behavior

| Breakpoint | Chart card |
|---|---|
| `< md` (< 768) | Full width; plot height 200 px; legend below or behind a toggle; tick density halved |
| `md` (768–1023) | Half-width or full; plot height 240 px |
| `lg` (≥ 1024) | Within grid; plot height 280–320 px |
| `xl` (≥ 1280) | Plot height 320–360 px |

Time-range selector collapses to a icon-only "calendar" button on `< md` that opens a bottom sheet.

## Tokens consumed

```
--color-surface-1
--color-border-subtle
--color-text-1 / -2
--color-ring
--space-3 / -5 / -6
--text-xs / -sm / -base
--radius-lg
--shadow-sm
--dur-300
--ease-in-out-cubic
```

## React + Tailwind reference

```tsx
type Range = "24h" | "7d" | "30d" | "90d" | "ytd" | "custom";

type Props = {
  title: string;
  subtitle?: string;
  range: Range;
  onRangeChange: (r: Range) => void;
  onExport?: (kind: "csv" | "png" | "svg") => void;
  source?: string;
  updatedAt?: string;        // pre-formatted, "2 min ago"
  state?: "default" | "loading" | "empty" | "error";
  onRetry?: () => void;
  children: React.ReactNode; // the chart
};

export function ChartCard(p: Props) {
  return (
    <section
      aria-labelledby={`chart-${p.title}`}
      className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)]
                 bg-[var(--color-surface-1)]"
    >
      <header className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <h3
            id={`chart-${p.title}`}
            className="text-[var(--text-base)] font-semibold text-[var(--color-text-1)]"
          >
            {p.title}
          </h3>
          {p.subtitle && (
            <p className="mt-1 text-[var(--text-sm)] text-[var(--color-text-2)]">
              {p.subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RangeSelect value={p.range} onChange={p.onRangeChange} />
          {p.onExport && <ExportMenu onExport={p.onExport} />}
        </div>
      </header>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {p.state === "loading" && <ChartSkeleton />}
        {p.state === "empty" && <ChartEmpty range={p.range} />}
        {p.state === "error" && <ChartError onRetry={p.onRetry} />}
        {(!p.state || p.state === "default") && (
          <figure>
            {p.children}
            <figcaption className="sr-only">{p.subtitle ?? p.title}</figcaption>
          </figure>
        )}
      </div>

      {(p.source || p.updatedAt) && (
        <footer
          className="flex items-center justify-between gap-3 border-t
                     border-[var(--color-border-subtle)] px-5 py-2 sm:px-6"
        >
          {p.source && (
            <span className="text-[var(--text-xs)] text-[var(--color-text-2)]">
              Source: {p.source}
            </span>
          )}
          {p.updatedAt && (
            <span className="text-[var(--text-xs)] text-[var(--color-text-2)]">
              Last updated {p.updatedAt}
            </span>
          )}
        </footer>
      )}
    </section>
  );
}
```

## Anti-patterns

- A chart card with no title — the chart can't speak for itself.
- A title that describes the chart shape ("Line chart of users") instead of the metric.
- Time-range selector inside the chart canvas. Header.
- Export PNG that omits axes / legend / title — useless in slide decks.
- Loading spinner where a skeleton belongs (causes layout jump).
- Single empty state for "no data" and "no permission" — distinguish.

## Cross-references

- `references/charts/chart-anatomy.md` — what's inside the plot region.
- `references/charts/chart-types.md` — picking the chart.
- `references/charts/chart-motion.md` — range-change transitions.
- `skills/data-visualization/SKILL.md`
