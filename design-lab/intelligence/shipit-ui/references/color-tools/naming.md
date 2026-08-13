# Token Naming

Names outlive any single value. Bad names propagate everywhere and resist refactoring; good names survive a complete palette change.

## Three naming approaches

### Scale naming
- Pattern: `--color-{hue}-{step}` (e.g., `--color-blue-500`, `--color-slate-900`).
- What it describes: the value, by hue family.
- Pros: portable; matches Tailwind/Radix; easy to swap palette without renaming.
- Cons: components reach for color values directly; theming requires aliases.

### Semantic naming
- Pattern: `--color-{role}` (e.g., `--color-fg`, `--color-surface`, `--color-danger`).
- What it describes: the intent, not the value.
- Pros: components stay theme-agnostic; dark-mode is a redefinition, not a rewrite.
- Cons: explosive growth (`--color-success-button-hover-bg`...); easy to invent ad-hoc tokens.

### Hybrid (Radix style)
- Pattern: scale for raw values + semantic aliases pointing to them.
- Example:
  ```css
  --color-blue-500: oklch(58% 0.21 260);
  --color-brand: var(--color-blue-500);
  --color-ring:  var(--color-blue-500);
  ```
- Pros: components consume semantic; designers reason about scale; one source of truth per layer.
- Cons: two layers to maintain.

**Default to hybrid.** Scale tokens at the bottom, semantic aliases above. Components consume semantic. Theme switches redefine semantic, not scale.

## When each scales

| Project size | Approach | Why |
|---|---|---|
| 1–3 surfaces, 1 brand color | Semantic only is fine | Aliases would be over-engineering |
| Standard product UI | Hybrid | Best maintenance / flexibility ratio |
| Multi-brand / white-label | Hybrid required | Each brand redefines aliases |
| Design-system library | Hybrid required | Consumers may want either layer |
| Data-viz heavy | Hybrid + categorical scale | Categorical tokens (`--color-cat-1`) above scale |

## Token structure (recommended)

```
Layer 0 — primitives (values):
  --color-{hue}-{step}    e.g., --color-blue-500
  Pure OKLCH/hex; no opinions.

Layer 1 — semantic aliases (roles):
  --color-fg, --color-fg-muted, --color-fg-subtle
  --color-surface, --color-surface-elevated
  --color-border, --color-border-strong
  --color-brand, --color-ring
  --color-success, --color-warning, --color-danger, --color-info
  Reference Layer 0 tokens.

Layer 2 — component-scoped (only if needed):
  --button-bg, --button-bg-hover, --button-fg
  Reference Layer 1 tokens.
```

Layer 2 is optional; reach for it only when a component has 5+ color decisions and shipping inline `var(--color-…)` references becomes noisy.

## Dark-mode aliases

Dark mode redefines Layer 1 (semantic), not Layer 0 (scale). The scale numbers stay; their meaning shifts:

```css
:root {
  --color-fg: var(--color-slate-900);
  --color-surface: var(--color-slate-50);
}
[data-theme="dark"] {
  --color-fg: var(--color-slate-50);
  --color-surface: var(--color-slate-950);
}
```

If you redefine `--color-blue-500` itself in dark mode, every consumer that reached for it directly gets a surprise. Don't.

Exception: if your palette uses different dark and light scales (e.g., a "dark blue" scale tuned for dark surfaces), keep them as separate scale tokens (`--color-blue-light-500`, `--color-blue-dark-500`) and switch the alias.

## Anti-patterns

### Naming after the value

```css
--light-blue: #3b82f6;     /* what is "light" anchored to? */
--dark-grey: #374151;      /* who decides what's dark? */
--bright-orange: #f97316;
```

When the brand color changes, these names lie. Use scale (`--color-blue-500`) or semantic (`--color-brand`).

### Naming after the use case (in scale layer)

```css
--header-blue: #1e40af;    /* what if it's used elsewhere? */
--button-color: #3b82f6;
```

Use case names belong in Layer 2 (component-scoped) if at all, not Layer 0.

### Inventing semantic tokens for one-offs

```css
--color-marketing-hero-cta-bg: ...
--color-pricing-table-strikethrough: ...
```

If only one component uses a token, inline the reference (`var(--color-brand)`) — don't invent a token to alias another token to itself.

### Mixed naming styles in one file

```css
--color-blue-500: ...
--primary-color: ...
--brand: ...
```

Pick one convention per layer. Document in the tokens file.

### State color encoded in name only

```css
--color-success: green;
```

Name is fine, but the system also needs to encode "success" via icon/shape. See `accessibility.md` — naming is a layer of the system, not the whole answer.

## Tokens this skill commits to (must match)

These names appear across every reference and generated artifact:

```
--color-{hue}-{50..950}      e.g., --color-blue-500, --color-slate-100

--color-fg                   primary text on surface
--color-fg-muted             secondary text
--color-fg-subtle            tertiary text / placeholders

--color-surface              app background
--color-surface-elevated     cards, sheets, popovers

--color-border               default border
--color-border-strong        emphasized border

--color-brand                primary brand
--color-ring                 focus ring

--color-success-{50..950}    success scale
--color-warning-{50..950}    warning scale
--color-danger-{50..950}     danger scale
--color-info-{50..950}       info scale
```

Reach for state-scale steps when a state needs background/text variants (e.g., `--color-danger-50` for a danger callout bg, `--color-danger-700` for text on it). For a single solid use, the alias is enough:

```css
--color-success: var(--color-success-600);
--color-warning: var(--color-warning-500);
--color-danger:  var(--color-danger-600);
--color-info:    var(--color-info-600);
```

## Adding a new alias — checklist

Before adding `--color-foo`:

- [ ] Is there an existing alias that fits? Reuse it.
- [ ] Does it have a clear role distinct from existing aliases?
- [ ] Does it have a dark-mode override?
- [ ] Is it consumed by ≥ 2 components? (One-component aliases belong in Layer 2 or inline.)
- [ ] Does the name describe the role, not a value or one specific use?

If any answer is no, don't add it.

## Renaming tokens

If a name is wrong, rename — but with a transition:

1. Add the new alias pointing to the same value.
2. Update consumers over time.
3. Remove the old alias only after no consumer references it.

Use a build-time check (`design-system-keeper` skill territory) to catch lingering references.

## Naming for theming

If the project supports multiple themes (light, dark, high-contrast, brand variants):

- Theme-switchable tokens live in Layer 1.
- Theme is a class or `data-theme` attribute on `:root` or a wrapper.
- Theme-specific tokens (rare) get a suffix: `--color-brand-marketing`. Avoid until needed.
