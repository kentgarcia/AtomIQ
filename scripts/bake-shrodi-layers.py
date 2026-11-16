#!/usr/bin/env python3
"""Bake assets/images/mascot/layers/*.svg into components/mascot/shrodi-shapes.ts.

The layer files are the designer's shapes (head base, white inner base with the eye
ovals fused in, one ear). This converts their paths to absolute cubic segments in
Shrodi's own units (head about 130 wide) so the art stays pure data. The layer art is a
drawn tilted about 10.5 degrees; every shape is rotated back upright by that angle about
the head's centre (the outline itself is untouched, so it keeps its character). Both eye
whites use the same oval, and the left ear is the exact mirror of the right one.
Re-run after editing a layer:  python3 scripts/bake-shrodi-layers.py
"""
import re, os

ROOT = os.path.join(os.path.dirname(__file__), "..")
LAYERS = os.path.join(ROOT, "assets", "images", "mascot", "layers")
OUT = os.path.join(ROOT, "components", "mascot", "shrodi-shapes.ts")

# Layer coordinates -> Shrodi units: u = (x - CX) * K, v = (y - TOP) * K + TOP_V.
K, TOP_V = 0.5, -49.0
EYE_X = 21.5   # distance of each eye from the middle, in Shrodi units

def tokens(d):
    for m in re.finditer(r"([A-Za-z])|(-?\d*\.?\d+(?:e-?\d+)?)", d):
        yield m.group(1) or float(m.group(2))

def to_cubics(d):
    """Absolute path as [x0, y0, c1x, c1y, c2x, c2y, x, y, ...] (L becomes a straight cubic)."""
    t = list(tokens(d)); i = 0; cmd = None
    cx = cy = sx = sy = 0.0; out = []
    def num():
        nonlocal i
        v = t[i]; i += 1; return v
    while i < len(t):
        if isinstance(t[i], str):
            cmd = t[i]; i += 1
            if cmd in "Zz":
                if (cx, cy) != (sx, sy):
                    out += [cx + (sx - cx) / 3, cy + (sy - cy) / 3, cx + 2 * (sx - cx) / 3, cy + 2 * (sy - cy) / 3, sx, sy]
                cx, cy = sx, sy
                continue
        rel = cmd.islower(); c = cmd.upper()
        ox, oy = (cx, cy) if rel else (0.0, 0.0)
        if c == "M":
            cx, cy = num() + ox, num() + oy; sx, sy = cx, cy; out = [cx, cy]; cmd = "l" if rel else "L"
        elif c == "L":
            x, y = num() + ox, num() + oy
            out += [cx + (x - cx) / 3, cy + (y - cy) / 3, cx + 2 * (x - cx) / 3, cy + 2 * (y - cy) / 3, x, y]; cx, cy = x, y
        elif c == "C":
            a = [num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy]
            out += a; cx, cy = a[4], a[5]
        else:
            raise SystemExit(f"unsupported path command {cmd}")
    return out

def affine(pts, m):
    a, b, c, d, e, f = m
    r = []
    for i in range(0, len(pts), 2):
        x, y = pts[i], pts[i + 1]
        r += [a * x + c * y + e, b * x + d * y + f]
    return r

def to_units(pts):
    r = []
    for i in range(0, len(pts), 2):
        r += [round((pts[i] - CX) * K, 1), round((pts[i + 1] - TOP) * K + TOP_V, 1)]
    return r

import math

def sample(pts, n=30):
    """Polyline through a baked cubic list."""
    out = [(pts[0], pts[1])]
    for i in range(2, len(pts), 6):
        x0, y0 = out[-1]
        c1x, c1y, c2x, c2y, x, y = pts[i:i + 6]
        for k in range(1, n + 1):
            t = k / n; u = 1 - t
            out.append((u**3*x0 + 3*u*u*t*c1x + 3*u*t*t*c2x + t**3*x, u**3*y0 + 3*u*u*t*c1y + 3*u*t*t*c2y + t**3*y))
    return out

def poly_bounds(poly):
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    return min(xs), min(ys), max(xs), max(ys)

def row_width(poly, y):
    """Total span of the shape on the horizontal line y (min to max crossing)."""
    xs = []
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 <= y < y1) or (y1 <= y < y0):
            xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
    return (max(xs) - min(xs)) if xs else 0.0

def symmetric(poly, rows=26):
    """A left/right symmetric, smooth closed outline with the same width on every row."""
    x0, y0, x1, y1 = poly_bounds(poly)
    ys = [y0 + (y1 - y0) * (1 - math.cos(math.pi * i / rows)) / 2 for i in range(rows + 1)]
    half = [row_width(poly, min(max(y, y0 + 1e-6), y1 - 1e-6)) / 2 for y in ys]
    half[0] = half[-1] = 0.0
    for _ in range(3):   # smooth the widths: the layer's cheek notch would otherwise leave bumps
        half = [half[0]] + [(half[i - 1] + 2 * half[i] + half[i + 1]) / 4 for i in range(1, len(half) - 1)] + [half[-1]]
    right = [(h, y) for h, y in zip(half, ys)]
    left = [(-h, y) for h, y in reversed(list(zip(half, ys)))][1:-1]
    return right + left   # closed loop, starting at the top pole going down the right side

def smooth_closed(points):
    """Catmull-Rom through a closed loop, as [x0, y0, (c1, c2, p)...] cubics."""
    n = len(points)
    out = [points[0][0], points[0][1]]
    for i in range(n):
        p0, p1, p2, p3 = points[(i - 1) % n], points[i], points[(i + 1) % n], points[(i + 2) % n]
        out += [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]]
    return out

def rnd(p): return [round(v, 1) for v in p]
def mirror(p): return [(-v if i % 2 == 0 else v) for i, v in enumerate(p)]
def arr(p): return "[" + ", ".join(f"{v:g}" for v in p) + "]"

def paths_of(name):
    s = open(os.path.join(LAYERS, name)).read()
    return [m.group(1) for m in re.finditer(r'<path\b[^>]*?\sd="([^"]+)"', s, re.S)]

# ---- head base and muzzle: rotated upright ---------------------------------
TILT = -10.5   # degrees; measured as the angle that makes the head's row midpoints vertical

head_raw0 = to_cubics(paths_of("head_base.svg")[0])
_hp = sample(head_raw0)
_x0, _y0, _x1, _y1 = poly_bounds(_hp)
PX, PY = (_x0 + _x1) / 2, (_y0 + _y1) / 2             # rotate about the head's centre

def rotate(pts, deg=TILT, px=PX, py=PY):
    r = math.radians(deg); c, sn = math.cos(r), math.sin(r)
    out = []
    for i in range(0, len(pts), 2):
        x, y = pts[i] - px, pts[i + 1] - py
        out += [px + x * c - y * sn, py + x * sn + y * c]
    return out

head_rot = rotate(head_raw0)
hpoly = sample(head_rot)
hx0, hy0, hx1, hy1 = poly_bounds(hpoly)
# The head's vertical axis: the mean of its row midpoints.
_mids = []
for _k in range(10, 91):
    _y = hy0 + (hy1 - hy0) * _k / 100
    _xs = [x0 + (_y - y0) * (x1 - x0) / (y1 - y0) for (x0, y0), (x1, y1) in zip(hpoly, hpoly[1:] + hpoly[:1]) if (y0 <= _y < y1) or (y1 <= _y < y0)]
    if _xs: _mids.append((max(_xs) + min(_xs)) / 2)
CX, TOP = sum(_mids) / len(_mids), hy0

def ty(y): return (y - TOP) * K + TOP_V
def tx(x): return (x - CX) * K

def to_units(pts):
    r = []
    for i in range(0, len(pts), 2): r += [tx(pts[i]), ty(pts[i + 1])]
    return r

inner_paths = paths_of("head_white_inner.svg")
muzzle_rot = rotate(affine(to_cubics(inner_paths[0]), (1, 0, 0, 1, 0.461, 2.306)))
head = rnd(to_units(head_rot))
_mq = sample(muzzle_rot); _a, _, _b, _ = poly_bounds(_mq)
MUZZLE_DX = -tx((_a + _b) / 2)   # centre the muzzle under the face (x = 0) so the mouth is centred on it
inner = rnd([v + MUZZLE_DX if i % 2 == 0 else v for i, v in enumerate(to_units(muzzle_rot))])

# ---- eye whites: one oval, mirrored ----------------------------------------
def centre(raw):
    q = sample(raw); a0, b0, a1, b1 = poly_bounds(q); return (a0 + a1) / 2, (b0 + b1) / 2, a1 - a0, b1 - b0

def upright_oval(raw):
    """The oval about its own centre, untilted by the layer's tilt."""
    cxo, cyo, _, _ = centre(raw)
    return rotate(raw, TILT, cxo, cyo)

oval_raw = upright_oval(to_cubics(inner_paths[2]))
ocx, ocy, ow_raw, oh_raw = centre(oval_raw)
# Eye height: the two rotated oval centres, averaged (they are level once the tilt is removed).
_c1 = rotate(list(centre(to_cubics(inner_paths[1]))[:2]))
_c2 = rotate(list(centre(to_cubics(inner_paths[2]))[:2]))
eye_y = ty((_c1[1] + _c2[1]) / 2)
oval_r = rnd([(v - ocx) * K + EYE_X if i % 2 == 0 else (v - ocy) * K + eye_y for i, v in enumerate(oval_raw)])
oval_l = rnd(mirror(oval_r))
ow, oh = ow_raw * K, oh_raw * K

# ---- ear: the drawn ear on the right, its mirror on the left ----------------
ear_paths = paths_of("ear.svg")
M2 = (-1.10584, 0, 0, 0.99887, 580.55, 3.33)         # how discover.svg places this ear
ear_outer_r = rnd(to_units(rotate(affine(to_cubics(ear_paths[0]), M2))))
ear_inner_r = rnd(to_units(rotate(affine(to_cubics(ear_paths[1]), M2))))
# The ear's straight base edge is hidden behind the head; it turns about the middle of that edge.
pivot_r = [round((ear_outer_r[6] + ear_outer_r[12]) / 2, 1), round((ear_outer_r[7] + ear_outer_r[13]) / 2, 1)]

src = f"""/**
 * Shrodi's head shapes, baked from assets/images/mascot/layers/*.svg by
 * scripts/bake-shrodi-layers.py (do not edit by hand; edit the layer and re-run).
 *
 * Each shape is [x0, y0, then (c1x, c1y, c2x, c2y, x, y) per cubic segment], in Shrodi's
 * units. The head base and the muzzle (`HEAD_INNER`) are rotated upright about the
 * head's vertical axis (x = 0); the eye whites are part of the inner base (both the same oval, mirrored): the
 * white in the glasses is the inner base, and the pupils are the only eyes.
 */

export const HEAD_BASE = {arr(head)} as const;
export const HEAD_INNER = {arr(inner)} as const;
/** The two eye whites (drawn as part of the inner base, and the clip for pupils and lids). */
export const EYE_WHITE_L = {arr(oval_l)} as const;
export const EYE_WHITE_R = {arr(oval_r)} as const;
export const EYE_BOX_L = {{ cx: {-EYE_X:g}, cy: {eye_y:.1f}, w: {ow:.1f}, h: {oh:.1f} }} as const;
export const EYE_BOX_R = {{ cx: {EYE_X:g}, cy: {eye_y:.1f}, w: {ow:.1f}, h: {oh:.1f} }} as const;
/** The ear as drawn (viewer's right); the left ear is its exact mirror. */
export const EAR_OUTER_R = {arr(ear_outer_r)} as const;
export const EAR_INNER_R = {arr(ear_inner_r)} as const;
export const EAR_OUTER_L = {arr(mirror(ear_outer_r))} as const;
export const EAR_INNER_L = {arr(mirror(ear_inner_r))} as const;
/** Where an ear turns (the middle of its hidden base edge), viewer's right; the left is mirrored. */
export const EAR_PIVOT_R = {{ x: {pivot_r[0]:g}, y: {pivot_r[1]:g} }} as const;
"""
open(OUT, "w").write(src)
print("wrote", OUT)
_mx0, _, _mx1, _ = poly_bounds(sample(muzzle_rot))
print("muzzle centre x (units)", round(((_mx0 + _mx1) / 2 - CX) * K, 1), "head width", round((hx1 - hx0) * K, 1))
print("head half-width", round((hx1 - hx0) * K / 2, 1), "head top", TOP_V, "eye", eye_y, "oval", round(ow, 1), round(oh, 1), "ear pivot", pivot_r)
