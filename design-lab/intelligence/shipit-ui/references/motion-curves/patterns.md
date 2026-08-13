# Motion Patterns

Pairings of duration and easing that make motion feel intentional. Pick a row, not freeform values.

## The default table

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Hover (color/opacity) | fast (150ms) | ease-out | The fastest motion that still reads as "responding". |
| Hover (transform / lift) | default (200ms) | out-quint | Gentle landing, no bounce. |
| Active / press | fast (150ms) | ease-out | Press in fast, release on the next frame. |
| Focus ring appearance | fast (150ms) | ease-out | Should never feel slow — accessibility first. |
| Button label change | fast (150ms) | ease-in-out | Crossfade only; don't slide labels. |
| Dropdown / popover open | default (200ms) | out-quint | Slight scale (0.96 → 1) plus opacity. |
| Dropdown / popover close | fast (150ms) | ease-in-out | Closing is always quicker than opening. |
| Tooltip | fast (150ms) | ease-out | Plus a 300ms delay before showing. |
| Toast / snackbar in | default (200ms) | out-quint | Slide from edge plus opacity. |
| Toast / snackbar out | default (200ms) | ease-in-out | |
| Modal / dialog open | medium (300ms) | out-quint | Backdrop fades faster (default). |
| Modal / dialog close | default (200ms) | ease-in-out | |
| Sheet / drawer open | medium (300ms) | out-quint | Slide plus subtle backdrop fade. |
| Accordion expand/collapse | medium (300ms) | in-out-cubic | Symmetric height transition. |
| Tab content swap | default (200ms) | ease-out | Crossfade only; no horizontal slide unless tabs are paginated. |
| Toggle switch | default (200ms) | spring | One of the few places spring overshoot earns its keep. |
| Drag end / snap-back | medium (300ms) | spring | |
| Hero entrance | slow (600ms) | out-quint | Often staggered (40ms step). |
| Staggered list reveal | slow (600ms) per item, 40ms step | out-quint | Cap at 8 staggered items; rest appear together. |
| Page / route transition | medium (300ms) | in-out-cubic | Crossfade is safer than slide for accessibility. |
| Layout shift (height change) | medium (300ms) | in-out-cubic | |
| Number / counter tick | fast (150ms) | ease-out | Per digit, no stagger. |
| Skeleton → content | default (200ms) | ease-out | Crossfade; never pop. |

## Choosing a curve when the table doesn't have your case

1. **Is it arriving?** — `out-quint`.
2. **Is it leaving?** — `ease-in-out` at 75% of the entrance duration.
3. **Is it a layout transition (size, position)?** — `in-out-cubic`.
4. **Is the user touching it?** — `spring` if there's a satisfying snap target; otherwise `ease-out`.
5. **Otherwise** — `ease-in-out` is the safe default; never break flow asking.

## Reduced-motion contract

Every motion path MUST honor `prefers-reduced-motion: reduce`. Implementation pattern:

- Wrap motion variants in a guard that returns the end state immediately when `reduce` is set.
- Crossfade (opacity-only) MAY remain at 150ms; it doesn't trigger vestibular discomfort.
- Disable: parallax, springs, overshoot, large transforms, auto-playing carousels.

## Duration sanity checks

- Nothing under 100ms reads as motion; it reads as a glitch. If you find yourself reaching there, set duration to 0 and skip the transition.
- Nothing over 700ms for a UI interaction. Hero/route transitions are the only exceptions.
- Closing animations should always be shorter than opening — typically 75% of the open duration.
