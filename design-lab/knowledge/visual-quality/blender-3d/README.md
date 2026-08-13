# blender

AI-powered 3D design in Blender. Works with Claude Code, Codex CLI, ChatGPT, Cursor, and more.

The first agent skill and plugin for Blender 3D — teaches AI how to create professional parametric designs, apply realistic materials, set up lighting, and render scenes through Blender's MCP (Model Context Protocol).

## What This Skill Does

- Guides AI through a proven design workflow: analyze reference -> build simple -> verify from multiple angles -> iterate
- Includes reusable code patterns for parametric mesh generation (slats, planks, organic forms)
- Material library with wood, metal, concrete presets
- Scene setup with Cycles rendering, lighting, and camera helpers
- Troubleshooting guide for common Blender MCP errors
- Milestone management to save/restore design states

## Prerequisites

1. [Blender](https://www.blender.org/download/) installed and open
2. [Blender MCP](https://github.com/ahujasid/blender-mcp) addon running
3. MCP server configured in your AI tool:
   ```
   claude mcp add blender uvx blender-mcp
   ```

## Install

### Claude Code (Plugin)

```bash
claude plugin marketplace add jithinolickal/blender
claude plugin install blender@blender
```

### Any AI Agent (Skill)

```bash
npx skills add jithinolickal/blender
```

Or install globally:

```bash
npx skills add -g jithinolickal/blender
```

The AI will automatically use this skill when working with Blender.

## What's Inside

```
blender/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest
│   └── marketplace.json         # Marketplace catalog
├── skills/
│   └── blender/
│       ├── SKILL.md             # Core instructions and workflow
│       ├── references/
│       │   ├── surface-patterns.md  # Library of parametric surface functions
│       │   ├── common-errors.md     # Troubleshooting guide
│       │   └── workflow.md          # Detailed design methodology
│       └── scripts/
│           └── viewport_helpers.py  # Multi-angle screenshot utilities
└── README.md
```

## Design Workflow

This skill teaches AI a battle-tested workflow learned from real design sessions:

1. **Understand before building** — Analyze the reference, ask clarifying questions, identify simple geometric primitives
2. **Start simple** — Break design into parts, build one at a time
3. **Verify from every angle** — Take screenshots from 4+ angles (front, side, top, back)
4. **Save milestones** — Always save before making changes so you can revert
5. **One change at a time** — Iterate on single parameters, not everything at once

## Examples

### Parametric Slatted Planter

Starting from a reference image, the AI creates a circular disc made of 50 parallel wooden slats with a raised center bowl — all through natural language instructions.

### Key Techniques Used
- bmesh for custom slat geometry
- Surface functions with smoothstep transitions
- Multiplicative bowl depressions (no holes)
- Procedural oak wood material (Noise + Color Ramp)
- Cycles GPU rendering with area lights

## Built From Real Experience

This skill was created from extensive real-world design sessions — not theoretical documentation. Every instruction, every error fix, every design principle comes from actual iteration. The workflow prevents common mistakes that waste hours:

- Don't overthink the math — start with the user's simple description
- Never purge orphans (deletes materials)
- Use multiplicative depressions (subtractive creates holes)
- Always verify from the side view (catches dome vs flat issues)
- Save milestones before every change

## Contributing

Issues and PRs welcome. If you've found a new Blender MCP pattern or error fix, please contribute.

## License

Apache-2.0
