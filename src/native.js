/* Native Blockbench tools: explicit state, live conditions and observable outcomes.
 * No code strings or arbitrary object paths are accepted by this module. */
function createNativeOperations(api) {
    const {check,fail,obj,number,project,resolve,vec} = api;
    const tokens = new WeakMap();
    let serial = 0, owner = null;
    const token = value => {if (!value) return null; if (!tokens.has(value)) tokens.set(value, `ui-${++serial}`); return tokens.get(value);};
    const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    const componentFields={adjust_brightness_contrast:{brightness:[0,200],contrast:[0,200]},adjust_saturation_hue:{saturation:[0,200],hue:[-180,180],brightness:[0,200]},adjust_opacity:{mode:['multiply','set'],opacity_percent:[0,200],opacity_value:[0,255]}};
    const available = (condition, context) => {try {return !!Condition(condition,context);} catch {return false;}};
    const event = p => ({type:'bridge',shiftKey:!!p.shift,altKey:!!p.alt,ctrlKey:!!p.ctrl,metaKey:false,ctrlOrCmd:!!p.ctrl,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});
    function descriptor(a) {
        const d={id:a.id,name:a.name,type:a.type,category:a.category,available:available(a.condition,a),modes:a.modes || a.condition?.modes,features:a.condition?.features};
        d.route = typeof NATIVE_TOOL_CATALOG === 'undefined' || !Object.hasOwn(NATIVE_TOOL_CATALOG,a.id) ? 'ui_only' : 'native';
        d.effects = (typeof NATIVE_TOOL_CATALOG !== 'undefined' && NATIVE_TOOL_CATALOG[a.id]?.effects) || [];
        if (a instanceof Tool) d.next='gesture_or_structured_operation';
        if (a instanceof BarSelect) d.options=Object.keys(a.options).map(id=>({id,name:a.getNameFor(id),available:available(a.options[id]?.condition,a)}));
        if (a instanceof NumSlider || a instanceof BarSlider) {try {d.value=a.get();} catch {} if (a.settings) d.range={min:a.settings.min,max:a.settings.max,step:a.settings.step};}
        else if (['select','toggle','text'].includes(a.type)) d.value=a.value;
        return d;
    }
    function item(id) {check(typeof id==='string' && Object.hasOwn(BarItems,id),'Unknown tool ID; query native.list'); return BarItems[id];}
    function permitted(a,p) {
        const d=descriptor(a);
        check(p.allow_effects===undefined || (Array.isArray(p.allow_effects) && p.allow_effects.every(x=>typeof x==='string')),'allow_effects must be an array');
        check(d.route==='native','This extension tool requires the UI workflow; it is not in the verified built-in registry');
        check(d.effects.every(effect=>p.allow_effects?.includes(effect)),`Operation requires task authorization for: ${d.effects.join(', ')}; pass matching allow_effects only when the user requested this operation`);
        check(d.available,`Tool ${a.id} is unavailable in the current mode, format or selection`);
        return d;
    }
    function ready(p={}) {
        if(p.project_id)project(p);
        check(!Project || !Undo.current_save,'An interactive edit is in progress');
        check(!Dialog.open && !Menu.open,'Finish/cancel the current dialog or menu first');
    }
    function formInfo(form) {
        if(!form)return null;
        const values=form.getResult();
        return {values:clone(values),fields:Object.entries(form.form_config).filter(([,v])=>obj(v)).map(([id,c])=>({id,type:c.type || 'text',label:tl(c.label || id),visible:available(c.condition,values),min:c.min,max:c.max,step:c.step,dimensions:c.dimensions,options:c.options && typeof c.options==='object'?Object.keys(c.options).map(key=>({id:key,name:tl(c.options[key]?.name || c.options[key])})):undefined,read_only:c.readonly===true}))};
    }
    function dialogInfo() {
        const d=Dialog.open;if(!d)return null;
        const supported=componentFields[d.id];
        return {token:token(d),id:d.id,title:tl(d.title),form:owner?.dialog===d?formInfo(d.form):null,buttons:d.buttons?.map((name,index)=>({index,name:tl(name)})),confirm_index:d.confirmIndex,cancel_index:d.cancelIndex,owned:owner?.dialog===d,custom_component:!!d.component,
            component:supported?{schema:supported,values:Object.fromEntries(Object.keys(supported).map(k=>[k,d.content_vue[k]]))}:d.id==='adjust_curves'?{curves:Object.fromEntries(Object.entries(d.content_vue.graphs).map(([k,g])=>[k,clone(g.points)]))}:null};
    }
    function menuEntries(menu) {
        return Array.from(menu.node.querySelectorAll('li')).filter(n=>!n.classList.contains('menu_separator') && n.querySelector(':scope > span') && !n.classList.contains('disabled'));
    }
    function menuInfo() {
        const m=Menu.open;if(!m)return null;
        return {token:token(m),id:m.id,owned:owner?.menu===m,items:menuEntries(m).map((n,index)=>({index,id:n.getAttribute('menu_item') || n.getAttribute('action'),name:n.querySelector(':scope > span').textContent,submenu:!!n.querySelector(':scope > ul')}))};
    }
    function amendmentInfo() {
        const a=Project && Undo.amend_edit_menu;if(!a)return null;
        return {token:token(a),owned:owner?.amendment===a,history_index:Undo.index,form:formInfo(a.form)};
    }
    function context() {
        return {project:Project?{uuid:Project.uuid,name:Project.name,format:Format.id}:null,mode:Modes.selected?.id,tool:Toolbox.selected?.id,panel:Prop.active_panel,
            selection:Project?[...Group.multi_selected,...Outliner.selected].map(e=>({id:e.uuid,type:e.type,vertices:e.getSelectedVertices?.().slice(),edges:e.getSelectedEdges?.().map(v=>v.slice()),faces:e.faces?UVEditor.getSelectedFaces(e).slice():undefined})):[],
            texture:Project?Texture.selected?.uuid:null,layer:Project?Texture.selected?.selected_layer?.uuid:null,
            animation:Project?Animation.selected?.uuid:null,time:Project?Timeline.time:null,keyframes:Project?Timeline.selected.map(k=>k.uuid):[],
            modes:Object.values(Modes.options).map(m=>({id:m.id,available:available(m.condition,m)})),panels:Object.keys(Panels),
            dialog:dialogInfo(),menu:menuInfo(),amendment:amendmentInfo(),editing:!!(Project && Undo.current_save)};
    }
    async function outcome(before, action, capture=true) {
        // Flush immediate native promises without waiting on background-throttled timers.
        // File pickers and delayed handlers remain "triggered" until inspected again.
        await Promise.resolve();
        if(capture) owner={action,project:Project?.uuid,dialog:Dialog.open,menu:Menu.open,amendment:Project && Undo.amend_edit_menu};
        const ui=context();
        let status=ui.dialog?'dialog_open':ui.menu?'menu_open':ui.editing?'interactive_edit':action instanceof Tool?'tool_selected':ui.amendment?'amendable':'triggered';
        const changed=Project && before?.project===Project.uuid && before.entry!==Undo.history[Undo.index-1];
        if(status==='triggered' && changed)status='edit_recorded';
        return {status,verification_required:true,history_changed:!!changed,context:ui};
    }
    const before = () => ({project:Project?.uuid,entry:Project?Undo.history[Undo.index-1]:null});
    function assertOwned(kind,p) {
        const value=kind==='dialog'?Dialog.open:kind==='menu'?Menu.open:Project && Undo.amend_edit_menu;
        check(value && token(value)===p.token,`${kind} changed; inspect native.inspect and use its current token`);
        check(owner && owner[kind]===value && owner.project===Project?.uuid,`Only a ${kind} opened by this bridge can be edited; use the UI for existing user dialogs`);
        check(!/permission|oauth|authenticat|login|password/i.test(value.id || ''),'Authentication and permission dialogs require the user');
        return value;
    }
    function validateForm(form,values) {
        check(form && obj(values),'values must be an object for an available native form');
        for(const [key,value] of Object.entries(values)) {
            const c=form.form_config[key];check(Object.hasOwn(form.form_config,key) && obj(c),`Unknown form field ${key}`);
            check(!c.readonly,'Read-only field');
            const type=c.type || 'text';
            check(!['file','folder','save','button','buttons','info','link'].includes(type),`Use the native UI for ${type} fields`);
            if(['number','num_slider','range'].includes(type)) {
                check(number(value),`${key} must be finite`);
                if(typeof c.min==='number')check(value>=c.min,`${key} is below minimum`);
                if(typeof c.max==='number')check(value<=c.max,`${key} exceeds maximum`);
            } else if(type==='checkbox')check(typeof value==='boolean',`${key} must be boolean`);
            else if(type==='select' || type==='inline_select')check(obj(c.options) && Object.hasOwn(c.options,value),`${key} is not a valid option`);
            else if(type==='vector')vec(value,c.dimensions || 3,key);
            else check(typeof value==='string' || typeof value==='boolean' || number(value) || Array.isArray(value),`Unsupported value for ${key}`);
        }
    }
    return {
        'native.list'(p) {
            const q=(p.query || '').toLowerCase();check(typeof q==='string','query must be text');
            const all=Object.values(BarItems).map(descriptor).filter(d=>(!q || `${d.id} ${d.name} ${d.category}`.toLowerCase().includes(q)) && (!p.category || d.category===p.category) && (!p.type || d.type===p.type) && (!p.available_only || d.available));
            const offset=p.offset ?? 0,limit=p.limit ?? 100;check(Number.isInteger(offset) && offset>=0 && Number.isInteger(limit) && limit>=1 && limit<=1000,'Invalid pagination');
            return {total:all.length,offset,items:all.slice(offset,offset+limit)};
        },
        'native.inspect':context,
        async 'native.run'(p) {
            ready(p);const a=item(p.id);permitted(a,p);
            check(a instanceof Action,'Use native.set for parameter controls');
            const b=before();const fired=a.trigger({...event(p),target:a.node,currentTarget:a.node});check(fired!==false,'Native action declined the current context');
            return outcome(b,a);
        },
        async 'native.set'(p) {
            ready(p);const a=item(p.id);permitted(a,p);const b=before();
            if(a instanceof Toggle){check(typeof p.value==='boolean','Toggle value must be boolean');a.set(p.value);}
            else if(a instanceof BarSelect){check(Object.hasOwn(a.options,p.value) && available(a.options[p.value]?.condition,a),'Unknown or unavailable option');a.change(p.value,event(p));}
            else if(a instanceof NumSlider || a instanceof BarSlider){
                check(number(p.value),'value must be finite');const old=a.get(),desired=p.relative===true?old+p.value:p.value;
                if(a.settings?.limit!==false){if(typeof a.settings?.min==='number')check(desired>=a.settings.min,'Below native minimum');if(typeof a.settings?.max==='number')check(desired<=a.settings.max,'Above native maximum');}
                try {a.onBefore?.();a.change(a instanceof NumSlider?n=>p.relative===true?n+p.value:p.value:desired,event(p));a.update?.();a.onAfter?.(desired-old);}
                catch(e){if(Project && Undo.current_save)Undo.cancelEdit(true);throw e;}
            }else fail('INVALID_PARAMS','This tool has no numeric/select/toggle value; use native.run');
            return {...await outcome(b,a),control:descriptor(a)};
        },
        'context.set'(p) {
            project(p);ready(p);
            if(p.mode!==undefined){const m=Modes.options[p.mode];check(m && available(m.condition,m),'Mode unavailable');if(Modes.animate)Timeline.pause();m.select();}
            if(p.ids!==undefined){check(Array.isArray(p.ids),'ids must be an array');const elements=p.ids.map(id=>resolve(id));unselectAllElements();Group.all.forEach(g=>g.unselect());elements.forEach(e=>e instanceof Group?e.multiSelect():e.markAsSelected());}
            if(p.selection_mode!==undefined){check(Object.hasOwn(BarItems.selection_mode.options,p.selection_mode),'Unknown mesh selection mode');BarItems.selection_mode.change(p.selection_mode);}
            if(p.spline_mode!==undefined){check(Object.hasOwn(BarItems.spline_selection_mode.options,p.spline_mode),'Unknown spline mode');BarItems.spline_selection_mode.change(p.spline_mode);}
            if(p.components!==undefined){
                check(Array.isArray(p.components),'components must be an array');
                const changes=p.components.map(c=>{
                    const e=resolve(c.id);check(e.selected,'Select each component owner in ids first');
                    const vertices=c.vertices || [],faces=c.faces || [],edges=c.edges || [];
                    check(Array.isArray(vertices) && vertices.every(k=>Object.hasOwn(e.vertices || {},k)),'Unknown vertex');
                    check(Array.isArray(faces) && faces.every(k=>Object.hasOwn(e.faces || {},k)),'Unknown face');
                    check(Array.isArray(edges) && edges.every(v=>Array.isArray(v) && v.length===2 && v[0]!==v[1] && v.every(k=>Object.hasOwn(e.vertices || {},k))),'Unknown edge');
                    const vkeys=[...new Set([...vertices,...edges.flat(),...(c.vertices===undefined?faces.flatMap(k=>e.faces[k].vertices || []):[])])];
                    return {e,c,vkeys,faces,edges};
                });
                for(const {e,c,vkeys,faces,edges} of changes){
                    if(e instanceof Mesh){const s=Project.mesh_selection[e.uuid]={vertices:vkeys,edges:clone(edges),faces:faces.slice()};if(c.edges===undefined && faces.length)for(const f of faces){const ring=e.faces[f].getSortedVertices();ring.forEach((v,i)=>{const edge=[v,ring[(i+1)%ring.length]];if(!s.edges.some(x=>x.includes(edge[0]) && x.includes(edge[1])))s.edges.push(edge);});}}
                    else if(e.type==='spline')e.getSelectedVertices(true).replace(vkeys);
                    else if(e.faces)UVEditor.getSelectedFaces(e,true).replace(faces);
                    else fail('INVALID_PARAMS','Element has no editable components');
                }
            }
            if(p.texture!==undefined)resolve(p.texture,{},Texture.all).select();
            if(p.layers!==undefined){check(Texture.selected && Array.isArray(p.layers),'Select texture and supply layers array');const ls=p.layers.map(id=>resolve(id,{},Texture.selected.layers));Texture.selected.layers.forEach(l=>l.multi_selected=false);Texture.selected.selected_layer=null;ls.forEach(l=>l.select(true));}
            if(p.animation!==undefined){check(Modes.animate,'Choose animate mode');resolve(p.animation,{},Animator.animations).select();}
            if(p.animator!==undefined){check(Animation.selected,'Select an animation');if(p.animator==='effects' && !Animation.selected.animators.effects)Animation.selected.animators.effects=new EffectAnimator(Animation.selected);const a=p.animator==='effects'?Animation.selected.animators.effects:Animation.selected.getBoneAnimator(resolve(p.animator));check(a,'Animator unavailable');a.select();}
            if(p.keyframes!==undefined){check(Animation.selected && Array.isArray(p.keyframes),'Select animation and supply keyframe UUIDs');const all=Object.values(Animation.selected.animators).flatMap(a=>a.keyframes),keys=p.keyframes.map(id=>resolve(id,{},all));Timeline.selected.slice().forEach(k=>{k.selected=false;});Timeline.selected.empty();keys.forEach(k=>{k.animator.addToTimeline();k.select({ctrlOrCmd:true});});updateKeyframeSelection();}
            if(p.time!==undefined){check(number(p.time) && p.time>=0,'time must be nonnegative');Timeline.setTime(p.time);if(Modes.animate)Animator.preview();}
            if(p.panel!==undefined){check(p.panel==='preview' || (Panels[p.panel] && available(Panels[p.panel].condition,Panels[p.panel])),'Panel unavailable');setActivePanel(p.panel);}
            updateSelection();UVEditor.loadData();return context();
        },
        async 'native.dialog'(p) {
            const d=assertOwned('dialog',p);const b=before();
            if(p.values!==undefined){validateForm(d.form,p.values);d.setFormValues(p.values);}
            if(p.component!==undefined){
                const schema=componentFields[d.id];check(schema && obj(p.component),'No structured component adapter for this dialog; use its UI');
                for(const [key,value] of Object.entries(p.component)){check(Object.hasOwn(schema,key),'Unknown component field');const rule=schema[key];check(typeof rule[0]==='number'?number(value) && value>=rule[0] && value<=rule[1]:rule.includes(value),'Invalid component value');}
                Object.assign(d.content_vue,p.component);d.content_vue.change();
            }
            if(p.curves!==undefined){
                check(d.id==='adjust_curves' && obj(p.curves),'curves applies only to adjust_curves');
                for(const [channel,points] of Object.entries(p.curves)){check(['rgb','r','g','b','a'].includes(channel) && Array.isArray(points) && points.length>=2 && points.length<=64,'Invalid curve');points.forEach(q=>{vec(q,2);check(q.every(n=>n>=0 && n<=1),'Curve coordinates must be 0–1');});check(points[0][0]===0 && points[points.length-1][0]===1 && points.every((q,i)=>i===0 || q[0]>points[i-1][0]),'Curve x values must increase from 0 to 1');}
                for(const [key,points] of Object.entries(p.curves))d.content_vue.graphs[key].points=clone(points);d.content_vue.updateGraph();d.content_vue.change();
            }
            if(p.action==='confirm')d.confirm(event(p));
            else if(p.action==='cancel')d.cancel(event(p));
            else if(p.action==='button'){check(Number.isInteger(p.index) && p.index>=0 && p.index<d.buttons.length,'Unknown dialog button index');d.close(p.index,event(p));}
            else check(p.action===undefined || p.action==='set','action must be set, confirm, cancel or button');
            return outcome(b,owner.action);
        },
        async 'native.menu'(p) {
            const m=assertOwned('menu',p),b=before();
            if(p.action==='cancel')m.hide();
            else {const entries=menuEntries(m);check(Number.isInteger(p.index) && entries[p.index],'Choose a current menu index');const node=entries[p.index];check(!node.querySelector(':scope > ul'),'Choose a leaf menu item');node.click();if(Menu.open===m)m.hide();}
            return outcome(b,owner.action);
        },
        async 'native.amend'(p) {
            const a=assertOwned('amendment',p),b=before();
            check(Undo.index===Undo.history.length,'History changed; cannot amend');
            if(p.action==='close')Undo.closeAmendEditMenu();
            else{validateForm(a.form,p.values);a.form.setValues(p.values);}
            return outcome(b,owner.action);
        }
    };
}
