# Data Table

The dashboard workhorse. This blueprint covers assembly and the structural skeleton; behavior, anatomy depth, responsive collapse, and accessibility live in `references/data-tables/`.

## Anatomy

```
┌────────────────────────────────────────────────┐
│ [filter bar]  /  [bulk-action bar when N>0]    │  toolbar
├────────────────────────────────────────────────┤
│ ☐  Name ↑    Status   Owner    Created    [⋮] │  header (sticky)
├────────────────────────────────────────────────┤
│ ☐  Acme Corp Active   Lin Wu   2026-04-12 [⋮] │
│ ☐  Beta Inc  Pending  ...                 [⋮] │
│ ...                                            │
├────────────────────────────────────────────────┤
│ Showing 1–25 of 1,158        [‹ 1 2 3 … 47 ›]  │  pagination
└────────────────────────────────────────────────┘
```

| Region | Owner |
|---|---|
| Toolbar / filter bar | `references/dashboard-blueprints/filter-bar.md` |
| Bulk-action bar (when ≥1 row selected) | This file + `skills/dashboard-design/SKILL.md` § 8 |
| Header (sticky, sortable) | `references/data-tables/anatomy.md` |
| Body (sortable, hoverable, selectable, inline-editable) | `references/data-tables/interaction.md` |
| Pagination | `references/data-tables/interaction.md` |

## States

| State | Visual |
|---|---|
| default | Header + body + pagination |
| loading | Skeleton rows matching final layout exactly; no width jumps when data lands |
| empty (no data yet) | Centered illustration + headline + onboarding CTA |
| empty (filtered to nothing) | "No results match these filters" + clear-filter button |
| empty (permission denied) | "You don't have access to X" + request-access CTA |
| error | "Failed to load. Retry." inline above the body region |
| stale | Body rendered with subtle "Last updated 2 min ago" caption above |
| selected (≥1 row) | Filter bar swapped in place for bulk-action bar |

These three "empty" states are different designs — never a single empty state for all.

## Density

Two tiers, toggle persisted per surface:
- **Comfortable**: row 48–56 px, body type `var(--text-base)`.
- **Compact** (default for analyst/operator): row 32–40 px, body type `var(--text-sm)`.

See `references/data-tables/anatomy.md` and `references/responsive-grids/density.md`.

## Responsive

Three strategies, picked by content (`references/data-tables/responsive.md`):
1. Column priority (hide low-priority columns at narrow widths).
2. Card stack at < 768 px.
3. Horizontal scroll with frozen first column.

Default for product UI: column priority + drawer for row detail.

## Accessibility

Use a real `<table>` with `<caption>`, `scope`, `aria-sort`, and live regions for sort/pagination/error announcements. Full reference: `references/data-tables/accessibility.md`.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-50 / -600
--color-success-* / --color-danger-* / --color-warning-*
--color-ring
--space-2 / -3 / -4
--text-xs / -sm / -base
--radius-md
--dur-150
--ease-out-quint
```

## React + Tailwind reference (skeleton)

This snippet shows the structural pattern only. Sort, filter, inline-edit, and selection state are owned by hooks (TanStack Table is a common choice — verify project deps before introducing) — see the references for behavior.

```tsx
type Column<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  priority?: 1 | 2 | 3 | 4;   // for responsive hide/show
};

type Props<Row> = {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  sort?: { id: string; dir: "asc" | "desc" } | null;
  onSort?: (id: string) => void;
  selected: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
};

export function DataTable<Row>(p: Props<Row>) {
  const allSelected =
    p.rows.length > 0 && p.rows.every(r => p.selected.has(p.rowKey(r)));
  const someSelected = !allSelected && p.rows.some(r => p.selected.has(p.rowKey(r)));

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)]
                    border border-[var(--color-border-subtle)]">
      <table className="w-full border-collapse">
        <caption className="sr-only">{p.caption}</caption>

        <thead className="bg-[var(--color-surface-1)]">
          <tr className="border-b border-[var(--color-border-subtle)]">
            <th scope="col" className="sticky top-0 w-10 px-3 py-2 text-left">
              <input
                type="checkbox"
                aria-label="Select all on this page"
                checked={allSelected}
                ref={el => el && (el.indeterminate = someSelected)}
                onChange={(e) => p.onSelectAll(e.target.checked)}
              />
            </th>
            {p.columns.map(c => (
              <th
                key={c.id}
                scope="col"
                aria-sort={
                  p.sort?.id === c.id
                    ? (p.sort.dir === "asc" ? "ascending" : "descending")
                    : "none"
                }
                className={[
                  "sticky top-0 px-4 py-2 text-[var(--text-xs)]",
                  "font-semibold uppercase tracking-wide",
                  "text-[var(--color-text-2)]",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                ].filter(Boolean).join(" ")}
              >
                {c.sortable ? (
                  <button
                    type="button"
                    onClick={() => p.onSort?.(c.id)}
                    className="inline-flex items-center gap-1
                               focus-visible:outline focus-visible:outline-2
                               focus-visible:outline-[var(--color-ring)]"
                  >
                    {c.header}
                    <SortIcon dir={p.sort?.id === c.id ? p.sort.dir : null} />
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {p.rows.map(r => {
            const id = p.rowKey(r);
            const isSel = p.selected.has(id);
            return (
              <tr
                key={id}
                aria-selected={isSel}
                className={[
                  "border-b border-[var(--color-border-subtle)]",
                  "hover:bg-[var(--color-surface-2)]",
                  isSel && "bg-[var(--color-brand-50)]",
                ].filter(Boolean).join(" ")}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select row ${id}`}
                    checked={isSel}
                    onChange={(e) => p.onSelect(id, e.target.checked)}
                  />
                </td>
                {p.columns.map(c => (
                  <td
                    key={c.id}
                    className={[
                      "px-4 py-3 text-[var(--color-text-1)]",
                      c.align === "right" && "text-right tabular-nums",
                      c.align === "center" && "text-center",
                    ].filter(Boolean).join(" ")}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

## Bulk-action bar (sketch)

```tsx
{selected.size > 0 ? (
  <div role="region" aria-label="Bulk actions"
       className="sticky top-0 z-10 flex items-center gap-3
                  border-b border-[var(--color-border-subtle)]
                  bg-[var(--color-surface-1)] px-4 py-2">
    <span>{selected.size} selected</span>
    <button onClick={clear}>Clear</button>
    <div className="ml-auto flex gap-2">
      <button>Tag</button>
      <button>Export</button>
      <button className="text-[var(--color-danger-600)]">Delete…</button>
    </div>
  </div>
) : <FilterBar … />}
```

## Anti-patterns

- Building a table out of `<div>`s.
- Sort indicator that's color-only.
- Hover-only row actions with no keyboard equivalent.
- Resorting on data refresh, scrolling user away.
- Single empty state for "no data", "filtered to nothing", and "no permission".
- Infinite scroll on a table.

## Cross-references

- `references/data-tables/anatomy.md` / `interaction.md` / `responsive.md` / `accessibility.md`
- `references/dashboard-blueprints/filter-bar.md`
- `skills/dashboard-design/SKILL.md` §§ 5, 6, 8
