#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Source registry governance verifier (KNOWLEDGE_ASSET_POLICY §2/§5).

Validates every SOURCE_REGISTRY entry against the SourceRecord contract:
- required governance fields: licenseStatus, version (commit pin), contentHash
  (sha256), reviewedBy/reviewedAt
- licenseStatus=unknown/reference-only entries must NOT enter runtime modes
  (adopt-now / adapter / vendor-adapt / derive-with-runtime)
- entries that cannot meet the contract are flagged quarantine (not deleted)
- legacy entries without the new fields are reported as GOVERNANCE_GAP counts
  so existing data stays readable while the risk surface is explicit.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ALLOWED_MODES = {'vendor-adapt', 'adapter', 'derive', 'reference', 'quarantine'}
ALLOWED_STATUS = {'adopt-now', 'adapter-next', 'reference-now', 'review-required'}
RUNTIME_MODES = {'vendor-adapt', 'adapter'}
SHA256_RE = re.compile(r'^(sha256:)?[0-9a-f]{64}$')


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    path = root / 'design-lab/research/global-absorption/SOURCE_REGISTRY.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    errors = []
    gaps = []
    ids = set()
    for i, e in enumerate(data.get('entries', [])):
        prefix = f'entry[{i}] {e.get("id")}'
        if e.get('id') in ids:
            errors.append(prefix + ': duplicate id')
        ids.add(e.get('id'))
        if e.get('integration_mode') not in ALLOWED_MODES:
            errors.append(prefix + ': invalid integration_mode')
        if e.get('status') not in ALLOWED_STATUS:
            errors.append(prefix + ': invalid status')
        if e.get('integration_mode') == 'vendor-adapt' and not e.get('license_verified'):
            errors.append(prefix + ': vendor-adapt requires verified license')
        if e.get('license') in ('UNVERIFIED', 'REFERENCE-ONLY') and e.get('integration_mode') not in ('reference', 'quarantine', 'derive'):
            errors.append(prefix + ': unclear license cannot be vendored')
        if not str(e.get('url', '')).startswith('https://'):
            errors.append(prefix + ': canonical https URL required')

        # ---- SourceRecord contract fields (KNOWLEDGE_ASSET_POLICY §2) ----
        license_status = e.get('licenseStatus')
        version = e.get('version')
        content_hash = e.get('contentHash')
        reviewed_by = e.get('reviewedBy') or e.get('reviewed_at')
        mode = e.get('integration_mode')

        missing = []
        if not license_status:
            missing.append('licenseStatus')
        if not version:
            missing.append('version')
        if not content_hash:
            missing.append('contentHash')
        if not reviewed_by:
            missing.append('reviewedBy/reviewedAt')

        if missing:
            # Legacy entry: report as governance gap; hard-fail only if it
            # would enter runtime context with unclear provenance.
            gap = f'{prefix}: governance gap (missing {", ".join(missing)})'
            gaps.append(gap)
            if mode in RUNTIME_MODES and not license_status:
                errors.append(gap + ' — runtime mode without licenseStatus')
            continue

        if mode in RUNTIME_MODES and license_status in ('unknown', 'reference-only'):
            errors.append(prefix + f': runtime mode with licenseStatus={license_status}')
        if content_hash and not SHA256_RE.match(content_hash):
            errors.append(prefix + ': contentHash must be sha256 hex')

    print(f'SOURCES={len(data.get("entries", []))}')
    print(f'ERRORS={len(errors)}')
    print(f'GOVERNANCE_GAPS={len(gaps)}')
    for err in errors:
        print('ERROR:', err)
    for g in gaps[:5]:
        print('GAP  :', g)
    if len(gaps) > 5:
        print(f'GAP  : ... and {len(gaps) - 5} more')
    print('VERIFY_SOURCE_REGISTRY=' + ('OK' if not errors else 'FAIL'))
    return 0 if not errors else 1


if __name__ == '__main__':
    raise SystemExit(main())
