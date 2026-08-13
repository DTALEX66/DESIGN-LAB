---
name: design-thinking-methods
description: Selects the right design thinking method for the situation,
  renders it as an interactive canvas artifact, and analyzes the entered
  results to propose the next process step. Use whenever the conversation
  is about workshop planning, ideation, problem framing, user research,
  retrospectives, or prioritization — including phrases like "we're
  stuck", "how do I structure this workshop", "which method fits" (or
  German "wir kommen nicht weiter", "welche Methode passt") — even if
  "design thinking" is never mentioned. Canvases are rendered in the
  conversation language.
---

# Design Thinking Methods

Three phases. Skip none, but keep phase 1 short.

## Language

Method files and this skill are written in English. **Everything the
user sees is produced in the conversation language**: your responses,
and every user-facing string in the canvas config (`title`,
`instructions`, `steps`, `tips`, zone `title`/`hint`/`info`, and the
`ui` block). Translate from the method file on the fly. Zone `id`s,
context keys, and export fields always stay in English — they are
contract, not copy.

## Phase 1 — Diagnosis

No method selection without diagnosis. Clarify exactly these four
things, via AskUserQuestion if available, otherwise as one compact
question:

1. Where are you? (problem unclear / solutions missing / decision due / testing)
2. How many people?
3. How much time?
4. What exists already? (interviews, personas, idea list, nothing)

If the prompt already answers all four, don't ask again. If something
is missing, ask only for what's missing — and wait for the answer
instead of packing question and recommendation into the same message.
Name what you assume rather than know (e.g. "presumably no interviews
yet") as an assumption.

Then read `references/selection-matrix.md` and propose **one** method,
with a one-sentence justification and one alternative. Don't offer
three equal options — selection is this skill's job.

## Phase 2 — Render the canvas

**Render exactly one canvas** — the chosen method's. The follow-up
method (`next_methods`) is rendered only after the analysis in phase 3,
never in advance: its `context` consists of the current method's
results, which don't exist yet. An HMW canvas without insights is an
empty form, not a tool.

Read the method file at `references/<phase>/<id>.md`. Take
`assets/canvas-base.html` as the base and replace the
`/*__METHOD_CONFIG__*/` block with the JSON object you derive from the
frontmatter's `canvas` block (schema: see the comment at the top of
`canvas-base.html`). Change nothing else in the renderer — if a method
can't be rendered without touching the renderer, that's a schema
problem to report, not a reason for one-offs.

Special case `zones_source` in the `canvas` block: the zones are then
not in the frontmatter; you generate them at render time from the named
input (e.g. one zone per idea in the `idea_list`) — details are in the
method file. The renderer always receives a finished `zones` array.

The artifact strictly needs:
- `steps` and `tips` in the config, filled from the method file's
  "Steps" and "Facilitation notes" sections — carry them over fully,
  don't compress to one sentence; the canvas must be facilitatable
  without the chat next to it. For zones that need explanation, add
  `info` on the zone object (expandable behind ⓘ).
- a `ui` block with all UI strings in the conversation language (see
  renderer comment for keys; defaults are English)
- a timer per zone when `time_per_zone` is set
- persistence via `window.storage` (fallback localStorage) under
  `dt:<session_id>`
- an "Export result" button that places exactly the schema from
  `references/export-contract.md` on the clipboard
- a visible line: "Done? Click export and paste it here."

You generate the `session_id` yourself: `dt-<date>-<shortid>`, e.g.
`dt-2026-08-03-a1`.

## Phase 3 — Analysis

When users paste an export JSON: parse it against
`references/export-contract.md`, then

- cluster (thematically, not alphabetically — with >20 entries use
  `scripts/synthesize.py`)
- name patterns and outliers; don't trim outliers away
- check the method file's `next_methods` and mirror them against the
  current diagnosis
- propose exactly one next step

If a collection of ideas is substantively thin, say so. A skill that
reframes twelve mediocre sticky notes as "strong impulses" is
worthless.

## Process chain

One method's `provides_output` is the next method's `requires_input`.
When rendering the follow-up method, carry the relevant results of the
previous one into the canvas config's `context` block so they are
visible in the artifact.
