---
name: ui-design-principles
description: Apply the shipit-ui-design rubric (visual hierarchy, spacing, color/contrast, typography, motion, density, component quality, accessibility) when generating, refining, or auditing UI in .tsx/.jsx/.vue/.svelte files.
type: skill
---

# UI Design Principles

This skill is the rubric used by `/component`, `/refine`, and `/audit`. Score 0–N per category; total to 100. Below 85 means more work.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

## Bundled rules and cheat sheets — read when relevant

These augment the rubric below. Each is a short, authoritative file the skill reads in context:

| File | When to read |
|---|---|
| `references/canonical-tokens.md` | Before generating any code that references tokens — converges naming variants. |
| `references/design-rules/tinted-neutrals.md` | Designing neutrals; defining `--color-bg` / `--color-fg`. |
| `references/design-rules/sixty-thirty-ten.md` | Reviewing color distribution on a page or screen. |
| `references/design-rules/mobile-grid-ios-android.md` | Working in a React Native / Flutter / mobile-web app context. |
| `references/design-rules/learning-resources.md` | User asks for inspiration or examples. |
| `references/spacing-cheat-sheets/desktop-sidebar.md` | Building or refining a desktop sidebar. |

## Rubric weights

| Category | Weight |
|---|---|
| Visual hierarchy | 10 |
| Spacing & rhythm | 15 |
| Color & contrast | 15 |
| Typography | 10 |
| Motion & polish | 10 |
| Density & whitespace | 10 |
| Component quality | 10 |
| Accessibility | 10 |
| Visual richness | 10 |

---

## 1. Visual hierarchy (10)

One primary focal point per surface. Size + weight + color combine to rank elements; never use color alone.

**Good**
```
H1 text-4xl font-semibold  → page title
H2 text-2xl font-medium    → section
body text-base             → content
caption text-sm text-muted → metadata
```

**Bad**
- All headings at the same size, distinguished only by weight.
- Three competing "primary" buttons (filled, brand color, large) on one screen.
- Decorative text larger than content text.

Rules:
- Type ramp must have ≥ 1.2× ratio between adjacent levels.
- Exactly one CTA per primary surface gets the filled brand variant; siblings are ghost/outline.
- Numbers and metrics get tabular-nums and a heavier weight than their label.

---

## 2. Spacing & rhythm (15)

4 px base, exponential scale (`--space-1` = 4, `-2` = 8, `-3` = 12, `-4` = 16, `-6` = 24, `-8` = 32, `-12` = 48, `-16` = 64). Never freehand pixels.

**Good**
```
gap: var(--space-4)
padding: var(--space-6) var(--space-8)
```

**Bad**
```
margin-top: 13px       /* off-grid, no token */
padding: 17px 22px     /* random */
```

Vertical rhythm: every block aligns to a 4 or 8 px line. Form rows have equal vertical gaps; group related controls tighter than unrelated. Section padding scales with viewport (mobile `--space-6`, desktop `--space-12`+).

---

## 3. Color & contrast (15)

WCAG AA minimum (4.5:1 body, 3:1 large/UI). Use the 11-step ramp (50–950). Always emit dark alongside light.

**Good**
```
color: var(--color-fg)
background: var(--color-surface)
border: 1px solid var(--color-border)
```

**Bad**
```
color: #444;                      /* bare hex, no token */
background: rgba(0,0,0,0.5);      /* magic alpha */
color: gray;                      /* CSS named color */
```

Rules:
- Body text on background: contrast ≥ 4.5:1 in both light and dark.
- Brand color used sparingly (CTAs, active state, links) — not as a wash.
- Borders: use `--color-border` (typically step 200 light / 800 dark), not literal `#e5e7eb`.
- Disabled state reduces opacity OR shifts to a muted token, never both.

---

## 4. Typography (10)

Default scale: perfect-fourth (1.250). Pair at most two families (one display, one text). Line-height shrinks as size grows: body 1.5–1.6, headings 1.1–1.25. Measure (line length) 45–75 ch for body copy.

**Good**
```
font: var(--font-sans)
font-size: var(--text-base)
line-height: var(--leading-relaxed)
max-width: 65ch
```

**Bad**
- `line-height: 1.0` on a heading.
- Body text at 13 px (too small) or 20 px (too large).
- Text spans the full viewport width on desktop with no max-width.

Tabular numerals for tables and metrics. Trim widow lines on display headings (`text-wrap: balance`).

---

## 5. Motion & polish (10)

See the `motion-design` skill for the full ladder. At minimum:

**Good**
```
transition: transform var(--dur-200) var(--ease-out-quint);
@media (prefers-reduced-motion: reduce) { transition: none; }
```

**Bad**
```
transition: all 0.5s ease;        /* "all" + arbitrary 0.5s + default ease */
animation: bounce infinite;        /* perpetual motion, no reduced-motion guard */
```

Polish checks:
- Hover: subtle scale (1.02), translate (-1 to -2 px), or shadow lift — pick one.
- Active: 1 px translate down or 0.98 scale; revert on release.
- Focus-visible: 2 px ring at `--color-ring`, offset 2 px, never removed without replacement.
- Disabled: cursor-not-allowed, no hover transform.

---

## 6. Density & whitespace (10)

Match density to surface. Marketing/hero: airy. Dashboards/tables: compact. Forms: medium.

**Good**
- Card padding `--space-6` on desktop, `--space-4` on mobile.
- Table rows 40–48 px on desktop, comfortable variant 56 px.
- Hero section vertical padding `--space-16` to `--space-24`.

**Bad**
- A dashboard with marketing-page padding (cramped data after first card).
- A landing page with dashboard density (data-feel where breathing is wanted).
- Equal padding on every container regardless of content type.

Never let a card touch a viewport edge on desktop — use a `Container` with max-width and outer padding.

---

## 7. Component quality (10)

Every component covers loading, empty, error, success — visibly designed, not just absent. Affordance must be obvious without a tooltip.

**Good**
- Button: filled variant only for primary CTAs; ghost/outline for secondary; icon-only buttons have `aria-label` and visible focus ring.
- Input: visible label, helper text slot, error slot below, leading/trailing slot, clear-on-error semantics.
- Card: hover lift only when card is clickable; static cards do not animate.
- Empty states: icon + title + one-sentence body + action.

**Bad**
- "Click here" links with no underline and no hover hint.
- Loading spinner with no skeleton on first paint (layout jump).
- Errors shown as red border alone with no message.
- Disabled buttons that visually look enabled.

State coverage table per component:
```
default | hover | active | focus-visible | disabled | loading | error
```

---

## 8. Accessibility (10)

Semantic HTML before ARIA. Visible focus ring on every interactive element. Keyboard reachable in document order. Color is never the sole channel.

**Good**
```
<button type="button" aria-pressed={isOn}>…</button>
<nav aria-label="Primary">…</nav>
<img src="…" alt="Quarterly revenue chart, Q3 highest" />
<svg aria-hidden="true">…</svg>   /* decorative */
```

**Bad**
```
<div onClick={…}>Save</div>                /* not a button */
<a href="#" onClick={…}>…</a>              /* fake link */
<img src="logo.svg" />                      /* missing alt */
outline: none                               /* removes focus, no replacement */
```

Checks:
- Tab order matches visual order. No `tabindex` > 0.
- Form inputs have an associated `<label>` (not just placeholder).
- Live regions (`aria-live="polite"`) for async results.
- Modals trap focus and restore on close.
- Skip-link to main on every page.

---

## 9. Visual richness (10)

Marketing UI must look visibly designed. Plain output — text, button, nothing else — is a failure mode of this rubric. This category exists to penalize that failure directly.

The 9 patterns in `rich-ui-patterns/SKILL.md` are the default vocabulary. The 3-simultaneous-pattern budget still applies; the goal is to spend the budget, not bank it.

**Good**

- Hero with a tokenized SVG mockup (dashboard / product / document / terminal), three orbiting chips with stagger-offset float, ambient mesh gradient anchored on `--color-brand-400` and `--color-accent-400`.
- Feature cards with illustrated icons ≥ 48×48, a tinted internal panel above the text, hover lift via `--shadow-md` → `--shadow-lg`.
- Code blocks with syntax highlighting, language label, terminal or editor chrome, copy button — emitted via the `code-presentation` skill.
- Stat row with animated counters (Intl.NumberFormat, viewport-entry trigger, reduced-motion fallback) and a small decorative shape per stat.
- Section transitions using alternating `--color-bg` / `--color-surface` (5–8% delta) or an illustrated divider ornament.

**Bad**

- Hero with only headline + subhead + button + nothing — no mockup, no gradient, no chips. **0/10.**
- Feature cards using 24×24 monochrome glyph icons on a white card with a 1 px border. **4/10 cap.**
- Stat row showing bare numbers with no decoration, no counter animation. **5/10 cap.**
- Code block as plain `<pre>` with no language label, no chrome, no syntax color. **0/10 on any visible code.**
- Long marketing scroll with no section background alternation, no ornament, no illustrated divider. **5/10 cap.**

**Score cap rule.** When Visual richness scores < 4/10, the OVERALL rubric score is hard-capped at **80**, regardless of how well the page does on the other eight categories. Plain marketing UI cannot pass the bar. Surface this in `/refine` and `/audit` reports and link to `rich-ui-patterns`, `svg-illustration`, and `code-presentation`.

---

## Scoring shorthand

When critiquing screenshots, write findings as `category: -N (reason)`; sum deductions from 100. A category cannot deduct more than its weight.

---

## Modern visual richness

The default rubric scores correctness. This section adds patterns the rubric should reward when richness is the goal — marketing pages, landing heroes, showcase pages, anything that should feel designed rather than utilitarian. Apply selectively: see `rich-ui-patterns/SKILL.md` for the full catalog and the "no more than three at once" budget.

**Layered surfaces.** Stack `--color-bg` → `--color-surface` → `--color-surface-elevated` → `--color-surface-overlay`, each with `--shadow-sm` / `-md` / `-lg`. Use when pages feel flat. Avoid when the surface is data-dense — shadows multiply visual noise on tables.

**Ambient mesh gradients.** Three large blurred radial gradients (`--color-brand-400`, `--color-accent-400`, `--color-brand-300`) at 18–25% opacity behind hero content. Pair with a `bg-grid` overlay (1 px lines, 4–6% opacity) for a designed feel. Never behind body copy — kills legibility.

**Glassmorphism done right.** Overlays only — sticky nav, command palette, sheet. `backdrop-filter: blur(24px) saturate(180%)`; `background: color-mix(in oklch, var(--color-surface) 70%, transparent)`. Test contrast against the busiest content the overlay can sit on. Avoid on cards inside body content.

**Browser/device mockups.** When showing UI inside marketing or showcase blocks, frame in a chrome (rounded corners, traffic lights or notch, soft `--shadow-lg`). Single SVG component drawing chrome plus the mock content inside. Avoid for live UI in-product — the chrome reads as "image of UI."

**Animated number counters.** For stats sections, count from 0 to target on viewport entry. Use sparingly: one stats row per page. Avoid when the number is currency or a precise date — the count animation reads as imprecise.

**Section background alternation.** Alternate `--color-bg` and `--color-surface` per section to create rhythm without dividers. Keep the contrast subtle (5–8% delta, not card-on-page strong). Avoid on dashboards — the bands fight the data hierarchy.

**Tilt cards.** Showcase grids of feature cards or testimonials. Gate on `(pointer: fine)`; coarse-pointer fallback is no tilt. Avoid on long lists (8+ items) — the effect becomes nausea-inducing as the user scans.

**Gradient borders.** `border: 1px solid transparent; background: linear-gradient(var(--color-surface), var(--color-surface)) padding-box, linear-gradient(135deg, var(--color-brand-400), var(--color-accent-400)) border-box`. Reserve for the page's most important feature card or CTA. Avoid on every card — loses meaning.

**Floating chips / badges.** Small absolutely-positioned cards orbiting a hero illustration, each with a stagger-offset float (4–6 px y oscillation, 6–10 s duration). Reduced-motion: static. Avoid on cluttered hero compositions; the chips need negative space to breathe.

**Spotlight cursor.** Large radial gradient (300–400 px) following the cursor at low opacity (8–12%). Dark hero sections only — invisible on light backgrounds. Avoid in-product — feels like marketing intrusion.

**Underline text effects.** `background-image: linear-gradient(to right, var(--color-brand-500), var(--color-brand-500)); background-size: 0 2px; background-position: 0 100%; background-repeat: no-repeat; transition: background-size var(--dur-300) var(--ease-out-quint)`. Hover brings to `100% 2px`. Use on inline links inside long-form content. Avoid on nav — too subtle to communicate active state.

**Section eyebrow pills.** Above section titles: a small pill with `--color-brand-50` background, `--color-brand-700` text, optional pulsing `--color-accent-400` dot. Establishes hierarchy and brand feel. Avoid more than one eyebrow style per page; consistency is the point.

The rubric should add up to +10 bonus across these patterns when they're applied with restraint, and deduct when overused (every section has a mesh gradient + a tilt grid + an animated border = the page feels like a demo, not a product).
