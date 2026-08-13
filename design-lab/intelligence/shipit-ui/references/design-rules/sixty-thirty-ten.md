# Design Rule: 60–30–10 Color Distribution

A composition rule for how much of each color appears on screen. Borrowed from interior design; widely used in UI as a sanity check on palette balance.

## The rule

| Share | Role | What it covers |
|---|---|---|
| **60%** | **Primary** (dominant) | Background, page chrome, large surfaces |
| **30%** | **Secondary** (supporting) | Cards, sidebars, sections that need to read as a distinct block from the primary |
| **10%** | **Accent** (CTAs, key actions) | Primary buttons, active states, links, alerts, key data points in charts |

Visual weight, not literal pixel count. A black-on-white site can still be "60% white" even if the photo header dominates the viewport — count meaningful UI surfaces, not pixels.

## Why

- A predictable hierarchy: the eye knows where to land, where to scan, and what to act on.
- Accent colors retain their power. If 30% of the page is red, red stops meaning "important." If 10% is red, every red thing is read as a signal.
- Forces palette discipline. Palettes with 5+ near-equal-weight colors usually feel chaotic — the rule makes you pick.

## Mapping to tokens

Tie the rule to semantic tokens, not to specific hex values, so dark mode and themed variants follow automatically.

| Share | Token (typical) |
|---|---|
| 60% | `--color-bg`, `--color-surface` |
| 30% | `--color-surface-elevated`, neutral 800/900 (dark) or 100/200 (light), one secondary brand color |
| 10% | `--color-brand`, `--color-accent`, danger / success on critical states |

## Light vs dark interpretation

In light mode the 60% is usually a tinted near-white (`--neutral-50`), 30% is white cards or a slightly darker tint, and the 10% is the saturated brand.

In dark mode the 60% is a tinted near-black, 30% is one step lighter (cards/elevated surfaces), and the 10% is the same brand hue at a slightly higher chroma to keep punch.

## When the rule applies

- Marketing pages, landing pages, blogs, editorial.
- Product UI of moderate density (most SaaS apps).
- Slide decks, single-screen layouts.

## When to break it

- **Dense data tools** (analyst dashboards, terminals, IDEs). These need many functional colors (status, highlights, syntax). Apply 60–30–10 only to chrome; the data layer follows its own coding system.
- **Image-heavy surfaces** (photo galleries, e-commerce product pages). The image is the accent; UI chrome should recede.
- **Brand systems with a duotone identity.** Some brands run 50–50 of two equal-weight colors (e.g., black + neon). Treat the duotone as a single "primary" worth 60%.
- **Status-heavy UI** (alerts, monitoring). Multiple semantic colors all carry meaning; the rule blurs.

## Accent color budget

Within the 10%, you usually want:

- **One** primary CTA color used consistently across the app.
- **Two or three** semantic colors (success, warning, danger, info) used only when the meaning fits — not for decoration.
- **Zero** "decorative accents." If a color isn't doing a job, drop it.

Sites that look junior usually overspend the accent budget. A button is red, a tag is purple, a link is blue, a badge is orange — every primary-eye-catcher color burns 10% in isolation, and stacking five accents reads as noise.

## Common mistakes

1. **Accent that's too desaturated.** A muted accent loses its function. Push chroma up (or accept that the color isn't really an accent).
2. **Secondary that's too close to primary.** If the 30% reads as the same color as the 60%, you have 90% primary and a section break that disappears.
3. **Multiple competing accents.** Pick one CTA color. Status colors are not accents — they are signals.
4. **Counting backgrounds wrong.** A 60% white page with 30% gray sidebar and 10% blue button is the rule. A page with a 60% gradient hero, 30% photo, 10% small button is not — the photo dominates.

## How `shipit-ui-design` applies the rule

- `/palette` generates ramps and assigns semantic tokens such that the 60%/30%/10% mapping above holds by default.
- `/design init` writes `--color-bg` (60%), `--color-surface-elevated` (30%), `--color-brand` (10%) wired so a default page already conforms.
- `/audit` flags layouts where the accent color exceeds ~15% of meaningful UI surface, or where two accent colors compete.
- `/refine` includes a 60–30–10 check in its rubric under the **Color & contrast** category.

## Cross-references

- The named palette presets → `references/palettes/`
- Color encoding for charts (a separate rule from 60–30–10) → `references/charts/color-encoding.md`
- Tinted-neutral default → `references/design-rules/tinted-neutrals.md`
