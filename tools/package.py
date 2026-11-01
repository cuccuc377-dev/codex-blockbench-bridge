"""Build the distributable ZIP; excludes local application sources and test profiles."""
from pathlib import Path
import json
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
output = root / f"dist/codex-blockbench-bridge-{version}.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for directory in ["src", "skill", "tools"]:
        for file in (root / directory).rglob("*"):
            if file.is_file() and "__pycache__" not in file.parts and file.suffix != ".pyc":
                archive.write(file, file.relative_to(root))
    archive.write(root / "plugin/codex_blockbench_bridge.js", "plugin/codex_blockbench_bridge.js")
    for name in ["README.md", "VALIDATION.md", "install.ps1", "package.json", ".gitignore"]:
        archive.write(root / name, name)
    for name in ["robot.bbmodel", "robot.png", "animated-robot.bbmodel", "animated-robot.gltf", "animated-robot.png", "animated-robot.gif", "robot-atlas.png", "robot-animation.json"]:
        file = root / "artifacts" / name
        if file.exists():
            archive.write(file, "examples/" + ("robot-animation-export.json" if name == "robot-animation.json" else name))
    for name in ["core-test.json", "advanced-test.json", "native-test.json"]:
        file = root / "artifacts" / name
        if file.exists():
            archive.write(file, "validation/" + name)
    background_result = root / "artifacts/background/results.json"
    if background_result.exists():
        archive.write(background_result, "validation/background-test.json")
print(output)
