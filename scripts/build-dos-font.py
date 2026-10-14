"""
Builds public/fonts/moderndos-8x16.woff2 from the Modern DOS 8x16 bitmaps.

Modern DOS 8x16 is by Jayvee Enaguas and is dedicated to the public domain
(CC0 1.0). The bitmaps come from the `pcface` npm package (MIT / CC0 for the
Modern DOS bitmaps): https://github.com/susam/pcface

Every lit pixel becomes a square; overlapping squares are merged so the
outlines stay clean at any size. One pixel = 64 font units and 1em = 16
pixels, so the font is pixel-perfect at 16px, 32px, 48px and so on.

Usage:
  npm pack pcface && tar xzf pcface-*.tgz
  pip install fonttools brotli skia-pathops
  python3 scripts/build-dos-font.py package/out/moderndos-8x16/fontmap.js
"""

import re
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib.removeOverlaps import removeOverlaps

PX = 64
COLS, ROWS = 8, 16
ASCENT_ROWS = 12  # rows 0-11 sit above the baseline

src = open(sys.argv[1], encoding="utf-8").read()
pairs = re.findall(r"^\s*'((?:\\.|[^'])+)': \[([^\]]+)\]", src, re.M)

bitmaps: dict[str, list[int]] = {}
for key, values in pairs:
    ch = key.encode().decode("unicode_escape") if "\\" in key else key
    bitmaps.setdefault(ch, [int(v, 16) for v in values.split(",")])

# Typographic characters that are not in CP437 but show up in copy.
aliases = {
    "—": "─",  # em dash -> box horizontal
    "–": "-",
    "‘": "'",
    "’": "'",
    "“": '"',
    "”": '"',
}
for target, source in aliases.items():
    if source in bitmaps:
        bitmaps[target] = bitmaps[source]
bitmaps["…"] = [0] * 11 + [0b11011011, 0b11011011] + [0] * 3  # ellipsis

glyph_order = [".notdef"]
cmap: dict[int, str] = {}
glyphs = {}


def draw(bits: list[int]):
    pen = TTGlyphPen(None)
    for row, byte in enumerate(bits):
        top = (ASCENT_ROWS - row) * PX
        bottom = top - PX
        for col in range(COLS):
            if byte & (0x80 >> col):
                left, right = col * PX, (col + 1) * PX
                pen.moveTo((left, bottom))
                pen.lineTo((left, top))
                pen.lineTo((right, top))
                pen.lineTo((right, bottom))
                pen.closePath()
    return pen.glyph()


notdef = [0, 0, 0x7E, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x7E, 0, 0, 0, 0, 0]
glyphs[".notdef"] = draw(notdef)

for ch, bits in sorted(bitmaps.items(), key=lambda kv: ord(kv[0])):
    cp = ord(ch)
    name = f"uni{cp:04X}"
    if name in glyphs:
        continue
    glyph_order.append(name)
    glyphs[name] = draw(bits)
    cmap[cp] = name

# Non-breaking space shares the space bitmap.
cmap[0x00A0] = cmap[0x0020]

fb = FontBuilder(unitsPerEm=COLS * PX * 2, isTTF=True)
fb.setupGlyphOrder(glyph_order)
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({name: (COLS * PX, 0) for name in glyph_order})
ascent, descent = ASCENT_ROWS * PX, (ROWS - ASCENT_ROWS) * PX
fb.setupHorizontalHeader(ascent=ascent, descent=-descent, lineGap=0)
fb.setupNameTable(
    {
        "familyName": "Funkie DOS",
        "styleName": "Regular",
        "uniqueFontIdentifier": "FunkieDOS-Regular",
        "fullName": "Funkie DOS",
        "psName": "FunkieDOS-Regular",
        "version": "Version 1.000",
        "copyright": "Modern DOS 8x16 by Jayvee Enaguas, CC0 1.0",
    }
)
fb.setupOS2(
    version=4,
    sTypoAscender=ascent,
    sTypoDescender=-descent,
    sTypoLineGap=0,
    usWinAscent=ascent,
    usWinDescent=descent,
    fsSelection=0x80,  # USE_TYPO_METRICS
    achVendID="FNKE",
)
fb.setupPost(isFixedPitch=1)
removeOverlaps(fb.font)

fb.font.flavor = "woff2"
out = "public/fonts/funkie-dos.woff2"
fb.save(out)
print(f"wrote {out} with {len(glyph_order)} glyphs")
