# App Shell — Topbar Only

The lightweight shell. Two regions: topbar and content. Pick when you have ≤ 5 top-level routes, the surface is content-led, or the dashboard is public-facing (settings, billing, marketing-adjacent admin).

## Anatomy

```
┌────────────────────────────────────────────────┐
│ topbar (logo, primary nav, search, profile)    │  64 px
├────────────────────────────────────────────────┤
│ content                                        │
│ (page)                                         │
└────────────────────────────────────────────────┘
```

- **Topbar**: 64 px tall (heavier than sidebar shell because it carries primary nav).
- **Content**: full width, max-width capped (`1200 px` typical for content-led admin) and centered. Outer padding `--space-4 / -6 / -8`.

## Topbar layout

```
[logo] [primary nav 3–5 items]                [search] [bell] [avatar]
```

- Logo left-aligned.
- Primary nav: 3–5 horizontal links with hover and active treatments. More than 5 means you should use the sidebar shell instead.
- Search / palette trigger right-of-center, 280–360 px wide.
- Notifications bell + profile menu on the far right.

Below `lg`, primary nav collapses into a hamburger that opens a top-anchored sheet (drops down from below the topbar).

## States

| State | Visual change |
|---|---|
| nav item default | Text `--color-text-1`, no background |
| nav item hover | bg `--color-surface-2` |
| nav item active | Underline 2 px at `--color-brand-600`, 4 px below text |
| nav item focus-visible | 2 px ring `--color-ring`, offset 2 px |
| topbar scrolled | 1 px bottom border becomes visible (was transparent at top) |
| mobile menu open | Sheet drops from below topbar; scrim behind |

The active-link underline is below the link with 4 px of breathing room. A flush underline reads as a strikethrough.

## Accessibility

- `<header role="banner">` for topbar. `<nav aria-label="Primary">` for nav.
- Skip link as first focusable: `"Skip to main content"`.
- Mobile menu trigger is `aria-expanded` and labels `"Open menu"` / `"Close menu"`.
- Mobile sheet traps focus; `Esc` closes; restores focus to trigger.
- Active link: `aria-current="page"`.

## Responsive behavior

| Breakpoint | Primary nav | Search |
|---|---|---|
| `< md` (< 768) | Hamburger → top sheet | Hidden; opens via icon |
| `md` (768–1023) | Hamburger → top sheet | Inline, narrower |
| `lg` (≥ 1024) | Inline 3–5 items | Inline full width |

Content max-width:
- Content-led admin: cap at `1200 px`.
- Full-data admin: cap at `1440 px`.
- Below cap, content is full width minus outer padding.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-600
--color-ring
--space-4 / -6 / -8
--dur-200
--ease-out-quint
```

## React + Tailwind reference

```tsx
"use client";
import { useState } from "react";

export function AppShellTopbar({ items, children }: {
  items: { href: string; label: string; active?: boolean }[];
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[var(--color-surface-1)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
      >
        Skip to main content
      </a>

      <header
        role="banner"
        className="sticky top-0 z-20 flex h-16 items-center gap-6
                   border-b border-[var(--color-border-subtle)]
                   bg-[var(--color-surface-1)] px-4 sm:px-6 lg:px-8"
      >
        {/* logo */}

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-2">
            {items.map(i => (
              <li key={i.href}>
                <a
                  href={i.href}
                  aria-current={i.active ? "page" : undefined}
                  className={[
                    "relative rounded-[var(--radius-md)] px-3 py-2",
                    "text-[var(--color-text-1)]",
                    "hover:bg-[var(--color-surface-2)]",
                    "focus-visible:outline focus-visible:outline-2",
                    "focus-visible:outline-offset-2",
                    "focus-visible:outline-[var(--color-ring)]",
                    i.active && "after:absolute after:left-3 after:right-3",
                    i.active && "after:-bottom-1 after:h-0.5",
                    i.active && "after:bg-[var(--color-brand-600)]",
                  ].filter(Boolean).join(" ")}
                >
                  {i.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* palette trigger / search */}
          {/* notifications bell */}
          {/* profile avatar */}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(v => !v)}
            className="lg:hidden"
          >
            {/* hamburger icon */}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-b border-[var(--color-border-subtle)]
                     bg-[var(--color-surface-1)] lg:hidden
                     motion-reduce:transition-none
                     transition-[max-height] duration-[var(--dur-200)]"
        >
          <nav aria-label="Primary mobile" className="px-4 py-3">
            <ul className="flex flex-col gap-1">
              {items.map(i => (
                <li key={i.href}>
                  <a
                    href={i.href}
                    aria-current={i.active ? "page" : undefined}
                    className="block rounded-[var(--radius-md)] px-3 py-2
                               hover:bg-[var(--color-surface-2)]"
                  >
                    {i.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      <main id="main" className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
```

## Anti-patterns

- 6+ items in topbar primary nav → use the sidebar shell.
- Active state via color only — pair with underline or weight.
- Topbar that's not sticky on long content pages.
- Search input wider than the logo + primary nav combined — competes with brand.
- Mobile menu that overlays content with no scrim, letting touches pass through to content underneath.

## Cross-references

- `references/dashboard-blueprints/app-shell-sidebar.md` — heavier shell.
- `references/dashboard-blueprints/command-palette.md` — palette via `Cmd+K`.
- `references/dashboard-blueprints/notification-center.md` — bell + inbox.
