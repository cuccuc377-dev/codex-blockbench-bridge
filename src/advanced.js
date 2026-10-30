/* Native object, texture and animation operations for Blockbench 5.2+. */
function createAdvancedOperations(api) {
    const {fail,check,obj,number,vec,name,project,resolve,parent,info,common,refresh,summary} = api;
    const clone = value => JSON.parse(JSON.stringify(value));
    const types = {spline:'splines',billboard:'billboards',armature:'armature_rig',armature_bone:'armature_rig',locator:'locators',null_object:'animation_mode',bounding_box:'bounding_boxes'};
    const positive = (value, label, max = 1e4) => { check(number(value) && value > 0 && value <= max, `${label} must be >0 and <=${max}`); return value; };
    const integer = (value,min,max,label) => { check(Number.isInteger(value) && value >= min && value <= max, `${label} must be an integer ${min}–${max}`); return value; };
    const enumeration = (value,allowed,label) => { check(allowed.includes(value), `${label}: expected ${allowed.join(', ')}`); return value; };
    function supported(type) { check(Object.hasOwn(types,type) && Format[types[type]] && OutlinerElement.types[type], `${type} is unavailable in this project format; free supports all bridge object types`); }
    function splineData(p, existing) {
        const data = {texture:existing?.texture};
        for (const [key,min,max] of [['radial_resolution',3,64],['tubular_resolution',1,128]]) if (p[key] !== undefined) data[key] = integer(p[key],min,max,key);
        if (p.radius !== undefined) data.radius_multiplier = positive(p.radius,'radius',1000);
        if (p.render_mode !== undefined) data.render_mode = enumeration(p.render_mode,['mesh','path'],'render_mode');
        if (p.shading !== undefined) data.shading = enumeration(p.shading,['flat','smooth'],'shading');
        if (p.points !== undefined) {
            check(Array.isArray(p.points) && p.points.length >= 2 && p.points.length <= 256, 'spline points requires 2–256 control joints');
            const pts = p.points.map(q => Array.isArray(q) ? {position:vec(q)} : {...q,position:vec(q.position)});
            data.vertices = {}; data.handles = {}; data.curves = {};
            pts.forEach((point,i) => {
                const previous = pts[Math.max(i-1,0)].position, next = pts[Math.min(i+1,pts.length-1)].position;
                const tangent = next.map((v,j)=>(v-previous[j])/6);
                data.vertices[`p${i}`] = point.position;
                data.vertices[`a${i}`] = point.in ? vec(point.in) : point.position.map((v,j)=>v-tangent[j]);
                data.vertices[`b${i}`] = point.out ? vec(point.out) : point.position.map((v,j)=>v+tangent[j]);
                data.handles[`h${i}`] = {joint:`p${i}`,control1:`a${i}`,control2:`b${i}`,size:point.size === undefined ? 1 : positive(point.size,'point.size',100),tilt:point.tilt === undefined ? 0 : (check(number(point.tilt),'point.tilt must be finite'),point.tilt)};
                if (i) data.curves[`c${i-1}`] = {start_handle:`h${i-1}`,end_handle:`h${i}`};
            });
        }
        const count = p.points?.length || Object.keys(existing?.handles || {}).length || 2;
        check(count * (data.radial_resolution || existing?.radial_resolution || 6) * (data.tubular_resolution || existing?.tubular_resolution || 12) <= 100000, 'Spline resolution budget exceeded');
        return data;
    }
    function objectData(type,p,existing,refs={}) {
        supported(type);
        const data = common(p,existing?.name || type);
        if (type === 'armature') {
            check(p.origin === undefined && p.rotation === undefined,'An armature container has no transform; transform its bones');
        } else if (['billboard','locator','null_object'].includes(type)) {
            check(p.origin === undefined,'Use position for this object type');
            if (p.position !== undefined) data.position = vec(p.position);
            if (type !== 'locator') check(p.rotation === undefined,'This object type has no rotation field');
        }
        if (type === 'billboard') {
            if (p.size !== undefined) { data.size = vec(p.size,2,'size'); data.size.forEach(v=>positive(v,'size')); }
            if (p.offset !== undefined) data.offset = vec(p.offset,2,'offset');
            if (p.facing_mode !== undefined) data.facing_mode = enumeration(p.facing_mode,['lookat','lookat_y','rotate','rotate_y'],'facing_mode');
        }
        if (type === 'armature_bone') {
            for (const key of ['length','width']) if (p[key] !== undefined) data[key] = positive(p[key],key);
            if (p.connected !== undefined) { check(typeof p.connected === 'boolean','connected must be boolean'); data.connected = p.connected; }
        }
        if (type === 'null_object') for (const key of ['ik_source','ik_target','ik_pole']) if (p[key] !== undefined) data[key] = p[key] === null ? '' : resolve(p[key],refs).uuid;
        if (type === 'bounding_box') {
            check(p.origin === undefined && p.rotation === undefined,'Bounding boxes use from/to coordinates');
            for (const key of ['from','to']) if (p[key] !== undefined) data[key] = vec(p[key]);
            const from = data.from || existing?.from || [0,0,0], to = data.to || existing?.to || [16,16,16];
            check(from.every((v,i)=>v<=to[i]),'Bounding box from must be <= to');
            if (p.function !== undefined) { check(Array.isArray(p.function) && p.function.every(v=>['collision','hitbox'].includes(v)),'function must be an array of collision/hitbox'); data.function = p.function.slice(); }
        }
        if (type === 'spline') Object.assign(data,splineData(p,existing));
        if (p.texture !== undefined) {
            check(['spline','billboard'].includes(type),'Only spline and billboard accept texture on creation');
            const texture = p.texture === false ? false : resolve(p.texture,refs,Texture.all).uuid;
            if (type === 'spline') data.texture = texture;
            else data.faces = {front:{texture,uv:[0,0,Project.texture_width,Project.texture_height]}};
        }
        return data;
    }
    const mutations = {};
    for (const type of Object.keys(types)) {
        const method = type === 'armature_bone' ? 'bone.add' : `${type}.add`;
        mutations[method] = (p,refs) => {
            const data = objectData(type,p,null,refs), target = parent(p.parent,refs,type);
            if (type === 'spline') check(p.points !== undefined,'spline.add requires points');
            return new OutlinerElement.types[type](data).addTo(target).init();
        };
    }
    mutations['mesh.bind'] = (p,refs) => {
        const mesh = resolve(p.id,refs), armature = resolve(p.armature,refs);
        check(mesh instanceof Mesh && armature.type === 'armature','Specify a mesh and an armature');
        check(Array.isArray(p.weights) && p.weights.length > 0 && p.weights.length <= 256,'weights must list 1–256 bone assignments');
        const entries = p.weights.map(entry => {
            const bone = resolve(entry.bone,refs); check(bone.type === 'armature_bone' && bone.getArmature() === armature,'Bone must belong to the armature');
            const vertices = entry.vertices || Object.fromEntries(Object.keys(mesh.vertices).map(key=>[key,1]));
            check(obj(vertices),'vertices must map mesh vertex keys to weights');
            for (const [key,value] of Object.entries(vertices)) check(Object.hasOwn(mesh.vertices,key) && number(value) && value >= 0 && value <= 1,'Invalid vertex or weight (expected 0–1)');
            return {bone,vertices};
        });
        check(new Set(entries.map(entry=>entry.bone.uuid)).size === entries.length,'Each bone may appear only once');
        const sums = Object.fromEntries(Object.keys(mesh.vertices).map(key=>[key,0]));
        const influences = Object.fromEntries(Object.keys(mesh.vertices).map(key=>[key,0]));
        for (const entry of entries) for (const [key,value] of Object.entries(entry.vertices)) sums[key] += value;
        for (const entry of entries) for (const [key,value] of Object.entries(entry.vertices)) if (value>0) influences[key]++;
        check(Object.values(sums).every(sum=>sum > 0),'Every mesh vertex needs a positive total weight');
        check(Object.values(influences).every(count=>count<=4),'Blockbench supports at most four bone influences per vertex');
        for (const bone of Outliner.elements.filter(e=>e.type==='armature_bone')) for (const key of Object.keys(mesh.vertices)) bone.setVertexWeight(mesh,key,0);
        mesh.addTo(armature);
        for (const {bone,vertices} of entries) for (const [key,value] of Object.entries(vertices)) bone.setVertexWeight(mesh,key,value/sums[key]);
        return mesh;
    };
    function describe(element,detail) {
        if (!Object.hasOwn(types,element.type)) return {};
        const result = {};
        const fields = {spline:['radial_resolution','tubular_resolution','radius_multiplier','render_mode','texture'],billboard:['size','offset','facing_mode'],armature_bone:['length','width','connected'],bounding_box:['from','to','function'],null_object:['ik_source','ik_target','ik_pole']}[element.type] || [];
        fields.forEach(key=>{ if (element[key] !== undefined) result[key]=clone(element[key]); });
        if (element.type === 'spline') { result.point_count=Object.keys(element.handles).length; result.curve_count=Object.keys(element.curves).length; }
        if (detail) result.native = element.getSaveCopy();
        return result;
    }
    function transaction(aspects,label,fn) {
        check(!Undo.current_save,'Finish the current edit first');
        Undo.initEdit(aspects);
        try { const result=fn(); refresh(); Undo.finishEdit(label,aspects); return result; }
        catch(error) { Undo.cancelEdit(true); refresh(); throw error; }
    }
    const methods = {};
    Object.assign(methods,createTextureOperations({...api,transaction,integer,enumeration,positive}));
    Object.assign(methods,createAnimationOperations({...api,transaction,integer,enumeration,positive}));
    Object.assign(methods,createNativeOperations({...api,transaction,integer,enumeration,positive}));
    Object.assign(methods,createWorkflowOperations({...api,transaction,integer,enumeration,positive}));
    return {mutations,methods,describe,objectData};
}
