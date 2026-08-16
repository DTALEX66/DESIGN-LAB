#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""DL-V2 P2-I: verify Provider SPI (fail-closed, model-neutral)."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import jsonschema

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "schemas" / "provider-capability.schema.json"
CORE = ROOT / "core"


def main() -> int:
    errors: list[str] = []
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator.check_schema(schema)
    spec = importlib.util.spec_from_file_location("dl_core_providers", str(CORE / "providers.py"))
    pm = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = pm
    spec.loader.exec_module(pm)

    # 合法声明：本地 VLM gateway
    ok = {"provider_id": "local.vlm.default", "schemaVersion": "design-lab/provider-capability/v1",
          "endpoint_ref": "provider:local/vlm/default", "model_ref": None,
          "capabilities": ["vision.design_critique"], "local_first": True}
    try:
        jsonschema.validate(ok, schema)
    except jsonschema.ValidationError as exc:
        errors.append(f"valid provider rejected: {exc.message}")
    errs = pm.validate_provider(ok)
    if errs:
        errors.append(f"valid provider rejected by core: {errs}")
    if pm.contains_absolute_path(ok):
        errors.append("absolute path detected in provider endpoint")

    # 非法：绝对路径 + 未知 capability
    bad = dict(ok, endpoint_ref="D:/All projects/Model library/vlm", capabilities=["deepseek.reason"])
    try:
        jsonschema.validate(bad, schema)
        errors.append("absolute-path provider must fail schema validation")
    except jsonschema.ValidationError:
        pass
    errs2 = pm.validate_provider(bad)
    if not errs2:
        errors.append("absolute-path/unknown-capability provider must be rejected")

    print(f"PROVIDER_SPI={'FAIL' if errors else 'PASS'}")
    for e in errors:
        print("ERROR:", e)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
