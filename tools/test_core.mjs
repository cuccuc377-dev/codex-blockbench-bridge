import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const source = ['core','textures','animations','native_catalog','native','workflows','advanced'].map(name=>fs.readFileSync(`src/${name}.js`,'utf8')).join('\n');
const exercise = async function() {
    const core = window.__codexTestCore = createModelBridge();
    const checks = [];
    const assert = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); };
    await core.call('project.create', {name:'Codex bridge integration test'});
    const result = await core.call('batch', {operations:[
        {method:'group.add',ref:'g',params:{name:'assembly'}},
        {method:'cube.add',ref:'c',params:{name:'body',parent:'$g',from:[-4,0,-4],to:[4,8,4]}},
        {method:'mesh.add',ref:'m',params:{name:'triangle',parent:'$g',vertices:{a:[0,9,0],b:[3,9,0],c:[0,12,0]},faces:[['a','b','c']]}}
    ]});
    assert(Group.all.length === 1 && Outliner.elements.length === 2,'batch creates group, cube, mesh');
    assert(Outliner.elements.every(e => e.parent.uuid === result.refs.g),'batch parent references');
    await core.call('history.undo');
    assert(Outliner.elements.length === 0 && Group.all.length === 0,'undo removes entire batch');
    await core.call('history.redo');
    assert(Outliner.elements.length === 2 && Group.all.length === 1,'redo restores entire batch');
    let error = null;
    try { await core.call('batch', {operations:[{method:'cube.add',params:{name:'rollback'}},{method:'element.update',params:{id:'missing'}}]}); } catch (e) { error = e; }
    assert(error && Outliner.elements.length === 2,'failed batch rolls back new objects');
    const previous = Cube.all[0].from.slice();
    try { await core.call('batch',{operations:[{method:'element.update',params:{id:result.refs.c,from:[-3,0,-3]}},{method:'mesh.vertices',params:{id:result.refs.m,vertices:{missing:[0,0,0]}}}]}); } catch {}
    assert(JSON.stringify(Cube.all[0].from) === JSON.stringify(previous),'failed batch restores existing objects');
    await core.call('mesh.vertices',{id:result.refs.m,vertices:{c:[0,13,0]}});
    const face = Object.keys(Mesh.all[0].faces)[0];
    await core.call('mesh.extrude',{id:result.refs.m,face,distance:2});
    assert(Object.keys(Mesh.all[0].vertices).length === 6 && Object.keys(Mesh.all[0].faces).length === 4,'mesh face extrusion');
    await core.call('element.duplicate',{id:result.refs.c,name:'body_copy',offset:[10,0,0]});
    assert(Cube.all.length === 2 && Cube.all[1].from[0] === 6,'duplicate offset');
    const exported = await core.call('model.export');
    assert(JSON.parse(exported.content).elements.length === 3,'native bbmodel export');
    const state = await core.call('scene.get',{detail:true});
    assert(state.elements.some(e => e.type === 'mesh' && e.vertices),'detailed inspection');
    await core.call('selection.set',{ids:[result.refs.c]});
    assert(Outliner.selected.length === 1 && Outliner.selected[0].uuid === result.refs.c,'selection control');
    try { await core.call('element.update',{id:result.refs.c,name:'wrong',project_id:'wrong-project'}); } catch(e) { error = e; }
    assert(error.code === 'PROJECT_CHANGED' && Cube.all[0].name === 'body','project identity guard');
    await core.call('element.update',{id:result.refs.g,rotation:[0,30,0]});
    await core.call('history.undo');
    assert(Group.all[0].rotation[1] === 0,'group transform undo');
    const child = await core.call('group.add',{name:'nested',parent:result.refs.g});
    try { await core.call('element.update',{id:result.refs.g,parent:child.results[0].uuid}); } catch(e) { error = e; }
    assert(Group.all[0].parent === 'root','cyclic reparent is rejected and rolled back');
    await core.call('element.remove',{id:result.refs.g,recursive:true});
    assert(Outliner.elements.length === 0 && Group.all.length === 0,'recursive group removal');
    await core.call('history.undo');
    assert(Outliner.elements.length === 3 && Group.all.length === 2,'recursive removal undo');
    const canvas = document.createElement('canvas');canvas.width=canvas.height=4;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ff9900';ctx.fillRect(0,0,4,4);
    const texture = await core.call('texture.add',{name:'test.png',data_url:canvas.toDataURL()});
    assert(Texture.all.length === 1,'PNG texture import');
    await core.call('history.undo');assert(Texture.all.length===0,'texture creation undo');
    await core.call('history.redo');assert(Texture.all.length===1,'texture creation redo');
    const embedSetting = settings.embed_textures.value;
    try {
        settings.embed_textures.value = false;
        const portable = JSON.parse((await core.call('model.export')).content);
        assert(portable.textures.every(t=>t.source.startsWith('data:image/png;base64,')),'native export embeds textures regardless of UI preference');
    } finally { settings.embed_textures.value = embedSetting; }
    await core.call('face.update',{id:result.refs.c,face:'north',uv:[0,0,4,4],texture:texture.uuid,rotation:90});
    assert(Cube.all[0].faces.north.texture===texture.uuid && Cube.all[0].faces.north.rotation===90,'cube UV and texture assignment');
    await core.call('history.undo');assert(Cube.all[0].faces.north.texture!==texture.uuid,'UV and texture undo');
    await core.call('mesh.replace',{id:result.refs.m,vertices:{a:[0,0,0],b:[4,0,0],c:[0,4,0]},faces:[['a','b','c']]});
    assert(Object.keys(Mesh.all[0].vertices).length===3,'mesh topology replacement');
    try { await core.call('mesh.replace',{id:result.refs.m,vertices:{a:[0,0,0],b:[4,0,0],c:[8,0,0]},faces:[{vertices:['a','b','c'],uv:{a:[0,0],b:[1,0],c:[2,0]}}]}); } catch(e) { error=e; }
    assert(Mesh.all[0].vertices.c[1]===4,'degenerate face with explicit UV is rejected');
    const originalProject=Project.uuid;
    await core.call('project.create',{name:'cube-only test',format:'java_block'});
    try { await core.call('mesh.add',{vertices:{a:[0,0,0],b:[4,0,0],c:[0,4,0]},faces:[['a','b','c']]}); } catch(e) { error=e; }
    assert(Outliner.elements.length===0,'mesh rejected by cube-only format');
    await core.call('project.select',{id:originalProject});
    await core.call('preview.camera',{position:[35,30,45],target:[4,6,0]});
    const shot = await core.call('preview.screenshot',{width:640,height:480});
    assert(shot.data_url.startsWith('data:image/png;base64,'),'real viewport screenshot');
    return {checks, screenshot:shot.data_url, project:state.project};
};
fs.mkdirSync('.cache', {recursive:true});
fs.writeFileSync('.cache/test-core-eval.js', '(function(){\n' + source + '\nreturn (' + exercise.toString() + ')();})()');
const output = execFileSync(process.execPath,['tools/cdp.mjs','--file','.cache/test-core-eval.js'],{encoding:'utf8'});
const response = JSON.parse(output);
if (!response.result?.value) throw new Error(output);
const value = response.result.value;
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/core-test.png',Buffer.from(value.screenshot.split(',')[1],'base64'));
delete value.screenshot;
fs.writeFileSync('artifacts/core-test.json',JSON.stringify(value,null,2));
console.log(JSON.stringify(value,null,2));
