# Card — Blueprint

A surface that groups related content. Cards are the most-overused component — reach for plain layout with a divider before reaching for a Card.

## Anatomy

- Outer container (semantic: `<article>`, `<section>`, or `<div>` based on content)
- Optional media (image, illustration, chart) — full-bleed at top
- Header — title (h3 typical), optional eyebrow/kicker, optional action slot
- Body — paragraphs, lists, key-value rows
- Footer — actions, meta, timestamps

## Required states

| State | Visual change | Notes |
|---|---|---|
| default | surface bg, subtle border or shadow (pick one) | |
| hover (interactive cards only) | shadow grows OR border darkens; optional 1–2px lift | 200ms out-quint. |
| focus-visible (interactive) | 2px ring, 2px offset | When the card itself is the link/button. |
| selected | accent border (2px) or tinted bg | Used in pickers, settings lists. |
| loading / skeleton | matched outline, shimmer-free skeleton blocks | Crossfade to content. |
| empty (when applicable) | centered illustration + 1-line message + optional action | |

## Layout rules

- One affordance per card. If the card has a primary CTA AND nested clickable rows, you've combined two patterns; split.
- If the card is itself clickable, do NOT also render a "View" button inside. Use one or the other.
- Padding: `--space-5` (20px) for compact, `--space-6` (24px) default, `--space-8` (32px) for marketing.
- Radius: `--radius-lg` (12px) is the default; match to project token.

## Accessibility

- A clickable card uses `<a>` wrapping the whole region OR a single primary action button. Prefer the button if there are multiple links inside.
- Heading inside the card MUST be the right level for document outline (usually h3).
- If the card represents a status, use `role="status"` only on the status element, not the whole card.
- Image inside MUST have alt text or `aria-hidden` if decorative.
- Don't lower border contrast below 3:1 against the surface behind it.

## Tokens consumed

```
--color-surface-1 / -2
--color-border-subtle
--color-text-1 / -2
--shadow-sm / -md
--radius-lg
--space-5 / -6 / -8
--duration-default (200ms)
--ease-out-quint
```

## React + Tailwind reference

```tsx
import { forwardRef } from "react";
import clsx from "clsx";

type Props = React.HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div";
  interactive?: boolean;
  selected?: boolean;
};

export const Card = forwardRef<HTMLElement, Props>(function Card(
  { as: Tag = "article", interactive, selected, className, children, ...rest },
  ref as React.Ref<HTMLElement>,
) {
  return (
    <Tag
      ref={ref as never}
      className={clsx(
        "rounded-[var(--radius-lg)] bg-[var(--color-surface-1)]",
        "border border-[var(--color-border-subtle)] p-6",
        "transition-shadow duration-[var(--duration-default)] ease-[var(--ease-out-quint)]",
        "motion-reduce:transition-none",
        interactive &&
          "cursor-pointer hover:shadow-[var(--shadow-md)] " +
          "focus-visible:outline focus-visible:outline-2 " +
          "focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
        selected && "ring-2 ring-[var(--color-brand-600)]",
        className,
      )}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <header className="mb-3 flex items-start justify-between gap-4">{children}</header>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[var(--font-size-lg)] font-semibold text-[var(--color-text-1)]">
      {children}
    </h3>
  );
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="text-[var(--color-text-2)]">{children}</div>;
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return <footer className="mt-5 flex items-center justify-between gap-3">{children}</footer>;
}
```

## Vue + CSS Modules reference

```vue
<script setup lang="ts">
import styles from "./Card.module.css";
defineProps<{ interactive?: boolean; selected?: boolean }>();
</script>

<template>
  <article
    :class="[styles.card, interactive && styles.interactive, selected && styles.selected]"
    :tabindex="interactive ? 0 : undefined"
  >
    <slot />
  </article>
</template>
```

```css
/* Card.module.css */
.card {
  border-radius: var(--radius-lg);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-6);
  transition: box-shadow var(--duration-default) var(--ease-out-quint);
}
.interactive { cursor: pointer; }
.interactive:hover { box-shadow: var(--shadow-md); }
.interactive:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
.selected { box-shadow: 0 0 0 2px var(--color-brand-600); }
@media (prefers-reduced-motion: reduce) { .card { transition: none; } }
```

## Svelte + plain CSS reference

```svelte
<script lang="ts">
  export let interactive = false;
  export let selected = false;
</script>

<article
  class="card"
  class:interactive
  class:selected
  tabindex={interactive ? 0 : undefined}
  on:click
  on:keydown
>
  <slot />
</article>

<style>
  .card {
    border-radius: var(--radius-lg);
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-6);
    transition: box-shadow var(--duration-default) var(--ease-out-quint);
  }
  .interactive { cursor: pointer; }
  .interactive:hover { box-shadow: var(--shadow-md); }
  .interactive:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
  .selected { box-shadow: 0 0 0 2px var(--color-brand-600); }
  @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
</style>
```
