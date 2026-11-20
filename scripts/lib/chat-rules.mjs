/**
 * NPC chat validation (docs/features/PHONE_SPEC.md §5.2, §7.1 and §7.3).
 *
 * `validateChatData` is pure (plain objects in, findings out) so tests can feed it fixtures; `validateChat` reads the
 * content database and calls it. `validateDatabase` runs it, so `npm run validate:content`, Content Studio saves and
 * the publish gate all enforce it. Findings use the shape of the other validators:
 * { table, id, field, rule, severity, message }.
 *
 * A teacher's nodes make their story threads: the greeting opens the free chat (the learner can start as many as they like),
 * and each unprompted node opens a story that a trigger unlocks (it needs a title, the thread's subject line). A reply is a text
 * chip, a sticker or a reaction; a sticker or a reaction may end the story.
 *
 * What it guarantees for a teacher who has any chat nodes: one greeting, at least four other nodes, every `next`
 * resolves to a node of the same teacher, every node can be reached from the greeting (an unprompted message is its
 * own way in), a sign-off ends the thread, every reply goes somewhere, and every action points at something real.
 */

import { PHONE_APPS } from "../../services/phone-core.ts";
import { NPC_POSES } from "../../components/npc/npc-art.ts";
import { hasExclamationRun } from "./feed-rules.mjs";
import { CHAT_ACTIONS, CHAT_KINDS, CHAT_MASCOT_ID, CHAT_LIMITS, CHAT_PICTURES, CHAT_PICTURE_RE, CHAT_MIN_BODY_NODES, CHAT_REACTIONS, CHAT_REPLY_TYPES, CHAT_STICKERS, CHAT_TITLE_MAX, CHAT_TRIGGER_KINDS, hasBraces, parseTrigger } from "./chat-vocab.mjs";

const isRec = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.trim().length > 0;

const parseJson = (raw, fallback) => {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/**
 * @typedef {Object} ChatData
 * @property {Array<{id: string}>} npcs
 * @property {Array<{id: string}>} units
 * @property {Array<{id: string}>} lessons
 * @property {Array<{id: string}>} nodes        path nodes (practice / checkpoint ids)
 * @property {Array<string>} entryIds           AtomDex entry ids
 * @property {Array<{id: string, npc_id: string, kind: string, trigger: string|null, title?: string|null, text: string, pose: string, replies: any, position: number}>} chatNodes
 */

/**
 * @param {ChatData} data
 * @returns {{ checked: Record<string, number>, findings: any[] }}
 */
export function validateChatData(data) {
  const findings = [];
  const add = (row, field, rule, severity, message) => findings.push({ table: "chat_nodes", id: row.id, field, rule, severity, message });

  // Shrodi chats like a teacher but is not in the cast
  const npcIds = new Set([...data.npcs.map((n) => n.id), CHAT_MASCOT_ID]);
  const unitIds = new Set(data.units.map((u) => u.id));
  const lessonIds = new Set(data.lessons.map((l) => l.id));
  const nodeIds = new Set((data.nodes ?? []).map((n) => n.id));
  const entryIds = new Set(data.entryIds ?? []);
  const appIds = new Set(PHONE_APPS.map((a) => a.id));
  const poses = new Set(NPC_POSES);

  const byNpc = new Map();
  const seenIds = new Set();
  for (const row of data.chatNodes) {
    if (seenIds.has(row.id)) add(row, "id", "chat-id", "error", "the id is used twice");
    seenIds.add(row.id);
    byNpc.set(row.npc_id, (byNpc.get(row.npc_id) ?? []).concat(row));
  }

  for (const row of data.chatNodes) {
    if (!npcIds.has(row.npc_id)) add(row, "npc_id", "chat-npc", "error", `the teacher "${row.npc_id}" does not exist`);
    if (!CHAT_KINDS.includes(row.kind)) add(row, "kind", "chat-kind", "error", `kind must be one of ${CHAT_KINDS.join(", ")}`);
    if (!poses.has(row.pose)) add(row, "pose", "chat-pose", "error", `the pose "${row.pose}" is not one of ${[...poses].join(", ")}`);

    const text = String(row.text ?? "").trim();
    if (!text) add(row, "text", "chat-text", "error", "the text is required");
    else {
      // A blank line splits the text into bubbles that arrive one after another
      const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      parts.forEach((p, i) => {
        if (!p.startsWith("[[pic:") && !p.includes("[[pic:")) return;
        const m = CHAT_PICTURE_RE.exec(p);
        if (!m) add(row, "text", "chat-picture-marker", "error", `a picture is a part of its own, written exactly [[pic:id]] (found: ${p.slice(0, 40)})`);
        else if (!CHAT_PICTURES.includes(m[1])) add(row, "text", "chat-picture-id", "error", `no picture "${m[1]}": use one of ${CHAT_PICTURES.join(", ")}`);
        else if (i === 0) add(row, "text", "chat-picture-first", "error", "a picture follows a bubble of text, it does not open the message");
      });
      if (parts.length > CHAT_LIMITS.parts) add(row, "text", "chat-text-parts", "warning", `a message is at most ${CHAT_LIMITS.parts} bubbles (this is ${parts.length}); split it across nodes`);
      const longest = Math.max(...parts.map((p) => p.length));
      if (longest > CHAT_LIMITS.text) add(row, "text", "chat-text-length", "warning", `a bubble fits ${CHAT_LIMITS.text} characters or fewer (the longest here is ${longest}); a blank line starts a new bubble`);
      if (hasBraces(text)) add(row, "text", "chat-text-braces", "error", "chat text is plain: nothing is filled in, so there are no {braces}");
      if (hasExclamationRun(text)) add(row, "text", "chat-text-shouting", "warning", "avoid runs of exclamation marks");
    }

    // A trigger belongs to an unprompted message, and an unprompted message needs one
    if (row.kind === "unprompted") {
      const t = parseTrigger(row.trigger);
      if (!t) add(row, "trigger", "chat-trigger", "error", `an unprompted message needs a trigger: ${Object.keys(CHAT_TRIGGER_KINDS).join(", ")} (written kind:argument)`);
      else {
        const arg = CHAT_TRIGGER_KINDS[t.kind].argument;
        if (arg === null && t.argument !== null) add(row, "trigger", "chat-trigger", "error", `"${t.kind}" takes no argument`);
        if (arg === "app" && !(t.argument && appIds.has(t.argument))) add(row, "trigger", "chat-trigger-app", "error", `"${t.argument}" is not an app of the phone`);
        if (arg === "unit" && !(t.argument && unitIds.has(t.argument))) add(row, "trigger", "chat-trigger-unit", "error", `"${t.argument}" is not a unit`);
        if (arg === "count" && !/^[1-9]\d*$/.test(t.argument ?? "")) add(row, "trigger", "chat-trigger-count", "error", `"${t.kind}" needs a whole number of lessons, 1 or more`);
        if (arg === "level" && !/^([2-9]|[1-9]\d+)$/.test(t.argument ?? "")) add(row, "trigger", "chat-trigger-level", "error", `"${t.kind}" needs a level of 2 or more`);
      }
    } else if (row.trigger) add(row, "trigger", "chat-trigger-kind", "error", "only an unprompted message has a trigger");

    // A story's first node carries the thread's subject line
    const title = String(row.title ?? "").trim();
    if (row.kind === "unprompted" && !title) add(row, "title", "chat-title", "error", "a story needs a title: it is the subject line of its thread");
    else if (title && row.kind !== "unprompted" && row.kind !== "greeting") add(row, "title", "chat-title-kind", "error", "only a story's first node (greeting or unprompted) has a title");
    if (title.length > CHAT_TITLE_MAX) add(row, "title", "chat-title-length", "warning", `a title fits ${CHAT_TITLE_MAX} characters or fewer`);

    // Replies: pills with a label, and where they go
    const replies = row.replies;
    if (!Array.isArray(replies)) {
      add(row, "replies", "chat-replies", "error", "replies must be a list");
      continue;
    }
    if (replies.length > CHAT_LIMITS.replies) add(row, "replies", "chat-replies-count", "warning", `at most ${CHAT_LIMITS.replies} replies fit under the thread`);
    if (row.kind === "sign_off" && replies.length > 0) add(row, "replies", "chat-sign-off", "warning", "a sign-off ends the thread: it has no replies");
    // Always a choice: at least two replies, all of one type (chips, or reactions, or stickers; never a mix). A reply that only opens
    // another page (an action and no next) is a link, not a reply: it is drawn as its own kind of button, sends nothing, and does not
    // count towards the type; but there must be a real reply beside it, so the conversation can go on.
    const isLink = (r) => isRec(r) && Boolean(r.action) && !r.next;
    if (row.kind !== "sign_off" && replies.length < CHAT_LIMITS.minReplies) add(row, "replies", "chat-replies-min", "error", `a message offers at least ${CHAT_LIMITS.minReplies} replies (or is a sign-off)`);
    if (replies.length > 0 && replies.every(isLink)) add(row, "replies", "chat-replies-links-only", "error", "a message needs a real reply beside its links (a link only opens another page)");
    const types = new Set(replies.filter((r) => isRec(r) && !isLink(r)).map((r) => r.type ?? "text"));
    if (types.size > 1) add(row, "replies", "chat-replies-mixed", "error", `a message's replies are all one type (text, react or emoji), not a mix of ${[...types].join(" and ")}`);
    replies.forEach((reply, i) => {
      const where = `reply ${i + 1}`;
      if (!isRec(reply)) return add(row, "replies", "chat-reply", "error", `${where} must be an object`);
      const type = reply.type ?? "text";
      if (!CHAT_REPLY_TYPES.includes(type)) add(row, "replies", "chat-reply-type", "error", `${where}'s type must be one of ${CHAT_REPLY_TYPES.join(", ")}`);
      if (!isStr(reply.label)) add(row, "replies", "chat-reply-label", "error", `${where} needs a label`);
      else if (type === "react" && !CHAT_REACTIONS.includes(reply.label)) add(row, "replies", "chat-reply-react", "error", `${where}: a reaction is one of ${CHAT_REACTIONS.join(", ")}`);
      else if (type === "emoji" && !CHAT_STICKERS.includes(reply.label)) add(row, "replies", "chat-reply-sticker", "error", `${where}: a sticker is one of ${CHAT_STICKERS.join(", ")}`);
      else if (type === "text" && reply.label.length > CHAT_LIMITS.label) add(row, "replies", "chat-reply-label", "warning", `${where}'s label fits ${CHAT_LIMITS.label} characters or fewer`);
      if (isLink(reply) && type !== "text") add(row, "replies", "chat-link-type", "error", `${where} only opens a page, so it is a text link, not a ${type}`);
      // A text reply must lead somewhere; a sticker or a reaction may end the story
      if (type === "text" && !reply.next && !reply.action) add(row, "replies", "chat-reply-goes", "error", `${where} goes nowhere: give it a next node or an action`);
      if (reply.next !== undefined && reply.next !== null) {
        const target = data.chatNodes.find((n) => n.id === reply.next);
        if (!target) add(row, "replies", "chat-reply-next", "error", `${where} goes to "${reply.next}", which does not exist`);
        else if (target.npc_id !== row.npc_id) add(row, "replies", "chat-reply-next", "error", `${where} goes to a node of another teacher`);
        else if (target.kind === "unprompted") add(row, "replies", "chat-reply-next", "error", `${where} goes to an unprompted message, which only a trigger starts`);
      }
      if (reply.action !== undefined && reply.action !== null) {
        const a = reply.action;
        if (!isRec(a) || !Object.hasOwn(CHAT_ACTIONS, a.screen)) return add(row, "replies", "chat-action", "error", `${where}'s action must be one of ${Object.keys(CHAT_ACTIONS).join(", ")}`);
        const kind = CHAT_ACTIONS[a.screen].id;
        const known = { lesson: lessonIds, node: nodeIds, entry: entryIds, app: appIds, unit: unitIds }[String(kind).replace("?", "")];
        if (kind === null && a.id !== undefined) add(row, "replies", "chat-action", "error", `${where}: "${a.screen}" takes no id`);
        else if (kind !== null && !kind.endsWith("?") && !isStr(a.id)) add(row, "replies", "chat-action", "error", `${where}: "${a.screen}" needs an id`);
        else if (kind !== null && a.id !== undefined && !known.has(a.id)) add(row, "replies", "chat-action-id", "error", `${where}: "${a.id}" is not a known ${a.screen === "practice" ? "path node" : a.screen === "mythbuster" ? "unit" : a.screen}`);
        // The phone's planned apps have no screen yet
        if (a.screen === "app" && a.id) {
          const app = PHONE_APPS.find((x) => x.id === a.id);
          if (app && app.status !== "live") add(row, "replies", "chat-action-app", "error", `${where}: the app "${a.id}" is not built yet`);
        }
      }
    });
  }

  // Per teacher: the shape of the whole thread
  for (const [npcId, rows] of byNpc) {
    const first = rows[0];
    const greetings = rows.filter((r) => r.kind === "greeting");
    if (greetings.length !== 1) add(first, "kind", "chat-greeting", "error", `teacher "${npcId}" needs exactly one greeting (it has ${greetings.length})`);
    const body = rows.filter((r) => r.kind === "reply" || r.kind === "sign_off");
    if (body.length < CHAT_MIN_BODY_NODES) add(first, "kind", "chat-body", "error", `teacher "${npcId}" needs at least ${CHAT_MIN_BODY_NODES} reply or sign-off nodes (it has ${body.length})`);
    if (!rows.some((r) => r.kind === "sign_off")) add(first, "kind", "chat-sign-off", "warning", `teacher "${npcId}" has no sign-off, so a thread can only end on a reply with nowhere to go`);

    // Reachability: from the greeting and from each unprompted message, following `next`
    const nodes = new Map(rows.map((r) => [r.id, r]));
    const reached = new Set();
    const queue = rows.filter((r) => r.kind === "greeting" || r.kind === "unprompted").map((r) => r.id);
    while (queue.length) {
      const id = queue.pop();
      if (reached.has(id)) continue;
      reached.add(id);
      const node = nodes.get(id);
      for (const reply of Array.isArray(node?.replies) ? node.replies : []) if (isRec(reply) && reply.next && nodes.has(reply.next)) queue.push(reply.next);
    }
    for (const r of rows) if (!reached.has(r.id)) add(r, "id", "chat-unreachable", "error", "no reply leads here, so nobody can read it");

    // One unprompted message per trigger per teacher
    const triggers = new Map();
    for (const r of rows.filter((x) => x.kind === "unprompted" && x.trigger)) {
      if (triggers.has(r.trigger)) add(r, "trigger", "chat-trigger-twice", "error", `"${triggers.get(r.trigger)}" already answers ${r.trigger}`);
      else triggers.set(r.trigger, r.id);
    }
  }

  return { checked: { chat_nodes: data.chatNodes.length }, findings };
}

export function validateChat(db) {
  const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  if (!has("chat_nodes")) return { checked: {}, findings: [] };
  const all = (sql) => db.prepare(sql).all();
  return validateChatData({
    npcs: has("npcs") ? all("SELECT id FROM npcs") : [],
    units: all("SELECT id FROM units"),
    lessons: all("SELECT id FROM lessons"),
    nodes: has("path_nodes") ? all("SELECT id FROM path_nodes") : [],
    entryIds: has("encyclopedia_entries") ? all("SELECT id FROM encyclopedia_entries").map((r) => r.id) : [],
    chatNodes: all('SELECT id, npc_id, kind, "trigger" AS "trigger", title, text, pose, replies, position FROM chat_nodes ORDER BY npc_id, position, id').map((r) => ({ ...r, replies: parseJson(r.replies, null) })),
  });
}
