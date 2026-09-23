#!/usr/bin/env python3
"""
Generates the icon art for the mod's new structures.

Two outputs share one source of truth (the SHAPES table below):

  * resources/images/<Name>IconWhite.svg  — build-menu / hotbar icons, in the
    same 24x24 white-on-transparent style as the existing structure icons.
  * resources/atlases/icon-atlas.png      — the map renderer samples one 64x64
    white glyph per structure from this strip. Column order must match
    STRUCTURE_ORDER in src/client/render/gl/passes/StructurePass.ts.

Run from the repo root:  python3 scripts/gen-mod-icons.py
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS = os.path.join(ROOT, "resources", "atlases", "icon-atlas.png")
IMAGES = os.path.join(ROOT, "resources", "images")

# Shapes are defined once on a 0..24 grid and scaled to whichever output is
# being written. Each entry is a list of polygons (lists of points) plus
# optional rectangles, which keeps both renderers trivial.
SHAPES = {
    # A long hall with a pitched roof and a door: a barracks block.
    "Barracks": {
        "polys": [
            [(2, 10), (12, 4), (22, 10), (22, 12), (2, 12)],   # roof
        ],
        "rects": [
            (3, 12, 21, 21),    # body
        ],
        "holes": [
            (10.5, 15, 13.5, 21),  # doorway
            (5, 14.5, 8, 17.5),    # window
            (16, 14.5, 19, 17.5),  # window
        ],
    },
    # A field gun: angled barrel over a wheeled carriage.
    "Artillery": {
        "polys": [
            [(4, 13), (19, 5), (21, 8), (6, 16)],   # barrel
            [(3, 16), (11, 16), (7, 21), (2, 21)],  # trail
        ],
        "rects": [],
        "holes": [],
        "circles": [
            (15, 17, 4),   # wheel (cx, cy, r)
        ],
    },
    # A keep with crenellations and a gate.
    "Fortress": {
        "polys": [
            [(2, 8), (5, 8), (5, 5), (8, 5), (8, 8), (11, 8), (11, 5),
             (14, 5), (14, 8), (17, 8), (17, 5), (20, 5), (20, 8), (22, 8),
             (22, 11), (2, 11)],   # battlements
        ],
        "rects": [
            (3, 11, 21, 21),   # wall
        ],
        "holes": [
            (10, 14, 14, 21),  # gate
        ],
    },
    # A flask: the universal "laboratory" glyph.
    "ResearchLab": {
        "polys": [
            [(10, 3), (14, 3), (14, 10), (20, 20), (4, 20)],   # flask body
        ],
        "rects": [
            (9, 2, 15, 4),   # stopper
        ],
        "holes": [
            (8.5, 14.5, 11.5, 17.5),   # bubble
        ],
        "circles": [],
    },
}

# Column order must match STRUCTURE_ORDER in StructurePass.ts.
NEW_ATLAS_COLUMNS = ["Barracks", "Artillery", "Fortress", "ResearchLab"]


def draw_shape(draw, shape, scale, offset=(0, 0), fill=(255, 255, 255, 255)):
    ox, oy = offset

    def pt(p):
        return (ox + p[0] * scale, oy + p[1] * scale)

    for poly in shape.get("polys", []):
        draw.polygon([pt(p) for p in poly], fill=fill)
    for x0, y0, x1, y1 in shape.get("rects", []):
        draw.rectangle([pt((x0, y0)), pt((x1, y1))], fill=fill)
    for cx, cy, r in shape.get("circles", []):
        draw.ellipse(
            [pt((cx - r, cy - r)), pt((cx + r, cy + r))], fill=fill
        )
    # Holes are punched last so they cut through everything above.
    for x0, y0, x1, y1 in shape.get("holes", []):
        draw.rectangle([pt((x0, y0)), pt((x1, y1))], fill=(0, 0, 0, 0))


def svg_for(name, shape):
    parts = []
    for poly in shape.get("polys", []):
        pts = " ".join(f"{x},{y}" for x, y in poly)
        parts.append(f'<polygon points="{pts}"/>')
    for x0, y0, x1, y1 in shape.get("rects", []):
        parts.append(
            f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}"/>'
        )
    for cx, cy, r in shape.get("circles", []):
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')

    holes = []
    for x0, y0, x1, y1 in shape.get("holes", []):
        holes.append(
            f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" '
            f'height="{y1 - y0}" fill="#000"/>'
        )

    mask = ""
    body = "".join(parts)
    if holes:
        mask = (
            '<mask id="m"><rect width="24" height="24" fill="#fff"/>'
            + "".join(holes)
            + "</mask>"
        )
        body = f'<g mask="url(#m)">{body}</g>'

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        f'fill="#fff">{mask}{body}</svg>'
    )


def main():
    # --- build-menu SVGs ---
    for name, shape in SHAPES.items():
        path = os.path.join(IMAGES, f"{name}IconWhite.svg")
        with open(path, "w") as f:
            f.write(svg_for(name, shape))
        print("wrote", os.path.relpath(path, ROOT))

    # --- map atlas: append one 64px column per new structure ---
    atlas = Image.open(ATLAS).convert("RGBA")
    cell = atlas.height  # columns are square
    existing = atlas.width // cell
    wanted = existing + len(NEW_ATLAS_COLUMNS)

    grown = Image.new("RGBA", (cell * wanted, cell), (0, 0, 0, 0))
    grown.paste(atlas, (0, 0))

    # Glyphs are inset so they sit inside the structure's circle on the map.
    inset = cell * 0.16
    scale = (cell - inset * 2) / 24.0

    for i, name in enumerate(NEW_ATLAS_COLUMNS):
        layer = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
        draw_shape(
            ImageDraw.Draw(layer), SHAPES[name], scale, (inset, inset)
        )
        grown.paste(layer, ((existing + i) * cell, 0), layer)

    grown.save(ATLAS)
    print(
        f"wrote {os.path.relpath(ATLAS, ROOT)}: "
        f"{existing} -> {wanted} columns ({grown.width}x{grown.height})"
    )


if __name__ == "__main__":
    main()
