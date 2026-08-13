# KPI Row

Responsive grid of KPI tiles. The standard top-of-page pattern for overview surfaces.

## Anatomy

```
[ Label A ][ Label B ][ Label C ][ Label D ]   xl: 4-up
[  $42k  ][  18.2k ][   2.4%  ][  9 min   ]
[ +12% ↑ ][  -3% ↓ ][  +0.4% ↑][  -1m ↓   ]
```

A row of 3, 4, 6, or 8 KPI tiles. More than 6 is usually wrong; group instead.

## Responsive layout

| Tile count | xl (≥1280) | lg (1024) | md (768) | sm/xs (<768) |
|---|---|---|---|---|
| 3 | 3-up | 3-up | 2-up + 1 wide | 1-up |
| 4 | 4-up | 2-up | 2-up | 1-up |
| 6 | 3 over 3 | 3 over 3 | 2 × 3 | 1-up |
| 8 | 4 over 4 | 4 over 4 | 2 × 4 | 1-up |

## States

The row's only state is the layout itself. Individual tile states (loading, error, empty) are owned by the tile — see `kpi-tile.md`.

When the data source is shared across all tiles:
- Loading: render all tiles in skeleton state simultaneously (no waterfall flicker).
- Error: each tile shows its own error; do not blanket-fail the row.

## Accessibility

- The row is a `<section>` with `aria-label="Key metrics"` (or similar).
- Heading hierarchy: row may have an `h2` or none; each tile's label is `h3`.
- When the row is the page's primary content, place an `aria-live="polite"` region beside it that announces refresh: `"Metrics updated 12 seconds ago"`.

## Container queries vs viewport

The row uses viewport breakpoints (it's a layout decision). Each tile inside uses container queries (it adapts to its column width). This division means a 4-up row that drops to 2-up doesn't need bespoke per-tile breakpoints.

## Tokens consumed

```
--space-4 / -6     /* gap */
```

(Otherwise this is a layout primitive — colors and shadows live on the tiles.)

## React + Tailwind reference

```tsx
import { KpiTile } from "./KpiTile";

type Tile = React.ComponentProps<typeof KpiTile>;

export function KpiRow({ tiles }: { tiles: Tile[] }) {
  const cols = colsByCount(tiles.length);

  return (
    <section aria-label="Key metrics">
      <div className={`grid gap-4 lg:gap-6 ${cols}`}>
        {tiles.map((t, i) => (
          <div key={i} className="@container">
            <KpiTile {...t} />
          </div>
        ))}
      </div>
    </section>
  );
}

function colsByCount(n: number) {
  switch (n) {
    case 3:
      return "grid-cols-1 sm:grid-cols-3";
    case 4:
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
    case 6:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case 8:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    default:
      return "grid-cols-1 sm:grid-cols-2";
  }
}
```

## Visual rhythm

- Equal vertical gap between tiles in a wrapped layout (`gap-4` or `gap-6`).
- Tiles in the same row must have equal height. The tile component handles this; the row passes `--container` so heights match.
- Don't wrap a 4-tile row to `3 + 1` — wrap to `2 + 2` (handled by `md:grid-cols-2`).
- Don't insert a `colSpan-2` "wide" tile in the middle of an otherwise uniform row — that's a different pattern, not a KPI row.

## When to escape the row

If you find yourself wanting:
- A tile twice as wide → consider a chart-card instead, which is a different blueprint.
- 6+ tiles → split across pages or group into rows of 3–4 with section headings between them.
- Mixed densities (some compact, some comfortable) → wrong; a row is one density.

## Anti-patterns

- A "KPI row" with one wide stat and a chart next to it. That's a hero stat plus a chart — different pattern.
- Reflowing the row on every viewport pixel — use the breakpoint ladder.
- Tiles with auto-height that fight (the tallest tile becomes 4× the size of others). Fix the typography ramp on the tile.
- Per-tile responsive logic that ignores the row's grid — use `@container` on each tile and let it adapt.

## Cross-references

- `references/dashboard-blueprints/kpi-tile.md` — the atom.
- `references/responsive-grids/breakpoints.md` — the breakpoint ladder.
- `references/responsive-grids/dashboard-grid.md` — wider context.
- `skills/dashboard-design/SKILL.md` § 4 — KPI guidance.
