import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const { WORLD_MAP, project, unproject } = await imp("components/map/world-art.ts");

const TOL = 0.6;
const inBox = ({ x, y }) =>
  x >= -TOL && x <= WORLD_MAP.width + TOL && y >= -TOL && y <= WORLD_MAP.height + TOL;

test("the land is not empty and the viewBox is sensible", () => {
  assert.ok(WORLD_MAP.land.length > 20);
  assert.ok(WORLD_MAP.width > 0 && WORLD_MAP.height > 0);
  assert.ok(WORLD_MAP.width > WORLD_MAP.height);
});

test("every path is absolute M/L/Q/C/Z commands and numbers only", () => {
  for (const d of WORLD_MAP.land) {
    assert.equal(typeof d, "string");
    assert.ok(d.length > 0);
    assert.ok(d.startsWith("M"), d.slice(0, 20));
    assert.match(d, /^[MLQCZ0-9.,\s-]+$/, "only absolute commands and numbers");
    assert.ok(!/[a-z]/.test(d), "no relative commands");
  }
});

test("every coordinate falls inside the viewBox", () => {
  for (const d of WORLD_MAP.land) {
    // every command here takes whole x,y pairs, so numbers pair up from the start
    const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    assert.equal(nums.length % 2, 0);
    for (let i = 0; i < nums.length; i += 2) {
      assert.ok(inBox({ x: nums[i], y: nums[i + 1] }), `${nums[i]},${nums[i + 1]}`);
    }
  }
});

test("numbers are rounded to one decimal", () => {
  for (const d of WORLD_MAP.land) {
    for (const n of d.match(/-?\d+\.\d+/g) ?? []) assert.ok(n.split(".")[1].length <= 1, n);
  }
});

test("places land where they should", () => {
  const greenwich = project(0, 51.5);
  assert.ok(greenwich.x > 0 && greenwich.x < WORLD_MAP.width);
  assert.ok(Math.abs(greenwich.x - WORLD_MAP.width / 2) < 1);
  const tokyo = project(139.7, 35.7);
  const paris = project(2.35, 48.86);
  const sydney = project(151.2, -33.9);
  const ny = project(-74, 40.7);
  assert.ok(tokyo.x > paris.x, "Tokyo is east of Paris");
  assert.ok(sydney.y > tokyo.y, "Sydney is south of Tokyo");
  assert.ok(ny.x < paris.x, "New York is west of Paris");
  assert.ok(paris.y < sydney.y);
});

test("every projected point is inside the viewBox", () => {
  for (let lat = -58; lat <= 84; lat += 7) {
    for (let lon = -180; lon <= 180; lon += 15) {
      assert.ok(inBox(project(lon, lat)), `${lon},${lat}`);
    }
  }
  for (const [lon, lat] of [
    [-84.31, 35.93],
    [18.42, -33.92],
    [-43.2, -22.9],
    [37.62, 55.75],
  ]) {
    assert.ok(inBox(project(lon, lat)));
  }
});

test("project is monotonic: north is up, east is right", () => {
  assert.ok(project(0, 60).y < project(0, 30).y);
  assert.ok(project(0, 30).y < project(0, 0).y);
  assert.ok(project(0, 0).y < project(0, -30).y);
  assert.ok(project(10, 20).x > project(0, 20).x);
});

test("unproject undoes project", () => {
  for (const [lon, lat] of [
    [2.35, 48.86],
    [139.7, 35.7],
    [151.2, -33.9],
    [-74, 40.7],
    [18.42, -33.92],
    [-84.31, 35.93],
    [0, 0],
  ]) {
    const p = project(lon, lat);
    const q = unproject(p.x, p.y);
    assert.ok(Math.abs(q.lon - lon) < 0.01 && Math.abs(q.lat - lat) < 0.01, `${lon},${lat}`);
  }
});

test("the map stays small", () => {
  const total = WORLD_MAP.land.reduce((n, d) => n + d.length, 0);
  assert.ok(total < 40000, `${total} characters`);
});
