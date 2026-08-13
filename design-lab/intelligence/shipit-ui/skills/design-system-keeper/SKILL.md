---
name: design-system-keeper
description: Detect and rewrite hardcoded design values (bare hex, raw px, raw ms, magic shadows) into project token references; auto-activates on tailwind.config.*, tokens.css, theme files, and any styled component edits.
type: skill
---

# Design System Keeper

One job: enforce constitution rule #2. No hardcoded design values, anywhere, ever. When you see one, rewrite it to a token reference. When the token doesn't exist, propose adding it before using a literal.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

---

## What counts as a "hardcoded design value"

Any of the following written as a literal in component or style code (NOT inside `tokens.css` or `tailwind.config.*` themselves — those are the source):

- Color literals: `#aabbcc`, `#abc`, `rgb(…)`, `rgba(…)`, `hsl(…)`, named CSS colors (`gray`, `red`, `tomato`).
- Length literals in spacing/sizing: `13px`, `1.5rem`, `0.75em` outside a token definition.
- Shadow strings: `0 1px 3px rgba(0,0,0,0.1)`.
- Border-radius literals: `8px`, `0.5rem`.
- Duration / delay literals: `150ms`, `0.3s`.
- Easing literals: `cubic-bezier(0.4, 0, 0.2, 1)`, bare `ease-out`.
- Z-index literals: `999`, `10000`.
- Typography literals: `font-size: 14px`, `line-height: 1.6`, `font-weight: 600`.

**Allowed literals** (never flag):
- `0`, `0px`, `0%`, `100%`, `auto`, `inherit`, `currentColor`, `transparent`.
- `1px` for hairline borders (project-specific override OK if tokenized).
- Inside `tokens.css`, `tailwind.config.*`, `theme.ts`, `motion.ts` definitions.
- Inside SVG `viewBox`, `stroke-width`, `width`/`height` for icons (geometry, not design).

---

## Detection patterns

Run these regex passes mentally (or via grep) on any file you edit:

```
# Bare hex (3, 4, 6, 8 digits)
\b#[0-9a-fA-F]{3,8}\b

# Bare CSS color functions
\b(rgb|rgba|hsl|hsla)\(

# Bare px / rem / em in style props or CSS (not inside var(), not 0)
(?<![\d.])(?!0(px|rem|em|%)?\b)\d+(\.\d+)?(px|rem|em)\b

# Durations
\b\d+(\.\d+)?(ms|s)\b

# Bezier
cubic-bezier\(

# Tailwind arbitrary values that hardcode
\[#[0-9a-fA-F]+\]
\[\d+px\]
```

In TS/JSX inline styles, also flag:
```
style={{ color: "#…", padding: "12px", transition: "all 0.3s ease" }}
```

---

## Rewrite recipes

### Color
```
// before
color: "#4f46e5"
background: "rgb(245, 245, 247)"
borderColor: "gray"

// after
color: "var(--color-brand)"
background: "var(--color-surface)"
borderColor: "var(--color-border)"
```

If using Tailwind: `text-[#4f46e5]` → `text-brand` (token alias defined in `tailwind.config`).

### Spacing
```
// before
padding: "12px 16px"
margin-top: 24px

// after
padding: "var(--space-3) var(--space-4)"
margin-top: var(--space-6)
```

Tailwind: `p-[12px]` → `p-3`. Closest token always preferred over a custom one — if `13px` was intended, snap to 12 or 16 unless the user insists.

### Radius
```
// before
border-radius: 8px

// after
border-radius: var(--radius-md)
```

### Shadow
```
// before
box-shadow: 0 1px 3px rgba(0,0,0,0.1)

// after
box-shadow: var(--shadow-sm)
```

### Duration & easing
```
// before
transition: all 300ms ease-in-out

// after
transition:
  background-color var(--dur-300) var(--ease-in-out-cubic),
  transform        var(--dur-300) var(--ease-in-out-cubic)
```

Note the second rewrite: `all` is also banned — list properties.

### Z-index
```
// before
z-index: 999

// after
z-index: var(--z-modal)   /* or --z-tooltip, --z-popover, --z-dropdown */
```

### Typography
```
// before
font-size: 14px; line-height: 1.4; font-weight: 600;

// after
font-size: var(--text-sm);
line-height: var(--leading-snug);
font-weight: var(--font-semibold);
```

---

## When the token doesn't exist

Two paths:

1. **Snap to nearest existing token.** If `padding: 13px` and tokens are `--space-3` (12) and `--space-4` (16), pick 12 or 16 by intent. Note the change in your reply.
2. **Propose adding the token.** If the value is genuinely outside the scale (e.g., a brand-specific accent color), add it to `tokens.css` first, then reference it. Never use the literal in components.

Tell the user when you add a token; show the diff to `tokens.css` first.

---

## Tailwind-specific rules

- `tailwind.config.*` is the single bridge. Token names there must match `tokens.css` CSS variables 1:1 via `var(--…)`.
- Arbitrary-value escape hatch (`p-[13px]`) is a code smell. Allowed only with a `// design-system-keeper: justified — <reason>` comment.
- Prefer semantic class names (`bg-surface`, `text-fg`, `border-border`) over numeric (`bg-gray-100`).

---

## Inline style rules

- Inline `style={{ … }}` allowed only for dynamic values (computed transforms, runtime layout). Static styles go to CSS / Tailwind.
- If you must inline, the value side must still be a `var(--…)` reference, not a literal.

---

## Output convention

When you rewrite, your reply should include:

1. List of files changed.
2. For each: the literal you replaced and the token you used.
3. Any new token you added to `tokens.css` (with diff).
4. Any literal you snapped (e.g., "13px → `--space-3` (12px)").

Never silently round.

---

## Hook pairing

The PostToolUse hook (`hooks/design-lint.sh`) flags these same patterns and prints warnings. The hook never edits — fixes are this skill's job.
