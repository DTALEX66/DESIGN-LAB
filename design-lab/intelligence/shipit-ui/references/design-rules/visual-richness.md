# Design Rule: Visual Richness on Marketing Surfaces

> Marketing surfaces (hero, landing, /about, /pricing, /home) MUST include illustrated SVG art, layered surfaces, and decorative motion. Plain text-and-button UI is forbidden by default.

This is a **default rule** for every marketing surface `shipit-ui-design` produces. To override, the user must explicitly request "minimal", "plain", or "text-only".

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

## The rule

Marketing surfaces look visibly designed. The plugin defaults to rich. Plain output is a failure mode and is graded as such by the rubric (`Visual richness < 4/10` hard-caps the overall score at 80).

## Why

- Users perceive design quality within the first 200 ms. A hero of "headline, subhead, button" reads as a half-finished prototype.
- The plugin already documents — across `rich-ui-patterns`, `svg-illustration`, `motion-design`, and `code-presentation` — every recipe needed for rich output. Plain output happens because Claude does not reach for them by default. This rule fixes that default.
- Rich does not mean cluttered. It means the budget is spent. See "Common mistakes" below for what overdoing it looks like.

## Minimum visual checklist per surface type

| Surface | Required (≥ 1 per row) |
|---|---|
| **Hero** | Illustrated SVG mockup OR ambient mesh gradient with `bg-grid` overlay AND eyebrow pill above headline AND a primary + ghost CTA pair |
| **Feature grid** | Illustrated icons ≥ 48×48 OR layered tinted internal panel above text AND hover lift via `--shadow-md` → `--shadow-lg` |
| **Stat row** | Animated number counter OR decorative shape per stat AND vertical-line dividers via `--color-border` |
| **Step timeline** | Illustrated icon per step inside a tinted-bg circle AND animated connecting rail |
| **Pricing / plan cards** | Gradient border on the featured tier AND eyebrow pill on the page AND consistent state coverage on every CTA |
| **Tag / chip rows** | Mini illustrated icon per chip OR subtle radial gradient bg per chip |
| **Numbered rule cards** | Decorative ringed badge holding the number AND subtle pattern on card edge |
| **Code blocks** | Syntax highlighting via `code-presentation` AND language label AND terminal or editor chrome — never plain `<pre>` |
| **Section transitions** | Alternating `--color-bg` / `--color-surface` (5–8% delta) OR illustrated divider ornament |

If a surface fails its minimum row, it fails this rule.

## The richness budget

No more than **three** advanced patterns active simultaneously on a single screen. A hero with mesh gradient + tilt cards + spotlight cursor + animated border + floating chips reads as a demo, not a product. Pick the three that serve hierarchy and brand; cut the rest.

The budget should be **spent, not banked**. Marketing surfaces that ship with one or zero rich patterns active fail this rule even though they technically respect the budget.

## Recommended approach

1. Read `rich-ui-patterns/SKILL.md` for the pattern catalog and pick three patterns for the surface.
2. Read `svg-illustration/SKILL.md` for the mockup or icon recipes you'll hand-roll.
3. Read `motion-design/SKILL.md` for easings, durations, and reduced-motion handling.
4. Read `code-presentation/SKILL.md` if any code is rendered.
5. Generate. Light + dark from the start. Reduced-motion fallbacks emitted.
6. Self-check: "If I removed every rich pattern from this screen, would it look like a half-finished prototype?" If yes, you have the right baseline. If no, add one more pattern up to the budget cap.

## When to break it

- **Genuine "minimal" requests.** When the user explicitly asks for "minimal", "plain", "text-only", or "no decoration", honor it. Note in the report that you intentionally departed from the default.
- **Dense data dashboards.** In-product surfaces optimized for data density — admin tables, monitoring grids, query builders — relax this rule. Mesh gradients and tilt cards on a dashboard fight the data hierarchy.
- **In-product surfaces under heavy cognitive load.** Settings pages, form-heavy flows, billing detail pages, document editors. Quiet UI helps the user concentrate.
- **Surfaces where the user is the content.** Feeds, profiles with user-supplied photography, document viewers. Decoration would compete with user content.

These exceptions do NOT extend to the marketing pages of those products. A SaaS dashboard's `/login` may be quiet; its `/` (marketing home) must be rich.

## Common mistakes

1. **Banking the budget.** "I'm respecting the 3-pattern budget by using zero patterns" — that's plain, not minimalist.
2. **Richness-by-decoration without function.** Drop-shadows on every card, gradients on every heading, animation on every element. Each pattern must do work — establishing hierarchy, signaling brand, drawing the eye to a CTA, anchoring a section.
3. **Treating rich as a gimmick.** Spotlight cursor on a body-text page, animated borders on every button. Loud patterns are reserved for the page's single primary focus.
4. **Breaking dark-mode parity.** Mesh gradient opacities, illustration colors, and chrome shadows must be re-tuned for dark — never emitted only for light.
5. **Raster mockups.** A hero "mockup" as a `<img src="screenshot.png">` breaks the token-driven, dark-mode-safe contract. Always SVG.
6. **Plain `<pre>` for code.** Even one plain code block on a marketing page caps Visual richness at 0/10 for that surface.

## Token mapping

Every illustration, mockup, gradient, and decorative shape uses tokens — never bare hex. Anchor on:

- **Brand**: `--color-brand-50` through `--color-brand-950`. Eyebrow pill bg at 50, gradient text and primary CTA at 500, gradient border anchor at 400, mesh-gradient orb at 400 (18–25% opacity light, 25–35% dark).
- **Accent**: `--color-accent-50` through `--color-accent-950`. Pulsing eyebrow dot at 400, gradient text endpoint at 400, second mesh-gradient orb at 400.
- **Neutrals**: `--color-bg`, `--color-surface`, `--color-surface-elevated`, `--color-fg`, `--color-fg-subtle`, `--color-border`, `--color-border-subtle`. Section alternation toggles `--color-bg` ↔ `--color-surface`.
- **Shadows**: `--shadow-sm` (default surface), `--shadow-md` (hovered card or elevated panel), `--shadow-lg` (mockup chrome, overlays).
- **Motion**: `--dur-200` / `--dur-300` / `--dur-500`, `--ease-out-quint`. Reduced-motion fallbacks always emitted.

Library decisions for animation libraries, syntax-highlight engines, and SVG generators stay deferred — verify at build time, do not lock new ones.

## Cross-references

- `skills/rich-ui-patterns/SKILL.md` — the pattern catalog. Read first.
- `skills/svg-illustration/SKILL.md` — mockup, icon, and decorative SVG recipes.
- `skills/motion-design/SKILL.md` — float, drift, counter, and reduced-motion patterns.
- `skills/code-presentation/SKILL.md` — syntax highlighting and chrome for code blocks.
- `skills/ui-design-principles/SKILL.md` — the rubric, including the Visual richness category and the < 4/10 → 80 cap.
- `commands/hero.md` — the command that operationalizes this rule for hero sections.
- `commands/component.md` — defaults that route to this rule for marketing components.
- `commands/refine.md` and `commands/audit.md` — where this rule is graded and surfaced.
- `references/design-rules/tinted-neutrals.md` — the neutral foundation rich patterns layer on.
- `references/design-rules/sixty-thirty-ten.md` — color distribution that keeps richness from becoming chaos.
