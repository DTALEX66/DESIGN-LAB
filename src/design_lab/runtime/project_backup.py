# SPDX-License-Identifier: MIT
"""Reversible project-state backups with read-back verification.

The runtime root is gitignored, so anything that lives only there disappears on
the next cleanup or machine move. That is not theoretical: a 2026-10-06 cleanup
removed `task-runtime/service/state.db`, which was the index for 346 asset and
native-plan files that exist nowhere else, and no shadow copy was reachable.

A backup here is a single zip with a manifest of per-file sha256 values, and a
restore re-hashes every file it writes before reporting success. Paths are
sanitised on both sides: an archive cannot write outside the target root, and a
non-empty target is refused unless the caller explicitly overwrites.
"""
from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

BACKUP_SCHEMA = 'design-lab/project-backup/v1'
MANIFEST_NAME = 'backup-manifest.json'
# The durable product state. Caches, run scratch and evidence logs are excluded
# on purpose: they are regenerable, and including them made archives useless.
DEFAULT_MEMBERS = ('projects', 'task-runtime/service')


class BackupError(RuntimeError):
    pass


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _safe_relative(value: str) -> PurePosixPath:
    if not isinstance(value, str) or not value:
        raise BackupError('backup member paths must be non-empty strings')
    pure = PurePosixPath(value)
    if pure.is_absolute() or (pure.parts and pure.parts[0].endswith(':')):
        raise BackupError(f'absolute backup path refused: {value!r}')
    if any(part in ('', '.', '..') for part in pure.parts):
        raise BackupError(f'path traversal refused in backup member: {value!r}')
    return pure


def _iter_members(local_root: Path, members) -> list[PurePosixPath]:
    found: list[PurePosixPath] = []
    for member in members:
        relative = _safe_relative(member)
        target = local_root.joinpath(*relative.parts)
        if target.is_file():
            found.append(relative)
            continue
        if not target.is_dir():
            raise BackupError(f'backup member is absent: {member}')
        for path in sorted(target.rglob('*')):
            if path.is_file():
                found.append(PurePosixPath(path.relative_to(local_root).as_posix()))
    return sorted(set(found), key=str)


def create_backup(local_root, archive_path, *, members=None,
                  version: str = 'unknown') -> dict:
    """Write a verified archive of the project state and return its manifest."""
    members = DEFAULT_MEMBERS if members is None else tuple(members)
    local_root = Path(local_root).resolve()
    archive_path = Path(archive_path).resolve()
    entries = []
    with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for relative in _iter_members(local_root, members):
            source = local_root.joinpath(*relative.parts)
            payload = source.read_bytes()
            entries.append({'path': relative.as_posix(), 'bytes': len(payload),
                            'sha256': _sha256_bytes(payload)})
            archive.writestr(relative.as_posix(), payload)
        manifest = {
            'schemaVersion': BACKUP_SCHEMA,
            'createdAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'designLabVersion': version,
            'projectLocalRootName': local_root.name,
            'members': entries,
            'fileCount': len(entries),
            'totalBytes': sum(entry['bytes'] for entry in entries),
        }
        archive.writestr(MANIFEST_NAME,
                         json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    verified = verify_backup(archive_path)
    if verified['fileCount'] != manifest['fileCount']:
        raise BackupError('backup verification count mismatch')
    return manifest


def _manifest_of(archive_path: Path) -> dict:
    if not archive_path.is_file():
        raise BackupError(f'backup archive is absent: {archive_path.name}')
    with zipfile.ZipFile(archive_path) as archive:
        try:
            raw = archive.read(MANIFEST_NAME)
        except KeyError:
            raise BackupError('archive carries no backup manifest') from None
    manifest = json.loads(raw.decode('utf-8'))
    if manifest.get('schemaVersion') != BACKUP_SCHEMA:
        raise BackupError(f"unsupported backup schema: {manifest.get('schemaVersion')!r}")
    return manifest


def verify_backup(archive_path) -> dict:
    """Re-hash every archived file against the manifest; raise on any mismatch."""
    archive_path = Path(archive_path).resolve()
    manifest = _manifest_of(archive_path)
    with zipfile.ZipFile(archive_path) as archive:
        names = set(archive.namelist())
        for entry in manifest['members']:
            relative = _safe_relative(entry['path']).as_posix()
            if relative not in names:
                raise BackupError(f'archive is missing member {relative}')
            digest = _sha256_bytes(archive.read(relative))
            if digest != entry['sha256']:
                raise BackupError(f'archive member hash mismatch: {relative}')
    return manifest


def restore_backup(archive_path, target_local_root, *, force: bool = False) -> dict:
    """Unpack a verified archive under `target_local_root` and re-read every hash."""
    archive_path = Path(archive_path).resolve()
    target = Path(target_local_root).resolve()
    manifest = verify_backup(archive_path)
    if target.exists() and any(target.rglob('*')) and not force:
        raise BackupError(f'target root is not empty (pass force to overwrite): {target.name}')
    target.mkdir(parents=True, exist_ok=True)
    restored = 0
    with zipfile.ZipFile(archive_path) as archive:
        for entry in manifest['members']:
            relative = _safe_relative(entry['path'])
            destination = target.joinpath(*relative.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            payload = archive.read(relative.as_posix())
            destination.write_bytes(payload)
            if _sha256_bytes(destination.read_bytes()) != entry['sha256']:
                raise BackupError(f'restored hash mismatch: {relative.as_posix()}')
            restored += 1
    return {'schemaVersion': BACKUP_SCHEMA, 'restored': restored,
            'totalBytes': manifest['totalBytes'],
            'createdAt': manifest['createdAt'], 'verified': True}
