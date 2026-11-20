/**
 * The NPC feed at runtime (docs/features/NPC_FEED_SPEC.md §7.3). The cast posts about what the learner really
 * did; mini blog pieces appear as blog cards when they unlock; the learner can only react.
 * Nothing here is sent anywhere. The rules are in the framework-free cores (`feed-core`,
 * `social-core`, `blog-core`, `rank-core`); the SQL is in `feed-store-core`; this file is the glue.
 *
 * THE RULE FOR CALLERS: the `emit*` functions are what the rest of the app calls at its choke points
 * (`completeNode`, `openChest`, ...). They return at once, never throw and never reject: the work runs
 * later, in one queue, inside try/catch with a console warning on failure. A feed problem can never
 * fail or delay the action that caused it.
 *
 * Screens use (all async functions never reject unless noted):
 *   getFeed() / subscribeFeed() / markSeen(ids) / getUnseenCount()      the Discover list and the tab dot
 *   react() / toggleReaction() / getReactionSummary()                   the learner's one reaction
 *   getBlogView(id) / markBlogRead(id) / ensureBlogCards()              the reader and the unlocks
 *   getWeeklyRanking()                                                  the ranks screen and entry card
 *   getFeedPostsEnabled() / setFeedPostsEnabled() / subscribeFeedPostsEnabled()   the Settings switch
 * and the hook `useFeed` in `hooks/use-feed.ts`. There is no function to write a comment.
 */

import { getAllNpcs, type Npc } from "@/content/npcs";
import type { BlogComment, BlogPost, FeedChipKind, FeedTemplate, Reaction } from "@/content/types";
import type { Reference } from "@/content/curriculum/types";
import { addDays, dayKeyFromLocalDate, daysBetween, isDayKey } from "@/services/activity-core";
import { recordActivity } from "@/services/activity-log";
import { isUnlocked, type UnlockProgress } from "@/services/blog-core";
import { contentRepository } from "@/services/content-db";
import { getAllLevels, getDatabase, getUserProfile } from "@/services/database";
import {
  COMEBACK_MIN_DAYS,
  STREAK_THRESHOLDS,
  eventDedupeKey,
  planBlogCard,
  planPost,
  reconcileEvents,
  type FeedEvent,
  type FeedValues,
  type PlanResult,
  type RankDirection,
} from "@/services/feed-core";
import { createFeedQueue } from "@/services/feed-queue-core";
import * as store from "@/services/feed-store";
import type { StoredFeedPost, StoredReaction } from "@/services/feed-store";
import { computePathState } from "@/services/path-core";
import { LEARNER_ID, dayOfWeek, previousWeekKeys, rankChange, weekKeyOfDay, weeklyRanking, type RankRow } from "@/services/rank-core";
import type { Rng } from "@/services/rng-core";
import {
  isReaction,
  summarizeReactions,
  toggleUserReaction,
  type ReactionSummary,
  type ReactionTargetType,
} from "@/services/social-core";
import { STORAGE_KEYS, getFeedPostsEnabled, getItem, setItem } from "@/services/storage";

export {
  getFeedPostsEnabled,
  setFeedPostsEnabled,
  subscribeFeedPostsEnabled,
} from "@/services/storage";
export type { FeedEvent, RankDirection } from "@/services/feed-core";
export type { ReactionSummary, ReactionTargetType } from "@/services/social-core";
export type { Reaction, BlogPost, BlogComment } from "@/content/types";

/* ------------------------------------------------------------------ */
/* Plumbing: one queue, change notifications, failure isolation         */
/* ------------------------------------------------------------------ */

const warn = (what: string, error: unknown) => {
  console.warn(`[feed] ${what}`, error);
};

const { enqueue, defer } = createFeedQueue({ warn });

const listeners = new Set<() => void>();

/** Called after the feed changes (a post, a reaction, a seen mark). Returns the way to stop listening. */
export function subscribeFeed(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** While > 0 (a reconcile making many posts), changes are counted and announced once at the end. */
let quiet = 0;
let missed = false;

const notify = () => {
  if (quiet > 0) {
    missed = true;
    return;
  }
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A listener's failure never breaks the feed.
    }
  });
};

/** Content that does not change while the app runs, read once (a failed read is not remembered). */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (!cached) {
      cached = load().catch((error) => {
        cached = null;
        throw error;
      });
    }
    return cached;
  };
}

const loadTemplates = once<FeedTemplate[]>(() => contentRepository.getFeedTemplates());
const loadBlogs = once<BlogPost[]>(() => contentRepository.getBlogPosts());

/** A bundled database from before the feed tables has no templates or pieces: the feed is just empty. */
const orEmpty = async <T>(load: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await load();
  } catch {
    return [];
  }
};

const dayKeyOf = (ms: number): string => dayKeyFromLocalDate(new Date(ms));
const newId = (now: number): string => `fp_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ */
/* Progress, as unlocks and the path see it                            */
/* ------------------------------------------------------------------ */

interface LevelRow {
  id: string;
  unit_id?: string | null;
  type?: string | null;
  status?: string | null;
  stars?: number | null;
  completed_at?: string | null;
}

async function loadProgress() {
  const [units, nodes, levels, profile] = await Promise.all([
    contentRepository.getUnits(),
    contentRepository.getPathNodes(),
    getAllLevels() as Promise<LevelRow[]>,
    getUserProfile() as Promise<{ total_xp?: number; current_streak?: number; longest_streak?: number; display_name?: string; username?: string } | null>,
  ]);
  const completed = new Set<string>();
  const testedOut = new Set<string>();
  for (const l of levels) {
    if (l.status !== "completed") continue;
    if (l.type === "testout") testedOut.add(l.unit_id || l.id.replace(/^testout:/, ""));
    else completed.add(l.id);
  }
  const state = computePathState(units, nodes, completed, testedOut);
  const unlock: UnlockProgress = {
    completedLessonIds: new Set(nodes.filter((n) => n.kind === "lesson" && n.lessonId && completed.has(n.id)).map((n) => n.lessonId as string)),
    completedUnitIds: new Set(units.filter((u) => state.units[u.id]?.completed).map((u) => u.id)),
    streak: Math.max(profile?.current_streak ?? 0, profile?.longest_streak ?? 0),
  };
  return { units, nodes, levels, completed, testedOut, state, unlock, profile };
}

/* ------------------------------------------------------------------ */
/* Creating posts                                                      */
/* ------------------------------------------------------------------ */

export interface PostOptions {
  /** The clock, for tests. */
  now?: number;
  /** The random source, for tests (the default is `Math.random`). */
  rng?: Rng;
}

async function buildValues(event: FeedEvent, npcs: readonly Npc[]): Promise<FeedValues> {
  const profile = (await getUserProfile().catch(() => null)) as { display_name?: string; username?: string } | null;
  const values: FeedValues = { name: profile?.display_name || profile?.username || "Scientist" };
  const f = event as { unitId?: string; lessonId?: string; days?: number; npcId?: string };
  if (f.unitId) values.unit = (await contentRepository.getUnitById(f.unitId).catch(() => null))?.title;
  if (f.lessonId) values.lesson = (await contentRepository.getLessonById(f.lessonId).catch(() => null))?.title;
  if (f.days !== undefined) values.days = f.days;
  if (f.npcId) values.rival = npcs.find((n) => n.id === f.npcId)?.name;
  return values;
}

/** Create the post for one event, if a template fits and the rules let it through. Runs inside the queue. */
async function processEvent(event: FeedEvent, options: PostOptions = {}): Promise<boolean> {
  try {
    if (event.type === "streak" && !(STREAK_THRESHOLDS as readonly number[]).includes(event.days)) return false;
    if (!(await getFeedPostsEnabled())) return false;
    const now = options.now ?? Date.now();
    const dayKey = dayKeyOf(now);
    const [templates, npcs, metas, keys] = await Promise.all([orEmpty(() => loadTemplates()), getAllNpcs(), store.listPostMeta(), store.listDedupeKeys()]);
    if (keys.includes(eventDedupeKey(event, dayKey))) return false;
    const plan: PlanResult = planPost({
      postId: newId(now),
      event,
      now,
      templates,
      history: { dayKey, dedupeKeys: new Set(keys), recentTemplateIds: metas.flatMap((m) => (m.templateId ? [m.templateId] : [])) },
      npcs,
      values: await buildValues(event, npcs),
      rng: options.rng ?? Math.random,
    });
    if (!plan.ok) return false;
    const inserted = await store.insertPost(plan.post, plan.reactions, plan.target);
    if (inserted) notify();
    return inserted;
  } catch (error) {
    warn(`post for ${event.type}`, error);
    return false;
  }
}

/** Create blog cards for unlocked pieces that have none yet. Runs inside the queue. Not muted by the Settings switch. */
async function createBlogCards(options: PostOptions = {}): Promise<number> {
  try {
    const blogs = await orEmpty(() => loadBlogs());
    if (blogs.length === 0) return 0;
    const [existing, npcs, progress] = await Promise.all([store.listBlogCardIds(), getAllNpcs(), loadProgress()]);
    const have = new Set(existing);
    const keys = new Set(await store.listDedupeKeys());
    const now = options.now ?? Date.now();
    let created = 0;
    for (const blog of blogs) {
      if (have.has(blog.id) || !isUnlocked(blog, progress.unlock)) continue;
      // Pieces unlocked together keep reading order: the first is the newest.
      const plan = planBlogCard({ postId: newId(now), blog, now: now - created, history: { dedupeKeys: keys }, npcs });
      if (!plan.ok) continue;
      if (await store.insertPost(plan.post, plan.reactions, plan.target)) created += 1;
    }
    if (created > 0) notify();
    return created;
  } catch (error) {
    warn("blog cards", error);
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Hooks for the app's choke points (fire-and-forget)                  */
/* ------------------------------------------------------------------ */

const OPENS_BLOGS = new Set<FeedEvent["type"]>(["lesson_complete", "unit_complete", "testout_pass", "streak", "first_lesson", "checkpoint_pass"]);

/** Build a post from an event. Awaitable, never rejects; resolves `true` when a post was created. Tests and tools only: the app uses `emitFeedEvent`. */
export function onFeedEvent(event: FeedEvent, options: PostOptions = {}): Promise<boolean> {
  return enqueue(`event ${event.type}`, async () => {
    const created = await processEvent(event, options);
    if (OPENS_BLOGS.has(event.type)) await createBlogCards(options);
    return created;
  }).then((r) => r ?? false);
}

/** Fire-and-forget `onFeedEvent` for the app's choke points: returns at once, never throws. */
export function emitFeedEvent(event: FeedEvent): void {
  defer(`event ${event.type}`, async () => {
    await processEvent(event);
    if (OPENS_BLOGS.has(event.type)) await createBlogCards();
  });
}

/** A path node was completed for the first time (called by `completeNode`). Fire-and-forget. */
export interface NodeCompletedInfo {
  nodeId: string;
  unitId: string;
  kind: "lesson" | "practice" | "checkpoint";
  lessonId?: string;
  perfect: boolean;
}

export function emitNodeCompleted(info: NodeCompletedInfo): void {
  defer("node completed", async () => {
    try {
      const progress = await loadProgress();
      const unitNodes = progress.nodes.filter((n) => n.unitId === info.unitId).sort((a, b) => a.position - b.position);
      const hasCheckpoint = unitNodes.some((n) => n.kind === "checkpoint");
      const closesUnit =
        !!progress.state.units[info.unitId]?.completed &&
        (hasCheckpoint ? info.kind === "checkpoint" : unitNodes[unitNodes.length - 1]?.id === info.nodeId);

      if (info.kind === "lesson" && info.lessonId) {
        const lessons = progress.nodes.filter((n) => n.kind === "lesson" && progress.completed.has(n.id)).length;
        const lesson: FeedEvent = { type: "lesson_complete", unitId: info.unitId, lessonId: info.lessonId, perfect: info.perfect };
        if (lessons === 1) {
          // The very first lesson says hello; fall back to the ordinary lesson post when there is no such template.
          if (!(await processEvent({ type: "first_lesson", unitId: info.unitId, lessonId: info.lessonId }))) await processEvent(lesson);
        } else {
          await processEvent(lesson);
        }
      }
      // Passing a checkpoint posts, and so does closing the unit (usually the same moment): each is its own post.
      if (info.kind === "checkpoint") await processEvent({ type: "checkpoint_pass", unitId: info.unitId });
      if (closesUnit) await processEvent({ type: "unit_complete", unitId: info.unitId });
    } catch (error) {
      warn("node completed", error);
    }
    // Anything the live events above missed (a failed write) is made from progress, the way chats are.
    await reconcileNow().catch((error) => warn("reconcile after node", error));
  });
}

/**
 * Post whatever real progress says happened but has no post yet (a trigger that did not fire, a write
 * that failed, lessons finished before the feed existed). Safe to call as often as you like: events
 * already posted are skipped by their dedupe key. Posts are dated when the thing happened, oldest
 * first, so the list reads in order. Resolves with how many posts were made; never rejects. Respects
 * the Settings switch like every other post, and (re)creates blog cards at the end.
 */
export function reconcileFeed(): Promise<number> {
  return enqueue("reconcile", reconcileNow).then((n) => n ?? 0);
}

/** The body of `reconcileFeed`, for code that is already inside the queue (awaiting `reconcileFeed` from there would wait on itself). */
async function reconcileNow(): Promise<number> {
  quiet += 1;
  try {
    return await reconcileBody();
  } finally {
    quiet -= 1;
    if (quiet === 0 && missed) {
      missed = false;
      notify(); // one announcement for however many posts were made, so lists reload once
    }
  }
}

async function reconcileBody(): Promise<number> {
  const now = Date.now();
  let made = 0;
  if (await getFeedPostsEnabled()) {
    const progress = await loadProgress();
    const keys = await store.listDedupeKeys();
    const stars = new Map<string, number>();
    const completedAt = new Map<string, number>();
    for (const l of progress.levels) {
      if (l.status !== "completed") continue;
      stars.set(l.id, l.stars ?? 0);
      const t = l.completed_at ? Date.parse(l.completed_at) : NaN;
      if (Number.isFinite(t) && t <= now) completedAt.set(l.id, t);
    }
    const items = reconcileEvents(
      {
        unitIds: progress.units.map((u) => u.id),
        nodes: progress.nodes.map((n) => ({ id: n.id, unitId: n.unitId, kind: n.kind, position: n.position, lessonId: n.lessonId })),
        completed: progress.completed,
        testedOut: progress.testedOut,
        completedUnits: new Set(progress.unlock.completedUnitIds),
        stars,
        completedAt,
        streak: progress.unlock.streak,
      },
      keys,
      dayKeyOf(now),
    );
    // Strictly increasing times keep the order; an unknown time is "just now", after everything dated.
    let last = 0;
    for (const item of items) {
      const at = Math.max(item.at ?? now - items.length, last + 1);
      last = at;
      let created = await processEvent(item.event, { now: at });
      if (!created && item.fallback) created = await processEvent(item.fallback, { now: at });
      if (created) made += 1;
    }
  }
  made += await createBlogCards();
  return made;
}

const RECONCILE_MIN_GAP_MS = 20_000;
let lastReconcileAt = 0;

/**
 * `reconcileFeed`, at most once every 20 s unless `force`: the feed fills itself from progress the way chats
 * do (lessons, units, checkpoints, streaks), so a post whose live event was lost still appears without the
 * learner opening Discover. Call it where progress may have changed: app open, returning to the foreground,
 * the tab bar loading. Never rejects.
 */
export function reconcileFeedSoon(force = false): Promise<number> {
  const now = Date.now();
  if (!force && now - lastReconcileAt < RECONCILE_MIN_GAP_MS) return Promise.resolve(0);
  lastReconcileAt = now;
  return reconcileFeed();
}

/** The learner's streak changed (called where `current_streak` is updated). Only 3, 7, 14, 30, 60 and 100 post. */
export const emitStreak = (days: number): void => emitFeedEvent({ type: "streak", days });

/* ---- the app-open check: comeback, retention ---- */

/**
 * Call once per app open (the app root does, through the daily tracker). Deletes old rows beyond the
 * retention rule and posts a `comeback` when the learner was away 3 or more days. Never rejects.
 */
export function checkFeedOnAppOpen(): Promise<void> {
  return enqueue("app open", async () => {
    const today = dayKeyOf(Date.now());
    const last = await getItem<string>(STORAGE_KEYS.FEED_LAST_OPEN);
    await setItem(STORAGE_KEYS.FEED_LAST_OPEN, today);
    await store.cleanup();
    if (typeof last !== "string" || !isDayKey(last)) return;
    const away = daysBetween(last, today);
    if (away < COMEBACK_MIN_DAYS) return;
    // Someone who has learned something before. (The profile's `lessons_completed` is never raised by the app, so the saved path nodes and XP say it instead.)
    const progress = await loadProgress();
    if (progress.completed.size > 0 || progress.profile?.total_xp) await processEvent({ type: "comeback", days: away });
  }).then(() => undefined);
}

/* ---- ranking ---- */

export interface WeeklyRankRow extends RankRow {
  /** Display name: the learner's own, or the NPC's. */
  name: string;
  /** Set for a rival (to draw their head). */
  npcId: string | null;
}

export interface WeeklyRanking {
  /** The Monday that starts the week, `YYYY-MM-DD`. */
  weekKey: string;
  /** 1 (Monday) to 7 (Sunday): how far into the week it is. */
  daysElapsed: number;
  /** Everyone, best first (the learner among the 7 rivals). */
  rows: WeeklyRankRow[];
  learner: WeeklyRankRow;
  learnerRank: number;
}

async function weeklyXp(weekKey: string): Promise<{ learnerXp: number; pace: number }> {
  const db = getDatabase();
  const sum = async (from: string, to: string): Promise<number> =>
    (await db.getFirstAsync<{ xp: number }>("SELECT COALESCE(SUM(xp_earned), 0) AS xp FROM daily_activity WHERE date BETWEEN ? AND ?", [from, to]))?.xp ?? 0;
  const learnerXp = await sum(weekKey, addDays(weekKey, 6));
  // The learner's usual week: the average of up to 4 earlier weeks, counted from their first active day.
  const first = (await db.getFirstAsync<{ d: string | null }>("SELECT MIN(date) AS d FROM daily_activity WHERE xp_earned > 0"))?.d;
  if (!first || !isDayKey(first) || first >= weekKey) return { learnerXp, pace: 0 };
  const weeks = Math.min(4, Math.max(1, Math.ceil(daysBetween(first, weekKey) / 7)));
  const earlier = await sum(previousWeekKeys(weekKey, weeks)[weeks - 1], addDays(weekKey, -1));
  return { learnerXp, pace: earlier / weeks };
}

/** This week's ranking: the learner's real XP against the simulated NPC rivals. Same result on every call within a day. */
export async function getWeeklyRanking(now: number = Date.now()): Promise<WeeklyRanking> {
  const dayKey = dayKeyOf(now);
  const weekKey = weekKeyOfDay(dayKey);
  const daysElapsed = dayOfWeek(dayKey);
  const [npcs, { learnerXp, pace }, profile] = await Promise.all([
    getAllNpcs(),
    weeklyXp(weekKey),
    getUserProfile().catch(() => null) as Promise<{ display_name?: string; username?: string } | null>,
  ]);
  const learnerName = profile?.display_name || profile?.username || "You";
  const rows: WeeklyRankRow[] = weeklyRanking(learnerXp, npcs.map((n) => n.id), weekKey, pace, daysElapsed).map((r) => ({
    ...r,
    name: r.isLearner ? learnerName : (npcs.find((n) => n.id === r.id)?.name ?? r.id),
    npcId: r.isLearner ? null : r.id,
  }));
  const learner = rows.find((r) => r.isLearner) as WeeklyRankRow;
  return { weekKey, daysElapsed, rows, learner, learnerRank: learner.rank };
}

interface RankState {
  weekKey: string;
  order: string[];
}

/**
 * Compare the ranking with the last check and post a `rank_change` when the learner passed a rival or
 * was passed. Every change is its own post. Never rejects. Call after XP changes (`emitRankCheck`) or when
 * Discover opens.
 */
export function checkRankChange(): Promise<void> {
  return enqueue("rank change", rankCheckNow).then(() => undefined);
}

/** The body of `checkRankChange`, for code already inside the queue (`emitRankCheck` is: queueing again from there waits behind itself and wedges the whole feed). */
async function rankCheckNow(): Promise<void> {
  if (!(await getFeedPostsEnabled())) return;
  const now = Date.now();
  const ranking = await getWeeklyRanking(now);
  if (ranking.learner.xp <= 0) return; // nothing to celebrate or to lose yet
  const order = ranking.rows.map((r) => r.id);
  const saved = await getItem<RankState>(STORAGE_KEYS.FEED_RANK_STATE);
  if (!saved || saved.weekKey !== ranking.weekKey || !Array.isArray(saved.order)) {
    await setItem(STORAGE_KEYS.FEED_RANK_STATE, { weekKey: ranking.weekKey, order } satisfies RankState);
    return;
  }
  const change = rankChange(saved.order.map((id) => ({ id })), ranking.rows);
  if (change.type === "none") {
    await setItem(STORAGE_KEYS.FEED_RANK_STATE, { ...saved, order } satisfies RankState);
    return;
  }
  await processEvent({ type: "rank_change", direction: change.direction as RankDirection, npcId: change.npcId, at: now });
  await setItem(STORAGE_KEYS.FEED_RANK_STATE, { weekKey: ranking.weekKey, order } satisfies RankState);
}

/** Fire-and-forget `checkRankChange` for the XP choke point. */
export function emitRankCheck(): void {
  defer("rank check", rankCheckNow);
}

/* ------------------------------------------------------------------ */
/* Reading the feed                                                    */
/* ------------------------------------------------------------------ */

export interface FeedBlogInfo {
  id: string;
  title: string;
  hook: string;
  /** A lesson figure or object id from the existing art. */
  cover: string;
  readMin: number;
  /** The author. */
  npcId: string;
  unitId: string | null;
  lessonId: string | null;
  /** How many NPC comments the piece has (0 for none). */
  commentCount: number;
}

export interface FeedItem {
  /** `feed_posts.id`; pass to `markSeen`. */
  id: string;
  /** What `react` takes: the post, or the blog piece for a blog card. */
  target: { type: ReactionTargetType; id: string };
  /** The poster, or the author of a blog card. */
  npcId: string;
  /** The template kind (`celebrate`, `milestone`, `nudge`, `tease`); `blog` for a blog card. */
  kind: string;
  /** The rendered text (a blog card's is the hook). */
  text: string;
  /** Set for a blog card, with what the card shows. */
  blog: FeedBlogInfo | null;
  /** What the chip opens: `lesson` and `unit` carry an id, `quests` and `ranks` do not. */
  chip: { kind: FeedChipKind; target: string | null } | null;
  createdAt: number;
  seen: boolean;
  reactions: ReactionSummary;
}

const toItem = (post: StoredFeedPost, blog: BlogPost | undefined, commentCount = 0): FeedItem => ({
  id: post.id,
  target: post.blogId ? { type: "blog", id: post.blogId } : { type: "post", id: post.id },
  npcId: post.npcId,
  kind: post.kind,
  text: post.text,
  blog: blog
    ? { id: blog.id, title: blog.title, hook: blog.hook, cover: blog.cover, readMin: blog.readMin, npcId: blog.npcId, unitId: blog.unitId, lessonId: blog.lessonId, commentCount }
    : null,
  chip: post.chipKind ? { kind: post.chipKind, target: post.chipTarget } : null,
  createdAt: post.createdAt,
  seen: post.seenAt !== null,
  reactions: summarizeReactions(post.reactions),
});

/**
 * The feed, newest first: posts and blog cards with their reactions. A muted feed still returns what
 * exists. A blog card whose piece is no longer in the content is left out. Rejects only if the
 * user-state database cannot be read.
 */
export async function getFeed(): Promise<FeedItem[]> {
  const [posts, blogs] = await Promise.all([store.listPosts(), orEmpty(() => loadBlogs())]);
  const byId = new Map(blogs.map((b) => [b.id, b]));
  const counts = new Map<string, number>();
  await Promise.all(
    posts.flatMap((p) => (p.blogId && byId.has(p.blogId) && !counts.has(p.blogId) ? [p.blogId] : [])).map(async (id) => {
      counts.set(id, 0);
      counts.set(id, (await orEmpty(() => contentRepository.getBlogComments(id))).length);
    }),
  );
  return posts.flatMap((p) => {
    const blog = p.blogId ? byId.get(p.blogId) : undefined;
    return p.blogId && !blog ? [] : [toItem(p, blog, p.blogId ? (counts.get(p.blogId) ?? 0) : 0)];
  });
}

/** Mark posts as seen (as they scroll into view). Clears the tab dot as the count drops. Never rejects. */
export function markSeen(ids: readonly string[]): Promise<void> {
  return enqueue("mark seen", async () => {
    if ((await store.markSeen(ids, Date.now())) > 0) notify();
  }).then(() => undefined);
}

/** Posts not yet seen: the number behind the dot on the Feed tab. 0 while the feed is muted. Never rejects. */
export async function getUnseenCount(): Promise<number> {
  try {
    if (!(await getFeedPostsEnabled())) return 0;
    return await store.countUnseen();
  } catch (error) {
    warn("unseen count", error);
    return 0;
  }
}

/** Create blog cards for pieces that are unlocked and have none. Call when Discover opens; completions call it themselves. Resolves with how many were created; never rejects. */
export function ensureBlogCards(): Promise<number> {
  return enqueue("ensure blog cards", () => createBlogCards()).then((n) => n ?? 0);
}

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

/** Everyone who reacted to a target, summarised, with the learner's own reaction in `mine`. */
/** Who reacted to a post or blog piece, and with what (read-only; for the "who reacted" sheet). */
export async function getReactors(targetType: ReactionTargetType, targetId: string): Promise<StoredReaction[]> {
  return store.getReactions(targetType, targetId);
}

export async function getReactionSummary(targetType: ReactionTargetType, targetId: string): Promise<ReactionSummary> {
  return summarizeReactions(await store.getReactions(targetType, targetId));
}

/**
 * Set the learner's one reaction on a target, or clear it with `null`. NPCs never respond. Resolves
 * with the new summary; rejects only if the database cannot be written.
 */
export async function react(targetType: ReactionTargetType, targetId: string, reaction: Reaction | null): Promise<ReactionSummary> {
  if (reaction !== null && !isReaction(reaction)) throw new Error(`Unknown reaction ${String(reaction)}`);
  await store.setUserReaction(targetType, targetId, reaction, Date.now());
  notify();
  return getReactionSummary(targetType, targetId);
}

/** What a tap on a reaction button does: sets it, changes to it, or (the same one again) clears it. Resolves with the new summary. */
export async function toggleReaction(targetType: ReactionTargetType, targetId: string, reaction: Reaction): Promise<ReactionSummary> {
  const current = await store.getUserReaction(targetType, targetId);
  return react(targetType, targetId, toggleUserReaction(current, reaction).next);
}

/* ------------------------------------------------------------------ */
/* The blog reader                                                     */
/* ------------------------------------------------------------------ */

export interface BlogView {
  blog: BlogPost;
  /** NPC comments authored with the piece, in order; empty for a piece without any. Read-only. */
  comments: BlogComment[];
  references: Reference[];
  /** Ids of lessons whose path node is still locked for this learner (a comment's lesson link stays shut for these). */
  lockedLessonIds: string[];
  /** False if the learner has not unlocked it (the reader should not show it). */
  unlocked: boolean;
  /** When it was first opened, or `null` (not yet recorded). */
  readAt: number | null;
  reactions: ReactionSummary;
}

/** One piece with everything the reader shows, or `null` when the id is unknown. Rejects only if the content or database cannot be read. */
export async function getBlogView(blogId: string): Promise<BlogView | null> {
  const blog = await contentRepository.getBlogPost(blogId);
  if (!blog) return null;
  const [comments, references, progress, reads, reactions] = await Promise.all([
    contentRepository.getBlogComments(blogId),
    contentRepository.getBlogReferences(blogId),
    loadProgress(),
    store.listBlogReads(),
    getReactionSummary("blog", blogId),
  ]);
  return {
    blog,
    comments,
    references,
    lockedLessonIds: progress.nodes
      .filter((n) => n.kind === "lesson" && n.lessonId && progress.state.nodes[n.id] === "locked")
      .map((n) => n.lessonId as string),
    unlocked: isUnlocked(blog, progress.unlock),
    readAt: reads.find((r) => r.blogId === blogId)?.readAt ?? null,
    reactions,
  };
}

/** One unlocked piece in the Blogs list. */
export interface UnlockedBlog {
  id: string;
  title: string;
  hook: string;
  cover: string;
  readMin: number;
  /** The author. */
  npcId: string;
  /** False until the learner has opened it. */
  read: boolean;
}

/** Every piece the learner has unlocked, in reading order, for the Blogs list (so a card that scrolled away is never lost). Rejects only if the content or database cannot be read. */
export async function getUnlockedBlogs(): Promise<UnlockedBlog[]> {
  const [blogs, progress, reads] = await Promise.all([orEmpty(() => loadBlogs()), loadProgress(), store.listBlogReads()]);
  const read = new Set(reads.map((r) => r.blogId));
  return blogs
    .filter((b) => isUnlocked(b, progress.unlock))
    .sort((a, b) => a.position - b.position)
    .map((b) => ({ id: b.id, title: b.title, hook: b.hook, cover: b.cover, readMin: b.readMin, npcId: b.npcId, read: read.has(b.id) }));
}

/** The learner opened a piece: remember it and record a `blog_read` activity. Resolves `true` the first time. Never rejects. */
export function markBlogRead(blogId: string): Promise<boolean> {
  return enqueue("blog read", async () => {
    const first = await store.recordBlogRead(blogId, Date.now());
    recordActivity("blog_read", { id: blogId });
    if (first) notify();
    return first;
  }).then((r) => r ?? false);
}

export { LEARNER_ID };
