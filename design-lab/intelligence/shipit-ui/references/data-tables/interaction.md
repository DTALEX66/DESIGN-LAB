# Data Table Interaction

Sort, filter, search, pagination, selection, expansion, inline edit. Every interaction has a keyboard path and a visible affordance.

## Sort

- Every sortable header is a `<button>` inside `<th>`. Clicking cycles **asc → desc → none**.
- Visible affordance: an arrow icon next to the label. State:
  - none: faint up/down arrows at `--color-text-2` 30 % opacity.
  - asc: solid up arrow at `--color-text-1`.
  - desc: solid down arrow at `--color-text-1`.
- One sort column at a time by default. Multi-column sort is a power feature; expose only if users genuinely need it (Shift-click).
- `aria-sort="ascending" | "descending" | "none"` on the `<th>`.
- Server-side sort: show a brief skeleton on the body while the request is in flight. Header is never disabled mid-sort; subsequent clicks queue.
- Default sort: meaningful (most-recent first for time, alphabetical for names). Never random.

## Filter

The filter bar lives directly above the table — see `references/dashboard-blueprints/filter-bar.md`. Per-column filters (Excel-style dropdowns inside header cells) belong only on rare power-user tables; default to a top filter bar.

When applied:
- Each active filter renders as a removable chip below the bar.
- The URL reflects the filter state (every filtered view is linkable).
- The reset link appears only when ≥ 1 filter is non-default.

## Search

- A debounced (200 ms) text input, leading magnifier icon, trailing clear button.
- Searches across pre-defined searchable columns; advertise which ("Search by name or email") in the placeholder.
- On submit, focus stays in the input; on `Esc`, input clears.
- Empty search returns to "no filter" (does not show a "no results" state with the search empty).

## Pagination vs infinite scroll vs virtualization

| Total rows | Strategy |
|---|---|
| < 200 | Render all; client-side sort/filter |
| 200–10,000 | Pagination 25 / 50 / 100 per page |
| > 10,000 or live | Virtualization (TanStack Virtual / react-window — verify project deps first) |

**Never infinite-scroll a table.** It defeats keyboard nav, breaks "scroll to footer", makes URL state lossy, and makes deep links impossible. Infinite scroll is for feeds, not data tables.

Pagination footer:
- Page-size selector (default 25).
- Page indicator: `Page 3 of 47` plus `Showing 51–75 of 1,158`.
- Navigation: first / prev / next / last. Keyboard: `Cmd/Ctrl + ←/→` for prev/next when focus is in the table.

## Selection

- Leading checkbox column in the header and every row.
- Header checkbox is **tri-state**: empty (none selected), filled-checkmark (all on page selected), filled-dash (some selected).
- Clicking the header checkbox selects/deselects all rows on the current page.
- After selection, the filter bar swaps in place for the bulk-action bar (no layout shift) — see `skills/dashboard-design/SKILL.md` § 8.
- Persist selection across pages when the dataset is filtered/paginated; show count in the bulk bar.
- Shift-click to select a range. Cmd/Ctrl-click to toggle individual.

## Bulk-action bar

- Replaces the filter bar in place when ≥ 1 row selected.
- Layout: `[count + clear]` left, `[contextual actions]` center, `[select-all-matching link]` right.
- Destructive actions confirm in a modal that quotes the count.
- Sticks to the top of the table region (sticky toolbar).

## Row hover

- Background shift only — no transform. Tables don't lift.
- `--color-surface-2`. 150 ms ease-out-quint.
- Hover reveals trailing row actions (icons that were hidden) — see "Row actions" below.

## Row actions

- Icon-only buttons in a trailing column. Hidden until row hover OR row focus.
- Always include the same actions as a kebab menu reachable by keyboard (icon-on-hover alone is keyboard-hostile).
- ≤ 3 inline icons; everything else into a kebab.
- Tooltip on every icon-only action.

## Expandable rows

- Leading caret (`>` / `v`) in a dedicated column when used.
- Expanded content sits in a full-width row below the original, indented by `--space-6`.
- Expanding does not collapse other rows by default. Collapse-others mode is a setting, not a default.
- Keyboard: `Right Arrow` expands, `Left Arrow` collapses, `Enter` toggles.

## Inline edit

For single-field changes inside a row.

- **Affordance**: hover or focus on a cell shows a 1 px border `--color-border-subtle`. Pencil icon optional.
- **Activation**: double-click or `Enter` while focused.
- **Save**: `Enter` or focus loss. Optimistic UI; revert on error.
- **Cancel**: `Esc`. Restores previous value.
- **Validation**: error inline below the cell, in `--color-danger-600`. Cell stays in edit mode until valid.
- **Tab order**: Tab moves to the next editable cell in the row. After the last, moves to the first cell of the next row.

Don't put inline edit on every column. Reserve for fields users change often (status, owner, due date, name). Heavier edits → drawer.

## Bulk inline edit

Rare and high-risk. If implemented:
- Always preview the change set before commit.
- Always provide undo (banner: "Updated 14 rows. Undo.").
- Server-side transactional — partial failures must be visible per row.

## Keyboard navigation

- `Tab`: into the table, into the first focusable header.
- `Arrow keys`: between cells (when cells are focusable / inline-editable).
- `Space`: toggle row selection when checkbox is focused.
- `Enter`: activate primary row action (open detail / drawer).
- `Esc`: cancel inline edit; clear search; close detail.
- `Cmd/Ctrl + A`: select all on current page.

## Anti-patterns

- A table that resorts on every data refresh, scrolling the user away from selection.
- Inline edit with no visible affordance — users don't know fields are editable.
- Hover-only row actions with no keyboard access.
- Pagination that resets to page 1 on every filter change without telling the user.
- Search that's case-sensitive without saying so.
- Save-on-keystroke for inline edits (each keystroke is a server round-trip).
- "Select all" that selects everything across pages without confirmation.

## Cross-references

- `references/data-tables/anatomy.md` — structure and density.
- `references/data-tables/responsive.md` — narrow-viewport strategies.
- `references/data-tables/accessibility.md` — keyboard and aria.
- `references/dashboard-blueprints/data-table.md` — assembled blueprint.
