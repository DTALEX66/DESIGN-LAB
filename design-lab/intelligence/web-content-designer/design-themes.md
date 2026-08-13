# Design Themes — Consulting Palette Reference

All palettes in this skill follow a single design philosophy: **McKinsey / BCG / Bain
pitch deck discipline.** Restrained, typographic, hairline-bordered, monochromatic charts.
No alarm reds, no startup gradients, no emoji icons, no decorative pastels.

## Universal Rules (apply to all palettes)

These rules are non-negotiable regardless of which palette you select:

1. **Never use raw Tailwind color classes** (e.g., `bg-blue-500`, `text-red-600`). Always
   reference the palette through CSS variables: `style="color:var(--primary)"`.
2. **Border-radius ≤ 0.125rem** — Cards, buttons, and containers use `rounded-sm` at most.
   Never `rounded-xl` or `rounded-full` (except circular section number badges, which are
   max 24px).
3. **Shadow ≤ `0 1px 2px rgba(0,0,0,0.04)`** — Prefer hairline borders (`1px solid var(--border)`)
   over shadows. Never `shadow-lg` or heavier.
4. **No emoji as functional icons** — KPI icons, section markers, and nav items use inline
   SVG line icons (`stroke-width="2"` typical). Emoji is allowed only inside quoted source
   text if it was literally there in the original.
5. **Charts are restrained** — Single-series charts use `--primary` or its gradient
   tints only. Two-series comparison charts may use `--primary` + `--accent` (the
   McKinsey pairing). 3+ series charts use the 5-step monochromatic gradient defined
   below. Any category that must signal "bad / warning / downside" uses muted oxblood
   `#6b1220`, never alarm red. Never introduce bright blues, saturated reds, or
   off-palette hues into chart fills.
6. **Eyebrow labels before every heading** — Every section, every card, every KPI starts
   with a small uppercase tracking-widest text label. This is the signature consulting-deck
   visual rhythm.
7. **Whitespace over decoration** — If a design feels empty, add whitespace, not color.
8. **Font: Paperlogy** for headings and body. Heavy weights (800) for headlines, 600-700
   for labels, 400 for prose.

## How to Choose a Palette

| If the source is about... | Use palette |
|---|---|
| Corporate strategy, finance, markets, general business, policy | **Consulting Navy** (default) |
| Technology, software, AI, engineering, data platforms | **Boston Charcoal** |
| Crisis, risk, conflict, regulatory action, litigation, loss | **Bain Crimson** |
| Environment, sustainability, ESG, healthcare, public sector | **Deloitte Forest** |
| Journalism, media analysis, social commentary, editorial long-form | **Editorial Slate** |

**Default to Consulting Navy** if the content is ambiguous or cross-domain. Never switch
palettes mid-document.

---

## Palette 1 — Consulting Navy (DEFAULT)

The McKinsey quarterly palette. Deep navy primary with muted gold accent. Use for:
corporate strategy, finance, markets, general business, policy, economics, white papers.

```css
:root {
    --primary:    #051c2c;  /* Deep navy — headlines, primary surfaces */
    --primary-2:  #1a3a54;  /* Chart mid tint */
    --primary-3:  #315676;  /* Chart light tint */
    --primary-4:  #507995;  /* Chart lighter tint */
    --accent:     #c4a35a;  /* Muted antique gold — eyebrow labels, highlights */
    --bg:         #ffffff;
    --bg-alt:     #f5f6f8;  /* Subtle panel background */
    --border:     #d9dce1;  /* Hairline dividers */
    --text:       #1a1a2e;  /* Body text */
    --text-mid:   #3d4456;  /* Secondary text */
    --text-light: #6b7280;  /* Tertiary text, meta */
}
```

**Chart gradient** (5 tints, darkest → lightest):
`#051c2c`, `#1a3a54`, `#315676`, `#507995`, `#7099b4`

---

## Palette 2 — Boston Charcoal

The BCG Henderson Institute palette. Deep charcoal primary with a restrained forest
green accent. Reads as "analytical rigor with a technology edge." Use for: technology,
software, AI, engineering, data platforms, R&D, industrial.

```css
:root {
    --primary:    #1a1f2e;  /* Charcoal with cool tint */
    --primary-2:  #2f3a4d;
    --primary-3:  #485670;
    --primary-4:  #647490;
    --accent:     #2d6a4f;  /* Muted forest green — BCG signature */
    --bg:         #ffffff;
    --bg-alt:     #f4f5f7;
    --border:     #dcdfe4;
    --text:       #15192a;
    --text-mid:   #384053;
    --text-light: #6a7288;
}
```

**Chart gradient**: `#1a1f2e`, `#2f3a4d`, `#485670`, `#647490`, `#8296b0`

---

## Palette 3 — Bain Crimson

The Bain red palette, modernized. Deep crimson primary with a charcoal counterweight.
Still muted — no alarm red, no safety orange. Reads as "serious, high-stakes, consequential."
Use for: crisis analysis, risk, conflict, regulatory action, litigation, loss events.

```css
:root {
    --primary:    #6b1220;  /* Deep oxblood crimson */
    --primary-2:  #852033;
    --primary-3:  #a03546;
    --primary-4:  #b85566;
    --accent:     #1f2430;  /* Near-black charcoal — counterweight */
    --bg:         #ffffff;
    --bg-alt:     #f6f3f3;
    --border:     #e0d9da;
    --text:       #1f1618;
    --text-mid:   #453339;
    --text-light: #726069;
}
```

**Chart gradient**: `#6b1220`, `#852033`, `#a03546`, `#b85566`, `#d07a88`

**Important**: Even though this is the "crisis" palette, the overall page should still
feel composed — not alarmed. Use this palette's intensity sparingly. Let whitespace do
the work of conveying gravity.

---

## Palette 4 — Deloitte Forest

A deep forest green primary with a warm beige accent. Earthy, credible, institutional.
Reads as "long-term stewardship." Use for: environment, sustainability, ESG, healthcare,
education, public sector, social impact.

```css
:root {
    --primary:    #1b4332;  /* Deep forest */
    --primary-2:  #2d5a44;
    --primary-3:  #417156;
    --primary-4:  #5b8a70;
    --accent:     #a68a64;  /* Warm earthy beige */
    --bg:         #ffffff;
    --bg-alt:     #f4f6f3;
    --border:     #d8ddd5;
    --text:       #161f1a;
    --text-mid:   #384338;
    --text-light: #6a7268;
}
```

**Chart gradient**: `#1b4332`, `#2d5a44`, `#417156`, `#5b8a70`, `#79a48c`

---

## Palette 5 — Editorial Slate

The Financial Times / Economist long-form palette. Warm off-white background with a
slate primary and restrained terracotta accent. Reads as "considered journalism." Use for:
media analysis, editorial commentary, social research, cultural criticism, long-form
infographics.

```css
:root {
    --primary:    #2c3e50;  /* Slate */
    --primary-2:  #3e5266;
    --primary-3:  #56697c;
    --primary-4:  #738596;
    --accent:     #b85c3b;  /* Muted terracotta — FT pink spirit, darker */
    --bg:         #fcf9f2;  /* Warm off-white — editorial paper */
    --bg-alt:     #f4efe4;
    --border:     #e0d9c9;
    --text:       #1d242c;
    --text-mid:   #3a4654;
    --text-light: #6b7583;
}
```

**Chart gradient**: `#2c3e50`, `#3e5266`, `#56697c`, `#738596`, `#90a0b0`

**Note**: This is the only palette with an off-white background. Everything else uses
pure white. This reinforces the "newspaper" feel.

---

## Universal CSS Classes (paste into every output)

These classes work identically across all 5 palettes. Always include them in the
`<style>` block after the palette CSS variables:

```css
body {
    font-family: "Paperlogy", -apple-system, BlinkMacSystemFont, "Segoe UI",
                 Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
}

/* Layout 1 sidebar links */
.sidebar-link {
    transition: all 0.15s;
    font-size: 0.82rem;
    color: rgba(255,255,255,0.6);
    border-left: 3px solid transparent;
    letter-spacing: 0.01em;
}
.sidebar-link:hover { color: #fff; background: rgba(255,255,255,0.06); }
.sidebar-link.active {
    color: #fff;
    font-weight: 700;
    background: rgba(255,255,255,0.08);
    border-left-color: var(--accent);
}

/* Section titles */
.content-section { scroll-margin-top: 4.5rem; }
.s-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding-bottom: 0.6rem;
    margin-bottom: 1.25rem;
    border-bottom: 3px solid var(--primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.s-title .num {
    font-size: 0.75rem;
    font-weight: 800;
    color: #fff;
    background: var(--primary);
    border-radius: 2px;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* Insight boxes */
.insight-box {
    border: 1px solid var(--border);
    border-top: 3px solid var(--primary);
    padding: 1.25rem;
    background: #fff;
}
.insight-box.mid-top    { border-top-color: var(--primary-3); }
.insight-box.accent-top { border-top-color: var(--accent); }

/* Stat cards */
.stat-card {
    text-align: center;
    padding: 1.25rem 1rem;
    border: 1px solid var(--border);
    background: var(--bg-alt);
}
.stat-val {
    font-size: 2rem;
    font-weight: 800;
    color: var(--primary);
    line-height: 1;
}
.stat-label {
    font-size: 0.72rem;
    color: var(--text-light);
    margin-top: 0.4rem;
    line-height: 1.3;
}

/* Pull quotes */
.pull-quote {
    border-left: 4px solid var(--primary);
    padding: 1rem 1.5rem;
    background: var(--bg-alt);
    font-style: italic;
    font-size: 0.88rem;
    color: var(--text-mid);
    line-height: 1.7;
    margin: 1rem 0;
}

/* Featured banner (Layout 1 — at most once per report) */
.featured-banner {
    background: var(--primary);
    color: #fff;
    padding: 1.5rem 2rem;
    position: relative;
    overflow: hidden;
}
.featured-banner::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 100%;
    background: var(--accent);
    opacity: 0.12;
    transform: skewX(-12deg) translateX(40px);
}

/* Misc */
.sub-text { font-size: 0.82rem; line-height: 1.7; color: var(--text-mid); }
.sub-text strong { color: var(--text); }
.divider { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
.chart-container { position: relative; height: 270px; }
.step-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 0.65rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    color: #fff;
    flex-shrink: 0;
}
.pill {
    display: inline-block;
    padding: 0.15rem 0.55rem;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--bg-alt);
    color: var(--text-light);
    border: 1px solid var(--border);
}
.pill-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
```

## Chart.js Base Configuration

Use this base config for all charts in all palettes. Replace `#051c2c` etc. with the
palette's own chart gradient:

```javascript
const consultingChartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                font: { family: 'Paperlogy', size: 11, weight: '600' },
                color: '#3d4456',
                boxWidth: 12,
                boxHeight: 12,
                padding: 14
            }
        },
        tooltip: {
            backgroundColor: '#051c2c',  /* use palette --primary */
            titleFont: { family: 'Paperlogy', size: 12, weight: '700' },
            bodyFont: { family: 'Paperlogy', size: 11 },
            padding: 10,
            cornerRadius: 2,
            displayColors: false
        }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: {
                font: { family: 'Paperlogy', size: 10, weight: '600' },
                color: '#6b7280'
            }
        },
        y: {
            grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
            ticks: {
                font: { family: 'Paperlogy', size: 10 },
                color: '#6b7280'
            }
        }
    }
};
```

## Do / Don't Reference

| Do | Don't |
|---|---|
| Hairline borders (`1px solid var(--border)`) | Box shadows |
| `border-radius: 2px` or none | `rounded-xl`, `rounded-full` |
| Uppercase tracking-widest eyebrow labels | ALL CAPS headings |
| Inline SVG line icons (`stroke-width: 2`) | Emoji icons |
| Charts: `--primary` monochromatic, or `--primary` + `--accent` for 2-series | Multi-color palette charts with bright blues / reds |
| Muted oxblood `#6b1220` for "bad" categories | Alarm red `#dc2626`, `#c00`, etc. |
| `font-weight: 800` on headlines | `font-weight: 900` (too heavy) |
| Narrow content width (`max-w-4xl` / `max-w-5xl`) | Edge-to-edge layouts |
| Whitespace as a design element | Decorative backgrounds |
| One `featured-banner` per report, maximum | Multiple dark banners |
| `--accent` for eyebrows and highlights only | `--accent` in chart fills |
