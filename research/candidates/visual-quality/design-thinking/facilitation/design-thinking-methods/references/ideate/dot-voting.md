---
id: dot-voting
phase: ideate
duration_min: 10
group: [3, 12]
requires_input: [idea_list]
provides_output: [prioritized_ideas]
good_for: [too many options, discussion going in circles, dominant voices skew the choice, quick democratic shortlisting needed]
bad_for: [fewer than 5 options, decision needs a feasibility assessment, single person without a group]
canvas:
  type: grid
  zones_source: idea_list
next_methods: [impact-effort-matrix]
---

# Dot Voting

## Zone generation (phase 2)

`zones_source: idea_list` means: the zones are not in this file but
are generated at render time from the input — **one zone per idea or
cluster** from the previous method's `idea_list`:

- `id`: slug of the idea (`z-video-tutorial`)
- `title`: the idea in short form (max. ~8 words)
- `hint`: for clusters, the contained individual ideas in one sentence

With more than 12 ideas, cluster first (phase 3 of the previous
method) and vote on clusters, not on 20 individual sticky notes.

## Steps

1. **Set the budget (1 min).** Each person gets votes by the rule of
   thumb *number of options ÷ 3*, at least 2, at most 5. The budget
   goes into the canvas instructions.
2. **Vote silently (5 min).** Per vote, one entry in the zone of the
   chosen idea: your name or a `●`. Cumulating is allowed (several
   votes on one idea), but announce it. No discussion during voting —
   otherwise the first loud argument becomes the anchor.
3. **Count and cut (4 min).** Entries per zone = votes. The top 2–4
   advance, not "everything above zero".

## Facilitation notes

- Shuffle the zone order before voting (don't leave creation order) —
  position effects are real.
- Whoever votes first, anchors. With a steep hierarchy gradient: the
  most senior person votes last.

## Analysis notes (phase 3)

- Count votes per zone and output as a ranking.
- Don't sell narrow margins (±1 vote) as a clear result — name them
  and, if needed, propose a tie-break or impact-effort-matrix for the
  top group.
- Keep zero-vote ideas in the record (don't delete) — they are
  sometimes the most interesting ones for later rounds.
- Output for the chain: `prioritized_ideas` = top 2–4 with vote counts.
