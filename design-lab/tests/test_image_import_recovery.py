# SPDX-License-Identifier: MIT
"""Failure after real file rename must not become a successful import receipt."""
import base64
from contextlib import closing
import io
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'src'))
from design_lab.service import ProjectService
from design_lab.image_assets import ImageAssets, ImageAssetError
from design_lab.runtime import asset_store


class ImageImportRecoveryTests(unittest.TestCase):
    def test_real_rename_failure_stays_unknown_then_quarantines(self):
        from PIL import Image
        parent = ROOT / '.project-local/task-runtime/image-import-recovery'
        parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=parent) as temporary, patch.dict(os.environ):
            os.environ.pop('PROJECT_LOCAL_ROOT', None)
            root = Path(temporary)
            (root / 'AGENTS.md').write_text('# synthetic recovery fixture', encoding='utf-8')
            service = ProjectService(root)
            project = service.create_project('Recovery fixture')['id']
            images = ImageAssets(service)
            stream = io.BytesIO()
            Image.new('RGB', (12, 8), 'green').save(stream, format='PNG')
            encoded = base64.b64encode(stream.getvalue()).decode()
            with patch.object(asset_store, '_after_rename', side_effect=OSError('synthetic post-rename interruption')):
                with self.assertRaises(OSError):
                    images.import_image(project, encoded, 'recovery')
            with closing(sqlite3.connect(service.database)) as conn:
                self.assertEqual(conn.execute('SELECT state FROM attempt_state').fetchall(), [('OUTCOME_UNKNOWN',)])
                self.assertEqual(conn.execute('SELECT state FROM operation_state').fetchall(), [('OUTCOME_UNKNOWN',)])
                self.assertEqual(conn.execute('SELECT state FROM asset_publication').fetchall(), [('PREPARED',)])
                self.assertEqual(conn.execute('SELECT COUNT(*) FROM asset_version').fetchone()[0], 0)
            with self.assertRaises(ImageAssetError) as raised:
                images.import_image(project, encoded, 'recovery')
            self.assertEqual(raised.exception.code, 'IMPORT_REQUIRES_RECONCILIATION')
            with closing(asset_store.connect(service.database, project_root=root)) as conn:
                recovered = asset_store.recover_publications(
                    conn, store_root=service.paths.category_dir('projects', project, 'assets'), project_root=root)
                self.assertEqual([r['state'] for r in recovered], ['QUARANTINED'])
                self.assertEqual(Path(recovered[0]['path']).read_bytes(), stream.getvalue())
                self.assertEqual(conn.execute('SELECT COUNT(*) FROM attempt_state').fetchone()[0], 1)
            self.assertEqual(images.list(project), [])


if __name__ == '__main__':
    unittest.main()
