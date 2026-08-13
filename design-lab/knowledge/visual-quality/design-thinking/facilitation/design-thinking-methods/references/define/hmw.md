---
id: hmw
phase: define
duration_min: 25
group: [2, 10]
requires_input: [empathy_insights]
provides_output: [problem_statement]
good_for: [insights exist but no focus, team jumps to solutions too early, problem cut too large or too small]
bad_for: [no user insights available, a good problem statement already exists]
canvas:
  type: list
  zones:
    - id: hmw_questions
      title: "How-Might-We questions"
      hint: "Format: 'How might we help [user] to [need], so that [impact]?' One question per entry."
    - id: favorites
      title: "Favorites (max. 2)"
      hint: "After collecting: copy the 1–2 questions here that are neither too narrow (solution in disguise) nor too broad (world peace)."
next_methods: [crazy-8s]
---

# How Might We (HMW)

## Steps

1. **Review the insights (5 min).** The `empathy_insights` (or other
   research results) are visible in the canvas context. Every insight
   is a candidate for at least one HMW question.
2. **Generate questions (10 min).** 1–3 reformulations per insight.
   Levers to vary: amplify the good, remove the bad, explore the
   opposite, question the assumption.
3. **Calibrate and choose (10 min).** Test per question: can you
   spontaneously think of at least 5 different solution directions?
   Fewer → too narrow. Endless but all trivial → too broad. Max. 2
   favorites.

## Facilitation notes

- "How might we build an app that …" is not an HMW question but a
  hidden solution. Reformulate back to the need.
- The "so that" part forces the impact level — don't let it be dropped.

## Analysis notes (phase 3)

- Mirror the favorites against the insights: does each favorite cover
  an evidenced insight, or did a pet idea slip through?
- Output for the chain: exactly one `problem_statement` (the strongest
  HMW question), justified in one sentence. The second favorite is
  noted as backup.
