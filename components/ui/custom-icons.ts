/**
 * AtomIQ's own icons, drawn in the Iconsax "Bold" style so they sit next to the library's: a 24 x 24
 * grid with about 2 units of margin, solid shapes with rounded ends, details cut out as negative
 * space (evenodd), and a faded 0.4 layer where the library uses one (Bulk). Used where the library has
 * nothing that says the thing (the sort legends: atoms, nucleus, isotopes, radiation...).
 *
 * Names start with `Aq` so they can never clash with an Iconsax export. `Icon` draws them like any
 * other name; only the Bold look exists, so any `variant` asked for draws Bold. Pure data and maths (no
 * imports), so Node checks and tests can read it: `scripts/test-custom-icons.mjs`; a contact sheet to
 * look at them: `node scripts/render-custom-icons.mjs <dir>`.
 *
 * Every path uses absolute coordinates only (M L C Q Z), so its bounds can be checked by reading
 * the numbers in pairs.
 */

export interface CustomIconShape {
  /** SVG path data, absolute coordinates, 24 x 24 grid. */
  d: string;
  /** Subpaths cut holes in each other (a ring, a cut-out detail). */
  evenOdd?: boolean;
  /** 0 to 1; the faded layer of a "this, but not" icon. Omitted: solid. */
  opacity?: number;
}

export interface CustomIcon {
  shapes: readonly CustomIconShape[];
}

// -- geometry -----------------------------------------------------------------------------------

type Pt = readonly [number, number];

const n2 = (n: number) => String(Math.round(n * 100) / 100);
const p2 = (p: Pt) => `${n2(p[0])} ${n2(p[1])}`;
/** Cubic Bezier control distance for a quarter circle. */
const K = 0.5522847498;

/** An ellipse as four cubic curves, turned by `rot` radians about its centre. */
function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const T = (x: number, y: number): Pt => [cx + x * c - y * s, cy + x * s + y * c];
  return (
    `M${p2(T(rx, 0))}` +
    `C${p2(T(rx, ry * K))} ${p2(T(rx * K, ry))} ${p2(T(0, ry))}` +
    `C${p2(T(-rx * K, ry))} ${p2(T(-rx, ry * K))} ${p2(T(-rx, 0))}` +
    `C${p2(T(-rx, -ry * K))} ${p2(T(-rx * K, -ry))} ${p2(T(0, -ry))}` +
    `C${p2(T(rx * K, -ry))} ${p2(T(rx, -ry * K))} ${p2(T(rx, 0))}Z`
  );
}

const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

/** A ring (an ellipse with an ellipse cut out of it, `t` thick). */
const ring = (cx: number, cy: number, rx: number, ry: number, t: number, rot = 0): CustomIconShape => ({
  d: ellipse(cx, cy, rx, ry, rot) + ellipse(cx, cy, rx - t, ry - t, rot),
  evenOdd: true,
});

/** A point on a turned ellipse, for placing something on an orbit. */
function onEllipse(cx: number, cy: number, rx: number, ry: number, rot: number, angle: number): Pt {
  const x = rx * Math.cos(angle);
  const y = ry * Math.sin(angle);
  return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
}

/** A line with round ends, `w` thick. */
function capsule(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const r = w / 2;
  const nx = -uy;
  const ny = ux;
  const A: Pt = [x1, y1];
  const B: Pt = [x2, y2];
  const at = (b: Pt, a: number, c: number): Pt => [b[0] + ux * r * a + nx * r * c, b[1] + uy * r * a + ny * r * c];
  return (
    `M${p2(at(A, 0, 1))}L${p2(at(B, 0, 1))}` +
    `C${p2(at(B, K, 1))} ${p2(at(B, 1, K))} ${p2(at(B, 1, 0))}` +
    `C${p2(at(B, 1, -K))} ${p2(at(B, K, -1))} ${p2(at(B, 0, -1))}` +
    `L${p2(at(A, 0, -1))}` +
    `C${p2(at(A, -K, -1))} ${p2(at(A, -1, -K))} ${p2(at(A, -1, 0))}` +
    `C${p2(at(A, -1, K))} ${p2(at(A, -K, 1))} ${p2(at(A, 0, 1))}Z`
  );
}

/** A rectangle with rounded corners. */
function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const k = r * K;
  return (
    `M${n2(x + r)} ${n2(y)}L${n2(x + w - r)} ${n2(y)}` +
    `C${n2(x + w - r + k)} ${n2(y)} ${n2(x + w)} ${n2(y + r - k)} ${n2(x + w)} ${n2(y + r)}` +
    `L${n2(x + w)} ${n2(y + h - r)}` +
    `C${n2(x + w)} ${n2(y + h - r + k)} ${n2(x + w - r + k)} ${n2(y + h)} ${n2(x + w - r)} ${n2(y + h)}` +
    `L${n2(x + r)} ${n2(y + h)}` +
    `C${n2(x + r - k)} ${n2(y + h)} ${n2(x)} ${n2(y + h - r + k)} ${n2(x)} ${n2(y + h - r)}` +
    `L${n2(x)} ${n2(y + r)}` +
    `C${n2(x)} ${n2(y + r - k)} ${n2(x + r - k)} ${n2(y)} ${n2(x + r)} ${n2(y)}Z`
  );
}

const polygon = (pts: readonly Pt[]) => `M${pts.map(p2).join("L")}Z`;

/** A starburst: `n` spikes, tips at `R`, valleys at `r`. */
function burst(cx: number, cy: number, R: number, r: number, n: number, rot = -Math.PI / 2): string {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rad = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return polygon(pts);
}

/** A four-point sparkle with curved sides; `k` is how full the sides are. */
function sparkle(cx: number, cy: number, R: number, k = 0.24): string {
  const q = R * k;
  return (
    `M${n2(cx)} ${n2(cy - R)}Q${n2(cx + q)} ${n2(cy - q)} ${n2(cx + R)} ${n2(cy)}` +
    `Q${n2(cx + q)} ${n2(cy + q)} ${n2(cx)} ${n2(cy + R)}` +
    `Q${n2(cx - q)} ${n2(cy + q)} ${n2(cx - R)} ${n2(cy)}` +
    `Q${n2(cx - q)} ${n2(cy - q)} ${n2(cx)} ${n2(cy - R)}Z`
  );
}

/** A sine wave as a band `t` thick, from x0 to x1, `cycles` full waves, starting upward. */
function wave(x0: number, x1: number, cy: number, amp: number, cycles: number, t: number): string {
  const N = 56;
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  const f = (x: number) => cy - amp * Math.sin(((x - x0) / (x1 - x0)) * cycles * Math.PI * 2);
  for (let i = 0; i <= N; i++) {
    const x = x0 + ((x1 - x0) * i) / N;
    const dx = (x1 - x0) / N;
    const slope = (f(x + dx) - f(x - dx)) / (2 * dx);
    const len = Math.hypot(1, slope);
    // The normal of the curve, half the thickness each way
    const nx = (-slope / len) * (t / 2);
    const ny = (1 / len) * (t / 2);
    top.push([x - nx, f(x) - ny]);
    bottom.push([x + nx, f(x) + ny]);
  }
  return polygon([...top, ...bottom.reverse()]);
}

/** A slash through an icon: the "not" of the faded icon under it. */
const SLASH: CustomIconShape = { d: capsule(4.2, 4.2, 19.8, 19.8, 2.4) };

/** The faded copy of an icon's shapes (the library's Bulk 0.4 layer). */
const faded = (shapes: readonly CustomIconShape[]): CustomIconShape[] => shapes.map((s) => ({ ...s, opacity: 0.4 }));

// -- the pictures ---------------------------------------------------------------------------------

const ATOM: CustomIconShape[] = [
  { d: circle(12, 12, 2.7) },
  ring(12, 12, 9.8, 3.8, 1.45, 0),
  ring(12, 12, 9.8, 3.8, 1.45, Math.PI / 3),
  ring(12, 12, 9.8, 3.8, 1.45, (2 * Math.PI) / 3),
];

/** A square tile with a letter cut out of it (an element's symbol). */
const TILE = roundRect(2.5, 2.5, 19, 19, 5);
/** A "C": a thick arc open on the right. */
function letterC(cx: number, cy: number, R: number, r: number, openDeg = 38): string {
  const open = (openDeg * Math.PI) / 180;
  const N = 24;
  const outer: Pt[] = [];
  const inner: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const a = open + ((Math.PI * 2 - open * 2) * i) / N;
    outer.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    inner.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return polygon([...outer, ...inner.reverse()]);
}
const CARBON: CustomIconShape[] = [{ d: TILE + letterC(12, 12, 6.2, 3.7), evenOdd: true }];

/** An element's tile (9.6 wide) with its letter cut out: a "C" or an "O". */
function elementTile(x: number, letter: "C" | "O"): string {
  const cx = x + 4.8;
  const mark = letter === "C" ? letterC(cx, 12, 3.9, 2.2, 42) : ellipse(cx, 12, 3.9, 3.9) + ellipse(cx, 12, 2.2, 2.2);
  return roundRect(x, 5, 9.6, 14, 3) + mark;
}

/** A path mirrored left to right across the 24 grid (every coordinate is a pair, absolute commands only). */
const mirrorX = (d: string) => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x: string, y: string) => `${n2(24 - Number(x))} ${y}`);

const BROW = "M2.6 13.4C3.4 9 7 6.6 11 7.8C11.9 8.1 11.9 9.6 10.8 9.9C8 10.5 5.7 11.8 5 14C4.6 15.2 2.4 14.6 2.6 13.4Z";

// -- the set ----------------------------------------------------------------------------------------

export const CUSTOM_ICONS: Readonly<Record<string, CustomIcon>> = {
  /** An atom: a nucleus and three orbits. */
  AqAtom: { shapes: ATOM },
  /** Not an atom: the atom faded, struck through. */
  AqAtomOff: { shapes: [...faded(ATOM), SLASH] },

  /** The nucleus: a tight cluster of protons and neutrons, each with a little shine cut out. */
  AqNucleus: {
    shapes: [
      { d: circle(7.5, 9.2, 4.3) + circle(6.2, 7.9, 1.05), evenOdd: true },
      { d: circle(16.5, 9.2, 4.3) + circle(15.2, 7.9, 1.05), evenOdd: true },
      { d: circle(12, 16.9, 4.3) + circle(10.7, 15.6, 1.05), evenOdd: true },
    ],
  },
  /** Outside the nucleus: a small nucleus with an electron out on its orbit. */
  AqOrbit: {
    shapes: [
      { d: circle(12, 12, 2.5) },
      ring(12, 12, 9.8, 5, 1.6, -Math.PI / 6),
      (() => {
        const [x, y] = onEllipse(12, 12, 8.9, 4.2, -Math.PI / 6, -0.9);
        return { d: circle(x, y, 2.3) };
      })(),
    ],
  },

  /** Carbon: the element's tile with its letter. */
  AqCarbon: { shapes: CARBON },
  /** Not carbon: the tile faded, struck through. */
  AqCarbonOff: { shapes: [...faded(CARBON), SLASH] },

  /** Stable: the nucleus held calmly inside a closed ring. */
  AqStable: { shapes: [ring(12, 12, 9.8, 9.8, 1.7), { d: circle(12, 12, 5) }] },
  /** Unstable: the nucleus bursting. */
  AqUnstable: { shapes: [{ d: burst(12, 12, 10, 6, 8) + circle(12, 12, 2.6), evenOdd: true }] },

  /** Isotopes: the same element twice (two carbon tiles). */
  AqSameElement: { shapes: [{ d: elementTile(1.8, "C") + elementTile(12.6, "C"), evenOdd: true }] },
  /** Different elements: two tiles with different letters (carbon and oxygen). */
  AqDiffElement: { shapes: [{ d: elementTile(1.8, "C") + elementTile(12.6, "O"), evenOdd: true }] },

  /** Found in nature: a leaf with its vein and stem. */
  AqLeaf: {
    shapes: [
      {
        d: "M20.6 3.4C11.4 3.2 4.7 7.9 4.7 14.7C4.7 18.1 7.6 21 11.2 21C17.6 21 20.6 14.5 20.6 3.4Z" + capsule(8.4, 16.2, 15.6, 9, 1.3),
        evenOdd: true,
      },
      { d: capsule(3.8, 21.1, 8.2, 16.7, 1.9) },
    ],
  },
  /** Made by people: a lab flask with its liquid. */
  AqFlask: {
    shapes: [
      {
        d:
          roundRect(8, 2, 8, 2, 1) +
          "M9.8 4.6L14.2 4.6L14.2 9.4L20 18.4C21.1 20.3 19.7 22 17.7 22L6.3 22C4.3 22 2.9 20.3 4 18.4L9.8 9.4Z" +
          roundRect(8.6, 13.6, 6.8, 1.5, 0.75) +
          circle(11, 18.3, 1.15) +
          circle(14.2, 17.7, 0.85),
        evenOdd: true,
      },
    ],
  },

  /** A particle: a ball flying, with its speed lines. */
  AqParticle: {
    shapes: [
      { d: circle(16.2, 12, 5.4) + circle(14.6, 10.4, 1.2), evenOdd: true },
      { d: capsule(2.6, 12, 8.4, 12, 1.8) },
      { d: capsule(4.6, 8, 8.6, 8, 1.8) },
      { d: capsule(4.6, 16, 8.6, 16, 1.8) },
    ],
  },
  /** Electromagnetic radiation: a wave. */
  AqWave: { shapes: [{ d: wave(3, 21, 12, 5.6, 2, 2.1) }] },

  /** Natural radioactivity: the ground it comes out of, a rocky ridge. */
  AqMountain: {
    shapes: [
      {
        d: "M2.7 19.2L9 8.1C9.5 7.2 10.6 7.2 11.1 8.1L14.3 13.6L15.9 10.9C16.4 10 17.5 10 18 10.9L21.3 19.2C21.6 20.2 21 21 20 21L4 21C3 21 2.4 20.2 2.7 19.2Z",
      },
    ],
  },
  /** The face parts of the shop (the library has none of these): eyebrows, a nose, a mouth, an ear. */
  AqEyebrow: { shapes: [{ d: BROW }, { d: mirrorX(BROW) }] },
  AqNose: {
    shapes: [
      {
        d: "M10.4 3C10.4 2.4 13.6 2.4 13.6 3L14.2 12.5C17.8 13 20 15.2 20 17.6C20 20 17 21 12 21C7 21 4 20 4 17.6C4 15.2 6.2 13 9.8 12.5Z" + ellipse(8.7, 17.6, 1.7, 1.2, -0.3) + ellipse(15.3, 17.6, 1.7, 1.2, 0.3),
        evenOdd: true,
      },
    ],
  },
  AqMouth: {
    shapes: [
      {
        d: "M3 10.5C3 9.5 4.4 9.2 5.1 10C6.8 12.2 9.2 13.3 12 13.3C14.8 13.3 17.2 12.2 18.9 10C19.6 9.2 21 9.5 21 10.5C21 15.5 16.8 19.5 12 19.5C7.2 19.5 3 15.5 3 10.5Z" + ellipse(12, 17.6, 3.4, 1.6),
        evenOdd: true,
      },
    ],
  },
  AqEar: {
    shapes: [
      {
        d:
          "M11 2.6C6.6 2.6 4 6 4 10.2C4 13.4 5.4 15.2 7 16.8C8.4 18.2 8.8 20.4 11 21C13.6 21.6 15.8 20 15.6 17.6C15.5 16.2 16.4 15.4 17.6 14.2C19.2 12.6 20 10.6 20 8.8C20 5.2 16.2 2.6 11 2.6Z" +
          "M11.4 6C8.8 6 7 8 7 10.4C7 12.2 7.8 13.2 8.8 14.4C9.8 15.6 10 16.8 11 17.4C12.4 18.2 13.6 17.4 13.6 16.2C13.6 14.8 15.2 14 16 12.4C16.4 11.6 16.6 10.8 16.6 10C16.6 7.6 14.6 6 11.4 6Z",
        evenOdd: true,
      },
      // The curl inside the ear, a bent bar
      { d: capsule(12.6, 8.4, 10.4, 10.6, 1.9) },
      { d: capsule(10.4, 10.6, 11.8, 13.6, 1.9) },
    ],
  },
  /** The accessories of the shop: a hat, glasses, an earring, a shirt. */
  // Hair: a dome of hair with a swept fringe and two locks, the face a notch between them
  AqHair: { shapes: [{ d: "M12 3C7 3 3.5 7.2 3.5 12.4L3.5 19.4C3.5 20.3 4.2 21 5.1 21L6.7 21C7.6 21 8.3 20.3 8.3 19.4L8.3 13.6C11.4 13.4 14.2 11.6 15.7 8.9L15.7 19.4C15.7 20.3 16.4 21 17.3 21L18.9 21C19.8 21 20.5 20.3 20.5 19.4L20.5 12.4C20.5 7.2 17 3 12 3Z" }] },
  AqHat: { shapes: [{ d: "M4 15.4C4 9.4 7.6 5.6 12 5.6C16.4 5.6 20 9.4 20 15.4Z" + circle(12, 4.2, 1.7) }, { d: roundRect(2.5, 16.8, 19, 3.4, 1.7) }] },
  AqGlasses: { shapes: [ring(6.8, 13.2, 4.9, 4.9, 2), ring(17.2, 13.2, 4.9, 4.9, 2), { d: capsule(11, 12.2, 13, 12.2, 1.8) }] },
  AqEarring: { shapes: [{ d: capsule(12, 4.8, 12, 9.6, 2.4) }, ring(12, 15, 6, 6, 2.1)] },
  AqShirt: {
    shapes: [{ d: "M8.5 3.5L3 6.5L5 11L7.6 10L7.6 20.4C7.6 21 8 21.4 8.6 21.4L15.4 21.4C16 21.4 16.4 21 16.4 20.4L16.4 10L19 11L21 6.5L15.5 3.5C15.5 5.2 13.9 6.2 12 6.2C10.1 6.2 8.5 5.2 8.5 3.5Z" }],
  },
  /** Cosmic radiation: a bright star with a small one. */
  AqCosmic: { shapes: [{ d: sparkle(10.2, 13.4, 8.6, 0.27) }, { d: sparkle(19, 5.4, 3.2, 0.27) }, { d: circle(20.2, 16.6, 1.2) }] },
};

/** Every custom icon name. */
export const CUSTOM_ICON_NAMES: readonly string[] = Object.keys(CUSTOM_ICONS);

export function isCustomIconName(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(CUSTOM_ICONS, name);
}
