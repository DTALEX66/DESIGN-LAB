# Web Content Designer

A Claude skill that transforms raw text, articles, or URLs into polished, production-grade single-file HTML pages — in a disciplined **consulting-deck visual style** (McKinsey / BCG / Bain pitch tone). Interactive navigation, Chart.js data visualizations, responsive layouts, and five restrained color palettes. No alarm reds, no startup gradients, no emoji icons.

![Claude Skill](https://img.shields.io/badge/Claude-Skill-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/license-Apache_2.0-blue?style=flat-square)
![Layouts](https://img.shields.io/badge/layouts-3-blue?style=flat-square)
![Palettes](https://img.shields.io/badge/palettes-5-orange?style=flat-square)

---

## What It Does

Give Claude any text content — a research paper, policy brief, financial analysis, media long-form — and this skill turns it into a consulting-grade HTML briefing. The output is a single `.html` file you can open in any browser, host on any server, or embed anywhere.

Every output follows strict visual discipline rules:
- **Flat, hairline-bordered cards** (no rounded corners, no heavy shadows)
- **Monochromatic charts** (tints of the primary color only)
- **Inline SVG line icons** (no emoji)
- **Eyebrow labels above every heading** (uppercase tracking-widest)
- **One featured banner per report, maximum**
- **Whitespace as a design element**

### Three Layout Options

| Layout | Best For | Key Features |
|:--|:--|:--|
| **1 — Interactive Dashboard** | Dense analytical content with 5-8 sections | Fixed dark sidebar, numbered sections, scroll-spy, KPIs, insight boxes |
| **2 — Visual Infographic** | Narrative long-form, editorial analysis | Fixed top nav, long-scroll storytelling, timelines, pull quotes, scenario cards |
| **3 — One-Page Summary** | Executive briefings, TL;DR overviews | Single viewport (no scroll), 4 KPIs, monochromatic chart, footer recommendation |

### Five Consulting Palettes

All palettes follow a single design philosophy: restrained, typographic, never alarming or decorative.

| Palette | Tone | Triggered By |
|:--|:--|:--|
| **Consulting Navy** *(default)* | Deep navy + muted gold | Corporate strategy, finance, markets, policy, economics |
| **Boston Charcoal** | Charcoal + forest green | Technology, software, AI, engineering, data, R&D |
| **Bain Crimson** | Oxblood + charcoal | Crisis, conflict, litigation, risk, regulatory action |
| **Deloitte Forest** | Deep forest + warm beige | Environment, sustainability, ESG, healthcare, public sector |
| **Editorial Slate** | Slate + terracotta on warm off-white | Journalism, media analysis, cultural long-form |

Full palette definitions and chart gradient ramps live in [`design-themes.md`](design-themes.md).

---

## Installation

### Claude.ai (Recommended)

1. Download this repository as a ZIP (or clone it).
2. Compress the `web-content-designer/` folder into a `.zip` file.
3. In Claude.ai settings, upload it as a custom skill.

The skill's entry point is [`SKILL.md`](SKILL.md), which Claude reads first, then loads the matching layout reference on demand.

### Claude Code

Clone this repo into your Claude skills directory:

```bash
git clone https://github.com/lowtidebuild/web-content-designer.git ~/.claude/skills/web-content-designer
```

---

## Usage

Simply ask Claude to visualize your content:

```
Make this into a dashboard:
[paste your article or text here]
```

```
이 텍스트를 인포그래픽으로 만들어줘:
[텍스트 붙여넣기]
```

```
Create a one-page executive briefing from this report.
```

You can also provide a URL:

```
Turn this article into a visual infographic: https://example.com/article
```

### Trigger Phrases

The skill activates on phrases like:

- "make this into a dashboard / infographic / briefing"
- "visualize this article"
- "create an HTML report from this"
- "turn this into an executive summary"
- "대시보드로 만들어줘"
- "인포그래픽으로 정리해줘"
- "요약 보고서 만들어줘"
- "이 텍스트를 시각화해줘"

---

## Examples

Three reference outputs demonstrate the expected quality bar:

| File | Layout | Palette | Description |
|:--|:--|:--|:--|
| [`dashboard-example.html`](dashboard-example.html) | Dashboard | Consulting Navy | Drew Bent / Anthropic briefing on AI-native thinking and the future of education |
| [`infographic-example.html`](infographic-example.html) | Infographic | Editorial Slate | The quiet return of industrial policy — long-form briefing with timeline, scenarios, and stacked chart |
| [`one-page-example.html`](one-page-example.html) | One-Page | Consulting Navy | Global semiconductor capacity outlook 2026 — single-viewport executive summary |

Open any of these `.html` files in a browser to see the expected output quality and visual tone.

---

## Skill Architecture

```
web-content-designer/
├── SKILL.md                        # Entry point — routing, triggers, discipline rules
├── design-themes.md                # 5 consulting palettes + universal CSS classes
├── dashboard-structure.md          # Layout 1 blueprint (fixed sidebar)
├── infographic-structure.md        # Layout 2 blueprint (long-scroll with top nav)
├── one-page-structure.md           # Layout 3 blueprint (single viewport)
├── dashboard-example.html          # Reference output — Layout 1
├── infographic-example.html        # Reference output — Layout 2
└── one-page-example.html           # Reference output — Layout 3
```

**Progressive disclosure**: Claude reads only `SKILL.md` on trigger, then loads the relevant layout structure doc + `design-themes.md` on demand. This keeps token usage efficient while maintaining high output quality.

---

## Technical Stack

Every generated HTML file is self-contained and uses exactly three CDN dependencies:

- **[Tailwind CSS](https://tailwindcss.com/)** — Layout utilities (colors come from CSS variables, not Tailwind palette)
- **[Chart.js](https://www.chartjs.org/)** — Monochromatic data visualizations
- **[Paperlogy Font](https://fonts-archive.github.io/Paperlogy/)** — Clean Korean/English typography

No build tools, no dependencies, no framework — just open the `.html` file in a browser.

---

## Design Discipline — Why the Restraint?

The 10 brightly-themed palettes in the original version of this skill produced outputs that looked like marketing landing pages rather than consulting briefings. The current version enforces a single aesthetic across all palettes: **the output must read like a Big Four briefing document, not a startup pitch deck**.

Specifically, the skill automatically rejects:

- Tailwind color classes (`bg-blue-500`, `text-red-600`, etc.)
- `rounded-xl`, `rounded-2xl`, `rounded-full` on cards
- `shadow-md`, `shadow-lg`, or heavier
- Emoji in KPI cards, nav items, or section headers
- Multi-color chart palettes
- Gradient backgrounds
- Alarm reds, neon pastels, decorative boxes
- Headings without an eyebrow label

If the result looks festive or cheerful, it is wrong. See [`SKILL.md`](SKILL.md) for the complete discipline rules.

---

## Compatibility

- **Claude models**: Claude Opus 4, Claude Sonnet 4, Claude Haiku 4.5 and above
- **Platforms**: Claude.ai, Claude Code, any environment with Claude skill support
- **Language support**: Korean and English (auto-detected from source content)
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)

---

## Contributing

Contributions are welcome. Some areas that would be especially valuable:

- Additional layout templates (e.g., two-column comparison report, vertical timeline-only)
- Additional consulting palettes for underserved domains (legal, M&A, healthcare finance)
- Accessibility improvements (ARIA labels, keyboard navigation, focus states)
- Korean/English bilingual output mode

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
