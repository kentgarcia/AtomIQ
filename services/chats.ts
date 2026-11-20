/**
 * The runtime of the phone's Chats (docs/features/PHONE_SPEC.md §5.2): binds `chat_threads` and `chat_messages` to the user-state
 * database, loads the teachers' nodes from the content database, starts a free chat, unlocks a story thread when the learner's
 * progress earns one, opens a thread, answers a tapped reply (a chip, a sticker or a reaction), replays a thread, and turns a
 * reply's action into a route. The rules are in `services/chat-core.ts`. Nothing here sends anything anywhere, and nothing
 * throws into a screen: a failed read gives an empty thread and a failed write is dropped.
 */

import { contentRepository } from "@/services/content-db";
import { getDatabase } from "@/services/database";
import {
  createChatStore,
  currentNode,
  earnedStories,
  greetingOf,
  CHAT_MASCOT_ID,
  hasThread,
  localDayKey,
  isLinkReply,
  replyStep,
  replyTypeOf,
  splitParts,
  summarizeThreads,
  WELCOME_BACK_MIN_DAYS,
  type ChatAction,
  type ChatDb,
  type ChatMessage,
  type ChatNode,
  type ChatThread,
  type ThreadSummary,
} from "@/services/chat-core";
import { daysBetween, isDayKey } from "@/services/activity-core";
import { loadPathSnapshot } from "@/services/path-snapshot";
import { PHONE_APPS, type PhoneProgress, type SeenApp } from "@/services/phone-core";
import { getChatLastOpen, getChatReturned, setChatLastOpen, setChatReturned } from "@/services/storage";

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const store = createChatStore(() => getDatabase() as unknown as ChatDb, newId);

type Listener = () => void;
const listeners = new Set<Listener>();

/** A message arrived, a thread was made or a thread was read. */
export function subscribeChats(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyChats(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A listener's failure never stops the others.
    }
  });
}

let nodesCache: ChatNode[] | null = null;

/** The teachers' nodes (empty when the content has none). Cached once read. */
export async function loadChatNodes(): Promise<ChatNode[]> {
  if (nodesCache) return nodesCache;
  try {
    nodesCache = await contentRepository.getChatNodes();
    return nodesCache;
  } catch (error) {
    console.warn("[chats] nodes", error);
    return [];
  }
}

/** Whether a teacher has a free chat to start. */
export async function teacherHasThread(npcId: string): Promise<boolean> {
  return hasThread(await loadChatNodes(), npcId);
}

/** Unread teacher messages across every thread. Never rejects. */
export async function getUnreadChats(): Promise<number> {
  try {
    return await store.unreadCount();
  } catch {
    return 0;
  }
}

/**
 * The teachers in the learner's Contacts and Chats: the teacher of every unit in which the learner has finished a lesson,
 * in the order the units come (so the latest comes last). Finishing a unit's first lesson is what adds its teacher; nothing
 * else does. Never rejects.
 */
export async function getContactTeacherIds(): Promise<string[]> {
  try {
    const { units, nodes, state } = await loadPathSnapshot();
    const started = new Set(nodes.filter((n) => n.kind === "lesson" && state.nodes[n.id] === "completed").map((n) => n.unitId));
    return units.filter((u) => u.teacherNpcId && started.has(u.id)).map((u) => u.teacherNpcId as string);
  } catch (error) {
    console.warn("[chats] contacts", error);
    return [];
  }
}

/** The Chats list: one row per thread (every free chat and every unlocked story), the latest message first. Never rejects. */
export async function listThreads(): Promise<ThreadSummary[]> {
  try {
    await ensureMascotChat();
    const [threads, messages] = await Promise.all([store.listThreads(), store.listAll()]);
    return summarizeThreads(threads, messages);
  } catch (error) {
    console.warn("[chats] list", error);
    return [];
  }
}

export interface ThreadView {
  thread: ChatThread;
  nodes: ChatNode[];
  messages: ChatMessage[];
  /** The node the teacher said last: its replies are what the learner can tap. */
  current: ChatNode | null;
  /** The teacher's messages that just arrived (unread when opened, or added by a reply or a replay): the screen plays them one by one. */
  fresh: string[];
}

const viewOf = (thread: ChatThread, nodes: ChatNode[], messages: ChatMessage[], fresh: string[] = []): ThreadView => ({ thread, nodes, messages, current: currentNode(nodes, messages), fresh });

/** Say a node: one message per bubble of its text (a blank line starts a bubble), a millisecond apart so they keep their order. Returns their ids. */
async function sayNode(threadId: string, npcId: string, node: ChatNode, at: number, read: boolean): Promise<string[]> {
  const ids: string[] = [];
  const parts = splitParts(node.text);
  for (let i = 0; i < parts.length; i++) ids.push((await store.post({ threadId, nodeId: node.id, sender: `npc:${npcId}`, text: parts[i], read }, at + i)).id);
  return ids;
}

let mascotChecked = false;

/**
 * Shrodi is in Chats from the start: the first time the list is read and he has no thread yet (not even an archived one), a free chat
 * with his greeting waits there, unread, like any other thread. Once per app run, and queued with story delivery so the two cannot
 * both make it. Never rejects.
 */
export function ensureMascotChat(): Promise<void> {
  if (mascotChecked) return delivering;
  delivering = delivering
    .then(async () => {
      const nodes = await loadChatNodes();
      if (!greetingOf(nodes, CHAT_MASCOT_ID)) return;
      mascotChecked = true;
      if ((await store.listThreads()).some((t) => t.npcId === CHAT_MASCOT_ID)) return;
      await startFreeChat(CHAT_MASCOT_ID);
    })
    .catch((error) => console.warn("[chats] mascot", error));
  return delivering;
}

/** Start a new free chat with a teacher: they greet the learner. Returns the new thread's id, or null when the teacher has none. Never rejects. */
export async function startFreeChat(npcId: string): Promise<string | null> {
  try {
    const nodes = await loadChatNodes();
    const greeting = greetingOf(nodes, npcId);
    if (!greeting) return null;
    const now = Date.now();
    const thread = await store.createThread({ npcId, entryNodeId: greeting.id, title: greeting.title ?? "Chat", origin: "free" }, now);
    await sayNode(thread.id, npcId, greeting, now, true);
    notifyChats();
    return thread.id;
  } catch (error) {
    console.warn("[chats] start", error);
    return null;
  }
}

/** The thread behind a teacher's "Message" button: their latest free chat, or a new one. */
export async function messageTeacher(npcId: string): Promise<string | null> {
  try {
    const threads = (await store.listThreads()).filter((t) => t.npcId === npcId && t.origin === "free");
    if (threads.length > 0) return threads[threads.length - 1].id;
  } catch (error) {
    console.warn("[chats] message", error);
  }
  return startFreeChat(npcId);
}

// ---------------------------------------------------------------------------
// story threads
// ---------------------------------------------------------------------------

const START_APPS = PHONE_APPS.filter((a) => a.unlock.kind === "start").map((a) => a.id);

let delivering: Promise<void> = Promise.resolve();

/**
 * Unlock every story thread the learner's progress has earned and that is not in Chats yet (docs/features/PHONE_SPEC.md §5.2): each
 * one is a new thread with its first message waiting, unread. Calls are queued one after another, so two screens asking at once
 * cannot both unlock the same story. Never rejects.
 */
export function deliverPendingChat(input: { progress: PhoneProgress; seen: readonly SeenApp[] }): Promise<void> {
  delivering = delivering.then(() => deliverNow(input)).catch((error) => console.warn("[chats] deliver", error));
  return delivering;
}

async function deliverNow({ progress, seen }: { progress: PhoneProgress; seen: readonly SeenApp[] }): Promise<void> {
  const nodes = await loadChatNodes();
  if (nodes.length === 0) return;
  const now = Date.now();
  const unlocks = earnedStories(
    nodes,
    {
      unitsCompleted: progress.unitsCompleted,
      installedApps: seen.map((s) => s.appId),
      startApps: START_APPS,
      lessonsCompleted: progress.lessonsCompleted,
      level: progress.level,
      today: localDayKey(now),
      returnedOn: await getChatReturned(),
    },
    // Shrodi is always one of the senders, like a teacher whose unit is started
    [CHAT_MASCOT_ID, ...(await getContactTeacherIds())],
    await store.listThreads(),
  );
  if (unlocks.length === 0) return;
  let i = 0;
  for (const { node, event } of unlocks) {
    const at = now + i++;
    const thread = await store.createThread({ npcId: node.npcId, entryNodeId: node.id, title: node.title ?? "New message", origin: "event", event }, at);
    await sayNode(thread.id, node.npcId, node, at, false);
  }
  notifyChats();
}

// ---------------------------------------------------------------------------
// opening, replying, replaying
// ---------------------------------------------------------------------------

/** Open a thread: mark it read and give its messages. `null` when it is not there. Never rejects. */
export async function openThread(threadId: string): Promise<ThreadView | null> {
  try {
    const thread = await store.getThread(threadId);
    if (!thread) return null;
    const nodes = await loadChatNodes();
    // What arrived since the learner last looked is played one bubble at a time
    const fresh = await store.unreadIds(threadId);
    if ((await store.markRead(threadId, Date.now())) > 0) notifyChats();
    return viewOf(thread, nodes, await store.list(threadId), fresh);
  } catch (error) {
    console.warn("[chats] open", error);
    return null;
  }
}

export interface ReplyResult {
  view: ThreadView;
  /** What to open, when the reply has an action. */
  action: ChatAction | null;
  /** Whether the teacher answered (a message was added after the learner's). */
  answered: boolean;
  /** The id of the learner's message just sent (a reaction's too); null for a link, which sends nothing. */
  sent: string | null;
}

/**
 * The learner tapped reply `index`: a chip is saved as their line, a sticker as a big emoji, a reaction as an emoji put on the
 * teacher's last message; then the teacher's answer when the reply leads on, or the end of the story when it goes nowhere.
 * Never rejects.
 */
export async function sendReply(threadId: string, index: number): Promise<ReplyResult | null> {
  try {
    const thread = await store.getThread(threadId);
    if (!thread || thread.ended) return null;
    const nodes = await loadChatNodes();
    const before = await store.list(threadId);
    const node = currentNode(nodes, before);
    const step = node ? replyStep(nodes, node, index) : null;
    if (!node || !step) return null;
    const reply = node.replies[index];
    // A link only opens its page: nothing is sent and the thread stays as it is
    if (isLinkReply(reply)) return { view: viewOf(thread, nodes, before), action: step.action, answered: false, sent: null };
    const type = replyTypeOf(reply);
    const now = Date.now();
    // Replying in an archived thread brings it back to the list
    if (thread.archived) await store.setArchived(threadId, false, now);
    let sent: ChatMessage;
    if (type === "react") {
      // A reaction goes on the teacher's last bubble
      const target = [...before].reverse().find((m) => m.sender !== "me" && m.kind === "text");
      sent = await store.post({ threadId, sender: "me", text: reply.label, kind: "react", targetId: target?.id ?? null }, now);
    } else {
      sent = await store.post({ threadId, sender: "me", text: reply.label, kind: type === "emoji" ? "emoji" : "text" }, now);
    }
    let added: string[] = [];
    if (step.next) added = await sayNode(threadId, thread.npcId, step.next, now + 1, true);
    else if (step.ends) await store.setEnded(threadId, true, now + 1);
    const fresh = (await store.getThread(threadId)) ?? thread;
    return { view: viewOf(fresh, nodes, await store.list(threadId), added), action: step.action, answered: step.next !== null, sent: sent.id };
  } catch (error) {
    console.warn("[chats] reply", error);
    return null;
  }
}

/** Put a thread away from the Chats list (or bring it back). Never rejects. */
export async function setThreadArchived(threadId: string, archived: boolean): Promise<void> {
  try {
    await store.setArchived(threadId, archived, Date.now());
    notifyChats();
  } catch (error) {
    console.warn("[chats] archive", error);
  }
}

/** Replay a thread: its messages are cleared and the teacher opens it again. Never rejects. */
export async function restartThread(threadId: string): Promise<ThreadView | null> {
  try {
    const thread = await store.getThread(threadId);
    if (!thread) return null;
    const nodes = await loadChatNodes();
    const entry = nodes.find((n) => n.id === thread.entryNodeId);
    if (!entry) return null;
    const now = Date.now();
    // Replaying an archived thread brings it back to the list
    if (thread.archived) await store.setArchived(threadId, false, now);
    await store.restart(threadId, now);
    const added = await sayNode(threadId, thread.npcId, entry, now + 1, true);
    notifyChats();
    const fresh = (await store.getThread(threadId)) ?? thread;
    return viewOf(fresh, nodes, await store.list(threadId), added);
  } catch (error) {
    console.warn("[chats] restart", error);
    return null;
  }
}

/**
 * Call once per app open (the app root does, with the daily tracker): remembers the day, and when the learner has been
 * away `WELCOME_BACK_MIN_DAYS` or more, that today is a return, so a teacher can welcome them back. Never rejects.
 */
export async function recordChatAppOpen(): Promise<void> {
  try {
    const today = localDayKey(Date.now());
    const last = await getChatLastOpen();
    await setChatLastOpen(today);
    if (last && isDayKey(last) && daysBetween(last, today) >= WELCOME_BACK_MIN_DAYS && (await getChatReturned()) !== today) {
      await setChatReturned(today);
      notifyChats();
    }
  } catch (error) {
    console.warn("[chats] app open", error);
  }
}

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------

/** "Take me to my next lesson": the next open lesson of the teacher's unit, else where the learner is on the map, else Home. */
async function nextLessonRoute(npcId: string): Promise<string> {
  try {
    const { units, nodes, state } = await loadPathSnapshot();
    const unit = units.find((u) => u.teacherNpcId === npcId);
    const open = (n: (typeof nodes)[number]) => state.nodes[n.id] === "current" || state.nodes[n.id] === "available";
    const inUnit = unit ? nodes.filter((n) => n.unitId === unit.id && n.kind === "lesson" && open(n)).sort((a, b) => a.position - b.position)[0] : undefined;
    const target = inUnit ?? nodes.find((n) => n.id === state.currentNodeId);
    if (!target) return "/(tabs)";
    return target.kind === "lesson" && target.lessonId ? `/lesson/${target.lessonId}` : `/practice/${target.id}`;
  } catch {
    return "/(tabs)";
  }
}

/** The route a reply's action opens. */
export async function routeForAction(action: ChatAction, npcId: string): Promise<string> {
  switch (action.screen) {
    case "next-lesson":
      return nextLessonRoute(npcId);
    case "lesson":
      return `/lesson/${action.id}`;
    case "practice":
      return `/practice/${action.id}`;
    case "entry":
      return `/explorer/encyclopedia-entry?id=${action.id}`;
    case "mythbuster": {
      let unit = action.id;
      if (!unit) unit = (await contentRepository.getUnits().catch(() => [])).find((u) => u.teacherNpcId === npcId)?.id;
      return unit ? `/mythbuster?mode=quick&unit=${encodeURIComponent(unit)}` : "/mythbuster";
    }
    case "app":
      return PHONE_APPS.find((a) => a.id === action.id && a.status === "live")?.route ?? "/(tabs)/phone";
  }
}
