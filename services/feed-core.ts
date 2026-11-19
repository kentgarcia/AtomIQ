/**
 * The NPC feed, the framework-free part (docs/NPC_FEED_SPEC.md §5, §7.2, §8): which template an
 * event picks and how its text is rendered. There are no pacing rules: every event that has a template posts.
 * No storage and no React, so `scripts/test-feed.mjs` runs it under Node. `services/feed.ts` adds
 * the storage and the hooks into the app.
 *
 * Everything random takes an injected `Rng` (`services/rng-core.ts`), so a test can fix the outcome.
 */

import type {
  FeedChipKind,
  FeedKind,
  FeedPlaceholder,
  FeedTemplate,
  FeedTrigger,
  BlogPost,
  Reaction,
} from "../content/types.ts";
import { pickWeighted, type Rng } from "./rng-core.ts";
import { planReactions, type PlannedReaction } from "./social-core.ts";

/* ------------------------------------------------------------------ */
/* Vocabulary (mirrors spec §5.1 and §6)                               */
/* ------------------------------------------------------------------ */

/** Every trigger key. */
export const FEED_TRIGGERS = [
  "lesson_complete",
  "checkpoint_pass",
  "unit_complete",
  "testout_pass",
  "streak",
  "chest_opened",
  "first_lesson",
  "comeback",
  "daily_quests_done",
  "blog_unlocked",
  "rank_change",
] as const satisfies readonly FeedTrigger[];

/** The triggers a template can have (a blog card's text is the piece's hook, so `blog_unlocked` has none). */
export const TEMPLATE_TRIGGERS = FEED_TRIGGERS.filter((t) => t !== "blog_unlocked") as Exclude<FeedTrigger, "blog_unlocked">[];

/**
 * A template whose poster pool is `["learner"]` is written from the learner's point of view ("I kept a
 * 7 day streak"): the post carries this id as its poster and the feed draws the learner's own avatar and name.
 */
export const LEARNER_POSTER = "learner";

export const FEED_KINDS = ["celebrate", "milestone", "nudge", "tease"] as const satisfies readonly FeedKind[];
export const FEED_CHIPS = ["lesson", "unit", "quests", "ranks"] as const satisfies readonly FeedChipKind[];
export const FEED_PLACEHOLDERS = ["lesson", "unit", "days", "rival", "name"] as const satisfies readonly FeedPlaceholder[];

/** The placeholders each trigger can supply a value for. A template may use only these. Mirrors `scripts/lib/feed-vocab.mjs`. */
export const PLACEHOLDERS_BY_TRIGGER: Record<FeedTrigger, readonly FeedPlaceholder[]> = {
  lesson_complete: ["lesson", "unit", "name"],
  checkpoint_pass: ["unit", "name"],
  unit_complete: ["unit", "name"],
  testout_pass: ["unit", "name"],
  streak: ["days", "name"],
  chest_opened: ["name"],
  first_lesson: ["lesson", "unit", "name"],
  comeback: ["name"],
  daily_quests_done: ["name"],
  blog_unlocked: [],
  rank_change: ["rival", "name"],
};

/** Streak lengths that make a post. */
export const STREAK_THRESHOLDS = [3, 7, 14, 30, 60, 100] as const;

/** A comeback post needs this many days away. */
export const COMEBACK_MIN_DAYS = 3;

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** Something the learner did that may become a post (spec §5.1). */
export type FeedEvent =
  | { type: "lesson_complete"; unitId: string; lessonId: string; perfect: boolean }
  | { type: "checkpoint_pass"; unitId: string }
  | { type: "unit_complete"; unitId: string }
  | { type: "testout_pass"; unitId: string }
  | { type: "streak"; days: number }
  | { type: "chest_opened"; period: "daily" | "weekly" }
  | { type: "first_lesson"; unitId?: string; lessonId?: string }
  | { type: "comeback"; days: number }
  | { type: "daily_quests_done" }
  | { type: "rank_change"; direction: RankDirection; npcId: string; /** When the change was noticed: each change is its own post. */ at?: number };

/** `passed`: the learner overtook the rival. `passed_by`: the rival overtook the learner. */
export type RankDirection = "passed" | "passed_by";

export const eventTrigger = (event: FeedEvent): FeedTrigger => event.type;

/** The event's fields, matched against a template's `condition`. */
export function eventFields(event: FeedEvent): Record<string, unknown> {
  switch (event.type) {
    case "lesson_complete":
      return { unitId: event.unitId, lessonId: event.lessonId, perfect: event.perfect };
    case "checkpoint_pass":
    case "unit_complete":
    case "testout_pass":
      return { unitId: event.unitId };
    case "streak":
      return { days: event.days };
    case "chest_opened":
      return { period: event.period };
    case "first_lesson":
      return { unitId: event.unitId, lessonId: event.lessonId };
    case "comeback":
      return { days: event.days };
    case "rank_change":
      return { direction: event.direction, npcId: event.npcId };
    case "daily_quests_done":
      return {};
  }
}

/** Replays never post twice: this key is unique in `feed_posts` (spec §5.1). `dayKey` is the local day, `YYYY-MM-DD`. */
export function eventDedupeKey(event: FeedEvent, dayKey: string): string {
  switch (event.type) {
    case "lesson_complete":
      return `lesson:${event.lessonId}`;
    case "checkpoint_pass":
      return `checkpoint:${event.unitId}`;
    case "unit_complete":
      return `unit:${event.unitId}`;
    case "testout_pass":
      return `testout:${event.unitId}`;
    case "streak":
      return `streak:${event.days}`;
    case "chest_opened":
      return `chest:${event.period}:${dayKey}`;
    case "first_lesson":
      return "first-lesson";
    case "comeback":
      return `comeback:${dayKey}`;
    case "daily_quests_done":
      return `quests:${dayKey}`;
    case "rank_change":
      return `rank:${event.npcId}:${event.direction}:${event.at ?? dayKey}`;
  }
}

/** Where a chip of this kind goes for this event, or `null` when the event has no such target. */
export function chipTargetFor(chip: FeedChipKind | null, event: FeedEvent): string | null {
  if (!chip) return null;
  const f = eventFields(event);
  if (chip === "lesson") return typeof f.lessonId === "string" ? f.lessonId : null;
  if (chip === "unit") return typeof f.unitId === "string" ? f.unitId : null;
  return null;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export type FeedValues = Partial<Record<FeedPlaceholder, string | number>>;

const PLACEHOLDER_RE = /\{([^{}]*)\}/g;

/** The placeholder names used in a text, in order of appearance (duplicates kept). */
export const placeholdersIn = (text: string): string[] => Array.from(text.matchAll(PLACEHOLDER_RE), (m) => m[1]);

/**
 * Fill a template's text. Throws on a placeholder that is not in the vocabulary, and on a known
 * one the caller gave no value for: a post must never show a raw `{name}`.
 */
export function renderText(template: string | { text: string }, values: FeedValues): string {
  const text = typeof template === "string" ? template : template.text;
  return text.replace(PLACEHOLDER_RE, (_whole, name: string) => {
    if (!(FEED_PLACEHOLDERS as readonly string[]).includes(name)) throw new Error(`Unknown placeholder {${name}}`);
    const value = values[name as FeedPlaceholder];
    if (value === undefined || value === null || String(value) === "") throw new Error(`No value for placeholder {${name}}`);
    return String(value);
  });
}

/* ------------------------------------------------------------------ */
/* Picking a template                                                  */
/* ------------------------------------------------------------------ */

/** What was already posted: used to avoid replays and to vary the wording. */
export interface FeedHistory {
  /** Local day of the event, `YYYY-MM-DD` (part of some dedupe keys). */
  dayKey: string;
  /** Dedupe keys already in `feed_posts`. */
  dedupeKeys: ReadonlySet<string> | readonly string[];
  /** Template ids used lately, newest first; the picker prefers others. */
  recentTemplateIds: readonly string[];
}

export interface PickedTemplate {
  template: FeedTemplate;
  /** The NPC that posts: the template's own, or one drawn from its pool. */
  posterId: string;
}

const hasKey = (keys: FeedHistory["dedupeKeys"], key: string): boolean =>
  Array.isArray(keys) ? keys.includes(key) : (keys as ReadonlySet<string>).has(key);

/** How many recent templates the picker tries to avoid repeating. */
export const RECENT_TEMPLATE_WINDOW = 8;

const sameValue = (want: unknown, have: unknown): boolean =>
  Array.isArray(want) ? want.some((w) => w === have) : want === have;

/** True when every `condition` field is satisfied by the event (`minDays` means "at least that many days away"). */
export function conditionMatches(condition: Record<string, unknown>, fields: Record<string, unknown>): boolean {
  for (const [key, want] of Object.entries(condition ?? {})) {
    if (key === "minDays") {
      if (typeof fields.days !== "number" || typeof want !== "number" || fields.days < want) return false;
    } else if (!sameValue(want, fields[key])) return false;
  }
  return true;
}

/** Poster choices of a template for an event (a rival never posts about themself). */
function posterChoices(template: FeedTemplate, event: FeedEvent): string[] {
  const rival = event.type === "rank_change" && placeholdersIn(template.text).includes("rival") ? event.npcId : null;
  const own = template.npcId ? [template.npcId] : template.posterPool;
  return own.filter((id) => id !== rival);
}

/**
 * Choose the template for an event, or `null` when nothing fits or the event was already posted.
 * Only templates for the event's trigger whose condition matches, whose placeholders the trigger
 * can supply and that have a poster are candidates; the choice is by weight, preferring templates
 * not used lately. Deterministic for a given RNG.
 */
export function pickTemplate(
  event: FeedEvent,
  templates: readonly FeedTemplate[],
  history: FeedHistory,
  rng: Rng,
): PickedTemplate | null {
  if (hasKey(history.dedupeKeys, eventDedupeKey(event, history.dayKey))) return null;
  const allowed = PLACEHOLDERS_BY_TRIGGER[event.type] as readonly string[];
  const fields = eventFields(event);
  const candidates = templates.filter(
    (t) =>
      t.trigger === event.type &&
      t.weight > 0 &&
      conditionMatches(t.condition, fields) &&
      placeholdersIn(t.text).every((p) => allowed.includes(p)) &&
      posterChoices(t, event).length > 0,
  );
  if (candidates.length === 0) return null;
  const recent = new Set(history.recentTemplateIds.slice(0, RECENT_TEMPLATE_WINDOW));
  const fresh = candidates.filter((t) => !recent.has(t.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  const template = pickWeighted(rng, pool, (t) => t.weight);
  if (!template) return null;
  const posters = posterChoices(template, event);
  const posterId = posters.length === 1 ? posters[0] : posters[Math.floor(rng() * posters.length)];
  return { template, posterId };
}

/* ------------------------------------------------------------------ */
/* Planning a post                                                     */
/* ------------------------------------------------------------------ */

/** A post ready to be stored, with its text already rendered. */
export interface PlannedPost {
  id: string;
  dedupeKey: string;
  /** `null` for a blog card. */
  templateId: string | null;
  npcId: string;
  kind: FeedKind | "blog";
  trigger: FeedTrigger;
  text: string;
  chipKind: FeedChipKind | null;
  chipTarget: string | null;
  /** Set for a blog card. */
  blogId: string | null;
  createdAt: number;
}

export type PlanResult =
  | { ok: true; post: PlannedPost; reactions: PlannedReaction[]; /** Reactions target `{ type, id }`. */ target: { type: "post" | "blog"; id: string } }
  | { ok: false; reason: "duplicate" | "no_template" | "render" };

export interface PlanInput {
  /** Id of the new post (also seeds its reactions). */
  postId: string;
  event: FeedEvent;
  now: number;
  templates: readonly FeedTemplate[];
  history: FeedHistory;
  /** The cast. */
  npcs: readonly { id: string }[];
  values: FeedValues;
  rng: Rng;
}

/** Pick, render and give reactions to one event's post. Nothing limits how many posts there are: the system writes them. Pure: nothing is stored here. */
export function planPost(input: PlanInput): PlanResult {
  const { postId, event, now, templates, history, npcs, values, rng } = input;
  const key = eventDedupeKey(event, history.dayKey);
  if (hasKey(history.dedupeKeys, key)) return { ok: false, reason: "duplicate" };
  const picked = pickTemplate(event, templates, history, rng);
  if (!picked) return { ok: false, reason: "no_template" };
  const { template, posterId } = picked;
  let text: string;
  try {
    text = renderText(template, values);
  } catch {
    return { ok: false, reason: "render" };
  }
  const chipTarget = chipTargetFor(template.chip, event);
  const chipKind = template.chip && (chipTarget !== null || template.chip === "quests" || template.chip === "ranks") ? template.chip : null;
  const reactions = planReactions({ type: "post", id: postId, kind: template.kind, posterId }, template.reactors, npcs);
  return {
    ok: true,
    post: { id: postId, dedupeKey: key, templateId: template.id, npcId: posterId, kind: template.kind, trigger: event.type, text, chipKind, chipTarget, blogId: null, createdAt: now },
    reactions,
    target: { type: "post", id: postId },
  };
}

export interface PlanBlogCardInput {
  postId: string;
  blog: Pick<BlogPost, "id" | "npcId" | "hook" | "reactors">;
  now: number;
  history: Pick<FeedHistory, "dedupeKeys">;
  npcs: readonly { id: string }[];
}

/** The blog card for an unlocked piece: its text is the hook, and it dedupes on `blog:<id>`. */
export function planBlogCard(input: PlanBlogCardInput): PlanResult {
  const { postId, blog, now, history, npcs } = input;
  const key = `blog:${blog.id}`;
  if (hasKey(history.dedupeKeys, key)) return { ok: false, reason: "duplicate" };
  return {
    ok: true,
    post: { id: postId, dedupeKey: key, templateId: null, npcId: blog.npcId, kind: "blog", trigger: "blog_unlocked", text: blog.hook, chipKind: null, chipTarget: null, blogId: blog.id, createdAt: now },
    reactions: planReactions({ type: "blog", id: blog.id, kind: "blog", posterId: blog.npcId }, blog.reactors, npcs),
    target: { type: "blog", id: blog.id },
  };
}

/* ------------------------------------------------------------------ */
/* Reconciling: the posts progress says should exist                    */
/* ------------------------------------------------------------------ */

export interface ReconcileNode {
  id: string;
  unitId: string;
  kind: string;
  position: number;
  lessonId?: string | null;
}

export interface ReconcileInput {
  /** Unit ids in path order. */
  unitIds: readonly string[];
  nodes: readonly ReconcileNode[];
  /** Completed path node ids. */
  completed: ReadonlySet<string>;
  /** Units the learner tested out of. */
  testedOut: ReadonlySet<string>;
  /** Units whose path is complete. */
  completedUnits: ReadonlySet<string>;
  /** Stars per node id (3 is a perfect lesson). */
  stars: ReadonlyMap<string, number>;
  /** When a node (or `testout:<unit>`) was completed, in ms. */
  completedAt: ReadonlyMap<string, number>;
  /** The best streak the learner has reached. */
  streak: number;
}

export interface ReconcileItem {
  event: FeedEvent;
  /** Used instead of `event` when the event has no template (the very first lesson says hello, or is an ordinary lesson post). */
  fallback?: FeedEvent;
  /** When it happened, or `null` when that is not known (the caller uses the clock). */
  at: number | null;
}

/**
 * The events that real progress says happened but that have no post yet, oldest first. The feed calls
 * this when Discover opens, so a post is never lost to a trigger that did not fire (a failed write, a
 * lesson finished before the feed existed). Replays are harmless: an event whose dedupe key is stored
 * is left out here, and `planPost` would drop it anyway.
 */
export function reconcileEvents(input: ReconcileInput, existingKeys: ReadonlySet<string> | readonly string[], dayKey: string): ReconcileItem[] {
  const out: ReconcileItem[] = [];
  const keys: FeedHistory["dedupeKeys"] = existingKeys;
  const missing = (e: FeedEvent) => !hasKey(keys, eventDedupeKey(e, dayKey));
  let lessonsSeen = 0;
  for (const unitId of input.unitIds) {
    const nodes = input.nodes.filter((n) => n.unitId === unitId).sort((a, b) => a.position - b.position);
    let lastAt: number | null = null;
    for (const node of nodes) {
      if (!input.completed.has(node.id)) continue;
      const at = input.completedAt.get(node.id) ?? null;
      lastAt = at ?? lastAt;
      if (node.kind === "lesson" && node.lessonId) {
        lessonsSeen += 1;
        const lesson: FeedEvent = { type: "lesson_complete", unitId, lessonId: node.lessonId, perfect: input.stars.get(node.id) === 3 };
        if (lessonsSeen === 1) {
          const first: FeedEvent = { type: "first_lesson", unitId, lessonId: node.lessonId };
          // Said hello already, or already posted as an ordinary lesson: nothing to add.
          if (missing(first) && missing(lesson)) out.push({ event: first, fallback: lesson, at });
        } else if (missing(lesson)) {
          out.push({ event: lesson, at });
        }
      } else if (node.kind === "checkpoint") {
        const e: FeedEvent = { type: "checkpoint_pass", unitId };
        if (missing(e)) out.push({ event: e, at });
      }
    }
    if (input.testedOut.has(unitId)) {
      const e: FeedEvent = { type: "testout_pass", unitId };
      if (missing(e)) out.push({ event: e, at: input.completedAt.get(`testout:${unitId}`) ?? null });
    }
    if (input.completedUnits.has(unitId)) {
      const e: FeedEvent = { type: "unit_complete", unitId };
      if (missing(e)) out.push({ event: e, at: lastAt });
    }
  }
  for (const days of STREAK_THRESHOLDS) {
    if (days > input.streak) break;
    const e: FeedEvent = { type: "streak", days };
    if (missing(e)) out.push({ event: e, at: null });
  }
  return out;
}

export type { PlannedReaction, Reaction };
