# SPDX-License-Identifier: MIT
"""DL-TP-T05 (MULTIMODAL-2026-09-05): local asset/artifact registry + single-writer lock.

Pure-local structural layer (no host). Data set per plan §8: Project,
AssetVersion, Artifact, dependency edges. Guarantees:
- restart-recoverable: every committed write is durable in SQLite;
- duplicate retry is idempotent: same (asset_id, content_sha256) returns the
  existing version instead of double-creating;
- a failed/cancelled attempt is never reported as a completed version;
- single-writer per document: a second writer must either wait or take over
  explicitly; takeover is recorded, never silent.
"""
from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

_SCHEMA = Path(__file__).resolve().parents[3] / "design-lab" / "schemas" / "state" / "design-lab-state-assets-v1.sql"
_BASE_SCHEMA = Path(__file__).resolve().parents[3] / "design-lab" / "schemas" / "state" / "design-lab-state-v1.sql"


class AssetError(RuntimeError):
    """Asset registry contract violation."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(db_path: Path) -> sqlite3.Connection:
    """Open (create if needed) the local asset DB with both schemas applied."""
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")
    if _BASE_SCHEMA.exists():
        conn.executescript(_BASE_SCHEMA.read_text(encoding="utf-8"))
    conn.executescript(_SCHEMA.read_text(encoding="utf-8"))
    conn.commit()
    return conn


def create_project(conn: sqlite3.Connection, project_id: str, display_name: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO project (project_id, display_name, created_at) VALUES (?,?,?)",
        (project_id, display_name, _now()),
    )
    conn.commit()


def register_asset(
    conn: sqlite3.Connection, project_id: str, asset_id: str, asset_kind: str
) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO asset (asset_id, project_id, asset_kind, created_at) VALUES (?,?,?,?)",
        (asset_id, project_id, asset_kind, _now()),
    )
    conn.commit()


def record_version(
    conn: sqlite3.Connection,
    asset_id: str,
    content_sha256: str,
    *,
    state: str = "ACTIVE",
    artifacts: Iterable[tuple[str, str | None, int | None, str]] = (),
    attempt_id: str | None = None,
) -> str:
    """Insert one asset version idempotently by (asset_id, content_sha256).

    Returns the version_id. A retry with identical content returns the existing
    version (no double artifact rows). FAILED/CANCELLED are recorded verbatim
    and are never rewritten to ACTIVE by a retry.
    """
    if state not in ("PENDING", "ACTIVE", "SUPERSEDED", "FAILED", "CANCELLED"):
        raise AssetError(f"invalid version state: {state!r}")
    existing = conn.execute(
        "SELECT version_id FROM asset_version WHERE asset_id=? AND content_sha256=?",
        (asset_id, content_sha256),
    ).fetchone()
    if existing:
        return str(existing[0])
    try:
        version_no = int(
            conn.execute(
                "SELECT COALESCE(MAX(version_no),0)+1 FROM asset_version WHERE asset_id=?",
                (asset_id,),
            ).fetchone()[0]
        )
    except (TypeError, ValueError):
        version_no = 1
    version_id = f"v-{asset_id}-{uuid.uuid4().hex[:12]}"
    conn.execute(
        "INSERT INTO asset_version (version_id, asset_id, version_no, content_sha256, state, created_at) "
        "VALUES (?,?,?,?,?,?)",
        (version_id, asset_id, version_no, content_sha256, state, _now()),
    )
    for artifact_id, sha, size, role in artifacts:
        conn.execute(
            "INSERT INTO artifact (artifact_id, version_id, path, sha256, byte_size, role) VALUES (?,?,?,?,?,?)",
            (artifact_id or f"a-{uuid.uuid4().hex[:12]}", version_id, artifact_id or "", sha, size, role),
        )
    if attempt_id:
        # provenance link into the attempt ledger is appended in the audit trail
        conn.execute(
            "INSERT OR IGNORE INTO audit_event (audit_id, actor, action, at) VALUES (?,?,?,?)",
            (uuid.uuid4().hex, attempt_id, f"asset_version_created:{version_id}", _now()),
        )
    conn.commit()
    return version_id


def latest_active_version(conn: sqlite3.Connection, asset_id: str) -> dict | None:
    row = conn.execute(
        "SELECT version_id, version_no, content_sha256, state, created_at "
        "FROM asset_version WHERE asset_id=? AND state='ACTIVE' "
        "ORDER BY version_no DESC LIMIT 1",
        (asset_id,),
    ).fetchone()
    if row is None:
        return None
    return {
        "version_id": row[0],
        "version_no": row[1],
        "content_sha256": row[2],
        "state": row[3],
        "created_at": row[4],
    }


# --- single-writer document lock ---------------------------------------------

def acquire_writer(conn: sqlite3.Connection, resource_key: str, holder_attempt_id: str) -> bool:
    """Best-effort acquire. False when held by someone else (no silent takeover)."""
    existing = conn.execute(
        "SELECT state FROM asset_writer_lock WHERE resource_key=?", (resource_key,)
    ).fetchone()
    if existing is not None and existing[0] == "HELD":
        return False
    if existing is None:
        conn.execute(
            "INSERT INTO asset_writer_lock (resource_key, holder_attempt_id, generation, state, acquired_at) "
            "VALUES (?,?,1,'HELD',?)",
            (resource_key, holder_attempt_id, _now()),
        )
    else:
        gen = int(conn.execute(
            "SELECT generation FROM asset_writer_lock WHERE resource_key=?", (resource_key,)
        ).fetchone()[0]) + 1
        conn.execute(
            "UPDATE asset_writer_lock SET holder_attempt_id=?, generation=?, state='HELD', acquired_at=? "
            "WHERE resource_key=?",
            (holder_attempt_id, gen, _now(), resource_key),
        )
    conn.commit()
    return True


def takeover_writer(conn: sqlite3.Connection, resource_key: str, holder_attempt_id: str) -> None:
    """Explicit, recorded takeover (user handover). Never silent."""
    cur = conn.execute(
        "UPDATE asset_writer_lock SET holder_attempt_id=?, generation=generation+1, state='HELD', acquired_at=? "
        "WHERE resource_key=?",
        (holder_attempt_id, _now(), resource_key),
    )
    if cur.rowcount == 0:
        conn.execute(
            "INSERT INTO asset_writer_lock (resource_key, holder_attempt_id, generation, state, acquired_at) "
            "VALUES (?,?,1,'HELD',?)",
            (resource_key, holder_attempt_id, _now()),
        )
    conn.execute(
        "INSERT OR IGNORE INTO audit_event (audit_id, actor, action, at) VALUES (?,?,?,?)",
        (uuid.uuid4().hex, holder_attempt_id, f"writer_takeover:{resource_key}", _now()),
    )
    conn.commit()


def release_writer(conn: sqlite3.Connection, resource_key: str, holder_attempt_id: str) -> bool:
    cur = conn.execute(
        "UPDATE asset_writer_lock SET state='RELEASED' "
        "WHERE resource_key=? AND holder_attempt_id=? AND state='HELD'",
        (resource_key, holder_attempt_id),
    )
    conn.commit()
    return cur.rowcount == 1
