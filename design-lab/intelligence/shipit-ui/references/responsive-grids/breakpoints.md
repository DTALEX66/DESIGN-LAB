# Breakpoints

Mobile-first ladder used across all dashboard surfaces. Match to the Tailwind defaults so generated code stays grep-able. Token names below; never write raw `px` literals in media queries — always use the named breakpoint utility.

## The ladder

| Token | Min width | Maps to | Typical use |
|---|---|---|---|
| `--bp-sm` | 640 px | `sm:` | Larger phones, small tablets |
| `--bp-md` | 768 px | `md:` | Tablets portrait; mobile-to-desktop pivot |
| `--bp-lg` | 1024 px | `lg:` | Tablet landscape, small laptop; sidebar appears |
| `--bp-xl` | 1280 px | `xl:` | Desktop default; KPI 4-up grid lands here |
| `--bp-2xl` | 1536 px | `2xl:` | Wide desktop; expanded comfort, never required |

Below `--bp-sm` (< 640 px) is the default — write the mobile layout first, layer up.

## Rules

- **Mobile-first.** Default styles target the smallest screen. Each `min-width` query adds, never subtracts.
- **Never use `max-width` queries** for layout. They invert the cascade and create double-specified styles. Exception: print stylesheet.
- **Never invent intermediate breakpoints** (like 900 px). The ladder above is the universe. If a layout breaks between `md` and `lg`, fix the layout, don't add a breakpoint.
- **Container queries take precedence** for component-level responsiveness — see "Container queries" below.
- **Hard cap of 4 breakpoints per file.** A component that needs 5 is doing too much; split.

## When each breakpoint is the right cut

| Cut at | Because |
|---|---|
| `sm` (640) | Single-column mobile → two-column small tablet (cards 2-up, list + detail still single) |
| `md` (768) | Sidebar sheet → fixed sidebar transition is rare here; usually only chart legend repositions |
| `lg` (1024) | Sidebar appears persistently; tables stop card-stacking; KPI grid 2-up → 3-up |
| `xl` (1280) | KPI 4-up grid; full dashboard layout; charts at full width |
| `2xl` (1536) | Optional expanded layout; wider gutters, larger type — never required for function |

## Container queries

For component-level responsiveness — KPI tiles, chart cards, drawer contents — use `@container` rather than viewport breakpoints. A 4-up grid that becomes 2-up should not require per-tile bespoke breakpoints; the tile responds to the column it sits in.

```css
.kpi-tile-host {
  container-type: inline-size;
  container-name: kpi;
}
.kpi-tile {
  /* compact */
}
@container kpi (min-width: 280px) {
  .kpi-tile {
    /* comfortable */
  }
}
```

Use container queries when:
- A component is rendered at multiple sizes on the same viewport (KPI tile in a 4-up row vs in a 2-up row).
- A component is reusable across surfaces with different parent widths (drawer vs page).

Stick to viewport breakpoints when:
- The whole layout pivots (sidebar appears, density changes).
- The decision depends on the user's input device (touch vs pointer), which container queries do not see.

## Tailwind reference

Default (out of the box) Tailwind breakpoints match this ladder. No customization needed unless the project has custom values — in which case adopt the project's existing names; do not introduce a parallel ladder.

```html
<!-- mobile-first; columns climb at each step -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  …
</div>
```

## Anti-patterns

- `@media (max-width: 1023px)` — inverts the cascade; replace with mobile-first `@media (min-width: 1024px)`.
- A breakpoint at `900px` because the design "broke" — fix the design.
- `@media (min-width: 1280px) and (max-width: 1535px)` — never bracket a breakpoint; layouts should hold open-ended.
- Using viewport queries for component layout that's reused at multiple parent widths — use container queries instead.
- Duplicating the same media query block across multiple components — extract a layout primitive.

## Cross-references

- `references/responsive-grids/dashboard-grid.md` — 12-column grid and layout patterns at each breakpoint.
- `references/responsive-grids/density.md` — density toggles per breakpoint.
- `references/data-tables/responsive.md` — table-specific responsive strategies.
