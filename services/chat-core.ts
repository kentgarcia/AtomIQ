/**
 * NPC chats on the phone (docs/features/PHONE_SPEC.md §5.2 and §7.3). Framework-free so `scripts/test-chats.mjs` runs it on
 * plain Node and on in-memory SQLite: the node graph rules (where a tapped reply goes), the story threads a learner's
 * progress unlocks, the list summaries, and the SQL over `chat_threads` and `chat_messages`.
 *
 * A teacher's nodes make two kinds of thread. The free chat starts at the teacher's greeting, a menu of things to ask, and the
 * learner can start as many of them as they like. A story thread starts at an unprompted node with a trigger (a finished lesson,
 * a level, a new app, a finished unit, coming back): it unlocks once, shows up in Chats with its own subject line, and can be
 * replayed. Replies are taps, never typing: a chip, a sticker (a big emoji) or a reaction (an emoji put on the teacher's last
 * message); a sticker or a reaction with nowhere to go ends the story. Nothing is sent anywhere; the history is on the device
 * only. Shrodi's thread is the Guide engine and does not use any of this.
 */

import { chatArtName } from "../components/phone/chat-art.ts";
import { tourArt, tourArtName } from "../components/phone/tour-art.ts";
import { dayKeyFromLocalDate } from "./activity-core.ts";

export type ChatKind = "greeting" | "reply" | "unprompted" | "sign_off";

/** What a reply is (the vocabulary is `scripts/lib/chat-vocab.mjs`): a chip, a sticker, or a reaction to the last message. */
export type ReplyType = "text" | "emoji" | "react";

/** What a reply can do besides leading to a next node (the vocabulary is `scripts/lib/chat-vocab.mjs`). */
export type ChatAction =
  | { screen: "next-lesson" }
  | { screen: "lesson"; id: string }
  | { screen: "practice"; id: string }
  | { screen: "entry"; id: string }
  | { screen: "mythbuster"; id?: string }
  | { screen: "app"; id: string };

export interface ChatReply {
  label: string;
  type?: ReplyType;
  next?: string;
  action?: ChatAction;
}

export interface ChatNode {
  id: string;
  npcId: string;
  kind: ChatKind;
  /** Unprompted only: what unlocks the story (`app_installed:<app>`, `unit_complete:<unit>`, `lessons_completed:<n>`, `level_reached:<n>` or `welcome_back`). */
  trigger: string | null;
  /** A story's first node: the thread's subject line. */
  title: string | null;
  text: string;
  pose: string;
  replies: ChatReply[];
  position: number;
}

/** The most messages kept per thread. */
export const MAX_MESSAGES_PER_THREAD = 200;

/** Days away before a teacher welcomes the learner back (the same number as the Feed's comeback post). */
export const WELCOME_BACK_MIN_DAYS = 3;

/**
 * A node's text as the bubbles it arrives in: a blank line starts a new one, so a long message is several short ones that
 * show one after another. Always at least one (an empty text is one empty bubble, which the content rules refuse anyway).
 */
export function splitParts(text: string): string[] {
  const parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p !== "");
  return parts.length > 0 ? parts : [text.trim()];
}

/**
 * A part of a node's text that is only `[[pic:<id>]]` is a picture, not a bubble (Shrodi's tour shows what each screen looks like,
 * `components/phone/tour-art.ts`). Returns the id when the whole part is a marker for a picture that exists, otherwise null, so a
 * mistyped marker is shown as the plain text it is and the content rules catch it before it ships.
 */
export function pictureOf(text: string): string | null {
  const m = /^\[\[pic:([a-z0-9-]+)\]\]$/.exec(text.trim());
  return m && tourArt(m[1]) ? m[1] : null;
}

/** Shrodi, the mascot, chats like a teacher (his nodes carry this npc id) but is not in the cast of teachers. Mirrors `CHAT_MASCOT_ID` in `scripts/lib/chat-vocab.mjs`. */
export const CHAT_MASCOT_ID = "shrodi";

export const replyTypeOf = (reply: ChatReply): ReplyType => reply.type ?? "text";

/** How a link reply looks: the icon of where it goes and a small line saying what it opens (shown under its label). */
export function linkInfo(action: ChatAction): { icon: string; caption: string } {
  switch (action.screen) {
    case "entry":
      return { icon: "Book1", caption: "Opens AtomDex" };
    case "next-lesson":
      return { icon: "Play", caption: "Goes to your next lesson" };
    case "lesson":
      return { icon: "Play", caption: "Opens the lesson" };
    case "practice":
      return { icon: "Refresh2", caption: "Opens a practice" };
    case "mythbuster":
      return { icon: "Game", caption: "Starts a Myth Buster round" };
    case "app":
      return { icon: "ExportSquare", caption: "Opens an app" };
  }
}

/** A reply that only opens another page (an action and nowhere to go next) is a link, not a reply: it sends nothing and is drawn as its own kind of button. */
export const isLinkReply = (reply: ChatReply): boolean => reply.action !== undefined && reply.action !== null && !reply.next;

export const isSignOff = (node: ChatNode | null): boolean => node?.kind === "sign_off";

/** The teacher's free chat entry (the greeting). */
export const greetingOf = (nodes: readonly ChatNode[], npcId: string): ChatNode | null =>
  nodes.find((n) => n.npcId === npcId && n.kind === "greeting") ?? null;

/** Whether a teacher has a free chat to start (a greeting is the way in). */
export const hasThread = (nodes: readonly ChatNode[], npcId: string): boolean => greetingOf(nodes, npcId) !== null;

/** The teachers who have a free chat. */
export const threadNpcIds = (nodes: readonly ChatNode[]): string[] => [...new Set(nodes.filter((n) => n.kind === "greeting").map((n) => n.npcId))];

export interface ReplyStep {
  /** The node the teacher answers with, when the reply leads on. */
  next: ChatNode | null;
  action: ChatAction | null;
  /** A reply with nowhere to go (a sticker or a reaction) ends the story. */
  ends: boolean;
}

/** Where tapped reply `index` of `node` goes. A reply that points at a missing node leads nowhere rather than throwing. */
export function replyStep(nodes: readonly ChatNode[], node: ChatNode, index: number): ReplyStep | null {
  const reply = node.replies[index];
  if (!reply) return null;
  const next = reply.next ? (nodes.find((n) => n.id === reply.next && n.npcId === node.npcId && n.kind !== "unprompted") ?? null) : null;
  return { next, action: reply.action ?? null, ends: !reply.next && !reply.action };
}

/** The replies under a thread: those of the node the teacher said last. A sign-off, or no node yet, has none. */
export function pillsOf(node: ChatNode | null): ChatReply[] {
  return node && node.kind !== "sign_off" ? node.replies : [];
}

/** A thread is over when the teacher's last node is a sign-off or has no replies (the learner can replay it). */
export const isEnded = (node: ChatNode | null): boolean => node !== null && (node.kind === "sign_off" || node.replies.length === 0);

// ---------------------------------------------------------------------------
// threads and messages
// ---------------------------------------------------------------------------

export type ThreadOrigin = "event" | "free";

/** One conversation on the phone: a free chat the learner started, or a story a trigger unlocked. */
export interface ChatThread {
  id: string;
  npcId: string;
  /** The node the thread opens at (and starts again at when replayed). */
  entryNodeId: string;
  title: string;
  origin: ThreadOrigin;
  /** A story's unlock key (`lessons_completed:3`, `welcome_back:2026-11-20`): it stops the same story unlocking twice. */
  event: string | null;
  /** The learner ended it with a reply that goes nowhere. */
  ended: boolean;
  /** Put away from the Chats list (swipe a thread to archive it); still there under "Archived". */
  archived: boolean;
  /** How many times it has been played (a replay adds one). */
  plays: number;
  createdAt: number;
  updatedAt: number;
}

export type MessageKind = "text" | "emoji" | "react";

export interface ChatMessage {
  id: string;
  threadId: string;
  /** The node a teacher's message says; null for the learner's. */
  nodeId: string | null;
  /** `npc:<id>` or `me`. */
  sender: string;
  text: string;
  /** `text` is a bubble, `emoji` a sticker, `react` a reaction put on the message `targetId`. */
  kind: MessageKind;
  targetId: string | null;
  at: number;
  read: boolean;
}

/** The node a teacher said last in a thread (its messages in time order), or null. */
export function currentNode(nodes: readonly ChatNode[], messages: readonly ChatMessage[]): ChatNode | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.sender !== "me" && m.nodeId) return nodes.find((n) => n.id === m.nodeId) ?? null;
  }
  return null;
}

/** The reactions on each message of a thread: message id -> the learner's reaction (the latest one wins). */
export function reactionsOf(messages: readonly ChatMessage[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of messages) if (m.kind === "react" && m.targetId) out.set(m.targetId, m.text);
  return out;
}

/** What the thread's last message reads as in the list. A reaction or a sticker stores the id of its picture. */
export function lastLine(message: ChatMessage): string {
  if (message.kind === "react") return `You reacted: ${chatArtName(message.text)}`;
  if (message.kind === "emoji") return `You sent a sticker: ${chatArtName(message.text)}`;
  const picture = pictureOf(message.text);
  if (picture) return `Sent a picture: ${tourArtName(picture)}`;
  return message.text;
}

/**
 * Unread letters: a message that arrived as several bubbles is one letter (its bubbles share a node), so a story that opens
 * with three bubbles counts once.
 */
export function unreadLetters(messages: readonly ChatMessage[], threadId?: string): number {
  const keys = new Set<string>();
  for (const m of messages) {
    if (m.read || m.sender === "me" || (threadId !== undefined && m.threadId !== threadId)) continue;
    keys.add(`${m.threadId}|${m.nodeId ?? m.id}`);
  }
  return keys.size;
}

export interface ThreadSummary {
  threadId: string;
  npcId: string;
  title: string;
  origin: ThreadOrigin;
  /** A story's unlock key (null for a free chat). */
  event: string | null;
  /** The last message's text, or null when nothing has been said. */
  last: string | null;
  lastAt: number | null;
  /** Whether the learner said the last line (shown as "You: ..."). */
  lastFromMe: boolean;
  unread: number;
  ended: boolean;
  archived: boolean;
  plays: number;
}

/** One row of the Chats list per thread: the last line, when, and how many unread. Most recent first. */
export function summarizeThreads(threads: readonly ChatThread[], messages: readonly ChatMessage[]): ThreadSummary[] {
  const rows = threads.map<ThreadSummary>((t) => {
    const mine = messages.filter((m) => m.threadId === t.id);
    const last = mine.reduce<ChatMessage | null>((a, m) => (a === null || m.at >= a.at ? m : a), null);
    return {
      threadId: t.id,
      npcId: t.npcId,
      title: t.title,
      origin: t.origin,
      event: t.event,
      last: last ? lastLine(last) : null,
      lastAt: last?.at ?? null,
      lastFromMe: last?.sender === "me",
      unread: unreadLetters(mine),
      ended: t.ended,
      archived: t.archived,
      plays: t.plays,
    };
  });
  const when = (r: ThreadSummary) => r.lastAt ?? threads.find((t) => t.id === r.threadId)?.updatedAt ?? -1;
  return rows.sort((a, b) => when(b) - when(a));
}

export const totalUnread = (messages: readonly ChatMessage[]): number => unreadLetters(messages);

// ---------------------------------------------------------------------------
// story threads: what unlocks them
// ---------------------------------------------------------------------------

export interface StoryInput {
  /** Units the learner has finished. */
  unitsCompleted: readonly string[];
  /** Apps whose install moment has played. */
  installedApps: readonly string[];
  /** The apps the phone starts with: arriving is not news. */
  startApps: readonly string[];
  /** Lessons finished in all, and the learner's level (a level is 100 XP). */
  lessonsCompleted: number;
  level: number;
  /** Today's `YYYY-MM-DD` and the day the learner returned after being away (null when they did not). */
  today: string;
  returnedOn: string | null;
}

/** The unlock key of a trigger when it has been earned (it is stored on the thread so the story unlocks once), or null when it has not. */
export function earnedEvent(trigger: string | null, input: StoryInput): string | null {
  if (!trigger) return null;
  const [kind, ...rest] = trigger.split(":");
  const arg = rest.join(":");
  switch (kind) {
    case "welcome_back":
      return input.returnedOn === input.today ? `welcome_back:${input.today}` : null;
    case "unit_complete":
      return input.unitsCompleted.includes(arg) ? trigger : null;
    case "app_installed":
      return input.installedApps.includes(arg) && !input.startApps.includes(arg) ? trigger : null;
    case "lessons_completed":
      return input.lessonsCompleted >= Number(arg) && Number(arg) > 0 ? trigger : null;
    case "level_reached":
      return input.level >= Number(arg) && Number(arg) > 0 ? trigger : null;
    default:
      return null;
  }
}

const TRIGGER_ORDER = ["welcome_back", "unit_complete", "lessons_completed", "level_reached", "app_installed"];

export interface Unlock {
  node: ChatNode;
  event: string;
}

/**
 * Every story the learner has earned and not been given yet, most welcome first. Only a teacher in `contacts` can start one,
 * and a story unlocks once per teacher (the key is on the thread, so deleting nothing and replaying never repeats it). It is all
 * worked out from the learner's state, so a story earned while the app was closed is still unlocked the next time it opens.
 */
export function earnedStories(nodes: readonly ChatNode[], input: StoryInput, contacts: readonly string[], threads: readonly ChatThread[]): Unlock[] {
  const out: Unlock[] = [];
  for (const node of nodes) {
    if (node.kind !== "unprompted" || !contacts.includes(node.npcId)) continue;
    const event = earnedEvent(node.trigger, input);
    if (!event) continue;
    if (threads.some((t) => t.npcId === node.npcId && t.event === event)) continue;
    out.push({ node, event });
  }
  const rank = (u: Unlock) => TRIGGER_ORDER.indexOf(u.event.split(":")[0]);
  return out.sort((a, b) => rank(a) - rank(b));
}

export const localDayKey = (ms: number): string => dayKeyFromLocalDate(new Date(ms));

// ---------------------------------------------------------------------------
// the SQL over chat_threads and chat_messages
// ---------------------------------------------------------------------------

export interface ChatDb {
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
}

interface MessageRow {
  id: string;
  thread_id: string;
  node_id: string | null;
  sender: string;
  text: string;
  kind: string;
  target_id: string | null;
  at: number;
  read: number;
}

interface ThreadRow {
  id: string;
  npc_id: string;
  entry_node_id: string;
  title: string;
  origin: string;
  event: string | null;
  ended: number;
  archived: number;
  plays: number;
  created_at: number;
  updated_at: number;
}

const MESSAGE_COLUMNS = 'id, thread_id, node_id, sender, text, kind, target_id, at, "read"';
const THREAD_COLUMNS = "id, npc_id, entry_node_id, title, origin, event, ended, archived, plays, created_at, updated_at";

const toMessage = (r: MessageRow): ChatMessage => ({
  id: r.id,
  threadId: r.thread_id,
  nodeId: r.node_id,
  sender: r.sender,
  text: r.text,
  kind: r.kind === "emoji" || r.kind === "react" ? r.kind : "text",
  targetId: r.target_id,
  at: r.at,
  read: r.read === 1,
});

const toThread = (r: ThreadRow): ChatThread => ({
  id: r.id,
  npcId: r.npc_id,
  entryNodeId: r.entry_node_id,
  title: r.title,
  origin: r.origin === "event" ? "event" : "free",
  event: r.event,
  ended: r.ended === 1,
  archived: r.archived === 1,
  plays: r.plays,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export interface NewMessage {
  threadId: string;
  nodeId?: string | null;
  sender: string;
  text: string;
  kind?: MessageKind;
  /** A reaction's target: the message it is put on. */
  targetId?: string | null;
  /** The learner's own lines and a thread being looked at are read. */
  read?: boolean;
}

export interface NewThread {
  npcId: string;
  entryNodeId: string;
  title: string;
  origin: ThreadOrigin;
  event?: string | null;
}

export function createChatStore(getDb: () => Promise<ChatDb> | ChatDb, newId: () => string) {
  /** One thread's messages, oldest first. */
  async function list(threadId: string): Promise<ChatMessage[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<MessageRow>(`SELECT ${MESSAGE_COLUMNS} FROM chat_messages WHERE thread_id = ? AND deleted_at IS NULL ORDER BY at ASC, rowid ASC`, [threadId]);
    return rows.map(toMessage);
  }

  /** Every message of every thread, oldest first. */
  async function listAll(): Promise<ChatMessage[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<MessageRow>(`SELECT ${MESSAGE_COLUMNS} FROM chat_messages WHERE deleted_at IS NULL ORDER BY at ASC, rowid ASC`);
    return rows.map(toMessage);
  }

  /** Add a message, then drop the oldest ones past the cap. */
  async function post(message: NewMessage, now: number): Promise<ChatMessage> {
    const db = await getDb();
    const id = newId();
    const read = message.read ?? message.sender === "me";
    const kind = message.kind ?? "text";
    await db.runAsync(
      'INSERT INTO chat_messages (id, thread_id, node_id, sender, text, kind, target_id, at, "read", created_at, updated_at, is_dirty) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
      [id, message.threadId, message.nodeId ?? null, message.sender, message.text, kind, message.targetId ?? null, now, read ? 1 : 0, now, now],
    );
    await db.runAsync(
      `DELETE FROM chat_messages WHERE thread_id = ? AND id IN (
         SELECT id FROM chat_messages WHERE thread_id = ? ORDER BY at DESC, rowid DESC LIMIT -1 OFFSET ?)`,
      [message.threadId, message.threadId, MAX_MESSAGES_PER_THREAD],
    );
    await db.runAsync("UPDATE chat_threads SET updated_at = ?, is_dirty = 1 WHERE id = ?", [now, message.threadId]);
    return { id, threadId: message.threadId, nodeId: message.nodeId ?? null, sender: message.sender, text: message.text, kind, targetId: message.targetId ?? null, at: now, read };
  }

  /** The ids of a thread's unread messages, oldest first (the ones to play one by one when it opens). */
  async function unreadIds(threadId: string): Promise<string[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM chat_messages WHERE thread_id = ? AND "read" = 0 AND deleted_at IS NULL ORDER BY at ASC, rowid ASC', [threadId]);
    return rows.map((r) => r.id);
  }

  /** The learner opened a thread: its messages are read. Returns how many were unread. */
  async function markRead(threadId: string, now: number): Promise<number> {
    const db = await getDb();
    const result = await db.runAsync('UPDATE chat_messages SET "read" = 1, updated_at = ?, is_dirty = 1 WHERE thread_id = ? AND "read" = 0', [now, threadId]);
    return result.changes;
  }

  /** Unread teacher messages across every thread (the Chats icon's count). */
  async function unreadCount(): Promise<number> {
    const db = await getDb();
    // The bubbles of one message share a node, so they count once; an archived thread does not count
    const rows = await db.getAllAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM (SELECT DISTINCT thread_id, COALESCE(node_id, id) FROM chat_messages
         WHERE "read" = 0 AND deleted_at IS NULL AND thread_id NOT IN (SELECT id FROM chat_threads WHERE archived = 1))`,
    );
    return rows[0]?.n ?? 0;
  }

  async function createThread(thread: NewThread, now: number): Promise<ChatThread> {
    const db = await getDb();
    const id = `thread-${newId()}`;
    await db.runAsync(
      "INSERT INTO chat_threads (id, npc_id, entry_node_id, title, origin, event, ended, plays, created_at, updated_at, is_dirty) VALUES (?,?,?,?,?,?,0,1,?,?,1)",
      [id, thread.npcId, thread.entryNodeId, thread.title, thread.origin, thread.event ?? null, now, now],
    );
    return { id, npcId: thread.npcId, entryNodeId: thread.entryNodeId, title: thread.title, origin: thread.origin, event: thread.event ?? null, ended: false, archived: false, plays: 1, createdAt: now, updatedAt: now };
  }

  async function listThreads(): Promise<ChatThread[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<ThreadRow>(`SELECT ${THREAD_COLUMNS} FROM chat_threads WHERE deleted_at IS NULL ORDER BY created_at ASC, rowid ASC`);
    return rows.map(toThread);
  }

  async function getThread(id: string): Promise<ChatThread | null> {
    const db = await getDb();
    const rows = await db.getAllAsync<ThreadRow>(`SELECT ${THREAD_COLUMNS} FROM chat_threads WHERE id = ? AND deleted_at IS NULL`, [id]);
    return rows[0] ? toThread(rows[0]) : null;
  }

  /** Put a thread away from the Chats list, or bring it back. Its messages are kept. */
  async function setArchived(id: string, archived: boolean, now: number): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE chat_threads SET archived = ?, updated_at = ?, is_dirty = 1 WHERE id = ?", [archived ? 1 : 0, now, id]);
  }

  async function setEnded(id: string, ended: boolean, now: number): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE chat_threads SET ended = ?, updated_at = ?, is_dirty = 1 WHERE id = ?", [ended ? 1 : 0, now, id]);
  }

  /** Replay: the thread's messages are cleared, it counts one more play and is open again. Its unlock key stays, so the story is not unlocked a second time. */
  async function restart(id: string, now: number): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE chat_messages SET deleted_at = ?, is_dirty = 1 WHERE thread_id = ? AND deleted_at IS NULL", [now, id]);
    await db.runAsync("UPDATE chat_threads SET ended = 0, plays = plays + 1, updated_at = ?, is_dirty = 1 WHERE id = ?", [now, id]);
  }

  return { list, listAll, post, unreadIds, markRead, unreadCount, createThread, listThreads, getThread, setEnded, setArchived, restart };
}
