---
name: web-content-designer
description: Use when the user asks to turn text, articles, reports, or URLs into a polished single-file HTML page, dashboard, infographic, briefing, executive summary, or visual report. Triggers include "make this a dashboard", "visualize this article", "create an HTML report", "turn this into an infographic", "대시보드로 만들어줘", "인포그래픽으로", "요약 보고서", "시각화해줘".
---

# Web Content Designer

Transforms raw text, articles, or URLs into **production-quality single-file HTML pages**
in a consulting-deck visual style (McKinsey / BCG / Bain pitch tone). Every output is a
standalone `.html` file — no build tools, no external assets beyond three CDN links
(Tailwind, Chart.js, Paperlogy font).

## Core Design Philosophy

**This skill produces restrained, typographic, consulting-grade layouts — never alarming,
alarming, alarming, playful, or decorative ones.** Regardless of the source topic, the output
must read like a Big Four briefing document. If the result looks like a marketing landing
page, a startup pitch, or a news portal — it is wrong.

The complete visual rules live in `design-themes.md`. The three layout blueprints live in
`dashboard-structure.md`, `infographic-structure.md`, and `one-page-structure.md`.

## Workflow

1. **Receive trigger.** The user pastes text, a URL, or asks to visualize content.
2. **Pick a layout** (see "Layout Selection" below).
3. **Pick a palette** (see `design-themes.md` — default: Consulting Navy).
4. **Read the matching structure doc** for that layout:
   - Layout 1 → `dashboard-structure.md`
   - Layout 2 → `infographic-structure.md`
   - Layout 3 → `one-page-structure.md`
5. **Read `design-themes.md`** to copy the palette variables and universal CSS classes.
6. **Generate the single-file HTML**, honoring the Visual Discipline Rules (below).
7. **Deliver** the raw HTML as a single code block. Do not wrap it in explanatory prose.
   A one-line summary of what you made is fine.

## Layout Selection

Pick exactly one layout based on content characteristics:

| Layout | Use when... |
|---|---|
| **1 — Interactive Dashboard** | Source has 5-8 distinct analytical sections, dense data, multiple KPIs, mixed charts/tables. The reader benefits from a persistent sidebar to jump between sections. Think: strategic report, market analysis, multi-source research synthesis. |
| **2 — Visual Infographic** | Source is narrative-driven, chronological, or argumentative. Benefits from long-scroll storytelling with embedded timelines, quotes, comparison tables. Think: editorial long-form, crisis analysis, historical reconstruction. |
| **3 — One-Page Summary** | User asks for a "briefing", "executive summary", "TL;DR", "one-pager", or source is short enough to condense to 4 KPIs + 4 key points + 1 chart. Must fit in a single viewport without scrolling. |

**If ambiguous, default to Layout 1 (Dashboard).**

**Explicit trigger phrases:**
- Dashboard: "dashboard", "대시보드", "interactive report", "sectioned report"
- Infographic: "infographic", "인포그래픽", "visual essay", "long-form", "story"
- One-page: "executive summary", "briefing", "one-pager", "TL;DR", "요약 보고서", "한 페이지"

## Visual Discipline Rules (NON-NEGOTIABLE)

These rules apply to **every** output regardless of layout or palette. Violating any of
these produces a non-consulting result and is a failure of this skill.

1. **CSS variables only.** Never use Tailwind color classes (`bg-blue-500`, `text-red-600`,
   `border-green-400`, etc.). All colors come from the palette defined in
   `design-themes.md` via `style="color:var(--primary)"` or custom classes.

2. **Flat, not rounded.** Border-radius ≤ `0.125rem` / `rounded-sm` on all containers.
   Cards, buttons, panels — all squared-off. The only exception is 20-24px circular
   badges for section numbers.

3. **Hairline borders over shadows.** Prefer `1px solid var(--border)` over `box-shadow`.
   Where shadow is needed, maximum is `0 1px 2px rgba(0,0,0,0.04)`. Never `shadow-lg`.

4. **No emoji as icons.** KPI icons, section markers, nav bullets must be inline SVG line
   icons (`stroke-width="2"` typical). Emoji is only allowed inside literal quoted text
   from the source.

5. **Restrained chart colors.** For single-series charts (one bar column, one line),
   use `--primary` or its gradient tints only. For two-series comparisons (e.g., "expected
   vs actual"), use `--primary` + `--accent` — this is the McKinsey-standard pairing. For
   multi-category comparisons (3+ series), use the 5-step monochromatic gradient defined
   per palette in `design-themes.md`. When one category needs to signal "bad / warning /
   downside", use muted oxblood (`#6b1220`) instead of alarm red. Never introduce bright
   colors, saturated blues, or off-palette hues into chart fills.

6. **Eyebrow labels before headings.** Every section, card, and KPI block starts with a
   small uppercase tracking-widest text label (`text-xs font-bold uppercase tracking-widest`).
   This is the signature consulting-deck rhythm. No heading without an eyebrow.

7. **Accent color is rare.** The palette's `--accent` is used only for: (a) eyebrow labels
   in featured areas, (b) the `border-left` of active sidebar links, (c) small highlight
   text in dark banners. Never for primary UI elements or chart fills.

8. **Whitespace over decoration.** If the design feels empty, add whitespace — never color,
   never a gradient, never an emoji, never a pastel background block.

9. **One featured banner per report, maximum.** The dark `.featured-banner` block is
   powerful precisely because it's rare. Never use more than one per page.

10. **Font: Paperlogy throughout.** Weights: 800 for headlines, 700 for labels/eyebrows,
    600 for strong body, 400 for prose. Never 900.

## Anti-Patterns (AUTOMATIC REJECTION)

If your draft includes any of these, scrap it and start over:

- Tailwind color utility classes like `bg-blue-500`, `text-red-600`, `border-green-400`
- `rounded-xl`, `rounded-2xl`, `rounded-full` on cards or buttons
- `shadow-md`, `shadow-lg`, `shadow-xl`, or any `drop-shadow`
- Emoji (📊, ⚡, 💡, 🎯, 🔥, ⚠️, etc.) in KPI cards, nav items, or section headers
- Multi-color chart palettes (red + blue + green in one chart)
- Gradient backgrounds other than the `.featured-banner::after` subtle accent
- Alarm red (`#dc2626`, `#ef4444`, `#ff4d4f`) — use Bain Crimson's oxblood instead
- Pastel backgrounds (`bg-pink-50`, `bg-yellow-100`, `bg-purple-50`)
- Headings without an eyebrow label above them
- `font-weight: 900`

## Palette Selection Quick Reference

Default to **Consulting Navy** unless one of these conditions clearly applies:

| Content topic | Palette |
|---|---|
| Corporate strategy, finance, policy, markets, economics, general business | **Consulting Navy** ← default |
| Technology, software, AI, engineering, data, R&D | **Boston Charcoal** |
| Crisis, conflict, litigation, risk, regulatory action, loss events | **Bain Crimson** |
| Environment, sustainability, ESG, healthcare, public sector, education | **Deloitte Forest** |
| Journalism, media, cultural analysis, editorial long-form | **Editorial Slate** |

Full palette definitions with CSS variables and chart gradients: `design-themes.md`.

## Technical Stack

Every generated HTML file is self-contained and uses exactly these three CDN dependencies:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css"
      type="text/css"/>
```

Plus inline `<style>` (palette + universal classes from `design-themes.md`) and inline
`<script>` (scroll-spy, mobile menu, Chart.js initialization). No other dependencies.

## Delivery Format

Deliver the output as a **single HTML code block**. Do not split it, do not explain the
CSS, do not add preamble. A one-sentence lead-in describing which layout and palette
you picked is fine — but the meat of the response is the raw HTML.

Example delivery:

> I used Layout 2 (Visual Infographic) with the Editorial Slate palette since this is a
> long-form media analysis piece.
>
> ```html
> <!DOCTYPE html>
> ...
> ```

## Reference Outputs

Three example files demonstrate the expected quality bar. Open them to see how palette,
layout, and discipline rules combine in practice:

- `dashboard-example.html` — Layout 1 in Consulting Navy
- `infographic-example.html` — Layout 2 in Editorial Slate
- `one-page-example.html` — Layout 3 in Consulting Navy

When in doubt about visual tone, open these and match them.

## Compatibility

- **Claude models:** Opus 4+, Sonnet 4+, Haiku 4.5+
- **Platforms:** Claude.ai, Claude Code, any environment with skill support
- **Language:** Auto-detect from source (Korean / English supported)
- **Browsers:** All modern browsers (Chrome, Firefox, Safari, Edge)
