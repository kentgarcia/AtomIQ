/**
 * Content Studio API tests (spec §4.1, §4.4): access control, validation on
 * save, atomic entity saves, shipped-id protection, history, publish, backups.
 *
 * Run: npm run test:studio
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { after, before, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";

import { createStudio } from "../tools/studio/app.mjs";
import { makeFixture, query } from "./lib/test-fixture.mjs";

process.env.ATOMIQ_SKIP_CHECKS = "1"; // the publish child skips typecheck/icons (tests only)

const fx = makeFixture();
let studio;

before(async () => {
  studio = await createStudio({ root: fx.root, port: 0 });
});
after(async () => {
  await studio.close();
  fx.cleanup();
});

/** Raw http so tests control Host/Origin exactly (fetch restricts some headers). */
function call(method, path, { headers = {}, body, auth = "origin", port } = {}) {
  const p = port ?? studio.port;
  const h = { Host: `127.0.0.1:${p}`, ...headers };
  if (auth === "origin") h.Origin = `http://127.0.0.1:${p}`;
  if (auth === "token") h.Authorization = `Bearer ${studio.token}`;
  let payload;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    h["Content-Type"] = "application/json";
    h["Content-Length"] = Buffer.byteLength(payload);
  }
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: p, method, path, headers: h }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(raw.toString("utf8"));
        } catch {
          /* not json */
        }
        resolve({ status: res.statusCode, headers: res.headers, json, raw });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const firstMyth = () => query(fx.paths, "SELECT id, reality FROM myths LIMIT 1")[0];

describe("access control", () => {
  it("listens on loopback only", () => {
    assert.equal(studio.server.address().address, "127.0.0.1");
  });

  it("never sends CORS headers", async () => {
    const r = await call("GET", "/api/ping", { auth: "none" });
    assert.equal(r.status, 200);
    assert.equal(r.headers["access-control-allow-origin"], undefined);
  });

  it("rejects a foreign Host header (DNS rebinding)", async () => {
    const r = await call("GET", "/api/ping", { auth: "none", headers: { Host: "evil.example" } });
    assert.equal(r.status, 403);
  });

  it("rejects a foreign Origin even for reads, and cross-site fetches", async () => {
    const r = await call("GET", "/api/meta", { auth: "none", headers: { Origin: "http://evil.example" } });
    assert.equal(r.status, 403);
    const r2 = await call("GET", "/api/meta", { auth: "none", headers: { "Sec-Fetch-Site": "cross-site" } });
    assert.equal(r2.status, 403);
  });

  it("refuses a cross-origin write", async () => {
    const m = firstMyth();
    const r = await call("PUT", `/api/rows/myths/${m.id}`, {
      auth: "none",
      headers: { Origin: "http://evil.example" },
      body: { title: "hacked" },
    });
    assert.equal(r.status, 403);
    assert.notEqual(query(fx.paths, "SELECT title FROM myths WHERE id = ?", m.id)[0].title, "hacked");
  });

  it("refuses a write without Origin and without the token", async () => {
    const m = firstMyth();
    const r = await call("PUT", `/api/rows/myths/${m.id}`, { auth: "none", body: { title: "hacked" } });
    assert.equal(r.status, 401);
  });

  it("accepts the page's own writes and token writes, tagging the source", async () => {
    const m = firstMyth();
    const a = await call("PUT", `/api/rows/myths/${m.id}`, { auth: "token", body: { reality: `${m.reality} Evidence supports this.` } });
    assert.equal(a.status, 200, JSON.stringify(a.json));
    const b = await call("PUT", `/api/rows/myths/${m.id}`, { auth: "origin", body: { reality: `${m.reality} Evidence supports this too.` } });
    assert.equal(b.status, 200, JSON.stringify(b.json));
    const h = await call("GET", `/api/entities/myths/${m.id}/history`);
    assert.deepEqual(h.json.revisions.map((r) => r.source), ["studio", "plugin"]);
  });

  it("writes the token file the plugin reads", () => {
    assert.equal(fs.readFileSync(studio.tokenFile, "utf8"), studio.token);
  });

  it("has no preview endpoint unless STUDIO_PREVIEW is on", async () => {
    const r = await call("GET", "/api/preview.db?code=123456");
    assert.equal(r.status, 404);
  });

  it("serves the page", async () => {
    const r = await call("GET", "/", { auth: "none" });
    assert.equal(r.status, 200);
    assert.match(r.raw.toString(), /Content Studio/);
  });

  it("serves every frontend module the page imports", async () => {
    const page = (await call("GET", "/", { auth: "none" })).raw.toString();
    const entry = /src="\.\/(js\/app\.js)"/.exec(page)?.[1];
    assert.ok(entry, "index.html loads js/app.js");
    const seen = new Set();
    const queue = [entry];
    while (queue.length) {
      const file = queue.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      const r = await call("GET", `/${file}`, { auth: "none" });
      assert.equal(r.status, 200, file);
      assert.match(r.headers["content-type"], /javascript/);
      for (const m of r.raw.toString().matchAll(/from "\.\/([a-z-]+\.js)"/g)) queue.push(`js/${m[1]}`);
    }
    assert.equal(seen.size, 6, `loaded ${[...seen].join(", ")}`);
  });
});

describe("validation on save", () => {
  it("rejects an invalid question with field errors and changes nothing", async () => {
    const q = query(fx.paths, "SELECT id, question, explanation FROM mythbuster_questions LIMIT 1")[0];
    const r = await call("PUT", `/api/rows/mythbuster_questions/${q.id}`, { body: { question: "" } });
    assert.equal(r.status, 422);
    assert.ok(r.json.errors.length > 0);
    assert.ok(r.json.errors[0].field && r.json.errors[0].rule);
    assert.equal(query(fx.paths, "SELECT question FROM mythbuster_questions WHERE id = ?", q.id)[0].question, q.question);
  });

  it("maps a database constraint failure to 422, not 500", async () => {
    const q = query(fx.paths, "SELECT id FROM mythbuster_questions LIMIT 1")[0];
    const r = await call("PUT", `/api/rows/mythbuster_questions/${q.id}`, { body: { difficulty: "impossible" } });
    assert.equal(r.status, 422);
  });

  it("saves a lesson with cards atomically through the entity API", async () => {
    const lessonId = query(fx.paths, "SELECT id FROM lessons ORDER BY id LIMIT 1")[0].id;
    const { json } = await call("GET", `/api/entities/lessons/${lessonId}`);
    const { row, children } = json.entity;
    const cards = children.lesson_cards;
    assert.equal(typeof cards[0].data, "object", "card data arrives parsed, not as a JSON string");

    const ordered = () => query(fx.paths, "SELECT id FROM lesson_cards WHERE lesson_id = ? ORDER BY position", lessonId).map((r) => r.id);
    const original = ordered();

    // Swap two neighbouring cards: still a valid lesson, different order.
    const swapped = [...cards];
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    const body = swapped.map(({ position, ...c }) => c);
    const ok = await call("PUT", `/api/entities/lessons/${lessonId}`, { body: { row: { title: row.title }, children: body } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const expected = [...original];
    [expected[1], expected[2]] = [expected[2], expected[1]];
    assert.deepEqual(ordered(), expected);

    // One card pointing at a missing item: nothing changes.
    const bad = body.map((c) => (c.kind === "item" ? { ...c, item_id: "no-such-item" } : c));
    const fail = await call("PUT", `/api/entities/lessons/${lessonId}`, { body: { row: { title: row.title }, children: bad } });
    assert.equal(fail.status, 422);
    assert.deepEqual(ordered(), expected);
  });

  it("blocks a lesson save that breaks the curriculum rules", async () => {
    const lessonId = query(fx.paths, "SELECT id FROM lessons ORDER BY id LIMIT 1")[0].id;
    const { json } = await call("GET", `/api/entities/lessons/${lessonId}`);
    const { row, children } = json.entity;
    // Remove every prediction: the lesson rules require one.
    const items = new Set(query(fx.paths, "SELECT id FROM items WHERE type = 'predict'").map((r) => r.id));
    const stripped = children.lesson_cards.filter((c) => !items.has(c.item_id)).map(({ position, ...c }) => c);
    const r = await call("PUT", `/api/entities/lessons/${lessonId}`, { body: { row: { title: row.title }, children: stripped } });
    assert.equal(r.status, 422);
    assert.ok(r.json.errors.some((e) => e.rule === "lesson-predict" || e.rule === "card-reveal"), JSON.stringify(r.json.errors?.slice(0, 3)));
  });
});

describe("shipped ids", () => {
  it("refuses to delete a shipped id without a reason, then retires it", async () => {
    const id = query(fx.paths, "SELECT id FROM mazes LIMIT 1")[0].id;
    fs.writeFileSync(fx.paths.shippedIds, JSON.stringify({ mazes: [id] }));

    const refused = await call("DELETE", `/api/entities/mazes/${id}`);
    assert.equal(refused.status, 409);
    assert.equal(refused.json.needsReason, true);

    const ok = await call("DELETE", `/api/entities/mazes/${id}?reason=${encodeURIComponent("replaced by a better maze")}`);
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.match(JSON.parse(fs.readFileSync(fx.paths.retiredIds, "utf8")).mazes[id], /replaced by a better maze/);

    const deleted = await call("GET", "/api/deleted");
    const item = deleted.json.items.find((d) => d.pk === id);
    assert.ok(item && item.childCounts.maze_rooms > 0);

    const restored = await call("POST", `/api/history/${item.id}/restore`, { body: { side: "before" } });
    assert.equal(restored.status, 200, JSON.stringify(restored.json));
    assert.equal(query(fx.paths, "SELECT COUNT(*) n FROM mazes WHERE id = ?", id)[0].n, 1);
    assert.equal(query(fx.paths, "SELECT COUNT(*) n FROM maze_rooms WHERE maze_id = ?", id)[0].n, item.childCounts.maze_rooms);
  });

  it("refuses to rename a shipped id", async () => {
    const id = query(fx.paths, "SELECT id FROM myths LIMIT 1")[0].id;
    fs.writeFileSync(fx.paths.shippedIds, JSON.stringify({ myths: [id] }));
    const r = await call("PUT", `/api/rows/myths/${id}`, { body: { id: "renamed-myth" } });
    assert.equal(r.status, 409);
  });
});

describe("reading", () => {
  it("lists tables, status and problems", async () => {
    const meta = await call("GET", "/api/meta");
    assert.ok(meta.json.tables.some((t) => t.name === "lessons"));
    assert.equal(meta.json.entityChildren.lessons.table, "lesson_cards");
    const steps = meta.json.tables.find((t) => t.name === "lesson_cards");
    assert.ok(steps.jsonColumns.includes("data"), "JSON columns are reported for the raw-table editor");
    assert.ok(!steps.jsonColumns.includes("id"));

    const status = await call("GET", "/api/status");
    assert.equal(status.json.published, false);
    assert.match(status.json.version, /\+draft\./);

    const problems = await call("GET", "/api/problems");
    assert.ok(problems.json.checked.lesson_cards > 0);
    assert.ok(problems.json.checked.items > 0);
  });

  it("finds where an item is used", async () => {
    const used = await call("GET", "/api/used-by?table=items&id=u1-l1-sort-matter");
    assert.equal(used.status, 200);
    assert.ok(used.json.usages.some((u) => u.table === "lesson_cards" && u.columns.includes("item_id")), JSON.stringify(used.json));
  });

  it("searches across content types", async () => {
    const r = await call("GET", "/api/search?q=radiation");
    assert.ok(r.json.results.length > 0);
    assert.ok(new Set(r.json.results.map((x) => x.table)).size > 1);
  });

  it("runs read-only SQL only", async () => {
    const ok = await call("POST", "/api/query", { body: { sql: "SELECT COUNT(*) AS n FROM lessons" } });
    assert.equal(ok.status, 200);
    for (const sql of ["DELETE FROM lessons", "PRAGMA journal_mode = DELETE", "SELECT 1; DROP TABLE lessons"]) {
      const r = await call("POST", "/api/query", { body: { sql } });
      assert.ok(r.status >= 400, sql);
    }
    assert.ok(query(fx.paths, "SELECT COUNT(*) n FROM lessons")[0].n > 0);
  });
});

describe("publish, releases and backups", () => {
  it("publishes through the API with streamed progress", async () => {
    const r = await call("POST", "/api/releases/publish", { body: { notes: "Baseline", allowUnreviewed: true } });
    assert.equal(r.status, 200);
    const lines = r.raw.toString().trim().split("\n").map((l) => JSON.parse(l));
    assert.ok(lines.some((l) => l.log), "progress lines are streamed");
    const done = lines.at(-1);
    assert.equal(done.done, true, JSON.stringify(done));
    assert.equal(done.release.version, "1.0.0");
    assert.ok(done.commands.some((c) => c.startsWith("eas update")));

    const status = await call("GET", "/api/status");
    assert.equal(status.json.published, true);
    const rel = await call("GET", "/api/releases");
    assert.equal(rel.json.releases[0].version, "1.0.0");
    assert.equal(rel.json.releases[0].unreviewedAllowed, true);
  });

  it("reports a failed publish as an error line", async () => {
    const r = await call("POST", "/api/releases/publish", { body: { notes: "again", allowUnreviewed: true } });
    const last = JSON.parse(r.raw.toString().trim().split("\n").at(-1));
    assert.equal(last.error, true);
    assert.match(last.message, /Nothing to publish/);
  });

  it("shows unpublished changes against the last release and records the EAS group", async () => {
    const m = firstMyth();
    await call("PUT", `/api/rows/myths/${m.id}`, { body: { reality: `${m.reality} Further evidence supports this.` } });
    const changes = await call("GET", "/api/changes");
    assert.equal(changes.json.total, 1);
    assert.equal(changes.json.lastVersion, "1.0.0");
    assert.deepEqual(changes.json.tables.myths.changed, [m.id]);
    assert.equal(changes.json.suggestion.bump, "patch");

    const detail = await call("GET", `/api/changes/detail?table=myths&pk=${m.id}`);
    assert.ok(detail.json.before.reality !== detail.json.after.reality);

    const rec = await call("POST", "/api/releases/record-update", { body: { groupId: "grp-1" } });
    assert.equal(rec.json.release.update.groupId, "grp-1");
  });

  it("creates, lists and restores backups, reopening the database", async () => {
    const made = await call("POST", "/api/backups", { body: { label: "api test" } });
    assert.equal(made.status, 201);
    const list = await call("GET", "/api/backups");
    const backup = list.json.backups.find((b) => b.name === made.json.backup);
    assert.ok(backup && backup.counts.lessons > 0 && backup.reason === "manual");

    await call("DELETE", `/api/rows/mythbuster_questions/${query(fx.paths, "SELECT id FROM mythbuster_questions LIMIT 1")[0].id}`);
    const summary = await call("GET", `/api/backups/${encodeURIComponent(backup.name)}/summary`);
    assert.equal(summary.json.total, 1);

    const restored = await call("POST", `/api/backups/${encodeURIComponent(backup.name)}/restore`, { body: {} });
    assert.equal(restored.status, 200, JSON.stringify(restored.json));
    assert.match(restored.json.preRestoreBackup, /pre-restore/);
    // The handle was reopened: the restored content is readable and writable.
    const again = await call("GET", "/api/rows/mythbuster_questions?limit=1");
    assert.equal(again.status, 200);
  });

  it("restores a release as a draft", async () => {
    const r = await call("POST", "/api/releases/1.0.0/restore", { body: {} });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const status = await call("GET", "/api/status");
    assert.equal(status.json.published, true, "1.0.0 is the latest release, so the restored copy matches it");
  });
});

describe("developer preview", () => {
  it("is off by default, and on it needs the pairing code", async () => {
    const f2 = makeFixture();
    const s2 = await createStudio({ root: f2.root, port: 0, preview: true });
    try {
      assert.match(s2.previewCode, /^\d{6}$/);
      const wrong = await call("GET", "/api/preview.db?code=000000", { auth: "none", port: s2.port });
      assert.equal(wrong.status, 403);

      const ok = await call("GET", `/api/preview.db?code=${s2.previewCode}`, { auth: "none", port: s2.port });
      assert.equal(ok.status, 200);
      const file = `${f2.root}/downloaded.db`;
      fs.writeFileSync(file, ok.raw);
      const db = new DatabaseSync(file, { readOnly: true });
      const meta = Object.fromEntries(db.prepare("SELECT key, value FROM content_meta").all().map((r) => [r.key, r.value]));
      assert.match(meta.content_version, /^preview-[0-9a-f]{6}$/);
      assert.equal(meta.schema_version, "2");
      assert.ok(db.prepare("SELECT COUNT(*) n FROM lessons").get().n > 0);
      db.close();

      // Every other route still answers loopback only, with a matching Host.
      const other = await call("GET", "/api/meta", { auth: "none", port: s2.port, headers: { Host: "192.168.1.5:" + s2.port } });
      assert.equal(other.status, 403);
    } finally {
      await s2.close();
      f2.cleanup();
    }
  });

  it("locks out after repeated wrong codes", async () => {
    const f2 = makeFixture();
    const s2 = await createStudio({ root: f2.root, port: 0, preview: true });
    try {
      let last;
      for (let i = 0; i < 11; i++) last = await call("GET", "/api/preview.db?code=000000", { auth: "none", port: s2.port });
      assert.equal(last.status, 429);
      const real = await call("GET", `/api/preview.db?code=${s2.previewCode}`, { auth: "none", port: s2.port });
      assert.equal(real.status, 429, "even the right code waits out the lockout");
    } finally {
      await s2.close();
      f2.cleanup();
    }
  });
});

describe("editor support endpoints", () => {
  it("lists installed icons and flags unknown ones as problems", async () => {
    const icons = await call("GET", "/api/icons");
    assert.ok(icons.json.names.includes("InfoCircle"));
    assert.equal(icons.json.aliases.Atom, "CpuSetting");

    const card = query(fx.paths, "SELECT lesson_id, id, data FROM lesson_cards WHERE type = 'scale-zoom' LIMIT 1")[0];
    const data = JSON.parse(card.data);
    data.stops[0].icon = "NotARealIcon";
    const r = await call("PUT", `/api/rows/lesson_cards/${card.lesson_id}~${card.id}`, { body: { data } });
    assert.equal(r.status, 422, "an unknown icon blocks the save");
    assert.ok(r.json.errors.some((e) => e.rule === "invalid-icon"));
  });

  it("offers enums and distinct values for suggestions", async () => {
    const meta = await call("GET", "/api/meta");
    assert.ok(meta.json.enums.sourceTypes.includes("government-agency"));
    assert.ok(meta.json.enums.reviewStatuses.includes("reviewed"));
    const d = await call("GET", "/api/distinct?table=myths&column=category");
    assert.ok(d.json.values.length > 1);
    assert.equal((await call("GET", "/api/distinct?table=myths&column=nope")).status, 400);
  });

  it("reorders a standalone pool in one transaction", async () => {
    const ids = () => query(fx.paths, "SELECT id FROM mythbuster_questions WHERE difficulty = 'easy' ORDER BY position").map((r) => r.id);
    const original = ids();
    const reversed = [...original].reverse();
    const r = await call("POST", "/api/pools/reorder", {
      body: { table: "mythbuster_questions", scopeColumn: "difficulty", scopeValue: "easy", ids: reversed },
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(ids(), reversed);
    assert.deepEqual(query(fx.paths, "SELECT position FROM mythbuster_questions WHERE difficulty = 'easy' ORDER BY position").map((x) => x.position), reversed.map((_, i) => i));

    const bad = await call("POST", "/api/pools/reorder", { body: { table: "lesson_cards", scopeColumn: "lesson_id", scopeValue: "x", ids: ["a"] } });
    assert.equal(bad.status, 400);
  });
});
