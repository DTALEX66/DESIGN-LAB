# Landing page — the proof artifact

The user pasted a URL because they *like that site*. A static brandbook can't prove you captured the vibe — only a page built in the system can. This file governs the one artifact you hand-write. Spend your effort here.

## The one rule above all others

**Reproduce the brand's layout language, not a template with its colors.**
Two different brands must produce structurally different pages. Before writing any HTML, answer in one sentence each:

- What is this brand's *hero move*? (Massive display type? Product screenshot floating on a mesh? Full-bleed restraint with a single line?)
- How does it *sequence* a page? (Dense bento? Airy editorial one-column? Alternating feature rows?)
- What is its signature component detail? (Pill buttons with tight labels? Hairline-bordered cards? Numbered section markers?)

If your answers could describe any SaaS site, look again.

## Composition red lines (non-negotiable)

1. **No full-screen gradients.** The AI tell. Gradients are accents: one corner, one edge, one small panel — ≤ ¼ of the viewport, can bleed off-screen. Never the page background.
2. **The canvas is calm.** 70%+ of the page is the brand's background color. Color and gradient are *events*, not weather. (Exception: the analyzed brand genuinely runs a dark or saturated canvas — observed reality wins, reproduce its real proportions.)
3. **Real-feeling content, not wireframe blocks.** Feature visuals are believable product moments: a settings card with real labels, a chart with plausible numbers, a message thread. Never gray bars, empty squares, or icon-in-a-box placeholders.
4. **No lorem ipsum, ever.** Decide the brand voice (from the model's `voice` block) and write every line of copy in it. Specifics beat superlatives: "find a note from three years ago by remembering one word" beats "powerful search".
5. **No stock photos, no fake logos.** Photography slots get labeled placeholder treatments (from the `imagery` spec). Logo walls get typeset names, not invented marks.

## Required structure

Header → Hero → 3 feature sections → (pull quote or pricing if the brand would have one) → final CTA → footer. Skip optional sections when the brand genuinely wouldn't ship them.

- **Hero dominance:** display headline reads 2–3× larger than anything else; `clamp(40px, 7vw, 76px)` territory. The hero treatment must match the model's observed hero style.
- **Alternate feature layouts** (text-left/visual-right, then swap) *unless* the brand's real site uses a different rhythm — the brand's rhythm wins.
- **Surface restraint:** body sits on `--background`; at most one or two sections on `--surface1` as rhythm breaks.
- Include the same floating Light/Dark toggle as the brandbook (copy the pattern from the rendered `brandbook.html`).

## Token discipline

Every color, radius, font size, and spacing value must resolve to a token from `design-model.yaml` (use the CSS custom properties the renderer emits — copy its `[data-theme]` blocks). If the page needs a value the model lacks, **add it to the YAML first**, re-render the brandbook, then use it. No hardcoded hex, no invented paddings.

## Graceful degradation — ambition must not exceed execution

The worst proof page is an ambitious layout done wrong: broken flex heroes, overlapping absolute positioning, animations that stutter. If at any point you are unsure you can execute the brand's full layout language, **step down one level and do the simpler version correctly**:

- Level 3 (full): signature layout moves, staged hero compositions, scroll-triggered scenes.
- Level 2 (standard): the required section structure, correct tokens, one signature move done well (e.g. just the highlight sweep).
- Level 1 (floor): single-column editorial page, correct tokens, correct type scale, zero decoration. Quiet and right beats loud and broken.

Tell the user which level you delivered and why. A Level 1 page that passes validation is a success; a Level 3 page with a collapsed hero is a failure — no exceptions.

## Rights rules for the proof page

The proof page reproduces *layout language and tokens* — facts. It must not reproduce *expression*:

1. **No real slogans, taglines, or sentences from the site.** All copy is yours, written in their register. If a phrase is memorable enough that you remember it from the site, that's exactly the phrase you can't use.
2. **No mascots or characters.** If the brand has one, reserve its slot ("character illustration slot") — describe placement and role, don't redraw the character or reuse its name.
3. **No logo lookalikes.** Placeholder wordmark in the brand's UI face + a clearly generic geometric glyph. Close-enough-to-confuse is the failure mode.
4. **Real metrics and review scores belong to them.** Invent plausible fictional numbers instead of copying "40,000+ users" or a G2 score off their site.
5. **Third-party brands get the footer notice** ("study reproduction from public design patterns; trademarks belong to their owners") — visible, not hidden in a comment.

## Pre-ship checks (these catch the silent failures)

1. **Selector ↔ markup match.** Every class in the stylesheet appears in the HTML. An orphan `.hero h1` rule = unstyled heading shipping in Times New Roman.
2. **Flex width traps.** A flex hero shrinks inner containers to content width — give them `width: 100%` or center with margins on a block parent.
3. **Open it.** Inspect computed font-family and size on the h1. If it says Inter 32px and you expected the display face at 72px, fix the selector, don't ship the bug.
4. **Both modes.** Editorial brands break in dark mode more often than not. Check both.
5. **Squint test.** Blur your eyes: does the page's silhouette match the reference site's silhouette? If the shapes read differently, the layout language didn't transfer.
