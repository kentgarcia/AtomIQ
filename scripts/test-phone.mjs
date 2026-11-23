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
  assert.ok(!ids(core.unlockedApps(one)).includes("shop"), "the Shop waits for the second lesson");
  assert.ok(!ids(core.unlockedApps(one)).includes("field-notes"));
  const two = { ...NO_PROGRESS, lessonsCompleted: 2 };
  assert.ok(ids(core.unlockedApps(two)).includes("shop"));
  assert.ok(!ids(core.unlockedApps(two)).includes("field-notes"), "Field Notes waits for the third lesson");
  assert.ok(ids(core.unlockedApps({ ...NO_PROGRESS, lessonsCompleted: 3 })).includes("field-notes"));
});

test("a game arrives with the lesson that teaches what it shows", () => {
  const withLesson = (lessonId) => ids(core.unlockedApps({ ...NO_PROGRESS, lessonsCompleted: 1, lessonsDone: [lessonId] }));
  assert.ok(withLesson("atoms-are-everywhere").includes("atom-maze"));
  assert.ok(!withLesson("atoms-are-everywhere").includes("lab-build-atom"));
  assert.ok(withLesson("protons-neutrons-electrons").includes("lab-build-atom"), "Build an Atom comes with 'Meet the atom'");
  assert.ok(withLesson("isotopes").includes("mythbuster"));
  assert.ok(withLesson("half-life").includes("lab-decay"));
  assert.ok(withLesson("what-stops-what").includes("lab-shield"));
  // a lesson id the learner has not finished unlocks nothing, whatever the count
  assert.ok(!ids(core.unlockedApps({ ...NO_PROGRESS, lessonsCompleted: 30 })).includes("lab-build-atom"));
});

test("the catalog is in progression order: every app after the five starters waits for something, and the five come first", () => {
  assert.deepEqual(PHONE_APPS.slice(0, 5).map((a) => a.unlock.kind), ["start", "start", "start", "start", "start"]);
  assert.ok(PHONE_APPS.slice(5).every((a) => a.unlock.kind !== "start"));
  assert.deepEqual(PHONE_APPS.filter((a) => a.group === "games").map((a) => a.id), ["atom-maze", "lab-build-atom", "mythbuster", "lab-decay", "lab-shield"]);
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
  const unlocked = core.unlockedApps({ ...NO_PROGRESS, lessonsCompleted: 2 });
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

test("locked apps are the live ones the learner does not have, and each says what it needs", () => {
  const lockedIds = (p) => ids(core.lockedApps(p));
  assert.deepEqual(lockedIds(NO_PROGRESS), ["atom-maze", "shop", "lab-build-atom", "field-notes", "mythbuster", "scanner", "library", "camera", "lab-decay", "safety", "lab-shield", "map"]);
  const all = { lessonsCompleted: 9, unitsCompleted: ["inside-the-atom", "radioactivity"], lessonsDone: ["atoms-are-everywhere", "protons-neutrons-electrons", "isotopes", "half-life", "what-stops-what"], level: 9, shopItemsOwned: 1 };
  assert.deepEqual(lockedIds(all), []);
  // every app is either unlocked or locked, never both
  for (const p of [NO_PROGRESS, all]) assert.equal(core.unlockedApps(p).length + core.lockedApps(p).length, PHONE_APPS.length);

  const title = (id) => (id === "radioactivity" ? "Radioactivity" : undefined);
  assert.deepEqual(core.unlockRequirement({ kind: "lessons", count: 1 }, NO_PROGRESS, title), { text: "Finish your first lesson.", progress: "0 of 1 lessons finished" });
  assert.equal(core.unlockRequirement({ kind: "lessons", count: 2 }, { ...NO_PROGRESS, lessonsCompleted: 1 }, title).progress, "1 of 2 lessons finished");
  assert.equal(core.unlockRequirement({ kind: "unit", unitId: "radioactivity" }, NO_PROGRESS, title).text, 'Finish the unit "Radioactivity".');
  assert.deepEqual(core.unlockRequirement({ kind: "level", level: 5 }, { ...NO_PROGRESS, level: 2 }, title), { text: "Reach level 5.", progress: "You are level 2" });
  assert.equal(core.unlockRequirement({ kind: "lesson", lessonId: "half-life" }, NO_PROGRESS, title, (id) => (id === "half-life" ? "Half-life" : undefined)).text, 'Finish the lesson "Half-life".');
  assert.equal(core.unlockRequirement({ kind: "lesson", lessonId: "x" }, NO_PROGRESS, title).text, "Finish a certain lesson.");
  assert.equal(core.unlockRequirement({ kind: "owns-shop-item" }, NO_PROGRESS, title).text, "Get any item from the Shop.");
});

test("sameIconView: an icon skips a render that only brings new handlers, and redraws when anything drawn changes", () => {
  const app = { id: "chats" };
  const base = { app, size: 64, label: "Chats", badge: { kind: "count", count: 2 }, install: undefined };
  // badgeOf builds a new object each call: same value, same icon
  assert.equal(core.sameIconView(base, { ...base, badge: { kind: "count", count: 2 } }), true);
  assert.equal(core.sameIconView({ ...base, badge: null }, { ...base, badge: null }), true);
  assert.equal(core.sameIconView(base, { ...base, badge: { kind: "count", count: 3 } }), false);
  assert.equal(core.sameIconView(base, { ...base, badge: { kind: "dot" } }), false);
  assert.equal(core.sameIconView(base, { ...base, badge: null }), false);
  assert.equal(core.sameIconView(base, { ...base, label: "Chats, 2 unread" }), false);
  assert.equal(core.sameIconView(base, { ...base, size: 72 }), false);
  assert.equal(core.sameIconView(base, { ...base, app: { id: "chats" } }), false, "another app object is another icon");
  assert.equal(core.sameIconView(base, { ...base, locked: true }), false);
  assert.equal(core.sameIconView(base, { ...base, locked: false }), true, "unset and false are the same");
  const installing = { delay: 200, newDot: true };
  assert.equal(core.sameIconView({ ...base, install: installing }, { ...base, install: { delay: 200, newDot: true } }), true);
  assert.equal(core.sameIconView({ ...base, install: installing }, { ...base, install: { delay: 400, newDot: true } }), false);
  assert.equal(core.sameIconView({ ...base, install: installing }, { ...base, install: { delay: 200, newDot: false } }), false);
  assert.equal(core.sameIconView(base, { ...base, install: installing }), false, "the install moment starts or ends");
});

test("every live app has a picture of its own, and the games are apps that open their game", async () => {
  const art = await import(pathToFileURL(path.resolve("components/phone/app-icon-art.ts")).href);
  for (const app of PHONE_APPS.filter((a) => a.status === "live")) assert.ok(art.appIconArt(app.id), `${app.id} has icon art`);
  const games = { mythbuster: "/mythbuster", "atom-maze": "/explorer/story", "lab-build-atom": "/lab?exp=build-atom", "lab-decay": "/lab?exp=decay-lab", "lab-shield": "/lab?exp=radiation-shield" };
  for (const [id, route] of Object.entries(games)) {
    const app = PHONE_APPS.find((a) => a.id === id);
    assert.ok(app && app.route.startsWith(route), `${id} opens ${route}`);
    assert.notEqual(app.unlock.kind, "start", `${id} is not one of the five starting apps`);
  }
});

test("a page holds as many rows as the screen has room for, between three and six", () => {
  assert.equal(core.gridRows(300, 100), 3);
  assert.equal(core.gridRows(520, 100), 5);
  assert.equal(core.gridRows(900, 100), 6);
  assert.equal(core.gridRows(100, 0), 3);
  assert.equal(core.gridRows(Number.NaN, 100), 3);
  // five rows of four: the seventeen apps fit one page on a tall phone
  assert.equal(core.pagesOf(Array.from({ length: 17 }, (_, i) => i), 4 * core.gridRows(520, 100)).length, 1);
});
