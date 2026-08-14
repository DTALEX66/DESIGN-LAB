# SPDX-License-Identifier: MIT
"""Regression tests for fail-closed network-backed design utilities."""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]


def load_rel(rel: str):
    path = ROOT / rel
    name = "test_loaded_" + path.stem
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class ExtractCssVarsBoundaryTests(unittest.TestCase):
    def test_collector_reports_failed_linked_stylesheet(self):
        module = load_rel("intelligence/anydesign/scripts/extract_css_vars.py")
        html = (
            '<style>:root { --inline-color: #111; }</style>'
            '<link rel="stylesheet" href="/good.css">'
            '<link rel="stylesheet" href="/missing.css">'
        )

        def fake_get(url, timeout=15):
            if url.endswith("/good.css"):
                return ":root { --linked-color: #222; }"
            return None

        with mock.patch.object(module, "http_get", side_effect=fake_get):
            pairs, sources, failed = module.collect_stylesheets(
                html, "https://example.test/page", timeout=1
            )

        self.assertEqual({name for name, _ in pairs}, {"inline-color", "linked-color"})
        self.assertIn("https://example.test/missing.css", failed)
        self.assertEqual(len(sources), 2)

    def test_default_cli_aborts_without_partial_output(self):
        module = load_rel("intelligence/anydesign/scripts/extract_css_vars.py")
        html = '<link rel="stylesheet" href="/missing.css">'
        with (
            mock.patch.object(module, "http_get", side_effect=[html, None]),
            mock.patch.object(module.sys, "argv", ["extract_css_vars.py", "https://example.test"]),
            self.assertRaises(SystemExit) as raised,
        ):
            module.main()
        self.assertEqual(raised.exception.code, 1)

    def test_allow_partial_marks_output_incomplete(self):
        module = load_rel("intelligence/anydesign/scripts/extract_css_vars.py")
        html = '<link rel="stylesheet" href="/missing.css">'
        with tempfile.TemporaryDirectory() as raw:
            output = Path(raw) / "tokens.json"
            with (
                mock.patch.object(module, "http_get", side_effect=[html, None]),
                mock.patch.object(
                    module.sys,
                    "argv",
                    [
                        "extract_css_vars.py",
                        "https://example.test",
                        "--allow-partial",
                        "--output",
                        str(output),
                    ],
                ),
            ):
                module.main()
            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertFalse(payload["_meta"]["complete"])
            self.assertEqual(payload["_meta"]["failed_stylesheets"], [
                "https://example.test/missing.css"
            ])


class VerifyDesignBoundaryTests(unittest.TestCase):
    def test_linked_stylesheet_failure_aborts_drift_verification(self):
        module = load_rel("intelligence/anydesign/scripts/verify_design.py")
        html = '<link rel="stylesheet" href="/missing.css">'
        with mock.patch.object(module, "http_get", side_effect=[html, None]):
            self.assertIsNone(module.fetch_live_css_vars("https://example.test/page", timeout=1))


class CaptureSiteBoundaryTests(unittest.TestCase):
    def test_navigation_failure_aborts_and_closes_browser(self):
        module = load_rel("intelligence/anydesign/scripts/capture_site.py")

        class FakePage:
            def goto(self, *args, **kwargs):
                raise RuntimeError("offline")

        class FakeContext:
            def new_page(self):
                return FakePage()

        class FakeBrowser:
            def __init__(self):
                self.closed = False

            def new_context(self, **kwargs):
                return FakeContext()

            def close(self):
                self.closed = True

        browser = FakeBrowser()

        class FakeChromium:
            def launch(self, **kwargs):
                return browser

        class FakePlaywright:
            chromium = FakeChromium()

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        sync_api = types.ModuleType("playwright.sync_api")
        sync_api.sync_playwright = lambda: FakePlaywright()
        playwright = types.ModuleType("playwright")
        playwright.sync_api = sync_api
        with (
            mock.patch.dict(sys.modules, {"playwright": playwright, "playwright.sync_api": sync_api}),
            tempfile.TemporaryDirectory() as raw,
            self.assertRaisesRegex(RuntimeError, "Page navigation failed"),
        ):
            module.capture_one(
                "https://example.test",
                Path(raw) / "capture.png",
                (1440, 900),
                "desktop",
            )
        self.assertTrue(browser.closed)


if __name__ == "__main__":
    unittest.main()
