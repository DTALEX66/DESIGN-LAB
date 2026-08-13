# Dashboard Grid

12-column grid with named regions. The grid is the contract between layout primitives; components do not reach outside it.

## The grid

- 12 columns, fluid.
- Gutter: `--space-4` (16 px) below `--bp-lg`, `--space-6` (24 px) at and above.
- Outer page padding: `--space-4` mobile, `--space-6` tablet, `--space-8` desktop. Never let a card touch the viewport edge on desktop.
- Max content width: `1440 px` for full dashboard; cap at `1200 px` for content-led admin.

## Common admin layouts

Four patterns cover ~95 % of dashboards. Pick one per surface; avoid mixing.

### 1. Full-width single column

KPI row, then sections stacked. Default for overview pages, settings, and any page where horizontal real estate is not the bottleneck.

```
[──────────── KPI row (4 tiles) ────────────]
[──────────── chart card ────────────]
[──────────── data table ────────────]
```

### 2. 2 + 2 (two equal columns)

Two charts side by side, then a wide section. Good when comparing two metrics is the page's job.

```
[──── chart A 6/12 ────][──── chart B 6/12 ────]
[──────────── data table 12/12 ────────────]
```

### 3. 1 + 3 (sidebar widget + main)

Filters or context on the left, primary content on the right. Lighter than a full split-pane shell.

```
[ filters 3/12 ][──────── main 9/12 ────────]
[ filters 3/12 ][──────── chart 9/12 ───────]
```

### 4. Split-pane (list + detail)

Inbox-shape work. Persistent on desktop; on tablet, one or the other shows at a time with a back link.

```
[ list 4/12 ][──────────── detail 8/12 ────────────]
```

Below `--bp-lg`, split-pane collapses to list-only with detail in a route or full-screen drawer.

## KPI row patterns

| Tiles | xl (≥1280) | lg (1024) | md (768) | sm/xs |
|---|---|---|---|---|
| 4 | 4-up | 2-up | 2-up | 1-up |
| 3 | 3-up | 3-up | 2-up | 1-up |
| 6 | 3 over 3 | 3 over 3 | 2 × 3 | 1-up |
| 8 | 4 over 4 | 4 over 4 | 2 × 4 | 1-up |

> 6 KPIs on one screen is usually wrong. Group into rows of 3–4. If the page truly needs 8, ask whether half should live on a child route.

## CSS Grid template

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-4);
}
@media (min-width: 1024px) {
  .dashboard-grid { gap: var(--space-6); }
}

.col-span-12 { grid-column: span 12; }
.col-span-9  { grid-column: span 12; }     /* mobile */
.col-span-6  { grid-column: span 12; }
.col-span-4  { grid-column: span 12; }
.col-span-3  { grid-column: span 12; }

@media (min-width: 768px) {
  .col-span-9 { grid-column: span 8; }
  .col-span-6 { grid-column: span 6; }
  .col-span-4 { grid-column: span 6; }
  .col-span-3 { grid-column: span 6; }
}
@media (min-width: 1280px) {
  .col-span-9 { grid-column: span 9; }
  .col-span-4 { grid-column: span 4; }
  .col-span-3 { grid-column: span 3; }
}
```

## Tailwind shorthand

```html
<div class="grid grid-cols-12 gap-4 lg:gap-6">
  <section class="col-span-12 lg:col-span-3">…filters…</section>
  <section class="col-span-12 lg:col-span-9">…main…</section>
</div>
```

## Named grid areas (when meaningful)

For shells where regions have semantic identity (header, sidebar, content, aside), prefer named areas — easier to read, easier to rearrange responsively.

```css
.app-shell {
  display: grid;
  grid-template-areas:
    "topbar topbar"
    "sidebar content";
  grid-template-columns: 240px 1fr;
  grid-template-rows: 56px 1fr;
}
@media (max-width: 1023px) {
  .app-shell {
    grid-template-areas: "topbar" "content";
    grid-template-columns: 1fr;
  }
  .sidebar { display: none; }   /* moved into a sheet */
}
```

## Anti-patterns

- A card at `7/12` with no semantic reason. The 12-grid is meaningful; 7 is not.
- Dashboards with no max-width on ultra-wide displays — text measure becomes 200ch and unreadable.
- Mixing layout patterns mid-page (split-pane plus 1+3 plus full-width). Pick one.
- Reaching outside the grid to absolute-position a widget. The grid is the contract.
- Per-component bespoke breakpoints when the layout grid already handles it — use the grid's columns to drive your widget.

## Cross-references

- `references/responsive-grids/breakpoints.md` — the breakpoint ladder.
- `references/responsive-grids/density.md` — density-by-surface decisions.
- `references/dashboard-blueprints/app-shell-sidebar.md` — sidebar shell using named grid areas.
- `references/dashboard-blueprints/kpi-row.md` — KPI row responsive grid implementation.
