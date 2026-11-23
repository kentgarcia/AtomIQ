import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("services/tutorial-core.ts")).href);
const {
  CHAPTERS,
  INTROS,
  MARK_LEGACY,
  MARK_REWARD,
  MARK_SKIPPED,
  MAX_CHAPTER_BEATS,
  MAX_INTRO_BEATS,
  MAX_WORDS,
  TOUR_REWARD_DIAMONDS,
} = core;

const onboarded = { onboardingDone: true, lessonsCompleted: 0, firstLessonDone: false };
const lesson1 = { onboardingDone: true, lessonsCompleted: 1, firstLessonDone: true };
const steps = (...entries) => new Map(entries.map((e) => (Array.isArray(e) ? e : [e, "done"])));
const idsOf = (chapter) => CHAPTERS.find((c) => c.id === chapter).beats.map((b) => b.id);
const doneAll = (...chapters) => steps(...chapters.flatMap((c) => idsOf(c)));

test("the catalog follows the spec's limits and every id is unique", () => {
  const all = core.allBeats();
  assert.equal(new Set(all.map((b) => b.id)).size, all.length);
  for (const b of all) {
    assert.ok(core.wordCount(b.say) <= MAX_WORDS, `${b.id} says too much`);
    if (b.mode === "tap") assert.ok(b.until, `${b.id} is a tap beat with no event`);
    if (b.mode === "look") assert.equal(b.until, undefined, `${b.id} is a look beat with an event`);
    assert.ok(b.host === "root" || b.host === "preview");
  }
  for (const c of CHAPTERS) assert.ok(c.beats.length <= MAX_CHAPTER_BEATS, `${c.id} is too long`);
  for (const i of INTROS) {
    assert.ok(i.beats.length <= MAX_INTRO_BEATS, `${i.id} is too long`);
    for (const b of i.beats) assert.equal(b.screen, i.screen);
  }
  assert.equal(TOUR_REWARD_DIAMONDS, 10);
});

test("nothing shows before onboarding is done or with Tips off", () => {
  assert.equal(core.pickBeat(steps(), { ...onboarded, onboardingDone: false }, "home", true), null);
  assert.equal(core.pickBeat(steps(), onboarded, "home", false), null);
});

test("a new learner starts at the first lesson's first beat, and a beat is only passed once it is recorded", () => {
  const first = core.pickBeat(steps(), onboarded, "home", true);
  assert.equal(first.beat.id, "first-lesson.node");
  assert.equal(first.kind, "chapter");
  assert.deepEqual([first.index, first.total], [1, 3]);
  const second = core.pickBeat(steps("first-lesson.node"), onboarded, "home", true);
  assert.equal(second.beat.id, "first-lesson.bubble");
});

test("after the last beat the chapter waits for its goal and shows nothing", () => {
  const all = doneAll("first-lesson");
  assert.equal(core.chapterState(CHAPTERS[0], all, onboarded), "waiting-goal");
  assert.equal(core.pickBeat(all, onboarded, "home", true), null);
  assert.equal(core.pickBeat(all, onboarded, "quests", true), null, "intros stay out while lesson 1 is waiting");
});

test("finishing lesson 1 ends the chapter however the beats went, and the feed chapter takes over", () => {
  assert.equal(core.chapterState(CHAPTERS[0], steps(), lesson1), "done");
  const next = core.pickBeat(steps(), lesson1, "home", true);
  assert.equal(next.beat.id, "feed.tab");
  assert.equal(core.chapterState(CHAPTERS[1], steps(), onboarded), "locked");
});

test("chapters run in order: feed, then phone, and a chapter's beat wins whatever the screen", () => {
  const afterFeed = doneAll("first-lesson", "feed");
  assert.equal(core.pickBeat(afterFeed, lesson1, "home", true).beat.id, "phone.tab");
  assert.equal(core.pickBeat(steps("feed.tab"), lesson1, "profile", true).beat.id, "feed.new-posts");
});

test("there are no screen intros: Quests, Profile, Shop, Games and the Atom Maze map show nothing once the chapters are done", () => {
  assert.deepEqual(INTROS, []);
  assert.equal(core.pickBeat(steps(), onboarded, "quests", true).beat.id, "first-lesson.node", "the chapters still lead");
  assert.equal(core.pickBeat(doneAll("first-lesson"), lesson1, "quests", true).beat.id, "feed.tab", "an unstarted chapter still leads");
  const toured = doneAll("first-lesson", "feed", "phone");
  for (const screen of ["home", "quests", "profile", "shop", "story-map"]) assert.equal(core.pickBeat(toured, lesson1, screen, true), null, screen);
});

test("resume steps back from a transient beat to the last stable one", () => {
  // Killed with the preview open: the bubble beat is recorded, the start beat is not
  assert.deepEqual(core.resumeAdjust(steps("first-lesson.node", "first-lesson.bubble"), onboarded).sort(), ["first-lesson.bubble", "first-lesson.node"].sort());
  // Killed with the bubble showing: nothing to forget, the next beat is the (unstable) bubble one... so step back to the node
  assert.deepEqual(core.resumeAdjust(steps("first-lesson.node"), onboarded), ["first-lesson.node"]);
  // Nothing recorded, a stable next beat, and a finished chapter: nothing to do
  assert.deepEqual(core.resumeAdjust(steps(), onboarded), []);
  assert.deepEqual(core.resumeAdjust(doneAll("first-lesson"), onboarded), []);
  assert.deepEqual(core.resumeAdjust(steps("feed.tab"), lesson1), [], "the feed's next beat is stable");
  // After forgetting, the learner is back on the node
  const forget = new Set(core.resumeAdjust(steps("first-lesson.node", "first-lesson.bubble"), onboarded));
  const left = new Map([...steps("first-lesson.node", "first-lesson.bubble")].filter(([id]) => !forget.has(id)));
  assert.equal(core.pickBeat(left, onboarded, "home", true).beat.id, "first-lesson.node");
});

test("a lesson left half way redirects, once per session, and never after Skip or with Tips off", () => {
  const waiting = doneAll("first-lesson");
  const base = { steps: waiting, progress: onboarded, enabled: true, redirectedThisSession: false };
  assert.equal(core.shouldRedirectToLesson(base), true);
  assert.equal(core.shouldRedirectToLesson({ ...base, redirectedThisSession: true }), false);
  assert.equal(core.shouldRedirectToLesson({ ...base, enabled: false }), false);
  assert.equal(core.shouldRedirectToLesson({ ...base, steps: steps(...waiting, MARK_SKIPPED) }), false);
  assert.equal(core.shouldRedirectToLesson({ ...base, progress: lesson1 }), false, "lesson 1 is finished");
  assert.equal(core.shouldRedirectToLesson({ ...base, steps: steps("first-lesson.node") }), false, "the beats have not all been shown");
  assert.equal(core.isNewSession(60_000), false);
  assert.equal(core.isNewSession(core.REDIRECT_AWAY_MS), true);
});

test("existing learners have the chapters skipped and are shown nothing", () => {
  const rows = core.legacyRows(steps(), { onboardingDone: true, lessonsCompleted: 3, firstLessonDone: true });
  assert.ok(rows.includes(MARK_LEGACY) && rows.includes(MARK_SKIPPED));
  for (const id of CHAPTERS.flatMap((c) => c.beats.map((b) => b.id))) assert.ok(rows.includes(id));
  assert.deepEqual(core.legacyRows(steps(), onboarded), [], "a new learner is not legacy");
  assert.deepEqual(core.legacyRows(steps("first-lesson.node"), lesson1), [], "a tour already under way is left alone");
  const seeded = steps(...rows.map((r) => [r, "skipped"]));
  assert.equal(core.pickBeat(seeded, lesson1, "quests", true), null);
  assert.equal(core.rewardDue(seeded, lesson1), false, "a legacy learner is not paid");
});

test("Skip tour skips what is left and stops the reward", () => {
  const rows = core.skipTourRows(steps("first-lesson.node"));
  assert.ok(!rows.includes("first-lesson.node"));
  assert.ok(rows.includes("phone.chats") && rows.includes(MARK_SKIPPED));
  const after = steps(...["first-lesson.node"], ...rows.map((r) => [r, "skipped"]));
  assert.equal(core.pickBeat(after, onboarded, "home", true), null, "nothing left to show");
  assert.equal(core.rewardDue(after, lesson1), false);
  assert.deepEqual(core.skipTourRows(after), [], "skipping again writes nothing");
});

test("the reward is due once, after the whole tour was played", () => {
  const played = doneAll("first-lesson", "feed", "phone");
  assert.equal(core.rewardDue(doneAll("first-lesson", "feed"), lesson1), false);
  assert.equal(core.rewardDue(played, lesson1), true);
  assert.equal(core.rewardDue(steps(...played, MARK_REWARD), lesson1), false);
});

test("replay clears the chapter rows and never the reward", () => {
  const all = steps(...core.allBeats().map((b) => b.id), MARK_REWARD, MARK_SKIPPED);
  const chapterRows = core.replayChapterRows(all);
  assert.ok(chapterRows.includes("feed.tab") && chapterRows.includes(MARK_SKIPPED));
  assert.ok(!chapterRows.includes(MARK_REWARD));
  assert.deepEqual(core.replayIntroRows(all), [], "there are no intro rows to clear");
});

test("tutorial_steps: a step is recorded once, never downgraded, and forgotten on request", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec(core.TUTORIAL_STEPS_SQL);
  const store = core.createTutorialStore(() => ({
    runAsync: async (sql, params = []) => ({ changes: Number(db.prepare(sql).run(...params).changes) }),
    getAllAsync: async (sql, params = []) => db.prepare(sql).all(...params),
  }));
  assert.equal(await store.record("first-lesson.node", "done", 1), true);
  assert.equal(await store.record("first-lesson.node", "skipped", 2), false, "already recorded");
  await store.recordMany(["a", "b"], "skipped", 3);
  assert.deepEqual((await store.list()).map((r) => `${r.stepId}:${r.status}`).sort(), ["a:skipped", "b:skipped", "first-lesson.node:done"]);
  await store.forget(["a"]);
  assert.equal((await store.list()).length, 2);
});

test("the schema's table is the one the core creates", async () => {
  const { readFileSync } = await import("node:fs");
  const schema = readFileSync("services/local-first/schema.ts", "utf8");
  const squash = (s) => s.replace(/--.*$/gm, "").replace(/\s+/g, " ");
  assert.ok(squash(schema).includes(squash(core.TUTORIAL_STEPS_SQL).replace(/;$/, "")));
});

test("routes are read the way the app reads them: groups dropped, the tab roots known, quiet paths quiet", () => {
  const screens = {
    "/": "home", "": "home", "/index": "home", "/(tabs)": "home", "/(tabs)/index": "home", "/(tabs)/": "home",
    "/community": "feed", "/(tabs)/community": "feed", "/phone": "phone", "/(tabs)/phone": "phone",
    "/quests": "quests", "/profile": "profile",
    "/shop": "shop", "/explorer/story": "story-map", "/phone-apps/chats": "chats",
  };
  for (const [path, screen] of Object.entries(screens)) assert.equal(core.screenOfPath(path), screen, path);
  for (const path of ["/onboarding", "/lesson/abc", "/phone-apps/chat", "/phone-apps/new-chat", "/explorer/platformer", null, undefined]) assert.equal(core.screenOfPath(path), null, String(path));
  for (const path of ["/onboarding", "/lesson/abc", "/(tabs)/lesson/x", "/practice/u1-n4", "/explorer/platformer", "/mythbuster"]) assert.equal(core.isQuietPath(path), true, path);
  for (const path of ["/", "/(tabs)", "/community", "/explorer/story", "/shop"]) assert.equal(core.isQuietPath(path), false, path);
});

test("the feed chapter opens the tab and then only says posts arrive over time (nothing to scroll to), and the phone chapter ends on Shrodi's story", () => {
  assert.deepEqual(idsOf("feed"), ["feed.tab", "feed.new-posts"]);
  const posts = core.pickBeat(steps("feed.tab"), lesson1, "feed", true).beat;
  assert.equal(posts.mode, "look", "a look beat: the learner cannot scroll while only a lit control works");
  assert.equal(posts.target, undefined, "no lit control, so nothing off screen to reach");
  assert.equal(core.pickBeat(steps("feed.tab", "feed.new-posts"), lesson1, "feed", true).beat.id, "phone.tab");
  assert.deepEqual(idsOf("phone"), ["phone.tab", "phone.chats", "phone.story"]);
  const story = core.pickBeat(doneAllThrough("phone.chats"), lesson1, "chats", true);
  assert.equal(story.beat.id, "phone.story");
  assert.equal(story.beat.screen, "chats");
  assert.equal(story.beat.until, "story-thread-opened");
  assert.equal(core.rewardDue(doneAll("first-lesson", "feed", "phone"), lesson1), true);
});

function doneAllThrough(lastId) {
  const ids = [...idsOf("first-lesson"), ...idsOf("feed"), "phone.tab", lastId];
  return steps(...ids);
}

test("a transient beat steps back: if the bubble is gone the tour returns to the node", () => {
  assert.deepEqual(core.resumeAdjust(steps("first-lesson.node"), onboarded), ["first-lesson.node"]);
});

test("the tabs open one by one: only Home at first, the Feed with its chapter, the Phone with its chapter, all at the end", () => {
  const locked = (tab, st, progress) => core.tabLocked(tab, st, progress, true);
  // before lesson 1 is finished
  for (const tab of ["quests", "community", "phone", "profile"]) assert.equal(locked(tab, steps(), onboarded), true, tab);
  assert.equal(locked("index", steps(), onboarded), false);
  // lesson 1 finished: the Feed chapter's turn
  assert.equal(locked("community", steps(), lesson1), false);
  assert.equal(locked("phone", steps(), lesson1), true);
  // the Feed chapter finished: the Phone chapter's turn
  const afterFeed = doneAll("first-lesson", "feed");
  assert.equal(locked("phone", afterFeed, lesson1), false);
  for (const tab of ["quests", "profile"]) assert.equal(locked(tab, afterFeed, lesson1), true, tab);
  // the whole tour played: everything opens
  const played = doneAll("first-lesson", "feed", "phone");
  for (const tab of ["quests", "community", "phone", "profile"]) assert.equal(locked(tab, played, lesson1), false, tab);
  assert.equal(core.freeRowDue(played, lesson1), true);
  assert.equal(core.freeRowDue(steps(...played, core.MARK_FREE), lesson1), false);
});

test("nothing is locked for a skipped tour, an existing learner, Tips off, a replay, or before onboarding", () => {
  const all = ["quests", "community", "phone", "profile"];
  const skipped = steps(...core.skipTourRows(steps()).map((r) => [r, "skipped"]));
  const legacy = steps(...core.legacyRows(steps(), { onboardingDone: true, lessonsCompleted: 3, firstLessonDone: true }).map((r) => [r, "skipped"]));
  for (const tab of all) {
    assert.equal(core.tabLocked(tab, skipped, onboarded, true), false, `${tab} skipped`);
    assert.equal(core.tabLocked(tab, legacy, lesson1, true), false, `${tab} legacy`);
    assert.equal(core.tabLocked(tab, steps(), onboarded, false), false, `${tab} tips off`);
    assert.equal(core.tabLocked(tab, steps(), { ...onboarded, onboardingDone: false }, true), false, `${tab} before onboarding`);
    // a replay: the chapter rows are gone but the free marker stays
    assert.equal(core.tabLocked(tab, steps(core.MARK_FREE), lesson1, true), false, `${tab} replay`);
  }
  assert.ok(core.skipTourRows(steps()).includes(core.MARK_FREE));
  assert.ok(core.legacyRows(steps(), { onboardingDone: true, lessonsCompleted: 3, firstLessonDone: true }).includes(core.MARK_FREE));
  assert.ok(!core.replayChapterRows(steps(core.MARK_FREE)).includes(core.MARK_FREE), "replay keeps the free marker");
});

test("a beat added to a chapter later does not reopen it for a learner who skipped or was let in", () => {
  const old = steps(...CHAPTERS.flatMap((c) => c.beats.map((b) => b.id)).filter((id) => id !== "feed.new-posts" && id !== "phone.story"), MARK_SKIPPED);
  for (const c of CHAPTERS) assert.equal(core.chapterState(c, old, lesson1), "done", c.id);
  assert.equal(core.pickBeat(old, lesson1, "feed", true), null);
});

test("no beat lights anything on Quests, Profile, the Shop, Games or the Atom Maze map, and the lock hints stay", () => {
  const off = ["quests", "profile", "shop", "story-map"];
  assert.ok(!core.allBeats().some((b) => off.includes(b.screen)));
  assert.equal(core.pickBeat(doneAll("first-lesson", "feed", "phone"), lesson1, "shop", true), null);
  assert.equal(core.tabLockHint(onboarded), "Complete your first lesson to unlock this tab.");
  assert.equal(core.tabLockHint(lesson1), "Follow Shrodi's tour to unlock this tab.");
});
