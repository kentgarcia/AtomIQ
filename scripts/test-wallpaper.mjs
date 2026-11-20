import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const core = await imp("components/phone/wallpaper-core.ts");
const art = await imp("components/phone/wallpaper-art.ts");
const { OBJECT_ART } = await imp("components/lesson/visual/object-art.ts");
const { contrastBetween } = await imp("components/lesson/visual/color-math.ts");

test("there are five illustrated wallpapers, each with a name, a base colour, an ink and shapes", () => {
  assert.equal(core.WALLPAPER_IDS.length, 5);
  assert.deepEqual(Object.keys(art.WALLPAPERS).sort(), [...core.WALLPAPER_IDS].sort());
  for (const id of core.WALLPAPER_IDS) {
    const wp = art.WALLPAPERS[id];
    assert.equal(wp.id, id);
    assert.equal(wp.name, core.WALLPAPER_NAMES[id]);
    assert.match(wp.base, /^#[0-9A-Fa-f]{6}$/);
    assert.match(wp.ink, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(wp.shapes.length >= 10, id);
  }
  assert.equal(core.WALLPAPER_NAMES.mine, "My avatar");
  assert.equal(core.WALLPAPER_NAMES.plain, "Plain");
  assert.deepEqual([...core.WALLPAPER_CHOICES], ["mine", "plain", ...core.WALLPAPER_IDS]);
  assert.deepEqual(Object.keys(core.WALLPAPER_NAMES).sort(), [...core.WALLPAPER_CHOICES].sort());
});

test("the ink reads on the base colour", () => {
  for (const id of core.WALLPAPER_IDS) {
    const wp = art.WALLPAPERS[id];
    assert.ok(contrastBetween(wp.base, wp.ink) >= 2.4, `${id} ink on its base: ${contrastBetween(wp.base, wp.ink).toFixed(2)}`);
  }
});

test("every shape is real: finite numbers, pictures from the object art, and a first shape that fills the frame", () => {
  const { w, h } = art.WALLPAPER_FRAME;
  for (const id of core.WALLPAPER_IDS) {
    const [first] = art.WALLPAPERS[id].shapes;
    assert.deepEqual([first.t, first.x, first.y, first.w, first.h], ["rect", 0, 0, w, h], `${id} starts with its sky`);
    for (const s of art.WALLPAPERS[id].shapes) {
      if (s.t === "art") assert.ok(OBJECT_ART[s.id], `${id} uses a real picture`);
      if (s.t === "path" || s.t === "line") assert.ok(!/NaN|undefined/.test(s.d), `${id} path is numbers`);
      if (s.t === "circle") assert.ok(Number.isFinite(s.cx + s.cy + s.r), id);
      if (s.opacity !== undefined) assert.ok(s.opacity > 0 && s.opacity <= 1, id);
    }
  }
});

test("a new phone wears the learner's own paint; the plain colour and every wallpaper are kept; anything else is the learner's own", () => {
  assert.equal(core.OWN_WALLPAPER, "mine");
  assert.equal(core.normalizeWallpaper("orbit"), "orbit");
  assert.equal(core.normalizeWallpaper("waves"), "waves");
  assert.equal(core.normalizeWallpaper("plain"), "plain");
  assert.equal(core.normalizeWallpaper("mine"), "mine");
  for (const bad of [undefined, null, "", "default", "sunset", "dusk", 7, {}]) assert.equal(core.normalizeWallpaper(bad), "mine");
  assert.equal(core.isIllustrated("moon"), true);
  assert.equal(core.isIllustrated("mine"), false);
  assert.equal(core.isIllustrated("plain"), false);
});

test("the wallpapers stay calm: few shapes, no pictures repeated across the middle", () => {
  for (const id of core.WALLPAPER_IDS) {
    const shapes = art.WALLPAPERS[id].shapes;
    assert.ok(shapes.length <= 40, `${id} has ${shapes.length} shapes`);
    assert.ok(!shapes.some((s) => s.t === "art"), `${id} has no little pictures to compete with the icons`);
  }
});
