# LANGUAGE POLICY — DESIGN-LAB

- **Task**: `DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-C010` (facts: `DLDS-C000`)
- **Status**: frozen policy; enforcement gap recorded honestly
- **Evidence**: `reports/current/LANGUAGE-INVENTORY.json` (generator:
  `scripts/deepseek_language_inventory.py`, `--check` verifies no drift)
- **Measured at**: 1,843 tracked files; Python 367 files / 58,835 non-blank lines;
  Markdown 646 files; JSON 538 files

This policy adopts the authority taskpack's section 16 table and states, for each
language, both the authority it holds and the toolchain that actually exists
today. A language listed here may be used for its declared responsibility and
for nothing else; a language that is not listed may not be introduced.

## 1. Authority by language

| Language | Sole authority for | May not be used for |
|---|---|---|
| **Python** | orchestration, runtime and state, QA, provider logic, reconstruction, analysis, CLI and tooling | the front end; host-native in-process automation |
| **TypeScript** | Workbench UI, OpenDesign/web integration, MCP client, IPC/web front end | runtime state, model or provider orchestration |
| **Host-native JavaScript (JSX/UXP)** | Adobe UXP / host-native extension scripts | anything the Python runtime owns |
| **JSON / JSON Schema 2020-12** | the cross-language contract truth: status values, asset types, operation types, rights states, evidence levels | free-form application logic |
| **Rust** | `NOT_PRIMARY`. Permitted only for geometry, image diff, media scanning, native watcher or an equally bounded performance helper, and only with benchmark evidence **plus** an ADR naming the bottleneck | as a new default language for any existing component |
| **SQL** | the local state schema only | business logic that belongs in the runtime |
| **PowerShell / Shell** | thin launchers | orchestration logic |

## 2. Forbidden without an ADR (`DLDS-C020`)

`C#`, `Go`, `Java`, `Kotlin`, `C++`, a second Python runtime architecture, and a
second Node back end. "Some library is written in that language" is not a reason
to introduce it as a primary language; the library is consumed through a
provider or adapter boundary, not adopted as a language.

## 3. Python (`DLDS-C030`) — measured state

| Fact | State |
|---|---|
| Build system | `hatchling` via `pyproject.toml [build-system]` |
| Source layout | `src/` layout (`src/design_lab`) with `packages/capabilities` force-included into the wheel |
| Dependency truth | `pyproject.toml [project].dependencies` |
| Resolution truth | `uv.lock`; CI runs `uv sync --locked` |
| Test runner | `unittest`, discovered and run by `scripts/run_python_tests.py` |
| `[tool.pytest.ini_options]` | present (`testpaths = design-lab/tests`) but **pytest is not installed**; the suite is unittest-based |
| `requirements.txt` | the **root install manifest for the reconstruction core**: it pins `jsonschema`, `rpds-py` and includes `packages/capabilities/reconstruction/requirements-core.in`. It is a tested contract — `design-lab/tests/test_reconstruction_intake.py::test_root_requirements_install_manifest_resolves_core_dependencies` parses it — and it is **not** the product dependency truth. Product dependencies live in `pyproject.toml`; the two lists are different on purpose and must not be merged by hand |
| linter/formatter | **ruff is the declared target and is not configured or installed** |

### Honest gap: ruff

`DLDS-C030` asks for `ruff` as part of the unified Python toolchain. It is *not*
added here, deliberately:

1. `uv.lock` is the resolution truth and CI runs `uv sync --locked`; adding a
   dependency (or touching project metadata) without regenerating the lock would
   break the gate.
2. Regenerating the lock needs `uv` and a network fetch. **`uv` is not installed
   on this machine**, so the change could not be verified locally — and an
   unverifiable lock change must not be made.
3. The taskpack's own supply chain rule (`DLDS-G040`) requires a new dependency
   to carry owner, reason, license, exact version and rollback before it is added.

**Required action for the owner or Codex**: add a dev dependency group with a
pinned `ruff==<version>`, run `uv lock`, verify `uv sync --locked`, and record the
licence (MIT) and rollback (remove the group). Until then the policy records
`ruff: DECLARED_NOT_ENFORCED`, and nothing in this repository claims that linting
runs.

What *is* unified today, measured: one `pyproject.toml`, one `uv.lock`, `src/`
layout with `packages/capabilities` force-included, zero `sys.path` manipulation
inside `src/`, and `unittest` discovery through `scripts/run_python_tests.py`.

## 4. TypeScript / Node (`DLDS-C040`) — measured state

| Fact | State |
|---|---|
| Product Node build | **none**: `apps/workbench/main.ts` is served as source, exactly as `04-REPOSITORY-LANGUAGE.md` warns ("浏览器可执行语法子集，不等于 strict TypeScript 已验收") |
| Root `package.json` | absent |
| Lockfile | absent |
| `package.json` in tree | one, at `fixtures/domains/game-visual/package.json`, scoped to a Domain fixture (`"private": true`, node scripts only) — it is **not** a product workspace |
| Node compatibility range | undeclared |

### The rule this fixes

There is one package manager, one lockfile and one workspace boundary **or there
is no Node product build at all**. Today the second is true, and that is now
stated instead of being inferred. If Any product-consumed npm dependency appears:

1. it is added at a single workspace root with `pnpm` and a committed
   `pnpm-lock.yaml`;
2. `engines.node` states the supported range, and CI pins that Node version;
3. the fixture `package.json` stays fixture-scoped and never becomes the
   workspace root;
4. `npm`, `yarn` and `pnpm` never coexist as three truths.

## 5. Cross-language contract gate (`DLDS-C050`)

Enums, status vocabularies and identifier lists are **not** copied by hand
between Python, TypeScript and host-native JavaScript. The authority is the
JSON Schema or the versioned contract file; each language either validates
against it or generates from it.

Covered vocabularies: task and run `status`, asset types, operation types, rights
states, evidence levels (E0–E5).

Where this is violated today, the violation is recorded by
`scripts/verify_language_boundary.py` rather than fixed silently, because a
silent rewrite of an enum across languages is exactly the kind of change that
needs its own task, tests and rollback.

## 6. What this policy does not do

It does not rewrite `main.ts` into a built TypeScript project, does not add a
Node toolchain, does not install ruff, and does not move `design-lab/**`. Each of
those is a migration with its own callers, hashes and rollback.
