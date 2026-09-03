#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-AST-001: asset governance gate (strict, fail-closed).

Replaces the size+sidecar-only gate. Real verification for every tracked
binary outside inert prefixes:
- repository total budget (hard 256 MiB; warning at 220 MiB);
- per-file cap (5 MiB);
- .license sidecar must exist AND be structured asset-sidecar v1;
- sidecar sha256 must match the actual file hash;
- author / license must be recorded;
- redistributable / modelInputAllowed / commercialUse must be booleans;
- sourceId must resolve in SOURCE_REGISTRY (v3, active/reference-only) OR the
  sidecar must carry a human-approved exception with a non-expired expiresAt;
- new binaries without a complete sidecar are rejected by default.

Legacy SPDX-text sidecars are a hard violation (they cannot prove hash/rights),
which forces the one-time upgrade path (upgrade_asset_sidecars.py, DL-AST-001).
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TOTAL_BUDGET_MIB = 256
WARN_BUDGET_MIB = 220
SINGLE_FILE_MIB = 5
SIDECAR_V1 = "design-lab/asset-sidecar/v1"
REGISTRY = REPO / "design-lab/research/global-absorption/SOURCE_REGISTRY.json"
QUARANTINE = REPO / "design-lab/research/global-absorption/QUARANTINE_REGISTRY.json"

BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".wav", ".mp3", ".mp4",
    ".pdf", ".zip", ".gz", ".7z", ".ttf", ".otf", ".woff", ".woff2",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".model", ".onnx", ".pb",
    ".apk", ".aab",
}
SKIPPED_PREFIXES = (
    "design-lab/research/quarantine/",
    "docs/history/",
    "reports/history/",
    "fixtures/domains/game-visual/assets/generated/",
)


def git(args: list[str]) -> str:
    r = subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout.strip()


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()



def sidecar_findings(rel: str, binary: Path, sidecar: Path) -> list[str]:
    """DL-AST-001 per-binary gate findings (fail-closed).

    Returns [] when the binary is fully governed.
    """
    errs: list[str] = []
    if not sidecar.exists():
        return [f"binary without .license sidecar (DL-AST-001): {rel}"]
    try:
        sc = json.loads(sidecar.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return [f"binary sidecar not valid JSON (must be asset-sidecar v1): {rel}"]
    if sc.get("schemaVersion") != SIDECAR_V1:
        return [f"binary sidecar not structured v1 (legacy SPDX text is a violation): {rel}"]
    if sc.get("file") != rel:
        errs.append(f"sidecar file mismatch: {rel} (sidecar says {sc.get('file')!r})")
    if sc.get("sha256") != sha256_of(binary):
        errs.append(f"sidecar sha256 mismatch: {rel}")
    if not sc.get("license"):
        errs.append(f"sidecar missing license: {rel}")
    if not sc.get("author"):
        errs.append(f"sidecar missing author/rights holder: {rel}")
    for flag in ("redistributable", "modelInputAllowed", "commercialUse"):
        if not isinstance(sc.get(flag), bool):
            errs.append(f"sidecar {flag} must be boolean: {rel}")
    source_id = sc.get("sourceId")
    if source_id:
        try:
            reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
            known = any(e.get("source", {}).get("sourceId") == source_id for e in reg.get("entries", []))
            qreg = json.loads(QUARANTINE.read_text(encoding="utf-8"))
            quarantined = any(e.get("sourceId") == source_id for e in qreg.get("entries", []))
        except (OSError, json.JSONDecodeError) as exc:
            errs.append(f"cannot read source registries for {rel}: {exc}")
            known = quarantined = False
        if quarantined:
            errs.append(f"binary references quarantined sourceId {source_id} (not allowed): {rel}")
        elif not known:
            errs.append(f"binary sourceId not in SOURCE_REGISTRY: {rel} ({source_id})")
    else:
        exc_info = sc.get("exception")
        if not isinstance(exc_info, dict) or not exc_info.get("approvedBy") or not exc_info.get("expiresAt"):
            errs.append(f"binary without sourceId needs approved exception with expiry: {rel}")
        else:
            try:
                if date.fromisoformat(exc_info["expiresAt"]) < date.today():
                    errs.append(f"binary exception expired {exc_info['expiresAt']}: {rel}")
            except ValueError:
                errs.append(f"binary exception expiresAt invalid: {rel} ({exc_info.get('expiresAt')!r})")
    return errs


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    binary_count = 0

    # 1. total repo budget (pack size) + 220 MiB warning line
    try:
        size_out = git(["count-objects", "-vH"])
        pack_line = next(l for l in size_out.splitlines() if l.startswith("size-pack:"))
        pack_mib = float(pack_line.split(":")[1].strip().split()[0])
    except (StopIteration, ValueError) as e:
        errors.append(f"cannot read pack size: {e}")
        pack_mib = 0.0
    if pack_mib > TOTAL_BUDGET_MIB:
        errors.append(f"repo pack {pack_mib:.1f} MiB exceeds hard budget {TOTAL_BUDGET_MIB} MiB")
    elif pack_mib > WARN_BUDGET_MIB:
        warnings.append(f"repo pack {pack_mib:.1f} MiB above {WARN_BUDGET_MIB} MiB warning line")

    # 2. per-file cap + 3. binary gate on tracked files
    tracked = git(["ls-files"]).splitlines()
    quarantine_bytes = 0
    for rel in tracked:
        if rel.startswith(SKIPPED_PREFIXES):
            if rel.startswith("design-lab/research/quarantine/"):
                try:
                    quarantine_bytes += (REPO / rel).stat().st_size
                except OSError as exc:
                    errors.append(f"cannot stat quarantine file: {rel} ({exc})")
            continue
        p = REPO / rel
        try:
            size = p.stat().st_size
        except OSError as exc:
            errors.append(f"cannot stat tracked file: {rel} ({exc})")
            continue
        if size > SINGLE_FILE_MIB * 1024 * 1024:
            errors.append(f"file exceeds {SINGLE_FILE_MIB} MiB cap: {rel} ({size/1048576:.1f} MiB)")

        suffix = Path(rel).suffix.lower()
        if suffix not in BINARY_SUFFIXES:
            continue
        binary_count += 1
        sidecar = Path(str(p) + ".license")
        if not sidecar.exists():
            errors.append(f"binary without .license sidecar (DL-AST-001): {rel}")
            continue
        try:
            sc = json.loads(sidecar.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            errors.append(f"binary sidecar not valid JSON (must be asset-sidecar v1): {rel}")
            continue
        if sc.get("schemaVersion") != SIDECAR_V1:
            errors.append(f"binary sidecar not structured v1 (legacy SPDX text is a violation): {rel}")
            continue
        if sc.get("file") != rel:
            errors.append(f"sidecar file mismatch: {rel} (sidecar says {sc.get('file')!r})")
        actual = sha256_of(p)
        if sc.get("sha256") != actual:
            errors.append(f"sidecar sha256 mismatch: {rel}")
        if not sc.get("license"):
            errors.append(f"sidecar missing license: {rel}")
        if not sc.get("author"):
            errors.append(f"sidecar missing author/rights holder: {rel}")
        for flag in ("redistributable", "modelInputAllowed", "commercialUse"):
            if not isinstance(sc.get(flag), bool):
                errors.append(f"sidecar {flag} must be boolean: {rel}")
        source_id = sc.get("sourceId")
        if source_id:
            try:
                reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
                known = any(e.get("source", {}).get("sourceId") == source_id for e in reg.get("entries", []))
                qreg = json.loads(QUARANTINE.read_text(encoding="utf-8"))
                quarantined = any(e.get("sourceId") == source_id for e in qreg.get("entries", []))
            except (OSError, json.JSONDecodeError) as exc:
                errors.append(f"cannot read source registries for {rel}: {exc}")
                known = quarantined = False
            if quarantined:
                errors.append(f"binary references quarantined sourceId {source_id} (not allowed): {rel}")
            elif not known:
                errors.append(f"binary sourceId not in SOURCE_REGISTRY: {rel} ({source_id})")
        else:
            exc_info = sc.get("exception")
            if not isinstance(exc_info, dict) or not exc_info.get("approvedBy") or not exc_info.get("expiresAt"):
                errors.append(f"binary without sourceId needs approved exception with expiry: {rel}")
            else:
                try:
                    if date.fromisoformat(exc_info["expiresAt"]) < date.today():
                        errors.append(f"binary exception expired {exc_info['expiresAt']}: {rel}")
                except ValueError:
                    errors.append(f"binary exception expiresAt invalid: {rel} ({exc_info.get('expiresAt')!r})")

    print(f"ASSET_GOVERNANCE={'FAIL' if errors else 'OK'}")
    print(f"pack_mib={pack_mib:.1f} hard_budget_mib={TOTAL_BUDGET_MIB} warn_mib={WARN_BUDGET_MIB} "
          f"files={len(tracked)} binaries={binary_count} quarantine_bytes={quarantine_bytes/1048576:.1f}MiB")
    for w in warnings:
        print("WARN :", w)
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
