# Reports boundary

This directory contains dated audit reports and delivery snapshots. They are immutable historical records of the tree, runtime, and authorization state named inside each report; they are not the current capability index.

## Current-truth rule

For current project status, use these normative sources in this order:

1. `design-lab/config/capability-evidence-index.json`
2. `design-lab/config/capability-status.json`
3. `design-lab/scripts/verify_design_lab.py`
4. `design-lab/scripts/verify_release_gate.py`
5. `project-memory/ROADMAP.md`

A report's E3/E4/E5 wording is historical evidence only unless the current capability index independently binds the same claim to the current checkout with the required runtime, provenance, read-back, human, or exact-SHA evidence. These reports are **not current runtime proof**. In particular, historical reports mentioning ComfyUI or MiniMax H3 do not override the current E0 placeholder state.

Do not edit a dated report to make it appear current. Add a new dated report with an exact tree, runtime identity, and evidence handles when a capability is genuinely requalified.
