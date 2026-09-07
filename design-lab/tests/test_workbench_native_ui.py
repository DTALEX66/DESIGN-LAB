# SPDX-License-Identifier: MIT
"""Execute the actual workbench script with a narrow DOM/fetch boundary."""
import json
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[2]


class WorkbenchNativeUiTests(unittest.TestCase):
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
