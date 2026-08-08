#!/usr/bin/env python
# SPDX-License-Identifier: MIT
"""Configure Open Design on Windows to reuse this assistance repo (SAFE revision).

ODA4-0101 security remediation:
- Does NOT read CODEX_HOME/auth.json content (only checks the file exists).
- Does NOT modify CODEX_HOME/config.toml or grant any wide writable/trusted root.
- Does NOT scan a wide permission root for .od-skills.
- Does NOT write the Open Design private app-config.json by default; only a
  project-scoped dry-run report is produced unless --apply is explicitly given,
  and even then only the exact project root is touched (never D:\\All projects).
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

DEFAULT_MODEL = "gpt-5.5"
DEFAULT_PROXY = "http://127.0.0.1:7890"
LOCATION_ID = "loc_open_design_assistance"
# Wide root is intentionally NOT a default. Caller must pass an exact project path.
DEFAULT_PROJECT_ROOT = Path.cwd()


def windows_home() -> Path:
    return Path(os.environ.get("USERPROFILE") or Path.home())


def default_config_path() -> Path:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        appdata = str(windows_home() / "AppData" / "Roaming")
    return Path(appdata) / "Open Design" / "namespaces" / "release-stable-win" / "data" / "app-config.json"


def default_open_design_exe() -> Path:
    return Path(r"D:\Programs\Open Design\Open Design.exe")


def default_codex_home() -> Path:
    return windows_home() / ".codex"


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def find_codex_bin(explicit: str | None, required: bool) -> str | None:
    if explicit:
        return str(Path(explicit))
    candidates: list[Path] = []
    home = windows_home()
    codex_root = home / "AppData" / "Local" / "OpenAI" / "Codex" / "bin"
    if codex_root.exists():
        candidates.extend(sorted(codex_root.glob("*/codex.exe"), reverse=True))
        candidates.extend(sorted(codex_root.glob("*/codex.cmd"), reverse=True))
    for name in ("codex.cmd", "codex.exe", "codex"):
        found = shutil.which(name)
        if found:
            candidates.append(Path(found))
    if not candidates:
        if not required:
            # Dry-run: absence of Codex is informational, not fatal.
            return None
        raise SystemExit(
            "Could not find Codex CLI. Install/log in to Codex first, then pass --codex-bin explicitly."
        )
    return str(candidates[0])


def codex_auth_present(codex_home: Path) -> bool:
    """Presence-only check. NEVER reads auth.json contents."""
    return (codex_home / "auth.json").exists()


def smoke_codex(codex_bin: str, codex_home: Path) -> str:
    env = os.environ.copy()
    env["CODEX_HOME"] = str(codex_home)
    proc = subprocess_run([codex_bin, "--version"], env=env)
    return proc.strip()


def subprocess_run(argv: list[str], env: dict[str, str]) -> str:
    import subprocess
    proc = subprocess.run(
        argv,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        timeout=30,
    )
    if proc.returncode != 0:
        raise SystemExit(proc.stdout)
    return proc.stdout


def build_project_location(project_root: Path) -> dict[str, Any]:
    """Build a minimal Open Design project-location entry for the exact project root only."""
    return {"id": LOCATION_ID, "name": "OPEN-DESIGN-Assistance", "path": str(project_root)}


def create_launcher(
    launcher_path: Path,
    open_design_exe: Path,
    codex_bin: str,
    codex_home: Path,
    proxy: str | None,
    apply: bool,
) -> None:
    lines = ["@echo off"]
    if proxy:
        lines.extend([
            f'set "HTTP_PROXY={proxy}"',
            f'set "HTTPS_PROXY={proxy}"',
        ])
    lines.extend([
        f'set "CODEX_BIN={codex_bin}"',
        f'set "CODEX_HOME={codex_home}"',
        f'start "Open Design" "{open_design_exe}"',
        "",
    ])
    if not apply:
        print("[dry-run] would write launcher:", launcher_path)
        return
    launcher_path.parent.mkdir(parents=True, exist_ok=True)
    launcher_path.write_text("\r\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Configure Open Design for OPEN-DESIGN-Assistance reuse on Windows (safe revision)."
    )
    parser.add_argument("--project-root", default=str(DEFAULT_PROJECT_ROOT),
                        help="Exact OPEN-DESIGN-Assistance directory (must be an explicit project path, never a wide root)")
    parser.add_argument("--config", default=str(default_config_path()), help="Open Design app-config.json path")
    parser.add_argument("--open-design-exe", default=str(default_open_design_exe()), help="Open Design.exe path")
    parser.add_argument("--codex-bin", default=None, help="Native codex.exe/codex.cmd path; auto-detected when omitted")
    parser.add_argument("--codex-home", default=str(default_codex_home()), help="Codex home (presence-only OAuth check)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Codex model shown in Open Design")
    parser.add_argument("--launcher", default=None, help="Optional launcher .bat path")
    parser.add_argument("--no-proxy", action="store_true", help="Do not put proxy env vars into launcher")
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Validate and print planned config without writing (default; the only safe mode)")
    parser.add_argument("--apply", action="store_true",
                        help="EXPLICIT opt-in to write. Requires an exact project root; wide roots are rejected.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(args.project_root).resolve()
    config_path = Path(args.config)
    codex_home = Path(args.codex_home)

    # Security guard: reject a wide root as the PROJECT target. A wide root is
    # exactly a drive root, the user home, or the D:\All projects parent itself.
    # Deep exact project sub-paths under D:\All projects ARE allowed.
    def norm_root(p: Path) -> str:
        return str(p).replace("/", "\\").rstrip("\\").lower()
    project_norm = norm_root(project_root)
    # Wide roots expressed as exact normalized values (drive roots, home, parent).
    drive_roots = {norm_root(Path(f"{d}:\\")) for d in ("C", "D", "E", "F")}
    wide_exact = {norm_root(Path(r"D:\All projects")), norm_root(Path(r"C:\Users"))}
    wide_exact |= drive_roots
    if project_norm in wide_exact:
        raise SystemExit(
            "SECURITY_BLOCK: wide root supplied as project target. Refusing to configure. "
            "Pass an exact project directory such as D:\\All projects\\OPEN-DESIGN-Assistance."
        )
    # Additionally forbid E: entirely; and forbid the user home as a project target.
    user_home_norm = norm_root(windows_home())
    if project_norm.startswith("e:") or project_norm == user_home_norm:
        raise SystemExit("SECURITY_BLOCK: forbidden root (E: drive or user home). Refusing to configure.")


    if not project_root.exists():
        raise SystemExit(f"Project root does not exist: {project_root}")

    # Tool detection runs AFTER the security boundary so the guard is fail-closed
    # even when the environment lacks Codex CLI (e.g. a CI runner).
    # Codex is only required for --apply; dry-run tolerates its absence.
    codex_bin = find_codex_bin(args.codex_bin, required=args.apply)

    # Presence-only OAuth check (never reads content).
    auth_ok = codex_auth_present(codex_home)
    if not auth_ok:
        print(f"WARN: Codex auth.json not found at {codex_home}. OAuth presence check failed (not blocking).")

    version = smoke_codex(codex_bin, codex_home) if codex_bin else "(not found; dry-run only)"

    # Build the minimal config we WOULD write (report always; write only with --apply).
    config = read_json(config_path)
    config.setdefault("onboardingCompleted", True)
    config["agentId"] = "codex"
    config.setdefault("agentModels", {}).setdefault("codex", {})["model"] = args.model
    config.setdefault("agentCliEnv", {}).setdefault("codex", {})["CODEX_BIN"] = codex_bin or "(auto-detect on apply)"
    config["agentCliEnv"]["codex"]["CODEX_HOME"] = str(codex_home)
    location = build_project_location(project_root)
    locations = [loc for loc in config.get("projectLocations", []) if loc.get("id") != LOCATION_ID]
    locations.append(location)
    config["projectLocations"] = locations
    config["defaultProjectLocationId"] = LOCATION_ID

    launcher = Path(args.launcher) if args.launcher else Path(args.open_design_exe).with_name("Open Design - GPT Codex Proxy.bat")
    create_launcher(launcher, Path(args.open_design_exe), codex_bin, codex_home,
                    None if args.no_proxy else DEFAULT_PROXY, args.apply)

    print("OPEN_DESIGN_ASSISTANCE_CONFIG_OK (dry-run)" if not args.apply else "OPEN_DESIGN_ASSISTANCE_CONFIG_OK")
    print(f"project_root={project_root}")
    print(f"config_path={config_path}")
    print(f"codex_bin={codex_bin}")
    print(f"codex_home={codex_home}")
    print(f"codex_version={version}")
    print(f"codex_auth_present={auth_ok}")
    print(f"launcher={launcher}")
    if args.apply:
        print("apply=true")
        if config_path.exists():
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            backup = config_path.with_name(f"app-config.backup-open-design-assistance-{stamp}.json")
            shutil.copy2(config_path, backup)
            print(f"backup={backup}")
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        print("apply=false (dry-run; pass --apply only for an exact project root)")


if __name__ == "__main__":
    main()
