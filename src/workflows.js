/* Structured counterparts for pixel gestures, layered images and file transfers. */
function createWorkflowOperations(api) {
    const {check,obj,number,vec,name,project,resolve,transaction,integer} = api;
    function ready(p){project(p);check(!Undo.current_save && !Dialog.open && !Menu.open,'Finish the current edit/dialog/menu first');}
    function texture(p){return resolve(p.texture || p.id,{},Texture.all);}
    function layerInfo(l){return {uuid:l.uuid,name:l.name,type:l.type,parent:l.parent_uuid,opacity:l.opacity,visible:l.visible,offset:l.offset?.slice(),scale:l.scale?.slice(),width:l.width,height:l.height,blend_mode:l.blend_mode,selected:l.selected};}
    const color = c=>{check(typeof c==='string' && /^#[0-9a-f]{6}$/i.test(c),'Use #RRGGBB color');return c;};
    async function decode(data) {
        check(typeof data==='string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data) && data.length<=12e6,'Expected PNG data URL under 12 MB');
        const image=new Image();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('PNG decode timed out')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('Invalid PNG'));};image.src=data;});
        check(image.width>0 && image.height>0 && image.width<=8192 && image.height<=8192,'PNG dimensions must be 1–8192');return image;
    }
    return {
        'layer.list'(p){project(p);const t=texture(p);return {texture:t.uuid,enabled:t.layers_enabled,selected:t.selected_layer?.uuid,layers:t.layers.map(layerInfo)};},
        async 'layer.add'(p){
            ready(p);const t=texture(p),original=Project,im=p.data_url?await decode(p.data_url):null;
            check(Project===original && Texture.all.includes(t),'Project changed while decoding');ready(p);
            const width=im?.width || integer(p.width ?? t.width,1,8192,'width'),height=im?.height || integer(p.height ?? t.height,1,8192,'height');
            const offset=p.offset?vec(p.offset,2):[0,0],title=name(p.name,'layer');
            return transaction({textures:[t],bitmap:true},'Codex add texture layer',()=>{
                t.select();if(!t.layers_enabled)t.activateLayers(false);
                const l=new TextureLayer({name:title,offset},t);l.setSize(width,height);if(im)l.ctx.drawImage(im,0,0);l.addForEditing();t.updateChangesAfterEdit();return layerInfo(l);
            });
        },
        'layer.update'(p){
            ready(p);const t=texture(p),l=resolve(p.layer,{},t.layers),data={};
            if(p.name!==undefined)data.name=name(p.name);
            if(p.opacity!==undefined){check(number(p.opacity) && p.opacity>=0 && p.opacity<=100,'opacity must be 0–100');data.opacity=p.opacity;}
            if(p.visible!==undefined){check(typeof p.visible==='boolean','visible must be boolean');data.visible=p.visible;}
            for(const key of ['offset','scale'])if(p[key]!==undefined)data[key]=vec(p[key],2,key);
            if(p.blend_mode!==undefined){check(TextureLayer.properties.blend_mode.enum_values.includes(p.blend_mode),'Unknown blend mode');data.blend_mode=p.blend_mode;}
            return transaction({textures:[t],bitmap:true},'Codex update layer',()=>{l.extend(data);t.updateChangesAfterEdit();return layerInfo(l);});
        },
        'layer.export'(p){project(p);const t=texture(p),l=resolve(p.layer,{},t.layers);check(l instanceof TextureLayer,'Select pixel layer');return {...layerInfo(l),data_url:l.canvas.toDataURL()};},
        'paint.selection'(p){
            ready(p);const t=texture(p);let rect;
            if(p.rect){rect=vec(p.rect,4,'rect');check(rect.every(Number.isInteger) && rect[0]>=0 && rect[1]>=0 && rect[2]>0 && rect[3]>0 && rect[0]+rect[2]<=t.width && rect[1]+rect[3]<=t.height,'rect [x,y,width,height] must be inside texture');}
            else check(['all','none'].includes(p.mode),'Supply rect or mode all/none');
            t.select();t.selection.changeSize(t.width,t.height);
            if(rect){t.selection.setOverride(false);t.selection.setOverride(null);for(let y=rect[1];y<rect[1]+rect[3];y++)for(let x=rect[0];x<rect[0]+rect[2];x++)t.selection.set(x,y,1);}
            else t.selection.setOverride(p.mode==='all');
            UVEditor.updateSelectionOutline();return {texture:t.uuid,custom:t.selection.is_custom,bounds:t.selection.getBoundingRect()};
        },
        'paint.stroke'(p){
            ready(p);check(Modes.paint,'Choose paint mode first');const t=texture(p);
            check(['brush_tool','copy_brush','fill_tool','eraser','color_picker','draw_shape_tool','gradient_tool'].includes(p.tool),'Unsupported pixel tool');
            check(Array.isArray(p.points) && p.points.length>0 && p.points.length<=2048,'points requires 1–2048 texture pixel coordinates');
            const points=p.points.map(q=>vec(q,2,'point'));check(points.every(q=>q[0]>=0 && q[1]>=0 && q[0]<t.width && q[1]<t.height),'Stroke points must be inside texture');
            const source=p.source?vec(p.source,2,'source'):null;if(source)check(source[0]>=0 && source[1]>=0 && source[0]<t.width && source[1]<t.height,'Clone source outside texture');
            if(p.tool==='copy_brush')check(source,'copy_brush requires source [x,y]');
            if(p.color)color(p.color);if(p.secondary)color(p.secondary);
            for(const [key,min,max] of [['size',1,512],['opacity',0,100],['softness',0,100]])if(p[key]!==undefined)check(number(p[key]) && p[key]>=min && p[key]<=max,`Invalid ${key}`);
            check(p.shape===undefined || Object.hasOwn(BarItems.draw_shape_type.options,p.shape),'Invalid shape option');
            t.select();if(p.layer)resolve(p.layer,{},t.layers).select();
            check(!t.layers_enabled || t.getActiveLayer() instanceof TextureLayer,'Select a pixel layer for painting');
            BarItems[p.tool].select();
            if(p.color)ColorPanel.set(p.color);if(p.secondary)ColorPanel.set(p.secondary,true);
            for(const key of ['size','opacity','softness'])if(p[key]!==undefined){const v=key==='opacity' && settings.opacity_range.value==='255'?p[key]*255/100:p[key];BarItems[`slider_brush_${key}`].change(()=>v);}
            if(p.shape)BarItems.draw_shape_type.change(p.shape);
            const e={type:'bridge',pointerType:'pen',pressure:1,shiftKey:false,ctrlKey:false,ctrlOrCmd:false,altKey:false,clientX:0,clientY:0,preventDefault(){}};
            const index=Undo.index;Painter.current={};
            try {
                if(source){Painter.startPaintTool(t,...source,undefined,{...e,ctrlKey:true,ctrlOrCmd:true});Painter.stopPaintTool();}
                Painter.startPaintTool(t,...points[0],undefined,e);
                for(const point of points.slice(1))Painter.movePaintTool(t,...point,e,false,undefined);
                Painter.stopPaintTool();
                // Native no-op strokes (fully masked/transparent) can leave an empty undo save.
                if(Undo.current_save)Undo.cancelEdit(true);
                return {texture:t.uuid,tool:p.tool,status:Undo.index!==index?'edit_recorded':'no_pixel_change',color:ColorPanel.get(),layer:t.selected_layer?.uuid};
            }catch(error){Painter.brushChanges=false;if(Undo.current_save)Undo.cancelEdit(true);Painter.paint_stroke_canceled=true;try{Painter.stopPaintTool();}catch{}Painter.current={};throw error;}
        },
        'paint.sample'(p){project(p);const t=texture(p),point=vec(p.point,2);check(point.every(Number.isInteger) && point[0]>=0 && point[1]>=0 && point[0]<t.width && point[1]<t.height,'Pixel outside texture');return {rgba:Array.from(t.ctx.getImageData(...point,1,1).data)};},
        'codec.list'(p){project(p);return Object.values(Codecs).map(c=>({id:c.id,name:c.name,extension:c.extension,available:!c.export_action || !!Condition(c.export_action.condition,c.export_action),options:Object.entries(c.export_options || {}).map(([id,f])=>({id,type:f.type,options:f.options?Object.keys(f.options):undefined,value:f.value})),structured_export:['project','obj','gltf','fbx','collada','stl','java_block','bedrock','bedrock_old','bedrock_voxel_shape','optifine_entity','optifine_part','modded_entity'].includes(c.id)}));},
        async 'codec.export'(p){
            ready(p);check(['project','obj','gltf','fbx','collada','stl','java_block','bedrock','bedrock_old','bedrock_voxel_shape','optifine_entity','optifine_part','modded_entity'].includes(p.id),'Use the native UI for this codec');
            const c=Codecs[p.id];check(c && (!c.export_action || Condition(c.export_action.condition,c.export_action)),'Codec unavailable in current format');
            check(p.options===undefined || obj(p.options),'options must be an object');
            for(const [key,val] of Object.entries(p.options || {})){
                const field=c.export_options?.[key];check(field && field.type!=='info',`Unknown export option ${key}`);
                if(field.type==='select')check(Object.hasOwn(field.options,val),'Invalid export option');
                else if(field.type==='checkbox')check(typeof val==='boolean','Export option must be boolean');
                else if(field.type==='number')check(number(val) && val>0,'Export scale must be positive');
                else check(typeof val==='string' || number(val),'Invalid export value');
            }
            const options={...c.getExportOptions(),...p.options};
            if(p.id==='project')options.bitmaps=true;
            if(['gltf','fbx'].includes(p.id)){check(p.options?.embed_textures!==false,'Structured glTF/FBX export embeds textures; use native UI for external asset bundles');options.embed_textures=true;}
            const original=Project,time=Timeline.time;
            let content;try{content=await c.compile(options);}finally{if(Project===original && Modes.animate){Timeline.setTime(time);Animator.preview();}}
            check(Project===original,'Project changed during export');
            const result={name:Project.name,codec:c.id,extension:p.id==='gltf' && options.encoding==='binary'?'glb':c.extension,assets:p.id==='obj' || p.id==='collada'?'geometry_document_only':'embedded_where_supported'};
            if(content instanceof Blob)content=await content.arrayBuffer();
            if(content instanceof ArrayBuffer || ArrayBuffer.isView(content)){
                const bytes=content instanceof ArrayBuffer?new Uint8Array(content):new Uint8Array(content.buffer,content.byteOffset,content.byteLength);check(bytes.length<=12e6,'Export too large for bridge; use native file export');
                let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return {...result,encoding:'base64',content:btoa(binary)};
            }
            check(typeof content==='string' && content.length<=14e6,'Codec did not produce supported text, or output exceeds bridge size; use native file export');return {...result,encoding:'utf8',content};
        },
        'project.import'(p){
            if(Project)ready(p);check(obj(p.model) && obj(p.model.meta) && Array.isArray(p.model.elements),'Supply a parsed bbmodel in model');
            check(JSON.stringify(p.model).length<=14e6,'Model exceeds request budget');
            const model=JSON.parse(JSON.stringify(p.model));
            // The client transfers embedded assets; do not dereference foreign disk paths.
            for(const t of model.textures || []){check(typeof t.source==='string' && t.source.startsWith('data:image/png;base64,'),'Import requires embedded PNG textures');delete t.path;delete t.relative_path;}
            const previous=Project?.uuid;Codecs.project.load(model,{path:'',no_file:true});check(Project && Project.uuid!==previous,'Native importer did not create a project');
            return {project:Project.uuid,name:Project.name,elements:Outliner.elements.length};
        }
    };
}
