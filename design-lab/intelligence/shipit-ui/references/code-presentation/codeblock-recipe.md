# CodeBlock Recipe

Copy-pasteable reference for the canonical `<CodeBlock>` component. The production implementation lives at `web/components/primitives/CodeBlock.tsx` (~290 lines, zero dependencies, SSR-safe) — treat it as the visual ground truth.

## Anatomy diagram

```
┌─ figcaption (optional, --text-xs --color-fg-subtle, mono) ─────┐
│ src/components/Button.tsx                                       │
└─────────────────────────────────────────────────────────────────┘
┌─ outer card  rounded-xl  --color-surface-elevated  1px border ─┐
│ ┌─ chrome bar  36px  --color-surface  1px border-bottom ─────┐ │
│ │ ● ● ●          [filename / spacer]      TSX     [Copy]     │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌─ <pre>  --space-5 / --space-6  --text-sm  line-height 1.6 ─┐ │
│ │  1 │ import * as React from "react";                       │ │
│ │  2 │                                                       │ │
│ │  3 │ export function Button() { … }      ← highlighted     │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Props contract

```ts
type Language =
  | "tsx" | "jsx" | "ts" | "js"
  | "bash" | "shell"
  | "css" | "html" | "json" | "md" | "text";

type CodeBlockProps = {
  code: string;
  language: Language;
  caption?: string;                 // figcaption above the card
  chrome?: "terminal" | "editor" | "plain";  // default "terminal"
  showCopy?: boolean;               // default true
  showLineNumbers?: boolean;        // default false
  highlightLines?: number[];        // 1-indexed line numbers
  fileName?: string;                // for chrome="editor"
  className?: string;
};
```

The `language` prop is required so the rendered `<code>` element gets `class="language-{x}"` — assistive tech and crawler tools rely on it. `chrome` defaults to `"terminal"` because terminal is the most-photographed case (install steps, marketing). The `caption` and `fileName` props are intentionally separate: a caption is human prose ("Before the migration"), a fileName is a path (`src/index.ts`).

---

## Hand-rolled tokenizer reference

The production implementation in `web/components/primitives/CodeBlock.tsx` is the canonical hand-rolled approach: zero deps, SSR-safe, full control over token classes, ~290 lines including all four supported languages. Read it directly when authoring a port.

Per-language sketches:

- **TS / JS / TSX / JSX** (`tokTsx`): walk the source character-by-character. Recognize `//` and `/* … */` comments first, then string/template literals (`"`, `'`, `` ` `` with escape handling), then number literals, then identifiers. For each identifier, look up against a hard-coded keyword set; tag PascalCase as `type`; tag identifiers immediately followed by `(` as `function-call`; tag identifiers preceded by a `.` punctuation as `property`. Everything else is `plain`. Punctuation is single chars.
- **Bash / Shell** (`tokBash`): tokenize line-by-line. Strip leading whitespace, then a leading `$` / `#` / `>` becomes a `prompt`. The first remaining word on each line is `command`; subsequent words starting with `-` are `flag`, all-numeric are `number`, anything else is `arg`. Quoted segments are `string`. `#` outside a quote starts a comment to end-of-line.
- **CSS** (`tokCss`): walk char-by-char tracking brace depth and an `afterColon` flag. Outside braces, identifiers are `selector`. Inside braces, before a colon they are `css-prop`; after a colon they are `css-keyword`. Tokens starting with `--` are `css-var`. `@…` is `at-rule`. **Regression-test case**: `.btn { color: red; }` — the v1 implementation infinite-looped on the `.` selector because the identifier-loop's "no progress" branch did not advance `i`. Always include a guard: if no token consumed a character, advance by 1.
- **HTML** (sketch — extend as needed): walk the source. `<` opens tag mode; `>` closes. Inside tag mode, the first identifier is `tag` (or `tag-component` if PascalCase), subsequent identifiers are `attr-name`, `=` is punctuation, quoted segments are `attr-value`, `{ … }` swaps to TS/JS tokenizer.

The general structure is a single `while (i < src.length)` loop. Each branch consumes characters and pushes a `Token`. The "no token claimed this char" fallthrough must always advance `i++` to prevent infinite loops.

---

## Shiki recipe

When the project needs 20+ languages or VSCode-grade fidelity, use Shiki and SSR-render. **Verify at build time** that `shiki` is in `package.json` before installing.

```ts
import { getHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;

async function getH() {
  if (highlighter) return highlighter;
  highlighter = await getHighlighter({
    themes: [
      {
        name: "shipit-tokens",
        type: "dark",
        bg: "var(--color-surface-elevated)",
        fg: "var(--color-fg)",
        tokenColors: [
          { scope: ["comment"],                settings: { foreground: "var(--color-fg-muted)", fontStyle: "italic" } },
          { scope: ["keyword", "storage"],     settings: { foreground: "var(--color-brand-400)" } },
          { scope: ["string"],                 settings: { foreground: "var(--color-accent-300)" } },
          { scope: ["constant.numeric"],       settings: { foreground: "var(--color-accent-400)" } },
          { scope: ["entity.name.function"],   settings: { foreground: "var(--color-brand-500)" } },
          { scope: ["entity.name.type", "support.class"], settings: { foreground: "var(--color-brand-300)" } },
          { scope: ["punctuation"],            settings: { foreground: "var(--color-fg)" } },
          { scope: ["variable"],               settings: { foreground: "var(--color-fg)" } },
        ],
      },
    ],
    langs: ["tsx", "jsx", "ts", "js", "bash", "css", "html", "json", "md"],
  });
  return highlighter;
}

export async function highlight(code: string, lang: string) {
  const h = await getH();
  return h.codeToHtml(code, { lang, theme: "shipit-tokens" });
}
```

Render the output HTML server-side (Next.js Server Components, Astro) and stream it. Never call Shiki on the client — the WASM payload is multiple hundreds of KB.

---

## Prism recipe

When the project needs a runtime highlighter with a small footprint and a pre-existing Prism install, override its theme classes onto the project's tokens. Drop this CSS once:

```css
/* prism-token-overrides.css */
code[class*="language-"],
pre[class*="language-"] {
  color: var(--color-fg);
  background: var(--color-surface-elevated);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}
.token.comment, .token.prolog, .token.doctype, .token.cdata {
  color: var(--color-fg-muted);
  font-style: italic;
}
.token.keyword, .token.atrule, .token.rule {
  color: var(--color-brand-400);
  font-weight: 500;
}
.token.string, .token.attr-value { color: var(--color-accent-300); }
.token.number, .token.boolean, .token.constant { color: var(--color-accent-400); }
.token.function, .token.class-name { color: var(--color-brand-500); }
.token.builtin, .token.tag { color: var(--color-brand-400); }
.token.attr-name { color: var(--color-accent-400); }
.token.property { color: var(--color-fg-muted); }
.token.punctuation, .token.operator { color: var(--color-fg); }
.token.variable, .token.regex { color: var(--color-brand-300); font-weight: 500; }
.token.selector { color: var(--color-brand-400); }
```

Import this AFTER any Prism theme so it wins the cascade.

---

## States table

| Element | State | Visual |
|---|---|---|
| Copy button | rest | ghost; transparent bg; `--color-fg-muted` text; 1 px `--color-border-subtle` border; `--radius-md` |
| Copy button | hover | text → `--color-fg`; bg → `--color-surface-elevated`; transition `--dur-150 var(--ease-out)` |
| Copy button | active | `transform: scale(0.97)`; reverts on release |
| Copy button | focus-visible | 2 px `--color-ring` outline, 2 px offset |
| Copy button | disabled | `opacity: 0.5`; `cursor: not-allowed`; no hover |
| Copy button | copied (1500 ms) | icon → checkmark; label → "Copied"; text + border → `--color-brand`; `aria-label` updates |
| Pre block | rest | as anatomy above |
| Pre block | hovered card | `box-shadow: var(--shadow-sm)` lift; transition on shadow only |
| Caption | rest | mono, `--text-xs`, `--color-fg-subtle`; no states |

All token-driven. All four interactive states present on the copy button (constitution rule 3). Reduced-motion: instant revert on `copied`, no shadow transition.

---

## Test cases — exercise these every time

1. **Bash with a slash command**:
   ```
   $ /plugin marketplace add anthropics/claude-design-studio
   $ /plugin install shipit-ui-design
   ```
   Expect: `$` as `prompt`, `/plugin` as `command`, `marketplace` and `add` as `arg`, the URL-like arg untouched. Slashes inside the command must not break tokenization.

2. **TSX styled component**:
   ```tsx
   const Button = styled.button`
     background: ${props => props.theme.brand};
   `;
   ```
   Expect: `const` keyword, `Button` type, `styled` function-call, `.button` property, template literal as `string`, the `${ … }` interpolation as nested TS tokens. Tagged template + interpolation is the most common JS edge case.

3. **CSS with selectors and tokens** — the regression test:
   ```css
   .btn { color: var(--color-brand-500); padding: 12px; }
   ```
   Expect: `.btn` as `selector`, `color` as `css-prop`, `var(--color-brand-500)` with the `--color-brand-500` portion as `css-var`, `12px` as `number`+`unit`. **The v1 hand-rolled tokenizer crashed with an infinite loop on the `.` selector** — the identifier branch matched `[A-Za-z_.#&*]` but did not advance `i` when the regex inside also failed. Always include the `if (j === i) j = i + 1` guard. This case must round-trip without hanging.

4. **Markdown with mixed inline code**:
   ```md
   ## Install
   Run `/plugin install shipit-ui-design` then **restart Claude**.
   ```
   Expect: `##` heading, `Install` as heading text, `` `…` `` rendered as `code-inline` (mono pill on `--color-surface`), `**restart Claude**` as bold. The `/plugin` inside the inline code must not retokenize as bash; the inline-code boundary is opaque.

---

## Cross-references

- `skills/code-presentation/SKILL.md` — the constitution and decision matrix.
- `references/code-presentation/syntax-tokens.md` — the full color map.
- `web/components/primitives/CodeBlock.tsx` — the production reference.
- `references/canonical-tokens.md` — token names if any below are unfamiliar.
