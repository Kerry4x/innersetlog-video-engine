#!/usr/bin/env python3
"""
Clean + normalize raw Flow exports into transparent library sprites.

    python3 scripts/process_flow_assets.py [repoRoot]

Reads   assets/_flow_raw/heads/*.{jpg,png}   and   assets/_flow_raw/bodies/*.{jpg,png}
Writes  assets/library/heads/<id>.png        and   assets/library/bodies/<id>.png
        assets/_flow_raw/measurements.json   (stroke widths, sizes; used for anchoring)

id = file name up to the first '.', e.g. 'head_focused_deep.png_c73687fa_2K.jpg' -> 'head_focused_deep'.

HEADS  The black outline ring is a wall; only the region OUTSIDE it (connected to
       the canvas border) becomes transparent, so the #F7EFE2 fill, the #DFD6C5
       crescent and every facial line inside the ring are untouched. The outer
       anti-aliased fringe is converted to alpha. Every head is then scaled so
       its outer diameter is exactly HEAD_DIAMETER px, centered on a square
       HEAD_CANVAS canvas -> all expressions share identical geometry.
BODIES Pure #111 line art: alpha is derived from darkness everywhere (this also
       clears enclosed white pockets, e.g. between crossed arms and torso, which
       a corner flood fill cannot reach). Stray specks are removed. Each body is
       rescaled so its measured limb stroke width equals the reference pose's
       (body_stand_idle), so all poses share one physical scale.

Requires only numpy + Pillow.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
RAW = ROOT / "assets/_flow_raw"
LIB = ROOT / "assets/library"
INK = (17, 17, 17)  # #111111
HEAD_CANVAS = 1024
HEAD_DIAMETER = 920  # outer edge of the outline ring
REF_BODY = "body_stand_idle"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def asset_id(p: Path) -> str:
    return p.name.split(".")[0]


def luminance(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def shift_reduce(m: np.ndarray, r: int, fn) -> np.ndarray:
    """Square-kernel morphology (erode: np.minimum, dilate: np.maximum) by r px."""
    out = m.copy()
    for _ in range(r):
        p = np.pad(out, 1, mode="edge")
        acc = p[1:-1, 1:-1].copy()
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                acc = fn(acc, p[dy : dy + out.shape[0], dx : dx + out.shape[1]])
        out = acc
    return out


def erode(m, r):
    return shift_reduce(m, r, np.minimum)


def dilate(m, r):
    return shift_reduce(m, r, np.maximum)


def stroke_width(mask: np.ndarray) -> float:
    """Typical line thickness: erosion depth at which 90% of ink pixels have vanished (x2)."""
    total = mask.sum()
    m = mask.copy()
    for k in range(1, 200):
        m = erode(m, 1)
        if m.sum() < total * 0.10:
            return 2.0 * k
    return 400.0


def premul_resize(img: Image.Image, size) -> Image.Image:
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def outside_region(wall: np.ndarray) -> np.ndarray:
    """Pixels connected to the canvas border without crossing `wall` (computed at half res)."""
    h, w = wall.shape
    small = Image.fromarray(np.where(wall, 0, 255).astype(np.uint8)).resize((w // 2, h // 2), Image.NEAREST)
    # make thin wall gaps impossible at half res: thicken the wall by 1px
    sm = np.array(small) > 0
    sm = ~dilate(~sm, 1)
    # .copy(): fromarray() can share read-only memory with numpy, which makes floodfill a silent no-op
    small = Image.fromarray(np.where(sm, 255, 0).astype(np.uint8)).copy()
    sw, sh = small.size
    for x in list(range(0, sw, 16)) + [sw - 1]:
        for y in (0, sh - 1):
            if small.getpixel((x, y)) == 255:
                ImageDraw.floodfill(small, (x, y), 128, thresh=0)
    for y in list(range(0, sh, 16)) + [sh - 1]:
        for x in (0, sw - 1):
            if small.getpixel((x, y)) == 255:
                ImageDraw.floodfill(small, (x, y), 128, thresh=0)
    out = np.array(small.resize((w, h), Image.NEAREST)) == 128
    return out


def process_head(src: Path):
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    L = luminance(rgb)
    ring = L < 110  # outline (and inner facial lines; those are enclosed anyway)
    outside = outside_region(ring)
    # Half-res flood leaves a 1-2px sliver of light background hugging the ring's
    # outer edge; absorb it. (The inner fill is a full outline-width away, unreachable.)
    for _ in range(3):
        outside = outside | (dilate(outside, 1) & ~ring & (L > 150))
    # fringe: outside pixels touching the ring within 4px keep darkness as alpha
    near_ring = dilate(ring, 4)
    a_fringe = np.clip((250.0 - L) / (250.0 - 60.0), 0, 1)
    alpha = np.where(outside, np.where(near_ring, a_fringe, 0.0), 1.0)
    color = np.where(outside[..., None], np.array(INK, np.float32), rgb)
    rgba = np.dstack([color, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")

    solid = alpha > 0.5
    ys, xs = np.nonzero(solid)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    diam_src = max(x1 - x0, y1 - y0)
    ring_px = stroke_width(ring & ~outside | (ring & near_ring))  # outline thickness in source px
    k = HEAD_DIAMETER / diam_src
    crop = img.crop((x0, y0, x1, y1))
    crop = premul_resize(crop, (round((x1 - x0) * k), round((y1 - y0) * k)))
    canvas = Image.new("RGBA", (HEAD_CANVAS, HEAD_CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((HEAD_CANVAS - crop.width) // 2, (HEAD_CANVAS - crop.height) // 2))
    out = LIB / "heads" / f"{asset_id(src)}.png"
    canvas.save(out, optimize=True)
    return {
        "src_size": [int(rgb.shape[1]), int(rgb.shape[0])],
        "src_diameter": int(diam_src),
        "outline_px_normalized": round(ring_px * k, 1),
        "out": str(out.relative_to(ROOT)),
    }


def process_body(src: Path, target_stroke=None):
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    L = luminance(rgb)
    alpha = np.clip((235.0 - L) / (235.0 - 45.0), 0, 1)
    core = L < 100
    keep = dilate(erode(core, 3), 14)  # drop specks thinner than ~6px, keep line AA fringe
    alpha = alpha * keep
    sw = stroke_width(core & keep)
    rgba = np.dstack([np.broadcast_to(np.array(INK, np.float32), rgb.shape), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    ys, xs = np.nonzero(alpha > 0.02)
    m = 24
    box = (max(0, xs.min() - m), max(0, ys.min() - m), min(img.width, xs.max() + 1 + m), min(img.height, ys.max() + 1 + m))
    img = img.crop(box)
    k = 1.0 if target_stroke is None else target_stroke / sw
    if abs(k - 1) > 0.01:
        img = premul_resize(img, (round(img.width * k), round(img.height * k)))
    out = LIB / "bodies" / f"{asset_id(src)}.png"
    img.save(out, optimize=True)
    return {"src_size": [int(rgb.shape[1]), int(rgb.shape[0])], "stroke_src": sw, "scale_applied": round(k, 4), "crop_src": list(map(int, box)), "out": str(out.relative_to(ROOT)), "out_size": list(img.size)}


def main():
    report = {"heads": {}, "bodies": {}, "head_canvas": HEAD_CANVAS, "head_diameter": HEAD_DIAMETER}
    (LIB / "heads").mkdir(parents=True, exist_ok=True)
    (LIB / "bodies").mkdir(parents=True, exist_ok=True)
    for f in sorted((RAW / "heads").glob("*")):
        if f.suffix.lower() in EXTS:
            report["heads"][asset_id(f)] = process_head(f)
            print("head ", asset_id(f), report["heads"][asset_id(f)]["src_diameter"], "->", HEAD_DIAMETER)
    bodies = [f for f in sorted((RAW / "bodies").glob("*")) if f.suffix.lower() in EXTS]
    ref = next((f for f in bodies if asset_id(f) == REF_BODY), bodies[0] if bodies else None)
    if ref:
        r = process_body(ref)
        target = r["stroke_src"]
        report["bodies"][asset_id(ref)] = r
        report["body_stroke_px"] = target
        for f in bodies:
            if f == ref:
                continue
            report["bodies"][asset_id(f)] = process_body(f, target)
        for k, v in report["bodies"].items():
            print("body ", k.ljust(26), "stroke", v["stroke_src"], "scale", v["scale_applied"], "->", v["out_size"])
    (RAW / "measurements.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
