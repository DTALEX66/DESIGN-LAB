# SPDX-License-Identifier: MIT
"""DL-TP-T05 (MULTIMODAL-2026-09-05): durable Job/Attempt state service.

Complements OperationCoordinator (in-memory transitions) with a restart-
recoverable attempt ledger. Guarantees:
- begin_attempt is idempotent (no duplicate attempt rows on retry);
- a terminal state (RECEIPTED/FAILED/TIMED_OUT/CANCELLED) cannot transition
  back to RUNNING/PENDING (a failed attempt is never reported completed);
- restart recovery reads the latest attempt status straight from SQLite.
"""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

_SCHEMA = Path(__file__).resolve().parents[3] / "design-lab" / "schemas" / "state" / "design-lab-state-attempt-v1.sql"
_BASE_SCHEMA = Path(__file__).resolve().parents[3] / "design-lab" / "schemas" / "state" / "design-lab-state-v1.sql"

TERMINAL = {"RECEIPTED", "FAILED", "TIMED_OUT", "CANCELLED"}
VALID_STATES = {"PENDING", "RUNNING", "RECEIPTED", "FAILED", "TIMED_OUT", "CANCELLED"}
# transition map: state -> allowed next states
ALLOWED = {
    "PENDING": {"RUNNING", "CANCELLED", "FAILED"},
    "RUNNING": {"RECEIPTED", "FAILED", "TIMED_OUT", "CANCELLED"},
    "RECEIPTED": set(),
    "FAILED": set(),
    "TIMED_OUT": set(),
    "CANCELLED": set(),
}


class AttemptError(RuntimeError):
    """Attempt state contract violation."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(db_path: Path) -> sqlite3.Connection:
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    if _BASE_SCHEMA.exists():
        conn.executescript(_BASE_SCHEMA.read_text(encoding="utf-8"))
    conn.executescript(_SCHEMA.read_text(encoding="utf-8"))
    conn.commit()
    return conn


def _ensure_operation(conn: sqlite3.Connection, operation_id: str, idempotency_scope: str, idempotency_key: str, request_hash: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO operation_intent (operation_id, idempotency_scope, idempotency_key, request_hash, created_at) "
        "VALUES (?,?,?,?,?)",
        (operation_id, idempotency_scope, idempotency_key, request_hash, _now()),
    )


def _ensure_job(conn: sqlite3.Connection, job_id: str, operation_id: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO job (job_id, operation_id, schemaVersion) VALUES (?,?,?)",
        (job_id, operation_id, "design-lab/job-spec/v1"),
    )


def begin_attempt(
    conn: sqlite3.Connection,
    job_id: str,
    *,
    operation_id: str,
    idempotency_scope: str,
    idempotency_key: str,
    request_hash: str,
) -> dict:
    """Idempotently create a new attempt for a job. Returns the attempt record.

    A retry with the same job_id returns the existing PENDING attempt (no
    duplicate row) if it has not started; if a terminal attempt already exists,
    a retry still returns that terminal record instead of fabricating a fresh
    one (so callers can't silently 'reset' a finished attempt).
    """
    _ensure_operation(conn, operation_id, idempotency_scope, idempotency_key, request_hash)
    _ensure_job(conn, job_id, operation_id)
    existing = conn.execute(
        "SELECT attempt_id, attempt_no, state FROM attempt_state WHERE job_id=? ORDER BY attempt_no DESC LIMIT 1",
        (job_id,),
    ).fetchone()
    if existing is not None:
        if existing[2] in TERMINAL:
            conn.commit()
            return _record(conn, existing[0])
        # non-terminal PENDING/RUNNING: idempotent — return existing
        conn.commit()
        return _record(conn, existing[0])
    attempt_no = int(conn.execute(
        "SELECT COALESCE(MAX(attempt_no),0)+1 FROM attempt_state WHERE job_id=?", (job_id,)
    ).fetchone()[0])
    attempt_id = f"att-{uuid.uuid4().hex[:12]}"
    conn.execute(
        "INSERT INTO attempt_state (attempt_id, job_id, attempt_no, state, started_at) VALUES (?,?,?,?,?)",
        (attempt_id, job_id, attempt_no, "PENDING", _now()),
    )
    conn.execute(
        "INSERT INTO job_attempt (job_id, attempt_no, started_at) VALUES (?,?,?)",
        (job_id, attempt_no, _now()),
    )
    conn.commit()
    return _record(conn, attempt_id)


def transition(conn: sqlite3.Connection, attempt_id: str, new_state: str, *, note: str | None = None) -> dict:
    """Apply one allowed transition. Rejects terminal->non-terminal rewrites."""
    if new_state not in VALID_STATES:
        raise AttemptError(f"invalid attempt state: {new_state!r}")
    row = conn.execute(
        "SELECT state FROM attempt_state WHERE attempt_id=?", (attempt_id,)
    ).fetchone()
    if row is None:
        raise AttemptError(f"unknown attempt_id: {attempt_id!r}")
    current = row[0]
    if current in TERMINAL:
        if new_state != current:
            raise AttemptError(f"attempt {attempt_id} already terminal ({current}); cannot move to {new_state}")
        conn.commit()
        return _record(conn, attempt_id)
    if new_state not in ALLOWED[current]:
        raise AttemptError(f"attempt {attempt_id}: {current} -> {new_state} not allowed")
    ended = _now() if new_state in TERMINAL else None
    conn.execute(
        "UPDATE attempt_state SET state=?, ended_at=?, note=? WHERE attempt_id=?",
        (new_state, ended, note, attempt_id),
    )
    conn.commit()
    return _record(conn, attempt_id)


def latest_attempt(conn: sqlite3.Connection, job_id: str) -> dict | None:
    row = conn.execute(
        "SELECT attempt_id FROM attempt_state WHERE job_id=? ORDER BY attempt_no DESC LIMIT 1",
        (job_id,),
    ).fetchone()
    if row is None:
        return None
    return _record(conn, row[0])


def _record(conn: sqlite3.Connection, attempt_id: str) -> dict:
    row = conn.execute(
        "SELECT attempt_id, job_id, attempt_no, state, started_at, ended_at, note "
        "FROM attempt_state WHERE attempt_id=?",
        (attempt_id,),
    ).fetchone()
    return {
        "attempt_id": row[0],
        "job_id": row[1],
        "attempt_no": row[2],
        "state": row[3],
        "started_at": row[4],
        "ended_at": row[5],
        "note": row[6],
    }
