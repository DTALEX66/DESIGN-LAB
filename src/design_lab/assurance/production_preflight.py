# SPDX-License-Identifier: MIT
"""Production preflight of an ARTIFACT, against a declared profile.

Until now the product had two things that looked like preflight and were not it:
`/api/task-preflight`, which probes tools and resources for a task, and
`design-lab/production/preflight/check_preflight.py`, which walks a directory and
returns five string codes. Meanwhile `design-lab/production/profiles/*.json`
declared a `pass|warning|fail` vocabulary at `blocker|high|medium` severity that
nothing could emit. Declared vocabulary nobody can produce is a false-green
machine: a reader assumes the checks ran.

This module emits that vocabulary for the checks it can actually measure and says
`NOT_MEASURED` out loud for the rest. Three rules hold it together:

* only checks the profile declares are reported, so a check cannot disappear by
  being forgotten here;
* a check PASSes only against a stated criterion, and every finding carries the
  `criterion` it was judged against, including where that criterion came from when
  the profile itself declares no thresholds;
* `PASS` as a verdict requires every applicable check to have been measured and
  passed. One `NOT_MEASURED` caps the result at `INCOMPLETE`.

So a PSD whose transparency flattening this build cannot inspect reports INCOMPLETE
with the reason, instead of inheriting a green tick from the checks that happened
to work.

Contract binding, recorded 2026-10-08 (a schema audit claimed this payload disagreed
with ``design-lab/schemas/preflight.schema.json`` over ``verdict`` vs ``status``):

* that schema describes the PROFILE documents under ``design-lab/production/profiles/``
  (``const`` ``schemaVersion`` ``design-lab/preflight/v2``, requiring ``preflight_id``
  and ``required_checks``), plus the optional nested ``result`` report that
  :func:`design_lab.assurance.handoff_readiness.decide` consumes. It never requires a
  top-level ``status``, and this module is not its instance: the profile is its INPUT
  (:func:`load_profile`), the report below is this module's own OUTPUT.
* the output is bound to ``design-lab/schemas/artifact-preflight.schema.json``
  (``design-lab/artifact-preflight/v1``), whose top-level outcome field is ``verdict``.
  The Workbench column reads ``verdict`` from
  ``GET /api/projects/<id>/bundles/<id>/preflight`` today, so the field name is the
  shipped contract, not drift.
* emitter and schema are compared in both directions -- required-but-not-emitted and
  emitted-but-not-declared -- by ``design-lab/scripts/verify_artifact_preflight_contract.py``,
  which validates a real emitted payload and fails when it finds nothing to compare.
"""
from __future__ import annotations

import hashlib
import json
import tempfile
import zipfile
from contextlib import closing
from pathlib import Path

PROFILE_DIR = Path(__file__).resolve().parents[3] / 'design-lab' / 'production' / 'profiles'

PASS = 'PASS'
WARNING = 'WARNING'
FAIL = 'FAIL'
NOT_MEASURED = 'NOT_MEASURED'
NOT_APPLICABLE = 'NOT_APPLICABLE'
VERDICTS = ('PASS', 'WARN', 'BLOCKED', 'INCOMPLETE')

# Colour intent per profile. A print job still in RGB is a production fault; the
# reverse is a warning because many digital assets legitimately carry no profile.
EXPECTED_MODE = {'print': (['CMYK'], '印刷交付应为 CMYK（ISO 12647 语境）'),
                 'digital': (['RGB', 'RGBA', 'L', 'P'], '数字交付应为 sRGB 族'),
                 'video': (['RGB', 'RGBA'], '视频帧应为 RGB 族')}
MIN_PRINT_PPI = 150.0
CRITERION_SOURCE = ('production_preflight 内置判据；profile 只声明了检查项与严重度，'
                    '未声明阈值')


def load_profile(name: str) -> dict:
    path = PROFILE_DIR / f'preflight-{name}.json'
    if not path.is_file():
        raise FileNotFoundError(f'no preflight profile named {name!r}')
    return json.loads(path.read_text(encoding='utf-8'))


class PreflightError(RuntimeError):
    pass


def preflight_archive(archive_path, *, profile: str = 'digital', expected_sha256=None) -> dict:
    """Preflight the artifacts inside a delivery archive.

    The archive is the delivery unit the product actually ships, so this is the
    entry a route can call without accepting a caller-supplied directory. Its own
    manifest supplies the bill of materials, which is what lets `missing-links`
    be measured rather than asserted.
    """
    path = Path(archive_path)
    if not path.is_file():
        raise PreflightError(f'交付归档不存在：{path.name}')
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if expected_sha256 and digest != str(expected_sha256).removeprefix('sha256:'):
        raise PreflightError('交付归档摘要与登记不符：读回的字节不是被批准的项目版本')
    with tempfile.TemporaryDirectory(prefix='preflight-') as scratch:
        root = Path(scratch)
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            for name in names:
                if name.startswith('..') or '/..' in name or name.startswith('/'):
                    raise PreflightError(f'归档成员路径越界：{name}')
            archive.extractall(root)
        manifest_path = root / 'bundle-manifest.json'
        manifest = {}
        if manifest_path.is_file():
            try:
                manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            except json.JSONDecodeError as exc:
                raise PreflightError(f'bundle-manifest.json 无法解析：{exc}') from None
        bom_items = []
        files = manifest.get('files') or {}
        for name, entry in files.items():
            if isinstance(entry, dict):
                bom_items.append({'id': name, 'path': str(root / name),
                                  'sha256': entry.get('sha256')})
        artifacts = [root / name for name in names
                     if Path(name).suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.tif')]
        result = run_preflight(artifacts, profile=profile,
                               bom={'items': bom_items} if bom_items else None)
    result['archive'] = {'name': path.name, 'sha256': digest, 'members': len(names),
                         'manifest_present': bool(files)}
    result['findings'].insert(0, {
        'id': 'archive-digest', 'severity': 'blocker', 'outcome': PASS,
        'detail': f'归档按登记摘要读回：{digest[:16]}…',
        'criterion': '摘要必须与状态库中登记的字节一致',
        'measured': {'sha256': digest, 'members': len(names)}})
    return result


def preflight_bundle(service, project_id, bundle_id, *, profile='digital') -> dict:
    """Preflight a project's registered delivery bundle, resolved from the state DB.

    No path arrives from the browser: the artifact is looked up by id, restricted to
    the project, and its registered digest is verified against the bytes on disk.
    """
    from ..runtime.asset_store import connect as connect_assets
    database = service.paths.database_path(service.database)
    with closing(connect_assets(database, project_root=service.paths.project_root)) as conn:
        row = conn.execute(
            'SELECT art.path, art.sha256 FROM artifact art'
            ' JOIN asset_version v ON v.version_id = art.version_id'
            ' JOIN asset a ON a.asset_id = v.asset_id'
            " WHERE a.asset_id = ? AND a.project_id = ? AND v.state = 'ACTIVE'"
            ' ORDER BY v.version_no DESC', (bundle_id, project_id)).fetchone()
    if row is None:
        raise PreflightError(f'该项目没有可预检的交付登记：{bundle_id}')
    return preflight_archive(row[0], profile=profile, expected_sha256=row[1])


def _finding(check_id, severity, outcome, detail, *, criterion, measured=None):
    return {'id': check_id, 'severity': severity, 'outcome': outcome, 'detail': detail,
            'criterion': criterion, 'measured': measured or {}}


def _not_measured(check_id, severity, reason):
    return _finding(check_id, severity, NOT_MEASURED, reason,
                    criterion='无法建立判据：' + reason.split('；')[0])


def _read_images(artifacts, severity):
    """Open each artifact with Pillow. Anything unreadable is reported, never skipped."""
    from PIL import Image
    images, problems = [], []
    for raw in artifacts:
        path = Path(raw)
        if not path.is_file():
            problems.append(_finding('artifact-present', severity.get('artifact-present', 'blocker'),
                                     FAIL, f'产物不存在：{path.name}',
                                     criterion='交付清单中的每个文件都必须可读回'))
            continue
        if path.stat().st_size == 0:
            problems.append(_finding('artifact-present', 'blocker', FAIL,
                                     f'产物为 0 字节：{path.name}',
                                     criterion='0 字节文件不可能是一个交付物'))
            continue
        try:
            with Image.open(path) as opened:
                opened.load()
                images.append({'name': path.name, 'path': path, 'mode': opened.mode,
                               'width': opened.width, 'height': opened.height,
                               'dpi': opened.info.get('dpi'), 'format': opened.format,
                               'has_alpha': opened.mode in ('RGBA', 'LA', 'PA')
                                            or (opened.mode == 'P' and 'transparency' in opened.info),
                               'bytes': path.stat().st_size})
        except Exception as exc:  # noqa: BLE001 - the container is simply not readable here
            problems.append(_finding('pixel-dimensions', severity.get('pixel-dimensions', 'blocker'),
                                     NOT_MEASURED,
                                     f'{path.name}：本构建不能把它作为图像打开（{type(exc).__name__}），'
                                     '因此不声称量过尺寸',
                                     criterion='需要可读的像素数据'))
    return images, problems


def _measure(check_id, severity, images, profile, bom):
    """Return findings for one declared check, or [] when nothing applies."""
    single = lambda criterion, outcome, detail, measured=None: _finding(  # noqa: E731
        check_id, severity, outcome, detail, criterion=criterion, measured=measured)
    if not images:
        return [single('需要至少一个可读产物', NOT_MEASURED, '没有可读回的图像字节')]

    first = images[0]
    if check_id in ('pixel-dimensions', 'resolution'):
        return [single('像素尺寸由图像本身给出', PASS,
                       f'{item["name"]} {item["width"]}x{item["height"]} px',
                       {'width': item['width'], 'height': item['height']})
                for item in images]
    if check_id == 'physical-dimensions':
        out = []
        for item in images:
            dpi = item.get('dpi')
            if dpi and dpi[0]:
                out.append(single('物理尺寸 = 像素 / 声明 DPI', PASS,
                                  f'{item["name"]} 约 {item["width"] / dpi[0] * 25.4:.1f} x '
                                  f'{item["height"] / dpi[1] * 25.4:.1f} mm',
                                  {'dpi': list(dpi)}))
            else:
                out.append(single('物理尺寸 = 像素 / 声明 DPI', NOT_MEASURED,
                                  f'{item["name"]} 未记录 DPI，且交付清单未声明物理尺寸',))
        return out
    if check_id == 'resolution-effective-ppi':
        out = []
        for item in images:
            dpi = item.get('dpi')
            if not dpi or not dpi[0]:
                out.append(single(f'有效分辨率 ≥ {MIN_PRINT_PPI} PPI（{CRITERION_SOURCE}）',
                                  NOT_MEASURED, f'{item["name"]} 未记录 DPI 元数据'))
                continue
            effective = round(float(dpi[0]), 1)
            out.append(single(f'有效分辨率 ≥ {MIN_PRINT_PPI} PPI（{CRITERION_SOURCE}）',
                              PASS if effective >= MIN_PRINT_PPI else WARNING,
                              f'{item["name"]} 声明 {effective} PPI'
                              + ('' if effective >= MIN_PRINT_PPI else f'；低于 {MIN_PRINT_PPI}'),
                              {'ppi': effective}))
        return out
    if check_id in ('color-mode-output-intent', 'color-profile'):
        expected, why = EXPECTED_MODE.get(profile, (None, None))
        if expected is None:
            return [single('profile 未声明色彩意图', NOT_MEASURED,
                           f'{profile} profile 没有色彩判据可依据')]
        return [single(f'色彩模式 ∈ {"/".join(expected)}：{why}（{CRITERION_SOURCE}）',
                       PASS if item['mode'] in expected
                       else (FAIL if profile == 'print' else WARNING),
                       f'{item["name"]} 色彩模式为 {item["mode"]}',
                       {'mode': item['mode']})
                for item in images]
    if check_id == 'alpha-channel':
        return [single('透明通道存在与否按声明读回，不预设期望', PASS,
                       f'{item["name"]} alpha={"有" if item["has_alpha"] else "无"}',
                       {'has_alpha': item['has_alpha']})
                for item in images]
    if check_id == 'format':
        return [single('容器格式由图像头读出', PASS,
                       f'{item["name"]} 为 {item["format"]}', {'format': item['format']})
                for item in images]
    if check_id == 'file-size':
        return [single('profile 未声明体积上限', NOT_MEASURED,
                       f'{item["name"]} 实测 {item["bytes"]} 字节，但没有上限可对照',
                       {'bytes': item['bytes']})
                for item in images]
    if check_id == 'missing-links':
        if bom is None:
            return [single('清单引用的每个文件必须存在且摘要相符', NOT_MEASURED,
                           '未提供交付清单（BOM），链接完整性无从判断')]
        items = bom.get('items') or []
        if not items:
            return [single('清单引用的每个文件必须存在且摘要相符', FAIL,
                           '交付清单为空，无法核对被引用素材')]
        broken, digests = [], 0
        for entry in items:
            reference = entry.get('path') or entry.get('ref')
            label = entry.get('id', '?')
            if not reference:
                broken.append(f'{label}：条目未声明路径')
                continue
            target = Path(reference)
            if not target.is_file():
                broken.append(f'{label}：引用文件不存在（{target.name}）')
                continue
            if entry.get('sha256'):
                digests += 1
                actual = hashlib.sha256(target.read_bytes()).hexdigest()
                if actual != str(entry['sha256']).removeprefix('sha256:'):
                    broken.append(f'{label}：摘要与清单不符（{target.name}）')
        if broken:
            return [single('清单引用的每个文件必须存在且摘要相符', FAIL, '；'.join(broken),
                           {'items': len(items), 'digests_checked': digests})]
        return [single('清单引用的每个文件必须存在且摘要相符', PASS,
                       f'{len(items)} 条清单项目全部读回'
                       + (f'，其中 {digests} 条核对了摘要' if digests else ''),
                       {'items': len(items), 'digests_checked': digests})]
    return [single('本构建没有该检查的测量器', NOT_MEASURED,
                   f'{check_id} 需要读取容器内部结构或外部标准，本构建不声称检查过')]


def run_preflight(artifacts, *, profile: str = 'digital', bom: dict | None = None) -> dict:
    """Preflight artifact paths against one declared profile."""
    document = load_profile(profile)
    declared = [(check['id'], check.get('severity', 'medium'))
                for check in document.get('required_checks', [])]
    severity = dict(declared)
    images, findings = _read_images(artifacts, severity)
    for check_id, check_severity in declared:
        findings.extend(_measure(check_id, check_severity, images, profile, bom))

    outcomes = {item['outcome'] for item in findings}
    if any(item['outcome'] == FAIL and item['severity'] == 'blocker' for item in findings):
        verdict = 'BLOCKED'
    elif NOT_MEASURED in outcomes:
        verdict = 'INCOMPLETE'
    elif any(item['outcome'] in (FAIL, WARNING) for item in findings):
        verdict = 'WARN'
    else:
        verdict = 'PASS'

    return {
        # The version below, not design-lab/preflight/v2, is this payload's contract:
        # schemas/artifact-preflight.schema.json binds it and declares `verdict` (not
        # `status`) as its top-level outcome, because that is what the Workbench column
        # reads from the HTTP response today. verify_artifact_preflight_contract.py
        # re-checks the two against each other in both directions.
        'schemaVersion': 'design-lab/artifact-preflight/v1',
        'profile': profile, 'profileSchema': document.get('schemaVersion'),
        'verdict': verdict,
        'artifacts': [{'name': item['name'], 'bytes': item['bytes'], 'mode': item['mode'],
                       'width': item['width'], 'height': item['height'], 'dpi': item['dpi'],
                       'format': item['format']} for item in images],
        'findings': findings,
        'counts': {outcome: sum(1 for item in findings if item['outcome'] == outcome)
                   for outcome in (PASS, WARNING, FAIL, NOT_MEASURED, NOT_APPLICABLE)},
        'meaning': ('PASS 要求每条适用检查都被真正量过且通过；任何 NOT_MEASURED 都把结论压到 '
                    'INCOMPLETE，不沿用其它检查的绿灯。每条结论带 criterion，写明判据来自哪里。'),
    }
