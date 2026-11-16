// Tests for the motion core and Shrodi's art (no React Native needed). Run: npm run test:mascot
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(REPO, rel)).href);
const core = await load("components/motion/motion-core.ts");
const art = await load("components/mascot/shrodi-art.ts");
const { MOODS, POSES, SHRODI_COLORS, SHRODI_LOOP_MS, buildShrodi, frameOf, toSvg } = art;

/* ------------------------------ motion core ------------------------------ */

test("cubic-bezier curves start at 0, end at 1 and never go backwards", () => {
  for (const ease of [core.easeIn, core.easeOut, core.easeInOut]) {
    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = ease(i / 100);
      assert.ok(v >= prev - 1e-9, `non-monotonic at ${i}`);
      prev = v;
    }
  }
});

test("ease-out is front-loaded and ease-in is back-loaded", () => {
  assert.ok(core.easeOut(0.3) > 0.5);
  assert.ok(core.easeIn(0.3) < 0.3);
});

test("track hits its keys and holds before and after", () => {
  const keys = [[0, 0], [100, 1], [200, 0]];
  assert.equal(core.track(-5, keys), 0);
  assert.equal(core.track(100, keys), 1);
  assert.equal(core.track(200, keys), 0);
  assert.equal(core.track(999, keys), 0);
});

test("flow passes through every key and never overshoots one", () => {
  const keys = [[0, 0], [500, 40], [1000, 40], [1500, 0]];
  for (const [t, v] of keys) assert.ok(Math.abs(core.flow(t, keys) - v) < 1e-9);
  for (let t = 0; t <= 1500; t += 10) {
    const v = core.flow(t, keys);
    assert.ok(v >= -1e-9 && v <= 40 + 1e-9, `overshoot at ${t}: ${v}`);
  }
});

test("wave, loop, bell and seeded stay in range and are stable", () => {
  for (let i = 0; i < 200; i++) {
    const w = core.wave(i * 37, 1000, 0.3);
    assert.ok(w >= -1 && w <= 1);
    const l = core.loop(i * 37, 1000, -0.4);
    assert.ok(l >= 0 && l < 1);
    const b = core.bell(i / 100);
    assert.ok(b >= 0 && b <= 1);
    assert.ok(core.seeded(i) >= 0 && core.seeded(i) < 1);
    assert.equal(core.seeded(i, 3), core.seeded(i, 3));
  }
});

/* --------------------------------- Shrodi --------------------------------- */

test("every mood defines the same numeric channels", () => {
  const keys = Object.keys(POSES.idle).sort();
  assert.equal(MOODS.length, 6);
  for (const mood of MOODS) {
    assert.deepEqual(Object.keys(POSES[mood]).sort(), keys, mood);
    for (const v of Object.values(POSES[mood])) assert.ok(Number.isFinite(v), mood);
  }
});

test("the idle loop closes: every channel at 0 equals the channel at the loop length", () => {
  for (const mood of MOODS) {
    const a = frameOf(POSES[mood], 0);
    const b = frameOf(POSES[mood], SHRODI_LOOP_MS);
    for (const k of Object.keys(a)) assert.ok(Math.abs(a[k] - b[k]) < 1e-6, `${mood}.${k}: ${a[k]} vs ${b[k]}`);
  }
});

test("frame 0 (reduced motion) is a good drawing: eyes open, finite numbers", () => {
  for (const mood of MOODS) {
    const f = frameOf(POSES[mood], 0);
    for (const [k, v] of Object.entries(f)) assert.ok(Number.isFinite(v), `${mood}.${k}`);
    assert.equal(f.lidL, POSES[mood].lid, `${mood}: no blink at frame 0`);
  }
});

test("nothing is ever perfectly still: idle channels move over the loop", () => {
  const moving = ["bob", "tilt", "tail", "armLa", "armLe", "armRa", "armRe", "earL", "earR"];
  for (const mood of MOODS) {
    for (const k of moving) {
      const vals = [];
      for (let t = 0; t < SHRODI_LOOP_MS; t += 150) vals.push(frameOf(POSES[mood], t)[k]);
      assert.ok(Math.max(...vals) - Math.min(...vals) > 0.5, `${mood}.${k} barely moves`);
    }
  }
});

test("blinks last long enough to read at 30 fps and the eyes close fully", () => {
  let closedFrames = 0;
  let max = 0;
  for (let t = 0; t < SHRODI_LOOP_MS; t += 1000 / 60) {
    const lid = frameOf(POSES.idle, t).lidL;
    max = Math.max(max, lid);
    if (lid > 0.5) closedFrames++;
  }
  assert.ok(max > 0.99, "a blink reaches fully closed");
  // Three blinks, each over 100 ms at 60 fps (6+ frames above half closed).
  assert.ok(closedFrames >= 3 * 6, `only ${closedFrames} closed frames`);
});

test("the gaze stays inside the glasses", () => {
  for (const mood of MOODS) {
    for (let t = 0; t < SHRODI_LOOP_MS; t += 100) {
      const f = frameOf(POSES[mood], t);
      assert.ok(Math.hypot(f.pupilX, f.pupilY) <= 8.0001, `${mood} @ ${t}: ${f.pupilX}, ${f.pupilY}`);
    }
  }
});

test("every mood renders to valid-looking SVG with only palette colours", () => {
  const palette = new Set(Object.values(SHRODI_COLORS).map((c) => c.toLowerCase()));
  palette.add("#000"); // clip shape
  for (const mood of MOODS) {
    for (const t of [0, 2700, 5000]) {
      const svg = toSvg(buildShrodi("t"), frameOf(POSES[mood], t));
      assert.ok(!/NaN|undefined|Infinity/.test(svg), `${mood} @ ${t}`);
      for (const [, hex] of svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,6})"/g)) assert.ok(palette.has(hex.toLowerCase()), `${hex} is not in the palette`);
    }
  }
});

test("clip ids are unique per instance (SVG ids are global on a screen)", () => {
  const ids = (id) => [...toSvg(buildShrodi(id), frameOf(POSES.idle, 0)).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const a = ids("a");
  const b = ids("b");
  assert.ok(a.length >= 2);
  assert.equal(new Set(a).size, a.length, "ids inside one instance are distinct");
  for (const id of a) assert.ok(!b.includes(id), `${id} shared between instances`);
});

test("the fur matches the brand orange tokens", () => {
  const tokens = fs.readFileSync(path.join(REPO, "theme", "tokens.ts"), "utf8");
  const orange = tokens.slice(tokens.indexOf("  orange: {"));
  const grab = (k) => orange.match(new RegExp(`${k}: "(#[0-9A-Fa-f]{6})"`))[1].toLowerCase();
  assert.equal(SHRODI_COLORS.fur.toLowerCase(), grab("400"), "fur = brand orange 400");
  assert.equal(SHRODI_COLORS.furShade.toLowerCase(), grab("500"), "fur shade = brand orange 500");
});

test("the arms hang outward, not inward", () => {
  const left = art.armPoints(-1, 20, 0);
  const right = art.armPoints(1, 20, 0);
  assert.ok(left.hx < left.sx, "left hand ends left of its shoulder");
  assert.ok(right.hx > right.sx, "right hand ends right of its shoulder");
  assert.ok(left.hy > left.sy && right.hy > right.sy, "hanging arms point down");
});

test("no per-frame SVG transforms: moving parts are plain geometry", () => {
  const walk = (nodes, out = []) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.ch ?? [], out);
    }
    return out;
  };
  const layers = buildShrodi("t");
  const f = frameOf(POSES.cheer, 1234);
  for (const node of walk([...layers.back, ...layers.head, ...layers.front])) {
    assert.ok(!("transform" in (node.a ?? {})), "static transform attr");
    if (node.dyn) assert.ok(!("transform" in node.dyn(f)), "animated transform attr");
  }
});

/* ------------------------------ head shapes ------------------------------ */

const shapes = await load("components/mascot/shrodi-shapes.ts");

/** Polyline through baked cubic data. */
function sample(q, n = 24) {
  const out = [[q[0], q[1]]];
  for (let i = 2; i < q.length; i += 6) {
    const [x0, y0] = out[out.length - 1];
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      out.push([
        u ** 3 * x0 + 3 * u * u * t * q[i] + 3 * u * t * t * q[i + 2] + t ** 3 * q[i + 4],
        u ** 3 * y0 + 3 * u * u * t * q[i + 1] + 3 * u * t * t * q[i + 3] + t ** 3 * q[i + 5],
      ]);
    }
  }
  return out;
}
function inside(poly, [x, y]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const turnPoint = ([x, y], [px, py], deg) => {
  const r = (deg * Math.PI) / 180;
  return [px + (x - px) * Math.cos(r) - (y - py) * Math.sin(r), py + (x - px) * Math.sin(r) + (y - py) * Math.cos(r)];
};

test("the head base is upright: the middle of its rows lines up on one vertical axis", () => {
  const poly = sample(shapes.HEAD_BASE);
  const ys = poly.map((p) => p[1]);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const mids = [];
  for (let k = 10; k <= 90; k++) {
    const y = y0 + ((y1 - y0) * k) / 100;
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      if ((ay <= y && y < by) || (by <= y && y < ay)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    }
    mids.push((Math.max(...xs) + Math.min(...xs)) / 2);
  }
  const mean = mids.reduce((a, b) => a + b, 0) / mids.length;
  const sd = Math.sqrt(mids.reduce((a, b) => a + (b - mean) ** 2, 0) / mids.length);
  assert.ok(Math.abs(mean) < 1, `head axis at x = ${mean.toFixed(2)}`);
  assert.ok(sd < 1.6, `the head leans: row midpoints wander by ${sd.toFixed(2)} (was about 7 when tilted)`);
});

test("the muzzle is upright and centred under the face", () => {
  const poly = sample(shapes.HEAD_INNER);
  const xs = poly.map((p) => p[0]);
  assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 1, "centred on x = 0");
  // An upright ellipse is as wide at the same height above and below its centre.
  const ys = poly.map((p) => p[1]);
  const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
  const widthAt = (y) => {
    const hit = [];
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      if ((ay <= y && y < by) || (by <= y && y < ay)) hit.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    }
    return Math.max(...hit) - Math.min(...hit);
  };
  const span = Math.max(...ys) - Math.min(...ys);
  assert.ok(Math.abs(widthAt(mid - span * 0.3) - widthAt(mid + span * 0.3)) < 6, "balanced above and below the centre");
});

test("both eye whites are the same oval, mirrored, and sit inside the head", () => {
  const head = sample(shapes.HEAD_BASE);
  const l = sample(shapes.EYE_WHITE_L);
  const r = sample(shapes.EYE_WHITE_R);
  assert.equal(l.length, r.length);
  l.forEach(([x, y], i) => {
    assert.ok(Math.abs(x + r[i][0]) < 0.11 && Math.abs(y - r[i][1]) < 0.11, "left is the mirror of right");
  });
  for (const p of [...l, ...r]) assert.ok(inside(head, p), "eye white inside the head");
  assert.equal(shapes.EYE_BOX_L.cx, -shapes.EYE_BOX_R.cx);
  assert.equal(shapes.EYE_BOX_L.cy, shapes.EYE_BOX_R.cy);
});

test("the left ear is the exact mirror of the right ear", () => {
  for (const [r, l] of [[shapes.EAR_OUTER_R, shapes.EAR_OUTER_L], [shapes.EAR_INNER_R, shapes.EAR_INNER_L]]) {
    assert.equal(r.length, l.length);
    r.forEach((v, i) => assert.equal(i % 2 === 0 ? -v : v, l[i]));
  }
});

test("each ear's hidden base stays inside the head, even tilted to its extremes", () => {
  const head = sample(shapes.HEAD_BASE);
  const piv = shapes.EAR_PIVOT_R;
  for (const side of [-1, 1]) {
    const ear = side === 1 ? shapes.EAR_OUTER_R : shapes.EAR_OUTER_L;
    // The base is the straight edge between the ends of the first two segments.
    const base = [[ear[6], ear[7]], [ear[12], ear[13]], [(ear[6] + ear[12]) / 2, (ear[7] + ear[13]) / 2]];
    for (const deg of [-14, 0, 14]) {
      for (const p of base) assert.ok(inside(head, turnPoint(p, [side * piv.x, piv.y], deg)), `side ${side}, tilt ${deg}: base point outside the head`);
    }
  }
});

test("the nose is round", () => {
  const nose = buildShrodi("t").head.find((n) => n.tag === "circle" && n.a.fill === SHRODI_COLORS.nose);
  assert.ok(nose, "a circle with the nose colour");
});

test("the head is drawn larger than the body", () => {
  assert.ok(art.HEAD_SCALE > 1);
});

/* ------------------------------ flat colour ------------------------------ */

test("no gradients: SVG gradients rendered black on device, so every fill is a flat colour", () => {
  const walk = (nodes, out = []) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.ch ?? [], out);
    }
    return out;
  };
  const layers = buildShrodi("t");
  for (const node of walk([...layers.back, ...layers.head, ...layers.front])) {
    assert.ok(!["linearGradient", "radialGradient", "stop"].includes(node.tag), node.tag);
    for (const [k, v] of Object.entries(node.a ?? {})) {
      if ((k === "fill" || k === "stroke") && String(v).startsWith("url(")) assert.fail(`${k}=${v} is a reference, not a flat colour`);
    }
  }
});

test("the tail is smaller than the layer-art tail", () => {
  const svg = toSvg(buildShrodi("t"), frameOf(POSES.idle, 0));
  const tail = svg.match(new RegExp(`<path[^>]*stroke="${SHRODI_COLORS.furShade}"[^>]*stroke-width="(\\d+)"`));
  assert.ok(tail && Number(tail[1]) <= 15, "tail stroke is slim");
});

/* --------------------------- arms and eye covers -------------------------- */

/** The opacity of every arm copy (behind / front) at a given pose and time. */
function armOpacities(mood, t = 0) {
  const layers = buildShrodi("t");
  const f = frameOf(POSES[mood], t);
  const take = (nodes) => nodes.filter((n) => n.tag === "circle" && n.dyn && "opacity" in n.dyn(f)).map((n) => n.dyn(f).opacity);
  return { behind: take(layers.back), front: take(layers.front) };
}

test("a resting arm is drawn behind the coat, not in front", () => {
  for (const mood of ["idle", "oops"]) {
    const o = armOpacities(mood, 1234);
    assert.deepEqual(o.behind, [1, 1], `${mood}: both resting paws behind`);
    assert.deepEqual(o.front, [0, 0], `${mood}: nothing in front`);
  }
});

test("a lifted arm is drawn in front, and only the lifted one", () => {
  const wave = armOpacities("wave");
  assert.deepEqual(wave.front, [0, 1], "wave: left rests, right is lifted");
  assert.deepEqual(wave.behind, [1, 0]);
  for (const mood of ["happy", "cheer"]) assert.deepEqual(armOpacities(mood).front, [1, 1], mood);
  assert.equal(armOpacities("think").front[0], 1, "think: the chin hand is in front of the face");
});

test("the two copies of an arm always add up to one (a smooth hand-over)", () => {
  for (let a = -160; a <= 160; a += 5) assert.ok(art.lift(a) >= 0 && art.lift(a) <= 1);
  assert.equal(art.lift(12), 0);
  assert.equal(art.lift(80), 1);
});

test("nothing white ever covers a pupil: only the shine dot is white above the pupils", () => {
  const eyeGroups = [];
  const walk = (nodes) => nodes.forEach((n) => (n.tag === "g" && n.a?.clipPath ? eyeGroups.push(n) : walk(n.ch ?? [])));
  walk(buildShrodi("t").head);
  assert.equal(eyeGroups.length, 2);
  for (const g of eyeGroups) {
    const pupilAt = g.ch.findIndex((n) => n.tag === "ellipse");
    for (const over of g.ch.slice(pupilAt + 1)) {
      if (over.tag === "circle" && over.a.r < 5) continue; // the pupil's shine dot is meant to be on top
      assert.notEqual(String(over.a?.fill).toLowerCase(), SHRODI_COLORS.muzzle.toLowerCase(), "a white shape sits above the pupil");
    }
  }
});
