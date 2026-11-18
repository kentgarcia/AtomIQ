/**
 * AtomIQ's own icons (components/ui/custom-icons.ts): every one is well-formed Iconsax-Bold-style
 * data inside the 24 grid, the registry accepts the names, none clashes with an Iconsax export, and
 * every sort group in the content database has an icon that exists, with different icons inside one sort.
 *
 * Run: npm run test:custom-icons
 * Whether they LOOK right is a person looking at `node scripts/render-custom-icons.mjs <dir>`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { CUSTOM_ICONS, CUSTOM_ICON_NAMES, isCustomIconName } = await import(pathToFileURL(path.join(REPO, "components/ui/custom-icons.ts")).href);
const registry = await import(pathToFileURL(path.join(REPO, "components/ui/icon-registry.ts")).href);

// The installed Iconsax export names (the runtime entry's `exports.Name =` lines)
const surface = {};
const entry = path.join(REPO, "node_modules/iconsax-react-native/dist/cjs/index.js");
for (const m of fs.readFileSync(entry, "utf8").matchAll(/^exports\.([\w$]+)\s*=/gm)) surface[m[1]] = true;

const numbers = (d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);

test("there is a set of custom icons, named Aq...", () => {
  assert.ok(CUSTOM_ICON_NAMES.length >= 12);
  for (const name of CUSTOM_ICON_NAMES) assert.match(name, /^Aq[A-Z]\w*$/, name);
});

test("no custom name is also an Iconsax export", () => {
  for (const name of CUSTOM_ICON_NAMES) assert.equal(surface[name], undefined, name);
});

test("every icon is paths in the 24 grid: absolute commands only, finite numbers, inside the margin", () => {
  for (const name of CUSTOM_ICON_NAMES) {
    const icon = CUSTOM_ICONS[name];
    assert.ok(icon.shapes.length > 0, name);
    for (const shape of icon.shapes) {
      assert.match(shape.d, /^M/, `${name}: starts with a move`);
      assert.ok(!/[a-z]/.test(shape.d.replace(/e-?\d+/g, "")), `${name}: no relative commands (lowercase letters)`);
      assert.ok(!/[HVAS]/.test(shape.d), `${name}: only M L C Q Z, so the numbers read in pairs`);
      assert.ok(!/url\(|gradient/i.test(shape.d), name);
      const n = numbers(shape.d);
      assert.ok(n.length > 0 && n.length % 2 === 0, `${name}: coordinates come in pairs`);
      assert.ok(n.every(Number.isFinite), `${name}: finite`);
      for (const v of n) assert.ok(v >= 1.5 && v <= 22.5, `${name}: ${v} is inside the 24 grid margin`);
      if (shape.opacity !== undefined) assert.ok(shape.opacity > 0 && shape.opacity < 1, `${name}: opacity`);
    }
  }
});

test("a 'not' icon is the faded picture with a solid slash, so it reads as the opposite", () => {
  for (const name of CUSTOM_ICON_NAMES.filter((n) => n.endsWith("Off"))) {
    const shapes = CUSTOM_ICONS[name].shapes;
    assert.ok(shapes.some((s) => s.opacity !== undefined), `${name}: has a faded layer`);
    assert.ok(shapes.some((s) => s.opacity === undefined), `${name}: has a solid slash`);
    const base = CUSTOM_ICONS[name.replace(/Off$/, "")];
    assert.ok(base, `${name}: its positive icon exists`);
  }
});

test("the registry accepts the custom names, and still rejects unknown ones", () => {
  for (const name of CUSTOM_ICON_NAMES) {
    assert.ok(isCustomIconName(name));
    const r = registry.resolveIconName(name, surface);
    assert.equal(r.valid, true, name);
    assert.equal(r.usedFallback, false, name);
  }
  assert.equal(registry.resolveIconName("AqNotAnIcon", surface).valid, false);
  assert.equal(isCustomIconName("toString"), false, "prototype names are not icons");
});

test("every sort group in the content database has an icon that exists, and a sort never repeats one", () => {
  const db = new DatabaseSync(path.join(REPO, "content/database/content.db"), { readOnly: true });
  const rows = db.prepare("SELECT id, data FROM items WHERE type = 'sort'").all();
  db.close();
  assert.ok(rows.length > 0);
  for (const r of rows) {
    const icons = JSON.parse(r.data).buckets.map((b) => b.icon);
    for (const icon of icons) assert.ok(icon && registry.resolveIconName(icon, surface).valid, `${r.id}: "${icon}"`);
    assert.equal(new Set(icons).size, icons.length, `${r.id}: groups have different icons`);
  }
});

test("the sort groups use AtomIQ's own icons, drawn for them", () => {
  const db = new DatabaseSync(path.join(REPO, "content/database/content.db"), { readOnly: true });
  const rows = db.prepare("SELECT id, data FROM items WHERE type = 'sort'").all();
  db.close();
  for (const r of rows) for (const b of JSON.parse(r.data).buckets) assert.ok(isCustomIconName(b.icon), `${r.id}/${b.id}: "${b.icon}" is not one of ours`);
});
