# 截图工具覆盖清单

对应用户提供的九张截图，核对版本 Blockbench 5.2.2（2026-10-30）。

`原生入口` 表示桥接可调用真实控件，**不表示全部操作已逐项验证完成**。`实测`只标记真实应用测试确认过结果的条目。弹窗、子菜单、操作后参数可通过 native.dialog/menu/amend 继续；自定义组件、文件选择器和视口手势使用 computer-use。运行时的模式/格式/选区条件始终优先。

上传/分享、文件读写、关闭项目等能力保留原生入口并标注副作用；只有当前用户任务已要求相应操作时才传 allow_effects。权限、登录与插件管理使用用户界面流程。

## 01 对象和编辑

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| 衰减编辑 | `proportional_editing` | 参数 native.set | 未逐项实测 |
| 等比例编辑范围 | `proportional_editing_range` | 参数 native.set | 未逐项实测 |
| 权重画笔大小 | `slider_weight_brush_size` | 参数 native.set | 未逐项实测 |
| 权重画笔限制 | `slider_weight_brush_limit` | 参数 native.set | 未逐项实测 |
| 权重画笔 X 光模式 | `weight_brush_xray` | 参数 native.set | 未逐项实测 |
| 权重画笔混合模式 | `weight_brush_blend_mode` | 参数 native.set | 未逐项实测 |
| 重命名 | `rename` | 原生入口 native.run | 未逐项实测 |
| 删除 | `delete` | 原生入口 native.run | 未逐项实测 |
| 复制元素 | `duplicate` | 原生入口 native.run | 未逐项实测 |
| 复制 | `copy` | 原生入口 native.run | 未逐项实测 |
| 剪切 | `cut` | 原生入口 native.run | 未逐项实测 |
| 粘贴 | `paste` | 原生入口 native.run | 未逐项实测 |
| 显示更多选项 | `outliner_toggle` | 参数 native.set | 未逐项实测 |
| 搜索大纲 | `search_outliner` | 参数 native.set | 未逐项实测 |
| 移动至 | `move_to_group` | 原生入口 native.run | 未逐项实测 |
| 大纲排序 | `sort_outliner` | 原生入口 native.run | 未逐项实测 |
| 解锁全部 | `unlock_everything` | 原生入口 native.run | 未逐项实测 |
| 大纲颜色 | `element_colors` | 参数 native.set | 未逐项实测 |
| 选择... | `select_window` | 原生入口 native.run | 未逐项实测 |
| 随机化颜色标记 | `randomize_marker_colors` | 原生入口 native.run | 未逐项实测 |
| 撤销 | `undo` | 原生入口 native.run | 未逐项实测 |
| 重做 | `redo` | 原生入口 native.run | 未逐项实测 |
| 编辑历史... | `edit_history` | 原生入口 native.run | 未逐项实测 |
| 搜索动画 | `search_animations` | 参数 native.set | 未逐项实测 |
| 添加分组 | `add_group` | 原生入口 native.run | 未逐项实测 |
| 分组元素 | `group_elements` | 原生入口 native.run | 未逐项实测 |
| 折叠分组 | `collapse_groups` | 原生入口 native.run | 未逐项实测 |
| 展开所有分组 | `unfold_groups` | 原生入口 native.run | 未逐项实测 |
| 编辑绑定... | `edit_bedrock_binding` | 原生入口 native.run | 未逐项实测 |
| 添加块 | `add_cube` | 原生入口 native.run | 未逐项实测 |
| 编辑材质实例 | `edit_material_instances` | 原生入口 native.run | 未逐项实测 |
| 透明度渲染顺序 | `element_render_order` | 参数 native.set | 未逐项实测 |
| 发光 | `cube_light_emission` | 参数 native.set | 未逐项实测 |
| 添加 Billboard | `add_billboard` | 原生入口 native.run | 未逐项实测 |
| 捕捉模式 | `vertex_snap_mode` | 参数 native.set | 未逐项实测 |
| 添加包围盒 | `add_bounding_box` | 原生入口 native.run | 未逐项实测 |
| Convert to Extruded Model | `convert_texture_mesh_to_cubes` | 原生入口 native.run | 未逐项实测 |
| 添加纹理网格 | `add_texture_mesh` | 原生入口 native.run | 未逐项实测 |
| 添加骨骼 | `add_armature_bone` | 原生入口 native.run | 未逐项实测 |
| 添加骨架 | `add_armature` | 原生入口 native.run | 未逐项实测 |
| 添加定位器 | `add_locator` | 原生入口 native.run | 未逐项实测 |
| 添加空目标 | `add_null_object` | 原生入口 native.run | 未逐项实测 |
| 设置 IK 目标 | `set_ik_target` | 原生入口 native.run | 未逐项实测 |
| 设定 IK 根 | `set_ik_source` | 原生入口 native.run | 未逐项实测 |
| Set IK Pole | `set_ik_pole` | 原生入口 native.run | 未逐项实测 |
| 添加网格 | `add_mesh` | 原生入口 native.run | 实测 |
| 合并顶点 | `merge_vertices` | 原生入口 native.run | 实测 |
| 合并网格 | `merge_meshes` | 原生入口 native.run | 未逐项实测 |
| 分割网格 | `split_mesh` | 原生入口 native.run | 未逐项实测 |
| 转换成网格 | `convert_to_mesh` | 原生入口 native.run | 实测 |
| 应用旋转 | `apply_mesh_rotation` | 原生入口 native.run | 未逐项实测 |
| 切换面折叠 | `switch_face_crease` | 原生入口 native.run | 未逐项实测 |
| 固化面 | `solidify_mesh_selection` | 原生入口 native.run | 未逐项实测 |
| 溶解边 | `dissolve_edges` | 原生入口 native.run | 未逐项实测 |
| 启用镜像编辑模式 | `allow_element_mirror_modeling` | 参数 native.set | 未逐项实测 |
| 应用镜像建模 | `apply_mirror_modeling` | 原生入口 native.run | 未逐项实测 |
| 添加样条 | `add_spline` | 原生入口 native.run | 未逐项实测 |
| 挤出样条 | `extrude_spline_selection` | 原生入口 native.run | 未逐项实测 |
| 应用旋转 | `apply_spline_rotation` | 原生入口 native.run | 未逐项实测 |
| 合并样条 | `merge_splines` | 原生入口 native.run | 未逐项实测 |
| 细分样条段 | `divide_spline_curve` | 原生入口 native.run | 未逐项实测 |
| 拆分样条 | `split_spline` | 原生入口 native.run | 未逐项实测 |
| Generate Bounding Boxes | `generate_voxel_shapes` | 原生入口 native.run | 未逐项实测 |
| 查找/替换... | `find_replace` | 原生入口 native.run | 未逐项实测 |
| 搜索纹理 | `search_textures` | 参数 native.set | 未逐项实测 |
| 切换皮肤叠层 | `toggle_skin_layer` | 原生入口 native.run | 未逐项实测 |
| 转换细臂/宽臂皮肤 | `convert_minecraft_skin_variant` | 原生入口 native.run | 未逐项实测 |
| 皮肤模型分解视图 | `explode_skin_model` | 参数 native.set | 未逐项实测 |

## 02 其他操作

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| 设置顶点权重 | `set_vertex_weights` | 原生入口 native.run | 未逐项实测 |
| 添加元素 | `add_element` | 原生入口 native.run | 未逐项实测 |
| 模型统计 | `cube_counter` | 原生入口 native.run | 未逐项实测 |
| Experimental Settings | `experimental_settings` | UI 流程 | 未逐项实测 |
| 颜色标记 | `set_element_marker_color` | 原生入口 native.run | 未逐项实测 |
| 打开开发工具 | `open_dev_tools` | 原生入口 native.run；external_ui | 未逐项实测 |
| 解析分组 | `resolve_group` | 原生入口 native.run | 未逐项实测 |
| 移除空白面 | `remove_blank_faces` | 原生入口 native.run | 未逐项实测 |
| 设置自动剔除面 | `auto_set_cullfaces` | 原生入口 native.run | 未逐项实测 |
| 计算顶点权重 | `calculate_vertex_weights` | 原生入口 native.run | 未逐项实测 |
| 选择 UV 接缝 | `select_seam` | 参数 native.set | 未逐项实测 |
| 应用纹理到元素 | `apply_texture_to_elements` | 原生入口 native.run | 未逐项实测 |
| 刷新纹理 | `refresh_texture` | 原生入口 native.run | 未逐项实测 |
| GUI 光照 | `gui_light` | 参数 native.set | 未逐项实测 |
| 工具架对齐 | `shelf_alignment` | 参数 native.set | 未逐项实测 |
| 应用动画映射 | `apply_animation_preset` | 原生入口 native.run | 未逐项实测 |
| 保存动画预设... | `save_animation_preset` | 原生入口 native.run | 未逐项实测 |
| 时间线设置 | `timeline_setups` | 原生入口 native.run | 未逐项实测 |
| 保存时间线设置... | `save_timeline_setup` | 原生入口 native.run | 未逐项实测 |
| 分享... | `share_model` | 原生入口 native.run；publish | 未逐项实测 |
| Import Bedrock Attachable | `import_bedrock_attachable` | 原生入口 native.run；file_dialog | 未逐项实测 |
| Slice Bedrock Multiblock | `slice_bedrock_multiblock` | 原生入口 native.run | 未逐项实测 |

## 03 交互工具

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| 权重画笔 | `weight_brush` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 移动 | `move_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 调整大小 | `resize_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 旋转 | `rotate_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 枢轴工具 | `pivot_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 顶点捕捉 | `vertex_snap_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 拉伸 | `stretch_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 交换工具 | `swap_tools` | 原生入口 native.run | 未逐项实测 |
| 刀具工具 | `knife_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 缝隙连接工具 | `seam_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 平移工具 | `pan_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 画笔 | `brush_tool` | 选工具 + 手势/结构化接口 | 实测 |
| 复制画笔 | `copy_brush` | 选工具 + 手势/结构化接口 | 实测 |
| 油漆桶 | `fill_tool` | 选工具 + 手势/结构化接口 | 实测 |
| 橡皮擦 | `eraser` | 选工具 + 手势/结构化接口 | 实测 |
| 拾色器 | `color_picker` | 选工具 + 手势/结构化接口 | 实测 |
| 绘制形状 | `draw_shape_tool` | 选工具 + 手势/结构化接口 | 实测 |
| 渐变工具 | `gradient_tool` | 选工具 + 手势/结构化接口 | 实测 |
| 选区工具 | `selection_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 移动图层 | `move_layer_tool` | 选工具 + 手势/结构化接口 | 未逐项实测 |
| 编辑谓词覆写... | `predicate_overrides` | 原生入口 native.run | 未逐项实测 |

## 04 文件与格式

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| 新窗口 | `new_window` | 原生入口 native.run；external_ui | 未逐项实测 |
| 打开模型文件夹 | `open_model_folder` | 原生入口 native.run；external_ui | 未逐项实测 |
| 重启 Blockbench | `reload` | 原生入口 native.run；close_project | 未逐项实测 |
| 查看备份 | `view_backups` | 原生入口 native.run | 未逐项实测 |
| 查看模型问题... | `validator_window` | 原生入口 native.run | 未逐项实测 |
| 拉伸纹理 | `extrude_texture` | 原生入口 native.run | 未逐项实测 |
| 打开模型 | `open_model` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 从链接打开模型... | `open_from_link` | 原生入口 native.run；external_ui | 未逐项实测 |
| 保存模型 | `export_over` | 原生入口 native.run；write_file | 未逐项实测 |
| 导入 OBJ 模型 | `import_obj` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 项目... | `project_window` | 原生入口 native.run | 未逐项实测 |
| 关闭项目 | `close_project` | 原生入口 native.run；close_project | 未逐项实测 |
| Close Other Tabs | `close_other_projects` | 原生入口 native.run；close_project | 未逐项实测 |
| Close Tabs to the Right | `close_projects_to_right` | 原生入口 native.run；close_project | 未逐项实测 |
| 复制项目 | `duplicate_project` | 原生入口 native.run | 未逐项实测 |
| 转换项目 | `convert_project` | 原生入口 native.run | 未逐项实测 |
| 切换选项卡 | `switch_tabs` | 原生入口 native.run | 未逐项实测 |
| 标签页总览 | `tab_overview` | 原生入口 native.run | 未逐项实测 |
| 上传到 Sketchfab... | `upload_sketchfab` | 原生入口 native.run；publish | 未逐项实测 |
| 保存项目 | `save_project` | 原生入口 native.run；write_file | 未逐项实测 |
| 增量保存项目 | `save_project_incremental` | 原生入口 native.run；write_file | 未逐项实测 |
| 另存为项目 | `save_project_as` | 原生入口 native.run；write_file | 未逐项实测 |
| Export Legacy Project | `export_legacy_project` | 原生入口 native.run；write_file | 未逐项实测 |
| 导入项目 | `import_project` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 导出方块/物品模型 | `export_blockmodel` | 原生入口 native.run；write_file | 未逐项实测 |
| 添加 Java 版方块/物品模型 | `import_java_block_model` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 导出 Bedrock 版体素形状 | `export_bedrock_voxel_shape` | 原生入口 native.run；write_file | 未逐项实测 |
| 导入 Bedrock 版体素形状 | `import_bedrock_voxel_shape` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 复制碰撞/选择框组件 | `generate_bedrock_block_box` | 原生入口 native.run | 未逐项实测 |
| 复制碰撞/命中箱组件 | `generate_bedrock_entity_box` | 原生入口 native.run | 未逐项实测 |
| 导出 Bedrock 版几何 | `export_bedrock` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出 Bedrock 版实体 | `export_entity` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出 OBJ 模型 | `export_obj` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出 glTF 模型 | `export_gltf` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出 FBX 模型 | `export_fbx` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出 Collada 模型（dae） | `export_collada` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出为 STL | `export_stl` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出为 Java 版实体 | `export_class_entity` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出模组实体动画 | `export_modded_animations` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出 OptiFine JEM | `export_optifine_full` | 原生入口 native.run；write_file | 未逐项实测 |
| Export OptiFine Part | `export_optifine_part` | 原生入口 native.run；write_file | 未逐项实测 |
| 导入 OptiFine 部件 | `import_optifine_part` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 导出 Minecraft 皮肤 | `export_minecraft_skin` | 原生入口 native.run；write_file | 未逐项实测 |
| 导出图像 | `export_image` | 原生入口 native.run；write_file | 未逐项实测 |

## 05 动画

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| 动画长度 | `slider_animation_length` | 参数 native.set | 实测 |
| 设置动画结束点 | `set_animation_end` | 原生入口 native.run | 未逐项实测 |
| 添加动画 | `add_animation` | 原生入口 native.run | 未逐项实测 |
| 创建动画组 | `create_animation_group` | 原生入口 native.run | 未逐项实测 |
| 导入动画文件 | `load_animation_file` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 导出动画... | `export_animation_file` | 原生入口 native.run；write_file | 未逐项实测 |
| 保存所有动画 | `save_all_animations` | 原生入口 native.run；write_file | 未逐项实测 |
| 烘焙反向运动 | `bake_ik_animation` | 原生入口 native.run | 未逐项实测 |
| 烘焙动画姿态到模型 | `bake_animation_into_model` | 原生入口 native.run | 未逐项实测 |
| 更改动画速度... | `change_animation_speed` | 原生入口 native.run | 未逐项实测 |
| 合并动画 | `merge_animation` | 原生入口 native.run | 未逐项实测 |
| 优化动画 | `optimize_animation` | 原生入口 native.run | 未逐项实测 |
| 重新定位动画 | `retarget_animators` | 原生入口 native.run | 未逐项实测 |
| Bedrock 版动画模式 | `bedrock_animation_mode` | 参数 native.set | 未逐项实测 |
| 翻转动画 | `flip_animation` | 原生入口 native.run | 未逐项实测 |
| 复制动画姿态 | `copy_animation_pose` | 原生入口 native.run | 未逐项实测 |
| Create Variable Placeholder | `create_variable_placeholder` | 原生入口 native.run | 未逐项实测 |
| View Built-in Variables | `view_built_in_variables` | 原生入口 native.run | 未逐项实测 |
| 添加关键帧 | `add_keyframe` | 原生入口 native.run | 未逐项实测 |
| 上一个关键帧 | `previous_keyframe` | 原生入口 native.run | 未逐项实测 |
| 下一个关键帧 | `next_keyframe` | 原生入口 native.run | 未逐项实测 |
| 时间码 | `slider_keyframe_time` | 参数 native.set | 未逐项实测 |
| 均匀缩放 | `keyframe_uniform` | 参数 native.set | 未逐项实测 |
| 连接贝塞尔手柄 | `keyframe_bezier_linked` | 参数 native.set | 未逐项实测 |
| 插值 | `keyframe_interpolation` | 参数 native.set | 实测 |
| 重置关键帧 | `reset_keyframe` | 原生入口 native.run | 未逐项实测 |
| 重置关键帧手柄 | `reset_keyframe_handles` | 原生入口 native.run | 未逐项实测 |
| 取整关键帧值 | `round_keyframe_values` | 原生入口 native.run | 实测 |
| 解析关键帧 | `resolve_keyframe_expressions` | 原生入口 native.run | 未逐项实测 |
| 反转关键帧 | `reverse_keyframes` | 原生入口 native.run | 实测 |
| 创建关键帧列 | `keyframe_column_create` | 原生入口 native.run | 未逐项实测 |
| 选择关键帧列 | `keyframe_column_select` | 原生入口 native.run | 未逐项实测 |
| Select Keyframes Before Playhead | `keyframe_select_before_playhead` | 原生入口 native.run | 未逐项实测 |
| Select Keyframes After Playhead | `keyframe_select_after_playhead` | 原生入口 native.run | 未逐项实测 |
| 切换图像编辑器 | `timeline_graph_editor` | 参数 native.set | 实测 |
| 显示其他图表 | `graph_editor_other_graphs` | 参数 native.set | 未逐项实测 |
| 包含其他轴 | `graph_editor_include_other_graphs` | 参数 native.set | 未逐项实测 |
| 包括零线 | `graph_editor_zero_line` | 参数 native.set | 未逐项实测 |
| 播放动画 | `play_animation` | 原生入口 native.run | 未逐项实测 |
| 循环播放 | `looped_animation_playback` | 参数 native.set | 未逐项实测 |
| 播放速度 | `slider_animation_speed` | 参数 native.set | 未逐项实测 |
| 转跳到动画起点 | `jump_to_timeline_start` | 原生入口 native.run | 未逐项实测 |
| 转跳到动画终点 | `jump_to_timeline_end` | 原生入口 native.run | 未逐项实测 |
| 上一个关键帧 | `timeline_frame_back` | 原生入口 native.run | 未逐项实测 |
| 下一个关键帧 | `timeline_frame_forth` | 原生入口 native.run | 未逐项实测 |
| 设置时间线范围开始 | `set_timeline_range_start` | 原生入口 native.run | 未逐项实测 |
| 设置时间线范围结束 | `set_timeline_range_end` | 原生入口 native.run | 未逐项实测 |
| 禁用时间线范围 | `disable_timeline_range` | 原生入口 native.run | 未逐项实测 |
| 将所有修改后的动画放入时间轴 | `bring_up_all_animations` | 原生入口 native.run | 未逐项实测 |
| 全部添加到时间线 | `add_all_to_timeline` | 原生入口 native.run | 未逐项实测 |
| 折叠所有动画 | `fold_all_animations` | 原生入口 native.run | 未逐项实测 |
| 清除时间轴 | `clear_timeline` | 原生入口 native.run | 未逐项实测 |
| 动画效果 | `select_effect_animator` | 原生入口 native.run | 未逐项实测 |
| 通道 | `timeline_focus` | 原生入口 native.run | 未逐项实测 |
| 设置标记 | `add_marker` | 原生入口 native.run | 实测 |
| 时间线设置 | `timeline_setups` | 原生入口 native.run | 未逐项实测 |
| 保存时间线设置... | `save_timeline_setup` | 原生入口 native.run | 未逐项实测 |
| 加入动作控制器 | `add_animation_controller` | 原生入口 native.run | 未逐项实测 |
| 增加动画控制状态 | `add_animation_controller_state` | 原生入口 native.run | 未逐项实测 |

## 06 纹理

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| Extrude Texture | `extrude_texture_to_model` | 原生入口 native.run | 未逐项实测 |
| 导入纹理 | `import_texture` | 原生入口 native.run；file_dialog | 未逐项实测 |
| 创建纹理 | `create_texture` | 原生入口 native.run | 未逐项实测 |
| 向模板追加元素... | `append_to_template` | 原生入口 native.run | 未逐项实测 |
| 保存纹理 | `save_textures` | 原生入口 native.run；write_file | 未逐项实测 |
| 更改纹理位置 | `change_textures_folder` | 原生入口 native.run；write_file | 未逐项实测 |
| 创建纹理组 | `create_texture_group` | 原生入口 native.run | 未逐项实测 |
| 创建材质 | `create_material` | 原生入口 native.run | 未逐项实测 |
| 生成 PBR 贴图 | `generate_pbr_map` | 原生入口 native.run | 未逐项实测 |
| 播放动态纹理 | `animated_textures` | 原生入口 native.run | 未逐项实测 |
| 动态纹理帧 | `animated_texture_frame` | 参数 native.set | 未逐项实测 |
| settings.texture_fps | `animated_texture_fps` | 原生入口 native.run | 未逐项实测 |
| 手翻书动画... | `animated_texture_editor` | 原生入口 native.run | 未逐项实测 |
| 反转颜色 | `invert_colors` | 原生入口 native.run | 实测 |
| 调整亮度和对比度... | `adjust_brightness_contrast` | 原生入口 native.run | 实测 |
| 调整饱和度和色调... | `adjust_saturation_hue` | 原生入口 native.run | 实测 |
| 调整曲线... | `adjust_curves` | 原生入口 native.run | 实测 |
| 调整不透明度... | `adjust_opacity` | 原生入口 native.run | 实测 |
| 限制为调色板内颜色 | `limit_to_palette` | 原生入口 native.run | 未逐项实测 |
| 将 RGB 通道分解成图层 | `split_rgb_into_layers` | 原生入口 native.run | 未逐项实测 |
| 分离 Alpha 通道为图层 | `split_alpha_into_layer` | 原生入口 native.run | 未逐项实测 |
| 清除纹理未使用的部分 | `clear_unused_texture_space` | 原生入口 native.run | 未逐项实测 |
| 水平翻转纹理 | `flip_texture_x` | 原生入口 native.run | 实测 |
| 垂直翻转纹理 | `flip_texture_y` | 原生入口 native.run | 未逐项实测 |
| 顺时针旋转 | `rotate_texture_cw` | 原生入口 native.run | 未逐项实测 |
| 逆时针旋转 | `rotate_texture_ccw` | 原生入口 native.run | 未逐项实测 |
| 调整纹理大小... | `resize_texture` | 原生入口 native.run | 未逐项实测 |
| 将纹理裁剪至选区内 | `crop_texture_to_selection` | 原生入口 native.run | 未逐项实测 |

## 07 UV

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| UV 模式 | `cube_uv_mode` | 参数 native.set | 未逐项实测 |
| UV 旋转 | `uv_rotation` | 参数 native.set | 未逐项实测 |
| UV 网格 | `uv_grid` | 参数 native.set | 未逐项实测 |
| 最大化 UV | `uv_maximize` | 原生入口 native.run | 未逐项实测 |
| 转向映射 | `uv_turn_mapping` | 原生入口 native.run | 未逐项实测 |
| 自动 UV | `uv_auto` | 原生入口 native.run | 未逐项实测 |
| 自视角投射 UV | `uv_project_from_view` | 原生入口 native.run | 未逐项实测 |
| 自动相对 UV | `uv_rel_auto` | 原生入口 native.run | 未逐项实测 |
| UV 镜像 X 轴 | `uv_mirror_x` | 原生入口 native.run | 实测 |
| UV 镜像 Y 轴 | `uv_mirror_y` | 原生入口 native.run | 未逐项实测 |
| 向左旋转 UV | `uv_rotate_left` | 原生入口 native.run | 未逐项实测 |
| 向右旋转 UV | `uv_rotate_right` | 原生入口 native.run | 实测 |
| 删除面 | `uv_transparent` | 原生入口 native.run | 未逐项实测 |
| 重置面 | `uv_reset` | 原生入口 native.run | 未逐项实测 |
| 应用到所有面 | `uv_apply_all` | 原生入口 native.run | 未逐项实测 |
| 剔除面 | `cullface` | 参数 native.set | 未逐项实测 |
| 自动剔除面 | `auto_cullface` | 原生入口 native.run | 未逐项实测 |
| 着色 | `face_tint` | 原生入口 native.run | 未逐项实测 |
| 色调指数 | `slider_face_tint` | 参数 native.set | 未逐项实测 |
| 将 UV 移至光标 | `move_uv_to_cursor` | 原生入口 native.run | 未逐项实测 |
| 合并 UV 顶点 | `merge_uv_vertices` | 原生入口 native.run | 未逐项实测 |
| 连接 UV 面 | `connect_uv_faces` | 原生入口 native.run | 未逐项实测 |
| 将 UV 捕捉到像素 | `snap_uv_to_pixels` | 原生入口 native.run | 未逐项实测 |
| 循环 UV | `uv_cycle` | 原生入口 native.run | 未逐项实测 |
| 循环翻转 UV | `uv_cycle_invert` | 原生入口 native.run | 未逐项实测 |
| 显示所有元素 | `edit_mode_uv_overlay` | 参数 native.set | 未逐项实测 |
| UV 覆盖 | `paint_mode_uv_overlay` | 参数 native.set | 未逐项实测 |
| 使用 UV 移动纹理 | `move_texture_with_uv` | 参数 native.set | 未逐项实测 |

## 08 变换

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| X 轴移动 | `slider_pos_x` | 参数 native.set | 实测 |
| Y 轴移动 | `slider_pos_y` | 参数 native.set | 未逐项实测 |
| Z 轴移动 | `slider_pos_z` | 参数 native.set | 未逐项实测 |
| Move Individual Positions | `position_slider_per_element` | 参数 native.set | 未逐项实测 |
| X 轴尺寸 | `slider_size_x` | 参数 native.set | 未逐项实测 |
| Y 轴尺寸 | `slider_size_y` | 参数 native.set | 实测 |
| Z 轴尺寸 | `slider_size_z` | 参数 native.set | 未逐项实测 |
| 膨胀 | `slider_inflate` | 参数 native.set | 未逐项实测 |
| 拉伸 | `slider_stretch_x` | 参数 native.set | 未逐项实测 |
| 拉伸 | `slider_stretch_y` | 参数 native.set | 未逐项实测 |
| 拉伸 | `slider_stretch_z` | 参数 native.set | 未逐项实测 |
| X 轴旋转 | `slider_rotation_x` | 参数 native.set | 未逐项实测 |
| Y 轴旋转 | `slider_rotation_y` | 参数 native.set | 未逐项实测 |
| Z 轴旋转 | `slider_rotation_z` | 参数 native.set | 未逐项实测 |
| Move Pivot Values Directly | `origin_slider_direct_values` | 参数 native.set | 未逐项实测 |
| X 轴向枢轴 | `slider_origin_x` | 参数 native.set | 未逐项实测 |
| Y 轴向枢轴 | `slider_origin_y` | 参数 native.set | 未逐项实测 |
| Z 轴向枢轴 | `slider_origin_z` | 参数 native.set | 未逐项实测 |
| 旋转 X +90 | `rotate_x_cw` | 原生入口 native.run | 实测 |
| 旋转 X -90 | `rotate_x_ccw` | 原生入口 native.run | 未逐项实测 |
| 旋转 Y +90 | `rotate_y_cw` | 原生入口 native.run | 未逐项实测 |
| 旋转 Y -90 | `rotate_y_ccw` | 原生入口 native.run | 未逐项实测 |
| 旋转 Z +90 | `rotate_z_cw` | 原生入口 native.run | 未逐项实测 |
| 旋转 Z -90 | `rotate_z_ccw` | 原生入口 native.run | 未逐项实测 |
| X 轴翻转 | `flip_x` | 原生入口 native.run | 未逐项实测 |
| Y 轴翻转 | `flip_y` | 原生入口 native.run | 未逐项实测 |
| Z 轴翻转 | `flip_z` | 原生入口 native.run | 未逐项实测 |
| Flip in Place X | `flip_in_place_x` | 原生入口 native.run | 未逐项实测 |
| Flip in Place Y | `flip_in_place_y` | 原生入口 native.run | 未逐项实测 |
| Flip in Place Z | `flip_in_place_z` | 原生入口 native.run | 未逐项实测 |
| X 轴居中 | `center_x` | 原生入口 native.run | 未逐项实测 |
| Y 轴居中 | `center_y` | 原生入口 native.run | 未逐项实测 |
| Z 轴居中 | `center_z` | 原生入口 native.run | 未逐项实测 |
| 中央横向 | `center_lateral` | 原生入口 native.run | 未逐项实测 |
| 上移 | `move_up` | 原生入口 native.run | 未逐项实测 |
| 下移 | `move_down` | 原生入口 native.run | 未逐项实测 |
| 左移 | `move_left` | 原生入口 native.run | 未逐项实测 |
| 右移 | `move_right` | 原生入口 native.run | 未逐项实测 |
| 前移 | `move_forth` | 原生入口 native.run | 未逐项实测 |
| 后移 | `move_back` | 原生入口 native.run | 未逐项实测 |
| 可见性 | `toggle_visibility` | 参数 native.set | 实测 |
| 锁定 | `toggle_locked` | 参数 native.set | 未逐项实测 |
| 导出 | `toggle_export` | 参数 native.set | 未逐项实测 |
| 自动 UV | `toggle_autouv` | 参数 native.set | 未逐项实测 |
| 切换阴影 | `toggle_shade` | 参数 native.set | 未逐项实测 |
| 镜像 UV | `toggle_mirror_uv` | 参数 native.set | 未逐项实测 |
| 更新自动 UV | `update_autouv` | 原生入口 native.run | 未逐项实测 |
| 连锁拉伸 | `toggle_stretch_linked` | 参数 native.set | 未逐项实测 |
| 枢轴居中 | `origin_to_geometry` | 原生入口 native.run | 未逐项实测 |
| 居中独立驱轴 | `center_individual_pivots` | 原生入口 native.run | 未逐项实测 |
| 重置骨骼 | `bone_reset_toggle` | 原生入口 native.run | 未逐项实测 |
| 缩放... | `scale` | 原生入口 native.run | 未逐项实测 |
| 向前移动关键帧 | `move_keyframe_back` | 原生入口 native.run | 未逐项实测 |
| 向后移动关键帧 | `move_keyframe_forth` | 原生入口 native.run | 未逐项实测 |
| 上移关键帧图表 | `move_graph_keyframes_up` | 原生入口 native.run | 未逐项实测 |
| 下移关键帧图表 | `move_graph_keyframes_down` | 原生入口 native.run | 未逐项实测 |

## 09 图层

| 截图名称 | 原生 ID | 调用路径 | 验证 |
|---|---|---|---|
| 创造空白图层 | `create_empty_layer` | 原生入口 native.run | 实测 |
| 导入图层 | `import_layer` | 原生入口 native.run；file_dialog | 未逐项实测 |
| Create Layer Group | `create_layer_group` | 原生入口 native.run | 实测 |
| Resolve Layer Group | `resolve_layer_group` | 原生入口 native.run | 实测 |
| 启用图层 | `enable_texture_layers` | 原生入口 native.run | 实测 |
| 禁用图层 | `disable_texture_layers` | 原生入口 native.run | 实测 |
| 图层透明度 | `layer_opacity` | 参数 native.set | 实测 |
| 放大图层至纹理尺寸 | `layer_to_texture_size` | 原生入口 native.run | 未逐项实测 |
| 向下合并 | `merge_layer_down` | 原生入口 native.run | 实测 |
| 将图层裁切至选区内 | `crop_layer_to_selection` | 原生入口 native.run | 未逐项实测 |
