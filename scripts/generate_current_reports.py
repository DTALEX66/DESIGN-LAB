#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Generate bounded current reports from the checked-in registries and Git refs."""
from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CURRENT = REPO / "reports" / "current"
INDEX = REPO / "design-lab" / "config" / "current-report-index.json"


def git(*args: str) -> str:
    result = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def load(relative: str) -> dict:
    return json.loads((REPO / relative).read_text(encoding="utf-8"))


def write_json(name: str, payload: dict) -> None:
    (CURRENT / name).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    CURRENT.mkdir(parents=True, exist_ok=True)
    sha = git("rev-parse", "HEAD")
    origin = git("rev-parse", "origin/main")
    worktree_clean = not bool(git("status", "--porcelain"))
    fresh = sha == origin and worktree_clean
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    tracked = len(git("ls-files").splitlines())
    remote_url = git("remote", "get-url", "origin")
    workflows = sorted(p.name for p in (REPO / ".github" / "workflows").glob("*.yml"))
    branches = sorted(line for line in git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin").splitlines() if line)

    cloud = {
        "schemaVersion": "design-lab/cloud-baseline/v1",
        "subjectSha": sha,
        "generatedAt": generated,
        "fresh": fresh,
        "worktreeClean": worktree_clean,
        "remote": {"name": "origin", "url": remote_url, "mainSha": origin, "remoteBranchesObserved": branches},
        "repository": {"trackedFilesAtLocalHead": tracked, "workflowsAtLocalHead": workflows},
        "unavailable": ["branchProtection", "openPullRequests", "openIssues", "githubRepositorySize"],
        "note": "GitHub CLI/API was unavailable in this environment; unavailable fields are deliberately not inferred from local Git data.",
    }
    write_json("CLOUD_BASELINE.json", cloud)
    (CURRENT / "CLOUD_BASELINE.md").write_text(
        "# CLOUD_BASELINE\n\n"
        f"- subject SHA: `{sha}`\n- origin/main: `{origin}`\n- worktree clean: `{str(worktree_clean).lower()}`\n- fresh: `{str(fresh).lower()}`\n"
        f"- observed remote branches: `{len(branches)}`\n"
        "- GitHub branch protection, open PR/Issue, and hosted repository size: `NOT_EXECUTED` (no GitHub API client available).\n",
        encoding="utf-8",
    )

    adapters = load("integrations/adapter-registry.json").get("adapters", [])
    adapter_payload = {"schemaVersion": "design-lab/adapter-reconciliation/v1", "subjectSha": sha,
                       "generatedAt": generated, "fresh": fresh,
                       "adapters": [{"adapterId": a.get("adapter_id"), "tool": a.get("tool"),
                                     "status": a.get("status"), "evidenceLevel": a.get("evidence", {}).get("level")}
                                    for a in adapters]}
    write_json("ADAPTER_EVIDENCE_RECONCILIATION.json", adapter_payload)

    source = load("design-lab/research/global-absorption/SOURCE_REGISTRY.json")
    quarantine = load("design-lab/research/global-absorption/QUARANTINE_REGISTRY.json")
    write_json("KNOWLEDGE_INVENTORY.json", {"schemaVersion": "design-lab/knowledge-inventory/v1", "subjectSha": sha,
                                              "generatedAt": generated, "fresh": fresh,
                                              "activeSourceRecords": len(source.get("entries", [])),
                                              "quarantinedRecords": len(quarantine.get("entries", [])),
                                              "migrationStatus": "deferred"})
    required_pack_files = ("handoff-contract.json", "manifest.json", "preflight.json", "profile.json", "rubric.json", "scenario.md", "sources.json")
    pack_readiness = []
    for pack in sorted((REPO / "design-lab" / "domain-packs").iterdir()):
        if not pack.is_dir():
            continue
        benchmarks = sorted(p for p in (pack / "benchmarks").glob("**/brief.json")) if (pack / "benchmarks").exists() else []
        failures = sorted(p for p in (pack / "failures").glob("**/*") if p.is_file()) if (pack / "failures").exists() else []
        pack_readiness.append({"domain": pack.name, "requiredContractFiles": {name: (pack / name).is_file() for name in required_pack_files},
                               "benchmarkBriefs": len(benchmarks), "failureArtifacts": len(failures),
                               "status": "PARTIAL" if benchmarks and not failures else "STRUCTURAL" if benchmarks else "MISSING_BENCHMARK"})
    write_json("DOMAIN_PACK_READINESS.json", {"schemaVersion": "design-lab/domain-readiness/v1", "subjectSha": sha,
                                                "generatedAt": generated, "fresh": fresh, "domainPacks": pack_readiness,
                                                "note": "Structural files and benchmark counts are not production-readiness evidence."})
    write_json("RELEASE_READINESS.json", {"schemaVersion": "design-lab/release-readiness/v1", "subjectSha": sha,
                                            "generatedAt": generated, "fresh": fresh, "status": "BLOCKED",
                                            "blockers": ["human jury", "independent E4 attestation", "source rights completion", "branch protection", "professional-tool E3 fixture"]})

    reports = ["CLOUD_BASELINE.json", "CLOUD_BASELINE.md", "PROJECT_STATUS.json", "PROJECT_STATUS.md",
               "ADAPTER_EVIDENCE_RECONCILIATION.json", "KNOWLEDGE_INVENTORY.json", "DOMAIN_PACK_READINESS.json", "RELEASE_READINESS.json"]
    INDEX.write_text(json.dumps({"schemaVersion": "design-lab/current-report-index/v1", "subjectSha": sha,
                                 "generatedAt": generated, "reports": reports}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"CURRENT_REPORTS=PASS sha={sha} reports={len(reports)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
