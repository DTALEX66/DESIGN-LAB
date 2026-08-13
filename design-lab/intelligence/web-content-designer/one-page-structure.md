# One-Page Executive Summary Structure Reference (Layout 3)

The One-Page Summary is a **compact, single-viewport overview** designed to fit on one
screen without scrolling. Think of it as a strategic consultant's briefing slide — dense
with information but visually clean.

## Visual Discipline Rules (MANDATORY)

Regardless of which palette is selected, this layout MUST follow these rules:

- **CSS variables only.** Never use Tailwind color classes like `bg-blue-500`. Always reference palette variables.
- **Border-radius ≤ 0.125rem** (`rounded-sm`). No `rounded-xl`, no pills.
- **Shadow: none or hairline only.** `box-shadow: 0 1px 2px rgba(0,0,0,0.04)` maximum.
- **Icons: inline SVG line icons only.** Never emoji in KPIs, headers, or footer.
- **Charts use monochromatic tints of `--primary` only.**
- **Whitespace over decoration.**

## Critical Constraint

**NO SCROLLBARS.** The entire report must fit within a single viewport (approximately
100vh). This means:
- Every text element must be aggressively condensed
- No component may overflow its container
- No internal scrollbars on any element
- Content that doesn't fit must be cut — not squeezed

This constraint is the defining characteristic of Layout 3. If in doubt, **remove content
rather than let it overflow.**

## Page Architecture

```
┌───────────────────────────────────────────────────────┐
│  HEADER: Title + Eyebrow + Source meta                │
├───────────────────────────────────────────────────────┤
│  EXECUTIVE SUMMARY (2-3 lines max)                    │
├───────────┬───────────┬───────────┬───────────────────┤
│  STAT 1   │  STAT 2   │  STAT 3   │  STAT 4           │
├───────────┴───────────┴───────────┴───────────────────┤
│                       │                               │
│  KEY POINTS           │  DATA VISUALIZATION           │
│  (4 bullet items)     │  (bar chart or doughnut)      │
│                       │                               │
├───────────────────────┴───────────────────────────────┤
│  STRATEGIC RECOMMENDATION (1 sentence)                │
└───────────────────────────────────────────────────────┘
```

## Content Preparation (Before Coding)

You must restructure the source content into these exact slots. This is a **strategic
summarization** exercise — not copy-paste.

### Slot 1: Main Title
The core topic in the fewest possible words. Maximum ~8 words.

### Slot 2: Executive Summary
The entire source condensed into 2-3 short sentences. This should answer:
"What is this about and why does it matter?"

### Slot 3: Stats (×4)
Find the 4 most impactful numbers from the source. Each stat has:
- An uppercase label
- A number + unit (e.g., "$29.6B", "6:3", "145%")
- A sublabel of maximum ~8 words

**Strict rule**: The sublabel must NOT exceed 2 short lines when rendered.
If it's too long, rewrite it shorter. No emoji icons.

### Slot 4: Data Visualization
Find 2-4 comparable data points and create a simple bar chart or doughnut chart.
If no directly chartable data exists, create a representative chart from the source's
main categories or comparisons. Use monochromatic tints of `--primary` only.

### Slot 5: Key Points (×4)
Extract the 4 most important arguments or findings. Format each as:
```
<strong>Keyword:</strong> One-sentence explanation.
```

**Bad example** (too long):
> Physical album sales have been declining, making it strategically crucial to
> diversify revenue streams through concerts, streaming, merchandise, and other
> channels.

**Good example** (concise):
> <strong>Revenue diversification:</strong> Album sales declining; concerts,
> streaming, and merch increasingly critical.

### Slot 6: Strategic Recommendation
One powerful, actionable sentence summarizing the source's ultimate conclusion or
implication.

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Summary</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/Paperlogy/subsets/Paperlogy-dynamic-subset.css"
          type="text/css"/>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* Paste selected palette CSS variables here from design-themes.md */
        :root {
            --primary: #051c2c;
            --accent: #c4a35a;
            --bg: #ffffff;
            --bg-alt: #f5f6f8;
            --border: #d9dce1;
            --text: #1a1a2e;
            --text-mid: #3d4456;
            --text-light: #6b7280;
        }
        html, body {
            height: 100vh;
            overflow: hidden; /* CRITICAL */
            font-family: "Paperlogy", -apple-system, BlinkMacSystemFont,
                         "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            -webkit-font-smoothing: antialiased;
        }
        .summary-grid {
            display: grid;
            grid-template-rows: auto auto auto 1fr auto;
            height: 100vh;
            padding: 1.75rem 2rem;
            gap: 1rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 0.75rem;
        }
        .eyebrow {
            font-size: 0.65rem;
            font-weight: 800;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 0.3rem;
        }
        .header-title {
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--primary);
            line-height: 1.15;
            letter-spacing: -0.02em;
        }
        .header-meta {
            font-size: 0.68rem;
            color: var(--text-light);
            text-align: right;
            white-space: nowrap;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .exec-summary {
            background: var(--bg-alt);
            padding: 0.9rem 1.15rem;
            font-size: 0.82rem;
            line-height: 1.6;
            border-left: 3px solid var(--primary);
            color: var(--text-mid);
        }
        .exec-summary strong { color: var(--text); }
        .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.75rem;
        }
        .kpi-card {
            background: #fff;
            padding: 1rem 1.1rem;
            border: 1px solid var(--border);
            border-top: 3px solid var(--primary);
        }
        .kpi-eyebrow {
            font-size: 0.58rem;
            font-weight: 800;
            color: var(--text-light);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 0.3rem;
        }
        .kpi-number {
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--primary);
            line-height: 1;
            letter-spacing: -0.02em;
        }
        .kpi-label {
            font-size: 0.68rem;
            color: var(--text-light);
            margin-top: 0.35rem;
            line-height: 1.35;
            font-weight: 600;
        }
        .content-area {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            min-height: 0;
        }
        .card {
            background: #fff;
            padding: 1.25rem;
            border: 1px solid var(--border);
            border-top: 3px solid var(--primary);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .card-title {
            font-size: 0.7rem;
            font-weight: 800;
            color: var(--text-light);
            margin-bottom: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .key-point {
            font-size: 0.78rem;
            line-height: 1.5;
            padding: 0.55rem 0;
            border-bottom: 1px solid var(--border);
            color: var(--text-mid);
        }
        .key-point:last-child { border-bottom: none; padding-bottom: 0; }
        .key-point strong { color: var(--primary); font-weight: 800; }
        .chart-wrapper { position: relative; flex: 1; min-height: 0; }
        .footer-bar {
            background: var(--primary);
            color: #fff;
            padding: 0.85rem 1.3rem;
            font-size: 0.82rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            position: relative;
            overflow: hidden;
        }
        .footer-bar::before {
            content: 'RECOMMENDATION';
            font-size: 0.58rem;
            font-weight: 800;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            padding-right: 0.9rem;
            border-right: 1px solid rgba(255,255,255,0.25);
            margin-right: 0.2rem;
        }
        @media (max-width: 768px) {
            html, body { overflow: auto; height: auto; }
            .summary-grid { height: auto !important; }
            .kpi-row { grid-template-columns: repeat(2, 1fr) !important; }
            .content-area { grid-template-columns: 1fr !important; }
        }
    </style>
</head>
<body>
    <div class="summary-grid">
        <!-- HEADER -->
        <div class="header-section">
            <div>
                <p class="eyebrow">Executive Briefing · March 2026</p>
                <h1 class="header-title">{{MAIN_TITLE}}</h1>
            </div>
            <div class="header-meta">
                <div>{{DATE}}</div>
                <div>{{SOURCE}}</div>
            </div>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <div class="exec-summary">
            {{EXECUTIVE_SUMMARY_2_TO_3_LINES}}
        </div>

        <!-- KPI ROW -->
        <div class="kpi-row">
            <div class="kpi-card">
                <p class="kpi-eyebrow">Metric 01</p>
                <p class="kpi-number">{{VALUE}}</p>
                <p class="kpi-label">{{SHORT_LABEL}}</p>
            </div>
            <!-- ×4 -->
        </div>

        <!-- CONTENT AREA: Key Points + Chart -->
        <div class="content-area">
            <div class="card">
                <p class="card-title">Key Points</p>
                <div class="key-point">
                    <strong>Keyword:</strong> One-line summary.
                </div>
                <!-- ×4 -->
            </div>
            <div class="card">
                <p class="card-title">Data Overview</p>
                <div class="chart-wrapper">
                    <canvas id="summaryChart"></canvas>
                </div>
            </div>
        </div>

        <!-- STRATEGIC RECOMMENDATION -->
        <div class="footer-bar">
            <span>{{ONE_SENTENCE_STRATEGIC_RECOMMENDATION}}</span>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const ctx = document.getElementById('summaryChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['A', 'B', 'C', 'D'],
                    datasets: [{
                        data: [42, 28, 18, 12],
                        backgroundColor: [
                            '#051c2c', '#2a4054', '#5a6a7c', '#8a95a0'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.04)' },
                            ticks: { font: { family: 'Paperlogy', size: 10 },
                                     color: '#6b7280' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { font: { family: 'Paperlogy', size: 11,
                                             weight: '600' }, color: '#3d4456' }
                        }
                    }
                }
            });
        }
    });
    </script>
</body>
</html>
```

## Final Verification Checklist

Before delivering the summary, verify:

1. **No scrollbars** — Open the HTML and confirm no scroll appears on a standard
   1920×1080 viewport
2. **No overflow** — No text is clipped, hidden, or bleeding outside card boundaries
3. **No empty space** — Every component contains real content from the source
4. **No long text** — Every label, description, and bullet is aggressively concise
5. **Chart renders** — The Chart.js visualization loads and displays properly
6. **Palette applied** — All colors come from CSS variables, no raw Tailwind color classes
7. **No emoji** — All visual markers are either text or inline SVG
8. **Hairline borders only** — No heavy shadows or rounded corners
9. **Components don't overlap** — Each grid cell stays within its bounds

## Reference Output

See `one-page-example.html` for a full consulting-grade reference output.
