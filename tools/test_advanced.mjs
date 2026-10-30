import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const source=['core','textures','animations','native_catalog','native','workflows','advanced'].map(n=>fs.readFileSync(`src/${n}.js`,'utf8')).join('\n');
const exercise=async function(){
    const c=window.__codexTestCore=createModelBridge(),checks=[];
    const assert=(condition,label)=>{if(!condition)throw new Error(label);checks.push(label);};
    const rejected=async(method,p,label)=>{let failed=false;try{await c.call(method,p);}catch(e){failed=true;}assert(failed,label);};
    const p=await c.call('project.create',{name:'Advanced bridge test'});
    const built=await c.call('batch',{operations:[
        {method:'group.add',ref:'root',params:{name:'root'}},
        {method:'cube.add',ref:'cube',params:{name:'body',parent:'$root',from:[-4,0,-3],to:[4,8,3]}},
        {method:'spline.add',ref:'spline',params:{name:'cable',parent:'$root',points:[[0,8,0],[3,12,0],[0,16,0]],radius:0.5}},
        {method:'billboard.add',ref:'billboard',params:{name:'sprite',parent:'$root',position:[8,10,0],size:[4,4]}},
        {method:'locator.add',ref:'locator',params:{name:'socket',parent:'$root',position:[0,8,0]}},
        {method:'null_object.add',ref:'null',params:{name:'target',parent:'$root',position:[0,16,0]}},
        {method:'bounding_box.add',ref:'bounds',params:{name:'bounds',parent:'$root',from:[-5,0,-4],to:[5,9,4],function:['hitbox']}},
        {method:'armature.add',ref:'rig',params:{name:'rig'}},
        {method:'bone.add',ref:'bone',params:{name:'root_bone',parent:'$rig',origin:[-10,0,0],length:8}},
        {method:'bone.add',ref:'tip',params:{name:'tip_bone',parent:'$bone',origin:[-10,8,0],length:5}},
        {method:'mesh.add',ref:'skin',params:{name:'skin',parent:'$rig',vertices:{a:[-12,0,0],b:[-8,0,0],c:[-8,8,0],d:[-12,8,0]},faces:[['a','b','c','d']]}}
    ]});
    const r=built.refs;
    assert(Outliner.elements.length===10 && Group.all.length===1,'all screenshot object types created');
    await c.call('history.undo');assert(Outliner.elements.length===0 && Group.all.length===0,'all object types batch undo');
    await c.call('history.redo');assert(Outliner.elements.length===10,'all object types batch redo');
    await rejected('cube.add',{parent:r.rig},'armature rejects unsupported child types');
    await rejected('bone.add',{},'bone requires armature or bone parent');
    const texture=await c.call('texture.generate',{name:'wood.png',pattern:'wood',width:32,height:32,colors:['#d1a16c','#835430'],seed:42});
    assert(Texture.all.length===1 && texture.width===32,'procedural texture generation');
    await c.call('texture.assign',{id:r.spline,texture:texture.uuid});
    await c.call('element.update',{id:r.spline,radius:0.7});
    let spline=Outliner.elements.find(e=>e.uuid===r.spline);
    assert(spline.texture===texture.uuid && spline.radius_multiplier===0.7,'spline edit preserves texture');
    await c.call('element.update',{id:r.locator,position:[1,9,0]});
    assert(Outliner.elements.find(e=>e.uuid===r.locator).position[1]===9,'locator position update');
    await c.call('element.update',{id:r.billboard,size:[5,6]});
    await c.call('texture.assign',{id:r.billboard,texture:texture.uuid});
    await c.call('face.update',{id:r.billboard,face:'front',uv:[0,0,32,32]});
    assert(Outliner.elements.find(e=>e.uuid===r.billboard).faces.front.texture===texture.uuid,'billboard texture and UV');
    const before=(await c.call('texture.export',{id:texture.uuid})).data_url;
    await c.call('texture.paint',{id:texture.uuid,commands:[{shape:'rect',rect:[0,0,4,4],color:'#ff0000'}]});
    assert((await c.call('texture.export',{id:texture.uuid})).data_url!==before,'texture painting changes bitmap');
    await c.call('history.undo');
    // Undo loads PNG through Image; wait for image callbacks before reading its canvas.
    await new Promise(resolve=>setTimeout(resolve,40));
    assert((await c.call('texture.export',{id:texture.uuid})).data_url===before,'texture paint bitmap undo');
    const atlas=await c.call('texture.atlas',{ids:[r.cube,r.skin,r.billboard],width:256,height:256,tile:20,materials:{body:{pattern:'metal',colors:['#7798a6','#b5d7df']},skin:{pattern:'checker',colors:['#d39c43','#855329']}}});
    assert(atlas.mapping.length===8 && Texture.all.length===2,'atlas creates one tile per cube/mesh/billboard face');
    assert(Cube.all[0].faces.north.texture===atlas.texture.uuid,'atlas assigns generated texture');
    await c.call('history.undo');assert(Texture.all.length===1 && Cube.all[0].faces.north.texture!==atlas.texture.uuid,'atlas texture and UV atomic undo');
    await c.call('history.redo');assert(Texture.all.length===2,'atlas redo');
    await c.call('texture.map',{ids:[r.billboard],texture:texture.uuid});
    assert(Outliner.elements.find(e=>e.uuid===r.billboard).faces.front.uv[2]===32,'existing texture automatic UV mapping');
    await c.call('history.undo');
    const originalTexture=(await c.call('texture.export',{id:texture.uuid})).data_url;
    const replacedCanvas=document.createElement('canvas');replacedCanvas.width=replacedCanvas.height=32;
    const replaceCtx=replacedCanvas.getContext('2d');replaceCtx.fillStyle='#00ff00';replaceCtx.fillRect(0,0,32,32);
    await c.call('texture.replace',{id:texture.uuid,data_url:replacedCanvas.toDataURL()});
    assert(Texture.all.find(t=>t.uuid===texture.uuid).uuid===texture.uuid && (await c.call('texture.export',{id:texture.uuid})).data_url!==originalTexture,'replace PNG preserves texture identity');
    await c.call('history.undo');await new Promise(resolve=>setTimeout(resolve,40));
    assert((await c.call('texture.export',{id:texture.uuid})).data_url===originalTexture,'texture replacement bitmap undo');
    await c.call('mesh.bind',{id:r.skin,armature:r.rig,weights:[{bone:r.bone}]});
    let bone=Outliner.elements.find(e=>e.uuid===r.bone),mesh=Mesh.all[0];
    assert(bone.getVertexWeight(mesh,'a')===1,'mesh skin weights applied');
    await c.call('history.undo');bone=Outliner.elements.find(e=>e.uuid===r.bone);mesh=Mesh.all[0];assert(bone.getVertexWeight(mesh,'a')===0,'skin weight undo');
    await c.call('history.redo');
    const empty=await c.call('animation.create',{name:'empty',length:2});
    await c.call('animation.keyframes',{id:empty.uuid,tracks:[{target:r.root,keyframes:[{channel:'position',time:1,value:[0,1,0]}]}]});
    await c.call('history.undo');
    assert(!(await c.call('animation.get',{id:empty.uuid})).tracks.some(t=>t.keyframes.length),'keyframe undo on never-previewed animation');
    await c.call('animation.remove',{id:empty.uuid});
    const animation=await c.call('animation.create',{name:'wave',length:2,loop:'loop',tracks:[{target:r.root,keyframes:[{channel:'rotation',time:0,value:[0,0,0]},{channel:'rotation',time:1,value:[0,30,0]},{channel:'rotation',time:2,value:[0,0,0]}]},{target:r.bone,keyframes:[{channel:'rotation',time:0,value:[0,0,0]},{channel:'rotation',time:1,value:[0,0,45]},{channel:'rotation',time:2,value:[0,0,0]}]}]});
    assert(Animator.animations.length===1 && animation.tracks.reduce((n,t)=>n+t.keyframes.length,0)===6,'group and armature keyframes created');
    await c.call('history.undo');assert(Animator.animations.length===0,'animation creation undo');
    await c.call('history.redo');assert(Animator.animations.length===1,'animation creation redo');
    await c.call('animation.preview',{id:animation.uuid,time:1});
    const moved=Outliner.elements.find(e=>e.uuid===r.bone).mesh.rotation.z;
    assert(Math.abs(moved)>0.5 && Timeline.time===1,'animation preview applies actual bone transform');
    const rig=Outliner.elements.find(e=>e.uuid===r.rig);
    const offsets=rig.calculateVertexDeformation(Mesh.all[0]);
    assert(Object.values(offsets).some(v=>Math.hypot(...v)>1),'bone animation deforms weighted mesh vertices');
    await c.call('animation.rest',{});
    assert(!Modes.animate,'rest pose returns to editing mode');
    const updated=await c.call('animation.keyframes',{id:animation.uuid,tracks:[{target:r.tip,keyframes:[{channel:'rotation',time:0,value:[0,0,0]},{channel:'rotation',time:1,value:[20,0,0]}]}]});
    assert(updated.tracks.find(t=>t.target===r.tip).keyframes.length===2,'new animated target track');
    await c.call('history.undo');
    const undone=await c.call('animation.get',{id:animation.uuid});
    assert(!undone.tracks.find(t=>t.target===r.tip)?.keyframes.length,'new track keyframes undo');
    const lengthBefore=JSON.stringify(undone.tracks);
    await rejected('animation.keyframes',{id:animation.uuid,tracks:[{target:r.root,keyframes:[{channel:'rotation',time:3,value:[0,90,0]}]},{target:r.cube,keyframes:[{channel:'rotation',time:0,value:[0,0,0]}]}]},'invalid animation target fails');
    assert(JSON.stringify((await c.call('animation.get',{id:animation.uuid})).tracks)===lengthBefore,'failed animation edit preserves keyframes');
    const model=JSON.parse((await c.call('model.export')).content);
    assert(model.animations.length===1 && model.textures.every(t=>t.source?.startsWith('data:image/png')),'native model retains animation and textures');
    const count=Outliner.elements.length;
    Codecs.project.load(model,{path:'advanced-roundtrip.bbmodel',no_file:true});
    await new Promise(resolve=>setTimeout(resolve,80));
    assert(Outliner.elements.length===count && Animator.animations.length===1,'reopen bbmodel retains objects and animation');
    const reopenedAnimation=await c.call('animation.get',{id:'wave'});
    assert(reopenedAnimation.tracks.reduce((n,t)=>n+t.keyframes.length,0)===6,'reopen bbmodel retains all keyframes');
    const reopenedRig=Outliner.elements.find(e=>e.name==='rig'),reopenedMesh=Mesh.all[0],reopenedBone=Outliner.elements.find(e=>e.name==='root_bone');
    assert(reopenedMesh.parent===reopenedRig && reopenedBone.getVertexWeight(reopenedMesh,'a')===1,'reopen bbmodel retains rig hierarchy and weights');
    await c.call('animation.preview',{id:reopenedAnimation.uuid,time:1});
    assert(Object.values(reopenedRig.calculateVertexDeformation(reopenedMesh)).some(v=>Math.hypot(...v)>1),'reopened animation deforms mesh');
    await c.call('animation.rest',{});
    await c.call('preview.camera',{position:[35,27,45],target:[-2,7,0]});
    const shot=await c.call('preview.screenshot',{width:900,height:700});
    return {checks,model,shot:shot.data_url,atlas:atlas.mapping,project:p};
};
fs.writeFileSync('.cache/test-advanced-eval.js','(function(){\n'+source+'\nreturn ('+exercise.toString()+')();})()');
let output;
try{output=execFileSync(process.execPath,['tools/cdp.mjs','--file','.cache/test-advanced-eval.js'],{encoding:'utf8'});}catch(error){console.error(error.stdout);process.exit(1);}
const response=JSON.parse(output);if(!response.result?.value)throw new Error(output);
const value=response.result.value;
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/advanced.bbmodel',JSON.stringify(value.model));
fs.writeFileSync('artifacts/advanced.png',Buffer.from(value.shot.split(',')[1],'base64'));
delete value.model;delete value.shot;
fs.writeFileSync('artifacts/advanced-test.json',JSON.stringify(value,null,2));
console.log(JSON.stringify({checks:value.checks,project:value.project},null,2));
