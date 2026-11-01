// End-to-end development harness: real Blockbench model API over CDP, real queue and Python client.
// Does not install a plugin or change native-module permissions in Blockbench.
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const createFileBridge=require('../src/mailbox');
const target=(await (await fetch('http://127.0.0.1:9337/json/list')).json()).find(t=>t.type==='page' && t.url.includes('index.html'));
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
let nextId=0;
const pending=new Map();
socket.addEventListener('message',event=>{
    const data=JSON.parse(event.data);if(!pending.has(data.id))return;
    const {resolve,reject,timer}=pending.get(data.id);pending.delete(data.id);clearTimeout(timer);
    if(data.result?.exceptionDetails || data.error)reject(new Error(JSON.stringify(data)));
    else resolve(data.result.result.value);
});
function evaluate(expression){return new Promise((resolve,reject)=>{
    const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout'));},30000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));
});}
const root=path.resolve('.cache/integration-bridge');
const bridge=createFileBridge({fs,path,root,id:'integration',engine:{version:JSON.parse(fs.readFileSync('package.json','utf8')).version,call:(method,params)=>evaluate(`window.__codexTestCore.call(${JSON.stringify(method)}, ${JSON.stringify(params)})`)}});
const client='skill/blockbench-modeling/scripts/blockbench.py';
const examples='skill/blockbench-modeling/assets';
function cli(args){return new Promise((resolve,reject)=>{
    const child=spawn('python',[client,'--bridge-dir',root,...args]);let out='',err='';
    child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);
    child.on('close',code=>code?reject(new Error(err||out)):resolve(JSON.parse(out)));
});}
try {
    const source=['core','textures','animations','native_catalog','native','workflows','advanced'].map(name=>fs.readFileSync(`src/${name}.js`,'utf8')).join('\n');
    await evaluate('(function(){\n'+source+'\nwindow.__codexTestCore = createModelBridge(); return true;})()');
    bridge.start();
    console.log(await cli(['status']));
    console.log(await cli(['create','Codex 方块与网格机器人']));
    const built=await cli(['batch',`${examples}/robot.json`]);console.log({batch:built.project});
    const texture=await evaluate(`(()=>{const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.fillStyle='#ffb24a';x.fillRect(0,0,16,16);return c.toDataURL()})()`);
    fs.writeFileSync('.cache/texture.png',Buffer.from(texture.split(',')[1],'base64'));
    const imported=await cli(['texture','.cache/texture.png']);
    await cli(['call','texture.assign','--params',JSON.stringify({id:'body',texture:imported.uuid})]);
    await cli(['call','texture.assign','--params',JSON.stringify({id:'antenna',texture:imported.uuid})]);
    console.log(await cli(['call','preview.camera','--params',JSON.stringify({position:[45,32,55],target:[0,12,0]})]));
    console.log(await cli(['save','artifacts/robot.bbmodel','--overwrite']));
    console.log(await cli(['save','artifacts/robot.obj','--format','obj','--overwrite']));
    console.log(await cli(['screenshot','artifacts/robot.png','--overwrite']));
    const scene=await cli(['scene','--detail']);fs.writeFileSync('artifacts/robot-scene.json',JSON.stringify(scene,null,2));
    await cli(['batch',`${examples}/robot-rig.json`]);
    const materialParams={ids:scene.elements.filter(e=>['cube','mesh'].includes(e.type)).map(e=>e.uuid),name:'robot_atlas.png',width:256,height:256,tile:24,padding:2,material:{pattern:'metal',colors:['#7297b3','#adc7da','#d5e6ef'],cell:8},materials:{
        body:{pattern:'metal',colors:['#ad5d25','#e2a448','#f9c864'],cell:8},
        head:{pattern:'metal',colors:['#318d9c','#58bec9','#9ce6e5'],cell:8},
        left_eye:{pattern:'solid',colors:['#102b3d']},right_eye:{pattern:'solid',colors:['#102b3d']},
        chest_badge:{pattern:'checker',colors:['#c63a30','#f26c50'],cell:6},antenna:{pattern:'metal',colors:['#a86825','#efbe53','#ffe69b'],cell:6}
    }};
    const atlas=await cli(['call','texture.atlas','--params',JSON.stringify(materialParams)]);
    console.log(await cli(['texture-export',atlas.texture.uuid,'artifacts/robot-atlas.png','--overwrite']));
    // Reimport through the CLI to verify image replacement preserves atlas UUID/UV layout.
    await cli(['texture','artifacts/robot-atlas.png','--replace',atlas.texture.uuid]);
    const cable=await cli(['call','texture.generate','--params',JSON.stringify({name:'cable.png',pattern:'checker',width:32,colors:['#152e3b','#315866'],cell:4})]);
    await cli(['call','texture.map','--params',JSON.stringify({ids:['back_cable'],texture:cable.uuid})]);
    const animation=await cli(['call','animation.create','--file',`${examples}/robot-animation.json`]);
    console.log({animation:animation.name,tracks:animation.tracks.length});
    console.log(await cli(['animation-export','artifacts/robot-animation.json','--id',animation.uuid,'--overwrite']));
    await cli(['call','preview.camera','--params',JSON.stringify({position:[37,29,48],target:[0,15,0]})]);
    fs.mkdirSync('artifacts/animation-frames',{recursive:true});
    for(let i=0;i<24;i++){
        await cli(['call','animation.preview','--params',JSON.stringify({id:animation.uuid,time:i/12})]);
        await cli(['screenshot',`artifacts/animation-frames/${String(i).padStart(3,'0')}.png`,'--width','640','--height','640','--overwrite']);
    }
    await cli(['call','animation.preview','--params',JSON.stringify({id:animation.uuid,time:0.75})]);
    console.log(await cli(['screenshot','artifacts/animated-robot.png','--width','800','--height','800','--overwrite']));
    console.log(await cli(['save','artifacts/animated-robot.bbmodel','--overwrite']));
    await cli(['call','animation.rest']);
    const nativeList=await cli(['tools','图层']);
    if(nativeList.total<5)throw new Error('Localized native discovery failed through Python');
    const nativeState=await cli(['context']);
    if(nativeState.mode!=='edit')throw new Error('Context inspection failed through Python');
    fs.writeFileSync('.cache/gltf-options.json',JSON.stringify({encoding:'ascii'}));
    console.log(await cli(['export','gltf','artifacts/animated-robot.gltf','--options','.cache/gltf-options.json','--overwrite']));
    const gltf=JSON.parse(fs.readFileSync('artifacts/animated-robot.gltf','utf8'));
    if(!gltf.meshes?.length || !gltf.animations?.length)throw new Error('glTF lost geometry or animation');
    const opened=await cli(['open','artifacts/animated-robot.bbmodel']);
    if(!opened.elements)throw new Error('CLI bbmodel import failed');
    console.log({native_catalog:nativeList.total,gltf_meshes:gltf.meshes.length,gltf_animations:gltf.animations.length,reopened_elements:opened.elements});
    console.log('Full Python → queue → real Blockbench → exported model/screenshot passed.');
} finally {bridge.stop();socket.close();}
