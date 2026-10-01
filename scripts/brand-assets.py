#!/usr/bin/env python3
"""
Every logo file the app serves, built from the school's one logo.

    python3 scripts/brand-assets.py [brand/school-logo-source.png]

The source is the full lock-up: the crest on the left, "Treasure Scientia
School" beside it, on a transparent ground. Two things are cut from it:

- public/school-logo.png  — the lock-up, trimmed to its own edges. Where there
  is room for the name: the open rail, the sign-in page, the apply page.
- public/school-crest.png — the crest alone, centred on a transparent square.
  Where there is not: the browser tab and the folded rail.

and the four installed-app icons are the crest on white:
apple-touch-icon.png (180), pwa-192.png, pwa-512.png and pwa-maskable-512.png.

The crest is found rather than measured: it is the largest shape in the image
that touches nothing else. The "T" of TREASURE starts inside the crest's
bounding box (x 133 against a crest ending at 142 in the 302px original), so a
rectangle crop would carry a sliver of the lettering into every icon; taking
the shape's own pixels does not.

Two things about the resampling, both learnt on the previous icons:
- Colour and alpha are resized together through the premultiplied `RGBa`
  mode. Resized apart, the colour under the transparent pixels is averaged
  into every edge and fringes the mark.
- The icon canvases are RGB, not RGBA. Pasting through a mask onto an RGBA
  canvas writes the mask into the canvas's alpha as well, so the crest's
  antialiased edge would come out see-through and a dark launcher would show
  through it.

Rerun this with a larger original and every file is replaced. The one on
record is 302x123, which leaves the crest 136px tall: sharp everywhere it is
drawn in the page, and upscaled for the 512px icons.
"""

import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "brand" / "school-logo-source.png"

# How much of an icon the crest fills. More than the old globe's 66%: the
# crest is a badge with its own rim, and at 66% it read as a coin on a plate.
# A maskable icon must keep its mark inside the circle of 80% a launcher
# promises not to crop — at 60% the ribbon's tips, the crest's farthest
# points from its centre, sit at 37% of the icon from the middle, inside 40%.
PLAIN_COVER = 0.80
MASKABLE_COVER = 0.60


def shapes(image: Image.Image) -> list[set[tuple[int, int]]]:
    """Every connected run of visible pixels, largest first."""
    width, height = image.size
    alpha = image.getchannel("A").load()
    seen: set[tuple[int, int]] = set()
    found = []
    for sx in range(width):
        for sy in range(height):
            if (sx, sy) in seen or alpha[sx, sy] == 0:
                continue
            shape = set()
            queue = deque([(sx, sy)])
            seen.add((sx, sy))
            while queue:
                x, y = queue.popleft()
                shape.add((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if (
                            0 <= nx < width
                            and 0 <= ny < height
                            and (nx, ny) not in seen
                            and alpha[nx, ny] > 0
                        ):
                            seen.add((nx, ny))
                            queue.append((nx, ny))
            found.append(shape)
    return sorted(found, key=len, reverse=True)


def crest_of(logo: Image.Image) -> Image.Image:
    """The crest's own pixels, trimmed, centred on a transparent square."""
    crest_pixels = shapes(logo)[0]
    xs = [x for x, _ in crest_pixels]
    ys = [y for _, y in crest_pixels]
    left, top, right, bottom = min(xs), min(ys), max(xs) + 1, max(ys) + 1

    cut = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
    source = logo.load()
    target = cut.load()
    for x, y in crest_pixels:
        target[x - left, y - top] = source[x, y]

    side = max(cut.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cut, ((side - cut.width) // 2, (side - cut.height) // 2))
    return square


def resized(image: Image.Image, side: int) -> Image.Image:
    """Resampled with colour and alpha together — see the module note."""
    return image.convert("RGBa").resize((side, side), Image.LANCZOS).convert("RGBA")


def icon(crest: Image.Image, size: int, cover: float) -> Image.Image:
    """The crest on white, as an opaque RGB square."""
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    mark = resized(crest, round(size * cover))
    offset = (size - mark.width) // 2
    canvas.paste(mark, (offset, offset), mark)
    return canvas


def main() -> None:
    logo = Image.open(SOURCE).convert("RGBA")
    lockup = logo.crop(logo.getchannel("A").getbbox())
    crest = crest_of(logo)

    lockup.save(PUBLIC / "school-logo.png", optimize=True)
    crest.save(PUBLIC / "school-crest.png", optimize=True)
    icon(crest, 180, PLAIN_COVER).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    icon(crest, 192, PLAIN_COVER).save(PUBLIC / "pwa-192.png", optimize=True)
    icon(crest, 512, PLAIN_COVER).save(PUBLIC / "pwa-512.png", optimize=True)
    icon(crest, 512, MASKABLE_COVER).save(PUBLIC / "pwa-maskable-512.png", optimize=True)

    print(f"source   {SOURCE.relative_to(ROOT)}  {logo.width}x{logo.height}")
    print(f"lock-up  public/school-logo.png  {lockup.width}x{lockup.height}")
    print(f"crest    public/school-crest.png  {crest.width}x{crest.height}")
    largest = round(512 * PLAIN_COVER)
    if crest.width < largest:
        print(
            f"note     the 512px icons draw the crest at {largest}px from a "
            f"{crest.width}px original — a larger source makes them sharper"
        )


if __name__ == "__main__":
    main()
