# Design Rules — Index

A growing collection of sourced design rules `shipit-ui-design` enforces or strongly suggests. Each rule is a single file with: the rule, why, the recommended approach, anti-patterns, token mapping, and cross-references.

## Status types

| Status | Meaning |
|---|---|
| **Default** | Applied by default on every generation. Override only with explicit user request. |
| **Strong default** | Applied unless context suggests otherwise (e.g., dense data tools may relax 60–30–10). |
| **Suggested** | Mentioned by skills when relevant; not auto-applied. |

## Rules

| File | Rule | Status |
|---|---|---|
| [`tinted-neutrals.md`](./tinted-neutrals.md) | Never pure white on pure black; use tinted-grey ramps. | Default |
| [`visual-richness.md`](./visual-richness.md) | Marketing surfaces must include illustrated art and rich patterns. Plain output is a failure. | Default |
| [`sixty-thirty-ten.md`](./sixty-thirty-ten.md) | 60% Primary / 30% Secondary / 10% Accent color distribution. | Strong default |
| [`mobile-grid-ios-android.md`](./mobile-grid-ios-android.md) | iOS/Android grid: 16px margin, 16px gutter, stretch columns; platform chrome and touch-target minimums. | Default (when mobile stack detected) |
| [`learning-resources.md`](./learning-resources.md) | Curated free sites skills can suggest for inspiration. | Suggested |

## Spacing-specific rules

Spacing cheat sheets live in a sibling directory at `references/spacing-cheat-sheets/`. They behave like design rules but are component-specific rather than system-wide:

- `desktop-sidebar.md` — exact spacing for the desktop sidebar (logo, search, sections, items, promo card, user row, collapsed rail).

## See also — skills (not rules)

Pattern-level guidance lives in skills under `skills/`. These are reached for during generation rather than enforced as rules, but they encode the same opinions:

| Skill | Covers | Status |
|---|---|---|
| `skills/rich-ui-patterns/SKILL.md` | Browser/device mockups, mesh gradients, layered surfaces, glassmorphism, gradient borders, tilt cards, spotlight cursor, animated borders, eyebrow pills — when generating hero, marketing, or polished UI. | See also |
| `skills/images-and-media/SKILL.md` | Format choice (raster vs SVG vs CSS), aspect ratios, lazy/blur placeholders, art direction, photo treatment, avatar systems. | See also |

## Adding a new rule

1. Create `references/design-rules/<rule-name>.md`. Keep ≤ 300 lines.
2. Required sections: **The rule** (one-line + table), **Why**, **Recommended approach**, **When to break it**, **Common mistakes**, **Token mapping** (if it touches tokens), **Cross-references**.
3. Add a row to this index with the correct status.
4. Cross-reference the rule from any relevant skill (`SKILL.md`) and from any command that should enforce it.
5. If the rule is **Default** or **Strong default**, add a check to the `/audit` and `/refine` rubric so it's measured.

## Where rules come from

User-supplied rules (via screenshots, written rules, or named conventions) are encoded here verbatim, then the plugin enforces them. Plugin-generated rules without a user source should be rare and clearly attributed in the file's header.
