# Filter Bar

Sits directly above the table or chart it filters. Houses date range, segment selectors, search, saved views, and a reset link. Replaced in place by the bulk-action bar when ≥1 row is selected (no layout shift).

## Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│ [date range ▼]  [status ▼]  [owner ▼]  [search …]  [views ▼]│
├─────────────────────────────────────────────────────────────┤
│ Active: status=Active × owner=Lin × Reset                   │ ← chips (when ≥1 active)
└─────────────────────────────────────────────────────────────┘
```

Components, in order:

1. **Date range picker** — default "Last 30 days" on first load; persists last choice.
2. **Segment selectors** — dropdowns or chip-pickers (status, owner, type). Single-select or multi-select.
3. **Search input** — debounced 200 ms, placeholder names searchable fields.
4. **Saved views** — dropdown listing the user's saved filter combinations + "Save current as…".
5. **Reset link** — only visible when ≥1 filter is non-default.

## States

| State | Visual |
|---|---|
| default | All controls rendered, no chips below |
| filtered (≥1 non-default) | Chips row appears below; reset link visible |
| selected (≥1 row in adjacent table) | Filter bar swapped in place for bulk-action bar |
| loading (server-side filter) | Spinner inside the active control; rest still interactive |

## URL state

Every filter combination is reflected in the URL. The user can:
- Bookmark a filtered view.
- Share a link.
- Refresh without losing filters.
- Use back/forward to walk filter history.

This is non-negotiable. A dashboard with no URL state on filters is a dashboard that loses users' work.

## Saved views

A saved view is a named filter combination, scoped per user.
- Stored server-side when authenticated; `localStorage` fallback.
- Default views (provided by app): "All", "My team", "This quarter".
- User views: "Pending mine", "Stuck > 7 days", etc.
- Shared views (per workspace) require explicit permission and a "people" icon.

The selector shows: User views, then default views. "Save current as…" at the top.

## Active filter chips

When ≥1 filter is active, render a row of chips below the bar:

```
status=Active × | owner=Lin × | created>2026-01-01 ×
```

Each chip is removable (× button). Removing the last chip restores the bar to default state (chip row hides).

The reset link in the bar's right edge clears all chips at once. Confirms only when > 5 chips would be cleared.

## Date range picker

A dropdown with preset ranges and a "custom" option that opens a calendar.

Presets:
- Today / Yesterday
- Last 7 / 30 / 90 days
- This / Last week, month, quarter, year
- Custom… (opens range picker)

The picker shows the resolved date range as text in the trigger ("Apr 6 – May 6, 2026"), not just the label ("Last 30 days") — the text is the truth when comparing.

## Accessibility

- The bar is a `<section>` with `aria-label="Filters"` (or `<form role="search">` if it's primarily a search interface).
- Each control has a visible `<label>` (or `aria-label` if visually redundant).
- The chip row has `aria-label="Active filters"`. Each chip's × button has `aria-label="Remove status filter"`.
- Search input is `<input type="search">` (gets the clear-X for free in some browsers).
- Reset is a real `<button>`, not a link, when it triggers state change rather than navigation.
- Focus stays in the search input on submit; clears the input on `Esc`.

## Responsive behavior

| Breakpoint | Filter bar |
|---|---|
| `< md` (< 768) | Stacks: search full-width on row 1; "Filters" button opens a bottom sheet with the rest |
| `md` (768–1023) | Two rows: dropdowns + search on row 1, saved views on row 2 |
| `lg` (≥ 1024) | Single row |

Active filter chips wrap to multiple rows at any breakpoint.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-50 / -600
--color-ring
--space-2 / -3 / -4
--text-sm
--radius-md
--dur-150
--ease-out-quint
```

## React + Tailwind reference (skeleton)

```tsx
type Filter = {
  id: string;
  label: string;
  value: string | string[] | null;
  control: React.ReactNode;   // dropdown / picker / chips
};

type Props = {
  filters: Filter[];
  search: string;
  onSearch: (v: string) => void;
  savedView: string | null;
  onSavedViewChange: (id: string | null) => void;
  onReset: () => void;
  hasActive: boolean;
};

export function FilterBar(p: Props) {
  return (
    <section
      aria-label="Filters"
      className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]
                 bg-[var(--color-surface-1)]"
    >
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
        {p.filters.map(f => (
          <div key={f.id}>{f.control}</div>
        ))}

        <label className="ml-auto flex items-center gap-2">
          <span className="sr-only">Search</span>
          <input
            type="search"
            value={p.search}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="Search by name or ID"
            className="rounded-[var(--radius-md)] border
                       border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]
                       px-3 py-2 text-[var(--text-sm)]
                       focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-offset-2
                       focus-visible:outline-[var(--color-ring)]"
          />
        </label>

        <SavedViewSelect value={p.savedView} onChange={p.onSavedViewChange} />

        {p.hasActive && (
          <button
            type="button"
            onClick={p.onReset}
            className="text-[var(--text-sm)] text-[var(--color-text-2)]
                       hover:text-[var(--color-text-1)]
                       focus-visible:outline focus-visible:outline-2
                       focus-visible:outline-[var(--color-ring)]"
          >
            Reset
          </button>
        )}
      </div>

      {p.hasActive && (
        <div
          aria-label="Active filters"
          className="flex flex-wrap items-center gap-2 border-t
                     border-[var(--color-border-subtle)] p-3"
        >
          {p.filters
            .filter(f => f.value != null && f.value !== "" &&
                        !(Array.isArray(f.value) && f.value.length === 0))
            .map(f => (
              <Chip key={f.id} label={`${f.label}: ${formatValue(f.value)}`} />
            ))}
        </div>
      )}
    </section>
  );
}
```

## Anti-patterns

- Filter bar with no URL state.
- A "Reset" link that doesn't disappear when there's nothing to reset.
- Search input that's case-sensitive without saying so.
- Saved views without a way to share or duplicate a view.
- Loading spinner inside the search input that blocks typing.
- Date-range picker that shows the label ("Last 7 days") instead of the actual dates.
- Hidden filters behind a "More" expander that the user has to open every time.

## Cross-references

- `references/dashboard-blueprints/data-table.md` — primary consumer.
- `references/data-tables/interaction.md` — search and filter behavior on tables.
- `skills/dashboard-design/SKILL.md` § 11 — filters and saved views.
