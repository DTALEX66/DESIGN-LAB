---
id: impact-effort-matrix
phase: ideate
duration_min: 30
group: [2, 8]
requires_input: [idea_list]
provides_output: [prioritized_ideas, roadmap_candidates]
good_for: [feasibility is the critical dimension, team overrates pet ideas, implementation planning is due, stakeholders want a justified selection]
bad_for: [effort not yet estimable at all, more than ~15 options, pure divergent phase]
canvas:
  type: quadrants
  zones:
    - id: quick-wins
      title: "Quick Wins — high impact, low effort"
      hint: "Do first. If everything lands here, estimates are too optimistic."
    - id: big-bets
      title: "Big Bets — high impact, high effort"
      hint: "Strategic bets. Candidates for prototyping, not for immediate build."
    - id: fill-ins
      title: "Fill-ins — low impact, low effort"
      hint: "Nice to have. Only with spare capacity."
    - id: money-pit
      title: "Money Pit — low impact, high effort"
      hint: "Cut. Being honest here hurts most and helps most."
next_methods: [storyboard, wizard-of-oz]
---

# Impact-Effort Matrix

## Steps

1. **Calibrate the axes (5 min).** First define what *impact* means
   here concretely (for whom? measured by what?) and what *effort*
   includes (build time only, or maintenance and alignment too?).
   Without this calibration, everyone sorts by their own yardstick.
2. **Sort in (15 min).** Each idea from the `idea_list` (visible in
   the canvas context) becomes an entry in exactly one quadrant. First
   a silent proposal per idea, then discuss the contested ones — don't
   debate every idea individually.
3. **Draw consequences (10 min).** Per quadrant, state the default
   action (see hints) and require justification for exceptions.

## Facilitation notes

- Estimate relatively, not absolutely: "more effort than X?" is
  answerable; "how many person-days?" at this stage is not.
- If >60% of ideas land in *Quick Wins*, the effort axis is calibrated
  too softly — repeat step 1.
- The matrix rates assumptions, not facts. For *Big Bets* the honest
  consequence is a prototype to test the impact assumption, not a
  build decision.

## Analysis notes (phase 3)

- Output as a ranking: Quick Wins → Big Bets (with prototype
  recommendation) → Fill-ins → Money Pit (cut, with documented
  reasoning).
- An empty Money Pit quadrant is a warning sign (nobody wanted to cut)
  — say so.
- Output for the chain: `prioritized_ideas` (Quick Wins),
  `roadmap_candidates` (Big Bets). Next step for Big Bets:
  prototyping — `storyboard` or `wizard-of-oz` (method files not yet
  available; until then, say honestly that the skill offers nothing
  there yet).
