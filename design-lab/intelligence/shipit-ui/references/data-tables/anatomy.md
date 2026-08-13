# Data Table Anatomy

The structural rules for tables: header treatment, density, alignment, sticky behavior. Behavior (sort, filter, edit) is in `interaction.md`; responsive collapse is in `responsive.md`.

## Structural parts

```
[ Filter bar / bulk-action bar ]   <- toolbar
[ Header row ]                      <- column titles, sortable, sticky
[ Body rows ]                       <- data, hoverable, selectable
[ Footer row ]                      <- totals, summary (optional)
[ Pagination ]                      <- below body
```

Each part has its own rules. Skipping the toolbar or footer is fine; never skip the header.

## Header row

- Type: `var(--text-xs)` or `var(--text-sm)`, weight 600, letter-spacing 0.04em, uppercase or sentence case (consistent within the project).
- Color: `--color-text-2` (dimmer than body text — the header is structure, not content).
- Background: `--color-surface-1` (matches the surface) or `--color-surface-2` (slight tint, useful when the table sits on a busy page).
- Bottom border: 1 px `--color-border-subtle`.
- Sticky on scroll. See "Sticky header" below.
- Padding: `--space-3` Y, `--space-4` X, in comfortable; `--space-2` Y, `--space-3` X, in compact.
- Each sortable cell is a button (semantic), not a div with onClick.

## Body rows

| Density | Row height | Vertical padding | Cell type |
|---|---|---|---|
| Comfortable (default) | 48–56 px | `--space-3` | `var(--text-base)` |
| Compact | 32–40 px | `--space-2` | `var(--text-sm)` |

- Hover: bg shifts to `--color-surface-2`. **No transform.** Tables don't lift.
- Selected row: leading checkbox checked + bg `--color-surface-2` (or a tint of `--color-brand-50`) + 2 px leading accent rail at `--color-brand-600`.
- Focused cell (keyboard): 2 px ring `--color-ring` inside the cell.

## Footer row (optional)

- Use only when totals, averages, or summaries belong with the data.
- Sticky to the bottom of the table region (not the viewport).
- Same height as a body row at the same density.
- Heavier weight (600) and `--color-text-1` for the totals; the label cell is `--color-text-2`.

## Zebra rows: when

Zebra striping is **off by default**. Bring it back only when:
- Column count > 8 (eye-tracking across long rows).
- Row height is compact and rows lack hover affordance.
- The table is print-target.

Never use zebra and a hover background simultaneously — the hover state becomes invisible on the alternate row.

## Sticky header

```css
thead th {
  position: sticky;
  top: 0;
  background: var(--color-surface-1);
  z-index: 1;
}
thead th::after {
  /* visible separator that survives over content */
  content: "";
  position: absolute;
  inset-inline: 0;
  bottom: -1px;
  height: 1px;
  background: var(--color-border-subtle);
}
```

When the table sits inside a scrollable container, sticky header sticks to the container top. When the page scrolls, the header sticks to the viewport top — but only if the table itself fills the viewport. In dashboards with long tables, prefer in-table scroll over page-level scroll so the topbar stays visible.

## Sticky first column

For wide tables (≥ 6 columns and viewport < 1024 px) where the row identifier is leftmost:

```css
tbody td:first-child,
thead th:first-child {
  position: sticky;
  left: 0;
  background: var(--color-surface-1);
  z-index: 1;
}
```

The first sticky column needs a visible right edge (1 px border or shadow) to indicate the rest scrolls. Without this the user doesn't know horizontal scroll is available.

## Alignment by data type

| Data | Align | Rationale |
|---|---|---|
| Text (name, description, status text) | Left | Reading order |
| Numbers (counts, currency, percentages) | Right | Decimal alignment |
| Dates | Left or right (consistent within project) | Either works; pick once |
| Status pills, badges | Left | They read as text |
| Icon-only actions | Right | Trailing actions don't compete with content |
| Checkboxes (selection) | Left, leading | Leftmost column |

Currency columns align on the decimal — use `font-variant-numeric: tabular-nums`. Mixed-precision numbers in one column always show same-decimal places ("$1,200.00" not "$1,200").

## Column widths

- Auto-size narrow utility columns (checkbox, action, icon).
- Fixed-width meaningful columns (status pill 120 px, date 140 px).
- Flexible-width content columns (description, name) — set `min-width` to prevent collapse.
- Total table width ≤ container width on desktop. If columns sum to more, horizontal scroll, not squish.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-600 / --color-brand-50
--color-ring
--space-2 / -3 / -4
--text-xs / -sm / -base
--radius-md   /* row pill, status badge */
```

## Anti-patterns

- A header row with the same weight, color, and case as body — readers can't tell where the data starts.
- Sticky header with no border — it floats over rows ambiguously.
- Centered text in numeric columns — decimal misalignment makes scanning impossible.
- Hover with a `transform: translateY(-1px)` — tables shouldn't lift.
- Zebra rows + hover bg + selected bg — three competing background colors create flicker.
- A table whose header text is `var(--color-text-1)` (full weight) — it competes with the data.

## Cross-references

- `references/data-tables/interaction.md` — sort, filter, pagination, inline edit.
- `references/data-tables/responsive.md` — narrow-viewport strategies.
- `references/data-tables/accessibility.md` — semantics, scope, aria-sort.
- `references/dashboard-blueprints/data-table.md` — full blueprint with React snippet.
