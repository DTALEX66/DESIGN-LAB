# SPDX-License-Identifier: MIT
"""The Record archive must keep equaling what its manifest says it copied.

Task DL-REC-29 landed 259 files from the external `Record` volume and recorded every
one of them (source path, size, CRC32, sha256, target, state) in
`docs/history/record-imports-2026-10-08/RECORD-IMPORT-MANIFEST.json`. A manifest that
nobody re-checks is a claim, not evidence: two ways this archive can silently rot are
(a) someone edits a "frozen" original in place, and (b) git's `* text=auto eol=lf`
normalises a CRLF original at add time, so the worktree looks right while the stored
blob is different. Defect (b) really happened to `06_AUDIT_COVERAGE.csv` during the
import and was caught only because the verifier compares three layers.

This module also makes `scripts/record_import_verify.py` reachable: `canonical-verify.yml`
enumerates gates by name, and `test_gate_reachability` fails any verification script that
no workflow or test invokes.

The external-volume leg runs only where the volume exists; without it the test still
proves the repository's own bytes equal the recorded hashes, and says which leg it ran.
"""
from __future__ import annotations

import json
import subprocess
import sys
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "record_import_verify.py"
MANIFEST_REL = "docs/history/record-imports-2026-10-08/RECORD-IMPORT-MANIFEST.json"
MANIFEST = ROOT / MANIFEST_REL
VOLUME = Path(r"D:\All projects\Record")
IMPORT_PREFIXES = ("docs/history/record-imports-2026-10-08/", "docs/taskpacks/03_DESIGN-LAB_")
REPO_HELD_ACTIONS = ("LANDED", "ALREADY-IN-REPO")


def run_verifier(*flags: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPT), *flags], cwd=str(ROOT),
                          capture_output=True, text=True, encoding="utf-8", errors="replace")


def summary_line(stdout: str) -> dict[str, int]:
    line = next((l for l in stdout.splitlines() if l.startswith("RECORD_VERIFY scope=")), "")
    out: dict[str, int] = {}
    for token in line.split():
        if "=" in token:
            key, _, value = token.partition("=")
            if value.replace(",", "").isdigit():
                out[key] = int(value.replace(",", ""))
    return out


class RecordImportFidelityTests(unittest.TestCase):
    maxDiff = None

    @classmethod
    def setUpClass(cls) -> None:
        if not MANIFEST.is_file():
            raise unittest.SkipTest(f"import manifest missing: {MANIFEST_REL}")
        cls.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        cls.rows = cls.manifest["entries"]

    def test_the_archive_still_equals_what_the_manifest_recorded(self) -> None:
        """Run the shipped verifier and refuse anything but its own OK token."""
        flags = ["--head"] + ([] if VOLUME.is_dir() else ["--offline"])
        result = run_verifier(*flags)
        tail = (result.stdout or "").strip().splitlines()
        self.assertEqual(result.returncode, 0,
                         f"record_import_verify {' '.join(flags)} exited "
                         f"{result.returncode}\n{(result.stdout or '').strip()}\n"
                         f"{(result.stderr or '').strip()}")
        self.assertIn("RECORD_VERIFY=OK", "\n".join(tail), f"no OK verdict in {tail[-3:]}")
        self.assertNotIn("FAIL:", result.stdout or "", "the verifier reported row-level failures")
        scope = "source+repo" if VOLUME.is_dir() else "repo-only"
        self.assertIn(f"scope={scope}", result.stdout or "",
                      "the verifier did not report which legs it actually ran")

    def test_every_repo_held_row_is_accounted_for(self) -> None:
        """worktree_verified must cover every row that claims a repository copy."""
        flags = ["--head"] + ([] if VOLUME.is_dir() else ["--offline"])
        counts = summary_line(run_verifier(*flags).stdout or "")
        expected = sum(1 for r in self.rows if r["action"] in REPO_HELD_ACTIONS)
        self.assertGreater(expected, 0, "the manifest holds no repo rows — the archive vanished")
        self.assertEqual(counts.get("worktree_verified"), expected,
                         f"{counts.get('worktree_verified')} files reconciled but the manifest "
                         f"claims {expected} repo-held rows (LANDED + ALREADY-IN-REPO)")
        self.assertEqual(counts.get("blob_absent"), 0,
                         f"{counts.get('blob_absent')} landed rows have no committed blob — "
                         "the archive is not fully in the repository")

    def test_recorded_hashes_match_the_files_on_disk(self) -> None:
        """Independent recomputation, not just the verifier's own bookkeeping."""
        wrong: list[str] = []
        for row in self.rows:
            if row["action"] not in REPO_HELD_ACTIONS:
                continue
            path = ROOT / row["target"]
            if not path.is_file():
                wrong.append(f"missing {row['target']}")
                continue
            data = path.read_bytes()
            if f"{zlib.crc32(data) & 0xFFFFFFFF:08x}" != row["crc32"]:
                wrong.append(f"crc {row['target']}")
            if len(data) != row["bytes"]:
                wrong.append(f"size {row['target']}")
        self.assertEqual(wrong, [], f"{len(wrong)} archived files disagree with the manifest: "
                                   f"{wrong[:8]}")

    def test_the_frozen_subtree_is_protected_from_line_ending_normalisation(self) -> None:
        """`-text` must stay on the imported subtree, or eol=lf rewrites originals on add.

        Asserted on bytes rather than on `git check-attr` output, because the attribute
        engine's precedence is exactly what a parsing shortcut would get wrong: the rule
        has to win over the repo-wide `* text=auto eol=lf` and over `*.bat text eol=crlf`.
        """
        attrs = (ROOT / ".gitattributes").read_text(encoding="utf-8")
        self.assertIn("docs/history/record-imports-2026-10-08/** -text", attrs,
                      "the byte-frozen import subtree lost its -text protection")
        self.assertIn("docs/taskpacks/03_DESIGN-LAB_* -text", attrs,
                      "the 2026-10-06 request pair lost its -text protection")
        protected = tuple(IMPORT_PREFIXES)
        offenders: list[str] = []
        checked = 0
        for row in self.rows:
            if row["action"] != "LANDED" or not row["target"].startswith(protected):
                continue
            data = (ROOT / row["target"]).read_bytes()
            if b"\r\n" not in data:
                continue
            checked += 1
            blob = subprocess.run(["git", "cat-file", "blob", f"HEAD:{row['target']}"],
                                  cwd=str(ROOT), capture_output=True)
            if blob.returncode != 0 or blob.stdout != data:
                offenders.append(row["target"])
        self.assertGreaterEqual(checked, 1,
                                "no CRLF-bearing landed file was checked — the protection is "
                                "untested, not proven")
        self.assertEqual(offenders, [],
                         f"{len(offenders)} CRLF originals were line-ending-normalised into "
                         f"the repository: {offenders[:5]}")


if __name__ == "__main__":
    unittest.main()
