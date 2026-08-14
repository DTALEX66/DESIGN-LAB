# Capability index

Generated from `design-lab/config/product-manifest.json` (single source of truth).

> Actual per-capability evidence level (E0-E5, bound to tree SHA) lives in
> `design-lab/config/capability-evidence-index.json`, validated by
> `design-lab/scripts/verify_capability_evidence_v4.py`.

| Capability | Title | Min evidence | Domain | Owner | Paths |
|---|---|---|---|---|---|
| `source-governance` | Source, rights and security governance | E1 | governance | DTALEX66 | `knowledge/governance/, research/global-absorption/, LICENSING_DECISION_REQUIRED.md` |
| `brief-routing` | Brief normalization and commercial design routing | E2 | all | DTALEX66 | `atoms/brief-normalizer/, atoms/source-intake-gate/, scenarios/commercial-design-router/` |
| `visual-quality` | Visual quality, design feeling and anti-AI-slop engine | E2 | all | DTALEX66 | `bundles/visual-quality-core/, evals/rubrics/visual-quality-core.rubric.json, knowledge/visual-quality/, scripts/score_visual_quality.py, scripts/score_design_critique.py, scripts/compare_visual_iterations.py, scripts/verify_visual_scoring_v3.py` |
| `style-master-method` | Style lineage and anonymous master-method translation | E1 | all | DTALEX66 | `research/style-lineages/, research/master-studies/, scripts/verify_style_master_method.py, scenarios/master-method-visual-upgrade/` |
| `domain-scenarios` | Commercial design domain scenarios | E2 | ui-ux, graphic, brand, ecommerce, spatial, 3d, motion, video, audio, game | DTALEX66 | `scenarios/, profiles/, evals/rubrics/` |
| `production-handoff` | Production preflight and editable delivery | E2 | all | DTALEX66 | `atoms/commercial-preflight/, atoms/delivery-packager/, schemas/preflight.schema.json, schemas/design-handoff.schema.json, schemas/provenance.schema.json` |
| `runtime-integration` | Open Design runtime registration and live task evidence | E3 | all | DTALEX66 | `plugins/, atoms/, scenarios/, bundles/, schemas/design-project-state.schema.json, schemas/provenance.schema.json` |
| `release-evidence` | Review, exact-SHA CI and release evidence | E4 | governance | DTALEX66 | `.github/workflows/, design-lab/evals/, design-lab/config/capability-status.json, design-lab/schemas/release-evidence.schema.json, design-lab/scripts/verify_release_evidence.py` |
