# Infographic Structure Reference (Layout 2)

The Visual Infographic is a **long-scroll narrative report** with rich visual storytelling.
It reads like a Financial Times / Economist long-form piece — flowing from top to bottom
with embedded charts, data callouts, expert quotes, timelines, and comparison tables.

## Visual Discipline Rules (MANDATORY)

Regardless of which palette is selected, this layout MUST follow these rules:

- **CSS variables only.** Never use Tailwind color classes like `bg-blue-500` or `text-red-600`. Always reference palette variables via `style="color:var(--primary)"` or custom classes.
- **Border-radius ≤ 0.125rem** (`rounded-sm`). Never `rounded-xl` or larger on cards, buttons, or containers.
- **Shadow ≤ `0 1px 2px rgba(0,0,0,0.04)`**. Never `shadow-lg` or heavier. Prefer hairline borders.
- **Icons: inline SVG line icons only.** Never emoji for KPI icons, timeline markers, or section headers.
- **Charts use monochromatic tints of `--primary` only.** Never introduce `--accent` or off-palette colors into charts.
- **Every section starts with an eyebrow label** — a small uppercase tracking-widest text above the heading.
- **Timeline, comparison tables, insight boxes all use hairline borders.** No filled backgrounds except `--bg-alt` for subtle differentiation.
- **Whitespace over decoration.** When in doubt, add whitespace, not color.

## Page Architecture

```
┌──────────────────────────────────────────────┐
│  Fixed Top Nav (horizontal, scrollspy)       │
├──────────────────────────────────────────────┤
│                                              │
│  Hero Section (headline + eyebrow + lede)    │
│                                              │
├──────────────────────────────────────────────┤
│  Section Bridge (transition text)            │
├──────────────────────────────────────────────┤
│  KPI Cards Row                               │
│  [STAT] [STAT] [STAT] [STAT]                 │
├──────────────────────────────────────────────┤
│  Section Bridge                              │
├──────────────────────────────────────────────┤
│  Content Block: Prose + Chart Side-by-Side   │
│  ┌────────────────┐ ┌────────────────────┐   │
│  │ Analysis text  │ │ Chart.js visual    │   │
│  └────────────────┘ └────────────────────┘   │
├──────────────────────────────────────────────┤
│  Timeline / Process Flow                     │
├──────────────────────────────────────────────┤
│  Expert Quotes / Insight Boxes               │
├──────────────────────────────────────────────┤
│  Comparison Table                            │
├──────────────────────────────────────────────┤
│  Strategy Cards Grid                         │
├──────────────────────────────────────────────┤
│  Scenario Analysis                           │
├──────────────────────────────────────────────┤
│  Final Recommendations / CTA                 │
└──────────────────────────────────────────────┘
```

## Navigation: Fixed Top Bar

Unlike Layout 1's sidebar, Layout 2 uses a **horizontal top navigation bar** that stays
fixed while the reader scrolls. This reinforces the editorial long-scroll feel.

```html
<nav class="fixed top-0 left-0 right-0 z-50 border-b"
     style="background:rgba(255,255,255,0.96); backdrop-filter:blur(8px);
            border-color:var(--border)">
    <div class="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <div class="flex items-center gap-3">
            <span class="text-xs font-bold uppercase tracking-widest"
                  style="color:var(--text-light)">Briefing</span>
            <span style="color:var(--border)">|</span>
            <h1 class="text-sm font-bold" style="color:var(--primary)">Report Title</h1>
        </div>
        <div class="hidden md:flex space-x-1" id="main-nav">
            <a href="#s1" class="nav-link px-3 py-1.5 text-xs font-bold uppercase
                                 tracking-wider">01 · Overview</a>
            <a href="#s2" class="nav-link px-3 py-1.5 text-xs font-bold uppercase
                                 tracking-wider">02 · Context</a>
            <!-- ... -->
        </div>
        <button id="mobile-menu-button" class="md:hidden p-2">
            <svg width="20" height="20" fill="none" stroke="var(--primary)"
                 stroke-width="2.5"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
        </button>
    </div>
</nav>

<main class="pt-20 px-6 pb-24 max-w-4xl mx-auto">
    <!-- content flows here -->
</main>
```

```css
.nav-link {
    color: var(--text-light);
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
}
.nav-link:hover { color: var(--primary); }
.nav-link.active {
    color: var(--primary);
    border-bottom-color: var(--accent);
}
```

**Content width:** Constrain `<main>` to `max-w-4xl` (approximately 56rem / 896px) for
editorial readability. This is narrower than Layout 1's `max-w-5xl` because long-form
prose needs a comfortable line length.

## Key Visual Components

### 1. Hero Section

A bold opening that sets the stage. **Typography only — no box, no background.**

```html
<section id="overview" class="content-section mb-16 pt-8">
    <p class="text-xs font-bold uppercase tracking-widest mb-4"
       style="color:var(--accent)">SECTION 01 — OVERVIEW</p>
    <h2 class="text-3xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight"
        style="color:var(--primary)">
        Bold Headline That<br>Captures Attention
    </h2>
    <p class="text-lg md:text-xl leading-relaxed max-w-3xl"
       style="color:var(--text-mid)">
        Opening paragraph that summarizes the situation in one dense paragraph...
    </p>
</section>
```

### 2. Section Bridges

Transitional elements between major sections that guide the reader's momentum:

```html
<div class="section-bridge">
    <p class="text-sm" style="color:var(--text-mid)">
        <strong style="color:var(--primary)">Why does this matter?</strong>
        The following section examines...
    </p>
</div>
```

```css
.section-bridge {
    border-left: 3px solid var(--primary);
    padding: 0.9rem 1.25rem;
    margin: 2rem 0;
    background: var(--bg-alt);
}
```

### 3. KPI Stat Cards

Flat, bordered, no icons, no shadows:

```html
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 my-10">
    <div class="stat-card">
        <p class="stat-val">145%</p>
        <p class="stat-label">Year-over-year growth</p>
    </div>
    <!-- ×4 -->
</div>
```

```css
.stat-card {
    text-align: left;
    padding: 1.25rem 1.1rem;
    border-top: 3px solid var(--primary);
    background: var(--bg-alt);
    border-bottom: 1px solid var(--border);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
}
.stat-val {
    font-size: 2.1rem;
    font-weight: 800;
    color: var(--primary);
    line-height: 1;
    letter-spacing: -0.02em;
}
.stat-label {
    font-size: 0.72rem;
    color: var(--text-light);
    margin-top: 0.5rem;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 600;
}
```

### 4. Timeline Component

For chronological events or process flows. **No colored dots — square markers only:**

```html
<div class="timeline-container">
    <div class="timeline-item">
        <div class="timeline-date">FEB 28, 2026</div>
        <h4 class="timeline-title">Event Title</h4>
        <p class="timeline-desc">Event description in 1-2 sentences...</p>
    </div>
    <!-- ... more items -->
</div>
```

```css
.timeline-container {
    position: relative;
    padding-left: 2rem;
    margin: 2rem 0;
}
.timeline-container::before {
    content: '';
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 1px;
    background: var(--border);
}
.timeline-item {
    position: relative;
    margin-bottom: 2rem;
    padding-left: 1rem;
}
.timeline-item::before {
    content: '';
    position: absolute;
    left: -1.5rem;
    top: 0.35rem;
    width: 8px; height: 8px;
    background: var(--primary);
}
.timeline-date {
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.25rem;
}
.timeline-title {
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 0.25rem;
}
.timeline-desc {
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--text-mid);
}
```

### 5. Pull Quote / Expert Insight

```html
<div class="pull-quote">
    <p style="font-style: italic; line-height: 1.7;">
        "Quoted analysis or key insight from the source..."
    </p>
    <p class="quote-attr">— Source attribution</p>
</div>
```

```css
.pull-quote {
    border-left: 4px solid var(--primary);
    padding: 1.25rem 1.5rem;
    background: var(--bg-alt);
    font-size: 0.92rem;
    color: var(--text-mid);
    margin: 2rem 0;
}
.quote-attr {
    font-size: 0.75rem;
    color: var(--accent);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.75rem;
    font-style: normal;
}
```

### 6. Side-by-Side Analysis (Prose + Chart)

```html
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 my-10">
    <div>
        <p class="text-xs font-bold uppercase tracking-widest mb-2"
           style="color:var(--text-light)">Analysis</p>
        <h4 class="text-base font-extrabold mb-3" style="color:var(--primary)">
            Short Analytical Heading
        </h4>
        <p class="sub-text">Analysis text explaining the data shown in the chart...</p>
    </div>
    <div class="chart-box">
        <p class="text-xs font-bold uppercase tracking-widest mb-3"
           style="color:var(--text-light)">Figure 1</p>
        <div class="chart-container">
            <canvas id="chartId"></canvas>
        </div>
    </div>
</div>
```

```css
.chart-box {
    border: 1px solid var(--border);
    border-top: 3px solid var(--primary);
    padding: 1.25rem;
    background: #fff;
}
.chart-container { position: relative; height: 260px; }
```

### 7. Comparison / Data Table

```html
<table class="data-table">
    <thead>
        <tr>
            <th>Dimension</th>
            <th>Option A</th>
            <th>Option B</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td class="row-label">Cost</td>
            <td>$120M</td>
            <td>$85M</td>
        </tr>
    </tbody>
</table>
```

```css
.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;
    font-size: 0.82rem;
}
.data-table thead th {
    background: var(--primary);
    color: #fff;
    padding: 0.8rem 1rem;
    text-align: left;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.7rem;
}
.data-table tbody td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    color: var(--text-mid);
}
.data-table tbody tr:hover td { background: var(--bg-alt); }
.data-table .row-label {
    font-weight: 700;
    color: var(--primary);
}
```

### 8. Strategy / Scenario Cards Grid

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-5 my-10">
    <div class="strategy-card">
        <p class="card-label">SCENARIO 01</p>
        <h4 class="card-title">Base Case</h4>
        <p class="card-desc">Description of the scenario...</p>
    </div>
    <!-- ×3 -->
</div>
```

```css
.strategy-card {
    border: 1px solid var(--border);
    border-top: 3px solid var(--primary);
    padding: 1.25rem 1.1rem;
    background: #fff;
    transition: background 0.15s;
}
.strategy-card:hover { background: var(--bg-alt); }
.card-label {
    font-size: 0.68rem;
    font-weight: 800;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.5rem;
}
.card-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--primary);
    margin-bottom: 0.5rem;
}
.card-desc {
    font-size: 0.78rem;
    line-height: 1.6;
    color: var(--text-mid);
}
```

### 9. Risk Meter / Progress Bars

```html
<div class="risk-item">
    <div class="risk-header">
        <span class="risk-label">Risk Factor A</span>
        <span class="risk-value">85%</span>
    </div>
    <div class="risk-track">
        <div class="risk-fill" style="width: 85%"></div>
    </div>
</div>
```

```css
.risk-item { margin-bottom: 1rem; }
.risk-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    margin-bottom: 0.4rem;
}
.risk-label {
    font-weight: 700;
    color: var(--text-mid);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}
.risk-value {
    font-weight: 800;
    color: var(--primary);
}
.risk-track {
    height: 4px;
    background: var(--border);
    overflow: hidden;
}
.risk-fill {
    height: 100%;
    background: var(--primary);
}
```

## Narrative Flow Guidelines

The infographic layout is fundamentally about **storytelling**. Each section should
connect to the next with intentional transitions:

1. **Open with the "what"** — What happened? What's the situation?
2. **Explain the "why"** — Root causes, background, contributing factors
3. **Show the "how"** — Mechanisms, processes, timelines
4. **Present the evidence** — Data, expert analysis, comparisons
5. **Assess the impact** — Who is affected? How severely?
6. **Close with the "so what"** — Recommendations, scenarios, calls to action

Use **section bridges** between major parts to maintain narrative momentum. The reader
should feel like they're being guided through a story, not browsing disconnected panels.

## Section Numbering

Use numbered section eyebrow labels for navigation clarity and editorial rhythm:

```html
<p class="text-xs font-bold uppercase tracking-widest mb-3"
   style="color:var(--accent)">SECTION 03 — CONTEXT</p>
<h3 class="text-2xl font-extrabold mb-6" style="color:var(--primary)">
    Section Title
</h3>
```

This helps readers orient themselves in long-scroll content and provides visual anchoring.

## Reference Output

See `infographic-example.html` for a full consulting-grade reference output.
