---
name: code-presentation
description: Apply senior code-presentation patterns — terminal-style chrome, token-driven syntax highlighting, copy buttons, line numbers, line highlighting, language labels — to every code block Claude generates in UI (docs sites, developer marketing pages, READMEs, changelogs, MDX, dashboards with snippets). Auto-activates when generating components named CodeBlock / Snippet / CodeSample / Pre, when editing files matching *.mdx, or when the task mentions "syntax highlighting", "code sample", "developer", "docs".
type: skill
---

# Code Presentation

Code blocks are the most-photographed surface on a developer site. They appear in install steps, tutorial source, README excerpts, changelogs, FAQ answers, and dashboard help panels. A default browser `<pre>` makes the rest of the design feel cheap. This skill is the rubric for rendering them so they read as deliberate craft and stay coherent with the project's tokens.

## Constitution (verbatim — applies to every artifact)

> 1. Max 300 lines per file. If a generated component would exceed, split before writing.
> 2. No hardcoded design values. Colors, spacing, radii, shadows, durations, easings — all from tokens.
> 3. Every interactive element has hover, active, focus-visible, and disabled states.
> 4. All motion respects `prefers-reduced-motion`.
> 5. Every image / illustration has alt text or `aria-hidden` if decorative.
> 6. Dark mode is never an afterthought — emitted alongside light from the start.
> 7. Stack-respect: never introduce a new framework or styling system; adapt to what's there.

## Bundled references — read when relevant

| File | When to read |
|---|---|
| `references/code-presentation/syntax-tokens.md` | Before mapping any syntax color — gives the canonical token per token-type, per language. |
| `references/code-presentation/codeblock-recipe.md` | Before generating or refactoring a `<CodeBlock>` component — props, anatomy, library decision, test cases. |
| `references/canonical-tokens.md` | Whenever a token name is uncertain — converges naming variants. |
| `web/components/primitives/CodeBlock.tsx` | The production reference implementation already shipped on the plugin's landing page. Treat as the visual ground truth. |

---

## 1. The default code-block anatomy

Every generated CodeBlock starts from the same skeleton — the only difference between a marketing snippet and a docs snippet is the chrome variant.

- **Outer card**: `border-radius: var(--radius-xl)`, `background: var(--color-surface-elevated)`, `border: 1px solid var(--color-border)`, optional `box-shadow: var(--shadow-sm)` on hover. The card clips overflow so the chrome bar's bottom border meets the body cleanly.
- **Chrome bar**: 36 px tall, `background: var(--color-surface)`, `border-bottom: 1px solid var(--color-border-subtle)`. Holds traffic-light dots (left), language label (right), copy button (far right).
- **Traffic-light dots**: three 12 px circles, `gap: var(--space-2)`, colors `--color-accent-500 / --color-accent-400 / --color-brand-400` (or `--color-danger / --color-warning / --color-success` if the project ships state colors and prefers literal traffic-light semantics). `aria-hidden="true"` — purely decorative.
- **Language label**: `font-family: var(--font-mono)`, `font-size: var(--text-2xs)`, `color: var(--color-fg-subtle)`, `text-transform: uppercase`, `letter-spacing: 0.08em`. Right-aligned just before the copy button.
- **Copy button**: ghost variant. See section 6.
- **Body**: `<pre>` with `padding: var(--space-5) var(--space-6)`, `font-family: var(--font-mono)`, `font-size: var(--text-sm)`, `line-height: 1.6`, `color: var(--color-fg)`. Horizontal overflow scrolls; vertical never scrolls (prefer multiple shorter blocks over a scrolling tower).
- **Caption** (optional): rendered as a `<figcaption>` *above* the card, `font-mono`, `--text-xs`, `--color-fg-subtle`, `margin-bottom: var(--space-2)`. Used for filenames in terminal chrome and for short prose like "After the migration".

The whole assembly is wrapped in `<figure>` so screen readers can announce caption + code as one unit.

---

## 2. Token-driven syntax colors

The principle that separates a polished CodeBlock from an off-the-shelf one: **every highlight color is a project token**. Never import a stock theme like `prism-tomorrow.css`, `github-dark.css`, or Shiki's bundled `nord` — these ship their own neutrals, their own brand hue, and their own contrast budget, and they will clash with the project's palette in dark mode and on color-tinted surfaces.

Map each token-type (`keyword`, `string`, `number`, `function-call`, `type`, …) to a CSS variable in the project's existing scale. Keywords go on `--color-brand-400`, strings on `--color-accent-300`, comments on `--color-fg-muted`, punctuation on `--color-fg`. The full mapping for every token-type and every supported language lives in `references/code-presentation/syntax-tokens.md` — read it before authoring or auditing any tokenizer.

When the project ships only a brand ramp (no accent), collapse strings onto a desaturated step of brand (`--color-brand-200`) and keep numbers on `--color-fg`. The hierarchy must survive collapse.

---

## 3. Highlighter library — three options, "verify at build time"

Pick one based on the project's surface area, bundle budget, and SSR target. Do not pre-decide; ask the user or check the project before installing.

- **Hand-rolled tokenizer** — zero deps, ~250 lines, SSR-safe, full control over token classes. Best when the surface is small (3–6 languages, install steps + a few tutorials) and bundle is tight. The plugin's own `web/components/primitives/CodeBlock.tsx` is this option, in production, and is the canonical reference.
- **Shiki** — TextMate grammars, VSCode-grade fidelity, dual-theme support out of the box. Best when the project needs 20+ languages or when accuracy on niche syntax (Rust lifetimes, JSX expressions inside template literals) matters. SSR-render via `getHighlighter` at build time; never client-render — the WASM payload is too heavy for a marketing page. Provide a custom theme that maps Shiki's scope names onto the project's CSS variables (recipe in `codeblock-recipe.md`).
- **Prism** — small runtime, large plugin ecosystem. Best when the surface is highly dynamic (user-pasted code in a docs sandbox) and bundle is moderate. Caveat: Prism's themes are global CSS overrides keyed off `.token.keyword`, `.token.string`, etc. — fully tokenizing requires a CSS file that overrides every Prism class onto `var(--color-*)`. Worth the effort once; never inline-styling per-element.

Selection criteria, in priority order: language count → bundle budget → theme control → SSR target. **Verify at build time** which library the host project already uses (`grep -E "shiki|prismjs|highlight\\.js" package.json`); if one is present, adopt it rather than installing a second.

---

## 4. Chrome variants — three appropriate choices

Pick the chrome that matches the *content*, not the page.

- **Terminal** (default) — three traffic-light dots on the left, language label on the right. Use for shell snippets, install scripts, REPL transcripts, anything the reader will paste into a terminal. The dots are a learned visual cue: "this is code I run, not code I read."
- **Editor** — file-tab-like header with a filename pill (left) and a tiny file-type icon colored per language (TS blue, CSS pink, JSON yellow — all token-driven via `--color-info`, `--color-accent`, `--color-warning`). Use for source code in tutorials where the file's location matters as much as its content. Replaces the dots; keeps the language label.
- **Plain** — no chrome bar. Just the body, with a soft border and the same padding. Use when the block is *inside* another card that already provides chrome (FAQ answers, blog posts, doc callouts). Stacking chrome on chrome reads as visual noise.

Prefer terminal for marketing surfaces, editor for tutorials, plain for prose.

---

## 5. Copy button rules

Always present unless the consumer passes `copy={false}` (e.g., the block shows output, not an instruction). The copy button is a **first-class interactive element** and gets the full constitution rule 3 treatment.

- **Rest**: ghost — transparent background, `--color-fg-muted` text, 1 px `--color-border-subtle` border, `--radius-md`.
- **Hover**: text shifts to `--color-fg`, background to `--color-surface-elevated`. Transition: `--dur-150 var(--ease-out)`.
- **Active**: `transform: scale(0.97)`, snaps back on release.
- **Focus-visible**: 2 px ring at `--color-ring`, offset 2 px. Never removed.
- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`. Used when the code is empty or clipboard is unavailable.
- **Copied** (1500 ms confirmation): icon swaps to a checkmark, label swaps to "Copied", text and border shift to `--color-brand`. After 1500 ms, revert.

Feedback rules: `aria-label` updates with state ("Copy code" → "Copied to clipboard"). Reduced-motion users get an instant revert (no fade). Always feature-detect: `if (!navigator.clipboard) return;` — never throw on browsers without the API.

---

## 6. Line numbers — opt-in only

Line numbers are noise on a 4-line install snippet and clarity on a 30-line tutorial. Default off. When `showLineNumbers` is on:

- Render in a left gutter, fixed width `2.25rem`.
- `font-size: var(--text-xs)`, `color: var(--color-fg-subtle)`, `text-align: right`, `padding-right: var(--space-3)`.
- `user-select: none` — copying the block must yield clean code without `1 2 3` prefixes. This is the most common copy-button regression; test it every time.
- Numbers are `aria-hidden="true"` — they're presentational, the code itself is the content.

---

## 7. Line highlighting — opt-in

Used to call attention to the line being explained in surrounding prose. Each highlighted line gets a 2 px left border in `--color-brand-500` and a soft background tint:

```
background: color-mix(in oklab, var(--color-brand-50) 40%, transparent);
border-left: 2 px solid var(--color-brand-500);
```

The tint must be subtle enough that surrounding lines remain readable; `color-mix` with 40 % alpha against the surface is the calibrated value. In dark mode, swap to `--color-brand-900` at 60 %. Useful for tutorials, changelogs ("look at this line"), and code reviews.

---

## 8. Diff blocks

When showing before-and-after, prefer **two side-by-side terminal blocks** (each labeled with a small status dot — `--color-danger` for "before", `--color-brand` or `--color-success` for "after") over inline `+` / `-` markers. Inline diff markers fight the syntax colors and ruin the copy-paste experience. The plugin's own landing page `CodeExample` section is the visual reference for this layout.

Side-by-side reads at a glance; inline reads as a puzzle.

---

## 9. Accessibility

- The `<pre>` carries `role="region"` and `aria-label={caption ?? "Code sample"}`. This makes the block navigable as a landmark for screen-reader users.
- All decorative chrome — traffic-light dots, copy icon, language label — is `aria-hidden="true"`. The label is redundant with the `language` prop on the `<code class="language-tsx">`, which assistive tech can announce.
- Keyboard: the copy button must be reachable via Tab in document order. Activate via Enter or Space. No `tabindex > 0`. No keyboard traps.
- Color contrast: every token-type-to-token mapping must hit WCAG AA on both `--color-surface-elevated` (the card) and any tinted highlight background. Test in light *and* dark.
- Reduced motion: the "Copied" pulse is instant under `prefers-reduced-motion: reduce` — text swap only, no transition.

---

## 10. When to use what — decision matrix

| Scenario | Chrome | Line numbers | Line highlight | Copy |
|---|---|---|---|---|
| Install command (`npm i …`) | Terminal | off | off | on |
| Plugin installer (`/plugin marketplace add …`) | Terminal | off | off | on |
| Source-code tutorial | Editor | on | on (current line) | on |
| FAQ answer snippet | Plain | off | off | off |
| Diff comparison | Terminal × 2 side-by-side | off | off | on |
| Output / log excerpt | Terminal | off | off | off |
| Changelog "what changed" | Plain | on | on (changed lines) | off |

---

## 11. Anti-patterns

- Default browser `<pre>` styling — Times New Roman or Menlo against a white box, no padding, no border. The single biggest tell of an unfinished docs page.
- Dark-on-dark with no contrast — `#1a1a1a` text on `#0a0a0a` background because the developer copied a "hacker" theme.
- Line numbers selectable with the code — copying yields `1 npm install …` instead of `npm install …`.
- Copy button that throws on `navigator.clipboard` being undefined (Safari in insecure contexts, older browsers). Always feature-detect.
- Importing a stock highlighter theme (`prism-tomorrow.css`, `github-dark.css`) and ignoring the project's tokens. The block will be the only element on the page that doesn't track the user's brand color.
- Wrapping the block in a card with its own chrome — the editor chrome inside a tutorial card inside a panel is three nested chromes. Pick one.
- Vertical scroll inside the block — almost always a sign the block is too long; split it into two captioned blocks instead.

---

## Cross-references

- `references/code-presentation/syntax-tokens.md` — full color map, every token-type, every language.
- `references/code-presentation/codeblock-recipe.md` — props contract, anatomy diagram, library recipes, test cases.
- `references/code-presentation/index.md` — the catalog of this folder.
- `web/components/primitives/CodeBlock.tsx` — the production reference implementation.
- `references/canonical-tokens.md` — token name conventions when in doubt.
