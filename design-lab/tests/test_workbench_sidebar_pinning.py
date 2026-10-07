# SPDX-License-Identifier: MIT
"""The sidebar must stay pinned to the viewport, and a counter row must fill it.

Both rules were found by reading rendered pixels at 1280 (visual audit section 14),
which no overflow or contrast gate can express: a stretched grid item is not
overflowing, it is simply taller than the screen, and a 4-column track holding three
cards leaves a hole rather than a scrollbar. The assertions are pinned to the exact
forms that broke them so a future edit back to those forms fails here.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path

CSS = (Path(__file__).resolve().parents[2] / "apps" / "workbench" / "style.css"
       ).read_text(encoding="utf-8")


def rules(selector: str) -> list[str]:
    """Every declaration block for `selector` written at column 0, in source order.

    Media-query copies are excluded on purpose: they are intended cascade. A class
    may legitimately be declared twice (test_workbench_css_single_definition.py
    sanctions some), and the *later* block wins, so a guard that reads only the
    first one protects a dead declaration.
    """
    return re.findall(r"^" + re.escape(selector) + r"\{(.*?)\}", CSS,
                      re.DOTALL | re.MULTILINE)


def effective(selector: str, prop: str) -> str:
    """The winning value of `prop` for `selector`: its last declaration in source order."""
    found = [m.group(1).strip()
             for block in rules(selector)
             for m in re.finditer(re.escape(prop) + r"\s*:\s*([^;]+)", block)]
    assert found, f"{selector} never declares {prop}"
    return found[-1]


class SidebarPinningTests(unittest.TestCase):
    def test_sidebar_is_pinned_to_the_viewport(self):
        rule = rules(".sidebar")[0]
        self.assertIn("position:sticky", rule)
        self.assertIn("height:100vh", rule)
        self.assertIn("overflow-y:auto", rule)

    def test_the_broken_form_is_rejected(self):
        # `position:relative` + min-height:100vh is what shipped until 2026-10-07: the
        # grid item stretched to the document height, so `.sidebar-footer`'s
        # margin-top:auto parked the identity readback below the fold on the four
        # routes taller than the viewport (dashboard, project detail, brand systems,
        # settings).
        self.assertNotIn("min-height:100vh", rules(".sidebar")[0])

    def test_the_mobile_drawer_stays_a_fixed_overlay(self):
        # <=840px the sidebar is an off-canvas drawer; making it sticky there would
        # leave it painted behind the opened panel.
        drawer = re.search(r"\.sidebar\{([^}]*position:fixed[^}]*)\}", CSS)
        self.assertIsNotNone(drawer, "the off-canvas drawer rule disappeared")
        self.assertIn("transform:translateX(-100%)", CSS)


class CounterRowTests(unittest.TestCase):
    def test_kpi_track_follows_the_card_count(self):
        # The B10 replica block already asked for auto-fit; a later block overrode it
        # with a fixed 4, which left a ~240px hole on the routes holding three
        # counters (brand systems, deliverables). Only the winning declaration can
        # carry this assertion.
        self.assertIn("auto-fit", effective(".kpi-grid", "grid-template-columns"))

    def test_no_kpi_definition_forces_four_columns(self):
        for block in rules(".kpi-grid"):
            self.assertNotIn("repeat(4", block)


if __name__ == "__main__":
    unittest.main()
