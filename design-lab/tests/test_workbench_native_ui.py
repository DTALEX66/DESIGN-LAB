# SPDX-License-Identifier: MIT
"""Execute the actual workbench script with a narrow DOM/fetch boundary."""
import json
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[2]


class WorkbenchNativeUiTests(unittest.TestCase):
    def test_late_asset_preview_and_verification_cannot_replace_latest_selection(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node required')
        script=r'''
const fs=require('fs'),vm=require('vm');
class E {constructor(){this.classList={toggle(){}};}removeAttribute(){}replaceChildren(){}append(){}}
const elements={},pending=[];
const c={document:{getElementById:id=>elements[id]??=new E(),createElement:()=>new E()},
fetch:path=>new Promise(resolve=>pending.push(resolve))};
vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
(async()=>{const fn=process.argv[2];vm.runInContext("project='"+'c'.repeat(32)+"'",c);
const old=vm.runInContext(fn+"({id:'old'})",c),recent=vm.runInContext(fn+"({id:'recent'})",c);
const response=label=>({ok:true,json:async()=>({content_base64:label,asset:{kind:'psd',media_type:'image/png',version_id:label,verification:label,width:1,height:1,sha256:label}})});
pending[1](response('recent'));await recent;pending[0](response('old'));await old;
console.log(JSON.stringify({result:elements[fn==='preview'?'asset-info':'native-info'].textContent}));
})().catch(e=>{console.error(e);process.exitCode=1});
'''
        for function in ('preview','verifyNative'):
            with self.subTest(function=function):
                result=subprocess.run([node,'-e',script,str(ROOT/'apps/workbench/main.ts'),function],capture_output=True,text=True,encoding='utf-8',timeout=30)
                self.assertEqual(result.returncode,0,result.stderr)
                text=json.loads(result.stdout)['result']
                self.assertIn('recent',text)
                self.assertNotIn('old',text)

    def test_late_task_events_cannot_replace_new_selection(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node required')
        script=r'''
const fs=require('fs'),vm=require('vm');
class E {constructor(){this.children=[];this.classList={toggle(){}};}append(x){this.children.push(x)}replaceChildren(){this.children=[];}removeAttribute(){}}
const elements={},pending=[];
const c={document:{getElementById:id=>elements[id]??=new E(),createElement:()=>new E()},
fetch:path=>new Promise(resolve=>pending.push({path,resolve}))};
vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
(async()=>{vm.runInContext("project='"+'c'.repeat(32)+"'",c);
const old=vm.runInContext("loadEvents('old')",c),recent=vm.runInContext("loadEvents('recent')",c);
const response=label=>({ok:true,json:async()=>({events:[{at:label,attempt_no:1,to_state:'RECEIPTED'}],next_cursor:null})});
pending[1].resolve(response('recent'));await recent;pending[0].resolve(response('old'));await old;
console.log(JSON.stringify({job:vm.runInContext('eventJob',c),text:elements.events.children.map(e=>e.textContent)}));
})().catch(e=>{console.error(e);process.exitCode=1});
'''
        result=subprocess.run([node,'-e',script,str(ROOT/'apps/workbench/main.ts')],capture_output=True,text=True,encoding='utf-8',timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        data=json.loads(result.stdout)
        self.assertEqual(data['job'],'recent')
        self.assertEqual(data['text'],['recent · attempt 1 · NEW → RECEIPTED'])

    def test_bundle_download_checks_hash_before_saving(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node required')
        script=r'''
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
let saved=0,tamper=false;const bytes=Buffer.from('controlled archive');
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
class E {constructor(){this.classList={toggle(){}};}click(){saved++;}removeAttribute(){}replaceChildren(){}append(){}}
const elements={},owner='c'.repeat(32),route='/api/projects/'+owner+'/bundles/bundle-native-'+'b'.repeat(64)+'/versions/v-'+'d'.repeat(32)+'/content';
const c={document:{getElementById:id=>elements[id]??=new E(),createElement:()=>new E()},
crypto:crypto.webcrypto,Blob,Uint8Array,URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},setTimeout:fn=>fn(),
fetch:async path=>path.endsWith('/bundle')?{ok:true,json:async()=>({bundle:{sha256:hash,byte_size:bytes.length},download_path:route})}:
{ok:true,arrayBuffer:async()=>Uint8Array.from(tamper?Buffer.from('bad'):bytes).buffer}};
vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
(async()=>{await vm.runInContext("project='"+owner+"';exportBundle({job_id:'native-job-"+'a'.repeat(64)+"'})",c);
tamper=true;let rejected=false;try{await vm.runInContext("exportBundle({job_id:'native-job-"+'a'.repeat(64)+"'})",c)}catch(e){rejected=true;}
console.log(JSON.stringify({saved,rejected}));})().catch(e=>{console.error(e);process.exitCode=1});
'''
        result=subprocess.run([node,'-e',script,str(ROOT/'apps/workbench/main.ts')],capture_output=True,text=True,encoding='utf-8',timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout),{'saved':1,'rejected':True})

    def test_native_listing_and_explicit_verification_use_scoped_api(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node required')
        script=r'''
const fs=require('fs'),vm=require('vm');
class Element {constructor(){this.children=[];this.textContent='';this.classList={toggle(){}};}append(x){this.children.push(x)}replaceChildren(...xs){this.children=xs;}removeAttribute(){}}
const elements={},calls=[],asset={id:'native-'+ 'a'.repeat(64),kind:'psd',version_id:'v-native',version_no:1,byte_size:123,sha256:'sha256:'+ 'b'.repeat(64),rights:'NOT_REVIEWED',verification:'METADATA_ONLY'};
const c={document:{getElementById:id=>elements[id]??=new Element(),createElement:()=>new Element()},
 fetch:async route=>{calls.push(route);let data;
 if(route.endsWith('/native-assets'))data={assets:[asset],next_cursor:null};
 else if(route.endsWith('/verify'))data={asset:{...asset,verification:'HASH_VERIFIED'}};
 else if(route.endsWith('/tasks'))data={tasks:[],next_cursor:null};
 else if(route.endsWith('/assets'))data={assets:[]};
 else throw Error('unexpected request');
 return {ok:true,json:async()=>data};}};
vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
(async()=>{await vm.runInContext("project='"+'c'.repeat(32)+"';refresh()",c);
 const list=elements['native-assets'];const labels=list?list.children.map(li=>li.children[0].textContent):[];
 if(list?.children[0])await list.children[0].children[0].onclick();
 console.log(JSON.stringify({labels,calls,info:elements['native-info']?.textContent||''}));})().catch(e=>{console.error(e);process.exitCode=1});
'''
        result=subprocess.run([node,'-e',script,str(ROOT/'apps/workbench/main.ts')],capture_output=True,text=True,encoding='utf-8',timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        data=json.loads(result.stdout)
        self.assertEqual(len(data['labels']),1,'native assets are not rendered')
        self.assertIn('PSD',data['labels'][0]);self.assertIn('HASH_VERIFIED',data['info'])
        prefix='/api/projects/'+'c'*32
        self.assertIn(prefix+'/native-assets',data['calls'])
        self.assertIn(prefix+'/native-assets/native-'+'a'*64+'/verify',data['calls'])
