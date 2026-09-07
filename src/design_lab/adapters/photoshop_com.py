# SPDX-License-Identifier: MIT
"""Internal fixed Photoshop native bridge, not an arbitrary script API.

Caller owns rights, qualification, operation/attempt and the host writer lease.
Timeouts retain outcome-unknown; no automatic retry or termination of Adobe.
"""
from importlib.resources import files
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

from PIL import Image
from ..runtime.paths import resolve_paths


class PhotoshopDispatchError(RuntimeError):
    def __init__(self,code,*,outcome_unknown=False):
        super().__init__(code)
        self.outcome_unknown=outcome_unknown


def _bridge():
    packaged=files('design_lab').joinpath('resources','adobe','photoshop-native-assemble.jsx')
    if packaged.is_file():return packaged.read_bytes()
    source=Path(__file__).resolve().parents[3]/'integrations/hosts/adobe/photoshop-reconstruction/legacy-assemble.jsx'
    if source.is_file():return source.read_bytes()
    raise PhotoshopDispatchError('PHOTOSHOP_BRIDGE_MISSING')


def _invoke_com(script,timeout):
    executable=shutil.which('powershell.exe') if os.name=='nt' else None
    if not executable:raise PhotoshopDispatchError('WINDOWS_COM_UNAVAILABLE')
    command="""$ErrorActionPreference='Stop';
[Console]::InputEncoding=New-Object System.Text.UTF8Encoding($false);
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false);
$source=[Console]::In.ReadToEnd();
$photoshop=New-Object -ComObject Photoshop.Application;
$result=$photoshop.DoJavaScript($source);
[Console]::Out.Write([string]$result);
"""
    result=subprocess.run([executable,'-NoLogo','-NoProfile','-NonInteractive','-Command',command],
        input=script,capture_output=True,text=True,encoding='utf-8',timeout=timeout,
        creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    if result.returncode:raise PhotoshopDispatchError('COM_EXECUTION_FAILED',outcome_unknown=True)
    return result.stdout.strip()


def _digest(path,limit):
    before=path.stat()
    if not path.is_file() or not 0<before.st_size<=limit or before.st_nlink!=1:raise ValueError('invalid file size/link')
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):digest.update(block)
    after=path.stat()
    if (before.st_size,before.st_mtime_ns,before.st_ino)!=(after.st_size,after.st_mtime_ns,after.st_ino):raise ValueError('file changed while hashing')
    return dict(sha256=digest.hexdigest(),byte_size=after.st_size)


def execute(job,*,project_root,approved_root,timeout=120):
    """Run a closed job and seal actual readback; no persistent state mutation."""
    try:
        if type(timeout) not in (int,float) or not 1<=timeout<=600:raise ValueError('invalid timeout')
        paths=resolve_paths(project_root=project_root);root=paths.checked_path(approved_root)
        if not root.is_dir():raise ValueError('missing run root')
        required={'schemaVersion','jobId','runRoot','width','height','outputName','previewName','assets','layers'}
        if not isinstance(job,dict) or set(job)!=required:raise ValueError('invalid job fields')
        payload=json.dumps(job,ensure_ascii=True,sort_keys=True,separators=(',',':'),allow_nan=False)
        if len(payload)>4_000_000:raise ValueError('oversized job')
        job=json.loads(payload)
        if job['schemaVersion']!='design-lab/photoshop-native-job/v1' or not isinstance(job['jobId'],str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,79}',job['jobId']):raise ValueError('invalid job binding')
        if paths.checked_path(job['runRoot'])!=root:raise ValueError('unapproved root')
        if any(type(job[k]) is not int or not 1<=job[k]<=16383 for k in ('width','height')) or job['width']*job['height']>25_000_000:raise ValueError('canvas budget exceeded')
        def inside(value):
            path=paths.checked_path(value)
            if path==root or not path.is_relative_to(root):raise ValueError('path outside approved run')
            return path
        targets={}
        for kind,key in (('psd','outputName'),('png','previewName')):
            name=job[key]
            if not isinstance(name,str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,79}\.'+kind,name,re.I):raise ValueError('invalid output name')
            path=inside(root/name)
            if path.exists():raise ValueError('output exists')
            targets[kind]=path
        if not isinstance(job['assets'],list) or len(job['assets'])>500:raise ValueError('invalid assets')
        inputs={}
        for asset in job['assets']:
            if not isinstance(asset,dict) or set(asset)!={'id','path'}:raise ValueError('invalid asset fields')
            path=inside(asset['path']);inputs[str(path)]=_digest(path,32*1024*1024)
            with Image.open(path) as image:
                if image.format not in ('PNG','JPEG') or getattr(image,'n_frames',1)!=1 or image.width*image.height>25_000_000:raise ValueError('invalid image')
                image.verify()
        bridge=_bridge();source=re.sub(r'^#target.*$','',bridge.decode('utf-8'),flags=re.M)
        job_hash=hashlib.sha256(payload.encode('utf-8')).hexdigest()
        source+='\n(function(){var job='+payload+',root='+json.dumps(str(root))+',binding='+json.dumps(job_hash)+''';
var before=app.documents.length,ids=[],previous=before?app.activeDocument:null,i;
for(i=0;i<before;i++){
 var openDoc=app.documents[i];ids.push(openDoc.id);
}
var doc=psRunJob(job,root),version=app.version;
doc.close(SaveOptions.DONOTSAVECHANGES);
if(app.documents.length!==before)throw Error('document count changed');
for(i=0;i<before;i++)if(app.documents[i].id!==ids[i])throw Error('unrelated document changed');
if(previous)app.activeDocument=previous;
return ['DL_PS_NATIVE_V1',version,job.jobId,binding,before,app.documents.length].join('\\t');
})();'''
    except Exception as exc:
        raise PhotoshopDispatchError('PHOTOSHOP_PREFLIGHT_REJECTED') from exc
    try:
        parts=_invoke_com(source,timeout).split('\t')
        if (len(parts)!=6 or parts[0]!='DL_PS_NATIVE_V1' or parts[2:4]!=[job['jobId'],job_hash]
            or not re.fullmatch(r'[0-9]+(?:\.[0-9]+){1,3}',parts[1]) or not parts[4].isdigit() or parts[4]!=parts[5]):raise ValueError('invalid native receipt')
        for path,expected in inputs.items():
            if _digest(inside(path),32*1024*1024)!=expected:raise ValueError('input changed during dispatch')
        artifacts={kind:_digest(inside(path),256*1024*1024) for kind,path in targets.items()}
        with targets['psd'].open('rb') as stream:
            header=stream.read(26)
        if len(header)!=26 or header[:6]!=b'8BPS\x00\x01' or int.from_bytes(header[14:18],'big')!=job['height'] or int.from_bytes(header[18:22],'big')!=job['width']:raise ValueError('invalid PSD header/dimensions')
        with Image.open(targets['png']) as image:
            if image.format!='PNG' or image.size!=(job['width'],job['height']):raise ValueError('invalid preview dimensions')
            image.verify()
        return dict(status='NATIVE_READBACK',host_version=parts[1],job_id=job['jobId'],job_sha256=job_hash,
            bridge_sha256=hashlib.sha256(bridge).hexdigest(),inputs=inputs,artifacts=artifacts,
            documents_before=int(parts[4]),documents_after=int(parts[5]))
    except Exception as exc:
        raise PhotoshopDispatchError('PHOTOSHOP_OUTCOME_UNKNOWN',outcome_unknown=True) from exc
