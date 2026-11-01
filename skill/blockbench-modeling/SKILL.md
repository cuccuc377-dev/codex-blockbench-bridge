---
name: blockbench-modeling
description: Model, texture, rig and animate in Blockbench using cubes, meshes, native editing tools, UVs, paint layers and keyframes. Control tool selection, parameters and dialogs through the local Codex Bridge, with desktop interaction for gestures and custom windows. Use for Blockbench tools and model deliverables, not Blender or Minecraft world maps.
---

# Blockbench modeling

Use the installed `Codex Blockbench Bridge` 1.3+ plugin and this skill's Python client. Resolve paths relative to this `SKILL.md`; `scripts/blockbench.py` and `scripts/primitives.py` have no third-party dependencies (Python 3.10+). If `status` reports an older version, reload the updated plugin from `assets/codex_blockbench_bridge.js` before using new features.

## Connect and inspect

Run `python <skill>/scripts/blockbench.py status`. If discovery fails, run `sessions`. The plugin must be loaded in Blockbench desktop 5.2+, using `assets/codex_blockbench_bridge.js` (File → Plugins → Load Plugin from File). Its native permission prompt requests only `~/.codex/blockbench-bridge`; the user must grant that folder permission. Do not change Blockbench permission storage or expose native APIs to work around denial. The plugin is desktop-only; a plain cloud chat without access to this computer cannot reach it.

If multiple instances are live, use `--session ID` before the subcommand; never guess which document to edit. Read `scene` before editing an existing project. Retain its project UUID and use `--project UUID` before mutations to detect tab changes. Resolve existing targets by UUID; names are accepted only when unique. Read `scene --detail --ids UUID` for mesh vertex/face keys and UVs.

## Work in the background

Leave Blockbench unfocused or minimized when the user wants background work. Version 1.3 uses Node timers for the file queue, heartbeat and plugin timeouts, plus a fallback scheduler for pending scene updates and animation playback when native rendering pauses. `status.background` reports `enabled`, `scheduler`, `visibility`, `focused`, `playing`, `timeline_time` and `last_error`. A hidden window is not a disconnected session.

Prefer structured model, mesh, texture, UV, layer/paint, keyframe, save and export methods. `screenshot` renders the model directly, including while minimized; it does not capture the desktop. Use `animation.preview` at explicit times for reproducible pose checks. Do not focus/restore the app or change its global background-rendering settings merely to send bridge requests.

Viewport mouse gestures (knife, vertex snapping, weight brush), OS file choosers and unsupported custom windows still require foreground interaction. Use equivalent structured operations where appropriate; if a required gesture has no such route, state the specific foreground step. Do not claim every native tool is background-safe merely because it can be selected. Blockbench must remain running and the computer awake; closing the app or suspending Windows stops execution.

## Model

For native tool requests, read [references/native-tools.md](references/native-tools.md) for discovery, context, dialogs, layer/paint and codec APIs, then the relevant category in [references/tool-workflows.md](references/tool-workflows.md). Search [references/tool-coverage.md](references/tool-coverage.md) for labels from the nine reference screenshots. Run `tools "keyword"` and `context` to discover live conditions. Set the correct mode, panel and object/component selection before invoking actions. A disabled action may require another selection or project format; do not bypass its native condition.

Use `native.run` for actions/tools, `native.set` for parameter controls, and returned tokens with `native.dialog`, `native.menu` or `native.amend` for follow-up. Tool selection or action triggering alone does not complete a modeling operation. Inspect the actual geometry, pixels, keyframes or output file. For viewport gestures, OS choosers, inline inputs and unsupported custom windows, use the available `computer-use` skill and its observed-window workflow. If that tool is unavailable, identify the remaining UI step without claiming completion. Permission/login prompts remain with the user. Never add a debugging port or arbitrary code endpoint for normal skill use.

Read [references/api.md](references/api.md) for base operation parameters and coordinate rules. For splines, billboards, armatures/bones, locators, null objects and bounding boxes, read [references/objects.md](references/objects.md). `status` exposes active format capabilities. `free` supports the complete object set; Minecraft Java block format does not support meshes or animation. Preserve an explicitly requested target format and explain any constraint that affects the requested shape. The bridge does not automatically convert formats or validate game-specific export restrictions.

For a new model, run `create "model name" --format free`. This creates a new tab; it does not clear the existing document. Use an appropriately sized texture canvas via `--texture-size WIDTH HEIGHT`.

Write batch parameters as a UTF-8 JSON file, then run `batch <file>`. Avoid inline JSON shell quoting, especially PowerShell. A batch has an `operations` array and optional `label`. Use `ref` on newly created objects and `$ref` for subsequent parent/object references within that batch. Each batch is one undo step, and a failing operation rolls the whole batch back. Keep batches to coherent edits, within the 1000-operation / 16 MB limits. Execute dependent requests sequentially.

Use cubes for rectangular parts and mesh triangles/quads for tapered, curved, or irregular parts. The helper `primitives.py` generates cylinder, cone, and sphere meshes; use `--origin` for placement and `--segments`/`--rings` for deliberate polygon budgets. Its JSON output is the parameter object for `call mesh.add --file <file>`. Refer to `assets/robot.json` for a working mixed model batch.

Mesh coordinates are local to their origin; cube `from`/`to` use the project coordinate system with `origin` as rotation pivot. Group transforms affect children. Faces need consistent outward winding. Inspect the resulting screenshot before assuming geometry is visible. Outliner `color` is a palette index, not a material color.

## Generate and apply textures

Read [references/textures.md](references/textures.md) for generation, painting, UV mapping, atlases and replacement. The plugin can create deterministic solid, checker, noise, wood, brick, metal and gradient patterns with `texture.generate`; draw custom pixel designs with `texture.paint`. These are procedural textures, not an image-generation model.

Use `texture.map` to assign a generated/imported image and map every target face to the texture (or a specified UV rectangle). Use `texture.atlas` when each face needs a separate non-overlapping tile; it creates a PNG, assigns it and sets UVs in one undo step. The atlas uses equal square tiles, so assess stretching and adjust face UVs where needed. Export the image with `texture-export UUID output.png` and inspect it together with the model screenshot.

When the user wants an AI-painted or reference-based bitmap rather than procedural pixels, use an available image generation tool/skill to create a PNG, then import it using `texture image.png` and apply with `texture.map`. For an existing atlas, export it as the edit reference, preserve all tile boundaries/resolution, and use `texture image.png --replace UUID` so assignments and UVs survive. Follow that image tool's requirements; do not invent tool availability, silently invoke a paid API, or label procedural output as AI-generated. If no image-generation tool is available, still complete UV/texture preparation and state that the AI-painting step is unavailable.

## Rig and animate

Read [references/animations.md](references/animations.md). For rigid parts, put each moving part in a group with a deliberate pivot and animate the group. For deforming meshes, create an armature and bones, keep the mesh under the armature, and bind explicit vertex weights with `mesh.bind`. Each vertex must have a positive total weight and no more than four influencing bones; the bridge normalizes supplied weights. Cubes cannot be attached directly to an armature.

Create clips with `animation.create` and target/channel/time/value keyframes. `animation.keyframes` merges keys by default; `replace:true` replaces only channels named in that request. Times are seconds, rotations degrees, position offsets model units, scale factors dimensionless. Use named targets only when unique; returned UUIDs are safer. `assets/robot-rig.json` and `assets/robot-animation.json` can be applied after `assets/robot.json` for a working waving robot.

Check multiple poses with `animation.preview` followed by screenshots. For loops, check the beginning/end seam and intermediate poses; for skinning, inspect deformation rather than just keyframe counts. `animation.play`/`stop` control timeline playback; `animation.rest` returns to model editing. Save the native `.bbmodel` with embedded clips. `animation-export` writes a Blockbench data snapshot, not a game-engine animation format or rendered video.

## Check and deliver

Use `scene` to verify names, counts, hierarchy, and format. Use `call preview.camera --file <camera.json>` plus `screenshot <absolute-path.png>` to inspect at least the useful viewing angle, and additional views when geometry could be hidden. View the returned local image and correct visible issues before delivery. `history.undo` and `history.redo` operate on Blockbench's real history, which may also contain the user's edits.

Save the native editable deliverable with `save <absolute-path.bbmodel>`. This writes a compiled snapshot through the Python client and does not change the current tab's save location or saved flag. Use `--overwrite` only for an output you intend to replace. `save --format obj` produces geometry text only; it does not create MTL or external texture files. Deliver `.bbmodel` for a complete editable textured model. Use `open <absolute-path.bbmodel>` for files with embedded PNG textures; other imports use the native file UI. `export CODEC output --options options.json` supports native format compilers; read `native-tools.md` for embedded assets, binary encoding and companion-file limitations.

The native tool catalog includes publishing, file writing and closing/restarting operations. Pass their `allow_effects` only when the current user task authorizes that specific operation and destination. A request to support those capabilities is not authorization to publish or close existing work. Preserve existing user authorization; do not add redundant permission questions.

On timeout, do not automatically repeat a mutation. The client reports whether a queued request was cancelled or its execution state is unknown. For unknown state, use the provided `result REQUEST_ID` command, then inspect the scene. Error responses are structured and contain a concrete cause; fix the input rather than repeatedly retrying. Stop if the bridge session disappears or the targeted project changes.
