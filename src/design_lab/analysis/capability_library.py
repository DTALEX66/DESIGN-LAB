# SPDX-License-Identifier: MIT
"""DL-UI-PLAN: project the existing capability records into one read-only library view.

The library is assembled from documents the repository already maintains and gates;
nothing here discovers, installs, qualifies or downloads a capability:

* ``vendor/sources.lock.json``       - the 46 SourceRecords (license, disposition,
  presence, content digest, observation date);
* ``vendor/sources.revisions.json``  - commit revisions recovered by exact
  repository-path join, plus the explicitly unresolved set;
* ``design-lab/readiness/model-radar.json`` - model presence vs claim, with a
  five-stage state vocabulary.

Three rules the tests pin, because they are the failure modes this project keeps
hitting: an absent revision is ``NOT_VERIFIED`` and never "no provenance"; a
capability that has not been qualified reports ``qualified = None`` rather than
``False`` or a score; and every count is derived from the records in this call,
so a stale number cannot be hardcoded into the projection.
"""
from __future__ import annotations

import json
from pathlib import Path

SCHEMA_VERSION = "design-lab/capability-library/v1"
LOCK_REL = Path("vendor") / "sources.lock.json"
REVISIONS_REL = Path("vendor") / "sources.revisions.json"
RADAR_REL = Path("design-lab") / "readiness" / "model-radar.json"

#: Qualification is a host run plus a human acceptance outcome. Neither is
#: derivable from a registry, so the field is null until one is recorded.
UNQUALIFIED = None


def _read_json(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"capability library input missing: {path.name}")
    return json.loads(path.read_text(encoding="utf-8"))


def _source_capability(entry: dict, revisions: dict, unresolved: dict) -> dict:
    identity = str(entry.get("id", ""))
    pinned = revisions.get(identity)
    if pinned:
        state, revision = "VERIFIED", pinned.get("revision")
    elif identity in unresolved:
        state, revision = "UNRESOLVED", None
    else:
        # The revisions file's own meaning field says this: absence from `sources`
        # means NOT VERIFIED, never absence of provenance.
        state, revision = "NOT_VERIFIED", None
    return {
        "id": identity,
        "kind": "source",
        "domain": None,
        "title": entry.get("path") or identity,
        "disposition": entry.get("disposition"),
        "license": entry.get("license"),
        "presence": entry.get("presence"),
        "url": entry.get("canonicalUrl") or entry.get("url"),
        "revision": revision,
        "revisionState": state,
        "revisionReason": unresolved.get(identity),
        "repo": (pinned or {}).get("repo"),
        "observedAt": entry.get("observedAt"),
        "contentDigest": entry.get("contentDigest"),
        "qualified": UNQUALIFIED,
        "qualificationEvidence": None,
    }


def _model_capability(entry: dict) -> dict:
    source = entry.get("source") or {}
    return {
        "id": str(entry.get("model_id", "")),
        "kind": "model",
        "domain": entry.get("family"),
        "title": entry.get("model_id"),
        "disposition": entry.get("radar_state"),
        "license": source.get("license_id"),
        "presence": entry.get("machine_state"),
        "url": None,
        "revision": None,
        # A model's revision is not tracked by the vendor mechanism; saying
        # NOT_VERIFIED keeps the vocabulary consistent instead of inventing one.
        "revisionState": "NOT_VERIFIED",
        "revisionReason": None,
        "repo": None,
        "observedAt": entry.get("observed_at"),
        "contentDigest": None,
        "qualified": UNQUALIFIED,
        "qualificationEvidence": None,
    }


#: The three inputs are repository-committed records, not per-project or machine-local
#: state, so the library reads them from the package's own repository root. Resolving
#: them from a service project root would make the route depend on whichever synthetic
#: tree a harness happened to boot.
REPO_ROOT = Path(__file__).resolve().parents[3]


def build(root: Path | None = None) -> dict:
    """Return the capability library projection for one repository root."""
    root = Path(root) if root is not None else REPO_ROOT
    lock = _read_json(root / LOCK_REL)
    revisions = _read_json(root / REVISIONS_REL)
    radar = _read_json(root / RADAR_REL)
    pinned = revisions.get("sources") or {}
    unresolved = {str(item.get("id")): item.get("reason")
                  for item in (revisions.get("unresolved") or [])}

    capabilities = [_source_capability(entry, pinned, unresolved)
                    for entry in lock.get("sources", [])]
    capabilities += [_model_capability(entry) for entry in radar.get("entries", [])]

    def tally(field: str) -> dict:
        counts: dict[str, int] = {}
        for item in capabilities:
            key = str(item.get(field))
            counts[key] = counts.get(key, 0) + 1
        return dict(sorted(counts.items()))

    return {
        "schemaVersion": SCHEMA_VERSION,
        "meaning": ("Read-only projection of the source lock, the vendor revision "
                    "record and the model radar. It never installs, qualifies, "
                    "licenses or runs anything."),
        "unmeasuredMeans": ("null = not measured or not adjudicated. It is not 0, "
                            "not false and not 'none'. qualified=null means no host "
                            "run and no human acceptance exists yet."),
        "counts": {
            "total": len(capabilities),
            "byKind": tally("kind"),
            "byLicense": tally("license"),
            "byRevisionState": tally("revisionState"),
            "qualified": sum(1 for c in capabilities if c["qualified"] is not None),
        },
        "sources": {"lock": LOCK_REL.as_posix(), "revisions": REVISIONS_REL.as_posix(),
                    "radar": RADAR_REL.as_posix()},
        "capabilities": capabilities,
    }
