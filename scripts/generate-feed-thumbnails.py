#!/usr/bin/env python3
"""Make small WebP thumbnails of the Discovery Hub feed images.

The feed cards show these at roughly 170-330 dp wide, but the source images are
up to 2900 px wide (a 1920x1080 image decodes to ~8 MB of memory). Thumbnails
are 800 px wide, and `getContentThumbnail` in components/community/image-source.ts
maps each one. Re-run after adding a feed image, then add it to that map.

    python3 scripts/generate-feed-thumbnails.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets" / "nuclear"
OUT = ROOT / "thumbs"
WIDTH = 800

sources = sorted(ROOT.glob("feed-*.webp")) + sorted((ROOT / "sciencedaily").glob("*.webp"))
for src in sources:
    dest = OUT / src.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        if im.width <= WIDTH:
            ratio = 1
        else:
            ratio = WIDTH / im.width
        out = im.convert("RGB").resize((round(im.width * ratio), round(im.height * ratio)), Image.LANCZOS)
        out.save(dest, "WEBP", quality=78, method=6)
    print(f"{src.relative_to(ROOT)}: {src.stat().st_size // 1024} KB -> {dest.stat().st_size // 1024} KB")
