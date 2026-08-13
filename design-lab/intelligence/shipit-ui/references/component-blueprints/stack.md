# Stack — Blueprint

A layout primitive: vertical or horizontal flex container with token-driven gap. The most boring component, and the most-used. If you need to space children, reach for Stack before margin.

## Anatomy

- Container (`<div>` by default; configurable via `as` prop)
- Children flow in `direction` (vertical default, horizontal optional)
- Gap is a token, not a number
- Optional dividers between children

## Why this exists

To eliminate margin-on-children and the "first/last child margin" pattern. Spacing belongs to the layout, not the item.

## API

| Prop | Default | Notes |
|---|---|---|
| `direction` | `"vertical"` | or `"horizontal"` |
| `gap` | `"4"` | space-token name; e.g. `"2"`, `"3"`, `"4"`, `"6"`, `"8"` |
| `align` | `"stretch"` | `flex-align-items`: `"start" \| "center" \| "end" \| "stretch"` |
| `justify` | `"start"` | `flex-justify-content`: `"start" \| "center" \| "end" \| "between"` |
| `wrap` | `false` | only applies when horizontal |
| `divider` | `false` | render `--color-border-subtle` 1px line between children |
| `as` | `"div"` | semantic override |

## Required states

Stack is structural — no interactive states. The only "states" worth checking:

- Empty: render nothing (don't render an empty wrapper that breaks parent layout).
- Single child: gap is unused; don't apply margin.
- Wrapping (horizontal): gap applies in both axes; verify both directions look right.

## Accessibility

- Stack is presentational by default. Don't add `role="list"` unless children are actually a list — and if they are, prefer `<ul>`/`<ol>` with `role="list"` only when CSS removes default styling.
- Don't put focusable items into a Stack and expect arrow-key nav; that's a Toolbar/Menu/Tablist concern.
- Heading/landmark order is a parent-document concern; Stack doesn't inject anything.

## Tokens consumed

```
--space-1 ... --space-12
--color-border-subtle (only when divider is true)
```

## React + Tailwind reference

```tsx
import { forwardRef } from "react";
import clsx from "clsx";

type SpaceToken = "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";

type Props = React.HTMLAttributes<HTMLElement> & {
  as?: keyof JSX.IntrinsicElements;
  direction?: "vertical" | "horizontal";
  gap?: SpaceToken;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  divider?: boolean;
};

export const Stack = forwardRef<HTMLElement, Props>(function Stack(
  {
    as = "div",
    direction = "vertical",
    gap = "4",
    align = "stretch",
    justify = "start",
    wrap,
    divider,
    className,
    children,
    ...rest
  },
  ref as React.Ref<HTMLElement>,
) {
  const Tag = as as "div";
  return (
    <Tag
      ref={ref as never}
      data-stack
      data-direction={direction}
      data-divider={divider || undefined}
      className={clsx(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        wrap && "flex-wrap",
        gapClass(gap),
        alignClass(align),
        justifyClass(justify),
        divider && dividerClass(direction),
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});

function gapClass(g: SpaceToken) {
  return `gap-[var(--space-${g})]`;
}

function alignClass(a: NonNullable<Props["align"]>) {
  return { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }[a];
}

function justifyClass(j: NonNullable<Props["justify"]>) {
  return {
    start: "justify-start", center: "justify-center", end: "justify-end", between: "justify-between",
  }[j];
}

function dividerClass(d: "vertical" | "horizontal") {
  return d === "vertical"
    ? "[&>*+*]:border-t [&>*+*]:border-[var(--color-border-subtle)] [&>*+*]:pt-[var(--space-4)]"
    : "[&>*+*]:border-l [&>*+*]:border-[var(--color-border-subtle)] [&>*+*]:pl-[var(--space-4)]";
}
```

## Vue + CSS Modules reference

```vue
<script setup lang="ts">
import styles from "./Stack.module.css";
withDefaults(
  defineProps<{
    direction?: "vertical" | "horizontal";
    gap?: string;
    align?: string;
    justify?: string;
    divider?: boolean;
  }>(),
  { direction: "vertical", gap: "4", align: "stretch", justify: "start" },
);
</script>

<template>
  <div
    :class="[styles.stack, styles[direction], divider && styles.divider]"
    :style="{
      gap: `var(--space-${gap})`,
      alignItems: align,
      justifyContent: justify === 'between' ? 'space-between' : `flex-${justify}`,
    }"
  >
    <slot />
  </div>
</template>
```

```css
/* Stack.module.css */
.stack { display: flex; }
.vertical { flex-direction: column; }
.horizontal { flex-direction: row; }
.divider.vertical > * + * { border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-4); }
.divider.horizontal > * + * { border-left: 1px solid var(--color-border-subtle); padding-left: var(--space-4); }
```

## Svelte + plain CSS reference

```svelte
<script lang="ts">
  export let direction: "vertical" | "horizontal" = "vertical";
  export let gap: string = "4";
  export let align: "start" | "center" | "end" | "stretch" = "stretch";
  export let justify: "start" | "center" | "end" | "between" = "start";
  export let divider = false;
  $: alignItems = align;
  $: justifyContent = justify === "between" ? "space-between" : `flex-${justify}`;
</script>

<div
  class="stack {direction}"
  class:divider
  style="gap: var(--space-{gap}); align-items: {alignItems}; justify-content: {justifyContent};"
>
  <slot />
</div>

<style>
  .stack { display: flex; }
  .vertical { flex-direction: column; }
  .horizontal { flex-direction: row; }
  .divider.vertical > :global(* + *) { border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-4); }
  .divider.horizontal > :global(* + *) { border-left: 1px solid var(--color-border-subtle); padding-left: var(--space-4); }
</style>
```

## Anti-patterns

- Don't pass arbitrary CSS lengths as `gap`. Always a space token.
- Don't use Stack to make a grid. Use a Grid component.
- Don't nest Stacks more than 3 deep — that's usually a sign your layout wants Grid or a real component.
- Don't put margins on Stack children. The whole point is to remove them.
