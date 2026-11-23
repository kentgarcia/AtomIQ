import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("services/chat-core.ts")).href);
const { validateChatData, validateChat } = await import(pathToFileURL(path.resolve("scripts/lib/chat-rules.mjs")).href);
const vocab = await import(pathToFileURL(path.resolve("scripts/lib/chat-vocab.mjs")).href);

// ---- fixtures ---------------------------------------------------------------

const rep = (label, next, action) => ({ label, ...(next ? { next } : {}), ...(action ? { action } : {}) });
const n = (id, npc_id, kind, replies = [], extra = {}) => ({ id, npc_id, kind, trigger: null, title: kind === "unprompted" ? "A story" : null, text: "Hello there.", pose: "idle", replies, position: 0, ...extra });

/** A small good thread: a greeting, four more nodes, a sign-off and two unprompted messages. */
function goodNodes(npc = "npc-ada") {
  return [
    n(`${npc}-g`, npc, "greeting", [rep("Next", `${npc}-a`), rep("Quiz", `${npc}-b`), rep("Remind", `${npc}-c`), rep("Bye", `${npc}-bye`)]),
    n(`${npc}-a`, npc, "reply", [rep("Go", null, { screen: "next-lesson" }), rep("Back", `${npc}-d`)]),
    n(`${npc}-b`, npc, "reply", [rep("Play", null, { screen: "mythbuster" }), rep("Back", `${npc}-d`)]),
    n(`${npc}-c`, npc, "reply", [rep("Open", null, { screen: "entry", id: "atom" }), rep("Back", `${npc}-d`)]),
    n(`${npc}-d`, npc, "reply", [rep("Bye", `${npc}-bye`), rep("Again", `${npc}-a`)]),
    n(`${npc}-bye`, npc, "sign_off"),
    n(`${npc}-up1`, npc, "unprompted", [rep("Open", null, { screen: "app", id: "field-notes" }), rep("Thanks", `${npc}-bye`)], { trigger: "app_installed:field-notes" }),
    n(`${npc}-up2`, npc, "unprompted", [rep("Thanks", `${npc}-bye`), rep("Later", `${npc}-bye`)], { trigger: "welcome_back" }),
  ];
}
const world = (chatNodes) => ({
  npcs: [{ id: "npc-ada" }, { id: "npc-hal" }],
  units: [{ id: "u1" }],
  lessons: [{ id: "l1" }],
  nodes: [{ id: "u1-n4" }],
  entryIds: ["atom"],
  chatNodes,
});
const rules = (nodes) => validateChatData(world(nodes)).findings.map((f) => `${f.severity}:${f.rule}`);
const errors = (nodes) => validateChatData(world(nodes)).findings.filter((f) => f.severity === "error").map((f) => f.rule);

// ---- validator --------------------------------------------------------------

test("a good thread has no findings", () => {
  assert.deepEqual(rules(goodNodes()), []);
});

test("a thread needs exactly one greeting and four more nodes", () => {
  const noGreeting = goodNodes().filter((x) => x.kind !== "greeting");
  assert.ok(errors(noGreeting).includes("chat-greeting"));
  const twoGreetings = [...goodNodes(), n("again", "npc-ada", "greeting", [rep("Bye", "npc-ada-bye")])];
  assert.ok(errors(twoGreetings).includes("chat-greeting"));
  const thin = goodNodes().filter((x) => ["greeting", "reply"].includes(x.kind) && x.id !== "npc-ada-c" && x.id !== "npc-ada-d");
  assert.ok(errors(thin).includes("chat-body"));
});

test("a reply must resolve, stay with the teacher and go somewhere", () => {
  const broken = goodNodes();
  broken[1].replies = [rep("Go", "nowhere")];
  assert.ok(errors(broken).includes("chat-reply-next"));
  const other = [...goodNodes(), ...goodNodes("npc-hal")];
  other.find((x) => x.id === "npc-ada-a").replies = [rep("Go", "npc-hal-a")];
  assert.ok(errors(other).includes("chat-reply-next"));
  const goesNowhere = goodNodes();
  goesNowhere[1].replies = [rep("Go")];
  assert.ok(errors(goesNowhere).includes("chat-reply-goes"));
  const toUnprompted = goodNodes();
  toUnprompted[1].replies = [rep("Go", "npc-ada-up1")];
  assert.ok(errors(toUnprompted).includes("chat-reply-next"));
});

test("every node can be reached from the greeting or an unprompted message", () => {
  const nodes = goodNodes();
  nodes.push(n("npc-ada-lost", "npc-ada", "reply", [rep("Bye", "npc-ada-bye")]));
  const found = validateChatData(world(nodes)).findings.filter((f) => f.rule === "chat-unreachable");
  assert.deepEqual(found.map((f) => f.id), ["npc-ada-lost"]);
});

test("an unprompted message needs a real trigger, and only it has one", () => {
  const bad = (trigger) => errors(goodNodes().map((x) => (x.id === "npc-ada-up2" ? { ...x, trigger } : x)));
  assert.ok(bad(null).includes("chat-trigger"));
  assert.ok(bad("birthday").includes("chat-trigger"));
  assert.ok(bad("welcome_back:today").includes("chat-trigger"));
  assert.ok(bad("app_installed:nope").includes("chat-trigger-app"));
  assert.ok(bad("unit_complete:nope").includes("chat-trigger-unit"));
  assert.deepEqual(bad("unit_complete:u1"), []);
  const stray = goodNodes().map((x) => (x.id === "npc-ada-a" ? { ...x, trigger: "welcome_back" } : x));
  assert.ok(errors(stray).includes("chat-trigger-kind"));
  const twice = [...goodNodes(), n("npc-ada-up3", "npc-ada", "unprompted", [rep("Thanks", "npc-ada-bye")], { trigger: "welcome_back" })];
  assert.ok(errors(twice).includes("chat-trigger-twice"));
});

test("an action must point at something that exists and is built", () => {
  const withAction = (action) => errors(goodNodes().map((x) => (x.id === "npc-ada-c" ? { ...x, replies: [rep("Go", null, action), rep("Back", "npc-ada-d")] } : x)));
  assert.deepEqual(withAction({ screen: "entry", id: "atom" }), []);
  assert.ok(withAction({ screen: "entry", id: "nothing" }).includes("chat-action-id"));
  assert.ok(withAction({ screen: "entry" }).includes("chat-action"));
  assert.ok(withAction({ screen: "teleport" }).includes("chat-action"));
  assert.ok(withAction({ screen: "next-lesson", id: "x" }).includes("chat-action"));
  assert.deepEqual(withAction({ screen: "lesson", id: "l1" }), []);
  assert.deepEqual(withAction({ screen: "practice", id: "u1-n4" }), []);
  assert.ok(withAction({ screen: "practice", id: "u9-n9" }).includes("chat-action-id"));
  assert.deepEqual(withAction({ screen: "mythbuster", id: "u1" }), []);
  assert.ok(withAction({ screen: "mythbuster", id: "u9" }).includes("chat-action-id"));
  // Every catalog app is live now, so a real app id is accepted (the "not built yet" rule fires only for a planned one)
  assert.deepEqual(withAction({ screen: "app", id: "camera" }), []);
  assert.ok(withAction({ screen: "app", id: "nope" }).includes("chat-action-id"));
});

test("text and poses are checked", () => {
  const edit = (patch) => rules(goodNodes().map((x) => (x.id === "npc-ada-d" ? { ...x, ...patch } : x)));
  assert.ok(edit({ text: "" }).includes("error:chat-text"));
  assert.ok(edit({ text: "Hello {name}" }).includes("error:chat-text-braces"));
  assert.ok(edit({ text: "x".repeat(300) }).includes("warning:chat-text-length"));
  assert.ok(edit({ text: "Wow!! Great!" }).includes("warning:chat-text-shouting"));
  assert.ok(edit({ pose: "dance" }).includes("error:chat-pose"));
  assert.ok(edit({ kind: "banter" }).includes("error:chat-kind"));
});

test("a story needs a title, a count or level trigger needs a number, a reply has a type", () => {
  const edit = (id, patch) => errors(goodNodes().map((x) => (x.id === id ? { ...x, ...patch } : x)));
  assert.ok(edit("npc-ada-up2", { title: "" }).includes("chat-title"));
  assert.ok(edit("npc-ada-a", { title: "Not a story node" }).includes("chat-title-kind"));
  assert.deepEqual(edit("npc-ada-up2", { trigger: "lessons_completed:3" }), []);
  assert.ok(edit("npc-ada-up2", { trigger: "lessons_completed:0" }).includes("chat-trigger-count"));
  assert.ok(edit("npc-ada-up2", { trigger: "lessons_completed" }).includes("chat-trigger-count"));
  assert.deepEqual(edit("npc-ada-up2", { trigger: "level_reached:4" }), []);
  assert.ok(edit("npc-ada-up2", { trigger: "level_reached:1" }).includes("chat-trigger-level"));
  const withReplies = (replies) => errors(goodNodes().map((x) => (x.id === "npc-ada-d" ? { ...x, replies } : x)));
  // a sticker or a reaction may end the story; a chip may not
  assert.deepEqual(withReplies([{ label: "clap", type: "react" }, { label: "wow", type: "react" }]), []);
  assert.ok(withReplies([{ label: "Go", type: "text" }]).includes("chat-reply-goes"));
  assert.ok(withReplies([{ label: "x", type: "react" }]).includes("chat-reply-react"));
  assert.ok(withReplies([{ label: "clap", type: "emoji" }]).includes("chat-reply-sticker"));
  assert.ok(withReplies([{ label: "clap", type: "shout", next: "npc-ada-bye" }]).includes("chat-reply-type"));
});

test("a message offers at least two replies, all of one type", () => {
  const withReplies = (replies) => errors(goodNodes().map((x) => (x.id === "npc-ada-d" ? { ...x, replies } : x)));
  assert.ok(withReplies([rep("Bye", "npc-ada-bye")]).includes("chat-replies-min"));
  assert.ok(withReplies([]).includes("chat-replies-min"));
  assert.deepEqual(withReplies([{ label: "clap", type: "react" }, { label: "wow", type: "react" }]), []);
  assert.deepEqual(withReplies([{ label: "party", type: "emoji" }, { label: "star", type: "emoji" }]), []);
  assert.ok(withReplies([{ label: "clap", type: "react" }, rep("Bye", "npc-ada-bye")]).includes("chat-replies-mixed"));
  assert.ok(withReplies([{ label: "clap", type: "react" }]).includes("chat-replies-min"));
  assert.ok(withReplies([{ label: "party", type: "emoji" }, { label: "wow", type: "react" }]).includes("chat-replies-mixed"));
  // a sign-off has none
  assert.ok(!errors(goodNodes()).includes("chat-replies-min"));
});

test("the seeded database passes", () => {
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const result = validateChat(db);
  assert.deepEqual(result.findings.filter((f) => f.severity === "error"), []);
  assert.ok(result.checked.chat_nodes >= 20);
  // every teacher with nodes has a greeting, four more nodes and an unprompted way in
  const rows = db.prepare("SELECT npc_id, kind FROM chat_nodes").all();
  for (const npc of new Set(rows.map((r) => r.npc_id))) {
    const mine = rows.filter((r) => r.npc_id === npc);
    assert.equal(mine.filter((r) => r.kind === "greeting").length, 1, npc);
    assert.ok(mine.filter((r) => r.kind === "reply" || r.kind === "sign_off").length >= 4, npc);
  }
});

test("a trigger parses, and the welcome-back days match the Feed's comeback", async () => {
  assert.deepEqual(vocab.parseTrigger("app_installed:library"), { kind: "app_installed", argument: "library" });
  assert.deepEqual(vocab.parseTrigger("welcome_back"), { kind: "welcome_back", argument: null });
  assert.equal(vocab.parseTrigger("nope"), null);
  const feed = await import(pathToFileURL(path.resolve("scripts/lib/feed-vocab.mjs")).href);
  assert.equal(vocab.WELCOME_BACK_MIN_DAYS, feed.COMEBACK_MIN_DAYS);
  assert.equal(core.WELCOME_BACK_MIN_DAYS, feed.COMEBACK_MIN_DAYS);
});

// ---- the thread rules --------------------------------------------------------

const toNodes = (rows) => rows.map((r) => ({ id: r.id, npcId: r.npc_id, kind: r.kind, trigger: r.trigger, title: r.title ?? null, text: r.text, pose: r.pose, replies: r.replies, position: r.position }));
const nodes = toNodes([...goodNodes("npc-ada"), ...goodNodes("npc-hal")]);
const msg = (over) => ({ id: "m", threadId: "t1", nodeId: null, sender: "npc:npc-ada", text: "t", kind: "text", targetId: null, at: 0, read: true, ...over });

test("the greeting and the threads are found", () => {
  assert.equal(core.greetingOf(nodes, "npc-ada").id, "npc-ada-g");
  assert.equal(core.greetingOf(nodes, "npc-zed"), null);
  assert.deepEqual(core.threadNpcIds(nodes), ["npc-ada", "npc-hal"]);
  assert.equal(core.hasThread(nodes, "npc-hal"), true);
});

test("a tapped reply leads to the next node, an action, or both", () => {
  const g = core.greetingOf(nodes, "npc-ada");
  assert.equal(core.replyStep(nodes, g, 0).next.id, "npc-ada-a");
  const a = nodes.find((x) => x.id === "npc-ada-a");
  assert.deepEqual(core.replyStep(nodes, a, 0), { next: null, action: { screen: "next-lesson" }, ends: false });
  assert.equal(core.replyStep(nodes, g, 9), null);
  // a reply that points at a node that is not there leads nowhere instead of throwing
  const broken = { ...g, replies: [{ label: "x", next: "ghost" }] };
  assert.deepEqual(core.replyStep(nodes, broken, 0), { next: null, action: null, ends: false });
  // and never into another teacher's node or an unprompted one
  assert.equal(core.replyStep(nodes, { ...g, replies: [{ label: "x", next: "npc-hal-a" }] }, 0).next, null);
  assert.equal(core.replyStep(nodes, { ...g, replies: [{ label: "x", next: "npc-ada-up1" }] }, 0).next, null);
});

test("the pills are the last node's replies; a sign-off ends the thread", () => {
  const g = core.greetingOf(nodes, "npc-ada");
  assert.equal(core.pillsOf(g).length, 4);
  const bye = nodes.find((x) => x.id === "npc-ada-bye");
  assert.deepEqual(core.pillsOf(bye), []);
  assert.equal(core.isEnded(bye), true);
  assert.equal(core.isEnded(g), false);
  assert.equal(core.isEnded(null), false);
  assert.deepEqual(core.pillsOf(null), []);
});

test("the current node is the teacher's last message", () => {
  const history = [msg({ id: "1", nodeId: "npc-ada-g", at: 1 }), msg({ id: "2", sender: "me", text: "Next", at: 2 }), msg({ id: "3", nodeId: "npc-ada-a", at: 3 })];
  assert.equal(core.currentNode(nodes, history).id, "npc-ada-a");
  assert.equal(core.currentNode(nodes, history.slice(0, 2)).id, "npc-ada-g");
  assert.equal(core.currentNode(nodes, []), null);
  assert.equal(core.currentNode(nodes, [msg({ nodeId: "gone" })]), null);
});

test("a thread whose node was retired is stuck and gets ended; a healthy one is left alone", () => {
  const t = { ended: false };
  const healthy = [msg({ id: "1", nodeId: "npc-ada-g", at: 1 })];
  assert.equal(core.isStuck(nodes, t, healthy), false);
  assert.equal(core.isStuck(nodes, t, []), false, "nothing said yet: nothing to heal");
  assert.equal(core.isStuck(nodes, t, [msg({ id: "1", nodeId: "retired-node", at: 1 })]), true);
  assert.equal(core.isStuck(nodes, { ended: true }, [msg({ id: "1", nodeId: "retired-node", at: 1 })]), false, "already ended");
  // the learner's own message after the teacher's does not hide it
  assert.equal(core.isStuck(nodes, t, [msg({ id: "1", nodeId: "retired-node", at: 1 }), msg({ id: "2", sender: "me", text: "Hi", at: 2 })]), true);
  // a sign-off is a normal ending, not a stuck thread
  assert.equal(core.isStuck(nodes, t, [msg({ id: "1", nodeId: "npc-ada-bye", at: 1 })]), false);
});

test("a node whose every reply points at a missing node is stuck; one working reply or a link is enough", () => {
  const g = core.greetingOf(nodes, "npc-ada");
  const say = [msg({ id: "1", nodeId: "x", at: 1 })];
  const dead = [{ ...g, id: "x", replies: [{ label: "a", next: "gone-1" }, { label: "b", next: "gone-2" }] }];
  assert.equal(core.isStuck([...nodes, ...dead], { ended: false }, say), true);
  const oneWorks = [{ ...g, id: "x", replies: [{ label: "a", next: "gone-1" }, { label: "b", next: "npc-ada-a" }] }];
  assert.equal(core.isStuck([...nodes, ...oneWorks], { ended: false }, say), false);
  const link = [{ ...g, id: "x", replies: [{ label: "a", next: "gone-1" }, { label: "b", action: { screen: "next-lesson" } }] }];
  assert.equal(core.isStuck([...nodes, ...link], { ended: false }, say), false);
});

test("a tapped reply that leads nowhere ends the story; replay needs the entry node", () => {
  const g = core.greetingOf(nodes, "npc-ada");
  const broken = { ...g, replies: [{ label: "x", next: "gone" }, { label: "y", next: "npc-ada-a" }, { label: "z", action: { screen: "next-lesson" } }] };
  assert.equal(core.storyEnds(core.replyStep(nodes, broken, 0)), true);
  assert.equal(core.storyEnds(core.replyStep(nodes, broken, 1)), false);
  assert.equal(core.storyEnds(core.replyStep(nodes, broken, 2)), false, "an action opens a page");
  assert.equal(core.canReplay(nodes, { entryNodeId: "npc-ada-g" }), true);
  assert.equal(core.canReplay(nodes, { entryNodeId: "retired-node" }), false);
});

// ---- threads, the list and replies ---------------------------------------------------------

const thread = (over = {}) => ({ id: "t1", npcId: "npc-ada", entryNodeId: "npc-ada-g", title: "Chat", origin: "free", event: null, ended: false, plays: 1, rewardClaimed: false, createdAt: 1, updatedAt: 1, ...over });

test("a reply's type and whether it ends the story", () => {
  const withReplies = { ...nodes.find((x) => x.id === "npc-ada-d"), replies: [{ label: "clap", type: "react" }, { label: "party", type: "emoji" }, { label: "Bye", next: "npc-ada-bye" }] };
  assert.deepEqual(withReplies.replies.map(core.replyTypeOf), ["react", "emoji", "text"]);
  assert.equal(core.replyStep(nodes, withReplies, 0).ends, true);
  assert.equal(core.replyStep(nodes, withReplies, 1).ends, true);
  assert.deepEqual(core.replyStep(nodes, withReplies, 2).next.id, "npc-ada-bye");
  assert.equal(core.replyStep(nodes, withReplies, 2).ends, false);
  // an action does not end it (the learner comes back to the same replies)
  assert.equal(core.replyStep(nodes, nodes.find((x) => x.id === "npc-ada-a"), 0).ends, false);
});

test("reactions attach to messages, and the list reads them", () => {
  const ms = [msg({ id: "a", kind: "text" }), msg({ id: "r", sender: "me", text: "wow", kind: "react", targetId: "a" }), msg({ id: "r2", sender: "me", text: "clap", kind: "react", targetId: "a" })];
  assert.equal(core.reactionsOf(ms).get("a"), "clap");
  assert.equal(core.lastLine(ms[1]), "You reacted: Wow");
  assert.equal(core.lastLine(msg({ sender: "me", text: "mind-blown", kind: "emoji" })), "You sent a sticker: Mind blown");
  assert.equal(core.lastLine(msg({ text: "hello" })), "hello");
});

test("the list has a row per thread, most recent first, with the last line and the unread count", () => {
  const threads = [thread({ id: "t1" }), thread({ id: "t2", npcId: "npc-hal", title: "A story", origin: "event", event: "lessons_completed:3", updatedAt: 5 }), thread({ id: "t3", npcId: "npc-ada", createdAt: 3, updatedAt: 3 })];
  const all = [
    msg({ id: "1", threadId: "t1", text: "Hi", at: 10, read: false }),
    msg({ id: "2", threadId: "t1", text: "Next", sender: "me", at: 20 }),
    msg({ id: "3", threadId: "t2", sender: "npc:npc-hal", text: "Hello", at: 15, read: false }),
    msg({ id: "4", threadId: "t2", sender: "npc:npc-hal", text: "Again", at: 16, read: false }),
  ];
  const rows = core.summarizeThreads(threads, all);
  assert.deepEqual(rows.map((r) => r.threadId), ["t1", "t2", "t3"]);
  assert.equal(rows[0].last, "Next");
  assert.equal(rows[0].lastFromMe, true);
  assert.equal(rows[0].unread, 1);
  assert.equal(rows[1].unread, 2);
  assert.equal(rows[1].title, "A story");
  assert.deepEqual([rows[2].last, rows[2].lastAt, rows[2].unread], [null, null, 0]);
  // two threads with the same teacher stay two rows
  assert.equal(rows.filter((r) => r.npcId === "npc-ada").length, 2);
  assert.equal(core.totalUnread(all), 3);
});

// ---- story threads: what unlocks them ----------------------------------------------------

const noon = (day) => new Date(2026, 10, day, 12, 0, 0).getTime();
const base = (over = {}) => ({
  unitsCompleted: [],
  installedApps: [],
  startApps: ["chats", "contacts", "atomdex", "daily-fact", "settings"],
  lessonsCompleted: 0,
  level: 1,
  today: "2026-11-20",
  returnedOn: null,
  ...over,
});
const storyNodes = toNodes([
  ...goodNodes("npc-ada"),
  ...goodNodes("npc-hal"),
  n("npc-ada-up3", "npc-ada", "unprompted", [rep("Thanks", "npc-ada-bye")], { trigger: "lessons_completed:3" }),
  n("npc-ada-up4", "npc-ada", "unprompted", [rep("Thanks", "npc-ada-bye")], { trigger: "level_reached:4" }),
  n("npc-ada-up5", "npc-ada", "unprompted", [rep("Thanks", "npc-ada-bye")], { trigger: "unit_complete:u1" }),
]);

test("a trigger is earned from the learner's state, and gives the key that stops a repeat", () => {
  assert.equal(core.earnedEvent("lessons_completed:3", base({ lessonsCompleted: 2 })), null);
  assert.equal(core.earnedEvent("lessons_completed:3", base({ lessonsCompleted: 5 })), "lessons_completed:3");
  assert.equal(core.earnedEvent("level_reached:4", base({ level: 3 })), null);
  assert.equal(core.earnedEvent("level_reached:4", base({ level: 4 })), "level_reached:4");
  assert.equal(core.earnedEvent("unit_complete:u1", base({ unitsCompleted: ["u1"] })), "unit_complete:u1");
  assert.equal(core.earnedEvent("unit_complete:u1", base()), null);
  assert.equal(core.earnedEvent("app_installed:field-notes", base({ installedApps: ["field-notes"] })), "app_installed:field-notes");
  // a starting app is not news
  assert.equal(core.earnedEvent("app_installed:chats", base({ installedApps: ["chats"] })), null);
  assert.equal(core.earnedEvent("welcome_back", base({ returnedOn: "2026-11-19" })), null);
  assert.equal(core.earnedEvent("welcome_back", base({ returnedOn: "2026-11-20" })), "welcome_back:2026-11-20");
  assert.equal(core.earnedEvent(null, base()), null);
  assert.equal(core.earnedEvent("nonsense", base()), null);
  assert.equal(core.earnedEvent("lessons_completed:0", base({ lessonsCompleted: 0 })), null);
});

test("every earned story is unlocked at once, from a teacher in Contacts, once", () => {
  const input = base({ lessonsCompleted: 4, level: 4, unitsCompleted: ["u1"], installedApps: ["field-notes"], returnedOn: "2026-11-20" });
  const got = core.earnedStories(storyNodes, input, ["npc-ada"], []);
  assert.deepEqual(got.map((u) => u.event), ["welcome_back:2026-11-20", "unit_complete:u1", "lessons_completed:3", "level_reached:4", "app_installed:field-notes"]);
  // not from a teacher who is not in Contacts
  assert.deepEqual(core.earnedStories(storyNodes, input, [], []), []);
  assert.deepEqual([...new Set(core.earnedStories(storyNodes, input, ["npc-hal"], []).map((u) => u.node.npcId))], ["npc-hal"]);
  // a story that already has a thread (even an ended or replayed one) is not unlocked again; the others still are
  const threads = [thread({ id: "x", origin: "event", event: "lessons_completed:3", entryNodeId: "npc-ada-up3", ended: true, plays: 3 })];
  assert.ok(!core.earnedStories(storyNodes, input, ["npc-ada"], threads).some((u) => u.event === "lessons_completed:3"));
  assert.equal(core.earnedStories(storyNodes, input, ["npc-ada"], threads).length, 4);
  // nothing earned: nothing unlocked
  assert.deepEqual(core.earnedStories(storyNodes, base(), ["npc-ada"], []), []);
  // the welcome-back story belongs to its day: it can come again on another return
  const old = [thread({ origin: "event", event: "welcome_back:2026-11-10", entryNodeId: "npc-ada-up2" })];
  assert.ok(core.earnedStories(storyNodes, base({ returnedOn: "2026-11-20" }), ["npc-ada"], old).some((u) => u.event === "welcome_back:2026-11-20"));
});

// ---- a teacher's profile: every story, unlocked or not ---------------------------------------

const labels = { unitTitleOf: (id) => ({ u1: "Inside the Atom" })[id], appNameOf: (id) => ({ "field-notes": "Field Notes" })[id] };
const stories = (input, contacts, threads = [], messages = [], npc = "npc-ada", unit = "Radioactivity") =>
  core.storyList(storyNodes, npc, input, contacts, core.summarizeThreads(threads, messages), labels, unit);

test("a trigger says what it asks of the learner, and how far they are", () => {
  const input = base({ lessonsCompleted: 2, level: 3 });
  assert.deepEqual(core.storyCondition("lessons_completed:3", input, labels), { text: "Finish 3 lessons.", progress: "2 of 3 lessons finished" });
  assert.equal(core.storyCondition("lessons_completed:1", input, labels).text, "Finish your first lesson.");
  assert.deepEqual(core.storyCondition("level_reached:4", input, labels), { text: "Reach level 4.", progress: "You are level 3" });
  assert.equal(core.storyCondition("unit_complete:u1", input, labels).text, 'Finish the unit "Inside the Atom".');
  assert.equal(core.storyCondition("unit_complete:nope", input, labels).text, "Finish a certain unit.");
  assert.equal(core.storyCondition("app_installed:field-notes", input, labels).text, "Get the Field Notes app on your phone.");
  assert.match(core.storyCondition("welcome_back", input, labels).text, /Come back after 3 days/);
  // the count never goes past the goal
  assert.equal(core.storyCondition("lessons_completed:3", base({ lessonsCompleted: 9 }), labels).progress, "3 of 3 lessons finished");
});

test("the profile lists every story of the teacher: locked ones with their condition, in the order written", () => {
  const got = stories(base({ lessonsCompleted: 1 }), true);
  assert.deepEqual(got.map((e) => e.nodeId), ["npc-ada-up1", "npc-ada-up2", "npc-ada-up3", "npc-ada-up4", "npc-ada-up5"]);
  assert.ok(got.every((e) => e.state === "locked" && e.threadId === null && e.event === null));
  assert.equal(got.find((e) => e.nodeId === "npc-ada-up3").condition, "Finish 3 lessons.");
  assert.equal(got.find((e) => e.nodeId === "npc-ada-up4").progress, "You are level 1");
  // another teacher's stories are not listed
  assert.ok(stories(base(), true, [], [], "npc-hal").every((e) => e.npcId === "npc-hal"));
  assert.deepEqual(stories(base(), true, [], [], "npc-nobody"), []);
});

test("an earned story with no thread is ready to start, with the key its thread will carry", () => {
  const got = stories(base({ lessonsCompleted: 4 }), true);
  const up3 = got.find((e) => e.nodeId === "npc-ada-up3");
  assert.deepEqual([up3.state, up3.event], ["ready", "lessons_completed:3"]);
  assert.equal(got.find((e) => e.nodeId === "npc-ada-up4").state, "locked");
  // it is not ready for a teacher who is not in Contacts yet: they ask for a lesson of their unit first
  const away = stories(base({ lessonsCompleted: 4 }), false);
  assert.ok(away.every((e) => e.state === "locked"));
  assert.equal(away[0].condition, 'Finish a lesson in "Radioactivity" first.');
  assert.equal(away[0].progress, null);
});

test("a story with a thread is new, playing or finished, found by the node it opens at, and keeps its play count", () => {
  const threads = [
    thread({ id: "a", origin: "event", event: "lessons_completed:3", entryNodeId: "npc-ada-up3" }),
    thread({ id: "b", origin: "event", event: "level_reached:4", entryNodeId: "npc-ada-up4", ended: true, plays: 3 }),
    thread({ id: "c", origin: "event", event: "unit_complete:u1", entryNodeId: "npc-ada-up5" }),
    thread({ id: "free" }),
  ];
  const messages = [msg({ id: "1", threadId: "a", read: false }), msg({ id: "2", threadId: "b", at: 9 }), msg({ id: "3", threadId: "c", at: 5 })];
  const got = Object.fromEntries(stories(base({ lessonsCompleted: 4, level: 4, unitsCompleted: ["u1"] }), true, threads, messages).map((e) => [e.nodeId, e]));
  assert.deepEqual([got["npc-ada-up3"].state, got["npc-ada-up3"].threadId], ["new", "a"]);
  assert.deepEqual([got["npc-ada-up4"].state, got["npc-ada-up4"].plays, got["npc-ada-up4"].lastAt], ["finished", 3, 9]);
  assert.equal(got["npc-ada-up5"].state, "playing");
  // a story that was unlocked stays open when the learner no longer meets the trigger (a thread is never taken back)
  assert.equal(stories(base(), true, threads, messages).find((e) => e.nodeId === "npc-ada-up3").state, "new");
  // a story is ready only once per key: another story with the same key is not offered when one already has its thread
  assert.equal(stories(base({ lessonsCompleted: 4 }), true, [threads[0]], messages).find((e) => e.nodeId === "npc-ada-up3").state, "new");
});

test("Shrodi's stories are listed like a teacher's, and he needs no unit", () => {
  const nodes = toNodes([n("shrodi-up", "shrodi", "unprompted", [rep("Thanks", "shrodi-bye")], { trigger: "lessons_completed:1" }), n("shrodi-bye", "shrodi", "sign_off")]);
  const got = core.storyList(nodes, "shrodi", base(), true, [], labels);
  assert.deepEqual(got.map((e) => [e.nodeId, e.state, e.condition]), [["shrodi-up", "locked", "Finish your first lesson."]]);
});

// ---- bubbles, unread letters and the pictures ---------------------------------------------

test("a long message is split into bubbles at a blank line", () => {
  assert.deepEqual(core.splitParts("One.\n\nTwo.\n\n\n  Three. "), ["One.", "Two.", "Three."]);
  assert.deepEqual(core.splitParts("Just one line.\nStill the same bubble."), ["Just one line.\nStill the same bubble."]);
  assert.deepEqual(core.splitParts("   "), [""]);
});

test("the bubbles of one message are one unread letter", () => {
  const ms = [
    msg({ id: "1", threadId: "t1", nodeId: "n1", read: false }),
    msg({ id: "2", threadId: "t1", nodeId: "n1", read: false }),
    msg({ id: "3", threadId: "t1", nodeId: "n1", read: false }),
    msg({ id: "4", threadId: "t2", nodeId: "n1", read: false }),
    msg({ id: "5", threadId: "t1", nodeId: "n2", read: false }),
    msg({ id: "6", threadId: "t1", sender: "me", read: false }),
  ];
  assert.equal(core.unreadLetters(ms), 3);
  assert.equal(core.unreadLetters(ms, "t1"), 2);
  assert.equal(core.totalUnread(ms), 3);
});

test("tour pictures: the markers are read whole, the content vocabulary lists the same ids, every scene is drawn in its frame", async () => {
  const tour = await import(pathToFileURL(path.resolve("components/phone/tour-art.ts")).href);
  const vocab = await import(pathToFileURL(path.resolve("scripts/lib/chat-vocab.mjs")).href);
  assert.deepEqual([...tour.TOUR_PICTURE_IDS], vocab.CHAT_PICTURES);
  for (const id of tour.TOUR_PICTURE_IDS) {
    assert.ok(tour.tourArt(id)?.length > 5, `${id} has a picture`);
    assert.ok(tour.tourArtName(id) !== id, `${id} has a name`);
    assert.equal(core.pictureOf(`[[pic:${id}]]`), id);
    for (const sh of tour.tourArt(id)) {
      const box = sh.t === "rect" ? [sh.x, sh.y, sh.x + sh.w, sh.y + sh.h] : sh.t === "circle" ? [sh.cx - sh.r, sh.cy - sh.r, sh.cx + sh.r, sh.cy + sh.r] : null;
      if (box) assert.ok(box[0] >= -1 && box[1] >= -1 && box[2] <= 201 && box[3] <= 121, `${id} stays in its frame`);
    }
  }
  assert.equal(core.pictureOf("  [[pic:tour-map]]  "), "tour-map");
  assert.equal(core.pictureOf("[[pic:nope]]"), null, "an unknown id is plain text");
  assert.equal(core.pictureOf("See [[pic:tour-map]]"), null, "a marker inside a sentence is plain text");
  const msg = { id: "m", threadId: "t", nodeId: "n", sender: "npc:shrodi", text: "[[pic:tour-map]]", kind: "text", targetId: null, at: 1, read: true };
  assert.match(core.lastLine(msg), /picture/i);
});

test("the content rules read picture markers: a good one passes, a typo, an unknown id and an opening picture are errors", () => {
  const pic = (text) => goodNodes().map((x) => (x.id === "npc-ada-a" ? { ...x, text } : x));
  const bad = (text) => errors(pic(text)).filter((r) => r.startsWith("chat-picture"));
  assert.deepEqual(bad("Hello.\n\n[[pic:tour-map]]"), []);
  assert.deepEqual(bad("Hello.\n\n[[pic:nope]]"), ["chat-picture-id"]);
  assert.deepEqual(bad("Hello.\n\n[[pic: tour-map]]"), ["chat-picture-marker"]);
  assert.deepEqual(bad("[[pic:tour-map]]\n\nHello."), ["chat-picture-first"]);
});

test("system lines: read whole, shown as their text in the list, and rationed by the content rules", async () => {
  const vocab = await import(pathToFileURL(path.resolve("scripts/lib/chat-vocab.mjs")).href);
  assert.equal(core.systemOf("[[sys:Ada got disconnected.]]"), "Ada got disconnected.");
  assert.equal(core.systemOf("  [[sys:Ada is back.]]  "), "Ada is back.");
  assert.equal(core.systemOf("[[sys:]]"), null, "an empty line is plain text");
  assert.equal(core.systemOf("Ada [[sys:got disconnected.]]"), null, "a marker inside a sentence is plain text");
  assert.equal(core.systemOf("[[pic:tour-map]]"), null);
  // the app and the content rules read the same marker
  for (const text of ["[[sys:Ada got disconnected.]]", "[[sys:a]]", "[[sys:]]", "[[sys:a [b] c]]", "hi [[sys:x]]"]) {
    assert.equal(vocab.CHAT_SYSTEM_RE.test(text), core.systemOf(text) !== null, text);
  }
  const msg = { id: "m", threadId: "t", nodeId: "n", sender: "npc:npc-ada", text: "[[sys:Ada got disconnected.]]", kind: "text", targetId: null, at: 1, read: true };
  assert.equal(core.lastLine(msg), "Ada got disconnected.");

  const sys = (text) => goodNodes().map((x) => (x.id === "npc-ada-a" ? { ...x, text } : x));
  const bad = (text) => errors(sys(text)).filter((r) => r.startsWith("chat-system"));
  assert.deepEqual(bad("Hello.\n\n[[sys:Ada got disconnected.]]\n\n[[sys:Ada is back.]]\n\nSorry."), []);
  assert.deepEqual(bad("Hello.\n\n[[sys: ]]"), ["chat-system-marker"]);
  assert.deepEqual(bad("Hello.\n\nAda [[sys:got disconnected.]]"), ["chat-system-marker"]);
  assert.deepEqual(bad("[[sys:Ada got disconnected.]]"), ["chat-system-only"]);
  // rare on purpose: a long line, and more than a few for one teacher, are warned about
  const warnings = (nodes) => validateChatData(world(nodes)).findings.filter((f) => f.severity === "warning").map((f) => f.rule);
  assert.ok(warnings(sys(`Hello.\n\n[[sys:${"x".repeat(60)}]]`)).includes("chat-system-length"));
  const many = "Hello.\n\n" + Array.from({ length: 4 }, (_, i) => `[[sys:Line ${i}.]]`).join("\n\n");
  assert.ok(warnings(sys(many)).includes("chat-system-overuse"));
});

test("the reactions and stickers are drawn, named, and the content vocabulary lists the same ids", async () => {
  const art = await import(pathToFileURL(path.resolve("components/phone/chat-art.ts")).href);
  const vocab = await import(pathToFileURL(path.resolve("scripts/lib/chat-vocab.mjs")).href);
  assert.deepEqual([...art.CHAT_REACTION_IDS], vocab.CHAT_REACTIONS);
  assert.deepEqual([...art.CHAT_STICKER_IDS], vocab.CHAT_STICKERS);
  for (const id of [...art.CHAT_REACTION_IDS, ...art.CHAT_STICKER_IDS]) {
    assert.ok(art.chatArt(id)?.length > 0, `${id} has a picture`);
    assert.ok(art.CHAT_ART_NAMES[id], `${id} has a name`);
    for (const sh of art.chatArt(id)) {
      const box = sh.t === "rect" ? [sh.x, sh.y, sh.x + sh.w, sh.y + sh.h] : sh.t === "circle" ? [sh.cx - sh.r, sh.cy - sh.r, sh.cx + sh.r, sh.cy + sh.r] : null;
      if (box) assert.ok(box.every((n) => n >= -1 && n <= 101), `${id} stays in its frame`);
    }
  }
  assert.equal(art.chatArt("nope"), null);
});

// ---- the SQL ---------------------------------------------------------------------

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE chat_threads (id TEXT PRIMARY KEY, npc_id TEXT NOT NULL, entry_node_id TEXT NOT NULL, title TEXT NOT NULL, origin TEXT NOT NULL DEFAULT 'free', event TEXT,
    ended INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0, plays INTEGER NOT NULL DEFAULT 1, reward_claimed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, synced_at INTEGER,
    is_dirty INTEGER DEFAULT 1, deleted_at INTEGER, version INTEGER DEFAULT 1)`);
  db.exec(`CREATE TABLE chat_messages (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, node_id TEXT, sender TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'text', target_id TEXT,
    at INTEGER NOT NULL, "read" INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0, synced_at INTEGER, is_dirty INTEGER DEFAULT 1,
    deleted_at INTEGER, version INTEGER DEFAULT 1)`);
  return {
    db,
    api: {
      async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
      async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
    },
  };
}
function store() {
  const m = memoryDb();
  let i = 0;
  return { ...core.createChatStore(() => m.api, () => `m${++i}`), raw: m.db };
}

test("threads are made, listed and found, and two with one teacher stay two", async () => {
  const s = store();
  const a = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 10);
  const b = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 20);
  const c = await s.createThread({ npcId: "npc-ada", entryNodeId: "up", title: "A story", origin: "event", event: "lessons_completed:3" }, 30);
  assert.deepEqual((await s.listThreads()).map((t) => t.id), [a.id, b.id, c.id]);
  assert.deepEqual(await s.getThread(c.id), { id: c.id, npcId: "npc-ada", entryNodeId: "up", title: "A story", origin: "event", event: "lessons_completed:3", ended: false, archived: false, plays: 1, rewardClaimed: false, createdAt: 30, updatedAt: 30 });
  assert.equal(await s.getThread("nope"), null);
});

test("messages are posted and read back in order, per thread, with their kind", async () => {
  const s = store();
  const t = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  const first = await s.post({ threadId: t.id, nodeId: "g", sender: "npc:npc-ada", text: "Hi", read: false }, 10);
  await s.post({ threadId: t.id, sender: "me", text: "wow", kind: "react", targetId: first.id }, 20);
  await s.post({ threadId: t.id, sender: "me", text: "party", kind: "emoji" }, 21);
  const got = await s.list(t.id);
  assert.deepEqual(got.map((m) => [m.text, m.kind, m.targetId, m.read]), [["Hi", "text", null, false], ["wow", "react", first.id, true], ["party", "emoji", null, true]]);
  assert.equal((await s.getThread(t.id)).updatedAt, 21);
  assert.equal((await s.listAll()).length, 3);
});

test("unread messages count across threads and clear when a thread is opened", async () => {
  const s = store();
  const a = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  const b = await s.createThread({ npcId: "npc-hal", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  await s.post({ threadId: a.id, nodeId: "g", sender: "npc:npc-ada", text: "Hi", read: false }, 1);
  await s.post({ threadId: a.id, nodeId: "a", sender: "npc:npc-ada", text: "Again", read: false }, 2);
  await s.post({ threadId: b.id, nodeId: "g", sender: "npc:npc-hal", text: "Hello", read: false }, 3);
  assert.equal(await s.unreadCount(), 3);
  assert.equal(await s.markRead(a.id, 9), 2);
  assert.equal(await s.unreadCount(), 1);
  assert.equal(await s.markRead(a.id, 10), 0);
});

test("a story ends, and a replay clears it, counts a play and keeps its unlock key", async () => {
  const s = store();
  const t = await s.createThread({ npcId: "npc-ada", entryNodeId: "up", title: "A story", origin: "event", event: "lessons_completed:3" }, 1);
  await s.post({ threadId: t.id, nodeId: "up", sender: "npc:npc-ada", text: "Hi", read: false }, 2);
  await s.post({ threadId: t.id, sender: "me", text: "clap", kind: "react" }, 3);
  await s.setEnded(t.id, true, 4);
  assert.equal((await s.getThread(t.id)).ended, true);
  await s.restart(t.id, 10);
  const again = await s.getThread(t.id);
  assert.deepEqual([again.ended, again.plays, again.event], [false, 2, "lessons_completed:3"]);
  assert.deepEqual(await s.list(t.id), []);
  assert.equal(await s.unreadCount(), 0);
  // the unlock key is still on the thread, so the story does not unlock again
  assert.deepEqual(core.earnedStories(storyNodes, base({ lessonsCompleted: 3 }), ["npc-ada"], await s.listThreads()).map((u) => u.event), []);
});

test("a story pays its diamonds once: the first claim wins, a replay and a second claim do not, a free chat never pays", async () => {
  assert.equal(core.STORY_REWARD_DIAMONDS, 5);
  const s = store();
  const story = await s.createThread({ npcId: "npc-ada", entryNodeId: "up", title: "A story", origin: "event", event: "lessons_completed:3" }, 1);
  assert.equal((await s.getThread(story.id)).rewardClaimed, false);
  assert.equal(await s.claimReward(story.id, 5), true);
  assert.equal((await s.getThread(story.id)).rewardClaimed, true);
  assert.equal(await s.claimReward(story.id, 6), false, "a second claim pays nothing");
  // replaying keeps the claim
  await s.setEnded(story.id, true, 7);
  await s.restart(story.id, 8);
  assert.equal((await s.getThread(story.id)).rewardClaimed, true);
  assert.equal(await s.claimReward(story.id, 9), false, "a replay pays nothing");
  // a free chat is not a story
  const free = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  assert.equal(await s.claimReward(free.id, 5), false);
  assert.equal((await s.getThread(free.id)).rewardClaimed, false);
  // paying failed: the claim is put back so the next open tries again
  const other = await s.createThread({ npcId: "npc-hal", entryNodeId: "up", title: "A story", origin: "event", event: "welcome_back:d" }, 1);
  assert.equal(await s.claimReward(other.id, 5), true);
  await s.unclaimReward(other.id);
  assert.equal(await s.claimReward(other.id, 6), true);
  assert.equal(await s.claimReward("nope", 6), false);
});

test("the profile's story list and the Chats list carry whether the diamonds were claimed", () => {
  const threads = [
    thread({ id: "a", origin: "event", event: "lessons_completed:3", entryNodeId: "npc-ada-up3", rewardClaimed: true }),
    thread({ id: "c", origin: "event", event: "unit_complete:u1", entryNodeId: "npc-ada-up5" }),
  ];
  const got = Object.fromEntries(stories(base({ lessonsCompleted: 4, unitsCompleted: ["u1"] }), true, threads, []).map((e) => [e.nodeId, e.rewardClaimed]));
  assert.equal(got["npc-ada-up3"], true);
  assert.equal(got["npc-ada-up5"], false);
  assert.equal(got["npc-ada-up4"], false, "a story with no thread has not paid");
  assert.deepEqual(core.summarizeThreads(threads, []).map((t) => [t.threadId, t.rewardClaimed]).sort(), [["a", true], ["c", false]]);
});

test("a thread keeps its last 200 messages and another thread is not touched by the cap", async () => {
  const s = store();
  const a = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  const b = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  await s.post({ threadId: a.id, sender: "me", text: "keep" }, 1);
  for (let i = 0; i < core.MAX_MESSAGES_PER_THREAD + 25; i++) await s.post({ threadId: b.id, sender: "me", text: `m${i}` }, 10 + i);
  const all = await s.list(b.id);
  assert.equal(all.length, core.MAX_MESSAGES_PER_THREAD);
  assert.equal(all.at(-1).text, `m${core.MAX_MESSAGES_PER_THREAD + 24}`);
  assert.ok(!all.some((m) => m.text === "m0"));
  assert.equal((await s.list(a.id)).length, 1);
});

test("the bubbles of one node count once in the unread total, and the unread ids come in order", async () => {
  const s = store();
  const t = await s.createThread({ npcId: "npc-ada", entryNodeId: "up", title: "A story", origin: "event", event: "lessons_completed:3" }, 1);
  const a = await s.post({ threadId: t.id, nodeId: "up", sender: "npc:npc-ada", text: "One", read: false }, 2);
  const b = await s.post({ threadId: t.id, nodeId: "up", sender: "npc:npc-ada", text: "Two", read: false }, 3);
  const c = await s.post({ threadId: t.id, nodeId: "up", sender: "npc:npc-ada", text: "Three", read: false }, 4);
  assert.equal(await s.unreadCount(), 1);
  assert.deepEqual(await s.unreadIds(t.id), [a.id, b.id, c.id]);
  await s.markRead(t.id, 9);
  assert.deepEqual(await s.unreadIds(t.id), []);
});

test("a link only opens a page: it is not a reply, needs a real reply beside it, and is a text button", () => {
  const withReplies = (replies) => errors(goodNodes().map((x) => (x.id === "npc-ada-d" ? { ...x, replies } : x)));
  const link = rep("Open it", null, { screen: "entry", id: "atom" });
  assert.ok(core.isLinkReply(link));
  assert.ok(!core.isLinkReply(rep("Go", "npc-ada-bye", { screen: "entry", id: "atom" })), "an action that also leads on is a reply");
  assert.ok(!core.isLinkReply(rep("Bye", "npc-ada-bye")));
  // a link beside one real reply is fine, and it does not count toward the one-type rule
  assert.deepEqual(withReplies([link, rep("Bye", "npc-ada-bye")]), []);
  assert.deepEqual(withReplies([link, { label: "clap", type: "react", next: "npc-ada-bye" }, { label: "wow", type: "react" }]), []);
  // only links is a dead end
  assert.ok(withReplies([link, rep("Other", null, { screen: "next-lesson" })]).includes("chat-replies-links-only"));
  // a link is never a sticker or a reaction
  assert.ok(withReplies([{ ...link, type: "emoji" }, rep("Bye", "npc-ada-bye")]).includes("chat-link-type"));
  // what it looks like
  assert.deepEqual(core.linkInfo({ screen: "entry", id: "atom" }), { icon: "Book1", caption: "Opens AtomDex" });
  for (const screen of ["next-lesson", "lesson", "practice", "entry", "mythbuster", "app"]) {
    const info = core.linkInfo({ screen, id: "x" });
    assert.ok(info.icon && info.caption);
  }
});

test("a thread is archived and brought back; archived threads leave the unread total, messages stay", async () => {
  const s = store();
  const a = await s.createThread({ npcId: "npc-ada", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  const b = await s.createThread({ npcId: "npc-hal", entryNodeId: "g", title: "Chat", origin: "free" }, 1);
  await s.post({ threadId: a.id, nodeId: "g", sender: "npc:npc-ada", text: "Hi", read: false }, 1);
  await s.post({ threadId: b.id, nodeId: "g", sender: "npc:npc-hal", text: "Hello", read: false }, 2);
  assert.equal(await s.unreadCount(), 2);
  await s.setArchived(a.id, true, 5);
  assert.equal((await s.getThread(a.id)).archived, true);
  assert.equal((await s.getThread(b.id)).archived, false);
  assert.equal(await s.unreadCount(), 1, "an archived thread's unread messages do not count");
  assert.equal((await s.list(a.id)).length, 1, "its messages are kept");
  const rows = core.summarizeThreads(await s.listThreads(), await s.listAll());
  assert.deepEqual(rows.map((r) => [r.threadId, r.archived]).sort(), [[a.id, true], [b.id, false]].sort());
  await s.setArchived(a.id, false, 6);
  assert.equal(await s.unreadCount(), 2);
});

test("Shrodi, the mascot, chats like a teacher without being in the cast", () => {
  assert.equal(core.CHAT_MASCOT_ID, vocab.CHAT_MASCOT_ID);
  // his nodes pass the same rules though "shrodi" is not a row of npcs
  assert.deepEqual(errors(goodNodes("shrodi")), []);
  assert.ok(errors(goodNodes("npc-nobody")).includes("chat-npc"));
  // and he can send a story like a teacher in Contacts
  const story = [{ id: "chat-shrodi-up", npcId: "shrodi", kind: "unprompted", trigger: "lessons_completed:1", title: "Your first lesson!", text: "Hi", pose: "idle", replies: [] }];
  const input = base({ lessonsCompleted: 1 });
  assert.deepEqual(core.earnedStories(story, input, ["shrodi"], []).map((u) => u.event), ["lessons_completed:1"]);
  assert.equal(core.earnedStories(story, input, [], []).length, 0, "only from a sender in Contacts");
});

test("a conversation's colours come from the teacher's outfit, with text that reads on it", async () => {
  const { chatPalette } = await import(pathToFileURL(path.resolve("components/phone/chat-palette.ts")).href);
  const { contrastBetween } = await import(pathToFileURL(path.resolve("components/lesson/visual/color-math.ts")).href);
  const bee = chatPalette({ color: "#FFC800", shade: "#E6A800" });
  const whale = chatPalette({ color: "#1B7FB5", shade: "#14597F" });
  assert.equal(bee.base, "#FFC800");
  assert.equal(bee.onIsLight, false, "dark ink on the yellow");
  assert.equal(whale.onIsLight, true, "white on a deep blue");
  for (const p of [bee, whale]) assert.ok(contrastBetween(p.base, p.on) >= 3);
});

test("every teacher's bubble face and link button read at 4.5:1, Tess's bright blue included", async () => {
  const { chatPalette, READABLE } = await import(pathToFileURL(path.resolve("components/phone/chat-palette.ts")).href);
  const { contrastBetween } = await import(pathToFileURL(path.resolve("components/lesson/visual/color-math.ts")).href);
  const { NPC_ROSTER } = await import(pathToFileURL(path.resolve("components/npc/npc-roster.ts")).href);
  assert.ok(NPC_ROSTER.length >= 7);
  for (const n of NPC_ROSTER) {
    const p = chatPalette(n.spec.cover ?? n.spec.outfit);
    assert.ok(contrastBetween(p.face, p.faceOn) >= READABLE, `${n.name} face ${p.face} on ${p.faceOn}`);
    assert.ok(contrastBetween(p.base, p.on) >= 3, `${n.name} header`);
  }
});
