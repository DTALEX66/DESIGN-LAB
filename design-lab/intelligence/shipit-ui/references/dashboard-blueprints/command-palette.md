# Command Palette

`Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux). The second navigation, sized for keyboard users. Required on any dashboard with > 5 top-level routes.

## Anatomy

```
┌──────────────────────────────────────────────┐
│ 🔍  Type a command or search…              ⌘K│  ← input
├──────────────────────────────────────────────┤
│ Recent                                       │
│   Customers · Acme Corp                      │
│   Reports · Q1 revenue                       │
│ Go to                                        │
│   Customers                            ⌘ G C │
│   Settings                                   │
│ Create                                       │
│   New invoice                          ⌘ N I │
│   New user                                   │
│ Run                                          │
│   Export CSV                                 │
│   Refresh data                          ⌘ R  │
│ Help                                         │
│   Keyboard shortcuts                    ⌘ /  │
│   Documentation                              │
└──────────────────────────────────────────────┘
   ↑↓ navigate · ↵ run · esc close
```

## Sections (in order)

1. **Recent** — last 5 items the user touched (visited routes, opened records).
2. **Go to…** — routes (Customers, Settings, Billing).
3. **Create…** — new entity actions.
4. **Run…** — verbs (Export CSV, Refresh, Sign out).
5. **Help** — docs, shortcuts, support.

Section headers always visible — never collapsed. Empty sections are hidden.

## Behavior

- Trigger: `Cmd+K` (mac) / `Ctrl+K` (win/linux). Detected at runtime, not hardcoded.
- Fuzzy match on label + keywords. Typing "cus" matches "Customers" and "Acme Corp" (under Recent).
- ↑/↓ to move selection (wraps at edges).
- `Enter` to run/navigate.
- `Esc` to close.
- `Tab` does **not** move out of the palette — focus is trapped while open.
- Click-outside closes.
- Selected item highlighted with bg `--color-surface-2` and 2 px leading rail `--color-brand-600`.
- Item with submenu (e.g., "Go to → Customer detail") shows a trailing chevron; Right Arrow opens nested.

## Discoverability

- Topbar: a `Cmd K` pill in the search slot — tells users the shortcut exists.
- First-run: dismissable hint above the search input on first visit.
- Help section in the palette itself includes "Keyboard shortcuts" linking to the full list.

## Accessibility

- The palette is a `<dialog>` (or `role="dialog"`) with `aria-label="Command palette"`.
- Input has `role="combobox"` and `aria-expanded="true"`, with `aria-controls` pointing at the listbox.
- The list is `role="listbox"`. Each item is `role="option"` with `aria-selected`.
- Section headers are `role="presentation"` (decorative; don't announce as options).
- Focus trapped on open; restored to trigger on close.
- Live region announces selection changes: `aria-activedescendant` on the input pointing at the focused option ID.
- Touch users: full-screen sheet rather than centered modal; same listbox behavior.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-600
--color-ring
--space-2 / -3 / -4
--text-sm / -base
--radius-lg
--shadow-md
--dur-200
--ease-out-quint
```

## Visual rules

- Width: 560–640 px on desktop. Centered, top offset `--space-16`.
- Backdrop: black at 50 % opacity, blurred 4 px.
- Body max-height 480 px; scrolls internally — selected item auto-scrolled into view.
- Item: 40 px tall in compact, 48 px in comfortable.
- Per-item: leading icon (16 px), label, trailing keyboard-shortcut hint (kbd-style chips).

## Responsive behavior

| Breakpoint | Palette |
|---|---|
| `< md` (< 768) | Full-screen sheet, top-down; large input; same listbox below |
| `md` (≥ 768) | Centered modal at width 560–640 px |
| `xl` (≥ 1280) | Centered modal at 640 px |

## React + Tailwind reference (skeleton)

```tsx
type Item = {
  id: string;
  section: "Recent" | "Go to" | "Create" | "Run" | "Help";
  label: string;
  keywords?: string[];
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: Item[];
};

export function CommandPalette({ open, onClose, items }: Props) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const visible = useFuzzyFilter(items, query);
  const sections = groupBy(visible, i => i.section);

  // open via Cmd/Ctrl+K wired in parent. focus-trap on open.

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Command palette"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-black/50 pt-16 backdrop-blur-sm
                 motion-reduce:transition-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-[var(--radius-lg)]
                   border border-[var(--color-border-subtle)]
                   bg-[var(--color-surface-1)] shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b
                        border-[var(--color-border-subtle)] px-4 py-3">
          <span aria-hidden="true">🔍</span>
          <input
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={activeId ?? undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-[var(--text-base)]
                       text-[var(--color-text-1)] outline-none"
            autoFocus
          />
          <kbd className="text-[var(--text-sm)] text-[var(--color-text-2)]">⌘K</kbd>
        </div>

        <ul id="cmdk-list" role="listbox"
            className="max-h-[480px] overflow-y-auto p-2">
          {Array.from(sections.entries()).map(([section, list]) => (
            <li key={section} role="presentation">
              <div className="px-2 pb-1 pt-3 text-[var(--text-xs)]
                              font-semibold uppercase tracking-wide
                              text-[var(--color-text-2)]">
                {section}
              </div>
              <ul role="presentation">
                {list.map(i => (
                  <li
                    key={i.id}
                    id={i.id}
                    role="option"
                    aria-selected={i.id === activeId}
                    onClick={i.onSelect}
                    onMouseEnter={() => setActiveId(i.id)}
                    className={[
                      "flex items-center gap-3 rounded-[var(--radius-md)]",
                      "px-3 py-2 text-[var(--text-sm)]",
                      "text-[var(--color-text-1)] cursor-pointer",
                      i.id === activeId && "bg-[var(--color-surface-2)]",
                    ].filter(Boolean).join(" ")}
                  >
                    {i.icon && <span aria-hidden="true">{i.icon}</span>}
                    <span>{i.label}</span>
                    {i.shortcut && (
                      <kbd className="ml-auto text-[var(--color-text-2)]">
                        {i.shortcut}
                      </kbd>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 border-t
                        border-[var(--color-border-subtle)] px-4 py-2
                        text-[var(--text-xs)] text-[var(--color-text-2)]">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
```

Arrow-key handling, fuzzy match, recent-items persistence, and shortcut detection are project concerns; integrate with whatever cmdk library is present (`cmdk`, `kbar`, `@headlessui/react Combobox` — verify project deps).

## Anti-patterns

- Hardcoding `Cmd` — Windows/Linux users see the wrong shortcut.
- Collapsed section headers (Recent / Go to / etc. should always be visible).
- A palette without keyboard shortcut hints on common actions.
- Including everything in one flat list (no sections).
- A palette that conflicts with `Cmd+K` browser shortcuts (search) without a fallback.
- Auto-running a destructive action on Enter without confirmation.

## Cross-references

- `references/dashboard-blueprints/app-shell-sidebar.md` — global palette trigger.
- `references/dashboard-blueprints/app-shell-topbar.md` — palette trigger in topbar.
- `skills/dashboard-design/SKILL.md` § 9 — palette guidance.
