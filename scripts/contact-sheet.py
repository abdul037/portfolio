"""
Build a labeled contact sheet per product group, for the confidentiality review.

Each sheet tiles every screenshot in a group with its filename underneath, so
the reviewer can point at specific files to redact. Output goes to the path
given as the second argument.

Usage: python3 scripts/contact-sheet.py <assets-subdir> <out.png> "<title>" "<risk note>"
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSET_ROOT = Path("public/assets")

subdir, out_path, title, risk = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

files = sorted(Path(ASSET_ROOT / subdir).glob("*.jpg"))
if not files:
    print(f"no jpgs in {subdir}")
    sys.exit(1)

# Layout
COLS = 3 if len(files) > 4 else 2
THUMB_W = 460
LABEL_H = 34
PAD = 20
HEADER_H = 96
BG = (7, 7, 14)
CARD_BG = (18, 18, 26)
ACCENT = (52, 211, 153)
TEXT = (224, 224, 230)
MUTED = (150, 150, 160)


def load_font(size, bold=False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


title_font = load_font(30, bold=True)
risk_font = load_font(20)
label_font = load_font(18)

# Compute a uniform thumbnail height from the widest aspect in the group so the
# grid is even; scale each screenshot to THUMB_W.
thumbs = []
for f in files:
    im = Image.open(f).convert("RGB")
    ratio = THUMB_W / im.width
    th = max(1, int(im.height * ratio))
    th = min(th, 300)  # cap tall shots
    thumbs.append((f.name, im.resize((THUMB_W, int(im.height * ratio)))))

CELL_H = 300 + LABEL_H
rows = (len(thumbs) + COLS - 1) // COLS
sheet_w = COLS * THUMB_W + (COLS + 1) * PAD
sheet_h = HEADER_H + rows * (CELL_H + PAD) + PAD

sheet = Image.new("RGB", (sheet_w, sheet_h), BG)
draw = ImageDraw.Draw(sheet)

# Header
draw.rectangle([0, 0, sheet_w, HEADER_H], fill=(11, 11, 18))
draw.rectangle([0, HEADER_H - 3, sheet_w, HEADER_H], fill=ACCENT)
draw.text((PAD, 20), title, font=title_font, fill=TEXT)
draw.text((PAD, 60), risk, font=risk_font, fill=MUTED)
count = f"{len(files)} screenshots"
w = draw.textlength(count, font=risk_font)
draw.text((sheet_w - w - PAD, 60), count, font=risk_font, fill=ACCENT)

for i, (name, thumb) in enumerate(thumbs):
    col = i % COLS
    row = i // COLS
    x = PAD + col * (THUMB_W + PAD)
    y = HEADER_H + PAD + row * (CELL_H + PAD)
    # Card
    draw.rectangle([x - 4, y - 4, x + THUMB_W + 4, y + 300 + LABEL_H + 4], fill=CARD_BG)
    # Thumb (top-aligned, clipped to 300 tall)
    clip = thumb.crop((0, 0, THUMB_W, min(300, thumb.height)))
    sheet.paste(clip, (x, y))
    # Label
    draw.text((x + 4, y + 300 + 8), name, font=label_font, fill=ACCENT)

sheet.save(out_path, quality=88)
print(f"{out_path}  ({len(files)} shots, {sheet_w}x{sheet_h})")
