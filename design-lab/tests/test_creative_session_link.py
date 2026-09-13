# SPDX-License-Identifier: MIT
"""DL-P0-040 WORK-LAB session link: correlation only, no session content."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src"
sys.path.insert(0, str(SRC))

from design_lab.creative import creative_job, session_link, store  # noqa: E402


def brief():
    return {
        "schemaVersion": "design-lab/creative-job/v1",
        "project_id": "p-session",
        "brief_ref": {"brief_id": "brief-session", "sha256": "sha256:" + "a" * 64},
        "rights_profile": {"profile_id": "rights-1", "gate_state": "CHECKED"},
        "deliverables": [{"deliverable_id": "poster", "asset_kind": "psd",
                          "host_target": "photoshop-2025", "editable": True}],
        "host_targets": [{"host_id": "photoshop-2025", "mode": "process-isolated",
                          "editable_source": True, "evidence_level": "E2"}],
    }


class SessionLinkTests(unittest.TestCase):
    def setUp(self):
        parent = ROOT / '.project-local/task-runtime/creative-session-tests'
        parent.mkdir(parents=True, exist_ok=True)
        temporary = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(temporary.cleanup)
        self.conn = store.connect(Path(temporary.name) / 'creative.db')
        self.addCleanup(self.conn.close)
        created = creative_job.create_job(self.conn, brief(), idempotency_scope="s", idempotency_key="job")
        self.job_id = created["job_id"]

    def test_link_is_idempotent(self):
        first = session_link.link_session(self.conn, self.job_id, session_ref="wl-2026-09-13-001")
        second = session_link.link_session(self.conn, self.job_id, session_ref="wl-2026-09-13-001")
        self.assertTrue(first["created"])
        self.assertFalse(second["created"])
        self.assertEqual(first["link_id"], second["link_id"])

    def test_reference_must_be_opaque_not_a_path_or_payload(self):
        for bad in ("../../secrets", "C:/Users/ALEX/session.json", "session ref", "a" * 65, "",
                    "user@example.com"):
            with self.subTest(bad=bad), self.assertRaises(store.CreativeError):
                session_link.link_session(self.conn, self.job_id, session_ref=bad)

    def test_session_content_cannot_be_attached(self):
        with self.assertRaisesRegex(store.CreativeError, "correlation only"):
            session_link.assert_correlation_only({"session_ref": "wl-1", "transcript": "user: hi"})
        with self.assertRaisesRegex(store.CreativeError, "refused fields"):
            session_link.assert_correlation_only({"session_ref": "wl-1", "prompt": "make it pop"})
        session_link.assert_correlation_only({"session_ref": "wl-1", "source_system": "WORK-LAB",
                                              "note": "requested by the packaging review"})

    def test_note_is_a_short_remark_not_a_transcript(self):
        with self.assertRaisesRegex(store.CreativeError, "not transcript content"):
            session_link.link_session(self.conn, self.job_id, session_ref="wl-1",
                                      note="line one\nline two")
        with self.assertRaisesRegex(store.CreativeError, "short correlation remark"):
            session_link.link_session(self.conn, self.job_id, session_ref="wl-1", note="x" * 201)

    def test_unknown_source_system_is_refused(self):
        with self.assertRaisesRegex(store.CreativeError, "unknown source system"):
            session_link.link_session(self.conn, self.job_id, session_ref="wl-1", source_system="OpenHuman")

    def test_summary_projects_counts_and_opaque_ids_only(self):
        session_link.link_session(self.conn, self.job_id, session_ref="wl-1", note="requested by review")
        session_link.link_session(self.conn, self.job_id, session_ref="wl-2", source_system="ArcheAxis")
        summary = session_link.summary(self.conn, self.job_id)
        self.assertEqual(summary["link_count"], 2)
        self.assertEqual(summary["session_refs"], ["wl-1", "wl-2"])
        self.assertFalse(summary["contains_session_content"])
        self.assertEqual(set(summary), {"job_id", "link_count", "session_refs", "source_systems",
                                        "contains_session_content", "boundary"})

    def test_links_can_be_withdrawn_by_reference(self):
        session_link.link_session(self.conn, self.job_id, session_ref="wl-1")
        session_link.link_session(self.conn, self.job_id, session_ref="wl-2")
        self.assertEqual(session_link.strip_links(self.conn, "wl-1"), 1)
        self.assertEqual([item["session_ref"] for item in session_link.links(self.conn, self.job_id)], ["wl-2"])

    def test_unlink_removes_a_single_link(self):
        link = session_link.link_session(self.conn, self.job_id, session_ref="wl-1")
        self.assertTrue(session_link.unlink(self.conn, link["link_id"]))
        self.assertFalse(session_link.unlink(self.conn, link["link_id"]))


if __name__ == "__main__":
    unittest.main()
