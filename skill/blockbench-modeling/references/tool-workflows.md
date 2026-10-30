# Using the screenshot tools

Read `native-tools.md` for request schemas. Search `tool-coverage.md` (human-readable) or `tool-catalog.json` (machine-readable) for a screenshot label and its exact ID; do not load the entire catalog by default. The catalog covers 336 visible rows across the nine reference images, including repeated items. Live `tools` results override the snapshot.

## Mesh, spline, rig and object editing

Prepare edit mode, target UUIDs, component mode and panel. Use `scene --detail` to identify keys before operating.

- Transforms: `slider_pos_x/y/z`, `slider_size_x/y/z`, `slider_rotation_x/y/z`, `slider_origin_x/y/z`, `slider_inflate`, `slider_stretch_x/y/z`. Set `transform_space`, `rotation_space`, `transform_pivot_space` deliberately when relevant. Quarter turns, flips, centering, nudge, pivot centering and visibility/lock/export/shade are native actions/toggles; inspect geometry after them. Proportional editing affects nearby vertices; inspect its range before using sliders on mesh selections.
- Topology: `extrude_mesh_selection`, `solidify_mesh_selection`, `inset_mesh_selection`, `loop_cut` may create a last-operation amendment. Read it and set distance/thickness/segments; do not assume triggering uses the requested values. `merge_vertices` opens a submenu; choose a returned leaf (`merge_all_in_center`, distance variants, etc.) and amend distance if offered. `merge_meshes` needs multiple meshes; split/dissolve/fold need a valid selected face/edge region. Save a native snapshot before a large conversion that loses structure.
- Splines: select joint/control vertices and `spline_selection_mode`; extrusion, merging, subdivision, splitting and applying rotation use `extrude_spline_selection`, `merge_splines`, `divide_spline_curve`, `split_spline`, `apply_spline_rotation`. Compare spline joints/curves and final rendered shape.
- Skinning: `mesh.bind` provides deterministic explicit weights. Native `calculate_vertex_weights` and `set_vertex_weights` use selected armature/mesh/bones and their dialogs. The `weight_brush` is a viewport gesture; configure size/limit/xray/blend mode through native controls, paint with computer-use, then inspect saved weights and deform a test pose. Native automatic weighting is exposed but not exhaustively tested.
- Helpers: creation wrappers are documented in `objects.md`; native actions also expose texture meshes, bounding shape generation, billboards, IK target/root/pole. Use the target game's format for collision/hitbox generation, Bedrock multiblock slicing and attachables; inspect output dimensions and exported data.
- Outliner: prefer explicit `element.update`, `element.remove`, parent UUIDs and `selection.set` for repeatable changes. Native group/resolve/sort/rename/copy/cut/paste/search/color/binding/material actions remain available. Search and inline rename fields use the UI when they are not a native form. Clipboard actions depend on active panel and current clipboard type; inspect context first.

## UV, textures and layers

For UV edits select the element(s), face keys and optionally shared vertex keys, set `panel:"uv"` and edit mode. Use `cube_uv_mode` when switching box/per-face UV. Automatic mapping, projection, maximize, mirror, rotate, connect faces, merge UV vertices, pixel snap, cycling and culling operate on that selection. Do not infer UV changes from a toolbar highlight; read face UVs and inspect the model texture.

Seams: choose edge mode and edges, set `select_seam` to an available native option, or use `seam_tool` on visible edges. Use native texture-template generation when islands should be packed according to seams; `create_texture`/`append_to_template` dialogs expose rearrangement, polygon combination, angle and padding options according to format. `texture.atlas` remains a deterministic equal-tile alternative.

Painting: choose texture, layer and paint mode; use `paint.stroke` for texture-space operations. Configure native brush shape, clone mode, fill mode, blending, lock-alpha and mirror painting according to the request. Use `paint.selection` for rectangular masks; lasso/irregular selections use the selection tool UI. For surface-based painting use the viewport UI and inspect multiple angles.

Layers: `layer.list` → select UUIDs using `context.set.layers` → native `create_layer_group`, `resolve_layer_group`, `layer_to_texture_size`, `merge_layer_down`, `crop_layer_to_selection`. Cropping requires a nonempty pixel selection. `layer-import` handles PNG input without a file picker. `layer.update` sets position/opacity/scale/visibility; groups and stack reordering use native UI as needed. Disabling layers flattens the composite; confirm that flattening is appropriate to the requested work before using it.

Adjustments: invert, flips, rotations, unused-pixel cleanup, palette restriction and channel splitting use native actions. Brightness/contrast, hue/saturation, opacity and curves have dedicated `native.dialog` adapters. Resize/crop operate on pixel dimensions; verify UV alignment and image dimensions afterward. Dynamic texture frame, FPS and flipbook controls use native UI/forms, with playback checked in the model. PBR map generation uses native material groups and `generate_pbr_map`; inspect the output map and material channel assignments. This is not semantic AI texture generation; the AI workflow is in `SKILL.md`.

## Animation and timeline

Read `animations.md` to create reliable clips/keys. Set animate mode, clip UUID, target animator, selected keyframe UUIDs and playhead time with `context.set`; use the timeline panel. Native actions expose key insertion/reset/rounding/reversal, interpolation and Bezier linking, graph controls, keyframe column/range selection, timeline ranges, playback speed, markers and timeline presets.

Length changes and retiming are different: `slider_animation_length` changes the clip duration; `change_animation_speed` retimes keys through its native dialog. Merging, optimizing, flipping and retargeting clips operate on the currently selected clip and native dialog selections. Inspect track targets, key times and beginning/intermediate/end poses after changes. IK baking must be checked on the resulting curves, not just the baked flag. For pose baking, inspect the model in edit mode.

Use `context.set.animator:"effects"` for effect keys or `select_effect_animator`. Controllers/states, variables, preset mapping, blend mode, animation group management and custom keyframe effect fields use native action plus native UI where a custom component is returned. Controller support is format-dependent; preserve that restriction. Never report a full controller workflow tested merely because its creation action is registered.

## Native UI and pointer tools

When a step requires a viewport gesture, inline input, custom Vue component or OS file chooser, use the installed `computer-use` skill and its supported runtime. Read that skill and its required guidance. Do not add a production debugging port, execute arbitrary JavaScript in Blockbench, or invent mouse coordinates from a model-space vector.

Select the unique returned Blockbench window belonging to the intended session/project. Observe it, then act using current screenshot or accessibility data and refresh after the action. If an app permission/login prompt appears, leave it to the user. If multiple windows cannot be associated with the session, clarify instead of guessing.

Tool-specific gestures:

- Move/resize/rotate/pivot/stretch: select target and tool through the bridge. For exact values use numeric controls; for a requested drag, observe the visible gizmo axis/handle, drag, then check numeric transforms.
- Vertex snap: select the source object/vertices and snap mode; click the visible source and destination according to the tool hints. Verify coincident world positions.
- Knife/loop cutting: select the mesh, choose `knife_tool`, observe the edge/face, place cut points, and complete using the native tool's on-screen controls. Check new vertex/edge/face counts and resulting topology, then undo/revise if the cut is wrong.
- Seam tool: click the intended visible edge and verify seam data/UV result. Weight brush: paint on the target mesh while the intended bone is selected, then verify weights and deformed pose.
- Pan: drag the editor/view canvas; verify the view changed without moving geometry. Move layer: select the pixel layer, drag in the texture editor, then read its offset.
- Freehand paint, clone, fill, erase, eyedropper, shape, gradient and irregular selection: choose active texture/layer, observe the correct canvas, execute the gesture, inspect resulting pixels/selection. Prefer structured texture-space strokes when they express the requested result.

The tool coverage file explicitly distinguishes inspected registration from tested behavior. If computer-use is unavailable, complete the structured portion and name the remaining gesture/custom dialog; do not call a selected tool a completed operation.

## Files, formats and utility windows

For `.bbmodel`, use `open`/`save`; for supported single-document codecs use `codec.list`/`export`. Native file dialogs handle OBJ+MTL import, Java/Bedrock/Optifine/skin/image imports and full export bundles. Use the actual requested absolute destination in the chooser. Verify that files exist and contain the expected model/texture/animation data. Native format conversion can discard unsupported data; inspect source capabilities and preserve a native copy when material.

New window, backups, model issue validator, project options, tab switching/closing/duplicating, developer tools and experimental settings have native or UI routes in the catalog. Use only utilities that serve the task. Close/restart only when the current task authorizes it and existing work has been saved appropriately. Upload to Sketchfab/share are external publication, requiring the requested model and destination; the capability inventory does not authorize publishing. Permission/login dialogs and app security settings are not automated.
