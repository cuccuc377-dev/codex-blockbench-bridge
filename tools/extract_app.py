"""Extract local Blockbench sources for API inspection (development only)."""
import json
import struct
import sys
from pathlib import Path

archive, destination = map(Path, sys.argv[1:3])
with archive.open("rb") as stream:
    _, header_size, _, json_size = struct.unpack("<4I", stream.read(16))
    header = json.loads(stream.read(json_size))
    base = 8 + header_size

    def walk(node, prefix=""):
        for name, entry in node["files"].items():
            relative = f"{prefix}{name}"
            if "files" in entry:
                walk(entry, relative + "/")
            elif (relative.startswith(("js/", "dist/", "electron/")) or relative in ("package.json", "index.html", "main.js")) and not entry.get("unpacked"):
                target = destination / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                stream.seek(base + int(entry["offset"]))
                target.write_bytes(stream.read(entry["size"]))
    walk(header)
print(destination)
source_map = destination / "dist/bundle.js.map"
if source_map.exists():
    data = json.loads(source_map.read_text(encoding="utf-8"))
    for source, content in zip(data["sources"], data["sourcesContent"]):
        relative = source.replace("\\", "/").split("/js/", 1)
        if len(relative) == 2 and content is not None and ".." not in relative[1].split("/"):
            target = destination / "js" / relative[1]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
