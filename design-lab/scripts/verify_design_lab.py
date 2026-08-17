#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DESIGN-LAB canonical verifier entry (DL-MIG-011).

Aggregates the DESIGN-LAB verification chain under one entrypoint:
integration-assistance, product manifest, runtime contracts, visual scoring,
release evidence, source registry, v2 protocols and v21 visual quality.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = [
    "verify_identity_gate.py",
    "verify_design_kernel.py",
    "verify_design_memory.py",
    "verify_quality_gate.py",
    "verify_reference_e2e.py",
    "verify_collection_pipeline.py",
    "verify_provider_spi.py",
    "verify_aesthetic_rules.py",
    "verify_design_ir.py",
    "verify_production_preflight.py",
    "verify_review_surface.py",
    "adapters/hosts/open-design/verifier/verify_open_design_host_adapter.py",
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
]

# Release-time gate: invoked separately with a release-evidence file argument.
# Kept out of the daily chain because it requires evidence input and must fail
# closed (non-zero) when no exact-SHA evidence is provided.
RELEASE_VERIFIER = "verify_release_evidence.py"

# E1 确定性检查（DL-QLT-001 / DL-PRD-001），以参数化方式运行
EXTRA_CHECKS = [
    (
        "jury-anti-slop",
        [
            "quality/jury/check_anti_slop.py",
            # scan design-lab/ (resolved absolute below), skipping vendored/template trees
            ".",
            "--skip-prefixes",
            "knowledge/,intelligence/,templates/,evals/,exports/,domain-packs/uiux-design/benchmarks/,design-systems/,research/quarantine/,project-memory/history/,reports/history/",
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
        if name.startswith("adapters/"):
            script = repo_root / "design-lab" / name
        else:
            script = root / name
        if not script.exists():
            print(f"MISSING {name} (required verifier absent)")
            results.append((name, 2))
            continue
        print(f"\n===== {name} =====")
        r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
        tail = r.stdout.strip().splitlines()
        summary = next((line for line in reversed(tail) if line.startswith(("VERIFY_", "STYLE_MASTER_METHOD=", "ADAPTER_", "BENCHMARK_", "EVIDENCE_", "PASS", "FAIL"))), "")
        print(summary)
        if r.returncode != 0:
            # print the specific failing checks for diagnosis
            for line in tail:
                if line.startswith("FAIL"):
                    print(f"  {line}")
        results.append((name, r.returncode))
        if r.returncode != 0 and r.stderr.strip():
            print(r.stderr.strip()[-500:])

    for name, args in EXTRA_CHECKS:
        print(f"\n===== {name} =====\n")
        # first arg is the script path (resolve under root.parent);
        # "." target resolves to design-lab/ absolute (scan scope), rest are literal args
        script_arg = str(root.parent / args[0])
        resolved_args = [str(root.parent) if a == "." else a for a in args[1:]]
        r = subprocess.run([sys.executable, script_arg, *resolved_args], capture_output=True, text=True)
        tail = r.stdout.strip().splitlines()
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
        import subprocess as _sp
        repo_root = root.parent.parent
        head = _sp.run(["git", "-C", str(repo_root), "rev-parse", "HEAD"],
                       capture_output=True, text=True).stdout.strip()
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
