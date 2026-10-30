"""Create a preview GIF from real Blockbench frames (developer helper; Pillow required)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
frames = []
for file in sorted((root / "artifacts/animation-frames").glob("*.png")):
    image = Image.open(file).convert("RGBA")
    background = Image.new("RGBA", image.size, (24, 33, 47, 255))
    background.alpha_composite(image)
    frames.append(background.convert("RGB"))
if not frames:
    raise SystemExit("Run node tools/test_bridge.mjs first")
output = root / "artifacts/animated-robot.gif"
frames[0].save(output, save_all=True, append_images=frames[1:], duration=83, loop=0, optimize=False)
print(output)
