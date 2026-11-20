// Generates components/map/world-art.ts: a flat, simple world map as vector path data.
//
//   node scripts/build-world-map.mjs [path/to/ne_110m_land.geojson]
//
// Source: Natural Earth 110m land polygons (public domain, https://www.naturalearthdata.com).
// Steps: fetch the GeoJSON, drop Antarctica, project (Robinson), simplify (Douglas-Peucker),
// drop specks, round every corner with quadratic curves through the edge midpoints, and write
// the TS file. The projection code is written ONCE (PRELUDE below): it is what ends up in
// world-art.ts and also what this script projects with, so the two can never drift apart.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";

const URL_SRC =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson";
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../components/map/world-art.ts"
);

const WIDTH = 1000;
const LAT_TOP = 84; // the pole above this is cropped
const LAT_BOTTOM = -58; // Antarctica below this is cropped
const TOLERANCE = 1.45; // Douglas-Peucker, in viewBox units
const MIN_AREA = 6; // smallest landmass kept, in square viewBox units
const ROUND = 1; // decimals

// ---- the part that is written into world-art.ts -----------------------------------------------

const PRELUDE = `// Robinson projection tables, every 5 degrees of latitude from 0 to 90.
const ROBINSON_LEN = [
  1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986,
  0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322,
];
const ROBINSON_DIST = [
  0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903,
  0.8435, 0.8936, 0.9394, 0.9761, 1,
];

const MAP_WIDTH = ${WIDTH};
const MAP_LAT_TOP = ${LAT_TOP};
const MAP_LAT_BOTTOM = ${LAT_BOTTOM};

/** Robinson table value at a latitude, by cubic (Catmull-Rom) interpolation between the rows. */
function robinsonRow(table: number[], absLat: number, odd: boolean): number {
  const p = Math.min(Math.max(absLat, 0), 90) / 5;
  const i = Math.min(Math.floor(p), 17);
  const t = p - i;
  const p1 = table[i];
  const p2 = table[i + 1];
  const p3 = table[Math.min(i + 2, 18)];
  // past the equator the table mirrors (an odd function for the distances, even for the lengths)
  const a = i === 0 ? (odd ? -table[1] : table[1]) : table[i - 1];
  return (
    0.5 *
    (2 * p1 + (-a + p2) * t + (2 * a - 5 * p1 + 4 * p2 - p3) * t * t + (-a + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}

const ROBINSON_SCALE = MAP_WIDTH / (2 * 0.8487 * Math.PI);
const ROBINSON_TOP = 1.3523 * ROBINSON_SCALE * robinsonRow(ROBINSON_DIST, MAP_LAT_TOP, true);
const ROBINSON_BOTTOM = 1.3523 * ROBINSON_SCALE * robinsonRow(ROBINSON_DIST, -MAP_LAT_BOTTOM, true);

/** Height of the viewBox, in the same units as the width. */
const MAP_HEIGHT = Math.round(ROBINSON_TOP + ROBINSON_BOTTOM);

/**
 * Where a place is on the map, in viewBox units (x to the right, y down). Same projection as the
 * land paths: Robinson, centred on the Greenwich meridian.
 */
export function project(lon: number, lat: number): { x: number; y: number } {
  const a = Math.abs(lat);
  const len = robinsonRow(ROBINSON_LEN, a, false);
  const dist = robinsonRow(ROBINSON_DIST, a, true);
  const x = MAP_WIDTH / 2 + (lon / 180) * (MAP_WIDTH / 2) * len;
  const yUp = 1.3523 * ROBINSON_SCALE * dist * (lat < 0 ? -1 : 1);
  return { x, y: ROBINSON_TOP - yUp };
}

/** The place under a point of the map (the inverse of project), found by bisection on latitude. */
export function unproject(x: number, y: number): { lon: number; lat: number } {
  const yUp = ROBINSON_TOP - y;
  let lo = -90;
  let hi = 90;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const midY = 1.3523 * ROBINSON_SCALE * robinsonRow(ROBINSON_DIST, Math.abs(mid), true) * (mid < 0 ? -1 : 1);
    if (midY < yUp) lo = mid;
    else hi = mid;
  }
  const lat = (lo + hi) / 2;
  const len = robinsonRow(ROBINSON_LEN, Math.abs(lat), false);
  const lon = ((x - MAP_WIDTH / 2) / ((MAP_WIDTH / 2) * len)) * 180;
  return { lon, lat };
}
`;

// load the prelude as real code so this script projects with exactly what ships
const moduleSrc = stripTypeScriptTypes(PRELUDE.replace(/^const /gm, "export const ").replace(/^function /gm, "export function "));
const proj = await import("data:text/javascript;base64," + Buffer.from(moduleSrc).toString("base64"));
const HEIGHT = proj.MAP_HEIGHT;

// ---- geometry ---------------------------------------------------------------------------------

function simplify(pts, tol) {
  // Douglas-Peucker on an open polyline
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function simplifyRing(ring, tol) {
  // split the closed ring at its two farthest-apart points so the endpoints are stable
  const pts = ring.slice(0, -1);
  if (pts.length < 4) return pts;
  let far = 0;
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const a = simplify(pts.slice(0, far + 1), tol);
  const b = simplify([...pts.slice(far), pts[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

function area(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

const r = (n) => {
  const v = Number(n.toFixed(ROUND));
  return Object.is(v, -0) ? 0 : v;
};

/** A closed ring as a soft path: quadratic curves whose control points are the corners. */
function smoothPath(pts) {
  const n = pts.length;
  const mid = (i, j) => [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
  const m0 = mid(n - 1, 0);
  let d = `M${r(m0[0])} ${r(m0[1])}`;
  for (let i = 0; i < n; i++) {
    const m = mid(i, (i + 1) % n);
    d += `Q${r(pts[i][0])} ${r(pts[i][1])} ${r(m[0])} ${r(m[1])}`;
  }
  return d + "Z";
}

// ---- build ------------------------------------------------------------------------------------

async function loadGeoJson() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(fs.readFileSync(arg, "utf8"));
  const res = await fetch(URL_SRC);
  if (!res.ok) throw new Error(`Could not fetch ${URL_SRC}: ${res.status}`);
  return res.json();
}

const geo = await loadGeoJson();
const polygons = [];
for (const f of geo.features) {
  const g = f.geometry;
  if (g.type === "Polygon") polygons.push(g.coordinates);
  else if (g.type === "MultiPolygon") polygons.push(...g.coordinates);
}

const paths = [];
for (const rings of polygons) {
  const outer = rings[0];
  const maxLat = Math.max(...outer.map((p) => p[1]));
  if (maxLat < LAT_BOTTOM) continue; // Antarctica and its ice shelves
  let d = "";
  let kept = 0;
  rings.forEach((ring, idx) => {
    const projected = ring.map(([lon, lat]) => {
      const p = proj.project(lon, Math.min(Math.max(lat, LAT_BOTTOM), LAT_TOP));
      return [p.x, p.y];
    });
    const simple = simplifyRing(projected, TOLERANCE);
    if (simple.length < 3 || Math.abs(area(simple)) < (idx === 0 ? MIN_AREA : MIN_AREA * 2)) return;
    d += smoothPath(simple);
    kept++;
  });
  if (kept && d) paths.push({ d, size: Math.abs(area(simplifyRing(rings[0].map(([lo, la]) => { const p = proj.project(lo, la); return [p.x, p.y]; }), TOLERANCE))) });
}
paths.sort((a, b) => b.size - a.size);
const land = paths.map((p) => p.d);

const header = `// GENERATED by scripts/build-world-map.mjs. Do not edit by hand; run the script instead.
//
// A flat, simple world map as vector path data for the Nuclear Map phone app.
// Source: Natural Earth 110m land polygons (https://www.naturalearthdata.com), which is public
// domain. Projection: Robinson, centred on Greenwich, cropped to ${LAT_BOTTOM} .. ${LAT_TOP} degrees of latitude
// (no Antarctica, no pole). Paths are simplified (Douglas-Peucker) and every corner is rounded with
// quadratic curves; absolute commands only (M Q Z), numbers rounded to ${ROUND} decimal.
// No imports: erasable TypeScript only, so Node tests can import it directly.

`;

const body = `
/** The viewBox is \`0 0 width height\`; each string in \`land\` is the path \`d\` of one landmass. */
export const WORLD_MAP: { width: number; height: number; land: readonly string[] } = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  land: [
${land.map((d) => `    ${JSON.stringify(d)},`).join("\n")}
  ],
};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + PRELUDE + body);
const bytes = fs.statSync(OUT).size;
console.log(
  `wrote ${path.relative(process.cwd(), OUT)}: ${land.length} landmasses, viewBox ${WIDTH} x ${HEIGHT}, ${bytes} bytes (paths ${land.join("").length} chars)`
);
