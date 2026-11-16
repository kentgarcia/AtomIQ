/**
 * Backups, entity history and transactional store tests (spec §3.8, §4.1).
 *
 * Run: npm run test:backups
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  BACKUP_REASONS,
  RETENTION,
  createBackup,
  listBackups,
  maybeAutoDailyBackup,
  restoreMasterFrom,
  schemaDifferences,
  verifyDatabaseFile,
} from "./lib/backup.mjs";
import {
  StoreError,
  createStore,
  listDeleted,
  listRevisions,
  openHistory,
  pruneHistory,
  recordChange,
} from "./lib/content-store.mjs";
import { openDb } from "./lib/content-tables.mjs";
import { makeFixture, query, sql } from "./lib/test-fixture.mjs";

const fixtures = [];
const fixture = () => {
  const f = makeFixture();
  fixtures.push(f);
  return f;
};
after(() => fixtures.forEach((f) => f.cleanup()));

const at = (iso) => new Date(iso);
const count = (file, table) => {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  } finally {
    db.close();
  }
};

describe("file backups", () => {
  it("captures writes that are still only in the WAL (a raw file copy would miss them)", () => {
    const { paths } = fixture();
    const db = new DatabaseSync(paths.master);
    db.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0;");
    db.exec("UPDATE myths SET title = 'ONLY-IN-WAL' WHERE id = (SELECT id FROM myths LIMIT 1)");

    const raw = path.join(path.dirname(paths.master), "raw-copy.db");
    fs.copyFileSync(paths.master, raw);
    const backup = createBackup(paths, "manual", "wal test");
    db.close();

    const titles = (file) => {
      const d = new DatabaseSync(file, { readOnly: true });
      try {
        return d.prepare("SELECT title FROM myths").all().map((r) => r.title);
      } finally {
        d.close();
      }
    };
    assert.ok(titles(backup).includes("ONLY-IN-WAL"), "VACUUM INTO backup has the WAL write");
    assert.ok(!titles(raw).includes("ONLY-IN-WAL"), "sanity: a plain copy misses it");
  });

  it("names backups by time, reason and label, and lists them newest first", () => {
    const { paths } = fixture();
    createBackup(paths, "manual", "Before Big Edit!", at("2026-11-10T08:00:00Z"));
    createBackup(paths, "auto-daily", undefined, at("2026-11-11T08:00:00Z"));
    const list = listBackups(paths);
    assert.deepEqual(list.map((b) => [b.reason, b.label]), [["auto-daily", null], ["manual", "before-big-edit"]]);
    assert.equal(list[0].createdAt, "2026-11-11T08:00:00.000Z");
    assert.ok(list.every((b) => b.size > 0));
  });

  it("rejects unknown reasons", () => {
    const { paths } = fixture();
    assert.throws(() => createBackup(paths, "whenever"), /Unknown backup reason/);
    assert.deepEqual(BACKUP_REASONS, Object.keys(RETENTION));
  });

  it("prunes per reason but never manual backups", () => {
    const { paths } = fixture();
    for (let i = 0; i < 17; i++) createBackup(paths, "auto-daily", undefined, at(`2026-10-${String(i + 1).padStart(2, "0")}T08:00:00Z`));
    for (let i = 0; i < 25; i++) createBackup(paths, "manual", `n${i}`, at(`2026-09-01T08:00:${String(i).padStart(2, "0")}Z`));
    const list = listBackups(paths);
    assert.equal(list.filter((b) => b.reason === "auto-daily").length, RETENTION["auto-daily"]);
    assert.equal(list.filter((b) => b.reason === "manual").length, 25);
    // The oldest dailies went first.
    const oldest = list.filter((b) => b.reason === "auto-daily").at(-1);
    assert.equal(oldest.createdAt.slice(0, 10), "2026-10-04");
  });

  it("takes an auto-daily backup only when the newest is over 24 hours old", () => {
    const { paths } = fixture();
    assert.ok(maybeAutoDailyBackup(paths, at("2026-11-16T08:00:00Z")));
    assert.equal(maybeAutoDailyBackup(paths, at("2026-11-16T20:00:00Z")), null);
    assert.ok(maybeAutoDailyBackup(paths, at("2026-11-17T09:00:00Z")));
  });

  it("copies backups to ATOMIQ_BACKUP_DIR when set", () => {
    const { paths, root } = fixture();
    const mirror = path.join(root, "mirror");
    process.env.ATOMIQ_BACKUP_DIR = mirror;
    try {
      const file = createBackup(paths, "manual");
      assert.ok(fs.existsSync(path.join(mirror, path.basename(file))));
    } finally {
      delete process.env.ATOMIQ_BACKUP_DIR;
    }
  });
});

describe("restore", () => {
  it("takes a pre-restore backup first and replaces the master", () => {
    const { paths } = fixture();
    const good = createBackup(paths, "manual", "good");
    const mythsBefore = count(paths.master, "myths");
    sql(paths, "DELETE FROM myths");
    assert.equal(count(paths.master, "myths"), 0);

    const { preRestoreBackup } = restoreMasterFrom(paths, good);
    assert.equal(count(paths.master, "myths"), mythsBefore);
    assert.ok(preRestoreBackup.includes("pre-restore"));
    assert.equal(count(preRestoreBackup, "myths"), 0, "the pre-restore backup holds the state we replaced");
  });

  it("refuses a corrupt or foreign file", () => {
    const { paths, root } = fixture();
    const junk = path.join(root, "junk.db");
    fs.writeFileSync(junk, "this is not a database");
    assert.equal(verifyDatabaseFile(junk).ok, false);
    assert.throws(() => restoreMasterFrom(paths, junk), /Refusing to restore/);

    const empty = path.join(root, "empty.db");
    new DatabaseSync(empty).close();
    assert.throws(() => restoreMasterFrom(paths, empty), /Refusing to restore/);
  });

  it("refuses a different schema unless forced", () => {
    const { paths } = fixture();
    const backup = createBackup(paths, "manual");
    sql(paths, "ALTER TABLE myths ADD COLUMN extra_note TEXT");
    assert.ok(schemaDifferences(paths.master, backup).some((d) => d.includes("myths")));
    assert.throws(() => restoreMasterFrom(paths, backup), /Schema differs/);
    assert.doesNotThrow(() => restoreMasterFrom(paths, backup, { force: true }));
  });
});

describe("history and the validated store", () => {
  const setup = () => {
    const f = fixture();
    const db = openDb(f.paths.master);
    const history = openHistory(f.paths.historyDb);
    const store = createStore({ db, history, paths: f.paths });
    return { ...f, db, history, store };
  };

  it("records an update with its source, and rejects an invalid edit without trace", () => {
    const { paths, db, history, store } = setup();
    const id = query(paths, "SELECT id FROM myths LIMIT 1")[0].id;
    const before = query(paths, "SELECT reality FROM myths WHERE id = ?", id)[0].reality;

    store.updateRow({ table: "myths", pk: [id], values: { reality: `${before} Evidence supports this.` }, source: "plugin" });
    const revisions = listRevisions(history, "myths", id);
    assert.equal(revisions.length, 1);
    assert.equal(revisions[0].source, "plugin");
    assert.equal(revisions[0].action, "update");
    assert.equal(revisions[0].before.row.reality, before);

    // An empty statement is a validation error: nothing is written, nothing is recorded.
    assert.throws(
      () => store.updateRow({ table: "myths", pk: [id], values: { myth_statement: "" }, source: "studio" }),
      (e) => e instanceof StoreError && e.status === 422 && e.errors.length > 0,
    );
    assert.equal(listRevisions(history, "myths", id).length, 1);
    assert.notEqual(query(paths, "SELECT myth_statement FROM myths WHERE id = ?", id)[0].myth_statement, "");
    db.close();
  });

  it("does not record a save that changes nothing", () => {
    const { paths, db, history, store } = setup();
    const row = query(paths, "SELECT id, title FROM myths LIMIT 1")[0];
    store.updateRow({ table: "myths", pk: [row.id], values: { title: row.title }, source: "studio" });
    assert.equal(listRevisions(history, "myths", row.id).length, 0);
    db.close();
  });

  it("records child edits against the parent entity", () => {
    const { paths, db, history, store } = setup();
    const card = query(paths, "SELECT lesson_id, id, data FROM lesson_cards WHERE kind = 'teach' ORDER BY lesson_id, position LIMIT 1")[0];
    const data = JSON.parse(card.data);
    data.body = `${data.body} Evidence supports this.`;
    store.updateRow({ table: "lesson_cards", pk: [card.lesson_id, card.id], values: { data: JSON.stringify(data) }, source: "studio" });
    const revisions = listRevisions(history, "lessons", card.lesson_id);
    assert.equal(revisions.length, 1);
    assert.ok(revisions[0].before.children.lesson_cards.length > 1, "revision carries the lesson's cards");
    db.close();
  });

  it("saves a whole lesson atomically and reassigns positions from array order", () => {
    const { paths, db, history, store } = setup();
    const lessonId = query(paths, "SELECT id FROM lessons ORDER BY id LIMIT 1")[0].id;
    const entity = store.readEntity({ table: "lessons", pk: [lessonId] });
    // Swap two neighbouring cards: still a valid lesson, different order.
    const swapped = [...entity.children.lesson_cards];
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    const children = swapped.map(({ position, ...rest }) => rest);

    store.saveEntity({ table: "lessons", pk: [lessonId], row: { title: entity.row.title }, children, source: "studio" });
    const after = query(paths, "SELECT id FROM lesson_cards WHERE lesson_id = ? ORDER BY position", lessonId).map((r) => r.id);
    assert.deepEqual(after, swapped.map((c) => c.id));
    assert.equal(listRevisions(history, "lessons", lessonId).length, 1);

    // A card pointing at an item that does not exist makes the whole save fail and leaves the order untouched.
    const broken = children.map((c) => (c.kind === "item" ? { ...c, item_id: "no-such-item" } : c));
    assert.throws(() => store.saveEntity({ table: "lessons", pk: [lessonId], row: { title: entity.row.title }, children: broken, source: "studio" }), StoreError);
    assert.deepEqual(query(paths, "SELECT id FROM lesson_cards WHERE lesson_id = ? ORDER BY position", lessonId).map((r) => r.id), after);
    db.close();
  });

  it("refuses to delete or rename a shipped id, and retires it with a reason", () => {
    const { paths, db, history, store } = setup();
    const mazeId = query(paths, "SELECT id FROM mazes ORDER BY id LIMIT 1")[0].id;
    fs.writeFileSync(paths.shippedIds, JSON.stringify({ mazes: [mazeId] }));

    assert.throws(
      () => store.deleteRow({ table: "mazes", pk: [mazeId], source: "studio" }),
      (e) => e.status === 409 && e.needsReason === true,
    );
    assert.throws(
      () => store.updateRow({ table: "mazes", pk: [mazeId], values: { id: "renamed" }, source: "studio" }),
      (e) => e.status === 409 && /shipped/.test(e.message),
    );
    assert.equal(count(paths.master, "mazes"), query(paths, "SELECT COUNT(*) n FROM mazes")[0].n);

    const roomsBefore = count(paths.master, "maze_rooms");
    store.deleteRow({ table: "mazes", pk: [mazeId], source: "studio", retireReason: "merged into another maze" });
    assert.match(JSON.parse(fs.readFileSync(paths.retiredIds, "utf8")).mazes[mazeId], /merged into another maze/);
    assert.ok(count(paths.master, "maze_rooms") < roomsBefore);

    // It shows up as deleted, and restoring brings back the maze with its rooms.
    const deleted = listDeleted(history, db);
    assert.ok(deleted.some((d) => d.entity_table === "mazes" && d.entity_pk === mazeId));
    const rev = deleted.find((d) => d.entity_pk === mazeId);
    store.restoreRevision({ id: rev.id, side: "before" });
    assert.equal(count(paths.master, "maze_rooms"), roomsBefore);
    assert.equal(listDeleted(history, db).some((d) => d.entity_pk === mazeId), false);
    db.close();
  });

  it("deletes non-shipped rows without a reason", () => {
    const { paths, db, store } = setup();
    const id = query(paths, "SELECT id FROM mythbuster_questions LIMIT 1")[0].id;
    store.deleteRow({ table: "mythbuster_questions", pk: [id], source: "studio" });
    assert.equal(query(paths, "SELECT COUNT(*) n FROM mythbuster_questions WHERE id = ?", id)[0].n, 0);
    db.close();
  });
});

describe("history retention", () => {
  it("keeps 90 days, or the newest 50 revisions per entity, whichever keeps more", () => {
    const { paths } = fixture();
    const history = openHistory(paths.historyDb);
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 10, 16);
    const rec = (pk, daysAgo) => recordChange(history, { table: "myths", pk, action: "update", source: "studio", before: { row: {} }, after: { row: {} }, ts: now - daysAgo * DAY });
    for (let i = 0; i < 60; i++) rec("busy", 100 + i); // 60 old revisions: keep the newest 50
    for (let i = 0; i < 3; i++) rec("quiet", 200 + i); // 3 old revisions: all kept (under 50)
    for (let i = 0; i < 5; i++) rec("recent", i); // within 90 days
    pruneHistory(history, now);
    const n = (pk) => history.prepare("SELECT COUNT(*) AS n FROM changes WHERE entity_pk = ?").get(pk).n;
    assert.equal(n("busy"), 50);
    assert.equal(n("quiet"), 3);
    assert.equal(n("recent"), 5);
    history.close();
  });
});
