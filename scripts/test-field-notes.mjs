import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("services/field-notes-core.ts")).href);

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE field_notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', source_type TEXT, source_id TEXT,
    snippet TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL DEFAULT 0, synced_at INTEGER, is_dirty INTEGER DEFAULT 1, deleted_at INTEGER, version INTEGER DEFAULT 1)`);
  return {
    async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
  };
}
function store() {
  let n = 0;
  return core.createFieldNotesStore(((db) => () => db)(memoryDb()), () => `n${++n}`);
}

test("a note is made, read back and saved", async () => {
  const s = store();
  const made = await s.create({ title: "Atoms", body: "tiny" }, 100);
  assert.equal(made.ok, true);
  assert.deepEqual(await s.get(made.note.id), { id: "n1", title: "Atoms", body: "tiny", sourceType: null, sourceId: null, snippet: null, createdAt: 100, updatedAt: 100 });
  assert.equal(await s.save("n1", { title: "Atoms!", body: "tiny things" }, 200), true);
  const again = await s.get("n1");
  assert.equal(again.title, "Atoms!");
  assert.equal(again.updatedAt, 200);
  assert.equal(await s.save("missing", { title: "", body: "" }, 1), false);
});

test("title and body are cut to their limits, never silently kept longer", async () => {
  const s = store();
  const made = await s.create({ title: "t".repeat(500), body: "b".repeat(5000) }, 1);
  assert.equal(made.note.title.length, core.NOTE_LIMITS.title);
  assert.equal(made.note.body.length, core.NOTE_LIMITS.body);
  await s.save(made.note.id, { title: "x".repeat(999), body: "y".repeat(9999) }, 2);
  const n = await s.get(made.note.id);
  assert.equal(n.title.length, core.NOTE_LIMITS.title);
  assert.equal(n.body.length, core.NOTE_LIMITS.body);
});

test("the notebook holds 200 notes and then says it is full", async () => {
  const s = store();
  for (let i = 0; i < core.NOTE_LIMITS.notes; i++) assert.equal((await s.create({ body: `n${i}` }, i)).ok, true);
  assert.deepEqual(await s.create({ body: "one more" }, 999), { ok: false, reason: "full" });
  assert.equal(await s.count(), core.NOTE_LIMITS.notes);
  // deleting one makes room
  await s.remove("n1", 1000);
  assert.equal((await s.create({ body: "now there is room" }, 1001)).ok, true);
});

test("a deleted note is gone from every read", async () => {
  const s = store();
  await s.create({ title: "keep" }, 1);
  await s.create({ title: "drop" }, 2);
  assert.equal(await s.remove("n2", 3), true);
  assert.equal(await s.remove("n2", 4), false);
  assert.equal(await s.get("n2"), null);
  assert.deepEqual((await s.list()).map((n) => n.id), ["n1"]);
  assert.equal(await s.count(), 1);
});

test("the list is most recently changed first", async () => {
  const s = store();
  await s.create({ title: "a" }, 1);
  await s.create({ title: "b" }, 2);
  await s.create({ title: "c" }, 3);
  await s.save("n1", { title: "a", body: "edited" }, 10);
  assert.deepEqual((await s.list()).map((n) => n.title), ["a", "c", "b"]);
});

test("search looks in the title, the body and the quoted line, and treats % and _ as text", async () => {
  const s = store();
  await s.create({ title: "Isotopes", body: "same protons" }, 1);
  await s.create({ title: "Half life", body: "50% decays" }, 2);
  await s.create({ title: "Clip", source: { type: "atomdex", id: "quark", snippet: "A quark is a particle." } }, 3);
  assert.deepEqual((await s.list("isoTOPE")).map((n) => n.title), ["Isotopes"]);
  assert.deepEqual((await s.list("protons")).map((n) => n.title), ["Isotopes"]);
  assert.deepEqual((await s.list("quark")).map((n) => n.title), ["Clip"]);
  assert.deepEqual((await s.list("50%")).map((n) => n.title), ["Half life"]);
  assert.deepEqual(await s.list("%"), (await s.list("%")).filter((n) => n.body.includes("%")));
  assert.deepEqual((await s.list("_")).length, 0);
  assert.equal((await s.list("   ")).length, 3);
});

test("a source is clipped once: it can be found again", async () => {
  const s = store();
  const made = await s.create({ source: { type: "fact", id: "m1", snippet: "  Bananas are slightly radioactive.  " } }, 1);
  assert.equal(made.note.snippet, "Bananas are slightly radioactive.");
  assert.equal((await s.findBySource("fact", "m1")).id, made.note.id);
  assert.equal(await s.findBySource("fact", "other"), null);
  assert.equal(await s.findBySource("atomdex", "m1"), null);
  await s.remove(made.note.id, 5);
  assert.equal(await s.findBySource("fact", "m1"), null);
});

test("an empty note is one with no title, body or clipping", () => {
  assert.equal(core.isEmptyNote({ title: " ", body: "\n", snippet: null }), true);
  assert.equal(core.isEmptyNote({ title: "", body: "x", snippet: null }), false);
  assert.equal(core.isEmptyNote({ title: "", body: "", snippet: "quoted" }), false);
});

test("titles and previews", () => {
  assert.equal(core.noteTitle({ title: "Atoms", body: "b", snippet: null }), "Atoms");
  assert.equal(core.noteTitle({ title: "", body: "\n  First line\nsecond", snippet: null }), "First line");
  assert.equal(core.noteTitle({ title: "", body: "", snippet: "Quoted." }), "Quoted.");
  assert.equal(core.noteTitle({ title: "", body: "", snippet: null }), "Untitled note");
  assert.equal(core.notePreview({ title: "Atoms", body: "tiny things\nmore", snippet: null }), "tiny things");
  assert.equal(core.notePreview({ title: "", body: "Only line", snippet: null }), "");
});

test("a clipping points back to its source", () => {
  assert.equal(core.sourceHref("atomdex", "half life"), "/explorer/encyclopedia-entry?id=half%20life");
  assert.equal(core.sourceHref("fact", "m1"), "/daily-facts");
  assert.equal(core.sourceHref("lesson", "atoms-are-everywhere"), "/lesson/atoms-are-everywhere");
  assert.equal(core.sourceLabel("atomdex"), "From the AtomDex");
  assert.equal(core.sourceLabel("scan"), "From the Atom Scanner");
  assert.equal(core.sourceHref("scan", "scan-banana"), "/phone-apps/scanner?target=scan-banana");
});

test("the counter warns near the limit and says full at it", () => {
  assert.deepEqual(core.counterOf(10, 2000), { text: "10 / 2000", warn: false, full: false });
  assert.equal(core.counterOf(1800, 2000).warn, true);
  assert.equal(core.counterOf(1800, 2000).full, false);
  assert.equal(core.counterOf(2000, 2000).full, true);
});

test("dates", () => {
  const now = new Date(2026, 10, 20, 15, 0).getTime();
  assert.equal(core.noteDateLabel(new Date(2026, 10, 20, 1, 0).getTime(), now), "Today");
  assert.equal(core.noteDateLabel(new Date(2026, 10, 19, 23, 0).getTime(), now), "Yesterday");
  assert.equal(core.noteDateLabel(new Date(2026, 10, 8).getTime(), now), "8 Nov");
  assert.equal(core.noteDateLabel(new Date(2025, 11, 31).getTime(), now), "31 Dec 2025");
});

test("a clipping's quoted line is the first sentence, cut at a word", () => {
  assert.equal(core.clipSnippet("An atom is tiny. It has a nucleus."), "An atom is tiny.");
  assert.equal(core.clipSnippet("  no   end punctuation here "), "no end punctuation here");
  const long = core.clipSnippet("word ".repeat(100), 40);
  assert.ok(long.length <= 40 && long.endsWith("…"), long);
  assert.ok(!long.includes("  "));
});

test("the shelf's tabs filter the notes", () => {
  const notes = [{ id: "a", sourceType: null }, { id: "b", sourceType: "fact" }, { id: "c", sourceType: "scan" }];
  assert.deepEqual(core.filterNotes(notes, "all").map((n) => n.id), ["a", "b", "c"]);
  assert.deepEqual(core.filterNotes(notes, "written").map((n) => n.id), ["a"]);
  assert.deepEqual(core.filterNotes(notes, "clipped").map((n) => n.id), ["b", "c"]);
  assert.deepEqual(core.NOTE_FILTERS.map((f) => f.id), ["all", "written", "clipped"]);
});

test("every kind of note has a look, and a count reads as a phrase", () => {
  for (const kind of ["written", "atomdex", "fact", "scan", "lesson"]) assert.ok(core.KIND_LOOK[kind], kind);
  assert.equal(core.noteKind({ sourceType: null }), "written");
  assert.equal(core.noteKind({ sourceType: "scan" }), "scan");
  assert.equal(core.noteCountLabel(1), "1 note");
  assert.equal(core.noteCountLabel(0), "0 notes");
  assert.equal(core.noteCountLabel(12), "12 notes");
});
