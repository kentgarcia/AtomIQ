/**
 * Translations (docs/features/CONTENT_SOURCE_I18N_SPEC.md): the framework-free rules, the `i18n` adapter's file form, the
 * validation rules against the real master, and a sync of a translation file through a throwaway repo.
 *
 * Run: npm run test:i18n
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  BASE_LOCALE, applyTranslation, formatPath, getAt, localeChain, normalizeLocale, parsePath, pickFields, placeholdersOf, samePlaceholders, setAt, wordLeaves,
} from "../content/i18n/i18n-core.ts";
import { i18nAdapter } from "./lib/content-source/adapters/i18n.mjs";
import { readFiles, renderFiles } from "./lib/content-source/pipeline.mjs";
import { readSourceFiles, writeSourceFiles } from "./lib/content-source/files.mjs";
import { readRowsByTable } from "./lib/content-source/adapters/default.mjs";
import { ownedAdapters } from "./lib/content-source/owned.mjs";
import { writeState } from "./lib/content-source/state.mjs";
import { runSync } from "./lib/content-source/sync.mjs";
import { SourceError } from "./lib/content-source/core/errors.mjs";
import { openDb } from "./lib/content-tables.mjs";
import { validateI18n, translatableColumns } from "./lib/i18n-rules.mjs";
import { validateDatabase } from "./lib/content-validate.mjs";
import { makeFixture, query, sql } from "./lib/test-fixture.mjs";

describe("paths", () => {
  it("parse and format both ways, and refuse what is not a path", () => {
    for (const p of ["title", "options[1]", "data.options[0].label", "replies[10].label", "a.b.c"]) assert.equal(formatPath(parsePath(p)), p);
    assert.deepEqual(parsePath("data.options[0].label"), ["data", "options", 0, "label"]);
    for (const bad of ["", "[0]", "a..b", ".a", "a.", "a[x]", "a[]", "a b"]) assert.equal(bad === "a b" ? parsePath(bad) !== null : parsePath(bad), bad === "a b" ? true : null, bad);
  });

  it("getAt and setAt read and replace a string without touching the base", () => {
    const row = { title: "T", data: { options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], n: 3 } };
    assert.equal(getAt(row, ["data", "options", 1, "label"]), "B");
    assert.equal(getAt(row, ["data", "options", 5, "label"]), undefined);
    const out = setAt(row, ["data", "options", 1, "label"], "BB");
    assert.equal(out.data.options[1].label, "BB");
    assert.equal(row.data.options[1].label, "B", "the base row is not changed");
    assert.equal(out.data.options[0], row.data.options[0], "untouched parts are shared");
    assert.equal(setAt(row, ["data", "n"], "x"), row, "only a string can be replaced");
    assert.equal(setAt(row, ["data", "gone"], "x"), row);
  });
});

describe("what is words", () => {
  it("word keys are translated and ids, art, answers and picture labels are not", () => {
    const data = { prompt: "P", answer: "light", art: "lamp", options: [{ id: "light", label: "Light", note: "N", art: "lamp" }], items: ["a", "b"] };
    assert.deepEqual(wordLeaves(data, ["data"]).map(([p]) => p), ["data.prompt", "data.options[0].label", "data.options[0].note"]);
  });

  it("the label of a sticker or reaction reply is a picture id, a text reply's label is words", () => {
    const replies = [{ label: "hello there" }, { label: "love", type: "react" }, { label: "nerd", type: "emoji" }, { label: "sure", type: "text" }];
    assert.deepEqual(wordLeaves(replies, ["replies"]).map(([p]) => p), ["replies[0].label", "replies[3].label"]);
  });

  it("the items of a blog list block are words; the items of an order question are not", () => {
    assert.deepEqual(wordLeaves([{ t: "list", items: ["one", "two"] }, { t: "p", text: "x" }], ["blocks"]).map(([p]) => p), ["blocks[0].items[0]", "blocks[0].items[1]", "blocks[1].text"]);
    assert.deepEqual(wordLeaves({ items: ["first", "second"] }, ["data"]), []);
  });

  it("placeholders: {names} and [[pic:id]] must survive a translation exactly", () => {
    assert.deepEqual(placeholdersOf("Hi {name}, see [[pic:atom]] {name}"), ["[[pic:atom]]", "{name}", "{name}"]);
    assert.ok(samePlaceholders("Hi {name}", "Hola {name}"));
    assert.ok(!samePlaceholders("Hi {name}", "Hola"));
    assert.ok(!samePlaceholders("Hi {name}", "Hola {nombre}"));
    assert.ok(!samePlaceholders("[[pic:atom]]", "[[pic:orbit]]"));
    assert.ok(samePlaceholders("Plain.", "Sencillo."));
  });
});

describe("runtime lookup", () => {
  it("a translation is laid over the base row and the rest stays in the base language", () => {
    const row = { id: "c1", title: "Atoms", text: "Hello", replies: [{ label: "ok", next: "x" }] };
    const out = applyTranslation(row, { title: "Átomos", "replies[0].label": "vale" });
    assert.deepEqual(out, { id: "c1", title: "Átomos", text: "Hello", replies: [{ label: "vale", next: "x" }] });
    assert.equal(applyTranslation(row, null), row);
    assert.deepEqual(applyTranslation(row, {}), row);
  });

  it("an entry that fell behind its base (a path that is gone) is ignored, never a crash", () => {
    const row = { title: "A", options: ["x"] };
    assert.deepEqual(applyTranslation(row, { "options[3]": "z", missing: "m", "title.deep": "d", title: "B" }), { title: "B", options: ["x"] });
    assert.deepEqual(applyTranslation(row, { "bad path": "z", title: "" }), row);
  });

  it("the language chain goes from the region to the language to the base, and only through languages that exist", () => {
    assert.deepEqual(localeChain("pt-BR", ["pt", "pt-BR", "es"]), ["pt-BR", "pt"]);
    assert.deepEqual(localeChain("pt-BR", ["pt"]), ["pt"]);
    assert.deepEqual(localeChain("zh-Hant-TW", ["zh-Hant", "zh"]), ["zh-Hant", "zh"]);
    assert.deepEqual(localeChain("fr", ["es"]), []);
    assert.deepEqual(localeChain(BASE_LOCALE, [BASE_LOCALE, "es"]), [], "the base language needs no translation");
    assert.deepEqual(localeChain(null, ["es"]), []);
  });

  it("a saved language code is kept only when it is well formed", () => {
    assert.equal(normalizeLocale(" pt-BR "), "pt-BR");
    assert.equal(normalizeLocale("es"), "es");
    for (const bad of ["", "Spanish", "e", "es_MX", null, undefined, 5]) assert.equal(normalizeLocale(bad), null);
  });

  it("the first language with an entry wins, whole, and none means the base row", () => {
    const entries = { "pt-BR": { title: "Átomos BR" }, pt: { title: "Átomos", text: "Olá" } };
    assert.deepEqual(pickFields(["pt-BR", "pt"], (l) => entries[l]), { title: "Átomos BR" }, "entries do not mix");
    assert.deepEqual(pickFields(["es", "pt"], (l) => entries[l]), { title: "Átomos", text: "Olá" });
    assert.equal(pickFields([], (l) => entries[l]), null);
    assert.equal(pickFields(["xx"], (l) => entries[l]), null);
  });
});

const SAMPLE = {
  content_translations: [
    { locale: "es", entity: "chat_nodes", entity_id: "chat-demo-greeting", fields: { title: "Charla", "replies[0].label": "la lección", "replies[2].label": "x", "replies[10].label": "y", text: "Hola.\n\n¿De qué quieres hablar?" } },
    { locale: "es", entity: "lesson_cards", entity_id: "half-life/c01", fields: { "data.title": "Vida media" } },
    { locale: "pt-BR", entity: "myths", entity_id: "myth-one", fields: { title: "Mito" } },
  ],
};

describe("the i18n adapter", () => {
  it("writes one file per language, entries sorted, paths in reading order, long text as a block", () => {
    const files = renderFiles(i18nAdapter, SAMPLE);
    assert.deepEqual([...files.keys()], ["i18n/es.atomiq", "i18n/pt-BR.atomiq"]);
    const es = files.get("i18n/es.atomiq");
    assert.match(es, /^format 1\nadapter i18n 1\nlocale: es\n\nentry chat_nodes chat-demo-greeting\nreplies\[0\]\.label: la lección\nreplies\[2\]\.label: x\nreplies\[10\]\.label: y\n/);
    assert.match(es, /text:\n {4}Hola\.\n\n {4}¿De qué quieres hablar\?\n/);
    assert.ok(es.indexOf("entry chat_nodes") < es.indexOf("entry lesson_cards"));
  });

  it("reads back exactly the rows and is stable on a second write", () => {
    const files = renderFiles(i18nAdapter, SAMPLE);
    const back = readFiles(i18nAdapter, files).rows;
    const key = (r) => `${r.locale}/${r.entity}/${r.entity_id}`;
    const canon = (rows) => JSON.stringify([...rows].sort((a, b) => (key(a) < key(b) ? -1 : 1)).map((r) => [key(r), Object.entries(r.fields).sort()]));
    assert.equal(canon(back.content_translations), canon(SAMPLE.content_translations));
    for (const [k, v] of renderFiles(i18nAdapter, back)) assert.equal(files.get(k), v);
  });

  const fail = (text, pattern, line) => {
    const files = new Map([["i18n/es.atomiq", text]]);
    assert.throws(() => readFiles(i18nAdapter, files), (err) => {
      assert.ok(err instanceof SourceError, String(err));
      assert.match(err.message, pattern);
      if (line) assert.equal(err.line, line, err.message);
      return true;
    });
  };
  const head = "format 1\nadapter i18n 1\nlocale: es\n\n";
  it("refuses a path twice, an empty text, a key that is not a path, and an entry that is not entity + id", () => {
    fail(`${head}entry myths m1\ntitle: A\ntitle: B\n`, /translated twice/, 7);
    fail(`${head}entry myths m1\ntitle:\n`, /empty/, 6);
    fail(`${head}entry myths m1\n[0]: A\n`, /not a field path/, 6);
    fail(`${head}entry myths\ntitle: A\n`, /id part/, 5);
    fail(`${head}entry myths m1\ntitle: A\n\nentry myths m1\ntitle: B\n`, /defined twice/, 8);
    fail("format 1\nadapter i18n 1\n\nentry myths m1\ntitle: A\n", /needs "locale"|missing/, null);
  });
  it("refuses to write a text it cannot keep exactly", () => {
    assert.throws(() => renderFiles(i18nAdapter, { content_translations: [{ locale: "es", entity: "myths", entity_id: "m", fields: { title: "" } }] }), /non-empty/);
    assert.throws(() => renderFiles(i18nAdapter, { content_translations: [{ locale: "es", entity: "myths", entity_id: "m", fields: { "bad path": "x" } }] }), /not a field path/);
  });
});

describe("validation against the real master", () => {
  const withRows = (rows, fn) => {
    const fx = makeFixture();
    try {
      for (const r of rows) sql(fx.paths, "INSERT INTO content_translations (locale, entity, entity_id, fields) VALUES (?, ?, ?, ?)", r.locale, r.entity, r.entity_id, JSON.stringify(r.fields));
      const db = openDb(fx.paths.master, { readOnly: true });
      try {
        return fn(db, fx);
      } finally {
        db.close();
      }
    } finally {
      fx.cleanup();
    }
  };
  const rulesOf = (rows) => withRows(rows, (db) => validateI18n(db).findings.map((f) => `${f.rule}:${f.field}`));

  const pick = () => {
    const db = openDb(path.join(path.dirname(new URL(import.meta.url).pathname), "..", "content", "database", "content.db"), { readOnly: true });
    try {
      return {
        node: db.prepare("SELECT id FROM chat_nodes WHERE replies LIKE '%\"type\":\"emoji\"%' AND title IS NOT NULL LIMIT 1").get()
          ?? db.prepare("SELECT id FROM chat_nodes LIMIT 1").get(),
        choice: db.prepare("SELECT lesson_id, id FROM lesson_cards WHERE kind='item' LIMIT 1").get(),
        teach: db.prepare("SELECT lesson_id, id FROM lesson_cards WHERE kind='teach' AND json_extract(data,'$.title') IS NOT NULL LIMIT 1").get(),
        myth: db.prepare("SELECT id FROM myths LIMIT 1").get(),
        mb: db.prepare("SELECT id FROM mythbuster_questions LIMIT 1").get(),
        feed: db.prepare("SELECT id, text FROM feed_templates WHERE text LIKE '%{%' LIMIT 1").get(),
      };
    } finally {
      db.close();
    }
  };
  const real = pick();

  it("no translations means nothing to check", () => {
    assert.deepEqual(rulesOf([]), []);
  });

  it("the tables with words come from the adapters", () => {
    const t = translatableColumns();
    for (const table of ["chat_nodes", "feed_templates", "myths", "lesson_cards", "items", "lessons", "units", "encyclopedia_entries", "blog_posts", "mythbuster_questions"]) assert.ok(t.has(table), table);
    assert.ok(t.get("lesson_cards").has("data"));
    assert.ok(!t.has("shop_owned"));
  });

  it("good translations pass: text columns, a list item, a path into JSON and a card's title", () => {
    const ok = rulesOf([
      { locale: "es", entity: "myths", entity_id: real.myth.id, fields: { title: "Mito" } },
      { locale: "es", entity: "mythbuster_questions", entity_id: real.mb.id, fields: { "options[0]": "Uno" } },
      { locale: "es", entity: "lesson_cards", entity_id: `${real.teach.lesson_id}/${real.teach.id}`, fields: { "data.title": "Título" } },
      { locale: "pt-BR", entity: "chat_nodes", entity_id: real.node.id, fields: { text: "Olá" } },
    ]);
    assert.deepEqual(ok, []);
  });

  it("refuses the base language, a bad code, an unknown table, a missing record and a missing path", () => {
    const got = rulesOf([
      { locale: "en", entity: "myths", entity_id: real.myth.id, fields: { title: "x" } },
      { locale: "Spanish", entity: "myths", entity_id: real.myth.id, fields: { title: "x" } },
      { locale: "es", entity: "wallet", entity_id: "w", fields: { x: "x" } },
      { locale: "es", entity: "myths", entity_id: "no-such-myth", fields: { title: "x" } },
      { locale: "es", entity: "mythbuster_questions", entity_id: real.mb.id, fields: { "options[99]": "x" } },
    ]);
    assert.deepEqual(got.sort(), ["i18n-entity:entity", "i18n-locale:locale", "i18n-locale:locale", "i18n-path:options[99]", "i18n-record:entity_id"].sort());
  });

  it("structure is never translated: a column that is not words, and an id or answer inside JSON", () => {
    const got = rulesOf([
      { locale: "es", entity: "myths", entity_id: real.myth.id, fields: { category: "x", id: "y" } },
      { locale: "es", entity: "lesson_cards", entity_id: `${real.choice.lesson_id}/${real.choice.id}`, fields: { "data.item": "x", "data.type": "x" } },
    ]);
    assert.deepEqual(got.sort(), ["i18n-field:category", "i18n-field:id", "i18n-path:data.item", "i18n-path:data.type"].sort());
  });

  it("a translation must keep the base text's placeholders", () => {
    const bad = rulesOf([{ locale: "es", entity: "feed_templates", entity_id: real.feed.id, fields: { text: "sin marcadores" } }]);
    assert.deepEqual(bad, ["i18n-placeholders:text"]);
    const good = rulesOf([{ locale: "es", entity: "feed_templates", entity_id: real.feed.id, fields: { text: `Traducido: ${real.feed.text}` } }]);
    assert.deepEqual(good, []);
  });

  it("validate:content reports them, so a bad translation cannot be synced or published", () => {
    withRows([{ locale: "es", entity: "myths", entity_id: "no-such-myth", fields: { title: "x" } }], (db) => {
      const r = validateDatabase(db);
      assert.ok(r.findings.some((f) => f.rule === "i18n-record" && f.severity === "error"));
    });
  });
});

describe("content:sync of a translation file", () => {
  it("builds content_translations from i18n/<locale>.atomiq, is then a no-op, and removing the file removes the rows", async () => {
    const fx = makeFixture();
    try {
      const db = openDb(fx.paths.master, { readOnly: true });
      const mb = db.prepare("SELECT id, options FROM mythbuster_questions LIMIT 1").get();
      const rows0 = {};
      for (const a of ownedAdapters().filter((x) => x.name !== "i18n")) {
        const r = readRowsByTable(db, [...a.tables]);
        Object.assign(rows0, r);
        writeSourceFiles(fx.paths.sourceDir, renderFiles(a, r));
      }
      db.close();
      writeState(fx.paths.sourceDir, rows0);
      const rel = path.join(fx.paths.sourceDir, "i18n", "es.atomiq");
      fs.mkdirSync(path.dirname(rel), { recursive: true });
      fs.writeFileSync(rel, `format 1\nadapter i18n 1\nlocale: es\n\nentry mythbuster_questions ${mb.id}\noptions[0]: Uno\n`);
      const out = [];
      const run = (opts) => runSync({ paths: fx.paths, apply: true, verify: false, log: (m) => out.push(m), err: (m) => out.push(m), ...opts });
      assert.equal(await run({}), 0, out.join("\n"));
      const rows = query(fx.paths, "SELECT locale, entity, entity_id, fields FROM content_translations");
      assert.equal(rows.length, 1);
      assert.deepEqual(JSON.parse(rows[0].fields), { "options[0]": "Uno" });
      out.length = 0;
      assert.equal(await run({}), 0);
      assert.match(out.join("\n"), /Nothing to do/);
      // the files own the table: a row put in behind their back is drift, and the file wins only with --force
      sql(fx.paths, "INSERT INTO content_translations (locale, entity, entity_id, fields) VALUES ('fr', 'myths', 'x', '{}')");
      out.length = 0;
      assert.notEqual(await run({}), 0);
      fs.rmSync(path.join(fx.paths.sourceDir, "i18n"), { recursive: true });
      out.length = 0;
      assert.equal(await run({ force: true }), 0, out.join("\n"));
      assert.equal(query(fx.paths, "SELECT count(*) n FROM content_translations")[0].n, 0);
      assert.ok(readSourceFiles(fx.paths.sourceDir, i18nAdapter.owns).size === 0);
    } finally {
      fx.cleanup();
    }
  });
});
