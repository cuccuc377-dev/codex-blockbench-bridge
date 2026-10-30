function createTextureOperations(api) {
    const {check,obj,number,vec,name,project,resolve,transaction,integer,enumeration,positive} = api;
    const color = value => { check(typeof value === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value),'Use #RRGGBB or #RRGGBBAA colors'); return value; };
    const surface = (width,height) => { const canvas=document.createElement('canvas'); canvas.width=width;canvas.height=height;return canvas; };
    function pattern(canvas,p={}) {
        const width=canvas.width,height=canvas.height,ctx=canvas.getContext('2d');
        const style=enumeration(p.pattern || 'solid',['solid','checker','noise','wood','brick','metal','gradient'],'pattern');
        const palette=p.colors || ['#c98a48','#704725'];
        check(Array.isArray(palette) && palette.length>=1 && palette.length<=32,'colors requires 1–32 hex colors');palette.forEach(color);
        const cell=integer(p.cell || 8,1,1024,'cell');
        let seed=integer(p.seed === undefined ? 1 : p.seed,0,0xffffffff,'seed') >>> 0;
        const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };
        if (style==='gradient') {
            const gradient=ctx.createLinearGradient(0,0,p.direction==='horizontal'?width:0,p.direction==='horizontal'?0:height);
            palette.forEach((c,i)=>gradient.addColorStop(palette.length===1?0:i/(palette.length-1),c));ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);return;
        }
        for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
            let index=0;
            if (style==='checker') index=(Math.floor(x/cell)+Math.floor(y/cell))%palette.length;
            if (style==='noise') index=Math.floor(random()*palette.length);
            if (style==='wood') index=Math.floor((x+Math.sin(y/9)*2+Math.sin(y/23)*3)/Math.max(1,cell/3));
            if (style==='brick') index=(y%cell===0 || (x+(Math.floor(y/cell)%2)*cell)%(cell*2)===0)?1:0;
            if (style==='metal') index=(x%cell===1 && y%cell===1)?palette.length-1:Math.floor(y/Math.max(1,height/palette.length));
            ctx.fillStyle=palette[((index%palette.length)+palette.length)%palette.length];ctx.fillRect(x,y,1,1);
        }
    }
    function addCanvas(canvas,title) {
        const texture=new Texture({name:title,uv_width:canvas.width,uv_height:canvas.height}).fromDataURL(canvas.toDataURL()).add(false);
        // Make export and undo snapshots correct before the browser image-load callback runs.
        texture.canvas.width=canvas.width;texture.canvas.height=canvas.height;
        texture.ctx.drawImage(canvas,0,0);texture.width=canvas.width;texture.height=canvas.height;
        return texture;
    }
    function textureInfo(texture) { return {uuid:texture.uuid,name:texture.name,width:texture.width,height:texture.height,uv_width:texture.getUVWidth(),uv_height:texture.getUVHeight()}; }
    const methods = {
        'texture.generate'(p) {
            project(p); const width=integer(p.width || 64,1,2048,'width'),height=integer(p.height || width,1,2048,'height');
            const canvas=surface(width,height);pattern(canvas,p);
            const textures=[];
            return transaction({textures},'Codex generate texture',()=>{ const texture=addCanvas(canvas,name(p.name,'generated.png'));textures.push(texture);return textureInfo(texture); });
        },
        'texture.paint'(p) {
            project(p); const texture=resolve(p.id,{},Texture.all);
            check(!texture.layers_enabled,'Flatten layers in Blockbench before using texture.paint');
            check(Array.isArray(p.commands) && p.commands.length>=1 && p.commands.length<=10000,'commands requires 1–10000 paint operations');
            const canvas=surface(texture.canvas.width,texture.canvas.height),ctx=canvas.getContext('2d');ctx.drawImage(texture.canvas,0,0);
            for (const cmd of p.commands) {
                check(obj(cmd),'Each paint command must be an object');
                const shape=enumeration(cmd.shape,['rect','pixel','line','ellipse','polygon','clear'],'shape');
                ctx.fillStyle=ctx.strokeStyle=color(cmd.color || '#000000');
                if (shape==='rect' || shape==='clear') {
                    const r=vec(cmd.rect,4,'rect');check(r[2]>=0 && r[3]>=0,'Rectangle width/height cannot be negative');
                    if (shape==='clear') ctx.clearRect(...r); else ctx.fillRect(...r);
                } else if(shape==='pixel') { const point=vec(cmd.point,2,'point');ctx.fillRect(...point,1,1); }
                else if(shape==='line') { const a=vec(cmd.from,2,'from'),b=vec(cmd.to,2,'to');ctx.lineWidth=positive(cmd.width || 1,'width',128);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke(); }
                else if(shape==='ellipse') {const r=vec(cmd.rect,4,'rect');check(r[2]>0 && r[3]>0,'Ellipse dimensions must be positive');ctx.beginPath();ctx.ellipse(r[0]+r[2]/2,r[1]+r[3]/2,r[2]/2,r[3]/2,0,0,Math.PI*2);ctx.fill();}
                else {check(Array.isArray(cmd.points) && cmd.points.length>=3 && cmd.points.length<=1000,'Polygon requires 3–1000 points');const points=cmd.points.map(q=>vec(q,2));ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(q=>ctx.lineTo(...q));ctx.closePath();ctx.fill();}
            }
            return transaction({textures:[texture],bitmap:true},'Codex paint texture',()=>{
                texture.ctx.clearRect(0,0,canvas.width,canvas.height);texture.ctx.drawImage(canvas,0,0);
                texture.updateSource(canvas.toDataURL());texture.saved=false;return textureInfo(texture);
            });
        },
        'texture.export'(p) { project(p);const texture=resolve(p.id,{},Texture.all);return {...textureInfo(texture),data_url:texture.getDataURL()}; },
        async 'texture.replace'(p) {
            project(p);const originalProject=Project,texture=resolve(p.id,{},Texture.all);
            check(!texture.layers_enabled,'Flatten layers before replacing a texture');
            check(typeof p.data_url==='string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.data_url) && p.data_url.length<=12e6,'Supply a PNG data URL under 12 MB');
            const image=new Image();
            await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Texture decode timed out')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('Invalid PNG'));};image.src=p.data_url;});
            check(Project===originalProject && Texture.all.includes(texture),'Project or texture changed while decoding');
            check(image.width===texture.width && image.height===texture.height,'Replacement dimensions must match; preserve the atlas layout and resolution');
            return transaction({textures:[texture],bitmap:true},'Codex replace texture image',()=>{
                texture.ctx.clearRect(0,0,image.width,image.height);texture.ctx.drawImage(image,0,0);texture.updateSource(p.data_url);texture.saved=false;return textureInfo(texture);
            });
        },
        'texture.map'(p) {
            project(p);const texture=resolve(p.texture,{},Texture.all);
            check(Array.isArray(p.ids) && p.ids.length>0 && p.ids.length<=2000,'ids must list 1–2000 elements');
            const elements=[...new Set(p.ids.map(id=>resolve(id)))];
            check(elements.every(e=>e instanceof Cube || e instanceof Mesh || ['billboard','spline'].includes(e.type)),'Target must support texture mapping');
            const rect=p.rect?vec(p.rect,4,'rect'):[0,0,texture.getUVWidth(),texture.getUVHeight()];
            check(rect[2]>rect[0] && rect[3]>rect[1],'UV rectangle must have positive size');
            return transaction({elements},'Codex map texture to model',()=>{
                let faceCount=0;
                for(const element of elements){
                    if(element.type==='spline'){element.texture=texture.uuid;element.refreshTubeFaces();continue;}
                    if(element instanceof Cube)element.box_uv=false;
                    for(const face of Object.values(element.faces)){
                        if(element instanceof Mesh){
                            if(face.vertices.length<3)continue;
                            const normal=face.getNormal(true).map(Math.abs),dims=[0,1,2].filter(d=>d!==normal.indexOf(Math.max(...normal)));
                            const points=face.vertices.map(key=>dims.map(d=>element.vertices[key][d]));
                            const min=[0,1].map(d=>Math.min(...points.map(q=>q[d]))),max=[0,1].map(d=>Math.max(...points.map(q=>q[d])));
                            face.uv=Object.fromEntries(face.vertices.map((key,i)=>[key,points[i].map((v,d)=>rect[d]+(v-min[d])/Math.max(max[d]-min[d],1e-9)*(rect[d+2]-rect[d]))]));
                        }else{face.uv=rect.slice();face.rotation=0;}
                        face.texture=texture.uuid;faceCount++;
                    }
                }
                return {texture:texture.uuid,elements:elements.map(e=>e.uuid),faces:faceCount};
            });
        },
        'texture.atlas'(p) {
            project(p);check(Array.isArray(p.ids) && p.ids.length>0 && p.ids.length<=2000,'ids must list 1–2000 cube/mesh/billboard elements');
            const elements=[...new Set(p.ids.map(id=>resolve(id)))];
            check(elements.every(e=>e instanceof Cube || e instanceof Mesh || e.type==='billboard'),'Atlas supports cubes, polygon meshes and billboards');
            const width=integer(p.width || 256,16,4096,'width'),height=integer(p.height || width,16,4096,'height');
            const padding=integer(p.padding === undefined?2:p.padding,0,16,'padding');
            const tile=integer(p.tile || 24,2,512,'tile'),stride=tile+padding*2,columns=Math.floor(width/stride);
            const faces=elements.flatMap(element=>Object.entries(element.faces).filter(([,f])=>!(element instanceof Mesh) || f.vertices.length>=3).map(([key,face])=>({element,key,face})));
            check(faces.length>0 && columns>0 && Math.ceil(faces.length/columns)*stride<=height,'Atlas too small; increase width/height or reduce tile/padding');
            check(p.materials===undefined || obj(p.materials),'materials must map element UUIDs or unique names to pattern specifications');
            const fallback=p.material || {pattern:'checker',colors:['#9dc3cf','#6d929e'],cell:4};
            const canvas=surface(width,height),ctx=canvas.getContext('2d'),mapping=[];
            faces.forEach(({element,key,face},i)=>{
                const outerX=(i%columns)*stride,outerY=Math.floor(i/columns)*stride;
                const x=outerX+padding,y=outerY+padding,uvRect=[x,y,x+tile,y+tile];
                const patch=surface(stride,stride);pattern(patch,p.materials?.[element.uuid] || p.materials?.[element.name] || fallback);ctx.drawImage(patch,outerX,outerY);
                let uv=uvRect;
                if (element instanceof Mesh) {
                    const normal=face.getNormal(true).map(Math.abs),dims=[0,1,2].filter(d=>d!==normal.indexOf(Math.max(...normal)));
                    const points=face.vertices.map(key=>dims.map(d=>element.vertices[key][d]));
                    const min=[0,1].map(d=>Math.min(...points.map(q=>q[d]))),max=[0,1].map(d=>Math.max(...points.map(q=>q[d])));
                    uv=Object.fromEntries(face.vertices.map((key,j)=>[key,points[j].map((v,d)=>(d?y:x)+(v-min[d])/Math.max(max[d]-min[d],1e-9)*tile)]));
                }
                mapping.push({element:element.uuid,face:key,rect:uvRect,uv});
            });
            const textures=[];
            return transaction({elements,textures},'Codex create texture atlas and UVs',()=>{
                const texture=addCanvas(canvas,name(p.name,'atlas.png'));textures.push(texture);
                // UV coordinates follow this format's per-texture/global logical resolution.
                const scale=[texture.getUVWidth()/width,texture.getUVHeight()/height];
                mapping.forEach((entry,i)=>{
                    const {element,face}=faces[i];if(element instanceof Cube)element.box_uv=false;
                    face.texture=texture.uuid;
                    if (element instanceof Mesh) face.uv=Object.fromEntries(Object.entries(entry.uv).map(([k,uv])=>[k,uv.map((v,d)=>v*scale[d])]));
                    else {face.uv=entry.uv.map((v,d)=>v*scale[d%2]);face.rotation=0;}
                    entry.uv=cloneUV(face.uv);
                });
                return {texture:textureInfo(texture),mapping,pixel_size:[width,height],uv_size:[texture.getUVWidth(),texture.getUVHeight()]};
            });
        }
    };
    function cloneUV(uv) {return JSON.parse(JSON.stringify(uv));}
    return methods;
}
