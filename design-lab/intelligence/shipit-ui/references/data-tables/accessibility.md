# Data Table Accessibility

Tables are one of the few HTML elements with rich built-in semantics. Use them. ARIA is for what HTML can't express.

## Use a real `<table>`

The most common a11y mistake is rebuilding a table out of `<div>`s.

```html
<table>
  <caption>Customers</caption>
  <thead>
    <tr>
      <th scope="col">…</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">…</th>   <!-- row identifier -->
      <td>…</td>
    </tr>
  </tbody>
</table>
```

`<table role="grid">` is a different semantic (an interactive 2D grid like a spreadsheet) — only use it when the table is fully keyboard-navigable cell-by-cell with arrow keys.

## `<caption>` or accessible name

Every table needs an accessible name.

- `<caption>` (visible) is the cleanest: `"Customers, sorted by created date"`.
- `aria-label` on `<table>` works when caption would be visually redundant.
- The caption stays as the table's first child so screen readers announce it before content.

## `scope` attributes

- `<th scope="col">` for column headers.
- `<th scope="row">` for row identifiers (the leftmost meaningful cell of each row).
- Without scope, screen readers may not associate header with cell correctly in complex tables.

## Sort: `aria-sort`

```html
<th scope="col" aria-sort="ascending">
  <button type="button">
    Created date
    <span aria-hidden="true">▲</span>
  </button>
</th>
```

- One column at a time has `aria-sort="ascending" | "descending"`. All others are `aria-sort="none"`.
- The visible arrow is `aria-hidden="true"` because `aria-sort` already announces direction.
- The header text is wrapped in a `<button>` so it's keyboard-activatable; the button has the visible text only — direction is announced by `aria-sort` on the parent `<th>`.

## Selection

- Selection checkboxes have a `<label>` (visible or `sr-only`): `"Select Acme Corp"`. Never rely on placement alone.
- Header checkbox label: `"Select all on this page"`.
- After bulk action, focus returns to the header checkbox or first remaining row.

```html
<td>
  <label class="sr-only" for="row-1234-select">Select Acme Corp</label>
  <input type="checkbox" id="row-1234-select" aria-checked="false" />
</td>
```

## Focus management

- Tab into the table lands on the first focusable element (header sort button or selection checkbox).
- Within the table, normal Tab order — across cells, then to next row.
- For grids (true `role="grid"`): one tab stop on the table, arrow keys move within.
- After a row is deleted: focus moves to the next row (or previous if it was last). Never to the body.
- After a drawer/modal closes: focus returns to the row that opened it.

## Inline edit focus

- On entering edit mode: focus moves to the input inside the cell.
- On save: focus moves to next editable cell or back to the cell button (announce save).
- On cancel: focus stays on the cell, value reverts.
- An `aria-live="polite"` region announces save and validation errors.

## Pagination

- Page navigation buttons are real `<button>`s (or `<a>` if URL changes).
- Disabled prev/next at boundaries should use `aria-disabled="true"` rather than `disabled` if you want them focusable so screen readers can announce them.
- Page change updates an `aria-live="polite"` region: `"Showing page 3 of 47"`.

## Empty / loading / error states

Always announce state changes:

```html
<div role="status" aria-live="polite">
  Loading customers…
</div>

<div role="status" aria-live="polite">
  Showing 25 of 1,158 customers.
</div>

<div role="alert">
  Failed to load. Retry.
</div>
```

- `role="status"` (polite) for loading, count updates, sort changes.
- `role="alert"` (assertive) for errors only.
- Skeleton rows are `aria-hidden="true"` — the `role="status"` text carries the meaning.

## Keyboard shortcuts

If your table supports shortcuts, advertise them:

- A discoverable "Keyboard shortcuts" link near the table or in `Cmd/Ctrl+K`.
- Shortcuts respect platform conventions (`Cmd` on macOS, `Ctrl` on Windows/Linux). Detect at runtime.
- Single-key shortcuts (`a` to archive) only work when focus is in the table — not globally — to avoid colliding with browser keys.

## Color is never the only channel

- Selected row: bg shift + leading accent rail. Not color alone.
- Status pills: color + label + icon.
- Sort direction: arrow icon + `aria-sort`. Not just bold text.
- Error state: color + icon + text.

## Screen reader sanity check

Read the table with VoiceOver (VO) or NVDA:
- Caption announced first.
- Each cell announces its column header (because of `scope`).
- Sort state announced when sort changes.
- Row count announced after pagination.
- Selection count announced after select-all.

If any of these fail, the table is broken regardless of how it looks.

## Anti-patterns

- `<div role="grid">` everywhere with custom `role="row"` and `role="cell"` — re-implementing tables loses freebies.
- `<th>` without `scope`.
- Sort indicator that's color-only (no icon, no `aria-sort`).
- Hover-only row actions with no keyboard equivalent.
- Inline edit triggered by mouse hover only.
- A "Loading" spinner with no `role="status"`.
- Removing focus rings inside the table to "clean up the look".

## Cross-references

- `references/data-tables/anatomy.md` — structure and density.
- `references/data-tables/interaction.md` — sort, filter, edit details.
- `references/data-tables/responsive.md` — narrow-viewport.
- `skills/ui-design-principles/SKILL.md` § 8 — accessibility baseline.
