/**
 * Chat adapter v1 (spec 5.2): `chat_nodes`, one file per story under chat/<npc-id>/.
 *
 *   node chat-ada-up-hello
 *   kind: unprompted
 *   pose: cheer
 *   trigger: lessons_completed:6
 *   title: hi hi hi. it's ada
 *
 *       HELLO                      (the body: each blank line starts a new bubble)
 *
 *   reply: hi ada -> chat-ada-hello-q                  a text reply, and the node it leads to
 *   reply: open it -> chat-x => entry half-life        a reply that also opens a screen
 *   link: See the lesson => next-lesson                a reply that only opens a screen
 *   react: love -> chat-y                              a reaction (an id of chat-art) put on the last bubble
 *   sticker: nerd -> chat-z                            a sticker (an id of chat-art)
 *
 * A reaction or sticker with no `->` ends the story. Labels may not contain " -> " or " => ".
 * `position` is not written: it is the node's place in the teacher's files, in file order.
 */
import { defineAdapter } from "./engine.mjs";

const REPLY_KEYS = ["reply", "link", "react", "sticker"];
const KEY_OF_TYPE = { react: "react", emoji: "sticker" };
const TYPE_OF_KEY = { react: "react", sticker: "emoji" };
const ID_LIKE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

const entry = (key, value) => ({ key, value, lines: null, line: null, comments: [] });

function encodeReply(r, nodeId) {
  const extra = Object.keys(r).filter((k) => !["label", "next", "type", "action"].includes(k));
  if (extra.length) throw new Error(`a reply of ${nodeId} has "${extra[0]}", which the chat format cannot write`);
  if (typeof r.label !== "string" || r.label === "") throw new Error(`a reply of ${nodeId} has no label`);
  if (/ -> | => |\n/.test(r.label) || /^\s|\s$/.test(r.label) || /[\t\r]/.test(r.label)) throw new Error(`the reply label "${r.label}" of ${nodeId} cannot contain " -> ", " => ", a newline, or edge spaces`);
  if (r.next !== undefined && !ID_LIKE.test(r.next)) throw new Error(`a reply of ${nodeId} points at "${r.next}", which is not a node id`);
  const type = r.type;
  if (type !== undefined && type !== "react" && type !== "emoji") throw new Error(`a reply of ${nodeId} has type "${type}" (use react or emoji, or leave it out)`);
  if (type && r.action) throw new Error(`a ${type} reply of ${nodeId} cannot also open a screen`);
  if (type && /\s/.test(r.label)) throw new Error(`the ${type} "${r.label}" of ${nodeId} must be an id of chat-art`);
  let value = r.label;
  if (r.next !== undefined) value += ` -> ${r.next}`;
  if (r.action) {
    const { screen, id, ...rest } = r.action;
    if (Object.keys(rest).length || typeof screen !== "string" || !/^[a-z][a-z0-9-]*$/.test(screen) || (id !== undefined && !ID_LIKE.test(id))) {
      throw new Error(`a reply of ${nodeId} has an action the chat format cannot write: ${JSON.stringify(r.action)}`);
    }
    value += ` => ${screen}${id !== undefined ? ` ${id}` : ""}`;
  }
  const key = type ? KEY_OF_TYPE[type] : r.action && r.next === undefined ? "link" : "reply";
  return entry(key, value);
}

function decodeReply(e) {
  const m = /^(.+?)(?: -> (\S+))?(?: => ([a-z][a-z0-9-]*)(?: (\S+))?)?$/.exec(e.value);
  if (!m) throw Object.assign(new Error(`cannot read the ${e.key} "${e.value}" (expected: label [-> node] [=> screen [id]])`), { entry: e });
  const [, label, next, screen, id] = m;
  const r = { label };
  if (next) r.next = next;
  if (TYPE_OF_KEY[e.key]) {
    if (screen) throw Object.assign(new Error(`a ${e.key} cannot also open a screen`), { entry: e });
    if (/\s/.test(label)) throw Object.assign(new Error(`the ${e.key} "${label}" must be an id of chat-art`), { entry: e });
    r.type = TYPE_OF_KEY[e.key];
  }
  if (e.key === "link" && (next || !screen)) throw Object.assign(new Error('a link opens a screen and leads nowhere: "link: label => screen [id]"'), { entry: e });
  if (screen) r.action = id ? { screen, id } : { screen };
  return r;
}

const replies = {
  col: "replies",
  type: "custom",
  translatable: true, // the label of a text reply (a sticker or reaction label is a picture id: i18n-core wordLeaves)
  keys: REPLY_KEYS,
  default: [],
  omitDefault: true,
  encode: (list, row) => list.map((r) => encodeReply(r, row.id)),
  decode: (entries) => {
    for (const e of entries) {
      if (e.lines) throw Object.assign(new Error(`a ${e.key} is one line`), { entry: e });
    }
    return entries.map(decodeReply);
  },
};

/** Story files of one teacher: the nodes reachable from each root (a free chat greeting, or an unprompted node), in order. */
export function storiesOf(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const roots = nodes.filter((n) => n.kind === "greeting").concat(nodes.filter((n) => n.kind === "unprompted"));
  const taken = new Set();
  const stories = [];
  for (const root of roots) {
    const seen = [];
    const queue = [root.id];
    while (queue.length) {
      const id = queue.shift();
      if (taken.has(id) || seen.includes(id) || !byId.has(id)) continue;
      seen.push(id);
      for (const r of byId.get(id).replies ?? []) if (r?.next) queue.push(r.next);
    }
    seen.forEach((id) => taken.add(id));
    stories.push({ root: root.id, nodes: seen.map((id) => byId.get(id)).sort((a, b) => order.get(a.id) - order.get(b.id)) });
  }
  const loose = nodes.filter((n) => !taken.has(n.id));
  if (loose.length) stories.push({ root: "loose", nodes: loose });
  return stories;
}

export const chatAdapter = defineAdapter({
  name: "chat",
  version: 1,
  dir: "chat",
  owns: (rel) => rel.startsWith("chat/") && rel.endsWith(".atomiq"),
  scope: [{ col: "npc_id", key: "npc", type: "id", nullable: true }],
  records: [
    {
      keyword: "node",
      table: "chat_nodes",
      id: ["id"],
      scope: ["npc_id"],
      position: { col: "position", scope: ["npc_id"], base: 0 },
      fields: [
        { col: "kind", type: "text", translatable: false },
        { col: "pose", type: "text", default: "idle" },
        { col: "trigger", type: "text", nullable: true },
        { col: "title", type: "text", nullable: true, translatable: true },
        { col: "text", type: "prose", body: true, translatable: true },
        replies,
      ],
    },
  ],
  layout(rowsByTable) {
    const rows = rowsByTable.chat_nodes ?? [];
    const teachers = [...new Set(rows.map((r) => r.npc_id))].sort();
    const files = [];
    for (const npc of teachers) {
      const nodes = rows.filter((r) => r.npc_id === npc).sort((a, b) => a.position - b.position);
      storiesOf(nodes).forEach((story, i) => {
        const n = String((i + 1) * 10).padStart(3, "0");
        files.push({ path: `chat/${npc}/${n}-${story.root}.atomiq`, scope: { npc_id: npc }, items: story.nodes.map((row) => ({ keyword: "node", row })) });
      });
    }
    return files;
  },
});
