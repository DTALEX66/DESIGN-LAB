# SPDX-License-Identifier: MIT
"""DL-P0-040 WORK-LAB session link: correlation only, never session content.

DESIGN-LAB does not own WORK-LAB's global configuration, permissions, tasks or
Observer state. This module stores an opaque reference so a design job can be
traced back to the session that requested it — nothing else. Transcripts,
prompts, replies, credentials, file paths and user identifiers are rejected by
shape, so a caller cannot accidentally mirror a private session into this
repository's state database.
"""
from __future__ import annotations

import re

from .store import CreativeError, new_id, now, require_job, transaction

SOURCE_SYSTEMS = ("WORK-LAB", "DESIGN-LAB", "ArcheAxis")
_ALLOWED_FIELDS = {"session_ref", "source_system", "note"}
_OPAQUE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$")
_MAX_NOTE = 200


def _session_ref(value) -> str:
    if not isinstance(value, str) or not _OPAQUE.match(value):
        raise CreativeError("session_ref must be an opaque id (letters, digits, . _ : -), not a path or payload")
    if ".." in value:
        raise CreativeError("session_ref must be an opaque id, not a relative path")
    return value


def _note(value):
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise CreativeError("note must be a nonempty string or null")
    if len(value) > _MAX_NOTE or "\n" in value or "\r" in value:
        raise CreativeError("note is a short correlation remark, not transcript content")
    return value


def assert_correlation_only(payload) -> dict:
    """Reject any attempt to attach session content to a link."""
    if not isinstance(payload, dict):
        raise CreativeError("session link payload must be an object")
    unknown = set(payload) - _ALLOWED_FIELDS
    if unknown:
        raise CreativeError("session links carry correlation only; refused fields: " + ", ".join(sorted(unknown)))
    return payload


def link_session(conn, job_id: str, *, session_ref: str, source_system: str = "WORK-LAB",
                 note=None) -> dict:
    """Bind a job to a session reference. Re-linking the same pair is idempotent."""
    require_job(conn, job_id)
    session_ref = _session_ref(session_ref)
    if source_system not in SOURCE_SYSTEMS:
        raise CreativeError(f"unknown source system: {source_system!r}")
    note = _note(note)
    with transaction(conn):
        row = conn.execute("SELECT link_id, note, linked_at FROM worklab_session_link "
                           "WHERE job_id=? AND session_ref=?", (job_id, session_ref)).fetchone()
        if row:
            return {"link_id": row[0], "job_id": job_id, "session_ref": session_ref,
                    "source_system": source_system, "note": row[1], "linked_at": row[2], "created": False}
        link_id = new_id("lnk")
        stamp = now()
        conn.execute("INSERT INTO worklab_session_link VALUES (?,?,?,?,?,?)",
                     (link_id, job_id, session_ref, source_system, note, stamp))
        return {"link_id": link_id, "job_id": job_id, "session_ref": session_ref,
                "source_system": source_system, "note": note, "linked_at": stamp, "created": True}


def links(conn, job_id: str) -> list:
    require_job(conn, job_id)
    return [{"link_id": row[0], "session_ref": row[1], "source_system": row[2], "note": row[3],
             "linked_at": row[4]} for row in conn.execute(
        "SELECT link_id, session_ref, source_system, note, linked_at FROM worklab_session_link "
        "WHERE job_id=? ORDER BY linked_at", (job_id,))]


def unlink(conn, link_id: str) -> bool:
    with transaction(conn):
        cursor = conn.execute("DELETE FROM worklab_session_link WHERE link_id=?", (link_id,))
        return cursor.rowcount > 0


def summary(conn, job_id: str) -> dict:
    """Counts and opaque ids only; no session content is ever projected."""
    items = links(conn, job_id)
    return {"job_id": job_id, "link_count": len(items),
            "session_refs": sorted(item["session_ref"] for item in items),
            "source_systems": sorted({item["source_system"] for item in items}),
            "contains_session_content": False,
            "boundary": "correlation only"}


def strip_links(conn, session_ref: str) -> int:
    """Remove every link for a session reference (retention/deletion request)."""
    session_ref = _session_ref(session_ref)
    with transaction(conn):
        cursor = conn.execute("DELETE FROM worklab_session_link WHERE session_ref=?", (session_ref,))
        return cursor.rowcount
