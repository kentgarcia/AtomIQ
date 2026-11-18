/**
 * Reactions, the framework-free part (docs/NPC_FEED_SPEC.md §4.1, §4.2): which NPCs react to a
 * post or a blog piece and with what, and what happens when the learner taps a reaction.
 * The learner can only react; there is no comment anywhere in this feature.
 */

import type { FeedKind, Reaction } from "../content/types.ts";
import { pickWeighted, randInt, rngFromSeed, shuffled, type Rng } from "./rng-core.ts";

export const REACTIONS = ["like", "love", "clap", "wow"] as const satisfies readonly Reaction[];

export const isReaction = (value: unknown): value is Reaction => typeof value === "string" && (REACTIONS as readonly string[]).includes(value);

/** Random reactors drawn from the rest of the cast: 0 to this many. */
export const MAX_RANDOM_REACTORS = 4;

/** How likely each reaction is for a kind of post (a celebration skews to clap and love, a tease to wow). */
export const REACTION_WEIGHTS: Record<FeedKind | "blog", Record<Reaction, number>> = {
  celebrate: { like: 2, love: 3, clap: 5, wow: 1 },
  milestone: { like: 1, love: 3, clap: 5, wow: 3 },
  nudge: { like: 5, love: 2, clap: 1, wow: 1 },
  tease: { like: 2, love: 1, clap: 1, wow: 6 },
  blog: { like: 4, love: 3, clap: 1, wow: 3 },
};

export type ReactionTargetType = "post" | "blog";

export interface ReactionTarget {
  type: ReactionTargetType;
  /** A `feed_posts.id` for a post, a `blog_posts.id` for a blog piece. */
  id: string;
  kind: FeedKind | "blog";
  /** The poster or author: never reacts to their own post. */
  posterId: string;
}

/** One NPC's reaction, ready to store (`actor_type` is always `npc`). */
export interface PlannedReaction {
  actorId: string;
  reaction: Reaction;
}

/**
 * Decide who reacts to a target, once. The result is stable: it is seeded from the target id (unless
 * an `rng` is given), so planning the same target twice gives the same reactors and reactions.
 * - Selected reactors (the template's or piece's `reactors`) that are in the cast always react.
 * - 0 to 4 more are drawn at random from the rest of the cast.
 * - The poster or author never reacts and no NPC reacts twice on one target.
 */
export function planReactions(
  target: ReactionTarget,
  reactors: readonly string[],
  npcs: readonly { id: string }[],
  rng: Rng = rngFromSeed(`${target.type}:${target.id}`),
): PlannedReaction[] {
  const cast = Array.from(new Set(npcs.map((n) => n.id))).sort();
  const eligible = new Set(cast.filter((id) => id !== target.posterId));
  const selected = Array.from(new Set(reactors)).filter((id) => eligible.has(id));
  const rest = cast.filter((id) => eligible.has(id) && !selected.includes(id));
  const randomCount = Math.min(rest.length, randInt(rng, 0, MAX_RANDOM_REACTORS));
  const random = shuffled(rng, rest).slice(0, randomCount);
  const weights = REACTION_WEIGHTS[target.kind];
  return [...selected, ...random].map((actorId) => ({
    actorId,
    reaction: pickWeighted(rng, REACTIONS, (r) => weights[r]) ?? "like",
  }));
}

/** What a tap does to the learner's one reaction on a target. */
export interface UserReactionChange {
  /** The learner's reaction afterwards (`null` = none). */
  next: Reaction | null;
  action: "set" | "change" | "clear";
}

/** Tapping the reaction the learner already has clears it; another one changes it; with none it sets it. */
export function toggleUserReaction(existing: Reaction | null | undefined, reaction: Reaction): UserReactionChange {
  if (!existing) return { next: reaction, action: "set" };
  if (existing === reaction) return { next: null, action: "clear" };
  return { next: reaction, action: "change" };
}

/** A stored reaction, as far as the summary needs. */
export interface ReactionLike {
  actorType: "npc" | "user";
  actorId: string;
  reaction: Reaction;
  createdAt: number;
}

export interface ReactionSummary {
  /** Everyone who reacted, the learner included. */
  total: number;
  counts: Record<Reaction, number>;
  /** Reactions in use, most used first (ties in `REACTIONS` order), at most 3: the glyphs to show. */
  top: Reaction[];
  /** Up to 3 NPC ids, oldest first: the stack of heads. */
  heads: string[];
  /** NPC reactors beyond the heads shown ("+N"). */
  extra: number;
  /** The learner's reaction, or `null`. */
  mine: Reaction | null;
  /** Everyone but the learner. */
  others: number;
}

export function summarizeReactions(rows: readonly ReactionLike[]): ReactionSummary {
  const counts: Record<Reaction, number> = { like: 0, love: 0, clap: 0, wow: 0 };
  let mine: Reaction | null = null;
  const npcs: ReactionLike[] = [];
  for (const row of rows) {
    counts[row.reaction] += 1;
    if (row.actorType === "user") mine = row.reaction;
    else npcs.push(row);
  }
  const top = REACTIONS.filter((r) => counts[r] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 3);
  const ordered = npcs.slice().sort((a, b) => a.createdAt - b.createdAt || (a.actorId < b.actorId ? -1 : 1));
  const heads = ordered.slice(0, 3).map((r) => r.actorId);
  return { total: rows.length, counts, top, heads, extra: Math.max(0, ordered.length - heads.length), mine, others: ordered.length };
}
