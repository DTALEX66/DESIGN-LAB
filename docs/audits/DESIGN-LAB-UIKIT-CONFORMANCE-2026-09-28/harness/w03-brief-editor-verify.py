# SPDX-License-Identifier: MIT
"""W03 driver: verify the real Brief flow in the route shell against the real service.

Same proven direction as the repo E2E and the W14 sampler: the service is started HERE
(Python) and the browser script is spawned as a child.

Checks exactly W03's acceptance lines:
  1. 从项目卡进入真实Brief并保存读回   -> create a brief from /projects/:id, save, read back
  2. 刷新保留项目上下文                 -> reload keeps the project context and the briefs
  3. 失败不弹「保存成功」               -> a STALE_REVISION write shows the error, never success
  4. 无假KPI                            -> an empty project shows honest zeros, no invented numbers
"""
from __future__ import annotations

import json
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from unittest.mock import patch

# [0]=external-recovery-2026-09-27 [1]=task-artifacts [2]=.project-local [3]=repo
ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
NODE_SCRIPT = Path(os.environ.get("W03_NODE_SCRIPT", HERE / "w03-brief-editor.mjs"))
OUT = ROOT / ".project-local" / "task-artifacts" / "designlab-followup-taskpack-20260928" / "W03-BRIEF-EDITOR.json"
BROWSER = Path("D:/All projects/OS External Configuration/toolchains/playwright/chromium-1228/chrome-win64/chrome.exe")


def main() -> int:
    node = shutil.which("node")
    if not node:
        print("W03_BRIEF=NO_NODE")
        return 2
    if not NODE_SCRIPT.is_file():
        print(f"W03_BRIEF=NO_SCRIPT {NODE_SCRIPT}")
        return 2
    if not BROWSER.exists():
        print(f"W03_BRIEF=NO_BROWSER {BROWSER}")
        return 2

    sys.path.insert(0, str(ROOT / "src"))
    from design_lab.service import ProjectService
    from design_lab.http_service import make_server

    parent = ROOT / ".project-local" / "task-runtime" / "w03-brief"
    parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=parent) as tmp:
        root = Path(tmp)
        (root / "AGENTS.md").write_text("# synthetic w03 brief project\n", encoding="utf-8")
        token = secrets.token_hex(32)
        with patch.dict(os.environ, {"PROJECT_LOCAL_ROOT": str(root / ".project-local")}):
            service = ProjectService(str(root))
            server = make_server(service, token, port=0)
            port = server.server_address[1]
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                env = {
                    **os.environ,
                    "W03_SERVICE_URL": f"http://127.0.0.1:{port}",
                    "W03_TOKEN": token,
                    "W03_BROWSER": str(BROWSER),
                    "W03_OUT": str(OUT),
                }
                proc = subprocess.run([node, str(NODE_SCRIPT)], env=env, capture_output=True,
                                      text=True, encoding="utf-8", errors="replace",
                                      timeout=600, cwd=str(ROOT))
            finally:
                server.shutdown()
                worker.join()
                server.server_close()

    print(proc.stdout)
    if proc.stderr.strip():
        print("--- stderr ---")
        print(proc.stderr)
    if proc.returncode != 0:
        print(f"W03_BRIEF=FAIL exit={proc.returncode}")
        return 1
    payload = json.loads(OUT.read_text(encoding="utf-8"))
    failed = [c["name"] for c in payload["checks"] if not c["pass"]]
    print(f"W03_BRIEF={'OK' if not failed else 'CHECKS_FAILED'} checks={len(payload['checks'])} failed={failed}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
