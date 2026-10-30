#!/usr/bin/env python3
"""Dependency-free Codex client for the Blockbench file bridge (Python 3.10+)."""
from __future__ import annotations
import argparse
import base64
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import uuid


class BridgeError(RuntimeError):
    pass


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, ensure_ascii=False, allow_nan=False)
    os.replace(temporary, path)


class Client:
    def __init__(self, root=None, session=None, timeout=30, project=None):
        self.root = Path(root or os.environ.get("BLOCKBENCH_BRIDGE_DIR") or Path.home() / ".codex" / "blockbench-bridge")
        self.session_id = session
        self.timeout = timeout
        self.project = project

    def sessions(self):
        result = []
        for file in (self.root / "sessions").glob("*/session.json"):
            try:
                data = read_json(file)
                if data.get("protocol") == 1 and data.get("id") == file.parent.name:
                    data["alive"] = 0 <= time.time() * 1000 - data.get("heartbeat", 0) < 15000
                    result.append(data)
            except (OSError, ValueError, TypeError):
                continue
        return result

    def session(self, require_alive=True):
        sessions = self.sessions()
        if self.session_id:
            sessions = [s for s in sessions if s["id"] == self.session_id]
        if require_alive:
            sessions = [s for s in sessions if s["alive"]]
        if not sessions:
            raise BridgeError("No live Blockbench bridge. Open Blockbench, load codex_blockbench_bridge.js, and grant its dedicated folder permission. Run 'sessions' to inspect discovery.")
        if len(sessions) != 1:
            raise BridgeError("Multiple Blockbench sessions found. Choose one with --session ID before the subcommand: " + ", ".join(s["id"] for s in sessions))
        return sessions[0]

    def result(self, request_id, session=None):
        if len(request_id) != 32 or any(c not in "0123456789abcdef" for c in request_id):
            raise BridgeError("Invalid request ID")
        session = session or self.session(require_alive=False)
        file = self.root / "sessions" / session["id"] / "responses" / (request_id + ".json")
        if not file.exists():
            raise BridgeError("No completed response yet. The operation may still be running; do not resubmit a mutation without inspecting the scene.")
        data = read_json(file)
        if data.get("protocol") != 1 or data.get("id") != request_id:
            raise BridgeError("Invalid response envelope")
        if not data.get("ok"):
            error = data.get("error", {})
            raise BridgeError(f"{error.get('code', 'ERROR')}: {error.get('message', 'Unknown plugin error')}")
        return data["result"]

    def call(self, method, params=None):
        params = {} if params is None else dict(params)
        if self.project:
            params.setdefault("project_id", self.project)
        session = self.session()
        folder = self.root / "sessions" / session["id"]
        request_id = uuid.uuid4().hex
        request_file = folder / "requests" / (request_id + ".json")
        response_file = folder / "responses" / (request_id + ".json")
        request = {"protocol": 1, "id": request_id, "session": session["id"], "expires_at": int((time.time() + self.timeout) * 1000), "method": method, "params": params}
        encoded = json.dumps(request, ensure_ascii=False, allow_nan=False).encode("utf-8")
        if len(encoded) > 16 * 1024 * 1024:
            raise BridgeError("Request exceeds 16 MB; split the model into smaller batches")
        atomic_json(request_file, request)
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            if response_file.exists():
                return self.result(request_id, session)
            time.sleep(0.08)
        if response_file.exists():
            return self.result(request_id, session)
        try:
            cancelled = request_file.with_suffix(".cancelled")
            request_file.rename(cancelled)
            cancelled.unlink()
            raise BridgeError(f"Timed out before the request was claimed; it was cancelled. Request: {request_id}")
        except FileNotFoundError:
            raise BridgeError(f"Timed out with execution state UNKNOWN. Do not retry a mutation automatically. Inspect the scene or run --session {session['id']} result {request_id}") from None


def write_output(path, data, overwrite=False):
    target = Path(path).expanduser().resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=".codex-bb-", dir=target.parent)
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(data)
        if overwrite:
            os.replace(temporary, target)
        else:
            os.link(temporary, target)  # atomic create; cannot overwrite an existing file
        return str(target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--bridge-dir")
    result.add_argument("--session", help="Session ID from sessions; required when multiple instances are open")
    result.add_argument("--project", help="Reject the request if the active project UUID differs")
    result.add_argument("--timeout", type=float, default=30)
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("sessions")
    commands.add_parser("status")
    commands.add_parser("context")
    native_tools = commands.add_parser("tools")
    native_tools.add_argument("query", nargs="?", default="")
    native_tools.add_argument("--available", action="store_true")
    native_tools.add_argument("--limit", type=int, default=100)
    native_tools.add_argument("--offset", type=int, default=0)
    open_model = commands.add_parser("open")
    open_model.add_argument("file", help="Self-contained bbmodel with embedded PNGs; opens a new tab")
    export_model = commands.add_parser("export")
    export_model.add_argument("codec", help="ID from call codec.list")
    export_model.add_argument("output")
    export_model.add_argument("--options", help="JSON file of native codec options")
    export_model.add_argument("--overwrite", action="store_true")
    layer_import = commands.add_parser("layer-import")
    layer_import.add_argument("texture")
    layer_import.add_argument("file")
    layer_import.add_argument("--name")
    layer_import.add_argument("--offset", nargs=2, type=float, default=[0, 0])
    scene = commands.add_parser("scene")
    scene.add_argument("--detail", action="store_true")
    scene.add_argument("--ids", nargs="+")
    create = commands.add_parser("create")
    create.add_argument("name")
    create.add_argument("--format", default="free")
    create.add_argument("--texture-size", nargs=2, type=int, default=[64, 64])
    call = commands.add_parser("call")
    call.add_argument("method")
    inputs = call.add_mutually_exclusive_group()
    inputs.add_argument("--params", help="JSON object; use --file to avoid shell quoting")
    inputs.add_argument("--file")
    inputs.add_argument("--stdin", action="store_true")
    batch = commands.add_parser("batch")
    batch.add_argument("file", help="JSON operations array or {operations, label}")
    batch.add_argument("--label")
    for verb in ("save", "screenshot"):
        command = commands.add_parser(verb)
        command.add_argument("output")
        command.add_argument("--overwrite", action="store_true")
        if verb == "save":
            command.add_argument("--format", choices=["bbmodel", "obj"], default="bbmodel")
        else:
            command.add_argument("--width", type=int, default=1024)
            command.add_argument("--height", type=int, default=768)
    texture = commands.add_parser("texture")
    texture.add_argument("file", help="PNG to import")
    texture.add_argument("--name")
    texture.add_argument("--replace", help="Replace an existing texture UUID, preserving its UV layout; PNG dimensions must match")
    texture_export = commands.add_parser("texture-export")
    texture_export.add_argument("id")
    texture_export.add_argument("output")
    texture_export.add_argument("--overwrite", action="store_true")
    animation_export = commands.add_parser("animation-export")
    animation_export.add_argument("output")
    animation_export.add_argument("--id")
    animation_export.add_argument("--overwrite", action="store_true")
    result_cmd = commands.add_parser("result")
    result_cmd.add_argument("request_id")
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    if not 0 < args.timeout <= 300:
        raise BridgeError("--timeout must be >0 and <=300 seconds")
    client = Client(args.bridge_dir, args.session, args.timeout, args.project)
    if args.command == "sessions":
        return {"bridge_dir": str(client.root), "sessions": client.sessions()}
    if args.command == "status":
        return client.call("bridge.status")
    if args.command == "context":
        return client.call("native.inspect")
    if args.command == "tools":
        return client.call("native.list", {"query": args.query, "available_only": args.available, "limit": args.limit, "offset": args.offset})
    if args.command == "open":
        return client.call("project.import", {"model": read_json(args.file)})
    if args.command == "export":
        if Path(args.output).exists() and not args.overwrite:
            raise BridgeError("Output exists. Use --overwrite only to replace it intentionally")
        exported = client.call("codec.export", {"id": args.codec, "options": read_json(args.options) if args.options else {}})
        data = base64.b64decode(exported["content"], validate=True) if exported["encoding"] == "base64" else exported["content"].encode("utf-8")
        return {"path": write_output(args.output, data, args.overwrite), "bytes": len(data), "assets": exported["assets"]}
    if args.command == "layer-import":
        file = Path(args.file)
        data = file.read_bytes()
        if not data.startswith(b"\x89PNG\r\n\x1a\n") or len(data) > 8 * 1024 * 1024:
            raise BridgeError("Layer must be a PNG no larger than 8 MB")
        return client.call("layer.add", {"texture": args.texture, "name": args.name or file.name, "offset": args.offset, "data_url": "data:image/png;base64," + base64.b64encode(data).decode("ascii")})
    if args.command == "scene":
        params = {"detail": args.detail}
        if args.ids:
            params["ids"] = args.ids
        return client.call("scene.get", params)
    if args.command == "create":
        return client.call("project.create", {"name": args.name, "format": args.format, "texture_size": args.texture_size})
    if args.command == "call":
        params = read_json(args.file) if args.file else json.load(sys.stdin) if args.stdin else json.loads(args.params or "{}")
        if not isinstance(params, dict):
            raise BridgeError("Call parameters must be a JSON object")
        return client.call(args.method, params)
    if args.command == "batch":
        params = read_json(args.file)
        if isinstance(params, list):
            params = {"operations": params}
        if not isinstance(params, dict):
            raise BridgeError("Batch file must contain an operations array or object")
        if args.label:
            params["label"] = args.label
        return client.call("batch", params)
    if args.command in ("save", "screenshot"):
        if Path(args.output).exists() and not args.overwrite:
            raise BridgeError("Output exists. Use --overwrite only when replacing that output is intended")
        if args.command == "save":
            exported = client.call("model.export", {"format": args.format})
            data = exported["content"].encode("utf-8")
        else:
            exported = client.call("preview.screenshot", {"width": args.width, "height": args.height})
            prefix = "data:image/png;base64,"
            if not exported["data_url"].startswith(prefix):
                raise BridgeError("Screenshot response is not PNG")
            data = base64.b64decode(exported["data_url"][len(prefix):], validate=True)
        return {"path": write_output(args.output, data, args.overwrite), "bytes": len(data)}
    if args.command == "texture":
        file = Path(args.file)
        data = file.read_bytes()
        if not data.startswith(b"\x89PNG\r\n\x1a\n") or len(data) > 8 * 1024 * 1024:
            raise BridgeError("Texture must be a PNG no larger than 8 MB")
        params = {"name": args.name or file.name, "data_url": "data:image/png;base64," + base64.b64encode(data).decode("ascii")}
        if args.replace:
            params["id"] = args.replace
        return client.call("texture.replace" if args.replace else "texture.add", params)
    if args.command in ("texture-export", "animation-export"):
        if Path(args.output).exists() and not args.overwrite:
            raise BridgeError("Output exists. Use --overwrite to replace it intentionally")
        params = {"id": args.id} if args.id else {}
        exported = client.call("texture.export" if args.command == "texture-export" else "animation.export", params)
        if args.command == "texture-export":
            prefix = "data:image/png;base64,"
            if not exported["data_url"].startswith(prefix):
                raise BridgeError("Texture response is not PNG")
            data = base64.b64decode(exported["data_url"][len(prefix):], validate=True)
        else:
            data = exported["content"].encode("utf-8")
        return {"path": write_output(args.output, data, args.overwrite), "bytes": len(data)}
    if args.command == "result":
        return client.result(args.request_id)
    raise BridgeError("Unsupported command")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    try:
        print(json.dumps(main(), ensure_ascii=False, indent=2, allow_nan=False))
    except (BridgeError, OSError, ValueError, TypeError, KeyError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
