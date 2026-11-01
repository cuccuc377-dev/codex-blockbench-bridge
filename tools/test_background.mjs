// Development-only test for an isolated --userData .cache/bb-background-profile instance.
// The bundled plugin and file queue run inside the actual renderer. CDP is disconnected
// during measurements; ordinary Python requests are never forwarded through DevTools.
// A test module adapter supplies fs only to the test home. Native permission records are untouched.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const port=process.env.BB_CDP_PORT || '9337';
const profile=path.resolve('.cache/bb-background-profile');
const home=path.join(profile,'test-home');
const bridgeRoot=path.join(home,'.codex','blockbench-bridge');
const output=path.resolve('artifacts/background');
const examples='skill/blockbench-modeling/assets';
fs.mkdirSync(output,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const checks=[];
function check(ok,label){assert.ok(ok,label);checks.push(label);console.log('PASS '+label);}

async function connect() {
    const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target=targets.find(t=>t.type==='page' && t.url.includes('index.html'));
    assert.ok(target,'No isolated Blockbench page');
    const socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let serial=0;const pending=new Map();
    socket.addEventListener('close',()=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Test renderer disconnected'));}pending.clear();});
    socket.addEventListener('message',event=>{
        const message=JSON.parse(event.data),item=pending.get(message.id);if(!item)return;
        pending.delete(message.id);clearTimeout(item.timer);
        if(message.error)item.reject(new Error(JSON.stringify(message.error)));else item.resolve(message.result);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
        if(socket.readyState!==WebSocket.OPEN){reject(new Error('Test renderer disconnected'));return;}
        const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);
        pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
    });
    return {send,close:()=>socket.close(),async evaluate(expression){
        const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
        if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;
    }};
}

function cli(args) {
    return new Promise((resolve,reject)=>{
        const child=spawn('python',['skill/blockbench-modeling/scripts/blockbench.py','--bridge-dir',bridgeRoot,...args]);
        let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
        child.on('error',reject);child.on('close',code=>code?reject(new Error(err||out)):resolve(JSON.parse(out)));
    });
}
const call=(method,params={})=>cli(['call',method,'--params',JSON.stringify(params)]);
let cdp;
try {
    cdp=await connect();
    const pluginDirectory=await cdp.evaluate('Plugins.path');
    assert.equal(path.resolve(pluginDirectory).toLowerCase(),path.join(profile,'plugins').toLowerCase(),'Refuse to reload a normal user profile');
    await cdp.send('Page.enable');
    // Capture test dependencies before Blockbench replaces window.require on reload.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{
        let saved=window.require;
        window.__codexBackgroundTestRequire=saved;
        Object.defineProperty(window,'require',{configurable:true,enumerable:true,
            get(){return saved;},set(value){saved=value;window.__codexBackgroundTestRequire=value;}});
    })();`});
    await cdp.evaluate('Blockbench.addFlag("allow_closing");Blockbench.addFlag("allow_reload");true');
    await cdp.send('Page.reload');
    let ready=false;
    for(let i=0;i<80;i++){
        await sleep(250);
        try {ready=await cdp.evaluate('typeof Blockbench !== "undefined" && typeof Preview !== "undefined" && !!Preview.selected && typeof window.__codexBackgroundTestRequire === "function"');}catch{}
        if(ready)break;
    }
    assert.ok(ready,'Test app did not initialize with its test dependencies');
    const actualProfile=await cdp.evaluate('window.__codexBackgroundTestRequire("@electron/remote").app.getPath("userData")');
    assert.equal(path.resolve(actualProfile).toLowerCase(),profile.toLowerCase(),'Refuse to test a normal user profile');
    const plugin=fs.readFileSync('plugin/codex_blockbench_bridge.js','utf8');
    await cdp.evaluate(`(()=>{
        const native=window.__codexBackgroundTestRequire;
        const testFS=native('fs'),testPath=native('path'),root=${JSON.stringify(bridgeRoot)};
        const timers=native('timers');
        const adapter=(name,options)=>{
            if(name==='timers')return timers;
            if(name==='path')return testPath;
            if(name==='fs' && options.scope===root)return testFS;
            throw new Error('Unexpected test module: '+name);
        };
        Plugins.registered.codex_blockbench_bridge?.onunload?.();
        Plugins.registered.codex_blockbench_bridge=new Plugin('codex_blockbench_bridge');
        new Function('require','SystemInfo',${JSON.stringify(plugin)})(adapter,{home_directory:${JSON.stringify(home)}});
        settings.background_rendering.value=false;
        native('@electron/remote').getCurrentWindow().blur();
        return true;
    })()`);
    cdp.close();cdp=null;

    let state=await cli(['status']);
    check(state.background.enabled && !state.background.focused,'unfocused window serves real Python queue requests');
    await cli(['create','Background modeling test']);
    await cli(['batch',`${examples}/robot.json`]);
    const scene=await cli(['scene','--detail']);
    check(scene.elements.filter(e=>e.type==='cube').length===8 && scene.elements.filter(e=>e.type==='mesh').length===2,'cube and mesh modeling while unfocused');

    cdp=await connect();
    const minimized=await cdp.evaluate(`(()=>{const w=window.__codexBackgroundTestRequire('@electron/remote').getCurrentWindow();w.minimize();return w.isMinimized();})()`);
    check(minimized,'native test window is minimized');
    cdp.close();cdp=null;
    await sleep(500);

    const texture=await call('texture.generate',{name:'background-metal',width:32,height:32,pattern:'metal',colors:['#267b93','#5ab8ce']});
    await call('texture.map',{texture:texture.uuid,ids:scene.elements.filter(e=>['cube','mesh'].includes(e.type)).map(e=>e.uuid)});
    const layer=await call('layer.add',{texture:texture.uuid,name:'Background brush'});
    await call('context.set',{mode:'paint',texture:texture.uuid});
    await call('paint.stroke',{texture:texture.uuid,layer:layer.uuid,tool:'brush_tool',color:'#ff0000',size:1,opacity:100,softness:0,points:[[3,3],[10,3]]});
    const painted=await call('layer.export',{texture:texture.uuid,layer:layer.uuid});
    fs.writeFileSync(path.join(output,'painted-layer.png'),Buffer.from(painted.data_url.split(',')[1],'base64'));
    check(painted.width===32,'texture generation, UV assignment and layered brush painting while minimized');
    await call('layer.add',{texture:texture.uuid,name:'Imported PNG',data_url:painted.data_url});
    check((await call('layer.list',{texture:texture.uuid})).layers.length===3,'PNG layer decoding while minimized');

    await call('context.set',{mode:'edit'});
    await cli(['batch',`${examples}/robot-rig.json`]);
    const animation=await call('animation.create',JSON.parse(fs.readFileSync(`${examples}/robot-animation.json`,'utf8')));
    await call('animation.update',{id:animation.uuid,length:300,loop:'once'});
    await call('animation.play',{id:animation.uuid});
    const before=await cli(['status']);
    const soakSeconds=Number(process.env.BB_BACKGROUND_SOAK_SECONDS || 70);
    const started=Date.now();let maxHeartbeatAge=0,samples=0;
    while(Date.now()-started<soakSeconds*1000){
        await sleep(2000);
        const {sessions}=await cli(['sessions']);
        assert.equal(sessions.length,1);
        assert.equal(sessions[0].alive,true);
        maxHeartbeatAge=Math.max(maxHeartbeatAge,Date.now()-sessions[0].heartbeat);samples++;
        if(samples%10===0)console.log(`Minimized, CDP detached: ${Math.round((Date.now()-started)/1000)} s`);
    }
    const after=await cli(['status']);
    check(after.background.visibility==='hidden' && !after.background.focused,'window remained hidden and unfocused during the soak');
    check(maxHeartbeatAge<10000,`background heartbeat stays live for ${soakSeconds} seconds`);
    const advanced=after.background.timeline_time-before.background.timeline_time;
    check(advanced>soakSeconds*0.65 && advanced<soakSeconds*1.2,'animation playback advances at elapsed-time speed while minimized');
    check(after.background.fallback_ticks>before.background.fallback_ticks && !after.background.last_error,'fallback animation scheduler runs without errors');

    await call('animation.stop');
    await call('animation.preview',{id:animation.uuid,time:0});
    await call('preview.camera',{position:[37,29,48],target:[0,15,0]});
    await cli(['screenshot',path.join(output,'pose-0.png'),'--width','640','--height','640','--overwrite']);
    await call('animation.preview',{id:animation.uuid,time:0.75});
    await cli(['screenshot',path.join(output,'pose-075.png'),'--width','640','--height','640','--overwrite']);
    check(!fs.readFileSync(path.join(output,'pose-0.png')).equals(fs.readFileSync(path.join(output,'pose-075.png'))),'different animation poses produce different PNG renders while minimized');
    await cli(['save',path.join(output,'robot.bbmodel'),'--overwrite']);
    const saved=JSON.parse(fs.readFileSync(path.join(output,'robot.bbmodel'),'utf8'));
    check(saved.animations.length===1 && saved.textures.length>0 && saved.elements.length>=10,'saved bbmodel contains geometry, texture and animation');
    await call('animation.rest');
    await call('cube.add',{name:'background_undo_cube',from:[18,0,0],to:[20,2,2]});
    await call('history.undo');
    check(!(await cli(['scene'])).elements.some(e=>e.name==='background_undo_cube'),'background geometry edit and native undo');

    cdp=await connect();
    const finalMinimized=await cdp.evaluate(`window.__codexBackgroundTestRequire('@electron/remote').getCurrentWindow().isMinimized()`);
    check(finalMinimized,'all operations completed without restoring or focusing the window');
    const pixels=await cdp.evaluate(`Array.from(Texture.all[0].layers.find(l=>l.name==='Background brush').ctx.getImageData(5,3,1,1).data)`);
    assert.deepEqual(pixels,[255,0,0,255]);check(true,'background brush writes the expected RGBA pixels');
    await cdp.evaluate('Plugins.registered.codex_blockbench_bridge.onunload();true');
    check((await cli(['sessions'])).sessions.length===0,'plugin unload removes live session');
    await cdp.evaluate('Plugins.registered.codex_blockbench_bridge.onload();true');
    cdp.close();cdp=null;
    check((await cli(['status'])).background.enabled,'plugin can restart in a minimized window');
    const report={version:JSON.parse(fs.readFileSync('package.json','utf8')).version,blockbench:state.blockbench,checks,soak_seconds:soakSeconds,max_heartbeat_age_ms:maxHeartbeatAge,animation_advanced_seconds:advanced,background:after.background};
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
} finally {
    try {cdp ||= await connect();await cdp.evaluate('Plugins.registered.codex_blockbench_bridge?.onunload?.();true');}catch{}
    cdp?.close();
}
