---
name: dashboard-design
description: Apply senior dashboard design patterns (app shells, KPI tiles, data tables, drawers, command palette, role-based UI, density-by-user-type) when working on files in `/admin`, `/dashboard`, `/console` paths or files importing chart libraries (recharts, visx, tremor, echarts, chart.js).
type: skill
---

# Dashboard Design

Senior-level reference for admin and data-heavy surfaces. Assumes the reader has shipped a dashboard before; the goal is to surface non-obvious tradeoffs and the rules juniors get wrong.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## 1. Pick the shell first

The shell is the most expensive decision. Switching mid-project costs days. Decide before the first screen.

| Shell | Pick when | Avoid when |
|---|---|---|
| **Sidebar + topbar + content** | App has > 6 top-level sections, multi-tenant, role-based menus, deep IA | Marketing-adjacent surface; mobile-first product |
| **Topbar-only** | ≤ 5 top-level sections, content-led admin, public-facing console | Heavy IA; lots of secondary navigation |
| **Split-pane (list + detail)** | Inbox-shape work — tickets, leads, alerts, messages | Browsing-shape work where lists are short-lived |

Blueprints: `references/dashboard-blueprints/app-shell-sidebar.md`, `app-shell-topbar.md`.

The sidebar collapses to icon-only at ≥ 1024 px (user toggle, persisted), and to a sheet behind a hamburger below 1024 px. Never hide it permanently on desktop without a setting.

## 2. Information architecture

- Top level: 5–9 items. More than 9 means you have a flattening problem; group.
- Group by user job, not by data model. ("Customers" not "Tables".)
- Active item gets a 2 px accent rail (`--color-brand-600`) on the leading edge plus a tinted background (`--color-surface-2`). Never color-only.
- Secondary nav lives in a `<aside>` panel, not a second sidebar. Two sidebars is a smell.
- Breadcrumbs only when depth > 2. Otherwise the page title carries the location.
- A "Search…" input at the top of the sidebar opens the command palette (`Cmd/Ctrl+K`). Do not build a separate sidebar search.

## 3. Density by user type

The single biggest junior mistake is shipping one density. Match density to the work.

| User | Density | Row height | Card padding | Chart height |
|---|---|---|---|---|
| **Operator** (support agent, ops, fulfillment) | Compact | 32–36 px | `--space-4` | 160–200 px |
| **Analyst** (data, finance, growth) | Toggleable (compact default, comfortable on demand) | 36–48 px | `--space-5` | 240–320 px |
| **Executive** (one-glance KPIs, board view) | Comfortable | 56+ px | `--space-8` | 280–360 px |

A density toggle is not optional for analyst surfaces. See `references/responsive-grids/density.md`. Persist the choice per user.

Operator surfaces: tabular-numerals, monospace for IDs, no hover lifts on rows (thrash on mouse-heavy use), keyboard shortcuts visible inline.

## 4. KPI tile anatomy

A KPI tile is five things, in this order. Drop any of them and you have decoration, not a KPI.

1. **Label** — what the metric is. Sentence case. No abbreviations the reader has to translate.
2. **Value** — the number. Tabular-nums, weight 600+, ≥ `var(--text-2xl)`. Format with locale-aware thousands separators.
3. **Delta** — `+12.4%` or `−$3.2k`. The delta is the load-bearing element, not the value. A KPI without a delta is a number on a wall.
4. **Comparison context** — `vs prior 7 days` or `vs goal $500k`. A delta with no period is a lie. Always show the comparison window.
5. **Sparkline or trend hint** — 30–90 day mini-line. Optional, but raises perceived quality more than any other element.

Color on the delta: `--color-success-600` for favorable direction, `--color-danger-600` for unfavorable. Not always green-up: for "errors per minute", down is success.

Never make the whole tile a hover-lift link unless drill-down is real. Static KPI tiles must not animate on hover.

Blueprint: `references/dashboard-blueprints/kpi-tile.md`. Row pattern: `references/dashboard-blueprints/kpi-row.md`.

## 5. Data tables

Tables are 60% of dashboard surface area. Get them right.

Defaults that hold up:
- Sticky header (`position: sticky; top: 0`), with a 1 px bottom border so it survives over content.
- Sort indicators on every sortable header; click to cycle asc → desc → none.
- Right-align numerics, left-align text, center icons. Currency aligns on the decimal.
- Zebra rows are out by default; bring them back only at > 8 columns where row-tracking fails.
- Row hover: bg shifts to `--color-surface-2` (no transform; tables don't lift).
- Selection lives in a leading checkbox column; selecting any row swaps the filter bar for a bulk-action bar in place (no layout shift).

Pagination vs infinite scroll vs virtualization:
- < 200 rows total: render all.
- 200–10,000: pagination at 25/50/100 per page.
- > 10,000 or live: virtualize (TanStack Virtual / react-window — verify project deps first).
- Never infinite-scroll a table. It defeats keyboard nav and breaks "scroll to footer".

Blueprint: `references/dashboard-blueprints/data-table.md`. Deep dives: `references/data-tables/`.

## 6. States — empty, loading, error, partial

The single most common junior gap. Each is a different design.

**Empty** is three different states, not one:
- **No data yet** (new account) — illustration + onboarding CTA.
- **Filtered to nothing** — "No results match these filters" + clear-filter button.
- **Permission denied** — "You don't have access to X" + request-access CTA. Never silent.

**Loading**:
- Skeleton matches final layout exactly. No width jumps when data arrives.
- Spinners only for operations < 300 ms or where layout is unknowable. Anything over 300 ms gets a skeleton.
- Skeleton is a flat `--color-surface-2` block with a slow shimmer; suppress shimmer under `prefers-reduced-motion`.

**Error**:
- Inline near the affected region, not a global toast. The user needs to know which widget failed.
- Title + one-sentence cause + retry action. No stack traces in the user surface.

**Partial / stale** (often missing):
- "Last updated 2 minutes ago" timestamp on every live widget. The user must know how fresh the data is.
- If a fetch fails but cached data exists, show the cache with a stale badge — never blank the widget.

## 7. Drawers, modals, inline edit

Pick one, not all three, for a given task.

| Pattern | Use when |
|---|---|
| **Inline edit** | Single field; immediately reversible (cell, name, status pill) |
| **Drawer** (right-side, 480–640 px) | Multi-field detail, keeps list context visible |
| **Modal** | Destructive confirm, blocking choice, multi-step wizard |
| **Side-by-side / route** | Editing > 8 fields, or anything benefitting from URL share |

Drawers are not modals: they don't block the page, they let users keep scanning the underlying list. Modal is for "you must answer this now"; drawer is for "look at this without losing your place".

Inline edit rules: visible affordance on hover (pencil icon or border on focus), `Esc` cancels, `Enter` saves, error inline below the cell, keyboard focus moves to next cell on save.

## 8. Bulk actions

When ≥ 1 row is selected, the filter bar is replaced in place by a bulk-action bar (no layout shift):

- Left: count (`3 selected`) + clear-selection link.
- Center: contextual actions (Archive, Tag, Export, Delete).
- Right: select-all-matching link if filtered ("Select all 1,284 matching" beyond the current page).

Destructive actions (Delete, Archive bulk) always confirm in a modal with the count quoted. No "are you sure" toasts — the modal is the friction.

## 9. Command palette (Cmd/Ctrl+K)

Required on any dashboard with > 5 top-level routes. It is the second navigation, sized for keyboard users.

Sections, in this order:
1. **Recent** — last 5 items the user touched.
2. **Go to…** — routes (Customers, Settings, Billing).
3. **Create…** — new entity actions (New invoice, New user).
4. **Run…** — verbs (Export CSV, Refresh data, Sign out).
5. **Help** — docs, shortcuts, support.

Fuzzy match on label + keywords. Up/down to navigate, `Enter` to run, `Esc` to close, `Cmd/Ctrl+K` toggles. Section headers visible, not collapsed.

Blueprint: `references/dashboard-blueprints/command-palette.md`.

## 10. Notifications

Two surfaces, different jobs:

- **Toast** — transient, < 5 s, one line, no required action. Bottom-right or bottom-center. Stack max 3; older slide off.
- **Inbox / notification center** — durable, opened from a topbar bell with unread count. Markable as read. Keeps history. Filterable.

Toast is for confirmation ("Saved"); inbox is for events ("New report available", "User X requested access"). Don't mirror everything to both — pick one per event.

Toast colors: success `--color-success-500`, info `--color-info-500`, warning `--color-warning-500`, danger `--color-danger-500`. Always include an icon — color alone fails for colorblind users (rule 5 in spirit; channels other than color).

Blueprint: `references/dashboard-blueprints/notification-center.md`.

## 11. Filters and saved views

Filter bar lives directly above the table or chart it filters. Components, in order:
1. Date range picker (default to "Last 30 days" on first load, persist last choice).
2. Segment selectors (chips with single or multi-select).
3. Search input (debounced 200 ms).
4. Saved views dropdown ("Open issues", "My team", "This quarter").
5. Reset link (only when ≥ 1 filter is non-default).

Active filters appear as removable chips below the bar. The URL must reflect the filter state — every dashboard view should be linkable.

Saved views are per-user by default; "shared" views require explicit permission and a separate icon (people icon).

Blueprint: `references/dashboard-blueprints/filter-bar.md`.

## 12. Role-based UI

Same surface, different shapes, by role. Three principles:

- **Hide what users can't act on**, but show empty-state explanations for predictable absences ("Billing visible to admins only").
- **Read-only is a real state**, not just disabled buttons. Switch to a `"view"` density: no hover lifts, no inline edit handles, badge "View only" near the title.
- **Never compute role on the client only.** Hide for affordance; enforce on the server.

Three common roles to design for: **Admin** (sees everything), **Member** (acts on own work), **Viewer** (read-only). A surface that doesn't differ across these is suspicious; usually you missed an action.

## 13. Responsive behavior

A dashboard that only works at 1440 is a desk dashboard, not a product. See `references/responsive-grids/dashboard-grid.md`.

Headlines:
- KPI rows: 4-up at ≥ 1280, 2-up at 768–1279, 1-up < 768.
- Tables collapse to card-stacks below 768 px (`references/data-tables/responsive.md`).
- Sidebar becomes a sheet below 1024 px.
- Charts shrink height to 200 px on mobile; legends move below the plot or behind a "Legend" toggle.

Use container queries (`@container`) for KPI tiles so a 4-up grid that becomes 2-up doesn't need bespoke per-tile breakpoints — tiles respond to their parent column width.

## 14. Anti-patterns

- A 12-column dashboard that ignores its own grid (cards at 11/12, 7/12 with no semantic reason).
- "All metrics in one row" — > 6 KPIs side by side. Group into rows of 3–4.
- Tooltips that carry primary information. Tooltips supplement; everything in a tooltip must be reachable by keyboard or visible elsewhere.
- Pie charts with > 5 slices. Use a bar chart.
- A table that resorts on data refresh, scrolling the user away from their selection.
- Modals for non-blocking work. If the page can keep being useful, it's a drawer.
- Refreshing a chart without preserving the current zoom / time range.
