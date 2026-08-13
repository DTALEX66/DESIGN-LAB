# KPI Tile

A KPI tile is the atomic unit of a dashboard. Five elements — drop any and you have decoration.

## Anatomy

```
┌──────────────────────────────────┐
│ Label                            │  ← what the metric is
│                                  │
│  $42,180        ↑ +12.4%         │  ← value + delta
│                                  │
│  vs prior 30 days                │  ← comparison context
│  ╱╲      ╱╲╱╲                    │  ← sparkline
│ ╱  ╲    ╱      ╲                 │
└──────────────────────────────────┘
```

1. **Label** — `var(--text-sm)`, `--color-text-2`, sentence case, no abbreviations.
2. **Value** — `var(--text-2xl)`+, weight 600, tabular-nums, `--color-text-1`. Locale-aware formatting.
3. **Delta** — `var(--text-sm)`, weight 600, color by direction (`--color-success-600` / `--color-danger-600`). Sign explicit (`+12.4%`, `−$3.2k`).
4. **Comparison context** — `var(--text-xs)`, `--color-text-2`, the period the delta is over: "vs prior 30 days", "vs goal $500k". Mandatory.
5. **Sparkline** — 30–90 day trend hint. Optional but raises perceived quality more than any other element.

## Required states

| State | Visual |
|---|---|
| default | All five elements rendered |
| loading | Skeleton blocks matching final layout exactly — no width jumps on data arrival |
| empty (no data yet) | `—` in place of value; "No data for this period" caption |
| error | "Failed to load" + retry button; never blank the tile |
| stale (cache shown while fetch fails) | Value + delta dimmed; "Last updated 5 min ago" caption with warning icon |
| interactive (drill-down) | Cursor pointer + `:hover` shadow lift; only when click action is real |

## Color rules for the delta

- Favorable direction: `--color-success-600`.
- Unfavorable direction: `--color-danger-600`.
- Neutral / no change: `--color-text-2`.

Direction is metric-specific: for "errors per minute", down is favorable. The component takes a `direction` prop ("higher-is-better" | "lower-is-better"); never hard-code success = up.

Always pair color with sign and arrow icon — never color alone (constitution channel rule).

## Accessibility

- The tile is a `<section>` (or `<a>` when drill-down is real). Heading inside is `h3` typical.
- The full meaning is in text; sparkline is `aria-hidden="true"` with the data carried in alt text or a sibling `<figcaption class="sr-only">`.
- When interactive, `aria-label` includes value and delta: `"Revenue $42,180, up 12.4% vs prior 30 days. View details."`
- Color is never the only delta channel — use icon + sign + label.

## Responsive behavior

The tile uses container queries (`@container`) so it adapts to its parent column, not the viewport. A 4-up grid that becomes 2-up doesn't need bespoke breakpoints.

| Container width | Layout |
|---|---|
| ≥ 320 px | Full layout: label, value, delta inline, context, sparkline below |
| 240–319 px | Same layout, sparkline shrinks to 24 px height |
| < 240 px | Stack value + delta vertically; hide sparkline |

## Tokens consumed

```
--color-surface-1
--color-border-subtle
--color-text-1 / -2
--color-success-600
--color-danger-600
--space-4 / -5 / -6
--text-xs / -sm / -2xl
--radius-lg
--shadow-sm
--dur-200
--ease-out-quint
```

## React + Tailwind reference

```tsx
type Direction = "higher-is-better" | "lower-is-better";

type Props = {
  label: string;
  value: string;             // pre-formatted with locale
  deltaPct: number;          // +12.4 or -3.2
  comparison: string;        // "vs prior 30 days"
  direction: Direction;
  sparkline?: React.ReactNode; // an svg or <Sparkline /> sized to fit
  href?: string;             // when drill-down
  state?: "default" | "loading" | "error";
  onRetry?: () => void;
};

export function KpiTile(p: Props) {
  if (p.state === "loading") return <KpiSkeleton />;
  if (p.state === "error") return <KpiError onRetry={p.onRetry} />;

  const favorable =
    (p.direction === "higher-is-better" && p.deltaPct >= 0) ||
    (p.direction === "lower-is-better"  && p.deltaPct <= 0);
  const deltaColor = p.deltaPct === 0
    ? "text-[var(--color-text-2)]"
    : favorable
      ? "text-[var(--color-success-600)]"
      : "text-[var(--color-danger-600)]";

  const Tag = p.href ? "a" : "section";
  return (
    <Tag
      {...(p.href ? { href: p.href } : {})}
      className={[
        "@container block rounded-[var(--radius-lg)]",
        "border border-[var(--color-border-subtle)]",
        "bg-[var(--color-surface-1)] p-5 sm:p-6",
        "transition-shadow duration-[var(--dur-200)]",
        "ease-[var(--ease-out-quint)] motion-reduce:transition-none",
        p.href && "hover:shadow-[var(--shadow-md)]",
        p.href && "focus-visible:outline focus-visible:outline-2",
        p.href && "focus-visible:outline-offset-2",
        p.href && "focus-visible:outline-[var(--color-ring)]",
      ].filter(Boolean).join(" ")}
      aria-label={p.href ? `${p.label} ${p.value}, ${formatDelta(p.deltaPct)} ${p.comparison}` : undefined}
    >
      <h3 className="text-[var(--text-sm)] text-[var(--color-text-2)]">
        {p.label}
      </h3>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-[var(--text-2xl)] font-semibold tabular-nums
                         text-[var(--color-text-1)]">
          {p.value}
        </span>
        <span className={`text-[var(--text-sm)] font-semibold tabular-nums ${deltaColor}`}>
          <span aria-hidden="true">{p.deltaPct >= 0 ? "↑" : "↓"} </span>
          {formatDelta(p.deltaPct)}
        </span>
      </div>
      <p className="mt-1 text-[var(--text-xs)] text-[var(--color-text-2)]">
        {p.comparison}
      </p>
      {p.sparkline && (
        <div className="mt-3 h-8" aria-hidden="true">
          {p.sparkline}
        </div>
      )}
    </Tag>
  );
}

function formatDelta(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}
```

## Anti-patterns

- A KPI without a delta. The delta is the load-bearing element, not the value.
- A delta without a comparison period. "+12.4%" against what?
- Hover-lift on a static (non-clickable) tile.
- Color-only delta direction (no arrow, no sign).
- Sparkline that re-uses chart axes/legend — sparklines have no decoration.
- Multiple primary KPIs per surface, each visually competing.
- Tiles with different heights in the same row — fix typography ramp instead of clipping.

## Cross-references

- `references/dashboard-blueprints/kpi-row.md` — responsive grid of tiles.
- `references/charts/chart-types.md` — sparkline guidance.
- `skills/dashboard-design/SKILL.md` § 4 — KPI tile anatomy in context.
