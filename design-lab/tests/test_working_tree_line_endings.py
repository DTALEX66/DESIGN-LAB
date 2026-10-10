# SPDX-License-Identifier: MIT
"""The working tree must obey the repository's own declared line-ending policy.

`.gitattributes` says `* text=auto eol=lf` (and repeats `eol=lf` for .py/.md/.json/.sh), with
`.bat` as the one deliberate `eol=crlf`. Git hides a violation here: with `core.autocrlf=true`
a CRLF working copy still normalizes on commit, so nothing in `git status` complains -- and the
damage lands somewhere else entirely. This session silently converted `apps/workbench/shell.ts`
and eight other files to CRLF (one `Path.write_text()` on Windows, which translates "\\n" unless
`newline` is given), and the first thing that noticed was three falsifier scripts whose anchors
contain "\\n" reporting `count=0` -- i.e. **guards that had stopped guarding while still
exiting 0 on the other plants**. A whole-file ending change also buries the real diff.

The check reads `git ls-files --eol -z`, so it judges the files git actually tracks, and it
compares each file's worktree eol against the attribute git resolved for it. `-z` matters: this
repository has tracked paths with Chinese characters, and splitting porcelain on newlines would
either fail to stat them or report a silent zero-byte size.
"""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def entries() -> list[tuple[str, str, str]]:
    """(path, worktree_eol, attribute) for every tracked file, NUL-separated."""
    proc = subprocess.run(['git', '-C', str(REPO), 'ls-files', '--eol', '-z'],
                          capture_output=True, check=True)
    rows = []
    for record in proc.stdout.split(b'\x00'):
        if not record:
            continue
        line = record.decode('utf-8', errors='replace')
        # Format: `i/<eol> w/<eol> attr/<attrs>\t<path>`; the attrs may contain spaces.
        meta, _, path = line.partition('\t')
        parts = meta.split()
        if len(parts) < 3 or not path:
            continue
        worktree = parts[1].removeprefix('w/')
        # The attribute field is space-separated itself: `attr/text=auto eol=lf`. Joining it
        # back is the whole point -- reading only parts[2] yields `text=auto` and silently
        # drops the `eol=` rule, which makes every check below vacuous.
        attribute = ' '.join(parts[2:]).removeprefix('attr/')
        rows.append((path, worktree, attribute))
    return rows


class WorkingTreeLineEndingTests(unittest.TestCase):
    def test_policy_is_declared_before_anything_is_judged(self):
        """Without an explicit `eol=` in the attributes there is no rule to check against, and
        this file would pass by vacuity -- so the policy itself is asserted first."""
        declared = [attr for _, _, attr in entries() if 'eol=lf' in attr]
        self.assertGreater(len(declared), 100,
                           'the repository no longer declares eol=lf for its text files, so '
                           'this gate has nothing to compare against')

    def test_no_tracked_file_violates_its_declared_eol_beyond_the_baseline(self):
        """Judged against a pinned baseline, in both directions.

        63 tracked files already sit CRLF in the working tree (`.png.license` sidecars and
        history documents written by earlier tooling), so an empty-list assertion would have
        been red on its first run and would have been "fixed" by narrowing the check. The
        baseline may only SHRINK: a new entry is the regression this gate exists to catch, and
        a resolved entry left in the list is the same rot in the other direction.
        """
        baseline = json.loads((REPO / 'design-lab/config/line-ending-baseline.json')
                              .read_text(encoding='utf-8'))
        known = set(baseline['violations'])
        found = set()
        for path, worktree, attribute in entries():
            if 'binary' in attribute:
                continue
            if 'eol=lf' in attribute and worktree not in ('lf', 'none'):
                found.add(path)
            elif 'eol=crlf' in attribute and worktree not in ('crlf', 'none'):
                found.add(path)
        new = sorted(found - known)
        stale = sorted(known - found)
        self.assertEqual(new, [],
                         'these tracked files became CRLF while .gitattributes declares '
                         'eol=lf -- a scratch rewrite (Path.write_text without newline="") is '
                         'the usual cause, and it silently breaks every tool whose anchors '
                         'contain "\\n": ' + ', '.join(new[:20]))
        self.assertEqual(stale, [],
                         'these files are fixed but still listed as known debt; drop them from '
                         'the baseline so it keeps shrinking: ' + ', '.join(stale[:20]))
        self.assertEqual(baseline['schemaVersion'], 'design-lab/line-ending-baseline/v1')

    def test_the_bat_exception_is_still_the_only_crlf_policy(self):
        crlf_paths = sorted(path for path, _, attr in entries() if 'eol=crlf' in attr)
        self.assertTrue(crlf_paths, 'the .bat CRLF exception disappeared from .gitattributes')
        self.assertTrue(all(p.endswith('.bat') for p in crlf_paths),
                        f'non-.bat files now declare eol=crlf: {crlf_paths}')


if __name__ == '__main__':
    unittest.main(verbosity=2)
