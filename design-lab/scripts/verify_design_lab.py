#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DESIGN-LAB canonical verifier entry (DL-MIG-011).

Aggregates the DESIGN-LAB verification chain under one entrypoint:
integration-assistance, product manifest, runtime contracts, visual scoring,
release evidence, source registry, v2 protocols and v21 visual quality.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def run_child(command: list) -> subprocess.CompletedProcess:
    """Run a verifier under a deterministic text contract.

    The parent decodes child output as UTF-8 and tells the child to emit UTF-8, so the
    chain no longer depends on the machine locale. Before this, a child that printed
    Chinese under a cp936 parent produced UnicodeDecodeError inside the parent's own
    subprocess call: the chain then died with `NoneType has no attribute strip` and
    reported nothing about the other sixty steps. Reproduced by running this script
    with PYTHONIOENCODING=utf-8 (exit 1) versus without it (exit 0). A gate that dies
    while verifying hides every result behind it, so this is fail-closed by reporting
    the step rather than by crashing.
    """
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    try:
        return subprocess.run(command, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", env=env)
    except OSError as exc:
        return subprocess.CompletedProcess(command, 3, "", f"could not start: {exc}")

SCRIPTS = [
    "verify_identity_gate.py",
    "verify_project_drift.py",
    "verify_knowledge_lifecycle.py",
    "verify_design_kernel.py",
    "verify_design_memory.py",
    "verify_quality_gate.py",
    "verify_reference_e2e.py",
    "verify_collection_pipeline.py",
    "verify_provider_spi.py",
    "verify_aesthetic_rules.py",
    "verify_design_ir.py",
    "verify_production_preflight.py",
    "verify_experience_corpus.py",
    "verify_design_actions.py",
    "verify_tool_action_plan.py",
    "verify_golden_contracts.py",
    "verify_tool_write_protocols.py",
    "verify_branch_inventory.py",
    "verify_repository_size.py",
    "verify_dtcg_tokens.py",
    "verify_extraction_chain.py",
    "verify_federation_e2e.py",
    "verify_federation_review.py",
    "verify_quality_pipeline.py",
    "verify_review_surface.py",
    "integrations/hosts/open-design/verifier/verify_open_design_host_adapter.py",
    "verify_product_manifest_v3.py",
    "verify_runtime_contracts_v3.py",
    "verify_visual_scoring_v3.py",
    "verify_source_registry.py",
    "verify_v2_protocols.py",
    "verify_visual_quality_v21.py",
    "verify_style_master_method.py",
    "verify_capability_evidence_v4.py",
    "verify_comfyui_gate.py",
    "verify_sbom.py",
    "verify_adapter_registry.py",
    "verify_adapter_matrix.py",
    "verify_benchmark_registry.py",
    "verify_evidence_cards.py",
    "verify_asset_governance.py",
    "verify_external_assets_index.py",
    "verify_reconstruction_pipeline.py",
    "verify_reconstruction_security.py",
    "verify_reconstruction_golden_corpus.py",
    "verify_illustrator_reconstruction_adapter.py",
    "verify_photoshop_reconstruction_adapter.py",
    "verify_reconstruction_bundle.py",
    "verify_host_e3_evidence.py",
    "verify_control_capability_matrix.py",
    "verify_quality_record.py",
    "verify_adapter_locator_audit.py",
]

# Release-time gate: invoked separately with a release-evidence file argument.
# Kept out of the daily chain because it requires evidence input and must fail
# closed (non-zero) when no exact-SHA evidence is provided.
RELEASE_VERIFIER = "verify_release_evidence.py"
RECONSTRUCTION_RELEASE_VERIFIER = "verify_reconstruction_release.py"
# Batch F-3 (audit P1-CI) adds design-lab/scripts/verify_release_preflight.py:
# the real GitHub API readback gate (tag->SHA identity, CI conclusion, artifact
# download+sha256, release assets, checksums). It is deliberately NOT appended to
# SCRIPTS: it needs a tag, a token and the network, and it reports INCOMPLETE
# (non-zero) when any of those is missing, so running it inside this daily chain
# would turn an unprovable release into a red structural gate. release-gate.yml
# invokes it as its own step for tag refs, like RELEASE_VERIFIER above.
# Batch F-4 adds verify_host_e3_evidence.py — and it IS in SCRIPTS, unlike the
# two release-time verifiers: its default run reads the convention directory
# .project-local/task-artifacts/host-e3/, which is absent in a clean checkout,
# so it reports HOST_E3=NO_RECORD and exits 0. It only turns red when someone
# commits a fake/host-E3 record that fails its checks (schema contract,
# approver, boundTreeSha ancestry, artifact sha256) — exactly the
# fabricated-E3 case that should fail the gate daily.
# P1-CONTROL-SPIKE adds verify_control_capability_matrix.py — also in SCRIPTS:
# its default run validates the tracked capability routing declaration
# (design-lab/config/control-capability-matrix.json) against its schema and
# the fail-closed rules (supported=true requires evidence_level>=E2 +
# qualified_sha; no_bypass_license must be true; computer-use reachability
# requires a truth layer; matrix must cover browser + minimax-design). The
# matrix itself is honest (Adobe/MiniMax all supported=false/E0), so a clean
# checkout reports PASS and exits 0. It only turns red if someone commits a
# matrix that declares a capability outrunning its evidence or bypasses
# licensing — the "能点软件≠集成" trap this batch closes.

# E1 确定性检查（DL-QLT-001 / DL-PRD-001），以参数化方式运行
EXTRA_CHECKS = [
    (
        "jury-anti-slop",
        [
            "quality/jury/check_anti_slop.py",
            # scan design-lab/ (resolved absolute below), skipping vendored/template trees
            ".",
            "--skip-prefixes",
            "templates/,evals/,exports/,domain-packs/uiux-design/benchmarks/,design-systems/,docs/history/,reports/history/",
        ],
    ),
]

def main() -> int:
    root = Path(__file__).resolve().parent
    results: list[tuple[str, int]] = []
    repo_root = root.parent.parent
    for name in SCRIPTS:
        # verifiers inside design-lab/scripts/ resolve relative to the scripts
        # dir; host-adapter verifiers live outside it (DL-ADP-OD-001) and
        # resolve relative to the repository root.
        if name.startswith(("adapters/", "integrations/")):
            script = repo_root / "design-lab" / name
            if not script.exists():
                # integrations/ host verifiers moved to the repo-root-level
                # integrations/ tree after DL-DIR-MIG-R1.
                script = repo_root / name
        else:
            script = root / name
        if not script.exists():
            print(f"MISSING {name} (required verifier absent)")
            results.append((name, 2))
            continue
        print(f"\n===== {name} =====")
        r = run_child([sys.executable, str(script)])
        tail = (r.stdout or "").strip().splitlines()
        summary = next((line for line in reversed(tail) if line.startswith(("VERIFY_", "STYLE_MASTER_METHOD=", "ADAPTER_", "BENCHMARK_", "EVIDENCE_", "PASS", "FAIL"))), "")
        print(summary)
        if r.returncode != 0:
            # print the full failing verifier output for diagnosis (incl. tracebacks)
            print((r.stdout or "").strip())
        results.append((name, r.returncode))
        if r.returncode != 0 and (r.stderr or "").strip():
            print((r.stderr or "").strip())

    for name, args in EXTRA_CHECKS:
        print(f"\n===== {name} =====\n")
        # first arg is the script path (resolve under root.parent);
        # "." target resolves to design-lab/ absolute (scan scope), rest are literal args
        repo_root_dir = root.parent.parent
        # quality/jury migrated to packages/capabilities/quality/jury (DL-DIR-MIG-R1)
        script_arg = str(
            (repo_root_dir / "packages" / "capabilities" / args[0])
            if args[0].startswith("quality/")
            else (root.parent / args[0])
        )
        resolved_args = [str(repo_root_dir / "design-lab") if a == "." else a for a in args[1:]]
        r = run_child([sys.executable, script_arg, *resolved_args])
        tail = (r.stdout or "").strip().splitlines()
        summary = tail[-1] if tail else "(no output)"
        print(summary)
        if r.returncode != 0:
            for line in tail[:-1]:
                print(f"  {line}")
        results.append((name, r.returncode))

    failed = [name for name, code in results if code != 0]
    ok = not failed
    # write verify-chain marker ONLY on full pass; on failure remove/leave FAIL.
    # root here = design-lab/scripts/; repo root = root.parent.parent
    # Fail-closed: marker write / HEAD resolution failures must not silently
    # turn a pass into OK without the marker (Codex review finding 6).
    try:
        repo_root = root.parent.parent
        head = run_child(["git", "-C", str(repo_root), "rev-parse", "HEAD"]).stdout.strip()
        if not head:
            raise RuntimeError("git rev-parse HEAD returned empty")
        marker = repo_root / "design-lab" / "config" / ".verify-chain-ok"
        if ok:
            marker.parent.mkdir(parents=True, exist_ok=True)
            marker.write_text(f"ok {head}\n", encoding="utf-8")
        else:
            if marker.exists():
                marker.write_text(f"FAIL {head}\n", encoding="utf-8")
    except Exception as exc:
        results.append(("verify-chain-marker", 1))
        failed.append("verify-chain-marker")
        ok = False
        print(f"verify-chain-marker: FAIL ({exc})")
    print(f"\nVERIFY_DESIGN_LAB={'OK' if ok else 'FAIL'} total={len(results)} failed={len(failed)}")
    for name, code in results:
        print(f"  {'PASS' if code == 0 else 'FAIL'} {name}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
