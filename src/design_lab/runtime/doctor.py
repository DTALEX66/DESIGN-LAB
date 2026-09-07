# SPDX-License-Identifier: MIT
"""DL-TP-R2-016: design-lab doctor (portable workspace).

Probes toolchain versions and reports expected/actual drift.
Never auto-installs software, accepts licenses, or touches .git metadata.
"""
from __future__ import annotations
import shutil
import subprocess
from dataclasses import dataclass, field
import argparse
import json
import re
from .paths import PROJECT_ROOT

EXPECTED = {
    "uv": ">=0.4",
    "git": ">=2.40",
    "ffmpeg": ">=6.0",
    "node": ">=20",
}


@dataclass
class ToolStatus:
    tool: str
    found: bool
    version: str = ""
    drift: list[str] = field(default_factory=list)
    path: str = ""
    path_source: str = "shutil.which"
    search_scope: str = "Current process PATH and platform executable search rules only"
    version_command: list[str] = field(default_factory=list)
    exit_code: int | None = None
    version_status: str = "NOT_FOUND_IN_SEARCH_SCOPE"
    process_start_status: str = "NOT_EXECUTED"
    workflow_status: str = "NOT_EXECUTED"
    plugins_status: str = "NOT_EXECUTED"


def _version(tool, text):
    prefixes = {"uv": r"uv ", "git": r"git version ", "ffmpeg": r"ffmpeg version ", "node": r"v"}
    prefix = prefixes[tool]
    if not text.startswith(prefix):
        return None
    token = text[len(prefix):].split()[0] if text[len(prefix):].split() else ''
    match = re.fullmatch(r"(\d+)\.(\d+)(?:\.(\d+))?(?:([-+][A-Za-z0-9_.-]+|\.windows\.\d+))?", token)
    if not match or re.match(r"[-+](?:rc|alpha|beta|dev|nightly)", match.group(4) or '', re.IGNORECASE):
        return None
    return tuple(int(value or 0) for value in match.groups()[:3])


def probe_tools() -> list[ToolStatus]:
    out = []
    for tool, requirement in EXPECTED.items():
        executable = shutil.which(tool)
        status = ToolStatus(tool, bool(executable), path=executable or "")
        out.append(status)
        if not executable:
            status.drift.append("NOT_FOUND_IN_SEARCH_SCOPE; expected " + requirement)
            continue
        status.version_command = [executable, "-version" if tool == "ffmpeg" else "--version"]
        try:
            result = subprocess.run(status.version_command, capture_output=True, text=True,
                                    encoding="utf-8", errors="replace", timeout=8, cwd=PROJECT_ROOT)
            status.process_start_status = "STARTED"
            status.exit_code = result.returncode
            output = result.stdout.strip() or result.stderr.strip()
            # Remove CSI/OSC terminal metadata before storing machine evidence.
            output = re.sub(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))", "", output)
            status.version = output.split("\n")[0].strip()
            if result.returncode != 0:
                status.version_status = "PROBE_FAILED"
                status.drift.append("Version command failed with exit code " + str(result.returncode))
                continue
            actual = _version(tool, status.version)
            if actual is None:
                status.version_status = "VERSION_UNKNOWN"
                status.drift.append("No recognized stable version; no availability claim")
                continue
            minimum = tuple(int(part) for part in requirement.removeprefix(">=").split("."))
            minimum = (*minimum, *(0 for _ in range(3 - len(minimum))))
            if actual < minimum:
                status.version_status = "VERSION_UNSUPPORTED"
                status.drift.append("Version below " + requirement)
            else:
                status.version_status = "VERSION_VERIFIED"
        except subprocess.TimeoutExpired:
            status.process_start_status = "STARTED"
            status.version_status = "PROBE_TIMEOUT"
            status.drift.append("Version command exceeded 8 seconds")
        except OSError as exc:
            status.process_start_status = "START_FAILED"
            status.version_status = "PROBE_FAILED"
            status.drift.append("Version process failed: " + type(exc).__name__)
    return out


def check_uv_lock() -> list[str]:
    """Explicit helper only; not part of the default version-only doctor."""
    if not all((PROJECT_ROOT / name).is_file() for name in ("pyproject.toml", "uv.lock")):
        return ["NOT_EXECUTED: owning project manifest/lock missing"]
    uv = shutil.which("uv")
    if not uv:
        return ["NOT_EXECUTED: uv not found in current search scope"]
    try:
        result = subprocess.run([uv, "lock", "--check", "--offline"], cwd=PROJECT_ROOT,
                                capture_output=True, text=True, timeout=30)
        return [] if result.returncode == 0 else ["Lock check failed with exit code " + str(result.returncode)]
    except (OSError, subprocess.TimeoutExpired) as exc:
        return ["Lock check could not complete: " + type(exc).__name__]


def main(argv=None):
    parser = argparse.ArgumentParser(description='DESIGN-LAB read-only environment diagnosis')
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--paths', action='store_true', help='resolve project-owned paths without probing shared/private roots')
    action.add_argument('--migration-preview', metavar='MANIFEST', help='inventory explicit project files without moving data')
    action.add_argument('--model-manifest', metavar='RELATIVE_JSON', help='check an explicit model file inventory without loading models')
    parser.add_argument('--model-root', metavar='DIRECTORY', help='explicit project-local or declared model-library directory')
    parser.add_argument('--json', action='store_true', help='emit machine-readable diagnostics')
    args = parser.parse_args(argv)
    if bool(args.model_manifest) != bool(args.model_root):
        parser.error('--model-manifest and --model-root must be supplied together')
    if args.model_manifest:
        from ..analysis.model_manifest import verify_manifest_file
        try:
            result = verify_manifest_file(args.model_root, args.model_manifest)
        except (ValueError, OSError) as exc:
            result = {'state': 'METADATA_ONLY', 'issues': [{'code': 'MODEL_PROBE_FAILED', 'detail': str(exc)}],
                      'load': 'NOT_EXECUTED', 'inference': 'NOT_EXECUTED'}
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result['state'] == 'WEIGHTS_COMPLETE' else 2
    if args.migration_preview:
        from .migration_preview import preview_file
        try:
            result = preview_file(args.migration_preview)
        except (ValueError, OSError) as exc:
            result = {'status': 'MIGRATION_POLICY_FAIL', 'reason': str(exc), 'migration_executed': False}
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result['status'] == 'PREVIEW_READY' else 2
    if args.paths:
        from .paths import PathPolicyError, resolve_paths
        try:
            result = resolve_paths().describe()
        except (PathPolicyError, OSError) as exc:
            result = {'status': 'PATH_POLICY_FAIL', 'reason': str(exc)}
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result['status'] == 'PATHS_RESOLVED' else 2
    from dataclasses import asdict
    statuses = probe_tools()
    print(json.dumps([asdict(s) for s in statuses], ensure_ascii=False, indent=2))
    return 0 if all(s.found and not s.drift for s in statuses) else 1


if __name__ == '__main__':
    raise SystemExit(main())
