const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const createFileBridge = require('../src/mailbox');

function setup(t, engine) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'bb-bridge-test-'));
    const errors = [];
    const bridge = createFileBridge({fs,path,root,id:'test-session',engine,onError:e=>errors.push(e)});
    bridge.start();
    t.after(()=>{bridge.stop();fs.rmSync(root,{recursive:true,force:true});assert.deepEqual(errors,[]);});
    return {root,bridge,request(id, value) { fs.writeFileSync(path.join(bridge.dir,'requests',id+'.json'),JSON.stringify({protocol:1,id,session:bridge.id,expires_at:Date.now()+10000,method:'ok',...value})); },response(id) { return JSON.parse(fs.readFileSync(path.join(bridge.dir,'responses',id+'.json'),'utf8')); }};
}

test('request IDs execute at most once and completed responses remain retrievable', async t => {
    let calls = 0;
    const env = setup(t,{version:'1',call:async()=>({calls:++calls})});
    const id = 'a'.repeat(32);
    env.request(id);await env.bridge.tick();
    assert.equal(env.response(id).result.calls,1);
    env.request(id);await env.bridge.tick();
    assert.equal(calls,1);assert.equal(env.response(id).result.calls,1);
});

test('expired, mismatched session and malformed requests never execute', async t => {
    let calls = 0;
    const env = setup(t,{version:'1',call:async()=>++calls});
    for (const [i, params] of [{expires_at:0},{session:'wrong'},{protocol:9}].entries()) {
        const id = String(i).repeat(32);env.request(id,params);await env.bridge.tick();
        assert.equal(env.response(id).ok,false);
    }
    const id='f'.repeat(32);
    fs.writeFileSync(path.join(env.bridge.dir,'requests',id+'.json'),'{');
    await env.bridge.tick();assert.equal(env.response(id).ok,false);assert.equal(calls,0);
});

test('polls cannot overlap a long edit and operation errors are returned', async t => {
    let release, calls = 0;
    const env = setup(t,{version:'1',call:async()=>{calls++;await new Promise(resolve=>release=resolve);throw Object.assign(new Error('bad geometry'),{code:'INVALID_PARAMS'});}});
    const id='d'.repeat(32);env.request(id);
    const pending=env.bridge.tick();await Promise.resolve();await env.bridge.tick();
    assert.equal(calls,1);release();await pending;
    assert.equal(env.response(id).error.code,'INVALID_PARAMS');
});

function python(args) {
    return new Promise((resolve,reject)=>{
        const child=spawn('python',['skill/blockbench-modeling/scripts/blockbench.py',...args]);
        let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);
        child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
    });
}

test('Python CLI round trip with Unicode, pinned project, export and safe overwrite',async t=>{
    const env=setup(t,{version:'1',call:async(method,params)=>method==='model.export'?{content:'{"name":"方块与网格"}'}:{method,params}});
    const args=['--bridge-dir',env.root,'--project','project-test'];
    const roundtrip=await python([...args,'call','cube.add','--params','{"name":"方块"}']);
    assert.equal(roundtrip.code,0,roundtrip.stderr);
    assert.deepEqual(JSON.parse(roundtrip.stdout).params,{name:'方块',project_id:'project-test'});
    const output=path.join(env.root,'model.bbmodel');
    const saved=await python([...args,'save',output]);assert.equal(saved.code,0,saved.stderr);
    assert.equal(JSON.parse(fs.readFileSync(output,'utf8')).name,'方块与网格');
    const refused=await python([...args,'save',output]);assert.equal(refused.code,1);
});

test('multiple live sessions require an explicit target',async t=>{
    const env=setup(t,{version:'1',call:async()=>({})});
    const second=createFileBridge({fs,path,root:env.root,id:'second',engine:{version:'1',call:async()=>({})}});
    second.start();t.after(()=>second.stop());
    const response=await python(['--bridge-dir',env.root,'status']);
    assert.equal(response.code,1);assert.match(response.stderr,/Multiple Blockbench sessions/);
});

test('client timeout distinguishes queued cancellation from an already running edit',async t=>{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'bb-timeout-test-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const folder=path.join(root,'sessions','paused');
    fs.mkdirSync(path.join(folder,'requests'),{recursive:true});fs.mkdirSync(path.join(folder,'responses'));
    fs.writeFileSync(path.join(folder,'session.json'),JSON.stringify({protocol:1,id:'paused',heartbeat:Date.now()}));
    const cancelled=await python(['--bridge-dir',root,'--timeout','0.2','status']);
    assert.equal(cancelled.code,1);assert.match(cancelled.stderr,/cancelled/);
    assert.equal(fs.readdirSync(path.join(folder,'requests')).length,0);
    let release;
    const running=setup(t,{version:'1',call:async()=>new Promise(resolve=>release=resolve)});
    const unknown=await python(['--bridge-dir',running.root,'--timeout','0.4','status']);
    assert.equal(unknown.code,1);assert.match(unknown.stderr,/UNKNOWN/);
    assert.equal(typeof release,'function');release({completed:true});
    // Finish the already claimed request before test cleanup.
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(fs.readdirSync(path.join(running.bridge.dir,'responses')).length,1);
});
