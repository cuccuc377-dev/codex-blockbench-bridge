const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

test('built plugin requests only scoped folder access and tears down its session/UI', t => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(),'bb-plugin-test-'));
    const requests=[],actions=[],menu=[],timers=new Set();
    let registered;
    const scope={
        console, SystemInfo:{home_directory:home}, Project:null, guid:()=> 'test-instance',
        Blockbench:{version:'5.2.2',showQuickMessage(){}},
        Plugin:{register(id, options){registered={id,...options};}},
        Action:class {constructor(id,options){this.id=id;this.options=options;actions.push(this);}delete(){this.deleted=true;}},
        Dialog:class {},MenuBar:{addAction(action,section){menu.push(section);}},
        require(module,options){requests.push({module,options});if(module==='path')return path;if(module==='fs')return fs;throw new Error('Unexpected module '+module);},
        setInterval(fn,delay){const timer=setInterval(fn,delay);timers.add(timer);return timer;},
        clearInterval(timer){clearInterval(timer);timers.delete(timer);},
        setTimeout,clearTimeout
    };
    t.after(()=>{registered?.onunload();for(const timer of timers)clearInterval(timer);fs.rmSync(home,{recursive:true,force:true});});
    vm.runInNewContext(fs.readFileSync('plugin/codex_blockbench_bridge.js','utf8'),scope);
    assert.equal(registered.id,'codex_blockbench_bridge');
    registered.onload();
    const folder=path.join(home,'.codex','blockbench-bridge');
    const native=requests.filter(item=>item.module==='fs');
    assert.equal(native.length,1);assert.equal(native[0].options.scope,folder);assert.equal(native[0].options.optional,false);
    assert.equal(actions.length,2);assert.deepEqual(menu,['tools','tools']);
    const status=path.join(folder,'sessions','test-instance','session.json');
    assert.equal(JSON.parse(fs.readFileSync(status)).version,'1.2.0');
    registered.onunload();assert.equal(fs.existsSync(status),false);
    assert.equal(timers.size,0);assert.ok(actions.every(action=>action.deleted));
});

test('denied native permission leaves the bridge stopped without crashing plugin registration',()=>{
    let registered;
    vm.runInNewContext(fs.readFileSync('plugin/codex_blockbench_bridge.js','utf8'),{
        console,SystemInfo:{home_directory:'C:/test'},Project:null,
        require:module=>module==='path'?path:undefined,
        Plugin:{register(id,data){registered=data;}},
        Action:class {delete(){}},MenuBar:{addAction(){}},Blockbench:{showQuickMessage(){}}
    });
    assert.doesNotThrow(()=>registered.onload());assert.doesNotThrow(()=>registered.onunload());
});
