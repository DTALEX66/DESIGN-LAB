# SPDX-License-Identifier: MIT
"""A read path that resolves a repository file at runtime must also be packaged.

CI's clean-wheel job found this class of defect the hard way on 2026-10-22: the project roll-up read
its own contract through ``PROJECT_ROOT``, which is ``Path(__file__).parents[3]`` -- the checkout in
a source tree, but the interpreter's ``Lib`` once installed. The route answered 500 and nothing but
an installed run could see it. ``repo_resource`` fixes the read; this module is what stops the next
call site from silently shipping a wheel that cannot serve it.

Two independent questions, because a declaration can rot in either direction:
  * does every ``repo_resource('…')`` literal in ``src/design_lab`` appear in pyproject's
    ``force-include`` block, mapped to the packaged path that helper actually looks under?
  * does the repository still carry the bytes that declaration points at?

The literals are enumerated from disk, not from a hand-kept list here: a gate that only proves its
own inventory would pass while an undeclared new call site shipped broken.
"""
from __future__ import annotations
import re
from pathlib import Path
import unittest

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / 'src' / 'design_lab'
SOURCE_ROOT = 'design-lab'
PACKAGED_PREFIX = 'design_lab/resources/repo/'
CALL = re.compile(r"""repo_resource\(\s*['"]([^'"]+)['"]\s*\)""")


def call_sites(tree=SRC) -> set[str]:
    return {match.group(1)
            for path in sorted(tree.rglob('*.py'))
            for match in CALL.finditer(path.read_text(encoding='utf-8'))}


def is_declared(relative: str, pyproject: str) -> bool:
    source = f'{SOURCE_ROOT}/{relative}'
    target = f'{PACKAGED_PREFIX}{source}'
    return any(f'"{source}"' in line and f'"{target}"' in line
               for line in pyproject.splitlines())


class PackagedContractResourceTests(unittest.TestCase):
    def setUp(self):
        self.pyproject = (REPO / 'pyproject.toml').read_text(encoding='utf-8')
        self.sites = call_sites()

    def test_the_scanner_finds_the_reads_it_claims_to_cover(self):
        # Without this, an inert regex would report "nothing to check" and every other test here
        # would pass over an empty population.
        self.assertTrue(self.sites, 'no repo_resource call site was found in src/design_lab')
        self.assertIn('schemas/project-list-v1.schema.json', self.sites)
        self.assertIn('schemas/task-readback-v1.schema.json', self.sites)
        self.assertIn('config/state-vocabularies.json', self.sites)

    def test_every_repo_resource_read_is_declared_in_the_wheel(self):
        undeclared = sorted(site for site in self.sites if not is_declared(site, self.pyproject))
        self.assertEqual(undeclared, [],
                         'these runtime reads resolve a repository file that no force-include line '
                         f'ships, so an installed wheel refuses instead of answering: {undeclared}')

    def test_the_declared_bytes_still_exist_in_the_checkout(self):
        absent = sorted(f'{SOURCE_ROOT}/{site}' for site in self.sites
                        if not (REPO / SOURCE_ROOT / site).exists())
        self.assertEqual(absent, [],
                         f'these packaged resources are declared but not in the repository: {absent}')

    def test_a_dropped_declaration_is_convicted(self):
        relative = 'schemas/project-list-v1.schema.json'
        self.assertTrue(is_declared(relative, self.pyproject))
        mutated = '\n'.join(line for line in self.pyproject.splitlines()
                            if f'"{SOURCE_ROOT}/{relative}"' not in line)
        self.assertNotEqual(mutated, self.pyproject, 'the sample line was never found')
        self.assertFalse(is_declared(relative, mutated),
                         'removing a force-include line changed nothing, so the check guards '
                         'nothing')


if __name__ == '__main__':
    unittest.main()
