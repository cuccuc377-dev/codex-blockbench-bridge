"""Generate the audited built-in registry and screenshot coverage from a runtime inventory.
Run tools/inventory.mjs against the isolated local Blockbench before updating this file.
"""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
groups = {
    "01 对象和编辑": "proportional_editing proportional_editing_range slider_weight_brush_size slider_weight_brush_limit weight_brush_xray weight_brush_blend_mode rename delete duplicate copy cut paste outliner_toggle search_outliner move_to_group sort_outliner unlock_everything element_colors select_window randomize_marker_colors undo redo edit_history search_animations add_group group_elements collapse_groups unfold_groups edit_bedrock_binding add_cube edit_material_instances element_render_order cube_light_emission add_billboard vertex_snap_mode add_bounding_box convert_texture_mesh_to_cubes add_texture_mesh add_armature_bone add_armature add_locator add_null_object set_ik_target set_ik_source set_ik_pole add_mesh merge_vertices merge_meshes split_mesh convert_to_mesh apply_mesh_rotation switch_face_crease solidify_mesh_selection dissolve_edges allow_element_mirror_modeling apply_mirror_modeling add_spline extrude_spline_selection apply_spline_rotation merge_splines divide_spline_curve split_spline generate_voxel_shapes find_replace search_textures toggle_skin_layer convert_minecraft_skin_variant explode_skin_model",
    "02 其他操作": "set_vertex_weights add_element cube_counter experimental_settings set_element_marker_color open_dev_tools resolve_group remove_blank_faces auto_set_cullfaces calculate_vertex_weights select_seam apply_texture_to_elements refresh_texture gui_light shelf_alignment apply_animation_preset save_animation_preset timeline_setups save_timeline_setup share_model import_bedrock_attachable slice_bedrock_multiblock",
    "03 交互工具": "weight_brush move_tool resize_tool rotate_tool pivot_tool vertex_snap_tool stretch_tool swap_tools knife_tool seam_tool pan_tool brush_tool copy_brush fill_tool eraser color_picker draw_shape_tool gradient_tool selection_tool move_layer_tool predicate_overrides",
    "04 文件与格式": "new_window open_model_folder reload view_backups validator_window extrude_texture open_model open_from_link export_over import_obj project_window close_project close_other_projects close_projects_to_right duplicate_project convert_project switch_tabs tab_overview upload_sketchfab save_project save_project_incremental save_project_as export_legacy_project import_project export_blockmodel import_java_block_model export_bedrock_voxel_shape import_bedrock_voxel_shape generate_bedrock_block_box generate_bedrock_entity_box export_bedrock export_entity export_obj export_gltf export_fbx export_collada export_stl export_class_entity export_modded_animations export_optifine_full export_optifine_part import_optifine_part export_minecraft_skin export_image",
    "05 动画": "slider_animation_length set_animation_end add_animation create_animation_group load_animation_file export_animation_file save_all_animations bake_ik_animation bake_animation_into_model change_animation_speed merge_animation optimize_animation retarget_animators bedrock_animation_mode flip_animation copy_animation_pose create_variable_placeholder view_built_in_variables add_keyframe previous_keyframe next_keyframe slider_keyframe_time keyframe_uniform keyframe_bezier_linked keyframe_interpolation reset_keyframe reset_keyframe_handles round_keyframe_values resolve_keyframe_expressions reverse_keyframes keyframe_column_create keyframe_column_select keyframe_select_before_playhead keyframe_select_after_playhead timeline_graph_editor graph_editor_other_graphs graph_editor_include_other_graphs graph_editor_zero_line play_animation looped_animation_playback slider_animation_speed jump_to_timeline_start jump_to_timeline_end timeline_frame_back timeline_frame_forth set_timeline_range_start set_timeline_range_end disable_timeline_range bring_up_all_animations add_all_to_timeline fold_all_animations clear_timeline select_effect_animator timeline_focus add_marker timeline_setups save_timeline_setup add_animation_controller add_animation_controller_state",
    "06 纹理": "extrude_texture_to_model import_texture create_texture append_to_template save_textures change_textures_folder create_texture_group create_material generate_pbr_map animated_textures animated_texture_frame animated_texture_fps animated_texture_editor invert_colors adjust_brightness_contrast adjust_saturation_hue adjust_curves adjust_opacity limit_to_palette split_rgb_into_layers split_alpha_into_layer clear_unused_texture_space flip_texture_x flip_texture_y rotate_texture_cw rotate_texture_ccw resize_texture crop_texture_to_selection",
    "07 UV": "cube_uv_mode uv_rotation uv_grid uv_maximize uv_turn_mapping uv_auto uv_project_from_view uv_rel_auto uv_mirror_x uv_mirror_y uv_rotate_left uv_rotate_right uv_transparent uv_reset uv_apply_all cullface auto_cullface face_tint slider_face_tint move_uv_to_cursor merge_uv_vertices connect_uv_faces snap_uv_to_pixels uv_cycle uv_cycle_invert edit_mode_uv_overlay paint_mode_uv_overlay move_texture_with_uv",
    "08 变换": "slider_pos_x slider_pos_y slider_pos_z position_slider_per_element slider_size_x slider_size_y slider_size_z slider_inflate slider_stretch_x slider_stretch_y slider_stretch_z slider_rotation_x slider_rotation_y slider_rotation_z origin_slider_direct_values slider_origin_x slider_origin_y slider_origin_z rotate_x_cw rotate_x_ccw rotate_y_cw rotate_y_ccw rotate_z_cw rotate_z_ccw flip_x flip_y flip_z flip_in_place_x flip_in_place_y flip_in_place_z center_x center_y center_z center_lateral move_up move_down move_left move_right move_forth move_back toggle_visibility toggle_locked toggle_export toggle_autouv toggle_shade toggle_mirror_uv update_autouv toggle_stretch_linked origin_to_geometry center_individual_pivots bone_reset_toggle scale move_keyframe_back move_keyframe_forth move_graph_keyframes_up move_graph_keyframes_down",
    "09 图层": "create_empty_layer import_layer create_layer_group resolve_layer_group enable_texture_layers disable_texture_layers layer_opacity layer_to_texture_size merge_layer_down crop_layer_to_selection",
}
ui_only = set("load_plugin load_plugin_from_url install_plugins_from_list add_plugin remove_plugin reload_plugins plugins_window settings_window import_settings experimental_settings edit_session action_control".split())
effects = {
    "publish": set("upload_sketchfab share_model".split()),
    "close_project": set("close_project close_other_projects close_projects_to_right reload".split()),
    "file_dialog": set("open_model import_obj import_project load_animation_file import_texture import_layer import_java_block_model import_bedrock_voxel_shape import_optifine_part import_bedrock_attachable import_keymap import_theme import_palette".split()),
    "write_file": set("export_over save_project save_project_incremental save_project_as export_legacy_project export_blockmodel export_bedrock_voxel_shape export_bedrock export_entity export_obj export_gltf export_fbx export_collada export_stl export_class_entity export_modded_animations export_optifine_full export_optifine_part export_minecraft_skin export_image save_textures save_all_animations export_animation_file change_textures_folder export_theme export_keymap export_settings export_palette".split()),
    "external_ui": set("new_window open_model_folder open_dev_tools open_from_link load_on_bedrock_player".split()),
}
rows = json.loads((root / "artifacts/native-actions.json").read_text(encoding="utf-8"))
by_id = {r["id"]: r for r in rows}
catalog = {r["id"]: {"effects": [e for e, ids in effects.items() if r["id"] in ids]} for r in rows if r["id"] not in ui_only}
(root / "src/native_catalog.js").write_text("// Built-in IDs audited against Blockbench 5.2.2. Extension actions remain discoverable, UI only.\nconst NATIVE_TOOL_CATALOG = " + json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
test_file = root / "artifacts/native-test.json"
tested = set(json.loads(test_file.read_text(encoding="utf-8")).get("tested_actions", [])) if test_file.exists() else set()
lines = ["# 截图工具覆盖清单", "", "对应用户提供的九张截图，核对版本 Blockbench 5.2.2（2026-10-30）。", "", "`原生入口` 表示桥接可调用真实控件，**不表示全部操作已逐项验证完成**。`实测`只标记真实应用测试确认过结果的条目。弹窗、子菜单、操作后参数可通过 native.dialog/menu/amend 继续；自定义组件、文件选择器和视口手势使用 computer-use。运行时的模式/格式/选区条件始终优先。", "", "上传/分享、文件读写、关闭项目等能力保留原生入口并标注副作用；只有当前用户任务已要求相应操作时才传 allow_effects。权限、登录与插件管理使用用户界面流程。", ""]
coverage=[]
for group, ids in groups.items():
    lines += ["## " + group, "", "| 截图名称 | 原生 ID | 调用路径 | 验证 |", "|---|---|---|---|"]
    for id in ids.split():
        if id not in by_id: raise RuntimeError("Missing screenshot tool: " + id)
        row=by_id[id]
        path = "UI 流程" if id in ui_only else "参数 native.set" if row["type"] in ("toggle", "numslider", "select", "slider") else "选工具 + 手势/结构化接口" if row["type"] == "tool" else "只读显示" if row["type"] == "text" else "原生入口 native.run"
        ef=[e for e, ids2 in effects.items() if id in ids2]
        if ef: path += "；" + ", ".join(ef)
        status="实测" if id in tested else "未逐项实测"
        lines.append(f'| {row["name"]} | `{id}` | {path} | {status} |')
        coverage.append({"screenshot":group,"id":id,"name":row["name"],"route":path,"tested":id in tested})
    lines.append("")
(root / "skill/blockbench-modeling/references/tool-coverage.md").write_text("\n".join(lines), encoding="utf-8")
(root / "skill/blockbench-modeling/references/tool-catalog.json").write_text(json.dumps(coverage,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"{len(rows)} discovered, {len(catalog)} native routes, {len(coverage)} screenshot rows, {len(tested)} tested actions")
