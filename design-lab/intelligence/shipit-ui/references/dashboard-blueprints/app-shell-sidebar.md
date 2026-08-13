# App Shell — Sidebar + Topbar

The default shell for dashboards with > 6 top-level routes, multi-tenant work, role-based menus, or deep IA. Three regions: topbar, sidebar, content.

## Anatomy

```
┌────────────────────────────────────────────────┐
│ topbar (logo, search, notifs, profile)         │  56 px
├────────┬───────────────────────────────────────┤
│ sidebar│   content                              │
│ - nav  │   (page)                               │
│ - foot │                                        │
│  240px │                                        │
└────────┴───────────────────────────────────────┘
```

- **Topbar**: 56 px tall, full width, sticky to top. Houses logo (left), command palette trigger / search (center, max-width 480 px), notifications bell + profile avatar (right).
- **Sidebar**: 240 px wide on `≥ lg`, collapsible to 64 px (icon-only) via toggle. Becomes a sheet behind hamburger below `lg`.
- **Content**: `1fr`, scrolls independently. Outer padding `--space-4 / -6 / -8`.

## States

| State | Visual change |
|---|---|
| sidebar default | 240 px, labels visible, items at `var(--text-sm)` |
| sidebar collapsed | 64 px, icon only, label as tooltip on hover |
| sidebar mobile (sheet) | Hidden, slides over content from left, scrim 50% black |
| topbar scroll | 1 px bottom border becomes visible (was transparent at top) |
| nav item active | 2 px leading rail `--color-brand-600`, bg `--color-surface-2` |
| nav item hover | bg `--color-surface-2` (no transform) |
| nav item focus-visible | 2 px ring `--color-ring`, offset 2 px |

## Accessibility

- `<header role="banner">` for topbar. `<nav aria-label="Primary">` for sidebar nav.
- Skip link `<a href="#main">Skip to main content</a>` as the first focusable element on every route.
- Sidebar toggle is `aria-expanded` and labels: `"Collapse sidebar"` / `"Expand sidebar"`.
- Mobile sheet traps focus when open; `Esc` closes; restores focus to the trigger.
- Sidebar collapsed state shows tooltips on icon-only items; `aria-label` carries the route name.
- Active route has `aria-current="page"`.

## Responsive behavior

| Breakpoint | Sidebar | Topbar |
|---|---|---|
| `< md` (< 768) | Sheet behind hamburger | Topbar full width; logo, hamburger, profile only |
| `md` (768–1023) | Sheet behind hamburger | Add search/palette trigger |
| `lg` (≥ 1024) | Persistent 240 px | Full topbar |
| `xl` (≥ 1280) | Persistent 240 px or collapsed 64 px (user choice) | Full topbar |

User's collapse choice persists per-user. Don't auto-collapse based on viewport above `lg` — respect the choice.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-600
--color-ring
--space-4 / -6 / -8
--shadow-sm     /* mobile sheet */
--dur-200
--ease-out-quint
```

## React + Tailwind reference

```tsx
"use client";
import { useState } from "react";

export function AppShell({ nav, children }: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="grid min-h-dvh"
      style={{
        gridTemplateAreas: '"topbar topbar" "sidebar content"',
        gridTemplateColumns: collapsed ? "64px 1fr" : "240px 1fr",
        gridTemplateRows: "56px 1fr",
      }}
    >
      <header
        role="banner"
        className="[grid-area:topbar] sticky top-0 z-20 flex items-center
                   gap-4 border-b border-[var(--color-border-subtle)]
                   bg-[var(--color-surface-1)] px-4 lg:px-6"
      >
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(v => !v)}
          className="lg:hidden"
        >
          {/* hamburger icon */}
        </button>
        {/* logo, palette trigger, notifications, profile */}
      </header>

      <aside
        aria-label="Primary"
        className="[grid-area:sidebar] hidden border-r
                   border-[var(--color-border-subtle)]
                   bg-[var(--color-surface-1)] lg:block"
      >
        {nav}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(v => !v)}
        >
          {/* chevron icon */}
        </button>
      </aside>

      <main
        id="main"
        className="[grid-area:content] overflow-auto p-4 sm:p-6 lg:p-8"
      >
        {children}
      </main>

      {/* mobile sheet — trapped focus, Esc closes */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden
                     motion-reduce:transition-none
                     transition-opacity duration-[var(--dur-200)]"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            aria-label="Primary"
            className="h-full w-72 bg-[var(--color-surface-1)] p-4 shadow-[var(--shadow-md)]"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
          </aside>
        </div>
      )}
    </div>
  );
}
```

```tsx
export function NavItem({ href, icon, label, active }: {
  href: string; icon: React.ReactNode; label: string; active?: boolean;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex items-center gap-3 rounded-[var(--radius-md)]",
        "px-3 py-2 text-[var(--color-text-1)]",
        "hover:bg-[var(--color-surface-2)]",
        "focus-visible:outline focus-visible:outline-2",
        "focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
        active && "bg-[var(--color-surface-2)] before:absolute before:left-0",
        active && "before:top-1 before:h-[calc(100%-0.5rem)] before:w-0.5",
        active && "before:bg-[var(--color-brand-600)]",
      ].filter(Boolean).join(" ")}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
```

## Anti-patterns

- A persistent sidebar on mobile.
- Two sidebars (primary + secondary). Use a single sidebar plus an in-content `<aside>`.
- Sidebar that auto-collapses on viewport without persisting user choice.
- Topbar that's not sticky — users lose orientation when scrolling deep tables.
- `onClick` on a `<div>` for nav items; use real `<a>` so middle-click and right-click work.

## Cross-references

- `references/spacing-cheat-sheets/desktop-sidebar.md` — **authoritative spacing values** for sidebar internals (item heights, gaps, promo card, user row, collapsed rail).
- `references/canonical-tokens.md` — token name reference (some tokens used here have accepted aliases).
- `references/dashboard-blueprints/app-shell-topbar.md` — alternate shell.
- `references/dashboard-blueprints/command-palette.md` — `Cmd+K` overlay.
- `references/dashboard-blueprints/notification-center.md` — bell + inbox.
- `references/responsive-grids/dashboard-grid.md` — content grid inside `<main>`.
