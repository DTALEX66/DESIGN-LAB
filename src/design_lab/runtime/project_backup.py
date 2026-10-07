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

Two guarantees the first version did not have, both learned from that incident:

* the archive appears only once it has been read back, and a restore installs
  from a staged copy, so an interrupted run leaves the previous state standing
  rather than half-replaced;
* the state database is snapshotted through SQLite's backup API, so a live
  database is captured as one consistent transaction set -- including anything
  already committed into its WAL -- instead of copying file bytes that may split
  a commit across `state.db` and `state.db-wal`.

What that still does *not* give: cross-file consistency between the database and
the asset bytes beside it. A backup taken while a publisher is running can pair
an older database with a newer artifact file. Closing that gap needs a
project-level write barrier around backup and publish; the receipt says so
instead of the archive pretending to.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import tempfile
import zipfile
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

BACKUP_SCHEMA = 'design-lab/project-backup/v1'
MANIFEST_NAME = 'backup-manifest.json'
# The durable product state. Caches, run scratch and evidence logs are excluded
# on purpose: they are regenerable, and including them made archives useless.
DEFAULT_MEMBERS = ('projects', 'task-runtime/service')
# The service state database and the sidecars that belong to it. The database is
# never copied as bytes; it is snapshotted (see _database_snapshot) and the
# sidecars are what that snapshot already folds in, so archiving them separately
# would restore a second, older copy of the same committed rows.
STATE_DATABASE_MEMBER = 'task-runtime/service/state.db'
STATE_DATABASE_SIDECARS = ('task-runtime/service/state.db-wal',
                           'task-runtime/service/state.db-shm')


class BackupError(RuntimeError):
    pass


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _safe_relative(value: str) -> PurePosixPath:
    if not isinstance(value, str) or not value:
        raise BackupError('backup member paths must be non-empty strings')
    # Checked on the raw string, before PurePosixPath can hide it: on Windows
    # `projects\..\state.db` splits into ONE posix part that contains no '..',
    # and then joins back into two directories, so the part-wise test below would
    # wave it through. ':' is refused for the same reason -- a drive prefix and
    # an NTFS alternate data stream both survive the posix split.
    if '\\' in value or ':' in value:
        raise BackupError(f'path traversal refused in backup member: {value!r}')
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
    """Write a verified archive of the project state and return its manifest.

    The archive is built in a sibling temporary directory and moved into place
    only after it has been read back, so a failure part-way through leaves any
    archive that was already at `archive_path` intact.
    """
    members = DEFAULT_MEMBERS if members is None else tuple(members)
    local_root = Path(local_root).resolve()
    archive_path = Path(archive_path).resolve()
    relatives = _iter_members(local_root, members)
    member_roots = [local_root.joinpath(*_safe_relative(member).parts)
                    for member in members]
    if any(archive_path.is_relative_to(root) for root in member_roots):
        # The zip would be enumerated as a member of itself: _iter_members runs
        # before anything is written, but the file already exists by the time the
        # manifest is hashed, so the archive would carry a partial copy of itself.
        raise BackupError('backup archive must be outside the backed-up members')
    with tempfile.TemporaryDirectory(prefix='design-lab-backup-',
                                     dir=archive_path.parent) as scratch:
        pending = Path(scratch) / 'pending.zip'
        manifest = _write_backup(local_root, pending, relatives, version, Path(scratch))
        verified = verify_backup(pending)
        if verified['fileCount'] != manifest['fileCount']:
            raise BackupError('backup verification count mismatch')
        os.replace(pending, archive_path)
    return verified


def _write_backup(local_root: Path, archive_path: Path, relatives,
                  version: str, scratch: Path) -> dict:
    entries = []
    with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for relative in relatives:
            source = local_root.joinpath(*relative.parts)
            if source.is_symlink() or source.resolve() != source:
                raise BackupError(f'linked backup member refused: {relative.as_posix()}')
            posix = relative.as_posix()
            if posix == STATE_DATABASE_MEMBER:
                payload = _database_snapshot(source, scratch)
            elif posix in STATE_DATABASE_SIDECARS:
                continue
            else:
                payload = source.read_bytes()
            entries.append({'path': posix, 'bytes': len(payload),
                            'sha256': _sha256_bytes(payload)})
            archive.writestr(posix, payload)
        manifest = {
            'schemaVersion': BACKUP_SCHEMA,
            'createdAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'designLabVersion': version,
            'projectLocalRootName': local_root.name,
            # Restore needs the root the archive came from to tell a relocated
            # artifact path from a foreign one. Without it an archive can only be
            # read back where it was made (see _relocate_artifact_paths).
            'sourceLocalRoot': str(local_root),
            'stateSchemaVersion': state_schema_version(local_root),
            'members': entries,
            'fileCount': len(entries),
            'totalBytes': sum(entry['bytes'] for entry in entries),
        }
        archive.writestr(MANIFEST_NAME,
                         json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return manifest


def _database_snapshot(source: Path, scratch: Path) -> bytes:
    """Snapshot a possibly-live database through SQLite's own backup API."""
    snapshot = scratch / 'state.db'
    try:
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as live:
            with closing(sqlite3.connect(snapshot)) as destination:
                live.backup(destination)
    except sqlite3.Error as exc:
        raise BackupError(f'state database cannot be snapshotted: {exc}') from None
    return snapshot.read_bytes()


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


def state_schema_version(local_root) -> int | None:
    """Read the SQLite schema version of the service state database, if present."""
    database = Path(local_root).joinpath(*PurePosixPath('task-runtime/service/state.db').parts)
    if not database.is_file():
        return None
    try:
        # sqlite3.connect opens the file, so an unreadable database raises here too.
        with closing(_open_readonly(database)) as connection:
            row = connection.execute('PRAGMA user_version').fetchone()
    except sqlite3.Error:
        # A database this build cannot open reports no version, which skips the
        # comparison rather than pretending it passed.
        return None
    return None if row is None else int(row[0])


def _open_readonly(database: Path):
    # as_uri(), not an f-string: a '#' in the path is a URI fragment, and an
    # unencoded one makes SQLite open some other file and answer PRAGMA with the
    # default 0 -- a wrong version that would silently pass the compatibility gate.
    return sqlite3.connect(database.as_uri() + '?mode=ro', uri=True)


def compatibility(manifest: dict, *, version: str = 'unknown',
                  local_state_schema_version: int | None = None) -> dict:
    """Say whether an archive may be restored into this build.

    An archive from a newer design-lab or a newer state schema can carry rows
    this build cannot interpret, so a mismatch is reported instead of being
    silently unpacked. The caller decides whether to override with
    `allow_upgrade`.
    """
    reasons = []
    archived = manifest.get('stateSchemaVersion')
    if local_state_schema_version is not None:
        if archived is None:
            reasons.append('ARCHIVE_RECORDS_NO_STATE_SCHEMA')
        elif int(archived) != int(local_state_schema_version):
            reasons.append(f'STATE_SCHEMA_MISMATCH:archive={archived}'
                           f':local={local_state_schema_version}')
    archived_version = str(manifest.get('designLabVersion', ''))
    if version != 'unknown' and archived_version and archived_version != version:
        reasons.append(f'VERSION_MISMATCH:archive={archived_version}:local={version}')
    return {'compatible': not reasons, 'reasons': reasons,
            'archiveVersion': archived_version or None,
            'archiveStateSchemaVersion': archived}


def restore_backup(archive_path, target_local_root, *, force: bool = False,
                   allow_upgrade: bool = False, version: str = 'unknown',
                   local_state_schema_version: int | None = None) -> dict:
    """Unpack a verified archive under `target_local_root` and re-read every hash."""
    archive_path = Path(archive_path).resolve()
    target = Path(target_local_root).resolve()
    manifest = verify_backup(archive_path)
    check = compatibility(manifest, version=version,
                          local_state_schema_version=local_state_schema_version)
    if not check['compatible'] and not allow_upgrade:
        raise BackupError('backup is not compatible with this build: '
                          + ','.join(check['reasons']))
    if target.exists() and any(target.rglob('*')) and not force:
        raise BackupError(f'target root is not empty (pass force to overwrite): {target.name}')
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='design-lab-restore-',
                                     dir=target.parent) as scratch:
        staged = Path(scratch) / 'staged'
        previous = Path(scratch) / 'previous'
        restored = 0
        with zipfile.ZipFile(archive_path) as archive:
            for entry in manifest['members']:
                relative = _safe_relative(entry['path'])
                destination = staged.joinpath(*relative.parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(archive.read(relative.as_posix()))
                if _sha256_bytes(destination.read_bytes()) != entry['sha256']:
                    raise BackupError(f'restored hash mismatch: {relative.as_posix()}')
                restored += 1
        # Rebase the artifact index while it is still the staged copy, so the
        # bytes that go on disk already point at where the files will be.
        relocated = _relocate_artifact_paths(staged, manifest, destination_root=target)
        target.mkdir(parents=True, exist_ok=True)
        installed = []
        try:
            for entry in manifest['members']:
                relative = _safe_relative(entry['path'])
                destination = target.joinpath(*relative.parts)
                if destination.is_symlink() or destination.resolve() != destination:
                    raise BackupError(f'linked restore destination refused: '
                                      f'{relative.as_posix()}')
                destination.parent.mkdir(parents=True, exist_ok=True)
                old = previous.joinpath(*relative.parts)
                had_previous = destination.exists()
                if had_previous:
                    old.parent.mkdir(parents=True, exist_ok=True)
                    os.replace(destination, old)
                # Recorded before the move: if the move itself is the failure,
                # the rollback still knows this path was freshly created.
                installed.append((destination, old, had_previous))
                os.replace(staged.joinpath(*relative.parts), destination)
        except BaseException:
            for destination, old, had_previous in reversed(installed):
                if had_previous:
                    os.replace(old, destination)
                elif destination.exists():
                    destination.unlink()
            raise
    return {'schemaVersion': BACKUP_SCHEMA, 'restored': restored,
            'relocatedArtifactPaths': relocated,
            # Signed execution history is deliberately not rewritten; a host
            # plan made under another root has to be replanned, not repointed.
            'nativeExecutionRecovery': 'REPLAN_REQUIRED_AFTER_RELOCATION'
                                       if relocated else 'UNCHANGED',
            'totalBytes': manifest['totalBytes'],
            'createdAt': manifest['createdAt'], 'verified': True,
            'compatibility': check}


def _relocate_artifact_paths(root, manifest, *, destination_root=None):
    """Rebase the live artifact index, without rewriting signed execution receipts.

    `root` is the staged copy of the local root; `destination_root` is where it
    will live once installed. Every artifact row must resolve to a file the
    archive actually carries -- a database that indexes a byte nobody backed up
    is the failure this whole module exists to prevent, so it is refused here
    rather than restored and discovered later.
    """
    database = root / 'task-runtime/service/state.db'
    if not database.is_file():
        return 0
    destination_root = Path(root) if destination_root is None else Path(destination_root)
    source_root = manifest.get('sourceLocalRoot')
    with closing(sqlite3.connect(database)) as conn:
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' "
                           "AND name='artifact'").fetchone():
            return 0
        relocated = 0
        for rowid, value in conn.execute('SELECT rowid, path FROM artifact').fetchall():
            original = Path(value)
            if not original.is_absolute():
                # Relative rows are resolved by the store against its own root,
                # so they travel with the archive unchanged.
                continue
            if source_root is None:
                # An archive made before sourceLocalRoot existed carries no origin,
                # so a cross-root restore cannot be verified -- say so instead of
                # reporting success over paths that still point at the old machine.
                if not original.is_relative_to(destination_root):
                    raise BackupError(
                        'legacy archive records no source root; artifact paths still '
                        f'point outside the restore target: {value}')
                continue
            source = Path(source_root)
            if not original.is_relative_to(source):
                raise BackupError(f'artifact path is outside the archived local root: {value}')
            relative = original.relative_to(source)
            if not (Path(root) / relative).is_file():
                raise BackupError(f'restored artifact is absent: {relative.as_posix()}')
            destination = destination_root / relative
            if destination != original:
                conn.execute('UPDATE artifact SET path = ? WHERE rowid = ?',
                             (str(destination), rowid))
                relocated += 1
        conn.commit()
        return relocated
