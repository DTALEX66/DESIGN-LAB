# Responsive Data Tables

A wide table on a 390 px screen is a UX failure. Three strategies, picked by the table's content.

## Strategy 1: Column priority

Hide low-priority columns at narrow widths; show them in row detail (drawer or expanded row).

Best for: tables with a clear hierarchy of importance (name > status > date > id > metadata).

```
xl (≥1280):  [check][name][status][owner][created][updated][value][id][actions]
lg (1024):   [check][name][status][owner][created][value][actions]
md  (768):   [check][name][status][value][actions]
sm  (<768):  [check][name][status][actions]   <- everything else in a "View" detail drawer
```

Column priority is a numeric attribute on each column (`priority: 1 | 2 | 3 | 4`). Higher priority = visible at smaller widths.

The "view detail" affordance becomes more prominent on narrow screens (full row tap → drawer with all fields).

## Strategy 2: Card stack on mobile

At < 768 px, the table re-mounts as a list of cards. Each card is one row, with a 2-column key/value layout inside.

Best for: tables where row-as-record is the natural mental model (customers, orders, tickets).

```
┌─────────────────────────┐
│ ☐ Acme Corp        [⋮]  │
│ Status:     Active      │
│ Owner:      Lin Wu      │
│ Created:    2026-04-12  │
│ Value:      $42,180     │
└─────────────────────────┘
```

Card stack rules:
- The card title is the row's primary identifier (name, ID).
- Selection checkbox in the card header (top-left).
- Trailing actions icon (top-right).
- Body shows 3–6 most important fields as label/value pairs.
- "View detail" tap opens drawer or route.

Selection and bulk actions still work on card stack. The bulk-action bar is sticky at the bottom on mobile.

## Strategy 3: Horizontal scroll with frozen first column

Keep the table layout; allow horizontal scroll inside the table region. Freeze the first column (usually the row identifier) so the user always knows which row they're scanning.

Best for: tables where every column is needed and substitution into a card hurts (analyst tables, finance, monitoring).

```css
.table-region {
  overflow-x: auto;
  scrollbar-gutter: stable;
}
tbody td:first-child,
thead th:first-child {
  position: sticky;
  left: 0;
  background: var(--color-surface-1);
  box-shadow: 1px 0 0 var(--color-border-subtle);
}
```

Visible affordance for "more to the right":
- Box-shadow on the right edge of the frozen column.
- Optional fade-out gradient on the right edge of the scroll region.
- Or: a small "→" hint icon that fades when scroll reveals more.

Don't combine horizontal scroll with sticky-row selection — scroll dragging conflicts with multi-select gestures.

## Drawer for row detail

Regardless of strategy, narrow screens benefit from a row-detail drawer:

- Tap row → right-side drawer slides in (`--space-0` to viewport-edge on mobile, full screen on phones).
- All fields visible, in label/value layout.
- Edit happens in the drawer, not inline on mobile.
- `Esc` or back-gesture closes; URL reflects the open row.

## Picking a strategy

| Condition | Strategy |
|---|---|
| Clear column hierarchy, < 8 columns | Column priority |
| Row-as-record mental model | Card stack |
| All columns needed, analyst use | Horizontal scroll + frozen column |
| Mixed: pick column priority + drawer for detail | Default for product UIs |

## Pagination on mobile

- Drop the page-size selector; default to 25 on mobile.
- Compact pagination: just `← prev | next →` and `Page 3 / 47`.
- Pagination row stays sticky to the bottom of the scrollable region — never lost off-screen.

## Filter bar on mobile

- Filter chips wrap to multiple rows.
- Date range picker becomes a bottom sheet, not a popover.
- Hide secondary filters behind a "Filters" button that opens a full-screen sheet.
- Search input full-width above the table.

## Selection & bulk actions on mobile

- Tap-and-hold a row to enter selection mode (a known mobile pattern).
- Bulk-action bar sticks to the bottom of the viewport (above the keyboard if open).
- Destructive bulk actions confirm in a full-screen sheet, not a modal.

## Anti-patterns

- A 1440-px table forced into a 320-px viewport with `overflow: scroll` and no frozen column — users can't tell which row they're in.
- Card stack that hides the selection checkbox — bulk actions become invisible.
- Per-row "View" buttons inside an already-clickable card — pick one affordance.
- A drawer that takes the user to a separate route — drawer is for in-place context, route is for deeper work. Don't conflate.
- Card stack that omits the row's primary identifier — the user has to read three fields to identify the record.

## Cross-references

- `references/data-tables/anatomy.md` — structural rules.
- `references/data-tables/interaction.md` — sort, filter, pagination, edit.
- `references/responsive-grids/breakpoints.md` — the breakpoint ladder.
- `references/dashboard-blueprints/data-table.md` — full blueprint.
