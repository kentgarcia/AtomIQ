// Tests for the pure parts of the feed screens (components/feed/feed-ui-core.ts).
// Run: npm run test:feed-ui
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ui = await import(pathToFileURL(path.join(REPO, "components/feed/feed-ui-core.ts")).href);

const NOW = Date.parse("2026-11-18T12:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test("relativeTime is short and steps at the boundaries", () => {
  assert.equal(ui.relativeTime(NOW, NOW), "now");
  assert.equal(ui.relativeTime(NOW - 59_999, NOW), "now");
  assert.equal(ui.relativeTime(NOW - MIN, NOW), "1m");
  assert.equal(ui.relativeTime(NOW - 59 * MIN, NOW), "59m");
  assert.equal(ui.relativeTime(NOW - HOUR, NOW), "1h");
  assert.equal(ui.relativeTime(NOW - 2 * HOUR - 5 * MIN, NOW), "2h");
  assert.equal(ui.relativeTime(NOW - 23 * HOUR, NOW), "23h");
  assert.equal(ui.relativeTime(NOW - DAY, NOW), "1d");
  assert.equal(ui.relativeTime(NOW - 6 * DAY, NOW), "6d");
  assert.equal(ui.relativeTime(NOW - 7 * DAY, NOW), "1w");
  assert.equal(ui.relativeTime(NOW - 15 * DAY, NOW), "2w");
});

test("a time in the future (clock changed) reads now, never negative", () => {
  assert.equal(ui.relativeTime(NOW + 5 * HOUR, NOW), "now");
  assert.equal(ui.relativeTimeSpoken(NOW + 5 * HOUR, NOW), "just now");
});

test("relativeTimeSpoken uses words and plurals", () => {
  assert.equal(ui.relativeTimeSpoken(NOW - 30_000, NOW), "just now");
  assert.equal(ui.relativeTimeSpoken(NOW - MIN, NOW), "1 minute ago");
  assert.equal(ui.relativeTimeSpoken(NOW - 5 * MIN, NOW), "5 minutes ago");
  assert.equal(ui.relativeTimeSpoken(NOW - HOUR, NOW), "1 hour ago");
  assert.equal(ui.relativeTimeSpoken(NOW - 2 * HOUR, NOW), "2 hours ago");
  assert.equal(ui.relativeTimeSpoken(NOW - 3 * DAY, NOW), "3 days ago");
  assert.equal(ui.relativeTimeSpoken(NOW - 7 * DAY, NOW), "1 week ago");
});

test("reactionLine: you and others", () => {
  assert.equal(ui.reactionLine({ total: 0, others: 0, mine: null }), "");
  assert.equal(ui.reactionLine({ total: 1, others: 0, mine: "clap" }), "You");
  assert.equal(ui.reactionLine({ total: 4, others: 3, mine: "clap" }), "You and 3 others");
  assert.equal(ui.reactionLine({ total: 2, others: 1, mine: "like" }), "You and 1 other");
  assert.equal(ui.reactionLine({ total: 3, others: 3, mine: null }), "3 others");
  assert.equal(ui.reactionLine({ total: 1, others: 1, mine: null }), "1 other");
});

test("reactionSpoken and the toggle label say the state in words", () => {
  assert.equal(ui.reactionSpoken({ total: 0, others: 0, mine: null }), "No reactions yet");
  assert.equal(ui.reactionSpoken({ total: 1, others: 1, mine: null }), "1 reaction");
  assert.equal(ui.reactionSpoken({ total: 3, others: 2, mine: "wow" }), "3 reactions, including yours: wow");
  assert.equal(ui.reactButtonLabel(null), "React");
  assert.equal(ui.reactButtonLabel("clap"), "React: clap, selected");
  assert.equal(ui.pickerButtonLabel("love", null), "Love");
  assert.match(ui.pickerButtonLabel("love", "love"), /selected/);
});

test("groupReactors groups by reaction, most used first, ties in reaction order", () => {
  const rows = [
    { id: "a", reaction: "wow" },
    { id: "b", reaction: "clap" },
    { id: "c", reaction: "clap" },
    { id: "d", reaction: "like" },
  ];
  const groups = ui.groupReactors(rows);
  assert.deepEqual(groups.map((g) => g.reaction), ["clap", "like", "wow"]);
  assert.deepEqual(groups[0].rows.map((r) => r.id), ["b", "c"]);
  assert.deepEqual(ui.groupReactors([]), []);
});

test("chips lead where the spec says", () => {
  assert.deepEqual(ui.chipTarget({ kind: "lesson", target: "what-is-an-atom" }), { href: "/lesson/what-is-an-atom", how: "push" });
  assert.equal(ui.chipTarget({ kind: "lesson", target: null }), null);
  assert.deepEqual(ui.chipTarget({ kind: "unit", target: "inside-the-atom" }), { href: "/(tabs)", how: "tab" });
  assert.deepEqual(ui.chipTarget({ kind: "quests", target: null }), { href: "/(tabs)/quests", how: "tab" });
  assert.deepEqual(ui.chipTarget({ kind: "ranks", target: null }), { href: "/ranks", how: "push" });
  assert.deepEqual(Object.keys(ui.CHIP_LABELS).sort(), ["lesson", "quests", "ranks", "unit"]);
});

test("comment chips and next blocks open a lesson, an entry or the map", () => {
  assert.equal(ui.commentChipTarget(null), null);
  assert.equal(ui.commentChipTarget({}), null);
  assert.equal(ui.commentChipTarget({ lessonId: "l1" }).target.href, "/lesson/l1");
  assert.equal(ui.commentChipTarget({ lessonId: "l1" }).locked, false);
  assert.equal(ui.commentChipTarget({ lessonId: "l1" }, new Set(["l1"])).locked, true);
  assert.equal(ui.commentChipTarget({ lessonId: "l1" }, ["l2"]).locked, false);
  assert.equal(ui.commentChipTarget({ entryId: "proton" }, ["proton"]).locked, false);
  assert.equal(ui.commentChipTarget({ entryId: "proton" }).target.href, "/explorer/encyclopedia-entry?id=proton");
  assert.equal(ui.nextTarget({ lessonId: "l1" }).href, "/lesson/l1");
  assert.deepEqual(ui.nextTarget({ unitId: "u1" }), { href: "/(tabs)", how: "tab" });
  assert.equal(ui.nextTarget({}), null);
  assert.equal(ui.blogHref("blog-the-smallest-thing"), "/blog/blog-the-smallest-thing");
});

test("a post reads as one item", () => {
  const label = ui.postSpokenLabel({ name: "Ada", title: "Atom teacher", when: "2 hours ago", text: "You finished it", reactions: "3 reactions" });
  assert.equal(label, "Ada, Atom teacher, 2 hours ago: You finished it. 3 reactions");
  assert.equal(ui.commentSpokenLabel("Mina", "A detail."), "Mina, comment: A detail.");
  assert.match(ui.blogSpokenLabel({ name: "Ada", when: "now", title: "T", hook: "H", readMin: 3, reactions: "No reactions yet" }), /^Blog piece by Ada, 3 min read/);
  assert.equal(ui.readTimeLabel(0), "1 min read");
  assert.equal(ui.readTimeLabel(3), "3 min read");
});

test("ordinals, including the teens", () => {
  const got = [1, 2, 3, 4, 8, 11, 12, 13, 21, 22, 23, 101, 111].map(ui.ordinal);
  assert.deepEqual(got, ["1st", "2nd", "3rd", "4th", "8th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
});

test("weekCaption and the Ranks lines", () => {
  assert.equal(ui.weekCaption("2026-11-16"), "Week of 16 Nov");
  assert.equal(ui.weekCaption("2026-01-05"), "Week of 5 Jan");
  assert.equal(ui.weekCaption("not a date"), "not a date");
  assert.equal(ui.weekCaption("2026-13-01"), "2026-13-01");
  assert.equal(ui.rankEntryLine(3, 40), "You are 3rd this week");
  assert.equal(ui.rankEntryLine(8, 0), "See how you compare this week");
  assert.equal(ui.xpLabel(120.4), "120 XP");
  assert.equal(ui.xpLabel(-5), "0 XP");
  assert.equal(ui.rankRowSpoken({ rank: 3, name: "Mina", xp: 120, isLearner: false }), "3rd, Mina, 120 XP");
  assert.equal(ui.rankRowSpoken({ rank: 1, name: "Sam", xp: 9, isLearner: true }), "1st, Sam, you, 9 XP");
});

test("newItemIds: nothing is new on the first load, then only the arrivals", () => {
  const items = [{ id: "c" }, { id: "b" }, { id: "a" }];
  assert.deepEqual(ui.newItemIds(null, items), []);
  assert.deepEqual(ui.newItemIds(new Set(["a", "b"]), items), ["c"]);
  assert.deepEqual(ui.newItemIds(new Set(["a", "b", "c"]), items), []);
});

test("dripPlan: first load shows all, arrivals queue oldest first, a flood shows the old ones at once", () => {
  const items = ["f", "e", "d", "c", "b", "a"].map((id) => ({ id })); // newest first
  assert.deepEqual(ui.dripPlan(null, items), { instant: ["f", "e", "d", "c", "b", "a"], queued: [] });
  assert.deepEqual(ui.dripPlan(new Set(["a", "b", "c"]), items), { instant: [], queued: ["d", "e", "f"] });
  assert.deepEqual(ui.dripPlan(new Set(["a", "b", "c", "d", "e", "f"]), items), { instant: [], queued: [] });
  assert.deepEqual(ui.dripPlan(new Set(), items, 2), { instant: ["a", "b", "c", "d"], queued: ["e", "f"] });
});

test("action phrase by kind, with the chip standing in until items carry a kind", () => {
  assert.equal(ui.actionPhrase({ kind: "milestone", learner: true }), "reached a milestone");
  assert.equal(ui.actionPhrase({ kind: "celebrate" }), "cheered you on");
  assert.equal(ui.actionPhrase({ kind: "milestone" }), "shared a milestone");
  assert.equal(ui.actionPhrase({ kind: "nudge" }), "has a nudge");
  assert.equal(ui.actionPhrase({ kind: "tease" }), "has a teaser");
  assert.equal(ui.actionPhrase({ blog: true, kind: "tease" }), "wrote a blog piece");
  assert.equal(ui.actionPhrase({ chipKind: "quests" }), "has a nudge");
  assert.equal(ui.actionPhrase({ chipKind: "unit" }), "shared a milestone");
  assert.equal(ui.actionPhrase({}), "cheered you on");
  assert.equal(ui.figurePose({ kind: "milestone" }), "proud");
  assert.equal(ui.figurePose({ chipKind: "ranks" }), "think");
  assert.equal(ui.metaLine("2h", "Atom teacher"), "2h · Atom teacher");
  assert.equal(ui.metaLine("2h", ""), "2h");
});

test("likedBy line: singular, two, and others; nothing without NPC reactors", () => {
  const text = (names, others) => ui.likedBySpoken(ui.likedBySegments(names, others));
  assert.deepEqual(ui.likedBySegments([], 0), []);
  assert.equal(text(["Mina"], 0), "");
  assert.equal(text(["Mina"], 1), "Liked by Mina");
  assert.equal(text(["Mina", "Hal"], 2), "Liked by Mina and Hal");
  assert.equal(text(["Mina", "Hal", "Ray"], 3), "Liked by Mina and 2 others");
  assert.equal(text(["Mina", "Hal", "Ray"], 7), "Liked by Mina and 6 others");
  assert.equal(text([], 1), "Liked by 1 other");
  assert.equal(text([], 4), "Liked by 4 others");
  const segs = ui.likedBySegments(["Mina", "Hal"], 2);
  assert.deepEqual(segs.filter((s) => s.bold).map((s) => s.text), ["Mina", "Hal"]);
  assert.equal(ui.likedBySegments(["Mina", "Hal", "Ray"], 5)[1].bold, true);
});

test("likedBy line leads with You when the learner reacted", () => {
  const text = (names, others) => ui.likedBySpoken(ui.likedBySegments(names, others, true));
  assert.equal(text([], 0), "Liked by You");
  assert.equal(text(["Mina"], 1), "Liked by You and Mina");
  assert.equal(text(["Mina", "Hal"], 2), "Liked by You, Mina and 1 other");
  assert.equal(text(["Mina", "Hal", "Ray"], 5), "Liked by You, Mina and 4 others");
  assert.equal(text([], 3), "Liked by You and 3 others");
  assert.deepEqual(ui.likedBySegments(["Mina"], 1, true).filter((s) => s.bold).map((s) => s.text), ["You", "Mina"]);
});

test("reaction pill label and the ranking banner lines", () => {
  assert.equal(ui.reactPillLabel(null, 0), "React");
  assert.equal(ui.reactPillLabel(null, 1), "React, 1 reaction");
  assert.equal(ui.reactPillLabel("clap", 3), "React: clap, selected, 3 reactions");
  assert.deepEqual(ui.rankBannerLines(3, 40, "Mina"), { title: "You're 3rd this week", sub: "Pass Mina to climb" });
  assert.deepEqual(ui.rankBannerLines(1, 40, null), { title: "You're 1st this week", sub: "You lead the table" });
  assert.deepEqual(ui.rankBannerLines(5, 0, "Mina"), { title: "Weekly ranking", sub: "Be the first to earn XP this week" });
  assert.equal(ui.rankBannerLines(4, 10, null).sub, "Keep going to climb");
});

test("the shortcut circles are the four the design names", () => {
  assert.deepEqual(ui.SHORTCUTS.map((s) => s.href), ["/encyclopedia", "/periodic-table", "/reacted", "/blogs"]);
  assert.deepEqual(ui.SHORTCUTS.map((s) => s.label), ["AtomDex", "Periodic table", "Reacted", "Blogs"]);
});

/* ------------------------------------------------------------------ */
/* check:feed catches a learner comment path                           */
/* ------------------------------------------------------------------ */

test("a teacher's avatar opens their profile; the learner's own opens the Profile tab", () => {
  assert.equal(ui.npcHref("npc-ada"), "/npc/npc-ada");
  assert.equal(ui.npcHref("a b"), "/npc/a%20b");
  assert.equal(ui.PROFILE_HREF, "/(tabs)/profile");
});

test("commentsLabel: a button label for blog comments, none for zero", () => {
  assert.equal(ui.commentsLabel(0), null);
  assert.equal(ui.commentsLabel(-2), null);
  assert.equal(ui.commentsLabel(Number.NaN), null);
  assert.equal(ui.commentsLabel(1), "View 1 comment");
  assert.equal(ui.commentsLabel(3), "View 3 comments");
});

import fs from "node:fs";
import os from "node:os";

const { checkFeed } = await import(pathToFileURL(path.join(REPO, "scripts/check-feed.mjs")).href);

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "check-feed-"));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

test("check:feed passes the real source", () => {
  assert.deepEqual(checkFeed(REPO).failures, []);
});

test("check:feed fails on a text input, a comment function or a comment insert", () => {
  const cases = {
    "components/feed/Box.tsx": 'import { TextInput } from "react-native";\nexport const A = () => <TextInput />;\n',
    "app/blog/[id].tsx": "export async function addComment(text: string) {}\n",
    "services/feed-extra.ts": 'await db.runAsync("INSERT INTO blog_comments (id) VALUES (?)", [id]);\n',
    "app/(tabs)/community.tsx": "const postComment = async (t: string) => {};\n",
  };
  for (const [file, text] of Object.entries(cases)) {
    const root = fixture({ [file]: text });
    const { failures } = checkFeed(root);
    assert.ok(failures.length > 0, `${file} should fail`);
    assert.match(failures[0], new RegExp(file.replace(/[()[\]]/g, "\\$&")));
  }
});

test("check:feed ignores words in comments and reading code", () => {
  const root = fixture({
    "components/feed/Ok.tsx": "// there is no comment() and no TextInput here\n/* addComment( is not a thing */\nexport const x = comments.map((comment) => comment.text);\n",
    "services/feed.ts": "const rows = await db.getAllAsync('SELECT * FROM blog_comments');\n",
  });
  assert.deepEqual(checkFeed(root).failures, []);
});
