# SPDX-License-Identifier: MIT
"""ODA4-0101 security regression tests for Open Design Windows scripts.

Verifies the safe revisions actually lack the DANGEROUS CODE PATHS (not just
mentions in docstrings):
- never READ CODEX_HOME/auth.json contents (no read of auth payload)
- never MODIFY CODEX_HOME/config.toml or grant wide writable/trusted roots
- never scan a wide permission root for .od-skills (no rglob wide scan)
- the CLI blocks wide roots, drive roots, E:, and the user home as project targets
- allows an exact deep project path under D:\\All projects
"""
import subprocess
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]  # opendesign-assistance/scripts -> repo root
CONFIGURE = REPO / "opendesign-assistance" / "scripts" / "configure_open_design_windows.py"
DOCTOR = REPO / "opendesign-assistance" / "scripts" / "doctor_open_design_windows.py"

# Code paths that would constitute the dangerous behaviors. Docstrings may
# mention these words; real code must not call them.
DANGEROUS_CALLS = [
    'auth.json", "r"',       # opening auth.json for read
    "read_text(encoding",     # generic (allowed for non-secret config) - checked more precisely below
    "rglob(",                 # wide recursive scan
    'config.toml", "w',       # writing codex config.toml
    "write_text(text,",       # writing back a modified toml string
    "add_trusted_project",    # granting trusted root
    "update_codex_permissions",  # the wide-root granting function
    "writable_roots = [",     # injecting writable root into config
]


class ConfigureSecurityCodePathTest(unittest.TestCase):
    def test_no_auth_payload_read(self):
        src = CONFIGURE.read_text(encoding="utf-8")
        # The only "auth.json" reference must be a presence check (.exists()),
        # never reading the file contents.
        self.assertNotIn('auth.json", "r"', src)
        self.assertNotIn("read_json(auth", src)
        self.assertNotIn("loads(auth.read_text", src)

    def test_no_config_toml_write(self):
        src = CONFIGURE.read_text(encoding="utf-8")
        self.assertNotIn('config.toml", "w', src)
        self.assertNotIn("write_text(text,", src)
        self.assertNotIn("update_codex_permissions", src)
        self.assertNotIn("add_trusted_project", src)
        self.assertNotIn("writable_roots", src)

    def test_no_wide_od_skills_scan(self):
        src = CONFIGURE.read_text(encoding="utf-8")
        self.assertNotIn("rglob(", src)
        self.assertNotIn("discover_od_skill_roots", src)

    def test_doctor_no_auth_payload_read(self):
        src = DOCTOR.read_text(encoding="utf-8")
        self.assertNotIn('auth.json", "r"', src)
        self.assertNotIn("loads(auth.read_text", src)

    def test_doctor_no_od_skills_scan(self):
        src = DOCTOR.read_text(encoding="utf-8")
        self.assertNotIn("rglob(", src)
        self.assertNotIn("discover_od_skill_roots", src)


class ConfigureCLIBehaviorTest(unittest.TestCase):
    def run_cli(self, project_root):
        return subprocess.run(
            [sys.executable, str(CONFIGURE), "--project-root", project_root],
            capture_output=True, text=True,
        )

    def test_exact_project_root_allowed_dry_run(self):
        result = self.run_cli(r"D:\All projects\OPEN-DESIGN-Assistance")
        self.assertNotIn("SECURITY_BLOCK", result.stdout + result.stderr)
        self.assertIn("OPEN_DESIGN_ASSISTANCE_CONFIG_OK", result.stdout)

    def test_wide_root_blocked(self):
        for wide in (r"D:\All projects", "D:\\", "C:\\", "E:\\"):
            result = self.run_cli(wide)
            self.assertIn("SECURITY_BLOCK", result.stdout + result.stderr)

    def test_e_drive_blocked(self):
        result = self.run_cli(r"E:\x")
        self.assertIn("SECURITY_BLOCK", result.stdout + result.stderr)

    def test_user_home_blocked(self):
        result = self.run_cli(r"C:\Users\ALEX")
        self.assertIn("SECURITY_BLOCK", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
