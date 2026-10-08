#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Measure the design-debt stock that DESIGN.md §4 states in prose.

Why this exists: §4's numbers (18 literal colours / 360 literal px / 9 shadows) were
hand-counted in `docs/audits/DESIGNLAB-LAUNCH-REVIEW-PREFLIGHT-2026-10-08.md` §36.4 and
cannot be reproduced by any rule. A contract that is about to become an acceptance
standard must not carry a number nobody can re-derive -- and the external design-review
plugin, run for the first time on 2026-10-08, disagrees with all three of them.

The rule is declared here and nowhere else:
  scope      apps/workbench/style.css, the five Workbench TypeScript modules, index.html
  unit       one count per literal OCCURRENCE (not per line, not per declaration)
  skipped    a line that declares a custom property (that is the token, not the debt),
             and everything inside a CSS or TypeScript comment (documenting a value is
             not hard-coding it)
  colours    #rgb/#rgba/#rrggbb/#rrggbbaa outside the allowlist, plus rgb()/rgba()/
             hsl()/hsla() literals
  px         `\\b[2-9]px\\b` and `\\b[1-9]\\d{1,3}px\\b` -- 0px and 1px are structural,
             not scale decisions (identical to the plugin's regex, so the two are
             directly comparable)
  shadows    every `box-shadow:` value, and how many of those already read a var()

Usage:
    python scripts/design_debt_baseline.py --show
    python scripts/design_debt_baseline.py --check     # DESIGN.md must state these
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CONTRACT = REPO / "DESIGN.md"

SCOPE = ("apps/workbench/style.css",
         "apps/workbench/main.ts",
         "apps/workbench/shell.ts",
         "apps/workbench/workbench.ts",
         "apps/workbench/design.ts",
         "apps/workbench/contracts.ts",
         "apps/workbench/index.html")

HEX = re.compile(r"(?<![\w])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w])")
FUNCTIONAL = re.compile(r"\b(?:rgb|rgba|hsl|hsla)\([^)]*\)")
PX = re.compile(r"\b(?:[2-9]|[1-9]\d{1,3})px\b")
SHADOW = re.compile(r"\bbox-shadow\s*:")
TOKEN_DECLARATION = re.compile(r"^\s*--[A-Za-z0-9-_]+\s*:")
ALLOWED_COLORS = {"#fff", "#000", "transparent"}

CSS_COMMENT = re.compile(r"/\*[\s\S]*?\*/")
LINE_COMMENT = re.compile(r"^\s*//.*$", re.MULTILINE)


def strip_comments(text: str) -> str:
    """Blank out comments, keeping line structure so line numbers stay meaningful."""
    def blank(match: re.Match[str]) -> str:
        return re.sub(r"[^\n]", " ", match.group(0))
    return LINE_COMMENT.sub(blank, CSS_COMMENT.sub(blank, text))


def measure() -> dict[str, int]:
    colors = pixels = shadows = shadow_tokened = 0
    for rel in SCOPE:
        path = REPO / rel
        if not path.is_file():
            raise SystemExit(f"MEASURE_ABORT: scope file missing: {rel}")
        text = strip_comments(path.read_text(encoding="utf-8", errors="replace"))
        for line in text.splitlines():
            if TOKEN_DECLARATION.match(line):
                continue
            hexes = [h for h in HEX.findall(line) if h.lower() not in ALLOWED_COLORS]
            colors += len(hexes) + len(FUNCTIONAL.findall(line))
            pixels += len(PX.findall(line))
            for match in SHADOW.finditer(line):
                shadows += 1
                if "var(" in line[match.start():]:
                    shadow_tokened += 1
    return {"literalColors": colors, "literalPx": pixels,
            "shadowDeclarations": shadows, "shadowDeclarationsReadingAVar": shadow_tokened}


def contract_statement(values: dict[str, int]) -> tuple[bool, str]:
    """DESIGN.md must quote the measured stock exactly, with the rule named next to it."""
    text = CONTRACT.read_text(encoding="utf-8") if CONTRACT.is_file() else ""
    expected = (f"字面色值 {values['literalColors']} 处、字面 px {values['literalPx']} 处、"
                f"阴影声明 {values['shadowDeclarations']} 条"
                f"（其中 {values['shadowDeclarationsReadingAVar']} 条已读 var()）")
    if expected in text:
        return True, expected
    return False, expected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--show", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if not (args.show or args.check):
        args.show = True

    values = measure()
    print("DESIGN_DEBT_SCOPE files=%d %s" % (len(SCOPE), " ".join(SCOPE)))
    print("DESIGN_DEBT literal_colors=%(literalColors)s literal_px=%(literalPx)s "
          "shadow_declarations=%(shadowDeclarations)s "
          "shadow_reading_var=%(shadowDeclarationsReadingAVar)s" % values)
    if not args.check:
        return 0
    stated, expected = contract_statement(values)
    if stated:
        print("DESIGN_DEBT_BASELINE=PASS DESIGN.md states the measured stock verbatim")
        return 0
    print("DESIGN_DEBT_BASELINE=DRIFT DESIGN.md does not state this exact sentence:")
    print("  " + expected)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
