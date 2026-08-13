# Notification Center

Two surfaces, two jobs:

- **Toast** — transient, < 5 s, no required action. For confirmations.
- **Inbox panel** — durable, opened from a topbar bell with unread count. For events the user might want to act on later.

Pick one per event. Don't mirror everything to both.

## Toast

### Anatomy

```
┌────────────────────────────────────┐
│ ✓  Saved.                       ✕  │
└────────────────────────────────────┘
```

| Element | Role |
|---|---|
| Icon | Severity glyph (success ✓, info ℹ, warning !, danger ⚠) |
| Message | One line, ≤ 12 words |
| Action (optional) | Single text button: "Undo", "View", etc. |
| Close button | × (always present, keyboard-reachable) |

### States / variants

| Variant | Tokens |
|---|---|
| success | bg `--color-success-50`, border `--color-success-200`, icon `--color-success-600` |
| info | bg `--color-info-50`, icon `--color-info-600` |
| warning | bg `--color-warning-50`, icon `--color-warning-600` |
| danger | bg `--color-danger-50`, icon `--color-danger-600` |

Color is paired with the icon — the icon carries severity for colorblind users (rule 5 spirit).

### Behavior

- Auto-dismiss: 4 s default. Dangers do not auto-dismiss.
- Hover or focus pauses the dismiss timer; resumes on leave.
- Stack: bottom-right (or bottom-center). Max 3 visible; older slide off.
- Position: fixed, `--space-4` from viewport edges.
- Animation: enter 200 ms ease-out, slide-up + fade in. Exit 150 ms ease-in, fade out.
- Reduced motion: opacity-only.

### Accessibility

- The toast region is `<div role="region" aria-live="polite" aria-label="Notifications">`.
- Danger toasts use `role="alert"` (assertive) on the toast itself.
- Focus does not auto-move to a toast — that would interrupt the user's flow.
- Close button has `aria-label="Dismiss"`.
- Action button is a real `<button>` and survives focus on dismiss (focus returns to the trigger of the action that produced the toast).

## Inbox panel

### Anatomy

```
┌────────────────────────┐
│ Notifications     ⚙   │
│ All | Unread (3) | …  │
├────────────────────────┤
│ ●  New invoice for...  │
│    2 minutes ago       │
├────────────────────────┤
│    Report ready        │
│    1 hour ago          │
└────────────────────────┘
                  [Mark all read]
```

| Element | Role |
|---|---|
| Header | Title + filter tabs + settings link |
| Filter tabs | All / Unread / Mentions / etc. |
| List | Notification items with unread dot, title, timestamp |
| Footer | "Mark all read" / "View all" link |

### Item structure

- Unread dot (leading) at `--color-brand-600`. Empty when read.
- Title (one line) at `var(--text-sm)` weight 500.
- Body (one line, optional) at `var(--text-xs)` `--color-text-2`.
- Timestamp at `var(--text-xs)` `--color-text-2`.
- Click row to navigate to the source. Mark-read on click.

### States

| State | Visual |
|---|---|
| empty | "No notifications yet" + illustration |
| empty (filtered) | "No unread notifications" |
| loading | Skeleton rows |
| error | "Failed to load. Retry." inline |

### Behavior

- Bell icon in topbar with unread count badge. Badge max display "9+".
- Click bell to open panel (popover on desktop, bottom sheet on mobile).
- Panel width: 360–400 px on desktop. Full-screen on mobile.
- `Esc` closes; click outside closes.
- Mark-as-read: click an item, or "Mark all read" button.

### Accessibility

- Bell button: `aria-label="Notifications, 3 unread"` (count in label).
- Panel is a real popover with focus trap on open.
- Each item is a real `<button>` (or `<a>` if it navigates).
- Filter tabs use `role="tablist"` with `role="tab"` children.
- Read state changes announce via `aria-live="polite"`.

## Tokens consumed

```
--color-surface-1 / -2
--color-text-1 / -2
--color-border-subtle
--color-brand-600
--color-success-50 / -200 / -600
--color-info-50 / -600
--color-warning-50 / -600
--color-danger-50 / -600
--space-2 / -3 / -4
--text-xs / -sm
--radius-md / -lg
--shadow-md
--dur-150 / -200
--ease-out-quint / --ease-in-out-cubic
```

## React + Tailwind reference (toast)

```tsx
type Variant = "success" | "info" | "warning" | "danger";
type Toast = {
  id: string;
  variant: Variant;
  message: string;
  action?: { label: string; onClick: () => void };
};

const styles: Record<Variant, string> = {
  success: "bg-[var(--color-success-50)] border-[var(--color-success-200)]",
  info: "bg-[var(--color-info-50)] border-[var(--color-info-200)]",
  warning: "bg-[var(--color-warning-50)] border-[var(--color-warning-200)]",
  danger: "bg-[var(--color-danger-50)] border-[var(--color-danger-200)]",
};

export function ToastRegion({ toasts, onDismiss }: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role={t.variant === "danger" ? "alert" : undefined}
          className={[
            "flex items-center gap-3 rounded-[var(--radius-md)] border",
            "p-3 shadow-[var(--shadow-md)]",
            "motion-reduce:transition-none transition-all",
            "duration-[var(--dur-200)] ease-[var(--ease-out-quint)]",
            styles[t.variant],
          ].join(" ")}
        >
          <Icon variant={t.variant} aria-hidden="true" />
          <p className="text-[var(--text-sm)] text-[var(--color-text-1)]">{t.message}</p>
          {t.action && (
            <button
              type="button"
              onClick={t.action.onClick}
              className="ml-2 text-[var(--text-sm)] font-semibold underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => onDismiss(t.id)}
            className="ml-auto"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Anti-patterns

- Mirroring every event to both toast and inbox.
- Toasts that auto-dismiss for danger / errors.
- Toasts that block clicks on the page beneath them.
- Inbox panel without unread state.
- Notification badge that lies (shows 0 when there are unread).
- Toast color without an icon — fails for colorblind users.
- Stack of 8+ toasts overlapping the page — cap at 3.

## Cross-references

- `skills/dashboard-design/SKILL.md` § 10
- `skills/motion-design/SKILL.md` — entrance/exit motion.
