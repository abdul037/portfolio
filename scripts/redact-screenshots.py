"""
Redact screenshots by baking a blur into the image files themselves.

A CSS blur would leave the sharp original in /public, downloadable by anyone —
so real redaction has to modify the shipped files. This blurs strongly enough
that text and numbers are illegible while the layout and colour of the UI still
read, which is the point of keeping the screenshot at all.

Originals are copied to an out-of-repo backup first so the step is reversible
within a session. NOTE: files already committed remain in git history — see the
README's confidentiality note about purging history if the repo is public.

Usage:
  python3 scripts/redact-screenshots.py <backup-dir> <assets-subdir> [<assets-subdir> ...]
"""
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ASSET_ROOT = Path("public/assets")

backup_dir = Path(sys.argv[1])
subdirs = sys.argv[2:]
if not subdirs:
    print("no folders given")
    sys.exit(1)

total = 0
for subdir in subdirs:
    folder = ASSET_ROOT / subdir
    files = sorted(folder.glob("*.jpg"))
    if not files:
        print(f"  (no jpgs in {subdir})")
        continue

    backup_folder = backup_dir / subdir
    backup_folder.mkdir(parents=True, exist_ok=True)

    for f in files:
        # Back up the original once; never overwrite an existing backup, so
        # re-running does not blur an already-blurred file's backup.
        backup = backup_folder / f.name
        if not backup.exists():
            shutil.copy2(f, backup)

        # Blur the pristine original (the backup), not the current file, so the
        # step is idempotent.
        im = Image.open(backup).convert("RGB")
        # Radius scales with width so small and large shots blur comparably;
        # ~1/70 of width reliably makes body text unreadable.
        radius = max(10, im.width / 70)
        im.filter(ImageFilter.GaussianBlur(radius)).save(f, quality=82)
        total += 1

    print(f"  {subdir}: {len(files)} redacted (originals -> {backup_folder})")

print(f"\n{total} screenshots redacted.")
