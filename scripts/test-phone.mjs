import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("services/phone-core.ts")).href);
const { PHONE_APPS, NO_PROGRESS } = core;

const ids = (apps) => apps.map((a) => a.id);

test("a new learner has the five starting apps, in catalog order", () => {
  assert.deepEqual(ids(core.unlockedApps(NO_PROGRESS)), ["chats", "contacts", "atomdex", "daily-fact", "settings"]);
});

test("apps install from progress the app already tracks", () => {
  const one = { ...NO_PROGRESS, lessonsCompleted: 1 };
  assert.ok(ids(core.unlockedApps(one)).includes("shop"));
  assert.ok(!ids(core.unlockedApps(one)).includes("field-notes"));
});

test("planned apps are never returned, whatever the progress", () => {
  const everything = { lessonsCompleted: 99, unitsCompleted: ["inside-the-atom", "radioactivity"], level: 50, shopItemsOwned: 3 };
  for (const app of core.unlockedApps(everything)) assert.equal(app.status, "live");
  const planned = PHONE_APPS.filter((a) => a.status === "planned").map((a) => a.id);
  for (const id of planned) assert.ok(!ids(core.unlockedApps(everything)).includes(id));
});

test("the Atom Scanner is live and arrives with the first unit", () => {
  const scanner = PHONE_APPS.find((a) => a.id === "scanner");
  assert.equal(scanner.status, "live");
  assert.equal(scanner.route, "/phone-apps/scanner");
  assert.ok(!ids(core.unlockedApps({ ...NO_PROGRESS, lessonsCompleted: 5 })).includes("scanner"));
  assert.ok(ids(core.unlockedApps({ ...NO_PROGRESS, unitsCompleted: ["inside-the-atom"] })).includes("scanner"));
});

test("the Camera, the Safety Guide and the Nuclear Map are live, each with its own unlock", () => {
  for (const id of ["camera", "safety", "map"]) {
    const app = PHONE_APPS.find((a) => a.id === id);
    assert.equal(app.status, "live");
    assert.equal(app.route, `/phone-apps/${id}`);
    assert.ok(!ids(core.unlockedApps(NO_PROGRESS)).includes(id), `${id} is not there at the start`);
  }
  assert.ok(ids(core.unlockedApps({ ...NO_PROGRESS, shopItemsOwned: 1 })).includes("camera"));
  assert.ok(ids(core.unlockedApps({ ...NO_PROGRESS, unitsCompleted: ["radioactivity"] })).includes("safety"));
  assert.ok(!ids(core.unlockedApps({ ...NO_PROGRESS, level: 4 })).includes("map"));
  assert.ok(ids(core.unlockedApps({ ...NO_PROGRESS, level: 5 })).includes("map"));
});

test("each unlock rule", () => {
  const p = { lessonsCompleted: 2, unitsCompleted: ["inside-the-atom"], level: 3, shopItemsOwned: 1 };
  assert.equal(core.isUnlocked({ kind: "start" }, NO_PROGRESS), true);
  assert.equal(core.isUnlocked({ kind: "lessons", count: 2 }, p), true);
  assert.equal(core.isUnlocked({ kind: "lessons", count: 3 }, p), false);
  assert.equal(core.isUnlocked({ kind: "unit", unitId: "inside-the-atom" }, p), true);
  assert.equal(core.isUnlocked({ kind: "unit", unitId: "radioactivity" }, p), false);
  assert.equal(core.isUnlocked({ kind: "level", level: 3 }, p), true);
  assert.equal(core.isUnlocked({ kind: "level", level: 4 }, p), false);
  assert.equal(core.isUnlocked({ kind: "owns-shop-item" }, p), true);
  assert.equal(core.isUnlocked({ kind: "owns-shop-item" }, NO_PROGRESS), false);
  assert.equal(core.isUnlocked({ kind: "never" }, p), false);
});

test("the catalog has unique ids and every route starts with a slash", () => {
  assert.equal(new Set(ids(PHONE_APPS)).size, PHONE_APPS.length);
  for (const app of PHONE_APPS) assert.match(app.route, /^\//);
});

test("an app's unit unlock names a unit that exists", async () => {
  const { DatabaseSync: Db } = await import("node:sqlite");
  const db = new Db("content/database/content.db", { readOnly: true });
  const units = new Set(db.prepare("SELECT id FROM units").all().map((r) => r.id));
  for (const app of PHONE_APPS) if (app.unlock.kind === "unit") assert.ok(units.has(app.unlock.unitId), `${app.id} waits for unit ${app.unlock.unitId}`);
});

test("new apps are the unlocked ones not yet seen", () => {
  const unlocked = core.unlockedApps({ ...NO_PROGRESS, lessonsCompleted: 1 });
  assert.deepEqual(ids(core.newApps(unlocked, new Set(["chats", "contacts"]))), ["atomdex", "daily-fact", "settings", "shop"]);
  assert.deepEqual(core.newApps(unlocked, new Set(ids(unlocked))), []);
});

test("badges: unread count, daily fact dot, new dot, and the switch", () => {
  const s = { dailyFactUnread: true, unreadChats: 2 };
  assert.deepEqual(core.badgeFor("chats", s, { isNew: false, enabled: true }), { kind: "count", count: 2 });
  assert.deepEqual(core.badgeFor("daily-fact", s, { isNew: false, enabled: true }), { kind: "dot" });
  assert.deepEqual(core.badgeFor("shop", s, { isNew: true, enabled: true }), { kind: "dot" });
  assert.equal(core.badgeFor("shop", s, { isNew: false, enabled: true }), null);
  assert.equal(core.badgeFor("chats", s, { isNew: true, enabled: false }), null);
  const none = { dailyFactUnread: false, unreadChats: 0 };
  assert.equal(core.badgeFor("daily-fact", none, { isNew: false, enabled: true }), null);
});

test("badge labels say what the badge means", () => {
  const chats = PHONE_APPS.find((a) => a.id === "chats");
  const fact = PHONE_APPS.find((a) => a.id === "daily-fact");
  assert.equal(core.badgeLabel(chats, { kind: "count", count: 3 }), "Chats, 3 unread");
  assert.equal(core.badgeLabel(fact, { kind: "dot" }), "Daily Fact, new AtomFact available");
  assert.equal(core.badgeLabel(chats, null), "Chats");
});

test("the tab dot: anything new, unread or unseen, unless badges are off", () => {
  const none = { dailyFactUnread: false, unreadChats: 0 };
  assert.equal(core.tabDot(none, 0, true), false);
  assert.equal(core.tabDot(none, 1, true), true);
  assert.equal(core.tabDot({ ...none, unreadChats: 1 }, 0, true), true);
  assert.equal(core.tabDot({ ...none, dailyFactUnread: true }, 0, true), true);
  assert.equal(core.tabDot({ dailyFactUnread: true, unreadChats: 4 }, 2, false), false);
});

test("pages hold twelve icons and there is always one page", () => {
  assert.deepEqual(core.pagesOf([]), [[]]);
  const items = Array.from({ length: 13 }, (_, i) => i);
  assert.deepEqual(core.pagesOf(items).map((p) => p.length), [12, 1]);
  assert.equal(core.pagesOf(items.slice(0, 12)).length, 1);
});

test("three columns on a narrow window, four otherwise", () => {
  assert.equal(core.gridColumns(320), 3);
  assert.equal(core.gridColumns(360), 4);
  assert.equal(core.gridColumns(800), 4);
});

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE phone_seen (app_id TEXT PRIMARY KEY, seen_at INTEGER NOT NULL, opened_at INTEGER, updated_at INTEGER NOT NULL DEFAULT 0,
    synced_at INTEGER, is_dirty INTEGER DEFAULT 1, deleted_at INTEGER, version INTEGER DEFAULT 1)`);
  return {
    async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
  };
}

test("an install moment is recorded once", async () => {
  const store = core.createPhoneSeenStore(((db) => () => db)(memoryDb()));
  assert.equal(await store.markSeen("shop", 10), true);
  assert.equal(await store.markSeen("shop", 20), false);
  await store.markSeen("chats", 30);
  assert.deepEqual((await store.listSeen()).map((s) => s.appId).sort(), ["chats", "shop"]);
});

test("an installed app is new until it is opened, and a starter is opened from the start", async () => {
  const store = core.createPhoneSeenStore(((db) => () => db)(memoryDb()));
  await store.markSeen("shop", 10);
  await store.markSeen("chats", 10, true);
  const read = async () => Object.fromEntries((await store.listSeen()).map((s) => [s.appId, s.opened]));
  assert.deepEqual(await read(), { shop: false, chats: true });
  await store.markOpened("shop", 20);
  assert.deepEqual(await read(), { shop: true, chats: true });
  // opening an app whose install never played still records it, as opened
  await store.markOpened("camera", 30);
  assert.deepEqual(await read(), { shop: true, chats: true, camera: true });
});
