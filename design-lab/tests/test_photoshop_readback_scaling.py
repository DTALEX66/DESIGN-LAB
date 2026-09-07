# SPDX-License-Identifier: MIT
"""Bound native DOM traversal while retaining layer identity/content checks."""
import json
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[2]


class PhotoshopReadbackScalingTests(unittest.TestCase):
    def test_nested_parent_membership_and_mask_are_still_required(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node required')
        script=r'''
const fs=require('fs'),vm=require('vm'),path=require('path').win32;
const c={File:p=>({fsName:path.resolve(p)}),LayerKind:{TEXT:'text',NORMAL:'normal'}};
vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8').replace(/^#target.*$/m,''),c);
c.psHasMask=l=>l.mask;
const leaf=id=>({name:id,typename:'ArtLayer',kind:'normal'});
const group=(id,child)=>({name:id,typename:'LayerSet',mask:false,layers:[leaf(child)]});
const doc={width:{as:()=>800},height:{as:()=>600},fullName:{fsName:'D:/run/master.psd'},layers:[group('g1','a'),group('g2','b')]};
const spec=(id,child)=>({id,kind:'group',mask:null,children:[{id:child,kind:'raster'}]});
const job={width:800,height:600,runRoot:'D:/run',outputName:'master.psd',layers:[spec('g1','a'),spec('g2','b')]};
const rejects=()=>{try{c.psReadback(doc,job);return false}catch(e){return true}};
const results=[rejects()];
[doc.layers[0].layers,doc.layers[1].layers]=[doc.layers[1].layers,doc.layers[0].layers];results.push(rejects());
[doc.layers[0].layers,doc.layers[1].layers]=[doc.layers[1].layers,doc.layers[0].layers];
doc.layers[0].mask=true;results.push(rejects());doc.layers[0].mask=false;
doc.layers[1].layers[0].name='a';results.push(rejects());
console.log(JSON.stringify(results));
'''
        result=subprocess.run([node,'-e',script,str(ROOT/'integrations/hosts/adobe/photoshop-reconstruction/legacy-assemble.jsx')],capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads(result.stdout),[False,True,True,True])

    def test_flat_readback_is_linear_and_rejects_wrong_content_and_duplicate_ids(self):
        node=shutil.which('node')
        if not node:self.skipTest('Node required')
        script=r'''
const fs=require('fs'),vm=require('vm'),path=require('path').win32;
const c={File:p=>({fsName:path.resolve(p)}),LayerKind:{TEXT:'text',NORMAL:'normal'}};
vm.createContext(c);vm.runInContext(fs.readFileSync(process.argv[1],'utf8').replace(/^#target.*$/m,''),c);
let reads=0;
const layers=Array.from({length:100},(_,i)=>({
 get name(){reads++;return this.identity},identity:'t'+i,typename:'ArtLayer',kind:'text',
 textItem:{contents:'Text '+i,font:'ArialMT',size:{as:()=>20}}}));
const doc={width:{as:()=>800},height:{as:()=>600},fullName:{fsName:'D:/run/master.psd'},layers};
const job={width:800,height:600,runRoot:'D:/run',outputName:'master.psd',layers:layers.map((l,i)=>({id:'t'+i,kind:'text',text:'Text '+i,font:'ArialMT',size:20}))};
c.psReadback(doc,job);const validReads=reads;
layers[99].textItem.contents='wrong';let contentRejected=false;
try{c.psReadback(doc,job)}catch(e){contentRejected=true}
layers[99].textItem.contents='Text 99';layers[99].identity='t0';let duplicateRejected=false;
try{c.psReadback(doc,job)}catch(e){duplicateRejected=true}
console.log(JSON.stringify({validReads,contentRejected,duplicateRejected}));
'''
        result=subprocess.run([node,'-e',script,str(ROOT/'integrations/hosts/adobe/photoshop-reconstruction/legacy-assemble.jsx')],capture_output=True,text=True,timeout=30)
        self.assertEqual(result.returncode,0,result.stderr)
        data=json.loads(result.stdout)
        self.assertTrue(data['contentRejected'])
        self.assertTrue(data['duplicateRejected'])
        self.assertLessEqual(data['validReads'],400,data)


if __name__=='__main__':unittest.main()
