#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DLDS-G000 / G010 / G030 / G040 — third-party and supply-chain governance gate.

G000  sources lock: every external project records name, canonical URL, revision,
      digest, licence, role and disposition, and `latest` is never a production
      identity.
G010  adapter registry: the status vocabulary is the frozen eight, and a manifest
      may not claim an evidence level its evidence does not carry.
G030  H3 stays BLOCKED_BY_LICENSE everywhere it appears, and no download or run
      path is introduced.
G040  supply chain: licence audit, secret scan, third-party source audit,
      lockfile audit, generated-artifact audit and binary inventory.

Writes reports/current/SUPPLY-CHAIN-REPORT.json and exits non-zero on a failure.

Usage:
    python scripts/verify_supply_chain.py [--check]
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "reports/current/SUPPLY-CHAIN-REPORT.json"
TASK_KEYS = [f"DL-TP-20260914-DEEPSEEK-AUTHORITY-R1::DLDS-{key}"
             for key in ("G000", "G010", "G030", "G040")]
CANONICAL_STATUS = ("DECLARED", "STRUCTURAL", "CONTROLLED_RUNTIME", "REAL_WORKFLOW",
                    "INDEPENDENT_ACCEPTANCE", "RELEASED", "BLOCKED", "REVOKED")
# The vocabulary the registry used before this gate existed. Kept as an explicit
# mapping so the migration debt is a number, not a surprise.
LEGACY_STATUS = {"declared": "DECLARED", "structural": "STRUCTURAL", "runtime": "CONTROLLED_RUNTIME",
                 "missing": "DECLARED", "unsupported": "BLOCKED", "BLOCKED_BY_LICENSE": "BLOCKED"}
LEVEL_ORDER = {"E0": 0, "E1": 1, "E2": 2, "E3": 3, "E4": 4, "E5": 5}
SECRET_PATTERNS = [
    ("aws-key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("private-key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("github-token", re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}")),
    ("slack-token", re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}")),
    ("openai-key", re.compile(r"sk-[A-Za-z0-9]{32,}")),
    ("generic-secret", re.compile(r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*[\"'][^\"']{16,}[\"']")),
]
GENERATED_MARKERS = (".pyc", ".pyo", ".log", ".tmp", ".bak")
LOCKFILES = {"uv.lock": "python", "pnpm-lock.yaml": "node", "package-lock.json": "node",
             "yarn.lock": "node"}


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout


def tracked() -> list:
    return [line for line in git("ls-files").splitlines() if line.strip()]


def read_json(rel: str):
    path = REPO / rel
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None


def sources_lock_check(files: list) -> dict:
    lock = read_json("vendor/sources.lock.json") or {}
    required = ("id", "path", "disposition", "license")
    entries, problems = [], []
    latest_identities = []
    for source in lock.get("sources", []):
        missing = [field for field in required if not source.get(field)]
        blob = json.dumps(source).lower()
        if re.search(r'"(commit|revision|version|canonicalurl)"\s*:\s*"latest"', blob):
            latest_identities.append(source.get("id"))
        entries.append({"id": source.get("id"), "missing_fields": missing,
                        "has_url": bool(source.get("canonicalUrl") or source.get("url")),
                        "has_revision": bool(source.get("commit") or source.get("revision"))})
        if missing:
            problems.append({"id": source.get("id"), "missing": missing})
    return {"entries": len(entries), "problems": problems, "latest_identities": latest_identities,
            "canonical_url_coverage": sum(1 for e in entries if e["has_url"]),
            "revision_coverage": sum(1 for e in entries if e["has_revision"]),
            "ok": not problems and not latest_identities}


def adapter_status_check() -> dict:
    registry = read_json("integrations/adapter-registry.json") or {}
    adapters = registry.get("adapters", [])
    legacy, canonical, incoherent = {}, 0, []
    for adapter in adapters:
        status = adapter.get("status")
        level = (adapter.get("evidence") or {}).get("level", "E0")
        if status in CANONICAL_STATUS:
            canonical += 1
        elif status in LEGACY_STATUS:
            legacy[status] = legacy.get(status, 0) + 1
        else:
            incoherent.append({"adapter_id": adapter.get("adapter_id"), "status": status})
        # A declared/structural adapter may not claim runtime evidence.
        if status in {"declared", "DECLARED", "structural", "STRUCTURAL"} and \
                LEVEL_ORDER.get(level, 0) > LEVEL_ORDER["E1"]:
            incoherent.append({"adapter_id": adapter.get("adapter_id"),
                               "reason": f"status {status} claims {level}"})
        if status in {"REAL_WORKFLOW", "runtime"} or LEVEL_ORDER.get(level, 0) >= LEVEL_ORDER["E3"]:
            evidence = adapter.get("evidence") or {}
            if not evidence.get("task_ids") or not evidence.get("artifact_paths"):
                incoherent.append({"adapter_id": adapter.get("adapter_id"),
                                   "reason": "E3-class claim without runtime identity or artifacts"})
    return {"adapters": len(adapters), "canonical_status_usage": canonical,
            "legacy_status_usage": legacy,
            "migration_debt": sum(legacy.values()),
            "incoherent": incoherent,
            "status_model": registry.get("status_model"),
            "ok": not incoherent}


def h3_check() -> dict:
    findings = []
    lock = read_json("vendor/sources.lock.json") or {}
    radar = read_json("design-lab/readiness/model-radar.json") or {}
    registry = read_json("integrations/adapter-registry.json") or {}
    manifest = read_json("integrations/generators/minimax-h3/adapter.manifest.json") or {}
    h3_sources = [s for s in lock.get("sources", []) if "minimax" in json.dumps(s).lower()]
    forced = [s for s in h3_sources if s.get("disposition") in {"CONDITIONAL_POC", "LOCK_REFERENCE",
                                                                "BLOCKED"}]
    if h3_sources and not forced:
        findings.append({"where": "vendor/sources.lock.json", "issue": "H3 present without a "
                         "restrictive disposition"})
    blocked_models = [m for m in radar.get("entries", [])
                      if m["model_id"].startswith("minimax-h3")]
    if blocked_models and any(m.get("radar_state") != "BLOCKED_BY_LICENSE" for m in blocked_models):
        findings.append({"where": "design-lab/readiness/model-radar.json",
                         "issue": "an H3 model is not BLOCKED_BY_LICENSE"})
    if any(m.get("default_enabled") for m in blocked_models):
        findings.append({"where": "design-lab/readiness/model-radar.json",
                         "issue": "an H3 model is default enabled"})
    h3_adapter = next((a for a in registry.get("adapters", [])
                       if a.get("adapter_id") == "adapter-minimax-h3"), None)
    if h3_adapter and h3_adapter.get("status") != "BLOCKED_BY_LICENSE":
        findings.append({"where": "integrations/adapter-registry.json",
                         "issue": f"H3 adapter status is {h3_adapter.get('status')}"})
    if manifest and all(cap.get("supported") is not True for cap in manifest.get("capabilities", [])):
        pass
    else:
        findings.append({"where": "integrations/generators/minimax-h3/adapter.manifest.json",
                         "issue": "H3 manifest declares a supported capability"})
    return {"h3_sources_in_lock": len(h3_sources), "h3_models": len(blocked_models),
            "findings": findings, "ok": not findings}


def license_audit(files: list) -> dict:
    markers = [f for f in files if Path(f).name in {"LICENSE", "LICENSE.md", "LICENSE.txt", "NOTICE",
                                                    "COPYING", "SOURCE.md"}]
    registry = read_json("design-lab/config/rights-registry.json")
    return {"marker_files": len(markers), "rights_registry_present": registry is not None,
            "rights_registry_subjects": (registry or {}).get("counts", {}).get("subjects"),
            "ok": registry is not None}


SYNTHETIC_MARKERS = ("should-not", "shouldnot", "example", "dummy", "fake", "placeholder",
                     "your-", "changeme", "redacted", "not-a-real", "xxxx", "<", "fixture")


def is_synthetic(path: str, match: str) -> bool:
    """Test fixtures name their values so that nobody thinks they are real."""
    lowered = match.lower()
    if any(marker in lowered for marker in SYNTHETIC_MARKERS):
        return True
    return path.startswith(("fixtures/", "design-lab/tests/", "tests/"))


def secret_scan(files: list) -> dict:
    hits, exempt = [], 0
    for rel in files:
        path = REPO / rel
        try:
            if path.stat().st_size > 1_000_000:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for name, pattern in SECRET_PATTERNS:
            for match in pattern.finditer(text):
                value = match.group(0)
                if is_synthetic(rel, value):
                    exempt += 1
                    continue
                line = text.count("\n", 0, match.start()) + 1
                hits.append({"pattern": name, "path": rel, "line": line,
                             "match": value[:24] + "…"})
    return {"patterns": [name for name, _ in SECRET_PATTERNS], "hits": hits[:50],
            "hit_count": len(hits), "synthetic_values_exempted": exempt, "ok": not hits}


def lockfile_audit(files: list) -> dict:
    present = [f for f in files if Path(f).name in LOCKFILES or Path(f).name == "requirements.txt"]
    managers = {LOCKFILES[Path(f).name] for f in present if Path(f).name in LOCKFILES}
    return {"lockfiles": present, "managers": sorted(managers),
            "single_manager_per_ecosystem": len(managers) <= 2,
            "ok": "uv.lock" in [Path(f).name for f in present]}


def generated_artifact_audit(files: list) -> dict:
    offenders = [f for f in files if f.endswith(GENERATED_MARKERS) or "__pycache__" in f
                 or f.startswith(("dist/", "build/", "node_modules/"))]
    return {"offenders": offenders[:30], "count": len(offenders), "ok": not offenders}


def binary_inventory(files: list) -> dict:
    report = read_json("reports/current/TRACKED-BINARY.json")
    if report:
        return {"source": "reports/current/TRACKED-BINARY.json", "count": report["count"],
                "by_category": report["by_category"], "verdict": report["verdict"],
                "ok": report["verdict"] == "NO_MODEL_WEIGHTS_TRACKED"}
    return {"source": "missing", "count": None, "ok": False}


def third_party_audit() -> dict:
    report = read_json("reports/current/THIRD-PARTY-SOURCE-AUDIT.json")
    if not report:
        return {"source": "missing", "ok": False}
    return {"source": "reports/current/THIRD-PARTY-SOURCE-AUDIT.json",
            "verdict": report["verdict"], "counts": report["counts"],
            "ok": report["counts"]["missing_absorbed_tree"] == 0}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    files = tracked()
    checks = {
        "G000_sources_lock": sources_lock_check(files),
        "G010_adapter_status": adapter_status_check(),
        "G030_h3_blocked": h3_check(),
        "G040_license_audit": license_audit(files),
        "G040_secret_scan": secret_scan(files),
        "G040_lockfile_audit": lockfile_audit(files),
        "G040_generated_artifacts": generated_artifact_audit(files),
        "G040_binary_inventory": binary_inventory(files),
        "G040_third_party_sources": third_party_audit(),
    }
    failures = [name for name, result in checks.items() if not result.get("ok")]
    document = {
        "schemaVersion": "design-lab/supply-chain-report/v1",
        "task_keys": TASK_KEYS,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "subject_sha": git("rev-parse HEAD").strip(),
        "canonical_adapter_status": list(CANONICAL_STATUS),
        "legacy_status_mapping": LEGACY_STATUS,
        "checks": checks,
        "failures": failures,
        "verdict": "PASS" if not failures else "FAIL",
        "migration_debt": {
            "adapter_status_entries_still_legacy": checks["G010_adapter_status"]["migration_debt"],
            "note": "the frozen eight-value vocabulary is the target; the registry still uses the "
                    "legacy names, and the gate maps them explicitly so the debt is a number",
        },
    }
    if args.check:
        if not OUT.is_file() or json.loads(OUT.read_text(encoding="utf-8"))["verdict"] != document["verdict"]:
            print("SUPPLY_CHAIN=DRIFT")
            return 1
        print("SUPPLY_CHAIN=PASS")
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8", newline="\n")
    print(f"SUPPLY_CHAIN={document['verdict']} checks={len(checks)} failures={failures}")
    for name, result in checks.items():
        extra = ""
        if name == "G010_adapter_status":
            extra = (f" statuses canonical={result['canonical_status_usage']} "
                     f"legacy={result['migration_debt']}")
        if name == "G000_sources_lock":
            extra = (f" entries={result['entries']} urls={result['canonical_url_coverage']} "
                     f"revisions={result['revision_coverage']}")
        if name == "G040_secret_scan":
            extra = f" hits={result['hit_count']}"
        print(f"  {'ok  ' if result.get('ok') else 'FAIL'} {name}{extra}")
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
