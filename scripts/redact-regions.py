"""
Region-level redaction: blur only the PII rectangles inside a screenshot,
leaving the rest of the UI sharp.

Rectangles are given as fractions of width/height (0..1) so they are
resolution-independent and easy to reason about. Each rectangle is cropped,
blurred hard enough that text is unreadable, and pasted back — the blur is
contained to the crop, so it never bleeds past the region edge.

Config: scripts/redactions.json — { "<subdir>/<file>": [[x0,y0,x1,y1], ...] }.
Operates on the files in public/assets in place (restore sharp originals first
if you need to re-run against pristine images).

Usage: python3 scripts/redact-regions.py
"""
import json
from pathlib import Path

from PIL import Image, ImageFilter

ASSET_ROOT = Path("public/assets")
CONFIG = Path("scripts/redactions.json")

config = json.loads(CONFIG.read_text())

total_regions = 0
for rel_path, rects in config.items():
    path = ASSET_ROOT / rel_path
    if not path.exists():
        print(f"  MISSING {rel_path}")
        continue

    im = Image.open(path).convert("RGB")
    w, h = im.size
    # Strong enough that ~14px table text is unreadable; contained to each crop.
    radius = max(10, round(w / 110))

    for x0, y0, x1, y1 in rects:
        box = (round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h))
        region = im.crop(box).filter(ImageFilter.GaussianBlur(radius))
        im.paste(region, box)
        total_regions += 1

    im.save(path, quality=85)
    print(f"  {rel_path}: {len(rects)} region(s) blurred")

print(f"\n{total_regions} regions blurred across {len(config)} screens.")
