/**
 * The phone's home-screen arrangement (services/phone-layout-core.ts): the progression default, safe reading of a saved layout,
 * arranging, and what the home screen draws.
 *
 * Run: npm run test:phone-layout
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PHONE_APPS } from "../services/phone-core.ts";
import * as L from "../services/phone-layout-core.ts";

const ids = (layout) => layout.items.map((i) => i.id);
const folder = (layout, id) => layout.items.find((i) => i.kind === "folder" && i.id === id);
const allApps = (layout) => layout.items.flatMap((i) => (i.kind === "app" ? [i.id] : i.apps));
const live = PHONE_APPS.filter((a) => a.status === "live").map((a) => a.id);

describe("the default layout is the progression", () => {
  const d = L.defaultLayout(PHONE_APPS);
  it("holds every app once, in catalog order, with the games in one folder where the first game sits", () => {
    assert.deepEqual([...allApps(d)].sort(), [...live].sort());
    assert.deepEqual(ids(d).slice(0, 6), ["chats", "contacts", "atomdex", "daily-fact", "settings", L.GAMES_FOLDER_ID]);
    assert.deepEqual(folder(d, L.GAMES_FOLDER_ID).apps, ["atom-maze", "lab-build-atom", "mythbuster", "lab-decay", "lab-shield"]);
    assert.equal(folder(d, L.GAMES_FOLDER_ID).name, "Games");
  });
});

describe("reading a saved layout", () => {
  it("gives the default for anything that is not a layout", () => {
    for (const bad of [null, undefined, 3, "x", [], { v: 2, items: [] }, { v: 1 }]) assert.deepEqual(L.sanitizeLayout(bad, PHONE_APPS), L.defaultLayout(PHONE_APPS));
  });
  it("drops unknown and repeated apps, empty folders and nameless names, and keeps the rest", () => {
    const raw = {
      v: 1,
      items: [
        { kind: "app", id: "settings" },
        { kind: "app", id: "nope" },
        { kind: "app", id: "settings" },
        { kind: "folder", id: "f", name: "  ", apps: ["chats", "gone"] },
        { kind: "folder", id: "empty", name: "Empty", apps: ["gone"] },
        7,
      ],
    };
    const l = L.sanitizeLayout(raw, PHONE_APPS);
    assert.equal(l.items[0].id, "settings");
    assert.equal(folder(l, "f").name, "Folder");
    assert.deepEqual(folder(l, "f").apps, ["chats"]);
    assert.equal(folder(l, "empty"), undefined);
    assert.deepEqual([...allApps(l)].sort(), [...live].sort(), "every app is somewhere, once");
  });
  it("puts an app the layout does not hold where its progression says: a game into the games folder, another after what comes before it", () => {
    const d = L.defaultLayout(PHONE_APPS);
    const without = { v: 1, items: d.items.filter((i) => i.id !== "map" && i.id !== "camera").map((i) => (i.kind === "folder" ? { ...i, apps: i.apps.filter((a) => a !== "mythbuster") } : i)) };
    const l = L.sanitizeLayout(without, PHONE_APPS);
    assert.ok(folder(l, L.GAMES_FOLDER_ID).apps.includes("mythbuster"));
    assert.equal(ids(l).at(-1), "map", "the last app of the progression goes last");
    const at = ids(l).indexOf("camera");
    assert.ok(at > ids(l).indexOf("library") && at < ids(l).indexOf("safety"), "the camera sits between the library and the safety guide");
  });
});

describe("arranging", () => {
  const d = L.defaultLayout(PHONE_APPS);
  it("moves an item before another, and does nothing for itself or an unknown id", () => {
    const l = L.moveBefore(d, "settings", "chats");
    assert.equal(ids(l)[0], "settings");
    assert.equal(L.moveBefore(d, "chats", "chats"), d);
    assert.equal(L.moveBefore(d, "chats", "nope"), d);
    assert.equal(ids(d)[0], "chats", "the original is not changed");
  });
  it("moves an item after another", () => {
    const l = L.moveAfter(d, "chats", "contacts");
    assert.deepEqual(ids(l).slice(0, 3), ["contacts", "chats", "atomdex"]);
    assert.equal(L.moveAfter(d, "chats", "chats"), d);
    assert.equal(ids(L.moveAfter(d, "chats", ids(d).at(-1))).at(-1), "chats");
  });
  it("shifts one place, and stops at the ends", () => {
    assert.equal(ids(L.shift(d, "chats", 1))[1], "chats");
    assert.equal(L.shift(d, "chats", -1), d);
    assert.equal(L.shift(d, ids(d).at(-1), 1), d);
  });
  it("makes a folder where the app was, with a name, a unique id and a limit on the name", () => {
    const l = L.createFolder(d, "camera", "Tools");
    const f = l.items.find((i) => i.kind === "folder" && i.apps.includes("camera"));
    assert.equal(f.name, "Tools");
    assert.equal(l.items.indexOf(f), d.items.findIndex((i) => i.id === "camera"));
    const two = L.createFolder(l, "map", "Extras");
    assert.equal(new Set(ids(two)).size, ids(two).length);
    assert.equal(L.createFolder(d, "camera", "x".repeat(40)).items.find((i) => i.kind === "folder" && i.apps.includes("camera")).name.length, L.MAX_FOLDER_NAME);
  });
  it("puts an app in a folder and takes it out again, and a folder that empties goes", () => {
    const l = L.addToFolder(d, "camera", L.GAMES_FOLDER_ID);
    assert.ok(!ids(l).includes("camera"));
    assert.ok(folder(l, L.GAMES_FOLDER_ID).apps.includes("camera"));
    const back = L.takeOut(l, "camera");
    assert.ok(ids(back).includes("camera"));
    assert.equal(ids(back)[ids(back).indexOf(L.GAMES_FOLDER_ID) + 1], "camera", "it lands right after the folder");
    const one = L.createFolder(d, "map", "Extras");
    const fid = one.items.find((i) => i.kind === "folder" && i.apps.includes("map")).id;
    assert.equal(folder(L.takeOut(one, "map"), fid), undefined);
    assert.equal(L.takeOut(d, "chats"), d, "an app on the home screen has nothing to take out of");
  });
  it("moves an app from one folder to another, and moving an app out of a folder before an icon puts it on the home screen", () => {
    const one = L.createFolder(d, "map", "Extras");
    const fid = one.items.find((i) => i.kind === "folder" && i.apps.includes("map")).id;
    const moved = L.addToFolder(one, "map", L.GAMES_FOLDER_ID);
    assert.equal(folder(moved, fid), undefined, "the emptied folder is gone");
    const out = L.moveBefore(L.addToFolder(d, "camera", L.GAMES_FOLDER_ID), "camera", "chats");
    assert.equal(ids(out)[0], "camera");
  });
  it("renames a folder (never to nothing) and undoes one in place", () => {
    assert.equal(folder(L.renameFolder(d, L.GAMES_FOLDER_ID, "Science"), L.GAMES_FOLDER_ID).name, "Science");
    assert.equal(L.renameFolder(d, L.GAMES_FOLDER_ID, "  "), d);
    const undone = L.dissolveFolder(d, L.GAMES_FOLDER_ID);
    assert.equal(folder(undone, L.GAMES_FOLDER_ID), undefined);
    assert.deepEqual(ids(undone).slice(5, 10), ["atom-maze", "lab-build-atom", "mythbuster", "lab-decay", "lab-shield"]);
    assert.deepEqual([...allApps(undone)].sort(), [...live].sort());
  });
});

describe("what the home screen draws", () => {
  const d = L.defaultLayout(PHONE_APPS);
  const installed = (...list) => (id) => list.includes(id);
  const start = ["chats", "contacts", "atomdex", "daily-fact", "settings"];
  it("shows the starting apps and then the next three still to come, locked; the games folder waits for its first game", () => {
    const e = L.homeEntries(d, PHONE_APPS, installed(...start));
    assert.deepEqual(e.slice(0, 5).map((x) => x.app?.id), start);
    assert.ok(e.slice(0, 5).every((x) => x.kind === "app" && !x.locked));
    const soon = e.slice(5);
    assert.equal(soon.length, L.UPCOMING_SHOWN);
    assert.ok(soon.every((x) => x.kind === "app" && x.locked));
    assert.deepEqual(soon.map((x) => x.app.id), ["shop", "field-notes", "scanner"], "the games are in the folder, so they are not listed as to come");
  });
  it("shows the folder once one game is installed, with its locked members marked", () => {
    const e = L.homeEntries(d, PHONE_APPS, installed(...start, "atom-maze"));
    const f = e.find((x) => x.kind === "folder");
    assert.equal(f.name, "Games");
    assert.deepEqual(f.members.map((m) => [m.app.id, m.locked]), [["atom-maze", false], ["lab-build-atom", true], ["mythbuster", true], ["lab-decay", true], ["lab-shield", true]]);
    assert.equal(e.indexOf(f), 5, "installed items keep the learner's order");
  });
  it("follows the learner's arrangement for installed apps and keeps the to-come row in progression order", () => {
    const mine = L.moveBefore(d, "settings", "chats");
    const e = L.homeEntries(mine, PHONE_APPS, installed(...start));
    assert.equal(e[0].app.id, "settings");
    assert.deepEqual(L.homeEntries(mine, PHONE_APPS, installed(...start)).slice(5).map((x) => x.app.id), ["shop", "field-notes", "scanner"]);
  });
  it("shows every app when all are installed and nothing is left to come", () => {
    const e = L.homeEntries(d, PHONE_APPS, () => true);
    assert.ok(e.every((x) => x.kind === "folder" || !x.locked));
    assert.equal(e.filter((x) => x.kind === "app").length + e.filter((x) => x.kind === "folder").reduce((n, f) => n + f.members.length, 0), live.length);
  });
});
