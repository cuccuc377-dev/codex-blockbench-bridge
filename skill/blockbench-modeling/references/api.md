# Bridge API

All calls use `python <skill>/scripts/blockbench.py [--session ID] [--project UUID] call METHOD --file params.json`.
For 1.1 additions see [objects.md](objects.md), [textures.md](textures.md), and [animations.md](animations.md).
Global options precede the subcommand. `--params '{...}'` is available but a file avoids shell quoting. The Python `Client` class can also be imported to send dictionaries directly.

## Connection / project / inspection

| Method | Parameters / result |
|---|---|
| `bridge.status` | `{}` → plugin version, Blockbench version, current project, operation names; plugin 1.3+ adds `background` with enabled/scheduler/visibility/focused/playing/timeline_time/fallback_ticks/last_error |
| `project.list` | `{}` → open tabs with UUID, name, format, active flag |
| `project.create` | `{name,format?:"free",texture_size?:[64,64]}` → new project; previous tabs remain |
| `project.select` | `{id:project_uuid}` → selects an existing tab |
| `scene.get` | `{detail?:false,ids?:[element_uuid]}` → project, elements/groups, textures, selection |
| `selection.set` | `{ids:[element_uuid]}` |
| `history.undo` / `history.redo` | `{}` → one real Blockbench history step |

All commands accept `project_id` to reject a different active project. The CLI `--project` adds it automatically. Mesh detail includes vertices keyed by stable vertex IDs and faces keyed by Blockbench-generated face IDs. Get current IDs before face editing or extrusion.

## Undoable modeling

Each command below can be called alone, or inside `batch`:

```json
{
  "label": "Build body and roof",
  "operations": [
    {"method":"group.add","ref":"assembly","params":{"name":"house"}},
    {"method":"cube.add","ref":"body","params":{"name":"body","parent":"$assembly","from":[-8,0,-8],"to":[8,12,8]}},
    {"method":"element.update","params":{"id":"$body","color":2}}
  ]
}
```

Maximum 1000 operations per batch. One batch is one undo entry. A failure rolls back the entire batch, including preceding successful operations. `ref` only exists within that batch; the result supplies actual UUIDs for later calls. Delete refs cannot be reused. Parent is a group/armature/bone UUID, unique name, `$ref`, or `"root"`, subject to that object's supported child types. Missing parent means root, independent of UI selection.

Common creation fields: `name`, `parent`, `origin:[x,y,z]`, `rotation:[x,y,z]` in degrees, `visibility:boolean`, `color:0..9`. Color is an outliner/preview palette index. Geometry is in Blockbench model units, conventionally 16 units per Minecraft block. Y is up; signed Z follows Blockbench's viewport directions.

| Method | Required / optional fields |
|---|---|
| `group.add` | Common fields |
| `cube.add` | Common fields; `from`, `to` (default `[0,0,0]` and `[16,16,16]`); `inflate`, `box_uv`, `uv_offset:[u,v]`, `texture:uuid` |
| `mesh.add` | Common fields; `vertices` map and `faces` array, described below; requires `Format.meshes` |
| `element.update` | `id`; common fields, cube fields, or native type fields from objects.md; omitted fields stay unchanged |
| `element.remove` | `id`, `recursive:true` required for nonempty parent objects |
| `element.duplicate` | `id` for cube/mesh, optional `name`, `parent`, `offset:[dx,dy,dz]` |
| `mesh.vertices` | `id`, `vertices:{existing_key:[x,y,z]}`; update a subset without changing topology |
| `mesh.replace` | `id`, complete `vertices` and `faces`; replaces topology and face keys; sets seams to empty |
| `mesh.extrude` | `id`, `face:face_key`, `distance` nonzero; moves cap along its normal, adds side faces, removes original cap. Operates on one face, not a region |
| `face.update` | `id`, `face` key; optional `texture` UUID or `false`, `uv`; cube-only `rotation:0/90/180/270` |
| `texture.assign` | `id`, `texture` UUID or `false`, optional `faces:[keys]` (default all); supports cube/mesh/billboard; spline has one texture and ignores face lists |

Mesh vertices are **local** to `origin`; cube `from`/`to` are project coordinates rotated about `origin`. Groups influence child transforms. Updating a group's origin changes its pivot, not a generic translation. Move geometry or rotate the group explicitly. Cube bounds must be ordered per axis. Game-specific bounds, rotation limits, bone naming, and face culling constraints remain the caller's responsibility; `free` is appropriate for unrestricted modeling.

### Mesh representation

```json
{
  "name":"triangle",
  "origin":[0,8,0],
  "vertices":{"a":[0,0,0],"b":[4,0,0],"c":[0,4,0]},
  "faces":[{"vertices":["a","b","c"],"uv":{"a":[0,0],"b":[16,0],"c":[0,16]}}]
}
```

Faces accept either arrays of 3–4 distinct existing vertex keys, or objects with `vertices`, optional `uv`, and optional `texture` UUID. Quads should be planar and convex; triangulate complex surfaces. Vertices/face counts each max 50000. Degenerate triangles are rejected. Supply outward winding and avoid self-intersections. Auto UV is planar projection in model units and may overlap; UV units are texture pixels, not 0–1 coordinates. With explicit UVs, provide every vertex in that face. Cube UV is `[u1,v1,u2,v2]` with face key `north/south/east/west/up/down`; setting explicit cube face UV turns box UV off.

`mesh.replace` replaces all topology, including texture assignments; include texture IDs again. After replacement/extrusion, re-read scene detail for new face keys. Mesh vertex IDs you supplied remain stable unless new vertices are generated by extrusion.

### Primitives

```powershell
python "<skill>/scripts/primitives.py" cylinder --name wheel --radius 4 --height 2 --segments 12 --origin 8 5 0 --output wheel.json
python "<skill>/scripts/blockbench.py" call mesh.add --file wheel.json
```

`cone` uses a zero-radius top. `sphere` accepts `--rings`. Cylinder/cone main axis is Y; rotate the mesh to orient a wheel. `--parent` accepts an existing group UUID/name. Helpers only generate files; send them through `mesh.add` to create geometry.

## Textures, view, export

`texture.add`: `{name,data_url:"data:image/png;base64,..."}`. Use CLI `texture image.png` to encode a local PNG; limit 8 MB input, dimensions at most 8192 per side. Returns texture UUID. It creates its own undo step and is not allowed inside batch. The plugin never reads arbitrary image paths; the client sends the image bytes. Per-texture logical UV size is initialized to PNG dimensions. See textures.md for generation, mapping and replacement.

`preview.camera`: optional `{preset,position:[x,y,z],target:[x,y,z],zoom}`. Presets: `perspective`, `top`, `bottom`, `south`, `north`, `east`, `west`. Orthographic presets use zoom; perspective uses camera position and target. The command changes the visible viewport.

`preview.screenshot`: `{width?:1024,height?:768}` → PNG `data_url`; dimensions 64–4096. CLI `screenshot output.png` decodes and saves the image, preserving transparent background.

`model.export`: `{format?:"bbmodel"}` → `{name,format,content}`. Also supports `obj` geometry only; no material bundle. CLI `save model.bbmodel` writes UTF-8 with an atomic replacement only when `--overwrite` is supplied. Export does not mark the current tab saved or change its current save path. Native `.bbmodel` includes texture content through Blockbench's project codec.

## File protocol and troubleshooting

Default root: `~/.codex/blockbench-bridge`. Plugin requests scoped filesystem permission through Blockbench 5.2's native permission UI, with no TCP server, cloud key, shell execution, or arbitrary JavaScript API. Each running plugin instance creates `sessions/<UUID>/{session.json,requests/,responses/}`. Session heartbeat is every 2 seconds; the client considers 15 seconds without a heartbeat stale. A stopped/minimized app may throttle timers: restore the window if discovery reports stale state.

Requests are atomically published as `<32 hex ID>.json`; the plugin renames them `.processing` before execution. Fields: `protocol:1`, `id`, `session`, `expires_at` in Unix milliseconds, `method`, `params`. Maximum 16 MB. Responses keep the same ID and contain either `ok:true,result` or `ok:false,error:{code,message}`. Responses stay on disk for diagnosis/deduplication for the lifetime of that session directory. Old inactive session directories may be removed manually when no longer needed.

The CLI waits up to 30 seconds, configurable with `--timeout` (max 300). If still queued, it cancels the request atomically; if already claimed, it reports UNKNOWN execution state and a result retrieval command. Do not automatically resubmit changes. Lost responses after process failure cannot prove whether a change happened: reconnect and inspect the scene.

`--bridge-dir` / `BLOCKBENCH_BRIDGE_DIR` select a different client directory for test/custom plugin builds; the production plugin always uses the default root. They do not reconfigure the production plugin.
