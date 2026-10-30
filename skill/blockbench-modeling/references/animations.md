# Rigging and animation (plugin 1.1+)

Use a format with `capabilities.animation`; `free` supports both group animation and armature skinning. Animation methods are individual undo steps and cannot be embedded in modeling `batch`.

For rigid cube/mesh parts, create groups with origin at the intended joint and reparent the parts. Animate the group. A cube or mesh cannot be targeted directly. For vertex deformation use `armature.add`, `bone.add`, `mesh.bind`; see objects.md. Locators are reference points, while null objects expose their native animator channels (usually position).

## Create a clip

```json
{
  "name":"idle","length":2,"loop":"loop","snapping":24,
  "tracks":[
    {"target":"body_group","keyframes":[
      {"channel":"position","time":0,"value":[0,0,0]},
      {"channel":"position","time":1,"value":[0,0.5,0],"interpolation":"catmullrom"},
      {"channel":"position","time":2,"value":[0,0,0]}
    ]}
  ]
}
```

Send to `animation.create`. Parameters: `name`, `length` in seconds (0–10000, strictly positive), `loop:once/loop/hold`, `snapping:10..500`, optional `tracks`. The clip is created without replacing other clips or automatically starting playback. Name collisions follow Blockbench's native unique naming; use returned UUID afterward.

Each track has one target UUID or unique name and a nonempty `keyframes` array. Combine all channels of one target in that entry. Channels: `position`, `rotation`, `scale`, only when the target's native animator supports them. Values are finite numeric vectors: position offsets in model units; Euler rotation degrees relative to rest; scale factors (`[1,1,1]` is unchanged). Time is 0–10000 seconds; keys are stored at the requested times rather than quantized to timeline snapping. The clip length expands to include late keyframes.

Interpolation: `linear`, `step`, `catmullrom`, `bezier`. Optional Bezier fields `bezier_left_time`, `bezier_right_time`, `bezier_left_value`, `bezier_right_value` are three-number native handle vectors. Use linear first unless another interpolation is needed, and verify intermediate poses. These endpoints do not accept sound/particle effects, arbitrary scripts or Molang expressions.

Limits: 256 target tracks and 10000 keyframes per request. Duplicate target entries or channel/time pairs are rejected. A failed edit rolls back; new target tracks may remain as empty native animator records, which contain no keys and do not animate geometry.

## Edit and inspect

| Method | Parameters |
|---|---|
| `animation.list` | `{detail?:true}` lists clips |
| `animation.get` | `{id}` returns clip metadata, tracks and keyframe UUIDs |
| `animation.update` | `{id,name?,length?,loop?,snapping?}` |
| `animation.keyframes` | `{id,tracks:[...],replace?:false}` |
| `animation.keyframes.remove` | `{id,keyframes:[keyframe UUIDs]}` |
| `animation.remove` | `{id}` removes the clip from the current model, never deletes an external animation file |

`animation.keyframes` merges by target/channel/time by default; an existing key at that channel/time is replaced. With `replace:true`, only channels present in the incoming track are cleared before the new keys are inserted. Other target/channel data is preserved. Use `history.undo`/`redo` for a whole animation operation.

## Preview and delivery

`animation.preview {id,time}` stops playback, enters Animate mode, selects the clip and evaluates the requested pose. Take a `preview.screenshot` or CLI `screenshot` after it. Inspect the beginning, a middle/extreme pose and loop endpoint. The bridge does not automatically resolve collisions or choose anatomical constraints.

`animation.play {id}` starts timeline playback. `animation.stop {}` pauses at the current time. `animation.rest {}` pauses and returns to Edit mode/rest pose. Preview changes are not modeling undo entries. Stop playback before performing precise geometry editing or collecting comparable screenshots.

Save with `save model.bbmodel` to preserve geometry, textures, rig/weights and clips together. The deliverable should be reopened and checked when animation portability matters. `animation-export clips.json [--id UUID]` writes a Blockbench-native data snapshot for inspection; it is not a Minecraft Bedrock, glTF, FBX, GIF or video exporter. Use the appropriate native Blockbench exporter if a specific engine format is required and verify that format supports the animated object types.

The supplied `assets/robot.json`, `assets/robot-rig.json`, `assets/robot-animation.json` demonstrate: new free project → model batch → rig batch → `animation.create` → preview → save. They use descriptive names and expect a new project without name collisions.
