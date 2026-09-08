# SPDX-License-Identifier: MIT
"""Internal verified native bundle export, preserving the primary-asset API."""
from contextlib import closing
import json
from pathlib import Path
import re

from .runtime import asset_store as assets, job_store as jobs
from .runtime.bundle_store import publish_bundle, verify_bundle
from .runtime.native_recovery_lock import recovery_lock


def export_bundle(tasks, attempt_id, authorization):
    from .native_tasks import NativeTaskError
    if (not isinstance(authorization,dict) or set(authorization)!={'actor','scope','receipt'}
        or authorization['scope']!='project-native-test'
        or any(not isinstance(v,str) or not v.strip() or len(v)>2000 for v in authorization.values())):
        raise NativeTaskError('BUNDLE_AUTHORIZATION_REQUIRED')
    try:
        with recovery_lock(tasks.paths,attempt_id), closing(tasks._connect()) as conn:
            attempt,_=jobs._current(conn,attempt_id)
            row=conn.execute('SELECT host,project_id,request_json,receipt_json FROM native_execution_v1 WHERE attempt_id=?',
                             (attempt_id,)).fetchone()
            if attempt['state']!='RECEIPTED' or not row or not row[3]:
                raise NativeTaskError('BUNDLE_NATIVE_NOT_VERIFIED')
            host,project_id,request_raw,receipt_raw=row
            result=tasks._existing(conn,attempt,project_id)
            request=json.loads(request_raw);receipt=json.loads(receipt_raw);job=request['job']
            root=tasks.paths.checked_path(job['runRoot'])
            raw_outputs=({'psd':root/job['outputName'],'png':root/job['previewName']}
                         if host=='photoshop' else job['targets'])
            outputs={kind:tasks._inside(path,root) for kind,path in raw_outputs.items()}
            tasks._verify_receipt(receipt,job,request,outputs)
            primary='psd' if host=='photoshop' else 'ai'
            names={primary:'native.'+primary,'png':'preview.png','svg':'preview.svg'}
            files={names[kind]:dict(path=str(path),sha256=receipt['artifacts'][kind]['sha256'],
                                   role='primary' if kind==primary else 'preview') for kind,path in outputs.items()}
            input_names={}
            for index,(source,digest) in enumerate(sorted(request['inputs'].items())):
                suffix=Path(source).suffix.lower()
                if not re.fullmatch(r'\.[a-z0-9]{1,12}',suffix):suffix='.bin'
                name=f'inputs/{index:04d}{suffix}'
                input_names[source]=name
                files[name]=dict(path=str(tasks._inside(source,root)),sha256=digest['sha256'],role='input')
            metadata=dict(native_attempt_id=attempt_id,source_asset_id=result['asset']['id'],host=host,
                          host_version=receipt.get('host_version','UNKNOWN'),job_sha256=receipt['job_sha256'],
                          rights='NOT_REVIEWED',quality='NOT_REVIEWED',link_relocation='NOT_VERIFIED',
                          font_inventory='NOT_COLLECTED',
                          input_assets=[dict(id=item['id'],member=input_names[str(tasks.paths.checked_path(item['path']))])
                                        for item in job['assets']])
            asset_id='bundle-'+result['asset']['id']
            store=tasks.paths.category_dir('projects',project_id,'assets')
            with closing(assets.connect(tasks.service.database,project_root=tasks.owner)) as publication:
                assets.register_asset(publication,project_id,asset_id,'other')
                resource='asset:'+asset_id
                if not assets.acquire_writer(publication,resource,attempt_id):
                    assets.takeover_writer(publication,resource,attempt_id,expected_holder=attempt_id)
                generation=assets.writer_token(publication,resource,attempt_id)
                try:
                    assets.recover_publications(publication,store_root=store,project_root=tasks.owner,
                                                asset_id=asset_id,holder_attempt_id=attempt_id,generation=generation)
                    version=publish_bundle(publication,asset_id,files,primary=names[primary],metadata=metadata,
                                           store_root=store,holder_attempt_id=attempt_id,generation=generation,project_root=tasks.owner)
                    artifact=publication.execute('SELECT path,sha256,byte_size FROM artifact WHERE version_id=?',(version,)).fetchone()
                    path=tasks._inside(artifact[0],store)
                    if assets._file_hash(path)!=artifact[1] or path.stat().st_size!=artifact[2]:
                        raise NativeTaskError('BUNDLE_PUBLISHED_BYTES_CHANGED')
                    verify_bundle(path,project_root=tasks.owner)
                    return dict(id=asset_id,version_id=version,path=str(path),sha256=artifact[1].removeprefix('sha256:'),
                                byte_size=artifact[2],kind='design-bundle',rights='NOT_REVIEWED')
                finally:
                    assets.release_writer(publication,resource,attempt_id,generation=generation)
    except NativeTaskError:
        raise
    except Exception as exc:
        raise NativeTaskError('BUNDLE_EXPORT_UNVERIFIED') from exc
