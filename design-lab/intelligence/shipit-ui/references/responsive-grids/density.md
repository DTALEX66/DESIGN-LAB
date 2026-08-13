# Density

Density is the ratio of information to whitespace. There is no universally correct density; there is correct density for the user's job. The most common dashboard mistake is shipping one density for all surfaces.

## Two tiers

| Tier | Use | Row height | Card padding | Chart height | Type |
|---|---|---|---|---|---|
| **Comfortable** | Default for first-load, exec views, marketing-adjacent admin | 48–56 px | `--space-6` (24 px) | 240–360 px | `var(--text-base)` body |
| **Compact** | Default for operator surfaces, opt-in for analyst surfaces | 32–40 px | `--space-4` (16 px) | 160–240 px | `var(--text-sm)` body |

Some products ship a third tier ("cozy"); two is enough for most.

## Picking the default by surface

| Surface | Default density |
|---|---|
| Overview / home | Comfortable |
| Customer / order detail page | Comfortable |
| Inbox, queue, ticket list (operator) | Compact |
| Settings | Comfortable |
| Reports, analytics, data tables (analyst) | Compact, with toggle to Comfortable |
| Executive dashboard | Comfortable, no toggle |

Persist the user's last toggle choice per surface. A user who switches the customers list to compact expects it compact tomorrow.

## When each fits

**Comfortable** wins when:
- The user is making a small number of high-stakes decisions (an exec scanning quarterly KPIs).
- Hover affordances and animations are part of the experience (drill-down).
- Content has prose, illustrations, or whitespace-led typography.

**Compact** wins when:
- The user lives in the surface for hours (support agent, ops dashboard, finance reconciliation).
- The user keyboards through rows (sub-second decisions).
- The dataset is large and dense scanning matters more than hover delight.

## What density actually changes

A density toggle that only changes row height is broken. The full toggle adjusts:

| Property | Comfortable | Compact |
|---|---|---|
| Row / list-item height | 48–56 px | 32–40 px |
| Card padding | `--space-6` | `--space-4` |
| Form field padding (Y) | `--space-3` | `--space-2` |
| Inter-section gap | `--space-8` | `--space-5` |
| Gutter / column gap | `--space-6` | `--space-4` |
| Body type | `var(--text-base)` | `var(--text-sm)` |
| Icon size | 20 px | 16 px |

Type and icon sizes shift one step on the scale, no more. Going further is a different design system, not a density toggle.

## What density does NOT change

- **Touch targets.** Minimum 40 px tappable area on touch devices, regardless of density. Compact mode on touch keeps the visual height small but extends the click area with padding/margin.
- **Focus ring thickness.** 2 px in both tiers.
- **Type ramp ratio.** The whole ramp shifts one step; the ratios between sizes stay constant.
- **Information shown.** Density is about packing, not about hiding columns. Hidden columns belong in column-visibility settings.

## Density toggle UI

A simple two-position segmented control in the table or page toolbar. Icon + label, not just icon.

```
[≡ Comfortable | ≡≡ Compact]
```

Persist with `localStorage` keyed by surface and user. Server-side persistence is better when available.

## Responsive interaction

Density does not replace responsive design. On mobile (< 768 px):
- Comfortable density still applies — small screens already feel cramped; do not double-compress.
- Cards break to single column; tables card-stack — see `references/data-tables/responsive.md`.
- Auto-switching to "Compact" on mobile usually backfires; users expect their density choice to follow them.

## Anti-patterns

- A density toggle that only changes one property (e.g., row height alone). All seven properties shift in unison.
- "Compact" on an exec dashboard. The user is glancing; they want air.
- "Comfortable" on a 50-row queue inspector. The user wants more rows visible.
- Auto-switching density based on viewport without persisting user choice.
- A third "ultra-compact" tier. Two tiers cover the field; the third is feature creep.
- Shrinking type below `var(--text-sm)` (typically 13 px). Anything smaller fails accessibility on most fonts.

## Cross-references

- `references/responsive-grids/breakpoints.md`
- `references/data-tables/anatomy.md` — row height tiers in detail.
- `skills/dashboard-design/SKILL.md` § 3 — density by user type.
