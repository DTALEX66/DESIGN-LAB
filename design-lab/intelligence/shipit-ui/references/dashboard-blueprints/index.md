# Dashboard Blueprints

Reference implementations for admin and data-heavy surfaces. Each blueprint covers anatomy, states, accessibility, responsive behavior, and a minimal React + Tailwind snippet showing the structural pattern (not a full implementation).

> Snippets are React + Tailwind. For Vue / Svelte / CSS Modules ports, see `references/component-blueprints/card.md` for the established translation pattern.

## Catalog

| Blueprint | Pick when |
|---|---|
| `app-shell-sidebar.md` | App with > 6 top-level routes, multi-tenant, role-based menus, deep IA |
| `app-shell-topbar.md` | ≤ 5 top-level routes, content-led admin, public-facing console |
| `kpi-tile.md` | Atomic metric display: label + value + delta + comparison + sparkline |
| `kpi-row.md` | Responsive grid of KPI tiles (4 → 2 → 1) on overview pages |
| `data-table.md` | Sortable, filterable, paginated tabular data; the dashboard workhorse |
| `chart-card.md` | Container for a single chart with title, time-range, export, and states |
| `filter-bar.md` | Date range + segments + search + saved views above a table or chart |
| `notification-center.md` | Toast (transient) + inbox panel (durable) — the two notification surfaces |
| `command-palette.md` | `Cmd/Ctrl+K` palette with sections (Recent / Go to / Create / Run / Help) |

## Composition guidance

A typical dashboard route assembles 4–6 blueprints:

```
[ app-shell-sidebar.md ]
  └─ topbar (in shell)
  └─ content
       ├─ filter-bar.md
       ├─ kpi-row.md  (kpi-tile.md × 4)
       ├─ chart-card.md
       └─ data-table.md
```

`command-palette.md` and `notification-center.md` are global — they live in the shell, not in any single route.

## Selection rules

- **One shell per app.** Don't mix sidebar and topbar shells across routes; users learn the chrome and rely on it.
- **One filter bar per surface.** If two regions need separate filters, you have two surfaces; split them.
- **One command palette per app.** Multiple palette implementations conflict on `Cmd/Ctrl+K`.
- **Notification center is global.** It belongs in the topbar of every route.

## Constitution compliance

Every blueprint follows the seven constitution rules verbatim. In particular:
- **Rule 2 (no hardcoded values)** — all snippets use token references (`var(--color-...)` or Tailwind arbitrary values pointing at tokens).
- **Rule 3 (states)** — every interactive snippet shows hover, active, focus-visible, disabled treatments.
- **Rule 4 (reduced motion)** — every motion snippet includes a `motion-reduce:` or `@media (prefers-reduced-motion: reduce)` fallback.
- **Rule 6 (dark mode parity)** — colors come from semantic tokens, never `gray-500` style direct ramp references.

## Cross-references

- `skills/dashboard-design/SKILL.md` — the senior overview.
- `skills/data-visualization/SKILL.md` — chart-design knowledge.
- `references/charts/` — chart-specific references.
- `references/data-tables/` — table-specific references.
- `references/responsive-grids/` — breakpoints, grid, density.
