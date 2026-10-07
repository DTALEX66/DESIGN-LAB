# SPDX-License-Identifier: MIT
"""The 证据系统 delivery column may only say what the receipt contract can say.

apps/workbench/tests/appshell.mjs block ⑦ proves the behaviour (a click, one request, the
document and its two refusals on screen). Text cannot see behaviour, but behaviour cannot
see a vocabulary either: nothing stops this column from colouring a third, greener axis,
branching on a code the route never answers with, or reading the jury list without
reporting its shape. Those are claims about the SERVICE, and the service is Python, so
they are checked against Python here -- the same way
test_artifact_preflight_ui_contract.py checks the preflight profiles.

Every extraction asserts on the way. A pattern that matches nothing fails the gate rather
than passing on an empty set.
"""
from __future__ import annotations

import ast
import re
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SHELL = REPO / 'apps' / 'workbench' / 'shell.ts'
RECEIPT = REPO / 'src' / 'design_lab' / 'interop' / 'delivery_receipt.py'
DELIVERY = REPO / 'src' / 'design_lab' / 'native_delivery.py'
JURY = REPO / 'src' / 'design_lab' / 'jury_review.py'
HTTP = REPO / 'src' / 'design_lab' / 'http_service.py'

SHELL_TEXT = SHELL.read_text(encoding='utf-8')


def block_in(text: str, start_marker: str) -> str:
    """One top-level declaration, taken from its signature to the next one."""
    assert start_marker in text, f'{start_marker!r} is not in the source -- the gate lost ' \
                                'its subject rather than passing on it'
    start = text.index(start_marker)
    rest = text[start + len(start_marker):]
    stop = re.search(r"\n(?:export )?(?:async )?(?:function|const|type|interface|class|def) ",
                     rest)
    return text[start:start + len(start_marker) + (stop.start() if stop else len(rest))]


def block(start_marker: str) -> str:
    return block_in(SHELL_TEXT, start_marker)


def dispatch_text() -> str:
    """The HTTP dispatcher body: its route order AND its except order."""
    text = HTTP.read_text(encoding='utf-8')
    assert 'def dispatch(self):' in text and 'do_GET = dispatch' in text, \
        'http_service.py no longer has the dispatch body this gate reads'
    return text[text.index('def dispatch(self):'):text.index('do_GET = dispatch')]


def map_keys(declaration: str, where: str) -> set[str]:
    body = re.search(rf"const {declaration}: Record<string, string> = \{{([^}}]*)\}}",
                     SHELL_TEXT)
    assert body, f'{declaration} is gone from shell.ts -- {where}'
    keys = set(re.findall(r"([A-Z][A-Z_]+):", body.group(1)))
    assert keys, f'{declaration} declares no entries -- the gate would prove nothing'
    return keys


def python_tuple_constant(path: Path, name: str) -> set[str]:
    """The upper-case members of a module-level tuple constant."""
    body = re.search(rf"^{name} = \((.*?)\)", path.read_text(encoding='utf-8'), re.S | re.M)
    assert body, f'{name} is no longer a tuple constant in {path.name}'
    # Either quote style: delivery_receipt.py declares its vocabulary with double quotes
    # and the UI mirrors it with single ones, and a gate that only read one would miss a
    # word the other side added.
    words = set(re.findall(r"""['"]([A-Z][A-Z_]*)['"]""", body.group(1)))
    assert words, f'{name} declares no values'
    return words


class ReceiptAxisVocabulary(unittest.TestCase):
    def test_the_page_colours_only_the_axes_the_receipt_contract_can_write(self):
        """A chip colour is a claim: PARTIAL green would read as an accepted delivery."""
        emitted = python_tuple_constant(RECEIPT, 'DELIVERY_AXES')
        painted = map_keys('RECEIPT_AXIS_TAGS',
                           'the page can no longer say which delivery axes it colours')
        self.assertEqual(painted - emitted, set(),
                         f'the page colours {sorted(painted - emitted)}, which '
                         'interop/delivery_receipt.py never writes into a receipt')
        self.assertEqual(emitted - painted, set(),
                         f'the contract can emit {sorted(emitted - painted)} and the page has no '
                         'wording for it, so a real delivery would fall through to neutral')

    def test_the_jury_acceptance_words_are_the_readbacks_own(self):
        """human_acceptance is one of two words in jury_review.py; a third would be invented."""
        text = JURY.read_text(encoding='utf-8')
        emitted = set(re.findall(r"'human_acceptance': '([A-Z_]+)' if .*? else '([A-Z_]+)'",
                                 text, re.S))
        words = {word for pair in emitted for word in pair}
        assert words, 'jury_review.py no longer states human_acceptance as a two-word choice'
        self.assertEqual(map_keys('ACCEPTANCE_TAGS', 'the jury column lost its acceptance chips'),
                         words,
                         'the 证据系统 jury column and the readback disagree about what acceptance is')


class ReceiptRouteContract(unittest.TestCase):
    def test_the_page_branches_only_on_codes_the_delivery_layer_raises(self):
        refusal = block('function receiptRefusal(')
        named = set(re.findall(r"code === '([A-Z_]+)'", refusal))
        assert named, 'receiptRefusal no longer branches on a service code -- it cannot be ' \
                      'telling the two refusals apart'
        raised = set()
        for node in ast.walk(ast.parse(DELIVERY.read_text(encoding='utf-8'))):
            if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                    and node.func.id == 'ImageAssetError' and len(node.args) == 2
                    and isinstance(node.args[1], ast.Constant)):
                raised.add(node.args[1].value)
        self.assertTrue(raised, 'native_delivery.py raises no ImageAssetError with a code')
        self.assertEqual(named - raised, set(),
                         f'the page names {sorted(named - raised)}, which '
                         'NativeDelivery never raises: the branch would never run and the '
                         'refusal would read as an unknown failure')
        for code in ('DELIVERY_RECEIPT_NOT_FOUND', 'DELIVERY_RECEIPT_UNVERIFIED'):
            self.assertIn(code, raised, f'{code} is no longer what the receipt read raises')
            self.assertIn(code, refusal, f'{code} is no longer said in its own words')

    def test_the_receipt_url_is_built_from_the_three_readback_ids(self):
        runner = block('async function runDeliveryReceipt(')
        self.assertRegex(runner,
                         r"`/projects/\$\{[A-Za-z]+\}/bundles/\$\{[A-Za-z]+\}/versions/"
                         r"\$\{[A-Za-z]+\}/receipt`",
                         'the receipt URL is not assembled from a project id, a bundle id and '
                         'a version id -- it is pointing at something else')
        self.assertNotIn("'/receipt'", runner.replace('/receipt`', ''),
                         'a receipt path that is not built from the readback ids')

    def test_the_route_dispatches_the_receipt_before_the_generic_not_found(self):
        """The route must exist and must not swallow the receipt's own codes."""
        dispatch = dispatch_text()
        route = re.search(r"re\.fullmatch\(r'(/api/projects/\(\[0-9a-f\]\{32\}\)"
                          r"/bundles/\(bundle-native-\[0-9a-f\]\{64\}\)"
                          r"/versions/\(v-\[0-9a-f\]\{32\}\)/receipt)'", dispatch)
        assert route, 'http_service.py no longer dispatches the delivery receipt route'
        self.assertIn('NativeDelivery(service).receipt(*match.groups())', dispatch,
                      'the route does not read the receipt through NativeDelivery, so it is '
                      'not the re-verifying read the CLI verb uses')
        handler = dispatch.index(route.group(1))
        self.assertLess(handler, dispatch.index('raise RequestError(404, \'NOT_FOUND\')'),
                        'the receipt route must be dispatched before the fall-through 404')
        self.assertLess(dispatch.index('except ImageAssetError'),
                        dispatch.index('except (ValueError, PathPolicyError)'),
                        'ImageAssetError must keep its own code and status; after the generic '
                        'ValueError clause every receipt refusal would collapse to '
                        'INVALID_REQUEST')

    def test_the_evidence_view_reads_the_jury_route_and_reports_its_shape(self):
        """Three operator records, and the one that is a list read must be reported."""
        evidence = block('export async function renderEvidence(')
        self.assertIn("apiOrEmpty<JuryReadback>(`/projects/${id}/jury`, JURY_UNREADABLE)",
                      evidence, '证据系统 does not read GET /projects/<id>/jury through the '
                                'seam that reports a missing collection')
        notices = re.search(r"shapeNoticeRows\(([^)]*)\)", evidence)
        assert notices, '证据系统 lost its shape notice rows'
        self.assertIn('juryResp', notices.group(1),
                      'the jury readback is rendered but its missing fields are never named')
        self.assertIn('evidenceDeliveryColumn(id, bundlesResp)', evidence,
                      '证据系统 lost the preflight + receipt column, so the two delivery '
                      'records are back to not appearing anywhere')
        # A click column, not a page-build read: the only requests the two delivery
        # records may make are inside onclick handlers.
        self.assertNotIn('await runDeliveryReceipt', evidence,
                         'the receipt must not be read while the page is being built')


if __name__ == '__main__':
    unittest.main()
