# Codex × Blockbench：建模、贴图与动画

**当前版本 1.2.0。** 让 Codex/GPT 通过本机插件创建和编辑 Blockbench 模型、生成和绘制纹理、处理 UV 与图层、绑定骨架和制作动画。新增原生工具发现、模式与组件选择、参数控件、子菜单、弹窗及操作后参数控制，覆盖用户九张截图的工具入口和操作流程。

已在本机 **Blockbench 5.2.2** 验证模型 API；插件声明支持桌面版 5.2.0 及以上。其他版本未实测。Python 需要 3.10+；只有开发构建/测试需要 Node.js 20+。不需要 API Key，不需要 npm install。

## 安装

从 [GitHub Releases](https://github.com/cuccuc377-dev/codex-blockbench-bridge/releases) 下载 `codex-blockbench-bridge-1.2.0.zip` 并解压，或使用 Git 获取本项目：

```powershell
git clone https://github.com/cuccuc377-dev/codex-blockbench-bridge.git
cd codex-blockbench-bridge
```

在 PowerShell 中进入下载或克隆得到的项目目录并运行：

```powershell
.\install.ps1
```

该脚本将 `blockbench-modeling` 技能复制到 `$CODEX_HOME/skills`（未设置时为 `%USERPROFILE%/.codex/skills`）；更新时把旧版本移至同级 `skill-backups`。不会修改 Codex 的其他配置，也不会写 Blockbench 的权限设置。

1. 打开 **Blockbench 桌面版** → **文件 / File → 插件 / Plugins → 从文件加载插件 / Load Plugin from File**，选择安装脚本输出的 `assets/codex_blockbench_bridge.js` 路径。也可以直接加载本项目的 `plugin/codex_blockbench_bridge.js`。
2. Blockbench 5.2 会弹出原生权限对话框。确认请求目录是 `%USERPROFILE%/.codex/blockbench-bridge`，选择 **Always allow for this plugin**。这是插件与 Codex 交换指令、模型数据和截图的专用目录；没有网络服务。拒绝此权限时插件无法连接。
3. 用下面命令检查连接；如果 Codex 当前聊天还未发现新技能，新建聊天后使用 `$blockbench-modeling`。

```powershell
python "$env:USERPROFILE\.codex\skills\blockbench-modeling\scripts\blockbench.py" status
```

本项目也可免安装调用：`python skill/blockbench-modeling/scripts/blockbench.py status`。插件工具菜单里有 **Codex Bridge：连接状态** 与 **启动 / 停止**。

从旧版本升级：运行安装脚本后，在 Blockbench 插件列表中重新加载本地插件。`status` 应报告 `version: 1.2.0`。如果你以前加载的是自己复制到其他目录的文件，请重新选择这次交付的 JS。

普通云端 ChatGPT 无法直接访问你电脑上的 Blockbench；需要本机 Codex 或能运行本客户端的本机代理。此实现通过技能调用脚本，不要求额外配置 MCP 服务器。

## 可以做什么

| 能力 | 已实现 |
|---|---|
| 方块 | 创建、改尺寸、移动坐标、旋转、膨胀、复制、删除 |
| 网格 | 自定义顶点与三角面/四边面、修改顶点、替换拓扑、单面挤出 |
| 截图中的对象 | 样条、Billboard、骨架与骨骼、定位器、空目标、包围盒的创建/编辑/删除 |
| 骨架 | 网格绑定与顶点权重归一化，每个顶点最多四个骨骼影响 |
| 基础几何体 | 圆柱、圆锥、球体，控制分段数和位置 |
| 组织 | 分组、层级、选择、项目列表与切换 |
| 纹理生成 | 纯色、棋盘格、噪声、木纹、砖块、金属、渐变；可指定颜色、分辨率和种子 |
| 像素绘制 | 矩形、像素、线段、椭圆、多边形、透明擦除；支持撤销 |
| 上贴图 / UV | 导入和替换 PNG、自动映射、独立面图集、手动 UV、导出 PNG |
| 动画 | 分组/骨骼/空目标关键帧、位置/旋转/缩放、插值、循环、时间点预览与播放 |
| 检查 | 查询场景、详细几何数据、设置相机、获取 PNG 视口截图 |
| 文件 | 保存可编辑 `.bbmodel`（含贴图、骨架和动画），导出 OBJ 几何文本、动画数据快照 |
| 撤销 | 接入 Blockbench 原生历史；一批命令一个撤销步骤；出错整批回滚 |

1.2 的原生接口还接入多面选区挤出、合并/拆分/固化、样条编辑、自动权重、模板 UV、纹理调整、图层组、时间线和格式导出等工具。实时目录核对到 **462 个工具/控件**；[截图工具清单](skill/blockbench-modeling/references/tool-coverage.md) 逐行对应 **336 条截图记录**，标明调用路径和实测状态。这些数字表示目录覆盖，**不表示所有工具、格式与选区组合都已完成自动化验证**。

刀具、顶点捕捉、权重画笔等视口交互，以及文件选择器和部分自定义窗口，由技能调用本机 `computer-use` 完成。没有可用桌面交互工具时，这部分不能全自动执行。此次验证中 `computer-use` 的本机管道不可用，重试和重置后仍报“找不到指定的文件”，因此鼠标交互未验证通过。原生 API 操作和结构化像素绘画可正常测试。

原生工具保留当前格式限制：`free` 支持通用模型，Minecraft Java 方块格式不支持网格和动画。自动图集仍采用逐面投影和等大方格；复杂模型可选原生 UV/模板工具。网页版连接和额外布尔建模插件不在实现范围内。第三方扩展工具可以被发现，但需使用其 UI 流程。

## 使用截图中的工具

```powershell
python .\skill\blockbench-modeling\scripts\blockbench.py tools '图层'
python .\skill\blockbench-modeling\scripts\blockbench.py tools 'merge_vertices'
python .\skill\blockbench-modeling\scripts\blockbench.py context
python .\skill\blockbench-modeling\scripts\blockbench.py call context.set --file .\context.json
python .\skill\blockbench-modeling\scripts\blockbench.py call native.run --file .\action.json
```

`context.json` 指定模式、对象 UUID、顶点/边/面选区、纹理/图层、动画/关键帧和面板。`action.json` 例如 `{"id":"merge_vertices"}`；返回子菜单后，使用当前 token 和选项索引调用 `native.menu`。挤出、固化、几何体创建等操作还可通过 `native.amend` 调整参数。普通参数使用 `native.set`，弹窗使用 `native.dialog`；不能操作任意用户已打开的弹窗。

原生亮度/对比度、饱和度/色相、不透明度和曲线窗口有专用适配。`paint.stroke` 可在指定图层执行真实画笔、克隆、填充、擦除、拾色、形状和渐变；`paint.selection` 控制像素选区；`layer-import` 从 PNG 新建图层。每步返回真实状态，需要检查结果，不能将“工具已选中”当成编辑完成。

详细操作见 [原生接口](skill/blockbench-modeling/references/native-tools.md) 和 [分类工作流](skill/blockbench-modeling/references/tool-workflows.md)。上传/分享、写文件、关闭/重启仍保留用途边界，只在用户实际任务要求这些操作时执行。

纹理生成是本机程序化生成，**插件不内置 AI 绘图模型**。需要 AI 绘制/参考图风格纹理时，技能会使用当前环境实际可用的图像生成工具，再导入 PNG；也能导出图集、保留布局重绘后替换原纹理。插件本身不需要 API Key，也不自动调用付费服务。

## 让 GPT 开始建模

在 Codex 中可以这样说：

> 使用 $blockbench-modeling 做一个低多边形机器人：方块身体、网格天线、样条电缆。生成金属纹理并上贴图，再制作两秒循环挥手动画。检查几个时间点的效果，保存 bbmodel 和纹理 PNG。

技能会引导模型先查看当前场景、使用明确的项目和元素 ID、分批建模、检查截图、再保存。你仍可在 Blockbench 手工修改或 Ctrl+Z 撤销。

## 命令行示例

```powershell
$bbClient = '.\skill\blockbench-modeling\scripts\blockbench.py'
python $bbClient sessions
python $bbClient create '方块与网格机器人' --format free
python $bbClient batch .\examples\robot.json
python $bbClient scene --detail
python $bbClient screenshot .\output\robot.png
python $bbClient save .\output\robot.bbmodel
```

示例包含 8 个方块、2 个网格和 1 个组；创建发生在新项目中，不会清空原有项目。`examples/robot.json` 只创建几何体；发行包中的 `examples/robot.bbmodel` 与截图来自真实应用联调，额外给身体和天线赋了橙色贴图。

在上述机器人上继续添加动画：

```powershell
python $bbClient batch .\examples\robot-rig.json
python $bbClient call animation.create --file .\examples\robot-animation.json
```

第二条命令返回动画 UUID。随后可通过 `animation.preview` 或 `animation.play` 预览。发行包的 `examples/animated-robot.bbmodel` 是已经添加程序纹理和 18 个关键帧的可编辑示例；`animated-robot.gif` 是从真实 Blockbench 视口采集 24 帧制作的预览。

圆柱示例：

```powershell
python .\skill\blockbench-modeling\scripts\primitives.py cylinder --name wheel --radius 4 --height 2 --segments 12 --origin 8 5 0 --output .\output\wheel.json
python $bbClient call mesh.add --file .\output\wheel.json
```

有多个 Blockbench 实例时，先 `sessions`，再在子命令前加 `--session ID`；编辑现有模型时建议加 `--project UUID` 防止切换项目后误编辑。`save` 默认拒绝覆盖文件，需要替换自己生成的输出时加 `--overwrite`。保存是导出当前模型快照，不会改变 Blockbench 页签的保存路径或已保存状态。

详细参数：`references/api.md`（基础操作）、`objects.md`（对象/蒙皮）、`textures.md`（生成与映射）、`animations.md`（动画）、`native-tools.md`（原生工具/绘画/图层/文件）及 `tool-workflows.md`（分类操作流程）。不要把大段 JSON 直接塞进 PowerShell 字符串，优先 `--file`。

```powershell
python .\skill\blockbench-modeling\scripts\blockbench.py open .\model.bbmodel
python .\skill\blockbench-modeling\scripts\blockbench.py call codec.list
python .\skill\blockbench-modeling\scripts\blockbench.py export gltf .\output\model.gltf --options .\export-options.json
```

`open` 要求 bbmodel 使用嵌入式 PNG；`export-options.json` 可写 `{"encoding":"ascii"}`，使用 `binary` 可导出 GLB 或二进制 STL。结构化 glTF/FBX 导出嵌入贴图；OBJ/DAE 单文件输出不含配套材质/图片包，完整资源包使用原生导出窗口。普通文件导入、格式转换和导出不会绕过 Blockbench 自身条件。

## 通信方式

```text
Codex → Python 客户端 → 专用目录中的 JSON 请求
                           ↓
                    Blockbench 插件
                           ↓
                   模型 API / 撤销 / 截图
                           ↓
Codex ← Python 客户端 ← JSON 响应
```

插件只请求专用目录的文件访问权限。没有监听端口、API Key、任意 JavaScript 执行接口或 shell 执行接口。支持多个实例的独立会话、心跳、请求过期、原子写入和同会话请求去重。请求按客户端顺序发送；不要并发发送存在先后依赖的建模命令。

超时会明确报告“尚未执行且已取消”或“执行状态未知”。状态未知时先查询客户端输出的 `result REQUEST_ID`，再检查场景，不要盲目重发修改命令。响应保留在会话目录里便于排查；不再需要的旧会话目录可以在插件停止后手动清理。该目录属于本机用户数据，能写入它的同一用户进程可以发出建模命令。

## 开发与验证

```powershell
node tools/build.mjs
node --test tests/mailbox.test.cjs
node --test tests/plugin.test.cjs
python -m unittest discover -s tests -p 'test_*.py' -v
python tools/package.py
```

构建把 `src/` 中的建模、原生对象、纹理、动画、通信和入口模块合为一个可直接加载的插件，同时复制到技能资源目录。

真实应用集成测试使用单独的测试配置目录启动本机 Blockbench（不接触用户正常配置），然后运行：

```powershell
$blockbenchExe = 'C:\Program Files\Blockbench\Blockbench.exe' # 改为本机实际安装路径
$testProfile = Join-Path (Get-Location).Path '.cache\bb-test-profile'
Start-Process -FilePath $blockbenchExe -ArgumentList @("--user-data-dir=`"$testProfile`"",'--remote-debugging-port=9337','--no-first-run') -WindowStyle Hidden
node tools/test_core.mjs
node tools/test_advanced.mjs
node tools/test_native.mjs
node tools/test_bridge.mjs
python tools/render_demo_gif.py
```

根据本机安装路径调整命令。调试端口仅供开发测试；日常插件使用完全不需要它。测试完成后退出该测试实例。

只有开发辅助脚本 `render_demo_gif.py` 需要 Pillow；插件和技能客户端不依赖它。`animation-export` 的 JSON 是 Blockbench 数据快照；`export gltf` 等通过原生编译器输出目标格式。游戏特定导出应在 Blockbench 的对应格式中完成。

测试层次：真实 Blockbench API 测试建模、回滚、撤销、导出和截图；Node 测试文件队列协议和插件加载/卸载；端到端测试让真实 Python 客户端经过文件队列调用实际 Blockbench API（测试适配器仅将模型 API 转发到隔离应用）。正式插件首次加载仍使用正常 Blockbench 权限对话框；测试不会篡改原生权限记录。

本次接口核对依据是本机 Blockbench 5.2.2 的公开发行包内源码映射，相关位置包括 `outliner/types/cube.js`、`outliner/types/mesh.js`、`undo.js`、`native_apis.ts`、`formats/bbmodel.js` 和 `preview/screenshot.js`。`.cache` 中的第三方源码仅用于本地核对，不包含在发行包中。
