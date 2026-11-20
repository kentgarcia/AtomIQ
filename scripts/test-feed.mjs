// NPC feed tests (docs/NPC_FEED_SPEC.md §14).  Run: npm run test:feed
//
// The rules live in framework-free cores: services/feed-core.ts, social-core.ts, blog-core.ts,
// rank-core.ts (and the seeded RNG in rng-core.ts). The store's SQL is run on an in-memory SQLite.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(path.join(REPO, rel)).href);

const rngCore = await load("services/rng-core.ts");
const feed = await load("services/feed-core.ts");
const social = await load("services/social-core.ts");
const blog = await load("services/blog-core.ts");
const rank = await load("services/rank-core.ts");
const storeCore = await load("services/feed-store-core.ts");
const { LOCAL_FIRST_SCHEMA } = await load("services/local-first/schema.ts");

const { mulberry32, rngFromSeed } = rngCore;
const CAST = ["npc-ada", "npc-hal", "npc-ray", "npc-mina", "npc-kofi", "npc-tess", "npc-sage"].map((id) => ({ id }));
const MIN = 60_000;
const OFFSET = 0; // UTC, so day keys are easy to read
// 2026-11-18 is a Wednesday
const NOON = Date.parse("2026-11-18T12:00:00Z");

const tpl = (over = {}) => ({
  id: "ft-1", npcId: "npc-ada", posterPool: [], kind: "celebrate", trigger: "lesson_complete", condition: {},
  text: "You finished {lesson}.", chip: "lesson", reactors: [], weight: 1, ...over,
});
const lessonEvent = (lessonId = "what-is-an-atom", over = {}) => ({ type: "lesson_complete", unitId: "inside-the-atom", lessonId, perfect: false, ...over });
const history = (over = {}) => ({ dayKey: "2026-11-18", dedupeKeys: new Set(), recentTemplateIds: [], ...over });

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

test("vocabulary matches the spec", () => {
  assert.deepEqual([...feed.FEED_TRIGGERS].sort(), [
    "blog_unlocked", "checkpoint_pass", "chest_opened", "comeback", "daily_quests_done", "first_lesson",
    "lesson_complete", "rank_change", "streak", "testout_pass", "unit_complete",
  ]);
  assert.ok(!feed.TEMPLATE_TRIGGERS.includes("blog_unlocked"));
  assert.deepEqual([...feed.FEED_KINDS], ["celebrate", "milestone", "nudge", "tease"]);
  assert.deepEqual([...feed.FEED_CHIPS], ["lesson", "unit", "quests", "ranks"]);
  assert.deepEqual([...feed.FEED_PLACEHOLDERS].sort(), ["days", "lesson", "name", "rival", "unit"]);
  assert.deepEqual([...feed.STREAK_THRESHOLDS], [3, 7, 14, 30, 60, 100]);
  assert.deepEqual([...social.REACTIONS], ["like", "love", "clap", "wow"]);
  for (const t of feed.FEED_TRIGGERS) assert.ok(feed.PLACEHOLDERS_BY_TRIGGER[t], t);
});

test("dedupe keys follow spec section 5.1", () => {
  const d = "2026-11-18";
  assert.equal(feed.eventDedupeKey(lessonEvent("l1"), d), "lesson:l1");
  assert.equal(feed.eventDedupeKey({ type: "checkpoint_pass", unitId: "u" }, d), "checkpoint:u");
  assert.equal(feed.eventDedupeKey({ type: "unit_complete", unitId: "u" }, d), "unit:u");
  assert.equal(feed.eventDedupeKey({ type: "testout_pass", unitId: "u" }, d), "testout:u");
  assert.equal(feed.eventDedupeKey({ type: "streak", days: 7 }, d), "streak:7");
  assert.equal(feed.eventDedupeKey({ type: "chest_opened", period: "weekly" }, d), `chest:weekly:${d}`);
  assert.equal(feed.eventDedupeKey({ type: "first_lesson" }, d), "first-lesson");
  assert.equal(feed.eventDedupeKey({ type: "comeback", days: 5 }, d), `comeback:${d}`);
  assert.equal(feed.eventDedupeKey({ type: "daily_quests_done" }, d), `quests:${d}`);
  assert.equal(feed.eventDedupeKey({ type: "rank_change", direction: "passed", npcId: "npc-hal" }, d), `rank:npc-hal:passed:${d}`);
  // every noticed change is its own post, even for the same rival on the same day
  assert.notEqual(
    feed.eventDedupeKey({ type: "rank_change", direction: "passed", npcId: "npc-hal", at: 1 }, d),
    feed.eventDedupeKey({ type: "rank_change", direction: "passed", npcId: "npc-hal", at: 2 }, d),
  );
});

test("the app's vocabulary mirrors scripts/lib/feed-vocab.mjs exactly", async () => {
  const vocab = await load("scripts/lib/feed-vocab.mjs");
  assert.deepEqual([...feed.FEED_TRIGGERS].sort(), [...vocab.FEED_TRIGGER_KEYS].sort());
  assert.deepEqual([...feed.TEMPLATE_TRIGGERS].sort(), [...vocab.TEMPLATE_TRIGGER_KEYS].sort());
  assert.deepEqual([...feed.FEED_KINDS], vocab.FEED_KINDS);
  assert.deepEqual([...feed.FEED_CHIPS], vocab.FEED_CHIPS);
  assert.deepEqual([...feed.FEED_PLACEHOLDERS], vocab.FEED_PLACEHOLDERS);
  assert.deepEqual([...feed.STREAK_THRESHOLDS], vocab.STREAK_DAYS);
  assert.equal(feed.COMEBACK_MIN_DAYS, vocab.COMEBACK_MIN_DAYS);
  for (const [trigger, spec] of Object.entries(vocab.FEED_TRIGGERS)) {
    assert.deepEqual([...feed.PLACEHOLDERS_BY_TRIGGER[trigger]], spec.placeholders, `${trigger} placeholders`);
  }
  assert.equal(blog.READING_WPM, vocab.BLOG_LIMITS.wordsPerMinute);
  // same word count and reading time as the validator, on a sample
  const blocks = [{ t: "p", text: "one two three" }, { t: "h", text: "skip me" }, { t: "list", items: ["a b", "c"] }, { t: "fact", text: "x y" }, { t: "quote", text: "q" }, { t: "figure", ref: "a", caption: "no no" }, { t: "next", label: "go go", lessonId: "l" }];
  assert.equal(blog.wordCount(blocks), vocab.blogWordCount(blocks));
  for (const n of [0, 1, 199, 200, 201, 350, 1000]) assert.equal(blog.readingMinutes([{ t: "p", text: Array(n).fill("w").join(" ") }]), vocab.readingMinutes(n));
  // direction values the ranking produces are the ones templates are written against
  assert.deepEqual(["passed", "passed_by"], vocab.RANK_DIRECTIONS);
});

test("every template in the master DB renders and can be picked for an event of its trigger", async (t) => {
  const dbPath = path.join(REPO, "content/database/content.db");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name = 'feed_templates'").get()) return t.skip("the master DB has no feed tables yet");
  const rows = db.prepare('SELECT id, npc_id, poster_pool, kind, "trigger" AS "trigger", condition, text, chip, reactors, weight FROM feed_templates').all();
  const templates = rows.map((r) => ({ id: r.id, npcId: r.npc_id, posterPool: JSON.parse(r.poster_pool), kind: r.kind, trigger: r.trigger, condition: JSON.parse(r.condition), text: r.text, chip: r.chip, reactors: JSON.parse(r.reactors), weight: r.weight }));
  const values = { lesson: "L", unit: "U", days: 7, rival: "R", name: "N" };
  for (const tp of templates) {
    assert.ok(feed.renderText(tp, values).length > 0, tp.id);
    assert.ok(feed.placeholdersIn(tp.text).every((p) => feed.PLACEHOLDERS_BY_TRIGGER[tp.trigger].includes(p)), `${tp.id} uses a placeholder its trigger cannot supply`);
  }
  // an event built from each template's own condition finds that template (or an equally matching one)
  for (const tp of templates) {
    const c = tp.condition;
    const event = {
      lesson_complete: { type: "lesson_complete", unitId: c.unitId ?? "u", lessonId: c.lessonId ?? "l", perfect: c.perfect ?? false },
      checkpoint_pass: { type: "checkpoint_pass", unitId: c.unitId ?? "u" },
      unit_complete: { type: "unit_complete", unitId: c.unitId ?? "u" },
      testout_pass: { type: "testout_pass", unitId: c.unitId ?? "u" },
      streak: { type: "streak", days: c.days ?? 7 },
      chest_opened: { type: "chest_opened", period: c.period ?? "daily" },
      first_lesson: { type: "first_lesson", unitId: "u", lessonId: "l" },
      comeback: { type: "comeback", days: Math.max(3, c.minDays ?? 3) },
      daily_quests_done: { type: "daily_quests_done" },
      rank_change: { type: "rank_change", direction: c.direction ?? "passed", npcId: c.npcId ?? "npc-sage" },
    }[tp.trigger];
    const picked = feed.pickTemplate(event, templates, history(), mulberry32(7));
    assert.ok(picked, `${tp.id}: an event of its own trigger and condition finds a template`);
    assert.equal(picked.template.trigger, tp.trigger);
  }
});

/* ------------------------------------------------------------------ */
/* RNG                                                                 */
/* ------------------------------------------------------------------ */

test("the seeded RNG repeats, stays in [0,1) and differs by seed", () => {
  const a = Array.from({ length: 20 }, mulberry32(42));
  const b = Array.from({ length: 20 }, mulberry32(42));
  assert.deepEqual(a, b);
  assert.ok(a.every((n) => n >= 0 && n < 1));
  assert.notDeepEqual(a, Array.from({ length: 20 }, mulberry32(43)));
  assert.equal(rngFromSeed("x")(), rngFromSeed("x")());
  const { pickWeighted, shuffled, randInt } = rngCore;
  assert.equal(pickWeighted(mulberry32(1), [], () => 1), null);
  assert.equal(pickWeighted(mulberry32(1), ["a", "b"], () => 0), null);
  assert.equal(pickWeighted(mulberry32(1), ["a", "b"], (x) => (x === "b" ? 1 : 0)), "b");
  const items = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(shuffled(mulberry32(9), items), shuffled(mulberry32(9), items));
  assert.deepEqual([...shuffled(mulberry32(9), items)].sort(), items);
  for (let i = 0; i < 200; i++) { const n = randInt(mulberry32(i), 0, 4); assert.ok(n >= 0 && n <= 4); }
});

/* ------------------------------------------------------------------ */
/* pickTemplate                                                        */
/* ------------------------------------------------------------------ */

test("pickTemplate is deterministic with a seeded RNG and returns the same NPC", () => {
  const templates = Array.from({ length: 6 }, (_, i) => tpl({ id: `ft-${i}`, weight: i + 1, npcId: null, posterPool: ["npc-ada", "npc-hal"] }));
  const run = (seed) => feed.pickTemplate(lessonEvent(), templates, history(), mulberry32(seed));
  for (let seed = 0; seed < 25; seed++) assert.deepEqual(run(seed), run(seed));
  const seen = new Set(Array.from({ length: 60 }, (_, s) => run(s).template.id));
  assert.ok(seen.size > 1, "different seeds reach different templates");
  assert.ok(Array.from({ length: 30 }, (_, s) => run(s).posterId).every((id) => id === "npc-ada" || id === "npc-hal"));
});

test("pickTemplate: trigger, condition, weight, poster and placeholders filter candidates", () => {
  const rng = () => mulberry32(5);
  const only = (templates, event = lessonEvent()) => feed.pickTemplate(event, templates, history(), rng())?.template.id ?? null;
  assert.equal(only([tpl({ trigger: "streak", text: "{days} days" })]), null, "other trigger");
  assert.equal(only([tpl({ weight: 0 })]), null, "weight 0 never wins");
  assert.equal(only([tpl({ npcId: null, posterPool: [] })]), null, "no poster");
  assert.equal(only([tpl({ text: "Done, {days}." })]), null, "placeholder the trigger cannot supply");
  assert.equal(only([tpl({ condition: { unitId: "other-unit" } })]), null, "condition mismatch");
  assert.equal(only([tpl({ condition: { unitId: "inside-the-atom" } })]), "ft-1");
  assert.equal(only([tpl({ condition: { perfect: true } })]), null);
  assert.equal(only([tpl({ condition: { perfect: true } })], lessonEvent("x", { perfect: true })), "ft-1");
  assert.equal(only([tpl({ condition: { unitId: ["a", "inside-the-atom"] } })]), "ft-1", "array condition");
  // minDays is "at least"
  const comeback = tpl({ trigger: "comeback", text: "Welcome back, {name}.", condition: { minDays: 3 }, chip: null });
  assert.equal(only([comeback], { type: "comeback", days: 2 }), null);
  assert.equal(only([comeback], { type: "comeback", days: 3 }), "ft-1");
  assert.equal(only([tpl({ trigger: "streak", text: "{days}", condition: { days: 7 } })], { type: "streak", days: 7 }), "ft-1");
  assert.equal(only([tpl({ trigger: "streak", text: "{days}", condition: { days: 7 } })], { type: "streak", days: 14 }), null);
});

test("pickTemplate prefers templates not used lately, but still picks when all were", () => {
  const templates = [tpl({ id: "a" }), tpl({ id: "b" })];
  for (let s = 0; s < 20; s++) {
    assert.equal(feed.pickTemplate(lessonEvent(), templates, history({ recentTemplateIds: ["a"] }), mulberry32(s)).template.id, "b");
  }
  assert.ok(feed.pickTemplate(lessonEvent(), templates, history({ recentTemplateIds: ["a", "b"] }), mulberry32(1)));
});

test("a rival never posts about themself", () => {
  const t = tpl({ id: "r", trigger: "rank_change", text: "{rival} moved ahead of you.", chip: "ranks", npcId: null, posterPool: ["npc-ada", "npc-hal", "npc-ray"] });
  const event = { type: "rank_change", direction: "passed_by", npcId: "npc-hal" };
  for (let s = 0; s < 40; s++) assert.notEqual(feed.pickTemplate(event, [t], history(), mulberry32(s)).posterId, "npc-hal");
  const fixed = tpl({ id: "f", trigger: "rank_change", text: "{rival} moved ahead.", npcId: "npc-hal" });
  assert.equal(feed.pickTemplate(event, [fixed], history(), mulberry32(1)), null);
});

test("a dedupe key never posts twice", () => {
  const templates = [tpl()];
  assert.ok(feed.pickTemplate(lessonEvent("l1"), templates, history(), mulberry32(1)));
  for (const keys of [new Set(["lesson:l1"]), ["lesson:l1"]]) {
    assert.equal(feed.pickTemplate(lessonEvent("l1"), templates, history({ dedupeKeys: keys }), mulberry32(1)), null);
  }
  assert.ok(feed.pickTemplate(lessonEvent("l2"), templates, history({ dedupeKeys: ["lesson:l1"] }), mulberry32(1)));
  // day-scoped keys: the same chest on another day is a new post
  const chest = tpl({ id: "c", trigger: "chest_opened", text: "Chest.", chip: "quests" });
  const ev = { type: "chest_opened", period: "daily" };
  assert.equal(feed.pickTemplate(ev, [chest], history({ dedupeKeys: ["chest:daily:2026-11-18"] }), mulberry32(1)), null);
  assert.ok(feed.pickTemplate(ev, [chest], history({ dayKey: "2026-11-19", dedupeKeys: ["chest:daily:2026-11-18"] }), mulberry32(1)));
});

/* ------------------------------------------------------------------ */
/* renderText                                                          */
/* ------------------------------------------------------------------ */

test("renderText fills known placeholders and refuses unknown or empty ones", () => {
  assert.equal(feed.renderText("You finished {lesson} in {unit}, {name}.", { lesson: "Atoms", unit: "Inside", name: "Sam" }), "You finished Atoms in Inside, Sam.");
  assert.equal(feed.renderText({ text: "{days} days, {days}!" }, { days: 7 }), "7 days, 7!");
  assert.equal(feed.renderText("No placeholders.", {}), "No placeholders.");
  assert.throws(() => feed.renderText("Hello {nope}.", { name: "x" }), /Unknown placeholder \{nope\}/);
  assert.throws(() => feed.renderText("Hello {}.", {}), /Unknown placeholder/);
  assert.throws(() => feed.renderText("Hello {name}.", {}), /No value for placeholder \{name\}/);
  assert.throws(() => feed.renderText("Hello {name}.", { name: "" }), /No value/);
  assert.deepEqual(feed.placeholdersIn("{a} and {b} and {a}"), ["a", "b", "a"]);
});

/* ------------------------------------------------------------------ */
/* No limits                                                           */
/* ------------------------------------------------------------------ */

test("nothing limits how many posts there are: the limits are gone", () => {
  assert.equal(feed.applyLimits, undefined);
  assert.equal(feed.DAILY_POST_CAP, undefined);
  assert.equal(feed.NPC_SPACING_MS, undefined);
});

/* ------------------------------------------------------------------ */
/* planPost / planBlogCard                                             */
/* ------------------------------------------------------------------ */

const planInput = (over = {}) => ({
  postId: "fp_1", event: lessonEvent(), now: NOON, templates: [tpl({ reactors: ["npc-hal"] })], history: history(),
  npcs: CAST, values: { lesson: "What is an atom?", name: "Sam" }, rng: mulberry32(3), ...over,
});

test("planPost renders once, chooses a chip, plans reactions and applies the rules", () => {
  const r = feed.planPost(planInput());
  assert.equal(r.ok, true);
  assert.equal(r.post.text, "You finished What is an atom?.");
  assert.deepEqual([r.post.npcId, r.post.templateId, r.post.dedupeKey, r.post.trigger, r.post.kind], ["npc-ada", "ft-1", "lesson:what-is-an-atom", "lesson_complete", "celebrate"]);
  assert.deepEqual([r.post.chipKind, r.post.chipTarget], ["lesson", "what-is-an-atom"]);
  assert.deepEqual(r.target, { type: "post", id: "fp_1" });
  assert.ok(r.reactions.some((x) => x.actorId === "npc-hal"), "the selected reactor reacts");
  assert.ok(r.reactions.every((x) => x.actorId !== "npc-ada"));

  assert.deepEqual(feed.planPost(planInput({ history: history({ dedupeKeys: ["lesson:what-is-an-atom"] }) })), { ok: false, reason: "duplicate" });
  assert.deepEqual(feed.planPost(planInput({ templates: [] })), { ok: false, reason: "no_template" });
  // the same teacher posting again straight away is fine: there is no spacing rule
  assert.equal(feed.planPost(planInput({ now: NOON + 1000, history: history({ dedupeKeys: ["lesson:other"] }) })).ok, true);
  assert.deepEqual(feed.planPost(planInput({ values: { name: "Sam" } })), { ok: false, reason: "render" });
  // a chip that has no target on this event is dropped; quests and ranks chips need none
  const noLessonChip = feed.planPost(planInput({ event: { type: "checkpoint_pass", unitId: "u" }, templates: [tpl({ trigger: "checkpoint_pass", text: "Checkpoint in {unit}.", chip: "lesson" })], values: { unit: "U" } }));
  assert.equal(noLessonChip.post.chipKind, null);
  const quests = feed.planPost(planInput({ event: { type: "daily_quests_done" }, templates: [tpl({ trigger: "daily_quests_done", text: "All done.", chip: "quests" })] }));
  assert.deepEqual([quests.post.chipKind, quests.post.chipTarget], ["quests", null]);
});

test("a streak post is the learner's own voice: the poster is the learner, a friend reacts", () => {
  const streak = tpl({ id: "ft-streak-7", npcId: null, posterPool: ["learner"], kind: "milestone", trigger: "streak", condition: { days: 7 }, text: "{days} days in a row.", chip: null, reactors: ["npc-ray"] });
  const r = feed.planPost(planInput({ event: { type: "streak", days: 7 }, templates: [streak], values: { days: 7, name: "Sam" } }));
  assert.equal(r.ok, true);
  assert.equal(r.post.npcId, feed.LEARNER_POSTER);
  assert.equal(r.post.text, "7 days in a row.");
  assert.ok(r.reactions.some((x) => x.actorId === "npc-ray"));
});

test("reconcileEvents lists the posts progress says are missing, oldest first, and nothing already posted", () => {
  const nodes = [
    { id: "n1", unitId: "u1", kind: "lesson", position: 1, lessonId: "l1" },
    { id: "n2", unitId: "u1", kind: "lesson", position: 2, lessonId: "l2" },
    { id: "n3", unitId: "u1", kind: "checkpoint", position: 3 },
    { id: "n4", unitId: "u2", kind: "lesson", position: 1, lessonId: "l3" },
  ];
  const input = {
    unitIds: ["u1", "u2"], nodes,
    completed: new Set(["n1", "n2", "n3"]), testedOut: new Set(), completedUnits: new Set(["u1"]),
    stars: new Map([["n2", 3]]), completedAt: new Map([["n1", 10], ["n2", 20], ["n3", 30]]), streak: 7,
  };
  const types = (items) => items.map((i) => `${i.event.type}:${i.event.lessonId ?? i.event.unitId ?? i.event.days}`);
  const all = feed.reconcileEvents(input, new Set(), "2026-11-18");
  assert.deepEqual(types(all), ["first_lesson:l1", "lesson_complete:l2", "checkpoint_pass:u1", "unit_complete:u1", "streak:3", "streak:7"]);
  assert.equal(all[0].fallback.type, "lesson_complete");
  assert.equal(all[1].event.perfect, true);
  assert.deepEqual(all.map((i) => i.at), [10, 20, 30, 30, null, null]);
  // Posted already: left out. The hello may have fallen back to a lesson post: still not repeated.
  assert.deepEqual(types(feed.reconcileEvents(input, new Set(["first-lesson", "lesson:l2", "checkpoint:u1", "unit:u1", "streak:3", "streak:7"]), "2026-11-18")), []);
  assert.deepEqual(types(feed.reconcileEvents(input, new Set(["lesson:l1", "lesson:l2", "checkpoint:u1", "unit:u1", "streak:3", "streak:7"]), "2026-11-18")), []);
  // Nothing done, nothing to post; a test-out posts for its unit.
  assert.deepEqual(feed.reconcileEvents({ ...input, completed: new Set(), completedUnits: new Set(), streak: 0 }, [], "d"), []);
  assert.deepEqual(types(feed.reconcileEvents({ ...input, completed: new Set(), completedUnits: new Set(), streak: 0, testedOut: new Set(["u2"]) }, [], "d")), ["testout_pass:u2"]);
});

test("planPost is stable: same inputs, same post and reactions", () => {
  assert.deepEqual(feed.planPost(planInput({ rng: mulberry32(11) })), feed.planPost(planInput({ rng: mulberry32(11) })));
});

test("planBlogCard: text is the hook, never limited, dedupes on blog:<id>, reactions target the piece", () => {
  const b = { id: "blog-the-smallest-thing", npcId: "npc-ada", hook: "What is the smallest thing?", reactors: ["npc-hal"] };
  const r = feed.planBlogCard({ postId: "fp_b", blog: b, now: NOON, history: { dedupeKeys: new Set() }, npcs: CAST });
  assert.equal(r.ok, true);
  assert.deepEqual([r.post.text, r.post.dedupeKey, r.post.blogId, r.post.trigger, r.post.kind, r.post.templateId], [b.hook, "blog:blog-the-smallest-thing", b.id, "blog_unlocked", "blog", null]);
  assert.deepEqual(r.target, { type: "blog", id: b.id });
  assert.ok(r.reactions.some((x) => x.actorId === "npc-hal") && r.reactions.every((x) => x.actorId !== "npc-ada"));
  assert.deepEqual(feed.planBlogCard({ postId: "x", blog: b, now: NOON, history: { dedupeKeys: ["blog:blog-the-smallest-thing"] }, npcs: CAST }), { ok: false, reason: "duplicate" });
});

/* ------------------------------------------------------------------ */
/* social-core                                                         */
/* ------------------------------------------------------------------ */

test("planReactions: never the poster, never a repeat, 0-4 random plus selected, only valid reactions", () => {
  for (let i = 0; i < 300; i++) {
    const target = { type: "post", id: `fp_${i}`, kind: ["celebrate", "milestone", "nudge", "tease", "blog"][i % 5], posterId: CAST[i % CAST.length].id };
    const selected = ["npc-hal", "npc-mina", "not-an-npc", target.posterId];
    const out = social.planReactions(target, selected, CAST);
    const ids = out.map((r) => r.actorId);
    assert.ok(!ids.includes(target.posterId), "poster excluded");
    assert.equal(new Set(ids).size, ids.length, "no repeats");
    assert.ok(ids.every((id) => CAST.some((n) => n.id === id)), "only the cast");
    const chosen = selected.filter((id) => id !== target.posterId && CAST.some((n) => n.id === id));
    for (const id of chosen) assert.ok(ids.includes(id), `selected ${id} reacts`);
    assert.ok(ids.length - chosen.length >= 0 && ids.length - chosen.length <= 4, "0-4 random");
    assert.ok(out.every((r) => social.REACTIONS.includes(r.reaction)));
  }
});

test("planReactions is stable for the same target id, regardless of cast order, and varies by target", () => {
  const target = { type: "post", id: "fp_stable", kind: "celebrate", posterId: "npc-ada" };
  const a = social.planReactions(target, ["npc-hal"], CAST);
  assert.deepEqual(a, social.planReactions(target, ["npc-hal"], CAST));
  assert.deepEqual(a, social.planReactions(target, ["npc-hal"], [...CAST].reverse()));
  const shapes = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(social.planReactions({ ...target, id: `fp_${i}` }, [], CAST))));
  assert.ok(shapes.size > 10, "different targets give different crowds");
  // an injected RNG overrides the seed
  assert.deepEqual(social.planReactions(target, [], CAST, mulberry32(1)), social.planReactions(target, [], CAST, mulberry32(1)));
});

test("planReactions: a celebration skews to clap/love, a tease to wow", () => {
  const tally = (kind) => {
    const t = { like: 0, love: 0, clap: 0, wow: 0 };
    for (let i = 0; i < 400; i++) for (const r of social.planReactions({ type: "post", id: `${kind}${i}`, kind, posterId: "npc-ada" }, ["npc-hal", "npc-ray", "npc-mina"], CAST)) t[r.reaction]++;
    return t;
  };
  const celebrate = tally("celebrate");
  assert.ok(celebrate.clap + celebrate.love > celebrate.like + celebrate.wow);
  const tease = tally("tease");
  assert.ok(tease.wow > tease.like && tease.wow > tease.clap && tease.wow > tease.love);
});

test("toggleUserReaction sets, changes and clears one reaction", () => {
  assert.deepEqual(social.toggleUserReaction(null, "clap"), { next: "clap", action: "set" });
  assert.deepEqual(social.toggleUserReaction(undefined, "like"), { next: "like", action: "set" });
  assert.deepEqual(social.toggleUserReaction("clap", "love"), { next: "love", action: "change" });
  assert.deepEqual(social.toggleUserReaction("love", "love"), { next: null, action: "clear" });
  assert.ok(social.isReaction("wow") && !social.isReaction("angry") && !social.isReaction(3));
});

test("summarizeReactions counts, orders glyphs and heads, and finds the learner's own", () => {
  const rows = [
    { actorType: "npc", actorId: "npc-b", reaction: "clap", createdAt: 2 },
    { actorType: "npc", actorId: "npc-a", reaction: "clap", createdAt: 1 },
    { actorType: "npc", actorId: "npc-c", reaction: "wow", createdAt: 3 },
    { actorType: "npc", actorId: "npc-d", reaction: "like", createdAt: 4 },
    { actorType: "user", actorId: "me", reaction: "love", createdAt: 5 },
  ];
  const s = social.summarizeReactions(rows);
  assert.equal(s.total, 5);
  assert.equal(s.others, 4);
  assert.equal(s.mine, "love");
  assert.deepEqual(s.counts, { like: 1, love: 1, clap: 2, wow: 1 });
  assert.deepEqual(s.top, ["clap", "like", "love"]);
  assert.deepEqual(s.heads, ["npc-a", "npc-b", "npc-c"]);
  assert.equal(s.extra, 1);
  assert.deepEqual(social.summarizeReactions([]), { total: 0, counts: { like: 0, love: 0, clap: 0, wow: 0 }, top: [], heads: [], extra: 0, mine: null, others: 0 });
});

/* ------------------------------------------------------------------ */
/* blog-core                                                           */
/* ------------------------------------------------------------------ */

const progress = (over = {}) => ({ completedLessonIds: new Set(), completedUnitIds: new Set(), streak: 0, ...over });

test("isUnlocked: none, lesson_complete, unit_complete and streak", () => {
  assert.equal(blog.isUnlocked({ unlock: { trigger: "none" } }, progress()), true);
  const lesson = { unlock: { trigger: "lesson_complete", lessonId: "l1" } };
  assert.equal(blog.isUnlocked(lesson, progress()), false);
  assert.equal(blog.isUnlocked(lesson, progress({ completedLessonIds: new Set(["l2"]) })), false);
  assert.equal(blog.isUnlocked(lesson, progress({ completedLessonIds: new Set(["l1"]) })), true);
  assert.equal(blog.isUnlocked(lesson, progress({ completedLessonIds: ["l1"] })), true, "arrays work too");
  const unit = { unlock: { trigger: "unit_complete", unitId: "u1" } };
  assert.equal(blog.isUnlocked(unit, progress({ completedLessonIds: new Set(["u1"]) })), false, "a lesson id is not a unit id");
  assert.equal(blog.isUnlocked(unit, progress({ completedUnitIds: new Set(["u1"]) })), true);
  const streak = { unlock: { trigger: "streak", days: 7 } };
  assert.equal(blog.isUnlocked(streak, progress({ streak: 6 })), false);
  assert.equal(blog.isUnlocked(streak, progress({ streak: 7 })), true);
  assert.equal(blog.isUnlocked(streak, progress({ streak: 40 })), true);
  assert.equal(blog.isUnlocked(streak, progress({ streak: NaN })), false);
  assert.equal(blog.isUnlocked({ unlock: { trigger: "mystery" } }, progress({ streak: 99 })), false);
  assert.equal(blog.isUnlocked({}, progress()), false);
});

test("wordCount counts p, quote, fact and list blocks only; readingMinutes rounds up, at least 1", () => {
  const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
  const blocks = [
    { t: "p", text: words(10) },
    { t: "h", text: "A heading of four words" },
    { t: "quote", text: words(5) },
    { t: "fact", text: `  ${words(3)}  ` },
    { t: "list", items: [words(2), words(2)] },
    { t: "figure", ref: "atom", caption: "a caption that is not read" },
    { t: "next", label: "Go to the lesson now", lessonId: "l1" },
  ];
  assert.equal(blog.wordCount(blocks), 10 + 5 + 3 + 4);
  assert.equal(blog.wordCount([]), 0);
  assert.equal(blog.readingMinutes([]), 1);
  assert.equal(blog.readingMinutes([{ t: "p", text: words(1) }]), 1);
  assert.equal(blog.readingMinutes([{ t: "p", text: words(blog.READING_WPM) }]), 1);
  assert.equal(blog.readingMinutes([{ t: "p", text: words(blog.READING_WPM + 1) }]), 2);
  assert.equal(blog.readingMinutes([{ t: "p", text: words(350) }]), Math.ceil(350 / blog.READING_WPM));
  const read = blog.readAloudText("Title", blocks);
  assert.ok(read.startsWith("Title\n\n") && read.includes("A heading of four words") && !read.includes("not read"));
});

/* ------------------------------------------------------------------ */
/* rank-core                                                           */
/* ------------------------------------------------------------------ */

test("week keys are the Monday of the week", () => {
  assert.equal(rank.weekKeyOfDay("2026-11-16"), "2026-11-16"); // Monday
  assert.equal(rank.weekKeyOfDay("2026-11-18"), "2026-11-16");
  assert.equal(rank.weekKeyOfDay("2026-11-22"), "2026-11-16"); // Sunday
  assert.equal(rank.weekKeyOfDay("2026-11-23"), "2026-11-23");
  assert.equal(rank.weekKeyOfDay("2027-01-01"), "2026-12-28");
  assert.equal(rank.weekKeyOfDate(new Date(2026, 10, 18, 9)), "2026-11-16");
  assert.deepEqual(rank.weekDayKeys("2026-11-16"), ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.deepEqual([rank.dayOfWeek("2026-11-16"), rank.dayOfWeek("2026-11-18"), rank.dayOfWeek("2026-11-22")], [1, 3, 7]);
  assert.deepEqual(rank.previousWeekKeys("2026-11-16", 2), ["2026-11-09", "2026-11-02"]);
  // agrees with missions-core's weekly period key
});

test("simulateRivalXp is deterministic per NPC and week and varies by both", () => {
  const a = rank.simulateRivalXp("npc-ada", "2026-11-16", 300);
  assert.equal(a, rank.simulateRivalXp("npc-ada", "2026-11-16", 300));
  assert.ok(Number.isInteger(a) && a > 0);
  const byNpc = new Set(CAST.map((n) => rank.simulateRivalXp(n.id, "2026-11-16", 300)));
  assert.ok(byNpc.size >= 5, "rivals differ");
  const byWeek = new Set(Array.from({ length: 12 }, (_, i) => rank.simulateRivalXp("npc-ada", rank.previousWeekKeys("2026-11-16", 12)[i], 300)));
  assert.ok(byWeek.size >= 8, "the table moves week to week");
  // scales with the learner's pace, with a floor so a new learner still has rivals
  assert.ok(rank.simulateRivalXp("npc-ada", "2026-11-16", 3000) > rank.simulateRivalXp("npc-ada", "2026-11-16", 300));
  assert.equal(rank.simulateRivalXp("npc-ada", "2026-11-16", 0), rank.simulateRivalXp("npc-ada", "2026-11-16", NaN));
  assert.ok(rank.simulateRivalXp("npc-ada", "2026-11-16", 0) > 0);
  // rivals are beatable: nobody is wildly out of reach of the learner's own pace
  for (const n of CAST) for (let w = 0; w < 30; w++) {
    const xp = rank.simulateRivalXp(n.id, rank.previousWeekKeys("2026-11-16", 30)[w], 500);
    assert.ok(xp <= 500 * 1.6 && xp >= 500 * 0.35, `${n.id} week ${w}: ${xp}`);
  }
});

test("simulateRivalXp grows through the week and ends at the weekly total", () => {
  let last = 0;
  for (let d = 1; d <= 7; d++) {
    const xp = rank.simulateRivalXp("npc-hal", "2026-11-16", 400, d);
    assert.ok(xp >= last, `day ${d}`);
    last = xp;
  }
  assert.equal(last, rank.simulateRivalXp("npc-hal", "2026-11-16", 400));
  assert.equal(rank.simulateRivalXp("npc-hal", "2026-11-16", 400, 0), 0);
  assert.equal(rank.simulateRivalXp("npc-hal", "2026-11-16", 400, 3), rank.simulateRivalXp("npc-hal", "2026-11-16", 400, 3));
});

test("buildRanking orders by XP and breaks ties by id; ranks are distinct", () => {
  const rows = rank.buildRanking(120, [{ id: "npc-b", xp: 200 }, { id: "npc-a", xp: 120 }, { id: "npc-c", xp: 120 }, { id: "npc-d", xp: 50 }]);
  assert.deepEqual(rows.map((r) => r.id), ["npc-b", "me", "npc-a", "npc-c", "npc-d"]); // "me" < "npc-a" on the tie
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3, 4, 5]);
  assert.deepEqual(rows.map((r) => r.isLearner), [false, true, false, false, false]);
  assert.equal(rank.buildRanking(0, []).length, 1);
  assert.equal(rank.buildRanking(-5.6, [])[0].xp, 0);
  const shuffledInput = rank.buildRanking(120, [{ id: "npc-d", xp: 50 }, { id: "npc-c", xp: 120 }, { id: "npc-a", xp: 120 }, { id: "npc-b", xp: 200 }]);
  assert.deepEqual(shuffledInput, rows, "input order does not matter");
  const full = rank.weeklyRanking(100, CAST.map((n) => n.id), "2026-11-16", 300, 3);
  assert.equal(full.length, 8);
  assert.ok(full.every((r, i) => i === 0 || full[i - 1].xp >= r.xp));
  assert.deepEqual(full, rank.weeklyRanking(100, CAST.map((n) => n.id), "2026-11-16", 300, 3));
});

test("rankChange reports a pass only when the learner and a rival swap order", () => {
  const order = (...ids) => ids.map((id) => ({ id }));
  const before = order("npc-a", "npc-b", "me", "npc-c");
  assert.deepEqual(rank.rankChange(before, before), { type: "none" });
  assert.deepEqual(rank.rankChange(before, order("npc-a", "npc-b", "npc-c", "me")), { type: "pass", direction: "passed_by", npcId: "npc-c", rankBefore: 3, rankAfter: 4 });
  assert.deepEqual(rank.rankChange(before, order("npc-a", "me", "npc-b", "npc-c")), { type: "pass", direction: "passed", npcId: "npc-b", rankBefore: 3, rankAfter: 2 });
  // two passed at once: the nearest rival (just below the learner now) is reported
  assert.deepEqual(rank.rankChange(before, order("me", "npc-a", "npc-b", "npc-c")), { type: "pass", direction: "passed", npcId: "npc-a", rankBefore: 3, rankAfter: 1 });
  // rivals swapping places with each other is not news
  assert.deepEqual(rank.rankChange(before, order("npc-b", "npc-a", "me", "npc-c")), { type: "none" });
  // the learner moving without passing anyone (a rival left the table) is not a pass
  assert.deepEqual(rank.rankChange(before, order("npc-a", "me", "npc-c")), { type: "none" });
  assert.deepEqual(rank.rankChange([], before), { type: "none" });
  assert.deepEqual(rank.rankChange(order("npc-a"), order("npc-a")), { type: "none" });
  // works on full rows too
  const rows = rank.buildRanking(100, [{ id: "npc-a", xp: 150 }]);
  const rows2 = rank.buildRanking(200, [{ id: "npc-a", xp: 150 }]);
  assert.equal(rank.rankChange(rows, rows2).direction, "passed");
});

/* ------------------------------------------------------------------ */
/* Store: the real SQL on an in-memory SQLite                          */
/* ------------------------------------------------------------------ */

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(LOCAL_FIRST_SCHEMA);
  return {
    raw: db,
    async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
    async getFirstAsync(sql, params = []) { return db.prepare(sql).get(...params) ?? null; },
    async withTransactionAsync(task) {
      db.exec("BEGIN");
      try { await task(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}

const planned = (id, createdAt, over = {}) => ({
  id, dedupeKey: `k:${id}`, templateId: "ft-1", npcId: "npc-ada", kind: "celebrate", trigger: "lesson_complete", text: `post ${id}`,
  chipKind: null, chipTarget: null, blogId: null, createdAt, ...over,
});
const npcReactions = [{ actorId: "npc-hal", reaction: "clap" }, { actorId: "npc-ray", reaction: "love" }];

test("store: a post and its reactions are written together and read back newest first", async () => {
  const db = memoryDb();
  const store = storeCore.createFeedStore(() => db);
  assert.equal(await store.insertPost(planned("p1", 1000), npcReactions, { type: "post", id: "p1" }), true);
  assert.equal(await store.insertPost(planned("p2", 2000, { chipKind: "lesson", chipTarget: "l1" }), [], { type: "post", id: "p2" }), true);
  const list = await store.listPosts();
  assert.deepEqual(list.map((p) => p.id), ["p2", "p1"]);
  assert.deepEqual([list[0].chipKind, list[0].chipTarget, list[0].trigger, list[0].seenAt], ["lesson", "l1", "lesson_complete", null]);
  assert.deepEqual(list[1].reactions.map((r) => [r.actorId, r.actorType, r.reaction, r.targetType]), [["npc-hal", "npc", "clap", "post"], ["npc-ray", "npc", "love", "post"]]);
  assert.deepEqual(list[0].reactions, []);
});

test("store: a used dedupe key writes nothing, reactions included", async () => {
  const db = memoryDb();
  const store = storeCore.createFeedStore(() => db);
  assert.equal(await store.insertPost(planned("p1", 1000), npcReactions, { type: "post", id: "p1" }), true);
  assert.equal(await store.hasDedupeKey("k:p1"), true);
  assert.equal(await store.insertPost(planned("p9", 3000, { dedupeKey: "k:p1" }), [{ actorId: "npc-tess", reaction: "wow" }], { type: "post", id: "p9" }), false);
  assert.equal((await store.listPosts()).length, 1);
  assert.equal((await store.getReactions("post", "p9")).length, 0);
  assert.deepEqual(await store.listDedupeKeys(), ["k:p1"]);
});

test("store: a failed transaction rolls back the post", async () => {
  const db = memoryDb();
  let writes = 0;
  const flaky = { ...db, async runAsync(sql, params) { if (++writes === 2) throw new Error("disk full"); return db.runAsync(sql, params); } };
  const store = storeCore.createFeedStore(() => flaky);
  await assert.rejects(store.insertPost(planned("p1", 1000), npcReactions, { type: "post", id: "p1" }), /disk full/);
  assert.equal((await storeCore.createFeedStore(() => db).listPosts()).length, 0, "the post was rolled back with its failed reaction");
});

test("store: the learner's reaction sets, changes and clears one row", async () => {
  const db = memoryDb();
  const store = storeCore.createFeedStore(() => db);
  await store.insertPost(planned("p1", 1000), npcReactions, { type: "post", id: "p1" });
  assert.equal(await store.getUserReaction("post", "p1"), null);
  await store.setUserReaction("post", "p1", "clap", 5000);
  assert.equal(await store.getUserReaction("post", "p1"), "clap");
  await store.setUserReaction("post", "p1", "wow", 6000);
  assert.equal(await store.getUserReaction("post", "p1"), "wow");
  const mine = (await store.getReactions("post", "p1")).filter((r) => r.actorType === "user");
  assert.equal(mine.length, 1);
  assert.deepEqual([mine[0].actorId, mine[0].reaction], ["me", "wow"]);
  assert.equal((await store.getReactions("post", "p1")).length, 3);
  await store.setUserReaction("post", "p1", null, 7000);
  assert.equal(await store.getUserReaction("post", "p1"), null);
  assert.equal((await store.getReactions("post", "p1")).length, 2);
  // the toggle rule on top of the store
  let current = await store.getUserReaction("post", "p1");
  for (const tap of ["like", "like", "love"]) {
    current = social.toggleUserReaction(current, tap).next;
    await store.setUserReaction("post", "p1", current, 8000);
  }
  assert.equal(await store.getUserReaction("post", "p1"), "love");
  assert.throws(() => db.raw.prepare("INSERT INTO reactions (id,target_type,target_id,actor_type,actor_id,reaction,created_at) VALUES ('x','post','p1','user','me','angry',1)").run());
});

test("store: seen marks, the unseen count and blog reads", async () => {
  const db = memoryDb();
  const store = storeCore.createFeedStore(() => db);
  for (const [id, t] of [["p1", 1000], ["p2", 2000], ["p3", 3000]]) await store.insertPost(planned(id, t), [], { type: "post", id });
  assert.equal(await store.countUnseen(), 3);
  assert.equal(await store.markSeen(["p1", "p2"], 9000), 2);
  assert.equal(await store.markSeen(["p1"], 9500), 0, "already seen keeps its time");
  assert.equal(await store.markSeen([], 9500), 0);
  assert.equal(await store.countUnseen(), 1);
  assert.equal((await store.listPosts()).find((p) => p.id === "p1").seenAt, 9000);
  assert.equal(await store.recordBlogRead("b1", 100), true);
  assert.equal(await store.recordBlogRead("b1", 200), false);
  assert.deepEqual(await store.listBlogReads(), [{ blogId: "b1", readAt: 100 }]);
});

test("store: blog cards carry the piece's reactions and list with the posts", async () => {
  const db = memoryDb();
  const store = storeCore.createFeedStore(() => db);
  await store.insertPost(planned("fb1", 1500, { dedupeKey: "blog:b1", templateId: null, kind: "blog", trigger: "blog_unlocked", blogId: "b1", text: "hook" }), npcReactions, { type: "blog", id: "b1" });
  await store.insertPost(planned("p1", 1000), [], { type: "post", id: "p1" });
  await store.setUserReaction("blog", "b1", "love", 2000);
  const list = await store.listPosts();
  assert.deepEqual(list.map((p) => p.id), ["fb1", "p1"]);
  assert.deepEqual(list[0].reactions.map((r) => r.targetType), ["blog", "blog", "blog"]);
  assert.deepEqual(await store.listBlogCardIds(), ["b1"]);
  assert.deepEqual((await store.listPostMeta()).map((m) => m.blogId), ["b1", null]);
});

test("store retention keeps the newest 200 posts and every blog card, blog read and learner reaction", async () => {
  const db = memoryDb();
  const store = storeCore.createFeedStore(() => db);
  assert.equal(storeCore.FEED_RETENTION, 200);
  // 5 blog cards (the oldest) and 260 posts newer than them
  for (let i = 0; i < 5; i++) await store.insertPost(planned(`fb${i}`, 100 + i, { dedupeKey: `blog:b${i}`, templateId: null, kind: "blog", trigger: "blog_unlocked", blogId: `b${i}` }), npcReactions, { type: "blog", id: `b${i}` });
  for (let i = 0; i < 260; i++) await store.insertPost(planned(`p${i}`, 1000 + i), npcReactions, { type: "post", id: `p${i}` });
  await store.setUserReaction("post", "p0", "clap", 1); // on a post that will be deleted
  await store.setUserReaction("blog", "b0", "love", 1);
  await store.recordBlogRead("b0", 1);

  const before = await store.listPosts();
  assert.equal(before.length, 265);
  const result = await store.cleanup();
  const after = await store.listPosts();
  // newest 200 overall are posts p60..p259; the 5 old blog cards survive; p0..p59 go
  assert.equal(result.posts, 60);
  assert.equal(after.length, 205);
  assert.deepEqual(after.filter((p) => p.blogId).map((p) => p.id).sort(), ["fb0", "fb1", "fb2", "fb3", "fb4"]);
  assert.ok(after.some((p) => p.id === "p259") && after.some((p) => p.id === "p60") && !after.some((p) => p.id === "p59"));
  // the deleted posts' NPC reactions are gone, the learner's own stay, blog reactions stay, reads stay
  assert.equal((await store.getReactions("post", "p1")).length, 0);
  assert.deepEqual((await store.getReactions("post", "p0")).map((r) => [r.actorType, r.reaction]), [["user", "clap"]]);
  assert.equal((await store.getReactions("blog", "b0")).length, 3);
  assert.equal((await store.getReactions("post", "p100")).length, 2);
  assert.equal((await store.listBlogReads()).length, 1);
  assert.equal(result.reactions, 120);
  // running it again changes nothing
  assert.deepEqual(await store.cleanup(), { posts: 0, reactions: 0 });
});

/* ------------------------------------------------------------------ */
/* No learner comment path, anywhere                                   */
/* ------------------------------------------------------------------ */

test("there is no function, table or column for a learner comment", () => {
  const files = ["services/feed.ts", "services/feed-store.ts", "services/feed-store-core.ts", "hooks/use-feed.ts"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(REPO, f), "utf8");
    assert.ok(!/\b(addComment|postComment|insertComment|createComment|comment\s*\()/i.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")), `${f} has no comment writer`);
    assert.ok(!/INSERT[^;]*comment/i.test(src), `${f} inserts no comment`);
  }
  const db = memoryDb();
  const names = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  assert.ok(names.includes("feed_posts") && names.includes("reactions") && names.includes("blog_reads"));
  for (const t of ["feed_posts", "reactions", "blog_reads"]) {
    const cols = db.raw.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
    assert.ok(!cols.some((c) => /comment/i.test(c)), `${t} has no comment column`);
  }
  const exported = Object.keys(storeCore.createFeedStore(() => db));
  assert.ok(!exported.some((n) => /comment/i.test(n)));
});

/* ------------------------------------------------------------------ */
/* The work queue: one at a time, never wedged                          */
/* ------------------------------------------------------------------ */

test("the queue runs tasks one at a time, in order, and a failure does not stop the next", async () => {
  const { createFeedQueue } = await load("services/feed-queue-core.ts");
  const warnings = [];
  const q = createFeedQueue({ timeoutMs: 1000, warn: (what) => warnings.push(what) });
  const log = [];
  const slow = q.enqueue("a", async () => {
    log.push("a:start");
    await new Promise((r) => setTimeout(r, 20));
    log.push("a:end");
    return 1;
  });
  const bad = q.enqueue("bad", async () => {
    throw new Error("boom");
  });
  const last = q.enqueue("c", async () => {
    log.push("c");
    return 3;
  });
  assert.equal(await slow, 1);
  assert.equal(await bad, undefined);
  assert.equal(await last, 3);
  assert.deepEqual(log, ["a:start", "a:end", "c"]);
  assert.deepEqual(warnings, ["bad"]);
});

test("a task that waits on the queue itself is let go of instead of wedging the feed for good", async () => {
  const { createFeedQueue } = await load("services/feed-queue-core.ts");
  const warnings = [];
  const q = createFeedQueue({ timeoutMs: 40, warn: (what) => warnings.push(what) });
  // The shape of the old `emitRankCheck`: a queued task awaits another queued call.
  q.defer("outer", () => q.enqueue("inner", async () => 1));
  const after = await q.enqueue("after", async () => "still works");
  assert.equal(after, "still works");
  assert.ok(warnings.includes("outer"), "the stuck task is reported");
});

test("no queued task in services/feed.ts awaits another queued call (it would wait behind itself)", () => {
  const src = fs.readFileSync(path.join(REPO, "services/feed.ts"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  // `defer(..., () => checkRankChange())` and similar: a task body that calls an exported, queueing function.
  const queueing = ["checkRankChange", "reconcileFeed", "ensureBlogCards", "onFeedEvent", "markSeen", "recordBlogRead"];
  for (const fn of queueing) {
    assert.ok(!new RegExp(`defer\\([^)]*\\b${fn}\\(`).test(src), `a deferred task calls ${fn}()`);
    assert.ok(!new RegExp(`await\\s+${fn}\\(`).test(src), `feed.ts awaits ${fn}() inside itself`);
  }
});
