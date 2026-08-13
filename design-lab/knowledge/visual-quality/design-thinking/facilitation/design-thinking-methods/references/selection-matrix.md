# Selection Matrix

Decision basis for phase 1. First the situation question, then the
constraints (time, group size, available input). The result is **one**
recommendation plus one alternative.

## Step 1 — Situation → Phase

| Typical user statement | Phase |
|---|---|
| "We don't really know what the problem is" / "We don't know our users" | discover |
| "We have lots of material but no focus" / "What's the core question, actually?" | define |
| "We can't come up with solutions" / "We're going in circles" / "Too few options" | ideate (divergence) |
| "Too many ideas" / "We need to decide" / "What do we build first?" | ideate (convergence) |
| "We have ideas but don't know if they work" | prototype |
| "We want to know how users react" | test |

Careful, frequent misdiagnosis: teams that say "no ideas" often have an
unclear problem. If no problem statement exists (`requires_input` of
the ideate methods), do define first.

## Step 2 — Phase × Constraints → Method

### discover

| Method | Time | Group | Requires | Good when |
|---|---|---|---|---|
| empathy-map | 30–45 min | 2–8 | interview or observation notes (proxy sources allowed, see method file) | user perspective missing in the team |

### define

| Method | Time | Group | Requires | Good when |
|---|---|---|---|---|
| hmw | 20–30 min | 2–10 | insights from discover (e.g. empathy map) | problem known but not yet phrased as a workable question |

### ideate — divergence (generate ideas)

| Method | Time | Group | Requires | Good when |
|---|---|---|---|---|
| crazy-8s | 15 min | 1–8 | problem statement / HMW question | stuck discussion, quantity over quality |

### ideate — convergence (prioritize ideas)

| Method | Time | Group | Requires | Good when |
|---|---|---|---|---|
| dot-voting | 10 min | 3–12 | idea list (5+ options) | quick democratic shortlisting, dominant voices slow things down |
| impact-effort-matrix | 30 min | 2–8 | idea list (max. ~15) | feasibility is the critical dimension, selection must be justifiable |

Convergence tie-breaker: dot-voting sorts quickly and roughly,
impact-effort-matrix decides thoroughly. With many options and enough
time: dot-voting first, then run the top group through the matrix.

*(prototype and test: no method files yet — add as needed; until then,
say honestly that the skill offers nothing there.)*

## Step 3 — Tie-breakers

1. **Available input beats desired phase.** If a method's
   `requires_input` is missing, go back one phase.
2. **Time is hard.** If the method doesn't fit the time box, don't
   shorten it — pick a shorter method or say so honestly.
3. **On a tie**, pick the method whose `provides_output` has the more
   direct connection to a `next_methods` chain.
