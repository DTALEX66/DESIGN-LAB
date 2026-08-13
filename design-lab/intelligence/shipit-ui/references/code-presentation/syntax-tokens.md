# Syntax Tokens — Color Map

The canonical token-type to CSS-variable mapping for every supported language. Read this before authoring a tokenizer, customizing a Shiki theme, or overriding Prism classes.

## Why these mappings

The eye should land on **keywords** and **strings** first — they are the structural skeleton of the code, and they tell the reader what kind of statement they're looking at without reading the words. **Comments** and **punctuation** must recede; they are scaffolding, not content. **Numbers** and **function names** sit between, drawing attention only when the surrounding context calls for it.

The mapping below encodes that hierarchy onto the project's tokens:

- Top tier (highest contrast against `--color-surface-elevated`): **keywords**, **commands**, **at-rules** — these get the brand mid-step (`--color-brand-400` / `--color-brand-500`) plus `font-weight: 500` or `600`.
- Middle tier: **strings**, **numbers**, **flags** — accent ramp (`--color-accent-300` / `--color-accent-400`). Accent is reserved for "literal values" so the reader's eye learns that anything in accent is a value to be edited.
- Recede tier: **comments**, **punctuation**, **plain text** — neutrals (`--color-fg-muted`, `--color-fg`). Comments italicize.
- Identity tier: **types** / **class names**, **CSS variables**, **JSX components** — desaturated brand step (`--color-brand-300`). Different from keyword brand step so types don't shout.

Light and dark are emitted from the same token names; the project's `tokens.css` defines the per-mode hex. The skill never specifies a hex.

---

## General (TS / JS / TSX / JSX)

| Token type | CSS variable | Weight / style | Light example | Dark example |
|---|---|---|---|---|
| `comment` | `var(--color-fg-muted)` | italic | slate-500 | slate-400 |
| `keyword` | `var(--color-brand-400)` | 500 | brand-600 | brand-300 |
| `string` | `var(--color-accent-300)` | normal | accent-700 | accent-200 |
| `number` | `var(--color-accent-400)` | normal | accent-600 | accent-300 |
| `function-call` | `var(--color-brand-500)` | normal | brand-700 | brand-400 |
| `type` / `class-name` | `var(--color-brand-300)` | normal | brand-500 | brand-200 |
| `property` | `var(--color-fg-muted)` | normal | slate-600 | slate-300 |
| `punctuation` | `var(--color-fg)` | normal | slate-900 | slate-100 |
| `regex` | `var(--color-accent-500)` | normal | accent-700 | accent-300 |
| `template-literal-interpolation` | `var(--color-brand-300)` | 500 | brand-500 | brand-200 |
| `decorator` | `var(--color-brand-400)` | 500 | brand-600 | brand-300 |

JSX-specific token types are listed under HTML/JSX below.

---

## Bash / Shell / Zsh

| Token type | CSS variable | Weight / style | Light example | Dark example |
|---|---|---|---|---|
| `command` | `var(--color-brand-500)` | 600 | brand-700 | brand-400 |
| `flag` | `var(--color-accent-400)` | normal | accent-600 | accent-300 |
| `arg` | `var(--color-fg-muted)` | normal | slate-600 | slate-300 |
| `env-var` | `var(--color-brand-300)` | 500 | brand-500 | brand-200 |
| `prompt` (`$`, `>`) | `var(--color-fg-subtle)` | normal | slate-400 | slate-500 |
| `shebang` (`#!/…`) | `var(--color-fg-muted)` | italic | slate-600 | slate-300 |
| `string` | `var(--color-accent-300)` | normal | accent-700 | accent-200 |
| `comment` (`# …`) | `var(--color-fg-muted)` | italic | slate-500 | slate-400 |
| `pipe` / `redirect` | `var(--color-fg)` | normal | slate-900 | slate-100 |
| `subshell` (``$(…)``) | `var(--color-brand-400)` | normal | brand-600 | brand-300 |

The first non-whitespace word on each line is the `command`; subsequent `-x` / `--x` words are `flag`; everything else is `arg`. Quoted segments take priority and are `string`.

---

## CSS

| Token type | CSS variable | Weight / style |
|---|---|---|
| `selector` | `var(--color-brand-400)` | normal |
| `at-rule` (`@media`, `@keyframes`) | `var(--color-brand-400)` | 600 |
| `css-prop` | `var(--color-fg)` | 500 |
| `css-keyword` (`auto`, `inherit`, `flex`) | `var(--color-fg-muted)` | normal |
| `css-value` (literal strings, urls) | `var(--color-accent-300)` | normal |
| `css-var` (`--color-brand-500`) | `var(--color-brand-300)` | 500 |
| `css-unit` (`px`, `rem`, `%`) | `var(--color-fg-muted)` | normal |
| `css-color` (`#aabb00`, `oklch(...)`) | `var(--color-accent-400)` | normal |
| `number` | `var(--color-accent-400)` | normal |
| `comment` | `var(--color-fg-muted)` | italic |
| `punctuation` | `var(--color-fg)` | normal |

Note: CSS variables (`--color-…`) get the brand-300 + 500-weight treatment so a token reference visually pops out of a property block — that's the most-edited element in any rule.

---

## HTML / JSX

| Token type | CSS variable | Weight / style |
|---|---|---|
| `tag` | `var(--color-brand-400)` | normal |
| `tag-component` (PascalCase JSX, e.g. `<Button>`) | `var(--color-brand-300)` | 500 |
| `attr-name` | `var(--color-accent-400)` | normal |
| `attr-value` (quoted) | `var(--color-accent-300)` | normal |
| `attr-expression` (`{value}`) | `var(--color-fg)` | normal |
| `closing-tag` | `var(--color-brand-400)` | normal |
| `bracket` (`<`, `>`, `/`) | `var(--color-fg-muted)` | normal |
| `comment` (`<!-- … -->`) | `var(--color-fg-muted)` | italic |
| `doctype` | `var(--color-fg-muted)` | normal |

JSX expressions inside `{ … }` are tokenized as TS/JS — the brace boundary swaps the tokenizer.

---

## JSON

| Token type | CSS variable | Weight / style |
|---|---|---|
| `key` | `var(--color-brand-400)` | 500 |
| `value-string` | `var(--color-accent-300)` | normal |
| `value-number` | `var(--color-accent-400)` | normal |
| `value-boolean` | `var(--color-brand-300)` | 500 |
| `value-null` | `var(--color-fg-muted)` | italic |
| `punctuation` (`{`, `}`, `[`, `]`, `,`, `:`) | `var(--color-fg-muted)` | normal |

Keys get the same brand-400 + 500-weight as CSS variables — consistency: anything you'd edit in a config file pops.

---

## Markdown

| Token type | CSS variable | Weight / style |
|---|---|---|
| `heading` (`#`, `##`, …) | `var(--color-brand-400)` | 600 |
| `link-text` | `var(--color-brand-400)` | normal |
| `link-url` | `var(--color-accent-300)` | underline |
| `code-inline` (` `…` `) | `var(--color-fg)` on `var(--color-surface)` | mono |
| `bold` (`**…**`) | `var(--color-fg)` | 600 |
| `italic` (`*…*`) | `var(--color-fg)` | italic |
| `list-marker` (`-`, `*`, `1.`) | `var(--color-fg-muted)` | normal |
| `blockquote` (`>`) | `var(--color-fg-muted)` | italic |
| `hr` | `var(--color-border)` | normal |
| `code-fence-info` (e.g. ```` ```tsx ````) | `var(--color-fg-subtle)` | normal |

Inline code inside markdown gets a subtle pill background (`--color-surface`) — same treatment as the inline `<code>` element rendered outside markdown.

---

## Cross-references

- `skills/code-presentation/SKILL.md` — the constitution and decision matrix.
- `references/code-presentation/codeblock-recipe.md` — how to apply this map in a hand-rolled tokenizer, Shiki, or Prism.
- `references/canonical-tokens.md` — the project's token names. If a token below is missing in the user's project, fall back to the closest brand/neutral step.
