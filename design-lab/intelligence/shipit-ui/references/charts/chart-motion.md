# Chart Motion

Charts animate to communicate change, not to entertain. Every motion below has a `prefers-reduced-motion` fallback.

## Tokens

```
--dur-150   /* tooltip, focus highlight */
--dur-300   /* data update, legend toggle */
--dur-600   /* entrance, first paint */
--ease-out-quint        cubic-bezier(0.22, 1, 0.36, 1)
--ease-in-out-cubic     cubic-bezier(0.65, 0, 0.35, 1)
```

Never write a raw `ms` literal in chart code. Always token.

## Entrance (first paint)

- **Duration:** `--dur-600`. Easing: `--ease-out-quint`.
- **Bars** grow from the baseline (zero) up/right. Stagger: 30 ms per bar, capped total at 400 ms.
- **Lines** draw left-to-right (`stroke-dasharray` reveal) — 600 ms.
- **Areas** draw with the line, then fade in fill 200 ms after the line completes.
- **Scatter points** fade in opacity 0 → 1, with a 20 ms stagger by index. No size grow.
- **Pie / donut** — sweep from 12 o'clock clockwise. 600 ms.

Suppress entrance entirely under reduced motion; the chart appears in final state.

## Update (data change)

When the same chart receives new data (filter change, time range change, live tick):

- **Duration:** `--dur-300`. Easing: `--ease-in-out-cubic`.
- **Bars** tween height; never tween width simultaneously.
- **Lines** tween points; if the x-domain changes, snap the new domain in place rather than morph it.
- **Scatter** tween position; size changes are immediate (size encodes a variable; a tween implies an in-between value that doesn't exist).
- **Color** changes are 150 ms cross-fades, never tweens through intermediate hues.

Cross-fade rather than morph when:
- The chart type changes (bar → line is a re-mount, not a tween).
- Series count changes (a bar appearing from nothing reads as a glitch — fade in instead).
- The x-domain shifts (zoom, range change) — snap, don't morph.

## Hover / focus

- **Duration:** `--dur-150`. Easing: `--ease-out-quint`.
- Hovered datum: highlight color (1 step darker on bars, larger marker on lines / scatter).
- Other data: dim to 30 % opacity (line charts) or unchanged (bar charts).
- Tooltip enters with 150 ms opacity tween; exits instantly.
- No layout shift on hover.

Focus mirrors hover. Keyboard navigation: arrow keys move focus across data points; the tooltip mirrors the focused datum.

## Legend toggle

- 200 ms cross-fade of the toggled series.
- Bars/lines fade out via opacity, but stay in the layout (do not re-flow). Re-flowing on every legend toggle is jittery.

## Animation suppression

Suppress motion when:

- **Live data** updates more than once every 2 seconds. Continuous tweening makes the chart vibrate; switch to instant updates.
- **Reduced motion** (`prefers-reduced-motion: reduce`). Disable entrance, update tween, hover transitions on the marks themselves. Tooltip still fades opacity (acceptable under reduced motion).
- **Print stylesheet** — no animation, final state only.
- **Initial offscreen render** (chart in a hidden tab). When the tab becomes visible, chart appears in final state without entrance animation.

## Reduced-motion fallback

```css
@media (prefers-reduced-motion: reduce) {
  .chart * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* opacity-only allowed: */
  .chart .tooltip { transition: opacity var(--dur-150); }
}
```

For Framer Motion / Motion libraries:

```jsx
import { useReducedMotion } from "framer-motion";
const reduced = useReducedMotion();
const transition = reduced
  ? { duration: 0 }
  : { duration: 0.3, ease: [0.65, 0, 0.35, 1] };
```

For ECharts / Chart.js: configure `animation: false` when `matchMedia('(prefers-reduced-motion: reduce)').matches`.

## Anti-patterns

- Smooth-tweening through impossible intermediate values (a discrete step like "category count" tweening through 4.7).
- Animation on every render of a live chart — jitter.
- Entrance animations on charts inside a scrollable list — they fire as the user scrolls, creating chaos.
- Bouncy springs on data updates — implies playful uncertainty about real numbers.
- Animating axis ticks in/out as the domain changes — distracts from the data change itself.
- Removing the focus highlight transition under reduced motion — keep opacity transitions; only disable transforms.

## Cross-references

- `references/charts/chart-anatomy.md` — what's animated and what isn't.
- `references/motion-curves/curves.json` — the project's motion tokens.
- `skills/motion-design/SKILL.md` — full motion ladder.
