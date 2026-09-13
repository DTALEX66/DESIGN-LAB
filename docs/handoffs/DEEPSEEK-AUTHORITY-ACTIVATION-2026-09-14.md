# DEEPSEEK AUTHORITY ACTIVATION — 2026-09-14

- **TaskPack**: `DL-TP-20260914-DEEPSEEK-AUTHORITY-R1`
- **Landed at**: `docs/taskpacks/DESIGN-LAB-DEEPSEEK-AUTHORITY-TASKPACK-2026-09-14.md`
- **Landed sha256**: `sha256:d9fdaa3ad7ad0055a3f451c853756be41036b32112cacc4d1c17b314c005a2f9`
- **Machine ledger**: `reports/current/DEEPSEEK-AUTHORITY-LEDGER-2026-09-14.json` (58 task records)
- **Ledger writer**: `scripts/deepseek_authority_ledger.py` (init / set / show / verify)
- **Authority chain reconciliation**: `reports/current/DEEPSEEK-AUTHORITY-CHAIN.json` (37 entries)
- **Branch**: `codex/deepseek-authority-r1`
- **Base sha at activation**: `56319635bbcf112ac88d097317262c101ffdfe4d`

## DLDS-A020 — stop-line supersession

`docs/handoffs/SESSION-RESTART-2026-09-12.md` is **retained unchanged**
(sha256 `sha256:` + `0020d454fd5a98dc…`, recorded in full in the authority chain
artifact). It is not deleted, not edited and not reinterpreted.

| Item | State after activation |
|---|---|
| Quota stop-line ("停止新增开发") | `EXPLICIT_SCOPE_SUPERSESSION` — superseded **only** for the DeepSeek tasks listed in `DL-TP-20260914-DEEPSEEK-AUTHORITY-R1` |
| Any other development | **still frozen** |
| Real Host (Photoshop / Illustrator / Premiere / Blender / OpenDesign / MiniMax Design / ComfyUI) | still frozen — Codex |
| Design validation, professional quality judgement | still frozen — Codex / Human |
| GPU inference | still frozen — Codex |
| Human Gate signature | still frozen — Owner / Human, never an agent |
| PR / merge / release / tag | not authorised; branch discipline in taskpack §8 |

The supersession is scoped, recorded and reversible: if the owner revokes it, the
only consequence is that the DeepSeek tasks in this pack stop, and the tree can be
left exactly as it is (everything is on an independent branch).

## Authority rules now in force

1. **Only landed files authorise mutation.** Chat summaries, memory summaries,
   compressed context and handoff summaries are `NON_AUTHORITATIVE` (taskpack §4).
2. **One DeepSeek current taskpack.** `AGENTS.md` now names
   `DL-TP-20260914-DEEPSEEK-AUTHORITY-R1` as the single current DeepSeek execution
   authority, while `DL-TP-20260908-R5` remains the product/R5 pack whose ledger and
   host-deferred work are untouched.
3. **Task identity is namespaced.** Every task in this pack is
   `DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-<key>`; a bare `DL-P0-001` or
   `DL-R5-001` is never a sufficient identifier (taskpack §3).
4. **If the real taskpack cannot be read: `TASK_AUTHORITY_UNRESOLVED` and stop.**
   This is the rule that the previous round violated; it is now written into
   `AGENTS.md` so it survives context compression.

## Why this record exists

The previous DeepSeek round executed 30 items labelled `DL-P0-*`/`DL-P1-*` against a
taskpack that exists nowhere on this disk. That work is now on
`codex/r3-runtime-correctness` (commits `fdef778`, `2a36f87`, `4b10894`, `5631963`)
and its attribution is **unverified**. `DLDS-A030`/`DLDS-A040` classify that delta
file by file; nothing in it is treated as evidence of a completed task until it is
attributed to a real task or marked as out-of-pack.

## Boundaries observed

No `E:` drive access of any kind; no host launch; no GPU; no model download; no
credential read; no private session read; no sibling-project read; no push to
`main`, no merge, no release, no tag.
