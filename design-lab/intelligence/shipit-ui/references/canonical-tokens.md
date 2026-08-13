# Canonical Token Names

Single source of truth for the design-token names used across all `shipit-ui-design` skills, commands, and references. When agents wrote different naming variants during the parallel build, this file resolves which form is canonical and which (if any) are accepted aliases.

When generating user code, prefer the **canonical** column. When reading existing user code, accept any of the **also-acceptable** forms — they encode the same intent.

## Color tokens

### Foreground (text)

| Canonical | Also acceptable | Use |
|---|---|---|
| `--color-fg` | `--color-text-1` | Primary body text on `--color-bg` |
| `--color-fg-muted` | `--color-text-2`, `--color-text-muted` | De-emphasized text (timestamps, captions) |
| `--color-fg-subtle` | — | Lowest emphasis (placeholder, hint) |
| `--color-fg-on-brand` | `--color-text-on-brand` | Text on a brand-colored surface (CTAs) |
| `--color-fg-inverse` | — | Text on inverse-colored surface (dark tooltip on light page) |

### Surface (background)

| Canonical | Also acceptable | Use |
|---|---|---|
| `--color-bg` | — | Page background |
| `--color-surface` | `--color-surface-1` | Default card / panel surface |
| `--color-surface-elevated` | `--color-surface-2` | Cards floating above page (modals, popovers) |
| `--color-surface-overlay` | `--color-surface-3` | Highest-elevation surface (toasts, command palette) |
| `--color-surface-inverse` | — | Inverse-colored surface (dark tooltips, snackbars) |

`-1`/`-2`/`-3` numeric variants are accepted because some design systems use a numeric depth ladder. Do not mix the two schemes within a single project — pick one and stay consistent.

### Border

| Canonical | Use |
|---|---|
| `--color-border` | Default surface border |
| `--color-border-subtle` | Hairline / divider, lower contrast |
| `--color-border-input` | Form input border |
| `--color-border-input-hover` | Form input hover state |
| `--color-ring` | Focus-visible outline |

### Brand vs primary vs accent

These are **not** synonyms in this plugin:

| Token | Role |
|---|---|
| `--color-brand` and `--color-brand-{50..950}` | The product's identity color. Used for primary CTAs, active states, links, key data. |
| `--color-accent` and `--color-accent-{50..950}` | A secondary identity color. Used sparingly for variation; many products won't use it. |
| `--color-primary-*` | **Avoid.** Ambiguous (does it mean "first" or "brand"?). When seen in user code, treat as alias for `--color-brand-*` and rename in token migrations. |

The 60–30–10 rule (`references/design-rules/sixty-thirty-ten.md`) maps the 10% to `--color-brand`, not `--color-accent` — the accent is reserved for products with a deliberately two-color identity.

### Neutrals

| Token | Role |
|---|---|
| `--color-neutral-{50..950}` | Canonical neutral scale, semantic-prefixed. |
| `--neutral-{50..950}` | Accepted alias — used when the project keeps raw scales separate from `--color-*` aliases (Radix-style two-layer tokens). |

Default to `--color-neutral-*` when generating fresh. Both forms are valid in user code.

### State colors

`--color-success-{50..950}`, `--color-warning-{50..950}`, `--color-danger-{50..950}`, `--color-info-{50..950}` plus the bare semantic alias (`--color-success`, etc.) for the default step (typically 500 or 600).

### Hue families (raw scales)

`--color-blue-*`, `--color-slate-*`, etc. — **avoid in generated component code.** Always alias through `--color-brand-*` / `--color-neutral-*` / state colors. Raw hue families are acceptable only inside `tokens.css` as the bottom layer of a two-layer token system.

## Spacing

`--space-{0..16}` — 4 px base scale.

| Token | Value |
|---|---|
| `--space-0` | 0 |
| `--space-1` | 4 px |
| `--space-2` | 8 px |
| `--space-3` | 12 px |
| `--space-4` | 16 px |
| `--space-5` | 20 px |
| `--space-6` | 24 px |
| `--space-8` | 32 px |
| `--space-10` | 40 px |
| `--space-12` | 48 px |
| `--space-14` | 56 px |
| `--space-16` | 64 px |

No `--spacing-*` aliases. The `--space-*` form is canonical and matches Tailwind's scale step.

## Type

| Canonical | Also acceptable | Use |
|---|---|---|
| `--text-2xs` | — | 10 px caption / metadata |
| `--text-xs` | `--font-size-sm` | 12 px small body |
| `--text-sm` | `--font-size-md` | 14 px body |
| `--text-base` | `--font-size-base` | 16 px body |
| `--text-lg` | `--font-size-lg` | 18 px lead |
| `--text-xl` | — | 20 px |
| `--text-2xl` | — | 24 px |
| `--text-3xl` | — | 30 px |
| `--text-4xl` | — | 36 px display |

`--font-size-*` form is accepted on read but **not generated**. Prefer `--text-*` (matches Tailwind's `text-sm`/`text-base` arbitrary-value plumbing).

| Token | Use |
|---|---|
| `--leading-tight` | 1.25 — display, headings |
| `--leading-snug` | 1.375 — subheadings |
| `--leading-normal` | 1.5 — body |
| `--leading-relaxed` | 1.625 — long-form reading |
| `--font-sans`, `--font-mono` | Family stacks |
| `--font-medium`, `--font-semibold`, `--font-bold` | Weight aliases |

## Motion

### Durations

`--dur-{0,75,150,200,300,500,700,1000}` — the canonical form, milliseconds.

| Canonical | Also acceptable |
|---|---|
| `--dur-150` | `--duration-fast` |
| `--dur-200` | `--duration-default` |
| `--dur-300` | `--duration-medium` |
| `--dur-600` | `--duration-slow` |

Numeric form is canonical because it's unambiguous and stable across rename rounds. Named aliases are accepted on read.

### Easings

| Token | Curve |
|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` (out-quint) |
| `--ease-out-quint` | Same as `--ease-out`; explicit name |
| `--ease-in-out-cubic` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--ease-spring` | `cubic-bezier(0.5, 1.6, 0.4, 1)` (snappy spring) |
| `--ease-linear` | `linear` (rare; reserved for progress bars) |

## Radius and shadow

| Token | Value |
|---|---|
| `--radius-sm` | 4 px |
| `--radius-md` | 8 px |
| `--radius-lg` | 12 px |
| `--radius-xl` | 16 px |
| `--radius-full` | 9999 px |
| `--shadow-sm` | Subtle 1-px-y |
| `--shadow-md` | Card |
| `--shadow-lg` | Modal |
| `--shadow-xl` | Floating panel |

## Z-index

| Token | Value | Layer |
|---|---|---|
| `--z-base` | 0 | Page content |
| `--z-sticky` | 100 | Sticky topbar / sidebar |
| `--z-dropdown` | 200 | Menus, popovers |
| `--z-modal` | 400 | Modal scrim + dialog |
| `--z-toast` | 600 | Toast / snackbar |
| `--z-tooltip` | 800 | Tooltip (above everything) |

## Migration notes

When a user's project uses an older naming variant, generate code in the **canonical** column and add a one-line comment in the migration `tokens.css` mapping the alias to the canonical name:

```css
--color-fg: var(--color-text-1);  /* alias for backwards compat */
```

After two release cycles of the project, remove the alias. The plugin's `/audit` flags lingering aliases.

## Cross-references

- Color naming theory — `references/color-tools/naming.md`
- Token recipe (full `tokens.css` example) — `references/color-tools/tokens-recipe.md`
- Design rules that depend on these names — `references/design-rules/`
- Sidebar spacing that references these tokens — `references/spacing-cheat-sheets/desktop-sidebar.md`
