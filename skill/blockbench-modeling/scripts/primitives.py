#!/usr/bin/env python3
"""Generate mesh.add parameters; no application connection required."""
import argparse
import json
import math
from pathlib import Path


def cylinder(radius=4, height=8, segments=12, top_radius=None):
    top_radius = radius if top_radius is None else top_radius
    if not 3 <= segments <= 128 or radius <= 0 or height <= 0 or top_radius < 0:
        raise ValueError("Positive radius/height, nonnegative top radius, segments 3–128 required")
    vertices = {"bottom": [0, -height/2, 0], "top": [0, height/2, 0]}
    faces = []
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        vertices[f"b{i}"] = [radius*math.cos(angle), -height/2, radius*math.sin(angle)]
        if top_radius:
            vertices[f"t{i}"] = [top_radius*math.cos(angle), height/2, top_radius*math.sin(angle)]
    for i in range(segments):
        j = (i + 1) % segments
        faces.append(["bottom", f"b{i}", f"b{j}"])
        if top_radius:
            faces.extend([[f"b{i}", f"t{i}", f"t{j}", f"b{j}"], ["top", f"t{j}", f"t{i}"]])
        else:
            faces.append([f"b{i}", "top", f"b{j}"])
    return {"vertices": vertices, "faces": faces}


def sphere(radius=4, segments=12, rings=6):
    if not 3 <= segments <= 128 or not 2 <= rings <= 64 or radius <= 0:
        raise ValueError("Positive radius, segments 3–128 and rings 2–64 required")
    vertices = {"top": [0, radius, 0], "bottom": [0, -radius, 0]}
    faces = []
    for ring in range(1, rings):
        phi = math.pi * ring / rings
        for i in range(segments):
            theta = 2 * math.pi * i / segments
            vertices[f"r{ring}_{i}"] = [radius*math.sin(phi)*math.cos(theta), radius*math.cos(phi), radius*math.sin(phi)*math.sin(theta)]
    for i in range(segments):
        j = (i+1) % segments
        faces.extend([["top", f"r1_{j}", f"r1_{i}"], ["bottom", f"r{rings-1}_{i}", f"r{rings-1}_{j}"]])
        for ring in range(1, rings-1):
            faces.append([f"r{ring}_{i}", f"r{ring}_{j}", f"r{ring+1}_{j}", f"r{ring+1}_{i}"])
    return {"vertices": vertices, "faces": faces}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("shape", choices=["cylinder", "cone", "sphere"])
    parser.add_argument("--name")
    parser.add_argument("--radius", type=float, default=4)
    parser.add_argument("--height", type=float, default=8)
    parser.add_argument("--top-radius", type=float)
    parser.add_argument("--segments", type=int, default=12)
    parser.add_argument("--rings", type=int, default=6)
    parser.add_argument("--origin", type=float, nargs=3, default=[0, 0, 0])
    parser.add_argument("--parent")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    geometry = sphere(args.radius, args.segments, args.rings) if args.shape == "sphere" else cylinder(args.radius, args.height, args.segments, 0 if args.shape == "cone" else args.top_radius)
    geometry.update(name=args.name or args.shape, origin=args.origin)
    if args.parent:
        geometry["parent"] = args.parent
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(geometry, indent=2, allow_nan=False), encoding="utf-8")
    print(target.resolve())


if __name__ == "__main__":
    main()
