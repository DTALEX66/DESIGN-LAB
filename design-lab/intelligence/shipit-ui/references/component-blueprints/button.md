# Button — Blueprint

The most-used component in any UI. Get the states right and everything downstream gets easier.

## Anatomy

- Container (button element — never a div with role="button" unless absolutely unavoidable)
- Optional leading icon (`aria-hidden`, sized to `1em`, gap from label = 0.5em)
- Label (single line; truncate with ellipsis if constrained)
- Optional trailing icon
- Optional loading spinner (replaces leading icon position; label remains for layout stability)

## Required states

| State | Visual change | Notes |
|---|---|---|
| default | base bg, base fg | |
| hover | bg shifts one step (e.g. 600 → 700), or 6–10% darker | Skip on touch; gate on `(hover: hover)`. |
| active / pressed | translate-y 1px, slightly darker bg | 100ms ease-out. |
| focus-visible | 2px outline using `--color-ring`, 2px offset | NEVER remove; only restyle. |
| disabled | opacity 0.5, `cursor: not-allowed`, no hover/active | Set `aria-disabled` if it must remain focusable. |
| loading | spinner replaces leading icon, label stays, `aria-busy="true"` | Click is a no-op while loading. |

## Variants

- `primary` — brand fill (e.g. `--color-brand-600`), white label.
- `secondary` — neutral fill (e.g. `--color-neutral-200` light, `--color-neutral-800` dark) with neutral text.
- `ghost` — transparent bg, neutral text, hover gets bg-hover token.
- `destructive` — red fill, used only for irreversible actions; confirmation pattern around it.
- `link` — no bg, underline on hover, brand text.

## Sizes

| Size | Height | Padding-x | Font | Use |
|---|---|---|---|---|
| sm | 32px | 12px | sm | Dense toolbars, table cells |
| md | 40px | 16px | base | Default everywhere |
| lg | 48px | 20px | md | Hero CTAs |

## Accessibility

- Always a real `<button>` (or `<a>` if it navigates).
- Label MUST describe action ("Save changes", not "OK").
- Icon-only buttons require `aria-label`.
- Focus ring uses `:focus-visible`, not `:focus`, to avoid showing on click.
- Disabled buttons MUST still be readable (avoid going below 3:1 contrast even when disabled).
- Loading state announces via `aria-busy="true"` and keeps button focused.
- Min touch target 44×44 (size sm hits this with padding; verify).

## Tokens consumed

```
--color-brand-600 / -700
--color-neutral-* (variant: secondary, ghost)
--color-text-on-brand
--color-ring
--radius-md
--font-size-sm / -base / -md
--duration-fast (150ms)
--ease-out
--space-2 / -3 / -4 / -5
```

## React + Tailwind reference

```tsx
import { forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, leadingIcon, trailingIcon,
    className, children, disabled, ...rest },
  ref,
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] " +
    "font-medium select-none transition-colors duration-[var(--duration-fast)] " +
    "ease-[var(--ease-out)] focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed " +
    "active:translate-y-[1px] motion-reduce:transition-none motion-reduce:active:translate-y-0";

  const variants: Record<Variant, string> = {
    primary:
      "bg-[var(--color-brand-600)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-700)]",
    secondary:
      "bg-[var(--color-surface-2)] text-[var(--color-text-1)] hover:bg-[var(--color-surface-3)]",
    ghost:
      "bg-transparent text-[var(--color-text-1)] hover:bg-[var(--color-surface-2)]",
    destructive:
      "bg-[var(--color-danger-600)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-danger-700)]",
  };

  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-[var(--font-size-sm)]",
    md: "h-10 px-4 text-[var(--font-size-base)]",
    lg: "h-12 px-5 text-[var(--font-size-md)]",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading ? <Spinner /> : leadingIcon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
});

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-[1em] w-[1em] animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}
```

## Vue + CSS Modules reference

```vue
<script setup lang="ts">
import styles from "./Button.module.css";
defineProps<{
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
}>();
</script>

<template>
  <button
    :class="[styles.btn, styles[variant ?? 'primary'], styles[size ?? 'md']]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" :class="styles.spinner" aria-hidden />
    <slot name="leading" v-else />
    <span><slot /></span>
    <slot name="trailing" v-if="!loading" />
  </button>
</template>
```

```css
/* Button.module.css */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: background-color var(--duration-fast) var(--ease-out);
}
.btn:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn:active:not(:disabled) { transform: translateY(1px); }
.primary { background: var(--color-brand-600); color: var(--color-text-on-brand); }
.primary:hover:not(:disabled) { background: var(--color-brand-700); }
.sm { height: 2rem; padding: 0 var(--space-3); font-size: var(--font-size-sm); }
.md { height: 2.5rem; padding: 0 var(--space-4); font-size: var(--font-size-base); }
.lg { height: 3rem; padding: 0 var(--space-5); font-size: var(--font-size-md); }
@media (prefers-reduced-motion: reduce) {
  .btn { transition: none; }
  .btn:active:not(:disabled) { transform: none; }
}
```

## Svelte + plain CSS reference

```svelte
<script lang="ts">
  export let variant: "primary" | "secondary" | "ghost" | "destructive" = "primary";
  export let size: "sm" | "md" | "lg" = "md";
  export let loading = false;
  export let disabled = false;
</script>

<button
  class="btn {variant} {size}"
  disabled={disabled || loading}
  aria-busy={loading || undefined}
  on:click
>
  {#if loading}<span class="spinner" aria-hidden />{/if}
  <span><slot /></span>
</button>

<style>
  .btn {
    display: inline-flex; align-items: center; gap: var(--space-2);
    border-radius: var(--radius-md); font-weight: 500;
    transition: background-color var(--duration-fast) var(--ease-out);
  }
  .btn:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn:active:not(:disabled) { transform: translateY(1px); }
  .primary { background: var(--color-brand-600); color: var(--color-text-on-brand); }
  .primary:hover:not(:disabled) { background: var(--color-brand-700); }
  .sm { height: 2rem; padding: 0 var(--space-3); font-size: var(--font-size-sm); }
  .md { height: 2.5rem; padding: 0 var(--space-4); font-size: var(--font-size-base); }
  .lg { height: 3rem; padding: 0 var(--space-5); font-size: var(--font-size-md); }
  @media (prefers-reduced-motion: reduce) {
    .btn { transition: none; }
    .btn:active:not(:disabled) { transform: none; }
  }
</style>
```
