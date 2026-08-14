# Reproducible Dependencies & Test Entrypoints (ODA4-0103)

## Python
- Sole schema-validation dependency: `jsonschema` (used by evidence-card,
  Domain Pack, and object-model verifiers).
- Locked in `requirements.txt` (`jsonschema>=4.18,<5`).
- Install: `python -m pip install -r requirements.txt`
- Test entrypoint: `python scripts/run_python_tests.py`
  - Discovers all `design-lab/tests/test_*.py` (unittest).
  - Current baseline: **180 tests** (includes ODA4-0101 security regression suite).

## Node (MiniGame runtime)
- Zero external npm dependencies (pure Node scripts + built-ins).
- Test: `npm test` (in `minigame-runtime/`) → `node scripts/run-tests.cjs` — **319 tests**.
- Verify: `npm run verify` → `node scripts/verify-all.cjs`.
- Drift gate: `node scripts/check-android-drift.mjs` — ensures committed bundles
  match rebuilt output (deterministic). Verified: `npm test` does NOT dirty the
  worktree / regenerate committed bundles post-ODA4-0105.

## Root CI usage (ODA4-0104)
- Python: `pip install -r requirements.txt && python scripts/run_python_tests.py`
- Node: `cd minigame-runtime && npm test && node scripts/check-android-drift.mjs --check`
- Verifiers: `python design-lab/scripts/verify_*.py`
- Release attempt: manually dispatch `.github/workflows/release-gate.yml`; it is
  fail-closed and requires the release gate plus a validated
  `design-lab/config/release-evidence.json`.
