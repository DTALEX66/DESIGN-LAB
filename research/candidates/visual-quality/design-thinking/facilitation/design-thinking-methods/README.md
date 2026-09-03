# design-thinking-methods (Claude Skill)

A Claude skill that selects the right design thinking method for a
given situation, renders it as an interactive canvas artifact, and
analyzes the entered results to propose the next process step.

Method knowledge is English; **everything users see — chat responses
and the canvas — is rendered in the conversation language**.

## Architecture

```
skills/facilitation/design-thinking-methods/
├── SKILL.md                    # diagnose → select → render → analyze
├── references/
│   ├── selection-matrix.md     # phase × situation × time × group size
│   ├── export-contract.md      # return-channel schema (v1) — source of truth
│   ├── discover/empathy-map.md
│   ├── define/hmw.md
│   └── ideate/                 # crazy-8s, dot-voting, impact-effort-matrix
├── assets/
│   └── canvas-base.html        # generic renderer, consumes METHOD_CONFIG
└── scripts/
    ├── synthesize.py           # pre-clustering for >20 entries
    └── package.sh              # builds dist/design-thinking-methods.zip
```

Core ideas:

- **Progressive disclosure instead of MCP:** method knowledge lives in
  `references/`; Claude loads only the file it currently needs.
- **Machine-readable frontmatter** per method (selector and renderer
  consume the same schema). `next_methods` plus
  `requires_input`/`provides_output` chain the methods into a process.
- **One renderer for all methods:** `canvas-base.html` only gets the
  `METHOD_CONFIG` block injected. If the renderer needs touching for a
  new method, the schema is broken, not the method.
- **Language-adaptive canvas:** all user-facing strings (title,
  instructions, steps, zone labels, UI buttons) are generated at render
  time in the conversation language; UI defaults are English.
- **Copy-out return channel:** the canvas exports JSON per
  `references/export-contract.md` to the clipboard; the contract is
  1:1 the payload of a future `submit_canvas` MCP tool (MCP Apps /
  SEP-1865) — migrating is an adapter, not a rewrite.

## Adding a method

1. Create `references/<phase>/<id>.md` — copy the frontmatter schema
   from an existing method (`id`, `phase`, `duration_min`, `group`,
   `requires_input`, `provides_output`, `good_for`, `bad_for`,
   `canvas`, `next_methods`).
2. Add its row(s) to `references/selection-matrix.md`.
3. Change nothing in `canvas-base.html`.

## Testing

- Renderer locally: paste a test config into `canvas-base.html` at
  `/*__METHOD_CONFIG__*/` and open it in a browser.
- Clustering: `python3 scripts/synthesize.py <export.json>`
- Trigger and artifact behavior (clipboard inside the sandbox iframe,
  `window.storage`) must be tested in the target surface (claude.ai) —
  package the skill and install it there.

## Packaging

```
./scripts/package.sh   # → dist/design-thinking-methods.zip
```

Upload in claude.ai under Settings → Capabilities → Skills.

## Roadmap

1. ✅ Export contract + frontmatter schema + 3 methods + renderer
2. ✅ Convergence methods dot-voting and impact-effort-matrix
   (incl. `zones_source` convention for dynamically generated zones)
3. ✅ English as source language, language-adaptive canvas
4. Methods for `prototype/` (storyboard, wizard-of-oz) and `test/`
5. Eval loop: run test prompts with/without the skill, measure the
   description's trigger rate
6. Optional MCP server: `list_methods`, `get_session`, `submit_canvas`,
   state in SQLite — only once cross-session state or team sharing is
   needed

## License

MIT — see [LICENSE](LICENSE).
