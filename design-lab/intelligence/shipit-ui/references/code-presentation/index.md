# Code Presentation — Reference Catalog

Short index for the `references/code-presentation/` folder. Skim before opening any single file; each entry says when to read it.

## Files in this folder

| File | Purpose | When to read |
|---|---|---|
| `syntax-tokens.md` | The canonical color map: every token-type (keywords, strings, comments, …) for every supported language (TS / JS / TSX / Bash / CSS / HTML / JSX / JSON / Markdown), each mapped to a project CSS variable. | Before authoring a hand-rolled tokenizer, customizing a Shiki theme, overriding Prism classes, or auditing a CodeBlock for token discipline. |
| `codeblock-recipe.md` | Copy-pasteable recipe for the canonical `<CodeBlock>` component: anatomy diagram, TypeScript props contract, hand-rolled / Shiki / Prism implementation sketches, copy-button state table, four regression-test cases. | Before generating a new CodeBlock, refactoring an existing one, or porting the implementation to a different stack. |
| `index.md` | This file. | First read in this folder. |

## The canonical implementation

The production reference lives at:

```
web/components/primitives/CodeBlock.tsx
```

~290 lines, zero dependencies, SSR-safe, four languages (TS/JS/TSX, Bash, CSS, plain), token-driven syntax colors, terminal chrome, copy button, line numbers, line highlighting. It is the visual ground truth for everything in this folder. When the recipe and the production file disagree, the production file wins — open a PR to update the recipe.

## When to read what — by task

- **"Generate a code block for our docs site"** → `codeblock-recipe.md` first (props + anatomy), then `syntax-tokens.md` if you'll be hand-rolling.
- **"Audit this CodeBlock for design-token discipline"** → `syntax-tokens.md` (compare every color in the file against the canonical map).
- **"We want to support Rust / Go / Python"** → `codeblock-recipe.md` (Shiki recipe), then add a new section to `syntax-tokens.md` for the language's token-types.
- **"The CodeBlock looks wrong in dark mode"** → `syntax-tokens.md` (verify the tokens used resolve to the right step in dark mode), then check `references/canonical-tokens.md`.
- **"Convert the install snippet on the homepage to use editor chrome"** → `codeblock-recipe.md` (props contract; `chrome="editor"`), then `skills/code-presentation/SKILL.md` section 4.

## Cross-references

- Skill that owns these references: `skills/code-presentation/SKILL.md`.
- Canonical token names: `references/canonical-tokens.md`.
- Plugin-wide design rubric: `skills/ui-design-principles/SKILL.md`.
