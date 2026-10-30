/* Entry point appended to core.js + mailbox.js by tools/build.mjs. */
(function registerCodexBridge() {
    let bridge, statusAction, toggleAction, lastError = '';
    const root = () => require('path').join(SystemInfo.home_directory,'.codex','blockbench-bridge');
    function report(error) {
        lastError = String(error.message || error);
        console.error('[Codex Blockbench Bridge]', error);
    }
    function start() {
        if (bridge?.running) return;
        try {
            const folder = root();
            const fs = require('fs', {scope:folder, optional:false,
                message:'Codex uses this dedicated folder to send modeling commands and receive scene data. No network access is requested.'});
            if (!fs) { lastError = 'Folder permission was not granted. Re-enable the plugin to grant access.'; return; }
            bridge = createFileBridge({fs,path:require('path'),root:folder,id:guid(),engine:createModelBridge(),onError:report,
                context:() => ({blockbench:Blockbench.version,project:Project ? {uuid:Project.uuid,name:Project.name,format:Format.id} : null})});
            bridge.start(); lastError = '';
            Blockbench.showQuickMessage('Codex Bridge 已连接 / Ready',2500);
        } catch (error) { report(error); Blockbench.showQuickMessage('Codex Bridge 启动失败；在工具菜单中查看状态',4000); }
    }
    Plugin.register('codex_blockbench_bridge', {
        title:'Codex Blockbench Bridge', author:'BlockbenchSkill', description:'Local Codex modeling, native tools and dialogs, UVs, layered painting, skinning, animation and format export.',
        icon:'smart_toy',version:'1.2.0',min_version:'5.2.0',variant:'desktop',tags:['Modeling','Utility'],
        onload() {
            statusAction = new Action('codex_bridge_status',{name:'Codex Bridge：连接状态',icon:'smart_toy',click() {
                new Dialog({id:'codex_bridge_status_dialog',title:'Codex Blockbench Bridge',form:{
                    status:{label:'状态',type:'info',text:bridge?.running ? '运行中 / Running' : '已停止 / Stopped'},
                    folder:{label:'通信目录',type:'info',text:root()},
                    session:{label:'会话 ID',type:'info',text:bridge?.id || '—'},
                    error:{label:'最近错误',type:'info',text:lastError || '无'}
                },buttons:['关闭']}).show();
            }});
            toggleAction = new Action('codex_bridge_toggle',{name:'Codex Bridge：启动 / 停止',icon:'power_settings_new',click() {
                if (bridge?.running) { bridge.stop(); Blockbench.showQuickMessage('Codex Bridge 已停止',2500); } else start();
            }});
            MenuBar.addAction(statusAction,'tools'); MenuBar.addAction(toggleAction,'tools');
            start();
        },
        onunload() { bridge?.stop(); statusAction?.delete(); toggleAction?.delete(); }
    });
})();
