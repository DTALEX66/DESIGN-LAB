# Input — Blueprint

The text-input field. Field-level — pair with a Label component. Validation, help text, and error messaging are explicit slots, not afterthoughts.

## Anatomy

- Wrapper (label-form association lives here)
- Label (always present, sometimes visually hidden but never removed)
- Optional description (id linked via `aria-describedby`)
- Input element (`<input>` or `<textarea>`)
- Optional leading/trailing adornments (icon, unit, clear button)
- Error or success message slot

## Required states

| State | Visual change | Notes |
|---|---|---|
| default | neutral border, surface bg | |
| hover | border darkens one step | Subtle. |
| focus | 2px ring (brand-600), border matches | Use `focus-visible` when feasible. |
| disabled | opacity 0.5, cursor not-allowed, neutral-100 bg | |
| readonly | neutral-100 bg, normal text color | Distinct from disabled. |
| invalid | danger-600 border + ring, error message visible | Use `aria-invalid` and `aria-describedby`. |
| valid (when explicit) | success-600 border, optional check icon | Don't auto-show on every typed character; debounce. |

## Validation pattern

- Validate on blur, not on every keystroke.
- Surface error AFTER first blur, then live-update as the user fixes it.
- Error message is short, in plain language, and tells them how to fix it.

## Accessibility

- ALWAYS associate label and input. `<label htmlFor>` or wrap. Visually-hidden labels still count.
- Use `aria-invalid="true"` when in error state.
- Link the error message via `aria-describedby="<id-of-error>"`.
- Adornments (unit, icon) are decorative — `aria-hidden`.
- A clear button INSIDE the input is its own button with `aria-label="Clear"`.
- Touch target for the input is min 44px tall.

## Tokens consumed

```
--color-surface-1
--color-border-input
--color-border-input-hover
--color-brand-600 (focus ring)
--color-danger-600 (invalid)
--color-text-1 / -2 / -muted
--radius-md
--space-3 / -4
--font-size-base
--duration-fast (150ms)
```

## React + Tailwind reference

```tsx
import { forwardRef, useId } from "react";
import clsx from "clsx";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, description, error, hideLabel, leading, trailing, id, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descId = description ? `${inputId}-desc` : undefined;
  const errId = error ? `${inputId}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={clsx(
          "text-[var(--font-size-sm)] font-medium text-[var(--color-text-1)]",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      {description && (
        <p id={descId} className="text-[var(--font-size-sm)] text-[var(--color-text-2)]">
          {description}
        </p>
      )}
      <div
        className={clsx(
          "flex items-center gap-2 rounded-[var(--radius-md)] border bg-[var(--color-surface-1)]",
          "px-3 transition-colors duration-[var(--duration-fast)] ease-out",
          "border-[var(--color-border-input)] hover:border-[var(--color-border-input-hover)]",
          "focus-within:border-[var(--color-brand-600)]",
          "focus-within:ring-2 focus-within:ring-[var(--color-brand-600)]/30",
          error &&
            "border-[var(--color-danger-600)] focus-within:border-[var(--color-danger-600)] " +
            "focus-within:ring-[var(--color-danger-600)]/30",
        )}
      >
        {leading && <span aria-hidden className="text-[var(--color-text-muted)]">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(
            "h-10 w-full bg-transparent text-[var(--font-size-base)] text-[var(--color-text-1)]",
            "placeholder:text-[var(--color-text-muted)] outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...rest}
        />
        {trailing && <span aria-hidden className="text-[var(--color-text-muted)]">{trailing}</span>}
      </div>
      {error && (
        <p id={errId} role="alert" className="text-[var(--font-size-sm)] text-[var(--color-danger-600)]">
          {error}
        </p>
      )}
    </div>
  );
});
```

## Vue + CSS Modules reference

```vue
<script setup lang="ts">
import styles from "./Input.module.css";
import { useId } from "vue";
const props = defineProps<{
  label: string;
  description?: string;
  error?: string;
  modelValue?: string;
}>();
defineEmits<{ "update:modelValue": [string] }>();
const id = useId();
</script>

<template>
  <div :class="styles.field">
    <label :for="id" :class="styles.label">{{ label }}</label>
    <p v-if="description" :id="`${id}-desc`" :class="styles.desc">{{ description }}</p>
    <div :class="[styles.shell, error && styles.invalid]">
      <input
        :id="id"
        :value="modelValue"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? `${id}-err` : description ? `${id}-desc` : undefined"
        :class="styles.input"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" :id="`${id}-err`" role="alert" :class="styles.error">{{ error }}</p>
  </div>
</template>
```

```css
/* Input.module.css */
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-1); }
.desc { font-size: var(--font-size-sm); color: var(--color-text-2); }
.shell {
  display: flex; align-items: center;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  background: var(--color-surface-1);
  transition: border-color var(--duration-fast) ease-out, box-shadow var(--duration-fast) ease-out;
}
.shell:hover { border-color: var(--color-border-input-hover); }
.shell:focus-within { border-color: var(--color-brand-600); box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-brand-600) 30%, transparent); }
.invalid { border-color: var(--color-danger-600); }
.invalid:focus-within { box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-danger-600) 30%, transparent); }
.input { height: 2.5rem; flex: 1; background: transparent; border: 0; outline: 0; font-size: var(--font-size-base); color: var(--color-text-1); }
.error { font-size: var(--font-size-sm); color: var(--color-danger-600); }
@media (prefers-reduced-motion: reduce) { .shell { transition: none; } }
```

## Svelte + plain CSS reference

```svelte
<script lang="ts">
  export let label: string;
  export let description = "";
  export let error = "";
  export let value = "";
  let id = crypto.randomUUID();
</script>

<div class="field">
  <label for={id}>{label}</label>
  {#if description}<p id="{id}-desc" class="desc">{description}</p>{/if}
  <div class="shell" class:invalid={error}>
    <input
      {id}
      bind:value
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-err` : description ? `${id}-desc` : undefined}
    />
  </div>
  {#if error}<p id="{id}-err" role="alert" class="error">{error}</p>{/if}
</div>

<style>
  .field { display: flex; flex-direction: column; gap: 6px; }
  label { font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-1); }
  .desc { font-size: var(--font-size-sm); color: var(--color-text-2); }
  .shell { display: flex; align-items: center; border: 1px solid var(--color-border-input); border-radius: var(--radius-md); padding: 0 var(--space-3); background: var(--color-surface-1); transition: border-color var(--duration-fast) ease-out; }
  .shell:hover { border-color: var(--color-border-input-hover); }
  .shell:focus-within { border-color: var(--color-brand-600); box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-brand-600) 30%, transparent); }
  .invalid { border-color: var(--color-danger-600); }
  input { height: 2.5rem; flex: 1; background: transparent; border: 0; outline: 0; font-size: var(--font-size-base); color: var(--color-text-1); }
  .error { font-size: var(--font-size-sm); color: var(--color-danger-600); }
  @media (prefers-reduced-motion: reduce) { .shell { transition: none; } }
</style>
```
