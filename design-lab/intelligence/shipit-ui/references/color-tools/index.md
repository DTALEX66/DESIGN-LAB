# Color Tools — Index

Catalog of references for color sub-tasks. Each file is self-contained and ≤ 300 lines. Read only the files you need.

## Quick map: task → reference

| If the task is… | Read |
|---|---|
| "Pick the right color space for this op" | `color-spaces.md` |
| "Convert hex to OKLCH" / "what's the CSS syntax" | `conversions.md` |
| "Pick a harmony for a brand" / "is this triadic any good" | `harmonies.md` |
| "Generate a 50–950 ramp from #4f46e5" | `ramps.md` |
| "Generate a dark variant of this palette" | `ramps.md` (Dark-mode inversion) |
| "Check WCAG contrast" / "is this AA?" | `accessibility.md` |
| "Use APCA instead of WCAG" | `accessibility.md` (APCA section) |
| "Make this palette colorblind-safe" | `accessibility.md` (Colorblind safety) |
| "Extract a palette from this image" | `extraction.md` |
| "Mix these two colors" / "tints, shades, tones" | `mixing-and-modulation.md` |
| "Lighten / darken a brand color for hover" | `mixing-and-modulation.md` |
| "Build a gradient that doesn't look muddy" | `gradients.md` |
| "Animated gradient with reduced-motion" | `gradients.md` |
| "Name color tokens — semantic vs scale" | `naming.md` |
| "Ship a `tokens.css` color section" | `tokens-recipe.md` |
| "Map scale tokens to semantic aliases" | `tokens-recipe.md`, `naming.md` |
| "Sanity-check before declaring done" | `pitfalls.md` |
| "Why does my mid-gradient look brown" | `gradients.md`, `pitfalls.md` |
| "Why does my ramp look uneven" | `ramps.md`, `color-spaces.md` |
| "Why does dark mode break brand recognition" | `ramps.md`, `tokens-recipe.md` |

## Reading order for a full palette job

1. `color-spaces.md` — orient on the math.
2. `extraction.md` or `harmonies.md` — pick the anchor.
3. `ramps.md` — build the scales.
4. `accessibility.md` — verify.
5. `mixing-and-modulation.md` — derive interaction states.
6. `naming.md` + `tokens-recipe.md` — write tokens.
7. `pitfalls.md` — final pass.

## Reading order for a one-shot fix

- "Just check contrast" → `accessibility.md`.
- "Just fix the gradient" → `gradients.md`.
- "Just rename tokens" → `naming.md`.

## What's not here

- Brand strategy (color psychology, market differentiation): out of scope. This toolbox is the engineering layer beneath any strategic choice.
- Print/CMYK workflows: design-studio targets screen surfaces. If asked, point the user to a print-specialist tool.
- Pantone matching: licensing-restricted; out of scope.
