# AI Product OS — UI/UX · Brand · Prototype

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-8_installed-818cf8.svg)](#installed-skills)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-yellow.svg)](https://buymeacoffee.com/nihalgraphics)

> The complete, repeatable system for designing and shipping premium mobile & web products with AI — from client brief to Figma dev handoff.
>
> Built by a working UI/UX designer. Every file has a job. Nothing is here for decoration.

**[☕ Buy me a coffee](https://buymeacoffee.com/nihalgraphics)** · **[Follow on X](https://x.com/nihalgraphics)** · **[Gumroad](https://nihalgraphics.gumroad.com)**

---

## Directory Structure

```
YourProjectName/
│
├── 📁 .agents/                         ← AI agent configuration
│   └── 📁 skills/                      ← Designer skills (auto-installed)
│       ├── brief-to-tasks/             ← Turns briefs into actionable task lists
│       ├── design-brief/               ← Structured design brief generation
│       ├── design-flow/                ← User flow creation and documentation
│       ├── design-review/              ← Systematic design critique and QA
│       ├── design-tokens/              ← Token system generation and management
│       ├── frontend-design/            ← Frontend implementation from designs
│       ├── grill-me/                   ← Socratic design decision challenger
│       └── information-architecture/   ← IA, navigation, and content structure
│
├── 📁 docs/                            ← All strategy & research documents
│   ├── brief.md                        ← Project brief (Step 1)
│   ├── research.md                     ← Gemini deep research export (Step 2)
│   ├── personas.md                     ← User personas (Step 5)
│   ├── userflows.md                    ← Flow descriptions (Step 6)
│   ├── problem-statements.md           ← HMW statements (Step 7)
│   ├── PRD.md                          ← Product Requirements Doc (Step 12)
│   ├── brand-guidelines.pdf            ← Figma export (Step 10)
│   └── handoff.md                      ← Dev handoff notes (Step 18)
│
├── 📁 assets/                          ← All visual assets
│   ├── 📁 logo/                        ← Logo exports (Step 9)
│   │   ├── logo-wordmark.svg
│   │   ├── logo-wordmark-dark.svg
│   │   ├── logo-icon.svg
│   │   ├── logo-icon@512.png
│   │   └── logo-icon@1024.png
│   └── 📁 images/
│       ├── 📁 sketches/                ← Hand sketches (Step 7)
│       └── 📁 moodboards/              ← Magnific moodboard exports (Step 9)
│
├── 📁 claude-design-export/            ← Claude Design session output (Steps 13–15)
│   ├── 📁 screens/                     ← Screen screenshots, numbered in flow order
│   ├── 📁 code/                        ← Any JSX code Claude Design generated
│   ├── notes.md                        ← Design decisions & rationale
│   └── README.md
│
├── 📁 figma/                           ← Links to Figma files for this project
│   └── README.md                       ← Figma file index with URLs + status
│
│   ── PROTOTYPE ──────────────────────────────────────────────────────────
│
├── index.html                          ← Hub launcher (links to app + figma board)
├── app.html                            ← Interactive prototype entry point
├── figma.html                          ← Static design board (all screens)
├── app.jsx                             ← Router, overlays, bottom nav, mount
├── shared.jsx                          ← Design tokens (T.*) + shared components
├── data.jsx                            ← Mock data (window.DATA)
├── icons.jsx                           ← Ph() icon component
├── screens-onboarding.jsx              ← Onboarding flow screens
├── screens-home.jsx                    ← Core app screens
├── [screens-*.jsx]                     ← Add more as you build
├── styles.css                          ← Global CSS — .layer .scroll .press
│
│   ── DOCS ───────────────────────────────────────────────────────────────
│
├── Design.md                           ← Design token reference (update per project)
├── rules.md                            ← Agent rules for Antigravity/Cursor/Claude
├── WORKFLOW.md                         ← The complete 15-step workflow
├── FIGMA-FILES.md                      ← Guide to Figma files to create
├── .cursorrules                        ← AI UX principles for Cursor/Claude
├── skills-lock.json                    ← Installed skills manifest
└── README.md                           ← This file
```

---

## Installed Skills

Run `npx skills add julianoczkowski/designer-skills` to install these into any new project.

| Skill | What It Does |
|-------|-------------|
| `brief-to-tasks` | Converts a project brief into a structured task list with phases and priorities |
| `design-brief` | Runs a structured discovery session and produces a clean brief document |
| `design-flow` | Creates and documents user flows from personas and feature lists |
| `design-review` | Systematic design critique — checks hierarchy, consistency, accessibility |
| `design-tokens` | Generates and manages the design token system, updates Design.md |
| `frontend-design` | Implements designs in code, referencing Design.md tokens faithfully |
| `grill-me` | Challenges design decisions Socratically — great for stress-testing choices |
| `information-architecture` | Plans IA, navigation structures, and content hierarchy |

---

## The Workflow — 6 Phases, 19 Steps

See **[WORKFLOW.md](WORKFLOW.md)** for the complete guide with prompts, checklists, and time estimates.

| Phase | Steps | Key Output |
|-------|-------|-----------|
| **1. Discovery** | 1–3 | `docs/brief.md`, `docs/research.md` |
| **2. Strategy & UX** | 4–8 | Personas, FigJam flows, HMW statements, skills |
| **3. Brand** | 9–11 | Logo SVGs, `docs/brand-guidelines.pdf`, `Design.md` |
| **4. UI/UX Design** | 12–15 | `docs/PRD.md`, Claude Design screens, export archive |
| **5. Build & Deploy** | 16 | Live prototype on Vercel |
| **6. Figma & Handoff** | 17–19 | Figma file, dev blueprint, invoice |

---

## Figma Files

See **[FIGMA-FILES.md](FIGMA-FILES.md)** for what Figma files to create at each stage and exactly what goes in them.

---

## Quick Start (New Project)

```bash
# 1. Copy this boilerplate to your new project folder
cp -r "AI Boilerplate" "MyNewProject"
cd "MyNewProject"

# 2. Install designer skills
npx skills add julianoczkowski/designer-skills

# 3. Update project name in index.html, app.html, figma.html

# 4. Fill in docs/brief.md

# 5. Open locally
python3 -m http.server 8000
# → http://localhost:8000
```

---

## Stack

- **React 18** via CDN — no Node, no build step
- **Babel Standalone** — JSX in the browser
- **Geist** — Google Fonts
- **Vanilla CSS** — full control, no Tailwind
- Works from any HTTP server or directly from the filesystem

---

## Agent Rules (Quick Reference)

- All globals exposed via `Object.assign(window, { ... })` — no ES module imports
- Every styles object must be **uniquely named** — never `const styles`
- All screen backgrounds: `T.bg` (`#FFFFFF`)
- Card borders: `boxShadow: 'inset 0 0 0 1px ' + T.cardStroke` — no CSS `border`
- Navigate with `api.push('screenName', { params })` / `api.pop()`
- Every new screen → also add to `figma.html` `figmaScreens` array

→ Full rules in **[rules.md](rules.md)**  
→ Design tokens in **[Design.md](Design.md)**
