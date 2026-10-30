# Native objects (plugin 1.1+)

All methods here are undoable and may be included in `batch`. Shared fields: `name`, `parent`, `visibility`, supported type-specific transforms, and palette `color`. `scene.get {detail:true}` includes `native` serialization for these objects. Do not confuse helper objects with rendered geometry: bones, locators, null objects and bounding boxes are usually hidden in screenshots.

| Method | Parameters |
|---|---|
| `spline.add` | `points`, optional `origin`, `rotation`, `radius`, `radial_resolution` (3–64), `tubular_resolution` (1–128), `render_mode:"mesh"/"path"`, `shading:"flat"/"smooth"`, `texture` UUID |
| `billboard.add` | `position`, `size:[width,height]`, `offset:[x,y]`, `facing_mode:"lookat"/"lookat_y"/"rotate"/"rotate_y"`, optional `texture` |
| `armature.add` | `name`, `parent`, `visibility`; no transform. Its bones carry transforms |
| `bone.add` | `parent` armature or bone, `origin`, `rotation`, `length`, `width`, `connected:boolean` |
| `locator.add` | `position`, optional `rotation` |
| `null_object.add` | `position`, optional `ik_source`, `ik_target`, `ik_pole` referencing scene objects; `null` clears a link |
| `bounding_box.add` | `from`, `to`, `function:["hitbox","collision"]` or a subset |

Use `element.update` with the same type-specific fields plus `id`. Use `element.remove` and `recursive:true` to intentionally remove a parent and its descendants. `element.duplicate` currently supports only cubes and meshes.

Supported formats are checked before creation. `free` supports all listed types. Armature children are bones, meshes, locators or null objects. Bone children are bones, locators or null objects. A bone cannot be rooted directly or placed under a normal group. Put rigid cube geometry under groups for animation; a mesh to be deformed must be directly under its armature.

## Splines

```json
{
  "name":"cable",
  "points":[[0,0,0],[4,6,0],[0,12,0]],
  "radius":0.5,
  "radial_resolution":6,
  "tubular_resolution":12
}
```

Points are in spline-local coordinates and require 2–256 entries. Arrays create automatically estimated smooth Bezier tangents. An explicit point accepts `{position:[x,y,z],in:[x,y,z],out:[x,y,z],size:1,tilt:0}`. `in`/`out` are absolute control point coordinates in the same local space. `size` scales radius at that joint. The current bridge creates open splines. Updating `points` replaces the path; changing radius/resolution preserves the existing path and texture. Curved geometry is bounded to 100000 control-resolution product to avoid freezing the application.

## Armature skinning

```json
{
  "id":"mesh UUID",
  "armature":"armature UUID",
  "weights":[
    {"bone":"lower bone UUID","vertices":{"v0":1,"v1":1,"v2":0.4,"v3":0.4}},
    {"bone":"upper bone UUID","vertices":{"v2":0.6,"v3":0.6,"v4":1,"v5":1}}
  ]
}
```

Send to `mesh.bind`. Vertex keys come from `scene --detail`. Each listed bone must belong to the armature. Each vertex needs a positive total weight and at most 4 influences. Weights must be 0–1 and are normalized per vertex. Omitting `vertices` in a bone assignment assigns weight 1 to all mesh vertices. The operation replaces that mesh's previous bindings and reparents it under the armature in one undo step. Rest geometry/pivots must already be in the intended coordinate space; reparenting does not preserve an arbitrary existing transformed world pose.

`null_object` IK link fields are exposed, but this bridge does not synthesize or validate a full IK rig. For predictable deformation, start with explicit forward-kinematic bone keyframes and verify poses before adding IK constraints.
