# brandbook

![brandbook — turn any website into a complete brand system](assets/hero.svg)

**An open-source Claude Code / Codex skill: paste any website URL and get a complete brand system** — design tokens, a browsable brand book, and a proof landing page in that brand's own layout language. Not just a UI kit.

> Give your AI coding agent taste. Install once; every UI it builds after that matches the brand.

Paste a URL, a brand name, or screenshots. Get back:

| Artifact | How it's made | What it's for |
|---|---|---|
| `design-model.yaml` | AI analysis | Single source of truth: tokens, voice, imagery spec, components with provenance, anti-patterns |
| `brandbook.html` | **script-rendered, zero AI tokens** | The shareable brand book: palettes, type specimens, logo rules, voice do/don'ts, imagery treatments, component gallery, social/slide/email mockups |
| `landing-page.html` | AI hand-crafted | The proof: one page in the brand's own layout language, showing the system captured what you fell for |

Works on Claude Code, Codex, and compatible agents.

## Why not just use hue?

[hue](https://github.com/dominikmartn/hue) is excellent and inspired this project — the design-model-as-source-of-truth, observed/derived provenance, and anti-AI-default ban lists all come from it. brandbook makes two different bets:

1. **Brand system > UI system.** hue always outputs SaaS artifacts (bento dashboard, component library, app screen). brandbook adds the layers a real brand book has — logo rules, voice & tone with do/don't copy pairs, an imagery *spec* with CSS-demonstrated treatments, application mockups (social card, slide cover, email masthead) — and makes the SaaS artifacts opt-in.
2. **Hybrid rendering.** hue hand-writes ~4 large HTML files with the LLM every run (slow, token-hungry). brandbook renders the brand book deterministically from YAML with a node script — AI tokens are spent only on analysis and the one artifact that genuinely needs craft: the landing-page proof.

## Install

```bash
git clone https://github.com/echowang97/brandbook-skill ~/.claude/skills/brandbook
cd ~/.claude/skills/brandbook && npm i yaml
```

Codex: clone into `~/.agents/skills/brandbook` instead.

Then in any session: *"make a brandbook from stripe.com"* / *"extract this brand"* / paste screenshots.

## Model requirements — honest expectations

Skill quality tracks the model running it. The architecture hardens what it can: extraction is a shipped script (`scripts/extract.js`, no improvised probing), the brandbook renders deterministically (identical output on any model), and `scripts/validate.mjs` mechanically blocks broken output. What still varies with model capability: the fit-check judgment, brand-voice copy, and the hand-crafted landing proof — weaker models are instructed to degrade gracefully (simpler page, done correctly) rather than attempt and break.

Tested on: Claude (Fable/Opus-class — best results; landing proofs reach "squint-test" fidelity). On smaller models expect a correct brandbook and a plainer proof page.

## Render manually

```bash
node scripts/render-brandbook.mjs examples/hyperbound/design-model.yaml
```

## Limits — read before judging the output

This skill extracts **design systems**: tokens, type, spacing, components, voice. Some sites' identity isn't a system — it's a crafted asset (a WebGL scene, full-bleed video, art-directed photography). For those, the skill runs a **fit check first** and tells you the honest proportion: "~80% of this site is the 3D scene; I can distill the type, color and motion personality around it, plus a labeled slot where the asset lives — but no token file reproduces the scene itself. That takes the original assets or a 3D artist." You'll get that verdict *before* any generation, so you can decide whether the extractable 20% is worth it. A quiet-but-accurate brand system beats a loud fake.

## Rights

Two-line version: **design facts (colors, spacing, sizes, structure) are extractable; expression (logos, mascots, slogans, copy, illustrations, photos, icon glyphs, font files) is never reproduced.** Expression slots get honest placeholders, free-licensed fallbacks, and disclaimers.

The skill also asks whether the brand is **yours or third-party**. Your own brand: ship everything. Third-party: outputs are study reproductions for internal reference and learning — the landing proof carries a visible notice, uses no real slogans or characters, and all copy is original. Observed values are labeled `observed`; invented ones are labeled `derived` with written justification. Nothing proprietary is redistributed.

## License

MIT.
