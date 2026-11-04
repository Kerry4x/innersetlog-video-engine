#!/usr/bin/env python3
"""
Slice Flow master turnaround sheets into transparent cast sprites.

    python3 scripts/process_flow_assets.py [repoRoot]

Input   assets/_flow_raw/<char_id>_sheet.{png,jpg}      e.g. char_01_lead_sheet.jpg -> char_01_lead
Output  assets/library/characters/<char_id>/poses/pose_N.png
                                            heads/expr_N.png  (+ expr_K__blink / __talk / __talk_wide for the neutral)
                                            props/prop_N.png
        assets/manifest.json  -> "characters" section (sizes, feet anchors, head circles, views, variants)

1. OUTER BACKGROUND REMOVAL
   Dark #111 outlines act as walls. Only white connected to the sheet border
   (without crossing an outline) is removed, so enclosed fills survive: #F7EFE2
   heads, #FFFFFF lab coats, #8B6B4E clipboards, #C85A32 notebooks. The
   anti-aliased outer fringe becomes alpha; soft ground shadows (no outline)
   are removed with the background. Enclosed light pockets between limbs
   (crossed arms, between legs) are cleared too, except inside head circles
   (teeth, glints). For white_fill characters a pocket is kept when its mean
   colour is Flow's warm coat white (L < 252) rather than the pure sheet white.
2. SLICING  Objects are separated by connected components and classified by
   shape: tall = pose (ordered left->right), round head-sized = expression head
   (ordered top->bottom, left->right), anything else = prop (left->right).
3. HEAD CIRCLES  For every pose and expression head, the head's outline circle
   is fitted with RANSAC on the outline's outer edge (robust to hair tufts,
   glasses arms and the neck). Stored as head {cx, cy, r} (outer radius, px).
4. VARIANTS  From the neutral expression: __blink (eyes replaced by closed-lid
   strokes), __talk (small open mouth), __talk_wide (wider open mouth).

Requires only numpy + Pillow.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
RAW = ROOT / "assets/_flow_raw"
OUT = ROOT / "assets/library/characters"
MANIFEST = ROOT / "assets/manifest.json"
INK = np.array((17, 17, 17), np.float32)
RNG = np.random.default_rng(7)

# Per-character art direction that can't be inferred from pixels.
#   views:      pose_N -> front | three_quarter | profile | back. Expression overlays
#               are only composited on front / three_quarter heads.
#   white_fill: the character has #FFFFFF interior fills (lab coat) -> never clear enclosed white.
#   neutral:    which expression is the neutral face (source of blink/talk variants).
CAST = {
    "char_01_lead": {"views": ["front", "three_quarter", "profile", "three_quarter"], "white_fill": False, "neutral": "expr_1"},
    "char_02_friend": {"views": ["front", "front", "profile", "three_quarter"], "white_fill": False, "neutral": "expr_1"},
    "char_03_psych": {"views": ["front", "three_quarter", "profile", "back"], "white_fill": True, "neutral": "expr_3"},
}


# ------------------------------------------------------------------ helpers
def lum(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def morph(m, r, fn):
    out = m.copy()
    for _ in range(r):
        p = np.pad(out, 1, mode="edge")
        acc = p[1:-1, 1:-1].copy()
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                acc = fn(acc, p[dy : dy + out.shape[0], dx : dx + out.shape[1]])
        out = acc
    return out


def dilate(m, r):
    return morph(m, r, np.maximum)


def erode(m, r):
    return morph(m, r, np.minimum)


def label(mask, min_area=1):
    """Connected components (8-conn) via PIL flood fill. Returns list of (bool mask, bbox)."""
    h, w = mask.shape
    img = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), "L").copy()  # .copy(): writable
    comps = []
    arr = np.array(img)
    val = 1
    while True:
        ys, xs = np.nonzero(arr == 255)
        if not len(ys):
            break
        ImageDraw.floodfill(img, (int(xs[0]), int(ys[0])), val, thresh=0)
        arr = np.array(img)
        m = arr == val
        if m.sum() >= min_area:
            yy, xx = np.nonzero(m)
            comps.append((m, (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)))
        val = val + 1 if val < 254 else 1
        if val == 1:  # recycle label values: freeze finished comps to 0
            arr = np.where((arr > 0) & (arr < 255), 0, arr).astype(np.uint8)
            img = Image.fromarray(arr, "L").copy()
    return comps


def outside_region(wall):
    """Background = connected to the sheet border without crossing the (1px-thickened) outline wall."""
    free = ~dilate(wall, 1)
    img = Image.fromarray(np.where(free, 255, 0).astype(np.uint8), "L").copy()
    w, h = img.size
    seeds = [(x, y) for x in range(0, w, 8) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 8) for x in (0, w - 1)]
    for s in seeds:
        if img.getpixel(s) == 255:
            ImageDraw.floodfill(img, s, 128, thresh=0)
    return np.array(img) == 128


def fit_circle_ransac(pts, rmin, rmax, iters=1500, tol=1.6):
    """RANSAC circle on edge points (x, y). Returns cx, cy, r or None."""
    if len(pts) < 20:
        return None
    best, best_in = None, 0
    n = len(pts)
    for _ in range(iters):
        a, b, c = pts[RNG.choice(n, 3, replace=False)]
        d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
        if abs(d) < 1e-6:
            continue
        ux = ((a @ a) * (b[1] - c[1]) + (b @ b) * (c[1] - a[1]) + (c @ c) * (a[1] - b[1])) / d
        uy = ((a @ a) * (c[0] - b[0]) + (b @ b) * (a[0] - c[0]) + (c @ c) * (b[0] - a[0])) / d
        r = np.hypot(a[0] - ux, a[1] - uy)
        if not (rmin <= r <= rmax):
            continue
        inl = np.abs(np.hypot(pts[:, 0] - ux, pts[:, 1] - uy) - r) < tol
        k = inl.sum()
        if k > best_in:
            best_in, best = k, inl
    if best is None:
        return None
    # algebraic least-squares refinement on inliers
    P = pts[best]
    A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]
    bb = (P ** 2).sum(1)
    cx, cy, k = np.linalg.lstsq(A, bb, rcond=None)[0]
    r = float(np.sqrt(k + cx * cx + cy * cy))
    return float(cx), float(cy), r, int(best_in)


def outer_edge_points(wall, outside, region=None):
    """Outline pixels that touch the background (the outer silhouette edge)."""
    edge = wall & dilate(outside, 1)
    if region is not None:
        edge &= region
    ys, xs = np.nonzero(edge)
    return np.c_[xs, ys].astype(float)


# --------------------------------------------------------------- processing
def cut_sheet(rgb, white_fill):
    L = lum(rgb)
    sat = rgb.max(-1) - rgb.min(-1)
    wall = L < 150
    outside = outside_region(wall)
    for _ in range(3):  # absorb 1-2px light slivers hugging the outline
        outside |= dilate(outside, 1) & ~wall & (L > 150)
    near = dilate(wall, 3)
    a_fringe = np.clip((248.0 - L) / (248.0 - 70.0), 0, 1)
    alpha = np.where(outside, np.where(near, a_fringe, 0.0), 1.0)
    # The outline's own outermost pixels are anti-aliased greys: keeping them opaque in
    # their grey reads as a light dotted halo on dark plates. Treat them as fringe:
    # solid ink colour, darkness -> alpha (marked `outside` so save_rgba inks them).
    rim = wall & dilate(outside, 1) & (L > 40)
    alpha = np.where(rim, a_fringe, alpha)
    outside = outside | rim
    # light smoothing of alpha across the outer edge band (JPEG noise)
    band = dilate(outside, 1) & dilate(wall, 2) & outside
    p = np.pad(alpha, 1, mode="edge")
    box = sum(p[dy : dy + alpha.shape[0], dx : dx + alpha.shape[1]] for dy in range(3) for dx in range(3)) / 9.0
    alpha = np.where(band, (alpha + box) / 2, alpha)
    # enclosed light, low-saturation regions: background pockets between limbs, or (for
    # white_fill characters) genuine white fills like a lab coat — decided per component later
    pockets = (~outside) & (~wall) & (L > 200) & (sat < 20)
    return alpha, wall, outside, pockets


def save_rgba(rgb, alpha, box, path, outside):
    x0, y0, x1, y1 = box
    color = np.where(outside[..., None], INK, rgb)  # fringe pixels take outline ink color
    rgba = np.dstack([color, alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)


def find_features(rgb, alpha, head):
    """Dark facial features inside the head circle: returns (eyes, mouth) component masks (crop coords)."""
    cx, cy, r = head["cx"], head["cy"], head["r"]
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w]
    inside = np.hypot(xx - cx, yy - cy) < r * 0.80  # well inside the outline ring
    dark = (lum(rgb) < 110) & inside & (alpha > 0.5)
    comps = label(dark, min_area=6)
    eyes, mouth = [], None
    for m, (x0, y0, x1, y1) in comps:
        bw, bh = x1 - x0, y1 - y0
        area = m.sum()
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        fill = area / max(1, bw * bh)
        # eyes: compact solid blobs in the upper-middle band
        if cy - 0.45 * r < my < cy + 0.15 * r and 0.6 < bw / max(1, bh) < 1.7 and fill > 0.55 and bw < 0.32 * r:
            eyes.append((m, (x0, y0, x1, y1)))
        # mouth: wide, short stroke in the lower band
        elif cy + 0.15 * r < my < cy + 0.65 * r and bw > bh * 1.8 and bw > 0.18 * r:
            if mouth is None or area > mouth[0].sum():
                mouth = (m, (x0, y0, x1, y1))
    eyes = sorted(eyes, key=lambda e: -e[0].sum())[:2]
    return eyes, mouth


def erase(rgba, mask, grow=3):
    """Paint a feature out with the surrounding face fill (median of a ring just outside it)."""
    m = dilate(mask, grow)
    ring = dilate(m, 4) & ~m & (rgba[..., 3] > 250) & (lum(rgba[..., :3].astype(np.float32)) > 150)
    if ring.sum() == 0:
        return
    col = np.median(rgba[..., :3][ring], axis=0)
    rgba[..., :3][m] = col.astype(np.uint8)


def make_variants(path, head, outdir, stem):
    base = np.array(Image.open(path).convert("RGBA"))
    eyes, mouth = find_features(base[..., :3].astype(np.float32), base[..., 3] / 255.0, head)
    made = {}
    r = head["r"]
    # blink: eyes -> closed-lid arcs of the same width
    if len(eyes) == 2:
        im = base.copy()
        for m, _ in eyes:
            erase(im, m)
        pil = Image.fromarray(im, "RGBA")
        d = ImageDraw.Draw(pil)
        for _, (x0, y0, x1, y1) in eyes:
            # closed lid: a gently downward-curving stroke, sized from the head (not the dot)
            ex, ey = (x0 + x1) / 2, (y0 + y1) / 2 + (y1 - y0) * 0.15
            ew = max((x1 - x0) * 2.0, r * 0.24)
            t = max(3, round(r * 0.06))
            d.arc([ex - ew / 2, ey - ew * 0.55, ex + ew / 2, ey + ew * 0.25], 25, 155, fill=(17, 17, 17, 255), width=t)
        p = outdir / f"{stem}__blink.png"
        pil.save(p, optimize=True)
        made["blink"] = p
    # talk: mouth -> open mouth shapes (small / wide)
    if mouth is not None:
        m, (x0, y0, x1, y1) = mouth
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        # open mouths sized from the head radius so every character reads the same
        for key, wk, hk in (("talk", 0.2, 0.12), ("talk_wide", 0.24, 0.2)):
            im = base.copy()
            erase(im, m)
            pil = Image.fromarray(im, "RGBA")
            d = ImageDraw.Draw(pil)
            ow, oh = r * wk, r * hk
            d.ellipse([mx - ow / 2, my - oh / 2, mx + ow / 2, my + oh / 2], fill=(17, 17, 17, 255))
            p = outdir / f"{stem}__{key}.png"
            pil.save(p, optimize=True)
            made[key] = p
    return made, len(eyes), mouth is not None


def process_sheet(src):
    char = src.name.split(".")[0].replace("_sheet", "")
    cfg = CAST.get(char, {"views": [], "white_fill": False, "neutral": "expr_1"})
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    H, W = rgb.shape[:2]
    alpha, wall, outside, pockets = cut_sheet(rgb, cfg["white_fill"])

    # objects = connected opaque regions (slightly dilated so hands/pen tips stay attached)
    objs = label(dilate(alpha > 0.35, 3), min_area=400)
    poses, heads, props = [], [], []
    for m, (x0, y0, x1, y1) in objs:
        bw, bh = x1 - x0, y1 - y0
        if bh > 0.45 * H:
            poses.append((m, (x0, y0, x1, y1)))
        elif 0.8 < bw / bh < 1.25 and 0.08 * H < bh < 0.32 * H:
            heads.append((m, (x0, y0, x1, y1)))
        else:
            props.append((m, (x0, y0, x1, y1)))
    poses.sort(key=lambda o: o[1][0])
    props.sort(key=lambda o: o[1][0])
    # rows: cluster by center y (row height ~ head size), then left -> right
    heads.sort(key=lambda o: (o[1][1] + o[1][3]) / 2)
    rows, cur = [], []
    for hd in heads:
        cyy = (hd[1][1] + hd[1][3]) / 2
        if cur and abs(cyy - (cur[-1][1][1] + cur[-1][1][3]) / 2) > 0.5 * (hd[1][3] - hd[1][1]):
            rows.append(cur)
            cur = []
        cur.append(hd)
    if cur:
        rows.append(cur)
    heads = [hd for row in rows for hd in sorted(row, key=lambda o: o[1][0])]

    entry = {"source": str(src.relative_to(ROOT)), "neutral": cfg["neutral"], "poses": {}, "heads": {}, "props": {}}
    pad = 4

    def crop_box(box):
        x0, y0, x1, y1 = box
        return (max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad))

    head_circles = []
    # --- poses
    for i, (m, box) in enumerate(poses, 1):
        b = crop_box(box)
        region = np.zeros_like(wall)
        top = box[1] + int(0.38 * (box[3] - box[1]))
        region[box[1] : top, box[0] : box[2]] = True
        pts = outer_edge_points(wall & dilate(m, 2), outside, region)
        ph = box[3] - box[1]
        c = fit_circle_ransac(pts, 0.06 * ph, 0.2 * ph)
        head = None
        if c:
            head = {"cx": round(c[0] - b[0], 1), "cy": round(c[1] - b[1], 1), "r": round(c[2], 1), "fit_inliers": c[3]}
            head_circles.append((c[0], c[1], c[2]))
        view = cfg["views"][i - 1] if i - 1 < len(cfg["views"]) else "front"
        name = f"pose_{i}"
        entry["poses"][name] = {"box": list(b), "head": head, "view": view, "faceOverlay": view in ("front", "three_quarter")}

    # --- clear enclosed white pockets (not inside heads) before saving
    if pockets.any():  # noqa: runs for every character; white_fill only changes which pockets survive
        yy, xx = np.mgrid[0:H, 0:W]
        in_head = np.zeros_like(wall)
        for hx, hy, hr in head_circles:
            in_head |= np.hypot(xx - hx, yy - hy) < hr
        for m, _ in heads:
            in_head |= m
        r_ref = np.median([c[2] for c in head_circles]) if head_circles else 70.0
        for pm, (px0, py0, px1, py1) in label(pockets & ~in_head, min_area=1):
            if cfg["white_fill"]:
                # Shape can't separate a narrow coat panel from a leg gap; colour can: Flow's
                # coat white is warm (~248,249,243), the sheet background is pure (~255,255,255).
                core = erode(pm, 2)
                core = core if core.sum() >= 4 else pm
                mean = rgb[core].mean(0)
                if lum(mean[None])[0] < 252.0:
                    continue  # genuine white fill → keep
            alpha[pm] = 0.0
            ring = dilate(pm, 3) & ~pm & ~wall
            alpha[ring] = np.minimum(alpha[ring], np.clip((248.0 - lum(rgb)[ring]) / 178.0, 0, 1))
            outside[ring | pm] = True

    for i, (m, box) in enumerate(poses, 1):
        name = f"pose_{i}"
        b = entry["poses"][name]["box"]
        keep = dilate(m, 2)
        p = OUT / char / "poses" / f"{name}.png"
        save_rgba(rgb, np.where(keep, alpha, 0), b, p, outside)
        ys, xs = np.nonzero((alpha > 0.5) & m)
        g = ys.max()
        fx = xs[ys > g - 12]
        e = entry["poses"][name]
        e.update({"src": str(p.relative_to(ROOT)), "w": b[2] - b[0], "h": b[3] - b[1], "anchor": {"x": int((fx.min() + fx.max()) / 2 - b[0]), "y": int(g - b[1])}})
        # Masked variant for expression overlays: clear the native head AND anything
        # protruding around it (glasses arms, hair tufts), keeping the neck below.
        # The overlaid expression head brings its own hair / glasses.
        if e["faceOverlay"] and e["head"]:
            hcx, hcy, hr = e["head"]["cx"] + b[0], e["head"]["cy"] + b[1], e["head"]["r"]
            yy, xx = np.mgrid[0:H, 0:W]
            clear = (np.hypot(xx - hcx, yy - hcy) < hr * 1.42) & (yy < hcy + hr * 0.78)
            mp = OUT / char / "poses" / f"{name}__masked.png"
            save_rgba(rgb, np.where(keep & ~clear, alpha, 0), b, mp, outside)
            e["masked"] = str(mp.relative_to(ROOT))
        del e["box"]

    # --- expression heads
    for i, (m, box) in enumerate(heads, 1):
        b = crop_box(box)
        pts = outer_edge_points(wall & dilate(m, 2), outside)
        bh = box[3] - box[1]
        c = fit_circle_ransac(pts, 0.3 * bh, 0.56 * bh)
        name = f"expr_{i}"
        p = OUT / char / "heads" / f"{name}.png"
        save_rgba(rgb, np.where(dilate(m, 2), alpha, 0), b, p, outside)
        e = {"src": str(p.relative_to(ROOT)), "w": b[2] - b[0], "h": b[3] - b[1]}
        if c:
            e["head"] = {"cx": round(c[0] - b[0], 1), "cy": round(c[1] - b[1], 1), "r": round(c[2], 1), "fit_inliers": c[3]}
        entry["heads"][name] = e

    # --- props
    for i, (m, box) in enumerate(props, 1):
        b = crop_box(box)
        name = f"prop_{i}"
        p = OUT / char / "props" / f"{name}.png"
        save_rgba(rgb, np.where(dilate(m, 2), alpha, 0), b, p, outside)
        entry["props"][name] = {"src": str(p.relative_to(ROOT)), "w": b[2] - b[0], "h": b[3] - b[1], "anchor": {"x": (b[2] - b[0]) // 2, "y": b[3] - b[1]}}

    # --- variants from the neutral face
    nk = entry["neutral"]
    ne = entry["heads"].get(nk)
    if ne and ne.get("head"):
        made, n_eyes, has_mouth = make_variants(ROOT / ne["src"], ne["head"], OUT / char / "heads", nk)
        ne["variants"] = {k: str(v.relative_to(ROOT)) for k, v in made.items()}
        ne["_variant_detection"] = {"eyes": n_eyes, "mouth": has_mouth}

    print(f"{char}: {len(poses)} poses, {len(heads)} heads, {len(props)} props; neutral {nk} variants {list((ne or {}).get('variants', {}))}")
    for k, v in entry["poses"].items():
        print(f"   {k} {v['view']:<13} head {v['head']}")
    return char, entry


def main():
    sheets = sorted(p for p in RAW.glob("*_sheet.*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    m = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    chars = {}
    for s in sheets:
        k, e = process_sheet(s)
        chars[k] = e
    m["characters"] = chars
    m.setdefault("version", 1)
    MANIFEST.write_text(json.dumps(m, indent=2) + "\n")


if __name__ == "__main__":
    main()
