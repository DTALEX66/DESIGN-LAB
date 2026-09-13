# SPDX-License-Identifier: MIT
"""Creative Execution OS store: one database, additive migration, no fork.

Wave B (DL-P0-020/021/022/030/031/032/040) extends the existing local state
database with job, lineage, ledger and guard tables. The v1 tables stay frozen:
this module never rewrites ``asset_version`` rows, only adds lineage columns at
migration time. ``.project-local/state/design-lab.db`` remains the single
runtime database; there is no second store, no second writer and no host call.
"""
from __future__ import annotations

from contextlib import contextmanager
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ..runtime.attempt_contract import canonical_hash, request_hash
from ..runtime.paths import PathPolicyError, resolve_paths
from ..runtime.state_resources import state_schema

_SCHEMA = state_schema("design-lab-state-creative-v1.sql")
_BASE_SCHEMA = state_schema("design-lab-state-v1.sql")
_ASSETS_SCHEMA = state_schema("design-lab-state-assets-v1.sql")
_ASSETS_V2_SCHEMA = state_schema("design-lab-state-assets-v2.sql")
_ATTEMPT_SCHEMA = state_schema("design-lab-state-attempt-v1.sql")
_ATTEMPT_V2_SCHEMA = state_schema("design-lab-state-attempt-v2.sql")
MIGRATION = "creative-v1"
# The creative model reads operation_state and attempt_state, so this store
# applies every schema family it depends on and records each migration under the
# same name the owning store uses. Whichever store opens the database first
# applies them; the other then sees the migration already recorded.
GUARDED_MIGRATIONS = (
    ("assets-v2", _ASSETS_V2_SCHEMA, "asset_version"),
    ("attempt-v2", _ATTEMPT_V2_SCHEMA, "attempt_state"),
    (MIGRATION, _SCHEMA, "asset_version"),
)

ASSET_KINDS = ("raster", "vector", "text", "audio", "video", "blend",
               "psd", "ai", "doc", "other")


class CreativeError(RuntimeError):
    """Creative execution contract violation."""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex}"


def digest(value) -> str:
    """Canonicalize a caller-supplied SHA-256 hex digest; nonzero only."""
    try:
        return canonical_hash(value)
    except ValueError as exc:
        raise CreativeError(str(exc)) from exc


def hash_document(document) -> str:
    """Order-independent JSON hash for specs and provider parameters."""
    try:
        return request_hash(document)
    except (TypeError, ValueError) as exc:
        raise CreativeError(f"document is not canonical JSON: {exc}") from exc


def _text(value, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CreativeError(f"{field} must be a nonempty string")
    return value


def _apply_script(conn: sqlite3.Connection, sql: str) -> None:
    statement = ""
    for line in sql.splitlines(keepends=True):
        statement += line
        if sqlite3.complete_statement(statement):
            conn.execute(statement)
            statement = ""
    if statement.strip():
        raise CreativeError("incomplete migration SQL")


@contextmanager
def transaction(conn: sqlite3.Connection):
    """Write APIs own a short IMMEDIATE transaction; caller work is preserved."""
    if conn.in_transaction:
        raise CreativeError("write API requires idle connection; caller transaction is preserved")
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield
        conn.commit()
    except BaseException:
        conn.rollback()
        raise


def connect(db_path, *, project_root=None) -> sqlite3.Connection:
    """Open the shared local state database and apply additive Wave B DDL once.

    A populated database is copied before the migration, mirroring the earlier
    ``assets-v2``/``attempt-v2`` precedent. Re-running is a no-op: the migration
    is recorded in ``runtime_migration`` and ``ALTER TABLE`` never repeats.
    """
    try:
        db_path = resolve_paths(project_root=project_root).database_path(db_path)
    except PathPolicyError as exc:
        raise CreativeError(str(exc)) from exc
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), timeout=15)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(_BASE_SCHEMA.read_text(encoding="utf-8"))
        conn.executescript(_ASSETS_SCHEMA.read_text(encoding="utf-8"))
        conn.executescript(_ATTEMPT_SCHEMA.read_text(encoding="utf-8"))
        conn.execute("CREATE TABLE IF NOT EXISTS runtime_migration (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)")
        conn.commit()
        for name, schema, probe in GUARDED_MIGRATIONS:
            _migrate_once(conn, db_path, name, schema, probe)
        return conn
    except BaseException:
        conn.close()
        raise


def _migrate_once(conn: sqlite3.Connection, db_path: Path, name: str, schema, probe: str) -> None:
    """Apply one guarded migration, backing up a populated database first."""
    if conn.execute("SELECT 1 FROM runtime_migration WHERE name=?", (name,)).fetchone():
        return
    try:
        populated = bool(conn.execute(f"SELECT 1 FROM {probe} LIMIT 1").fetchone())
    except sqlite3.OperationalError:
        populated = False
    if populated:
        backup_path = db_path.with_name(f"{db_path.name}.pre-{name}-{uuid.uuid4().hex}.bak")
        backup = sqlite3.connect(str(backup_path))
        try:
            conn.backup(backup)
        finally:
            backup.close()
    with transaction(conn):
        if not conn.execute("SELECT 1 FROM runtime_migration WHERE name=?", (name,)).fetchone():
            _apply_script(conn, schema.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO runtime_migration VALUES (?, ?)", (name, now()))


def _applied(conn: sqlite3.Connection) -> bool:
    return bool(conn.execute("SELECT 1 FROM runtime_migration WHERE name=?", (MIGRATION,)).fetchone())


def record_intent(conn: sqlite3.Connection, *, scope: str, key: str, document) -> tuple[str, str]:
    """Idempotent operation intent. Same key + same request returns the same ID.

    A reused key with different content fails closed instead of silently
    reusing another job's identity.
    """
    scope = _text(scope, "idempotency scope")
    key = _text(key, "idempotency key")
    request = hash_document(document)
    row = conn.execute("SELECT operation_id, request_hash FROM operation_intent WHERE idempotency_scope=? AND idempotency_key=?",
                       (scope, key)).fetchone()
    if row:
        if row[1] != request:
            raise CreativeError("idempotency key is already bound to different content")
        return row[0], request
    operation_id = new_id("op")
    conn.execute("INSERT INTO operation_intent VALUES (?,?,?,?,?)", (operation_id, scope, key, request, now()))
    return operation_id, request


def require_job(conn: sqlite3.Connection, job_id: str) -> dict:
    row = conn.execute("SELECT job_id, project_id, brief_ref, direction_ref, rights_profile, spec_sha256 "
                       "FROM creative_job WHERE job_id=?", (job_id,)).fetchone()
    if not row:
        raise CreativeError(f"unknown creative job: {job_id!r}")
    return {"job_id": row[0], "project_id": row[1], "brief_ref": row[2],
            "direction_ref": row[3], "rights_profile": row[4], "spec_sha256": row[5]}


def dumps(value) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
