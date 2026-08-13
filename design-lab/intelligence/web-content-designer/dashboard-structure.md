# Dashboard Structure Reference (Layout 1)

The Interactive Dashboard uses a **fixed sidebar navigation** with scrollable main content. 
The sidebar remains visible at all times on desktop, providing instant access to any section.

## Visual Discipline Rules (MANDATORY)

Regardless of which palette is selected, this layout MUST follow these rules:

- **CSS variables only.** Never use Tailwind color classes like `bg-blue-500` or `text-red-600`. Always reference palette variables via `style="color:var(--primary)"` or custom classes.
- **Border-radius ≤ 0.125rem** (`rounded-sm`). Never `rounded-xl` or larger on cards, buttons, or containers.
- **Shadow ≤ `0 1px 2px rgba(0,0,0,0.04)`**. Never `shadow-lg` or heavier. Most cards should use hairline borders instead of shadows.
- **Icons: inline SVG line icons only.** Never emoji for KPI icons, section icons, or navigation.
- **Charts use monochromatic tints of `--primary` only.** Never introduce `--accent` or off-palette colors into charts.
- **Every section starts with an eyebrow label** — a small uppercase tracking-widest text (e.g., `SECTION 01 — OVERVIEW`) above the heading.
- **Whitespace over decoration.** When in doubt, add whitespace, not color.

## Page Architecture

```
┌──────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────┐ │
│ │          │ │  Sticky Header Bar          │ │
│ │ SIDEBAR  │ ├─────────────────────────────┤ │
│ │ (fixed)  │ │                             │ │
│ │          │ │  Hero / Summary Banner      │ │
│ │ • Nav 1  │ │                             │ │
│ │ • Nav 2  │ ├─────────────────────────────┤ │
│ │ • Nav 3  │ │                             │ │
│ │ • Nav 4  │ │  KPI Cards Row              │ │
│ │ • Nav 5  │ │  [KPI] [KPI] [KPI] [KPI]   │ │
│ │          │ ├─────────────────────────────┤ │
│ │          │ │                             │ │
│ │          │ │  Content Section 1          │ │
│ │          │ │  (charts, tables, prose)    │ │
│ │          │ │                             │ │
│ │          │ ├─────────────────────────────┤ │
│ │          │ │  Content Section 2          │ │
│ │          │ │  ...                        │ │
│ └──────────┘ └─────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## HTML Structure

```html
<body class="flex h-screen overflow-hidden">

    <!-- Mobile Menu Button (visible on small screens) -->
    <div class="md:hidden fixed top-3 left-3 z-50">
        <button id="mobile-menu-button" class="p-2 bg-white border shadow-sm"
                style="border-color:var(--border)">
            <svg width="20" height="20" fill="none" stroke="var(--primary)"
                 stroke-width="2.5"><path d="M3 5h14M3 10h14M3 15h14"/></svg>
        </button>
    </div>

    <!-- Fixed Sidebar Navigation -->
    <nav id="sidebar" class="w-60 flex-shrink-0 h-full overflow-y-auto
         transform -translate-x-full md:translate-x-0 transition-transform duration-300
         fixed md:relative z-40" style="background:var(--primary)">
        <div class="p-5">
            <div class="mb-6 pb-5" style="border-bottom:1px solid rgba(255,255,255,0.1)">
                <p class="text-xs font-bold uppercase tracking-widest mb-2"
                   style="color:var(--accent)">Report Series</p>
                <h1 class="text-white text-sm font-bold leading-snug">
                    Title<br>Subtitle
                </h1>
                <p class="text-xs mt-2" style="color:rgba(255,255,255,0.4)">
                    Source · Date
                </p>
            </div>
            <ul id="main-nav" class="space-y-0.5">
                <li><a href="#s1" class="sidebar-link block py-2 px-3 active">01 — Section 1</a></li>
                <li><a href="#s2" class="sidebar-link block py-2 px-3">02 — Section 2</a></li>
                <!-- ... more nav items -->
            </ul>
        </div>
    </nav>

    <!-- Scrollable Main Content -->
    <main class="flex-1 h-full overflow-y-auto relative scroll-smooth bg-white">
        <!-- Sticky Header -->
        <header class="sticky top-0 z-10 bg-white border-b"
                style="border-color:var(--border)">
            <div class="px-8 py-3 flex justify-between items-center ml-10 md:ml-0">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold uppercase tracking-widest"
                          style="color:var(--text-light)">Briefing</span>
                    <span style="color:var(--border)">|</span>
                    <span class="text-xs" style="color:var(--text-light)">Subtitle</span>
                </div>
                <span class="text-xs font-bold" style="color:var(--text-light)">2026</span>
            </div>
        </header>

        <!-- Content Container -->
        <div class="px-8 py-8 space-y-10 max-w-5xl mx-auto pb-20">
            <!-- Hero, KPIs, Featured Banner, Sections -->
        </div>
    </main>
</body>
```

## Key Components

### 1. Sidebar Navigation

The sidebar is the defining feature of this layout. It must:
- Stay **fixed** on desktop (always visible while content scrolls)
- **Collapse off-screen** on mobile with a hamburger toggle
- Show an **active state** on the current section (scroll-spy)
- Use `--primary` as its background (dark), with white text

**Sidebar link CSS:**
```css
.sidebar-link {
    transition: all 0.15s;
    font-size: 0.82rem;
    color: rgba(255,255,255,0.6);
    border-left: 3px solid transparent;
    letter-spacing: 0.01em;
}
.sidebar-link:hover {
    color: #fff;
    background: rgba(255,255,255,0.06);
}
.sidebar-link.active {
    color: #fff;
    font-weight: 700;
    background: rgba(255,255,255,0.08);
    border-left-color: var(--accent);
}
```

Nav items should be numbered (`01 — Section Name`) for visual anchoring.

### 2. Hero / Executive Summary

A bold opening block. No background, no box — just typography.

```html
<div>
    <p class="text-xs font-bold uppercase tracking-widest mb-4"
       style="color:var(--text-light)">Executive Summary</p>
    <h2 class="text-2xl md:text-3xl font-extrabold leading-tight mb-4"
        style="color:var(--primary)">
        Headline in two lines max.<br>Restrained and declarative.
    </h2>
    <p class="sub-text max-w-3xl mb-5">
        2-3 sentence overview that frames what follows...
    </p>
</div>

<hr class="divider">
```

Where `.sub-text` is:
```css
.sub-text { font-size: 0.82rem; line-height: 1.7; color: var(--text-mid); }
.sub-text strong { color: var(--text); }
.divider { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
```

### 3. KPI Cards Row (Stat Cards)

Flat, bordered, center-aligned, no icons, no shadows:

```html
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="stat-card">
        <p class="stat-val">17%</p>
        <p class="stat-label">Concept understanding<br>decline in AI group</p>
    </div>
    <!-- ... ×4 -->
</div>
```

```css
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
```

### 4. Featured Banner (use at most ONCE per report)

A single dark banner for the key thesis / headline insight:

```html
<div class="featured-banner relative z-10">
    <p class="text-xs font-bold uppercase tracking-widest mb-2"
       style="color:var(--accent)">Key Thesis</p>
    <p class="text-base md:text-lg font-bold leading-relaxed">
        Core argument in one or two sentences...
    </p>
    <p class="text-xs mt-3" style="color:rgba(255,255,255,0.5)">— Source attribution</p>
</div>
```

```css
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
    top: 0; right: 0;
    width: 120px; height: 100%;
    background: var(--accent);
    opacity: 0.12;
    transform: skewX(-12deg) translateX(40px);
}
```

### 5. Content Sections

Each section corresponds to a sidebar nav item:

```html
<section id="s1" class="content-section">
    <h3 class="s-title">
        <span class="num">01</span>Section Title
    </h3>
    <!-- Content: prose, charts, insight boxes, tables -->
</section>

<hr class="divider">
```

```css
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
    width: 24px; height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
```

### 6. Insight Boxes

Bordered, flat boxes for grouped content:

```html
<div class="insight-box">
    <p class="text-xs font-bold uppercase tracking-wider mb-3"
       style="color:var(--text-light)">Label</p>
    <ul class="space-y-2 text-xs list-none" style="color:var(--text-mid)">
        <li><strong>Keyword:</strong> Explanation...</li>
    </ul>
</div>
```

```css
.insight-box {
    border: 1px solid var(--border);
    border-top: 3px solid var(--primary);
    padding: 1.25rem;
    background: #fff;
}
.insight-box.accent-top { border-top-color: var(--accent); }
```

Use `.accent-top` at most 1-2 times per page for the most important insights.

### 7. Pull Quotes

```html
<div class="pull-quote">
    "Key insight or source quote, italic, bordered..."
</div>
```

```css
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
```

### 8. Charts (Chart.js)

Place charts inside fixed-height containers:

```html
<div class="chart-container">
    <canvas id="myChart"></canvas>
</div>
```

```css
.chart-container { position: relative; height: 270px; }
```

Initialize with **monochromatic tints of `--primary` only** — never use the accent or off-palette colors:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('myChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['A', 'B', 'C', 'D', 'E'],
                datasets: [{
                    data: [40, 28, 22, 18, 12],
                    backgroundColor: [
                        '#051c2c', '#1a3a54', '#315676', '#507995', '#7099b4'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#051c2c',
                        titleFont: { family: 'Paperlogy', size: 12 },
                        bodyFont: { family: 'Paperlogy', size: 11 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Paperlogy', size: 10 },
                                 color: '#6b7280' }
                    },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: { font: { family: 'Paperlogy', size: 10 },
                                 color: '#6b7280' }
                    }
                }
            }
        });
    }
});
```

## Required JavaScript

### Scroll-Spy for Active Navigation

```javascript
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.sidebar-link');
    const mainContent = document.querySelector('main');
    
    if (mainContent && sections.length && navLinks.length) {
        mainContent.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - mainContent.offsetTop;
                if (mainContent.scrollTop >= sectionTop - 150) {
                    current = section.getAttribute('id');
                }
            });
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });
    }
});
```

### Mobile Menu Toggle

```javascript
const menuButton = document.getElementById('mobile-menu-button');
const sidebar = document.getElementById('sidebar');
if (menuButton && sidebar) {
    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
    });
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    });
}
```

## Content Organization Guidelines

When analyzing source content for dashboard sections, aim for **5-8 sections** maximum. 
Group related topics rather than creating one section per paragraph.

**Good section breakdown:**
- 01 — Overview / Executive Summary
- 02 — Key Data & Metrics
- 03 — Core Argument
- 04 — Supporting Evidence
- 05 — Impact / Implications
- 06 — Recommendations / Outlook

**Avoid:**
- More than 10 sidebar items (overwhelming)
- Fewer than 3 sections (not enough to justify a dashboard)
- Sections with only 1-2 sentences (merge with adjacent sections)

## Reference Output

See `dashboard-example.html` for a full consulting-grade reference output in Consulting Navy palette.
