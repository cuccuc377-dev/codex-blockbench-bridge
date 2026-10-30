/* Model operations. Runs inside Blockbench; deliberately no eval or arbitrary code API. */
function createModelBridge() {
    const VERSION = '1.2.0';
    let extensions;
    const fail = (code, message) => { const e = new Error(message); e.code = code; throw e; };
    const check = (condition, message) => { if (!condition) fail('INVALID_PARAMS', message); };
    const obj = value => value && typeof value === 'object' && !Array.isArray(value);
    const number = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e7;
    function vec(value, length = 3, label = 'vector') {
        check(Array.isArray(value) && value.length === length && value.every(number), `${label} must contain ${length} finite numbers`);
        return value.slice();
    }
    function name(value, fallback) {
        if (value === undefined) return fallback;
        check(typeof value === 'string' && value.length > 0 && value.length <= 200, 'name must have 1–200 characters');
        return value;
    }
    function project(params = {}) {
        check(typeof Project !== 'undefined' && Project, 'Open or create a project first');
        if (params.project_id && params.project_id !== Project.uuid) fail('PROJECT_CHANGED', 'The active project changed; inspect the scene and target the correct project');
    }
    function resolve(id, refs = {}, pool = [...Group.all, ...Outliner.elements]) {
        check(typeof id === 'string', 'An element UUID, unique name, or $batch_ref is required');
        if (id.startsWith('$')) id = refs[id.slice(1)]?.uuid || fail('NOT_FOUND', `Unknown batch reference ${id}`);
        let found = pool.find(item => item.uuid === id);
        if (!found) {
            const candidates = pool.filter(item => item.name === id);
            if (candidates.length > 1) fail('AMBIGUOUS_NAME', `Use a UUID: more than one item is named ${id}`);
            found = candidates[0];
        }
        return found || fail('NOT_FOUND', `Item not found: ${id}`);
    }
    function parent(id, refs, childType) {
        const result = id === undefined || id === 'root' ? 'root' : resolve(id, refs);
        check(result === 'root' || Array.isArray(result.children), 'parent must identify a group, armature, or bone');
        const allowedChildren = result === 'root' ? null : result.getTypeBehavior('child_types');
        if (childType && allowedChildren) check(allowedChildren.includes(childType), `${result.type} cannot contain ${childType}`);
        const allowedParents = childType && OutlinerElement.types[childType]?.behavior?.parent_types;
        if (allowedParents) check(allowedParents.includes(result === 'root' ? 'root' : result.type), `${childType} requires parent type ${allowedParents.join(', ')}`);
        return result;
    }
    function info(element, detail = false) {
        const result = {uuid: element.uuid, name: element.name, type: element.type,
            parent: element.parent?.uuid || 'root', origin: element.origin?.slice(), rotation: element.rotation?.slice(), visibility: element.visibility};
        if (element instanceof Cube) Object.assign(result, {from: element.from.slice(), to: element.to.slice(), inflate: element.inflate, box_uv: element.box_uv});
        if (element instanceof Mesh) Object.assign(result, {vertex_count: Object.keys(element.vertices).length, face_count: Object.keys(element.faces).length});
        if (Array.isArray(element.children)) result.children = element.children.map(child => child.uuid);
        if (element.position) result.position = element.position.slice();
        if (extensions) Object.assign(result, extensions.describe(element, detail));
        if (detail && element instanceof Mesh) result.vertices = JSON.parse(JSON.stringify(element.vertices));
        if (detail && element.faces) result.faces = Object.fromEntries(Object.entries(element.faces).map(([id, face]) => [id, face.getSaveCopy()]));
        return result;
    }
    function summary() {
        if (!Project) return null;
        return {uuid: Project.uuid, name: Project.name, format: Format.id, supports_meshes: !!Format.meshes,
            capabilities: {splines:!!Format.splines,billboards:!!Format.billboards,armatures:!!Format.armature_rig,locators:!!Format.locators,null_objects:!!Format.animation_mode,bounding_boxes:!!Format.bounding_boxes,animation:!!Format.animation_mode},
            texture_width: Project.texture_width, texture_height: Project.texture_height,
            elements: Outliner.elements.length, groups: Group.all.length};
    }
    function common(params, fallback) {
        const data = {name: name(params.name, fallback)};
        for (const key of ['origin', 'rotation']) if (params[key] !== undefined) data[key] = vec(params[key], 3, key);
        if (params.visibility !== undefined) { check(typeof params.visibility === 'boolean', 'visibility must be boolean'); data.visibility = params.visibility; }
        if (params.color !== undefined) { check(Number.isInteger(params.color) && params.color >= 0 && params.color <= 9, 'color is an outliner palette index 0–9'); data.color = params.color; }
        return data;
    }
    function cubeData(params, existing) {
        const data = common(params, existing?.name || 'cube');
        for (const key of ['from', 'to']) if (params[key] !== undefined) data[key] = vec(params[key], 3, key);
        const from = data.from || existing?.from || [0, 0, 0], to = data.to || existing?.to || [16, 16, 16];
        check(from.every((v, i) => v <= to[i]), 'Cube from must be <= to on each axis');
        if (params.inflate !== undefined) { check(number(params.inflate), 'inflate must be finite'); data.inflate = params.inflate; }
        if (params.box_uv !== undefined) { check(typeof params.box_uv === 'boolean', 'box_uv must be boolean'); data.box_uv = params.box_uv; }
        if (params.uv_offset !== undefined) data.uv_offset = vec(params.uv_offset, 2, 'uv_offset');
        return data;
    }
    function meshGeometry(params) {
        check(obj(params.vertices) && Object.keys(params.vertices).length >= 3 && Object.keys(params.vertices).length <= 50000, 'vertices must be a map with 3–50000 entries');
        const vertices = Object.create(null);
        for (const [key, value] of Object.entries(params.vertices)) {
            check(/^[a-zA-Z0-9_-]{1,64}$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key), 'Invalid vertex key');
            vertices[key] = vec(value, 3, `vertex ${key}`);
        }
        check(Array.isArray(params.faces) && params.faces.length >= 1 && params.faces.length <= 50000, 'faces must be a nonempty array of at most 50000 faces');
        const faces = params.faces.map((face, index) => {
            if (Array.isArray(face)) face = {vertices: face};
            check(obj(face) && Array.isArray(face.vertices) && [3, 4].includes(face.vertices.length), `face ${index} must be a triangle or quad`);
            check(new Set(face.vertices).size === face.vertices.length && face.vertices.every(key => Object.hasOwn(vertices, key)), `face ${index} has duplicate or missing vertices`);
            const a = vertices[face.vertices[0]], b = vertices[face.vertices[1]], c = vertices[face.vertices[2]];
            const u = b.map((v, i) => v - a[i]), v = c.map((x, i) => x - a[i]);
            const n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]].map(Math.abs);
            check(Math.max(...n) > 1e-10, `face ${index} has a degenerate first triangle`);
            const uv = {};
            if (face.uv !== undefined) {
                check(obj(face.uv), 'Face uv must map vertex keys to [u,v]');
                for (const key of face.vertices) { check(face.uv[key] !== undefined, `Missing UV for ${key}`); uv[key] = vec(face.uv[key], 2, 'uv'); }
            } else {
                // Planar projection onto the dominant normal plane, in texture pixels.
                const dims = [0, 1, 2].filter(i => i !== n.indexOf(Math.max(...n)));
                for (const key of face.vertices) uv[key] = dims.map(i => vertices[key][i]);
            }
            return {vertices: face.vertices.slice(), uv, texture: face.texture};
        });
        return {vertices, faces};
    }
    function setGeometry(mesh, geometry, refs) {
        mesh.vertices = {...geometry.vertices}; mesh.faces = {}; mesh.seams = {};
        for (const face of geometry.faces) {
            const data = {...face, texture: face.texture ? resolve(face.texture, refs, Texture.all).uuid : false};
            mesh.addFaces(new MeshFace(mesh, data));
        }
    }
    function refresh() { Canvas.updateAll(); updateSelection(); }
    const mutations = {
        'group.add'(p, refs) {
            const target = parent(p.parent, refs, 'group');
            return new Group(common(p, 'group')).addTo(target).init();
        },
        'cube.add'(p, refs) {
            check(Format.cube !== false, 'This format does not support cubes');
            const target = parent(p.parent, refs, 'cube'), data = cubeData(p);
            const cube = new Cube({...data, from: data.from || [0,0,0], to: data.to || [16,16,16]}).addTo(target).init();
            if (p.texture) for (const face of Object.values(cube.faces)) face.texture = resolve(p.texture, refs, Texture.all).uuid;
            return cube;
        },
        'mesh.add'(p, refs) {
            check(Format.meshes, 'This format cannot store meshes. Create a free project for cubes + meshes');
            const target = parent(p.parent, refs, 'mesh'), geometry = meshGeometry(p);
            const mesh = new Mesh({...common(p, 'mesh'), vertices: {}}).addTo(target).init();
            setGeometry(mesh, geometry, refs);
            return mesh;
        },
        'element.update'(p, refs) {
            const item = resolve(p.id, refs);
            const data = item instanceof Cube ? cubeData(p, item) : item instanceof Mesh || item instanceof Group ? common(p, item.name) : extensions?.objectData(item.type, p, item, refs);
            check(data, 'Unsupported element type');
            item.extend(data);
            if (p.parent !== undefined) {
                const target = parent(p.parent, refs, item.type);
                check(target !== item && (target === 'root' || !target.getAllAncestors().includes(item)), 'Reparenting would create a cycle');
                item.addTo(target);
            }
            return item;
        },
        'element.remove'(p, refs) {
            const item = resolve(p.id, refs), result = info(item);
            if (Array.isArray(item.children)) check(p.recursive === true || item.children.length === 0, 'Set recursive:true to remove a nonempty parent');
            item.remove(); return {...result, removed: true};
        },
        'element.duplicate'(p, refs) {
            const item = resolve(p.id, refs);
            check(item instanceof Cube || item instanceof Mesh, 'Duplicate cube or mesh elements individually');
            const copy = item.duplicate();
            copy.name = name(p.name, `${item.name}_copy`);
            if (p.parent !== undefined) copy.addTo(parent(p.parent, refs, copy.type));
            if (p.offset !== undefined) {
                const delta = vec(p.offset);
                copy.origin = copy.origin.map((v, i) => v + delta[i]);
                if (copy instanceof Cube) for (const key of ['from', 'to']) copy[key] = copy[key].map((v, i) => v + delta[i]);
            }
            return copy;
        },
        'mesh.replace'(p, refs) {
            const mesh = resolve(p.id, refs); check(mesh instanceof Mesh, 'Target must be a mesh');
            setGeometry(mesh, meshGeometry(p), refs); return mesh;
        },
        'mesh.vertices'(p, refs) {
            const mesh = resolve(p.id, refs); check(mesh instanceof Mesh, 'Target must be a mesh');
            check(obj(p.vertices) && Object.keys(p.vertices).length > 0, 'vertices must map existing keys to positions');
            const changes = Object.entries(p.vertices).map(([key, value]) => { check(Object.hasOwn(mesh.vertices, key), `Unknown vertex ${key}`); return [key, vec(value)]; });
            for (const [key, value] of changes) mesh.vertices[key] = value;
            return mesh;
        },
        'mesh.extrude'(p, refs) {
            const mesh = resolve(p.id, refs); check(mesh instanceof Mesh, 'Target must be a mesh');
            const face = mesh.faces[p.face]; check(face && face.vertices.length >= 3, 'Unknown polygon face');
            check(number(p.distance) && p.distance !== 0, 'distance must be a nonzero number');
            const normal = face.getNormal(true), ring = face.getSortedVertices();
            check(normal.some(v => Math.abs(v) > 1e-8), 'Cannot extrude a degenerate face');
            const added = mesh.addVertices(...ring.map(key => mesh.vertices[key].map((v, i) => v + normal[i] * p.distance)));
            const uv = Object.fromEntries(added.map((key, i) => [key, face.uv[ring[i]].slice()]));
            mesh.addFaces(new MeshFace(mesh, {vertices: added, uv, texture: face.texture}));
            ring.forEach((key, i) => {
                const j = (i + 1) % ring.length;
                const points = [key, ring[j], added[j], added[i]];
                const width = Math.hypot(...mesh.vertices[key].map((v, k) => v - mesh.vertices[ring[j]][k]));
                const coords = [[0,0], [width,0], [width,Math.abs(p.distance)], [0,Math.abs(p.distance)]];
                mesh.addFaces(new MeshFace(mesh, {vertices: points, uv: Object.fromEntries(points.map((k, n) => [k, coords[n]])), texture: face.texture}));
            });
            delete mesh.faces[p.face];
            return mesh;
        },
        'face.update'(p, refs) {
            const item = resolve(p.id, refs); check(item instanceof Cube || item instanceof Mesh || item.type === 'billboard', 'Target must have editable faces');
            check(typeof p.face === 'string' && Object.hasOwn(item.faces, p.face), 'Unknown face');
            const face = item.faces[p.face];
            if (p.texture !== undefined) face.texture = p.texture === false ? false : resolve(p.texture, refs, Texture.all).uuid;
            if (p.uv !== undefined) {
                if (item instanceof Cube || item.type === 'billboard') { if (item instanceof Cube) item.box_uv = false; face.uv = vec(p.uv, 4, 'uv'); }
                else { check(obj(p.uv), 'uv must map vertex keys to [u,v]'); for (const key of face.vertices) { check(p.uv[key] !== undefined, `Missing UV for ${key}`); face.uv[key] = vec(p.uv[key], 2, 'uv'); } }
            }
            if (p.rotation !== undefined) { check(item instanceof Cube && [0,90,180,270].includes(p.rotation), 'Cube face rotation must be 0,90,180,270'); face.rotation = p.rotation; }
            return item;
        },
        'texture.assign'(p, refs) {
            const item = resolve(p.id, refs); check(item instanceof Cube || item instanceof Mesh || ['billboard','spline'].includes(item.type), 'Target must support textures');
            const texture = p.texture === false ? false : resolve(p.texture, refs, Texture.all).uuid;
            if (item.type === 'spline') { item.texture = texture; item.refreshTubeFaces(); return item; }
            const keys = p.faces || Object.keys(item.faces);
            check(Array.isArray(keys) && keys.every(key => Object.hasOwn(item.faces, key)), 'Unknown face');
            keys.forEach(key => item.faces[key].texture = texture); return item;
        }
    };
    function edit(operations, label, params) {
        project(params);
        if (Undo.current_save) fail('BUSY', 'An interactive edit is in progress; finish it before sending commands');
        check(Array.isArray(operations) && operations.length > 0 && operations.length <= 1000, 'A batch requires 1–1000 operations');
        const refs = Object.create(null);
        // These arrays stay live so new/deleted objects are included in the post-edit snapshot.
        const aspects = {elements: Outliner.elements, groups: Group.all, outliner: true, selection: true};
        Undo.initEdit(aspects);
        try {
            const results = operations.map((op, index) => {
                check(obj(op) && Object.hasOwn(mutations, op.method), `Unsupported batch operation at ${index}`);
                check(op.params === undefined || obj(op.params), 'Operation params must be an object');
                if (op.ref !== undefined) check(typeof op.ref === 'string' && /^[a-zA-Z][\w-]{0,63}$/.test(op.ref) && !Object.hasOwn(refs, op.ref), 'Batch refs must be unique identifiers');
                const result = mutations[op.method](op.params || {}, refs);
                if (op.ref) { check(!result.removed, 'Cannot reference a removed item'); refs[op.ref] = result; }
                return result.removed ? result : info(result);
            });
            refresh();
            Undo.finishEdit(name(label, 'Codex model edit'), aspects);
            return {project: summary(), results, refs: Object.fromEntries(Object.entries(refs).map(([key, value]) => [key, value.uuid]))};
        } catch (error) {
            Undo.cancelEdit(true); refresh(); throw error;
        }
    }
    const methods = {
        'bridge.status': () => ({version: VERSION, blockbench: Blockbench.version, project: summary(), methods: [...Object.keys(methods), ...Object.keys(mutations)]}),
        'project.list': () => ModelProject.all.map(p => ({uuid:p.uuid, name:p.name, format:p.format.id, active:p === Project})),
        'project.create'(p) {
            check(typeof p.format === 'undefined' || typeof p.format === 'string', 'format must be a string');
            const format = Formats[p.format || 'free']; check(format, 'Unknown format');
            const title = name(p.name, 'Codex Model');
            const resolution = vec(p.texture_size || [64,64], 2, 'texture_size');
            check(resolution.every(n => Number.isInteger(n) && n >= 1 && n <= 8192), 'texture_size must contain integers 1–8192');
            if (Project && Undo.current_save) fail('BUSY', 'Finish the current edit before creating a project');
            newProject(format); Project.name = title;
            [Project.texture_width, Project.texture_height] = resolution;
            return summary();
        },
        'project.select'(p) { const target = ModelProject.all.find(item => item.uuid === p.id); check(target, 'Unknown project UUID'); if (Project && Undo.current_save) fail('BUSY', 'Finish the current edit first'); target.select(); return summary(); },
        'scene.get'(p) {
            project(p);
            const items = p.ids ? p.ids.map(id => resolve(id)) : [...Group.all, ...Outliner.elements];
            return {project:summary(), elements:items.map(item => info(item, p.detail === true)), textures:Texture.all.map(t => ({uuid:t.uuid,name:t.name,width:t.width,height:t.height})), selection:Outliner.selected.map(e => e.uuid)};
        },
        'batch'(p) { return edit(p.operations, p.label, p); },
        'selection.set'(p) {
            project(p); check(!Undo.current_save, 'Finish the current edit first'); check(Array.isArray(p.ids), 'ids must be an array');
            const elements = p.ids.map(id => resolve(id));
            unselectAllElements(); Group.all.forEach(g => g.unselect());
            elements.forEach(e => e instanceof Group ? e.multiSelect() : e.markAsSelected()); updateSelection();
            return {selected:elements.map(e => e.uuid)};
        },
        'history.undo'(p) { project(p); check(!Undo.current_save, 'Finish the current edit first'); check(Undo.index > 0, 'Nothing to undo'); Undo.undo(); return summary(); },
        'history.redo'(p) { project(p); check(!Undo.current_save, 'Finish the current edit first'); check(Undo.index < Undo.history.length, 'Nothing to redo'); Undo.redo(); return summary(); },
        async 'texture.add'(p) {
            project(p); check(!Undo.current_save, 'Finish the current edit first');
            check(typeof p.data_url === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.data_url) && p.data_url.length <= 12e6, 'Supply a PNG data URL under 12 MB');
            const title = name(p.name, 'texture.png'), originalProject = Project;
            const image = new Image();
            await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Cannot decode PNG')); image.src = p.data_url; });
            check(image.width <= 8192 && image.height <= 8192, 'Texture dimensions must not exceed 8192');
            if (Project !== originalProject) fail('PROJECT_CHANGED', 'Project changed while decoding texture');
            check(!Undo.current_save, 'Finish the current edit first');
            const textures = [];
            Undo.initEdit({textures});
            try {
                const texture = new Texture({name:title,uv_width:image.width,uv_height:image.height}).fromDataURL(p.data_url).add(false);
                texture.canvas.width=image.width;texture.canvas.height=image.height;texture.ctx.drawImage(image,0,0);
                texture.width=image.width;texture.height=image.height;
                textures.push(texture); Undo.finishEdit('Codex add texture', {textures});
                return {uuid:texture.uuid,name:texture.name,width:image.width,height:image.height};
            } catch (error) { Undo.cancelEdit(true); throw error; }
        },
        'model.export'(p) {
            project(p);
            const format = p.format || 'bbmodel';
            check(format === 'bbmodel' || format === 'obj', 'Export supports bbmodel or obj');
            const codec = format === 'bbmodel' ? Codecs.project : Codecs.obj;
            check(codec, 'Export codec is unavailable');
            const content = codec.compile(format === 'bbmodel' ? {bitmaps:true} : {});
            check(typeof content === 'string', 'Codec did not return a text document');
            return {name:Project.name,format,content};
        },
        'preview.camera'(p) {
            project(p); const preview = Preview.selected; check(preview, 'No active preview');
            const presets = {perspective:0,top:1,bottom:2,south:3,north:4,east:5,west:6};
            if (p.preset !== undefined) { check(Object.hasOwn(presets,p.preset), 'Unknown camera preset'); preview.loadAnglePreset(DefaultCameraPresets[presets[p.preset]]); }
            if (p.position !== undefined) preview.camera.position.fromArray(vec(p.position));
            if (p.target !== undefined) preview.controls.target.fromArray(vec(p.target));
            if (p.zoom !== undefined) { check(number(p.zoom) && p.zoom > 0, 'zoom must be positive'); preview.camera.zoom = p.zoom; preview.camera.updateProjectionMatrix(); }
            preview.controls.update(); preview.render(); return {position:preview.camera.position.toArray(),target:preview.controls.target.toArray()};
        },
        async 'preview.screenshot'(p) {
            project(p); const width = p.width || 1024, height = p.height || 768;
            check([width,height].every(n => Number.isInteger(n) && n >= 64 && n <= 4096), 'Screenshot dimensions must be 64–4096');
            const data_url = await new Promise((resolve,reject) => {
                const timer = setTimeout(() => reject(new Error('Screenshot timed out')), 15000);
                const done=data=>{clearTimeout(timer);resolve(data);};
                // Render at the requested resolution instead of padding a small Animate-mode viewport.
                const rendering=Screencam.advancedScreenshot(Preview.selected,{resolution:[width,height],angle_preset:'view',anti_aliasing:'msaa',show_gizmos:false},done);
                if(rendering?.catch)rendering.catch(error=>{clearTimeout(timer);reject(error);});
            });
            return {data_url};
        }
    };
    if (typeof createAdvancedOperations === 'function') {
        extensions = createAdvancedOperations({fail,check,obj,number,vec,name,project,resolve,parent,info,common,refresh,summary,methods});
        Object.assign(mutations, extensions.mutations);
        Object.assign(methods, extensions.methods);
    }
    return {version:VERSION, async call(method, params = {}) {
        check(obj(params), 'params must be a JSON object');
        if (Object.hasOwn(mutations, method)) return edit([{method,params}], params.label, params);
        if (!Object.hasOwn(methods,method)) fail('METHOD_NOT_FOUND', `Unknown method: ${method}`);
        if (params.project_id) project(params);
        return methods[method](params);
    }};
}
if (typeof module !== 'undefined' && module.exports) module.exports = createModelBridge;
