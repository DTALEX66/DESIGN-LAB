# SPDX-License-Identifier: MIT
"""The asset -> observation -> IR seam, driven through the real asset store.

`Plan.from_ocr` and `plan_to_rir` were already tested in isolation, and both were reported as "no
production caller" — which is the same thing as saying the analysis leg of the loop could not be run at
all outside a test file. These tests pin the caller: bytes that were imported through the product's own
asset route, lowered through the existing bridge, and read back as a schema-valid IR whose raster node
points at the registered img-ID rather than at a filesystem path.

Nothing here claims a model ran. The observations are supplied, because no local OCR backend is
qualified (`readiness/model-radar.json`: QUALIFIED_LOCAL=0, every entry default_enabled:false), and the
empty-input case is asserted to refuse rather than to emit an empty document that would read like an
analysis that found nothing.
"""
import base64
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src'))
from design_lab.asset_analysis import AssetAnalysis, AssetAnalysisError   # noqa: E402
from design_lab.image_assets import ImageAssets                            # noqa: E402
from design_lab.service import ProjectService                              # noqa: E402

CANVAS = (400, 300)


def _png():
    from PIL import Image
    stream = io.BytesIO()
    Image.new('RGB', CANVAS, 'white').save(stream, format='PNG')
    return stream.getvalue()


def _detections():
    return [{'text': 'SUNRISE', 'confidence': 0.83,
             'polygon': [[20, 30], [220, 30], [220, 90], [20, 90]]},
            {'text': 'FESTIVAL', 'confidence': 0.61,
             'polygon': [[20, 120], [180, 120], [180, 170], [20, 170]]}]


class AssetAnalysisTests(unittest.TestCase):
    def setUp(self):
        parent = ROOT / '.project-local/task-runtime/asset-analysis'
        parent.mkdir(parents=True, exist_ok=True)
        os.environ.pop('PROJECT_LOCAL_ROOT', None)
        self._temp = tempfile.TemporaryDirectory(dir=parent)
        root = Path(self._temp.name)
        (root / 'AGENTS.md').write_text('# asset analysis fixture', encoding='utf-8')
        self.service = ProjectService(root)
        self.project = self.service.create_project('Analysis round')['id']
        imported = ImageAssets(self.service).import_image(
            self.project, base64.b64encode(_png()).decode('ascii'), 'analysis-1')
        self.asset_id = imported['asset']['id']
        self.analysis = AssetAnalysis(self.service)

    def tearDown(self):
        self._temp.cleanup()

    def test_imported_bytes_lower_to_a_schema_valid_ir(self):
        result = self.analysis.derive(self.project, self.asset_id,
                                      module='ocr-fixture', detections=_detections())
        self.assertEqual(result['status'], 'ASSET_ANALYSIS')
        self.assertEqual(result['object_count'], 3,
                         'two observations plus the unrecovered remainder — the bridge keeps the '
                         f'rest as a group rather than inventing a background: {result["object_count"]}')
        texts = [node for node in result['rir']['layers'] if node.get('type') == 'text']
        self.assertEqual([node['text']['content'] for node in texts], ['SUNRISE', 'FESTIVAL'],
                         f'both observations must reach the IR: {json.dumps(texts)[:300]}')
        rir = result['rir']
        self.assertEqual(rir['schemaVersion'], 'design-lab/reconstruction-ir/v1')
        self.assertEqual(rir['canvas']['width'], CANVAS[0],
                         'the canvas comes from the stored bytes, not from the caller')
        self.assertEqual(rir['canvas']['height'], CANVAS[1])
        # Measured shape of the bridge's output: the observations plus one `unknown` group for the
        # unrecovered remainder, every node inferred, and no raster node unless regions were
        # materialised. Asserting the absence is the point — a fabricated background layer would
        # turn "we did not recover this" into a claim about the artwork.
        self.assertEqual([node['type'] for node in rir['layers']], ['text', 'text', 'group'],
                         f'unexpected layer inventory: {json.dumps(rir["layers"])[:300]}')
        self.assertTrue(all(node['inferred'] for node in rir['layers']),
                        'nothing here is observed structure; the IR must not claim otherwise')
        self.assertEqual(rir['provenance']['evidence'], [self.asset_id],
                         'the IR is bound to the bytes the asset store verified, by img-ID')
        self.assertEqual(rir['provenance']['sourceId'], result['decomposition_id'])
        self.assertTrue(result['rir_sha256'].startswith('sha256:'),
                        'the document must be re-computable by whoever reads it back')

    def test_the_document_is_the_one_the_bridge_validates(self):
        from design_lab.reconstruction.contracts import validate_rir
        result = self.analysis.derive(self.project, self.asset_id,
                                      module='ocr-fixture', detections=_detections())
        validate_rir(result['rir'], project_root=ROOT)   # raises on any contract violation

    def test_no_observation_is_a_refusal_not_an_empty_analysis(self):
        for bad in ([], None, 'SUNRISE'):
            with self.assertRaises(AssetAnalysisError) as caught:
                self.analysis.derive(self.project, self.asset_id,
                                     module='ocr-fixture', detections=bad)
            self.assertEqual(caught.exception.code, 'NO_OBSERVATIONS',
                             f'an empty observation set must refuse, not emit: {bad!r}')

    def test_host_claims_inside_an_observation_are_refused(self):
        """The bridge accepts only {text, confidence, polygon}; invented fields must not pass."""
        polluted = [dict(_detections()[0], host_layer='background')]
        with self.assertRaises(AssetAnalysisError) as caught:
            self.analysis.derive(self.project, self.asset_id,
                                 module='ocr-fixture', detections=polluted)
        self.assertEqual(caught.exception.code, 'INVALID_OBSERVATION')

    def test_an_asset_that_does_not_exist_stays_an_error(self):
        from design_lab.image_assets import ImageAssetError
        with self.assertRaises(ImageAssetError):
            self.analysis.derive(self.project, 'img-' + '0' * 64,
                                 module='ocr-fixture', detections=_detections())

    def test_the_identity_is_reproducible_from_the_bytes_and_the_observation(self):
        first = self.analysis.derive(self.project, self.asset_id,
                                     module='ocr-fixture', detections=_detections())
        second = self.analysis.derive(self.project, self.asset_id,
                                      module='ocr-fixture', detections=_detections())
        self.assertEqual(first['decomposition_id'], second['decomposition_id'])
        self.assertEqual(first['rir_sha256'], second['rir_sha256'],
                         'the same bytes and the same observation must produce the same document')


if __name__ == '__main__':
    unittest.main()
