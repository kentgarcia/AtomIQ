import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const core = await imp("components/camera/photo-core.ts");
const scenes = await imp("components/camera/photo-scenes.ts");
const { OBJECT_ART } = await imp("components/lesson/visual/object-art.ts");

const sample = { v: 1, scene: "lab", companion: "shrodi", pose: "cheer", companionPose: "cheer", frame: "white", avatar: "avatar:v1:abc" };

test("a stored composition reads back; unknown parts fall back; anything else is not a photo", () => {
  assert.deepEqual(core.parsePhotoConfig(JSON.stringify(sample)), sample);
  assert.deepEqual(core.parsePhotoConfig({ ...sample, scene: "moon", pose: "fly", frame: "gold" }), { ...sample, scene: "meadow", pose: "greet", companionPose: "cheer", frame: "none" });
  assert.equal(core.parsePhotoConfig({ ...sample, companion: "" }).companion, null);
  assert.equal(core.parsePhotoConfig("not json"), null);
  assert.equal(core.parsePhotoConfig({ ...sample, v: 2 }), null);
  assert.equal(core.parsePhotoConfig([]), null);
  assert.equal(core.parsePhotoConfig(null), null);
});

test("every scene, pose and frame the camera offers is drawn", () => {
  assert.deepEqual(scenes.PHOTO_SCENE_LIST.map((s) => s.id), [...core.PHOTO_SCENES]);
  for (const s of scenes.PHOTO_SCENE_LIST) {
    assert.ok(s.shapes.length >= 5, s.id);
    assert.ok(s.front.length >= 2, `${s.id} has a foreground that hides the figures' cut edge`);
    for (const shape of s.front) if (shape.t === "art") assert.ok(OBJECT_ART[shape.id], `${s.id} front uses a real picture`);
    for (const shape of s.shapes) if (shape.t === "art") assert.ok(OBJECT_ART[shape.id], `${s.id} uses a real picture`);
  }
  for (const f of core.PHOTO_FRAMES) assert.ok(f in scenes.PHOTO_FRAME_STYLE, f);
  assert.equal(scenes.PHOTO_FRAME_STYLE.none, null);
});

test("the cap, the full message and the counter", () => {
  assert.equal(core.PHOTO_CAP, 100);
  assert.equal(core.canTakePhoto(99), true);
  assert.equal(core.canTakePhoto(100), false);
  assert.equal(core.FULL_MESSAGE, "Your gallery is full");
  assert.equal(core.photoCountText(1), "1 photo");
  assert.equal(core.photoCountText(0), "0 photos");
});

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE photos (id TEXT PRIMARY KEY, config TEXT NOT NULL, taken_at INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, synced_at INTEGER, is_dirty INTEGER DEFAULT 1, deleted_at INTEGER, version INTEGER DEFAULT 1)");
  return {
    db,
    adapter: {
      async runAsync(sql, params = []) {
        const r = db.prepare(sql).run(...params);
        return { changes: Number(r.changes) };
      },
      async getAllAsync(sql, params = []) {
        return db.prepare(sql).all(...params);
      },
    },
  };
}

test("photos are stored, listed newest first and deleted", async () => {
  const { adapter } = memoryDb();
  const store = core.createPhotoStore(() => adapter);
  assert.deepEqual(await store.list(), []);
  const a = await store.add("p1", sample, 1000);
  const b = await store.add("p2", { ...sample, scene: "night" }, 2000);
  assert.equal(a.ok && b.ok, true);
  assert.deepEqual((await store.list()).map((p) => p.id), ["p2", "p1"]);
  assert.equal((await store.list())[0].config.scene, "night");
  assert.equal(await store.count(), 2);
  assert.equal(await store.remove("p1"), true);
  assert.equal(await store.remove("p1"), false);
  assert.deepEqual((await store.list()).map((p) => p.id), ["p2"]);
});

test("at the cap nothing is saved and nothing is removed", async () => {
  const { adapter, db } = memoryDb();
  const store = core.createPhotoStore(() => adapter);
  const insert = db.prepare("INSERT INTO photos (id, config, taken_at) VALUES (?,?,?)");
  for (let i = 0; i < core.PHOTO_CAP; i++) insert.run(`p${i}`, JSON.stringify(sample), i);
  assert.deepEqual(await store.add("extra", sample, 999999), { ok: false, reason: "full" });
  assert.equal(await store.count(), core.PHOTO_CAP);
  assert.equal((await store.list()).some((p) => p.id === "p0"), true);
});

test("a row that cannot be read is skipped, not shown broken", async () => {
  const { adapter, db } = memoryDb();
  db.prepare("INSERT INTO photos (id, config, taken_at) VALUES ('bad','{oops',5)").run();
  const store = core.createPhotoStore(() => adapter);
  await store.add("ok", sample, 10);
  assert.deepEqual((await store.list()).map((p) => p.id), ["ok"]);
});
