#!/usr/bin/env python3
"""Clusters the entries of an export JSON thematically (phase 3, >20 entries).

Usage:  python3 scripts/synthesize.py export.json
        cat export.json | python3 scripts/synthesize.py

Outputs JSON with clusters (by word overlap) and outliers. This is
deliberately just a pre-sort — naming and judging the clusters remains
the skill's job, not this script's.
"""
import json
import re
import sys
from itertools import combinations

STOPWORDS = {
    # German
    "der", "die", "das", "und", "oder", "ein", "eine", "einen", "einem", "einer",
    "ist", "sind", "war", "mit", "für", "von", "auf", "aus", "bei", "als", "auch",
    "nicht", "kein", "keine", "wir", "ihr", "sie", "ich", "man", "sich", "dass",
    "wie", "was", "wenn", "dann", "noch", "nur", "aber", "mehr", "sehr", "kann",
    # English
    "the", "and", "for", "with", "that", "this", "not", "are", "was", "can",
    "have", "has", "our", "their", "them", "they", "you", "your", "its", "but",
    "all", "any", "more", "very", "when", "then", "than", "into", "out",
}
MIN_OVERLAP = 2  # shared significant words above which two entries count as linked


def tokens(text):
    words = re.findall(r"[a-zA-ZäöüÄÖÜß]{3,}", text.lower())
    return {w for w in words if w not in STOPWORDS}


def cluster(entries):
    toks = [tokens(e["text"]) for e in entries]
    # union-find over pairs with sufficient word overlap
    parent = list(range(len(entries)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i, j in combinations(range(len(entries)), 2):
        if len(toks[i] & toks[j]) >= MIN_OVERLAP:
            parent[find(i)] = find(j)

    groups = {}
    for i in range(len(entries)):
        groups.setdefault(find(i), []).append(i)

    clusters, outliers = [], []
    for members in groups.values():
        if len(members) == 1:
            outliers.append(entries[members[0]])
            continue
        shared = set.intersection(*(toks[m] for m in members)) or set.union(
            *(toks[m] for m in members)
        )
        clusters.append({
            "keywords": sorted(shared)[:5],
            "entries": [entries[m] for m in members],
        })
    clusters.sort(key=lambda c: -len(c["entries"]))
    return clusters, outliers


def main():
    raw = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
    export = json.loads(raw)
    entries = export.get("entries", [])
    if not entries:
        sys.exit("No entries[] found in the export.")
    clusters, outliers = cluster(entries)
    json.dump(
        {
            "method_id": export.get("method_id"),
            "entry_count": len(entries),
            "clusters": clusters,
            "outliers": outliers,
        },
        sys.stdout,
        ensure_ascii=False,
        indent=2,
    )
    print()


if __name__ == "__main__":
    main()
