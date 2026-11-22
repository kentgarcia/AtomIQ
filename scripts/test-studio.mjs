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
    assert.equal(seen.size, 7, `loaded ${[...seen].join(", ")}`);
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
    // A lesson with a reveal card that answers a prediction (not every lesson has one).
    const lessonId = query(fx.paths, "SELECT lesson_id AS id FROM lesson_cards WHERE type = 'reveal' ORDER BY lesson_id LIMIT 1")[0].id;
    const { json } = await call("GET", `/api/entities/lessons/${lessonId}`);
    const { row, children } = json.entity;
    // Remove every prediction: a reveal card that points at it then breaks the lesson rules.
    const items = new Set(query(fx.paths, "SELECT id FROM items WHERE type = 'predict'").map((r) => r.id));
    const stripped = children.lesson_cards.filter((c) => !items.has(c.item_id)).map(({ position, ...c }) => c);
    const r = await call("PUT", `/api/entities/lessons/${lessonId}`, { body: { row: { title: row.title }, children: stripped } });
    assert.equal(r.status, 422);
    assert.ok(r.json.errors.some((e) => e.rule === "lesson-predict" || e.rule === "card-reveal"), JSON.stringify(r.json.errors?.slice(0, 3)));
  });
});

describe("feed templates and blog pieces (docs/features/NPC_FEED_SPEC.md §6)", () => {
  const BLOG = "blog-the-smallest-thing";
  const entity = async (table, id) => (await call("GET", `/api/entities/${table}/${id}`)).json.entity;
  const count = (sql, ...params) => query(fx.paths, sql, ...params)[0].n;
  /** A save body from the stored entity: comments and links as the editor sends them. */
  const bodyFor = async (changes = {}) => {
    const { row, children } = await entity("blog_posts", BLOG);
    const comments = children.blog_comments.map(({ position, blog_id, ...c }) => c);
    const links = children.blog_references.map((r) => ({ reference_id: r.reference_id }));
    return { row: { title: row.title, ...changes.row }, children: changes.children ?? comments, links: changes.links ?? links };
  };
  const ruleOf = (r) => (r.json?.errors ?? []).map((e) => e.rule);
  const template = (over = {}) => ({
    id: "ft-test-new",
    npc_id: "npc-ada",
    poster_pool: [],
    kind: "celebrate",
    trigger: "lesson_complete",
    condition: { unitId: "inside-the-atom", lessonId: "isotopes" },
    text: "You finished “{lesson}”. Well done.",
    chip: "lesson",
    reactors: ["npc-hal"],
    weight: 1,
    ...over,
  });

  it("serves the vocabulary and the entity wiring to the panels", async () => {
    const meta = (await call("GET", "/api/meta")).json;
    assert.equal(meta.entityChildren.blog_posts.table, "blog_comments");
    assert.equal(meta.entityLinks.blog_posts.table, "blog_references");
    assert.ok(meta.tables.find((t) => t.name === "feed_templates").jsonColumns.includes("condition"));
    assert.ok(meta.tables.find((t) => t.name === "blog_comments").jsonColumns.includes("chip"));
    assert.deepEqual(meta.feedVocab.TEMPLATE_TRIGGER_KEYS.includes("blog_unlocked"), false);
    assert.ok(meta.feedVocab.artIds.includes("atom"));
    assert.deepEqual(meta.feedVocab.FEED_TRIGGERS.streak.placeholders, ["days", "name"]);
    // NPC pickers show names, not job titles
    const refs = (await call("GET", "/api/refs?table=npcs")).json.items;
    assert.equal(refs.find((r) => r.id === "npc-ada").label, "Ada");
  });

  it("has the seeded templates and pieces, and the problems list counts them", async () => {
    assert.ok(count("SELECT COUNT(*) n FROM feed_templates") >= 40);
    assert.equal(count("SELECT COUNT(*) n FROM blog_posts"), 4);
    const problems = (await call("GET", "/api/problems")).json;
    assert.ok(problems.checked.feed_templates >= 40 && problems.checked.blog_posts === 4 && problems.checked.blog_comments === 4);
    assert.equal(problems.errors.filter((e) => /^(feed|blog)/.test(e.rule)).length, 0);
  });

  it("creates, edits and deletes a feed template", async () => {
    const made = await call("POST", "/api/entities/feed_templates", { body: { row: template() } });
    assert.equal(made.status, 201, JSON.stringify(made.json));
    assert.deepEqual(made.json.entity.row.condition, { unitId: "inside-the-atom", lessonId: "isotopes" }, "JSON columns come back parsed");
    assert.deepEqual(made.json.entity.row.reactors, ["npc-hal"]);

    const edited = await call("PUT", "/api/entities/feed_templates/ft-test-new", { body: { row: { text: "“{lesson}” is done. Nice work." } } });
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    assert.equal(query(fx.paths, "SELECT text FROM feed_templates WHERE id = 'ft-test-new'")[0].text, "“{lesson}” is done. Nice work.");

    const del = await call("DELETE", "/api/entities/feed_templates/ft-test-new");
    assert.equal(del.status, 200);
    assert.equal(count("SELECT COUNT(*) n FROM feed_templates WHERE id = 'ft-test-new'"), 0);
  });

  it("rejects an invalid feed template with the rule and changes nothing", async () => {
    const bad = {
      "feed-placeholder": template({ id: "ft-bad-1", text: "{rival} passed you." }),
      "feed-text": template({ id: "ft-bad-2", text: "x".repeat(221) }),
      "feed-condition": template({ id: "ft-bad-3", condition: { unitId: "nope" } }),
      "feed-trigger": template({ id: "ft-bad-4", trigger: "daily_login" }),
      "feed-chip": template({ id: "ft-bad-5", chip: "ranks" }),
      "feed-reactors": template({ id: "ft-bad-6", reactors: ["npc-ada"] }),
      "feed-poster": template({ id: "ft-bad-7", npc_id: null, poster_pool: [] }),
    };
    for (const [rule, row] of Object.entries(bad)) {
      const r = await call("POST", "/api/entities/feed_templates", { body: { row } });
      assert.equal(r.status, 422, `${rule}: ${JSON.stringify(r.json)}`);
      assert.ok(ruleOf(r).includes(rule), `${rule} expected, got ${ruleOf(r)}`);
      assert.equal(count("SELECT COUNT(*) n FROM feed_templates WHERE id = ?", row.id), 0);
    }
    // the raw row route validates too
    const first = query(fx.paths, "SELECT id, text FROM feed_templates LIMIT 1")[0];
    const long = await call("PUT", `/api/rows/feed_templates/${first.id}`, { body: { text: "x".repeat(300) } });
    assert.equal(long.status, 422);
    assert.equal(query(fx.paths, "SELECT text FROM feed_templates WHERE id = ?", first.id)[0].text, first.text);
    // a CHECK failure is a 422, not a 500
    assert.equal((await call("PUT", `/api/rows/feed_templates/${first.id}`, { body: { kind: "gossip" } })).status, 422);
  });

  it("reads a blog piece with its comments and sources", async () => {
    const { row, children } = await entity("blog_posts", BLOG);
    assert.ok(Array.isArray(row.blocks) && row.blocks.at(-1).t === "next", "blocks arrive parsed");
    assert.deepEqual(row.unlock, { trigger: "none" });
    assert.equal(children.blog_comments.length, 2);
    assert.deepEqual(children.blog_comments.map((c) => c.position), [0, 1]);
    assert.equal(typeof children.blog_comments[0].chip, "object", "comment chips arrive parsed");
    assert.deepEqual(children.blog_references.map((r) => r.reference_id), ["ref-openstax-chem-2-1", "ref-openstax-chem-ch1", "ref-openstax-chem-ch2"]);
  });

  it("saves a piece with its comments and sources atomically, and keeps sources when none are sent", async () => {
    const base = await bodyFor();
    const added = [...base.children, { id: "bc-test-tess", npc_id: "npc-tess", text: "A third, short comment.", chip: { lessonId: "isotopes" } }];
    const ok = await call("PUT", `/api/entities/blog_posts/${BLOG}`, { body: { ...base, children: added, links: [{ reference_id: "ref-openstax-chem-ch1" }] } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.deepEqual(query(fx.paths, "SELECT id FROM blog_comments WHERE blog_id = ? ORDER BY position", BLOG).map((r) => r.id), ["bc-the-smallest-thing-ray", "bc-the-smallest-thing-ada", "bc-test-tess"]);
    assert.deepEqual(query(fx.paths, "SELECT reference_id FROM blog_references WHERE blog_id = ?", BLOG).map((r) => r.reference_id), ["ref-openstax-chem-ch1"]);

    // no `links` in the body: the sources stay
    const { links: _skip, ...noLinks } = await bodyFor();
    const keep = await call("PUT", `/api/entities/blog_posts/${BLOG}`, { body: noLinks });
    assert.equal(keep.status, 200, JSON.stringify(keep.json));
    assert.equal(count("SELECT COUNT(*) n FROM blog_references WHERE blog_id = ?", BLOG), 1);

    // history keeps the links and comments, so a save can be undone
    const h = (await call("GET", `/api/entities/blog_posts/${BLOG}/history`)).json.revisions;
    const rev = (await call("GET", `/api/history/${h[0].id}`)).json.revision;
    assert.ok(rev.before.children.blog_references.length >= 1 && rev.after.children.blog_comments.length >= 2);
  });

  it("rejects invalid comments with the rule and changes nothing", async () => {
    const base = await bodyFor();
    const comments = (extra) => [...base.children, { id: "bc-test-bad", text: "A comment.", ...extra }];
    const cases = {
      "blog-comment-author": comments({ npc_id: "npc-hal" }),
      "blog-comment-dup": comments({ npc_id: "npc-ray" }),
      "blog-comment-length": comments({ npc_id: "npc-mina", text: "c".repeat(201) }),
      "blog-comment-chip": comments({ npc_id: "npc-mina", chip: { lessonId: "no-such-lesson" } }),
      "blog-comment-count": [...comments({ npc_id: "npc-mina" }), { id: "bc-t2", npc_id: "npc-kofi", text: "Four." }, { id: "bc-t3", npc_id: "npc-tess", text: "Five." }],
    };
    for (const [rule, children] of Object.entries(cases)) {
      const r = await call("PUT", `/api/entities/blog_posts/${BLOG}`, { body: { ...base, children } });
      assert.equal(r.status, 422, `${rule}: ${JSON.stringify(r.json)}`);
      assert.ok(ruleOf(r).includes(rule), `${rule} expected, got ${ruleOf(r)}`);
    }
    assert.equal(count("SELECT COUNT(*) n FROM blog_comments WHERE blog_id = ?", BLOG), 3, "the failed saves rolled back");
    // a single comment row through the raw route is validated against its piece
    const raw = await call("PUT", "/api/rows/blog_comments/bc-the-smallest-thing-ray", { body: { npc_id: "npc-hal" } });
    assert.equal(raw.status, 422);
    assert.ok(ruleOf(raw).includes("blog-comment-author"));
  });

  it("rejects an invalid blog piece with the rule and changes nothing", async () => {
    const { row } = await entity("blog_posts", BLOG);
    const body = (changes) => bodyFor({ row: changes });
    const noNext = row.blocks.slice(0, -1);
    const cases = {
      "blog-next": { blocks: noNext },
      "blog-hook": { hook: "h".repeat(121) },
      "blog-cover": { cover: "unicorn" },
      "blog-words": { blocks: [{ t: "p", text: "Too short." }, row.blocks.at(-1)], read_min: 1 },
      "blog-read-min": { read_min: 9 },
      "blog-unlock": { unlock: { trigger: "lesson_complete", lessonId: "no-such-lesson" } },
      "blog-blocks": { blocks: [{ t: "video", text: "x" }, ...row.blocks] },
      "blog-meta": { title: "" },
      constraint: { npc_id: "npc-nobody" },
    };
    for (const [rule, changes] of Object.entries(cases)) {
      const r = await call("PUT", `/api/entities/blog_posts/${BLOG}`, { body: await body(changes) });
      assert.ok([409, 422].includes(r.status), `${rule}: ${r.status} ${JSON.stringify(r.json)}`);
      if (r.status === 422) assert.ok(ruleOf(r).includes(rule), `${rule} expected, got ${ruleOf(r)}`);
    }
    assert.equal(query(fx.paths, "SELECT hook FROM blog_posts WHERE id = ?", BLOG)[0].hook, row.hook);
  });

  it("creates a piece, then deleting it removes its comments and sources and a restore brings them back", async () => {
    const source = await entity("blog_posts", "blog-the-banana-on-your-counter");
    const row = { ...source.row, id: "blog-test-piece", title: "A test piece" };
    delete row.created_at;
    delete row.updated_at;
    const made = await call("POST", "/api/entities/blog_posts", {
      body: { row, children: [{ id: "bc-test-piece-ray", npc_id: "npc-ray", text: "A comment on the test piece." }], links: [{ reference_id: "ref-hps-natural-radioactivity" }, { reference_id: "ref-hps-natural-radioactivity" }] },
    });
    assert.equal(made.status, 201, JSON.stringify(made.json));
    assert.equal(count("SELECT COUNT(*) n FROM blog_references WHERE blog_id = 'blog-test-piece'"), 1, "a source linked twice is stored once");

    assert.equal((await call("DELETE", "/api/entities/blog_posts/blog-test-piece")).status, 200);
    assert.equal(count("SELECT COUNT(*) n FROM blog_comments WHERE blog_id = 'blog-test-piece'"), 0);
    assert.equal(count("SELECT COUNT(*) n FROM blog_references WHERE blog_id = 'blog-test-piece'"), 0);

    const item = (await call("GET", "/api/deleted")).json.items.find((d) => d.pk === "blog-test-piece");
    assert.deepEqual(item.childCounts, { blog_comments: 1, blog_references: 1 });
    const back = await call("POST", `/api/history/${item.id}/restore`, { body: { side: "before" } });
    assert.equal(back.status, 200, JSON.stringify(back.json));
    assert.equal(count("SELECT COUNT(*) n FROM blog_comments WHERE blog_id = 'blog-test-piece'"), 1);
    assert.equal(count("SELECT COUNT(*) n FROM blog_references WHERE blog_id = 'blog-test-piece'"), 1);
    assert.equal((await call("DELETE", "/api/entities/blog_posts/blog-test-piece")).status, 200);
  });

  it("refuses links on a table that has none", async () => {
    const r = await call("POST", "/api/entities/feed_templates", { body: { row: template({ id: "ft-links" }), links: [{ reference_id: "x" }] } });
    assert.equal(r.status, 400);
  });

  it("protects shipped feed ids like the other content", async () => {
    fs.writeFileSync(fx.paths.shippedIds, JSON.stringify({ feed_templates: ["ft-hal-checkpoint-inside-the-atom"], blog_posts: ["blog-three-kinds-of-carbon"] }));
    const t = await call("DELETE", "/api/entities/feed_templates/ft-hal-checkpoint-inside-the-atom");
    assert.equal(t.status, 409);
    assert.equal(t.json.needsReason, true);
    const rename = await call("PUT", "/api/entities/blog_posts/blog-three-kinds-of-carbon", { body: { row: { id: "blog-renamed" } } });
    assert.equal(rename.status, 409);
    const del = await call("DELETE", "/api/entities/blog_posts/blog-three-kinds-of-carbon");
    assert.equal(del.status, 409);
    fs.writeFileSync(fx.paths.shippedIds, "{}");
  });
});

describe("shipped ids", () => {
  it("refuses to delete a shipped id without a reason, then retires it", async () => {
    const id = query(fx.paths, "SELECT b.id FROM blog_posts b WHERE EXISTS (SELECT 1 FROM blog_comments c WHERE c.blog_id = b.id) ORDER BY b.id LIMIT 1")[0].id;
    fs.writeFileSync(fx.paths.shippedIds, JSON.stringify({ blog_posts: [id] }));

    const refused = await call("DELETE", `/api/entities/blog_posts/${id}`);
    assert.equal(refused.status, 409);
    assert.equal(refused.json.needsReason, true);

    const ok = await call("DELETE", `/api/entities/blog_posts/${id}?reason=${encodeURIComponent("replaced by a better piece")}`);
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.match(JSON.parse(fs.readFileSync(fx.paths.retiredIds, "utf8")).blog_posts[id], /replaced by a better piece/);

    const deleted = await call("GET", "/api/deleted");
    const item = deleted.json.items.find((d) => d.pk === id);
    assert.ok(item && item.childCounts.blog_comments > 0);

    const restored = await call("POST", `/api/history/${item.id}/restore`, { body: { side: "before" } });
    assert.equal(restored.status, 200, JSON.stringify(restored.json));
    assert.equal(query(fx.paths, "SELECT COUNT(*) n FROM blog_posts WHERE id = ?", id)[0].n, 1);
    assert.equal(query(fx.paths, "SELECT COUNT(*) n FROM blog_comments WHERE blog_id = ?", id)[0].n, item.childCounts.blog_comments);
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

  it("offers distinct values for suggestions", async () => {
    const meta = await call("GET", "/api/meta");
    assert.ok(meta.json.tables.some((t) => t.name === "myths"));
    assert.ok(!meta.json.tables.some((t) => t.name === "articles" || t.name === "posts"));
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
