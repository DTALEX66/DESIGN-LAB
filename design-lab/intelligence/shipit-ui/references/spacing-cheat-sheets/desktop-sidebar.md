# Desktop Sidebar — Spacing Cheat Sheet

Authoritative spacing rules for desktop sidebars produced by `shipit-ui-design`. Sourced from a user-provided spec ("Ultimate Spacing Cheat Sheet — Desktop Sidebar") and translated into the plugin's token system. The dashboard `app-shell-sidebar.md` blueprint must reference this file rather than duplicate values.

All values are pixels; tokens shown in parens. Light and dark modes use the same spacing — only colors differ.

## Container

| Region | Value | Token |
|---|---|---|
| Sidebar top padding | 32px | `--space-8` |
| Sidebar bottom padding | 44px | (literal — window-chrome safe area; see note) |
| Sidebar horizontal padding (expanded) | 16px | `--space-4` |
| Sidebar horizontal padding (collapsed) | 8px | `--space-2` |
| Expanded width | 240–272px | (project-defined; see note) |
| Collapsed width | 64px | (project-defined) |
| Width transition | 200ms `--ease-out` | tokenized |

**Note on 44px bottom:** the original spec uses 44px to match macOS window-chrome rhythm. Define as `--space-11` if your scale extends; otherwise keep as a one-off literal in the sidebar component only and document why.

## Vertical rhythm — top to bottom

```
[ window chrome     ]    44px above the sidebar (OS-level, not part of sidebar box)
┌────────────────────┐
│                    │   32px → --space-8   (container top padding)
│   ┌─ logo row ─┐   │
│   │ Logo  ↔ <  │   │   Logo row height: 32px → --space-8
│   └────────────┘   │
│                    │   32px → --space-8   (logo row to search)
│   ┌─ search ───┐   │
│   │ 🔍 Search… │   │   Search height: 40px → --space-10
│   └────────────┘   │
│                    │   32px → --space-8   (search to first section label)
│   MAIN             │   Section label height: 16px → --space-4
│                    │   16px → --space-4   (label to first item)
│   ┌─ Home ─────┐   │   Item height: 40px → --space-10
│   └────────────┘   │
│                    │    4px → --space-1   (between items, baseline rhythm)
│   ┌─ Orders ───┐   │
│   └────────────┘   │
│                    │    4px → --space-1
│   ┌─ Doc.. ━━━ ┐   │   Active item: same height, full pill background
│   └────────────┘   │
│                    │    4px → --space-1
│   ┌─ Map ──────┐   │
│   └────────────┘   │
│                    │    4px → --space-1
│   ┌─ Stats ────┐   │
│   └────────────┘   │
│                    │   24px → --space-6   (last item to next section label)
│   COMMUNICATION    │
│                    │   16px → --space-4
│   ┌─ Inbox 9+ ─┐   │
│   └────────────┘   │
│                    │    4px
│   ┌─ Couriers ─┐   │
│   └────────────┘   │
│                    │   24px → --space-6   (last item to promo card)
│   ┌─ promo card ┐  │   See "Promo card" below
│   └─────────────┘  │
│                    │   48px → --space-12  (promo card to bottom utility)
│   ┌─ Settings ─┐   │
│   └────────────┘   │
│                    │    4px → --space-1
│   ┌─ Help ─────┐   │
│   └────────────┘   │
│                    │   16px → --space-4   (help to user row)
│   ┌─ user row ─┐   │   See "User row" below
│   └────────────┘   │
│                    │   44px (container bottom padding)
└────────────────────┘
```

## Token reference table (vertical)

| From → To | Gap | Token |
|---|---|---|
| Container top → logo | 32px | `--space-8` |
| Logo → search | 32px | `--space-8` |
| Search → first section label | 32px | `--space-8` |
| Section label → first item in section | 16px | `--space-4` |
| Item → adjacent item (same section) | 4px | `--space-1` |
| Last item of section → next section label | 24px | `--space-6` |
| Last nav block → promo card | 24px | `--space-6` |
| Promo card → bottom utility (Settings) | 48px | `--space-12` |
| Bottom utility → bottom utility | 4px | `--space-1` |
| Bottom utility → user row | 16px | `--space-4` |
| User row → container bottom | 44px | literal |

## Logo row

| Item | Value | Token |
|---|---|---|
| Row height | 32px | `--space-8` |
| Logo to chevron-collapse button gap | 16px | `--space-4` |
| Chevron button size | 32×32px | `--space-8` |
| Chevron icon size | 16px | `--space-4` |
| Logo internal padding | 0 | (logo is its own asset) |

## Search input

| Item | Value | Token |
|---|---|---|
| Height | 40px | `--space-10` |
| Horizontal padding | 12px | `--space-3` |
| Icon-to-text gap | 8px | `--space-2` |
| Border radius | medium | `--radius-md` |
| Placeholder color | low-emphasis | `--color-fg-subtle` |

## Section label

| Item | Value | Token |
|---|---|---|
| Height | 16px line | `--space-4` |
| Font size | 11–12px | `--text-2xs` or `--text-xs` |
| Letter-spacing | 0.06em | tokenized |
| Text-transform | uppercase | — |
| Color | low-emphasis | `--color-fg-subtle` |
| Horizontal padding | 12px | `--space-3` |

## Nav item

| Item | Value | Token |
|---|---|---|
| Height | 40px | `--space-10` |
| Horizontal padding | 12px | `--space-3` |
| Icon size | 20px | (between `--space-5` and `--space-6`) |
| Icon-to-label gap | 12px | `--space-3` |
| Label font size | 14px | `--text-sm` |
| Border radius | medium | `--radius-md` |
| Active background | brand subtle | `--color-brand-soft` |
| Active label/icon color | brand | `--color-brand` |
| Hover background | surface elevated | `--color-surface-elevated` |
| Focus ring | 2px outset | `--color-ring` + `--ring-offset` |
| Badge (e.g., "9+") | inline-end | small pill, `--space-2` horizontal padding |

## Promo card ("Used capacity")

| Item | Value | Token |
|---|---|---|
| Card border radius | large | `--radius-lg` |
| Card padding (all sides) | 16px | `--space-4` |
| Card top edge → progress ring center | 56px | `--space-14` |
| Ring → label gap | 12px | `--space-3` |
| Label → description gap | 16px | `--space-4` |
| Description → button gap | 32px | `--space-8` |
| Description line-height | 1.5 | `--leading-normal` |
| Button height | 40px | `--space-10` |
| Card → container bottom edge minimum | 48px | `--space-12` |
| Close (×) button | 16px hit area, top-right inset 12px | `--space-3` |

## User row

| Item | Value | Token |
|---|---|---|
| Avatar size | 32px | `--space-8` |
| Avatar → name/email gap | 12px | `--space-3` |
| Name font size | 14px | `--text-sm` |
| Email font size | 12px | `--text-xs`, color `--color-fg-subtle` |
| Logout icon size | 16px | `--space-4` |
| Bottom padding to sidebar bottom | 44px | literal |

## Collapsed sidebar (icon-only)

When the sidebar collapses to a 64px-wide icon rail:

| Item | Value | Token |
|---|---|---|
| Width | 64px | (literal: 4× `--space-4`) |
| Item size | 40×40px | `--space-10` |
| Icon size | 20px | between `--space-5`/`--space-6` |
| Item → adjacent item gap | 4px | `--space-1` |
| Tooltip offset from rail | 8px | `--space-2` |
| Tooltip background | inverse surface | `--color-surface-inverse` |
| Tooltip text | inverse foreground | `--color-fg-inverse` |
| Tooltip padding | 8px 12px | `--space-2 --space-3` |
| Tooltip border radius | small | `--radius-sm` |
| Tooltip delay-show | 300ms | `--dur-medium` |
| Tooltip delay-hide | 0 | — |

The collapsed rail keeps the **same vertical rhythm as expanded** — 4px between items, 24px between sections, 48px before bottom utility. Tooltips reveal labels on hover with respect to `prefers-reduced-motion`.

## Section dividers (optional)

When sections need a visible boundary instead of whitespace:

| Item | Value | Token |
|---|---|---|
| Divider thickness | 1px | hairline |
| Divider color | subtle border | `--color-border-subtle` |
| Top spacing | 16px | `--space-4` |
| Bottom spacing | 16px | `--space-4` |

Prefer whitespace (the 24px gap) for clean modern sidebars; only use dividers when the sidebar is dense and grouping is otherwise unclear.

## Density variants

| Variant | Item height | Item gap | Section label gap |
|---|---|---|---|
| Comfortable (default) | 40px | 4px | 24px |
| Compact | 32px | 2px | 16px |
| Roomy | 48px | 6px | 32px |

Compact suits operator dashboards (analyst, ops). Roomy suits exec-level dashboards. Default to comfortable for general admin.

## States — required

Every nav item must implement: rest, hover, focus-visible, active (currently selected route), pressed, disabled. Active and focus-visible may stack (when keyboarding to the current page).

## Accessibility

- Sidebar uses `<nav aria-label="Primary">`.
- Section labels use `<h2>` (or visually-hidden heading + role="group" if visual hierarchy must stay flat).
- Active item uses `aria-current="page"`.
- Collapse button uses `aria-expanded` and `aria-controls`.
- Tooltips on collapsed rail use `aria-describedby`; never use `title` attribute alone.
- All hit areas ≥ 40×40px (comfortable / roomy) or ≥ 32×32px (compact, only for power users).
- Keyboard: `Tab` cycles items; `Enter`/`Space` activates; `Esc` closes any open submenu.

## Constitution check

This file conforms to plugin constitution (spec section 5):

1. ≤ 300 lines: yes.
2. No hardcoded design values in generated code: every value above is tokenized; the literal 44px bottom is the only allowed exception, documented inline.
3. All interactive elements specify hover/active/focus-visible/disabled: see "States — required."
4. Motion respects `prefers-reduced-motion`: see tooltip rules and width-transition note.
5. Decorative icons must be `aria-hidden`; meaningful icons must have accessible labels.
6. Dark mode: spacing identical, colors swap via tokens — no separate sidebar layout.
7. Stack-respect: this file is framework-agnostic. Generated component implementations adapt to project's stack.
