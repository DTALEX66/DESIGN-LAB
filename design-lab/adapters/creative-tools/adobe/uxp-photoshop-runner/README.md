# DESIGN-LAB Photoshop UXP Runner

This is a project-local UXP command scaffold for Photoshop. It replaces fragile
screen-coordinate automation with an Adobe-hosted command boundary.

## Current scope

- validates the fixed E3 fixture contract: 1920x1080, three repetitions, and
  create/save/reopen/export/restore stages;
- performs no document, preference, network, or filesystem mutation;
- is deliberately not a claim that the Adobe adapter is runtime-qualified.

## Development load (user action required)

1. Enable Photoshop developer mode.
2. In UXP Developer Tool, add this directory by selecting `manifest.json`.
3. Load `DESIGN-LAB Photoshop Runner` and run `Validate DESIGN-LAB Fixture Job`.

Developer mode and plugin loading are intentionally not automated by this
repository. A future execution command must require a user-selected,
project-local output folder and emit task id, runtime version, artifact hashes,
and readback records before any evidence status can change.
