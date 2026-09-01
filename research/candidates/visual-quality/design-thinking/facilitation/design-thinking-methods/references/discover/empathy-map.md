---
id: empathy-map
phase: discover
duration_min: 40
group: [2, 8]
requires_input: [user_description, raw_notes]
provides_output: [empathy_insights]
good_for: [missing user perspective, team argues from its own viewpoint, piles of unsorted interview notes]
bad_for: [neither user data nor proxy sources available, a decision is due]
canvas:
  type: quadrants
  zones:
    - id: says
      title: "Says"
      hint: "Verbatim quotes from interviews. No interpretation."
    - id: thinks
      title: "Thinks"
      hint: "What is presumably on this person's mind? Mark as hypothesis."
    - id: does
      title: "Does"
      hint: "Observed behavior. What they actually do — not what they say they do."
    - id: feels
      title: "Feels"
      hint: "Emotions, one word plus trigger each: 'frustrated — because …'"
next_methods: [hmw]
---

# Empathy Map

## Steps

1. **Pick the user (5 min).** One concrete person or a sharply drawn
   segment. "Our customers" is too broad — make two maps instead.
2. **Fill the quadrants (25 min).** From the raw notes. Order: *Says*
   and *Does* first (observable), then *Thinks* and *Feels*
   (interpreted). One element per entry, no catch-alls.
3. **Mark tensions (10 min).** Where does *Says* contradict *Does*?
   These contradictions are the most valuable insights and the raw
   material for HMW questions.

## Proxy variant (no interviews available)

If there are no real user notes, the map is still useful — provided
proxy sources exist: support tickets, sales conversations, analytics
anomalies, your own observations. Two rules separate method from
tea-leaf reading:

1. **Strictly separate source from assumption.** Entries without a
   source are hypotheses and get marked as such (prefix "H:").
2. **The actual output shifts:** the value lies less in the truth of
   the entries than in making visible where knowledge ends and
   hypothesis begins. The marked hypotheses become the interview list —
   say that up front, or the map will read as validated knowledge.

If there are no proxy sources either (new product, no user contact),
the method is wrong — honestly point to user research instead of
building a map out of pure guesswork.

## Facilitation notes

- Entries without evidence in the raw notes belong in *Thinks* as a
  marked hypothesis, not in *Says*.
- An empty quadrant is a finding (data gap), not a flaw — don't pad it.

## Analysis notes (phase 3)

- Cluster across quadrants, not per quadrant.
- Call out Says/Does contradictions explicitly.
- Proxy variant: analyze "H:" entries separately and output them as an
  interview list; don't mix them with evidenced insights.
- Output for the chain: 3–5 `empathy_insights`, one sentence each,
  each backed by a quadrant reference.
