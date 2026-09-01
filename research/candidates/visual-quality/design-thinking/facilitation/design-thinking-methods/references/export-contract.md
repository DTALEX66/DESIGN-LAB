# Export Contract

The JSON that every canvas's "Export result" button places on the
clipboard — and that phase 3 of the skill parses. This schema is also
the payload of a future `submit_canvas` MCP tool. Changes here are
breaking changes: bump the version, keep accepting the old one.

## Schema (v1)

```json
{
  "contract_version": 1,
  "session_id": "dt-2026-08-03-a1",
  "method_id": "crazy-8s",
  "phase": "ideate",
  "context": {
    "problem_statement": "..."
  },
  "entries": [
    { "zone": "z1", "text": "...", "author": null }
  ],
  "meta": {
    "actual_duration_min": 12,
    "participants": 4,
    "exported_at": "2026-08-03T14:30:00Z"
  }
}
```

## Field rules

| Field | Type | Required | Rule |
|---|---|---|---|
| `contract_version` | int | yes | currently `1` |
| `session_id` | string | yes | format `dt-<YYYY-MM-DD>-<shortid>`, assigned by the skill in phase 2 |
| `method_id` | string | yes | must match a method file (`id` in its frontmatter) |
| `phase` | string | yes | `discover` \| `define` \| `ideate` \| `prototype` \| `test` |
| `context` | object | yes | the `requires_input` values the canvas was rendered with; empty object allowed |
| `entries[].zone` | string | yes | zone id from the canvas config (`z1`, `z2`, … or semantic ids like `says`) |
| `entries[].text` | string | yes | raw text, trimmed only at the edges |
| `entries[].author` | string\|null | no | optional, `null` if not captured |
| `meta.actual_duration_min` | int\|null | no | measured by the timer, otherwise `null` |
| `meta.participants` | int\|null | no | self-reported in the canvas, otherwise `null` |
| `meta.exported_at` | string | yes | ISO 8601 UTC |

## Parsing rules for phase 3

- Ignore unknown extra fields, don't reject them (forward compatible).
- If a required field is missing: name exactly what is missing and ask
  for a re-export — don't guess.
- Empty `entries`: don't analyze; ask whether export was clicked too
  early.
