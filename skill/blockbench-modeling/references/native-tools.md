# Native tool API (bridge 1.2+)

Use this when a request names a Blockbench tool, selection, layer, UV operation, filter, or native dialog. Use `call METHOD --file params.json` for the examples below. These operations are individual calls, not modeling `batch` entries.

## Discover and choose context

`tools [Chinese name or ID fragment] [--available] [--limit 100] [--offset 0]` calls `native.list`. Search both localized names and IDs. Results include type, live availability, mode/feature requirements where declarative, current value, options, native range, route and effects. `available:false` means the current selection/mode/format fails the native condition; it does not mean the plugin lacks that tool. Set appropriate context, then query again. A format conversion requires the user's modeling intent to permit that conversion.

`context` calls `native.inspect`: project UUID, mode, selected tool/panel, object/component selection, active texture/layer/clip, selected keys, time, dialogs, menus, operation amendment, and whether an edit is open. For native objects and topology use `scene --detail`; for layers use `layer.list`; for animation keys use `animation.get`.

`context.set` accepts independent optional fields:

| Field | Meaning |
|---|---|
| `mode` | `edit`, `paint`, `animate`, or another currently available mode |
| `ids` | Exact object/group UUIDs; replaces object selection |
| `selection_mode` | Native mesh mode such as `object`, `vertex`, `edge`, `face`, `cluster`; query options |
| `spline_mode` | Native spline mode; query `spline_selection_mode` options |
| `components` | Array of `{id, vertices?, edges?, faces?}` using existing keys from detailed scene |
| `texture` | Texture UUID or unique name |
| `layers` | Layer UUID array belonging to the active texture |
| `animation` | Clip UUID; select animate mode first or in the same call |
| `animator` | Animatable element UUID or `effects` |
| `keyframes` | Keyframe UUID array in the active clip; empty array clears selection |
| `time` | Seconds, nonnegative |
| `panel` | `preview`, `uv`, `outliner`, `textures`, `layers`, `timeline`, or another available panel |

Order is mode → objects → component mode/selection → texture/layers → clip/animator/keys/time → panel. Component owners must already be selected or appear in `ids`. Face selection automatically selects its vertices and edges. Supply `vertices` explicitly to narrow UV vertex selection. For splines use joint/control keys from `scene.get` with `detail:true`. An invalid context call may have changed earlier selection fields; re-inspect before continuing.

```json
{"mode":"edit","ids":["MESH_UUID"],"selection_mode":"face","components":[{"id":"MESH_UUID","faces":["FACE_KEY"]}],"panel":"preview"}
```

## Run and configure real controls

`native.run`: `{id, shift?, ctrl?, alt?, allow_effects?}`. Calls the native Action or selects a Tool. `native.set`: `{id, value, relative?, allow_effects?}`. Supports native toggles (boolean), selects (option ID), numeric sliders and UV rotation sliders. `relative:true` adds a numeric delta to each selected item's old value. Native units/ranges apply: opacity sliders can be 0–100 **or 0–255**, depending on the user's setting; read returned ranges. Structured `layer.update.opacity` and `paint.stroke.opacity` always use 0–100.

Native controls invoke their own undo callbacks. Do not wrap them in modeling batches or try to start another edit while a preview dialog is active. `tool_selected` means the tool is ready; it has not performed a drag, cut or stroke.

Returned statuses:

| Status | Next step |
|---|---|
| `edit_recorded` | Native history changed; inspect the actual geometry/pixels/keys |
| `amendable` | Initial edit exists; inspect and set its post-operation parameters |
| `dialog_open` | Inspect fields; fill/confirm, cancel, or use UI for custom components |
| `menu_open` | Select a leaf using returned menu token/index |
| `tool_selected` | Execute a structured gesture or computer-use workflow |
| `interactive_edit` | Finish the native interaction before sending model mutations |
| `triggered` | Handler ran; completion is unknown. Inspect UI and output, including OS dialogs |

`verification_required:true` always applies. A handler can open a file chooser, schedule asynchronous work, or do nothing. It is not evidence that an output file exists. Re-read the scene, export/read pixels, or inspect the UI/file as appropriate.

## Dialogs, menus and operation amendments

Tokens identify an exact live UI instance. Always use the newest response. Only dialogs/menus/amendments opened by this bridge can be changed through these endpoints. Pre-existing user dialogs, permission/authentication windows and late asynchronous modals use the normal user/UI workflow.

- `native.dialog`: `{token, values?, component?, curves?, action?:"set"|"confirm"|"cancel"|"button", index?}`. `values` maps returned form field IDs to values. Unknown fields and invalid options/ranges are rejected. Files/folders are chosen in the native UI. `button` uses an index from `buttons`. Some fields become visible after another field changes: set controlling fields, inspect again, then continue.
- `native.menu`: `{token, index}` selects a current leaf item. Use `{token,action:"cancel"}` to dismiss. Indexes are not stable across menu instances; submenu leaves appear in the returned list with their own indexes.
- `native.amend`: `{token,values}` changes the native last-operation form (extrude length, solidify thickness, primitive parameters). This replays the last edit through Blockbench's amendment mechanism. `{token,action:"close"}` keeps the edit and dismisses its panel. It is not cancel/undo.

Known custom dialog adapters use `component` instead of `values`:

| Dialog | Fields |
|---|---|
| `adjust_brightness_contrast` | `brightness`, `contrast`: 0–200; neutral 100 |
| `adjust_saturation_hue` | `saturation`, `brightness`: 0–200; `hue`: −180–180 |
| `adjust_opacity` | `mode`: `multiply`/`set`; `opacity_percent`: 0–200; `opacity_value`: 0–255 |
| `adjust_curves` | Use `curves:{rgb?,r?,g?,b?,a?}`; each channel is 2–64 `[x,y]` points in 0–1, increasing x with endpoints x=0 and x=1 |

```json
{"token":"CURRENT_TOKEN","component":{"brightness":120,"contrast":110},"action":"confirm"}
```

Other custom components (animation controller state editor, material editor, predicate editor, flipbook and similar dialogs) require computer-use. Their availability is discovered live; there is no arbitrary Vue property/eval endpoint.

## Native side effects

The installed built-in registry is the allowlist; later extension actions remain discoverable with `route:ui_only`. Some built-in configuration/plugin-management windows also use the UI. `native.list.effects` marks `file_dialog`, `write_file`, `publish`, `close_project`, `external_ui`.

Only pass matching `allow_effects` when the actual user task already authorizes the operation and target. This parameter is an agent-side assertion, not a user consent dialog or a security boundary. A request to support all tools does not itself authorize uploading a model, sharing a link, overwriting a user file or restarting the app. Do not ask again if authorization already covers the exact action. The skill never edits permission stores, invokes shell commands through UI, or bypasses login prompts.

## Layered images and native paint gestures

- `layer.list {texture}`: layer UUIDs, order, groups, active layer, opacity, offsets, scale, visibility, blend mode.
- `layer.add {texture,name?,width?,height?,offset?,data_url?}`: blank or PNG pixel layer. Automatically preserves the existing bitmap as a base layer. Optional PNG must be under 12 MB as a data URL. CLI: `layer-import TEXTURE_UUID image.png --offset 0 0`.
- `layer.update {texture,layer,name?,opacity?,visible?,offset?,scale?,blend_mode?}`: explicit properties, one undo step. Offsets and scale are 2-vectors.
- `layer.export {texture,layer}`: PNG data URL for an individual pixel layer. `texture-export` writes the composited texture.
- `paint.selection {texture,rect:[x,y,width,height]}` selects an integer pixel rectangle; or `{texture,mode:"all"|"none"}`. `none` clears the selection boundary, so unrestricted painting resumes (native behavior).
- `paint.stroke {texture,layer?,tool,points,color?,secondary?,size?,opacity?,softness?,source?,shape?}` uses Blockbench's real pixel tools. `points` are texture pixel coordinates, up to 2048. Supported `tool`: `brush_tool`, `copy_brush`, `fill_tool`, `eraser`, `color_picker`, `draw_shape_tool`, `gradient_tool`. Colors are `#RRGGBB`; opacity/softness 0–100; size 1–512. Select paint mode first. `copy_brush` requires `source:[x,y]`; shape options come from `draw_shape_type`. Native selection masks, active layer, fill mode, blend mode and brush settings apply. Query/set them when relevant. Explicit strokes do not simulate pressure-sensitive 3D surface projection.
- `paint.sample {texture,point:[x,y]}` returns the composite pixel's RGBA bytes; use it to verify color/alpha changes.

Do not use old `texture.paint` on a layered image; use `paint.stroke` or the native layer UI. Weight painting uses the separate armature/weight workflow.

## Files and codec output

`open model.bbmodel` transfers a parsed model into a new tab; PNG textures must be embedded. Other formats use the native import dialogs with computer-use. Do not silently change the requested format.

`call codec.list` lists available codecs, options and whether the bridge supports compiling their output. `export CODEC output --options options.json` writes a compiled snapshot, with the same safe overwrite rule as `save`. Common codec IDs: `project`, `obj`, `gltf`, `fbx`, `collada`, `stl`. Game-specific codecs use their native format conditions. `codec.export {id,options?}` returns UTF-8 or base64 data. `.glb` uses `gltf` with `{"encoding":"binary"}`; STL supports `ascii` and `binary`.

Structured glTF/FBX exports embed textures; native UI handles separate texture packages. OBJ/Collada structured exports are a geometry/document file without companion material/texture files. Use native export UI for a complete OBJ/MTL/image bundle. Read and verify the actual resulting files; game-specific import/export paths have not all been tested.
